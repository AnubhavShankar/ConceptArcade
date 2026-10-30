// Inspirations: Hole in the Wall (a cut-out shape rushes at you and you must fit it) and Tetris (rotate and place a piece exactly).
// Blocky is a robot cut-out whose outline is a matrix of vertices; the machine multiplies it, and it must match the hole.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { helperOn, paidFlash } from '@core/aidflash';
import { TRACK, backdrop, face, num, piText, trackHandle, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { DIALS, KINDS, buildRounds, formText, intel, judge, matText, firstMismatch, explain, missText, outline, spotText, type Mat, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const VERDICT = 1.5;
const GRID = { cx: 245, cy: 180, w: 440, h: 250 };

const HEROES = [
  { story: 'Blocky’s outline is a matrix: each column is a corner, with its x on top and its y below. Two matrices are equal only when every matching entry is equal. The wall’s hole is a matrix of numbers, and Blocky’s outline has letters in it.', objective: 'Set x and y so that Blocky’s outline matrix equals the hole matrix, in three rounds. The live outline shows in round 1; a test slide costs a charge.' },
  { story: 'Now a machine A multiplies Blocky’s pose P before he reaches the wall. An entry of A·P is a row of A times a column of P. Two entries of A are unknown, one in each row.', objective: 'Set the two unknown entries of A so that A·P equals the hole, in three rounds. The live result fades; a test slide costs a charge.' },
  { story: 'The turntable multiplies Blocky by the rotation matrix with cos α and sin α. The hole shows where his corners must land, as exact numbers. The dial turns in steps of π/12 and covers a full circle.', objective: 'Turn Blocky by the angle that lands his corners exactly in the hole, in three rounds.' },
  { story: 'Two machines stand in a row: a shear A that slides the top sideways by k, and a gate B. Blocky can go A then B, or B then A, and the two orders do not give the same result, because matrix products depend on the order.', objective: 'Set the shear k and the order so that Blocky fits the hole, in three rounds.' },
  { story: 'The hole in this wall was carved by sending Blocky through machine A twice, so it is A²P. The express machine kA − mI does the job in one pass, if k and m are right. Compute A², then match it entry by entry.', objective: 'Set k and m so one pass through the express machine fits the hole, in three rounds.' },
];
const FIRE = ['Send Blocky through the wall', 'Send Blocky through the machine', 'Send Blocky through the turntable', 'Send Blocky through both machines', 'Send Blocky through the express machine'];
const ARIA: Record<string, string> = { x: 'Value of x', y: 'Value of y', a: 'Unknown entry a in the first row of A', b: 'Unknown entry b in the second row of A', k: 'Turn or shear', o: 'Order of the two machines', m: 'Value of m in kA − mI' };

/** The corners of a matrix, closed with the origin when it has only two columns. */
function corners(M: Mat): [number, number][] {
  const out = M[0].map((_, c): [number, number] => [M[0][c], M[1][c]]);
  if (out.length === 2) out.push([0, 0]);
  return out;
}

function scaleFor(r: Round): number {
  const xs = [...r.H.flat(), ...(r.P ? r.P.flat() : [])].map(Math.abs);
  const ext = Math.max(1, ...xs);
  return Math.min(GRID.h / 2 - 14, GRID.w / 2 - 14) / ext;
}

function poly(g: G, pts: [number, number][], s: number, ox = 0, oy = 0): [number, number][] {
  const P = pts.map(([x, y]): [number, number] => [GRID.cx + x * s + ox, GRID.cy - y * s + oy]);
  g.beginPath();
  P.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
  g.closePath();
  return P;
}

function wall(g: G, r: Round, s: number) {
  g.fillStyle = '#2a2350';
  g.fillRect(GRID.cx - GRID.w / 2, GRID.cy - GRID.h / 2, GRID.w, GRID.h);
  g.strokeStyle = 'rgba(255,255,255,0.08)';
  g.lineWidth = 1;
  for (let j = 0; j < GRID.h; j += 20) line(g, GRID.cx - GRID.w / 2, GRID.cy - GRID.h / 2 + j, GRID.cx + GRID.w / 2, GRID.cy - GRID.h / 2 + j, 'rgba(255,255,255,0.08)', 1);
  line(g, GRID.cx - GRID.w / 2, GRID.cy, GRID.cx + GRID.w / 2, GRID.cy, 'rgba(255,255,255,0.18)', 1);
  line(g, GRID.cx, GRID.cy - GRID.h / 2, GRID.cx, GRID.cy + GRID.h / 2, 'rgba(255,255,255,0.18)', 1);
  poly(g, corners(r.H), s);
  g.fillStyle = '#060a24';
  g.fill();
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 2.5;
  g.setLineDash?.([6, 4]);
  g.stroke();
  g.setLineDash?.([]);
}

function blocky(g: G, pts: [number, number][], s: number, t: number, mood: Mood, color: string, ox = 0, oy = 0) {
  const P = poly(g, pts, s, ox, oy);
  g.fillStyle = color;
  g.fill();
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 2;
  g.stroke();
  g.fillStyle = PAL.orange;
  for (const [x, y] of P) {
    g.beginPath();
    g.arc(x, y, 3.5, 0, Math.PI * 2);
    g.fill();
  }
  const cx = P.reduce((a, p) => a + p[0], 0) / P.length;
  const cy = P.reduce((a, p) => a + p[1], 0) / P.length;
  const R = 11;
  g.fillStyle = '#0a1030';
  g.beginPath();
  g.arc(cx, cy, R + 2, 0, Math.PI * 2);
  g.fill();
  face(g, cx, cy, R, mood, t, PAL.cyan);
  line(g, cx, cy - R - 2, cx, cy - R - 9, PAL.dim, 2);
  g.fillStyle = PAL.red;
  g.beginPath();
  g.arc(cx, cy - R - 10, 2.5, 0, Math.PI * 2);
  g.fill();
}

function rows(M: Mat, r: Round): string[] {
  return M.map((row) => row.map((v) => (r.kind === 'rotate' ? matText([[v]], r).replace(/[[\] ]/g, '') : num(v))).join('   '));
}

/** Level 5 story strip above the wall: Blocky's pose P goes through machine A twice, and that carved the hole. */
function twice(g: G) {
  const arrow = (x1: number, x2: number) => {
    line(g, x1, 27, x2, 27, PAL.dim, 2);
    line(g, x2 - 5, 22, x2, 27, PAL.dim, 2);
    line(g, x2 - 5, 32, x2, 27, PAL.dim, 2);
  };
  const box = (x: number) => {
    g.fillStyle = '#1b2a66';
    g.fillRect(x, 14, 30, 26);
    g.strokeStyle = PAL.cyan;
    g.lineWidth = 2;
    g.strokeRect(x, 14, 30, 26);
    text(g, 'A', x + 15, 32, PAL.white, 13);
  };
  text(g, 'P', 36, 32, PAL.white, 13);
  arrow(48, 70);
  box(72);
  arrow(104, 122);
  box(124);
  arrow(156, 174);
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 2;
  g.setLineDash?.([4, 3]);
  g.strokeRect(176, 14, 30, 26);
  g.setLineDash?.([]);
  text(g, 'A twice carved this hole', 300, 32, PAL.dim, 11);
}

/** The right-hand panel of level 5: the hole, the machine A, the pose, the live result and the express machine with its current k and m. */
function identityPanel(g: G, r: Round, M: Mat, v: Record<string, number>, showLive: boolean) {
  const X = 550;
  const block = (title: string, N: Mat, y: number, color: string, alpha = 1) => {
    text(g, title, X, y, color === PAL.white ? PAL.dim : color, 12);
    g.globalAlpha = alpha;
    rows(N, r).forEach((row, i) => text(g, row, X, y + 16 + i * 16, color, 11));
    g.globalAlpha = 1;
  };
  block('THE HOLE', r.H, 52, PAL.yellow);
  block('MACHINE A', r.M!, 108, PAL.white);
  block('POSE P', r.P!, 164, PAL.white);
  text(g, showLive ? 'RESULT NOW' : r.assist === 1 ? 'RESULT (dim)' : 'RESULT OFF', X, 220, PAL.cyan, 12);
  if (showLive || r.assist === 1) {
    g.globalAlpha = showLive ? 1 : 0.3;
    rows(M, r).forEach((row, i) => text(g, row, X, 236 + i * 16, PAL.cyan, 11));
    g.globalAlpha = 1;
  }
  text(g, 'EXPRESS kA − mI', X, 282, PAL.orange, 12);
  text(g, `k = ${num(v.k)}, m = ${num(v.m)}`, X, 298, PAL.orange, 11);
}

/** The turntable's track with its end labels, the knob (a grip with arrows) and the player's own angle beside it. */
function turnTrack(g: G, lo: number, hi: number, k: number) {
  const span = TRACK.x1 - TRACK.x0;
  line(g, TRACK.x0, TRACK.y, TRACK.x1, TRACK.y, PAL.dim, 3);
  text(g, piText(lo), TRACK.x0, TRACK.y + 16, PAL.dim, 11);
  text(g, piText(hi), TRACK.x1, TRACK.y + 16, PAL.dim, 11);
  const x = TRACK.x0 + ((k - lo) / (hi - lo)) * span;
  g.fillStyle = '#2a2350';
  g.beginPath();
  g.arc(x, TRACK.y, 15, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 2;
  g.stroke();
  text(g, '⇔', x, TRACK.y + 5, PAL.yellow, 14);
  const left = x > 440;
  text(g, `α = ${piText(k)} (${k * 15}°)`, x + (left ? -34 : 34), TRACK.y + 4, PAL.yellow, 12, left ? 'right' : 'left');
}

const GOALS = [
  'Set x and y so the outline equals the hole',
  'Set a and b so A·P equals the hole',
  'Turn Blocky so his corners land in the hole',
  'Set the shear k and the order so Blocky fits the hole',
  '',
];

function level(n: number, random: () => number): DialLevel<Round> {
  const kind = KINDS[n - 1];
  const hero = HEROES[n - 1];
  const dials = DIALS[kind];
  const rounds = buildRounds(n, random);
  const flash = paidFlash();
  return {
    hero: { name: 'Blocky', role: 'a cut-out robot whose outline is a matrix of corners, racing to fit through a hole in the wall', story: hero.story, objective: hero.objective },
    rounds,
    charges: [1, 1, 0],
    dials: dials.map((d) => ({
      key: d.key,
      aria: kind === 'identity' && d.key === 'k' ? 'Value of k in kA − mI' : ARIA[d.key],
      label: d.label,
      unit: '',
      step: 1,
      min: d.min,
      max: d.max,
      start: d.start,
      text: d.key === 'k' && kind === 'rotate' ? (v: number) => `${piText(v)} (${v * 15}°)` : d.key === 'o' ? (v: number) => (v === 1 ? '1: A then B' : '2: B then A') : (v: number) => `${v}`,
    })),
    handles: kind === 'rotate' ? [trackHandle('k', () => dials[0].min, () => dials[0].max)] : [],
    test: {
      button: '🧪 Test slide',
      aria: 'Test slide: read the outline at these settings',
      read: (r, v) => {
        flash.paid();
        return spotText(r, v);
      },
    },
    fire: { button: '➡️ Send Blocky', aria: FIRE[n - 1] },
    judge: (r, v) => judge(r, v),
    miss: (r, v) => missText(r, v),
    win: (r) => `Through! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The live outline is on.' : r.assist === 1 ? (r.kind === 'identity' ? 'The live outline is dim: a test slide costs a charge.' : 'No live outline: a test slide shows it for a moment and costs a charge.') : 'Boss round: no live outline, no test slide.'}`,
    hit: (r) => (r.kind === 'identity' ? [GRID.cx, GRID.cy] : [GRID.cx + r.H[0][0] * scaleFor(r), GRID.cy - r.H[1][0] * scaleFor(r)]),
    delay: VERDICT,
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      backdrop(g);
      const s = scaleFor(r);
      wall(g, r, s);
      const M = outline(r, v);
      const mood: Mood = shot ? (rt > VERDICT ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      const res = corners(M);
      // Levels 1 to 4: the live outline (Blocky at his result and the RESULT matrix) is the paid test slide. It is live in round 1, shows for a moment after a
      // test slide in round 2, and never in round 3. A miss in round 2 or 3 plays a fixed jam: Blocky never lands where his setting put him. Level 5 keeps its reviewed drawing.
      const legacy = r.kind === 'identity';
      const helper = helperOn(r.assist, shot !== null && shot.ok, flash.since(t, k));
      A.canvas.dataset.live = !legacy && helper ? '1' : '0';
      const generic = !legacy && shot !== null && !shot.ok && r.assist > 0;
      if (shot && generic) {
        // A fixed stand-in (the hole's outline at 0.6) slides to the wall and jams, the same for every wrong setting.
        const p = Math.min(1, rt / 1.0);
        const pts = corners(r.H).map(([x, y]): [number, number] => [x * 0.6, y * 0.6]);
        const bump = rt > 1.0 ? Math.sin(rt * 40) * 3 : 0;
        blocky(g, pts, s, t, mood, 'rgba(111,127,208,0.75)', -140 * (1 - p) + bump, 0);
        if (rt > 1.0) text(g, '✗', GRID.cx, GRID.cy - 100, PAL.red, 26);
      } else if (shot) {
        const p = Math.min(1, rt / 1.0);
        const from = r.P ? corners(r.P) : res;
        const pts = res.map(([x, y], i): [number, number] => [from[i][0] + (x - from[i][0]) * p, from[i][1] + (y - from[i][1]) * p]);
        const slide = r.P ? 0 : -140 * (1 - p);
        const bump = !shot.ok && rt > 1.0 ? Math.sin(rt * 40) * 3 : 0;
        blocky(g, pts, s, t, mood, shot.ok && rt > 1.0 ? 'rgba(93,255,154,0.75)' : 'rgba(111,127,208,0.75)', slide + bump, 0);
        if (!shot.ok && rt > 1.0) {
          const m = firstMismatch(r, shot.v);
          if (m) {
            g.strokeStyle = PAL.red;
            g.lineWidth = 3;
            g.beginPath();
            g.arc(GRID.cx + m.at[0] * s, GRID.cy - m.at[1] * s, 9, 0, Math.PI * 2);
            g.stroke();
          }
        }
      } else if (legacy ? r.assist === 0 : helper) blocky(g, res, s, t, mood, 'rgba(111,127,208,0.75)');
      else if (legacy && r.assist === 1) {
        g.globalAlpha = 0.3;
        blocky(g, res, s, t, mood, 'rgba(111,127,208,0.75)');
        g.globalAlpha = 1;
      } else if (r.P) blocky(g, corners(r.P), s, t, mood, 'rgba(111,127,208,0.5)');
      if (!legacy && !(shot && rt > VERDICT)) text(g, GOALS[n - 1], GRID.cx, 30, PAL.yellow, 12);
      // The matrices, read-only
      const X = 480;
      const showLive = legacy ? r.assist === 0 || shot !== null : helper;
      if (r.kind === 'identity') {
        twice(g);
        identityPanel(g, r, M, v, showLive);
      } else {
        text(g, 'THE HOLE', X + 70, 60, PAL.yellow, 12);
        rows(r.H, r).forEach((row, i) => text(g, row, X + 70, 80 + i * 16, PAL.yellow, 11));
        if (r.kind === 'equal') {
          text(g, 'OUTLINE', X + 70, 126, PAL.dim, 12);
          r.forms!.forEach((row, i) => text(g, row.map(formText).join('  '), X + 70, 146 + i * 16, PAL.white, 11));
        } else if (r.P) {
          text(g, 'POSE P', X + 70, 126, PAL.dim, 12);
          rows(r.P, r).forEach((row, i) => text(g, row, X + 70, 146 + i * 16, PAL.white, 11));
        }
        text(g, showLive ? 'RESULT NOW' : 'RESULT OFF', X + 70, 196, PAL.cyan, 12);
        if (showLive) rows(M, r).forEach((row, i) => text(g, row, X + 70, 216 + i * 16, PAL.cyan, 11));
      }
      if (kind === 'rotate') turnTrack(g, dials[0].min, dials[0].max, v.k);
      if (shot && rt > VERDICT) verdict(g, shot.ok, 'BLOCKY FITS', 'JAMMED IN THE WALL');
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(5, ctx.level)), ctx.random) as never, 'A cut-out robot whose corners are the columns of a matrix, a machine that multiplies them, and a hole in a wall it must match.');
  },
});
