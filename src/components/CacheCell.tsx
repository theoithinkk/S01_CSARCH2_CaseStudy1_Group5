// ============================================================
// CacheCell — one way (cache block/line) within a set.
// Calm by default: resting cells are low-contrast; only the ACTIVE
// cell pops (colored ring + tint). State is never color-only — a pill
// label appears on the active cell. Kept intentionally uncluttered.
// ============================================================
import { useEffect } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import type { LineSnapshot } from '../engine/types';
import { hex } from '../lib/format';

export type CellState = 'empty' | 'valid' | 'hit' | 'miss' | 'evicted';

interface CacheCellProps {
  line: LineSnapshot;
  state: CellState;
  associativity: number;
  blockNumber?: number | null;
  evictedTag?: number | null;
  pulseKey: number;
  isCurrent: boolean;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// Only the active states carry a strong accent; resting cells stay quiet.
const ACCENT: Record<'hit' | 'miss' | 'evicted', { color: string; bg: string; pill: string; glow: string }> = {
  hit: { color: 'var(--hit)', bg: 'var(--hit-bg)', pill: 'HIT', glow: 'rgba(53,224,138,0.35)' },
  miss: { color: 'var(--miss)', bg: 'var(--miss-bg)', pill: 'MISS', glow: 'rgba(255,97,97,0.35)' },
  evicted: { color: 'var(--evict)', bg: 'var(--evict-bg)', pill: 'EVICT', glow: 'rgba(255,194,77,0.4)' },
};

/** Slim recency meter: rank 0 (MRU) fills all segments; oldest fills one. */
function RecencyMeter({ rank, ways, active }: { rank: number; ways: number; active: boolean }) {
  const lit = rank < 0 ? 0 : ways - rank;
  return (
    <div className="flex w-full items-center gap-[3px]" aria-label={rank < 0 ? 'empty' : `recency rank ${rank}`}>
      {Array.from({ length: ways }, (_, i) => (
        <span
          key={i}
          className="h-[3px] flex-1 rounded-full"
          style={{
            background: i < lit ? (active ? 'currentColor' : 'var(--border-strong)') : 'var(--grid-line)',
            opacity: i < lit ? (active ? 0.9 : 0.7) : 0.5,
          }}
        />
      ))}
    </div>
  );
}

export default function CacheCell({
  line,
  state,
  associativity,
  blockNumber,
  evictedTag,
  pulseKey,
  isCurrent,
}: CacheCellProps) {
  const controls = useAnimationControls();
  const reduce = useReducedMotion();
  const isEmpty = state === 'empty';
  const accent = state === 'hit' || state === 'miss' || state === 'evicted' ? ACCENT[state] : null;

  useEffect(() => {
    if (!isCurrent || !accent) return;
    if (reduce) {
      controls.set({ opacity: 1, x: 0, scale: 1 });
      controls.start({ opacity: [0.7, 1] as number[], transition: { duration: 0.001 } });
      return;
    }
    if (state === 'hit') {
      controls.start({ scale: [1, 1.05, 1], transition: { duration: 0.4, ease: EASE_OUT_EXPO } });
    } else if (state === 'miss') {
      controls.start({ x: [0, -2.5, 2.5, -1.5, 0], transition: { duration: 0.4, ease: 'easeInOut' } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulseKey, isCurrent, state, reduce]);

  // Resting vs active styling.
  const bg = isEmpty ? 'transparent' : accent && isCurrent ? accent.bg : 'var(--surface-2)';
  const ring =
    accent && isCurrent
      ? `0 0 0 1.5px ${accent.color}, 0 0 18px ${accent.glow}`
      : isEmpty
        ? 'inset 0 0 0 1px var(--grid-line)'
        : 'inset 0 0 0 1px var(--border)';
  const tagColor = accent && isCurrent ? accent.color : 'var(--text)';

  return (
    <motion.div
      animate={controls}
      whileHover={reduce || isEmpty ? undefined : { y: -3, scale: 1.04, zIndex: 5 }}
      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
      className="relative flex min-h-[78px] min-w-[68px] cursor-default flex-col justify-between rounded-lg p-2.5"
      style={{ background: bg, boxShadow: ring }}
      title={!isEmpty && blockNumber != null ? `block ${blockNumber} · tag ${hex(line.tag)}` : undefined}
    >
      {isEmpty ? (
        <div className="flex flex-1 items-center justify-center">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--grid-line)', opacity: 0.7 }} />
        </div>
      ) : (
        <>
          {/* top: valid dot + (active) pill */}
          <div className="flex items-center justify-between" style={{ minHeight: 14 }}>
            <span
              className="h-[7px] w-[7px] rounded-full"
              style={{
                background: 'var(--hit)',
                opacity: isCurrent ? 1 : 0.55,
                boxShadow: isCurrent ? '0 0 6px var(--hit)' : 'none',
              }}
            />
            {accent && isCurrent && (
              <motion.span
                key={`${pulseKey}-pill`}
                initial={reduce ? { opacity: 1 } : { opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="rounded px-1.5 py-[1px] text-[9px] font-bold uppercase leading-none tracking-[0.03em]"
                style={{ background: accent.color, color: 'var(--bg)' }}
              >
                {accent.pill}
              </motion.span>
            )}
          </div>

          {/* center: tag + resident block */}
          <div className="flex flex-col items-center">
            <span className="font-mono text-[16px] font-bold leading-none" style={{ color: tagColor }}>
              {hex(line.tag)}
            </span>
            {state === 'evicted' && evictedTag != null ? (
              <span className="mt-1 font-mono text-[9px] leading-none line-through" style={{ color: 'var(--text-faint)' }}>
                {hex(evictedTag)}
              </span>
            ) : (
              blockNumber != null && (
                <span className="mt-1 font-mono text-[9px] leading-none" style={{ color: 'var(--text-faint)' }}>
                  blk {blockNumber}
                </span>
              )
            )}
          </div>

          {/* bottom: recency meter */}
          <div style={{ color: accent?.color ?? 'var(--text-muted)' }}>
            <RecencyMeter rank={line.recencyRank} ways={associativity} active={isCurrent && !!accent} />
          </div>
        </>
      )}
    </motion.div>
  );
}
