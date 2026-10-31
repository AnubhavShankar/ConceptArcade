// Snap the Electron: the art. The station, Kiran (hero), Pico (camera robot), the electron, the proton, the orbiting bodies of level 4,
// the grips, the orbits and the wave lines. Nothing here knows an answer: it draws what it is told.
import { PAL } from '@core/arcade';
import { face } from '@core/mathkit';
import { glow, line, text } from '@core/neon';
import type { Scene } from './logic';

type G = CanvasRenderingContext2D;

export const SCREEN = { x: 168, y: 34, w: 464, h: 300 }; // the ATOM CAM monitor (levels 1-3) and the cupola window (level 4)
export const GOAL_Y = 22; // the goal line, centred at x = 400
export const ATOM = { x: 400, y: 186 }; // level 1
export const ringPx = (k: number) => 12 + 4.2 * k; // level 1 ring on screen: a picture, not to scale
export const TRAP = { x: 400, y: 190 }; // level 2
export const trapPx = (n: number) => 50 + 16 * n; // level 2 orbit on screen, not to scale
export const TWIN_A = { x: 276, y: 190 };
export const TWIN_B = { x: 500, y: 190 };
export const twinPxA = (n: number) => 40 + 14 * n;
export const twinPxB = (n: number) => 56 + 14 * n;
export const WAVE_WIN = { x: 220, y: 206, w: 360, h: 56 }; // level 4: the Bohr scope's window (mid line y = 234)
export const ZTRACK = { x0: 196, x1: 616, y: 312 }; // level 4: the zoom lever's track
export const PORTHOLE = { x: 80, y: 70, r: 42 };
export const CONSOLE = { x: 22, y: 288, w: 124, h: 44 };
export const BUTTON = { x: 118, y: 304, r: 9 };
export const KIRAN = { hip: { x: 78, y: 236 } };
export const PICO = { x: 142, y: 100 };
export const WIN_MID = 234;
/** A point at `deg` clockwise from 12 o'clock on a circle. */
export const onRing = (cx: number, cy: number, R: number, deg: number): [number, number] => [cx + R * Math.sin((deg * Math.PI) / 180), cy - R * Math.cos((deg * Math.PI) / 180)];
/** The canvas arc angle of a clockwise-from-12 angle. */
export const cv = (deg: number) => ((deg - 90) * Math.PI) / 180;

/** Set once at mount from prefers-reduced-motion. */
export const FX = { reduce: false };

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const ease = (x: number) => {
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
};
const SKIN = '#e2b08a';

function rrect(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  if (typeof g.roundRect === 'function') g.roundRect(x, y, w, h, r);
  else g.rect(x, y, w, h);
}
function dot(g: G, x: number, y: number, r: number, fill: string) {
  g.fillStyle = fill;
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
}
/** The elbow of a two-segment arm of segment length L from s to h, bent toward `dir` (+1 or -1 along the left normal). */
function elbow(s: [number, number], h: [number, number], L: number, dir: number): [number, number] {
  const dx = h[0] - s[0];
  const dy = h[1] - s[1];
  const d = Math.max(1, Math.hypot(dx, dy));
  const bend = Math.sqrt(Math.max(0, L * L - (d / 2) * (d / 2)));
  return [(s[0] + h[0]) / 2 + (-dy / d) * bend * dir, (s[1] + h[1]) / 2 + (dx / d) * bend * dir];
}

// ---------------------------------------------------------------- the station

const STARS: [number, number][] = [[58, 40], [96, 36], [112, 58], [52, 70], [70, 90], [104, 84], [90, 46], [60, 56]];
const CITIES: [number, number][] = [[62, 88], [74, 96], [86, 92], [98, 100], [68, 106], [92, 106], [80, 84], [104, 90]];

