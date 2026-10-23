import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../src/auth/AuthContext';
import { AiModelPage } from '../src/pages/AiModelPage';
import { api } from '../src/services/api';
import type { AiModelOverview, AiModelVersion, AiTrainingStatus, AlgorithmMetrics, ModelEvaluation, Role } from '../src/types';

vi.mock('../src/services/api', () => ({
  api: { aiModel: vi.fn(), aiTraining: vi.fn(), trainAi: vi.fn() },
}));
vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));

function signedInAs(role: Role) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 1, username: 'equipo', role }, ready: true, login: vi.fn(), register: vi.fn(), renew: vi.fn(),
    logout: vi.fn(), can: (...roles) => roles.includes(role),
  });
}

const promoted: AiModelVersion = {
  id: 3, version: 'real-20261019-0800', algorithm: 'IsolationForest', trainedAt: '2026-10-19T08:00:00Z',
  trainedBy: null, samples: 2016, networks: 2, dataFrom: '2026-10-12T08:00:00Z', dataTo: '2026-10-19T07:55:00Z',
  metrics: { candidate: { precision: 0.97, recall: 0.9, f1: 0.93, falsePositiveRate: 0.03 },
             current: { precision: 0.7, recall: 0.92, f1: 0.8, falsePositiveRate: 0.31 }, currentVersion: 'isolation-forest-1.1' },
  decision: 'PROMOTED', reason: 'Da menos falsas alarmas con estas redes (3,0 % frente a 31,0 %).', active: true,
};

const training = (samples: number, versions: AiModelVersion[] = []): AiTrainingStatus => ({
  available: { samples, teamSamples: samples, homeSamples: 0, networks: samples ? 1 : 0,
               from: samples ? '2026-10-12T08:00:00Z' : null, to: samples ? '2026-10-19T07:55:00Z' : null },
  minimumSamples: 300, canTrain: samples >= 300, nextAutomatic: '2026-10-26T08:00:00Z', versions,
});

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
  vi.mocked(api.aiTraining).mockReset().mockResolvedValue(training(0));
  vi.mocked(api.trainAi).mockReset();
  signedInAs('VIEWER');
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

describe('Entrenamiento con datos reales', () => {
  it('shows how much real data there is and the history of versions', async () => {
    vi.mocked(api.aiModel).mockResolvedValue({ ...overview(true), model: { ...overview(true).model,
      modelVersion: 'real-20261019-0800', realData: true, trainedOn: '2016 mediciones reales' } });
    vi.mocked(api.aiTraining).mockResolvedValue(training(2016, [promoted]));
    render(<MemoryRouter><AiModelPage /></MemoryRouter>);

    expect(await screen.findByText('Datos reales')).toBeInTheDocument();
    const section = (await screen.findByRole('heading', { name: 'Entrenamiento con datos reales' })).closest('section')!;
    expect(await within(section).findByText('2.016', { selector: 'strong' })).toBeInTheDocument();
    const row = within(section).getByText('real-20261019-0800').closest('tr')!;
    expect(within(row).getByText('En uso')).toBeInTheDocument();
    expect(within(row).getByText('Aprobado')).toBeInTheDocument();
    expect(within(row).getByText('Automático')).toBeInTheDocument();
    expect(row).toHaveTextContent('0,93 vs 0,8');
    expect(within(section).queryByRole('button', { name: /Entrenar ahora/ })).not.toBeInTheDocument();
  });

  it('lets an administrator train and says why the new model was or was not used', async () => {
    signedInAs('ADMIN');
    vi.mocked(api.aiModel).mockResolvedValue(overview(true));
    vi.mocked(api.aiTraining).mockResolvedValue(training(450));
    vi.mocked(api.trainAi).mockResolvedValue({ ...promoted, decision: 'REJECTED', active: false,
      reason: 'No es mejor que el modelo en uso. Se sigue usando el actual.' });
    render(<MemoryRouter><AiModelPage /></MemoryRouter>);

    await userEvent.click(await screen.findByRole('button', { name: /Entrenar ahora/ }));

    expect(await screen.findByText('Se sigue usando el modelo actual.')).toBeInTheDocument();
    expect(screen.getByText(/No es mejor que el modelo en uso/)).toBeInTheDocument();
    expect(api.trainAi).toHaveBeenCalledTimes(1);
    expect(api.aiModel).toHaveBeenCalledTimes(2);
  });

  it('cannot train with too few measurements', async () => {
    signedInAs('ADMIN');
    vi.mocked(api.aiModel).mockResolvedValue(overview(true));
    vi.mocked(api.aiTraining).mockResolvedValue(training(120));
    render(<MemoryRouter><AiModelPage /></MemoryRouter>);

    expect(await screen.findByRole('button', { name: /Entrenar ahora/ })).toBeDisabled();
    expect(screen.getByRole('img', { name: '120 de 300' })).toBeInTheDocument();
  });
});

describe('Qué es aprendizaje automático y qué son reglas', () => {
  it('says that only the anomaly detection is a trained model', async () => {
    vi.mocked(api.aiModel).mockResolvedValue(overview(true));
    render(<MemoryRouter><AiModelPage /></MemoryRouter>);

    const section = (await screen.findByRole('heading', { name: 'Qué es aprendizaje automático y qué son reglas' })).closest('section')!;
    expect(within(section).getAllByText('Aprendizaje automático')).toHaveLength(1);
    expect(within(section).getByText(/Isolation Forest/).closest('tr')).toHaveTextContent('Aprendizaje automático');
    expect(within(section).getByText('Auditoría de seguridad').closest('tr')).toHaveTextContent('Reglas');
    expect(within(section).getByText(/es una hipótesis/)).toBeInTheDocument();
  });
});
