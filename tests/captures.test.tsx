import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CapturesPage } from '../src/pages/CapturesPage';
import { api } from '../src/services/api';
import { ApiError } from '../src/services/apiClient';
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

  it('cuando no se puede capturar dice cada motivo y no deja pedir', async () => {
    vi.mocked(api.captureCapabilities).mockResolvedValue(capabilities({
      canCapture: false, blockers: ['En el computador del sensor no se han permitido las capturas técnicas.',
        'El computador del sensor no tiene una herramienta de captura que pueda usar.'] }));
    render(<CapturesPage />);

    const blockers = await screen.findByRole('list', { name: 'Lo que impide capturar' });
    expect(within(blockers).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Pedir captura/ })).toBeDisabled();
  });

  it('pide propósito y confirmación antes de enviar, y envía los límites elegidos', async () => {
    const user = userEvent.setup();
    vi.mocked(api.requestCapture).mockResolvedValue(capture({ id: 13, status: 'PENDING', packetCount: null }));
    render(<CapturesPage />);

    await user.click(await screen.findByRole('button', { name: /Pedir captura/ }));
    const errors = screen.getByRole('alert');
    expect(errors).toHaveTextContent('Escribe el propósito');
    expect(errors).toHaveTextContent('Confirma que la captura está autorizada');
    expect(api.requestCapture).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Propósito autorizado'), '  Medir la difusión en la sala 2  ');
    const seconds = screen.getByLabelText('Duración (segundos)');
    await user.clear(seconds);
    await user.type(seconds, '20');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Pedir captura/ }));

    expect(api.requestCapture).toHaveBeenCalledWith(4, { purpose: 'Medir la difusión en la sala 2', maxSeconds: 20,
      maxPackets: 5000 });
  });

  it('muestra el motivo del servidor cuando rechaza el pedido', async () => {
    const user = userEvent.setup();
    vi.mocked(api.requestCapture).mockRejectedValue(new ApiError(409, 'El sensor no ha reportado en los últimos minutos.'));
    render(<CapturesPage />);

    await user.type(await screen.findByLabelText('Propósito autorizado'), 'Medir la difusión en la sala 2');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Pedir captura/ }));

    expect(await screen.findByText('El sensor no ha reportado en los últimos minutos.')).toBeInTheDocument();
  });
});
