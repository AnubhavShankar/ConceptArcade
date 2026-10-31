// Drawing for "Night Shift at Magnet Park": the park at dusk, night and storm, the Ring Rocket (tower, ring, magnet, podium), the Light Tunnel (field frames,
// loop signs, cue cards), the Brake Run (slope, brake bank, coaster car, station), Joon the ride engineer, the two riders, the cue board and the ride ticket.
// Nothing here knows the answer of a round: every function draws the positions, colours and moods it is handed. No Math.random: every wobble comes from the clock.
import { PAL } from '@core/arcade';
import { face } from '@core/mathkit';
import { glow, line, text } from '@core/neon';
import type { Ev, Glow } from './logic';

export type G = CanvasRenderingContext2D;

export const PODIUM = { x: 70, y: 228, w: 192, h: 72 }; // level 1 control podium
export const LEVER_X = [98, 166, 234]; // level 1 lever slots: POLE, MOVE, RING
export const LEVER_Y = { top: 252, mid: 268, bottom: 284 }; // handle heights
export const TOWER = { x: 400, top: 30, base: 300 }; // level 1 launch tower
export const RING = { x: 400, y: 232, rx: 64, ry: 13 }; // level 1 gondola ring at rest
export const MAG_BELOW = { x: 400, face: 262, w: 30, h: 70 };
export const MAG_ABOVE = { x: 400, face: 176, w: 30, h: 70 };
export const SHIFT = 24; // px the magnet moves toward or away
export const RIG_X = [200, 350, 500]; // level 2 sign rigs (frame centres)
export const FRAME = { y0: 104, y1: 214, half: 48 };
export const SIGN = { half: 22, y: 159, h: 50 };
export const TRACK3 = { x0: 70, y0: 120, x1: 470, y1: 250, end: 600 };
export const BRAKE_ZONE = { x0: 210, x1: 390 };
export const BANK = { x: 250, y: 256, w: 100, h: 30 };
export const STOP_X = 560;
/** The top of the ring's flight, in scene pixels. */
export const RING_TOP = 60;

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (u: number) => clamp01(u) * clamp01(u) * (3 - 2 * clamp01(u));
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
const frac = (v: number) => v - Math.floor(v);
/** A repeatable wobble in −0.5 to 0.5 from a number. */
export const jit = (n: number) => frac(Math.sin(n * 12.9898) * 43758.5453) - 0.5;
export const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
const INK = '#1b1030';
const SKIN = '#f1c9a0';
const GREEN = PAL.green;
const RED = PAL.red;
export const glowColor = (c: Glow) => (c === 'green' ? GREEN : RED);

