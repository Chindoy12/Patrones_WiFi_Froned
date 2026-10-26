import { useCallback, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { DataState } from '../components/DataState';
import { PageHeader } from '../components/PageHeader';
import { SensorCell, SensorPanel } from '../components/SensorPanel';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime, statusLabel } from '../format';
import { errorMessage, useApi } from '../hooks/useApi';
import { api, type NetworkInput } from '../services/api';
import type { Network } from '../types';

const NEW = -1;

export function NetworksPage() {
  const { can } = useAuth();
  const networks = useApi(api.networks);
  const [showForm, setShowForm] = useState(false);
  const [sensorOf, setSensorOf] = useState<number | null>(null);
  const reload = networks.reload;
  const refresh = useCallback(() => reload(), [reload]);

  async function remove(id: number, ssid: string) {
    if (!window.confirm(`¿Eliminar la red ${ssid} y todo su historial?`)) return;
    try {
      await api.deleteNetwork(id);
      if (sensorOf === id) setSensorOf(null);
      networks.reload();
    } catch (e) {
      window.alert(errorMessage(e));
    }
  }

  const selected = networks.data?.find((n) => n.id === sensorOf) ?? null;
  return (
    <>
      <PageHeader title="Redes"
                  description="Redes Wi-Fi del equipo. Cada una se mide con su sensor: el agente WiFiSense instalado en un computador conectado a ella."
                  actions={can('ADMIN') && (
                    <button className={showForm ? 'button button--quiet' : 'button'} onClick={() => setShowForm((v) => !v)}>
                      {showForm ? 'Cancelar' : 'Registrar red'}
                    </button>
                  )} />
      {showForm && (
        <NetworkForm onCreated={(network) => {
          setShowForm(false);
          networks.reload();
          if (network.dataSourceType === 'AGENT') setSensorOf(network.id);
        }} />
      )}
      <section className="panel">
        <DataState {...networks}
                   empty={can('ADMIN')
                     ? 'Todavía no hay redes. Pulsa «Registrar red» y luego conecta su sensor para empezar a medir.'
                     : 'Todavía no hay redes registradas. Un administrador debe registrar la red y conectar su sensor.'}>
          {(rows) => (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr><th>Estado</th><th>SSID</th><th>Ubicación</th><th>Banda / canal</th><th>Seguridad</th>
                    <th>Sensor</th><th>Última medición</th><th /></tr>
                </thead>
                <tbody>
                  {rows.map((n) => (
                    <tr key={n.id} className={n.id === sensorOf ? 'is-selected' : undefined}>
                      <td><StatusBadge value={n.status} /></td>
                      <td><strong>{n.ssid}</strong><small className="table__sub table__mono muted">{n.bssid}</small></td>
                      <td>{n.locationName}<small className="table__sub muted">{n.zoneName}</small></td>
                      <td className="table__nowrap">{n.frequencyBand} · {n.channel}</td>
                      <td>{n.securityType}</td>
                      <td><SensorCell network={n} label={statusLabel[n.dataSourceType]} /></td>
                      <td className="table__nowrap">{formatDateTime(n.lastCollectedAt)}</td>
                      <td className="table__actions">
                        {n.dataSourceType === 'AGENT' && (
                          <button className="link-button" onClick={() => setSensorOf(n.id === sensorOf ? null : n.id)}
                                  aria-expanded={n.id === sensorOf}>
                            {n.id === sensorOf ? 'Ocultar sensor' : 'Sensor'}
                          </button>
                        )}
                        {can('ADMIN') && (
                          <button className="link-button link-button--danger" onClick={() => remove(n.id, n.ssid)}>Eliminar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DataState>
      </section>
      {selected && <SensorPanel key={selected.id} network={selected} canManage={can('ADMIN')} onChange={refresh} />}
    </>
  );
}

interface Place {
  locationId: number;
  locationName: string;
  city: string;
  zoneId: number;
  zoneName: string;
  floor: string;
}

/**
 * Registers a team network. The location and the zone can be chosen or created right here, so an empty panel is
 * enough to start. The data source is the network's sensor (the demo sources appear only in a local demo).
 */
function NetworkForm({ onCreated }: { onCreated: (network: Network) => void }) {
  const locations = useApi(api.locations);
  const zones = useApi(api.zones);
  const sources = useApi(api.networkSources);
  const [place, setPlace] = useState<Place>({ locationId: 0, locationName: '', city: '', zoneId: 0, zoneName: '', floor: '' });
  const [form, setForm] = useState<Omit<NetworkInput, 'zoneId'>>({
    ssid: '', bssid: '', frequencyBand: '5GHz', channel: 36, securityType: 'WPA2', dataSourceType: 'AGENT',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm({ ...form, [key]: value });
  // With no locations yet (an empty panel), the form starts by creating one.
  const locationId = place.locationId || locations.data?.[0]?.id || NEW;
  const zonesHere = (zones.data ?? []).filter((z) => z.locationId === locationId);
  const zoneId = locationId === NEW ? NEW : place.zoneId || zonesHere[0]?.id || NEW;
  const offered = sources.data ?? ['AGENT'];

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let location = locationId;
      if (location === NEW) {
        location = (await api.createLocation({ name: place.locationName.trim(), city: place.city.trim() || undefined })).id;
        const created = location;
        setPlace((p) => ({ ...p, locationId: created }));  // a retry after an error does not create it twice
      }
      let zone = zoneId;
      if (zone === NEW) {
        const floor = place.floor.trim() === '' ? null : Number(place.floor);
        zone = (await api.createZone(location, { name: place.zoneName.trim(), floor })).id;
        const created = zone;
        setPlace((p) => ({ ...p, zoneId: created }));
      }
      onCreated(await api.createNetwork({ ...form, zoneId: zone }));
    } catch (e) {
      setError(errorMessage(e));
      locations.reload();
      zones.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel form-grid" onSubmit={submit} aria-label="Registrar red">
      <label className="field"><span>Sede</span>
        <select value={locationId} onChange={(e) => setPlace({ ...place, locationId: Number(e.target.value), zoneId: 0 })}>
          {(locations.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          <option value={NEW}>+ Nueva sede…</option>
        </select>
      </label>
      {locationId === NEW && (
        <>
          <label className="field"><span>Nombre de la sede</span>
            <input required maxLength={100} placeholder="Universidad Mariana" value={place.locationName}
                   onChange={(e) => setPlace({ ...place, locationName: e.target.value })} /></label>
          <label className="field"><span>Ciudad</span>
            <input maxLength={100} placeholder="Pasto" value={place.city}
                   onChange={(e) => setPlace({ ...place, city: e.target.value })} /></label>
        </>
      )}
      <label className="field"><span>Zona</span>
        <select value={zoneId} disabled={locationId === NEW}
                onChange={(e) => setPlace({ ...place, zoneId: Number(e.target.value) })}>
          {zonesHere.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          <option value={NEW}>+ Nueva zona…</option>
        </select>
      </label>
      {zoneId === NEW && (
        <>
          <label className="field"><span>Nombre de la zona</span>
            <input required maxLength={100} placeholder="Laboratorio de redes" value={place.zoneName}
                   onChange={(e) => setPlace({ ...place, zoneName: e.target.value })} /></label>
          <label className="field"><span>Piso (opcional)</span>
            <input type="number" min={-10} max={200} value={place.floor}
                   onChange={(e) => setPlace({ ...place, floor: e.target.value })} /></label>
        </>
      )}
      <label className="field"><span>SSID (nombre de la red)</span>
        <input required maxLength={64} value={form.ssid} onChange={(e) => set('ssid', e.target.value)} /></label>
      <div className="field">
        <label htmlFor="network-bssid"><span>BSSID (dirección del router)</span></label>
        <input id="network-bssid" required placeholder="A4:2B:B0:10:00:05" value={form.bssid}
               onChange={(e) => set('bssid', e.target.value)} aria-describedby="bssid-help" />
        <small id="bssid-help" className="muted">
          En el computador conectado a esa red: Símbolo del sistema → <code>netsh wlan show interfaces</code> → «BSSID».
        </small>
      </div>
      <label className="field"><span>Banda</span>
        <select value={form.frequencyBand} onChange={(e) => set('frequencyBand', e.target.value)}>
          <option>2.4GHz</option><option>5GHz</option><option>6GHz</option>
        </select></label>
      <label className="field"><span>Canal</span>
        <input type="number" min={1} max={233} value={form.channel} onChange={(e) => set('channel', Number(e.target.value))} /></label>
      <label className="field"><span>Seguridad</span>
        <select value={form.securityType} onChange={(e) => set('securityType', e.target.value)}>
          <option>WPA2</option><option>WPA3</option><option>WPA2_ENTERPRISE</option><option>OPEN</option>
        </select></label>
      <label className="field"><span>Fuente de datos</span>
        <select value={form.dataSourceType} disabled={offered.length === 1}
                onChange={(e) => set('dataSourceType', e.target.value)}>
          {offered.map((type) => (
            <option key={type} value={type}>
              {type === 'AGENT' ? 'Sensor WiFiSense (agente instalado en esa red)' : `${statusLabel[type]} (demostración)`}
            </option>
          ))}
        </select></label>
      <div className="form-grid__actions">
        {error && <p className="notice notice--error" role="alert">{error}</p>}
        <button className="button" disabled={busy}>{busy ? 'Guardando…' : 'Guardar red'}</button>
      </div>
    </form>
  );
}
