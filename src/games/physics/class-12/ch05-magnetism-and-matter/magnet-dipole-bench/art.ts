// Drawing for "Pebble in Orbit": space and the Earth below, the field lines, the guide star, the space station, Pebble and its twin Grit, Dele in his mission-control window, the
// fader strip, the heading compass, the thruster switch, the docking ports and the win-only teaching insets. Nothing here knows the answer of a round: it draws the positions,
// moods and states it is handed. No Math.random and no gradients (the jsdom canvas stub has none): every wobble comes from the clock.
import { PAL } from '@core/arcade';
import { glow, line, text } from '@core/neon';
import { rad, type Round } from './logic';

export type G = CanvasRenderingContext2D;

// ---- geometry (exported so the UI tests can find the handles) --------------------------------------------------------------------------------------------
export const PEB = { x: 300, y: 170 }; // Pebble's centre in every level
export const GROUND = { x: 8, y: 8, w: 146, h: 84 }; // Dele's mission-control window (top left)
export const TLM = { x: 420, y: 48, w: 212, h: 20 }; // the telemetry box (the helper)
export const STRIP = { x: 100, y: 262, w: 420, h: 74 }; // the dark control strip behind the fader (levels 1, 3, 4)
export const FADER = { x0: 130, x1: 490, y: 312 }; // the rod / coil fader
export const mX = (m: number) => FADER.x0 + ((m - 0.2) / 3.8) * (FADER.x1 - FADER.x0); // levels 1, 3
export const iX = (i: number) => FADER.x0 + ((i - 20) / 580) * (FADER.x1 - FADER.x0); // level 4
export const COMPASS = { r: 100 }; // level 2: the heading ring round Pebble
export const compassAt = (h: number): [number, number] => [PEB.x + COMPASS.r * Math.cos(rad(h)), PEB.y - COMPASS.r * Math.sin(rad(h))];
export const THR = { x0: 546, x1: 586, y: 300 }; // level 4: the thruster switch, knob at x0 (off) or x1 (on)
export const STATION = { x: 470, y: 120, w: 170, h: 100, ring: [520, 170] as const, ringR: 30 }; // level 4 rounds with uniform: false
export const FENDER = { x0: 420, x1: 470, y: 170 }; // a rubber-tipped boom from the truss: its face is at x 420
export const SLOT = { w: 104, h: 104 }; // level 4: the dashed station-keeping slot round PEB
export const STAR_D = 120;
export const starAt = (deg: number): [number, number] => [PEB.x + STAR_D * Math.cos(rad(deg)), PEB.y - STAR_D * Math.sin(rad(deg))];
export const PORT_D = 92; // level 5: ports; nose along Pebble's moment, side a quarter turn anticlockwise
export const portAt = (pDir: number, port: number): [number, number] => [PEB.x + PORT_D * Math.cos(rad(90 * (pDir + port))), PEB.y - PORT_D * Math.sin(rad(90 * (pDir + port)))];
export const GRIT = { x: 548, y: 214 }; // level 5: where Grit hovers before the dock
export const KNOB_R = 52; // level 5: the turn ring round Grit
export const knobAt = (q: number): [number, number] => [GRIT.x + KNOB_R * Math.cos(rad(90 * q)), GRIT.y - KNOB_R * Math.sin(rad(90 * q))];
export const HIT: [number, number] = [320, 118]; // the fixed burst point of every level
export const INSET = { x: 8, y: 100, w: 132, h: 70 }; // the win-only teaching picture
export const PLATE4 = { x: 300, y: 236 }; // level 4: the coil plate

