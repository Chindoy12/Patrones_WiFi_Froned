import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeviceHistory, periodLabel, todaySegments } from '../src/components/DeviceHistory';
import { change, mondayOf, WeeklyReportPanel, weeklyCsv } from '../src/components/WeeklyReportPanel';
import { formatDuration } from '../src/format';
import { api } from '../src/services/api';
import type { DeviceSessionHistory, WeeklyReport } from '../src/types';

vi.mock('../src/services/api', () => ({ api: { weeklyReport: vi.fn() } }));

const report: WeeklyReport = {
  networkId: 7, ssid: 'Lab-Redes', zone: 'America/Bogota', start: '2026-10-12', end: '2026-10-18',
  week: { measurements: 450, latencyAvgMs: 38.6, jitterAvgMs: 2.1, packetLossAvgPct: 0.2, coveragePct: 85.7,
    trafficMb: 120.5, alerts: 2, criticalAlerts: 1 },
  previousWeek: { measurements: 400, latencyAvgMs: 50, jitterAvgMs: 2.5, packetLossAvgPct: 0.4, coveragePct: 80,
    trafficMb: 100, alerts: 0, criticalAlerts: 0 },
  days: [
    { date: '2026-10-12', measurements: 200, hoursMeasured: 20, latencyAvgMs: 30, jitterAvgMs: 2, packetLossAvgPct: 0,
      signalAvgDbm: -60, maxDevices: 5, trafficMb: 10, alerts: 0 },
    { date: '2026-10-13', measurements: 250, hoursMeasured: 22, latencyAvgMs: 45.5, jitterAvgMs: 3,
      packetLossAvgPct: 0.5, signalAvgDbm: -61, maxDevices: 6, trafficMb: 12, alerts: 1 },
  ],
  worstHour: { hour: 20, latencyAvgMs: 85.2, measurements: 12 },
  protocols: [{ protocol: 'TCP', packets: 9000 }, { protocol: 'UDP', packets: 950 }],
  devices: { seen: 9, newOnes: 2 },
  security: { latestScore: 74, latestGrade: 'ACCEPTABLE', lowestScore: 60 },
  highlights: ['La latencia promedio bajó 23 % frente a la semana anterior (de 50.0 a 38.6 ms).',
    'La peor hora fue las 20:00, con 85.2 ms de latencia en promedio.'],
};

beforeEach(() => {
  vi.mocked(api.weeklyReport).mockReset();
});

describe('Reporte semanal', () => {
  it('asks for the Monday of each week, going back one week at a time', async () => {
    vi.mocked(api.weeklyReport).mockResolvedValue(report);
    render(<WeeklyReportPanel networkId={7} />);

    expect(await screen.findByText(/La peor hora fue las 20:00/)).toBeInTheDocument();
    expect(api.weeklyReport).toHaveBeenLastCalledWith(7, mondayOf(0));
    expect(screen.getByRole('button', { name: /Semana siguiente/ })).toBeDisabled();
    expect(screen.getByText('−23 % vs. semana anterior')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3);

    await userEvent.click(screen.getByRole('button', { name: /Semana anterior/ }));
    expect(api.weeklyReport).toHaveBeenLastCalledWith(7, mondayOf(1));
  });

  it('finds the Monday of a week and compares two values', () => {
    const sunday = new Date(2026, 9, 18);
    expect(mondayOf(0, sunday)).toBe('2026-10-12');
    expect(mondayOf(1, sunday)).toBe('2026-10-05');
    expect(mondayOf(0, new Date(2026, 9, 12))).toBe('2026-10-12');
    expect(change(38.6, 50)).toBe('−23 %');
    expect(change(60, 50)).toBe('+20 %');
    expect(change(5, null)).toBe('');
  });

  it('downloads a CSV that Excel opens in Spanish', () => {
    const csv = weeklyCsv(report);
    expect(csv.startsWith('﻿Reporte semanal de Lab-Redes;2026-10-12 a 2026-10-18')).toBe(true);
    expect(csv).toContain('2026-10-13;250;22;45,5;3;0,5;-61;6;12;1');
    expect(csv).toContain('\r\nLa latencia promedio bajó 23 % frente a la semana anterior (de 50.0 a 38.6 ms).');
    expect(weeklyCsv({ ...report, highlights: ['Uno; dos "tres"'] })).toContain('"Uno; dos ""tres"""');
  });
});

describe('Historial de conexiones', () => {
  const history: DeviceSessionHistory = {
    deviceId: 'b'.repeat(24), days: 7, connections: 2, totalMinutes: 130,
    periods: [
      { connectedAt: '2026-10-18T19:00:00Z', endedAt: null, ongoing: true, minutes: 75 },
      { connectedAt: '2026-10-18T14:10:00Z', endedAt: '2026-10-18T15:05:00Z', ongoing: false, minutes: 55 },
    ],
  };

  it('shows how long the device was connected and each period', async () => {
    render(<DeviceHistory load={() => Promise.resolve(history)} />);

    expect(await screen.findByText(/2 conexiones/)).toHaveTextContent('2 h 10 min conectado en total');
    expect(screen.getByText('Conectado')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('places the periods in the 24 hours of today', () => {
    const now = new Date(2026, 9, 18, 12, 0);
    const segments = todaySegments([
      { connectedAt: new Date(2026, 9, 18, 6, 0).toISOString(), endedAt: new Date(2026, 9, 18, 9, 0).toISOString(),
        ongoing: false, minutes: 180 },
      { connectedAt: new Date(2026, 9, 17, 22, 0).toISOString(), endedAt: new Date(2026, 9, 18, 1, 0).toISOString(),
        ongoing: false, minutes: 180 },
      { connectedAt: new Date(2026, 9, 16, 8, 0).toISOString(), endedAt: new Date(2026, 9, 16, 9, 0).toISOString(),
        ongoing: false, minutes: 60 },
    ], now);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({ left: 25, width: 12.5 });
    expect(segments[1].left).toBe(0);
    expect(periodLabel(history.periods[0])).toMatch(/→ ahora \(1 h 15 min\)$/);
  });

  it('writes durations the way people say them', () => {
    expect(formatDuration(55)).toBe('55 min');
    expect(formatDuration(130)).toBe('2 h 10 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(1500)).toBe('1 d 1 h');
  });
});
