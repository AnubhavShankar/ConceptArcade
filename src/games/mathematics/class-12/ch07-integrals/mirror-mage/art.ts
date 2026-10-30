// Drawing for Mirror Mage: Lyra the mirror mage (hooded robe, star embroidery, a staff with a silver mirror, a floating spellbook), the Stone Warden golem, the
// ruined tower, the violet barrier with its rune tablet, the mana ring, and the mirror-spell helper shapes. Nothing here knows the answer of a round: it draws the
// numbers, states and poses it is handed. The rune is drawn with no axis numbers and no grid, and the tablet is opaque so the screen grid cannot show through.
import { PAL } from '@core/arcade';
import { backdrop, face } from '@core/mathkit';
import { glow, line } from '@core/neon';
import { foldPlan, type Row } from './logic';

export type G = CanvasRenderingContext2D;
type P = [number, number];

export const RUNE = { x0: 168, x1: 470, top: 70, bottom: 250 };
export const RING = { cx: 84, cy: 128, R: 44 };
export const LYRA = { x: 84, y: 300 };
export const WARDEN = { x: 560, y: 262 };
export const ZERO = (RUNE.top + RUNE.bottom) / 2;
/** The tint of the mirror image's partner region in level 2 (the tests look for it). */
export const GOLD = 'rgba(255,210,63,0.22)';
const FILL_POS = 'rgba(77,225,255,0.18)';
const FILL_NEG = 'rgba(255,77,141,0.18)';
const LIGHT_POS = 'rgba(77,225,255,0.55)';
const LIGHT_NEG = 'rgba(255,77,141,0.55)';
const DASH = [5, 4];
const SAMPLES = 240;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const ease = (u: number) => clamp01(u) * clamp01(u) * (3 - 2 * clamp01(u));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const finite = (v: number) => (Number.isFinite(v) ? v : 0);

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
function poly(g: G, pts: P[], fill: string) {
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  g.fill();
}
/** A dashed outline (the mirror spell's colour and dash: the tests look for yellow dashed strokes). */
function dashed(g: G, pts: P[], closed: boolean, w = 2) {
  g.strokeStyle = PAL.yellow;
  g.lineWidth = w;
  g.setLineDash(DASH);
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  if (closed) g.closePath();
  g.stroke();
  g.setLineDash([]);
}
function puff(g: G, x: number, y: number, r: number, a: number, color = '#aab2cc') {
  if (a <= 0) return;
  g.globalAlpha = clamp01(a);
  dot(g, x, y, r, color);
  g.globalAlpha = 1;
}

// ---- The tower -------------------------------------------------------------------------------------------------------------------------------------------

const TORCHES: P[] = [[128, 104], [616, 92]];
/** The ruined tower: dark stone blocks, a floor, two torches with flickering flames and a few floating dust motes. Opaque, so the screen grid never shows. */
export function tower(g: G, t: number) {
  backdrop(g);
  g.fillStyle = '#0d1233';
  g.fillRect(0, 0, 640, 296);
  for (let row = 0; row < 11; row++) {
    const off = row % 2 ? 28 : 0;
    line(g, 0, row * 27 + 27, 640, row * 27 + 27, 'rgba(120,140,255,0.09)', 1);
    for (let x = off; x < 640; x += 56) line(g, x, row * 27, x, row * 27 + 27, 'rgba(120,140,255,0.09)', 1);
  }
  // a broken arch in the back wall and a missing block or two
  g.fillStyle = '#080c26';
  g.beginPath();
  g.arc(320, 30, 22, Math.PI, 0);
  g.fill();
  g.fillRect(298, 0, 44, 30);
  g.fillStyle = '#0a0f2c';
  g.fillRect(40, 190, 56, 27);
  g.fillRect(540, 135, 56, 27);
  g.fillStyle = '#141a45';
  g.fillRect(0, 296, 640, 44);
  line(g, 0, 296, 640, 296, 'rgba(143,155,214,0.35)', 2);
  for (const [x, y] of TORCHES) {
    g.fillStyle = '#2a2233';
    g.fillRect(x - 4, y, 8, 22);
    g.fillRect(x - 8, y - 2, 16, 5);
    const f = Math.sin(t * 11 + x) * 0.5 + Math.sin(t * 7.3 + x * 2) * 0.5;
    puff(g, x, y - 12, 38 + f * 3, 0.1, PAL.orange);
    poly(g, [[x - 7, y - 2], [x + 7, y - 2], [x + f * 2.5, y - 24 - f * 4]], PAL.orange);
    poly(g, [[x - 4, y - 2], [x + 4, y - 2], [x - f * 1.5, y - 15 - f * 2]], PAL.yellow);
  }
  g.fillStyle = '#c9d1ff';
  for (let i = 0; i < 14; i++) {
    const x = (i * 97 + t * (3 + (i % 4))) % 640;
    const y = 30 + ((i * 53) % 230) + Math.sin(t * 0.9 + i) * 8;
    g.globalAlpha = 0.18 + 0.2 * (0.5 + 0.5 * Math.sin(t * 1.7 + i * 2));
    g.fillRect(x, y, 1.8, 1.8);
  }
  g.globalAlpha = 1;
}