// ---- small helpers ---------------------------------------------------------------------------------------------------------------------------------------
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (u: number) => clamp01(u) * clamp01(u) * (3 - 2 * clamp01(u));
const TAU = Math.PI * 2;

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
  g.arc(x, y, r, 0, TAU);
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
function stroke(g: G, color: string, w: number, dash: number[] = [], off = 0) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.setLineDash(dash);
  g.lineDashOffset = off;
  g.stroke();
  g.setLineDash([]);
  g.lineDashOffset = 0;
}
/** A small dark plate behind a scene label, so it reads on any background. Width is estimated (the test canvas cannot measure text). */
export function tag(g: G, s: string, x: number, y: number, color: string, size = 12, align: CanvasTextAlign = 'center') {
  const w = s.length * size * 0.58 + 10;
  const x0 = align === 'center' ? x - w / 2 : align === 'left' ? x - 5 : x - w + 5;
  g.fillStyle = 'rgba(8,4,20,0.66)';
  rr(g, x0, y - size - 1, w, size + 7, 4);
  g.fill();
  text(g, s, x, y, color, size, align);
}
/** The goal line: one short line on a dark pill at (320, 30) until Fire. */
export function goalLine(g: G, s: string) {
  const w = s.length * 7 + 20;
  g.fillStyle = 'rgba(6,10,36,0.8)';
  rr(g, 320 - w / 2, 20, w, 20, 10);
  g.fill();
  text(g, s, 320, 34, PAL.white, 12);
}
/** A drag handle drawn by the game: a white ring with a grip glyph, filled while dragged, pulsing (radius 23 to 29) while it is the first-time cue. */
export function handleRing(g: G, x: number, y: number, glyph: string, hot: boolean, cue: number) {
  const r = cue >= 0 ? 26 + 3 * Math.sin(cue * Math.PI * 4) : 20;
  if (hot) {
    g.fillStyle = 'rgba(255,210,63,0.45)';
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  g.fillStyle = 'rgba(6,10,36,0.55)';
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
  g.strokeStyle = hot ? PAL.yellow : PAL.white;
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.stroke();
  text(g, glyph, x, y + 5, PAL.white, 14);
}

// ---- space, field, star, station --------------------------------------------------------------------------------------------------------------------------

const EARTH = ['#1f5fbf', '#0a1230', '#12254f'];
export function space(g: G, t: number, k: number, reduce: boolean) {
  g.fillStyle = '#04061a';
  g.fillRect(0, 0, 640, 340);
  for (let i = 0; i < 50; i++) {
    const a = reduce ? 0.6 : 0.4 + 0.4 * Math.sin(t * 1.2 + i);
    dot(g, (i * 97) % 640, (i * 53) % 262, i % 5 === 0 ? 1.5 : 1, `rgba(255,255,255,${a.toFixed(2)})`);
  }
  if (k === 2) {
    // sunrise: a flare at the limb, and debris chips drifting left
    const fx = 610;
    const fy = 276;
    dot(g, fx, fy, 16, 'rgba(255,210,122,0.35)');
    dot(g, fx, fy, 8, '#ffd27a');
    for (let i = 0; i < 6; i++) {
      const a = (reduce ? 0 : t * rad(5)) + (i * TAU) / 6;
      line(g, fx, fy, fx + 34 * Math.cos(a), fy + 34 * Math.sin(a), 'rgba(255,210,122,0.5)', 2);
    }
    for (let i = 0; i < 6; i++) {
      const x = ((((i * 113 - t * 14) % 700) + 700) % 700) - 30;
      const y = 100 + ((i * 47) % 150);
      poly(g, [[x - 4, y], [x, y - 3], [x + 4, y + 1], [x + 1, y + 4]], '#8a8fa8');
    }
  }
  g.save();
  g.beginPath();
  g.arc(320, 700, 440, 0, TAU);
  g.clip();
  g.fillStyle = EARTH[k];
  g.fillRect(0, 250, 640, 100);
  if (k === 0) {
    for (let i = 0; i < 6; i++) {
      const x = 120 + ((((i * 97 - t * 6) % 400) + 400) % 400);
      const y = 282 + ((i * 17) % 50);
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.beginPath();
      g.ellipse(x, y, 26, 6, 0, 0, TAU);
      g.fill();
    }
  } else if (k === 1) {
    for (let i = 0; i < 30; i++) dot(g, (i * 61) % 640, 270 + ((i * 29) % 70), 1.2, `rgba(255,210,122,${(0.5 + 0.3 * Math.sin(t * 0.8 + i)).toFixed(2)})`);
  }
  g.restore();
  g.beginPath();
  g.arc(320, 700, 440, 0, TAU);
  stroke(g, k === 2 ? 'rgba(255,154,60,0.6)' : 'rgba(111,183,255,0.6)', k === 2 ? 8 : 4);
  if (k === 1) {
    dot(g, 60, 142, 14, '#e8e4d8');
    dot(g, 65, 139, 12, '#04061a');
  }
}

function arrowHead(g: G, x: number, y: number, ux: number, uy: number, size: number, fill: string) {
  poly(g, [[x + ux * size, y + uy * size], [x - ux * size * 0.7 - uy * size * 0.5, y - uy * size * 0.7 + ux * size * 0.5], [x - ux * size * 0.7 + uy * size * 0.5, y - uy * size * 0.7 - ux * size * 0.5]], fill);
}
/** Five dashed field lines through PEB at the field direction, flowing along it, with an arrowhead at 160 px each side of their middle. */
export function fieldArrows(g: G, deg: number, t: number) {
  const ux = Math.cos(rad(deg));
  const uy = -Math.sin(rad(deg));
  const nx = -uy;
  const ny = ux;
  const col = 'rgba(77,225,255,0.35)';
  for (let j = -2; j <= 2; j++) {
    const ox = PEB.x + nx * 60 * j;
    const oy = PEB.y + ny * 60 * j;
    g.beginPath();
    g.moveTo(ox - ux * 480, oy - uy * 480);
    g.lineTo(ox + ux * 480, oy + uy * 480);
    stroke(g, col, 1.5, [10, 8], -t * 20);
    for (const s of [-160, 160]) arrowHead(g, ox + ux * s, oy + uy * s, ux, uy, 10, col);
  }
}
/** Level 4 next to the station: five curves bending into the docking magnet ring. */
export function fieldBend(g: G, t: number) {
  const col = 'rgba(77,225,255,0.35)';
  for (let j = 0; j < 5; j++) {
    const y0 = 90 + 40 * j;
    g.beginPath();
    g.moveTo(0, y0);
    g.lineTo(330, y0);
    g.quadraticCurveTo(430, y0 + (170 - y0) * 0.1, 490, 170);
    stroke(g, col, 1.5, [10, 8], -t * 20);
    arrowHead(g, 160, y0, 1, 0, 10, col);
  }
}
/** The guide star: four white points with a soft glow and a dashed ring (gold once reached). */
export function star(g: G, x: number, y: number, t: number, gold: boolean) {
  dot(g, x, y, 22 + 3 * Math.sin(t * Math.PI), 'rgba(255,255,255,0.18)');
  const pts: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const r = i % 2 ? 4 : 14;
    pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]);
  }
  poly(g, pts, gold ? PAL.yellow : '#ffffff');
  g.beginPath();
  g.arc(x, y, 12, 0, TAU);
  stroke(g, gold ? PAL.yellow : 'rgba(255,255,255,0.8)', 1.5, gold ? [] : [3, 3]);
}
/** The space station truss with its docking magnet ring and the fender boom. */
export function station(g: G, t: number) {
  const { x, y, w } = STATION;
  box(g, x, y + 32, w, 6, '#8b93b5');
  box(g, x, y + 62, w, 6, '#8b93b5');
  for (let bx = x + 8; bx < x + w - 4; bx += 28) {
    box(g, bx, y + 32, 3, 36, '#6a6f8f');
    line(g, bx, y + 34, bx + 28, y + 66, '#6a6f8f', 1.5);
  }
  for (const py of [y + 2, y + 74]) {
    box(g, x + 75, py, 90, 24, '#2a4fbf', '#6f8ff0');
    for (let c = 1; c < 5; c++) line(g, x + 75 + c * 18, py, x + 75 + c * 18, py + 24, '#6f8ff0', 1);
    line(g, x + 75, py + 12, x + 165, py + 12, '#6f8ff0', 1);
  }
  const [cx, cy] = STATION.ring;
  dot(g, cx, cy, STATION.ringR + 6 + 2 * Math.sin(t * 2.4), 'rgba(255,90,90,0.14)');
  g.lineWidth = 12;
  g.strokeStyle = '#d6453d';
  g.beginPath();
  g.arc(cx, cy, 24, Math.PI / 2, (3 * Math.PI) / 2);
  g.stroke();
  g.strokeStyle = '#9aa0b8';
  g.beginPath();
  g.arc(cx, cy, 24, -Math.PI / 2, Math.PI / 2);
  g.stroke();
  line(g, cx, cy - 30, cx, cy + 30, '#1b1030', 2);
  box(g, FENDER.x0, FENDER.y - 4, FENDER.x1 - FENDER.x0, 8, '#6a6f8f');
  box(g, FENDER.x0, FENDER.y - 4, 6, 8, '#222233');
}

