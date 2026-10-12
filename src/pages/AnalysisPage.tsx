import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { DataState } from '../components/DataState';
import { NetworkPicker } from '../components/NetworkPicker';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { anomalyTypeLabel, formatNumber, statusLabel } from '../format';
import { errorMessage, useApi } from '../hooks/useApi';
import { useNetworkSelection } from '../hooks/useNetworkSelection';
import { api } from '../services/api';
import type { AnalysisResult, AnalysisType } from '../types';

export function AnalysisPage() {
  const { can } = useAuth();
  const { networks, networkId, setNetworkId } = useNetworkSelection();
  const strategies = useApi(api.strategies);
  const [type, setType] = useState<AnalysisType>('ANOMALY_DETECTION');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!networkId) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await api.analyze(networkId, type));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Análisis" description="Evalúa el estado de una red con el método que elijas." />
      <div className="grid-2">
        <section className="panel">
          <NetworkPicker networks={networks.data ?? []} value={networkId} onChange={setNetworkId} />
          <fieldset className="choices">
            <legend>Método de análisis</legend>
            <DataState {...strategies}>
              {(rows) => rows.map((s) => (
                <label key={s.type} className="choice">
                  <input type="radio" name="strategy" checked={type === s.type} onChange={() => setType(s.type)} />
                  <span><strong>{statusLabel[s.type]}</strong><small>{s.description}</small></span>
                </label>
              ))}
            </DataState>
          </fieldset>
          {can('ADMIN', 'ANALYST') ? (
            <button className="button" onClick={run} disabled={busy || !networkId}>
              {busy ? 'Analizando…' : 'Ejecutar análisis'}
            </button>
          ) : (
            <p className="muted">Tu rol permite consultar resultados. Ejecutar análisis requiere rol Analista.</p>
          )}
          {error && <p className="notice notice--error" role="alert">{error}</p>}
        </section>
        <section className="panel">
          <h2>Resultado</h2>
          {result ? <ResultView result={result} /> : <p className="muted">Ejecuta un análisis para ver el resultado aquí.</p>}
        </section>
      </div>
    </>
  );
}

function ResultView({ result }: { result: AnalysisResult }) {
  const p = result.prediction;
  return (
    <div className="result">
      <div className="result__head">
        <StatusBadge value={result.detectedStatus} />
        <span>Puntaje <strong className="num">{formatNumber(result.score, 2)}</strong></span>
        <span className="muted">{result.measurementCount} mediciones</span>
      </div>
      <p>{result.summary}</p>
      <p className="muted">Estado de la red tras el análisis: {statusLabel[result.networkStatus]}</p>
      {p && (
        <dl className="details">
          <div><dt>Modelo</dt><dd>{p.modelVersion}</dd></div>
          <div><dt>Puntaje de anomalía</dt><dd className="num">{formatNumber(p.anomalyScore, 3)}</dd></div>
          <div><dt>Severidad</dt><dd><StatusBadge value={p.severity} /></dd></div>
          {p.anomalyDetected && p.anomalyType && (
            <div><dt>Causa probable</dt><dd><span className="cause">{anomalyTypeLabel[p.anomalyType]}</span></dd></div>
          )}
          {p.recommendation && (
            <div>
              <dt>{p.recommendationSource === 'CLAUDE' ? 'Recomendaciones de la IA (Claude)' : 'Recomendación automática'}</dt>
              <dd className="recommendation">{p.recommendation}</dd>
            </div>
          )}
          {p.simulatedData && <div><dt>Datos</dt><dd><span className="tag">Analizado sobre datos simulados</span></dd></div>}
        </dl>
      )}
    </div>
  );
}
