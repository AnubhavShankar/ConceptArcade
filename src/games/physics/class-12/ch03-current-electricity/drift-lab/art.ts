// Drawing for "The Slowest Race": the fairground at three times of day, the race table with Shelly's chalk lane, the glass tube with its copper core,
// the Zoom Lens showing Zip the free electron among copper ions, the race battery, the finish lamp, the photo-finish camera, the spool rack, the Marshal,
// the pace board and the photo frame. Nothing here knows the answer of a round: it draws the positions, moods and states it is handed.
// No Math.random: every wobble comes from the clock through `jit`.
import { PAL } from '@core/arcade';
import { glow, line, text } from '@core/neon';
import type { Fault, Round } from './logic';

export type G = CanvasRenderingContext2D;

export const TRACK = { x0: 92, x1: 540 }; // START and FINISH lines (swapped when a level 1 heat runs right to left)
export const LANE = { snailY: 222, wireY: 243 }; // Shelly's foot line; the wire's copper core
export const TUBE = { x0: 70, x1: 560, y0: 235, y1: 251 };
export const LENS = { x: 150, y: 110, r: 62 }; // the Zoom Lens window
export const BOX = { x: 12, y: 266, w: 122, h: 68 }; // the race battery
export const BOARD = { x: 470, y: 52, w: 152, h: 26 }; // the pace board (the helper)
export const RAIL = { x0: 170, x1: 556, y: 326 }; // levels 1, 2 and 4: the throttle rail
export const SWITCH = { x: 40, y: 222, len: 18 }; // level 1: the two-way arrow switch
export const RACK3 = { x0: 160, w: 25, y: 296, h: 34 }; // level 3: 16 spool slots, slot k holds a = 0.25 (k + 1)
export const RACK4 = { x0: 160, w: 25, y: 266, h: 28 }; // level 4: the same rack, raised
export const CAP = { left: TUBE.x0 + 6, right: TUBE.x1 - 6 }; // the tube's end caps
export const FRAME = { x: 235, y: 54, w: 170, h: 92 }; // the photo-finish frame at rest
export const finishX = (r: Round) => (r.kind === 'gate' && r.heading === 'left' ? TRACK.x0 : TRACK.x1);
export const startX = (r: Round) => (r.kind === 'gate' && r.heading === 'left' ? TRACK.x1 : TRACK.x0);
export const capX = (r: Round) => (startX(r) === TRACK.x0 ? CAP.left : CAP.right);
export const lampAt = (r: Round): [number, number] => [finishX(r) === TRACK.x1 ? 566 : 66, 160];
export const cameraAt = (r: Round): [number, number] => [finishX(r), 184];
export const slotX = (a: number) => RACK3.x0 + RACK3.w * (a / 0.25 - 1) + RACK3.w / 2;
export const reelR = (a: number, level: 3 | 4) => (level === 3 ? 4 + 2 * a : 3 + 2 * a);
export const facingOf = (r: Round): 1 | -1 => (finishX(r) > startX(r) ? 1 : -1);

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (u: number) => clamp01(u) * clamp01(u) * (3 - 2 * clamp01(u));
const frac = (v: number) => v - Math.floor(v);
/** A repeatable wobble in -0.5 to 0.5 from an integer-ish seed. */
export const jit = (n: number) => frac(Math.sin(n * 12.9898) * 43758.5453) - 0.5;
const INK = '#1b1030';

function dot(g: G, x: number, y: number, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}
function box(g: G, x: number, y: number, w: number, h: number, fill: string, edge?: string) {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  if (edge) {
    g.strokeStyle = edge;
    g.lineWidth = 1;
    g.strokeRect(x, y, w, h);
  }
}

// ---- the take: where Shelly and Zip are (all fixed, never in proportion to the error) -----------------------------------------------------------------------

/** Shelly's progress sp and Zip's track x for a take. `f` is the fault (null for a win). Positions use fixed values only. */
export function poses(r: Round, f: Fault | null, rt: number): { sp: number; zx: number; zp: number } {
  const s0 = startX(r);
  const s1 = finishX(r);
  let sp = 0;
  let zp = 0;
  if (f === 'backward') {
    sp = 0.25 * clamp01((rt - 0.1) / 0.5);
    return { sp, zp: 0, zx: s0 + (capX(r) - s0) * clamp01((rt - 0.1) / 0.5) };
  }
  if (f === 'fast') {
    zp = clamp01((rt - 0.1) / 0.9);
    sp = 0.6 * zp;
  } else if (f === 'slow') {
    sp = clamp01((rt - 0.1) / 1.5);
    zp = 0.6 * sp;
  } else {
    sp = clamp01((rt - 0.1) / 1.5);
    zp = sp;
  }
  return { sp, zp, zx: s0 + zp * (s1 - s0) };
}
/** When the leader crosses the line, or null if nobody does. */
export const crossAt = (f: Fault | null): number | null => (f === 'backward' ? null : f === 'fast' ? 1.0 : 1.6);