function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + k, y);
  g.arcTo(x + w, y, x + w, y + h, k);
  g.arcTo(x + w, y + h, x, y + h, k);
  g.arcTo(x, y + h, x, y, k);
  g.arcTo(x, y, x + w, y, k);
  g.closePath();
}
function fillRR(g: G, x: number, y: number, w: number, h: number, r: number, fill: string, edge?: string, ew = 1) {
  rr(g, x, y, w, h, r);
  g.fillStyle = fill;
  g.fill();
  if (edge) {
    g.strokeStyle = edge;
    g.lineWidth = ew;
    g.stroke();
  }
}
function dot(g: G, x: number, y: number, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}
function limb(g: G, pts: [number, number][], color: string, w: number) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
  g.lineCap = 'butt';
  g.lineJoin = 'miter';
}
function spiral(g: G, x: number, y: number, R: number, t: number) {
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.beginPath();
  for (let a = 0; a <= 9; a += 0.5) {
    const px = x + Math.cos(a + t * 6) * ((R * a) / 9);
    const py = y + Math.sin(a + t * 6) * ((R * a) / 9);
    if (a === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.stroke();
}
function vgrad(g: G, y0: number, y1: number, c0: string, c1: string) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  if (gr) {
    gr.addColorStop(0, c0);
    gr.addColorStop(1, c1);
    g.fillStyle = gr;
  } else g.fillStyle = c0;
  g.fillRect(0, y0, 640, y1 - y0);
}
/** A pill of dark glass behind a line of text, so the words stay readable over the scene. */
export function tag(g: G, s: string, x: number, y: number, align: 'left' | 'right' | 'center', color: string = PAL.yellow, size = 12) {
  const w = s.length * (size * 0.56) + 10;
  const x0 = align === 'left' ? x - 5 : align === 'right' ? x - w + 5 : x - w / 2;
  g.fillStyle = 'rgba(6,10,36,0.78)';
  g.fillRect(x0, y - size - 1, w, size + 6);
  text(g, s, x, y, color, size, align);
}
/** A drag handle's grip: a see-through disc with a yellow ring and arrows. The engine pulses its own ring around it. */
export function grip(g: G, x: number, y: number, r: number, dir: 'h' | 'v') {
  g.fillStyle = 'rgba(10,16,48,0.5)';
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.stroke();
  text(g, dir === 'v' ? '⇕' : '⇔', x, y + 5, PAL.white, 13);
}

// ---- the park and the tunnel -----------------------------------------------------------------------------------------------------------------------------

const SKY: [string, string][] = [['#3a2160', '#140c2c'], ['#141638', '#080a1c'], ['#0a0d1c', '#04050d']];

function ground(g: G) {
  g.fillStyle = '#1b1d2b';
  g.fillRect(0, 300, 640, 40);
  g.globalAlpha = 0.85;
  line(g, 0, 302, 640, 302, PAL.yellow, 2);
  g.globalAlpha = 1;
}
function ferris(g: G, t: number) {
  const cx = 120;
  const cy = 120;
  g.globalAlpha = 0.35;
  line(g, cx, cy, 85, 300, '#b9a8ff', 3);
  line(g, cx, cy, 155, 300, '#b9a8ff', 3);
  g.strokeStyle = '#b9a8ff';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(cx, cy, 70, 0, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < 12; i++) {
    const a = t * 0.08 + (i * Math.PI) / 6;
    line(g, cx, cy, cx + Math.cos(a) * 70, cy + Math.sin(a) * 70, '#b9a8ff', 1);
    dot(g, cx + Math.cos(a) * 70, cy + Math.sin(a) * 70, 2.6, i % 2 ? PAL.yellow : PAL.pink);
    g.globalAlpha = 0.35 * (0.3 + 0.7 * Math.max(0, Math.sin(t * 1.6 - i * 0.55)));
    dot(g, cx + Math.cos(a) * 70, cy + Math.sin(a) * 70, 5, '#fff3c0');
    g.globalAlpha = 0.35;
  }
  g.globalAlpha = 1;
}
function fireworkRing(g: G, t: number) {
  const n = Math.floor(t / 3);
  const u = (t % 3) / 3;
  if (u > 0.55) return;
  const cx = 230 + ((n * 173) % 340);
  const cy = 48 + ((n * 61) % 36);
  const R = 6 + 44 * easeOut(u / 0.55);
  g.globalAlpha = 0.4 * (1 - u / 0.55);
  const c = [PAL.pink, PAL.yellow, PAL.cyan][n % 3];
  for (let i = 0; i < 12; i++) dot(g, cx + Math.cos((i * Math.PI) / 6) * R, cy + Math.sin((i * Math.PI) / 6) * R, 2.5, c);
  g.globalAlpha = 1;
}
function rain(g: G, t: number) {
  g.strokeStyle = 'rgba(180,200,255,0.25)';
  g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i < 40; i++) {
    const x = (jit(i * 7 + 1) + 0.5) * 640;
    const y = ((jit(i * 7 + 2) + 0.5) * 340 + t * 300) % 340;
    g.moveTo(x, y);
    g.lineTo(x - 2, y + 9);
  }
  g.stroke();
}
function neonSign(g: G, t: number) {
  const dim = t % 3.3 < 0.09 ? 0.4 : 1;
  g.globalAlpha = dim;
  fillRR(g, 470, 14, 160, 20, 4, 'rgba(10,6,24,0.8)', PAL.pink, 2);
  glow(g, PAL.pink, 8, () => text(g, 'MAGNET PARK', 550, 29, PAL.pink, 14));
  g.globalAlpha = 1;
}
/** The park behind levels 1 and 3: a sky and the ground, different in each round (dusk, night, storm). */
export function park(g: G, t: number, k: number) {
  const kk = Math.min(2, k);
  vgrad(g, 0, 300, SKY[kk][0], SKY[kk][1]);
  if (kk > 0) {
    for (let i = 0; i < 28; i++) {
      g.globalAlpha = 0.25 + 0.3 * Math.max(0, Math.sin(t * 1.3 + i));
      g.fillStyle = '#dfe6ff';
      g.fillRect((jit(i * 3 + 1) + 0.5) * 640, (jit(i * 3 + 2) + 0.5) * 230, 1.5, 1.5);
    }
    g.globalAlpha = 1;
  }
  if (kk < 2) ferris(g, t);
  if (kk === 1) fireworkRing(g, t);
  ground(g);
  if (kk === 2) {
    rain(g, t);
    neonSign(g, t);
  }
}
const WALL = ['#141026', '#101a30', '#240f22'];
/** The inside of the Light Tunnel: a dark wall, a curved ceiling edge and a row of tiny star lights, tinted differently in each round. */
export function tunnel(g: G, t: number, k: number) {
  const kk = Math.min(2, k);
  g.fillStyle = WALL[kk];
  g.fillRect(0, 0, 640, 300);
  g.fillStyle = '#07050f';
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(640, 0);
  g.lineTo(640, 34);
  g.quadraticCurveTo(320, 86, 0, 34);
  g.closePath();
  g.fill();
  for (let i = 0; i < 24; i++) {
    const x = i * 27 + 14;
    const u = x / 640;
    g.globalAlpha = 0.45 + 0.5 * Math.max(0, Math.sin(t * 1.4 + i * 0.9));
    dot(g, x, 34 + 104 * u * (1 - u) + 6, 2, [PAL.yellow, PAL.cyan, PAL.pink][(i + kk) % 3]);
  }
  g.globalAlpha = 1;
  ground(g);
  g.strokeStyle = 'rgba(255,255,255,0.12)';
  g.lineWidth = 1;
  for (let x = 20; x < 640; x += 60) {
    g.beginPath();
    g.moveTo(x, 300);
    g.lineTo(x - 14, 340);
    g.stroke();
  }
}
/** The round 3 lightning, the only full-screen flash: alpha 0.25 for 0.1 s every 4.5 s, never under reduced motion. */
export function lightning(g: G, t: number) {
  if (calm() || t % 4.5 >= 0.1) return;
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.fillRect(0, 0, 640, 340);
}

// ---- Joon, the night-shift ride engineer -----------------------------------------------------------------------------------------------------------------

export type JoonMood = 'happy' | 'cheer' | 'worried' | 'frazzled';
/** `press`: seconds since Go (negative when no ride is running). `u`: seconds Joon has been in his mood. */
export interface JoonOpts { mood: JoonMood; press: number; u: number }

