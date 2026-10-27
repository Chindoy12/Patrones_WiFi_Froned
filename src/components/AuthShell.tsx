import type { ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { WifiLogo } from './WifiLogo';
import { WifiNetworkFlow } from './WifiNetworkFlow';

interface Props {
  title: string;
  subtitle: string;
  busy?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Shared frame for login, sign-up and password recovery: a midnight canvas with a blueprint grid and a spotlight, the
 * illuminated WiFiSense wordmark, a glass card lit from below and, behind everything, a live drawing of how a Wi-Fi
 * network works (devices → access points → router → Internet) that reacts to the pointer.
 */
export function AuthShell({ title, subtitle, busy = false, footer, children }: Props) {
  return (
    <div className="auth-shell">
      <div className="auth-shell__grid" aria-hidden="true" />
      <WifiNetworkFlow />
      <header className="auth-hero">
        <p className="auth-hero__eyebrow"><span>Monitoreo de redes Wi-Fi</span></p>
        <p className="auth-hero__wordmark">WiFiSense</p>
      </header>
      <main className="auth-card">
        <span className="auth-card__mark"><WifiLogo busy={busy} size={30} /></span>
        <h1>{title}</h1>
        <p className="auth-card__subtitle">{subtitle}</p>
        {children}
        {footer && <div className="auth-card__footer">{footer}</div>}
      </main>
      <div className="auth-below">
        <p className="auth-below__flow">
          Así viaja tu conexión: <span>equipo</span> → <span>punto de acceso</span> → <span>router</span> → <span>Internet</span>.
          Toca un punto para ver su ruta o haz clic en un espacio vacío para conectar un equipo.
        </p>
        <ThemeToggle />
      </div>
    </div>
  );
}
