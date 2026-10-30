// Drawing for "Lightning on Set": the sound stage, the control desk (voltmeter, LCD, knife switch, discharge lever), the plate-capacitor rig, Zara the effects chief,
// the Director in his chair, the robot prop TITAN-7 with its power core, the camera, the clapperboard and the dailies frame. Nothing here knows the answer of a
// round: it draws the positions, moods and states it is handed. No Math.random: every wobble comes from the clock through `jit`.
import { PAL } from '@core/arcade';
import { backdrop, face } from '@core/mathkit';
import { glow, line, text } from '@core/neon';

export type G = CanvasRenderingContext2D;

export const RIG = { cx: 250, bottom: 252, mm: 9, w: 160, plate: 6 }; // 9 px per mm of gap: a picture, not to scale with the answer
export const topY = (d: number) => RIG.bottom - RIG.plate - d * RIG.mm; // the top plate's upper edge
export const plateW = (a: number) => 60 + 60 * a; // level 4 only: the plate width follows A
export const METER = { x: 72, y: 150, r: 34, max: 40 }; // the charger's voltmeter, 0 to 40 kV
export const LCD = { x: 22, y: 186, w: 100, h: 18 }; // the helper readout
export const ANTENNA = { x: 512, y: 112 }; // TITAN-7's antenna tip
export const STRIKER = { x: 512, y: 96 }; // level 3: the copper striker ball, 16 px above the antenna
export const CORE = { x: 512, y: 214, w: 16, h: 70 }; // the chest gauge (centre, size)
export const SWITCH = { x: 118, y: 238, len: 24 }; // the knife switch's hinge; closed, its tip is at (118, 214)
export const LEVER = { x: 40, y: 284, len: 26 }; // the discharge lever's pivot
export const RACK = { x0: 130, w: 40, y: 302, h: 24 }; // level 3: six panel slots under the rig
export const slotX = (k: number) => RACK.x0 + RACK.w * (k - 1) + RACK.w / 2;
export const ZARA = { x: 64, y: 318 };
export const TITAN = { x: 512, y: 318 };
export const CAMERA = { x: 420, y: 282 };
export const FRAME = { x: 245, y: 30, w: 150, h: 96 }; // the dailies frame at its resting place

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (u: number) => clamp01(u) * clamp01(u) * (3 - 2 * clamp01(u));
const frac = (v: number) => v - Math.floor(v);
/** A repeatable wobble in −0.5 to 0.5 from an integer-ish seed. */
export const jit = (n: number) => frac(Math.sin(n * 12.9898) * 43758.5453) - 0.5;
const INK = '#1b1030';

function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
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

// ---- the sound stage ---------------------------------------------------------------------------------------------------------------------------------------

/** The stage: a dark back wall with a painted lab flat, studio lamps, a boom mic, a gantry and the floor. Opaque, so the backdrop grid never shows. */
export function stage(g: G, t: number) {
  backdrop(g);
  box(g, 0, 0, 640, 300, '#151a2e');
  box(g, 0, 300, 640, 40, '#0d1020');
  for (let x = 80; x < 640; x += 80) line(g, x, 0, x, 300, '#1b2140', 2);
  // the painted retro-lab flat behind TITAN-7: a shelf with three glowing jars that flicker a little
  g.fillStyle = '#1c2442';
  rr(g, 432, 52, 198, 248, 6);
  g.fill();
  g.strokeStyle = '#2f3a6b';
  g.lineWidth = 2;
  g.stroke();
  box(g, 440, 70, 182, 4, '#4a5078');
  const jars: [number, string][] = [[458, PAL.cyan], [566, PAL.green], [600, PAL.pink]];
  jars.forEach(([x, c], i) => {
    g.globalAlpha = 0.72 + 0.28 * Math.sin(t * 7 + i * 2.1);
    glow(g, c, 10, () => {
      g.fillStyle = c;
      rr(g, x - 7, 54, 14, 16, 3);
      g.fill();
    });
    g.globalAlpha = 1;
    box(g, x - 5, 51, 10, 4, '#7b82a6');
  });
  line(g, 440, 130, 486, 130, '#2f3a6b', 2);
  line(g, 538, 130, 622, 130, '#2f3a6b', 2);
  // studio lamps on stands in the top corners, with soft light cones
  for (const side of [-1, 1]) {
    const px = side < 0 ? 6 : 634;
    line(g, px, 300, px, 26, '#4a5078', 3);
    g.fillStyle = 'rgba(255,240,190,0.08)';
    g.beginPath();
    g.moveTo(px + side * -10, 26);
    g.lineTo(px + side * -10, 36);
    g.lineTo(px - side * 190, 300);
    g.lineTo(px - side * 90, 300);
    g.closePath();
    g.fill();
    box(g, px - 9 + (side < 0 ? 4 : -4), 14, 18, 14, '#2a2f55', '#7b82a6');
    dot(g, px + (side < 0 ? 4 : -4), 21, 4, '#ffe9a8');
  }
  // the gantry the cable runs over, and a boom mic on its pole
  box(g, 140, 30, 400, 6, '#4a5078', '#7b82a6');
  for (const x of [160, 340, 520]) line(g, x, 0, x, 30, '#3a3f58', 2);
  line(g, 430, 0, 372, 22, '#8d93b5', 3);
  g.fillStyle = '#3a3340';
  rr(g, 350, 17, 26, 10, 5);
  g.fill();
  // the floor with white tape marks
  line(g, 0, 300, 640, 300, '#2a2f55', 2);
  for (const x of [150, 330, 448]) {
    line(g, x - 8, 312, x + 8, 312, 'rgba(255,255,255,0.5)', 2);
    line(g, x, 308, x, 316, 'rgba(255,255,255,0.5)', 2);
  }
}

// ---- the control desk --------------------------------------------------------------------------------------------------------------------------------------

const meterAngle = (v: number) => ((150 + (240 * Math.max(0, Math.min(METER.max, v))) / METER.max) * Math.PI) / 180;

