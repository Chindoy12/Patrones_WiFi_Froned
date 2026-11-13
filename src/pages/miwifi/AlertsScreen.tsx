import { AlertPreferencesCard, AlertsCard } from '../../components/AgentPanel';
import { ScreenHeader, useReport } from './common';

/** What WiFiSense noticed (each notice once, with how many times it happened) and which ones arrive by email. */
export function AlertsScreen() {
  const report = useReport('tus avisos');
  return (
    <>
      <ScreenHeader title="Avisos">
        Los equipos nuevos, los bajones de seguridad y las anomalías. Un aviso que se repite aparece una sola vez, con
        cuántas veces pasó.
      </ScreenHeader>
      {'fallback' in report ? report.fallback : (
        <div className="dash miwifi__pair">
          <AlertsCard alerts={report.overview.alerts} limit={30} />
          <AlertPreferencesCard />
        </div>
      )}
    </>
  );
}
