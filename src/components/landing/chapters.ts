import { SHAPE, type Shape } from './stageProgress';

/**
 * The welcome tells the story of the network in short chapters, one screen each, and each chapter has its own shape
 * in the scene (Avance 31): the Wi-Fi symbol, the devices that come and go, the points scattered when nobody sees what
 * happens, the router of the agent, the brain of the AI, the shield of the security and the notices, and the planet
 * where everything is connected. Everything it says is what the project really does.
 */
export interface Chapter {
  label: string;
  title: string;
  text: string;
  shape: Shape;
}

/**
 * How long each chapter stays before the next one (Avance 30: 6 seconds, the story felt long at 10). Hovering the
 * words pauses it, for whoever wants to read slowly.
 */
export const CHAPTER_MS = 6_000;

export const CHAPTERS: Chapter[] = [
  {
    label: 'Monitoreo de redes Wi-Fi',
    title: 'Tu Wi-Fi, a la vista.',
    text: 'Mide tu conexión, mira qué equipos están conectados y entérate cuando algo no va bien.',
    shape: SHAPE.wifi,
  },
  {
    label: 'Hoy',
    title: 'Tu red es invisible.',
    text: 'Celulares, computadores y televisores entran y salen de tu Wi-Fi todo el día.',
    shape: SHAPE.devices,
  },
  {
    label: 'Sin que lo veas',
    title: 'Todo pasa en silencio.',
    text: 'Un equipo que no reconoces, una señal que se cae, un canal lleno de redes vecinas.',
    shape: SHAPE.scatter,
  },
  {
    label: 'El agente',
    title: 'Un agente que cuida tu red.',
    text: 'Desde tu computador revisa cada minuto la señal, la latencia y los equipos conectados.',
    shape: SHAPE.router,
  },
  {
    label: 'La inteligencia artificial',
    title: 'Aprende lo normal en tu red.',
    text: 'Un modelo Isolation Forest detecta cuando algo se sale de lo normal.',
    shape: SHAPE.brain,
  },
  {
    label: 'Seguridad y avisos',
    title: 'Te avisa a tiempo.',
    text: 'Revisa la seguridad de tu router y te avisa de equipos nuevos, en la página o por correo.',
    shape: SHAPE.shield,
  },
  {
    label: 'Todo se conecta',
    title: 'Tu red, en un solo lugar.',
    text: 'Tu conexión en vivo, tus equipos, la seguridad y los avisos, en pantallas claras.',
    shape: SHAPE.planet,
  },
];

/** The chapter after `index`; after the last one the story starts again. */
export function nextChapter(index: number): number {
  return (index + 1) % CHAPTERS.length;
}

/** The chapter before `index`; before the first one comes the last. */
export function previousChapter(index: number): number {
  return (index - 1 + CHAPTERS.length) % CHAPTERS.length;
}

// Who already saw the welcome goes straight to the login next time (kept only in this browser).
const SEEN_KEY = 'wifisense.welcome.v1';

export function welcomeSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === 'seen';
  } catch {
    return false;  // private mode or blocked storage: show the welcome
  }
}

export function rememberWelcome() {
  try {
    localStorage.setItem(SEEN_KEY, 'seen');
  } catch {
    // not remembered: the welcome shows again next time, nothing else changes
  }
}
