import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeToggle } from '../src/components/ThemeToggle';
import { applyTheme, currentTheme, storedTheme } from '../src/theme';

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.restoreAllMocks();
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
});