export interface DeskOpts {
  /** The voltmeter needle in kV. */
  needle: number;
  /** Level 3: the green band of voltages that suits the striker and the shell. */
  band?: [number, number];
  /** Level 4: the cue tick. */
  cue?: number;
  lcd: string;
  lcdColor: string;
  /** 1 closed, 0 open. */
  closed: number;
  /** The discharge lever's angle in degrees from upright, positive toward Zara. */
  lever: number;
}

export function desk(g: G, o: DeskOpts) {
  box(g, 12, 196, 116, 104, '#3a3f58');
  box(g, 12, 196, 116, 6, '#555c7d');
  line(g, 70, 206, 70, 300, '#2a2f48', 2);
  // the charger box
  g.fillStyle = '#2a2f48';
  rr(g, 14, 100, 112, 106, 6);
  g.fill();
  g.strokeStyle = '#5a6290';
  g.lineWidth = 1.5;
  g.stroke();
  // the voltmeter
  const { x, y, r } = METER;
  dot(g, x, y, r + 3, '#161a2e');
  dot(g, x, y, r, '#e8ebf6');
  for (let i = 0; i <= 8; i++) {
    const a = meterAngle(i * 5);
    const big = i % 2 === 0;
    line(g, x + Math.cos(a) * (r - (big ? 10 : 6)), y + Math.sin(a) * (r - (big ? 10 : 6)), x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2), INK, big ? 1.6 : 1);
    if (big) text(g, String(i * 5), x + Math.cos(a) * (r - 17), y + Math.sin(a) * (r - 17) + 3, INK, 7);
  }
  text(g, 'kV', x, y + 22, INK, 8);
  if (o.band) {
    g.strokeStyle = '#1fb86a';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(x, y, r - 5, meterAngle(o.band[0]), meterAngle(o.band[1]));
    g.stroke();
  }
  if (o.cue !== undefined) {
    const a = meterAngle(o.cue);
    line(g, x + Math.cos(a) * (r - 13), y + Math.sin(a) * (r - 13), x + Math.cos(a) * (r + 1), y + Math.sin(a) * (r + 1), '#d99a00', 3.5);
    text(g, `CUE ${o.cue} kV`, x, 110, PAL.yellow, 9);
  }
  const na = meterAngle(o.needle);
  line(g, x, y, x + Math.cos(na) * (r - 7), y + Math.sin(na) * (r - 7), '#c0201a', 2);
  dot(g, x, y, 3.5, INK);
  // the knob turns with the needle
  dot(g, 26, 128, 9, '#9aa0bd');
  dot(g, 26, 128, 6.5, '#c9ceea');
  const ka = (-135 + (270 * Math.min(METER.max, o.needle)) / METER.max) * (Math.PI / 180) - Math.PI / 2;
  line(g, 26, 128, 26 + Math.cos(ka) * 7, 128 + Math.sin(ka) * 7, INK, 2);
  text(g, 'HV', 26, 145, PAL.dim, 7);
  dot(g, 118, 118, 3, o.closed > 0.5 ? PAL.green : PAL.red);
  // the LCD: the only helper
  box(g, LCD.x, LCD.y, LCD.w, LCD.h, '#04120a', '#3a6a4a');
  text(g, o.lcd, LCD.x + LCD.w / 2, LCD.y + 12.5, o.lcdColor, o.lcd.length > 17 ? 8 : 10);
  // the knife switch: a blade on a hinge, swung open to the left
  const s = SWITCH;
  box(g, s.x - 9, s.y + 2, 18, 5, '#555c7d');
  dot(g, s.x, s.y - s.len, 3, '#b87333');
  g.save();
  g.translate(s.x, s.y);
  g.rotate((-140 * (Math.PI / 180)) * (1 - o.closed));
  line(g, 0, 0, 0, -s.len, '#c9ceea', 3);
  dot(g, 0, -s.len, 4.5, '#7a4a22');
  g.restore();
  dot(g, s.x, s.y, 3.5, '#b87333');
  text(g, o.closed > 0.5 ? 'ON' : 'OFF', s.x, s.y + 17, PAL.dim, 7);
  // the red discharge lever
  rr(g, LEVER.x - 12, LEVER.y - 2, 24, 8, 3);
  g.fillStyle = '#161a2e';
  g.fill();
  const la = (o.lever * Math.PI) / 180;
  const tx = LEVER.x + Math.sin(la) * LEVER.len;
  const ty = LEVER.y - Math.cos(la) * LEVER.len;
  line(g, LEVER.x, LEVER.y, tx, ty, '#9aa0bd', 4);
  glow(g, PAL.red, 6, () => dot(g, tx, ty, 5.5, '#e0282d'));
  dot(g, LEVER.x, LEVER.y, 3, '#555c7d');
  text(g, 'DISCHARGE', LEVER.x, LEVER.y + 15, PAL.dim, 6);
}

/** Where the lever's grip is for an angle (Zara's hand goes there). */
export const leverTip = (deg: number): [number, number] => [LEVER.x + Math.sin((deg * Math.PI) / 180) * LEVER.len, LEVER.y - Math.cos((deg * Math.PI) / 180) * LEVER.len];

// ---- the rig -----------------------------------------------------------------------------------------------------------------------------------------------

export interface RigOpts {
  /** The gap in mm for the picture. */
  d: number;
  /** The plate width in px. */
  w: number;
  /** Alpha of the field lines. */
  field: number;
  /** How many + signs on the top plate and − signs on the bottom plate (always 6 before a take). */
  tokens: number;
  /** Draw the crank and the gap readout (levels 2 and 4). */
  crank: boolean;
  /** Level 4: a drag tab on the bottom plate's right edge. */
  areaTab: boolean;
}

export const crankX = RIG.cx + RIG.w / 2 + 14;
/** The screw jack sits just right of the plates, so wide level 4 plates never run through it. */
export const crankXFor = (w: number) => Math.max(crankX, RIG.cx + w / 2 + 14);

