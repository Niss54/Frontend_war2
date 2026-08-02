<div align="center">

![Frontend War](https://img.shields.io/badge/Frontend_War-2026-black?style=flat-square)
![Year](https://img.shields.io/badge/YEAR-2026-22c55e?style=flat-square)
![Track](https://img.shields.io/badge/TRACK-FRONTEND%20WARS-3b82f6?style=flat-square)
![Domain](https://img.shields.io/badge/DOMAIN-AIRPORT%20OPS-f59e0b?style=flat-square)
![Team](https://img.shields.io/badge/TEAM-SYNTRIX-8b5cf6?style=flat-square)

# ✈️ AeroCommand

### Airport Operations Control Center — VIDP (Indira Gandhi International)

*"5,000 flights. 8 systems. Zero blind spots."*

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=flat-square&logo=vite)](https://vite.dev)
[![Framer Motion](https://img.shields.io/badge/Framer%20Motion-12-FF0055?style=flat-square)](https://www.framer.com/motion/)
[![PapaParse](https://img.shields.io/badge/PapaParse-5.5-00C49F?style=flat-square)](https://www.papaparse.com/)
[![Lucide React](https://img.shields.io/badge/Lucide%20React-1.28-F8C53A?style=flat-square)](https://lucide.dev)

🚀 [Live Demo](#) · 📋 [Documentation](#) · 🐛 [Report Bug](https://github.com/Niss54/Frontend_war2/issues) · 💡 [Request Feature](https://github.com/Niss54/Frontend_war2/issues)

</div>

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Solution Overview](#-solution-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Alert Engine — 8 Cross-Dataset Rules](#-alert-engine--8-cross-dataset-rules)
- [Dataset Coverage](#-dataset-coverage)
- [Module Guide](#-module-guide)
- [Getting Started](#-getting-started)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [Team](#-team)
- [License](#-license)

---

## 🔴 Problem Statement

Modern airports operate 8 deeply interdependent systems simultaneously — flights, gates, baggage, passengers, security, staff, maintenance, and retail — yet most operations software treats each in isolation. When a flight delays, it compresses gate turnaround. That compressed turnaround means bags don't make it through security in time. That security queue spikes passenger wait times. That dwell drop tanks retail revenue. **The cascade happens in minutes. Ops teams see it in hours.**

AeroCommand was built to collapse that lag to zero.

---

## 💡 Solution Overview

AeroCommand is a unified, real-time airport operations control interface that fuses all 8 datasets into a single command-center UI. Built for VIDP (Indira Gandhi International), it runs a live simulation engine that replays the airport day in compressed time — firing cross-dataset alerts automatically as anomalies cascade across systems.

From one screen, an ops controller can monitor every flight, every gate conflict, every bag in transit, every security bottleneck, every staff gap, and every maintenance risk — simultaneously.

---

## ✨ Key Features

### 🕹️ Real-Time Simulation Engine
A fully custom tick-based simulation engine drives the entire interface. Time advances at 1×, 2×, 5×, 10×, or 100× speed. Every second of real time = 1 simulated minute at 1× speed. All KPIs, flight statuses, alerts, and queue data update live as simulation time progresses.

### 📡 Cross-Dataset Cascade Alert Engine
The heart of AeroCommand. An intelligent rule engine continuously scans all 8 datasets every simulation tick and fires typed, severity-ranked alerts the moment multi-system anomalies are detected. Alerts are deduplicated, timestamped, and acknowledgeable. (See full rule breakdown below.)

### ✈️ 360° Flight Drilldown
Click any flight row to instantly see its complete operational picture — assigned gate, baggage load status, maintenance open orders, passenger count, delay reason, and boarding window — all cross-referenced from the underlying datasets in real time.

### 🅿️ Gate Intelligence with Gantt Turnaround Timeline
Each gate displays an interactive Gantt timeline showing inbound arrival, cleaning window, and outbound boarding. Conflict zones are highlighted automatically when turnaround time compresses below safe thresholds.

### 🪧 Animated Split-Flap Departures Board
A classic airport FIDS (Flight Information Display System) rendered in CSS, with authentic flip-panel animations. Flight statuses cycle through `SCHEDULED → CHECK_IN_OPEN → BOARDING → FINAL_BOARDING → DEPARTED → AIRBORNE` driven by simulation time.

### 🧳 Baggage Reconciliation System
Real-time bag tracking across the full handling lifecycle. Bags are flagged when they remain in-transit within 30 minutes of their flight's departure, triggering a BAGGAGE_OFFLOAD_RISK alert.

### 🛡️ Security Queue Simulation with Analytics
Checkpoint-level queue tracking with average wait time calculation, trend visualization, and automatic alerts when wait times cross 20 minutes during active departure windows.

### 👷 Staff Coverage Gap Detection
Continuously checks minimum active staff counts across all four departments (Security, Ops, Ground, Retail) in 30-minute rolling windows. Fires when any department drops below 5 active staff.

### 🛍️ Retail Revenue Intelligence
Revenue analytics cross-referenced against passenger flow data from security and flights. Tracks revenue by terminal, category (F&B, Retail, Duty Free, Services, Electronics, Fashion), and automatically correlates revenue dips to upstream queue spikes.

### 📊 Live Command Header with 6 Real-Time KPIs
A persistent header displays: **Flights Today**, **On-Time %**, **Active Gates**, **PAX in Terminal**, **Security Wait (avg min)**, and **Open Incidents** — all updating every simulation tick. A scrolling ticker streams the most recent alert messages.

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| UI Framework | React 19 | Latest concurrent features, stable transitions |
| Language | TypeScript 6 | Strict typing across 8 dataset schemas |
| Build Tool | Vite 8 | Sub-second HMR, ESM-first bundling |
| Routing | React Router DOM v7 | Module-per-route architecture |
| Animation | Framer Motion 12 | Split-flap animations, panel transitions |
| CSV Parsing | PapaParse 5.5 | Parallel async parsing of all 8 CSVs on load |
| Icons | Lucide React 1.28 | Consistent aviation-themed iconography |
| Styling | Vanilla CSS Modules | Zero-dependency, component-scoped styling |

---

## 🏗️ Architecture

AeroCommand is built on three architectural pillars:

### 1. Singleton Engine Pattern
Both the `SimulationEngine` and `AlertEngine` are implemented as singletons with controlled lifecycle methods. This ensures a single source of truth for simulation state across all React components, preventing duplicate ticks or alert emissions.

```
SimulationEngine.getInstance().init(store) → .play() / .pause() / .setSpeed(n)
AlertEngine.getInstance().scanAnomalies(store, currentTime) → Alert[]
```

### 2. EventBus (Pub/Sub)
A lightweight custom EventBus decouples the simulation engine from UI components. Components subscribe to typed events and react independently, keeping simulation logic framework-agnostic.

```
eventBus.emit(FLIGHT_STATUS_CHANGED, { flight_id, oldStatus, newStatus, simulationTime, gate })
eventBus.emit(SECURITY_QUEUE_UPDATE, { checkpointId, queueLength, waitTime })
eventBus.emit(INCIDENT_CREATED, { alertId, type, severity, affectedFlightId, message })
eventBus.emit(SIMULATION_TICK, { currentTime, speedMultiplier })
```

### 3. React Context Layer
`AirportContext` holds the fully parsed `DataStore` (all 8 datasets). `SimulationContext` exposes simulation controls and alert state. Both contexts consume EventBus events and propagate updates to subscribed components.

```
src/
├── engine/
│   ├── SimulationEngine.ts    ← Tick clock, flight status transitions
│   └── AlertEngine.ts         ← 8 cross-dataset anomaly rules
├── context/
│   ├── AirportContext.tsx     ← DataStore (8 CSVs parsed via PapaParse)
│   └── SimulationContext.tsx  ← Simulation controls, alert state
├── utils/
│   └── EventBus.ts            ← Custom pub/sub system
├── components/
│   ├── layout/CommandHeader   ← KPI tiles, ticker, nav, sim controls
│   ├── flights/               ← FlightOpsBoard, FlightRow, SplitFlap
│   ├── gates/                 ← GatePanel, GanttTimeline, GateDetailPanel
│   ├── baggage/               ← BaggagePanel, BaggagePipeline, Reconciliation
│   ├── passengers/            ← PassengerPanel, FunnelChart, LoadFactorChart
│   ├── security/              ← SecurityPanel (queue heatmap)
│   ├── staff/                 ← StaffPanel (coverage gap detection)
│   ├── maintenance/           ← MaintenancePanel (open work orders)
│   ├── retail/                ← RetailPanel (revenue by terminal/category)
│   └── alerts/                ← AlertPanel (typed, severity-ranked)
└── types/
    ├── airport.ts             ← Core domain types
    └── unified.ts             ← DataStore type (all 8 dataset interfaces)
```

---

## 🚨 Alert Engine — 8 Cross-Dataset Rules

The `AlertEngine` scans all 8 datasets on every simulation tick and fires typed alerts. Each alert is deduplicated by a deterministic ID so it fires exactly once per incident.

| # | Alert Type | Severity | Trigger Logic |
|---|-----------|----------|---------------|
| 1 | `CASCADE_DELAY` | 🔴 CRITICAL | Delayed flight compresses next flight's gate boarding window to under 30 minutes |
| 2 | `BAGGAGE_OFFLOAD_RISK` | 🔴 CRITICAL | Bags still in-transit when departure is < 30 minutes away |
| 3 | `GATE_CONFLICT` | 🟠 HIGH | Arrival-to-departure overlap at a gate narrows below 15-minute safety threshold |
| 4 | `SECURITY_OVERLOAD` | 🟠 HIGH | Checkpoint average wait > 20 min while flights depart within 60 minutes |
| 5 | `STAFF_COVERAGE_GAP` | 🟠 HIGH | Any department (Security/Ops/Ground/Retail) drops below 5 active staff |
| 6 | `MAINTENANCE_FLIGHT_IMPACT` | 🟡 MEDIUM | Unresolved severity-3+ maintenance order on an aircraft boarding within 60 min |
| 7 | `LOW_LOAD_FACTOR` | 🟡 MEDIUM | Flight load factor < 60% with departure < 120 minutes (revenue opportunity) |
| 8 | `RETAIL_REVENUE_DROP` | 🔵 LOW | Revenue baseline deviation correlated to security queue spike |

---

## 📂 Dataset Coverage

All 8 provided datasets are actively parsed and consumed. No dataset was left unused.

| # | Dataset | Records | Used In |
|---|---------|---------|---------|
| 1 | `flights.csv` | ~1,200 | Flight board, gates, baggage, alerts, all KPIs |
| 2 | `gate_events.csv` | ~4,800 | Gate panel, Gantt timeline, conflict detection |
| 3 | `baggage.csv` | ~6,000+ | Baggage reconciliation, BAGGAGE_OFFLOAD_RISK alert |
| 4 | `passengers.csv` | ~8,000+ | PAX in Terminal KPI, load factor, passenger funnel |
| 5 | `security_screening.csv` | ~9,000+ | Security wait avg, SECURITY_OVERLOAD alert, KPI tile |
| 6 | `maintenance_logs.csv` | ~2,000+ | Maintenance panel, MAINTENANCE_FLIGHT_IMPACT alert |
| 7 | `staff_shifts.csv` | ~3,000+ | Staff panel, STAFF_COVERAGE_GAP alert |
| 8 | `retail_transactions.csv` | ~10,000+ | Retail revenue by terminal/category, RETAIL_REVENUE_DROP alert |

---

## 🗂️ Module Guide

| Route | Module | What It Shows |
|-------|--------|---------------|
| `/flights` | Flight Ops Board | Live flight status board with animated split-flap display, delay risk scoring, 360° drilldown |
| `/gates` | Gate Intelligence | Gate-by-gate occupancy, Gantt turnaround timelines, conflict zones |
| `/baggage` | Baggage Reconciliation | Bag pipeline from check-in to loading, in-transit flags, offload alerts |
| `/passengers` | Passenger Analytics | Terminal funnel, load factor chart per flight, demographic breakdown |
| `/security` | Security Ops | Checkpoint queue lengths, average wait heatmap, overload alerts |
| `/staff` | Staff Coverage | Shift grid by department, coverage gap detection, minimum-staff alerts |
| `/maintenance` | Maintenance Ops | Open work orders, severity levels, flight impact cross-reference |
| `/retail` | Retail Revenue | Revenue by terminal (T1/T2/T3), by category, correlated to passenger flow |

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Installation

```bash
# Clone the repository
git clone https://github.com/Niss54/Frontend_war2.git
cd Frontend_war2

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run build
npm run preview
```

### ⚡ Quick Start for Judges

1. Press **S** (or the ▶ button, bottom-right) to start the simulation
2. Set speed to **5×** or **10×** to watch the airport day unfold
3. Watch the **Alert ticker** at the top — cascade incidents will auto-fire across datasets
4. Click any **flight row** for a 360° cross-dataset drilldown
5. Open the **🔔 Alert Panel** (bell icon, top-right) to see the full alert stream
6. Navigate via **keyboard shortcuts** or the module navigation bar

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `S` | Toggle simulation play / pause |
| `1` | Navigate → Flights |
| `2` | Navigate → Gates |
| `3` | Navigate → Baggage |
| `4` | Navigate → Security |
| `5` | Navigate → Staff |
| `6` | Navigate → Retail |
| `A` | Open / close Alert Panel |
| `ESC` | Close any open panel or drilldown |
| `F` | Focus flight search |

---

## 👥 Team

**Team Syntrix** —  Frontend Wars 2026

| Member | Role |
|--------|------|
| **Nishant Maurya** | Full Stack Lead · Simulation Engine · Alert Engine · UI Architecture |

---

## 📄 License

This project was built for **Frontend Wars 2026** as a competitive hackathon submission.

```
MIT License — see LICENSE file for details
```

---

<div align="center">

Built with ❤️ for VIDP — because every second of delay has a downstream cost.

[![GitHub](https://img.shields.io/badge/GitHub-Niss54-181717?style=flat-square&logo=github)](https://github.com/Niss54)
[![Portfolio](https://img.shields.io/badge/Portfolio-nissh.info-00C49F?style=flat-square)](https://nissh.info)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-niss--visuals-0A66C2?style=flat-square&logo=linkedin)](https://linkedin.com/in/niss-visuals)

*"One screen. Eight systems. Zero blind spots."*

</div>
