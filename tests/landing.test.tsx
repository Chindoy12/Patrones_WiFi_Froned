import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../src/auth/AuthContext';
import { rgb } from '../src/components/landing/ParticleStage';
import { LoginPage } from '../src/pages/LoginPage';

vi.mock('../src/services/api', () => ({ api: { me: vi.fn(), login: vi.fn() } }));

const renderStart = () => render(<MemoryRouter><AuthProvider><LoginPage /></AuthProvider></MemoryRouter>);

afterEach(() => vi.restoreAllMocks());

describe('Inicio', () => {
  it('keeps the login in the first screen and tells the story below, one shape per section', () => {
    const { container } = renderStart();

    expect(screen.getByRole('heading', { level: 1, name: 'Inicia sesión' })).toBeInTheDocument();
    expect(screen.getByLabelText('Usuario o correo')).toBeInTheDocument();
    const stages = [...container.querySelectorAll<HTMLElement>('[data-stage]')].map((el) => Number(el.dataset.stage));
    expect(stages).toEqual([0, 1, 1, 2, 3]);  // Wi-Fi, scattered twice, router, planet
    expect(screen.getByRole('heading', { name: 'Hoy tu red es invisible.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /en un solo lugar/ })).toBeInTheDocument();
  });

  it('the scene is decoration, and without WebGL it hides itself and the page reads the same', () => {
    const { container } = renderStart();

    const canvas = container.querySelector('canvas.particle-stage');
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
    expect(canvas).toHaveProperty('hidden', true);  // jsdom has no WebGL
  });

  it('«Cómo funciona» goes to the story and «Iniciar sesión» at the end goes back to the form', async () => {
    const intoView = vi.fn();
    Element.prototype.scrollIntoView = intoView;
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    renderStart();

    await userEvent.click(screen.getByRole('link', { name: 'Cómo funciona' }));
    expect(intoView).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    expect(screen.getByLabelText('Usuario o correo')).toHaveFocus();
  });

  it('reads the colors of the triangles from the tokens', () => {
    expect(rgb('#ff0000')).toEqual([1, 0, 0]);
    expect(rgb(' #fff')).toEqual([1, 1, 1]);
    expect(rgb('nada')).toEqual([1, 1, 1]);
  });
});
