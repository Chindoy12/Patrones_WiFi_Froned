import { Icon, type IconName } from './Icon';

/** One number with its label (and optional unit) inside a dashboard card. */
export function Tile({ icon, label, value, unit, note }:
                     { icon: IconName; label: string; value: string; unit?: string; note?: string }) {
  return (
    <div className="tile">
      <span className="tile__label"><Icon name={icon} size={15} /> {label}</span>
      <strong className="tile__value">{value}{unit && value !== '—' && <small>{unit}</small>}</strong>
      {note && <span className="tile__note">{note}</span>}
    </div>
  );
}
