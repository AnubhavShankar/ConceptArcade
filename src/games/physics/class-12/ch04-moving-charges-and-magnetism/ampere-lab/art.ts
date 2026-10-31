// The art of "First Plasma": the reactor hall, the control window with Ana, the vessel camera with the plasma, Spanner the robot and its arm,
// and one picture per level (busbar, plasma column, X-point, central solenoid, toroidal coil). Cross-sections and top views, as in a technical manual.
// Nothing here draws an answer: the only quantities on screen are the player's own settings and the given facts (see index.ts for the rules).
import { PAL } from '@core/arcade';
import { glow, line, text, trace } from '@core/neon';
import type { ColRow, Dir, SolRow, TorRow, XptRow } from './logic';
import { ARROW } from './logic';

type G = CanvasRenderingContext2D;
export const SPANNER = { x: 70, base: 316 }; // the robot (x 30 to 110, y 240 to 316)
export const SHOULDER = { x: 92, y: 250 }; // the arm's shoulder joint
export const CTRL = { x: 10, y: 40, w: 150, h: 82 }; // the control-room window with Ana (top left)
export const CAM = { x: 474, y: 40, w: 156, h: 88 }; // the VESSEL CAM inset with the plasma (top right)
export const LCD = { x: 456, y: 300, w: 176, h: 20 }; // the probe readout: the helper (bottom right)
export const GOAL = { x: 320, y: 22 };
export const HIT: [number, number] = [320, 60];
export const C = { x: 320, y: 186 }; // the scene centre in L1, L2 and L5
// L1
export const BUSBAR_R = 16;
export const rayPx = (rCm: number) => 26 + 1.2 * rCm; // a picture: 5 cm → 32 px, 100 cm → 146 px
export const SIDE_V: [number, number][] = [[1, 0], [0, -1], [-1, 0], [0, 1]]; // screen directions of sides 0 to 3
export const PAD = { x: 440, y: 294, r: 24 };
// L2
export const COL_R = 70;
export const inPx = (r: ColRow, x: number) => COL_R * (x / r.a);
export const outPx = (r: ColRow, x: number) => COL_R + 80 * ((x - r.a) / (2 * r.a));
// L3
export const LINE = { x0: 150, y: 230, span: 330 };
export const xPx = (xCm: number) => LINE.x0 + (xCm / 100) * LINE.span;
export const WALL_NEAR: [number, number] = [470, 120];
export const WALL_FAR: [number, number] = [190, 120];
const EXHAUST: [number, number] = [LINE.x0 + 30, 60];
// L4
export const SOLE = { x0: 150, y: 196, h: 60 };
export const lenPx = (L: number) => 80 + (L - 20) * 2.4;
// L5
export const TOR_IN = 46;
export const TOR_OUT = 120;
export const torPx = (r: TorRow, x: number) =>
  x <= r.rIn ? 6 + (TOR_IN - 6) * ((x - 2) / (r.rIn - 2))
  : x >= r.rOut ? TOR_OUT + 30 * ((x - r.rOut) / (60 - r.rOut))
  : TOR_IN + (TOR_OUT - TOR_IN) * ((x - r.rIn) / (r.rOut - r.rIn));
/** The inverse of `torPx`, piece by piece: the radius in cm for a probe at `px` pixels right of the centre. */
export const invTorPx = (r: TorRow, px: number) =>
  px <= TOR_IN ? 2 + ((px - 6) / (TOR_IN - 6)) * (r.rIn - 2)
  : px >= TOR_OUT ? r.rOut + ((px - TOR_OUT) / 30) * (60 - r.rOut)
  : r.rIn + ((px - TOR_IN) / (TOR_OUT - TOR_IN)) * (r.rOut - r.rIn);

const COPPER = '#c8803a';
const COPPER_DK = '#7a4519';
const COPPER_LT = '#f0b070';
const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const T = Math.PI * 2;

function rrect(g: G, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string, lw = 1) {
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
    g.lineWidth = lw;
    g.stroke();
  }
}
function disc(g: G, x: number, y: number, r: number, fill: string, stroke?: string, lw = 1) {
  g.beginPath();
  g.arc(x, y, r, 0, T);
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = lw;
    g.stroke();
  }
}
/** A pill of dark glass behind a line of text, so the words stay readable over the scene. */
export function tag(g: G, s: string, x: number, y: number, align: 'left' | 'right' | 'center' = 'center', color: string = PAL.yellow, size = 12) {
  const w = s.length * size * 0.58 + 8;
  const x0 = align === 'left' ? x - 4 : align === 'right' ? x - w + 4 : x - w / 2;
  g.fillStyle = 'rgba(6,10,28,0.8)';
  g.fillRect(x0, y - size, w, size + 5);
  text(g, s, x, y, color, size, align);
}
const symbol = (g: G, cur: 'out' | 'in', x: number, y: number, r: number, color: string) => {
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = 1.6;
  if (cur === 'out') {
    g.beginPath();
    g.arc(x, y, r, 0, T);
    g.stroke();
    disc(g, x, y, r * 0.3, color);
  } else {
    g.beginPath();
    g.arc(x, y, r, 0, T);
    g.stroke();
    line(g, x - r * 0.65, y - r * 0.65, x + r * 0.65, y + r * 0.65, color, 1.8);
    line(g, x - r * 0.65, y + r * 0.65, x + r * 0.65, y - r * 0.65, color, 1.8);
  }
};

