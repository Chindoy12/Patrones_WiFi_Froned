import { useState } from 'react';
import { DataState } from '../components/DataState';
import { NetworkPicker } from '../components/NetworkPicker';
import { PageHeader } from '../components/PageHeader';
import { WeeklyReportPanel } from '../components/WeeklyReportPanel';
import { formatDateTime, formatNumber } from '../format';
import { useApi } from '../hooks/useApi';
import { useNetworkSelection } from '../hooks/useNetworkSelection';
import { api } from '../services/api';
import type { MetricSummary, NetworkReport } from '../types';

const METRICS: { key: keyof NetworkReport; label: string; unit: string }[] = [
  { key: 'latencyMs', label: 'Latencia', unit: ' ms' },
  { key: 'jitterMs', label: 'Jitter', unit: ' ms' },
  { key: 'packetLossPct', label: 'Pérdida de paquetes', unit: ' %' },
  { key: 'bandwidthMbps', label: 'Ancho de banda', unit: ' Mbps' },
  { key: 'signalStrengthDbm', label: 'Señal', unit: ' dBm' },
];

export function ReportsPage() {
  const { networks, networkId, setNetworkId } = useNetworkSelection();
  const report = useApi(() => (networkId ? api.report(networkId) : Promise.resolve(null)), [networkId]);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const comparison = useApi(() => (compareIds.length >= 2 ? api.comparison(compareIds) : Promise.resolve([])), [compareIds.join()]);

  const toggle = (id: number) =>
    setCompareIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(-6)));

  return (
    <>
      <PageHeader title="Reportes" description="Resumen de las últimas 24 horas, reporte semanal y comparación entre redes."
                  actions={<NetworkPicker networks={networks.data ?? []} value={networkId} onChange={setNetworkId} />} />
      <section className="panel">
        <DataState {...report}>
          {(r) => (
            <>
              <h2>{r.ssid}</h2>
              <p className="muted">
                {formatDateTime(r.from)} – {formatDateTime(r.to)} · {r.measurementCount} mediciones · {r.alerts} alertas ·{' '}
                {r.analyses} análisis · {r.anomalies} anomalías {r.simulatedData && <span className="tag">Datos simulados</span>}
              </p>
              <div className="table-scroll">
              <table className="table">
                <thead><tr><th>Métrica</th><th>Promedio</th><th>Mínimo</th><th>Máximo</th><th>Percentil 95</th></tr></thead>
                <tbody>
                  {METRICS.map((m) => {
                    const s = r[m.key] as MetricSummary;
                    return (
                      <tr key={m.key}>
                        <td>{m.label}</td>
                        <td className="num">{formatNumber(s.average, 2, m.unit)}</td>
                        <td className="num">{formatNumber(s.min, 2, m.unit)}</td>
                        <td className="num">{formatNumber(s.max, 2, m.unit)}</td>
                        <td className="num">{formatNumber(s.p95, 2, m.unit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </>
          )}
        </DataState>
      </section>

      {networkId && <WeeklyReportPanel key={networkId} networkId={networkId} />}

      <section className="panel no-print">
        <h2>Comparar redes</h2>
        <div className="checks">
          {(networks.data ?? []).map((n) => (
            <label key={n.id}><input type="checkbox" checked={compareIds.includes(n.id)} onChange={() => toggle(n.id)} /> {n.ssid}</label>
          ))}
        </div>
        {compareIds.length < 2 ? <p className="muted">Selecciona al menos dos redes.</p> : (
          <DataState {...comparison}>
            {(rows) => (
              <div className="table-scroll">
                <table className="table">
                  <thead><tr><th>Métrica (promedio)</th>{rows.map((r) => <th key={r.networkId}>{r.ssid}</th>)}</tr></thead>
                  <tbody>
                    {METRICS.map((m) => (
                      <tr key={m.key}>
                        <td>{m.label}</td>
                        {rows.map((r) => <td key={r.networkId} className="num">{formatNumber((r[m.key] as MetricSummary).average, 2, m.unit)}</td>)}
                      </tr>
                    ))}
                    <tr><td>Alertas</td>{rows.map((r) => <td key={r.networkId} className="num">{r.alerts}</td>)}</tr>
                    <tr><td>Anomalías</td>{rows.map((r) => <td key={r.networkId} className="num">{r.anomalies}</td>)}</tr>
                  </tbody>
                </table>
              </div>
            )}
          </DataState>
        )}
      </section>
    </>
  );
}
