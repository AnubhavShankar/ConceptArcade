// Drawing for "Float the Bead": the levitation lab (wall, porthole, lamps, floor), the glass column with its base electrode and release clamp, the laser on its rail,
// the console with the charger knob, LCD, RELEASE button and laser key, Femi the materials scientist, Dot the inspection robot and the metal bead.
// Nothing here knows the answer of a round: it draws the positions, moods and states it is handed. No Math.random: every wobble comes from the clock.
import { PAL } from '@core/arcade';
import { glow, line, text } from '@core/neon';
import { tag } from './ux';

export type G = CanvasRenderingContext2D;
export type Kind = 'float' | 'tiny' | 'signed' | 'aim';

export const COL = { x: 330, top: 40, base: 300, w: 44 }; // the glass column; the base electrode's top is at y = 300
/** Pixels per unit of height: 13 px per cm (levels 1 and 4, 0 to 20 cm), 260/12 px per mm (levels 2 and 3, 0 to 12 mm). */
export const pxPer = (kind: Kind) => (kind === 'tiny' || kind === 'signed' ? 260 / 12 : 13);
export const yOf = (kind: Kind, h: number) => COL.base - 7 - h * pxPer(kind); // the bead's centre at height h
/** The float gauge (helper). Two rows tall so the level 4 line "push … · weight …" fits at 11 px. */
export const LCD = { x: 22, y: 146, w: 140, h: 34 };
export const KNOB = { x: 132, y: 214, r: 22 }; // the charger knob on the console
export const BUTTON = { x: 40, y: 236, r: 13 }; // the red RELEASE button
export const KEYHOLE = { x: 70, y: 236, r: 8 }; // the laser key
export const TABLET = { x: 18, y: 274, w: 30, h: 20 };
export const HIT: [number, number] = [470, 70];
export const BEAM_X0 = 298; // right edge of the emitter
export const DUMP_X = 362; // left edge of the beam dump
export const FEMI = { x: 88, y: 318 };
export const DOT = { x: 560, y: 316 };

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
function disc(g: G, x: number, y: number, r: number, color: string) {
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
const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
/** A colour a fraction u of the way from a to b (both '#rrggbb'). */
export function mix(a: string, b: string, u: number): string {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const k = clamp01(u);
  return `rgb(${Math.round(r1 + (r2 - r1) * k)},${Math.round(g1 + (g2 - g1) * k)},${Math.round(b1 + (b2 - b1) * k)})`;
}
/** A short jagged spark line from (x0, y0) to (x1, y1); the jitter follows `seed`, so it re-rolls when the seed changes. */
export function jag(g: G, x0: number, y0: number, x1: number, y1: number, seed: number, color: string, w = 2, amp = 4) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.beginPath();
  g.moveTo(x0, y0);
  for (let i = 1; i < 4; i++) g.lineTo(x0 + ((x1 - x0) * i) / 4 + jit(seed * 7 + i) * 2 * amp, y0 + ((y1 - y0) * i) / 4 + jit(seed * 13 + i * 3) * 2 * amp);
  g.lineTo(x1, y1);
  g.stroke();
}

// ---- the lab -----------------------------------------------------------------------------------------------------------------------------------------------

