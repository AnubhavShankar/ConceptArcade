// Inspirations: Professor Layton (a puzzle with exactly one consistent answer) and The Sims (seating people in rooms by who belongs with whom).
// Keeper is a robot butler: a relation on the guests says who shares a room, and only an equivalence relation gives a clean seating plan.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { backdrop, face, track, trackHandle, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { DIALS, MOD_GUESTS, buildRounds, explain, intel, judge, missText, properties, roomsFor, spotText, withPair, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const VERDICT = 1.5;
const ROOM = ['#4de1ff', '#ff4d8d', '#ffd23f', '#5dff9a', '#ff9b3d', '#b08cff'];

const HEROES = [
  { story: 'A mansion’s seating chart says which pairs of guests share a room. For clean rooms the chart must be reflexive (everyone shares a room with themselves), symmetric (if x shares with y then y shares with x) and transitive (if x shares with y and y with z then x shares with z). One entry has been rubbed out.', objective: 'Write back the one missing entry so the chart is an equivalence relation, in three rounds. The property lamps are live in round 1; a check costs a charge.' },
  { story: 'The butler’s rule is that two guests share a room when their numbers differ by a multiple of m. That is an equivalence relation, and its classes are the rooms. The plan shows the rooms; find the m that makes them.', objective: 'Dial the modulus m that seats the twelve guests in the planned rooms, in three rounds. The live colours fade; a check costs a charge.' },
  { story: 'A seating plan is a way of splitting the guests into non-empty rooms: a partition. Some guests must share a room, some must not. The Keeper wants to know how many different plans are possible.', objective: 'Count the possible seating plans, in three rounds. Glue guests who must stay together into one, then count.' },
];

/** Keeper: a robot butler in a bow tie, with a tray of keys. */
function keeper(g: G, x: number, y: number, t: number, mood: Mood) {
  g.fillStyle = '#26305f';
  g.fillRect(x - 18, y - 10, 36, 44);
  g.fillStyle = '#f4f6ff';
  g.fillRect(x - 6, y - 10, 12, 30);
  g.fillStyle = PAL.red;
  g.beginPath();
  g.moveTo(x, y - 6);
  g.lineTo(x - 8, y - 12);
  g.lineTo(x - 8, y);
  g.moveTo(x, y - 6);
  g.lineTo(x + 8, y - 12);
  g.lineTo(x + 8, y);
  g.fill();
  g.fillStyle = '#8f9bd6';
  g.fillRect(x - 15, y - 42, 30, 28);
  face(g, x, y - 28, 12, mood, t, PAL.cyan);
  line(g, x - 12, y - 42, x + 12, y - 42, PAL.dim, 3);
  line(g, x + 18, y + 10, x + 40, y + 4, '#26305f', 5);
  g.fillStyle = PAL.yellow;
  g.fillRect(x + 32, y, 24, 4);
  g.beginPath();
  g.arc(x + 38, y - 3, 3, 0, Math.PI * 2);
  g.arc(x + 48, y - 3, 3, 0, Math.PI * 2);
  g.fill();
  line(g, x - 8, y + 34, x - 8, y + 48, PAL.dim, 4);
  line(g, x + 8, y + 34, x + 8, y + 48, PAL.dim, 4);
}

function guest(g: G, x: number, y: number, label: string, color: string, t: number, mood: Mood = 'happy') {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, 14, 0, Math.PI * 2);
  g.fill();
  face(g, x, y + 1, 9, mood, t, '#1b1030');
  text(g, label, x, y + 28, PAL.white, 11);
}

function drawRepair(g: G, r: Round, v: Record<string, number>, rt: number, shot: { ok: boolean; v: Record<string, number> } | null) {
  const n = r.n;
  const cell = 32;
  const x0 = 200;
  const y0 = 66;
  text(g, 'who shares a room with whom', x0 + (n * cell) / 2, 50, PAL.dim, 11);
  const has = new Set(r.pairs.map(([a, b]) => `${a},${b}`));
  const use = shot ? shot.v : v;
  for (let a = 1; a <= n; a++) {
    text(g, String(a), x0 - 12, y0 + (a - 0.5) * cell + 4, PAL.dim, 11);
    text(g, String(a), x0 + (a - 0.5) * cell, y0 - 4, PAL.dim, 11);
    for (let b = 1; b <= n; b++) {
      const x = x0 + (b - 1) * cell;
      const y = y0 + (a - 1) * cell;
      g.fillStyle = has.has(`${a},${b}`) ? 'rgba(77,225,255,0.65)' : 'rgba(255,255,255,0.05)';
      g.fillRect(x + 2, y + 2, cell - 4, cell - 4);
    }
  }
  const x = x0 + (use.b - 1) * cell;
  const y = y0 + (use.a - 1) * cell;
  const done = shot && rt > 0.6;
  g.fillStyle = done ? (shot!.ok ? 'rgba(93,255,154,0.8)' : 'rgba(255,90,90,0.7)') : 'rgba(255,210,63,0.45)';
  g.fillRect(x + 2, y + 2, cell - 4, cell - 4);
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 2;
  g.strokeRect(x, y, cell, cell);
  const live = r.assist === 0 || shot;
  if (live || r.assist === 1) {
    g.globalAlpha = live ? 1 : 0.3;
    const p = properties(withPair(r, use.a, use.b), n);
    [['reflexive', p.reflexive], ['symmetric', p.symmetric], ['transitive', p.transitive]].forEach(([name, ok], i) => {
      g.fillStyle = ok ? PAL.green : PAL.red;
      g.beginPath();
      g.arc(470, 90 + i * 34, 7, 0, Math.PI * 2);
      g.fill();
      text(g, String(name), 486, 94 + i * 34, PAL.white, 12, 'left');
    });
    g.globalAlpha = 1;
  } else text(g, 'lamps off', 520, 110, PAL.dim, 12);
}

