import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { DataState } from '../components/DataState';
import { Gauge } from '../components/Gauge';
import { NetworkPicker } from '../components/NetworkPicker';
import { PageHeader } from '../components/PageHeader';
import { formatDateTime, formatNumber, statusLabel } from '../format';
import { errorMessage, useApi } from '../hooks/useApi';
import { useNetworkSelection } from '../hooks/useNetworkSelection';
import { api } from '../services/api';
import type { ProtocolStatistic } from '../types';

export function MeasurementsPage() {
  const { can } = useAuth();
  const { networks, networkId, setNetworkId } = useNetworkSelection();
  const measurements = useApi(() => (networkId ? api.measurements(networkId, { limit: 25 }) : Promise.resolve([])), [networkId]);
  const protocols = useApi(() => (networkId ? api.protocols(networkId) : Promise.resolve([])), [networkId]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function collect() {
    if (!networkId) return;
    setBusy(true);
    try {
      const m = await api.collect(networkId);
      setMessage(`Medición registrada desde ${statusLabel[m.source]}: ${formatNumber(m.latencyMs)} ms de latencia.`);
      measurements.reload();
      protocols.reload();
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // A network with a sensor sends its readings by itself: there is nothing to collect from here.
  const bySensor = networks.data?.find((n) => n.id === networkId)?.dataSourceType === 'AGENT';

  return (
    <>
      <PageHeader title="Mediciones" description="Lecturas más recientes de rendimiento y tráfico."
                  actions={
                    <>
                      <NetworkPicker networks={networks.data ?? []} value={networkId} onChange={setNetworkId} />
                      {can('ADMIN', 'ANALYST') && !bySensor && (
                        <button className="button" onClick={collect} disabled={busy || !networkId}>
                          {busy ? 'Recolectando…' : 'Recolectar ahora'}
                        </button>
                      )}
                    </>
                  } />
      {message && <p className="notice" role="status">{message}</p>}
      {bySensor && (
        <p className="muted">Las mediciones de esta red llegan solas desde su sensor, unas cada 5 minutos. El tráfico y
          los protocolos son los del computador donde está instalado.</p>
      )}
      <div className="grid-2 grid-2--wide-left">
        <section className="panel">
          <DataState {...measurements} empty="Esta red todavía no tiene mediciones.">
            {(rows) => (
              <div className="table-scroll">
                <table className="table">
                  <thead><tr><th>Fecha</th><th>Latencia</th><th>Jitter</th><th>Pérdida</th><th>Ancho de banda</th><th>RSSI</th><th>Clientes</th><th>Origen</th></tr></thead>
                  <tbody>
                    {rows.map((m) => (
                      <tr key={m.id}>
                        <td>{formatDateTime(m.measuredAt)}</td>
                        <td className="num">{formatNumber(m.latencyMs, 1, ' ms')}</td>
                        <td className="num">{formatNumber(m.jitterMs, 1, ' ms')}</td>
                        <td className="num">{formatNumber(m.packetLossPct, 2, ' %')}</td>
                        <td className="num">{formatNumber(m.bandwidthMbps, 0, ' Mbps')}</td>
                        <td className="num">{formatNumber(m.signalStrengthDbm, 0, ' dBm')}</td>
                        <td className="num">{m.connectedDevices ?? '—'}</td>
                        <td>{m.simulated ? <span className="tag">Simulado</span> : statusLabel[m.source]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataState>
        </section>
        <section className="panel" aria-labelledby="protocols-title">
          <h2 id="protocols-title">Protocolos (último periodo)</h2>
          <DataState {...protocols} empty="Sin estadísticas de protocolos.">
            {(rows) => <ProtocolGauges rows={rows} />}
          </DataState>
        </section>
      </div>
    </>
  );
}

/**
 * Share of each protocol in the traffic of the last period, drawn with the same round gauges as latency and jitter:
 * a share is not good or bad, so every gauge uses the neutral "share" status. Largest first.
 */
export function ProtocolGauges({ rows }: { rows: ProtocolStatistic[] }) {
  const total = rows.reduce((sum, p) => sum + p.packetCount, 0);
  const shares = rows
    .map((p) => ({ ...p, share: total ? (p.packetCount / total) * 100 : 0 }))
    .sort((a, b) => b.share - a.share);
  return (
    <>
      <ul className="gauge-grid">
        {shares.map((p) => (
          <li key={p.protocol}>
            <Gauge size="sm" percent={p.share} value={formatNumber(p.share, 1)} unit="%" label={p.protocol}
                   status="share" caption={`${formatNumber(p.packetCount, 0)} paquetes`} />
          </li>
        ))}
      </ul>
      <p className="muted gauge-grid__note">{formatNumber(total, 0)} paquetes en total.</p>
    </>
  );
}
