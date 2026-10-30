// Inspirations: Paper.io and Qix (claim a region by placing its corners) and surveying games. Scout is a surveyor robot on a tripod; the deed names
// an area, and the area of a triangle is a determinant: ½|x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂)|.
import { helperOn, paidFlash } from '@core/aidflash';
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type Values } from '@core/dialgame';
import { backdrop, face, num, track, trackHandle, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { DIALS, KINDS, area, buildRounds, explain, fmtArea, intel, judge, missText, movePost, scaleDir, scaledArea, spotText, triangle, type Pt, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const VERDICT = 1.5;
const O_MAIN = { x: 340, y: 172, u: 12 };
/** The scale level draws a smaller grid, shifted left, so a field stretched up to six times still fits the scene. */
const O_SCALE = { x: 200, y: 180, u: 8 };
let O = O_MAIN;
const X = (x: number) => O.x + x * O.u;
const Y = (y: number) => O.y - y * O.u;
/** Seconds Scout takes to run the fence round the stretched posts, and how far (in pixels, always the same) a marker stone sits from the fence after a miss. */
const FENCE = 1.2;
const STONE = 12;

const HEROES = [
  { story: 'The deed for a field gives its area. Two posts are already in the ground, and the third must go on an axis, on the side of the gate that the deed names. The area of a triangle with corners (x₁, y₁), (x₂, y₂), (x₃, y₃) is half the absolute value of a determinant, so the area equation has two solutions, one on each side of the gate.', objective: 'Place post A so the field has exactly the deed’s area, on the right side of the gate, in three rounds. The live area shows in round 1; a check costs a charge.' },
  { story: 'A rope has to run straight through three posts. Three points are collinear exactly when the triangle they make has area zero, that is, when the determinant of their rows (x, y, 1) is zero. Two posts and one coordinate of the third are fixed.', objective: 'Set the free coordinate of the third post so all three are on one straight line, in three rounds. The line shows in round 1; a check costs a charge.' },
  { story: 'The line through two points is the set of points (x, y) for which the determinant of the rows (x, y, 1), (x₁, y₁, 1), (x₂, y₂, 1) is zero. Expanding it gives y = mx + c. Two beacons mark the line a signal must follow.', objective: 'Set the slope m and the intercept c so the line passes through both beacons, in three rounds.' },
  { story: 'The new deed stretches the whole field: every post moves from (x, y) to (kx, ky). Stretching both coordinates by k multiplies the determinant, and so the area, by k².', objective: 'Set the scale k so the stretched field has exactly the deed’s area, in three rounds.' },
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

function post(g: G, p: Pt, label: string, color: string, dy = -10, radius = 6) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(X(p[0]), Y(p[1]), radius, 0, Math.PI * 2);
  g.fill();
  text(g, `${label} ${num(p[0])},${num(p[1])}`, X(p[0]) + 8, Y(p[1]) + dy, color, 11, 'left');
}

/** The scale level's axes. The minor grid lines are drawn only while the live helper is on, so later rounds cannot be counted in squares. */
function scaleAxes(g: G, minor: boolean) {
  if (minor) {
    for (let i = -6; i <= 18; i += 2) {
      line(g, X(i), Y(-7), X(i), Y(19), 'rgba(130,160,255,0.08)', 1);
      line(g, X(-7), Y(i), X(19), Y(i), 'rgba(130,160,255,0.08)', 1);
    }
  }
  line(g, X(-7), Y(0), X(19), Y(0), PAL.dim, 1.5);
  line(g, X(0), Y(-7), X(0), Y(19), PAL.dim, 1.5);
  for (let i = -4; i <= 16; i += 4) {
    if (i !== 0) {
      text(g, String(i), X(i), Y(0) + 14, PAL.dim, 9);
      text(g, String(i), X(0) - 12, Y(i) + 3, PAL.dim, 9);
    }
  }
}

/**
 * The scale level's picture. The original field stays as a faint dashed outline. The stretched field follows k while it is shown (round 3 hides it
 * until the stake). On the stake Scout runs the fence round the stretched posts, then the marker stones appear: green on the posts for a win. After a
 * miss they sit a fixed distance outside (field too small) or inside (too big) the fence, so only the direction of the error shows, never its size,
 * and the true posts are never drawn.
 */
function scaleScene(g: G, r: Round, use: Values, shot: { ok: boolean } | null, rt: number) {
  scaleAxes(g, r.assist === 0);
  const [a, b, c] = r.pts as [Pt, Pt, Pt];
  g.globalAlpha = 0.75;
  line(g, X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), PAL.dim, 1.5, [4, 4]);
  line(g, X(b[0]), Y(b[1]), X(c[0]), Y(c[1]), PAL.dim, 1.5, [4, 4]);
  line(g, X(c[0]), Y(c[1]), X(a[0]), Y(a[1]), PAL.dim, 1.5, [4, 4]);
  g.globalAlpha = 1;
  ['A', 'B', 'C'].forEach((n, i) => post(g, r.pts[i], n, PAL.dim, 16, 3));
  const S = triangle(r, use);
  const shown = r.assist < 2 || shot !== null;
  if (r.assist === 0) text(g, `stretched area ${fmtArea(scaledArea(r, use))} (deed ${fmtArea(r.deed)})`, 500, 40, PAL.yellow, 12);
  else text(g, `deed: area ${fmtArea(r.deed)}`, 500, 40, PAL.dim, 12);
  if (!shown) {
    text(g, 'the stretched field appears', 500, 62, PAL.dim, 11);
    text(g, 'when you stake it', 500, 76, PAL.dim, 11);
    return;
  }
  const names = ['A′', 'B′', 'C′'];
  const closed = shot !== null && rt >= FENCE;
  const tint = closed ? (shot!.ok ? 'rgba(93,255,154,0.3)' : 'rgba(255,90,90,0.25)') : 'rgba(255,210,63,0.2)';
  const p = shot ? Math.min(1, rt / FENCE) * 3 : 3;
  if (shot === null || closed) {
    g.fillStyle = tint;
    g.beginPath();
    g.moveTo(X(S[0][0]), Y(S[0][1]));
    g.lineTo(X(S[1][0]), Y(S[1][1]));
    g.lineTo(X(S[2][0]), Y(S[2][1]));
    g.closePath();
    g.fill();
  }
  let head = S[0];
  for (let i = 0; i < 3; i++) {
    const f = Math.max(0, Math.min(1, p - i));
    if (f <= 0) continue;
    const from = S[i];
    const to = S[(i + 1) % 3];
    const end: Pt = [from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f];
    line(g, X(from[0]), Y(from[1]), X(end[0]), Y(end[1]), PAL.yellow, 2.5);
    head = end;
  }
  S.forEach((s, i) => {
    if (shot === null || p >= i) post(g, s, names[i], PAL.yellow, -10, 5);
  });
  if (shot !== null && !closed) {
    line(g, X(head[0]), Y(head[1]), X(head[0]), Y(head[1]) - 14, PAL.dim, 2);
    g.fillStyle = PAL.pink;
    g.beginPath();
    g.moveTo(X(head[0]), Y(head[1]) - 14);
    g.lineTo(X(head[0]) + 9, Y(head[1]) - 10);
    g.lineTo(X(head[0]), Y(head[1]) - 6);
    g.fill();
  }
  if (closed) {
    const cx = (S[0][0] + S[1][0] + S[2][0]) / 3;
    const cy = (S[0][1] + S[1][1] + S[2][1]) / 3;
    const out = scaleDir(r, use) < 0 ? 1 : -1;
    S.forEach((s) => {
      let sx = X(s[0]);
      let sy = Y(s[1]);
      if (!shot!.ok) {
        const dx = X(s[0]) - X(cx);
        const dy = Y(s[1]) - Y(cy);
        const len = Math.hypot(dx, dy) || 1;
        sx += (out * STONE * dx) / len;
        sy += (out * STONE * dy) / len;
      }
      g.fillStyle = shot!.ok ? PAL.green : PAL.bg1;
      g.strokeStyle = shot!.ok ? PAL.green : PAL.white;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(sx, sy, 5, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      text(g, shot!.ok ? '✓' : '✗', sx, sy - 9, shot!.ok ? PAL.green : PAL.red, 12);
    });
  }
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

/** What a paid check shows for a moment in round 2 (used in the hint). */
const SHOWN = { area: 'the area readout', collinear: 'the true rope line and the area readout', line: 'your line, its equation and which beacons it meets' };

function level(n: number, random: () => number): DialLevel<Round> {
  const kind = KINDS[n - 1];
  const flash = paidFlash();
  const hero = HEROES[n - 1];
  const dials = DIALS[kind];
  O = kind === 'scale' ? O_SCALE : O_MAIN;
  return {
    hero: { name: 'Scout', role: 'a surveyor robot on a tripod who stakes out fields and straight ropes with a determinant', story: hero.story, objective: hero.objective },
    rounds: buildRounds(n, random),
    charges: [1, 1, 0],
    dials: dials.map((d) => ({ key: d.key, aria: kind === 'line' ? (d.key === 'm' ? 'Slope m of the line' : 'Intercept c of the line') : kind === 'scale' ? 'Scale factor k' : 'Coordinate of the moving post', label: d.label, unit: '', step: 1, min: d.min, max: d.max, start: d.start, text: (v: number) => `${d.key} = ${num(v)}` })),
    handles: kind === 'line' ? [] : [trackHandle<Round>('k', () => dials[0].min, () => dials[0].max)],
    test: kind === 'scale' ? { button: '📐 Survey', aria: 'Survey the stretched field', read: (r, v) => spotText(r, v) } : { button: '📐 Check', aria: 'Check the determinant of the posts', read: (r, v) => (flash.paid(), spotText(r, v)) },
    fire: { button: '🚩 Stake the field', aria: 'Stake the posts' },
    judge: (r, v) => judge(r, v),
    miss: (r, v) => missText(r, v),
    win: (r) => `Staked! ${explain(r)}`,
    hint: (r) =>
      r.kind === 'scale'
        ? `${intel(r)} ${r.assist === 0 ? 'The live view is on.' : r.assist === 1 ? 'The area readout is hidden: a survey costs a charge.' : 'Boss round: the stretched field only appears when you stake it, and there is no survey.'}`
        : `${intel(r)} ${r.assist === 0 ? 'The live view is on.' : r.assist === 1 ? `Nothing is shown: a check shows ${SHOWN[kind as 'area' | 'collinear' | 'line']} for a moment and costs a charge.` : 'Boss round: no live view, no check.'}`,
    hit: () => (kind === 'scale' ? [500, 150] : [X(0), Y(4)]),
    delay: VERDICT,
    draw: ({ g, r, k, v, t, rt, shot, A: arcade }) => {
      backdrop(g);
      const use = shot ? shot.v : v;
      const mood: Mood = shot ? (rt > VERDICT ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      scout(g, 70, 220, t, mood);
      if (r.kind !== 'scale') axes(g);
      // The helper (the area readout, the true rope line, the player's line and the beacon ticks) is live in round 1, shows for 1.5 s after a paid check in round 2,
      // and appears after a win; never before Fire in the boss round and never during a miss.
      const since = flash.since(arcade.clock, k);
      const helper = helperOn(r.assist, !!shot?.ok, shot ? Infinity : since);
      if (r.kind !== 'scale') arcade.canvas.dataset.helper = helper ? '1' : '0';
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
        if (helper) text(g, `area now ${num(area(A, B, C))} (deed ${num(r.deed)})`, 500, 40, PAL.yellow, 12);
        else text(g, `deed: area ${num(r.deed)}`, 500, 40, PAL.dim, 12);
      } else if (r.kind === 'collinear') {
        const [a, b, c] = triangle(r, use);
        // The true line is the answer's construction: it is drawn only with the helper, never after a miss.
        if (helper) line(g, X(-12), Y(r.m * -12 + r.c), X(12), Y(r.m * 12 + r.c), PAL.cyan, 1.5, [6, 4]);
        post(g, a, 'P', PAL.cyan);
        post(g, b, 'Q', PAL.cyan);
        post(g, c, 'R', PAL.yellow);
        if (helper) text(g, `area of PQR = ${num(area(a, b, c))}`, 500, 40, PAL.yellow, 12);
        else text(g, 'the rope must be straight', 500, 40, PAL.dim, 12);
      } else if (r.kind === 'scale') {
        scaleScene(g, r, use, shot, rt);
      } else {
        r.pts.forEach((p, i) => post(g, p, `Beacon ${i + 1}`, PAL.cyan));
        if (helper) {
          line(g, X(-12), Y(use.m * -12 + use.c), X(12), Y(use.m * 12 + use.c), PAL.yellow, 2);
          text(g, `y = ${num(use.m)}x ${use.c < 0 ? '−' : '+'} ${Math.abs(use.c)}`, 500, 40, PAL.yellow, 12);
          r.pts.forEach(([x, y]) => {
            const on = y === use.m * x + use.c;
            text(g, on ? '✓' : '✗', X(x) + 8, Y(y) + 18, on ? PAL.green : PAL.red, 14);
          });
        } else {
          text(g, 'line hidden: use the determinant', 500, 40, PAL.dim, 12);
          // A miss shows the same fixed red rings on both beacons: neither which beacon was missed nor by how much.
          if (shot && done) {
            g.strokeStyle = PAL.red;
            g.lineWidth = 2;
            r.pts.forEach(([x, y]) => {
              g.beginPath();
              g.arc(X(x), Y(y), 12, 0, Math.PI * 2);
              g.stroke();
            });
          }
        }
      }
      void movePost;
      if (kind !== 'line') track(g, dials[0].min, dials[0].max);
      if (shot && rt > VERDICT) verdict(g, shot.ok, 'STAKED AND SURVEYED', 'THE SURVEY FAILED');
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(4, ctx.level)), ctx.random) as never, 'A surveyor robot beside a coordinate grid with posts, a triangle or a line, where one post or a line is set by dials.');
  },
});
