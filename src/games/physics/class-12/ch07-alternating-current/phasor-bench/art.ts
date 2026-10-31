// Drawing for "Chai Before the Whistle": the station platform (morning, noon, night), Gopal's chai stall with its kettle, fuse box and meter,
// Gopal, Mr. Iyer at the train window, the guard, the train, the neon CHAI sign, the pocket scope, the camera and the photo.
// Nothing here knows the answer of a round: it draws the positions, states and moods it is handed. No Math.random: every wobble comes from the clock.
import { PAL } from '@core/arcade';
import { backdrop, face } from '@core/mathkit';
import { glow, line, text } from '@core/neon';
import { DEG } from './logic';

export type G = CanvasRenderingContext2D;

export const STALL = { x: 12, y: 230, w: 220, h: 78 }; // the counter (top edge y = 230)
export const KETTLE = { x: 168, y: 214 }; // kettle base centre on the stove plate
export const COIL_TRACK = { x0: 30, x1: 220, y: 290 }; // level 1: the bare coil runs along the counter front
export const clipX = (R: number) => COIL_TRACK.x0 + ((R - 10) / 110) * (COIL_TRACK.x1 - COIL_TRACK.x0);
export const KNOB = { x: 168, y: 262, r: 15, tip: 26 }; // level 2: the selector knob on the stove front
export const knobAngle = (v: number) => (-120 + ((v - 100) / 150) * 240) * DEG; // from straight up, clockwise
export const SCOPE_BOX = { x: 250, y: 56, w: 140, h: 86 }; // levels 2 and 4: Gopal's pocket scope, on a hook
export const PHASOR = { x: 320, y: 99, r: 34 }; // level 4: the phasor circle inside the scope
export const FUSE = { x: 40, y: 120 }; // the stall's fuse box on the post
export const SWITCH = { x: 40, y: 196 }; // the red wall switch
export const LCD = { x: 250, y: 150, w: 140, h: 18 }; // the stall meter (the helper)
export const TRAIN = { x: 360, y: 122 }; // the carriage's left edge and roof
export const SIGN = { x: 110, y: 70 }; // the neon sign
export const CAMERA = { x: 250, y: 262 }; // the camera on its tripod
export const GUARD = { x: 612, y: 262 };
export const SPOUT = { x: 206, y: 186 }; // the kettle's spout tip when upright
export const CUP = { x: 214, y: 224 }; // the clay cup under the spout
export const IYER = { x: 500, y: 168 };
export const FRAME = { x: 440, y: 40, w: 130, h: 80 }; // the photo frame at rest

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (u: number) => clamp01(u) * clamp01(u) * (3 - 2 * clamp01(u));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const INK = '#1b1030';
const SKIN = '#d9a074';

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
function poly(g: G, pts: [number, number][], fill: string) {
  g.fillStyle = fill;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fill();
}
/** A vertical gradient, or its first colour when the context cannot make one. */
function vgrad(g: G, y0: number, y1: number, c0: string, c1: string): string | CanvasGradient {
  const gr = g.createLinearGradient?.(0, y0, 0, y1);
  if (!gr) return c0;
  gr.addColorStop(0, c0);
  gr.addColorStop(1, c1);
  return gr;
}
function halo(g: G, x: number, y: number, r: number, color: string, a: number) {
  g.globalAlpha = a;
  dot(g, x, y, r, color);
  g.globalAlpha = 1;
}

// ---- the platform ----------------------------------------------------------------------------------------------------------------------------------------

const SKY: [string, string][] = [['#f2a65a', '#3a3f7a'], ['#7fb8e8', '#33507a'], ['#0b1030', '#1d2556']];

/** Round k = 0 morning, 1 noon, 2 night. Opaque, so the backdrop grid never shows. */
export function station(g: G, t: number, k: number) {
  backdrop(g);
  const night = k === 2;
  box(g, 0, 40, 640, 192, '#000');
  g.fillStyle = vgrad(g, 40, 232, SKY[k][0], SKY[k][1]);
  g.fillRect(0, 40, 640, 192);
  // distant skyline
  const heights = [52, 74, 60, 90, 66, 80, 58, 70, 94, 62];
  heights.forEach((h, i) => {
    const x = i * 66 - 10;
    box(g, x, 232 - h, 56, h, night ? '#141a3e' : k === 1 ? '#5a7fae' : '#6a4a6a');
    if (night) for (let w = 0; w < 6; w++) if ((i * 7 + w * 3) % 5 < 3) box(g, x + 8 + (w % 3) * 15, 232 - h + 10 + Math.floor(w / 3) * 18, 6, 8, '#ffd98a');
  });
  // the platform floor and the edge line, the rails
  box(g, 0, 232, 640, 74, night ? '#2a2c3e' : '#8d8a86');
  for (let x = 0; x < 640; x += 64) line(g, x, 232, x - 20, 306, night ? '#1f2132' : '#7a7672', 1);
  box(g, 0, 304, 640, 4, '#f2c230');
  box(g, 0, 308, 640, 32, '#1c1a24');
  line(g, 0, 318, 640, 318, '#5a5f78', 2);
  line(g, 0, 332, 640, 332, '#5a5f78', 2);
  for (let x = 4; x < 640; x += 28) box(g, x, 312, 14, 24, '#2c2733');
  // the station roof with iron trusses
  box(g, 0, 0, 640, 40, night ? '#10142e' : '#3a3a46');
  for (let x = -20; x < 660; x += 60) {
    line(g, x, 40, x + 30, 8, '#6a6e86', 3);
    line(g, x + 60, 40, x + 30, 8, '#6a6e86', 3);
  }
  line(g, 0, 8, 640, 8, '#6a6e86', 3);
  line(g, 0, 40, 640, 40, '#6a6e86', 4);
  // the hanging clock: the minute hand moves
  line(g, 430, 8, 430, 16, '#6a6e86', 2);
  dot(g, 430, 30, 14, '#f4f0e0');
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(430, 30, 14, 0, Math.PI * 2);
  g.stroke();
  const ma = t * 0.4;
  line(g, 430, 30, 430 + 11 * Math.sin(ma), 30 - 11 * Math.cos(ma), INK, 1.5);
  line(g, 430, 30, 430 + 7 * Math.sin(ma / 12), 30 - 7 * Math.cos(ma / 12), INK, 2.5);
  if (night) {
    for (const lx of [180, 510, 600]) {
      line(g, lx, 40, lx, 46, '#6a6e86', 2);
      poly(g, [[lx - 9, 56], [lx + 9, 56], [lx + 4, 46], [lx - 4, 46]], '#3a3a46');
      halo(g, lx, 66, 24, '#ffd98a', 0.18);
      halo(g, lx, 60, 6, '#fff0c0', 0.9);
    }
  }
}

