// ============================================================
// StatsPanel — the run's numbers, styled as a NOTEPAD memo sheet:
// ruled paper, red margin line, handwritten heading. Metric | LRU | MRU.
// ============================================================
import type { Stats } from '../engine/types';
import { cyc, pct } from '../lib/format';

interface StatsPanelProps {
  lru: Stats;
  mru: Stats;
}

interface Row {
  label: string;
  lru: string;
  mru: string;
  lruNum: number;
  mruNum: number;
  higherBetter: boolean;
}

function buildRows(lru: Stats, mru: Stats): Row[] {
  return [
    { label: 'Total accesses', lru: `${lru.totalAccesses}`, mru: `${mru.totalAccesses}`, lruNum: lru.totalAccesses, mruNum: mru.totalAccesses, higherBetter: true },
    { label: 'Cache hits', lru: `${lru.hits}`, mru: `${mru.hits}`, lruNum: lru.hits, mruNum: mru.hits, higherBetter: true },
    { label: 'Cache misses', lru: `${lru.misses}`, mru: `${mru.misses}`, lruNum: lru.misses, mruNum: mru.misses, higherBetter: false },
    { label: 'Hit rate', lru: pct(lru.hitRate), mru: pct(mru.hitRate), lruNum: lru.hitRate, mruNum: mru.hitRate, higherBetter: true },
    { label: 'Miss rate', lru: pct(lru.missRate), mru: pct(mru.missRate), lruNum: lru.missRate, mruNum: mru.missRate, higherBetter: false },
    { label: 'AMAT (cycles)', lru: cyc(lru.amat), mru: cyc(mru.amat), lruNum: lru.amat, mruNum: mru.amat, higherBetter: false },
    { label: 'Total access time', lru: `${cyc(lru.totalAccessTime)}`, mru: `${cyc(mru.totalAccessTime)}`, lruNum: lru.totalAccessTime, mruNum: mru.totalAccessTime, higherBetter: false },
  ];
}

const ROW_H = 34; // must match the ruled-line spacing

/** Circle the winning value like a pen mark. */
function winner(row: Row, side: 'lru' | 'mru'): boolean {
  if (row.lruNum === row.mruNum) return false;
  const lruBetter = row.higherBetter ? row.lruNum > row.mruNum : row.lruNum < row.mruNum;
  return (side === 'lru') === lruBetter;
}

export default function StatsPanel({ lru, mru }: StatsPanelProps) {
  const rows = buildRows(lru, mru);

  return (
    <div className="paper hover-glow flex flex-col">
      {/* Notepad header: binding holes + handwritten title */}
      <div className="relative flex items-center gap-2 px-5 pb-2 pt-4" style={{ borderBottom: '2px solid var(--margin)' }}>
        <div className="absolute left-0 right-0 top-1.5 flex justify-center gap-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: '#d8d0ba' }} />
          ))}
        </div>
        <h2 className="paper-hand text-[24px] leading-none" style={{ color: 'var(--ink)' }}>
          Stats — LRU vs MRU
        </h2>
      </div>

      {/* Ruled body with red left margin */}
      <div
        className="relative px-5 pt-2"
        style={{
          backgroundImage: `repeating-linear-gradient(var(--paper-bg) 0 ${ROW_H - 1}px, var(--rule) ${ROW_H - 1}px ${ROW_H}px)`,
          backgroundPosition: '0 8px',
        }}
      >
        {/* red margin line */}
        <div className="pointer-events-none absolute inset-y-0 left-[42px] w-px" style={{ background: 'var(--margin)' }} />

        {/* column labels */}
        <div
          className="paper-hand flex items-center pl-8 text-[15px]"
          style={{ height: ROW_H, color: 'var(--ink-faint)' }}
        >
          <span className="flex-1" />
          <span className="w-24 text-right" style={{ color: '#3b5bdb' }}>
            LRU
          </span>
          <span className="w-24 text-right" style={{ color: '#9333ea' }}>
            MRU
          </span>
        </div>

        {rows.map((row) => (
          <div key={row.label} className="paper-row flex items-center pl-8" style={{ height: ROW_H }}>
            <span className="paper-hand flex-1 text-[17px]" style={{ color: 'var(--ink)' }}>
              {row.label}
            </span>
            <span className="w-24 text-right font-mono text-[14px] tabular-nums" style={{ color: 'var(--ink)' }}>
              <span
                className="rounded px-1"
                style={winner(row, 'lru') ? { boxShadow: '0 0 0 1.5px #3b5bdb', color: '#3b5bdb' } : undefined}
              >
                {row.lru}
              </span>
            </span>
            <span className="w-24 text-right font-mono text-[14px] tabular-nums" style={{ color: 'var(--ink)' }}>
              <span
                className="rounded px-1"
                style={winner(row, 'mru') ? { boxShadow: '0 0 0 1.5px #9333ea', color: '#9333ea' } : undefined}
              >
                {row.mru}
              </span>
            </span>
          </div>
        ))}

        {/* footnote in "pencil" */}
        <p className="paper-hand pb-4 pt-3 pl-8 text-[14px] leading-snug" style={{ color: 'var(--ink-faint)' }}>
          Th=1, Tm=10, Tb=1/word · miss penalty = {lru.missPenalty} cyc ({lru.readPolicy}, block {lru.blockSize}w) ·
          AMAT = Th + MissRate·(P_miss − Th)
        </p>
      </div>
    </div>
  );
}
