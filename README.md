# Machine 7 — 4-Way Set-Associative Cache Simulator (LRU vs MRU)

An interactive, web-based simulator that runs a **4-way set-associative (BSA) cache**
under **LRU** and **MRU** replacement side by side, on the same access sequence, and
visualises every access step-by-step. Built for a university computer-architecture
course.

- **Live demo:** _<!-- deployment link placeholder — e.g. https://machine7.vercel.app -->_
- **Video walkthrough:** _<!-- YouTube demo link placeholder -->_

Stack: **React 18 · Vite · TypeScript · Tailwind CSS · Framer Motion**.

---

## 1. Running locally

```bash
cd machine7
npm install
npm run dev      # http://localhost:5173
```

Production build / preview:

```bash
npm run build    # type-checks (tsc) then bundles to dist/
npm run preview  # serve the built dist/ locally
```

### Deployment

`vite.config.ts` sets `base: './'` so asset paths are **relative** — the same build
works both at a domain root (Vercel) and under a sub-path (GitHub Pages).

- **Vercel:** framework preset *Vite*, build `npm run build`, output `dist/`.
- **GitHub Pages:** `npm run build`, publish `dist/`. Relative base means no extra
  config is required even when served from `https://<user>.github.io/<repo>/`.

---

## 2. Cache parameters & timing model

| Parameter | Value | Notes |
|---|---|---|
| Main memory | **1024 blocks** (0–1023) | fixed |
| Associativity | **4 ways** | fixed (Machine 7 = BSA) |
| Cache blocks | **user, default 16** | power of 2, min 4 |
| Number of sets | `cacheBlocks / 4` | 16 → 4 sets |
| Block size | **user, default 16 words** | power of 2, min 2 |
| Replacement | **LRU and MRU** | compared side by side |
| Read policy | **Load-through / Non-load-through** | affects miss timing only |

**Address mapping** (block `b`, `numSets` sets):

```
setIndex = b mod numSets
tag      = floor(b / numSets)
```

**Timing constants:**

| Symbol | Meaning | Value |
|---|---|---|
| `Th` | cache hit time | 1 cycle |
| `Tm` | memory access time | 10 cycles |
| `Tb` | block transfer rate | 1 cycle / word |

**Miss penalty**

```
Load-through:      P_miss = Tm + Tb·B = 10 + B          (default B=16 → 26 cycles)
Non-load-through:  P_miss = Tm         = 10 cycles
```

**AMAT** and total time:

```
AMAT      = Th + MissRate · (P_miss − Th)
TotalTime = Hits·Th + Misses·P_miss
```

> **Design note — read policy.** Per the Machine 7 brief, the read policy affects the
> **miss timing / AMAT only**; both policies allocate the block into the cache on a
> miss (standard behaviour). Choosing *non-load-through* simply drops the block-transfer
> term from the miss penalty, so hit/miss counts are identical across read policies and
> only the timing changes.

### Correctness

The engine (`src/engine/`) is pure and framework-agnostic, and is covered by a unit-test
suite (`src/engine/__tests__/`, run with `npm run test`) that includes hand-worked
examples confirming exact hit/miss traces (all exact):

- LRU, 8 blocks, block size 4, seq `0,1,2,3,0,1,2,3,4,5,6,7` → 4 hits, 8 misses, 116
  cycles, AMAT 9.67. ✓
- Divergence at block 8: **LRU evicts tag 0** (oldest), **MRU evicts tag 3** (newest). ✓
- Non-load-through of the same sequence → 84 cycles, AMAT 7.00. ✓

---

## 3. LRU vs MRU — analysis (real simulator output)

All figures below come from **running this simulator** at the default configuration:
**16 cache blocks (4 sets × 4 ways), block size 16 words, load-through** (miss penalty
= 26 cycles). `n` = total cache blocks = 16.

Note the key structural fact: with 4 sets, each set is the target of `1024 / 4 = 256`
distinct memory blocks but holds only 4 ways. For the built-in sequences (which walk
`0 … 2n−1 = 0 … 31`), **8 distinct blocks map to each set** — double the 4 available
ways. This 2× over-subscription per set is exactly the regime where LRU and MRU
diverge.

### Test case (a) — Sequential (`0…2n-1` twice; 64 accesses)

| Metric | LRU | MRU |
|---|---:|---:|
| Hits | 0 | **16** |
| Miss rate | 100.0% | **75.0%** |
| AMAT (cycles) | 26.00 | **19.75** |
| Total time (cycles) | 1664 | **1264** |

