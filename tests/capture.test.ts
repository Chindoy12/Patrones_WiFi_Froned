import { describe, expect, it } from 'vitest';
import {
  bytesOrUnknown, captureFormErrors, droppedText, formatCount, isCaptureActive, percent, share, timeline,
} from '../src/capture';
import { capture, detail } from './captureFixtures';

describe('ayudas de las capturas técnicas', () => {
  it('dicen «—» para lo que la herramienta no informó, nunca 0', () => {
    expect(bytesOrUnknown(null)).toBe('—');
    expect(formatCount(undefined)).toBe('—');
    expect(share(null, 100)).toBe('—');
    expect(share(3, 0)).toBe('—');
    expect(percent(null, 10)).toBe(0);
  });

  it('una parte muy pequeña no se redondea a cero', () => {
    expect(share(2, 1200)).toBe('<1 %');
    expect(share(300, 1200)).toBe('25 %');
    expect(percent(300, 1200)).toBe(25);
  });

  it('la pérdida de la herramienta se dice como pérdida de la captura, no de la red', () => {
    expect(droppedText(detail())).toContain('no de la red');
    expect(droppedText(detail({ totals: { ...detail().totals, droppedByTool: null } })))
      .toBe('La herramienta no informa paquetes perdidos.');
    expect(droppedText(detail({ totals: { ...detail().totals, droppedByTool: 0 } })))
      .toBe('La herramienta no perdió paquetes.');
  });

  it('la línea de tiempo llena con ceros los segundos sin paquetes', () => {
    expect(timeline(detail())).toEqual([{ second: 0, packets: 40 }, { second: 1, packets: 0 },
      { second: 2, packets: 400 }]);
    expect(timeline(detail({ intervals: [] }))).toEqual([]);
  });

  it('solo una captura que espera o corre está activa', () => {
    expect(isCaptureActive(capture({ status: 'PENDING' }))).toBe(true);
    expect(isCaptureActive(capture({ status: 'RUNNING' }))).toBe(true);
    expect(isCaptureActive(capture({ status: 'CANCELLED' }))).toBe(false);
    expect(isCaptureActive(null)).toBe(false);
  });

  it('el formulario exige propósito y respeta los límites del servidor', () => {
    const limits = { maxSeconds: 120, maxPackets: 20000 };
    expect(captureFormErrors('corto', 30, 5000, limits)).toEqual(['Escribe el propósito de la captura (al menos 10 caracteres).']);
    expect(captureFormErrors('Revisar la red del laboratorio', 300, 50, limits)).toHaveLength(2);
    expect(captureFormErrors('Revisar la red del laboratorio', 30, 5000, limits)).toEqual([]);
    expect(captureFormErrors('x'.repeat(201), 30, 5000, limits)).toContain('El propósito debe tener como máximo 200 caracteres.');
  });
});
