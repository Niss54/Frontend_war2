import type { AirportDataStore } from '../context/AirportContext';
import type { Alert } from '../types/airport';

export class AlertEngine {
  private static instance: AlertEngine;
  private generatedAlertIds = new Set<string>();

  private constructor() {}

  public static getInstance(): AlertEngine {
    if (!AlertEngine.instance) {
      AlertEngine.instance = new AlertEngine();
    }
    return AlertEngine.instance;
  }

  public scanAnomalies(store: AirportDataStore, currentTime: Date): Alert[] {
    const newAlerts: Alert[] = [];
    const now = currentTime.getTime();

    // 1. CASCADE_DELAY (CRITICAL)
    // Delayed flight at a gate compresses turnaround for the next flight
    const delayedFlights = store.flights.filter(f => f.status === 'Delayed' || Number(f.delay_minutes) > 0);
    delayedFlights.forEach(delayedFlight => {
      if (!delayedFlight.gate) return;
      
      const actDep = new Date(delayedFlight.actual_departure || delayedFlight.scheduled_departure).getTime() + (Number(delayedFlight.delay_minutes) * 60000);
      
      // Find next flight at same gate
      const gateFlights = store.flights
        .filter(f => f.gate === delayedFlight.gate && f.flight_id !== delayedFlight.flight_id)
        .sort((a, b) => new Date(a.scheduled_departure).getTime() - new Date(b.scheduled_departure).getTime());
        
      const nextFlight = gateFlights.find(f => new Date(f.scheduled_departure).getTime() > new Date(delayedFlight.scheduled_departure).getTime());
      
      if (nextFlight) {
        const nextSchDep = new Date(nextFlight.scheduled_departure).getTime();
        const gap = (nextSchDep - actDep) / 60000;
        
        if (gap < 30) {
          const id = `cascade-${delayedFlight.flight_id}-${nextFlight.flight_id}`;
          if (!this.generatedAlertIds.has(id)) {
            newAlerts.push({
              id,
              type: 'DELAY_RISK',
              severity: 'CRITICAL',
              message: `Gate ${delayedFlight.gate} CASCADE RISK: ${delayedFlight.flight_id} delayed ${delayedFlight.delay_minutes}m → ${nextFlight.flight_id} boarding window compressed to ${Math.round(gap)}m.`,
              flight_id: delayedFlight.flight_id,
              timestamp: currentTime,
              acknowledged: false
            });
            this.generatedAlertIds.add(id);
          }
        }
      }
    });

    // 2. BAGGAGE_OFFLOAD_RISK (CRITICAL)
    const unclearedBagsByFlight = new Map<string, number>();
    store.baggage.forEach(b => {
      const loc = String(b.location).toLowerCase();
      const st = String(b.status).toLowerCase();
      if (st === 'in transit' || loc === 'belt' || loc === 'terminal') {
        unclearedBagsByFlight.set(b.flight_id, (unclearedBagsByFlight.get(b.flight_id) || 0) + 1);
      }
    });

    unclearedBagsByFlight.forEach((count, flightId) => {
      const flight = store.flights.find(f => f.flight_id === flightId);
      if (flight && flight.scheduled_departure) {
        const minsToDep = (new Date(flight.scheduled_departure).getTime() - now) / 60000;
        if (minsToDep > 0 && minsToDep < 30) {
          const id = `bag-offload-${flightId}-${Math.floor(now/3600000)}`;
          if (!this.generatedAlertIds.has(id)) {
            newAlerts.push({
              id,
              type: 'BAGGAGE_MISSING',
              severity: 'CRITICAL',
              message: `${count} bags for ${flightId} uncleared — departure in ${Math.round(minsToDep)} minutes. Offload required if not resolved.`,
              flight_id: flightId,
              timestamp: currentTime,
              acknowledged: false
            });
            this.generatedAlertIds.add(id);
          }
        }
      }
    });

    // 3. GATE_CONFLICT (HIGH)
    // Simple heuristic: Two flights scheduled <15m apart at same gate
    const gateMap = new Map<string, typeof store.flights>();
    store.flights.forEach(f => {
      if (f.gate) {
        const list = gateMap.get(f.gate) || [];
        list.push(f);
        gateMap.set(f.gate, list);
      }
    });

    gateMap.forEach((flights, gate) => {
      const sorted = [...flights].sort((a,b) => new Date(a.scheduled_departure).getTime() - new Date(b.scheduled_departure).getTime());
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i];
        const b = sorted[i+1];
        const gap = (new Date(b.scheduled_departure).getTime() - new Date(a.scheduled_arrival).getTime()) / 60000;
        if (gap >= 0 && gap < 15) {
          const id = `gate-conflict-${a.flight_id}-${b.flight_id}`;
          if (!this.generatedAlertIds.has(id)) {
            newAlerts.push({
              id,
              type: 'GATE_CONFLICT',
              severity: 'HIGH',
              message: `Gate ${gate}: Overlap detected — ${a.flight_id} arrival conflicts with ${b.flight_id} boarding window.`,
              flight_id: a.flight_id,
              timestamp: currentTime,
              acknowledged: false
            });
            this.generatedAlertIds.add(id);
          }
        }
      }
    });

    // 4. SECURITY_OVERLOAD (HIGH)
    const recentScreenings = store.securityScreenings.filter(s => {
      const et = new Date(s.queue_entry_time).getTime();
      return et >= now - 30 * 60000 && et <= now;
    });
    const waitByCp = new Map<number, { wait: number, count: number }>();
    recentScreenings.forEach(s => {
      if (s.queue_exit_time) {
        const et = new Date(s.queue_entry_time).getTime();
        const xt = new Date(s.queue_exit_time).getTime();
        const cp = waitByCp.get(s.checkpoint_id) || { wait: 0, count: 0 };
        cp.wait += (xt - et) / 60000;
        cp.count++;
        waitByCp.set(s.checkpoint_id, cp);
      }
    });

    waitByCp.forEach((data, cpId) => {
      const avgWait = data.count > 0 ? data.wait / data.count : 0;
      if (avgWait > 20) {
        // Find departing flights
        const departingFlights = store.flights.filter(f => {
          const dep = new Date(f.scheduled_departure).getTime();
          return dep > now && dep <= now + 60 * 60000;
        });
        
        const id = `sec-overload-${cpId}-${Math.floor(now/3600000)}`;
        if (!this.generatedAlertIds.has(id) && departingFlights.length > 0) {
          newAlerts.push({
            id,
            type: 'SECURITY_QUEUE',
            severity: 'HIGH',
            message: `Terminal 1 Security (CP${cpId}): ${Math.round(avgWait)}-min wait — ${departingFlights.length} flights departing within 60min. Recommend opening lanes.`,
            timestamp: currentTime,
            acknowledged: false
          });
          this.generatedAlertIds.add(id);
        }
      }
    });

    // 5. STAFF_COVERAGE_GAP (HIGH)
    // Evaluated per dept for next 2 hours
    const depts = ['Security', 'Ops', 'Ground', 'Retail'];
    depts.forEach(dept => {
      const deptShifts = store.staffShifts.filter(s => s.department === dept);
      let minActive = 999;
      for (let offset = 0; offset <= 120; offset += 30) {
        const checkTime = now + offset * 60000;
        const startOfDay = new Date(currentTime);
        startOfDay.setHours(0,0,0,0);
        
        const activeCount = deptShifts.filter(s => {
          const [sh,sm] = s.shift_start.split(':');
          const [eh,em] = s.shift_end.split(':');
          const st = new Date(startOfDay).setHours(Number(sh)||0, Number(sm)||0, 0, 0);
          const et = new Date(startOfDay).setHours(Number(eh)||0, Number(em)||0, 0, 0);
          return checkTime >= st && checkTime <= et;
        }).length;
        minActive = Math.min(minActive, activeCount);
      }

      if (minActive < 5 && minActive !== 999) { // 5 is minimum
        const id = `staff-gap-${dept}-${Math.floor(now/7200000)}`;
        if (!this.generatedAlertIds.has(id)) {
          newAlerts.push({
            id,
            type: 'STAFF_SHORTAGE',
            severity: 'HIGH',
            message: `${dept}: ${minActive} staff on duty shortly — minimum is 5. Immediate coverage required.`,
            timestamp: currentTime,
            acknowledged: false
          });
          this.generatedAlertIds.add(id);
        }
      }
    });

    // 6. MAINTENANCE_FLIGHT_IMPACT (MEDIUM)
    store.maintenanceLogs.forEach(log => {
      const isResolved = log.resolved_at && new Date(log.resolved_at).getTime() <= now;
      if (!isResolved && (Number(log.severity) >= 3)) {
        if (log.flight_id) {
          const flight = store.flights.find(f => f.flight_id === log.flight_id);
          if (flight && flight.scheduled_departure) {
            const minsToDep = (new Date(flight.scheduled_departure).getTime() - now) / 60000;
            if (minsToDep > 0 && minsToDep <= 60) {
              const id = `maint-impact-${log.work_order_id}`;
              if (!this.generatedAlertIds.has(id)) {
                newAlerts.push({
                  id,
                  type: 'MAINTENANCE_CRITICAL',
                  severity: 'MEDIUM',
                  message: `${log.asset_id}: ${log.description} (OPEN) — ${log.flight_id} boarding in ${Math.round(minsToDep)}min.`,
                  flight_id: log.flight_id,
                  timestamp: currentTime,
                  acknowledged: false
                });
                this.generatedAlertIds.add(id);
              }
            }
          }
        }
      }
    });

    // 7. LOW_LOAD_FACTOR (MEDIUM)
    store.flights.forEach(f => {
      if (f.status !== 'Departed' && f.status !== 'Cancelled') {
        const lf = Number(f.load_factor);
        const actualLf = lf > 1 ? lf / 100 : lf;
        if (actualLf < 0.60 && actualLf > 0) {
          const minsToDep = (new Date(f.scheduled_departure).getTime() - now) / 60000;
          if (minsToDep > 0 && minsToDep <= 120) {
            const id = `low-lf-${f.flight_id}`;
            if (!this.generatedAlertIds.has(id)) {
              newAlerts.push({
                id,
                type: 'DELAY_RISK',
                severity: 'MEDIUM',
                message: `${f.flight_id}: ${Math.round(actualLf * 100)}% load — departing in ${Math.round(minsToDep)}min. Revenue optimization opportunity.`,
                flight_id: f.flight_id,
                timestamp: currentTime,
                acknowledged: false
              });
              this.generatedAlertIds.add(id);
            }
          }
        }
      }
    });

    // 8. RETAIL_REVENUE_DROP (LOW)
    // Simulating comparing to baseline
    const currentHour = currentTime.getHours();
    if (currentHour >= 12 && currentHour <= 20) {
      const id = `retail-drop-${currentHour}`;
      if (!this.generatedAlertIds.has(id)) {
        // We'll deterministically trigger this at 14:00 (for demo purposes)
        if (currentHour === 14) {
          newAlerts.push({
            id,
            type: 'DELAY_RISK',
            severity: 'LOW',
            message: `Terminal 1 Retail: Revenue 31% below baseline — correlates with Security queue spike.`,
            timestamp: currentTime,
            acknowledged: false
          });
          this.generatedAlertIds.add(id);
        }
      }
    }

    return newAlerts;
  }
}
