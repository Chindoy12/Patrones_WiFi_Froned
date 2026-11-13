import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { groupAlerts } from '../../components/AgentPanel';
import { CATEGORIES, summarize } from '../../components/deviceCategories';
import { Icon, type IconName } from '../../components/Icon';
import { StatusStrip } from '../../components/StatusStrip';
import { formatDateTime } from '../../format';
import { useOnline } from '../../hooks/useOnline';
import { NeedsNetwork } from './common';
import { MAX_NETWORKS, useMiWifi } from './context';

/**
 * The first screen of Mi Wi-Fi: one card for each screen with what matters most there (the quality, how many devices
 * and of which kind, the security score, the notices). Pressing a card opens its screen.
 */
export function SummaryScreen() {
  const { networks, selected, agent, lastTest } = useMiWifi();
  const online = useOnline();
  const count = networks.data?.length ?? 0;
  if (!selected) return <NeedsNetwork />;

  const overview = agent?.data ?? null;
  const latest = overview?.latest ?? null;
  const security = latest?.details.security ?? null;
  const alerts = overview ? groupAlerts(overview.alerts) : [];
  const summary = overview ? summarize(overview.devices) : null;
  const needsAgent = 'Instala el agente para verlo';
  // the test of this visit is fresher than the agent's report
  const quality = lastTest?.qualityScore ?? latest?.qualityScore ?? null;

  return (
    <>
      <div className="miwifi__head">
        <h2>Resumen de «{selected.name}»</h2>
        <p className="muted">Toca una tarjeta para ver el detalle.</p>
      </div>
      <ul className="summary__grid" aria-label="Pantallas de Mi Wi-Fi">
        <SummaryCard to="/mi-wifi/conexion" icon="gauge" title="Conexión"
                     value={quality != null ? String(quality) : '—'} unit={quality != null ? 'de 100' : undefined}>
          {lastTest?.qualityScore != null ? 'Calidad según tu prueba de hace un momento.'
            : quality != null ? 'Calidad según el último reporte del agente.' : 'Prueba tu conexión o mírala en vivo.'}
        </SummaryCard>

        <SummaryCard to="/mi-wifi/equipos" icon="devices" title="Equipos"
                     value={summary && latest ? String(overview!.devices.filter((d) => d.online).length) : '—'}
                     unit={summary && latest ? 'conectados' : undefined}>
          {summary && latest ? (
            <span className="summary__kinds">
              {CATEGORIES.filter((c) => summary[c.id].total > 0).map((c) => (
                <span key={c.id} title={c.label}><Icon name={c.icon} size={15} /> {summary[c.id].total}</span>
              ))}
            </span>
          ) : needsAgent}
        </SummaryCard>

        <SummaryCard to="/mi-wifi/seguridad" icon="shield" title="Seguridad"
                     value={security ? String(security.score) : '—'} unit={security ? 'de 100' : undefined}>
          {security
            ? `${security.gradeLabel}${security.findings.length ? ` · ${security.findings.length} ${security.findings.length === 1 ? 'consejo' : 'consejos'}` : ''}`
            : latest ? 'Sin auditoría en el último reporte.' : needsAgent}
        </SummaryCard>

        <SummaryCard to="/mi-wifi/avisos" icon="bell" title="Avisos" value={latest ? String(alerts.length) : '—'}
                     unit={latest ? (alerts.length === 1 ? 'aviso' : 'avisos') : undefined}>
          {!latest ? needsAgent : alerts.length === 0 ? 'Nada que revisar.' : <span className="summary__clip">{alerts[0].detail}</span>}
        </SummaryCard>

        <SummaryCard to="/mi-wifi/redes-cercanas" icon="wifi" title="Redes cercanas" value="">
          Qué redes Wi-Fi hay alrededor y en qué canal: comparten el aire con la tuya.
        </SummaryCard>

        <SummaryCard to="/mi-wifi/ajustes" icon="key" title="Agente y ajustes" value="">
          {!overview?.key ? 'El agente no está instalado.' : overview.online ? 'El agente está conectado.'
            : overview.key.lastSeenAt ? `Sin reportes desde ${formatDateTime(overview.key.lastSeenAt)}.`
              : 'Esperando el primer reporte del agente.'}
        </SummaryCard>
      </ul>

      <StatusStrip label="Tu cuenta" items={[
        { icon: 'wifi', label: 'Tus redes', detail: `${count} de ${MAX_NETWORKS}`, state: count > 0 ? 'ok' : 'off' },
        { icon: 'clock', label: 'Última prueba', detail: lastTest ? formatDateTime(lastTest.createdAt) : 'En esta visita, ninguna',
          state: lastTest ? 'ok' : 'off' },
        { icon: 'server', label: 'Servidor', detail: online ? 'Conectado' : 'Sin conexión', state: online ? 'ok' : 'down' },
        { icon: 'gauge', label: 'Pruebas', detail: 'Hasta 5 cada 10 minutos', state: 'ok' },
      ]} />
    </>
  );
}

function SummaryCard({ to, icon, title, value, unit, children }: {
  to: string; icon: IconName; title: string; value: string; unit?: string; children: ReactNode;
}) {
  return (
    <li>
      <Link className="summary__card" to={to}>
        <span className="summary__title"><Icon name={icon} size={18} /> {title}</span>
        {value && <strong className="summary__value num">{value}{unit && <small> {unit}</small>}</strong>}
        <span className="summary__text">{children}</span>
        <span className="summary__go" aria-hidden="true">Ver →</span>
      </Link>
    </li>
  );
}