// ---- the train, Mr. Iyer and the guard -------------------------------------------------------------------------------------------------------------------

/** The carriage: three windows, the middle one empty (Mr. Iyer sits there), a SUPERFAST board and a headlight in round 3. */
export function train(g: G, t: number, dx: number, boss: boolean) {
  const x = TRAIN.x + dx;
  const y = TRAIN.y;
  box(g, x, y, 340, 178, boss ? '#a8242c' : '#3d5a85');
  box(g, x, y, 340, 12, boss ? '#6e1219' : '#2a3d5c');
  box(g, x, y + 150, 340, 28, boss ? '#6e1219' : '#2a3d5c');
  box(g, x, y + 100, 340, 6, boss ? '#f0c040' : '#e8e8f0');
  box(g, x, y + 120, 340, 3, boss ? '#f0c040' : '#e8e8f0');
  for (const wx of [372, 470, 568]) {
    box(g, wx + dx, 140, 60, 72, '#1c2038');
    g.strokeStyle = boss ? '#f0c040' : '#c9d3e8';
    g.lineWidth = 3;
    g.strokeRect(wx + dx, 140, 60, 72);
  }
  // two other passengers: only heads and shoulders, nodding gently
  for (const [wx, col] of [[402, '#7a4a3a'], [598, '#5a3a5a']] as [number, string][]) {
    const bob = Math.sin(t * 1.5 + wx) * 1.2;
    poly(g, [[wx - 18 + dx, 212], [wx - 14 + dx, 190 + bob], [wx + 14 + dx, 190 + bob], [wx + 18 + dx, 212]], col);
    dot(g, wx + dx, 176 + bob, 11, SKIN);
    g.fillStyle = '#17141f';
    g.beginPath();
    g.arc(wx + dx, 174 + bob, 11, Math.PI, 2 * Math.PI);
    g.fill();
  }
  // doors
  box(g, 440 + dx, 128, 8, 160, boss ? '#6e1219' : '#2a3d5c');
  box(g, 534 + dx, 128, 8, 160, boss ? '#6e1219' : '#2a3d5c');
  if (boss) {
    rr(g, 410 + dx, 226, 160, 20, 4);
    g.fillStyle = '#f0c040';
    g.fill();
    text(g, 'SUPERFAST', 490 + dx, 241, '#6e1219', 14);
    halo(g, 640 + dx, 268, 46, '#fff4c0', 0.28 + 0.05 * Math.sin(t * 3));
    dot(g, 634 + dx, 268, 8, '#fffbe6');
  }
}

