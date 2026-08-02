import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AirportProvider } from './context/AirportContext'
import { SimulationProvider } from './context/SimulationContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AirportProvider>
        <SimulationProvider>
          <App />
        </SimulationProvider>
      </AirportProvider>
    </BrowserRouter>
  </StrictMode>,
)
