import { Routes, Route, Navigate } from 'react-router-dom';
import { useAirportData } from './context/AirportContext';
import { CommandHeader } from './components/layout/CommandHeader';
import { FlightOpsBoard } from './components/flights/FlightOpsBoard';
import { GatePanel } from './components/gates/GatePanel';
import { PaxBagOperations } from './components/paxbag/PaxBagOperations';
import { OpsSupport } from './components/ops/OpsSupport';
import { RetailPanel } from './components/retail/RetailPanel';
import './App.css';

function App() {
  const { store, derivedData, isLoading, error } = useAirportData();

  if (isLoading) return <div className="loading">Loading 8 datasets (PapaParse parallel)...</div>;
  if (error) return <div className="error">Error loading data: {error}</div>;
  if (!store || !derivedData) return <div className="error">No data loaded</div>;

  return (
    <>
      <CommandHeader />
      <Routes>
        <Route path="/" element={<Navigate to="/flights" replace />} />
        <Route path="/flights" element={<FlightOpsBoard />} />
        <Route path="/gates" element={<GatePanel />} />
        <Route path="/baggage" element={<PaxBagOperations defaultTab="baggage" />} />
        <Route path="/passengers" element={<PaxBagOperations defaultTab="passengers" />} />
        <Route path="/security" element={<OpsSupport defaultTab="security" />} />
        <Route path="/staff" element={<OpsSupport defaultTab="staff" />} />
        <Route path="/maintenance" element={<OpsSupport defaultTab="maintenance" />} />
        <Route path="/retail" element={<RetailPanel />} />
        {/* Future routes will be added here */}
        <Route path="*" element={<div style={{padding: '20px', color: '#fff'}}>Module in development</div>} />
      </Routes>
    </>
  )
}

export default App
