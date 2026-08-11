import { useEffect, useState } from 'react';
import { fetchSummary } from '../../services/api-client';
import type { DashboardSummary } from '../../domain/summary';

const REFRESH_MS = 10_000;

export interface OverviewQuery {
  summary: DashboardSummary | null;
  error: string | null;
}

export function useOverviewQuery(): OverviewQuery {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const next = await fetchSummary();
        if (!cancelled) {
          setSummary(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    }

    void refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return { summary, error };
}
