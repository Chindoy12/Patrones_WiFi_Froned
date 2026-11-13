import { BehaviorCard } from '../../components/AgentPanel';
import { ConnectionPanel } from '../../components/ConnectionPanel';
import { LivePanel } from '../../components/LivePanel';
import { api } from '../../services/api';
import { NeedsNetwork, ScreenHeader } from './common';
import { useMiWifi } from './context';

/** How the connection is doing: the test (what it can hold), «En vivo» (what is used now) and what the AI says. */
export function ConnectionScreen() {
  const { selected, agent, setLastTest } = useMiWifi();
  if (!selected) return <NeedsNetwork />;
  const latest = agent?.data?.latest ?? null;
  return (
    <>
      <ScreenHeader title="Conexión">
        «Probar mi conexión» mide cuánto aguanta tu internet; «En vivo», cuánto se está usando en este momento.
      </ScreenHeader>
      <ConnectionPanel key={selected.id} network={selected} onTested={setLastTest} />
      <LivePanel key={`live-${selected.id}`} load={(after) => api.myLive(selected.id, after)} />
      {latest && <div className="dash miwifi__single"><BehaviorCard latest={latest} /></div>}
    </>
  );
}
