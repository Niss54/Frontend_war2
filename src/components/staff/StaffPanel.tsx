import React, { useMemo } from 'react';
import { useAirportData } from '../../context/AirportContext';
import { useSimulation } from '../../context/SimulationContext';
import './StaffPanel.css';

const DEPARTMENTS = ['Security', 'Ops', 'Ground', 'Retail'];
const DEPT_COLORS: Record<string, string> = {
  Security: '#4A9EFF',
  Ops: '#FFB800',
  Ground: '#00FF88',
  Retail: '#B829D9'
};
const MIN_STAFF = 10; // Simple heuristic for hackathon

export const StaffPanel: React.FC = () => {
  const { store } = useAirportData();
  const { currentTime } = useSimulation();

  const { departmentStats, currentPct, gaps } = useMemo(() => {
    if (!store) return { departmentStats: [], currentPct: 0, gaps: [] };
    
    // Time conversions
    const now = currentTime.getTime();
    const startOfDay = new Date(currentTime);
    startOfDay.setHours(0, 0, 0, 0);
    const msInDay = 24 * 60 * 60 * 1000;
    const currentPct = ((now - startOfDay.getTime()) / msInDay) * 100;

    const stats = DEPARTMENTS.map(dept => {
      const deptShifts = store.staffShifts.filter(s => s.department === dept);
      
      const shifts = deptShifts.map(s => {
        // Assume shift_start is "HH:MM:SS" or full date. Let's parse it.
        // In CSV it might be full ISO or HH:MM. If it fails, fallback.
        let stTime = new Date(s.shift_start).getTime();
        let enTime = new Date(s.shift_end).getTime();
        if (isNaN(stTime)) {
          // If it was just HH:MM string, prepend date
          const [h,m] = s.shift_start.split(':');
          stTime = new Date(startOfDay).setHours(Number(h)||0, Number(m)||0, 0, 0);
        }
        if (isNaN(enTime)) {
          const [h,m] = s.shift_end.split(':');
          enTime = new Date(startOfDay).setHours(Number(h)||0, Number(m)||0, 0, 0);
        }
        
        const stPct = Math.max(0, ((stTime - startOfDay.getTime()) / msInDay) * 100);
        const enPct = Math.min(100, ((enTime - startOfDay.getTime()) / msInDay) * 100);
        const active = now >= stTime && now <= enTime;
        
        return { ...s, stPct, enPct, active, stTime, enTime };
      });

      // Calculate gaps (hours where active staff < MIN_STAFF)
      const deptGaps = [];
      let totalActiveNow = 0;
      let onTimeCount = 0; // Simulated for now

      // Check each hour
      for (let h = 0; h < 24; h++) {
        const hourTime = startOfDay.getTime() + h * 3600000;
        const activeInHour = shifts.filter(s => hourTime >= s.stTime && hourTime < s.enTime).length;
        if (activeInHour > 0 && activeInHour < MIN_STAFF) {
          const stPct = (h / 24) * 100;
          const enPct = ((h + 1) / 24) * 100;
          deptGaps.push({ stPct, enPct, count: activeInHour });
        }
      }

      totalActiveNow = shifts.filter(s => s.active).length;
      onTimeCount = Math.floor(shifts.length * 0.94); // 94% simulated on time

      return {
        dept,
        total: shifts.length,
        activeNow: totalActiveNow,
        onTimeRate: shifts.length ? Math.round((onTimeCount / shifts.length) * 100) : 100,
        shifts,
        gaps: deptGaps
      };
    });

    // Check for critical gaps in next 2 hours
    const criticalGaps: string[] = [];
    const inTwoHours = currentPct + (2 / 24) * 100;
    stats.forEach(st => {
      const hasUpcomingGap = st.gaps.some(g => (g.stPct >= currentPct && g.stPct <= inTwoHours) || (g.stPct <= currentPct && g.enPct >= currentPct));
      if (hasUpcomingGap) criticalGaps.push(st.dept);
    });

    return { departmentStats: stats, currentPct, gaps: criticalGaps };
  }, [store, currentTime]);

  if (!store) return null;

  return (
    <div className="staff-panel">
      <div className="staff-gantt">
        <h3>Coverage Timeline (24h)</h3>
        
        <div className="gantt-header">
          {Array.from({length: 24}).map((_, i) => (
            <div key={i} className="gantt-hour">{i}</div>
          ))}
        </div>

        <div className="gantt-container">
          <div className="gantt-grid-lines">
            {Array.from({length: 24}).map((_, i) => (
              <div key={i} className="gantt-grid-line"></div>
            ))}
          </div>

          <div className="current-time-line" style={{ left: `calc(120px + ${currentPct}% - (120px * ${currentPct/100}))` }}></div>

          {departmentStats.map(st => (
            <div key={st.dept} className="gantt-row">
              <div className="gantt-dept-label">{st.dept}</div>
              <div className="gantt-track">
                {st.shifts.map((s, i) => (
                  <div 
                    key={i} 
                    className="shift-block"
                    style={{
                      left: `${s.stPct}%`,
                      width: `${Math.max(0, s.enPct - s.stPct)}%`,
                      backgroundColor: DEPT_COLORS[st.dept],
                      top: `${Math.random() * 20 + 4}px`, // Slight stagger for visual density
                      height: '24px'
                    }}
                    title={`${s.name} (${s.role})`}
                  ></div>
                ))}
                
                {/* Gap highlights */}
                {st.gaps.map((g, i) => (
                  <div 
                    key={`gap-${i}`}
                    className="gap-block"
                    style={{
                      left: `${g.stPct}%`,
                      width: `${Math.max(0, g.enPct - g.stPct)}%`
                    }}
                  ></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="staff-summary">
        <h3>Staffing Summary</h3>
        <table className="staff-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Total Scheduled</th>
              <th>Active Now</th>
              <th>On-Time Rate</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {departmentStats.map(st => (
              <tr key={st.dept}>
                <td style={{fontWeight: 'bold', color: DEPT_COLORS[st.dept]}}>{st.dept}</td>
                <td>{st.total}</td>
                <td>{st.activeNow}</td>
                <td style={{color: st.onTimeRate < 95 ? '#FFB800' : '#00FF88'}}>{st.onTimeRate}%</td>
                <td>
                  {gaps.includes(st.dept) ? (
                    <span className="alert-badge">STAFFING ALERT (Next 2h)</span>
                  ) : (
                    <span style={{color: '#00FF88', fontSize: '12px', fontWeight: 'bold'}}>COVERAGE OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
