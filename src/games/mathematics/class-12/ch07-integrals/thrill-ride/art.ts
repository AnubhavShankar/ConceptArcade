// Drawing for Thrill Ride: Rex the coaster engineer, the red test car with its two crash-test dummies, the steel pylons with their rail clips, the double rail,
// the stations, the Ferris wheel and bulb strings of the theme park at dusk, the blueprint sign and the knob box. Nothing here knows the answer of a round:
// it draws the numbers, states and poses it is handed.
import { PAL } from '@core/arcade';
import { face } from '@core/mathkit';
import { glow, line, text } from '@core/neon';

export type G = CanvasRenderingContext2D;
type P = [number, number];

/** The colour of the little dial icons and their needles (the tests skip strokes in this colour: they show only the player's own knobs). */
export const KNOB = '#c9d1ff';
/** The dim colour of a rail after a fault. */
export const DIM_RAIL = '#55648f';
const STEEL = '#8d96c4';
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

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
function limb(g: G, pts: P[], w: number, color: string) {
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

// ---- Rex ---------------------------------------------------------------------------------------------------------------------------------------------------

export type RexMood = 'happy' | 'worried' | 'cheer';
export type RexPose = 'idle' | 'radio' | 'cheer' | 'facepalm';

/**
 * Rex, a coaster engineer with feet at (x, y): yellow hard hat, orange hi-vis vest with silver stripes, a rolled blueprint under his left arm and a walkie-talkie in
 * his right hand. Idle life (7 s cycle): he breathes and taps the blueprint, looks along the track, then adjusts his hat. `radio` raises the walkie-talkie to his
 * mouth, `cheer` throws both arms up (the hat flies with `hat` = [dx, dy, spin]), `facepalm` slumps with a hand over his eyes.
 */
export function rex(g: G, x: number, y: number, t: number, o: { mood: RexMood; pose: RexPose; hat?: [number, number, number] }) {
  g.save();
  g.translate(x, y);
  const cyc = t % 7;
  const breathe = Math.sin(t * 2.2) * 0.6;
  const slump = o.pose === 'facepalm' ? 2.5 : 0;
  const shY = -38 + breathe + slump;
  const headY = -47 + breathe + slump * 1.4;
  const idle = o.pose === 'idle';
  const tapping = idle && cyc < 3;
  const looking = idle && cyc >= 3 && cyc < 4.8;
  const adjusting = idle && cyc >= 5 && cyc < 6.4;
  const hx = looking ? 2.2 : 0;
  const skin = '#e6b48a';
  // legs and boots
  limb(g, [[-3, -24], [-4, -12], [-5, -3]], 4.6, '#2b3358');
  limb(g, [[3, -24], [4, -12], [5, -3]], 4.6, '#2b3358');
  g.fillStyle = '#4a3320';
  rr(g, -10, -4.5, 9, 4.5, 2);
  g.fill();
  rr(g, 1, -4.5, 9, 4.5, 2);
  g.fill();
  // the blueprint roll: tucked under the left arm, or dropped when he cheers
  const rollTop: P = o.pose === 'cheer' ? [-20, -2] : [-17, shY + 4];
  const rollBot: P = o.pose === 'cheer' ? [-9, -2] : [-10, shY + 16];
  // torso, vest and its silver stripes
  limb(g, [[0, -24], [0, shY]], 11, '#33407a');
  g.fillStyle = '#ff8a1f';
  rr(g, -6, shY, 12, 15, 3);
  g.fill();
  line(g, -6, shY + 5, 6, shY + 5, '#e8f7ff', 1.6);
  line(g, -6, shY + 10, 6, shY + 10, '#e8f7ff', 1.6);
  limb(g, [rollTop, rollBot], 4.2, '#e9f2ff');
  line(g, rollTop[0] - 1.5, rollTop[1] - 1, rollTop[0] + 1.5, rollTop[1] + 1, '#5b86ff', 1.4);
  // left arm holds the roll; its fingers tap while he waits
  if (o.pose === 'cheer') {
    limb(g, [[-6, shY + 2], [-11, shY - 5], [-12, shY - 14]], 3.4, '#33407a');
    dot(g, -12, shY - 14.5, 2.3, skin);
  } else {
    const tap = tapping ? Math.sin(t * 14) * 1.2 : 0;
    limb(g, [[-6, shY + 2], [-11, shY + 9]], 3.4, '#33407a');
    dot(g, -11, shY + 10 + tap, 2.2, skin);
  }
  // right arm and the walkie-talkie
  const radio = (px: number, py: number, rot: number) => {
    g.save();
    g.translate(px, py);
    g.rotate(rot);
    g.fillStyle = '#222a44';
    rr(g, -2.4, -9, 5, 10, 1.5);
    g.fill();
    line(g, 1.4, -9, 1.4, -14, '#aab2cc', 1.2);
    dot(g, 0, -6.5, 0.9, Math.sin(t * 5) > 0 ? PAL.red : '#552020');
    g.restore();
  };
  if (o.pose === 'radio') {
    limb(g, [[6, shY + 2], [12, shY + 7], [7, headY + 8]], 3.4, '#33407a');
    dot(g, 7, headY + 8.5, 2.2, skin);
    radio(7.5, headY + 9, 0.35);
  } else if (o.pose === 'cheer') {
    limb(g, [[6, shY + 2], [11, shY - 5], [12, shY - 14]], 3.4, '#33407a');
    dot(g, 12, shY - 14.5, 2.3, skin);
    radio(12, shY - 13, 0.1);
  } else if (o.pose === 'facepalm') {
    limb(g, [[6, shY + 2], [12, shY + 8], [3, headY + 2]], 3.4, '#33407a');
  } else if (adjusting) {
    limb(g, [[6, shY + 2], [12, shY - 4], [7, headY - 6]], 3.4, '#33407a');
    dot(g, 7, headY - 6.5, 2.2, skin);
    radio(7, headY - 6, -0.3);
  } else {
    limb(g, [[6, shY + 2], [10, shY + 9]], 3.4, '#33407a');
    dot(g, 10, shY + 10, 2.2, skin);
    radio(10, shY + 12, 0);
  }
  // head, face and the hard hat
  dot(g, hx, headY, 8.2, skin);
  face(g, hx, headY + 1, 8, o.mood, t);
  if (o.pose === 'facepalm') {
    g.fillStyle = skin;
    g.strokeStyle = '#b8845e';
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(hx + 1, headY, 8, 4, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  const hat = o.hat ?? [0, 0, 0];
  g.save();
  g.translate(hx + hat[0], headY - 2 + hat[1]);
  g.rotate(hat[2] + (adjusting ? 0.22 : 0));
  g.fillStyle = PAL.yellow;
  g.beginPath();
  g.arc(0, -1, 9.4, Math.PI, 2 * Math.PI);
  g.closePath();
  g.fill();
  g.fillStyle = '#ffbf1f';
  rr(g, -11.5, -2, 23, 3.6, 1.8);
  g.fill();
  line(g, 0, -10.2, 0, -2, '#c99700', 1.6);
  g.restore();
  g.restore();
}

// ---- The test car and its crash-test dummies ---------------------------------------------------------------------------------------------------------------

/** A crash-test dummy seated at (x, y) in the car's own frame (y up is negative): a yellow head with black quarter marks, a pale body, arms down or up. */
function seated(g: G, x: number, y: number, o: { arms: 'down' | 'up'; lean: number }) {
  const hx = x + o.lean;
  const hy = y - 9;
  limb(g, [[x, y], [x + o.lean * 0.5, y - 5]], 5, '#cdbb96');
  if (o.arms === 'up') {
    limb(g, [[x + o.lean * 0.4, y - 4], [x - 5, y - 13]], 2.2, '#cdbb96');
    limb(g, [[x + o.lean * 0.4, y - 4], [x + 5, y - 13]], 2.2, '#cdbb96');
  } else limb(g, [[x + o.lean * 0.4, y - 4], [x + 3, y - 1.5]], 2.2, '#cdbb96');
  head(g, hx, hy, 5);
}
function head(g: G, hx: number, hy: number, R: number) {
  dot(g, hx, hy, R, PAL.yellow);
  g.fillStyle = '#161a36';
  g.beginPath();
  g.moveTo(hx, hy);
  g.arc(hx, hy, R, 0, Math.PI / 2);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(hx, hy);
  g.arc(hx, hy, R, Math.PI, 1.5 * Math.PI);
  g.closePath();
  g.fill();
  g.strokeStyle = '#161a36';
  g.lineWidth = 0.8;
  g.beginPath();
  g.arc(hx, hy, R, 0, Math.PI * 2);
  g.stroke();
}

/**
 * The red test car riding on its rail with the wheels at the point (x, y), tilted to the screen angle `ang` (radians, up positive). Two dummies ride in it: they lean
 * with the slope, and their arms go up on a drop (`arms`). `rock` is the little idle rocking at the station, `brake` shows the brake fins glowing with sparks.
 */
export function car(g: G, x: number, y: number, ang: number, t: number, o: { lean: number; arms: 'down' | 'up'; brake: boolean; riders: boolean; rock?: number }) {
  g.save();
  g.translate(x, y);
  g.rotate(-ang + (o.rock ?? 0));
  for (const wx of [-11, 11]) {
    dot(g, wx, -4, 4, '#1a1d33');
    dot(g, wx, -4, 1.7, '#9aa2c0');
  }
  g.fillStyle = '#e5384b';
  g.beginPath();
  g.moveTo(-19, -6);
  g.lineTo(-19, -15);
  g.lineTo(8, -15);
  g.lineTo(21, -9.5);
  g.lineTo(21, -6);
  g.closePath();
  g.fill();
  g.strokeStyle = '#7a1c24';
  g.lineWidth = 1;
  g.stroke();
  line(g, -18, -10.5, 18, -10.5, PAL.white, 1.4);
  if (o.riders) {
    seated(g, -8, -15, { arms: o.arms, lean: o.lean });
    seated(g, 6, -15, { arms: o.arms, lean: o.lean });
  }
  g.fillStyle = '#a3243a';
  rr(g, -17, -17.5, 26, 4, 2);
  g.fill();
  dot(g, 14, -12, 3.4, PAL.white);
  glow(g, PAL.yellow, 8, () => dot(g, 20.5, -9.2, 2.2, PAL.yellow));
  // brake fins under the tail
  g.fillStyle = o.brake ? PAL.orange : '#6b6f85';
  g.fillRect(-22, -6, 4, 6);
  if (o.brake) {
    for (let k = 0; k < 6; k++) {
      const a = Math.sin(t * 40 + k * 2.1) * 0.5;
      const len = 5 + ((t * 70 + k * 9) % 8);
      line(g, -22, -1, -22 - Math.cos(a) * len, -1 - Math.sin(a + 0.6) * len * 0.8, k % 2 ? PAL.yellow : PAL.orange, 1.4);
    }
  }
  g.restore();
}

/** After a crash: a dummy lying at (x, y) with its head ringed by orbiting stars. `rot` tilts it; `stars` 0 hides the stars. */
export function fallen(g: G, x: number, y: number, rot: number, t: number, stars: number) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  limb(g, [[0, 0], [0, -8]], 5, '#cdbb96');
  limb(g, [[0, -6], [-5, -12]], 2.2, '#cdbb96');
  limb(g, [[0, -6], [5, -9]], 2.2, '#cdbb96');
  head(g, 0, -13, 5);
  g.restore();
  if (stars > 0) {
    g.globalAlpha = stars;
    for (let k = 0; k < 3; k++) {
      const a = t * 7 + (k * 2 * Math.PI) / 3;
      text(g, '★', x + Math.cos(a) * 9, y - 13 + Math.sin(a) * 3.5 - 5, PAL.yellow, 9);
    }
    g.globalAlpha = 1;
  }
}

// ---- Pylons, rails, stations -------------------------------------------------------------------------------------------------------------------------------

export type ClipState = 'idle' | 'green' | 'red';

/**
 * A steel lattice pylon at x from the ground (`baseY`) up to `topY`, topped by its rail clip: a 24 px rail segment centred on the top, tilted to the screen angle
 * `clipAng` (radians, up positive). `flash` (0 to 1) makes a green or red clip glow. The number plate under it names the pylon.
 */
export function pylon(g: G, x: number, baseY: number, topY: number, clipAng: number, state: ClipState, flash: number, num: number) {
  const top = Math.min(topY, baseY - 16);
  const half = (y: number) => 3.5 + 7.5 * clamp01((y - top) / (baseY - top));
  line(g, x - 11, baseY, x - 3.5, top + 2, STEEL, 2.4);
  line(g, x + 11, baseY, x + 3.5, top + 2, STEEL, 2.4);
  for (let y = baseY; y - 16 > top; y -= 16) {
    const a = half(y);
    const b = half(y - 16);
    line(g, -a + x, y, b + x, y - 16, '#5d679b', 1.3);
    line(g, a + x, y, -b + x, y - 16, '#5d679b', 1.3);
    line(g, x - b, y - 16, x + b, y - 16, '#5d679b', 1.1);
  }
  g.fillStyle = '#4a5078';
  g.fillRect(x - 15, baseY - 3, 30, 3);
  g.fillStyle = '#aab2cc';
  g.fillRect(x - 3.5, top - 1, 7, 5);
  const col = state === 'green' ? PAL.green : state === 'red' ? PAL.red : PAL.yellow;
  const dx = Math.cos(clipAng) * 12;
  const dy = Math.sin(clipAng) * 12;
  glow(g, col, state === 'idle' ? 4 : 4 + 14 * flash, () => line(g, x - dx, top + dy, x + dx, top - dy, col, 4.2));
  dot(g, x - dx, top + dy, 1.8, PAL.white);
  dot(g, x + dx, top - dy, 1.8, PAL.white);
  g.fillStyle = '#10142e';
  rr(g, x - 7, baseY - 30, 14, 12, 3);
  g.fill();
  g.strokeStyle = '#5d679b';
  g.lineWidth = 1;
  g.stroke();
  text(g, String(num), x, baseY - 19.5, PAL.white, 11);
}

/** The double rail with a tie every 12 px, along `pts` (the first `upTo` of them). */
export function rails(g: G, pts: P[], upTo: number, color: string, w = 2) {
  const n = Math.max(0, Math.min(pts.length, upTo));
  if (n < 2) return;
  glow(g, color, color === DIM_RAIL ? 0 : 6, () => {
    g.strokeStyle = color;
    g.lineWidth = w;
    for (const off of [-2.6, 2.6]) {
      g.beginPath();
      for (let i = 0; i < n; i++) {
        if (i === 0) g.moveTo(pts[i][0], pts[i][1] + off);
        else g.lineTo(pts[i][0], pts[i][1] + off);
      }
      g.stroke();
    }
  });
  let acc = 0;
  for (let i = 1; i < n; i++) {
    acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc >= 12) {
      acc = 0;
      line(g, pts[i][0], pts[i][1] - 2.6, pts[i][0], pts[i][1] + 2.6, color, 1.2);
    }
  }
}

/**
 * The buckle at a clip the rail does not fit: the rail comes in at `kink` radians (screen, up positive) away from the clip's own angle, with a few crack marks. The kink
 * is at least 12 degrees however small the real difference is.
 */
export function buckle(g: G, cx: number, cy: number, clipAng: number, kink: number, flash: number) {
  const inAng = clipAng + kink;
  const sx = cx - Math.cos(inAng) * 22;
  const sy = cy + Math.sin(inAng) * 22;
  glow(g, PAL.red, 6 + 10 * flash, () => {
    line(g, sx, sy, cx, cy, PAL.red, 3.2);
  });
  line(g, sx, sy - 3, cx, cy - 3, PAL.cyan, 1.2);
  line(g, sx, sy + 3, cx, cy + 3, PAL.cyan, 1.2);
  for (let k = 0; k < 3; k++) {
    const a = -1 + k * 1.6 + flash * 2;
    line(g, cx - 3, cy - 3, cx - 3 + Math.cos(a) * 9, cy - 3 + Math.sin(a) * 9, PAL.yellow, 1.3);
  }
}

/** The start station: a roofed boarding platform with posts, its deck at `deckY`. */
export function station(g: G, x0: number, x1: number, deckY: number, groundY: number, t: number) {
  const roofY = Math.max(4, deckY - 74);
  line(g, x0 + 6, deckY, x0 + 6, groundY, STEEL, 3);
  line(g, x1 - 8, deckY, x1 - 8, groundY, STEEL, 3);
  g.fillStyle = '#2c3470';
  g.fillRect(x0, deckY, x1 - x0, 6);
  g.strokeStyle = '#5d679b';
  g.lineWidth = 1;
  g.strokeRect(x0, deckY, x1 - x0, 6);
  line(g, x0 + 4, deckY, x0 + 4, roofY + 5, '#5d679b', 2);
  line(g, x1 - 14, deckY, x1 - 14, roofY + 5, '#5d679b', 2);
  g.fillStyle = '#a3243a';
  rr(g, x0 - 4, roofY, x1 - x0 - 4, 6, 2);
  g.fill();
  for (let k = 0; k < 6; k++) {
    g.fillStyle = k % 2 ? PAL.white : '#a3243a';
    g.fillRect(x0 - 4 + k * 11, roofY + 6, 11, 3);
  }
  const lamp = 0.6 + 0.4 * Math.sin(t * 3);
  g.globalAlpha = lamp;
  dot(g, x0 + 28, roofY + 13, 2.2, PAL.yellow);
  g.globalAlpha = 1;
  text(g, 'START', x0 + 42, roofY + 23, PAL.white, 11);
}

/** The end station: a tall terminal that the car enters at whatever height it arrives, so it says nothing about the track's height. */
export function terminal(g: G, x0: number, x1: number, topY: number, groundY: number, t: number) {
  g.fillStyle = '#141a45';
  g.fillRect(x0, topY, x1 - x0, groundY - topY);
  g.strokeStyle = '#3b4a7a';
  g.lineWidth = 1.2;
  g.strokeRect(x0, topY, x1 - x0, groundY - topY);
  for (let y = topY + 14; y < groundY - 10; y += 22) {
    g.fillStyle = Math.sin(t * 2 + y) > -0.6 ? 'rgba(255,210,63,0.5)' : 'rgba(255,210,63,0.15)';
    g.fillRect(x0 + 8, y, 6, 8);
    g.fillRect(x1 - 14, y, 6, 8);
  }
  g.fillStyle = PAL.orange;
  rr(g, x0 - 3, topY - 6, x1 - x0 + 6, 7, 2);
  g.fill();
  text(g, 'END', (x0 + x1) / 2, topY + 18, PAL.white, 11);
}

// ---- The park ----------------------------------------------------------------------------------------------------------------------------------------------

/** A Ferris wheel silhouette at the back, turning slowly: 8 spokes and cabins. */
export function ferris(g: G, cx: number, cy: number, r: number, t: number) {
  const col = '#1b2260';
  line(g, cx, cy, cx - r * 0.55, 292, col, 3);
  line(g, cx, cy, cx + r * 0.55, 292, col, 3);
  g.strokeStyle = col;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < 8; i++) {
    const a = t * 0.12 + (i * Math.PI) / 4;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    line(g, cx, cy, px, py, col, 2);
    g.fillStyle = col;
    rr(g, px - 5, py - 2, 10, 9, 2);
    g.fill();
  }
  dot(g, cx, cy, 5, col);
}

