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
});
