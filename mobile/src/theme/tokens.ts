// Tokens for the iOS app (tailwind.config.js has the same colours). Surfaces
// follow the block layout: cards (card) on a near-black page (bg).
// Use Tailwind classes for layout; these are for props that take raw values
// (icon colors, SVG fills, shadows, gradients).
export const C = {
  bg: "#0B0B0C",
  card: "#1C1C1E",
  card2: "#2A2A2E",
  /** cards on screens whose own fill is the card colour (profile) */
  raised: "#242428",
  line: "rgba(255,255,255,0.08)",
  t1: "#FFFFFF",
  t2: "#8E8E93",
  t3: "#636366",
  /** placeholder (and the search glass) in inputs */
  hint: "#6B6B73",
  /** the main action colour: lime on near-black, text on it is almost black */
  lime: "#C8FF4A",
  onLime: "#101400",
  /** the accent for tags and highlights */
  cyan: "#3DF2EE",
  onCyan: "#06302F",
  /** switches */
  indigo: "#5468F0",
  danger: "#FF5A6E",
  ok: "#4FE0A0",
} as const;

// Exactly two control heights.
export const H = { lg: 52, sm: 40 } as const;
export const R = { card: 24, tile: 18, sheet: 32, pill: 999 } as const;
// Spacing scale: 4 / 8 / 12 / 16 / 24 / 32.
export const S = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

export function hex(h: string, a: number): string {
  const n = h.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function mixHex(c1: string, c2: string, k: number): string {
  const p = (c: string) => [0, 2, 4].map((i) => parseInt(c.replace("#", "").slice(i, i + 2), 16));
  const a = p(c1), b = p(c2);
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, "0")).join("");
}
