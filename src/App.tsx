import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAirportData } from './context/AirportContext';
import { FilterProvider } from './context/FilterContext';
import { CommandHeader } from './components/core/layout/CommandHeader';
import { CommandPalette } from './components/core/ui/CommandPalette';
import { OpsLogTicker } from './components/core/ui/OpsLogTicker';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ErrorBoundary } from './components/core/layout/ErrorBoundary';
import { PanelSkeleton } from './components/core/layout/PanelSkeleton';
import './App.css';

// Lazy load all major panels
const FlightOpsBoard = React.lazy(() => import('./components/modules/flights/FlightOpsBoard').then(m => ({ default: m.FlightOpsBoard })));
const GatePanel = React.lazy(() => import('./components/modules/gates/GatePanel').then(m => ({ default: m.GatePanel })));
const PaxBagOperations = React.lazy(() => import('./components/modules/paxbag/PaxBagOperations').then(m => ({ default: m.PaxBagOperations })));
const OpsSupport = React.lazy(() => import('./components/modules/ops/OpsSupport').then(m => ({ default: m.OpsSupport })));
const RetailPanel = React.lazy(() => import('./components/modules/retail/RetailPanel').then(m => ({ default: m.RetailPanel })));

const GlobalShortcuts: React.FC = () => {
  useKeyboardShortcuts();
  return null;
};

function App() {
  const { store, derivedData, isLoading, error, loadProgress } = useAirportData();

  if (isLoading) {
    return (
      <div className="loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>INITIALIZING ENGINE</div>
        <div style={{ width: '300px', height: '10px', background: '#1e1e2e', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{ width: `${loadProgress}%`, height: '100%', background: '#4A9EFF', transition: 'width 0.3s ease' }}></div>
        </div>
        <div style={{ fontSize: '14px', color: '#8b92a5' }}>Loading 8 datasets (PapaParse parallel)... {loadProgress}%</div>
      </div>
    );
  }
  
  if (error) return <div className="error">Error loading data: {error}</div>;
  if (!store || !derivedData) return <div className="error">No data loaded</div>;

  return (
    <FilterProvider>
      <GlobalShortcuts />
      <CommandHeader />
      <CommandPalette />
      <div className="app-content">
        <ErrorBoundary fallbackMessage="The routing module crashed.">
          <Suspense fallback={<PanelSkeleton />}>
            <Routes>
              <Route path="/" element={<Navigate to="/flights" replace />} />
              <Route path="/flights" element={
                <ErrorBoundary fallbackMessage="Flight Ops Board is temporarily unavailable.">
                  <FlightOpsBoard />
                </ErrorBoundary>
              } />
              <Route path="/gates" element={
                <ErrorBoundary fallbackMessage="Gate Management is temporarily unavailable.">
                  <GatePanel />
                </ErrorBoundary>
              } />
              <Route path="/baggage" element={
                <ErrorBoundary fallbackMessage="Baggage Operations is temporarily unavailable.">
                  <PaxBagOperations defaultTab="baggage" />
                </ErrorBoundary>
              } />
              <Route path="/passengers" element={
                <ErrorBoundary fallbackMessage="Passenger Flow is temporarily unavailable.">
                  <PaxBagOperations defaultTab="passengers" />
                </ErrorBoundary>
              } />
              <Route path="/security" element={
                <ErrorBoundary fallbackMessage="Security View is temporarily unavailable.">
                  <OpsSupport defaultTab="security" />
                </ErrorBoundary>
              } />
              <Route path="/staff" element={
                <ErrorBoundary fallbackMessage="Staff View is temporarily unavailable.">
                  <OpsSupport defaultTab="staff" />
                </ErrorBoundary>
              } />
              <Route path="/maintenance" element={
                <ErrorBoundary fallbackMessage="Maintenance View is temporarily unavailable.">
                  <OpsSupport defaultTab="maintenance" />
                </ErrorBoundary>
              } />
              <Route path="/retail" element={
                <ErrorBoundary fallbackMessage="Retail Analytics is temporarily unavailable.">
                  <RetailPanel />
                </ErrorBoundary>
              } />
              <Route path="*" element={<div style={{padding: '20px', color: '#fff'}}>Module in development</div>} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
      <OpsLogTicker />
    </FilterProvider>
  )
}

export default App