export type IyerMood = 'wait' | 'win' | 'weak' | 'blow' | 'cold' | 'over' | 'pose' | 'blink';
/** Mr. Iyer at the middle window. `u` is the seconds since his reaction began; `dx` follows the train. */
export function iyer(g: G, t: number, o: { mood: IyerMood; u: number; dx: number }) {
  const { mood, u, dx } = o;
  g.save();
  g.beginPath();
  g.rect(470 + dx, 140, 60, 72);
  g.clip();
  const lean = mood === 'over' ? ease(u / 0.2) * 9 : 0;
  const shiver = mood === 'cold' ? Math.sin(t * 45) * 1.6 : 0;
  const glance = mood === 'wait' && t % 3 < 0.5 ? -2.5 : 0; // looks up at the platform clock
  const hx = IYER.x + dx + lean + shiver;
  const hy = IYER.y + (mood === 'over' ? lean * 0.4 : 0);
  poly(g, [[hx - 24, 214], [hx - 18, 190], [hx + 18, 190], [hx + 24, 214]], '#5d7a9a'); // shirt
  g.fillStyle = SKIN;
  g.fillRect(hx - 5, hy + 12, 10, 8);
  dot(g, hx, hy, 15, SKIN);
  dot(g, hx - 15, hy + 1, 3, SKIN);
  dot(g, hx + 15, hy + 1, 3, SKIN);
  // grey hair, thin on top
  g.fillStyle = '#cfd0d8';
  g.beginPath();
  g.arc(hx, hy - 3, 15.5, Math.PI * 1.05, Math.PI * 1.95);
  g.fill();
  const fm = mood === 'win' || mood === 'pose' ? 'cheer' : mood === 'weak' || mood === 'blow' || mood === 'cold' || mood === 'over' ? 'worried' : 'happy';
  face(g, hx + glance, hy, 15, fm, t);
  // round spectacles over the eyes
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.arc(hx + glance + sx * 5.7, hy - 0.8, 4.6, 0, Math.PI * 2);
    g.stroke();
  }
  line(g, hx + glance - 1.2, hy - 0.8, hx + glance + 1.2, hy - 0.8, INK, 1.4);
  if (mood === 'blink' && u >= 0 && u < 0.4) {
    // eyes shut against the flash
    for (const sx of [-1, 1]) {
      box(g, hx + sx * 5.7 - 3.2, hy - 4, 6.4, 6.5, SKIN);
      line(g, hx + sx * 5.7 - 3, hy - 0.8, hx + sx * 5.7 + 3, hy - 0.8, INK, 1.6);
    }
  }
  if (mood === 'wait' || mood === 'blink') {
    // the newspaper held low, a page turning every 5 s, and the fingers tapping the sill
    const turn = t % 5 < 0.4 ? Math.sin((Math.PI * (t % 5)) / 0.4) : 0;
    poly(g, [[hx - 24, 214], [hx - 22, 190], [hx + 2, 188], [hx + 4, 214]], '#ece8dc');
    for (let i = 0; i < 4; i++) line(g, hx - 20, 194 + i * 5, hx, 193 + i * 5, '#8a867c', 1);
    if (turn > 0) poly(g, [[hx + 3, 190], [hx + 3 - 20 * turn, 189 + 2 * turn], [hx + 3 - 20 * turn, 213], [hx + 3, 214]], '#d8d4c6');
    const tap = Math.max(0, Math.sin(t * 8)) * 2;
    box(g, hx + 10, 207 - tap, 4, 6, SKIN);
    box(g, hx + 16, 207 - tap * 0.6, 4, 6, SKIN);
    dot(g, hx + 22, 196, 4, '#e0b020'); // the coin held out
    dot(g, hx + 21, 201, 4, SKIN);
  }
  if (mood === 'weak') {
    const w = Math.sin(t * 11) * 4;
    line(g, hx + 14, 206, hx + 24 + w, 190, SKIN, 5);
    dot(g, hx + 24 + w, 188, 4.5, SKIN);
  }
  if (mood === 'win') {
    const cupIn = ease(u / 0.2);
    line(g, hx + 14, 208, hx + 12, 198 - 4 * cupIn, SKIN, 5);
    const cy = lerp(196, 177, ease((u - 0.2) / 0.4)); // brings the cup to his lips
    kulhad(g, hx + 10, cy, 1.1);
    if (u > 0.5) steam(g, t, hx + 10, cy - 8, 1);
  }
  if (mood === 'pose') {
    line(g, hx + 14, 208, hx + 22, 196, SKIN, 5);
    dot(g, hx + 23, 195, 4.5, SKIN);
    box(g, hx + 22, 186, 3, 8, SKIN); // the thumb
  }
  if (mood === 'blow') text(g, '?', hx + 24, hy - 12, PAL.yellow, 18);
  g.restore();
  g.strokeStyle = '#c9d3e8';
  g.lineWidth = 3;
  g.strokeRect(470 + dx, 140, 60, 72);
}

function kulhad(g: G, x: number, y: number, s = 1) {
  poly(g, [[x - 7 * s, y - 5 * s], [x + 7 * s, y - 5 * s], [x + 5 * s, y + 6 * s], [x - 5 * s, y + 6 * s]], '#b4693a');
  box(g, x - 7 * s, y - 6 * s, 14 * s, 2.5 * s, '#d28a52');
}
function steam(g: G, t: number, x: number, y: number, h: number) {
  g.globalAlpha = 0.6;
  for (let i = 0; i < 3; i++) {
    const f = (t * 0.9 + i / 3) % 1;
    g.strokeStyle = '#f4f6ff';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(x + (i - 1) * 4, y - f * 14 * h);
    g.quadraticCurveTo(x + (i - 1) * 4 + 3, y - f * 14 * h - 4, x + (i - 1) * 4, y - f * 14 * h - 8);
    g.stroke();
  }
  g.globalAlpha = 1;
}

/** The cup that Gopal slides along the sill to Mr. Iyer: `u` runs 0 to 1 from the stall to the window. */
export function glidingCup(g: G, u: number) {
  const e = ease(u);
  kulhad(g, lerp(CUP.x, 488, e), lerp(CUP.y - 8, 180, e) - 12 * Math.sin(Math.PI * e), 1.1);
}

