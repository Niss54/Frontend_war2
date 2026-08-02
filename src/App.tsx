import { useAirportData } from './context/AirportContext'
import { CommandHeader } from './components/layout/CommandHeader'
import './App.css'

function App() {
  const { store, derivedData, isLoading, error } = useAirportData();

  if (isLoading) return <div className="loading">Loading 8 datasets (PapaParse parallel)...</div>;
  if (error) return <div className="error">Error loading data: {error}</div>;
  if (!store || !derivedData) return <div className="error">No data loaded</div>;

  return (
    <>
      <CommandHeader />
      <div className="dashboard-demo">
      <h1>Universal CSV Data Architecture Engine</h1>
      <p>All 8 Datasets Parsed and Unified in React Context</p>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Flights</h3>
          <p>{derivedData.totalFlights}</p>
        </div>
        <div className="stat-card">
          <h3>Total Passengers</h3>
          <p>{derivedData.totalPassengers.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>On-Time Rate</h3>
          <p>{derivedData.overallOnTimeRate}%</p>
        </div>
        <div className="stat-card">
          <h3>Avg Delay</h3>
          <p>{derivedData.avgDelayMinutes} mins</p>
        </div>
        <div className="stat-card">
          <h3>Baggage Recon.</h3>
          <p>{derivedData.baggageSummary.loadedPercent}%</p>
        </div>
        <div className="stat-card">
          <h3>Active Alerts</h3>
          <p>{derivedData.activeAlerts.length}</p>
        </div>
      </div>

      <h2>DataStore Validation</h2>
      <pre className="validation-pre">
        {JSON.stringify({
          datasetsLoaded: {
            flights: store.flights.length,
            gateEvents: store.gateEvents.length,
            baggage: store.baggage.length,
            passengers: store.passengers.length,
            securityScreenings: store.securityScreenings.length,
            maintenanceLogs: store.maintenanceLogs.length,
            staffShifts: store.staffShifts.length,
            retailTransactions: store.retailTransactions.length,
          }
        }, null, 2)}
      </pre>
    </div>
    </>
  )
}

export default App
