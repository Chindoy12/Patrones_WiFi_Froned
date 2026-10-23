import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { DataState } from '../components/DataState';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { anomalyTypeLabel, formatDateTime, formatNumber, formatPercent } from '../format';
import { errorMessage, useApi } from '../hooks/useApi';
import { api } from '../services/api';
import type { AiModelOverview, AiModelVersion, AiTrainingStatus, AnomalyType, ModelEvaluation, TrainingMetrics } from '../types';

const FEATURE_LABELS: Record<string, string> = {
  latency: 'Latencia', jitter: 'Jitter', packet_loss: 'Pérdida de paquetes', bandwidth: 'Ancho de banda',
  signal_strength: 'Intensidad de señal', traffic_volume: 'Volumen de tráfico', connected_devices: 'Dispositivos conectados',
  packet_count: 'Cantidad de paquetes',
};

const ALGORITHM_LABELS: Record<string, string> = {
  IsolationForest: 'Isolation Forest', LocalOutlierFactor: 'Local Outlier Factor', OneClassSVM: 'One-Class SVM',
};

const algorithmLabel = (name: string) => ALGORITHM_LABELS[name] ?? name;

/** Team view of the AI: what runs in production and how it compares with other algorithms. */
export function AiModelPage() {
  const overview = useApi(api.aiModel);
  return (
    <>
      <PageHeader title="Modelo de IA"
                  description="Cómo detecta anomalías el sistema y cómo se compara con otros algoritmos." />
      <DataState {...overview}>
        {(data) => (
          <>
            <ModelPanel overview={data} />
            <TechniquesPanel />
            <TrainingPanel onTrained={overview.reload} />
            {data.evaluation ? <EvaluationPanels evaluation={data.evaluation} /> : (
              <section className="panel">
                <p className="notice" role="status">
                  La evaluación se está calculando en el servicio de IA (tarda unos segundos después de reiniciarlo).
                </p>
                <button className="button button--quiet" onClick={overview.reload}>Actualizar</button>
              </section>
            )}
          </>
        )}
      </DataState>
    </>
  );
}

/** What each answer of the AI service really is: only the anomaly detection is machine learning. */
const TECHNIQUES: { result: string; technique: string; kind: 'ml' | 'rules' | 'external' }[] = [
  { result: '¿La medición es anómala? y su puntaje', technique: 'Isolation Forest (aprendizaje automático no supervisado)', kind: 'ml' },
  { result: 'Severidad (baja, media, alta)', technique: 'Regla sobre el puntaje del modelo', kind: 'rules' },
  { result: 'Causa probable (congestión, interferencia…)', technique: 'Firmas de cada falla: es una hipótesis, no una confirmación', kind: 'rules' },
  { result: 'Recomendación de una anomalía', technique: 'Reglas; Claude si está configurado (si falla, se usan las reglas)', kind: 'external' },
  { result: 'Calidad de la conexión (0 a 100)', technique: 'Curvas por métrica', kind: 'rules' },
  { result: 'Auditoría de seguridad', technique: 'Cifrado, puertos del router y equipos nuevos', kind: 'rules' },
  { result: 'Mejor canal Wi-Fi', technique: 'Redes vecinas por canal y solapamiento', kind: 'rules' },
];

const KIND_TAG = { ml: 'Aprendizaje automático', rules: 'Reglas', external: 'Reglas o servicio externo' } as const;

