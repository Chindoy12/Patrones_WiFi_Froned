/**
 * The four shapes of the start page, as clouds of the same number of points so every point can travel from one shape
 * to the next: the Wi-Fi symbol, the same points scattered all over the space, a router with its antennas and a planet
 * with an orbit and arcs that join distant places ("todo se conecta").
 *
 * Plain math, no WebGL: the clouds are built once with a seeded random generator (the same seed always gives the same
 * cloud, which the tests rely on) and ParticleStage uploads them to the graphics card. Units are world units: the
 * camera of the stage looks at the origin from z = 7, so the visible height at z = 0 is about 4.8.
 */

export interface Clouds {
  count: number;
  /** The last `ambient` points never form a shape: they float around the scene in every stage, like dust in the air. */
  ambient: number;
  wifi: Float32Array;
  scatter: Float32Array;
  router: Float32Array;
  planet: Float32Array;
  /** Index of the palette color of each point (0 to PALETTE_SIZE - 1). */
  colors: Float32Array;
  /** 0 to 1, different for each point: when it leaves a shape, how it spins, how it shimmers. */
  seeds: Float32Array;
  /** Relative size of each point; a few ambient points are large triangles close to the camera. */
  sizes: Float32Array;
  /** 1 for the points that are sea in the planet: fainter there, so the continents stand out. */
  sea: Float32Array;
}

export const PALETTE_SIZE = 6;
export const AMBIENT_SHARE = 0.12;

/** Small, fast, seeded generator (mulberry32): the same seed gives the same cloud. */
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;
type Put = (i: number, x: number, y: number, z: number) => void;

function writer(target: Float32Array): Put {
  return (i, x, y, z) => {
    target[i * 3] = x;
    target[i * 3 + 1] = y;
    target[i * 3 + 2] = z;
  };
}

/** Splits `total` points among parts proportionally to their weights (the rounding goes to the last part). */
export function share(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((w) => Math.floor((total * w) / sum));
  parts[parts.length - 1] += total - parts.reduce((a, b) => a + b, 0);
  return parts;
}

/** A point on a tube of radius `tube` around the center (cx, cy) in the direction of angle `a` (an arc's band). */
function onArc(put: Put, i: number, rand: Rand, radius: number, a: number, tube: number, cx: number, cy: number) {
  const phi = rand() * Math.PI * 2;
  const rho = tube * (0.55 + 0.45 * Math.sqrt(rand()));
  const r = radius + Math.cos(phi) * rho;
  put(i, cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.sin(phi) * rho);
}

function inBall(put: Put, i: number, rand: Rand, r: number, cx: number, cy: number, cz: number) {
  const u = rand() * 2 - 1;
  const t = rand() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  const k = r * Math.cbrt(0.35 + 0.65 * rand());
  put(i, cx + s * Math.cos(t) * k, cy + s * Math.sin(t) * k, cz + u * k);
}

/** The Wi-Fi symbol: a dot and three arcs of 90°, each one a thick band with some depth so it looks solid. */
export function wifiShape(target: Float32Array, n: number, rand: Rand) {
  const put = writer(target);
  const cy = -1.25;
  const radii = [0.78, 1.52, 2.26];
  const [dot, ...arcs] = share(n, [0.55, ...radii]);
  let i = 0;
  for (let k = 0; k < dot; k += 1) inBall(put, i++, rand, 0.3, 0, cy, 0);
  radii.forEach((radius, a) => {
    for (let k = 0; k < arcs[a]; k += 1) {
      const angle = Math.PI / 4 + rand() * (Math.PI / 2);
      onArc(put, i++, rand, radius, angle, 0.17, 0, cy);
    }
  });
}

/** The points spread over the whole scene, wider than the screen and from far behind to close to the camera. */
export function scatterShape(target: Float32Array, n: number, rand: Rand) {
  const put = writer(target);
  for (let i = 0; i < n; i += 1) {
    const z = -6 + rand() * 8.5;
    const spread = 1 + (2.5 - z) * 0.12;  // farther away, wider, so the screen stays covered
    put(i, (rand() * 2 - 1) * 6.5 * spread, (rand() * 2 - 1) * 3.6 * spread, z);
  }
}

/** A point on the surface of a box (sides chosen by their area). */
function onBox(put: Put, i: number, rand: Rand, w: number, h: number, d: number, cx: number, cy: number, cz: number) {
  const faces = [w * h, w * h, w * d, w * d, h * d, h * d];
  let pick = rand() * faces.reduce((a, b) => a + b, 0);
  let face = 0;
  while (pick > faces[face] && face < 5) pick -= faces[face++];
  const u = rand() - 0.5;
  const v = rand() - 0.5;
  const [x, y, z] = face < 2 ? [u * w, v * h, (face === 0 ? 0.5 : -0.5) * d]
    : face < 4 ? [u * w, (face === 2 ? 0.5 : -0.5) * h, v * d]
      : [(face === 4 ? 0.5 : -0.5) * w, u * h, v * d];
  put(i, cx + x, cy + y, cz + z);
}

/** A router seen a little from above: the body, two antennas, a row of lights and its signal between the antennas. */
export function routerShape(target: Float32Array, n: number, rand: Rand) {
  const put = writer(target);
  const tilt = 0.32;  // seen from above
  const raw = new Float32Array(n * 3);
  const p = writer(raw);
  const [body, antennas, lights, signal] = share(n, [0.56, 0.15, 0.05, 0.24]);
  let i = 0;
  for (let k = 0; k < body; k += 1) onBox(p, i++, rand, 3.1, 0.62, 1.75, 0, -0.75, 0);
  for (let k = 0; k < antennas; k += 1) {
    const side = k % 2 === 0 ? -1 : 1;
    const t = rand();
    const a = rand() * Math.PI * 2;
    p(i++, side * (1.12 + t * 0.12) + Math.cos(a) * 0.07, -0.45 + t * 1.85, -0.62 + Math.sin(a) * 0.07);
  }
  for (let k = 0; k < lights; k += 1) {
    const led = Math.floor(rand() * 5);
    inBall(p, i++, rand, 0.06, -0.9 + led * 0.45, -0.75, 0.9);
  }
  const radii = [0.38, 0.72, 1.06];
  const arcs = share(signal, [1, 2, 3]);
  radii.forEach((radius, a) => {
    for (let k = 0; k < arcs[a]; k += 1) {
      onArc(p, i++, rand, radius, Math.PI / 4 + rand() * (Math.PI / 2), 0.07, 0, -0.05);
    }
  });
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  for (let k = 0; k < n; k += 1) {
    const y = raw[k * 3 + 1];
    const z = raw[k * 3 + 2];
    put(k, raw[k * 3], y * c - z * s + 0.15, y * s + z * c);
  }
}
