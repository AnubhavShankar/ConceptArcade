// Drawing for "Lights of the High Pass": the snowbound pass at three times of day, the stone lodge with its prayer flags, the turbine shed with the sluice lever,
// the sealed choke, capacitor and dropper, the lamps, Dolma the keeper, the roped party of trekkers and Norbu the yak. Nothing here knows the answer of a round:
// it draws the positions, moods and lamp states it is handed. No Math.random: every wobble comes from the clock.
import { PAL } from '@core/arcade';
import { backdrop, face } from '@core/mathkit';
import { glow, line, text } from '@core/neon';

export type G = CanvasRenderingContext2D;

export const SLUICE = { x: 250, y0: 300, y1: 160 }; // the lever's vertical slot: y0 is the dial minimum, y1 the maximum
export const leverY = (f: number, lo: number, hi: number) => SLUICE.y0 - ((f - lo) / (hi - lo)) * (SLUICE.y0 - SLUICE.y1);
export const SHED = { x: 228, y: 196, w: 120, h: 104 };
export const TURBINE = { x: 310, y: 262, r: 24 };
export const GAUGE = { x: 300, y: 214, r: 15 }; // the frequency gauge: needle at the player's f, 0 to 100 Hz
export const LODGE = { x: 14, y: 150, w: 140, h: 150 };
export const PORCH = { x: 120, y: 226 };
export const ROOF = { a: [44, 146] as [number, number], b: [92, 146] as [number, number] };
export const CHOKE_BOX = { x: 372, y: 214 };
export const CAP_CAN = { x: 168, y: 222 };
export const TRAIL: [number, number][] = [[630, 312], [560, 296], [490, 282], [420, 268], [350, 304], [190, 312], [124, 296]];
export const LAMPS: [number, number][] = [[560, 268], [490, 254], [420, 240], [350, 276]];
// The LCD is widened from the brief's 150 px so the level 3 reading "trail 9.08 A · beacon 2.15 A" fits at 12 px.
export const LCD = { x: 356, y: 150, w: 196, h: 18 };
export const DOLMA = { x: 206, y: 318 };
export const YAK = { x: 60, y: 300 };
export const DOOR = { x: 120, y: 270 };
export const INSET = { x: 420, y: 70, w: 120, h: 50 };
/** Where a party that lost the trail ends up: the drift beside the trail (too dim) and the drift past the door (beacon too dim). */
export const DRIFT_TRAIL: [number, number] = [436, 316];
export const DRIFT_DOOR: [number, number] = [90, 320];

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (u: number) => clamp01(u) * clamp01(u) * (3 - 2 * clamp01(u));
const frac = (v: number) => v - Math.floor(v);
/** A repeatable wobble in −0.5 to 0.5 from a number. */
export const jit = (n: number) => frac(Math.sin(n * 12.9898) * 43758.5453) - 0.5;
const INK = '#1b1030';
const rad = (deg: number) => (deg * Math.PI) / 180;

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
function polygon(g: G, pts: [number, number][], fill: string) {
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
  g.closePath();
  g.fill();
}
/** A vertical gradient that falls back to a flat colour when the canvas has no gradients (the test canvas). */
function band(g: G, y0: number, y1: number, c0: string, c1: string) {
  const gr = g.createLinearGradient?.(0, y0, 0, y1);
  if (gr) {
    gr.addColorStop(0, c0);
    gr.addColorStop(1, c1);
    g.fillStyle = gr;
  } else g.fillStyle = c0;
  g.fillRect(0, y0, 640, y1 - y0);
}

/** A pill of dark glass behind a line of text, so the words stay readable over the scene. */
export function tag(g: G, s: string, x: number, y: number, align: 'left' | 'right' | 'center', color: string = PAL.yellow, size = 12) {
  const w = s.length * (size * 0.56) + 10;
  const x0 = align === 'left' ? x - 5 : align === 'right' ? x - w + 5 : x - w / 2;
  g.fillStyle = 'rgba(6,10,36,0.82)';
  g.fillRect(x0, y - size - 1, w, size + 6);
  text(g, s, x, y, color, size, align);
}

// ---- the path of the trail ---------------------------------------------------------------------------------------------------------------------------------

const SEG = TRAIL.slice(1).map((p, i) => {
  const a = TRAIL[i];
  return { a, p, len: Math.hypot(p[0] - a[0], p[1] - a[1]) };
});
export const TRAIL_LEN = SEG.reduce((s, q) => s + q.len, 0);
/** The point `s` px along the trail from its right end; before the start the path continues off screen, after the door it continues the last stretch. */
export function pathAt(s: number): [number, number] {
  if (s <= 0) {
    const q = SEG[0];
    return [q.a[0] + ((q.a[0] - q.p[0]) / q.len) * -s, q.a[1] + ((q.a[1] - q.p[1]) / q.len) * -s];
  }
  let left = s;
  for (const q of SEG) {
    if (left <= q.len) return [q.a[0] + ((q.p[0] - q.a[0]) * left) / q.len, q.a[1] + ((q.p[1] - q.a[1]) * left) / q.len];
    left -= q.len;
  }
  const q = SEG[SEG.length - 1];
  return [q.p[0] + ((q.p[0] - q.a[0]) / q.len) * left, q.p[1] + ((q.p[1] - q.a[1]) / q.len) * left];
}

