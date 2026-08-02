// Sticky mobile summary. Once the real cache grids scroll off screen there is
// nothing left tying the stats and trace back to what the cache is actually
// doing, so this pins a condensed view of the set currently being touched.
// Mobile only - on desktop the grids stay visible alongside everything else.
import type { TraceStep } from '../engine/types';
import { hex } from '../lib/format';

interface MiniCacheProps {
  lruStep: TraceStep | null;
  mruStep: TraceStep | null;
  associativity: number;
  shown: number;
  total: number;
  visible: boolean;
}

// One policy's row: the four ways of the set being accessed right now.
function PolicyRow({ label, accent, step, associativity }: { label: string; accent: string; step: TraceStep | null; associativity: number }) {
  const set = step?.sets.find((s) => s.setIndex === step.setIndex);
  const lines = set?.lines ?? Array.from({ length: associativity }, () => null);

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-8 shrink-0 font-mono text-[10px] font-bold" style={{ color: accent }}>
        {label}
      </span>
      <div className="flex flex-1 gap-1">
        {lines.map((line, i) => {
          const isTouched = step?.wayIndex === i;
          const hit = step?.result === 'hit';
          const filled = line?.valid;
          // the way just touched carries the outcome colour, the rest stay quiet
          const color = isTouched ? (hit ? 'var(--hit)' : 'var(--miss)') : 'var(--border-strong)';
          return (
            <span
              key={i}
              className="flex h-[22px] flex-1 items-center justify-center rounded-sm font-mono text-[9px]"
              style={{
                background: isTouched ? (hit ? 'var(--hit-bg)' : 'var(--miss-bg)') : 'var(--surface-2)',
                border: `1px solid ${color}`,
                color: isTouched ? color : filled ? 'var(--text-muted)' : 'var(--text-faint)',
              }}
            >
              {filled && line ? hex(line.tag) : '·'}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function MiniCache({ lruStep, mruStep, associativity, shown, total, visible }: MiniCacheProps) {
  const step = lruStep ?? mruStep;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 border-t sm:hidden"
      style={{
        background: 'var(--bg-elevated)',
        borderColor: 'var(--copper)',
        // slides out of the way instead of unmounting, so it does not pop
        transform: visible ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform 0.22s ease-out',
        boxShadow: '0 -6px 20px -10px rgba(0,0,0,0.8)',
      }}
      aria-hidden={!visible}
    >
      <div className="flex flex-col gap-1.5 px-3 pb-3 pt-2">
        <div className="flex items-center justify-between gap-2">
          <span className="silk text-[9px]">
            {step ? `set s${step.setIndex} · blk ${step.block} · tag ${hex(step.tag)}` : 'cache'}
          </span>
          <span className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>
            {shown}/{total}
          </span>
        </div>
        <PolicyRow label="LRU" accent="var(--accent)" step={lruStep} associativity={associativity} />
        <PolicyRow label="MRU" accent="var(--accent-mru)" step={mruStep} associativity={associativity} />
      </div>
    </div>
  );
}
