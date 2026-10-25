import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { arcPath, Gauge, TICKS, ticks } from '../src/components/Gauge';
import { StatusStrip } from '../src/components/StatusStrip';
import { ThemeToggle } from '../src/components/ThemeToggle';
import { applyTheme, storedTheme } from '../src/theme';

afterEach(() => {
  act(() => applyTheme('light'));
  vi.restoreAllMocks();
});

describe('Gauge', () => {
  it('reads value and status in words, not only in color', () => {
    render(<Gauge percent={84} value="84" label="Calidad de 0 a 100" status="good" caption="Buena" />);

    expect(screen.getByRole('img', { name: 'Calidad de 0 a 100: 84, Buena' })).toHaveClass('gauge--good');
  });

  it('fills the arc in proportion and draws nothing when there is no value', () => {
    const { container, rerender } = render(<Gauge percent={30} value="30" label="Calidad" status="poor" />);
    expect(container.querySelector('.gauge__fill')).toHaveAttribute('stroke-dasharray', '30 100');

    rerender(<Gauge percent={null} value="—" label="Calidad" status="none" />);
    expect(container.querySelector('.gauge__fill')).toBeNull();
    expect(container.querySelector('.gauge__track')).not.toBeNull();
  });

  it('says there is no data instead of reading a dash aloud', () => {
    render(<Gauge percent={null} value="—" unit="ms" label="Latencia" status="none" caption="Sin datos" />);

    expect(screen.getByRole('img', { name: 'Latencia: sin datos' })).toBeInTheDocument();
  });

  it('keeps the fill between 0 and 100', () => {
    const { container } = render(<Gauge percent={180} value="180" label="Calidad" status="good" />);
    expect(container.querySelector('.gauge__fill')).toHaveAttribute('stroke-dasharray', '100 100');
  });

  it('draws a 240 degree arc open at the bottom', () => {
    expect(arcPath(80)).toBe('M 30.72 140.00 A 80 80 0 1 1 169.28 140.00');
  });

  it('lights the ticks around the arc up to the value, like the bars of a Wi-Fi signal', () => {
    const half = ticks(50);
    expect(half).toHaveLength(TICKS);
    expect(half[0].angle).toBe(150);
    expect(half[TICKS - 1].angle).toBe(390);
    expect(half.filter((t) => t.on)).toHaveLength(16);
    expect(ticks(0).some((t) => t.on)).toBe(false);
    expect(ticks(100).every((t) => t.on)).toBe(true);

    const { container } = render(<Gauge percent={50} value="50" label="Calidad" status="good" />);
    expect(container.querySelectorAll('.gauge__tick')).toHaveLength(TICKS);
    expect(container.querySelectorAll('.gauge__tick.is-on')).toHaveLength(16);
  });

  it('draws a share without a status icon: it is not good or bad', () => {
    const { container } = render(
      <Gauge size="sm" percent={97.2} value="97,2" unit="%" label="UDP" status="share" caption="2.345 paquetes" />);

    expect(screen.getByRole('img', { name: 'UDP: 97,2 %, 2.345 paquetes' })).toHaveClass('gauge--share');
    expect(container.querySelector('.gauge__caption svg')).toBeNull();
  });
});

describe('StatusStrip', () => {
  it('lists each service with its state in text', () => {
    render(<StatusStrip label="Estado" items={[{ icon: 'ai', label: 'Servicio de IA', detail: 'No responde', state: 'down' }]} />);

    expect(screen.getByRole('list', { name: 'Estado' })).toHaveTextContent('Servicio de IANo responde');
  });

  it('puts one hidden node per service on the route, colored by its state', () => {
    const { container } = render(<StatusStrip label="Estado" items={[
      { icon: 'ai', label: 'Servicio de IA', detail: 'Disponible', state: 'ok' },
      { icon: 'bell', label: 'Alertas abiertas', detail: '3', state: 'warn' },
    ]} />);

    const nodes = container.querySelectorAll('.strip__node');
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toHaveAttribute('aria-hidden', 'true');
    expect(nodes[1].closest('li')).toHaveClass('strip__item--warn');
  });
});

describe('ThemeToggle', () => {
  beforeEach(() => act(() => applyTheme('light')));

  it('switches every toggle on screen to dark mode and back', async () => {
    render(<><ThemeToggle /><ThemeToggle /></>);
    const [first, second] = screen.getAllByRole('button', { name: /Modo oscuro/ });

    await userEvent.click(first);

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(second).toHaveAttribute('aria-pressed', 'true');
    expect(storedTheme()).toBe('dark');
  });

  it('still switches when the browser blocks storage', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole('button', { name: /Modo oscuro/ }));

    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