/** The lab: an opaque wall with a porthole whose sky changes each round, ceiling lamps, the chamber sign, a boss beacon, and the floor. */
export function lab(g: G, t: number, k: number, calm: boolean) {
  const boss = k >= 2;
  box(g, 0, 0, 640, 340, '#141a30');
  for (let x = 80; x < 640; x += 80) line(g, x, 0, x, 300, '#1a2140', 2);
  box(g, 0, 300, 640, 40, '#0d1226');
  line(g, 0, 300, 640, 300, '#2a3160', 2);
  for (let x = 0; x < 640; x += 64) line(g, x, 300, x - 30, 340, '#161c3a', 1);
  // the porthole at (560, 90): a different sky each chamber
  g.save();
  g.beginPath();
  g.arc(560, 90, 34, 0, Math.PI * 2);
  g.clip();
  if (k === 0) {
    box(g, 520, 54, 80, 72, '#9fd0f5');
    box(g, 520, 98, 80, 28, '#d6ecfb');
    for (let i = 0; i < 2; i++) {
      const cx = 530 + ((t * 3 + i * 40) % 80);
      g.fillStyle = 'rgba(255,255,255,0.8)';
      g.beginPath();
      g.ellipse(cx, 84 + i * 16, 12, 4.5, 0, 0, Math.PI * 2);
      g.fill();
    }
  } else if (k === 1) {
    box(g, 520, 54, 80, 40, '#5b3b8c');
    box(g, 520, 94, 80, 32, '#ff9b5a');
    disc(g, 560, 104, 13, '#ffd23f');
  } else {
    box(g, 520, 54, 80, 72, '#04061a');
    for (let i = 0; i < 7; i++) {
      g.globalAlpha = 0.45 + 0.45 * Math.sin(t * 3 + i * 1.7);
      disc(g, 536 + ((i * 29) % 48), 66 + ((i * 17) % 50), 1.4, '#ffffff');
    }
    g.globalAlpha = 1;
  }
  g.restore();
  g.strokeStyle = '#6b7399';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(560, 90, 34, 0, Math.PI * 2);
  g.stroke();
  line(g, 526, 90, 594, 90, '#4a5078', 2);
  line(g, 560, 56, 560, 124, '#4a5078', 2);
  // two ceiling lamps: dim in the boss chamber, where a red beacon turns instead
  for (const lx of [120, 470]) {
    box(g, lx - 16, 0, 32, 8, '#2a2f55', '#7b82a6');
    disc(g, lx, 10, 4, boss ? '#6b5a4a' : '#ffe9a8');
    if (!boss) {
      g.fillStyle = 'rgba(255,240,190,0.07)';
      g.beginPath();
      g.moveTo(lx - 8, 12);
      g.lineTo(lx + 8, 12);
      g.lineTo(lx + 70, 300);
      g.lineTo(lx - 70, 300);
      g.closePath();
      g.fill();
    }
  }
  if (boss) {
    const a = calm ? 0.6 : t * 3;
    g.fillStyle = 'rgba(255,60,60,0.2)';
    g.beginPath();
    g.moveTo(600, 24);
    g.lineTo(600 + Math.cos(a - 0.3) * 70, 24 + Math.sin(a - 0.3) * 70);
    g.lineTo(600 + Math.cos(a + 0.3) * 70, 24 + Math.sin(a + 0.3) * 70);
    g.closePath();
    g.fill();
    glow(g, PAL.red, 8, () => disc(g, 600, 24, 5, '#e0282d'));
  }
  // the stencil sign
  const sign = boss ? 'TEST CHAMBER 3 · BOSS' : `TEST CHAMBER ${k + 1}`;
  box(g, 10, 28, sign.length * 7.4 + 12, 18, '#0d1226', boss ? PAL.red : '#4a5078');
  text(g, sign, 16, 41, boss ? PAL.red : PAL.white, 12, 'left');
}

// ---- the column, the base, the clamp and the laser -----------------------------------------------------------------------------------------------

/** The glass column with unnumbered ticks every 2 cm (levels 1 and 4) or every 1 mm (levels 2 and 3), and its one label at the top. */
export function column(g: G, kind: Kind) {
  const x0 = COL.x - COL.w / 2;
  box(g, x0, COL.top, COL.w, COL.base - COL.top, 'rgba(160,200,255,0.10)');
  line(g, x0, COL.top, x0, COL.base, 'rgba(159,196,255,0.6)', 1.5);
  line(g, x0 + COL.w, COL.top, x0 + COL.w, COL.base, 'rgba(159,196,255,0.6)', 1.5);
  line(g, x0 - 3, COL.top, x0 + COL.w + 3, COL.top, 'rgba(159,196,255,0.8)', 3);
  const step = kind === 'tiny' || kind === 'signed' ? 1 : 2;
  for (let h = step; yOf(kind, h) >= COL.top + 2; h += step) line(g, x0 + COL.w - 7, yOf(kind, h), x0 + COL.w, yOf(kind, h), 'rgba(159,196,255,0.7)', 1.5);
  text(g, kind === 'tiny' || kind === 'signed' ? '12 mm' : '20 cm', COL.x, 36, PAL.dim, 11);
}

