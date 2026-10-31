// Drawing for "Main Stage Soundcheck": the open-air festival at three times of day, Mehr at her mixing desk, the crossover rack with its vertical fader, the speaker
// stack, Neon Tiger in the DJ booth and the crowd. Nothing here knows the answer of a round: it draws the poses, states and fixed effects it is handed.
// No Math.random: every wobble comes from the clock (jit).
import { PAL } from '@core/arcade';
import { backdrop } from '@core/mathkit';
import { glow, line, text } from '@core/neon';

export type G = CanvasRenderingContext2D;
const TWO_PI = 2 * Math.PI;

export const DESK = { x: 10, y: 236, w: 186, h: 104 }; // Mehr's mixing desk (top edge y = 236)
export const RACK = { x: 208, y: 112, w: 140, h: 196 }; // the crossover rack on its flight case
export const FADER = { x: 330, y0: 300, y1: 150 }; // the vertical fader slot on the rack: y0 is the dial minimum
export const faderY = (val: number, lo: number, hi: number) => FADER.y0 - ((val - lo) / (hi - lo)) * (FADER.y0 - FADER.y1);
export const STACK = { x: 392, y: 96, w: 64, h: 176 }; // the speaker stack
export const TWEETER = { x: 424, y: 116 };
export const MIDDRV = { x: 424, y: 160 };
export const WOOFER = { x: 424, y: 228 };
export const BOOTH = { x: 500, y: 150 }; // Neon Tiger's DJ booth
export const TIGER = { x: 545, y: 168 }; // where the headliner stands: feet on the booth's riser, behind the turntables
// The brief gives the LCD 160 px, but the DROP button sits at x 164: the LCD is 130 px wide so the two never overlap.
export const LCD = { x: 24, y: 246, w: 130, h: 18 };
export const DROP = { x: 164, y: 250, r: 8 };
export const AMP = { x: 214, y: 304, w: 128, h: 26 };
export const MEHR = { x: 96, y: 184 }; // head centre

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (u: number) => clamp01(u) * clamp01(u) * (3 - 2 * clamp01(u));
const frac = (v: number) => v - Math.floor(v);
/** A repeatable wobble in −0.5 to 0.5 from a number. */
export const jit = (n: number) => frac(Math.sin(n * 12.9898) * 43758.5453) - 0.5;
export const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
const INK = '#1b1030';
const SKIN = '#c98f65';

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
  g.arc(x, y, r, 0, TWO_PI);
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

/** The round's goal on a dark pill at the top of the scene, from round start until Fire. */
export function goalPill(g: G, s: string) {
  g.fillStyle = 'rgba(6,10,36,0.8)';
  g.fillRect(170, 12, 300, 20);
  text(g, s, 320, 27, PAL.white, 13);
}

// ---- the sky, the field and the stage ------------------------------------------------------------------------------------------------------------------------

const SKY: [string, string][] = [['#3a3f7a', '#f2a65a'], ['#0b1030', '#1d2556'], ['#1a0b3a', '#3a1670']];
export const SONG = ['SONG 1', 'SONG 2', 'HEADLINER'];

/** The sky at the time of day of round k (sunset, night, the headline set), the distant tents and the field. */
export function sky(g: G, k: number, t: number) {
  backdrop(g);
  const kk = Math.min(2, k);
  band(g, 0, 270, SKY[kk][0], SKY[kk][1]);
  if (kk === 0) {
    dot(g, 150, 214, 26, '#ffd9a0');
    dot(g, 150, 214, 18, '#fff1cf');
    for (let i = 0; i < 3; i++) box(g, 30 + i * 70 + ((t * 4) % 40), 100 + i * 14, 38, 5, 'rgba(255,200,150,0.45)');
  } else {
    for (let i = 0; i < 26; i++) {
      const x = 8 + ((i * 97) % 620);
      const y = 8 + ((i * 53) % 150);
      dot(g, x, y, i % 4 === 0 ? 1.6 : 1, `rgba(255,255,255,${(0.55 + 0.4 * Math.sin(t * 2 + i)).toFixed(2)})`);
    }
    if (kk === 1) {
      dot(g, 60, 52, 12, '#f4f1de');
      dot(g, 65, 49, 11, SKY[1][0]);
    }
  }
  // far tents and bunting
  const tentC = ['#2a2250', '#141a44', '#1a1040'][kk];
  for (const [x, w, h] of [[0, 90, 50], [60, 80, 36], [140, 70, 42]] as const) polygon(g, [[x, 240], [x + w / 2, 240 - h], [x + w, 240]], tentC);
  line(g, 0, 150, 200, 166, 'rgba(255,255,255,0.4)', 1);
  for (let i = 0; i < 9; i++) {
    const x = i * 22 + 4;
    const y = 150 + (x / 200) * 16 + 2;
    polygon(g, [[x, y], [x + 8, y], [x + 4, y + 8]], [PAL.pink, PAL.yellow, PAL.cyan][i % 3]);
  }
  // the field in front of the stage
  box(g, 0, 266, 640, 74, ['#2a2d2a', '#0d1126', '#140c30'][kk]);
}

