// ============================================================
// Machine 7 — application shell & orchestration.
// The engine is pure; this file drives inputs, playback, and the
// "circuit board" layout (config / caches / stats / trace zones).
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CacheConfig, ReadPolicy, TestCaseId } from './engine/types';
import { simulateBoth } from './engine/cache';
import { computeStats } from './engine/stats';
import { buildSequence } from './engine/sequences';
import { validateBlockSize, validateCacheBlocks, LIMITS } from './engine/validate';
import ConfigPanel, { type ViewMode } from './components/ConfigPanel';
import DualCacheView from './components/DualCacheView';
import StatsPanel from './components/StatsPanel';
import TraceLog from './components/TraceLog';
import TraceControls, { type Speed } from './components/TraceControls';
import ThemeToggle from './components/ThemeToggle';
import CurrentAccess from './components/CurrentAccess';
import CircuitBackground from './components/CircuitBackground';
import IntroCover from './components/IntroCover';

const BASE_STEP_MS = 700; // 1× step duration

export default function App() {
  // Landing "cover" gate — the board is revealed by the intro.
  const [entered, setEntered] = useState(false);

  // --- Config inputs ---
  const [numCacheBlocks, setNumCacheBlocks] = useState(16);
  const [blockSize, setBlockSize] = useState(16);
  const [readPolicy, setReadPolicy] = useState<ReadPolicy>('load-through');
  const [testCase, setTestCase] = useState<TestCaseId>('sequential');
  const [customText, setCustomText] = useState('0, 1, 2, 3, 0, 4, 8, 12, 0, 16, 20, 0');
  const [seed, setSeed] = useState(1);

  // --- Player state ---
  const [viewMode, setViewMode] = useState<ViewMode>('step');
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  // Stats + trace stay hidden until the simulation is actually run.
  const [hasRun, setHasRun] = useState(false);

  // --- Validation (config boundary) ---
  const blocksError = validateCacheBlocks(numCacheBlocks);
  const blockSizeError = validateBlockSize(blockSize);
  const configValid = !blocksError && !blockSizeError;

  const config: CacheConfig = useMemo(
    () => ({ numCacheBlocks, blockSize, associativity: LIMITS.associativity, readPolicy }),
    [numCacheBlocks, blockSize, readPolicy],
  );

  // n (sequence parameter) = total cache blocks.
  const { blocks: sequence, errors: customErrors } = useMemo(
    () => buildSequence(testCase, numCacheBlocks, { custom: customText, seed }),
    [testCase, numCacheBlocks, customText, seed],
  );

  const sim = useMemo(() => {
    if (!configValid) return null;
    return simulateBoth(config, sequence);
  }, [config, sequence, configValid]);

  const total = sim?.lru.steps.length ?? 0;

  // Reset playback when the sequence/config identity changes.
  const simKey = `${testCase}-${numCacheBlocks}-${blockSize}-${readPolicy}-${customText}-${seed}`;
  useEffect(() => {
    setPlaying(false);
    setStepIndex(viewMode === 'snapshot' ? Math.max(0, total - 1) : 0);
    setHasRun(viewMode === 'snapshot'); // changing config re-hides results (unless viewing final)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simKey]);

  // Snapshot mode jumps to the end and disables playback (= a full run).
  useEffect(() => {
    if (viewMode === 'snapshot') {
      setPlaying(false);
      setStepIndex(Math.max(0, total - 1));
      setHasRun(true);
    } else {
      setStepIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, total]);

  const atStart = stepIndex <= 0;
  const atEnd = stepIndex >= total - 1;

  // --- Transport actions ---
  const stepForward = useCallback(() => {
    setHasRun(true);
    setStepIndex((i) => Math.min(total - 1, i + 1));
  }, [total]);
  const stepBack = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);
  const toStart = useCallback(() => {
    setPlaying(false);
    setStepIndex(0);
  }, []);
  const toEnd = useCallback(() => {
    setPlaying(false);
    setHasRun(true);
    setStepIndex(Math.max(0, total - 1));
  }, [total]);
  const playPause = useCallback(() => {
    setHasRun(true);
    if (atEnd) {
      setStepIndex(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  }, [atEnd]);
  const changeSpeed = useCallback((delta: number) => {
    const order: Speed[] = [0.5, 1, 2, 4];
    setSpeed((s) => {
      const idx = order.indexOf(s);
      const next = Math.min(order.length - 1, Math.max(0, idx + delta));
      return order[next];
    });
  }, []);

  // --- Playback loop ---
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) return;
    if (atEnd) {
      setPlaying(false);
      return;
    }
    timerRef.current = window.setTimeout(() => {
      setStepIndex((i) => Math.min(total - 1, i + 1));
    }, BASE_STEP_MS / speed);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [playing, stepIndex, speed, atEnd, total]);

  // --- Keyboard shortcuts (VisuAlgo mapping) ---
  useEffect(() => {
    if (viewMode !== 'step') return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === ' ') {
        e.preventDefault();
        playPause();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepForward();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepBack();
      } else if (e.key === '+' || e.key === '=') {
        changeSpeed(1);
      } else if (e.key === '-' || e.key === '_') {
        changeSpeed(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewMode, playPause, stepForward, stepBack, changeSpeed]);

  const numSets = numCacheBlocks / LIMITS.associativity;
  const shown = Math.min(stepIndex + 1, total);
  const progress = total > 0 ? (shown / total) * 100 : 0;

  const lruStep = sim && stepIndex >= 0 && stepIndex < total ? sim.lru.steps[stepIndex] : null;
  const mruStep = sim && stepIndex >= 0 && stepIndex < total ? sim.mru.steps[stepIndex] : null;

  // Running stats through the current step, so the stats table builds along
  // with the trace instead of jumping straight to the final totals.
  const lruStats = sim ? (lruStep ? computeStats('LRU', config, lruStep.hits, lruStep.misses) : sim.lru.stats) : null;
  const mruStats = sim ? (mruStep ? computeStats('MRU', config, mruStep.hits, mruStep.misses) : sim.mru.stats) : null;

  return (
    <div className="circuit-bg min-h-screen">
      <CircuitBackground />
      {!entered && <IntroCover onEnter={() => setEntered(true)} />}
      {/* ===== Header: board edge connector + power rail ===== */}
      <header
        className="sticky top-0 z-30 border-b-2"
        style={{ background: 'var(--bg)', borderColor: 'var(--copper)' }}
      >
        <div className="edge-pads h-[3px] w-full" />
        <div className="flex h-16 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <span
              className="led"
              style={{ color: 'var(--hit)', background: 'var(--hit)', width: 11, height: 11 }}
              aria-hidden
            />
            <div className="flex items-baseline gap-3">
              <h1 className="text-[24px] font-black tracking-[-0.01em]" style={{ color: 'var(--text)' }}>
                MACHINE&nbsp;7
              </h1>
              <span
                className="hidden font-mono text-[11px] font-semibold uppercase tracking-[0.14em] sm:inline"
                style={{ color: 'var(--copper-bright)' }}
              >
                4-Way BSA · LRU vs MRU
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {viewMode === 'step' ? (
              <TraceControls
                playing={playing}
                atStart={atStart}
                atEnd={atEnd}
                speed={speed}
                onPlayPause={playPause}
                onStepBack={stepBack}
                onStepForward={stepForward}
                onToStart={toStart}
                onToEnd={toEnd}
                onSpeed={setSpeed}
              />
            ) : (
              <button
                onClick={toEnd}
                className="btn flex h-9 items-center gap-2 rounded-md px-4 text-[13px] font-semibold"
                style={{ background: 'var(--accent)', color: 'var(--bg)' }}
              >
                <span className="led" style={{ color: 'var(--bg)', background: 'var(--bg)' }} />
                Run to end
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
        {/* progress rail */}
        <div className="h-[3px] w-full" style={{ background: 'var(--surface-2)' }}>
          <div
            className="h-full transition-[width] duration-200"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--accent), var(--accent-mru))',
            }}
          />
        </div>
      </header>

      {/* ===== Stage ===== */}
      <main className="relative z-10 mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-4 py-5">
        {/* Control bar */}
        <ConfigPanel
          numCacheBlocks={numCacheBlocks}
          blockSize={blockSize}
          readPolicy={readPolicy}
          testCase={testCase}
          customText={customText}
          viewMode={viewMode}
          numSets={numSets}
          sequenceLength={sequence.length}
          customErrors={customErrors}
          onCacheBlocks={setNumCacheBlocks}
          onBlockSize={setBlockSize}
          onReadPolicy={setReadPolicy}
          onTestCase={setTestCase}
          onCustomText={setCustomText}
          onViewMode={setViewMode}
          onRegenerateRandom={() => setSeed((s) => s + 1)}
        />
        {!configValid && (
          <div
            className="rounded-md border p-3 text-[12px]"
            style={{ background: 'var(--miss-bg)', borderColor: 'var(--miss)', color: 'var(--miss)' }}
          >
            {blocksError && <div>Cache blocks: {blocksError}</div>}
            {blockSizeError && <div>Block size: {blockSizeError}</div>}
          </div>
        )}

        {sim ? (
          <>
            {/* Centered hero: the cache visualization */}
            <section className="flex flex-col items-center gap-4">
              <div className="w-full max-w-[820px]">
                <CurrentAccess lruStep={lruStep} mruStep={mruStep} shown={shown} total={total} viewMode={viewMode} />
              </div>
              <DualCacheView config={config} lru={sim.lru} mru={sim.mru} stepIndex={stepIndex} />
            </section>

            {/* Secondary: stats + trace log — hidden until the sim is run */}
            {hasRun ? (
              <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <StatsPanel lru={lruStats ?? sim.lru.stats} mru={mruStats ?? sim.mru.stats} />
                <TraceLog lru={sim.lru} mru={sim.mru} stepIndex={stepIndex} onSelect={setStepIndex} />
              </section>
            ) : (
              <button
                onClick={toEnd}
                className="chip hover-glow flex flex-col items-center justify-center gap-2 px-6 py-8 text-center"
                style={{ color: 'var(--text-muted)' }}
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full text-[16px]"
                  style={{ background: 'var(--accent)', color: 'var(--bg)' }}
                >
                  ▶
                </span>
                <span className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                  Run the simulation to reveal statistics &amp; trace
                </span>
                <span className="silk text-[10px]" style={{ color: 'var(--text-faint)' }}>
                  press play / step, or click here to run to the end
                </span>
              </button>
            )}
          </>
        ) : (
          <div
            className="chip flex items-center justify-center p-10 text-[13px]"
            style={{ color: 'var(--text-muted)' }}
          >
            Fix the configuration to power on the simulation.
          </div>
        )}
      </main>
    </div>
  );
}
