import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EMAIL_MAX, isEmail } from '../auth/credentials';
import { AuthShell } from '../components/AuthShell';
import { api } from '../services/api';
import { ApiError } from '../services/apiClient';

/** "¿Olvidaste tu contraseña?": asks for the email and always answers the same way. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const valid = isEmail(email);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setSent((await api.forgotPassword(email.trim())).message);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo enviar la solicitud. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Recupera tu contraseña" busy={busy}
               subtitle="Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva."
               footer={<><Link to="/login">Volver a iniciar sesión</Link></>}>
      {sent ? (
        <div role="status">
          <p className="notice notice--info">{sent}</p>
          <p className="muted small">El enlace sirve una sola vez y vence en 30 minutos.</p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="recover-email">Correo</label>
            <input id="recover-email" type="email" value={email} maxLength={EMAIL_MAX} autoComplete="email" required
                   placeholder="tu@correo.com" spellCheck={false} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="notice notice--error" role="alert">{error}</p>}
          <button className="button" disabled={!valid || busy}>{busy ? 'Enviando…' : 'Enviar enlace'}</button>
        </form>
      )}
    </AuthShell>
  );
}