// ---- Pebble and Grit ---------------------------------------------------------------------------------------------------------------------------------------

export type PebbleMood = 'happy' | 'cheer' | 'worried' | 'dizzy' | 'dark';
export interface PebbleOpts {
  x: number;
  y: number;
  deg: number; // heading in degrees anticlockwise from → (the camera side)
  scale?: number;
  rod: 'rod' | 'coil'; // the magnet rod (levels 1, 2, 3, 5) or the coil (level 4)
  nOpposite?: boolean; // level 2 rows with rod: 180: the rod's N end is opposite the camera
  glow?: number; // 0..1: the orange 6 px glow of the rod or coil during the burn
  folded?: boolean; // level 5: the wings fold flat against the body
  wings?: string; // wing colour
  flap?: number; // cheer: wing angle in degrees
  alpha?: number;
  mood: PebbleMood;
  t: number;
  look?: [number, number]; // level 5: the LEDs look toward Grit (a shift of the eyes in px)
  wink?: boolean;
}
const BLUE = '#2a4fbf';
export const GRIT_WINGS = '#2f9e5b';

function eyes(g: G, o: PebbleOpts, s: number) {
  const [lx, ly] = o.look ?? [0, 0];
  const blink = o.t % 3 < 0.12;
  const ey = -11 * s;
  for (const sx of [-1, 1]) {
    const cx = sx * 8 * s + lx;
    const cy = ey + ly;
    const shut = blink || (o.wink && sx === -1);
    if (o.mood === 'dark') {
      line(g, cx - 4 * s, cy, cx + 4 * s, cy, '#33406a', 2);
    } else if (o.mood === 'cheer') {
      g.beginPath();
      g.arc(cx, cy + 2 * s, 3.5 * s, Math.PI, TAU);
      stroke(g, '#4de1ff', 2);
    } else if (o.mood === 'dizzy') {
      g.beginPath();
      for (let i = 0; i <= 24; i++) {
        const a = (i / 24) * 4 * Math.PI + o.t * 6 * sx;
        const rr2 = (i / 24) * 4 * s;
        g.lineTo(cx + rr2 * Math.cos(a), cy + rr2 * Math.sin(a));
      }
      stroke(g, '#ffe27a', 1.4);
    } else {
      const col = o.mood === 'worried' ? '#ffb347' : '#5dff9a';
      if (shut) line(g, cx - 4 * s, cy, cx + 4 * s, cy, col, 2);
      else dot(g, cx, cy, 4 * s, col);
    }
  }
}
function mouth(g: G, o: PebbleOpts, s: number) {
  if (o.mood === 'dark') return;
  const n = o.mood === 'cheer' ? 7 : 5;
  const half = o.mood === 'cheer' ? 11 : 8;
  const col = o.mood === 'cheer' ? '#4de1ff' : o.mood === 'worried' ? '#ffb347' : o.mood === 'dizzy' ? '#ffe27a' : '#5dff9a';
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * 2 - 1;
    const wave = o.mood === 'dizzy' ? 1.5 * Math.sin(i * 1.8 + o.t * 6) : 0;
    const dy = o.mood === 'worried' ? -2 : o.mood === 'dizzy' ? wave - 2 : -3 + (o.mood === 'cheer' ? 4 : 2.5) * (1 - u * u);
    dot(g, u * half * s, dy * s, 1.2 * s + 0.2, col);
  }
}