export function rig(g: G, o: RigOpts) {
  const x0 = RIG.cx - o.w / 2;
  const ty = topY(o.d);
  // four white ceramic posts with ribs, on a wooden sled
  for (const px of [x0 + 14, RIG.cx - 22, RIG.cx + 22, x0 + o.w - 14]) {
    box(g, px - 4, 252, 8, 40, '#e8ebf6');
    for (let y = 258; y < 290; y += 6) line(g, px - 5, y, px + 5, y, '#aab2d0', 1.5);
  }
  box(g, x0 - 6, 292, o.w + 12, 8, '#6b4a2a', '#4a3320');
  // the field lines
  for (let x = x0 + 8; x < x0 + o.w - 4; x += 16) line(g, x, ty + RIG.plate, x, RIG.bottom - RIG.plate, `rgba(77,225,255,${o.field.toFixed(3)})`, 1.5);
  // the bottom and top plates
  for (const y of [RIG.bottom - RIG.plate, ty]) {
    box(g, x0, y, o.w, RIG.plate, '#c77d3a');
    line(g, x0, y + RIG.plate, x0 + o.w, y + RIG.plate, '#7a4a22', 1.5);
    line(g, x0, y + 1, x0 + o.w, y + 1, '#e8a064', 1);
  }
  // the charge tokens: always the same number, so the picture never shows Q
  for (let i = 0; i < o.tokens; i++) {
    const tx = x0 + (o.w * (i + 0.5)) / o.tokens;
    text(g, '+', tx, ty + 5, PAL.yellow, 12);
    text(g, '−', tx, RIG.bottom - 1, PAL.cyan, 12);
  }
  if (o.crank) {
    // the screw jack: a threaded rod with a hand-wheel at the top plate
    const xr = crankXFor(o.w);
    box(g, xr - 2, 120, 4, 132, '#8d93b5');
    for (let y = 124; y < 250; y += 5) line(g, xr - 3, y, xr + 3, y + 2, '#555c7d', 1);
    if (x0 + o.w < xr) box(g, x0 + o.w - 2, ty + 1, xr - (x0 + o.w) + 2, 4, '#9aa0bd');
    dot(g, xr, ty + 3, 9, '#2a2f55');
    g.strokeStyle = PAL.yellow;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(xr, ty + 3, 9, 0, Math.PI * 2);
    g.stroke();
    for (let i = 0; i < 3; i++) {
      const a = o.d * 0.9 + (i * Math.PI) / 3;
      line(g, xr + Math.cos(a) * 8, ty + 3 + Math.sin(a) * 8, xr - Math.cos(a) * 8, ty + 3 - Math.sin(a) * 8, PAL.yellow, 1.5);
    }
    text(g, `${o.d} mm`, xr + 14, ty + 7, PAL.yellow, 11, 'left');
  }
  if (o.areaTab) {
    const ex = x0 + o.w;
    box(g, ex, RIG.bottom - RIG.plate, 6, 14, '#9aa0bd');
    text(g, '↔', ex + 3, RIG.bottom + 17, PAL.yellow, 12);
  }
}

/** A translucent dielectric slab filling the gap; `left` slides it in from the side (clipped so it never covers the robot). */
export function slab(g: G, d: number, w: number, left: number, label?: string) {
  const ty = topY(d) + RIG.plate;
  g.save();
  g.beginPath();
  g.rect(0, 0, 430, 340);
  g.clip();
  g.fillStyle = 'rgba(255,209,102,0.35)';
  g.fillRect(left, ty, w, RIG.bottom - RIG.plate - ty);
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 1.5;
  g.strokeRect(left, ty, w, RIG.bottom - RIG.plate - ty);
  g.restore();
  if (label) text(g, label, left + Math.min(w, 430 - left) / 2, topY(d) - 9, PAL.yellow, 10);
}

/** Level 3: the panel rack, six slots; the chosen slot is lit. */
export function rack(g: G, chosen: number) {
  box(g, RACK.x0 - 4, RACK.y - 3, RACK.w * 6 + 8, RACK.h + 8, '#1d2250', '#4a5078');
  for (let i = 0; i < 6; i++) {
    const on = i + 1 === chosen;
    g.fillStyle = on ? 'rgba(255,209,102,0.45)' : '#2a2f55';
    g.fillRect(RACK.x0 + i * RACK.w + 2, RACK.y, RACK.w - 4, RACK.h);
    g.strokeStyle = on ? PAL.yellow : '#4a5078';
    g.lineWidth = on ? 2.5 : 1;
    g.strokeRect(RACK.x0 + i * RACK.w + 2, RACK.y, RACK.w - 4, RACK.h);
    text(g, i === 0 ? 'air' : `K=${i + 1}`, slotX(i + 1), RACK.y + 15, on ? PAL.yellow : PAL.dim, 9);
  }
}

/** The cable from the top plate over the gantry to the antenna (or, in level 3, to the striker ball). */
export function cablePts(d: number, w: number, striker: boolean): [number, number][] {
  const x0 = RIG.cx - w / 2 + 8;
  const end = striker ? STRIKER : ANTENNA;
  return [[x0, topY(d)], [x0, 40], [end.x, 40], [end.x, end.y]];
}
/** The charger's red and black cables: from the switch to the top plate, and from the desk to the bottom plate. */
export function supplyPts(d: number, w: number): { red: [number, number][]; black: [number, number][] } {
  const lx = RIG.cx - w / 2;
  const xv = Math.min(150, lx - 8);
  return {
    red: [[SWITCH.x, SWITCH.y - SWITCH.len], [xv, SWITCH.y - SWITCH.len], [xv, topY(d) + 3], [lx, topY(d) + 3]],
    black: [[128, 250], [Math.min(144, lx - 4), 250], [lx, RIG.bottom - 3]],
  };
}

export function cable(g: G, pts: [number, number][], color: string, w = 3) {
  for (const [c, lw] of [['#0a0d1c', w + 2], [color, w]] as const) {
    g.strokeStyle = c;
    g.lineWidth = lw;
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
    g.stroke();
  }
}

