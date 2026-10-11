import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../src/auth/AuthContext';
import { DataState } from '../src/components/DataState';
import { StatusBadge } from '../src/components/StatusBadge';
import { WifiLogo } from '../src/components/WifiLogo';
import { LoginPage } from '../src/pages/LoginPage';
import { api } from '../src/services/api';
import { ApiError } from '../src/services/apiClient';

vi.mock('../src/services/api', () => ({ api: { me: vi.fn(), login: vi.fn(), register: vi.fn() } }));

const renderLogin = () => render(<MemoryRouter><AuthProvider><LoginPage /></AuthProvider></MemoryRouter>);

describe('StatusBadge', () => {
  it('shows the Spanish label and the tone for the status', () => {
    render(<StatusBadge value="CRITICAL" />);
    expect(screen.getByText('Crítico')).toHaveClass('badge--bad');
  });
});

describe('WifiLogo', () => {
  it('draws the dot and three arcs that light up one after another', () => {
    const { container } = render(<WifiLogo busy />);
    expect(container.querySelector('.wifi-logo--busy')).not.toBeNull();
    expect(container.querySelectorAll('.wifi-logo__arc')).toHaveLength(3);
    expect(container.querySelector('.wifi-logo__dot')).not.toBeNull();
  });
});

describe('DataState', () => {
  it('shows the error before anything else', () => {
    render(<DataState loading={false} error="Falló" data={[1]}>{() => 'ok'}</DataState>);
    expect(screen.getByRole('alert')).toHaveTextContent('Falló');
  });

  it('shows the empty message for empty lists', () => {
    render(<DataState loading={false} error={null} data={[]} empty="Nada aquí">{() => 'ok'}</DataState>);
    expect(screen.getByText('Nada aquí')).toBeInTheDocument();
  });
});

describe('LoginPage', () => {
  it('limits username to 40 and password to 12 characters', async () => {
    renderLogin();
    await userEvent.type(screen.getByLabelText('Usuario o correo'), 'a'.repeat(50));
    await userEvent.type(screen.getByLabelText('Contraseña'), 'b'.repeat(50));

    expect(screen.getByLabelText('Usuario o correo')).toHaveValue('a'.repeat(40));
    expect(screen.getByLabelText('Contraseña')).toHaveValue('b'.repeat(12));
  });

  it('eye button shows and hides the password', async () => {
    renderLogin();
    const password = screen.getByLabelText('Contraseña');
    expect(password).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(password).toHaveAttribute('type', 'text');

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('always answers a rejected login with the same generic message', async () => {
    vi.mocked(api.login).mockImplementation(async () => {
      throw new ApiError(400, 'Validation failed: username is too long');
    });
    renderLogin();

    await userEvent.type(screen.getByLabelText('Usuario o correo'), 'admin');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Wrong#2026a');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/^Datos incorrectos\.$/);
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
  });

  it('explains when too many attempts were made', async () => {
    vi.mocked(api.login).mockImplementation(async () => {
      throw new ApiError(429, 'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.');
    });
    renderLogin();

    await userEvent.type(screen.getByLabelText('Usuario o correo'), 'admin');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Wrong#2026a');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos');
  });

  it('invites new visitors to sign up and no longer shows the team-only notice', () => {
    renderLogin();
    expect(screen.getByRole('link', { name: 'Crea una aquí' })).toHaveAttribute('href', '/registro');
    expect(screen.queryByText(/solo para el equipo autorizado/i)).not.toBeInTheDocument();
  });
});