// ---- the fairground ----------------------------------------------------------------------------------------------------------------------------------------

const SKY = ['#14204a', '#1d2a3a', '#1b1033'];
const CROWD = [9, 11, 14];

/** Sky (opaque, full canvas), the ground below the table and the round's dressing, then the bunting. */
export function fairground(g: G, t: number, k: number, calm: boolean) {
  box(g, 0, 0, 640, 340, SKY[k]);
  box(g, 0, 262, 640, 78, '#10142c');
  if (k === 0) {
    dot(g, 618, 14, 8, '#e8ecff');
    for (let i = 0; i < 18; i++) dot(g, (i * 97 + 31) % 600 + 10, 60 + ((i * 41) % 90), 1.2, 'rgba(232,236,255,0.6)');
  }
  if (k === 1 && !calm) {
    g.strokeStyle = 'rgba(180,200,255,0.35)';
    g.lineWidth = 1;
    for (let j = 0; j < 40; j++) {
      const x = (j * 53 + 17) % 640;
      const y = (t * 300 + j * 37) % 340;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 3, y + 9);
      g.stroke();
    }
  }
  if (k === 2) {
    for (let j = 0; j < 14; j++) {
      g.globalAlpha = 0.55 + 0.45 * Math.sin((Math.PI * t) / 2 + j);
      glow(g, j % 2 ? PAL.pink : PAL.yellow, 6, () => dot(g, 30 + 42 * j, 47, 3, j % 2 ? PAL.pink : PAL.yellow));
    }
    g.globalAlpha = 1;
  }
  // bunting
  line(g, 0, 30, 640, 30, 'rgba(255,255,255,0.35)', 1);
  const cols = [PAL.pink, PAL.yellow, PAL.cyan];
  for (let x = 0, i = 0; x < 640; x += 16, i++) {
    g.fillStyle = cols[i % 3];
    g.beginPath();
    g.moveTo(x, 30);
    g.lineTo(x + 16, 30);
    g.lineTo(x + 8, 44);
    g.fill();
  }
}

/** The trophy of the grand final. */
export function trophy(g: G) {
  box(g, 462, 192, 16, 8, '#8a6a22');
  box(g, 468, 178, 4, 14, '#d4a93a');
  g.fillStyle = '#d4a93a';
  g.beginPath();
  g.moveTo(458, 150);
  g.lineTo(482, 150);
  g.lineTo(476, 176);
  g.lineTo(464, 176);
  g.closePath();
  g.fill();
  g.strokeStyle = '#d4a93a';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(457, 158, 6, Math.PI * 0.5, Math.PI * 1.5);
  g.arc(483, 158, 6, -Math.PI * 0.5, Math.PI * 0.5);
  g.stroke();
}

/** Dark silhouettes behind the table; `bob` lifts them on a win; round 2 holds umbrellas. */
export function crowd(g: G, k: number, bob: number) {
  const n = CROWD[k];
  for (let i = 0; i < n; i++) {
    const x = 30 + ((i + 0.5) * 580) / n + jit(i * 7.1) * 18;
    const y = 200 - 8 * frac(i * 0.618) - bob * (i % 2 ? 1 : 0.7);
    g.fillStyle = '#0d1124';
    g.beginPath();
    g.arc(x, y - 24, 9, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(x, y + 2, 17, 22, 0, Math.PI, Math.PI * 2);
    g.lineTo(x + 17, 206);
    g.lineTo(x - 17, 206);
    g.closePath();
    g.fill();
    if (k === 1) {
      g.fillStyle = i % 2 ? '#3b2a5a' : '#2a3f5a';
      g.beginPath();
      g.arc(x, y - 34, 18, Math.PI, Math.PI * 2);
      g.fill();
      line(g, x, y - 34, x, y - 18, '#0d1124', 2);
    }
  }
}

/** The race table: a plank, with its front edge. */
export function table(g: G) {
  box(g, 20, 200, 580, 56, '#5a3a22');
  box(g, 20, 256, 580, 6, '#3e2817');
  for (let i = 0; i < 6; i++) line(g, 24, 206 + i * 9 + jit(i) * 2, 596, 208 + i * 9 + jit(i + 9) * 2, 'rgba(0,0,0,0.12)', 1);
}

/** Chalk lines, START and FINISH. */
export function lanes(g: G, r: Round) {
  const s0 = startX(r);
  const s1 = finishX(r);
  line(g, TUBE.x0, 208, TUBE.x1, 208, 'rgba(255,255,255,0.6)', 1.5);
  line(g, TUBE.x0, 230, TUBE.x1, 230, 'rgba(255,255,255,0.6)', 1.5);
  line(g, s0, 202, s0, 232, 'rgba(255,255,255,0.9)', 3);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) box(g, s1 - 4 + j * 4, 208 + i * 4, 4, 4, (i + j) % 2 ? '#f4f6ff' : '#14182e');
  text(g, 'START', s0, 196, PAL.white, 11);
  text(g, 'FINISH', s1, 196, PAL.white, 11);
}