// ---- The rune --------------------------------------------------------------------------------------------------------------------------------------------

export interface Shape {
  /** Screen x of each point: the panel's left edge, the samples, the panel's right edge. */
  xs: number[];
  /** The height above the zero line in pixels of each point (negative below), clamped to the panel. */
  dy: number[];
  /** Pixels per unit of f. */
  sc: number;
}
const shapes = new WeakMap<Row, Shape>();
/** The rune sampled at the middles of 240 equal slices (never at an end point, where the logs blow up). The largest |f| fills 80% of the half-height. */
export function shapeOf(row: Row): Shape {
  let s = shapes.get(row);
  if (s) return s;
  const fs = Array.from({ length: SAMPLES }, (_, i) => finite(row.f(row.a + ((row.b - row.a) * (i + 0.5)) / SAMPLES)));
  const top = Math.max(...fs.map(Math.abs));
  const sc = top > 0 ? (0.8 * (RUNE.bottom - RUNE.top)) / 2 / top : 1;
  const limit = (RUNE.bottom - RUNE.top) / 2 + 8;
  const dy = fs.map((v) => clamp(v * sc, -limit, limit));
  const xs = fs.map((_, i) => RUNE.x0 + ((RUNE.x1 - RUNE.x0) * (i + 0.5)) / SAMPLES);
  s = { xs: [RUNE.x0, ...xs, RUNE.x1], dy: [dy[0], ...dy, dy[SAMPLES - 1]], sc };
  shapes.set(row, s);
  return s;
}
const X = (row: Row, x: number) => RUNE.x0 + ((x - row.a) / (row.b - row.a)) * (RUNE.x1 - RUNE.x0);
const yOf = (row: Row, sc: number, x: number) => ZERO - clamp(finite(row.f(x)) * sc, -98, 98);

function region(g: G, sh: Shape, color: string, sel: (v: number) => number) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(sh.xs[0], ZERO);
  for (let i = 0; i < sh.xs.length; i++) g.lineTo(sh.xs[i], ZERO - sel(sh.dy[i]));
  g.lineTo(sh.xs[sh.xs.length - 1], ZERO);
  g.closePath();
  g.fill();
}
function outline(g: G, sh: Shape) {
  let run: P[] = [];
  let pos = sh.dy[0] >= 0;
  const flush = () => {
    if (run.length > 1) {
      const c = pos ? PAL.cyan : PAL.pink;
      glow(g, c, 8, () => {
        g.strokeStyle = c;
        g.lineWidth = 2.4;
        g.lineJoin = 'round';
        g.beginPath();
        g.moveTo(run[0][0], run[0][1]);
        for (let i = 1; i < run.length; i++) g.lineTo(run[i][0], run[i][1]);
        g.stroke();
      });
    }
  };
  for (let i = 0; i < sh.xs.length; i++) {
    const p: P = [sh.xs[i], ZERO - sh.dy[i]];
    const up = sh.dy[i] >= 0;
    if (i > 0 && up !== pos) {
      const u = sh.dy[i - 1] / (sh.dy[i - 1] - sh.dy[i]);
      const c: P = [lerp(sh.xs[i - 1], sh.xs[i], u), ZERO];
      run.push(c);
      flush();
      run = [c];
      pos = up;
    }
    run.push(p);
  }
  flush();
}

/** The barrier: a translucent violet slab edged in pink, with an opaque dark tablet in it that carries the rune. */
export function barrier(g: G, t: number) {
  g.fillStyle = 'rgba(150,90,255,0.2)';
  g.fillRect(150, 50, 340, 220);
  glow(g, PAL.pink, 10, () => {
    g.strokeStyle = PAL.pink;
    g.lineWidth = 2;
    g.strokeRect(150, 50, 340, 220);
  });
  for (const [x, y] of [[158, 58], [482, 58], [158, 262], [482, 262]] as P[]) dot(g, x, y, 2.5, PAL.pink);
  g.fillStyle = '#080b2c';
  g.fillRect(160, 56, 320, 196);
  g.strokeStyle = 'rgba(255,77,141,0.45)';
  g.lineWidth = 1;
  g.strokeRect(160, 56, 320, 196);
  g.globalAlpha = 0.05 + 0.03 * Math.sin(t * 1.4);
  g.fillStyle = '#c9a8ff';
  g.fillRect(160 + ((t * 40) % 300), 56, 14, 196);
  g.globalAlpha = 1;
}

/**
 * The rune on the tablet: a faint zero line, the region between f and the axis (cyan above, pink below), a glowing outline, and the light of the cast: a bright
 * fill up to `light` (0..1) of the rune's width, and a white flare. No numbers, no grid.
 */
