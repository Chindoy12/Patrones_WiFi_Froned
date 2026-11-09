import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useAuth } from '../src/auth/AuthContext';
import { IdentityTag } from '../src/components/IdentityTag';
import { Layout } from '../src/components/Layout';
import type { Role } from '../src/types';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));

function as(role: Role) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 1, username: 'ana', role }, ready: true, login: vi.fn(), register: vi.fn(), renew: vi.fn(),
    logout: vi.fn(), can: (...roles) => roles.includes(role),
  });
  render(<MemoryRouter><Layout /></MemoryRouter>);
}

describe('menú del equipo', () => {
  it('solo un administrador ve Capturas técnicas y Auditoría', () => {
    as('ADMIN');
    expect(screen.getByRole('link', { name: /Capturas técnicas/ })).toHaveAttribute('href', '/captures');
    expect(screen.getByRole('link', { name: /Auditoría/ })).toHaveAttribute('href', '/audit');
  });

  it('un analista no las ve (y el backend se las niega igual)', () => {
    as('ANALYST');
    expect(screen.queryByRole('link', { name: /Capturas técnicas/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Auditoría/ })).not.toBeInTheDocument();
  });
});

describe('etiqueta de identificación de un equipo', () => {
  const base = { id: 'a'.repeat(24), label: null, vendor: 'Apple', hostname: null, privateMac: false, authorized: true,
    firstSeenAt: '2026-10-28T15:00:00Z', lastSeenAt: '2026-10-28T15:00:00Z', online: true, recent: false };

  it('un fabricante deducido de la MAC se marca como estimado', () => {
    render(<IdentityTag device={base} />);
    expect(screen.getByText('Estimado')).toHaveAttribute('title', 'Estimado por el fabricante o el tipo');
  });
});
