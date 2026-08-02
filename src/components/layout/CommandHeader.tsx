import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Play, Pause, Plane, Grid, Luggage, Shield, Users, ShoppingBag, Bell, Search } from 'lucide-react';
import { useAirportData } from '../../context/AirportContext';
import { useSimulation } from '../../context/SimulationContext';
import { useFilter } from '../../context/FilterContext';
import { getActiveFlights } from '../../utils/airportUtils';
import { useCountUp } from '../../hooks/useCountUp';
import { AlertPanel } from '../alerts/AlertPanel';
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

const NAV_ITEMS = [
  { to: '/flights', icon: Plane, label: 'FL' },
  { to: '/gates', icon: Grid, label: 'GA' },
  { to: '/baggage', icon: Luggage, label: 'BG' },
  { to: '/security', icon: Shield, label: 'SC' },
  { to: '/staff', icon: Users, label: 'ST' },
  { to: '/maintenance', icon: ShoppingBag, label: 'RT' },
];

const NavLinks: React.FC = () => {
  const location = useLocation();
  return (
    <div className="nav-links">
      {NAV_ITEMS.map(item => (
        <Link
          key={item.to}
          to={item.to}
          className={`nav-btn ${location.pathname === item.to ? 'active' : ''}`}
        >
          <item.icon size={16} />
          <span className="nav-label">{item.label}</span>
        </Link>
      ))}
    </div>
  );
};

export const CommandHeader: React.FC = () => {
  const { store } = useAirportData();
  const { currentTime, isPlaying, togglePlay, speed, setSpeed, alerts } = useSimulation();
  const { searchQuery, setSearchQuery } = useFilter();
  
  const [isAlertPanelOpen, setIsAlertPanelOpen] = useState(false);
  
  // Real-time live clock (Zone A)
  const [liveTime, setLiveTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);
  const criticalAlertsCount = unacknowledgedAlerts.filter(a => a.severity === 'CRITICAL').length;
  const hasCriticalAlerts = criticalAlertsCount > 0;

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
    const openIncidents = unacknowledgedAlerts.length;

    return {
      totalFlights, deptCount, arrCount,
      onTimePct,
      activeGates,
      paxInTerminal,
      avgSecurityWait,
      openIncidents,
      recentAlerts: unacknowledgedAlerts.slice(0, 3)
    };
  }, [store, currentTime, unacknowledgedAlerts]);

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
          <div className="ticker-container" style={{ flex: 1, overflow: 'hidden' }}>
            <div className="ticker-content">
              {kpis?.recentAlerts?.map((a, i) => (
                <span key={i} className="ticker-item">⚠️ {a.message}</span>
              ))}
              {!kpis?.recentAlerts?.length && <span className="ticker-item">SYSTEM NOMINAL — NO ACTIVE ALERTS</span>}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Global Search Bar */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: '8px', color: '#8b92a5' }} />
              <input 
                id="global-search"
                type="text" 
                placeholder="Search flight, origin... (Press F)" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: '#12121a',
                  border: '1px solid #1e1e2e',
                  color: '#fff',
                  padding: '4px 8px 4px 28px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  width: '180px',
                  outline: 'none'
                }}
              />
            </div>
            
            <NavLinks />
            <button 
              className={`icon-btn alert-bell-btn ${hasCriticalAlerts ? 'has-critical' : unacknowledgedAlerts.length > 0 ? 'has-alerts' : ''}`}
              onClick={() => setIsAlertPanelOpen(!isAlertPanelOpen)}
              title="Operations Intelligence Alerts"
              style={{
                background: hasCriticalAlerts ? '#FF336620' : 'transparent',
                border: hasCriticalAlerts ? '1px solid #FF3366' : '1px solid transparent',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                color: hasCriticalAlerts ? '#FF3366' : '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <Bell size={20} />
              {unacknowledgedAlerts.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: '#FF3366',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '2px 6px',
                  borderRadius: '10px'
                }}>
                  {unacknowledgedAlerts.length}
                </span>
              )}
            </button>
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
      
      <AlertPanel isOpen={isAlertPanelOpen} onClose={() => setIsAlertPanelOpen(false)} />
    </>
  );
};
