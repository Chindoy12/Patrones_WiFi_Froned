import { useEffect, useRef } from 'react';

/**
 * Background of the login: how a Wi-Fi network works, drawn like the layers of a neural network. The devices of the
 * house (left) talk to the access points, the access points to the router and the router to Internet (right). Packets
 * go up in violet and the answers come back in light blue. Touching a device lights up its route; clicking an empty
 * spot connects a new device, which first associates to the nearest access point and then gets its address.
 *
 * On a wide screen the canvas covers the whole page, around the card. On a phone or a portrait tablet it becomes a band
 * under the card (see auth.css), so it never runs over the wordmark or the form; the drawing always fits its own box.
 *
 * Decoration only: hidden from assistive technology, a single still frame with reduced motion, paused while the tab
 * is hidden. The layout functions are exported so they can be tested without a canvas.
 */

export type Layer = 0 | 1 | 2 | 3;
export interface FlowNode { id: string; layer: Layer; x: number; y: number }
export interface FlowLayout {
  vertical: boolean;
  devices: FlowNode[];
  aps: FlowNode[];
  router: FlowNode;
  internet: FlowNode;
}

export const LAYER_NAMES = ['Equipos', 'Puntos de acceso', 'Router', 'Internet'] as const;
const MAX_DEVICES = 18;
const FRAME_MS = 1000 / 30;

/** Deterministic jitter so the "random" positions are the same on every render (and in the tests). */
function wobble(i: number): number {
  return Math.sin(i * 12.9898) * 0.5;
}

/**
 * Where each layer goes. On a wide screen the flow runs left to right around the card in the middle; in the short band
 * under the card (phones) it runs left to right using the whole width; on a tall narrow box it runs from the bottom
 * (devices) to the top (Internet).
 */
export function flowLayout(width: number, height: number, deviceCount = 10): FlowLayout {
  const vertical = width < height * 1.1;
  const band = !vertical && height < 320;
  const at = (main: number, cross: number): [number, number] => (vertical ? [cross * width, main * height] : [main * width, cross * height]);
  const spread: [number, number] = band ? [0.08, 0.84] : [0.16, 0.7];
  const devices = Array.from({ length: deviceCount }, (_, i) => {
    const cross = spread[0] + (spread[1] * (i + 0.5)) / deviceCount;
    const jitter = Math.abs(wobble(i));
    const [x, y] = vertical ? at(0.95 - jitter * 0.04, cross) : at((band ? 0.05 : 0.06) + jitter * (band ? 0.05 : 0.06), cross);
    return { id: `d${i}`, layer: 0 as Layer, x, y };
  });
  const apCross = band ? [0.2, 0.5, 0.8] : [0.3, 0.5, 0.7];
  const apMain = vertical ? 0.82 : band ? 0.33 : 0.21;
  const aps = apCross.map((cross, i) => {
    const [x, y] = at(apMain, cross);
    return { id: `a${i}`, layer: 1 as Layer, x, y };
  });
  const [rx, ry] = vertical ? at(0.13, 0.5) : at(band ? 0.72 : 0.8, 0.5);
  const [ix, iy] = vertical ? at(0.04, 0.5) : at(band ? 0.91 : 0.93, 0.5);
  return { vertical, devices, aps, router: { id: 'r', layer: 2, x: rx, y: ry }, internet: { id: 'i', layer: 3, x: ix, y: iy } };
}

/** The access point a device connects to: the closest one. */
export function nearestAp(layout: FlowLayout, x: number, y: number): FlowNode {
  return layout.aps.reduce((best, ap) => (Math.hypot(ap.x - x, ap.y - y) < Math.hypot(best.x - x, best.y - y) ? ap : best));
}

/** Route of a device to Internet: the device, its access point, the router and Internet. */
export function routeOf(layout: FlowLayout, device: FlowNode): FlowNode[] {
  return [device, nearestAp(layout, device.x, device.y), layout.router, layout.internet];
}

interface Packet { route: FlowNode[]; t: number; speed: number; up: boolean }
interface Ring { x: number; y: number; age: number }
interface Joining { node: FlowNode; age: number }