export function joon(g: G, t: number, o: JoonOpts) {
  const lift = (Math.sin(t * 2) + 1) / 2; // breathing: the chest rises up to 1 px
  const slump = o.mood === 'worried' ? 2 * ease(o.u / 0.3) : 0;
  const pressing = o.press >= 0 && o.press < 0.25;
  const lampOn = t % 6 < 0.2;
  const tap = t % 5 < 0.55;
  // boots and legs
  fillRR(g, 29, 294, 11, 6, 2, '#3a2a1c');
  fillRR(g, 42, 294, 11, 6, 2, '#3a2a1c');
  g.fillStyle = '#2c3350';
  g.fillRect(31, 266, 8, 29);
  g.fillRect(42, 266, 8, 29);
  g.save();
  g.translate(0, slump - lift);
  // shirt, hi-vis vest with two silver stripes, tool belt
  fillRR(g, 28, 232, 24, 38, 4, '#1f2a5a');
  fillRR(g, 28, 234, 24, 33, 3, '#ff8a1f');
  g.fillStyle = '#d7dde8';
  g.fillRect(28, 246, 24, 3);
  g.fillRect(28, 256, 24, 3);
  line(g, 40, 234, 40, 267, '#1f2a5a', 2);
  g.fillStyle = '#3b2a1a';
  g.fillRect(28, 265, 24, 5);
  g.fillStyle = PAL.yellow;
  g.fillRect(38, 266, 4, 3);
  fillRR(g, 31, 267, 4, 10, 1, PAL.yellow); // torch
  dot(g, 33, 278, 2, '#fff1a8');
  line(g, 47, 268, 49, 279, '#aab2c8', 2.5); // wrench
  dot(g, 49, 280, 2.5, '#aab2c8');
  // the radio on the shoulder, with its antenna and curly cord
  fillRR(g, 27, 235, 6, 11, 1.5, '#15151b');
  line(g, 29, 235, 28, 227, '#15151b', 1.5);
  dot(g, 30, 238, 1, PAL.red);
  g.strokeStyle = '#15151b';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(30, 246);
  for (let i = 1; i <= 12; i++) g.lineTo(30 + (i % 2 ? 3 : -1) + i * 0.4, 246 + i * 1.1);
  g.stroke();
  // neck and ear defenders
  g.fillStyle = SKIN;
  g.fillRect(36, 217, 8, 9);
  g.strokeStyle = '#3a3f52';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(29, 224);
  g.quadraticCurveTo(40, 242, 51, 224);
  g.stroke();
  fillRR(g, 26, 222, 6, 9, 3, '#ff8a1f', '#7a3d0a');
  fillRR(g, 48, 222, 6, 9, 3, '#ff8a1f', '#7a3d0a');
  // left arm: hanging, tapping the radio, or pumping a fist
  if (o.mood === 'cheer') {
    limb(g, [[30, 238], [18, 228], [17, 214]], '#1f2a5a', 6);
    dot(g, 17, 210, 4.2, SKIN);
  } else if (tap && o.mood === 'happy') {
    limb(g, [[30, 238], [23, 247], [29, 240]], '#1f2a5a', 6);
    dot(g, 29, 238, 3, SKIN);
  } else {
    limb(g, [[30, 238], [27, 256], [28, 266]], '#1f2a5a', 6);
    dot(g, 28, 268, 3, SKIN);
  }
  // right arm and the control pendant (a green GO button and a red mushroom E-STOP)
  limb(g, [[50, 238], [55, 252], [57, 247]], '#1f2a5a', 6);
  fillRR(g, 54, 234, 16, 24, 3, PAL.yellow, '#8a6a00');
  fillRR(g, 56, 236, 12, 4, 1, '#2a2a3a');
  if (pressing) glow(g, GREEN, 9, () => dot(g, 62, 244, 4.6, GREEN));
  else dot(g, 62, 244, 4.6, '#1f7a45');
  dot(g, 62, 253, 3.8, '#d62828');
  g.strokeStyle = '#5a0f0f';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(62, 253, 3.8, 0, Math.PI * 2);
  g.stroke();
  dot(g, 56, 248, 3, SKIN);
  dot(g, 60, 244 + (pressing ? 1 : 0), 2, SKIN);
  // the head: it tips back to look up at the ride every 7 s
  const up = t % 7 < 0.9 ? Math.sin((Math.PI * (t % 7)) / 0.9) : 0;
  const tilt = -0.07 * up + (o.mood === 'worried' ? 0.1 * ease(o.u / 0.3) : 0) + (o.mood === 'frazzled' ? Math.sin(t * 28) * 0.03 : 0);
  g.save();
  g.translate(40, 218);
  g.rotate(tilt);
  g.translate(-40, -218);
  dot(g, 40, 204, 14, SKIN);
  g.fillStyle = '#15151b'; // short black hair at the back
  g.beginPath();
  g.ellipse(28, 206, 4, 7, 0, 0, Math.PI * 2);
  g.fill();
  dot(g, 28, 207, 2.4, '#d9a47a'); // ear
  dot(g, 51.5, 207, 2, '#e7b88f'); // nose, three-quarter view
  if (o.mood === 'frazzled') {
    spiral(g, 38.5, 205, 3.4, t);
    spiral(g, 47, 205, 3.4, t);
    g.strokeStyle = INK;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(37, 214);
    for (let i = 1; i <= 6; i++) g.lineTo(37 + i * 2, 214 + (i % 2 ? -1.6 : 1.2));
    g.stroke();
    g.fillStyle = '#15151b';
    for (let i = 0; i < 4; i++) g.fillRect(30 + i * 7, 193 - (i % 2) * 3, 2.5, 8);
  } else {
    face(g, 43, 206, 10.5, o.mood === 'cheer' ? 'cheer' : o.mood === 'worried' ? 'worried' : 'happy', t);
    if (o.mood !== 'cheer' && t % 3 < 0.12) {
      g.fillStyle = SKIN;
      g.beginPath();
      g.ellipse(39, 205.5, 3, 2.6, 0, 0, Math.PI * 2);
      g.ellipse(47, 205.5, 3, 2.6, 0, 0, Math.PI * 2);
      g.fill();
      line(g, 36.5, 206, 41.5, 206, INK, 1.5);
      line(g, 44.5, 206, 49.5, 206, INK, 1.5);
    }
  }
  // the white hard hat with the magnet logo and the headlamp; knocked 20 degrees askew after a slam
  g.save();
  if (o.mood === 'frazzled') {
    g.translate(44, 197);
    g.rotate(0.35);
    g.translate(-40, -200);
  }
  g.fillStyle = '#f4f6ff';
  g.beginPath();
  g.arc(40, 200, 15, Math.PI, 0);
  g.closePath();
  g.fill();
  fillRR(g, 37, 186, 5, 14, 2, '#dfe4f4');
  fillRR(g, 23, 199, 38, 4, 2, '#dfe4f4', '#aab2c8');
  g.lineWidth = 3;
  g.strokeStyle = PAL.red;
  g.beginPath();
  g.arc(47, 192, 3.6, 0.5 * Math.PI, Math.PI);
  g.stroke();
  g.strokeStyle = '#3d7bff';
  g.beginPath();
  g.arc(47, 192, 3.6, 0, 0.5 * Math.PI);
  g.stroke();
  fillRR(g, 51, 192, 6, 5, 1, '#6b7385');
  dot(g, 57, 194.5, 1.9, lampOn ? '#fff1a8' : '#aab2c8');
  if (lampOn) {
    g.fillStyle = 'rgba(255,241,168,0.3)';
    g.beginPath();
    g.moveTo(58, 194);
    g.lineTo(90, 183);
    g.lineTo(90, 207);
    g.closePath();
    g.fill();
  }
  g.restore();
  g.restore(); // head
  g.restore(); // body
}

