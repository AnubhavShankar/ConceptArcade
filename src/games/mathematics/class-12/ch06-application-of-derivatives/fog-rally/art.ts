// Drawing for Fog Rally: the scenery (mountains, road, fog, flag, gate), Dusty's monster truck, the marshal, the scout drone, the billboard and the gear strip.
// Nothing here knows the answer of a round: it draws what it is told to draw.
import { PAL } from '@core/arcade';
import { face } from '@core/mathkit';
import { glow, line, text, type Mood } from '@core/neon';
import type { Gear } from './logic';

export type G = CanvasRenderingContext2D;
export const ROAD = { x0: 60, x1: 580, top: 96, bottom: 236 };
export const STRIP = { y: 252, h: 34 };
export const TICKS_Y = 300;
/** The height at which the pad, flag and truck are drawn while the road is hidden, so their height cannot hint at the shape. */
export const NEUTRAL_Y = 168;
const ASPHALT = '#3a2f55';
const SKIN = '#e8c9a0';
const INK = '#1b1030';

function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// ---- The road's geometry ------------------------------------------------------------------------------------------------------------------------

export interface Geo {
  lo: number;
  hi: number;
  f: (x: number) => number;
  X: (x: number) => number;
  Y: (y: number) => number;
}
/** World to screen. The road is deliberately not to scale: its height range is stretched to fill the band, so the picture cannot be measured by eye. */
export function makeGeo(f: (x: number) => number, lo: number, hi: number): Geo {
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 0; i <= 160; i++) {
    const y = f(lo + ((hi - lo) * i) / 160);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const span = y1 - y0;
  if (span === 0) y1 = y0 + 1;
  else {
    y0 -= span * 0.08;
    y1 += span * 0.08;
  }
  return {
    lo,
    hi,
    f,
    X: (x) => ROAD.x0 + ((x - lo) / (hi - lo)) * (ROAD.x1 - ROAD.x0),
    Y: (y) => ROAD.bottom - ((y - y0) / (y1 - y0)) * (ROAD.bottom - ROAD.top),
  };
}
const curve = (g: G, geo: Geo) => {
  g.beginPath();
  for (let i = 0; i <= 120; i++) {
    const x = geo.lo + ((geo.hi - geo.lo) * i) / 120;
    if (i === 0) g.moveTo(geo.X(x), geo.Y(geo.f(x)));
    else g.lineTo(geo.X(x), geo.Y(geo.f(x)));
  }
};

// ---- Scenery ------------------------------------------------------------------------------------------------------------------------------------

const FAR: [number, number][] = [[0, 100], [60, 62], [120, 90], [200, 46], [280, 86], [350, 56], [430, 96], [510, 50], [580, 80], [640, 62], [640, 112], [0, 112]];
const NEAR: [number, number][] = [[0, 110], [90, 76], [170, 104], [260, 70], [340, 108], [450, 74], [540, 106], [640, 82], [640, 120], [0, 120]];
function mountain(g: G, pts: [number, number][], col: string) {
  g.fillStyle = col;
  g.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
  g.closePath();
  g.fill();
}
/** The three rounds of a level look different: a dusk, a teal night and a red boss night, each with its own sky prop and mountain colours. */
const SKIES = [
  { far: '#141a4a', near: '#1b2260', haze: 'rgba(255,140,60,0.10)', prop: 'moon' },
  { far: '#0f3a4a', near: '#16505c', haze: 'rgba(40,200,190,0.10)', prop: 'ringed' },
  { far: '#3a1240', near: '#521a4c', haze: 'rgba(255,60,90,0.12)', prop: 'redmoon' },
] as const;
/** Stars, a sky prop and two far mountain ranges: decoration that never follows f. `k` is the round, 0 to 2. */
export function sky(g: G, t: number, k = 0) {
  const s = SKIES[Math.max(0, Math.min(2, k))];
  g.fillStyle = s.haze;
  g.fillRect(0, 0, 640, 120);
  for (let i = 0; i < 30; i++) {
    g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + i);
    g.fillStyle = PAL.white;
    g.fillRect(((i * 97 + 31) % 620) + 10, ((i * 53 + 17) % 100) + 6, 2, 2);
  }
  g.globalAlpha = 1;
  const px = 560;
  const py = 70;
  g.fillStyle = s.prop === 'redmoon' ? '#ff6a7a' : s.prop === 'ringed' ? '#9fe8e0' : '#f4efc8';
  g.beginPath();
  g.arc(px, py, s.prop === 'redmoon' ? 17 : 12, 0, Math.PI * 2);
  g.fill();
  if (s.prop === 'ringed') {
    g.strokeStyle = '#c9fff8';
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(px, py, 22, 6, -0.4, 0, Math.PI * 2);
    g.stroke();
  }
  mountain(g, FAR, s.far);
  mountain(g, NEAR, s.near);
}

