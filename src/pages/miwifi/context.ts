import { createContext, useContext } from 'react';
import type { ApiState } from '../../hooks/useApi';
import type { AgentOverview, ConnectionTest, HomeNetwork } from '../../types';

/** At most three networks per end user. */
export const MAX_NETWORKS = 3;

/**
 * What every screen of Mi Wi-Fi shares (Avance 27): the user's networks, the one chosen, what its agent reported and
 * the last connection test of this visit. The frame (MiWifiLayout) loads it once, so moving between screens does not
 * load everything again.
 */
export interface MiWifi {
  networks: ApiState<HomeNetwork[]>;
  selected: HomeNetwork | null;
  choose: (networkId: number) => void;
  /** The agent of the chosen network; null while there is no network. */
  agent: ApiState<AgentOverview> | null;
  lastTest: ConnectionTest | null;
  setLastTest: (test: ConnectionTest) => void;
}

export const MiWifiContext = createContext<MiWifi | null>(null);

export function useMiWifi(): MiWifi {
  const value = useContext(MiWifiContext);
  if (!value) throw new Error('useMiWifi va dentro de MiWifiLayout');
  return value;
}
