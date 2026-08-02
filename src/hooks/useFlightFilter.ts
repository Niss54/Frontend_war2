import { useMemo } from 'react';
import { useFilter } from '../context/FilterContext';
import { useAirportData } from '../context/AirportContext';

export const useFlightFilter = () => {
  const filterContext = useFilter();
  const { store } = useAirportData();

  const filteredFlights = useMemo(() => {
    if (!store) return [];
    
    return store.flights.filter(f => {
      // 1. Terminal Filter
      if (filterContext.selectedTerminal && f.terminal !== filterContext.selectedTerminal) return false;
      
      // 2. Airline Filter
      if (filterContext.selectedAirline && f.airline_code !== filterContext.selectedAirline) return false;
      
      // 3. Status Filter
      if (filterContext.statusFilter && f.status !== filterContext.statusFilter) return false;
      
      // 4. Search Query (Flight ID, Origin, Destination, Airline)
      if (filterContext.searchQuery) {
        const q = filterContext.searchQuery.toLowerCase();
        const match = 
          f.flight_id.toLowerCase().includes(q) ||
          (f.origin && f.origin.toLowerCase().includes(q)) ||
          (f.destination && f.destination.toLowerCase().includes(q)) ||
          (f.airline && f.airline.toLowerCase().includes(q));
        if (!match) return false;
      }
      
      return true;
    });
  }, [store, filterContext.selectedTerminal, filterContext.selectedAirline, filterContext.statusFilter, filterContext.searchQuery]);

  return {
    ...filterContext,
    filteredFlights
  };
};