/** The guard: white uniform, cap, whistle on a cord, green flag; checks his wristwatch every 4 s, whistles and waves on cue. */
export function guard(g: G, t: number, o: { whistle: boolean; sad: boolean }) {
  const { x, y } = GUARD;
  box(g, x - 8, y + 21, 7, 20, '#d8d8e4');
  box(g, x + 1, y + 21, 7, 20, '#d8d8e4');
  box(g, x - 10, y + 39, 10, 4, '#201c28');
  box(g, x, y + 39, 10, 4, '#201c28');
  rr(g, x - 12, y - 15, 24, 38, 5);
  g.fillStyle = '#f1f1f8';
  g.fill();
  box(g, x - 12, y + 12, 24, 3, '#3a3f58');
  for (let i = 0; i < 3; i++) dot(g, x, y - 8 + i * 8, 1.4, '#9aa0b8');
  // the flag arm, with the flag waving
  const wave = o.whistle ? Math.sin(t * 14) * 4 : Math.sin(t * 2) * 1.5;
  line(g, x - 10, y - 8, x - 20, y + 3, '#f1f1f8', 5);
  line(g, x - 20, y + 3, x - 20, y - 34, '#8a6a3a', 2);
  poly(g, [[x - 20, y - 34], [x - 20, y - 20], [x - 42 + wave, y - 27 + wave * 0.3]], '#2fb35a');
  // the other arm: a wristwatch check every 4 s
  const check = t % 4 < 0.8;
  line(g, x + 10, y - 8, check ? x + 6 : x + 15, check ? y - 2 : y + 8, '#f1f1f8', 5);
  dot(g, check ? x + 6 : x + 15, check ? y - 2 : y + 9, 3, SKIN);
  if (check) dot(g, x + 8, y - 3, 1.6, '#ffd23f');
  // head, cap and whistle
  const hy = y - 24;
  dot(g, x, hy, 9, SKIN);
  g.fillStyle = '#f1f1f8';
  g.beginPath();
  g.arc(x, hy - 3, 9.5, Math.PI, 2 * Math.PI);
  g.fill();
  box(g, x - 11, hy - 4, 22, 3, '#3a3f58');
  face(g, x, hy + 1, 8, o.sad ? 'worried' : 'happy', t);
  g.strokeStyle = '#c8a030';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x - 4, hy + 9);
  g.lineTo(x, y - 8);
  g.lineTo(x + 4, hy + 9);
  g.stroke();
  if (o.whistle) {
    dot(g, x + 5, hy + 5, 3, '#ffd23f');
    for (let i = 0; i < 2; i++) line(g, x + 10 + i * 4, hy + 2 - i * 3, x + 13 + i * 4, hy + 1 - i * 3, PAL.white, 1.5);
  }
}

// ---- the stall --------------------------------------------------------------------------------------------------------------------------------------------

/** The stall's back: the post, the striped awning with its board, and two bulbs (dark after a fuse blow). */
export function stallBack(g: G, t: number, lit: boolean, night: boolean) {
  box(g, 34, 96, 12, 140, '#6a4a2a');
  poly(g, [[60, 128], [236, 128], [246, 146], [54, 146]], '#c8342b');
  for (let i = 0; i < 8; i++) poly(g, [[60 + i * 22, 128], [71 + i * 22, 128], [70 + i * 22 + 4, 146], [59 + i * 22 + 4, 146]], '#f4f0e6');
  rr(g, 66, 131, 150, 14, 3);
  g.fillStyle = '#f6e4b8';
  g.fill();
  text(g, 'GOPAL CHAI', 141, 142, INK, 11);
  for (const bx of [74, 206]) {
    line(g, bx, 146, bx, 153, '#2a2a30', 1.5);
    if (lit) {
      halo(g, bx, 158, night ? 26 : 16, '#ffe9a8', night ? 0.3 : 0.18);
      dot(g, bx, 158, 5, '#fff4c0');
    } else dot(g, bx, 158, 5, '#4a4a52');
  }
  void t;
}

/** The fuse box on the post and the red wall switch; `lever` 0 is off and 1 is on; a blown fuse is sooty. */
export function fuseBox(g: G, lever: number, blown: boolean) {
  rr(g, FUSE.x - 14, FUSE.y - 18, 28, 36, 3);
  g.fillStyle = '#8d93a8';
  g.fill();
  g.strokeStyle = '#4a5068';
  g.lineWidth = 1.5;
  g.stroke();
  rr(g, FUSE.x - 5, FUSE.y - 10, 10, 20, 4);
  g.fillStyle = blown ? '#2a2630' : '#f1ece0';
  g.fill();
  if (blown) {
    line(g, FUSE.x - 3, FUSE.y - 8, FUSE.x + 3, FUSE.y + 2, '#8a8070', 1.5);
    halo(g, FUSE.x, FUSE.y - 22, 6, '#3a3640', 0.6);
  } else line(g, FUSE.x, FUSE.y - 8, FUSE.x, FUSE.y + 8, '#c8a040', 1.5);
  rr(g, SWITCH.x - 11, SWITCH.y - 14, 22, 28, 3);
  g.fillStyle = '#c8342b';
  g.fill();
  g.strokeStyle = '#6e1219';
  g.lineWidth = 1.5;
  g.stroke();
  const a = lerp(-0.45, 0.45, lever);
  line(g, SWITCH.x, SWITCH.y, SWITCH.x + 13 * Math.sin(a), SWITCH.y - 13 * Math.cos(a), '#f4f0e6', 4);
  dot(g, SWITCH.x, SWITCH.y, 3, '#3a3f58');
}

/** The counter, its tin and cups, the stove plate and the steel cup with the ladle. `glowColor` is the stove's colour while a take plays. */
export function counter(g: G, glowColor: string | null, glowA = 1) {
  // the tin of biscuits
  rr(g, 14, 212, 24, 18, 3);
  g.fillStyle = '#d8a030';
  g.fill();
  box(g, 14, 218, 24, 4, '#a8242c');
  // the stove plate under the kettle
  box(g, 140, 216, 58, 14, '#2a2a30');
  box(g, 146, 214, 46, 3, '#4a4a52');
  if (glowColor) {
    g.globalAlpha = glowA;
    box(g, 146, 214, 46, 3, glowColor);
    g.globalAlpha = 1;
    halo(g, 169, 216, 34, glowColor, 0.28 * glowA);
  }
  // a second kulhad stands under the spout, the first is in the pair
  kulhad(g, 203, 222, 1);
  kulhad(g, CUP.x + 2, CUP.y - 2, 1);
  // the steel cup with the ladle
  box(g, 220, 214, 12, 16, '#b8bcc8');
  line(g, 226, 214, 230, 192, '#b8bcc8', 2);
  dot(g, 231, 190, 4, '#b8bcc8');
  // the counter itself
  box(g, STALL.x, 230, STALL.w, 78, '#7a4a28');
  for (let i = 1; i < 5; i++) line(g, STALL.x, 230 + i * 16, STALL.x + STALL.w, 230 + i * 16, '#5e3a20', 1.5);
  box(g, STALL.x - 2, 226, STALL.w + 4, 8, '#a8703a');
}

