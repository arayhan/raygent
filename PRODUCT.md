# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary and only user is the CLI's author (a solo developer/founder). They
use `raygent` to scaffold new products (SaaS, client work, landing pages) and
then to monitor every product they've shipped from one place. Checked in
quick, often low-light sessions (late night / early morning, laptop screen,
dim room) — glance-and-go, not a sit-down analysis session.

## Product Purpose

`raygent` is a personal CLI that takes an idea from scaffold to shipped
product (guided interview, real framework scaffolding via a sibling
generator, docs, skills, MCP servers) and then tracks it after it ships:
event volume, DAU/activity, email signups, and manually-logged revenue per
product, via a local dashboard (`raygent dashboard`).

## Positioning

Not a hosted analytics SaaS — a personal, local-first command center. No
accounts, no external service, no auth: it's the founder's own machine,
`~/.raygent/` as the only datastore, `node:http` as the only server. Success
is "glance at localhost:4321, know the state of every product in seconds."

## Operating Context

- Solo use, own machine, own products only — never a multi-tenant or shared
  view.
- `raygent init` auto-registers each product; `POST /api/ingest` receives
  `track()` beacons from shipped products (currently the `landing` scaffold
  template); revenue is logged manually via `raygent finance add`.
- Viewed most often at night/early morning on a laptop in a dim room — glare
  and low contrast are real failure modes, not edge cases.
- Of the four per-product numbers (events, DAU-or-events-today, signups,
  revenue), **revenue is the number that matters most** — it's explicitly
  "what makes this a source of money" for the user. It should read as the
  dominant figure on each card; the others are supporting context.

## Capabilities and Constraints

- Static SPA (Vite + React) built to `dist-web/`, served by the existing
  `node:http` dashboard server — no new runtime dependency may reach the
  published CLI package.
- No accounts/auth; this is not a public-facing surface.
- Data updates by polling `/api/summary` every 10s; no websockets.
- DAU is only real when events carry a `userId`/`sessionId` — otherwise the
  UI must say "events today," never claim DAU it can't back up.

## Brand Commitments

`raygent-avatar.jpg` (repo root, one level up) is the existing brand mark: an
armored, steel-blue guardian dragon rendered in a dark sci-fi/tech register —
charcoal background, glowing cyan circular tech-rings and faint
circuit/hex linework behind it, cool metallic scale and plating for material.
This is the confirmed visual root for anything branded "raygent" going
forward, including the dashboard: dark-first, cyan/steel-blue as the single
accent family, fine circuit/hex linework as an ambient texture (not a
literal dragon anywhere else), layered "plating" depth rather than flat
Bootstrap-style cards.

## Evidence on Hand

- `raygent-avatar.jpg` / `raygent-avatar.jfif` — the brand mark described
  above.
- No other brand assets, no customer logos, no testimonials, no real user
  metrics yet — dashboard content is the user's own (currently empty)
  product data; no fabricated numbers or sample products belong in the
  shipped build.

## Product Principles

1. Local-first and honest: never fabricate a metric (DAU vs. events-today),
   never phone home, never require an account.
2. Revenue leads. Every other number supports the money question.
3. Built for a tired founder at 1am — legible fast, low glare, no hunting.
4. One brand register across every raygent surface: the guardian-dragon
   dark/cyan tech world, not a new palette per surface.
5. The dashboard is Operate-mode: expression never slows down reading the
   state of the business.

## Accessibility & Inclusion

No specific requirement beyond standard contrast/keyboard-focus hygiene
(single low-vision-adjacent constraint already known: low-light viewing, so
contrast and glare matter more than average, not less).
