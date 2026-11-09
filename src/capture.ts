import { formatBytes } from './format';
import type { Capture, CaptureDetail, CaptureScenario, CaptureStatus } from './types';

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

/** Packets per second of every second of the capture (missing seconds are 0) and the busiest one. */
export function timeline(detail: CaptureDetail): { second: number; packets: number }[] {
  const last = Math.max(0, ...detail.intervals.map((i) => i.second));
  const bySecond = new Map(detail.intervals.map((i) => [i.second, i.packets]));
  return Array.from({ length: detail.intervals.length ? last + 1 : 0 }, (_, second) => ({
    second, packets: bySecond.get(second) ?? 0,
  }));
}

/** What the tool dropped, said as a loss of the capture (never of the network). */
export function droppedText(detail: CaptureDetail): string {
  const { droppedByTool, packets } = detail.totals;
  if (droppedByTool === null) return 'La herramienta no informa paquetes perdidos.';
  if (droppedByTool === 0) return 'La herramienta no perdió paquetes.';
  return `La herramienta no alcanzó a guardar ${formatCount(droppedByTool)} paquetes `
    + `(${share(droppedByTool, (packets ?? 0) + droppedByTool)}): es una pérdida de la captura, no de la red.`;
}

/** Validation of the form, with the server's own limits. */
export function captureFormErrors(purpose: string, seconds: number, packets: number,
                                  limits: { maxSeconds: number; maxPackets: number }): string[] {
  const errors: string[] = [];
  const text = purpose.trim();
  if (text.length < 10) errors.push('Escribe el propósito de la captura (al menos 10 caracteres).');
  if (text.length > 200) errors.push('El propósito debe tener como máximo 200 caracteres.');
  if (!Number.isInteger(seconds) || seconds < 5 || seconds > limits.maxSeconds) {
    errors.push(`La duración debe estar entre 5 y ${limits.maxSeconds} segundos.`);
  }
  if (!Number.isInteger(packets) || packets < 100 || packets > limits.maxPackets) {
    errors.push(`Los paquetes deben estar entre 100 y ${formatCount(limits.maxPackets)}.`);
  }
  return errors;
}
