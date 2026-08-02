// src/context/AirportContext.tsx
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { AirportContextValue } from '../types/unified';
import type { DataStore, FlightIndex, GateIndex, TimelineIndex, DerivedOpsData } from '../types/unified';
import { loadAllDatasets, buildFlightIndex, buildGateIndex, buildTimelineIndex } from '../data/csvLoader';
import { computeDerivedOpsData } from '../data/derivedOpsData';

const AirportContext = createContext<AirportContextValue>({
  store: null,
  flightIndex: new Map(),
  gateIndex: new Map(),
  timelineIndex: new Map(),
  derivedData: null,
  isLoading: true,
  error: null,
});

export function AirportProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<DataStore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all datasets on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await loadAllDatasets();
        if (!cancelled) {
          setStore(data);
          console.log('[AirportContext] Data loaded successfully:', {
            flights: data.flights.length,
            gateEvents: data.gateEvents.length,
            baggage: data.baggage.length,
            passengers: data.passengers.length,
            security: data.securityScreenings.length,
            maintenance: data.maintenanceLogs.length,
            staff: data.staffShifts.length,
            retail: data.retailTransactions.length,
          });
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load airport data';
          setError(message);
          console.error('[AirportContext] Load error:', err);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Build indices with useMemo to avoid re-joining on every render
  const flightIndex = useMemo<FlightIndex>(() => {
    if (!store) return new Map();
    console.time('[AirportContext] buildFlightIndex');
    const idx = buildFlightIndex(store);
    console.timeEnd('[AirportContext] buildFlightIndex');
    return idx;
  }, [store]);

  const gateIndex = useMemo<GateIndex>(() => {
    if (!store) return new Map();
    return buildGateIndex(store);
  }, [store]);

  const timelineIndex = useMemo<TimelineIndex>(() => {
    if (!store) return new Map();
    return buildTimelineIndex(store);
  }, [store]);

  const derivedData = useMemo<DerivedOpsData | null>(() => {
    if (!store || flightIndex.size === 0) return null;
    console.time('[AirportContext] computeDerivedOpsData');
    const data = computeDerivedOpsData(store, flightIndex);
    console.timeEnd('[AirportContext] computeDerivedOpsData');
    return data;
  }, [store, flightIndex]);

  const value: AirportContextValue = {
    store,
    flightIndex,
    gateIndex,
    timelineIndex,
    derivedData,
    isLoading,
    error,
  };

  return (
    <AirportContext.Provider value={value}>
      {children}
    </AirportContext.Provider>
  );
}

/**
 * Hook to access the airport data context.
 * Must be used within an <AirportProvider>.
 */
export function useAirportData(): AirportContextValue {
  const context = useContext(AirportContext);
  if (!context) {
    throw new Error('useAirportData must be used within an AirportProvider');
  }
  return context;
}

export default AirportContext;
