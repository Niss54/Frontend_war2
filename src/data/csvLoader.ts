// src/data/csvLoader.ts
import Papa from 'papaparse';
import type {
  Flight,
  GateEvent,
  Baggage,
  Passenger,
  SecurityScreening,
  MaintenanceLog,
  StaffShift,
  RetailTransaction,
} from '../types/airport';
import { COLUMN_MAPS } from '../types/airport';
import type {
  DataStore,
  FlightIndex,
  GateIndex,
  TimelineIndex,
  TimelineEntry,
  UnifiedFlight,
} from '../types/unified';
import {
  computeDelayRiskScore,
  computeTurnaroundStatus,
  getBaggageReconciliation,
  getStaffCoverage,
} from '../utils/airportUtils';

// ===== CSV Parsing Helpers =====

/**
 * Parse a CSV file with numeric headers and remap to meaningful column names.
 * Uses PapaParse with header:true and dynamicTyping:true.
 */
async function parseCSV<T>(
  filename: string,
  columnNames: readonly string[]
): Promise<T[]> {
  const response = await fetch(`/data/${filename}`);
  const csvText = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Remap numeric keys to meaningful column names
        const remapped = results.data.map((row: any) => {
          const obj: any = {};
          columnNames.forEach((name, index) => {
            const value = row[String(index)];
            // Convert string booleans
            if (value === 'True' || value === 'true') obj[name] = true;
            else if (value === 'False' || value === 'false') obj[name] = false;
            else obj[name] = value ?? '';
          });
          return obj as T;
        });
        resolve(remapped);
      },
      error: (error: Error) => reject(error),
    });
  });
}

// ===== Main Loader =====

/**
 * Load all 8 CSV datasets in parallel using Promise.all().
 * Returns a typed DataStore object.
 */
export async function loadAllDatasets(): Promise<DataStore> {
  const [
    flights,
    gateEvents,
    baggage,
    passengers,
    securityScreenings,
    maintenanceLogs,
    staffShifts,
    retailTransactions,
  ] = await Promise.all([
    parseCSV<Flight>('flights.csv', COLUMN_MAPS.flights),
    parseCSV<GateEvent>('gate_events.csv', COLUMN_MAPS.gate_events),
    parseCSV<Baggage>('baggage.csv', COLUMN_MAPS.baggage),
    parseCSV<Passenger>('passengers.csv', COLUMN_MAPS.passengers),
    parseCSV<SecurityScreening>('security_screening.csv', COLUMN_MAPS.security_screening),
    parseCSV<MaintenanceLog>('maintenance_logs.csv', COLUMN_MAPS.maintenance_logs),
    parseCSV<StaffShift>('staff_shifts.csv', COLUMN_MAPS.staff_shifts),
    parseCSV<RetailTransaction>('retail_transactions.csv', COLUMN_MAPS.retail_transactions),
  ]);

  return {
    flights,
    gateEvents,
    baggage,
    passengers,
    securityScreenings,
    maintenanceLogs,
    staffShifts,
    retailTransactions,
    loadedAt: new Date(),
  };
}

// ===== Index Builders =====

/**
 * Build a UnifiedFlight lookup map keyed by flight_id.
 * Joins all related records from other datasets into each flight.
 */
export function buildFlightIndex(store: DataStore): FlightIndex {
  const index: FlightIndex = new Map();

  // Pre-build lookup maps for O(n) joining instead of O(n*m)
  const gateEventsByFlight = groupBy(store.gateEvents, 'flight_id');
  const baggageByFlight = groupBy(store.baggage, 'flight_id');
  const passengersByFlight = groupBy(store.passengers, 'flight_id');
  const maintenanceByFlight = groupBy(store.maintenanceLogs, 'flight_id');
  const retailByFlight = groupBy(store.retailTransactions, 'flight_id');

  // Security screenings link via passenger -> flight
  const securityByPnr = groupBy(store.securityScreenings, 'pnr');

  for (const flight of store.flights) {
    const fid = flight.flight_id;
    const gateEvents = gateEventsByFlight.get(fid) || [];
    const bags = baggageByFlight.get(fid) || [];
    const passengers = passengersByFlight.get(fid) || [];
    const maintenanceItems = maintenanceByFlight.get(fid) || [];
    const retailTxns = retailByFlight.get(fid) || [];

    // Link security screenings through passengers' PNRs
    const pnrs = new Set(passengers.map(p => p.pnr));
    const securityCheckpoints: SecurityScreening[] = [];
    for (const pnr of pnrs) {
      const screenings = securityByPnr.get(pnr) || [];
      securityCheckpoints.push(...screenings);
    }

    // Compute derived fields
    const delayRiskScore = computeDelayRiskScore(flight, maintenanceItems, gateEvents);
    const bagReconciliation = getBaggageReconciliation(bags);
    const paxLoadFactor = flight.capacity > 0
      ? (flight.pax_count / flight.capacity) * 100
      : 0;

    // Estimate turnaround from gate events
    let estimatedTurnaroundMinutes = 0;
    if (gateEvents.length > 0) {
      const starts = gateEvents
        .map(e => new Date(e.actual_start).getTime())
        .filter(t => !isNaN(t));
      const ends = gateEvents
        .map(e => new Date(e.actual_end).getTime())
        .filter(t => !isNaN(t));
      if (starts.length > 0 && ends.length > 0) {
        const earliest = Math.min(...starts);
        const latest = Math.max(...ends);
        estimatedTurnaroundMinutes = Math.round((latest - earliest) / 60000);
      }
    }

    // Staff coverage for this flight's terminal
    const coverage = getStaffCoverage(
      store.staffShifts,
      new Date(flight.scheduled_departure),
      flight.terminal
    );

    // Turnaround status from first gate event
    const turnaroundStatus = gateEvents.length > 0
      ? computeTurnaroundStatus(gateEvents[0])
      : 'ON_TRACK' as const;

    // Revenue from this flight's passengers
    const flightRevenue = retailTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const unified: UnifiedFlight = {
      flight,
      gateEvents,
      bags,
      passengers,
      maintenanceItems,
      securityCheckpoints,
      retailTransactions: retailTxns,
      delayRiskScore,
      baggageReconciliationRate: bagReconciliation.rate,
      paxLoadFactor,
      estimatedTurnaroundMinutes,
      staffCoverageStatus: coverage.status as 'OK' | 'LOW' | 'CRITICAL',
      turnaroundStatus,
      flightRevenue,
    };

    index.set(fid, unified);
  }

  return index;
}