// ---------------------------------------------------------------- the hall
/** The reactor hall: steel wall, riveted panels, cable trays, and a different look in each round (UX item 8). */
export function hall(g: G, t: number, k: number) {
  g.fillStyle = '#121826';
  g.fillRect(0, 0, 640, 340);
  g.strokeStyle = 'rgba(255,255,255,0.05)';
  g.lineWidth = 1;
  for (let x = 0; x <= 640; x += 64) line(g, x, 0, x, 316, 'rgba(255,255,255,0.05)', 1);
  for (let y = 0; y <= 320; y += 64) line(g, 0, y, 640, y, 'rgba(255,255,255,0.05)', 1);
  g.fillStyle = 'rgba(255,255,255,0.1)';
  for (let x = 0; x <= 640; x += 64) for (let y = 0; y <= 320; y += 64) g.fillRect(x + 3, y + 3, 2, 2);
  g.fillStyle = '#0b101b';
  g.fillRect(0, 316, 640, 24);
  g.fillStyle = '#222c40';
  g.fillRect(0, 30, 640, 6);
  line(g, 0, 33, 640, 33, '#0d1220', 1);
  g.fillStyle = k === 0 ? 'rgba(200,220,255,0.06)' : 'rgba(80,120,255,0.08)';
  if (k < 2) g.fillRect(0, 0, 640, 316);
  if (k === 1) for (let i = 0; i < 11; i++) disc(g, 30 + i * 58, 40, 2.6, 'rgba(255,190,60,0.95)');
  if (k === 2) {
    g.fillStyle = 'rgba(255,60,60,0.06)';
    g.fillRect(0, 0, 640, 316);
    for (const [x, sgn] of [[14, 1], [626, -1]] as const) {
      const a = calm() ? 0.6 : t * Math.PI * sgn; // 0.5 Hz
      g.fillStyle = 'rgba(255,70,70,0.22)';
      g.beginPath();
      g.moveTo(x, 14);
      g.arc(x, 14, 46, a - 0.35, a + 0.35);
      g.closePath();
      g.fill();
      disc(g, x, 14, 5, PAL.red, '#5a1010', 1.5);
    }
    text(g, 'FIRST PLASMA', 320, 46, PAL.red, 11);
  }
}

/** The goal on the canvas (UX item 1): one short line on a dark plate. */
export function goalLine(g: G, s: string) {
  const w = s.length * 13 * 0.58 + 20;
  rrect(g, GOAL.x - w / 2, GOAL.y - 17, w, 25, 7, 'rgba(0,0,0,0.6)');
  text(g, s, GOAL.x, GOAL.y, PAL.white, 13);
}

/** The grip of a handle: a white ring with a glyph; it fills while the handle is held (UX item 3). */
export function handleGrip(g: G, x: number, y: number, glyph: string, hot: boolean) {
  disc(g, x, y, 20, hot ? 'rgba(255,210,63,0.35)' : 'rgba(10,16,48,0.3)', hot ? PAL.yellow : PAL.white, 2);
  text(g, glyph, x, y + 4, hot ? PAL.yellow : PAL.white, 12);
}

