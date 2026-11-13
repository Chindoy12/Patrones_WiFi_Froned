import { type ReactNode, useEffect, useRef, useState } from 'react';
import { ThemeToggle } from '../ThemeToggle';
import { WifiLogo } from '../WifiLogo';
import { CHAPTER_MS, rememberWelcome, welcomeSeen } from './chapters';
import { ParticleStage } from './ParticleStage';
import { nextShape, SHAPE, type Shape } from './stageProgress';
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
 * it the scene keeps going through its seven shapes on its own (one every 6 seconds). Whoever already saw the
 * welcome goes straight to the login, with «Ver la presentación» to see it again. Signing up is offered only inside
 * the card («¿No tienes cuenta? Crea una aquí»).
 */
export function LandingShell({ title, subtitle, busy = false, footer, children }: Props) {
  const [mode, setMode] = useState<Mode>(() => (welcomeSeen() ? 'login' : 'welcome'));
  const [shape, setShape] = useState<Shape>(SHAPE.wifi);
  const fromWelcome = useRef(false);

  function start() {
    rememberWelcome();
    fromWelcome.current = true;
    setMode('login');
  }

  // behind the login the seven shapes keep following each other, one every 6 seconds
  useEffect(() => {
    if (mode !== 'login') return undefined;
    const timer = window.setInterval(() => {
      if (!document.hidden) setShape(nextShape);
    }, CHAPTER_MS);
    return () => window.clearInterval(timer);
  }, [mode]);

  // coming from «Comenzar», the cursor waits in the first field
  useEffect(() => {
    if (mode === 'login' && fromWelcome.current) document.getElementById('username')?.focus();
  }, [mode]);

  return (
    <div className={`landing landing--${mode}`}>
      <ParticleStage shape={shape} />
      <header className="landing__bar">
        <span className="landing__brand"><WifiLogo size={22} /> WiFiSense</span>
        <nav className="landing__nav" aria-label="Inicio">
          {mode === 'welcome'
            ? <button type="button" className="landing__navlink" onClick={start}>Ya tengo cuenta</button>
            : <button type="button" className="landing__navlink" onClick={() => setMode('welcome')}>Ver la presentación</button>}
          <ThemeToggle />
        </nav>
      </header>

      {mode === 'welcome' ? <Welcome onShape={setShape} onStart={start} /> : (
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
