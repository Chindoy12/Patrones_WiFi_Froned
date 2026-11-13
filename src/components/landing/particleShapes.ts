/**
 * The shapes of the start page, as clouds of the same number of points so every point can travel from one shape to
 * the next: the Wi-Fi symbol, a laptop and a phone, the points scattered all over the space, a router with its
 * antennas, a brain (the AI), a shield with a check (security and notices) and a planet with an orbit and arcs that
 * join distant places ("todo se conecta"). One shape for each message of the welcome (Avance 31).
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
  devices: Float32Array;
  scatter: Float32Array;
  router: Float32Array;
  brain: Float32Array;
  shield: Float32Array;
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
const BIG_SHARE = 0.012;

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

/** Land or sea at a direction of the sphere: a smooth made-up pattern, so the planet has continents (not Earth's). */
export function isLand(x: number, y: number, z: number): boolean {
  const f = Math.sin(2.6 * x + 1.3) * Math.sin(2.2 * y + 0.4) * Math.sin(2.9 * z + 2.1)
    + 0.55 * Math.sin(4.7 * x + 2.1 * y) * Math.cos(3.9 * z - 1.2 * x)
    + 0.3 * Math.sin(7.3 * y + 0.9 * z);
  return f > 0.12;
}

function direction(rand: Rand): [number, number, number] {
  const u = rand() * 2 - 1;
  const t = rand() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return [s * Math.cos(t), u, s * Math.sin(t)];
}

/** The planet: dense continents and a light sea, a tilted orbit and arcs that leave the surface to join two places. */
export function planetShape(target: Float32Array, n: number, rand: Rand, sea?: Float32Array) {
  const put = writer(target);
  const R = 1.55;
  const [surface, orbit, links] = share(n, [0.72, 0.12, 0.16]);
  // an even spiral over the sphere (Fibonacci), so the globe looks round and clean; the sea keeps few points
  let i = 0;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const candidates = Math.round(surface * 2.4);
  for (let pass = 0; i < surface; pass += 1) {
    for (let k = 0; k < candidates && i < surface; k += 1) {
      const y = 1 - (2 * (k + 0.5)) / candidates;
      const ring = Math.sqrt(1 - y * y);
      const a = k * golden + pass * 0.37;
      const x = Math.cos(a) * ring;
      const z = Math.sin(a) * ring;
      const land = isLand(x, y, z);
      if (!land && rand() > 0.16) continue;
      const r = R * (land ? 1.012 : 0.995);
      if (sea && !land) sea[i] = 1;
      put(i++, x * r, y * r, z * r);
    }
  }
  const tilt = 0.42;
  for (let k = 0; k < orbit; k += 1) {
    const a = rand() * Math.PI * 2;
    const r = 2.0 + rand() * 0.14;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    put(i++, x, z * Math.sin(tilt) + (rand() - 0.5) * 0.04, z * Math.cos(tilt));
  }
  // arcs between pairs of places, raised above the surface like a link between two networks
  const ARCS = 9;
  const ends = Array.from({ length: ARCS }, () => [direction(rand), direction(rand)] as const);
  const perArc = share(links, Array(ARCS).fill(1));
  ends.forEach(([a, b], arc) => {
    for (let k = 0; k < perArc[arc]; k += 1) {
      const t = rand();
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t;
      const z = a[2] + (b[2] - a[2]) * t;
      const len = Math.hypot(x, y, z) || 1;
      const lift = R * (1.02 + 0.28 * Math.sin(Math.PI * t)) + (rand() - 0.5) * 0.03;
      put(i++, (x / len) * lift, (y / len) * lift, (z / len) * lift);
    }
  });
}

/** A point on a flat rectangle (w × h, centered): mostly on its border, the rest scattered inside, like a screen. */
function onPanel(put: Put, i: number, rand: Rand, w: number, h: number, border: number) {
  if (rand() < border) {
    const along = rand() * 2 * (w + h);
    const inset = (rand() - 0.5) * 0.08;
    const [x, y] = along < w ? [along - w / 2, h / 2 + inset]
      : along < 2 * w ? [along - w - w / 2, -h / 2 + inset]
        : along < 2 * w + h ? [w / 2 + inset, along - 2 * w - h / 2]
          : [-w / 2 + inset, along - 2 * w - h - h / 2];
    put(i, x, y, (rand() - 0.5) * 0.06);
  } else {
    put(i, (rand() - 0.5) * w * 0.94, (rand() - 0.5) * h * 0.94, (rand() - 0.5) * 0.04);
  }
}

/** The devices that come and go: an open laptop and, beside it, a phone, both seen a little from the side. */
export function devicesShape(target: Float32Array, n: number, rand: Rand) {
  const put = writer(target);
  const panel = new Float32Array(3);
  const at = writer(panel);
  const [screen, base, phone, button] = share(n, [0.42, 0.26, 0.29, 0.03]);
  let i = 0;
  const lean = -0.28;  // the screen leans back
  for (let k = 0; k < screen; k += 1) {
    onPanel(at, 0, rand, 2.5, 1.55, 0.55);
    const [x, y, z] = panel;
    const yy = y + 0.78;
    put(i++, x - 1.0, yy * Math.cos(lean) - 0.38, -0.55 + yy * Math.sin(lean) + z);
  }
  for (let k = 0; k < base; k += 1) {
    onPanel(at, 0, rand, 2.7, 1.3, 0.45);
    const [x, y, z] = panel;
    put(i++, x - 1.0, -0.4 + z, -0.55 + y + 0.65);
  }
  for (let k = 0; k < phone; k += 1) {
    onPanel(at, 0, rand, 0.82, 1.62, 0.6);
    const [x, y, z] = panel;
    put(i++, x + 1.35, y - 0.15, 0.3 + z);
  }
  for (let k = 0; k < button; k += 1) inBall(put, i++, rand, 0.06, 1.35, -0.82, 0.32);
}

