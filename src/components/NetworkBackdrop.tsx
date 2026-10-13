import { useEffect, useRef } from 'react';

/**
 * Animated background of the app: soft waves that flow like a signal and a mesh of nodes with packets travelling
 * between them, like devices talking on a Wi-Fi network. The mesh leans gently toward the pointer.
 *
 * It is decoration only (aria-hidden, no pointer events). It draws a single still frame when the user prefers
 * reduced motion, pauses while the tab is hidden and keeps the frame rate modest so it never competes with the page.
 */
interface Node { x: number; y: number; vx: number; vy: number; r: number }
interface Packet { from: number; to: number; t: number; speed: number }

const LINK_DISTANCE = 150;
const FRAME_MS = 1000 / 40;

function color(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function nodeCount(width: number, height: number): number {
  return Math.round(Math.min(Math.max((width * height) / 26000, 18), 60));
}

export function NetworkBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const pointer = { x: -1e4, y: -1e4 };
    let width = 0;
    let height = 0;
    let nodes: Node[] = [];
    let packets: Packet[] = [];
    let frame = 0;
    let last = 0;
    let phase = 0;

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width * ratio;
      canvas!.height = height * ratio;
      ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
      nodes = Array.from({ length: nodeCount(width, height) }, () => ({
        x: Math.random() * width, y: Math.random() * height,
        vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: 1.4 + Math.random() * 1.8,
      }));
      packets = [];
    }

    function wave(offset: number, amplitude: number, length: number, base: number, fill: string) {
      ctx!.beginPath();
      ctx!.moveTo(0, height);
      for (let x = 0; x <= width + 20; x += 20) {
        ctx!.lineTo(x, base + Math.sin(x / length + phase * offset) * amplitude
                      + Math.sin(x / (length * .43) - phase * offset * .7) * amplitude * .35);
      }
      ctx!.lineTo(width, height);
      ctx!.closePath();
      ctx!.fillStyle = fill;
      ctx!.fill();
    }

    function draw() {
      const nodeColor = color('--net-node', '#3b6cf6');
      const linkColor = color('--net-link', 'rgba(59,108,246,.18)');
      ctx!.clearRect(0, 0, width, height);
      wave(1, 26, 180, height * .72, color('--net-wave-1', 'rgba(124,176,255,.16)'));
      wave(1.4, 20, 140, height * .8, color('--net-wave-2', 'rgba(59,108,246,.10)'));
      wave(.8, 16, 220, height * .88, color('--net-wave-3', 'rgba(255,255,255,.35)'));

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.hypot(dx, dy);
          if (d < LINK_DISTANCE) {
            ctx!.globalAlpha = 1 - d / LINK_DISTANCE;
            ctx!.strokeStyle = linkColor;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(nodes[i].x, nodes[i].y);
            ctx!.lineTo(nodes[j].x, nodes[j].y);
            ctx!.stroke();
          }
        }
      }
      ctx!.globalAlpha = 1;
      ctx!.fillStyle = nodeColor;
      for (const node of nodes) {
        const near = Math.hypot(node.x - pointer.x, node.y - pointer.y) < 120;
        ctx!.globalAlpha = near ? .9 : .45;
        ctx!.beginPath();
        ctx!.arc(node.x, node.y, near ? node.r + 1.2 : node.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      for (const packet of packets) {
        const a = nodes[packet.from];
        const b = nodes[packet.to];
        if (!a || !b) continue;
        ctx!.globalAlpha = .85;
        ctx!.beginPath();
        ctx!.arc(a.x + (b.x - a.x) * packet.t, a.y + (b.y - a.y) * packet.t, 2.2, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    function step() {
      phase += .012;
      for (const node of nodes) {
        const dx = pointer.x - node.x;
        const dy = pointer.y - node.y;
        const d = Math.hypot(dx, dy);
        if (d < 180 && d > 1) {
          node.vx += (dx / d) * .004;
          node.vy += (dy / d) * .004;
        }
        node.vx = Math.max(Math.min(node.vx, .5), -.5);
        node.vy = Math.max(Math.min(node.vy, .5), -.5);
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      }
      packets = packets.filter((p) => (p.t += p.speed) < 1);
      if (packets.length < 6 && Math.random() < .05 && nodes.length > 1) {
        const from = Math.floor(Math.random() * nodes.length);
        const to = nodes.findIndex((n, i) => i !== from
          && Math.hypot(n.x - nodes[from].x, n.y - nodes[from].y) < LINK_DISTANCE);
        if (to >= 0) packets.push({ from, to, t: 0, speed: .012 + Math.random() * .012 });
      }
    }

    function loop(now: number) {
      frame = requestAnimationFrame(loop);
      if (document.hidden || now - last < FRAME_MS) return;
      last = now;
      step();
      draw();
    }

    function onPointer(event: PointerEvent) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    }

    function onResize() {
      resize();
      draw();
    }

    onResize();
    window.addEventListener('resize', onResize);
    if (!reduced) {
      window.addEventListener('pointermove', onPointer, { passive: true });
      frame = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
    };
  }, []);

  return <canvas ref={canvasRef} className="backdrop" aria-hidden="true" />;
}
