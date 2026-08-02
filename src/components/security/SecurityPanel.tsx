import React, { useMemo } from 'react';
import { useAirportData } from '../../context/AirportContext';
import { useSimulation } from '../../context/SimulationContext';
import './SecurityPanel.css';

export const SecurityPanel: React.FC = () => {
  const { store } = useAirportData();
  const { currentTime } = useSimulation();

  const { checkpoints, throughputByHour, heatmapData } = useMemo(() => {
    if (!store) return { checkpoints: [], throughputByHour: [], heatmapData: [] };
    const now = currentTime.getTime();
    
    // Group recent screenings by checkpoint
    const cpMap = new Map<number, { count: number, totalWait: number, throughput: number }>();
    
    // Initialize checkpoints 1 to 5 (assuming 5 checkpoints from data)
    for (let i = 1; i <= 5; i++) {
      cpMap.set(i, { count: 0, totalWait: 0, throughput: 0 });
    }

    const tpByHour = new Array(24).fill(0);
    const hmData = Array.from({ length: 24 }, () => new Array(5).fill(0)); // 24 hours x 5 checkpoints

    store.securityScreenings.forEach(s => {
      const entryTime = new Date(s.queue_entry_time).getTime();
      const exitTime = s.queue_exit_time ? new Date(s.queue_exit_time).getTime() : 0;
      
      // Calculate throughput per hour based on entry time
      const hour = new Date(s.queue_entry_time).getHours();
      tpByHour[hour]++;

      // Calculate heatmap wait times (avg per hour per checkpoint)
      // This is a simplified heuristic: using raw wait_time_seconds for the hour
      if (s.wait_time_seconds > 0) {
        hmData[hour][s.checkpoint_id - 1] = Math.max(hmData[hour][s.checkpoint_id - 1], s.wait_time_seconds / 60);
      }

      // Current live stats (last 30 mins)
      if (entryTime >= now - 30 * 60000 && entryTime <= now) {
        const cp = cpMap.get(s.checkpoint_id);
        if (cp) {
          cp.count++;
          if (exitTime > 0 && exitTime <= now) {
            cp.totalWait += (exitTime - entryTime) / 60000;
            cp.throughput++;
          }
        }
      }
    });

    const checkpoints = Array.from(cpMap.entries()).map(([id, data]) => {
      const avgWait = data.throughput > 0 ? Math.round(data.totalWait / data.throughput) : 0;
      const currentQueue = Math.max(0, data.count - data.throughput);
      
      let status = 'NORMAL';
      let statusClass = 'normal';
      if (avgWait > 20 || currentQueue > 100) {
        status = 'CRITICAL';
        statusClass = 'critical';
      } else if (avgWait > 10 || currentQueue > 50) {
        status = 'BUSY';
        statusClass = 'busy';
      }

      return { id, avgWait, currentQueue, throughputRate: Math.round(data.throughput / 30), status, statusClass };
    });

    return { checkpoints, throughputByHour: tpByHour, heatmapData: hmData };
  }, [store, currentTime]);

  if (!store) return null;

  const maxTp = Math.max(...throughputByHour, 1);

  return (
    <div className="security-panel">
      <div className="checkpoint-grid">
        {checkpoints.map(cp => (
          <div key={cp.id} className={`checkpoint-card ${cp.statusClass === 'critical' ? 'critical' : ''}`}>
            <div className="cp-header">
              <div className="cp-title">Checkpoint {cp.id}</div>
              <div className={`cp-badge ${cp.statusClass}`}>{cp.status}</div>
            </div>
            <div className="cp-stats">
              <div className="cp-stat">
                <span className={`cp-stat-val ${cp.avgWait > 20 ? 'red' : ''}`}>{cp.avgWait}m</span>
                <span className="cp-stat-label">Wait Time</span>
              </div>
              <div className="cp-stat">
                <span className="cp-stat-val">{cp.currentQueue}</span>
                <span className="cp-stat-label">In Queue</span>
              </div>
              <div className="cp-stat">
                <span className="cp-stat-val">{cp.throughputRate}</span>
                <span className="cp-stat-label">Pax/Min</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="security-charts">
        <div className="sec-chart-container">
          <h3>Throughput Today (Pax / Hour)</h3>
          <div className="throughput-bars">
            {throughputByHour.map((tp, i) => (
              <div key={i} className="tp-bar-col">
                <div className="tp-bar" style={{ height: `${(tp / maxTp) * 100}%` }}></div>
                {i % 4 === 0 && <div className="tp-label">{i}:00</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="sec-chart-container">
          <h3>Wait Time Heatmap (Hour vs Checkpoint)</h3>
          <div style={{ display: 'flex', flex: 1 }}>
            <div className="heatmap-y">
              <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div className="heatmap-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gridTemplateRows: 'repeat(24, 1fr)' }}>
                {heatmapData.map((row, h) => 
                  row.map((val, c) => {
                    let colorClass = 'green';
                    if (val > 20) colorClass = 'red';
                    else if (val > 10) colorClass = 'amber';
                    return <div key={`${h}-${c}`} className={`heatmap-cell ${val > 0 ? colorClass : ''}`} title={`Hour ${h}, CP ${c+1}: ${Math.round(val)}m`}></div>;
                  })
                )}
              </div>
              <div className="heatmap-x">
                <span>CP 1</span><span>CP 2</span><span>CP 3</span><span>CP 4</span><span>CP 5</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
