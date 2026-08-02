import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, AlertTriangle, Users, Activity } from 'lucide-react';
import { useAirportData } from '../../../context/AirportContext';
import { useSimulation } from '../../../context/SimulationContext';
import { useFlightFilter } from '../../../hooks/useFlightFilter';
import './FlightDetailPanel.css';

interface FlightDetailPanelProps {
  flightId: string;
}

export const FlightDetailPanel: React.FC<FlightDetailPanelProps> = ({ flightId }) => {
  const { flightIndex, store } = useAirportData();
  const { currentTime } = useSimulation();
  const { clearFlight } = useFlightFilter();

  const uf = flightIndex.get(flightId);

  // SECTION 7: STAFF ON DUTY
  const staffOnDuty = useMemo(() => {
    if (!uf || !store) return [];
    // Filter staff active in the terminal at current time
    return store.staffShifts.filter(s => {
      const shiftStart = new Date(`${s.shift_date}T${s.shift_start}`);
      const shiftEnd = new Date(`${s.shift_date}T${s.shift_end}`);
      return s.terminal === uf.flight.terminal && currentTime >= shiftStart && currentTime <= shiftEnd;
    });
  }, [uf, store, currentTime]);

  if (!uf) return null;

  const f = uf.flight;
  const isDelayed = f.delay_minutes > 0;
  
  // Dial colors based on delayRiskScore
  let dialColor = '#00FF88'; // green
  if (uf.delayRiskScore > 70) dialColor = '#FF3366'; // red
  else if (uf.delayRiskScore >= 40) dialColor = '#FFB300'; // amber

  // Baggage Reconciliation
  const totalBags = uf.bags.length;
  const loadedBags = uf.bags.filter(b => b.status === 'Loaded').length;
  const missingBags = uf.bags.filter(b => b.status === 'Missing').length;
  const reconPct = totalBags > 0 ? (loadedBags / totalBags) * 100 : 0;
  
  let reconColor = '#FF3366';
  if (reconPct > 98) reconColor = '#00FF88';
  else if (reconPct >= 90) reconColor = '#FFB300';

  const unloadedBags = uf.bags.filter(b => b.status !== 'Loaded');

  // Passengers
  const totalPax = uf.passengers.length;
  const checkedIn = uf.passengers.filter(p => !!p.checkin_time).length;
  // Security screening joined in UF
  const throughSecurity = uf.securityCheckpoints.length;
  const boarded = uf.passengers.filter(p => !!p.boarding_time).length;

  return (
    <AnimatePresence>
      <motion.div 
        className="flight-detail-panel"
        initial={{ x: 640 }}
        animate={{ x: 0 }}
        exit={{ x: 640 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="fdp-header-top">
          <span style={{ color: '#8b92a5', fontSize: '12px', letterSpacing: '2px' }}>FLIGHT COMMAND / {flightId}</span>
          <button className="fdp-close-btn" onClick={clearFlight}>
            <X size={20} />
          </button>
        </div>

        <div className="fdp-content">
          {/* SECTION 1 - FLIGHT HEADER */}
          <div className="fdp-section-content fdp-flight-header">
            <div>
              <div className="fdp-flight-number">{f.flight_id}</div>
              <div className="fdp-flight-route">{f.origin} → {f.destination}</div>
              <div className="fdp-flight-meta">
                <span>{f.airline}</span>
                <span>•</span>
                <span>{f.aircraft_type}</span>
                <span>•</span>
                <span className={`status-badge ${f.status === 'DELAYED' ? 'red' : f.status === 'SCHEDULED' ? 'amber' : 'green'}`}>
                  {f.status}
                </span>
              </div>
            </div>
            <div className="delay-dial">
              <svg width="60" height="60" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#1e1e2e" strokeWidth="8" />
                <circle 
                  cx="50" cy="50" r="40" fill="none" 
                  stroke={dialColor} strokeWidth="8" 
                  strokeDasharray={`${(uf.delayRiskScore / 100) * 251} 251`}
                  transform="rotate(-90 50 50)"
                  strokeLinecap="round"
                />
              </svg>
              <div className="dial-score" style={{ color: dialColor }}>{Math.round(uf.delayRiskScore)}</div>
              <div className="dial-label">Risk Score</div>
            </div>
          </div>

          {/* SECTION 2 - SCHEDULE */}
          <div className="fdp-section">
            <div className="fdp-section-header">SCHEDULE & ROUTING</div>
            <div className="fdp-section-content">
              <div className="fdp-schedule-grid">
                <div className="sched-col">
                  <div className="sched-item">
                    <span className="sched-label">Scheduled Departure</span>
                    <span className="sched-time">{f.scheduled_departure?.split(' ')[1]?.substring(0, 5) || '--:--'}</span>
                  </div>
                  <div className="sched-item">
                    <span className="sched-label">Scheduled Arrival</span>
                    <span className="sched-time">{f.scheduled_arrival?.split(' ')[1]?.substring(0, 5) || '--:--'}</span>
                  </div>
                </div>
                <div className="sched-col">
                  <div className="sched-item">
                    <span className="sched-label">Actual Departure</span>
                    <span className={`sched-time ${isDelayed ? 'late' : ''}`}>
                      {f.actual_departure?.split(' ')[1]?.substring(0, 5) || '--:--'}
                    </span>
                  </div>
                  <div className="sched-item">
                    <span className="sched-label">Actual Arrival</span>
                    <span className="sched-time">{f.actual_arrival?.split(' ')[1]?.substring(0, 5) || '--:--'}</span>
                  </div>
                </div>
                <div className="sched-bottom">
                  <div className="sched-info">
                    <span style={{ color: '#8b92a5' }}>Gate:</span> <strong>{f.gate || 'TBD'}</strong>
                    <span style={{ color: '#8b92a5', marginLeft: '12px' }}>Terminal:</span> <strong>{f.terminal}</strong>
                  </div>
                  {isDelayed && (
                    <div className="sched-info" style={{ color: '#FF3366' }}>
                      <Clock size={14} /> +{f.delay_minutes}m Delay
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3 - GATE STATUS */}
          <div className="fdp-section">
            <div className="fdp-section-header">GATE TURNAROUND</div>
            <div className="fdp-section-content">
              <div className="fdp-gate-card">
                <div>
                  <div className="gate-name-large">{f.gate || 'TBD'}</div>
                  <div className="gate-event-current">
                    {uf.gateEvents.length > 0 ? uf.gateEvents[uf.gateEvents.length - 1].event_type : 'Awaiting Aircraft'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={`status-badge ${uf.turnaroundStatus === 'ON_TRACK' ? 'green' : uf.turnaroundStatus === 'AT_RISK' ? 'amber' : 'red'}`}>
                    {uf.turnaroundStatus.replace('_', ' ')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8b92a5', marginTop: '8px' }}>
                    EST: {uf.estimatedTurnaroundMinutes}m
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4 - BAGGAGE */}
          <div className="fdp-section">
            <div className="fdp-section-header">BAGGAGE PIPELINE</div>
            <div className="fdp-section-content">
              <div className="bag-stats">
                <div className="bag-stat">
                  <span className="bag-stat-val">{totalBags}</span>
                  <span className="bag-stat-lbl">Total</span>
                </div>
                <div className="bag-stat">
                  <span className="bag-stat-val" style={{ color: '#00FF88' }}>{loadedBags}</span>
                  <span className="bag-stat-lbl">Loaded</span>
                </div>
                <div className="bag-stat">
                  <span className="bag-stat-val" style={{ color: missingBags > 0 ? '#FF3366' : '#fff' }}>{missingBags}</span>
                  <span className="bag-stat-lbl">Missing</span>
                </div>
                <div className="bag-stat">
                  <span className="bag-stat-val" style={{ color: reconColor }}>{reconPct.toFixed(1)}%</span>
                  <span className="bag-stat-lbl">Recon %</span>
                </div>
              </div>
              <div className="bag-recon-bar">
                <div className="bag-recon-fill" style={{ width: `${Math.min(reconPct, 100)}%`, backgroundColor: reconColor }} />
              </div>
              
              {unloadedBags.length > 0 && (
                <div className="unloaded-bags" style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#FF3366', marginBottom: '8px', fontWeight: 'bold' }}>
                    <AlertTriangle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    {unloadedBags.length} BAGS REQUIRE ATTENTION
                  </div>
                  {unloadedBags.slice(0, 5).map(b => (
                    <div key={b.bag_id} className="unloaded-bag-item">
                      <span style={{ fontFamily: '"Courier New", monospace' }}>{b.bag_id}</span>
                      <span className={`status-badge ${b.status === 'Missing' ? 'red' : 'amber'}`}>{b.status}</span>
                    </div>
                  ))}
                  {unloadedBags.length > 5 && (
                    <div style={{ textAlign: 'center', color: '#8b92a5', fontSize: '11px', marginTop: '8px' }}>
                      +{unloadedBags.length - 5} more bags...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5 - PASSENGERS */}
          <div className="fdp-section">
            <div className="fdp-section-header">PASSENGER MANIFEST</div>
            <div className="fdp-section-content">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="#00FF88" />
                  <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{totalPax} Pax</span>
                </div>
                <div className={`status-badge ${uf.paxLoadFactor > 80 ? 'green' : 'amber'}`}>
                  {uf.paxLoadFactor.toFixed(0)}% LF
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div className="bag-stat">
                  <span className="bag-stat-val">{checkedIn}</span>
                  <span className="bag-stat-lbl">Checked In</span>
                </div>
                <div className="bag-stat">
                  <span className="bag-stat-val">{throughSecurity}</span>
                  <span className="bag-stat-lbl">Security</span>
                </div>
                <div className="bag-stat">
                  <span className="bag-stat-val">{boarded}</span>
                  <span className="bag-stat-lbl">Boarded</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 6 - MAINTENANCE */}
          <div className="fdp-section">
            <div className="fdp-section-header">MAINTENANCE LOGS</div>
            <div className="fdp-section-content">
              {uf.maintenanceItems.length === 0 ? (
                <div style={{ color: '#00FF88', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={16} /> No open maintenance items.
                </div>
              ) : (
                uf.maintenanceItems.map(m => (
                  <div key={m.work_order_id} className="maint-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: '"Courier New", monospace', color: '#8b92a5' }}>{m.work_order_id}</span>
                      <span className={`status-badge ${m.priority > 3 ? 'red' : 'amber'}`}>
                        P{m.priority} • {m.type}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px' }}>{m.description}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SECTION 7 - STAFF ON DUTY */}
          <div className="fdp-section">
            <div className="fdp-section-header">TERMINAL STAFF ALLOCATION</div>
            <div className="fdp-section-content">
              {staffOnDuty.length === 0 ? (
                <div style={{ color: '#8b92a5', fontSize: '14px' }}>No active shifts in {f.terminal}</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {Object.entries(
                    staffOnDuty.reduce((acc, s) => {
                      acc[s.department] = (acc[s.department] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([dept, count]) => (
                    <div key={dept} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#151520', borderRadius: '4px' }}>
                      <span style={{ color: '#8b92a5' }}>{dept}</span>
                      <span style={{ fontWeight: 'bold' }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 8 - TIMELINE */}
          <div className="fdp-section">
            <div className="fdp-section-header">EVENT TIMELINE</div>
            <div className="fdp-section-content">
              {uf.gateEvents.length === 0 ? (
                <div style={{ color: '#8b92a5', fontSize: '14px' }}>No events recorded.</div>
              ) : (
                [...uf.gateEvents]
                  .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                  .map(ev => {
                    const time = ev.timestamp.split(' ')[1]?.substring(0, 5) || '--:--';
                    return (
                      <div key={ev.event_id} className="timeline-row">
                        <div className="timeline-time">{time}</div>
                        <div className="timeline-event">{ev.event_type}</div>
                        <div className={`timeline-status ${ev.is_conflict ? 'status-badge red' : 'status-badge green'}`} style={{ marginLeft: 'auto' }}>
                          {ev.is_conflict ? 'CONFLICT' : 'OK'}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};
