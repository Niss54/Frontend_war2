import React, { useMemo } from 'react';
import type { Baggage, Flight } from '../../../../types/airport';

interface BaggagePipelineProps {
  baggage: Baggage[];
  flights: Flight[];
  currentTime: Date;
}

export const BaggagePipeline: React.FC<BaggagePipelineProps> = ({ baggage, flights, currentTime }) => {
  const { pipelineCounts } = useMemo(() => {
    const counts = {
      checkIn: 0,
      security: 0,
      sort: 0,
      ramp: 0,
      aircraft: 0,
      departed: 0,
    };

    const now = currentTime.getTime();

    const bags = baggage.map(b => {
      const status = String(b.status).toLowerCase();
      const loc = String(b.location).toLowerCase();
      let stage = '';

      // Determine stage
      if (status === 'delivered') {
        stage = 'DEPARTED';
        counts.departed++;
      } else if (status === 'loaded' || loc === 'aircraft') {
        const flight = flights.find(f => f.flight_id === b.flight_id);
        if (flight?.status === 'Departed' || flight?.status === 'Airborne') {
          stage = 'DEPARTED';
          counts.departed++;
        } else {
          stage = 'AIRCRAFT HOLD';
          counts.aircraft++;
        }
      } else if (loc === 'ramp') {
        stage = 'LOADING BAY';
        counts.ramp++;
      } else if (loc === 'belt') {
        stage = 'SORT FACILITY';
        counts.sort++;
      } else if (status === 'in transit') {
        stage = 'SECURITY SCAN';
        counts.security++;
      } else {
        stage = 'CHECK-IN';
        counts.checkIn++;
      }

      // Time in stage
      const lastUpdate = new Date(b.last_update).getTime();
      const timeInStageMins = Math.round(Math.max(0, now - lastUpdate) / 60000);

      // Risk highlighting
      let riskLevel = 'normal';
      if (status === 'missing' || status === 'damaged' || Number(b.damage_count) > 0) {
        riskLevel = 'red';
      } else if (stage === 'SECURITY SCAN') {
        const flight = flights.find(f => f.flight_id === b.flight_id);
        if (flight && flight.scheduled_departure) {
          const depTime = new Date(flight.scheduled_departure).getTime();
          const minsToDep = (depTime - now) / 60000;
          if (minsToDep > 0 && minsToDep < 45) {
            riskLevel = 'amber';
          }
        }
      }

      return { ...b, stage, timeInStageMins, riskLevel };
    });

    // Sort by time in stage desc
    bags.sort((a, b) => b.timeInStageMins - a.timeInStageMins);

    return { pipelineCounts: counts, tableBags: bags };
  }, [baggage, flights, currentTime]);

  return (
    <div className="baggage-pipeline">
      <div className="pipeline-stages">
        <StageBox label="CHECK-IN" count={pipelineCounts.checkIn} />
        <Arrow throughput={Math.round(pipelineCounts.checkIn / 15)} />
        <StageBox label="SECURITY SCAN" count={pipelineCounts.security} colorClass={pipelineCounts.security > 200 ? 'status-amber' : 'status-green'} />
        <Arrow throughput={Math.round(pipelineCounts.security / 12)} />
        <StageBox label="SORT FACILITY" count={pipelineCounts.sort} />
        <Arrow throughput={Math.round(pipelineCounts.sort / 10)} />
        <StageBox label="LOADING BAY" count={pipelineCounts.ramp} />
        <Arrow throughput={Math.round(pipelineCounts.ramp / 8)} />
        <StageBox label="AIRCRAFT HOLD" count={pipelineCounts.aircraft} />
        <Arrow throughput={Math.round(pipelineCounts.aircraft / 5)} />
        <StageBox label="DEPARTED" count={pipelineCounts.departed} />
      </div>
    </div>
  );
};

const StageBox = ({ label, count, colorClass = 'status-green' }: { label: string, count: number, colorClass?: string }) => (
  <div className={`pipeline-stage`}>
    <div className={`stage-box ${colorClass}`}>
      <div className="stage-count">{count}</div>
      <div className="stage-label">{label}</div>
    </div>
  </div>
);

const Arrow = ({ throughput }: { throughput: number }) => (
  <div style={{ position: 'relative', zIndex: 1, color: '#2a2a3e' }}>
    <svg width="40" height="20" viewBox="0 0 40 20">
      <path d="M0,10 L35,10 M25,0 L35,10 L25,20" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
    <div className="throughput-badge">{throughput} b/m</div>
  </div>
);
