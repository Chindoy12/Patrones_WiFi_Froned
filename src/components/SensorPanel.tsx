import { useEffect, useState } from 'react';
import { formatDateTime } from '../format';
import { errorMessage, useApi } from '../hooks/useApi';
import { useNow } from '../hooks/useNow';
import { api } from '../services/api';
import type { AgentPairingCode, Network, SensorStatus } from '../types';
import { AGENT_INSTALLER, AgentReports } from './AgentPanel';
import { Icon } from './Icon';

/** How a network's sensor looks in the table: connected, quiet for a while, or not installed yet. */
export function sensorBadge(status: SensorStatus | null, now: Date = new Date()): { label: string; tone: string } {
  if (!status || !status.installed) {
    return status?.pendingCodeExpiresAt ? { label: 'Esperando instalación', tone: 'warn' } : { label: 'Sin sensor', tone: 'neutral' };
  }
  if (status.online) return { label: 'Conectado', tone: 'good' };
  if (!status.lastSeenAt) return { label: 'Esperando el primer reporte', tone: 'warn' };
  const minutes = Math.round((now.getTime() - new Date(status.lastSeenAt).getTime()) / 60_000);
  const since = minutes < 120 ? `${minutes} min` : minutes < 2880 ? `${Math.round(minutes / 60)} h` : `${Math.round(minutes / 1440)} días`;
  return { label: `Sin reportes hace ${since}`, tone: 'bad' };
}

/** The sensor column of the networks table. Networks that are not measured by a sensor show their source. */
export function SensorCell({ network, label }: { network: Network; label: string }) {
  // lastCollectedAt changes with every reading of the sensor, so the cell refreshes when the list does
  const status = useApi(() => (network.dataSourceType === 'AGENT' ? api.sensor(network.id) : Promise.resolve(null)),
    [network.id, network.dataSourceType, network.lastCollectedAt]);
  if (network.dataSourceType !== 'AGENT') return <span className="tag">{label}</span>;
  if (status.loading && !status.data) return <span className="muted small">…</span>;
  const badge = sensorBadge(status.data);
  return <span className={`badge badge--${badge.tone}`}>{badge.label}</span>;
}

/**
 * Connect, check or remove the sensor of a team network: the WiFiSense agent installed on a computer connected to
 * that network. The installer is the same one of Mi Wi-Fi; the code decides which network it measures.
 */
