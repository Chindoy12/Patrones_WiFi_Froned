import { useState } from 'react';
import { formatNumber } from '../format';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import type { WeeklyReport, WeeklyTotals } from '../types';
import { DataState } from './DataState';
import { Icon } from './Icon';

const dayName = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' });
const shortDate = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** yyyy-mm-dd of the Monday {@code weeks} weeks before the current one (0 = this week), in local time. */
export function mondayOf(weeksBack: number, today: Date = new Date()): string {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - weeksBack * 7);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const asDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** "+12 %" / "−8 %" against the week before; empty without both values. */
export function change(now: number | null, before: number | null): string {
  if (now === null || before === null || before === 0) return '';
  const pct = Math.round(((now - before) / before) * 100);
  return pct === 0 ? '=' : `${pct > 0 ? '+' : '−'}${Math.abs(pct)} %`;
}

const cell = (value: number | string | null) => {
  if (value === null) return '';
  if (typeof value === 'number') return String(value).replace('.', ',');  // Excel in Spanish: decimal comma
  const text = String(value);
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** The report as a CSV that opens in Excel (semicolons and a BOM, as Excel expects in Spanish). */
export function weeklyCsv(report: WeeklyReport): string {
  const rows: (number | string | null)[][] = [
    [`Reporte semanal de ${report.ssid}`, `${report.start} a ${report.end}`],
    [],
    ['Día', 'Mediciones', 'Horas medidas', 'Latencia (ms)', 'Jitter (ms)', 'Pérdida (%)', 'Señal (dBm)',
      'Máx. equipos', 'Tráfico (MB)', 'Alertas'],
    ...report.days.map((d) => [d.date, d.measurements, d.hoursMeasured, d.latencyAvgMs, d.jitterAvgMs,
      d.packetLossAvgPct, d.signalAvgDbm, d.maxDevices, d.trafficMb, d.alerts]),
    [],
    ['Total de la semana', report.week.measurements, null, report.week.latencyAvgMs, report.week.jitterAvgMs,
      report.week.packetLossAvgPct, null, null, report.week.trafficMb, report.week.alerts],
    ['Semana anterior', report.previousWeek.measurements, null, report.previousWeek.latencyAvgMs,
      report.previousWeek.jitterAvgMs, report.previousWeek.packetLossAvgPct, null, null,
      report.previousWeek.trafficMb, report.previousWeek.alerts],
    [],
    ['Lo más importante'],
    ...report.highlights.map((h) => [h]),
  ];
  return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
}

function download(report: WeeklyReport) {
  const url = URL.createObjectURL(new Blob([weeklyCsv(report)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `reporte-semanal-${report.ssid.replace(/[^\w-]+/g, '_')}-${report.start}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function Total({ label, now, before, digits = 1, unit = '' }: {
  label: string; now: number | null; before: number | null; digits?: number; unit?: string;
}) {
  const diff = change(now, before);
  return (
    <div className="weekly__total">
      <span className="muted small">{label}</span>
      <strong className="num">{formatNumber(now, digits, unit)}</strong>
      {diff && <span className="muted small">{diff} vs. semana anterior</span>}
    </div>
  );
}

function Totals({ week, previous }: { week: WeeklyTotals; previous: WeeklyTotals }) {
  return (
    <div className="weekly__totals">
      <Total label="Mediciones" now={week.measurements} before={previous.measurements} digits={0} />
      <Total label="Horas medidas" now={week.coveragePct} before={previous.coveragePct} digits={0} unit=" %" />
      <Total label="Latencia promedio" now={week.latencyAvgMs} before={previous.latencyAvgMs} unit=" ms" />
      <Total label="Pérdida promedio" now={week.packetLossAvgPct} before={previous.packetLossAvgPct} digits={2} unit=" %" />
      <Total label="Tráfico del sensor" now={week.trafficMb} before={previous.trafficMb} unit=" MB" />
      <Total label="Alertas" now={week.alerts} before={previous.alerts} digits={0} />
    </div>
  );
}

/**
 * Weekly report of a team network (Monday to Sunday, Colombia time): what matters in words, the totals against the
 * week before, each day, the protocols and the devices. It can be downloaded as CSV or printed / saved as PDF.
 */
export function WeeklyReportPanel({ networkId }: { networkId: number }) {
  const [weeksBack, setWeeksBack] = useState(0);
  const report = useApi(() => api.weeklyReport(networkId, mondayOf(weeksBack)), [networkId, weeksBack]);
  return (
    <section className="panel weekly" aria-labelledby="weekly-title">
      <div className="weekly__head">
        <h2 id="weekly-title">Reporte semanal</h2>
        <div className="weekly__nav no-print">
          <button className="button button--quiet" onClick={() => setWeeksBack((w) => w + 1)}>← Semana anterior</button>
          <button className="button button--quiet" onClick={() => setWeeksBack((w) => Math.max(0, w - 1))}
                  disabled={weeksBack === 0}>Semana siguiente →</button>
        </div>
      </div>
      <DataState {...report}>
        {(r) => (
          <>
            <p className="muted">
              {r.ssid} · del {shortDate.format(asDate(r.start))} al {shortDate.format(asDate(r.end))} (hora de Colombia)
            </p>
            <ul className="weekly__highlights">
              {r.highlights.map((h) => <li key={h}><Icon name="check" size={14} /> {h}</li>)}
            </ul>
            <Totals week={r.week} previous={r.previousWeek} />
            {r.days.length > 0 && (
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr><th>Día</th><th>Mediciones</th><th>Horas</th><th>Latencia</th><th>Pérdida</th><th>Señal</th>
                      <th>Equipos (máx.)</th><th>Tráfico</th><th>Alertas</th></tr>
                  </thead>
                  <tbody>
                    {r.days.map((d) => (
                      <tr key={d.date}>
                        <td>{dayName.format(asDate(d.date))}</td>
                        <td className="num">{d.measurements}</td>
                        <td className="num">{d.hoursMeasured} / 24</td>
                        <td className="num">{formatNumber(d.latencyAvgMs, 1, ' ms')}</td>
                        <td className="num">{formatNumber(d.packetLossAvgPct, 2, ' %')}</td>
                        <td className="num">{formatNumber(d.signalAvgDbm, 0, ' dBm')}</td>
                        <td className="num">{d.maxDevices ?? '—'}</td>
                        <td className="num">{formatNumber(d.trafficMb, 1, ' MB')}</td>
                        <td className="num">{d.alerts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {(r.protocols.length > 0 || r.devices || r.security) && (
              <dl className="weekly__facts">
                {r.protocols.length > 0 && (
                  <div><dt>Paquetes por protocolo</dt>
                    <dd>{r.protocols.map((p) => `${p.protocol} ${p.packets.toLocaleString('es-CO')}`).join(' · ')}</dd></div>
                )}
                {r.devices && <div><dt>Equipos vistos</dt><dd>{r.devices.seen} ({r.devices.newOnes} nuevos)</dd></div>}
                {r.security && <div><dt>Seguridad</dt><dd>{r.security.latestScore}/100 (mínimo {r.security.lowestScore})</dd></div>}
              </dl>
            )}
            <div className="weekly__actions no-print">
              <button className="button" onClick={() => download(r)}><Icon name="download" size={16} /> Descargar CSV (Excel)</button>
              <button className="button button--quiet" onClick={() => window.print()}><Icon name="report" size={16} /> Imprimir o guardar PDF</button>
            </div>
          </>
        )}
      </DataState>
    </section>
  );
}
