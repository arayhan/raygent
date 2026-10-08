# MASTER: raygent landing page design system

Single source of truth for `site-web/`. Every colour, size, radius, shadow and
duration in the site comes from a token here, mirrored in `src/styles.css`
(`@theme`). The dashboard keeps its own system in the root `DESIGN.md`; this
file extends the same brand, it does not replace it.

## Theses (validated 2026-10-08)

**Visual thesis.** A dark guardian-tech page on raygent's existing tokens: void
to charcoal ground, Signal White text and Guardian Cyan as the only accent
(existing palette and mark preserved); Rajdhani set large, condensed and
uppercase for headlines and labels because it is the brand's own technical
face, system sans for reading, tabular mono for commands and terminal output;
airy section rhythm on an 8px base with dense instrument plates inside;
hairline-bordered sealed plates, 8px radius on the outer plate only, flat
inside, no card grid, cyan glow reserved for the one live element per viewport.

**Interaction thesis.** Kinetic and technical: a three.js hero of the
guardian's segmented tech-rings and circuit particles rotating at different
speeds with gentle pointer parallax; GSAP ScrollTrigger scrubs the flagship
flow line and lights each stage cyan as the line reaches it; terminals type
their command at 35ms per character, then print output; entrances 450 to 700ms
on cubic-bezier(0.16, 1, 0.3, 1) with a 60ms stagger; hover 160ms ease-out with
a cyan hairline sweep and a 2px lift on CTAs and plates, never scale on text.
Forbidden: bounce or elastic, gradient text, glassmorphism, a second accent
hue, scroll-jacking, parallax on body text. Reduced motion: rings static,
diagrams complete, terminals show final text.

**Allowed patterns:** hero ring rotation (the one perpetual loop), cyan glow on
the live element, mono labels for commands, hairline rules, 5% hex/circuit
ambient texture, typed terminal, the ring mark.

## Dials

| Dial | Value | From the thesis clause |
|---|---|---|
| motion | 8 | "kinetic and technical", scrubbed flow, typed terminals, staggered entrances |
| density | 4 | "airy section rhythm on an 8px base with dense instrument plates inside" |
| variance | not sent | the thesis sets no symmetry or experimental-layout clause |

## Colour

One accent. Neutrals carry a slight blue bias toward the cyan.

| Token | Value | Use |
|---|---|---|
| `void` | `#0a0d12` | page ground, terminal ground, text on cyan |
| `charcoal-deep` | `#10151d` | plate gradient end |
| `charcoal` | `#161d28` | plate gradient start, table cells |
| `charcoal-raised` | `#1e2733` | command chip, active tab |
| `hairline` | `#2a3542` | plate borders, control borders |
| `hairline-soft` | `#202932` | rows and dividers inside a plate |
| `signal-white` | `#e7edf5` | headings, primary text |
| `signal-dim` | `#b7c1cd` | body copy |
| `signal-mute` | `#8b98a8` | labels, captions, meta |
| `cyan` | `#4fd3e8` | the accent: live element, primary button, links on hover, ✓ marks |
| `cyan-dim` | `#2f7a8c` | hover borders, partial marks, idle flow line |
| `cyan-wash` | `rgba(79, 211, 232, 0.06)` | row hover, active tab ground |

Computed contrast (WCAG): signal-white on void 16.52:1, signal-dim on charcoal
9.29:1, signal-mute on charcoal 5.77:1 (on charcoal-raised 5.14:1), cyan on void
10.95:1, void on cyan 10.95:1, cyan-dim on void 3.97:1 (marks and borders only,
never text). `hairline` on void is 1.56:1 and is decorative only, never a
boundary a user must find.

No semantic hues. Success, warning and error do not exist on this page; if a
state needs emphasis it gets more cyan (the One Channel Rule from `DESIGN.md`).

## Type

| Role | Face | Size / line-height | Weight | Case, tracking |
|---|---|---|---|---|
| display-xl (hero) | Rajdhani | clamp(52px, 9vw, 116px) / 0.9 | 700 | upper, 0.005em |
| display-l (section) | Rajdhani | clamp(34px, 5vw, 60px) / 0.98 | 700 | upper, 0.01em |
| title | Rajdhani | 22px / 1.2 | 600 | upper, 0.04em |
| label | Rajdhani | 12px / 1.3 | 600 | upper, 0.14em |
| body-l | system sans | 18px / 1.65 | 400 | none |
| body | system sans | 16px / 1.65 | 400 | none |
| small | system sans | 14px / 1.55 | 400 | none |
| mono | system mono | 14px / 1.65 | 400 | none, tabular-nums |
| mono-s | system mono | 12.5px / 1.6 | 400 | none |

