import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../src/auth/AuthContext';
import { EndUserHomePage } from '../src/pages/EndUserHomePage';
import { api } from '../src/services/api';
import { ApiError } from '../src/services/apiClient';
import { runSpeedTest } from '../src/services/speedTest';
import type { ConnectionTest, HomeNetwork } from '../src/types';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/services/api', () => ({
  api: { myNetworks: vi.fn(), createMyNetwork: vi.fn(), updateMyNetwork: vi.fn(), deleteMyNetwork: vi.fn(),
         myTests: vi.fn(), saveMyTest: vi.fn(), myAgent: vi.fn(), revokeAgentKey: vi.fn(),
         createAgentPairingCode: vi.fn(), updateAgentDevice: vi.fn(), alertPreferences: vi.fn(), updateAlertPreferences: vi.fn(), myAccount: vi.fn() },
}));
vi.mock('../src/services/speedTest', () => ({ runSpeedTest: vi.fn() }));

const casa: HomeNetwork = { id: 1, name: 'Casa', provider: 'Claro', contractedMbps: 300, createdAt: '2026-10-11T12:00:00Z' };

const renderPage = () => render(<MemoryRouter><EndUserHomePage /></MemoryRouter>);

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 9, username: 'ana', role: 'USER' }, ready: true,
    login: vi.fn(), register: vi.fn(), renew: vi.fn(), logout: vi.fn(), can: () => false,
  });
  vi.mocked(api.myNetworks).mockReset();
  vi.mocked(api.createMyNetwork).mockReset();
  vi.mocked(api.myTests).mockReset().mockResolvedValue([]);
  vi.mocked(api.saveMyTest).mockReset();
  vi.mocked(api.myAccount).mockReset().mockResolvedValue({ username: 'ana', email: 'ana@gmail.com', phone: null });
  vi.mocked(api.myAgent).mockReset().mockResolvedValue({ key: null, online: false, latest: null, history: [], devices: [], alerts: [] });
  vi.mocked(runSpeedTest).mockReset();
});

const graded: ConnectionTest = {
  id: 5, networkId: 1, latencyMs: 24, jitterMs: 3, downloadMbps: 180, uploadMbps: 40, qualityScore: 88,
  qualityGrade: 'EXCELLENT', createdAt: '2026-10-12T21:00:00Z',
  quality: {
    score: 88, grade: 'EXCELLENT', gradeLabel: 'Excelente', contractedRatio: 0.6, modelVersion: 'quality-1.0',
    tips: ['La subida es baja: afecta videollamadas.'],
    metrics: [
      { metric: 'latency', label: 'Latencia', value: 24, unit: 'ms', score: 92, status: 'GOOD' },
      { metric: 'jitter', label: 'Jitter', value: 3, unit: 'ms', score: 100, status: 'GOOD' },
    ],
    activities: [
      { activity: 'VIDEO_CALLS', label: 'Videollamadas y clases', suitable: true },
      { activity: 'GAMING', label: 'Juegos en línea', suitable: false },
    ],
  },
};

describe('Mi Wi-Fi', () => {
  it('greets the user by the name of the email, without the domain', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 9, username: 'laura.rios@correo.co', role: 'USER' }, ready: true,
      login: vi.fn(), register: vi.fn(), renew: vi.fn(), logout: vi.fn(), can: () => false,
    });
    vi.mocked(api.myNetworks).mockResolvedValue([casa]);
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Hola, laura.rios' })).toBeInTheDocument();
    expect(screen.getByText('Mi Wi-Fi')).toHaveClass('stamp');
    expect(screen.getByText('Las direcciones MAC nunca salen de tu computador')).toBeInTheDocument();
  });

  it('lists only what the backend returns for this user', async () => {
    vi.mocked(api.myNetworks).mockResolvedValue([casa]);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Casa' })).toBeInTheDocument();
    expect(screen.getByText('300 Mbps')).toBeInTheDocument();
    expect(screen.getAllByText('1 de 3').length).toBeGreaterThan(0);
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

  it('runs the connection test on the network and shows the grade of the AI', async () => {
    vi.mocked(api.myNetworks).mockResolvedValue([casa]);
    vi.mocked(api.myTests).mockResolvedValueOnce([]).mockResolvedValue([graded]);
    vi.mocked(runSpeedTest).mockResolvedValue({ latencyMs: 24, jitterMs: 3, downloadMbps: 180, uploadMbps: 40 });
    vi.mocked(api.saveMyTest).mockResolvedValue(graded);
    renderPage();

    expect(await screen.findByRole('img', { name: 'Calidad de 0 a 100: sin datos' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Probar mi conexión/ }));

    expect(await screen.findByRole('img', { name: 'Calidad de 0 a 100: 88, Excelente' })).toBeInTheDocument();
    expect(api.saveMyTest).toHaveBeenCalledWith(1, { latencyMs: 24, jitterMs: 3, downloadMbps: 180, uploadMbps: 40 });
    expect(screen.getByText('60 % de los 300 Mbps contratados')).toBeInTheDocument();
    expect(screen.getByText('Juegos en línea').closest('li')).toHaveTextContent('No');
    expect(screen.getByText('La subida es baja: afecta videollamadas.')).toBeInTheDocument();
  });

  it('keeps the measurement and says so when the AI could not grade it', async () => {
    vi.mocked(api.myNetworks).mockResolvedValue([casa]);
    vi.mocked(api.myTests).mockResolvedValue([{ ...graded, quality: null, qualityScore: null, qualityGrade: null }]);
    renderPage();

    expect(await screen.findByText(/El servicio de análisis no estaba disponible/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Latencia: 24 ms, Sin datos' })).toBeInTheDocument();
  });

  it('shows the error in Spanish when the user ran too many tests', async () => {
    vi.mocked(api.myNetworks).mockResolvedValue([casa]);
    vi.mocked(runSpeedTest).mockRejectedValue(new ApiError(429, 'Hiciste muchas pruebas seguidas. Espera unos minutos e inténtalo de nuevo.'));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /Probar mi conexión/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Hiciste muchas pruebas seguidas');
    expect(api.saveMyTest).not.toHaveBeenCalled();
  });

  it('switches the dashboard between the user networks', async () => {
    vi.mocked(api.myNetworks).mockResolvedValue([casa, { ...casa, id: 2, name: 'Oficina' }]);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Oficina' }));

    expect(await screen.findByRole('heading', { name: /Calidad de «Oficina»/ })).toBeInTheDocument();
    expect(api.myTests).toHaveBeenLastCalledWith(2);
  });
});
