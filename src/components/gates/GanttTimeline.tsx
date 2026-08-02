import React, { useMemo } from 'react';
import type { GateEvent, Flight } from '../../types/airport';

interface GanttTimelineProps {
  gateId: string;
  events: GateEvent[];
  flights: Flight[];
  currentTime: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function timeToPercent(time: Date, dayStart: Date): number {
  const ms = time.getTime() - dayStart.getTime();
  return Math.max(0, Math.min(100, (ms / DAY_MS) * 100));
}

export const GanttTimeline: React.FC<GanttTimelineProps> = ({ gateId, events, flights, currentTime }) => {
  const dayStart = useMemo(() => {
    const d = new Date(currentTime);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentTime]);

  // Sort events by start time
  const sorted = useMemo(() => {
    return events
      .filter(e => e.actual_start || e.scheduled_start)
      .sort((a, b) => new Date(a.actual_start || a.scheduled_start).getTime() - new Date(b.actual_start || b.scheduled_start).getTime());
  }, [events]);

  // Build bars and gaps
  const bars = useMemo(() => {
    return sorted.map(evt => {
      const start = new Date(evt.actual_start || evt.scheduled_start);
      const end = new Date(evt.actual_end || start.getTime() + (Number(evt.duration_minutes) || 60) * 60000);
      const flight = flights.find(f => f.flight_id === evt.flight_id);
      const status = (flight?.status || 'scheduled').toLowerCase().replace(/\s/g, '');

      return {
        left: timeToPercent(start, dayStart),
        width: Math.max(timeToPercent(end, dayStart) - timeToPercent(start, dayStart), 0.5),
        flightId: evt.flight_id,
        status,
        startTime: start,
        endTime: end,
      };
    });
  }, [sorted, flights, dayStart]);

  // Build gaps between consecutive bars
  const gaps = useMemo(() => {
    const result: { left: number; width: number; minutes: number; severity: string }[] = [];
    for (let i = 0; i < bars.length - 1; i++) {
      const gapStartPct = bars[i].left + bars[i].width;
      const gapEndPct = bars[i + 1].left;
      const gapWidth = gapEndPct - gapStartPct;
      if (gapWidth > 0) {
        const gapMs = bars[i + 1].startTime.getTime() - bars[i].endTime.getTime();
        const gapMin = Math.round(gapMs / 60000);
        let severity = 'ok';
        if (gapMin < 15) severity = 'critical';
        else if (gapMin < 30) severity = 'warn';
        result.push({ left: gapStartPct, width: gapWidth, minutes: gapMin, severity });
      }
    }
    return result;
  }, [bars]);

  const nowPct = timeToPercent(currentTime, dayStart);

  return (
    <div className="gantt-row">
      <div className="gantt-label">{gateId}</div>
      <div className="gantt-bar-container">
        {/* Flight bars */}
        {bars.map((bar, i) => (
          <div
            key={i}
            className={`gantt-bar ${bar.status}`}
            style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
            title={`${bar.flightId} (${bar.status})`}
          >
            {bar.width > 3 ? bar.flightId : ''}
          </div>
        ))}
        {/* Turnaround gaps */}
        {gaps.map((gap, i) => (
          <div
            key={`gap-${i}`}
            className={`gantt-gap ${gap.severity}`}
            style={{ left: `${gap.left}%`, width: `${gap.width}%` }}
            title={`Turnaround: ${gap.minutes}m`}
          >
            {gap.width > 2 ? `${gap.minutes}m` : ''}
          </div>
        ))}
        {/* Current time marker */}
        <div className="gantt-time-line" style={{ left: `${nowPct}%` }}></div>
      </div>
    </div>
  );
};
