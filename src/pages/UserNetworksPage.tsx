import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { DataState } from '../components/DataState';
import { Icon } from '../components/Icon';
import { Tile } from '../components/Tile';
import { TopBar } from '../components/TopBar';
import { anomalyTypeLabel, formatDateTime } from '../format';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import type { SecurityGrade, TeamNetworkRow, TeamNetworks } from '../types';

const GRADE: Record<SecurityGrade, { label: string; tone: 'good' | 'neutral' | 'warn' | 'bad' }> = {
  SECURE: { label: 'Segura', tone: 'good' },
  ACCEPTABLE: { label: 'Aceptable', tone: 'neutral' },
  AT_RISK: { label: 'En riesgo', tone: 'warn' },
  CRITICAL: { label: 'Crítica', tone: 'bad' },
};

/**
 * The real home networks of the end users, as their agents report them. Unlike the university networks of the rest
 * of the panel, nothing here is simulated. For privacy nothing about their devices is shown, and an analyst sees the
 * owner masked: only an administrator knows whose network it is.
 */
export function UserNetworksPage() {
  const { can } = useAuth();
  const team = useApi(api.teamNetworks);
  const [onlyAttention, setOnlyAttention] = useState(false);

  return (
    <>
      <TopBar title="Redes de usuarios"
              actions={<button className="button button--quiet" onClick={team.reload}>Actualizar</button>} />
      <p className="notice notice--info">
        Datos reales que envían los agentes instalados en las casas de los usuarios. Por privacidad no se muestra nada
        de sus equipos (ni nombres, ni marcas, ni direcciones){can('ADMIN') ? '.' : ' y el usuario aparece enmascarado.'}
      </p>
      <DataState {...team}>
        {(data) => (
          <>
            <Totals data={data} />
            <section className="panel" aria-labelledby="unet-title">
              <div className="dash__head">
                <h2 id="unet-title">Redes registradas</h2>
                <label className="unet__filter">
                  <input type="checkbox" checked={onlyAttention} onChange={(e) => setOnlyAttention(e.target.checked)} />
                  Solo las que necesitan atención
                </label>
              </div>
              <NetworksTable rows={onlyAttention ? data.networks.filter((r) => r.needsAttention) : data.networks}
                             empty={data.networks.length === 0
                               ? 'Todavía ningún usuario ha registrado una red.'
                               : 'Ninguna red necesita atención ahora.'} />
              <p className="muted small">Actualizado: {formatDateTime(data.generatedAt)}</p>
            </section>
          </>
        )}
      </DataState>
    </>
  );
}

function Totals({ data }: { data: TeamNetworks }) {
  const t = data.totals;
  return (
    <div className="tiles tiles--4 unet__totals">
      <Tile icon="users" label="Usuarios registrados" value={String(t.endUsers)} note={`${t.networks} redes`} />
      <Tile icon="router" label="Agentes conectados" value={String(t.agentsOnline)}
            note={`de ${t.withAgent} instalados`} />
      <Tile icon="shield" label="Redes en riesgo" value={String(t.atRisk)} note="seguridad en riesgo o crítica" />
      <Tile icon="anomaly" label="Con anomalía (24 h)" value={String(t.anomaliesLast24h)}
            note={`${t.devices} equipos en total`} />
    </div>
  );
}

function NetworksTable({ rows, empty }: { rows: TeamNetworkRow[]; empty: string }) {
  if (rows.length === 0) return <p className="notice">{empty}</p>;
  return (
    <div className="table-scroll">
      <table className="table unet">
        <thead>
          <tr>
            <th>Red</th>
            <th>Usuario</th>
            <th>Agente</th>
            <th className="num">Equipos</th>
            <th>Seguridad</th>
            <th className="num">Calidad</th>
            <th>Comportamiento</th>
            <th>Canal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={r.needsAttention ? 'is-attention' : undefined}>
              <td>
                <strong>{r.name}</strong>
                {r.needsAttention && <span className="tag tag--danger unet__tag">Revisar</span>}
                <small className="muted unet__sub">{r.provider ?? 'Proveedor sin indicar'}{r.contractedMbps ? ` · ${r.contractedMbps} Mbps` : ''}</small>
              </td>
              <td>{r.owner}</td>
              <td><AgentCell row={r} /></td>
              <td className="num">{r.deviceCount ?? '—'}</td>
              <td>
                {r.securityGrade ? (
                  <span className={`badge badge--${GRADE[r.securityGrade].tone}`}>
                    {GRADE[r.securityGrade].label}{r.securityScore !== null ? ` · ${r.securityScore}` : ''}
                  </span>
                ) : '—'}
              </td>
              <td className="num">{r.qualityScore !== null ? `${r.qualityScore}/100` : '—'}</td>
              <td>
                {r.anomalyDetected === null ? '—' : r.anomalyDetected
                  ? <span className="unet__bad"><Icon name="anomaly" size={14} /> {r.anomalyType ? anomalyTypeLabel[r.anomalyType] ?? 'Anomalía' : 'Anomalía'}</span>
                  : <span className="unet__ok"><Icon name="check" size={14} /> Normal</span>}
              </td>
              <td><ChannelCell row={r} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgentCell({ row }: { row: TeamNetworkRow }) {
  if (!row.hasAgent) return <span className="muted">Sin agente</span>;
  return (
    <span className={`agent__state agent__state--${row.agentOnline ? 'on' : 'off'}`}>
      <i aria-hidden="true" />
      {row.agentOnline ? 'Conectado' : row.lastReportAt ? `Último: ${formatDateTime(row.lastReportAt)}` : 'Sin reportes'}
    </span>
  );
}

function ChannelCell({ row }: { row: TeamNetworkRow }) {
  if (row.channel === null) return <>—</>;
  const band = row.band ? ` (${row.band} GHz)` : '';
  if (row.channelChangeSuggested && row.recommendedChannel !== null) {
    return <span className="unet__bad">{row.channel} → {row.recommendedChannel}{band}</span>;
  }
  return <>{row.channel}{band}</>;
}
