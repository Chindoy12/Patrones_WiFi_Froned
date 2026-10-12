import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { EndUserShell } from '../components/EndUserShell';
import { HomeNetworkForm } from '../components/HomeNetworkForm';
import { formatDateTime } from '../format';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import type { HomeNetwork, HomeNetworkInput } from '../types';

const MAX_NETWORKS = 3;

/** End-user home: their own networks. The connection test and its gauges arrive in the next advance. */
export function EndUserHomePage() {
  const { user } = useAuth();
  const networks = useApi(api.myNetworks);
  const [editing, setEditing] = useState<HomeNetwork | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const count = networks.data?.length ?? 0;

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
      <section className="eu-hero">
        <h1>Hola, {user?.username}</h1>
        <p>Registra las redes Wi-Fi que usas y muy pronto podrás medir su latencia, estabilidad y velocidad.</p>
      </section>

      <section aria-labelledby="my-networks">
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
    </EndUserShell>
  );
}
