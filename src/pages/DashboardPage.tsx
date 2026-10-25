import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { DataState } from '../components/DataState';
import { Gauge } from '../components/Gauge';
import { Icon } from '../components/Icon';
import { StatusBadge } from '../components/StatusBadge';
import { StatusStrip, type StripItem } from '../components/StatusStrip';
import { Tile } from '../components/Tile';
import { TopBar } from '../components/TopBar';
import { formatDateTime, formatNumber, formatTime } from '../format';
import { useApi } from '../hooks/useApi';
import { useNetworkSelection } from '../hooks/useNetworkSelection';
import { gradeStatus, metricOf, metricStatus, metricWord } from '../quality';
import { api } from '../services/api';
import type { DashboardSummary, NetworkQuality, SystemStatus, TeamNetworks } from '../types';

/**
 * Team dashboard: health gauge of one network, its response gauges, totals and the state of each service. For ADMIN
 * and ANALYST it also shows the real end-user networks reported by the agents (the university ones are simulated).
 */
export function DashboardPage() {
  const { can } = useAuth();
  const summary = useApi(api.dashboard);
  const status = useApi(api.systemStatus);
  const { networks, networkId, setNetworkId } = useNetworkSelection();
  const quality = useApi(() => (networkId ? api.networkQuality(networkId) : Promise.resolve(null)), [networkId]);

  function refresh() {
    summary.reload();
    status.reload();
    quality.reload();
  }

  return (
    <>
      <TopBar title="Panel de redes" eyebrow="Equipo · Monitoreo en vivo"
              status={status.data ? { label: status.data.monitoringEnabled ? 'Monitoreo activo' : 'Monitoreo detenido',
                                      ok: status.data.monitoringEnabled } : undefined}
              actions={<button className="button button--quiet" onClick={refresh}>Actualizar</button>} />

      <div className="dash">
        <section className="dash__card dash__card--hero" aria-labelledby="health-title">
          <div className="dash__head">
            <h2 className="dash__title" id="health-title"><Icon name="gauge" size={18} /> Salud de la red</h2>
            {networks.data && networks.data.length > 0 && (
              <select className="dash__select" aria-label="Red" value={networkId ?? ''}
                      onChange={(e) => setNetworkId(Number(e.target.value))}>
                {networks.data.map((n) => <option key={n.id} value={n.id}>{n.ssid} · {n.zoneName}</option>)}
              </select>
            )}
          </div>
          <HealthView state={quality} />
        </section>

        <section className="dash__card" aria-labelledby="response-title">
          <h2 className="dash__title" id="response-title"><Icon name="wifi" size={18} /> Respuesta de la red</h2>
          <ResponseGauges quality={quality.data} />
        </section>

        <section className="dash__card" aria-labelledby="fleet-title">
          <h2 className="dash__title" id="fleet-title"><Icon name="server" size={18} /> Redes monitoreadas</h2>
          <DataState {...summary}>{(data) => <Fleet data={data} />}</DataState>
        </section>

        <section className="dash__card dash__card--wide" aria-labelledby="activity-title">
          <h2 className="dash__title" id="activity-title"><Icon name="analysis" size={18} /> Actividad</h2>
          <DataState {...summary}>{(data) => <Activity data={data} />}</DataState>
        </section>

        {can('ADMIN', 'ANALYST') && <RealUsersCard />}
      </div>

      <div className="grid-2 dash__lists">
        <section className="panel">
          <h2>Alertas recientes</h2>
          <DataState {...summary} empty="Sin alertas.">
            {(data) => (
              <ul className="list">
                {data.recentAlerts.map((a) => (
                  <li key={a.id}>
                    <StatusBadge value={a.severity} />
                    <span className="list__main">{a.message}</span>
                    <time>{formatDateTime(a.createdAt)}</time>
                  </li>
                ))}
                {data.recentAlerts.length === 0 && <li className="muted">Sin alertas registradas.</li>}
              </ul>
            )}
          </DataState>
          <Link to="/alerts">Ver todas las alertas</Link>
        </section>
        <section className="panel">
          <h2>Anomalías detectadas por IA</h2>
          <DataState {...summary}>
            {(data) => (
              <ul className="list">
                {data.recentAnomalies.map((p) => (
                  <li key={p.id}>
                    <StatusBadge value={p.severity} />
                    <span className="list__main"><strong>{p.ssid}</strong> {p.message}</span>
                    <time>{formatDateTime(p.createdAt)}</time>
                  </li>
                ))}
                {data.recentAnomalies.length === 0 && (
                  <li className="muted">Aún no hay anomalías. Ejecuta un análisis con IA desde Análisis.</li>
                )}
              </ul>
            )}
          </DataState>
        </section>
      </div>

      {status.data && <StatusStrip label="Estado de los servicios" items={stripItems(status.data)} />}
    </>
  );
}

