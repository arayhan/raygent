import type { DashboardSummary } from '../domain/summary';

export async function fetchSummary(): Promise<DashboardSummary> {
  const res = await fetch('/api/summary');
  if (!res.ok) throw new Error(`summary request failed with ${res.status}`);
  return (await res.json()) as DashboardSummary;
}
