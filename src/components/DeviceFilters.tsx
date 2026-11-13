import type { AgentDevice } from '../types';

// Order and search of a list of devices; each category screen of DeviceCatalog uses them (Avance 27).

export type DeviceView = 'all' | 'online' | 'unnamed';

/**
 * A device has a name when the user gave it one, the device announced it, or at least its maker or model is known
 * ("Impresora Epson"). Without any of them the page can only number it ("Celular o tableta 3").
 */
export function hasOwnName(device: AgentDevice): boolean {
  return Boolean(device.label || device.hostname || device.role || device.model || device.vendor);
}

/**
 * Order of the list: this computer and the router first, then the connected devices (named ones before the rest),
 * then the ones that left, most recent first. Equal devices keep the order the backend sent.
 */
export function deviceRank(device: AgentDevice): number {
  if (device.role === 'SELF') return 0;
  if (device.role === 'ROUTER') return 1;
  if (device.online) return hasOwnName(device) ? 2 : 3;
  return 4;
}

/** Indexes of the devices to show, in display order, for a view and a search text (name or maker). */
export function visibleDevices(devices: AgentDevice[], names: string[], view: DeviceView, query: string): number[] {
  const text = query.trim().toLowerCase();
  return devices
    .map((device, index) => ({ device, index }))
    .filter(({ device }) => view === 'all' || (view === 'online' ? device.online : !hasOwnName(device)))
    .filter(({ device, index }) => !text || `${names[index]} ${device.vendor ?? ''} ${device.model ?? ''}`
      .toLowerCase().includes(text))
    .sort((a, b) => deviceRank(a.device) - deviceRank(b.device)
      || (a.device.online ? 0 : b.device.lastSeenAt.localeCompare(a.device.lastSeenAt))
      || a.index - b.index)
    .map(({ index }) => index);
}
