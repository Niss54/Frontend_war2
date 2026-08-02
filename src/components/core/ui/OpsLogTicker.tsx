import React, { useState, useEffect, useRef } from 'react';
import { useSimulation } from '../../../context/SimulationContext';
import { 
  eventBus, 
  FLIGHT_STATUS_CHANGED, 
  INCIDENT_CREATED, 
  SECURITY_QUEUE_UPDATE, 
  GATE_EVENT_FIRED,
  SIMULATION_TICK,
} from '../../../utils/EventBus';
import type {
  FlightStatusPayload,
  IncidentPayload,
  SecurityQueuePayload,
  TickPayload
} from '../../../utils/EventBus';
import './OpsLogTicker.css';

interface LogMessage {
  id: string;
  text: React.ReactNode;
  timestamp: number; // to guarantee unique keys across re-renders
}

export const OpsLogTicker: React.FC = () => {
  const { currentTime } = useSimulation();
  const timeRef = useRef<Date>(currentTime);
  const [messages, setMessages] = useState<LogMessage[]>([]);

  // Update time ref on tick so event handlers always have the latest simulation time
  useEffect(() => {
    const handleTick = (payload: TickPayload) => {
      timeRef.current = payload.currentTime;
    };
    eventBus.on(SIMULATION_TICK, handleTick);
    return () => eventBus.off(SIMULATION_TICK, handleTick);
  }, []);

  // Update timeRef from context as fallback
  useEffect(() => {
    timeRef.current = currentTime;
  }, [currentTime]);

  const addMessage = (text: React.ReactNode) => {
    setMessages(prev => {
      const newMsg: LogMessage = {
        id: Math.random().toString(36).substring(2, 9),
        text,
        timestamp: Date.now()
      };
      const updated = [newMsg, ...prev];
      if (updated.length > 50) {
        return updated.slice(0, 50);
      }
      return updated;
    });
  };

  const formatTime = (d: Date) => {
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  useEffect(() => {
    const handleFlightStatus = (payload: FlightStatusPayload) => {
      const t = formatTime(timeRef.current);
      addMessage(`${t} — ${payload.flight_id} is now ${payload.newStatus} at Gate ${payload.gate || 'TBD'}`);
    };

    const handleIncident = (payload: IncidentPayload) => {
      const t = formatTime(timeRef.current);
      addMessage(
        <>
          {t} — <span className="ops-ticker-alert-span">ALERT: {payload.message}</span>
        </>
      );
    };

    const handleSecurity = (payload: SecurityQueuePayload) => {
      if (payload.waitTime > 15) {
        const t = formatTime(timeRef.current);
        addMessage(`${t} — Security CP${payload.checkpointId}: ${payload.waitTime}min wait`);
      }
    };

    const handleGateEvent = (payload: { gateId: string, eventType: string }) => {
      const t = formatTime(timeRef.current);
      addMessage(`${t} — Gate ${payload.gateId}: ${payload.eventType}`);
    };

    eventBus.on(FLIGHT_STATUS_CHANGED, handleFlightStatus);
    eventBus.on(INCIDENT_CREATED, handleIncident);
    eventBus.on(SECURITY_QUEUE_UPDATE, handleSecurity);
    eventBus.on(GATE_EVENT_FIRED, handleGateEvent);

    return () => {
      eventBus.off(FLIGHT_STATUS_CHANGED, handleFlightStatus);
      eventBus.off(INCIDENT_CREATED, handleIncident);
      eventBus.off(SECURITY_QUEUE_UPDATE, handleSecurity);
      eventBus.off(GATE_EVENT_FIRED, handleGateEvent);
    };
  }, []);

  return (
    <div className="ops-log-ticker">
      <div className="ops-ticker-left">
        <div className="ops-live-dot"></div>
        <div className="ops-live-text">LIVE OPS</div>
      </div>
      
      <div className="ops-ticker-center">
        <div className="ops-ticker-content">
          {messages.length === 0 ? (
            <span className="ops-ticker-message" style={{ color: '#8b92a5' }}>
              Waiting for operational events...
            </span>
          ) : (
            messages.map((msg, idx) => (
              <React.Fragment key={msg.id}>
                <span className="ops-ticker-message">{msg.text}</span>
                {idx < messages.length - 1 && <span className="ops-ticker-spacer">·</span>}
              </React.Fragment>
            ))
          )}
        </div>
      </div>
      
      <div className="ops-ticker-right">
        <div className="ops-msg-count">{messages.length} msgs</div>
        <button className="ops-clear-btn" onClick={() => setMessages([])}>
          CLEAR
        </button>
      </div>
    </div>
  );
};
