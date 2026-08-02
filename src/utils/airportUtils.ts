// src/utils/airportUtils.ts
import type {
  Flight,
  GateEvent,
  Baggage,
  SecurityScreening,
  MaintenanceLog,
  StaffShift,
  GateConflict,
  Alert,
} from '../types/airport';
import type { UnifiedFlight } from '../types/unified';

// ===== Core Computation Functions =====

/**
 * Compute a weighted delay risk score (0-100):
 * - 40% gate conflicts (presence & count)
 * - 30% open maintenance items (severity weighted)
 * - 30% historical delay pattern (delay_minutes based)
 */
export function computeDelayRiskScore(
  flight: Flight,
  maintenanceLogs: MaintenanceLog[],
  gateEvents: GateEvent[]
): number {
  // Gate conflict component (40%)
  const conflictEvents = gateEvents.filter(e => e.is_conflict);
  const gateScore = Math.min(conflictEvents.length * 25, 100);

  // Maintenance component (30%) — weighted by severity
  const openMaintenance = maintenanceLogs.filter(m => !m.resolved_at || m.resolved_at === '');
  let maintenanceScore = 0;
  for (const m of openMaintenance) {
    const sev = Number(m.severity) || 1;
    maintenanceScore += sev * 10;
  }
  maintenanceScore = Math.min(maintenanceScore, 100);

  // Historical delay component (30%)
  const delayMins = Number(flight.delay_minutes) || 0;
  let delayScore = 0;
  if (delayMins > 120) delayScore = 100;
  else if (delayMins > 60) delayScore = 80;
  else if (delayMins > 30) delayScore = 60;
  else if (delayMins > 15) delayScore = 40;
  else if (delayMins > 0) delayScore = 20;

  return Math.round(gateScore * 0.4 + maintenanceScore * 0.3 + delayScore * 0.3);
}

/**
 * Compute turnaround status by comparing scheduled vs actual timestamps.
 */
export function computeTurnaroundStatus(
  gateEvent: GateEvent
): 'ON_TRACK' | 'AT_RISK' | 'DELAYED' {
  const scheduled = new Date(gateEvent.scheduled_start).getTime();
  const actual = new Date(gateEvent.actual_start).getTime();

  if (isNaN(scheduled) || isNaN(actual)) return 'ON_TRACK';

  const diffMinutes = (actual - scheduled) / 60000;

  if (diffMinutes <= 5) return 'ON_TRACK';
  if (diffMinutes <= 15) return 'AT_RISK';
  return 'DELAYED';
}

/**
 * Filter flights within +-4 hours of currentTime.
 */
export function getActiveFlights(flights: Flight[], currentTime: Date): Flight[] {
  const windowMs = 4 * 60 * 60 * 1000; // 4 hours
  const now = currentTime.getTime();

  return flights.filter(f => {
    const dep = new Date(f.scheduled_departure).getTime();
    const arr = new Date(f.scheduled_arrival).getTime();
    if (isNaN(dep) && isNaN(arr)) return false;

    const flightStart = isNaN(dep) ? arr : dep;
    const flightEnd = isNaN(arr) ? dep : arr;

    return flightStart <= now + windowMs && flightEnd >= now - windowMs;
  });
}

/**
 * Get baggage reconciliation stats.
 */
export function getBaggageReconciliation(bags: Baggage[]): {
  loaded: number;
  missing: number;
  damaged: number;
  total: number;
  rate: number;
} {
  if (bags.length === 0) return { loaded: 0, missing: 0, damaged: 0, total: 0, rate: 100 };

  let loaded = 0;
  let missing = 0;
  let damaged = 0;

  for (const bag of bags) {
    const status = String(bag.status).toLowerCase();
    if (status === 'loaded' || status === 'delivered') loaded++;
    else if (status === 'missing') missing++;
    if (Number(bag.damage_count) > 0) damaged++;
  }

  const rate = bags.length > 0 ? (loaded / bags.length) * 100 : 0;

  return { loaded, missing, damaged, total: bags.length, rate: Math.round(rate * 100) / 100 };
}

/**
 * Calculate security throughput: events per minute in a rolling window.
 */
export function getSecurityThroughput(
  screenings: SecurityScreening[],
  windowMinutes: number = 60
): number {
  if (screenings.length === 0) return 0;

  const times = screenings
    .map(s => new Date(s.screening_time).getTime())
    .filter(t => !isNaN(t))
    .sort((a, b) => a - b);

  if (times.length === 0) return 0;

  const windowMs = windowMinutes * 60 * 1000;
  const latest = times[times.length - 1];
  const windowStart = latest - windowMs;

  const inWindow = times.filter(t => t >= windowStart);
  return Math.round((inWindow.length / windowMinutes) * 100) / 100;
}

/**
 * Detect overlapping gate assignments for the same gate_id.
 */