/** Pebble and Grit. The body, wings, antenna, camera and the rod or coil rotate with the heading; the LED face stays upright on its plate. */
export function pebble(g: G, o: PebbleOpts) {
  const s = o.scale ?? 1;
  const a = rad(o.deg);
  const wing = o.wings ?? BLUE;
  g.save();
  g.globalAlpha = o.alpha ?? 1;
  g.translate(o.x, o.y);
  g.save();
  g.rotate(-a);
  g.scale(s, s);
  const flap = ((o.flap ?? 0) * Math.PI) / 180;
  // wings (along the heading axis, either side of the body)
  for (const sx of [-1, 1]) {
    g.save();
    g.translate(sx * 28, 0);
    box(g, sx > 0 ? 0 : -8, -3, 8, 6, '#8b93b5');
    if (o.folded) {
      box(g, sx > 0 ? 0 : -6, -24, 6, 48, wing, '#9fb4ff');
    } else {
      g.translate(sx * 8, 0);
      g.rotate(sx * flap);
      const x0 = sx > 0 ? 0 : -52;
      box(g, x0, -11, 52, 22, wing, '#9fb4ff');
      for (let c = 1; c < 4; c++) line(g, x0 + c * 13, -11, x0 + c * 13, 11, '#6f8ff0', 1);
      line(g, x0, 0, x0 + 52, 0, '#6f8ff0', 1);
      const sw = ((o.t % 2) / 2) * 60 - 4;
      if (sw > 0 && sw < 50) {
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.fillRect(x0 + sw, -11, 5, 22);
      }
    }
    g.restore();
  }
  // gold-foil body, dark front panel
  box(g, -28, -28, 56, 56, '#d9a441', '#b8862e');
  for (const [x1, y1, x2, y2] of [[-24, -20, -8, -24], [6, 22, 22, 18], [-26, 8, -14, 14], [10, -22, 24, -14]]) line(g, x1, y1, x2, y2, '#b8862e', 1);
  box(g, -20, -20, 40, 40, '#1a2040');
  // antenna
  line(g, -24, -28, -24, -54, '#cfd3e6', 1.5);
  dot(g, -24, -54, 2.5, o.t % 1.5 < 0.25 ? 'rgba(255,90,90,0.3)' : PAL.red);
  // camera lens on the camera side, with its tick
  dot(g, 22, 15, 7, '#0d0f1a');
  dot(g, 24, 13, 2, PAL.cyan);
  line(g, 22, 25, 22, 28, '#ffffff', 2);
  // the rod or the coil
  const hot = (o.glow ?? 0) > 0.02;
  const drawGear = () => {
    if (o.rod === 'coil') {
      rr(g, -20, 2, 40, 30, 4);
      stroke(g, '#c87533', 3);
      for (const dy of [10, 17, 24]) line(g, -16, dy, 16, dy, '#c87533', 1);
    } else {
      const nx = o.nOpposite ? -1 : 1;
      box(g, nx > 0 ? 0 : -22, 6, 22, 8, '#e0453a');
      box(g, nx > 0 ? -22 : 0, 6, 22, 8, '#e8e4d8');
    }
  };
  if (hot) glow(g, PAL.orange, 6 * (o.glow ?? 0), drawGear);
  else drawGear();
  g.restore();
  // stamps (always 11 px) at the rod's ends, and the upright face plate
  if (o.rod === 'rod') {
    const nx = o.nOpposite ? -1 : 1;
    for (const [side, ch, col] of [[nx, 'N', '#ffffff'], [-nx, 'S', '#1b1030']] as const) {
      const lx = side * 11 * s;
      const ly = 10 * s;
      const wx = lx * Math.cos(a) + ly * Math.sin(a);
      const wy = -lx * Math.sin(a) + ly * Math.cos(a);
      text(g, ch, wx, wy + 4, col, 11);
    }
  }
  g.fillStyle = '#10152e';
  rr(g, -17 * s, -19 * s, 34 * s, 22 * s, 4 * s);
  g.fill();
  eyes(g, o, s);
  mouth(g, o, s);
  if (o.mood === 'worried') text(g, '!', 24 * s, -24 * s, PAL.orange, 12);
  if (o.mood === 'dizzy') {
    for (let i = 0; i < 3; i++) {
      const b = o.t * TAU + (i * TAU) / 3;
      text(g, '✦', 34 * Math.cos(b) * s, -12 * s + 34 * Math.sin(b) * s, PAL.yellow, 11);
    }
  }
  g.restore();
}

