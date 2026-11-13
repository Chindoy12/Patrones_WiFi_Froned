import { useEffect, useRef } from 'react';
import { useTheme } from '../../theme';
import { buildClouds, type Clouds, PALETTE_SIZE, pointCount } from './particleShapes';
import {
  CAMERA_Z, FIELD_OF_VIEW, perspective, SHAPE, type Shape, SHAPE_COUNT, stageLayout, type StageLayout, toWorld,
} from './stageProgress';

/**
 * The 3D scene of the start page: thousands of small triangles of color that take one shape after another (the
 * Wi-Fi symbol, a laptop and a phone, the points scattered over the whole screen, a router, a brain, a shield and a
 * planet). The page says which shape to show (`shape`); every point leaves at its own moment and flies a little on its
 * way, so the shape comes apart and comes together like a living thing.
 *
 * It answers the visitor: the triangles move away from the pointer (or the finger) as if they dodged it, and a click
 * (or a tap) on an empty spot makes them burst and come back together.
 *
 * Drawn with WebGL directly (no libraries): one draw call per frame. Only two shapes are on the graphics card at a
 * time, the one it leaves and the one it goes to (Avance 31: seven shapes would need more attributes than every
 * graphics card has); each change uploads them once. Decoration only: hidden from assistive technology. Without WebGL
 * it draws nothing and the page reads the same; with reduced motion the shape changes without flying and does not
 * react to the pointer; it pauses while the tab is hidden.
 */

/** How long one shape takes to become the next. */
export const MORPH_MS = 2000;

