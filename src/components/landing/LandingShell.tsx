import { type ReactNode, useState } from 'react';
import { ThemeToggle } from '../ThemeToggle';
import { WifiLogo } from '../WifiLogo';
import { rememberWelcome, welcomeSeen } from './chapters';
import { ParticleStage } from './ParticleStage';
import { Welcome } from './Welcome';

interface Props {
  title: string;
  subtitle: string;
  busy?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}

type Mode = 'welcome' | 'login';

/**
 * The start page (Avance 29), on one screen with no scrolling. The first visit opens the welcome: the story plays
 * by itself over the 3D scene and «Comenzar» leads to the login. The login is compact, so everything fits, and behind
 * it the scene keeps forming and unforming its shapes on its own (one every 10 seconds). Whoever already saw the
 * welcome goes straight to the login, with «Ver la presentación» to see it again. Signing up is offered only inside
 * the card («¿No tienes cuenta? Crea una aquí»).
 */
export function LandingShell({ title, subtitle, busy = false, footer, children }: Props) {
  const [mode, setMode] = useState<Mode>(() => (welcomeSeen() ? 'login' : 'welcome'));
  const [stage, setStage] = useState(0);

  function start() {
    rememberWelcome();
    setMode('login');
  }

  return (
    <div className={`landing landing--${mode}`}>
      <ParticleStage stage={stage} />
      <header className="landing__bar">
        <span className="landing__brand"><WifiLogo size={22} /> WiFiSense</span>
        <nav className="landing__nav" aria-label="Inicio">
          {mode === 'welcome'
            ? <button type="button" className="landing__navlink" onClick={start}>Ya tengo cuenta</button>
            : <button type="button" className="landing__navlink" onClick={() => setMode('welcome')}>Ver la presentación</button>}
          <ThemeToggle />
        </nav>
      </header>

      {mode === 'welcome' ? <Welcome stage={stage} onStage={setStage} onStart={start} /> : (
        <section className="landing__login">
          <div className="landing__intro">
            <p className="landing__eyebrow">Monitoreo de redes Wi-Fi</p>
            <p className="landing__headline">Tu Wi-Fi,<br />a la vista.</p>
          </div>
          <main className="auth-card landing__card">
            <span className="auth-card__mark"><WifiLogo busy={busy} size={26} /></span>
            <h1>{title}</h1>
            <p className="auth-card__subtitle">{subtitle}</p>
            {children}
            {footer && <div className="auth-card__footer">{footer}</div>}
          </main>
        </section>
      )}
    </div>
  );
}
