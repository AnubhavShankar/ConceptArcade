// Drawing for Signal Heist: Hex the hacker, the ceiling turret and its hatch, the round vault door with its laser grid, the oscilloscope, the tone slots and the
// capacitor charge meter. Nothing here knows the answer of a round: it draws the numbers, states and poses it is handed.
import { PAL } from '@core/arcade';
import { glow, line, text } from '@core/neon';

export type G = CanvasRenderingContext2D;
export type HexMood = 'focus' | 'happy' | 'worried' | 'dizzy';
export type HexPose = 'crouch' | 'fist' | 'sit' | 'run';

/** Colours the tests look for on the canvas. */
export const LIQUID = '#3fb6ff';
export const SLEEVE = '#5a6378';

const INK = '#161a36';
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
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
function limb(g: G, pts: [number, number][], w: number, color: string) {
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

/** A polyline with a glow: the one place the lock signal and the player's mix are stroked. */
export function polyline(g: G, pts: [number, number][], color: string, w = 2, blur = 8) {
  glow(g, color, blur, () => {
    g.strokeStyle = color;
    g.lineWidth = w;
    g.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
    g.stroke();
  });
}

// ---- Hex ---------------------------------------------------------------------------------------------------------------------------------------------------

type P = [number, number];
interface Pz {
  hip: P;
  sh: P;
  head: P;
  legs: P[][];
  arms: P[][];
}
const POSES: Record<HexPose, Pz> = {
  crouch: { hip: [-3, -18], sh: [3, -31], head: [9, -39], legs: [[[-3, -18], [5, -11], [8, -3]], [[-3, -18], [-7, -9], [-8, -3]]], arms: [[[3, -31], [12, -25], [19, -27]]] },
  fist: { hip: [-2, -24], sh: [0, -42], head: [3, -51], legs: [[[-2, -24], [1, -13], [-3, -3]], [[-2, -24], [4, -13], [6, -3]]], arms: [[[0, -42], [8, -36], [12, -40]], [[0, -42], [8, -52], [10, -62]]] },
  sit: { hip: [-4, -6], sh: [-1, -19], head: [4, -26], legs: [[[-4, -6], [10, -13], [19, -3]], [[-4, -6], [8, -5], [17, -2]]], arms: [[[-1, -19], [6, -13], [10, -5]]] },
  run: { hip: [-2, -22], sh: [6, -35], head: [12, -42], legs: [[[-2, -22], [8, -14], [13, -5]], [[-2, -22], [-8, -12], [-14, -8]]], arms: [[[6, -35], [-2, -30], [-6, -24]], [[6, -35], [14, -30], [20, -33]]] },
};

/**
 * Hex, a hacker in a dark hoodie with a glowing cyan visor and a wrist deck, feet at (x, y), facing right. Idle life: the hood sways, the fingers tap the deck
 * and the holo flickers, the visor eyes blink and glance up at the turret hatch every 4 s. Moods show in the visor: focus (dashes), happy (arcs), worried
 * (round eyes and a sweat drop), dizzy (spirals and frizzled hair).
 */
export function hex(g: G, x: number, y: number, t: number, o: { mood: HexMood; pose: HexPose; step?: number }) {
  const Q = POSES[o.pose];
  g.save();
  g.translate(x, y);
  const bob = o.pose === 'crouch' ? Math.sin(t * 3) * 0.5 : 0;
  const step = o.step ?? 0;
  const sw = Math.sin(t * 2) * 0.8;
  // legs and sneakers
  Q.legs.forEach((chain, i) => {
    const c = o.pose === 'run' ? chain.map(([px, py]): P => [px + (i ? -1 : 1) * Math.sin(step * 18) * 3, py]) : chain;
    limb(g, c, 5, '#262c5a');
    const f = c[c.length - 1];
    g.fillStyle = PAL.white;
    rr(g, f[0] - 4, f[1] - 2, 11, 5, 2);
    g.fill();
    line(g, f[0] - 4, f[1] + 3, f[0] + 7, f[1] + 3, PAL.cyan, 1.6);
  });
  // hoodie
  limb(g, [[Q.hip[0], Q.hip[1] + bob], [Q.sh[0], Q.sh[1] + bob]], 12, '#1d2140');
  limb(g, [[Q.hip[0] + 1, Q.hip[1] + bob - 3], [Q.sh[0] + 1, Q.sh[1] + bob + 3]], 1.8, 'rgba(77,225,255,0.8)');
  // arms; the first arm of the crouch is the wrist deck
  Q.arms.forEach((a, i) => {
    const c = a.map(([px, py]): P => [px, py + bob]);
    limb(g, c, 3.6, '#1d2140');
    const w = c[c.length - 1];
    if (o.pose === 'crouch' && i === 0) {
      const tap = Math.sin(t * 14) * 0.6;
      g.fillStyle = '#0f3a52';
      rr(g, w[0] - 3, w[1] - 2.5, 9, 5, 1.5);
      g.fill();
      g.strokeStyle = PAL.cyan;
      g.lineWidth = 1;
      g.stroke();
      for (let k = 0; k < 3; k++) {
        g.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 5 + k * 2));
        g.fillStyle = k === 1 ? PAL.yellow : PAL.cyan;
        g.fillRect(w[0] - 1.5 + k * 3, w[1] - 1, 1.6, 1.6);
      }
      g.globalAlpha = 1;
      dot(g, w[0] + 1, w[1] - 3.4 + tap, 1.9, '#d9a88a');
      // the holo screen the deck projects, flickering, with tiny waves
      const fl = 0.7 + 0.3 * Math.sin(t * 7);
      g.globalAlpha = fl;
      line(g, w[0], w[1] - 3, w[0] + 3, w[1] - 8, 'rgba(77,225,255,0.5)', 1);
      line(g, w[0] + 9, w[1] - 3, w[0] + 23, w[1] - 8, 'rgba(77,225,255,0.5)', 1);
      g.fillStyle = 'rgba(77,225,255,0.14)';
      rr(g, w[0] + 3, w[1] - 24, 20, 15, 2);
      g.fill();
      g.strokeStyle = PAL.cyan;
      g.lineWidth = 1;
      g.stroke();
      g.strokeStyle = PAL.cyan;
      g.lineWidth = 1.2;
      g.beginPath();
      for (let k = 0; k <= 12; k++) {
        const px = w[0] + 5 + k * 1.4;
        const py = w[1] - 16.5 + Math.sin(k * 0.9 + t * 7) * 3.5;
        if (k === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.stroke();
      g.globalAlpha = 1;
    } else {
      dot(g, w[0], w[1], o.pose === 'fist' && i === 1 ? 3.2 : 2.2, '#d9a88a');
    }
  });
  // hood (sways), frizz after a zap, visor and eyes
  const hx = Q.head[0] + sw;
  const hy = Q.head[1] + bob;
  g.fillStyle = INK;
  g.beginPath();
  g.arc(hx, hy, 8.2, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(hx - 6, hy - 5);
  g.lineTo(hx - 13, hy + 3 + Math.sin(t * 2) * 0.8);
  g.lineTo(hx - 5, hy + 7);
  g.closePath();
  g.fill();
  g.strokeStyle = '#2c3470';
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(hx, hy, 8.2, Math.PI * 1.05, Math.PI * 1.95);
  g.stroke();
  if (o.mood === 'dizzy') {
    for (let k = 0; k < 4; k++) {
      const bx = hx - 5 + k * 3.4;
      line(g, bx, hy - 7, bx + 2, hy - 11, PAL.yellow, 1.2);
      line(g, bx + 2, hy - 11, bx - 0.5, hy - 14, PAL.yellow, 1.2);
      line(g, bx - 0.5, hy - 14, bx + 2, hy - 18, PAL.yellow, 1.2);
    }
  }
  glow(g, PAL.cyan, 7, () => {
    g.fillStyle = '#0c3a52';
    rr(g, hx + 0.5, hy - 3.6, 12, 6.4, 3);
    g.fill();
    g.strokeStyle = PAL.cyan;
    g.lineWidth = 1.3;
    g.stroke();
  });
  const blink = Math.sin(t * 1.7) > 0.96;
  const glance = o.mood === 'focus' && o.pose === 'crouch' && t % 4 < 0.7 ? -1.6 : 0;
  const ey = hy - 0.6 + glance;
  g.strokeStyle = '#d4fbff';
  g.fillStyle = '#d4fbff';
  g.lineWidth = 1.4;
  for (const ex of [hx + 4, hx + 9]) {
    if (o.mood === 'dizzy') {
      g.beginPath();
      for (let k = 0; k <= 14; k++) {
        const a = k * 0.8 + t * 9;
        const r = 0.25 + k * 0.1;
        if (k === 0) g.moveTo(ex + Math.cos(a) * r, ey + Math.sin(a) * r);
        else g.lineTo(ex + Math.cos(a) * r, ey + Math.sin(a) * r);
      }
      g.stroke();
    } else if (o.mood === 'happy') {
      g.beginPath();
      g.arc(ex, ey + 1, 1.8, Math.PI, 2 * Math.PI);
      g.stroke();
    } else if (o.mood === 'worried') {
      g.beginPath();
      g.arc(ex, ey, 1.3, 0, Math.PI * 2);
      g.fill();
    } else if (blink) line(g, ex - 1.6, ey + 0.3, ex + 1.6, ey + 0.3, '#d4fbff', 0.9);
    else line(g, ex - 1.8, ey, ex + 1.8, ey, '#d4fbff', 1.5);
  }
  if (o.mood === 'worried') {
    const fall = (t * 16) % 9;
    dot(g, hx - 8.5, hy - 4 + fall, 1.6, PAL.cyan);
    line(g, hx + 2.5, ey - 3.2, hx + 6, ey - 2.4, '#d4fbff', 1);
    line(g, hx + 7.5, ey - 2.4, hx + 11, ey - 3.2, '#d4fbff', 1);
  }
  g.restore();
}

// ---- The turret and its hatch ------------------------------------------------------------------------------------------------------------------------------

export type HatchLight = 'idle' | 'alarm' | 'green';
/** The ceiling hatch above the door: two panels that slide apart, with a status light. */
export function hatch(g: G, cx: number, open: number, light: HatchLight, t: number) {
  g.fillStyle = '#10142e';
  rr(g, cx - 28, 3, 56, 16, 3);
  g.fill();
  g.strokeStyle = '#2c3470';
  g.lineWidth = 1.2;
  g.stroke();
  g.fillStyle = '#3b4252';
  g.fillRect(cx - 26 - open * 12, 5, 26, 12);
  g.fillRect(cx + open * 12, 5, 26, 12);
  const on = light === 'alarm' ? Math.sin(t * 12) > 0 :light === 'idle' ? Math.sin(t * 2) > -0.2 : true;
  const col = light === 'green' ? PAL.green : light === 'alarm' ? PAL.red : PAL.yellow;
  if (on) glow(g, col, 8, () => dot(g, cx + 20, 11, 2.6, col));
  else dot(g, cx + 20, 11, 2.6, '#33384f');
}

/** The security turret on its arm. `drop` 0 (hidden) to 1 (down); the barrel points along `aim` (radians); the red eye sweeps until `locked`. */
export function turretBody(g: G, cx: number, t: number, o: { drop: number; aim: number; locked: boolean }) {
  if (o.drop <= 0.02) return;
  const endY = 19 + 54 * o.drop;
  line(g, cx, 14, cx, endY, '#8d93b5', 4);
  for (let y = 24; y < endY; y += 12) line(g, cx - 3, y, cx + 3, y, '#4a5078', 1.5);
  const hy = endY + 10;
  // barrel
  const bx = cx + Math.cos(o.aim) * 20;
  const by = hy + Math.sin(o.aim) * 20;
  limb(g, [[cx, hy], [bx, by]], 6, '#9aa2c0');
  limb(g, [[cx + Math.cos(o.aim) * 16, hy + Math.sin(o.aim) * 16], [bx, by]], 8, '#4a5078');
  // housing, dome and the red eye
  g.fillStyle = '#3b4252';
  rr(g, cx - 15, hy - 10, 30, 20, 7);
  g.fill();
  g.strokeStyle = '#8d93b5';
  g.lineWidth = 1.4;
  g.stroke();
  g.fillStyle = '#4a5078';
  g.beginPath();
  g.arc(cx, hy - 10, 8, Math.PI, 2 * Math.PI);
  g.fill();
  const look = o.locked ? o.aim : Math.PI / 2 + Math.sin(t * 9) * 0.9;
  glow(g, PAL.red, 10, () => dot(g, cx, hy, 7, PAL.red));
  dot(g, cx + Math.cos(look) * 3, hy + Math.sin(look) * 3, 2.6, '#3a0a10');
  dot(g, cx + Math.cos(look) * 3 - 1, hy + Math.sin(look) * 3 - 1, 0.9, PAL.white);
  dot(g, cx - 11, hy + 6, 1.4, '#aab2cc');
  dot(g, cx + 11, hy + 6, 1.4, '#aab2cc');
}
/** Where the muzzle is for a turret at cx with the given aim. */
export const muzzle = (cx: number, aim: number): [number, number] => [cx + Math.cos(aim) * 24, 19 + 54 + 10 + Math.sin(aim) * 24];

/** The stun dart: a cyan streak from (x0, y0) toward (x1, y1), p from 0 (at the muzzle) to 1 (at the target). */
export function dart(g: G, x0: number, y0: number, x1: number, y1: number, p: number) {
  if (p <= 0 || p > 1) return;
  const hx = x0 + (x1 - x0) * p;
  const hy = y0 + (y1 - y0) * p;
  const tx = x0 + (x1 - x0) * Math.max(0, p - 0.25);
  const ty = y0 + (y1 - y0) * Math.max(0, p - 0.25);
  glow(g, PAL.cyan, 10, () => line(g, tx, ty, hx, hy, PAL.cyan, 3.5));
  line(g, tx, ty, hx, hy, PAL.white, 1.2);
}

// ---- The vault door and the laser grid --------------------------------------------------------------------------------------------------------------------

export type DoorScreen = 'idle' | 'open' | 'alarm';
/**
 * The round steel door at (cx, cy), radius r: rim, face, six bolts (`bolts[i]` 0 out to 1 retracted), a three-spoke wheel at angle `wheel`, a screen above it
 * (padlock, LOCK OPEN or ALARM), and the gold glow of the vault behind it. `open` 0 to 1 swings it about its left edge.
 */
export function door(g: G, cx: number, cy: number, r: number, o: { open: number; bolts: number[]; wheel: number; screen: DoorScreen; t: number }) {
  // the gold vault behind
  if (o.open > 0) {
    g.globalAlpha = Math.min(1, o.open * 1.4);
    glow(g, PAL.yellow, 26, () => dot(g, cx, cy, r - 6, '#ffcf4a'));
    for (let k = 0; k < 5; k++) dot(g, cx - 20 + k * 10, cy + 24 - (k % 2) * 6, 5, '#fff3b0');
    g.globalAlpha = 1;
  }
  g.save();
  g.translate(cx - r, cy);
  g.scale(1 - 0.86 * o.open, 1);
  g.translate(r, 0);
  dot(g, 0, 0, r, '#5a6378');
  dot(g, 0, 0, r - 9, '#3b4252');
  g.strokeStyle = '#2a3042';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(0, 0, r - 9, 0, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - Math.PI / 2;
    const ret = o.bolts[i] ?? 0;
    dot(g, Math.cos(a) * (r - 4.5), Math.sin(a) * (r - 4.5), 3.4 * (1 - 0.7 * ret), ret > 0.5 ? '#1c2030' : '#c3cae0');
  }
  g.save();
  g.rotate(o.wheel);
  g.strokeStyle = '#8d93b5';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(0, 0, 28, 0, Math.PI * 2);
  g.stroke();
  for (let k = 0; k < 3; k++) line(g, 0, 0, Math.cos((k * 2 * Math.PI) / 3) * 28, Math.sin((k * 2 * Math.PI) / 3) * 28, '#8d93b5', 4);
  g.restore();
  dot(g, 0, 0, 8, '#aab2cc');
  dot(g, 0, 0, 3, '#3b4252');
  g.restore();
  // the little screen above the door
  const sx = cx - 22;
  const sy = cy - r - 20;
  g.fillStyle = '#05100c';
  rr(g, sx, sy, 44, 16, 3);
  g.fill();
  g.strokeStyle = '#6a7390';
  g.lineWidth = 1.2;
  g.stroke();
  // the words are 11 px, wider than the little screen, so they sit on a wider plate of the same dark glass
  if (o.screen === 'open') {
    g.fillStyle = '#05100c';
    rr(g, cx - 34, sy, 68, 16, 3);
    g.fill();
    g.stroke();
    text(g, 'LOCK OPEN', cx, sy + 12, PAL.green, 11);
  } else if (o.screen === 'alarm') {
    if (Math.sin(o.t * 12) > -0.3) text(g, 'ALARM', cx, sy + 12.5, PAL.red, 11);
  } else {
    g.strokeStyle = PAL.yellow;
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(cx, sy + 6, 3.4, Math.PI, 2 * Math.PI);
    g.stroke();
    g.fillStyle = PAL.yellow;
    g.fillRect(cx - 4.5, sy + 6, 9, 7);
  }
}

/** Five red laser beams across the door; `off` 0 (all on) to 1 (all off) switches them off left to right. */
export function lasers(g: G, cx: number, cy: number, r: number, t: number, off: number) {
  const x0 = cx - r - 8;
  const x1 = cx + r + 8;
  const from = x0 + (x1 - x0) * clamp01(off);
  if (from >= x1) return;
  for (let i = 0; i < 5; i++) {
    const y = cy - 48 + i * 24;
    g.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(t * 6 + i * 1.7));
    glow(g, PAL.red, 8, () => line(g, from, y, x1, y, PAL.red, 2));
    g.fillStyle = '#7a1c24';
    g.fillRect(x1, y - 3, 5, 6);
    g.fillRect(x0 - 5, y - 3, 5, 6);
  }
  g.globalAlpha = 1;
}

// ---- The oscilloscope, the tone slots and the charge meter ------------------------------------------------------------------------------------------------

/** The scope bezel and screen with a faint 8 × 4 grid and its label. There is no axis, no zero line and no number. */
export function scopeFrame(g: G, S: { x0: number; x1: number; y0: number; y1: number }) {
  g.fillStyle = '#2a2f4a';
  rr(g, S.x0 - 7, S.y0 - 7, S.x1 - S.x0 + 14, S.y1 - S.y0 + 14, 8);
  g.fill();
  g.fillStyle = '#06140f';
  rr(g, S.x0, S.y0, S.x1 - S.x0, S.y1 - S.y0, 4);
  g.fill();
  for (let i = 1; i < 8; i++) line(g, S.x0 + ((S.x1 - S.x0) * i) / 8, S.y0, S.x0 + ((S.x1 - S.x0) * i) / 8, S.y1, 'rgba(93,255,154,0.12)', 1);
  for (let j = 1; j < 4; j++) line(g, S.x0, S.y0 + ((S.y1 - S.y0) * j) / 4, S.x1, S.y0 + ((S.y1 - S.y0) * j) / 4, 'rgba(93,255,154,0.12)', 1);
  // the label sits above the bezel, so the signal never runs through it
  text(g, 'LOCK SIGNAL', S.x0, S.y0 - 11, PAL.dim, 11, 'left');
}

/** One tone slot: a small screen, the tone drawn at the player's amplitude (1 reaches 26 px), the name underneath and the amplitude above. */
export function slot(g: G, x: number, w: number, top: number, midY: number, name: string, ampText: string, wave: (px: number) => number) {
  g.fillStyle = '#06140f';
  rr(g, x, top, w, 62, 5);
  g.fill();
  g.strokeStyle = '#3b4a7a';
  g.lineWidth = 1.2;
  g.stroke();
  line(g, x + 4, midY, x + w - 4, midY, 'rgba(93,255,154,0.2)', 1);
  const pts: [number, number][] = [];
  for (let i = 0; i <= 48; i++) pts.push([x + 6 + ((w - 12) * i) / 48, midY - wave((2 * Math.PI * i) / 48)]);
  polyline(g, pts, PAL.cyan, 1.8, 5);
  text(g, ampText, x + 4, top - 5, PAL.yellow, 12, 'left');
  text(g, name, x + w / 2, top + 76, PAL.white, 11);
}

/**
 * The charge meter: a tube from 0 to 2 with ticks every 1/12 and labels at 0, 1/2, 1, 3/2 and 2, and the fuse bar. `liquid` (in charge units) is drawn only
 * when given; `sealed` covers the tube with a riveted steel sleeve (only the fuse bar shows, through a slot); `mark` draws the dashed net-charge mark.
 */
export function meter(g: G, M: { x: number; y0: number; y1: number; w: number }, o: { k: number; liquid: number | null; sealed: boolean; mark: number | null; fuse: 'idle' | 'glow' | 'blown' | 'dark'; t: number }) {
  const yOf = (q: number) => M.y1 - (q / 2) * (M.y1 - M.y0);
  g.fillStyle = '#0a1a2a';
  rr(g, M.x, M.y0, M.w, M.y1 - M.y0, 6);
  g.fill();
  g.strokeStyle = 'rgba(77,225,255,0.7)';
  g.lineWidth = 1.4;
  g.stroke();
  if (o.liquid !== null) {
    const y = yOf(Math.max(0, Math.min(2, o.liquid)));
    g.fillStyle = LIQUID;
    g.fillRect(M.x + 2, y, M.w - 4, M.y1 - y - 2);
    line(g, M.x + 2, y, M.x + M.w - 2, y, PAL.white, 1.2);
  }
  for (let i = 0; i <= 24; i++) {
    const y = yOf(i / 12);
    line(g, M.x - (i % 6 === 0 ? 8 : 4), y, M.x - 1, y, PAL.dim, i % 6 === 0 ? 1.6 : 1);
  }
  ['0', '1/2', '1', '3/2', '2'].forEach((s, i) => text(g, s, M.x - 11, yOf(i / 2) + 3.5, PAL.dim, 11, 'right'));
  if (o.sealed) {
    // two steel plates leave a slot for the fuse bar; rivets along both edges
    g.fillStyle = SLEEVE;
    g.fillRect(M.x - 2, M.y0 - 2, 6.5, M.y1 - M.y0 + 4);
    g.fillRect(M.x + M.w - 4.5, M.y0 - 2, 6.5, M.y1 - M.y0 + 4);
    g.fillStyle = '#7b84a4';
    g.fillRect(M.x + 4.5, M.y0 - 2, M.w - 9, 4);
    g.fillRect(M.x + 4.5, M.y1 - 2, M.w - 9, 4);
    g.fillStyle = '#2a2f4a';
    g.fillRect(M.x + 4.5, M.y0 + 2, M.w - 9, M.y1 - M.y0 - 4);
    for (let y = M.y0 + 6; y < M.y1; y += 17) {
      dot(g, M.x + 0.7, y, 1.5, '#aab2cc');
      dot(g, M.x + M.w - 0.7, y, 1.5, '#aab2cc');
    }
  }
  if (o.mark !== null) {
    const y = yOf(o.mark);
    line(g, M.x - 3, y, M.x + M.w + 3, y, PAL.green, 2, [4, 3]);
    g.fillStyle = 'rgba(8,12,40,0.85)';
    rr(g, M.x + M.w + 4, y - 8, 30, 16, 3);
    g.fill();
    text(g, 'NET', M.x + M.w + 19, y + 4, PAL.green, 11);
  }
  // the fuse bar, the drag handle
  const fy = yOf(o.k / 12);
  const col = o.fuse === 'glow' ? PAL.white : o.fuse === 'dark' ? '#6b6f85' : PAL.yellow;
  if (o.fuse === 'blown') {
    line(g, M.x - 7, fy + 1, M.x + 4, fy - 3, '#6b6f85', 3);
    line(g, M.x + M.w - 4, fy + 3, M.x + M.w + 7, fy - 1, '#6b6f85', 3);
    for (let k = 0; k < 4; k++) dot(g, M.x + M.w / 2 + Math.sin(o.t * 3 + k) * 5, fy - 8 - k * 7 - ((o.t * 20) % 8), 3 + k, `rgba(150,155,175,${0.5 - k * 0.1})`);
  } else {
    glow(g, col, o.fuse === 'glow' ? 16 : 8, () => {
      g.fillStyle = col;
      rr(g, M.x - 7, fy - 3, M.w + 14, 6, 2);
      g.fill();
    });
  }
}
