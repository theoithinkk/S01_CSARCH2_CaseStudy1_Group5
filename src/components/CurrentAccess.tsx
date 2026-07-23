// ============================================================
// CurrentAccess — the "what is happening right now" readout.
// The accessed MEMORY BLOCK is drawn as a physical block that maps to
// (set, tag); each policy's result shows as a status LED chip.
// ============================================================
import { motion, useReducedMotion } from 'framer-motion';
import type { TraceStep } from '../engine/types';
import type { ViewMode } from './ConfigPanel';
import { hex } from '../lib/format';

interface CurrentAccessProps {
  lruStep: TraceStep | null;
  mruStep: TraceStep | null;
  shown: number;
  total: number;
  viewMode: ViewMode;
}

function ResultChip({ label, result, evicted }: { label: string; result: 'hit' | 'miss'; evicted: number | null }) {
  const isHit = result === 'hit';
  const color = isHit ? 'var(--hit)' : 'var(--miss)';
  const bg = isHit ? 'var(--hit-bg)' : 'var(--miss-bg)';
  return (
    <div className="flex items-center gap-2 rounded-md border px-2.5 py-1.5" style={{ background: bg, borderColor: color }}>
      <span className="led" style={{ color, background: color }} />
      <span className="silk" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span className="font-mono text-[12px] font-semibold" style={{ color }}>
        {isHit ? 'HIT' : evicted !== null ? `MISS · evict ${hex(evicted)}` : 'MISS'}
      </span>
    </div>
  );
}

/** The accessed memory block, drawn as a physical block. */
function MemBlock({ n }: { n: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="silk text-[9px]" style={{ color: 'var(--text-faint)' }}>
        Memory block
      </span>
      <div
        className="relative flex h-11 w-12 items-center justify-center rounded-md"
        style={{
          background: 'linear-gradient(160deg, color-mix(in srgb, var(--accent) 26%, var(--surface-2)), var(--surface-2))',
          border: '1.5px solid var(--accent)',
          boxShadow: '0 0 14px -3px var(--accent), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* corner solder pads */}
        {[
          'left-1 top-1',
          'right-1 top-1',
          'bottom-1 left-1',
          'bottom-1 right-1',
        ].map((pos) => (
          <span key={pos} className={`absolute ${pos} h-1 w-1 rounded-full`} style={{ background: 'var(--accent)', opacity: 0.6 }} />
        ))}
        <span className="font-mono text-[16px] font-bold" style={{ color: 'var(--text)' }}>
          {n}
        </span>
      </div>
    </div>
  );
}

/** A decoded field (set / tag) as a labeled block. */
function MapChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="silk text-[9px]" style={{ color: 'var(--text-faint)' }}>
        {label}
      </span>
      <div
        className="flex h-11 min-w-[46px] items-center justify-center rounded-md border px-2.5 font-mono text-[15px] font-semibold"
        style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
      >
        {value}
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <span className="mt-4 font-mono text-[15px]" style={{ color: 'var(--copper-bright)' }}>
      →
    </span>
  );
}

export default function CurrentAccess({ lruStep, mruStep, shown, total, viewMode }: CurrentAccessProps) {
  const reduce = useReducedMotion();
  const step = lruStep ?? mruStep;

  return (
    <div className="chip chip-pin1 hover-glow overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3">
        {/* Left: mapping of the accessed block */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="silk text-[9px]" style={{ color: 'var(--text-faint)' }}>
              {viewMode === 'snapshot' ? 'Final state' : 'Access'}
            </span>
            <span className="font-mono text-[17px] font-bold" style={{ color: 'var(--accent)' }}>
              {shown}
              <span style={{ color: 'var(--text-faint)' }}> / {total}</span>
            </span>
          </div>
          <div className="h-10 w-px" style={{ background: 'var(--border)' }} />
          {step ? (
            <motion.div
              key={step.step}
              initial={reduce ? undefined : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3"
            >
              <MemBlock n={step.block} />
              <Arrow />
              <MapChip label="Set" value={`s${step.setIndex}`} />
              <MapChip label="Tag" value={hex(step.tag)} />
            </motion.div>
          ) : (
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Press play or step forward to begin.
            </span>
          )}
        </div>

        {/* Right: per-policy result LEDs */}
        {lruStep && mruStep && (
          <div className="flex items-center gap-2.5">
            <ResultChip label="LRU" result={lruStep.result} evicted={lruStep.evictedTag} />
            <ResultChip label="MRU" result={mruStep.result} evicted={mruStep.evictedTag} />
          </div>
        )}
      </div>
    </div>
  );
}
