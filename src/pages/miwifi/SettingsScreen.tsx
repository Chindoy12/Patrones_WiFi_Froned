import { AccountPanel } from '../../components/AccountPanel';
import { AgentPanel } from '../../components/AgentPanel';
import { FunctionGuide } from '../../components/FunctionGuide';
import { ScreenHeader } from './common';
import { useMiWifi } from './context';
import { MyNetworksPanel } from './MyNetworksPanel';

/** Everything that is set up once: the networks, the agent of the chosen one, the account and what each thing does. */
export function SettingsScreen() {
  const { selected, agent } = useMiWifi();
  return (
    <>
      <ScreenHeader title="Ajustes">Tus redes, el agente de la red elegida y tu cuenta.</ScreenHeader>
      <MyNetworksPanel />
      {selected && <AgentPanel key={`agent-${selected.id}`} network={selected} onChange={() => agent?.reload()} />}
      <AccountPanel />
      <FunctionGuide />
    </>
  );
}