/** A jagged bolt between two points, re-jittered every 0.05 s from the clock. */
export function bolt(g: G, x0: number, y0: number, x1: number, y1: number, t: number, seed: number, w = 2, amp = 6) {
  const n = 8;
  const q = Math.floor(t * 20);
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  glow(g, '#8fc8ff', 12, () => {
    for (const [c, lw] of [['rgba(143,200,255,0.6)', w + 3], ['#f4f9ff', w]] as const) {
      g.strokeStyle = c;
      g.lineWidth = lw;
      g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(x0, y0);
      for (let i = 1; i < n; i++) {
        const f = i / n;
        const o = jit(q * 17 + seed * 31 + i * 5) * 2 * amp;
        g.lineTo(x0 + (x1 - x0) * f + nx * o, y0 + (y1 - y0) * f + ny * o);
      }
      g.lineTo(x1, y1);
      g.stroke();
    }
  });
}

/** Grey smoke puffs rising from (x, y), `u` seconds after they began. */
export function smoke(g: G, x: number, y: number, u: number, n = 5) {
  for (let i = 0; i < n; i++) {
    const age = u - i * 0.2;
    if (age <= 0 || age > 1.8) continue;
    g.globalAlpha = 0.5 * (1 - age / 1.8);
    dot(g, x + jit(i * 3 + 1) * 16 + age * 5, y - age * 42, 5 + age * 9, '#8a8fa8');
  }
  g.globalAlpha = 1;
}

// ---- TITAN-7 -----------------------------------------------------------------------------------------------------------------------------------------------

export interface CoreOpts {
  /** 0 to 1: always one of the fixed fills. */
  fill: number;
  color: string;
  flash: boolean;
  /** 0 to 1: glow spilling above the gauge. */
  overflow: number;
  /** The target label at the 80% notch. */
  notch?: string;
  /** The shell plate (level 3). */
  shell?: string;
}

/** The power core: a vertical gauge of 8 segments with a notch at 80%. It shows only the fixed fills it is handed. */
export function core(g: G, t: number, c: CoreOpts) {
  const x = CORE.x - CORE.w / 2;
  const top = CORE.y - CORE.h / 2;
  const bot = CORE.y + CORE.h / 2;
  box(g, x - 2, top - 2, CORE.w + 4, CORE.h + 4, '#10142e', '#7b82a6');
  const seg = CORE.h / 8;
  const col = c.flash && Math.floor(t * 12) % 2 === 0 ? PAL.red : c.color;
  for (let i = 0; i < 8; i++) {
    const sy = bot - (i + 1) * seg;
    const cover = clamp01((c.fill * CORE.h - i * seg) / seg);
    g.fillStyle = '#1b2250';
    g.fillRect(x + 1, sy + 1, CORE.w - 2, seg - 2);
    if (cover > 0) {
      g.globalAlpha = 0.95;
      g.fillStyle = col;
      g.fillRect(x + 1, sy + 1 + (seg - 2) * (1 - cover), CORE.w - 2, (seg - 2) * cover);
      g.globalAlpha = 1;
    }
  }
  if (c.fill > 0) glow(g, col, 10, () => g.strokeRect(x, top, CORE.w, CORE.h));
  if (c.overflow > 0) {
    g.globalAlpha = 0.6 * c.overflow;
    glow(g, PAL.red, 14, () => {
      g.fillStyle = PAL.red;
      g.fillRect(x + 2, top - 2 * seg, CORE.w - 4, 2 * seg);
    });
    g.globalAlpha = 1;
  }
  const ny = bot - 0.8 * CORE.h;
  line(g, x - 4, ny, x + CORE.w + 4, ny, PAL.yellow, 1.5);
  dot(g, x + CORE.w + 6, ny, 2, PAL.yellow);
  if (c.notch) {
    line(g, x - 4, ny, TITAN.x - 36, ny, 'rgba(255,210,63,0.5)', 1, [3, 3]);
    text(g, c.notch, TITAN.x - 38, ny + 3, PAL.yellow, 9, 'right');
  }
  if (c.shell) {
    g.fillStyle = '#10142e';
    rr(g, TITAN.x - 31, 251, 62, 11, 3);
    g.fill();
    text(g, c.shell, TITAN.x, 259.5, PAL.orange, 8);
  }
}

export interface TitanOpts {
  eyes: 'off' | 'on' | 'flicker';
  /** Head droop in degrees (asleep 15). */
  droop: number;
  /** −1 to 1: the head turns (toward the camera is positive). */
  turn: number;
  /** 0 to 1: one full turn of the head. */
  spin: number;
  /** 0 to 1: both arms raised 30°. */
  arms: number;
  /** Level 4's awake stance: standing straight, fists on hips. */
  awake: boolean;
  /** 0 to 1: the right fist pumps (awake). */
  pump: number;
  /** 0 to 1: shoulders slump (awake). */
  slump: number;
  /** Seconds since a steam blast from the shoulder vents, or −1. */
  steam: number;
  /** Seconds since the chest fuse popped, or −1. */
  fuse: number;
  /** Seconds since smoke began rising from the head, or −1. */
  smoke: number;
  core: CoreOpts | null;
}

const STEEL = '#6b7390';
const STEEL_D = '#4a5078';

function claw(g: G, x: number, y: number, open: number) {
  dot(g, x, y, 4, '#9aa0bd');
  line(g, x - 2, y + 2, x - 4 - open, y + 8, '#c9ceea', 2);
  line(g, x + 2, y + 2, x + 4 + open, y + 8, '#c9ceea', 2);
}

