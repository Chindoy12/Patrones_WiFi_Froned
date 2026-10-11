import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { roleLabel } from '../format';

const SECTIONS = [
  { to: '/', label: 'Panel' },
  { to: '/networks', label: 'Redes' },
  { to: '/devices', label: 'Dispositivos' },
  { to: '/measurements', label: 'Mediciones' },
  { to: '/history', label: 'Historial' },
  { to: '/analysis', label: 'Análisis' },
  { to: '/anomalies', label: 'Anomalías' },
  { to: '/alerts', label: 'Alertas' },
  { to: '/reports', label: 'Reportes' },
];

export function Layout() {
  const { user, logout, can } = useAuth();
  const sections = can('ADMIN') ? [...SECTIONS, { to: '/users', label: 'Usuarios' }] : SECTIONS;
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
              {s.label}
            </NavLink>
          ))}
        </nav>
        {user && (
          <div className="sidebar__user">
            <span>{user.username}</span>
            <small>{roleLabel[user.role]}</small>
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
