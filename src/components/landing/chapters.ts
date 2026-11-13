import { SHAPE, type Shape } from './stageProgress';

/**
 * The welcome (Avance 29) tells the story of the network in five short chapters, one screen each, while the scene
 * changes shape: today the network is invisible and scattered, WiFiSense puts it in order with the agent and the AI,
 * and in the end everything is connected. Everything it says is what the project really does.
 */
export interface Chapter {
  label: string;
  title: string;
  text: string;
  shape: Shape;
}

/** How long each chapter stays before the next one: enough to read two lines calmly. */
export const CHAPTER_MS = 10_000;

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
    text: 'Celulares, computadores, televisores y parlantes entran y salen de tu Wi-Fi todo el día, y las redes de los '
      + 'vecinos comparten el mismo aire.',
    shape: SHAPE.scatter,
  },
  {
    label: 'Sin que lo veas',
    title: 'Todo pasa en silencio.',
    text: 'Un equipo que no reconoces, una señal que se cae en la tarde, un canal lleno de redes vecinas: nadie te dice '
      + 'por qué.',
    shape: SHAPE.scatter,
  },
  {
    label: 'Cómo lo ordena WiFiSense',
    title: 'Un agente que cuida tu red.',
    text: 'Cada minuto envía la señal, la latencia, los equipos y la seguridad del router. Una IA (Isolation Forest) '
      + 'aprende lo normal en tu red y te avisa cuando algo se sale de lo normal.',
    shape: SHAPE.router,
  },
  {
    label: 'Todo se conecta',
    title: 'Tus equipos, tu router e Internet, en un solo lugar.',
    text: 'Tu conexión en vivo, tus equipos por tipo, la seguridad, los avisos y las redes cercanas, en pantallas '
      + 'claras.',
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
