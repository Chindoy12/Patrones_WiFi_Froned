import type { ReactNode } from 'react';
import { useNow } from '../hooks/useNow';
import { Icon } from './Icon';
import { ThemeToggle } from './ThemeToggle';

const time = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
const day = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function longDate(date: Date): string {
  const text = day.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

interface Props {
  title: string;
  /** Short connection state shown with the Wi-Fi icon, e.g. "Monitoreo activo". */
  status?: { label: string; ok: boolean };
  actions?: ReactNode;
}

/** Header of the dashboards: clock and date, a connection state and the theme switch. */
export function TopBar({ title, status, actions }: Props) {
  const now = useNow();
  return (
    <header className="topbar">
      <div className="topbar__time">
        <strong className="topbar__clock">{time.format(now)}</strong>
        <span className="topbar__date">{longDate(now)}</span>
      </div>
      <h1 className="topbar__title">{title}</h1>
      <div className="topbar__end">
        {status && (
          <span className={`topbar__status ${status.ok ? 'is-ok' : 'is-down'}`}>
            <Icon name="wifi" size={18} />
            <span>{status.label}</span>
          </span>
        )}
        {actions}
        <ThemeToggle />
      </div>
    </header>
  );
}
