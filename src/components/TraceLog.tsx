// ============================================================
// TraceLog — the access trace, styled as a TERMINAL / serial console.
// Window chrome (traffic lights), phosphor-green mono output, a prompt
// per line, the current line highlighted, and a blinking cursor.
// Click a line to seek. Auto-scrolls to the current access.
// ============================================================
import { useEffect, useRef } from 'react';
import type { SimResult } from '../engine/types';
import { hex } from '../lib/format';

interface TraceLogProps {
  lru: SimResult;
  mru: SimResult;
  stepIndex: number;
  onSelect: (index: number) => void;
}

/** Fixed-width outcome token, e.g. "MISS→ev0x3" / "HIT". */
function outcome(result: 'hit' | 'miss', evictedTag: number | null): string {
  if (result === 'hit') return 'HIT';
  return evictedTag !== null ? `MISS ev${hex(evictedTag)}` : 'MISS';
}

const pad = (s: string | number, n: number) => `${s}`.padEnd(n);

export default function TraceLog({ lru, mru, stepIndex, onSelect }: TraceLogProps) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [stepIndex]);

  const done = stepIndex + 1;
  const total = lru.steps.length;

  return (
    <div className="term hover-glow flex min-h-0 flex-col">
      {/* window title bar */}
      <div
        className="flex items-center gap-2 px-3.5 py-2.5"
        style={{ borderBottom: '1px solid #12362a', background: '#081b13' }}
      >
        <span className="h-3 w-3 rounded-full" style={{ background: '#ff5f56' }} />
        <span className="h-3 w-3 rounded-full" style={{ background: '#febc2e' }} />
        <span className="h-3 w-3 rounded-full" style={{ background: '#28c840' }} />
        <span className="ml-2 font-mono text-[11.5px]" style={{ color: 'var(--term-dim)' }}>
          m7@cache: ~/trace — serial monitor
        </span>
        <span className="ml-auto font-mono text-[11px]" style={{ color: 'var(--term-dim)' }}>
          {done}/{total} · click to seek
        </span>
      </div>

      {/* console body */}
      <div
        className="h-[260px] overflow-y-auto px-3.5 py-2 font-mono text-[12.5px] thin-scroll"
        style={{ lineHeight: 1.65, color: 'var(--term-fg)' }}
      >
        <div className="mb-1" style={{ color: 'var(--term-dim)' }}>
          <span style={{ color: 'var(--term-fg)' }}>$</span> run trace --policy lru,mru
        </div>
        <div className="mb-1 whitespace-pre" style={{ color: 'var(--term-dim)' }}>
          {`  #    blk   set  tag     lru        mru`}
        </div>

        {/* Only reveal steps up to the current position — the trace builds
            line by line as the simulation runs. */}
        {lru.steps.slice(0, Math.max(0, stepIndex + 1)).map((ls, i) => {
          const ms = mru.steps[i];
          const active = i === stepIndex;
          const lruColor = ls.result === 'miss' ? 'var(--miss)' : 'var(--term-fg)';
          const mruColor = ms.result === 'miss' ? 'var(--miss)' : 'var(--term-fg)';
          return (
            <button
              key={i}
              ref={active ? activeRef : undefined}
              onClick={() => onSelect(i)}
              className="term-row flex w-full whitespace-pre text-left"
              style={{
                background: active ? 'rgba(53,224,138,0.12)' : 'transparent',
                borderLeft: active ? '2px solid var(--term-fg)' : '2px solid transparent',
                paddingLeft: 6,
              }}
            >
              <span style={{ color: active ? 'var(--term-fg)' : 'var(--term-dim)' }}>
                {active ? '›' : ' '} {pad(ls.step, 4)}
              </span>
              <span style={{ color: '#8fcfae' }}>{pad(ls.block, 6)}</span>
              <span style={{ color: 'var(--term-dim)' }}>{pad(`s${ls.setIndex}`, 5)}</span>
              <span style={{ color: '#8fcfae' }}>{pad(hex(ls.tag), 8)}</span>
              <span style={{ color: lruColor }}>{pad(outcome(ls.result, ls.evictedTag), 11)}</span>
              <span style={{ color: mruColor }}>{outcome(ms.result, ms.evictedTag)}</span>
            </button>
          );
        })}

        {/* prompt with blinking cursor */}
        <div className="mt-1 flex items-center gap-2">
          <span style={{ color: 'var(--term-fg)' }}>$</span>
          <span className="term-cursor" />
        </div>
      </div>
    </div>
  );
}