// ---- lamp, camera, tube, lens arm ----------------------------------------------------------------------------------------------------------------------------

/** The finish lamp on its post. `lit` 0..1 glow, `popped` hides the bulb. */
export function lamp(g: G, r: Round, lit: number, popped: boolean) {
  const [lx, ly] = lampAt(r);
  line(g, lx, 200, lx, ly + 9, '#4a4f6a', 4);
  box(g, lx - 9, ly + 9, 18, 4, '#6a5a2a');
  if (popped) {
    g.strokeStyle = '#555';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(lx, ly, 9, Math.PI * 0.25, Math.PI * 0.75);
    g.stroke();
    return;
  }
  dot(g, lx, ly, 9, '#333');
  if (lit > 0) {
    g.globalAlpha = lit;
    glow(g, PAL.yellow, 18, () => dot(g, lx, ly, 9, PAL.yellow));
    g.globalAlpha = 1;
  }
  g.strokeStyle = 'rgba(255,255,255,0.4)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(lx, ly, 9, 0, Math.PI * 2);
  g.stroke();
}

/** Glass shards flying from a blown bulb, `u` seconds after the pop. */
export function shards(g: G, r: Round, u: number) {
  const [lx, ly] = lampAt(r);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.6;
    const x = lx + Math.cos(a) * 60 * u;
    const y = ly + Math.sin(a) * 60 * u + 120 * u * u;
    g.globalAlpha = clamp01(1 - u / 0.6);
    dot(g, x, y, 2.5, '#dff3ff');
  }
  g.globalAlpha = 1;
}

/** The photo-finish box camera on a tripod at the finish line. */
export function camera(g: G, r: Round) {
  const [cx, cy] = cameraAt(r);
  const y = cy - 8;
  line(g, cx, y + 7, cx - 14, 199, '#4a4f6a', 2);
  line(g, cx, y + 7, cx + 14, 199, '#4a4f6a', 2);
  box(g, cx - 11, y - 7, 22, 14, '#2a2f48', '#8d93b5');
  dot(g, cx - 3, y, 4.5, '#10142c');
  dot(g, cx - 3, y, 2.5, '#5b78b8');
  box(g, cx + 5, y - 5, 4, 3, PAL.red);
}

/** The glass tube with its copper core and end caps. */
export function tube(g: G) {
  box(g, TUBE.x0, TUBE.y0, TUBE.x1 - TUBE.x0, TUBE.y1 - TUBE.y0, 'rgba(170,210,255,0.12)', 'rgba(200,230,255,0.6)');
  box(g, TUBE.x0, TUBE.y0, 4, TUBE.y1 - TUBE.y0, '#8d93b5');
  box(g, TUBE.x1 - 4, TUBE.y0, 4, TUBE.y1 - TUBE.y0, '#8d93b5');
  line(g, TUBE.x0 + 4, LANE.wireY, TUBE.x1 - 4, LANE.wireY, '#c8742c', 4);
}

/** The brass arm that holds the Zoom Lens over the tube. */
export function lensArm(g: G) {
  line(g, LENS.x, LENS.y + LENS.r, LENS.x, 235, '#c9a04a', 6);
  box(g, LENS.x - 9, 231, 18, 5, '#8a6a22');
}

/** The pulse of the field, running along the core at 3 x 10^8 m/s (drawn here as a white dot). */
export function signal(g: G, x: number) {
  glow(g, '#ffffff', 10, () => dot(g, x, LANE.wireY, 4, '#ffffff'));
}

/** Zip on the track: a glowing dot on the copper core. */
export function zipDot(g: G, x: number, t: number, calm: boolean) {
  const j = calm ? [0, 0] : [3 * Math.sin(7.3 * t) + 2 * Math.sin(11.1 * t), 2 * Math.sin(9.7 * t)];
  glow(g, PAL.cyan, 8, () => dot(g, x + j[0], LANE.wireY + j[1], 5, PAL.cyan));
}

// ---- Shelly ------------------------------------------------------------------------------------------------------------------------------------------------

export type ShellyState = 'idle' | 'racing' | 'win' | 'look' | 'sigh' | 'huh';
export interface ShellyOpts {
  facing: 1 | -1;
  state: ShellyState;
  /** The x where her slime trail begins, or null for none. */
  trailFrom: number | null;
  /** Seconds since the state began, for hearts and drooping. */
  u: number;
  scale?: number;
}

