import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiModelPage } from '../src/pages/AiModelPage';
import { api } from '../src/services/api';
import type { AiModelOverview, AlgorithmMetrics, ModelEvaluation } from '../src/types';

vi.mock('../src/services/api', () => ({
  api: { aiModel: vi.fn() },
}));

const recallByType = { CONGESTION: 0.99, INTERFERENCE: 1, WEAK_COVERAGE: 0.95, PROVIDER_ISSUE: 0.77, SUSPICIOUS_TRAFFIC: 0.68 };
const metrics = (algorithm: string, f1: number, production = false): AlgorithmMetrics => ({
  algorithm, precision: 0.918, recall: 0.878, f1, falsePositiveRate: 0.019, rocAuc: 0.978, averagePrecision: 0.9,
  recallByType, fitMs: 600, predictUsPerSample: 22.3, production,
});

const evaluation: ModelEvaluation = {
  dataset: 'Escenarios sintéticos etiquetados.', trainSamples: 5000, testNormal: 2000, testAnomalies: 500,
  productionAlgorithm: 'IsolationForest', modelVersion: 'isolation-forest-1.1',
  algorithms: [metrics('IsolationForest', 0.898, true), metrics('LocalOutlierFactor', 0.897), metrics('OneClassSVM', 0.887)],
  tuning: [{ nEstimators: 200, maxSamples: 'todas (5000)', f1: 0.892, recall: 0.864, falsePositiveRate: 0.018, best: true }],
  sensitivity: [{ contamination: 0.02, precision: 0.918, recall: 0.878, falsePositiveRate: 0.019, production: true }],
  diagnosis: { accuracy: 0.943, evaluated: 439, confusion: {} },
  generatedAt: '2026-10-12T21:00:00Z',
};

const overview = (ready: boolean): AiModelOverview => ({
  model: { algorithm: 'IsolationForest', modelVersion: 'isolation-forest-1.1', features: ['latency', 'jitter'],
           threshold: 0.504, trainedOn: 'línea base sintética', recommendationEngine: 'reglas' },
  evaluation: ready ? evaluation : null,
  evaluationReady: ready,
});

beforeEach(() => {
  vi.mocked(api.aiModel).mockReset();
});

describe('Modelo de IA', () => {
  it('compares the three algorithms and marks the one in production', async () => {
    vi.mocked(api.aiModel).mockResolvedValue(overview(true));
    render(<MemoryRouter><AiModelPage /></MemoryRouter>);

    const table = (await screen.findByRole('heading', { name: 'Comparación de algoritmos' })).closest('section')!;
    const production = within(table).getByText('En producción').closest('tr')!;
    expect(within(production).getByText('Isolation Forest')).toBeInTheDocument();
    expect(within(table).getByText('One-Class SVM')).toBeInTheDocument();
    expect(screen.getByText('Latencia, Jitter')).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: '77 %' })).toHaveLength(3);
    expect(screen.getByText('94,3 %')).toBeInTheDocument();
  });

  it('explains that the evaluation is still running and lets the team refresh', async () => {
    vi.mocked(api.aiModel).mockResolvedValueOnce(overview(false)).mockResolvedValueOnce(overview(true));
    render(<MemoryRouter><AiModelPage /></MemoryRouter>);

    expect(await screen.findByRole('status')).toHaveTextContent('se está calculando');
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

    expect(await screen.findByRole('heading', { name: 'Comparación de algoritmos' })).toBeInTheDocument();
    expect(api.aiModel).toHaveBeenCalledTimes(2);
  });
});
