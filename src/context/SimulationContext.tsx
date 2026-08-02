import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
  // Start simulation at a known active date from the dataset
  const [currentTime, setCurrentTime] = useState(new Date('2024-11-11T06:00:00'));
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!isPlaying) return;

    let lastTick = performance.now();
    let animationFrame: number;

    const tick = (now: number) => {
      const deltaMs = now - lastTick;
      lastTick = now;

      // Increment time by real time delta * speed
      setCurrentTime(prev => new Date(prev.getTime() + deltaMs * speed));
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, speed]);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const value = {
    currentTime,
    isPlaying,
    speed,
    togglePlay,
    setSpeed,
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
