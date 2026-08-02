import React, { useState, useMemo } from 'react';
import { useAirportData } from '../../../context/AirportContext';
import { useSimulation } from '../../../context/SimulationContext';
import { detectGateConflict } from '../../../utils/airportUtils';
import { GanttTimeline } from './GanttTimeline';
import { GateDetailPanel } from './GateDetailPanel';
import type { GateEvent, Flight } from '../../../types/airport';
import './GatePanel.css';

type GateStatus = 'empty' | 'arriving' | 'boarding' | 'departing' | 'conflict';

interface GateInfo {
  gateId: string;
  status: GateStatus;
  currentFlight: Flight | null;
  nextEventTime: string;
  events: GateEvent[];
}

function getGateStatus(events: GateEvent[], now: number, conflictGates: Set<string>, gateId: string): GateStatus {
  if (conflictGates.has(gateId)) return 'conflict';

  for (const e of events) {
    const start = new Date(e.actual_start || e.scheduled_start).getTime();
    const end = new Date(e.actual_end).getTime();
    if (start <= now && end >= now) {
      const type = (e.event_type || '').toLowerCase();
      if (type.includes('boarding')) return 'boarding';
      if (type.includes('arrival') || type.includes('dock')) return 'arriving';
      return 'departing';
    }
  }
  return 'empty';
}

