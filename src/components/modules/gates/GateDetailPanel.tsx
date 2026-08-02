import React from 'react';
import type { GateEvent, Flight, StaffShift, MaintenanceLog } from '../../../types/airport';

interface GateDetailPanelProps {
  gateId: string;
  gateEvents: GateEvent[];
  flights: Flight[];
  staffShifts: StaffShift[];
  maintenanceLogs: MaintenanceLog[];
  currentTime: Date;
  onClose: () => void;
}

function getGateStatus(events: GateEvent[], currentTime: Date): string {
  const now = currentTime.getTime();
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

export const GateDetailPanel: React.FC<GateDetailPanelProps> = ({
  gateId, gateEvents, flights, staffShifts, maintenanceLogs, currentTime, onClose
}) => {
  const gateEvts = gateEvents.filter(e => e.gate_id === gateId)
    .sort((a, b) => new Date(a.actual_start || a.scheduled_start).getTime() - new Date(b.actual_start || b.scheduled_start).getTime());

  const status = getGateStatus(gateEvts, currentTime);

  // Current flight at the gate
  const now = currentTime.getTime();
  const currentEvent = gateEvts.find(e => {
    const start = new Date(e.actual_start || e.scheduled_start).getTime();
    const end = new Date(e.actual_end).getTime();
    return start <= now && end >= now;
  });
  const currentFlight = currentEvent ? flights.find(f => f.flight_id === currentEvent.flight_id) : null;

  // Staff on duty at gate terminal
  const terminal = gateEvts[0]?.terminal;
  const activeStaff = staffShifts.filter(s => {
    if (s.terminal !== terminal) return false;
    const start = new Date(s.shift_start).getTime();
    const end = new Date(s.shift_end).getTime();
    return start <= now && end >= now;
  });
  const groundCrew = activeStaff.filter(s => (s.department || '').toLowerCase().includes('ground'));
  const gateAgents = activeStaff.filter(s => (s.role || '').toLowerCase().includes('agent'));

  // Maintenance items for this gate
  const gateMaint = maintenanceLogs.filter(m => (m.asset_id || '').includes(gateId));

  // Next 3 scheduled events
  const upcoming = gateEvts.filter(e => new Date(e.actual_start || e.scheduled_start).getTime() > now).slice(0, 3);

  return (
    <>
      <div className="gate-detail-overlay" onClick={onClose}></div>
      <div className="gate-detail-drawer">
        <div className="drawer-header">
          <h2>Gate {gateId} <span className={`status-badge ${status}`}>{status.toUpperCase()}</span></h2>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        {/* Current Flight */}
        <div className="drawer-section">
          <h3>Current Flight</h3>
          {currentFlight ? (
            <>
              <div className="detail-row">
                <span className="detail-label">Flight</span>
                <span className="detail-value">{currentFlight.flight_id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Airline</span>
                <span className="detail-value">{currentFlight.airline}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Aircraft</span>
                <span className="detail-value">{currentFlight.aircraft_type} ({currentFlight.aircraft_reg})</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Route</span>
                <span className="detail-value">{currentFlight.origin} → {currentFlight.destination}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-value">{currentFlight.status}</span>
              </div>
            </>
          ) : (
            <div className="no-data">No flight currently at this gate</div>
          )}
        </div>

        {/* Event Timeline */}
        <div className="drawer-section">
          <h3>Event Timeline</h3>
          <div className="event-timeline">
            {gateEvts.slice(0, 10).map((evt, i) => {
              const schedStart = new Date(evt.scheduled_start);
              const actualStart = new Date(evt.actual_start);
              const deltaMin = Math.round((actualStart.getTime() - schedStart.getTime()) / 60000);
              const isLate = deltaMin > 5;

              return (
                <div key={i} className={`timeline-item ${isLate ? 'late' : ''}`}>
                  <div className="timeline-event-type">{evt.event_type}</div>
                  <div className="timeline-event-time">
                    <span className={isLate ? 'late' : ''}>
                      {actualStart.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isLate && <span className="timeline-delta">+{deltaMin}m late</span>}
                  </div>
                </div>
              );
            })}
            {gateEvts.length === 0 && <div className="no-data">No events recorded</div>}
          </div>
        </div>

        {/* Staff on Duty */}
        <div className="drawer-section">
          <h3>Staff on Duty</h3>
          <div className="detail-row">
            <span className="detail-label">Ground Crew</span>
            <span className="detail-value">{groundCrew.length}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Gate Agents</span>
            <span className="detail-value">{gateAgents.length}</span>
          </div>
          <div className="staff-list">
            {activeStaff.slice(0, 8).map((s, i) => (
              <span key={i} className="staff-chip">{s.name} ({s.role})</span>
            ))}
          </div>
        </div>

        {/* Maintenance Items */}
        <div className="drawer-section">
          <h3>Maintenance ({gateMaint.length})</h3>
          {gateMaint.length > 0 ? gateMaint.slice(0, 5).map((m, i) => {
            const sev = Number(m.severity);
            const sevClass = sev >= 4 ? 'critical' : sev >= 3 ? 'high' : sev >= 2 ? 'medium' : 'low';
            return (
              <div key={i} className="maint-item">
                <span className={`maint-severity ${sevClass}`}></span>
                <span style={{ fontSize: '12px', color: '#fff' }}>{m.description || m.type}</span>
                <span style={{ fontSize: '10px', color: '#8b92a5', marginLeft: '8px' }}>
                  {m.resolved_at ? '✓ Resolved' : '⚠ Open'}
                </span>
              </div>
            );
          }) : <div className="no-data">No maintenance items</div>}
        </div>

        {/* Upcoming Events */}
        <div className="drawer-section">
          <h3>Next Scheduled ({upcoming.length})</h3>
          {upcoming.map((evt, i) => {
            const flight = flights.find(f => f.flight_id === evt.flight_id);
            return (
              <div key={i} className="detail-row">
                <span className="detail-label">{evt.event_type}</span>
                <span className="detail-value">
                  {flight?.flight_id || 'N/A'} at{' '}
                  {new Date(evt.scheduled_start).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
          {upcoming.length === 0 && <div className="no-data">No upcoming events</div>}
        </div>
      </div>
    </>
  );
};
