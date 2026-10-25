import { Icon, type IconName } from './Icon';

export interface StripItem {
  icon: IconName;
  label: string;
  /** Text of the state; the node repeats it in color, never instead of it. */
  detail: string;
  state: 'ok' | 'warn' | 'down' | 'off';
}

/**
 * Bottom row of the dashboards with the state of each piece behind them, drawn as a route: a line through every
 * service with a circular node for each one.
 */
export function StatusStrip({ items, label }: { items: StripItem[]; label: string }) {
  return (
    <ul className="strip" aria-label={label}>
      {items.map((item) => (
        <li key={item.label} className={`strip__item strip__item--${item.state}`}>
          <i className="strip__node" aria-hidden="true" />
          <Icon name={item.icon} size={18} />
          <span className="strip__text">
            <span className="strip__label">{item.label}</span>
            <span className="strip__detail">{item.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