export const GatePanel: React.FC = () => {
  const { store, gateIndex } = useAirportData();
  const { currentTime } = useSimulation();
  const [selectedTerminal, setSelectedTerminal] = useState('ALL');
  const [selectedGate, setSelectedGate] = useState<string | null>(null);
  const [hoveredGate, setHoveredGate] = useState<string | null>(null);

  // Detect conflicts
  const conflicts = useMemo(() => {
    if (!store) return [];
    return detectGateConflict(store.gateEvents);
  }, [store]);

  const conflictGateSet = useMemo(() => {
    const set = new Set<string>();
    conflicts.forEach(c => set.add(c.gate_id));
    return set;
  }, [conflicts]);

  // Compute enhanced conflicts (including turnaround and equipment issues)
  const enhancedConflicts = useMemo(() => {
    if (!store) return [];
    const result: { type: 'OVERLAP' | 'INSUFFICIENT_TURNAROUND' | 'EQUIPMENT_ISSUE'; gateId: string; flights: string[]; detail: string; action: string }[] = [];

    // Overlap conflicts from detectGateConflict
    conflicts.forEach(c => {
      result.push({
        type: 'OVERLAP',
        gateId: c.gate_id,
        flights: [c.events[0].flight_id, c.events[1].flight_id],
        detail: `${c.overlap_minutes}min overlap at Gate ${c.gate_id}`,
        action: 'Reassign one flight to alternate gate',
      });
    });

    // Turnaround check: < 30 min between flights at same gate
    gateIndex.forEach((events, gateId) => {
      const sorted = events
        .filter(e => e.actual_start && e.actual_end)
        .sort((a, b) => new Date(a.actual_start).getTime() - new Date(b.actual_start).getTime());

      for (let i = 0; i < sorted.length - 1; i++) {
        const end = new Date(sorted[i].actual_end).getTime();
        const nextStart = new Date(sorted[i + 1].actual_start).getTime();
        const gapMin = (nextStart - end) / 60000;
        if (gapMin >= 0 && gapMin < 30) {
          result.push({
            type: 'INSUFFICIENT_TURNAROUND',
            gateId,
            flights: [sorted[i].flight_id, sorted[i + 1].flight_id],
            detail: `Only ${Math.round(gapMin)}min turnaround at Gate ${gateId}`,
            action: 'Expedite ground operations or delay next boarding',
          });
        }
      }
    });

    // Equipment issues from maintenance_logs
    if (store) {
      store.maintenanceLogs.filter(m => !m.resolved_at && Number(m.severity) >= 3).forEach(m => {
        const assetId = m.asset_id || '';
        // Check if asset matches any gate
        gateIndex.forEach((_, gateId) => {
          if (assetId.toLowerCase().includes(gateId.toLowerCase()) || assetId.toLowerCase().includes('gate')) {
            result.push({
              type: 'EQUIPMENT_ISSUE',
              gateId,
              flights: m.flight_id ? [m.flight_id] : [],
              detail: `${m.description || m.type} at Gate ${gateId}`,
              action: 'Dispatch maintenance team',
            });
          }
        });
      });
    }

    return result;
  }, [conflicts, gateIndex, store]);

  // Build gate info list
  const gateInfoList = useMemo((): GateInfo[] => {
    if (!store) return [];
    const now = currentTime.getTime();
    const allGateIds = [...gateIndex.keys()].sort();

    return allGateIds.map(gateId => {
      const events = gateIndex.get(gateId) || [];
      const sortedEvents = [...events].sort((a, b) =>
        new Date(a.actual_start || a.scheduled_start).getTime() - new Date(b.actual_start || b.scheduled_start).getTime()
      );

      const status = getGateStatus(sortedEvents, now, conflictGateSet, gateId);

      // Find current flight
      let currentFlight: Flight | null = null;
      const currentEvent = sortedEvents.find(e => {
        const start = new Date(e.actual_start || e.scheduled_start).getTime();
        const end = new Date(e.actual_end).getTime();
        return start <= now && end >= now;
      });
      if (currentEvent) {
        currentFlight = store.flights.find(f => f.flight_id === currentEvent.flight_id) || null;
      }

      // Next event time
      const nextEvent = sortedEvents.find(e => new Date(e.actual_start || e.scheduled_start).getTime() > now);
      const nextEventTime = nextEvent
        ? new Date(nextEvent.actual_start || nextEvent.scheduled_start).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
        : '--:--';

      return { gateId, status, currentFlight, nextEventTime, events: sortedEvents };
    });
  }, [store, gateIndex, currentTime, conflictGateSet]);

  // Terminals from data
  const terminals = useMemo(() => {
    const set = new Set<string>();
    gateInfoList.forEach(g => {
      const evt = g.events[0];
      if (evt?.terminal) set.add(evt.terminal);
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [gateInfoList]);

  // Filter by terminal
  const filteredGates = useMemo(() => {
    if (selectedTerminal === 'ALL') return gateInfoList;
    return gateInfoList.filter(g => {
      const t = g.events[0]?.terminal;
      return t === selectedTerminal;
    });
  }, [gateInfoList, selectedTerminal]);

  // Gates for Gantt (limit to filtered)
  const ganttGates = filteredGates.slice(0, 30);

  if (!store) return <div className="no-data">Loading gate data...</div>;

  return (
    <div className="gate-panel">
      {/* Terminal Tabs */}
      <div className="terminal-tabs">
        {terminals.map(t => (
          <button
            key={t}
            className={`terminal-tab ${selectedTerminal === t ? 'active' : ''}`}
            onClick={() => setSelectedTerminal(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="gate-content">
        {/* Gate Map Grid */}
        <div className="gate-map-section">
          <h3>Gate Map — {filteredGates.length} Gates</h3>
          <div className="gate-grid">
            {filteredGates.map(gate => (
              <div
                key={gate.gateId}
                className={`gate-card ${gate.status}`}
                onClick={() => setSelectedGate(gate.gateId)}
                onMouseEnter={() => setHoveredGate(gate.gateId)}
                onMouseLeave={() => setHoveredGate(null)}
              >
                <div className="gate-number">{gate.gateId}</div>
                <div className="gate-flight">{gate.currentFlight?.flight_id || '—'}</div>
                <div className="gate-time">{gate.nextEventTime}</div>

                {/* Tooltip on hover */}
                {hoveredGate === gate.gateId && gate.currentFlight && (
                  <div className="gate-tooltip">
                    <div className="tooltip-row">
                      <span className="tooltip-label">Aircraft</span>
                      <span className="tooltip-value">{gate.currentFlight.aircraft_type}</span>
                    </div>
                    <div className="tooltip-row">
                      <span className="tooltip-label">Arrival</span>
                      <span className="tooltip-value">
                        {gate.currentFlight.scheduled_arrival
                          ? new Date(gate.currentFlight.scheduled_arrival).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
                          : '--:--'}
                      </span>
                    </div>
                    <div className="tooltip-row">
                      <span className="tooltip-label">Departure</span>
                      <span className="tooltip-value">
                        {gate.currentFlight.scheduled_departure
                          ? new Date(gate.currentFlight.scheduled_departure).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
                          : '--:--'}
                      </span>
                    </div>
                    <div className="tooltip-row">
                      <span className="tooltip-label">Status</span>
                      <span className={`tooltip-value ${gate.status}`}>{gate.status.toUpperCase()}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Gantt Timeline Section */}
        <div className="gantt-section">
          <h3>Turnaround Timeline</h3>
          {/* Hour labels */}
          <div className="gantt-header" style={{ position: 'relative', height: '16px', marginBottom: '4px' }}>
            {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
              <div key={h} className="gantt-hour-label" style={{ left: `calc(60px + ${(h / 24) * 100}% * (1 - 60px / 100%))` }}>
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {ganttGates.map(gate => (
            <GanttTimeline
              key={gate.gateId}
              gateId={gate.gateId}
              events={gate.events}
              flights={store.flights}
              currentTime={currentTime}
            />
          ))}
          {ganttGates.length === 0 && <div className="no-data">No gates to display</div>}
        </div>

        {/* Conflict Panel */}
        {enhancedConflicts.length > 0 && (
          <div className="conflict-section">
            <h3>⚠ Active Conflicts ({enhancedConflicts.length})</h3>
            {enhancedConflicts.slice(0, 10).map((c, i) => (
              <div key={i} className="conflict-row">
                <span className={`conflict-badge ${c.type === 'OVERLAP' ? 'overlap' : c.type === 'INSUFFICIENT_TURNAROUND' ? 'turnaround' : 'equipment'}`}>
                  {c.type === 'OVERLAP' ? 'OVERLAP' : c.type === 'INSUFFICIENT_TURNAROUND' ? 'TURNAROUND' : 'EQUIPMENT'}
                </span>
                <span className="conflict-flights">{c.flights.join(' / ')}</span>
                <span className="conflict-details">{c.detail}</span>
                <span className="conflict-action">{c.action}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gate Detail Drawer */}
      {selectedGate && (
        <GateDetailPanel
          gateId={selectedGate}
          gateEvents={store.gateEvents}
          flights={store.flights}
          staffShifts={store.staffShifts}
          maintenanceLogs={store.maintenanceLogs}
          currentTime={currentTime}
          onClose={() => setSelectedGate(null)}
        />
      )}
    </div>
  );
};
