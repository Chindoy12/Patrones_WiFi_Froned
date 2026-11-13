import { useState } from 'react';
import { formatDateTime } from '../format';
import type { AgentDevice, DeviceKind, DeviceSessionHistory } from '../types';
import { hasOwnName } from './DeviceFilters';
import { DeviceHistory } from './DeviceHistory';
import { IdentityTag } from './IdentityTag';
import { Icon, type IconName } from './Icon';

/**
 * One device of a network: how it is called, its icon, its second line and its row with the actions (history, rename,
 * not mine). Shared by Mi Wi-Fi, the sensor of a team network and the Devices page.
 */
export type DeviceChange = { label?: string | null; authorized?: boolean };
export type HistoryLoader = (fingerprint: string) => Promise<DeviceSessionHistory>;

/** What each kind of device is called on the page. */
export const KIND_LABELS: Record<DeviceKind, string> = {
  PHONE: 'Celular o tableta', COMPUTER: 'Computador', TV: 'TV o Chromecast', PRINTER: 'Impresora', CAMERA: 'Cámara',
  SPEAKER: 'Parlante', CONSOLE: 'Consola de juegos', IOT: 'Dispositivo inteligente',
};

const KIND_ICONS: Record<DeviceKind, IconName> = {
  PHONE: 'phone', COMPUTER: 'laptop', TV: 'tv', PRINTER: 'printer', CAMERA: 'camera', SPEAKER: 'speaker',
  CONSOLE: 'console', IOT: 'plug',
};

/** The router, the agent's own computer, then the kind the agent deduced, then a guess from the name or maker. */
export function deviceIcon(device: AgentDevice): IconName {
  if (device.role === 'ROUTER') return 'router';
  if (device.role === 'SELF') return 'laptop';
  if (device.kind) return KIND_ICONS[device.kind];
  const text = `${device.label ?? ''} ${device.hostname ?? ''} ${device.vendor ?? ''}`.toLowerCase();
  if (/iphone|galaxy|phone|redmi|moto|celular|android|pixel/.test(text)) return 'phone';
  if (/macbook|laptop|portatil|pc|desktop|windows|thinkpad|notebook/.test(text)) return 'laptop';
  if (/tv|roku|chromecast|firestick|smart.?tv|lg|samsung.?tv/.test(text)) return 'tv';
  if (/playstation|ps4|ps5|xbox|nintendo|switch/.test(text)) return 'console';
  if (/print|epson|canon|hp /.test(text)) return 'printer';
  if (/echo|alexa|speaker|sonos|home|nest/.test(text)) return 'speaker';
  return device.privateMac ? 'phone' : 'devices';
}

/** What a device without any name is called: its kind, or a phone when it hides behind a private address. */
function kindName(device: AgentDevice): string {
  if (device.role === 'ROUTER') return 'Router';
  if (device.role === 'SELF') return 'Este computador';
  if (device.kind) return KIND_LABELS[device.kind];
  return device.privateMac ? 'Celular o tableta' : 'Equipo';
}

/**
 * Name shown for a device: what the user typed, else what it announces, else its model or maker; without any of
 * them, its kind ("Celular o tableta 2", "TV o Chromecast 1") instead of a bare number.
 */
export function deviceName(device: AgentDevice, index: number): string {
  if (device.label || device.hostname) return (device.label || device.hostname)!;
  if (device.role) return kindName(device);
  if (device.model) return device.vendor && !device.model.toLowerCase().includes(device.vendor.toLowerCase())
    ? `${device.vendor} ${device.model}` : device.model;
  if (device.vendor) return device.kind ? `${KIND_LABELS[device.kind]} ${device.vendor}` : `Equipo ${device.vendor}`;
  return `${kindName(device)} ${index + 1}`;
}

/** Names for a whole list: devices without any name are numbered within their kind, not by their position. */
export function deviceNames(devices: AgentDevice[]): string[] {
  const counters = new Map<string, number>();
  return devices.map((d) => {
    if (d.label || d.hostname || d.vendor || d.model || d.role) return deviceName(d, 0);
    const kind = kindName(d);
    const n = counters.get(kind) ?? 0;
    counters.set(kind, n + 1);
    return deviceName(d, n);
  });
}

/**
 * Second line of a device: the kind the agent guessed ("Parece impresora": a guess, said as one), the model it
 * announces and its maker (what the name does not already say), or why the maker is unknown.
 */
export function deviceMaker(device: AgentDevice, shownName = ''): string {
  const parts: string[] = [];
  const said = shownName.toLowerCase();
  if (device.kind && device.role !== 'ROUTER') {
    // a guess of the agent, never a certainty ("TV" keeps its capitals: only a capitalised first word is lowered)
    parts.push(`Parece ${KIND_LABELS[device.kind].replace(/^\p{Lu}(?!\p{Lu})/u, (c) => c.toLowerCase())}`);
  }
  if (device.model && !said.includes(device.model.toLowerCase())) parts.push(device.model);
  const maker = device.vendor ?? (device.privateMac ? 'Dirección privada' : 'Sin identificar');
  if (!device.vendor || !said.includes(device.vendor.toLowerCase())) parts.push(maker);
  return parts.join(' · ') || maker;
}

