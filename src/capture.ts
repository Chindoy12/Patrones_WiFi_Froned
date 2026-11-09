import type { CaptureStatus } from './types';

/**
 * Pure helpers of the technical captures: labels, tones and the numbers of a result. Nothing is estimated: a count the
 * capture tool did not report stays unknown ("—"), never 0.
 */

export const captureStatusLabel: Record<CaptureStatus, string> = {
  PENDING: 'Esperando al sensor', RUNNING: 'Capturando', COMPLETED: 'Completada', FAILED: 'Falló',
  CANCELLED: 'Detenida',
};

export const captureStatusTone: Record<CaptureStatus, 'neutral' | 'warn' | 'good' | 'bad'> = {
  PENDING: 'neutral', RUNNING: 'warn', COMPLETED: 'good', FAILED: 'bad', CANCELLED: 'neutral',
};
