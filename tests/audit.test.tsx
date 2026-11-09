import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditPage } from '../src/pages/AuditPage';
import { api } from '../src/services/api';
import type { AuditEvent } from '../src/types';

vi.mock('../src/services/api', () => ({
  api: { audit: vi.fn(), auditActions: vi.fn(), retentionPolicies: vi.fn() },
}));

function event(id: number, change: Partial<AuditEvent> = {}): AuditEvent {
  return { id, occurredAt: '2026-10-28T15:00:00Z', actorUsername: 'Jefe.Local', actorRole: 'ADMIN',
    action: 'CAPTURE_REQUESTED', actionLabel: 'Pidió una captura técnica', outcome: 'SUCCESS', targetType: 'CAPTURE',
    targetId: 12, networkId: 4, detail: '30 s, 5000 paquetes. Propósito: revisar la sala', ...change };
}

beforeEach(() => {
  vi.mocked(api.audit).mockReset().mockResolvedValue({ items: [event(1), event(2, { actorUsername: 'Ana.Analista',
    actorRole: 'ANALYST', outcome: 'DENIED', targetType: null, targetId: null, detail: 'Sin permiso: POST /api/x' }),
    event(3, { actorUsername: null, actorRole: 'SYSTEM', action: 'RETENTION_PURGED',
      actionLabel: 'Borró datos viejos según la política de retención', targetType: null, targetId: null })],
  page: 0, size: 25, total: 60 });
  vi.mocked(api.auditActions).mockReset().mockResolvedValue([
    { code: 'CAPTURE_REQUESTED', label: 'Pidió una captura técnica' }, { code: 'USER_DELETED', label: 'Borró una cuenta' }]);
  vi.mocked(api.retentionPolicies).mockReset().mockResolvedValue([
    { code: 'CAPTURE_FILES', title: 'Archivos de captura', days: 0, what: 'El archivo con los paquetes.',
      setting: 'Fijo en el agente', afterwards: 'Nunca sale del computador.' },
    { code: 'AUDIT', title: 'Auditoría', days: 365, what: 'Quién hizo qué.', setting: 'AUDIT_RETENTION',
      afterwards: 'Nadie puede modificarla.' }]);
});

describe('Auditoría', () => {
  it('muestra quién hizo cada operación, con qué resultado, incluidos los intentos sin permiso', async () => {
    render(<AuditPage />);

    const table = await screen.findByRole('table', { name: 'Auditoría' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Jefe.Local');
    expect(rows[0]).toHaveTextContent('Captura #12');
    expect(within(rows[1]).getByText('Sin permiso')).toBeInTheDocument();
    expect(rows[2]).toHaveTextContent('Sistema');
    expect(screen.getByText('1–25 de 60')).toBeInTheDocument();
  });

  it('filtra por operación y resultado y pasa de página', async () => {
    const user = userEvent.setup();
    render(<AuditPage />);
    await screen.findByRole('table', { name: 'Auditoría' });

    await user.selectOptions(screen.getByLabelText('Resultado'), 'DENIED');
    await user.selectOptions(screen.getByLabelText('Operación'), 'USER_DELETED');
    expect(api.audit).toHaveBeenLastCalledWith({ action: 'USER_DELETED', outcome: 'DENIED', page: 0, size: 25 });

    await user.click(await screen.findByRole('button', { name: 'Siguientes' }));
    expect(api.audit).toHaveBeenLastCalledWith({ action: 'USER_DELETED', outcome: 'DENIED', page: 1, size: 25 });
  });
});
