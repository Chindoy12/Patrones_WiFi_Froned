import { formatBytes } from './format';
import type { Capture, CaptureScenario, CaptureStatus } from './types';

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

export const scenarioStatusLabel: Record<CaptureScenario['status'], string> = {
  AVAILABLE: 'Disponible', UNAVAILABLE: 'No disponible', NOT_VERIFIABLE: 'No se puede comprobar',
  NOT_IMPLEMENTED: 'No lo hace WiFiSense',
};

export function isCaptureActive(capture: Capture | null | undefined): boolean {
  return capture?.status === 'PENDING' || capture?.status === 'RUNNING';
}

/** 1 536 -> "1.5 KB"; unknown -> "—" (the tool did not say it). */
export function bytesOrUnknown(bytes: number | null | undefined): string {
  return bytes === null || bytes === undefined ? '—' : formatBytes(bytes);
}

export function formatCount(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : value.toLocaleString('es-CO');
}

/** Share of a part (0-100, rounded); "—" when the whole is unknown or zero. */
export function share(part: number | null | undefined, whole: number | null | undefined): string {
  if (part === null || part === undefined || !whole) return '—';
  const pct = (100 * part) / whole;
  return pct > 0 && pct < 1 ? '<1 %' : `${Math.round(pct)} %`;
}

/** Numeric share for a bar (0-100); 0 when unknown. */
export function percent(part: number | null | undefined, whole: number | null | undefined): number {
  if (part === null || part === undefined || !whole) return 0;
  return Math.min(100, Math.max(0, (100 * part) / whole));
}
