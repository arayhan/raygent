import type { ProductMetrics } from '../../domain/summary';

// A real 14-day readout, not a decorative sparkline: bar height is the
// actual daily count, opacity ramps by recency so "today" reads first.
export function ActivityBars({ metrics }: { metrics: ProductMetrics }) {
  const max = Math.max(...metrics.dailyCounts, 1);
  const lastIndex = metrics.dailyCounts.length - 1;

  return (
    <div>
      <p className="signal-label">14-day signal</p>
      <div className="signal-bars" aria-label="events over the last 14 days">
        {metrics.dailyCounts.map((count, i) => {
          const isToday = i === lastIndex;
          const age = lastIndex - i;
          return (
            <i
              key={metrics.days[i]}
              className={isToday ? 'today' : undefined}
              style={{
                height: `${Math.max(6, Math.round((count / max) * 100))}%`,
                opacity: isToday ? 1 : Math.max(0.25, 1 - age * 0.055),
              }}
              title={`${metrics.days[i]}: ${count}`}
            />
          );
        })}
      </div>
    </div>
  );
}
