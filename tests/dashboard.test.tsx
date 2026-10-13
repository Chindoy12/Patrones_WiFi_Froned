import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '../src/pages/DashboardPage';
import { api } from '../src/services/api';
import { ApiError } from '../src/services/apiClient';
import type { DashboardSummary, NetworkQuality, SystemStatus } from '../src/types';

vi.mock('../src/services/api', () => ({
  api: { dashboard: vi.fn(), systemStatus: vi.fn(), networks: vi.fn(), networkQuality: vi.fn() },
}));

const summary: DashboardSummary = {
  totalNetworks: 4, networksByStatus: { NORMAL: 3, WARNING: 1, CRITICAL: 0 }, totalDevices: 7, openAlerts: 1,
  anomaliesLast24h: 2, averageLatencyLastHourMs: 31.2, recentAlerts: [], recentAnomalies: [],
};
const status: SystemStatus = { aiService: 'DOWN', database: 'UP', monitoringEnabled: true,
  lastMeasurementAt: '2026-10-12T21:00:00Z', openAlerts: 1, checkedAt: '2026-10-12T21:01:00Z' };
const quality: NetworkQuality = {
  networkId: 1, ssid: 'WiFiSense-Guest', measuredAt: '2026-10-12T21:00:00Z', source: 'SIMULATION', simulatedData: true,
  connectedDevices: 43,
  quality: {
    score: 61, grade: 'FAIR', gradeLabel: 'Regular', tips: [], contractedRatio: null, modelVersion: 'quality-1.0',
    activities: [],
    metrics: [
      { metric: 'latency', label: 'Latencia', value: 84, unit: 'ms', score: 66, status: 'FAIR' },
      { metric: 'jitter', label: 'Jitter', value: 9, unit: 'ms', score: 88, status: 'GOOD' },
      { metric: 'packet_loss', label: 'Pérdida', value: 1.3, unit: '%', score: 70, status: 'FAIR' },
    ],
  },
};

beforeEach(() => {
  vi.mocked(api.dashboard).mockResolvedValue(summary);
  vi.mocked(api.systemStatus).mockResolvedValue(status);
  vi.mocked(api.networks).mockResolvedValue([{ id: 1, ssid: 'WiFiSense-Guest', zoneName: 'Cafetería' } as never]);
  vi.mocked(api.networkQuality).mockResolvedValue(quality);
});

const renderPage = () => render(<MemoryRouter><DashboardPage /></MemoryRouter>);

describe('Panel del equipo', () => {
  it('shows the health gauge of the selected network graded by the AI', async () => {
    renderPage();

    expect(await screen.findByRole('img', { name: 'Calidad de 0 a 100: 61, Regular' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Latencia: 84 ms, Regular' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Jitter: 9 ms, Buena' })).toBeInTheDocument();
    expect(screen.getByText('Datos simulados')).toBeInTheDocument();
    expect(api.networkQuality).toHaveBeenCalledWith(1);
  });

  it('reports each service in the status strip, also when the AI is down', async () => {
    renderPage();

    const strip = await screen.findByRole('list', { name: 'Estado de los servicios' });
    expect(within(strip).getByText('Servicio de IA').closest('li')).toHaveTextContent('No responde');
    expect(within(strip).getByText('Monitoreo').closest('li')).toHaveTextContent('Activo');
  });

  it('explains when the network cannot be graded yet', async () => {
    vi.mocked(api.networkQuality).mockRejectedValue(new ApiError(422, 'La red aún no tiene mediciones.'));
    renderPage();

    expect(await screen.findByText('La red aún no tiene mediciones.')).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'Latencia: sin datos' })).toBeInTheDocument();
  });
});
