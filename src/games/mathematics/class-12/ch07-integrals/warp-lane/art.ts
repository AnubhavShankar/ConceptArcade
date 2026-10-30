// Drawing for Warp Lane: Zip the kart racer (round helmet with a lightning stripe and a visor, a flapping scarf, a low kart with fat tyres, a spoiler and twin
// exhausts), the twisty x-land track with its warp rings, the warp tubes, the straight u-lane with its ruler and mouths, the boost gauge and the ghost kart.
// Nothing here knows the answer of a round except the ghost, which draws only the clean line and only in round 1 (index.ts decides). The tubes, mouths and gauge
// follow the player's own setting, and the race (`racePose`) shows only what that setting did, with fixed effects that never grow with the size of the error.
import { PAL } from '@core/arcade';
import type { Values } from '@core/dialgame';
import { backdrop, face } from '@core/mathkit';
import { glow, line, text } from '@core/neon';
import { backwards, laneDir, outcome, RUN, sixths, uv, type Outcome, type Row } from './logic';

export type G = CanvasRenderingContext2D;
type P = [number, number];
export type KartMood = 'happy' | 'cheer' | 'worried' | 'dizzy';

/** The x-land track runs from the entry ring (x0) to the exit ring (x1); the kart waits at `park` and the finish line stands at `finish`. */
export const XLAND = { x0: 110, x1: 570, park: 64, finish: 606, top: 82, bottom: 132 };
export const ULANE = { x0: 40, x1: 600, y: 250, uMin: -5, uMax: 30 };
/** Where the kart's centre sits on the u-lane. */
export const LANE_C = ULANE.y - 8;
export const Ux = (u: number) => ULANE.x0 + ((u - ULANE.uMin) / (ULANE.uMax - ULANE.uMin)) * (ULANE.x1 - ULANE.x0);
export const uAt = (px: number) => ULANE.uMin + ((px - ULANE.x0) / (ULANE.x1 - ULANE.x0)) * (ULANE.uMax - ULANE.uMin);
/** Where the burst and the −1 float land: a fixed point at the finish line, whatever the setting. */
export const HIT: P = [600, 100];
/** The ghost kart's own colour: the tests look for it. */
export const GHOST = 'rgba(190,225,255,0.5)';
const SHIELD = '#12204a';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (u: number) => clamp01(u) * clamp01(u) * (3 - 2 * clamp01(u));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const finite = (v: number) => (Number.isFinite(v) ? v : 0);

function dot(g: G, x: number, y: number, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}
function limb(g: G, pts: P[], w: number, color: string) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.stroke();
  g.lineCap = 'butt';
}
function poly(g: G, pts: P[], fill: string) {
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  g.fill();
}

// ---- The x-land track --------------------------------------------------------------------------------------------------------------------------------------

const SAMPLES = 96;
const tracks = new WeakMap<object, number[]>();
/** The track's height on screen at 96 sample points: the graph of the integrand, scaled to fit, with no numbers (it is drawn to no scale). */
function trackYs(r: Row): number[] {
  let ys = tracks.get(r.f);
  if (ys) return ys;
  const vals = Array.from({ length: SAMPLES }, (_, i) => finite(r.f(r.a + ((r.b - r.a) * (i + 0.5)) / SAMPLES)));
  const lo = Math.min(...vals);
  const span = Math.max(...vals) - lo || 1;
  ys = vals.map((v) => XLAND.bottom - ((v - lo) / span) * (XLAND.bottom - XLAND.top));
  tracks.set(r.f, ys);
  return ys;
}
/** The track's height at screen x: flat on the lead-in and the lead-out. */
export function trackY(r: Row, x: number): number {
  const ys = trackYs(r);
  if (x <= XLAND.x0) return ys[0];
  if (x >= XLAND.x1) return ys[SAMPLES - 1];
  const f = ((x - XLAND.x0) / (XLAND.x1 - XLAND.x0)) * SAMPLES - 0.5;
  const i = Math.max(0, Math.min(SAMPLES - 2, Math.floor(f)));
  return lerp(ys[i], ys[i + 1], Math.max(0, Math.min(1, f - i)));
}
export const ringY = (r: Row, which: 'in' | 'out') => trackY(r, which === 'in' ? XLAND.x0 : XLAND.x1) - 16;
const kartY = (r: Row, x: number, scale: number) => trackY(r, x) - 14 * scale;

