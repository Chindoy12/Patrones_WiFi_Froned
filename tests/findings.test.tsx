import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FindingList } from '../src/components/FindingList';
import type { Finding } from '../src/types';

const fact: Finding = { code: 'TRAFFIC_VOLUME', severity: 'INFO', title: 'Volumen capturado',
                        evidence: '50 paquetes en 15 s.', recommendation: null, confidence: null };
const inference: Finding = { code: 'TRAFFIC_BURST', severity: 'WARNING', title: 'Posible ráfaga de tráfico',
                             evidence: '2 segundos con hasta 300 paquetes.',
                             recommendation: 'Repite la captura en otro momento y compara.', confidence: 0.62 };

describe('Hechos e inferencias (FindingList)', () => {
  it('los hechos van en su propio bloque, sin barra de confianza', () => {
    render(<FindingList findings={[fact]} kind="facts" empty="Sin hechos." />);

    const block = screen.getByRole('region', { name: 'Hechos medidos' });
    expect(within(block).getByText('Volumen capturado')).toBeInTheDocument();
    expect(within(block).getByText('Info')).toBeInTheDocument();
    expect(within(block).queryByRole('meter')).not.toBeInTheDocument();
  });

  it('una inferencia dice qué tan segura es, en palabras y en porcentaje, y su acción', () => {
    render(<FindingList findings={[inference]} kind="inferences" empty="Sin inferencias." />);

    const block = screen.getByRole('region', { name: 'Posibles explicaciones' });
    expect(within(block).getByRole('meter', { name: 'Confianza' })).toHaveAttribute('aria-valuenow', '62');
    expect(within(block).getByText('Confianza media (62 %)')).toBeInTheDocument();
    expect(within(block).getByText(/Repite la captura en otro momento/)).toBeInTheDocument();
    expect(within(block).getByText('Atención')).toBeInTheDocument();
  });
});
