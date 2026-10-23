import { Suspense, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { roleLabel } from '../format';
import { ErrorBoundary } from './ErrorBoundary';
import { Icon, type IconName } from './Icon';
import { NetworkBackdrop } from './NetworkBackdrop';
import { ThemeToggle } from './ThemeToggle';

const SECTIONS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Panel', icon: 'home' },
  { to: '/networks', label: 'Redes', icon: 'wifi' },
  { to: '/devices', label: 'Dispositivos', icon: 'devices' },
  { to: '/measurements', label: 'Mediciones', icon: 'gauge' },
  { to: '/history', label: 'Historial', icon: 'history' },
  { to: '/analysis', label: 'Análisis', icon: 'analysis' },
  { to: '/anomalies', label: 'Anomalías', icon: 'anomaly' },
  { to: '/ai-model', label: 'Modelo de IA', icon: 'ai' },
  { to: '/alerts', label: 'Alertas', icon: 'bell' },
  { to: '/reports', label: 'Reportes', icon: 'report' },
];

export function Layout() {
  const { user, logout, can } = useAuth();
  const sections = [
    ...SECTIONS,
    ...(can('ADMIN', 'ANALYST') ? [{ to: '/user-networks', label: 'Redes de usuarios', icon: 'router' as const }] : []),
    ...(can('ADMIN') ? [{ to: '/users', label: 'Usuarios', icon: 'users' as const }] : []),
  ];
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="shell">
      <NetworkBackdrop />
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="sidebar__top">
          <span className="brand">
            <img src="/favicon.svg" alt="" width="28" height="28" />
            WiFiSense
          </span>
          <button className="sidebar__toggle" aria-expanded={open} aria-controls="main-nav"
                  onClick={() => setOpen((v) => !v)}>
            {open ? 'Cerrar' : 'Menú'}
          </button>
        </div>
        <nav id="main-nav" aria-label="Secciones">
          {sections.map((s) => (
            <NavLink key={s.to} to={s.to} end={s.to === '/'} onClick={() => setOpen(false)}>
              <Icon name={s.icon} size={18} /> {s.label}
            </NavLink>
          ))}
        </nav>
        {user && (
          <div className="sidebar__user">
            <span>{user.username}</span>
            <small>{roleLabel[user.role]}</small>
            <ThemeToggle />
            <button className="link-button" onClick={logout}>Cerrar sesión</button>
          </div>
        )}
      </aside>
      <main className="content">
        {/* Only the page changes while the next one loads, or if it fails; the menu stays in place. */}
        <ErrorBoundary resetKey={pathname}>
          <Suspense fallback={<p className="notice page-loading" role="status" aria-busy="true">Cargando…</p>}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
