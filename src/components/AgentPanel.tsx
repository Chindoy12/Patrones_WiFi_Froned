import { useEffect, useState } from 'react';
import { anomalyTypeLabel, formatDateTime, formatNumber } from '../format';
import { errorMessage, useApi } from '../hooks/useApi';
import { useNow } from '../hooks/useNow';
import { api } from '../services/api';
import type {
  AgentDevice, AgentKeyCreated, AgentOverview, AgentPairingCode, AgentReport, FindingSeverity, HomeNetwork, SecurityAssessment,
  SecurityGrade, WifiAuthentication,
} from '../types';
import { Gauge, type GaugeStatus } from './Gauge';
import { Icon, type IconName } from './Icon';

export const AGENT_DOWNLOAD = '/downloads/wifisense_agent.py';
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

/** Agent of one network: how to connect it and, once it reports, devices, security audit and anomalies. */
export function AgentPanel({ network }: { network: HomeNetwork }) {
  const overview = useApi(() => api.myAgent(network.id), [network.id]);
  const [created, setCreated] = useState<AgentKeyCreated | null>(null);
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
      setCreated(null);
      setPairing(await api.createAgentPairingCode(network.id));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function createKey() {
    if (overview.data?.key && !window.confirm('La clave actual dejará de funcionar y tendrás que configurar el agente otra vez. ¿Continuar?')) return;
    setBusy(true);
    setError(null);
    try {
      setCreated(await api.createAgentKey(network.id));
      reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey() {
    if (!window.confirm('El agente dejará de enviar reportes de esta red. ¿Revocar la clave?')) return;
    setBusy(true);
    setError(null);
    try {
      await api.revokeAgentKey(network.id);
      setCreated(null);
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
      {created && <NewKey created={created} onDone={() => setCreated(null)} />}
      {data && !data.key && !created && !pairing && <Intro onInstall={startPairing} onCreateKey={createKey} busy={busy} />}
      {data?.key && !data.latest && !created && !pairing && <Waiting prefix={data.key.prefix} />}
      {data?.latest && <Reports overview={data} latest={data.latest} />}
      {data?.key && (
        <p className="agent__keybar">
          <Icon name="key" size={16} /> Clave <code>{data.key.prefix}…</code> creada el {formatDateTime(data.key.createdAt)}
          <span className="agent__keyactions">
            <button className="link-button" onClick={startPairing} disabled={busy}>Instalar en otro computador</button>
            <button className="link-button" onClick={createKey} disabled={busy}>Nueva clave</button>
            <button className="link-button link-button--danger" onClick={revokeKey} disabled={busy}>Revocar</button>
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

function Intro({ onInstall, onCreateKey, busy }: { onInstall: () => void; onCreateKey: () => void; busy: boolean }) {
  return (
    <div className="dash__card agent__intro">
      <div>
        <h3>Mira cuántos equipos hay en tu Wi-Fi y qué tan segura es</h3>
        <p className="muted">
          El agente es un pequeño programa que se instala en un computador de tu casa. Cada 5 minutos cuenta los
          equipos conectados, revisa la seguridad del Wi-Fi y del router, y mide la conexión. La IA te avisa si
          aparece un equipo nuevo, si hay una vulnerabilidad o si la red se comporta raro.
        </p>
        <ul className="agent__features">
          <li><Icon name="devices" size={18} /> Equipos conectados y aviso de equipos nuevos</li>
          <li><Icon name="shield" size={18} /> Auditoría de seguridad con puntaje y qué hacer</li>
          <li><Icon name="anomaly" size={18} /> Detección de anomalías con Isolation Forest</li>
        </ul>
      </div>
      <div className="agent__cta">
        <button className="button button--big" onClick={onInstall} disabled={busy}>
          <Icon name="download" size={16} /> Instalar el agente
        </button>
        <p className="muted small">Para Windows 10 y 11. No necesitas Python ni usar comandos.</p>
        <details className="agent__python">
          <summary>¿Linux o prefieres Python?</summary>
          <p className="small">
            Descarga <a href={AGENT_DOWNLOAD} download>wifisense_agent.py</a> y conéctalo con el código de
            «Instalar el agente» (<code>python wifisense_agent.py pair CÓDIGO</code>) o con una clave:
          </p>
          <button className="link-button" onClick={onCreateKey} disabled={busy}>Crear clave del agente</button>
        </details>
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

function NewKey({ created, onDone }: { created: AgentKeyCreated; onDone: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(created.key);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="dash__card agent__newkey" role="region" aria-label="Clave nueva del agente">
      <p className="notice notice--info"><strong>Copia la clave ahora:</strong> por seguridad no se vuelve a mostrar.</p>
      <div className="agent__key">
        <code>{created.key}</code>
        <button className="button button--quiet" onClick={copy}><Icon name="copy" size={16} /> {copied ? 'Copiada' : 'Copiar'}</button>
      </div>
      <Steps />
      <button className="link-button" onClick={onDone}>Ya la guardé</button>
    </div>
  );
}

function Steps() {
  return (
    <ol className="agent__steps">
      <li><a href={AGENT_DOWNLOAD} download>Descarga <code>wifisense_agent.py</code></a> en el computador de tu casa.</li>
      <li>Abre CMD en esa carpeta y ejecuta <code>python wifisense_agent.py setup</code>; pega la clave cuando la pida.</li>
      <li>Inícialo con <code>python wifisense_agent.py run</code> y deja la ventana abierta. El primer reporte llega en segundos.</li>
    </ol>
  );
}

function Waiting({ prefix }: { prefix: string }) {
  return (
    <div className="dash__card">
      <p className="agent__waiting"><span className="agent__pulse" aria-hidden="true" /> Esperando el primer reporte del agente con la clave <code>{prefix}…</code></p>
      <Steps />
    </div>
  );
}

function Reports({ overview, latest }: { overview: AgentOverview; latest: AgentReport }) {
  const security = latest.details.security ?? null;
  const anomaly = latest.details.anomaly ?? null;
  const newDevices = overview.devices.filter((d) => d.recent);
  return (
    <>
      {latest.newDeviceCount > 0 && (
        <p className="notice notice--error agent__alert" role="alert">
          <Icon name="anomaly" size={18} />
          {latest.newDeviceCount === 1 ? 'Apareció 1 equipo nuevo' : `Aparecieron ${latest.newDeviceCount} equipos nuevos`} en tu red.
          Si no lo reconoces, cambia la contraseña del Wi-Fi.
        </p>
      )}
      <div className="dash">
        <section className="dash__card dash__card--hero" aria-labelledby="devices-title">
          <h3 className="dash__title" id="devices-title"><Icon name="devices" size={18} /> Equipos conectados</h3>
          <div className="agent__count">
            <strong className="num">{latest.deviceCount}</strong>
            <span>{latest.deviceCount === 1 ? 'equipo en tu red' : 'equipos en tu red'}</span>
          </div>
          <Sparkline values={overview.history.map((h) => h.deviceCount)} label="Equipos conectados en los últimos reportes" />
          <DeviceList devices={overview.devices} />
          <p className="dash__foot"><Icon name="clock" size={16} /> Último reporte: {formatDateTime(latest.receivedAt)}
            {newDevices.length > 0 && <span className="tag tag--accent">{newDevices.length} nuevo(s) hoy</span>}</p>
        </section>

        <section className="dash__card" aria-labelledby="security-title">
          <h3 className="dash__title" id="security-title"><Icon name="shield" size={18} /> Seguridad</h3>
          <Gauge size="sm" percent={security?.score ?? null} value={security ? String(security.score) : '—'}
                 label="de 100" status={security ? securityStatus[security.grade] : 'none'}
                 caption={security?.gradeLabel ?? 'Sin auditoría'} />
          <p className="small">{security?.summary ?? 'La IA no estaba disponible en el último reporte.'}</p>
        </section>

        <section className="dash__card" aria-labelledby="wifi-title">
          <h3 className="dash__title" id="wifi-title"><Icon name="wifi" size={18} /> Tu Wi-Fi</h3>
          <WifiTiles report={latest} />
        </section>

        <section className="dash__card" aria-labelledby="anomaly-title">
          <h3 className="dash__title" id="anomaly-title"><Icon name="ai" size={18} /> Comportamiento de la red</h3>
          {anomaly ? (
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

        {security && <Findings security={security} />}
      </div>
    </>
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

function Findings({ security }: { security: SecurityAssessment }) {
  return (
    <section className="dash__card dash__card--full" aria-labelledby="findings-title">
      <h3 className="dash__title" id="findings-title"><Icon name="shield" size={18} /> Vulnerabilidades y consejos</h3>
      {security.findings.length === 0 ? <p>No encontramos problemas de seguridad en tu red.</p> : (
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

function DeviceList({ devices }: { devices: AgentDevice[] }) {
  if (devices.length === 0) return null;
  return (
    <ul className="devices">
      {devices.slice(0, 12).map((d, i) => (
        <li key={d.id} className={d.online ? 'is-online' : undefined}>
          <i aria-hidden="true" />
          <span className="devices__name">{d.label ?? `Equipo ${i + 1}`} <code>{d.id.slice(0, 6)}</code></span>
          <span className="devices__state">{d.online ? 'Conectado' : `Visto ${formatDateTime(d.lastSeenAt)}`}</span>
          {d.recent && <span className="tag tag--accent">Nuevo</span>}
        </li>
      ))}
    </ul>
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
