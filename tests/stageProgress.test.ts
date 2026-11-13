import { describe, expect, it } from 'vitest';
import {
  CAMERA_Z, HALF_HEIGHT, LOOP, nextShape, perspective, SHAPE, SHAPE_COUNT, stageLayout, toWorld,
} from '../src/components/landing/stageProgress';

describe('Escena: las siete formas', () => {
  it('the loop goes through every shape once and starts again', () => {
    expect([...LOOP].sort()).toEqual(Array.from({ length: SHAPE_COUNT }, (_, i) => i));
    let shape = LOOP[0];
    const seen = [shape];
    for (let i = 0; i < SHAPE_COUNT; i += 1) seen.push((shape = nextShape(shape)));
    expect(seen).toEqual([...LOOP, LOOP[0]]);
  });

  it('on a wide screen every shape goes on the right, beside the words; the scattered points fill the screen', () => {
    const wide = stageLayout(1440, 900);
    expect(wide.places).toHaveLength(SHAPE_COUNT);
    for (const shape of LOOP.filter((s) => s !== SHAPE.scatter)) expect(wide.places[shape].x).toBeGreaterThan(1);
    expect(wide.places[SHAPE.scatter]).toEqual({ x: 0, y: 0, scale: 1 });
    expect(wide.alpha).toBe(1);
  });

  it('on a phone the shapes stay centered and faint behind the words', () => {
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
