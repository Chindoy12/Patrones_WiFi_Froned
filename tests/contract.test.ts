import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { securityStatus } from '../src/components/AgentPanel';
import type { AgentChannel, Quality, SecurityAssessment, SecurityFinding } from '../src/types';

/**
 * The page shows the AI's answers as the backend stores them (agent_reports.details): the security audit, the quality
 * and the best channel. The JSON examples in tests/contracts are real answers of the AI service, the same files its
 * own contract test uses. If the AI renames or removes a field the page reads, this test fails.
 */
type Kind = 'number' | 'string' | 'boolean' | 'array' | 'number|null' | 'string|null' | 'boolean|null';

const contract = (name: string) => JSON.parse(readFileSync(`tests/contracts/${name}`, 'utf8')) as Record<string, unknown>;

/** Every key of the type must be listed (TypeScript checks it), and the example must have it with that kind. */
function problems<T>(value: Record<string, unknown>, shape: Record<keyof T, Kind>, path = ''): string[] {
  return Object.entries(shape as Record<string, Kind>).flatMap(([key, kind]) => {
    if (!(key in value)) return [`falta ${path}${key}`];
    const actual = value[key];
    const allowed = kind.split('|');
    const actualKind = actual === null ? 'null' : Array.isArray(actual) ? 'array' : typeof actual;
    return allowed.includes(actualKind) ? [] : [`${path}${key} es ${actualKind}, la página espera ${kind}`];
  });
}

describe('contrato con el servicio de IA', () => {
  it('reads every field of the security audit', () => {
    const security = contract('security_response.json');
    expect(problems<SecurityAssessment>(security, {
      score: 'number', grade: 'string', gradeLabel: 'string', summary: 'string', findings: 'array', modelVersion: 'string',
    })).toEqual([]);
    expect(Object.keys(securityStatus)).toContain(security.grade);
    const finding = (security.findings as Record<string, unknown>[])[0];
    expect(problems<SecurityFinding>(finding, {
      code: 'string', severity: 'string', title: 'string', detail: 'string', action: 'string', penalty: 'number',
    }, 'findings[0].')).toEqual([]);
  });

  it('reads every field of the quality score', () => {
    expect(problems<Quality>(contract('quality_response.json'), {
      score: 'number', grade: 'string', gradeLabel: 'string', metrics: 'array', activities: 'array', tips: 'array',
      contractedRatio: 'number|null', modelVersion: 'string',
    })).toEqual([]);
  });

  it('reads every field of the best channel', () => {
    expect(problems<AgentChannel>(contract('channel_response.json'), {
      band: 'string|null', currentChannel: 'number|null', currentLoad: 'number|null', recommendedChannel: 'number|null',
      recommendedLoad: 'number|null', shouldChange: 'boolean', summary: 'string', action: 'string|null',
      options: 'array', modelVersion: 'string',
    })).toEqual([]);
  });

  it('notices a renamed field', () => {
    expect(problems<{ score: number }>({ puntaje: 80 }, { score: 'number' })).toEqual(['falta score']);
    expect(problems<{ score: number }>({ score: '80' }, { score: 'number' })).toEqual(['score es string, la página espera number']);
  });
});
