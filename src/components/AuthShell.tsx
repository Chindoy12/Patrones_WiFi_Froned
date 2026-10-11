import type { ReactNode } from 'react';
import { WifiLogo } from './WifiLogo';

interface Props {
  title: string;
  subtitle: string;
  busy?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}

const STREAKS = 7;

/** Shared frame for login and sign-up: animated light streaks behind a frosted-glass card. */
export function AuthShell({ title, subtitle, busy = false, footer, children }: Props) {
  return (
    <div className="auth-shell">
      <div className="auth-shell__streaks" aria-hidden="true">
        {Array.from({ length: STREAKS }, (_, i) => <span key={i} />)}
      </div>
      <main className="auth-card">
        <div className="auth-card__brand">
          <WifiLogo busy={busy} />
          <span>WiFiSense</span>
        </div>
        <h1>{title}</h1>
        <p className="auth-card__subtitle">{subtitle}</p>
        {children}
        {footer && <div className="auth-card__footer">{footer}</div>}
      </main>
    </div>
  );
}
