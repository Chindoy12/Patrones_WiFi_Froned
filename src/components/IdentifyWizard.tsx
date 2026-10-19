import { useEffect, useRef, useState } from 'react';
import { formatTime } from '../format';
import { errorMessage } from '../hooks/useApi';
import { useNow } from '../hooks/useNow';
import type { AgentDevice, IdentifyMode } from '../types';
import { Icon } from './Icon';

/** How long the backend keeps the agent reporting every minute (IdentifyMode.LENGTH). */
const MODE_MS = 10 * 60_000;
const POLL_MS = 15_000;
/** Reports to wait after the user turns the Wi-Fi off before saying nothing disappeared. */
const REPORTS_TO_WAIT = 3;

type Phase = 'starting' | 'fast' | 'ready' | 'off' | 'found' | 'notFound' | 'expired' | 'error';

/** Devices that can be identified this way: everything but the agent's own computer and the router. */
export function onlineIds(devices: AgentDevice[]): string[] {
  return devices.filter((d) => d.online && !d.role).map((d) => d.id);
}

/** Devices that were connected before the user turned the Wi-Fi off and are not in the latest report. */
export function goneDevices(before: string[], devices: AgentDevice[]): string[] {
  const now = new Set(onlineIds(devices));
  return before.filter((id) => !now.has(id));
}

const after = (a: string | null, b: string | null) => a !== null && b !== null && new Date(a) > new Date(b);

/**
 * "Which device is this?": the agent reports every minute for ten minutes; the user turns off the Wi-Fi of the
 * device, the wizard sees which one disappeared from the reports, the user turns it on again, and names it.
 */