// ---------------------------------------------------------------- Ana, the control window
export type AnaMood = 'idle' | 'lean' | 'win' | 'miss';
/** Ana, the shift leader, behind the control-room glass: grey hair, round glasses, headset, teal fleece, a mug. */
export function controlWindow(g: G, t: number, mood: AnaMood, k: number) {
  rrect(g, CTRL.x - 3, CTRL.y - 3, CTRL.w + 6, CTRL.h + 6, 6, '#05080f', '#3a4660', 2);
  text(g, 'CONTROL', CTRL.x + CTRL.w / 2, 36, PAL.dim, 11);
  g.save();
  g.beginPath();
  g.rect(CTRL.x, CTRL.y, CTRL.w, CTRL.h);
  g.clip();
  g.fillStyle = '#18202f';
  g.fillRect(CTRL.x, CTRL.y, CTRL.w, CTRL.h);
  const stand = k === 2;
  const lean = mood === 'lean' ? 4 : 0;
  const cx = 85;
  const hy = (stand ? 76 : 86) + lean;
  const glance = !calm() && t % 3 < 0.5 ? 2 : 0;
  const sip = !calm() && t % 5 < 1 && mood === 'idle';
  // fleece (teal), shoulders
  g.fillStyle = '#2a8f93';
  g.beginPath();
  g.ellipse(cx, 130 + lean, 36, 34, 0, Math.PI, 0);
  g.fill();
  // arms
  g.strokeStyle = '#2a8f93';
  g.lineWidth = 7;
  g.lineCap = 'round';
  if (mood === 'win') {
    line(g, cx - 28, 108, cx - 40, 70, '#2a8f93', 7);
    line(g, cx + 28, 108, cx + 40, 70, '#2a8f93', 7);
    disc(g, cx - 40, 66, 4, '#e8c4a0');
    disc(g, cx + 40, 66, 4, '#e8c4a0');
  } else if (mood === 'miss') {
    line(g, cx + 28, 110, cx + 12, hy - 10, '#2a8f93', 7);
    disc(g, cx + 10, hy - 12, 4.5, '#e8c4a0');
  }
  g.lineCap = 'butt';
  // head
  disc(g, cx, hy, 13, '#e8c4a0');
  g.fillStyle = '#b8bcc6'; // short grey hair
  g.beginPath();
  g.arc(cx, hy - 2, 14, Math.PI * 1.02, Math.PI * 1.98);
  g.fill();
  g.strokeStyle = '#1b2230'; // headset band, ear cup and boom mic
  g.lineWidth = 2;
  g.beginPath();
  g.arc(cx, hy - 1, 15, Math.PI * 1.05, Math.PI * 1.95);
  g.stroke();
  disc(g, cx - 15, hy + 1, 3.5, '#1b2230');
  line(g, cx - 15, hy + 3, cx - 8, hy + 10, '#1b2230', 1.6);
  disc(g, cx - 8, hy + 10, 1.8, '#4de1ff');
  // glasses and eyes
  for (const dx of [-5.5, 5.5]) {
    disc(g, cx + dx, hy - 1, 3.8, 'rgba(255,255,255,0.8)', '#1b2230', 1.2);
    disc(g, cx + dx, hy - 1 + glance * 0.5, 1.3, '#1b2230');
  }
  line(g, cx - 1.7, hy - 1, cx + 1.7, hy - 1, '#1b2230', 1.2);
  if (mood === 'miss') {
    line(g, cx - 9, hy - 7, cx - 3, hy - 6, '#1b2230', 1.4);
    line(g, cx + 3, hy - 6, cx + 9, hy - 7, '#1b2230', 1.4);
  }
  g.strokeStyle = '#8a4a3a'; // mouth
  g.lineWidth = 1.5;
  g.beginPath();
  if (mood === 'win') g.arc(cx, hy + 5, 4, 0.1 * Math.PI, 0.9 * Math.PI);
  else if (mood === 'miss') g.arc(cx, hy + 9, 3, 1.15 * Math.PI, 1.85 * Math.PI);
  else g.arc(cx, hy + 4.5, 3, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  // desk, two glowing monitors, the mug
  g.fillStyle = '#0d1320';
  g.fillRect(CTRL.x, 112, CTRL.w, 10);
  rrect(g, 14, 90, 30, 20, 2, '#0a3a4a', '#4de1ff', 1);
  rrect(g, 48, 98, 24, 14, 2, '#3a2a0a', '#ffd23f', 1);
  line(g, 18, 98, 34, 98, '#4de1ff', 1);
  line(g, 18, 103, 40, 103, '#4de1ff', 1);
  const my = sip ? 90 : 102;
  rrect(g, 96, my, 58, 15, 3, '#e9eef7', '#8a93a8', 1);
  text(g, 'I ♥ PLASMA', 125, my + 12, '#c0392b', 11);
  g.restore();
}

// ---------------------------------------------------------------- the vessel camera, the plasma
export interface CamState {
  /** Seconds since the shot was fired; −1 when none is playing. */
  rt: number;
  ok: boolean;
}
/** The VESSEL CAM inset: the plasma is a pink ring seen in perspective with two small eyes; it sleeps, ignites, holds or disrupts. */
export function vesselCam(g: G, t: number, k: number, s: CamState) {
  const { rt, ok } = s;
  text(g, 'VESSEL CAM', 552, 36, PAL.dim, 11);
  g.fillStyle = '#000';
  g.fillRect(CAM.x, CAM.y, CAM.w, CAM.h);
  g.save();
  g.beginPath();
  g.rect(CAM.x, CAM.y, CAM.w, CAM.h);
  g.clip();
  const cx = CAM.x + CAM.w / 2;
  const cy = CAM.y + CAM.h / 2 + 2;
  const dark = rt >= 0.85 && !ok;
  const bright = rt < 0 || rt < 0.6 ? 0.3 : rt < 0.7 ? 0.3 + 0.7 * ((rt - 0.6) / 0.1) : 1;
  const awake = rt >= 0.6;
  if (!dark) {
    const wob = rt >= 0.7 && rt < 0.85 && !ok ? Math.sin(rt * 90) * 3 : 0;
    const shimmer = ok && rt >= 0.7 && !calm() ? 0.9 + 0.1 * Math.sin(t * 3) : 1;
    g.globalAlpha = Math.min(1, bright * shimmer);
    glow(g, PAL.pink, 14 * bright, () => {
      g.strokeStyle = PAL.pink;
      g.lineWidth = 8;
      g.beginPath();
      g.ellipse(cx + wob, cy, 44, 19, 0, 0, T);
      g.stroke();
    });
    g.strokeStyle = '#ffd0e4';
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(cx + wob, cy, 44, 19, 0, Math.PI, T);
    g.stroke();
    g.globalAlpha = 1;
    // eyes
    const ey = cy - 1;
    for (const dx of [-9, 9]) {
      const ex = cx + wob + dx;
      if (!awake) line(g, ex - 3, ey, ex + 3, ey, PAL.white, 1.6);
      else if (ok && rt >= 0.7) {
        line(g, ex - 3, ey + 2, ex, ey - 2, PAL.white, 1.6);
        line(g, ex, ey - 2, ex + 3, ey + 2, PAL.white, 1.6);
      } else if (rt >= 0.7) {
        const sg = dx < 0 ? 1 : -1;
        line(g, ex - 3 * sg, ey - 3, ex + 3 * sg, ey, PAL.white, 1.6);
        line(g, ex + 3 * sg, ey, ex - 3 * sg, ey + 3, PAL.white, 1.6);
      } else {
        disc(g, ex, ey, 2.6, PAL.white);
        disc(g, ex, ey, 1.1, '#201020');
      }
    }
    if (rt < 0.6 && !calm()) {
      const f = (t % 2) / 2;
      g.globalAlpha = 1 - f;
      text(g, 'z', cx + 34, cy - 14 - f * 10, PAL.white, 11);
      g.globalAlpha = 1;
    }
  } else {
    const u = rt - 0.85;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * T;
      const px = cx + Math.cos(a) * (44 + u * 70);
      const py = cy + Math.sin(a) * (19 + u * 32);
      g.globalAlpha = clamp01(1 - u / 0.8);
      g.fillStyle = i % 2 ? PAL.pink : PAL.orange;
      g.fillRect(px - 1.5, py - 1.5, 3, 3);
    }
    g.globalAlpha = 1;
    if (u < 0.5) {
      g.globalAlpha = 1 - u / 0.5;
      for (const dx of [-9, 9]) {
        const sg = dx < 0 ? 1 : -1;
        line(g, cx + dx - 3 * sg, cy - 4, cx + dx + 3 * sg, cy - 1, PAL.white, 1.6);
        line(g, cx + dx + 3 * sg, cy - 1, cx + dx - 3 * sg, cy + 2, PAL.white, 1.6);
      }
      g.globalAlpha = 1;
    }
    if (u < 0.2) {
      g.globalAlpha = 0.45 * (1 - u / 0.2);
      g.fillStyle = '#fff';
      g.fillRect(CAM.x, CAM.y, CAM.w, CAM.h);
      g.globalAlpha = 1;
    }
  }
  g.restore();
  g.strokeStyle = 'rgba(77,225,255,0.8)';
  g.lineWidth = 1.5;
  g.strokeRect(CAM.x, CAM.y, CAM.w, CAM.h);
  if (Math.floor(t) % 2 === 0) disc(g, CAM.x + 10, CAM.y + 10, 3, PAL.red);
  text(g, 'REC', CAM.x + 17, CAM.y + 14, PAL.white, 11, 'left');
  text(g, `SHOT ${k + 1}`, CAM.x + CAM.w - 5, CAM.y + CAM.h - 5, PAL.white, 11, 'right');
}

