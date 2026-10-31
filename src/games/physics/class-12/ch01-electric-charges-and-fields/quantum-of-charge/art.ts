// Art for The Quark Hunt: the night-shift lab, Eli (the physicist), Pico (the camera robot), the oil drop and the props of the three levels.
// Everything here only draws. The rules are in logic.ts and the timeline of each attempt is in index.ts.
import { PAL } from '@core/arcade';
import { glow, line, text } from '@core/neon';
import { pointerToLocal } from '@core/sim';

type G = CanvasRenderingContext2D;
export type EliMood = 'happy' | 'squint' | 'cheer' | 'worried' | 'facepalm';

// ---- layout ----
export const CHAMBER = { x0: 230, x1: 450, top: 76, bottom: 268 }; // the two plates (level 1)
export const DROP_Y = 172; // the drop's held position
export const DROP_X = 340;
export const LADDER = { x: 360, y0: 300, px: 7 }; // level 2: 0 du at y = 300, 7 px per du
export const STRIP = { x0: 120, x1: 600, y: 250, perE: 52 }; // level 3: the e-ladder strip, 52 px per e from x0
export const DROPS = [130, 230, 330, 430, 530].map((x) => ({ x, y: 150 })); // level 3: the five drops in the viewer
/** The gauge. It is wider and higher than the first sketch so the whole line "up … N · down … N" fits at a readable size. */
export const LCD = { x: 14, y: 128, w: 214, h: 20 };
export const HIT: [number, number] = [520, 64];
export const BOX = { x: 150, y: 236 }; // the control box: X-ray button, UV button, knob
export const LEVER = { x: 150, y: 268, len: 14 };
export const TUBE = { x: 205, y: 172 }; // the X-ray tube (the +1 button on the canvas)
export const UV = { x: 486, y: 172 };
export const PICO = { x: 340, y: 34 };
export const PANEL = { x0: 300, x1: 480, y0: 40, y1: 310 };
export const MARK_X = 420;
export const VIEW = { x0: 90, x1: 590, y0: 70, y1: 210 };
export const GRIP_MIN = 18;
/** The y of a level 2 reading or rung. */
export const ladderY = (du: number) => LADDER.y0 - LADDER.px * du;
export const stripX = (e: number) => STRIP.x0 + STRIP.perE * e;

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const ease = (x: number) => {
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
};
export const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
const SKIN = '#e8c9a0';

// ---- ux pieces: a pill behind text, the goal line, a grip with the player's own setting ----
export function tag(g: G, s: string, x: number, y: number, align: 'left' | 'right' | 'center', color: string = PAL.yellow, size = 12) {
  const w = s.length * (size * 0.56) + 10;
  const x0 = align === 'left' ? x - 5 : align === 'right' ? x - w + 5 : x - w / 2;
  g.fillStyle = 'rgba(6,10,36,0.82)';
  g.fillRect(x0, y - size - 1, w, size + 6);
  text(g, s, x, y, color, size, align);
}
/** The round's goal as one line at the top: full for 3 s of play, then it fades. */
export function goalLine(g: G, line1: string, played: number, busy: boolean) {
  if (busy || played > 3.6) return;
  g.globalAlpha = played <= 3 ? 1 : 1 - (played - 3) / 0.6;
  tag(g, line1, 330, 18, 'center', PAL.yellow, 14);
  g.globalAlpha = 1;
}