// ---- the riders ------------------------------------------------------------------------------------------------------------------------------------------

export type RiderState = 'idle' | 'cheer' | 'bounce' | 'worried' | 'slam';
/** (x, y) is the middle of the seat base. `u` is the seconds the rider has been in its state. */
export interface RidersOpts { x: number; y: number; gap?: number; state: RiderState; u: number }

export function riders(g: G, t: number, o: RidersOpts) {
  const gap = o.gap ?? 22;
  const by = o.y + (o.state === 'bounce' ? 4 * Math.sin(o.u * 14) * Math.max(0, 1 - o.u / 0.7) : 0);
  const slump = o.state === 'worried' ? 3 * ease(o.u / 0.3) : 0;
  const phase = t % 3;
  const turn = phase < 1 ? Math.sin(Math.PI * phase) : 0; // heads turn to each other every 3 s
  const cheer = o.state === 'cheer';
  const slam = o.state === 'slam';
  const mood = cheer ? 'cheer' : o.state === 'worried' ? 'worried' : 'happy';
  const sx = [o.x - gap / 2, o.x + gap / 2];
  for (let i = 0; i < 2; i++) {
    const swing = Math.sin(t * 3 + i * 1.7) * 2.5;
    line(g, sx[i] - 4, by - 7, sx[i] - 4 + swing, by + 3, '#2c3350', 3);
    line(g, sx[i] + 4, by - 7, sx[i] + 4 - swing, by + 3, '#2c3350', 3);
    dot(g, sx[i] - 4 + swing, by + 4, 2.6, '#2a2a3a');
    dot(g, sx[i] + 4 - swing, by + 4, 2.6, '#2a2a3a');
    fillRR(g, sx[i] - 9, by - 26, 18, 26, 4, '#4a4f8a');
    fillRR(g, sx[i] - 6, by - 22, 12, 15, 3, i ? '#58b5a8' : '#e8b13a');
    if (cheer) {
      for (const d of [-1, 1]) {
        limb(g, [[sx[i] + d * 5, by - 19], [sx[i] + d * 11, by - 41]], i ? '#58b5a8' : '#e8b13a', 3.5);
        dot(g, sx[i] + d * 11, by - 43, 2.6, SKIN);
      }
    } else {
      for (const d of [-1, 1]) {
        limb(g, [[sx[i] + d * 6, by - 19], [sx[i] + d * 4, by - 10]], i ? '#58b5a8' : '#e8b13a', 3.5);
        dot(g, sx[i] + d * 4, by - 9, 2.4, SKIN);
      }
    }
  }
  fillRR(g, sx[0] - 9, by - 13, gap + 18, 3.5, 1.7, '#d0d6e8', '#7a82a0'); // the lap bar
  for (let i = 0; i < 2; i++) {
    const hx = sx[i] + (i ? -1 : 1) * turn * 1.6 + (slam ? Math.sin(o.u * 20) * 1.2 : 0);
    const hy = by - 31 + slump;
    dot(g, hx, hy, 8, i ? '#d9a47a' : SKIN);
    if (i) {
      dot(g, hx - 10, hy + 3, 3.3, '#5b3a24'); // pigtails
      dot(g, hx + 10, hy + 3, 3.3, '#5b3a24');
      dot(g, hx - 8.6, hy, 1.3, PAL.pink);
      dot(g, hx + 8.6, hy, 1.3, PAL.pink);
      g.fillStyle = '#5b3a24';
      g.beginPath();
      g.arc(hx, hy - 1, 8.2, Math.PI * 1.05, Math.PI * 1.95);
      g.fill();
    }
    if (slam) {
      spiral(g, hx - 2.8, hy, 2.6, t);
      spiral(g, hx + 2.8, hy, 2.6, t);
    } else {
      face(g, hx, hy + 1, 6.5, mood, t);
      if (i) {
        g.strokeStyle = INK; // round glasses
        g.lineWidth = 1;
        g.beginPath();
        g.arc(hx - 2.7, hy, 3, 0, Math.PI * 2);
        g.moveTo(hx + 5.7, hy);
        g.arc(hx + 2.7, hy, 3, 0, Math.PI * 2);
        g.stroke();
        line(g, hx - 0.3, hy, hx + 0.3, hy, INK, 1);
      }
    }
    if (!i && !slam) {
      g.fillStyle = '#d62828'; // a red cap worn backwards: the brim sticks out behind
      g.beginPath();
      g.arc(hx, hy - 1.5, 8.4, Math.PI, 0);
      g.closePath();
      g.fill();
      fillRR(g, hx - 13, hy - 3.6, 7, 3, 1.4, '#a01c1c');
      g.fillStyle = '#f4f6ff';
      g.fillRect(hx - 2, hy - 9.6, 4, 2);
    }
  }
  if (slam) {
    // both hats fly off in an arc: the cap and the glasses
    const u = Math.min(o.u, 1.3);
    const cx = sx[0] - 30 * u;
    const cy = by - 36 - 95 * u + 150 * u * u;
    g.save();
    g.translate(cx, cy);
    g.rotate(-u * 5);
    g.fillStyle = '#d62828';
    g.beginPath();
    g.arc(0, 0, 8, Math.PI, 0);
    g.closePath();
    g.fill();
    fillRR(g, -13, -2, 7, 3, 1.4, '#a01c1c');
    g.restore();
    const gx = sx[1] + 34 * u;
    const gy = by - 36 - 75 * u + 150 * u * u;
    g.strokeStyle = INK;
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(gx - 4, gy, 3.4, 0, Math.PI * 2);
    g.moveTo(gx + 7.4, gy);
    g.arc(gx + 4, gy, 3.4, 0, Math.PI * 2);
    g.stroke();
  }
}