/** The probe readout, the only helper: black with green (round 1) or yellow (after a probe check) digits. */
export function readout(g: G, s: string, color: string) {
  text(g, 'PROBE READOUT', 544, 296, PAL.dim, 11);
  rrect(g, LCD.x, LCD.y, LCD.w, LCD.h, 3, '#02060a', '#2a3a30', 1.5);
  text(g, s, LCD.x + LCD.w / 2, LCD.y + 14, color, 12);
}

// ---------------------------------------------------------------- Spanner and its arm
export type SpannerMood = 'happy' | 'cheer' | 'worried';
export interface SpannerOpts {
  mood: SpannerMood;
  /** Seconds since the shot was fired (−1 for none) and since the verdict (−1 for none). */
  rt: number;
  age: number;
  /** Where the tool is, so the head tilts and the eye looks toward it. */
  look: [number, number];
}
/** Spanner, the remote-handling robot: hazard-striped body, trefoil sticker, camera-eye head, antenna, rubber tracks. */
export function spanner(g: G, t: number, o: SpannerOpts) {
  const still = calm();
  const inch = still ? 0 : Math.sin(t * 1.2);
  // tracks
  rrect(g, 30 + inch, 304, 74, 12, 6, '#1a1d24', '#3b414d', 1.5);
  for (const wx of [40, 67, 94]) {
    disc(g, wx + inch, 310, 4.5, '#3b414d');
    disc(g, wx + inch, 310, 1.5, '#8a93a0');
  }
  // body with bolted plates, hazard band, stencil and trefoil sticker
  rrect(g, 38, 262, 62, 42, 5, '#f2c230', '#7a5c10', 1.5);
  rrect(g, 42, 266, 20, 12, 2, '#d9a920');
  rrect(g, 76, 282, 20, 12, 2, '#d9a920');
  for (const [bx, by] of [[44, 268], [58, 268], [78, 284], [92, 284], [44, 276], [58, 276]]) disc(g, bx, by, 1.2, '#6b560f');
  g.fillStyle = '#16181c';
  for (let i = 0; i < 8; i++) {
    g.beginPath();
    g.moveTo(40 + i * 8, 297);
    g.lineTo(44 + i * 8, 297);
    g.lineTo(40 + i * 8, 303);
    g.lineTo(36 + i * 8, 303);
    g.closePath();
    g.fill();
  }
  text(g, 'SPANNER', 69, 292, '#16181c', 11);
  disc(g, 86, 273, 6.5, '#ffd23f', '#16181c', 1);
  g.fillStyle = '#16181c';
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.moveTo(86, 273);
    g.arc(86, 273, 5, (i * T) / 3 - Math.PI / 2 - Math.PI / 6, (i * T) / 3 - Math.PI / 2 + Math.PI / 6);
    g.closePath();
    g.fill();
  }
  disc(g, 86, 273, 1.3, '#16181c');
  // shoulder tower and joint
  rrect(g, 84, 244, 14, 20, 3, '#6b7380', '#3b414d', 1);
  disc(g, SHOULDER.x, SHOULDER.y, 5.5, '#3b414d', '#aeb6c4', 1.5);
  // puff of a piston, every 6 s
  if (!still && t % 6 < 0.8) {
    const f = (t % 6) / 0.8;
    g.globalAlpha = 0.6 * (1 - f);
    disc(g, 104, 246 - f * 12, 2.5 + f * 2, '#cfd5df');
    disc(g, 108, 250 - f * 10, 2 + f * 2, '#cfd5df');
    g.globalAlpha = 1;
  }
  // the free arm gives an OK sign on a win
  if (o.mood === 'cheer') {
    line(g, 40, 276, 28, 256, '#9aa3b2', 5);
    disc(g, 27, 252, 4, '#cfd5df', '#3b414d', 1);
    for (let i = -1; i <= 1; i++) line(g, 27 + i * 3, 248, 27 + i * 4, 240, '#cfd5df', 1.8);
  }
  // head: tilts toward the tool every 4 s, spins once on a win
  const toward = Math.sign(o.look[0] - 62) || 1;
  const tilt = !still && t % 4 < 0.6 ? 0.14 * toward * Math.sin((Math.PI * (t % 4)) / 0.6) : 0;
  const spin = !still && o.mood === 'cheer' && o.age >= 0 && o.age < 0.5 ? (o.age / 0.5) * T : 0;
  g.save();
  g.translate(62, 251);
  g.rotate(tilt + spin);
  head(g, t, o);
  g.restore();
}
function head(g: G, t: number, o: SpannerOpts) {
  const still = calm();
  line(g, 6, -10, 9, -22, '#6b7380', 2);
  const on = t % 1.5 < 0.2 || still;
  disc(g, 9, -23, 2.4, on ? PAL.red : '#5a2020');
  rrect(g, -12, -11, 24, 22, 8, '#cfd5df', '#6b7380', 1.5);
  disc(g, 0, 0, 7.5, '#10151f', '#8a93a0', 1.5);
  const dx = o.look[0] - 62;
  const dy = o.look[1] - 251;
  const d = Math.hypot(dx, dy) || 1;
  const iris = 3.2 + (still ? 0 : Math.sin(t * T));
  disc(g, (dx / d) * 2, (dy / d) * 2, iris, '#4de1ff');
  disc(g, (dx / d) * 2 - 1, (dy / d) * 2 - 1, 1, '#fff');
  if (o.rt >= 0 && o.rt < 0.1) disc(g, 0, 0, 8, '#fff');
  if (o.age >= 0 && o.age < 0.5 && o.mood === 'worried') for (let i = -5; i <= 5; i += 4) line(g, -6, i, 6, i, 'rgba(255,255,255,0.8)', 1.2);
  const led = o.mood === 'worried' ? PAL.orange : PAL.green;
  const slant = o.mood === 'worried' ? 3 : 0;
  line(g, -9, -8 - slant, -2, -8, led, 2);
  line(g, 2, -8, 9, -8 - slant, led, 2);
  g.strokeStyle = '#10151f';
  g.lineWidth = 1.5;
  g.beginPath();
  if (o.mood === 'worried') g.arc(0, 11, 3.5, 1.15 * Math.PI, 1.85 * Math.PI);
  else g.arc(0, 5.5, 4, 0.2 * Math.PI, 0.8 * Math.PI);
  g.stroke();
  if (o.mood === 'worried' && o.age >= 0) {
    disc(g, -11, -2 + Math.min(o.age, 1.5) * 9, 1.8, '#0b0b10', '#555', 0.5);
    if (o.age < 0.5) {
      line(g, 9, -23, 14, -28, PAL.yellow, 1.6);
      line(g, 9, -23, 5, -29, PAL.yellow, 1.6);
    }
  }
}

