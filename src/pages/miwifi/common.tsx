import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import type { AgentOverview, AgentReport, HomeNetwork } from '../../types';
import { useMiWifi } from './context';

/** Title and one line of what this screen is for. */
export function ScreenHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="miwifi__head">
      <h2>{title}</h2>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}

/** Without a network there is nothing to show yet: the first step is in Ajustes. */
export function NeedsNetwork() {
  const { networks } = useMiWifi();
  if (networks.loading && !networks.data) return <p className="notice" aria-busy="true">Cargando…</p>;
  if (networks.error) return <p className="notice notice--error" role="alert">{networks.error}</p>;
  return (
    <section className="eu-hero">
      <h2 className="display">Empieza registrando tu red</h2>
      <p>Agrega tu Wi-Fi y podrás medir su latencia, estabilidad y velocidad, ver tus equipos y saber qué tan segura es.</p>
      <Link className="button" to="/mi-wifi/ajustes"><Icon name="wifi" size={16} /> Registrar mi red</Link>
    </section>
  );
}

/** Devices, security and notices come from the agent: until it reports, say how to get it. */
export function NeedsAgent({ what }: { what: string }) {
  return (
    <section className="dash__card miwifi__empty">
      <Icon name="download" size={22} />
      <div>
        <strong>Para ver {what} necesitas el agente</strong>
        <p className="muted small">
          Es un programa pequeño para Windows que se instala en un computador de tu casa con un código corto.
          Cada 5 minutos revisa tus equipos, la seguridad del Wi-Fi y la conexión.
        </p>
        <Link className="button" to="/mi-wifi/ajustes">Instalar el agente</Link>
      </div>
    </section>
  );
}

/**
 * The chosen network and the latest report of its agent, or what to show instead: loading, an error, the first step
 * (register a network) or the agent (install it). `what` names what is missing («tus equipos»).
 */
export function useReport(what: string): { network: HomeNetwork; overview: AgentOverview; latest: AgentReport }
  | { fallback: ReactNode } {
  const { selected, agent } = useMiWifi();
  if (!selected) return { fallback: <NeedsNetwork /> };
  if (!agent || (agent.loading && !agent.data)) return { fallback: <p className="notice" aria-busy="true">Cargando…</p> };
  if (agent.error && !agent.data) return { fallback: <p className="notice notice--error" role="alert">{agent.error}</p> };
  const overview = agent.data!;
  if (!overview.latest) return { fallback: <NeedsAgent what={what} /> };
  return { network: selected, overview, latest: overview.latest };
}
