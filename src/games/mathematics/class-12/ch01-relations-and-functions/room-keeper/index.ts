// Inspirations: Professor Layton (a puzzle with exactly one consistent answer) and The Sims (seating people in rooms by who belongs with whom).
// Keeper is a robot butler: a relation on the guests says who shares a room, and only an equivalence relation gives a clean seating plan.
import { PAL } from '@core/arcade';
import { helperOn, paidFlash } from '@core/aidflash';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { TRACK, backdrop, face, trackHandle, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { DIALS, MOD_GUESTS, buildRounds, explain, intel, judge, missText, properties, roomsFor, spotText, withPair, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const VERDICT = 1.5;
const ROOM = ['#4de1ff', '#ff4d8d', '#ffd23f', '#5dff9a', '#ff9b3d', '#b08cff'];

const HEROES = [
  { story: 'A mansion’s seating chart says which pairs of guests share a room. For clean rooms the chart must be reflexive (everyone shares a room with themselves), symmetric (if x shares with y then y shares with x) and transitive (if x shares with y and y with z then x shares with z). One entry has been rubbed out.', objective: 'Write back the one missing entry so the chart is an equivalence relation, in three rounds. The property lamps are live in round 1; a check costs a charge.' },
  { story: 'The butler’s rule is that two guests share a room when their numbers differ by a multiple of m. That is an equivalence relation, and its classes are the rooms. The plan shows the rooms; find the m that makes them.', objective: 'Dial the modulus m that seats the twelve guests in the planned rooms, in three rounds. The live colours fade: a check shows them for a moment and costs a charge.' },
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

/** The goal of the round, in one line on the scene. */
const GOALS = ['Write back the missing entry: pick its row guest and column guest', 'Set m so that the rooms match the plan', 'Count the seating plans and set that number'];

/** The count and modulus dials: a track with its end labels, the knob (a grip with arrows) and the player's own setting beside it. */
function knob(g: G, lo: number, hi: number, v: number, label: string) {
  const span = TRACK.x1 - TRACK.x0;
  line(g, TRACK.x0, TRACK.y, TRACK.x1, TRACK.y, PAL.dim, 3);
  text(g, String(lo), TRACK.x0, TRACK.y + 14, PAL.dim, 11);
  text(g, String(hi), TRACK.x1, TRACK.y + 14, PAL.dim, 11);
  const x = TRACK.x0 + ((v - lo) / (hi - lo)) * span;
  g.fillStyle = '#2a2350';
  g.beginPath();
  g.arc(x, TRACK.y, 17, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 2;
  g.stroke();
  text(g, '⇔', x, TRACK.y + 5, PAL.yellow, 14);
  const left = x > 400;
  text(g, label, x + (left ? -28 : 28), TRACK.y + 4, PAL.yellow, 12, left ? 'right' : 'left');
}

function drawRepair(g: G, r: Round, v: Record<string, number>, rt: number, shot: { ok: boolean; v: Record<string, number> } | null, helper: boolean) {
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
  text(g, `your entry: row ${use.a}, column ${use.b}`, x0 + (n * cell) / 2, y0 + n * cell + 20, PAL.yellow, 12);
  // The property lamps are the paid check: live in round 1, for a moment after a check in round 2, on a win, and never in round 3. Each lamp is a word as well as a colour.
  if (helper) {
    const p = properties(withPair(r, use.a, use.b), n);
    [['reflexive', p.reflexive], ['symmetric', p.symmetric], ['transitive', p.transitive]].forEach(([name, ok], i) => {
      g.fillStyle = ok ? PAL.green : PAL.red;
      g.beginPath();
      g.arc(470, 90 + i * 34, 7, 0, Math.PI * 2);
      g.fill();
      text(g, `${ok ? '✓' : '✗'} ${name}`, 486, 94 + i * 34, PAL.white, 12, 'left');
    });
  } else text(g, 'lamps off', 520, 110, PAL.dim, 12);
}

function drawModulus(g: G, r: Round, v: Record<string, number>, t: number, rt: number, shot: { ok: boolean; v: Record<string, number> } | null, helper: boolean) {
  const m = shot ? shot.v.m : v.m;
  text(g, 'the plan', 330, 54, PAL.yellow, 12);
  r.rooms.forEach((room, i) => {
    const cx = 200 + i * (400 / r.rooms.length) + 30;
    g.strokeStyle = PAL.yellow;
    g.lineWidth = 1.5;
    g.strokeRect(cx - 30, 64, 60, 30);
    text(g, room.join(' '), cx, 84, PAL.white, 11);
  });
  const rooms = roomsFor(MOD_GUESTS, m);
  // The colouring by the player's own m is the paid check: live in round 1, for a moment after a check in round 2, on a win, and never in round 3.
  for (let i = 1; i <= MOD_GUESTS; i++) {
    const x = 210 + ((i - 1) % 6) * 62;
    const y = 150 + Math.floor((i - 1) / 6) * 68;
    const ri = rooms.findIndex((room) => room.includes(i));
    const color = helper ? ROOM[ri % ROOM.length] : '#aab3d8';
    guest(g, x, y, String(i), color, t, shot && rt > 0.6 ? (shot.ok ? 'cheer' : 'worried') : 'happy');
  }
  if (helper) text(g, `m = ${m}: ${rooms.length} rooms`, 400, 296, PAL.cyan, 12);
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
    max: (kind === 'repair' ? (r: Round) => r.n : kind === 'count' ? (r: Round) => r.max : d.max) as number | ((r: Round) => number),
    start: d.start,
    text: (v: number) => (kind === 'repair' ? `guest ${v}` : `${v}`),
  }));
  const flash = paidFlash();
  return {
    hero: { name: 'Keeper', role: 'a robot butler who seats the guests of a mansion in rooms according to who belongs with whom', story: hero.story, objective: hero.objective },
    rounds: buildRounds(n, random),
    charges: [1, 1, 0],
    dials,
    handles: kind === 'repair' ? [] : [trackHandle<Round>(DIALS[kind][0].key, () => DIALS[kind][0].min, kind === 'count' ? (r: Round) => r.max : () => DIALS[kind][0].max)],
    test: {
      button: '🔍 Check',
      aria: 'Check the chart or the plan',
      read: (r, v) => {
        flash.paid();
        return spotText(r, v);
      },
    },
    fire: { button: '🗝️ Seat the guests', aria: 'Seat the guests' },
    judge: (r, v) => judge(r, v),
    miss: (r, v) => missText(r, v),
    win: (r) => `Seated! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The live view is on.' : r.assist === 1 ? 'No live view: a check shows it for a moment and costs a charge.' : 'Boss round: no live view, no check.'}`,
    hit: () => [400, 150],
    delay: VERDICT,
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      backdrop(g);
      // The live view (property lamps, room colours) is round 1 only, a moment after a paid check in round 2, and a win; never in round 3, and never after a miss.
      const helper = helperOn(r.assist, shot !== null && shot.ok, flash.since(t, k));
      A.canvas.dataset.live = helper ? '1' : '0';
      const mood: Mood = shot ? (rt > VERDICT ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      keeper(g, 80, 190, t, mood);
      if (kind === 'repair') drawRepair(g, r, v, rt, shot, helper);
      else if (kind === 'modulus') drawModulus(g, r, v, t, rt, shot, helper);
      else drawCount(g, r, t, rt, shot);
      if (kind === 'modulus') knob(g, DIALS.modulus[0].min, DIALS.modulus[0].max, v.m, `m = ${v.m}`);
      if (kind === 'count') knob(g, DIALS.count[0].min, r.max, v.c, `${v.c} ways`);
      if (!(shot && rt > VERDICT)) text(g, GOALS[n - 1], 400, 24, PAL.yellow, 12);
      if (shot && rt > VERDICT) verdict(g, shot.ok, 'THE ROOMS ARE READY', 'THE GUESTS ARE ARGUING');
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(3, ctx.level)), ctx.random) as never, 'A robot butler beside a seating chart of guests, with entries, rooms and a count to set.');
  },
});
