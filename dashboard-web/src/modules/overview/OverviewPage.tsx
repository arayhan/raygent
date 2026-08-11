import { useOverviewQuery } from './overview.query';
import { ProductCard } from './ProductCard';

export function OverviewPage() {
  const { summary, error } = useOverviewQuery();

  return (
    <>
      <h1>raygent dashboard</h1>
      <p className="sub">Products, events, signups, revenue — refreshes every 10s.</p>
      {error !== null && <p className="error">{error}</p>}
      {summary === null ? (
        <div className="empty">Loading…</div>
      ) : summary.products.length === 0 ? (
        <div className="empty">
          No products yet. Run <code>raygent init</code> or send an event to <code>/api/ingest</code>.
        </div>
      ) : (
        <div className="grid">
          {summary.products.map((product) => (
            <ProductCard key={product.name} product={product} />
          ))}
        </div>
      )}
      <footer>
        Ingest: <code>{typeof location !== 'undefined' ? `${location.origin}/api/ingest` : '/api/ingest'}</code> — point
        each product's <code>NEXT_PUBLIC_ANALYTICS_URL</code> here.
      </footer>
    </>
  );
}
