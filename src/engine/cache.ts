// ============================================================
// Machine 7 — pure N-way set-associative cache engine
// Deterministic: (config, sequence, policy) -> full trace + stats.
// No framework imports — see src/engine/__tests__ for worked examples.
// ============================================================
import type {
  CacheConfig,
  LineSnapshot,
  Policy,
  SetSnapshot,
  SimResult,
  Timing,
  TraceStep,
} from './types';
import { computeStats, DEFAULT_TIMING } from './stats';

/** Internal mutable cache line. */
interface Line {
  valid: boolean;
  tag: number;
  timestamp: number; // last-access global time; 0 while invalid
}

/** Address mapping: block -> { setIndex, tag }. */
export function mapAddress(block: number, numSets: number): { setIndex: number; tag: number } {
  return {
    setIndex: block % numSets,
    tag: Math.floor(block / numSets),
  };
}

/** Build a fresh set of empty lines. */
function makeSet(associativity: number): Line[] {
  return Array.from({ length: associativity }, () => ({ valid: false, tag: 0, timestamp: 0 }));
}

/**
 * Compute recency ranks for a set's lines: 0 = most-recently-used … n-1 = least.
 * Empty lines get rank -1. Deterministic tie-break by way index (stable).
 */
function rankSet(lines: Line[]): number[] {
  const valid = lines
    .map((l, i) => ({ i, ts: l.timestamp, valid: l.valid }))
    .filter((x) => x.valid)
    // Highest timestamp first = most recent = rank 0.
    .sort((a, b) => b.ts - a.ts || a.i - b.i);
  const ranks = new Array<number>(lines.length).fill(-1);
  valid.forEach((x, rank) => {
    ranks[x.i] = rank;
  });
  return ranks;
}

/** Snapshot the whole cache (deep copy) after an access, with recency ranks. */
function snapshot(cache: Line[][]): SetSnapshot[] {
  return cache.map((lines, setIndex) => {
    const ranks = rankSet(lines);
    const snapLines: LineSnapshot[] = lines.map((l, i) => ({
      valid: l.valid,
      tag: l.valid ? l.tag : null,
      timestamp: l.valid ? l.timestamp : null,
      recencyRank: ranks[i],
    }));
    return { setIndex, lines: snapLines };
  });
}

/**
 * Select the victim way in a full set.
 *   LRU -> minimum timestamp (oldest).
 *   MRU -> maximum timestamp (newest).
 * Deterministic tie-break: lowest way index.
 */
function selectVictim(lines: Line[], policy: Policy): number {
  let victim = 0;
  for (let i = 1; i < lines.length; i++) {
    if (policy === 'LRU') {
      if (lines[i].timestamp < lines[victim].timestamp) victim = i;
    } else {
      if (lines[i].timestamp > lines[victim].timestamp) victim = i;
    }
  }
  return victim;
}

/**
 * Simulate a full access sequence for a single policy.
 * Both read policies allocate on miss (the Machine 7 brief specifies read
 * policy affects timing only); readPolicy influences stats, not the trace.
 */
export function simulate(
  config: CacheConfig,
  sequence: number[],
  policy: Policy,
  timing: Timing = DEFAULT_TIMING,
): SimResult {
  const { numCacheBlocks, associativity } = config;
  const numSets = numCacheBlocks / associativity;

  const cache: Line[][] = Array.from({ length: numSets }, () => makeSet(associativity));

  const steps: TraceStep[] = [];
  let globalTime = 0;
  let hits = 0;
  let misses = 0;

  for (let s = 0; s < sequence.length; s++) {
    const block = sequence[s];
    const { setIndex, tag } = mapAddress(block, numSets);
    const set = cache[setIndex];

    globalTime += 1;

    let result: 'hit' | 'miss';
    let wayIndex = -1;
    let evicted = false;
    let evictedTag: number | null = null;

    // Search set for a matching valid tag.
    let matched = -1;
    for (let i = 0; i < set.length; i++) {
      if (set[i].valid && set[i].tag === tag) {
        matched = i;
        break;
      }
    }

    if (matched >= 0) {
      // HIT — refresh recency.
      result = 'hit';
      wayIndex = matched;
      set[matched].timestamp = globalTime;
      hits += 1;
    } else {
      // MISS — allocate. Prefer an empty way; otherwise evict per policy.
      result = 'miss';
      misses += 1;
      let target = set.findIndex((l) => !l.valid);
      if (target === -1) {
        target = selectVictim(set, policy);
        evicted = true;
        evictedTag = set[target].tag;
      }
      set[target] = { valid: true, tag, timestamp: globalTime };
      wayIndex = target;
    }

    steps.push({
      step: s + 1,
      block,
      setIndex,
      tag,
      result,
      wayIndex,
      evicted,
      evictedTag,
      sets: snapshot(cache),
      hits,
      misses,
    });
  }

  const stats = computeStats(policy, config, hits, misses, timing);
  return { policy, config, steps, stats };
}

/** Convenience: run both LRU and MRU over the same sequence. */
export function simulateBoth(
  config: CacheConfig,
  sequence: number[],
  timing: Timing = DEFAULT_TIMING,
): { lru: SimResult; mru: SimResult } {
  return {
    lru: simulate(config, sequence, 'LRU', timing),
    mru: simulate(config, sequence, 'MRU', timing),
  };
}
