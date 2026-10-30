// Inspirations: Tiny Wings and Alto's Adventure (a character gliding over rolling hills where the slope decides everything) and capture-the-flag
// (plant the flag in exactly the right spot). Pika is a small bird; the flag goes where the derivative tells her the ground turns.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { backdrop, face, num, track, trackHandle, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { buildRounds, explain, intel, judge, missText, spotText, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const VERDICT = 1.8;
const P = { x0: 60, x1: 580, top: 70, bottom: 270 };

const HEROES = [
  { story: 'Pika flies over rolling ground y = f(x). At the top of a hill or the bottom of a valley the slope is zero, and the second derivative tells which: negative at a hilltop (the ground bends down), positive at a valley floor (it bends up). The ground here is a cubic with two such points.', objective: 'Plant the flag at the hilltop or valley floor Pika is told to find, in three rounds. The tangent line shows in round 1; a survey costs a charge.' },
  { story: 'Here the ground is not given: only its slope is, as a product f′(x) = (x − a)²(x − b). The slope is zero at a and at b, but a squared factor never changes sign. At such a point the ground just flattens for a moment and goes on climbing or falling: no hilltop and no valley.', objective: 'Plant the flag at the one real turning point, in three rounds. The hill shows in round 1; a survey costs a charge.' },
  { story: 'Pika may only walk along a marked stretch of the ground. The highest or lowest ground may be at a turning point inside the stretch, or at one of its ends. To be sure, compare f at the ends and at every critical point in between.', objective: 'Plant the camp at the highest or lowest ground on the stretch, in three rounds. Do not forget the end points.' },
];

