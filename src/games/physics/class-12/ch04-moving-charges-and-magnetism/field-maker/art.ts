// The drawing of "Turtle Compass" (field-maker): a sea-turtle lab seen from above, the coils, the trim wire, the supply, the gauge,
// the lab card, the field meter, and the characters Leilani (biologist), Nui (hatchling) and the bucket hatchlings.
// Pure drawing: the rules stay in logic.ts and the timeline stays in index.ts.
import { PAL } from '@core/arcade';
import { face } from '@core/mathkit';
import { glow, line, text } from '@core/neon';
import { angleOf, type TrimRow } from './logic';

type G = CanvasRenderingContext2D;
const DEG = Math.PI / 180;

export const LEI = { x: 52, feet: 318 }; // Leilani, about 76 px tall (x 16 to 90, y 242 to 318)
export const TANK = { x: 320, y: 176, r: 84 }; // the round hatchling tank (top view)
export const COIL_R = 102; // the coil's drawn radius in L2 to L4; L3's arc lies on this circle
export const INNER_R = 98; // L5 inner coil
export const OUTER_R = 118; // L5 outer coil (the player's)
export const GATES = { sea: 90, shallows: 150, rocks: 30 }; // gate angles on the tank rim, degrees anticlockwise from east
export const gatePt = (deg: number): [number, number] => [TANK.x + TANK.r * Math.cos(deg * DEG), TANK.y - TANK.r * Math.sin(deg * DEG)];
export const CARD = { x: 12, y: 40, w: 192, h: 84 }; // the lab card with the round's given facts (top left)
export const LCD = { x: 458, y: 296, w: 172, h: 20 }; // the field meter on the cart: the helper
export const SUPPLY = { x: 476, y: 196, w: 70, h: 56 }; // the coil supply box
export const KNOB = { x: 511, y: 224 }; // its sense knob (L1: the trim current's direction)
export const TRK = { x0: 160, x1: 440, y: 326 }; // bottom handle track: L1 current, L2/L4/L5 turns
export const BUCKET = { x: 150, y: 256 }; // the hatchling bucket (centre of its rim)
export const GAUGE = { x: 560, y: 150, r: 40 }; // L1: the probe's dial gauge
export const PROBE_D = 120; // L1: the trim wire's drawn distance from the probe (a picture, not to scale)
export const SIDE = { x: 470, y: 40, w: 160, h: 100 }; // L4: the side-view inset (top right)
export const GOAL = { x: 320, y: 22 };
export const HIT: [number, number] = [320, 56];

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (u: number) => clamp01(u) * clamp01(u) * (3 - 2 * clamp01(u));
const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
const INK = '#1b1030';
const COPPER = '#b87333';
const COPPER_L = '#f0b070';