export function rune(g: G, row: Row, o: { light: number; flare: number }) {
  const sh = shapeOf(row);
  line(g, RUNE.x0 - 4, ZERO, RUNE.x1 + 4, ZERO, 'rgba(143,155,214,0.35)', 1);
  region(g, sh, FILL_POS, (v) => Math.max(v, 0));
  region(g, sh, FILL_NEG, (v) => Math.min(v, 0));
  if (o.light > 0) {
    g.save();
    g.beginPath();
    g.rect(RUNE.x0 - 2, 56, (RUNE.x1 - RUNE.x0 + 4) * clamp01(o.light), 196);
    g.clip();
    region(g, sh, LIGHT_POS, (v) => Math.max(v, 0));
    region(g, sh, LIGHT_NEG, (v) => Math.min(v, 0));
    g.restore();
    if (o.light < 1) {
      const fx = RUNE.x0 + (RUNE.x1 - RUNE.x0) * o.light;
      glow(g, PAL.cyan, 10, () => line(g, fx, ZERO - 84, fx, ZERO + 84, 'rgba(200,245,255,0.8)', 2));
    }
  }
  if (o.flare > 0) {
    g.globalAlpha = clamp01(o.flare);
    region(g, sh, '#ffffff', (v) => Math.max(v, 0));
    region(g, sh, '#ffffff', (v) => Math.min(v, 0));
    g.globalAlpha = 1;
  }
  outline(g, sh);
}

/** Cracks spreading over the barrier from the rune's middle; `u` runs 0..1. */
export function cracks(g: G, u: number) {
  const ends: P[] = [[160, 70], [240, 56], [330, 56], [430, 60], [480, 110], [478, 210], [400, 252], [300, 252], [200, 250], [160, 180]];
  g.strokeStyle = '#ffffff';
  g.lineWidth = 1.6;
  ends.forEach(([ex, ey], i) => {
    const mx = lerp(320, ex, 0.5) + (i % 2 ? 9 : -9);
    const my = lerp(160, ey, 0.5) + (i % 3 ? -7 : 7);
    g.beginPath();
    g.moveTo(320, 160);
    const a = clamp01(u * 2);
    g.lineTo(lerp(320, mx, a), lerp(160, my, a));
    if (u > 0.5) g.lineTo(lerp(mx, ex, (u - 0.5) * 2), lerp(my, ey, (u - 0.5) * 2));
    g.stroke();
  });
}
/** Shards of the shattered barrier flying outward; `u` is the seconds since it broke. */
export function shards(g: G, u: number) {
  const a = 1 - u / 0.9;
  if (a <= 0) return;
  g.globalAlpha = clamp01(a);
  for (let i = 0; i < 18; i++) {
    const cx = 168 + (i % 6) * 60;
    const cy = 70 + Math.floor(i / 6) * 70;
    const dx = cx - 320;
    const dy = cy - 160;
    const d = Math.hypot(dx, dy) || 1;
    const x = cx + (dx / d) * 150 * u + Math.sin(i) * 20 * u;
    const y = cy + (dy / d) * 150 * u + 260 * u * u;
    const s = 12 + (i % 4) * 4;
    const ang = u * (4 + (i % 5)) * (i % 2 ? 1 : -1);
    poly(g, [[x + Math.cos(ang) * s, y + Math.sin(ang) * s], [x + Math.cos(ang + 2.4) * s * 0.8, y + Math.sin(ang + 2.4) * s * 0.8], [x + Math.cos(ang + 4.1) * s * 0.6, y + Math.sin(ang + 4.1) * s * 0.6]], i % 2 ? 'rgba(180,120,255,0.8)' : 'rgba(255,77,141,0.8)');
  }
  g.globalAlpha = 1;
}

/** Under the tablet: the integrand and its limits, as the intel says them (never the answer). */
export function caption(g: G, row: Row) {
  g.font = 'bold 12px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillStyle = PAL.white;
  g.fillText(`∫ ${row.name} dx, from ${row.aText} to ${row.bText}`, 320, 265, 320);
}

/** The sparks of an overflow, along the rune's outline; `u` is the seconds since the rune filled. */
export function overflow(g: G, row: Row, u: number) {
  const sh = shapeOf(row);
  g.fillStyle = PAL.orange;
  for (let i = 0; i < 14; i++) {
    const j = 8 + Math.round((i / 13) * (sh.xs.length - 17));
    const x = sh.xs[j] + Math.sin(i * 3) * 6 * u;
    const y = ZERO - sh.dy[j] - (30 + (i % 4) * 14) * u + 90 * u * u * (i % 3 ? 0.4 : 0.8);
    g.globalAlpha = clamp01(1 - u / 0.8);
    g.fillRect(x - 1.5, y - 1.5, 3, 3);
  }
  g.globalAlpha = 1;
}

// ---- The mirror spell: helpers drawn over the rune ------------------------------------------------------------------------------------------------------

