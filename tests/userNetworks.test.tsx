import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../src/auth/AuthContext';
import { UserNetworksPage } from '../src/pages/UserNetworksPage';
import { api } from '../src/services/api';
import type { Role, TeamNetworkRow, TeamNetworks } from '../src/types';

vi.mock('../src/services/api', () => ({ api: { teamNetworks: vi.fn() } }));
vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));

function signedInAs(role: Role) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 1, username: 'equipo', role }, ready: true, login: vi.fn(), register: vi.fn(), renew: vi.fn(),
    logout: vi.fn(), can: (...roles) => roles.includes(role),
  });
}

const base: TeamNetworkRow = {
  id: 1, name: 'Casa Ana', owner: 'an•••@gmail.com', provider: 'Claro', contractedMbps: 300,
  createdAt: '2026-10-01T12:00:00Z', hasAgent: true, agentOnline: true, lastReportAt: '2026-10-17T14:58:00Z',
  agentVersion: '1.3.0', deviceCount: 5, securityScore: 92, securityGrade: 'SECURE', qualityScore: 88,
  anomalyDetected: false, anomalyType: 'NONE', band: '2.4', channel: 6, recommendedChannel: 11,
  channelChangeSuggested: true, needsAttention: false,
};
const risky: TeamNetworkRow = {
  ...base, id: 2, name: 'Apto Carlos', owner: 'ca•••', agentOnline: false, securityScore: 45, securityGrade: 'AT_RISK',
  anomalyDetected: true, anomalyType: 'CONGESTION', channelChangeSuggested: false, channel: 36, band: '5',
  needsAttention: true,
};
const noAgent: TeamNetworkRow = {
  ...base, id: 3, name: 'Finca', owner: 'a•••', hasAgent: false, agentOnline: false, lastReportAt: null,
  agentVersion: null, deviceCount: null, securityScore: null, securityGrade: null, qualityScore: null,
  anomalyDetected: null, anomalyType: null, band: null, channel: null, recommendedChannel: null,
  channelChangeSuggested: false,
};
const data: TeamNetworks = {
  totals: { endUsers: 4, networks: 3, withAgent: 2, agentsOnline: 1, atRisk: 1, anomaliesLast24h: 1, devices: 7 },
  networks: [risky, base, noAgent], generatedAt: '2026-10-17T15:00:00Z',
};

const renderPage = () => render(<MemoryRouter><UserNetworksPage /></MemoryRouter>);

beforeEach(() => {
  signedInAs('ANALYST');
  vi.mocked(api.teamNetworks).mockReset().mockResolvedValue(data);
});

describe('Redes de usuarios (panel del equipo con datos reales)', () => {
  it('shows the totals and one row per real network, problems first', async () => {
    renderPage();

    expect(await screen.findByText('Usuarios registrados')).toBeInTheDocument();
    expect(screen.getByText('de 2 instalados')).toBeInTheDocument();
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('cell')[0].querySelector('strong')!.textContent))
      .toEqual(['Apto Carlos', 'Casa Ana', 'Finca']);
    expect(within(rows[0]).getByText('Revisar')).toBeInTheDocument();
    expect(within(rows[0]).getByText(/En riesgo · 45/)).toBeInTheDocument();
    expect(within(rows[0]).getByText(/Congestión/)).toBeInTheDocument();
  });

  it('shows the agent state and the suggested channel change', async () => {
    renderPage();

    const ana = (await screen.findByText('Casa Ana')).closest('tr')!;
    expect(within(ana).getByText('Conectado')).toBeInTheDocument();
    expect(within(ana).getByText('6 → 11 (2.4 GHz)')).toBeInTheDocument();
    const finca = screen.getByText('Finca').closest('tr')!;
    expect(within(finca).getByText('Sin agente')).toBeInTheDocument();
  });

  it('filters to the networks that need attention', async () => {
    renderPage();

    await userEvent.click(await screen.findByRole('checkbox', { name: /Solo las que necesitan atención/ }));

    expect(screen.getByText('Apto Carlos')).toBeInTheDocument();
    expect(screen.queryByText('Casa Ana')).not.toBeInTheDocument();
  });

  it('never shows anything about the users\' devices and tells an analyst the owner is masked', async () => {
    const { container } = renderPage();

    expect(await screen.findByText(/Por privacidad no se muestra nada de sus equipos/)).toHaveTextContent('enmascarado');
    expect(screen.getByText('an•••@gmail.com')).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/iPhone|hostname|MAC/);
  });

  it('an administrator is not told about masking', async () => {
    signedInAs('ADMIN');
    renderPage();

    expect(await screen.findByText(/Por privacidad/)).not.toHaveTextContent('enmascarado');
  });

  it('says so when nobody registered a network yet', async () => {
    vi.mocked(api.teamNetworks).mockResolvedValue({ ...data, networks: [],
      totals: { ...data.totals, networks: 0, withAgent: 0, agentsOnline: 0 } });
    renderPage();

    expect(await screen.findByText('Todavía ningún usuario ha registrado una red.')).toBeInTheDocument();
  });
});
