// src/data/derivedOpsData.ts
import type {
  Alert,
  TerminalSummary,
  BaggageSummary,
  SecurityHeatmapEntry,
  StaffingGap,
  MaintenanceSummary,
  RetailSummary,
} from '../types/airport';
import type { DataStore, DerivedOpsData, FlightIndex } from '../types/unified';
import {
  generateDelayAlerts,
  getUniqueTerminals,
  getSecurityThroughput,
  getStaffCoverage,
  getBaggageReconciliation,
} from '../utils/airportUtils';

/**
 * Pre-compute all derived analytics from the raw DataStore.
 * This should be called once after data load and memoized.
 */
export function computeDerivedOpsData(
  store: DataStore,
  flightIndex: FlightIndex
): DerivedOpsData {
  // ===== Active Alerts =====
  const unifiedFlights = Array.from(flightIndex.values());
  const activeAlerts: Alert[] = generateDelayAlerts(unifiedFlights);

  // ===== Terminal Summaries =====
  const terminals = getUniqueTerminals(store.flights);
  const terminalSummaries: TerminalSummary[] = terminals.map(terminal => {
    const termFlights = store.flights.filter(f => f.terminal === terminal);
    const termPax = store.passengers.filter(p => {
      const flight = store.flights.find(f => f.flight_id === p.flight_id);
      return flight?.terminal === terminal;
    });
    const termSecurity = store.securityScreenings.filter(() => {
      // Link security to terminal via checkpoint_id pattern or passenger
      return true; // Include all for now, filter by checkpoint if possible
    });
    const termGates = new Set(termFlights.map(f => f.gate).filter(Boolean));
    const termRetail = store.retailTransactions.filter(t => t.terminal === terminal);

    const onTime = termFlights.filter(f => Number(f.delay_minutes) === 0).length;
    const avgWait = termSecurity.length > 0
      ? termSecurity.reduce((sum, s) => sum + (Number(s.wait_time_seconds) || 0), 0) / termSecurity.length
      : 0;
    const revenue = termRetail.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    return {
      terminal,
      flightCount: termFlights.length,
      paxCount: termPax.length,
      onTimeRate: termFlights.length > 0 ? Math.round((onTime / termFlights.length) * 100) : 0,
      securityAvgWait: Math.round(avgWait),
      activeGates: termGates.size,
      revenue,
    };
  });

  // ===== Top Delayed Airlines =====
  const airlineDelays = new Map<string, { totalDelay: number; count: number }>();
  for (const f of store.flights) {
    const delay = Number(f.delay_minutes) || 0;
    const existing = airlineDelays.get(f.airline);
    if (existing) {
      existing.totalDelay += delay;
      existing.count++;
    } else {
      airlineDelays.set(f.airline, { totalDelay: delay, count: 1 });
    }
  }
  const topDelayedAirlines = Array.from(airlineDelays.entries())
    .map(([airline, data]) => ({
      airline,
      avgDelay: Math.round((data.totalDelay / data.count) * 100) / 100,
      flightCount: data.count,
    }))
    .sort((a, b) => b.avgDelay - a.avgDelay)
    .slice(0, 10);

  // ===== Baggage Summary =====
  const bagRecon = getBaggageReconciliation(store.baggage);
  const avgWeight = store.baggage.length > 0
    ? store.baggage.reduce((sum, b) => sum + (Number(b.weight_kg) || 0), 0) / store.baggage.length
    : 0;
  const baggageSummary: BaggageSummary = {
    totalBags: bagRecon.total,
    loadedPercent: bagRecon.rate,
    missingCount: bagRecon.missing,
    damagedCount: bagRecon.damaged,
    avgWeight: Math.round(avgWeight * 100) / 100,
  };

  // ===== Security Heatmap (wait time by hour and checkpoint) =====
  const securityHeatmap: SecurityHeatmapEntry[] = [];
  const checkpoints = [...new Set(store.securityScreenings.map(s => Number(s.checkpoint_id)))];
  for (const cp of checkpoints) {
    for (let hour = 0; hour < 24; hour++) {
      const hourScreenings = store.securityScreenings.filter(s => {
        const h = new Date(s.screening_time).getHours();
        return Number(s.checkpoint_id) === cp && h === hour;
      });
      if (hourScreenings.length > 0) {
        const avgWait = hourScreenings.reduce((sum, s) => sum + (Number(s.wait_time_seconds) || 0), 0) / hourScreenings.length;
        securityHeatmap.push({
          hour,
          checkpoint: cp,
          avgWaitSeconds: Math.round(avgWait),
          throughput: getSecurityThroughput(hourScreenings, 60),
        });
      }
    }
  }

  // ===== Staffing Gaps =====
  const staffingGaps: StaffingGap[] = [];
  const departments = [...new Set(store.staffShifts.map(s => s.department))];
  const timeSlots = ['Morning (06-12)', 'Afternoon (12-18)', 'Evening (18-00)', 'Night (00-06)'];
  const slotHours = [9, 15, 21, 3]; // representative hour for each slot

  for (const terminal of terminals) {
    for (const dept of departments) {
      for (let i = 0; i < timeSlots.length; i++) {
        const refTime = new Date();
        refTime.setHours(slotHours[i], 0, 0, 0);
        const coverage = getStaffCoverage(store.staffShifts, refTime, terminal, dept);
        if (coverage.status !== 'OK') {
          staffingGaps.push({
            timeSlot: timeSlots[i],
            department: dept,
            terminal,
            assigned: coverage.assigned,
            required: coverage.required,
            status: coverage.status,
          });
        }
      }
    }
  }

  // ===== Maintenance Summary =====
  const openMaintenance = store.maintenanceLogs.filter(m => !m.resolved_at || m.resolved_at === '');
  const maintenanceSummary: MaintenanceSummary = {
    openCritical: openMaintenance.filter(m => Number(m.severity) >= 4).length,
    openHigh: openMaintenance.filter(m => Number(m.severity) === 3).length,
    openMedium: openMaintenance.filter(m => Number(m.severity) === 2).length,
    openLow: openMaintenance.filter(m => Number(m.severity) <= 1).length,
    totalOpen: openMaintenance.length,
    groundingItems: openMaintenance.filter(m => m.is_grounding).length,
  };

  // ===== Retail Summary =====
  const totalRevenue = store.retailTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const avgTransaction = store.retailTransactions.length > 0
    ? totalRevenue / store.retailTransactions.length
    : 0;

  // Top category
  const categoryCounts = new Map<string, number>();
  for (const t of store.retailTransactions) {
    const cat = t.product_category || 'Unknown';
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
  }
  let topCategory = 'N/A';
  let maxCount = 0;
  for (const [cat, count] of categoryCounts) {
    if (count > maxCount) {
      maxCount = count;
      topCategory = cat;
    }
  }

  // Peak hour
  const hourRevenue = new Array(24).fill(0);
  for (const t of store.retailTransactions) {
    const h = new Date(t.timestamp).getHours();
    if (!isNaN(h)) hourRevenue[h] += Number(t.amount) || 0;
  }
  const peakHour = hourRevenue.indexOf(Math.max(...hourRevenue));

  const retailSummary: RetailSummary = {
    totalRevenue: Math.round(totalRevenue),
    avgTransaction: Math.round(avgTransaction),
    topCategory,
    peakHour,
    totalTransactions: store.retailTransactions.length,
  };

  // ===== Quick-access Stats =====
  const totalFlights = store.flights.length;
  const totalPassengers = store.passengers.length;
  const onTimeFlights = store.flights.filter(f => Number(f.delay_minutes) === 0).length;
  const overallOnTimeRate = totalFlights > 0 ? Math.round((onTimeFlights / totalFlights) * 100) : 0;
  const avgDelayMinutes = totalFlights > 0
    ? Math.round(store.flights.reduce((sum, f) => sum + (Number(f.delay_minutes) || 0), 0) / totalFlights)
    : 0;

  return {
    activeAlerts,
    terminalSummaries,
    topDelayedAirlines,
    baggageSummary,
    securityHeatmap,
    staffingGaps,
    maintenanceSummary,
    retailSummary,
    totalFlights,
    totalPassengers,
    overallOnTimeRate,
    avgDelayMinutes,
  };
}
