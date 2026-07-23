// ============================================================
// Oracle tests — reproduce hand-worked hit/miss traces exactly.
// ============================================================
import { describe, it, expect } from 'vitest';
import { simulate } from '../cache';
import type { CacheConfig } from '../types';

const baseConfig: CacheConfig = {
  numCacheBlocks: 8,
  blockSize: 4,
  associativity: 4,
  readPolicy: 'load-through',
};

describe('Oracle §7 Example 1 — LRU + Load-through, 8 cache blocks, block size 4', () => {
  const sequence = [0, 1, 2, 3, 0, 1, 2, 3, 4, 5, 6, 7];
  const result = simulate(baseConfig, sequence, 'LRU');

  it('matches the per-step hit/miss trace exactly', () => {
    const expected: Array<'hit' | 'miss'> = [
      'miss', 'miss', 'miss', 'miss', // steps 1-4: cold misses
      'hit', 'hit', 'hit', 'hit',     // steps 5-8: all re-hit
      'miss', 'miss', 'miss', 'miss', // steps 9-12: new blocks, cold misses
    ];
    expect(result.steps.map((s) => s.result)).toEqual(expected);
  });

  it('matches cumulative hits/misses at the end: 4 hits, 8 misses', () => {
    expect(result.stats.hits).toBe(4);
    expect(result.stats.misses).toBe(8);
    expect(result.stats.totalAccesses).toBe(12);
  });

  it('matches total time 116 cycles and AMAT 9.67', () => {
    expect(result.stats.totalAccessTime).toBe(116);
    expect(result.stats.amat).toBeCloseTo(9.6667, 3);
  });

  it('no evictions occur (cache never fills before all-cold-miss allocations)', () => {
    // 2 sets x 4 ways = 8 lines; only 8 distinct blocks touched (0-7) — no eviction.
    expect(result.steps.some((s) => s.evicted)).toBe(false);
  });

  it('set/tag mapping matches the doc table for numSets=2', () => {
    // block -> {setIndex, tag}
    const expectedMap = [
      { block: 0, setIndex: 0, tag: 0 },
      { block: 1, setIndex: 1, tag: 0 },
      { block: 2, setIndex: 0, tag: 1 },
      { block: 3, setIndex: 1, tag: 1 },
      { block: 4, setIndex: 0, tag: 2 },
      { block: 5, setIndex: 1, tag: 2 },
      { block: 6, setIndex: 0, tag: 3 },
      { block: 7, setIndex: 1, tag: 3 },
    ];
    for (const { block, setIndex, tag } of expectedMap) {
      const step = result.steps.find((s) => s.block === block);
      expect(step).toBeDefined();
      expect(step!.setIndex).toBe(setIndex);
      expect(step!.tag).toBe(tag);
    }
  });
});

describe('Oracle §7 — same sequence, Non-load-through', () => {
  const sequence = [0, 1, 2, 3, 0, 1, 2, 3, 4, 5, 6, 7];
  const nonLoadConfig: CacheConfig = { ...baseConfig, readPolicy: 'non-load-through' };
  const result = simulate(nonLoadConfig, sequence, 'LRU');

  it('same hit/miss counts (read policy does not affect hit/miss)', () => {
    expect(result.stats.hits).toBe(4);
    expect(result.stats.misses).toBe(8);
  });

  it('miss penalty is 10 cycles, total time 84 cycles, AMAT 7.00', () => {
    expect(result.stats.missPenalty).toBe(10);
    expect(result.stats.totalAccessTime).toBe(84);
    expect(result.stats.amat).toBeCloseTo(7.0, 6);
  });
});

describe('Oracle §7 Example 2 — LRU vs MRU divergence, extended sequence (13 steps)', () => {
  const sequence = [0, 1, 2, 3, 0, 1, 2, 3, 4, 5, 6, 7, 8];
  const lru = simulate(baseConfig, sequence, 'LRU');
  const mru = simulate(baseConfig, sequence, 'MRU');

  it('both policies: 4 hits, 9 misses through step 13', () => {
    expect(lru.stats.hits).toBe(4);
    expect(lru.stats.misses).toBe(9);
    expect(mru.stats.hits).toBe(4);
    expect(mru.stats.misses).toBe(9);
  });

  it('both policies: total time 130 cycles, AMAT 10.0', () => {
    expect(lru.stats.totalAccessTime).toBe(130);
    expect(mru.stats.totalAccessTime).toBe(130);
    expect(lru.stats.amat).toBeCloseTo(10.0, 6);
    expect(mru.stats.amat).toBeCloseTo(10.0, 6);
  });

  it('hit/miss pattern is identical between LRU and MRU (only eviction differs)', () => {
    const lruPattern = lru.steps.map((s) => s.result);
    const mruPattern = mru.steps.map((s) => s.result);
    expect(lruPattern).toEqual(mruPattern);
  });

  it('step 13 (block 8, set 0, tag 4): LRU evicts tag 0, MRU evicts tag 3', () => {
    const lruStep13 = lru.steps[12];
    const mruStep13 = mru.steps[12];
    expect(lruStep13.block).toBe(8);
    expect(lruStep13.setIndex).toBe(0);
    expect(lruStep13.tag).toBe(4);
    expect(lruStep13.evicted).toBe(true);
    expect(lruStep13.evictedTag).toBe(0);

    expect(mruStep13.evicted).toBe(true);
    expect(mruStep13.evictedTag).toBe(3);
  });
});
