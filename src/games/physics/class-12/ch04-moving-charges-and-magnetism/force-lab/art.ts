// Drawing for "Beam Hall": the proton-therapy hall, Imani at her desk, Phil the test phantom, Rodney the copper rod, the switchyard, the test magnet,
// the cyclotron and the imaging tube. Nothing here knows the answer of a round: it draws the positions, moods and states it is handed.
// No Math.random: every wobble comes from the clock. Opaque fills cover the engine grid.
import { PAL } from '@core/arcade';
import { glow, line, text } from '@core/neon';
import type { FocusRow, KickRow, LiftRow } from './logic';

export type G = CanvasRenderingContext2D;
export type Pt = [number, number];

// ---- layout (logical 640 × 340 pixels) ----
export const IMANI = { x: 44, feet: 318 }; // hero, about 74 px tall (x 10 to 80, y 244 to 318)
export const DESK = { x: 74, y: 266, w: 66, h: 52 };
export const BUTTON = { x: 120, y: 262 }; // the red Power on button
export const LCD = { x: 10, y: 36, w: 214, h: 20 }; // the beam monitor on the wall: the helper
export const GOAL = { x: 320, y: 22 };
export const CLOCK = { x: 400, y: 52, r: 12 };
export const TRK = { x0: 180, x1: 600, y: 324 }; // the bottom handle track
export const HIT: Pt = [320, 70]; // fixed burst point, every level
export const BEACON = { x: 24, y: 20 };
// L1
export const LINE_Y = 190;
export const KICKER = { x0: 280, x1: 380, y0: 150, y1: 230 };
export const KSWITCH = { x: 330, y: 132 };
export const ROOM = { w: 104, h: 58, upY: 60, downY: 244, rightX: 486, leftX: 160 };
// L2
export const RING = { x: 360, y: 180, r: 100, inner: 86 };
export const ROD = { x0: 282, x1: 438, y: 196 };
export const STAND = { y: 60, x0: 290, x1: 430, post: 470 };
export const STOP_Y = 150;
export const THREADS = [300, 420];
export const PSU = { x: 154, y: 238, w: 60, h: 40 };
export const LSWITCH = { x: 184, y: 258 };
export const INSET = { x: 516, y: 62, w: 104, h: 76 };
// L3, L4
export const CYCL = { x: 300, y: 186, R: 112 };
export const rPx = (rCm: number) => (rCm / 80) * CYCL.R;
export const BT = { x: 452, y0: 172, y1: 52 };
export const PHIL = { x: 545, y: 250 };
export const PIPE: Pt[] = [[412, 186], [440, 186], [476, 248]];
// L5
export const TUBE = { x0: 170, x1: 560, y: 180, r: 34 };
export const SPOT = { x: 600, y: 112, r: 28 };

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (u: number) => clamp01(u) * clamp01(u) * (3 - 2 * clamp01(u));
const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
const INK = '#1b1030';
const SKIN = '#c68b5a';
const COPPER = '#c9803a';

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
function ring(g: G, x: number, y: number, r: number, color: string, w = 2) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.stroke();
}
/** A field symbol: a dot for out of the screen, a cross for into it. */
export function fieldSym(g: G, x: number, y: number, out: boolean, color: string = PAL.cyan, r = 6) {
  ring(g, x, y, r, color, 1.5);
  if (out) dot(g, x, y, r * 0.35, color);
  else {
    const d = r * 0.6;
    line(g, x - d, y - d, x + d, y + d, color, 1.5);
    line(g, x - d, y + d, x + d, y - d, color, 1.5);
  }
}
/** A pill of dark glass behind a line of text. */
export function tag(g: G, s: string, x: number, y: number, align: 'left' | 'right' | 'center', color: string = PAL.white, size = 12) {
  const w = s.length * (size * 0.58) + 10;
  const x0 = align === 'left' ? x - 5 : align === 'right' ? x - w + 5 : x - w / 2;
  g.fillStyle = 'rgba(6,10,36,0.78)';
  rr(g, x0, y - size - 1, w, size + 6, 4);
  g.fill();
  text(g, s, x, y, color, size, align);
}
/** The round's goal as one line on a dark plate at GOAL. */
export function goalLine(g: G, s: string) {
  const w = s.length * 13 * 0.58 + 20;
  g.fillStyle = 'rgba(0,0,0,0.6)';
  rr(g, GOAL.x - w / 2, GOAL.y - 14, w, 24, 8);
  g.fill();
  text(g, s, GOAL.x, GOAL.y + 4, PAL.white, 13);
}
/** A handle's grip: a white ring with a glyph, highlighted while dragged. */
export function handleGrip(g: G, x: number, y: number, glyph: string, hot: boolean) {
  g.fillStyle = hot ? 'rgba(255,210,63,0.35)' : 'rgba(10,16,48,0.3)';
  g.beginPath();
  g.arc(x, y, 20, 0, Math.PI * 2);
  g.fill();
  ring(g, x, y, 20, hot ? PAL.yellow : PAL.white, 2);
  text(g, glyph, x, y + 4, hot ? PAL.yellow : PAL.white, 12);
}

