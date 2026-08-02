import { 
  eventBus, 
  FLIGHT_STATUS_CHANGED, 
  BAGGAGE_STATUS_UPDATE, 
  SECURITY_QUEUE_UPDATE, 
  INCIDENT_CREATED, 
  SIMULATION_TICK,
  FlightStatusPayload,
  IncidentPayload
} from '../utils/EventBus';
import type { DataStore } from '../types/unified';

// Simple deterministic hash
const hashString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

export class SimulationEngine {
  private static instance: SimulationEngine;
  
  private store: DataStore | null = null;
  private currentTime: Date = new Date();
  private isPlaying: boolean = false;
  private speed: number = 1;
  private timer: number | null = null;

  // Track state so we only emit changes
  private flightStatuses = new Map<string, string>();
  private emittedAlerts = new Set<string>();
  private flightDelays = new Map<string, number>(); // flight_id -> delayed minutes
  private lastSecurityUpdate: number = 0;

  private constructor() {}

  public static getInstance(): SimulationEngine {
    if (!SimulationEngine.instance) {
      SimulationEngine.instance = new SimulationEngine();
    }
    return SimulationEngine.instance;
  }

  public init(store: DataStore, initialTime?: Date) {
    this.store = store;
    if (initialTime) {
      this.currentTime = initialTime;
    } else if (store.flights.length > 0) {
      // Find earliest departure
      let earliest = new Date('2099-01-01').getTime();
      store.flights.forEach(f => {
        if (f.scheduled_departure) {
          const t = new Date(f.scheduled_departure).getTime();
          if (t < earliest) earliest = t;
        }
      });
      // Start 4 hours before earliest flight
      this.currentTime = new Date(earliest - 4 * 60 * 60 * 1000);
    }
    this.flightStatuses.clear();
    this.emittedAlerts.clear();
    this.flightDelays.clear();
    
    // Initialize base statuses from store to avoid emitting EVERYTHING at start
    store.flights.forEach(f => {
      this.flightStatuses.set(f.flight_id, f.status || 'SCHEDULED');
      if (Number(f.delay_minutes) > 0) {
        this.flightDelays.set(f.flight_id, Number(f.delay_minutes));
      }
    });
  }

