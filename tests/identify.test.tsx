import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { deviceIcon, deviceMaker, deviceName, deviceNames } from '../src/components/AgentPanel';
import { goneDevices, IdentifyWizard, onlineIds } from '../src/components/IdentifyWizard';
import { ApiError } from '../src/services/apiClient';
import type { AgentDevice } from '../src/types';

const device = (id: string, extra: Partial<AgentDevice> = {}): AgentDevice => ({
  id: id.repeat(24), label: null, vendor: null, hostname: null, privateMac: false, authorized: true,
  firstSeenAt: '2026-10-19T10:00:00Z', lastSeenAt: '2026-10-19T15:00:00Z', online: true, recent: false, ...extra,
});

describe('Reconocer los equipos', () => {
  it('names a device by what it announces, its model or its kind', () => {
    expect(deviceName(device('a', { kind: 'PHONE', hostname: 'iPhone de Ana' }), 0)).toBe('iPhone de Ana');
    expect(deviceName(device('a', { kind: 'TV', vendor: 'Google', model: 'Chromecast' }), 0)).toBe('Google Chromecast');
    expect(deviceName(device('a', { kind: 'PRINTER', vendor: 'Epson' }), 0)).toBe('Impresora Epson');
    expect(deviceName(device('a', { role: 'ROUTER', vendor: 'TP-Link' }), 0)).toBe('Router');
    expect(deviceName(device('a', { role: 'SELF', kind: 'COMPUTER' }), 0)).toBe('Este computador');
    expect(deviceNames([device('a', { privateMac: true }), device('b', { kind: 'PHONE' }), device('c', { kind: 'TV' }),
      device('d')])).toEqual(['Celular o tableta 1', 'Celular o tableta 2', 'TV o Chromecast 1', 'Equipo 1']);
  });

  it('shows the kind, model and maker that the name does not already say', () => {
    expect(deviceMaker(device('a', { kind: 'PHONE', model: 'iPhone15,2', privateMac: true }), 'iPhone de Ana'))
      .toBe('Parece celular o tableta · iPhone15,2 · Dirección privada');
    expect(deviceMaker(device('a', { kind: 'TV', vendor: 'Google', model: 'Chromecast' }), 'Google Chromecast'))
      .toBe('Parece TV o Chromecast');
    expect(deviceIcon(device('a', { role: 'ROUTER' }))).toBe('router');
    expect(deviceIcon(device('a', { kind: 'CAMERA' }))).toBe('camera');
  });

  it('leaves the computer of the agent and the router out of the comparison', () => {
    const list = [device('a'), device('b', { role: 'SELF' }), device('c', { role: 'ROUTER' }), device('d', { online: false })];
    expect(onlineIds(list)).toEqual(['a'.repeat(24)]);
    expect(goneDevices(['a'.repeat(24), 'd'.repeat(24)], [device('a', { online: false })])).toEqual(['a'.repeat(24), 'd'.repeat(24)]);
  });
});

describe('¿Cuál es este equipo?', () => {
  const until = new Date(Date.now() + 9 * 60_000).toISOString();
  const started = new Date(Date.now() - 60_000).getTime();
  const at = (minutes: number) => new Date(started + minutes * 60_000).toISOString();
  const phone = (online: boolean) => device('a', { privateMac: true, online });
  const laptop = device('b', { vendor: 'Lenovo', kind: 'COMPUTER' });
  const agent = device('c', { role: 'SELF', kind: 'COMPUTER' });

  it('finds the device whose Wi-Fi was turned off and names it', async () => {
    const start = vi.fn().mockResolvedValue({ identifyUntil: until, reportSeconds: 60 });
    const rename = vi.fn().mockResolvedValue(undefined);
    const props = { start, rename, reload: vi.fn(), team: false, onClose: vi.fn() };
    const names = ['Celular o tableta 1', 'Computador Lenovo', 'Este computador'];
    const { rerender } = render(<IdentifyWizard {...props} devices={[phone(true), laptop, agent]} names={names}
                                                latestAt={at(-3)} />);

    expect(await screen.findByText(/puede tardar hasta 5 minutos/)).toBeInTheDocument();
    expect(start).toHaveBeenCalledTimes(1);

    // the first report after starting: the agent now reports every minute
    rerender(<IdentifyWizard {...props} devices={[phone(true), laptop, agent]} names={names} latestAt={at(1)} />);
    expect(await screen.findByText(/Ahora hay 2 equipos conectados/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ya lo apagué' }));
    expect(screen.getByText(/0 de 3 reportes/)).toBeInTheDocument();

    rerender(<IdentifyWizard {...props} devices={[phone(false), laptop, agent]} names={names} latestAt={at(2)} />);
    expect(await screen.findByText('«Celular o tableta 1»')).toBeInTheDocument();
    expect(screen.getByText(/Vuelve a encender su Wi-Fi/)).toBeInTheDocument();

    rerender(<IdentifyWizard {...props} devices={[phone(true), laptop, agent]} names={names} latestAt={at(3)} />);
    expect(await screen.findByText(/Volvió a conectarse/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Ponle un nombre'), 'Celular de Jaider');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar nombre' }));

    expect(rename).toHaveBeenCalledWith('a'.repeat(24), 'Celular de Jaider');
    expect(await screen.findByText('Guardado: ahora se llama «Celular de Jaider».')).toBeInTheDocument();
  });

  it('says so when nothing disappeared after three reports', async () => {
    const props = { start: vi.fn().mockResolvedValue({ identifyUntil: until, reportSeconds: 60 }), rename: vi.fn(),
      reload: vi.fn(), team: true, onClose: vi.fn(), names: ['A', 'B', 'C'] };
    const list = [phone(true), laptop, agent];
    const { rerender } = render(<IdentifyWizard {...props} devices={list} latestAt={at(-3)} />);
    await screen.findByText(/Pidiendo al sensor/);
    rerender(<IdentifyWizard {...props} devices={list} latestAt={at(1)} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Ya lo apagué' }));
    for (const minute of [2, 3, 4]) {
      await act(async () => {
        rerender(<IdentifyWizard {...props} devices={[...list]} latestAt={at(minute)} />);
      });
    }
    expect(await screen.findByText(/No vimos desaparecer ningún equipo/)).toBeInTheDocument();
  });

  it('explains why it cannot start', async () => {
    const props = { start: vi.fn().mockRejectedValue(new ApiError(409, 'Esta red aún no tiene el agente instalado.')),
      rename: vi.fn(), reload: vi.fn(), team: false, onClose: vi.fn(), names: [] };
    render(<IdentifyWizard {...props} devices={[]} latestAt={null} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta red aún no tiene el agente instalado.');
  });
});
