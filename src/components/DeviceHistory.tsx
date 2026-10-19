import { useApi } from '../hooks/useApi';
import { formatDuration } from '../format';
import type { DeviceSessionHistory, DeviceSessionPeriod } from '../types';

const day = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
const clock = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' });

/** Where each period falls in today's 24 hours, as percentages of the day (only the part that is today). */
export function todaySegments(periods: DeviceSessionPeriod[], now: Date = new Date()): { left: number; width: number }[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const dayMs = 24 * 3600_000;
  return periods.flatMap((p) => {
    const from = Math.max(new Date(p.connectedAt).getTime(), start.getTime());
    const to = Math.min(p.endedAt ? new Date(p.endedAt).getTime() : now.getTime(), start.getTime() + dayMs);
    if (to <= from) return [];
    const left = ((from - start.getTime()) / dayMs) * 100;
    return [{ left, width: Math.max(((to - from) / dayMs) * 100, 0.6) }];
  });
}

/** One line of the history: "sáb 18 oct · 2:10 p. m. → 3:05 p. m. (55 min)". */
export function periodLabel(period: DeviceSessionPeriod): string {
  const start = new Date(period.connectedAt);
  const end = period.endedAt ? clock.format(new Date(period.endedAt)) : 'ahora';
  return `${day.format(start)} · ${clock.format(start)} → ${end} (${formatDuration(period.minutes)})`;
}

/**
 * When a device was connected in the last 7 days: a strip with today's 24 hours and the list of periods. A device
 * counts as disconnected after missing about two reports (10 minutes), so a phone at rest does not look like it left.
 */
export function DeviceHistory({ load }: { load: () => Promise<DeviceSessionHistory> }) {
  const history = useApi(load, []);
  if (history.error) return <p className="notice notice--error" role="alert">{history.error}</p>;
  if (!history.data) return <p className="muted small">Cargando historial…</p>;
  const data = history.data;
  if (data.periods.length === 0) {
    return <p className="muted small">Sin conexiones en los últimos {data.days} días.</p>;
  }
  return (
    <div className="devhistory">
      <p className="small">
        <strong>Últimos {data.days} días:</strong> {data.connections === 1 ? '1 conexión' : `${data.connections} conexiones`},{' '}
        {formatDuration(data.totalMinutes)} conectado en total.
      </p>
      <div className="devhistory__strip" role="img" aria-label="Horas de hoy en que estuvo conectado">
        {todaySegments(data.periods).map((s, i) => (
          <i key={i} style={{ left: `${s.left}%`, width: `${s.width}%` }} />
        ))}
        <span className="devhistory__ticks" aria-hidden="true"><b>0 h</b><b>6 h</b><b>12 h</b><b>18 h</b><b>24 h</b></span>
      </div>
      <ul className="devhistory__list">
        {data.periods.slice(0, 12).map((p) => (
          <li key={p.connectedAt} className={p.ongoing ? 'is-ongoing' : undefined}>
            {periodLabel(p)}{p.ongoing && <span className="tag tag--accent">Conectado</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
