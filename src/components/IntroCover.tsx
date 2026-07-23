// ============================================================
// IntroCover — the landing screen styled as a retail PRODUCT BOX.
// A boxed "product" (branding, chip artwork, feature list, barcode)
// sits on a calm backdrop. Clicking START opens the box lid and lifts
// it away to reveal the simulator.
// ============================================================
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface IntroCoverProps {
  onEnter: () => void;
}

const FEATURES = [
  '4-way set-associative mapping',
  'LRU vs MRU, side by side',
  'Load-through / non-load-through',
  'Step-by-step animated trace',
];

/** Stylized IC / cache chip artwork. */
function ChipArt() {
  const pins = Array.from({ length: 7 });
  return (
    <svg viewBox="0 0 160 120" className="h-[112px] w-[150px]" aria-hidden>
      {/* pins */}
      {pins.map((_, i) => (
        <g key={i} fill="var(--pad)">
          <rect x={26 + i * 16} y={10} width={7} height={9} rx={1.5} />
          <rect x={26 + i * 16} y={101} width={7} height={9} rx={1.5} />
        </g>
      ))}
      {/* body */}
      <rect x={22} y={20} width={116} height={80} rx={8} fill="var(--surface)" stroke="var(--border-strong)" />
      {/* pin-1 notch */}
      <circle cx={34} cy={32} r={3.4} fill="var(--copper-bright)" />
      {/* die grid (cache cells) */}
      {Array.from({ length: 3 }).map((_, r) =>
        Array.from({ length: 4 }).map((__, c) => (
          <rect
            key={`${r}-${c}`}
            x={44 + c * 20}
            y={40 + r * 16}
            width={15}
            height={11}
            rx={2}
            fill={(r + c) % 3 === 0 ? 'var(--accent)' : (r + c) % 3 === 1 ? 'var(--accent-mru)' : 'var(--surface-2)'}
            opacity={(r + c) % 3 === 2 ? 0.6 : 0.9}
          />
        )),
      )}
    </svg>
  );
}

/** Faux barcode from deterministic bar widths. */
function Barcode() {
  const bars = '4213121341231421314212341';
  return (
    <div className="flex items-end gap-[2px]" aria-hidden>
      {bars.split('').map((w, i) => (
        <span
          key={i}
          style={{
            width: `${Number(w)}px`,
            height: '26px',
            background: i % 2 === 0 ? 'var(--text)' : 'transparent',
          }}
        />
      ))}
    </div>
  );
}

export default function IntroCover({ onEnter }: IntroCoverProps) {
  const reduce = useReducedMotion();
  const [opening, setOpening] = useState(false);

  const start = () => {
    if (opening) return;
    setOpening(true);
    window.setTimeout(onEnter, reduce ? 200 : 1150);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-5"
      style={{ background: 'radial-gradient(1000px 700px at 50% 30%, var(--bg-elevated), var(--bg) 78%)' }}
      animate={opening ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: reduce ? 0.2 : 0.5, delay: opening && !reduce ? 0.65 : 0 }}
    >
      <div style={{ perspective: 1400 }}>
        <motion.div
          className="relative w-[clamp(300px,90vw,400px)] origin-bottom"
          initial={reduce ? undefined : { opacity: 0, y: 26, rotateX: 8 }}
          animate={
            opening
              ? { y: reduce ? 0 : -40, rotateX: reduce ? 0 : -6, scale: reduce ? 1 : 1.04 }
              : { opacity: 1, y: 0, rotateX: 6 }
          }
          transition={{ duration: reduce ? 0.2 : 0.9, ease: [0.7, 0, 0.2, 1] }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* ---- Lid flap (opens upward) ---- */}
          <motion.div
            className="chip absolute inset-x-0 -top-[2px] h-[46px] origin-bottom overflow-hidden rounded-b-none"
            style={{ transformStyle: 'preserve-3d', zIndex: 2 }}
            animate={opening ? { rotateX: reduce ? 0 : -118 } : { rotateX: 0 }}
            transition={{ duration: reduce ? 0.2 : 0.7, ease: [0.7, 0, 0.2, 1] }}
          >
            <div className="edge-pads absolute inset-x-0 top-0 h-[4px]" />
            <div className="flex h-full items-center justify-between px-4">
              <span className="silk text-[10px]" style={{ color: 'var(--copper-bright)' }}>
                CSARCH2 · SIM SERIES
              </span>
              <span className="silk text-[10px]" style={{ color: 'var(--text-faint)' }}>
                v1.0
              </span>
            </div>
          </motion.div>

          {/* ---- Box front face ---- */}
          <div className="chip chip-pin1 relative overflow-hidden rounded-t-none pt-[46px]">
            {/* glossy sheen */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.05), transparent 40%)' }}
            />

            <div className="flex flex-col items-center px-6 pb-6 pt-4 text-center">
              <span className="silk text-[10px]" style={{ color: 'var(--text-faint)' }}>
                CACHE MEMORY MACHINE
              </span>
              <h1 className="mt-1 text-[46px] font-black leading-none tracking-[-0.02em]" style={{ color: 'var(--text)' }}>
                MACHINE&nbsp;7
              </h1>
              <p className="mt-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                4-Way Set-Associative Cache Simulator
              </p>

              <div className="my-4">
                <ChipArt />
              </div>

              {/* Feature checklist */}
              <ul className="mb-5 w-full space-y-1.5 text-left">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                    <span className="led" style={{ color: 'var(--hit)', background: 'var(--hit)', width: 7, height: 7 }} />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="copper-rule mb-4" />

              {/* Start + barcode */}
              <div className="flex w-full items-center justify-between gap-4">
                <Barcode />
                <motion.button
                  onClick={start}
                  whileHover={reduce ? undefined : { scale: 1.04 }}
                  whileTap={reduce ? undefined : { scale: 0.96 }}
                  className="group relative flex items-center gap-2 rounded-lg px-6 py-3 text-[14px] font-bold"
                  style={{ background: 'var(--accent)', color: 'var(--bg)' }}
                >
                  <motion.span
                    className="led"
                    style={{ color: 'var(--bg)', background: 'var(--bg)' }}
                    animate={reduce ? undefined : { opacity: [1, 0.35, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  />
                  START
                </motion.button>
              </div>
            </div>
          </div>

          {/* soft shadow under the box */}
          <div
            className="absolute -bottom-6 left-1/2 h-8 w-[80%] -translate-x-1/2 rounded-[50%] blur-xl"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          />
        </motion.div>

        <p className="silk mt-8 text-center text-[10px]" style={{ color: 'var(--text-faint)' }}>
          click START to open the box
        </p>
      </div>
    </motion.div>
  );
}
