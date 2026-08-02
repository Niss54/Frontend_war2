import React, { useMemo } from 'react';
import { X, Clock, Luggage, Users, PenTool as Tool, ShoppingBag, List } from 'lucide-react';
import { useAirportData } from '../../../context/AirportContext';
import { useFilter } from '../../../context/FilterContext';
import { useSimulation } from '../../../context/SimulationContext';
import './FlightDetailPanel.css';

export const FlightDetailPanel: React.FC = () => {
  const { store, flightIndex, timelineIndex } = useAirportData();
  const { selectedFlightId, setSelectedFlight } = useFilter();
  const { currentTime } = useSimulation();

  const flightData = useMemo(() => {
    if (!selectedFlightId || !flightIndex) return null;
    return flightIndex.get(selectedFlightId);
  }, [selectedFlightId, flightIndex]);

  const timeline = useMemo(() => {
    if (!selectedFlightId || !timelineIndex) return [];
    return timelineIndex.get(selectedFlightId) || [];
  }, [selectedFlightId, timelineIndex]);

  // Derived 360 stats
  const stats = useMemo(() => {
    if (!flightData || !store) return null;
    
    // Baggage
    const bags = store.baggage.filter(b => b.flight_id === flightData.flight.flight_id);
    const bagsLoaded = bags.filter(b => b.status === 'Loaded').length;
    const bagsMissing = bags.filter(b => b.status === 'Missing' || b.status === 'Damaged').length;
    
    // Pax
    const pax = store.passengers.filter(p => p.flight_id === flightData.flight.flight_id);
    const paxBoarded = pax.filter(p => p.boarding_time).length;
    const specialAssistance = pax.filter(p => p.wheelchair || p.unaccompanied_minor).length;
    
    // Maintenance
    const maint = store.maintenanceLogs.filter(m => m.flight_id === flightData.flight.flight_id && !m.resolved_at);
    
    // Staff
    const staff = store.staffShifts.filter(s => s.terminal === flightData.flight.terminal);
    
    // Retail
    const retail = store.retailTransactions.filter(r => r.terminal === flightData.flight.terminal);
    const termRev = retail.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    return {
      bagsTotal: bags.length, bagsLoaded, bagsMissing,
      paxTotal: pax.length, paxBoarded, specialAssistance,
      maintCount: maint.length, maintIssues: maint,
      staffCount: staff.length,
      termRev
    };
  }, [flightData, store, currentTime]);

  if (!selectedFlightId) return null;

  return (
    <div className={`flight-detail-drawer ${selectedFlightId ? 'open' : ''}`}>
      <div className="drawer-header">
        <div className="drawer-title-group">
          <div className="drawer-flight-id">
            ✈️ {flightData?.flight.flight_id}
            <span style={{ fontSize: '14px', background: '#333', padding: '4px 8px', borderRadius: '4px' }}>
              {flightData?.flight.status}
            </span>
          </div>
          <div className="drawer-route">
            {flightData?.flight.airline} | {flightData?.flight.origin} → {flightData?.flight.destination}
          </div>
        </div>
        <button className="drawer-close-btn" onClick={() => setSelectedFlight(null)}>
          <X size={24} />
        </button>
      </div>

      <div className="drawer-content">
        
        {/* SCHEDULE */}
        <section className="detail-section">
          <div className="section-header"><Clock size={14} /> SCHEDULE & STATUS</div>
          <div className="section-body detail-grid-4">
            <div className="detail-item">
              <span className="detail-label">Sch. Dep</span>
              <span className="detail-value">{flightData?.flight.scheduled_departure?.split(' ')[1] || '-'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Act. Dep</span>
              <span className={`detail-value ${Number(flightData?.flight.delay_minutes) > 0 ? 'critical' : 'highlight'}`}>
                {flightData?.flight.actual_departure?.split(' ')[1] || '-'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Terminal</span>
              <span className="detail-value">{flightData?.flight.terminal || '-'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Gate</span>
              <span className="detail-value large">{flightData?.flight.gate || '-'}</span>
            </div>
          </div>
        </section>

        {/* BAGGAGE & PAX */}
        <div className="detail-grid">
          <section className="detail-section">
            <div className="section-header"><Users size={14} /> PASSENGERS</div>
            <div className="section-body detail-grid">
              <div className="detail-item">
                <span className="detail-label">Total Pax</span>
                <span className="detail-value">{stats?.paxTotal}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Boarded</span>
                <span className="detail-value">{stats?.paxBoarded}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Special Needs</span>
                <span className="detail-value warning">{stats?.specialAssistance}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Load Factor</span>
                <span className="detail-value">{flightData?.flight.load_factor}%</span>
              </div>
            </div>
          </section>

          <section className="detail-section">
            <div className="section-header"><Luggage size={14} /> BAGGAGE</div>
            <div className="section-body detail-grid">
              <div className="detail-item">
                <span className="detail-label">Total Bags</span>
                <span className="detail-value">{stats?.bagsTotal}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Loaded</span>
                <span className="detail-value highlight">{stats?.bagsLoaded}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Missing/Dmg</span>
                <span className={`detail-value ${stats?.bagsMissing ? 'critical' : ''}`}>{stats?.bagsMissing}</span>
              </div>
            </div>
          </section>
        </div>

        {/* OPS SUPPORT */}
        <div className="detail-grid">
          <section className="detail-section">
            <div className="section-header"><Tool size={14} /> MAINTENANCE</div>
            <div className="section-body">
              {stats?.maintIssues.length ? (
                stats.maintIssues.map((m, i) => (
                  <div key={i} style={{ fontSize: '12px', color: '#FFB800', marginBottom: '4px' }}>
                    ⚠️ {m.description}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '12px', color: '#00FF88' }}>✅ No open issues</div>
              )}
            </div>
          </section>

          <section className="detail-section">
            <div className="section-header"><ShoppingBag size={14} /> RETAIL CTX</div>
            <div className="section-body">
              <div className="detail-item">
                <span className="detail-label">Terminal Revenue Today</span>
                <span className="detail-value highlight">₹{stats?.termRev.toLocaleString()}</span>
              </div>
            </div>
          </section>
        </div>

        {/* TIMELINE */}
        <section className="detail-section">
          <div className="section-header"><List size={14} /> UNIFIED TIMELINE</div>
          <div className="section-body">
            <div className="unified-timeline">
              {timeline.map((t, i) => (
                <div key={i} className="timeline-event">
                  <div className="event-time">{new Date(t.timestamp).toLocaleTimeString()}</div>
                  <div className="event-title">{t.label}</div>
                  <div className="event-details">{t.details}</div>
                </div>
              ))}
              {timeline.length === 0 && <div style={{color: '#8b92a5', fontSize: '12px'}}>No events recorded.</div>}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
