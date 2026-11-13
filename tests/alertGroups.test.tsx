import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AlertsCard, groupAlerts } from '../src/components/AgentPanel';
import type { AgentAlert } from '../src/types';

describe('Avisos sin repetir', () => {
  const same = 'Distribuye los clientes entre puntos de acceso.';
  const alerts: AgentAlert[] = [
    { type: 'ANOMALY', detail: same, at: '2026-11-11T16:27:00Z' },
    { type: 'ANOMALY', detail: same, at: '2026-11-11T16:51:00Z' },
    { type: 'NEW_DEVICE', detail: 'Se conectó un equipo nuevo: Espressif.', at: '2026-11-11T16:40:00Z' },
    { type: 'ANOMALY', detail: `${same} `, at: '2026-11-11T16:10:00Z' },
  ];

  it('the same notice is shown once, with how many times it happened and when it last did', () => {
    expect(groupAlerts(alerts)).toEqual([
      { type: 'ANOMALY', detail: same, at: '2026-11-11T16:51:00Z', count: 3 },
      { type: 'NEW_DEVICE', detail: 'Se conectó un equipo nuevo: Espressif.', at: '2026-11-11T16:40:00Z', count: 1 },
    ]);
  });

  it('the card shows the repetitions', () => {
    render(<AlertsCard alerts={alerts} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('×3');
    expect(items[0]).toHaveTextContent('Último:');
    expect(items[1]).not.toHaveTextContent('×');
  });
});
