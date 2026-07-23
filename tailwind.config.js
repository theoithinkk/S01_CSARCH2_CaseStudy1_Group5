/** @type {import('tailwindcss').Config} */
// Colors are driven by CSS variables (see index.css) so light/dark is a single
// variable swap on <html data-theme>. Tailwind classes reference the tokens.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-elevated': 'var(--bg-elevated)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        'text-faint': 'var(--text-faint)',
        accent: 'var(--accent)',
        'accent-mru': 'var(--accent-mru)',
        hit: 'var(--hit)',
        'hit-bg': 'var(--hit-bg)',
        miss: 'var(--miss)',
        'miss-bg': 'var(--miss-bg)',
        evict: 'var(--evict)',
        'evict-bg': 'var(--evict-bg)',
        'empty-cell': 'var(--empty-cell)',
        'grid-line': 'var(--grid-line)',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Cascadia Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
