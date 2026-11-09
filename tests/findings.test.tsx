import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FindingList } from '../src/components/FindingList';
import type { Finding } from '../src/types';

const fact: Finding = { code: 'TRAFFIC_VOLUME', severity: 'INFO', title: 'Volumen capturado',
                        evidence: '50 paquetes en 15 s.', recommendation: null, confidence: null };

describe('Hechos e inferencias (FindingList)', () => {
  it('los hechos van en su propio bloque, sin barra de confianza', () => {
    render(<FindingList findings={[fact]} kind="facts" empty="Sin hechos." />);

    const block = screen.getByRole('region', { name: 'Hechos medidos' });
    expect(within(block).getByText('Volumen capturado')).toBeInTheDocument();
    expect(within(block).getByText('Info')).toBeInTheDocument();
    expect(within(block).queryByRole('meter')).not.toBeInTheDocument();
  });
});
