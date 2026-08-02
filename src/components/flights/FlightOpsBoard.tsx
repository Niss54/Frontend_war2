import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAirportData } from '../../context/AirportContext';
import { useSimulation } from '../../context/SimulationContext';
import { FlightRow } from './FlightRow';
import { eventBus, FLIGHT_STATUS_CHANGED } from '../../utils/EventBus';
import './FlightOpsBoard.css';

interface Toast {
  id: number;
  message: string;
}

export const FlightOpsBoard: React.FC = () => {
  const { flightIndex, isLoading, error } = useAirportData();
  const { currentTime } = useSimulation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [toasts, setToasts] = useState<Toast[]>([]);
  let toastIdCounter = useRef(0);

  // Search & Filter state from URL
  const searchQuery = searchParams.get('q') || '';
  const filterStatus = searchParams.get('status') || 'ALL';
  const filterTerminal = searchParams.get('terminal') || 'ALL';
  const filterAirline = searchParams.get('airline') || 'ALL';
  const sortBy = searchParams.get('sort') || 'time';

  // Available options
  const allFlights = Array.from(flightIndex.values());
  const airlines = ['ALL', ...new Set(allFlights.map(f => f.flight.airline_code))].sort();
  const terminals = ['ALL', 'T1', 'T2', 'T3'];
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

  const updateParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'ALL') newParams.set(key, value);
    else newParams.delete(key);
    setSearchParams(newParams);
  };

  // Process flights (Filter & Sort)
  const processedFlights = useMemo(() => {
    let filtered = allFlights;

    // Apply active window filter (Flights for today or active)
    const todayStr = currentTime.toISOString().split('T')[0];
    filtered = filtered.filter(f => 
      f.flight.scheduled_departure?.startsWith(todayStr) || 
      f.flight.scheduled_arrival?.startsWith(todayStr)
    );

    // Apply URL Filters
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(f => 
        f.flight.flight_id.toLowerCase().includes(q) ||
        f.flight.destination.toLowerCase().includes(q) ||
        f.flight.origin.toLowerCase().includes(q) ||
        f.flight.airline.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(f => f.flight.status === filterStatus);
    }
    if (filterTerminal !== 'ALL') {
      filtered = filtered.filter(f => f.flight.terminal === filterTerminal);
    }
    if (filterAirline !== 'ALL') {
      filtered = filtered.filter(f => f.flight.airline_code === filterAirline);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'time') {
        const timeA = new Date(a.flight.scheduled_departure || a.flight.scheduled_arrival).getTime();
        const timeB = new Date(b.flight.scheduled_departure || b.flight.scheduled_arrival).getTime();
        return timeA - timeB;
      }
      if (sortBy === 'status') return (a.flight.status || '').localeCompare(b.flight.status || '');
      if (sortBy === 'gate') return (a.flight.gate || '').localeCompare(b.flight.gate || '');
      return 0;
    });

    return filtered;
  }, [allFlights, searchQuery, filterStatus, filterTerminal, filterAirline, sortBy, currentTime]);

  const departures = processedFlights.filter(f => !!f.flight.scheduled_departure && f.flight.origin === 'DEL');
  const arrivals = processedFlights.filter(f => !!f.flight.scheduled_arrival && f.flight.destination === 'DEL');

  const handleRowClick = (flightId: string) => {
    // Stub for AW-10
    console.log('Open detail panel for', flightId);
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
            onChange={(e) => updateParam('q', e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-middle">
          <div className="filter-group">
            <span className="filter-label">Status</span>
            <select value={filterStatus} onChange={(e) => updateParam('status', e.target.value)}>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Terminal</span>
            <select value={filterTerminal} onChange={(e) => updateParam('terminal', e.target.value)}>
              {terminals.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Airline</span>
            <select value={filterAirline} onChange={(e) => updateParam('airline', e.target.value)}>
              {airlines.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div className="filter-right">
          <span className="filter-label">Sort</span>
          <select value={sortBy} onChange={(e) => updateParam('sort', e.target.value)}>
            <option value="time">Time</option>
            <option value="status">Status</option>
            <option value="gate">Gate</option>
          </select>
        </div>
      </div>

      {/* Main Board Panels */}
      <div className="board-panels">
        
        {/* Departures Panel (55%) */}
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
          <div className="panel-content">
            {departures.map(uf => (
              <FlightRow 
                key={uf.flight.flight_id} 
                flightData={uf} 
                type="DEPARTURE" 
                onClick={handleRowClick} 
              />
            ))}
            {departures.length === 0 && <div className="no-flights">No departures match filters</div>}
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
          <div className="panel-content">
            {arrivals.map(uf => (
              <FlightRow 
                key={uf.flight.flight_id} 
                flightData={uf} 
                type="ARRIVAL" 
                onClick={handleRowClick} 
              />
            ))}
            {arrivals.length === 0 && <div className="no-flights">No arrivals match filters</div>}
          </div>
        </div>

      </div>

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