/**
 * Build a gate index keyed by gate_id -> GateEvent[]
 */
export function buildGateIndex(store: DataStore): GateIndex {
  return groupBy(store.gateEvents, 'gate_id');
}

/**
 * Build a timeline index keyed by flight_id -> sorted TimelineEntry[]
 */
export function buildTimelineIndex(store: DataStore): TimelineIndex {
  const index: TimelineIndex = new Map();

  // Add flight departure/arrival events
  for (const f of store.flights) {
    const entries: TimelineEntry[] = [];

    if (f.scheduled_departure) {
      entries.push({
        timestamp: new Date(f.scheduled_departure),
        type: 'departure',
        label: 'Scheduled Departure',
        details: `${f.flight_id} to ${f.destination}`,
        flight_id: f.flight_id,
      });
    }
    if (f.actual_departure && f.actual_departure !== f.scheduled_departure) {
      entries.push({
        timestamp: new Date(f.actual_departure),
        type: 'departure',
        label: 'Actual Departure',
        details: `Delay: ${f.delay_minutes} min (${f.delay_reason})`,
        flight_id: f.flight_id,
      });
    }
    if (f.boarding_time) {
      entries.push({
        timestamp: new Date(f.boarding_time),
        type: 'boarding',
        label: 'Boarding',
        details: `Gate ${f.gate}`,
        flight_id: f.flight_id,
      });
    }
    if (f.scheduled_arrival) {
      entries.push({
        timestamp: new Date(f.scheduled_arrival),
        type: 'arrival',
        label: 'Scheduled Arrival',
        details: `From ${f.origin}`,
        flight_id: f.flight_id,
      });
    }

    index.set(f.flight_id, entries);
  }

  // Add gate events
  for (const ge of store.gateEvents) {
    const existing = index.get(ge.flight_id) || [];
    existing.push({
      timestamp: new Date(ge.timestamp),
      type: 'gate',
      label: ge.event_type,
      details: `Gate ${ge.gate_id} — ${ge.priority}`,
      flight_id: ge.flight_id,
    });
    index.set(ge.flight_id, existing);
  }

  // Add baggage events
  for (const b of store.baggage) {
    const existing = index.get(b.flight_id) || [];
    existing.push({
      timestamp: new Date(b.scan_time),
      type: 'baggage',
      label: `Bag ${b.status}`,
      details: `Bag ${b.bag_id} — ${b.location}`,
      flight_id: b.flight_id,
    });
    index.set(b.flight_id, existing);
  }

  // Add maintenance events
  for (const m of store.maintenanceLogs) {
    const existing = index.get(m.flight_id) || [];
    existing.push({
      timestamp: new Date(m.created_at),
      type: 'maintenance',
      label: `Maintenance: ${m.type}`,
      details: m.description,
      flight_id: m.flight_id,
    });
    index.set(m.flight_id, existing);
  }

  // Sort all timelines by timestamp
  for (const [key, entries] of index) {
    entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    index.set(key, entries);
  }

  return index;
}

// ===== Utility =====

/**
 * Generic groupBy helper — groups array items by a string key field.
 */
function groupBy<T>(items: T[], key: keyof T): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = String(item[key] ?? '');
    if (!k) continue;
    const existing = map.get(k);
    if (existing) {
      existing.push(item);
    } else {
      map.set(k, [item]);
    }
  }
  return map;
}