/**
 * The AI: a brain seen from above and in front (the scene tilts it), two long hemispheres with deep folds on the
 * surface and a groove between them, and a short stem underneath at the back.
 */
export function brainShape(target: Float32Array, n: number, rand: Rand) {
  const put = writer(target);
  const [cortex, stem] = share(n, [0.95, 0.05]);
  let i = 0;
  while (i < cortex) {
    const [x, y, z] = direction(rand);
    // folds: points gather on the ridges, and the groove between the hemispheres stays empty
    const fold = Math.sin(11 * z + 4 * y) * Math.sin(9 * y - 3 * x) + 0.7 * Math.sin(15 * x + 6 * z);
    if (Math.abs(x) < 0.09 && y > -0.4) continue;
    if (fold < 0 && rand() > 0.12) continue;
    const r = 1 + 0.08 * fold;
    const flat = y < -0.3 ? 0.7 : 1;  // flatter underneath
    put(i++, x * 1.15 * r + Math.sign(x) * 0.07, y * 0.95 * r * flat, z * 1.6 * r);
  }
  for (let k = 0; k < stem; k += 1) {
    const t = rand();
    const a = rand() * Math.PI * 2;
    put(i++, Math.cos(a) * 0.14, -0.6 - t * 0.55, -0.7 - t * 0.2 + Math.sin(a) * 0.14);
  }
}

/** Half the width of the shield at height y: straight sides that curve into a point at the bottom. */
export function shieldWidth(y: number): number {
  if (y > 1.3 || y < -1.6) return 0;
  if (y >= 0.1) return 1.25 - 0.08 * Math.max(0, y - 1.1) * 5;
  return 1.25 * Math.sqrt((y + 1.6) / 1.7);
}

/** Security and notices: a shield with a thick border and a check mark inside. */
export function shieldShape(target: Float32Array, n: number, rand: Rand) {
  const put = writer(target);
  const [rim, face, check] = share(n, [0.45, 0.25, 0.3]);
  let i = 0;
  for (let k = 0; k < rim; k += 1) {
    const top = rand() < 0.22;
    const y = top ? 1.3 - rand() * 0.1 : -1.6 + rand() * 2.9;
    const side = rand() < 0.5 ? -1 : 1;
    const x = top ? (rand() * 2 - 1) * shieldWidth(1.25) : side * (shieldWidth(y) - rand() * 0.12);
    put(i++, x, y, (rand() - 0.5) * 0.35);
  }
  for (let k = 0; k < face; k += 1) {
    const y = -1.5 + rand() * 2.75;
    const w = shieldWidth(y) * 0.88;
    put(i++, (rand() * 2 - 1) * w, y, (rand() - 0.5) * 0.12 - 0.1);
  }
  const points: [number, number][] = [[-0.6, 0.0], [-0.15, -0.48], [0.68, 0.5]];
  for (let k = 0; k < check; k += 1) {
    const first = rand() < 0.4;
    const [a, b] = first ? [points[0], points[1]] : [points[1], points[2]];
    const t = rand();
    const a2 = rand() * Math.PI * 2;
    const rho = 0.13 * Math.sqrt(rand());
    put(i++, a[0] + (b[0] - a[0]) * t + Math.cos(a2) * rho, a[1] + (b[1] - a[1]) * t + Math.sin(a2) * rho,
      0.15 + (rand() - 0.5) * 0.18);
  }
}

/** Builds every cloud for `count` points. The same seed always gives the same clouds. */
export function buildClouds(count: number, seed = 2027): Clouds {
  const rand = random(seed);
  const ambient = Math.round(count * AMBIENT_SHARE);
  const formed = count - ambient;
  const make = () => new Float32Array(count * 3);
  const clouds: Clouds = {
    count, ambient, wifi: make(), devices: make(), scatter: make(), router: make(), brain: make(), shield: make(),
    planet: make(),
    colors: new Float32Array(count), seeds: new Float32Array(count), sizes: new Float32Array(count),
    sea: new Float32Array(count),
  };
  scatterShape(clouds.scatter, count, rand);
  wifiShape(clouds.wifi, formed, rand);
  routerShape(clouds.router, formed, rand);
  planetShape(clouds.planet, formed, rand, clouds.sea);
  devicesShape(clouds.devices, formed, rand);
  brainShape(clouds.brain, formed, rand);
  shieldShape(clouds.shield, formed, rand);
  // the ambient points keep their scattered place in every shape
  for (const shape of [clouds.wifi, clouds.devices, clouds.router, clouds.brain, clouds.shield, clouds.planet]) {
    shape.set(clouds.scatter.subarray(formed * 3), formed * 3);
  }
  const big = Math.round(count * BIG_SHARE);
  for (let i = 0; i < count; i += 1) {
    clouds.colors[i] = Math.min(PALETTE_SIZE - 1, Math.floor(rand() * PALETTE_SIZE));
    clouds.seeds[i] = rand();
    clouds.sizes[i] = i >= count - big ? 3.5 + rand() * 3 : 0.55 + rand() * 0.85;
  }
  return clouds;
}

/** How many points the device can draw comfortably: fewer on a phone. */
export function pointCount(width: number): number {
  return width < 760 ? 3200 : 6400;
}
