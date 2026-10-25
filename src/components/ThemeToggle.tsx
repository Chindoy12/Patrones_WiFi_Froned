import { applyTheme, useTheme } from '../theme';
import { Icon } from './Icon';

/** Switches between the dark design (default) and the light one; the choice is remembered in this browser. */
export function ThemeToggle() {
  const dark = useTheme() === 'dark';
  return (
    <button type="button" className="theme-toggle" onClick={() => applyTheme(dark ? 'light' : 'dark')}
            aria-pressed={dark} title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
      <Icon name={dark ? 'sun' : 'moon'} size={18} />
      <span>{dark ? 'Modo claro' : 'Modo oscuro'}</span>
    </button>
  );
}