// ---- the hall ----

/** Concrete walls, panel seams, a hazard stripe, a trefoil sign (L1, L2 only) and the round's top band. */
export function hall(g: G, _t: number, k: number, trefoil = false) {
  box(g, 0, 0, 640, 340, '#1a2033');
  for (let x = 80; x < 640; x += 80) line(g, x, 0, x, 304, '#141a2a', 2);
  line(g, 0, 150, 640, 150, '#171d2e', 1);
  box(g, 0, 0, 640, 12, ['#0d1430', '#2a3a6a', '#6a3a2a'][Math.min(2, k)]);
  box(g, 0, 312, 640, 28, '#0e1220');
  box(g, 0, 304, 640, 8, '#141a2a');
  for (let x = -8; x < 640; x += 16) {
    g.fillStyle = PAL.yellow;
    g.beginPath();
    g.moveTo(x, 312);
    g.lineTo(x + 8, 312);
    g.lineTo(x + 16, 304);
    g.lineTo(x + 8, 304);
    g.closePath();
    g.fill();
  }
  if (trefoil) {
    dot(g, 230, 96, 15, PAL.yellow);
    g.fillStyle = INK;
    for (let i = 0; i < 3; i++) {
      const a = (i * 2 * Math.PI) / 3 - Math.PI / 2;
      g.beginPath();
      g.moveTo(230, 96);
      g.arc(230, 96, 11, a - 0.5, a + 0.5);
      g.closePath();
      g.fill();
    }
    dot(g, 230, 96, 3, PAL.yellow);
    dot(g, 230, 96, 2, INK);
  }
}

/** The control desk with its red Power on button (`press` 0 to 1 drops it 6 px). */
export function desk(g: G, press: number) {
  box(g, DESK.x, DESK.y, DESK.w, DESK.h, '#46507a', '#7b82a6');
  box(g, DESK.x, DESK.y, DESK.w, 4, '#6b76a8');
  box(g, DESK.x + 6, DESK.y + 8, 36, 7, '#20263f', '#7b82a6');
  for (let i = 0; i < 3; i++) dot(g, DESK.x + 10 + i * 10, DESK.y + 28, 2.5, [PAL.green, PAL.yellow, PAL.cyan][i]);
  const drop = 6 * clamp01(press);
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(BUTTON.x, DESK.y, 12, 4, 0, 0, Math.PI * 2);
  g.stroke();
  box(g, BUTTON.x - 3, BUTTON.y + 2 + drop, 6, DESK.y - BUTTON.y - 2 - drop, '#7a1c1c');
  if (press > 0) glow(g, PAL.red, 14, () => dot(g, BUTTON.x, BUTTON.y + drop, 8, PAL.red));
  g.fillStyle = press > 0 ? '#ff7a7a' : '#d83a3a';
  g.beginPath();
  g.ellipse(BUTTON.x, BUTTON.y + drop, 8, 5, 0, 0, Math.PI * 2);
  g.fill();
}

/** The wall beam monitor: the helper. One string per line so tests can find it. */
export function monitor(g: G, s: string, color: string) {
  text(g, 'BEAM MONITOR', LCD.x + LCD.w / 2, LCD.y - 4, PAL.dim, 11);
  rr(g, LCD.x - 3, LCD.y - 3, LCD.w + 6, LCD.h + 6, 4);
  g.fillStyle = '#3a3f58';
  g.fill();
  box(g, LCD.x, LCD.y, LCD.w, LCD.h, '#050805');
  text(g, s, LCD.x + 7, LCD.y + 15, color, 12, 'left');
}

/** The wall clock: 05:00, 05:40 and 06:20 for the three rounds. */
export function clock(g: G, k: number) {
  dot(g, CLOCK.x, CLOCK.y, CLOCK.r + 2, '#3a3f58');
  dot(g, CLOCK.x, CLOCK.y, CLOCK.r, '#f4f6ff');
  const [h, m] = [[5, 0], [5, 40], [6, 20]][Math.min(2, k)];
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    line(g, CLOCK.x + Math.sin(a) * 9.5, CLOCK.y - Math.cos(a) * 9.5, CLOCK.x + Math.sin(a) * 11, CLOCK.y - Math.cos(a) * 11, INK, 1);
  }
  const ha = ((h + m / 60) * Math.PI) / 6;
  const ma = (m * Math.PI) / 30;
  line(g, CLOCK.x, CLOCK.y, CLOCK.x + Math.sin(ha) * 6, CLOCK.y - Math.cos(ha) * 6, INK, 2);
  line(g, CLOCK.x, CLOCK.y, CLOCK.x + Math.sin(ma) * 9, CLOCK.y - Math.cos(ma) * 9, INK, 1.4);
}

