// ============================================================
// Determinism — same config+sequence yields identical trace across runs.
// ============================================================
import { describe, it, expect } from 'vitest';
import { simulate, simulateBoth } from '../cache';
import { sequential, midRepeat, random } from '../sequences';
import type { CacheConfig } from '../types';

const config: CacheConfig = {
  numCacheBlocks: 16,
  blockSize: 16,
  associativity: 4,
  readPolicy: 'load-through',
};

describe('simulate() determinism', () => {
  it('identical trace + stats across repeated runs (sequential sequence)', () => {
    const seq = sequential(16);
    const run1 = simulate(config, seq, 'LRU');
    const run2 = simulate(config, seq, 'LRU');
    expect(run1).toEqual(run2);
  });

  it('identical trace + stats across repeated runs (mid-repeat sequence, MRU)', () => {
    const seq = midRepeat(16);
    const run1 = simulate(config, seq, 'MRU');
    const run2 = simulate(config, seq, 'MRU');
    expect(run1).toEqual(run2);
  });

  it('identical trace across runs for a seeded random sequence', () => {
    const seqA = random(64, 1024, 2026);
    const seqB = random(64, 1024, 2026);
    expect(seqA).toEqual(seqB); // generator itself deterministic
    const run1 = simulate(config, seqA, 'LRU');
    const run2 = simulate(config, seqB, 'LRU');
    expect(run1).toEqual(run2);
  });

  it('simulateBoth is deterministic and consistent with two separate simulate() calls', () => {
    const seq = sequential(8);
    const both = simulateBoth(config, seq);
    const lruAlone = simulate(config, seq, 'LRU');
    const mruAlone = simulate(config, seq, 'MRU');
    expect(both.lru).toEqual(lruAlone);
    expect(both.mru).toEqual(mruAlone);
  });

  it('does not mutate the input sequence array', () => {
    const seq = [0, 1, 2, 3, 4, 5];
    const copy = [...seq];
    simulate(config, seq, 'LRU');
    expect(seq).toEqual(copy);
  });
});