/** The kettle on the stove. `tilt` radians tip the spout down, `lift` pixels raise it (the high pour). */
export function kettle(g: G, t: number, tilt: number, lift: number) {
  g.save();
  g.translate(KETTLE.x, KETTLE.y - lift);
  g.rotate(tilt);
  poly(g, [[-22, 0], [22, 0], [18, -34], [-18, -34]], '#c9ced8');
  box(g, -18, -18, 36, 2, '#9aa0b0');
  line(g, -18, -34, 18, -34, '#e8ecf4', 3);
  dot(g, 0, -38, 3.5, '#4a4a52');
  poly(g, [[18, -12], [38, -28], [40, -24], [20, -6]], '#c9ced8');
  g.strokeStyle = '#4a4a52';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(-22, -18, 9, Math.PI * 0.5, Math.PI * 1.5);
  g.stroke();
  g.restore();
  void t;
}
/** Where the spout tip is for a given tilt and lift. */
export function spoutTip(tilt: number, lift: number): [number, number] {
  const sx = 39;
  const sy = -26;
  return [KETTLE.x + sx * Math.cos(tilt) - sy * Math.sin(tilt), KETTLE.y - lift + sx * Math.sin(tilt) + sy * Math.cos(tilt)];
}
/** The chai stream from the spout tip down to a point. */
export function stream(g: G, from: [number, number], to: [number, number], alpha = 1) {
  g.globalAlpha = alpha;
  g.strokeStyle = '#c8873a';
  g.lineWidth = 3.5;
  g.beginPath();
  g.moveTo(from[0], from[1]);
  g.quadraticCurveTo(from[0] + 14, from[1] + 4, to[0], to[1]);
  g.stroke();
  g.globalAlpha = 1;
}

/** Steam from the spout: `h` is one of the three fixed plume heights (0.3, 1, 1.6). */
export function plume(g: G, t: number, h: number, alpha = 1) {
  if (h <= 0 || alpha <= 0) return;
  const H = 46 * h;
  for (let i = 0; i < 6; i++) {
    const f = (t * 0.8 + i / 6) % 1;
    const px = SPOUT.x + 4 + Math.sin(t * 3 + i * 2) * 4 * f + f * 6;
    halo(g, px, SPOUT.y - 4 - f * H, 4 + f * 7 * (0.6 + 0.4 * h), '#f4f6ff', alpha * 0.55 * (1 - f));
  }
}
/** Foam spilling over the kettle's rim. */
export function foam(g: G, u: number) {
  for (let i = 0; i < 5; i++) {
    const e = ease(u * 2 - i * 0.12);
    halo(g, KETTLE.x - 14 + i * 7, KETTLE.y - 36 + e * 16 + (i % 2) * 3, 5, '#f4efe0', 0.95);
  }
}

/** Gopal's mood after a take, or while he waits. */
export type GopalMood = 'happy' | 'cheer' | 'worried' | 'sooty';
/**
 * Gopal behind his counter: moustache, short hair, white kurta with rolled sleeves, a checked towel on the shoulder.
 * `flip` 0 to 1 is his hand going to the wall switch; `kettleLift` >= 0 puts his other hand on the raised kettle's handle.
 */
