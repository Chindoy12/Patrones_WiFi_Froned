import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Icon } from './Icon';

/** After a new deploy the old page asks for a code file that no longer exists: reloading fixes it. */
export function isNewVersionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError/i.test(message);
}

interface Props {
  children: ReactNode;
  /** When it changes (for example the route), the boundary tries to show its children again. */
  resetKey?: string;
}

interface State {
  error: unknown;
}

/**
 * <b>Error Boundary</b> (React pattern): a page that fails while drawing shows a message in Spanish with "Recargar"
 * and "Volver al inicio" instead of leaving the whole screen blank; the menu and the session stay. Errors of a
 * request are not caught here (each page shows them with DataState): only unexpected errors of the code.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // Only in the browser console: nothing of the user's data is sent anywhere.
    console.error('Error al mostrar la página', error, info.componentStack);
  }

  componentDidUpdate(previous: Props) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const newVersion = isNewVersionError(error);
    return (
      <section className="panel error-boundary" role="alert">
        <h2><Icon name="anomaly" size={20} /> {newVersion ? 'Hay una versión nueva de la página' : 'Algo salió mal en esta página'}</h2>
        <p className="muted">
          {newVersion
            ? 'WiFiSense se actualizó mientras la tenías abierta. Recarga para usar la versión nueva.'
            : 'No es un problema de tu red ni de tus datos: esta sección no se pudo mostrar. Recarga la página; si vuelve a pasar, avísale al equipo.'}
        </p>
        <div className="error-boundary__actions">
          <button className="button" onClick={() => window.location.reload()}>Recargar</button>
          {!newVersion && <a className="button button--quiet" href="/">Volver al inicio</a>}
        </div>
      </section>
    );
  }
}
