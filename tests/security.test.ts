import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}

const sources = sourceFiles('src').map((file) => ({ file, text: readFileSync(file, 'utf8') }));

describe('frontend security rules', () => {
  it('never talks to the AI service or the database directly', () => {
    const offenders = sources.filter(({ text }) =>
      /localhost:8000|localhost:5432|railway\.internal|postgresql:|jdbc:|AI_SERVICE_URL|DATABASE_/.test(text));
    expect(offenders.map((o) => o.file)).toEqual([]);
  });

  it('contains no secrets or demo credentials', () => {
    const offenders = sources.filter(({ text }) => /ANTHROPIC_API_KEY|sk-ant-|JWT_SECRET|\$2[aby]\$\d\d\$/.test(text));
    expect(offenders.map((o) => o.file)).toEqual([]);
  });

  it('lets visitors sign up without ever choosing a role', () => {
    const api = readFileSync('src/services/api.ts', 'utf8');
    expect(api).toMatch(/'\/api\/auth\/register', \{ username, \.\.\.contact, \.\.\.\(await sealPassword\(password\)\) \}/);
    expect(api).toMatch(/interface RegisterContact \{\s*email\?: string;\s*phone\?: string;\s*\}/);
  });

  it('never sends a password as readable text', () => {
    const api = readFileSync('src/services/api.ts', 'utf8');
    expect(api).not.toMatch(/\bpassword\s*[,}]/);
    // login, register, team account, password reset and contact change; the password change seals both passwords.
    expect(api.match(/sealPassword\(password\)/g)).toHaveLength(5);
    expect(api).toMatch(/sealPassword\(current\)/);
    expect(api).toMatch(/sealPassword\(next\)/);
  });
});