export interface StageOpts {
  k: number;
  /** The stage lights flash once: their beams at alpha 0.4. */
  flash: boolean;
  /** Fireworks above the stage (the headline round, idle scene only). */
  fireworks: boolean;
}

/** The stage: the deck, the roof truss with four moving-head lights, the LED screen with its song title, the DJ riser and the green lasers at night. */
export function stage(g: G, t: number, o: StageOpts) {
  const kk = Math.min(2, o.k);
  box(g, 360, 270, 280, 14, '#23263d');
  line(g, 360, 270, 640, 270, '#3b4166', 2);
  // fireworks
  if (o.fireworks) {
    const idx = Math.floor(t / 0.5);
    for (const back of [0, 1, 2]) {
      const n = idx - back;
      const age = t - n * 0.5;
      if (age > 0.9 || n < 0) continue;
      const cx = 260 + (jit(n * 3 + 1) + 0.5) * 340;
      const cy = 58 + (jit(n * 3 + 2) + 0.5) * 36;
      const col = [PAL.yellow, PAL.pink, PAL.cyan, PAL.green][((n % 4) + 4) % 4];
      const a = clamp01(1 - age / 0.9);
      g.globalAlpha = a;
      for (let j = 0; j < 12; j++) {
        const ang = (j / 12) * TWO_PI;
        const r0 = 4 + age * 22;
        line(g, cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0, cx + Math.cos(ang) * (r0 + 5), cy + Math.sin(ang) * (r0 + 5), col, 2);
      }
      g.globalAlpha = 1;
    }
  }
  // the LED screen with a slowly turning abstract pattern and the song title
  box(g, 482, 66, 146, 58, '#070a1c', '#555c7d');
  for (let i = 0; i < 6; i++) {
    const ang = t * 0.4 + (i * Math.PI) / 6;
    line(g, 555 + Math.cos(ang) * 30, 93 + Math.sin(ang) * 18, 555 - Math.cos(ang) * 30, 93 - Math.sin(ang) * 18, [PAL.pink, PAL.cyan, PAL.yellow][i % 3], 2);
  }
  dot(g, 555, 93, 5 + Math.sin(t * 2), 'rgba(255,255,255,0.8)');
  text(g, SONG[kk], 555, 120, PAL.white, 11);
  // the DJ riser (scaffold legs) and the booth
  box(g, 490, 182, 110, 4, '#2a2d44');
  for (let i = 0; i < 6; i++) line(g, 492 + i * 21, 186, 492 + i * 21, 270, '#3b4166', 2);
  line(g, 492, 190, 596, 270, '#3b4166', 1);
  line(g, 596, 190, 492, 270, '#3b4166', 1);
  // the roof truss with the moving-head lights
  box(g, 370, 40, 270, 3, '#9aa0bd');
  box(g, 370, 57, 270, 3, '#9aa0bd');
  for (let x = 370; x < 640; x += 14) line(g, x, 43, x + 7, 57, '#6a6f8f', 1.5);
  for (let x = 377; x < 640; x += 14) line(g, x, 57, x + 7, 43, '#6a6f8f', 1.5);
  const beam = ['rgba(255,214,140,', 'rgba(150,200,255,', 'rgba(255,120,200,'][kk];
  for (let i = 0; i < 4; i++) {
    const x = 400 + i * 70;
    const tx = x + Math.sin(t * 0.6 + i * 1.7) * 70;
    polygon(g, [[x - 3, 66], [x + 3, 66], [tx + 26, 262], [tx - 26, 262]], `${beam}${o.flash ? 0.4 : 0.12})`);
    box(g, x - 7, 60, 14, 8, '#333854');
    dot(g, x, 70, 4, o.flash ? '#ffffff' : '#555c7d');
  }
  if (kk === 1) {
    for (let i = 0; i < 7; i++) {
      const ang = 0.5 + (i / 6) * 1.2 + Math.sin(t * 0.8) * 0.15;
      line(g, 500, 130, 500 - Math.cos(ang) * 330, 130 + Math.sin(ang) * 330, 'rgba(93,255,154,0.4)', 1.5);
    }
  }
}

// ---- Neon Tiger ----------------------------------------------------------------------------------------------------------------------------------------------

export type TigerState = 'idle' | 'fire' | 'win' | 'miss';

