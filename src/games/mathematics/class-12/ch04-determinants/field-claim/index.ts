// Inspirations: Paper.io and Qix (claim a region by placing its corners) and surveying games. Scout is a surveyor robot on a tripod; the deed names
// an area, and the area of a triangle is a determinant: ½|x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂)|.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { backdrop, face, num, track, trackHandle, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { DIALS, KINDS, area, buildRounds, explain, intel, judge, missText, movePost, spotText, triangle, type Pt, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const VERDICT = 1.5;
const O = { x: 340, y: 172, u: 12 };
const X = (x: number) => O.x + x * O.u;
const Y = (y: number) => O.y - y * O.u;

const HEROES = [
  { story: 'The deed for a field gives its area. Two posts are already in the ground, and the third must go on an axis, on the side of the gate that the deed names. The area of a triangle with corners (x₁, y₁), (x₂, y₂), (x₃, y₃) is half the absolute value of a determinant, so the area equation has two solutions, one on each side of the gate.', objective: 'Place post A so the field has exactly the deed’s area, on the right side of the gate, in three rounds. The live area shows in round 1; a check costs a charge.' },
  { story: 'A rope has to run straight through three posts. Three points are collinear exactly when the triangle they make has area zero, that is, when the determinant of their rows (x, y, 1) is zero. Two posts and one coordinate of the third are fixed.', objective: 'Set the free coordinate of the third post so all three are on one straight line, in three rounds. The line shows in round 1; a check costs a charge.' },
  { story: 'The line through two points is the set of points (x, y) for which the determinant of the rows (x, y, 1), (x₁, y₁, 1), (x₂, y₂, 1) is zero. Expanding it gives y = mx + c. Two beacons mark the line a signal must follow.', objective: 'Set the slope m and the intercept c so the line passes through both beacons, in three rounds.' },
];

