import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAirportData } from './AirportContext';
import { SimulationEngine } from '../engine/SimulationEngine';
import { AlertEngine } from '../engine/AlertEngine';
import { eventBus, SIMULATION_TICK } from '../utils/EventBus';
import type { TickPayload } from '../utils/EventBus';
import type { Alert } from '../types/airport';

interface SimulationContextValue {
  currentTime: Date;
  isPlaying: boolean;
  speed: number;
  alerts: Alert[];
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  setTime: (time: Date) => void;
  acknowledgeAlert: (id: string) => void;
  dismissAlert: (id: string) => void;
}

const SimulationContext = createContext<SimulationContextValue>({
  currentTime: new Date('2024-11-11T06:00:00'),
  isPlaying: false,
  speed: 1,
  alerts: [],
  togglePlay: () => {},
  setSpeed: () => {},
  setTime: () => {},
  acknowledgeAlert: () => {},
  dismissAlert: () => {},
});

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const { store } = useAirportData();
  const engine = useRef(SimulationEngine.getInstance());
  const alertEngine = useRef(AlertEngine.getInstance());
  
  const [currentTime, setCurrentTime] = useState(new Date('2024-11-11T06:00:00'));
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  const [isEngineInitialized, setIsEngineInitialized] = useState(false);

  // Initialize engine when store is loaded
  useEffect(() => {
    if (store && !isEngineInitialized) {
      engine.current.init(store);
      setCurrentTime(engine.current.getCurrentTime());
      setIsEngineInitialized(true);
      
      // Run initial scan
      const initialAlerts = alertEngine.current.scanAnomalies(store, engine.current.getCurrentTime());
      if (initialAlerts.length > 0) {
        setAlerts(prev => [...initialAlerts, ...prev]);
      }
    }
  }, [store, isEngineInitialized]);

  // Listen to engine ticks
  useEffect(() => {
    const handleTick = (payload: TickPayload) => {
      setCurrentTime(payload.currentTime);
      if (store) {
        const newAlerts = alertEngine.current.scanAnomalies(store, payload.currentTime);
        if (newAlerts.length > 0) {
          setAlerts(prev => [...newAlerts, ...prev].sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()));
        }
      }
    };
    eventBus.on(SIMULATION_TICK, handleTick);
    return () => eventBus.off(SIMULATION_TICK, handleTick);
  }, [store]);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => {
      const next = !prev;
      if (next) engine.current.play();
      else engine.current.pause();
      return next;
    });
  }, []);

  const handleSetSpeed = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    engine.current.setSpeed(newSpeed);
  }, []);

  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const value = {
    currentTime,
    isPlaying,
    speed,
    alerts,
    togglePlay,
    setSpeed: handleSetSpeed,
    setTime: setCurrentTime,
    acknowledgeAlert,
    dismissAlert,
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  return useContext(SimulationContext);
}