export function gopal(g: G, t: number, o: { mood: GopalMood; flip: number; kettleLift: number; idle: boolean }) {
  const cx = 112;
  const breathe = Math.sin(t * 2);
  const hy = 168 + breathe * 0.5;
  // torso and kurta
  rr(g, 86, 186 + breathe * 0.5, 52, 50, 8);
  g.fillStyle = '#f2efe6';
  g.fill();
  line(g, 106, 187, 112, 202, '#c9c3b0', 2);
  line(g, 118, 187, 112, 202, '#c9c3b0', 2);
  for (let i = 0; i < 3; i++) dot(g, 112, 208 + i * 8, 1.5, '#b8b2a0');
  // the checked towel over the shoulder
  poly(g, [[124, 184], [140, 190], [146, 224], [132, 224]], '#c0332b');
  g.globalAlpha = 0.75;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) if ((r + c) % 2 === 0) box(g, 128 + c * 4 + r * 1.5, 190 + r * 8, 4, 4, '#ffffff');
  g.globalAlpha = 1;
  // neck and head
  box(g, cx - 5, hy + 12, 10, 9, SKIN);
  dot(g, cx, hy, 17, SKIN);
  dot(g, cx - 17, hy + 1, 3.5, SKIN);
  dot(g, cx + 17, hy + 1, 3.5, SKIN);
  g.fillStyle = '#17141f';
  g.beginPath();
  g.arc(cx, hy - 2, 17.5, Math.PI * 1.02, Math.PI * 1.98);
  g.fill();
  if (o.mood === 'sooty') {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.05 + i * 0.15);
      line(g, cx + 15 * Math.cos(a), hy - 2 + 15 * Math.sin(a), cx + 25 * Math.cos(a) + (i % 2 ? 2 : -2), hy - 2 + 26 * Math.sin(a), '#17141f', 3);
    }
    halo(g, cx + 3, hy + 3, 15, '#4a4650', 0.55);
    for (const sx of [-1, 1]) {
      // spiral eyes
      g.strokeStyle = INK;
      g.lineWidth = 1.4;
      g.beginPath();
      for (let k = 0; k <= 24; k++) {
        const a = k * 0.5;
        const rr2 = 0.4 + k * 0.17;
        const px = cx + sx * 6.5 + rr2 * Math.cos(a);
        const py = hy - 1 + rr2 * Math.sin(a);
        if (k) g.lineTo(px, py);
        else g.moveTo(px, py);
      }
      g.stroke();
    }
    g.strokeStyle = INK;
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(cx, hy + 12, 4, Math.PI * 1.1, Math.PI * 1.9);
    g.stroke();
  } else face(g, cx, hy, 17, o.mood === 'cheer' ? 'cheer' : o.mood === 'worried' ? 'worried' : 'happy', t);
  // the thick black moustache
  g.fillStyle = '#17141f';
  g.beginPath();
  g.moveTo(cx - 11, hy + 5);
  g.quadraticCurveTo(cx - 5, hy + 1, cx, hy + 5);
  g.quadraticCurveTo(cx + 5, hy + 1, cx + 11, hy + 5);
  g.quadraticCurveTo(cx + 6, hy + 9, cx, hy + 6.5);
  g.quadraticCurveTo(cx - 6, hy + 9, cx - 11, hy + 5);
  g.fill();
  // arms: his right (our left) wipes the counter every 4 s or flips the switch; his left rests, or holds the raised kettle
  const wipeU = o.idle && t % 4 < 0.6 ? Math.sin((Math.PI * (t % 4)) / 0.6) : 0;
  const rest: [number, number] = [86 + 20 * wipeU, 225];
  const hand: [number, number] = [lerp(rest[0], SWITCH.x + 7, o.flip), lerp(rest[1], SWITCH.y - 2, o.flip)];
  arm(g, [92, 196], hand);
  if (wipeU > 0) {
    box(g, hand[0] - 5, 224, 10, 5, '#c0332b');
  }
  const hand2: [number, number] = o.kettleLift >= 0 ? [KETTLE.x - 24, KETTLE.y - o.kettleLift - 18] : [142, 225];
  arm(g, [132, 196], hand2);
  if (o.mood === 'worried') {
    // a sweat drop on the brow
    halo(g, cx + 17, hy - 8 + ((t * 20) % 8), 2.4, '#8fd4ff', 0.9);
  }
  // an idle ♪ floats up every 6 s
  if (o.idle && o.mood === 'happy' && t % 6 < 1.6) {
    const f = (t % 6) / 1.6;
    g.globalAlpha = 1 - f;
    text(g, '♪', 150 + Math.sin(f * 6) * 4, 150 - 24 * f, PAL.yellow, 14);
    g.globalAlpha = 1;
  }
}
function arm(g: G, shoulder: [number, number], hand: [number, number]) {
  const ex = (shoulder[0] + hand[0]) / 2;
  const ey = (shoulder[1] + hand[1]) / 2 + 8;
  line(g, shoulder[0], shoulder[1], ex, ey, '#f2efe6', 8);
  line(g, ex, ey, hand[0], hand[1], SKIN, 6);
  dot(g, hand[0], hand[1], 4, SKIN);
}

// ---- the neon sign and the camera --------------------------------------------------------------------------------------------------------------------------

/** The CHAI sign: dark tubes; `lit` is 0 dark, 1 only the first letter half-lit, 2 fully lit. It never blinks faster than twice a second. */
export function neonSign(g: G, t: number, lit: 0 | 1 | 2) {
  rr(g, SIGN.x - 52, SIGN.y - 20, 104, 36, 5);
  g.fillStyle = '#12142a';
  g.fill();
  g.strokeStyle = '#4a5078';
  g.lineWidth = 2;
  g.stroke();
  line(g, SIGN.x - 30, SIGN.y - 20, SIGN.x - 30, 40, '#6a6e86', 2);
  line(g, SIGN.x + 30, SIGN.y - 20, SIGN.x + 30, 40, '#6a6e86', 2);
  const pulse = 0.9 + 0.1 * Math.sin(t * 6);
  'CHAI'.split('').forEach((ch, i) => {
    const x = SIGN.x - 33 + i * 22;
    const on = lit === 2 || (lit === 1 && i === 0);
    g.globalAlpha = on ? (lit === 1 ? 0.55 : pulse) : 1;
    if (on) glow(g, PAL.pink, 12, () => text(g, ch, x, SIGN.y + 6, PAL.pink, 20));
    else text(g, ch, x, SIGN.y + 6, '#3a3560', 20);
    g.globalAlpha = 1;
  });
}

/** The camera on its tripod, aimed up at the sign; `flash` 0 to 1 is the burst at the lens. */
export function camera(g: G, flash: number) {
  const { x, y } = CAMERA;
  line(g, x, y + 8, x - 20, y + 44, '#3a3f58', 3);
  line(g, x, y + 8, x, y + 46, '#3a3f58', 3);
  line(g, x, y + 8, x + 20, y + 44, '#3a3f58', 3);
  g.save();
  g.translate(x, y);
  g.rotate(0.55);
  rr(g, -16, -10, 32, 20, 4);
  g.fillStyle = '#2a2f45';
  g.fill();
  g.strokeStyle = '#8d93b5';
  g.lineWidth = 1.5;
  g.stroke();
  box(g, -22, -6, 8, 12, '#1a1d30');
  dot(g, 9, -5, 2, flash > 0 ? PAL.red : '#6e1219');
  g.restore();
  const lx = x - 22 * Math.cos(0.55);
  const ly = y - 22 * Math.sin(0.55);
  if (flash > 0 && flash < 1) halo(g, lx, ly, 26, '#ffffff', 0.35 * (1 - flash));
}

