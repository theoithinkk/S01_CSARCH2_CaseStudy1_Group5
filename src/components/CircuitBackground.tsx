// ============================================================
// CircuitBackground — a DYNAMIC but calm backdrop.
// Inspired by Kokonut UI "Beams Background" (drifting blurred light
// beams, additively blended on near-black) + manus.im soft aurora,
// over a faint static PCB grid so it still reads as a circuit board.
// Slow + low-opacity so it never competes with the visualization.
// Honors prefers-reduced-motion (renders a still frame).
// ============================================================
import { useEffect, useRef } from 'react';

interface Beam {
  x: number; // horizontal center (in scaled px)
  y: number;
  w: number; // beam width
  len: number; // beam length
  angle: number; // radians, near-vertical
  speed: number; // drift px/frame
  hue: [number, number, number];
  phase: number; // opacity oscillation
  amp: number; // base opacity
}

// Palette weighted toward green/teal, with copper + policy accents.
const HUES: [number, number, number][] = [
  [53, 224, 138], // green
  [53, 224, 138],
  [60, 200, 180], // teal
  [201, 138, 58], // copper
  [201, 138, 58],
  [109, 155, 255], // LRU blue
  [207, 139, 255], // MRU violet
];

export default function CircuitBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Render at reduced resolution — everything is blurred, so it's free perf.
    const SCALE = 0.6;

    let W = 0;
    let H = 0;
    let beams: Beam[] = [];
    let raf = 0;
    let t = 0;

    let light = true; // theme
    let bg = '#060f0d';
    let grid = 'rgba(201,138,58,0.05)';
    const readTheme = () => {
      const s = getComputedStyle(document.documentElement);
      bg = s.getPropertyValue('--bg').trim() || bg;
      light = document.documentElement.getAttribute('data-theme') === 'light';
      grid = light ? 'rgba(120,150,130,0.10)' : 'rgba(201,138,58,0.05)';
    };

    const makeBeam = (): Beam => {
      const len = H * (0.5 + Math.random() * 0.7);
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        w: 60 + Math.random() * 140,
        len,
        angle: (Math.random() - 0.5) * 0.5, // gentle tilt
        speed: 0.05 + Math.random() * 0.18,
        hue: HUES[(Math.random() * HUES.length) | 0],
        phase: Math.random() * Math.PI * 2,
        amp: 0.05 + Math.random() * 0.09,
      };
    };

    const resize = () => {
      readTheme();
      W = Math.floor(window.innerWidth * SCALE);
      H = Math.floor(window.innerHeight * SCALE);
      canvas.width = W;
      canvas.height = H;
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      const count = Math.max(9, Math.min(16, Math.floor(W / 90)));
      beams = Array.from({ length: count }, makeBeam);
    };

    const drawGrid = () => {
      const G = 30 * SCALE * 1.6;
      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= W; x += G) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, H);
      }
      for (let y = 0; y <= H; y += G) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(W, y + 0.5);
      }
      ctx.stroke();
    };

    const drawBeam = (b: Beam, opacity: number) => {
      const [r, g, bl] = b.hue;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      const grad = ctx.createLinearGradient(0, -b.len / 2, 0, b.len / 2);
      grad.addColorStop(0, `rgba(${r},${g},${bl},0)`);
      grad.addColorStop(0.5, `rgba(${r},${g},${bl},${opacity})`);
      grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(-b.w / 2, -b.len / 2, b.w, b.len);
      ctx.restore();
    };

    const render = (animate: boolean) => {
      // opaque reset (no trails)
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = 'none';
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // faint static grid
      drawGrid();

      // blurred, additive beams
      ctx.filter = `blur(${Math.round(26 * SCALE * 2)}px)`;
      ctx.globalCompositeOperation = light ? 'multiply' : 'lighter';
      for (const b of beams) {
        const osc = 0.6 + 0.4 * Math.sin(t * 0.01 + b.phase);
        drawBeam(b, b.amp * osc);
        if (animate) {
          b.y -= b.speed;
          b.x += Math.sin(t * 0.003 + b.phase) * 0.12;
          if (b.y + b.len / 2 < 0) {
            Object.assign(b, makeBeam(), { y: H + b.len / 2 });
          }
        }
      }

      // vignette to settle the edges
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
      const vg = ctx.createRadialGradient(W / 2, H * 0.4, Math.min(W, H) * 0.15, W / 2, H / 2, Math.max(W, H) * 0.7);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, light ? 'rgba(210,220,214,0.35)' : 'rgba(3,8,6,0.55)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    };

    const loop = () => {
      t += 1;
      render(true);
      raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener('resize', resize);
    const obs = new MutationObserver(() => {
      readTheme();
      if (reduce) render(false);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    if (reduce) render(false);
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      obs.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
