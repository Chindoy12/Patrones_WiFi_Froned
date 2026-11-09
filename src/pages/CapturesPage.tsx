import { type FormEvent, type MouseEvent, useEffect, useRef, useState } from 'react';
import {
  bytesOrUnknown, captureFormErrors, captureStatusLabel, captureStatusTone, droppedText, formatCount,
  isCaptureActive, percent, scenarioStatusLabel, share, timeline,
} from '../capture';
import { DataState } from '../components/DataState';
import { FindingList } from '../components/FindingList';
import { FunctionGuide } from '../components/FunctionGuide';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { formatDateTime } from '../format';
import { errorMessage, useApi } from '../hooks/useApi';
import { api } from '../services/api';
import type { Capture, CaptureCapabilities, CaptureDetail, Network } from '../types';

/** While a capture waits or runs, the page asks every few seconds. */
const FOLLOW_MS = 3_000;

/**
 * Technical captures of the team networks (ADMIN only: the backend refuses everyone else and leaves it in the audit).
 * The page says before anything else what a capture can and cannot see, every reason that blocks it, and asks for the
 * authorized purpose. Results are counts of headers: never an address, a MAC or the content of a packet.
 */
export function CapturesPage() {
  const networks = useApi(api.networks);
  const sensed = (networks.data ?? []).filter((n) => n.dataSourceType === 'AGENT');
  const [chosen, setChosen] = useState<number | null>(null);
  const network = sensed.find((n) => n.id === chosen) ?? sensed[0] ?? null;

  return (
    <>
      <PageHeader title="Capturas técnicas"
                  description="Estadísticas del tráfico que ve el sensor de una red del equipo, con un propósito autorizado."
                  actions={sensed.length > 1 && network && (
                    <label className="field field--inline"><span>Red</span>
                      <select value={network.id} onChange={(e) => setChosen(Number(e.target.value))}>
                        {sensed.map((n) => <option key={n.id} value={n.id}>{n.ssid}</option>)}
                      </select>
                    </label>
                  )} />
      <DataState {...networks} empty="Todavía no hay redes del equipo.">
        {() => (network ? <NetworkCaptures key={network.id} network={network} /> : (
          <section className="panel">
            <p className="muted">Ninguna red del equipo tiene sensor. Conecta uno en Redes para poder capturar.</p>
          </section>
        ))}
      </DataState>
      <FunctionGuide />
    </>
  );
}