// ---- The warp tubes ------------------------------------------------------------------------------------------------------------------------------------------

export const bez = (p: P[], s: number): P => {
  const u = 1 - s;
  return [u * u * u * p[0][0] + 3 * u * u * s * p[1][0] + 3 * u * s * s * p[2][0] + s * s * s * p[3][0], u * u * u * p[0][1] + 3 * u * u * s * p[1][1] + 3 * u * s * s * p[2][1] + s * s * s * p[3][1]];
};
const bezAngle = (p: P[], s: number) => {
  const a = bez(p, Math.max(0, s - 0.01));
  const b = bez(p, Math.min(1, s + 0.01));
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
};
/** The entry tube: from the x-land entry ring down to the entry mouth, wherever the player has put it. */
export const tubeIn = (r: Row, v: Values): P[] => [[XLAND.x0, ringY(r, 'in')], [XLAND.x0, 190], [Ux(v.lo), 190], [Ux(v.lo), LANE_C]];
/** The exit tube: from the exit mouth up to the x-land exit ring. */
export const tubeOut = (r: Row, v: Values): P[] => [[Ux(v.hi), LANE_C], [Ux(v.hi), 190], [XLAND.x1, 190], [XLAND.x1, ringY(r, 'out')]];

function tubeLine(g: G, p: P[], a: number, b: number, w: number, color: string) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i <= 28; i++) {
    const [x, y] = bez(p, lerp(a, b, i / 28));
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  g.lineCap = 'butt';
}
/** A glowing tube with flowing light. A broken tube is cut in the middle, with sparks at both ends. */
export function tube(g: G, p: P[], color: string, t: number, broken = false) {
  const parts: [number, number][] = broken ? [[0, 0.44], [0.58, 1]] : [[0, 1]];
  for (const [a, b] of parts) {
    tubeLine(g, p, a, b, 12, '#0a1236');
    glow(g, color, 10, () => tubeLine(g, p, a, b, 7, color));
    tubeLine(g, p, a, b, 2.5, 'rgba(255,255,255,0.55)');
    for (let i = 0; i < 4; i++) {
      const s = lerp(a, b, (t * 0.7 + i / 4) % 1);
      const [x, y] = bez(p, s);
      dot(g, x, y, 2, PAL.white);
    }
  }
  if (broken) {
    for (const s of [0.44, 0.58]) {
      const [x, y] = bez(p, s);
      for (let i = 0; i < 4; i++) {
        const a = t * 17 + i * 1.7 + s * 9;
        const len = 5 + 5 * Math.abs(Math.sin(a * 1.3));
        line(g, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, PAL.yellow, 1.6);
      }
    }
  }
}

/** A warp ring standing on the track: a glowing rim, a dark throat and a spiral that spins faster while it swallows or spits out the kart. */
export function ring(g: G, x: number, y: number, t: number, swirl: number, color: string) {
  glow(g, color, 10 + 14 * swirl, () => {
    g.strokeStyle = PAL.green;
    g.lineWidth = 3.5;
    g.beginPath();
    g.ellipse(x, y, 9, 21, 0, 0, Math.PI * 2);
    g.stroke();
  });
  g.fillStyle = '#04081e';
  g.beginPath();
  g.ellipse(x, y, 7, 18, 0, 0, Math.PI * 2);
  g.fill();
  const spin = t * (2 + 12 * swirl);
  for (let i = 0; i < 3; i++) {
    g.strokeStyle = color;
    g.lineWidth = 1.6;
    g.globalAlpha = 0.45 + 0.5 * swirl;
    g.beginPath();
    g.ellipse(x, y, 5 - i, 14 - i * 3, 0, spin + i * 2.1, spin + i * 2.1 + 1.3);
    g.stroke();
  }
  g.globalAlpha = 1;
}

/** A mouth standing on the u-lane: a pipe end with a glowing rim; `capped` closes it with a red lid. */
export function mouth(g: G, x: number, color: string, label: string, capped: boolean) {
  const top = ULANE.y - 14;
  g.fillStyle = '#0d1640';
  g.fillRect(x - 12, top, 24, 22);
  g.strokeStyle = color;
  g.lineWidth = 1.5;
  g.strokeRect(x - 12, top, 24, 22);
  glow(g, color, 9, () => {
    g.strokeStyle = color;
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(x, top, 12, 4.5, 0, 0, Math.PI * 2);
    g.stroke();
  });
  g.fillStyle = capped ? PAL.red : '#04081e';
  g.beginPath();
  g.ellipse(x, top, 10, 3, 0, 0, Math.PI * 2);
  g.fill();
  if (capped) {
    line(g, x - 5, top - 2, x + 5, top + 2, PAL.white, 1.6);
    line(g, x - 5, top + 2, x + 5, top - 2, PAL.white, 1.6);
  }
  text(g, label, x, top + 16, color, 8);
}