// ---- cue board, cue cards, ticket ------------------------------------------------------------------------------------------------------------------------

/** The black LED board of level 1: two lines of 13 px bold text. */
export function cueBoard(g: G, o: { l1: string; c1: string; l2: string; c2: string }) {
  line(g, 545, 164, 545, 300, '#3a3f56', 6);
  fillRR(g, 520, 292, 50, 8, 2, '#3a3f56');
  fillRR(g, 470, 120, 150, 44, 5, '#05060d', '#5a6480', 2);
  text(g, o.l1, 545, 139, o.c1, 13);
  text(g, o.l2, 545, 157, o.c2, 13);
}
/** A cue card above a level 2 rig: the colour the show wants, its number, and a ✓ or ✗ once the sign has flashed. */
export function cueCard(g: G, c: number, n: number, want: Glow, mark: '' | '✓' | '✗') {
  fillRR(g, c - 46, 69, 92, 26, 4, '#05060d', '#5a6480', 2);
  text(g, n === 0 ? '1' : n === 1 ? '2' : '3', c - 40, 80, PAL.dim, 11, 'left');
  text(g, want === 'green' ? 'GREEN ↺' : 'RED ↻', c - 4, 87, glowColor(want), 13);
  if (mark) text(g, mark, c + 36, 88, mark === '✓' ? GREEN : RED, 14);
}
/** The ride ticket that drops in at the start of each round. `u` is the seconds since the round began. */
export function ticket(g: G, u: number, label: string) {
  if (u < 0 || u > 0.8) return;
  const y = u < 0.2 ? -40 + 118 * easeOut(u / 0.2) : u > 0.6 ? 78 - 118 * ease((u - 0.6) / 0.2) : 78;
  g.save();
  g.translate(320, y);
  g.rotate(-0.04);
  fillRR(g, -42, -19, 84, 38, 3, '#f6ecd0', '#b99a5a');
  line(g, 24, -19, 24, 19, '#b99a5a', 1, [3, 3]);
  text(g, 'MAGNET PARK', -9, -5, '#6b4a1a', 11);
  text(g, label, -9, 13, '#2a1c10', 13);
  g.restore();
}

// ---- level 1: the Ring Rocket ----------------------------------------------------------------------------------------------------------------------------

/** The launch tower with its blinking lamp and the sprung seat under the ring. `squash` is how far the ring has pressed the springs down, in px. */
export function tower(g: G, t: number, squash: number) {
  const x = TOWER.x;
  fillRR(g, x - 8, TOWER.top, 16, TOWER.base - TOWER.top, 2, '#4c5675');
  line(g, x - 4, TOWER.top, x - 4, TOWER.base, '#8591b3', 1);
  line(g, x + 4, TOWER.top, x + 4, TOWER.base, '#8591b3', 1);
  dot(g, x, 24, 4.5, t % 1 < 0.5 ? '#ff4a4a' : '#5a1a1a');
  fillRR(g, x - 15, 250, 30, 5, 2, '#7a86a8');
  for (const d of [-9, 9]) {
    g.strokeStyle = '#c9d2e3';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(x + d, 250);
    const top = 238 + squash;
    for (let i = 1; i <= 5; i++) g.lineTo(x + d + (i % 2 ? 4 : -4), 250 - ((250 - top) * i) / 5);
    g.stroke();
  }
}

export interface RingOpts { y: number; lit: Glow | null; litA: number; split: boolean }
const LAMP_A = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4 + 0.2);
const GAP_A = Math.PI / 3;
function lamp(g: G, i: number, o: RingOpts) {
  const a = LAMP_A[i];
  const want: Glow = i % 2 ? 'red' : 'green';
  const lx = RING.x + RING.rx * Math.cos(a);
  const ly = o.y + RING.ry * Math.sin(a);
  const on = o.lit === want && o.litA > 0;
  if (on) {
    g.globalAlpha = o.litA;
    glow(g, glowColor(want), 6, () => dot(g, lx, ly, 3.8, glowColor(want)));
    g.globalAlpha = 1;
  } else dot(g, lx, ly, 3.4, '#3a3f52');
  const s = Math.sin(a);
  const c = Math.cos(a);
  const gl = want === 'green' ? '↺' : '↻';
  if (s > 0.7) text(g, gl, lx, ly + 14, on ? glowColor(want) : PAL.dim, 11);
  else if (s < -0.3) text(g, gl, lx, ly - 7, on ? glowColor(want) : PAL.dim, 11);
  else text(g, gl, lx + (c > 0 ? 9 : -9), ly + 4, on ? glowColor(want) : PAL.dim, 11);
}
function seat(g: G, a: number, y: number) {
  fillRR(g, RING.x + (RING.rx - 7) * Math.cos(a) - 8, y + (RING.ry - 2) * Math.sin(a) - 4, 16, 8, 3, '#4a4f8a');
}
/** The ring seen from the side: its back half, drawn behind the tower, and its front half, drawn after the riders. */
export function ringBack(g: G, o: RingOpts) {
  seat(g, (250 * Math.PI) / 180, o.y);
  seat(g, (290 * Math.PI) / 180, o.y);
  g.strokeStyle = '#c9d2e3';
  g.lineWidth = 7;
  g.beginPath();
  g.ellipse(RING.x, o.y, RING.rx, RING.ry, 0, Math.PI, Math.PI * 2);
  g.stroke();
  g.strokeStyle = '#7d879f';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(RING.x, o.y + 1, RING.rx - 3, RING.ry - 3, 0, Math.PI, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < 8; i++) if (Math.sin(LAMP_A[i]) < 0) lamp(g, i, o);
}
export function ringFront(g: G, o: RingOpts) {
  const arcs: [number, number][] = o.split ? [[0, GAP_A - 0.06], [GAP_A + 0.06, Math.PI]] : [[0, Math.PI]];
  for (const [a0, a1] of arcs) {
    g.strokeStyle = '#c9d2e3';
    g.lineWidth = 7;
    g.beginPath();
    g.ellipse(RING.x, o.y, RING.rx, RING.ry, 0, a0, a1);
    g.stroke();
    g.strokeStyle = '#7d879f';
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(RING.x, o.y - 1, RING.rx - 3, RING.ry - 3, 0, a0, a1);
    g.stroke();
  }
  if (o.split) {
    for (const d of [-0.06, 0.06]) {
      const jx = RING.x + RING.rx * Math.cos(GAP_A + d);
      const jy = o.y + RING.ry * Math.sin(GAP_A + d);
      fillRR(g, jx - 2.5, jy - 5, 5, 10, 1, '#4c5675', '#c9d2e3');
    }
    text(g, 'split', RING.x + RING.rx * Math.cos(GAP_A) + 4, o.y + RING.ry * Math.sin(GAP_A) + 24, PAL.dim, 11);
  }
  for (let i = 0; i < 8; i++) if (Math.sin(LAMP_A[i]) >= 0) lamp(g, i, o);
}
/** The tiny + − across a split ring's gap: an emf with nowhere to go. */
export function gapEmf(g: G, y: number) {
  const x = RING.x + RING.rx * Math.cos(GAP_A);
  const gy = y + RING.ry * Math.sin(GAP_A);
  text(g, '+', x - 5, gy - 6, PAL.dim, 11);
  text(g, '−', x + 7, gy - 6, PAL.dim, 11);
}

