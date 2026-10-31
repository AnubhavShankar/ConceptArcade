// Art for "Line Down": the valley at night (sky, hills, substation, village, poles and wires, joint cards, road, the bucket truck), the pump house of level 5,
// and the characters Kabir (the lineworker) and Munni (the village girl). Every function only draws what it is handed: no rules, no Math.random
// (every scatter comes from the clock and a hash), and nothing here knows where the fault is.
import { PAL } from '@core/arcade';
import { line, text } from '@core/neon';
import { ABBR, JKM, LINE_KM, jointI, type JointRow } from './logic';

type G = CanvasRenderingContext2D;

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (u: number) => clamp01(u) * clamp01(u) * (3 - 2 * clamp01(u));
const frac = (v: number) => v - Math.floor(v);
export const jit = (n: number) => frac(Math.sin(n * 12.9898) * 43758.5453) - 0.5;

// ---- layout (a picture, not to scale with the answer) ----
export const KM = { x0: 60, px: 44 }; // road km 0 is x 60; km 12 is x 588
export const kmX = (km: number) => KM.x0 + KM.px * km;
export const POLE = { top: 150, base: 262 };
export const WIRE_Y = [154, 164];
export const ROAD = { y0: 268, y1: 294 };
export const TRUCK = { y: 280, w: 52, h: 22 };
export const CARD = { x: 12, y: 34, w: 220, h: 26 };
export const LCD = { x: 404, y: 34, w: 224, h: 24 };
export const JCARD = { y: 76, w: 50, h: 40 };
export const SW = { x0: 160, step: 32, w: 30, h: 24 };
export const ROWS = [214, 252, 290];
export const RES = { cx: 320, cy: 120, w: 120, h: 30 };
export const swX = (i: number) => SW.x0 + SW.step * i + SW.w / 2;
/** Where the truck's grip disc sits (on the bed), for a truck at x. */
export const gripAt = (x: number): [number, number] => [x + 9, TRUCK.y - 1];
/** Seconds the truck's beacon takes for one on and off (2 flashes a second). */
export const BEACON = 0.5;

export const SKY = ['#2a2140', '#141a2e', '#0c0f1c'];
export const BANNER = ['DUSK', 'NIGHT', 'MIDNIGHT STORM'];
export const BANNER5 = ['JOB 1', 'JOB 2', 'LAST JOB'];
export const SWATCH = ['#111111', '#7a4a21', '#dd3333', '#ff8800', '#ffdd33', '#22aa22', '#3366ff', '#9933cc', '#888888', '#eeeeee'];
const SWATCH_INK = ['#ffffff', '#ffffff', '#ffffff', '#000000', '#000000', '#ffffff', '#ffffff', '#ffffff', '#000000', '#000000'];

const dot = (g: G, x: number, y: number, r: number, c: string) => {
  g.fillStyle = c;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
};
const rect = (g: G, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
};
function rr(g: G, x: number, y: number, w: number, h: number, r: number, c: string) {
  g.fillStyle = c;
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
  g.fill();
}
const poly = (g: G, pts: [number, number][], c: string) => {
  g.fillStyle = c;
  g.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
  g.closePath();
  g.fill();
};

/** A pill of dark glass behind a line of text, so the words stay readable over the scene. */
export function tag(g: G, s: string, x: number, y: number, align: 'left' | 'right' | 'center', color: string = PAL.yellow, size = 12) {
  const w = s.length * (size * 0.58) + 8;
  const x0 = align === 'left' ? x - 4 : align === 'right' ? x - w + 4 : x - w / 2;
  rect(g, x0, y - size - 1, w, size + 6, '#0b1030');
  text(g, s, x, y, color, size, align);
}

/** A hand-drawn speech bubble (not an engine floater): a dark box with a white border and a tail pointing down-left. */
export function bubble(g: G, s: string, x: number, y: number, size = 12) {
  const w = s.length * (size * 0.58) + 14;
  rect(g, x - w / 2 - 1, y - size - 5, w + 2, size + 10, '#f4f6ff');
  rect(g, x - w / 2, y - size - 4, w, size + 8, '#0b1030');
  poly(g, [[x - 6, y + 4], [x + 2, y + 4], [x - 6, y + 11]], '#f4f6ff');
  text(g, s, x, y, PAL.white, size);
}

/** A board sign: a dark board with a yellow border and bold text. */
export function sign(g: G, s: string, cx: number, cy: number, w: number, h: number, size = 12, color: string = PAL.yellow) {
  rect(g, cx - w / 2 - 1.5, cy - h / 2 - 1.5, w + 3, h + 3, PAL.yellow);
  rect(g, cx - w / 2, cy - h / 2, w, h, '#0b1030');
  text(g, s, cx, cy + size * 0.35, color, size);
}