/** Neon Tiger, the headliner: a tiger mask with glowing whiskers, a sleeveless jacket and two turntables; scratches a record, raises a hand on fire, both hands up on a win, shrugs and points at Mehr's desk on a miss. */
export function tiger(g: G, t: number, state: TigerState, u: number) {
  const { x } = TIGER;
  const by = TIGER.y;
  const bob = Math.sin(t * TWO_PI * 2) * 1.2;
  const shrug = state === 'miss' ? 3 * ease(u / 0.2) : 0;
  // torso and sleeveless jacket
  polygon(g, [[x - 14, by - 26 + bob + shrug], [x + 14, by - 26 + bob + shrug], [x + 12, by], [x - 12, by]], '#1b1b2e');
  line(g, x - 14, by - 26 + bob + shrug, x - 12, by, PAL.yellow, 2);
  line(g, x + 14, by - 26 + bob + shrug, x + 12, by, PAL.yellow, 2);
  line(g, x, by - 24 + bob + shrug, x, by, 'rgba(255,210,63,0.5)', 1);
  const sy = by - 22 + bob + shrug;
  const arm = (sx: number, hx: number, hy: number, bend: number) => {
    const ex = (sx + hx) / 2 + bend;
    const ey = (sy + hy) / 2 + 5;
    line(g, sx, sy, ex, ey, '#e88a2a', 5);
    line(g, ex, ey, hx, hy, '#e88a2a', 4.5);
    line(g, ex - 2, ey, ex + 2, ey + 2, INK, 1);
    dot(g, hx, hy, 3.5, '#e88a2a');
  };
  const scratch = Math.sin(t * 7) * 6;
  if (state === 'win') {
    arm(x - 13, x - 24, by - 58 - 3 * Math.abs(Math.sin(u * 8)), -3);
    arm(x + 13, x + 24, by - 58 - 3 * Math.abs(Math.sin(u * 8 + 1)), 3);
  } else if (state === 'miss') {
    arm(x - 13, x - 52, by + 4, -4); // points at Mehr's desk
    arm(x + 13, x + 22, by - 18 + shrug, 4);
  } else if (state === 'fire') {
    arm(x - 13, x - 22, by - 52 + 2 * Math.sin(u * 14), -3); // one hand up
    arm(x + 13, x + 22 + scratch * 0.3, by + 4, 3);
  } else {
    arm(x - 13, x - 22, by + 4, -2);
    arm(x + 13, x + 22 + scratch, by + 4, 2);
  }
  // the head: tiger mask with stripes, ears, muzzle and glowing whiskers
  const hy = by - 36 + bob + shrug * 0.5;
  polygon(g, [[x - 10, hy - 8], [x - 6, hy - 18], [x - 2, hy - 10]], '#e88a2a');
  polygon(g, [[x + 10, hy - 8], [x + 6, hy - 18], [x + 2, hy - 10]], '#e88a2a');
  dot(g, x, hy, 11, '#e88a2a');
  for (const s of [-1, 1]) {
    line(g, x + s * 11, hy - 3, x + s * 6, hy - 1, INK, 2);
    line(g, x + s * 11, hy + 2, x + s * 6, hy + 2, INK, 2);
  }
  line(g, x, hy - 11, x, hy - 5, INK, 2);
  box(g, x - 6, hy + 1, 12, 7, '#fff3d6');
  dot(g, x, hy + 2, 1.6, INK);
  const cheer = state === 'win';
  for (const s of [-1, 1]) {
    if (cheer) {
      g.strokeStyle = PAL.yellow;
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(x + s * 4.5, hy - 2, 2, Math.PI, TWO_PI);
      g.stroke();
    } else {
      dot(g, x + s * 4.5, hy - 2, 2, PAL.yellow);
      dot(g, x + s * 4.5, hy - 2, 0.8, INK);
    }
  }
  glow(g, PAL.yellow, 8, () => {
    for (const s of [-1, 1]) for (const dy of [-1, 2]) line(g, x + s * 6, hy + 4 + dy, x + s * 20, hy + 2 + dy * 2, PAL.yellow, 1.2);
  });
  // the booth: table, two turntables, a mixer
  box(g, BOOTH.x, BOOTH.y + 18, 90, 14, '#2a2d44', '#555c7d');
  for (const cx of [BOOTH.x + 22, BOOTH.x + 68]) {
    g.fillStyle = '#10121f';
    g.beginPath();
    g.ellipse(cx, BOOTH.y + 20, 17, 5, 0, 0, TWO_PI);
    g.fill();
    const a = t * 5;
    line(g, cx, BOOTH.y + 20, cx + Math.cos(a) * 12, BOOTH.y + 20 + Math.sin(a) * 3.5, PAL.pink, 1.5);
  }
  box(g, BOOTH.x + 38, BOOTH.y + 15, 14, 8, '#10121f', PAL.cyan);
}

// ---- the speaker stack ---------------------------------------------------------------------------------------------------------------------------------------

export interface StackOpts {
  /** The drivers that pump this frame, with their displacement in px (±3 at 4 Hz). */
  pump: { tweeter: number; mid: number; woofer: number };
  led: string;
  /** Show the cracked dome of the tweeter or the cracked cone of the mid driver. */
  crack: 'tweeter' | 'mid' | null;
  /** Seconds since the pop (smoke rises from it), or −1. */
  smoke: number;
  /** The woofer's forward jump in px. */
  jump: number;
  /** The whole stack shakes by this many px. */
  shake: number;
}

function cone(g: G, x: number, y: number, r: number, push: number, t: number, id: number) {
  const tw = Math.sin(t * 9 + id * 2) * 0.5; // the cones twitch to the background music
  dot(g, x, y, r + 4, '#0a0a12');
  dot(g, x, y, r + 1.5, '#3a3f58');
  dot(g, x + push * 0.3, y, r, '#1c1d2e');
  g.strokeStyle = '#555c7d';
  g.lineWidth = 1.2;
  for (const f of [0.75, 0.5]) {
    g.beginPath();
    g.arc(x + push * 0.3, y, r * f, 0, TWO_PI);
    g.stroke();
  }
  dot(g, x + push + tw, y, r * 0.3, '#5a5f7a');
  dot(g, x + push + tw - 1, y - 1, r * 0.1, '#c5cae6');
}

