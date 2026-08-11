import type { ProductMetrics } from '../../domain/summary';

export function ActivityBars({ metrics }: { metrics: ProductMetrics }) {
  const max = Math.max(...metrics.dailyCounts, 1);
  return (
    <div className="bars" aria-label="last 14 days of events">
      {metrics.dailyCounts.map((count, i) => (
        <i
          key={metrics.days[i]}
          style={{ height: `${Math.max(6, Math.round((count / max) * 100))}%` }}
          title={`${metrics.days[i]}: ${count}`}
        />
      ))}
    </div>
  );
}
