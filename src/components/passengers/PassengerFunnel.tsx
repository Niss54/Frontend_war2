import React, { useMemo } from 'react';
import type { Passenger, Flight, SecurityScreening } from '../../types/airport';

interface PassengerFunnelProps {
  passengers: Passenger[];
  flights: Flight[];
  securityScreenings: SecurityScreening[];
  currentTime: Date;
}

export const PassengerFunnel: React.FC<PassengerFunnelProps> = ({ passengers, flights, securityScreenings, currentTime }) => {
  const { counts, bottleneck } = useMemo(() => {
    const now = currentTime.getTime();
    
    // 1. ARRIVED: Total pax for flights departing in the next 4 hours
    const activeFlights = flights.filter(f => {
      const dep = new Date(f.scheduled_departure).getTime();
      return dep > now && dep <= now + 4 * 60 * 60 * 1000;
    });
    
    const activeFlightIds = new Set(activeFlights.map(f => f.flight_id));
    
    // Filter passengers to only those on active flights
    const activePax = passengers.filter(p => activeFlightIds.has(p.flight_id));
    
    const counts = {
      arrived: activePax.length,
      checkedIn: 0,
      security: 0,
      gate: 0,
      boarded: 0
    };

    if (counts.arrived === 0) return { counts, bottleneck: '' };

    // Create a fast lookup for security exit times
    const securityMap = new Map<string, number>();
    securityScreenings.forEach(s => {
      if (s.queue_exit_time) {
        securityMap.set(s.pnr, new Date(s.queue_exit_time).getTime());
      }
    });

    activePax.forEach(p => {
      let isCheckedIn = false;
      let atGate = false;

      // Check In
      if (p.checkin_time && new Date(p.checkin_time).getTime() <= now) {
        isCheckedIn = true;
        counts.checkedIn++;
      }

      // Security
      if (isCheckedIn) {
        const exitTime = securityMap.get(p.pnr);
        if (exitTime && exitTime <= now) {
          counts.security++;
          
          // Heuristic for Gate: 10 mins after security exit
          if (now >= exitTime + 10 * 60000) {
            atGate = true;
            counts.gate++;
          }
        }
      }

      // Boarded
      if (atGate && p.boarding_time && new Date(p.boarding_time).getTime() <= now) {
        counts.boarded++;
      }
    });

    // Determine bottleneck based on dropoff percentage
    const dropoffs = [
      { stage: 'checkedIn', drop: counts.arrived > 0 ? (counts.arrived - counts.checkedIn) / counts.arrived : 0 },
      { stage: 'security', drop: counts.checkedIn > 0 ? (counts.checkedIn - counts.security) / counts.checkedIn : 0 },
      { stage: 'gate', drop: counts.security > 0 ? (counts.security - counts.gate) / counts.security : 0 },
    ];
    
    let bottleneck = '';
    let maxDrop = 0;
    dropoffs.forEach(d => {
      if (d.drop > maxDrop && d.drop > 0.3) { // more than 30% drop is a bottleneck
        maxDrop = d.drop;
        bottleneck = d.stage;
      }
    });

    return { counts, bottleneck };
  }, [passengers, flights, securityScreenings, currentTime]);

  const getPct = (val: number, prev: number) => {
    if (prev === 0) return 0;
    return Math.round((val / prev) * 100);
  };

  return (
    <div className="funnel-container">
      <h3>Passenger Journey Funnel</h3>
      <div className="funnel-flow">
        <FunnelStage 
          label="EXPECTED (4HR)" 
          count={counts.arrived} 
          pct={100} 
        />
        <FunnelStage 
          label="CHECKED IN" 
          count={counts.checkedIn} 
          pct={getPct(counts.checkedIn, counts.arrived)} 
          status={bottleneck === 'checkedIn' ? 'bottleneck' : ''}
        />
        <FunnelStage 
          label="THROUGH SECURITY" 
          count={counts.security} 
          pct={getPct(counts.security, counts.checkedIn)} 
          status={bottleneck === 'security' ? 'critical' : ''}
        />
        <FunnelStage 
          label="AT GATE" 
          count={counts.gate} 
          pct={getPct(counts.gate, counts.security)} 
          status={bottleneck === 'gate' ? 'bottleneck' : ''}
        />
        <FunnelStage 
          label="BOARDED" 
          count={counts.boarded} 
          pct={getPct(counts.boarded, counts.gate)} 
        />
      </div>
    </div>
  );
};

const FunnelStage = ({ label, count, pct, status = '' }: { label: string, count: number, pct: number, status?: string }) => (
  <div className="funnel-stage">
    <div className={`funnel-box ${status}`}>
      <div className="funnel-pct">{pct}%</div>
      <div className="funnel-count">{count}</div>
      <div className="funnel-label">{label}</div>
    </div>
  </div>
);