/** The boom arm: two straight segments from the shoulder to the tool, elbow lifted 22 px, with hydraulic pistons and a two-finger gripper. */
export function arm(g: G, tool: [number, number], lock = false) {
  const el: [number, number] = [(SHOULDER.x + tool[0]) / 2, (SHOULDER.y + tool[1]) / 2 - 22];
  line(g, SHOULDER.x, SHOULDER.y, el[0], el[1], '#8f98a8', 6);
  line(g, el[0], el[1], tool[0], tool[1], '#8f98a8', 6);
  line(g, SHOULDER.x + 2, SHOULDER.y + 4, el[0] - 2, el[1] + 4, '#d6dbe4', 2);
  line(g, el[0], el[1] + 5, tool[0] - (tool[0] - el[0]) * 0.3, tool[1] - (tool[1] - el[1]) * 0.3 + 5, '#d6dbe4', 2);
  disc(g, el[0], el[1], 4.5, '#3b414d', '#aeb6c4', 1.5);
  const a = Math.atan2(tool[1] - el[1], tool[0] - el[0]);
  for (const s of [-1, 1]) {
    const b = a + s * 0.55;
    line(g, tool[0] - Math.cos(b) * 12, tool[1] - Math.sin(b) * 12, tool[0], tool[1], lock ? PAL.white : '#cfd5df', 2.5);
  }
}

