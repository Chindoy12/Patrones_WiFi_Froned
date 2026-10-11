import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { PASSWORD_RULES, USERNAME_MAX, USERNAME_PATTERN, isStrongPassword } from '../auth/credentials';
import { DataState } from '../components/DataState';
import { PageHeader } from '../components/PageHeader';
import { roleLabel } from '../format';
import { PasswordInput } from '../components/PasswordInput';
import { errorMessage, useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { ApiError } from '../services/apiClient';
import type { StaffRole } from '../types';

const MAX_USERS = 3;
const ROLE_LABEL: Record<StaffRole, string> = { ADMIN: 'Administrador', ANALYST: 'Analista', VIEWER: 'Observador' };

export function UsersPage() {
  const { user: current } = useAuth();
  const users = useApi(api.users);
  const [error, setError] = useState<string | null>(null);
  const count = users.data?.length ?? 0;

  async function act(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      users.reload();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <>
      <PageHeader title="Usuarios" description={`Solo ${MAX_USERS} personas pueden tener cuenta. Hay ${count} de ${MAX_USERS}.`} />
      {error && <p className="notice notice--error" role="alert">{error}</p>}
      <div className="grid-2">
        <section className="panel">
          <h2>Cuentas</h2>
          <DataState {...users} empty="No hay cuentas.">
            {(rows) => (
              <ul className="list">
                {rows.map((u) => (
                  <li key={u.id}>
                    <span className="list__main"><strong>{u.username}</strong>{u.username === current?.username && ' (tú)'}</span>
                    {u.username === current?.username ? (
                      <span className="muted">{roleLabel[u.role]}</span>
                    ) : (
                      <>
                        <select aria-label={`Rol de ${u.username}`} value={u.role}
                                onChange={(e) => act(() => api.changeUserRole(u.id, e.target.value as StaffRole))}>
                          {Object.entries(ROLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <button className="link-button link-button--danger"
                                onClick={() => window.confirm(`¿Eliminar la cuenta ${u.username}?`) && act(() => api.deleteUser(u.id))}>
                          Eliminar
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </DataState>
        </section>
        <section className="panel">
          <h2>Crear cuenta</h2>
          {count >= MAX_USERS
            ? <p className="muted">Ya hay {MAX_USERS} cuentas. Elimina una para crear otra.</p>
            : <CreateUserForm onCreated={users.reload} />}
        </section>
      </div>
    </>
  );
}

function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>('ANALYST');
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const usernameValid = USERNAME_PATTERN.test(username);
  const canSubmit = usernameValid && isStrongPassword(password) && !busy;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors([]);
    try {
      await api.createUser(username, password, role);
      setUsername('');
      setPassword('');
      onCreated();
    } catch (e) {
      setErrors(e instanceof ApiError && e.errors.length ? e.errors : [errorMessage(e)]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="new-username">Usuario o correo</label>
        <input id="new-username" value={username} maxLength={USERNAME_MAX} autoComplete="off" spellCheck={false}
               aria-describedby="username-help" onChange={(e) => setUsername(e.target.value.slice(0, USERNAME_MAX))} />
        <small id="username-help" className={username && !usernameValid ? 'field__error' : 'muted'}>
          De 3 a {USERNAME_MAX} caracteres: un correo o un nombre con letras, números, punto, guion o guion bajo.
        </small>
      </div>
      <PasswordInput label="Contraseña" value={password} onChange={setPassword} autoComplete="new-password"
                     describedBy="password-rules" />
      <ul id="password-rules" className="rules" aria-label="Requisitos de la contraseña">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return <li key={rule.label} className={ok ? 'is-ok' : ''}><span aria-hidden="true">{ok ? '✓' : '•'}</span> {rule.label}</li>;
        })}
      </ul>
      <div className="field">
        <label htmlFor="new-role">Rol</label>
        <select id="new-role" value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
          {Object.entries(ROLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {errors.length > 0 && (
        <div className="notice notice--error" role="alert">
          <ul className="plain-list">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}
      <button className="button" disabled={!canSubmit}>{busy ? 'Creando…' : 'Crear cuenta'}</button>
    </form>
  );
}
