// Small formatting helpers shared across components.

/** Tag as uppercase hex with 0x prefix, e.g. 0x3F. */
export const hex = (n: number | null): string =>
  n === null || n === undefined ? '—' : `0x${n.toString(16).toUpperCase()}`;

/** Percentage with 1 decimal, e.g. 33.3%. */
export const pct = (rate: number): string => `${(rate * 100).toFixed(1)}%`;

/** Cycles with up to 2 decimals, trailing zeros trimmed. */
export const cyc = (n: number): string => {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? r.toString() : r.toFixed(2);
};

/** Reduced-motion preference (safe on SSR-less client). */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
