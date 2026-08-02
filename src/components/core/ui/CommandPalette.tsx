import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, Grid, Luggage, Shield, ShoppingBag, Bell, Activity } from 'lucide-react';
import { useCommandPalette } from '../../../hooks/useCommandPalette';
import { useAirportData } from '../../../context/AirportContext';
import { useFlightFilter } from '../../../hooks/useFlightFilter';
import { useFilter } from '../../../context/FilterContext';
import { useSimulation } from '../../../context/SimulationContext';
import './CommandPalette.css';

interface BaseItem {
  id: string;
  label: string;
  group: 'FLIGHT' | 'SECTION' | 'ACTION' | 'RECENT';
  itemType: 'FLIGHT' | 'SECTION' | 'ACTION';
}

interface FlightItem extends BaseItem {
  itemType: 'FLIGHT';
  flightId: string;
  destination: string;
  status: string;
}

interface SectionItem extends BaseItem {
  itemType: 'SECTION';
  path?: string;
  action?: string;
  icon: React.ElementType;
}

interface ActionItem extends BaseItem {
  itemType: 'ACTION';
  action: string;
}

type PaletteItem = FlightItem | SectionItem | ActionItem;

const SECTIONS: SectionItem[] = [
  { id: 'sec-flights', itemType: 'SECTION', group: 'SECTION', label: 'Flights Board', path: '/flights', icon: Plane },
  { id: 'sec-gates', itemType: 'SECTION', group: 'SECTION', label: 'Gate Intelligence', path: '/gates', icon: Grid },
  { id: 'sec-baggage', itemType: 'SECTION', group: 'SECTION', label: 'Baggage & Passengers', path: '/baggage', icon: Luggage },
  { id: 'sec-security', itemType: 'SECTION', group: 'SECTION', label: 'Security & Staff', path: '/security', icon: Shield },
  { id: 'sec-retail', itemType: 'SECTION', group: 'SECTION', label: 'Retail Intelligence', path: '/retail', icon: ShoppingBag },
  { id: 'sec-alerts', itemType: 'SECTION', group: 'SECTION', label: 'Operations Alerts', action: 'toggleAlerts', icon: Bell },
];

const ACTIONS: ActionItem[] = [
  { id: 'act-sim', itemType: 'ACTION', group: 'ACTION', label: 'Toggle Simulation', action: 'toggleSim' },
  { id: 'act-speed', itemType: 'ACTION', group: 'ACTION', label: 'Set Speed 10x', action: 'speed10' },
  { id: 'act-report', itemType: 'ACTION', group: 'ACTION', label: 'Generate Handover Report', action: 'handover' },
  { id: 'act-clear', itemType: 'ACTION', group: 'ACTION', label: 'Clear All Filters', action: 'clearFilters' },
];

