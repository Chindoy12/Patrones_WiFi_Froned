import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForgotPasswordPage } from '../src/pages/ForgotPasswordPage';
import { ResetPasswordPage, readTokenFromLocation } from '../src/pages/ResetPasswordPage';
import { api } from '../src/services/api';
import { ApiError } from '../src/services/apiClient';

vi.mock('../src/services/api', () => ({ api: { forgotPassword: vi.fn(), resetPassword: vi.fn() } }));

const TOKEN = 'A'.repeat(43);

beforeEach(() => {
  vi.mocked(api.forgotPassword).mockReset();
  vi.mocked(api.resetPassword).mockReset();
  window.history.replaceState(null, '', '/');
});

describe('Forgot password', () => {
  it('asks for a valid email and shows the same answer for any email', async () => {
    vi.mocked(api.forgotPassword).mockResolvedValue({ message: 'Si ese correo tiene una cuenta, te enviamos un enlace.' });
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);

    const send = screen.getByRole('button', { name: 'Enviar enlace' });
    await userEvent.type(screen.getByLabelText('Correo'), 'no-es-correo');
    expect(send).toBeDisabled();
    await userEvent.clear(screen.getByLabelText('Correo'));
    await userEvent.type(screen.getByLabelText('Correo'), 'ana@gmail.com');
    await userEvent.click(send);

    expect(api.forgotPassword).toHaveBeenCalledWith('ana@gmail.com');
    expect(await screen.findByRole('status')).toHaveTextContent('Si ese correo tiene una cuenta');
  });

  it('explains when there were too many requests', async () => {
    vi.mocked(api.forgotPassword).mockRejectedValue(new ApiError(429, 'Hiciste muchas solicitudes seguidas.'));
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);

    await userEvent.type(screen.getByLabelText('Correo'), 'ana@gmail.com');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Hiciste muchas solicitudes seguidas.');
  });
});

describe('Reset password', () => {
  it('takes the token from the link and removes it from the address bar', () => {
    window.history.replaceState(null, '', `/restablecer#t=${TOKEN}`);

    expect(readTokenFromLocation()).toBe(TOKEN);
    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/restablecer');
  });

  it('sets the new password once both fields match the rules', async () => {
    window.history.replaceState(null, '', `/restablecer#t=${TOKEN}`);
    vi.mocked(api.resetPassword).mockResolvedValue(undefined);
    render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);

    await userEvent.type(screen.getByLabelText('Contraseña nueva'), 'Nueva#2026a');
    await userEvent.type(screen.getByLabelText('Repite la contraseña'), 'Nueva#2026a');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(api.resetPassword).toHaveBeenCalledWith(TOKEN, 'Nueva#2026a');
    expect(await screen.findByRole('heading', { name: 'Contraseña actualizada' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('cerramos las sesiones');
  });

  it('shows why an expired link failed', async () => {
    window.history.replaceState(null, '', `/restablecer#t=${TOKEN}`);
    vi.mocked(api.resetPassword).mockRejectedValue(new ApiError(400, 'El enlace no es válido o ya venció.'));
    render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);

    await userEvent.type(screen.getByLabelText('Contraseña nueva'), 'Nueva#2026a');
    await userEvent.type(screen.getByLabelText('Repite la contraseña'), 'Nueva#2026a');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El enlace no es válido o ya venció.');
  });

  it('a link without a valid token sends the user to ask for a new one', () => {
    window.history.replaceState(null, '', '/restablecer#t=corto');
    render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Enlace no válido' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveAttribute('href', '/recuperar');
  });
});