/** What the mirror spell shows, by level. `alpha` is how brightly. Only ever called while a helper is allowed (round 1 live, round 2 after a charge). */
export function mirrorShapes(g: G, level: 1 | 2 | 3 | 4 | 5, row: Row, alpha: number) {
  const sh = shapeOf(row);
  g.globalAlpha = clamp01(alpha);
  const M = sh.xs.length;
  if (level === 1) {
    const cuts = [row.a, ...(row.splits ?? []), row.b];
    for (let i = 0; i + 1 < cuts.length; i++) {
      const x0 = X(row, cuts[i]);
      const x1 = X(row, cuts[i + 1]);
      const pts: P[] = [[x0, ZERO], [x0, yOf(row, sh.sc, cuts[i])]];
      for (let j = 0; j < M; j++) if (sh.xs[j] > x0 && sh.xs[j] < x1) pts.push([sh.xs[j], ZERO - sh.dy[j]]);
      pts.push([x1, yOf(row, sh.sc, cuts[i + 1])], [x1, ZERO]);
      dashed(g, pts, true, 1.8);
    }
    for (const s of row.splits ?? []) line(g, X(row, s), 58, X(row, s), 250, PAL.yellow, 2, DASH);
  } else if (level === 2) {
    const top = ZERO - sh.sc;
    const partner: P[] = [[sh.xs[0], top]];
    for (let j = 0; j < M; j++) partner.push([sh.xs[j], ZERO - sh.dy[j]]);
    partner.push([sh.xs[M - 1], top]);
    poly(g, partner, GOLD);
    dashed(g, [[RUNE.x0, ZERO], [RUNE.x1, ZERO], [RUNE.x1, top], [RUNE.x0, top]], true);
  } else if (level === 3 || level === 5) {
    dashed(g, sh.xs.map((x, j): P => [x, ZERO - sh.dy[M - 1 - j]]), false);
  } else {
    const plan = foldPlan(row);
    const mid = (plan.lo + plan.hi) / 2;
    const sign = plan.odd ? -1 : 1;
    const pts: P[] = Array.from({ length: 41 }, (_, i): P => {
      const x = lerp(plan.lo, mid, i / 40);
      return [X(row, x), ZERO - sign * clamp(finite(row.f(plan.lo + plan.hi - x)) * sh.sc, -98, 98)];
    });
    dashed(g, pts, false);
    line(g, X(row, mid), 58, X(row, mid), 250, PAL.yellow, 1.6, DASH);
  }
  g.globalAlpha = 1;
}

// ---- The mana ring ---------------------------------------------------------------------------------------------------------------------------------------

