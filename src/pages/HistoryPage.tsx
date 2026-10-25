import { useMemo, useState } from 'react';
import { DataState } from '../components/DataState';
import { MetricChart } from '../components/MetricChart';
import { NetworkPicker } from '../components/NetworkPicker';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime, formatNumber, statusLabel } from '../format';
import { useApi } from '../hooks/useApi';
import { useNetworkSelection } from '../hooks/useNetworkSelection';
import { api } from '../services/api';

const RANGES = [
  { label: '6 h', hours: 6 },
  { label: '24 h', hours: 24 },
  { label: '7 días', hours: 168 },
];

export function HistoryPage() {
  const { networks, networkId, setNetworkId } = useNetworkSelection();
  const [hours, setHours] = useState(24);
  const from = useMemo(() => new Date(Date.now() - hours * 3_600_000).toISOString(), [hours]);
  const history = useApi(() => (networkId ? api.measurements(networkId, { from, limit: 1000 }) : Promise.resolve([])), [networkId, from]);
  const analyses = useApi(() => (networkId ? api.analyses(networkId, 20) : Promise.resolve([])), [networkId]);

  return (
    <>
      <PageHeader title="Historial" description="Evolución de las métricas y análisis anteriores de una red."
                  actions={
                    <>
                      <NetworkPicker networks={networks.data ?? []} value={networkId} onChange={setNetworkId} />
                      <div className="segmented" role="group" aria-label="Periodo">
                        {RANGES.map((r) => (
                          <button key={r.hours} aria-pressed={hours === r.hours} onClick={() => setHours(r.hours)}>{r.label}</button>
                        ))}
                      </div>
                    </>
                  } />
      <DataState {...history} empty="No hay mediciones en este periodo.">
        {(rows) => (
          <div className="grid-2">
            <section className="panel">
              <h2>Latencia y jitter (ms)</h2>
              <MetricChart data={rows} series={[
                { key: 'latencyMs', label: 'Latencia', color: 'var(--chart-1)' },
                { key: 'jitterMs', label: 'Jitter', color: 'var(--chart-2)' },
              ]} />
            </section>
            <section className="panel">
              <h2>Pérdida de paquetes (%)</h2>
              <MetricChart data={rows} series={[{ key: 'packetLossPct', label: 'Pérdida', color: 'var(--bad)' }]} />
            </section>
            <section className="panel">
              <h2>Intensidad de señal (dBm)</h2>
              <MetricChart data={rows} series={[{ key: 'signalStrengthDbm', label: 'RSSI', color: 'var(--chart-2)' }]} />
            </section>
            <section className="panel">
              <h2>Ancho de banda (Mbps)</h2>
              <MetricChart data={rows} series={[{ key: 'bandwidthMbps', label: 'Ancho de banda', color: 'var(--chart-1)' }]} />
            </section>
          </div>
        )}
      </DataState>
      <section className="panel">
        <h2>Análisis anteriores</h2>
        <DataState {...analyses} empty="Esta red no tiene análisis registrados.">
          {(rows) => (
            <div className="table-scroll">
              <table className="table">
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Resultado</th><th>Puntaje</th><th>Resumen</th><th>Solicitado por</th></tr></thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id}>
                      <td>{formatDateTime(a.createdAt)}</td>
                      <td>{statusLabel[a.type]}</td>
                      <td><StatusBadge value={a.detectedStatus} /></td>
                      <td className="num">{formatNumber(a.score, 2)}</td>
                      <td>{a.summary}</td>
                      <td>{a.requestedBy === 'system' ? 'Monitoreo automático' : a.requestedBy}</td>
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