export function IdentifyWizard({ devices, names, latestAt, start, reload, rename, team, onClose }: {
  devices: AgentDevice[]; names: string[]; latestAt: string | null; start: () => Promise<IdentifyMode>;
  reload: () => void; rename: (fingerprint: string, label: string) => Promise<unknown>; team: boolean;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('starting');
  const [mode, setMode] = useState<IdentifyMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<string[]>([]);
  const [offAfter, setOffAfter] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [saved, setSaved] = useState(false);
  const reportsSinceOff = useRef(new Set<string>());
  const now = useNow(5_000);
  const who = team ? 'el sensor' : 'el agente';
  const toWho = team ? 'al sensor' : 'al agente';

  async function begin() {
    setPhase('starting');
    setError(null);
    try {
      setMode(await start());
      setPhase('fast');
      reload();
    } catch (e) {
      setError(errorMessage(e));
      setPhase('error');
    }
  }

  useEffect(() => { void begin(); }, []);  // once, when the wizard opens

  // While waiting for reports, ask for the overview more often than the page does.
  const waiting = phase === 'fast' || phase === 'off' || (phase === 'found' && !saved);
  useEffect(() => {
    if (!waiting) return undefined;
    const timer = window.setInterval(reload, POLL_MS);
    return () => window.clearInterval(timer);
  }, [waiting, reload]);

  // Each new report moves the wizard forward.
  useEffect(() => {
    if (!mode) return;
    const startedAt = new Date(new Date(mode.identifyUntil).getTime() - MODE_MS).toISOString();
    if (phase === 'fast' && after(latestAt, startedAt)) {
      setBaseline(onlineIds(devices));
      setPhase('ready');
    } else if (phase === 'off' && after(latestAt, offAfter) && latestAt) {
      reportsSinceOff.current.add(latestAt);
      const gone = goneDevices(baseline, devices);
      if (gone.length > 0) {
        setCandidates(gone);
        setChosen(gone.length === 1 ? gone[0] : null);
        setPhase('found');
      } else if (reportsSinceOff.current.size >= REPORTS_TO_WAIT) {
        setPhase('notFound');
      }
    } else if (phase === 'found' && !chosen) {
      // several disappeared at once: the one that comes back first is the user's
      const back = candidates.find((id) => devices.find((d) => d.id === id)?.online);
      if (back) setChosen(back);
    }
  }, [mode, phase, latestAt, devices, offAfter, baseline, candidates, chosen]);

  useEffect(() => {
    if (chosen) {
      const device = devices.find((d) => d.id === chosen);
      setLabel(device?.label ?? '');
    }
  }, [chosen]);  // only when another device is chosen

  const expired = mode !== null && now > new Date(mode.identifyUntil) && phase !== 'found' && phase !== 'error';
  const nameOf = (id: string) => names[devices.findIndex((d) => d.id === id)] ?? 'Equipo';

  function turnedOff() {
    reportsSinceOff.current = new Set();
    setOffAfter(latestAt);
    setPhase('off');
  }

  function again() {
    setBaseline(onlineIds(devices));
    setCandidates([]);
    setChosen(null);
    setPhase('ready');
  }

  async function save() {
    if (!chosen || !label.trim()) return;
    setError(null);
    try {
      await rename(chosen, label.trim());
      setSaved(true);
      reload();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const device = chosen ? devices.find((d) => d.id === chosen) : undefined;
  return (
    <div className="identify" role="region" aria-label="¿Cuál es este equipo?">
      <div className="identify__head">
        <strong><Icon name="search" size={16} /> ¿Cuál es este equipo?</strong>
        <button className="link-button" onClick={onClose}>{saved ? 'Listo' : 'Cerrar'}</button>
      </div>
      {error && <p className="notice notice--error" role="alert">{error}</p>}

      {phase === 'starting' && <p className="muted" role="status">Preparando…</p>}

      {phase === 'error' && <button className="button button--quiet" onClick={begin}>Intentar de nuevo</button>}

      {expired ? (
        <>
          <p role="status">Pasaron los 10 minutos en que {who} reporta cada minuto.</p>
          <button className="button button--quiet" onClick={begin}>Empezar de nuevo</button>
        </>
      ) : (
        <>
          {phase === 'fast' && (
            <p role="status" className="identify__wait">
              <span className="spinner" aria-hidden="true" /> Pidiendo {toWho} que reporte cada minuto. Empieza con su
              próximo reporte normal: puede tardar hasta 5 minutos. Deja esta página abierta.
            </p>
          )}

          {phase === 'ready' && (
            <>
              <p role="status">
                <Icon name="check" size={16} /> Listo: {who} reporta cada minuto hasta las {formatTime(mode!.identifyUntil)}.
                Ahora hay {baseline.length} {baseline.length === 1 ? 'equipo conectado' : 'equipos conectados'}.
              </p>
              <ol className="agent__steps">
                <li>Toma el equipo que quieres reconocer (por ejemplo tu celular) y <strong>apaga su Wi-Fi</strong> o
                  activa el modo avión.</li>
                <li>Pulsa el botón y espera: en 1 a 3 minutos te decimos cuál desapareció.</li>
              </ol>
              <button className="button" onClick={turnedOff} disabled={baseline.length === 0}>Ya lo apagué</button>
            </>
          )}

          {phase === 'off' && (
            <p role="status" className="identify__wait">
              <span className="spinner" aria-hidden="true" /> Esperando el siguiente reporte para ver qué equipo
              desapareció ({reportsSinceOff.current.size} de {REPORTS_TO_WAIT} reportes)…
            </p>
          )}

          {phase === 'notFound' && (
            <>
              <p role="status">
                No vimos desaparecer ningún equipo. ¿Estaba conectado a esta red? Algunos equipos tardan en soltar la
                conexión: deja el Wi-Fi apagado e inténtalo otra vez.
              </p>
              <button className="button button--quiet" onClick={again}>Intentar de nuevo</button>
            </>
          )}
        </>
      )}

      {phase === 'found' && (
        <>
          {candidates.length > 1 && !chosen && (
            <p role="status">
              Desaparecieron {candidates.length} equipos a la vez ({candidates.map(nameOf).join(', ')}): algunos
              celulares se desconectan solos al dormir. <strong>Enciende el Wi-Fi del tuyo</strong>: el primero que
              vuelva es el tuyo.
            </p>
          )}
          {device && (
            <>
              <p role="status" className="identify__found">
                <Icon name="check" size={16} /> Es <strong>«{nameOf(device.id)}»</strong>.{' '}
                {device.online ? 'Volvió a conectarse: confirmado.' : 'Vuelve a encender su Wi-Fi para confirmarlo.'}
              </p>
              {saved ? (
                <p className="notice" role="status">Guardado: ahora se llama «{label.trim()}».</p>
              ) : (
                <form className="identify__name" onSubmit={(e) => { e.preventDefault(); void save(); }}>
                  <label className="field">
                    <span>Ponle un nombre</span>
                    <input value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)}
                           placeholder={team ? 'Por ejemplo: Portátil del laboratorio' : 'Por ejemplo: Celular de Ana'} />
                  </label>
                  <button className="button" type="submit" disabled={!label.trim()}>Guardar nombre</button>
                </form>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