/** Two strings of coloured bulbs across the top that twinkle. */
export function bulbs(g: G, t: number) {
  const colors = [PAL.pink, PAL.yellow, PAL.cyan, PAL.green];
  for (const [y0, sag] of [[8, 14], [24, 10]] as const) {
    for (let i = 0; i <= 20; i++) {
      const x = (i * 640) / 20;
      const y = y0 + sag * Math.sin((Math.PI * i) / 20);
      g.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 2.4 + i * 1.7 + y0));
      dot(g, x, y, 2.4, colors[(i + y0) % 4]);
    }
  }
  g.globalAlpha = 1;
}

/** The ground band of the park. */
export function ground(g: G, y: number) {
  g.fillStyle = '#0b0f2e';
  g.fillRect(0, y, 640, 340 - y);
  line(g, 0, y, 640, y, '#3b4a7a', 1.5);
}

// ---- Sign and knob box -------------------------------------------------------------------------------------------------------------------------------------

/** The blueprint sign: what the pylons ask for and the form of the track. */
export function sign(g: G, x: number, y: number, name: string, form: string) {
  g.fillStyle = 'rgba(8,12,40,0.9)';
  rr(g, x, y, 340, 42, 5);
  g.fill();
  g.strokeStyle = '#3b4a7a';
  g.lineWidth = 1.2;
  g.stroke();
  text(g, 'BLUEPRINT', x + 10, y + 13, PAL.dim, 11, 'left');
  text(g, `slope f(x) = ${name}`, x + 10, y + 27, PAL.yellow, 13, 'left');
  text(g, `track ${form}`, x + 10, y + 39, PAL.white, 11, 'left');
}

