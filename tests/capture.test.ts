import { describe, expect, it } from 'vitest';
import { bytesOrUnknown, formatCount, percent, share } from '../src/capture';

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
});
