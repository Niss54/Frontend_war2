import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAirportData } from './context/AirportContext';
import { FilterProvider } from './context/FilterContext';
import { CommandHeader } from './components/core/layout/CommandHeader';
import { CommandPalette } from './components/core/ui/CommandPalette';
import { OpsLogTicker } from './components/core/ui/OpsLogTicker';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ErrorBoundary } from './components/core/ui/ErrorBoundary';
import { SkeletonPanel } from './components/core/ui/SkeletonPanel';
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
  const { store, derivedData, isLoading, error } = useAirportData();

  if (isLoading) {
    return (
      <div style={{ height: '100vh', width: '100vw', background: '#050508' }}>
        <SkeletonPanel />
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
        <ErrorBoundary fallbackName="Routing Module">
          <Suspense fallback={<SkeletonPanel />}>
            <Routes>
              <Route path="/" element={<Navigate to="/flights" replace />} />
              <Route path="/flights" element={
                <ErrorBoundary fallbackName="Flight Ops Board">
                  <FlightOpsBoard />
                </ErrorBoundary>
              } />
              <Route path="/gates" element={
                <ErrorBoundary fallbackName="Gate Management">
                  <GatePanel />
                </ErrorBoundary>
              } />
              <Route path="/baggage" element={
                <ErrorBoundary fallbackName="Baggage Operations">
                  <PaxBagOperations defaultTab="baggage" />
                </ErrorBoundary>
              } />
              <Route path="/passengers" element={
                <ErrorBoundary fallbackName="Passenger Flow">
                  <PaxBagOperations defaultTab="passengers" />
                </ErrorBoundary>
              } />
              <Route path="/security" element={
                <ErrorBoundary fallbackName="Security View">
                  <OpsSupport defaultTab="security" />
                </ErrorBoundary>
              } />
              <Route path="/staff" element={
                <ErrorBoundary fallbackName="Staff View">
                  <OpsSupport defaultTab="staff" />
                </ErrorBoundary>
              } />
              <Route path="/maintenance" element={
                <ErrorBoundary fallbackName="Maintenance View">
                  <OpsSupport defaultTab="maintenance" />
                </ErrorBoundary>
              } />
              <Route path="/retail" element={
                <ErrorBoundary fallbackName="Retail Analytics">
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

export default App;
