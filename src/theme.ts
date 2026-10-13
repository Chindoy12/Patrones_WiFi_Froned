// Light by default; the choice of each person is remembered in this browser only. Every theme switch on screen
// reads the same state, so they never disagree.
import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'wifisense.theme';
const listeners = new Set<() => void>();

export function storedTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';  // private mode or blocked storage: keep the default
  }
}

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // not remembered, but the page still switches
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme, () => 'light');
}
