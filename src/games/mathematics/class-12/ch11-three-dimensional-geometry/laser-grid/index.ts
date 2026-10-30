// Inspirations: Portal laser puzzles and laser-tag arenas (aim a beam in 3D at a target). Lux is a laser technician with a tripod emitter. The scene is drawn
// in a 3D view with the beams to scale in direction only: the readings are in the numbers, not in the picture.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { backdrop, face, num, track, trackHandle, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { buildRounds, clearance, cosOf, cross, dot, explain, intel, judge, missText, norm, spotText, type Round, type V3 } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const O = { x: 250, y: 220, s: 20 };
const RUN = 1.7;
const P = (v: V3): [number, number] => [O.x + O.s * (v[0] - 0.45 * v[2]), O.y - O.s * (v[1] - 0.3 * v[2])];
const unit = (v: V3, len: number): V3 => {
  const n = norm(v);
  return n === 0 ? [0, 0, 0] : [(v[0] / n) * len, (v[1] / n) * len, (v[2] / n) * len];
};

const HEROES = [
  { story: 'The direction cosines of a line are l = cos α, m = cos β, n = cos γ, the cosines of the angles it makes with the axes, and l² + m² + n² = 1. From direction ratios (a, b, c) you get them by dividing by √(a² + b² + c²).', objective: 'Set the numerators so the cosines over the denominator aim the beam at the target, in three rounds. The check shows in round 1; a check costs a charge later.' },
  { story: 'Two lines with direction ratios (a₁, a₂, a₃) and (b₁, b₂, b₃) are perpendicular exactly when a₁b₁ + a₂b₂ + a₃b₃ = 0. Only direction ratios matter, not where the lines pass.', objective: 'Set the unknown ratio p so the two beams are perpendicular, in three rounds. The dot product shows live in round 1; a check costs a charge later.' },
  { story: 'The angle θ between two lines satisfies cos θ = (a₁b₁ + a₂b₂ + a₃b₃)/(|a||b|). With one ratio unknown, the length of b changes too, so the equation is not a straight line in the unknown.', objective: 'Set the unknown ratio c so the beams meet at the cosine wanted, in three rounds. The cosine shows live in round 1; a check costs a charge later.' },
  { story: 'Skew lines never meet and are not parallel. Their shortest distance is d = |(a₂ − a₁)·(b₁ × b₂)| / |b₁ × b₂|: the offset between the two lines, projected on the direction square to both.', objective: 'Set the offset h so the two beams clear each other by exactly the distance wanted, in three rounds. The boss round shows no live clearance.' },
];

/** Lux: a laser technician in a helmet and goggles, standing by a tripod emitter that glows when it fires. */
function lux(g: G, x: number, y: number, t: number, mood: Mood, firing: boolean) {
  g.fillStyle = '#4a3a7a';
  g.fillRect(x - 12, y + 2, 9, 24);
  g.fillRect(x + 3, y + 2, 9, 24);
  g.fillStyle = PAL.pink;
  g.fillRect(x - 16, y - 34, 32, 38);
  g.fillStyle = '#e8c9a0';
  g.beginPath();
  g.arc(x, y - 48, 12, 0, Math.PI * 2);
  g.fill();
  face(g, x, y - 46, 9, mood, t, '#1b1030');
  g.fillStyle = PAL.yellow;
  g.beginPath();
  g.arc(x, y - 52, 13, Math.PI, 2 * Math.PI);
  g.fill();
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(x - 12, y - 49);
  g.lineTo(x + 12, y - 49);
  g.stroke();
  line(g, x + 14, y - 26, x + 34, y - 14, '#e8c9a0', 5);
  // The tripod emitter
  const ex = x + 48;
  line(g, ex, y - 10, ex - 12, y + 26, PAL.dim, 3);
  line(g, ex, y - 10, ex + 12, y + 26, PAL.dim, 3);
  g.fillStyle = PAL.dim;
  g.fillRect(ex - 10, y - 24, 22, 14);
  g.fillStyle = firing ? PAL.red : '#552222';
  g.beginPath();
  g.arc(ex + 12, y - 17, 4 + (firing ? Math.sin(t * 40) : 0), 0, Math.PI * 2);
  g.fill();
}

