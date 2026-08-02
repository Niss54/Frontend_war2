import { Routes, Route, Navigate } from 'react-router-dom';
import { useAirportData } from './context/AirportContext';
import { CommandHeader } from './components/layout/CommandHeader';
import { FlightOpsBoard } from './components/flights/FlightOpsBoard';
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
        {/* Future routes will be added here */}
        <Route path="*" element={<div style={{padding: '20px', color: '#fff'}}>Module in development</div>} />
      </Routes>
    </>
  )
}

export default App
