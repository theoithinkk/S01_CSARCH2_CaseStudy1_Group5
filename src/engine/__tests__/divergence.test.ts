// ============================================================
// LRU vs MRU divergence — a small worked example where the two policies diverge.
// 1 set, 4 lines (numCacheBlocks=4), tags A..E modeled as blocks 0..4
// (numSets=1 so setIndex=0, tag=block for every access).
// ============================================================
import { describe, it, expect } from 'vitest';
import { simulate } from '../cache';
import type { CacheConfig } from '../types';

const config: CacheConfig = {
  numCacheBlocks: 4, // associativity 4 -> numSets = 1
  blockSize: 4,
  associativity: 4,
  readPolicy: 'load-through',
};

describe('§4.2 divergence — sequence [A,B,C,D,E] = [0,1,2,3,4]', () => {
  const sequence = [0, 1, 2, 3, 4];
  const lru = simulate(config, sequence, 'LRU');
  const mru = simulate(config, sequence, 'MRU');

  it('steps 1-4 are all cold misses for both policies, filling empty ways first', () => {
    for (const r of [lru, mru]) {
      for (let i = 0; i < 4; i++) {
        expect(r.steps[i].result).toBe('miss');
        expect(r.steps[i].evicted).toBe(false); // empty-way allocation, no eviction
      }
    }
  });

  it('step 5 (E/block 4): LRU evicts oldest (tag 0 = A), MRU evicts newest (tag 3 = D)', () => {
    const lruStep5 = lru.steps[4];
    const mruStep5 = mru.steps[4];

    expect(lruStep5.result).toBe('miss');
    expect(lruStep5.evicted).toBe(true);
    expect(lruStep5.evictedTag).toBe(0); // A, timestamp t1 = oldest

    expect(mruStep5.result).toBe('miss');
    expect(mruStep5.evicted).toBe(true);
    expect(mruStep5.evictedTag).toBe(3); // D, timestamp t4 = newest
  });

  it('both policies record the identical hit/miss pattern; only evicted tag differs', () => {
    expect(lru.steps.map((s) => s.result)).toEqual(mru.steps.map((s) => s.result));
    expect(lru.stats.hits).toBe(mru.stats.hits);
    expect(lru.stats.misses).toBe(mru.stats.misses);
    // The one point of difference is the evicted tag at step 5.
    expect(lru.steps[4].evictedTag).not.toBe(mru.steps[4].evictedTag);
  });

  it('after step 5, LRU cache holds tags {B,C,D,E}=[1,2,3,4]; MRU holds {A,B,C,E}=[0,1,2,4]', () => {
    const lruTags = lru.steps[4].sets[0].lines.filter((l) => l.valid).map((l) => l.tag).sort();
    const mruTags = mru.steps[4].sets[0].lines.filter((l) => l.valid).map((l) => l.tag).sort();
    expect(lruTags).toEqual([1, 2, 3, 4]);
    expect(mruTags).toEqual([0, 1, 2, 4]);
  });
});

describe('Larger divergence: sequential(4) cyclic scan — README §3(a) claims', () => {
  // numCacheBlocks=16 -> numSets=4, associativity=4. sequential(4) = [0..7,0..7] (16 accesses).
  // Each set is targeted by 8/4=2 distinct tags per pass... but the documented
  // pathological case uses n = numCacheBlocks (default 16) with sequence 0..31 twice.
  // Reproduce the smaller n=4 case exactly through the engine and check internal
  // consistency (LRU hit count <= MRU hit count on this cyclic pattern).
  const cfg: CacheConfig = { numCacheBlocks: 16, blockSize: 16, associativity: 4, readPolicy: 'load-through' };
  // sequential(n) with n = numCacheBlocks/2 = 8 reproduces the 0..2n-1 (0..15) twice pattern
  // matching numSets=4 sets each oversubscribed 2x (8 tags / 4 ways get folded to 2 tags/set * 4 ways... )
  const seq = [...Array(32).keys(), ...Array(32).keys()]; // 0..31 twice, 64 accesses (README §3a)

  const lru = simulate(cfg, seq, 'LRU');
  const mru = simulate(cfg, seq, 'MRU');

  it('LRU thrashes to 0 hits on this cyclic over-subscribed pattern (README §3a)', () => {
    expect(lru.stats.hits).toBe(0);
    expect(lru.stats.misses).toBe(64);
  });

  it('MRU recovers a quarter of hits (16 hits / 64) on the second pass (README §3a)', () => {
    expect(mru.stats.hits).toBe(16);
    expect(mru.stats.misses).toBe(48);
  });

  it('MRU strictly outperforms LRU on this pattern', () => {
    expect(mru.stats.hits).toBeGreaterThan(lru.stats.hits);
  });
});
