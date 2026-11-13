import { DevicesCard } from '../../components/AgentPanel';
import { api } from '../../services/api';
import { ScreenHeader, useReport } from './common';
import { useMiWifi } from './context';

/** The devices of the network, by category; each category opens on its own screen (?tipo=…). */
export function DevicesScreen() {
  const { agent } = useMiWifi();
  const report = useReport('tus equipos');
  return (
    <>
      <ScreenHeader title="Equipos">
        Elige un tipo de equipo para ver su lista: primero los conectados, luego los de la última semana y aparte los
        más antiguos.
      </ScreenHeader>
      {'fallback' in report ? report.fallback : (
        <div className="dash">
          <DevicesCard overview={report.overview} latest={report.latest} onChange={() => agent?.reload()}
                       updateDevice={(id, change) => api.updateAgentDevice(report.network.id, id, change)}
                       loadHistory={(id) => api.agentDeviceSessions(report.network.id, id)}
                       identify={() => api.identifyAgentDevice(report.network.id)} showTitle={false} />
        </div>
      )}
    </>
  );
}
