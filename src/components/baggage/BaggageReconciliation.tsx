import React, { useMemo, useState } from 'react';
import type { Baggage, Flight } from '../../types/airport';
import { getBaggageReconciliation } from '../../utils/airportUtils';

interface BaggageReconciliationProps {
  flights: Flight[];
  baggage: Baggage[];
  currentTime: Date;
}

export const BaggageReconciliation: React.FC<BaggageReconciliationProps> = ({ flights, baggage, currentTime }) => {
  // Only show active/upcoming flights
  const activeFlights = useMemo(() => {
    return flights
      .filter(f => f.status !== 'Departed' && f.status !== 'Arrived' && f.status !== 'Cancelled')
      .sort((a, b) => new Date(a.scheduled_departure).getTime() - new Date(b.scheduled_departure).getTime());
  }, [flights, currentTime]);

  const [selectedFlightId, setSelectedFlightId] = useState<string>(activeFlights[0]?.flight_id || '');

  const { recon, missingBags } = useMemo(() => {
    const flightBags = baggage.filter(b => b.flight_id === selectedFlightId);
    const recon = getBaggageReconciliation(flightBags);
    const missingBags = flightBags.filter(b => {
      const st = String(b.status).toLowerCase();
      return st === 'missing' || (st !== 'loaded' && st !== 'delivered');
    });
    return { recon, missingBags };
  }, [selectedFlightId, baggage]);

  const color = recon.rate >= 98 ? '#00FF88' : recon.rate >= 90 ? '#FFB800' : '#FF3366';
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (recon.rate / 100) * circumference;

  return (
    <div className="recon-widget">
      <div className="recon-header">
        <h3>Reconciliation (Clear to Depart)</h3>
        <select 
          className="flight-selector" 
          value={selectedFlightId} 
          onChange={e => setSelectedFlightId(e.target.value)}
        >
          {activeFlights.map(f => (
            <option key={f.flight_id} value={f.flight_id}>
              {f.flight_id} - {f.destination}
            </option>
          ))}
        </select>
      </div>

      <div className="dial-container">
        <svg width="150" height="150" viewBox="0 0 150 150">
          <circle cx="75" cy="75" r={radius} fill="none" stroke="#1e1e2e" strokeWidth="12" />
          <circle 
            cx="75" cy="75" r={radius} 
            fill="none" 
            stroke={color} 
            strokeWidth="12" 
            strokeDasharray={circumference} 
            strokeDashoffset={isNaN(strokeDashoffset) ? circumference : strokeDashoffset} 
            strokeLinecap="round" 
            transform="rotate(-90 75 75)"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="dial-text">
          <div className="dial-pct">{isNaN(recon.rate) ? 0 : Math.round(recon.rate)}%</div>
          <div className="dial-sub">LOADED</div>
        </div>
      </div>

      <div className="recon-stats">
        <div className="recon-stat-item">
          <span className="r-value">{recon.total}</span>
          <span className="r-label">Total Bags</span>
        </div>
        <div className="recon-stat-item">
          <span className="r-value" style={{color: '#00FF88'}}>{recon.loaded}</span>
          <span className="r-label">Loaded</span>
        </div>
        <div className="recon-stat-item">
          <span className="r-value missing">{recon.missing}</span>
          <span className="r-label">Missing</span>
        </div>
      </div>

      <button className="clear-depart-btn" disabled={recon.rate < 98 || recon.total === 0}>
        Clear To Depart
      </button>

      {missingBags.length > 0 && (
        <div className="missing-list">
          <h4>Unreconciled Bags ({missingBags.length})</h4>
          {missingBags.slice(0, 5).map(b => (
            <div key={b.bag_id} className="missing-bag">
              <span>{b.bag_id}</span>
              <span style={{color: '#8b92a5'}}>{b.location || 'Unknown'}</span>
            </div>
          ))}
          {missingBags.length > 5 && (
            <div style={{fontSize: '10px', color: '#8b92a5', textAlign: 'center'}}>
              + {missingBags.length - 5} more
            </div>
          )}
        </div>
      )}
    </div>
  );
};
