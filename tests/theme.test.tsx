import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeToggle } from '../src/components/ThemeToggle';
import { applyTheme, currentTheme, storedTheme, switchTheme, WAVE_MS } from '../src/theme';

/** Gives the document (or takes away) view transitions, which jsdom does not have. */
function viewTransitions(fn?: unknown) {
  if (fn) Object.defineProperty(document, 'startViewTransition', { value: fn, configurable: true });
  else Reflect.deleteProperty(document, 'startViewTransition');
}

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  viewTransitions();
  Reflect.deleteProperty(window, 'matchMedia');
  document.documentElement.classList.remove('theme-fade');
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('theme', () => {
  it('is dark when the person never chose one', () => {
    expect(storedTheme()).toBe('dark');
    expect(currentTheme()).toBe('dark');
  });

  it('ignores the old key, which stored "light" for everybody before the redesign', () => {
    localStorage.setItem('wifisense.theme', 'light');

    expect(storedTheme()).toBe('dark');
  });

  it('keeps the light design for whoever chose it with the switch', () => {
    act(() => applyTheme('light'));

    expect(storedTheme()).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('shows a theme without remembering it when the page starts', () => {
    act(() => applyTheme('dark', false));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.length).toBe(0);
  });

  it('stays dark when the browser blocks storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });

    expect(storedTheme()).toBe('dark');
  });

  it('offers the light design from the dark one', () => {
    act(() => applyTheme('dark', false));
    render(<ThemeToggle />);

    expect(screen.getByRole('button', { name: /Modo claro/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('the new theme spreads from the switch like a wave when the browser can animate it', async () => {
    let finish = () => undefined as void;
    const startViewTransition = vi.fn((update: () => void) => {
      update();
      return { finished: new Promise<void>((resolve) => { finish = resolve; }) };
    });
    viewTransitions(startViewTransition);
    act(() => applyTheme('dark', false));
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: /Modo claro/ }));

    const root = document.documentElement;
    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(root.dataset.theme).toBe('light');
    expect(root.dataset.themeWave).toBe('');
    expect(root.style.getPropertyValue('--wave-x')).toMatch(/px$/);
    await act(async () => finish());
    expect(root.dataset.themeWave).toBeUndefined();
  });

  it('without view transitions the colors fade instead of jumping', () => {
    vi.useFakeTimers();
    switchTheme('light');

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement).toHaveClass('theme-fade');
    vi.advanceTimersByTime(WAVE_MS);
    expect(document.documentElement).not.toHaveClass('theme-fade');
  });

  it('with reduced motion the theme changes at once, with no wave', () => {
    const startViewTransition = vi.fn();
    viewTransitions(startViewTransition);
    Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: true }), configurable: true });

    switchTheme('light');

    expect(startViewTransition).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement).not.toHaveClass('theme-fade');
  });
});
