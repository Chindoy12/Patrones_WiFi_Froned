/**
 * Which shape the scene shows and where on the screen it goes. Plain functions so they can be tested without a
 * browser.
 *
 * The stage is a number on a loop of six steps: 0 is the Wi-Fi symbol, 1 the points scattered, 2 the router, 3 the
 * planet, 4 scattered again and 5 the Wi-Fi symbol again. 0.5 is halfway between the Wi-Fi symbol and the scattered
 * points. Because 5 and 0 are the same shape, the scene can keep forming and unforming forever: when it reaches 5 it
 * jumps to 0 and nobody sees the jump (Avance 29).
 */

export const SHAPE = { wifi: 0, scatter: 1, router: 2, planet: 3 } as const;
export type Shape = (typeof SHAPE)[keyof typeof SHAPE];

/** The shape of each step of the loop. */
export const LOOP: Shape[] = [SHAPE.wifi, SHAPE.scatter, SHAPE.router, SHAPE.planet, SHAPE.scatter, SHAPE.wifi];
export const LAST_STAGE = LOOP.length - 1;

/** The shape at a whole step of the loop. */
export function shapeAt(step: number): Shape {
  return LOOP[Math.min(Math.max(Math.round(step), 0), LAST_STAGE)];
}

/** The next step of the loop: after the last one it starts again on the same shape. */
export function nextStep(step: number): number {
  return step >= LAST_STAGE ? 1 : step + 1;
}

/**
 * The step the scene should travel to so that it shows `shape`, starting from `from`: forward along the loop when it
 * can (the Wi-Fi symbol after the planet goes through the scattered points, not back through the router), and
 * straight back when the shape is behind on the same lap.
 */
export function stepFor(shape: Shape, from: number): number {
  const at = Math.round(from);
  if (shapeAt(at) === shape) return at;
  for (let step = at + 1; step <= LAST_STAGE; step += 1) if (LOOP[step] === shape) return step;
  return LOOP.indexOf(shape);
}

/** Stages of the scrolling start page (Avance 28), until the welcome replaces it. */
export const STAGE = { wifi: 0, scatter: 1, router: 2, planet: 3 } as const;

export interface Anchor {
  /** Where the middle of the section is, in page pixels. */
  at: number;
  stage: number;
}

/** The stage when the middle of the screen is at `y` (page pixels), between the anchors of the sections. */
export function stageAt(y: number, anchors: Anchor[]): number {
  if (anchors.length === 0) return 0;
  const sorted = [...anchors].sort((a, b) => a.at - b.at);
  if (y <= sorted[0].at) return sorted[0].stage;
  for (let i = 1; i < sorted.length; i += 1) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (y <= b.at) {
      const t = (y - a.at) / Math.max(1, b.at - a.at);
      return a.stage + (b.stage - a.stage) * t;
    }
  }
  return sorted[sorted.length - 1].stage;
}

/** Where each shape sits (x, y in world units at the center of the scene) and how big it is. */
export interface Placement { x: number; y: number; scale: number }
export interface StageLayout { places: Placement[]; alpha: number }

const FOV = (38 * Math.PI) / 180;
export const CAMERA_Z = 7;
/** Half the visible height at z = 0. */
export const HALF_HEIGHT = Math.tan(FOV / 2) * CAMERA_Z;
export const FIELD_OF_VIEW = FOV;

/**
 * On a wide screen the words and the login go on the left and every shape on the right. On a phone the words take
 * the whole width, so every shape stays centered, smaller and fainter behind them. Indexed by Shape.
 */
export function stageLayout(width: number, height: number): StageLayout {
  const aspect = width / Math.max(1, height);
  const halfWidth = HALF_HEIGHT * aspect;
  if (width < 760 || aspect < 1.05) {
    const scale = Math.min(0.72, (halfWidth * 0.95) / 2.4);
    const place = { x: 0, y: 0.55, scale };
    return { places: [{ ...place, y: 0.9 }, { x: 0, y: 0, scale: 1 }, place, place], alpha: 0.38 };
  }
  const side = Math.min(halfWidth * 0.48, 3.3);
  const scale = Math.min(1, (halfWidth - side) / 2.5 + 0.15);
  return {
    places: [
      { x: side, y: 0.1, scale },
      { x: 0, y: 0, scale: 1 },
      { x: side, y: 0, scale: scale * 0.88 },
      { x: side * 0.94, y: 0, scale: scale * 0.8 },
    ],
    alpha: 1,
  };
}

/** A point of the screen (pixels) on the plane z = 0 of the scene, in world units. */
export function toWorld(x: number, y: number, width: number, height: number): [number, number] {
  const halfWidth = HALF_HEIGHT * (width / Math.max(1, height));
  return [(x / Math.max(1, width) * 2 - 1) * halfWidth, (1 - y / Math.max(1, height) * 2) * HALF_HEIGHT];
}

/** The camera's projection (perspective), as the 16 numbers WebGL expects (column by column). */
export function perspective(aspect: number, near = 0.1, far = 60): Float32Array {
  const f = 1 / Math.tan(FOV / 2);
  const range = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * range, -1,
    0, 0, near * far * range * 2, 0,
  ]);
}
