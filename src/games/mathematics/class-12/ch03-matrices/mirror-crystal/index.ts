// Inspirations: Sudoku (a grid with one consistent fill) and 2048 / Bejeweled (tiles on a grid that react to their neighbours). The mirror along
// the diagonal pairs every gem with its reflection: equal gems make a symmetric crystal, opposite gems a skew symmetric one.
import { PAL } from '@core/arcade';
import { helperOn, paidFlash } from '@core/aidflash';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { backdrop, face, num, verdict } from '@core/mathkit';
import { glow, line, text } from '@core/neon';
import { DIALS, KINDS, broken, buildRounds, explain, filled, intel, judge, missText, pSymmetric, qSkew, spotText, sumPQ, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const VERDICT = 1.5;
const GRID = { x0: 210, y0: 64, cell: 64 };
const GOALS = { sym: 'Make the crystal symmetric: every gem equals its reflection', skew: 'Make it skew symmetric: every gem is the opposite of its reflection', split: 'Split A into P + Q: P symmetric, Q skew symmetric', reverse: '' };

const HEROES = [
  { story: 'Crystal is a golem made of gems. A diagonal mirror runs from his top left to his bottom right. He opens only when the crystal is symmetric: every gem has the same value as its reflection, a_ij = a_ji, which means A′ = A. Three gems are still loose.', objective: 'Set the three loose gems so the crystal is symmetric, in three rounds. The mirror links light up in round 1; a check costs a charge.' },
  { story: 'Now the mirror makes opposites: a crystal is skew symmetric when every gem is the opposite of its reflection, a_ji = −a_ij, which means A′ = −A. A gem on the mirror line is its own reflection, so it has to be its own opposite.', objective: 'Set the three loose gems so the crystal is skew symmetric, in three rounds. The links fade; a check costs a charge.' },
  { story: 'Any square crystal splits into a symmetric part P = ½(A + A′) and a skew part Q = ½(A − A′), and A = P + Q. Every gem of P and of Q is loose: make P mirror itself, make Q its own opposite, and make them add up to the crystal.', objective: 'Set all eight gems of P and Q so that P is symmetric, Q is skew symmetric and P + Q gives the crystal, in three rounds. Half-steps are allowed.' },
  { story: 'The vault reads a crystal made from two others: the product AB, seen in the diagonal mirror. Mirror images of a product come in the reverse order: (AB)′ = B′A′, not A′B′.', objective: 'Set the four gems of the crystal the vault reads, in three rounds.' },
];

/** Crystal: a golem made of facets, with a face on its chest gem and two stubby arms. */
function crystal(g: G, x: number, y: number, t: number, mood: Mood) {
  const pulse = 1 + Math.sin(t * 2) * 0.03;
  glow(g, PAL.cyan, 14, () => {
    g.fillStyle = '#5fb7e8';
    g.beginPath();
    g.moveTo(x, y - 64 * pulse);
    g.lineTo(x + 36, y - 22);
    g.lineTo(x + 28, y + 36);
    g.lineTo(x, y + 52);
    g.lineTo(x - 28, y + 36);
    g.lineTo(x - 36, y - 22);
    g.closePath();
    g.fill();
  });
  g.strokeStyle = 'rgba(255,255,255,0.5)';
  g.lineWidth = 1.5;
  line(g, x, y - 64, x, y + 52, 'rgba(255,255,255,0.35)', 1.5);
  line(g, x - 36, y - 22, x + 28, y + 36, 'rgba(255,255,255,0.25)', 1.5);
  line(g, x + 36, y - 22, x - 28, y + 36, 'rgba(255,255,255,0.25)', 1.5);
  face(g, x, y - 8, 14, mood, t, '#0a1030');
  line(g, x - 36, y - 6, x - 52, y + 14, '#5fb7e8', 7);
  line(g, x + 36, y - 6, x + 52, y + 14, '#5fb7e8', 7);
}

function gem(g: G, x: number, y: number, size: number, label: string, fill: string, stroke: string, dim = false) {
  const h = size / 2 - 3;
  g.globalAlpha = dim ? 0.45 : 1;
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(x, y - h);
  g.lineTo(x + h, y - h * 0.3);
  g.lineTo(x + h * 0.6, y + h);
  g.lineTo(x - h * 0.6, y + h);
  g.lineTo(x - h, y - h * 0.3);
  g.closePath();
  g.fill();
  g.strokeStyle = stroke;
  g.lineWidth = 2;
  g.stroke();
  g.globalAlpha = 1;
  text(g, label, x, y + 5, '#0a1030', 15);
}

function drawGrid3(g: G, r: Round, v: Record<string, number>, shot: { ok: boolean; v: Record<string, number> } | null, show: boolean) {
  const use = shot ? shot.v : v;
  const M = filled(r, use);
  const b = broken(r, use);
  const { x0, y0, cell } = GRID;
  line(g, x0, y0, x0 + cell * 3, y0 + cell * 3, PAL.yellow, 2, [8, 6]);
  text(g, 'mirror', x0 + cell * 3 + 26, y0 + cell * 3 + 6, PAL.yellow, 11);
  let n = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const unknown = r.A[i][j] === null;
      const letter = unknown ? 'xyz'[n++] : '';
      const cx = x0 + j * cell + cell / 2;
      const cy = y0 + i * cell + cell / 2;
      const bad = b.diag.includes(i) && i === j;
      gem(g, cx, cy, cell - 6, unknown ? `${letter}=${num(M[i][j])}` : num(M[i][j]), unknown ? PAL.yellow : '#7ad2f5', bad && show ? PAL.red : PAL.white);
    }
  }
  [[0, 1], [0, 2], [1, 2]].forEach(([i, j]) => {
    const ok = !b.pairs.some(([a, c]) => a === i && c === j);
    const a1: [number, number] = [x0 + j * cell + cell / 2, y0 + i * cell + cell / 2];
    const a2: [number, number] = [x0 + i * cell + cell / 2, y0 + j * cell + cell / 2];
    const mx = (a1[0] + a2[0]) / 2 + (j - i) * 8;
    const my = (a1[1] + a2[1]) / 2 - (j - i) * 8;
    g.globalAlpha = show ? 0.9 : 0.25;
    g.strokeStyle = show ? (ok ? PAL.green : PAL.red) : PAL.dim;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(a1[0], a1[1]);
    g.quadraticCurveTo(mx, my, a2[0], a2[1]);
    g.stroke();
    g.globalAlpha = 1;
  });
  if (show) {
    // The same verdict in words and symbols, beside the grid, so colour is not the only cue.
    [[0, 1], [0, 2], [1, 2]].forEach(([i, j], n) => {
      const ok = !b.pairs.some(([a, c]) => a === i && c === j);
      text(g, `a${i + 1}${j + 1} ↔ a${j + 1}${i + 1}  ${ok ? '✓' : '✗'}`, 452, 100 + n * 22, ok ? PAL.green : PAL.red, 12, 'left');
    });
    if (r.kind === 'skew') {
      const ok = b.diag.length === 0;
      text(g, `mirror line  ${ok ? '✓' : '✗'}`, 452, 166, ok ? PAL.green : PAL.red, 12, 'left');
    }
  } else text(g, 'mirror links off', 540, 70, PAL.dim, 11);
}