/** A small box of dial icons, one per knob, each showing the player's own value (decoration: the sliders are the controls). `turn` is -1 to 1. */
export function knobBox(g: G, x: number, y: number, w: number, knobs: { key: string; shown: string; turn: number }[]) {
  g.fillStyle = 'rgba(8,12,40,0.9)';
  rr(g, x, y, w, 44, 5);
  g.fill();
  g.strokeStyle = '#3b4a7a';
  g.lineWidth = 1.2;
  g.stroke();
  knobs.forEach((k, i) => {
    const cx = x + (w * (i + 0.5)) / knobs.length;
    text(g, k.key, cx, y + 10, PAL.dim, 11);
    g.strokeStyle = KNOB;
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(cx, y + 23, 7, 0, Math.PI * 2);
    g.stroke();
    const a = -Math.PI / 2 + k.turn * 2.35;
    line(g, cx, y + 23, cx + Math.cos(a) * 6, y + 23 + Math.sin(a) * 6, KNOB, 1.8);
    text(g, k.shown, cx, y + 40, PAL.white, 11);
  });
}

/** The round's goal in one short line on a dark pill: fully shown for 2.6 s from the start of the round, gone at 3 s. `age` is the seconds since the round began. */
export function goalLine(g: G, s: string, cx: number, y: number, age: number) {
  const a = age < 2.6 ? 1 : Math.max(0, 1 - (age - 2.6) / 0.4);
  if (a <= 0) return;
  g.globalAlpha = a;
  g.fillStyle = 'rgba(8,12,40,0.9)';
  rr(g, cx - 100, y - 14, 200, 22, 11);
  g.fill();
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 1.2;
  g.stroke();
  text(g, s, cx, y + 1, PAL.yellow, 12);
  g.globalAlpha = 1;
}

