import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeviceList, deviceNames } from '../src/components/AgentPanel';
import { hasOwnName, visibleDevices } from '../src/components/DeviceFilters';
import type { AgentDevice } from '../src/types';

function device(id: string, extra: Partial<AgentDevice> = {}): AgentDevice {
  return {
    id: id.repeat(24).slice(0, 24), label: null, vendor: null, hostname: null, privateMac: true, authorized: true,
    firstSeenAt: '2026-10-26T13:00:00Z', lastSeenAt: '2026-10-26T19:00:00Z', online: true, recent: false, ...extra,
  };
}

// A university network: the sensor itself, two phones that said their name, many that did not, one that left.
const devices = [
  device('a'), device('b'),
  device('c', { hostname: 'iPhone-6' }),
  device('d', { online: false, lastSeenAt: '2026-10-26T15:00:00Z' }),
  device('e', { role: 'SELF', kind: 'COMPUTER', hostname: 'DESKTOP-D62JTJ8', privateMac: false }),
  device('f', { label: 'Celular de Juan' }),
  device('g'), device('h'), device('i'),
];

describe('Lista de equipos', () => {
  it('a device has a name when the user or the device gave it, or its maker is known, not a number we made up', () => {
    expect(hasOwnName(device('x', { hostname: 'Android-3' }))).toBe(true);
    expect(hasOwnName(device('x', { label: 'TV sala' }))).toBe(true);
    expect(hasOwnName(device('x', { vendor: 'Epson', kind: 'PRINTER' }))).toBe(true);  // "Impresora Epson"
    expect(hasOwnName(device('x'))).toBe(false);
  });

  it('shows this computer first, then the connected devices with a name, the rest, and the ones that left', () => {
    const names = deviceNames(devices);
    const order = visibleDevices(devices, names, 'all', '').map((i) => names[i]);

    expect(order[0]).toBe('DESKTOP-D62JTJ8');
    expect(order.slice(1, 3)).toEqual(['iPhone-6', 'Celular de Juan']);
    expect(order.at(-1)).toBe('Celular o tableta 3');  // the one that left keeps its number and goes last
  });

  it('filters the connected ones, the ones without a name and by what is typed', () => {
    const names = deviceNames(devices);

    expect(visibleDevices(devices, names, 'online', '')).toHaveLength(8);
    expect(visibleDevices(devices, names, 'unnamed', '').map((i) => names[i]))
      .toEqual(['Celular o tableta 1', 'Celular o tableta 2', 'Celular o tableta 4', 'Celular o tableta 5',
        'Celular o tableta 6', 'Celular o tableta 3']);
    expect(visibleDevices(devices, names, 'all', 'juan').map((i) => names[i])).toEqual(['Celular de Juan']);
  });

  it('says how many have no name, why, and how to name them', async () => {
    render(<DeviceList devices={devices} onChange={vi.fn()} updateDevice={vi.fn()} team />);

    expect(screen.getByRole('button', { name: 'Sin nombre 6' })).toBeInTheDocument();
    expect(screen.getByText(/6 equipos no dicen su nombre/)).toHaveTextContent('muchas redes de universidades');

    await userEvent.click(screen.getByRole('button', { name: 'Sin nombre 6' }));
    const list = document.querySelector('.devlist') as HTMLElement;
    expect(within(list).queryByText('iPhone-6')).not.toBeInTheDocument();
    expect(within(list).getAllByRole('listitem')).toHaveLength(6);

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar equipo' }), 'nada así');
    expect(screen.getByText('Ningún equipo coincide con lo que buscas.')).toBeInTheDocument();
  });

  it('offers to name a device that has none, right on its row', async () => {
    const updateDevice = vi.fn().mockResolvedValue({});
    render(<DeviceList devices={[device('a')]} onChange={vi.fn()} updateDevice={updateDevice} team />);

    await userEvent.click(screen.getByRole('button', { name: 'Ponerle nombre' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Nombre del equipo' }), 'Celular de Juan{Enter}');

    expect(updateDevice).toHaveBeenCalledWith('a'.repeat(24), { label: 'Celular de Juan' });
  });
});
