import { useEffect, useRef, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatNumber } from '../format';
import { errorMessage } from '../hooks/useApi';
import type { LivePoint, LiveState, LiveView } from '../types';
import { Icon } from './Icon';

export const LIVE_POLL_MS = 2000;
/** «En vivo» pauses by itself after 10 minutes so an open tab does not keep the agent measuring all day. */
export const LIVE_MAX_MS = 10 * 60 * 1000;
const MAX_POINTS = 150;  // 5 minutes, like the server
const MAX_ERRORS = 3;

const clock = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const formatClock = (iso: string) => clock.format(new Date(iso));

const STATE_TEXT: Record<LiveState, string> = {
  LIVE: 'En vivo',
  WAITING: 'Esperando al agente',
  NO_AGENT: 'El agente no responde',
};

const TOOLTIP = {
  contentStyle: {
    background: 'var(--surface-solid)', border: '1px solid var(--line-strong)', borderRadius: 10, color: 'var(--ink)',
    fontSize: 13, padding: '8px 12px',
  },
  labelStyle: { color: 'var(--muted)', marginBottom: 4 },
  cursor: { stroke: 'var(--line-strong)', strokeWidth: 1 },
};

type Load = (after: number) => Promise<LiveView>;

/**
 * «En vivo» (Avance 26): while it is on, the page asks every 2 seconds and the agent of the network measures every 2
 * seconds what its computer downloads and uploads at that moment, the latency to the router and to internet and the
 * Wi-Fi signal. It is the usage of this moment, not the capacity of the connection (that is «Probar mi conexión»),
 * and it spends no test data: the agent reads the counters of the network card.
 */
