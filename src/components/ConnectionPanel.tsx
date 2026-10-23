import { useState } from 'react';
import { formatDateTime, formatNumber } from '../format';
import { errorMessage, useApi } from '../hooks/useApi';
import { gradeStatus, metricOf, metricStatus, metricWord } from '../quality';
import { api } from '../services/api';
import { runSpeedTest, type SpeedTestPhase } from '../services/speedTest';
import type { ConnectionTest, HomeNetwork } from '../types';
import { Gauge } from './Gauge';
import { Icon } from './Icon';

type Phase = SpeedTestPhase | 'grading';

const PHASE_TEXT: Record<Phase, string> = {
  latency: 'Midiendo la latencia…',
  download: 'Midiendo la velocidad de bajada…',
  upload: 'Midiendo la velocidad de subida…',
  grading: 'Calificando tu conexión…',
};

/** Dashboard of one network of the user: the quality gauge, the connection test and what the result means. */
export function ConnectionPanel({ network, onTested }: { network: HomeNetwork; onTested?: (test: ConnectionTest) => void }) {
  const history = useApi(() => api.myTests(network.id), [network.id]);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = history.data?.[0] ?? null;
  const quality = latest?.quality ?? null;

  async function run() {
    setError(null);
    try {
      const measured = await runSpeedTest(setPhase);
      setPhase('grading');
      const saved = await api.saveMyTest(network.id, measured);
      onTested?.(saved);
      history.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPhase(null);
    }
  }

  const caption = quality?.gradeLabel ?? (latest ? 'Sin calificación' : 'Sin pruebas');
  const latency = metricOf(quality, 'latency');
  const jitter = metricOf(quality, 'jitter');

  return (
    <div className="dash">
      <section className="dash__card dash__card--hero" aria-labelledby="quality-title">
        <h2 className="dash__title" id="quality-title"><Icon name="wifi" size={18} /> Calidad de «{network.name}»</h2>
        <Gauge percent={quality?.score ?? null} value={quality ? String(quality.score) : '—'} label="Calidad de 0 a 100"
               status={gradeStatus(latest?.qualityGrade)} caption={caption} />
        <button className="button button--big" onClick={run} disabled={phase !== null}>
          <Icon name="play" size={16} /> {phase ? 'Probando…' : 'Probar mi conexión'}
        </button>
        <p className="muted small" role="status" aria-live="polite">
          {phase ? PHASE_TEXT[phase] : 'Mide tu conexión hasta el servidor de WiFiSense; usa como máximo 16 MB de datos.'}
        </p>
        {error && <p className="notice notice--error" role="alert">{error}</p>}
        {latest && !quality && (
          <p className="notice">El servicio de análisis no estaba disponible: guardamos tus mediciones, pero sin calificación.</p>
        )}
        <p className="dash__foot">
          <Icon name="clock" size={16} /> {latest ? `Última prueba: ${formatDateTime(latest.createdAt)}` : 'Aún no has probado esta red.'}
        </p>
      </section>

      <section className="dash__card" aria-labelledby="response-title">
        <h2 className="dash__title" id="response-title"><Icon name="gauge" size={18} /> Respuesta</h2>
        <div className="dash__pair">
          <Gauge size="sm" percent={latency?.score ?? null} value={latest ? formatNumber(latest.latencyMs, 0) : '—'}
                 unit="ms" label="Latencia" status={latency ? metricStatus[latency.status] : 'none'}
                 caption={latency ? metricWord[latency.status] : 'Sin datos'} />
          <Gauge size="sm" percent={jitter?.score ?? null} value={latest ? formatNumber(latest.jitterMs, 0) : '—'}
                 unit="ms" label="Jitter" status={jitter ? metricStatus[jitter.status] : 'none'}
                 caption={jitter ? metricWord[jitter.status] : 'Sin datos'} />
        </div>
      </section>

      <section className="dash__card" aria-labelledby="speed-title">
        <h2 className="dash__title" id="speed-title"><Icon name="arrowDown" size={18} /> Velocidad</h2>
        <Speed test={latest} contracted={network.contractedMbps} />
      </section>

      <section className="dash__card" aria-labelledby="uses-title">
        <h2 className="dash__title" id="uses-title"><Icon name="check" size={18} /> ¿Para qué alcanza?</h2>
        {quality ? (
          <ul className="uses">
            {quality.activities.map((a) => (
              <li key={a.activity} className={`uses__item uses__item--${a.suitable === null ? 'unknown' : a.suitable ? 'yes' : 'no'}`}>
                <Icon name={a.suitable === null ? 'minus' : a.suitable ? 'check' : 'cross'} size={16} />
                <span>{a.label}</span>
                <strong>{a.suitable === null ? 'Sin datos' : a.suitable ? 'Sí' : 'No'}</strong>
              </li>
            ))}
          </ul>
        ) : <p className="muted">Haz una prueba para saber si tu conexión alcanza para videollamadas, video y juegos.</p>}
      </section>

      <section className="dash__card" aria-labelledby="tips-title">
        <h2 className="dash__title" id="tips-title"><Icon name="ai" size={18} /> Consejos para tu conexión</h2>
        {quality && quality.tips.length > 0 && <ul className="tips">{quality.tips.map((t) => <li key={t}>{t}</li>)}</ul>}
        {quality && quality.tips.length === 0 && <p>Tu conexión está muy bien: no hace falta cambiar nada.</p>}
        {!quality && <p className="muted">Los consejos aparecen cuando se califica una prueba.</p>}
      </section>

      <section className="dash__card dash__card--full" aria-labelledby="history-title">
        <h2 className="dash__title" id="history-title"><Icon name="history" size={18} /> Últimas pruebas</h2>
        {history.data && history.data.length > 0 ? (
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>Fecha</th><th>Calidad</th><th>Bajada</th><th>Subida</th><th>Latencia</th><th>Jitter</th></tr></thead>
              <tbody>
                {history.data.map((t) => (
                  <tr key={t.id}>
                    <td>{formatDateTime(t.createdAt)}</td>
                    <td>{t.quality ? `${t.quality.score} · ${t.quality.gradeLabel}` : 'Sin calificación'}</td>
                    <td className="num">{formatNumber(t.downloadMbps, 1, ' Mbps')}</td>
                    <td className="num">{formatNumber(t.uploadMbps, 1, ' Mbps')}</td>
                    <td className="num">{formatNumber(t.latencyMs, 0, ' ms')}</td>
                    <td className="num">{formatNumber(t.jitterMs, 0, ' ms')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted">{history.loading ? 'Cargando…' : 'Todavía no hay pruebas en esta red.'}</p>}
      </section>
    </div>
  );
}

function Speed({ test, contracted }: { test: ConnectionTest | null; contracted: number | null }) {
  const ratio = test && contracted ? test.downloadMbps / contracted : null;
  return (
    <div className="tiles tiles--stack">
      <div className="tile">
        <span className="tile__label"><Icon name="arrowDown" size={15} /> Bajada</span>
        <strong className="tile__value">{test ? formatNumber(test.downloadMbps, 1) : '—'}{test && <small>Mbps</small>}</strong>
        {ratio !== null && (
          <>
            <span className="meter" role="img" aria-label={`${Math.round(ratio * 100)} % de lo contratado`}>
              <span style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
            </span>
            <span className="tile__note">{Math.round(ratio * 100)} % de los {contracted} Mbps contratados</span>
          </>
        )}
        {test && !contracted && <span className="tile__note">Indica la velocidad contratada para compararla.</span>}
      </div>
      <div className="tile">
        <span className="tile__label"><Icon name="arrowUp" size={15} /> Subida</span>
        <strong className="tile__value">{test ? formatNumber(test.uploadMbps, 1) : '—'}{test && <small>Mbps</small>}</strong>
      </div>
    </div>
  );
}
