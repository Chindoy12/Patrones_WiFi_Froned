import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AnomaliesPage } from '../src/pages/AnomaliesPage';
import { api } from '../src/services/api';
import type { AiPrediction } from '../src/types';

vi.mock('../src/services/api', () => ({
  api: { anomalies: vi.fn(), anomalyCauses: vi.fn() },
}));

describe('Anomalías', () => {
  const prediction = (id: number, anomalyType: AiPrediction['anomalyType']): AiPrediction => ({
    id, networkId: 1, ssid: 'WiFiSense-Guest', analysisResultId: id, anomalyDetected: true, anomalyScore: 0.56,
    severity: 'LOW', anomalyType, message: 'Posible cobertura débil: pérdida de paquetes', recommendation: null,
    recommendationSource: 'RULES', modelVersion: 'isolation-forest-1.1', simulatedData: true,
    createdAt: '2026-10-12T21:00:00Z',
  });

  it('shows the probable cause of each anomaly and the summary by cause', async () => {
    vi.mocked(api.anomalies).mockResolvedValue([prediction(1, 'WEAK_COVERAGE'), prediction(2, null)]);
    vi.mocked(api.anomalyCauses).mockResolvedValue([
      { anomalyType: 'WEAK_COVERAGE', count: 2 }, { anomalyType: 'UNCLASSIFIED', count: 1 },
    ]);
    render(<MemoryRouter><AnomaliesPage /></MemoryRouter>);

    const summary = await screen.findByRole('list', { name: 'Anomalías por causa' });
    expect(within(summary).getByText('Cobertura débil')).toBeInTheDocument();
    expect(within(summary).getByText('Sin clasificar')).toBeInTheDocument();
    const rows = await screen.findAllByRole('row');
    expect(within(rows[1]).getByText('Cobertura débil')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Sin clasificar')).toBeInTheDocument();
    expect(api.anomalyCauses).toHaveBeenCalledWith(30);
  });
});
