# Machine 7 - 4-Way Set-Associative Cache Simulator (LRU vs MRU)

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

`vite.config.ts` sets `base: './'` so asset paths are **relative** - the same build
works both at a domain root (Vercel) and under a sub-path (GitHub Pages).

- **GitHub Pages (current):** `.github/workflows/deploy.yml` builds and publishes
  `dist/` to Pages automatically on every push to `main`. One-time setup: repo
  **Settings → Pages → Build and deployment → Source: GitHub Actions**.
- **Vercel (alternative):** import the repo at vercel.com, framework preset *Vite*,
  build `npm run build`, output `dist/` - no extra config needed.

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
block size - at `B=2` the two differ by 2 cycles, at `B=32` by 32.

**AMAT** and total time:

```
AMAT      = Th + MissRate · (P_miss − Th)
TotalTime = Hits·Th + Misses·P_miss
```

> **Design note - read policy.** Per the Machine 7 brief, the read policy affects the
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

**Worked example** - 8 cache blocks (2 sets x 4 ways), block size 4 words,
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

**Replacement divergence** - extending the sequence with block 8 (set 0, tag 4) fills
set 0 and forces the first eviction. The two policies choose different victims from
the same set state: **LRU evicts tag 0** (the oldest line), **MRU evicts tag 3** (the
newest). Hit/miss counts remain identical through this step; only the resulting cache
contents differ. This is visible in the app by stepping to the final access and
comparing the two grids.

**Read policy invariant** - switching load-through <-> non-load-through leaves every
hit/miss outcome and every cache line byte-identical; only AMAT and total time change.
This can be checked in the app by toggling the read policy and confirming the two cache
grids do not move.

---

## 3. LRU vs MRU - analysis (real simulator output)

All figures below come from **running this simulator** at the default configuration:
**16 cache blocks (4 sets × 4 ways), block size 16 words, load-through** (miss penalty
= 10 cycles). `n` = total cache blocks = 16.

Note the key structural fact: with 4 sets, each set is the target of `1024 / 4 = 256`
distinct memory blocks but holds only 4 ways. For the built-in sequences (which walk
`0 … 2n−1 = 0 … 31`), **8 distinct blocks map to each set** - double the 4 available
ways. This 2× over-subscription per set is exactly the regime where LRU and MRU
diverge.

### Test case (a) - Sequential (`0…2n-1` twice; 64 accesses)

| Metric | LRU | MRU |
|---|---:|---:|
| Hits | 0 | **16** |
| Miss rate | 100.0% | **75.0%** |
| AMAT (cycles) | 10.00 | **7.75** |
| Total time (cycles) | 640 | **496** |

**Why:** each set cycles through 8 tags but has 4 ways. LRU always evicts the
least-recently-used line - which, in a linear cyclic scan, is precisely the line that
will be requested *next* time around. LRU therefore evicts every block just before it
is reused: **0% hit rate (pathological LRU thrashing).** MRU evicts the *most* recent
line instead, protecting the 3 older lines in each set, so a quarter of the accesses hit
on the second pass. **MRU wins decisively on cyclic scans larger than the cache.**

### Test case (b) - Mid-repeat (`0..n-1`, `0..2n-1` ×2, then each segment reversed; 160 accesses)

| Metric | LRU | MRU |
|---|---:|---:|
| Hits | 16 | **68** |
| Hit rate | 10.0% | **42.5%** |
| AMAT (cycles) | 9.10 | **6.17** |
| Total time (cycles) | 1456 | **988** |

**Why:** the pattern is dominated by long cyclic runs plus their reversals, which is
still adversarial for LRU for the same reason as (a). Reversal only helps a policy if
the reversed working set *fits* in the set - here each reversed segment still sweeps 8
tags through 4 ways, so LRU keeps evicting the block it is about to revisit. MRU's habit
of sacrificing the newest line keeps a stable working set of older lines resident, so it
captures far more temporal reuse - over **4×** the hits of LRU.

### Test case (c) - Random (64 accesses, block indices 0–1023, seeded)

| Metric | LRU | MRU |
|---|---:|---:|
| Hits | 1 | 2 |
| Hit rate | 1.6% | 3.1% |
| AMAT (cycles) | 9.86 | 9.72 |
| Total time (cycles) | 631 | 622 |

