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
 *   load-through:     Tm + Tb * blockSize   (full block transfer)
 *   non-load-through: Tm                    (first word only)
 * Note the load-through penalty scales with the configured block size, so the
 * oracle value (blockSize 4 → 14) and the default (blockSize 16 → 26) both hold.
 */
export function missPenalty(config: CacheConfig, timing: Timing = DEFAULT_TIMING): number {
  if (config.readPolicy === 'load-through') {
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