function css(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Point at fraction t of a route of several segments. */
function along(route: FlowNode[], t: number): [number, number] {
  const segments = route.length - 1;
  const k = Math.min(Math.floor(t * segments), segments - 1);
  const local = t * segments - k;
  const a = route[k];
  const b = route[k + 1];
  return [a.x + (b.x - a.x) * local, a.y + (b.y - a.y) * local];
}

export function WifiNetworkFlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    let width = 0;
    let height = 0;
    let layout = flowLayout(1, 1);
    let extra: FlowNode[] = [];
    let packets: Packet[] = [];
    let rings: Ring[] = [];
    let joining: Joining[] = [];
    let hovered: FlowNode | null = null;
    let frame = 0;
    let last = 0;
    let clock = 0;
    let nextPacket = 0;

    const devices = () => [...layout.devices, ...extra];

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const box = canvas!.getBoundingClientRect();
      width = box.width || window.innerWidth;
      height = box.height || window.innerHeight;
      canvas!.width = width * ratio;
      canvas!.height = height * ratio;
      ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
      layout = flowLayout(width, height, width < 520 ? 7 : 11);
      extra = [];
      packets = [];
    }

    function send(device: FlowNode) {
      packets.push({ route: routeOf(layout, device), t: 0, speed: 0.012 + Math.random() * 0.008, up: true });
    }

    function line(a: FlowNode, b: FlowNode, color: string, alpha: number, lineWidth = 1) {
      ctx!.globalAlpha = alpha;
      ctx!.strokeStyle = color;
      ctx!.lineWidth = lineWidth;
      ctx!.beginPath();
      ctx!.moveTo(a.x, a.y);
      ctx!.lineTo(b.x, b.y);
      ctx!.stroke();
    }

    function dot(x: number, y: number, r: number, color: string, alpha = 1) {
      ctx!.globalAlpha = alpha;
      ctx!.fillStyle = color;
      ctx!.beginPath();
      ctx!.arc(x, y, r, 0, Math.PI * 2);
      ctx!.fill();
    }

    function wifiArcs(x: number, y: number, color: string) {
      ctx!.strokeStyle = color;
      ctx!.lineWidth = 1.4;
      ctx!.globalAlpha = 0.85;
      for (const r of [6, 10, 14]) {
        ctx!.beginPath();
        ctx!.arc(x, y + 4, r, Math.PI * 1.25, Math.PI * 1.75);
        ctx!.stroke();
      }
    }

    function label(text: string, x: number, y: number, color: string) {
      ctx!.globalAlpha = 0.75;
      ctx!.fillStyle = color;
      ctx!.font = "500 10px 'JetBrains Mono', ui-monospace, monospace";
      ctx!.textAlign = 'center';
      ctx!.fillText(text.toUpperCase().split('').join(' '), x, y);
    }

    function draw() {
      const link = css('--net-link', 'rgba(225,189,255,.14)');
      const node = css('--flow-node', '#d1e4fa');
      const accent = css('--accent', '#af50ff');
      const up = css('--flow-up', '#af50ff');
      const down = css('--flow-down', '#98c0ef');
      const muted = css('--auth-muted', '#9da7ba');
      ctx!.clearRect(0, 0, width, height);
      const all = devices();
      const route = hovered ? routeOf(layout, hovered) : null;

      // Every device to every access point, very faint (the "fully connected" layer), then the real links stronger.
      for (const d of all) for (const ap of layout.aps) line(d, ap, link, 0.25);
      for (const d of all) {
        const ap = nearestAp(layout, d.x, d.y);
        const joiningNode = joining.find((j) => j.node === d);
        if (joiningNode) {
          // still associating: a dashed line that grows toward the access point
          const k = Math.min(joiningNode.age, 1);
          ctx!.setLineDash([4, 4]);
          line(d, { ...ap, x: d.x + (ap.x - d.x) * k, y: d.y + (ap.y - d.y) * k }, accent, 0.9, 1.2);
          ctx!.setLineDash([]);
        } else {
          line(d, ap, link, 1, 1);
        }
      }
      for (const ap of layout.aps) line(ap, layout.router, link, 1, 1.4);
      line(layout.router, layout.internet, link, 1, 2);

      if (route) for (let k = 0; k < route.length - 1; k++) line(route[k], route[k + 1], accent, 0.9, 2);

      for (const ring of rings) {
        ctx!.globalAlpha = Math.max(1 - ring.age, 0) * 0.8;
        ctx!.strokeStyle = accent;
        ctx!.lineWidth = 1.2;
        ctx!.beginPath();
        ctx!.arc(ring.x, ring.y, 8 + ring.age * 26, 0, Math.PI * 2);
        ctx!.stroke();
      }

      for (const p of packets) {
        const [x, y] = along(p.route, p.up ? p.t : 1 - p.t);
        dot(x, y, 2.6, p.up ? up : down, 0.95);
      }

      for (const d of all) {
        const on = route?.[0] === d;
        dot(d.x, d.y, on ? 5 : 3.5, on ? accent : node, on ? 1 : 0.85);
      }
      for (const ap of layout.aps) {
        dot(ap.x, ap.y, 6.5, accent, 0.95);
        wifiArcs(ap.x, ap.y - 10, node);
      }
      dot(layout.router.x, layout.router.y, 9, node, 0.95);
      dot(layout.router.x, layout.router.y, 3.5, accent, 1);
      ctx!.globalAlpha = 0.9;
      ctx!.strokeStyle = node;
      ctx!.lineWidth = 1.2;
      ctx!.beginPath();
      ctx!.arc(layout.internet.x, layout.internet.y, 11, 0, Math.PI * 2);
      ctx!.ellipse(layout.internet.x, layout.internet.y, 5, 11, 0, 0, Math.PI * 2);
      ctx!.moveTo(layout.internet.x - 11, layout.internet.y);
      ctx!.lineTo(layout.internet.x + 11, layout.internet.y);
      ctx!.stroke();

      if (!layout.vertical && width >= 900) {
        const bottom = Math.max(...layout.devices.map((d) => d.y)) + 34;
        label(LAYER_NAMES[0], layout.devices[0].x + 8, bottom, muted);
        label(LAYER_NAMES[1], layout.aps[0].x, bottom, muted);
        label(LAYER_NAMES[2], layout.router.x, layout.router.y + 32, muted);
        label(LAYER_NAMES[3], layout.internet.x, layout.internet.y + 32, muted);
      }
      ctx!.globalAlpha = 1;
    }

    function step(dt: number) {
      clock += dt;
      if (clock > nextPacket) {
        const all = devices();
        send(all[Math.floor(Math.random() * all.length)]);
        nextPacket = clock + 380 + Math.random() * 420;
      }
      const done: Packet[] = [];
      packets = packets.filter((p) => {
        const before = p.t;
        p.t += p.speed;
        // a packet that passes an access point makes it ripple, like the signal going out
        const apAt = 1 / 3;
        if ((p.up ? before < apAt && p.t >= apAt : before < 1 - apAt && p.t >= 1 - apAt) && rings.length < 10) {
          rings.push({ x: p.route[1].x, y: p.route[1].y, age: 0 });
        }
        if (p.t >= 1) {
          done.push(p);
          return false;
        }
        return true;
      });
      for (const p of done) if (p.up) packets.push({ route: p.route, t: 0, speed: p.speed, up: false });  // the answer
      rings = rings.filter((r) => (r.age += 0.03) < 1);
      joining = joining.filter((j) => {
        j.age += 0.025;
        if (j.age < 1) return true;
        send(j.node);  // associated: it asks for its address (DHCP) right away
        return false;
      });
    }

    function loop(now: number) {
      frame = requestAnimationFrame(loop);
      if (document.hidden || now - last < FRAME_MS) return;
      const dt = last ? Math.min(now - last, 100) : FRAME_MS;
      last = now;
      step(dt);
      draw();
    }

    /** The pointer in the canvas' own coordinates, or null when it is outside the drawing. */
    function local(event: PointerEvent): [number, number] | null {
      const box = canvas!.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      return x >= 0 && y >= 0 && x <= width && y <= height ? [x, y] : null;
    }

    function deviceAt(x: number, y: number): FlowNode | null {
      return devices().find((d) => Math.hypot(d.x - x, d.y - y) < 28) ?? null;
    }

    function onMove(event: PointerEvent) {
      const at = local(event);
      const near = at ? deviceAt(at[0], at[1]) : null;
      if (near && near !== hovered) send(near);
      hovered = near;
    }

    function onDown(event: PointerEvent) {
      const target = event.target as Element | null;
      if (target?.closest('.auth-card, a, button, input, label, select, textarea')) return;
      const at = local(event);
      if (!at) return;
      const near = deviceAt(at[0], at[1]);
      if (near) {
        // on a touch screen there is no hover: tapping a device shows its route
        if (near !== hovered) send(near);
        hovered = near;
        return;
      }
      const node: FlowNode = { id: `n${Date.now()}`, layer: 0, x: at[0], y: at[1] };
      extra = [...extra, node].slice(-(MAX_DEVICES - layout.devices.length));
      joining.push({ node, age: 0 });
    }

    function onResize() {
      resize();
      draw();
    }

    onResize();
    window.addEventListener('resize', onResize);
    // the band under the card changes size with the page, not only with the window
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
    observer?.observe(canvas);
    if (!reduced) {
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerdown', onDown);
      frame = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
    };
  }, []);

  return <canvas ref={canvasRef} className="auth-flow" aria-hidden="true" />;
}
