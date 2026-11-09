import {
  bytesOrUnknown, captureStatusLabel, captureStatusTone, droppedText, formatCount, isCaptureActive, percent, share,
  timeline,
} from '../capture';
import { FindingList } from '../components/FindingList';
import { Icon } from '../components/Icon';
import type { CaptureDetail } from '../types';

export function CaptureResult({ detail }: { detail: CaptureDetail }) {
  const c = detail.capture;
  if (c.status !== 'COMPLETED') {
    return (
      <p className={`notice${c.status === 'FAILED' ? ' notice--error' : ''}`} role="status">
        <span className={`badge badge--${captureStatusTone[c.status]}`}>{captureStatusLabel[c.status]}</span>{' '}
        {c.failureMessage ?? (isCaptureActive(c)
          ? 'Los resultados aparecen aquí cuando el sensor entregue la captura.' : 'Esta captura no tiene resultados.')}
      </p>
    );
  }
  const t = detail.totals;
  const seconds = timeline(detail);
  const peak = Math.max(1, ...seconds.map((s) => s.packets));
  return (
    <div className="capture-result">
      <p className="muted small capture-result__scope"><Icon name="shield" size={14} /> {detail.scope}</p>
      <p>
        <strong>{c.purpose}</strong>
        <span className="muted"> · {c.captureToolLabel}{c.interfaceName && ` (${c.interfaceName})`}
          {c.durationMs !== null && ` · ${(c.durationMs / 1000).toFixed(1)} s`} · {c.stopMessage}</span>
      </p>
      <dl className="capture-result__totals">
        <div><dt>Paquetes</dt><dd>{formatCount(t.packets)}</dd></div>
        <div><dt>Bytes</dt><dd>{bytesOrUnknown(t.bytes)}</dd></div>
        <div><dt>Entrada / salida</dt><dd>{bytesOrUnknown(t.inboundBytes)} / {bytesOrUnknown(t.outboundBytes)}</dd></div>
        <div><dt>Difusión</dt><dd>{formatCount(t.broadcast)} <small>({share(t.broadcast, t.packets)})</small></dd></div>
        <div><dt>Multidifusión</dt><dd>{formatCount(t.multicast)}</dd></div>
        <div><dt>Equipos locales / remotos</dt><dd>{formatCount(t.localHosts)} / {formatCount(t.remoteHosts)}</dd></div>
        <div><dt>Ilegibles</dt><dd>{formatCount(t.malformed)}</dd></div>
      </dl>
      <p className="muted small">{droppedText(detail)}</p>

      <div className="grid-2">
        <div>
          <h3>Protocolos</h3>
          <ul className="capture-result__bars" aria-label="Paquetes por protocolo">
            {detail.protocols.map((p) => (
              <li key={p.protocol}>
                <span>{p.protocol}</span>
                <span className="capture-result__bar"><i style={{ width: `${Math.max(1, percent(p.packets, t.packets))}%` }} /></span>
                <span className="num">{share(p.packets, t.packets)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Servicios más usados</h3>
          {detail.ports.length === 0 ? <p className="muted">Sin servicios identificables.</p> : (
            <table className="table" aria-label="Servicios más usados">
              <thead><tr><th>Servicio</th><th>Paquetes</th><th>Bytes</th></tr></thead>
              <tbody>
                {detail.ports.map((p) => (
                  <tr key={`${p.transport}${p.port}`}>
                    <td>{p.service ?? `${p.transport} ${p.port}`}<span className="table__sub">{p.transport} {p.port}</span></td>
                    <td className="num">{formatCount(p.packets)}</td>
                    <td className="num">{bytesOrUnknown(p.bytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {seconds.length > 0 && (
        <>
          <h3>Paquetes por segundo</h3>
          <div className="capture-result__timeline" role="img"
               aria-label={`Paquetes por segundo durante ${seconds.length} segundos; el máximo fue ${peak}`}>
            {seconds.map((s) => (
              <i key={s.second} style={{ height: `${Math.max(2, (100 * s.packets) / peak)}%` }}
                 title={`Segundo ${s.second}: ${s.packets} paquetes`} />
            ))}
          </div>
        </>
      )}

      <p className="muted small">
        {c.analyzedWith === 'AI' ? 'Analizada por la IA de WiFiSense.'
          : 'Analizada con las reglas del backend: la IA no estaba disponible.'}
      </p>
      <FindingList kind="facts" findings={detail.observed} empty="Nada que destacar en lo medido." />
      <FindingList kind="inferences" findings={detail.inferred} empty="No hay nada que explicar." />
    </div>
  );
}
