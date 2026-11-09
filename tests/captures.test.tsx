import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CapturesPage } from '../src/pages/CapturesPage';
import { api } from '../src/services/api';
import { capabilities, capture, detail, lab } from './captureFixtures';

vi.mock('../src/services/api', () => ({
  api: { networks: vi.fn(), captureCapabilities: vi.fn(), captures: vi.fn(), requestCapture: vi.fn(),
         captureDetail: vi.fn(), cancelCapture: vi.fn() },
}));

beforeEach(() => {
  vi.mocked(api.networks).mockReset().mockResolvedValue([lab]);
  vi.mocked(api.captureCapabilities).mockReset().mockResolvedValue(capabilities());
  vi.mocked(api.captures).mockReset().mockResolvedValue([capture()]);
  vi.mocked(api.requestCapture).mockReset();
  vi.mocked(api.captureDetail).mockReset().mockResolvedValue(detail());
  vi.mocked(api.cancelCapture).mockReset();
});

describe('Capturas técnicas', () => {
  it('explica antes que nada qué puede ver una captura y con qué herramienta', async () => {
    render(<CapturesPage />);

    expect(await screen.findByText('A. Tráfico del computador del sensor')).toBeInTheDocument();
    expect(screen.getByText('No lo hace WiFiSense')).toBeInTheDocument();
    expect(screen.getByText('No se puede comprobar')).toBeInTheDocument();
    const tools = screen.getByRole('list', { name: 'Herramientas de captura' });
    expect(within(tools).getByText('Npcap.')).toBeInTheDocument();
    expect(screen.getByText(/sin permisos de administrador/)).toBeInTheDocument();
  });
});
