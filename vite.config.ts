import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' keeps asset paths relative so the same build works on Vercel
// (served at domain root) and on GitHub Pages (served under /machine7/).
export default defineConfig({
  base: './',
  plugins: [react()],
});
