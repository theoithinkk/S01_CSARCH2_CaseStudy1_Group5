// ============================================================
// Stats/timing formula tests.
// ============================================================
import { describe, it, expect } from 'vitest';
import { computeStats, missPenalty, DEFAULT_TIMING } from '../stats';
import type { CacheConfig } from '../types';

const configLoadThrough: CacheConfig = {
  numCacheBlocks: 8,
  blockSize: 4,
  associativity: 4,
  readPolicy: 'load-through',
};
const configNonLoadThrough: CacheConfig = { ...configLoadThrough, readPolicy: 'non-load-through' };
const configDefaultB16: CacheConfig = { ...configLoadThrough, numCacheBlocks: 16, blockSize: 16 };

describe('missPenalty', () => {
  it('load-through: Tm + Tb*blockSize (4-word block -> 14 cycles per §6.1)', () => {
    expect(missPenalty(configLoadThrough)).toBe(14);
  });
  it('non-load-through: Tm only (10 cycles regardless of block size)', () => {
    expect(missPenalty(configNonLoadThrough)).toBe(10);
  });
  it('default 16-word block, load-through -> 26 cycles (README §2)', () => {
    expect(missPenalty(configDefaultB16)).toBe(26);
  });
});

describe('computeStats — hit/miss rate always sum to 1 for nonzero accesses', () => {
  it.each([
    [0, 12],
    [4, 8],
    [12, 0],
    [1, 1],
    [7, 3],
  ])('hits=%i misses=%i', (hits, misses) => {
    const stats = computeStats('LRU', configLoadThrough, hits, misses);
    expect(stats.hitRate + stats.missRate).toBeCloseTo(1, 10);
    expect(stats.totalAccesses).toBe(hits + misses);
  });
});

describe('computeStats — AMAT formula matches §6.2 for both read policies', () => {
  it('load-through: AMAT = 1 + missRate * 13', () => {
    const stats = computeStats('LRU', configLoadThrough, 4, 8); // missRate = 8/12
    const expected = 1 + (8 / 12) * 13;
    expect(stats.amat).toBeCloseTo(expected, 10);
    expect(stats.amat).toBeCloseTo(9.6667, 3);
  });

  it('non-load-through: AMAT = 1 + missRate * 9', () => {
    const stats = computeStats('LRU', configNonLoadThrough, 4, 8);
    const expected = 1 + (8 / 12) * 9;
    expect(stats.amat).toBeCloseTo(expected, 10);
    expect(stats.amat).toBeCloseTo(7.0, 6);
  });

  it('totalAccessTime = hits*Th + misses*Pmiss (load-through)', () => {
    const stats = computeStats('LRU', configLoadThrough, 4, 8);
    expect(stats.totalAccessTime).toBe(4 * 1 + 8 * 14);
    expect(stats.totalAccessTime).toBe(116);
  });

  it('totalAccessTime = hits*Th + misses*Pmiss (non-load-through)', () => {
    const stats = computeStats('LRU', configNonLoadThrough, 4, 8);
    expect(stats.totalAccessTime).toBe(4 * 1 + 8 * 10);
    expect(stats.totalAccessTime).toBe(84);
  });

  it('AMAT is consistent between the two equivalent formulas (Th + MissRate*(Pmiss-Th) vs HitRate*Th + MissRate*Pmiss)', () => {
    const hits = 5, misses = 11;
    const stats = computeStats('MRU', configLoadThrough, hits, misses);
    const hitRate = hits / (hits + misses);
    const missRate = misses / (hits + misses);
    const alt = hitRate * DEFAULT_TIMING.hitTime + missRate * missPenalty(configLoadThrough);
    expect(stats.amat).toBeCloseTo(alt, 10);
  });
});

describe('computeStats — zero-accesses edge case', () => {
  const stats = computeStats('LRU', configLoadThrough, 0, 0);

  it('does not throw / produce NaN; hitRate and missRate both default to 0', () => {
    expect(stats.totalAccesses).toBe(0);
    expect(stats.hitRate).toBe(0);
    expect(stats.missRate).toBe(0);
    expect(Number.isNaN(stats.amat)).toBe(false);
  });

  it('DOCUMENTED CONVENTION: with zero accesses, hitRate + missRate = 0, NOT 1 (both default to 0 rather than being undefined)', () => {
    // This is a deliberate convention in computeStats (division-by-zero guard),
    // distinct from the nonzero-access invariant (hitRate+missRate===1) tested above.
    expect(stats.hitRate + stats.missRate).toBe(0);
  });

  it('AMAT collapses to hitTime alone when missRate=0 (no accesses)', () => {
    expect(stats.amat).toBe(DEFAULT_TIMING.hitTime);
  });

  it('totalAccessTime is 0', () => {
    expect(stats.totalAccessTime).toBe(0);
  });
});