export function detectGateConflict(gateEvents: GateEvent[]): GateConflict[] {
  const conflicts: GateConflict[] = [];

  // Group events by gate_id
  const byGate = new Map<string, GateEvent[]>();
  for (const event of gateEvents) {
    const existing = byGate.get(event.gate_id);
    if (existing) existing.push(event);
    else byGate.set(event.gate_id, [event]);
  }

  // For each gate, check for overlapping time windows
  for (const [gateId, events] of byGate) {
    // Sort by actual_start
    const sorted = events
      .filter(e => e.actual_start && e.actual_end)
      .sort((a, b) => new Date(a.actual_start).getTime() - new Date(b.actual_start).getTime());

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      const currentEnd = new Date(current.actual_end).getTime();
      const nextStart = new Date(next.actual_start).getTime();

      if (currentEnd > nextStart) {
        const overlapMinutes = Math.round((currentEnd - nextStart) / 60000);
        conflicts.push({
          gate_id: gateId,
          terminal: current.terminal,
          events: [current, next],
          overlap_minutes: overlapMinutes,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Get staff coverage for a given time and department/terminal.
 */
export function getStaffCoverage(
  shifts: StaffShift[],
  currentTime: Date,
  terminal?: string,
  department?: string
): { assigned: number; required: number; status: 'OK' | 'LOW' | 'CRITICAL' } {
  const now = currentTime.getTime();

  // Filter active shifts
  const activeShifts = shifts.filter(s => {
    const start = new Date(s.shift_start).getTime();
    const end = new Date(s.shift_end).getTime();
    if (isNaN(start) || isNaN(end)) return false;

    const isActive = start <= now && end >= now;
    const matchesTerminal = !terminal || s.terminal === terminal;
    const matchesDept = !department || s.department === department;

    return isActive && matchesTerminal && matchesDept;
  });

  const assigned = activeShifts.length;

  // Minimum staffing requirements (heuristic)
  const required = terminal ? 15 : 50; // per terminal or total

  let status: 'OK' | 'LOW' | 'CRITICAL';
  const ratio = assigned / Math.max(required, 1);
  if (ratio >= 0.8) status = 'OK';
  else if (ratio >= 0.5) status = 'LOW';
  else status = 'CRITICAL';

  return { assigned, required, status };
}

/**
 * Compute terminal load based on active flights.
 */
export function computeTerminalLoad(
  flights: Flight[],
  terminal: string,
  currentTime: Date
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const active = getActiveFlights(
    flights.filter(f => f.terminal === terminal),
    currentTime
  );

  const count = active.length;
  if (count <= 5) return 'LOW';
  if (count <= 15) return 'MEDIUM';
  if (count <= 30) return 'HIGH';
  return 'CRITICAL';
}

/**
 * Generate alerts from unified flight data.
 * Alert if delayRiskScore > 70 or turnaround DELAYED.
 */
export function generateDelayAlerts(unifiedFlights: UnifiedFlight[]): Alert[] {
  const alerts: Alert[] = [];
  let alertId = 0;

  for (const uf of unifiedFlights) {
    // High delay risk
    if (uf.delayRiskScore > 70) {
      alerts.push({
        id: `ALERT-${++alertId}`,
        type: 'DELAY_RISK',
        severity: uf.delayRiskScore > 90 ? 'CRITICAL' : 'HIGH',
        message: `Flight ${uf.flight.flight_id} (${uf.flight.airline}) has delay risk score ${uf.delayRiskScore}. Route: ${uf.flight.origin}→${uf.flight.destination}`,
        flight_id: uf.flight.flight_id,
        timestamp: new Date(),
        acknowledged: false,
      });
    }

    // Turnaround delayed
    if (uf.turnaroundStatus === 'DELAYED') {
      alerts.push({
        id: `ALERT-${++alertId}`,
        type: 'GATE_CONFLICT',
        severity: 'HIGH',
        message: `Flight ${uf.flight.flight_id} turnaround is DELAYED at gate ${uf.flight.gate}`,
        flight_id: uf.flight.flight_id,
        timestamp: new Date(),
        acknowledged: false,
      });
    }

    // Missing baggage
    const bagRecon = getBaggageReconciliation(uf.bags);
    if (bagRecon.missing > 0) {
      alerts.push({
        id: `ALERT-${++alertId}`,
        type: 'BAGGAGE_MISSING',
        severity: bagRecon.missing > 5 ? 'HIGH' : 'MEDIUM',
        message: `Flight ${uf.flight.flight_id}: ${bagRecon.missing} bags missing (${bagRecon.rate}% reconciliation rate)`,
        flight_id: uf.flight.flight_id,
        timestamp: new Date(),
        acknowledged: false,
      });
    }

    // Critical maintenance
    const groundingItems = uf.maintenanceItems.filter(m => m.is_grounding);
    if (groundingItems.length > 0) {
      alerts.push({
        id: `ALERT-${++alertId}`,
        type: 'MAINTENANCE_CRITICAL',
        severity: 'CRITICAL',
        message: `Flight ${uf.flight.flight_id}: ${groundingItems.length} grounding maintenance item(s) on ${uf.flight.aircraft_reg}`,
        flight_id: uf.flight.flight_id,
        timestamp: new Date(),
        acknowledged: false,
      });
    }

    // Staff shortage
    if (uf.staffCoverageStatus === 'CRITICAL') {
      alerts.push({
        id: `ALERT-${++alertId}`,
        type: 'STAFF_SHORTAGE',
        severity: 'HIGH',
        message: `Critical staff shortage at terminal ${uf.flight.terminal} affecting flight ${uf.flight.flight_id}`,
        flight_id: uf.flight.flight_id,
        timestamp: new Date(),
        acknowledged: false,
      });
    }
  }

  // Sort by severity: CRITICAL > HIGH > MEDIUM > LOW
  const severityOrder: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };
  alerts.sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4));

  return alerts;
}

/**
 * Predict boarding window based on scheduled departure.
 * Boarding typically starts 45 min before departure and ends 15 min before.
 */
export function predictBoardingWindow(
  flight: Flight
): { startsAt: Date; endsAt: Date } {
  const dep = new Date(flight.scheduled_departure);
  const startsAt = new Date(dep.getTime() - 45 * 60000);
  const endsAt = new Date(dep.getTime() - 15 * 60000);
  return { startsAt, endsAt };
}

/**
 * Get unique terminals from flights.
 */
export function getUniqueTerminals(flights: Flight[]): string[] {
  return [...new Set(flights.map(f => f.terminal).filter(Boolean))];
}

/**
 * Format minutes into hours and minutes string.
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}
