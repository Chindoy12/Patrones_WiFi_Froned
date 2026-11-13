import { describe, expect, it } from 'vitest';
import {
  CAMERA_Z, HALF_HEIGHT, LAST_STAGE, LOOP, nextStep, perspective, SHAPE, shapeAt, stageLayout, stepFor, toWorld,
} from '../src/components/landing/stageProgress';

describe('Escena: el ciclo de formas', () => {
  it('goes Wi-Fi → scattered → router → planet → scattered → Wi-Fi, and the last step is the first shape', () => {
    expect(LOOP.map(shapeAt)).toEqual(LOOP);
    expect(shapeAt(0)).toBe(SHAPE.wifi);
    expect(shapeAt(3)).toBe(SHAPE.planet);
    expect(shapeAt(LAST_STAGE)).toBe(shapeAt(0));
  });

  it('keeps forming and unforming: after the last step it continues where the second one is', () => {
    const steps = [0];
    for (let i = 0; i < 7; i += 1) steps.push(nextStep(steps[steps.length - 1]));
    expect(steps).toEqual([0, 1, 2, 3, 4, 5, 1, 2]);
  });

  it('goes to a shape forward along the loop: from the planet, the Wi-Fi symbol comes through the scattered points', () => {
    expect(stepFor(SHAPE.wifi, 3)).toBe(5);
    expect(stepFor(SHAPE.planet, 0)).toBe(3);
    expect(stepFor(SHAPE.scatter, 1)).toBe(1);           // already there
    expect(stepFor(SHAPE.scatter, 5)).toBe(1);           // a new lap
    expect(stepFor(SHAPE.router, 4)).toBe(2);            // behind on this lap: back to it
  });

  it('on a wide screen every shape goes on the right, beside the words; on a phone they stay centered and faint', () => {
    const wide = stageLayout(1440, 900);
    for (const shape of [SHAPE.wifi, SHAPE.router, SHAPE.planet]) expect(wide.places[shape].x).toBeGreaterThan(1);
    expect(wide.alpha).toBe(1);

    const phone = stageLayout(390, 844);
    expect(phone.places.every((p) => p.x === 0)).toBe(true);
    expect(phone.alpha).toBeLessThan(0.5);
  });

  it('turns a point of the screen into the scene, for the pointer and the clicks', () => {
    expect(toWorld(720, 450, 1440, 900)).toEqual([0, 0]);
    const [x, y] = toWorld(0, 0, 1440, 900);
    expect(x).toBeCloseTo(-HALF_HEIGHT * 1.6);
    expect(y).toBeCloseTo(HALF_HEIGHT);
  });

  it('projects with perspective: a point at the camera distance lands in the middle of the screen', () => {
    const m = perspective(16 / 9);
    const w = m[11] * -CAMERA_Z + m[15];
    expect(w).toBeCloseTo(CAMERA_Z);
    expect(m[0]).toBeCloseTo(m[5] / (16 / 9));
  });
});