/** The photo frame dropping in: `u` 0 to 1 is the drop, `kind` what the photo shows. */
export function photo(g: G, kind: 'win' | 'early' | 'late', u: number, label: string) {
  const y = lerp(-90, FRAME.y, ease(u));
  const { x, w, h } = FRAME;
  rr(g, x, y, w, h, 4);
  g.fillStyle = '#f4f0e6';
  g.fill();
  box(g, x + 6, y + 6, w - 12, h - 26, '#14182c');
  'CHAI'.split('').forEach((ch, i) => {
    const on = kind === 'late' || (kind === 'win' && i === 0);
    g.globalAlpha = on ? (kind === 'win' ? 0.55 : 1) : 1;
    if (on) glow(g, PAL.pink, 8, () => text(g, ch, x + 28 + i * 24, y + 42, PAL.pink, 20));
    else text(g, ch, x + 28 + i * 24, y + 42, '#3a3560', 20);
    g.globalAlpha = 1;
  });
  if (kind === 'late') {
    g.globalAlpha = 0.6;
    box(g, x + 6, y + 6, w - 12, h - 26, '#ffffff');
    g.globalAlpha = 1;
  }
  text(g, label, x + w / 2, y + h - 6, INK, 11);
}

// ---- the scope, the meter and the level props ----------------------------------------------------------------------------------------------------------------

export type ScopeMode = 'off' | 'sine' | 'power' | 'phasor';
/** Gopal's pocket scope on its two cords. Waves are drawn at a fixed size: the numbers on them are given facts, never to scale. */
export function scopeBox(g: G, t: number, mode: ScopeMode, o: { peak?: string; rms?: string; arm?: number }) {
  const { x, y, w, h } = SCOPE_BOX;
  line(g, x + 20, 40, x + 20, y, '#6a6e86', 2);
  line(g, x + w - 20, 40, x + w - 20, y, '#6a6e86', 2);
  rr(g, x, y, w, h, 6);
  g.fillStyle = '#2a2f45';
  g.fill();
  g.strokeStyle = '#8d93b5';
  g.lineWidth = 2;
  g.stroke();
  box(g, x + 6, y + 6, w - 12, h - 12, '#04100a');
  const cy = 99;
  if (mode === 'sine') {
    line(g, x + 8, 75, x + w - 8, 75, PAL.dim, 1, [4, 3]);
    text(g, o.peak ?? '', x + w / 2, 71, PAL.white, 11);
    line(g, x + 8, cy, x + w - 8, cy, '#1b4a30', 1);
    g.strokeStyle = PAL.green;
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i <= 120; i++) {
      const px = x + 10 + i;
      const py = cy - 24 * Math.sin(((i / 60) * Math.PI * 2) + t * 2);
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.stroke();
  } else if (mode === 'power') {
    line(g, x + 8, 128, x + w - 8, 128, '#1b4a30', 1);
    text(g, 'p = v·i', x + w / 2, 76, PAL.white, 11);
    g.strokeStyle = PAL.yellow;
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i <= 120; i++) {
      const px = x + 10 + i;
      const s = Math.sin(((i / 60) * Math.PI * 2) + t * 2);
      const py = 128 - 38 * s * s;
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.stroke();
  } else if (mode === 'phasor') {
    text(g, o.rms ?? '', x + 8, y + 18, PAL.white, 11, 'left');
    g.strokeStyle = PAL.dim;
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(PHASOR.x, PHASOR.y, PHASOR.r, 0, Math.PI * 2);
    g.stroke();
    line(g, PHASOR.x - PHASOR.r - 6, PHASOR.y, PHASOR.x + PHASOR.r + 6, PHASOR.y, '#1b4a30', 1);
    line(g, PHASOR.x, PHASOR.y - PHASOR.r - 4, PHASOR.x, PHASOR.y + PHASOR.r + 4, '#1b4a30', 1);
    const a = (o.arm ?? 0) * DEG;
    const tx = PHASOR.x + PHASOR.r * Math.cos(a);
    const ty = PHASOR.y - PHASOR.r * Math.sin(a);
    line(g, tx, ty, tx, PHASOR.y, PAL.dim, 1, [3, 3]); // the projection on the vertical axis: the wave's height
    line(g, PHASOR.x, PHASOR.y, tx, ty, PAL.cyan, 2.5);
    dot(g, PHASOR.x, PHASOR.y, 2.5, PAL.cyan);
  }
}