/** A different sky for each round of a level: round 1 dusk with a low sun, round 2 night with a moon, round 3 (the boss) a red sky with two slow searchlights. Drawn over the backdrop. */
export function skyTint(g: G, k: number, t: number, groundY: number) {
  if (k === 0) {
    g.fillStyle = 'rgba(255,140,60,0.13)';
    g.fillRect(0, 0, 640, groundY);
    g.fillStyle = 'rgba(255,190,90,0.55)';
    g.beginPath();
    g.arc(330, groundY, 26, Math.PI, 2 * Math.PI);
    g.fill();
  } else if (k === 1) {
    g.fillStyle = 'rgba(30,60,170,0.18)';
    g.fillRect(0, 0, 640, groundY);
    g.fillStyle = '#e8ecff';
    g.beginPath();
    g.arc(262, 86, 11, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(18,28,90,1)';
    g.beginPath();
    g.arc(267, 83, 10, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 7; i++) {
      g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.1);
      dot(g, 120 + i * 62, 70 + ((i * 37) % 40), 1.3, PAL.white);
    }
    g.globalAlpha = 1;
  } else {
    g.fillStyle = 'rgba(200,40,70,0.16)';
    g.fillRect(0, 0, 640, groundY);
    for (const [bx, ph] of [[190, 0], [450, 2]] as const) {
      const a = -Math.PI / 2 + 0.45 * Math.sin(t * 0.6 + ph);
      g.fillStyle = 'rgba(255,230,160,0.08)';
      g.beginPath();
      g.moveTo(bx - 5, groundY);
      g.lineTo(bx + 5, groundY);
      g.lineTo(bx + 5 + Math.cos(a) * 240 + 40, groundY + Math.sin(a) * 240);
      g.lineTo(bx - 5 + Math.cos(a) * 240 - 40, groundY + Math.sin(a) * 240);
      g.closePath();
      g.fill();
    }
  }
}
