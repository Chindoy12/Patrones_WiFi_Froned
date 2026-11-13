import { ChannelCard, Findings, SecurityCard, WifiCard } from '../../components/AgentPanel';
import { RouterPanel } from '../../components/RouterPanel';
import { api } from '../../services/api';
import { ScreenHeader, useReport } from './common';

/** How safe the network is and what to do: the score, the vulnerabilities, the Wi-Fi, its channel and the router. */
export function SecurityScreen() {
  const report = useReport('la seguridad de tu red');
  return (
    <>
      <ScreenHeader title="Seguridad">
        El puntaje de tu red, lo que encontramos y qué hacer, el canal con menos interferencia y tu router.
      </ScreenHeader>
      {'fallback' in report ? report.fallback : (
        <>
          <div className="dash">
            <SecurityCard security={report.latest.details.security ?? null} />
            <WifiCard latest={report.latest} />
            {report.latest.details.security && <Findings security={report.latest.details.security} />}
            {report.latest.details.channel && <ChannelCard channel={report.latest.details.channel} />}
          </div>
          <RouterPanel key={`router-${report.network.id}`} load={() => api.myRouter(report.network.id)}
                       deps={[report.network.id]} />
        </>
      )}
    </>
  );
}