/** The speaker stack: a black cabinet with a tweeter horn, a mid driver and a woofer, each with a dust cap and a surround ring, and a thin LED strip down its side. */
export function stack(g: G, t: number, o: StackOpts) {
  const { x, y, w, h } = STACK;
  g.save();
  if (o.shake) g.translate(Math.sin(t * 90) * o.shake, 0);
  rr(g, x, y, w, h, 5);
  g.fillStyle = '#0d0e18';
  g.fill();
  g.strokeStyle = '#2a2d44';
  g.lineWidth = 2;
  g.stroke();
  line(g, x + 6, y + 4, x + 6, y + h - 4, 'rgba(255,255,255,0.06)', 2);
  // the LED strip down the side
  glow(g, o.led, 8, () => box(g, x + 3, y + 8, 3, h - 16, o.led));
  // the tweeter: a small flared horn
  const tp = o.pump.tweeter;
  polygon(g, [[x + 22, y + 12], [x + 42, y + 12], [x + 50, y + 30], [x + 14, y + 30]], '#2a2d44');
  g.fillStyle = '#10121f';
  g.beginPath();
  g.ellipse(x + 32, y + 21 + tp * 0.3, 10, 6, 0, 0, TWO_PI);
  g.fill();
  dot(g, x + 32, y + 21 + tp * 0.3, 3, '#8f9bd6');
  if (o.crack === 'tweeter') {
    g.strokeStyle = PAL.white;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(x + 27, y + 16);
    g.lineTo(x + 31, y + 21);
    g.lineTo(x + 29, y + 24);
    g.lineTo(x + 35, y + 27);
    g.stroke();
  }
  cone(g, MIDDRV.x, MIDDRV.y, 15, o.pump.mid, t, 1);
  if (o.crack === 'mid') {
    g.strokeStyle = PAL.white;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(MIDDRV.x - 8, MIDDRV.y - 9);
    g.lineTo(MIDDRV.x - 2, MIDDRV.y - 2);
    g.lineTo(MIDDRV.x - 5, MIDDRV.y + 3);
    g.lineTo(MIDDRV.x + 6, MIDDRV.y + 10);
    g.stroke();
  }
  cone(g, WOOFER.x, WOOFER.y, 26, o.pump.woofer + o.jump, t, 2);
  // smoke from the burnt-out driver
  if (o.smoke >= 0 && o.smoke < 1.8) {
    const p = o.crack === 'mid' ? MIDDRV : { x: TWEETER.x, y: TWEETER.y + 4 };
    for (let i = 0; i < 6; i++) {
      const age = o.smoke - i * 0.12;
      if (age < 0) continue;
      g.globalAlpha = clamp01(0.55 * (1 - age / 1.6));
      dot(g, p.x + Math.sin(age * 3 + i) * 5 + i * 1.5, p.y - age * 30, 4 + age * 4, '#8a8d9c');
      g.globalAlpha = 1;
    }
  }
  g.restore();
}