export function SensorPanel({ network, canManage, onChange }: {
  network: Network; canManage: boolean; onChange: () => void;
}) {
  const status = useApi(() => api.sensor(network.id), [network.id]);
  const [pairing, setPairing] = useState<AgentPairingCode | null>(null);
  // the sensor installed when the code was generated: a reinstall is done when a different one reports
  const [replacing, setReplacing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const waiting = pairing !== null || Boolean(status.data && status.data.installed && !status.data.lastSeenAt);

  // While the installer is being used, check every 10 s so the panel turns green by itself.
  useEffect(() => {
    if (!waiting) return undefined;
    const timer = window.setInterval(() => status.reload(), 10_000);
    return () => window.clearInterval(timer);
  }, [waiting, status.reload]);

  const installed = status.data;
  const newSensorReported = Boolean(installed?.installed && installed.lastSeenAt && installed.installedAt !== replacing);
  useEffect(() => {
    if (pairing && newSensorReported) {
      setPairing(null);
      setMessage('¡Listo! El sensor ya está enviando mediciones.');
      onChange();
    }
  }, [pairing, newSensorReported, onChange]);

  async function newCode() {
    setBusy(true);
    setMessage(null);
    try {
      setReplacing(status.data?.installedAt ?? null);
      setPairing(await api.sensorPairing(network.id));
      status.reload();
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`¿Quitar el sensor de ${network.ssid}? Dejará de enviar mediciones hasta que lo vuelvas a conectar.`)) return;
    setBusy(true);
    try {
      await api.removeSensor(network.id);
      setPairing(null);
      setMessage('Sensor quitado. Sus mediciones anteriores se conservan.');
      status.reload();
      onChange();
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const current = status.data;
  return (
    <section className="panel sensor" aria-label={`Sensor de ${network.ssid}`}>
      <h2>Sensor de «{network.ssid}»</h2>
      {message && <p className="notice" role="status">{message}</p>}
      {status.error && <p className="notice notice--error" role="alert">{status.error}</p>}
      {pairing ? (
        <SensorPairing pairing={pairing} onRenew={newCode} busy={busy} />
      ) : current?.installed ? (
        <>
          {current.lastSsid && current.lastSsid !== network.ssid && (
            <p className="notice notice--error" role="alert">
              El computador del sensor está conectado a «{current.lastSsid}», no a «{network.ssid}»: sus reportes no se
              guardan como de esta red. Conéctalo a «{network.ssid}» (si el nombre de la red está mal escrito, elimínala y
              regístrala de nuevo).
            </p>
          )}
          <SensorState status={current} />
          <SensorReport network={network} canManage={canManage} />
        </>
      ) : (
        <div className="sensor__intro">
          <p>
            Esta red todavía no tiene sensor. El sensor es el <strong>agente WiFiSense</strong> instalado en un
            computador conectado a esta red: cada 5 minutos mide la latencia, la pérdida, la señal, la velocidad del
            enlace, cuántos equipos hay y el tráfico de ese computador por protocolo, y lo envía aquí.
          </p>
          {!canManage && <p className="muted">Pide a un administrador que conecte el sensor.</p>}
        </div>
      )}
      {canManage && !pairing && (
        <div className="sensor__actions">
          <button className="button" onClick={newCode} disabled={busy}>
            {current?.installed ? 'Reinstalar (nuevo código)' : 'Conectar sensor'}
          </button>
          {current?.installed && (
            <button className="link-button link-button--danger" onClick={remove} disabled={busy}>Quitar sensor</button>
          )}
        </div>
      )}
    </section>
  );
}

const REPORT_REFRESH_MS = 60_000;

/** What the sensor saw in its latest report, with the same view Mi Wi-Fi uses for the agent of a home. */
function SensorReport({ network, canManage }: { network: Network; canManage: boolean }) {
  const overview = useApi(() => api.sensorOverview(network.id), [network.id, network.lastCollectedAt]);
  const { reload } = overview;
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) reload();
    }, REPORT_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [reload]);
  const data = overview.data;
  if (overview.error) return <p className="notice notice--error" role="alert">{overview.error}</p>;
  if (!data?.latest) return null;
  return (
    <div className="sensor__report">
      <AgentReports overview={data} latest={data.latest} onChange={reload} team canManage={canManage}
                    updateDevice={(id, change) => api.updateSensorDevice(network.id, id, change)}
                    loadHistory={(id) => api.sensorDeviceSessions(network.id, id)}
                    identify={() => api.identifySensorDevice(network.id)} />
    </div>
  );
}

function SensorState({ status }: { status: SensorStatus }) {
  const now = useNow(30_000);
  const badge = sensorBadge(status, now);
  return (
    <dl className="sensor__facts">
      <div><dt>Estado</dt><dd><span className={`badge badge--${badge.tone}`}>{badge.label}</span></dd></div>
      <div><dt>Último reporte</dt><dd>{status.lastSeenAt ? formatDateTime(status.lastSeenAt) : 'Todavía ninguno'}</dd></div>
      <div><dt>Agente</dt><dd>{status.agentVersion ? `${status.agentVersion} · ${status.platform ?? ''}` : '—'}</dd></div>
      <div><dt>Instalado</dt><dd>{formatDateTime(status.installedAt)} · clave {status.keyPrefix}…</dd></div>
    </dl>
  );
}

/** The 8-character code and the three steps, as in Mi Wi-Fi. */
function SensorPairing({ pairing, onRenew, busy }: { pairing: AgentPairingCode; onRenew: () => void; busy: boolean }) {
  const now = useNow(1000);
  const left = Math.max(0, Math.floor((new Date(pairing.expiresAt).getTime() - now.getTime()) / 1000));
  const expired = left === 0;
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return (
    <div className="agent__pairing" role="region" aria-label="Instalar el sensor">
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
          En un computador con Windows <strong>conectado a esta red</strong> (que quede encendido),{' '}
          <a className="button button--quiet" href={AGENT_INSTALLER}><Icon name="download" size={16} /> descarga el instalador</a>
          {' '}y ábrelo. Si Windows muestra «Windows protegió su PC», pulsa <strong>Más información → Ejecutar de todas formas</strong>.
        </li>
        <li>Escribe este código en la ventana del agente y deja marcada la opción de iniciar con Windows.</li>
        <li>Pulsa <strong>Instalar</strong>. En unos segundos este panel dirá «Conectado» y llegará la primera medición.</li>
      </ol>
      <p className="agent__waiting"><span className="agent__pulse" aria-hidden="true" /> Esperando el primer reporte del sensor…</p>
    </div>
  );
}