// ---------------------------------------------------------------- level 1: the busbar
export function busbar(g: G, cur: 'out' | 'in', I: number) {
  for (const [dx, dy] of SIDE_V) line(g, C.x, C.y, C.x + dx * 150, C.y + dy * 150, 'rgba(255,255,255,0.2)', 1, [5, 6]);
  glow(g, COPPER, 10, () => disc(g, C.x, C.y, BUSBAR_R, COPPER, COPPER_LT, 2));
  symbol(g, cur, C.x, C.y, 7, '#2a1608');
  text(g, `${I} A`, 320, 214, PAL.white, 12);
}
/** The side pad: a compass rose with four arms; the arm of the player's side is lit. */
export function sidePad(g: G, side: number) {
  disc(g, PAD.x, PAD.y, PAD.r, 'rgba(10,16,40,0.9)', '#4a5478', 1.5);
  const glyphs = ['→', '↑', '←', '↓'];
  glyphs.forEach((s, i) => {
    const [dx, dy] = SIDE_V[i];
    line(g, PAD.x + dx * 6, PAD.y + dy * 6, PAD.x + dx * 18, PAD.y + dy * 18, i === side ? PAL.yellow : '#4a5478', 3);
    text(g, s, PAD.x + dx * 16, PAD.y + dy * 16 + 4, i === side ? PAL.yellow : PAL.dim, 11);
  });
}
/** The probe on the end of the arm: a grey box with its sensing arrow and a small display. `along` is the ray's screen direction. */
export function probe(g: G, x: number, y: number, arrow: Dir, display: string, color: string, along: [number, number]) {
  rrect(g, x - 11, y - 7, 22, 14, 3, '#7b8494', '#d6dbe4', 1.2);
  text(g, ARROW[arrow], x, y + 4.5, PAL.yellow, 12);
  const vertical = along[0] === 0;
  tag(g, display, vertical ? x + 28 : x, vertical ? y + 4 : y - 14, 'center', color, 11);
}

