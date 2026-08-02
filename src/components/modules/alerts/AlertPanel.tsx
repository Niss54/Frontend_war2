import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSimulation } from '../../../context/SimulationContext';
import { Brain, X, CheckCircle, Navigation } from 'lucide-react';
import './AlertPanel.css';

interface AlertPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlertPanel: React.FC<AlertPanelProps> = ({ isOpen, onClose }) => {
  const { alerts, acknowledgeAlert, dismissAlert } = useSimulation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>('ALL');

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'ALL') return !a.acknowledged;
    if (filter === 'ACKNOWLEDGED') return a.acknowledged;
    return a.severity === filter && !a.acknowledged;
  });

  const getAlertIcon = (severity: string) => {
    if (severity === 'CRITICAL') return '🚨';
    if (severity === 'HIGH') return '⚠️';
    if (severity === 'MEDIUM') return '⚡';
    return 'ℹ️';
  };

  const handleNavigate = (flightId?: string) => {
    if (flightId) {
      navigate(`/flights?search=${flightId}`);
      onClose();
    }
  };

  return (
    <div className={`alert-panel-overlay ${isOpen ? 'open' : ''}`}>
      <div className="alert-header">
        <div className="alert-title-row">
          <div className="alert-title">
            <Brain size={18} />
            OPERATIONS INTELLIGENCE
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="alert-subtitle">
          <span>Monitoring 8 data sources</span>
          <span style={{color: '#fff', fontWeight: 'bold'}}>{alerts.filter(a => !a.acknowledged).length} Active Alerts</span>
        </div>
      </div>

      <div className="alert-filters">
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'ACKNOWLEDGED'].map(f => (
          <button 
            key={f}
            className={`alert-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="alert-list">
        <AnimatePresence>
          {filteredAlerts.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ textAlign: 'center', color: '#8b92a5', padding: '40px 20px', fontStyle: 'italic' }}
            >
              No active alerts matching criteria. Systems nominal.
            </motion.div>
          )}
          
          {filteredAlerts.map(alert => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className={`alert-card ${alert.severity}`}
            >
              <div className="alert-card-header">
                <span className="alert-type-badge">
                  {getAlertIcon(alert.severity)} {alert.type.replace('_', ' ')}
                </span>
                <span className="alert-time">
                  {alert.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <div className="alert-message">{alert.message}</div>
              
              <div className="alert-actions">
                {alert.flight_id && (
                  <button className="btn-alert" onClick={() => handleNavigate(alert.flight_id)}>
                    <Navigation size={12} style={{marginRight: '4px', verticalAlign: 'middle'}}/>
                    VIEW FLIGHT
                  </button>
                )}
                
                {!alert.acknowledged && (
                  <button className="btn-alert primary" onClick={() => acknowledgeAlert(alert.id)}>
                    <CheckCircle size={12} style={{marginRight: '4px', verticalAlign: 'middle'}}/>
                    ACKNOWLEDGE
                  </button>
                )}
                
                {alert.severity !== 'CRITICAL' && !alert.acknowledged && (
                  <button className="btn-alert" onClick={() => dismissAlert(alert.id)}>
                    DISMISS
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