/** A striped barrier across the lane: the dead end of a mouth that is not where the warp lands. */
export function barrier(g: G, x: number, a: number) {
  if (a <= 0) return;
  g.globalAlpha = clamp01(a);
  for (let i = 0; i < 5; i++) {
    g.fillStyle = i % 2 ? PAL.white : PAL.red;
    g.fillRect(x - 4, ULANE.y - 30 + i * 8, 8, 8);
  }
  g.globalAlpha = 1;
}

// ---- The scenery -------------------------------------------------------------------------------------------------------------------------------------------------

/** The backdrop, the sign with the integral, the x-land track with its finish line, and the u-lane with its ruler and the road marking. */
export function scenery(g: G, r: Row, t: number) {
  backdrop(g);
  g.fillStyle = 'rgba(30,40,110,0.28)';
  g.fillRect(0, 46, 640, 98);
  g.fillStyle = 'rgba(8,70,60,0.26)';
  g.fillRect(0, 222, 640, 74);
  text(g, 'x-land', 8, 60, PAL.dim, 10, 'left');
  text(g, 'u-land', 8, 236, PAL.dim, 10, 'left');
  // the sign
  g.fillStyle = '#0a1236';
  g.fillRect(140, 6, 360, 38);
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1.5;
  g.strokeRect(140, 6, 360, 38);
  text(g, r.text, 320, 24, PAL.white, 16);
  text(g, `${r.uText} · ${r.duText}`, 320, 38, PAL.cyan, 10);
  // the track
  const ys = trackYs(r);
  const pts: P[] = [[26, ys[0]], [XLAND.x0, ys[0]]];
  ys.forEach((y, i) => pts.push([XLAND.x0 + ((i + 0.5) / SAMPLES) * (XLAND.x1 - XLAND.x0), y]));
  pts.push([XLAND.x1, ys[SAMPLES - 1]], [632, ys[SAMPLES - 1]]);
  limb(g, pts, 9, '#10184a');
  glow(g, PAL.cyan, 8, () => limb(g, pts, 2.5, PAL.cyan));
  // start and finish
  const yEnd = ys[SAMPLES - 1];
  line(g, XLAND.finish, yEnd - 38, XLAND.finish, yEnd, PAL.white, 2);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
    g.fillStyle = (i + j) % 2 ? PAL.white : '#1b1030';
    g.fillRect(XLAND.finish + j * 5, yEnd - 38 + i * 5, 5, 5);
  }
  text(g, 'FINISH', XLAND.finish - 4, yEnd + 14, PAL.dim, 9);
  text(g, 'START', XLAND.park - 14, ys[0] + 14, PAL.dim, 9);
  // the u-lane
  g.fillStyle = '#121a44';
  g.fillRect(ULANE.x0 - 6, ULANE.y - 10, ULANE.x1 - ULANE.x0 + 12, 22);
  line(g, ULANE.x0 - 6, ULANE.y - 10, ULANE.x1 + 6, ULANE.y - 10, PAL.cyan, 2);
  line(g, ULANE.x0 - 6, ULANE.y + 12, ULANE.x1 + 6, ULANE.y + 12, PAL.cyan, 2);
  for (let x = ULANE.x0 + 8; x < ULANE.x1; x += 24) line(g, x, ULANE.y + 1, x + 10, ULANE.y + 1, 'rgba(244,246,255,0.18)', 1.5);
  for (let u = ULANE.uMin; u <= ULANE.uMax; u++) {
    const x = Ux(u);
    line(g, x, ULANE.y + 14, x, ULANE.y + (u % 5 === 0 ? 24 : 19), PAL.dim, 1);
    if (u % 5 === 0) text(g, uv(u), x, ULANE.y + 35, PAL.dim, 9);
  }
  // the u-integrand painted on the road
  for (const x of [150, 330, 510]) text(g, r.hText, x, ULANE.y + 5, 'rgba(255,210,63,0.5)', 13);
  void t;
}

