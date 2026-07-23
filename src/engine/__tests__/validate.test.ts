// ============================================================
// Config-boundary validation tests.
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  isPowerOfTwo,
  nextPow2,
  prevPow2,
  validateCacheBlocks,
  validateBlockSize,
  LIMITS,
} from '../validate';

describe('isPowerOfTwo', () => {
  it('true for powers of two', () => {
    for (const n of [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024]) {
      expect(isPowerOfTwo(n)).toBe(true);
    }
  });
  it('false for non-powers, zero, and negatives', () => {
    for (const n of [0, -1, -4, 3, 5, 6, 7, 9, 100, 1023]) {
      expect(isPowerOfTwo(n)).toBe(false);
    }
  });
  it('false for non-integers', () => {
    expect(isPowerOfTwo(2.5)).toBe(false);
    expect(isPowerOfTwo(4.0001)).toBe(false);
  });
});

describe('nextPow2 / prevPow2', () => {
  it('nextPow2 rounds up to the nearest power of 2', () => {
    expect(nextPow2(1)).toBe(1);
    expect(nextPow2(3)).toBe(4);
    expect(nextPow2(4)).toBe(4);
    expect(nextPow2(5)).toBe(8);
    expect(nextPow2(1000)).toBe(1024);
  });
  it('nextPow2 clamps to 1 for values below 1', () => {
    expect(nextPow2(0)).toBe(1);
    expect(nextPow2(-5)).toBe(1);
  });
  it('prevPow2 rounds down to the nearest power of 2', () => {
    expect(prevPow2(1)).toBe(1);
    expect(prevPow2(3)).toBe(2);
    expect(prevPow2(4)).toBe(4);
    expect(prevPow2(5)).toBe(4);
    expect(prevPow2(1024)).toBe(1024);
    expect(prevPow2(2000)).toBe(1024);
  });
});

describe('validateCacheBlocks', () => {
  it('accepts valid values (power of 2, >= 4, divisible by associativity 4)', () => {
    for (const n of [4, 8, 16, 32, 64, 1024]) {
      expect(validateCacheBlocks(n)).toBeNull();
    }
  });
  it('rejects non-power-of-2', () => {
    expect(validateCacheBlocks(6)).toBe('Must be a power of 2');
  });
  it('rejects below minimum (4)', () => {
    expect(validateCacheBlocks(2)).toBe(`Minimum is ${LIMITS.minCacheBlocks}`);
    expect(validateCacheBlocks(1)).toBe(`Minimum is ${LIMITS.minCacheBlocks}`);
  });
});

describe('validateBlockSize', () => {
  it('accepts valid values (power of 2, >= 2)', () => {
    for (const n of [2, 4, 8, 16, 32]) {
      expect(validateBlockSize(n)).toBeNull();
    }
  });
  it('rejects non-power-of-2', () => {
    expect(validateBlockSize(3)).toBe('Must be a power of 2');
  });
  it('rejects below minimum (2)', () => {
    expect(validateBlockSize(1)).toBe(`Minimum is ${LIMITS.minBlockSize}`);
  });
});
