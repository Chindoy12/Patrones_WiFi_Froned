import { useEffect, useState } from 'react';
import { anomalyTypeLabel, formatDateTime, formatNumber } from '../format';
import { errorMessage, useApi } from '../hooks/useApi';
import { useNow } from '../hooks/useNow';
import { api } from '../services/api';
import type {
  AgentAlert, AgentAlertType, AgentChannel, AgentDevice, AgentOverview, AgentPairingCode, AgentReport,
  AlertPreferences, DeviceKind, DeviceSessionHistory, FindingSeverity, HomeNetwork, IdentifyMode, SecurityAssessment,
  SecurityGrade, WifiAuthentication,
} from '../types';
import { DeviceHistory } from './DeviceHistory';
import { IdentifyWizard } from './IdentifyWizard';
import { Gauge, type GaugeStatus } from './Gauge';
import { Icon, type IconName } from './Icon';

/** Windows installer built by GitHub Actions in the AI repository (release "agente"). */
export const AGENT_INSTALLER =
  'https://github.com/davidcampino06/Patrones_WiFi_-Artificial_Intelligence/releases/download/agente/WiFiSenseAgente.exe';
const REFRESH_MS = 60_000;
const PAIRING_REFRESH_MS = 10_000;

export const securityStatus: Record<SecurityGrade, GaugeStatus> = {
  SECURE: 'good', ACCEPTABLE: 'fair', AT_RISK: 'poor', CRITICAL: 'poor',
};

export const authenticationLabel: Record<WifiAuthentication, string> = {
  OPEN: 'Abierta, sin contraseña', WEP: 'WEP (insegura)', WPA: 'WPA (antigua)', WPA2: 'WPA2', WPA3: 'WPA3',
  UNKNOWN: 'No se pudo leer',
};

const SEVERITY: Record<FindingSeverity, { label: string; icon: IconName }> = {
  CRITICAL: { label: 'Crítico', icon: 'cross' },
  HIGH: { label: 'Alto', icon: 'anomaly' },
  MEDIUM: { label: 'Medio', icon: 'anomaly' },
  LOW: { label: 'Bajo', icon: 'minus' },
  INFO: { label: 'Consejo', icon: 'ai' },
};

/**
 * Agent of one network: how to install it and, once it reports, devices, security audit, channel and anomalies.
 * The only way offered to install it is the Windows installer with a short code: nobody has to open a console.
 */
