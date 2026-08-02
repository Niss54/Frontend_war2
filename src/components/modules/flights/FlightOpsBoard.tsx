import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FixedSizeList as List } from 'react-window';
import { useAirportData } from '../../../context/AirportContext';
import { useFlightFilter } from '../../../hooks/useFlightFilter';
import { FlightRow } from './FlightRow';
import { FlightDetailPanel } from './FlightDetailPanel';
import { DelayRiskLeaderboard } from './DelayRiskLeaderboard';

import { eventBus, FLIGHT_STATUS_CHANGED } from '../../../utils/EventBus';
import './FlightOpsBoard.css';

interface Toast {
  id: number;
  message: string;
}

export const FlightOpsBoard: React.FC = () => {
  const { flightIndex, isLoading, error } = useAirportData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMobileLeaderboardOpen, setIsMobileLeaderboardOpen] = useState(false);
  
  const {
    filteredFlights,
    searchQuery,
    statusFilter,
    terminalFilter,
    airlineFilter,
    setSearchQuery,
    setStatus,
    setTerminal,
    setAirline,
    setSelectedFlight,
    selectedFlightId,
    isDetailPanelOpen
  } = useFlightFilter();

  const [toasts, setToasts] = useState<Toast[]>([]);
  let toastIdCounter = useRef(0);

  // Local sort state (could also be in useFlightFilter, but keeping here for UI bindings)
  const sortBy = searchParams.get('sort') || 'time';

  // Available options
  const allFlights = Array.from(flightIndex.values());
  const airlines = ['ALL', ...new Set(allFlights.map(f => f.flight.airline_code))].sort();
  const terminals = ['ALL', 'Terminal 1', 'Terminal 2', 'Terminal 3', 'T1', 'T2', 'T3'];
  const statuses = ['ALL', 'SCHEDULED', 'BOARDING', 'DEPARTED', 'DELAYED', 'CANCELLED'];

  // EventBus Listener for Toasts
  useEffect(() => {
    const handleStatusChange = (payload: { flight_id: string, newStatus: string, gate?: string }) => {
      const msg = `${payload.flight_id} is now ${payload.newStatus}${payload.gate ? ` at Gate ${payload.gate}` : ''}`;
      const id = ++toastIdCounter.current;
      setToasts(prev => [...prev, { id, message: msg }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    };

    eventBus.on(FLIGHT_STATUS_CHANGED, handleStatusChange);
    return () => eventBus.off(FLIGHT_STATUS_CHANGED, handleStatusChange);
  }, []);

  const departures = filteredFlights.filter(f => !!f.flight.scheduled_departure && f.flight.origin === 'DEL');
  const arrivals = filteredFlights.filter(f => !!f.flight.scheduled_arrival && f.flight.destination === 'DEL');

  const updateSortParam = (val: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', val);
    setSearchParams(newParams, { replace: true });
  };

  if (isLoading) return <div className="board-loading">Initializing Engine...</div>;
  if (error) return <div className="board-error">Data Engine Error: {error}</div>;

  return (
    <div className="flight-ops-board">
      
      {/* Sticky Filter Bar */}
      <div className="filter-bar">
        <div className="filter-left">
          <input 
            type="text" 
            placeholder="Search flight, dest, airline..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-middle">
          <div className="filter-group">
            <span className="filter-label">Status</span>
            <select value={statusFilter} onChange={(e) => setStatus(e.target.value === 'ALL' ? null : e.target.value)}>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Terminal</span>
            <select value={terminalFilter} onChange={(e) => setTerminal(e.target.value === 'ALL' ? null : e.target.value)}>
              {terminals.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Airline</span>
            <select value={airlineFilter} onChange={(e) => setAirline(e.target.value === 'ALL' ? null : e.target.value)}>
              {airlines.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div className="filter-right">
          <span className="filter-label">Sort</span>
          <select value={sortBy} onChange={(e) => updateSortParam(e.target.value)}>
            <option value="time">Time</option>
            <option value="status">Status</option>
            <option value="gate">Gate</option>
          </select>
        </div>
      </div>

      <div className="leaderboard-mobile">
        <button 
          onClick={() => setIsMobileLeaderboardOpen(!isMobileLeaderboardOpen)}
          style={{ width: '100%', background: 'transparent', border: '1px solid #1e1e2e', color: '#8b92a5', padding: '8px', cursor: 'pointer', fontFamily: 'Courier', borderRadius: '4px' }}
        >
          {isMobileLeaderboardOpen ? 'Hide Delay Risk Leaderboard' : 'Show Delay Risk Leaderboard'}
        </button>
        {isMobileLeaderboardOpen && (
          <div style={{ height: '350px', marginTop: '16px' }}>
            <DelayRiskLeaderboard />
          </div>
        )}
      </div>

      <div className="fob-layout">
        <div className="fob-main-col">
          {/* Main Board Panels */}
          <div className="board-panels">
            
            {/* Departures Panel (50%) */}
            <div className="panel departures-panel">
          <div className="panel-header departures">
            <h2>DEPARTURES</h2>
          </div>
          <div className="panel-col-headers">
            <div className="fr-dot-col"></div>
            <div className="fr-flight-col">FLIGHT</div>
            <div className="fr-airline-col">AL</div>
            <div className="fr-dest-col">DESTINATION</div>
            <div className="fr-time-col">SCHED</div>
            <div className="fr-est-col">EST</div>
            <div className="fr-gate-col">GATE</div>
            <div className="fr-term-col">TERM</div>
            <div className="fr-status-col">STATUS</div>
            <div className="fr-risk-col">RSK</div>
          </div>
          <div className="panel-content" style={{ padding: 0 }}>
            {departures.length === 0 ? (
              <div className="no-flights">No departures match filters</div>
            ) : (
              <List
                height={window.innerHeight - 300} // Approximate available height
                itemCount={departures.length}
                itemSize={64} // Height of FlightRow + gap/padding (approx)
                width="100%"
              >
                {({ index, style }: { index: number, style: React.CSSProperties }) => (
                  <div style={{ ...style, padding: '0 16px' }}>
                    <FlightRow 
                      flightData={departures[index]} 
                      type="DEPARTURE" 
                      onClick={setSelectedFlight} 
                    />
                  </div>
                )}
              </List>
            )}
          </div>
        </div>

        {/* Arrivals Panel (45%) */}
        <div className="panel arrivals-panel">
          <div className="panel-header arrivals">
            <h2>ARRIVALS</h2>
          </div>
          <div className="panel-col-headers">
            <div className="fr-dot-col"></div>
            <div className="fr-flight-col">FLIGHT</div>
            <div className="fr-airline-col">AL</div>
            <div className="fr-dest-col">ORIGIN</div>
            <div className="fr-time-col">SCHED</div>
            <div className="fr-est-col">EST</div>
            <div className="fr-gate-col">GATE</div>
            <div className="fr-term-col">TERM</div>
            <div className="fr-status-col">STATUS</div>
            <div className="fr-risk-col">RSK</div>
          </div>
          <div className="panel-content" style={{ padding: 0 }}>
            {arrivals.length === 0 ? (
              <div className="no-flights">No arrivals match filters</div>
            ) : (
              <List
                height={window.innerHeight - 300} // Approximate available height
                itemCount={arrivals.length}
                itemSize={64} // Height of FlightRow + gap/padding (approx)
                width="100%"
              >
                {({ index, style }: { index: number, style: React.CSSProperties }) => (
                  <div style={{ ...style, padding: '0 16px' }}>
                    <FlightRow 
                      flightData={arrivals[index]} 
                      type="ARRIVAL" 
                      onClick={setSelectedFlight} 
                    />
                  </div>
                )}
              </List>
            )}
          </div>
        </div>

        </div>
        </div>

        <div className="leaderboard-sidebar">
          <DelayRiskLeaderboard />
        </div>
      </div>

      {/* Detail Panel Drawer */}
      {isDetailPanelOpen && selectedFlightId && (
        <FlightDetailPanel flightId={selectedFlightId} />
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className="toast">
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
};
