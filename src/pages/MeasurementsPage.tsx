import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { DataState } from '../components/DataState';
import { NetworkPicker } from '../components/NetworkPicker';
import { PageHeader } from '../components/PageHeader';
import { formatDateTime, formatNumber, statusLabel } from '../format';
import { errorMessage, useApi } from '../hooks/useApi';
import { useNetworkSelection } from '../hooks/useNetworkSelection';
import { api } from '../services/api';

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

  const totalPackets = (protocols.data ?? []).reduce((sum, p) => sum + p.packetCount, 0);
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
        <section className="panel">
          <h2>Protocolos (último periodo)</h2>
          <DataState {...protocols} empty="Sin estadísticas de protocolos.">
            {(rows) => (
              <ul className="share-list">
                {rows.map((p) => {
                  const share = totalPackets ? (p.packetCount / totalPackets) * 100 : 0;
                  return (
                    <li key={p.protocol}>
                      <span>{p.protocol}</span>
                      <span className="share-list__bar"><span style={{ width: `${share}%` }} /></span>
                      <span className="num">{share.toFixed(1)} %</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </DataState>
        </section>
      </div>
    </>
  );
}
