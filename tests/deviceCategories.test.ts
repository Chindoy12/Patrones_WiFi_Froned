import { describe, expect, it } from 'vitest';
import { deviceCategory, recency, summarize } from '../src/components/deviceCategories';
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

describe('Categorías de equipos', () => {
  it('puts each device where its icon says: computers, phones, entertainment, smart home or router and others', () => {
    expect(deviceCategory(device({ role: 'SELF', kind: 'COMPUTER', privateMac: false }))).toBe('computadores');
    expect(deviceCategory(device({ hostname: 'MacBook-de-Ana', privateMac: false }))).toBe('computadores');
    expect(deviceCategory(device())).toBe('celulares');  // a private address is a phone or a tablet
    expect(deviceCategory(device({ hostname: 'Android-84' }))).toBe('celulares');
    expect(deviceCategory(device({ kind: 'TV', privateMac: false }))).toBe('entretenimiento');
    expect(deviceCategory(device({ kind: 'CONSOLE', privateMac: false }))).toBe('entretenimiento');
    expect(deviceCategory(device({ kind: 'SPEAKER', privateMac: false }))).toBe('entretenimiento');
    expect(deviceCategory(device({ kind: 'PRINTER', vendor: 'Epson', privateMac: false }))).toBe('hogar');
    expect(deviceCategory(device({ kind: 'CAMERA', privateMac: false }))).toBe('hogar');
    expect(deviceCategory(device({ kind: 'IOT', vendor: 'Espressif', privateMac: false }))).toBe('hogar');
    expect(deviceCategory(device({ role: 'ROUTER', hostname: 'router-sala', privateMac: false }))).toBe('otros');
    expect(deviceCategory(device({ vendor: 'Intel', privateMac: false }))).toBe('otros');
  });

  it('counts each category: total, connected, without a name, new and not authorized', () => {
    const summary = summarize([
      device({ online: true }), device({ hostname: 'Android-3', recent: true, online: true }),
      device({ authorized: false }), device({ kind: 'TV', privateMac: false, label: 'TV sala' }),
    ]);
    expect(summary.celulares).toEqual({ total: 3, online: 2, unnamed: 2, fresh: 1, blocked: 1 });
    expect(summary.entretenimiento).toEqual({ total: 1, online: 0, unnamed: 0, fresh: 0, blocked: 0 });
    expect(summary.computadores.total).toBe(0);
  });

  it('a device is connected now, seen this week or seen before', () => {
    const now = new Date();
    expect(recency(device({ online: true, lastSeenAt: ago(30 * DAY) }), now)).toBe('online');
    expect(recency(device({ lastSeenAt: ago(6 * DAY) }), now)).toBe('week');
    expect(recency(device({ lastSeenAt: ago(8 * DAY) }), now)).toBe('older');
  });
});
