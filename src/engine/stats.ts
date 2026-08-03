// ============================================================
// Machine 7 - timing & statistics
// ============================================================
import type { CacheConfig, Policy, Stats, Timing } from './types';

/** Default timing constants (ns). */
export const DEFAULT_TIMING: Timing = {
  hitTime: 1, // Th - cache access time
  memAccess: 10, // Tm - main memory access time, per word
  cacheToCpu: 1, // cache-to-CPU transfer
};

/**
 * Miss penalty (ns).
 *
*   Non-load-through:
 *     cache access + (memory access x words per block) + cache-to-CPU
 *     = Th + (Tm * B) + Tc
 *
 *   Load-through:
 *     cache access + average(best case, worst case)
 *     = Th + (Tm + Tm*B) / 2
 *     Best case the requested word arrives first (Tm), worst case last (Tm*B).
 */
export function missPenalty(config: CacheConfig, timing: Timing = DEFAULT_TIMING): number {
  if (config.readPolicy === 'non-load-through') {
    return timing.hitTime + timing.memAccess * config.blockSize + timing.cacheToCpu;
  }

  const best = timing.memAccess;
  const worst = timing.memAccess * config.blockSize;
  return timing.hitTime + (best + worst)/2;
}

/**
 * Compute aggregate stats from hit/miss counts.
 * AMAT = Th + MissRate * (P_miss - Th)
 * TotalTime = H * Th + M * P_miss
 */
export function computeStats(
  policy: Policy,
  config: CacheConfig,
  hits: number,
  misses: number,
  timing: Timing = DEFAULT_TIMING,
): Stats {
  const totalAccesses = hits + misses;
  const hitRate = totalAccesses > 0 ? hits / totalAccesses : 0;
  const missRate = totalAccesses > 0 ? misses / totalAccesses : 0;
  const pMiss = missPenalty(config, timing);
  const amat = timing.hitTime + missRate * (pMiss - timing.hitTime);
  const totalAccessTime = hits * timing.hitTime + misses * pMiss;

  return {
    policy,
    readPolicy: config.readPolicy,
    totalAccesses,
    hits,
    misses,
    hitRate,
    missRate,
    hitTime: timing.hitTime,
    missPenalty: pMiss,
    amat,
    totalAccessTime,
    blockSize: config.blockSize,
  };
}
