import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FunctionGuide } from '../src/components/FunctionGuide';
import { LIVE_MAX_MS, LIVE_POLL_MS, LivePanel } from '../src/components/LivePanel';
import { ApiError } from '../src/services/apiClient';
import type { LivePoint, LiveSummary, LiveView } from '../src/types';

const EMPTY: LiveSummary = {
  samples: 0, downloadMbps: null, uploadMbps: null, peakDownloadMbps: null, peakUploadMbps: null, internetMs: null,
  jitterMs: null, lossPct: null, gatewayMs: null, signalPercent: null, notes: [],
};

function point(seq: number, overrides: Partial<LivePoint> = {}): LivePoint {
  return {
    seq, at: new Date(Date.UTC(2026, 10, 11, 15, 0, seq * 2)).toISOString(), downloadMbps: 12.5, uploadMbps: 1.25,
    internetMs: 38, internetLost: false, gatewayMs: 4, gatewayLost: false, signalPercent: 71, rxRateMbps: 144.4,
    txRateMbps: 72.2, ...overrides,
  };
}

function view(overrides: Partial<LiveView> = {}): LiveView {
  return { state: 'WAITING', watchingSince: null, lastSampleAt: null, lastSeq: 0, points: [], summary: EMPTY, ...overrides };
}

/** Lets the pending answer of the fake load arrive. */
const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });
const wait = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

