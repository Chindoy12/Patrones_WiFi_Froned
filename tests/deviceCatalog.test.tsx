import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DeviceCatalog, PAGE_SIZE } from '../src/components/DeviceCatalog';
import type { AgentDevice } from '../src/types';

const DAY = 86_400_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
let n = 0;
function device(extra: Partial<AgentDevice> = {}): AgentDevice {
  n += 1;
  return {
    id: String(n).padStart(24, '0'), label: null, vendor: null, hostname: null, privateMac: true, authorized: true,
    firstSeenAt: ago(30 * DAY), lastSeenAt: ago(DAY), online: false, recent: false, ...extra,
  };
}

function renderCatalog(devices: AgentDevice[], search = '') {
  return render(
    <MemoryRouter initialEntries={[`/mi-wifi/equipos${search}`]}>
      <DeviceCatalog devices={devices} onChange={vi.fn()} updateDevice={vi.fn()} />
    </MemoryRouter>,
  );
}

describe('Equipos por categoría', () => {
  const home = [
    device({ role: 'SELF', kind: 'COMPUTER', hostname: 'DESKTOP-D62JTJ8', privateMac: false, online: true }),
    device({ role: 'ROUTER', privateMac: false, online: true }),
    device({ hostname: 'Android-84', online: true }),
    device({ kind: 'TV', label: 'TV sala', privateMac: false }),
    ...Array.from({ length: 4 }, () => device({ lastSeenAt: ago(20 * DAY) })),
  ];

  it('shows a card for each kind of device instead of one long list', () => {
    renderCatalog(home);

    expect(screen.getByText(/8/, { selector: '.catalog__totals strong' })).toBeInTheDocument();
    const cards = screen.getByRole('list', { name: 'Categorías de equipos' });
    expect(within(cards).getByRole('link', { name: 'Computadores: 1, 1 conectado' })).toBeInTheDocument();
    expect(within(cards).getByRole('link', { name: 'Celulares y tabletas: 5, 1 conectado' })).toBeInTheDocument();
    expect(within(cards).getByRole('link', { name: 'TV y entretenimiento: 1, 0 conectados' })).toBeInTheDocument();
    expect(within(cards).getByRole('link', { name: 'Router y otros equipos: 1, 1 conectado' })).toBeInTheDocument();
    // an empty category is shown, but it is not a link
    expect(within(cards).getByText('Casa inteligente e impresoras').closest('a')).toBeNull();
    expect(document.querySelectorAll('.devrow')).toHaveLength(0);
  });

  it('pressing a card opens that category on its own screen, and the back link returns to the cards', async () => {
    renderCatalog(home);

    await userEvent.click(screen.getByRole('link', { name: /Celulares y tabletas/ }));

    expect(screen.getByRole('heading', { name: /Celulares y tabletas/ })).toBeInTheDocument();
    expect(screen.getByText('Android-84')).toBeInTheDocument();
    expect(screen.queryByText('DESKTOP-D62JTJ8')).not.toBeInTheDocument();  // computers live elsewhere
    await userEvent.click(screen.getByRole('link', { name: '← Todas las categorías' }));
    expect(screen.getByRole('list', { name: 'Categorías de equipos' })).toBeInTheDocument();
  });

  it('inside a category: connected first, then this week, and the old ones folded', async () => {
    renderCatalog([
      device({ hostname: 'Android-1', online: true }),
      device({ hostname: 'Android-2', lastSeenAt: ago(2 * DAY) }),
      device({ hostname: 'Android-3', lastSeenAt: ago(40 * DAY) }),
    ], '?tipo=celulares');

    const titles = [...document.querySelectorAll('.catgroup__title')].map((h) => h.textContent);
    expect(titles).toEqual(['Conectados ahora 1', 'Vistos en los últimos 7 días 1', 'Vistos antes 1']);
    expect(screen.queryByText('Android-3')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar el equipo visto antes' }));
    expect(screen.getByText('Android-3')).toBeInTheDocument();
  });

  it('shows 30 at a time, so 700 devices never appear at once', async () => {
    const many = Array.from({ length: PAGE_SIZE + 15 }, () => device({ lastSeenAt: ago(DAY) }));
    renderCatalog(many, '?tipo=celulares');

    expect(document.querySelectorAll('.devrow')).toHaveLength(PAGE_SIZE);
    await userEvent.click(screen.getByRole('button', { name: /Mostrar 15 más/ }));
    expect(document.querySelectorAll('.devrow')).toHaveLength(PAGE_SIZE + 15);
    expect(screen.queryByRole('button', { name: /Mostrar .* más/ })).not.toBeInTheDocument();
  });

  it('a search also finds the old ones, without unfolding them by hand', async () => {
    renderCatalog([
      ...Array.from({ length: 8 }, () => device({ online: true })),
      device({ label: 'Tablet de Sofía', lastSeenAt: ago(40 * DAY) }),
    ], '?tipo=celulares');

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar equipo' }), 'sofía');

    expect(screen.getByText('Tablet de Sofía')).toBeInTheDocument();
    expect(document.querySelectorAll('.devrow')).toHaveLength(1);
  });

  it('a category that does not exist says so and shows the cards', () => {
    renderCatalog(home, '?tipo=neveras');

    expect(screen.getByRole('status')).toHaveTextContent('Esa categoría no existe');
    expect(screen.getByRole('list', { name: 'Categorías de equipos' })).toBeInTheDocument();
  });
});
