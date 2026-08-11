import { useOverviewQuery } from './overview.query';
import { ProductRow } from './ProductRow';
import { RingMark } from './RingMark';

export function OverviewPage() {
  const { summary, error } = useOverviewQuery();

  return (
    <div className="page">
      <div className="header">
        <RingMark />
        <h1>raygent dashboard</h1>
      </div>
      <p className="sub">Every product you've shipped, refreshed every 10s. Revenue leads.</p>

      {error !== null && <p className="error">{error}</p>}

      <div className="console">
        {summary === null ? (
          <div className="row-standby">
            <RingMark size={30} />
            <p>Reading signal…</p>
          </div>
        ) : summary.products.length === 0 ? (
          <div className="row-standby">
            <RingMark size={30} />
            <p>
              No products yet. Run <code>raygent init</code> or send an event to <code>/api/ingest</code>.
            </p>
          </div>
        ) : (
          <>
            <div className="console-head">
              <span>Product</span>
              <span>Revenue</span>
              <span>Activity</span>
              <span>Signal</span>
            </div>
            {summary.products.map((product) => (
              <ProductRow key={product.name} product={product} />
            ))}
          </>
        )}
      </div>

      <footer>
        Ingest: <code>{typeof location !== 'undefined' ? `${location.origin}/api/ingest` : '/api/ingest'}</code> — point
        each product's <code>NEXT_PUBLIC_ANALYTICS_URL</code> here.
      </footer>
    </div>
  );
}
