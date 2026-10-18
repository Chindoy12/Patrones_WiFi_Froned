import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../src/auth/AuthContext';
import { sensorBadge } from '../src/components/SensorPanel';
import { NetworksPage } from '../src/pages/NetworksPage';
import { api } from '../src/services/api';
import type { Network, Role, SensorStatus } from '../src/types';

vi.mock('../src/services/api', () => ({
  api: {
    networks: vi.fn(), deleteNetwork: vi.fn(), createNetwork: vi.fn(), locations: vi.fn(), zones: vi.fn(),
    createLocation: vi.fn(), createZone: vi.fn(), networkSources: vi.fn(), sensor: vi.fn(), sensorPairing: vi.fn(),
    removeSensor: vi.fn(),
  },
}));
vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));

function signedInAs(role: Role) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 1, username: 'equipo', role }, ready: true, login: vi.fn(), register: vi.fn(), renew: vi.fn(),
    logout: vi.fn(), can: (...roles) => roles.includes(role),
  });
}

const lab: Network = {
  id: 7, ssid: 'Lab-Redes', bssid: 'A4:2B:B0:10:00:05', frequencyBand: '5GHz', channel: 36, securityType: 'WPA2',
  status: 'NORMAL', dataSourceType: 'AGENT', zoneId: 3, zoneName: 'Laboratorio', locationName: 'Universidad',
  lastCollectedAt: '2026-10-18T10:00:00Z',
};
const none: SensorStatus = {
  installed: false, online: false, keyPrefix: null, installedAt: null, lastSeenAt: null, agentVersion: null,
  platform: null, pendingCodeExpiresAt: null,
};
const online: SensorStatus = {
  installed: true, online: true, keyPrefix: 'wsa_AbC1', installedAt: '2026-10-17T10:00:00Z',
  lastSeenAt: '2026-10-18T10:00:00Z', agentVersion: '1.4.0', platform: 'Windows', pendingCodeExpiresAt: null,
};

const renderPage = () => render(<MemoryRouter><NetworksPage /></MemoryRouter>);

beforeEach(() => {
  signedInAs('ADMIN');
  for (const fn of Object.values(api)) vi.mocked(fn as () => unknown).mockReset();
  vi.mocked(api.networks).mockResolvedValue([]);
  vi.mocked(api.locations).mockResolvedValue([]);
  vi.mocked(api.zones).mockResolvedValue([]);
  vi.mocked(api.networkSources).mockResolvedValue(['AGENT']);
  vi.mocked(api.sensor).mockResolvedValue(none);
});

describe('Redes del equipo con sensor', () => {
  it('starts empty and tells the admin how to begin', async () => {
    renderPage();

    expect(await screen.findByText(/Todavía no hay redes\. Pulsa «Registrar red»/)).toBeInTheDocument();
  });

  it('registers the first network creating its location and zone, then opens its sensor', async () => {
    vi.mocked(api.createLocation).mockResolvedValue({ id: 1, name: 'Universidad', address: null, city: 'Pasto' });
    vi.mocked(api.createZone).mockResolvedValue({ id: 3, locationId: 1, locationName: 'Universidad', name: 'Laboratorio', floor: 2 });
    vi.mocked(api.createNetwork).mockResolvedValue(lab);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Registrar red' }));
    const form = await screen.findByRole('form', { name: 'Registrar red' });
    await userEvent.type(within(form).getByLabelText('Nombre de la sede'), 'Universidad');
    await userEvent.type(within(form).getByLabelText('Ciudad'), 'Pasto');
    await userEvent.type(within(form).getByLabelText('Nombre de la zona'), 'Laboratorio');
    await userEvent.type(within(form).getByLabelText('Piso (opcional)'), '2');
    await userEvent.type(within(form).getByLabelText('SSID (nombre de la red)'), 'Lab-Redes');
    await userEvent.type(within(form).getByLabelText('BSSID (dirección del router)'), 'A4:2B:B0:10:00:05');
    // only the sensor is offered: no simulated networks
    expect(within(form).getByLabelText('Fuente de datos')).toBeDisabled();
    expect(within(form).queryByText(/Simulación/)).not.toBeInTheDocument();
    vi.mocked(api.networks).mockResolvedValue([lab]);
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar red' }));

    expect(api.createLocation).toHaveBeenCalledWith({ name: 'Universidad', city: 'Pasto' });
    expect(api.createZone).toHaveBeenCalledWith(1, { name: 'Laboratorio', floor: 2 });
    expect(api.createNetwork).toHaveBeenCalledWith(expect.objectContaining({ zoneId: 3, ssid: 'Lab-Redes',
      dataSourceType: 'AGENT' }));
    expect(await screen.findByRole('region', { name: 'Sensor de Lab-Redes' })).toBeInTheDocument();
    expect(screen.getByText(/todavía no tiene sensor/)).toBeInTheDocument();
  });

  it('connects the sensor with a code and the installer of the agent', async () => {
    vi.mocked(api.networks).mockResolvedValue([lab]);
    vi.mocked(api.sensorPairing).mockResolvedValue({ code: 'K7QM-4RZD', expiresAt: new Date(Date.now() + 900_000).toISOString() });
    renderPage();

    const row = (await screen.findByText('Lab-Redes')).closest('tr')!;
    expect(await within(row).findByText('Sin sensor')).toBeInTheDocument();
    await userEvent.click(within(row).getByRole('button', { name: 'Sensor' }));
    await userEvent.click(await screen.findByRole('button', { name: /Conectar sensor/ }));

    const pairing = await screen.findByRole('region', { name: 'Instalar el sensor' });
    expect(within(pairing).getByText('K7QM-4RZD')).toBeInTheDocument();
    expect(within(pairing).getByRole('link', { name: /descarga el instalador/ })).toHaveAttribute('href',
      expect.stringContaining('WiFiSenseAgente.exe'));
    expect(api.sensorPairing).toHaveBeenCalledWith(7);
  });

  it('shows a connected sensor and only an admin can remove it', async () => {
    vi.mocked(api.networks).mockResolvedValue([lab]);
    vi.mocked(api.sensor).mockResolvedValue(online);
    signedInAs('VIEWER');
    renderPage();

    const row = (await screen.findByText('Lab-Redes')).closest('tr')!;
    expect(await within(row).findByText('Conectado')).toBeInTheDocument();
    await userEvent.click(within(row).getByRole('button', { name: 'Sensor' }));
    const panel = await screen.findByRole('region', { name: 'Sensor de Lab-Redes' });
    await waitFor(() => expect(within(panel).getByText(/1\.4\.0 · Windows/)).toBeInTheDocument());
    expect(within(panel).queryByRole('button', { name: /Quitar sensor|Conectar sensor|Reinstalar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar red' })).not.toBeInTheDocument();
  });

  it('says how long a sensor has been quiet', () => {
    const now = new Date('2026-10-18T12:00:00Z');
    expect(sensorBadge({ ...online, online: false, lastSeenAt: '2026-10-18T11:20:00Z' }, now))
      .toEqual({ label: 'Sin reportes hace 40 min', tone: 'bad' });
    expect(sensorBadge({ ...online, online: false, lastSeenAt: '2026-10-16T12:00:00Z' }, now).label)
      .toBe('Sin reportes hace 2 días');
    expect(sensorBadge({ ...none, pendingCodeExpiresAt: '2026-10-18T12:10:00Z' }, now).label)
      .toBe('Esperando instalación');
  });
});