**Why:** with 64 random draws from 1024 blocks there is almost no locality to exploit,
so both policies miss on nearly everything. The one-hit difference here is **sampling
noise, not a policy advantage** - re-seeding from the UI (*Regenerate*) moves the
counts around and either policy may come out marginally ahead. **When there is no reuse
pattern, replacement policy barely matters.**

### Read policy comparison

Same runs, same hit/miss counts, only the miss penalty changes
(`P_miss = 10` vs `26` at `B=16`):

| Test case | Policy | Total time - load-through | Total time - non-load-through |
|---|---|---:|---:|
| (a) Sequential | LRU | 640 | 1664 |
| (a) Sequential | MRU | 496 | 1264 |
| (b) Mid-repeat | LRU | 1456 | 3760 |
| (b) Mid-repeat | MRU | 988 | 2460 |
| (c) Random | LRU | 631 | 1639 |
| (c) Random | MRU | 622 | 1614 |

The cache array contents are byte-identical between the two columns - a useful
correctness check, since read policy must not influence replacement decisions.

### Takeaways

1. **LRU is not universally best.** For working sets that cyclically exceed the per-set
   capacity, LRU degenerates to 0% hits while MRU recovers a meaningful share - the
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

- **Dual live grids** - LRU (blue) and MRU (violet) caches animate in lockstep; each
  cell shows valid bit, tag (hex), recency sparkline, and a HIT/MISS/EVICTED state
  (colour + pill + border-style, never colour alone).
- **Two view modes** - *step-by-step animated trace* (transport controls: ⏮ ◀ ▶/⏸ ▶ ⏭,
  0.5×/1×/2×/4× speed) or *final snapshot*. Keyboard: `Space` play/pause, `←/→` step,
  `+/−` speed.
- **Text trace log** (always present, in both view modes) - one line per access: step,
  block, set, tag, and the LRU & MRU outcome (incl. evicted tag). Click a line to jump
  the player there.
- **Stats table** - per policy: accesses, hits, misses, hit/miss rate, AMAT, total time,
  with a delta arrow marking the better column.
- **Config** - block size, cache blocks (power-of-2 steppers, validated), read policy,
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
    fonts/             # self-hosted woff2 (Silkscreen, Share Tech, Nanum Pen Script)
    lib/format.ts      # hex / percentage / cycle formatting
    App.tsx · main.tsx · index.css
  index.html · vite.config.ts · tailwind.config.js · tsconfig.json
