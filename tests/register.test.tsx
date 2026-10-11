import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../src/auth/AuthContext';
import { RegisterPage } from '../src/pages/RegisterPage';
import { api } from '../src/services/api';
import { ApiError } from '../src/services/apiClient';

vi.mock('../src/services/api', () => ({ api: { me: vi.fn(), login: vi.fn(), register: vi.fn() } }));

const renderPage = () => render(<MemoryRouter><AuthProvider><RegisterPage /></AuthProvider></MemoryRouter>);

async function fill(username: string, password: string, confirmation = password) {
  await userEvent.type(screen.getByLabelText('Usuario o correo'), username);
  await userEvent.type(screen.getByLabelText('Contraseña'), password);
  await userEvent.type(screen.getByLabelText('Repite la contraseña'), confirmation);
}

describe('RegisterPage', () => {
  beforeEach(() => sessionStorage.clear());

  it('ticks each password rule while typing', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Redes');

    const rules = screen.getByRole('list', { name: 'Requisitos de la contraseña' });
    expect(rules.querySelector('.is-ok')).toHaveTextContent('Al menos una letra mayúscula');
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeDisabled();
  });

  it('warns when the confirmation does not match', async () => {
    renderPage();
    await fill('ana', 'Redes#2026a', 'Redes#2026b');

    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeDisabled();
  });

  it('creates the account with a valid name and password', async () => {
    vi.mocked(api.register).mockResolvedValue({ token: 't', expiresAt: '2026-10-12T00:00:00Z', user: { id: 9, username: 'ana', role: 'USER' } });
    renderPage();
    await fill('ana', 'Redes#2026a');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(api.register).toHaveBeenCalledWith('ana', 'Redes#2026a');
  });

  it('shows the reasons sent by the backend in Spanish', async () => {
    vi.mocked(api.register).mockImplementation(async () => {
      throw new ApiError(409, 'Ese nombre de usuario no está disponible.');
    });
    renderPage();
    await fill('ana', 'Redes#2026a');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ese nombre de usuario no está disponible.');
  });
});
