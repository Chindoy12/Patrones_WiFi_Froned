import { useId } from 'react';
import { Icon, type IconName } from './Icon';

export type GaugeStatus = 'good' | 'fair' | 'poor' | 'none';

interface Props {
  /** Fill of the arc from 0 to 100 (a quality score). null draws an empty gauge. */
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
const STATUS_ICON: Record<GaugeStatus, IconName> = { good: 'check', fair: 'minus', poor: 'cross', none: 'minus' };

function point(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180;
  return `${(100 + radius * Math.cos(rad)).toFixed(2)} ${(100 + radius * Math.sin(rad)).toFixed(2)}`;
}

/** 240° arc, opening at the bottom; it fills clockwise from the lower left. */
export function arcPath(radius: number): string {
  return `M ${point(START, radius)} A ${radius} ${radius} 0 1 1 ${point(START + SWEEP, radius)}`;
}

/** Radial meter like the reference design: the fill carries the status, the track is a lighter step. */
export function Gauge({ percent, value, unit, label, status, caption, size = 'lg' }: Props) {
  const gradient = useId();
  const fill = percent === null ? 0 : Math.min(Math.max(percent, 0), 100);
  const radius = size === 'lg' ? 82 : 78;
  const path = arcPath(radius);
  const empty = value === '—';
  const spoken = empty ? `${label}: sin datos` : `${label}: ${value}${unit ? ` ${unit}` : ''}${caption ? `, ${caption}` : ''}`;

  return (
    <figure className={`gauge gauge--${size} gauge--${status}`} role="img" aria-label={spoken}>
      <svg viewBox="0 0 200 172" className="gauge__arc" aria-hidden="true">
        <defs>
          <linearGradient id={gradient} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" className="gauge__stop-start" />
            <stop offset="1" className="gauge__stop-end" />
          </linearGradient>
        </defs>
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
          <Icon name={STATUS_ICON[status]} size={14} /> {caption}
        </figcaption>
      )}
    </figure>
  );
}