/** Shelly, the champion racing snail: foot on (x, y), about 58 px long, facing the finish. */
export function shelly(g: G, x: number, y: number, t: number, o: ShellyOpts) {
  const f = o.facing;
  const s = o.scale ?? 1;
  if (o.trailFrom !== null && s === 1 && (x - f * 26 - o.trailFrom) * f > 0) line(g, o.trailFrom, y - 1, x - f * 26, y - 1, 'rgba(200,230,255,0.5)', 2);
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  const ripple = o.state === 'racing' ? 1 + 0.05 * Math.sin(t * 9.4) : 1 + 0.02 * Math.sin(t * 3);
  // the foot
  g.fillStyle = '#9fb48a';
  g.beginPath();
  g.ellipse(0, -4, 29 * ripple, 4.5, 0, 0, Math.PI * 2);
  g.fill();
  // the head bump with a red sweatband
  g.beginPath();
  g.ellipse(f * 24, -9, 8, 7, 0, 0, Math.PI * 2);
  g.fill();
  box(g, f * 24 - 5, -14, 10, 3, '#d9323f');
  // the shell with its spiral and roundel
  dot(g, -f * 5, -17, 13, '#8a5a2b');
  g.strokeStyle = '#5e3a18';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(-f * 5, -17, 10, 0.4, 5.6);
  g.arc(-f * 5, -17, 6, 0.4, 5.6);
  g.stroke();
  dot(g, -f * 5, -17, 6.5, '#f4f6ff');
  if (s === 1) text(g, '7', -f * 5, -13, INK, 11);
  // the eye stalks sway, stand up on a win, droop on a sigh
  const sway = (k: number) => 8 * Math.sin(k);
  const stalks: [number, number][] = o.state === 'win' ? [[-3, 0], [3, 0]] : [[sway(2.1 * t), 0], [sway(2.7 * t + 1), 0]];
  stalks.forEach(([deg], i) => {
    let ang = (deg * Math.PI) / 180 + (i === 0 ? -0.18 : 0.18);
    if (o.state === 'sigh') ang = f * (0.7 * Math.min(1, o.u / 0.4)) + (i === 0 ? -0.1 : 0.1);
    if (o.state === 'look' || o.state === 'huh') ang += -f * 0.5 * Math.min(1, o.u / 0.3);
    const bx = f * (22 + i * 4);
    const ex = bx + Math.sin(ang) * 15;
    const ey = -12 - Math.cos(ang) * 15;
    line(g, bx, -11, ex, ey, '#9fb48a', 2);
    dot(g, ex, ey, 3.2, '#ffffff');
    dot(g, ex + f * 0.8, ey, 1.4, INK);
  });
  g.restore();
  if (o.state === 'win' && s === 1) {
    for (let i = 0; i < 2; i++) {
      g.globalAlpha = clamp01(1 - o.u / 1.2);
      text(g, '♥', x + (i ? 14 : -14), y - 40 - 22 * o.u, PAL.pink, 12);
    }
    g.globalAlpha = 1;
  }
}

// ---- Zip, the hero, in the Zoom Lens --------------------------------------------------------------------------------------------------------------------------

export type ZipMood = 'happy' | 'worried' | 'cheer' | 'dizzy';
export interface ZipOpts {
  mood: ZipMood;
  visor: boolean;
  facing: 1 | -1;
  /** 0 to 1: scarf stream and speed lines. */
  run: number;
  calm: boolean;
}

