import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NetworkBackdrop, nodeCount } from '../src/components/NetworkBackdrop';

describe('NetworkBackdrop', () => {
  it('is decoration hidden from assistive technology', () => {
    const { container } = render(<NetworkBackdrop />);

    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
    expect(canvas).toHaveClass('backdrop');
  });

  it('scales the mesh with the screen but keeps it light', () => {
    expect(nodeCount(390, 844)).toBe(18);
    expect(nodeCount(1440, 900)).toBe(50);
    expect(nodeCount(3840, 2160)).toBe(60);
  });
});