describe('En vivo', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });

  it('no mide hasta que alguien lo enciende y explica que no gasta datos de prueba', () => {
    const load = vi.fn();
    render(<LivePanel load={load} />);

    expect(screen.getByRole('heading', { name: 'En vivo' })).toBeInTheDocument();
    expect(screen.getByText(/No gasta datos de prueba/)).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });

  it('al encenderlo avisa al agente, muestra lo que llega y solo pide las muestras nuevas', async () => {
    const load = vi.fn()
      .mockResolvedValueOnce(view())
      .mockResolvedValueOnce(view({ state: 'LIVE', lastSeq: 2, points: [point(1), point(2, { downloadMbps: 20.75 })] }))
      .mockResolvedValue(view({ state: 'LIVE', lastSeq: 3, points: [point(3, { downloadMbps: 3.5 })] }));
    render(<LivePanel load={load} />);

    fireEvent.click(screen.getByRole('button', { name: /Ver en vivo/ }));
    await settle();
    expect(load).toHaveBeenLastCalledWith(0);
    expect(screen.getByText(/empieza a medir en menos de 30/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Esperando al agente');

    await wait(LIVE_POLL_MS);
    expect(screen.getByRole('status')).toHaveTextContent('En vivo');
    expect(screen.getByText('20,75')).toBeInTheDocument();  // bajando ahora: la última muestra

    await wait(LIVE_POLL_MS);
    expect(load).toHaveBeenLastCalledWith(2);  // ya tiene la 1 y la 2
    expect(screen.getByText('3,5')).toBeInTheDocument();
  });

  it('dice qué significa el último minuto, con las reglas del servidor', async () => {
    const summary: LiveSummary = {
      ...EMPTY, samples: 30, downloadMbps: 8.1, peakDownloadMbps: 20.75, uploadMbps: 0.9, internetMs: 180,
      jitterMs: 12, lossPct: 0, gatewayMs: 4, signalPercent: 71,
      notes: [
        { level: 'BAD', text: 'La latencia hacia internet es alta (180 ms): las videollamadas van con retraso.' },
        { level: 'WARN', text: 'El router responde rápido (4 ms): la demora está en los datos móviles del celular.' },
      ],
    };
    render(<LivePanel load={vi.fn().mockResolvedValue(view({ state: 'LIVE', lastSeq: 1, points: [point(1)], summary }))} />);

    fireEvent.click(screen.getByRole('button', { name: /Ver en vivo/ }));
    await settle();

    expect(screen.getByText(/Último minuto: bajada promedio 8,1 Mbps \(pico 20,75 Mbps\)/)).toBeInTheDocument();
    expect(screen.getByText(/latencia 180 ms, jitter 12 ms, pérdida 0 %, señal 71 %/)).toBeInTheDocument();
    expect(screen.getByText(/La latencia hacia internet es alta/).closest('li')).toHaveClass('live__note--bad');
    expect(screen.getByText(/datos móviles del celular/).closest('li')).toHaveClass('live__note--warn');
    expect(screen.getByText(/no lo máximo que aguanta la conexión/)).toBeInTheDocument();
  });

  it('una respuesta que no llegó se ve como «Sin respuesta», no como cero', async () => {
    render(<LivePanel load={vi.fn().mockResolvedValue(view({
      state: 'LIVE', lastSeq: 1, points: [point(1, { internetMs: null, internetLost: true })],
    }))} />);

    fireEvent.click(screen.getByRole('button', { name: /Ver en vivo/ }));
    await settle();

    expect(screen.getByText('Sin respuesta')).toBeInTheDocument();
  });

  it('si el agente no responde dice qué revisar, incluida la versión 2.1.0', async () => {
    render(<LivePanel load={vi.fn().mockResolvedValue(view({ state: 'NO_AGENT' }))} />);

    fireEvent.click(screen.getByRole('button', { name: /Ver en vivo/ }));
    await settle();

    expect(screen.getByRole('alert')).toHaveTextContent(/versión 2.1.0 o más nueva/);
  });

  it('se pausa sola a los 10 minutos para que el agente no mida sin que nadie mire', async () => {
    const load = vi.fn().mockResolvedValue(view({ state: 'LIVE' }));
    render(<LivePanel load={load} />);
    fireEvent.click(screen.getByRole('button', { name: /Ver en vivo/ }));
    await settle();

    await wait(LIVE_MAX_MS + LIVE_POLL_MS);
    const calls = load.mock.calls.length;
    await wait(10 * LIVE_POLL_MS);

    expect(load.mock.calls.length).toBe(calls);
    expect(screen.getByText(/se pausó después de 10 minutos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Seguir en vivo/ })).toBeInTheDocument();
  });

  it('con la pestaña oculta no pregunta, y así el agente se detiene solo', async () => {
    const load = vi.fn().mockResolvedValue(view());
    render(<LivePanel load={load} />);
    fireEvent.click(screen.getByRole('button', { name: /Ver en vivo/ }));
    await settle();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });

    await wait(5 * LIVE_POLL_MS);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('Detener deja de preguntar', async () => {
    const load = vi.fn().mockResolvedValue(view({ state: 'LIVE', lastSeq: 1, points: [point(1)] }));
    render(<LivePanel load={load} />);
    fireEvent.click(screen.getByRole('button', { name: /Ver en vivo/ }));
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Detener' }));
    await wait(5 * LIVE_POLL_MS);

    expect(load).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Ver en vivo/ })).toBeInTheDocument();
  });

  it('tres errores seguidos lo detienen y muestran el error', async () => {
    const load = vi.fn().mockRejectedValue(new ApiError(404, 'No se encontró la red 7.'));
    render(<LivePanel load={load} />);
    fireEvent.click(screen.getByRole('button', { name: /Ver en vivo/ }));
    await settle();

    await wait(10 * LIVE_POLL_MS);

    expect(load).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('alert')).toHaveTextContent('No se encontró la red 7.');
  });

  it('si el servidor se reinició vuelve a pedir desde el principio', async () => {
    const load = vi.fn()
      .mockResolvedValueOnce(view({ state: 'LIVE', lastSeq: 40, points: [point(40)] }))
      .mockResolvedValueOnce(view({ state: 'LIVE', lastSeq: 2, points: [] }))
      .mockResolvedValue(view({ state: 'LIVE', lastSeq: 2, points: [point(1), point(2)] }));
    render(<LivePanel load={load} />);
    fireEvent.click(screen.getByRole('button', { name: /Ver en vivo/ }));
    await settle();

    await wait(LIVE_POLL_MS);
    await wait(LIVE_POLL_MS);

    expect(load.mock.calls.map((call) => call[0])).toEqual([0, 40, 0]);
  });

  it('en el sensor del equipo habla del computador del sensor', () => {
    render(<LivePanel team load={vi.fn()} />);

    expect(screen.getByRole('heading', { level: 3, name: 'En vivo' })).toBeInTheDocument();
    expect(screen.getByText(/el computador del sensor está bajando/)).toBeInTheDocument();
  });
});

describe('Qué hace cada cosa', () => {
  it('explica En vivo: uso de este momento, no capacidad', () => {
    render(<FunctionGuide />);

    expect(screen.getByText('En vivo.')).toBeInTheDocument();
    expect(screen.getByText(/no la capacidad de la conexión/)).toBeInTheDocument();
  });
});