// ---- the mountain, the snow and the weather ----------------------------------------------------------------------------------------------------------------

const SKY: [string, string][] = [['#2a1f5c', '#d9824a'], ['#0b1030', '#1d2556'], ['#11163a', '#11163a']];
const SLOPE = ['#6a6aa8', '#3c4680', '#4a5288'];
const FIELD = ['#e4e0f2', '#9fb0e0', '#aeb8d8'];
const FAR: [number, number][] = [[0, 210], [0, 150], [50, 100], [90, 140], [140, 70], [200, 130], [260, 90], [330, 140], [390, 80], [450, 125], [520, 60], [580, 110], [640, 90], [640, 210]];
const NEAR: [number, number][] = [[0, 232], [0, 190], [60, 160], [120, 192], [190, 150], [250, 188], [320, 170], [390, 200], [470, 160], [540, 195], [610, 150], [640, 170], [640, 232]];

/** The sky, the two layers of peaks, the slope, the snowfield and (round 2) the moon. Opaque, so the backdrop grid never shows. */
export function mountain(g: G, k: number) {
  const kk = Math.min(2, k);
  backdrop(g);
  band(g, 0, 232, SKY[kk][0], SKY[kk][1]);
  if (kk === 1) {
    dot(g, 560, 60, 13, '#f4f1d8');
    dot(g, 566, 56, 11, '#0f1538');
  }
  polygon(g, FAR, '#1b2350');
  polygon(g, NEAR, '#232c63');
  // snow caps on the tallest far peaks
  for (const [px, py] of [[140, 70], [520, 60], [390, 80], [260, 90]]) polygon(g, [[px - 14, py + 20], [px, py], [px + 14, py + 20], [px + 5, py + 16], [px - 4, py + 22]], 'rgba(223,230,255,0.75)');
  box(g, 0, 222, 640, 118, SLOPE[kk]);
  g.globalAlpha = 0.85;
  box(g, 0, 300, 640, 40, FIELD[kk]);
  g.globalAlpha = 1;
}

/** The stream falling from the heights into the shed's chute; `rush` thickens it during the take. */
export function stream(g: G, t: number, rush: number) {
  const w = 7 + 6 * rush;
  g.strokeStyle = 'rgba(143,214,255,0.85)';
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(330, 60);
  g.bezierCurveTo(340, 110, 322, 150, 318, 198);
  g.stroke();
  g.lineCap = 'butt';
  g.strokeStyle = 'rgba(255,255,255,0.8)';
  g.lineWidth = 2;
  g.setLineDash([6, 12]);
  g.lineDashOffset = -t * 40 * (1 + 2 * rush);
  g.beginPath();
  g.moveTo(330, 60);
  g.bezierCurveTo(340, 110, 322, 150, 318, 198);
  g.stroke();
  g.setLineDash([]);
}

export interface SnowOpts {
  /** The flakes within 120 px of this point are drawn brighter by `pulse` (level 4 miss). */
  near?: [number, number];
  pulse?: number;
}

/** Snow flakes and, in the blizzard round, wind streaks. Every position is computed from the flake's index and the clock. */
export function snow(g: G, k: number, t: number, o: SnowOpts = {}) {
  const n = k >= 2 ? 120 : 60;
  for (let i = 0; i < n; i++) {
    const x = ((i * 97 + t * 40) % 660) - 10;
    const y = ((i * 53 + t * (30 + (i % 20))) % 350) - 10;
    let a = 0.8;
    if (o.near && Math.hypot(x - o.near[0], y - o.near[1]) < 120) a = 0.35 + 0.65 * (o.pulse ?? 0);
    g.globalAlpha = a;
    dot(g, x, y, 1 + (i % 2), '#ffffff');
  }
  g.globalAlpha = 1;
  if (k >= 2) {
    for (let i = 0; i < 14; i++) {
      const y = (i * 23 + 7) % 330;
      const x0 = ((t * 220 + i * 91) % 760) - 60;
      line(g, x0, y, x0 + 60, y + 4, 'rgba(255,255,255,0.2)', 1);
    }
  }
}

// ---- the lodge and Norbu the yak ----------------------------------------------------------------------------------------------------------------------------

