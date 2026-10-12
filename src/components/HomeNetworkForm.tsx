import { useState, type FormEvent } from 'react';
import { ApiError } from '../services/apiClient';
import type { HomeNetwork, HomeNetworkInput } from '../types';

interface Props {
  initial?: HomeNetwork;
  onSave: (input: HomeNetworkInput) => Promise<unknown>;
  onCancel: () => void;
}

const NAME_MAX = 40;
const PROVIDER_MAX = 60;

/** Create or edit one of the user's networks; the backend validates again and answers in Spanish. */
export function HomeNetworkForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [provider, setProvider] = useState(initial?.provider ?? '');
  const [speed, setSpeed] = useState(initial?.contractedMbps?.toString() ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      await onSave({ name: name.trim(), provider: provider.trim() || undefined, contractedMbps: speed ? Number(speed) : undefined });
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      else setMessage(e instanceof ApiError ? e.message : 'No se pudo guardar la red.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="eu-form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="network-name">Nombre de la red</label>
        <input id="network-name" value={name} maxLength={NAME_MAX} placeholder="Casa, Oficina…" required
               onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))} />
        {errors.name && <small className="field__error">{errors.name}</small>}
      </div>
      <div className="field">
        <label htmlFor="network-provider">Proveedor <span className="muted">(opcional)</span></label>
        <input id="network-provider" value={provider} maxLength={PROVIDER_MAX} placeholder="Claro, Movistar, ETB…"
               onChange={(e) => setProvider(e.target.value.slice(0, PROVIDER_MAX))} />
        {errors.provider && <small className="field__error">{errors.provider}</small>}
      </div>
      <div className="field">
        <label htmlFor="network-speed">Velocidad contratada en Mbps <span className="muted">(opcional)</span></label>
        <input id="network-speed" type="number" inputMode="numeric" min={1} max={10000} value={speed}
               onChange={(e) => setSpeed(e.target.value.replace(/\D/g, '').slice(0, 5))} />
        {errors.contractedMbps && <small className="field__error">{errors.contractedMbps}</small>}
      </div>
      {message && <p className="notice notice--error" role="alert">{message}</p>}
      <div className="eu-form__actions">
        <button className="button" disabled={busy || name.trim().length < 2}>{busy ? 'Guardando…' : 'Guardar'}</button>
        <button type="button" className="button button--quiet" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
