// Shared vocabulary for the dashboard: mirrors the CLI server's
// /api/summary response shape (src/dashboard.ts in the CLI).

export interface ProductMetrics {
  total: number;
  today: number;
  signups: number;
  dailyCounts: number[];
  days: string[];
  dau: number | null;
}

export interface ProductSummary {
  name: string;
  platform?: string;
  framework?: string;
  type?: string;
  path?: string;
  createdAt: string;
  metrics: ProductMetrics | null;
  revenue: number;
}

export interface FinanceSummary {
  byProduct: Record<string, number>;
  byMonth: Record<string, number>;
  total: number;
}

export interface DashboardSummary {
  products: ProductSummary[];
  finance: FinanceSummary;
}