/** The stone lodge, its slate roof, glowing window, wooden door and prayer flags on a line to (220, 150). */
export function lodge(g: G, t: number, k: number) {
  const L = LODGE;
  box(g, L.x, L.y, L.w, L.h, '#59607f', '#3a4062');
  for (let y = L.y + 12; y < L.y + L.h; y += 16) line(g, L.x, y, L.x + L.w, y, 'rgba(30,36,70,0.55)', 1);
  for (let y = L.y + 12, r = 0; y < L.y + L.h; y += 16, r++) for (let x = L.x + (r % 2) * 14; x < L.x + L.w; x += 28) line(g, x, y, x, y + 16, 'rgba(30,36,70,0.4)', 1);
  polygon(g, [[4, 154], [24, 126], [144, 126], [164, 154]], '#2e3350');
  for (let x = 14; x < 156; x += 12) line(g, x, 134, x - 4, 152, 'rgba(10,14,40,0.45)', 1);
  box(g, 130, 108, 12, 20, '#3a4062');
  // a faint wisp of smoke from the chimney
  const u = (t % 3) / 3;
  g.globalAlpha = 0.35 * (1 - u);
  dot(g, 136 + u * 8, 104 - u * 22, 3 + u * 8, '#e8ebf6');
  g.globalAlpha = 1;
  // the window glows and flickers a little
  const fl = 0.85 + 0.15 * Math.sin(t * 7);
  g.globalAlpha = fl;
  glow(g, '#ffcf70', 12, () => box(g, 55, 224, 30, 24, '#ffd98a'));
  g.globalAlpha = 1;
  line(g, 70, 224, 70, 248, '#6b4a2a', 2);
  line(g, 55, 236, 85, 236, '#6b4a2a', 2);
  // the door
  box(g, 106, 246, 28, 54, '#6b4a2a', '#4a3320');
  line(g, 120, 246, 120, 300, '#4a3320', 1);
  dot(g, 129, 274, 1.8, '#e0a030');
  // prayer flags, whipping harder in the blizzard
  const wind = k >= 2 ? 2.2 : 0.8;
  const pts: [number, number][] = [[144, 126], [220, 150]];
  line(g, pts[0][0], pts[0][1], pts[1][0], pts[1][1], '#c9ceea', 1.2);
  const cols = ['#4de1ff', '#f4f6ff', '#ff5a5a', '#5dff9a', '#ffd23f'];
  cols.forEach((c, i) => {
    const f = (i + 0.7) / 5.4;
    const fx = pts[0][0] + (pts[1][0] - pts[0][0]) * f;
    const fy = pts[0][1] + (pts[1][1] - pts[0][1]) * f;
    const w = Math.sin(t * 6 + i * 1.3) * 3 * wind;
    polygon(g, [[fx, fy], [fx + 9 + w, fy + 3 + w * 0.4], [fx + 9 + w, fy + 12], [fx, fy + 10]], c);
  });
}

export type YakState = 'idle' | 'lift' | 'toss' | 'back' | 'low';

