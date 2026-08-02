import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Plane, Grid, Luggage, Shield, Users, ShoppingBag } from 'lucide-react';
import { useAirportData } from '../../context/AirportContext';
import { useSimulation } from '../../context/SimulationContext';
import { getActiveFlights } from '../../utils/airportUtils';
import { useCountUp } from '../../hooks/useCountUp';
import './CommandHeader.css';

// Component for individual KPI Tile
const KPITile = ({ 
  label, 
  value, 
  subtext,
  trend,
  colorClass
}: { 
  label: string, 
  value: number, 
  subtext?: string,
  trend?: 'up' | 'down' | 'neutral',
  colorClass?: string
}) => {
  const animatedValue = useCountUp(value, 2000);
  
  return (
    <div className="kpi-tile">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value-container">
        <span className={`kpi-number ${colorClass || ''}`}>
          {animatedValue.toLocaleString()}
        </span>
      </div>
      {subtext && <div className="kpi-subtext">{subtext}</div>}
      {trend && (
        <div className={`kpi-trend ${trend}`}>
          {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '▬'}
        </div>
      )}
    </div>
  );
};

export const CommandHeader: React.FC = () => {
  const { store, derivedData } = useAirportData();
  const { currentTime, isPlaying, togglePlay, speed, setSpeed } = useSimulation();
  
  // Real-time live clock (Zone A)
  const [liveTime, setLiveTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute KPIs dynamically based on simulation time
  const kpis = useMemo(() => {
    if (!store) return null;
    
    const todayStr = currentTime.toISOString().split('T')[0];
    
    // 1. Flights Today
    const flightsToday = store.flights.filter(f => 
      f.scheduled_departure?.startsWith(todayStr) || f.scheduled_arrival?.startsWith(todayStr)
    );
    const totalFlights = flightsToday.length;
    const deptCount = flightsToday.filter(f => f.scheduled_departure?.startsWith(todayStr)).length;
    const arrCount = flightsToday.filter(f => f.scheduled_arrival?.startsWith(todayStr)).length;
    
    // 2. On-Time %
    const onTimeFlights = flightsToday.filter(f => Number(f.delay_minutes) === 0).length;
    const onTimePct = totalFlights > 0 ? Math.round((onTimeFlights / totalFlights) * 100) : 100;
    
    // 3 & 4. Active Flights & Pax in Terminal
    const activeFlights = getActiveFlights(store.flights, currentTime);
    const activeGates = new Set(activeFlights.map(f => f.gate).filter(Boolean)).size;
    const paxInTerminal = activeFlights.reduce((sum, f) => sum + (Number(f.pax_count) || 0), 0);
    
    // 5. Security Wait (Avg mins for screenings within last 2 hours of sim time)
    const recentScreenings = store.securityScreenings.filter(s => {
      const t = new Date(s.screening_time).getTime();
      const now = currentTime.getTime();
      return t <= now && t >= now - 2 * 60 * 60 * 1000;
    });
    const avgSecurityWait = recentScreenings.length > 0 
      ? Math.round((recentScreenings.reduce((sum, s) => sum + (Number(s.wait_time_seconds) || 0), 0) / recentScreenings.length) / 60)
      : 5; // Fallback
      
    // 6. Open Incidents
    const activeAlerts = derivedData?.activeAlerts || [];
    // Just count critical/high alerts for demo purposes as open incidents
    const openIncidents = activeAlerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length;

    return {
      totalFlights, deptCount, arrCount,
      onTimePct,
      activeGates,
      paxInTerminal,
      avgSecurityWait,
      openIncidents,
      recentAlerts: activeAlerts.slice(0, 3)
    };
  }, [store, currentTime, derivedData]);

  // Color thresholds
  const getOnTimeColor = (pct: number) => {
    if (pct > 80) return 'green';
    if (pct >= 60) return 'amber';
    return 'red';
  };

  const getSecurityColor = (wait: number) => {
    if (wait < 10) return 'green';
    if (wait <= 20) return 'amber';
    return 'red';
  };

  const hasCriticalAlerts = kpis?.openIncidents ? kpis.openIncidents > 0 : false;

  return (
    <>
      <header className="command-header">
        {/* ZONE A - Identity & Live Clock */}
        <div className="zone-a">
          <div className="airport-id">
            <span className="icao-code">VIDP</span>
            <span className="airport-name">Indira Gandhi Intl</span>
          </div>
          
          <div className="live-clock-container">
            <div className="live-clock">
              {liveTime.toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Kolkata' })} IST
            </div>
            <div className="live-date">
              {liveTime.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
            </div>
          </div>
          
          <div className="ops-status">
            <div className={`badge ${hasCriticalAlerts ? 'alert' : 'nominal'}`}>
              <div className={`dot ${hasCriticalAlerts ? 'alert' : 'nominal'}`}></div>
              {hasCriticalAlerts ? 'ALERT' : 'NOMINAL'}
            </div>
          </div>
        </div>

        {/* ZONE B - Real-Time KPIs */}
        <div className="zone-b">
          <KPITile 
            label="FLIGHTS TODAY" 
            value={kpis?.totalFlights || 0} 
            subtext={`${kpis?.deptCount || 0} dept / ${kpis?.arrCount || 0} arr`}
          />
          <KPITile 
            label="ON-TIME %" 
            value={kpis?.onTimePct || 0} 
            colorClass={getOnTimeColor(kpis?.onTimePct || 0)}
            trend="up"
          />
          <KPITile 
            label="ACTIVE GATES" 
            value={kpis?.activeGates || 0} 
          />
          <KPITile 
            label="PAX IN TERMINAL" 
            value={kpis?.paxInTerminal || 0} 
          />
          <KPITile 
            label="SECURITY WAIT" 
            value={kpis?.avgSecurityWait || 0} 
            subtext="minutes avg"
            colorClass={getSecurityColor(kpis?.avgSecurityWait || 0)}
            trend="neutral"
          />
          <KPITile 
            label="OPEN INCIDENTS" 
            value={kpis?.openIncidents || 0} 
            colorClass={kpis?.openIncidents && kpis.openIncidents > 0 ? 'pulse-red' : 'green'}
          />
        </div>

        {/* ZONE C - Ticker & Nav */}
        <div className="zone-c">
          <div className="ticker-container">
            <div className="ticker-content">
              {kpis?.recentAlerts?.map((a, i) => (
                <span key={i} className="ticker-item">⚠️ {a.message}</span>
              ))}
              {!kpis?.recentAlerts?.length && <span className="ticker-item">SYSTEM NOMINAL — NO ACTIVE ALERTS</span>}
            </div>
          </div>
          
          <div className="nav-links">
            <a href="#flights" className="nav-btn active">
              <Plane size={16} />
              <span className="nav-label">FL</span>
            </a>
            <a href="#gates" className="nav-btn">
              <Grid size={16} />
              <span className="nav-label">GA</span>
            </a>
            <a href="#baggage" className="nav-btn">
              <Luggage size={16} />
              <span className="nav-label">BG</span>
            </a>
            <a href="#security" className="nav-btn">
              <Shield size={16} />
              <span className="nav-label">SC</span>
            </a>
            <a href="#staff" className="nav-btn">
              <Users size={16} />
              <span className="nav-label">ST</span>
            </a>
            <a href="#retail" className="nav-btn">
              <ShoppingBag size={16} />
              <span className="nav-label">RT</span>
            </a>
          </div>
        </div>
      </header>

      {/* Simulation Controls Group (Positioned absolutely or floating) */}
      <div className="sim-controls">
        <div className="sim-time">
          SIM: {currentTime.toISOString().replace('T', ' ').substring(0, 19)}
        </div>
        <button className="sim-btn" onClick={togglePlay} title="Play/Pause">
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <select 
          className="sim-speed" 
          value={speed} 
          onChange={(e) => setSpeed(Number(e.target.value))}
        >
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={5}>5x</option>
          <option value={10}>10x</option>
          <option value={100}>100x</option>
        </select>
      </div>
    </>
  );
};
