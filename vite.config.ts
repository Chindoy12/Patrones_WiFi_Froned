/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Without VITE_API_URL the page would call http://localhost:8080. Locally that is right; in a Vercel build it would
 * ship a page that cannot reach the backend, so the build stops with a clear message instead.
 */
export function requireApiUrl(env: Record<string, string | undefined>, mode: string): void {
  if (mode === 'production' && env.VERCEL && !env.VITE_API_URL) {
    throw new Error('Falta VITE_API_URL en Vercel (Settings → Environment Variables): la URL pública del backend.');
  }
}

export default defineConfig(({ mode }) => {
  requireApiUrl({ ...loadEnv(mode, process.cwd(), ''), VERCEL: process.env.VERCEL }, mode);
  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.test.{ts,tsx}'],
    },
  };
});
