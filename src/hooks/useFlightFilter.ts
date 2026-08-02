import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useAirportData } from '../context/AirportContext';
import { useSimulation } from '../context/SimulationContext';

export function useFlightFilter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { flightIndex } = useAirportData();
  const { currentTime } = useSimulation();

  const selectedFlightId = searchParams.get('flight');
  const isDetailPanelOpen = !!selectedFlightId;
  const statusFilter = searchParams.get('status') || 'ALL';
  const terminalFilter = searchParams.get('terminal') || 'ALL';
  const airlineFilter = searchParams.get('airline') || 'ALL';
  const searchQuery = searchParams.get('q') || '';
  const sortBy = searchParams.get('sort') || 'time';

  const updateParam = (key: string, value: string | null) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      return newParams;
    }, { replace: true });
  };

  const setSelectedFlight = (id: string | null) => updateParam('flight', id);
  const clearFlight = () => updateParam('flight', null);

  const filteredFlights = useMemo(() => {
    if (flightIndex.size === 0) return [];
    
    let filtered = Array.from(flightIndex.values());
    const nowMs = currentTime.getTime();
    const endMs = nowMs + 24 * 60 * 60 * 1000;
    const pastMs = nowMs - 6 * 60 * 60 * 1000; // Keep flights from last 6 hours too

    // Filter to active window (-6h to +24h)
    filtered = filtered.filter(f => {
      const dep = f.flight.scheduled_departure ? new Date(f.flight.scheduled_departure).getTime() : 0;
      const arr = f.flight.scheduled_arrival ? new Date(f.flight.scheduled_arrival).getTime() : 0;
      return (dep >= pastMs && dep <= endMs) || (arr >= pastMs && arr <= endMs);
    });

    // Apply URL Filters
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(f => 
        f.flight.flight_id.toLowerCase().includes(q) ||
        f.flight.destination.toLowerCase().includes(q) ||
        f.flight.origin.toLowerCase().includes(q) ||
        f.flight.airline.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(f => f.flight.status === statusFilter);
    }
    if (terminalFilter !== 'ALL') {
      filtered = filtered.filter(f => f.flight.terminal === terminalFilter);
    }
    if (airlineFilter !== 'ALL') {
      filtered = filtered.filter(f => f.flight.airline_code === airlineFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'time') {
        const timeA = new Date(a.flight.scheduled_departure || a.flight.scheduled_arrival || 0).getTime();
        const timeB = new Date(b.flight.scheduled_departure || b.flight.scheduled_arrival || 0).getTime();
        return timeA - timeB;
      }
      if (sortBy === 'status') return (a.flight.status || '').localeCompare(b.flight.status || '');
      if (sortBy === 'gate') return (a.flight.gate || '').localeCompare(b.flight.gate || '');
      return 0;
    });

    return filtered;
  }, [flightIndex, searchQuery, statusFilter, terminalFilter, airlineFilter, sortBy, currentTime]);

  const setStatus = (s: string | null) => updateParam('status', s);
  const setTerminal = (t: string | null) => updateParam('terminal', t);
  const setAirline = (a: string | null) => updateParam('airline', a);
  const setSearchQuery = (q: string | null) => updateParam('q', q);

  return {
    selectedFlightId,
    isDetailPanelOpen,
    statusFilter,
    terminalFilter,
    airlineFilter,
    searchQuery,
    setSelectedFlight,
    clearFlight,
    setStatus,
    setTerminal,
    setAirline,
    setSearchQuery,
    filteredFlights
  };
}