export function titan(g: G, t: number, o: TitanOpts) {
  const cx = TITAN.x;
  // the prop frame: two posts, clamps at the legs and a platform
  for (const px of [cx - 48, cx + 48]) {
    box(g, px - 4, 156, 8, 162, '#3a3f58', '#555c7d');
    box(g, px - 6, 152, 12, 6, '#555c7d');
    line(g, px, 290, px + (px < cx ? 24 : -24), 290, '#9aa0bd', 5);
  }
  box(g, cx - 62, 318, 124, 6, '#3a3f58');
  // the cable from its back to the floor
  g.strokeStyle = '#0a0d1c';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(cx + 34, 230);
  g.bezierCurveTo(cx + 60, 250, cx + 66, 300, cx + 80, 322);
  g.stroke();
  // legs, boots and hips
  for (const side of [-1, 1]) {
    box(g, cx + side * 16 - 8, 266, 16, 46, STEEL, STEEL_D);
    line(g, cx + side * 16 - 8, 286, cx + side * 16 + 8, 286, STEEL_D, 2);
    rr(g, cx + side * 16 - 11, 308, 22, 10, 3);
    g.fillStyle = '#3a3f58';
    g.fill();
  }
  box(g, cx - 30, 256, 60, 12, STEEL_D, '#7b82a6');
  // the torso with rivets and a fuse box
  g.fillStyle = STEEL;
  rr(g, cx - 34, 170, 68, 92, 6);
  g.fill();
  g.strokeStyle = '#8d93b5';
  g.lineWidth = 1.5;
  g.stroke();
  for (const [rx, ry] of [[-30, 176], [30, 176], [-30, 256], [30, 256]]) dot(g, cx + rx, ry, 1.8, '#9aa0bd');
  // the blinking red LED (asleep only)
  dot(g, cx - 26, 182, 2.6, !o.awake && t % 1.5 < 0.25 ? PAL.red : '#4a2030');
  // the fuse
  if (o.fuse < 0) {
    box(g, cx + 17, 186, 10, 7, '#8a2a2a', '#c9ceea');
  } else {
    g.fillStyle = 'rgba(10,10,20,0.85)';
    g.beginPath();
    g.ellipse(cx + 22, 189, 8, 6, 0, 0, Math.PI * 2);
    g.fill();
    if (o.fuse < 0.5) {
      g.globalAlpha = 1 - o.fuse / 0.5;
      box(g, cx + 17 + o.fuse * 20, 186 - o.fuse * 70 + o.fuse * o.fuse * 120, 10, 7, '#8a2a2a');
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05 + jit(i + 4);
        line(g, cx + 22, 189, cx + 22 + Math.cos(a) * (6 + o.fuse * 60), 189 + Math.sin(a) * (6 + o.fuse * 60), PAL.yellow, 2);
      }
      g.globalAlpha = 1;
    }
  }
  if (o.core) core(g, t, o.core);
  // arms: hanging with claw hands (asleep), raised 30° (win), or fists on hips (awake)
  const slump = o.slump * 6;
  for (const side of [-1, 1]) {
    const sx = cx + side * 46;
    const sy = 178 + slump;
    let ex: number;
    let ey: number;
    let hx: number;
    let hy: number;
    if (o.awake) {
      const pump = side > 0 ? o.pump : 0;
      ex = sx + side * (12 + 4 * pump);
      ey = sy + 38 - 56 * pump;
      hx = cx + side * (30 + 18 * pump);
      hy = 258 - 118 * pump;
      line(g, sx, sy, ex, ey, STEEL, 9);
      line(g, ex, ey, hx, hy, STEEL, 8);
      dot(g, ex, ey, 4.5, STEEL_D);
      dot(g, hx, hy, 6, '#9aa0bd');
    } else {
      const a = side * -o.arms * (30 * Math.PI) / 180;
      const vx = side * 8;
      const vy = 70;
      hx = sx + vx * Math.cos(a) - vy * Math.sin(a);
      hy = sy + vx * Math.sin(a) + vy * Math.cos(a);
      ex = (sx + hx) / 2;
      ey = (sy + hy) / 2;
      line(g, sx, sy, hx, hy, STEEL, 9);
      dot(g, ex, ey, 4.5, STEEL_D);
      claw(g, hx, hy, 2 + 3 * o.arms);
    }
  }
  // shoulder pads with vent slits (they puff a tiny cloud every 3 s)
  for (const side of [-1, 1]) {
    box(g, cx + side * 43 - 13, 164 + slump, 26, 18, STEEL_D, '#8d93b5');
    for (let i = 0; i < 3; i++) line(g, cx + side * 43 - 8, 169 + slump + i * 4, cx + side * 43 + 8, 169 + slump + i * 4, '#2a2f55', 1.5);
    const idle = (t % 3) / 3;
    if (idle < 0.5 && o.steam < 0) {
      g.globalAlpha = 0.4 * (1 - idle * 2);
      dot(g, cx + side * 43, 162 - idle * 24, 2 + idle * 12, '#e8ebf6');
      g.globalAlpha = 1;
    }
    if (o.steam >= 0 && o.steam < 1.4) {
      for (let i = 0; i < 3; i++) {
        const age = o.steam - i * 0.15;
        if (age <= 0) continue;
        g.globalAlpha = 0.7 * (1 - age / 1.2);
        dot(g, cx + side * (43 + 4 * i), 162 - age * 50, 5 + age * 12, '#f4f6ff');
      }
      g.globalAlpha = 1;
    }
  }
  // the head: droops, turns and spins on the neck; a wire antenna always reaches the cable's end
  const pivotY = 166;
  const droop = o.droop + o.slump * 10;
  const th = (-droop * Math.PI) / 180;
  const sxs = o.spin > 0 ? Math.cos(Math.PI * 2 * o.spin) : 1 - 0.12 * Math.abs(o.turn);
  g.save();
  g.translate(cx, pivotY);
  g.rotate(th);
  g.scale(sxs, 1);
  box(g, -6, -6, 12, 8, STEEL_D);
  g.fillStyle = STEEL;
  rr(g, -22, -40, 44, 36, 5);
  g.fill();
  g.strokeStyle = '#8d93b5';
  g.lineWidth = 1.5;
  g.stroke();
  for (const [rx, ry] of [[-18, -36], [18, -36], [-18, -8], [18, -8]]) dot(g, rx, ry, 1.6, '#9aa0bd');
  const shift = -o.turn * 4;
  for (const side of [-1, 1]) {
    const ex = side * 9 + shift;
    dot(g, ex, -24, 6.5, '#161a2e');
    const on = o.eyes === 'on' || (o.eyes === 'flicker' && (side < 0 ? Math.floor(t * 5) % 2 === 0 : true));
    if (on) glow(g, PAL.cyan, 10, () => dot(g, ex, -24, 4.5, PAL.cyan));
    else dot(g, ex, -24, 4.5, '#2a3050');
  }
  box(g, -10 + shift, -14, 20, 7, '#161a2e', '#555c7d');
  for (let i = -8; i <= 8; i += 4) line(g, i + shift, -14, i + shift, -7, '#555c7d', 1);
  box(g, -26, -26, 4, 9, STEEL_D);
  box(g, 22, -26, 4, 9, STEEL_D);
  g.restore();
  const bx = cx + (8 * sxs * Math.cos(th) + 40 * Math.sin(th));
  const by = pivotY + (8 * sxs * Math.sin(th) - 40 * Math.cos(th));
  g.strokeStyle = '#c9ceea';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(bx, by);
  g.quadraticCurveTo((bx + ANTENNA.x) / 2 + 6, (by + ANTENNA.y) / 2 - 8, ANTENNA.x, ANTENNA.y);
  g.stroke();
  dot(g, ANTENNA.x, ANTENNA.y, 4, '#b87333');
  if (o.smoke >= 0) smoke(g, cx, 122, o.smoke);
}

