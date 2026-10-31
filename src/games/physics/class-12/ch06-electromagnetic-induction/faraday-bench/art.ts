// Drawing for "The Deep-Sea Beacon": the sea in three depths, the docking pad and its field, the hoop, the charging sleeve and ring, the station screen and console,
// Kavya the diver, Wink the sealed beacon, Tug the robot submarine, the topside monitor, the dive slate and a little sea life.
// Nothing here knows the answer of a round: every function draws the positions, glows and moods it is handed. No Math.random: every wobble comes from the clock.
import { PAL } from '@core/arcade';
import { face } from '@core/mathkit';
import { line, text } from '@core/neon';
import { rad, type ShowRow } from './logic';

export type G = CanvasRenderingContext2D;

export const HOOP = { x: 300, y: 172, r: 48 }; // the hoop's centre and half-length (levels 1, 3, 4)
export const WINK_AT = { x: 300, y: 96 }; // Wink floats here in levels 1, 3, 4
export const WINK_L2 = { x: 404, y: 206 }; // and here in level 2
export const PAD = { x0: 210, x1: 390, top: 240 }; // the docking pad's deck plate
export const MAGNET = { x: 220, y: 250, w: 160, h: 34 }; // the electromagnet inside the pad (cut-away)
export const SLEEVE = { x: 300, top: 110, bottom: 292, r: 45, win0: 170, win1: 240 }; // level 2: the charging sleeve and its glass window
export const RING_Y = { held: 96, inside: 205 }; // level 2: the ring above the mouth, and inside the window
export const PX_PER_CM = 5; // level 2: ring half-width = 5 px per cm of radius (not to scale with the answer)
export const LCD = { x: 500, y: 258, w: 120, h: 18 }; // the helper readout on the console
export const GRAPH = { x: 420, y: 70, w: 180, h: 128 }; // level 4 station screen: 8 px per mWb (0 to 16), 60 px per second (3 steps)
export const KAVYA = { x: 150, y: 300 }; // her boots on the seabed
export const HAND = { x: 206, y: 214 }; // her right hand, holding the rod
export const TUG = { x: 585, y: 222 };
export const CONSOLE = { x: 490, y: 250, w: 140, h: 50 };
export const REST_TIP: [number, number] = [556, 246]; // Tug's claw when it is not working the console

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (u: number) => clamp01(u) * clamp01(u) * (3 - 2 * clamp01(u));
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
const frac = (v: number) => v - Math.floor(v);
/** A repeatable value in 0 to 1 from a number. */
export const jit = (n: number) => frac(Math.sin(n * 12.9898) * 43758.5453);
export const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
const INK = '#1b1030';
const COPPER = '#e08a3c';
const BRASS = '#c9a24a';
const STEEL = '#6b7488';

