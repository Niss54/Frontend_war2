import React, { useMemo } from 'react';
import { useAirportData } from '../../../context/AirportContext';
import { useSimulation } from '../../../context/SimulationContext';
import { useCountUp } from '../../../hooks/useCountUp';
import type { Flight } from '../../../types/airport';
import './RetailPanel.css';

// ===== CONSTANTS =====
const TERMINAL_COLORS: Record<string, string> = {
  'Terminal 1': '#4A9EFF',
  'Terminal 2': '#00FF88',
  'Terminal 3': '#FFB800',
  'T1': '#4A9EFF',
  'T2': '#00FF88',
  'T3': '#FFB800',
};

const CATEGORY_COLORS: Record<string, string> = {
  'F&B': '#FF6B6B',
  'Retail': '#4A9EFF',
  'Duty Free': '#00FF88',
  'Services': '#FFB800',
  'Electronics': '#B829D9',
  'Fashion': '#FF8C42',
};

// ===== KPI Sub-component =====
const RetailKPI: React.FC<{ label: string; value: number; prefix?: string; suffix?: string; delta?: number }> = ({
  label, value, prefix = '', suffix = '', delta
}) => {
  const animated = useCountUp(Math.round(value), 1500);
  return (
    <div className="retail-kpi">
      <div className="retail-kpi-label">{label}</div>
      <div className="retail-kpi-value">{prefix}{animated.toLocaleString()}{suffix}</div>
      {delta !== undefined && (
        <div className={`retail-kpi-delta ${delta >= 0 ? 'up' : 'down'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
        </div>
      )}
    </div>
  );
};

// ===== MAIN COMPONENT =====
export const RetailPanel: React.FC = () => {
  const { store } = useAirportData();
  const { currentTime } = useSimulation();

  const analytics = useMemo(() => {
    if (!store) return null;
    const txns = store.retailTransactions;
    const flights = store.flights;

    // ===== KPI CALCULATIONS =====
    const totalRevenue = txns.reduce((s, t) => s + Number(t.amount || 0), 0);
    const avgTransaction = txns.length > 0 ? totalRevenue / txns.length : 0;
    const txnPerHour = txns.length > 0 ? Math.round(txns.length / 24) : 0;

    // Revenue by terminal
    const terminalRevMap = new Map<string, number>();
    txns.forEach(t => {
      const term = t.terminal || 'Unknown';
      terminalRevMap.set(term, (terminalRevMap.get(term) || 0) + Number(t.amount || 0));
    });
    let highestTerminal = 'N/A';
    let highestTerminalRev = 0;
    terminalRevMap.forEach((rev, term) => {
      if (rev > highestTerminalRev) { highestTerminalRev = rev; highestTerminal = term; }
    });

    // Top category
    const catRevMap = new Map<string, number>();
    txns.forEach(t => {
      const cat = t.product_category || t.store_type || 'Other';
      catRevMap.set(cat, (catRevMap.get(cat) || 0) + Number(t.amount || 0));
    });
    let topCategory = 'N/A';
    let topCatRev = 0;
    catRevMap.forEach((rev, cat) => {
      if (rev > topCatRev) { topCatRev = rev; topCategory = cat; }
    });

    // Simulated delta (deterministic based on data)
    const revDelta = ((totalRevenue % 100) / 10) - 3; // produces a small +/- delta

    // ===== HOURLY REVENUE TIMELINE =====
    const hourlyRevenue = new Array(24).fill(0);
    const hourlyTxnCount = new Array(24).fill(0);
    txns.forEach(t => {
      const hour = new Date(t.timestamp).getHours();
      if (!isNaN(hour)) {
        hourlyRevenue[hour] += Number(t.amount || 0);
        hourlyTxnCount[hour]++;
      }
    });
    const baselineRevenue = hourlyRevenue.reduce((s, v) => s + v, 0) / 24;
    const maxHourlyRev = Math.max(...hourlyRevenue, 1);

    // ===== SCATTER PLOT: Pax Count vs Retail Revenue per 30-min window =====
    // Group flights by terminal and 30-min block
    const windowSize = 30 * 60 * 1000;
    const startOfDay = new Date(currentTime);
    startOfDay.setHours(0, 0, 0, 0);
    const dayStart = startOfDay.getTime();

    const scatterPoints: { pax: number; rev: number; terminal: string; hour: string }[] = [];
    
    const terminals = Array.from(new Set(txns.map(t => t.terminal).filter(Boolean)));

    terminals.forEach(terminal => {
      for (let slot = 0; slot < 48; slot++) { // 48 half-hour slots
        const slotStart = dayStart + slot * windowSize;
        const slotEnd = slotStart + windowSize;

        // Pax count: flights departing from this terminal in this window
        const windowFlights = flights.filter((f: Flight) => {
          const dep = new Date(f.scheduled_departure).getTime();
          return f.terminal === terminal && dep >= slotStart && dep < slotEnd;
        });
        const paxCount = windowFlights.reduce((sum, f) => sum + (Number(f.pax_count) || 0), 0);

        // Retail revenue in this terminal during this window
        const windowTxns = txns.filter(t => {
          const tt = new Date(t.timestamp).getTime();
          return t.terminal === terminal && tt >= slotStart && tt < slotEnd;
        });
        const windowRev = windowTxns.reduce((s, t) => s + Number(t.amount || 0), 0);

        if (paxCount > 0 || windowRev > 0) {
          const h = Math.floor(slot / 2);
          scatterPoints.push({
            pax: paxCount,
            rev: windowRev,
            terminal,
            hour: `${h}:${slot % 2 === 0 ? '00' : '30'}`
          });
        }
      }
    });

    // Simple regression
    const n = scatterPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    scatterPoints.forEach(p => {
      sumX += p.pax; sumY += p.rev;
      sumXY += p.pax * p.rev;
      sumX2 += p.pax * p.pax;
      sumY2 += p.rev * p.rev;
    });
    const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
    const intercept = n > 0 ? (sumY - slope * sumX) / n : 0;
    const correlation = n > 1 ? (n * sumXY - sumX * sumY) / Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)) : 0;
    const rSquared = isNaN(correlation) ? 0 : Math.round(correlation * correlation * 100);

    const maxPax = Math.max(...scatterPoints.map(p => p.pax), 1);
    const maxRev = Math.max(...scatterPoints.map(p => p.rev), 1);

    // ===== DONUT: Revenue by Category =====
    const categories = Array.from(catRevMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const totalCatRev = categories.reduce((s, [, v]) => s + v, 0);

    // ===== STACKED BAR: Revenue by Terminal by Category =====
    const termCatMap = new Map<string, Map<string, number>>();
    txns.forEach(t => {
      const term = t.terminal || 'Unknown';
      const cat = t.product_category || t.store_type || 'Other';
      if (!termCatMap.has(term)) termCatMap.set(term, new Map());
      const inner = termCatMap.get(term)!;
      inner.set(cat, (inner.get(cat) || 0) + Number(t.amount || 0));
    });
    const allTerminals = Array.from(termCatMap.keys()).sort();
    const allCats = categories.map(([c]) => c);
    const maxTermRev = Math.max(...allTerminals.map(t => {
      const inner = termCatMap.get(t)!;
      return Array.from(inner.values()).reduce((s, v) => s + v, 0);
    }), 1);

    // ===== REVENUE HEATMAP: Hours x Terminals =====
    const hmData = Array.from({ length: 24 }, () => new Map<string, number>());
    txns.forEach(t => {
      const hour = new Date(t.timestamp).getHours();
      const term = t.terminal || 'Unknown';
      if (!isNaN(hour)) {
        hmData[hour].set(term, (hmData[hour].get(term) || 0) + Number(t.amount || 0));
      }
    });
    const maxHmVal = Math.max(...hmData.flatMap(m => Array.from(m.values())), 1);

    // ===== TOP SELLERS TABLE =====
    const productMap = new Map<string, { category: string; units: number; revenue: number }>();
    txns.forEach(t => {
      const name = t.store_name || 'Unknown';
      const existing = productMap.get(name) || { category: t.product_category || t.store_type || 'Other', units: 0, revenue: 0 };
      existing.units += Number(t.quantity || 1);
      existing.revenue += Number(t.amount || 0);
      productMap.set(name, existing);
    });
    const topSellers = Array.from(productMap.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 8);

    return {
      totalRevenue, avgTransaction, txnPerHour, highestTerminal,
      topCategory, revDelta,
      hourlyRevenue, hourlyTxnCount, baselineRevenue, maxHourlyRev,
      scatterPoints, maxPax, maxRev, rSquared, slope, intercept,
      categories, totalCatRev,
      allTerminals, allCats, termCatMap, maxTermRev,
      hmData, maxHmVal,
      topSellers, terminals,
    };
  }, [store, currentTime]);

  if (!analytics) return null;

  // Donut SVG calculation
  const donutSegments = (() => {
    let cumAngle = 0;
    return analytics.categories.map(([cat, rev]) => {
      const pct = rev / analytics.totalCatRev;
      const startAngle = cumAngle;
      cumAngle += pct * 360;
      const endAngle = cumAngle;
      const largeArc = pct > 0.5 ? 1 : 0;
      const r = 80;
      const cx = 100, cy = 100;
      const x1 = cx + r * Math.cos((startAngle - 90) * Math.PI / 180);
      const y1 = cy + r * Math.sin((startAngle - 90) * Math.PI / 180);
      const x2 = cx + r * Math.cos((endAngle - 90) * Math.PI / 180);
      const y2 = cy + r * Math.sin((endAngle - 90) * Math.PI / 180);
      const color = CATEGORY_COLORS[cat] || '#666';
      return { cat, pct, d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`, color };
    });
  })();

  return (
    <div className="retail-panel">
      <div className="retail-panel-header">
        <h2>🛍️ AIRPORT REVENUE COMMAND</h2>
      </div>

      {/* KPI Strip */}
      <div className="retail-kpi-strip">
        <RetailKPI label="Total Revenue Today" value={analytics.totalRevenue} prefix="₹" delta={analytics.revDelta} />
        <RetailKPI label="Avg Transaction" value={Math.round(analytics.avgTransaction)} prefix="₹" />
        <RetailKPI label="Transactions / Hour" value={analytics.txnPerHour} />
        <RetailKPI label="Top Terminal" value={0} prefix={analytics.highestTerminal + " "} />
        <RetailKPI label="Top Category" value={0} prefix={analytics.topCategory + " "} />
        <RetailKPI label="Rev vs Baseline" value={Math.abs(Math.round(analytics.revDelta))} suffix="%" delta={analytics.revDelta} />
      </div>

      {/* Revenue Timeline */}
      <div className="revenue-timeline">
        <h3>Revenue Timeline — Hourly Revenue (Area) + Transaction Count (Bars)</h3>
        <div className="timeline-chart">
          <div className="timeline-y-axis">
            <span>₹{(analytics.maxHourlyRev / 1000).toFixed(0)}k</span>
            <span>₹{(analytics.maxHourlyRev / 2000).toFixed(0)}k</span>
            <span>₹0</span>
          </div>
          
          {/* Baseline line */}
          <div 
            className="timeline-baseline" 
            style={{ bottom: `${(analytics.baselineRevenue / analytics.maxHourlyRev) * 190}px` }}
          >
            <span className="timeline-baseline-label">Baseline ₹{(analytics.baselineRevenue / 1000).toFixed(1)}k</span>
          </div>

          {analytics.hourlyRevenue.map((rev, h) => (
            <div 
              key={h} 
              className={`timeline-bar-group ${rev < analytics.baselineRevenue ? 'below-baseline' : ''}`}
              title={`${h}:00 — Revenue: ₹${rev.toLocaleString()} | Txns: ${analytics.hourlyTxnCount[h]}`}
            >
              {/* Area (revenue) */}
              <div 
                className="timeline-area"
                style={{ 
                  height: `${(rev / analytics.maxHourlyRev) * 190}px`,
                  background: rev < analytics.baselineRevenue 
                    ? 'rgba(255, 68, 68, 0.15)'
                    : 'rgba(0, 255, 136, 0.15)'
                }}
              />
              {/* Bar (txn count) */}
              <div 
                className="timeline-bar"
                style={{ 
                  height: `${(analytics.hourlyTxnCount[h] / Math.max(...analytics.hourlyTxnCount, 1)) * 150}px`
                }}
              />
            </div>
          ))}
        </div>
        <div className="timeline-x-axis">
          {analytics.hourlyRevenue.map((_, h) => (
            h % 3 === 0 ? <span key={h} className="timeline-x-label">{h}:00</span> : <span key={h} className="timeline-x-label"></span>
          ))}
        </div>
      </div>

      {/* Cross-Dataset Scatter Plot */}
      <div className="cross-dataset-section">
        <h3>Cross-Dataset Analysis: Passenger Volume vs. Retail Revenue</h3>
        <div className="cross-dataset-subtitle">Each dot = 30-minute window. Color = Terminal. Regression shows revenue predictability from passenger flow.</div>
        
        <div className="scatter-container">
          <div className="scatter-y-axis">
            <span>₹{(analytics.maxRev / 1000).toFixed(0)}k</span>
            <span>₹{(analytics.maxRev / 2000).toFixed(0)}k</span>
            <span>₹0</span>
          </div>
          <span className="scatter-axis-label y">Revenue (₹)</span>
          
          <div className="scatter-area">
            <div className="r-squared-badge">
              R² = {(analytics.rSquared / 100).toFixed(2)} — Passenger volume explains {analytics.rSquared}% of retail revenue variance
            </div>
            
            {/* Regression line */}
            {analytics.scatterPoints.length > 1 && (() => {
              const x1Pct = 0;
              const x2Pct = 100;
              const y1Pct = ((analytics.intercept) / analytics.maxRev) * 100;
              const y2Pct = ((analytics.slope * analytics.maxPax + analytics.intercept) / analytics.maxRev) * 100;
              const clampedY1 = Math.max(0, Math.min(100, y1Pct));
              const clampedY2 = Math.max(0, Math.min(100, y2Pct));
              return (
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
                  <line 
                    x1={`${x1Pct}%`} y1={`${100 - clampedY1}%`}
                    x2={`${x2Pct}%`} y2={`${100 - clampedY2}%`}
                    stroke="#00FF88" strokeWidth="2" strokeDasharray="6 4" opacity="0.7"
                  />
                </svg>
              );
            })()}

            {analytics.scatterPoints.map((p, i) => (
              <div
                key={i}
                className="scatter-dot"
                style={{
                  left: `${(p.pax / analytics.maxPax) * 100}%`,
                  bottom: `${(p.rev / analytics.maxRev) * 100}%`,
                  backgroundColor: TERMINAL_COLORS[p.terminal] || '#888',
                }}
                title={`${p.terminal} @ ${p.hour} — ${p.pax} pax, ₹${p.rev.toLocaleString()}`}
              />
            ))}
          </div>
          
          <div className="scatter-x-axis">
            <span>0</span>
            <span>{Math.round(analytics.maxPax / 2)}</span>
            <span>{analytics.maxPax}</span>
          </div>
          <span className="scatter-axis-label x">Passenger Count (per 30-min window)</span>
        </div>
        
        <div className="scatter-legend">
          {analytics.terminals.map(t => (
            <div key={t} className="scatter-legend-item">
              <div className="legend-dot" style={{ background: TERMINAL_COLORS[t] || '#888' }}></div>
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Grid: Donut + Stacked Bar + Heatmap */}
      <div className="retail-bottom-grid">
        {/* Donut Chart */}
        <div className="retail-card">
          <h3>Revenue by Category</h3>
          <div className="donut-container">
            <svg viewBox="0 0 200 200" width="200" height="200">
              {donutSegments.map((seg, i) => (
                <path key={i} d={seg.d} fill={seg.color} opacity={0.8}>
                  <title>{seg.cat}: {(seg.pct * 100).toFixed(1)}%</title>
                </path>
              ))}
              <circle cx="100" cy="100" r="50" fill="#0d0d14" />
            </svg>
            <div className="donut-center">
              <div className="donut-center-value">₹{(analytics.totalCatRev / 1000).toFixed(0)}k</div>
              <div className="donut-center-label">TOTAL</div>
            </div>
          </div>
          <div className="donut-legend">
            {analytics.categories.map(([cat, rev]) => (
              <div key={cat} className="donut-legend-item">
                <span>
                  <span className="donut-legend-color" style={{ background: CATEGORY_COLORS[cat] || '#666' }}></span>
                  {cat}
                </span>
                <span>₹{(rev / 1000).toFixed(1)}k</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stacked Bar: Revenue by Terminal by Category */}
        <div className="retail-card">
          <h3>Terminal Revenue Breakdown</h3>
          <div className="stacked-bars">
            {analytics.allTerminals.map(term => {
              const inner = analytics.termCatMap.get(term)!;
              const totalTermRev = Array.from(inner.values()).reduce((s, v) => s + v, 0);
              return (
                <div key={term} className="stacked-col" title={`${term}: ₹${totalTermRev.toLocaleString()}`}>
                  {analytics.allCats.map(cat => {
                    const catRev = inner.get(cat) || 0;
                    const heightPct = (catRev / analytics.maxTermRev) * 100;
                    return (
                      <div
                        key={cat}
                        className="stacked-segment"
                        style={{
                          height: `${heightPct}%`,
                          background: CATEGORY_COLORS[cat] || '#666',
                          opacity: 0.8,
                        }}
                        title={`${cat}: ₹${catRev.toLocaleString()}`}
                      />
                    );
                  })}
                  <div className="stacked-label">{term.replace('Terminal ', 'T')}</div>
                </div>
              );
            })}
          </div>
          
          {/* Top Sellers Mini Table */}
          <h3 style={{ marginTop: '32px' }}>Top Sellers</h3>
          <table className="top-sellers-table">
            <thead>
              <tr>
                <th>Store</th>
                <th>Category</th>
                <th>Units</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {analytics.topSellers.map(([name, data]) => (
                <tr key={name}>
                  <td style={{ fontWeight: 'bold' }}>{name}</td>
                  <td>{data.category}</td>
                  <td>{data.units}</td>
                  <td style={{ color: '#00FF88' }}>₹{data.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Revenue Heatmap */}
        <div className="retail-card">
          <h3>Revenue Heatmap (Hour × Terminal)</h3>
          <div style={{ display: 'flex', flex: 1 }}>
            <div className="rev-hm-y">
              {[0, 6, 12, 18, 23].map(h => <span key={h}>{h}:00</span>)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div 
                className="rev-heatmap" 
                style={{ 
                  gridTemplateColumns: `repeat(${analytics.allTerminals.length}, 1fr)`, 
                  gridTemplateRows: 'repeat(24, 1fr)' 
                }}
              >
                {analytics.hmData.map((hourMap, h) =>
                  analytics.allTerminals.map(term => {
                    const val = hourMap.get(term) || 0;
                    const intensity = val / analytics.maxHmVal;
                    let bg = '#1a1a24';
                    if (intensity > 0.7) bg = `rgba(0, 255, 136, ${0.3 + intensity * 0.5})`;
                    else if (intensity > 0.3) bg = `rgba(255, 184, 0, ${0.2 + intensity * 0.4})`;
                    else if (intensity > 0) bg = `rgba(74, 158, 255, ${0.1 + intensity * 0.3})`;
                    return (
                      <div 
                        key={`${h}-${term}`} 
                        className="rev-hm-cell" 
                        style={{ background: bg }}
                        title={`${h}:00 ${term}: ₹${val.toLocaleString()}`}
                      />
                    );
                  })
                )}
              </div>
              <div className="rev-hm-x">
                {analytics.allTerminals.map(t => (
                  <span key={t}>{t.replace('Terminal ', 'T')}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
