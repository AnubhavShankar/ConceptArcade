// Drawing for Splash Patrol: the water park, the decorative tube slide, the numbered joints, the blueprint sign, Marlo the lifeguard, Sir Quacks the
// test duck, the repair crew, the fault effects and the zoom magnifier. The slide is one fixed S-curve, the same every round and never the graph of f:
// the only place the true shape of f appears is zoomLens.
import { PAL } from '@core/arcade';
import { disc } from '@core/draw';
import { face } from '@core/mathkit';
import { line, text } from '@core/neon';
import { RUN, jointTime, type Fault, type Flag, type Level, type Round, type Zoom } from './logic';

export type G = CanvasRenderingContext2D;

// ---- The slide path (a cubic Bezier, sampled by arc length) -------------------------------------------------------------------------------------------

const P: [number, number][] = [[90, 70], [230, 90], [300, 260], [470, 280]];
const bez = (t: number): [number, number] => {
  const a = (1 - t) ** 3;
  const b = 3 * (1 - t) ** 2 * t;
  const c = 3 * (1 - t) * t * t;
  const d = t ** 3;
  return [a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0], a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]];
};
const STEPS = 200;
const TABLE: { x: number; y: number; s: number }[] = [];
for (let i = 0; i <= STEPS; i++) {
  const [x, y] = bez(i / STEPS);
  const prev = TABLE[i - 1];
  TABLE.push({ x, y, s: prev ? prev.s + Math.hypot(x - prev.x, y - prev.y) : 0 });
}
const TOTAL = TABLE[STEPS].s;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** The point a fraction u of the way along the slide, by length. */
export function slideAt(u: number): [number, number] {
  const target = clamp01(u) * TOTAL;
  let i = 1;
  while (i < STEPS && TABLE[i].s < target) i++;
  const a = TABLE[i - 1];
  const b = TABLE[i];
  const k = b.s === a.s ? 0 : (target - a.s) / (b.s - a.s);
  return [a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k];
}
/** The direction of the slide at u, in radians (0 = to the right, positive = downhill). */
export function slideAng(u: number): number {
  const a = slideAt(clamp01(u) - 0.01);
  const b = slideAt(clamp01(u) + 0.01);
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}
/** Where joint i of n sits: evenly spaced along the slide, whatever the function is. */
export const jointU = (i: number, n: number) => (i + 1) / (n + 1);
export const jointPoint = (i: number, n: number): [number, number] => slideAt(jointU(i, n));

export const POOL = { x0: 470, x1: 630, y0: 270, y1: 330 };
export const GROUND = 300;
export const MARLO = { x: 52, y: 96 };
export const ZOOM = { cx: 505, cy: 172, R: 46, left: '#ffb347', right: '#7dffb3' };
export const SIGN = { x: 380, y: 8, w: 250, h: 76 };
export const EXIT: [number, number] = [548, 299];

// ---- Small helpers -------------------------------------------------------------------------------------------------------------------------------------

const ell = (g: G, x: number, y: number, rx: number, ry: number, fill: string, rot = 0) => {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
};
const rect = (g: G, x: number, y: number, w: number, h: number, fill: string) => {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
};
const rrect = (g: G, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, stroke?: string) => {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = 1.5;
    g.stroke();
  }
};
const poly = (g: G, pts: [number, number][], fill: string) => {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fillStyle = fill;
  g.fill();
};
const normalAt = (u: number): [number, number] => {
  const a = slideAng(u);
  return [Math.sin(a), -Math.cos(a)];
};
const grad = (g: G, x0: number, y0: number, x1: number, y1: number, stops: [number, string][], fallback: string) => {
  const gr = g.createLinearGradient?.(x0, y0, x1, y1);
  if (!gr) return fallback;
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
};

// ---- The park --------------------------------------------------------------------------------------------------------------------------------------------

function palm(g: G, x: number, y: number, topX: number, topY: number, t: number) {
  g.strokeStyle = '#0a2a3a';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + (topX - x) * 0.2, (y + topY) / 2, topX, topY);
  g.stroke();
  const sway = Math.sin(t * 0.8 + x) * 3;
  g.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI + (i * Math.PI) / 5;
    const ex = topX + Math.cos(a) * 34 + sway;
    const ey = topY + Math.sin(a) * 16 + 14;
    g.beginPath();
    g.moveTo(topX, topY);
    g.quadraticCurveTo(topX + Math.cos(a) * 20, topY + Math.sin(a) * 26 - 6, ex, ey);
    g.stroke();
  }
}

