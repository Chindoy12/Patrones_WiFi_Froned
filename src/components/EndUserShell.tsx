import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { NetworkBackdrop } from './NetworkBackdrop';
import { SiteFooter } from './SiteFooter';
import { WifiLogo } from './WifiLogo';

/** Frame of the end-user area: frosted bar with the brand, the signed-in user and sign out. Nothing of the team area. */
export function EndUserShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="eu">
      <NetworkBackdrop />
      <header className="eu__bar">
        <span className="eu__brand"><WifiLogo size={34} /> WiFiSense</span>
        <div className="eu__account">
          <span className="eu__user" title={user?.username}>{user?.username}</span>
          <button className="button button--quiet" onClick={logout}>Cerrar sesión</button>
        </div>
      </header>
      <main className="eu__main">
        {children}
        <SiteFooter />
      </main>
    </div>
  );
}
