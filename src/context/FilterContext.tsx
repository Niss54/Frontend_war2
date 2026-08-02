import React, { createContext, useContext, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

interface FilterContextType {
  selectedFlightId: string | null;
  setSelectedFlight: (id: string | null) => void;
  selectedTerminal: string | null;
  setTerminal: (t: string | null) => void;
  selectedAirline: string | null;
  setAirline: (a: string | null) => void;
  statusFilter: string | null;
  setStatus: (s: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  clearAllFilters: () => void;
}

const FilterContext = createContext<FilterContextType | null>(null);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedFlightId = searchParams.get('flight');
  const selectedTerminal = searchParams.get('terminal');
  const selectedAirline = searchParams.get('airline');
  const statusFilter = searchParams.get('status');
  const searchQuery = searchParams.get('q') || '';

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
  const setTerminal = (t: string | null) => updateParam('terminal', t);
  const setAirline = (a: string | null) => updateParam('airline', a);
  const setStatus = (s: string | null) => updateParam('status', s);
  const setSearchQuery = (q: string) => updateParam('q', q);

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const value = useMemo(() => ({
    selectedFlightId, setSelectedFlight,
    selectedTerminal, setTerminal,
    selectedAirline, setAirline,
    statusFilter, setStatus,
    searchQuery, setSearchQuery,
    clearAllFilters
  }), [selectedFlightId, selectedTerminal, selectedAirline, statusFilter, searchQuery]);

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (!context) throw new Error('useFilter must be used within FilterProvider');
  return context;
};
