import React, { useState, useMemo } from 'react';
import { useAirportData } from '../../context/AirportContext';
import { useSimulation } from '../../context/SimulationContext';
import { BaggagePipeline } from './BaggagePipeline';
import { BaggageReconciliation } from './BaggageReconciliation';
import './BaggagePanel.css';

export const BaggagePanel: React.FC = () => {
  const { store } = useAirportData();
  const { currentTime } = useSimulation();
  const [filter, setFilter] = useState('');

  const bags = useMemo(() => {
    if (!store) return [];
    const now = currentTime.getTime();
    
    // Process bags for the table
    return store.baggage.map(b => {
      const status = String(b.status).toLowerCase();
      const loc = String(b.location).toLowerCase();
      let stage = '';

      if (status === 'delivered') stage = 'DEPARTED';
      else if (status === 'loaded' || loc === 'aircraft') {
        const flight = store.flights.find(f => f.flight_id === b.flight_id);
        if (flight?.status === 'Departed' || flight?.status === 'Airborne') stage = 'DEPARTED';
        else stage = 'AIRCRAFT HOLD';
      }
      else if (loc === 'ramp') stage = 'LOADING BAY';
      else if (loc === 'belt') stage = 'SORT FACILITY';
      else if (status === 'in transit') stage = 'SECURITY SCAN';
      else stage = 'CHECK-IN';

      const lastUpdate = new Date(b.last_update).getTime();
      const timeInStageMins = Math.round(Math.max(0, now - lastUpdate) / 60000);

      let riskLevel = 'normal';
      if (status === 'missing' || status === 'damaged' || Number(b.damage_count) > 0) {
        riskLevel = 'red';
      } else if (stage === 'SECURITY SCAN') {
        const flight = store.flights.find(f => f.flight_id === b.flight_id);
        if (flight && flight.scheduled_departure) {
          const depTime = new Date(flight.scheduled_departure).getTime();
          const minsToDep = (depTime - now) / 60000;
          if (minsToDep > 0 && minsToDep < 45) {
            riskLevel = 'amber';
          }
        }
      }

      return { ...b, stage, timeInStageMins, riskLevel };
    }).sort((a, b) => b.timeInStageMins - a.timeInStageMins); // Sort descending
  }, [store, currentTime]);

  const filteredBags = useMemo(() => {
    if (!filter) return bags;
    const f = filter.toLowerCase();
    return bags.filter(b => 
      b.bag_id.toLowerCase().includes(f) || 
      b.flight_id.toLowerCase().includes(f) ||
      b.status.toLowerCase().includes(f)
    );
  }, [bags, filter]);

  if (!store) return null;

  return (
    <div className="baggage-panel">
      <BaggagePipeline 
        baggage={store.baggage} 
        flights={store.flights} 
        currentTime={currentTime} 
      />
      
      <div className="baggage-lower">
        <div className="baggage-table-container">
          <div className="baggage-controls">
            <input 
              type="text" 
              className="bag-filter" 
              placeholder="Filter by Bag ID, Flight, or Status..." 
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
            <span style={{color: '#8b92a5', fontSize: '12px', alignSelf: 'center'}}>
              Showing {filteredBags.length} of {bags.length} bags
            </span>
          </div>
          
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bag ID</th>
                  <th>Flight</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Last Scan</th>
                  <th>Time in Stage</th>
                </tr>
              </thead>
              <tbody>
                {filteredBags.slice(0, 100).map((b) => (
                  <tr key={b.bag_id} className={`risk-${b.riskLevel}`}>
                    <td style={{fontWeight: 'bold', color: b.riskLevel === 'red' ? '#ff3366' : '#fff'}}>
                      {b.bag_id} {b.riskLevel === 'red' && '⚠️'}
                    </td>
                    <td>{b.flight_id}</td>
                    <td>{b.status}</td>
                    <td>{b.stage}</td>
                    <td>{new Date(b.last_update).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{fontWeight: 'bold'}}>{b.timeInStageMins}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <BaggageReconciliation 
          flights={store.flights} 
          baggage={store.baggage} 
          currentTime={currentTime} 
        />
      </div>
    </div>
  );
};