/** Sound rings from a driver: three arcs of growing radius in flight, at a fixed strength; jagged for a distorted sound. */
export function rings(g: G, cx: number, cy: number, color: string, alpha: number, u: number, o: { jagged?: boolean; max?: number } = {}) {
  const max = o.max ?? 78;
  for (let i = 0; i < 3; i++) {
    const r = 8 + ((u * 70 + i * (max / 3)) % max);
    let a = alpha;
    if (o.max) a = alpha * clamp01((o.max - r) / 20); // the hollow rings fade out where they meet, at a fixed radius
    if (a <= 0.02) continue;
    g.globalAlpha = a;
    g.strokeStyle = color;
    g.lineWidth = 3;
    g.beginPath();
    for (let j = 0; j <= 14; j++) {
      const ang = -1.1 + (2.2 * j) / 14;
      const rj = o.jagged ? r + (j % 2 ? 3 : -3) : r;
      const px = cx + Math.cos(ang) * rj;
      const py = cy + Math.sin(ang) * rj;
      if (j === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
    g.globalAlpha = 1;
  }
}

// ---- the crowd -----------------------------------------------------------------------------------------------------------------------------------------------

export type CrowdState = 'idle' | 'jump' | 'still' | 'ears' | 'look';
const STICK = [PAL.green, PAL.pink, PAL.cyan];

/** The crowd: 24 silhouettes in three rows, with raised hands and glow sticks (phone torches in the headline round); half of them in round 1. */
export function crowd(g: G, t: number, k: number, state: CrowdState) {
  const kk = Math.min(2, k);
  const body = ['#2a1d30', '#141838', '#0f0a28'];
  for (let i = 0; i < 24; i++) {
    if (kk === 0 && i % 2 === 1) continue;
    const row = Math.floor(i / 8);
    const colN = i % 8;
    const sc = [0.85, 1, 1.15][row];
    const x = 176 + colN * 60 + (row === 1 ? 30 : row === 2 ? 12 : 0) + jit(i) * 10;
    const hy0 = [292, 310, 328][row];
    const sway = state === 'idle' || state === 'look' ? Math.sin(t * 2 + i) * 2 : 0;
    const dy = state === 'jump' ? -Math.abs(Math.sin(t * TWO_PI * 2 + i * 0.7)) * 6 : 0;
    const turn = state === 'look' ? (i % 2 ? -3 : 3) : 0;
    const hy = hy0 + dy;
    const cx = x + sway;
    const shade = row === 0 ? body[kk] : row === 1 ? '#0c0f26' : '#080a1c';
    const stick = STICK[i % 3];
    const arms = (kind: 'up' | 'wave' | 'ears') => {
      for (const s of [-1, 1]) {
        if (kind === 'ears') {
          line(g, cx + s * 11 * sc, hy + 12 * sc, cx + s * 9 * sc, hy + 2 * sc, shade, 3);
          dot(g, cx + s * 9 * sc, hy + 1 * sc, 3.2 * sc, shade);
        } else if (kind === 'up' || s === 1) {
          const wv = kind === 'wave' ? Math.sin(t * 5 + i) * 3 : 0;
          const hx = cx + s * 15 * sc + wv;
          const hh = hy - 17 * sc;
          line(g, cx + s * 11 * sc, hy + 11 * sc, hx, hh, shade, 3);
          if (kk === 2 && i % 3 === 1) {
            box(g, hx - 2, hh - 9, 5, 8, '#cfd8ff');
            glow(g, '#ffffff', 6, () => dot(g, hx + 0.5, hh - 5, 1.6, '#ffffff'));
          } else if (i % 2 === 0 || kind === 'wave') {
            line(g, hx, hh, hx + wv * 0.3, hh - 11, stick, 3);
          }
        }
      }
    };
    if (state === 'jump') arms('up');
    else if (state === 'ears') arms('ears');
    else if (state === 'idle' && i % 3 !== 2) arms('wave');
    g.fillStyle = shade;
    g.beginPath();
    g.ellipse(cx, hy + 15 * sc, 15 * sc, 11 * sc, 0, 0, TWO_PI);
    g.fill();
    dot(g, cx + turn, hy, 8 * sc, shade);
    // a rim of stage light on the head and shoulders
    g.strokeStyle = ['rgba(255,190,120,0.5)', 'rgba(120,160,255,0.35)', 'rgba(255,100,200,0.35)'][kk];
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(cx + turn, hy, 8 * sc, Math.PI * 1.1, Math.PI * 1.9);
    g.stroke();
    if (state === 'look') dot(g, cx + turn * 2.2, hy + 1, 1.4 * sc, 'rgba(255,255,255,0.7)');
  }
}

// ---- the desk and Mehr ---------------------------------------------------------------------------------------------------------------------------------------

export interface DeskOpts {
  lcd: string;
  lcdColor: string;
  /** Whether the live text is drawn (green or yellow) or the dim dashes. */
  live: boolean;
  /** 0 to 1: the DROP button sinks 3 px. */
  drop: number;
}

/** The mixing desk seen from behind: rows of small knobs, the big red DROP button and the meter bridge (the helper LCD). */
export function desk(g: G, o: DeskOpts) {
  const { x, y, w, h } = DESK;
  box(g, x, y, w, 10, '#4a4f72');
  box(g, x, y + 10, w, h - 10, '#23263d', '#555c7d');
  // the meter bridge
  box(g, LCD.x, LCD.y, LCD.w, LCD.h, '#02060a', '#555c7d');
  text(g, o.lcd, LCD.x + LCD.w / 2, LCD.y + 13, o.live ? o.lcdColor : PAL.dim, 12);
  // rows of knobs and small sliders
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 9; i++) {
      const kx = x + 14 + i * 19;
      const ky = y + 50 + row * 20;
      dot(g, kx, ky, 5, '#10121f');
      dot(g, kx, ky, 3.4, ['#c0392b', '#2e86c1', '#d4ac0d'][(i + row) % 3]);
      const a = -2 + ((i * 7 + row * 3) % 5) * 0.9;
      line(g, kx, ky, kx + Math.cos(a) * 3.4, ky + Math.sin(a) * 3.4, '#ffffff', 1);
    }
  }
  for (let i = 0; i < 4; i++) {
    const sx = x + 120 + i * 14;
    line(g, sx, y + 20, sx, y + 40, '#10121f', 3);
    box(g, sx - 4, y + 24 + ((i * 5) % 12), 8, 4, '#c5cae6');
  }
  // the big red DROP button
  dot(g, DROP.x, DROP.y + 3, DROP.r + 2, '#6a0f12');
  dot(g, DROP.x, DROP.y + 3 * o.drop, DROP.r, o.drop > 0.5 ? '#c0282d' : '#ff3b3b');
  dot(g, DROP.x - 2, DROP.y - 2 + 3 * o.drop, 2, 'rgba(255,255,255,0.5)');
  text(g, 'DROP', DROP.x, DROP.y + 22, PAL.white, 11);
}

export type MehrMood = 'happy' | 'cheer' | 'worried' | 'frazzled';
export interface MehrOpts {
  mood: MehrMood;
  /** 0 to 1: the right fist is on the DROP button. */
  slam: number;
  /** 0 to 1: both fists up. */
  fists: number;
}

