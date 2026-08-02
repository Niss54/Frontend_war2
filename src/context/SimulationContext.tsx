import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAirportData } from './AirportContext';
import { SimulationEngine } from '../engine/SimulationEngine';
import { eventBus, SIMULATION_TICK, TickPayload } from '../utils/EventBus';

interface SimulationContextValue {
  currentTime: Date;
  isPlaying: boolean;
  speed: number;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  setTime: (time: Date) => void;
}

const SimulationContext = createContext<SimulationContextValue>({
  currentTime: new Date('2024-11-11T06:00:00'),
  isPlaying: false,
  speed: 1,
  togglePlay: () => {},
  setSpeed: () => {},
  setTime: () => {},
});

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const { store } = useAirportData();
  const engine = useRef(SimulationEngine.getInstance());
  
  const [currentTime, setCurrentTime] = useState(new Date('2024-11-11T06:00:00'));
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  
  const [isEngineInitialized, setIsEngineInitialized] = useState(false);

  // Initialize engine when store is loaded
  useEffect(() => {
    if (store && !isEngineInitialized) {
      engine.current.init(store);
      setCurrentTime(engine.current.getCurrentTime());
      setIsEngineInitialized(true);
    }
  }, [store, isEngineInitialized]);

  // Listen to engine ticks
  useEffect(() => {
    const handleTick = (payload: TickPayload) => {
      setCurrentTime(payload.currentTime);
    };
    eventBus.on(SIMULATION_TICK, handleTick);
    return () => eventBus.off(SIMULATION_TICK, handleTick);
  }, []);

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

  const value = {
    currentTime,
    isPlaying,
    speed,
    togglePlay,
    setSpeed: handleSetSpeed,
    setTime: setCurrentTime,
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