/** The bar magnet: 30 × 70, the half facing the ring painted with the player's pole. `below` magnets stand in a pit, `above` ones hang from the crane. */
export function magnet(g: G, below: boolean, faceY: number, pole: number) {
  const x = MAG_BELOW.x - MAG_BELOW.w / 2;
  const near = pole ? PAL.red : '#3d7bff';
  const far = pole ? '#3d7bff' : PAL.red;
  const top = below ? faceY : faceY - MAG_BELOW.h;
  const half = MAG_BELOW.h / 2;
  const nearY = below ? top : top + half;
  const farY = below ? top + half : top;
  fillRR(g, x, farY, MAG_BELOW.w, half, 2, far, '#e6e9f5');
  fillRR(g, x, nearY, MAG_BELOW.w, half, 2, near, '#e6e9f5');
  text(g, pole ? 'N' : 'S', MAG_BELOW.x, nearY + half / 2 + 5, PAL.white, 13);
  text(g, pole ? 'S' : 'N', MAG_BELOW.x, farY + half / 2 + 5, PAL.white, 13);
}
/** The pit and hydraulic piston under the magnet (rounds 1 and 2). */
export function pit(g: G, faceY: number) {
  g.fillStyle = '#05060d';
  g.fillRect(366, 298, 68, 42);
  fillRR(g, 392, faceY + 60, 16, 90, 2, '#7a86a8');
  g.strokeStyle = '#9aa3b8';
  g.lineWidth = 2;
  g.strokeRect(366, 298, 68, 42);
}
/** The yellow crane arm that reaches in from the right, with the chain that holds the magnet (round 3). */
export function crane(g: G, topY: number) {
  fillRR(g, 628, 62, 12, 238, 2, '#c99b1a', '#7a5a00');
  line(g, 634, 300, 634, 62, '#7a5a00', 1);
  line(g, 640, 70, 400, 90, '#e8b82a', 7);
  line(g, 640, 76, 520, 120, '#c99b1a', 3);
  dot(g, 400, 90, 5, '#7a5a00');
  const end = Math.max(topY, 96);
  for (let y = 92; y < end; y += 5) line(g, 400, y, 400, y + 3, '#c9d2e3', 2);
}
/** Five faint field lines through the ring. Arrows point away from an N face and toward an S face. */
export function fieldLines(g: G, below: boolean, faceY: number, pole: number) {
  const d = below ? -1 : 1;
  const flow = pole ? d : -d;
  for (let i = -2; i <= 2; i++) {
    g.globalAlpha = 0.3;
    line(g, 400 + i * 9, faceY + d * 3, 400 + i * 9 + i * 5, faceY + d * 74, PAL.cyan, 1.5, [4, 4]);
    const ax = 400 + i * 9 + i * 2.5;
    const ay = faceY + d * 38;
    g.fillStyle = PAL.cyan;
    g.beginPath();
    g.moveTo(ax, ay + flow * 4);
    g.lineTo(ax - 3, ay - flow * 3);
    g.lineTo(ax + 3, ay - flow * 3);
    g.closePath();
    g.fill();
    g.globalAlpha = 1;
  }
}
/** The arrow beside the magnet for the player's move (the piston arrow): toward, away or a hold square. */
export function moveArrow(g: G, below: boolean, midY: number, move: number) {
  const x = 360;
  if (move === 0) {
    g.fillStyle = PAL.yellow;
    g.fillRect(x - 4, midY - 4, 8, 8);
    return;
  }
  const up = (move === 1) === below;
  const d = up ? -1 : 1;
  line(g, x, midY - d * 10, x, midY + d * 10, PAL.yellow, 3);
  g.fillStyle = PAL.yellow;
  g.beginPath();
  g.moveTo(x, midY + d * 17);
  g.lineTo(x - 6, midY + d * 8);
  g.lineTo(x + 6, midY + d * 8);
  g.closePath();
  g.fill();
}