/** The base electrode (a copper dome on a black block) with its charge sign on the dome, and its label. */
export function base(g: G, Q: number, label: string) {
  box(g, 298, 318, 64, 12, '#0a0a12', '#2a2f48');
  g.fillStyle = '#c77d3a';
  g.beginPath();
  g.moveTo(304, 318);
  g.quadraticCurveTo(304, 298, COL.x, 298);
  g.quadraticCurveTo(356, 298, 356, 318);
  g.closePath();
  g.fill();
  g.strokeStyle = '#7a4a22';
  g.lineWidth = 1.5;
  g.stroke();
  line(g, 312, 304, 322, 301, '#e8a064', 2);
  text(g, Q < 0 ? '−' : '+', COL.x, 314, INK, 14);
  text(g, label, 380, 312, PAL.white, 12, 'left');
}

/** The two-pronged release clamp holding the bead; `open` 0..1 swings each prong 30° outward. */
export function clampArt(g: G, open: number) {
  for (const s of [-1, 1]) {
    g.save();
    g.translate(COL.x + s * 10, COL.base);
    g.rotate(s * open * (Math.PI / 6));
    line(g, 0, 0, 0, -18, '#aeb4cf', 2.5);
    line(g, 0, -18, -s * 3, -21, '#aeb4cf', 2.5);
    g.restore();
  }
}

/** The laser: an emitter on a vertical rail, centred on y; the beam dump on the right. `rail` draws the full rail (level 4). `scorch` 0..1 glows the dump. */
export function laser(g: G, y: number, rail: boolean, scorch: number) {
  const top = rail ? COL.top : y - 26;
  const bottom = rail ? COL.base : y + 26;
  box(g, 271, top, 4, bottom - top, '#4a5078');
  box(g, 268, top - 2, 10, 3, '#7b82a6');
  box(g, 268, bottom - 1, 10, 3, '#7b82a6');
  box(g, 248, y - 9, 50, 18, '#3a3f58', '#7b82a6');
  box(g, 252, y - 5, 14, 10, '#1b2040');
  glow(g, PAL.red, 6, () => disc(g, 296, y, 3.5, '#e0282d'));
  if (scorch > 0) {
    g.globalAlpha = scorch;
    glow(g, PAL.orange, 14, () => disc(g, DUMP_X + 8, y, 9, '#ffb060'));
    g.globalAlpha = 1;
  }
  box(g, DUMP_X, y - 9, 16, 18, '#2a2f48', '#7b82a6');
  disc(g, DUMP_X + 2, y, 2.5, '#0a0a12');
}

/** The faint dotted aim marker across the column while the laser is idle. */
export function aimMarker(g: G, y: number) {
  line(g, BEAM_X0, y, DUMP_X, y, 'rgba(255,90,90,0.25)', 1.5, [3, 6]);
}

/** The fired beam: a solid red line with a glow and a hot core. */
export function beam(g: G, y: number, alpha: number) {
  g.globalAlpha = clamp01(alpha);
  glow(g, PAL.red, 10, () => line(g, BEAM_X0, y, DUMP_X, y, PAL.red, 3));
  line(g, BEAM_X0, y, DUMP_X, y, '#ffd0d0', 1);
  g.globalAlpha = 1;
}

// ---- the bead ----------------------------------------------------------------------------------------------------------------------------------------

export const METALS = ['#b8bcc8', '#8fa3c0', '#e0b84a'];

export interface BeadOpts {
  metal: string;
  /** 0 to 1: the colour runs from the metal to orange (0.5) to white-hot (1). */
  heat: number;
  /** A finished mirror sphere (after the melt). */
  mirror: boolean;
  /** The 1.5 s helper: draw only a dashed outline. */
  ghost?: string;
}