export function TechniquesPanel() {
  return (
    <section className="panel" aria-labelledby="techniques-title">
      <h2 id="techniques-title">Qué es aprendizaje automático y qué son reglas</h2>
      <p className="muted">No todo lo que responde el servicio de IA es un modelo entrenado. Así se calcula cada resultado:</p>
      <div className="table-scroll">
        <table className="table">
          <thead><tr><th>Resultado</th><th>Cómo se obtiene</th><th>Tipo</th></tr></thead>
          <tbody>
            {TECHNIQUES.map((t) => (
              <tr key={t.result}>
                <td>{t.result}</td>
                <td>{t.technique}</td>
                <td><span className={`tag${t.kind === 'ml' ? ' tag--accent' : ''}`}>{KIND_TAG[t.kind]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ModelPanel({ overview }: { overview: AiModelOverview }) {
  const { model } = overview;
  const claude = model.recommendationEngine !== 'reglas';
  return (
    <section className="panel">
      <h2>En producción</h2>
      <dl className="details">
        <div><dt>Algoritmo</dt><dd>{algorithmLabel(model.algorithm)}</dd></div>
        <div><dt>Versión</dt><dd>{model.modelVersion}{' '}
          <span className={`tag${model.realData ? ' tag--accent' : ''}`}>{model.realData ? 'Datos reales' : 'Datos sintéticos'}</span></dd></div>
        <div><dt>Umbral de anomalía</dt><dd className="num">{formatNumber(model.threshold, 3)}</dd></div>
        <div><dt>Variables</dt><dd>{model.features.map((f) => FEATURE_LABELS[f] ?? f).join(', ')}</dd></div>
        <div><dt>Entrenado con</dt><dd>{model.trainedOn}{model.trainedAt ? ` (${formatDateTime(model.trainedAt)})` : ''}</dd></div>
        <div><dt>Recomendaciones</dt><dd>{claude ? `Claude (${model.recommendationEngine})` : 'Reglas del sistema'}</dd></div>
      </dl>
    </section>
  );
}

function Pair({ candidate, current, metric }: {
  candidate?: TrainingMetrics | null; current?: TrainingMetrics | null; metric: 'f1' | 'falsePositiveRate';
}) {
  const show = (m?: TrainingMetrics | null) => (!m ? '—' : metric === 'f1' ? formatNumber(m.f1, 2) : formatPercent(m.falsePositiveRate));
  return <span className="num">{show(candidate)} <span className="muted small">vs {show(current)}</span></span>;
}

/**
 * Training with real measurements: how much data there is, "Entrenar ahora" for an administrator, and every version
 * with its metrics against the model that was in use and whether it replaced it.
 */
export function TrainingPanel({ onTrained }: { onTrained: () => void }) {
  const { can } = useAuth();
  const status = useApi(api.aiTraining);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AiModelVersion | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function train() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.trainAi());
      status.reload();
      onTrained();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="training-title">
      <h2 id="training-title">Entrenamiento con datos reales</h2>
      <DataState {...status}>
        {(t: AiTrainingStatus) => (
          <>
            <p className="muted">
              {t.available.samples > 0 ? (
                <>Hay <strong>{t.available.samples.toLocaleString('es-CO')}</strong> mediciones reales de los últimos 30
                  días ({t.available.teamSamples.toLocaleString('es-CO')} de sensores del equipo y{' '}
                  {t.available.homeSamples.toLocaleString('es-CO')} de agentes de Mi Wi-Fi) de {t.available.networks}{' '}
                  {t.available.networks === 1 ? 'red' : 'redes'}
                  {t.available.from && t.available.to ? ` (${formatDateTime(t.available.from)} – ${formatDateTime(t.available.to)})` : ''}.</>
              ) : 'Todavía no hay mediciones reales: llegan cuando los sensores y agentes empiezan a reportar.'}
              {' '}Se necesitan al menos {t.minimumSamples}. El modelo nuevo se compara con el que está en uso y solo lo
              reemplaza si es mejor. Solo se usan los números de cada medición, nunca la red ni los equipos.
            </p>
            {!t.canTrain && t.available.samples > 0 && (
              <div className="bar" role="img" aria-label={`${t.available.samples} de ${t.minimumSamples}`}>
                <span className="bar__fill" style={{ width: `${Math.min(t.available.samples / t.minimumSamples, 1) * 100}%` }} />
                <span className="bar__value num">{t.available.samples} / {t.minimumSamples}</span>
              </div>
            )}
            <div className="training__actions">
              {can('ADMIN') && (
                <button className="button" onClick={train} disabled={busy || !t.canTrain}>
                  <Icon name="ai" size={16} /> {busy ? 'Entrenando…' : 'Entrenar ahora'}
                </button>
              )}
              {t.nextAutomatic && (
                <span className="muted small">Entrenamiento automático: {formatDateTime(t.nextAutomatic)}</span>
              )}
            </div>
            {error && <p className="notice notice--error" role="alert">{error}</p>}
            {result && (
              <p className={`notice${result.decision === 'PROMOTED' ? ' notice--info' : ''}`} role="status">
                <strong>{result.decision === 'PROMOTED' ? `Nuevo modelo en uso: ${result.version}.` : 'Se sigue usando el modelo actual.'}</strong>{' '}
                {result.reason}
              </p>
            )}
            {t.versions.length > 0 && (
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr><th>Versión</th><th>Fecha</th><th>Mediciones</th><th>F1 (nuevo vs anterior)</th>
                      <th>Falsas alarmas</th><th>Decisión</th></tr>
                  </thead>
                  <tbody>
                    {t.versions.map((v) => (
                      <tr key={v.id} className={v.active ? 'row--highlight' : undefined}>
                        <td><strong>{v.version}</strong>{v.active && <span className="tag tag--accent">En uso</span>}</td>
                        <td>{formatDateTime(v.trainedAt)}<br /><span className="muted small">{v.trainedBy ?? 'Automático'}</span></td>
                        <td className="num">{v.samples.toLocaleString('es-CO')} · {v.networks} {v.networks === 1 ? 'red' : 'redes'}</td>
                        <td><Pair candidate={v.metrics.candidate} current={v.metrics.current} metric="f1" /></td>
                        <td><Pair candidate={v.metrics.candidate} current={v.metrics.current} metric="falsePositiveRate" /></td>
                        <td title={v.reason}>
                          <span className={`badge badge--${v.decision === 'PROMOTED' ? 'good' : 'neutral'}`}>
                            {v.decision === 'PROMOTED' ? 'Aprobado' : 'Rechazado'}
                          </span>
                          <br /><span className="muted small">{v.reason}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </DataState>
    </section>
  );
}

function EvaluationPanels({ evaluation }: { evaluation: ModelEvaluation }) {
  const faults = Object.keys(evaluation.algorithms[0]?.recallByType ?? {}) as AnomalyType[];
  return (
    <>
      <section className="panel">
        <h2>Comparación de algoritmos</h2>
        <p className="muted">
          {evaluation.dataset} Entrenamiento: {evaluation.trainSamples} mediciones sanas; prueba: {evaluation.testNormal}
          {' '}sanas y {evaluation.testAnomalies} con falla.
        </p>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Algoritmo</th><th>Precisión</th><th>Recall</th><th>F1</th><th>Falsas alarmas</th><th>ROC-AUC</th>
                <th>Tiempo por medición</th>
              </tr>
            </thead>
            <tbody>
              {evaluation.algorithms.map((a) => (
                <tr key={a.algorithm} className={a.production ? 'row--highlight' : undefined}>
                  <td>
                    <strong>{algorithmLabel(a.algorithm)}</strong>
                    {a.production && <span className="tag tag--accent">En producción</span>}
                  </td>
                  <td className="num">{formatPercent(a.precision)}</td>
                  <td className="num">{formatPercent(a.recall)}</td>
                  <td className="num">{formatNumber(a.f1, 3)}</td>
                  <td className="num">{formatPercent(a.falsePositiveRate)}</td>
                  <td className="num">{formatNumber(a.rocAuc, 3)}</td>
                  <td className="num">{formatNumber(a.predictUsPerSample, 1, ' µs')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Fallas detectadas por tipo</h2>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr><th>Falla simulada</th>{evaluation.algorithms.map((a) => <th key={a.algorithm}>{algorithmLabel(a.algorithm)}</th>)}</tr>
            </thead>
            <tbody>
              {faults.map((fault) => (
                <tr key={fault}>
                  <td>{anomalyTypeLabel[fault] ?? fault}</td>
                  {evaluation.algorithms.map((a) => (
                    <td key={a.algorithm}><Bar ratio={a.recallByType[fault] ?? 0} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid-2">
        <section className="panel">
          <h2>Ajuste de Isolation Forest</h2>
          <p className="muted">Elegido con un conjunto de validación distinto al de prueba.</p>
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>Árboles</th><th>Muestras por árbol</th><th>F1</th><th>Falsas alarmas</th></tr></thead>
              <tbody>
                {evaluation.tuning.map((t) => (
                  <tr key={`${t.nEstimators}-${t.maxSamples}`} className={t.best ? 'row--highlight' : undefined}>
                    <td className="num">{t.nEstimators}</td>
                    <td>{t.maxSamples}</td>
                    <td className="num">{formatNumber(t.f1, 3)}{t.best && <span className="tag tag--accent">Elegido</span>}</td>
                    <td className="num">{formatPercent(t.falsePositiveRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <h2>Sensibilidad del umbral</h2>
          <p className="muted">Detectar más fallas cuesta más falsas alarmas.</p>
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>Contaminación</th><th>Recall</th><th>Falsas alarmas</th></tr></thead>
              <tbody>
                {evaluation.sensitivity.map((p) => (
                  <tr key={p.contamination} className={p.production ? 'row--highlight' : undefined}>
                    <td className="num">
                      {formatPercent(p.contamination, 0)}{p.production && <span className="tag tag--accent">Actual</span>}
                    </td>
                    <td className="num">{formatPercent(p.recall)}</td>
                    <td className="num">{formatPercent(p.falsePositiveRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="panel">
        <h2>Diagnóstico de la causa</h2>
        <p>
          De {evaluation.diagnosis.evaluated} fallas detectadas, la causa probable fue correcta en{' '}
          <strong>{formatPercent(evaluation.diagnosis.accuracy)}</strong>.
        </p>
      </section>
    </>
  );
}

function Bar({ ratio }: { ratio: number }) {
  return (
    <span className="bar" role="img" aria-label={formatPercent(ratio)}>
      <span className="bar__fill" style={{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%` }} />
      <span className="bar__value num">{formatPercent(ratio, 0)}</span>
    </span>
  );
}