function drawSplit(g: G, r: Round, v: Record<string, number>, shot: { ok: boolean; v: Record<string, number> } | null, show: boolean) {
  const use = shot ? shot.v : v;
  const S = sumPQ(use);
  const grid = (x0: number, y0: number, M: (string | number)[][], title: string, color: string, flags?: boolean[][]) => {
    text(g, title, x0 + 54, y0 - 10, PAL.dim, 12);
    M.forEach((row, i) => row.forEach((c, j) => {
      const ok = flags ? flags[i][j] : true;
      gem(g, x0 + j * 54 + 27, y0 + i * 54 + 27, 54, typeof c === 'number' ? num(c) : c, color, flags ? (ok ? PAL.green : PAL.red) : PAL.white);
      if (flags) text(g, ok ? '✓' : '✗', x0 + j * 54 + 48, y0 + i * 54 + 12, ok ? PAL.green : PAL.red, 12);
    }));
  };
  grid(150, 90, r.M, 'A', '#7ad2f5');
  grid(290, 90, [[use.p11, use.p12], [use.p21, use.p22]], 'P (symmetric?)', PAL.yellow, undefined);
  grid(430, 90, [[use.q11, use.q12], [use.q21, use.q22]], 'Q (skew?)', PAL.pink, undefined);
  if (show) {
    text(g, pSymmetric(use) ? 'P mirrors itself ✓' : 'P does not mirror ✗', 344, 212, pSymmetric(use) ? PAL.green : PAL.red, 11);
    text(g, qSkew(use) ? 'Q is skew ✓' : 'Q is not skew ✗', 484, 212, qSkew(use) ? PAL.green : PAL.red, 11);
  }
  text(g, '=', 270, 150, PAL.white, 20);
  text(g, '+', 410, 150, PAL.white, 20);
  const flags = S.map((row, i) => row.map((x, j) => x === r.M[i][j]));
  text(g, 'P + Q', 320, 228, PAL.dim, 12);
  grid(266, 232, S, '', PAL.cyan, show ? flags : undefined);
  if (!show) text(g, 'sum check off', 500, 270, PAL.dim, 11);
}

