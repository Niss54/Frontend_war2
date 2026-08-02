import React, { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { SplitFlapText } from '../ui/SplitFlapText';
import { eventBus, FLIGHT_STATUS_CHANGED } from '../../utils/EventBus';
import type { UnifiedFlight } from '../../types/unified';
import './FlightRow.css';

interface FlightRowProps {
  flightData: UnifiedFlight;
  type: 'DEPARTURE' | 'ARRIVAL';
  onClick: (flightId: string) => void;
}

const FlightRowComponent: React.FC<FlightRowProps> = ({ flightData, type, onClick }) => {
  const f = flightData.flight;
  // Local state for status to allow EventBus updates without full board re-render
  const [status, setStatus] = useState(f.status || 'SCHEDULED');
  
  useEffect(() => {
    const handleStatusChange = (payload: { flight_id: string, newStatus: string }) => {
      if (payload.flight_id === f.flight_id) {
        setStatus(payload.newStatus);
      }
    };
    eventBus.on(FLIGHT_STATUS_CHANGED, handleStatusChange);
    return () => eventBus.off(FLIGHT_STATUS_CHANGED, handleStatusChange);
  }, [f.flight_id]);

  // Determine row style based on status
  let rowClass = 'flight-row';
  if (status === 'DELAYED') rowClass += ' delayed';
  else if (status === 'BOARDING') rowClass += ' boarding';
  else if (status === 'DEPARTED' || status === 'ARRIVED') rowClass += ' departed fade-out';
  else if (status === 'CANCELLED') rowClass += ' cancelled';

  // Format time
  const time = type === 'DEPARTURE' ? f.scheduled_departure : f.scheduled_arrival;
  const actualTime = type === 'DEPARTURE' ? f.actual_departure : f.actual_arrival;
  const timeStr = time ? new Date(time).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '--:--';
  const actualTimeStr = actualTime ? new Date(actualTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '--:--';

  const isDelayed = Number(f.delay_minutes) > 0;

  // Risk indicator
  const risk = flightData.delayRiskScore;
  let RiskIcon = CheckCircle;
  let riskColor = '#00FF88'; // green
  if (risk >= 70) {
    RiskIcon = AlertCircle;
    riskColor = '#FF3366'; // red
  } else if (risk >= 40) {
    RiskIcon = AlertTriangle;
    riskColor = '#FFB300'; // amber
  }

  // Location string (Dest for Departure, Origin for Arrival)
  const location = type === 'DEPARTURE' ? f.destination : f.origin;

  return (
    <div className={rowClass} onClick={() => onClick(f.flight_id)}>
      <div className="fr-dot-col">
        <div className={`status-dot ${status.toLowerCase()}`}></div>
      </div>
      <div className="fr-flight-col">
        <SplitFlapText value={f.flight_id} minLength={7} className="flight-split-flap" />
      </div>
      <div className="fr-airline-col">{f.airline_code}</div>
      <div className="fr-dest-col">{location}</div>
      <div className="fr-time-col">{timeStr}</div>
      <div className={`fr-est-col ${isDelayed ? 'delayed-text' : ''}`}>
        {actualTimeStr !== timeStr ? actualTimeStr : ''}
      </div>
      <div className="fr-gate-col">
        <a href={`?gate=${f.gate}`} onClick={(e) => e.stopPropagation()} className="gate-link">{f.gate || '--'}</a>
      </div>
      <div className="fr-term-col">{f.terminal || '--'}</div>
      <div className="fr-status-col">
        <SplitFlapText value={status} minLength={9} className="status-split-flap" />
      </div>
      <div className="fr-risk-col" title={`Delay Risk: ${risk}% - Maintenance/Gate history`}>
        <RiskIcon size={14} color={riskColor} />
      </div>
    </div>
  );
};

// Custom comparison function for memoization
export const FlightRow = React.memo(FlightRowComponent, (prevProps, nextProps) => {
  return prevProps.flightData.flight.flight_id === nextProps.flightData.flight.flight_id && 
         prevProps.type === nextProps.type &&
         prevProps.flightData.flight.status === nextProps.flightData.flight.status;
});