/** Zip: a crouched blue electron, radius 20, with a racing helmet, goggles, scarf, gloves and a bib. */
export function zipBig(g: G, x: number, y: number, t: number, o: ZipOpts) {
  const f = o.facing;
  const j = o.calm ? [0, 0] : [3 * Math.sin(7.3 * t) + 2 * Math.sin(11.1 * t), 2 * Math.sin(9.7 * t)];
  const cx = x + j[0];
  const cy = y + j[1];
  // speed lines trail behind him at the start of a run
  if (o.run > 0) for (let i = 0; i < 3; i++) line(g, cx - f * (26 + i * 6), cy - 8 + i * 8, cx - f * (44 + i * 10 + 8 * o.run), cy - 8 + i * 8, 'rgba(255,255,255,0.7)', 2);
  g.save();
  g.translate(cx, cy);
  g.rotate(f * 0.17);
  // the red scarf streams back
  const sx = -f * 14;
  const stream = 10 + 14 * o.run;
  g.fillStyle = '#d9323f';
  g.beginPath();
  g.moveTo(sx * 0.6, 8);
  g.quadraticCurveTo(sx - f * stream * 0.5, 12 + 3 * Math.sin(t * 6), sx - f * stream, 8 + 4 * Math.sin(t * 6 + 1));
  g.lineTo(sx - f * stream, 14 + 4 * Math.sin(t * 6 + 1));
  g.quadraticCurveTo(sx - f * stream * 0.4, 18, sx * 0.6, 14);
  g.closePath();
  g.fill();
  // arms and white racing gloves
  const up = o.mood === 'cheer';
  for (const side of [-1, 1]) {
    const hx = side * (up ? 21 : 19);
    const hy = up ? -16 : 8;
    line(g, side * 14, 6, hx, hy, '#3a6cff', 5);
    dot(g, hx, hy, 4, '#ffffff');
  }
  // the body
  glow(g, '#3a6cff', 12, () => dot(g, 0, 0, 20, '#3a6cff'));
  // the number bib, clipped to the body
  g.save();
  g.beginPath();
  g.arc(0, 0, 20, 0, Math.PI * 2);
  g.clip();
  box(g, -3, 6, 20, 12, '#f4f6ff');
  g.restore();
  text(g, 'e⁻', 7, 16, INK, 11);
  text(g, '−', -10, 17, '#ffffff', 13);
  // the face: eyes glance at Shelly now and then and close for a blink
  const blink = t % 3 < 0.12;
  const glance = t % 4 < 0.6 ? 2 : 0;
  const ey = -3;
  g.fillStyle = INK;
  g.strokeStyle = INK;
  g.lineWidth = 1.8;
  if (o.mood === 'dizzy') {
    for (const ex of [-6, 6]) {
      g.beginPath();
      for (let a = 0; a < 9; a += 0.4) g.lineTo(ex + Math.cos(a + t * 8) * (0.5 + a * 0.38), ey + Math.sin(a + t * 8) * (0.5 + a * 0.38));
      g.stroke();
    }
    g.beginPath();
    g.moveTo(-6, 8);
    g.quadraticCurveTo(-3, 5, 0, 8);
    g.quadraticCurveTo(3, 11, 6, 8);
    g.stroke();
  } else if (o.mood === 'cheer') {
    for (const ex of [-6, 6]) {
      g.beginPath();
      g.arc(ex, ey + 1, 3, Math.PI, Math.PI * 2);
      g.stroke();
    }
    g.beginPath();
    g.arc(0, 4, 6, 0.1 * Math.PI, 0.9 * Math.PI);
    g.stroke();
  } else {
    for (const ex of [-6, 6]) {
      if (blink) {
        g.beginPath();
        g.moveTo(ex - 3, ey);
        g.lineTo(ex + 3, ey);
        g.stroke();
      } else {
        dot(g, ex, ey, 3.4, '#ffffff');
        dot(g, ex + f * glance, ey + glance, 1.8, INK);
      }
    }
    g.beginPath();
    if (o.mood === 'worried') g.arc(0, 11, 5, 1.15 * Math.PI, 1.85 * Math.PI);
    else g.arc(0, 4, 5, 0.2 * Math.PI, 0.8 * Math.PI);
    g.stroke();
    if (o.mood === 'worried') dot(g, -15, -2 + ((t * 18) % 8), 2.4, PAL.cyan);
  }
  // the racing helmet with a dark visor and goggles pushed up
  g.fillStyle = PAL.cyan;
  g.beginPath();
  g.arc(0, -4, 21, Math.PI * 1.02, Math.PI * 1.98);
  g.lineTo(21, -9);
  g.lineTo(-21, -9);
  g.closePath();
  g.fill();
  line(g, -21, -9, 21, -9, '#2a8aa8', 2);
  if (o.visor) {
    g.globalAlpha = 0.85;
    box(g, -15, -9, 30, 11, '#10162e');
    g.globalAlpha = 1;
    line(g, -15, -6, 15, -6, 'rgba(120,180,255,0.6)', 1.5);
  } else {
    for (const gx of [-6, 6]) {
      dot(g, gx, -15, 4.2, '#10162e');
      dot(g, gx, -15, 2.4, '#5b9cd8');
    }
  }
  g.restore();
  if (o.mood === 'dizzy') {
    for (let i = 0; i < 3; i++) {
      const a = t * 6 + (i * Math.PI * 2) / 3;
      text(g, '★', cx + Math.cos(a) * 24, cy - 20 + Math.sin(a) * 6, PAL.yellow, 11);
    }
  }
  if (o.mood === 'cheer') for (let i = 0; i < 4; i++) text(g, '✦', cx + (i - 1.5) * 18, cy - 30 - 4 * Math.abs(Math.sin(t * 5 + i)), PAL.yellow, 11);
}

/** The Zoom Lens: a brass ring around a window with 4 x 6 copper ions and Zip. `drift` is how far Zip has gone (track px). */
export function lens(g: G, t: number, drift: number, zip: ZipOpts, calm: boolean) {
  g.save();
  g.beginPath();
  g.arc(LENS.x, LENS.y, LENS.r, 0, Math.PI * 2);
  g.clip();
  box(g, LENS.x - LENS.r, LENS.y - LENS.r, LENS.r * 2, LENS.r * 2, '#2a1608');
  const off = (((-drift * 0.5) % 18) + 18) % 18;
  for (let row = 0; row < 4; row++) {
    for (let col = -1; col < 7; col++) {
      const n = row * 11 + col + 3;
      const jx = calm ? 0 : jit(n * 1.7 + t * 9) * 3;
      const jy = calm ? 0 : jit(n * 2.3 + t * 8) * 3;
      const ix = LENS.x - 45 + col * 18 + off + jx;
      const iy = LENS.y - 27 + row * 18 + jy;
      dot(g, ix, iy, 7, PAL.orange);
      text(g, '+', ix, iy + 4, '#5a2a00', 11);
    }
  }
  zipBig(g, LENS.x, LENS.y, t, zip);
  g.restore();
  g.strokeStyle = '#c9a04a';
  g.lineWidth = 6;
  g.beginPath();
  g.arc(LENS.x, LENS.y, LENS.r, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.25)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(LENS.x, LENS.y, LENS.r - 6, Math.PI * 1.15, Math.PI * 1.45);
  g.stroke();
}