function rrect(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** A pill of dark glass behind a line of text. Widths are estimated, so tests need no text metrics. */
export function tag(g: G, s: string, x: number, y: number, align: 'left' | 'right' | 'center', color: string = PAL.yellow, size = 12) {
  const w = s.length * (size * 0.58) + 10;
  const x0 = align === 'left' ? x - 5 : align === 'right' ? x - w + 5 : x - w / 2;
  g.fillStyle = 'rgba(6,10,36,0.82)';
  rrect(g, x0, y - size - 1, w, size + 6, 4);
  g.fill();
  text(g, s, x, y, color, size, align);
}

/** The round's goal, one line on a dark plate at the top of the scene. */
export function goalLine(g: G, s: string) {
  const w = s.length * 7.6 + 20;
  g.fillStyle = 'rgba(0,0,0,0.6)';
  rrect(g, GOAL.x - w / 2, GOAL.y - 15, w, 24, 8);
  g.fill();
  text(g, s, GOAL.x, GOAL.y + 2, PAL.white, 13);
}

/** A handle's grip: a white ring with a glyph, filled yellow while it is dragged. */
export function handleGrip(g: G, x: number, y: number, glyph: string, hot: boolean) {
  g.fillStyle = hot ? 'rgba(255,210,63,0.35)' : 'rgba(10,16,48,0.55)';
  g.beginPath();
  g.arc(x, y, 20, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = hot ? PAL.yellow : PAL.white;
  g.lineWidth = hot ? 4 : 2;
  g.beginPath();
  g.arc(x, y, 20, 0, Math.PI * 2);
  g.stroke();
  text(g, glyph, x, y + 5, hot ? PAL.yellow : PAL.white, 14);
}

// ---------------------------------------------------------------- the room

/** The lab floor, the window on the sea (moonrise, midnight, dawn by round k) and the shielded-room sign. */
export function lab(g: G, t: number, k: number, sign: boolean) {
  g.fillStyle = '#141c2e';
  g.fillRect(-10, -10, 660, 360);
  for (let x = 0; x <= 640; x += 40) line(g, x, 0, x, 340, 'rgba(120,150,190,0.10)', 1);
  for (let y = 0; y <= 340; y += 40) line(g, 0, y, 640, y, 'rgba(120,150,190,0.10)', 1);
  // the window
  g.fillStyle = k === 2 ? '#2a2038' : '#0a1a30';
  g.fillRect(470, 0, 160, 30);
  g.fillStyle = k === 2 ? '#0e3150' : '#0b2a4a';
  g.fillRect(470, 18, 160, 12);
  if (k === 2) {
    g.fillStyle = 'rgba(255,150,100,0.75)';
    g.fillRect(470, 12, 160, 6);
    g.fillStyle = 'rgba(255,190,120,0.5)';
    g.fillRect(470, 18, 160, 4);
  } else if (k === 0) {
    g.fillStyle = 'rgba(255,214,90,0.95)';
    g.beginPath();
    g.arc(505, 17, 5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,214,90,0.35)';
    g.fillRect(501, 20, 8, 2);
    g.fillRect(499, 24, 12, 2);
  } else {
    g.fillStyle = 'rgba(245,247,255,0.95)';
    g.beginPath();
    g.arc(590, 8, 5, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 7; i++) {
      g.globalAlpha = 0.5 + 0.4 * Math.sin(t * 0.8 + i);
      g.fillRect(482 + i * 19, 4 + ((i * 7) % 9), 1.5, 1.5);
    }
    g.globalAlpha = 1;
  }
  line(g, 470, 30, 630, 30, '#3a4660', 3);
  line(g, 550, 0, 550, 30, '#3a4660', 2);
  if (k === 2) text(g, 'DAWN RELEASE', 550, 44, PAL.pink, 11);
  else if (sign) text(g, 'SHIELDED ROOM', 560, 44, PAL.dim, 11);
  // the cart that carries the field meter
  g.fillStyle = '#1d2740';
  g.fillRect(440, 288, 200, 52);
  line(g, 440, 288, 640, 288, '#3a4660', 2);
  if (k === 1) {
    glow(g, '#ffe9a8', 14, () => {
      g.fillStyle = '#ffe9a8';
      g.beginPath();
      g.arc(616, 276, 6, Math.PI, 2 * Math.PI);
      g.fill();
    });
    line(g, 616, 276, 616, 288, '#8f9bd6', 2);
  }
}

const WATER = ['#1d4f7a', '#1a466e', '#244f78'];
/** The tank water (tinted by round) with slow ripples. */
export function tank(g: G, t: number, k: number) {
  g.fillStyle = WATER[Math.min(2, k)];
  g.beginPath();
  g.arc(TANK.x, TANK.y, TANK.r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(190,225,255,0.16)';
  g.lineWidth = 1.5;
  for (let i = 0; i < 2; i++) {
    const f = calm() ? 0.5 : (t * 0.25 + i * 0.5) % 1;
    g.beginPath();
    g.arc(TANK.x, TANK.y, 20 + f * 56, 0, Math.PI * 2);
    g.stroke();
  }
}

/** The tank rim with its three gates; `failed` is the gate the hatchling bumped. */
export function gates(g: G, t: number, failed: 'shallows' | 'rocks' | null) {
  const half = 7.5;
  const gs = [GATES.rocks, GATES.sea, GATES.shallows].sort((a, b) => a - b);
  g.strokeStyle = '#cfe3f0';
  g.lineWidth = 4;
  for (let i = 0; i < gs.length; i++) {
    const a1 = gs[i] + half;
    const a2 = (i + 1 < gs.length ? gs[i + 1] : gs[0] + 360) - half;
    g.beginPath();
    g.arc(TANK.x, TANK.y, TANK.r, -a2 * DEG, -a1 * DEG);
    g.stroke();
  }
  for (const a of [GATES.shallows, GATES.rocks]) {
    const [px, py] = gatePt(a);
    const tx = -Math.sin(a * DEG);
    const ty = -Math.cos(a * DEG);
    g.strokeStyle = '#8a93a8';
    g.lineWidth = 1.5;
    for (let j = -2; j <= 2; j++) {
      const o = j * 4.4;
      g.beginPath();
      g.moveTo(px + tx * (o - 5) - Math.cos(a * DEG) * 5, py + ty * (o - 5) + Math.sin(a * DEG) * 5);
      g.lineTo(px + tx * (o + 5) + Math.cos(a * DEG) * 5, py + ty * (o + 5) - Math.sin(a * DEG) * 5);
      g.moveTo(px + tx * (o - 5) + Math.cos(a * DEG) * 5, py + ty * (o - 5) - Math.sin(a * DEG) * 5);
      g.lineTo(px + tx * (o + 5) - Math.cos(a * DEG) * 5, py + ty * (o + 5) + Math.sin(a * DEG) * 5);
      g.stroke();
    }
  }
  // the open sea: an open channel with little wave marks
  const [sx, sy] = gatePt(GATES.sea);
  line(g, sx - 11, sy - 4, sx - 11, sy - 24, '#cfe3f0', 3);
  line(g, sx + 11, sy - 4, sx + 11, sy - 24, '#cfe3f0', 3);
  for (let i = 0; i < 3; i++) {
    const wx = sx - 6 + i * 6;
    const wy = sy - 8 - i * 6 + (calm() ? 0 : Math.sin(t * 2 + i) * 1.5);
    g.strokeStyle = 'rgba(190,230,255,0.8)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(wx, wy, 3, Math.PI, 2 * Math.PI);
    g.stroke();
  }
  text(g, 'OPEN SEA', sx, sy + 24, '#bfe9ff', 11);
  text(g, 'SHALLOWS', 275, 148, '#c8d2e8', 11);
  text(g, 'ROCKS', 367, 148, '#c8d2e8', 11);
  if (failed) {
    const [fx, fy] = gatePt(GATES[failed]);
    const o = failed === 'rocks' ? 16 : -16;
    text(g, '✗', fx + o, fy - 6, PAL.red, 18);
  }
}

// ---------------------------------------------------------------- coils and wires

const ang = (a: number, R: number): [number, number] => [TANK.x + R * Math.cos(a), TANK.y - R * Math.sin(a)];
function arrowAt(g: G, a: number, R: number, dir: number, color = '#ffffff') {
  const [x, y] = ang(a, R);
  const tx = -Math.sin(a) * dir;
  const ty = -Math.cos(a) * dir;
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x + tx * 6, y + ty * 6);
  g.lineTo(x - tx * 4 - ty * 4, y - ty * 4 + tx * 4);
  g.lineTo(x - tx * 4 + ty * 4, y - ty * 4 - tx * 4);
  g.closePath();
  g.fill();
}
function dotsOn(g: G, a0: number, a1: number, R: number, dir: number, rt: number, n: number) {
  const span = a1 - a0;
  for (let i = 0; i < n; i++) {
    const f = (((rt / 0.8) * dir + i / n) % 1 + 1) % 1;
    const [x, y] = ang(a0 + f * span, R);
    glow(g, '#ffe9a8', 8, () => {
      g.fillStyle = '#fff6d0';
      g.beginPath();
      g.arc(x, y, 3.2, 0, Math.PI * 2);
      g.fill();
    });
  }
}

export interface CoilOpts { rt: number; alpha?: number; tag?: string; arrows?: boolean }
/** A copper coil band on a circle, with sense arrows; while `rt >= 0` it glows and bright dots run round it in its sense. */
export function coilRing(g: G, R: number, sense: number, o: CoilOpts) {
  const dir = sense ? 1 : -1;
  g.globalAlpha = o.alpha ?? 1;
  const on = o.rt >= 0;
  if (on) {
    glow(g, '#ff9b3d', 16, () => {
      g.strokeStyle = COPPER;
      g.lineWidth = 8;
      g.beginPath();
      g.arc(TANK.x, TANK.y, R, 0, Math.PI * 2);
      g.stroke();
    });
  }
  g.strokeStyle = COPPER;
  g.lineWidth = 8;
  g.beginPath();
  g.arc(TANK.x, TANK.y, R, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = COPPER_L;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(TANK.x, TANK.y, R + 1.5, 0, Math.PI * 2);
  g.stroke();
  if (o.arrows !== false) for (let i = 0; i < 4; i++) arrowAt(g, (i * Math.PI) / 2 + Math.PI / 4, R, dir);
  if (on) dotsOn(g, 0, Math.PI * 2, R, dir, o.rt, 8);
  if (o.tag) text(g, o.tag, TANK.x - R * 0.72 - 6, TANK.y - R * 0.72 - 6, PAL.white, 11);
  g.globalAlpha = 1;
}

/** The wire from a coil to the supply. */
export function supplyWire(g: G, R: number) {
  g.strokeStyle = '#2a2a30';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(TANK.x + R + 4, TANK.y + 2);
  g.lineTo(SUPPLY.x - 4, SUPPLY.y + 22);
  g.stroke();
}

/** L3: a copper arc from east anticlockwise to deg, its two straight leads, and the dotted guide circle (no ticks or numbers). */
export function arcWire(g: G, deg: number, sense: number, o: { rt: number; leadTags: boolean }) {
  const R = COIL_R;
  g.setLineDash([3, 6]);
  g.strokeStyle = 'rgba(200,215,255,0.25)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(TANK.x, TANK.y, R, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);
  const a = deg * DEG;
  const [ex, ey] = ang(a, R);
  const [e2x, e2y] = ang(a, 150);
  const [c1x, c1y] = ang(-8 * DEG, 150);
  // leads: the east one runs straight out, the other leaves along the radius and goes round the unused part of the circle
  g.lineWidth = 4;
  g.strokeStyle = '#e0282d';
  g.beginPath();
  g.moveTo(TANK.x + R, TANK.y);
  g.lineTo(TANK.x + 150, TANK.y);
  g.lineTo(SUPPLY.x + 22, SUPPLY.y);
  g.stroke();
  g.strokeStyle = '#2a2a30';
  g.beginPath();
  g.moveTo(ex, ey);
  g.lineTo(e2x, e2y);
  if (deg < 360) g.arc(TANK.x, TANK.y, 150, -a, 8 * DEG, true);
  g.lineTo(c1x, c1y);
  g.lineTo(SUPPLY.x + 10, SUPPLY.y);
  g.stroke();
  if (o.leadTags) {
    tag(g, 'lead → centre', TANK.x + 126, TANK.y - 10, 'center', PAL.white, 11);
    const [mx, my] = ang(a, 130);
    tag(g, 'lead → centre', mx + (Math.cos(a) >= 0 ? 36 : -36), my + (Math.sin(a) >= 0 ? -14 : 14), 'center', PAL.white, 11);
  }
  // the arc
  const on = o.rt >= 0;
  const path = () => {
    g.beginPath();
    g.arc(TANK.x, TANK.y, R, -a, 0);
  };
  if (on) glow(g, '#ff9b3d', 14, () => { g.strokeStyle = COPPER; g.lineWidth = 6; path(); g.stroke(); });
  g.strokeStyle = COPPER;
  g.lineWidth = 6;
  path();
  g.stroke();
  g.strokeStyle = COPPER_L;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(TANK.x, TANK.y, R + 1, -a, 0);
  g.stroke();
  const dir = sense ? 1 : -1;
  for (let i = 0; i < 4; i++) arrowAt(g, (a * (i + 0.5)) / 4, R, dir);
  if (on) dotsOn(g, 0, a, R, dir, o.rt, 8);
}

/** Where the L1 trim wire's centre is drawn: a picture, not to scale. */
export const wireAt = (r: TrimRow): [number, number] => [TANK.x - PROBE_D * Math.cos(r.th * DEG), TANK.y + (r.side === 'north' ? 1 : -1) * PROBE_D * Math.sin(r.th * DEG)];

/** The sensor puck at the tank's centre (green LED blinks slowly). */
export function probe(g: G, t: number) {
  g.fillStyle = '#0a0a10';
  rrect(g, TANK.x - 9, TANK.y - 9, 18, 18, 4);
  g.fill();
  g.strokeStyle = '#4a5078';
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = Math.floor(t * 0.5) % 2 ? '#2a6a44' : PAL.green;
  g.beginPath();
  g.arc(TANK.x, TANK.y, 3, 0, Math.PI * 2);
  g.fill();
}

/** L1: the trim wire, its dashed line to the probe, the angle mark with its label, and the leads to the supply. */
export function trimWire(g: G, r: TrimRow, dir: number, rt: number) {
  const [wx, wy] = wireAt(r);
  const dx = TANK.x - wx;
  const dy = TANK.y - wy;
  line(g, wx, wy, TANK.x, TANK.y, 'rgba(244,246,255,0.5)', 1.5, [5, 5]);
  // the angle between the wire and the line to the probe, taken from the nearer end of the wire
  const ref = dx >= 0 ? 0 : Math.PI;
  const a = Math.atan2(dy, dx);
  let diff = a - ref;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(wx, wy, 26, ref, a, diff < 0);
  g.stroke();
  const mid = ref + diff / 2;
  text(g, `${angleOf(r)}°`, wx + Math.cos(mid) * 42, wy + Math.sin(mid) * 42 + 4, PAL.yellow, 12);
  // leads
  g.lineWidth = 2.5;
  g.strokeStyle = '#e0282d';
  g.beginPath();
  g.moveTo(wx + 18, wy);
  g.lineTo(SUPPLY.x + 20, SUPPLY.y - 6 - Math.max(0, 8 - wy / 30));
  g.stroke();
  g.strokeStyle = '#2a2a30';
  g.beginPath();
  g.moveTo(wx - 18, wy + 3);
  g.lineTo(SUPPLY.x + 36, SUPPLY.y);
  g.stroke();
  // the copper rod
  g.fillStyle = COPPER;
  rrect(g, wx - 18, wy - 3, 36, 6, 3);
  g.fill();
  g.fillStyle = COPPER_L;
  g.fillRect(wx - 16, wy - 2, 32, 1.5);
  // current dots in the player's direction
  if (rt >= 0.1 && rt < 0.9) {
    for (let i = 0; i < 4; i++) {
      const f = (((rt - 0.1) * 2.5 + i / 4) % 1 + 1) % 1;
      const x = dir ? wx - 18 + f * 36 : wx + 18 - f * 36;
      glow(g, '#ffe9a8', 6, () => {
        g.fillStyle = '#fff6d0';
        g.beginPath();
        g.arc(x, wy, 2.4, 0, Math.PI * 2);
        g.fill();
      });
    }
  }
}

// ---------------------------------------------------------------- instruments

/** L1: the half-dial gauge from ⊗ down through 0 to ⊙ up; the target wedge is the given fact; needleDeg is measured from the top. */
export function gauge(g: G, up: boolean, needleDeg: number, stamp: 'ok' | 'off' | null) {
  const { x, y, r } = GAUGE;
  g.fillStyle = '#e9edf7';
  g.beginPath();
  g.arc(x, y, r, Math.PI, 2 * Math.PI);
  g.closePath();
  g.fill();
  g.strokeStyle = '#4a5078';
  g.lineWidth = 3;
  g.stroke();
  const s = up ? 1 : -1;
  g.fillStyle = 'rgba(40,170,90,0.75)';
  g.beginPath();
  g.moveTo(x, y);
  g.arc(x, y, r - 3, (-90 + s * 45) * DEG, (-90 + s * 75) * DEG, s < 0);
  g.closePath();
  g.fill();
  line(g, x, y - r + 3, x, y - r + 10, INK, 2);
  const a = needleDeg * DEG;
  line(g, x, y, x + Math.sin(a) * (r - 8), y - Math.cos(a) * (r - 8), '#c0302a', 3);
  g.fillStyle = INK;
  g.beginPath();
  g.arc(x, y, 4, 0, Math.PI * 2);
  g.fill();
  text(g, '0', x, y - r - 5, PAL.dim, 11);
  text(g, '⊗ down', x - r + 8, y + 16, PAL.dim, 11);
  text(g, '⊙ up', x + r - 6, y + 16, PAL.dim, 11);
  if (stamp === 'ok') text(g, 'CALIBRATED', x, y + 34, PAL.green, 12);
  if (stamp === 'off') {
    g.fillStyle = PAL.red;
    g.beginPath();
    g.arc(x - 20, y + 31, 5, 0, Math.PI * 2);
    g.fill();
    text(g, 'OFF', x, y + 34, PAL.red, 12);
  }
}

/** The supply box: lamp (red until switched on, then green), an ammeter face with no numbers, and the sense knob. */
export function supply(g: G, level: number, on: boolean, knobUp: number) {
  const { x, y, w, h } = SUPPLY;
  g.fillStyle = '#7d869e';
  rrect(g, x, y, w, h, 6);
  g.fill();
  g.strokeStyle = '#4a5078';
  g.lineWidth = 2;
  g.stroke();
  g.fillStyle = on ? PAL.green : '#7a2a2a';
  g.beginPath();
  g.arc(x + 12, y + 12, 5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#e9edf7';
  g.beginPath();
  g.arc(x + 48, y + 16, 12, Math.PI, 2 * Math.PI);
  g.closePath();
  g.fill();
  const na = ((on ? 35 : -35) * Math.PI) / 180;
  line(g, x + 48, y + 16, x + 48 + Math.sin(na) * 9, y + 16 - Math.cos(na) * 9, '#c0302a', 1.5);
  line(g, KNOB.x - 14, KNOB.y, KNOB.x + 14, KNOB.y, '#2a3050', 6);
  g.fillStyle = '#d6dbe8';
  g.beginPath();
  g.arc(KNOB.x + (knobUp ? 14 : -14), KNOB.y, 8, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#2a3050';
  g.lineWidth = 2;
  g.stroke();
  text(g, level === 1 ? '← current →' : '↻  seen from above  ↺', x + w / 2, y + h + 14, PAL.dim, 11);
}

/** The cream lab card with the round's given facts. */
export function labCard(g: G, lines: string[]) {
  const { x, y, w, h } = CARD;
  g.fillStyle = '#f6efd9';
  rrect(g, x, y, w, h, 6);
  g.fill();
  g.fillStyle = '#1f8a8a';
  g.fillRect(x, y, w, 15);
  text(g, 'TRIAL CARD', x + 8, y + 12, '#ffffff', 11, 'left');
  lines.forEach((s, i) => text(g, s, x + 8, y + 33 + i * 16, '#2a2240', 12, 'left', false));
}

/** The field meter on the cart: the only helper. */
export function fieldMeter(g: G, s: string, color: string) {
  g.fillStyle = '#05080f';
  rrect(g, LCD.x, LCD.y, LCD.w, LCD.h, 4);
  g.fill();
  g.strokeStyle = '#4a5078';
  g.lineWidth = 1.5;
  g.stroke();
  text(g, s, LCD.x + LCD.w / 2, LCD.y + 15, color, 12);
}

/** L4: the side view of the coil edge-on with the raised tank on its axis. The numbers are on the card. */
export function sideInset(g: G) {
  const { x, y, w, h } = SIDE;
  g.fillStyle = 'rgba(6,10,36,0.85)';
  rrect(g, x, y, w, h, 6);
  g.fill();
  g.strokeStyle = '#4a5078';
  g.lineWidth = 1.5;
  g.stroke();
  text(g, 'side view', x + w / 2, y + 14, PAL.dim, 11);
  const cx = x + w / 2;
  g.fillStyle = COPPER;
  g.beginPath();
  g.ellipse(cx, y + h - 14, 50, 6, 0, 0, Math.PI * 2);
  g.fill();
  line(g, cx, y + 24, cx, y + h - 14, 'rgba(200,215,255,0.55)', 1.5, [4, 4]);
  g.strokeStyle = '#cfe3f0';
  g.lineWidth = 2;
  g.fillStyle = 'rgba(60,140,200,0.55)';
  g.fillRect(cx - 16, y + 28, 32, 16);
  g.strokeRect(cx - 16, y + 28, 32, 16);
  line(g, cx - 12, y + 44, cx - 12, y + 52, '#8a93a8', 2);
  line(g, cx + 12, y + 44, cx + 12, y + 52, '#8a93a8', 2);
  line(g, cx + 24, y + 52, cx + 24, y + h - 16, PAL.yellow, 1.5);
  text(g, 'x', cx + 31, y + 70, PAL.yellow, 11, 'left');
  line(g, cx, y + h - 6, cx + 50, y + h - 6, PAL.yellow, 1.5);
  text(g, 'R', cx + 25, y + h - 8, PAL.yellow, 11);
}

// ---------------------------------------------------------------- characters

export type NuiMood = 'happy' | 'dazed' | 'dizzy';
export interface NuiOpts { mood: NuiMood; wobble?: number; alpha?: number; scale?: number; paddle?: boolean; spin?: number }
/** Nui, a loggerhead hatchling seen from above, heading in canvas radians (0 = east): shell with hexagons, four flippers, head, eyes. */
export function nui(g: G, x: number, y: number, heading: number, t: number, o: NuiOpts) {
  const s = o.scale ?? 1.25;
  g.save();
  g.globalAlpha = o.alpha ?? 1;
  g.translate(x, y);
  g.rotate(heading + (o.wobble ?? 0));
  g.scale(s, s);
  const flap = (o.paddle === false ? 0 : Math.sin(t * 12.6)) * 20 * DEG;
  g.fillStyle = '#6f8a4a';
  for (const sy of [-1, 1]) {
    g.save();
    g.translate(4, sy * 6);
    g.rotate(sy * (-40 * DEG + flap * sy));
    g.beginPath();
    g.ellipse(0, sy * 3, 2.2, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.beginPath();
    g.ellipse(-7, sy * 5.5, 2, 3.4, sy * 0.4, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#9a6a38';
  g.beginPath();
  g.ellipse(0, 0, 9, 7, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#5a3a1c';
  g.lineWidth = 0.9;
  for (const [hx, hy] of [[-2.5, 0], [2.5, -3], [2.5, 3]] as [number, number][]) {
    g.beginPath();
    for (let i = 0; i < 6; i++) g.lineTo(hx + Math.cos((i * Math.PI) / 3) * 2.8, hy + Math.sin((i * Math.PI) / 3) * 2.8);
    g.closePath();
    g.stroke();
  }
  g.fillStyle = '#6f8a4a';
  g.beginPath();
  g.arc(11.5, 0, 3.6, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = INK;
  g.strokeStyle = INK;
  g.lineWidth = 0.7;
  for (const ey of [-1.7, 1.7]) {
    if (o.mood === 'dazed') {
      g.beginPath();
      g.moveTo(12 - 0.9, ey - 0.9);
      g.lineTo(12 + 0.9, ey + 0.9);
      g.moveTo(12 + 0.9, ey - 0.9);
      g.lineTo(12 - 0.9, ey + 0.9);
      g.stroke();
    } else if (o.mood === 'dizzy') {
      const sp = (o.spin ?? t * 9) + (ey > 0 ? 1.5 : 0);
      g.beginPath();
      g.arc(12.4, ey, 1.2, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(12.4, ey);
      g.lineTo(12.4 + Math.cos(sp) * 1.2, ey + Math.sin(sp) * 1.2);
      g.stroke();
    } else if (t % 2 < 0.12) {
      g.beginPath();
      g.moveTo(11.8, ey);
      g.lineTo(13.4, ey);
      g.stroke();
    } else {
      g.beginPath();
      g.arc(12.6, ey, 0.9, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();
}

export interface BucketOpts { count: number; nui: boolean; clap: number; hide: number; watch: boolean }
/** The hatchling bucket. In L1 Nui sits in it (head and front flippers over the rim: claps on a win, hides on a miss); later `count` hatchlings peek over. */
export function bucket(g: G, t: number, o: BucketOpts) {
  const { x, y } = BUCKET;
  const bob = calm() ? 0 : Math.max(0, Math.sin(t * Math.PI)) * 2; // one small hop every 2 s
  g.strokeStyle = '#5a7fd0';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(x, y + 2, 23, Math.PI * 1.08, Math.PI * 1.92);
  g.stroke();
  const heads = o.nui ? [x] : o.count === 1 ? [x] : o.count === 2 ? [x - 8, x + 8] : [x - 13, x, x + 13];
  heads.forEach((hx, i) => {
    const hy = y - 6 - (o.nui ? 0 : (bob * (i % 2 ? 0.6 : 1))) + o.hide * 12;
    g.fillStyle = '#9a6a38';
    g.beginPath();
    g.ellipse(hx, hy + 8, 9, 6, 0, Math.PI, 2 * Math.PI);
    g.fill();
    g.fillStyle = '#6f8a4a';
    g.beginPath();
    g.arc(hx, hy, o.nui ? 6.5 : 5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = INK;
    const px = o.watch ? 1.2 : 0;
    g.beginPath();
    g.arc(hx - 2.4 + px, hy - 1, 1.1, 0, Math.PI * 2);
    g.arc(hx + 2.4 + px, hy - 1, 1.1, 0, Math.PI * 2);
    g.fill();
    if (o.nui && o.hide < 0.5) {
      g.strokeStyle = INK;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(hx, hy + 1.5, 2.4, 0.15 * Math.PI, 0.85 * Math.PI);
      g.stroke();
    }
  });
  if (o.nui) {
    g.fillStyle = '#6f8a4a';
    const gap = 13 - 9 * o.clap;
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.ellipse(x + sx * gap, y - 4 + o.hide * 10 - o.clap * 4, 3, 6, sx * (0.5 - 0.5 * o.clap), 0, Math.PI * 2);
      g.fill();
    }
  }
  g.fillStyle = '#3f6ad0';
  g.beginPath();
  g.moveTo(x - 20, y);
  g.lineTo(x + 20, y);
  g.lineTo(x + 16, y + 30);
  g.lineTo(x - 16, y + 30);
  g.closePath();
  g.fill();
  g.fillStyle = '#5a82e8';
  g.fillRect(x - 21, y - 2, 42, 5);
  line(g, x - 10, y + 8, x - 8, y + 26, 'rgba(255,255,255,0.18)', 3);
}

export interface LeiOpts { mood: 'happy' | 'worried' | 'cheer'; press: number; hop: number }
/** Leilani: bun with a pencil, red headlamp (sweeping cone), teal vest with a turtle patch, clipboard, remote, green boots. */
export function leilani(g: G, t: number, o: LeiOpts) {
  const x = LEI.x;
  const hopY = -4 * Math.sin(Math.PI * clamp01(o.hop));
  const calmMode = calm();
  const fy = LEI.feet + hopY;
  const breath = Math.sin(t * 2);
  // legs and boots
  g.fillStyle = '#d9a273';
  g.fillRect(x - 10, fy - 16, 6, 8);
  g.fillRect(x + 4, fy - 16, 6, 8);
  g.fillStyle = '#2f9e5a';
  g.fillRect(x - 12, fy - 9, 9, 9);
  g.fillRect(x + 3, fy - 9, 9, 9);
  g.fillStyle = '#1d6a3c';
  g.fillRect(x - 12, fy - 2, 11, 2);
  g.fillRect(x + 3, fy - 2, 11, 2);
  // shorts and T-shirt
  g.fillStyle = '#c9b27a';
  g.fillRect(x - 12, fy - 28, 24, 13);
  g.fillStyle = '#f2f4fa';
  g.fillRect(x - 12, fy - 52 - breath * 0.5, 24, 24 + breath * 0.5);
  // vest with pockets and the turtle patch
  g.fillStyle = '#1f8a8a';
  g.fillRect(x - 13, fy - 52 - breath * 0.5, 8, 24 + breath * 0.5);
  g.fillRect(x + 5, fy - 52 - breath * 0.5, 8, 24 + breath * 0.5);
  g.fillStyle = '#17706f';
  g.fillRect(x - 12, fy - 38, 6, 6);
  g.fillRect(x + 6, fy - 38, 6, 6);
  g.fillStyle = '#7fe0a0';
  g.beginPath();
  g.ellipse(x + 9, fy - 46, 2.6, 2, 0, 0, Math.PI * 2);
  g.fill();
  // head, hair, bun with the pencil
  const hy = fy - 62 - breath * 0.5;
  g.fillStyle = '#d9a273';
  g.beginPath();
  g.arc(x, hy, 10, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#2a1d1a';
  g.beginPath();
  g.arc(x, hy - 2, 10.5, Math.PI * 1.02, Math.PI * 1.98);
  g.fill();
  g.beginPath();
  g.arc(x - 1, hy - 14, 5, 0, Math.PI * 2);
  g.fill();
  line(g, x - 7, hy - 17, x + 6, hy - 11, '#f0c040', 2);
  line(g, x - 7, hy - 17, x - 9, hy - 18, '#d65a5a', 2);
  // the headlamp band, the red lamp and its faint sweeping cone
  line(g, x - 10, hy - 4, x + 10, hy - 4, '#3a4660', 3);
  const sweep = calmMode ? 0 : Math.sin((t / 4) * 2 * Math.PI) * 10 * DEG;
  const lx = x + 4;
  const ly = hy - 4;
  g.fillStyle = 'rgba(255,60,60,0.08)';
  g.beginPath();
  g.moveTo(lx, ly);
  g.lineTo(lx + Math.cos(0.7 + sweep - 0.22) * 110, ly + Math.sin(0.7 + sweep - 0.22) * 110);
  g.lineTo(lx + Math.cos(0.7 + sweep + 0.22) * 110, ly + Math.sin(0.7 + sweep + 0.22) * 110);
  g.closePath();
  g.fill();
  glow(g, '#ff3030', 8, () => {
    g.fillStyle = '#ff5050';
    g.beginPath();
    g.arc(lx, ly, 3, 0, Math.PI * 2);
    g.fill();
  });
  face(g, x - 1, hy + 2, 8, o.mood, t, INK);
  // left arm and the clipboard (tapped with the pencil every 5 s, raised on a win)
  const tap = t % 5 < 0.3 ? Math.sin(((t % 5) / 0.3) * Math.PI * 4) * 1.2 : 0;
  const lift = o.mood === 'cheer' ? 12 : 0;
  g.fillStyle = '#c9a56a';
  g.fillRect(x - 25, fy - 50 - lift + tap, 13, 18);
  g.fillStyle = '#ffffff';
  g.fillRect(x - 23, fy - 47 - lift + tap, 9, 13);
  line(g, x - 22, fy - 43 - lift + tap, x - 16, fy - 43 - lift + tap, '#8f9bd6', 1);
  line(g, x - 22, fy - 40 - lift + tap, x - 16, fy - 40 - lift + tap, '#8f9bd6', 1);
  g.fillStyle = '#d9a273';
  g.fillRect(x - 14, fy - 46 - lift * 0.7, 4, 8);
  // right arm with the remote
  const hx = x + 12 + 16 + 6 * o.press;
  const hyy = fy - 40 - 12 * o.press;
  line(g, x + 12, fy - 46, hx, hyy, '#d9a273', 4);
  g.fillStyle = '#20242e';
  rrect(g, hx - 3, hyy - 10, 8, 14, 2);
  g.fill();
  g.fillStyle = o.press > 0 ? PAL.green : '#e0282d';
  g.beginPath();
  g.arc(hx + 1, hyy - 6, 2, 0, Math.PI * 2);
  g.fill();
}
