// Drawing for Stage Lift: the hydraulic pillars and their ghosts, the stage slab and platforms, Kiko and Jax the free-runners, the crowd, the spotlights, the
// mixing desk and the equation band. Nothing here knows the answer of a round: it draws the heights, fader values and poses it is handed.
import { PAL } from '@core/arcade';
import { cuboid, face } from '@core/mathkit';
import { glow, line, text } from '@core/neon';
import type { Tok } from './logic';

export type G = CanvasRenderingContext2D;
export type Mood = 'happy' | 'worried' | 'cheer';
export type Pose = 'idle' | 'crouch' | 'air' | 'land' | 'slam' | 'fall' | 'flip' | 'cheer';

export const EQ = { y: 14, h: 76 };
export const STAGE = { x0: 34, floor: 262, dx: 58, backDx: 30, backDy: 30, unit: 7, w: 40, d: 26 };
export const STAGE2_X0 = 214;
export const DESK = { x0: 404, x1: 632, top: 104, trackTop: 132, trackBottom: 286, y1: 316 };
/** The desk's left edge: eight faders (level 3) get a wider desk so their grips (radius 18) never overlap their neighbours' grab zones. */
export const deskX0 = (n: number) => (n >= 7 ? 362 : DESK.x0);
const OX = STAGE.d * 0.5;
const OY = STAGE.d * 0.35;
const PW = 22;
const INK = '#1b1030';
const SKIN = '#f0c8a0';

function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// ---- Geometry ------------------------------------------------------------------------------------------------------------------------------------------

/** Front-bottom-left corner of pillar (i, j) of the stage whose left edge is x0: row 1 (i = 0) is the back row. */
export const base = (x0: number, i: number, j: number): [number, number] => (i === 1 ? [x0 + j * STAGE.dx, STAGE.floor] : [x0 + j * STAGE.dx + STAGE.backDx, STAGE.floor - STAGE.backDy]);
/** Where a runner's feet stand on the top of pillar (i, j) when it is `h` units high (negative heights sink it). */
export const stand = (x0: number, i: number, j: number, h: number): [number, number] => {
  const [bx, by] = base(x0, i, j);
  return [bx + STAGE.w / 2 + OX / 2, by - h * STAGE.unit - OY / 2];
};
/** The start platform (left of row 1) and the exit platform (left of row 2): corners and stand points. */
const startBase = (x0: number): [number, number] => [x0 + STAGE.backDx - PW - 14, STAGE.floor - STAGE.backDy];
const exitBase = (x0: number): [number, number] => [x0 - PW - 14, STAGE.floor];
export const startStand = (x0: number): [number, number] => [startBase(x0)[0] + PW / 2 + OX / 2, startBase(x0)[1] - OY / 2];
export const exitStand = (x0: number): [number, number] => [exitBase(x0)[0] + PW / 2 + OX / 2, exitBase(x0)[1] - OY / 2];

// ---- The stage -----------------------------------------------------------------------------------------------------------------------------------------

export interface PillarDraw {
  x0: number;
  cols: number;
  /** Heights in units, or null for a flat stage. */
  h: number[][] | null;
  /** 0 to 1: how far the pillars have risen. */
  rise: number;
  /** The card heights drawn as dashed ghosts, and their opacity. */
  ghost: number[][] | null;
  ghostAlpha: number;
  /** Pillars Kiko has landed on (row-major index by path order) and the pillar that failed. */
  landed: Set<string>;
  failed: string | null;
  t: number;
  /** Seconds since the pillars started to rise, for the steam (negative: none). */
  steam: number;
}