```

The engine takes a config + sequence and returns a deterministic array of per-step
snapshots that the UI simply replays - so correctness is decoupled from rendering.

---

## 6. Engine reference

Everything below lives under `src/engine/` and has no React or DOM dependency.
Importing from `src/engine` (the barrel) re-exports all of it.

### `cache.ts` - mapping, replacement, and the trace

**`mapAddress(block, numSets)` → `{ setIndex, tag }`**
Splits a main-memory block number into the set it maps to and the tag stored in the
line. Set-associative mapping puts block `b` in set `b mod numSets`, and the tag is
whatever is left over, `floor(b / numSets)`. Two blocks collide in the same set exactly
when they share a `setIndex`, which is what makes replacement necessary.

**`simulate(config, sequence, policy, timing?)` → `SimResult`**
Runs one policy over the whole access sequence and returns `{ policy, config, steps,
stats }`. It walks the sequence one block at a time and for each access:

1. maps the block to `(setIndex, tag)`;
2. scans the four ways of that set for a valid line holding the same tag;
3. on a **hit**, stamps that line with the current logical clock and increments `hits`;
4. on a **miss**, increments `misses` and fills a line - an invalid (never-used) way if
   the set still has one, otherwise the victim chosen by the policy;
5. pushes a `TraceStep` recording the block, set, tag, outcome, which way was touched,
   the evicted tag if any, the running hit/miss counts, and a **deep copy of the entire
   cache** as it stands after the access.

Because every step carries a full snapshot, the UI can jump to any point in the run
without re-simulating. The function is deterministic: same config and sequence always
produce the same steps.

**`simulateBoth(config, sequence, timing?)` → `{ lru, mru }`**
Calls `simulate` twice over the same sequence, once per policy, so the two runs are
directly comparable step for step. This is what the side-by-side view uses.

**Internal helpers**

- `makeSet(associativity)` - builds one set as an array of empty lines.
- `rankSet(lines)` - converts the raw timestamps in a set into recency ranks, where
  `0` is the most recently used line and `-1` marks an empty way. Only used to drive
  the recency bars in the UI, not the replacement decision itself.
- `snapshot(cache)` - deep-copies the cache into plain data, attaching each line's
  recency rank. Copying matters: without it every stored step would alias the same
  mutable array and the trace would collapse to the final state.
- `selectVictim(lines, policy)` - the one place the two policies differ. Each line
  carries the logical time it was last touched; **LRU** evicts the line with the
  smallest timestamp (untouched longest), **MRU** evicts the largest (just used). Ties
  resolve to the lowest way index, though a strictly increasing clock makes them
  unreachable in practice.

### `stats.ts` - timing model

**`DEFAULT_TIMING`**
The cycle costs the simulator bills against: `hitTime` (Th) = 1, `memAccess` (Tm) = 10,
`transferPerWord` (Tb) = 1 cycle per word.

**`missPenalty(config, timing?)` → cycles**
The cost of one miss, which is where the read policy applies:

- **load-through** returns `Tm`. Memory forwards the requested word to the CPU the
  moment it arrives, so the CPU resumes without waiting for the rest of the block.
- **non-load-through** returns `Tm + Tb × blockSize`. The whole block must land in the
  cache before the CPU may read from it, so the full transfer is on the critical path.

Only the non-load-through penalty scales with block size; load-through is flat.

**`computeStats(policy, config, hits, misses, timing?)` → `Stats`**
Derives the reported figures from the hit and miss counts:

```
totalAccesses = hits + misses
hitRate       = hits / totalAccesses
missRate      = misses / totalAccesses
AMAT          = Th + missRate × (P_miss − Th)
totalTime     = hits × Th + misses × P_miss
```

Rates fall back to `0` when there are no accesses, so an empty sequence does not
divide by zero. Because it takes counts rather than a whole run, the UI can call it
with the running totals at any step to show the statistics building up mid-playback.

### `sequences.ts` - access patterns

`n` is the total number of cache blocks in every generator below.

**`sequential(n)`** - `0 … 2n−1`, then the identical run again. Touches twice as many
distinct blocks as the cache holds, so on the second pass every line has been displaced.

**`midRepeat(n)`** - `0 … n−1`, then `0 … 2n−1` twice, then all three of those segments
again with each one reversed. Mixes a working set that fits with one that does not.

**`mulberry32(seed)`** - a small seeded pseudo-random generator returning a function
that yields values in `[0, 1)`. Used instead of `Math.random` so a given seed always
replays the same "random" sequence.

**`random(count?, maxBlockExclusive?, seed?)`** - `count` block numbers (default 64)
drawn from `0 … maxBlockExclusive−1` (default 1024) using `mulberry32`.

**`parseCustom(input, maxBlockExclusive?)` → `{ blocks, errors }`**
Reads a user-typed sequence split on commas and whitespace. Non-integers and
out-of-range values are collected into `errors` rather than thrown, and empty input
reports its own message, so the UI can show what is wrong while keeping the valid
blocks it did parse.

**`buildSequence(id, n, opts?)` → `{ blocks, errors }`**
Dispatches on the selected test case (`sequential`, `mid-repeat`, `random`, `custom`)
and returns the resulting sequence in the same shape, so callers handle one type
regardless of which pattern is chosen.

### `validate.ts` - configuration limits

**`LIMITS`** - the fixed bounds: minimum 4 cache blocks, minimum block size 2 words,
associativity 4, and 1024 main-memory blocks.

**`isPowerOfTwo(n)`** - true for positive integer powers of two, via `n & (n − 1)`.

**`nextPow2(n)` / `prevPow2(n)`** - round up or down to a power of two. These drive the
+/− steppers so the configuration can only ever land on a legal value.

**`validateCacheBlocks(n)` / `validateBlockSize(n)`** - return an error string when a
value breaks a rule (not a power of two, below the minimum, or not divisible by the
associativity) and `null` when it is acceptable. `App` checks both before simulating
and shows the message instead of running.

### Types worth knowing (`types.ts`)

- **`TraceStep`** - one access plus the state of the whole cache after it: `block`,
  `setIndex`, `tag`, `result`, `wayIndex`, `evicted`, `evictedTag`, the running `hits`
  and `misses`, and `sets`.
- **`LineSnapshot`** - one way: `valid`, `tag`, `timestamp`, and `recencyRank`
  (`0` = most recently used, `-1` = empty).
- **`Stats`** - the figures rendered in the results table, including `missPenalty` and
  `amat` so the UI can show the timing model it used alongside the numbers.