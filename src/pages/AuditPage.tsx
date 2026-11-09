import { useState } from 'react';
import { DataState } from '../components/DataState';
import { PageHeader } from '../components/PageHeader';
import { formatDateTime, roleLabel } from '../format';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import type { AuditEvent, AuditOutcome, RetentionPolicy } from '../types';

const PAGE_SIZE = 25;

export const outcomeLabel: Record<AuditOutcome, string> = { SUCCESS: 'Hecho', DENIED: 'Sin permiso', FAILED: 'Falló' };
const OUTCOME_TONE: Record<AuditOutcome, 'good' | 'bad' | 'warn'> = { SUCCESS: 'good', DENIED: 'bad', FAILED: 'warn' };
const TARGET_LABEL: Record<string, string> = {
  CAPTURE: 'Captura', NETWORK: 'Red del equipo', HOME_NETWORK: 'Red de Mi Wi-Fi', USER: 'Cuenta',
};

/**
 * Who did each sensitive operation, when and with which result (ADMIN only). Read-only: nobody can change or delete a
 * recent row, not even the application. Below, how long each kind of data is kept.
 */
export function AuditPage() {
  const [action, setAction] = useState('');
  const [outcome, setOutcome] = useState('');
  const [page, setPage] = useState(0);
  const actions = useApi(api.auditActions);
  const events = useApi(() => api.audit({ action: action || undefined, outcome: outcome || undefined, page,
    size: PAGE_SIZE }), [action, outcome, page]);
  const policies = useApi(api.retentionPolicies);

  return (
    <>
      <PageHeader title="Auditoría" description="Quién hizo cada operación sensible, cuándo y con qué resultado." />
      <section className="panel">
        <div className="audit__filters" role="search">
          <label className="field field--inline"><span>Operación</span>
            <select value={action} onChange={(e) => { setAction(e.target.value); setPage(0); }}>
              <option value="">Todas</option>
              {(actions.data ?? []).map((a) => <option key={a.code} value={a.code}>{a.label}</option>)}
            </select>
          </label>
          <label className="field field--inline"><span>Resultado</span>
            <select value={outcome} onChange={(e) => { setOutcome(e.target.value); setPage(0); }}>
              <option value="">Todos</option>
              {(Object.keys(outcomeLabel) as AuditOutcome[]).map((o) => <option key={o} value={o}>{outcomeLabel[o]}</option>)}
            </select>
          </label>
        </div>
        <DataState {...events} empty="No hay registros con esos filtros.">
          {(result) => result.items.length === 0 ? <p className="notice">No hay registros con esos filtros.</p> : (
            <>
              <div className="table-scroll">
                <table className="table audit__table" aria-label="Auditoría">
                  <thead><tr><th>Cuándo</th><th>Quién</th><th>Operación</th><th>Resultado</th><th>Sobre</th><th>Detalle</th></tr></thead>
                  <tbody>{result.items.map((e) => <AuditRow key={e.id} event={e} />)}</tbody>
                </table>
              </div>
              <div className="audit__pages">
                <button className="button button--quiet" disabled={page === 0} onClick={() => setPage(page - 1)}>Anteriores</button>
                <span className="muted small">
                  {result.total === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, result.total)} de {result.total}
                </span>
                <button className="button button--quiet" disabled={(page + 1) * PAGE_SIZE >= result.total}
                        onClick={() => setPage(page + 1)}>Siguientes</button>
              </div>
            </>
          )}
        </DataState>
      </section>
      <section className="panel" aria-labelledby="retention-title">
        <h2 id="retention-title">Cuánto tiempo se guarda cada cosa</h2>
        <p className="muted small">Se cambia en las variables del backend en Railway, nunca desde esta página.</p>
        <DataState {...policies}>{(rows) => <Policies rows={rows} />}</DataState>
      </section>
    </>
  );
}

function AuditRow({ event }: { event: AuditEvent }) {
  const who = event.actorUsername ?? (event.actorRole === 'SYSTEM' ? 'Sistema' : 'Cuenta borrada');
  const role = event.actorRole && event.actorRole !== 'SYSTEM'
    ? roleLabel[event.actorRole as keyof typeof roleLabel] ?? event.actorRole : null;
  return (
    <tr>
      <td className="table__nowrap">{formatDateTime(event.occurredAt)}</td>
      <td>{who}{role && <span className="table__sub">{role}</span>}</td>
      <td>{event.actionLabel}</td>
      <td><span className={`badge badge--${OUTCOME_TONE[event.outcome]}`}>{outcomeLabel[event.outcome]}</span></td>
      <td className="table__nowrap">
        {event.targetType ? `${TARGET_LABEL[event.targetType] ?? event.targetType}${event.targetId ? ` #${event.targetId}` : ''}` : '—'}
      </td>
      <td>{event.detail ?? '—'}</td>
    </tr>
  );
}

function Policies({ rows }: { rows: RetentionPolicy[] }) {
  return (
    <div className="table-scroll">
      <table className="table" aria-label="Retención de datos">
        <thead><tr><th>Qué</th><th>Se guarda</th><th>Dónde se cambia</th><th>Después</th></tr></thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.code}>
              <td><strong>{p.title}</strong><span className="table__sub">{p.what}</span></td>
              <td className="table__nowrap">{p.days === 0 ? 'Hasta terminar' : `${p.days} días`}</td>
              <td><code>{p.setting}</code></td>
              <td>{p.afterwards}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
