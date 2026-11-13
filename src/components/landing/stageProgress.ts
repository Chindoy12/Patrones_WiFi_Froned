/**
 * Which shape the start page shows for a scroll position, and where on the screen it goes. Plain functions so they can
 * be tested without a browser.
 *
 * The stage is a number: 0 is the Wi-Fi symbol, 1 the points scattered, 2 the router and 3 the planet; 0.5 is halfway
 * between the Wi-Fi symbol and the scattered points. Each section of the page says which stage it shows; between two
 * sections the stage moves in proportion to the scroll, so the shape follows the reader's finger.
 */

export const STAGE = { wifi: 0, scatter: 1, router: 2, planet: 3 } as const;
export const LAST_STAGE = STAGE.planet;

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
 * On a wide screen the shape goes beside the text: the Wi-Fi symbol and the planet on the right, the router on the
 * left. On a phone the text takes the whole width, so every shape stays centered, smaller and fainter behind it.
 */
export function stageLayout(width: number, height: number): StageLayout {
  const aspect = width / Math.max(1, height);
  const halfWidth = HALF_HEIGHT * aspect;
  if (width < 760 || aspect < 1.05) {
    const scale = Math.min(0.72, (halfWidth * 0.95) / 2.4);
    const place = { x: 0, y: 0.35, scale };
    return { places: [{ ...place, y: 0.9 }, { x: 0, y: 0, scale: 1 }, place, place], alpha: 0.38 };
  }
  const side = Math.min(halfWidth * 0.48, 3.3);
  const scale = Math.min(1, (halfWidth - side) / 2.5 + 0.15);
  return {
    places: [
      { x: side, y: 0.1, scale },
      { x: 0, y: 0, scale: 1 },
      { x: -side, y: 0, scale: scale * 0.95 },
      { x: side * 0.92, y: 0, scale: scale * 0.95 },
    ],
    alpha: 1,
  };
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