function porthole(g: G, t: number, round: number) {
  const { x, y, r } = PORTHOLE;
  g.save();
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = '#050818';
  g.fillRect(x - r, y - r, 2 * r, 2 * r);
  STARS.forEach(([sx, sy], i) => dot(g, sx, sy, 1, `rgba(255,255,255,${(0.5 + 0.3 * Math.sin(1.1 * t + i)).toFixed(2)})`));
  if (round === 0) {
    dot(g, 80, 140, 70, '#2b6fd6');
    g.fillStyle = '#3a9a4a';
    g.beginPath();
    g.ellipse(66, 88, 20, 7, -0.3, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 2;
    for (const [cx, cy] of [[96, 82], [60, 100], [84, 108]]) {
      g.beginPath();
      g.arc(cx, cy, 6, 0.2, 4.4);
      g.stroke();
    }
  } else if (round === 1) {
    dot(g, 80, 140, 70, '#0d1a4a');
    g.strokeStyle = PAL.orange;
    g.lineWidth = 5;
    g.beginPath();
    g.arc(80, 140, 68, cv(-60), cv(60));
    g.stroke();
    glow(g, '#fff6c0', 14, () => dot(g, 104, 46, 5, '#fff6c0'));
  } else {
    dot(g, 80, 140, 70, '#060d2a');
    CITIES.forEach(([cx, cy]) => dot(g, cx, cy, 1.5, PAL.yellow));
    g.strokeStyle = 'rgba(93,255,154,0.5)';
    g.lineWidth = 3;
    const sway = FX.reduce ? 0 : 3 * Math.sin(t);
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(54 + i * 26, 76);
      g.bezierCurveTo(60 + i * 26 + sway, 86, 48 + i * 26 - sway, 98, 54 + i * 26, 108);
      g.stroke();
    }
  }
  if (round !== 2) {
    g.strokeStyle = 'rgba(77,225,255,0.6)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(80, 140, 71, cv(-50), cv(50));
    g.stroke();
  }
  g.restore();
  g.strokeStyle = '#5a6380';
  g.lineWidth = 8;
  g.beginPath();
  g.arc(x, y, r + 4, 0, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < 8; i++) dot(g, x + (r + 4) * Math.cos((i * Math.PI) / 4), y + (r + 4) * Math.sin((i * Math.PI) / 4), 2, '#aab3d6');
}

/** The module wall, handrail, porthole (by round) and the console. `press` is 0 to 1, the sunk and glowing button. */
export function station(g: G, t: number, round: number, label: string, press: number) {
  g.fillStyle = '#121830';
  g.fillRect(0, 0, 640, 340);
  line(g, 160, 0, 160, 340, '#2a3159', 3);
  line(g, 0, 140, 160, 140, PAL.grid, 1);
  line(g, 0, 250, 160, 250, PAL.grid, 1);
  line(g, 10, 128, 150, 128, PAL.yellow, 4);
  for (const bx of [24, 80, 136]) line(g, bx, 128, bx, 140, '#8a7a30', 3);
  porthole(g, t, round);
  // the console
  g.fillStyle = '#3a4166';
  rrect(g, CONSOLE.x, CONSOLE.y, CONSOLE.w, CONSOLE.h, 5);
  g.fill();
  g.strokeStyle = PAL.dim;
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = '#04140a';
  g.fillRect(62, 292, 44, 14);
  text(g, 'ARMED', 84, 303, PAL.green, 11);
  dot(g, 44, 306, 6, '#222845');
  line(g, 44, 306, 44, 297, '#aab3d6', 3);
  dot(g, 44, 296, 3, PAL.red);
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(42, 290, 8, Math.PI, Math.PI * 2);
  g.stroke();
  const by = BUTTON.y + 3 * press;
  if (press > 0.05) glow(g, '#ffffff', 10, () => dot(g, BUTTON.x, by, BUTTON.r, PAL.white));
  else dot(g, BUTTON.x, by, BUTTON.r, PAL.red);
  text(g, label, BUTTON.x, 327, PAL.white, 11);
}

// ---------------------------------------------------------------- Kiran (the hero)

export interface KiranState {
  mood: 'happy' | 'focus' | 'cheer' | 'worried';
  goggles: boolean;
  press: number;
  spin: number;
  sweat: number;
  facepalm: boolean;
  thumbsUp: boolean;
}
export const KIRAN_REST: KiranState = { mood: 'happy', goggles: false, press: 0, spin: 0, sweat: -1, facepalm: false, thumbsUp: false };