/** The dark slab the pillars stand on, with its neon rim, start platform and exit platform. */
export function slab(g: G, x0: number, cols: number) {
  const left = x0 - 40;
  const right = x0 + STAGE.backDx + (cols - 1) * STAGE.dx + STAGE.w + 14;
  const top = STAGE.floor - STAGE.backDy - OY - 2;
  g.fillStyle = '#0d1440';
  g.fillRect(left, top, right - left, STAGE.floor - top);
  g.fillStyle = '#141c55';
  g.fillRect(left, STAGE.floor, right - left, 20);
  line(g, left, STAGE.floor, right, STAGE.floor, PAL.cyan, 2);
  line(g, left, STAGE.floor + 20, right, STAGE.floor + 20, PAL.pink, 1.5);
  line(g, left, top, right, top, PAL.dim, 1);
  const [sx, sy] = startBase(x0);
  const [ex, ey] = exitBase(x0);
  cuboid(g, sx, sy, PW, STAGE.d, 0, '#1d2a6a', false);
  cuboid(g, ex, ey, PW, STAGE.d, 0, '#1d2a6a', false);
  // the labels stand above the runner's head, big enough to read
  text(g, 'START', startStand(x0)[0], startStand(x0)[1] - 48, PAL.green, 11);
  text(g, 'EXIT', exitStand(x0)[0], exitStand(x0)[1] - 48, PAL.yellow, 11);
}

const topFace = (g: G, x: number, y: number) => {
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + OX, y - OY);
  g.lineTo(x + STAGE.w + OX, y - OY);
  g.lineTo(x + STAGE.w, y);
  g.closePath();
};

function pillar(g: G, x: number, y: number, hu: number, rise: number, tone: string, name: string) {
  const px = hu * STAGE.unit * rise;
  let ty = y - px;
  if (px >= 0) {
    cuboid(g, x, y, STAGE.w, STAGE.d, px, '#1d2a6a', false);
  } else {
    // a sunk pillar: a dark shaft below the floor line, its top face at the bottom, and the floor edge redrawn in front
    ty = y - px;
    g.fillStyle = '#03040f';
    g.fillRect(x, y - OY, STAGE.w + OX, -px + OY);
    g.fillStyle = '#1d2a6a';
    g.fillRect(x, ty - 3, STAGE.w, 3);
    line(g, x - 2, y, x + STAGE.w + OX, y, PAL.cyan, 2);
  }
  g.save();
  g.shadowColor = tone;
  g.shadowBlur = 10;
  g.globalAlpha = 0.6;
  g.fillStyle = tone;
  topFace(g, x, ty);
  g.fill();
  g.restore();
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1;
  topFace(g, x, ty);
  g.stroke();
  text(g, name, x + (STAGE.w + OX) / 2, ty - OY / 2 + 4, PAL.white, 11);
}

function ghostBox(g: G, x: number, y: number, hu: number, alpha: number) {
  const top = y - hu * STAGE.unit;
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = PAL.pink;
  g.lineWidth = 1.6;
  g.setLineDash([4, 3]);
  topFace(g, x, top);
  g.stroke();
  g.beginPath();
  g.moveTo(x, top);
  g.lineTo(x, y);
  g.moveTo(x + STAGE.w, top);
  g.lineTo(x + STAGE.w, y);
  g.stroke();
  g.setLineDash([]);
  g.restore();
}

