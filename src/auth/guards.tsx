import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isStaff, type Role } from '../types';
import { useAuth } from './AuthContext';

// UI routing only: the backend enforces the real rules and hides team endpoints from end users.

export const homePath = (role: Role) => (isStaff(role) ? '/' : '/mi-wifi');

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="notice">Cargando…</p>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export function RequireStaff({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user && isStaff(user.role) ? <>{children}</> : <Navigate to="/mi-wifi" replace />;
}

export function RequireEndUser({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user && !isStaff(user.role) ? <>{children}</> : <Navigate to="/" replace />;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { can } = useAuth();
  return can('ADMIN') ? <>{children}</> : <Navigate to="/" replace />;
}

/** Team members who may see the users' real networks: ADMIN and ANALYST (never VIEWER). */
export function RequireAnalyst({ children }: { children: ReactNode }) {
  const { can } = useAuth();
  return can('ADMIN', 'ANALYST') ? <>{children}</> : <Navigate to="/" replace />;
}
