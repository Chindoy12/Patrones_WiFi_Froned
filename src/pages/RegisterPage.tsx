import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { PASSWORD_RULES, USERNAME_MAX, USERNAME_PATTERN, isStrongPassword } from '../auth/credentials';
import { homePath } from '../auth/guards';
import { AuthShell } from '../components/AuthShell';
import { PasswordInput } from '../components/PasswordInput';
import { ApiError } from '../services/apiClient';

/** Public sign-up for end users. The backend repeats every check and always assigns the USER role. */
export function RegisterPage() {
  const { user, register } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homePath(user.role)} replace />;

  const usernameValid = USERNAME_PATTERN.test(username.trim());
  const mismatch = confirmation.length > 0 && confirmation !== password;
  const canSubmit = usernameValid && isStrongPassword(password) && confirmation === password && !busy;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors([]);
    try {
      await register(username.trim(), password);
    } catch (e) {
      if (e instanceof ApiError && e.errors.length) setErrors(e.errors);
      else setErrors([e instanceof ApiError ? e.message : 'No se pudo crear la cuenta. Intenta de nuevo.']);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Crea tu cuenta" subtitle="Regístrate gratis para analizar tu conexión Wi-Fi." busy={busy}
               footer={<>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></>}>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="new-username">Usuario o correo</label>
          <input id="new-username" value={username} maxLength={USERNAME_MAX} autoComplete="username" required
                 placeholder="tu.usuario o tu@correo.com" spellCheck={false} aria-describedby="new-username-help"
                 onChange={(e) => setUsername(e.target.value.slice(0, USERNAME_MAX))} />
          <small id="new-username-help" className={username && !usernameValid ? 'field__error' : 'muted'}>
            De 3 a {USERNAME_MAX} caracteres: un correo o un nombre con letras, números, punto, guion o guion bajo.
          </small>
        </div>
        <PasswordInput label="Contraseña" value={password} onChange={setPassword} autoComplete="new-password"
                       describedBy="signup-rules" />
        <ul id="signup-rules" className="rules" aria-label="Requisitos de la contraseña">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(password);
            return <li key={rule.label} className={ok ? 'is-ok' : ''}><span aria-hidden="true">{ok ? '✓' : '•'}</span> {rule.label}</li>;
          })}
        </ul>
        <PasswordInput label="Repite la contraseña" value={confirmation} onChange={setConfirmation}
                       autoComplete="new-password" describedBy="signup-mismatch" />
        {mismatch && <small id="signup-mismatch" className="field__error">Las contraseñas no coinciden.</small>}
        {errors.length > 0 && (
          <div className="notice notice--error" role="alert">
            <ul className="plain-list">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}
        <button className="button" disabled={!canSubmit}>{busy ? 'Creando cuenta…' : 'Crear cuenta'}</button>
      </form>
    </AuthShell>
  );
}
