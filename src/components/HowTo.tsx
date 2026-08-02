// Quick orientation panel shown once the board powers on. Explains the flow
// before the user is dropped into a screen full of controls. Dismissed with
// the button or Escape, and reopenable from the "?" in the header.
import { useEffect } from 'react';

interface HowToProps {
  onClose: () => void;
}

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: '01',
    title: 'Set up the cache',
    body:
      'Block size and cache blocks are power-of-two steppers. 16 blocks over 4 ways gives 4 sets. Read policy only changes the miss penalty, never the hit/miss outcome.',
  },
  {
    n: '02',
    title: 'Pick an access sequence',
    body:
      'Three built-in test cases (sequential, mid-repeat, random 64) or type your own comma-separated block numbers from 0 to 1023.',
  },
  {
    n: '03',
    title: 'Step through it',
    body:
      'Play or step forward one access at a time. Both caches run the same sequence side by side, so you can see the exact access where LRU and MRU choose different victims.',
  },
  {
    n: '04',
    title: 'Read the results',
    body:
      'Statistics and the access trace fill in as the run progresses. Click any line in the trace log to jump the player back to that access.',
  },
];

const KEYS: [string, string][] = [
  ['Space', 'play / pause'],
  ['← →', 'step back / forward'],
  ['+ −', 'playback speed'],
];

export default function HowTo({ onClose }: HowToProps) {
  // Escape closes, and the panel takes focus away from the page behind it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6"
      style={{ background: 'rgba(3, 10, 8, 0.82)' }}
      role="dialog"
      aria-modal="true"
      aria-label="How to use this simulator"
    >
      <div className="chip chip-pin1 my-auto w-full max-w-[620px] overflow-hidden">
        <div className="edge-pads h-[3px] w-full" />

        <div className="px-5 pb-5 pt-4 sm:px-7 sm:pb-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="pixel text-[13px] font-bold sm:text-[15px]" style={{ color: 'var(--text)' }}>
              HOW IT WORKS
            </h2>
            <span className="silk text-[10px]">4-way BSA &middot; LRU vs MRU</span>
          </div>

          <p className="mt-2.5 text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Two caches with identical geometry run the same access sequence. The only
            difference is which line each one throws out when a set is full.
          </p>

          <ol className="mt-4 flex flex-col gap-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3">
                <span
                  className="mt-[1px] shrink-0 font-mono text-[12px] font-bold"
                  style={{ color: 'var(--copper-bright)' }}
                >
                  {s.n}
                </span>
                <span>
                  <span className="block text-[13.5px] font-semibold" style={{ color: 'var(--text)' }}>
                    {s.title}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {s.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          {/* the one thing that trips people up, worth calling out on its own */}
          <div
            className="mt-4 rounded-md border p-3"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            <span className="silk text-[10px]">Reading a cell</span>
            <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Each box is one way in a set. It shows the stored tag, which memory block
              that tag corresponds to, and a recency bar &mdash; full means most recently
              used, nearly empty means it is next out under LRU.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="silk text-[10px]">Shortcuts</span>
            {KEYS.map(([k, v]) => (
              <span key={k} className="flex items-center gap-1.5">
                <kbd
                  className="rounded border px-1.5 py-0.5 font-mono text-[11px]"
                  style={{ borderColor: 'var(--border-strong)', background: 'var(--surface-2)', color: 'var(--text)' }}
                >
                  {k}
                </kbd>
                <span className="text-[11.5px]" style={{ color: 'var(--text-faint)' }}>
                  {v}
                </span>
              </span>
            ))}
          </div>

          <button
            onClick={onClose}
            autoFocus
            className="btn mt-5 flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13.5px] font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
          >
            <span className="led" style={{ color: 'var(--bg)', background: 'var(--bg)' }} />
            Open the simulator
          </button>
        </div>
      </div>
    </div>
  );
}
