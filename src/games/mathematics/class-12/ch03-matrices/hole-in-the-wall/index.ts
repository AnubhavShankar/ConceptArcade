// Inspirations: Hole in the Wall (a cut-out shape rushes at you and you must fit it) and Tetris (rotate and place a piece exactly).
// Blocky is a robot cut-out whose outline is a matrix of vertices; the machine multiplies it, and it must match the hole.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { backdrop, face, num, piText, track, trackHandle, verdict } from '@core/mathkit';
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
];
const FIRE = ['Send Blocky through the wall', 'Send Blocky through the machine', 'Send Blocky through the turntable', 'Send Blocky through both machines'];
const ARIA: Record<string, string> = { x: 'Value of x', y: 'Value of y', a: 'Unknown entry a in the first row of A', b: 'Unknown entry b in the second row of A', k: 'Turn or shear', o: 'Order of the two machines' };

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

function level(n: number, random: () => number): DialLevel<Round> {
  const kind = KINDS[n - 1];
  const hero = HEROES[n - 1];
  const dials = DIALS[kind];
  const rounds = buildRounds(n, random);
  return {
    hero: { name: 'Blocky', role: 'a cut-out robot whose outline is a matrix of corners, racing to fit through a hole in the wall', story: hero.story, objective: hero.objective },
    rounds,
    charges: [1, 1, 0],
    dials: dials.map((d) => ({
      key: d.key,
      aria: ARIA[d.key],
      label: d.label,
      unit: '',
      step: 1,
      min: d.min,
      max: d.max,
      start: d.start,
      text: d.key === 'k' && kind === 'rotate' ? (v: number) => `${piText(v)} (${v * 15}°)` : d.key === 'o' ? (v: number) => (v === 1 ? '1: A then B' : '2: B then A') : (v: number) => `${v}`,
    })),
    handles: kind === 'rotate' ? [trackHandle('k', () => dials[0].min, () => dials[0].max)] : [],
    test: { button: '🧪 Test slide', aria: 'Test slide: read the outline at these settings', read: (r, v) => spotText(r, v) },
    fire: { button: '➡️ Send Blocky', aria: FIRE[n - 1] },
    judge: (r, v) => judge(r, v),
    miss: (r, v) => missText(r, v),
    win: (r) => `Through! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The live outline is on.' : r.assist === 1 ? 'The live outline is dim: a test slide costs a charge.' : 'Boss round: no live outline, no test slide.'}`,
    hit: (r) => [GRID.cx + r.H[0][0] * scaleFor(r), GRID.cy - r.H[1][0] * scaleFor(r)],
    delay: VERDICT,
    draw: ({ g, r, v, t, rt, shot }) => {
      backdrop(g);
      const s = scaleFor(r);
      wall(g, r, s);
      const M = outline(r, v);
      const mood: Mood = shot ? (rt > VERDICT ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      const res = corners(M);
      if (shot) {
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
      } else if (r.assist === 0) blocky(g, res, s, t, mood, 'rgba(111,127,208,0.75)');
      else if (r.assist === 1) {
        g.globalAlpha = 0.3;
        blocky(g, res, s, t, mood, 'rgba(111,127,208,0.75)');
        g.globalAlpha = 1;
      } else if (r.P) blocky(g, corners(r.P), s, t, mood, 'rgba(111,127,208,0.5)');
      // The matrices, read-only
      const X = 480;
      text(g, 'THE HOLE', X + 70, 60, PAL.yellow, 12);
      rows(r.H, r).forEach((row, i) => text(g, row, X + 70, 80 + i * 16, PAL.yellow, 11));
      if (r.kind === 'equal') {
        text(g, 'OUTLINE', X + 70, 126, PAL.dim, 12);
        r.forms!.forEach((row, i) => text(g, row.map(formText).join('   '), X + 70, 146 + i * 16, PAL.white, 10));
      } else if (r.P) {
        text(g, 'POSE P', X + 70, 126, PAL.dim, 12);
        rows(r.P, r).forEach((row, i) => text(g, row, X + 70, 146 + i * 16, PAL.white, 11));
      }
      const showLive = r.assist === 0 || shot !== null;
      text(g, showLive ? 'RESULT NOW' : r.assist === 1 ? 'RESULT (dim)' : 'RESULT OFF', X + 70, 196, PAL.cyan, 12);
      if (showLive || r.assist === 1) {
        g.globalAlpha = showLive ? 1 : 0.3;
        rows(M, r).forEach((row, i) => text(g, row, X + 70, 216 + i * 16, PAL.cyan, 11));
        g.globalAlpha = 1;
      }
      if (kind === 'rotate') track(g, dials[0].min, dials[0].max);
      if (shot && rt > VERDICT) verdict(g, shot.ok, 'BLOCKY FITS', 'JAMMED IN THE WALL');
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(4, ctx.level)), ctx.random) as never, 'A cut-out robot whose corners are the columns of a matrix, a machine that multiplies them, and a hole in a wall it must match.');
  },
});
