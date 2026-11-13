import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { AgentDevice, IdentifyMode } from '../types';
import {
  CATEGORIES, categoryInfo, type DeviceCategory, deviceCategory, isCategory, recency, type Recency, summarize,
} from './deviceCategories';
import { hasOwnName, visibleDevices } from './DeviceFilters';
import { type DeviceChange, DeviceRow, deviceName, deviceNames, type HistoryLoader, RouterGuide } from './DeviceRow';
import { Icon } from './Icon';
import { IdentifyWizard } from './IdentifyWizard';

/** Rows shown at a time in each group; «Mostrar más» adds as many again. */
export const PAGE_SIZE = 30;

const GROUPS: { id: Recency; title: string }[] = [
  { id: 'online', title: 'Conectados ahora' },
  { id: 'week', title: 'Vistos en los últimos 7 días' },
  { id: 'older', title: 'Vistos antes' },
];

/** The current URL with another category (or none): «?tipo=celulares». Other parameters are kept. */
function withCategory(params: URLSearchParams, category: DeviceCategory | null): string {
  const next = new URLSearchParams(params);
  if (category) next.set('tipo', category);
  else next.delete('tipo');
  const text = next.toString();
  return text ? `?${text}` : '?';
}

/**
 * The devices of a network, organized (Avance 27). First a card for each category (computers, phones, TV and
 * entertainment, smart home and printers, router and others) with how many there are and how many are connected;
 * pressing a card opens that category on its own screen («?tipo=…» in the address, so the browser's back button
 * returns to the cards). Inside a category the devices are split into connected now, seen in the last 7 days and
 * seen before; the old ones start folded and appear 30 at a time, so a list of 700 devices is never shown at once.
 */
export function DeviceCatalog({ devices, onChange, updateDevice, loadHistory, team = false, canManage = true,
  identify, latestAt = null }: {
  devices: AgentDevice[]; onChange: () => void;
  updateDevice: (fingerprint: string, change: DeviceChange) => Promise<unknown>;
  loadHistory?: HistoryLoader; team?: boolean; canManage?: boolean;
  /** Starts «¿Cuál es este equipo?» (the agent reports every minute); without it the button is not shown. */
  identify?: () => Promise<IdentifyMode>;
  /** When the latest report arrived: the wizard compares the reports that come after it. */
  latestAt?: string | null;
}) {
  const [params] = useSearchParams();
  const asked = params.get('tipo');
  const category = isCategory(asked) ? asked : null;
  const [wizard, setWizard] = useState(false);
  const [guide, setGuide] = useState<AgentDevice | null>(null);
  const top = useRef<HTMLDivElement>(null);
  // Names are numbered on the whole list, so «Celular o tableta 3» keeps its number in its category and in search.
  const names = useMemo(() => deviceNames(devices), [devices]);

  useEffect(() => {
    if (category) top.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }, [category]);

  if (devices.length === 0) {
    return <p className="muted">Aún no hay equipos. Aparecen con el primer reporte del {team ? 'sensor' : 'agente'}.</p>;
  }

  const identifyButton = identify && canManage && !wizard && (
    <button className="button button--quiet devlist__identify" onClick={() => setWizard(true)}>
      <Icon name="search" size={16} /> ¿Cuál es este equipo?
    </button>
  );

  return (
    <div className="catalog" ref={top}>
      {identify && wizard && (
        <IdentifyWizard devices={devices} names={names} latestAt={latestAt} start={identify} reload={onChange}
                        rename={(id, label) => updateDevice(id, { label, authorized: true })} team={team}
                        onClose={() => { setWizard(false); onChange(); }} />
      )}
      {category ? (
        <CategoryScreen key={category} category={category} devices={devices} names={names} params={params}
                        actions={identifyButton} onChange={onChange} updateDevice={updateDevice}
                        loadHistory={loadHistory} team={team} canManage={canManage} onBlocked={setGuide} />
      ) : (
        <CategoryCards devices={devices} params={params} actions={identifyButton} team={team} />
      )}
      {asked && !category && <p className="notice" role="status">Esa categoría no existe: elige una de las de arriba.</p>}
      {guide && <RouterGuide name={names[devices.indexOf(guide)] ?? deviceName(guide, 0)} onClose={() => setGuide(null)} />}
    </div>
  );
}