/** The water park at dusk: a teal sky over the arcade screen, a sun glow, palms, the deck, the sand and the splash pool with ripples. */
export function scenery(g: G, t: number) {
  g.fillStyle = grad(g, 0, 0, 0, 340, [[0, 'rgba(20,120,130,0.55)'], [0.6, 'rgba(20,90,110,0.25)'], [1, 'rgba(11,16,48,0)']], 'rgba(20,110,120,0.3)');
  g.fillRect(0, 0, 640, 340);
  ell(g, 300, 62, 28, 28, 'rgba(255,170,90,0.2)');
  ell(g, 300, 62, 17, 17, 'rgba(255,200,120,0.28)');
  palm(g, 20, 336, 34, 196, t);
  palm(g, 614, 276, 600, 180, t + 2);
  rect(g, 0, GROUND + 4, 470, 40, 'rgba(60,70,110,0.55)');
  rect(g, 0, GROUND + 4, 470, 3, 'rgba(244,246,255,0.18)');
  // the pool
  rrect(g, POOL.x0, POOL.y0, POOL.x1 - POOL.x0, POOL.y1 - POOL.y0, 12, grad(g, 0, POOL.y0, 0, POOL.y1, [[0, '#1b79b0'], [1, '#0c3566']], '#1b79b0'), PAL.cyan);
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.5 + i / 3) % 1;
    g.strokeStyle = `rgba(200,240,255,${0.45 * (1 - k)})`;
    g.lineWidth = 1.5;
    g.beginPath();
    g.ellipse(560 + Math.sin(i * 2.1) * 30, 304 + Math.cos(i * 1.7) * 8, 8 + k * 30, 3 + k * 7, 0, 0, Math.PI * 2);
    g.stroke();
  }
  text(g, 'SPLASH POOL', 550, 324, 'rgba(200,240,255,0.7)', 11);
  // the top deck
  rect(g, 24, 100, 98, 6, '#7d8bd1');
  rect(g, 24, 100, 98, 2, PAL.white);
  for (const x of [28, 60, 92, 118]) line(g, x, 100, x, 76, '#aab4ee', 2);
  line(g, 28, 78, 118, 78, '#aab4ee', 2);
  line(g, 40, 106, 40, GROUND + 4, 'rgba(125,139,209,0.7)', 5);
  line(g, 108, 106, 108, GROUND + 4, 'rgba(125,139,209,0.7)', 5);
}

/** Fixed supports under the slide (decorative: the same in every round). */
export function pillars(g: G) {
  for (const u of [0.12, 0.33, 0.55, 0.77]) {
    const [x, y] = slideAt(u);
    line(g, x, y + 12, x, GROUND + 4, 'rgba(125,139,209,0.55)', 5);
    line(g, x - 6, GROUND + 4, x + 6, GROUND + 4, 'rgba(170,180,238,0.7)', 4);
  }
}

export const TUBE_FILL = 'rgba(77,225,255,0.25)';
const SAMPLES = 90;
/** The tube: a thick translucent blue band, two cyan edges and ribs every 16 px. The same picture for every blueprint. */
export function tube(g: G) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= SAMPLES; i++) pts.push(slideAt(i / SAMPLES));
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = TUBE_FILL;
  g.lineWidth = 28;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
  g.lineCap = 'butt';
  for (const side of [-1, 1]) {
    g.strokeStyle = PAL.cyan;
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i <= SAMPLES; i++) {
      const [nx, ny] = normalAt(i / SAMPLES);
      const [x, y] = pts[i];
      if (i) g.lineTo(x + nx * 14 * side, y + ny * 14 * side);
      else g.moveTo(x + nx * 14 * side, y + ny * 14 * side);
    }
    g.stroke();
  }
  for (let s = 8; s < TOTAL; s += 16) {
    const u = s / TOTAL;
    const [x, y] = slideAt(u);
    const [nx, ny] = normalAt(u);
    line(g, x - nx * 14, y - ny * 14, x + nx * 14, y + ny * 14, 'rgba(77,225,255,0.45)', 1.5);
  }
  // the mouth of the tube at the deck
  disc(g, P[0][0], P[0][1], 3, PAL.cyan);
}