/** The red beacon: still, glowing (round 3) or turning during a run. */
export function beacon(g: G, t: number, mode: 'off' | 'glow' | 'turn') {
  box(g, BEACON.x - 9, BEACON.y + 6, 18, 5, '#3a3f58');
  if (mode === 'turn' && !calm()) {
    const a = t * Math.PI;
    g.fillStyle = 'rgba(255,90,90,0.22)';
    g.beginPath();
    g.moveTo(BEACON.x, BEACON.y);
    g.lineTo(BEACON.x + Math.cos(a - 0.25) * 70, BEACON.y + Math.sin(a - 0.25) * 70);
    g.lineTo(BEACON.x + Math.cos(a + 0.25) * 70, BEACON.y + Math.sin(a + 0.25) * 70);
    g.closePath();
    g.fill();
  }
  if (mode === 'off') dot(g, BEACON.x, BEACON.y, 8, '#7a2a2a');
  else glow(g, PAL.red, 14, () => dot(g, BEACON.x, BEACON.y, 8, PAL.red));
}

// ---- Imani ----

export interface ImaniState {
  mood: 'happy' | 'cheer' | 'worried';
  /** 0 to 1: her hand pressing the button. */
  press: number;
  /** Squeezed eyes and raised shoulders (a spark miss). */
  flinch: boolean;
}

