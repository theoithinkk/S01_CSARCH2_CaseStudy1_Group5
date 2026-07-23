// ============================================================
// Machine 7 — engine type definitions
// Pure, framework-agnostic types shared by the cache engine and UI.
// ============================================================

/** Replacement policy under comparison. */
export type Policy = 'LRU' | 'MRU';

/**
 * Read/allocation policy. Per the Machine 7 brief this affects the miss
 * PENALTY (timing / AMAT) only — both policies allocate on miss.
 *   load-through:     miss penalty = Tm + Tb * blockSize
 *   non-load-through: miss penalty = Tm
 */
export type ReadPolicy = 'load-through' | 'non-load-through';

/** Result of a single memory access. */
export type AccessResult = 'hit' | 'miss';

/** Simulation configuration (validated at the UI boundary). */
export interface CacheConfig {
  /** Total cache blocks (lines). Power of 2, min 4. #sets = numCacheBlocks / 4. */
  numCacheBlocks: number;
  /** Block size in words. Power of 2, min 2. Affects load-through miss penalty. */
  blockSize: number;
  /** Fixed associativity for Machine 7. */
  associativity: number;
  /** Read policy — selects the miss penalty. */
  readPolicy: ReadPolicy;
}

/** Timing constants used to derive AMAT and total access time. */
export interface Timing {
  hitTime: number; // Th, cycles
  memAccess: number; // Tm, cycles
  transferPerWord: number; // Tb, cycles/word
}

/** Snapshot of a single cache line (way) after an access. */
export interface LineSnapshot {
  valid: boolean;
  tag: number | null;
  /** Global timestamp of last access (higher = more recent). null if empty. */
  timestamp: number | null;
  /** 0 = most-recently-used within its set … (validCount-1) = least recent. -1 if empty. */
  recencyRank: number;
}

/** Snapshot of one set (associativity ways) after an access. */
export interface SetSnapshot {
  setIndex: number;
  lines: LineSnapshot[];
}

/** One fully-resolved access step, including the cache state AFTER it. */
export interface TraceStep {
  /** 1-based step number. */
  step: number;
  /** Requested main-memory block number. */
  block: number;
  setIndex: number;
  tag: number;
  result: AccessResult;
  /** Way index that matched (hit) or was filled (miss). */
  wayIndex: number;
  /** True when the fill required evicting a valid line. */
  evicted: boolean;
  /** Tag that was evicted, or null. */
  evictedTag: number | null;
  /** Full cache snapshot after applying this access. */
  sets: SetSnapshot[];
  /** Cumulative hits including this step. */
  hits: number;
  /** Cumulative misses including this step. */
  misses: number;
}

/** Aggregate performance statistics for one policy run. */
export interface Stats {
  policy: Policy;
  readPolicy: ReadPolicy;
  totalAccesses: number;
  hits: number;
  misses: number;
  hitRate: number; // 0..1
  missRate: number; // 0..1
  hitTime: number; // Th
  missPenalty: number; // P_miss
  amat: number; // cycles
  totalAccessTime: number; // cycles
  blockSize: number;
}

/** Full result of simulating one policy over a sequence. */
export interface SimResult {
  policy: Policy;
  config: CacheConfig;
  steps: TraceStep[];
  stats: Stats;
}

/** Built-in test case identifiers. */
export type TestCaseId = 'sequential' | 'mid-repeat' | 'random' | 'custom';
