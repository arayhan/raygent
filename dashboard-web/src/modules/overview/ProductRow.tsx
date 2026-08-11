import type { ProductSummary } from '../../domain/summary';
import { ActivityBars } from './ActivityBars';

const fmt = new Intl.NumberFormat();

export function ProductRow({ product }: { product: ProductSummary }) {
  const m = product.metrics;
  const meta = [product.platform, product.framework, product.type].filter(Boolean).join(' / ');

  return (
    <div className="row">
      <div className="row-id">
        <h2>{product.name}</h2>
        <p className="meta">{meta || ' '}</p>
      </div>

      <div className="row-revenue">
        <span className="revenue-value">{fmt.format(product.revenue)}</span>
        <span className="revenue-label">revenue</span>
      </div>

      <div className="row-stats">
        <div className="stat">
          <b>{m ? fmt.format(m.total) : '0'}</b>
          <span>events</span>
        </div>
        <div className="stat">
          <b>{m === null ? '–' : m.dau === null ? fmt.format(m.today) : fmt.format(m.dau)}</b>
          <span>{m === null ? 'no data' : m.dau === null ? 'events today' : 'DAU'}</span>
        </div>
        <div className="stat">
          <b>{m ? fmt.format(m.signups) : '0'}</b>
          <span>signups</span>
        </div>
      </div>

      {m ? <ActivityBars metrics={m} /> : <p className="no-events">No events yet</p>}
    </div>
  );
}
