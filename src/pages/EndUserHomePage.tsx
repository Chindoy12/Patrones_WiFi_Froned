import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ConnectionPanel } from '../components/ConnectionPanel';
import { EndUserShell } from '../components/EndUserShell';
import { HomeNetworkForm } from '../components/HomeNetworkForm';
import { StatusStrip } from '../components/StatusStrip';
import { TopBar } from '../components/TopBar';
import { formatDateTime } from '../format';
import { useApi } from '../hooks/useApi';
import { useOnline } from '../hooks/useOnline';
import { api } from '../services/api';
import type { ConnectionTest, HomeNetwork, HomeNetworkInput } from '../types';

const MAX_NETWORKS = 3;

/** End-user home: quality dashboard and connection test of each of their networks, and the networks themselves. */
export function EndUserHomePage() {
  const { user } = useAuth();
  const online = useOnline();
  const networks = useApi(api.myNetworks);
  const [editing, setEditing] = useState<HomeNetwork | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [lastTest, setLastTest] = useState<ConnectionTest | null>(null);
  const count = networks.data?.length ?? 0;
  const selected = networks.data?.find((n) => n.id === chosen) ?? networks.data?.[0] ?? null;

  async function save(input: HomeNetworkInput) {
    if (editing === 'new') await api.createMyNetwork(input);
    else if (editing) await api.updateMyNetwork(editing.id, input);
    setEditing(null);
    networks.reload();
  }

  async function remove(network: HomeNetwork) {
    if (!window.confirm(`¿Eliminar la red «${network.name}»?`)) return;
    setError(null);
    try {
      await api.deleteMyNetwork(network.id);
      networks.reload();
    } catch {
      setError('No se pudo eliminar la red. Intenta de nuevo.');
    }
  }

  return (
    <EndUserShell>
      <TopBar title={`Hola, ${user?.username ?? ''}`} status={{ label: online ? 'Conectado' : 'Sin conexión', ok: online }} />

      {networks.data && count === 0 && (
        <section className="eu-hero">
          <h2>Empieza registrando tu red</h2>
          <p>Agrega tu Wi-Fi abajo y podrás medir su latencia, estabilidad y velocidad, y saber para qué te alcanza.</p>
        </section>
      )}

      {selected && (
        <section aria-label="Calidad de tu conexión">
          {count > 1 && (
            <div className="eu-networks" role="group" aria-label="Elige la red">
              {networks.data!.map((n) => (
                <button key={n.id} aria-pressed={n.id === selected.id} onClick={() => setChosen(n.id)}>{n.name}</button>
              ))}
            </div>
          )}
          <ConnectionPanel key={selected.id} network={selected} onTested={setLastTest} />
        </section>
      )}

      <section className="eu-section" aria-labelledby="my-networks">
        <div className="eu-section__head">
          <h2 id="my-networks">Mis redes</h2>
          <span className="muted">{count} de {MAX_NETWORKS}</span>
        </div>
        {error && <p className="notice notice--error" role="alert">{error}</p>}
        {networks.error && <p className="notice notice--error" role="alert">{networks.error}</p>}
        {networks.loading && !networks.data && <p className="notice" aria-busy="true">Cargando…</p>}
        {networks.data && count === 0 && editing === null && (
          <p className="muted">Todavía no tienes redes. Agrega la primera para empezar.</p>
        )}
        {networks.data && (
          <div className="eu-grid">
            {networks.data.map((network) => editing !== 'new' && editing?.id === network.id ? (
              <article key={network.id} className="eu-card">
                <HomeNetworkForm initial={network} onSave={save} onCancel={() => setEditing(null)} />
              </article>
            ) : (
              <article key={network.id} className="eu-card">
                <h3>{network.name}</h3>
                <dl className="eu-card__facts">
                  <div><dt>Proveedor</dt><dd>{network.provider ?? 'Sin indicar'}</dd></div>
                  <div><dt>Velocidad contratada</dt><dd>{network.contractedMbps ? `${network.contractedMbps} Mbps` : 'Sin indicar'}</dd></div>
                  <div><dt>Registrada</dt><dd>{formatDateTime(network.createdAt)}</dd></div>
                </dl>
                <div className="eu-card__actions">
                  <button className="link-button" onClick={() => setEditing(network)}>Editar</button>
                  <button className="link-button link-button--danger" onClick={() => remove(network)}>Eliminar</button>
                </div>
              </article>
            ))}
            {editing === 'new' ? (
              <article className="eu-card">
                <HomeNetworkForm onSave={save} onCancel={() => setEditing(null)} />
              </article>
            ) : count < MAX_NETWORKS && (
              <button className="eu-card eu-card--add" onClick={() => setEditing('new')}>
                <span aria-hidden="true">＋</span> Agregar red
              </button>
            )}
          </div>
        )}
      </section>

      <StatusStrip label="Tu cuenta" items={[
        { icon: 'wifi', label: 'Tus redes', detail: `${count} de ${MAX_NETWORKS}`, state: count > 0 ? 'ok' : 'off' },
        { icon: 'clock', label: 'Última prueba', detail: lastTest ? formatDateTime(lastTest.createdAt) : 'En esta visita, ninguna',
          state: lastTest ? 'ok' : 'off' },
        { icon: 'server', label: 'Servidor', detail: online ? 'Conectado' : 'Sin conexión', state: online ? 'ok' : 'down' },
        { icon: 'gauge', label: 'Pruebas', detail: 'Hasta 5 cada 10 minutos', state: 'ok' },
      ]} />
    </EndUserShell>
  );
}