export function kiran(g: G, t: number, s: KiranState) {
  const bob = 3 * Math.sin(1.2 * t);
  const ang = ((8 + 2 * Math.sin(0.9 * t)) * Math.PI) / 180 + s.spin;
  const hx = KIRAN.hip.x;
  const hy = KIRAN.hip.y + bob;
  const cs = Math.cos(ang);
  const sn = Math.sin(ang);
  const W = (lx: number, ly: number): [number, number] => [hx + lx * cs - ly * sn, hy + lx * sn + ly * cs];
  // legs, pinned under the foot loop while she is not tumbling
  const free = clamp01(s.spin * 3);
  const hooked: [number, number] = [44, 284];
  const fl = W(-32, 46);
  const foot: [number, number] = [hooked[0] + (fl[0] - hooked[0]) * free, hooked[1] + (fl[1] - hooked[1]) * free];
  const hip: [number, number] = [hx, hy];
  const knee: [number, number] = [(hip[0] + foot[0]) / 2 + 12, (hip[1] + foot[1]) / 2 + 4];
  limb(g, [hip, knee, foot], '#b59b6b', 10);
  limb(g, [[foot[0] + 1, foot[1] - 1], [foot[0] - 5, foot[1] + 3]], '#9a9fae', 8);
  // the hands and arms
  const shL = W(-9, -31);
  const shR = W(9, -31);
  const head = W(3, -48);
  let hL: [number, number] = [44, 132];
  if (s.facepalm) hL = [head[0] - 3, head[1] - 9];
  else if (s.thumbsUp) hL = W(-14, -42);
  const hR: [number, number] = [BUTTON.x - 6, BUTTON.y - 10 + 3 * s.press];
  const eL = elbow(shL, hL, 48, hL[0] < shL[0] ? 1 : -1);
  const eR = elbow(shR, hR, 48, 1);
  limb(g, [shR, eR, hR], '#26357a', 8);
  dot(g, hR[0], hR[1], 4, SKIN);
  // torso, head and gear, in the body's own frame
  g.save();
  g.translate(hx, hy);
  g.rotate(ang);
  g.fillStyle = '#26357a';
  g.beginPath();
  g.moveTo(-9, 2);
  g.lineTo(9, 2);
  g.lineTo(12, -32);
  g.lineTo(-12, -32);
  g.closePath();
  g.fill();
  g.fillStyle = SKIN;
  g.fillRect(-2.5, -38, 5, 7);
  g.strokeStyle = PAL.white;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-6, -33);
  g.lineTo(0, -25);
  g.lineTo(6, -33);
  g.stroke();
  // the mission patch on the left shoulder
  g.fillStyle = '#26357a';
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(-8, -26, 4, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  dot(g, -8, -26, 1, PAL.white);
  g.strokeStyle = PAL.white;
  g.lineWidth = 0.8;
  g.beginPath();
  g.arc(-8, -26, 2.4, 0, Math.PI * 2);
  g.stroke();
  // the lanyard and the floating badge
  g.strokeStyle = PAL.white;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(-4, -34);
  g.lineTo(8, -22);
  g.lineTo(4, -34);
  g.stroke();
  g.save();
  g.translate(8, -22);
  g.rotate(0.2 * Math.sin(2 * t));
  g.fillStyle = PAL.white;
  g.fillRect(-3.5, 0, 7, 9);
  g.fillStyle = '#26357a';
  g.fillRect(-2, 2, 4, 2);
  g.restore();
  // the head
  dot(g, 3, -48, 13, SKIN);
  g.fillStyle = '#2a1a12';
  g.beginPath();
  g.arc(3, -48, 13.5, Math.PI, Math.PI * 2);
  g.fill();
  dot(g, -8, -60, 6, '#2a1a12');
  line(g, -14, -55, -3, -66, PAL.yellow, 2);
  g.strokeStyle = '#2a1a12';
  g.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const dx = 3 * Math.sin(1.6 * t + i);
    g.beginPath();
    g.moveTo(-9, -52 + i * 4);
    g.quadraticCurveTo(-13 + dx, -46 + i * 5, -12 + dx * 1.4, -38 + i * 4 + dx * 0.4);
    g.stroke();
  }
  // the headset: one ear cup and a boom mic
  g.strokeStyle = '#6a7396';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(3, -48, 14.5, Math.PI * 1.02, Math.PI * 1.6);
  g.stroke();
  dot(g, -10, -47, 3.5, '#6a7396');
  line(g, -10, -45, -1, -38, '#6a7396', 1.5);
  dot(g, -1, -38, 2, '#222845');
  // the face
  const glance = !s.goggles && t % 5 < 0.6;
  const fx = 3 + (glance ? -2 : 0);
  if (s.mood === 'focus') {
    g.strokeStyle = '#1b1030';
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(fx - 8, -50);
    g.lineTo(fx - 2, -50);
    g.moveTo(fx + 2, -50);
    g.lineTo(fx + 8, -50);
    g.moveTo(fx - 3, -41);
    g.lineTo(fx + 3, -41);
    g.stroke();
  } else face(g, fx, -48, 13, s.mood === 'cheer' ? 'cheer' : s.mood === 'worried' ? 'worried' : 'happy', t);
  // the laser-safety goggles: over the eyes on a shot, otherwise pushed up on the forehead
  g.fillStyle = 'rgba(255,155,61,0.8)';
  if (s.goggles) {
    g.fillRect(fx - 11, -53, 22, 7);
    g.strokeStyle = '#6a7396';
    g.lineWidth = 1.5;
    g.strokeRect(fx - 11, -53, 22, 7);
  } else g.fillRect(-8, -61, 22, 7);
  g.restore();
  // the left arm and hand
  limb(g, [shL, eL, hL], '#26357a', 8);
  dot(g, hL[0], hL[1], s.thumbsUp ? 5 : 4, SKIN);
  if (s.thumbsUp) line(g, hL[0], hL[1] - 4, hL[0], hL[1] - 11, SKIN, 3.5);
  // the sweat drop floats up in free fall
  if (s.sweat >= 0) {
    const [tx, ty] = W(14, -52);
    g.globalAlpha = s.sweat < 1 ? 1 : clamp01(1 - (s.sweat - 1) * 2);
    const dy = -20 * clamp01(s.sweat);
    dot(g, tx, ty + dy, 2.5, PAL.cyan);
    g.fillStyle = PAL.cyan;
    g.beginPath();
    g.moveTo(tx - 2, ty + dy - 1);
    g.lineTo(tx, ty + dy - 7);
    g.lineTo(tx + 2, ty + dy - 1);
    g.fill();
    g.globalAlpha = 1;
  }
  // a pen drifts beside her head
  g.save();
  g.translate(126 + 6 * Math.sin(0.6 * t), 176 + 6 * Math.cos(0.6 * t));
  g.rotate(0.5 * t);
  line(g, -6, 0, 6, 0, PAL.orange, 2);
  line(g, 4, 0, 6, 0, PAL.white, 2);
  g.restore();
}