/** The angle of the gem for dial value k (−π/2 at the range's min, clockwise, the max just short of the top) and the value for a pointer position. */
export const ringAngle = (k: number, min: number, max: number) => -Math.PI / 2 + (2 * Math.PI * (k - min)) / (max - min + 1);
export const ringValue = (px: number, py: number, min: number, max: number) => {
  const phi = (((Math.atan2(py - RING.cy, px - RING.cx) + Math.PI / 2) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return min + (phi / (2 * Math.PI)) * (max - min + 1);
};
export const ringPoint = (k: number, min: number, max: number): P => [RING.cx + RING.R * Math.cos(ringAngle(k, min, max)), RING.cy + RING.R * Math.sin(ringAngle(k, min, max))];

/** The ring around the staff's mirror: 24 rune marks, a progress arc, the gem on the rim, and the mana written inside it. */
export function manaRing(g: G, label: string, k: number, min: number, max: number, t: number, power: number) {
  const { cx, cy, R } = RING;
  glow(g, '#8f7cff', 8 + power * 10, () => {
    g.strokeStyle = '#8f7cff';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.stroke();
  });
  g.strokeStyle = '#3d3590';
  g.lineWidth = 1.4;
  g.beginPath();
  g.arc(cx, cy, R - 10, 0, Math.PI * 2);
  g.stroke();
  const a = ringAngle(k, min, max);
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 4;
  g.beginPath();
  g.arc(cx, cy, R, -Math.PI / 2, a);
  g.stroke();
  for (let i = 0; i < 24; i++) {
    const th = -Math.PI / 2 + (i * Math.PI * 2) / 24;
    const len = i % 2 ? 4 : 7;
    g.globalAlpha = 0.45 + 0.4 * Math.sin(t * 1.6 + i * 0.9);
    line(g, cx + Math.cos(th) * (R - 9), cy + Math.sin(th) * (R - 9), cx + Math.cos(th) * (R - 9 - len), cy + Math.sin(th) * (R - 9 - len), '#b9a8ff', 1.5);
  }
  g.globalAlpha = 1;
  const gx = cx + R * Math.cos(a);
  const gy = cy + R * Math.sin(a);
  glow(g, PAL.yellow, 14, () => dot(g, gx, gy, 7, PAL.yellow));
  dot(g, gx - 2, gy - 2, 2, '#ffffff');
  // the grip: a ring around the gem with a small arrow head on each side, pointing along the rim (the way the gem turns)
  g.strokeStyle = PAL.white;
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(gx, gy, 13, 0, Math.PI * 2);
  g.stroke();
  for (const s of [1, -1]) {
    const ax = gx - Math.sin(a) * s * 19;
    const ay = gy + Math.cos(a) * s * 19;
    const tx = -Math.sin(a) * s;
    const ty = Math.cos(a) * s;
    g.fillStyle = PAL.white;
    g.beginPath();
    g.moveTo(ax + tx * 4, ay + ty * 4);
    g.lineTo(ax - tx * 2 - ty * 3.5, ay - ty * 2 + tx * 3.5);
    g.lineTo(ax - tx * 2 + ty * 3.5, ay - ty * 2 - tx * 3.5);
    g.closePath();
    g.fill();
  }
  g.font = `bold ${label.length > 8 ? 11 : 12}px system-ui, sans-serif`;
  g.textAlign = 'center';
  g.fillStyle = PAL.yellow;
  g.fillText(label, cx, cy + 24, 66);
}

/** The "drag" cue beside the gem, pulsing until the player first touches the ring or the slider. */
export function dragCue(g: G, k: number, min: number, max: number, t: number) {
  const a = ringAngle(k, min, max);
  const x = Math.max(24, Math.min(616, RING.cx + Math.cos(a) * (RING.R + 34)));
  const y = Math.max(14, Math.min(330, RING.cy + Math.sin(a) * (RING.R + 34)));
  g.globalAlpha = 0.55 + 0.45 * Math.sin(t * 4);
  g.font = 'bold 12px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillStyle = PAL.cyan;
  g.fillText('↻ drag', x, y + 4);
  g.globalAlpha = 1;
}

/** The round's goal in one short line on a dark pill: fully shown for 2.6 s from the start of the round, gone at 3 s. `age` is the seconds since the round began. */
export function goalLine(g: G, s: string, cx: number, y: number, age: number) {
  const a = age < 2.6 ? 1 : Math.max(0, 1 - (age - 2.6) / 0.4);
  if (a <= 0) return;
  const w = s.length * 6.8 + 28;
  g.globalAlpha = a;
  g.fillStyle = 'rgba(8,12,40,0.92)';
  g.beginPath();
  g.moveTo(cx - w / 2 + 11, y - 14);
  g.arcTo(cx + w / 2, y - 14, cx + w / 2, y + 8, 11);
  g.arcTo(cx + w / 2, y + 8, cx - w / 2, y + 8, 11);
  g.arcTo(cx - w / 2, y + 8, cx - w / 2, y - 14, 11);
  g.arcTo(cx - w / 2, y - 14, cx + w / 2, y - 14, 11);
  g.closePath();
  g.fill();
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 1.2;
  g.stroke();
  g.font = 'bold 12px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillStyle = PAL.yellow;
  g.fillText(s, cx, y + 1);
  g.globalAlpha = 1;
}

/** A different light in the tower for each round: warm torchlight, a cold moonbeam from the arch, and a pulsing red-violet glow for the boss. Drawn over the tower, under the barrier. */
export function roundTint(g: G, k: number, t: number) {
  if (k === 0) {
    g.fillStyle = 'rgba(255,150,60,0.09)';
    g.fillRect(0, 0, 640, 296);
  } else if (k === 1) {
    g.fillStyle = 'rgba(60,110,255,0.13)';
    g.fillRect(0, 0, 640, 296);
    g.fillStyle = 'rgba(190,210,255,0.07)';
    g.beginPath();
    g.moveTo(300, 0);
    g.lineTo(340, 0);
    g.lineTo(470, 296);
    g.lineTo(190, 296);
    g.closePath();
    g.fill();
  } else {
    g.fillStyle = `rgba(170,40,90,${0.12 + 0.04 * Math.sin(t * 1.5)})`;
    g.fillRect(0, 0, 640, 296);
    g.strokeStyle = 'rgba(255,90,140,0.35)';
    g.lineWidth = 4;
    g.strokeRect(2, 2, 636, 292);
  }
}

// ---- Lyra ------------------------------------------------------------------------------------------------------------------------------------------------

export type LyraMood = 'focus' | 'cheer' | 'worried';
/**
 * Lyra, feet at (x, y): a hooded deep-blue robe with star embroidery and a swaying hem, a silver sash, silver hair under the hood, a tall staff topped with a round
 * silver mirror (at the ring's centre), and a spellbook floating at the left with its pages flipping. Idle: the hem sways, the mirror glints every 2.5 s, the book bobs.
 * `cast` (0..1) lifts the staff and raises the free hand; `twirl` spins the staff (a win); `knock` is a step back in pixels (a fizzle); `soot` is the face after a
 * backfire with frizzed hair, and `smoke` the seconds since it (negative: none).
 */
export function lyra(g: G, x: number, y: number, t: number, o: { mood: LyraMood; cast: number; twirl: number; knock: number; soot: boolean; smoke: number }) {
  const bx = x - 14 - o.knock;
  const staffX = LYRA.x;
  const hand: P = [staffX, y - 46 - 8 * o.cast];
  // the staff (drawn first, behind the hand)
  const top: P = [RING.cx, RING.cy];
  const along = Math.hypot(top[0] - hand[0], top[1] - hand[1]);
  const down = 46 + 8 * o.cast;
  const sa = o.twirl;
  const tip: P = [hand[0] + Math.sin(sa) * along, hand[1] - Math.cos(sa) * along];
  const heel: P = [hand[0] - Math.sin(sa) * down, hand[1] + Math.cos(sa) * down];
  limb(g, [heel, tip], 4, '#8a5a2b');
  limb(g, [heel, tip], 1.4, '#c58d4a');
  g.save();
  g.translate(bx, y);
  const sway = Math.sin(t * 1.8) * 1.5;
  // robe, hem trim and stars
  g.fillStyle = '#23327e';
  g.beginPath();
  g.moveTo(-9, -46);
  g.lineTo(9, -46);
  for (let i = 0; i <= 6; i++) g.lineTo(17 + sway - i * (34 / 6), -3 + Math.sin(t * 3 + i * 1.2) * 1.6);
  g.closePath();
  g.fill();
  for (let i = 0; i <= 6; i++) dot(g, 17 + sway - i * (34 / 6), -3 + Math.sin(t * 3 + i * 1.2) * 1.6, 1.2, '#7d8cff');
  line(g, -8, -29, 8, -29, '#c9d1ff', 2.4);
  ([[-8, -20], [5, -26], [10, -12], [-3, -38], [-12, -9], [2, -8]] as P[]).forEach(([sx, sy], i) => {
    g.globalAlpha = 0.55 + 0.45 * Math.sin(t * 2.4 + i * 1.7);
    poly(g, [[sx, sy - 2.2], [sx + 0.9, sy], [sx, sy + 2.2], [sx - 0.9, sy]], PAL.yellow);
    poly(g, [[sx - 2.2, sy], [sx, sy - 0.9], [sx + 2.2, sy], [sx, sy + 0.9]], PAL.yellow);
  });
  g.globalAlpha = 1;
  // arms: the staff hand, and the free hand (toward the book; raised for a cast or a cheer)
  const hx = hand[0] - bx;
  const hy = hand[1] - y;
  limb(g, [[8, -42], [(8 + hx) / 2 + 2, (-42 + hy) / 2 + 4], [hx, hy]], 3.6, '#2a3c92');
  dot(g, hx, hy, 2.4, '#e8c4a0');
  const up = o.mood === 'cheer' ? 1 : o.cast;
  const fh: P = [lerp(-15, -22, up), lerp(-34, -64, up)];
  limb(g, [[-8, -42], [lerp(-14, -17, up), lerp(-36, -52, up)], fh], 3.6, '#2a3c92');
  dot(g, fh[0], fh[1], 2.4, '#e8c4a0');
  // head: hood, silver hair, face
  const hy0 = -58 + Math.sin(t * 2.2) * 0.5;
  poly(g, [[-11, hy0 + 8], [-10.5, hy0 - 2], [-6, hy0 - 9], [0, hy0 - 12], [6, hy0 - 9], [11, hy0 - 2], [11, hy0 + 8], [-16, hy0 + 14], [-14, hy0 + 2]], '#1c2a70');
  dot(g, 0, hy0, 7.8, '#e8c4a0');
  g.strokeStyle = '#8f9bff';
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(0, hy0, 9, Math.PI * 1.05, Math.PI * 1.95);
  g.stroke();
  if (o.soot) {
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * (0.1 + (i * 0.8) / 6);
      line(g, Math.cos(a) * 8, hy0 + Math.sin(a) * 8, Math.cos(a) * (13 + (i % 2) * 3), hy0 + Math.sin(a) * (13 + (i % 2) * 3), '#e6e9ff', 1.3);
    }
  } else {
    line(g, -7, hy0 - 4, -8.5, hy0 + 3, '#e6e9ff', 1.3);
    line(g, 7, hy0 - 4, 8.5, hy0 + 3, '#e6e9ff', 1.3);
  }
  face(g, 0, hy0, 7.5, o.mood === 'focus' ? 'happy' : o.mood, t);
  if (o.mood === 'focus') {
    line(g, -5.6, hy0 - 4.2, -1.8, hy0 - 3, '#1b1030', 1.3);
    line(g, 5.6, hy0 - 4.2, 1.8, hy0 - 3, '#1b1030', 1.3);
  }
  if (o.soot) {
    g.globalAlpha = 0.6;
    dot(g, -3.5, hy0 + 2, 3.4, '#1a1620');
    dot(g, 3.5, hy0 + 3, 3.1, '#1a1620');
    dot(g, 0, hy0 - 5, 2.6, '#1a1620');
    g.globalAlpha = 1;
    if (o.smoke >= 0) for (let i = 0; i < 3; i++) puff(g, -5 + i * 5 + Math.sin(o.smoke * 6 + i) * 2, hy0 - 12 - o.smoke * 34 - i * 6, 3.5 + o.smoke * 6, 0.7 - o.smoke * 0.7, '#6d7390');
  }
  // the floating spellbook
  const by = -60 + Math.sin(t * 2) * 3;
  g.save();
  g.translate(-36 + o.knock * 0.3, by);
  g.rotate(Math.sin(t * 1.3) * 0.12);
  glow(g, PAL.cyan, 4 + 8 * o.cast, () => poly(g, [[-10, -7], [10, -7], [10, 7], [-10, 7]], '#7a2a5a'));
  poly(g, [[-9, -6], [-0.8, -6], [-0.8, 6], [-9, 6]], '#f1ead8');
  poly(g, [[0.8, -6], [9, -6], [9, 6], [0.8, 6]], '#f1ead8');
  for (let i = 0; i < 3; i++) line(g, -7.5, -3 + i * 3, -2.5, -3 + i * 3, '#8a7a9a', 0.9);
  const flip = Math.cos(t * (3 + 5 * o.cast));
  poly(g, [[0, -6], [8 * flip, -7], [8 * flip, 5], [0, 6]], '#fffaf0');
  g.restore();
  g.restore();
  // the mirror on the staff
  g.fillStyle = '#d9b36a';
  g.fillRect(tip[0] - 3, tip[1] + 8, 6, 5);
  glow(g, PAL.cyan, 6 + 12 * o.cast, () => dot(g, tip[0], tip[1], 10, '#dfe6ff'));
  dot(g, tip[0] + 1.5, tip[1] - 1, 6.2, '#6fd8ff');
  g.strokeStyle = '#9aa8ff';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(tip[0], tip[1], 10, 0, Math.PI * 2);
  g.stroke();
  const gl = (t % 2.5) / 0.3;
  if (gl < 1) {
    const s = 7 * Math.sin(Math.PI * gl);
    poly(g, [[tip[0] + 3, tip[1] - 8 - s], [tip[0] + 4, tip[1] - 5], [tip[0] + 3 + s, tip[1] - 4], [tip[0] + 2, tip[1] - 5]], '#ffffff');
  }
}

/** The mana stream from the mirror into the rune: `u` runs 0..1 along it, `amount` (0..1) is how strong it flows. */
export function manaStream(g: G, t: number, toX: number, amount: number) {
  if (amount <= 0) return;
  g.fillStyle = PAL.cyan;
  for (let i = 0; i < 18; i++) {
    const u = (t * 1.6 + i / 18) % 1;
    const x = lerp(RING.cx + 10, toX, u);
    const y = lerp(RING.cy, ZERO, ease(u)) + Math.sin(u * 9 + i) * 6 * (1 - u) - 18 * Math.sin(Math.PI * u);
    g.globalAlpha = clamp01(amount) * (0.4 + 0.6 * Math.sin(Math.PI * u));
    g.fillRect(x - 1.5, y - 1.5, 3, 3);
  }
  g.globalAlpha = 1;
}

// ---- The Stone Warden ------------------------------------------------------------------------------------------------------------------------------------

export type WardenState = 'idle' | 'slam' | 'crumble' | 'mock';
const ROCK_JIT = [1, 0.82, 1.08, 0.9, 1.05, 0.85, 1, 0.92];
function rock(g: G, cx: number, cy: number, w: number, h: number, seed: number, rot: number, moss = false) {
  g.save();
  g.translate(cx, cy);
  g.rotate(rot);
  g.fillStyle = '#5b6380';
  g.strokeStyle = '#8a94b8';
  g.lineWidth = 1.4;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    const j = ROCK_JIT[(i + seed) % 8];
    g.lineTo(Math.cos(a) * w * 0.56 * j, Math.sin(a) * h * 0.56 * j);
  }
  g.closePath();
  g.fill();
  g.stroke();
  line(g, -w * 0.25, -h * 0.3, w * 0.12, -h * 0.05, '#3c4260', 1.2);
  line(g, w * 0.12, -h * 0.05, w * 0.2, h * 0.25, '#3c4260', 1.2);
  if (moss) {
    g.fillStyle = '#4fb06a';
    g.beginPath();
    g.ellipse(-w * 0.1, -h * 0.42, w * 0.3, 3.2, 0, 0, Math.PI * 2);
    g.fill();
    dot(g, w * 0.2, -h * 0.4, 2, '#6fd08a');
  }
  g.restore();
}
interface Block { x: number; y: number; w: number; h: number; ph: number; rub: P; rot: number; moss?: boolean }
const BLOCKS: Block[] = [
  { x: -13, y: -10, w: 22, h: 16, ph: 0.4, rub: [-14, -7], rot: 0.5 },
  { x: 13, y: -10, w: 22, h: 16, ph: 1.1, rub: [12, -6], rot: -0.4 },
  { x: 0, y: -62, w: 46, h: 44, ph: 0.2, rub: [0, -13], rot: 0.15 },
  { x: -32, y: -80, w: 22, h: 16, ph: 2.1, rub: [-26, -7], rot: -0.6, moss: true },
  { x: 32, y: -80, w: 22, h: 16, ph: 3.0, rub: [27, -6], rot: 0.6, moss: true },
  { x: -38, y: -46, w: 18, h: 18, ph: 1.7, rub: [-40, -6], rot: 0.7 },
  { x: 38, y: -46, w: 18, h: 18, ph: 2.6, rub: [42, -6], rot: -0.5 },
  { x: 0, y: -100, w: 26, h: 20, ph: 0.9, rub: [5, -22], rot: 0.3 },
];
/**
 * The Stone Warden, feet at (x, y): a golem of floating rock blocks with moss on the shoulders and two glowing eyes. Idle: the blocks hover and grind. `slam` raises the
 * left fist and slams it down (u = seconds in); `crumble` drops the blocks into a pile and darkens the eyes; `mock` rumbles with a mocking glow.
 */