function CategoryCards({ devices, params, actions, team }: {
  devices: AgentDevice[]; params: URLSearchParams; actions: ReactNode; team: boolean;
}) {
  const summary = summarize(devices);
  const online = devices.filter((d) => d.online).length;
  const unnamed = devices.filter((d) => !hasOwnName(d)).length;
  return (
    <>
      <div className="catalog__head">
        <p className="catalog__totals">
          <strong className="num">{devices.length}</strong> {devices.length === 1 ? 'equipo visto' : 'equipos vistos'}
          {' · '}<strong className="num">{online}</strong> {online === 1 ? 'conectado ahora' : 'conectados ahora'}
        </p>
        {actions}
      </div>
      <ul className="catalog__grid" aria-label="Categorías de equipos">
        {CATEGORIES.map((c) => {
          const s = summary[c.id];
          const body = (
            <>
              <span className="catcard__top">
                <span className="catcard__icon"><Icon name={c.icon} size={22} /></span>
                <span className="catcard__label">{c.label}</span>
              </span>
              <strong className="catcard__count num">{s.total}</strong>
              <span className="catcard__meta">
                {s.total === 0 ? 'Ninguno por ahora'
                  : `${s.online} ${s.online === 1 ? 'conectado' : 'conectados'}${s.unnamed ? ` · ${s.unnamed} sin nombre` : ''}`}
              </span>
              {(s.fresh > 0 || s.blocked > 0) && (
                <span className="catcard__tags">
                  {s.fresh > 0 && <span className="tag tag--accent">{s.fresh === 1 ? '1 nuevo' : `${s.fresh} nuevos`}</span>}
                  {s.blocked > 0 && <span className="tag tag--danger">{s.blocked} no autorizado{s.blocked === 1 ? '' : 's'}</span>}
                </span>
              )}
            </>
          );
          return (
            <li key={c.id}>
              {s.total === 0 ? <div className="catcard is-empty">{body}</div> : (
                <Link className="catcard" to={{ search: withCategory(params, c.id) }}
                      aria-label={`${c.label}: ${s.total}, ${s.online} ${s.online === 1 ? 'conectado' : 'conectados'}`}>
                  {body}
                  <span className="catcard__go" aria-hidden="true">Ver →</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {unnamed > 0 && (
        <p className="devfilters__why muted">
          {unnamed === 1 ? '1 equipo no dice su nombre' : `${unnamed} equipos no dicen su nombre`}: los celulares con
          dirección privada no lo anuncian y {team ? 'muchas redes de universidades' : 'algunos routers'} no dejan
          preguntarlo. Nómbralos con «¿Cuál es este equipo?» o con el lápiz; el nombre queda guardado.
        </p>
      )}
    </>
  );
}

function CategoryScreen({ category, devices, names, params, actions, onChange, updateDevice, loadHistory, team,
  canManage, onBlocked }: {
  category: DeviceCategory; devices: AgentDevice[]; names: string[]; params: URLSearchParams; actions: ReactNode;
  onChange: () => void; updateDevice: (fingerprint: string, change: DeviceChange) => Promise<unknown>;
  loadHistory?: HistoryLoader; team: boolean; canManage: boolean; onBlocked: (device: AgentDevice) => void;
}) {
  const info = categoryInfo(category);
  const [onlyUnnamed, setOnlyUnnamed] = useState(false);
  const [query, setQuery] = useState('');
  const [showOlder, setShowOlder] = useState(false);
  const [limits, setLimits] = useState<Record<Recency, number>>({ online: PAGE_SIZE, week: PAGE_SIZE, older: PAGE_SIZE });
  const now = useMemo(() => new Date(), []);

  const mine = devices.map((_, i) => i).filter((i) => deviceCategory(devices[i]) === category);
  const unnamedCount = mine.filter((i) => !hasOwnName(devices[i])).length;
  const shown = visibleDevices(devices, names, onlyUnnamed ? 'unnamed' : 'all', query)
    .filter((i) => deviceCategory(devices[i]) === category);
  const groups: Record<Recency, number[]> = { online: [], week: [], older: [] };
  for (const i of shown) groups[recency(devices[i], now)].push(i);
  const searching = query.trim() !== '';

  return (
    <section className="catscreen" aria-labelledby="catscreen-title">
      <Link className="link-button catscreen__back" to={{ search: withCategory(params, null) }}>
        ← Todas las categorías
      </Link>
      <h4 className="catscreen__title" id="catscreen-title">
        <Icon name={info.icon} size={22} /> {info.label} <span className="agent__countpill num">{mine.length}</span>
      </h4>
      <p className="muted small catscreen__help">{info.help}</p>

      <div className="devfilters__bar catscreen__tools">
        <div className="segmented" role="group" aria-label="Qué equipos mostrar">
          <button type="button" aria-pressed={!onlyUnnamed} onClick={() => setOnlyUnnamed(false)}>
            Todos <span className="devfilters__count">{mine.length}</span>
          </button>
          <button type="button" aria-pressed={onlyUnnamed} onClick={() => setOnlyUnnamed(true)}>
            Sin nombre <span className="devfilters__count">{unnamedCount}</span>
          </button>
        </div>
        {actions}
        {mine.length >= 8 && (
          <label className="devfilters__search">
            <Icon name="search" size={16} />
            <input type="search" placeholder="Buscar por nombre o marca" value={query} aria-label="Buscar equipo"
                   onChange={(e) => setQuery(e.target.value)} />
          </label>
        )}
      </div>

      {shown.length === 0 && <p className="muted devlist__none">Ningún equipo coincide con lo que buscas.</p>}
      {GROUPS.map((g) => {
        const items = groups[g.id];
        if (items.length === 0) return null;
        const folded = g.id === 'older' && !showOlder && !searching;
        const limit = limits[g.id];
        return (
          <div key={g.id} className={`catgroup catgroup--${g.id}`}>
            <h5 className="catgroup__title">{g.title} <span className="num muted">{items.length}</span></h5>
            {folded ? (
              <button className="button button--quiet catgroup__unfold" onClick={() => setShowOlder(true)}>
                Mostrar {items.length === 1 ? 'el equipo visto antes' : `los ${items.length} equipos vistos antes`}
              </button>
            ) : (
              <>
                <ul className="devlist">
                  {items.slice(0, limit).map((i) => (
                    <DeviceRow key={devices[i].id} device={devices[i]} shownName={names[i]} onChange={onChange}
                               updateDevice={updateDevice} loadHistory={loadHistory} team={team} canManage={canManage}
                               onBlocked={() => onBlocked(devices[i])} />
                  ))}
                </ul>
                {items.length > limit && (
                  <button className="button button--quiet catgroup__more"
                          onClick={() => setLimits((l) => ({ ...l, [g.id]: l[g.id] + PAGE_SIZE }))}>
                    Mostrar {Math.min(PAGE_SIZE, items.length - limit)} más
                    <span className="muted"> (quedan {items.length - limit})</span>
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}
