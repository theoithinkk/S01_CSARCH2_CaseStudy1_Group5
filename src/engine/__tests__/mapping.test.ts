// ============================================================
// Address mapping tests — setIndex/tag across several cache configs.
// Address mapping: setIndex = b mod numSets, tag = floor(b / numSets)
// ============================================================
import { describe, it, expect } from 'vitest';
import { mapAddress } from '../cache';

describe('mapAddress — numCacheBlocks=8 (numSets=2)', () => {
  const numSets = 2;
  it('matches the doc table (§2.2) for blocks 0-8', () => {
    const table = [
      { block: 0, setIndex: 0, tag: 0 },
      { block: 1, setIndex: 1, tag: 0 },
      { block: 2, setIndex: 0, tag: 1 },
      { block: 3, setIndex: 1, tag: 1 },
      { block: 4, setIndex: 0, tag: 2 },
      { block: 5, setIndex: 1, tag: 2 },
      { block: 6, setIndex: 0, tag: 3 },
      { block: 7, setIndex: 1, tag: 3 },
      { block: 8, setIndex: 0, tag: 4 },
    ];
    for (const { block, setIndex, tag } of table) {
      expect(mapAddress(block, numSets)).toEqual({ setIndex, tag });
    }
  });
});

describe('mapAddress — numCacheBlocks=16 (numSets=4)', () => {
  const numSets = 4;
  it('round-robins across 4 sets', () => {
    for (let b = 0; b < 20; b++) {
      const { setIndex, tag } = mapAddress(b, numSets);
      expect(setIndex).toBe(b % 4);
      expect(tag).toBe(Math.floor(b / 4));
    }
  });
  it('spot checks', () => {
    expect(mapAddress(0, numSets)).toEqual({ setIndex: 0, tag: 0 });
    expect(mapAddress(3, numSets)).toEqual({ setIndex: 3, tag: 0 });
    expect(mapAddress(4, numSets)).toEqual({ setIndex: 0, tag: 1 });
    expect(mapAddress(1023, numSets)).toEqual({ setIndex: 3, tag: 255 });
  });
});

describe('mapAddress — numCacheBlocks=32 (numSets=8)', () => {
  const numSets = 8;
  it('round-robins across 8 sets', () => {
    for (let b = 0; b < 40; b++) {
      const { setIndex, tag } = mapAddress(b, numSets);
      expect(setIndex).toBe(b % 8);
      expect(tag).toBe(Math.floor(b / 8));
    }
  });
  it('spot checks including the top of main memory (block 1023)', () => {
    expect(mapAddress(0, numSets)).toEqual({ setIndex: 0, tag: 0 });
    expect(mapAddress(7, numSets)).toEqual({ setIndex: 7, tag: 0 });
    expect(mapAddress(8, numSets)).toEqual({ setIndex: 0, tag: 1 });
    expect(mapAddress(1023, numSets)).toEqual({ setIndex: 7, tag: 127 });
  });
});

describe('mapAddress — numCacheBlocks=4 (numSets=1, minimum config)', () => {
  const numSets = 1;
  it('every block maps to the single set; tag == block', () => {
    for (const b of [0, 1, 2, 3, 100, 1023]) {
      expect(mapAddress(b, numSets)).toEqual({ setIndex: 0, tag: b });
    }
  });
});
