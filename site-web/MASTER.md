# MASTER: raygent landing page design system (v2)

Single source of truth for `site-web/`. Every colour, size, radius and
duration in the site comes from a token here, mirrored in `src/styles.css`
(`@theme`). The dashboard keeps its own system in the root `DESIGN.md`.

v1 (Rajdhani, cyan accents, glow, texture, kinetic motion) was replaced on
2026-10-08: the owner rejected the font pairing and asked for the whole page
to be minimalist.

## Theses (v2, validated 2026-10-08)

**Visual thesis.** A near-monochrome dark page: void ground, flat charcoal
surfaces, Signal White, Dim and Mute for text and hairlines, and Guardian Cyan
in exactly one role, the fill of the primary button (one per viewport); IBM
Plex Sans throughout, because one engineered superfamily is the least
ornamented voice for a dev tool, headings 600 in sentence case at -0.02em,
body 400, IBM Plex Mono only for commands, paths and terminal output; generous
whitespace on an 8px base; flat 1px hairline plates, 8px radius on the outer
plate only, no gradients, shadows, glows or texture.

**Interaction thesis.** Quiet and precise: opacity-only fades at 500ms on
cubic-bezier(0.16, 1, 0.3, 1) with a 60ms stagger and no slide; hover 160ms
ease-out on colour and border only, plus a 1px underline sweep on text links,
never lift or glow; hero rings in low-opacity white at half the old speed with
about 160 particles and 6px parallax, pause control kept; the flagship line
stays scroll-scrubbed in white and stages light by colour only; terminals type
at 35ms per character; exits 200ms ease-in fade. Forbidden: glow, lift,
bounce, gradient text, glass, texture, any colour beyond the one cyan role.
Reduced motion: static rings, complete flow, final terminal text, no fades.

**v2.1 amendment (validated 2026-10-08).** Visual: lucide line icons at 20px
with a 1.5px stroke sit beside labels, headings and buttons, `signal-mute` at
rest, `signal-white` when their row is active or hovered, cyan only inside the
primary button. Interaction: the features preview panel crossfades (200ms out,
450ms in, opacity only) when the active row changes on scroll; the active row
is marked by colour and a 1px white left rule.

**Allowed patterns:** hero ring rotation (the one loop), hairline rules, typed
terminal, the ring mark, mono only for commands and terminal output, line
icons beside labels, a sticky example panel showing real command output and
real files.

**Still forbidden:** emoji as icons, an icon standing in for a label (the
GitHub mark always sits next to the word or carries an aria-label), filled or
coloured icons.

## Colour

| Token | Value | Use |
|---|---|---|
| `void` | `#0a0d12` | page ground, terminal ground, primary button label |
| `charcoal` | `#161d28` | the few filled surfaces (command chip) |
| `hairline` | `#2a3542` | plate and control borders |
| `hairline-soft` | `#202932` | rows and dividers inside a plate |
| `signal-white` | `#e7edf5` | headings, primary text, focus ring, selection, rings, flow line |
| `signal-dim` | `#b7c1cd` | body copy |
| `signal-mute` | `#8b98a8` | labels, captions, idle states |
| `wash` | `rgba(231, 237, 245, 0.04)` | row hover, own row in the comparison |
| `cyan` | `#4fd3e8` | **primary button fill only** |
| `cyan-bright` | `#7fe0ef` | primary button hover only |

Computed contrast (WCAG): signal-white on void 16.52:1, signal-dim on void
10.68:1, signal-mute on void 6.63:1, signal-mute on charcoal 5.77:1, void on
cyan 10.95:1, void on cyan-bright 12.80:1. `hairline` is decorative only.

## Type

IBM Plex Sans and IBM Plex Mono, self-hosted through `@fontsource` (OFL),
latin subset. Sans 400/500/600, Mono 400/500.