// ---- the camera, clapperboard and dailies frame ------------------------------------------------------------------------------------------------------------

/** The camera on its dolly, pointing at TITAN-7: film magazine, REC light and an iris icon that opens with the shutter (iris 0 to 1). */
export function camera(g: G, t: number, active: boolean, iris: number) {
  const { x, y } = CAMERA;
  box(g, x - 18, y - 6, 36, 6, '#2a2f48');
  for (const wx of [x - 12, x + 12]) {
    dot(g, wx, y + 4, 5, '#161a2e');
    dot(g, wx, y + 4, 2, '#7b82a6');
  }
  line(g, x, y - 6, x, y - 14, '#555c7d', 4);
  g.fillStyle = '#2c3040';
  rr(g, x - 22, y - 38, 44, 26, 3);
  g.fill();
  g.strokeStyle = '#555c7d';
  g.lineWidth = 1;
  g.stroke();
  box(g, x + 22, y - 32, 14, 12, '#161a2e', '#555c7d');
  dot(g, x + 36, y - 26, 4.5, '#2a3a6a');
  for (const mx of [x - 10, x + 8]) {
    dot(g, mx, y - 44, 8, '#161a2e');
    g.strokeStyle = '#555c7d';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(mx, y - 44, 8, 0, Math.PI * 2);
    g.stroke();
    dot(g, mx, y - 44, 2, '#555c7d');
  }
  dot(g, x - 16, y - 32, 3, active && t % 1 < 0.5 ? PAL.red : '#4a2030');
  text(g, 'REC', x - 16, y - 24, PAL.dim, 6);
  dot(g, x + 4, y - 22, 6.5, '#161a2e');
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(x + 4, y - 22, 6.5, 0, Math.PI * 2);
  g.stroke();
  dot(g, x + 4, y - 22, 1.2 + 4 * iris, PAL.cyan);
}

/** The clapperboard, `u` seconds after a round began: it drops in, claps and leaves again (0.8 s). */
export function clapper(g: G, u: number, take: string) {
  const y = -70 + 112 * ease(u / 0.2) - 112 * ease((u - 0.6) / 0.2);
  const x = 275;
  box(g, x, y + 18, 90, 52, '#161a2e', '#f4f6ff');
  text(g, 'SCENE 42', x + 45, y + 40, PAL.white, 12);
  text(g, take, x + 45, y + 58, PAL.yellow, 12);
  g.save();
  g.translate(x, y + 18);
  g.rotate((-18 * Math.PI) / 180 * (1 - ease((u - 0.3) / 0.08)));
  box(g, 0, -12, 90, 12, '#f4f6ff');
  for (let i = 0; i < 6; i++) {
    g.fillStyle = '#161a2e';
    g.beginPath();
    g.moveTo(i * 15, 0);
    g.lineTo(i * 15 + 7, 0);
    g.lineTo(i * 15 + 14, -12);
    g.lineTo(i * 15 + 7, -12);
    g.closePath();
    g.fill();
  }
  g.restore();
}

export type DailyKind = 'win' | 'early' | 'late' | 'dim' | 'bright';

/** The dailies frame at the top centre, `u` seconds after the verdict. Its look is one of five fixed ones, never proportional to the energy. */
export function daily(g: G, kind: DailyKind, u: number) {
  const f = FRAME;
  const y = f.y - 130 * (1 - ease(u / 0.25));
  const bg = kind === 'win' ? '#ffd9a0' : kind === 'bright' ? '#fbfbff' : kind === 'dim' ? '#14161f' : '#000000';
  box(g, f.x - 10, y - 4, f.w + 20, f.h + 8, '#0d0f18', '#555c7d');
  for (let i = 0; i < 8; i++) {
    box(g, f.x - 8, y + 2 + i * 12, 5, 7, '#f4f6ff');
    box(g, f.x + f.w + 3, y + 2 + i * 12, 5, 7, '#f4f6ff');
  }
  box(g, f.x, y, f.w, f.h, bg);
  if (kind === 'win' || kind === 'dim' || kind === 'bright') {
    g.globalAlpha = kind === 'win' ? 1 : kind === 'dim' ? 0.25 : 0.15;
    const ink = kind === 'bright' ? '#8a8fa8' : kind === 'dim' ? '#9aa0bd' : '#6b7390';
    box(g, f.x + 62, y + 22, 26, 22, ink);
    box(g, f.x + 50, y + 44, 50, 38, ink);
    box(g, f.x + 42, y + 44, 8, 30, ink);
    box(g, f.x + 100, y + 44, 8, 30, ink);
    if (kind === 'win') {
      dot(g, f.x + 69, y + 32, 3, PAL.cyan);
      dot(g, f.x + 81, y + 32, 3, PAL.cyan);
    }
    g.globalAlpha = 1;
  }
  const label = { win: 'PERFECT SHOT', early: 'TOO EARLY', late: 'TOO LATE', dim: 'TOO DARK', bright: 'WASHED OUT' }[kind];
  text(g, label, f.x + f.w / 2, y + f.h - 7, kind === 'win' ? '#1d6a3a' : kind === 'bright' ? '#2a2f55' : PAL.white, 12);
  if (kind === 'win') {
    g.strokeStyle = PAL.green;
    g.lineWidth = 3;
    g.strokeRect(f.x, y, f.w, f.h);
  }
}