const VERTEX = `
attribute vec3 aFrom;
attribute vec3 aTo;
attribute float aColor;
attribute float aSeed;
attribute float aSize;
attribute float aAmbient;
attribute float aSea;
uniform mat4 uProjection;
uniform float uMix;
uniform float uFromKind;
uniform float uToKind;
uniform float uTime;
uniform float uFocal;
uniform float uAlpha;
uniform vec2 uTilt;
uniform vec2 uPointer;
uniform float uPush;
uniform vec2 uBurstAt;
uniform float uBurst;
uniform vec3 uPlace[${SHAPE_COUNT}];
uniform vec3 uPalette[${PALETTE_SIZE}];
varying vec3 vColor;
varying float vAlpha;
varying float vAngle;
varying float vLine;
varying float vSolid;

vec3 turnY(vec3 p, float a) { float c = cos(a); float s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
vec3 turnX(vec3 p, float a) { float c = cos(a); float s = sin(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }

/** How each shape moves while it is shown, and where it sits. */
vec3 placed(vec3 p, float kind) {
  vec3 q;
  if (kind == ${SHAPE.wifi}.0) q = turnY(p, sin(uTime * 0.35) * 0.42);
  else if (kind == ${SHAPE.devices}.0) q = turnY(p, -0.18 + sin(uTime * 0.3) * 0.2);
  else if (kind == ${SHAPE.scatter}.0) q = turnY(p, uTime * 0.025);
  else if (kind == ${SHAPE.router}.0) q = turnY(p, -0.45 + sin(uTime * 0.3) * 0.32);
  else if (kind == ${SHAPE.brain}.0) q = turnX(turnY(p, -0.7 + sin(uTime * 0.25) * 0.5), 0.45);
  else if (kind == ${SHAPE.shield}.0) q = turnY(p, sin(uTime * 0.4) * 0.38);
  else q = turnX(turnY(p, uTime * 0.12), 0.3);
  vec3 place = uPlace[0];
  for (int k = 1; k < ${SHAPE_COUNT}; k++) if (float(k) == kind) place = uPlace[k];
  return q * place.z + vec3(place.xy, 0.0);
}

void main() {
  // each point leaves at its own moment: the shape comes apart instead of sliding as a block
  float t = smoothstep(aSeed * 0.45, aSeed * 0.45 + 0.55, uMix);
  vec3 p = mix(placed(aFrom, uFromKind), placed(aTo, uToKind), t);
  float flight = t * (1.0 - t) * 4.0;
  p += vec3(sin(aSeed * 41.0) * 1.1, cos(aSeed * 29.0) * 0.8, sin(aSeed * 17.0) * 1.6) * flight;
  if (aAmbient > 0.5) p = turnY(aFrom, uTime * 0.02);
  // the back of a shape is fainter than its front, so it reads as a solid in 3D
  float front = aAmbient > 0.5 ? 1.0 : 0.35 + 0.65 * smoothstep(-1.4, 1.1, p.z);
  // on the planet the sea is fainter than the land
  float planet = (uFromKind == ${SHAPE.planet}.0 ? 1.0 - t : 0.0) + (uToKind == ${SHAPE.planet}.0 ? t : 0.0);
  front *= 1.0 - 0.6 * aSea * planet;
  p += vec3(sin(uTime * 0.7 + aSeed * 60.0), cos(uTime * 0.6 + aSeed * 50.0), sin(uTime * 0.5 + aSeed * 70.0)) * 0.03;
  p = turnX(turnY(p, uTilt.x), uTilt.y);
  // the pointer pushes the triangles near it away; a click throws them out and they come back
  float reach = (${CAMERA_Z.toFixed(1)} - p.z) / ${CAMERA_Z.toFixed(1)};
  vec2 away = p.xy - uPointer * reach;
  p.xy += normalize(away + 0.0001) * uPush * 0.5 * exp(-dot(away, away) / 0.35);
  vec2 blast = p.xy - uBurstAt * reach;
  p += vec3(normalize(blast + 0.0001) * (0.6 + aSeed), (aSeed - 0.5) * 2.4) * uBurst * 1.8 * exp(-length(blast) * 0.32);

  float depth = ${CAMERA_Z.toFixed(1)} - p.z;
  gl_Position = uProjection * vec4(p.x, p.y, p.z - ${CAMERA_Z.toFixed(1)}, 1.0);
  float size = max(1.5, aSize * 0.036 * uFocal / max(depth, 0.6));
  gl_PointSize = size;
  vColor = uPalette[int(aColor)];
  float near = smoothstep(0.6, 2.2, depth);
  float far = 1.0 - smoothstep(9.0, 14.0, depth);
  vAlpha = uAlpha * front * near * far * (aAmbient > 0.5 ? 0.6 : 1.0) * (0.75 + 0.25 * sin(uTime * 1.3 + aSeed * 90.0));
  vAngle = aSeed * 6.2832 + uTime * (aSeed - 0.5) * 0.9;
  vLine = clamp(1.4 / size, 0.05, 0.3);
  vSolid = size < 3.2 ? 1.0 : 0.0;
}`;

const FRAGMENT = `
precision mediump float;
varying vec3 vColor;
varying float vAlpha;
varying float vAngle;
varying float vLine;
varying float vSolid;

float triangle(vec2 p, float r) {
  const float k = 1.7320508;
  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y);
}

void main() {
  vec2 p = gl_PointCoord - 0.5;
  p.y = -p.y;
  float c = cos(vAngle);
  float s = sin(vAngle);
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  float shape;
  if (vSolid > 0.5) {
    shape = 1.0 - smoothstep(0.3, 0.5, length(p));
  } else {
    float d = triangle(p, 0.36);
    shape = 1.0 - smoothstep(vLine * 0.5, vLine, abs(d));
  }
  float a = shape * vAlpha;
  if (a < 0.02) discard;
  gl_FragColor = vec4(vColor * a, a);
}`;


