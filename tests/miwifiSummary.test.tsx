import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../src/auth/AuthContext';
import { MiWifiArea } from '../src/pages/miwifi/MiWifiArea';
import { api } from '../src/services/api';
import type { AgentDevice, AgentOverview, HomeNetwork } from '../src/types';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/services/api', () => ({
  api: { myNetworks: vi.fn(), myAgent: vi.fn() },
}));

const casa: HomeNetwork = { id: 1, name: 'Casa', provider: 'Claro', contractedMbps: 300, createdAt: '2026-10-11T12:00:00Z' };
const now = new Date().toISOString();

function device(id: string, extra: Partial<AgentDevice>): AgentDevice {
  return { id: id.repeat(24), label: null, vendor: null, hostname: null, privateMac: true, authorized: true,
    firstSeenAt: now, lastSeenAt: now, online: false, recent: false, ...extra };
}

const reporting: AgentOverview = {
  key: { prefix: 'wsa_AbC1', createdAt: now, lastSeenAt: now }, online: true, history: [],
  devices: [
    device('a', { role: 'SELF', kind: 'COMPUTER', hostname: 'DESKTOP-1', privateMac: false, online: true }),
    device('b', { hostname: 'Android-84', online: true }),
    device('c', {}), device('d', {}),
    device('e', { kind: 'TV', label: 'TV sala', privateMac: false }),
  ],
  alerts: [
    { type: 'ANOMALY', detail: 'Revisa la configuración de QoS.', at: '2026-11-11T16:57:00Z' },
    { type: 'ANOMALY', detail: 'Revisa la configuración de QoS.', at: '2026-11-11T16:50:00Z' },
    { type: 'NEW_DEVICE', detail: 'Se conectó un equipo nuevo.', at: '2026-11-11T16:40:00Z' },
  ],
  latest: {
    id: 9, receivedAt: now, agentVersion: '2.1.0', ssid: 'Casa', authentication: 'WPA2', band: '2.4', channel: 1,
    signalDbm: -58, latencyMs: 182, jitterMs: 14, packetLossPct: 1.2, gatewayLatencyMs: 4, deviceCount: 2,
    newDeviceCount: 0, securityScore: 85, securityGrade: 'ACCEPTABLE', qualityScore: 39, anomalyDetected: true,
    anomalyType: 'CONGESTION',
    details: {
      security: { score: 85, grade: 'ACCEPTABLE', gradeLabel: 'Aceptable', modelVersion: 'security-1.0',
        summary: 'Bien.', findings: [{ code: 'PORT_SSH', severity: 'LOW', title: 'SSH abierto', penalty: 5,
          detail: 'SSH.', action: 'Usa una contraseña larga.' }] },
    },
  },
};

const renderSummary = () => render(
  <MemoryRouter initialEntries={['/mi-wifi']}>
    <Routes><Route path="/mi-wifi/*" element={<MiWifiArea />} /></Routes>
  </MemoryRouter>,
);

/** The card of the summary whose name matches. */
const card = (name: RegExp) => within(screen.getByRole('list', { name: 'Pantallas de Mi Wi-Fi' })).getByRole('link', { name });

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 9, username: 'ana', role: 'USER' }, ready: true,
    login: vi.fn(), register: vi.fn(), renew: vi.fn(), logout: vi.fn(), can: () => false,
  });
  vi.mocked(api.myNetworks).mockReset().mockResolvedValue([casa]);
  vi.mocked(api.myAgent).mockReset();
});

describe('Resumen de Mi Wi-Fi', () => {
  it('shows the most important thing of each screen and leads to it', async () => {
    vi.mocked(api.myAgent).mockResolvedValue(reporting);
    renderSummary();

    const connection = await screen.findByRole('link', { name: /^Conexión.*39.*de 100/ });
    expect(connection).toHaveAttribute('href', '/mi-wifi/conexion');
    expect(card(/^Equipos/)).toHaveTextContent('2 conectados');
    expect(within(card(/^Equipos/)).getByTitle('Celulares y tabletas')).toHaveTextContent('3');
    expect(within(card(/^Equipos/)).getByTitle('Computadores')).toHaveTextContent('1');
    expect(within(card(/^Equipos/)).getByTitle('TV y entretenimiento')).toHaveTextContent('1');
    expect(card(/^Seguridad/)).toHaveTextContent('85 de 100Aceptable · 1 consejo');
    expect(card(/^Avisos/)).toHaveTextContent('2 avisos');  // the repeated one counts once
    expect(card(/^Avisos/)).toHaveTextContent('Revisa la configuración de QoS.');
    expect(card(/^Agente y ajustes/)).toHaveTextContent('El agente está conectado.');
  });

  it('without the agent, each card says what is missing instead of showing empty numbers', async () => {
    vi.mocked(api.myAgent).mockResolvedValue({ key: null, online: false, latest: null, history: [], devices: [], alerts: [] });
    renderSummary();

    expect(await screen.findByText('El agente no está instalado.')).toBeInTheDocument();
    for (const name of [/^Equipos/, /^Seguridad/, /^Avisos/]) {
      expect(card(name)).toHaveTextContent('Instala el agente para verlo');
    }
  });

  it('the menu says how many devices are connected and how many notices there are', async () => {
    vi.mocked(api.myAgent).mockResolvedValue(reporting);
    renderSummary();

    const menu = screen.getByRole('navigation', { name: 'Secciones de Mi Wi-Fi' });
    expect(await within(menu).findByRole('link', { name: 'Equipos 2' })).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: 'Avisos 2' })).toBeInTheDocument();
  });
});
