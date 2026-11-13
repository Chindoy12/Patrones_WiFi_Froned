import { switchTheme, useTheme } from '../theme';
import type { MouseEvent } from 'react';
import { Icon } from './Icon';

/**
 * Switches between the dark design (default) and the light one; the choice is remembered in this browser. The new
 * theme spreads from this button like a soft wave (switchTheme).
 */
export function ThemeToggle() {
  const dark = useTheme() === 'dark';
  function toggle(event: MouseEvent<HTMLButtonElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    switchTheme(dark ? 'light' : 'dark', { x: box.left + box.width / 2, y: box.top + box.height / 2 });
  }
  return (
    <button type="button" className="theme-toggle" onClick={toggle}
            aria-pressed={dark} title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
      <Icon name={dark ? 'sun' : 'moon'} size={18} />
      <span>{dark ? 'Modo claro' : 'Modo oscuro'}</span>
    </button>
  );
}
