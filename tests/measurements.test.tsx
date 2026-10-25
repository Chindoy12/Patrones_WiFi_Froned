import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../src/auth/AuthContext';
import { MeasurementsPage, ProtocolGauges } from '../src/pages/MeasurementsPage';
import { api } from '../src/services/api';
import type { ProtocolStatistic } from '../src/types';

vi.mock('../src/services/api', () => ({ api: { networks: vi.fn(), measurements: vi.fn(), protocols: vi.fn(), collect: vi.fn() } }));
vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));

const period = { periodStart: '2026-10-23T19:30:00Z', periodEnd: '2026-10-23T19:35:00Z' };
const traffic: ProtocolStatistic[] = [
  { protocol: 'ICMP', packetCount: 4, ...period },
  { protocol: 'UDP', packetCount: 972, ...period },
  { protocol: 'TCP', packetCount: 24, ...period },
];

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 1, username: 'equipo', role: 'VIEWER' }, ready: true, login: vi.fn(), register: vi.fn(), renew: vi.fn(),
    logout: vi.fn(), can: () => false,
  });
  vi.mocked(api.networks).mockResolvedValue([{ id: 7, ssid: 'WIFI_UCC_ESTUDIANTES', zoneName: 'Biblioteca', dataSourceType: 'AGENT' } as never]);
  vi.mocked(api.measurements).mockResolvedValue([]);
  vi.mocked(api.protocols).mockResolvedValue(traffic);
});

describe('Protocolos', () => {
  it('draws each share with the same round gauge as latency, largest first', () => {
    const { container } = render(<ProtocolGauges rows={traffic} />);

    const gauges = screen.getAllByRole('img');
    expect(gauges.map((g) => g.getAttribute('aria-label'))).toEqual([
      'UDP: 97,2 %, 972 paquetes',
      'TCP: 2,4 %, 24 paquetes',
      'ICMP: 0,4 %, 4 paquetes',
    ]);
    gauges.forEach((g) => expect(g).toHaveClass('gauge', 'gauge--sm', 'gauge--share'));
    expect(container.querySelector('.share-list')).toBeNull();
    expect(screen.getByText('1.000 paquetes en total.')).toBeInTheDocument();
  });

  it('shows an empty gauge, not a division by zero, when there were no packets', () => {
    render(<ProtocolGauges rows={[{ protocol: 'TCP', packetCount: 0, ...period }]} />);

    expect(screen.getByRole('img', { name: 'TCP: 0 %, 0 paquetes' })).toBeInTheDocument();
  });

  it('replaces the bars of the page with the gauges of the selected network', async () => {
    render(<MemoryRouter><MeasurementsPage /></MemoryRouter>);

    const panel = (await screen.findByRole('heading', { name: 'Protocolos (último periodo)' })).closest('section')!;
    expect(await within(panel).findByRole('img', { name: /^UDP: 97,2 %/ })).toBeInTheDocument();
    expect(api.protocols).toHaveBeenCalledWith(7);
  });
});