function sleeve(g: G, sx: number, sy: number, hx: number, hy: number, tap: number) {
  const ex = (sx + hx) / 2 + (sx < MEHR.x ? -3 : 3);
  const ey = (sy + hy) / 2 + 6;
  line(g, sx, sy, ex, ey, '#14151f', 7);
  line(g, ex, ey, hx, hy, SKIN, 5);
  dot(g, hx, hy, 4.2, '#2a2d3a'); // a fingerless glove
  dot(g, hx - 2.2, hy - 4 + tap, 1.3, SKIN);
  dot(g, hx + 1.2, hy - 4.4 - tap, 1.3, SKIN);
}

/** Mehr: a sound engineer behind the desk, seen from the waist up, with over-ear headphones, a backwards cap, a printed black T-shirt, a lanyard pass, fingerless gloves and a small torch. */
export function mehr(g: G, t: number, o: MehrOpts) {
  const x = MEHR.x;
  const bob = Math.sin(t * TWO_PI * 2); // nods to the beat: 2 px at 2 Hz
  const up = ease(o.fists);
  const hop = o.mood === 'cheer' ? Math.abs(Math.sin(t * TWO_PI * 2)) * 4 : 0;
  const hy = MEHR.y + bob - hop * 0.5;
  // the body: a black T-shirt with a white sound-wave print
  polygon(g, [[x - 22, 210 + bob * 0.4], [x + 22, 210 + bob * 0.4], [x + 18, 238], [x - 18, 238]], '#14151f');
  for (let i = 0; i < 7; i++) {
    const hgt = 3 + ((i * 5) % 7);
    line(g, x - 12 + i * 4, 222 - hgt / 2, x - 12 + i * 4, 222 + hgt / 2, '#f4f6ff', 1.6);
  }
  // the lanyard with an access pass, and a small torch clipped to the shirt
  line(g, x - 4, 205, x, 226, '#e0b020', 1.4);
  line(g, x + 4, 205, x, 226, '#e0b020', 1.4);
  box(g, x - 7, 226, 14, 10, '#f4f6ff', '#8f9bd6');
  line(g, x - 4, 229, x + 4, 229, '#c0282d', 1.5);
  line(g, x - 4, 232, x + 2, 232, '#555c7d', 1);
  box(g, x + 12, 214, 3, 8, '#9aa0bd');
  dot(g, x + 13.5, 213, 1.6, PAL.yellow);
  // the arms
  const listen = t % 4 > 3.4 && o.mood === 'happy' && up === 0;
  const tapL = Math.floor(t * 4) % 2 ? 1 : -1;
  const slam = ease(o.slam);
  const mix = (a: [number, number], b: [number, number], u: number): [number, number] => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  const lh = listen ? ([x - 17, hy + 2] as [number, number]) : mix([x - 26, 235], [x - 32, 190], up);
  const rh = mix(mix([x + 46, 235], [DROP.x - 4, DROP.y - 3], slam), [x + 32, 190], up);
  sleeve(g, x - 17, 212, lh[0], lh[1], listen ? 0 : tapL);
  sleeve(g, x + 17, 212, rh[0], rh[1], 0);
  // the head: backwards cap, over-ear headphones (the left cup on her ear, the right cup pushed back)
  const frazzled = o.mood === 'frazzled';
  if (frazzled) {
    for (let i = 0; i < 9; i++) {
      const ang = Math.PI * 1.05 + (i / 8) * Math.PI * 0.9;
      const len = 8 + (i % 3) * 3;
      line(g, x + Math.cos(ang) * 12, hy + Math.sin(ang) * 12, x + Math.cos(ang) * (12 + len), hy + Math.sin(ang) * (12 + len), '#2a1a14', 3);
    }
  }
  box(g, x - 5, hy + 10, 10, 6, SKIN);
  dot(g, x, hy, 13, SKIN);
  g.fillStyle = '#d6403a';
  g.beginPath();
  g.arc(x, hy - 1, 13.5, Math.PI, TWO_PI);
  g.fill();
  box(g, x - 22, hy - 5, 10, 4, '#a0302c');
  line(g, x - 13, hy - 1, x + 13, hy - 1, '#a0302c', 1.5);
  // headphones
  g.strokeStyle = '#1b1c2a';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(x, hy - hop * 0.5, 17, Math.PI * 1.06, Math.PI * 1.94);
  g.stroke();
  rr(g, x - 20, hy - 5 - hop * 0.5, 7, 14, 3);
  g.fillStyle = '#1b1c2a';
  g.fill();
  dot(g, x - 16.5, hy + 2 - hop * 0.5, 2, PAL.cyan);
  line(g, x + 16, hy - 7, x + 17, hy + 8, '#1b1c2a', 2.5);
  rr(g, x + 13, hy + 8, 8, 12, 3);
  g.fillStyle = '#1b1c2a';
  g.fill();
  dot(g, x + 17, hy + 14, 2, PAL.cyan);
  // the face
  const blink = t % 3 < 0.12;
  const ey = hy + 1;
  g.strokeStyle = INK;
  g.fillStyle = INK;
  g.lineWidth = 1.6;
  if (frazzled) {
    for (const s of [-1, 1]) {
      g.beginPath();
      for (let j = 0; j < 14; j++) {
        const a = j * 0.9;
        const rad = 0.6 + j * 0.28;
        const px = x + s * 5.2 + Math.cos(a) * rad;
        const py = ey + Math.sin(a) * rad;
        if (j === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.stroke();
    }
    g.fillStyle = 'rgba(90,90,100,0.6)';
    g.beginPath();
    g.ellipse(x + 8, ey + 6, 4, 2.6, 0.3, 0, TWO_PI);
    g.fill();
    g.beginPath();
    g.moveTo(x - 4, ey + 8);
    g.lineTo(x - 2, ey + 6.5);
    g.lineTo(x, ey + 8);
    g.lineTo(x + 2, ey + 6.5);
    g.lineTo(x + 4, ey + 8);
    g.stroke();
  } else if (o.mood === 'cheer') {
    for (const s of [-1, 1]) {
      g.beginPath();
      g.arc(x + s * 5, ey, 2.4, Math.PI, TWO_PI);
      g.stroke();
    }
    g.fillStyle = '#7a1f2e';
    g.beginPath();
    g.arc(x, ey + 5, 4.2, 0, Math.PI);
    g.fill();
  } else {
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(x + s * 5, ey, 1.8, blink ? 0.4 : 2, 0, 0, TWO_PI);
      g.fill();
    }
    g.beginPath();
    if (o.mood === 'worried') {
      g.arc(x, ey + 9, 3.6, Math.PI * 1.15, Math.PI * 1.85);
      line(g, x - 8, ey - 5, x - 3, ey - 7, INK, 1.4);
      line(g, x + 8, ey - 5, x + 3, ey - 7, INK, 1.4);
      dot(g, x + 15, ey - 6 + ((t * 14) % 8), 1.8, PAL.cyan);
    } else g.arc(x, ey + 3.5, 3.6, 0.2 * Math.PI, 0.8 * Math.PI);
    g.stroke();
  }
}

// ---- the rack, the amp, the fader and the cable ---------------------------------------------------------------------------------------------------------

/** The thick black cable from the rack to the stack. */
export function cable(g: G) {
  for (const [c, w] of [['#05060c', 6], ['#2a2d44', 2]] as const) {
    g.strokeStyle = c;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(348, 200);
    g.bezierCurveTo(372, 196, 372, 246, 392, 240);
    g.stroke();
  }
}

/** A small round plate with the given facts. */
function plate(g: G, s: string, y: number) {
  box(g, RACK.x + 6, y, 112, 17, '#10121f', '#8f9bd6');
  text(g, s, RACK.x + 62, y + 13, PAL.white, 11);
}

export interface RackOpts {
  kind: 'tweet' | 'mid' | 'meters' | 'woof';
  /** The text on the plates (the given facts). */
  plate: string;
  /** The fixed capacitor's plate (level 2). */
  can?: string;
  /** The player's own coil tap, 0 to 1 along the winding (level 2). */
  tap?: number;
  /** Level 3: the written soundcheck readings and the needles' fractions of the full scale (0 before Fire). */
  meters?: { vr: number; vl: number; vc: number; needle: number };
  /** Level 3: the limiter LED is lit red. */
  limiter?: boolean;
}

const SCALE = 150;
const needleAngle = (frac01: number) => ((225 - clamp01(frac01) * 270) * Math.PI) / 180;

/** The crossover rack on its flight case, with what it holds for the level, and the vertical fader's slot. */
export function rack(g: G, o: RackOpts) {
  const { x, y, w, h } = RACK;
  box(g, x, y, w, h, '#2c2f45', '#555c7d');
  for (const [cx, cy] of [[x, y], [x + w - 8, y], [x, y + h - 8], [x + w - 8, y + h - 8]]) box(g, cx, cy, 8, 8, '#c5cae6');
  plate(g, o.plate, y + 8);
  if (o.kind === 'tweet') {
    // a capacitor decade box: a silver box with a row of switches (fixed, never the setting)
    box(g, x + 10, y + 48, 96, 40, '#aab0c8', '#6a6f8f');
    for (let i = 0; i < 8; i++) {
      box(g, x + 15 + i * 11, y + 56, 6, 12, '#3a3f58');
      box(g, x + 15 + i * 11, y + (i % 3 === 0 ? 56 : 62), 6, 6, '#e8eaf4');
    }
    line(g, x + 14, y + 78, x + 100, y + 78, '#6a6f8f', 1.2);
    line(g, x + 106, y + 68, x + w, y + 88, '#05060c', 3);
  } else if (o.kind === 'mid') {
    // a coil with a sliding tap, and a fixed capacitor can
    box(g, x + 12, y + 46, 90, 8, '#6a4a30');
    for (let i = 0; i < 12; i++) {
      g.strokeStyle = '#d98a3a';
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(x + 20 + i * 7, y + 48, 3, 12, 0, 0, TWO_PI);
      g.stroke();
    }
    const tx = x + 20 + clamp01(o.tap ?? 0) * 77;
    box(g, tx - 3, y + 30, 6, 12, '#c5cae6', '#555c7d');
    line(g, tx, y + 30, tx, y + 24, '#c5cae6', 2);
    box(g, x + 14, y + 74, 34, 44, '#3b4a8a', '#8f9bd6');
    dot(g, x + 31, y + 74, 17, '#3b4a8a');
    text(g, o.can ?? '', x + 31, y + 100, PAL.white, 11);
    line(g, x + 52, y + 92, x + 104, y + 62, '#05060c', 3);
  } else if (o.kind === 'meters' && o.meters) {
    const m = o.meters;
    const rd = [m.vr, m.vl, m.vc];
    ['V_R', 'V_L', 'V_C'].forEach((name, i) => {
      const cx = x + 18 + i * 33;
      const cy = y + 78;
      dot(g, cx, cy, 15, '#e8eaf4');
      dot(g, cx, cy, 13, '#10121f');
      g.strokeStyle = '#555c7d';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(cx, cy, 11, -needleAngle(0), -needleAngle(1));
      g.stroke();
      const a = needleAngle(rd[i] / SCALE);
      line(g, cx + Math.cos(a) * 9, cy - Math.sin(a) * 9, cx + Math.cos(a) * 14, cy - Math.sin(a) * 14, PAL.yellow, 2.5); // the soundcheck tick
      const n = needleAngle((rd[i] / SCALE) * m.needle);
      line(g, cx, cy, cx + Math.cos(n) * 10, cy - Math.sin(n) * 10, PAL.red, 1.8);
      dot(g, cx, cy, 2, '#c5cae6');
      text(g, name, cx, cy - 20, PAL.white, 11);
      text(g, `${rd[i]} V`, cx, cy + 29, PAL.yellow, 11);
    });
    dot(g, x + 18, y + 150, 4.5, o.limiter ? PAL.red : '#4a2a30');
    text(g, 'LIMIT', x + 27, y + 154, PAL.dim, 11, 'left');
  } else {
    // the woofer's real coil: a coil body with its resistance drawn as a thin wire
    for (let i = 0; i < 12; i++) {
      g.strokeStyle = '#d98a3a';
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(x + 20 + i * 7, y + 62, 3, 14, 0, 0, TWO_PI);
      g.stroke();
    }
    line(g, x + 12, y + 90, x + 108, y + 90, '#6a4a30', 2);
    line(g, x + 108, y + 62, x + w, y + 80, '#05060c', 3);
  }
  // the vertical fader's slot
  line(g, FADER.x, FADER.y1 - 6, FADER.x, FADER.y0 + 6, '#05060c', 8);
  line(g, FADER.x, FADER.y1 - 6, FADER.x, FADER.y0 + 6, '#555c7d', 1.5);
  for (let i = 0; i <= 10; i++) line(g, FADER.x + 7, FADER.y1 + (i * (FADER.y0 - FADER.y1)) / 10, FADER.x + 11, FADER.y1 + (i * (FADER.y0 - FADER.y1)) / 10, '#6a6f8f', 1);
}

/** The amp on the flight case under the rack, with its small display. */
export function amp(g: G, label: string) {
  box(g, AMP.x, AMP.y, AMP.w, AMP.h, '#1b1e30', '#8f9bd6');
  box(g, AMP.x + 8, AMP.y + 5, 64, 16, '#02060a', '#555c7d');
  text(g, label, AMP.x + 40, AMP.y + 17, PAL.green, 11);
  for (let i = 0; i < 3; i++) dot(g, AMP.x + 88 + i * 12, AMP.y + 13, 4, '#10121f');
}

/** The fader's cap: a 30 × 14 rounded rectangle with three grip lines. */
export function faderCap(g: G, y: number, held: boolean) {
  rr(g, FADER.x - 15, y - 7, 30, 14, 4);
  g.fillStyle = held ? PAL.yellow : '#c5cae6';
  g.fill();
  g.strokeStyle = '#10121f';
  g.lineWidth = 1;
  g.stroke();
  for (const dy of [-3, 0, 3]) line(g, FADER.x - 10, y + dy, FADER.x + 10, y + dy, '#10121f', 1);
}

/** The fader's ring (radius 20) with arrows, the first-touch cue and the player's own setting beside it. */
export function faderGrip(g: G, t: number, y: number, o: { held: boolean; cue: boolean; read: string }) {
  if (o.cue && !calm()) {
    const f = (t * 1.1) % 1;
    g.globalAlpha = 0.7 * (1 - f);
    g.strokeStyle = PAL.yellow;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(FADER.x, y, 24 + f * 12, 0, TWO_PI);
    g.stroke();
    g.globalAlpha = 1;
  }
  g.fillStyle = o.held ? 'rgba(255,210,63,0.4)' : 'rgba(10,16,48,0.25)';
  g.beginPath();
  g.arc(FADER.x, y, 20, 0, TWO_PI);
  g.fill();
  g.strokeStyle = o.held ? PAL.yellow : PAL.white;
  g.lineWidth = o.held ? 4 : 2;
  g.beginPath();
  g.arc(FADER.x, y, 20, 0, TWO_PI);
  g.stroke();
  text(g, '⇕', FADER.x, y - 26, o.held ? PAL.yellow : PAL.white, 13);
  text(g, '⇕', FADER.x, y + 36, o.held ? PAL.yellow : PAL.white, 13);
  tag(g, o.read, FADER.x - 26, y + 4, 'right', PAL.yellow, 13);
  if (o.cue) text(g, 'drag', FADER.x + 26, y + 20, PAL.white, 11, 'left');
}
