// ============================================================
// Machine 7 - timing & statistics
// ============================================================
import type { CacheConfig, Policy, Stats, Timing } from './types';

/** Default timing constants (ns). */
export const DEFAULT_TIMING: Timing = {
  hitTime: 1, // Th - cache access time
  memAccess: 10, // Tm - memory access time, per word
  cacheToCpu: 1, // Tc - time to give a word to the CPU
};

/**
 * MISS PENALTY (ns) - reported in the stats table and used for AMAT.
 *
 *   Load-through:
 *     Cache Access Time + Average(Best Case, Worst Case)
 *     = Th + (Tm + Tm*B) / 2
 *
 *   Non-load-through:
 *     Cache Access Time + (Memory Access Time * words per block) + Cache to CPU
 *     = Th + (Tm * B) + Tc
 */
export function missPenalty(config: CacheConfig, timing: Timing = DEFAULT_TIMING): number {
  if (config.readPolicy === 'non-load-through') {
    return timing.hitTime + timing.memAccess * config.blockSize + timing.cacheToCpu;
  }
  const best = timing.memAccess; 
  const worst = timing.memAccess * config.blockSize; 
  return timing.hitTime + (best + worst) / 2;
}

/**
 * MISS TIME - used for TOTAL ACCESS TIME formula
 * 
 *   Load-through:
 *     cache access + memory access time per word
 *     = Th + Tm                    
 *
 *   Non-load-through:
 *     cache access + words per block * (memory access time + time to give to CPU)
 *     = Th + B * (Tm + Tc)
 *
 * Total Miss Time = miss count * this value.
 */
export function missTime(config: CacheConfig, timing: Timing = DEFAULT_TIMING): number {
  if (config.readPolicy === 'non-load-through') {
    return timing.hitTime + config.blockSize * (timing.memAccess + timing.cacheToCpu);
  }
  return timing.hitTime + timing.memAccess;
}

/**
 * Compute aggregate stats from hit/miss counts.
 *
 *   AMAT             = Th + MissRate * (P_miss - Th)
 *                    note: this formula is equal to HitRate * Th + MissRate * P_miss
 *
 *   Total Hit Time   = hits * Th
 *   Total Miss Time  = misses * missTime                     
 *   TOTAL ACCESS TIME = Total Hit Time + Total Miss Time
 *
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
  const tMiss = missTime(config, timing);

  const amat = timing.hitTime + missRate * (pMiss - timing.hitTime);

  const totalHitTime = hits * timing.hitTime;
  const totalMissTime = misses * tMiss;
  const totalAccessTime = totalHitTime + totalMissTime;

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
    missTime: tMiss,
    totalHitTime,
    totalMissTime,
    amat,
    totalAccessTime,
    blockSize: config.blockSize,
  };
}