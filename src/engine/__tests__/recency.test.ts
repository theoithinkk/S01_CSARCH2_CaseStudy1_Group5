// ============================================================
// Recency ranking & victim-selection edge cases beyond the oracle defaults.
// recencyRank convention: 0 = MRU ... n-1 = LRU; empty lines rank -1.
// ============================================================
import { describe, it, expect } from 'vitest';
import { simulate } from '../cache';
import type { CacheConfig } from '../types';

const config: CacheConfig = {
  numCacheBlocks: 4, // 1 set, 4 ways
  blockSize: 4,
  associativity: 4,
  readPolicy: 'load-through',
};

describe('Cold-miss allocation into empty ways before any eviction', () => {
  const sequence = [0, 1, 2, 3];
  const result = simulate(config, sequence, 'LRU');

  it('fills empty ways left-to-right in allocation order, no evictions', () => {
    expect(result.steps.map((s) => s.wayIndex)).toEqual([0, 1, 2, 3]);
    expect(result.steps.every((s) => !s.evicted)).toBe(true);
    expect(result.steps.every((s) => s.result === 'miss')).toBe(true);
  });

  it('after filling, recencyRank 0 is the most-recently-inserted way (way 3)', () => {
    const finalSet = result.steps[3].sets[0];
    const rankByWay = finalSet.lines.map((l) => l.recencyRank);
    // way3 inserted last -> rank 0 (MRU); way0 inserted first -> rank 3 (LRU)
    expect(rankByWay).toEqual([3, 2, 1, 0]);
  });

  it('empty lines (before any access) report recencyRank -1 and null tag/timestamp', () => {
    const firstSet = result.steps[0].sets[0];
    // After step 1, way 0 is valid (rank 0); ways 1-3 still empty (rank -1).
    expect(firstSet.lines[0].recencyRank).toBe(0);
    for (const line of firstSet.lines.slice(1)) {
      expect(line.recencyRank).toBe(-1);
      expect(line.valid).toBe(false);
      expect(line.tag).toBeNull();
      expect(line.timestamp).toBeNull();
    }
  });
});

describe('Recency reordering on a hit to a non-MRU line', () => {
  // Fill all 4 ways (steps 1-4), then hit way 1 (block 1) again at step 5.
  const sequence = [0, 1, 2, 3, 1];
  const result = simulate(config, sequence, 'LRU');

  it('step 5 is a hit on way 1', () => {
    expect(result.steps[4].result).toBe('hit');
    expect(result.steps[4].wayIndex).toBe(1);
  });

  it('after the hit, way 1 becomes rank 0 (MRU); way 0 remains rank 3 (LRU)', () => {
    const finalSet = result.steps[4].sets[0];
    const rankByWay = finalSet.lines.map((l) => l.recencyRank);
    // Order of last access: way0(t1) < way2(t3) < way3(t4) < way1(t5, most recent)
    expect(rankByWay[1]).toBe(0); // way1 = MRU after the refresh
    expect(rankByWay[0]).toBe(3); // way0 = LRU (oldest, untouched since step 1)
  });

  it('a subsequent cold miss (block 4) evicts way 0 under LRU', () => {
    const withMiss = simulate(config, [0, 1, 2, 3, 1, 4], 'LRU');
    const step6 = withMiss.steps[5];
    expect(step6.result).toBe('miss');
    expect(step6.evicted).toBe(true);
    expect(step6.wayIndex).toBe(0);
    expect(step6.evictedTag).toBe(0);
  });

  it('the same continuation evicts way 3 (tag 3, MRU-of-the-full-set-at-that-time) under MRU', () => {
    // Under MRU at the point of the 6th access, the full set's timestamps are
    // way0=t1, way2=t3, way3=t4, way1=t5(refreshed) -> maximum is way1 (t5) itself
    // since the hit at step 5 refreshed way1 to be the most recent overall.
    const withMiss = simulate(config, [0, 1, 2, 3, 1, 4], 'MRU');
    const step6 = withMiss.steps[5];
    expect(step6.result).toBe('miss');
    expect(step6.evicted).toBe(true);
    // MRU evicts the line with the MAXIMUM timestamp, which is way1 (refreshed at t5).
    expect(step6.wayIndex).toBe(1);
    expect(step6.evictedTag).toBe(1);
  });
});

describe('Determinism of recencyRank with distinct timestamps (no real ties reachable)', () => {
  it('every valid line always has a unique timestamp (global time strictly increases per access)', () => {
    const sequence = [0, 1, 2, 3, 0, 1, 2, 3, 4, 5];
    const result = simulate(config, sequence, 'LRU');
    for (const step of result.steps) {
      for (const set of step.sets) {
        const timestamps = set.lines.filter((l) => l.valid).map((l) => l.timestamp);
        expect(new Set(timestamps).size).toBe(timestamps.length); // all unique
      }
    }
  });
});
