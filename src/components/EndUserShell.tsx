import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { NetworkBackdrop } from './NetworkBackdrop';
import { WifiLogo } from './WifiLogo';

/** Light frame for the end-user area: brand, the signed-in user and sign out. Nothing of the team area. */
export function EndUserShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="eu">
      <NetworkBackdrop />
      <header className="eu__bar">
        <span className="eu__brand"><WifiLogo size={34} onLight /> WiFiSense</span>
        <div className="eu__account">
          <span className="eu__user" title={user?.username}>{user?.username}</span>
          <button className="button button--quiet" onClick={logout}>Cerrar sesión</button>
        </div>
      </header>
      <main className="eu__main">{children}</main>
    </div>
  );
}
