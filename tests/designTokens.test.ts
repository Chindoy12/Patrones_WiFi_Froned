import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The design system is a contract: colors live only in tokens.css, both themes define the same tokens and the text
// tokens stay readable (WCAG AA, 4.5:1) on the page canvas.
const STYLES = join(__dirname, '..', 'src', 'styles');
const sheets = readdirSync(STYLES).filter((f) => f.endsWith('.css'));
const read = (file: string) => readFileSync(join(STYLES, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const tokens = read('tokens.css');

function block(selector: string): Record<string, string> {
  const start = tokens.indexOf(selector);
  const body = tokens.slice(tokens.indexOf('{', start) + 1, tokens.indexOf('\n}', start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const dark = block(":root[data-theme='dark']");
const light = block(":root[data-theme='light']");
const shared = block(':root {');

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('design tokens', () => {
  it('index.css loads every style sheet, tokens first', () => {
    const index = readFileSync(join(STYLES, '..', 'index.css'), 'utf8');
    const imported = [...index.matchAll(/@import '\.\/styles\/([\w-]+\.css)';/g)].map((m) => m[1]);

    expect(imported[0]).toBe('tokens.css');
    expect([...imported].sort()).toEqual([...sheets].sort());
  });

  it('keeps colors out of the component sheets (only tokens.css, and print.css for paper)', () => {
    const literal = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;
    const offenders = sheets
      .filter((f) => f !== 'tokens.css' && f !== 'print.css')
      .flatMap((f) => read(f).split('\n').filter((line) => literal.test(line)).map((line) => `${f}: ${line.trim()}`));

    expect(offenders).toEqual([]);
  });

  it('defines the same tokens in the dark and the light theme', () => {
    expect(Object.keys(light).sort()).toEqual(Object.keys(dark).sort());
  });

  it('uses only tokens that exist', () => {
    const defined = new Set([...Object.keys(dark), ...Object.keys(shared), '--gauge', '--gauge-soft', '--gauge-ink',
      '--wifi-rest', '--wifi-on']);
    const missing = sheets.flatMap((f) => [...read(f).matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]))
      .filter((name) => !defined.has(name));

    expect([...new Set(missing)]).toEqual([]);
  });

  it('rations the violet: one signal color in each theme', () => {
    expect(dark['--accent']).toBe('#af50ff');
    expect(dark['--paper']).toBe('#090909');
    expect(light['--accent']).toMatch(/^#[0-9a-f]{6}$/);
  });

  it.each([['dark', dark], ['light', light]])('keeps text readable in the %s theme', (_, theme) => {
    const paper = theme['--paper'];
    for (const token of ['--ink', '--muted', '--accent-ink', '--good-ink', '--warn-ink', '--bad-ink']) {
      expect(contrast(theme[token], paper), `${token} on ${paper}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(theme['--on-accent'], theme['--accent-fill']), 'text of the primary button').toBeGreaterThanOrEqual(4.5);
  });
});