  public play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.timer = window.setInterval(() => this.tick(), 1000);
  }

  public pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public setSpeed(multiplier: number) {
    this.speed = multiplier;
  }

  public getCurrentTime() {
    return this.currentTime;
  }

  public getIsPlaying() {
    return this.isPlaying;
  }

  private tick() {
    if (!this.store) return;

    // 1 real sec = 1 * speed sim minutes
    const msToAdd = this.speed * 60 * 1000; 
    this.currentTime = new Date(this.currentTime.getTime() + msToAdd);

    this.processFlights();
    this.processBaggage();
    
    // Security queues every 5 sim minutes
    if (this.currentTime.getTime() - this.lastSecurityUpdate >= 5 * 60 * 1000) {
      this.processSecurityQueues();
      this.lastSecurityUpdate = this.currentTime.getTime();
    }

    eventBus.emit(SIMULATION_TICK, { currentTime: this.currentTime, speedMultiplier: this.speed });
  }

  private processFlights() {
    if (!this.store) return;
    const now = this.currentTime.getTime();

    this.store.flights.forEach(f => {
      if (!f.scheduled_departure) return;
      const schedTime = new Date(f.scheduled_departure).getTime();
      let targetStatus = 'SCHEDULED';
      
      // Calculate delay deterministically
      let delayMs = 0;
      if (!this.flightDelays.has(f.flight_id)) {
        // Check conditions for delay
        const hasOpenMaintenance = this.store!.maintenanceLogs.some(
          m => m.flight_id === f.flight_id && m.severity >= 3 && !m.resolved_at
        );
        if (hasOpenMaintenance) {
          const delayMinutes = 15 + (hashString(f.flight_id) % 75); // 15-90 mins
          this.flightDelays.set(f.flight_id, delayMinutes);
        } else {
          this.flightDelays.set(f.flight_id, 0);
        }
      }
      
      const delayMinutes = this.flightDelays.get(f.flight_id) || 0;
      delayMs = delayMinutes * 60 * 1000;
      const actualDeparture = schedTime + delayMs;
      const offsetMinutes = (actualDeparture - now) / (60 * 1000);

      if (delayMinutes > 0 && offsetMinutes > 0) {
        targetStatus = 'DELAYED';
      } else {
        if (offsetMinutes > 180) targetStatus = 'SCHEDULED';
        else if (offsetMinutes > 60) targetStatus = 'CHECK_IN_OPEN';
        else if (offsetMinutes > 15) targetStatus = 'BOARDING';
        else if (offsetMinutes > 0) targetStatus = 'FINAL_BOARDING';
        else if (offsetMinutes > -15) targetStatus = 'DEPARTED'; // Taxiing out
        else targetStatus = 'AIRBORNE';
      }

      const currentStatus = this.flightStatuses.get(f.flight_id) || 'SCHEDULED';
      
      if (currentStatus !== targetStatus) {
        this.flightStatuses.set(f.flight_id, targetStatus);
        
        // Update store so it reflects reality for other components
        f.status = targetStatus;
        if (delayMinutes > 0) f.delay_minutes = delayMinutes;

        eventBus.emit(FLIGHT_STATUS_CHANGED, {
          flight_id: f.flight_id,
          oldStatus: currentStatus,
          newStatus: targetStatus,
          simulationTime: this.currentTime,
          gate: f.gate
        } as FlightStatusPayload);
      }
    });
  }

  private processBaggage() {
    if (!this.store) return;
    const now = this.currentTime.getTime();

    // Check a sample of bags for performance, or filter to active flights
    // For realism, let's just emit baggage alerts for flights near departure
    this.store.flights.forEach(f => {
      if (!f.scheduled_departure) return;
      const schedTime = new Date(f.scheduled_departure).getTime();
      const offsetMinutes = (schedTime - now) / (60 * 1000);

      // T-30 baggage alert check
      if (offsetMinutes <= 30 && offsetMinutes > 25) {
        const alertKey = `bag_alert_${f.flight_id}`;
        if (!this.emittedAlerts.has(alertKey)) {
          // Find bags for this flight still in security scan
          const bagsInSecurity = this.store!.baggage.filter(b => b.flight_id === f.flight_id && b.status === 'In Transit'); // Simulated as Security Scan
          
          if (bagsInSecurity.length > 0) {
            eventBus.emit(INCIDENT_CREATED, {
              alertId: `INC-${Date.now()}`,
              type: 'BAGGAGE',
              severity: 'HIGH',
              affectedFlightId: f.flight_id,
              message: `${bagsInSecurity.length} bags for ${f.flight_id} stuck in security — ${Math.floor(offsetMinutes)} mins to departure`
            } as IncidentPayload);
            this.emittedAlerts.add(alertKey);
          }
        }
      }
    });
  }

  private processSecurityQueues() {
    if (!this.store) return;
    // Emits fake updates for checkpoints
    const waitTime = 15 + Math.floor(Math.random() * 20); // 15-35 min simulated
    
    eventBus.emit(SECURITY_QUEUE_UPDATE, {
      checkpointId: 1,
      queueLength: waitTime * 4,
      waitTime: waitTime
    });

    if (waitTime > 20) {
      const alertKey = `sec_alert_${this.currentTime.getTime()}`;
      if (!this.emittedAlerts.has(alertKey)) {
        eventBus.emit(INCIDENT_CREATED, {
          alertId: `INC-SEC-${Date.now()}`,
          type: 'SECURITY_QUEUE',
          severity: 'HIGH',
          message: `Security wait time exceeded 20 minutes (${waitTime}m)`
        } as IncidentPayload);
        this.emittedAlerts.add(alertKey);
      }
    }
  }
}