export function LivePanel({ load, team = false }: { load: Load; team?: boolean }) {
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [view, setView] = useState<LiveView | null>(null);
  const [points, setPoints] = useState<LivePoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const lastSeq = useRef(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!running) return undefined;
    let active = true;
    let busy = false;
    let errors = 0;
    let timer: number | undefined;
    const startedAt = Date.now();

    /** Stops asking at once (the effect ends on the next render, which may come later). */
    function finish() {
      active = false;
      window.clearInterval(timer);
      setRunning(false);
    }

    async function tick() {
      if (!active || busy || document.hidden) return;  // a hidden tab does not keep the agent measuring
      if (Date.now() - startedAt >= LIVE_MAX_MS) {
        finish();
        setPaused(true);
        return;
      }
      busy = true;
      try {
        const next = await loadRef.current(lastSeq.current);
        if (!active) return;
        errors = 0;
        setError(null);
        setView(next);
        if (next.lastSeq < lastSeq.current) {  // the server was redeployed: its numbering started again
          lastSeq.current = 0;
          setPoints([]);
          return;
        }
        if (next.points.length > 0) setPoints((previous) => [...previous, ...next.points].slice(-MAX_POINTS));
        lastSeq.current = next.lastSeq;
      } catch (e) {
        if (!active) return;
        errors += 1;
        setError(errorMessage(e));
        if (errors >= MAX_ERRORS) finish();
      } finally {
        busy = false;
      }
    }

    void tick();
    timer = window.setInterval(() => void tick(), LIVE_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [running]);

  function start() {
    lastSeq.current = 0;
    setPoints([]);
    setView(null);
    setError(null);
    setPaused(false);
    setRunning(true);
  }

  const latest = points[points.length - 1] ?? null;
  const summary = view?.summary ?? null;
  const state = view?.state ?? 'WAITING';
  const Heading = team ? 'h3' : 'h2';

  return (
    <section className={team ? 'live live--team' : 'eu-section live'} aria-labelledby="live-title">
      <div className="eu-section__head live__head">
        <Heading id="live-title">En vivo</Heading>
        {running && (
          <span className={`live__state live__state--${state.toLowerCase()}`} role="status">
            <i aria-hidden="true" /> {STATE_TEXT[state]}
          </span>
        )}
      </div>

      {!running && (
        <div className="live__intro">
          <p>
            Cada 2 segundos, lo que {team ? 'el computador del sensor' : 'el computador con el agente'} está bajando y
            subiendo en ese momento, la latencia hasta el router y hasta internet y la señal del Wi-Fi. No gasta datos
            de prueba: el agente lee los contadores de la tarjeta de red.
          </p>
          {paused && (
            <p className="notice" role="status">
              «En vivo» se pausó después de 10 minutos para no dejar al agente midiendo sin que nadie mire.
            </p>
          )}
          <button className="button" onClick={start}>
            <Icon name="play" size={16} /> {paused ? 'Seguir en vivo' : 'Ver en vivo'}
          </button>
        </div>
      )}

      {error && <p className="notice notice--error" role="alert">{error}</p>}

      {running && state === 'WAITING' && points.length === 0 && (
        <p className="live__waiting">
          <span className="agent__pulse" aria-hidden="true" /> Avisando al agente: empieza a medir en menos de 30
          segundos.
        </p>
      )}
      {running && state === 'NO_AGENT' && (
        <p className="notice notice--error" role="alert">
          El agente no responde. Revisa que el computador esté encendido y con internet, y que el agente sea la versión
          2.1.0 o más nueva (descárgalo otra vez y elige «Actualizar»).
        </p>
      )}

      {(running || points.length > 0) && (
        <>
          <div className="tiles tiles--4 live__now">
            <Now label="Bajando ahora" icon="arrowDown" value={latest?.downloadMbps} unit="Mbps" digits={2} />
            <Now label="Subiendo ahora" icon="arrowUp" value={latest?.uploadMbps} unit="Mbps" digits={2} />
            <Now label="Latencia a internet" icon="gauge" value={latest?.internetMs} unit="ms" digits={0}
                 lost={latest?.internetLost} />
            <Now label={team ? 'Latencia al router' : 'Latencia al router (o al celular)'} icon="router"
                 value={latest?.gatewayMs} unit="ms" digits={0} lost={latest?.gatewayLost} />
          </div>

          <div className="live__charts">
            <LiveChart title="Bajada y subida (Mbps)" points={points} series={[
              { key: 'downloadMbps', label: 'Bajada', color: 'var(--chart-1)' },
              { key: 'uploadMbps', label: 'Subida', color: 'var(--chart-2)' },
            ]} />
            <LiveChart title="Latencia (ms)" points={points} series={[
              { key: 'internetMs', label: 'Internet', color: 'var(--chart-1)' },
              { key: 'gatewayMs', label: 'Router', color: 'var(--good)' },
            ]} />
          </div>

          {summary && summary.samples > 0 && (
            <p className="live__summary">
              Último minuto: bajada promedio {formatNumber(summary.downloadMbps, 2, ' Mbps')} (pico{' '}
              {formatNumber(summary.peakDownloadMbps, 2, ' Mbps')}), subida {formatNumber(summary.uploadMbps, 2, ' Mbps')},
              latencia {formatNumber(summary.internetMs, 0, ' ms')}, jitter {formatNumber(summary.jitterMs, 0, ' ms')},
              pérdida {formatNumber(summary.lossPct, 1, ' %')}
              {summary.signalPercent !== null && <>, señal {summary.signalPercent} %</>}.
            </p>
          )}
          {summary && summary.notes.length > 0 && (
            <ul className="live__notes">
              {summary.notes.map((note) => (
                <li key={note.text} className={`live__note live__note--${note.level.toLowerCase()}`}>
                  <Icon name={note.level === 'OK' ? 'check' : 'anomaly'} size={16} /> <span>{note.text}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="live__foot muted small">
            Es lo que este computador usa ahora, no lo máximo que aguanta la conexión
            {team ? '' : ' (eso lo mide «Probar mi conexión»)'}. Solo se ve el tráfico de este computador, no el de los
            demás equipos de la red.
          </p>
          {running && (
            <button className="link-button" onClick={() => setRunning(false)}>Detener</button>
          )}
        </>
      )}
    </section>
  );
}

function Now({ label, icon, value, unit, digits, lost = false }: {
  label: string; icon: 'arrowDown' | 'arrowUp' | 'gauge' | 'router'; value: number | null | undefined; unit: string;
  digits: number; lost?: boolean;
}) {
  return (
    <div className="tile">
      <span className="tile__label"><Icon name={icon} size={15} /> {label}</span>
      <strong className="tile__value">
        {lost ? 'Sin respuesta' : formatNumber(value, digits)}
        {!lost && value !== null && value !== undefined && <small>{unit}</small>}
      </strong>
    </div>
  );
}

interface LiveSeries {
  key: 'downloadMbps' | 'uploadMbps' | 'internetMs' | 'gatewayMs';
  label: string;
  color: string;
}

/** The last 5 minutes, newest on the right; it moves as samples arrive. */
function LiveChart({ title, points, series }: { title: string; points: LivePoint[]; series: LiveSeries[] }) {
  return (
    <figure className="live__chart">
      <figcaption>
        {title}
        <span className="live__legend">
          {series.map((s) => (
            <span key={s.key}><i style={{ background: s.color }} aria-hidden="true" /> {s.label}</span>
          ))}
        </span>
      </figcaption>
      <div className="chart" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="2 6" vertical={false} />
            <XAxis dataKey="at" tickFormatter={formatClock} minTickGap={40} stroke="var(--muted)" fontSize={12}
                   tickLine={false} axisLine={{ stroke: 'var(--line)' }} />
            <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip labelFormatter={(v) => formatClock(String(v))} {...TOOLTIP} />
            {series.map((s) => (
              <Line key={s.key} dataKey={s.key} name={s.label} stroke={s.color} dot={false} strokeWidth={1.8}
                    connectNulls={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