export function warden(g: G, x: number, y: number, t: number, o: { state: WardenState; u: number }) {
  g.save();
  g.translate(x, y);
  const u = Math.max(0, o.u);
  const crumble = o.state === 'crumble' ? ease(u / 0.5) : 0;
  const rumble = o.state === 'mock' ? Math.sin(u * 38) * 1.3 : 0;
  BLOCKS.forEach((b, i) => {
    let bx = b.x + Math.sin(t * 2.9 + b.ph * 2) * 0.8 + rumble;
    let by = b.y + Math.sin(t * 1.7 + b.ph) * 2.2;
    let rot = Math.sin(t * 1.1 + b.ph) * 0.03;
    if (o.state === 'slam' && i === 5) {
      const up = ease(u / 0.12);
      const hit = ease((u - 0.12) / 0.08);
      const back = ease((u - 0.6) / 0.3);
      by = lerp(by, -92, up);
      bx = lerp(bx, -46, up);
      by = lerp(by, -10, hit);
      bx = lerp(bx, -54, hit);
      by = lerp(by, b.y, back);
      bx = lerp(bx, b.x, back);
      rot += hit * 0.4 * (1 - back);
    }
    if (o.state === 'slam' && i === 2) bx -= 3 * ease((u - 0.1) / 0.1) * (1 - ease((u - 0.6) / 0.3));
    if (crumble > 0) {
      bx = lerp(bx, b.rub[0], crumble);
      by = lerp(by, b.rub[1], crumble * crumble);
      rot = lerp(rot, b.rot, crumble);
    }
    rock(g, bx, by, b.w, b.h, i, rot, b.moss);
  });
  // the eyes on the head block
  const head = BLOCKS[7];
  const hxx = head.x + Math.sin(t * 2.9 + head.ph * 2) * 0.8 + rumble;
  const hyy = head.y + Math.sin(t * 1.7 + head.ph) * 2.2;
  const lit = 1 - crumble;
  if (lit > 0.02) {
    const blink = t % 4.3 < 0.12 ? 0.25 : 1;
    const big = o.state === 'mock' ? 1.3 + 0.3 * Math.sin(u * 14) : 1;
    g.globalAlpha = lit;
    glow(g, o.state === 'mock' ? PAL.orange : '#ffb347', o.state === 'mock' ? 18 : 10, () => {
      for (const s of [-6, 6]) {
        g.fillStyle = o.state === 'mock' ? '#fff0c0' : '#ffb347';
        g.beginPath();
        g.ellipse(hxx + s, hyy - 1, 2.6 * big, 2.2 * big * blink, 0, 0, Math.PI * 2);
        g.fill();
      }
    });
    g.globalAlpha = 1;
  }
  if (o.state === 'crumble') puff(g, 0, -10 - u * 12, 14 + u * 22, 0.45 - u * 0.5, '#8a94b8');
  if (o.state === 'slam' && u > 0.2 && u < 0.7) {
    puff(g, -56 - (u - 0.2) * 30, -8, 7 + (u - 0.2) * 24, 0.6 - (u - 0.2) * 1.1, '#aab2cc');
    puff(g, -48 + (u - 0.2) * 10, -12, 5 + (u - 0.2) * 20, 0.5 - (u - 0.2) * 1.0, '#aab2cc');
  }
  g.restore();
}
/** The shockwave ring that runs along the floor from the Warden to Lyra; `u` runs 0..1. */
export function shockwave(g: G, u: number) {
  if (u <= 0 || u > 1) return;
  const x = lerp(WARDEN.x - 56, LYRA.x, u);
  g.strokeStyle = PAL.orange;
  g.lineWidth = 2.5;
  g.globalAlpha = 1 - 0.5 * u;
  g.beginPath();
  g.ellipse(x, 292, 10 + 8 * u, 4 + 3 * u, 0, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = 1;
  puff(g, x + 14, 288, 4, 0.5 * (1 - u), '#aab2cc');
}
/** Grey smoke where a fizzled spell ran dry; `u` is the seconds since. */
export function smokePuffs(g: G, x: number, y: number, u: number) {
  for (let i = 0; i < 5; i++) puff(g, x + Math.sin(i * 2.1) * 12 * (0.4 + u), y - u * (20 + i * 6) - i * 4, 6 + u * 9 + i, 0.7 - u * 0.8, '#8c93ad');
}
