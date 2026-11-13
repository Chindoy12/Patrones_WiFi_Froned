import type { AgentDevice } from '../types';
import { deviceIcon } from './DeviceRow';
import type { IconName } from './Icon';

/**
 * The five places a device can live in (Avance 27). The category follows the icon the page already shows for each
 * device (what the agent deduced, else a guess from its name or maker), so a device never shows one icon and lives
 * in another category. The router has no category of its own: it is one device, so it goes with the rest.
 */
export type DeviceCategory = 'computadores' | 'celulares' | 'entretenimiento' | 'hogar' | 'otros';

export interface CategoryInfo {
  id: DeviceCategory;
  label: string;
  icon: IconName;
  help: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'computadores', label: 'Computadores', icon: 'laptop',
    help: 'Portátiles y computadores de escritorio, incluido el que tiene el agente.' },
  { id: 'celulares', label: 'Celulares y tabletas', icon: 'phone',
    help: 'Los celulares con dirección privada cambian de dirección de vez en cuando: el mismo celular puede aparecer '
      + 'más de una vez. Por eso los que no se ven hace más de una semana quedan aparte.' },
  { id: 'entretenimiento', label: 'TV y entretenimiento', icon: 'tv',
    help: 'Televisores, Chromecast, consolas de juegos y parlantes.' },
  { id: 'hogar', label: 'Casa inteligente e impresoras', icon: 'plug',
    help: 'Impresoras, cámaras y dispositivos inteligentes (bombillos, enchufes, asistentes).' },
  { id: 'otros', label: 'Router y otros equipos', icon: 'router',
    help: 'El router y los equipos que no dicen qué son ni quién los fabricó.' },
];

const BY_ICON: Partial<Record<IconName, DeviceCategory>> = {
  laptop: 'computadores', phone: 'celulares', tv: 'entretenimiento', console: 'entretenimiento',
  speaker: 'entretenimiento', printer: 'hogar', camera: 'hogar', plug: 'hogar',
};

export function deviceCategory(device: AgentDevice): DeviceCategory {
  if (device.role === 'ROUTER') return 'otros';
  return BY_ICON[deviceIcon(device)] ?? 'otros';
}

export function isCategory(value: string | null | undefined): value is DeviceCategory {
  return CATEGORIES.some((c) => c.id === value);
}

export function categoryInfo(id: DeviceCategory): CategoryInfo {
  return CATEGORIES.find((c) => c.id === id)!;
}

/** A device seen in the last week counts as recent; older ones are kept apart so they do not crowd the list. */
export const RECENT_DAYS = 7;

export type Recency = 'online' | 'week' | 'older';

export function recency(device: AgentDevice, now: Date): Recency {
  if (device.online) return 'online';
  const since = now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000;
  return new Date(device.lastSeenAt).getTime() >= since ? 'week' : 'older';
}
