// ============================================================
// Machine 7 — timing & statistics
// ============================================================
import type { CacheConfig, Policy, Stats, Timing } from './types';

/** Default timing constants. */
export const DEFAULT_TIMING: Timing = {
  hitTime: 1, // Th
  memAccess: 10, // Tm
  transferPerWord: 1, // Tb (per word)
};

/**
 * Miss penalty in cycles.
 *   load-through:     Tm                    (requested word forwarded on arrival)
 *   non-load-through: Tm + Tb * blockSize   (wait for full block, then read)
 * Only the non-load-through penalty scales with block size, since that policy
 * waits out the entire transfer. (blockSize 4 → 14, blockSize 16 → 26.)
 */
export function missPenalty(config: CacheConfig, timing: Timing = DEFAULT_TIMING): number {
  if (config.readPolicy === 'non-load-through') {
    return timing.memAccess + timing.transferPerWord * config.blockSize;
  }
  return timing.memAccess;
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
