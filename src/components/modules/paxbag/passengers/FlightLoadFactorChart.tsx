import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Flight } from '../../../../types/airport';

interface FlightLoadFactorChartProps {
  flights: Flight[];
  currentTime: Date;
}

export const FlightLoadFactorChart: React.FC<FlightLoadFactorChartProps> = ({ flights, currentTime }) => {
  const navigate = useNavigate();

  const activeFlights = useMemo(() => {
    const now = currentTime.getTime();
    return flights
      .filter(f => f.status !== 'Departed' && f.status !== 'Arrived' && f.status !== 'Cancelled')
      .filter(f => {
        const dep = new Date(f.scheduled_departure).getTime();
        return dep >= now - 60 * 60000 && dep <= now + 12 * 60 * 60 * 1000;
      })
      .sort((a, b) => new Date(a.scheduled_departure).getTime() - new Date(b.scheduled_departure).getTime());
  }, [flights, currentTime]);

  return (
    <div className="load-factor-container">
      <h3>Passenger Load Factor by Flight</h3>
      <div className="chart-scroll">
        {activeFlights.map(f => {
          const lf = Number(f.load_factor) * 100; // Assuming load_factor is 0-1 or 0-100? Data has load_factor e.g., 0.85
          // Let's check: if it's already > 1, maybe it's 85. If < 1, multiply by 100
          const pct = lf <= 1.0 && lf > 0 ? lf * 100 : lf;
          
          let color = 'green';
          if (pct > 95) color = 'red';
          else if (pct >= 80) color = 'amber';

          return (
            <div 
              key={f.flight_id} 
              className="lf-row" 
              onClick={() => navigate(`/flights?search=${f.flight_id}`)}
              title="Click to view flight details"
            >
              <div className="lf-label">{f.flight_id} ({f.destination})</div>
              <div className="lf-bar-wrapper">
                <div className={`lf-bar ${color}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
              </div>
              <div className={`lf-value ${pct > 100 ? 'overbooked' : ''}`}>
                {Math.round(pct)}%
              </div>
            </div>
          );
        })}
        {activeFlights.length === 0 && <div style={{color: '#8b92a5', fontStyle: 'italic', padding: '16px'}}>No upcoming flights</div>}
      </div>
    </div>
  );
};