/** The boost gauge below the ruler, reading the player's own boost. */
export function gauge(g: G, k: number) {
  const x0 = 60;
  const x1 = 260;
  const mid = (x0 + x1) / 2;
  const kx = mid + (k / 12) * ((x1 - x0) / 2);
  g.fillStyle = '#0a1236';
  g.fillRect(x0, 303, x1 - x0, 12);
  if (k !== 0) {
    g.fillStyle = k > 0 ? PAL.green : PAL.pink;
    g.fillRect(Math.min(mid, kx), 303, Math.abs(kx - mid), 12);
  }
  g.strokeStyle = PAL.dim;
  g.lineWidth = 1;
  g.strokeRect(x0, 303, x1 - x0, 12);
  for (let i = -12; i <= 12; i += 3) line(g, mid + (i / 12) * ((x1 - x0) / 2), 315, mid + (i / 12) * ((x1 - x0) / 2), i === 0 ? 322 : 319, PAL.dim, 1);
  line(g, kx, 299, kx, 319, PAL.white, 2.5);
  text(g, `boost ×${sixths(k)}`, 272, 314, PAL.white, 12, 'left');
  text(g, '−', 52, 314, PAL.pink, 12, 'right');
}

// ---- Zip and the kart ---------------------------------------------------------------------------------------------------------------------------------------------

export interface KartOpts {
  mood: KartMood;
  scale: number;
  flip: boolean;
  /** Rotation of the whole kart, radians (a tilt, a tumble, the angle of a tube). */
  rot: number;
  /** 0 to 1: the length of the exhaust flames. */
  flame: number;
  /** The tyre angle. */
  wheel: number;
  visorDown: boolean;
  stars: boolean;
  /** Draw only the translucent ghost kart. */
  ghost: boolean;
  /** Waiting: the engine rumbles, Zip drums on the wheel and glances at the warp sign. */
  idle: boolean;
}
const KART: KartOpts = { mood: 'happy', scale: 1, flip: false, rot: 0, flame: 0, wheel: 0, visorDown: false, stars: false, ghost: false, idle: false };

