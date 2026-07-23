// ============================================================
// DualCacheView / ComparisonGrid — LRU | MRU panes in lockstep (§4).
// ============================================================
import type { CacheConfig, SimResult, TraceStep } from '../engine/types';
import CacheGrid from './CacheGrid';
import Legend from './Legend';

interface DualCacheViewProps {
  config: CacheConfig;
  lru: SimResult;
  mru: SimResult;
  /** Index into steps to display (-1 = empty/initial). */
  stepIndex: number;
}

function stepAt(result: SimResult, i: number): TraceStep | null {
  if (i < 0 || i >= result.steps.length) return null;
  return result.steps[i];
}

export default function DualCacheView({ config, lru, mru, stepIndex }: DualCacheViewProps) {
  const lruStep = stepAt(lru, stepIndex);
  const mruStep = stepAt(mru, stepIndex);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <h2 className="hdr">Cache Array · sets × 4 ways</h2>
        <Legend />
      </div>

      {/* Two ICs, centered on the stage; wrap on narrow screens. */}
      <div className="flex flex-wrap items-start justify-center gap-5">
        <CacheGrid
          policy="LRU"
          accentVar="var(--accent)"
          config={config}
          step={lruStep}
          hits={lruStep?.hits ?? 0}
          misses={lruStep?.misses ?? 0}
        />
        <CacheGrid
          policy="MRU"
          accentVar="var(--accent-mru)"
          config={config}
          step={mruStep}
          hits={mruStep?.hits ?? 0}
          misses={mruStep?.misses ?? 0}
        />
      </div>
    </div>
  );
}