// ---------------------------------------------------------------- level 2: the plasma column
export function column(g: G, r: ColRow) {
  for (const dx of [-1, 1]) line(g, C.x, C.y, C.x + dx * (dx < 0 ? COL_R : COL_R + 80), C.y, 'rgba(255,255,255,0.18)', 1, [4, 5]);
  glow(g, PAL.pink, 24, () => disc(g, C.x, C.y, COL_R, 'rgba(255,77,141,0.35)'));
  g.save();
  g.beginPath();
  g.arc(C.x, C.y, COL_R, 0, T);
  g.clip();
  for (let i = 0; i < 37; i++) {
    const a = i * 2.399963; // a sunflower spread of tiny ⊙ dots
    const d = COL_R * Math.sqrt((i + 0.5) / 37) * 0.96;
    const x = C.x + Math.cos(a) * d;
    const y = C.y + Math.sin(a) * d;
    g.globalAlpha = 0.35;
    g.strokeStyle = PAL.white;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(x, y, 3, 0, T);
    g.stroke();
    disc(g, x, y, 0.9, PAL.white);
  }
  g.globalAlpha = 1;
  g.restore();
  g.strokeStyle = PAL.pink;
  g.lineWidth = 2;
  g.setLineDash([6, 5]);
  g.beginPath();
  g.arc(C.x, C.y, COL_R, 0, T);
  g.stroke();
  g.setLineDash([]);
  text(g, `a = ${r.a} cm · ${r.I} kA`, 320, 270, PAL.white, 12);
}
/** A slim grey rod with a tip LED and a small display (the inner and outer probes of level 2). */
export function rod(g: G, x: number, y: number, display: string, color: string) {
  rrect(g, x - 3, y - 14, 6, 28, 2, '#9aa3b2', '#d6dbe4', 1);
  disc(g, x, y - 16, 3, display === '✓' ? PAL.green : display === 'ERR' ? PAL.red : '#3b414d', '#d6dbe4', 1);
  tag(g, display, x, y + 28, 'center', color, 11);
}

// ---------------------------------------------------------------- level 3: the X-point
export function xpoint(g: G, r: XptRow) {
  line(g, LINE.x0, LINE.y, 480, LINE.y, 'rgba(255,255,255,0.25)', 1, [6, 6]);
  const x2 = xPx(r.d);
  glow(g, PAL.pink, 12, () => disc(g, LINE.x0, LINE.y, 14, PAL.pink, '#ffd0e4', 2));
  glow(g, COPPER, 8, () => disc(g, x2, LINE.y, 12, COPPER, COPPER_LT, 2));
  symbol(g, 'out', LINE.x0, LINE.y, 6, '#2a0a18');
  symbol(g, r.same ? 'out' : 'in', x2, LINE.y, 5.5, '#2a1608');
  text(g, `${r.I1} kA`, LINE.x0, 262, PAL.white, 12);
  text(g, `${r.I2} kA`, x2, 262, PAL.white, 12);
  line(g, LINE.x0, 280, x2, 280, PAL.dim, 1);
  line(g, LINE.x0, 275, LINE.x0, 285, PAL.dim, 1);
  line(g, x2, 275, x2, 285, PAL.dim, 1);
  tag(g, `d = ${r.d} cm`, (LINE.x0 + x2) / 2, 298, 'center', PAL.white, 12);
}
export function plate(g: G, x: number, glowing: boolean) {
  const px = xPx(x);
  if (glowing) glow(g, PAL.orange, 16, () => rrect(g, px - 4, LINE.y - 20, 8, 40, 2, '#ff9b3d'));
  else rrect(g, px - 4, LINE.y - 20, 8, 40, 2, '#5b6270', '#aeb6c4', 1.2);
  line(g, px - 2, LINE.y - 16, px - 2, LINE.y + 16, 'rgba(255,255,255,0.25)', 1);
}
/** The exhaust stream: a glowing pink band from the plasma edge, curving down to `to`; `f` is how much of it has poured. */
export function exhaust(g: G, to: [number, number], f: number) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    const c: [number, number] = [EXHAUST[0], to[1]];
    pts.push([(1 - u) * (1 - u) * EXHAUST[0] + 2 * u * (1 - u) * c[0] + u * u * to[0], (1 - u) * (1 - u) * EXHAUST[1] + 2 * u * (1 - u) * c[1] + u * u * to[1]]);
  }
  trace(g, pts, f, PAL.pink, 6);
}
export function scorch(g: G, at: [number, number]) {
  glow(g, PAL.orange, 12, () => disc(g, at[0], at[1], 8, '#1a1010', PAL.orange, 1.5));
}

