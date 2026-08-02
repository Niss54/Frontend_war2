import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAirportData } from '../../../context/AirportContext';
import { eventBus, SIMULATION_TICK } from '../../../utils/EventBus';
import type { TickPayload } from '../../../utils/EventBus';
import type { UnifiedFlight } from '../../../types/unified';
import './DelayRiskLeaderboard.css';

interface RiskBreakdown {
  gate: number;
  maintenance: number;
  history: number;
}

interface RankedFlight {
  uf: UnifiedFlight;
  breakdown: RiskBreakdown;
}

export const DelayRiskLeaderboard: React.FC = () => {
  const { flightIndex, store } = useAirportData();
  const [topFlights, setTopFlights] = useState<RankedFlight[]>([]);
  const lastUpdate = useRef<number>(0);

  // Initial render population
  useEffect(() => {
    if (flightIndex && flightIndex.size > 0 && topFlights.length === 0) {
      updateLeaderboard();
    }
  }, [flightIndex]);

  useEffect(() => {
    const handleTick = (payload: TickPayload) => {
      const now = payload.currentTime.getTime();
      // Update every 30 sim-seconds
      if (now - lastUpdate.current >= 30000) {
        lastUpdate.current = now;
        updateLeaderboard();
      }
    };

    eventBus.on(SIMULATION_TICK, handleTick);
    return () => {
      eventBus.off(SIMULATION_TICK, handleTick);
    };
  }, [flightIndex, store]);

  const updateLeaderboard = () => {
    if (!flightIndex || !store) return;

    // Filter to active/departing flights (not arrived/cancelled) that have some risk
    const flights = Array.from(flightIndex.values())
      .filter(uf => {
        const status = uf.flight.status.toUpperCase();
        return status !== 'ARRIVED' && status !== 'CANCELLED' && status !== 'DEPARTED';
      })
      .sort((a, b) => b.delayRiskScore - a.delayRiskScore)
      .slice(0, 10);

    const ranked = flights.map(uf => {
      // Re-calculate the 3 components for the tooltip
      // 1. Gate Conflict
      const conflictEvents = uf.gateEvents.filter(e => e.is_conflict);
      const gatePts = Math.min(conflictEvents.length * 25, 100) * 0.4;
      
      // 2. Maintenance
      const openMaint = uf.maintenanceItems.filter(m => !m.resolved_at || m.resolved_at === '');
      let maintScore = 0;
      for (const m of openMaint) {
        maintScore += (Number(m.severity) || 1) * 10;
      }
      const maintPts = Math.min(maintScore, 100) * 0.3;

      // 3. History
      const delayMins = Number(uf.flight.delay_minutes) || 0;
      let delayScore = 0;
      if (delayMins > 120) delayScore = 100;
      else if (delayMins > 60) delayScore = 80;
      else if (delayMins > 30) delayScore = 60;
      else if (delayMins > 15) delayScore = 40;
      else if (delayMins > 0) delayScore = 20;
      const historyPts = delayScore * 0.3;

      return {
        uf,
        breakdown: {
          gate: Math.round(gatePts),
          maintenance: Math.round(maintPts),
          history: Math.round(historyPts)
        }
      };
    });

    setTopFlights(ranked);
  };

  const getColorClass = (score: number) => {
    if (score > 70) return 'red';
    if (score >= 40) return 'amber';
    return 'green';
  };

  return (
    <div className="delay-leaderboard">
      <div className="delay-leaderboard-header">
        <h3 className="delay-leaderboard-title">
          DELAY RISK INTELLIGENCE
          <div className="leaderboard-pulse-dot"></div>
        </h3>
        <div className="delay-leaderboard-subtitle">
          AI-POWERED · UPDATES EVERY 30s
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <ul className="delay-leaderboard-list">
          <AnimatePresence>
            {topFlights.map((rf, idx) => {
              const { uf, breakdown } = rf;
              const f = uf.flight;
              const colorClass = getColorClass(uf.delayRiskScore);
              const isBoarding = f.status.toUpperCase() === 'BOARDING' || f.status.toUpperCase() === 'FINAL_BOARDING';

              return (
                <motion.li
                  key={f.flight_id}
                  layout
                  layoutId={f.flight_id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="delay-leaderboard-item"
                >
                  <div className={`lb-rank ${colorClass}`}>
                    #{idx + 1}
                  </div>
                  
                  <div className="lb-flight-info">
                    <div className="lb-flight-id-row">
                      <span className="lb-flight-id">{f.flight_id}</span>
                      {isBoarding && (
                        <span className="lb-boarding-badge">BOARDING</span>
                      )}
                    </div>
                    <div className="lb-destination">{f.destination}</div>
                  </div>

                  <div className="lb-score-area">
                    <div className="lb-progress-bg">
                      <div 
                        className={`lb-progress-fill ${colorClass}`} 
                        style={{ width: `${uf.delayRiskScore}%` }}
                      ></div>
                    </div>
                    <div className={`lb-score-text ${colorClass}`}>
                      {uf.delayRiskScore}
                    </div>
                  </div>

                  <div className="lb-tooltip">
                    <div className="lb-tooltip-grid">
                      <div className="lb-tooltip-col">
                        <span className="lb-tooltip-label">Gate Conflict</span>
                        <span className="lb-tooltip-value">{breakdown.gate} pts</span>
                      </div>
                      <div className="lb-tooltip-col">
                        <span className="lb-tooltip-label">Maintenance</span>
                        <span className="lb-tooltip-value">{breakdown.maintenance} pts</span>
                      </div>
                      <div className="lb-tooltip-col">
                        <span className="lb-tooltip-label">History</span>
                        <span className="lb-tooltip-value">{breakdown.history} pts</span>
                      </div>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
};
