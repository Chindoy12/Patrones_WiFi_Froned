// Dark by default (the midnight design); the choice of each person is remembered in this browser only. Every theme
// switch on screen reads the same state, so they never disagree.
import { useSyncExternalStore } from 'react';

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

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme, () => 'dark');
}