| Role | Face | Size / line-height | Weight | Case, tracking |
|---|---|---|---|---|
| display-xl | Plex Sans | clamp(44px, 7vw, 88px) / 1.0 | 600 | sentence, -0.02em |
| display-l | Plex Sans | clamp(30px, 4vw, 48px) / 1.08 | 600 | sentence, -0.02em |
| title | Plex Sans | 20px / 1.3 | 600 | sentence, -0.01em |
| label | Plex Sans | 12px / 1.3 | 500 | upper, 0.12em |
| body-l | Plex Sans | 18px / 1.65 | 400 | none |
| body | Plex Sans | 16px / 1.65 | 400 | none |
| small | Plex Sans | 14px / 1.55 | 400 | none |
| mono | Plex Mono | 14px / 1.65 | 400 | none, tabular-nums |
| mono-s | Plex Mono | 12.5px / 1.6 | 400 | none |

Body text runs at most 68ch wide.

## Space and shape

Base 8: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. Page gutter
`clamp(16px, 4vw, 32px)`, content max-width 1180px, section rhythm 128px
(80px below 768px). Radius: `plate` 8px (outer plates, terminal), `control`
4px (buttons, chips, tabs), 0 inside a plate. No shadows.

## Motion

| Token | Value | Use |
|---|---|---|
| `ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | every entrance |
| `dur-hover` | 160ms ease-out | hover, focus, press: colour and border only |
| `dur-enter-s` | 450ms | tab panel fade-in |
| `dur-enter` | 500ms | every scroll and load fade |
| `dur-exit` | 200ms ease-in, opacity only | content leaving |
| `stagger` | 60ms | sibling fades |
| `type-char` / `type-line` | 35ms / 120ms | terminal typing, output lines |
| ring speeds | 0.025, -0.045, 0.07, -0.025 rev/s | hero rings, inner to outer |
| ring opacity | 0.6, 0.35, 0.5, 0.25 | inner to outer, white, normal blending |
| particles | 160 at 0.35 opacity | hero |
| parallax | 6px max | hero rings only |

The caret blinks only while a terminal is typing; the ring rotation is the
page's only perpetual loop.

## Components

- **Plate**: transparent, 1px `hairline`, 8px radius, flat. Rows inside are
  divided by `hairline-soft`.
- **Button primary**: `cyan` fill, `void` label, Plex Sans 500 15px, 4px
  radius. Hover `cyan-bright`. Focus 2px `signal-white` outline, 2px offset.
  Disabled 40% opacity. At most one per viewport.
- **Button ghost**: transparent, 1px `hairline`, `signal-white` label. Hover:
  border `signal-mute`, ground `wash`.
- **Text link**: `signal-dim`, hover `signal-white` with a 1px white underline
  sweeping in from the left.
- **Command chip**: `charcoal`, 1px `hairline`, Plex Mono, `$` or `>` prompt in
  `signal-mute`, copy button announcing "Copied" through a live region.
- **Terminal**: `void`, 1px `hairline`, 8px radius, title bar with the
  working directory in mono-s. Real commands and real output only.
- **Tabs**: Plex Sans 500, `signal-mute`; selected `signal-white` with a 1px
  white underline; arrow-key navigation.
- **Matrix marks**: SVG ring (yes, `signal-white`), half ring (partly,
  `signal-mute`), dash (no, `hairline`), each with a visually hidden word.
- **Ring mark**: white strokes, no glow.
- **Icon**: `components/Icon.tsx`, lucide, 20px (18 in buttons, 14 in the
  footer and copy buttons), stroke 1.5, `aria-hidden`, colour inherited.
  `.icon-row` puts it on the first line of the text it labels. The GitHub mark
  is a local SVG (lucide 1.x has no brand marks).
- **Features panel**: rows (icon, name, one-line benefit) with a 1px
  `hairline-soft` left rule, white when active; at `lg` one sticky `.term`
  panel shows the active row's example, below `lg` each example sits under its
  row. Examples are real: CLI output, generated files, README blocks, or the
  exact shape the source writes. Never a drawn imitation.