export function DeviceRow({ device, shownName, onChange, updateDevice, loadHistory, team, canManage, onBlocked }: {
  device: AgentDevice; shownName: string; onChange: () => void;
  updateDevice: (fingerprint: string, change: DeviceChange) => Promise<unknown>; loadHistory?: HistoryLoader;
  team: boolean; canManage: boolean; onBlocked: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [name, setName] = useState(device.label ?? '');
  const [busy, setBusy] = useState(false);

  async function save(change: DeviceChange) {
    setBusy(true);
    try {
      await updateDevice(device.id, change);
      onChange();
    } finally {
      setBusy(false);
    }
  }

  async function rename() {
    const trimmed = name.trim();
    setEditing(false);
    if (trimmed !== (device.label ?? '')) await save({ label: trimmed || null });
  }

  async function block() {
    await save({ authorized: false });
    onBlocked();
  }

  return (
    <li className={`devrow${device.online ? ' is-online' : ''}${device.authorized ? '' : ' is-blocked'}`}>
      <span className="devrow__icon"><Icon name={device.authorized ? deviceIcon(device) : 'ban'} size={22} /></span>
      <div className="devrow__main">
        {editing ? (
          <input className="devrow__input" value={name} maxLength={40} autoFocus aria-label="Nombre del equipo"
                 onChange={(e) => setName(e.target.value)} onBlur={rename}
                 onKeyDown={(e) => { if (e.key === 'Enter') rename(); if (e.key === 'Escape') setEditing(false); }} />
        ) : (
          <span className="devrow__name">
            {shownName}
            {device.recent && <span className="tag tag--accent">Nuevo</span>}
            {device.role === 'SELF' && <span className="tag">{team ? 'Computador del sensor' : 'Este computador (agente)'}</span>}
            {device.role === 'ROUTER' && <span className="tag">Router</span>}
            {!device.authorized && <span className="tag tag--danger">No autorizado</span>}
            {canManage && !hasOwnName(device) && (
              <button className="link-button devrow__nameit" onClick={() => { setName(''); setEditing(true); }}>
                Ponerle nombre
              </button>
            )}
          </span>
        )}
        <span className="devrow__sub">
          <IdentityTag device={device} />{' '}
          <span title={device.privateMac && !device.vendor
            ? 'Los celulares y tabletas usan una dirección aleatoria en cada red para que no los rastreen.' : undefined}>
            {deviceMaker(device, shownName)}
          </span> · {device.online ? 'Conectado ahora' : `Visto ${formatDateTime(device.lastSeenAt)}`}
        </span>
      </div>
      <span className="devrow__dot" aria-hidden="true" />
      <div className="devrow__actions">
        {loadHistory && (
          <button className="iconbtn" onClick={() => setShowHistory((v) => !v)} aria-expanded={showHistory}
                  title="Cuándo estuvo conectado" aria-label={`Historial de conexiones de ${shownName}`}>
            <Icon name="clock" size={16} />
          </button>
        )}
        {canManage && !editing && (
          <button className="iconbtn" onClick={() => { setName(device.label ?? ''); setEditing(true); }}
                  disabled={busy} title="Cambiar el nombre" aria-label="Cambiar el nombre"><Icon name="pencil" size={16} /></button>
        )}
        {canManage && (device.authorized ? (
          <button className="iconbtn iconbtn--danger" onClick={block} disabled={busy}
                  title={team ? 'No autorizado / quitar acceso' : 'No es mío / quitar acceso'}
                  aria-label="Marcar como no autorizado"><Icon name="ban" size={16} /></button>
        ) : (
          <button className="iconbtn" onClick={() => save({ authorized: true })} disabled={busy}
                  title={team ? 'Autorizar' : 'Sí es mío'} aria-label="Volver a autorizar"><Icon name="check" size={16} /></button>
        ))}
      </div>
      {showHistory && loadHistory && (
        <div className="devrow__history"><DeviceHistory load={() => loadHistory(device.id)} /></div>
      )}
    </li>
  );
}

/** How to actually remove a device: an app cannot change the router, so we guide the user to do it there. */
export function RouterGuide({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={onClose}>
      <div className="modal__box" onClick={(e) => e.stopPropagation()}>
        <h3 id="guide-title"><Icon name="router" size={18} /> Cómo sacar «{name}» de tu red</h3>
        <p className="muted small">
          WiFiSense no puede desconectar equipos por sí solo (eso lo manda el router). Ya lo marcamos como no
          autorizado: te avisaremos si se vuelve a conectar. Para sacarlo de verdad, haz una de estas dos:
        </p>
        <ol className="agent__steps">
          <li><strong>Lo más fácil y seguro:</strong> cambia la contraseña de tu Wi-Fi. Entra al router (suele ser
            <code> 192.168.0.1</code> o <code>192.168.1.1</code> en el navegador), ve a la configuración del Wi-Fi y
            ponle una contraseña nueva. Todos tus equipos tendrán que volver a conectarse con la nueva.</li>
          <li><strong>Si tu router lo permite:</strong> en su configuración busca «Control de acceso», «Filtrado MAC»
            o «Dispositivos bloqueados» y bloquea ese equipo desde la lista.</li>
        </ol>
        <p className="muted small">Tu proveedor (Claro, Movistar, Tigo…) también puede cambiar la contraseña por ti si llamas a soporte.</p>
        <button className="button" onClick={onClose}>Entendido</button>
      </div>
    </div>
  );
}