/** "#8052ff" → [0.5, 0.32, 1]. */
export function rgb(hex: string): [number, number, number] {
  const value = hex.trim().replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return [1, 1, 1];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** The six colors of the triangles, from the --particle-* tokens of the current theme. */
function palette(): Float32Array {
  const style = getComputedStyle(document.documentElement);
  const colors = new Float32Array(PALETTE_SIZE * 3);
  for (let i = 0; i < PALETTE_SIZE; i += 1) colors.set(rgb(style.getPropertyValue(`--particle-${i + 1}`) || '#ffffff'), i * 3);
  return colors;
}

/** The points of each shape, indexed by Shape. */
export function shapePoints(clouds: Clouds): Float32Array[] {
  const byShape: Record<Shape, Float32Array> = {
    [SHAPE.wifi]: clouds.wifi, [SHAPE.devices]: clouds.devices, [SHAPE.scatter]: clouds.scatter,
    [SHAPE.router]: clouds.router, [SHAPE.brain]: clouds.brain, [SHAPE.shield]: clouds.shield,
    [SHAPE.planet]: clouds.planet,
  };
  return Array.from({ length: SHAPE_COUNT }, (_, shape) => byShape[shape as Shape]);
}

/** A press on a link, a button, a field or the card is not a press on the scene. */
function onControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('a, button, input, label, select, textarea, .auth-card') !== null;
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

interface Scene {
  gl: WebGLRenderingContext;
  uniforms: Record<string, WebGLUniformLocation | null>;
  clouds: Clouds;
  shapes: Float32Array[];
  from: WebGLBuffer | null;
  to: WebGLBuffer | null;
}

function createScene(canvas: HTMLCanvasElement): Scene | null {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, depth: false });
  if (!gl) return null;
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const clouds = buildClouds(pointCount(window.innerWidth));
  const ambient = new Float32Array(clouds.count);
  ambient.fill(1, clouds.count - clouds.ambient);
  const buffers: Record<string, WebGLBuffer | null> = {};
  const attributes: [string, Float32Array, number, number][] = [
    ['aFrom', clouds.wifi, 3, gl.DYNAMIC_DRAW], ['aTo', clouds.wifi, 3, gl.DYNAMIC_DRAW],
    ['aColor', clouds.colors, 1, gl.STATIC_DRAW], ['aSeed', clouds.seeds, 1, gl.STATIC_DRAW],
    ['aSize', clouds.sizes, 1, gl.STATIC_DRAW], ['aAmbient', ambient, 1, gl.STATIC_DRAW],
    ['aSea', clouds.sea, 1, gl.STATIC_DRAW],
  ];
  for (const [name, data, size, usage] of attributes) {
    const location = gl.getAttribLocation(program, name);
    if (location < 0) continue;
    const buffer = gl.createBuffer();
    buffers[name] = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  }
  const uniforms = Object.fromEntries(
    ['uProjection', 'uMix', 'uFromKind', 'uToKind', 'uTime', 'uFocal', 'uAlpha', 'uTilt', 'uPointer', 'uPush',
      'uBurstAt', 'uBurst', 'uPlace', 'uPalette'].map((name) => [name, gl.getUniformLocation(program, name)]),
  );
  gl.enable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);
  return { gl, uniforms, clouds, shapes: shapePoints(clouds), from: buffers.aFrom ?? null, to: buffers.aTo ?? null };
}