function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + k, y);
  g.arcTo(x + w, y, x + w, y + h, k);
  g.arcTo(x + w, y + h, x, y + h, k);
  g.arcTo(x, y + h, x, y, k);
  g.arcTo(x, y, x + w, y, k);
  g.closePath();
}
function fillRR(g: G, x: number, y: number, w: number, h: number, r: number, fill: string, edge?: string, ew = 1) {
  rr(g, x, y, w, h, r);
  g.fillStyle = fill;
  g.fill();
  if (edge) {
    g.strokeStyle = edge;
    g.lineWidth = ew;
    g.stroke();
  }
}
function dot(g: G, x: number, y: number, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}
function limb(g: G, pts: [number, number][], color: string, w: number) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
  g.lineCap = 'butt';
  g.lineJoin = 'miter';
}
function spiral(g: G, x: number, y: number, R: number, t: number, color = INK) {
  g.strokeStyle = color;
  g.lineWidth = 1.2;
  g.beginPath();
  for (let a = 0; a <= 9; a += 0.5) {
    const px = x + Math.cos(a + t * 6) * ((R * a) / 9);
    const py = y + Math.sin(a + t * 6) * ((R * a) / 9);
    if (a === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.stroke();
}
function vgrad(g: G, y0: number, y1: number, c0: string, c1: string) {
  const gr = g.createLinearGradient?.(0, y0, 0, y1);
  if (gr) {
    gr.addColorStop(0, c0);
    gr.addColorStop(1, c1);
    g.fillStyle = gr;
  } else g.fillStyle = c0;
  g.fillRect(0, y0, 640, y1 - y0);
}
/** A soft round glow: a radial gradient where the canvas has one, else a few flat discs. */
function halo(g: G, x: number, y: number, R: number, color: string, alpha: number) {
  if (alpha <= 0) return;
  g.save();
  g.globalAlpha = Math.min(1, alpha);
  const gr = g.createRadialGradient?.(x, y, 2, x, y, R);
  if (gr) {
    gr.addColorStop(0, color);
    gr.addColorStop(1, 'rgba(255,210,122,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, R, 0, Math.PI * 2);
    g.fill();
  } else {
    g.fillStyle = color;
    g.globalAlpha = Math.min(1, alpha) * 0.3;
    for (const k of [1, 0.7, 0.45]) {
      g.beginPath();
      g.arc(x, y, R * k, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();
}

/** A pill of dark glass behind a line of text, so the words stay readable over the scene. */
export function tag(g: G, s: string, x: number, y: number, align: 'left' | 'right' | 'center', color: string = PAL.yellow, size = 12) {
  const w = s.length * (size * 0.56) + 10;
  const x0 = align === 'left' ? x - 5 : align === 'right' ? x - w + 5 : x - w / 2;
  g.fillStyle = 'rgba(6,10,36,0.78)';
  g.fillRect(x0, y - size - 1, w, size + 6);
  text(g, s, x, y, color, size, align);
}
/** A drag handle's grip: a see-through disc with a yellow ring and arrows. The engine pulses its own ring around it. */
export function grip(g: G, x: number, y: number, r: number, dir: 'h' | 'v') {
  g.fillStyle = 'rgba(10,16,48,0.5)';
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.stroke();
  text(g, dir === 'v' ? '⇕' : '⇔', x, y + 5, PAL.white, 13);
}
/** The slider track along the bottom (levels 3 and 4), with end labels at 11 px. */
export function trackBar(g: G, x0: number, x1: number, lo: string, hi: string) {
  line(g, x0, 322, x1, 322, PAL.dim, 3);
  text(g, lo, x0, 338, PAL.dim, 11);
  text(g, hi, x1, 338, PAL.dim, 11);
}

// ---- the sea ----------------------------------------------------------------------------------------------------------------------------------------------

const WATER: [string, string][] = [['#0d5a6e', '#06283a'], ['#0b2a5a', '#04102a'], ['#02050f', '#010208']];

/** Three depths: shallow with sunbeams, deeper with the wreck behind the station, the abyss with glowing specks and a jellyfish. Opaque, so the engine grid never shows. */
export function sea(g: G, t: number, k: number) {
  vgrad(g, 0, 300, WATER[k][0], WATER[k][1]);
  if (k === 0) {
    g.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 4; i++) {
      const x0 = 70 + i * 150 + Math.sin(t * 0.3 + i * 1.7) * 14;
      g.beginPath();
      g.moveTo(x0, 0);
      g.lineTo(x0 + 40, 0);
      g.lineTo(x0 + 120, 300);
      g.lineTo(x0 + 70, 300);
      g.fill();
    }
  }
  if (k === 1) wreck(g);
  // drifting specks (round 3: twelve tiny glowing ones that pulse at 0.5 Hz)
  for (let i = 0; i < 12; i++) {
    const x = 20 + jit(i + 1) * 600;
    if (k === 2) {
      const y = 30 + jit(i + 40) * 250;
      g.globalAlpha = 0.25 + 0.25 * Math.sin(t * Math.PI + i * 1.3);
      g.fillStyle = i % 2 ? PAL.cyan : PAL.green;
      g.fillRect(x, y, 2, 2);
    } else {
      const y = (((jit(i + 40) * 300 - t * 6) % 300) + 300) % 300;
      g.globalAlpha = 0.3;
      g.fillStyle = '#ffffff';
      g.fillRect(x, y, 1, 1);
    }
  }
  g.globalAlpha = 1;
  if (k === 2) jellyfish(g, t);
  else fish(g, t);
  // the seabed
  g.fillStyle = '#3a3324';
  g.fillRect(0, 300, 640, 40);
  for (let x = 0; x < 640; x += 40) line(g, x + 6, 308 + (x / 40 % 2) * 12, x + 34, 308 + (x / 40 % 2) * 12, '#2c271b', 2);
  for (const [px, py, pr] of [[110, 318, 5], [196, 328, 4], [432, 322, 5], [606, 328, 4]]) {
    g.fillStyle = '#4a4332';
    g.beginPath();
    g.ellipse(px, py, pr, pr * 0.6, 0, 0, Math.PI * 2);
    g.fill();
  }
  grass(g, t, 30);
  grass(g, t, 460);
  crab(g, t);
}
function grass(g: G, t: number, x: number) {
  g.strokeStyle = '#2f7a4a';
  g.lineWidth = 2.5;
  g.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const bx = x + (i - 2) * 5;
    const h = 20 + (i % 3) * 7;
    const sway = Math.sin(t * 1.5 + i * 0.7) * 3;
    g.beginPath();
    g.moveTo(bx, 301);
    g.quadraticCurveTo(bx + sway * 0.5, 301 - h / 2, bx + sway, 301 - h);
    g.stroke();
  }
  g.lineCap = 'butt';
}
function crab(g: G, t: number) {
  const x = 60 + Math.sin(t * 0.7) * 18;
  const y = 306;
  g.globalAlpha = 0.65;
  g.fillStyle = '#c0553a';
  g.beginPath();
  g.ellipse(x, y, 9, 5, 0, 0, Math.PI * 2);
  g.fill();
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) line(g, x + s * 7, y + 1, x + s * (11 + i * 2), y + 5 + Math.sin(t * 6 + i) * 1, '#c0553a', 1.5);
    line(g, x + s * 8, y - 3, x + s * 12, y - 8, '#c0553a', 2);
    dot(g, x + s * 3, y - 6, 1.4, '#ffffff');
  }
  g.globalAlpha = 1;
}
function fish(g: G, t: number) {
  for (let i = 0; i < 2; i++) {
    const x = ((t * 14 + i * 330) % 700) - 30;
    const y = 134 + i * 12 + Math.sin(t * 1.3 + i * 2) * 3;
    g.globalAlpha = 0.42;
    g.fillStyle = i ? '#8fd3c8' : '#f2a65a';
    g.beginPath();
    g.ellipse(x, y, 10, 4.5, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(x - 9, y);
    g.lineTo(x - 16, y - 5 + Math.sin(t * 8 + i) * 1.5);
    g.lineTo(x - 16, y + 5 - Math.sin(t * 8 + i) * 1.5);
    g.fill();
    dot(g, x + 5, y - 1, 1, '#06283a');
    g.globalAlpha = 1;
  }
}
function jellyfish(g: G, t: number) {
  const x = 78 + Math.sin(t * 0.35) * 22;
  const y = 108 + Math.sin(t * 0.6) * 8;
  g.globalAlpha = 0.5;
  g.fillStyle = '#c9d8f5';
  g.beginPath();
  g.arc(x, y, 14, Math.PI, 2 * Math.PI);
  g.quadraticCurveTo(x, y + 6, x - 14, y);
  g.fill();
  for (let i = 0; i < 4; i++) {
    const tx = x - 9 + i * 6;
    g.strokeStyle = '#c9d8f5';
    g.lineWidth = 1.5;
    g.beginPath();
    for (let s = 0; s <= 5; s++) {
      const px = tx + Math.sin(t * 2 + i + s * 0.9) * 2.5;
      const py = y + 3 + s * 5.5;
      if (s) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
}
/** Round 2: the shipwreck behind the station, drawn before everything else. */
function wreck(g: G) {
  g.fillStyle = '#1a2238';
  g.beginPath();
  g.moveTo(430, 160);
  g.lineTo(640, 150);
  g.lineTo(640, 300);
  g.lineTo(446, 300);
  g.closePath();
  g.fill();
  line(g, 470, 156, 428, 98, '#1a2238', 6);
  line(g, 446, 122, 484, 108, '#1a2238', 3);
  for (const px of [490, 540, 590]) {
    dot(g, px, 216, 10, '#2c3858');
    dot(g, px, 216, 7.5, '#0c1426');
    dot(g, px - 2, 214, 2, 'rgba(255,210,122,0.25)');
  }
}

// ---- the docking pad and its field ------------------------------------------------------------------------------------------------------------------------

/** The seabed station's electromagnet: deck plate, hazard stripes, a cut-away skirt showing the wound iron core, four legs. `on` is 0 to 1 (the copper dims as the power dies). */
export function pad(g: G, t: number, on: number) {
  const x0 = PAD.x0;
  const w = PAD.x1 - PAD.x0;
  g.fillStyle = '#3a4252';
  for (const lx of [224, 266, 326, 368]) g.fillRect(lx, 286, 8, 14);
  fillRR(g, x0 + 4, 250, w - 8, 38, 3, '#242a38', '#4a5266');
  // the iron core and its copper winding
  fillRR(g, MAGNET.x + 12, MAGNET.y + 7, MAGNET.w - 24, MAGNET.h - 12, 2, '#8d93a3');
  g.strokeStyle = `rgba(224,138,60,${0.35 + 0.65 * on})`;
  g.lineWidth = 2;
  for (let x = MAGNET.x + 16; x < MAGNET.x + MAGNET.w - 14; x += 6) {
    g.beginPath();
    g.moveTo(x, MAGNET.y + 5);
    g.lineTo(x, MAGNET.y + MAGNET.h - 3);
    g.stroke();
  }
  g.setLineDash([5, 4]);
  g.strokeStyle = 'rgba(143,155,214,0.8)';
  g.lineWidth = 1;
  g.strokeRect(MAGNET.x, MAGNET.y, MAGNET.w, MAGNET.h);
  g.setLineDash([]);
  // the deck plate with hazard stripes along its front edge
  fillRR(g, x0, PAD.top, w, 10, 2, STEEL);
  g.save();
  g.beginPath();
  g.rect(x0, PAD.top + 4, w, 6);
  g.clip();
  g.fillStyle = PAL.yellow;
  g.fillRect(x0, PAD.top + 4, w, 6);
  g.fillStyle = '#111';
  for (let x = x0 - 6; x < PAD.x1; x += 14) {
    g.beginPath();
    g.moveTo(x, PAD.top + 10);
    g.lineTo(x + 7, PAD.top + 10);
    g.lineTo(x + 13, PAD.top + 4);
    g.lineTo(x + 6, PAD.top + 4);
    g.fill();
  }
  g.restore();
  // the hum: two short vibration lines each side, swapping every 0.25 s (2 Hz)
  if (on > 0.5) {
    const ph = calm() ? 0 : Math.floor(t * 4) % 2;
    for (const s of [-1, 1]) {
      for (const d of [0, 1]) {
        const xx = s < 0 ? x0 - 5 - (ph ? 3 : 0) - d * 5 : PAD.x1 + 5 + (ph ? 3 : 0) + d * 5;
        line(g, xx, 252, xx, 270, PAL.cyan, 1.5);
      }
    }
  }
}
/** Seven dashed field lines with arrowheads, pointing up through the hoop. */
export function field(g: G, alpha: number) {
  if (alpha <= 0.005) return;
  g.globalAlpha = alpha;
  for (let i = 0; i < 7; i++) {
    const x = 252 + 16 * i;
    line(g, x, 236, x, 124, PAL.cyan, 1.6, [6, 5]);
    g.fillStyle = PAL.cyan;
    g.beginPath();
    g.moveTo(x, 118);
    g.lineTo(x - 4, 127);
    g.lineTo(x + 4, 127);
    g.fill();
  }
  g.globalAlpha = 1;
}

// ---- the hoop (levels 1, 3, 4) -----------------------------------------------------------------------------------------------------------------------

/** The hoop seen from the side, its long axis turned `th` degrees (positive turns the right end down), with its normal arrow and the tilt arc. */
export function hoop(g: G, th: number, lw: number, o: { normal: boolean; arc: boolean }) {
  g.save();
  g.translate(HOOP.x, HOOP.y);
  g.rotate(rad(th));
  g.beginPath();
  g.ellipse(0, 0, HOOP.r, 9, 0, 0, Math.PI * 2);
  g.fillStyle = 'rgba(224,138,60,0.14)';
  g.fill();
  g.strokeStyle = COPPER;
  g.lineWidth = lw;
  g.stroke();
  g.restore();
  const a = rad(th) - Math.PI / 2;
  if (o.arc) {
    g.globalAlpha = 0.6;
    g.strokeStyle = PAL.white;
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(HOOP.x, HOOP.y, 30, -Math.PI / 2, a, th < 0);
    g.stroke();
    g.globalAlpha = 1;
  }
  if (o.normal) {
    const ex = HOOP.x + 40 * Math.cos(a);
    const ey = HOOP.y + 40 * Math.sin(a);
    line(g, HOOP.x, HOOP.y, ex, ey, PAL.white, 1.6, [4, 3]);
    g.fillStyle = PAL.white;
    g.beginPath();
    g.moveTo(ex, ey);
    g.lineTo(ex - 7 * Math.cos(a - 0.4), ey - 7 * Math.sin(a - 0.4));
    g.lineTo(ex - 7 * Math.cos(a + 0.4), ey - 7 * Math.sin(a + 0.4));
    g.fill();
  }
}
/** The hoop's two leads, from Wink's base to two points on the hoop's axis. */
export function hoopLeads(g: G, from: [number, number], th: number) {
  const ax = Math.cos(rad(th));
  const ay = Math.sin(rad(th));
  for (const s of [-1, 1]) {
    const px = HOOP.x + s * 16 * ax;
    const py = HOOP.y + s * 16 * ay - 4;
    const fx = from[0] + s * 3;
    g.strokeStyle = '#1a1a1a';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(fx, from[1]);
    g.quadraticCurveTo(fx + s * 26, (from[1] + py) / 2, px, py);
    g.stroke();
  }
}
/** The brass rod from Kavya's hand to a point on the prop. */
export function rod(g: G, to: [number, number]) {
  line(g, HAND.x, HAND.y, to[0], to[1], BRASS, 3.5);
  dot(g, to[0], to[1], 2.6, '#8a6a22');
}

// ---- level 2: the charging sleeve ------------------------------------------------------------------------------------------------------------------------

/** The glass sleeve wound with copper; `boost` (0 to 1) brightens the winding while the current ramps. */
export function sleeve(g: G, boost: number) {
  const { x, top, bottom, r } = SLEEVE;
  fillRR(g, x - 56, bottom, 112, 8, 2, STEEL);
  g.fillStyle = 'rgba(150,200,230,0.12)';
  g.fillRect(x - r, top, 2 * r, bottom - top);
  g.beginPath();
  g.ellipse(x, bottom, r, 10, 0, 0, Math.PI * 2);
  g.fill();
  if (boost > 0) {
    g.fillStyle = `rgba(255,155,61,${0.18 * boost})`;
    g.fillRect(x - r, top, 2 * r, bottom - top);
  }
  g.strokeStyle = COPPER;
  g.globalAlpha = 0.8 + 0.2 * boost;
  g.lineWidth = 2;
  for (let y = top + 8; y <= bottom - 2; y += 8) {
    const inWin = y > SLEEVE.win0 && y < SLEEVE.win1;
    g.setLineDash(inWin ? [3, 7] : []);
    g.beginPath();
    g.ellipse(x, y, r, 8, 0, 0, Math.PI);
    g.stroke();
  }
  g.setLineDash([]);
  g.globalAlpha = 1;
  line(g, x - r, top, x - r, bottom, 'rgba(200,230,255,0.6)', 1.5);
  line(g, x + r, top, x + r, bottom, 'rgba(200,230,255,0.6)', 1.5);
  g.strokeStyle = 'rgba(200,230,255,0.7)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.ellipse(x, top, r, 10, 0, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = 'rgba(244,246,255,0.35)';
  g.lineWidth = 1;
  g.strokeRect(x - r + 3, SLEEVE.win0, 2 * r - 6, SLEEVE.win1 - SLEEVE.win0);
  tag(g, 'CHARGING SLEEVE', x, 278, 'center', PAL.white, 11);
}
/** The ring: an ellipse with half-width 5 px per cm of radius. */
export function ring(g: G, x: number, y: number, r: number) {
  const a = PX_PER_CM * r;
  g.beginPath();
  g.ellipse(x, y, a, a * 0.28, 0, 0, Math.PI * 2);
  g.fillStyle = 'rgba(224,138,60,0.16)';
  g.fill();
  g.strokeStyle = COPPER;
  g.lineWidth = 3;
  g.stroke();
}
/** Wink's pedestal in level 2 and the two leads from the ring's right rim over the sleeve mouth. */
export function pedestal(g: G, wx: number, wy: number) {
  fillRR(g, wx - 12, wy + 34, 24, 60, 3, '#3a4252', '#4a5266');
  fillRR(g, wx - 18, wy + 30, 36, 8, 3, STEEL);
}
export function ringLeads(g: G, rim: [number, number], from: [number, number]) {
  for (const s of [-1, 1]) {
    g.strokeStyle = '#1a1a1a';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(rim[0] + s * 3, rim[1]);
    g.bezierCurveTo(rim[0] + 30, 70 + s * 6, from[0] - 20, from[1] + 20 + s * 5, from[0] + s * 3, from[1]);
    g.stroke();
  }
}

// ---- level 4: the station screen --------------------------------------------------------------------------------------------------------------------------

/** The black screen on its mast: the flux per turn drawn through four points, with a white cursor moving across it during the program (`u` is 0 to 1, or −1 for none). */
export function graphScreen(g: G, r: ShowRow, u: number) {
  const { x, y, w, h } = GRAPH;
  line(g, 504, y + h + 6, 504, CONSOLE.y, STEEL, 8);
  fillRR(g, x - 6, y - 6, w + 12, h + 12, 5, STEEL, '#4a5266');
  g.fillStyle = '#05070f';
  g.fillRect(x, y, w, h);
  for (let gy = 0; gy <= h; gy += 16) line(g, x, y + gy, x + w, y + gy, 'rgba(130,160,255,0.25)', 1);
  for (let gx = 0; gx <= w; gx += 60) line(g, x + gx, y, x + gx, y + h, 'rgba(130,160,255,0.25)', 1);
  const pts = r.phi.map((p, i) => [x + 60 * i, y + h - 8 * p] as [number, number]);
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 3;
  g.lineJoin = 'round';
  g.beginPath();
  pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
  g.stroke();
  g.lineJoin = 'miter';
  for (const [px, py] of pts) dot(g, px, py, 3, PAL.white);
  if (u >= 0) line(g, x + w * clamp01(u), y, x + w * clamp01(u), y + h, PAL.white, 2);
  text(g, '16 mWb', 424, 66, PAL.dim, 11, 'left');
  tag(g, '1 s', x + 30, y + h + 17, 'center', PAL.dim, 11);
  tag(g, 'flux per turn', 495, y + h + 33, 'center', PAL.dim, 11);
  tag(g, '×2 speed', 538, y + h + 17, 'right', PAL.dim, 11);
}

// ---- the console and Tug ---------------------------------------------------------------------------------------------------------------------------------------

const KNIFE = { x: 520, y: 296, len: 16 }; // level 1 knife switch pivot
const LEVER = { x: 536, y: 296, len: 16 }; // level 2 ramp lever pivot
const DIAL_AT = { x: 592, y: 290, r: 9 }; // level 2 ammeter dial
const CLOCK_AT = { x: 520, y: 288, r: 9 }; // level 3 dive timer at rest
const PLAY_AT = { x: 520, y: 290 }; // level 4 PLAY button

const bladeAngle = (rt: number) => -Math.PI / 2 - 1.2 * ease((rt - 0.1) / 0.2);
const knifeEnd = (a: number): [number, number] => [KNIFE.x + KNIFE.len * Math.cos(a), KNIFE.y + KNIFE.len * Math.sin(a)];
const leverAngle = (rt: number) => -2.1 + 1.05 * ease((rt - 0.3) / 0.2);
const leverEnd = (a: number): [number, number] => [LEVER.x + LEVER.len * Math.cos(a), LEVER.y + LEVER.len * Math.sin(a)];
const mix = (a: [number, number], b: [number, number], u: number): [number, number] => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];

/** Where Tug's claw is `rt` seconds after Signal (rt < 0 for resting), and how far it is open (0 shut, 1 wide). `flipEnd` is when the flip of level 3 ends. */
export function clawAt(n: 1 | 2 | 3 | 4, rt: number, flipEnd: number): { tip: [number, number]; open: number } {
  if (rt < 0) return { tip: REST_TIP, open: 0.2 };
  if (n === 1) {
    const grab = knifeEnd(-Math.PI / 2);
    if (rt < 0.12) return { tip: mix(REST_TIP, grab, ease(rt / 0.12)), open: 0.8 };
    if (rt < 0.3) return { tip: knifeEnd(bladeAngle(rt)), open: 0.1 };
    return { tip: mix(knifeEnd(bladeAngle(0.3)), REST_TIP, ease((rt - 0.35) / 0.2)), open: 0.4 };
  }
  if (n === 2) {
    const grab = leverEnd(leverAngle(0));
    if (rt < 0.3) return { tip: mix(REST_TIP, grab, ease(rt / 0.3)), open: 0.8 };
    if (rt < 0.5) return { tip: leverEnd(leverAngle(rt)), open: 0.1 };
    return { tip: mix(leverEnd(leverAngle(0.5)), REST_TIP, ease((rt - 0.55) / 0.2)), open: 0.4 };
  }
  if (n === 3) {
    const grab: [number, number] = [CLOCK_AT.x, CLOCK_AT.y - 8];
    const held: [number, number] = [548, 264];
    if (rt < 0.3) return { tip: mix(REST_TIP, grab, ease(rt / 0.3)), open: 0.8 };
    if (rt < flipEnd) return { tip: mix(grab, held, ease((rt - 0.3) / 0.2)), open: 0.05 };
    return { tip: mix(held, REST_TIP, ease((rt - flipEnd) / 0.25)), open: 0.4 };
  }
  const press: [number, number] = [PLAY_AT.x, PLAY_AT.y - 8 + 2 * ease((rt - 0.12) / 0.06) * (1 - ease((rt - 0.2) / 0.06))];
  if (rt < 0.12) return { tip: mix(REST_TIP, press, ease(rt / 0.12)), open: 0.1 };
  if (rt < 0.3) return { tip: press, open: 0.1 };
  return { tip: mix(press, REST_TIP, ease((rt - 0.3) / 0.2)), open: 0.4 };
}

/** The console body with its LCD readout and the controls of the level. `rt` is −1 before the dive. */
export function consoleBody(g: G, lcd: { s: string; color: string }) {
  fillRR(g, CONSOLE.x, CONSOLE.y, CONSOLE.w, CONSOLE.h, 4, '#2b3140', '#4a5266', 2);
  fillRR(g, LCD.x, LCD.y, LCD.w, LCD.h, 3, '#03060b', '#3a4256');
  text(g, lcd.s, LCD.x + LCD.w / 2, LCD.y + 13, lcd.color, 12);
}
export function consoleControls(g: G, n: 1 | 2 | 3 | 4, rt: number, o: { i1: number; i2: number; flipEnd: number; t: number }) {
  if (n === 1) {
    fillRR(g, KNIFE.x - 8, KNIFE.y - 2, 16, 4, 1, '#111');
    dot(g, KNIFE.x, KNIFE.y, 2.5, BRASS);
    const a = rt < 0 ? -Math.PI / 2 : bladeAngle(rt);
    const e = knifeEnd(a);
    line(g, KNIFE.x, KNIFE.y, e[0], e[1], '#d7dbe6', 2.5);
    dot(g, e[0], e[1], 2.5, PAL.red);
    dot(g, KNIFE.x, KNIFE.y - KNIFE.len, 1.8, BRASS);
  } else if (n === 2) {
    fillRR(g, LEVER.x - 8, LEVER.y - 2, 16, 4, 1, '#111');
    const a = rt < 0 ? leverAngle(0) : leverAngle(rt);
    const e = leverEnd(a);
    line(g, LEVER.x, LEVER.y, e[0], e[1], '#d7dbe6', 3);
    dot(g, e[0], e[1], 3, PAL.orange);
    // the ammeter: its needle swings from the i1 mark to the i2 mark
    dot(g, DIAL_AT.x, DIAL_AT.y, DIAL_AT.r, '#e9ecf5');
    g.strokeStyle = '#333';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(DIAL_AT.x, DIAL_AT.y, DIAL_AT.r - 1, Math.PI * 1.1, Math.PI * 1.9);
    g.stroke();
    const mark = (i: number) => Math.PI * 1.1 + Math.PI * 0.8 * clamp01(i / 50);
    for (const i of [o.i1, o.i2]) line(g, DIAL_AT.x + 5 * Math.cos(mark(i)), DIAL_AT.y + 5 * Math.sin(mark(i)), DIAL_AT.x + 8 * Math.cos(mark(i)), DIAL_AT.y + 8 * Math.sin(mark(i)), PAL.red, 1.5);
    const na = mark(o.i1) + (mark(o.i2) - mark(o.i1)) * (rt < 0 ? 0 : ease((rt - 0.3) / 0.2));
    line(g, DIAL_AT.x, DIAL_AT.y, DIAL_AT.x + 8 * Math.cos(na), DIAL_AT.y + 8 * Math.sin(na), '#111', 1.5);
    text(g, `I: ${o.i1} → ${o.i2} A`, 560, 246, PAL.dim, 11);
  } else if (n === 3) {
    // the dive timer sits on the console until the claw lifts it for the flip
    const held = rt >= 0.3 && rt < o.flipEnd + 0.25;
    if (!held) timer(g, CLOCK_AT.x, CLOCK_AT.y, 0);
    else {
      const c = clawAt(3, rt, o.flipEnd).tip;
      timer(g, c[0], c[1] - 9, clamp01((rt - 0.3) / (o.flipEnd - 0.3)));
    }
  } else {
    fillRR(g, PLAY_AT.x - 12, PLAY_AT.y - 2, 24, 8, 2, '#111');
    const push = rt < 0 ? 0 : ease((rt - 0.12) / 0.06) * (1 - ease((rt - 0.2) / 0.06));
    fillRR(g, PLAY_AT.x - 10, PLAY_AT.y - 6 + 2 * push, 20, 7, 2, PAL.green);
    g.fillStyle = '#06230f';
    g.beginPath();
    g.moveTo(PLAY_AT.x - 2.5, PLAY_AT.y - 4.5 + 2 * push);
    g.lineTo(PLAY_AT.x + 3, PLAY_AT.y - 2.5 + 2 * push);
    g.lineTo(PLAY_AT.x - 2.5, PLAY_AT.y - 0.5 + 2 * push);
    g.fill();
    if (rt >= 0 && rt < 1.8 && (calm() || Math.floor(rt * 4) % 2 === 0)) text(g, '▶', 560, 294, PAL.green, 11);
  }
}
function timer(g: G, x: number, y: number, sweep: number) {
  dot(g, x, y, CLOCK_AT.r, '#e9ecf5');
  g.strokeStyle = '#333';
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(x, y, CLOCK_AT.r, 0, Math.PI * 2);
  g.stroke();
  dot(g, x, y - CLOCK_AT.r - 2, 2, '#333');
  const a = -Math.PI / 2 + sweep * Math.PI * 2;
  line(g, x, y, x + 7 * Math.cos(a), y + 7 * Math.sin(a), PAL.red, 1.6);
}

export type TugMood = 'idle' | 'win' | 'dim' | 'blown';
export interface TugOpts { n: 1 | 2 | 3 | 4; rt: number; flipEnd: number; mood: TugMood; u: number }
/** Tug the robot submarine: a yellow box frame with two ducted thrusters, a dome with a screen and LED eyes, three top lights, a tether and a manipulator arm. */
export function tug(g: G, t: number, o: TugOpts) {
  const bob = Math.sin(t * 2) * 2;
  const drop = o.mood === 'blown' ? 16 * ease(o.u / 0.3) : 0;
  const tilt = o.mood === 'dim' ? (10 * Math.PI) / 180 * ease(o.u / 0.2) : 0;
  const cx = TUG.x;
  const cy = TUG.y + bob + drop;
  // the manipulator arm reaches toward the console (drawn first, under the body)
  const claw = o.mood === 'win' && o.u >= 0 ? { tip: REST_TIP, open: Math.floor(o.u / 0.15) % 2 ? 1 : 0.1 } : clawAt(o.n, o.rt, o.flipEnd);
  const tip: [number, number] = o.mood === 'blown' ? [REST_TIP[0], REST_TIP[1] + 12] : claw.tip;
  const sh: [number, number] = [cx - 18, cy + 12];
  const el: [number, number] = [(sh[0] + tip[0]) / 2 - 8, Math.max(sh[1], tip[1]) - 4 + Math.abs(tip[0] - sh[0]) * 0.1];
  limb(g, [sh, el, tip], '#3a3f4a', 4);
  dot(g, el[0], el[1], 2.4, BRASS);
  const op = claw.open;
  for (const s of [-1, 1]) line(g, tip[0], tip[1], tip[0] + s * (2 + 4 * op), tip[1] + 7, '#cfd3de', 2);
  // tether cable rising out of the screen
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(cx, cy - 17);
  g.bezierCurveTo(cx + 50 + Math.sin(t * 1.4) * 4, cy - 30, cx + 58, cy - 150, cx + 44 + Math.sin(t * 1.1) * 4, -10);
  g.stroke();
  g.save();
  g.translate(cx, cy);
  g.rotate(tilt);
  // ducted thrusters with spinning blades
  for (const s of [-1, 1]) {
    fillRR(g, s * 33 - 7, -9, 14, 18, 4, '#2a2f3a', '#12151c');
    const a = t * 6 * s;
    for (let b = 0; b < 3; b++) line(g, s * 33, 0, s * 33 + Math.cos(a + (b * 2 * Math.PI) / 3) * 5, Math.sin(a + (b * 2 * Math.PI) / 3) * 7, '#cfd3de', 1.6);
  }
  // the yellow box frame, black corner bars and four bolts
  fillRR(g, -24, -17, 48, 34, 4, PAL.yellow, '#8a6d10');
  g.fillStyle = '#111';
  for (const [bx, by] of [[-24, -17], [24, -17], [-24, 17], [24, 17]]) {
    g.fillRect(bx - (bx > 0 ? 6 : 0), by - (by > 0 ? 3 : 0), 6, 3);
    g.fillRect(bx - (bx > 0 ? 3 : 0), by - (by > 0 ? 6 : 0), 3, 6);
    dot(g, bx + (bx > 0 ? -5 : 5), by + (by > 0 ? -5 : 5), 1.3, '#6b5410');
  }
  // the clear front dome with the black screen and LED eyes
  dot(g, 0, 0, 12.5, 'rgba(200,240,255,0.22)');
  g.strokeStyle = 'rgba(220,245,255,0.7)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(0, 0, 12.5, 0, Math.PI * 2);
  g.stroke();
  fillRR(g, -9, -7, 18, 14, 3, '#06080f');
  const blink = t % 3 < 0.12;
  g.fillStyle = PAL.cyan;
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1.8;
  if (o.mood === 'win' && o.u >= 0) {
    for (const ex of [-4.5, 4.5]) {
      g.beginPath();
      g.arc(ex, 1.5, 2.6, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    }
  } else if (o.mood === 'dim' && o.u >= 0) {
    line(g, -7, 0, -2, 0, PAL.cyan, 1.8);
    line(g, 2, 0, 7, 0, PAL.cyan, 1.8);
  } else if (o.mood === 'blown' && o.u >= -0.2) {
    for (const ex of [-4.5, 4.5]) {
      line(g, ex - 2.5, -3, ex + 2, 0, PAL.cyan, 1.6);
      line(g, ex + 2, 0, ex - 2.5, 3, PAL.cyan, 1.6);
    }
  } else {
    fillRR(g, -7, -4, 4.5, blink ? 1.5 : 6, 2, PAL.cyan);
    fillRR(g, 2.5, -4, 4.5, blink ? 1.5 : 6, 2, PAL.cyan);
  }
  // three top lights, glowing in turn every second
  for (let i = 0; i < 3; i++) dot(g, -10 + i * 10, -21, 2.5, Math.floor(t) % 3 === i ? PAL.green : '#2b3a30');
  g.restore();
}

// ---- Kavya the diver -------------------------------------------------------------------------------------------------------------------------------------------

export type KavyaMood = 'happy' | 'cheer' | 'worried' | 'frazzled';
export interface KavyaOpts { mood: KavyaMood; rt: number; u: number; rod: [number, number] | null }
/** Kavya: round copper helmet with a faceplate and valve, brass breastplate, grey-blue suit, weight belt, lead boots, knife, chest lamp, air hose, dive computer. */
export function kavya(g: G, t: number, o: KavyaOpts) {
  const bob = Math.sin(t * 1.5) * 1.5;
  const sway = Math.sin(t * 1.2) * 4;
  // the air hose, from the back of the helmet up and out of the top of the screen
  g.strokeStyle = '#0c0c10';
  g.lineWidth = 3.4;
  g.beginPath();
  g.moveTo(137, 188 + bob);
  g.bezierCurveTo(100, 196, 112 + sway * 0.4, 100, 118 + sway, -10);
  g.stroke();
  g.save();
  g.translate(0, bob);
  // legs, knees slightly bent, lead boots and the knife on the right calf
  limb(g, [[144, 262], [141, 280], [142, 291]], '#46607a', 11);
  limb(g, [[158, 262], [164, 280], [161, 291]], '#46607a', 11);
  fillRR(g, 131, 289, 18, 11, 3, '#4a4f5a', '#2a2e36');
  fillRR(g, 154, 289, 18, 11, 3, '#4a4f5a', '#2a2e36');
  limb(g, [[170, 276], [172, 290]], '#c7ccd6', 2.6);
  limb(g, [[170, 274], [170, 277]], '#6b4a1a', 3.4);
  // the torso, weight belt with three lead blocks, breastplate with four bolts and the chest lamp
  fillRR(g, 136, 232, 28, 34, 5, '#5f7a96', '#3b5068');
  fillRR(g, 135, 244, 30, 6, 2, '#3a2e1c');
  for (const bx of [138, 147, 156]) fillRR(g, bx, 249, 6, 6, 1, '#555b68');
  fillRR(g, 136, 209, 28, 32, 5, BRASS, '#8a6a22', 1.5);
  for (const [bx, by] of [[140, 214], [160, 214], [140, 236], [160, 236]]) dot(g, bx, by, 1.4, '#8a6a22');
  dot(g, 150, 226, 4.5, '#fff6cf');
  halo(g, 150, 226, 12, '#ffe9a8', 0.5);
  // the right arm out to the rod, a thick glove, the rod itself
  limb(g, [[164, 218], [186, 228], [HAND.x, HAND.y]], '#5f7a96', 8);
  if (o.rod) rod(g, o.rod);
  dot(g, HAND.x, HAND.y, 5.2, '#2c2f38');
  // the left arm: resting on the hose, the diver's OK sign on the signal, a thumbs-up on a win
  const okAmt = o.rt < 0 ? 0 : o.rt < 0.8 ? ease(o.rt / 0.25) : 1 - ease((o.rt - 0.8) / 0.2);
  const cheerAmt = o.mood === 'cheer' && o.u >= 0 ? (o.u < 0.6 ? ease(o.u / 0.15) : 1 - ease((o.u - 0.6) / 0.2)) : 0;
  const up = Math.max(okAmt, cheerAmt);
  const hand: [number, number] = [123 - 3 * up, 200 - 22 * up];
  const elbow: [number, number] = [118, 222];
  limb(g, [[134, 220], elbow, hand], '#5f7a96', 8);
  const wr = mix(elbow, hand, 0.82);
  fillRR(g, wr[0] - 3, wr[1] - 3, 6, 6, 1, '#101216');
  dot(g, wr[0] + 1, wr[1] - 1, 1, PAL.green);
  dot(g, hand[0], hand[1], 5.2, '#2c2f38');
  if (up > 0.5) {
    if (cheerAmt >= okAmt && cheerAmt > 0) {
      fillRR(g, hand[0] - 1.6, hand[1] - 11, 3.6, 7, 1.5, '#2c2f38');
    } else {
      g.strokeStyle = '#8a8f9c';
      g.lineWidth = 1.4;
      g.beginPath();
      g.arc(hand[0] - 1, hand[1] - 6, 2.6, 0, Math.PI * 2);
      g.stroke();
      for (let i = 0; i < 3; i++) line(g, hand[0] + 1 + i * 2.4, hand[1] - 4, hand[0] + 2 + i * 2.8, hand[1] - 11, '#2c2f38', 2);
    }
  }
  // the helmet (knocked 15° askew when frazzled)
  g.save();
  if (o.mood === 'frazzled') {
    g.translate(150, 207);
    g.rotate((15 * Math.PI) / 180);
    g.translate(-150, -207);
  }
  fillRR(g, 138, 205, 24, 7, 3, BRASS, '#8a6a22');
  dot(g, 150, 192, 17, '#b8733a');
  g.strokeStyle = '#7a4a22';
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(150, 192, 17, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = 'rgba(255,220,170,0.55)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(150, 192, 14, Math.PI * 1.15, Math.PI * 1.45);
  g.stroke();
  for (const sx of [-14.5, 14.5]) dot(g, 150 + sx, 192, 2.2, '#1d3550');
  dot(g, 150, 192, 11.5, BRASS);
  dot(g, 150, 192, 10, '#10283d');
  for (let i = 0; i < 6; i++) dot(g, 150 + Math.cos((i * Math.PI) / 3) * 12.8, 192 + Math.sin((i * Math.PI) / 3) * 12.8, 1.3, '#8a6a22');
  // her face inside the faceplate: skin, dark hair at the edge, then the mood
  dot(g, 150, 192, 8.6, '#c98b5e');
  g.fillStyle = '#2a1a14';
  g.beginPath();
  g.arc(150, 192, 8.6, Math.PI * 1.05, Math.PI * 1.95);
  g.arc(150, 190, 6.8, Math.PI * 1.9, Math.PI * 1.1, true);
  g.fill();
  const glance = o.mood === 'happy' && t % 5 < 0.6 ? -1.5 : 0;
  if (o.mood === 'frazzled') {
    spiral(g, 146, 192, 3.2, t);
    spiral(g, 154, 192, 3.2, -t);
    for (const [fx, fy] of [[143, 187], [150, 185], [157, 188], [145, 197], [155, 198]]) dot(g, fx, fy, 1.3, 'rgba(160,160,170,0.9)');
  } else {
    face(g, 150, 192 + glance, 8.6, o.mood === 'cheer' ? 'cheer' : o.mood === 'worried' ? 'worried' : 'happy', t, '#2a1a14');
    if (t % 3 < 0.14 && o.mood !== 'cheer') {
      g.fillStyle = '#c98b5e';
      g.fillRect(142, 189, 16, 5);
      line(g, 144, 191, 148, 191, '#2a1a14', 1.4);
      line(g, 152, 191, 156, 191, '#2a1a14', 1.4);
    }
  }
  g.restore();
  // the brass exhaust valve on the right of the helmet
  fillRR(g, 165, 188, 7, 8, 2, BRASS, '#8a6a22');
  // a sweat drop outside the helmet when she is worried
  if (o.mood === 'worried') {
    g.fillStyle = PAL.cyan;
    g.beginPath();
    g.moveTo(171, 172 + ((t * 10) % 5));
    g.quadraticCurveTo(174, 177 + ((t * 10) % 5), 171, 180 + ((t * 10) % 5));
    g.quadraticCurveTo(168, 177 + ((t * 10) % 5), 171, 172 + ((t * 10) % 5));
    g.fill();
  }
  g.restore();
  // idle bubbles from the valve: three every 1.5 s, wobbling as they rise 60 px (more in a burst when she signals)
  for (let i = 0; i < 3; i++) {
    const ph = frac(t / 1.5 + i / 3);
    g.globalAlpha = 0.7 * (1 - ph * 0.6);
    dot(g, 173 + Math.sin(t * 6 + i * 2) * 2, 190 - 60 * ph + bob, 2 + (i % 3), 'rgba(220,240,255,1)');
  }
  g.globalAlpha = 1;
}

// ---- Wink the sealed beacon ------------------------------------------------------------------------------------------------------------------------------------

export type WinkMood = 'sleepy' | 'win' | 'dim' | 'blown';
export interface WinkOpts { x: number; y: number; glow: number; mood: WinkMood; /** Seconds since the crack (blown), else −1. */ u: number; bubbles: boolean }
export const winkBob = (t: number) => Math.sin(t * 2) * 3;
function bulbPath(g: G, x: number, y: number) {
  g.beginPath();
  g.moveTo(x - 6, y + 22);
  g.lineTo(x - 7, y + 13.27);
  g.arc(x, y, 15, Math.PI - 1.084, Math.PI * 2 + 1.084);
  g.lineTo(x + 6, y + 22);
  g.closePath();
}
/** Wink: a pear-shaped glass bulb with a brass screw base, an orange float collar and a coiled filament, with a face. */
export function wink(g: G, t: number, o: WinkOpts) {
  const x = o.x;
  const y = o.y + winkBob(t);
  const lit = o.glow > 0.01;
  halo(g, x, y, 40, '#ffd27a', o.glow);
  if (o.glow >= 0.999) {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      line(g, x + Math.cos(a) * 22, y + Math.sin(a) * 22, x + Math.cos(a) * 32, y + Math.sin(a) * 32, '#ffe9a8', 2);
    }
  }
  // base and collar
  fillRR(g, x - 6, y + 22, 12, 8, 2, BRASS, '#8a6a22');
  line(g, x - 6, y + 26, x + 6, y + 26, '#8a6a22', 1);
  g.beginPath();
  g.ellipse(x, y + 23, 11, 3, 0, 0, Math.PI * 2);
  g.fillStyle = PAL.orange;
  g.fill();
  // glass
  bulbPath(g, x, y);
  g.fillStyle = lit ? `rgba(255,236,170,${0.25 + 0.5 * o.glow})` : 'rgba(200,230,255,0.22)';
  g.fill();
  if (o.mood === 'blown' && o.u >= 0) {
    g.save();
    bulbPath(g, x, y);
    g.clip();
    const hgt = 38 * clamp01(o.u / 0.5);
    g.fillStyle = 'rgba(60,140,220,0.6)';
    g.fillRect(x - 20, y + 22 - hgt, 40, hgt);
    g.restore();
  }
  g.strokeStyle = 'rgba(225,242,255,0.85)';
  g.lineWidth = 1.6;
  bulbPath(g, x, y);
  g.stroke();
  // the coiled filament
  g.strokeStyle = o.mood === 'blown' && o.u >= 0 ? '#000' : lit ? '#fff6cf' : '#6a5a44';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(x - 3, y + 14);
  for (let i = 0; i < 6; i++) g.lineTo(x + (i % 2 ? 3 : -3), y + 11 - i * 3);
  g.stroke();
  // the face
  const ey = y - 3;
  if (o.mood === 'blown' && o.u >= 0) {
    spiral(g, x - 5, ey, 3.2, t, '#d8e8ff');
    spiral(g, x + 5, ey, 3.2, -t, '#d8e8ff');
  } else if (o.mood === 'win') {
    for (const ex of [-5, 5]) {
      dot(g, x + ex, ey, 2.9, '#ffffff');
      dot(g, x + ex, ey + 0.4, 1.4, INK);
    }
    g.strokeStyle = INK;
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(x, y + 3, 4.6, 0.1 * Math.PI, 0.9 * Math.PI);
    g.stroke();
  } else {
    // half-closed, sleepy eyes (and a sad mouth when dim)
    for (const ex of [-5, 5]) {
      g.fillStyle = INK;
      g.beginPath();
      g.ellipse(x + ex, ey + 0.8, 2.6, 1.2, 0, 0, Math.PI * 2);
      g.fill();
      line(g, x + ex - 3, ey - 0.2, x + ex + 3, ey - 0.2, INK, 1.2);
    }
    g.strokeStyle = INK;
    g.lineWidth = 1.4;
    g.beginPath();
    if (o.mood === 'dim') g.arc(x, y + 9.5, 3.4, Math.PI * 1.15, Math.PI * 1.85);
    else {
      g.moveTo(x - 3, y + 6);
      g.lineTo(x + 3, y + 6);
    }
    g.stroke();
  }
  // a small z every 4 s while it sleeps
  if (o.mood === 'sleepy') {
    const zp = (t % 4) / 1.6;
    if (zp < 1) {
      g.globalAlpha = 1 - zp;
      text(g, 'z', x + 17 + zp * 4, y - 12 - zp * 8, PAL.dim, 11);
      g.globalAlpha = 1;
    }
  }
  if (o.mood === 'blown' && o.u >= 0) {
    // three jagged white cracks
    for (const c of [[[-3, -14], [1, -8], [-2, -2], [3, 5]], [[6, -10], [3, -5], [8, 0]], [[-8, -3], [-4, 2], [-9, 7]]]) {
      g.strokeStyle = '#ffffff';
      g.lineWidth = 1.4;
      g.beginPath();
      c.forEach(([cx, cy], i) => (i ? g.lineTo(x + cx, y + cy) : g.moveTo(x + cx, y + cy)));
      g.stroke();
    }
    if (o.bubbles) {
      for (let i = 0; i < 4; i++) {
        const ph = frac(t * 1.2 + i * 0.37);
        g.globalAlpha = 1 - ph;
        dot(g, x + [-3, 1, 6, -8][i] + Math.sin(t * 6 + i) * 2, y - 10 - ph * 42, 1.8 + (i % 2), '#e6f6ff');
      }
      g.globalAlpha = 1;
    }
  }
}
// ---- the topside monitor, the dive slate -------------------------------------------------------------------------------------------------------------------

export type TopState = 'idle' | 'win' | 'dim' | 'blown';
/** The monitor on the survey ship showing what its camera sees, with a cable up to the top edge. */
export function topside(g: G, t: number, s: TopState) {
  line(g, 78, 0, 78, 52, '#1a1a1a', 2);
  fillRR(g, 16, 52, 124, 24, 3, '#0a0d18', '#4a5266', 2);
  const word = s === 'idle' ? 'WATCHING…' : s === 'win' ? 'SPOTTED!' : s === 'dim' ? 'NOTHING…' : 'BEACON LOST';
  const col = s === 'idle' ? PAL.dim : s === 'win' ? PAL.yellow : s === 'dim' ? PAL.dim : PAL.red;
  if (s === 'win' && !calm() && Math.floor(t * 4) % 2 === 1) return;
  text(g, word, 78, 69, col, 12);
}
/** The diver's slate that drops in for 0.8 s at the start of each round. `u` is the seconds since the round began. */
export function slate(g: G, u: number, label: string) {
  if (u < 0 || u > 0.8) return;
  const y = u < 0.2 ? -30 + 92 * easeOut(u / 0.2) : u > 0.6 ? 62 - 92 * ease((u - 0.6) / 0.2) : 62;
  g.save();
  g.translate(320, y);
  g.rotate(0.03);
  fillRR(g, -45, -18, 90, 36, 4, '#f1efe6', '#9a968a', 2);
  line(g, 38, -18, 44, 8, '#8a6a22', 1.5);
  text(g, label, 0, 5, '#1b1b22', label.length > 7 ? 14 : 16);
  g.restore();
}
