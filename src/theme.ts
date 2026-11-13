// Dark by default (the midnight design); the choice of each person is remembered in this browser only. Every theme
// switch on screen reads the same state, so they never disagree.
import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';

export type Theme = 'light' | 'dark';

// New key for the dark redesign: the old one stored "light" for everybody (it used to be saved on every visit), so
// reading it would keep every returning person in the old default instead of the new one.
const KEY = 'wifisense.theme.v2';
const listeners = new Set<() => void>();

export function storedTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';  // private mode or blocked storage: keep the default
  }
}

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/** Shows a theme; `remember` keeps it for the next visits (only when the person chooses it with the switch). */
export function applyTheme(theme: Theme, remember = true) {
  document.documentElement.dataset.theme = theme;
  if (remember) {
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // not remembered, but the page still switches
    }
  }
  listeners.forEach((listener) => listener());
}

/** How long the wave of the new theme takes to cover the screen (see motion.css). */
export const WAVE_MS = 1600;

/**
 * Changes the theme with the switch, softly: the new theme spreads from the switch like a wave with a blurred edge,
 * instead of the whole page turning white (or black) at once. Browsers without view transitions fade the colors;
 * with reduced motion the change is immediate.
 */
export function switchTheme(theme: Theme, from?: { x: number; y: number }) {
  const root = document.documentElement;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  // not every browser has view transitions yet (the type says it always exists)
  const doc = document as Partial<Pick<Document, 'startViewTransition'>>;
  if (reduced) {
    applyTheme(theme);
    return;
  }
  if (doc.startViewTransition) {
    root.style.setProperty('--wave-x', `${from?.x ?? window.innerWidth / 2}px`);
    root.style.setProperty('--wave-y', `${from?.y ?? 0}px`);
    root.dataset.themeWave = '';
    const transition = doc.startViewTransition.call(document, () => flushSync(() => applyTheme(theme)));
    transition.finished.finally(() => delete root.dataset.themeWave);
    return;
  }
  root.classList.add('theme-fade');
  applyTheme(theme);
  window.setTimeout(() => root.classList.remove('theme-fade'), WAVE_MS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme, () => 'dark');
}