// ---- Dele in the mission-control window --------------------------------------------------------------------------------------------------------------------

export type DeleMood = 'idle' | 'lean' | 'cheer' | 'oops';
export function dele(g: G, t: number, mood: DeleMood, rt: number) {
  const { x, y, w, h } = GROUND;
  g.save();
  rr(g, x, y, w, h, 6);
  g.clip();
  box(g, x, y, w, h, '#101830');
  box(g, x, y + h - 14, w, 14, '#1d2548');
  // two monitors on the right, one with a tiny green sine wave
  box(g, x + 92, y + 14, 44, 26, '#05070f', '#4a5280');
  g.beginPath();
  for (let i = 0; i <= 20; i++) g.lineTo(x + 94 + i * 2, y + 27 + 7 * Math.sin(i * 0.7 + t * 3));
  stroke(g, PAL.green, 1.5);
  box(g, x + 92, y + 46, 44, 24, '#05070f', '#4a5280');
  for (let i = 0; i < 5; i++) box(g, x + 96 + i * 8, y + 66 - (4 + ((i * 7 + Math.floor(t * 3)) % 13)), 5, 4 + ((i * 7 + Math.floor(t * 3)) % 13), '#4de1ff');
  const lean = mood === 'lean' ? 4 : 0;
  const hx = x + 52 + lean;
  const hy = y + 40 + (mood === 'lean' ? 2 : 0);
  // shoulders: navy polo with a round mission patch
  poly(g, [[x + 14, y + h], [x + 20, y + 62], [hx - 14, y + 54], [hx + 14, y + 54], [x + 84, y + 62], [x + 90, y + h]], '#1d2f6b');
  dot(g, x + 36, y + 66, 5, PAL.yellow);
  dot(g, x + 36, y + 66, 2.5, '#d6453d');
  // head, hair, headset with boom mic
  dot(g, hx, hy, 15, '#e0b48a');
  g.fillStyle = '#2b2118';
  g.beginPath();
  g.arc(hx, hy - 2, 15, Math.PI, TAU);
  g.fill();
  g.beginPath();
  g.arc(hx, hy - 2, 17, Math.PI * 1.05, Math.PI * 1.95);
  stroke(g, '#10152e', 3);
  dot(g, hx - 16, hy + 2, 4, '#10152e');
  line(g, hx - 16, hy + 4, hx - 6, hy + 14, '#10152e', 1.5);
  dot(g, hx - 6, hy + 14, 2, '#10152e');
  // face
  const blink = t % 3 < 0.12;
  const eyeY = hy - 2;
  if (mood === 'cheer') {
    for (const sx of [-5, 5]) {
      g.beginPath();
      g.arc(hx + sx, eyeY, 2.5, Math.PI, TAU);
      stroke(g, '#1b1030', 1.6);
    }
    g.beginPath();
    g.arc(hx, hy + 5, 5, 0.1 * Math.PI, 0.9 * Math.PI);
    stroke(g, '#1b1030', 1.6);
  } else {
    for (const sx of [-5, 5]) {
      if (blink && mood === 'idle') line(g, hx + sx - 2, eyeY, hx + sx + 2, eyeY, '#1b1030', 1.5);
      else dot(g, hx + sx, eyeY, mood === 'oops' ? 3 : 2, '#1b1030');
    }
    if (mood === 'oops') dot(g, hx, hy + 7, 3, '#7a2a2a');
    else if (mood === 'lean') dot(g, hx, hy + 6, 2.2, '#7a2a2a');
    else line(g, hx - 4, hy + 6, hx + 4, hy + 6, '#1b1030', 1.5);
  }
  // arms: fists up (cheer), hands on head (oops), else hands near the keyboard; the mug rises to his mouth every 5 s
  if (mood === 'cheer') {
    const up = 0.5 + 0.5 * Math.sin(rt * 14);
    for (const sx of [-1, 1]) {
      line(g, hx + sx * 16, y + 58, hx + sx * 28, y + 24 - 3 * up, '#e0b48a', 5);
      dot(g, hx + sx * 28, y + 22 - 3 * up, 4.5, '#e0b48a');
    }
  } else if (mood === 'oops') {
    for (const sx of [-1, 1]) {
      line(g, hx + sx * 18, y + 60, hx + sx * 12, hy - 12, '#e0b48a', 5);
      dot(g, hx + sx * 12, hy - 14, 4.5, '#e0b48a');
    }
  } else {
    const sip = t % 5 > 4.6 ? Math.sin(((t % 5) - 4.6) * Math.PI * 2.5) : 0;
    const mx = x + 22 + sip * 14;
    const my = y + h - 22 - sip * 26;
    box(g, mx, my, 12, 12, '#f4f6ff', '#8f9bd6');
    box(g, mx + 12, my + 3, 3, 6, '#f4f6ff');
    line(g, x + 76, y + 64, x + 84, y + h - 16, '#e0b48a', 5);
  }
  g.restore();
  g.strokeStyle = '#4a5280';
  g.lineWidth = 2;
  rr(g, x, y, w, h, 6);
  g.stroke();
  text(g, 'GROUND', x + 6, y + 12, PAL.dim, 11, 'left');
}

