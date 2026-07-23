// ============================================================
// TraceControls — VisuAlgo-style transport cluster + speed chips (§6).
// Keyboard shortcuts are wired in App (Space, ←/→, +/-).
// ============================================================
export const SPEEDS = [0.5, 1, 2, 4] as const;
export type Speed = (typeof SPEEDS)[number];

interface TraceControlsProps {
  playing: boolean;
  atStart: boolean;
  atEnd: boolean;
  speed: Speed;
  onPlayPause: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onToStart: () => void;
  onToEnd: () => void;
  onSpeed: (s: Speed) => void;
  compact?: boolean;
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
  primary,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="btn flex h-8 items-center justify-center rounded-md border px-2.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        background: primary ? 'var(--accent)' : 'var(--surface-2)',
        borderColor: primary ? 'var(--accent)' : 'var(--border)',
        color: primary ? 'var(--bg)' : 'var(--text)',
        minWidth: primary ? 40 : 34,
      }}
    >
      {children}
    </button>
  );
}

export default function TraceControls({
  playing,
  atStart,
  atEnd,
  speed,
  onPlayPause,
  onStepBack,
  onStepForward,
  onToStart,
  onToEnd,
  onSpeed,
  compact,
}: TraceControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <IconBtn label="Step to start" onClick={onToStart} disabled={atStart}>
          ⏮
        </IconBtn>
        <IconBtn label="Step back" onClick={onStepBack} disabled={atStart}>
          ◀
        </IconBtn>
        <IconBtn label={playing ? 'Pause' : 'Play'} onClick={onPlayPause} primary disabled={atEnd && !playing}>
          {playing ? '⏸' : '▶'}
        </IconBtn>
        <IconBtn label="Step forward" onClick={onStepForward} disabled={atEnd}>
          ▶
        </IconBtn>
        <IconBtn label="Step to end" onClick={onToEnd} disabled={atEnd}>
          ⏭
        </IconBtn>
      </div>

      {!compact && (
        <div className="flex items-center gap-1 rounded-md border p-0.5" style={{ borderColor: 'var(--border)' }}>
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeed(s)}
              className="btn rounded px-2 py-1 font-mono text-[11px]"
              style={{
                background: s === speed ? 'var(--accent)' : 'transparent',
                color: s === speed ? 'var(--bg)' : 'var(--text-muted)',
              }}
            >
              {s}×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
