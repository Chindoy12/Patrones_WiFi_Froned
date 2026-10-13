import { applyTheme, useTheme } from '../theme';
import { Icon } from './Icon';

/** Switches between the light design (default) and the dark one. */
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