// ---- controls ---------------------------------------------------------------------------------------------------------------------------------------------------

/** The dark strip, the fader slot with a tick at every step (none labelled) and the two end numbers. */
export function faderStrip(g: G, kind: 'm' | 'i') {
  g.fillStyle = 'rgba(6,10,36,0.82)';
  rr(g, STRIP.x, STRIP.y, STRIP.w, STRIP.h, 8);
  g.fill();
  line(g, FADER.x0, FADER.y, FADER.x1, FADER.y, PAL.dim, 4);
  const n = kind === 'm' ? 19 : 29;
  for (let i = 0; i <= n; i++) {
    const x = FADER.x0 + (i / n) * (FADER.x1 - FADER.x0);
    line(g, x, FADER.y - 7, x, FADER.y - 4, PAL.dim, 1.5);
  }
  text(g, kind === 'm' ? '0.2' : '20', FADER.x0, FADER.y + 24, PAL.dim, 11);
  text(g, kind === 'm' ? '4' : '600', FADER.x1, FADER.y + 24, PAL.dim, 11);
}
/** The level 2 heading ring round Pebble, ticks every 15° (no numbers), and the camera glyph on the knob's inner side. */
export function compass(g: G, h: number) {
  g.beginPath();
  g.arc(PEB.x, PEB.y, COMPASS.r, 0, TAU);
  stroke(g, 'rgba(244,246,255,0.4)', 2);
  for (let d = 0; d < 360; d += 15) {
    const c = Math.cos(rad(d));
    const s = -Math.sin(rad(d));
    line(g, PEB.x + (COMPASS.r - 3) * c, PEB.y + (COMPASS.r - 3) * s, PEB.x + (COMPASS.r + 3) * c, PEB.y + (COMPASS.r + 3) * s, 'rgba(244,246,255,0.5)', 1.5);
  }
  const c = Math.cos(rad(h));
  const s = -Math.sin(rad(h));
  dot(g, PEB.x + (COMPASS.r - 30) * c, PEB.y + (COMPASS.r - 30) * s, 4, PAL.cyan);
}
/** The level 4 thruster switch: a track, with the knob at x0 (off) or x1 (on). */
export function thrusterSwitch(g: G, thr: number) {
  g.fillStyle = 'rgba(6,10,36,0.82)';
  rr(g, THR.x0 - 30, THR.y - 24, THR.x1 - THR.x0 + 60, 48, 8);
  g.fill();
  g.fillStyle = thr ? '#2f6f4a' : '#3a3f5c';
  rr(g, THR.x0 - 12, THR.y - 7, THR.x1 - THR.x0 + 24, 14, 7);
  g.fill();
}
/** The level 4 dashed station-keeping slot round PEB. */
export function slotBox(g: G) {
  g.beginPath();
  g.rect(PEB.x - SLOT.w / 2, PEB.y - SLOT.h / 2, SLOT.w, SLOT.h);
  stroke(g, 'rgba(244,246,255,0.4)', 1.5, [5, 5]);
  text(g, 'SLOT', PEB.x - SLOT.w / 2 + 3, PEB.y - SLOT.h / 2 - 4, PAL.dim, 11, 'left');
}
/** A level 5 hatch: a ring with four bolts and a dark iris. `open` 0 (closed) to 1 (open); `shut` draws the grey disc of a closed hatch. */
export function hatch(g: G, x: number, y: number, open: number, shut: boolean, selected: boolean) {
  dot(g, x, y, 22, shut ? '#6a6f8f' : '#0a0d1c');
  if (!shut && open < 1) {
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6 + open * 1.2;
      poly(g, [[x, y], [x + 22 * Math.cos(a), y + 22 * Math.sin(a)], [x + 22 * Math.cos(a + 0.9), y + 22 * Math.sin(a + 0.9)]], '#2a3050');
    }
  }
  g.beginPath();
  g.arc(x, y, 22, 0, TAU);
  stroke(g, selected ? PAL.yellow : 'rgba(143,152,192,0.7)', 3, selected ? [] : [4, 3]);
  for (let i = 0; i < 4; i++) dot(g, x + 22 * Math.cos((i * TAU) / 4 + 0.78), y + 22 * Math.sin((i * TAU) / 4 + 0.78), 1.8, '#cfd3e6');
}

