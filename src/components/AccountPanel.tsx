import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { EMAIL_MAX, isEmail, isStrongPassword, normalizePhone } from '../auth/credentials';
import { errorMessage, useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { ApiError } from '../services/apiClient';
import type { Account } from '../types';
import { Icon } from './Icon';
import { PasswordInput } from './PasswordInput';
import { PasswordRules } from './PasswordRules';

type Mode = 'view' | 'contact' | 'password';

/** "Mi cuenta": recovery email, phone and password. Every change asks for the current password. */
export function AccountPanel() {
  const account = useApi(api.myAccount);
  const [mode, setMode] = useState<Mode>('view');
  const [notice, setNotice] = useState<string | null>(null);

  function finish(message: string) {
    setMode('view');
    setNotice(message);
    account.reload();
  }

  const data = account.data;
  return (
    <section className="eu-section" aria-labelledby="account-title">
      <div className="eu-section__head">
        <h2 id="account-title">Mi cuenta</h2>
      </div>
      {account.error && <p className="notice notice--error" role="alert">{account.error}</p>}
      {notice && <p className="notice notice--info" role="status">{notice}</p>}
      {data && (
        <article className="eu-card account">
          {!data.email && (
            <p className="notice notice--error" role="alert">
              Tu cuenta no tiene correo de recuperación: agrégalo para poder recuperar la contraseña si la olvidas.
            </p>
          )}
          {mode === 'view' && (
            <>
              <dl className="eu-card__facts">
                <div><dt>Usuario</dt><dd>{data.username}</dd></div>
                <div><dt>Correo de recuperación</dt><dd>{data.email ?? 'Sin correo'}</dd></div>
                <div><dt>Celular</dt><dd>{data.phone ?? 'Sin celular'}</dd></div>
              </dl>
              <div className="eu-card__actions">
                <button className="link-button" onClick={() => { setNotice(null); setMode('contact'); }}>
                  {data.email ? 'Cambiar correo o celular' : 'Agregar correo'}
                </button>
                <button className="link-button" onClick={() => { setNotice(null); setMode('password'); }}>
                  Cambiar contraseña
                </button>
              </div>
            </>
          )}
          {mode === 'contact' && <ContactForm account={data} onCancel={() => setMode('view')}
                                              onSaved={() => finish('Guardamos tu correo y tu celular.')} />}
          {mode === 'password' && <PasswordForm onCancel={() => setMode('view')}
                                                onSaved={() => finish('Contraseña cambiada. Cerramos tus otras sesiones.')} />}
        </article>
      )}
    </section>
  );
}

function Errors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="notice notice--error" role="alert">
      <ul className="plain-list">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
    </div>
  );
}

const problems = (e: unknown) => (e instanceof ApiError && e.errors.length ? e.errors : [errorMessage(e)]);

function ContactForm({ account, onCancel, onSaved }: { account: Account; onCancel: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState(account.email ?? '');
  const [phone, setPhone] = useState(account.phone ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const phoneValid = !phone.trim() || normalizePhone(phone) !== null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors([]);
    try {
      await api.updateMyContact(email.trim(), phone.trim() ? normalizePhone(phone) : null, password);
      onSaved();
    } catch (e) {
      setErrors(problems(e));
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="eu-form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="account-email">Correo de recuperación</label>
        <input id="account-email" type="email" value={email} maxLength={EMAIL_MAX} autoComplete="email"
               onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="account-phone">Celular (opcional)</label>
        <input id="account-phone" type="tel" value={phone} maxLength={20} autoComplete="tel" inputMode="tel"
               placeholder="300 123 4567" onChange={(e) => setPhone(e.target.value)} />
        {!phoneValid && <small className="field__error">Escribe el celular con indicativo, por ejemplo +57 300 123 4567.</small>}
      </div>
      <PasswordInput label="Tu contraseña actual (para confirmar)" value={password} onChange={setPassword}
                     autoComplete="current-password" />
      <Errors errors={errors} />
      <div className="eu-form__actions">
        <button className="button" disabled={!isEmail(email) || !phoneValid || !password || busy}>
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" className="button button--quiet" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

function PasswordForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const { renew } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors([]);
    try {
      renew(await api.changeMyPassword(current, next));
      onSaved();
    } catch (e) {
      setErrors(problems(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="eu-form" onSubmit={submit} noValidate>
      <PasswordInput label="Contraseña actual" value={current} onChange={setCurrent} autoComplete="current-password" />
      <PasswordInput label="Contraseña nueva" value={next} onChange={setNext} autoComplete="new-password"
                     describedBy="account-rules" />
      <PasswordRules id="account-rules" password={next} />
      <PasswordInput label="Repite la contraseña nueva" value={confirmation} onChange={setConfirmation}
                     autoComplete="new-password" />
      {confirmation && confirmation !== next && <small className="field__error">Las contraseñas no coinciden.</small>}
      <Errors errors={errors} />
      <div className="eu-form__actions">
        <button className="button" disabled={!current || !isStrongPassword(next) || confirmation !== next || busy}>
          <Icon name="key" size={16} /> {busy ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
        <button type="button" className="button button--quiet" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
