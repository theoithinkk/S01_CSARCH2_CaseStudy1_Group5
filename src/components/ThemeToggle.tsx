// Light/dark toggle, persisted to localStorage. Dark is the default.
import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

function getInitial(): Theme {
  const saved = localStorage.getItem('m7-theme');
  return saved === 'light' ? 'light' : 'dark';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitial);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('m7-theme', theme);
  }, [theme]);

  return (
    <button
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title="Toggle theme"
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      className="btn flex h-8 w-8 items-center justify-center rounded-md border text-[14px]"
      style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