const FLAG_COLOR: Record<'none' | 'fine' | 'kink' | 'gap', string> = { none: PAL.dim, fine: PAL.green, kink: PAL.yellow, gap: PAL.red };
/** A ring round the tube at joint i with its number, its x label and its flag in colour and words. */
export function jointRing(g: G, i: number, n: number, cText: string, flag: Flag, level: Level, last: boolean, t: number) {
  const [x, y] = jointPoint(i, n);
  const key = flag ?? 'none';
  const col = FLAG_COLOR[key];
  g.fillStyle = 'rgba(10,14,50,0.35)';
  g.beginPath();
  g.arc(x, y, 19, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = col;
  g.lineWidth = 3.5;
  g.beginPath();
  g.arc(x, y, 19, 0, Math.PI * 2);
  g.stroke();
  if (last) {
    g.strokeStyle = PAL.yellow;
    g.lineWidth = 2;
    g.setLineDash([5, 4]);
    g.beginPath();
    g.arc(x, y, 24 + Math.sin(t * 6) * 1.2, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
  }
  disc(g, x - 17, y - 17, 8, '#0a0e32', col, 1.5);
  text(g, String(i + 1), x - 17, y - 13.2, PAL.white, 11);
  const word = flag === null ? '?' : flag === 'fine' ? (level === 1 ? '✓ JOINED' : '✓ FINE') : flag === 'kink' ? '🟡 SMOOTH' : '🔴 PATCH';
  text(g, word, x, y - 30, col, 11);
  text(g, `x = ${cText}`, x, y + 36, PAL.white, 11);
}

/** The blueprint sign: the formula in pieces (or on one line), with a brace for several pieces, and the range of x. */
export function sign(g: G, r: Round) {
  const { x, y, w, h } = SIGN;
  rrect(g, x, y, w, h, 10, 'rgba(10,14,50,0.85)', PAL.cyan);
  text(g, 'BLUEPRINT', x + 12, y + 14, PAL.dim, 11, 'left');
  const n = r.lines.length;
  const size = (s: string) => (s.length > 26 ? 11 : 12);
  if (n === 1) {
    text(g, 'f(x) =', x + 12, y + 38, PAL.white, 12, 'left');
    text(g, r.lines[0], x + 62, y + 38, PAL.yellow, size(r.lines[0]), 'left');
  } else {
    const top = y + 24;
    const step = 14;
    text(g, 'f(x) =', x + 12, top + ((n - 1) * step) / 2 + 4, PAL.white, 12, 'left');
    g.strokeStyle = PAL.dim;
    g.lineWidth = 1.5;
    const bx = x + 60;
    const y0 = top - 8;
    const y1 = top + (n - 1) * step + 6;
    g.beginPath();
    g.moveTo(bx + 5, y0);
    g.quadraticCurveTo(bx, y0, bx, y0 + 4);
    g.lineTo(bx, (y0 + y1) / 2 - 3);
    g.quadraticCurveTo(bx, (y0 + y1) / 2, bx - 4, (y0 + y1) / 2);
    g.quadraticCurveTo(bx, (y0 + y1) / 2, bx, (y0 + y1) / 2 + 3);
    g.lineTo(bx, y1 - 4);
    g.quadraticCurveTo(bx, y1, bx + 5, y1);
    g.stroke();
    r.lines.forEach((s, i) => text(g, s, x + 70, top + i * step + 4, PAL.yellow, size(s), 'left'));
  }
  text(g, `from x = ${r.loText} to ${r.hiText}`, x + 12, y + h - 7, PAL.dim, 11, 'left');
}

// ---- Marlo, the lifeguard --------------------------------------------------------------------------------------------------------------------------------

export interface MarloOpts { mood: 'happy' | 'worried' | 'cheer' | 'facepalm'; blow: boolean }
const SKIN = '#f2b78f';
/** Marlo on the inspection deck: red tank top and shorts, white sunglasses (pushed up, or down when cheering), zinc nose, whistle, clipboard. (x, y) is the feet. */
export function marlo(g: G, x: number, y: number, t: number, o: MarloOpts) {
  const br = Math.sin(t * 2) * 0.8;
  const cheer = o.mood === 'cheer';
  const palm = o.mood === 'facepalm';
  // legs and shoes
  rect(g, x - 7, y - 18, 5, 15, SKIN);
  rect(g, x + 2, y - 18, 5, 15, SKIN);
  rect(g, x - 8, y - 4, 8, 4, PAL.white);
  rect(g, x + 1, y - 4, 8, 4, PAL.white);
  rect(g, x - 9, y - 30, 18, 13, '#c73b3b');
  // the clipboard arm (viewer's left), tapping
  const tap = Math.sin(t * 7) > 0.92 ? 1.5 : 0;
  line(g, x - 8, y - 42 + br, x - 13, y - 32, SKIN, 4);
  rrect(g, x - 28, y - 46 + tap, 14, 19, 2, '#9a6a3a');
  rect(g, x - 26, y - 43 + tap, 10, 14, '#f4f6ff');
  for (let i = 0; i < 3; i++) line(g, x - 25, y - 40 + i * 4 + tap, x - 18 - (i === 2 ? 3 : 0), y - 40 + i * 4 + tap, '#6b86d6', 1);
  // torso (a red tank top)
  rect(g, x - 9, y - 47 + br, 18, 18, PAL.red);
  rect(g, x - 9, y - 47 + br, 4, 4, SKIN);
  rect(g, x + 5, y - 47 + br, 4, 4, SKIN);
  // the whistle arm (viewer's right): up to the mouth, up in a cheer, or over the face
  const hx = x + 3;
  const hy = y - 55 + br;
  if (o.blow) {
    line(g, x + 8, y - 42 + br, x + 9, y - 52 + br, SKIN, 4);
    line(g, x, y - 47 + br, hx + 6, hy + 4, PAL.white, 1);
    rect(g, hx + 4, hy + 2, 6, 3, PAL.yellow);
    for (let i = -1; i <= 1; i++) line(g, hx + 13, hy + 3 + i * 4, hx + 19, hy + 3 + i * 6, PAL.white, 1.5);
  } else if (cheer) {
    line(g, x + 8, y - 42 + br, x + 15, y - 62 + br, SKIN, 4);
    rect(g, x + 13, y - 70 + br, 4, 8, SKIN);
    line(g, x, y - 47 + br, x + 3, y - 36, PAL.white, 1);
    rect(g, x + 1, y - 36, 5, 3, PAL.yellow);
  } else if (palm) {
    line(g, x + 8, y - 42 + br, x + 8, y - 57 + br, SKIN, 4);
  } else {
    line(g, x + 8, y - 42 + br, x + 11, y - 33, SKIN, 4);
    const wx = x + 11 + Math.sin(t * 4) * 3;
    const wy = y - 26 + Math.cos(t * 4) * 2;
    line(g, x, y - 47 + br, wx, wy, PAL.white, 1);
    rect(g, wx - 3, wy, 6, 3, PAL.yellow);
  }
  // head
  const hyc = y - 58 + br;
  disc(g, x, hyc, 10, SKIN);
  g.fillStyle = '#3b2416';
  g.beginPath();
  g.arc(x, hyc - 1, 10.5, Math.PI * 1.02, Math.PI * 1.98);
  g.fill();
  face(g, x, hyc + 1, 9.5, o.mood === 'facepalm' ? 'worried' : o.mood === 'cheer' ? 'cheer' : 'happy', t);
  rect(g, x - 1.5, hyc + 1, 3, 3, '#f4f6ff');  // zinc cream on the nose
  if (cheer) {
    rrect(g, x - 9, hyc - 3, 8, 5, 2, '#10142e', PAL.white);
    rrect(g, x + 1, hyc - 3, 8, 5, 2, '#10142e', PAL.white);
  } else {
    rrect(g, x - 8, hyc - 9, 16, 4, 2, PAL.white);
    line(g, x - 8, hyc - 7, x - 10, hyc - 5, PAL.white, 1.5);
    line(g, x + 8, hyc - 7, x + 10, hyc - 5, PAL.white, 1.5);
  }
  if (palm) {
    disc(g, x, hyc + 1, 7.5, SKIN, '#d99870', 1);
    for (let i = -1; i <= 1; i++) line(g, x + i * 3, hyc - 3, x + i * 3, hyc - 8, SKIN, 2);
  }
}

// ---- Sir Quacks, the test duck -----------------------------------------------------------------------------------------------------------------------------

export type DuckMood = 'happy' | 'dead' | 'dizzy' | 'worried' | 'grin';
/** A big rubber duck facing right with a tiny crash helmet and aviator goggles, centred at (x, y), turned by `ang`, at `scale`. */
export function duck(g: G, x: number, y: number, ang: number, scale: number, t: number, mood: DuckMood) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.scale(scale, scale);
  const yellow = '#ffe14d';
  // tail, body, wing
  poly(g, [[-15, -3], [-26, -13], [-12, -11]], yellow);
  ell(g, 0, 0, 18, 13, yellow);
  ell(g, -3, 3, 10, 5.5, '#f1c72a', -0.15);
  ell(g, -6, -6, 5, 2.5, 'rgba(255,255,255,0.55)', -0.4);
  // head and beak
  disc(g, 11, -15, 9.5, yellow);
  ell(g, 21, -12, 7, 3.3, PAL.orange);
  line(g, 17, -11, 27, -11.5, '#d9731a', 1);
  if (mood === 'grin' || mood === 'happy') {
    g.strokeStyle = '#a14d0c';
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(22, mood === 'grin' ? -12 : -11.5, mood === 'grin' ? 3.6 : 2.4, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
  }
  // helmet (white shell, red stripe) and the goggle strap
  g.fillStyle = PAL.white;
  g.beginPath();
  g.arc(11, -17, 10, Math.PI, 2 * Math.PI);
  g.fill();
  rect(g, 10, -27, 2.4, 10, PAL.red);
  line(g, 1.5, -17, 20, -17, '#5a3a1a', 2);
  // goggle lens and eye
  disc(g, 14, -15.5, 5, 'rgba(120,70,20,0.75)', '#e8e8f0', 1.4);
  const blink = Math.sin(t * 1.3) > 0.97;
  g.strokeStyle = '#1b1030';
  g.fillStyle = '#1b1030';
  g.lineWidth = 1.4;
  if (mood === 'dead') {
    line(g, 11.5, -18, 16.5, -13, '#1b1030', 1.6);
    line(g, 16.5, -18, 11.5, -13, '#1b1030', 1.6);
  } else if (mood === 'dizzy') {
    g.beginPath();
    g.arc(14, -15.5, 1.6 + Math.sin(t * 8) * 0.6, 0, Math.PI * 1.7);
    g.stroke();
  } else if (blink) line(g, 12, -15.5, 16, -15.5, '#1b1030', 1.4);
  else {
    disc(g, mood === 'worried' ? 13.5 : 14.5, mood === 'worried' ? -14.5 : -15.5, 1.9, '#1b1030');
    disc(g, 15, -16.5, 0.7, PAL.white);
  }
  if (mood === 'worried') {
    g.fillStyle = PAL.cyan;
    g.beginPath();
    g.arc(5, -9 + ((t * 10) % 5), 1.6, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** Stars circling a dizzy head. */
export function stars(g: G, x: number, y: number, t: number) {
  for (let i = 0; i < 3; i++) {
    const a = t * 5 + (i * Math.PI * 2) / 3;
    text(g, '★', x + Math.cos(a) * 17, y + Math.sin(a) * 5, PAL.yellow, 12);
  }
}

// ---- The duck's ride -----------------------------------------------------------------------------------------------------------------------------------------

export interface DuckPose { x: number; y: number; ang: number; state: 'idle' | 'ride' | 'fall' | 'fly' | 'stuck' | 'float'; mood: DuckMood; landedAt: number | null; u: number }
const G_LEAK = 900;
const G_FLY = 1400;
const VY_FLY = -260;
/** Where Sir Quacks is, and how he looks, `rt` seconds after Send. Only the player's own flags decide it: a fault happens at its own joint and nowhere else. */
export function duckPose(r: Round, fault: Fault | null, rt: number): DuckPose {
  const n = r.joints.length;
  const [sx, sy] = slideAt(0);
  const ride = clamp01((rt - 0.3) / RUN);
  const at = (u: number): [number, number] => {
    const [x, y] = slideAt(u);
    const [nx, ny] = normalAt(u);
    return [x - nx * 2, y - ny * 2];
  };
  if (rt < 0 || rt <= 0.3) return { x: sx, y: sy - 2, ang: slideAng(0), state: 'idle', mood: 'happy', landedAt: null, u: 0 };
  if (!fault) {
    if (rt < 0.3 + RUN) {
      const [x, y] = at(ride);
      return { x, y, ang: slideAng(ride), state: 'ride', mood: 'happy', landedAt: null, u: ride };
    }
    const s = clamp01((rt - (0.3 + RUN)) / 0.35);
    const x = P[3][0] + (EXIT[0] - P[3][0]) * s;
    const y = P[3][1] + (EXIT[1] - P[3][1]) * s - 22 * Math.sin(Math.PI * s);
    if (s < 1) return { x, y, ang: 0.4 - s * 0.6, state: 'fall', mood: 'happy', landedAt: null, u: 1 };
    return { x: EXIT[0], y: EXIT[1] + Math.sin(rt * 4) * 1.5, ang: Math.sin(rt * 2) * 0.05, state: 'float', mood: 'grin', landedAt: 0.3 + RUN + 0.35, u: 1 };
  }
  const i = fault.joint;
  const tj = jointTime(r, i);
  const uj = jointU(i, n);
  if (fault.what === 'needless') {
    const u = Math.min(ride, uj - 0.035);
    const [x, y] = at(u);
    const stuck = rt >= tj;
    return { x, y, ang: slideAng(u), state: stuck ? 'stuck' : 'ride', mood: stuck ? 'worried' : 'happy', landedAt: null, u };
  }
  if (rt < tj) {
    const [x, y] = at(ride);
    return { x, y, ang: slideAng(ride), state: 'ride', mood: 'happy', landedAt: null, u: ride };
  }
  const [jx, jy] = at(uj);
  const s = rt - tj;
  if (fault.what === 'leak') {
    const land = Math.sqrt((2 * (GROUND - jy)) / G_LEAK);
    if (s < land) return { x: jx + 18 * s, y: jy + 0.5 * G_LEAK * s * s, ang: slideAng(uj) + s * 2.2, state: 'fall', mood: 'dead', landedAt: null, u: uj };
    return { x: jx + 18 * land, y: GROUND + Math.sin(rt * 3) * 1.2, ang: slideAng(uj) + land * 2.2 + 0.2, state: 'float', mood: 'dead', landedAt: tj + land, u: uj };
  }
  // kink and wrongfix: the duck slams into the bend and is thrown out over the side, spinning
  const d = GROUND - jy;
  const land = (-VY_FLY + Math.sqrt(VY_FLY * VY_FLY + 2 * G_FLY * d)) / G_FLY;
  if (s < land) return { x: jx + 62 * s, y: jy + VY_FLY * s + 0.5 * G_FLY * s * s, ang: s * 14, state: 'fly', mood: 'dizzy', landedAt: null, u: uj };
  return { x: jx + 62 * land, y: GROUND, ang: 0.35, state: 'float', mood: 'dizzy', landedAt: tj + land, u: uj };
}

// ---- Fault effects (each shows only its own joint) ------------------------------------------------------------------------------------------------

/** The tube splitting open: a dark gap, jagged edges and water gushing out. `age` is seconds since the duck reached the joint. */
export function leakFx(g: G, x: number, y: number, ang: number, age: number) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  const open = Math.min(1, age / 0.15);
  rect(g, -7 * open, -17, 14 * open, 34, '#060a24');
  g.strokeStyle = PAL.red;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-7 * open, -17);
  for (let k = 1; k <= 4; k++) g.lineTo(-7 * open + (k % 2 ? 4 : -2), -17 + k * 8.5);
  g.moveTo(7 * open, -17);
  for (let k = 1; k <= 4; k++) g.lineTo(7 * open + (k % 2 ? -4 : 2), -17 + k * 8.5);
  g.stroke();
  g.restore();
  for (let k = 0; k < 5; k++) {
    const f = (age * 2.2 + k * 0.2) % 1;
    g.fillStyle = `rgba(160,230,255,${0.8 * (1 - f)})`;
    g.fillRect(x - 6 + k * 3, y + 10 + f * 70, 2, 8);
  }
}
/** The tube bending at an unsmoothed kink: two thick pieces at different slopes and a starburst of the slam. */
export function kinkFx(g: G, x: number, y: number, ang: number, age: number) {
  const bend = Math.min(1, age / 0.12) * 0.55;
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(255,155,61,0.85)';
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(x - Math.cos(ang) * 24, y - Math.sin(ang) * 24);
  g.lineTo(x, y);
  g.lineTo(x + Math.cos(ang + bend) * 24, y + Math.sin(ang + bend) * 24);
  g.stroke();
  g.lineCap = 'butt';
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 + age * 3;
    line(g, x + Math.cos(a) * 12, y + Math.sin(a) * 12, x + Math.cos(a) * (18 + 8 * Math.min(1, age * 5)), y + Math.sin(a) * (18 + 8 * Math.min(1, age * 5)), `rgba(255,210,63,${Math.max(0, 1 - age * 1.2)})`, 2);
  }
}
/** A STOP barrier dropping across the tube. */
export function stopFx(g: G, x: number, y: number, ang: number, age: number) {
  const drop = 1 - Math.min(1, Math.max(0, (age + 0.15) / 0.15)) ** 2;
  g.save();
  g.translate(x, y - drop * 40);
  g.rotate(ang);
  for (let k = 0; k < 6; k++) rect(g, -4, -17 + k * 6, 8, 6, k % 2 ? PAL.white : PAL.red);
  g.restore();
  if (age > 0) text(g, 'STOP', x, y - 24, PAL.red, 12);
}
/** Rings spreading over water where something landed. */
export function splashRing(g: G, x: number, y: number, age: number) {
  for (let k = 0; k < 2; k++) {
    const f = clamp01(age / 0.9 - k * 0.2);
    if (f <= 0 || f >= 1) continue;
    g.strokeStyle = `rgba(200,240,255,${0.9 * (1 - f)})`;
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(x, y + 8, 8 + f * 30, 3 + f * 8, 0, 0, Math.PI * 2);
    g.stroke();
  }
}
/** A puddle spreading from a leak. */
export function puddle(g: G, x: number, y: number, age: number) {
  ell(g, x, y + 10, 8 + 26 * clamp01(age / 0.6), 2.5 + 3 * clamp01(age / 0.6), 'rgba(90,190,240,0.55)');
}

// ---- The repair crew -------------------------------------------------------------------------------------------------------------------------------------

/** A worker in a gondola beside the ring: a welder (mask, torch, blue sparks) for a gap, a sander (goggles, dust) for a kink. They finish in 0.3 s. */
export function crew(g: G, x: number, y: number, kind: 'gap' | 'kink', rt: number, t: number) {
  const alpha = clamp01(rt / 0.1) * clamp01((0.85 - rt) / 0.3);
  if (alpha <= 0) return;
  g.globalAlpha = alpha;
  const wx = x - 34;
  const wy = y + 24;
  const working = rt < 0.3;
  line(g, wx - 8, wy, x - 17, y - 3, 'rgba(170,180,238,0.8)', 1);
  line(g, wx + 8, wy, x - 17, y - 3, 'rgba(170,180,238,0.8)', 1);
  rect(g, wx - 10, wy, 20, 5, '#7d8bd1');
  const suit = kind === 'gap' ? '#51618f' : '#3d8a5a';
  rect(g, wx - 5, wy - 16, 10, 16, suit);
  const hy = wy - 22;
  disc(g, wx, hy, 6, SKIN);
  g.fillStyle = PAL.orange;
  g.beginPath();
  g.arc(wx, hy - 1, 7, Math.PI, 2 * Math.PI);
  g.fill();
  rect(g, wx - 8, hy - 1, 16, 2, PAL.orange);
  const tx = working ? x - 14 : wx + 12;
  const ty = working ? y + 2 : wy - 10;
  line(g, wx + 4, wy - 12, tx, ty, SKIN, 3);
  if (kind === 'gap') {
    rrect(g, wx - 5, hy - 3, 10, 8, 2, '#1d2140', PAL.cyan);
    rect(g, wx - 3, hy, 6, 1.5, PAL.cyan);
    line(g, tx, ty, tx - 4, ty + 3, PAL.dim, 3);
    if (working) {
      for (let k = 0; k < 6; k++) {
        const f = (t * 9 + k / 6) % 1;
        rect(g, tx + 2 + Math.cos(k * 2.4) * f * 12, ty - 3 + Math.sin(k * 2.4) * f * 12, 2, 2, k % 2 ? '#bff4ff' : PAL.cyan);
      }
    }
  } else {
    rect(g, wx - 5, hy - 2, 10, 3, '#bff4ff');
    rect(g, tx - 4, ty - 3, 8, 6, PAL.dim);
    if (working) {
      for (let k = 0; k < 5; k++) {
        const f = (t * 6 + k / 5) % 1;
        disc(g, tx + Math.cos(k * 2.1) * f * 14, ty + Math.sin(k * 2.1) * f * 10, 1.6 + f, `rgba(215,190,150,${0.8 * (1 - f)})`);
      }
    }
  }
  g.globalAlpha = 1;
}

/** The zoom drone: a little quadcopter that flies over the joint it is reading. */
export function drone(g: G, x: number, y: number, t: number) {
  rrect(g, x - 8, y - 3, 16, 6, 3, '#e3e9ff', PAL.cyan);
  for (const dx of [-11, 11]) {
    line(g, x + dx - 6, y - 7 + Math.sin(t * 40) * 0.6, x + dx + 6, y - 7 - Math.sin(t * 40) * 0.6, PAL.dim, 2);
    line(g, x + dx * 0.7, y - 3, x + dx, y - 7, PAL.dim, 1.5);
  }
  disc(g, x, y + 5, 2.5, PAL.cyan);
  line(g, x, y + 7, x, y + 26, 'rgba(77,225,255,0.45)', 2);
}

// ---- The zoom magnifier (the only place the true shape of f appears) --------------------------------------------------------------------

/** A round magnifier showing the real graph around one joint: left piece, right piece, open dots at excluded ends, a filled dot at f(c). No numbers. */
export function zoomLens(g: G, z: Zoom | null, cText: string | null) {
  const { cx, cy, R } = ZOOM;
  g.fillStyle = 'rgba(6,10,36,0.94)';
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.fill();
  if (z) {
    const ys = [...z.left, ...z.right].map((p) => p[1]).concat([z.L, z.R, z.V]);
    const yr = Math.max(...ys) - Math.min(...ys);
    const mid = (Math.max(...ys) + Math.min(...ys)) / 2;
    const s = (2 * (R - 12)) / Math.max(2 * z.w, yr);
    const X = (x: number) => cx + (x - z.c) * s;
    const Y = (y: number) => cy - (y - mid) * s;
    g.save();
    g.beginPath();
    g.arc(cx, cy, R - 2, 0, Math.PI * 2);
    g.clip();
    line(g, cx, cy - R, cx, cy + R, 'rgba(143,155,214,0.25)', 1, [3, 4]);
    for (const [pts, col] of [[z.left, ZOOM.left], [z.right, ZOOM.right]] as const) {
      g.strokeStyle = col;
      g.lineWidth = 3;
      g.lineJoin = 'round';
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
      g.stroke();
    }
    const open = (y: number, col: string) => {
      g.beginPath();
      g.arc(cx, Y(y), 4, 0, Math.PI * 2);
      g.fillStyle = '#060a24';
      g.fill();
      g.strokeStyle = col;
      g.lineWidth = 2;
      g.stroke();
    };
    const leftOpen = Math.abs(z.L - z.V) > 1e-6;
    const rightOpen = Math.abs(z.R - z.V) > 1e-6;
    if (leftOpen) open(z.L, ZOOM.left);
    if (rightOpen) open(z.R, ZOOM.right);
    disc(g, cx, Y(z.V), 3.6, PAL.white);
    g.restore();
  } else {
    text(g, '?', cx, cy + 9, PAL.dim, 26);
    text(g, 'tap a joint', cx, cy + 28, PAL.dim, 11);
  }
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 4;
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.stroke();
  line(g, cx + R * 0.72, cy + R * 0.72, cx + R + 14, cy + R + 14, '#c98a4a', 7);
  text(g, cText ? `ZOOM · x = ${cText}` : 'ZOOM', cx, cy - R - 8, PAL.dim, 11);
}

/** The "tap" cue on the first joint: a pulsing ring and the word, until the first tap. */
export function tapCue(g: G, x: number, y: number, t: number) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 5);
  g.strokeStyle = PAL.yellow;
  g.globalAlpha = 0.4 + 0.6 * pulse;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(x, y, 25 + pulse * 4, 0, Math.PI * 2);
  g.stroke();
  text(g, '☝ tap', x + 34, y + 4, PAL.yellow, 12, 'left');
  g.globalAlpha = 1;
}