/** Pika: a small round bird with wings, a beak and a flag pole in her talons. */
function pika(g: G, x: number, y: number, t: number, mood: Mood, flap: number) {
  const bob = Math.sin(t * 5) * 2;
  const yy = y - 18 + bob;
  g.fillStyle = PAL.yellow;
  g.beginPath();
  g.ellipse(x, yy, 16, 13, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = PAL.orange;
  g.beginPath();
  g.moveTo(x + 14, yy - 2);
  g.lineTo(x + 24, yy + 2);
  g.lineTo(x + 14, yy + 5);
  g.fill();
  const wy = Math.sin(flap * 14) * 8;
  g.fillStyle = '#e0a800';
  g.beginPath();
  g.ellipse(x - 4, yy - 2 + wy * 0.3, 11, 6 + Math.abs(wy) * 0.4, -0.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = PAL.pink;
  g.beginPath();
  g.arc(x - 16, yy - 2, 4, 0, Math.PI * 2);
  g.fill();
  face(g, x + 3, yy - 2, 8, mood, t, '#1b1030');
  line(g, x - 3, yy + 12, x - 3, yy + 18, PAL.orange, 2);
  line(g, x + 3, yy + 12, x + 3, yy + 18, PAL.orange, 2);
}

function level(n: number, random: () => number): DialLevel<Round> {
  const hero = HEROES[n - 1];
  const rounds = buildRounds(n, random);
  const geo = rounds.map((r) => {
    const xs = Array.from({ length: 101 }, (_, i) => r.lo + ((r.hi - r.lo) * i) / 100);
    const ys = xs.map(r.f);
    const lo = Math.min(...ys);
    const hi = Math.max(...ys);
    const pad = (hi - lo) * 0.12 || 1;
    return { y0: lo - pad, y1: hi + pad };
  });
  return {
    hero: { name: 'Pika', role: 'a small bird who flies over hilly ground and plants a flag where the slope says the ground turns', story: hero.story, objective: hero.objective },
    rounds,
    charges: [1, 1, 0],
    dials: [{ key: 'x', aria: 'Flag position x', label: 'Flag at x', unit: '', step: 1, min: (r: Round) => r.lo, max: (r: Round) => r.hi, start: (r: Round) => r.start, text: (v: number) => `x = ${v < 0 ? '−' : ''}${Math.abs(v)}` }],
    handles: [trackHandle<Round>('x', (r) => r.lo, (r) => r.hi)],
    test: { button: '📍 Survey', aria: 'Survey: read the height and slope at the flag', read: (r, v) => spotText(r, v.x) },
    fire: { button: '🚩 Plant the flag', aria: 'Plant the flag' },
    judge: (r, v) => judge(r, v.x),
    miss: (r, v) => missText(r, v.x),
    win: (r) => `Flag planted! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The tangent line is live.' : r.assist === 1 ? 'The tangent is dim: a survey costs a charge.' : 'Boss round: no tangent, no survey.'}`,
    hit: (r) => {
      const gi = rounds.indexOf(r);
      const { y0, y1 } = geo[gi] ?? geo[0];
      return [P.x0 + ((r.ans - r.lo) / (r.hi - r.lo)) * (P.x1 - P.x0), P.bottom - ((r.f(r.ans) - y0) / (y1 - y0)) * (P.bottom - P.top)];
    },
    delay: VERDICT,
    draw: ({ g, r, v, t, rt, shot }) => {
      backdrop(g);
      const gi = rounds.indexOf(r);
      const { y0, y1 } = geo[gi] ?? geo[0];
      const X = (x: number) => P.x0 + ((x - r.lo) / (r.hi - r.lo)) * (P.x1 - P.x0);
      const Y = (y: number) => P.bottom - ((y - y0) / (y1 - y0)) * (P.bottom - P.top);
      const use = shot ? shot.v.x : v.x;
      const showCurve = r.assist <= 1 || shot !== null;
      if (showCurve) {
        g.globalAlpha = r.assist === 1 && !shot ? 0.35 : 1;
        g.strokeStyle = PAL.cyan;
        g.lineWidth = 4;
        g.beginPath();
        for (let i = 0; i <= 120; i++) {
          const x = r.lo + ((r.hi - r.lo) * i) / 120;
          if (i === 0) g.moveTo(X(x), Y(r.f(x)));
          else g.lineTo(X(x), Y(r.f(x)));
        }
        g.stroke();
        g.globalAlpha = 1;
      } else {
        line(g, P.x0, P.bottom, P.x1, P.bottom, PAL.dim, 3);
        text(g, 'the ground is hidden: use f′ and f″', 320, 120, PAL.dim, 12);
      }
      const fy = showCurve ? Y(r.f(use)) : P.bottom;
      // The flag
      const ok = shot && rt > 1.2 ? shot.ok : null;
      line(g, X(use), fy, X(use), fy - 42, PAL.white, 3);
      g.fillStyle = ok === null ? PAL.pink : ok ? PAL.green : PAL.red;
      g.beginPath();
      g.moveTo(X(use), fy - 42);
      g.lineTo(X(use) + 24, fy - 34);
      g.lineTo(X(use), fy - 26);
      g.fill();
      // The tangent line
      if (showCurve && (r.assist === 0 || (r.assist === 1 && !shot))) {
        const sl = (r.fp(use) * (y1 - y0 ? (P.bottom - P.top) / (y1 - y0) : 1)) / ((P.x1 - P.x0) / (r.hi - r.lo));
        const d = 60;
        g.globalAlpha = r.assist === 1 ? 0.3 : 0.9;
        line(g, X(use) - d, fy + sl * d, X(use) + d, fy - sl * d, PAL.yellow, 2);
        g.globalAlpha = 1;
        if (r.assist === 0) text(g, `slope ${num(r.fp(use))}`, X(use), fy + 22, PAL.yellow, 12);
      }
      // Pika
      let px = P.x0 + 10;
      if (shot) px = X(r.lo) + (X(use) - X(r.lo)) * Math.min(1, rt / 1.2);
      const worldX = r.lo + ((px - P.x0) / (P.x1 - P.x0)) * (r.hi - r.lo);
      const py = showCurve ? Y(r.f(Math.min(r.hi, Math.max(r.lo, worldX)))) : P.bottom;
      const mood: Mood = shot ? (rt > 1.2 ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      pika(g, px, py - 4, t, mood, shot ? rt : 0);
      track(g, r.lo, r.hi);
      if (shot && rt > VERDICT) verdict(g, shot.ok, 'FLAG PLANTED', 'WRONG SPOT');
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(3, ctx.level)), ctx.random) as never, 'A small bird flying over a hilly curve with a flag she plants at a hilltop, a valley or the highest point of a walk.');
  },
});