// ---- effects ------------------------------------------------------------------------------------------------------------------------------------------------------

/** Tiny white thruster puffs at (x, y) drifting along (dx, dy); u 0..1 is the age of the newest puff. */
export function puffs(g: G, x: number, y: number, dx: number, dy: number, u: number, n = 3) {
  for (let i = 0; i < n; i++) {
    const age = (u + i / n) % 1;
    dot(g, x + dx * age * 22, y + dy * age * 22, 2 + 4 * age, `rgba(255,255,255,${(0.5 * (1 - age)).toFixed(2)})`);
  }
}
/** The kick ring (a white ring growing at Pebble, alpha 0.45 to 0). */
export function ring(g: G, x: number, y: number, u: number, r1: number) {
  g.beginPath();
  g.arc(x, y, r1 * clamp01(u), 0, TAU);
  stroke(g, `rgba(255,255,255,${(0.45 * (1 - clamp01(u))).toFixed(2)})`, 3);
}
/** A speck of dust: a grey dot with a three-dot trail, flying from (x0, y0) to (x1, y1) with progress u. */
export function speck(g: G, x0: number, y0: number, x1: number, y1: number, u: number) {
  for (let i = 0; i < 4; i++) {
    const p = clamp01(u - i * 0.06);
    dot(g, x0 + (x1 - x0) * p, y0 + (y1 - y0) * p, i === 0 ? 3 : 2, `rgba(190,190,200,${(1 - i * 0.25).toFixed(2)})`);
  }
}
/** The eclipse: a dark overlay. */
export function eclipse(g: G, a: number) {
  if (a <= 0) return;
  g.fillStyle = `rgba(2,4,16,${a.toFixed(2)})`;
  g.fillRect(0, 0, 640, 340);
}
/** A dashed line from `from` to `to` with an arrowhead: the pull test tether. */
export function tether(g: G, x0: number, y0: number, x1: number, y1: number) {
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  stroke(g, PAL.orange, 2, [4, 3]);
  const d = Math.hypot(x1 - x0, y1 - y0) || 1;
  arrowHead(g, x1, y1, (x1 - x0) / d, (y1 - y0) / d, 7, PAL.orange);
}
/** Level 1: the dashed yellow ghost of the burn pose, the field line and the θ arc. */
export function burnAngle(g: G, fieldDeg: number, burnDeg: number, th: number) {
  const f = rad(fieldDeg);
  const b = rad(burnDeg);
  line(g, PEB.x, PEB.y, PEB.x + 70 * Math.cos(f), PEB.y - 70 * Math.sin(f), PAL.cyan, 2);
  line(g, PEB.x, PEB.y, PEB.x + 70 * Math.cos(b), PEB.y - 70 * Math.sin(b), PAL.yellow, 2, [4, 4]);
  g.beginPath();
  g.arc(PEB.x, PEB.y, 40, -b, -f);
  stroke(g, PAL.white, 1.5);
  const m = (f + b) / 2;
  tag(g, `θ = ${th}°`, PEB.x + 56 * Math.cos(m), PEB.y - 56 * Math.sin(m) + 4, PAL.white, 11);
}
/** The field's dipole lines around Pebble's axis (r = L sin²φ), gold: drawn on a level 5 win only. */
export function dipoleLines(g: G, x: number, y: number, deg: number, a: number) {
  const ax = rad(deg);
  for (const L of [40, 70, 100]) {
    for (const side of [-1, 1]) {
      g.beginPath();
      for (let i = 0; i <= 40; i++) {
        const phi = (i / 40) * Math.PI; // angle from the axis
        const r = L * Math.sin(phi) ** 2;
        const px = r * Math.cos(phi);
        const py = side * r * Math.sin(phi);
        const wx = x + px * Math.cos(ax) + py * Math.sin(ax);
        const wy = y - px * Math.sin(ax) + py * Math.cos(ax);
        if (i) g.lineTo(wx, wy);
        else g.moveTo(wx, wy);
      }
      stroke(g, `rgba(255,210,63,${(0.6 * a).toFixed(2)})`, 1.5);
    }
  }
}

