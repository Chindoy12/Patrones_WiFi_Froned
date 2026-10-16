import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { isStrongPassword } from '../auth/credentials';
import { AuthShell } from '../components/AuthShell';
import { PasswordInput } from '../components/PasswordInput';
import { PasswordRules } from '../components/PasswordRules';
import { api } from '../services/api';
import { ApiError } from '../services/apiClient';

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

/** Reads the token from the link fragment (#t=…) and removes it from the address bar and the history. */
export function readTokenFromLocation(): string | null {
  const token = new URLSearchParams(window.location.hash.slice(1)).get('t');
  if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  return token && TOKEN.test(token) ? token : null;
}

/** New password from the recovery email. Every session of the account is closed afterwards. */
export function ResetPasswordPage() {
  const [token] = useState(readTokenFromLocation);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const mismatch = confirmation.length > 0 && confirmation !== password;

  useEffect(() => {
    document.title = 'Nueva contraseña · WiFiSense';
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setErrors([]);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (e) {
      if (e instanceof ApiError && e.errors.length) setErrors(e.errors);
      else setErrors([e instanceof ApiError ? e.message : 'No se pudo cambiar la contraseña. Intenta de nuevo.']);
    } finally {
      setBusy(false);
    }
  }

  const footer = <><Link to="/login">Volver a iniciar sesión</Link></>;
  if (!token) {
    return (
      <AuthShell title="Enlace no válido" subtitle="Este enlace no sirve o ya se usó." footer={footer}>
        <p className="notice notice--error" role="alert">
          Pide uno nuevo desde <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
        </p>
      </AuthShell>
    );
  }
  if (done) {
    return (
      <AuthShell title="Contraseña actualizada" subtitle="Ya puedes iniciar sesión con tu contraseña nueva."
                 footer={footer}>
        <p className="notice notice--info" role="status">
          Por seguridad cerramos las sesiones que estaban abiertas con la contraseña anterior.
        </p>
        <Link className="button" to="/login">Iniciar sesión</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Crea una contraseña nueva" subtitle="Escríbela dos veces. No la compartas con nadie." busy={busy}
               footer={footer}>
      <form onSubmit={submit} noValidate>
        <PasswordInput label="Contraseña nueva" value={password} onChange={setPassword} autoComplete="new-password"
                       describedBy="reset-rules" />
        <PasswordRules id="reset-rules" password={password} />
        <PasswordInput label="Repite la contraseña" value={confirmation} onChange={setConfirmation}
                       autoComplete="new-password" describedBy="reset-mismatch" />
        {mismatch && <small id="reset-mismatch" className="field__error">Las contraseñas no coinciden.</small>}
        {errors.length > 0 && (
          <div className="notice notice--error" role="alert">
            <ul className="plain-list">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}
        <button className="button" disabled={!isStrongPassword(password) || confirmation !== password || busy}>
          {busy ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </AuthShell>
  );
}
