import { DataState } from '../components/DataState';
import { PageHeader } from '../components/PageHeader';
import { anomalyTypeLabel, formatNumber, formatPercent } from '../format';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import type { AiModelOverview, AnomalyType, ModelEvaluation } from '../types';

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

function ModelPanel({ overview }: { overview: AiModelOverview }) {
  const { model } = overview;
  const claude = model.recommendationEngine !== 'reglas';
  return (
    <section className="panel">
      <h2>En producción</h2>
      <dl className="details">
        <div><dt>Algoritmo</dt><dd>{algorithmLabel(model.algorithm)}</dd></div>
        <div><dt>Versión</dt><dd>{model.modelVersion}</dd></div>
        <div><dt>Umbral de anomalía</dt><dd className="num">{formatNumber(model.threshold, 3)}</dd></div>
        <div><dt>Variables</dt><dd>{model.features.map((f) => FEATURE_LABELS[f] ?? f).join(', ')}</dd></div>
        <div><dt>Entrenado con</dt><dd>{model.trainedOn}</dd></div>
        <div><dt>Recomendaciones</dt><dd>{claude ? `Claude (${model.recommendationEngine})` : 'Reglas del sistema'}</dd></div>
      </dl>
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