/** The round's goal in one short line on a dark pill: fully shown for 2.6 s from the start of the round, gone at 3 s. `age` is the seconds since the round began. */
export function goalLine(g: G, s: string, cx: number, y: number, age: number) {
  const a = age < 2.6 ? 1 : Math.max(0, 1 - (age - 2.6) / 0.4);
  if (a <= 0) return;
  const w = s.length * 6.8 + 28;
  g.globalAlpha = a;
  rrect(g, cx - w / 2, y - 14, w, 22, 11, 'rgba(10,14,50,0.92)', PAL.yellow);
  text(g, s, cx, y + 1, PAL.yellow, 12);
  g.globalAlpha = 1;
}

/** A different light for each round: round 1 the teal dusk as it is, round 2 a sunset glow, round 3 (the boss) a night with twinkling stars and a deep tint. Drawn over the scenery. */
export function roundTint(g: G, k: number, t: number) {
  if (k === 1) {
    g.fillStyle = 'rgba(255,110,60,0.13)';
    g.fillRect(0, 0, 640, 340);
  } else if (k === 2) {
    g.fillStyle = 'rgba(20,10,80,0.32)';
    g.fillRect(0, 0, 640, 340);
    for (let i = 0; i < 9; i++) {
      g.globalAlpha = 0.45 + 0.45 * Math.sin(t * 1.4 + i * 2.3);
      disc(g, 30 + i * 67, 12 + ((i * 53) % 34), 1.4, PAL.white);
    }
    g.globalAlpha = 1;
  }
}