/** Level 4: crystals A and B small at the top, and the vault door with (AB)′ engraved and the four gems of X in front of it. */
function drawReverse(g: G, r: Round, v: Record<string, number>, t: number, rt: number, shot: { ok: boolean; v: Record<string, number> } | null) {
  const use = shot ? shot.v : v;
  const live = r.assist === 0 || shot !== null;
  const small = (M: number[][], x0: number, y0: number, title: string) => {
    text(g, title, x0 + (M[0].length * 36) / 2, y0 - 10, PAL.dim, 12);
    M.forEach((row, i) => row.forEach((c, j) => gem(g, x0 + j * 36 + 18, y0 + i * 36 + 18, 36, num(c), '#7ad2f5', PAL.white)));
  };
  const ax = 165;
  const ay = 72;
  small(r.RA!, ax, ay, 'A');
  const mid = ax + r.RA![0].length * 36 + 14;
  text(g, '×', mid, ay + 42, PAL.white, 20);
  small(r.RB!, mid + 14, ay, 'B');
  text(g, 'The vault reads A × B in the diagonal mirror', 270, 236, PAL.dim, 11);
  // The vault door: it shakes after a miss, and its lamp turns red or green when the verdict lands.
  const done = shot !== null && rt > VERDICT;
  const vx = 420 + (shot && !shot.ok && rt > VERDICT - 0.4 ? Math.sin(rt * 45) * 3 : 0);
  const cx = vx + 102;
  g.fillStyle = '#1b2350';
  g.fillRect(vx, 24, 205, 292);
  g.strokeStyle = shot?.ok && done ? PAL.green : PAL.dim;
  g.lineWidth = 3;
  g.strokeRect(vx, 24, 205, 292);
  g.fillStyle = PAL.dim;
  for (const [bx, by] of [[14, 38], [191, 38], [14, 302], [191, 302]]) {
    g.beginPath();
    g.arc(vx + bx, by, 5, 0, Math.PI * 2);
    g.fill();
  }
  text(g, 'THE VAULT READS', cx, 46, PAL.dim, 11);
  text(g, '(AB)′', cx, 74, PAL.yellow, 22);
  const x0 = cx - 54;
  const y0 = 96;
  line(g, x0, y0, x0 + 108, y0 + 108, PAL.yellow, 1.5, [6, 5]);
  const keys = ['x11', 'x12', 'x21', 'x22'];
  // Round 1 shows every gem live. In rounds 2 and 3 a shot marks only the gem the miss text names (the first wrong one), and a win marks all four.
  const firstBad = keys.findIndex((k) => use[k] !== r.ans[k]);
  keys.forEach((k, n) => {
    const ok = use[k] === r.ans[k];
    const rim = live ? (r.assist === 0 || shot!.ok || n === firstBad ? (ok ? 'ok' : 'bad') : '') : '';
    const gx = x0 + (n % 2) * 54 + 27;
    const gy = y0 + Math.floor(n / 2) * 54 + 27;
    gem(g, gx, gy, 54, num(use[k]), PAL.yellow, rim === 'ok' ? PAL.green : rim === 'bad' ? PAL.red : PAL.white);
    if (rim) text(g, rim === 'ok' ? '✓' : '✗', gx + 21, gy - 19, rim === 'ok' ? PAL.green : PAL.red, 11);
  });
  text(g, 'X', cx, 90, PAL.dim, 12);
  const lamp = done ? (shot!.ok ? PAL.green : PAL.red) : Math.sin(t * 3) > 0 ? PAL.orange : PAL.dim;
  glow(g, lamp, 10, () => {
    g.fillStyle = lamp;
    g.beginPath();
    g.arc(cx, 240, 11, 0, Math.PI * 2);
    g.fill();
  });
  text(g, done ? (shot!.ok ? 'OPEN ✓' : 'STAYS SHUT ✗') : 'SEALED', cx, 272, PAL.white, 12);
  text(g, r.assist === 0 ? 'rims: ✓ gem matches, ✗ it does not' : r.assist === 1 ? 'no live rims: use the test glow' : 'boss: no rims, no test glow', cx, 298, PAL.dim, 10);
}