interface Watch { active: boolean; touched: boolean; frame: number; pts: [number, number, number][] }
const watching = new WeakMap<HTMLCanvasElement, Watch>();
function watch(c: HTMLCanvasElement, frame: number): Watch {
  let w = watching.get(c);
  if (!w) {
    const own: Watch = { active: false, touched: false, frame, pts: [] };
    w = own;
    watching.set(c, own);
    c.addEventListener('pointerdown', (e) => {
      const p = pointerToLocal(e, c, 640, 340);
      if (own.pts.some(([x, y, r]) => Math.hypot(p.x - x, p.y - y) <= r + 14)) {
        own.active = true;
        own.touched = true;
      }
    });
    const release = () => {
      own.active = false;
    };
    c.addEventListener('pointerup', release);
    c.addEventListener('pointercancel', release);
  }
  if (w.frame !== frame) {
    w.frame = frame;
    w.pts = [];
  }
  return w;
}
/** A handle's grip: a ring with ⇕, a highlight while held, a "drag" cue until first touched, and the player's own setting beside it. */
export function grip(g: G, c: HTMLCanvasElement, clock: number, o: { x: number; y: number; read: string; cue?: boolean }) {
  const w = watch(c, clock);
  const r = 20;
  w.pts.push([o.x, o.y, r]);
  const cue = !!o.cue && !w.touched;
  if (cue && !calm()) {
    const f = (clock * 1.1) % 1;
    g.globalAlpha = 0.7 * (1 - f);
    g.strokeStyle = PAL.yellow;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(o.x, o.y, r + 4 + f * 12, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
  }
  g.fillStyle = w.active ? 'rgba(255,210,63,0.4)' : 'rgba(10,16,48,0.3)';
  g.beginPath();
  g.arc(o.x, o.y, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = w.active ? PAL.yellow : PAL.white;
  g.lineWidth = w.active ? 4 : 2;
  g.beginPath();
  g.arc(o.x, o.y, r, 0, Math.PI * 2);
  g.stroke();
  text(g, '⇕', o.x, o.y + 5, w.active ? PAL.yellow : PAL.white, 14);
  if (cue) tag(g, 'drag', o.x, o.y - r - 6, 'center');
  text(g, o.read, 300, o.y + 4, PAL.yellow, 13, 'right');
}
/** Whether the first-touch cue is still needed (nothing has been grabbed yet). */
export const untouched = (c: HTMLCanvasElement) => !(watching.get(c)?.touched ?? false);

// ---- the lab ----
const SKY = [
  { top: '#3b2a63', low: '#e9895a', stars: false }, // dusk
  { top: '#050a22', low: '#0e1a46', stars: true }, // midnight
  { top: '#c9759f', low: '#f6c1c8', stars: false }, // dawn pink
];
/** The wall, the window (its sky changes each round), the racks of electronics, the desk and the floor. */
export function lab(g: G, t: number, k: number) {
  g.fillStyle = '#121830';
  g.fillRect(0, 0, 640, 340);
  g.fillStyle = 'rgba(80,110,220,0.08)';
  for (let x = 0; x < 640; x += 64) g.fillRect(x, 0, 2, 318);
  // the window
  const sky = SKY[Math.min(2, k)];
  g.fillStyle = sky.top;
  g.fillRect(562, 24, 36, 20);
  g.fillStyle = sky.low;
  g.fillRect(562, 44, 36, 20);
  if (sky.stars) for (let i = 0; i < 6; i++) text(g, '·', 568 + ((i * 11) % 30), 30 + ((i * 7) % 24), PAL.white, 9 + (Math.sin(t * 2 + i) > 0.6 ? 3 : 0));
  g.strokeStyle = '#6b7396';
  g.lineWidth = 2;
  g.strokeRect(562, 24, 36, 40);
  line(g, 580, 24, 580, 64, '#6b7396', 2);
  line(g, 562, 44, 598, 44, '#6b7396', 2);
  // the racks of electronics, with blinking LEDs
  g.fillStyle = '#0a0e22';
  g.fillRect(600, 30, 36, 288);
  for (let i = 0; i < 7; i++) {
    const y = 38 + i * 40;
    g.fillStyle = '#1a2142';
    g.fillRect(604, y, 28, 32);
    for (let j = 0; j < 2; j++) {
      g.fillStyle = Math.sin(t * 3 + i * 1.7 + j * 2.3) > -0.2 ? (j ? PAL.orange : PAL.green) : '#264232';
      g.beginPath();
      g.arc(612 + j * 10, y + 8, 2.5, 0, Math.PI * 2);
      g.fill();
    }
    line(g, 608, y + 20, 628, y + 20, '#2c3566', 3);
  }
  // the floor
  g.fillStyle = '#0a0f24';
  g.fillRect(0, 318, 640, 22);
  line(g, 0, 318, 640, 318, '#2a3366', 2);
  // the boss round: a still red frame
  if (k === 2) {
    g.strokeStyle = 'rgba(255,60,90,0.4)';
    g.lineWidth = 5;
    g.strokeRect(3, 3, 634, 334);
  }
}

/** The stencil tag at the top left. */
export function stencil(g: G, k: number) {
  if (k === 2) text(g, 'FINAL RUN · BOSS', 12, 16, PAL.red, 12, 'left');
  else text(g, `RUN ${k + 1}`, 12, 16, PAL.dim, 12, 'left');
}

/** The gauge: green LCD text, or dashes. */
export function lcd(g: G, s: string, color: string) {
  g.fillStyle = '#04100c';
  g.fillRect(LCD.x, LCD.y, LCD.w, LCD.h);
  g.strokeStyle = '#3a4a6a';
  g.lineWidth = 2;
  g.strokeRect(LCD.x, LCD.y, LCD.w, LCD.h);
  g.font = 'bold 11px system-ui, sans-serif';
  g.textAlign = 'left';
  g.fillStyle = color;
  g.fillText(s, LCD.x + 6, LCD.y + 14, LCD.w - 12);
}

/** The desk with the control box (X-ray and UV buttons, a knob), the plate-switch lever and a small monitor. */
export function desk(g: G, t: number, o: { lever: number; xray: number; uv: number; knob: number; plates: boolean }) {
  g.fillStyle = '#2b2438';
  g.fillRect(104, 248, 112, 70);
  g.fillStyle = '#3d3552';
  g.fillRect(104, 246, 112, 5);
  // the small monitor: a drifting green trace
  g.fillStyle = '#10182e';
  g.fillRect(182, 222, 30, 24);
  g.strokeStyle = '#5a668e';
  g.lineWidth = 1.5;
  g.strokeRect(182, 222, 30, 24);
  g.strokeStyle = PAL.green;
  g.lineWidth = 1.2;
  g.beginPath();
  for (let i = 0; i <= 8; i++) g.lineTo(185 + i * 3, 234 + Math.sin(t * 2 + i * 0.9) * 4);
  g.stroke();
  // the control box
  g.fillStyle = '#3a4468';
  g.fillRect(BOX.x - 26, BOX.y - 11, 52, 22);
  g.strokeStyle = '#8fa0d8';
  g.lineWidth = 1.5;
  g.strokeRect(BOX.x - 26, BOX.y - 11, 52, 22);
  g.fillStyle = o.xray > 0 ? '#fff4b0' : PAL.yellow;
  g.beginPath();
  g.arc(BOX.x - 14, BOX.y + o.xray * 1.5, 5 - o.xray, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = o.uv > 0 ? '#e2c4ff' : '#b07cff';
  g.beginPath();
  g.arc(BOX.x, BOX.y + o.uv * 1.5, 5 - o.uv, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#c8cfe8';
  g.beginPath();
  g.arc(BOX.x + 14, BOX.y, 6, 0, Math.PI * 2);
  g.fill();
  line(g, BOX.x + 14, BOX.y, BOX.x + 14 + Math.cos(o.knob) * 5, BOX.y + Math.sin(o.knob) * 5, '#222a50', 2);
  // the plate switch: a slot and a lever
  g.fillStyle = '#161c3a';
  g.fillRect(LEVER.x - 20, LEVER.y - 18, 40, 24);
  g.strokeStyle = '#5a668e';
  g.lineWidth = 1.2;
  g.strokeRect(LEVER.x - 20, LEVER.y - 18, 40, 24);
  const a = (o.lever * Math.PI) / 180;
  const tipX = LEVER.x + Math.sin(a) * LEVER.len;
  const tipY = LEVER.y - Math.cos(a) * LEVER.len;
  line(g, LEVER.x, LEVER.y, tipX, tipY, '#d8dcf0', 3);
  g.fillStyle = o.plates ? PAL.cyan : PAL.red;
  g.beginPath();
  g.arc(tipX, tipY, 3.5, 0, Math.PI * 2);
  g.fill();
}
/** Where the tip of the lever is for an angle in degrees (Eli's hand follows it). */
export const leverTip = (deg: number): [number, number] => [LEVER.x + Math.sin((deg * Math.PI) / 180) * LEVER.len, LEVER.y - Math.cos((deg * Math.PI) / 180) * LEVER.len];

// ---- Eli ----
function arm(g: G, sx: number, sy: number, tx: number, ty: number, bend: 1 | -1): [number, number] {
  const L = 27;
  const dx = tx - sx;
  const dy = ty - sy;
  const d = Math.hypot(dx, dy) || 1;
  const reach = Math.min(d, 2 * L - 0.5);
  const ux = dx / d;
  const uy = dy / d;
  const hx = sx + ux * reach;
  const hy = sy + uy * reach;
  const hgt = Math.sqrt(Math.max(0, L * L - (reach / 2) ** 2));
  const mx = sx + (ux * reach) / 2 - uy * hgt * bend;
  const my = sy + (uy * reach) / 2 + ux * hgt * bend;
  line(g, sx, sy, mx, my, '#1f5a3d', 7);
  line(g, mx, my, hx, hy, '#f1f3fa', 6);
  g.fillStyle = SKIN;
  g.beginPath();
  g.arc(hx, hy, 3.4, 0, Math.PI * 2);
  g.fill();
  return [hx, hy];
}

export interface EliOpts {
  mood: EliMood;
  /** What the right hand is doing. */
  reach: 'box' | 'lever' | 'knob' | 'point';
  /** 0 to 1: the jab forward after a +1 or −1 tap. */
  jab: number;
  /** The lever angle in degrees (the hand follows it when reach is 'lever'). */
  lever: number;
  /** Seconds since a win began (0 when not cheering): the mug sloshes and drips. */
  cheerT: number;
}

/**
 * Eli, a particle physicist on a lab stool: a dark green hoodie under an open white coat, round wire glasses, headphones round the neck, a mug labelled QUARK?
 * and sneakers. Feet at (86, 318). Idle: sips every 5 s, blinks every 3 s, the glasses glint every 4 s, one foot taps. The pose never shows the answer.
 */
export function eli(g: G, t: number, o: EliOpts) {
  const x = 86;
  const breathe = calm() ? 0 : Math.sin(t * 2) * 0.6;
  const cheer = o.mood === 'cheer';
  // the stool
  g.fillStyle = '#4a4466';
  g.beginPath();
  g.ellipse(x, 298, 17, 4, 0, 0, Math.PI * 2);
  g.fill();
  line(g, x - 8, 300, x - 14, 318, '#4a4466', 3);
  line(g, x + 8, 300, x + 14, 318, '#4a4466', 3);
  line(g, x - 11, 310, x + 11, 310, '#4a4466', 2);
  // legs and sneakers; one foot taps
  const tap = !calm() && Math.sin(t * 8) > 0.3 ? -2 : 0;
  line(g, x, 294, x + 22, 296, '#2c3a68', 8);
  line(g, x + 22, 296, x + 24, 312, '#2c3a68', 7);
  line(g, x - 2, 294, x + 12, 298, '#2c3a68', 8);
  line(g, x + 12, 298, x + 12, 313 + tap, '#2c3a68', 7);
  g.fillStyle = PAL.white;
  g.fillRect(x + 20, 312, 14, 6);
  g.fillRect(x + 8, 312 + tap, 14, 6);
  g.fillStyle = PAL.pink;
  g.fillRect(x + 20, 316, 14, 2);
  g.fillRect(x + 8, 316 + tap, 14, 2);
  // the torso: hoodie, the open white coat, headphones round the neck
  const ty = 262 + breathe;
  g.fillStyle = '#1f5a3d';
  g.fillRect(x - 14, ty, 28, 34);
  g.fillStyle = '#f1f3fa';
  g.fillRect(x - 17, ty, 7, 38);
  g.fillRect(x + 10, ty, 7, 38);
  g.strokeStyle = '#2a2a33';
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(x, ty + 1, 9, 0.1 * Math.PI, 0.9 * Math.PI);
  g.stroke();
  g.fillStyle = '#2a2a33';
  g.beginPath();
  g.arc(x - 9, ty + 6, 3.4, 0, Math.PI * 2);
  g.arc(x + 9, ty + 6, 3.4, 0, Math.PI * 2);
  g.fill();
  // the mug arm (left of the screen): a mug labelled QUARK?
  const sipPhase = (t % 5) - 4;
  const sip = !calm() && sipPhase > 0 && o.mood === 'happy' ? Math.sin(Math.PI * sipPhase) : 0;
  const slosh = cheer ? Math.sin(t * 14) * 2 : 0;
  const [mx, my] = cheer ? [x - 22 + slosh, ty - 40] : [x - 4, 284 - 10 * sip - (sip > 0 ? 6 : 0)];
  const [lhx, lhy] = arm(g, x - 12, ty + 6, mx, my + 2, cheer ? -1 : 1);
  g.fillStyle = PAL.white;
  g.fillRect(lhx - 5, lhy - 8, 11, 11);
  g.strokeStyle = '#8f9bd6';
  g.lineWidth = 1;
  g.strokeRect(lhx - 5, lhy - 8, 11, 11);
  g.strokeStyle = PAL.white;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(lhx + 7, lhy - 3, 3, -Math.PI / 2, Math.PI / 2);
  g.stroke();
  text(g, 'QUARK?', lhx, lhy - 1, '#2a2a33', 6);
  if (sip > 0.2 || cheer) {
    for (let i = 0; i < 2; i++) {
      g.globalAlpha = 0.6;
      line(g, lhx - 2 + i * 4, lhy - 10, lhx - 3 + i * 4 + Math.sin(t * 6 + i) * 2, lhy - 16, PAL.white, 1.5);
    }
    g.globalAlpha = 1;
  }
  if (cheer) for (let i = 0; i < 2; i++) {
    const u = (o.cheerT * 1.6 + i * 0.5) % 1;
    g.fillStyle = '#c9a36a';
    g.beginPath();
    g.arc(lhx + 6 + i * 3, lhy + 4 + u * 18, 1.8, 0, Math.PI * 2);
    g.fill();
  }
  // the head
  const hy = 252 + breathe;
  g.fillStyle = SKIN;
  g.beginPath();
  g.arc(x, hy, 11, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#3a2a20';
  g.beginPath();
  g.arc(x, hy - 3, 11, Math.PI * 1.05, Math.PI * 1.95);
  g.fill();
  g.fillRect(x - 11, hy - 6, 4, 5);
  eliFace(g, x, hy, t, o.mood);
  // the working arm (right of the screen)
  let target: [number, number] = [130 + 4 * o.jab, 244];
  if (o.reach === 'lever') {
    const [tx, ty2] = leverTip(o.lever);
    target = [tx - 2, ty2 + 2];
  } else if (o.reach === 'knob') target = [BOX.x + 14, BOX.y + 6];
  else if (o.reach === 'point') target = [190, 208];
  if (cheer) target = [x + 20, ty - 40];
  if (o.mood === 'facepalm') target = [x + 1, hy + 2];
  arm(g, x + 12, ty + 6, target[0], target[1], 1);
}

function eliFace(g: G, x: number, y: number, t: number, mood: EliMood) {
  const blink = !calm() && t % 3 > 2.85;
  const ink = '#1b1030';
  g.strokeStyle = ink;
  g.fillStyle = ink;
  g.lineWidth = 1.4;
  const eyeY = y - 1;
  if (mood === 'cheer') {
    g.beginPath();
    g.arc(x - 4.4, eyeY + 1, 2, Math.PI, 2 * Math.PI);
    g.arc(x + 4.4, eyeY + 1, 2, Math.PI, 2 * Math.PI);
    g.stroke();
  } else if (mood === 'squint' || blink || mood === 'facepalm') {
    line(g, x - 6.4, eyeY, x - 2.4, eyeY, ink, 1.6);
    line(g, x + 2.4, eyeY, x + 6.4, eyeY, ink, 1.6);
  } else {
    g.beginPath();
    g.arc(x - 4.4, eyeY, 1.5, 0, Math.PI * 2);
    g.arc(x + 4.4, eyeY, 1.5, 0, Math.PI * 2);
    g.fill();
  }
  // round wire glasses
  g.strokeStyle = '#d8dcf0';
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(x - 4.4, eyeY, 4.2, 0, Math.PI * 2);
  g.arc(x + 4.4, eyeY, 4.2, 0, Math.PI * 2);
  g.stroke();
  line(g, x - 0.2, eyeY, x + 0.2, eyeY, '#d8dcf0', 1.2);
  if (!calm() && t % 4 < 0.25) line(g, x - 7, eyeY - 2, x - 5, eyeY + 1, PAL.white, 1.6);
  // the mouth
  g.strokeStyle = ink;
  g.lineWidth = 1.4;
  g.beginPath();
  if (mood === 'cheer') g.arc(x, y + 4, 4, 0.1 * Math.PI, 0.9 * Math.PI);
  else if (mood === 'worried') g.arc(x, y + 8, 3, 1.15 * Math.PI, 1.85 * Math.PI);
  else if (mood === 'squint' || mood === 'facepalm') {
    g.moveTo(x - 2.5, y + 6);
    g.lineTo(x + 2.5, y + 6);
  } else g.arc(x, y + 3, 3.5, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  if (mood === 'worried' || mood === 'facepalm') {
    line(g, x - 8, eyeY - 6, x - 2, eyeY - 8, ink, 1.4);
    line(g, x + 8, eyeY - 6, x + 2, eyeY - 8, ink, 1.4);
    g.fillStyle = PAL.cyan;
    g.beginPath();
    g.arc(x + 13, y - 2 + ((t * 18) % 7), 1.8, 0, Math.PI * 2);
    g.fill();
  }
}

// ---- Pico ----
export interface PicoOpts {
  /** The lens ring lights cyan (fire). */
  lit: boolean;
  /** The lens drops 4 px after a miss. */
  droop: boolean;
  /** The screen mark: a green tick, a red cross or nothing. */
  mark: 'ok' | 'bad' | null;
  /** The photo flash: alpha of a white disc around the lens (0 for none). */
  flash: number;
  scale?: number;
}
/** Pico, the camera robot on the gantry: a boxy body, a big round lens, a red REC light, two antennae and a small side screen. */
export function pico(g: G, t: number, o: PicoOpts) {
  const s = o.scale ?? 1;
  g.save();
  g.translate(PICO.x, PICO.y);
  g.scale(s, s);
  line(g, -110, -26, 110, -26, '#4a5380', 3);
  line(g, 0, -26, 0, -14, '#8f9bd6', 3);
  const bob = calm() ? 0 : Math.sin(t * 3) * 1.5;
  line(g, -12, -14, -16, -22 + bob, '#8f9bd6', 1.6);
  line(g, 12, -14, 16, -22 - bob, '#8f9bd6', 1.6);
  g.fillStyle = PAL.red;
  g.beginPath();
  g.arc(-16, -22 + bob, 1.8, 0, Math.PI * 2);
  g.arc(16, -22 - bob, 1.8, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#3a4468';
  g.fillRect(-20, -14, 40, 28);
  g.strokeStyle = '#8fa0d8';
  g.lineWidth = 1.5;
  g.strokeRect(-20, -14, 40, 28);
  // the side screen
  g.fillStyle = '#04100c';
  g.fillRect(8, -9, 10, 10);
  if (o.mark) text(g, o.mark === 'ok' ? '✓' : '✗', 13, -1, o.mark === 'ok' ? PAL.green : PAL.red, 9);
  // REC light
  g.fillStyle = Math.floor(t) % 2 === 0 ? PAL.red : '#5a2230';
  g.beginPath();
  g.arc(-15, -9, 2.3, 0, Math.PI * 2);
  g.fill();
  // the lens refocuses slowly; it drops 4 px after a miss
  const r = 10 + (calm() ? 0 : Math.sin(t * 0.8));
  const ly = 2 + (o.droop ? 4 : 0);
  g.fillStyle = '#10182e';
  g.beginPath();
  g.arc(-5, ly, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = o.lit ? PAL.cyan : '#8fa0d8';
  g.lineWidth = o.lit ? 3 : 2;
  g.beginPath();
  g.arc(-5, ly, r, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = o.lit ? 'rgba(77,225,255,0.5)' : 'rgba(143,160,216,0.4)';
  g.beginPath();
  g.arc(-5, ly, r * 0.45, 0, Math.PI * 2);
  g.fill();
  if (o.flash > 0) {
    g.fillStyle = `rgba(255,255,255,${o.flash.toFixed(2)})`;
    g.beginPath();
    g.arc(-5, ly, r + 8, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

// ---- the oil drop ----
/** A golden droplet with a white highlight and one small cyan dot on its rim for each electron the player has added. */
export function oilDrop(g: G, x: number, y: number, t: number, n: number, o: { squash?: boolean; wobble?: number; glint?: boolean; r?: number } = {}) {
  const r = o.r ?? 10;
  const wob = calm() ? 0 : Math.sin(t * 3) * (o.wobble ?? 0.35);
  g.fillStyle = '#e8c15a';
  g.beginPath();
  if (o.squash) g.ellipse(x, y, 14, 6, 0, 0, Math.PI * 2);
  else g.ellipse(x, y, r + wob * 0.5, r - wob * 0.5, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath();
  g.arc(x - 3, y - (o.squash ? 1 : 4), o.squash ? 2 : 3, 0, Math.PI * 2);
  g.fill();
  if (!o.squash) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      g.fillStyle = PAL.cyan;
      g.beginPath();
      g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 2.2, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (o.glint && !calm()) text(g, '✦', x + 12, y - 10, PAL.white, 11 + Math.sin(t * 18) * 2);
}

// ---- level 1: the chamber ----
/** The two plates, signs, the 5 mm bracket, the reticle, the X-ray tube and the UV lamp. The picture is not to scale. */
export function chamber(g: G, t: number, o: { glow: boolean; V: number; m: number; pulse: boolean; tapCue: boolean }) {
  g.fillStyle = '#0b1230';
  g.fillRect(CHAMBER.x0, 76, CHAMBER.x1 - CHAMBER.x0, 192);
  // the camera reticle
  g.strokeStyle = PAL.cyan;
  g.globalAlpha = 0.35;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(DROP_X, DROP_Y, 84, 0, Math.PI * 2);
  g.stroke();
  line(g, DROP_X - 92, DROP_Y, DROP_X + 92, DROP_Y, PAL.cyan, 1);
  line(g, DROP_X, DROP_Y - 92, DROP_X, DROP_Y + 92, PAL.cyan, 1);
  g.globalAlpha = 1;
  // the plates
  g.fillStyle = '#5a6482';
  g.fillRect(CHAMBER.x0, 70, CHAMBER.x1 - CHAMBER.x0, 6);
  g.fillRect(CHAMBER.x0, 268, CHAMBER.x1 - CHAMBER.x0, 6);
  if (o.glow) {
    g.fillStyle = 'rgba(77,225,255,0.15)';
    g.fillRect(CHAMBER.x0, 76, CHAMBER.x1 - CHAMBER.x0, 10);
    g.fillRect(CHAMBER.x0, 258, CHAMBER.x1 - CHAMBER.x0, 10);
  }
  for (const sx of [246, 270, 294, 386, 410, 434]) {
    text(g, '+', sx, 68, PAL.white, 12);
    text(g, '−', sx, 288, PAL.white, 12);
  }
  text(g, `${o.V} V`, DROP_X, 62, PAL.white, 12);
  text(g, `drop ${o.m} × 10⁻¹⁵ kg`, DROP_X, 296, PAL.white, 12);
  // the 5 mm bracket (a fixed fact; not to scale)
  line(g, 458, 76, 458, 268, PAL.dim, 1.5);
  line(g, 454, 76, 462, 76, PAL.dim, 1.5);
  line(g, 454, 268, 462, 268, PAL.dim, 1.5);
  text(g, '5 mm', 464, 128, PAL.dim, 12, 'left');
  // the X-ray tube (grey cylinder with a trefoil) and the UV lamp (a purple bulb)
  const pulse = o.pulse ? 0.5 + 0.5 * Math.sin(5 * t) : 1;
  g.globalAlpha = pulse;
  g.fillStyle = '#7d889c';
  g.fillRect(TUBE.x - 16, TUBE.y - 10, 32, 20);
  g.fillStyle = '#4a5380';
  g.fillRect(TUBE.x + 12, TUBE.y - 7, 6, 14);
  g.fillStyle = PAL.yellow;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.moveTo(TUBE.x - 3, TUBE.y);
    g.arc(TUBE.x - 3, TUBE.y, 7, (i * 2 * Math.PI) / 3 - 0.5, (i * 2 * Math.PI) / 3 + 0.5);
    g.fill();
  }
  g.globalAlpha = 1;
  if (o.tapCue) tag(g, 'tap +1', TUBE.x - 6, TUBE.y - 18, 'center', PAL.yellow, 11);
  g.fillStyle = '#4a5380';
  g.fillRect(UV.x - 16, UV.y - 4, 10, 8);
  g.fillStyle = '#b07cff';
  g.beginPath();
  g.arc(UV.x, UV.y, 10, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.beginPath();
  g.arc(UV.x - 3, UV.y - 3, 3, 0, Math.PI * 2);
  g.fill();
}
/** A flash from the X-ray tube (a yellow zigzag) or the UV lamp (a violet ray) to the drop, u from 0 to 1 over 0.15 s. */
export function zap(g: G, kind: 'x' | 'uv', u: number, dropY: number) {
  g.globalAlpha = 1 - u;
  if (kind === 'x') {
    g.strokeStyle = PAL.yellow;
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(TUBE.x + 18, TUBE.y);
    for (let i = 1; i <= 8; i++) g.lineTo(TUBE.x + 18 + ((DROP_X - 12 - TUBE.x - 18) * i) / 8, TUBE.y + (dropY - TUBE.y) * (i / 8) + (i % 2 ? -6 : 6) * (i < 8 ? 1 : 0));
    g.stroke();
  } else line(g, UV.x - 12, UV.y, DROP_X + 12, dropY, '#c9a0ff', 5);
  g.globalAlpha = 1;
}

// ---- level 2: the detector's charge ladder ----
/** The display panel with its axis from 0 to 36 du. */
export function panel(g: G) {
  g.fillStyle = '#0a0f2c';
  g.fillRect(PANEL.x0, PANEL.y0, PANEL.x1 - PANEL.x0, PANEL.y1 - PANEL.y0);
  g.strokeStyle = '#5a668e';
  g.lineWidth = 2;
  g.strokeRect(PANEL.x0, PANEL.y0, PANEL.x1 - PANEL.x0, PANEL.y1 - PANEL.y0);
  line(g, LADDER.x, ladderY(36), LADDER.x, LADDER.y0, PAL.dim, 2);
  text(g, '0', LADDER.x - 8, LADDER.y0 + 4, PAL.dim, 11, 'right');
  text(g, '36 du', LADDER.x + 8, ladderY(36) + 4, PAL.dim, 11, 'left');
}
/** A rung of the ladder; the first rung is bright, the others dim. */
export function rung(g: G, du: number, first: boolean) {
  g.globalAlpha = first ? 1 : 0.6;
  line(g, 330, ladderY(du), 390, ladderY(du), PAL.cyan, first ? 4 : 3);
  g.globalAlpha = 1;
}
/** A drop marker: a golden circle with its reading beside it. */
export function marker(g: G, x: number, y: number, read: string) {
  g.fillStyle = '#e8c15a';
  g.beginPath();
  g.arc(x, y, 7, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.beginPath();
  g.arc(x - 2, y - 2, 2, 0, Math.PI * 2);
  g.fill();
  text(g, read, Math.max(x + 12, 396), y + 4, PAL.white, 11, 'left');
}

// ---- level 3: the five drops ----
/** The camera view with the five drops, their letters and readings. `gone` hides a drop that has been puffed or shrunk away. */
export function view(g: G) {
  g.fillStyle = '#0a1028';
  g.fillRect(VIEW.x0, VIEW.y0, VIEW.x1 - VIEW.x0, VIEW.y1 - VIEW.y0);
  g.strokeStyle = '#5a668e';
  g.lineWidth = 2;
  g.strokeRect(VIEW.x0, VIEW.y0, VIEW.x1 - VIEW.x0, VIEW.y1 - VIEW.y0);
  text(g, '× 10⁻¹⁹ C', 340, 228, PAL.dim, 11);
}
export function viewDrop(g: G, i: number, reading: string, t: number, o: { flagged: boolean; dx?: number; dy?: number; r?: number; alpha?: number; showText?: boolean }) {
  const { x, y } = DROPS[i];
  const px = x + (o.dx ?? 0);
  const py = y + (o.dy ?? 0);
  const r = o.r ?? 12;
  g.globalAlpha = o.alpha ?? 1;
  const bob = calm() ? 0 : Math.sin(t * 2 + i) * 1.2;
  g.fillStyle = '#e8c15a';
  g.beginPath();
  g.arc(px, py + bob, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.beginPath();
  g.arc(px - r * 0.3, py + bob - r * 0.35, r * 0.25, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
  if (o.showText !== false) {
    text(g, 'ABCDE'[i], x, 124, PAL.white, 12);
    text(g, reading, x, 184, PAL.white, 12);
  }
  if (o.flagged && (o.alpha ?? 1) > 0.5) {
    g.strokeStyle = PAL.red;
    g.lineWidth = 2;
    g.setLineDash([4, 3]);
    g.beginPath();
    g.arc(px, py + bob, 18, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
    text(g, 'DUST?', x, 108, PAL.red, 11);
    g.fillStyle = '#7d889c';
    g.fillRect(x - 3, VIEW.y0 + 2, 6, 16);
    g.fillStyle = '#4a5380';
    g.fillRect(x - 5, VIEW.y0 + 16, 10, 4);
  }
}
/** The e-ladder strip: a tick and a small n at every whole e, and a marker of each drop's letter at its reading. */
export function strip(g: G, ks: number[]) {
  line(g, STRIP.x0, STRIP.y, STRIP.x1, STRIP.y, PAL.dim, 2);
  for (let n = 1; n <= 9; n++) {
    line(g, stripX(n), STRIP.y - 5, stripX(n), STRIP.y + 5, PAL.dim, 2);
    text(g, String(n), stripX(n), STRIP.y + 14, PAL.dim, 11);
  }
  ks.forEach((k, i) => {
    const x = stripX(k / 3);
    line(g, x, STRIP.y - 4, x, STRIP.y - 12, PAL.yellow, 1.5);
    text(g, 'ABCDE'[i], x, STRIP.y - 15, PAL.yellow, 11);
  });
}
/** The envelope the kept drops are sealed into. */
export function envelope(g: G, x: number, y: number, s = 1) {
  g.fillStyle = '#f1f3fa';
  g.fillRect(x - 14 * s, y - 9 * s, 28 * s, 18 * s);
  g.strokeStyle = '#8f9bd6';
  g.lineWidth = 1.5;
  g.strokeRect(x - 14 * s, y - 9 * s, 28 * s, 18 * s);
  g.beginPath();
  g.moveTo(x - 14 * s, y - 9 * s);
  g.lineTo(x, y + 2 * s);
  g.lineTo(x + 14 * s, y - 9 * s);
  g.stroke();
}
/** The journal cover and its stamp, slammed on at 1.4 s: scale 1.6 → 1 over 0.1 s. */
export function stamp(g: G, label: string, color: string, since: number) {
  const s = 1 + 0.6 * (1 - clamp01(since / 0.1));
  g.fillStyle = '#f1f3fa';
  g.fillRect(200, 86, 280, 70);
  g.strokeStyle = '#8f9bd6';
  g.lineWidth = 2;
  g.strokeRect(200, 86, 280, 70);
  text(g, 'JOURNAL OF FREE CHARGE', 340, 106, '#4a5380', 11);
  g.save();
  g.translate(340, 136);
  g.rotate(-0.08);
  g.scale(s, s);
  glow(g, color, 6, () => {
    g.strokeStyle = color;
    g.lineWidth = 3;
    g.strokeRect(-130, -15, 260, 28);
  });
  text(g, label, 0, 5, color, 15);
  g.restore();
}