// ---- battery, cables, feeder, switch ----------------------------------------------------------------------------------------------------------------------------

/** The race battery with terminals and cables to both ends of the tube; level 3 adds the thick feeder and the given current. */
export function battery(g: G, level: 1 | 2 | 3 | 4, current: number) {
  // cables
  g.strokeStyle = '#2a2a30';
  g.lineWidth = 3;
  if (level !== 3) {
    g.beginPath();
    g.moveTo(TUBE.x0, 243);
    g.lineTo(TUBE.x0 + 3, 264);
    g.lineTo(30, 264);
    g.lineTo(30, 258);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(TUBE.x1, 243);
  g.lineTo(TUBE.x1 + 6, 264);
  g.lineTo(116, 264);
  g.lineTo(116, 260);
  g.stroke();
  if (level === 3) {
    box(g, 26, 243, 8, 22, '#c8742c');
    box(g, 26, 239, TUBE.x0 - 26, 8, '#c8742c');
  }
  box(g, BOX.x, BOX.y, BOX.w, BOX.h, '#1a1f3d', '#5a6290');
  box(g, 23, 257, 14, 10, '#d9323f');
  box(g, 109, 257, 14, 10, '#222');
  text(g, '+', 30, 266, PAL.white, 11);
  text(g, '−', 116, 266, PAL.white, 11);
  text(g, 'RACE BATTERY', 73, 284, PAL.white, 11);
  if (level === 3) text(g, `${current} A`, 73, 312, PAL.white, 14);
  else {
    line(g, 24, 300, 122, 300, '#2a3060', 2);
    line(g, 24, 316, 122, 316, '#2a3060', 2);
  }
}

/** The thick feeder's label (level 3). */
export function feederLabel(g: G, mm2: number) {
  text(g, `feeder ${mm2} mm²`, 40, 258, PAL.white, 11, 'left');
}

/** Level 1: a brass two-way knife switch on the table's left end. dir 1 puts the blade on the left contact. */
export function arrowSwitch(g: G, dir: number) {
  const hx = SWITCH.x;
  const hy = SWITCH.y;
  box(g, hx - 30, hy + 6, 60, 6, '#3a3f58');
  dot(g, hx - SWITCH.len, hy, 4, '#b87333');
  dot(g, hx + SWITCH.len, hy, 4, '#b87333');
  const tipX = hx + (dir ? -SWITCH.len : SWITCH.len);
  line(g, hx, hy, tipX, hy, '#e6c76a', 4);
  dot(g, hx, hy, 5, '#b87333');
  text(g, '←', hx - SWITCH.len, 198, PAL.white, 13);
  text(g, '→', hx + SWITCH.len, 198, PAL.white, 13);
}

// ---- rack, rail, grips -----------------------------------------------------------------------------------------------------------------------------------------

/** 16 wooden reels with copper windings; the chosen reel is raised and outlined. */
export function rack(g: G, level: 3 | 4, a: number) {
  const R = level === 3 ? RACK3 : RACK4;
  for (let k = 0; k < 16; k++) {
    const a2 = 0.25 * (k + 1);
    const chosen = a2 === a;
    const cx = slotX(a2);
    const cy = R.y + R.h / 2 - (chosen ? 3 : 0);
    dot(g, cx, cy, level === 3 ? 15 : 13, '#7a5230');
    dot(g, cx, cy, reelR(a2, level), '#c8742c');
    dot(g, cx, cy, 2.5, '#3e2817');
    if (chosen) {
      g.strokeStyle = PAL.yellow;
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(cx, cy, (level === 3 ? 15 : 13) + 1.5, 0, Math.PI * 2);
      g.stroke();
    }
  }
  for (const n of [1, 2, 3, 4]) text(g, String(n), slotX(n), level === 3 ? 338 : 304, PAL.dim, 11);
}

/** The throttle rail with its end values. */
export function rail(g: G, min: number, max: number) {
  line(g, RAIL.x0, RAIL.y, RAIL.x1, RAIL.y, PAL.dim, 3);
  text(g, String(min), RAIL.x0, 338, PAL.dim, 11);
  text(g, String(max), RAIL.x1, 338, PAL.dim, 11);
}

/** A grab handle: a disc, a white ring and an arrow glyph. */
export function grip(g: G, x: number, y: number, glyph: string, alpha = 1) {
  g.globalAlpha = alpha;
  dot(g, x, y, 14, '#2b3566');
  g.strokeStyle = '#ffffff';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(x, y, 14, 0, Math.PI * 2);
  g.stroke();
  text(g, glyph, x, y + 5, '#ffffff', 14);
  g.globalAlpha = 1;
}

/** The player's own setting on a dark backing, yellow. */
export function setting(g: G, s: string, x: number, y: number, align: CanvasTextAlign = 'center') {
  const w = s.length * 7.4 + 8;
  const x0 = align === 'center' ? x - w / 2 : align === 'left' ? x - 4 : x - w + 4;
  box(g, x0, y - 12, w, 16, '#0b1030');
  text(g, s, x, y, PAL.yellow, 12, align);
}

// ---- the Marshal -------------------------------------------------------------------------------------------------------------------------------------------

export type MarshalState = 'idle' | 'go' | 'win' | 'nope' | 'palm';

/** The Marshal: a boater, a striped blazer, a whistle, a stopwatch, a green flag and a chequered flag. Feet at (606, 334). `u` seconds in the state. */
export function marshal(g: G, t: number, state: MarshalState, u: number) {
  const x = 606;
  const tap = Math.sin(t * 8) > 0.7 ? -2 : 0;
  const shake = state === 'nope' ? Math.sin(u * 14) * 2.5 : 0;
  // legs and shoes
  box(g, x - 8, 312, 6, 20, '#2a2a40');
  box(g, x + 2, 312 + tap, 6, 20, '#2a2a40');
  box(g, x - 10, 330, 10, 4, '#14141e');
  box(g, x + 1, 330 + tap, 10, 4, '#14141e');
  // the striped blazer
  for (let i = 0; i < 7; i++) box(g, x - 14 + i * 4, 276, 4, 38, i % 2 ? '#f4f6ff' : '#d94a4a');
  // the chequered flag on its pole, leaning on the left, or waved overhead on a win
  const chequer = (px: number, py: number, w: number, h: number) => {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) box(g, px + (i * w) / 4, py + (j * h) / 3, w / 4, h / 3, (i + j) % 2 ? '#f4f6ff' : '#14182e');
  };
  if (state === 'win') {
    const ang = Math.sin(u * 10) * 0.45;
    const hx = x + 14;
    const hy = 270;
    const ex = hx + Math.sin(ang) * 34;
    const ey = hy - Math.cos(ang) * 34 - 6;
    line(g, x + 12, 284, hx, hy, '#7a5a2a', 5);
    line(g, hx, hy, ex, ey, '#c9ceea', 2.5);
    chequer(ex - (ang < 0 ? 0 : 0), ey, 22, 12);
  } else {
    line(g, x - 24, 332, x - 24, 270, '#c9ceea', 2.5);
    chequer(x - 24, 270, 18, 12);
  }
  // the green flag in the right hand: up, then swung down at the start
  if (state !== 'win') {
    const sw = state === 'go' ? ease(u / 0.12) : 0;
    const ang = -0.1 + sw * 1.7;
    const hx = x + 16;
    const hy = 290;
    const ex = hx + Math.sin(ang) * 28;
    const ey = hy - Math.cos(ang) * 28;
    line(g, x + 12, 286, hx, hy, '#7a5a2a', 5);
    line(g, hx, hy, ex, ey, '#c9ceea', 2.5);
    g.fillStyle = PAL.green;
    g.beginPath();
    g.moveTo(ex, ey);
    g.lineTo(ex + Math.cos(ang) * 14, ey + Math.sin(ang) * 14 - 2);
    g.lineTo(ex + Math.cos(ang) * 11, ey + Math.sin(ang) * 11 + 9);
    g.closePath();
    g.fill();
  }
  // the stopwatch in the left hand (no digits): lifted when she glances at it
  const glance = state === 'idle' && t % 3 < 0.7;
  const wy = glance ? 282 : 298;
  line(g, x - 12, 286, x - 17, wy, '#7a5a2a', 5);
  dot(g, x - 17, wy, 6, '#e8ebf6');
  dot(g, x - 17, wy, 4, '#ffffff');
  line(g, x - 17, wy, x - 15, wy - 3, INK, 1);
  box(g, x - 19, wy - 9, 4, 3, '#8d93b5');
  // the head, the whistle and the straw boater
  const hx = x + shake + (glance ? -3 : 0);
  line(g, x - 3, 276, x + 3, 288, '#d8d8e0', 1);
  box(g, x + 1, 286, 5, 4, '#c9ceea');
  dot(g, hx, 266, 9, '#f1c9a0');
  g.fillStyle = INK;
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  const eyeY = 265;
  if (state === 'go' || state === 'win') {
    dot(g, hx - 3, eyeY, 1.2, INK);
    dot(g, hx + 3, eyeY, 1.2, INK);
    g.beginPath();
    g.arc(hx, 268, 4, 0.1 * Math.PI, 0.9 * Math.PI);
    g.stroke();
  } else if (state === 'idle') {
    dot(g, hx - 3 + (glance ? -1 : 0), eyeY, 1.2, INK);
    dot(g, hx + 3 + (glance ? -1 : 0), eyeY, 1.2, INK);
    line(g, hx - 3, 270, hx + 3, 270, INK, 1.2);
  } else {
    dot(g, hx - 3, eyeY, 1.2, INK);
    dot(g, hx + 3, eyeY, 1.2, INK);
    g.beginPath();
    g.arc(hx, 272, 3.5, 1.15 * Math.PI, 1.85 * Math.PI);
    g.stroke();
  }
  g.fillStyle = '#e8d28a';
  g.beginPath();
  g.ellipse(hx, 259, 15, 3.2, 0, 0, Math.PI * 2);
  g.fill();
  box(g, hx - 8, 249, 16, 10, '#e8d28a');
  box(g, hx - 8, 255, 16, 3, '#d9323f');
  if (state === 'palm') {
    dot(g, hx + 2, 268, 6, '#f1c9a0');
    line(g, x + 12, 284, hx + 2, 268, '#d94a4a', 5);
  }
}

