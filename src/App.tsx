import { Routes, Route, Navigate } from 'react-router-dom';
import { useAirportData } from './context/AirportContext';
import { FilterProvider } from './context/FilterContext';
import { CommandHeader } from './components/layout/CommandHeader';
import { FlightOpsBoard } from './components/flights/FlightOpsBoard';
import { GatePanel } from './components/gates/GatePanel';
import { PaxBagOperations } from './components/paxbag/PaxBagOperations';
import { OpsSupport } from './components/ops/OpsSupport';
import { RetailPanel } from './components/retail/RetailPanel';
import { FlightDetailPanel } from './components/flights/FlightDetailPanel';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import './App.css';

// A small component to initialize the global keyboard shortcuts
const GlobalShortcuts: React.FC = () => {
  // Pass a dummy function for toggleAlertPanel since it's controlled locally in CommandHeader for now.
  // Ideally, CommandHeader state would move to context, but we will just simulate a click on the bell.
  useKeyboardShortcuts(() => {
    const btn = document.querySelector('.alert-bell-btn') as HTMLButtonElement;
    if (btn) btn.click();
  });
  return null;
};

function App() {
  const { store, derivedData, isLoading, error } = useAirportData();

  if (isLoading) return <div className="loading">Loading 8 datasets (PapaParse parallel)...</div>;
  if (error) return <div className="error">Error loading data: {error}</div>;
  if (!store || !derivedData) return <div className="error">No data loaded</div>;

  return (
    <FilterProvider>
      <GlobalShortcuts />
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
      <FlightDetailPanel />
    </FilterProvider>
  )
}

export default App
