/**
 * Which shapes the scene has, in which order they follow each other and where on the screen each one goes. Plain
 * functions so they can be tested without a browser.
 *
 * Avance 31: one shape for each message of the welcome, seven in all. Behind the login they keep following each other
 * in the same order, forever.
 */

export const SHAPE = { wifi: 0, devices: 1, scatter: 2, router: 3, brain: 4, shield: 5, planet: 6 } as const;
export type Shape = (typeof SHAPE)[keyof typeof SHAPE];
export const SHAPE_COUNT = 7;

/** The order in which the shapes follow each other behind the login. */
export const LOOP: Shape[] = [SHAPE.wifi, SHAPE.devices, SHAPE.scatter, SHAPE.router, SHAPE.brain, SHAPE.shield,
  SHAPE.planet];

/** The shape after `shape` in the loop; after the planet comes the Wi-Fi symbol again. */
export function nextShape(shape: Shape): Shape {
  return LOOP[(LOOP.indexOf(shape) + 1) % LOOP.length];
}

/** Where each shape sits (x, y in world units at the center of the scene) and how big it is. */
export interface Placement { x: number; y: number; scale: number }
export interface StageLayout { places: Placement[]; alpha: number }

const FOV = (38 * Math.PI) / 180;
export const CAMERA_Z = 7;
/** Half the visible height at z = 0. */
export const HALF_HEIGHT = Math.tan(FOV / 2) * CAMERA_Z;
export const FIELD_OF_VIEW = FOV;

/** How big each shape is drawn next to the others (its own size in world units differs). */
const SIZE: Record<Shape, number> = {
  [SHAPE.wifi]: 1, [SHAPE.devices]: 0.88, [SHAPE.scatter]: 1, [SHAPE.router]: 0.88, [SHAPE.brain]: 1.05,
  [SHAPE.shield]: 1, [SHAPE.planet]: 0.8,
};

/**
 * On a wide screen the words and the login go on the left and every shape on the right (the scattered points fill the
 * whole screen). On a phone the words take the whole width, so every shape stays centered, smaller and fainter behind
 * them. Indexed by Shape.
 */
export function stageLayout(width: number, height: number): StageLayout {
  const aspect = width / Math.max(1, height);
  const halfWidth = HALF_HEIGHT * aspect;
  const places: Placement[] = [];
  if (width < 760 || aspect < 1.05) {
    const scale = Math.min(0.72, (halfWidth * 0.95) / 2.4);
    for (let shape = 0; shape < SHAPE_COUNT; shape += 1) {
      places.push(shape === SHAPE.scatter ? { x: 0, y: 0, scale: 1 }
        : { x: 0, y: shape === SHAPE.wifi ? 0.9 : 0.55, scale: scale * SIZE[shape as Shape] });
    }
    return { places, alpha: 0.38 };
  }
  const side = Math.min(halfWidth * 0.48, 3.3);
  const scale = Math.min(1, (halfWidth - side) / 2.5 + 0.15);
  for (let shape = 0; shape < SHAPE_COUNT; shape += 1) {
    places.push(shape === SHAPE.scatter ? { x: 0, y: 0, scale: 1 }
      : { x: shape === SHAPE.planet ? side * 0.94 : side, y: shape === SHAPE.wifi ? 0.1 : 0, scale: scale * SIZE[shape as Shape] });
  }
  return { places, alpha: 1 };
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