// ---------------------------------------------------------------- Pico (the camera robot)

export interface PicoState {
  mood: 'idle' | 'busy' | 'happy' | 'sad';
  look: [number, number];
  /** Seconds since the mood began (for the happy lens circle). */
  u?: number;
}
export function pico(g: G, t: number, s: PicoState) {
  const u = s.u ?? 0;
  const px = PICO.x;
  const py = PICO.y + 2 * Math.sin(1.7 * t) - (s.mood === 'happy' ? 4 : 0);
  dot(g, px, py, 12, '#d9def2');
  g.strokeStyle = PAL.dim;
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(px, py, 12, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = '#9aa3c8';
  g.beginPath();
  g.ellipse(px, py, 12, 3, 0, 0, Math.PI * 2);
  g.fill();
  for (const sd of [-1, 1]) {
    const cx = px + 12 * sd;
    dot(g, cx, py, 3, '#b8bfdc');
    for (let i = -1; i <= 1; i++) line(g, cx - 1.5, py + i * 1.4, cx + 1.5, py + i * 1.4, '#5a6380', 0.8);
  }
  const led = s.mood === 'busy' ? (Math.floor(t * 4) % 2 === 0 ? PAL.orange : '#3a2a10') : PAL.green;
  dot(g, px, py - 12, 2, led);
  // the lens looks toward the thing being photographed
  let lx = px;
  let ly = py;
  const dx = s.look[0] - px;
  const dy = s.look[1] - py;
  const dl = Math.max(1, Math.hypot(dx, dy));
  lx += (2 * dx) / dl;
  ly += (2 * dy) / dl;
  if (s.mood === 'happy') {
    const a = ((u / 0.6) * Math.PI * 2) % (Math.PI * 2);
    if (u < 0.6) {
      lx = px + 5 * Math.cos(a);
      ly = py + 5 * Math.sin(a);
    }
  }
  if (s.mood === 'sad') ly += 3;
  dot(g, lx, ly, 5, '#101830');
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(lx, ly, 5, 0, Math.PI * 2);
  g.stroke();
  dot(g, lx - 1.5, ly - 1.5, 1.2, PAL.white);
  if (s.mood === 'happy') text(g, '♥', px, py - 18, PAL.pink, 12);
  if (s.mood === 'sad') text(g, '?', px, py - 18, PAL.dim, 12);
}

// ---------------------------------------------------------------- the atom: proton and electron

export function proton(g: G, x: number, y: number, R: number, t: number, mood: 'sleepy' | 'smile' | 'yawn') {
  glow(g, PAL.red, 10 + 4 * Math.sin(2 * t), () => dot(g, x, y, R, PAL.red));
  text(g, '+', x + R * 0.8, y - R * 0.55, PAL.white, 11);
  g.strokeStyle = '#2a0a10';
  g.fillStyle = '#2a0a10';
  g.lineWidth = 1.4;
  g.beginPath();
  if (mood === 'sleepy') {
    g.arc(x - R * 0.4, y - R * 0.1, R * 0.22, 0, Math.PI);
    g.moveTo(x + R * 0.62, y - R * 0.1);
    g.arc(x + R * 0.4, y - R * 0.1, R * 0.22, 0, Math.PI);
    g.stroke();
    g.beginPath();
    g.moveTo(x - R * 0.2, y + R * 0.45);
    g.lineTo(x + R * 0.2, y + R * 0.45);
    g.stroke();
  } else if (mood === 'smile') {
    g.arc(x - R * 0.4, y - R * 0.15, R * 0.18, Math.PI, Math.PI * 2);
    g.moveTo(x + R * 0.58, y - R * 0.15);
    g.arc(x + R * 0.4, y - R * 0.15, R * 0.18, Math.PI, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(x, y + R * 0.15, R * 0.4, 0.1 * Math.PI, 0.9 * Math.PI);
    g.stroke();
  } else {
    g.arc(x - R * 0.4, y - R * 0.1, R * 0.22, 0, Math.PI);
    g.moveTo(x + R * 0.62, y - R * 0.1);
    g.arc(x + R * 0.4, y - R * 0.1, R * 0.22, 0, Math.PI);
    g.stroke();
    g.beginPath();
    g.arc(x, y + R * 0.45, R * 0.24, 0, Math.PI * 2);
    g.fill();
  }
}

/** The electron, drawn only in a winning photo. `since` is the seconds since the reveal; `orbit` puts three motion arcs behind it. */
export function electron(g: G, x: number, y: number, t: number, since: number, orbit?: { cx: number; cy: number; R: number; deg: number }) {
  if (orbit) {
    g.strokeStyle = PAL.cyan;
    g.lineWidth = 3;
    for (let i = 1; i <= 3; i++) {
      g.globalAlpha = 0.4;
      g.beginPath();
      g.arc(orbit.cx, orbit.cy, orbit.R, cv(orbit.deg - 6 * i - 3), cv(orbit.deg - 6 * i));
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  glow(g, PAL.cyan, 14, () => dot(g, x, y, 8, PAL.cyan));
  dot(g, x, y, 4, PAL.white);
  text(g, '−', x + 9, y - 6, PAL.white, 11);
  if (since < 0.3) {
    dot(g, x - 3, y - 1, 2.5, PAL.white);
    dot(g, x + 3, y - 1, 2.5, PAL.white);
    dot(g, x - 3, y - 1, 1.1, '#1b1030');
    dot(g, x + 3, y - 1, 1.1, '#1b1030');
    dot(g, x, y + 4, 1.6, '#1b1030');
  } else {
    // a grin and a wink
    g.strokeStyle = '#1b1030';
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(x - 3, y - 1, 1.8, Math.PI, Math.PI * 2);
    g.moveTo(x + 1.5, y - 1);
    g.lineTo(x + 4.5, y - 1);
    g.stroke();
    g.beginPath();
    g.arc(x, y + 2, 3, 0.1 * Math.PI, 0.9 * Math.PI);
    g.stroke();
  }
  void t;
}

/** Four L-shaped viewfinder corners round (x, y) and a red REC dot blinking at 1 Hz. */
export function viewfinder(g: G, x: number, y: number, t: number) {
  const h = 17;
  g.strokeStyle = PAL.white;
  g.lineWidth = 2;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.beginPath();
    g.moveTo(x + sx * h, y + sy * (h - 8));
    g.lineTo(x + sx * h, y + sy * h);
    g.lineTo(x + sx * (h - 8), y + sy * h);
    g.stroke();
  }
  if (Math.floor(t) % 2 === 0) dot(g, x + h - 3, y - h + 4, 2.5, PAL.red);
}

// ---------------------------------------------------------------- the ATOM CAM monitor and the cupola window

export function atomCam(g: G, label: string, boss: boolean) {
  const { x, y, w, h } = SCREEN;
  g.fillStyle = '#04071a';
  rrect(g, x, y, w, h, 8);
  g.fill();
  g.strokeStyle = boss ? PAL.red : PAL.cyan;
  g.lineWidth = 2;
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.04)';
  g.lineWidth = 1;
  for (let yy = y + 4; yy < y + h; yy += 4) {
    g.beginPath();
    g.moveTo(x + 2, yy);
    g.lineTo(x + w - 2, yy);
    g.stroke();
  }
  text(g, label, 180, 50, boss ? PAL.red : PAL.dim, 11, 'left');
}

export function cupola(g: G, t: number, boss: boolean) {
  const { x, y, w, h } = SCREEN;
  g.fillStyle = '#02030a';
  g.fillRect(x, y, w, h);
  for (let i = 0; i < 40; i++) dot(g, 176 + ((i * 97) % 448), 42 + ((i * 53) % 150), 0.75, `rgba(255,255,255,${(0.4 + 0.4 * Math.sin(1.3 * t + i)).toFixed(2)})`);
  g.strokeStyle = '#5a6380';
  g.lineWidth = 10;
  g.strokeRect(x, y, w, h);
  for (let bx = x + 29; bx < x + w; bx += 58) {
    dot(g, bx, y, 2, '#aab3d6');
    dot(g, bx, y + h, 2, '#aab3d6');
  }
  for (let by = y + 29; by < y + h; by += 58) {
    dot(g, x, by, 2, '#aab3d6');
    dot(g, x + w, by, 2, '#aab3d6');
  }
  if (boss) {
    g.strokeStyle = PAL.red;
    g.lineWidth = 1;
    g.strokeRect(x + 7, y + 7, w - 14, h - 14);
  }
}

// ---------------------------------------------------------------- grips, cues, readouts

/** A see-through grip ring at a handle. `⇔` sits in the middle, `↻` at the upper right. */
export function grip(g: G, x: number, y: number, r: number, glyph: '⇔' | '↻') {
  g.fillStyle = 'rgba(255,210,63,0.12)';
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  if (glyph === '⇔') text(g, '⇔', x, y + 5, PAL.yellow, 14);
  else text(g, '↻', x + 14, y - 14, PAL.yellow, 11);
}

/** The pulsing `drag ⇔` or `drag ↻` cue. */
export function dragCue(g: G, t: number, glyph: string, x: number, y: number, align: CanvasTextAlign = 'center') {
  g.globalAlpha = 0.5 + 0.5 * Math.sin(4 * t);
  text(g, `drag ${glyph}`, x, y, PAL.yellow, 11, align);
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- waves

/** A standing wave of N crests round a ring of radius R, clockwise from 12 o'clock; a broken N jumps at 12 o'clock. */
export function waveRing(g: G, cx: number, cy: number, R: number, N: number, color: string, w = 2) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.beginPath();
  for (let i = 0; i <= 120; i++) {
    const th = (i / 120) * Math.PI * 2;
    const [px, py] = onRing(cx, cy, R + 6 * Math.sin(N * th), (th * 180) / Math.PI);
    if (i) g.lineTo(px, py);
    else g.moveTo(px, py);
  }
  g.stroke();
}

/** `c` periods of a sine across the window, about the mid line; more than 60 is drawn as a solid band. */
export function strip(g: G, c: number, color: string, blur = 0) {
  const { x, w } = WAVE_WIN;
  const draw = () => {
    if (c > 60) {
      g.globalAlpha = 0.35;
      g.fillStyle = color;
      g.fillRect(x, 216, w, 36);
      g.globalAlpha = 1;
      return;
    }
    g.strokeStyle = color;
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i <= 600; i++) {
      const px = x + (i / 600) * w;
      const py = WIN_MID - 18 * Math.sin(2 * Math.PI * c * (i / 600));
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.stroke();
  };
  if (blur) glow(g, color, blur, draw);
  else draw();
}

// ---------------------------------------------------------------- orbits (levels 2 and 3)

/** An orbit band with a thin line, six static sparkles, optional ticks, the gate (with its LED) and the proton's place. */
export function orbit(g: G, cx: number, cy: number, R: number, t: number, o: { band: number; ticks: boolean; led: number }) {
  g.strokeStyle = PAL.cyan;
  g.globalAlpha = o.band;
  g.lineWidth = 10;
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = 0.5;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = 1;
  for (let i = 0; i < 6; i++) {
    const [sx, sy] = onRing(cx, cy, R, 20 + 60 * i);
    dot(g, sx, sy, 2, `rgba(255,255,255,${(0.25 + 0.25 * Math.sin(5 * t + i)).toFixed(2)})`);
  }
  if (o.ticks) {
    for (let d = 0; d < 360; d += 15) {
      const [x1, y1] = onRing(cx, cy, R + 6, d);
      const [x2, y2] = onRing(cx, cy, R + (d % 90 === 0 ? 14 : 10), d);
      g.globalAlpha = 0.6;
      line(g, x1, y1, x2, y2, PAL.dim, 1.2);
      g.globalAlpha = 1;
    }
  }
  // the gate: a U-shaped clamp over the band
  g.strokeStyle = '#aab3d6';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(cx - 7, cy - R + 7);
  g.lineTo(cx - 7, cy - R - 7);
  g.lineTo(cx + 7, cy - R - 7);
  g.lineTo(cx + 7, cy - R + 7);
  g.stroke();
  glow(g, PAL.green, o.led > 0 ? 10 : 0, () => dot(g, cx, cy - R - 10, 3, o.led > 0 ? PAL.green : '#1f4a30'));
  text(g, 'GATE', cx, cy - R - 16, PAL.dim, 11);
}

/** The camera at a point on an orbit, its lens toward the atom. */
export function camera(g: G, x: number, y: number, cx: number, cy: number) {
  g.save();
  g.translate(x, y);
  g.rotate(Math.atan2(cy - y, cx - x));
  g.fillStyle = '#2a3159';
  g.strokeStyle = PAL.white;
  g.lineWidth = 1.2;
  g.fillRect(-9, -6, 18, 12);
  g.strokeRect(-9, -6, 18, 12);
  dot(g, 5, 0, 3.5, PAL.cyan);
  g.fillStyle = PAL.white;
  g.fillRect(-7, -9, 8, 3);
  g.restore();
}

/** The arc from d0 to d1 (clockwise degrees) of a ring. */
export function arcDeg(g: G, cx: number, cy: number, R: number, d0: number, d1: number, color: string, w: number, alpha = 1) {
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.lineWidth = w;
  g.beginPath();
  g.arc(cx, cy, R, cv(d0), cv(d1));
  g.stroke();
  g.globalAlpha = 1;
}

/** The direction arrow outside a ring: a curved arrow from 20 to 50 degrees with a head. */
export function direction(g: G, cx: number, cy: number, R: number) {
  arcDeg(g, cx, cy, R + 18, 20, 50, PAL.dim, 2);
  const [hx, hy] = onRing(cx, cy, R + 18, 50);
  const a = cv(50) + Math.PI / 2;
  g.fillStyle = PAL.dim;
  g.beginPath();
  g.moveTo(hx + 6 * Math.cos(a), hy + 6 * Math.sin(a));
  g.lineTo(hx + 4 * Math.cos(a + 2.2), hy + 4 * Math.sin(a + 2.2));
  g.lineTo(hx + 4 * Math.cos(a - 2.2), hy + 4 * Math.sin(a - 2.2));
  g.fill();
}

// ---------------------------------------------------------------- the orbiting bodies of level 4

export type BodyMood = 'happy' | 'cheer' | 'worried';
const band = (g: G, x: number, y: number, r: number, color: string) => {
  g.strokeStyle = color;
  g.lineWidth = 2;
  for (const dy of [-0.45, 0, 0.45]) {
    const hw = Math.sqrt(Math.max(0, 1 - dy * dy)) * r;
    line(g, x - hw, y + dy * r, x + hw, y + dy * r, color, 2);
  }
};
function sparkles(g: G, x: number, y: number, t: number) {
  for (let i = 0; i < 4; i++) {
    const a = t * 2 + (i * Math.PI) / 2;
    text(g, '✦', x + 20 * Math.cos(a), y + 20 * Math.sin(a) + 4, PAL.white, 11);
  }
}

/** The body scene of level 4, above y = 200, not to scale. */
export function bodyScene(g: G, id: string, scene: Scene, t: number, mood: BodyMood) {
  g.save();
  g.beginPath();
  g.rect(SCREEN.x + 5, SCREEN.y + 5, SCREEN.w - 10, 200 - SCREEN.y - 5);
  g.clip();
  let fx = 0;
  let fy = 0;
  let fr = 8;
  if (scene === 'cabin') {
    const a = 2 * t;
    fx = 360 + 44 * Math.cos(a);
    fy = 140 + 10 * Math.sin(a);
    fillRectC(g, 360, 96, 8, 6, '#9aa3c8');
    line(g, 360, 99, fx, fy, PAL.white, 1.2);
    dot(g, fx, fy, 8, '#c0392b');
    g.strokeStyle = PAL.white;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(fx, fy, 6, 0.3, 1.5);
    g.stroke();
  } else if (scene === 'earth') {
    dot(g, 400, 430, 270, '#2b6fd6');
    g.fillStyle = '#3a9a4a';
    g.beginPath();
    g.ellipse(340, 178, 30, 8, 0.1, 0, Math.PI * 2);
    g.ellipse(470, 182, 24, 7, -0.1, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(77,225,255,0.7)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(400, 430, 272, cv(-20), cv(20));
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.4)';
    g.lineWidth = 1.5;
    g.setLineDash([6, 6]);
    g.beginPath();
    g.arc(400, 430, 310, cv(-20), cv(20));
    g.stroke();
    g.setLineDash([]);
    fx = 400;
    fy = 120;
    if (id === 'station') {
      line(g, 366, 120, 434, 120, '#aab3d6', 3);
      for (const px of [372, 388, 412, 428]) {
        g.fillStyle = '#3a6fe0';
        g.fillRect(px - 5, 112, 10, 16);
      }
      dot(g, 400, 120, 5, '#d9def2');
      text(g, 'YOU ARE HERE', 424, 104, PAL.yellow, 11, 'right');
      g.restore();
      return;
    }
    g.fillStyle = '#3a6fe0';
    g.fillRect(372, 116, 24, 8);
    g.fillRect(404, 116, 24, 8);
    g.fillStyle = '#d9def2';
    g.fillRect(391, 111, 18, 18);
    g.strokeStyle = PAL.dim;
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(400, 106, 6, Math.PI, Math.PI * 2);
    g.stroke();
    fr = 7;
  } else if (scene === 'planet') {
    const parent = id === 'phobos' ? '#d0623a' : id === 'moon' ? '#2b6fd6' : '#d9a066';
    dot(g, 300, 140, 26, parent);
    if (id === 'phobos') dot(g, 300, 118, 6, PAL.white);
    else if (id === 'moon') {
      g.fillStyle = '#3a9a4a';
      g.fillRect(290, 134, 10, 6);
    } else band(g, 300, 140, 26, '#8a5a30');
    g.strokeStyle = 'rgba(255,255,255,0.4)';
    g.lineWidth = 1.5;
    g.setLineDash([6, 6]);
    g.beginPath();
    g.ellipse(300, 140, 110, 30, 0, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
    fx = 410;
    fy = 140;
    if (id === 'phobos') {
      g.fillStyle = '#8c8f9c';
      g.beginPath();
      g.ellipse(fx, fy, 8, 5, 0.3, 0, Math.PI * 2);
      g.fill();
      fr = 7;
    } else if (id === 'moon') {
      dot(g, fx, fy, 8, '#a8abb8');
      for (const [cx, cy] of [[-3, -3], [3, 2], [-2, 4]]) dot(g, fx + cx, fy + cy, 1.3, '#7c7f8c');
    } else if (id === 'io') {
      dot(g, fx, fy, 7, '#e8d34a');
      for (const [cx, cy] of [[-3, 2], [2, -3], [3, 3]]) dot(g, fx + cx, fy + cy, 1.3, PAL.orange);
      fr = 7;
    } else dot(g, fx, fy, 8, '#9a8f80');
  } else {
    const glare = g.createRadialGradient(176, 140, 40, 176, 140, 90);
    if (glare) {
      glare.addColorStop(0, 'rgba(255,210,63,0.6)');
      glare.addColorStop(1, 'rgba(255,210,63,0)');
      g.fillStyle = glare;
      g.beginPath();
      g.arc(176, 140, 90, 0, Math.PI * 2);
      g.fill();
    }
    dot(g, 176, 140, 40, PAL.yellow);
    g.strokeStyle = 'rgba(255,255,255,0.4)';
    g.lineWidth = 1.5;
    g.setLineDash([6, 6]);
    g.beginPath();
    g.arc(176, 140, 230, (-25 * Math.PI) / 180, (25 * Math.PI) / 180);
    g.stroke();
    g.setLineDash([]);
    fx = 406;
    fy = 140;
    const spec: Record<string, [number, string]> = { mars: [8, '#d0623a'], earth: [9, '#2b6fd6'], venus: [9, '#f0d9a0'], neptune: [12, '#3a5fd9'], jupiter: [14, '#d9a066'] };
    const [rr, col] = spec[id] ?? [8, PAL.dim];
    fr = rr;
    dot(g, fx, fy, rr, col);
    if (id === 'earth') {
      g.strokeStyle = PAL.white;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(fx, fy, 5, 0.5, 3.6);
      g.stroke();
    } else if (id === 'jupiter') band(g, fx, fy, rr, '#8a5a30');
  }
  face(g, fx, fy, Math.max(7, fr), mood, t);
  if (mood === 'cheer') sparkles(g, fx, fy, t);
  g.restore();
}
function fillRectC(g: G, cx: number, cy: number, w: number, h: number, color: string) {
  g.fillStyle = color;
  g.fillRect(cx - w / 2, cy - h / 2, w, h);
}

/** The data card of level 4: the body's name and its three numbers. */
export function dataCard(g: G, name: string, m: string, v: string, r: string) {
  g.fillStyle = 'rgba(10,16,48,0.85)';
  g.fillRect(428, 40, 196, 64);
  g.strokeStyle = PAL.dim;
  g.lineWidth = 1;
  g.strokeRect(428, 40, 196, 64);
  text(g, name, 436, 56, PAL.white, 12, 'left');
  text(g, m, 436, 72, PAL.white, 11, 'left', false);
  text(g, v, 436, 86, PAL.white, 11, 'left', false);
  text(g, r, 436, 100, PAL.white, 11, 'left', false);
}

/** The wave window of level 4. */
export function waveWindow(g: G, empty: boolean) {
  const { x, y, w, h } = WAVE_WIN;
  g.fillStyle = '#060b22';
  g.fillRect(x, y, w, h);
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1.5;
  g.strokeRect(x, y, w, h);
  g.globalAlpha = 0.25;
  line(g, x, WIN_MID, x + w, WIN_MID, PAL.dim, 1);
  g.globalAlpha = 1;
  if (empty) {
    text(g, '?', 400, 242, PAL.dim, 20);
    text(g, 'waves in view', 226, 220, PAL.dim, 11, 'left');
  }
}

/** The zoom lever's groove: ticks every 10 notches, no numbers. */
export function zoomTrack(g: G) {
  line(g, ZTRACK.x0, ZTRACK.y, ZTRACK.x1, ZTRACK.y, PAL.dim, 3);
  for (let i = 0; i <= 9; i++) {
    const x = ZTRACK.x0 + (i / 9) * (ZTRACK.x1 - ZTRACK.x0);
    line(g, x, ZTRACK.y - 6, x, ZTRACK.y + 6, PAL.dim, 1.5);
  }
  text(g, '−', 184, 316, PAL.dim, 12);
  text(g, '+', 628, 316, PAL.dim, 12);
}