/** The road as a thick ribbon with a dashed centre line, drawn only left of clipX (the part the headlights have revealed). */
export function roadLine(g: G, geo: Geo, clipX: number) {
  if (!(clipX > 0)) return;
  g.save();
  g.beginPath();
  g.rect(0, 0, clipX, 340);
  g.clip();
  curve(g, geo);
  g.strokeStyle = ASPHALT;
  g.lineWidth = 10;
  g.lineJoin = 'round';
  g.stroke();
  curve(g, geo);
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 2;
  g.setLineDash([10, 10]);
  g.stroke();
  g.setLineDash([]);
  g.restore();
}
/** Round 1's helper: the road as a faint silhouette seen through the fog. */
export function silhouette(g: G, geo: Geo) {
  g.globalAlpha = 0.35;
  curve(g, geo);
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 3;
  g.stroke();
  g.globalAlpha = 1;
}

/** Fog in 8 px columns over the road band; columns left of `cut` (the headlight reach) are skipped. `alpha` 0..1 fades the whole bank. */
export function fog(g: G, t: number, cut: number, alpha: number) {
  if (alpha <= 0) return;
  g.fillStyle = `rgba(150,165,210,${0.93 * alpha})`;
  g.beginPath();
  for (let x = 50; x < 600; x += 8) if (x >= cut) g.rect(x, 60, 8, 188);
  g.fill();
  g.fillStyle = `rgba(150,165,210,${0.25 * alpha})`;
  for (let i = 0; i < 6; i++) {
    const px = 50 + ((i * 97 + t * 6) % 550);
    if (px < cut) continue;
    g.beginPath();
    g.ellipse(px, 84 + i * 26, 46, 14, 0, 0, Math.PI * 2);
    g.fill();
  }
}

export function startPad(g: G, geo: Geo, y: number) {
  line(g, 20, y, geo.X(geo.lo), y, ASPHALT, 10);
  line(g, 20, y + 6, 20, y + 14, PAL.dim, 3);
}
/** A checkered finish flag on a pole whose foot is at (x, y). */
export function finishFlag(g: G, x: number, y: number, t: number) {
  line(g, x, y, x, y - 40, PAL.white, 2);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 2; r++) {
      g.fillStyle = (c + r) % 2 ? '#111' : PAL.white;
      g.fillRect(x + 1 + c * 6, y - 40 + r * 6 + Math.sin(t * 5 + c) * 1.2, 6, 6);
    }
  }
}
export function startGate(g: G, x: number, y: number) {
  line(g, x - 15, y, x - 15, y - 36, PAL.white, 3);
  line(g, x + 15, y, x + 15, y - 36, PAL.white, 3);
  rr(g, x - 20, y - 46, 40, 12, 3);
  g.fillStyle = '#2a3270';
  g.fill();
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1.5;
  g.stroke();
  text(g, 'START', x, y - 37, PAL.white, 8);
}

// ---- Smoke and exhaust puffs ----------------------------------------------------------------------------------------------------------------------

export function makePuffs() {
  const list: { x: number; y: number; born: number; col: string }[] = [];
  let last = -1;
  return {
    emit(t: number, x: number, y: number, every: number, col = 'rgba(180,180,190,') {
      if (t - last < every) return;
      last = t;
      list.push({ x, y, born: t, col });
      if (list.length > 40) list.shift();
    },
    draw(g: G, t: number) {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        const age = t - p.born;
        if (age > 0.6 || age < 0) {
          list.splice(i, 1);
          continue;
        }
        g.fillStyle = `${p.col}${0.5 * (1 - age / 0.6)})`;
        g.beginPath();
        g.arc(p.x, p.y - age * 14, 3 + (7 * age) / 0.6, 0, Math.PI * 2);
        g.fill();
      }
    },
  };
}
export type Puffs = ReturnType<typeof makePuffs>;

