import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useAuth } from '../src/auth/AuthContext';
import { RequireAuth, RequireEndUser, RequireStaff, homePath } from '../src/auth/guards';
import type { Role } from '../src/types';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));

function signedInAs(role: Role | null) {
  vi.mocked(useAuth).mockReturnValue({
    user: role ? { id: 1, username: 'ana', role } : null,
    ready: true, login: vi.fn(), register: vi.fn(), logout: vi.fn(), can: (...roles) => !!role && roles.includes(role),
  });
}

const renderAt = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/login" element={<p>Pantalla de login</p>} />
      <Route path="/mi-wifi" element={<RequireAuth><RequireEndUser><p>Área del usuario</p></RequireEndUser></RequireAuth>} />
      <Route path="/" element={<RequireAuth><RequireStaff><p>Panel del equipo</p></RequireStaff></RequireAuth>} />
    </Routes>
  </MemoryRouter>,
);

describe('route guards', () => {
  it('send anonymous visitors to the login', () => {
    signedInAs(null);
    renderAt('/');
    expect(screen.getByText('Pantalla de login')).toBeInTheDocument();
  });

  it('keep end users out of the team panel', () => {
    signedInAs('USER');
    renderAt('/');
    expect(screen.getByText('Área del usuario')).toBeInTheDocument();
    expect(screen.queryByText('Panel del equipo')).not.toBeInTheDocument();
  });

  it('send team members to their panel', () => {
    signedInAs('VIEWER');
    renderAt('/mi-wifi');
    expect(screen.getByText('Panel del equipo')).toBeInTheDocument();
  });

  it('pick the home page by role', () => {
    expect(homePath('USER')).toBe('/mi-wifi');
    expect(homePath('ANALYST')).toBe('/');
  });
});