function level(n: number, random: () => number): DialLevel<Round> {
  const hero = HEROES[n - 1];
  const rounds = buildRounds(n, random);
  const keys = n === 1 ? ['p', 'q', 'r'] : ['v'];
  const labels = n === 1 ? ['Numerator p', 'Numerator q', 'Numerator r'] : [n === 2 ? 'Ratio p' : n === 3 ? 'Ratio c' : 'Offset h'];
  const vals = (v: Record<string, number>) => keys.map((k) => v[k]);
  return {
    hero: { name: 'Lux', role: 'a laser technician with a tripod emitter who aims beams in three dimensions', story: hero.story, objective: hero.objective },
    rounds,
    charges: [1, 1, 0],
    dials: keys.map((k, i) => ({ key: k, aria: n === 1 ? `Direction numerator ${k}` : labels[0], label: labels[i], unit: '', step: 1, min: (r: Round) => r.min, max: (r: Round) => r.max, start: (r: Round) => r.start[i], text: (v: number) => (n === 1 ? `${k} = ${num(v)}` : `${n === 2 ? 'p' : n === 3 ? 'c' : 'h'} = ${num(v)}`) })),
    handles: n === 1 ? [] : [trackHandle<Round>('v', (r) => r.min, (r) => r.max)],
    test: { button: '🔬 Check', aria: 'Check: read the beams for this setting', read: (r, v) => spotText(r, vals(v)) },
    fire: { button: '🔴 Fire the beam', aria: 'Fire the beam' },
    judge: (r, v) => judge(r, vals(v)),
    miss: (r, v) => missText(r, vals(v)),
    win: (r) => `Beams aligned! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The live check is on.' : r.assist === 1 ? 'The check is dim: a check costs a charge.' : 'Boss round: no live check.'}`,
    hit: () => [O.x + 120, O.y - 60],
    delay: RUN,
    draw: ({ g, r, v, t, rt, shot }) => {
      backdrop(g);
      const use = vals(shot ? shot.v : v);
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && !shot;
      const grow = shot ? Math.min(1, rt / 0.9) : 1;
      // The floor grid and axes
      for (let i = -4; i <= 6; i++) {
        line(g, ...P([i, 0, -3]), ...P([i, 0, 5]), PAL.grid, 1);
        line(g, ...P([-4, 0, i - 1]), ...P([6, 0, i - 1]), PAL.grid, 1);
      }
      const beam = (from: V3, d: V3, color: string, w: number, len = 7) => {
        const e = unit(d, len * grow);
        line(g, ...P(from), ...P([from[0] + e[0], from[1] + e[1], from[2] + e[2]]), color, w);
      };
      const mood: Mood = shot ? (rt > RUN - 0.4 ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      let reading = '';
      if (r.kind === 'cosines') {
        const tgt = unit(r.a, 7);
        g.fillStyle = PAL.pink;
        const [tx, ty] = P(tgt);
        g.fillRect(tx - 8, ty - 8, 16, 16);
        g.strokeStyle = shot && rt > 0.9 ? (shot.ok ? PAL.green : PAL.red) : PAL.yellow;
        g.lineWidth = 2;
        g.strokeRect(tx - 12, ty - 12, 24, 24);
        text(g, `target (${r.a.map(num).join(', ')})`, tx, ty - 18, PAL.pink, 11);
        beam([0, 0, 0], use as V3, PAL.yellow, 3);
        const len = Math.hypot(use[0], use[1], use[2]) / r.N;
        reading = `length over ${r.N}: ${num(Math.round(len * 100) / 100)}${cross(r.a, use as V3).every((x) => x === 0) && dot(r.a, use as V3) > 0 ? '  ✓ on target' : ''}`;
      } else if (r.kind === 'skew') {
        const p2: V3 = [r.off[0], r.off[1], use[0]];
        const a = unit(r.a, 4);
        const b = unit(r.b, 4);
        line(g, ...P([-a[0], -a[1], -a[2]]), ...P(a), PAL.pink, 3);
        line(g, ...P([p2[0] - b[0], p2[1] - b[1], p2[2] - b[2]]), ...P([p2[0] + b[0], p2[1] + b[1], p2[2] + b[2]]), PAL.yellow, 3);
        const nn = cross(r.a, r.b);
        const side = (dot(p2, nn) / dot(nn, nn)) * grow;
        line(g, ...P([0, 0, 0]), ...P([nn[0] * side, nn[1] * side, nn[2] * side]), PAL.green, 1.5, [4, 4]);
        text(g, 'beam 1', P(a)[0] + 6, P(a)[1], PAL.pink, 11);
        text(g, 'beam 2', P([p2[0] + b[0], p2[1] + b[1], p2[2] + b[2]])[0] + 6, P([p2[0] + b[0], p2[1] + b[1], p2[2] + b[2]])[1], PAL.yellow, 11);
        reading = `clearance ${num(Math.round(clearance(r, use[0]) * 100) / 100)}`;
      } else {
        const b: V3 = r.kind === 'perp' ? [use[0], r.b[1], r.b[2]] : [r.b[0], r.b[1], use[0]];
        beam([0, 0, 0], r.a, PAL.pink, 3);
        beam([0, 0, 0], b, PAL.yellow, 3);
        text(g, 'beam 1', P(unit(r.a, 7))[0] + 6, P(unit(r.a, 7))[1], PAL.pink, 11);
        text(g, 'beam 2', P(unit(b, 7))[0] + 6, P(unit(b, 7))[1], PAL.yellow, 11);
        reading = r.kind === 'perp' ? `dot product ${num(dot(r.a, b))}` : `cos θ ${num(Math.round(cosOf(r, use[0]) * 100) / 100)}`;
      }
      g.globalAlpha = dim ? 0.3 : 1;
      if (live || dim) text(g, reading, 500, 40, PAL.yellow, 12);
      else text(g, 'check hidden', 500, 40, PAL.dim, 12);
      g.globalAlpha = 1;
      if (r.kind === 'angle') text(g, `wanted cos θ = ${r.cn}/${r.cd}`, 500, 58, PAL.green, 12);
      if (r.kind === 'skew') text(g, `wanted clearance ${num(r.T)}`, 500, 58, PAL.green, 12);
      lux(g, 70, 270, t, mood, shot !== null && rt < RUN);
      if (n > 1) track(g, r.min, r.max);
      if (shot && rt > RUN - 0.3) verdict(g, shot.ok, 'BEAMS ALIGNED', 'BEAMS OFF');
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(4, ctx.level)), ctx.random) as never, 'A laser technician beside a 3D grid with beams aimed by direction ratios at a target, or against each other.');
  },
});