/** Zip in the kart, centred at (cx, cy), facing right unless flipped. */
export function kart(g: G, cx: number, cy: number, t: number, over: Partial<KartOpts> = {}) {
  const o = { ...KART, ...over };
  if (o.scale <= 0.02) return;
  const C = (c: string) => (o.ghost ? GHOST : c);
  g.save();
  g.translate(cx, cy);
  g.rotate(o.rot);
  g.scale(o.flip ? -o.scale : o.scale, o.scale);
  if (o.idle) g.translate(Math.sin(t * 57) * 0.6, Math.cos(t * 43) * 0.5);
  // the scarf, flapping behind
  const flap = o.idle ? 1.4 : 3.2;
  limb(g, [[-6, -18], [-13, -18 + Math.sin(t * 9) * flap * 0.5], [-20, -17 + Math.sin(t * 9 - 0.9) * flap], [-27, -18 + Math.sin(t * 9 - 1.8) * flap * 1.3]], 4, C(PAL.pink));
  // exhaust puffs and flames from the twin exhausts
  if (!o.ghost) {
    for (let i = 0; i < 3; i++) {
      const ph = (t * (o.idle ? 1.2 : 2.4) + i / 3) % 1;
      g.globalAlpha = 0.5 * (1 - ph);
      dot(g, -37 - ph * 24, 4 - ph * 10, 2 + ph * 4, '#aab2cc');
    }
    g.globalAlpha = 1;
    if (o.flame > 0) {
      const len = 4 + 18 * o.flame + Math.sin(t * 40) * 2;
      for (const fy of [4, 9]) {
        poly(g, [[-34, fy - 2], [-34 - len, fy], [-34, fy + 2]], PAL.orange);
        poly(g, [[-34, fy - 1], [-34 - len * 0.55, fy], [-34, fy + 1]], PAL.yellow);
      }
    }
  }
  // the tyres (rear, front), with spokes
  for (const [wx, wr] of [[-17, 8], [18, 7]] as const) {
    dot(g, wx, 9, wr, C('#1b1030'));
    dot(g, wx, 9, wr * 0.45, C(PAL.dim));
    for (let i = 0; i < 3; i++) {
      const a = o.wheel + (i * Math.PI) / 3;
      line(g, wx - Math.cos(a) * wr * 0.8, 9 - Math.sin(a) * wr * 0.8, wx + Math.cos(a) * wr * 0.8, 9 + Math.sin(a) * wr * 0.8, C(PAL.white), 1);
    }
  }
  // the body, its stripe, the spoiler and the twin exhausts
  limb(g, [[-24, -4], [-24, -15]], 2.5, C(PAL.dim));
  g.fillStyle = C(PAL.cyan);
  g.fillRect(-33, -19, 18, 4);
  g.fillStyle = C('#9aa3d6');
  g.fillRect(-36, 1, 9, 4);
  g.fillRect(-36, 6, 9, 4);
  poly(g, [[-29, 7], [-27, -3], [-10, -6], [6, -4], [22, 1], [31, 7], [26, 13], [-25, 13]], C(PAL.pink));
  line(g, -26, 4, 28, 4, C(PAL.yellow), 2);
  dot(g, 27, 5, 2, C(PAL.white));
  g.fillStyle = C('#1b1030');
  g.beginPath();
  g.ellipse(-3, -5, 9, 3.5, 0, 0, Math.PI * 2);
  g.fill();
  // the driver: jacket, arm on the wheel (or a fist in the air), head and helmet
  const drum = o.idle ? Math.sin(t * 14) * 1.6 : 0;
  line(g, 9, -12, 14, -5, C(PAL.dim), 2);
  limb(g, [[-3, -4], [-2, -15]], 10, C(PAL.cyan));
  if (o.mood === 'cheer' && !o.ghost) {
    limb(g, [[2, -15], [10, -26], [14, -35]], 4, PAL.cyan);
    dot(g, 14, -37, 3.6, PAL.yellow);
  } else limb(g, [[2, -15], [8, -10 + drum], [12, -8 + drum]], 4, C(PAL.cyan));
  const hx = o.idle ? 1 + Math.sin(t * 0.8) * 1.5 : 1;
  const hy = -25;
  dot(g, hx, hy, 10.5, C(PAL.yellow));
  poly(g, [[hx - 3, hy - 10], [hx + 1, hy - 10], [hx - 2, hy - 5], [hx + 1, hy - 5], [hx - 6, hy + 3], [hx - 4, hy - 3], [hx - 7, hy - 3]], C(PAL.pink));
  if (!o.ghost) {
    if (o.visorDown) {
      g.fillStyle = SHIELD;
      g.beginPath();
      g.ellipse(hx + 3.5, hy + 0.5, 8, 5.5, 0, 0, Math.PI * 2);
      g.fill();
      line(g, hx - 1, hy - 1.5, hx + 5, hy - 2.5, 'rgba(255,255,255,0.7)', 1.4);
    } else {
      dot(g, hx + 3, hy + 1, 7.2, '#ffd9b3');
      if (o.mood === 'dizzy') {
        g.strokeStyle = '#1b1030';
        g.lineWidth = 1.4;
        for (const ex of [hx - 0.2, hx + 6.2]) {
          line(g, ex - 1.8, hy - 2.2, ex + 1.8, hy + 1.4, '#1b1030', 1.4);
          line(g, ex - 1.8, hy + 1.4, ex + 1.8, hy - 2.2, '#1b1030', 1.4);
        }
        line(g, hx, hy + 5, hx + 2, hy + 4, '#1b1030', 1.3);
        line(g, hx + 2, hy + 4, hx + 4, hy + 5.2, '#1b1030', 1.3);
        line(g, hx + 4, hy + 5.2, hx + 6, hy + 4, '#1b1030', 1.3);
      } else face(g, hx + 3, hy + 1, 7, o.mood, t);
    }
  }
  if (o.stars && !o.ghost) {
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + (i * Math.PI * 2) / 3;
      const sx = hx + Math.cos(a) * 15;
      const sy = hy - 12 + Math.sin(a) * 5;
      poly(g, [[sx, sy - 3.5], [sx + 1.2, sy - 1.2], [sx + 3.5, sy], [sx + 1.2, sy + 1.2], [sx, sy + 3.5], [sx - 1.2, sy + 1.2], [sx - 3.5, sy], [sx - 1.2, sy - 1.2]], PAL.yellow);
    }
  }
  g.restore();
}

// ---- The race -----------------------------------------------------------------------------------------------------------------------------------------------------------

