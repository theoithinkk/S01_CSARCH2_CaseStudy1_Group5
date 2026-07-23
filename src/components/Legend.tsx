// Always-visible key mapping color + pill + border-style to state (§7).
const items = [
  { label: 'Hit', bg: 'var(--hit-bg)', border: 'var(--hit)', style: 'solid' },
  { label: 'Miss', bg: 'var(--miss-bg)', border: 'var(--miss)', style: 'solid' },
  { label: 'Evicted', bg: 'var(--evict-bg)', border: 'var(--evict)', style: 'dashed' },
  { label: 'Valid', bg: 'var(--surface-2)', border: 'var(--border)', style: 'solid' },
  { label: 'Empty', bg: 'var(--empty-cell)', border: 'var(--grid-line)', style: 'solid' },
];

export default function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-3.5 w-3.5 rounded-[3px]"
            style={{ background: it.bg, border: `2px ${it.style} ${it.border}` }}
          />
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {it.label}
          </span>
        </div>
      ))}
    </div>
  );
}