/** The control podium with its three levers' slots, labels, end marks, the player's settings under it and the flux meter LCD on top. */
export function podium(g: G, v: { pole: number; move: number; ring: number }, lcd: { s: string; color: string }) {
  fillRR(g, PODIUM.x, PODIUM.y, PODIUM.w, PODIUM.h, 6, '#3a3f56', '#6a7390', 2);
  fillRR(g, PODIUM.x + 6, PODIUM.y + 6, PODIUM.w - 12, PODIUM.h - 12, 4, '#2a2e44');
  const names = ['POLE', 'MOVE', 'RING'];
  for (let i = 0; i < 3; i++) {
    const x = LEVER_X[i];
    fillRR(g, x - 3, LEVER_Y.top, 6, LEVER_Y.bottom - LEVER_Y.top, 3, '#0e1020');
    text(g, names[i], x, 240, PAL.dim, 11);
  }
  const mx = (i: number) => LEVER_X[i] + 24;
  text(g, 'N', mx(0), LEVER_Y.top + 4, PAL.dim, 11);
  text(g, 'S', mx(0), LEVER_Y.bottom + 4, PAL.dim, 11);
  text(g, '▲', mx(1), LEVER_Y.top + 4, PAL.dim, 11);
  text(g, '■', mx(1), LEVER_Y.mid + 4, PAL.dim, 11);
  text(g, '▼', mx(1), LEVER_Y.bottom + 4, PAL.dim, 11);
  text(g, '●', mx(2), LEVER_Y.top + 4, PAL.dim, 11);
  text(g, '◌', mx(2), LEVER_Y.bottom + 4, PAL.dim, 11);
  const set = [v.pole ? 'N' : 'S', v.move > 0 ? 'TOWARD' : v.move < 0 ? 'AWAY' : 'HOLD', v.ring ? 'CLOSED' : 'SPLIT'];
  for (let i = 0; i < 3; i++) text(g, set[i], LEVER_X[i], 318, PAL.yellow, 13);
  text(g, 'FLUX METER', 78, 191, PAL.dim, 11, 'left');
  fillRR(g, 78, 196, 120, 16, 3, '#05060d', '#5a6480');
  text(g, lcd.s, 138, 208, lcd.color, 11);
}
// ---- level 2: the Light Tunnel ---------------------------------------------------------------------------------------------------------------------------

export const EV_LABEL: Record<Ev, string> = { enter: 'drives in →', leave: 'drives out →', squeeze: 'squeezed flat', stretch: 'springs open', rise: 'field on ▲', fade: 'field fades ▼' };

/** One electromagnet's field frame: a steel border and a 4 × 4 grid of ⊗ (into the page) or ⊙ (out of the page). */
export function fieldFrame(g: G, c: number, into: boolean, alpha: number) {
  fillRR(g, c - FRAME.half, FRAME.y0, FRAME.half * 2, FRAME.y1 - FRAME.y0, 3, 'rgba(10,14,40,0.6)', '#5a6480', 3);
  g.globalAlpha = clamp01(alpha);
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const x = c - 36 + 24 * i;
      const y = FRAME.y0 + 14 + 27.3 * j;
      g.beginPath();
      g.arc(x, y, 6, 0, Math.PI * 2);
      g.stroke();
      if (into) {
        g.beginPath();
        g.moveTo(x - 3.6, y - 3.6);
        g.lineTo(x + 3.6, y + 3.6);
        g.moveTo(x + 3.6, y - 3.6);
        g.lineTo(x - 3.6, y + 3.6);
        g.stroke();
      } else dot(g, x, y, 2, PAL.cyan);
    }
  }
  g.globalAlpha = 1;
}
/** The loop sign: a rounded loop of wire with a green ↺ lamp and a red ↻ lamp on its top edge. `round` morphs a flat strip into a circle. */
export function loopSign(g: G, o: { x: number; w: number; h: number; round: number; lit: Glow | null; litA: number }) {
  const y = SIGN.y;
  const rad = 3 + (Math.min(o.w, o.h) / 2 - 3) * o.round;
  rr(g, o.x - o.w / 2, y - o.h / 2, o.w, o.h, rad);
  g.fillStyle = 'rgba(217,164,65,0.1)';
  g.fill();
  g.strokeStyle = '#d9a441';
  g.lineWidth = 3;
  g.stroke();
  const top = y - o.h / 2;
  for (const want of ['green', 'red'] as Glow[]) {
    const lx = o.x + (want === 'green' ? -12 : 12);
    const on = o.lit === want && o.litA > 0;
    fillRR(g, lx - 7, top - 19, 14, 13, 3, 'rgba(6,10,36,0.8)');
    text(g, want === 'green' ? '↺' : '↻', lx, top - 9, on ? glowColor(want) : PAL.dim, 11);
    if (on) {
      g.globalAlpha = o.litA;
      glow(g, glowColor(want), 10, () => dot(g, lx, top - 1, 4.2, glowColor(want)));
      g.globalAlpha = 1;
    } else dot(g, lx, top - 1, 3.6, '#3a3f52');
  }
}
/** Two grey rollers closing on a sign from above and below (`p` 0 open, 1 closed on the flat strip). */
export function rollers(g: G, x: number, p: number) {
  const dy = 40 - 36.5 * p;
  for (const d of [-1, 1]) {
    fillRR(g, x - 30, SIGN.y + d * dy - 4, 60, 8, 4, '#8a93aa', '#4c5675');
    dot(g, x - 24, SIGN.y + d * dy, 2, '#4c5675');
    dot(g, x + 24, SIGN.y + d * dy, 2, '#4c5675');
  }
}
/** The slot of a level 2 switch, with an ⊗ icon at the top and an ⊙ icon at the bottom, and the player's setting beside it. */
export function switchSlot(g: G, c: number, into: boolean) {
  fillRR(g, c - 4, 258, 8, 38, 4, '#0e1020', '#3a3f56');
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(c - 32, 262, 5, 0, Math.PI * 2);
  g.moveTo(c - 35, 259);
  g.lineTo(c - 29, 265);
  g.moveTo(c - 29, 259);
  g.lineTo(c - 35, 265);
  g.stroke();
  g.beginPath();
  g.arc(c - 32, 292, 5, 0, Math.PI * 2);
  g.stroke();
  dot(g, c - 32, 292, 1.6, PAL.cyan);
  text(g, into ? '⊗ in' : '⊙ out', c + 24, 286, PAL.yellow, 13, 'left');
}
/** A little black LCD line under a rig (the helper). */
export function lcdLine(g: G, c: number, s: string, color: string) {
  fillRR(g, c - 44, 232, 88, 14, 3, '#05060d', '#3a3f56');
  text(g, s, c, 243, color, 11);
}
/** The small parked ride car where the riders watch the show (level 2). */
export function parkedCar(g: G) {
  fillRR(g, 72, 281, 48, 18, 4, PAL.pink, '#a0285a');
  fillRR(g, 72, 288, 48, 3, 1, PAL.white);
  dot(g, 82, 301, 4, '#2a2a3a');
  dot(g, 110, 301, 4, '#2a2a3a');
  line(g, 60, 305, 134, 305, '#9aa3b8', 3);
}

