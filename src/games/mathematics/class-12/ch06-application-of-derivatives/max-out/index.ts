// Inspirations: Cut the Rope (set the cut, then watch the consequence play out) and Tetris (the piece fits exactly or it does not).
// Fold is a cargo drone with four rotors, a cutting laser and a winch. The pictures are to scale, but the true best setting is a
// flat top of the curve, so it cannot be found by eye; the live reading fades round by round.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { glow, line, text } from '@core/neon';
import { barRatio, buildRounds, explain, intel, judge, missText, show, spotText, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const TRACK = { x0: 60, x1: 580, y: 322 };
const BUILD = 1.0;
const VERDICT = 1.7;
/** How long a paid test build keeps the reading (and the winch line) on screen in round 2 (seconds). */
const PULSE = 1.5;
const STEEL = '#2a3470';
const SIDE = '#1d2556';

const HEROES: { name: string; story: string; objective: string }[] = [
  {
    name: 'Fold',
    story: 'Skyline Freight only ships a crate if it fits. Fold cuts a square of side x from each corner of a flat tin sheet and folds up the sides into an open box. A small cut leaves a shallow tray; a big cut leaves a thin chimney. The volume V is a function of x, and its largest value is where V′ = 0.',
    objective: 'Choose the corner cut that makes the box hold the most, in three rounds. The live volume reading works in round 1; a test build costs a charge.',
  },
  {
    name: 'Fold',
    story: 'Now the orders come with a budget. Fold builds a can of fixed volume with the least metal, and an open tank with the least cost. The volume fixes one dimension in terms of the other, so the cost becomes a function of one variable x. Its smallest value is where the derivative is 0 and the second derivative is positive.',
    objective: 'Choose the radius or length that costs the least, in three rounds. The live reading fades; a test build costs a charge.',
  },
  {
    name: 'Fold',
    story: 'Fold must fit one solid inside another: the biggest cone inside a sphere, the biggest cylinder inside a cone, and the cylinder with the most curved surface. Pythagoras or similar triangles tie the inner solid’s radius to its height h, which turns volume into a function of h.',
    objective: 'Choose the inner solid’s height so the buyer gets the most, in three rounds. Watch which quantity each round asks for.',
  },
  {
    name: 'Fold',
    story: 'A climber is stranded away from a rescue cable that runs along a curve. Fold slides along the cable and lowers a winch line straight to the climber, but the rope is only just long enough for the shortest line. The squared distance D² is easier to differentiate than D, and has its minimum at the same place.',
    objective: 'Slide Fold to the point of the cable nearest the climber, in three rounds. The line and the reading fade away.',
  },
];
const FIRE = [
  { button: '✂️ Cut and fold', aria: 'Cut and fold the sheet' },
  { button: '🔧 Build', aria: 'Build the container' },
  { button: '📦 Fit it', aria: 'Fit the solid inside' },
  { button: '🪝 Lower the winch', aria: 'Lower the winch' },
];
const UNIT = ['cm', '', 'cm', ''];

/** Fold: a cargo drone with an LED visor, four rotors, a winch and hook, and a cutting laser. */
function fold(g: G, x: number, y: number, t: number, mood: Mood, laser: [number, number] | null, hook: number) {
  const bob = Math.sin(t * 3) * 2;
  const yy = y + bob;
  for (const sx of [-1, 1]) {
    line(g, x + sx * 16, yy - 2, x + sx * 38, yy - 11, '#8f9bd6', 3);
    line(g, x + sx * 38, yy - 11, x + sx * 38, yy - 15, '#8f9bd6', 2);
    for (const dx of [0, 9]) {
      const w = 16 + Math.abs(Math.sin(t * 40 + dx)) * 8;
      line(g, x + sx * (38 + dx * 0.6) - w / 2, yy - 17, x + sx * (38 + dx * 0.6) + w / 2, yy - 17, 'rgba(244,246,255,0.7)', 2);
    }
  }
  glow(g, PAL.cyan, 8, () => {
    g.fillStyle = STEEL;
    g.beginPath();
    g.ellipse(x, yy, 26, 14, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = PAL.cyan;
    g.lineWidth = 1.5;
    g.stroke();
  });
  g.fillStyle = '#0a1030';
  g.beginPath();
  g.ellipse(x, yy - 1, 17, 8, 0, 0, Math.PI * 2);
  g.fill();
  const c = mood === 'worried' ? PAL.red : mood === 'cheer' ? PAL.green : PAL.cyan;
  g.strokeStyle = c;
  g.fillStyle = c;
  g.lineWidth = 2;
  if (mood === 'cheer') {
    g.beginPath();
    g.arc(x - 6, yy, 3.5, Math.PI, 2 * Math.PI);
    g.arc(x + 6, yy, 3.5, Math.PI, 2 * Math.PI);
    g.stroke();
  } else {
    const blink = Math.sin(t * 1.3) > 0.97 ? 0.5 : 3;
    g.fillRect(x - 9, yy - 3, 6, blink);
    g.fillRect(x + 3, yy - 3, 6, blink);
    if (mood === 'worried') line(g, x - 4, yy + 4, x + 4, yy + 4, c, 2);
  }
  if (mood === 'worried') {
    g.fillStyle = PAL.cyan;
    g.beginPath();
    g.arc(x + 22, yy + ((t * 20) % 8), 2, 0, Math.PI * 2);
    g.fill();
  }
  line(g, x, yy + 13, x, yy + 18, PAL.dim, 3);
  if (laser) {
    glow(g, PAL.orange, 12, () => line(g, x, yy + 18, laser[0], laser[1], PAL.orange, 2.5));
    g.fillStyle = PAL.yellow;
    for (let i = 0; i < 4; i++) {
      g.fillRect(laser[0] + Math.sin(t * 30 + i * 2) * 8, laser[1] + Math.cos(t * 25 + i) * 6, 2, 2);
    }
  }
  if (hook > 0) {
    const hx = x;
    const hy = yy + 18 + hook;
    line(g, x, yy + 18, hx, hy, PAL.dim, 1.5);
    g.strokeStyle = PAL.yellow;
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(hx, hy + 4, 5, -0.4, Math.PI * 1.1);
    g.stroke();
  }
}

/** A box seen from the front-left: (x, y) is the front bottom-left corner, w by d on the floor, h tall. */
function cuboid(g: G, x: number, y: number, w: number, d: number, h: number, col: string, open: boolean) {
  const ox = d * 0.5;
  const oy = d * 0.35;
  g.fillStyle = col;
  g.fillRect(x, y - h, w, h);
  g.fillStyle = SIDE;
  g.beginPath();
  g.moveTo(x + w, y - h);
  g.lineTo(x + w + ox, y - h - oy);
  g.lineTo(x + w + ox, y - oy);
  g.lineTo(x + w, y);
  g.fill();
  g.fillStyle = open ? '#0a1030' : '#3a4590';
  g.beginPath();
  g.moveTo(x, y - h);
  g.lineTo(x + ox, y - h - oy);
  g.lineTo(x + w + ox, y - h - oy);
  g.lineTo(x + w, y - h);
  g.fill();
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1.2;
  g.strokeRect(x, y - h, w, h);
}

/** The crate: drops into the finished container when it fits, and bounces off when it does not. */
function crate(g: G, x: number, rimY: number, floorY: number, rt: number, ok: boolean) {
  if (rt < BUILD) {
    cuboid(g, x - 14, rimY - 52, 28, 18, 28, '#c9962b', false);
    return;
  }
  const p = Math.min(1, (rt - BUILD) / 0.5);
  const y = rimY - 52 + p * 52;
  const end = ok ? floorY : rimY;
  const yy = Math.min(end, y);
  const bounce = ok || rt < BUILD + 0.5 ? 0 : Math.min(40, (rt - BUILD - 0.5) * 70);
  cuboid(g, x - 14 + bounce, yy, 28, 18, 28, '#c9962b', false);
}

/** The bar for a build, drawn only while a build is being tested: for a minimum, the rope, metal or money runs out at the tick; for a maximum, the order is met only when the bar reaches the tick. */
function budget(g: G, r: Round, ok: boolean, rt: number, label: string) {
  const ratio = barRatio(r, ok);
  const grow = Math.min(1, rt / BUILD);
  const min = r.goal === 'min';
  const frac = min ? Math.min(2, ratio) / 2 : Math.min(1, ratio);
  const tick = min ? 0.5 : 1;
  g.fillStyle = 'rgba(255,255,255,0.1)';
  g.fillRect(420, 270, 160, 10);
  g.fillStyle = ok ? PAL.green : PAL.red;
  g.fillRect(420, 270, frac * grow * 160, 10);
  line(g, 420 + tick * 160, 264, 420 + tick * 160, 286, PAL.yellow, 2);
  text(g, label, 500, 300, PAL.dim, 11);
}

/** The reading of the objective at the setting: a helper, so `showIt` is true only in round 1, for a moment after a paid test build in round 2, and after a win. */
function reading(g: G, r: Round, s: number, showIt: boolean) {
  if (showIt) text(g, show(r, s), 320, 296, PAL.yellow, 15);
  else text(g, 'reading off', 320, 296, PAL.dim, 12);
}

function drawBox(g: G, r: Round, s: number, t: number, rt: number, shot: { ok: boolean } | null, mood: Mood, helper: boolean) {
  const b = r.shape === 'square' ? r.a : r.b;
  const u = Math.min(210 / r.a, 160 / b);
  const sx = 40;
  const sy = 100;
  g.fillStyle = '#b8c2e8';
  g.fillRect(sx, sy, r.a * u, b * u);
  g.fillStyle = '#060a24';
  for (const [cx, cy] of [[0, 0], [r.a - s, 0], [0, b - s], [r.a - s, b - s]]) g.fillRect(sx + cx * u, sy + cy * u, s * u, s * u);
  g.strokeStyle = PAL.orange;
  g.lineWidth = 1.2;
  g.setLineDash?.([4, 3]);
  g.strokeRect(sx + s * u, sy + s * u, (r.a - 2 * s) * u, (b - 2 * s) * u);
  g.setLineDash?.([]);
  text(g, `${r.a} cm × ${b} cm`, sx + (r.a * u) / 2, sy - 8, PAL.dim, 11);
  text(g, `cut x = ${s}`, sx + (r.a * u) / 2, sy + b * u + 16, PAL.white, 12);
  const k = Math.min(210 / (r.a + 0.5 * b), 130 / (Math.min(r.a, b) / 2 + 0.35 * b));
  const bx = 350;
  const by = 270;
  const hf = shot ? Math.min(1, rt / BUILD) : 1;
  cuboid(g, bx, by, (r.a - 2 * s) * k, (b - 2 * s) * k, Math.max(2, s * k * hf), '#6f7fd0', true);
  if (shot) crate(g, bx + ((r.a - 2 * s) * k) / 2 + ((b - 2 * s) * k) * 0.25, by - Math.max(2, s * k), by - 6, rt, shot.ok);
  fold(g, 320, 62, t, mood, shot && rt < BUILD ? [sx + (r.a * u) / 2, sy + (b * u) / 2] : null, 0);
  reading(g, r, s, helper);
}

function drawMin(g: G, r: Round, s: number, t: number, rt: number, shot: { ok: boolean } | null, mood: Mood, helper: boolean) {
  let dims: string;
  if (r.shape === 'can') {
    const V = 2 * r.a ** 3;
    const h = V / (s * s);
    const u = Math.min(150 / Math.max(h, 2 * s), 150 / (2 * s));
    const w = 2 * s * u;
    const hp = h * u;
    const cx = 220;
    const base = 262;
    g.fillStyle = '#6f7fd0';
    g.fillRect(cx - w / 2, base - hp, w, hp);
    g.fillStyle = '#8f9fe8';
    g.beginPath();
    g.ellipse(cx, base - hp, w / 2, w / 8, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#6f7fd0';
    g.beginPath();
    g.ellipse(cx, base, w / 2, w / 8, 0, 0, Math.PI);
    g.fill();
    dims = `r = ${s} cm, h = ${Number((h).toFixed(2))} cm`;
  } else {
    const A = r.a;
    const y = A / s;
    const u = Math.min(150 / (s + 0.5 * y), 110 / (r.b + 0.35 * y), 22);
    cuboid(g, 150, 262, s * u, y * u, r.b * u, '#6f7fd0', true);
    dims = `${s} m × ${Number(y.toFixed(2))} m, ${r.b} m deep`;
  }
  text(g, dims, 220, 284, PAL.white, 12);
  if (shot) budget(g, r, shot.ok, rt, r.shape === 'can' ? 'metal used (tick = budget)' : 'cost (tick = budget)');
  fold(g, 320, 62, t, mood, shot && rt < BUILD ? [220, 190] : null, 0);
  reading(g, r, s, helper);
}

function drawFit(g: G, r: Round, s: number, t: number, rt: number, shot: { ok: boolean } | null, mood: Mood, helper: boolean) {
  const cx = 230;
  if (r.shape === 'cone') {
    const R = r.a;
    const u = 100 / R;
    const cy = 190;
    g.strokeStyle = PAL.dim;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(cx, cy, R * u, 0, Math.PI * 2);
    g.stroke();
    const rad = Math.sqrt(Math.max(0, s * (2 * R - s)));
    g.fillStyle = 'rgba(111,127,208,0.8)';
    g.beginPath();
    g.moveTo(cx, cy - R * u);
    g.lineTo(cx - rad * u, cy - R * u + s * u);
    g.lineTo(cx + rad * u, cy - R * u + s * u);
    g.fill();
    text(g, `sphere radius ${R} cm`, cx, cy + R * u + 18, PAL.dim, 11);
    text(g, `h = ${s} cm`, cx + R * u + 52, cy, PAL.white, 12);
  } else {
    const H = r.a;
    const u = Math.min(150 / H, 150 / (H / 2));
    const base = 262;
    const a = (H / 2) * u;
    g.fillStyle = 'rgba(143,155,214,0.25)';
    g.beginPath();
    g.moveTo(cx, base - H * u);
    g.lineTo(cx - a, base);
    g.lineTo(cx + a, base);
    g.fill();
    g.strokeStyle = PAL.dim;
    g.lineWidth = 2;
    g.stroke();
    const rad = ((H - s) / 2) * u;
    g.fillStyle = 'rgba(111,127,208,0.9)';
    g.fillRect(cx - rad, base - s * u, 2 * rad, s * u);
    text(g, `cone ${H} cm tall, base radius ${H / 2} cm`, cx, base + 18, PAL.dim, 11);
    text(g, `h = ${s} cm`, cx + a + 44, base - (s * u) / 2, PAL.white, 12);
  }
  if (shot) budget(g, r, shot.ok, rt, r.shape === 'cylSurf' ? 'curved surface (tick = target)' : 'volume (tick = target)');
  fold(g, 320, 62, t, mood, shot && rt < BUILD ? [cx, 190] : null, 0);
  reading(g, r, s, helper);
}

function drawCable(g: G, r: Round, s: number, t: number, rt: number, shot: { ok: boolean } | null, mood: Mood, helper: boolean) {
  const px = (x: number) => 220 + x * 30;
  const py = (y: number) => 280 - y * 10;
  g.strokeStyle = PAL.dim;
  g.lineWidth = 3;
  g.beginPath();
  let started = false;
  for (let x = -6; x <= 8; x += 0.1) {
    const y = r.a * x * x;
    if (y > 25) continue;
    if (!started) g.moveTo(px(x), py(y));
    else g.lineTo(px(x), py(y));
    started = true;
  }
  g.stroke();
  line(g, px(-5), py(0), px(8), py(0), PAL.grid, 1);
  const dx = px(s);
  const dy = py(r.a * s * s) - 22;
  const p = r.b;
  // The climber
  g.fillStyle = PAL.pink;
  g.beginPath();
  g.arc(px(p), py(0) - 6, 6, 0, Math.PI * 2);
  g.fill();
  line(g, px(p), py(0), px(p), py(0) - 1, PAL.pink, 1);
  text(g, 'climber', px(p), py(0) + 16, PAL.pink, 11);
  const len = Math.hypot(px(p) - dx, py(0) - 6 - (dy + 18));
  // The dashed winch line is part of the helper: live in round 1, a moment after a paid test build in round 2, and after a win.
  if (helper) line(g, dx, dy + 18, px(p), py(0) - 6, PAL.yellow, 1.5, [4, 4]);
  const hook = shot ? Math.min(1, rt / BUILD) * (shot.ok ? len : len * 0.7) : 0;
  const ang = Math.atan2(py(0) - 6 - (dy + 18), px(p) - dx);
  fold(g, dx, dy, t, mood, null, 0);
  if (shot) {
    const hx = dx + Math.cos(ang) * hook;
    const hy = dy + 18 + Math.sin(ang) * hook;
    line(g, dx, dy + 18, hx, hy, PAL.white, 2);
    g.strokeStyle = PAL.yellow;
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(hx, hy, 5, 0, Math.PI * 1.5);
    g.stroke();
  }
  text(g, `x = ${s}`, dx, py(0) + 34, PAL.white, 12);
  reading(g, r, s, helper);
}

function level(n: number, random: () => number): DialLevel<Round> {
  const X = (r: Round, v: number) => TRACK.x0 + ((v - r.lo) / (r.hi - r.lo)) * (TRACK.x1 - TRACK.x0);
  const hero = HEROES[n - 1];
  const label = ['Corner cut x', 'Length x', 'Inner height h', 'Position x'][n - 1];
  /** The last paid test build: its round and the clock time it first showed (set by the first frame that draws it). */
  let pulse: { r: Round; t0: number | null } | null = null;
  return {
    hero: { name: hero.name, role: 'a cargo drone with a cutting laser and a winch, flying for Skyline Freight', story: hero.story, objective: hero.objective },
    rounds: buildRounds(n, random),
    charges: [1, 1, 0],
    dials: [{ key: 's', aria: `${label}`, label, unit: UNIT[n - 1], step: 1, min: (r) => r.lo, max: (r) => r.hi, start: (r) => r.start, text: (v) => `${v}` }],
    handles: [{ dial: 's', at: (r, v) => [X(r, v.s), TRACK.y], drag: (r, px) => r.lo + ((px - TRACK.x0) / (TRACK.x1 - TRACK.x0)) * (r.hi - r.lo), radius: 20 }],
    test: {
      button: '📏 Test build',
      aria: 'Test build: read the result at this setting',
      read: (r, v) => {
        pulse = { r, t0: null };
        return spotText(r, v.s);
      },
    },
    fire: FIRE[n - 1],
    judge: (r, v) => judge(r, v.s),
    miss: (r, v) => missText(r, v.s),
    win: (r) => `Delivered! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The live reading is on.' : r.assist === 1 ? `No reading${n === 4 ? ' or winch line' : ''} shown: a test build shows ${n === 4 ? 'them' : 'it'} for a moment and costs a charge.` : 'Boss round: no reading, no test build.'}`,
    hit: () => [n === 4 ? 320 : 400, 200],
    delay: VERDICT,
    draw: ({ g, r, v, t, rt, shot, A }) => {
      if (pulse && pulse.r === r && pulse.t0 === null) pulse.t0 = t;
      // The reading (and in level 4 the winch line) shows live in round 1, for 1.5 s after a paid test build in round 2, and after a win; never before Fire in the boss round
      // and never after a miss. The build bar exists only while a build is tested, with a fixed fill on a miss.
      const frozen = !shot && r.assist === 1 && pulse !== null && pulse.r === r && pulse.t0 !== null && t - pulse.t0 < PULSE;
      const helper = r.assist === 0 || frozen || (shot !== null && shot.ok);
      A.canvas.dataset.reading = helper ? '1' : '0';
      A.canvas.dataset.bar = shot && n >= 2 && n <= 3 ? barRatio(r, shot.ok).toFixed(2) : '';
      const mood: Mood = shot ? (rt > VERDICT ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      g.fillStyle = '#060a24';
      g.fillRect(0, 0, 640, 340);
      g.fillStyle = 'rgba(40,50,140,0.3)';
      g.fillRect(0, 180, 640, 160);
      g.strokeStyle = PAL.grid;
      g.lineWidth = 1;
      for (let i = 0; i < 16; i++) line(g, i * 40, 0, i * 40, 340, PAL.grid, 1);
      const s = v.s;
      if (n === 1) drawBox(g, r, s, t, rt, shot, mood, helper);
      else if (n === 2) drawMin(g, r, s, t, rt, shot, mood, helper);
      else if (n === 3) drawFit(g, r, s, t, rt, shot, mood, helper);
      else drawCable(g, r, s, t, rt, shot, mood, helper);
      line(g, TRACK.x0, TRACK.y, TRACK.x1, TRACK.y, PAL.dim, 3);
      text(g, String(r.lo), TRACK.x0, TRACK.y + 16, PAL.dim, 10);
      text(g, String(r.hi), TRACK.x1, TRACK.y + 16, PAL.dim, 10);
      if (shot && rt > VERDICT) glow(g, shot.ok ? PAL.green : PAL.red, 12, () => text(g, shot.ok ? (n === 4 ? 'CLIMBER RESCUED' : 'DELIVERED') : n === 2 || n === 4 ? 'OVER BUDGET' : 'THE ORDER IS REJECTED', 320, 22, shot.ok ? PAL.green : PAL.red, 17));
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(4, ctx.level)), ctx.random) as never, 'A cargo drone cutting, folding and fitting containers, with a dial that sets the one length that makes the load the biggest or the cost the least.');
  },
});
