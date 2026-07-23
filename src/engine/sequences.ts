// ============================================================
// Machine 7 — access-sequence generators
// n = total cache blocks (numCacheBlocks). See the Machine 7 brief.
// ============================================================
import type { TestCaseId } from './types';

const range = (start: number, endExclusive: number): number[] => {
  const out: number[] = [];
  for (let i = start; i < endExclusive; i++) out.push(i);
  return out;
};

/**
 * (a) Sequential: 0..2n-1, then the same run again (twice total).
 * n=4 -> [0..7, 0..7]  (16 accesses).
 */
export function sequential(n: number): number[] {
  const run = range(0, 2 * n);
  return [...run, ...run];
}

/**
 * (b) Mid-repeat: 0..n-1, then 0..2n-1 twice, then the reverse of that pattern
 * (each segment reversed, kept in segment order — matches the brief's worked
 * example n=4 -> 0,1,2,3, 0..7, 0..7, 3,2,1,0, 7..0, 7..0).
 */
export function midRepeat(n: number): number[] {
  const s1 = range(0, n);
  const s2 = range(0, 2 * n);
  const s3 = range(0, 2 * n);
  const forward = [...s1, ...s2, ...s3];
  const reversed = [...[...s1].reverse(), ...[...s2].reverse(), ...[...s3].reverse()];
  return [...forward, ...reversed];
}

/** Minimal deterministic PRNG (mulberry32) so a chosen seed reproduces exactly. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * (c) Random: 64 accesses, block indices in 0..1023.
 * Seeded for a reproducible/deterministic trace.
 */
export function random(count = 64, maxBlockExclusive = 1024, seed = Date.now()): number[] {
  const rng = mulberry32(seed);
  return Array.from({ length: count }, () => Math.floor(rng() * maxBlockExclusive));
}

/**
 * Parse a custom comma/space/newline-separated sequence.
 * Returns { blocks, errors } — invalid tokens and out-of-range values reported.
 */
export function parseCustom(
  input: string,
  maxBlockExclusive = 1024,
): { blocks: number[]; errors: string[] } {
  const errors: string[] = [];
  const blocks: number[] = [];
  const tokens = input
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  for (const tok of tokens) {
    const n = Number(tok);
    if (!Number.isInteger(n)) {
      errors.push(`"${tok}" is not an integer`);
    } else if (n < 0 || n >= maxBlockExclusive) {
      errors.push(`${n} is out of range (0..${maxBlockExclusive - 1})`);
    } else {
      blocks.push(n);
    }
  }
  if (blocks.length === 0 && errors.length === 0) {
    errors.push('Enter at least one block number.');
  }
  return { blocks, errors };
}

/** Build the sequence for a built-in test case. */
export function buildSequence(
  id: TestCaseId,
  n: number,
  opts: { custom?: string; seed?: number } = {},
): { blocks: number[]; errors: string[] } {
  switch (id) {
    case 'sequential':
      return { blocks: sequential(n), errors: [] };
    case 'mid-repeat':
      return { blocks: midRepeat(n), errors: [] };
    case 'random':
      return { blocks: random(64, 1024, opts.seed ?? Date.now()), errors: [] };
    case 'custom':
      return parseCustom(opts.custom ?? '');
    default:
      return { blocks: [], errors: ['Unknown test case'] };
  }
}
