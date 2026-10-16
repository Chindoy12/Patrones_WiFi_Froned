import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { USERNAME_MAX } from '../auth/credentials';
import { homePath } from '../auth/guards';
import { AuthShell } from '../components/AuthShell';
import { PasswordInput } from '../components/PasswordInput';
import { ApiError } from '../services/apiClient';

const GENERIC_ERROR = 'Datos incorrectos.';

export function LoginPage() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homePath(user.role)} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (e) {
      // Only throttling and connectivity get their own message; everything else is "Datos incorrectos".
      const known = e instanceof ApiError && (e.status === 0 || e.status === 429);
      setError(known ? (e as ApiError).message : GENERIC_ERROR);
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Inicia sesión" subtitle="Mide y entiende la calidad de tu conexión Wi-Fi." busy={busy}
               footer={<>¿No tienes cuenta? <Link to="/registro">Crea una aquí</Link></>}>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="username">Usuario o correo</label>
          <input id="username" value={username} maxLength={USERNAME_MAX} autoComplete="username" required
                 placeholder="tu.usuario o tu@correo.com" spellCheck={false}
                 onChange={(e) => setUsername(e.target.value.slice(0, USERNAME_MAX))} />
        </div>
        <PasswordInput label="Contraseña" value={password} onChange={setPassword} autoComplete="current-password" />
        <p className="auth-card__forgot"><Link to="/recuperar">¿Olvidaste tu contraseña?</Link></p>
        {error && <p className="notice notice--error" role="alert">{error}</p>}
        <button className="button" disabled={busy || !username.trim() || !password}>
          {busy ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </AuthShell>
  );
}