/** Scout: a surveyor robot on a tripod with a lens for an eye and a flag on its antenna. */
function scout(g: G, x: number, y: number, t: number, mood: Mood) {
  line(g, x, y, x - 22, y + 46, PAL.dim, 4);
  line(g, x, y, x + 22, y + 46, PAL.dim, 4);
  line(g, x, y, x, y + 50, PAL.dim, 4);
  g.fillStyle = '#4a3a7a';
  g.fillRect(x - 22, y - 36, 44, 38);
  g.strokeStyle = PAL.orange;
  g.lineWidth = 1.5;
  g.strokeRect(x - 22, y - 36, 44, 38);
  g.fillStyle = '#0a1030';
  g.beginPath();
  g.arc(x, y - 18, 14, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 2;
  g.stroke();
  face(g, x, y - 18, 10, mood, t, PAL.cyan);
  line(g, x + 14, y - 36, x + 14, y - 58, PAL.dim, 2);
  g.fillStyle = PAL.pink;
  g.beginPath();
  g.moveTo(x + 14, y - 58);
  g.lineTo(x + 30, y - 52);
  g.lineTo(x + 14, y - 46);
  g.fill();
  line(g, x - 22, y - 14, x - 38, y - 4, '#4a3a7a', 6);
}

function post(g: G, p: Pt, label: string, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(X(p[0]), Y(p[1]), 6, 0, Math.PI * 2);
  g.fill();
  text(g, `${label} ${num(p[0])},${num(p[1])}`, X(p[0]) + 8, Y(p[1]) - 10, color, 11, 'left');
}

function axes(g: G) {
  for (let i = -12; i <= 12; i += 2) {
    line(g, X(i), Y(-12), X(i), Y(12), 'rgba(130,160,255,0.08)', 1);
    line(g, X(-12), Y(i), X(12), Y(i), 'rgba(130,160,255,0.08)', 1);
  }
  line(g, X(-13), Y(0), X(13), Y(0), PAL.dim, 1.5);
  line(g, X(0), Y(-12), X(0), Y(13), PAL.dim, 1.5);
  for (let i = -12; i <= 12; i += 4) {
    if (i !== 0) {
      text(g, String(i), X(i), Y(0) + 14, PAL.dim, 9);
      text(g, String(i), X(0) - 12, Y(i) + 3, PAL.dim, 9);
    }
  }
}

function level(n: number, random: () => number): DialLevel<Round> {
  const kind = KINDS[n - 1];
  const hero = HEROES[n - 1];
  const dials = DIALS[kind];
  return {
    hero: { name: 'Scout', role: 'a surveyor robot on a tripod who stakes out fields and straight ropes with a determinant', story: hero.story, objective: hero.objective },
    rounds: buildRounds(n, random),
    charges: [1, 1, 0],
    dials: dials.map((d) => ({ key: d.key, aria: kind === 'line' ? (d.key === 'm' ? 'Slope m of the line' : 'Intercept c of the line') : 'Coordinate of the moving post', label: d.label, unit: '', step: 1, min: d.min, max: d.max, start: d.start, text: (v: number) => `${d.key} = ${num(v)}` })),
    handles: kind === 'line' ? [] : [trackHandle<Round>('k', () => dials[0].min, () => dials[0].max)],
    test: { button: '📐 Check', aria: 'Check the determinant of the posts', read: (r, v) => spotText(r, v) },
    fire: { button: '🚩 Stake the field', aria: 'Stake the posts' },
    judge: (r, v) => judge(r, v),
    miss: (r, v) => missText(r, v),
    win: (r) => `Staked! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The live view is on.' : r.assist === 1 ? 'The live view is dim: a check costs a charge.' : 'Boss round: no live view, no check.'}`,
    hit: () => [X(0), Y(4)],
    delay: VERDICT,
    draw: ({ g, r, v, t, rt, shot }) => {
      backdrop(g);
      const use = shot ? shot.v : v;
      const mood: Mood = shot ? (rt > VERDICT ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      scout(g, 70, 220, t, mood);
      axes(g);
      const live = r.assist === 0 || shot !== null;
      const show = live || r.assist === 1;
      const dim = !live && r.assist === 1;
      const done = shot && rt > 0.8 ? (shot.ok ? PAL.green : PAL.red) : null;
      if (r.kind === 'area') {
        const [A, B, C] = triangle(r, use);
        g.fillStyle = done ? (done === PAL.green ? 'rgba(93,255,154,0.3)' : 'rgba(255,90,90,0.25)') : 'rgba(255,210,63,0.2)';
        g.beginPath();
        g.moveTo(X(A[0]), Y(A[1]));
        g.lineTo(X(B[0]), Y(B[1]));
        g.lineTo(X(C[0]), Y(C[1]));
        g.closePath();
        g.fill();
        g.strokeStyle = PAL.yellow;
        g.lineWidth = 2;
        g.stroke();
        post(g, B, 'B', PAL.cyan);
        post(g, C, 'C', PAL.cyan);
        post(g, A, 'A', PAL.yellow);
        const gx = r.axis === 'x' ? X(B[0]) : X(-12);
        const gy = r.axis === 'x' ? Y(-12) : Y(B[1]);
        if (r.axis === 'x') line(g, gx, Y(-12), gx, Y(12), PAL.pink, 1.5, [4, 4]);
        else line(g, X(-12), gy, X(12), gy, PAL.pink, 1.5, [4, 4]);
        text(g, 'gate', r.axis === 'x' ? gx : X(11), r.axis === 'x' ? Y(11) : gy - 6, PAL.pink, 11);
        if (show) {
          g.globalAlpha = dim ? 0.3 : 1;
          text(g, `area now ${num(area(A, B, C))} (deed ${num(r.deed)})`, 500, 40, PAL.yellow, 12);
          g.globalAlpha = 1;
        } else text(g, `deed: area ${num(r.deed)}`, 500, 40, PAL.dim, 12);
      } else if (r.kind === 'collinear') {
        const [a, b, c] = triangle(r, use);
        if (show) {
          g.globalAlpha = dim ? 0.3 : 0.9;
          line(g, X(-12), Y(r.m * -12 + r.c), X(12), Y(r.m * 12 + r.c), PAL.cyan, 1.5, [6, 4]);
          g.globalAlpha = 1;
        }
        post(g, a, 'P', PAL.cyan);
        post(g, b, 'Q', PAL.cyan);
        post(g, c, 'R', PAL.yellow);
        if (show) {
          g.globalAlpha = dim ? 0.3 : 1;
          text(g, `area of PQR = ${num(area(a, b, c))}`, 500, 40, PAL.yellow, 12);
          g.globalAlpha = 1;
        } else text(g, 'the rope must be straight', 500, 40, PAL.dim, 12);
      } else {
        r.pts.forEach((p, i) => post(g, p, `Beacon ${i + 1}`, PAL.cyan));
        if (show) {
          g.globalAlpha = dim ? 0.3 : 0.9;
          line(g, X(-12), Y(use.m * -12 + use.c), X(12), Y(use.m * 12 + use.c), PAL.yellow, 2);
          g.globalAlpha = 1;
          text(g, `y = ${num(use.m)}x ${use.c < 0 ? '−' : '+'} ${Math.abs(use.c)}`, 500, 40, PAL.yellow, 12);
          r.pts.forEach(([x, y], i) => {
            const on = y === use.m * x + use.c;
            if (live) text(g, on ? '✓' : '✗', X(x) + 8, Y(y) + 18, on ? PAL.green : PAL.red, 14);
            void i;
          });
        } else text(g, 'line hidden: use the determinant', 500, 40, PAL.dim, 12);
      }
      void movePost;
      if (kind !== 'line') track(g, dials[0].min, dials[0].max);
      if (shot && rt > VERDICT) verdict(g, shot.ok, 'STAKED AND SURVEYED', 'THE SURVEY FAILED');
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(3, ctx.level)), ctx.random) as never, 'A surveyor robot beside a coordinate grid with posts, a triangle or a line, where one post or a line is set by dials.');
  },
});
