import React from 'react';
import { useAirportData } from '../../../../context/AirportContext';
import { useSimulation } from '../../../../context/SimulationContext';
import { PassengerFunnel } from './PassengerFunnel';
import { FlightLoadFactorChart } from './FlightLoadFactorChart';
import './PassengerPanel.css';

export const PassengerPanel: React.FC = () => {
  const { store } = useAirportData();
  const { currentTime } = useSimulation();

  if (!store) return null;

  return (
    <div className="passenger-panel">
      <PassengerFunnel 
        passengers={store.passengers}
        flights={store.flights}
        securityScreenings={store.securityScreenings}
        currentTime={currentTime}
      />
      <FlightLoadFactorChart 
        flights={store.flights}
        currentTime={currentTime}
      />
    </div>
  );
};
