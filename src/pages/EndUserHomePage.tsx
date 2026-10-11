import { useAuth } from '../auth/AuthContext';
import { PageHeader } from '../components/PageHeader';

/** Landing page for end users; the connection test and its gauges arrive in the next advance. */
export function EndUserHomePage() {
  const { user, logout } = useAuth();
  return (
    <main className="content">
      <PageHeader title={`Hola, ${user?.username ?? ''}`} description="Tu espacio para revisar la calidad de tu conexión Wi-Fi." />
      <section className="panel">
        <h2>Mi conexión</h2>
        <p className="muted">
          Muy pronto podrás medir desde aquí la latencia, la estabilidad y la velocidad de tu conexión, y ver
          recomendaciones para mejorarla.
        </p>
        <button className="button button--quiet" onClick={logout}>Cerrar sesión</button>
      </section>
    </main>
  );
}