export interface Pose {
  where: 'x' | 'lane' | 'tube' | 'air';
  /** The kart's centre. */
  x: number;
  y: number;
  rot: number;
  scale: number;
  flip: boolean;
  mood: KartMood;
  flame: number;
  wheel: number;
  visorDown: boolean;
  stars: boolean;
  /** A spark riding the entry tube while Zip dives in. */
  spark: P | null;
  /** 0 to 1: how hard the x-land rings are swirling. */
  swirlIn: number;
  swirlOut: number;
  brokenTube: boolean;
  /** 0 to 1: how visible the barrier at the end of the lane is. */
  barrier: number;
  dir: 1 | -1;
}

/** Where the kart is and how it looks `rt` seconds after the race starts. It reads only the player's setting and the kind of outcome, with fixed effects. */
export function racePose(r: Row, v: Values, rt: number): Pose {
  const o: Outcome = outcome(r, v);
  const dir = laneDir(v);
  const back = backwards(r, v);
  const tin = tubeIn(r, v);
  const tout = tubeOut(r, v);
  const mx = Ux(v.lo);
  const hx = Ux(v.hi);
  const P: Pose = { where: 'x', x: XLAND.park, y: kartY(r, XLAND.park, 0.8), rot: 0, scale: 0.8, flip: false, mood: 'happy', flame: 0.3, wheel: 0, visorDown: true, stars: false, spark: null, swirlIn: 0, swirlOut: 0, brokenTube: false, barrier: 0, dir };

  // 0 to 0.3 s: along the x-land lead-in to the entry ring
  if (rt < RUN.into - 0.1) {
    const x = lerp(XLAND.park, XLAND.x0, rt / (RUN.into - 0.1));
    return { ...P, x, y: kartY(r, x, 0.8), wheel: x / 5 };
  }
  // 0.3 to 0.4 s: the dive, a spark runs down the tube (and stops at the break of a dead pipe)
  if (rt < RUN.into) {
    const p = (rt - (RUN.into - 0.1)) / 0.1;
    return { ...P, x: XLAND.x0 + 8 * p, y: kartY(r, XLAND.x0, 0.8) - 2 * p, scale: 0.8 * (1 - p), rot: Math.PI * 2 * p, swirlIn: p, spark: bez(tin, p * (o === 'entry' ? 0.5 : 1)), brokenTube: o === 'entry', wheel: XLAND.x0 / 5 };
  }
  P.swirlIn = Math.max(0, 1 - (rt - RUN.into) / 0.2);
  P.brokenTube = o === 'entry';

  // a wrong entry: the kart pops out of a dead mouth, hops, and tumbles off the lane (a fixed fall, whatever the guess)
  if (o === 'entry') {
    const t1 = rt - RUN.into;
    if (rt < RUN.into + 0.15) return { ...P, where: 'lane', x: mx, y: LANE_C - 24 * Math.sin((Math.PI * t1) / 0.15), scale: Math.min(1, 0.3 + t1 * 6), flame: 0 };
    const u2 = clamp01((rt - (RUN.into + 0.15)) / 0.55);
    return { ...P, where: 'lane', x: Math.min(624, mx + 36 * u2), y: LANE_C + 50 * u2 - 40 * Math.sin(Math.PI * u2), rot: 4.5 * Math.PI * u2, scale: 1, flame: 0, mood: 'dizzy', visorDown: false, stars: rt > 0.9, wheel: u2 * 9 };
  }

  const laneEnd = RUN.into + RUN.lane;
  const barrierA = o === 'exit' ? clamp01((rt - (laneEnd - 0.25)) / 0.2) : 0;
  // 0.4 to 1.4 s: along the u-lane from the entry mouth to the exit mouth, to the right or to the left
  if (rt < laneEnd) {
    const lx = lerp(mx, hx, ease((rt - RUN.into) / RUN.lane));
    return { ...P, where: 'lane', x: lx, y: LANE_C, scale: Math.min(1, 0.35 + (rt - RUN.into) * 5), flip: dir < 0, flame: Math.abs(v.k) / 12, wheel: lx / 6, barrier: barrierA };
  }
  const t2 = rt - laneEnd;
  // a wrong exit: the kart reaches the dead end and smashes into the barrier
  if (o === 'exit') {
    return { ...P, where: 'lane', x: hx - dir * 12 * ease(t2 / 0.2), y: LANE_C, rot: -dir * 0.3 * ease(t2 / 0.15), scale: 1, flip: dir < 0, flame: 0, mood: 'worried', visorDown: false, stars: t2 > 0.15, barrier: 1, wheel: hx / 6 };
  }
  // the exit is right: up the exit tube. The win and a fast kart climb at once; a slow one climbs a little, sputters and slides back.
  const tubeTime = o === 'win' ? 0.3 : 0.1;
  if (o === 'slow' || t2 < tubeTime) {
    const p = o === 'win' ? clamp01(t2 / 0.3) : o === 'fast' ? clamp01(t2 / 0.1) : t2 < 0.1 ? 0.45 * ease(t2 / 0.1) : t2 < 0.3 ? 0.45 + 0.012 * Math.sin(t2 * 90) : 0.45 * (1 - ease((t2 - 0.3) / 0.4));
    const [x, y] = bez(tout, p);
    return {
      ...P,
      where: 'tube',
      x,
      y,
      rot: bezAngle(tout, p) * Math.min(1, p / 0.1),
      scale: lerp(1, 0.45, clamp01(p / 0.12)),
      flame: o === 'slow' && t2 > 0.1 ? 0.15 + 0.25 * Math.abs(Math.sin(t2 * 40)) : 0.6,
      flip: o === 'slow' && back && p < 0.12,
      mood: o === 'slow' && t2 > 0.1 ? 'worried' : 'happy',
      visorDown: !(o === 'slow' && t2 > 0.1),
      swirlOut: o === 'slow' ? 0 : clamp01((p - 0.7) / 0.3),
      wheel: t2 * 12,
    };
  }
  if (o === 'win') {
    // 1.7 s on: out of the exit ring, over the finish line, cheering
    const t3 = rt - (laneEnd + 0.3);
    const x = lerp(XLAND.x1, 628, ease(t3 / 0.45));
    const scale = 0.8 * Math.min(1, 0.3 + t3 * 7);
    return { ...P, x, y: kartY(r, x, scale), scale, mood: 'cheer', visorDown: false, flame: 0.4, wheel: x / 5, swirlOut: Math.max(0, 1 - t3 / 0.3) };
  }
  // a fast kart pops out spinning, is flung back a fixed distance (never over the finish line) and lands dizzy, facing backwards if the boost points the wrong way
  const t3 = rt - (laneEnd + 0.1);
  const q = clamp01(t3 / 0.45);
  const x = XLAND.x1 - 22 * q;
  return { ...P, where: q < 1 ? 'air' : 'x', x, y: kartY(r, x, 0.8) - 46 * Math.sin(Math.PI * q), rot: 6 * Math.PI * q * (back ? -1 : 1), scale: 0.8, flip: back, flame: 0, mood: 'dizzy', visorDown: false, stars: t3 > 0.2, swirlOut: Math.max(0, 1 - t3 / 0.3), wheel: q * 12 };
}

