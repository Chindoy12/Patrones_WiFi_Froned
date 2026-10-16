import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { EMAIL_MAX, USERNAME_MAX, USERNAME_PATTERN, isEmail, isStrongPassword, normalizePhone } from '../auth/credentials';
import { homePath } from '../auth/guards';
import { AuthShell } from '../components/AuthShell';
import { PasswordInput } from '../components/PasswordInput';
import { PasswordRules } from '../components/PasswordRules';
import { ApiError } from '../services/apiClient';

/** Public sign-up for end users. The backend repeats every check and always assigns the USER role. */
export function RegisterPage() {
  const { user, register } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homePath(user.role)} replace />;

  const usernameValid = USERNAME_PATTERN.test(username.trim());
  // The recovery email is the username when it is one; otherwise it is asked for separately.
  const usernameIsEmail = username.includes('@');
  const emailValid = usernameIsEmail ? isEmail(username) : isEmail(email);
  const phoneValid = !phone.trim() || normalizePhone(phone) !== null;
  const mismatch = confirmation.length > 0 && confirmation !== password;
  const canSubmit = usernameValid && emailValid && phoneValid && isStrongPassword(password)
    && confirmation === password && !busy;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors([]);
    try {
      await register(username.trim(), password, {
        email: usernameIsEmail ? undefined : email.trim(),
        phone: phone.trim() ? normalizePhone(phone) ?? undefined : undefined,
      });
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
        {!usernameIsEmail && (
          <div className="field">
            <label htmlFor="new-email">Correo para recuperar tu contraseña</label>
            <input id="new-email" type="email" value={email} maxLength={EMAIL_MAX} autoComplete="email" required
                   placeholder="tu@correo.com" spellCheck={false} onChange={(e) => setEmail(e.target.value)} />
            {email && !isEmail(email) && <small className="field__error">Escribe un correo válido.</small>}
          </div>
        )}
        <div className="field">
          <label htmlFor="new-phone">Celular (opcional)</label>
          <input id="new-phone" type="tel" value={phone} maxLength={20} autoComplete="tel" inputMode="tel"
                 placeholder="300 123 4567" onChange={(e) => setPhone(e.target.value)} aria-describedby="new-phone-help" />
          <small id="new-phone-help" className={phoneValid ? 'muted' : 'field__error'}>
            {phoneValid ? 'Lo guardamos para recuperar la cuenta por SMS más adelante.' : 'Escribe el celular con indicativo, por ejemplo +57 300 123 4567.'}
          </small>
        </div>
        <PasswordInput label="Contraseña" value={password} onChange={setPassword} autoComplete="new-password"
                       describedBy="signup-rules" />
        <PasswordRules id="signup-rules" password={password} />
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