export const CommandPalette: React.FC = () => {
  const { isOpen, setIsOpen } = useCommandPalette();
  const navigate = useNavigate();
  const { flightIndex } = useAirportData();
  const { setSelectedFlight } = useFlightFilter();
  const { clearAllFilters } = useFilter();
  const { togglePlay, setSpeed } = useSimulation();

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [recentItems, setRecentItems] = useState<PaletteItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      try {
        const stored = localStorage.getItem('recent_palette_items');
        if (stored) {
          setRecentItems(JSON.parse(stored));
        }
      } catch (e) {}
    }
  }, [isOpen]);

  const saveRecent = (item: PaletteItem) => {
    try {
      let current = [...recentItems];
      current = current.filter(i => i.id !== item.id);
      current.unshift({ ...item, group: 'RECENT' });
      current = current.slice(0, 5);
      setRecentItems(current);
      localStorage.setItem('recent_palette_items', JSON.stringify(current));
    } catch (e) {}
  };

  const results = React.useMemo(() => {
    if (!query.trim()) return recentItems;
    
    const q = query.toLowerCase();
    
    // 1. Flights
    const flightResults: FlightItem[] = [];
    if (flightIndex.size > 0) {
      for (const [id, uf] of flightIndex.entries()) {
        const f = uf.flight;
        if (id.toLowerCase().includes(q) || 
            f.destination.toLowerCase().includes(q) || 
            f.airline.toLowerCase().includes(q)) {
          flightResults.push({
            id: `fl-${id}`,
            itemType: 'FLIGHT',
            group: 'FLIGHT',
            label: id,
            flightId: id,
            destination: f.destination,
            status: f.status
          });
          if (flightResults.length >= 8) break;
        }
      }
    }

    // 2. Sections
    const sectionResults = SECTIONS.filter(s => s.label.toLowerCase().includes(q));
    
    // 3. Actions
    const actionResults = ACTIONS.filter(a => a.label.toLowerCase().includes(q));

    return [...flightResults, ...sectionResults, ...actionResults];
  }, [query, flightIndex, recentItems]);

  // Keep active index in bounds
  useEffect(() => {
    if (activeIndex >= results.length) {
      setActiveIndex(Math.max(0, results.length - 1));
    }
  }, [results.length, activeIndex]);

  const executeItem = (item: PaletteItem) => {
    saveRecent(item);
    
    if (item.itemType === 'FLIGHT') {
      const fItem = item as FlightItem;
      navigate(`/flights?q=`); // ensure we are on flights
      setTimeout(() => setSelectedFlight(fItem.flightId), 50);
    } 
    else if (item.itemType === 'SECTION') {
      const sItem = item as SectionItem;
      if (sItem.path) navigate(sItem.path);
      else if (sItem.action === 'toggleAlerts') {
        const btn = document.querySelector('.alert-bell-btn') as HTMLButtonElement;
        if (btn) btn.click();
      }
    }
    else if (item.itemType === 'ACTION') {
      const aItem = item as ActionItem;
      switch (aItem.action) {
        case 'toggleSim': togglePlay(); break;
        case 'speed10': setSpeed(10); break;
        case 'clearFilters': clearAllFilters(); navigate('/flights'); break;
        case 'handover': alert('Handover report generated.'); break;
      }
    }
    
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[activeIndex]) {
        executeItem(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.querySelector('.cp-item.active') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  const getStatusColor = (status: string) => {
    if (status === 'DELAYED') return 'red';
    if (status === 'SCHEDULED') return 'amber';
    return 'green';
  };

  if (!isOpen) return null;

  // Grouping for rendering
  const groups: Record<string, PaletteItem[]> = {};
  results.forEach(r => {
    if (!groups[r.group]) groups[r.group] = [];
    groups[r.group].push(r);
  });

  return (
    <div className="command-palette-overlay" onClick={() => setIsOpen(false)}>
      <AnimatePresence>
        <motion.div 
          className="command-palette-modal"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            className="cp-search-input"
            placeholder="Search flights, sections, actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck="false"
          />
          
          <div className="cp-results-container" ref={containerRef}>
            {results.length === 0 && query.trim() !== '' && (
              <div className="cp-empty-state">No results found for "{query}"</div>
            )}
            
            {['RECENT', 'FLIGHT', 'SECTION', 'ACTION'].map(groupName => {
              const groupItems = groups[groupName];
              if (!groupItems || groupItems.length === 0) return null;
              
              return (
                <div key={groupName}>
                  <div className="cp-group-header">{groupName}</div>
                  {groupItems.map(item => {
                    const globalIdx = results.findIndex(r => r.id === item.id);
                    const isActive = globalIdx === activeIndex;
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`cp-item ${isActive ? 'active' : ''}`}
                        onMouseEnter={() => setActiveIndex(globalIdx)}
                        onClick={() => executeItem(item)}
                      >
                        <div className="cp-item-icon">
                          {('icon' in item && item.icon) ? (
                            React.createElement(item.icon as React.ElementType, { size: 16 })
                          ) : item.itemType === 'FLIGHT' ? (
                            <Plane size={16} />
                          ) : (
                            <Activity size={16} />
                          )}
                        </div>
                        <div className="cp-item-label">
                          {item.itemType === 'FLIGHT' ? (
                            <>
                              <span className="cp-item-monospace">{item.label}</span>
                              <span style={{ color: '#8b92a5', margin: '0 8px' }}>→</span>
                              {(item as FlightItem).destination}
                            </>
                          ) : (
                            item.label
                          )}
                        </div>
                        {item.itemType === 'FLIGHT' && (
                          <div className={`cp-item-status ${getStatusColor((item as FlightItem).status)}`}>
                            {(item as FlightItem).status}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