// ---- the pace board ----------------------------------------------------------------------------------------------------------------------------------------

/** The fairground scoreboard with the helper text (or dashes). */
export function board(g: G, s: string, color: string) {
  line(g, 546, BOARD.y + BOARD.h, 546, 200, '#3a3f58', 4);
  box(g, BOARD.x, BOARD.y, BOARD.w, BOARD.h, '#04060f', '#8d93b5');
  text(g, s, 546, 70, color, 12);
}

// ---- the photo-finish frame -------------------------------------------------------------------------------------------------------------------------------

export type Outcome = 'win' | Fault;
export const CAPTION: Record<Outcome, string> = {
  win: 'DEAD HEAT · RECORD!',
  slow: 'SHELLY ALONE · NO RECORD',
  fast: 'ZIP RAN AWAY',
  backward: 'WRONG WAY',
  dim: 'TOO DARK TO JUDGE',
  blown: 'NO LIGHT',
};

/** The photo slides down from above into FRAME. `y` is its top edge (-92 to 54). */
export function photo(g: G, o: Outcome, y: number, t: number) {
  const { x, w, h } = FRAME;
  const good = o === 'win';
  const dark = o === 'dim' || o === 'blown';
  box(g, x - 8, y, w + 16, h, '#10131f');
  for (let i = 0; i < 6; i++) {
    box(g, x - 6, y + 6 + i * 15, 5, 8, '#f4f6ff');
    box(g, x + w + 1, y + 6 + i * 15, 5, 8, '#f4f6ff');
  }
  box(g, x, y, w, h, dark ? '#000000' : '#2b4268');
  if (!dark) {
    box(g, x, y + 64, w, 10, '#5a3a22');
    line(g, x, y + 54, x + w, y + 54, 'rgba(255,255,255,0.5)', 1.5);
    const mx = x + w / 2;
    if (o === 'win') {
      shelly(g, mx - 16, y + 62, t, { facing: 1, state: 'win', trailFrom: null, u: 0, scale: 0.9 });
      glow(g, PAL.cyan, 8, () => dot(g, mx + 30, y + 66, 5, PAL.cyan));
    } else if (o === 'slow') shelly(g, mx, y + 62, t, { facing: 1, state: 'racing', trailFrom: null, u: 0, scale: 0.9 });
    else if (o === 'fast') glow(g, PAL.cyan, 8, () => dot(g, mx + 40, y + 66, 5, PAL.cyan));
  }
  g.strokeStyle = good ? PAL.green : PAL.red;
  g.lineWidth = 4;
  g.strokeRect(x + 2, y + 2, w - 4, h - 4);
  text(g, CAPTION[o], 320, y + 84, PAL.white, 12);
}

/** Confetti falling from the bunting; `u` seconds since the verdict. */
export function confetti(g: G, u: number) {
  const cols = [PAL.pink, PAL.yellow, PAL.cyan, PAL.green];
  for (let j = 0; j < 30; j++) {
    const x = 20 + ((j * 97) % 600);
    const y = 44 + 150 * u + 12 * Math.sin(5 * u + j);
    if (y > 340) continue;
    box(g, x, y, 4, 6, cols[j % 4]);
  }
}

/** The camera flash at the crossing: a pale rectangle over the finish line, alpha 0.45 falling to 0 over 0.15 s. */
export function flashRect(g: G, fx: number, u: number) {
  if (u < 0 || u > 0.15) return;
  g.fillStyle = `rgba(255,255,255,${(0.45 * (1 - u / 0.15)).toFixed(3)})`;
  g.fillRect(fx - 60, 150, 120, 112);
}
