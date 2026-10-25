import type { ReactNode } from 'react';
import { WifiLogo } from './WifiLogo';

interface Props {
  title: string;
  subtitle: string;
  busy?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}

const STREAKS = 5;

/**
 * Shared frame for login, sign-up and password recovery: a midnight canvas with a violet glow on the horizon and a
 * glass card styled like an access pass (a stamped label and the route from your Wi-Fi to WiFiSense).
 */
export function AuthShell({ title, subtitle, busy = false, footer, children }: Props) {
  return (
    <div className="auth-shell">
      <div className="auth-shell__streaks" aria-hidden="true">
        {Array.from({ length: STREAKS }, (_, i) => <span key={i} />)}
      </div>
      <main className="auth-card">
        <div className="auth-card__brand">
          <WifiLogo busy={busy} size={44} />
          <span>WiFiSense</span>
          <span className="stamp auth-card__pass">Pase de acceso</span>
        </div>
        <p className="auth-card__route stamp" aria-hidden="true">
          <span>Tu Wi-Fi</span><i /><span>WiFiSense</span>
        </p>
        <h1 className="display">{title}</h1>
        <p className="auth-card__subtitle">{subtitle}</p>
        {children}
        {footer && <div className="auth-card__footer">{footer}</div>}
      </main>
    </div>
  );
}
