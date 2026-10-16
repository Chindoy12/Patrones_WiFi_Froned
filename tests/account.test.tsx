import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../src/auth/AuthContext';
import { AccountPanel } from '../src/components/AccountPanel';
import { api } from '../src/services/api';
import { ApiError } from '../src/services/apiClient';

vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/services/api', () => ({
  api: { myAccount: vi.fn(), updateMyContact: vi.fn(), changeMyPassword: vi.fn() },
}));

const renew = vi.fn();

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 9, username: 'ana', role: 'USER' }, ready: true,
    login: vi.fn(), register: vi.fn(), renew, logout: vi.fn(), can: () => false,
  });
  vi.mocked(api.myAccount).mockReset().mockResolvedValue({ username: 'ana', email: null, phone: null });
  vi.mocked(api.updateMyContact).mockReset();
  vi.mocked(api.changeMyPassword).mockReset();
  renew.mockReset();
});

describe('Mi cuenta', () => {
  it('warns when the account cannot be recovered and adds the email with the current password', async () => {
    vi.mocked(api.updateMyContact).mockResolvedValue({ username: 'ana', email: 'ana@gmail.com', phone: '+573001234567' });
    render(<AccountPanel />);

    expect(await screen.findByRole('alert')).toHaveTextContent('no tiene correo de recuperación');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar correo' }));
    await userEvent.type(screen.getByLabelText('Correo de recuperación'), 'ana@gmail.com');
    await userEvent.type(screen.getByLabelText('Celular (opcional)'), '300 123 4567');
    await userEvent.type(screen.getByLabelText('Tu contraseña actual (para confirmar)'), 'Actual#2026a');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(api.updateMyContact).toHaveBeenCalledWith('ana@gmail.com', '+573001234567', 'Actual#2026a');
    expect(await screen.findByRole('status')).toHaveTextContent('Guardamos tu correo y tu celular.');
  });

  it('changes the password and keeps the user signed in with the new session', async () => {
    const session = { token: 'nuevo', expiresAt: '2026-10-17T00:00:00Z', user: { id: 9, username: 'ana', role: 'USER' as const } };
    vi.mocked(api.changeMyPassword).mockResolvedValue(session);
    render(<AccountPanel />);

    await userEvent.click(await screen.findByRole('button', { name: 'Cambiar contraseña' }));
    await userEvent.type(screen.getByLabelText('Contraseña actual'), 'Actual#2026a');
    await userEvent.type(screen.getByLabelText('Contraseña nueva'), 'Nueva#2026ab');
    await userEvent.type(screen.getByLabelText('Repite la contraseña nueva'), 'Nueva#2026ab');
    await userEvent.click(screen.getByRole('button', { name: /Cambiar contraseña/ }));

    expect(api.changeMyPassword).toHaveBeenCalledWith('Actual#2026a', 'Nueva#2026ab');
    expect(renew).toHaveBeenCalledWith(session);
    expect(await screen.findByRole('status')).toHaveTextContent('Cerramos tus otras sesiones.');
  });

  it('shows the reasons when the current password is wrong', async () => {
    vi.mocked(api.changeMyPassword).mockRejectedValue(new ApiError(400, 'La contraseña actual no es correcta.'));
    vi.mocked(api.myAccount).mockResolvedValue({ username: 'ana', email: 'ana@gmail.com', phone: null });
    render(<AccountPanel />);

    await userEvent.click(await screen.findByRole('button', { name: 'Cambiar contraseña' }));
    await userEvent.type(screen.getByLabelText('Contraseña actual'), 'Mala#2026abc');
    await userEvent.type(screen.getByLabelText('Contraseña nueva'), 'Nueva#2026ab');
    await userEvent.type(screen.getByLabelText('Repite la contraseña nueva'), 'Nueva#2026ab');
    await userEvent.click(screen.getByRole('button', { name: /Cambiar contraseña/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña actual no es correcta.');
    expect(renew).not.toHaveBeenCalled();
  });
});