**Why:** each set cycles through 8 tags but has 4 ways. LRU always evicts the
least-recently-used line — which, in a linear cyclic scan, is precisely the line that
will be requested *next* time around. LRU therefore evicts every block just before it
is reused: **0% hit rate (pathological LRU thrashing).** MRU evicts the *most* recent
line instead, protecting the 3 older lines in each set, so a quarter of the accesses hit
on the second pass. **MRU wins decisively on cyclic scans larger than the cache.**

### Test case (b) — Mid-repeat (`0..n-1`, `0..2n-1` ×2, then each segment reversed; 160 accesses)

| Metric | LRU | MRU |
|---|---:|---:|
| Hits | 16 | **68** |
| Hit rate | 10.0% | **42.5%** |
| AMAT (cycles) | 23.50 | **15.37** |
| Total time (cycles) | 3760 | **2460** |

**Why:** the pattern is dominated by long cyclic runs plus their reversals, which is
still adversarial for LRU for the same reason as (a). MRU's habit of sacrificing the
newest line keeps a stable working set of older lines resident, so it captures far more
temporal reuse across the repeated and reversed segments — over **4×** the hits of LRU.

### Test case (c) — Random (64 accesses, block indices 0–1023, seeded)

| Metric | LRU | MRU |
|---|---:|---:|
| Hits | 1 | 2 |
| Hit rate | 1.6% | 3.1% |
| AMAT (cycles) | 25.61 | 25.22 |
| Total time (cycles) | 1639 | 1614 |

**Why:** with 64 random draws from 1024 blocks there is almost no locality to exploit,
so both policies miss on nearly everything and land within a rounding error of each
other. **When there is no reuse pattern, replacement policy barely matters** — the two
policies are effectively tied. (The random sequence is re-seeded from the UI; exact
counts vary per seed, but the "policies roughly tie" conclusion is stable.)

### Takeaways

1. **LRU is not universally best.** For working sets that cyclically exceed the per-set
   capacity, LRU degenerates to 0% hits while MRU recovers a meaningful share — the
   textbook motivation for MRU (Machine 7 makes this visible interactively).
2. **MRU ≥ LRU on every structured case here**, because the built-in sequences are
   cyclic/repeating and over-subscribe each set 2×.
3. **On random access both converge**, confirming that policy choice only matters when
   the access stream has exploitable temporal structure.
4. **Read policy is orthogonal to hit/miss behaviour**: switching load-through ↔
   non-load-through leaves every hit/miss identical and only rescales the miss penalty
   (26 → 10 cycles), lowering every AMAT/total-time proportionally.

---

## 4. Features

- **Dual live grids** — LRU (blue) and MRU (violet) caches animate in lockstep; each
  cell shows valid bit, tag (hex), recency sparkline, and a HIT/MISS/EVICTED state
  (colour + pill + border-style, never colour alone).
- **Two view modes** — *step-by-step animated trace* (transport controls: ⏮ ◀ ▶/⏸ ▶ ⏭,
  0.5×/1×/2×/4× speed) or *final snapshot*. Keyboard: `Space` play/pause, `←/→` step,
  `+/−` speed.
- **Text trace log** (always present) — one line per access: step, block, set, tag, and
  the LRU & MRU outcome (incl. evicted tag). Click a line to jump the player there.
- **Stats table** — per policy: accesses, hits, misses, hit/miss rate, AMAT, total time,
  with a delta arrow marking the better column.
- **Config** — block size, cache blocks (power-of-2 steppers, validated), read policy,
  test case (a/b/c) or a validated **custom** comma-separated sequence.
- **Dark-first theme** (light toggle, persisted) and full `prefers-reduced-motion`
  support.

---

## 5. Project structure

```
machine7/
  src/
    engine/            # pure, framework-agnostic, unit-testable
      types.ts         # shared types
      cache.ts         # N-way set-assoc engine → deterministic trace + stats
      sequences.ts     # sequential / mid-repeat / random / custom generators
      stats.ts         # AMAT, miss penalty, totals (+ timing constants)
      validate.ts      # power-of-2 / min-size boundary checks
      index.ts         # barrel
    components/
      ConfigPanel · CurrentAccess · DualCacheView · CacheGrid · CacheCell
      TraceControls · TraceLog · StatsPanel · ThemeToggle · Legend
      IntroCover · CircuitBackground
    lib/format.ts      # hex / percentage / cycle formatting
    App.tsx · main.tsx · index.css
  index.html · vite.config.ts · tailwind.config.js · tsconfig.json
```

The engine takes a config + sequence and returns a deterministic array of per-step
snapshots that the UI simply replays — so correctness is decoupled from rendering.
