import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { EndUserShell } from '../../components/EndUserShell';
import { Icon, type IconName } from '../../components/Icon';
import { TopBar } from '../../components/TopBar';
import { greetingName } from '../../format';
import { useApi } from '../../hooks/useApi';
import { useOnline } from '../../hooks/useOnline';
import { api } from '../../services/api';
import type { AgentOverview, ConnectionTest } from '../../types';
import { type MiWifi, MiWifiContext } from './context';

const AGENT_REFRESH_MS = 60_000;

/** The screens of Mi Wi-Fi, in the order of the menu. */
export const SCREENS: { to: string; label: string; icon: IconName }[] = [
  { to: '/mi-wifi', label: 'Resumen', icon: 'home' },
  { to: '/mi-wifi/conexion', label: 'Conexión', icon: 'gauge' },
  { to: '/mi-wifi/equipos', label: 'Equipos', icon: 'devices' },
  { to: '/mi-wifi/seguridad', label: 'Seguridad', icon: 'shield' },
  { to: '/mi-wifi/avisos', label: 'Avisos', icon: 'bell' },
  { to: '/mi-wifi/redes-cercanas', label: 'Redes cercanas', icon: 'wifi' },
  { to: '/mi-wifi/ajustes', label: 'Ajustes', icon: 'key' },
];

const NO_AGENT: Promise<AgentOverview> = new Promise(() => undefined);

/**
 * Frame of Mi Wi-Fi (Avance 27): the greeting, the network chosen, a menu with one screen for each thing (summary,
 * connection, devices, security, notices, nearby networks and settings). Before, everything was one long page; now
 * each thing has its place.
 */
export function MiWifiLayout() {
  const { user } = useAuth();
  const online = useOnline();
  const networks = useApi(api.myNetworks);
  const [chosen, setChosen] = useState<number | null>(null);
  const [lastTest, setLastTest] = useState<ConnectionTest | null>(null);
  const selected = networks.data?.find((n) => n.id === chosen) ?? networks.data?.[0] ?? null;
  const agentState = useApi(() => (selected ? api.myAgent(selected.id) : NO_AGENT), [selected?.id]);
  const agent = selected ? agentState : null;
  const { reload } = agentState;

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) reload();
    }, AGENT_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [reload]);

  const context: MiWifi = { networks, selected, choose: setChosen, agent, lastTest, setLastTest };
  const count = networks.data?.length ?? 0;

  return (
    <EndUserShell>
      <TopBar title={`Hola, ${greetingName(user?.username)}`} eyebrow="Mi Wi-Fi"
              status={{ label: online ? 'Conectado' : 'Sin conexión', ok: online }} />

      {count > 1 && selected && (
        <div className="eu-networks" role="group" aria-label="Elige la red">
          {networks.data!.map((n) => (
            <button key={n.id} aria-pressed={n.id === selected.id} onClick={() => setChosen(n.id)}>{n.name}</button>
          ))}
        </div>
      )}

      <nav className="miwifi__nav" aria-label="Secciones de Mi Wi-Fi">
        {SCREENS.map((s) => (
          <NavLink key={s.to} to={s.to} end={s.to === '/mi-wifi'}>
            <Icon name={s.icon} size={17} /> {s.label}
          </NavLink>
        ))}
      </nav>

      <MiWifiContext.Provider value={context}>
        <Outlet />
      </MiWifiContext.Provider>
    </EndUserShell>
  );
}
