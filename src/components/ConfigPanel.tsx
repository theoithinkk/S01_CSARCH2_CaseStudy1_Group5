// ============================================================
// ConfigPanel — a compact horizontal CONTROL BAR that sits under the
// header, so the cache visualization owns the center of the stage.
// Validates power-of-2 / min-size at the boundary via engine/validate.
// ============================================================
import type { ReadPolicy, TestCaseId } from '../engine/types';
import { nextPow2, prevPow2, LIMITS } from '../engine/validate';

export type ViewMode = 'step' | 'snapshot';

interface ConfigPanelProps {
  numCacheBlocks: number;
  blockSize: number;
  readPolicy: ReadPolicy;
  testCase: TestCaseId;
  customText: string;
  viewMode: ViewMode;
  numSets: number;
  sequenceLength: number;
  customErrors: string[];
  onCacheBlocks: (n: number) => void;
  onBlockSize: (n: number) => void;
  onReadPolicy: (p: ReadPolicy) => void;
  onTestCase: (t: TestCaseId) => void;
  onCustomText: (s: string) => void;
  onViewMode: (v: ViewMode) => void;
  onRegenerateRandom: () => void;
}

/** A labeled cell in the control bar. */
function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="silk text-[9px]" style={{ color: 'var(--text-faint)' }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Stepper({ value, min, onChange }: { value: number; min: number; onChange: (n: number) => void }) {
  return (
    <div
      className="flex h-9 items-center overflow-hidden rounded-md border"
      style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
    >
      <button
        aria-label="decrease"
        onClick={() => onChange(Math.max(min, prevPow2(value - 1)))}
        disabled={value <= min}
        className="btn h-full px-2.5 text-[15px] disabled:opacity-30"
        style={{ color: 'var(--text)' }}
      >
        −
      </button>
      <span className="w-9 text-center font-mono text-[13px]" style={{ color: 'var(--text)' }}>
        {value}
      </span>
      <button
        aria-label="increase"
        onClick={() => onChange(nextPow2(value + 1))}
        className="h-full px-2.5 text-[15px]"
        style={{ color: 'var(--text)' }}
      >
        +
      </button>
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex h-9 rounded-md border p-0.5" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="btn rounded px-3 text-[12px] font-medium"
          style={{
            background: value === opt.value ? 'var(--accent)' : 'transparent',
            color: value === opt.value ? 'var(--bg)' : 'var(--text-muted)',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const TEST_CASES: { value: TestCaseId; label: string }[] = [
  { value: 'sequential', label: '(a) Sequential' },
  { value: 'mid-repeat', label: '(b) Mid-repeat' },
  { value: 'random', label: '(c) Random (64)' },
  { value: 'custom', label: 'Custom' },
];

function Divider() {
  return <div className="hidden h-9 w-px self-end lg:block" style={{ background: 'var(--border)' }} />;
}

export default function ConfigPanel(props: ConfigPanelProps) {
  const { numCacheBlocks, blockSize, readPolicy, testCase, customText, viewMode, numSets, sequenceLength, customErrors } =
    props;

  return (
    <div className="chip hover-glow flex flex-col gap-3 px-4 py-3">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <Cell label="Block size (words)">
          <Stepper value={blockSize} min={LIMITS.minBlockSize} onChange={props.onBlockSize} />
        </Cell>
        <Cell label="Cache blocks">
          <Stepper value={numCacheBlocks} min={LIMITS.minCacheBlocks} onChange={props.onCacheBlocks} />
        </Cell>

        <Divider />

        <Cell label="Read policy">
          <Segmented<ReadPolicy>
            value={readPolicy}
            onChange={props.onReadPolicy}
            options={[
              { value: 'load-through', label: 'Load-thru' },
              { value: 'non-load-through', label: 'Non-load' },
            ]}
          />
        </Cell>

        <Cell label="Test case">
          <select
            value={testCase}
            onChange={(e) => props.onTestCase(e.target.value as TestCaseId)}
            className="h-9 rounded-md border px-2.5 text-[12.5px]"
            style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            {TEST_CASES.map((tc) => (
              <option key={tc.value} value={tc.value}>
                {tc.label}
              </option>
            ))}
          </select>
        </Cell>

        {testCase === 'random' && (
          <Cell label="&nbsp;">
            <button
              onClick={props.onRegenerateRandom}
              className="btn h-9 rounded-md border px-3 text-[12px] font-medium"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              ↻ Regenerate
            </button>
          </Cell>
        )}

        <Divider />

        <Cell label="View mode">
          <Segmented<ViewMode>
            value={viewMode}
            onChange={props.onViewMode}
            options={[
              { value: 'step', label: 'Step' },
              { value: 'snapshot', label: 'Snapshot' },
            ]}
          />
        </Cell>

        {/* live spec readout, pushed to the right */}
        <div className="ml-auto flex items-end gap-3 self-end font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span>
            <span style={{ color: 'var(--text)' }}>{numSets}</span> sets
          </span>
          <span>
            <span style={{ color: 'var(--text)' }}>{LIMITS.associativity}</span> ways
          </span>
          <span>
            <span style={{ color: 'var(--text)' }}>{sequenceLength}</span> accesses
          </span>
        </div>
      </div>

      {testCase === 'custom' && (
        <div className="flex flex-col gap-1">
          <span className="silk text-[9px]" style={{ color: 'var(--text-faint)' }}>
            Custom sequence — comma/space separated block numbers (0–1023)
          </span>
          <textarea
            value={customText}
            onChange={(e) => props.onCustomText(e.target.value)}
            rows={2}
            placeholder="e.g. 0, 1, 2, 3, 0, 4, 8, 0"
            className="resize-y rounded-md border px-2.5 py-2 font-mono text-[12.5px]"
            style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
          {customErrors.length > 0 && (
            <div className="flex flex-wrap gap-x-4">
              {customErrors.slice(0, 4).map((err, i) => (
                <span key={i} className="text-[11px]" style={{ color: 'var(--miss)' }}>
                  {err}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