/** The grip on a handle: arrows to say how it moves. `kind` 'h' slides sideways, 'rot' turns. */
export function grip(g: G, x: number, y: number, kind: 'h' | 'rot') {
  g.strokeStyle = PAL.white;
  g.globalAlpha = 0.9;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(x, y, 14, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = 1;
  if (kind === 'h') {
    poly(g, [[x - 11, y], [x - 5, y - 4], [x - 5, y + 4]], PAL.white);
    poly(g, [[x + 11, y], [x + 5, y - 4], [x + 5, y + 4]], PAL.white);
  } else {
    g.strokeStyle = PAL.white;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(x, y, 7, Math.PI * 1.1, Math.PI * 2.4);
    g.stroke();
    poly(g, [[x + 7, y - 1], [x + 3, y - 5], [x + 11, y - 5]], PAL.white);
  }
}

/** Level 1: the bare coil on its board with the crocodile clip at `R`; the used part (left of the clip) is brighter. */
export function coilBoard(g: G, R: number) {
  rr(g, 18, 272, 216, 34, 4);
  g.fillStyle = '#2a2f45';
  g.fill();
  box(g, 22, 282, 8, 16, '#e8e4d8');
  box(g, 220, 282, 8, 16, '#e8e4d8');
  const cx = clipX(R);
  const path = (s0: number, s1: number, color: string, w: number) => {
    g.strokeStyle = color;
    g.lineWidth = w;
    g.beginPath();
    const n = 160;
    for (let i = Math.round(s0 * n); i <= Math.round(s1 * n); i++) {
      const s = i / n;
      const px = COIL_TRACK.x0 + s * (COIL_TRACK.x1 - COIL_TRACK.x0) + 3 * Math.cos(s * 22 * Math.PI * 2);
      const py = COIL_TRACK.y + 9 * Math.sin(s * 22 * Math.PI * 2);
      if (i === Math.round(s0 * n)) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
  };
  const f = (cx - COIL_TRACK.x0) / (COIL_TRACK.x1 - COIL_TRACK.x0);
  path(0, 1, '#7a5230', 2.2);
  path(0, f, '#ffb04a', 2.6);
  // the crocodile clip
  poly(g, [[cx - 5, 276], [cx + 5, 276], [cx + 3, 298], [cx - 3, 298]], '#c8342b');
  poly(g, [[cx - 6, 296], [cx + 6, 296], [cx + 4, 304], [cx - 4, 304]], '#9aa0b0');
}

/** Level 2: the selector knob on the stove front, with ticks every 10 V and labels at 100, 150, 200 and 250. */
export function knob(g: G, sel: number) {
  const { x, y, r, tip } = KNOB;
  for (let v = 100; v <= 250; v += 10) {
    const a = knobAngle(v);
    const major = v % 50 === 0;
    line(g, x + (r + 8) * Math.sin(a), y - (r + 8) * Math.cos(a), x + (r + (major ? 16 : 12)) * Math.sin(a), y - (r + (major ? 16 : 12)) * Math.cos(a), PAL.dim, major ? 2 : 1);
    if (major) text(g, String(v), x + 40 * Math.sin(a), y - 40 * Math.cos(a) + 4, PAL.dim, 11);
  }
  dot(g, x, y, r + 3, '#2a2f45');
  dot(g, x, y, r, '#c9a24a');
  const a = knobAngle(sel);
  line(g, x, y, x + tip * Math.sin(a), y - tip * Math.cos(a), '#6e4a12', 4);
  dot(g, x, y, 3, '#6e4a12');
}

/** Level 3: the brass timer clock; the hand is at `angle` radians from straight up. */
export function timerClock(g: G, cx: number, cy: number, angle: number, label: string) {
  dot(g, cx, cy, 20, '#c9a24a');
  dot(g, cx, cy, 17, '#f1e6c8');
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    line(g, cx + 14 * Math.sin(a), cy - 14 * Math.cos(a), cx + 17 * Math.sin(a), cy - 17 * Math.cos(a), '#6e4a12', 1);
  }
  text(g, label, cx, cy + 11, INK, 11);
  line(g, cx, cy, cx + 13 * Math.sin(angle), cy - 13 * Math.cos(angle), '#a8242c', 2.5);
  dot(g, cx, cy, 2.5, '#a8242c');
}

/** Level 3: the order slip pinned beside Gopal. */
export function orderSlip(g: G, name: string, kj: string) {
  rr(g, 14, 196, 66, 34, 3);
  g.fillStyle = '#f6f0dc';
  g.fill();
  g.strokeStyle = '#a89a70';
  g.lineWidth = 1;
  g.stroke();
  dot(g, 47, 197, 2.5, '#c0332b');
  text(g, name, 47, 211, INK, 11);
  text(g, kj, 47, 225, '#a8242c', 12);
}

/** The stall meter: a dark LCD that shows `s`. */
export function lcd(g: G, s: string, color: string) {
  rr(g, LCD.x, LCD.y, LCD.w, LCD.h, 4);
  g.fillStyle = '#0a1a14';
  g.fill();
  g.strokeStyle = '#8d93b5';
  g.lineWidth = 1.5;
  g.stroke();
  text(g, s, LCD.x + LCD.w / 2, LCD.y + 13, color, 12);
}

/** The goal line on its dark pill (UX item 1). */
export function goalPill(g: G, s: string) {
  rr(g, 170, 38, 300, 20, 8);
  g.fillStyle = 'rgba(6,10,36,0.8)';
  g.fill();
  text(g, s, 320, 52, PAL.white, 13);
}

/** A small label with a dark pill behind it, for text that sits on a busy part of the scene. */
export function tag(g: G, s: string, x: number, y: number, color: string = PAL.white, size = 12, align: CanvasTextAlign = 'center', pad = 18) {
  const w = Math.max(24, s.length * (size * 0.62)) + pad * 0.5;
  const left = align === 'center' ? x - w / 2 : align === 'left' ? x - 4 : x - w + 4;
  rr(g, left, y - size - 1, w, size + 6, 5);
  g.fillStyle = 'rgba(6,10,36,0.72)';
  g.fill();
  text(g, s, x, y, color, size, align);
}
