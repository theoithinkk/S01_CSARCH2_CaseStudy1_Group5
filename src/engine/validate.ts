// ============================================================
// Machine 7 — input validation at the config boundary.
// ============================================================

export const isPowerOfTwo = (n: number): boolean => Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;

/** Nearest power of two >= n (used by the +/- steppers). */
export const nextPow2 = (n: number): number => {
  if (n < 1) return 1;
  let p = 1;
  while (p < n) p <<= 1;
  return p;
};

export const prevPow2 = (n: number): number => {
  let p = 1;
  while (p * 2 <= n) p <<= 1;
  return p;
};

export interface ConfigLimits {
  minCacheBlocks: number;
  minBlockSize: number;
  associativity: number;
  memBlocks: number;
}

export const LIMITS: ConfigLimits = {
  minCacheBlocks: 4,
  minBlockSize: 2,
  associativity: 4,
  memBlocks: 1024,
};

/** Validate cache blocks: power of 2, >= 4, divisible by associativity. */
export function validateCacheBlocks(n: number): string | null {
  if (!isPowerOfTwo(n)) return 'Must be a power of 2';
  if (n < LIMITS.minCacheBlocks) return `Minimum is ${LIMITS.minCacheBlocks}`;
  if (n % LIMITS.associativity !== 0) return `Must be divisible by ${LIMITS.associativity}`;
  return null;
}

/** Validate block size: power of 2, >= 2. */
export function validateBlockSize(n: number): string | null {
  if (!isPowerOfTwo(n)) return 'Must be a power of 2';
  if (n < LIMITS.minBlockSize) return `Minimum is ${LIMITS.minBlockSize}`;
  return null;
}
