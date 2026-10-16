import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AGENT_INSTALLER, AgentPanel, Sparkline } from '../src/components/AgentPanel';
import { api } from '../src/services/api';
import type { AgentOverview, HomeNetwork } from '../src/types';

vi.mock('../src/services/api', () => ({
  api: { myAgent: vi.fn(), createAgentKey: vi.fn(), revokeAgentKey: vi.fn(), createAgentPairingCode: vi.fn() },
}));

const casa: HomeNetwork = { id: 1, name: 'Casa', provider: 'Claro', contractedMbps: 300, createdAt: '2026-10-11T12:00:00Z' };
const empty: AgentOverview = { key: null, online: false, latest: null, history: [], devices: [] };
const key = { prefix: 'wsa_AbC1', createdAt: '2026-10-12T20:00:00Z', lastSeenAt: '2026-10-12T21:00:00Z' };

const reporting: AgentOverview = {
  key, online: true,
  latest: {
    id: 9, receivedAt: '2026-10-12T21:00:00Z', agentVersion: '1.0.0', ssid: 'Casa_Lopez', authentication: 'WPA2',
    band: '2.4', channel: 6, signalDbm: -61, latencyMs: 22, jitterMs: 2, packetLossPct: 0, gatewayLatencyMs: 1.5,
    deviceCount: 7, newDeviceCount: 1, securityScore: 50, securityGrade: 'AT_RISK', qualityScore: 95,
    anomalyDetected: false, anomalyType: 'NONE',
    details: {
      wifi: { cipher: 'CCMP', signalPercent: 78, neighborsSameChannel: 5, neighborsTotal: 11 },
      openPorts: [23, 53, 80],
      security: {
        score: 50, grade: 'AT_RISK', gradeLabel: 'En riesgo', modelVersion: 'security-1.0',
        summary: 'Seguridad en riesgo: lo más urgente es «el router tiene Telnet abierto (puerto 23)».',
        findings: [
          { code: 'PORT_TELNET', severity: 'HIGH', title: 'El router tiene Telnet abierto (puerto 23)', penalty: 25,
            detail: 'Telnet envía la contraseña sin cifrar.', action: 'Desactiva Telnet en el router.' },
          { code: 'BAND_24', severity: 'INFO', title: 'Estás conectado a 2.4 GHz', penalty: 0,
            detail: 'Es más lenta.', action: 'Conéctate a 5 GHz.' },
        ],
      },
      anomaly: { detected: false, severity: 'NONE', type: 'NONE', diagnosis: null, message: 'Normal',
                 recommendation: null, recommendationSource: 'RULES' },
    },
  },
  history: [
    { at: '2026-10-12T20:50:00Z', latencyMs: 20, deviceCount: 6, securityScore: 60, qualityScore: 96, anomalyDetected: false },
    { at: '2026-10-12T21:00:00Z', latencyMs: 22, deviceCount: 7, securityScore: 50, qualityScore: 95, anomalyDetected: false },
  ],
  devices: [
    { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', label: null, firstSeenAt: '2026-10-10T12:00:00Z', lastSeenAt: '2026-10-12T21:00:00Z', online: true, recent: false },
    { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', label: 'Celular de Ana', firstSeenAt: '2026-10-12T21:00:00Z', lastSeenAt: '2026-10-12T21:00:00Z', online: true, recent: true },
  ],
};

beforeEach(() => {
  vi.mocked(api.myAgent).mockReset();
  vi.mocked(api.createAgentKey).mockReset();
  vi.mocked(api.revokeAgentKey).mockReset();
});

describe('Agent panel', () => {
  it('explains the agent and installs it with a short code instead of a key', async () => {
    vi.mocked(api.myAgent).mockResolvedValue(empty);
    vi.mocked(api.createAgentPairingCode).mockResolvedValue({ code: 'K7QM-4RZD',
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() });
    render(<AgentPanel network={casa} />);

    await userEvent.click(await screen.findByRole('button', { name: /Instalar el agente/ }));

    const box = await screen.findByRole('region', { name: 'Instalar el agente' });
    expect(within(box).getByText('K7QM-4RZD')).toBeInTheDocument();
    expect(within(box).getByRole('timer')).toHaveTextContent(/Vence en 1[45]:\d\d y sirve una sola vez/);
    expect(within(box).getByRole('link', { name: /Descargar instalador/ })).toHaveAttribute('href', AGENT_INSTALLER);
    expect(AGENT_INSTALLER).toMatch(/^https:\/\/github\.com\/.+\/releases\/download\/agente\/WiFiSenseAgente\.exe$/);
    expect(api.createAgentPairingCode).toHaveBeenCalledWith(1);
  });

  it('says when the code expired and offers a new one', async () => {
    vi.mocked(api.myAgent).mockResolvedValue(empty);
    vi.mocked(api.createAgentPairingCode).mockResolvedValue({ code: 'K7QM-4RZD', expiresAt: '2026-01-01T00:00:00Z' });
    render(<AgentPanel network={casa} />);

    await userEvent.click(await screen.findByRole('button', { name: /Instalar el agente/ }));

    expect(await screen.findByText('Este código venció.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generar otro código' })).toBeInTheDocument();
  });

  it('still offers Python and the long key for Linux', async () => {
    vi.mocked(api.myAgent).mockResolvedValue(empty);
    render(<AgentPanel network={casa} />);

    expect(await screen.findByRole('link', { name: 'wifisense_agent.py' })).toHaveAttribute('href', '/downloads/wifisense_agent.py');
    expect(screen.getByRole('button', { name: 'Crear clave del agente' })).toBeInTheDocument();
  });

  it('shows the new key once with the steps, and then only its prefix', async () => {
    vi.mocked(api.myAgent).mockResolvedValueOnce(empty).mockResolvedValue({ ...empty, key: { ...key, lastSeenAt: null } });
    vi.mocked(api.createAgentKey).mockResolvedValue({ key: 'wsa_' + 'x'.repeat(43), prefix: 'wsa_xxxx', createdAt: key.createdAt });
    render(<AgentPanel network={casa} />);

    await userEvent.click(await screen.findByRole('button', { name: /Crear clave del agente/ }));

    const box = await screen.findByRole('region', { name: 'Clave nueva del agente' });
    expect(within(box).getByText('wsa_' + 'x'.repeat(43))).toBeInTheDocument();
    expect(within(box).getByText(/no se vuelve a mostrar/)).toBeInTheDocument();
    expect(within(box).getByText('python wifisense_agent.py setup')).toBeInTheDocument();
    await userEvent.click(within(box).getByRole('button', { name: 'Ya la guardé' }));
    expect(screen.queryByText('wsa_' + 'x'.repeat(43))).not.toBeInTheDocument();
    expect(await screen.findByText(/Esperando el primer reporte/)).toBeInTheDocument();
  });

  it('shows connected devices, the new-device alert and the vulnerabilities the AI found', async () => {
    vi.mocked(api.myAgent).mockResolvedValue(reporting);
    render(<AgentPanel network={casa} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Apareció 1 equipo nuevo en tu red');
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Celular de Ana')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /de 100: 50, En riesgo/ })).toBeInTheDocument();
    const findings = screen.getByRole('heading', { name: /Vulnerabilidades y consejos/ }).closest('section')!;
    expect(within(findings).getByText('El router tiene Telnet abierto (puerto 23)')).toBeInTheDocument();
    expect(within(findings).getByText('Alto')).toBeInTheDocument();
    expect(within(findings).getByText('Desactiva Telnet en el router.')).toBeInTheDocument();
    expect(screen.getByText('Sin anomalías')).toBeInTheDocument();
    expect(screen.getByText('23, 53, 80')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Agente conectado');
  });

  it('revokes the key after confirming', async () => {
    vi.mocked(api.myAgent).mockResolvedValue(reporting);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(api.revokeAgentKey).mockResolvedValue(undefined);
    render(<AgentPanel network={casa} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Revocar' }));

    expect(api.revokeAgentKey).toHaveBeenCalledWith(1);
  });
});

describe('Sparkline', () => {
  it('needs two points and describes the range in words', () => {
    const { container, rerender } = render(<Sparkline values={[3]} label="Equipos" />);
    expect(container).toBeEmptyDOMElement();

    rerender(<Sparkline values={[3, 5, 4]} label="Equipos" />);
    expect(screen.getByRole('img', { name: 'Equipos: entre 3 y 5' })).toBeInTheDocument();
  });
});
