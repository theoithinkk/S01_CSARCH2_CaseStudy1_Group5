// ============================================================
// CacheGrid / PolicyCachePanel — sets × ways grid for one policy.
// Colored top accent bar keeps LRU (blue) vs MRU (violet) distinct (§4).
// ============================================================
import type { CacheConfig, LineSnapshot, Policy, TraceStep } from '../engine/types';
import CacheCell, { type CellState } from './CacheCell';

interface CacheGridProps {
  policy: Policy;
  accentVar: string; // 'var(--accent)' | 'var(--accent-mru)'
  config: CacheConfig;
  step: TraceStep | null;
  hits: number;
  misses: number;
}

const EMPTY_LINE: LineSnapshot = { valid: false, tag: null, timestamp: null, recencyRank: -1 };

/** Determine a cell's visual state given the currently displayed step. */
function cellState(
  step: TraceStep | null,
  setIndex: number,
  wayIndex: number,
  line: LineSnapshot,
): { state: CellState; isCurrent: boolean } {
  const isCurrent = !!step && step.setIndex === setIndex && step.wayIndex === wayIndex;
  if (isCurrent && step) {
    if (step.result === 'hit') return { state: 'hit', isCurrent: true };
    if (step.evicted) return { state: 'evicted', isCurrent: true };
    return { state: 'miss', isCurrent: true };
  }
  return { state: line.valid ? 'valid' : 'empty', isCurrent: false };
}

export default function CacheGrid({ policy, accentVar, config, step, hits, misses }: CacheGridProps) {
  const numSets = config.numCacheBlocks / config.associativity;
  const ways = config.associativity;
  const pulseKey = step?.step ?? 0;

  const setsData =
    step?.sets ??
    Array.from({ length: numSets }, (_, setIndex) => ({
      setIndex,
      lines: Array.from({ length: ways }, () => EMPTY_LINE),
    }));

  return (
    <section className="chip hover-lift overflow-hidden">
      {/* Accent identity bar */}
      <div className="h-1 w-full" style={{ background: accentVar }} />
      {/* Panel header — silkscreen chip label */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="led" style={{ color: accentVar, background: accentVar }} />
          <h3 className="silk silk-strong text-[13px] tracking-[0.12em]">U{policy === 'LRU' ? '1' : '2'} · {policy}</h3>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="flex items-center gap-1" style={{ color: 'var(--hit)' }}>
            <span className="led" style={{ color: 'var(--hit)', background: 'var(--hit)', width: 6, height: 6 }} />
            {hits} hit
          </span>
          <span className="flex items-center gap-1" style={{ color: 'var(--miss)' }}>
            <span className="led" style={{ color: 'var(--miss)', background: 'var(--miss)', width: 6, height: 6 }} />
            {misses} miss
          </span>
        </div>
      </div>

      {/* Grid — the silicon die */}
      <div className="overflow-x-auto p-4 thin-scroll" style={{ background: 'var(--surface)' }}>
        {/* Way index header */}
        <div className="mb-2 flex gap-3 pl-[48px]">
          {Array.from({ length: ways }, (_, w) => (
            <div
              key={w}
              className="min-w-[68px] flex-1 text-center font-mono text-[10px] uppercase tracking-[0.08em]"
              style={{ color: 'var(--text-faint)' }}
            >
              way {w}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          {setsData.map((set) => {
            const activeRow = !!step && step.setIndex === set.setIndex;
            return (
              <div
                key={set.setIndex}
                className="flex items-center gap-3 rounded-xl py-1.5 pl-1.5 pr-2 transition-colors duration-200"
                style={{ background: activeRow ? `color-mix(in srgb, ${accentVar} 9%, transparent)` : 'transparent' }}
              >
                <div
                  className="flex h-7 w-9 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-semibold"
                  style={{
                    background: activeRow ? accentVar : 'var(--surface-2)',
                    color: activeRow ? 'var(--bg)' : 'var(--text-muted)',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                >
                  S{set.setIndex}
                </div>
                <div className="flex flex-1 gap-3">
                  {set.lines.map((line, wayIndex) => {
                    const { state, isCurrent } = cellState(step, set.setIndex, wayIndex, line);
                    const blockNumber =
                      line.valid && line.tag !== null ? line.tag * numSets + set.setIndex : null;
                    return (
                      <div key={wayIndex} className="min-w-[68px] flex-1">
                        <CacheCell
                          line={line}
                          state={state}
                          associativity={ways}
                          blockNumber={blockNumber}
                          evictedTag={isCurrent ? step?.evictedTag : null}
                          pulseKey={pulseKey}
                          isCurrent={isCurrent}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
