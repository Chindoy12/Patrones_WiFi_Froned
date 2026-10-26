import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { AgentDevice } from '../types';

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

/**
 * Summary and filters above a long list of devices: how many there are, how many are connected and how many have no
 * name, with the reason in words (most phones do not say their name, and some networks do not let us ask).
 */
export function DeviceFilters({ devices, view, onView, query, onQuery, team, actions }: {
  devices: AgentDevice[]; view: DeviceView; onView: (view: DeviceView) => void; query: string;
  onQuery: (query: string) => void; team: boolean;
  /** Buttons that act on the list ("¿Cuál es este equipo?"), shown with the filters. */
  actions?: ReactNode;
}) {
  const online = devices.filter((d) => d.online).length;
  const unnamed = devices.filter((d) => !hasOwnName(d)).length;
  const views: { id: DeviceView; label: string; count: number }[] = [
    { id: 'all', label: 'Todos', count: devices.length },
    { id: 'online', label: 'Conectados', count: online },
    { id: 'unnamed', label: 'Sin nombre', count: unnamed },
  ];
  return (
    <div className="devfilters">
      <div className="devfilters__bar">
        <div className="segmented" role="group" aria-label="Qué equipos mostrar">
          {views.map((v) => (
            <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => onView(v.id)}>
              {v.label} <span className="devfilters__count">{v.count}</span>
            </button>
          ))}
        </div>
        {actions}
        {devices.length >= 8 && (
          <label className="devfilters__search">
            <Icon name="search" size={16} />
            <input type="search" placeholder="Buscar por nombre o marca" value={query} aria-label="Buscar equipo"
                   onChange={(e) => onQuery(e.target.value)} />
          </label>
        )}
      </div>
      {unnamed > 0 && (
        <p className="devfilters__why muted">
          {unnamed === 1 ? '1 equipo no dice su nombre' : `${unnamed} equipos no dicen su nombre`}: los celulares con
          dirección privada no lo anuncian y {team ? 'muchas redes de universidades' : 'algunos routers'} no dejan
          preguntarlo. Nómbralos con «¿Cuál es este equipo?» o con el lápiz; el nombre queda guardado.
        </p>
      )}
    </div>
  );
}