Rajdhani is self-hosted (`src/assets/fonts`, OFL), weights 500/600/700.
Mono appears only where the content is a command, a path, a flag or terminal
output. Body text runs at most 68ch wide.

## Space

Base 8. Scale: `1` 4px, `2` 8px, `3` 12px, `4` 16px, `6` 24px, `8` 32px,
`12` 48px, `16` 64px, `24` 96px, `32` 128px.

- Page gutter: `clamp(16px, 4vw, 32px)`; content max-width 1180px.
- Section rhythm: 128px block padding on desktop, 80px below 768px.
- Plate inner padding: 20px; rows inside a plate: 14px x 20px.

## Shape and depth

| Token | Value |
|---|---|
| `radius-plate` | 8px, outer plates and the terminal only |
| `radius-control` | 4px, buttons, tabs, command chip |
| `radius-none` | 0, everything inside a plate |
| `shadow-plate` | `0 1px 0 rgba(255,255,255,0.03) inset, 0 14px 30px -18px rgba(0,0,0,0.65)` |
| `glow-live` | `0 0 16px rgba(79, 211, 232, 0.4)` (text-shadow or drop-shadow), one live element per viewport |

## Motion

| Token | Value | Use |
|---|---|---|
| `ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | every entrance, tab content swap |
| `ease-hover` | `ease-out` | hover and focus transitions |
| `dur-hover` | 160ms | hover, focus, press |
| `dur-enter-s` | 450ms | small items, rows, labels |
| `dur-enter` | 600ms | blocks, plates |
| `dur-enter-l` | 700ms | headlines |
| `dur-exit` | 200ms ease-in, opacity only | content leaving (example tab swap); exit is always subtler than enter |
| `stagger` | 60ms | sibling entrances |
| `type-char` | 35ms | terminal typing per character |
| `type-line` | 120ms | terminal output, per printed line |
| `lift` | -2px translateY | hover on CTAs and plates |
| ring speeds | 0.05, -0.09, 0.14, -0.05 rev/s | hero rings, inner to outer |
| parallax | 10px max | hero rings only, never body text |

Entrances start from a visible resting state for a static capture: content is
readable with JavaScript off. Reduced motion (OS setting): rings render one
static frame, the flow line renders complete with every stage lit, terminals
print final text, entrances are skipped, hover keeps colour changes and drops
the lift.

The terminal caret blinks only while a terminal is typing, then rests solid:
the ring rotation is the page's only perpetual loop.

## Components

- **Plate**: gradient `charcoal` to `charcoal-deep` at 165deg, 1px `hairline`
  border, `radius-plate`, `shadow-plate`. Rows inside are separated by
  `hairline-soft`, flat, no radius.
- **Button primary**: `cyan` fill, `void` text, label type, `radius-control`.
  Hover: lift, `glow-live` box. Focus: 2px `cyan` outline, 2px offset. Active:
  no lift. Disabled: 40% opacity, no lift.
- **Button ghost**: transparent, 1px `hairline` border, `signal-white` text.
  Hover: lift, border `cyan-dim`, a 1px `cyan` underline sweeping in from the
  left over `dur-hover`.
- **Command chip**: `charcoal-raised`, mono, `$ ` prompt in `cyan`, copy button
  that announces "Copied" through a live region.
- **Terminal**: `void` ground, `hairline` border, `radius-plate`, a title bar
  with the working directory in mono-s. Only real commands from the README,
  each one run against the CLI before publishing.
- **Tabs (examples)**: label type, `cyan` 1px underline on the selected tab,
  arrow-key navigation, `aria-selected`.
- **Matrix marks**: inline SVG: full ring (yes, `cyan`), half ring (partly,
  `cyan-dim`), short dash (no, `signal-mute`), each with a visually hidden word.
- **Ring mark**: the dashboard's 36px SVG motif, reused in the header and the
  founder block.