/** `shape`: the shape to show; the scene travels there (one change at a time: a new one waits for the current one). */
export function ParticleStage({ shape: wanted }: { shape: Shape }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const wantedRef = useRef<Shape>(wanted);
  const redrawRef = useRef<() => void>(() => undefined);
  const theme = useTheme();

  useEffect(() => {
    wantedRef.current = wanted;
    redrawRef.current();
  }, [wanted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const scene = createScene(canvas);
    sceneRef.current = scene;
    if (!scene) {
      canvas.hidden = true;  // no WebGL: the page reads the same without the scene
      return undefined;
    }
    const { gl, uniforms: u, clouds, shapes } = scene;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let layout: StageLayout = stageLayout(window.innerWidth, window.innerHeight);
    const morph = { from: wantedRef.current as Shape, to: wantedRef.current as Shape, startedAt: -1e9 };
    let frame = 0;
    const tilt = { x: 0, y: 0, goalX: 0, goalY: 0 };
    const pointer = { x: 0, y: 0, push: 0, movedAt: -1e9 };
    const burst = { x: 0, y: 0, power: 0 };
    const start = performance.now();

    function upload(buffer: WebGLBuffer | null, points: Float32Array) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, points);
    }

    /** Starts the change to the wanted shape once the current change is over. */
    function follow(now: number) {
      const wantedShape = wantedRef.current;
      const busy = now - morph.startedAt < MORPH_MS;
      if (wantedShape === morph.to || (busy && !reduced)) return;
      morph.from = morph.to;
      morph.to = wantedShape;
      morph.startedAt = now;
      upload(scene!.from, shapes[morph.from]);
      upload(scene!.to, shapes[morph.to]);
      gl.uniform1f(u.uFromKind, morph.from);
      gl.uniform1f(u.uToKind, morph.to);
    }

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas!.width = Math.round(width * ratio);
      canvas!.height = Math.round(height * ratio);
      gl.viewport(0, 0, canvas!.width, canvas!.height);
      gl.uniformMatrix4fv(u.uProjection, false, perspective(width / height));
      gl.uniform1f(u.uFocal, canvas!.height / (2 * Math.tan(FIELD_OF_VIEW / 2)));
      layout = stageLayout(width, height);
      gl.uniform3fv(u.uPlace, layout.places.flatMap((p) => [p.x, p.y, p.scale]));
      gl.uniform1f(u.uAlpha, layout.alpha);
    }

    function draw(now: number) {
      follow(now);
      const mix = reduced ? 1 : Math.min(1, (now - morph.startedAt) / MORPH_MS);
      tilt.x += (tilt.goalX - tilt.x) * 0.05;
      tilt.y += (tilt.goalY - tilt.y) * 0.05;
      pointer.push += ((now - pointer.movedAt < 900 ? 1 : 0) - pointer.push) * 0.06;
      burst.power *= 0.955;
      gl.uniform1f(u.uMix, mix);
      gl.uniform1f(u.uTime, reduced ? 0 : (now - start) / 1000);
      gl.uniform2f(u.uTilt, tilt.x, tilt.y);
      gl.uniform2f(u.uPointer, pointer.x, pointer.y);
      gl.uniform1f(u.uPush, reduced ? 0 : pointer.push);
      gl.uniform2f(u.uBurstAt, burst.x, burst.y);
      gl.uniform1f(u.uBurst, reduced ? 0 : burst.power);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, clouds.count);
    }

    function loop(now: number) {
      draw(now);
      frame = requestAnimationFrame(loop);
    }

    function onPointer(event: PointerEvent) {
      tilt.goalX = (event.clientX / window.innerWidth - 0.5) * 0.25;
      tilt.goalY = (event.clientY / window.innerHeight - 0.5) * 0.12;
      [pointer.x, pointer.y] = toWorld(event.clientX, event.clientY, window.innerWidth, window.innerHeight);
      pointer.movedAt = performance.now();
    }
    function onPress(event: PointerEvent) {
      if (onControl(event.target)) return;
      [burst.x, burst.y] = toWorld(event.clientX, event.clientY, window.innerWidth, window.innerHeight);
      burst.power = 1;
    }
    function onVisibility() {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reduced) frame = requestAnimationFrame(loop);
    }

    resize();
    upload(scene.from, shapes[morph.from]);
    upload(scene.to, shapes[morph.to]);
    gl.uniform1f(u.uFromKind, morph.from);
    gl.uniform1f(u.uToKind, morph.to);
    gl.uniform3fv(u.uPalette, palette());
    if (reduced) {
      draw(performance.now());
      redrawRef.current = () => draw(performance.now());
    } else {
      frame = requestAnimationFrame(loop);
    }
    window.addEventListener('resize', resize);
    if (!reduced) {
      window.addEventListener('pointermove', onPointer, { passive: true });
      window.addEventListener('pointerdown', onPress, { passive: true });
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      redrawRef.current = () => undefined;
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerdown', onPress);
      document.removeEventListener('visibilitychange', onVisibility);
      // the context is not lost on purpose: React may mount the same canvas again (StrictMode), and the browser frees
      // it with the canvas when the page goes away
      sceneRef.current = null;
    };
  }, []);

  // the colors follow the theme: light on the dark canvas, ink on the light one
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const { gl, uniforms } = scene;
    gl.uniform3fv(uniforms.uPalette, palette());
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }, [theme]);

  return <canvas ref={canvasRef} className="particle-stage" aria-hidden="true" />;
}
