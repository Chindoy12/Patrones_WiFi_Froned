import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { DeviceList } from '../components/AgentPanel';
import { DataState } from '../components/DataState';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { formatBytes, formatDateTime } from '../format';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import type { Device, Network } from '../types';

const CONNECTION: Record<Device['connectionStatus'], string> = {
  CONNECTED: 'NORMAL', IDLE: 'INFO', DISCONNECTED: 'CRITICAL',
};
const CONNECTION_LABEL: Record<Device['connectionStatus'], string> = {
  CONNECTED: 'Conectado', IDLE: 'Inactivo', DISCONNECTED: 'Desconectado',
};

/**
 * Devices of each team network. A network measured by its sensor shows what the sensor sees (maker and name, never
 * the MAC), like Mi Wi-Fi; only an administrator names or blocks a device. The table below is for the demo sources.
 */
export function DevicesPage() {
  const networks = useApi(api.networks);
  const [chosen, setChosen] = useState<number | undefined>();
  const networkId = chosen ?? networks.data?.[0]?.id;
  const network = networks.data?.find((n) => n.id === networkId);

  return (
    <>
      <PageHeader title="Dispositivos" description="Equipos conectados a cada red del equipo, según su sensor."
                  actions={networks.data && networks.data.length > 0 && (
                    <label className="field field--inline"><span>Red</span>
                      <select value={networkId ?? ''} onChange={(e) => setChosen(Number(e.target.value))}>
                        {networks.data.map((n) => <option key={n.id} value={n.id}>{n.ssid}</option>)}
                      </select>
                    </label>
                  )} />
      {networks.data && networks.data.length === 0 && (
        <section className="panel"><p className="muted">Todavía no hay redes. Regístrala en Redes y conecta su sensor.</p></section>
      )}
      {network && (network.dataSourceType === 'AGENT'
        ? <SensorDevices key={network.id} network={network} />
        : <DemoDevices key={network.id} networkId={network.id} />)}
    </>
  );
}

function SensorDevices({ network }: { network: Network }) {
  const { can } = useAuth();
  const overview = useApi(() => api.sensorOverview(network.id), [network.id]);
  return (
    <section className="panel" aria-label={`Equipos de ${network.ssid}`}>
      <DataState {...overview}>
        {(data) => (
          !data.key ? <p className="muted">«{network.ssid}» todavía no tiene sensor: conéctalo en Redes → Sensor.</p> : (
            <>
              <p className="muted small">
                {data.latest ? `${data.latest.deviceCount === 1 ? '1 conectado' : `${data.latest.deviceCount} conectados`} en el último reporte. ` : ''}
                Cada equipo se reconoce por una huella de su dirección: la MAC nunca sale del computador del sensor.
              </p>
              <DeviceList devices={data.devices} onChange={overview.reload} team canManage={can('ADMIN')}
                          updateDevice={(id, change) => api.updateSensorDevice(network.id, id, change)}
                          loadHistory={(id) => api.sensorDeviceSessions(network.id, id)}
                          identify={() => api.identifySensorDevice(network.id)} latestAt={data.latest?.receivedAt ?? null} />
            </>
          )
        )}
      </DataState>
    </section>
  );
}

/** Devices of a network with a demo source (only in a local demo). */
function DemoDevices({ networkId }: { networkId: number }) {
  const devices = useApi(() => api.devices(networkId), [networkId]);
  const [selected, setSelected] = useState<Device | null>(null);
  return (
      <div className="grid-2 grid-2--wide-left">
        <section className="panel">
          <DataState {...devices} empty="No hay dispositivos registrados en esta red.">
            {(rows) => (
              <div className="table-scroll">
                <table className="table table--clickable">
                  <thead><tr><th>Dispositivo</th><th>Red</th><th>IP / MAC</th><th>Señal</th><th>Conexión</th></tr></thead>
                  <tbody>
                    {rows.map((d) => (
                      <tr key={d.id} onClick={() => setSelected(d)} aria-selected={selected?.id === d.id}
                          tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelected(d)}>
                        <td><strong>{d.hostname ?? 'Sin nombre'}</strong><br /><small className="muted">{d.type}</small></td>
                        <td>{d.networkSsid}</td>
                        <td>{d.ipAddress}<br /><small className="muted">{d.macAddress}</small></td>
                        <td className="num">{d.signalStrength ?? '—'} dBm</td>
                        <td><StatusBadge value={CONNECTION[d.connectionStatus]} /> <small>{CONNECTION_LABEL[d.connectionStatus]}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataState>
        </section>
        <section className="panel">
          <h2>Sesiones de tráfico</h2>
          {selected ? <Sessions device={selected} /> : <p className="muted">Selecciona un dispositivo para ver sus sesiones.</p>}
        </section>
      </div>
  );
}

function Sessions({ device }: { device: Device }) {
  const sessions = useApi(() => api.deviceSessions(device.id), [device.id]);
  return (
    <>
      <p><strong>{device.hostname ?? device.macAddress}</strong></p>
      <DataState {...sessions} empty="Este dispositivo no tiene sesiones registradas.">
        {(rows) => (
          <ul className="list list--compact">
            {rows.map((s) => (
              <li key={s.id}>
                <span className="list__main">{s.protocol}{s.destinationPort ? `:${s.destinationPort}` : ''} · ↑ {formatBytes(s.bytesSent)} · ↓ {formatBytes(s.bytesReceived)}</span>
                <time>{formatDateTime(s.startedAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </DataState>
    </>
  );
}
