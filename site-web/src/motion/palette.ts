// MASTER.md colour tokens as plain values, for the two layers that cannot read
// CSS variables: the three.js rings and the particle canvas. Keep in step with
// the @theme block in styles.css.
export const PALETTE = {
  blue: '#5b8cff',
  // Signal White pulled toward the accent: white with a blue cast.
  blueTint: '#c4d4ff',
  indigo: '#7b6bff',
  signalDim: '#b7c1cd',
  signalMute: '#8b98a8',
} as const;
