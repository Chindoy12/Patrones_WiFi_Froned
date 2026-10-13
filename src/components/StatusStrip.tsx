import { Icon, type IconName } from './Icon';

export interface StripItem {
  icon: IconName;
  label: string;
  /** Text of the state; the dot repeats it in color, never instead of it. */
  detail: string;
  state: 'ok' | 'warn' | 'down' | 'off';
}

/** Bottom row of the dashboards with the state of each piece behind them. */
export function StatusStrip({ items, label }: { items: StripItem[]; label: string }) {
  return (
    <ul className="strip" aria-label={label}>
      {items.map((item) => (
        <li key={item.label} className={`strip__item strip__item--${item.state}`}>
          <Icon name={item.icon} size={20} />
          <span className="strip__text">
            <span className="strip__label">{item.label}</span>
            <span className="strip__detail"><i className="strip__dot" aria-hidden="true" />{item.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