// ---- Zara --------------------------------------------------------------------------------------------------------------------------------------------------

export type ZaraMood = 'happy' | 'worried' | 'cheer' | 'frazzled';
export interface ZaraOpts {
  mood: ZaraMood;
  /** Goggles pulled down over the eyes. */
  goggles: boolean;
  /** The lever's angle: her hand follows it. */
  lever: number;
  /** 0 to 1: the second hand joins the first on the lever (the pull). */
  both: number;
  /** A fist pump (a win). */
  fist: boolean;
}

const SKIN = '#d9a273';
const GLOVE = '#ff8a1e';

function spiral(g: G, x: number, y: number, r: number) {
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.beginPath();
  for (let i = 0; i <= 18; i++) {
    const a = i * 0.7;
    const rad = (r * i) / 18;
    g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  g.stroke();
}

function arm(g: G, sx: number, sy: number, hx: number, hy: number) {
  const ex = (sx + hx) / 2 + 1;
  const ey = (sy + hy) / 2 + 5;
  line(g, sx, sy, ex, ey, SKIN, 5);
  line(g, ex, ey, hx, hy, GLOVE, 6);
  dot(g, hx, hy, 4, GLOVE);
}

/** Zara, the effects chief, standing at the desk with her hand on the discharge lever. About 72 px tall. */
export function zara(g: G, t: number, o: ZaraOpts) {
  const { x, y } = ZARA;
  const bob = Math.sin(t * 2) * 0.6;
  // legs: cargo trousers with a pocket, and boots
  box(g, x - 9, y - 30, 8, 24, '#5b6b4a');
  box(g, x + 1, y - 30, 8, 24, '#5b6b4a');
  box(g, x - 8, y - 22, 5, 5, '#4a5a3a', '#3a4a2a');
  box(g, x - 11, y - 7, 11, 7, '#2a2020');
  box(g, x, y - 7, 12, 7, '#2a2020');
  // the black crew T-shirt with SFX, and the tool belt (tape roll and pliers)
  g.fillStyle = '#15151c';
  rr(g, x - 12, y - 57 + bob, 24, 29, 3);
  g.fill();
  text(g, 'SFX', x, y - 41 + bob, PAL.yellow, 8);
  box(g, x - 12, y - 30, 24, 4, '#7a5430');
  dot(g, x - 8, y - 25, 3.4, '#e8d9a8');
  dot(g, x - 8, y - 25, 1.4, '#7a5430');
  line(g, x + 7, y - 27, x + 10, y - 19, '#9aa0bd', 2);
  line(g, x + 9, y - 27, x + 12, y - 19, '#9aa0bd', 2);
  // the head
  const hx = x;
  const hy = y - 64 + bob;
  const R = 9;
  // the ponytail sways
  const sway = Math.sin(t * 3) * ((3 * Math.PI) / 180);
  g.strokeStyle = '#1d1520';
  g.lineWidth = 5;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(hx - 7, hy - 3);
  g.quadraticCurveTo(hx - 17, hy + 2, hx - 14 + Math.sin(sway) * 30, hy + 14);
  g.stroke();
  g.lineCap = 'butt';
  dot(g, hx, hy, R, SKIN);
  if (o.mood === 'frazzled') {
    // hair standing up in spikes
    g.fillStyle = '#1d1520';
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.08 + (i * 0.84) / 6);
      const len = 8 + (i % 2) * 4;
      g.beginPath();
      g.moveTo(hx + Math.cos(a - 0.2) * R, hy + Math.sin(a - 0.2) * R);
      g.lineTo(hx + Math.cos(a) * (R + len), hy + Math.sin(a) * (R + len));
      g.lineTo(hx + Math.cos(a + 0.2) * R, hy + Math.sin(a + 0.2) * R);
      g.fill();
    }
  } else {
    g.fillStyle = '#1d1520';
    g.beginPath();
    g.arc(hx, hy - 1, R * 1.06, Math.PI, Math.PI * 2);
    g.fill();
  }
  // face
  const glance = t % 6 < 0.7 ? 1.4 : 0;
  if (o.mood === 'frazzled') {
    spiral(g, hx - 3.4, hy - 0.5, 2.8);
    spiral(g, hx + 3.6, hy - 0.5, 2.8);
    g.strokeStyle = INK;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(hx - 3, hy + 5.5);
    g.lineTo(hx - 1, hy + 4.2);
    g.lineTo(hx + 1, hy + 5.8);
    g.lineTo(hx + 3, hy + 4.6);
    g.stroke();
    g.fillStyle = 'rgba(60,60,70,0.55)';
    g.beginPath();
    g.ellipse(hx + 5.5, hy + 3.5, 3.4, 2.6, 0.3, 0, Math.PI * 2);
    g.fill();
  } else {
    face(g, hx + glance, hy - glance * 0.6, R, o.mood === 'cheer' ? 'cheer' : o.mood === 'worried' ? 'worried' : 'happy', t);
  }
  // goggles: pushed up on the forehead, or dropped over the eyes
  const gy = o.goggles ? hy : hy - 6.5;
  line(g, hx - R - 1, gy, hx + R + 1, gy, '#2a2a30', 2);
  for (const side of [-1, 1]) {
    dot(g, hx + side * 3.8, gy, 3.6, '#2a2a30');
    g.globalAlpha = o.goggles ? 0.55 : 0.8;
    dot(g, hx + side * 3.8, gy, 2.7, PAL.cyan);
    g.globalAlpha = 1;
  }
  // the headset with a boom mic
  g.strokeStyle = '#555c7d';
  g.lineWidth = 1.8;
  g.beginPath();
  g.arc(hx, hy - 1, R + 1.5, Math.PI * 1.05, Math.PI * 1.95);
  g.stroke();
  dot(g, hx + R + 1.5, hy + 1, 3.2, '#2a2f48');
  line(g, hx + R + 1, hy + 3, hx + 4, hy + R * 0.62, '#555c7d', 1.4);
  dot(g, hx + 4, hy + R * 0.62, 1.8, '#161a2e');
  // a sweat drop after any miss is drawn by `face`; the arms follow
  const [lx, ly] = leverTip(o.lever);
  const sx = x - 11;
  const sy = y - 52 + bob;
  arm(g, sx, sy, Math.max(sx - 36, lx + 3), ly + 2);
  const taps = t % 4 < 0.4 && o.both === 0 && !o.fist;
  const [rx, ry] = o.fist ? [x + 17, y - 86] : o.both > 0 ? [lx + 4, ly + 4] : taps ? [x + 10, y - 62] : [x + 15, y - 30];
  arm(g, x + 11, sy, rx, ry);
}

