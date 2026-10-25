import { useId } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatTime } from '../format';
import type { Measurement } from '../types';

export interface Series {
  key: keyof Measurement;
  label: string;
  color: string;
}

/** The tooltip follows the theme: a solid card with a hairline instead of the library's white box. */
const TOOLTIP = {
  contentStyle: {
    background: 'var(--surface-solid)', border: '1px solid var(--line-strong)', borderRadius: 10, color: 'var(--ink)',
    fontSize: 13, padding: '8px 12px',
  },
  labelStyle: { color: 'var(--muted)', marginBottom: 4 },
  cursor: { stroke: 'var(--line-strong)', strokeWidth: 1 },
};

/**
 * Time series of measurements, oldest on the left. The first series gets a soft fill under its line that fades to
 * nothing, so the main metric reads at a glance; the others are plain lines.
 */
export function MetricChart({ data, series, height = 260 }: { data: Measurement[]; series: Series[]; height?: number }) {
  const points = [...data].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const [main, ...rest] = series;
  const fill = `fill${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={main?.color} stopOpacity={0.28} />
              <stop offset="1" stopColor={main?.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="2 6" vertical={false} />
          <XAxis dataKey="measuredAt" tickFormatter={formatTime} minTickGap={40} stroke="var(--muted)" fontSize={12}
                 tickLine={false} axisLine={{ stroke: 'var(--line)' }} />
          <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString('es-CO')} {...TOOLTIP} />
          {main && (
            <Area dataKey={main.key} name={main.label} stroke={main.color} fill={`url(#${fill})`} strokeWidth={2}
                  dot={false} activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />
          )}
          {rest.map((s) => (
            <Line key={s.key} dataKey={s.key} name={s.label} stroke={s.color} dot={false} strokeWidth={1.6}
                  activeDot={{ r: 3, strokeWidth: 0 }} isAnimationActive={false} />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
