export type EventCallback = (payload: any) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  emit(event: string, payload?: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(cb => cb(payload));
    }
  }
}

export const eventBus = new EventBus();

// Core Events
export const FLIGHT_STATUS_CHANGED = 'FLIGHT_STATUS_CHANGED';
export const GATE_EVENT_FIRED = 'GATE_EVENT_FIRED';
export const BAGGAGE_STATUS_UPDATE = 'BAGGAGE_STATUS_UPDATE';
export const SECURITY_QUEUE_UPDATE = 'SECURITY_QUEUE_UPDATE';
export const MAINTENANCE_ALERT = 'MAINTENANCE_ALERT';
export const STAFF_SHIFT_CHANGE = 'STAFF_SHIFT_CHANGE';
export const INCIDENT_CREATED = 'INCIDENT_CREATED';
export const SIMULATION_TICK = 'SIMULATION_TICK';

// Payload Types
export interface FlightStatusPayload {
  flight_id: string; // Updated from flightId to match previous usage in FlightRow
  oldStatus: string;
  newStatus: string;
  simulationTime: Date;
  gate?: string;
}

export interface BaggageStatusPayload {
  flightId: string;
  bagId: string;
  newStatus: string;
}

export interface SecurityQueuePayload {
  checkpointId: number;
  queueLength: number;
  waitTime: number;
}

export interface IncidentPayload {
  alertId: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedFlightId?: string;
  message: string;
}

export interface TickPayload {
  currentTime: Date;
  speedMultiplier: number;
}