/** The metal bead (radius 7) at (x, y): plain, glowing, or a mirror sphere with a twinkling sparkle. */
export function bead(g: G, x: number, y: number, t: number, o: BeadOpts) {
  if (o.ghost) {
    g.globalAlpha = 0.5;
    g.strokeStyle = o.ghost;
    g.lineWidth = 2;
    g.setLineDash([3, 3]);
    g.beginPath();
    g.arc(x, y, 7, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 1;
    return;
  }
  if (o.mirror) {
    glow(g, '#fff6dc', 10, () => disc(g, x, y, 7, '#f4f8ff'));
    g.fillStyle = '#5d6b88';
    g.beginPath();
    g.arc(x, y, 7, 0, Math.PI);
    g.fill();
    line(g, x - 6, y, x + 6, y, '#2a3350', 1);
    disc(g, x - 2.5, y - 3, 2, '#ffffff');
    g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 8);
    text(g, '✦', x + 9, y - 6, '#fff6dc', 11 + 2 * Math.sin(t * 8));
    g.globalAlpha = 1;
    return;
  }
  const col = o.heat <= 0 ? o.metal : o.heat < 0.5 ? mix(o.metal, PAL.orange, o.heat * 2) : mix(PAL.orange, '#fff6dc', (o.heat - 0.5) * 2);
  if (o.heat > 0) glow(g, o.heat < 0.5 ? PAL.orange : '#fff6dc', 8 + 12 * o.heat, () => disc(g, x, y, 7, col));
  else disc(g, x, y, 7, col);
  g.strokeStyle = 'rgba(20,24,40,0.6)';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(x, y, 7, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = 0.7;
  disc(g, x - 2.5, y - 2.5, 2.2, '#ffffff');
  g.globalAlpha = 1;
}

// ---- the console ---------------------------------------------------------------------------------------------------------------------------------------

export interface DeskOpts {
  /** The knob pointer, in radians from upright (clockwise positive). */
  knob: number;
  /** The LCD text (a two-part line is split at the dot) and its colour. */
  lcd: string;
  lcdColor: string;
  /** The text under the knob and its colour (the player's own charge), or null. */
  read: string | null;
  readColor?: string;
  /** 0 to 1: how far the RELEASE button is pressed, and how far the laser key has turned. */
  press: number;
  key: number;
  /** 0 to 1: a tap on the tablet. */
  tap: number;
}

export function consoleDesk(g: G, o: DeskOpts) {
  // the instrument panel with the LCD (the only helper)
  g.fillStyle = '#2a2f48';
  rr(g, 16, 138, 154, 56, 6);
  g.fill();
  g.strokeStyle = '#5a6290';
  g.lineWidth = 1.5;
  g.stroke();
  box(g, LCD.x, LCD.y, LCD.w, LCD.h, '#04120a', '#3a6a4a');
  const rows = o.lcd.split(' · ');
  const draw = (s: string, y: number) => {
    g.font = 'bold 11px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillStyle = o.lcdColor;
    g.fillText(s, LCD.x + LCD.w / 2, y, LCD.w - 8);
  };
  if (rows.length === 1) draw(rows[0], LCD.y + LCD.h / 2 + 4);
  else rows.forEach((s, i) => draw(s, LCD.y + 14 + i * 14));
  // the desk
  box(g, 16, 196, 154, 104, '#3a3f58');
  box(g, 16, 196, 154, 6, '#555c7d');
  // the charger knob: a ring with turning arrows and a pointer
  const { x, y, r } = KNOB;
  disc(g, x, y, r + 3, '#161a2e');
  disc(g, x, y, r, '#9aa0bd');
  disc(g, x, y, r - 7, '#c9ceea');
  g.strokeStyle = PAL.white;
  g.lineWidth = 2;
  for (const a0 of [0.15, 1.15]) {
    g.beginPath();
    g.arc(x, y, r - 3, a0 * Math.PI, (a0 + 0.7) * Math.PI);
    g.stroke();
    const ea = (a0 + 0.7) * Math.PI;
    const px = x + Math.cos(ea) * (r - 3);
    const py = y + Math.sin(ea) * (r - 3);
    g.fillStyle = PAL.white;
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(px + Math.cos(ea - 1.9) * 5, py + Math.sin(ea - 1.9) * 5);
    g.lineTo(px + Math.cos(ea + 1.9 - Math.PI) * 5, py + Math.sin(ea + 1.9 - Math.PI) * 5);
    g.fill();
  }
  line(g, x, y, x + Math.sin(o.knob) * (r - 9), y - Math.cos(o.knob) * (r - 9), INK, 3);
  disc(g, x, y, 3, INK);
  if (o.read !== null) tag(g, o.read, x, 256, 'center', o.readColor ?? PAL.yellow, 14);
  // the red RELEASE button and the laser key
  box(g, BUTTON.x - 17, BUTTON.y - 6, 34, 26, '#161a2e');
  glow(g, PAL.red, 6 + 4 * o.press, () => disc(g, BUTTON.x, BUTTON.y + 2 * o.press, BUTTON.r - 2 * o.press, '#e0282d'));
  text(g, 'RELEASE', BUTTON.x, 262, PAL.dim, 11);
  disc(g, KEYHOLE.x, KEYHOLE.y, KEYHOLE.r + 3, '#161a2e');
  disc(g, KEYHOLE.x, KEYHOLE.y, KEYHOLE.r, '#c9ceea');
  g.save();
  g.translate(KEYHOLE.x, KEYHOLE.y);
  g.rotate((o.key * Math.PI) / 2);
  line(g, 0, -6, 0, 6, INK, 3);
  g.restore();
  text(g, 'KEY', KEYHOLE.x, 218, PAL.dim, 11);
  // the tablet clipped to the desk
  box(g, TABLET.x, TABLET.y, TABLET.w, TABLET.h, '#161a2e', '#7b82a6');
  box(g, TABLET.x + 3, TABLET.y + 3, TABLET.w - 6, TABLET.h - 6, mix('#1d3a5a', '#4de1ff', o.tap * 0.6));
  line(g, TABLET.x + 6, TABLET.y + 8, TABLET.x + 22, TABLET.y + 8, 'rgba(255,255,255,0.5)', 1.5);
  line(g, TABLET.x + 6, TABLET.y + 13, TABLET.x + 16, TABLET.y + 13, 'rgba(255,255,255,0.35)', 1.5);
}

// ---- Femi ----------------------------------------------------------------------------------------------------------------------------------------------

export type FemiMood = 'happy' | 'squint' | 'cheer' | 'worried' | 'startled' | 'shrug';
export interface FemiOpts {
  mood: FemiMood;
  /** 0 goggles pushed up on the forehead, 1 pulled down over the eyes. */
  goggles: number;
  /** Where the far hand goes (the RELEASE button, the key), and how far it has got (0 to 1), or null to let it hang or tap the tablet. */
  hand: [number, number] | null;
  reach: number;
  /** A raised fist (a win). */
  fist: boolean;
  /** Idle life: blinking, the goggle glint, the tablet tap and the glance up at the column. Off during a shot. */
  idle: boolean;
  /** Reduced motion: no head turn. */
  calm: boolean;
}

/** Femi, about 76 px tall, feet at FEMI: lab coat with a name tag, orange goggles, a hair puff and silver gloves; her near hand rests on the charger knob. */
export function femi(g: G, t: number, o: FemiOpts) {
  const { x: fx, y: fy } = FEMI;
  const startled = o.mood === 'startled';
  const shrug = o.mood === 'shrug';
  const cycle6 = t % 6;
  const look = o.idle && !o.calm && cycle6 < 0.9 ? Math.sin((Math.PI * cycle6) / 0.9) : 0;
  const tapping = o.idle && !o.hand && t % 5 < 0.5 ? Math.abs(Math.sin(((t % 5) / 0.5) * Math.PI * 3)) : 0;
  const hx = fx + look * 2;
  const hy = fy - 60 + (tapping > 0 ? 1.5 : 0);
  // the far arm, behind the coat
  const rest: [number, number] = shrug ? [64, 268] : [74, 300];
  const target: [number, number] = o.hand ?? (tapping > 0 ? [TABLET.x + 15, TABLET.y + 8 + tapping * 2] : rest);
  const reach = o.hand ? o.reach : tapping > 0 ? 1 : 0;
  const hand: [number, number] = [rest[0] + (target[0] - rest[0]) * reach, rest[1] + (target[1] - rest[1]) * reach];
  const sleeve = (sx: number, sy: number, ex: number, ey: number, hxr: number, hyr: number) => {
    line(g, sx, sy, ex, ey, '#f0f3ff', 8);
    line(g, ex, ey, hxr, hyr, '#f0f3ff', 7);
  };
  sleeve(80, 277, (80 + hand[0]) / 2 - 4, (277 + hand[1]) / 2 + 6, hand[0], hand[1]);
  disc(g, hand[0], hand[1], 4.5, '#c9ceea');
  // legs and shoes
  box(g, 78, 308, 8, 9, '#2a3050');
  box(g, 90, 308, 8, 9, '#2a3050');
  disc(g, 80, 317, 4.5, '#14172c');
  disc(g, 96, 317, 4.5, '#14172c');
  // the white lab coat with a blue name tag
  g.fillStyle = '#f0f3ff';
  g.beginPath();
  g.moveTo(72, 272);
  g.lineTo(104, 272);
  g.lineTo(110, 309);
  g.lineTo(66, 309);
  g.closePath();
  g.fill();
  line(g, 88, 274, 88, 309, '#c5cbe6', 1.5);
  box(g, 75, 279, 29, 14, '#3d6df0');
  text(g, 'FEMI', 89.5, 290, '#ffffff', 11);
  // the near arm, resting on the charger knob (a fist raised on a win)
  const nearHand: [number, number] = o.fist ? [112, 224] : shrug ? [114, 226] : startled ? [112, 228] : [115, 233];
  sleeve(98, 277, o.fist ? 98 : 96, 258, nearHand[0], nearHand[1]);
  disc(g, nearHand[0], nearHand[1], o.fist ? 5.5 : 4.5, '#c9ceea');
  // the head: a hair puff, the face, and the goggles
  const puff = startled ? 4 : 0;
  g.fillStyle = '#2a1a2a';
  for (const [px, py, pr] of [[hx - 8, hy - 11, 7], [hx, hy - 15, 8], [hx + 8, hy - 11, 7]] as const) {
    g.beginPath();
    g.arc(px, py, pr + puff, 0, Math.PI * 2);
    g.fill();
  }
  disc(g, hx, hy, 13, '#b9794a');
  femiFace(g, hx, hy, o, t);
  const gy = hy - 9 + 8 * o.goggles;
  line(g, hx - 13, gy, hx + 13, gy, '#3a2a1a', 3);
  for (const s of [-1, 1]) {
    disc(g, hx + s * 5.5, gy, 4.8, PAL.orange);
    disc(g, hx + s * 5.5, gy, 3.2, '#ffcf8f');
  }
  if (o.idle && t % 4 < 0.25) line(g, hx - 7.5, gy - 3, hx - 4, gy + 1, '#ffffff', 1.5);
}

function femiFace(g: G, x: number, y: number, o: FemiOpts, t: number) {
  const { mood } = o;
  const eyesHidden = o.goggles > 0.5;
  g.strokeStyle = INK;
  g.fillStyle = INK;
  g.lineWidth = 1.6;
  if (!eyesHidden) {
    const blink = o.idle && t % 3 < 0.12;
    if (mood === 'squint' || blink) {
      line(g, x - 7, y, x - 2.5, y, INK, 1.8);
      line(g, x + 2.5, y, x + 7, y, INK, 1.8);
    } else if (mood === 'cheer') {
      for (const s of [-1, 1]) {
        g.beginPath();
        g.arc(x + s * 4.5, y + 1, 2.4, Math.PI, 2 * Math.PI);
        g.stroke();
      }
    } else if (mood === 'startled') {
      for (const s of [-1, 1]) {
        disc(g, x + s * 4.5, y, 3.4, '#ffffff');
        disc(g, x + s * 4.5, y, 1.4, INK);
      }
    } else {
      disc(g, x - 4.5, y, 1.7, INK);
      disc(g, x + 4.5, y, 1.7, INK);
    }
  }
  g.beginPath();
  if (mood === 'cheer') g.arc(x, y + 4, 4.5, 0.1 * Math.PI, 0.9 * Math.PI);
  else if (mood === 'worried') g.arc(x, y + 9, 3.6, 1.15 * Math.PI, 1.85 * Math.PI);
  else if (mood === 'startled') g.arc(x, y + 7, 2.4, 0, Math.PI * 2);
  else if (mood === 'shrug' || mood === 'squint') {
    g.moveTo(x - 3, y + 7);
    g.lineTo(x + 3, y + 7);
  } else g.arc(x, y + 4, 4, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  if (mood === 'worried') disc(g, x + 14, y - 6 + ((t * 18) % 7), 1.8, PAL.cyan);
}

// ---- Dot -----------------------------------------------------------------------------------------------------------------------------------------------

export type DotState = 'idle' | 'win' | 'miss' | 'pulled' | 'flat';
export interface DotOpts {
  state: DotState;
  /** Seconds since the state began (0 for idle). */
  u: number;
  /** The shot is on: the lens zooms and the stalk leans toward the column. */
  fire: boolean;
  calm: boolean;
}

/** Dot, the inspection robot, about 66 px tall: a grey box on three wheels, a magnifier-lens eye on a stalk, a chest screen and two pincers. */
export function dotBot(g: G, t: number, o: DotOpts) {
  const calm = o.calm;
  const roll = calm ? 0 : 3 * Math.sin(t * 0.8);
  const hop = o.state === 'win' && o.u < 1 && !calm ? 6 * Math.abs(Math.sin(o.u * Math.PI * 3)) : 0;
  const cx = DOT.x + roll;
  const by = DOT.y - hop;
  g.save();
  if (o.state === 'flat') {
    g.translate(cx, DOT.y);
    g.rotate((-10 * Math.PI) / 180);
    g.translate(-cx, -DOT.y);
  }
  for (const wx of [-12, 0, 12]) {
    disc(g, cx + wx, by - 5, 5, '#14172c');
    disc(g, cx + wx, by - 5, 2, '#7b82a6');
  }
  // the pincer arms
  const up = o.state === 'win' ? ease(o.u / 0.3) : 0;
  for (const s of [-1, 1]) {
    const ex = cx + s * 27;
    const ey = by - 24 - up * 20;
    line(g, cx + s * 18, by - 24, ex, ey, '#8d93b5', 3);
    line(g, ex, ey, ex + s * 4, ey - 5, '#8d93b5', 2.5);
    line(g, ex, ey, ex + s * 5, ey + 2, '#8d93b5', 2.5);
  }
  // the body, chest screen and LED
  g.fillStyle = '#9aa0bd';
  rr(g, cx - 18, by - 42, 36, 30, 7);
  g.fill();
  g.strokeStyle = '#5a6290';
  g.lineWidth = 1.5;
  g.stroke();
  box(g, cx - 12, by - 38, 22, 14, '#04120a', '#3a6a4a');
  const ledOn = t % 1.2 < 0.6;
  disc(g, cx + 13, by - 36, 2, ledOn ? PAL.green : '#2a4a3a');
  const screen = o.state === 'win' ? ['✓', PAL.green] : o.state === 'miss' ? ['✗', PAL.red] : o.state === 'pulled' ? ['!', PAL.yellow] : o.state === 'flat' ? ['…', PAL.dim] : null;
  if (screen) text(g, screen[0], cx - 1, by - 26, screen[1], 14);
  else line(g, cx - 8, by - 31, cx + 6 + (calm ? 0 : 2 * Math.sin(t * 2)), by - 31, 'rgba(93,255,154,0.6)', 2);
  // the stalk and the lens
  const scan = Math.sin(t * 1.5) * 6;
  let lx = scan;
  let ly = by - 58;
  let lr = 10;
  if (o.fire) {
    lr = 14;
    lx = -8 + scan / 3;
    ly -= 2;
  }
  if (o.state === 'miss' && o.u < 0.6) lx += 6 * Math.sin(o.u * 20.9);
  if (o.state === 'pulled') {
    lr = 8;
    ly = by - 50;
    lx = 0;
  }
  line(g, cx, by - 42, cx + lx, ly + lr * 0.6, '#8d93b5', 3);
  disc(g, cx + lx, ly, lr + 2, '#2a2f48');
  disc(g, cx + lx, ly, lr, '#7fd8ff');
  disc(g, cx + lx + scan * 0.25, ly, lr * 0.4, '#0b1030');
  disc(g, cx + lx - lr * 0.35, ly - lr * 0.35, lr * 0.2, '#ffffff');
  if (o.state === 'pulled') {
    const seed = Math.floor(t / 0.05);
    for (let i = 0; i < 4; i++) {
      const sx = cx + (jit(seed + i) * 2) * 24;
      const sy = ly - 4 + jit(seed * 3 + i) * 24;
      line(g, sx - 3, sy, sx + 3, sy, PAL.yellow, 2);
      line(g, sx, sy - 3, sx, sy + 3, PAL.yellow, 2);
    }
  }
  g.restore();
}
