import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAirportData } from '../../../../context/AirportContext';
import { useSimulation } from '../../../../context/SimulationContext';
import type { MaintenanceLog } from '../../../../types/airport';
import './MaintenancePanel.css';

export const MaintenancePanel: React.FC = () => {
  const { store } = useAirportData();
  const { currentTime } = useSimulation();
  const navigate = useNavigate();

  const { open, inProgress, resolved, stats } = useMemo(() => {
    if (!store) return { open: [], inProgress: [], resolved: [], stats: { total: 0, critical: 0, resolvedToday: 0 } };

    const openList: MaintenanceLog[] = [];
    const inProgList: MaintenanceLog[] = [];
    const resList: MaintenanceLog[] = [];
    
    let criticalCount = 0;
    let resolvedTodayCount = 0;
    
    const now = currentTime.getTime();
    const startOfDay = new Date(currentTime);
    startOfDay.setHours(0, 0, 0, 0);

    store.maintenanceLogs.forEach(log => {
      const isResolved = log.resolved_at && new Date(log.resolved_at).getTime() <= now;
      const isAssigned = !!log.assigned_to && String(log.assigned_to).trim() !== '';
      const sev = Number(log.severity) || 1;

      if (isResolved) {
        resList.push(log);
        const resTime = new Date(log.resolved_at).getTime();
        if (resTime >= startOfDay.getTime() && resTime <= now) {
          resolvedTodayCount++;
        }
      } else {
        if (sev === 4) criticalCount++;
        if (isAssigned) {
          inProgList.push(log);
        } else {
          openList.push(log);
        }
      }
    });

    // Sort: Critical (sev 4) at top, then by creation date (oldest first)
    const sortLogs = (a: MaintenanceLog, b: MaintenanceLog) => {
      const sevDiff = (Number(b.severity) || 0) - (Number(a.severity) || 0);
      if (sevDiff !== 0) return sevDiff;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    };

    openList.sort(sortLogs);
    inProgList.sort(sortLogs);
    resList.sort((a, b) => new Date(b.resolved_at).getTime() - new Date(a.resolved_at).getTime()); // newest resolved first

    return {
      open: openList,
      inProgress: inProgList,
      resolved: resList,
      stats: {
        totalOpen: openList.length + inProgList.length,
        critical: criticalCount,
        resolvedToday: resolvedTodayCount
      }
    };
  }, [store, currentTime]);

  if (!store) return null;

  const renderCard = (log: MaintenanceLog) => {
    const sev = Number(log.severity) || 1;
    return (
      <div key={log.work_order_id} className={`kanban-card sev-${sev}`}>
        <div className="k-card-header">
          <span className="k-asset">{log.asset_id}</span>
          <span className="k-type">{log.type}</span>
        </div>
        <div className="k-desc">{log.description}</div>
        
        {log.flight_id && (
          <div 
            className="flight-impact-badge" 
            onClick={(e) => { e.stopPropagation(); navigate(`/flights?search=${log.flight_id}`); }}
            title="View Flight"
            style={{ marginBottom: '12px' }}
          >
            ✈️ IMPACT: {log.flight_id}
          </div>
        )}

        <div className="k-footer">
          <div className="k-assignee">
            {log.assigned_to ? `👤 ${log.assigned_to}` : 'Unassigned'}
          </div>
          <div style={{fontSize: '10px', color: '#666'}}>
            {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="maintenance-panel">
      <div className="maint-stats">
        <div className="maint-stat-box">
          <div className="maint-stat-val">{stats.totalOpen}</div>
          <div className="maint-stat-label">Total Open Issues</div>
        </div>
        <div className="maint-stat-box">
          <div className="maint-stat-val critical">{stats.critical}</div>
          <div className="maint-stat-label">Critical Issues</div>
        </div>
        <div className="maint-stat-box">
          <div className="maint-stat-val">{inProgress.length}</div>
          <div className="maint-stat-label">In Progress</div>
        </div>
        <div className="maint-stat-box">
          <div className="maint-stat-val resolved">{stats.resolvedToday}</div>
          <div className="maint-stat-label">Resolved Today</div>
        </div>
      </div>

      <div className="kanban-board">
        <div className="kanban-column">
          <div className="kanban-col-header">
            <h3>Open</h3>
            <span className="kanban-count">{open.length}</span>
          </div>
          <div className="kanban-col-body">
            {open.map(renderCard)}
          </div>
        </div>

        <div className="kanban-column">
          <div className="kanban-col-header">
            <h3>In Progress</h3>
            <span className="kanban-count">{inProgress.length}</span>
          </div>
          <div className="kanban-col-body">
            {inProgress.map(renderCard)}
          </div>
        </div>

        <div className="kanban-column">
          <div className="kanban-col-header">
            <h3>Resolved</h3>
            <span className="kanban-count">{resolved.length}</span>
          </div>
          <div className="kanban-col-body">
            {resolved.slice(0, 50).map(renderCard)}
          </div>
        </div>
      </div>
    </div>
  );
};