function HealthView({ state }: { state: { data: NetworkQuality | null; error: string | null; loading: boolean } }) {
  if (state.error) return <p className="notice notice--error" role="alert">{state.error}</p>;
  if (!state.data) return <p className="notice" aria-busy={state.loading}>{state.loading ? 'Cargando…' : 'Sin redes registradas.'}</p>;
  const { quality } = state.data;
  const loss = metricOf(quality, 'packet_loss');
  const signal = metricOf(quality, 'signal');
  const bandwidth = metricOf(quality, 'download');
  return (
    <>
      <Gauge percent={quality.score} value={String(quality.score)} label="Calidad de 0 a 100"
             status={gradeStatus(quality.grade)} caption={quality.gradeLabel} />
      <div className="tiles">
        <Tile icon="anomaly" label="Pérdida de paquetes" value={formatNumber(loss?.value, 2)} unit="%" />
        <Tile icon="wifi" label="Señal" value={formatNumber(signal?.value, 0)} unit="dBm" />
        <Tile icon="arrowDown" label="Ancho de banda" value={formatNumber(bandwidth?.value, 0)} unit="Mbps" />
        <Tile icon="devices" label="Dispositivos" value={formatNumber(state.data.connectedDevices, 0)} />
      </div>
      <p className="dash__foot">
        <Icon name="clock" size={16} /> Medición de las {formatTime(state.data.measuredAt)}
        {state.data.simulatedData && <span className="tag">Datos simulados</span>}
        <span>· Calificación por reglas del servicio de análisis</span>
      </p>
    </>
  );
}

function ResponseGauges({ quality }: { quality: NetworkQuality | null }) {
  const latency = metricOf(quality?.quality, 'latency');
  const jitter = metricOf(quality?.quality, 'jitter');
  return (
    <div className="dash__pair">
      {[{ name: 'Latencia', m: latency }, { name: 'Jitter', m: jitter }].map(({ name, m }) => (
        <Gauge key={name} size="sm" percent={m?.score ?? null} value={m ? formatNumber(m.value, 0) : '—'} unit="ms"
               label={name} status={m ? metricStatus[m.status] : 'none'} caption={m ? metricWord[m.status] : 'Sin datos'} />
      ))}
    </div>
  );
}

function Fleet({ data }: { data: DashboardSummary }) {
  return (
    <div className="tiles">
      <Tile icon="check" label="Normales" value={String(data.networksByStatus.NORMAL)} />
      <Tile icon="minus" label="En advertencia" value={String(data.networksByStatus.WARNING)} />
      <Tile icon="cross" label="Críticas" value={String(data.networksByStatus.CRITICAL)} />
      <Tile icon="wifi" label="Total" value={String(data.totalNetworks)} />
    </div>
  );
}

function Activity({ data }: { data: DashboardSummary }) {
  return (
    <div className="tiles tiles--4">
      <Tile icon="bell" label="Alertas sin resolver" value={String(data.openAlerts)} />
      <Tile icon="anomaly" label="Anomalías (24 h)" value={String(data.anomaliesLast24h)} />
      <Tile icon="clock" label="Latencia media (1 h)" value={formatNumber(data.averageLatencyLastHourMs, 1)} unit="ms" />
      <Tile icon="devices" label="Dispositivos" value={String(data.totalDevices)} />
    </div>
  );
}

/** Real data at a glance: what the agents installed in the users' homes are reporting. */
function RealUsersCard() {
  const team = useApi(api.teamNetworks);
  return (
    <section className="dash__card dash__card--full" aria-labelledby="real-title">
      <div className="dash__head">
        <h2 className="dash__title" id="real-title"><Icon name="router" size={18} /> Redes reales de los usuarios</h2>
        <Link to="/user-networks">Ver todas</Link>
      </div>
      <DataState {...team}>{(data) => <RealUsers data={data} />}</DataState>
    </section>
  );
}

function RealUsers({ data }: { data: TeamNetworks }) {
  const t = data.totals;
  return (
    <div className="tiles tiles--4">
      <Tile icon="users" label="Usuarios" value={String(t.endUsers)} note={`${t.networks} redes registradas`} />
      <Tile icon="router" label="Agentes conectados" value={String(t.agentsOnline)} note={`de ${t.withAgent} instalados`} />
      <Tile icon="shield" label="Redes en riesgo" value={String(t.atRisk)} note="seguridad en riesgo o crítica" />
      <Tile icon="anomaly" label="Con anomalía (24 h)" value={String(t.anomaliesLast24h)} note={`${t.devices} equipos vistos`} />
    </div>
  );
}

function stripItems(status: SystemStatus): StripItem[] {
  return [
    { icon: 'ai', label: 'Servicio de IA', detail: status.aiService === 'UP' ? 'Disponible' : 'No responde',
      state: status.aiService === 'UP' ? 'ok' : 'down' },
    { icon: 'database', label: 'Base de datos', detail: 'Conectada', state: 'ok' },
    { icon: 'gauge', label: 'Monitoreo', detail: status.monitoringEnabled ? 'Activo' : 'Detenido',
      state: status.monitoringEnabled ? 'ok' : 'off' },
    { icon: 'clock', label: 'Última medición',
      detail: status.lastMeasurementAt ? formatDateTime(status.lastMeasurementAt) : 'Sin datos',
      state: status.lastMeasurementAt ? 'ok' : 'off' },
    { icon: 'bell', label: 'Alertas abiertas', detail: String(status.openAlerts), state: status.openAlerts > 0 ? 'warn' : 'ok' },
  ];
}