function NetworkCaptures({ network }: { network: Network }) {
  const capabilities = useApi(() => api.captureCapabilities(network.id), [network.id]);
  const history = useApi(() => api.captures(network.id), [network.id]);
  const [openId, setOpenId] = useState<number | null>(null);
  const active = (history.data ?? []).find(isCaptureActive) ?? null;
  const reloadHistory = history.reload;
  const reloadCapabilities = capabilities.reload;

  // A capture just finished: what blocked a new one ("ya hay una captura en curso") is checked again.
  const wasActive = useRef(false);
  useEffect(() => {
    if (wasActive.current && !active) reloadCapabilities();
    wasActive.current = active !== null;
  }, [active, reloadCapabilities]);

  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => {
      if (!document.hidden) reloadHistory();
    }, FOLLOW_MS);
    return () => window.clearInterval(timer);
  }, [active, reloadHistory]);

  function changed(capture?: Capture) {
    reloadHistory();
    reloadCapabilities();
    if (capture) setOpenId(capture.id);
  }

  return (
    <div className="captures">
      <DataState {...capabilities}>
        {(caps) => (
          <>
            <Readiness caps={caps} />
            <CaptureForm network={network} caps={caps} active={active !== null} onRequested={changed} />
          </>
        )}
      </DataState>
      <section className="panel" aria-labelledby="captures-history">
        <h2 id="captures-history">Capturas de {network.ssid}</h2>
        <DataState {...history} empty="Esta red todavía no tiene capturas.">
          {(rows) => (
            <div className="table-scroll">
              <table className="table table--clickable captures__table" aria-label="Capturas">
                <thead>
                  <tr><th>Pedida</th><th>Propósito</th><th>Estado</th><th>Herramienta</th><th>Paquetes</th><th /></tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} aria-selected={openId === c.id} tabIndex={0}
                        onClick={() => setOpenId(c.id)} onKeyDown={(e) => e.key === 'Enter' && setOpenId(c.id)}>
                      <td className="table__nowrap">{formatDateTime(c.requestedAt)}</td>
                      <td>{c.purpose}</td>
                      <td className="table__nowrap">
                        <span className={`badge badge--${captureStatusTone[c.status]}`}>{captureStatusLabel[c.status]}</span>
                        {c.status === 'FAILED' && c.failureMessage && <span className="table__sub">{c.failureMessage}</span>}
                      </td>
                      <td>{c.captureToolLabel ?? '—'}</td>
                      <td className="num">{formatCount(c.packetCount)}</td>
                      <td>
                        {isCaptureActive(c) && <CancelButton network={network} capture={c} onDone={() => changed()} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DataState>
      </section>
      {openId !== null && <CaptureDetailPanel network={network} captureId={openId}
                                              refreshKey={history.data?.find((c) => c.id === openId)?.status} />}
    </div>
  );
}

function Readiness({ caps }: { caps: CaptureCapabilities }) {
  return (
    <section className="panel captures__readiness" aria-labelledby="readiness-title">
      <div className="captures__head">
        <h2 id="readiness-title">¿Se puede capturar ahora?</h2>
        <span className={`badge badge--${caps.canCapture ? 'good' : 'bad'}`}>
          {caps.canCapture ? 'Sí' : 'No'}
        </span>
      </div>
      {caps.blockers.length > 0 && (
        <ul className="captures__blockers" aria-label="Lo que impide capturar">
          {caps.blockers.map((b) => <li key={b}><Icon name="cross" size={14} /> {b}</li>)}
        </ul>
      )}
      <p className="muted small">
        Sensor {caps.sensorOnline ? 'conectado' : 'sin conexión'}
        {caps.agentVersion && ` · agente ${caps.agentVersion}`}
        {caps.platform && ` · ${caps.platform}`}
        {caps.lastReportAt && ` · último reporte ${formatDateTime(caps.lastReportAt)}`}
        {caps.elevated !== null && ` · ${caps.elevated ? 'corre como administrador' : 'sin permisos de administrador'}`}
      </p>
      <ul className="captures__tools" aria-label="Herramientas de captura">
        {caps.tools.map((t) => (
          <li key={t.code}>
            <span className={`badge badge--${t.available ? 'good' : 'neutral'}`}>{t.available ? 'Lista' : 'No'}</span>
            <span><strong>{t.label}.</strong> <span className="muted">{t.note}</span></span>
          </li>
        ))}
      </ul>
      <h3>Qué puede ver una captura</h3>
      <ul className="captures__scenarios">
        {caps.scenarios.map((s) => (
          <li key={s.code}>
            <strong>{s.title}</strong>
            <span className={`badge badge--${s.status === 'AVAILABLE' ? 'good' : 'neutral'}`}>
              {scenarioStatusLabel[s.status]}
            </span>
            <p className="muted small">{s.explanation}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CaptureForm({ network, caps, active, onRequested }: { network: Network; caps: CaptureCapabilities;
  active: boolean; onRequested: (capture: Capture) => void }) {
  const [purpose, setPurpose] = useState('');
  const [seconds, setSeconds] = useState(caps.limits.defaultSeconds);
  const [packets, setPackets] = useState(caps.limits.defaultPackets);
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const problems = captureFormErrors(purpose, seconds, packets, caps.limits);
  const blocked = !caps.canCapture || active;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTried(true);
    if (problems.length > 0 || !authorized || blocked) return;
    setBusy(true);
    setError(null);
    try {
      const capture = await api.requestCapture(network.id, { purpose: purpose.trim(), maxSeconds: seconds,
        maxPackets: packets });
      setPurpose('');
      setAuthorized(false);
      setTried(false);
      onRequested(capture);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="capture-form-title">
      <h2 id="capture-form-title">Pedir una captura</h2>
      <form className="form-grid captures__form" onSubmit={submit} noValidate>
        <div className="field captures__purpose">
          <label htmlFor="capture-purpose">Propósito autorizado</label>
          <textarea id="capture-purpose" value={purpose} maxLength={200} rows={2} aria-describedby="capture-purpose-hint"
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Por ejemplo: revisar por qué la red del laboratorio está lenta en las tardes" />
          <small id="capture-purpose-hint" className="muted">Queda guardado con la captura y en la auditoría.</small>
        </div>
        <div className="field">
          <label htmlFor="capture-seconds">Duración (segundos)</label>
          <input id="capture-seconds" type="number" min={5} max={caps.limits.maxSeconds} value={seconds}
                 aria-describedby="capture-seconds-hint" onChange={(e) => setSeconds(Number(e.target.value))} />
          <small id="capture-seconds-hint" className="muted">Máximo {caps.limits.maxSeconds} s.</small>
        </div>
        <div className="field">
          <label htmlFor="capture-packets">Paquetes como máximo</label>
          <input id="capture-packets" type="number" min={100} max={caps.limits.maxPackets} value={packets}
                 aria-describedby="capture-packets-hint" onChange={(e) => setPackets(Number(e.target.value))} />
          <small id="capture-packets-hint" className="muted">Y como mucho {bytesOrUnknown(caps.limits.maxBytes)}.</small>
        </div>
        <label className="captures__authorize">
          <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />
          <span>Confirmo que esta red es del equipo WiFiSense y que la captura tiene un propósito autorizado. Solo se
            cuentan cabeceras del tráfico del computador del sensor y de la difusión de la red.</span>
        </label>
        {tried && (problems.length > 0 || !authorized) && (
          <ul className="notice notice--error captures__errors" role="alert">
            {problems.map((p) => <li key={p}>{p}</li>)}
            {!authorized && <li>Confirma que la captura está autorizada.</li>}
          </ul>
        )}
        {error && <p className="notice notice--error" role="alert">{error}</p>}
        <div className="captures__submit">
          <button className="button" type="submit" disabled={busy || blocked}>
            <Icon name="play" size={16} /> {busy ? 'Pidiendo…' : 'Pedir captura'}
          </button>
          {active && <span className="muted small">Ya hay una captura en curso en esta red.</span>}
          {!caps.canCapture && !active && <span className="muted small">Resuelve lo de arriba para poder capturar.</span>}
        </div>
      </form>
    </section>
  );
}

function CancelButton({ network, capture, onDone }: { network: Network; capture: Capture; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function cancel(event: MouseEvent) {
    event.stopPropagation();
    setBusy(true);
    try {
      await api.cancelCapture(network.id, capture.id);
    } finally {
      setBusy(false);
      onDone();
    }
  }
  return (
    <button className="button button--quiet" onClick={cancel} disabled={busy || capture.cancelRequested}>
      {capture.cancelRequested ? 'Deteniendo…' : 'Detener'}
    </button>
  );
}

function CaptureDetailPanel({ network, captureId, refreshKey }: { network: Network; captureId: number;
  refreshKey?: string }) {
  const detail = useApi(() => api.captureDetail(network.id, captureId), [network.id, captureId, refreshKey]);
  return (
    <section className="panel capture-detail" aria-labelledby="capture-detail-title">
      <h2 id="capture-detail-title">Captura #{captureId}</h2>
      <DataState {...detail}>{(d) => <CaptureResult detail={d} />}</DataState>
    </section>
  );
}

export function CaptureResult({ detail }: { detail: CaptureDetail }) {
  const c = detail.capture;
  if (c.status !== 'COMPLETED') {
    return (
      <p className={`notice${c.status === 'FAILED' ? ' notice--error' : ''}`} role="status">
        <span className={`badge badge--${captureStatusTone[c.status]}`}>{captureStatusLabel[c.status]}</span>{' '}
        {c.failureMessage ?? (isCaptureActive(c)
          ? 'Los resultados aparecen aquí cuando el sensor entregue la captura.' : 'Esta captura no tiene resultados.')}
      </p>
    );
  }
  const t = detail.totals;
  const seconds = timeline(detail);
  const peak = Math.max(1, ...seconds.map((s) => s.packets));
  return (
    <div className="capture-result">
      <p className="muted small capture-result__scope"><Icon name="shield" size={14} /> {detail.scope}</p>
      <p>
        <strong>{c.purpose}</strong>
        <span className="muted"> · {c.captureToolLabel}{c.interfaceName && ` (${c.interfaceName})`}
          {c.durationMs !== null && ` · ${(c.durationMs / 1000).toFixed(1)} s`} · {c.stopMessage}</span>
      </p>
      <dl className="capture-result__totals">
        <div><dt>Paquetes</dt><dd>{formatCount(t.packets)}</dd></div>
        <div><dt>Bytes</dt><dd>{bytesOrUnknown(t.bytes)}</dd></div>
        <div><dt>Entrada / salida</dt><dd>{bytesOrUnknown(t.inboundBytes)} / {bytesOrUnknown(t.outboundBytes)}</dd></div>
        <div><dt>Difusión</dt><dd>{formatCount(t.broadcast)} <small>({share(t.broadcast, t.packets)})</small></dd></div>
        <div><dt>Multidifusión</dt><dd>{formatCount(t.multicast)}</dd></div>
        <div><dt>Equipos locales / remotos</dt><dd>{formatCount(t.localHosts)} / {formatCount(t.remoteHosts)}</dd></div>
        <div><dt>Ilegibles</dt><dd>{formatCount(t.malformed)}</dd></div>
      </dl>
      <p className="muted small">{droppedText(detail)}</p>

      <div className="grid-2">
        <div>
          <h3>Protocolos</h3>
          <ul className="capture-result__bars" aria-label="Paquetes por protocolo">
            {detail.protocols.map((p) => (
              <li key={p.protocol}>
                <span>{p.protocol}</span>
                <span className="capture-result__bar"><i style={{ width: `${Math.max(1, percent(p.packets, t.packets))}%` }} /></span>
                <span className="num">{share(p.packets, t.packets)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Servicios más usados</h3>
          {detail.ports.length === 0 ? <p className="muted">Sin servicios identificables.</p> : (
            <table className="table" aria-label="Servicios más usados">
              <thead><tr><th>Servicio</th><th>Paquetes</th><th>Bytes</th></tr></thead>
              <tbody>
                {detail.ports.map((p) => (
                  <tr key={`${p.transport}${p.port}`}>
                    <td>{p.service ?? `${p.transport} ${p.port}`}<span className="table__sub">{p.transport} {p.port}</span></td>
                    <td className="num">{formatCount(p.packets)}</td>
                    <td className="num">{bytesOrUnknown(p.bytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {seconds.length > 0 && (
        <>
          <h3>Paquetes por segundo</h3>
          <div className="capture-result__timeline" role="img"
               aria-label={`Paquetes por segundo durante ${seconds.length} segundos; el máximo fue ${peak}`}>
            {seconds.map((s) => (
              <i key={s.second} style={{ height: `${Math.max(2, (100 * s.packets) / peak)}%` }}
                 title={`Segundo ${s.second}: ${s.packets} paquetes`} />
            ))}
          </div>
        </>
      )}

      <p className="muted small">
        {c.analyzedWith === 'AI' ? 'Analizada por la IA de WiFiSense.'
          : 'Analizada con las reglas del backend: la IA no estaba disponible.'}
      </p>
      <FindingList kind="facts" findings={detail.observed} empty="Nada que destacar en lo medido." />
      <FindingList kind="inferences" findings={detail.inferred} empty="No hay nada que explicar." />
    </div>
  );
}
