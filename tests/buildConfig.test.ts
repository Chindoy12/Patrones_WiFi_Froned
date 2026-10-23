import { describe, expect, it } from 'vitest';
import { requireApiUrl } from '../vite.config';

describe('URL del backend en producción', () => {
  it('stops a Vercel build that does not know where the backend is', () => {
    expect(() => requireApiUrl({ VERCEL: '1' }, 'production')).toThrow(/Falta VITE_API_URL/);
  });

  it('lets the Vercel build go on with the URL, and local or test builds without it', () => {
    expect(() => requireApiUrl({ VERCEL: '1', VITE_API_URL: 'https://api.example.com' }, 'production')).not.toThrow();
    expect(() => requireApiUrl({}, 'production')).not.toThrow();  // npm run build on a computer or in GitHub Actions
    expect(() => requireApiUrl({ VERCEL: '1' }, 'development')).not.toThrow();
  });
});
