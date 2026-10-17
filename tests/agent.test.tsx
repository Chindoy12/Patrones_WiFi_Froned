import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AGENT_INSTALLER, AgentPanel, deviceIcon, deviceName, deviceNames, Sparkline } from '../src/components/AgentPanel';
import { api } from '../src/services/api';
import type { AgentChannel, AgentDevice, AgentOverview, HomeNetwork } from '../src/types';

vi.mock('../src/services/api', () => ({
  api: { myAgent: vi.fn(), revokeAgentKey: vi.fn(), createAgentPairingCode: vi.fn(),
         updateAgentDevice: vi.fn(), alertPreferences: vi.fn(), updateAlertPreferences: vi.fn() },
}));

const casa: HomeNetwork = { id: 1, name: 'Casa', provider: 'Claro', contractedMbps: 300, createdAt: '2026-10-11T12:00:00Z' };
const empty: AgentOverview = { key: null, online: false, latest: null, history: [], devices: [], alerts: [] };
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
  alerts: [],
  devices: [
    { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', label: null, vendor: 'TP-Link', hostname: 'router-sala', privateMac: false, authorized: true, firstSeenAt: '2026-10-10T12:00:00Z', lastSeenAt: '2026-10-12T21:00:00Z', online: true, recent: false },
    { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', label: 'Celular de Ana', vendor: 'Apple', hostname: 'iPhone-de-Ana', privateMac: false, authorized: true, firstSeenAt: '2026-10-12T21:00:00Z', lastSeenAt: '2026-10-12T21:00:00Z', online: true, recent: true },
  ],
};

beforeEach(() => {
  vi.mocked(api.myAgent).mockReset();
  vi.mocked(api.createAgentPairingCode).mockReset();
  vi.mocked(api.revokeAgentKey).mockReset();
  vi.mocked(api.updateAgentDevice).mockReset();
  vi.mocked(api.updateAlertPreferences).mockReset();
  vi.mocked(api.alertPreferences).mockReset()
    .mockResolvedValue({ newDevice: true, security: true, anomaly: true });
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

  it('only offers the installer: no Python, no console, no long key', async () => {
    vi.mocked(api.myAgent).mockResolvedValue(empty);
    const { container } = render(<AgentPanel network={casa} />);

    expect(await screen.findByRole('button', { name: /Instalar el agente/ })).toBeInTheDocument();
    expect(screen.getByText(/No necesitas Python ni usar comandos/)).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/wifisense_agent\.py|python wifisense|CMD/);
    expect(screen.queryByRole('button', { name: /clave/i })).not.toBeInTheDocument();
    expect(container.querySelector('a[href$=".py"]')).toBeNull();
  });

  it('while waiting for the first report it offers a new installation code, never a console', async () => {
    vi.mocked(api.myAgent).mockResolvedValue({ ...empty, key: { ...key, lastSeenAt: null } });
    vi.mocked(api.createAgentPairingCode).mockResolvedValue({ code: 'P4ZX-82KD',
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() });
    const { container } = render(<AgentPanel network={casa} />);

    expect(await screen.findByText(/Esperando el primer reporte del agente/)).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/python wifisense|setup|CMD/);
    await userEvent.click(screen.getByRole('button', { name: /Obtener código de instalación/ }));

    expect(await screen.findByText('P4ZX-82KD')).toBeInTheDocument();
    expect(api.createAgentPairingCode).toHaveBeenCalledWith(1);
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

  it('disconnects the agent after confirming, and has no "new key" option', async () => {
    vi.mocked(api.myAgent).mockResolvedValue(reporting);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(api.revokeAgentKey).mockResolvedValue(undefined);
    render(<AgentPanel network={casa} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Desconectar' }));

    expect(api.revokeAgentKey).toHaveBeenCalledWith(1);
    expect(screen.queryByRole('button', { name: 'Nueva clave' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Instalar en otro computador' })).toBeInTheDocument();
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

describe('Devices like a Bluetooth list', () => {
  it('shows name, maker and lets the user rename a device', async () => {
    vi.mocked(api.myAgent).mockResolvedValue(reporting);
    vi.mocked(api.updateAgentDevice).mockResolvedValue({ ...reporting.devices[1], label: 'iPad de Ana' });
    render(<AgentPanel network={casa} />);

    const row = (await screen.findByText('Celular de Ana')).closest('.devrow') as HTMLElement;
    expect(within(row).getByText(/Apple/)).toBeInTheDocument();
    await userEvent.click(within(row).getByRole('button', { name: 'Cambiar el nombre' }));
    const input = within(row).getByRole('textbox', { name: 'Nombre del equipo' });
    await userEvent.clear(input);
    await userEvent.type(input, 'iPad de Ana{Enter}');

    expect(api.updateAgentDevice).toHaveBeenCalledWith(casa.id, 'bbbbbbbbbbbbbbbbbbbbbbbb', { label: 'iPad de Ana' });
  });

  it('marks a device as not mine and shows how to remove it in the router', async () => {
    vi.mocked(api.myAgent).mockResolvedValue(reporting);
    vi.mocked(api.updateAgentDevice).mockResolvedValue({ ...reporting.devices[1], authorized: false });
    render(<AgentPanel network={casa} />);

    const row = (await screen.findByText('Celular de Ana')).closest('.devrow') as HTMLElement;
    await userEvent.click(within(row).getByRole('button', { name: 'Marcar como no autorizado' }));

    expect(api.updateAgentDevice).toHaveBeenCalledWith(casa.id, 'bbbbbbbbbbbbbbbbbbbbbbbb', { authorized: false });
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('cambia la contraseña de tu Wi-Fi');
    expect(within(dialog).getByText(/Filtrado MAC/)).toBeInTheDocument();
  });

  it('warns when a device marked as not mine is still connected', async () => {
    const blocked = {
      ...reporting,
      devices: [{ ...reporting.devices[1], authorized: false, recent: false }],
    };
    vi.mocked(api.myAgent).mockResolvedValue(blocked);
    render(<AgentPanel network={casa} />);

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('Un equipo que marcaste como no autorizado está conectado');
    const row = (await screen.findByText('Celular de Ana')).closest('.devrow') as HTMLElement;
    expect(within(row).getByText('No autorizado')).toBeInTheDocument();
  });

  it('turns an email alert off', async () => {
    vi.mocked(api.myAgent).mockResolvedValue(reporting);
    vi.mocked(api.alertPreferences).mockResolvedValue({ newDevice: true, security: true, anomaly: true });
    vi.mocked(api.updateAlertPreferences).mockResolvedValue({ newDevice: false, security: true, anomaly: true });
    render(<AgentPanel network={casa} />);

    const toggle = await screen.findByRole('checkbox', { name: /Equipo nuevo o no autorizado/ });
    await userEvent.click(toggle);

    expect(api.updateAlertPreferences).toHaveBeenCalledWith({ newDevice: false, security: true, anomaly: true });
  });
});

const phone: AgentDevice = {
  id: 'cccccccccccccccccccccccc', label: null, vendor: null, hostname: null, privateMac: true, authorized: true,
  firstSeenAt: '2026-10-10T12:00:00Z', lastSeenAt: '2026-10-12T21:00:00Z', online: true, recent: false,
};

describe('Devices with a private MAC', () => {
  it('calls them a phone or tablet instead of an unknown device, and suggests naming them', async () => {
    vi.mocked(api.myAgent).mockResolvedValue({ ...reporting, devices: [...reporting.devices, phone] });
    render(<AgentPanel network={casa} />);

    const row = (await screen.findByText('Celular o tableta 1')).closest('.devrow') as HTMLElement;
    expect(within(row).getByText('Dirección privada')).toBeInTheDocument();
    expect(screen.getByText(/ponles un nombre con el lápiz/)).toBeInTheDocument();
  });

  it('prefers the name the user gave, then the announced one, then the maker', () => {
    expect(deviceName({ ...phone, label: 'Tablet niños' }, 0)).toBe('Tablet niños');
    expect(deviceName({ ...phone, hostname: 'Galaxy-Tab' }, 0)).toBe('Galaxy-Tab');
    expect(deviceName({ ...phone, privateMac: false, vendor: 'Sony' }, 0)).toBe('Equipo Sony');
    expect(deviceName({ ...phone, privateMac: false }, 4)).toBe('Equipo 5');
    expect(deviceIcon(phone)).toBe('phone');
    const unknown = { ...phone, id: 'd'.repeat(24), privateMac: false };
    expect(deviceNames([reporting.devices[0], phone, unknown, { ...phone, id: 'e'.repeat(24) }, unknown]))
      .toEqual(['router-sala', 'Celular o tableta 1', 'Equipo 1', 'Celular o tableta 2', 'Equipo 2']);
    expect(deviceIcon({ ...phone, privateMac: false })).toBe('devices');
  });
});

const channel: AgentChannel = {
  band: '2.4', currentChannel: 6, currentLoad: 4, recommendedChannel: 11, recommendedLoad: 0, shouldChange: true,
  summary: 'Tu router usa el canal 6 y ahí interfieren 4 redes vecinas.',
  action: 'Entra a la configuración del router, busca Wi-Fi 2.4 GHz → Canal y elige 11.',
  options: [{ channel: 1, networks: 0, load: 0.4 }, { channel: 6, networks: 4, load: 4.4 }, { channel: 11, networks: 0, load: 0 }],
  modelVersion: 'channel-1.0',
};

describe('Best Wi-Fi channel', () => {
  it('recommends a calmer channel, shows how crowded each one is and how to change it', async () => {
    const withChannel = { ...reporting, latest: { ...reporting.latest!, details: { ...reporting.latest!.details, channel } } };
    vi.mocked(api.myAgent).mockResolvedValue(withChannel);
    render(<AgentPanel network={casa} />);

    const card = (await screen.findByRole('heading', { name: /Mejor canal Wi-Fi/ })).closest('section')!;
    expect(within(card).getByText('Cambia al canal 11')).toBeInTheDocument();
    expect(within(card).getByText(channel.summary)).toBeInTheDocument();
    expect(within(card).getByText(/elige 11/)).toBeInTheDocument();
    const options = within(card).getByRole('list', { name: /Interferencia por canal en 2.4 GHz/ });
    expect(within(options).getAllByRole('listitem')).toHaveLength(3);
    expect(within(options).getByText(/4 redes · el tuyo/)).toBeInTheDocument();
    expect(within(options).getByText('libre')).toBeInTheDocument();
    expect(within(options).getByText('solo redes encimadas')).toBeInTheDocument();
  });

  it('says the channel is fine when there is no reason to move', async () => {
    const fine = { ...channel, shouldChange: false, recommendedChannel: 6, action: null, summary: 'Tu router ya está en un buen canal (6).' };
    vi.mocked(api.myAgent).mockResolvedValue({ ...reporting, latest: { ...reporting.latest!, details: { ...reporting.latest!.details, channel: fine } } });
    render(<AgentPanel network={casa} />);

    expect(await screen.findByText('Canal 6: bien')).toBeInTheDocument();
    expect(screen.queryByText(/Cambia al canal/)).not.toBeInTheDocument();
  });

  it('is not shown for older agents that do not send the neighbours', async () => {
    vi.mocked(api.myAgent).mockResolvedValue(reporting);
    render(<AgentPanel network={casa} />);

    expect(await screen.findByText('Celular de Ana')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Mejor canal Wi-Fi/ })).not.toBeInTheDocument();
  });
});