/** The round 1 helper: a translucent ghost kart that loops the clean line (down the track, through the warp, along the lane from the right entry to the right exit). */
export const GHOST_PERIOD = 3.6;
export function ghostPose(r: Row, t: number): { x: number; y: number; scale: number; flip: boolean; wheel: number } | null {
  const gt = t % GHOST_PERIOD;
  if (gt < 0.5) {
    const x = lerp(XLAND.park, XLAND.x0, gt / 0.5);
    return { x, y: kartY(r, x, 0.8), scale: 0.8, flip: false, wheel: x / 5 };
  }
  if (gt < 0.65) return { x: XLAND.x0 + 8 * ((gt - 0.5) / 0.15), y: kartY(r, XLAND.x0, 0.8), scale: 0.8 * (1 - (gt - 0.5) / 0.15), flip: false, wheel: 0 };
  if (gt < 0.75) return null;
  const flip = r.hi < r.lo;
  if (gt < 1.75) {
    const x = lerp(Ux(r.lo), Ux(r.hi), ease((gt - 0.75) / 1.0));
    return { x, y: LANE_C, scale: Math.min(1, 0.35 + (gt - 0.75) * 5), flip, wheel: x / 6 };
  }
  if (gt < 1.95) return { x: Ux(r.hi), y: LANE_C, scale: 1 - (gt - 1.75) / 0.2, flip, wheel: 0 };
  return null;
}