// ---- Dusty's truck ------------------------------------------------------------------------------------------------------------------------------

export interface TruckOpts {
  gear: Gear;
  mood: Mood;
  wheel: number;
  flip: number;
  speedLines: boolean;
}
function wheel(g: G, wx: number, wy: number, rot: number) {
  g.fillStyle = '#151515';
  g.beginPath();
  g.arc(wx, wy, 11, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#2f2f2f';
  for (let k = 0; k < 10; k++) {
    const a = rot + (k * Math.PI * 2) / 10;
    g.beginPath();
    g.arc(wx + Math.cos(a) * 9.6, wy + Math.sin(a) * 9.6, 1.9, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#c8ccd8';
  g.beginPath();
  g.arc(wx, wy, 4, 0, Math.PI * 2);
  g.fill();
  for (let k = 0; k < 4; k++) line(g, wx, wy, wx + Math.cos(rot + (k * Math.PI) / 2) * 7, wy + Math.sin(rot + (k * Math.PI) / 2) * 7, '#c8ccd8', 1.5);
}
function spring(g: G, wx: number, top: number, bottom: number) {
  g.strokeStyle = '#d9dcec';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(wx, bottom);
  for (let i = 1; i <= 4; i++) g.lineTo(wx + (i % 2 ? 3 : -3), bottom + ((top - bottom) * i) / 4);
  g.stroke();
}
/** The driver: helmet, goggles with a sliding glint, a face for each mood, a trailing scarf, dizzy stars or a raised fist. */
function driver(g: G, hx: number, hy: number, t: number, mood: Mood) {
  line(g, hx - 5, hy + 5, hx - 12, hy + 5 + 3 * Math.sin(t * 8), PAL.red, 3);
  line(g, hx - 12, hy + 5 + 3 * Math.sin(t * 8), hx - 19, hy + 5 + 3 * Math.sin(t * 8 + 1), PAL.red, 3);
  line(g, hx - 19, hy + 5 + 3 * Math.sin(t * 8 + 1), hx - 25, hy + 5 + 3 * Math.sin(t * 8 + 2), PAL.red, 2.5);
  g.fillStyle = SKIN;
  g.beginPath();
  g.arc(hx, hy, 6.5, 0, Math.PI * 2);
  g.fill();
  if (mood === 'dizzy') {
    for (const dx of [-2.6, 2.6]) {
      line(g, hx + dx - 1.4, hy - 1, hx + dx + 1.4, hy + 1.8, INK, 1.4);
      line(g, hx + dx + 1.4, hy - 1, hx + dx - 1.4, hy + 1.8, INK, 1.4);
    }
    line(g, hx - 2, hy + 4, hx + 2, hy + 4, INK, 1.4);
  } else face(g, hx, hy + 0.6, 6, mood, t, INK);
  g.fillStyle = PAL.cyan;
  g.beginPath();
  g.arc(hx, hy - 1, 7.5, Math.PI, 2 * Math.PI);
  g.closePath();
  g.fill();
  g.fillStyle = PAL.white;
  g.fillRect(hx - 1.2, hy - 8.5, 2.4, 6.5);
  g.fillStyle = PAL.yellow;
  g.fillRect(hx - 6.5, hy - 4.6, 13, 3);
  const gp = (t % 3) / 0.4;
  if (gp < 1) {
    g.fillStyle = PAL.white;
    g.fillRect(hx - 6.5 + gp * 12, hy - 4.6, 1.5, 3);
  }
  if (mood === 'dizzy') {
    for (let i = 0; i < 3; i++) {
      const a = t * 4 + i * 2.094;
      text(g, '✦', hx + Math.cos(a) * 12, hy - 10 + Math.sin(a) * 4, PAL.yellow, 8);
    }
  }
  if (mood === 'cheer') {
    const up = Math.sin(t * 10) * 4;
    line(g, hx + 3, hy + 5, hx + 9, hy - 13 + up, SKIN, 2.5);
    g.fillStyle = PAL.red;
    g.beginPath();
    g.arc(hx + 9, hy - 14 + up, 3, 0, Math.PI * 2);
    g.fill();
  }
}
/**
 * Draw the truck with its chassis centre at (cx, cy), tilted by `ang` (plus `o.flip` half turns). Returns the screen position of the exhaust pipe.
 * Local axes: +x is forward, the wheels touch the road 25 px below the centre.
 */
export function truck(g: G, cx: number, cy: number, ang: number, t: number, o: TruckOpts): { px: number; py: number } {
  const th = ang + o.flip * Math.PI;
  g.save();
  g.translate(cx, cy);
  g.rotate(th);
  if (o.speedLines) {
    g.globalAlpha = 0.6;
    for (let i = 0; i < 3; i++) line(g, -34 - i * 4, -4 + i * 9, -64 - i * 7, -4 + i * 9, PAL.white, 2);
    g.globalAlpha = 1;
  }
  g.fillStyle = 'rgba(255,230,140,0.22)';
  g.beginPath();
  g.moveTo(28, -2);
  g.lineTo(98, -16);
  g.lineTo(98, 12);
  g.fill();
  // body, cab, window
  rr(g, -26, -8.5, 52, 17, 4);
  g.fillStyle = PAL.orange;
  g.fill();
  g.fillStyle = '#e07a1f';
  g.beginPath();
  g.moveTo(-6, -8.5);
  g.lineTo(-2, -20);
  g.lineTo(14, -20);
  g.lineTo(18, -8.5);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(155,215,255,0.85)';
  g.beginPath();
  g.moveTo(-3, -9.5);
  g.lineTo(0, -18.5);
  g.lineTo(12, -18.5);
  g.lineTo(15, -9.5);
  g.closePath();
  g.fill();
  driver(g, 6, -13.5, t, o.mood);
  // roll cage, door number, mud flap, exhaust pipe
  line(g, 0, -19, -2, -27, '#111', 2);
  line(g, 14, -19, 16, -27, '#111', 2);
  line(g, -2, -27, 16, -27, '#111', 2);
  g.fillStyle = PAL.white;
  g.beginPath();
  g.arc(8, 2, 5, 0, Math.PI * 2);
  g.fill();
  text(g, '6', 8, 5, INK, 8);
  g.fillStyle = '#222';
  g.fillRect(-29, 0, 3, 11);
  g.fillStyle = '#8a8a96';
  g.fillRect(-31, -10, 6, 3);
  // lights
  glow(g, PAL.yellow, 10, () => {
    g.fillStyle = PAL.yellow;
    g.beginPath();
    g.arc(26, -2, 3.5, 0, Math.PI * 2);
    g.fill();
  });
  if (o.gear === 'brake') {
    glow(g, PAL.red, 12, () => {
      g.fillStyle = PAL.red;
      g.fillRect(-28, -4, 3, 7);
    });
  } else {
    g.fillStyle = '#7a2020';
    g.fillRect(-28, -4, 3, 7);
  }
  // tyres and springs
  wheel(g, -17, 14, o.wheel);
  wheel(g, 17, 14, o.wheel);
  const bob = 1.5 * Math.sin(t * 12);
  spring(g, -17, 4 + bob, 12);
  spring(g, 17, 4 + bob, 12);
  g.restore();
  const lx = -31;
  const ly = -8.5;
  return { px: cx + lx * Math.cos(th) - ly * Math.sin(th), py: cy + lx * Math.sin(th) + ly * Math.cos(th) };
}
/** Chassis centre for a truck whose wheels touch the road at (x, y) on a slope of angle `ang`. */
export const centreFor = (x: number, y: number, ang: number, lift: number): [number, number] => [x + 25 * Math.sin(ang), y - 25 * Math.cos(ang) + lift];

// ---- The marshal ---------------------------------------------------------------------------------------------------------------------------------

export type MarshalState = 'idle' | 'win' | 'void' | 'crash';
export function marshal(g: G, x: number, y0: number, t: number, state: MarshalState) {
  const y = y0 - (state === 'win' ? Math.abs(Math.sin(t * 8)) * 8 : 0);
  line(g, x - 3, y, x - 3, y - 10, '#2a2a5a', 3);
  line(g, x + 3, y, x + 3, y - 10, '#2a2a5a', 3);
  g.fillStyle = PAL.orange;
  g.fillRect(x - 6, y - 26, 12, 16);
  g.fillStyle = PAL.white;
  g.fillRect(x - 6, y - 20, 12, 2.5);
  const hx = x + (state === 'void' ? Math.sin(t * 10) * 2 : 0);
  g.fillStyle = SKIN;
  g.beginPath();
  g.arc(hx, y - 32, 6, 0, Math.PI * 2);
  g.fill();
  face(g, hx, y - 31, 6, state === 'win' ? 'cheer' : state === 'idle' ? 'happy' : 'worried', t, INK);
  g.fillStyle = '#1d2a6e';
  g.beginPath();
  g.arc(hx, y - 33, 6.5, Math.PI, 2 * Math.PI);
  g.closePath();
  g.fill();
  g.fillRect(hx + 1, y - 34, 9, 2);
  if (state === 'crash') {
    line(g, x - 5, y - 24, hx - 3, y - 32, PAL.orange, 3);
    line(g, x + 5, y - 24, hx + 3, y - 32, PAL.orange, 3);
    g.fillStyle = SKIN;
    g.beginPath();
    g.arc(hx - 3, y - 32, 2.6, 0, Math.PI * 2);
    g.arc(hx + 3, y - 32, 2.6, 0, Math.PI * 2);
    g.fill();
    return;
  }
  // the flag in the right hand
  line(g, x + 5, y - 22, x + 10, y - 22, PAL.orange, 3);
  g.save();
  g.translate(x + 10, y - 22);
  g.rotate(state === 'win' ? Math.sin(t * 10) * 0.5 : Math.sin(t * 3) * 0.12);
  line(g, 0, 0, 0, -30, PAL.white, 2);
  if (state === 'win') {
    for (let c = 0; c < 3; c++) {
      for (let r = 0; r < 2; r++) {
        g.fillStyle = (c + r) % 2 ? '#111' : PAL.white;
        g.fillRect(1 + c * 6, -30 + r * 6, 6, 6);
      }
    }
  } else {
    const sway = Math.sin(t * 3) * 3;
    g.fillStyle = state === 'void' ? PAL.yellow : PAL.green;
    g.beginPath();
    g.moveTo(0, -30);
    g.lineTo(18 + sway, -26);
    g.lineTo(0, -19);
    g.fill();
  }
  g.restore();
}

// ---- The scout drone ------------------------------------------------------------------------------------------------------------------------------

/** A quadcopter with spinning rotors and a blinking light; with `cone` it shines a lamp down to y = 248 and shows the slope arrow in the beam. */
export function drone(g: G, x: number, y: number, t: number, cone: 'up' | 'down' | 'flat' | null) {
  if (cone) {
    g.fillStyle = 'rgba(255,255,200,0.28)';
    g.beginPath();
    g.moveTo(x - 4, y + 4);
    g.lineTo(x + 4, y + 4);
    g.lineTo(x + 32, 248);
    g.lineTo(x - 32, 248);
    g.closePath();
    g.fill();
    const arrow = cone === 'up' ? '↗' : cone === 'down' ? '↘' : '→';
    text(g, arrow, x, 176, cone === 'up' ? PAL.green : cone === 'down' ? PAL.orange : PAL.white, 34);
  }
  g.fillStyle = '#2c3470';
  g.fillRect(x - 7, y - 3, 14, 6);
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1;
  g.strokeRect(x - 7, y - 3, 14, 6);
  for (const dx of [-13, -5, 5, 13]) {
    line(g, x + dx * 0.6, y - 3, x + dx, y - 6, PAL.dim, 1.5);
    g.fillStyle = 'rgba(200,220,255,0.5)';
    g.beginPath();
    g.ellipse(x + dx, y - 6, 6, 1.2 + Math.abs(Math.sin(t * 40)) * 1.6, 0, 0, Math.PI * 2);
    g.fill();
  }
  if (Math.sin(t * 8) > 0) {
    g.fillStyle = PAL.red;
    g.beginPath();
    g.arc(x, y - 4, 1.6, 0, Math.PI * 2);
    g.fill();
  }
}

// ---- Heads-up pieces drawn on the canvas ---------------------------------------------------------------------------------------------------------------

export function billboard(g: G, lines: [string, string, string?]) {
  const h = lines[2] ? 60 : 44;
  rr(g, 14, 10, 330, h, 8);
  g.fillStyle = 'rgba(10,14,50,0.85)';
  g.fill();
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1.5;
  g.stroke();
  text(g, lines[0], 26, 26, PAL.dim, 11, 'left');
  text(g, lines[1], 26, 44, PAL.yellow, 14, 'left');
  if (lines[2]) text(g, lines[2], 26, 62, PAL.white, 11, 'left');
}

/** The round's goal as one short line at the top right; it shows for 3 s from the start of the round and fades out in the last 0.6 s. */
export function goalLine(g: G, goal: string, age: number) {
  if (age >= 3) return;
  g.globalAlpha = age < 2.4 ? 1 : Math.max(0, (3 - age) / 0.6);
  rr(g, 352, 8, 280, 26, 8);
  g.fillStyle = 'rgba(10,14,50,0.92)';
  g.fill();
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 1.5;
  g.stroke();
  text(g, `GOAL: ${goal}`, 492, 25, PAL.yellow, 12);
  g.globalAlpha = 1;
}

/** The handle on the bottom track: a ring with ⇔ arrows, the player's own setting above it, and a pulsing "drag" cue until the first touch. */
export const KNOB_R = 20;
export function knob(g: G, x: number, y: number, reading: string, t: number, cue: boolean) {
  g.fillStyle = '#2a2350';
  g.beginPath();
  g.arc(x, y, KNOB_R - 3, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 2;
  g.stroke();
  text(g, '⇔', x, y + 5, PAL.yellow, 16);
  text(g, reading, x, y - 30, PAL.yellow, 13);
  if (cue) {
    g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6);
    text(g, '⇔ drag me', x, y - 46, PAL.white, 12);
    g.globalAlpha = 1;
  }
}

/** The bottom track with its end values (11 px, so they read on a phone). */
export function trackBar(g: G, lo: number, hi: number, x0: number, x1: number, y: number) {
  line(g, x0, y, x1, y, PAL.dim, 3);
  text(g, String(lo), x0, y + 16, PAL.dim, 11);
  text(g, String(hi), x1, y + 16, PAL.dim, 11);
}

/** The eight-cell gear chart under the fogged road, with the edge labels and the caption. */
export function gearStrip(g: G, gears: Gear[], last: number, edges: string[], playing: boolean, t = 0, cue = false) {
  for (let i = 0; i < 8; i++) {
    const x = ROAD.x0 + i * 65 + 1.5;
    const gear = gears[i] ?? null;
    rr(g, x, STRIP.y, 62, STRIP.h, 5);
    g.fillStyle = gear === 'gas' ? PAL.green : gear === 'brake' ? PAL.orange : '#2a3270';
    g.fill();
    text(g, gear === 'gas' ? '⬆ GAS' : gear === 'brake' ? '⬇ BRAKE' : '?', x + 31, STRIP.y + 21, gear === 'gas' ? '#06301a' : gear === 'brake' ? '#3a1a00' : PAL.dim, 12);
    if (i === last) {
      rr(g, x, STRIP.y, 62, STRIP.h, 5);
      g.strokeStyle = PAL.yellow;
      g.lineWidth = 2;
      g.stroke();
    }
  }
  if (cue) {
    g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6);
    rr(g, ROAD.x0 + 1.5, STRIP.y, 62, STRIP.h, 5);
    g.strokeStyle = PAL.yellow;
    g.lineWidth = 3;
    g.stroke();
    rr(g, ROAD.x0 + 4, STRIP.y - 22, 56, 18, 6);
    g.fillStyle = 'rgba(10,14,50,0.95)';
    g.fill();
    text(g, '👆 tap', ROAD.x0 + 32, STRIP.y - 9, PAL.yellow, 12);
    g.globalAlpha = 1;
  }
  edges.forEach((e, i) => text(g, e, ROAD.x0 + i * 65, TICKS_Y, PAL.dim, 11));
  if (playing) text(g, 'tap a stretch to switch it between GAS and BRAKE', 320, 320, PAL.dim, 11);
}
