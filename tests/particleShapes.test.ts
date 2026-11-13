import { describe, expect, it } from 'vitest';
import {
  AMBIENT_SHARE, buildClouds, isLand, PALETTE_SIZE, pointCount, random, share, shieldWidth,
} from '../src/components/landing/particleShapes';
import { shapePoints } from '../src/components/landing/ParticleStage';
import { SHAPE_COUNT } from '../src/components/landing/stageProgress';

const clouds = buildClouds(2000, 7);
const formed = clouds.count - clouds.ambient;
const point = (a: Float32Array, i: number) => [a[i * 3], a[i * 3 + 1], a[i * 3 + 2]];

describe('Formas de la escena del inicio', () => {
  it('the same seed always builds the same clouds, a different one does not', () => {
    expect(buildClouds(2000, 7).planet).toEqual(clouds.planet);
    expect(buildClouds(2000, 8).planet).not.toEqual(clouds.planet);
    expect(random(1)()).toBe(random(1)());
  });

  it('every shape has one place for each point, so every point can travel to the next shape', () => {
    expect(shapePoints(clouds)).toHaveLength(SHAPE_COUNT);
    for (const shape of shapePoints(clouds)) {
      expect(shape).toHaveLength(clouds.count * 3);
      expect(shape.every(Number.isFinite)).toBe(true);
    }
    expect(clouds.ambient).toBe(Math.round(2000 * AMBIENT_SHARE));
  });

  it('the dust in the air keeps its place in every shape', () => {
    for (let i = formed; i < clouds.count; i += 1) {
      expect(point(clouds.wifi, i)).toEqual(point(clouds.scatter, i));
      for (const shape of shapePoints(clouds)) expect(point(shape, i)).toEqual(point(clouds.scatter, i));
    }
  });

  it('the Wi-Fi symbol is a dot and three arcs open upward', () => {
    const distances = new Set<number>();
    for (let i = 0; i < formed; i += 1) {
      const [x, y] = point(clouds.wifi, i);
      const r = Math.hypot(x, y + 1.25);
      // on the dot or on one of the three bands (0.78, 1.52, 2.26), never in the gaps between them
      const band = [0, 0.78, 1.52, 2.26].findIndex((b) => Math.abs(r - b) < (b === 0 ? 0.31 : 0.18));
      expect(band, `point ${i} at ${r}`).toBeGreaterThanOrEqual(0);
      distances.add(band);
      if (band > 0) expect(y + 1.25).toBeGreaterThan(0);  // the arcs open upward
    }
    expect([...distances].sort()).toEqual([0, 1, 2, 3]);
  });

  it('the planet keeps its continents: the sea has fewer points, and only the sea is marked as sea', () => {
    let land = 0;
    let sea = 0;
    for (let i = 0; i < formed; i += 1) {
      const [x, y, z] = point(clouds.planet, i);
      const r = Math.hypot(x, y, z);
      if (clouds.sea[i]) {
        expect(isLand(x / r, y / r, z / r)).toBe(false);
        sea += 1;
      } else if (Math.abs(r - 1.55 * 1.012) < 0.001) land += 1;
    }
    expect(land).toBeGreaterThan(sea);
    for (let i = formed; i < clouds.count; i += 1) expect(clouds.sea[i]).toBe(0);
  });

  it('colors come from the palette and a few dust points are big triangles', () => {
    expect([...clouds.colors].every((c) => c >= 0 && c < PALETTE_SIZE && Number.isInteger(c))).toBe(true);
    const big = [...clouds.sizes].filter((s) => s > 3).length;
    expect(big).toBeGreaterThan(0);
    expect(big).toBeLessThan(clouds.ambient);
  });

  it('splits points among parts without losing any, and draws fewer on a phone', () => {
    expect(share(10, [1, 1, 1])).toEqual([3, 3, 4]);
    expect(share(1000, [0.5, 0.25, 0.25]).reduce((a, b) => a + b, 0)).toBe(1000);
    expect(pointCount(390)).toBeLessThan(pointCount(1440));
  });

  it('the devices are a laptop on the left and a phone on the right', () => {
    let left = 0;
    let right = 0;
    for (let i = 0; i < formed; i += 1) {
      const [x] = point(clouds.devices, i);
      if (x < 0.35) left += 1;
      else if (x > 0.65) right += 1;
    }
    expect(left).toBeGreaterThan(right);  // the laptop is bigger
    expect(right).toBeGreaterThan(formed * 0.25);
  });

  it('the brain has two hemispheres with a groove between them', () => {
    let groove = 0;
    let sides = 0;
    for (let i = 0; i < formed; i += 1) {
      const [x, y] = point(clouds.brain, i);
      if (y < -0.6) continue;  // the stem
      if (Math.abs(x) < 0.08) groove += 1;
      else sides += 1;
    }
    expect(groove).toBeLessThan(sides * 0.01);
  });

  it('the shield stays inside its outline and narrows into a point at the bottom', () => {
    expect(shieldWidth(0.5)).toBeGreaterThan(shieldWidth(-1.2));
    expect(shieldWidth(-1.6)).toBe(0);
    for (let i = 0; i < formed; i += 1) {
      const [x, y] = point(clouds.shield, i);
      expect(Math.abs(x)).toBeLessThanOrEqual(shieldWidth(Math.min(Math.max(y, -1.6), 1.25)) + 0.2);
    }
  });
});
