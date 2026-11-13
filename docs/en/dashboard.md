# Dashboard

`raygent dashboard` serves a local monitoring page for every product you ship: events, signups, daily active users and revenue. `raygent product` keeps the list of products, and `raygent finance` records income.

Think of it as the shop counter ledger: one page shows who came in and what was sold, for every shop you run.

## Quick start

```bash
raygent dashboard                           # http://localhost:4321
raygent finance add my-app 49 "first sale"
raygent finance summary
```

## Commands

| Command | Does |
|---|---|
| `raygent dashboard` | serve the dashboard on port 4321 |
| `raygent dashboard --port <port>` | use another port |
| `raygent product add <name>` | register an existing product (`--platform`, `--framework`, `--type product\|client`) |
| `raygent product list` | list registered products |
| `raygent finance add <product> <amount> [note...]` | record income; the amount is a plain number |
| `raygent finance summary` | revenue totals per product and per month |

Products made with `raygent init` register themselves. Use `product add` for older ones.

## How events arrive

```
your product ── POST /api/ingest ── ~/.raygent/analytics/events.jsonl
                                          │
                       raygent dashboard ─┘── GET /api/summary ── page
```

Send a JSON body with an `event` string:

```bash
curl -X POST http://localhost:4321/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"product":"my-app","event":"email_signup","props":{"userId":"u1"}}'
```

- `product` is optional. Without it, the sender's host name is used.
- An `email_signup` event counts as a signup.
- A `userId` or `sessionId` in `props` makes the daily active user count work.

The landing page template's `track()` sends events once `NEXT_PUBLIC_ANALYTICS_URL` points at the ingest URL. `NEXT_PUBLIC_PRODUCT_ID` overrides the product name.

## Files

| Path | Holds |
|---|---|
| `~/.raygent/products.json` | the product registry |
| `~/.raygent/finance.jsonl` | one income entry per line |
| `~/.raygent/analytics/events.jsonl` | one event per line |

## Troubleshooting

- **`400 expected JSON body with an "event" string`.** The body is not JSON, or has no `event` field.
- **Events from a live site never arrive.** The dashboard runs on your machine. A deployed site cannot reach `localhost`; it only works for local runs.
- **DAU shows nothing.** Your events carry no `userId` or `sessionId` in `props`.
