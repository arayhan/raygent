---
name: raygent dashboard
description: A guardian-tech instrument console for the products you've shipped — revenue leads, everything else is signal.
colors:
  void: "#0a0d12"
  charcoal-deep: "#10151d"
  charcoal: "#161d28"
  charcoal-raised: "#1e2733"
  hairline: "#2a3542"
  hairline-soft: "#202932"
  signal-white: "#e7edf5"
  signal-dim: "#b7c1cd"
  signal-mute: "#8b98a8"
  guardian-cyan: "#4fd3e8"
  guardian-cyan-dim: "#2f7a8c"
  alert: "#f0899a"
typography:
  display:
    fontFamily: "Rajdhani, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "23px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  data:
    fontFamily: "ui-monospace, SF Mono, Cascadia Mono, Consolas, Roboto Mono, monospace"
    fontSize: "26px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  label:
    fontFamily: "Rajdhani, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "10.5px"
    fontWeight: 600
    letterSpacing: "0.08em"
rounded:
  panel: "8px"
  none: "0px"
spacing:
  row-y: "14px"
  row-x: "20px"
  page-x: "28px"
components:
  console:
    backgroundColor: "{colors.charcoal}"
    rounded: "{rounded.panel}"
  row:
    backgroundColor: "transparent"
    rounded: "{rounded.none}"
  row-hover:
    backgroundColor: "rgba(79, 211, 232, 0.04)"
  revenue-figure:
    textColor: "{colors.guardian-cyan}"
    typography: "{typography.data}"
---

# Design System: raygent dashboard

## Overview

**Creative North Star: "The Guardian's Instrument Console"**

raygent's brand mark is a steel-blue armored dragon rendered as a
sci-fi guardian statue — glowing cyan tech-rings, dark charcoal ground,
faint circuit linework. The dashboard is that guardian's instrument
panel: a console you check late at night to see the state of everything
it watches over. It does not perform "dashboard." It reads as a single
sealed plate of dark alloy with one live channel — cyan — reserved for
the number that matters and the signal that's still moving.

Built for a solo founder glancing at this on a laptop at 1am: dark by
scene (not by category default), high enough contrast to read fast in a
dim room, and structured as one continuous panel rather than a shelf of
identical boxes, because a guardian's console has one surface, not a
grid of cards pretending to be separate machines.

Rejected explicitly: the generic "dark GitHub card grid" — same-size
bordered tiles, a hero-metric template repeated N times, a random neon
accent with no lineage. Every product here is a row on one console, not
its own floating card.

**Key Characteristics:**
- One accent, no exceptions: cyan/steel-blue (`#4fd3e8`) is the entire
  color vocabulary beyond charcoal and text. Revenue is not a second hue.
- One continuous panel (the "console"), rows divided by hairlines, never
  N separately bordered/shadowed cards.
- Tabular monospace for every number; Rajdhani (condensed, technical,
  self-hosted) for the wordmark and structural labels; system sans for
  reading prose.