// ---------------------------------------------------------------- level 4: the central solenoid
export type SolState = 'idle' | 'win' | 'quench' | 'dim';
/** The coil in side view: always 16 drawn turns, a darker back half and a brighter front half; `lit` (0 to 1) lights them left to right. */
export function solenoid(g: G, r: SolRow, L: number, st: { mode: SolState; lit: number; rt: number }) {
  const len = lenPx(L);
  const x0 = SOLE.x0;
  rrect(g, 136, 166, 14, 94, 3, '#3a4458', '#6b7380', 1);
  rrect(g, 120, 258, 44, 8, 2, '#2a3244');
  for (const by of [172, 250]) disc(g, 143, by, 1.6, '#aeb6c4');
  tag(g, `${r.layers} × ${r.per} turns · ${r.I} A`, 124, 248, 'left', PAL.white, 12);
  const col = st.mode === 'quench' ? '#cfeeff' : st.mode === 'win' ? '#ffd27a' : COPPER;
  for (let i = 0; i < 16; i++) {
    const x = x0 + 6 + (i * (len - 12)) / 15;
    const on = st.lit > i / 16;
    const fade = st.mode === 'dim' ? 0.5 : 1;
    g.lineWidth = 4;
    g.strokeStyle = on ? col : COPPER_DK;
    g.globalAlpha = on ? fade : 1;
    if (on && st.mode === 'win') {
      g.shadowColor = '#ffd27a';
      g.shadowBlur = 8;
    }
    g.beginPath();
    g.ellipse(x, SOLE.y, 7, SOLE.h / 2, 0, -Math.PI / 2, Math.PI / 2);
    g.stroke();
    g.strokeStyle = on ? col : COPPER_LT;
    g.beginPath();
    g.ellipse(x, SOLE.y, 7, SOLE.h / 2, 0, Math.PI / 2, (3 * Math.PI) / 2);
    g.stroke();
    g.shadowBlur = 0;
    g.globalAlpha = 1;
  }
  rrect(g, x0 + len - 4, SOLE.y - 36, 8, 72, 2, '#8f98a8', '#d6dbe4', 1.2);
  const mid = x0 + len / 2;
  rrect(g, mid - 2, SOLE.y - 9, 4, 18, 1, '#9aa3b2');
  disc(g, mid, SOLE.y - 11, 2.6, st.mode === 'win' ? PAL.green : st.mode === 'quench' ? PAL.red : st.mode === 'dim' ? PAL.orange : '#3b414d', '#d6dbe4', 1);
  rrect(g, mid - 2, 134, 4, 14, 1, '#9aa3b2');
  disc(g, mid, 132, 2.6, '#3b414d', '#d6dbe4', 1);
  text(g, 'outside', mid, 124, PAL.dim, 11);
  if (st.mode === 'win' && st.rt >= 0.6) text(g, '→ B', mid, SOLE.y + 20, PAL.yellow, 12);
  if (st.mode === 'quench' && st.rt >= 0.4 && st.rt < 0.9) {
    const u = (st.rt - 0.4) / 0.5;
    for (let i = 0; i < 6; i++) {
      g.globalAlpha = 0.7 * (1 - u);
      disc(g, x0 + (len * (i + 0.5)) / 6, SOLE.y - 34 - u * 22 - (i % 2) * 6, 5 + u * 3, '#fff');
    }
    g.globalAlpha = 1;
  }
  if (st.mode === 'quench' && st.rt >= 0.6) text(g, 'QUENCH!', mid, 150, PAL.red, 14);
  if (st.mode === 'dim' && st.rt >= 0.6) {
    g.globalAlpha = clamp01(1 - (st.rt - 0.6) / 0.8);
    text(g, '…', mid, 150 - (st.rt - 0.6) * 20, PAL.white, 16);
    g.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- level 5: the toroidal coil
export function toroid(g: G, r: TorRow, t: number, live: boolean) {
  g.beginPath();
  g.arc(C.x, C.y, TOR_OUT, 0, T);
  g.arc(C.x, C.y, TOR_IN, 0, T, true);
  g.fillStyle = COPPER;
  g.fill('evenodd');
  for (let i = 0; i < 36; i++) {
    const a = (i * T) / 36;
    line(g, C.x + Math.cos(a) * TOR_IN, C.y + Math.sin(a) * TOR_IN, C.x + Math.cos(a) * TOR_OUT, C.y + Math.sin(a) * TOR_OUT, i % 2 ? COPPER_DK : COPPER_LT, 2);
  }
  disc(g, C.x, C.y, TOR_IN - 1, '#05070d', COPPER_DK, 2);
  g.strokeStyle = COPPER_LT;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(C.x, C.y, TOR_OUT, 0, T);
  g.stroke();
  if (live) {
    const mid = (TOR_IN + TOR_OUT) / 2;
    for (let i = 0; i < 12; i++) {
      const a = (t / 1.2) * T + (i * T) / 12;
      glow(g, PAL.yellow, 6, () => disc(g, C.x + Math.cos(a) * mid, C.y + Math.sin(a) * mid, 3, PAL.yellow));
    }
  }
  line(g, C.x, C.y, C.x + TOR_OUT + 34, C.y, 'rgba(255,255,255,0.3)', 1.5, [5, 5]);
  text(g, `${r.N} turns · ${r.I} A`, 320, 322, PAL.white, 12);
}
