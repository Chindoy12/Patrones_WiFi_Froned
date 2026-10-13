import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { roleLabel } from '../format';
import { Icon, type IconName } from './Icon';
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
  const sections = can('ADMIN') ? [...SECTIONS, { to: '/users', label: 'Usuarios', icon: 'users' as const }] : SECTIONS;
  const [open, setOpen] = useState(false);

  return (
    <div className="shell">
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
        <Outlet />
      </main>
    </div>
  );
}