- A single authored ambient motion (the ring mark's pulse); everything
  else is a state (hover), not a scattered effect.
- Real data only: DAU is only claimed when events carry an identity;
  otherwise the UI says "events today," never a fabricated DAU.

## Colors

Deliberately narrow: charcoal ground, five-step neutral text scale, one
live accent. The palette is restrained by design — Operate mode, not
Persuade — so nothing competes with the number that matters.

### Primary
- **Guardian Cyan** (`#4fd3e8`): the one accent. Used for the ring mark,
  revenue figures (size and glow carry emphasis, not a second hue),
  today's activity bar, row-hover tint, and the header's watermark ring.
  Never used for anything decorative or unrelated to "this is live/this
  is the number."

### Neutral
- **Void** (`#0a0d12`) / **Charcoal Deep** (`#10151d`) / **Charcoal**
  (`#161d28`): the background stack — page radial gradient, console
  panel gradient stops.
- **Charcoal Raised** (`#1e2733`): reserved for future raised surfaces
  (e.g. code/inline chips).
- **Hairline** (`#2a3542`) / **Hairline Soft** (`#202932`): all dividers
  — console border, row separators, stat-column separators. Never a
  colored border.
- **Signal White** (`#e7edf5`): primary text (product names, stat
  values).
- **Signal Dim** (`#b7c1cd`): secondary body copy (the page subhead).
- **Signal Mute** (`#8b98a8`): tertiary/label text — unit labels, meta
  rows, footer. Verified ≥5.7:1 against both charcoal background stops.

### Named Rules
**The One Channel Rule.** Cyan is the only accent in the system. If a
new element needs emphasis, it gets more of the existing cyan (size,
weight, glow) — never a second hue, however tempting a "success green"
or "warning amber" feels. A second hue always means "extend this rule
first," not "add an exception."

## Typography

**Display Font:** Rajdhani (self-hosted, weights 500/600/700), falling
back to the system sans stack.
**Body Font:** system sans stack (`-apple-system, Segoe UI, Roboto...`).
**Data Font:** system monospace stack (`ui-monospace, SF Mono,
Cascadia Mono, Consolas, Roboto Mono`).

**Character:** Rajdhani is a condensed, geometric, faintly technical
face — it carries the console's identity in the wordmark and every
structural label without behaving like a marketing display face. The
system sans stays out of the way for reading prose. The monospace face
is not a "technical" costume; it's used exactly where the content is
itself a measurement (revenue, event counts, DAU) so figures line up
and read as instrument-panel data.

### Hierarchy
- **Display** (700, 23px, uppercase, 0.01em tracking): the `raygent
  dashboard` wordmark only.
- **Label** (600, 9–10.5px, uppercase, 0.05–0.08em tracking): column
  headers, stat unit labels, meta rows (platform/framework/type),
  "14-day signal."
- **Title** (600, 16px): each row's product name.
- **Data** (600, 14–26px, tabular-nums, monospace): every numeric
  readout. Revenue is the large instance (26px); events/DAU/signups are
  the compact instance (14px).
- **Body** (400, 12.5–14px): the page subhead and footer sentence.

### Named Rules
**The Tabular Numerals Rule.** Any number a user compares across rows
(revenue, events, signups) renders in the monospace data face with
`font-variant-numeric: tabular-nums`. Never let two rows' figures
misalign because a proportional face reflowed a digit.

## Layout

Single-column page, max-width 1180px, centered. One `.console` panel
holds a column-header row (hidden below 720px) followed by one full-width
row per product; rows are pure vertical stacking inside the panel, not a
multi-column grid. This is deliberate: a card grid leaves dead space
around a single low-count product; a row list degrades to one compact
row instead (verified: the single-product state renders as one snug row,
not an oversized empty grid).

Row internals use CSS grid (`1.4fr 0.9fr 1.3fr 1fr`: product / revenue /
activity stats / 14-day signal) on desktop; below 720px this collapses
to a single stacked column per row, in reading order product → revenue →
stats → signal, with the column-header row hidden (labels move inline
via each stat's own `<span>`).

Page padding: 32px top, 28px sides, 48px bottom (22px/16px/36px on
narrow viewports). Row padding: 14px vertical, 20px horizontal.

## Elevation & Depth

Two-tier, not scattered: the console panel itself has real depth (an
inset top highlight plus a soft offset+blur drop shadow — never a flat
zero-blur block), and everything inside it is flat. Rows carry no
individual shadow or border-radius; hairlines do the separation. This
keeps the "one sealed instrument" reading — depth belongs to the whole
plate, not to N little cards floating independently.

### Shadow Vocabulary
- **console-lift** (`box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 14px 30px -18px rgba(0,0,0,0.65)`): the only shadow in the system, applied once to `.console`.
- **revenue-glow** (`text-shadow: 0 0 16px rgba(79,211,232,0.4)`): not a box shadow — a text-shadow glow on the revenue figure and the ring mark's SVG `drop-shadow`, the accent's only "lit" treatment.

### Named Rules
**The One Plate Rule.** Depth (shadow, elevation) is authored once, on
the console panel. An individual row, stat, or label never gets its own
shadow — that would fracture the "one sealed console" back into a card
grid.

## Shapes

8px radius on the console panel only (`--radius`); every internal
division (rows, stat columns, header/row split) is a straight hairline,
0 radius. No pill shapes, no per-element rounding. The ring mark and its
large background watermark are circles (the one deliberate curved
motif, echoing the brand mark's tech-rings), not a shape language
applied elsewhere.

## Components

### Console (signature component)
The whole page's one structural component: a bordered, gradient-filled
plate (`charcoal` → `charcoal-deep`, 165deg) containing a header row and
N product rows. See Layout and Elevation for its grid and shadow.

### Product Row
- **Structure:** product name + meta (title case name, uppercase
  platform/framework/type meta) · revenue figure + label · a 3-up stat
  trio (events / DAU-or-events-today / signups) separated by hairlines,
  never colored borders · a 14-day activity readout.
- **Divider:** 1px `hairline-soft` top border; first row has none.
- **Hover:** `rgba(79,211,232,0.04)` background wash, 140ms — the row's
  only interactive state (no lift, no shadow-in).
- **Empty:** a single centered "standby" row (ring mark + message)
  replaces the header+rows when there are zero products; the same
  console shell, not a separate empty-state component.

### Revenue Figure
- **Style:** monospace, 26px/600, `guardian-cyan`, tabular-nums, a
  16px-blur cyan text-shadow. This is the system's only "glowing" text —
  reserved for the metric PRODUCT.md names as the one that matters.

### Activity Readout ("14-day signal")
- **Style:** a row of thin bars, one per day, height mapped to that
  day's real event count (never decorative/random) — `min-height: 2px`
  floor so a zero day still shows a hairline. Opacity ramps down by
  recency (today = 1.0, oldest ≈0.25) so "today" reads first without a
  second color. Today's bar additionally carries the accent glow.
- **Named Rule — The Real Signal Rule.** This readout only ever encodes
  real per-day counts. It is never used as decoration standing in for
  data that isn't there.

### Ring Mark
- **Style:** a small (36px) SVG — a static outer ring, a pulsing
  mid-ring, and a pulsing center dot, all `guardian-cyan`, with a
  `drop-shadow` glow. Used in the header and the standby row.
- **The page's one authored ambient motion** — a 3.2s ease-in-out
  opacity pulse (0.55 → 1 → 0.55). Nothing else on the page animates
  ambiently; `prefers-reduced-motion` disables it.
- A second, larger (220px), fully static, 5%-opacity version sits behind
  the header as a watermark — same motif, no animation, purely a bigger
  brand surface than the 36px icon alone.

### Ambient Texture
A low-opacity (5% stroke) repeating hex/circuit SVG tile sits behind the
page's radial gradient (layered *above* it, since CSS background layers
paint first-listed-on-top and the gradient is opaque — the texture must
be the top layer to be visible at all). Purely atmospheric; never placed
where it could reduce text contrast.

## Do's and Don'ts

### Do:
- **Do** keep revenue the largest, only-glowing figure on every row —
  it's the number PRODUCT.md names as the one that matters.
- **Do** add new products as new rows in the existing console, never as
  a new card or a second console.
- **Do** use the monospace data face for any new numeric readout that
  gets compared across rows.
- **Do** keep hairlines as the only divider language; no colored
  `border-left`/`border-right` on any element.
- **Do** say "events today" (never DAU) when events carry no
  `userId`/`sessionId` — real signal only, per PRODUCT.md.

### Don't:
- **Don't** introduce a second accent hue for anything (status, success,
  warning). Extend the One Channel Rule instead — cyan, more or less of
  it.
- **Don't** wrap a product's row in its own border, shadow, or
  border-radius. That regresses the console back into a card grid — the
  exact pattern this system replaced.
- **Don't** add a second ambient animation. The ring mark's pulse is the
  system's one authored moment; new motion belongs on an interaction
  state (hover/focus), not the ambient page.
- **Don't** use a sparkline, progress ring, or bar chart as decoration.
  If it's on the page, it renders real per-row data or it doesn't exist.