export function AgentPanel({ network }: { network: HomeNetwork }) {
  const overview = useApi(() => api.myAgent(network.id), [network.id]);
  const [pairing, setPairing] = useState<AgentPairingCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { reload } = overview;
  const lastSeen = overview.data?.key?.lastSeenAt ?? null;

  // While a code is on screen the page checks more often, so the first report shows up right away.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) reload();
    }, pairing ? PAIRING_REFRESH_MS : REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [reload, pairing]);

  // The installer used the code and the agent reported: the code has done its job.
  useEffect(() => {
    if (pairing && lastSeen && new Date(lastSeen) > new Date(new Date(pairing.expiresAt).getTime() - 15 * 60_000)) {
      setPairing(null);
    }
  }, [pairing, lastSeen]);

  async function startPairing() {
    setBusy(true);
    setError(null);
    try {
      setPairing(await api.createAgentPairingCode(network.id));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey() {
    if (!window.confirm('El agente dejará de enviar reportes de esta red. ¿Desconectarlo?')) return;
    setBusy(true);
    setError(null);
    try {
      await api.revokeAgentKey(network.id);
      setPairing(null);
      reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const data = overview.data;
  return (
    <section className="eu-section agent" aria-labelledby="agent-title">
      <div className="eu-section__head">
        <h2 id="agent-title">Agente WiFiSense</h2>
        {data?.key && <AgentState overview={data} />}
      </div>
      {error && <p className="notice notice--error" role="alert">{error}</p>}
      {overview.error && <p className="notice notice--error" role="alert">{overview.error}</p>}
      {pairing && <Pairing pairing={pairing} onRenew={startPairing} onClose={() => setPairing(null)} busy={busy} />}
      {data && !data.key && !pairing && <Intro onInstall={startPairing} busy={busy} />}
      {data?.key && !data.latest && !pairing && <Waiting onInstall={startPairing} busy={busy} />}
      {data?.latest && (
        <AgentReports overview={data} latest={data.latest} onChange={reload}
                      updateDevice={(id, change) => api.updateAgentDevice(network.id, id, change)}
                      loadHistory={(id) => api.agentDeviceSessions(network.id, id)}
                      identify={() => api.identifyAgentDevice(network.id)} />
      )}
      {data?.key && (
        <p className="agent__keybar">
          <Icon name="key" size={16} /> Agente instalado el {formatDateTime(data.key.createdAt)}
          <span className="agent__keyactions">
            <button className="link-button" onClick={startPairing} disabled={busy}>Instalar en otro computador</button>
            <button className="link-button link-button--danger" onClick={revokeKey} disabled={busy}>Desconectar</button>
          </span>
        </p>
      )}
    </section>
  );
}

function AgentState({ overview }: { overview: AgentOverview }) {
  const seen = overview.key?.lastSeenAt;
  return (
    <span className={`agent__state agent__state--${overview.online ? 'on' : 'off'}`} role="status">
      <i aria-hidden="true" /> {overview.online ? 'Agente conectado' : seen ? `Sin reportes desde ${formatDateTime(seen)}` : 'Esperando al agente'}
    </span>
  );
}

function Intro({ onInstall, busy }: { onInstall: () => void; busy: boolean }) {
  return (
    <div className="dash__card agent__intro">
      <div>
        <h3>Mira cuántos equipos hay en tu Wi-Fi y qué tan segura es</h3>
        <p className="muted">
          El agente es un pequeño programa que se instala en un computador de tu casa. Cada 5 minutos cuenta los
          equipos conectados, revisa la seguridad del Wi-Fi y del router, y mide la conexión. Te avisamos si aparece
          un equipo nuevo, si hay una vulnerabilidad o si la IA ve que la red se comporta raro.
        </p>
        <ul className="agent__features">
          <li><Icon name="devices" size={18} /> Equipos conectados y aviso de equipos nuevos</li>
          <li><Icon name="shield" size={18} /> Auditoría de seguridad con puntaje y qué hacer</li>
          <li><Icon name="wifi" size={18} /> El canal Wi-Fi con menos interferencia</li>
          <li><Icon name="anomaly" size={18} /> Detección de anomalías con Isolation Forest</li>
        </ul>
      </div>
      <div className="agent__cta">
        <button className="button button--big" onClick={onInstall} disabled={busy}>
          <Icon name="download" size={16} /> Instalar el agente
        </button>
        <p className="muted small">Para Windows 10 y 11. No necesitas Python ni usar comandos.</p>
      </div>
    </div>
  );
}

/** The 8-character code, how long it lasts and the three steps of the installer. */
function Pairing({ pairing, onRenew, onClose, busy }: {
  pairing: AgentPairingCode; onRenew: () => void; onClose: () => void; busy: boolean;
}) {
  const now = useNow(1000);
  const left = Math.max(0, Math.floor((new Date(pairing.expiresAt).getTime() - now.getTime()) / 1000));
  const expired = left === 0;
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return (
    <div className="dash__card agent__pairing" role="region" aria-label="Instalar el agente">
      <div className="agent__code">
        <span className="muted small">Código de instalación</span>
        <strong className={expired ? 'is-expired' : undefined} aria-live="polite">{pairing.code}</strong>
        <span className="muted small" role="timer">
          {expired ? 'Este código venció.' : `Vence en ${clock} y sirve una sola vez.`}
        </span>
        {expired && <button className="button" onClick={onRenew} disabled={busy}>Generar otro código</button>}
      </div>
      <ol className="agent__steps">
        <li>
          <a className="button button--quiet" href={AGENT_INSTALLER}><Icon name="download" size={16} /> Descargar instalador</a>
          {' '}y ábrelo. Si Windows muestra «Windows protegió su PC», pulsa <strong>Más información → Ejecutar de todas formas</strong>.
        </li>
        <li>Escribe este código en la ventana del agente.</li>
        <li>Pulsa <strong>Instalar</strong>. En unos segundos verás aquí tus equipos conectados y la seguridad de tu red.</li>
      </ol>
      <p className="muted small">
        El agente queda en Configuración → Aplicaciones como «Agente WiFiSense»; desde ahí lo puedes desinstalar.
        Puedes elegir si arranca solo al encender el computador.
      </p>
      <button className="link-button" onClick={onClose}>Cerrar</button>
    </div>
  );
}

/** Connected but no report yet: usually the installer was not opened, or the code was not typed in time. */
function Waiting({ onInstall, busy }: { onInstall: () => void; busy: boolean }) {
  return (
    <div className="dash__card">
      <p className="agent__waiting"><span className="agent__pulse" aria-hidden="true" /> Esperando el primer reporte del agente.</p>
      <p className="muted">
        Si todavía no abriste el instalador en el computador de tu casa, o el código venció, genera uno nuevo:
      </p>
      <button className="button" onClick={onInstall} disabled={busy}>
        <Icon name="download" size={16} /> Obtener código de instalación
      </button>
    </div>
  );
}

export type DeviceChange = { label?: string | null; authorized?: boolean };
export type HistoryLoader = (fingerprint: string) => Promise<DeviceSessionHistory>;

/**
 * What the agent saw in its latest report: devices, security audit, Wi-Fi, best channel and the connection. Mi Wi-Fi
 * shows it for a home; the team panel (team) shows the same for the sensor of a team network, where only an
 * administrator can name or block a device (canManage) and the alerts live in the Alerts page.
 */
export function AgentReports({ overview, latest, onChange, updateDevice, loadHistory, identify, team = false,
  canManage = true }: {
  overview: AgentOverview; latest: AgentReport; onChange: () => void;
  updateDevice: (fingerprint: string, change: DeviceChange) => Promise<unknown>; loadHistory?: HistoryLoader;
  identify?: () => Promise<IdentifyMode>; team?: boolean; canManage?: boolean;
}) {
  const security = latest.details.security ?? null;
  const anomaly = latest.details.anomaly ?? null;
  const unauthorizedOnline = overview.devices.filter((d) => !d.authorized && d.online);
  return (
    <>
      {unauthorizedOnline.length > 0 && (
        <p className="notice notice--error agent__alert" role="alert">
          <Icon name="ban" size={18} />
          {team
            ? (unauthorizedOnline.length === 1 ? 'Un equipo marcado como no autorizado está conectado'
              : `${unauthorizedOnline.length} equipos marcados como no autorizados están conectados`)
            : (unauthorizedOnline.length === 1 ? 'Un equipo que marcaste como no autorizado está conectado'
              : `${unauthorizedOnline.length} equipos que marcaste como no autorizados están conectados`)}.
          Cambia la contraseña del Wi-Fi para sacarlo.
        </p>
      )}
      {latest.newDeviceCount > 0 && unauthorizedOnline.length === 0 && (
        <p className="notice notice--error agent__alert" role="alert">
          <Icon name="anomaly" size={18} />
          {latest.newDeviceCount === 1 ? 'Apareció 1 equipo nuevo' : `Aparecieron ${latest.newDeviceCount} equipos nuevos`}
          {team ? ' en esta red. Si nadie lo reconoce, márquenlo abajo como no autorizado.'
            : ' en tu red. Si no lo reconoces, márcalo abajo como «No es mío».'}
        </p>
      )}
      <div className="dash">
        <section className="dash__card dash__card--full" aria-labelledby="devices-title">
          <h3 className="dash__title" id="devices-title">
            <Icon name="devices" size={18} /> Equipos conectados
            <span className="agent__countpill num">{latest.deviceCount}</span>
          </h3>
          <p className="muted small">
            {team
              ? 'Los equipos que ve el sensor en esta red, cada uno con su nombre y marca (nunca su dirección MAC).'
              : 'Como en la lista de Bluetooth: cada equipo con su nombre y marca. Si uno no es tuyo, márcalo «No es mío».'}
            {overview.devices.some((d) => d.privateMac && !d.label && !d.hostname) && (
              <> Los celulares y tabletas con <strong>dirección privada</strong> no dicen su marca{canManage
                ? <>: usa «¿Cuál es este equipo?» o ponles un nombre con el lápiz para reconocerlos.</> : '.'}</>
            )}
            {' '}Son los equipos que respondieron al {team ? 'sensor' : 'agente'}; el tipo («Parece…») es una suposición a
            partir de lo que cada equipo anuncia: solo el router sabe con certeza quién está conectado.
          </p>
          <DeviceList devices={overview.devices} onChange={onChange} updateDevice={updateDevice} team={team}
                      canManage={canManage} loadHistory={loadHistory} identify={identify} latestAt={latest.receivedAt} />
          <p className="dash__foot"><Icon name="clock" size={16} /> Último reporte: {formatDateTime(latest.receivedAt)}</p>
        </section>

        <section className="dash__card" aria-labelledby="security-title">
          <h3 className="dash__title" id="security-title"><Icon name="shield" size={18} /> Seguridad</h3>
          <Gauge size="sm" percent={security?.score ?? null} value={security ? String(security.score) : '—'}
                 label="de 100" status={security ? securityStatus[security.grade] : 'none'}
                 caption={security?.gradeLabel ?? 'Sin auditoría'} />
          <p className="small">{security?.summary ?? 'El servicio de análisis no respondió en el último reporte.'}</p>
        </section>

        <section className="dash__card" aria-labelledby="wifi-title">
          <h3 className="dash__title" id="wifi-title"><Icon name="wifi" size={18} /> {team ? 'El Wi-Fi' : 'Tu Wi-Fi'}</h3>
          <WifiTiles report={latest} />
        </section>

        {latest.details.channel && <ChannelCard channel={latest.details.channel} />}

        <section className="dash__card" aria-labelledby="anomaly-title">
          <h3 className="dash__title" id="anomaly-title">
            <Icon name="ai" size={18} /> {team ? 'Conexión' : 'Comportamiento de la red'}
          </h3>
          {team ? (
            <p className="muted small">El estado de la red sale del análisis de cada medición: míralo en Panel y Alertas.</p>
          ) : anomaly ? (
            <div className={`agent__verdict agent__verdict--${anomaly.detected ? 'bad' : 'ok'}`}>
              <Icon name={anomaly.detected ? 'anomaly' : 'check'} size={22} />
              <div>
                <strong>{anomaly.detected ? `Anomalía: ${anomalyTypeLabel[anomaly.type] ?? 'causa desconocida'}` : 'Sin anomalías'}</strong>
                <p className="small">{anomaly.detected ? (anomaly.recommendation ?? anomaly.message) : 'La conexión se comporta como de costumbre.'}</p>
              </div>
            </div>
          ) : <p className="muted">Se analiza cuando el agente mide latencia, jitter y pérdida.</p>}
          <dl className="agent__facts">
            <div><dt>Calidad</dt><dd>{latest.qualityScore !== null ? `${latest.qualityScore} de 100` : 'Sin datos'}</dd></div>
            <div><dt>Internet</dt><dd>{formatNumber(latest.latencyMs, 0, ' ms')} · jitter {formatNumber(latest.jitterMs, 0, ' ms')}</dd></div>
            <div><dt>Pérdida</dt><dd>{formatNumber(latest.packetLossPct, 1, ' %')}</dd></div>
            <div><dt>Hasta el router</dt><dd>{formatNumber(latest.gatewayLatencyMs, 1, ' ms')}</dd></div>
          </dl>
        </section>

        {security && <Findings security={security} team={team} />}
        {!team && <AlertsCard alerts={overview.alerts} />}
        {!team && <AlertPreferencesCard />}
      </div>
    </>
  );
}

const ALERT_ICON: Record<AgentAlertType, IconName> = {
  NEW_DEVICE: 'devices', UNAUTHORIZED_DEVICE: 'ban', SECURITY: 'shield', ANOMALY: 'anomaly',
};

/** Short history of what WiFiSense noticed and (when the user wants it) emailed. */
function AlertsCard({ alerts }: { alerts: AgentAlert[] }) {
  return (
    <section className="dash__card" aria-labelledby="alerts-title">
      <h3 className="dash__title" id="alerts-title"><Icon name="bell" size={18} /> Avisos recientes</h3>
      {alerts.length === 0 ? (
        <p className="muted">Sin avisos todavía. Aquí verás los equipos nuevos, bajones de seguridad y anomalías.</p>
      ) : (
        <ul className="agent__alerts">
          {alerts.slice(0, 8).map((a, i) => (
            <li key={`${a.at}-${i}`} className={`agent__alerts-item agent__alerts-item--${a.type.toLowerCase()}`}>
              <Icon name={ALERT_ICON[a.type]} size={16} />
              <span>{a.detail}</span>
              <time dateTime={a.at}>{formatDateTime(a.at)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The three email-alert switches; shared by all of the user's networks. */
function AlertPreferencesCard() {
  const prefs = useApi(api.alertPreferences);
  const [saving, setSaving] = useState<keyof AlertPreferences | null>(null);

  async function toggle(key: keyof AlertPreferences, value: boolean) {
    if (!prefs.data) return;
    setSaving(key);
    try {
      await api.updateAlertPreferences({ ...prefs.data, [key]: value });
      prefs.reload();
    } finally {
      setSaving(null);
    }
  }

  const rows: { key: keyof AlertPreferences; icon: IconName; label: string; help: string }[] = [
    { key: 'newDevice', icon: 'devices', label: 'Equipo nuevo o no autorizado', help: 'Cuando se conecta un equipo que no habíamos visto o uno que marcaste como no tuyo.' },
    { key: 'security', icon: 'shield', label: 'Seguridad en riesgo', help: 'Cuando la seguridad de tu red baja a crítica (por ejemplo, Wi-Fi sin contraseña).' },
    { key: 'anomaly', icon: 'anomaly', label: 'Comportamiento raro', help: 'Cuando la IA detecta una anomalía en tu conexión.' },
  ];

  return (
    <section className="dash__card" aria-labelledby="prefs-title">
      <h3 className="dash__title" id="prefs-title"><Icon name="bell" size={18} /> Avisos por correo</h3>
      {prefs.data ? (
        <ul className="agent__prefs">
          {rows.map((row) => (
            <li key={row.key}>
              <Icon name={row.icon} size={18} />
              <span className="agent__prefs-text">
                <strong>{row.label}</strong>
                <small className="muted">{row.help}</small>
              </span>
              <label className="switch">
                <input type="checkbox" checked={prefs.data![row.key]} disabled={saving !== null}
                       onChange={(e) => toggle(row.key, e.target.checked)}
                       aria-label={`Avisarme por correo: ${row.label}`} />
                <i aria-hidden="true" />
              </label>
            </li>
          ))}
        </ul>
      ) : <p className="muted">{prefs.loading ? 'Cargando…' : 'No se pudieron cargar tus avisos.'}</p>}
      <p className="muted small">Los avisos llegan al correo de tu cuenta. Puedes cambiarlo en Mi cuenta.</p>
    </section>
  );
}

function WifiTiles({ report }: { report: AgentReport }) {
  const wifi = report.details.wifi ?? {};
  if (!report.ssid) {
    return (
      <p className="muted">
        {wifi.note === 'LOCATION_PERMISSION'
          ? 'Windows no dejó leer los datos del Wi-Fi: activa la ubicación para las aplicaciones de escritorio.'
          : 'El equipo del agente parece estar conectado por cable.'}
      </p>
    );
  }
  return (
    <dl className="agent__facts">
      <div><dt>Red</dt><dd>{report.ssid}</dd></div>
      <div><dt>Seguridad</dt><dd>{authenticationLabel[report.authentication]}{wifi.cipher ? ` · ${wifi.cipher}` : ''}</dd></div>
      <div><dt>Banda y canal</dt><dd>{report.band ? `${report.band} GHz` : '—'} · canal {report.channel ?? '—'}</dd></div>
      <div><dt>Señal</dt><dd>{report.signalDbm !== null ? `${report.signalDbm} dBm` : '—'}{wifi.signalPercent != null ? ` (${wifi.signalPercent} %)` : ''}</dd></div>
      <div><dt>Redes vecinas</dt><dd>{wifi.neighborsTotal ?? '—'}{wifi.neighborsSameChannel != null ? `, ${wifi.neighborsSameChannel} en tu canal` : ''}</dd></div>
      <div><dt>Puertos del router</dt><dd>{report.details.openPorts?.length ? report.details.openPorts.join(', ') : 'Ninguno de los revisados'}</dd></div>
    </dl>
  );
}

function Findings({ security, team }: { security: SecurityAssessment; team: boolean }) {
  return (
    <section className="dash__card dash__card--full" aria-labelledby="findings-title">
      <h3 className="dash__title" id="findings-title"><Icon name="shield" size={18} /> Vulnerabilidades y consejos</h3>
      {security.findings.length === 0 ? <p>No encontramos problemas de seguridad en {team ? 'esta' : 'tu'} red.</p> : (
        <ul className="findings">
          {security.findings.map((f) => (
            <li key={f.code} className={`finding finding--${f.severity.toLowerCase()}`}>
              <span className="finding__severity"><Icon name={SEVERITY[f.severity].icon} size={14} /> {SEVERITY[f.severity].label}</span>
              <div>
                <strong>{f.title}</strong>
                <p>{f.detail}</p>
                <p className="finding__action"><Icon name="check" size={14} /> {f.action}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The channel with the least interference, how crowded each option is and how to move the router to it. */
export function ChannelCard({ channel }: { channel: AgentChannel }) {
  const busiest = Math.max(1, ...channel.options.map((o) => o.load));
  return (
    <section className="dash__card" aria-labelledby="channel-title">
      <h3 className="dash__title" id="channel-title"><Icon name="router" size={18} /> Mejor canal Wi-Fi</h3>
      {channel.recommendedChannel !== null && (
        <div className={`agent__verdict agent__verdict--${channel.shouldChange ? 'bad' : 'ok'}`}>
          <Icon name={channel.shouldChange ? 'arrowUp' : 'check'} size={22} />
          <div>
            <strong>
              {channel.shouldChange
                ? `Cambia al canal ${channel.recommendedChannel}`
                : `Canal ${channel.currentChannel ?? channel.recommendedChannel}: bien`}
            </strong>
            <p className="small">{channel.summary}</p>
          </div>
        </div>
      )}
      {channel.recommendedChannel === null && <p className="small">{channel.summary}</p>}
      {channel.options.length > 0 && (
        <ul className="channels" aria-label={`Interferencia por canal en ${channel.band} GHz`}>
          {channel.options.map((o) => (
            <li key={o.channel} className={[
              o.channel === channel.currentChannel ? 'is-current' : '',
              o.channel === channel.recommendedChannel ? 'is-best' : '',
            ].join(' ').trim() || undefined}>
              <span className="channels__num num">{o.channel}</span>
              <span className="channels__bar" aria-hidden="true">
                <i style={{ width: `${Math.max(4, (o.load / busiest) * 100)}%` }} />
              </span>
              <span className="channels__load small">
                {channelLabel(o)}
                {o.channel === channel.currentChannel && ' · el tuyo'}
              </span>
            </li>
          ))}
        </ul>
      )}
      {channel.action && <p className="finding__action small"><Icon name="check" size={14} /> {channel.action}</p>}
    </section>
  );
}

/** Whole networks for people; the bar length keeps the exact weighting of the overlapping ones. */
function channelLabel(option: AgentChannel['options'][number]): string {
  if (option.load === 0) return 'libre';
  if (option.networks === 0) return 'solo redes encimadas';
  return option.networks === 1 ? '1 red' : `${option.networks} redes`;
}

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

/** The devices of a network, as in a phone's Bluetooth list. Without canManage they can only be looked at. */
export function DeviceList({ devices, onChange, updateDevice, loadHistory, team = false, canManage = true, identify,
  latestAt = null }: {
  devices: AgentDevice[]; onChange: () => void; updateDevice: (fingerprint: string, change: DeviceChange) => Promise<unknown>;
  loadHistory?: HistoryLoader; team?: boolean; canManage?: boolean;
  /** Starts "Which device is this?" (the agent reports every minute); without it the button is not shown. */
  identify?: () => Promise<IdentifyMode>;
  /** When the latest report arrived: the wizard compares the reports that come after it. */
  latestAt?: string | null;
}) {
  const [guide, setGuide] = useState<AgentDevice | null>(null);
  const [wizard, setWizard] = useState(false);
  if (devices.length === 0) {
    return <p className="muted">Aún no hay equipos. Aparecen con el primer reporte del {team ? 'sensor' : 'agente'}.</p>;
  }
  const names = deviceNames(devices);
  return (
    <>
      {identify && canManage && !wizard && (
        <button className="button button--quiet devlist__identify" onClick={() => setWizard(true)}>
          <Icon name="search" size={16} /> ¿Cuál es este equipo?
        </button>
      )}
      {identify && wizard && (
        <IdentifyWizard devices={devices} names={names} latestAt={latestAt} start={identify} reload={onChange}
                        rename={(id, label) => updateDevice(id, { label, authorized: true })} team={team}
                        onClose={() => { setWizard(false); onChange(); }} />
      )}
      <ul className="devlist">
        {devices.map((d, i) => (
          <DeviceRow key={d.id} device={d} shownName={names[i]} onChange={onChange} updateDevice={updateDevice}
                     loadHistory={loadHistory} team={team} canManage={canManage} onBlocked={() => setGuide(d)} />
        ))}
      </ul>
      {guide && <RouterGuide name={names[devices.indexOf(guide)] ?? deviceName(guide, 0)} onClose={() => setGuide(null)} />}
    </>
  );
}

function DeviceRow({ device, shownName, onChange, updateDevice, loadHistory, team, canManage, onBlocked }: {
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
          </span>
        )}
        <span className="devrow__sub">
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
function RouterGuide({ name, onClose }: { name: string; onClose: () => void }) {
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

/** Tiny line of the last reports; the label carries the numbers for screen readers. */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / span) * 24}`).join(' ');
  return (
    <svg className="sparkline" viewBox="0 0 100 30" preserveAspectRatio="none" role="img"
         aria-label={`${label}: entre ${Math.min(...values)} y ${max}`}>
      <polyline points={points} />
    </svg>
  );
}