/** Imani: lab coat, safety glasses, lanyard, dosimeter badge, tablet. Breathes, blinks, glances at the monitor, taps her tablet. */
export function imani(g: G, t: number, o: ImaniState) {
  const x = IMANI.x;
  const br = (Math.sin(t * 2) + 1) / 2; // chest rises 1 px
  const up = o.flinch ? 3 : 0;
  const cheer = o.mood === 'cheer';
  const tap = t % 4 < 0.15 ? 1 : 0;
  // legs and clogs
  box(g, x - 10, 298, 8, 16, '#252a40');
  box(g, x + 3, 298, 8, 16, '#252a40');
  g.fillStyle = '#f4f6ff';
  g.beginPath();
  g.ellipse(x - 7, 316, 7, 3, 0, 0, Math.PI * 2);
  g.ellipse(x + 8, 316, 7, 3, 0, 0, Math.PI * 2);
  g.fill();
  // coat over a teal scrub top
  const top = 272 - br - up;
  box(g, x - 15, top, 30, 302 - top, '#f4f6ff', '#c8cfe8');
  box(g, x - 3, top, 6, 20, '#2aa6a0');
  line(g, x, top + 20, x, 302, '#c8cfe8', 1);
  // lanyard, id card, dosimeter badge with a trefoil
  line(g, x - 4, top, x, top + 12, PAL.cyan, 1.5);
  line(g, x + 4, top, x, top + 12, PAL.cyan, 1.5);
  box(g, x - 3, top + 12, 6, 8, '#ffffff', PAL.cyan);
  box(g, x + 7, top + 16, 7, 7, PAL.yellow, '#a08000');
  dot(g, x + 10.5, top + 19.5, 1.6, INK);
  // left arm and the tablet (raised overhead on a win)
  const hx = cheer ? x - 20 : x - 20;
  const hy = cheer ? 238 : 292 + tap;
  line(g, x - 14, top + 6, hx, hy, '#f4f6ff', 5);
  dot(g, hx, hy, 3, SKIN);
  g.save();
  g.translate(hx + (cheer ? 0 : -4), hy - (cheer ? 8 : 2));
  g.rotate(cheer ? -0.2 : -0.15);
  box(g, -8, -6, 16, 12, '#222a44', PAL.cyan);
  box(g, -6, -4, 12, 8, cheer ? '#1d6a46' : '#14315a');
  g.restore();
  // right arm: the hand hovers over the button, and presses it
  const hand: Pt = [BUTTON.x - 9, BUTTON.y - 8 + 6 * clamp01(o.press)];
  g.strokeStyle = '#f4f6ff';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(x + 14, top + 6);
  g.lineTo(x + 40, top + 2 - up);
  g.lineTo(hand[0], hand[1]);
  g.stroke();
  dot(g, hand[0], hand[1], 3.2, SKIN);
  // head, tilted 8 degrees for 0.6 s every 5 s (a glance at the monitor)
  const glance = t % 5 < 0.6 && o.mood === 'happy';
  g.save();
  g.translate(x, top);
  g.rotate(glance ? (-8 * Math.PI) / 180 : 0);
  dot(g, 0, -9, 9, SKIN);
  g.fillStyle = '#2a1a14';
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + (i * Math.PI) / 5;
    g.beginPath();
    g.arc(Math.cos(a) * 8, -9 + Math.sin(a) * 7.5, 3.6, 0, Math.PI * 2);
    g.fill();
  }
  dot(g, -9, -7, 1.6, PAL.yellow);
  dot(g, 9, -7, 1.6, PAL.yellow);
  // face under safety glasses
  const blink = t % 3 < 0.12;
  g.strokeStyle = INK;
  g.fillStyle = INK;
  g.lineWidth = 1.5;
  if (o.flinch) {
    line(g, -6, -10, -2, -9, INK, 1.8);
    line(g, 2, -9, 6, -10, INK, 1.8);
  } else if (cheer) {
    g.beginPath();
    g.arc(-4, -9.5, 2, Math.PI, 2 * Math.PI);
    g.arc(4, -9.5, 2, Math.PI, 2 * Math.PI);
    g.stroke();
  } else {
    g.beginPath();
    g.ellipse(-4, -9.5, 1.5, blink ? 0.4 : 1.6, 0, 0, Math.PI * 2);
    g.ellipse(4, -9.5, 1.5, blink ? 0.4 : 1.6, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath();
  if (cheer) g.arc(0, -6, 3.5, 0.1 * Math.PI, 0.9 * Math.PI);
  else if (o.mood === 'worried') g.arc(0, -2.5, 2.8, 1.15 * Math.PI, 1.85 * Math.PI);
  else g.arc(0, -7, 2.6, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  g.fillStyle = 'rgba(190,225,255,0.22)';
  g.fillRect(-8, -13, 16, 7);
  g.strokeStyle = 'rgba(244,246,255,0.9)';
  g.lineWidth = 1;
  g.strokeRect(-8, -13, 16, 7);
  if (o.mood === 'worried') {
    g.fillStyle = PAL.cyan;
    g.beginPath();
    g.arc(-11, -9 + ((t * 14) % 7), 1.8, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

// ---- Phil ----

export interface PhilOpts {
  /** The target ring: on his chest, seen through a cutaway, or none. */
  ring?: 'chest' | 'cutaway' | 'none';
  ringGlow?: boolean;
  /** Draw the treatment couch under him (level 3 and 4). */
  couch?: boolean;
  /** The couch LED turns red. */
  ledRed?: boolean;
}

/** Phil the phantom: a smooth grey mannequin with a dome head and a face screen, lying with his head to the right. (x, y) is his torso centre. */
export function phil(g: G, x: number, y: number, scale: number, t: number, mood: 'idle' | 'win' | 'miss', band: string, o: PhilOpts = {}) {
  g.save();
  g.translate(x, y);
  g.scale(scale, scale);
  if (o.couch) {
    g.fillStyle = '#2f3b66';
    rr(g, -80, 16, 158, 16, 6);
    g.fill();
    box(g, -40, 32, 80, 18, '#252d4f');
    const led = o.ledRed ? PAL.red : Math.sin(t * ((2 * Math.PI) / 1.5)) > 0 ? PAL.green : '#1d4a30';
    dot(g, -68, 24, 3, led);
  }
  // legs, torso, arm with the wristband
  g.fillStyle = '#aab0c4';
  rr(g, -76, -9, 40, 22, 8);
  g.fill();
  g.fillStyle = '#c3c8d8';
  rr(g, -42, -15, 86, 30, 12);
  g.fill();
  g.fillStyle = '#aab0c4';
  rr(g, -26, 6, 52, 9, 4);
  g.fill();
  box(g, 14, 6, 8, 9, band);
  // neck and dome head with the face screen
  box(g, 40, -8, 10, 12, '#aab0c4');
  g.fillStyle = '#d6dae8';
  g.beginPath();
  g.arc(58, -4, 15, 0, Math.PI * 2);
  g.fill();
  rr(g, 49, -11, 20, 14, 3);
  g.fillStyle = '#071018';
  g.fill();
  const blink = t % 2.5 < 0.12;
  g.strokeStyle = PAL.cyan;
  g.fillStyle = PAL.cyan;
  g.lineWidth = 1.4;
  if (mood === 'win') {
    g.beginPath();
    g.moveTo(52, -3);
    g.lineTo(54.5, -7);
    g.lineTo(57, -3);
    g.moveTo(61, -3);
    g.lineTo(63.5, -7);
    g.lineTo(66, -3);
    g.stroke();
    g.beginPath();
    g.arc(59, -2, 3.5, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
  } else if (mood === 'miss') {
    g.beginPath();
    g.arc(54.5, -6, 2.4, 0, Math.PI * 2);
    g.arc(63.5, -6, 2.4, 0, Math.PI * 2);
    g.stroke();
    text(g, '?', 72, -14, PAL.cyan, 11);
  } else {
    g.beginPath();
    g.ellipse(54.5, -6, 1.6, blink ? 0.4 : 1.8, 0, 0, Math.PI * 2);
    g.ellipse(63.5, -6, 1.6, blink ? 0.4 : 1.8, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(59, -3, 3, 0.2 * Math.PI, 0.8 * Math.PI);
    g.stroke();
  }
  // the target ring
  if (o.ring === 'cutaway') {
    box(g, -26, -13, 52, 26, '#10162c', '#7b82a6');
  }
  if (o.ring && o.ring !== 'none') {
    const col = o.ringGlow ? PAL.green : '#2f8f55';
    if (o.ringGlow) glow(g, PAL.green, 12, () => ring(g, 0, 0, 9, col, 2.5));
    else ring(g, 0, 0, 9, col, 2);
    ring(g, 0, 0, 4, col, 1.5);
  }
  g.restore();
}

// ---- level 1: the switchyard ----

export const doorOf = (r: KickRow): Pt => {
  const rx = r.from === 'left' ? ROOM.rightX : ROOM.leftX;
  return [rx + ROOM.w / 2, r.port === 'up' ? ROOM.upY + ROOM.h : ROOM.downY];
};
export const pipeEntry = (r: KickRow): Pt => (r.from === 'left' ? [150, LINE_Y] : [630, LINE_Y]);

/** The kicker, the vacuum chamber with its two rooms, the pipe and the polarity toggle. `out` is the player's field. */
export function switchyard(g: G, r: KickRow, out: number, ph: { t: number; mood: 'idle' | 'win' | 'miss'; band: string; ring: boolean }) {
  const left = r.from === 'left';
  // chamber
  const cx0 = left ? 380 : 150;
  const cx1 = left ? 600 : 280;
  g.fillStyle = 'rgba(120,140,200,0.10)';
  g.fillRect(cx0, 56, cx1 - cx0, 250);
  g.strokeStyle = '#7b82a6';
  g.lineWidth = 2;
  g.strokeRect(cx0, 56, cx1 - cx0, 250);
  // pipe into the kicker
  const [ex] = pipeEntry(r);
  const px0 = left ? ex : KICKER.x1;
  const px1 = left ? KICKER.x0 : ex;
  box(g, px0, LINE_Y - 6, px1 - px0, 12, '#5a6286', '#8d93b5');
  box(g, px0, LINE_Y - 6, px1 - px0, 3, '#7b82a6');
  // rooms
  const rx = left ? ROOM.rightX : ROOM.leftX;
  for (const port of ['up', 'down'] as const) {
    const ry = port === 'up' ? ROOM.upY : ROOM.downY;
    const mine = port === r.port;
    box(g, rx, ry, ROOM.w, ROOM.h, mine ? '#22304f' : '#1a2036', mine ? PAL.green : '#555c7a');
    const doorY = port === 'up' ? ry + ROOM.h : ry;
    box(g, rx + ROOM.w / 2 - 14, doorY - 3, 28, 6, mine ? '#baffd4' : '#555c7a');
    if (mine) {
      text(g, port === 'up' ? 'Room A' : 'Room B', rx + 30, ry + 12, PAL.white, 11);
      phil(g, rx + ROOM.w / 2 + 4, ry + ROOM.h / 2 + 8, 0.6, ph.t, ph.mood, ph.band, { ring: ph.ring ? 'chest' : 'none', ringGlow: ph.mood === 'win' });
    } else text(g, 'NOT IN USE', rx + ROOM.w / 2, ry + ROOM.h / 2 + 4, PAL.dim, 11);
  }
  const door = doorOf(r);
  tag(g, `push ${r.f} × 10⁻¹³ N`, door[0], r.port === 'up' ? door[1] + 18 : door[1] - 8, 'center', PAL.white, 12);
  // the kicker magnet with the player's field in its gap
  box(g, KICKER.x0, KICKER.y0, 100, 80, '#1c2a52', '#4a5a98');
  box(g, KICKER.x0, KICKER.y0, 100, 10, COPPER);
  box(g, KICKER.x0, KICKER.y1 - 10, 100, 10, COPPER);
  box(g, KICKER.x0, 170, 100, 40, '#0a1030');
  for (const sx of [290, 310, 330, 350, 370]) fieldSym(g, sx, LINE_Y, out === 1);
  // the polarity toggle
  box(g, KSWITCH.x - 8, KSWITCH.y - 4, 16, 8, '#3a3f58', '#8d93b5');
  const tipY = KSWITCH.y + (out ? -14 : 14);
  line(g, KSWITCH.x, KSWITCH.y, KSWITCH.x, tipY, PAL.white, 4);
  dot(g, KSWITCH.x, tipY, 4, PAL.yellow);
  text(g, '⊙ out', KSWITCH.x + 24, KSWITCH.y - 8, out ? PAL.yellow : PAL.dim, 11, 'left');
  text(g, '⊗ into', KSWITCH.x + 24, KSWITCH.y + 14, out ? PAL.dim : PAL.yellow, 11, 'left');
  // the incoming beam's tag
  const [ex2, ey] = pipeEntry(r);
  tag(g, `${r.pt === 'p' ? 'p⁺' : 'e⁻'} ${r.v} × 10⁶ m/s`, left ? ex2 + 6 : ex2 - 6, ey - 14, left ? 'left' : 'right', PAL.white, 12);
}

/** A particle bunch: a 7 px ball with a + or − and a tail of fading dots. */
export function bunch(g: G, x: number, y: number, pt: 'p' | 'e', tail: Pt[] = [], size = 3.5) {
  const col = pt === 'p' ? PAL.orange : PAL.cyan;
  tail.forEach(([tx, ty], i) => {
    g.globalAlpha = 0.55 * (1 - i / tail.length);
    dot(g, tx, ty, size * (1 - i * 0.12), col);
  });
  g.globalAlpha = 1;
  glow(g, col, 10, () => dot(g, x, y, size, col));
  line(g, x - 2, y, x + 2, y, INK, 1.4);
  if (pt === 'p') line(g, x, y - 2, x, y + 2, INK, 1.4);
}

// ---- level 2: the test magnet, the rod and the stand ----

/** The test magnet seen face-on, its field along the view; the field and the caption are given facts. */
export function testMagnet(g: G, r: LiftRow, _t: number) {
  dot(g, RING.x, RING.y, RING.r, '#8a5a2b');
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI * 2) / 24;
    line(g, RING.x + Math.cos(a) * RING.inner, RING.y + Math.sin(a) * RING.inner, RING.x + Math.cos(a) * RING.r, RING.y + Math.sin(a) * RING.r, '#d99a55', 1.5);
  }
  ring(g, RING.x, RING.y, RING.r, COPPER, 2);
  dot(g, RING.x, RING.y, RING.inner, '#0e1326');
  g.globalAlpha = 0.7;
  for (const sx of [318, 346, 374, 402]) for (const sy of [112, 226, 252]) fieldSym(g, sx, sy, r.bOut, PAL.cyan, 6);
  g.globalAlpha = 1;
  text(g, `${r.t} T, ${r.bOut ? '⊙ out of the screen' : '⊗ into the screen'}`, 360, 300, PAL.white, 12);
}

/** The stand in front of the ring: the post, the crossbar and the clear plastic stop bar. */
export function stand(g: G) {
  line(g, STAND.post, 304, STAND.post, STAND.y, '#8d93b5', 5);
  line(g, STAND.x0, STAND.y, STAND.post, STAND.y, '#8d93b5', 5);
  box(g, STAND.x0, STOP_Y - 2, STAND.x1 - STAND.x0, 4, 'rgba(200,230,255,0.35)');
}

/** The rod's circuit from the power supply: red lead to the left end, along the rod, black lead back. */
export const circuit = (y: number): Pt[] => [[200, 244], [236, 248], [270, y + 8], [ROD.x0, y], [ROD.x1, y], [466, y + 10], [466, 306], [206, 306], [206, 262], [200, 262]];

export type RodMood = 'idle' | 'win' | 'sag' | 'dizzy' | 'snap';
/** Rodney the copper rod, hanging by two threads. `tilt` (radians) swings it about the right thread. */
export function rodney(g: G, y: number, tilt: number, mood: RodMood, t: number, thread: 'taut' | 'slack' | 'snapped', pupils = 0) {
  const pivot: Pt = [THREADS[1], y];
  const at = (px: number, py: number): Pt => {
    const dx = px - pivot[0];
    const dy = py - pivot[1];
    return [pivot[0] + dx * Math.cos(tilt) - dy * Math.sin(tilt), pivot[1] + dx * Math.sin(tilt) + dy * Math.cos(tilt)];
  };
  // leads
  const c = circuit(y);
  line(g, c[0][0], c[0][1], c[3][0], c[3][1], '#e0282d', 3);
  const black: Pt[] = c.slice(4);
  g.strokeStyle = '#2a2a30';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(black[0][0], black[0][1]);
  for (const p of black.slice(1)) g.lineTo(p[0], p[1]);
  g.stroke();
  // threads
  const ends = THREADS.map((tx) => at(tx, y - 4));
  THREADS.forEach((tx, i) => {
    if (thread === 'snapped' && i === 0) {
      line(g, tx, STAND.y, tx + 2, STAND.y + 22, '#f4f6ff', 1);
      line(g, ends[0][0], ends[0][1], ends[0][0] - 3, ends[0][1] - 20, '#f4f6ff', 1);
      return;
    }
    if (thread === 'slack') {
      g.strokeStyle = '#f4f6ff';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(tx, STAND.y);
      for (let s = 1; s <= 12; s++) g.lineTo(tx + Math.sin(s * 1.4 + t * 2) * 4 * Math.sin((s * Math.PI) / 12), STAND.y + ((ends[i][1] - STAND.y) * s) / 12);
      g.stroke();
    } else line(g, tx, STAND.y, ends[i][0], ends[i][1], '#f4f6ff', 1);
  });
  // the rod
  g.save();
  g.translate(pivot[0], pivot[1]);
  g.rotate(tilt);
  const lx = ROD.x0 - pivot[0];
  rr(g, lx, -5, ROD.x1 - ROD.x0, 10, 5);
  g.fillStyle = COPPER;
  g.fill();
  box(g, lx + 4, -4, ROD.x1 - ROD.x0 - 8, 2, '#ffd29a');
  // googly eyes
  const mx = 360 - pivot[0];
  for (const ex of [-10, 10]) {
    dot(g, mx + ex, -1, 5, '#ffffff');
    const jig = mood === 'idle' ? Math.sin(t * 1.5 + 1.2) * 1.4 : 0;
    const spin: Pt | null = mood === 'dizzy' ? [Math.cos(t * 14 + pupils) * 2.4, Math.sin(t * 14 + pupils) * 2.4] : null;
    const off: Pt = spin ?? (mood === 'win' ? [0, -2.4] : mood === 'sag' ? [0, 2.4] : [jig, 0.4]);
    dot(g, mx + ex + off[0], -1 + off[1], mood === 'snap' ? 3.4 : 2.2, INK);
  }
  g.restore();
  // the paper tag
  box(g, 336, 210, 48, 3, '#f4f6ff');
}

/** The power supply with its direction lever (`cur` 1 = left to right). */
export function psu(g: G, cur: number) {
  box(g, PSU.x, PSU.y, PSU.w, PSU.h, '#46507a', '#7b82a6');
  dot(g, PSU.x + 16, PSU.y + 12, 8, '#0a0f20');
  line(g, PSU.x + 16, PSU.y + 12, PSU.x + 21, PSU.y + 8, PAL.green, 1.5);
  dot(g, 200, 244, 3.5, '#e0282d');
  dot(g, 200, 262, 3.5, '#2a2a30');
  text(g, '+', 208, 247, PAL.white, 11);
  text(g, '−', 208, 266, PAL.white, 11);
  box(g, LSWITCH.x - 18, LSWITCH.y - 3, 36, 6, '#0a0f20', '#8d93b5');
  const tipX = LSWITCH.x + (cur ? 14 : -14);
  line(g, LSWITCH.x, LSWITCH.y, tipX, LSWITCH.y, PAL.white, 4);
  dot(g, tipX, LSWITCH.y, 4, PAL.yellow);
  text(g, '← current →', LSWITCH.x, 292, PAL.white, 11);
}

/** The "seen from above" card for the 30 degree rows. */
export function inset(g: G) {
  g.fillStyle = 'rgba(8,12,34,0.92)';
  rr(g, INSET.x, INSET.y, INSET.w, INSET.h, 6);
  g.fill();
  g.strokeStyle = '#7b82a6';
  g.lineWidth = 1;
  g.stroke();
  text(g, 'seen from above', INSET.x + INSET.w / 2, INSET.y + 13, PAL.dim, 11);
  const cx = INSET.x + INSET.w / 2;
  const cy = INSET.y + 44;
  const a = (30 * Math.PI) / 180;
  for (const o of [-16, 0, 16]) line(g, cx - 40 * Math.cos(a) - o * 0.3, cy + 40 * Math.sin(a) + o, cx + 40 * Math.cos(a) - o * 0.3, cy - 40 * Math.sin(a) + o, PAL.cyan, 1);
  line(g, cx - 40, cy, cx + 40, cy, COPPER, 4);
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(cx, cy, 24, -a, 0);
  g.stroke();
  text(g, '30°', cx + 38, cy - 6, PAL.yellow, 12);
}

// ---- levels 3 and 4: the cyclotron ----

/** The cyclotron seen from above: the magnet plate, two dees with a gap, the RF box, the source. Level 3 has the gold port notch on the rim. */
export function cyclotron(g: G, level: 3 | 4, portCm?: number) {
  dot(g, CYCL.x, CYCL.y, CYCL.R + 8, '#232a46');
  ring(g, CYCL.x, CYCL.y, CYCL.R + 8, '#4a5a98', 2);
  for (const side of [-1, 1]) {
    g.fillStyle = side < 0 ? '#9a6430' : '#a86c34';
    g.beginPath();
    g.arc(CYCL.x + side * 3, CYCL.y, CYCL.R, side < 0 ? Math.PI / 2 : -Math.PI / 2, side < 0 ? (3 * Math.PI) / 2 : Math.PI / 2);
    g.closePath();
    g.fill();
  }
  box(g, CYCL.x - 3, CYCL.y - CYCL.R, 6, 2 * CYCL.R, '#1a1f36');
  g.strokeStyle = 'rgba(255,214,150,0.22)';
  g.lineWidth = 1;
  for (const f of [0.3, 0.6, 0.9]) {
    g.beginPath();
    g.arc(CYCL.x, CYCL.y, CYCL.R * f, 0, Math.PI * 2);
    g.stroke();
  }
  box(g, CYCL.x - 16, CYCL.y - CYCL.R - 16, 32, 14, '#2a2f55', '#7b82a6');
  text(g, 'RF', CYCL.x, CYCL.y - CYCL.R - 5, PAL.white, 11);
  dot(g, CYCL.x, CYCL.y, 4, PAL.yellow);
  if (level === 3) {
    box(g, CYCL.x + CYCL.R - 4, CYCL.y - 8, 12, 16, PAL.yellow);
    if (portCm !== undefined) text(g, `port ${portCm} cm`, CYCL.x + CYCL.R, CYCL.y - 18, PAL.white, 12);
  } else text(g, 'same magnet', CYCL.x, 312, PAL.white, 11);
}

/** Level 4: the player's port, a gold block on the horizontal radius, with a dashed channel to the rim. */
export function portBlock(g: G, rCm: number) {
  const x = CYCL.x + rPx(rCm);
  line(g, x, CYCL.y, CYCL.x + CYCL.R + 8, CYCL.y, PAL.yellow, 2, [4, 4]);
  box(g, x - 7, CYCL.y - 7, 14, 14, PAL.yellow, '#a08000');
}

/** The pipe from the rim to Phil's couch. */
export function pipeToPhil(g: G) {
  g.strokeStyle = '#5a6286';
  g.lineWidth = 8;
  g.beginPath();
  g.moveTo(PIPE[0][0], PIPE[0][1]);
  for (const p of PIPE.slice(1)) g.lineTo(p[0], p[1]);
  g.stroke();
  g.strokeStyle = '#8d93b5';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(PIPE[0][0], PIPE[0][1]);
  for (const p of PIPE.slice(1)) g.lineTo(p[0], p[1]);
  g.stroke();
}

// ---- level 5: the imaging tube ----

/** The gun, the glass tube with its coil bands (`glowK` 0 to 1 brightens them), the tags and the dimension arrow. */
export function tube(g: G, r: FocusRow, glowK: number) {
  box(g, 130, TUBE.y - 14, 40, 28, '#2a2f55', '#7b82a6');
  box(g, 160, TUBE.y - 18, 8, 36, '#d6c9a8');
  g.fillStyle = 'rgba(170,210,255,0.18)';
  rr(g, TUBE.x0, TUBE.y - TUBE.r, TUBE.x1 - TUBE.x0, TUBE.r * 2, 14);
  g.fill();
  g.strokeStyle = 'rgba(190,225,255,0.55)';
  g.lineWidth = 1.5;
  g.stroke();
  line(g, TUBE.x0 + 10, TUBE.y - TUBE.r + 5, TUBE.x1 - 10, TUBE.y - TUBE.r + 5, 'rgba(255,255,255,0.35)', 2);
  line(g, TUBE.x0, TUBE.y, TUBE.x1, TUBE.y, 'rgba(244,246,255,0.35)', 1, [6, 6]);
  for (let i = 0; i < 14; i++) {
    const bx = 200 + (330 * i) / 13;
    g.fillStyle = glowK > 0 ? `rgba(255,${Math.round(170 + 60 * glowK)},${Math.round(90 + 60 * glowK)},${0.85})` : COPPER;
    g.beginPath();
    g.ellipse(bx, TUBE.y, 2.5, 38, 0, 0, Math.PI * 2);
    g.fill();
  }
  // the cone at the gun mouth is a fixed picture of 25 degrees, not the real angle
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1;
  const spread = Math.tan((25 * Math.PI) / 180) * 24;
  g.beginPath();
  g.moveTo(194, TUBE.y - spread);
  g.lineTo(170, TUBE.y);
  g.lineTo(194, TUBE.y + spread);
  g.stroke();
  tag(g, `${r.v} × 10⁶ m/s at ${r.th}°`, 150, 132, 'center', PAL.white, 12);
  tag(g, `tube radius ${r.pipe} cm`, 365, 134, 'center', PAL.white, 12);
  line(g, TUBE.x0, 236, TUBE.x1, 236, PAL.white, 1.5);
  line(g, TUBE.x0, 230, TUBE.x0, 242, PAL.white, 1.5);
  line(g, TUBE.x1, 230, TUBE.x1, 242, PAL.white, 1.5);
  tag(g, `${r.L} cm to the screen`, 365, 252, 'center', PAL.white, 12);
}

/** The screen seen face-on: a dark green disc with a bullseye, and what landed on it. */
export function screenInset(g: G, kind: 'idle' | 'sharp' | 'blur' | 'dark') {
  text(g, 'SCREEN', SPOT.x, SPOT.y - SPOT.r - 8, PAL.white, 11);
  dot(g, SPOT.x, SPOT.y, SPOT.r, '#0b2a1c');
  for (const f of [0.33, 0.66, 1]) ring(g, SPOT.x, SPOT.y, SPOT.r * f, 'rgba(93,255,154,0.25)', 1);
  if (kind === 'sharp') glow(g, PAL.green, 14, () => dot(g, SPOT.x, SPOT.y, 3, '#eaffef'));
  else if (kind === 'blur') {
    g.globalAlpha = 0.5;
    dot(g, SPOT.x + 3, SPOT.y - 2, 14, PAL.green);
    g.globalAlpha = 1;
  }
}
