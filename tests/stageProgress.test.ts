import { describe, expect, it } from 'vitest';
import { CAMERA_Z, perspective, STAGE, stageAt, stageLayout } from '../src/components/landing/stageProgress';

const anchors = [
  { at: 450, stage: STAGE.wifi },
  { at: 1350, stage: STAGE.scatter },
  { at: 2250, stage: STAGE.scatter },
  { at: 3150, stage: STAGE.router },
  { at: 4050, stage: STAGE.planet },
];

describe('Escena según el desplazamiento', () => {
  it('each section shows its shape, and between two sections the shape follows the scroll', () => {
    expect(stageAt(450, anchors)).toBe(STAGE.wifi);
    expect(stageAt(900, anchors)).toBeCloseTo(0.5);
    expect(stageAt(1800, anchors)).toBe(STAGE.scatter);  // two sections read with the points scattered
    expect(stageAt(3600, anchors)).toBeCloseTo(2.5);
    expect(stageAt(4050, anchors)).toBe(STAGE.planet);
  });

  it('stays on the first and the last shape beyond the sections, and in any order of the anchors', () => {
    expect(stageAt(0, anchors)).toBe(STAGE.wifi);
    expect(stageAt(9000, anchors)).toBe(STAGE.planet);
    expect(stageAt(900, [...anchors].reverse())).toBeCloseTo(0.5);
    expect(stageAt(100, [])).toBe(0);
  });

  it('on a wide screen the shapes go beside the text; on a phone they stay centered and faint', () => {
    const wide = stageLayout(1440, 900);
    expect(wide.places[STAGE.wifi].x).toBeGreaterThan(0);
    expect(wide.places[STAGE.router].x).toBeLessThan(0);
    expect(wide.places[STAGE.planet].x).toBeGreaterThan(0);
    expect(wide.alpha).toBe(1);

    const phone = stageLayout(390, 844);
    expect(phone.places.every((p) => p.x === 0)).toBe(true);
    expect(phone.alpha).toBeLessThan(0.5);
  });

  it('projects with perspective: a point at the camera distance lands in the middle of the screen', () => {
    const m = perspective(16 / 9);
    // the origin seen from z = CAMERA_Z: x and y stay at 0, w is the distance
    const w = m[11] * -CAMERA_Z + m[15];
    expect(w).toBeCloseTo(CAMERA_Z);
    expect(m[0]).toBeCloseTo(m[5] / (16 / 9));
  });
});
