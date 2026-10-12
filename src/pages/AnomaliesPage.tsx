import { DataState } from '../components/DataState';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { anomalyTypeLabel, formatDateTime, formatNumber } from '../format';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';

const CAUSE_DAYS = 30;

export function AnomaliesPage() {
  const anomalies = useApi(api.anomalies);
  const causes = useApi(() => api.anomalyCauses(CAUSE_DAYS));
  return (
    <>
      <PageHeader title="Anomalías"
                  description="Comportamientos inusuales detectados por el modelo Isolation Forest y su causa probable." />
      <section className="panel">
        <h2>Causas de los últimos {CAUSE_DAYS} días</h2>
        <DataState {...causes} empty={`Sin anomalías en los últimos ${CAUSE_DAYS} días.`}>
          {(rows) => (
            <ul className="cause-summary" aria-label="Anomalías por causa">
              {rows.map((c) => (
                <li key={c.anomalyType}>
                  <strong className="num">{c.count}</strong>
                  <span>{anomalyTypeLabel[c.anomalyType]}</span>
                </li>
              ))}
            </ul>
          )}
        </DataState>
      </section>
      <section className="panel">
        <DataState {...anomalies} empty="No se han detectado anomalías. Ejecuta un análisis con IA para evaluar una red.">
          {(rows) => (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th><th>Red</th><th>Severidad</th><th>Puntaje</th><th>Causa probable</th><th>Hallazgo</th>
                    <th>Recomendación</th><th>Datos</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id}>
                      <td>{formatDateTime(p.createdAt)}</td>
                      <td><strong>{p.ssid}</strong></td>
                      <td><StatusBadge value={p.severity} /></td>
                      <td className="num">{formatNumber(p.anomalyScore, 3)}</td>
                      <td><span className="cause">{anomalyTypeLabel[p.anomalyType ?? 'UNCLASSIFIED']}</span></td>
                      <td>{p.message}</td>
                      <td>{p.recommendation ?? '—'}</td>
                      <td>{p.simulatedData ? <span className="tag">Simulados</span> : 'Reales'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DataState>
      </section>
    </>
  );
}
