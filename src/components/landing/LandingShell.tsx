import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../ThemeToggle';
import { WifiLogo } from '../WifiLogo';
import { LandingStory } from './LandingStory';
import { ParticleStage } from './ParticleStage';
import { STAGE } from './stageProgress';

interface Props {
  title: string;
  subtitle: string;
  busy?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}

/** «Cómo funciona» scrolls to the story smoothly (instantly with reduced motion) instead of jumping. */
function toStory(event: MouseEvent<HTMLAnchorElement>) {
  const target = document.getElementById('como-funciona');
  if (!target) return;
  event.preventDefault();
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}

/**
 * The start page (Avance 28): the login stays in the first screen, and behind everything a 3D scene of colored
 * triangles shows the Wi-Fi symbol. Scrolling tells the story of the network (LandingStory) while the scene comes
 * apart, becomes a router and ends as a connected planet. The other pages of the account (sign-up, recovery) keep
 * AuthShell.
 */
export function LandingShell({ title, subtitle, busy = false, footer, children }: Props) {
  return (
    <div className="landing">
      <ParticleStage />
      <header className="landing__bar">
        <span className="landing__brand"><WifiLogo size={22} /> WiFiSense</span>
        <nav className="landing__nav" aria-label="Inicio">
          <a className="landing__navlink" href="#como-funciona" onClick={toStory}>Cómo funciona</a>
          <ThemeToggle />
          <Link className="landing__signup" to="/registro">Crear cuenta</Link>
        </nav>
      </header>

      <section className="landing__hero" data-stage={STAGE.wifi}>
        <div className="landing__intro">
          <p className="landing__eyebrow">Monitoreo de redes Wi-Fi</p>
          <p className="landing__headline">Tu Wi-Fi,<br />a la vista.</p>
          <p className="landing__text">
            Mide tu conexión, mira qué equipos están conectados y entérate cuando algo no va bien.
          </p>
        </div>
        <main className="auth-card landing__card">
          <span className="auth-card__mark"><WifiLogo busy={busy} size={30} /></span>
          <h1>{title}</h1>
          <p className="auth-card__subtitle">{subtitle}</p>
          {children}
          {footer && <div className="auth-card__footer">{footer}</div>}
        </main>
        <a className="landing__scroll" href="#como-funciona" onClick={toStory}>
          Desliza para ver cómo funciona <span aria-hidden="true">↓</span>
        </a>
      </section>

      <LandingStory />
    </div>
  );
}