// ---- the win-only teaching insets --------------------------------------------------------------------------------------------------------------------------

export type InsetKind = 'tau' | 'well' | 'work' | 'forces' | 'lines';
export const INSET_LABEL = { tau: 'τ = mB sin θ', well: 'U = −mB cos θ', work: 'W = ΔU', lines: 'field of Pebble' } as const;
/** A small dark panel with a label and a picture; drawn only after a win. `a` is its fade-in alpha. */
export function inset(g: G, kind: InsetKind, r: Round, a: number) {
  if (a <= 0) return;
  const { x, y, w, h } = INSET;
  g.save();
  g.globalAlpha = clamp01(a);
  g.fillStyle = 'rgba(6,10,36,0.92)';
  rr(g, x, y, w, h, 6);
  g.fill();
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1;
  rr(g, x, y, w, h, 6);
  g.stroke();
  const label = kind === 'forces' ? (r.kind === 'coil' && r.uniform ? 'F = 0 net' : 'net F') : INSET_LABEL[kind];
  text(g, label, x + 6, y + 14, PAL.white, 11, 'left');
  const px = x + 10;
  const py = y + 26;
  const pw = w - 20;
  const ph = h - 34;
  const curve = (f: (u: number) => number, u0: number, u1: number, color: string) => {
    g.beginPath();
    for (let i = 0; i <= 24; i++) {
      const u = u0 + ((u1 - u0) * i) / 24;
      const X = px + (i / 24) * pw;
      const Y = py + ph / 2 - (f(u) * ph) / 2.2;
      if (i) g.lineTo(X, Y);
      else g.moveTo(X, Y);
    }
    stroke(g, color, 1.8);
  };
  if (kind === 'tau') {
    curve((u) => Math.sin(u), 0, Math.PI, PAL.cyan);
    if (r.kind === 'spin') dot(g, px + (r.th / 180) * pw, py + ph / 2 - (Math.sin(rad(r.th)) * ph) / 2.2, 3, PAL.yellow);
  } else if (kind === 'well') {
    curve((u) => -Math.cos(u), 0, TAU, PAL.cyan);
    dot(g, px, py + ph / 2 + ph / 2.2, 3, PAL.green);
    dot(g, px + pw / 2, py + ph / 2 - ph / 2.2, 3, PAL.orange);
  } else if (kind === 'work') {
    curve((u) => -Math.cos(u), 0, Math.PI, PAL.cyan);
    const t = r.kind === 'swing' ? r.target : 90;
    const X = px + (t / 180) * pw;
    line(g, X, py + ph / 2 + (Math.cos(rad(t)) * ph) / 2.2, X, py + ph / 2 + ph / 2.2, PAL.yellow, 2);
    dot(g, px, py + ph / 2 + ph / 2.2, 3, PAL.green);
  } else if (kind === 'forces') {
    const cx = x + w / 2;
    const cy = py + ph / 2;
    box(g, cx - 12, cy - 9, 24, 18, '#c87533');
    const big = r.kind === 'coil' && !r.uniform;
    line(g, cx + 12, cy, cx + 12 + (big ? 34 : 18), cy, PAL.orange, 3);
    line(g, cx - 12, cy, cx - 12 - 18, cy, PAL.orange, 3);
  } else {
    dipoleLines(g, x + w / 2, py + ph / 2, 0, 1);
  }
  g.restore();
}
