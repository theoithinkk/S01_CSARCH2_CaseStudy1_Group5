# Machine 7 — 4-Way Set-Associative Cache Simulator (LRU vs MRU)

An interactive, web-based simulator that runs a **4-way set-associative (BSA) cache**
under **LRU** and **MRU** replacement side by side, on the same access sequence, and
visualises every access step-by-step. Built for a university computer-architecture
course.

- **Live demo:** `https://theoithinkk.github.io/S01_CSARCH2_CaseStudy1_Group5/`
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

- **GitHub Pages (current):** `.github/workflows/deploy.yml` builds and publishes
  `dist/` to Pages automatically on every push to `main`. One-time setup: repo
  **Settings → Pages → Build and deployment → Source: GitHub Actions**.
- **Vercel (alternative):** import the repo at vercel.com, framework preset *Vite*,
  build `npm run build`, output `dist/` — no extra config needed.

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
Load-through:      P_miss = Tm             = 10 cycles  (independent of B)
Non-load-through:  P_miss = Tm + Tb·B      = 10 + B     (default B=16 → 26 cycles)
```

Under **load-through**, the requested word is forwarded to the CPU as soon as it
arrives from memory; the remainder of the block continues loading behind it, so the
CPU never waits for the full transfer. Under **non-load-through**, the entire block
must land in the cache before the requested word can be read, so the whole
block-transfer time `Tb·B` is on the critical path.

**Load-through is therefore always the cheaper policy**, and the gap widens with
block size — at `B=2` the two differ by 2 cycles, at `B=32` by 32.

**AMAT** and total time:

```
AMAT      = Th + MissRate · (P_miss − Th)
TotalTime = Hits·Th + Misses·P_miss
```

> **Design note — read policy.** Per the Machine 7 brief, the read policy affects the
> **miss timing / AMAT only**; both policies allocate the block into the cache on a
> miss (standard behaviour). Choosing *load-through* removes the block-transfer term
> from the miss penalty, so hit/miss counts and final cache contents are **identical**
> across read policies and only the timing changes.

### Correctness

The engine (`src/engine/`) is pure and framework-agnostic: `simulate(config, sequence,
policy)` takes a configuration and an access sequence and returns a deterministic array
of per-step snapshots. The UI only replays that array, so correctness is fully decoupled
from rendering.

Correctness was verified by hand-working traces on paper and comparing them against the
simulator's step-by-step trace log, which prints the set, tag, and outcome of every
access. The worked example below can be reproduced directly in the app by selecting
**Custom** and entering the sequence.

**Worked example** — 8 cache blocks (2 sets x 4 ways), block size 4 words,
sequence `0,1,2,3,0,1,2,3,4,5,6,7`, LRU:

| Steps | Blocks | Outcome | Reason |
|---|---|---|---|
| 1-4 | 0,1,2,3 | 4 misses | compulsory (cold) misses |
| 5-8 | 0,1,2,3 | 4 hits | all four still resident |
| 9-12 | 4,5,6,7 | 4 misses | new tags; sets still have free ways |

Totals: **4 hits, 8 misses**, no evictions (8 distinct blocks, 8 lines).

| Read policy | P_miss | Total time | AMAT |
|---|---:|---:|---:|
| Load-through | 10 | 84 | 7.00 |
| Non-load-through | 10 + 4 = 14 | 116 | 9.67 |

**Replacement divergence** — extending the sequence with block 8 (set 0, tag 4) fills
set 0 and forces the first eviction. The two policies choose different victims from
the same set state: **LRU evicts tag 0** (the oldest line), **MRU evicts tag 3** (the
newest). Hit/miss counts remain identical through this step; only the resulting cache
contents differ. This is visible in the app by stepping to the final access and
comparing the two grids.

**Read policy invariant** — switching load-through <-> non-load-through leaves every
hit/miss outcome and every cache line byte-identical; only AMAT and total time change.
This can be checked in the app by toggling the read policy and confirming the two cache
grids do not move.

---

## 3. LRU vs MRU — analysis (real simulator output)

All figures below come from **running this simulator** at the default configuration:
**16 cache blocks (4 sets × 4 ways), block size 16 words, load-through** (miss penalty
= 10 cycles). `n` = total cache blocks = 16.

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
| AMAT (cycles) | 10.00 | **7.75** |
| Total time (cycles) | 640 | **496** |

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
| AMAT (cycles) | 9.10 | **6.17** |
| Total time (cycles) | 1456 | **988** |

**Why:** the pattern is dominated by long cyclic runs plus their reversals, which is
still adversarial for LRU for the same reason as (a). Reversal only helps a policy if
the reversed working set *fits* in the set — here each reversed segment still sweeps 8
tags through 4 ways, so LRU keeps evicting the block it is about to revisit. MRU's habit
of sacrificing the newest line keeps a stable working set of older lines resident, so it
captures far more temporal reuse — over **4×** the hits of LRU.

### Test case (c) — Random (64 accesses, block indices 0–1023, seeded)

| Metric | LRU | MRU |
|---|---:|---:|
| Hits | 1 | 2 |
| Hit rate | 1.6% | 3.1% |
| AMAT (cycles) | 9.86 | 9.72 |
| Total time (cycles) | 631 | 622 |

**Why:** with 64 random draws from 1024 blocks there is almost no locality to exploit,
so both policies miss on nearly everything. The one-hit difference here is **sampling
noise, not a policy advantage** — re-seeding from the UI (*Regenerate*) moves the
counts around and either policy may come out marginally ahead. **When there is no reuse
pattern, replacement policy barely matters.**

### Read policy comparison

Same runs, same hit/miss counts, only the miss penalty changes
(`P_miss = 10` vs `26` at `B=16`):

| Test case | Policy | Total time — load-through | Total time — non-load-through |
|---|---|---:|---:|
| (a) Sequential | LRU | 640 | 1664 |
| (a) Sequential | MRU | 496 | 1264 |
| (b) Mid-repeat | LRU | 1456 | 3760 |
| (b) Mid-repeat | MRU | 988 | 2460 |
| (c) Random | LRU | 631 | 1639 |
| (c) Random | MRU | 622 | 1614 |

The cache array contents are byte-identical between the two columns — a useful
correctness check, since read policy must not influence replacement decisions.

### Takeaways

1. **LRU is not universally best.** For working sets that cyclically exceed the per-set
   capacity, LRU degenerates to 0% hits while MRU recovers a meaningful share — the
   textbook motivation for MRU (Machine 7 makes this visible interactively).
2. **MRU ≥ LRU on every structured case here**, because the built-in sequences are
   cyclic/repeating and over-subscribe each set 2×.
3. **On random access both converge**, confirming that policy choice only matters when
   the access stream has exploitable temporal structure.
4. **Read policy is orthogonal to hit/miss behaviour**: switching load-through ↔
   non-load-through leaves every hit/miss and every cache line identical, and only
   rescales the miss penalty (10 → 26 cycles at `B=16`), raising every AMAT and total
   time proportionally. Load-through is always the faster policy, and its advantage
   grows with block size.

---

## 4. Features

- **Dual live grids** — LRU (blue) and MRU (violet) caches animate in lockstep; each
  cell shows valid bit, tag (hex), recency sparkline, and a HIT/MISS/EVICTED state
  (colour + pill + border-style, never colour alone).
- **Two view modes** — *step-by-step animated trace* (transport controls: ⏮ ◀ ▶/⏸ ▶ ⏭,
  0.5×/1×/2×/4× speed) or *final snapshot*. Keyboard: `Space` play/pause, `←/→` step,
  `+/−` speed.
- **Text trace log** (always present, in both view modes) — one line per access: step,
  block, set, tag, and the LRU & MRU outcome (incl. evicted tag). Click a line to jump
  the player there.
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
    engine/            # pure, framework-agnostic simulation core
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