/** Steam puffs at the base of every pillar while it rises: decoration that does not depend on the heights. */
function steam(g: G, x0: number, cols: number, age: number) {
  if (age < 0 || age > 0.9) return;
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < cols; j++) {
      const [bx, by] = base(x0, i, j);
      for (let p = 0; p < 3; p++) {
        const a = Math.max(0, 1 - age / 0.9);
        g.globalAlpha = 0.45 * a;
        g.fillStyle = PAL.white;
        g.beginPath();
        g.arc(bx + 8 + p * 11 + Math.sin(age * 8 + p + j) * 3, by - 2 - age * (22 + p * 6), 2 + age * 5, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  g.globalAlpha = 1;
}

/** One stage: slab, back row, front row (each pillar after the row behind it), ghosts and steam. */
export function drawPillars(g: G, d: PillarDraw) {
  slab(g, d.x0, d.cols);
  for (const i of [0, 1]) {
    for (let j = 0; j < d.cols; j++) {
      const [bx, by] = base(d.x0, i, j);
      const key = `${i}${j}`;
      const tone = d.failed === key ? PAL.red : d.landed.has(key) ? PAL.green : PAL.cyan;
      pillar(g, bx, by, d.h ? d.h[i][j] : 0, d.rise, tone, `(${i + 1}, ${j + 1})`);
      if (d.ghost && d.ghostAlpha > 0) ghostBox(g, bx, by, d.ghost[i][j], d.ghostAlpha);
    }
  }
  steam(g, d.x0, d.cols, d.steam);
}

/** Dust where a runner lands: six small grey particles that fly out and fade (a function of the age only). */
export function dust(g: G, x: number, y: number, age: number) {
  if (age < 0 || age > 0.4) return;
  g.fillStyle = `rgba(190,196,220,${0.7 * (1 - age / 0.4)})`;
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + (i / 5) * Math.PI;
    g.beginPath();
    g.arc(x + Math.cos(a) * age * 50, y + Math.sin(a) * age * 26, 2.2 - age * 3, 0, Math.PI * 2);
    g.fill();
  }
}
/** Three stars circling above a head. */
export function stars(g: G, x: number, y: number, t: number) {
  for (let i = 0; i < 3; i++) {
    const a = t * 7 + (i * Math.PI * 2) / 3;
    text(g, '★', x + Math.cos(a) * 12, y + Math.sin(a) * 4, PAL.yellow, 11);
  }
}
/** A cartoon exclamation mark above a head. */
export const bang = (g: G, x: number, y: number) => text(g, '!', x, y, PAL.red, 18);

// ---- The runners ---------------------------------------------------------------------------------------------------------------------------------------

export interface RunnerOpts {
  pose: Pose;
  mood: Mood;
  facing: 1 | -1;
  look: 'kiko' | 'jax';
  /** Backflip angle in radians (0 normally). */
  rot?: number;
}

type Leg = [number, number, number, number];
const LEGS: Record<Pose, (t: number) => [Leg, Leg]> = {
  idle: () => [[-2, 10, -3, 17], [2, 10, 3, 17]],
  crouch: () => [[-6, 9, -7, 17], [6, 9, 7, 17]],
  land: () => [[-6, 9, -7, 17], [6, 9, 7, 17]],
  air: () => [[5, 7, -1, 13], [7, 9, 3, 11]],
  flip: () => [[5, 7, -1, 13], [7, 9, 3, 11]],
  slam: () => [[-6, 10, -9, 16], [6, 10, 9, 16]],
  fall: (t) => [[-2 + Math.sin(t * 30) * 4, 10, -4 + Math.sin(t * 30) * 5, 16 - Math.abs(Math.sin(t * 30)) * 3], [2 - Math.sin(t * 30) * 4, 10, 4 - Math.sin(t * 30) * 5, 16 - Math.abs(Math.cos(t * 30)) * 3]],
  cheer: () => [[-3, 10, -5, 17], [3, 10, 5, 17]],
};
const ARMS: Record<Pose, (t: number) => [[number, number], [number, number]]> = {
  idle: (t) => {
    const shake = t % 3 > 2.4;
    return shake ? [[-7, 3 + Math.sin(t * 40) * 3], [7, 3 - Math.sin(t * 40) * 3]] : [[-5 - Math.sin(t * 4), 6], [5 + Math.sin(t * 4), 6]];
  },
  crouch: () => [[-9, 3], [-5, 8]],
  land: () => [[-9, 3], [-5, 8]],
  air: () => [[-5, -18], [7, -17]],
  flip: () => [[-2, 0], [3, 1]],
  slam: () => [[-10, -10], [10, -10]],
  fall: (t) => [[-8, -15 + Math.sin(t * 25) * 4], [8, -15 - Math.sin(t * 25) * 4]],
  cheer: (t) => [[-9, -6 + Math.sin(t * 9) * 4], [7, -22]],
};

/** A leg as hip, knee and foot, with a sneaker; Kiko's soles glow cyan, Jax's pink. */
function leg(g: G, l: Leg, kiko: boolean) {
  line(g, 0, 3, l[0], l[1], kiko ? '#15151f' : SKIN, kiko ? 4.6 : 3.4);
  line(g, l[0], l[1], l[2], l[3], kiko ? '#15151f' : SKIN, kiko ? 4.6 : 3.4);
  g.fillStyle = PAL.white;
  g.beginPath();
  g.ellipse(l[2] + 1.5, l[3] + 0.8, kiko ? 4.2 : 4, kiko ? 2.3 : 3.2, 0, 0, Math.PI * 2);
  g.fill();
  glow(g, kiko ? PAL.cyan : PAL.pink, 6, () => line(g, l[2] - 2.6, l[3] + 3.2, l[2] + 5.4, l[3] + 3.2, kiko ? PAL.cyan : PAL.pink, 1.6));
}

/**
 * A free-runner about 34 px tall with feet at (x, y). Kiko: orange hoodie with the hood down, black joggers, white sneakers with glowing cyan soles, a red headband,
 * a swinging ponytail and wristbands. Jax: a green cap worn backwards, a purple tank top, baggy grey shorts and high-tops with pink soles.
 * Idle: bounces on her toes, breathes and shakes out her hands every 3 s. Poses squash and stretch the body; the face shows the mood.
 */
export function runner(g: G, x: number, y: number, t: number, o: RunnerOpts) {
  const kiko = o.look === 'kiko';
  const bob = o.pose === 'idle' ? 2 * Math.abs(Math.sin(t * 4)) : 0;
  const grounded = o.pose !== 'air' && o.pose !== 'flip';
  if (grounded) {
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath();
    g.ellipse(x, y + 1, 10, 3, 0, 0, Math.PI * 2);
    g.fill();
  }
  const sx = o.pose === 'slam' ? 0.55 : 1;
  const sy = o.pose === 'crouch' ? 0.8 : o.pose === 'land' ? 0.88 : o.pose === 'air' ? 1.1 : o.pose === 'slam' ? 1.08 : 1;
  g.save();
  g.translate(x, y - bob);
  g.scale(o.facing * sx, sy);
  g.translate(0, -17);
  g.rotate(o.rot ?? 0);
  const [l1, l2] = LEGS[o.pose](t);
  leg(g, l1, kiko);
  leg(g, l2, kiko);
  // torso (breathing)
  const br = 1 + 0.05 * Math.sin(t * 3);
  g.fillStyle = kiko ? '#ff8a2b' : '#8a4dff';
  rr(g, -5.5, -6.5, 11, 11.5 * br, 3);
  g.fill();
  if (kiko) {
    g.fillStyle = '#e06f10';
    g.beginPath();
    g.ellipse(-4.5, -6.5, 3.6, 2.4, 0, 0, Math.PI * 2);
    g.fill();
    line(g, -3, 1, 3, 1, '#e06f10', 1.2);
  } else {
    g.fillStyle = '#8b8fa3';
    g.beginPath();
    g.moveTo(-5.5, 3);
    g.lineTo(5.5, 3);
    g.lineTo(8, 10);
    g.lineTo(-8, 10);
    g.closePath();
    g.fill();
  }
  // head
  const hx = 1;
  const hy = -12;
  if (kiko) {
    line(g, -4, -15, -10 + Math.sin(t * 6) * 3, -9 + Math.cos(t * 5) * 2, '#3a2418', 3);
  }
  g.fillStyle = SKIN;
  g.beginPath();
  g.arc(hx, hy, 6.5, 0, Math.PI * 2);
  g.fill();
  if (kiko) {
    g.fillStyle = '#3a2418';
    g.beginPath();
    g.arc(hx - 1, hy - 1, 6.6, Math.PI * 1.02, Math.PI * 1.9);
    g.fill();
    line(g, hx - 6.2, hy - 3.2, hx + 6.8, hy - 3.2, PAL.red, 2.2);
    line(g, hx - 6.2, hy - 3.2, hx - 11, hy - 1 + Math.sin(t * 7) * 2, PAL.red, 1.6);
  } else {
    g.fillStyle = '#3ad06a';
    g.beginPath();
    g.arc(hx, hy - 1, 6.8, Math.PI, 2 * Math.PI);
    g.fill();
    g.fillRect(hx - 12, hy - 5, 8, 2.4);
  }
  face(g, hx + 2.5, hy + 0.5, 6, o.mood, t, INK);
  // arms
  const [a1, a2] = ARMS[o.pose](t);
  for (const a of [a1, a2]) {
    line(g, 0, -4, a[0], a[1], kiko ? '#ff8a2b' : SKIN, 3.2);
    line(g, a[0] * 0.82, a[1] * 0.82 + (a[1] < 0 ? 0.6 : -0.6), a[0], a[1], PAL.white, 2.6);
    g.fillStyle = SKIN;
    g.beginPath();
    g.arc(a[0] * 1.06, a[1] * 1.06 + (a[1] < 0 ? -0.8 : 0.8), 1.9, 0, Math.PI * 2);
    g.fill();
  }
  if (o.pose === 'cheer') {
    line(g, a2[0], a2[1] - 2, a2[0] - 2, a2[1] - 7, SKIN, 1.4);
    line(g, a2[0], a2[1] - 2, a2[0] + 2, a2[1] - 7, SKIN, 1.4);
  }
  g.restore();
}

// ---- Crowd, lights and desk ---------------------------------------------------------------------------------------------------------------------------

/** Sixteen silhouettes along the bottom edge: heads bob, glow sticks sway; cheering they jump, groaning they hold their heads. */
export function crowd(g: G, t: number, mood: 'idle' | 'cheer' | 'groan') {
  for (let i = 0; i < 16; i++) {
    const cx = 13 + i * 24;
    const ph = i * 1.7;
    const lift = mood === 'cheer' ? Math.abs(Math.sin(t * 8 + ph)) * 9 : mood === 'groan' ? -2 : Math.sin(t * 3 + ph) * 1.5;
    const cy = 334 - lift;
    g.fillStyle = '#04061a';
    g.beginPath();
    g.ellipse(cx, cy + 10, 11, 12, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(cx, cy - 1, 6, 0, Math.PI * 2);
    g.fill();
    if (mood === 'groan') {
      line(g, cx - 9, cy + 6, cx - 5, cy - 3, '#04061a', 3);
      line(g, cx + 9, cy + 6, cx + 5, cy - 3, '#04061a', 3);
    } else {
      const sway = Math.sin(t * (mood === 'cheer' ? 9 : 2) + ph) * (mood === 'cheer' ? 8 : 4);
      const col = i % 2 ? PAL.cyan : PAL.pink;
      line(g, cx + 6, cy + 4, cx + 9 + sway, cy - 12, '#04061a', 2.4);
      glow(g, col, 6, () => line(g, cx + 9 + sway, cy - 12, cx + 11 + sway * 1.3, cy - 22, col, 2.6));
    }
  }
}

/** Two beams from the top corners of the stage area, sweeping slowly; on a win they lock onto (lockX, lockY). */
export function spotlights(g: G, t: number, lock: { x: number; y: number; f: number } | null, beam = 'rgba(255,240,170,0.07)') {
  for (const [sx, dir] of [[10, 1], [390, -1]] as const) {
    const sweep = Math.sin(t * 0.7) * 0.28 * dir;
    let tx = sx + dir * 70 + sweep * 260;
    let ty = 250;
    if (lock) {
      tx += (lock.x - tx) * lock.f;
      ty += (lock.y - ty) * lock.f;
    }
    const a = Math.atan2(ty - 0, tx - sx);
    g.fillStyle = beam;
    g.beginPath();
    g.moveTo(sx, 0);
    g.lineTo(sx + Math.cos(a - 0.09) * 380, Math.sin(a - 0.09) * 380);
    g.lineTo(sx + Math.cos(a + 0.09) * 380, Math.sin(a + 0.09) * 380);
    g.closePath();
    g.fill();
  }
}

/** The x of fader idx of n, and the y of a knob at `value`. */
export const trackX = (idx: number, n: number) => deskX0(n) + 16 + (idx * (DESK.x1 - deskX0(n) - 32)) / (n - 1);
export const knobY = (value: number) => DESK.trackBottom - ((value + 9) / 18) * (DESK.trackBottom - DESK.trackTop);
/** The fader value for a pointer at height py. */
export const faderValue = (py: number) => -9 + ((DESK.trackBottom - py) / (DESK.trackBottom - DESK.trackTop)) * 18;

/**
 * The mixing desk: a dark panel with one fader per key (value above, name below) and a small LED meter beside each knob when there is room.
 * The knobs themselves (with their grips) are drawn by the caller on top, through `knob` in ux.ts, at (trackX, knobY).
 */
export function desk(g: G, keys: string[], values: Record<string, number>, label: (key: string) => string) {
  const n = keys.length;
  const x0 = deskX0(n);
  g.fillStyle = '#0a0f2c';
  rr(g, x0, DESK.top, DESK.x1 - x0, DESK.y1 - DESK.top, 8);
  g.fill();
  g.strokeStyle = PAL.dim;
  g.lineWidth = 1.5;
  g.stroke();
  for (const [sx, sy] of [[x0 + 8, DESK.top + 8], [DESK.x1 - 8, DESK.top + 8], [x0 + 8, DESK.y1 - 8], [DESK.x1 - 8, DESK.y1 - 8]]) {
    g.fillStyle = '#2a3070';
    g.beginPath();
    g.arc(sx, sy, 3, 0, Math.PI * 2);
    g.fill();
    line(g, sx - 2, sy - 2, sx + 2, sy + 2, PAL.dim, 1);
  }
  text(g, 'STAGE DESK · units', (x0 + DESK.x1) / 2, DESK.top + 11, PAL.dim, 11);
  keys.forEach((key, idx) => {
    const tx = trackX(idx, n);
    const v = values[key] ?? 0;
    line(g, tx, DESK.trackTop, tx, DESK.trackBottom, '#3a4590', 3);
    for (const tv of [-9, 0, 9]) line(g, tx - (tv === 0 ? 8 : 5), knobY(tv), tx + (tv === 0 ? 8 : 5), knobY(tv), tv === 0 ? PAL.dim : '#3a4590', 1);
    if (n < 7) {
      for (let s = 0; s < 9; s++) {
        const lit = s <= Math.round(((v + 9) / 18) * 8);
        g.fillStyle = lit ? (s > 6 ? PAL.red : s > 4 ? PAL.yellow : PAL.green) : '#1a2050';
        g.fillRect(tx + 14, DESK.trackBottom - 6 - s * ((DESK.trackBottom - DESK.trackTop - 8) / 8.5), 4, 8);
      }
    }
    text(g, v < 0 ? `−${-v}` : String(v), tx, DESK.trackTop - 6, PAL.yellow, 11);
    text(g, label(key), tx, DESK.trackBottom + 17, PAL.white, 11);
  });
}

// ---- The equation band ---------------------------------------------------------------------------------------------------------------------------------

const TONE = { unknown: PAL.yellow, known: PAL.white, card: PAL.pink };
interface Size { cw: number; ch: number; fs: number; sub: number }
// Every size is at least 11 px. Level 4 has no entry names under its cells, so its rows stay short and its yellow line fits under the grids.
const sizeFor = (level: number): Size => (level === 3 ? { cw: 22, ch: 26, fs: 11, sub: 11 } : level === 4 ? { cw: 26, ch: 22, fs: 12, sub: 11 } : { cw: 26, ch: 26, fs: 12, sub: 11 });

/** Width of one token. */
function tokWidth(tok: Tok, z: Size): number {
  if ('op' in tok) return tok.op.length > 1 ? 22 : 16;
  if ('rule' in tok) return tok.rule.length * 7 + 24;
  const chars = Math.max(...tok.grid.flat().map((c) => c.text.length));
  const cw = Math.max(z.cw, chars * 6.6 + 8);
  return cw * tok.grid[0].length + 12;
}

/**
 * The equation(s) of the round across the top as bracketed grids. Unknown matrices show the current fader values (yellow) with the entry names underneath,
 * known matrices are white and the card is pink. Level 3 writes its two equations on one line, smaller; level 4 writes expressions in the cells and lists the
 * letter values underneath. It is given the fader values only, never the computed heights.
 */
export function equationBand(g: G, eqs: Tok[][], level: number, below: string | null) {
  const z = sizeFor(level);
  const gap = level === 3 ? 34 : 0;
  const widths = eqs.map((eq) => eq.reduce((s, t) => s + tokWidth(t, z) + 4, 0));
  const total = widths.reduce((s, w) => s + w, 0) + gap * (eqs.length - 1);
  const k = Math.min(1, 620 / total);
  const gridTop = EQ.y + (level === 3 ? 26 : 18);
  const midY = gridTop + z.ch;
  const cy = EQ.y + 40;
  g.save();
  g.translate(320, cy);
  g.scale(k, k);
  g.translate(-total / 2, -cy);
  let x = 0;
  eqs.forEach((eq, ei) => {
    if (ei > 0) {
      text(g, 'and', x + gap / 2, midY + 4, PAL.dim, 11);
      x += gap;
    }
    for (const tok of eq) {
      const w = tokWidth(tok, z);
      if ('op' in tok) {
        text(g, tok.op, x + w / 2, midY + 6, PAL.dim, 16);
      } else if ('rule' in tok) {
        // a rule card: the rule in a pink box, with the ranges of i and j in small print underneath (no numbers of the card)
        const by = gridTop - 2;
        const bh = z.ch * 2 + 4;
        g.fillStyle = 'rgba(255,79,163,0.12)';
        rr(g, x + 2, by, w - 4, bh, 6);
        g.fill();
        g.strokeStyle = PAL.pink;
        g.lineWidth = 1.5;
        g.stroke();
        text(g, tok.rule, x + w / 2, by + bh * 0.42, PAL.pink, 13);
        text(g, tok.notes, x + w / 2, by + bh * 0.82, PAL.dim, 11);
        text(g, tok.label, x + w / 2, gridTop - 6, PAL.pink, 11);
      } else {
        const rows = tok.grid.length;
        const chars = Math.max(...tok.grid.flat().map((c) => c.text.length));
        const cw = Math.max(z.cw, chars * 6.6 + 8);
        const gx = x + 6;
        const col = TONE[tok.tone];
        // brackets
        for (const [bx, dx] of [[x + 2, 4], [x + w - 2, -4]] as const) {
          line(g, bx, gridTop - 2, bx, gridTop + rows * z.ch + 2, PAL.dim, 1.6);
          line(g, bx, gridTop - 2, bx + dx, gridTop - 2, PAL.dim, 1.6);
          line(g, bx, gridTop + rows * z.ch + 2, bx + dx, gridTop + rows * z.ch + 2, PAL.dim, 1.6);
        }
        tok.grid.forEach((row, i) =>
          row.forEach((c, j) => {
            const cx = gx + j * cw + cw / 2;
            if (c.sub) {
              text(g, c.text, cx, gridTop + i * z.ch + z.ch * 0.5, col, z.fs);
              text(g, c.sub, cx, gridTop + i * z.ch + z.ch * 0.5 + z.sub + 2, PAL.dim, z.sub);
            } else {
              text(g, c.text, cx, gridTop + i * z.ch + z.ch * 0.5 + 4, col, z.fs);
            }
          }),
        );
        text(g, tok.label, x + w / 2, gridTop - 6, tok.tone === 'card' ? PAL.pink : PAL.dim, 11);
      }
      x += w + 4;
    }
  });
  g.restore();
  if (below) text(g, below, 320, EQ.y + EQ.h - 4, PAL.yellow, 11);
}
