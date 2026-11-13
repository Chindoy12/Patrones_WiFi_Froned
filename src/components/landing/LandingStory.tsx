import { Link } from 'react-router-dom';
import { STAGE } from './stageProgress';

/** Takes the reader back to the form and leaves the cursor in «Usuario o correo». */
export function goToLogin() {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  document.getElementById('username')?.focus({ preventScroll: true });
}

/**
 * What the start page tells while the scene changes shape (each section names its shape with `data-stage`): today the
 * network is invisible and scattered, WiFiSense puts it in order with the agent and the AI, and in the end everything
 * is connected in one place. Everything it says is what the project really does.
 */
export function LandingStory() {
  return (
    <div className="story">
      <section className="story__part story__part--center" id="como-funciona" data-stage={STAGE.scatter}>
        <h2>Hoy tu red es invisible.</h2>
        <p>
          Celulares, computadores, televisores y parlantes entran y salen de tu Wi-Fi todo el día. Las redes de los
          vecinos comparten el mismo aire. Cuando la conexión se pone lenta, nadie te dice por qué.
        </p>
      </section>

      <section className="story__part story__part--center" data-stage={STAGE.scatter}>
        <p className="story__lead">
          Un equipo que no reconoces. Una señal que se cae en la tarde. Un canal lleno de redes vecinas.
        </p>
        <p>Todo pasa en silencio, regado por todas partes.</p>
      </section>

      <section className="story__part story__part--right" data-stage={STAGE.router}>
        <p className="story__label">Cómo lo ordena WiFiSense</p>
        <h2>Un agente que cuida tu red</h2>
        <p>
          El agente de WiFiSense corre en tu computador y cada minuto envía cómo está tu red: la señal, la latencia,
          los equipos conectados y la seguridad del router.
        </p>
        <p>
          Un modelo de inteligencia artificial (Isolation Forest) aprende lo que es normal en tu red y te avisa
          cuando algo se sale de lo normal.
        </p>
      </section>

      <section className="story__part story__part--left" data-stage={STAGE.planet}>
        <p className="story__label">Todo se conecta</p>
        <h2>Tus equipos, tu router e Internet, en un solo lugar</h2>
        <p>
          Mi Wi-Fi te lo muestra en pantallas claras: tu conexión en vivo, tus equipos por tipo, la seguridad, los
          avisos y las redes cercanas. Y quien administra varias redes las ve todas desde el panel del equipo.
        </p>
        <div className="story__actions">
          <button type="button" className="story__cta" onClick={goToLogin}>Iniciar sesión</button>
          <Link className="story__link" to="/registro">Crear una cuenta</Link>
        </div>
      </section>
    </div>
  );
}
