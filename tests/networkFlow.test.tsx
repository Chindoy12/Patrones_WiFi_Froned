import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthShell } from '../src/components/AuthShell';
import { flowLayout, LAYER_NAMES, nearestAp, routeOf } from '../src/components/WifiNetworkFlow';

describe('dibujo de la red Wi-Fi del inicio de sesión', () => {
  it('en pantalla ancha las capas van de izquierda a derecha: equipos, puntos de acceso, router e Internet', () => {
    const layout = flowLayout(1366, 768, 11);
    expect(layout.vertical).toBe(false);
    expect(layout.devices).toHaveLength(11);
    expect(layout.aps).toHaveLength(3);
    const maxDevice = Math.max(...layout.devices.map((d) => d.x));
    const ap = layout.aps[0].x;
    expect(maxDevice).toBeLessThan(ap);
    expect(ap).toBeLessThan(layout.router.x);
    expect(layout.router.x).toBeLessThan(layout.internet.x);
    // el lado izquierdo y el derecho quedan fuera del centro, donde va la tarjeta de 400 px
    expect(ap).toBeLessThan(1366 / 2 - 200);
    expect(layout.router.x).toBeGreaterThan(1366 / 2 + 200);
  });

  it('en la franja bajo la tarjeta (celular) usa todo el ancho y todo queda dentro de la franja', () => {
    const layout = flowLayout(358, 230, 7);
    expect(layout.vertical).toBe(false);
    for (const node of [...layout.devices, ...layout.aps, layout.router, layout.internet]) {
      expect(node.x).toBeGreaterThan(0);
      expect(node.x).toBeLessThan(358);
      expect(node.y).toBeGreaterThan(0);
      expect(node.y).toBeLessThan(230);
    }
    expect(layout.internet.x).toBeGreaterThan(358 * 0.85);
  });

  it('en una caja alta y angosta el flujo sube: los equipos abajo e Internet arriba', () => {
    const layout = flowLayout(390, 844, 7);
    expect(layout.vertical).toBe(true);
    const topDevice = Math.min(...layout.devices.map((d) => d.y));
    expect(topDevice).toBeGreaterThan(layout.aps[0].y);
    expect(layout.aps[0].y).toBeGreaterThan(layout.router.y);
    expect(layout.router.y).toBeGreaterThan(layout.internet.y);
  });

  it('un equipo se conecta al punto de acceso más cercano', () => {
    const layout = flowLayout(1366, 768);
    for (const ap of layout.aps) expect(nearestAp(layout, ap.x - 30, ap.y + 5)).toBe(ap);
  });

  it('la ruta de un equipo es equipo → su punto de acceso → router → Internet', () => {
    const layout = flowLayout(1366, 768);
    const device = layout.devices[0];
    const route = routeOf(layout, device);
    expect(route).toEqual([device, nearestAp(layout, device.x, device.y), layout.router, layout.internet]);
    expect(route.map((n) => LAYER_NAMES[n.layer])).toEqual(['Equipos', 'Puntos de acceso', 'Router', 'Internet']);
  });

  it('el marco del inicio de sesión muestra la marca, explica el dibujo y oculta el lienzo a los lectores de pantalla', () => {
    const { container } = render(
      <MemoryRouter>
        <AuthShell title="Inicia sesión" subtitle="Mide tu conexión">
          <p>formulario</p>
        </AuthShell>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
    expect(screen.getByText('WiFiSense')).toBeInTheDocument();
    expect(screen.getByText(/Así viaja tu conexión/)).toBeInTheDocument();
    expect(container.querySelector('canvas.auth-flow')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: /modo (claro|oscuro)/i })).toBeInTheDocument();
  });
});
