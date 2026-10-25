import { useId } from 'react';
import { Icon, type IconName } from './Icon';

/**
 * good, fair and poor grade a quality; share is a plain proportion (for example, how much of the traffic is UDP) that
 * is neither good nor bad, so it is drawn in the accent color and without a status icon.
 */
export type GaugeStatus = 'good' | 'fair' | 'poor' | 'none' | 'share';

interface Props {
  /** Fill of the arc from 0 to 100 (a quality score or a share). null draws an empty gauge. */
  percent: number | null;
  /** What the gauge shows in its center, e.g. "82" or "24". */
  value: string;
  unit?: string;
  label: string;
  status: GaugeStatus;
  /** Words for the status (e.g. "Buena"); always shown, so the state never depends on color alone. */
  caption?: string;
  size?: 'lg' | 'sm';
}

const SWEEP = 240;
const START = 150;
export const TICKS = 31;
const STATUS_ICON: Partial<Record<GaugeStatus, IconName>> = { good: 'check', fair: 'minus', poor: 'cross', none: 'minus' };

function xy(angle: number, radius: number): [number, number] {
  const rad = (angle * Math.PI) / 180;
  return [100 + radius * Math.cos(rad), 100 + radius * Math.sin(rad)];
}

function point(angle: number, radius: number) {
  const [x, y] = xy(angle, radius);
  return `${x.toFixed(2)} ${y.toFixed(2)}`;
}

/** 240° arc, opening at the bottom; it fills clockwise from the lower left. */
export function arcPath(radius: number): string {
  return `M ${point(START, radius)} A ${radius} ${radius} 0 1 1 ${point(START + SWEEP, radius)}`;
}

/**
 * Angles of the tick marks around the arc, from the lower left to the lower right, and whether each one is lit for a
 * fill of 0–100. Like the bars of a Wi-Fi signal, the marks light up as far as the value goes.
 */
export function ticks(fill: number): { angle: number; on: boolean; major: boolean }[] {
  return Array.from({ length: TICKS }, (_, i) => {
    const at = (i / (TICKS - 1)) * 100;
    return { angle: START + (SWEEP * i) / (TICKS - 1), on: fill > 0 && at <= fill, major: i % 5 === 0 };
  });
}

/** Radial meter: the fill and the lit ticks carry the value, the track is a lighter step, the words carry the status. */
export function Gauge({ percent, value, unit, label, status, caption, size = 'lg' }: Props) {
  const gradient = useId();
  const fill = percent === null ? 0 : Math.min(Math.max(percent, 0), 100);
  const radius = size === 'lg' ? 76 : 72;
  const path = arcPath(radius);
  const empty = value === '—';
  const spoken = empty ? `${label}: sin datos` : `${label}: ${value}${unit ? ` ${unit}` : ''}${caption ? `, ${caption}` : ''}`;
  const icon = STATUS_ICON[status];

  return (
    <figure className={`gauge gauge--${size} gauge--${status}`} role="img" aria-label={spoken}>
      <svg viewBox="0 0 200 172" className="gauge__arc" aria-hidden="true">
        <defs>
          <linearGradient id={gradient} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" className="gauge__stop-start" />
            <stop offset="1" className="gauge__stop-end" />
          </linearGradient>
        </defs>
        <g className="gauge__ticks">
          {ticks(fill).map(({ angle, on, major }) => {
            const [x1, y1] = xy(angle, radius + 13);
            const [x2, y2] = xy(angle, radius + (major ? 20 : 17));
            return <line key={angle} x1={x1.toFixed(2)} y1={y1.toFixed(2)} x2={x2.toFixed(2)} y2={y2.toFixed(2)}
                         className={`gauge__tick${on ? ' is-on' : ''}${major ? ' is-major' : ''}`} />;
          })}
        </g>
        <path d={path} className="gauge__track" pathLength={100} />
        {fill > 0 && (
          <path d={path} className="gauge__fill" pathLength={100} stroke={`url(#${gradient})`}
                strokeDasharray={`${fill} 100`} />
        )}
      </svg>
      <div className="gauge__center" aria-hidden="true">
        <span className="gauge__value">{value}{unit && !empty && <small>{unit}</small>}</span>
        <span className="gauge__label">{label}</span>
      </div>
      {caption && (
        <figcaption className="gauge__caption" aria-hidden="true">
          {icon && <Icon name={icon} size={14} />} {caption}
        </figcaption>
      )}
    </figure>
  );
}
