import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../src/auth/AuthContext';
import { CHAPTER_MS, CHAPTERS, nextChapter, previousChapter, welcomeSeen } from '../src/components/landing/chapters';
import { rgb } from '../src/components/landing/ParticleStage';
import { LoginPage } from '../src/pages/LoginPage';

vi.mock('../src/services/api', () => ({ api: { me: vi.fn(), login: vi.fn() } }));

const renderStart = () => render(<MemoryRouter><AuthProvider><LoginPage /></AuthProvider></MemoryRouter>);

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(window, 'matchMedia');
});

describe('Bienvenida', () => {
  it('the first visit opens the welcome, on one screen, with the first chapter and «Comenzar»', () => {
    renderStart();

    expect(screen.getByRole('heading', { level: 1, name: CHAPTERS[0].title })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Comenzar/ })).toBeInTheDocument();
    expect(screen.queryByLabelText('Usuario o correo')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Crear cuenta/i })).not.toBeInTheDocument();  // only inside the card
  });

  it('plays by itself, one chapter every 6 seconds, and the pause (for the keyboard) stops it', () => {
    expect(CHAPTER_MS).toBe(6_000);
    vi.useFakeTimers();
    renderStart();

    act(() => vi.advanceTimersByTime(CHAPTER_MS));
    expect(screen.getByRole('heading', { level: 1, name: CHAPTERS[1].title })).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: 'Pausar la presentación' }).click());
    act(() => vi.advanceTimersByTime(CHAPTER_MS * 3));
    expect(screen.getByRole('heading', { level: 1, name: CHAPTERS[1].title })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seguir la presentación' })).toBeInTheDocument();
  });

  it('hovering the words pauses the story, so it can be read slowly', () => {
    vi.useFakeTimers();
    renderStart();

    fireEvent.pointerEnter(screen.getByRole('heading', { level: 1 }).parentElement!);
    act(() => vi.advanceTimersByTime(CHAPTER_MS * 2));
    expect(screen.getByRole('heading', { level: 1, name: CHAPTERS[0].title })).toBeInTheDocument();
    fireEvent.pointerLeave(screen.getByRole('heading', { level: 1 }).parentElement!);
    act(() => vi.advanceTimersByTime(CHAPTER_MS));
    expect(screen.getByRole('heading', { level: 1, name: CHAPTERS[1].title })).toBeInTheDocument();
  });

  it('shows only the words and «Comenzar»: no dots over the scene, and each chapter has its own shape', () => {
    renderStart();

    expect(screen.queryByRole('group', { name: 'Partes de la presentación' })).not.toBeInTheDocument();
    expect(new Set(CHAPTERS.map((c) => c.shape)).size).toBe(CHAPTERS.length);
  });

  it('with reduced motion the story waits for the visitor, who moves it with «Siguiente»', async () => {
    Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: true }), configurable: true });
    vi.useFakeTimers();
    renderStart();

    act(() => vi.advanceTimersByTime(CHAPTER_MS * 2));
    expect(screen.getByRole('heading', { level: 1, name: CHAPTERS[0].title })).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: /Siguiente/ }).click());
    expect(screen.getByRole('heading', { level: 1, name: CHAPTERS[1].title })).toBeInTheDocument();
  });

  it('«Comenzar» opens the compact login with the cursor ready, and the next visit goes straight there', async () => {
    const { unmount } = renderStart();

    await userEvent.click(screen.getByRole('button', { name: /Comenzar/ }));

    expect(screen.getByRole('heading', { level: 1, name: 'Inicia sesión' })).toBeInTheDocument();
    expect(screen.getByLabelText('Usuario o correo')).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Crea una aquí' })).toBeInTheDocument();
    expect(welcomeSeen()).toBe(true);

    unmount();
    renderStart();
    expect(screen.getByLabelText('Usuario o correo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver la presentación' }));
    expect(screen.getByRole('button', { name: /Comenzar/ })).toBeInTheDocument();
  });

  it('«Ya tengo cuenta» skips the welcome', async () => {
    renderStart();

    await userEvent.click(screen.getByRole('button', { name: 'Ya tengo cuenta' }));

    expect(screen.getByLabelText('Usuario o correo')).toBeInTheDocument();
  });

  it('the scene is decoration, and without WebGL it hides itself and the page reads the same', () => {
    const { container } = renderStart();

    const canvas = container.querySelector('canvas.particle-stage');
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
    expect(canvas).toHaveProperty('hidden', true);  // jsdom has no WebGL
  });

  it('the chapters go around, and the colors of the triangles come from the tokens', () => {
    expect(CHAPTERS).toHaveLength(7);
    expect(nextChapter(CHAPTERS.length - 1)).toBe(0);
    expect(previousChapter(0)).toBe(CHAPTERS.length - 1);
    expect(rgb('#ff0000')).toEqual([1, 0, 0]);
    expect(rgb(' #fff')).toEqual([1, 1, 1]);
    expect(rgb('nada')).toEqual([1, 1, 1]);
  });
});