/** The truck's grip: a filled disc with a white ring and ⇔, on the bed. The engine draws the pulse ring and the dragged highlight. */
export function truckGrip(g: G, x: number, cue: boolean, t: number, calm: boolean) {
  const [gx, gy] = gripAt(x);
  dot(g, gx, gy, 12, '#2b3566');
  g.strokeStyle = PAL.white;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(gx, gy, 12, 0, Math.PI * 2);
  g.stroke();
  text(g, '⇔', gx, gy + 5, PAL.white, 13);
  if (cue) tag(g, 'drag ⇔', x, calm ? 246 : 246 + 3 * Math.sin(4 * t), 'center', PAL.yellow, 12);
}

/** The player's own setting on its dark backing. */
export const readout = (g: G, s: string, x: number, y: number) => tag(g, s, x, y, 'center', PAL.yellow, 12);

// ---- faces ----
type Mood = 'happy' | 'worried' | 'cheer';
/** A small face for a head at (x, y) with radius R; `squint` narrows the eyes to lines, blinks come from the clock (every 3 s). */
function headFace(g: G, x: number, y: number, R: number, mood: Mood, squint: boolean, t: number) {
  const ink = '#1b1030';
  g.strokeStyle = ink;
  g.fillStyle = ink;
  g.lineWidth = 1.3;
  const blink = t % 3 < 0.12;
  const ex = [x - R * 0.4, x + R * 0.4];
  if (mood === 'cheer') {
    for (const e of ex) {
      g.beginPath();
      g.arc(e, y - R * 0.05, R * 0.2, Math.PI, 2 * Math.PI);
      g.stroke();
    }
    g.beginPath();
    g.arc(x, y + R * 0.2, R * 0.4, 0.1 * Math.PI, 0.9 * Math.PI);
    g.stroke();
    return;
  }
  for (const e of ex) {
    if (squint || blink) line(g, e - R * 0.2, y - R * 0.05, e + R * 0.2, y - R * 0.05, ink, 1.3);
    else dot(g, e, y - R * 0.05, R * 0.15, ink);
  }
  g.strokeStyle = ink;
  g.beginPath();
  if (mood === 'worried') g.arc(x, y + R * 0.75, R * 0.3, 1.15 * Math.PI, 1.85 * Math.PI);
  else if (squint) {
    g.moveTo(x - R * 0.25, y + R * 0.45);
    g.lineTo(x + R * 0.25, y + R * 0.45);
  } else g.arc(x, y + R * 0.2, R * 0.32, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  if (mood === 'worried') dot(g, x - R * 1.05, y + ((t * 14) % 7), R * 0.18, PAL.cyan); // the sweat drop
}

// ---- Kabir ----
export interface KabirOpts {
  t: number;
  mood: Mood;
  squint?: boolean;
  /** The scale: 1 is about 46 px tall. */
  s?: number;
  kneel?: boolean;
  /** The hand's offset from the shoulder, in pixels at scale 1 (default: at his side). */
  hand?: [number, number];
  /** An insulated hot stick held in the hand: its angle in radians (0 is straight up), or null for none. */
  stick?: number | null;
  /** The glove wiping his face or scratching his helmet. */
  scratch?: boolean;
  fist?: boolean;
}
/** The hard hat with its headlamp, brim and the raindrop that falls from it every 0.7 s. */
function hat(g: G, x: number, y: number, R: number, t: number, lamp = true) {
  g.fillStyle = '#ffd400';
  g.beginPath();
  g.arc(x, y - R * 0.15, R * 1.12, Math.PI, 2 * Math.PI);
  g.fill();
  rect(g, x - R * 1.3, y - R * 0.2, R * 2.6, R * 0.35, '#e6b800');
  if (lamp) rect(g, x + R * 0.35, y - R * 0.85, R * 0.55, R * 0.4, '#ffffff');
  const q = (t / 0.7) % 1;
  g.globalAlpha = 1 - q;
  dot(g, x - R * 1.2, y + R * 0.15 + 8 * q, 1.1, '#9fd0ff');
  g.globalAlpha = 1;
}

/** Kabir at full height with the gear of his job: hard hat and headlamp, hi-vis cape with two reflective stripes, belt and pouch, long rubber gloves, chest meter, boots. */
export function kabir(g: G, x: number, y: number, o: KabirOpts) {
  const s = o.s ?? 1;
  const drop = o.mood === 'worried' ? 3 * s : 0; // shoulders dropped after a miss
  const hipY = y - (o.kneel ? 11 : 15) * s;
  const topY = y - (o.kneel ? 30 : 32) * s + drop;
  // legs and boots
  if (o.kneel) {
    line(g, x, hipY, x - 14 * s, y - 3 * s, '#27304f', 5 * s);
    rect(g, x - 20 * s, y - 5 * s, 8 * s, 4 * s, '#15151c');
    line(g, x, hipY, x + 8 * s, y - 4 * s, '#27304f', 5 * s);
    rect(g, x + 6 * s, y - 5 * s, 9 * s, 5 * s, '#15151c');
  } else {
    line(g, x - 3 * s, hipY, x - 3 * s, y - 3 * s, '#27304f', 5 * s);
    line(g, x + 4 * s, hipY, x + 4 * s, y - 3 * s, '#27304f', 5 * s);
    rect(g, x - 7 * s, y - 4 * s, 8 * s, 4 * s, '#15151c');
    rect(g, x, y - 4 * s, 8 * s, 4 * s, '#15151c');
  }
  // the orange hi-vis cape, with a belt, two white stripes, a pouch and the chest meter
  poly(g, [[x - 6 * s, topY], [x + 6 * s, topY], [x + 9 * s, hipY + 2 * s], [x - 9 * s, hipY + 2 * s]], '#ff7a1a');
  rect(g, x - 8 * s, hipY - 9 * s, 16 * s, 1.6 * s, '#ffffff');
  rect(g, x - 8.5 * s, hipY - 4.5 * s, 17 * s, 1.6 * s, '#ffffff');
  rect(g, x - 9 * s, hipY - 1.5 * s, 18 * s, 2.4 * s, '#3a2a18');
  rect(g, x + 4 * s, hipY - 1 * s, 5 * s, 5 * s, '#5a4026');
  rr(g, x - 4 * s, topY + 3 * s, 6 * s, 5 * s, 1, '#c8ccd8');
  dot(g, x - 1 * s, topY + 5.5 * s, 0.9 * s, PAL.green);
  // the arm: orange sleeve to the elbow, then a long black rubber glove
  const sh: [number, number] = [x + 5 * s, topY + 2 * s];
  const [hx, hy] = o.scratch ? [-2 * s, -9 * s] : (o.hand ?? [4, 12]).map((v) => v * s);
  const hand: [number, number] = [sh[0] + hx, sh[1] + hy];
  const elbow: [number, number] = [(sh[0] + hand[0]) / 2, (sh[1] + hand[1]) / 2];
  line(g, sh[0], sh[1], elbow[0], elbow[1], '#ff7a1a', 4.4 * s);
  line(g, elbow[0], elbow[1], hand[0], hand[1], '#101014', 4 * s);
  dot(g, hand[0], hand[1], 2.8 * s, '#101014');
  if (o.stick !== undefined && o.stick !== null) {
    const a = o.stick;
    const tip: [number, number] = [hand[0] + Math.sin(a) * 34 * s, hand[1] - Math.cos(a) * 34 * s];
    line(g, hand[0] - Math.sin(a) * 6 * s, hand[1] + Math.cos(a) * 6 * s, tip[0], tip[1], '#ffd400', 2.6 * s);
    g.strokeStyle = '#ffd400';
    g.lineWidth = 2 * s;
    g.beginPath();
    g.arc(tip[0] + Math.cos(a) * 2.5 * s, tip[1] + Math.sin(a) * 2.5 * s, 3 * s, 0, Math.PI * 1.3);
    g.stroke();
  }
  if (o.fist) dot(g, hand[0], hand[1] - 1, 3.4 * s, '#101014');
  // the head
  const hy2 = topY - 6.5 * s;
  dot(g, x, hy2, 6.2 * s, '#e0a878');
  headFace(g, x, hy2 + 1 * s, 6.2 * s, o.mood, !!o.squint, o.t);
  hat(g, x, hy2 - 1.5 * s, 6.2 * s, o.t);
}

/** Kabir's head and shoulders in the cab window (levels 1 to 4 before he climbs out): his hat, a wiping glove every 5 s, blinks and the sway of his headlamp are drawn here. */
export function kabirCab(g: G, x: number, y: number, t: number, mood: Mood) {
  const hx = x - 16;
  const hy = y - 10;
  poly(g, [[hx - 8, y - 5], [hx + 8, y - 5], [hx + 9, y - 1], [hx - 9, y - 1]], '#ff7a1a');
  rect(g, hx - 6, y - 4, 12, 1.2, '#ffffff');
  dot(g, hx, hy, 4.6, '#e0a878');
  headFace(g, hx, hy + 0.8, 4.6, mood, false, t);
  hat(g, hx, hy - 1.4, 4.6, t);
  if (t % 5 < 0.5) dot(g, hx + 1, hy + 2, 3, '#101014'); // wipes his face with a glove
}

// ---- Munni ----
export interface MunniOpts {
  t: number;
  mood: 'idle' | 'win' | 'miss';
  /** Seconds since the win began (for the two jumps). */
  u?: number;
  h?: number;
}
/** Munni, a village girl in a yellow raincoat with a lantern: it swings, the flame flickers, she hops from foot to foot, jumps twice on a win and dims the lantern on a miss. */
export function munni(g: G, x: number, y: number, o: MunniOpts) {
  const { t } = o;
  const hop = o.mood === 'win' ? 9 * Math.abs(Math.sin(((o.u ?? 0) * Math.PI) / 0.4)) * (o.u! < 0.8 ? 1 : 0) : t % 2 < 0.25 ? 2.5 * Math.sin(((t % 2) * Math.PI) / 0.25) : 0;
  const by = y - hop;
  const lift = o.mood === 'win' ? 12 : 0;
  rect(g, x - 5, by - 3, 4, 3, '#2a1a10');
  rect(g, x + 1, by - 3, 4, 3, '#2a1a10');
  line(g, x - 3, by - 10, x - 3, by - 3, '#8a5a3a', 2.4);
  line(g, x + 3, by - 10, x + 3, by - 3, '#8a5a3a', 2.4);
  poly(g, [[x - 4, by - 22], [x + 4, by - 22], [x + 8, by - 8], [x - 8, by - 8]], '#ffcc1a');
  dot(g, x, by - 25.5, 5, '#c98a5a');
  g.fillStyle = '#1a0f0a';
  g.beginPath();
  g.arc(x, by - 26.5, 5.2, Math.PI, 2 * Math.PI);
  g.fill();
  const mood: Mood = o.mood === 'win' ? 'cheer' : o.mood === 'miss' ? 'worried' : 'happy';
  headFace(g, x, by - 25, 5, mood, false, t);
  // the lantern: it hangs from her raised hand and swings ±6°
  const px = x - 8;
  const py = by - 17 - lift;
  const swing = ((o.mood === 'win' ? 3 : 6) * Math.PI) / 180 * Math.sin(2.6 * t);
  line(g, x - 4, by - 20, px, py, '#ffcc1a', 2.6);
  const lx = px + Math.sin(swing) * 6;
  const ly = py + Math.cos(swing) * 6;
  line(g, px, py, lx, ly, '#6a5a40', 1);
  const dim = o.mood === 'miss';
  g.globalAlpha = dim ? 0.5 : 1;
  dot(g, lx, ly + 3, 14, 'rgba(255,200,90,0.12)');
  rect(g, lx - 2.5, ly, 5, 7, '#6a5a40');
  dot(g, lx, ly + 3.5, 3 + 0.6 * Math.sin(9 * t), '#ffdd77');
  g.globalAlpha = 1;
}

// ---- the valley ----
/** The sky of one round (opaque, so the grid never shows), its rain, and the far lightning bolt. */
export function sky(g: G, k: number, t: number, calm: boolean) {
  rect(g, 0, 0, 640, 340, SKY[k]);
  const n = [25, 45, 70][k];
  const tt = calm ? 0 : t;
  g.strokeStyle = 'rgba(180,200,255,0.35)';
  g.lineWidth = 1;
  g.beginPath();
  for (let j = 0; j < n; j++) {
    const x = (j * 53 + 17) % 640;
    const y = (tt * 320 + j * 37) % 340;
    g.moveTo(x, y);
    g.lineTo(x - 3, y + 10);
  }
  g.stroke();
  if (k === 2 && !calm && t % 4 < 0.08) {
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(470, 70);
    g.lineTo(458, 92);
    g.lineTo(468, 98);
    g.lineTo(452, 124);
    g.lineTo(460, 128);
    g.lineTo(446, 150);
    g.stroke();
  }
}
/** The one full-canvas flash of the boss round's storm: alpha 0.25 for 0.08 s every 4 s. Draw it last. */
export function lightning(g: G, k: number, t: number, calm: boolean) {
  if (k === 2 && !calm && t % 4 < 0.08) rect(g, 0, 0, 640, 340, 'rgba(255,255,255,0.25)');
}

/** Two dark green hill silhouettes from y 90 to the ground, opaque. */
export function hills(g: G) {
  const ridge = (pts: [number, number][], c: string) => poly(g, [...pts, [640, 268], [0, 268]], c);
  ridge([[0, 120], [80, 98], [170, 128], [260, 92], [360, 126], [450, 100], [540, 130], [640, 104]], '#14261c');
  ridge([[0, 160], [90, 138], [200, 166], [310, 140], [420, 170], [520, 144], [640, 168]], '#1b3324');
  rect(g, 0, 262, 640, 6, '#10261a');
}

/** The substation: a fence, a finned transformer, a control hut, the gantry at x 60 and the breaker lamp (green, or red after a trip). */
export function substation(g: G, t: number, tripped: boolean) {
  rect(g, 4, 196, 52, 66, '#161c2b');
  for (let x = 6; x < 56; x += 6) line(g, x, 222, x, 262, '#6b7488', 1);
  line(g, 4, 224, 56, 224, '#6b7488', 1);
  line(g, 4, 250, 56, 250, '#6b7488', 1);
  rect(g, 12, 230, 18, 22, '#7d8597');
  for (let i = 0; i < 4; i++) rect(g, 10, 233 + i * 5, 3, 3, '#a6aebf');
  rect(g, 34, 236, 18, 16, '#3a4458');
  rect(g, 38, 240, 5, 5, '#ffd23f');
  line(g, 52, 150, 52, 200, '#5b4630', 3);
  line(g, 46, 198, 58, 198, '#9aa3b5', 2);
  dot(g, 30, 206, 4, tripped ? PAL.red : PAL.green);
  if (tripped && Math.floor(t * 6) % 2 === 0) dot(g, 30, 206, 7, 'rgba(255,90,90,0.35)');
  tag(g, 'SUBSTATION', 6, 190, 'left', PAL.white, 11);
}

export type VKind = 'houses' | 'health' | 'school' | 'market';
const HOUSES = [{ x: 590, w: 10, h: 24 }, { x: 599, w: 11, h: 32 }, { x: 609, w: 10, h: 22 }, { x: 618, w: 10, h: 28 }, { x: 627, w: 9, h: 20 }];
/** The village: five small houses with two windows each that light yellow one at a time (`lit` of 10); the health centre, school or market stalls are marked by shape and word. */
export function village(g: G, kind: VKind, lit: number, t: number) {
  HOUSES.forEach((h, i) => {
    const top = 262 - h.h;
    rect(g, h.x, top, h.w, h.h, '#2b3140');
    poly(g, [[h.x - 1, top], [h.x + h.w / 2, top - 5], [h.x + h.w + 1, top]], '#3d2b2b');
    for (let w = 0; w < 2; w++) {
      const on = i * 2 + w < lit;
      rect(g, h.x + 1.5 + w * 4.2, top + 8, 3, 3.4, on ? PAL.yellow : '#0b1020');
      if (on) {
        g.globalAlpha = 0.25;
        dot(g, h.x + 3 + w * 4.2, top + 9.7, 5, PAL.yellow);
        g.globalAlpha = 1;
      }
    }
  });
  if (kind === 'health') {
    const lamp = lit >= 10;
    rect(g, 597, 213, 16, 13, '#e8eaf0');
    text(g, '+', 605, 225, lamp ? PAL.red : '#a05060', 16);
    if (lamp) {
      g.globalAlpha = 0.25 + 0.15 * Math.sin(6 * t);
      dot(g, 605, 219, 11, PAL.red);
      g.globalAlpha = 1;
    }
  } else if (kind === 'school') {
    rect(g, 620, 224, 6, 10, '#3d3a50');
    poly(g, [[619, 224], [623, 217], [627, 224]], '#4a3030');
    dot(g, 623, 229, 1.8, PAL.yellow);
  } else if (kind === 'market') {
    for (let i = 0; i < 4; i++) {
      rect(g, 590 + i * 11, 252, 9, 3, i % 2 ? '#e8eaf0' : '#d33');
      rect(g, 591 + i * 11, 255, 1, 7, '#6b7488');
    }
    for (let i = 0; i <= 5; i++) dot(g, 590 + i * 9, 236 + 3 * Math.sin((i / 5) * Math.PI), 1.4, lit >= 4 ? PAL.yellow : '#4a4a5a');
  }
}

/** The height of wire i (0 upper, 1 lower) at x: a gentle sag that peaks mid-span (deeper over a stretched span). */
export function wireYAt(x: number, i: 0 | 1, slide?: number): number {
  const km = (x - KM.x0) / KM.px;
  const s = Math.max(0, Math.min(LINE_KM - 1, Math.floor(km)));
  const sag = slide !== undefined && s === slide ? 16 : 10;
  const u = km - s;
  return WIRE_Y[i] + 4 * sag * u * (1 - u);
}

/** The poles and the two wires; in level 4 the stretched span sags 16 px and its far pole leans 6°, with a mud slope and a sign. */
export function powerLine(g: G, slide?: number) {
  if (slide !== undefined) {
    const cx = kmX(slide + 0.5);
    poly(g, [[cx - 8, 132], [cx + 10, 132], [cx + 62, 262], [cx - 70, 262]], '#5a3e26');
  }
  for (let km = 0; km <= LINE_KM; km++) {
    const x = kmX(km);
    if (slide !== undefined && km === slide + 1) {
      g.save();
      g.translate(x, 154);
      g.rotate((6 * Math.PI) / 180);
      rect(g, -3, -4, 6, 112, '#5b4630');
      rect(g, -10, -2, 20, 3, '#6b5238');
      g.restore();
    } else {
      rect(g, x - 3, POLE.top, 6, POLE.base - POLE.top, '#5b4630');
      rect(g, x - 10, 152, 20, 3, '#6b5238');
    }
  }
  g.strokeStyle = '#9aa3b5';
  g.lineWidth = 1.5;
  for (const i of [0, 1] as const) {
    g.beginPath();
    g.moveTo(kmX(0), WIRE_Y[i]);
    for (let km = 0; km < LINE_KM; km++) {
      const sag = slide !== undefined && km === slide ? 16 : 10;
      g.quadraticCurveTo(kmX(km + 0.5), WIRE_Y[i] + 2 * sag, kmX(km + 1), WIRE_Y[i]);
    }
    g.stroke();
  }
}

/** The road, its dashed centre line, and a post and label at every kilometre so the signs can be read off the scale. */
export function road(g: G) {
  rect(g, 0, ROAD.y0, 640, ROAD.y1 - ROAD.y0, '#2b2f38');
  line(g, 0, 281, 640, 281, '#e8eaf0', 1.5, [10, 10]);
  rect(g, 0, ROAD.y1, 640, 46, '#0b1030');
  for (let km = 0; km <= LINE_KM; km++) {
    const x = kmX(km);
    rect(g, x - 1, 296, 2, 6, '#ffffff');
    text(g, String(km), x, 314, PAL.dim, 11);
  }
}

/** Level 2: eight trace cards (the joint's current from −2 V to +2 V; no numbers), a dashed drop to each sleeve, and the sleeves. */
export function jointCards(g: G, r: JointRow, sleeve: { j: number; state: 'old' | 'gone' | 'new' } | null) {
  for (let j = 1; j <= 8; j++) {
    const x = kmX(JKM[j - 1]);
    const cy = JCARD.y + 20;
    const sy = wireYAt(x, 0);
    line(g, x, JCARD.y + JCARD.h, x, sy - 3, 'rgba(143,155,214,0.4)', 1, [3, 3]);
    rect(g, x - JCARD.w / 2 - 1, JCARD.y - 1, JCARD.w + 2, JCARD.h + 2, '#f4f6ff');
    rect(g, x - JCARD.w / 2, JCARD.y, JCARD.w, JCARD.h, '#0b1030');
    line(g, x - 22, cy, x + 22, cy, PAL.dim, 1);
    line(g, x, JCARD.y + 3, x, JCARD.y + JCARD.h - 3, PAL.dim, 1);
    g.strokeStyle = PAL.cyan;
    g.lineWidth = 2;
    g.beginPath();
    for (let q = 0; q <= 20; q++) {
      const V = -2 + q * 0.2;
      const px = x + 10 * V;
      const py = cy - 2.2 * jointI(r, j, V);
      if (q === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
    text(g, `J${j}`, x, JCARD.y + 52, PAL.white, 11);
    const st = sleeve && sleeve.j === j ? sleeve.state : 'old';
    if (st !== 'gone') rect(g, x - 5, sy - 3, 10, 6, st === 'new' ? '#ffffff' : '#7d8597');
  }
}

/** The bucket truck: a white line-crew truck with a cab on the left (Kabir in its window), a ladder rack, a folded boom and the beacon. The boom unfolds when `boom` is a bucket position. */
export function truck(g: G, x: number, y: number, o: { wheel: number; beacon: boolean; cab: 'happy' | 'worried' | 'cheer' | null; t: number; boom: [number, number] | null; folded: boolean }) {
  // bed and chassis
  rect(g, x - 26, y - 11, 52, 16, '#f2f4f8');
  rect(g, x - 26, y - 17, 18, 22, '#f2f4f8');
  rect(g, x - 24, y - 15, 14, 9, '#16203a'); // the cab window
  rect(g, x - 26, y + 3, 52, 2, '#c33');
  // ladder rack: red and white
  for (let i = 0; i < 6; i++) rect(g, x - 6 + i * 5, y - 16, 5, 3, i % 2 ? '#e8eaf0' : '#d33');
  // the beacon
  rect(g, x - 20, y - 20, 8, 3, '#8a8f9c');
  dot(g, x - 16, y - 22, 3, o.beacon ? PAL.orange : '#6a4a2a');
  if (o.beacon) {
    g.globalAlpha = 0.3;
    dot(g, x - 16, y - 22, 8, PAL.orange);
    g.globalAlpha = 1;
  }
  if (o.cab) kabirCab(g, x, y, o.t, o.cab);
  text(g, 'LINE CREW', x, y + 2, '#3a4458', 11, 'center', false);
  // wheels turn when it moves
  for (const wx of [x - 14, x + 15]) {
    dot(g, wx, y + 5, 6, '#111318');
    dot(g, wx, y + 5, 2.4, '#8a8f9c');
    line(g, wx, y + 5, wx + Math.cos(o.wheel) * 5, y + 5 + Math.sin(o.wheel) * 5, '#8a8f9c', 1.2);
  }
  if (o.folded) {
    line(g, x - 2, y - 10, x + 22, y - 10, '#ffd400', 3);
    rect(g, x + 21, y - 13, 6, 5, '#ffd400');
  }
  if (o.boom) {
    const [bx, by] = o.boom;
    line(g, x + 4, y - 10, bx, by + 9, '#ffd400', 4);
    rr(g, bx - 8, by, 16, 10, 2, '#ffd400');
    rect(g, bx - 6, by + 2, 12, 7, '#5a4a10');
  }
}

/** The headlamp beam: a faint cone from the head, or a swept cone landing on the wires. */
export function beam(g: G, x0: number, y0: number, x1: number, alpha: number) {
  poly(g, [[x0, y0], [x1 - 26, 146], [x1 + 26, 176]], `rgba(255,230,140,${alpha})`);
}

/** The faint idle beam of Kabir's headlamp, swaying ±10° with sin(1.3t) (still when `calm`). */
export function idleBeam(g: G, x: number, y: number, t: number, calm: boolean) {
  const a = ((calm ? 0 : 10) * Math.PI / 180) * Math.sin(1.3 * t) - 0.25;
  const L = 60;
  poly(g, [[x, y], [x + Math.cos(a - 0.18) * L, y + Math.sin(a - 0.18) * L], [x + Math.cos(a + 0.18) * L, y + Math.sin(a + 0.18) * L]], 'rgba(255,230,140,0.12)');
}

/** The fault, drawn only on a win: the two wires twisted together with a broken branch hanging on them; `apart` (0 to 1) springs them back. */
export function fault(g: G, x: number, apart: number) {
  const a = ease(apart);
  const y0 = wireYAt(x, 0);
  const y1 = wireYAt(x, 1);
  const ya = y0 + (y1 - y0) * 0.5 * (1 - a);
  const yb = y1 - (y1 - y0) * 0.5 * (1 - a);
  g.strokeStyle = '#d6dbe8';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x - 14, y0);
  g.quadraticCurveTo(x, ya, x + 14, y0);
  g.moveTo(x - 14, y1);
  g.quadraticCurveTo(x, yb, x + 14, y1);
  g.stroke();
  if (a < 1) {
    g.globalAlpha = 1 - a;
    line(g, x - 4, (y0 + y1) / 2, x + 14, (y0 + y1) / 2 + 22, '#6a4a2a', 3);
    line(g, x + 4, (y0 + y1) / 2 + 8, x + 14, (y0 + y1) / 2 + 6, '#2f6a2f', 4);
    g.globalAlpha = 1;
  }
}

/** A white glow pulse (radius 4, glow 10) at x on the upper wire. */
export function pulse(g: G, x: number) {
  g.save();
  g.shadowColor = '#ffffff';
  g.shadowBlur = 10;
  dot(g, x, wireYAt(x, 0), 4, '#ffffff');
  g.restore();
}

// ---- the pump house (level 5) ----
/** The pump house room: a brick wall, a window with rain (heavier each job, lightning at the last), and a wooden floor from y 316. */
export function room(g: G, k: number, t: number, calm: boolean) {
  rect(g, 0, 0, 640, 340, '#3a2420');
  g.strokeStyle = '#2a1a16';
  g.lineWidth = 1;
  g.beginPath();
  for (let y = 12; y < 316; y += 12) {
    g.moveTo(0, y);
    g.lineTo(640, y);
    for (let x = ((y / 12) % 2) * 20; x < 640; x += 40) {
      g.moveTo(x, y);
      g.lineTo(x, y + 12);
    }
  }
  g.stroke();
  rect(g, 0, 316, 640, 24, '#5a3d22');
  line(g, 0, 316, 640, 316, '#3a2814', 2);
  // the window
  rect(g, 36, 36, 88, 68, '#8a8f9c');
  rect(g, 40, 40, 80, 60, SKY[k]);
  const n = [12, 24, 40][k];
  const tt = calm ? 0 : t;
  g.strokeStyle = 'rgba(180,200,255,0.5)';
  g.lineWidth = 1;
  g.beginPath();
  for (let j = 0; j < n; j++) {
    const x = 40 + ((j * 29 + 7) % 80);
    const y = 40 + ((tt * 140 + j * 23) % 60);
    g.moveTo(x, y);
    g.lineTo(x - 2, Math.min(100, y + 7));
  }
  g.stroke();
  if (k === 2 && !calm && t % 4 < 0.08) rect(g, 40, 40, 80, 60, 'rgba(255,255,255,0.7)');
  line(g, 80, 40, 80, 100, '#8a8f9c', 2);
  line(g, 40, 70, 120, 70, '#8a8f9c', 2);
}

export interface BoardOpts {
  b: [number, number, number];
  /** How far the resistor has dropped into its slot, in px. */
  drop: number;
  ledRed: boolean;
  relayOn: boolean;
  fuse: 'ok' | 'blown';
}
/** The controller board: gold traces, the glass fuse, the relay, an LED and the resistor with its three bands (set by the player) and a gold tolerance band. */
export function board(g: G, o: BoardOpts) {
  rect(g, 170, 60, 300, 110, '#0f4a2a');
  g.strokeStyle = '#c9a227';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(180, 120);
  g.lineTo(260, 120);
  g.moveTo(380, 120);
  g.lineTo(440, 120);
  g.lineTo(440, 128);
  g.moveTo(180, 150);
  g.lineTo(460, 150);
  g.moveTo(440, 84);
  g.lineTo(440, 100);
  g.stroke();
  // the glass fuse
  rr(g, 426, 80, 28, 8, 3, o.fuse === 'ok' ? 'rgba(200,230,255,0.6)' : 'rgba(80,80,90,0.7)');
  if (o.fuse === 'ok') line(g, 430, 84, 450, 84, '#e0e0e0', 1);
  // the relay
  rect(g, 423, 128, 34, 24, '#8a8f9c');
  rect(g, 428, 132, 24, 6, o.relayOn ? PAL.green : '#555b6a');
  text(g, 'RELAY', 440, 148, '#1a1a22', 11);
  // the LED
  dot(g, 200, 84, 4, o.ledRed ? PAL.red : '#2f7a4a');
  // the resistor slot and body
  rect(g, 258, 112, 4, 16, '#c9a227');
  rect(g, 378, 112, 4, 16, '#c9a227');
  const cy = RES.cy + o.drop;
  line(g, 240, cy, 260, cy, '#cfd3de', 2);
  line(g, 380, cy, 400, cy, '#cfd3de', 2);
  rr(g, RES.cx - RES.w / 2, cy - RES.h / 2, RES.w, RES.h, 12, '#e8d3a0');
  [290, 312, 334].forEach((bx, i) => rect(g, bx, cy - RES.h / 2, 10, RES.h, SWATCH[o.b[i]]));
  rect(g, 370, cy - RES.h / 2, 10, RES.h, '#d4af37');
}

/** The three swatch rows (band 1: brown to white, band 2: black to white, multiplier: black to blue), each swatch labelled, the chosen one outlined and ringed. */
export function swatches(g: G, b: [number, number, number], grips: boolean) {
  const rows = [{ n: 9, off: 1, label: 'band 1' }, { n: 10, off: 0, label: 'band 2' }, { n: 7, off: 0, label: '× 10ⁿ' }];
  rows.forEach((row, ri) => {
    const cy = ROWS[ri];
    text(g, row.label, 152, cy + 4, PAL.white, 11, 'right');
    for (let i = 0; i < row.n; i++) {
      const v = i + row.off;
      const cx = swX(i);
      rect(g, cx - SW.w / 2, cy - SW.h / 2, SW.w, SW.h, SWATCH[v]);
      g.strokeStyle = '#0b1030';
      g.lineWidth = 1;
      g.strokeRect(cx - SW.w / 2, cy - SW.h / 2, SW.w, SW.h);
      text(g, ABBR[v], cx, cy + 4, SWATCH_INK[v], 11);
    }
    const idx = b[ri] - row.off;
    const cx = swX(idx);
    g.strokeStyle = PAL.yellow;
    g.lineWidth = 2;
    g.strokeRect(cx - SW.w / 2 - 1, cy - SW.h / 2 - 1, SW.w + 2, SW.h + 2);
    if (grips) {
      g.strokeStyle = PAL.white;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(cx, cy, 16, 0, Math.PI * 2);
      g.stroke();
      text(g, '⇔', cx, cy + 21, PAL.white, 11);
    }
  });
}

/** The pump switch on the wall: a red lever whose angle runs from −30° to +40°. */
export function lever(g: G, deg: number) {
  rect(g, 120, 232, 20, 8, '#5a5f6e');
  const a = (deg * Math.PI) / 180;
  line(g, 130, 236, 130 + Math.sin(a) * 16, 236 - Math.cos(a) * 16, '#e0282d', 4);
  dot(g, 130 + Math.sin(a) * 16, 236 - Math.cos(a) * 16, 3.4, '#ff5a5a');
}

/** The pump (a motor with a fan guard, its blades turning at `spin`), the pipe and the water tank, filled to `fill` (0 to 1) of its height. */
export function pump(g: G, spin: number, fill: number, gauge: boolean) {
  line(g, 540, 278, 540, 190, '#7d8597', 5);
  line(g, 540, 190, 560, 190, '#7d8597', 5);
  rect(g, 522, 280, 36, 24, '#2f5aa0');
  rect(g, 526, 304, 28, 4, '#3a4458');
  dot(g, 540, 292, 11, '#1a2238');
  for (let i = 0; i < 3; i++) {
    const a = spin + (i * 2 * Math.PI) / 3;
    line(g, 540, 292, 540 + Math.cos(a) * 9, 292 + Math.sin(a) * 9, '#cfd3de', 2.4);
  }
  g.strokeStyle = '#cfd3de';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(540, 292, 11, 0, Math.PI * 2);
  g.stroke();
  rect(g, 560, 110, 60, 90, '#101a2e');
  const h = 86 * fill;
  rect(g, 562, 198 - h, 56, h, 'rgba(77,190,255,0.75)');
  g.strokeStyle = '#cfd3de';
  g.lineWidth = 2;
  g.strokeRect(560, 110, 60, 90);
  if (gauge) {
    line(g, 620, 198 - 86 * 0.85, 626, 198 - 86 * 0.85, PAL.white, 1.5);
    text(g, '85%', 590, 198 - 86 * 0.85 - 4, PAL.white, 11);
  }
  rect(g, 584, 236, 46, 80, '#4a3020');
  rect(g, 588, 240, 38, 76, '#5a3d28');
  dot(g, 620, 280, 2, PAL.yellow);
}

/** Smoke puffs rising from (x, y): `u` seconds since the pop. */
export function smoke(g: G, x: number, y: number, u: number, n = 5) {
  for (let i = 0; i < n; i++) {
    const age = Math.min(1.2, Math.max(0, u - i * 0.12));
    if (age <= 0) continue;
    g.globalAlpha = Math.max(0, 0.6 - age * 0.45);
    dot(g, x + jit(i * 3 + 1) * 14 + age * 5, y - age * 40, 4 + age * 7, '#8a8fa8');
  }
  g.globalAlpha = 1;
}

/** The yellow dots that run from the switch along the gold trace to the resistor and the relay. */
export const TRACE: [number, number][] = [[136, 226], [176, 160], [260, 120], [380, 120], [440, 128]];