function level(n: number, random: () => number): DialLevel<Round> {
  const kind = KINDS[n - 1];
  const hero = HEROES[n - 1];
  const rounds = buildRounds(n, random);
  const flash = paidFlash();
  return {
    hero: { name: 'Crystal', role: 'a golem made of gems with a mirror down its diagonal, who opens only when the gems balance', story: hero.story, objective: hero.objective },
    rounds,
    charges: [1, 1, 0],
    dials: DIALS[kind].map((d) => ({ key: d.key, aria: kind === 'split' ? `${d.label} gem of P or Q` : kind === 'reverse' ? `${d.label} gem of the vault crystal` : `Loose gem ${d.key}`, label: d.label, unit: '', step: d.step, min: d.min, max: d.max, start: d.start, text: (v: number) => num(v) })),
    handles: [],
    test: kind === 'reverse' ? { button: '🔍 Test glow', aria: 'Test glow: count the matching gems', read: (r, v) => spotText(r, v) } : {
      button: '🔍 Check',
      aria: 'Check the mirror pairs',
      read: (r, v) => {
        flash.paid();
        return spotText(r, v);
      },
    },
    fire: { button: '💎 Open the crystal', aria: 'Open the crystal' },
    judge: (r, v) => judge(r, v),
    miss: (r, v) => missText(r, v),
    win: (r) => `Open! ${explain(r)}`,
    hint: (r) =>
      r.kind === 'reverse'
        ? `${intel(r)} ${r.assist === 0 ? 'The gem rims are live.' : r.assist === 1 ? 'No live rims: a test glow costs a charge.' : 'Boss round: no rims, no test glow.'}`
        : `${intel(r)} ${r.assist === 0 ? 'The mirror links are live.' : r.assist === 1 ? 'No links: a check shows them for a moment and costs a charge.' : 'Boss round: no links, no check.'}`,
    hit: () => (kind === 'reverse' ? [522, 150] : [330, 160]),
    delay: VERDICT,
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      backdrop(g);
      // The links and flags are the paid Check: live in round 1, a moment after a check in round 2, never in round 3, and after a shot only on a win.
      const show = helperOn(r.assist, shot !== null && shot.ok, flash.since(t, k));
      if (kind !== 'reverse') A.canvas.dataset.links = show ? '1' : '0';
      const mood: Mood = shot ? (rt > VERDICT ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      crystal(g, 80, 180, t, mood);
      if (kind !== 'reverse' && !(shot && rt > VERDICT)) text(g, GOALS[kind], 330, 22, PAL.yellow, 12);
      if (kind === 'reverse') drawReverse(g, r, v, t, rt, shot);
      else if (kind === 'split') drawSplit(g, r, v, shot, show);
      else drawGrid3(g, r, v, shot, show);
      if (shot && rt > VERDICT) verdict(g, shot.ok, 'THE CRYSTAL OPENS', 'THE CRYSTAL STAYS SHUT');
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(4, ctx.level)), ctx.random) as never, 'A golem made of gems with a diagonal mirror, and a grid of gems some of which are set by dials until the grid is symmetric or skew symmetric.');
  },
});
