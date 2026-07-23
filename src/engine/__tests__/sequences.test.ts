// ============================================================
// Sequence generator tests — sequential/midRepeat/random/parseCustom.
// ============================================================
import { describe, it, expect } from 'vitest';
import { sequential, midRepeat, random, parseCustom, mulberry32 } from '../sequences';

describe('sequential(n)', () => {
  it('n=4 -> 0..7 then repeated (16 accesses)', () => {
    const expected = [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7];
    expect(sequential(4)).toEqual(expected);
  });

  it('n=8 -> 0..15 then repeated (32 accesses)', () => {
    const run = Array.from({ length: 16 }, (_, i) => i);
    expect(sequential(8)).toEqual([...run, ...run]);
    expect(sequential(8)).toHaveLength(32);
  });
});

describe('midRepeat(n)', () => {
  it('n=4 matches the brief\'s worked example: 0,1,2,3, 0..7, 0..7, 3,2,1,0, 7..0, 7..0', () => {
    const expected = [
      0, 1, 2, 3, // s1
      0, 1, 2, 3, 4, 5, 6, 7, // s2
      0, 1, 2, 3, 4, 5, 6, 7, // s3
      3, 2, 1, 0, // s1 reversed
      7, 6, 5, 4, 3, 2, 1, 0, // s2 reversed
      7, 6, 5, 4, 3, 2, 1, 0, // s3 reversed
    ];
    expect(midRepeat(4)).toEqual(expected);
    expect(midRepeat(4)).toHaveLength(40);
  });

  it('n=8 has length 80 (8 + 16 + 16, doubled for the reversed half)', () => {
    expect(midRepeat(8)).toHaveLength(80);
  });

  it('n=16 (default cache size) has length 160, matching README §3(b)', () => {
    expect(midRepeat(16)).toHaveLength(160);
  });

  it('each segment is reversed independently, not the whole array', () => {
    const seq = midRepeat(4);
    // forward s1 = [0,1,2,3]; its reversal should be [3,2,1,0] at positions 20-23,
    // NOT the reverse of the entire 20-element forward half.
    expect(seq.slice(20, 24)).toEqual([3, 2, 1, 0]);
  });
});

describe('random(count, maxBlockExclusive, seed)', () => {
  it('produces exactly 64 indices by default', () => {
    expect(random(64, 1024, 42)).toHaveLength(64);
  });

  it('all indices are within 0..1023 inclusive', () => {
    const seq = random(64, 1024, 12345);
    for (const b of seq) {
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1023);
      expect(Number.isInteger(b)).toBe(true);
    }
  });

  it('is deterministic for a fixed seed', () => {
    const a = random(64, 1024, 999);
    const b = random(64, 1024, 999);
    expect(a).toEqual(b);
  });

  it('different seeds (generally) produce different sequences', () => {
    const a = random(64, 1024, 1);
    const b = random(64, 1024, 2);
    expect(a).not.toEqual(b);
  });

  it('mulberry32 itself is a deterministic pure function of its seed', () => {
    const gen1 = mulberry32(7);
    const gen2 = mulberry32(7);
    const draws1 = [gen1(), gen1(), gen1()];
    const draws2 = [gen2(), gen2(), gen2()];
    expect(draws1).toEqual(draws2);
    for (const v of draws1) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('parseCustom(input, maxBlockExclusive)', () => {
  it('parses a comma-separated list of valid blocks', () => {
    const { blocks, errors } = parseCustom('0, 5, 10, 1023');
    expect(errors).toEqual([]);
    expect(blocks).toEqual([0, 5, 10, 1023]);
  });

  it('parses space/newline separated input too', () => {
    const { blocks, errors } = parseCustom('1 2\n3');
    expect(errors).toEqual([]);
    expect(blocks).toEqual([1, 2, 3]);
  });

  it('flags out-of-range values above 1023', () => {
    const { blocks, errors } = parseCustom('1024, 2000');
    expect(blocks).toEqual([]);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatch(/out of range/);
  });

  it('flags negative values as out of range', () => {
    const { blocks, errors } = parseCustom('-1, -5');
    expect(blocks).toEqual([]);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatch(/out of range/);
  });

  it('flags non-integer tokens', () => {
    const { blocks, errors } = parseCustom('3.5, abc, 4');
    expect(blocks).toEqual([4]);
    expect(errors).toHaveLength(2);
    expect(errors.some((e) => e.includes('3.5'))).toBe(true);
    expect(errors.some((e) => e.includes('abc'))).toBe(true);
  });

  it('empty input produces a documented "enter at least one" error, no throw', () => {
    expect(() => parseCustom('')).not.toThrow();
    const { blocks, errors } = parseCustom('');
    expect(blocks).toEqual([]);
    expect(errors).toEqual(['Enter at least one block number.']);
  });

  it('whitespace-only input behaves the same as empty input', () => {
    const { blocks, errors } = parseCustom('   \n  \t ');
    expect(blocks).toEqual([]);
    expect(errors).toEqual(['Enter at least one block number.']);
  });

  it('mixed valid and invalid tokens: valid ones are kept, invalid ones reported', () => {
    const { blocks, errors } = parseCustom('5, 2000, 10, abc, -3, 1023');
    expect(blocks).toEqual([5, 10, 1023]);
    expect(errors).toHaveLength(3);
  });

  it('boundary value 1023 is valid, 1024 is not (maxBlockExclusive=1024)', () => {
    expect(parseCustom('1023').errors).toEqual([]);
    expect(parseCustom('1024').errors).toHaveLength(1);
  });
});
