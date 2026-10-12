import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../src/auth/AuthContext';
import { EndUserHomePage } from '../src/pages/EndUserHomePage';
import { api } from '../src/services/api';
import { ApiError } from '../src/services/apiClient';
import type { HomeNetwork } from '../src/types';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/services/api', () => ({
  api: { myNetworks: vi.fn(), createMyNetwork: vi.fn(), updateMyNetwork: vi.fn(), deleteMyNetwork: vi.fn() },
}));

const casa: HomeNetwork = { id: 1, name: 'Casa', provider: 'Claro', contractedMbps: 300, createdAt: '2026-10-11T12:00:00Z' };

const renderPage = () => render(<MemoryRouter><EndUserHomePage /></MemoryRouter>);

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 9, username: 'ana', role: 'USER' }, ready: true,
    login: vi.fn(), register: vi.fn(), logout: vi.fn(), can: () => false,
  });
  vi.mocked(api.myNetworks).mockReset();
  vi.mocked(api.createMyNetwork).mockReset();
});

describe('Mi Wi-Fi', () => {
  it('lists only what the backend returns for this user', async () => {
    vi.mocked(api.myNetworks).mockResolvedValue([casa]);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Casa' })).toBeInTheDocument();
    expect(screen.getByText('300 Mbps')).toBeInTheDocument();
    expect(screen.getByText('1 de 3')).toBeInTheDocument();
  });

  it('adds a network and reloads the list', async () => {
    vi.mocked(api.myNetworks).mockResolvedValueOnce([]).mockResolvedValueOnce([casa]);
    vi.mocked(api.createMyNetwork).mockResolvedValue(casa);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /Agregar red/ }));
    await userEvent.type(screen.getByLabelText('Nombre de la red'), 'Casa');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(api.createMyNetwork).toHaveBeenCalledWith({ name: 'Casa', provider: undefined, contractedMbps: undefined });
    expect(await screen.findByRole('heading', { name: 'Casa' })).toBeInTheDocument();
  });

  it('shows the Spanish field errors from the backend', async () => {
    vi.mocked(api.myNetworks).mockResolvedValue([]);
    vi.mocked(api.createMyNetwork).mockImplementation(async () => {
      throw new ApiError(400, 'Revisa los datos ingresados.', { name: 'El nombre solo puede tener letras, números, espacios y . _ \' -' });
    });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /Agregar red/ }));
    await userEvent.type(screen.getByLabelText('Nombre de la red'), '<b>hola');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText(/solo puede tener letras/)).toBeInTheDocument();
  });

  it('hides the add button once the user has three networks', async () => {
    vi.mocked(api.myNetworks).mockResolvedValue([casa, { ...casa, id: 2, name: 'Oficina' }, { ...casa, id: 3, name: 'Finca' }]);
    renderPage();

    const grid = await screen.findByRole('heading', { name: 'Finca' });
    expect(within(grid.closest('.eu-grid') as HTMLElement).queryByRole('button', { name: /Agregar red/ })).toBeNull();
  });
});
