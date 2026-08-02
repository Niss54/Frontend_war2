import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Copy, Check } from 'lucide-react';
import { useAirportData } from '../../../context/AirportContext';
import { useSimulation } from '../../../context/SimulationContext';
import './HandoverReport.css';

interface HandoverReportProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HandoverReport: React.FC<HandoverReportProps> = ({ isOpen, onClose }) => {
  const { store, flightIndex, derivedData } = useAirportData();
  const { currentTime } = useSimulation();
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !store || !derivedData) return null;

  // 1. HEADER
  const generatedTime = currentTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

  // 2. FLIGHT STATUS SUMMARY (Next 4 hours)
  const fourHoursFromNow = new Date(currentTime.getTime() + 4 * 60 * 60 * 1000);
  
  const upcomingFlights = Array.from(flightIndex.values())
    .map(uf => uf.flight)
    .filter(f => {
      const depTime = new Date(f.scheduled_departure);
      return depTime >= currentTime && depTime <= fourHoursFromNow;
    })
    .sort((a, b) => new Date(a.scheduled_departure).getTime() - new Date(b.scheduled_departure).getTime());

  // 3. OPEN INCIDENTS
  const incidents = derivedData.activeAlerts;

  // 4. BAGGAGE DISCREPANCIES
  const baggageDiscrepancies = Array.from(flightIndex.values())
    .filter(uf => uf.bags.length > 0 && uf.baggageReconciliationRate < 98)
    .sort((a, b) => a.baggageReconciliationRate - b.baggageReconciliationRate);

  // 5. SECURITY STATUS
  const cpStatus = new Map<number, { queue: number; wait: number }>();
  store.securityScreenings.forEach(s => {
    if (new Date(s.screening_time) <= currentTime) {
      cpStatus.set(s.checkpoint_id, {
        queue: s.current_queue,
        wait: Math.round(s.wait_time_seconds / 60)
      });
    }
  });

  // 6. OPEN MAINTENANCE ITEMS
  const openMaintenance = store.maintenanceLogs.filter(m => !m.resolved_at || m.resolved_at === '');

  // 7. STAFFING GAPS
  const gaps = derivedData.staffingGaps.filter(g => g.status !== 'OK');

  const handleCopyJSON = () => {
    const data = {
      timestamp: currentTime.toISOString(),
      upcomingFlights,
      incidents,
      baggageDiscrepancies: baggageDiscrepancies.map(uf => ({ flightId: uf.flight.flight_id, rate: uf.baggageReconciliationRate })),
      security: Array.from(cpStatus.entries()),
      openMaintenance,
      staffingGaps: gaps,
      retail: derivedData.retailSummary,
      notes
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getHTMLString = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: "Courier New", Courier, monospace; background: #0D0D14; color: #fff; padding: 32px; max-width: 900px; margin: 0 auto; }
    h1 { color: #00FF88; font-size: 28px; border-bottom: 2px solid #00FF88; padding-bottom: 12px; }
    h2 { color: #FFB800; font-size: 18px; border-bottom: 1px solid rgba(255,184,0,0.3); padding-bottom: 8px; margin-top: 32px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
    th, td { padding: 8px 12px; border-bottom: 1px solid #1E1E2E; text-align: left; }
    th { color: #8b92a5; font-weight: normal; }
    .delayed { background: rgba(255, 51, 102, 0.15); color: #FF3366; }
    .badge-red { color: #FF3366; }
    .badge-amber { color: #FFB800; }
    .meta { color: #8b92a5; font-size: 14px; margin-bottom: 32px; }
    .notes-box { background: #12121A; border: 1px solid #1E1E2E; padding: 16px; border-radius: 6px; white-space: pre-wrap; margin-top: 16px; }
  </style>
</head>
<body>
  <h1>SHIFT HANDOVER REPORT</h1>
  <div class="meta">
    <div>Generated: ${generatedTime}</div>
    <div>Airport: VIDP Indira Gandhi Intl</div>
  </div>

  <h2>1. OUTGOING NOTES</h2>
  <div class="notes-box">${notes || 'No notes provided.'}</div>

  <h2>2. FLIGHT STATUS SUMMARY (Next 4 Hours)</h2>
  <table>
    <tr><th>Flight</th><th>Status</th><th>Gate</th><th>Delay</th><th>Pax</th></tr>
    ${upcomingFlights.map(f => `
      <tr class="${f.status === 'DELAYED' ? 'delayed' : ''}">
        <td>${f.flight_id}</td>
        <td>${f.status}</td>
        <td>${f.gate || '-'}</td>
        <td>${f.delay_minutes > 0 ? f.delay_minutes + 'm' : '-'}</td>
        <td>${f.pax_count}</td>
      </tr>
    `).join('')}
  </table>

  <h2>3. OPEN INCIDENTS</h2>
  <table>
    <tr><th>Severity</th><th>Type</th><th>Message</th><th>Time</th></tr>
    ${incidents.map(i => `
      <tr>
        <td class="${i.severity === 'CRITICAL' ? 'badge-red' : 'badge-amber'}">${i.severity}</td>
        <td>${i.type}</td>
        <td>${i.message}</td>
        <td>${new Date(i.timestamp).toLocaleTimeString()}</td>
      </tr>
    `).join('')}
  </table>

  <h2>4. BAGGAGE DISCREPANCIES (&lt;98%)</h2>
  <table>
    <tr><th>Flight</th><th>Total Bags</th><th>Missing</th><th>Reconciliation %</th></tr>
    ${baggageDiscrepancies.map(uf => `
      <tr>
        <td>${uf.flight.flight_id}</td>
        <td>${uf.bags.length}</td>
        <td>${uf.bags.filter(b => b.status === 'Missing').length}</td>
        <td class="${uf.baggageReconciliationRate < 95 ? 'badge-red' : 'badge-amber'}">${uf.baggageReconciliationRate.toFixed(1)}%</td>
      </tr>
    `).join('')}
  </table>

  <h2>5. SECURITY STATUS</h2>
  <table>
    <tr><th>CP ID</th><th>Current Queue</th><th>Est. Wait</th><th>Status</th></tr>
    ${Array.from(cpStatus.entries()).map(([id, data]) => `
      <tr>
        <td>CP${id}</td>
        <td>${data.queue} pax</td>
        <td class="${data.wait > 15 ? 'badge-red' : ''}">${data.wait} min</td>
        <td>${data.wait > 15 ? 'CONGESTED' : 'NORMAL'}</td>
      </tr>
    `).join('')}
  </table>

  <h2>6. OPEN MAINTENANCE ITEMS</h2>
  <table>
    <tr><th>Asset ID</th><th>Severity</th><th>Description</th><th>Flight Impact</th></tr>
    ${openMaintenance.map(m => `
      <tr>
        <td>${m.asset_id}</td>
        <td class="${m.severity >= 4 ? 'badge-red' : 'badge-amber'}">${m.severity}</td>
        <td>${m.description}</td>
        <td>${m.flight_id || 'None'}</td>
      </tr>
    `).join('')}
  </table>

  <h2>7. STAFFING GAPS (Next 4 Hours)</h2>
  <table>
    <tr><th>Department</th><th>Terminal</th><th>Gap Slot</th><th>Deficit</th></tr>
    ${gaps.map(g => `
      <tr>
        <td>${g.department}</td>
        <td>${g.terminal}</td>
        <td>${g.timeSlot}</td>
        <td class="badge-red">-${g.required - g.assigned} staff</td>
      </tr>
    `).join('')}
  </table>

  <h2>8. RETAIL SUMMARY</h2>
  <ul>
    <li>Total Revenue Today: $${derivedData.retailSummary.totalRevenue.toLocaleString()}</li>
    <li>Avg Transaction: $${derivedData.retailSummary.avgTransaction.toFixed(2)}</li>
    <li>Top Category: ${derivedData.retailSummary.topCategory}</li>
    <li>Total Transactions: ${derivedData.retailSummary.totalTransactions}</li>
  </ul>
</body>
</html>
    `;
  };

  const handleDownloadHTML = () => {
    const html = getHTMLString();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `handover_${currentTime.toISOString().replace(/[:.]/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      <div className="handover-overlay" onClick={onClose}>
        <motion.div 
          className="handover-modal"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
        >
          <button className="handover-close" onClick={onClose}>
            <X size={20} />
          </button>

          <div className="handover-header">
            <h1>SHIFT HANDOVER REPORT</h1>
            <div className="handover-header-meta">
              <span>Generated at: {generatedTime}</span>
              <span>Airport: VIDP Indira Gandhi Intl</span>
            </div>
          </div>

          <div className="handover-section">
            <h2>9. OUTGOING NOTES</h2>
            <textarea 
              className="handover-notes"
              placeholder="Enter handover notes, special instructions, or focal points for the next shift..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="handover-section">
            <h2>2. FLIGHT STATUS SUMMARY (Next 4 Hours)</h2>
            <table className="handover-table">
              <thead>
                <tr>
                  <th>Flight</th>
                  <th>Status</th>
                  <th>Gate</th>
                  <th>Delay</th>
                  <th>Pax</th>
                </tr>
              </thead>
              <tbody>
                {upcomingFlights.length === 0 ? (
                  <tr><td colSpan={5}>No departures in the next 4 hours.</td></tr>
                ) : upcomingFlights.map(f => (
                  <tr key={f.flight_id} className={f.status === 'DELAYED' ? 'row-delayed' : ''}>
                    <td>{f.flight_id}</td>
                    <td>{f.status}</td>
                    <td>{f.gate || '-'}</td>
                    <td>{f.delay_minutes > 0 ? `${f.delay_minutes}m` : '-'}</td>
                    <td>{f.pax_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="handover-section">
            <h2>3. OPEN INCIDENTS</h2>
            <table className="handover-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {incidents.length === 0 ? (
                  <tr><td colSpan={4}>No active incidents.</td></tr>
                ) : incidents.map(i => (
                  <tr key={i.id}>
                    <td>
                      <span className={i.severity === 'CRITICAL' ? 'handover-badge-red' : 'handover-badge-amber'}>
                        {i.severity}
                      </span>
                    </td>
                    <td>{i.type}</td>
                    <td>{i.message}</td>
                    <td>{new Date(i.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="handover-section">
            <h2>4. BAGGAGE DISCREPANCIES (&lt;98%)</h2>
            <table className="handover-table">
              <thead>
                <tr>
                  <th>Flight</th>
                  <th>Total Bags</th>
                  <th>Missing</th>
                  <th>Reconciliation %</th>
                </tr>
              </thead>
              <tbody>
                {baggageDiscrepancies.length === 0 ? (
                  <tr><td colSpan={4}>All flights within acceptable threshold.</td></tr>
                ) : baggageDiscrepancies.map(uf => (
                  <tr key={uf.flight.flight_id}>
                    <td>{uf.flight.flight_id}</td>
                    <td>{uf.bags.length}</td>
                    <td>{uf.bags.filter(b => b.status === 'Missing').length}</td>
                    <td>
                      <span className={uf.baggageReconciliationRate < 95 ? 'handover-badge-red' : 'handover-badge-amber'}>
                        {uf.baggageReconciliationRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="handover-section">
            <h2>5. SECURITY STATUS</h2>
            <table className="handover-table">
              <thead>
                <tr>
                  <th>CP ID</th>
                  <th>Current Queue</th>
                  <th>Est. Wait</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {cpStatus.size === 0 ? (
                  <tr><td colSpan={4}>No checkpoint data available.</td></tr>
                ) : Array.from(cpStatus.entries()).map(([id, data]) => (
                  <tr key={id}>
                    <td>CP{id}</td>
                    <td>{data.queue} pax</td>
                    <td>
                      <span className={data.wait > 15 ? 'handover-badge-red' : ''}>
                        {data.wait} min
                      </span>
                    </td>
                    <td>{data.wait > 15 ? 'CONGESTED' : 'NORMAL'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="handover-section">
            <h2>6. OPEN MAINTENANCE ITEMS</h2>
            <table className="handover-table">
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Severity</th>
                  <th>Description</th>
                  <th>Flight Impact</th>
                </tr>
              </thead>
              <tbody>
                {openMaintenance.length === 0 ? (
                  <tr><td colSpan={4}>No open maintenance logs.</td></tr>
                ) : openMaintenance.map(m => (
                  <tr key={m.work_order_id}>
                    <td>{m.asset_id}</td>
                    <td>
                      <span className={m.severity >= 4 ? 'handover-badge-red' : 'handover-badge-amber'}>
                        {m.severity}
                      </span>
                    </td>
                    <td>{m.description}</td>
                    <td>{m.flight_id || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="handover-section">
            <h2>7. STAFFING GAPS (Next 4 Hours)</h2>
            <table className="handover-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Terminal</th>
                  <th>Gap Slot</th>
                  <th>Deficit</th>
                </tr>
              </thead>
              <tbody>
                {gaps.length === 0 ? (
                  <tr><td colSpan={4}>No staffing gaps detected.</td></tr>
                ) : gaps.map((g, idx) => (
                  <tr key={idx}>
                    <td>{g.department}</td>
                    <td>{g.terminal}</td>
                    <td>{g.timeSlot}</td>
                    <td>
                      <span className="handover-badge-red">
                        -{g.required - g.assigned} staff
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="handover-section">
            <h2>8. RETAIL SUMMARY</h2>
            <div className="handover-grid">
              <div className="handover-stat-box">
                <div className="handover-stat-label">Total Revenue</div>
                <div className="handover-stat-value">${derivedData.retailSummary.totalRevenue.toLocaleString()}</div>
              </div>
              <div className="handover-stat-box">
                <div className="handover-stat-label">Avg Txn</div>
                <div className="handover-stat-value">${derivedData.retailSummary.avgTransaction.toFixed(2)}</div>
              </div>
              <div className="handover-stat-box">
                <div className="handover-stat-label">Top Category</div>
                <div className="handover-stat-value" style={{ fontSize: '14px' }}>{derivedData.retailSummary.topCategory}</div>
              </div>
              <div className="handover-stat-box">
                <div className="handover-stat-label">Total Txns</div>
                <div className="handover-stat-value">{derivedData.retailSummary.totalTransactions}</div>
              </div>
            </div>
          </div>

          <div className="handover-footer">
            <button className="handover-btn handover-btn-primary" onClick={handleDownloadHTML}>
              <Download size={14} /> Download as HTML
            </button>
            <button className="handover-btn handover-btn-secondary" onClick={handleCopyJSON}>
              {copied ? <Check size={14} color="#00FF88" /> : <Copy size={14} />} 
              {copied ? 'Copied!' : 'Copy JSON'}
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