/** Norbu: a shaggy dark-brown yak with curved horns and a bell on a red collar. He chews, flicks his tail and sways his bell. `u` is seconds since the state began. */
export function yak(g: G, t: number, state: YakState, u: number) {
  const { x, y } = YAK;
  g.save();
  if (state === 'back') {
    g.translate(x, 0);
    g.scale(-1, 1);
    g.translate(-x, 0);
  }
  const flick = Math.sin(t * 3) * 3 + (t % 4 < 0.5 ? Math.sin(t * 20) * 3 : 0);
  g.strokeStyle = '#2a1d18';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(x - 20, y - 16);
  g.quadraticCurveTo(x - 32, y - 14 + flick * 0.4, x - 30 + flick, y - 3);
  g.stroke();
  // legs, the body and the shaggy skirt
  for (const lx of [x - 14, x - 6, x + 8, x + 16]) box(g, lx - 2.5, y - 8, 5, 8, '#2a1d18');
  g.fillStyle = '#3b2a22';
  g.beginPath();
  g.ellipse(x, y - 17, 24, 12, 0, 0, Math.PI * 2);
  g.fill();
  const skirt: [number, number][] = [[x - 22, y - 12]];
  for (let i = 0; i <= 8; i++) skirt.push([x - 22 + i * 5.5, y - 8 + (i % 2 ? 2 : -3)]);
  skirt.push([x + 22, y - 12]);
  polygon(g, skirt, '#33241d');
  // the head: lowers, lifts or tosses
  const toss = state === 'toss' ? -7 * Math.abs(Math.sin(Math.min(u, 0.9) * 8)) : 0;
  const hy = y - 17 + (state === 'low' ? 8 : state === 'lift' ? -9 : 0) + toss + Math.sin(t * 1.2) * 0.8;
  const hx = x + 28;
  g.fillStyle = '#3b2a22';
  g.beginPath();
  g.ellipse(hx, hy, 9, 7.5, 0.15, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#5a463a';
  g.beginPath();
  g.ellipse(hx + 6, hy + 2.5, 5, 3.6 + Math.abs(Math.sin(t * 7)) * 0.9, 0.15, 0, Math.PI * 2);
  g.fill();
  dot(g, hx + 2, hy - 2, 1.5, '#f4f6ff');
  dot(g, hx + 2.4, hy - 2, 0.7, INK);
  g.strokeStyle = '#e8e0c8';
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(hx - 3, hy - 6);
  g.quadraticCurveTo(hx - 8, hy - 16, hx - 2, hy - 15);
  g.stroke();
  g.beginPath();
  g.moveTo(hx + 3, hy - 6);
  g.quadraticCurveTo(hx + 7, hy - 16, hx + 12, hy - 12);
  g.stroke();
  // the red collar and the swaying bell
  g.strokeStyle = '#c0392b';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(x + 18, y - 25);
  g.quadraticCurveTo(x + 22, hy + 2, hx - 6, hy + 5);
  g.stroke();
  dot(g, hx - 6 + Math.sin(t * 3) * 2, hy + 10, 2.6, '#ffd23f');
  g.restore();
}

// ---- the turbine shed, the sluice lever and the sealed parts -------------------------------------------------------------------------------------

export interface ShedOpts {
  /** The player's frequency for the gauge needle. */
  f: number;
  /** The supply plate (levels 1 and 2), or undefined. */
  supply?: number;
  /** 0 idle, 1 take: only the fixed take speed, never the player's frequency. */
  fast: number;
}

export function shed(g: G, t: number, o: ShedOpts) {
  const S = SHED;
  box(g, S.x, S.y, S.w, S.h, '#4a5078', '#2a2f55');
  for (let y = S.y + 14; y < S.y + S.h; y += 14) line(g, S.x, y, S.x + S.w, y, 'rgba(20,24,60,0.5)', 1);
  box(g, S.x - 6, S.y - 8, S.w + 12, 10, '#2a2f55', '#161a2e');
  // the chute above the wheel
  polygon(g, [[310, 198], [326, 198], [322, 238], [306, 238]], 'rgba(143,214,255,0.8)');
  // the opening with the wheel behind it
  box(g, 280, 238, 58, 52, '#0a0d24', '#7b82a6');
  const tw = TURBINE;
  const spin = t * (1.5 + 8 * o.fast);
  g.strokeStyle = '#8d93b5';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(tw.x, tw.y, tw.r, 0, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < 8; i++) {
    const a = spin + (i * Math.PI) / 4;
    line(g, tw.x, tw.y, tw.x + Math.cos(a) * tw.r, tw.y + Math.sin(a) * tw.r, '#c9ceea', 2);
    dot(g, tw.x + Math.cos(a) * tw.r, tw.y + Math.sin(a) * tw.r, 2.2, '#8fd6ff');
  }
  dot(g, tw.x, tw.y, 4, '#b08a3a');
  // the wooden door
  box(g, 262, 262, 16, 38, '#6b4a2a', '#4a3320');
  dot(g, 275, 282, 1.4, '#e0a030');
  // the regulator plate and the frequency gauge
  if (o.supply !== undefined) tag(g, `${o.supply} V`, 262, 216, 'center', PAL.white, 11);
  const G0 = GAUGE;
  dot(g, G0.x, G0.y, G0.r + 2, '#161a2e');
  dot(g, G0.x, G0.y, G0.r, '#e8ebf6');
  for (let i = 0; i <= 5; i++) {
    const a = rad(150 + (240 * i) / 5);
    line(g, G0.x + Math.cos(a) * (G0.r - 5), G0.y + Math.sin(a) * (G0.r - 5), G0.x + Math.cos(a) * (G0.r - 1), G0.y + Math.sin(a) * (G0.r - 1), INK, 1);
  }
  text(g, 'Hz', G0.x, G0.y + 10, INK, 11);
  const na = rad(150 + (240 * Math.max(0, Math.min(100, o.f))) / 100);
  line(g, G0.x, G0.y, G0.x + Math.cos(na) * (G0.r - 3), G0.y + Math.sin(na) * (G0.r - 3), '#c0201a', 2);
  dot(g, G0.x, G0.y, 2.4, INK);
}

/** The brass slot with a tick every 10 Hz (unlabelled, the two ends excepted), the shaft and the T-grip at the player's frequency. */
export function lever(g: G, f: number, lo: number, hi: number, shift = 0) {
  const S = SLUICE;
  box(g, S.x - 7, S.y1 - 8, 14, S.y0 - S.y1 + 20, '#7a5f2a', '#4a3a18');
  box(g, S.x - 2.5, S.y1 - 4, 5, S.y0 - S.y1 + 10, '#1a1408');
  for (let v = Math.ceil(lo / 10) * 10; v <= hi; v += 10) line(g, S.x + 7, leverY(v, lo, hi), S.x + 12, leverY(v, lo, hi), '#e0c070', 1.5);
  tag(g, String(lo), S.x + 18, S.y0 + 12, 'left', PAL.white, 11);
  tag(g, String(hi), S.x + 18, S.y1 + 4, 'left', PAL.white, 11);
  const y = leverY(f, lo, hi) + shift;
  line(g, S.x, S.y0 + 4, S.x, y, '#d8d2b0', 4);
  line(g, S.x - 10, y, S.x + 10, y, '#e0a030', 6);
  dot(g, S.x - 10, y, 3.5, '#e0a030');
  dot(g, S.x + 10, y, 3.5, '#e0a030');
}

function wire(g: G, pts: [number, number][]) {
  for (const [c, w] of [['#0a0d1c', 3.4], ['#6a6f8f', 1.4]] as const) {
    g.strokeStyle = c;
    g.lineWidth = w;
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
    g.stroke();
  }
}

/** The sealed choke on its post, with copper windings; its plate sits above it. */
export function choke(g: G, label: string, wires: [number, number][]) {
  const { x, y } = CHOKE_BOX;
  wire(g, wires);
  box(g, x - 3, y + 14, 6, 86, '#3a3f58');
  g.fillStyle = '#6b7390';
  rr(g, x - 18, y - 14, 36, 28, 4);
  g.fill();
  g.strokeStyle = '#8d93b5';
  g.lineWidth = 1.5;
  g.stroke();
  for (let i = 0; i < 7; i++) line(g, x - 14 + i * 4.6, y - 11, x - 12 + i * 4.6, y + 11, '#d98a3a', 2.2);
  tag(g, label, x, y - 20, 'center', PAL.white, 11);
}

/** The sealed capacitor can on the lodge wall; its plate sits above it. */
export function capCan(g: G, label: string, wires: [number, number][]) {
  const { x, y } = CAP_CAN;
  wire(g, wires);
  box(g, 154, y - 3, 4, 6, '#3a3f58');
  g.fillStyle = '#c9ceea';
  rr(g, x - 11, y - 15, 22, 30, 4);
  g.fill();
  g.strokeStyle = '#8d93b5';
  g.lineWidth = 1.5;
  g.stroke();
  box(g, x - 11, y - 4, 22, 5, '#c0392b');
  text(g, '+', x - 4, y - 6, INK, 11);
  text(g, '−', x + 5, y + 13, INK, 11);
  tag(g, label, x, y - 21, 'center', PAL.white, 11);
}

/** Level 4: the resistor dropper under lamp a, a black grille with orange elements. */
export function dropper(g: G, label: string) {
  const [x, y] = ROOF.a;
  box(g, x - 20, y + 12, 40, 26, '#10142e', '#555c7d');
  for (let i = 0; i < 6; i++) line(g, x - 15 + i * 6, y + 15, x - 15 + i * 6, y + 35, '#d98a3a', 2);
  tag(g, label, x, y + 52, 'center', PAL.white, 11);
}

/** The roof lamps' wiring in level 4: lamp a to the dropper (short), lamp b along the wall to the choke or the capacitor. */
export const roofWire = (to: [number, number]): [number, number][] => [[ROOF.b[0], ROOF.b[1]], [ROOF.b[0], 176], [to[0], 176], [to[0], to[1]]];

// ---- the trail and its lamps ------------------------------------------------------------------------------------------------------------------------------

export function trail(g: G) {
  g.strokeStyle = 'rgba(120,130,175,0.55)';
  g.lineWidth = 12;
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(TRAIL[0][0], TRAIL[0][1]);
  for (const p of TRAIL.slice(1)) g.lineTo(p[0], p[1]);
  g.stroke();
  g.strokeStyle = 'rgba(70,78,120,0.5)';
  g.lineWidth = 2;
  g.setLineDash([5, 9]);
  g.beginPath();
  g.moveTo(TRAIL[0][0], TRAIL[0][1]);
  for (const p of TRAIL.slice(1)) g.lineTo(p[0], p[1]);
  g.stroke();
  g.setLineDash([]);
}

/** A lamp post: a pole from the head down to the snow. */
export function post(g: G, x: number, y: number, down = 32) {
  box(g, x - 2, y + 4, 4, down, '#3a3f58');
  box(g, x - 5, y + 2, 10, 4, '#555c7d');
}

export interface LampSt {
  /** 0 dark, GLOW.dim or GLOW.right. */
  a: number;
  /** The glass is red (the porch beacon) or warm white. */
  red?: boolean;
  /** A flash of white (the burst). */
  flash?: number;
  /** The bulb is broken: dark glass base and shards. */
  broken?: boolean;
  /** The brighter lamp of level 4's miss is drawn larger. */
  big?: boolean;
}

export function lamp(g: G, x: number, y: number, s: LampSt) {
  const R = 7 + (s.big ? 4 : 0);
  if (s.broken) {
    dot(g, x, y + 4, 4, '#2a3050');
    for (let i = 0; i < 4; i++) polygon(g, [[x - 9 + i * 6, y + 7], [x - 6 + i * 6, y + 2 + (i % 2) * 3], [x - 4 + i * 6, y + 8]], '#b8c4e8');
    return;
  }
  dot(g, x, y, R, '#2a3050');
  g.strokeStyle = '#7b82a6';
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(x, y, R, 0, Math.PI * 2);
  g.stroke();
  if (s.a > 0) {
    const warm = s.red ? (s.a >= 1 ? '#ff6a6a' : '#a04030') : s.a >= 1 ? '#fff2cf' : '#d98a3a';
    if (s.a >= 1) {
      g.globalAlpha = 0.25;
      dot(g, x, y, 18, s.red ? '#ff6a6a' : '#fff2cf');
    }
    g.globalAlpha = s.a;
    glow(g, warm, s.a >= 1 ? 14 : 0, () => dot(g, x, y, R, warm));
    g.globalAlpha = 1;
  }
  if (s.flash && s.flash > 0) {
    g.globalAlpha = Math.min(0.45, s.flash);
    dot(g, x, y, 24, '#ffffff');
    g.globalAlpha = 1;
  }
}

// ---- the snowdrift, the party and Dolma --------------------------------------------------------------------------------------------------------------------------

/** A snowdrift; with `boots` three pairs of boots stick out of it. */
export function drift(g: G, x: number, y: number, boots: boolean, colors: string[]) {
  if (boots) {
    colors.forEach((c, i) => {
      const bx = x - 24 + i * 24;
      for (const dx of [-3, 3]) {
        line(g, bx + dx, y - 2, bx + dx + (i - 1) * 2, y - 14, c, 3);
        box(g, bx + dx - 3 + (i - 1) * 2, y - 18, 6, 5, '#3a2f2f');
      }
    });
  }
  g.fillStyle = '#f0f4ff';
  g.beginPath();
  g.ellipse(x, y + 2, 40, 12, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(160,175,225,0.45)';
  g.beginPath();
  g.ellipse(x + 8, y + 6, 30, 6, 0, 0, Math.PI * 2);
  g.fill();
}

export type PartyState = 'walk' | 'shield' | 'huddle';
export interface PartyOpts {
  pts: [number, number][];
  state: PartyState;
  colors: string[];
  /** 0 to 1: the party topples over (rotated toward the snow). */
  topple: number;
  /** The leader's headlamp beam angle offset in radians. */
  beam: number;
}

function trekker(g: G, x: number, y: number, t: number, color: string, ph: number, o: { state: PartyState; topple: number; lead: boolean; beam: number }) {
  g.save();
  g.translate(x, y);
  g.rotate(rad(6 + 84 * o.topple));
  const sw = o.state === 'walk' ? 3 * Math.sin(t * 8 + ph) : 0;
  line(g, -2, -12, -2 + sw, 0, '#2a2f55', 4);
  line(g, 2, -12, 2 - sw, 0, '#2a2f55', 4);
  box(g, -5 + sw, -2, 8, 3, '#3a2f2f');
  box(g, -3 - sw, -2, 8, 3, '#3a2f2f');
  // the backpack with its rolled mat (behind, as they face left), then the jacket
  box(g, 5, -26, 8, 14, '#3a3f58');
  g.fillStyle = '#e0e0e8';
  g.beginPath();
  g.ellipse(9, -28, 6, 2.6, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = color;
  rr(g, -7, -27, 14, 16, 3);
  g.fill();
  line(g, -7, -19, 7, -19, 'rgba(20,20,50,0.35)', 1.5);
  // the arm and the ice axe
  if (o.state === 'shield') line(g, -2, -24, -6, -31, color, 3.2);
  else {
    line(g, -2, -24, -9, -18, color, 3.2);
    line(g, -9, -3, -9, -29, '#c9ceea', 1.8);
    line(g, -12, -29, -6, -29, PAL.orange, 2);
  }
  // the helmet with its headlamp
  dot(g, -1, -31, 5.2, '#e8d9c0');
  g.fillStyle = color;
  g.beginPath();
  g.arc(-1, -32, 5.6, Math.PI, Math.PI * 2);
  g.fill();
  dot(g, -6, -32, 1.8, '#fff6c8');
  if (o.lead) {
    const a = Math.PI + o.beam;
    g.globalAlpha = 0.15;
    polygon(g, [[-6, -32], [-6 + Math.cos(a - 0.28) * 70, -32 + Math.sin(a - 0.28) * 70], [-6 + Math.cos(a + 0.28) * 70, -32 + Math.sin(a + 0.28) * 70]], '#fff6c8');
    g.globalAlpha = 1;
  }
  g.restore();
}

/** The roped party: three trekkers in a line, joined at the waist by a rope. */
export function party(g: G, t: number, o: PartyOpts) {
  g.strokeStyle = 'rgba(244,246,255,0.7)';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(o.pts[0][0], o.pts[0][1] - 16);
  for (let i = 1; i < o.pts.length; i++) {
    const [ax, ay] = o.pts[i - 1];
    const [bx, by] = o.pts[i];
    g.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) - 8, bx, by - 16);
  }
  g.stroke();
  for (let i = o.pts.length - 1; i >= 0; i--) {
    trekker(g, o.pts[i][0], o.pts[i][1], t, o.colors[i], i * 1.7, { state: o.state, topple: o.topple, lead: i === 0, beam: o.beam });
  }
}

export type DolmaMood = 'happy' | 'cheer' | 'worried' | 'startled';
export interface DolmaOpts {
  mood: DolmaMood;
  /** The body leans toward the lever by this many degrees. */
  lean: number;
  /** Where the T-grip is: her mitten holds the shaft, clamped to what she can reach. */
  gripY: number;
  /** 0 to 1: the second mitten joins the first on the lever. */
  both: number;
  /** 0 to 1: both arms up. */
  armsUp: number;
  /** Waving with the left mitten (after a win). */
  wave: boolean;
  /** The headlamp is lit. */
  lamp: boolean;
  /** Thickness of the snow cap on the hat, 0 to 3 px. */
  snow: number;
}

const SKIN = '#d9a273';
const MITT = '#9097ad';

function arm(g: G, sx: number, sy: number, hx: number, hy: number) {
  const ex = (sx + hx) / 2 + 1;
  const ey = (sy + hy) / 2 + 5;
  line(g, sx, sy, ex, ey, '#7a1f2e', 6);
  line(g, ex, ey, hx, hy, '#7a1f2e', 5.5);
  dot(g, hx, hy, 4.4, MITT);
  dot(g, hx + 2.5, hy - 2.5, 1.9, MITT);
}

/** Dolma: a long maroon chuba with a yellow sash, a fur-lined hat with ear flaps and a headlamp, a striped scarf, mittens, felt boots and a thermos on a strap. */
export function dolma(g: G, t: number, o: DolmaOpts) {
  const { x, y } = DOLMA;
  g.save();
  g.translate(x, y);
  g.rotate(rad(o.lean));
  g.translate(-x, -y);
  const bob = Math.sin(t * 2) * 0.6;
  const u = t % 4;
  const liftL = u < 0.25 ? 3 * Math.sin((u / 0.25) * Math.PI) : 0;
  const liftR = u >= 0.25 && u < 0.5 ? 3 * Math.sin(((u - 0.25) / 0.25) * Math.PI) : 0;
  // felt boots and legs
  box(g, x - 13, y - 8 - liftL, 12, 8, '#55515d');
  box(g, x + 1, y - 8 - liftR, 13, 8, '#55515d');
  line(g, x - 13, y - liftL, x - 1, y - liftL, '#2a2630', 1.5);
  line(g, x + 1, y - liftR, x + 14, y - liftR, '#2a2630', 1.5);
  box(g, x - 8, y - 20, 7, 12, '#2a2f45');
  box(g, x + 1, y - 20, 7, 12, '#2a2f45');
  // the thermos behind her back
  box(g, x - 19, y - 48 + bob, 7, 22, '#9aa0bd', '#555c7d');
  box(g, x - 19, y - 51 + bob, 7, 4, '#c0392b');
  // the coat, its sash and the strap across it
  polygon(g, [[x - 12, y - 52 + bob], [x + 12, y - 52 + bob], [x + 16, y - 12], [x - 16, y - 12]], '#7a1f2e');
  line(g, x, y - 46, x, y - 14, 'rgba(20,6,12,0.4)', 1.2);
  box(g, x - 14, y - 34, 28, 4, '#ffd23f');
  line(g, x - 11, y - 50 + bob, x + 9, y - 32, '#3a2f2f', 2);
  // the striped scarf with its fluttering tail
  box(g, x - 8, y - 55 + bob, 5, 5, '#ff5a5a');
  box(g, x - 3, y - 55 + bob, 6, 5, '#ffd23f');
  box(g, x + 3, y - 55 + bob, 5, 5, '#5dff9a');
  box(g, x - 10, y - 52 + bob, 4, 12 + 3 * Math.sin(t * 5), '#ff5a5a');
  // arms
  const sy = y - 48 + bob;
  const hxr = 250;
  const reach = Math.max(264, Math.min(298, o.gripY));
  const up = ease(o.armsUp);
  const rx = hxr + (x + 17 - hxr) * up;
  const ry = reach + (y - 90 - reach) * up;
  const left = ((t + 3) % 6 < 0.9) && o.mood === 'happy';
  let lx = x - 16;
  let ly = y - 26;
  if (up > 0 || o.wave) {
    lx = x - 18;
    ly = y - 88 + (o.wave ? Math.sin(t * 10) * 5 : 0);
  } else if (o.both > 0) {
    lx = hxr - 4;
    ly = reach + 7;
  } else if (left) {
    lx = x - 3;
    ly = y - 60;
  }
  arm(g, x - 11, sy, lx, ly);
  arm(g, x + 11, sy, rx, ry);
  // the head
  const hx = x;
  const startled = o.mood === 'startled';
  const hy = y - 63 + bob;
  const hatDy = startled ? -4 : 0;
  dot(g, hx, hy, 9, SKIN);
  if (startled) {
    for (const s of [-1, 1]) {
      dot(g, hx + s * 3.8, hy - 0.5, 3.2, '#ffffff');
      dot(g, hx + s * 3.8, hy - 0.5, 1.1, INK);
    }
    g.strokeStyle = INK;
    g.lineWidth = 1.3;
    g.beginPath();
    g.arc(hx, hy + 5, 1.8, 0, Math.PI * 2);
    g.stroke();
  } else {
    face(g, hx, hy, 9, o.mood === 'cheer' ? 'cheer' : o.mood === 'worried' ? 'worried' : 'happy', t);
  }
  // the fur-lined hat, its ear flaps, the headlamp and the snow cap
  g.fillStyle = '#6b4a3a';
  g.beginPath();
  g.arc(hx, hy - 2 + hatDy, 10.5, Math.PI, Math.PI * 2);
  g.fill();
  box(g, hx - 11, hy - 5 + hatDy, 22, 4, '#d8c8a8');
  box(g, hx - 12, hy - 4, 5, 14, '#6b4a3a');
  box(g, hx + 7, hy - 4, 5, 14, '#6b4a3a');
  box(g, hx - 12, hy + 7, 5, 3, '#d8c8a8');
  box(g, hx + 7, hy + 7, 5, 3, '#d8c8a8');
  if (o.lamp) glow(g, '#fff6c8', 12, () => dot(g, hx, hy - 8 + hatDy, 3.2, '#fff6c8'));
  else dot(g, hx, hy - 8 + hatDy, 2.6, '#c9c4a0');
  if (o.snow > 0) {
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(hx, hy - 12 + hatDy, 7, o.snow, 0, 0, Math.PI * 2);
    g.fill();
  }
  // breath mist every 2 s
  const bu = t % 2;
  if (bu < 1) {
    g.globalAlpha = 0.5 * (1 - bu);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(hx + 11 + bu * 10, hy + 3 - bu * 12, 3 + bu * 3, 2 + bu * 2, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  }
  if (startled) text(g, '!', hx, hy - 20, PAL.yellow, 17);
  g.restore();
}

// ---- the level 4 inset ------------------------------------------------------------------------------------------------------------------------------------------

/** The two lamp-brightness curves sin² and cos² and their flat sum, drawn only after a win in level 4. */
export function inset(g: G) {
  const { x, y, w, h } = INSET;
  g.fillStyle = 'rgba(6,10,36,0.9)';
  g.fillRect(x, y, w, h);
  g.strokeStyle = PAL.dim;
  g.lineWidth = 1;
  g.strokeRect(x, y, w, h);
  const top = y + 6;
  const hgt = 26;
  const curve = (fn: (a: number) => number, c: string) => {
    g.strokeStyle = c;
    g.lineWidth = 1.6;
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const px = x + 8 + (i / 40) * (w - 16);
      const py = top + hgt - fn(a) * hgt;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
  };
  curve((a) => Math.sin(a) ** 2, PAL.cyan);
  curve((a) => Math.cos(a) ** 2, PAL.pink);
  line(g, x + 8, top, x + w - 8, top, PAL.yellow, 1.6);
  text(g, 'sin² + cos² = 1', x + w / 2, y + h - 6, PAL.white, 11);
}

/** The sky tint of a round's weather is drawn by `mountain`; this is the matching colours of the trekkers' jackets. */
export const JACKETS = [
  ['#ff9b3d', '#4de1ff', '#ffd23f'],
  ['#5dff9a', '#ff4d8d', '#f4f6ff'],
  ['#ff5a5a', '#ffd23f', '#4de1ff'],
];