// ---- level 3: the Brake Run ------------------------------------------------------------------------------------------------------------------------------

const SLOPE = Math.atan2(TRACK3.y1 - TRACK3.y0, TRACK3.x1 - TRACK3.x0);
/** The rail's height above the ground at scene x. */
export const railY = (x: number) => (x <= TRACK3.x0 ? TRACK3.y0 : x >= TRACK3.x1 ? TRACK3.y1 : TRACK3.y0 + ((x - TRACK3.x0) * (TRACK3.y1 - TRACK3.y0)) / (TRACK3.x1 - TRACK3.x0));
/** The car's pose for a position s along the run: 0 the top, 1 the STOP line, 1.18 the buffer. */
export function carPose(s: number): { x: number; y: number; a: number } {
  const x = s <= 1 ? 86 + 446 * s : 532 + ((s - 1) / 0.18) * 37;
  return { x, y: railY(x), a: SLOPE * (1 - ease((x - 440) / 60)) };
}
export function track3(g: G) {
  for (let x = 70; x <= 470; x += 80) {
    line(g, x, railY(x) + 4, x, 300, '#3c4263', 2);
    if (x < 470) line(g, x, railY(x) + 4, x + 80, 300, '#3c4263', 1);
  }
  fillRR(g, TRACK3.x1, 252, TRACK3.end - TRACK3.x1, 14, 2, '#3c4263', '#6a7390');
  for (let x = 480; x <= 600; x += 40) line(g, x, 266, x, 300, '#3c4263', 2);
  g.globalAlpha = 0.6;
  line(g, TRACK3.x0, TRACK3.y0 - 4, TRACK3.x1, TRACK3.y1 - 4, '#9aa3b8', 2);
  line(g, TRACK3.x1, TRACK3.y1 - 4, TRACK3.end, TRACK3.y1 - 4, '#9aa3b8', 2);
  g.globalAlpha = 1;
  line(g, TRACK3.x0, TRACK3.y0, TRACK3.x1, TRACK3.y1, '#9aa3b8', 3);
  line(g, TRACK3.x1, TRACK3.y1, TRACK3.end, TRACK3.y1, '#9aa3b8', 3);
  // the STOP line on the platform
  line(g, STOP_X, 218, STOP_X, 250, PAL.yellow, 2, [4, 3]);
  fillRR(g, STOP_X - 1.5, 244, 3, 9, 1, PAL.yellow);
  text(g, 'STOP', STOP_X, 212, PAL.yellow, 11);
}
/** Magnet blocks above and below the rails along the brake zone, alternating red and blue (drawn behind the car). */
export function brakeZone(g: G) {
  for (let x = BRAKE_ZONE.x0; x <= BRAKE_ZONE.x1; x += 18) {
    const c = ((x - BRAKE_ZONE.x0) / 18) % 2 ? '#3d7bff' : PAL.red;
    g.save();
    g.translate(x, railY(x));
    g.rotate(SLOPE);
    fillRR(g, -7, -36, 14, 10, 2, c, '#e6e9f5');
    fillRR(g, -7, 8, 14, 10, 2, c === PAL.red ? '#3d7bff' : PAL.red, '#e6e9f5');
    g.restore();
  }
}
/** The buffer at the end of the flat, with its spring in front: `squash` 0..1 compresses the spring. */
export function buffer(g: G, squash: number) {
  const x = TRACK3.end;
  fillRR(g, x, 228, 20, 22, 2, '#f4f6ff', '#9aa3b8');
  g.fillStyle = '#d62828';
  for (let i = 0; i < 4; i++) g.fillRect(x + 1, 229 + i * 6, 18, 3);
  const len = 12 - 8 * clamp01(squash);
  g.strokeStyle = '#c9d2e3';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x, 239);
  for (let i = 1; i <= 5; i++) g.lineTo(x - (len * i) / 5, 239 + (i % 2 ? -7 : 7));
  g.stroke();
}
/** The brake bank cabinet: cooling fins, two cables to the rails, an LCD, and an orange glow while the car is in the brake zone (a fixed alpha 0.6). */
export function bank(g: G, heat: boolean, lcd: { s: string; color: string }) {
  for (const [rx, bx] of [[232, 262], [368, 338]]) {
    g.strokeStyle = '#15151b';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(rx, railY(rx) + 8);
    g.quadraticCurveTo(rx, BANK.y - 6, bx, BANK.y);
    g.stroke();
  }
  if (heat) {
    g.fillStyle = 'rgba(255,140,40,0.6)';
    glow(g, 'rgba(255,140,40,0.6)', 16, () => {
      rr(g, BANK.x - 4, BANK.y - 4, BANK.w + 8, BANK.h + 8, 6);
      g.fill();
    });
  }
  g.fillStyle = '#6a7390';
  for (let i = 0; i < 9; i++) g.fillRect(BANK.x + 6 + i * 10.5, BANK.y - 6, 6, 6);
  fillRR(g, BANK.x, BANK.y, BANK.w, BANK.h, 4, '#4a5168', '#9aa3b8', 2);
  fillRR(g, 258, 266, 84, 16, 3, '#05060d', '#3a3f56');
  text(g, lcd.s, 300, 278, lcd.color, 11);
}
/** The coaster car in local coordinates: origin on the rail. Riders sit in it (call `riders` inside the same transform). */
export function car(g: G, headlight: boolean) {
  fillRR(g, -28, -26, 56, 24, 6, PAL.pink, '#a0285a');
  g.fillStyle = PAL.white;
  g.fillRect(-28, -16, 56, 3);
  dot(g, 28, -14, 3.4, headlight ? '#fff1a8' : '#e6d98a');
  dot(g, -16, -2, 4.2, '#2a2a3a');
  dot(g, 16, -2, 4.2, '#2a2a3a');
  dot(g, -16, -2, 1.6, '#9aa3b8');
  dot(g, 16, -2, 1.6, '#9aa3b8');
  fillRR(g, -3, 1, 6, 6, 1, '#b87333', '#7a4a1a'); // the copper bar, seen end-on
}