// ---- the Director ------------------------------------------------------------------------------------------------------------------------------------------

export type DirectorState = 'idle' | 'action' | 'win' | 'slump' | 'duck';

/** The Director in his canvas chair at the bottom right: beret, round dark glasses, scarf and megaphone. `u` is seconds since the state began. */
export function director(g: G, t: number, state: DirectorState, u: number) {
  const base = 316;
  const duck = state === 'duck';
  const jump = state === 'win' ? -9 * Math.abs(Math.sin(Math.min(u, 0.9) * 7)) : 0;
  const oy = duck ? 20 : jump;
  const cx = 594;
  const chairBack = () => {
    box(g, 574, 258, 44, 26, '#3c5a8a', '#22304a');
    box(g, 574, 258, 5, 58, '#6b4a2a');
    box(g, 613, 258, 5, 58, '#6b4a2a');
  };
  if (!duck) chairBack();
  // legs seated, a foot taps
  const tap = state === 'idle' ? Math.sin(t * 9) * 2 : 0;
  line(g, cx - 4, 294 + oy, cx - 20, 296 + oy, '#2a2f55', 7);
  line(g, cx - 20, 296 + oy, cx - 20, base - 4 + oy, '#2a2f55', 7);
  box(g, cx - 26 + tap * 0.3, base - 5 + oy - Math.max(0, tap), 11, 5, '#2a2020');
  // torso, a long scarf and the arms
  g.fillStyle = '#6a4a2a';
  rr(g, cx - 10, 270 + oy, 20, 26, 4);
  g.fill();
  const flap = Math.sin(t * 3) * 3;
  line(g, cx - 8, 272 + oy, cx + 8, 272 + oy, '#c0392b', 5);
  line(g, cx + 6, 272 + oy, cx + 14 + flap, 292 + oy, '#c0392b', 4);
  // the head: beret, round dark glasses and a mood-coloured mouth
  const hx = cx - 1;
  const hy = 261 + oy + (state === 'slump' ? 3 : 0);
  dot(g, hx, hy, 9, '#e0b48a');
  const mood = state === 'win' ? 'cheer' : state === 'slump' || duck ? 'worried' : 'happy';
  face(g, hx, hy, 9, mood, t);
  for (const side of [-1, 1]) {
    dot(g, hx + side * 3.6, hy - 0.5, 3.8, '#15151c');
    g.strokeStyle = '#15151c';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(hx + side * 3.6, hy - 0.5, 3.8, 0, Math.PI * 2);
    g.stroke();
  }
  line(g, hx - 1, hy - 0.5, hx + 1, hy - 0.5, '#15151c', 1);
  const pop = state === 'win' ? 6 * ease(u / 0.15) * (1 - ease((u - 0.5) / 0.3)) : 0;
  g.fillStyle = '#8a2030';
  g.beginPath();
  g.ellipse(hx - 2, hy - 8 - pop, 11, 4.5, -0.15, 0, Math.PI * 2);
  g.fill();
  dot(g, hx - 3, hy - 13 - pop, 1.8, '#8a2030');
  // arms and the megaphone, by state
  const sy = 274 + oy;
  const hand = (x2: number, y2: number, sx2 = cx - 9) => {
    line(g, sx2, sy, x2, y2, '#6a4a2a', 5);
    dot(g, x2, y2, 3, '#e0b48a');
  };
  const mega = (x2: number, y2: number, ang: number) => {
    g.save();
    g.translate(x2, y2);
    g.rotate(ang);
    g.fillStyle = '#d9d9e8';
    g.beginPath();
    g.moveTo(0, -3);
    g.lineTo(-16, -8);
    g.lineTo(-16, 8);
    g.lineTo(0, 3);
    g.closePath();
    g.fill();
    box(g, 0, -3, 6, 6, '#555c7d');
    g.restore();
  };
  if (state === 'win') {
    hand(cx - 18, 244 + oy);
    hand(cx + 16, 244 + oy, cx + 9);
    mega(cx - 20, 240 + oy, -0.5);
  } else if (state === 'action') {
    hand(hx - 8, hy + 4);
    hand(cx + 14, 290 + oy, cx + 9);
    mega(hx - 8, hy + 2, Math.PI * 0.02);
  } else if (state === 'slump' || duck) {
    hand(hx - 3, hy + 2);
    hand(cx + 12, 292 + oy, cx + 9);
  } else {
    // idle: megaphone in the lap, frames the shot with both hands every 5 s, checks a wristwatch
    mega(cx - 14, 292 + oy, 0.35);
    if (t % 5 < 0.9) {
      const fx = cx - 30;
      g.strokeStyle = PAL.yellow;
      g.lineWidth = 1.5;
      g.strokeRect(fx, 246 + oy, 20, 14);
      hand(fx, 246 + oy);
      hand(fx + 20, 260 + oy, cx + 9);
    } else if ((t + 2.5) % 7 < 0.8) {
      hand(cx - 10, 286 + oy);
      hand(cx + 4, 276 + oy, cx + 9);
      dot(g, cx + 4, 276 + oy, 1.6, PAL.yellow);
    } else {
      hand(cx - 8, 290 + oy);
      hand(cx + 12, 290 + oy, cx + 9);
    }
  }
  // the seat and its front, with the name
  box(g, 574, 294, 44, 5, '#3c5a8a', '#22304a');
  box(g, 576, 299, 40, 9, '#2f4a74');
  text(g, 'DIRECTOR', 596, 306.5, PAL.white, 6.5);
  if (duck) chairBack();
}