function drawModulus(g: G, r: Round, v: Record<string, number>, t: number, rt: number, shot: { ok: boolean; v: Record<string, number> } | null) {
  const m = shot ? shot.v.m : v.m;
  const live = r.assist === 0 || shot;
  text(g, 'the plan', 330, 54, PAL.yellow, 12);
  r.rooms.forEach((room, i) => {
    const w = 640 / Math.max(4, r.rooms.length);
    const cx = 200 + i * (400 / r.rooms.length) + 30;
    g.strokeStyle = PAL.yellow;
    g.lineWidth = 1.5;
    g.strokeRect(cx - 30, 64, 60, 30);
    text(g, room.join(' '), cx, 84, PAL.white, 10);
    void w;
  });
  const rooms = roomsFor(MOD_GUESTS, m);
  for (let i = 1; i <= MOD_GUESTS; i++) {
    const x = 210 + ((i - 1) % 6) * 62;
    const y = 150 + Math.floor((i - 1) / 6) * 68;
    const ri = rooms.findIndex((room) => room.includes(i));
    const color = live ? ROOM[ri % ROOM.length] : r.assist === 1 ? 'rgba(244,246,255,0.5)' : '#aab3d8';
    guest(g, x, y, String(i), color, t, shot && rt > 0.6 ? (shot.ok ? 'cheer' : 'worried') : 'happy');
  }
  if (live) text(g, `m = ${m}: ${rooms.length} rooms`, 400, 300, PAL.cyan, 12);
}

function drawCount(g: G, r: Round, t: number, rt: number, shot: { ok: boolean } | null) {
  const gap = 360 / Math.max(3, r.n);
  const xs = Array.from({ length: r.n }, (_, i) => 210 + i * gap + 20);
  r.together.forEach(([a, b]) => {
    g.strokeStyle = PAL.green;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(xs[a - 1], 190);
    g.quadraticCurveTo((xs[a - 1] + xs[b - 1]) / 2, 150, xs[b - 1], 190);
    g.stroke();
  });
  r.apart.forEach(([a, b]) => {
    const mx = (xs[a - 1] + xs[b - 1]) / 2;
    g.strokeStyle = PAL.red;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(xs[a - 1], 190);
    g.quadraticCurveTo(mx, 245, xs[b - 1], 190);
    g.stroke();
    text(g, '✕', mx, 224, PAL.red, 16);
  });
  xs.forEach((x, i) => guest(g, x, 180, String(i + 1), ROOM[i % ROOM.length], t, shot && rt > 0.6 ? (shot.ok ? 'cheer' : 'worried') : 'happy'));
  text(g, 'green = must share a room, red ✕ = must not', 400, 80, PAL.dim, 12);
}

function level(n: number, random: () => number): DialLevel<Round> {
  const kind = (['repair', 'modulus', 'count'] as const)[n - 1];
  const hero = HEROES[n - 1];
  const dials = DIALS[kind].map((d) => ({
    key: d.key,
    aria: kind === 'repair' ? (d.key === 'a' ? 'Row guest of the missing entry' : 'Column guest of the missing entry') : kind === 'modulus' ? 'The modulus m' : 'Number of seating plans',
    label: d.label,
    unit: '',
    step: 1,
    min: d.min,
    max: (kind === 'repair' ? (r: Round) => r.n : d.max) as number | ((r: Round) => number),
    start: d.start,
    text: (v: number) => (kind === 'repair' ? `guest ${v}` : `${v}`),
  }));
  return {
    hero: { name: 'Keeper', role: 'a robot butler who seats the guests of a mansion in rooms according to who belongs with whom', story: hero.story, objective: hero.objective },
    rounds: buildRounds(n, random),
    charges: [1, 1, 0],
    dials,
    handles: kind === 'repair' ? [] : [trackHandle<Round>(DIALS[kind][0].key, () => DIALS[kind][0].min, () => DIALS[kind][0].max)],
    test: { button: '🔍 Check', aria: 'Check the chart or the plan', read: (r, v) => spotText(r, v) },
    fire: { button: '🗝️ Seat the guests', aria: 'Seat the guests' },
    judge: (r, v) => judge(r, v),
    miss: (r, v) => missText(r, v),
    win: (r) => `Seated! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The live view is on.' : r.assist === 1 ? 'The live view is dim: a check costs a charge.' : 'Boss round: no live view, no check.'}`,
    hit: () => [400, 150],
    delay: VERDICT,
    draw: ({ g, r, v, t, rt, shot }) => {
      backdrop(g);
      const mood: Mood = shot ? (rt > VERDICT ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      keeper(g, 80, 190, t, mood);
      if (kind === 'repair') drawRepair(g, r, v, rt, shot);
      else if (kind === 'modulus') drawModulus(g, r, v, t, rt, shot);
      else drawCount(g, r, t, rt, shot);
      if (kind !== 'repair') track(g, DIALS[kind][0].min, DIALS[kind][0].max);
      if (shot && rt > VERDICT) verdict(g, shot.ok, 'THE ROOMS ARE READY', 'THE GUESTS ARE ARGUING');
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(3, ctx.level)), ctx.random) as never, 'A robot butler beside a seating chart of guests, with entries, rooms and a count to set.');
  },
});
