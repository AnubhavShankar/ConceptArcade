// Inspirations: Splatoon (cover the turf with ink) and Paper.io (the player is the pen that claims ground). Inky is a paint-roller squid kid and is also the
// handle: the player drags Inky along the turf, laying paint behind. The paint is area, so the part below the axis counts as paint, never as a negative.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type HandleSpec } from '@core/dialgame';
import { backdrop, face, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { area, buildRounds, explain, height, intel, judge, missText, show, spotText, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const VERDICT = 1.9;
const RUN = 1.4;
const F = { x0: 70, x1: 580, top: 62, bottom: 262 };
const E = { cx: 320, cy: 170, u: 12 };

const HEROES = [
  { story: 'The turf is an ellipse x²/a² + y²/b² = 1. Its area is πab, which is four times the area of its first quadrant. The width a is fixed by the arena; Inky drags the top of the ellipse up to set the height b.', objective: 'Drag Inky to the height b where the ellipse holds exactly the paint the turf needs, in three rounds. The paint counter shows in round 1; an ink gauge costs a charge.' },
  { story: 'The turf lies between a straight line and the x-axis, and the line crosses the axis. Paint below the axis is still turf, so it adds to the area: the area is the part below plus the part above, not their signed difference.', objective: 'Drag Inky to where the paint laid is exactly the paint needed, in three rounds. The paint counter shows in round 1; an ink gauge costs a charge.' },
  { story: 'The turf lies under a wave a·sin x. Each quarter wave of height a has area a, whether it is above the axis or below it, so the area grows by a with every step of π/2, never cancelling.', objective: 'Drag Inky to the number of quarter waves where the paint laid is exactly the paint needed, in three rounds. The paint counter shows in round 1; an ink gauge costs a charge.' },
  { story: 'The cubic k·x³ is below the axis for x < 0 and above it for x > 0. The roller starts at the left end of the turf and rolls right. Paint counts on both sides of the axis, so the two lobes add.', objective: 'Drag Inky to where the paint laid is exactly the paint needed, in three rounds. The boss round has no paint counter and no ink gauge.' },
];

/** Inky: a squid kid with a dome head, wiggling tentacle legs and a paint roller. */
function inky(g: G, x: number, y: number, t: number, mood: Mood, roll: number) {
  for (let i = 0; i < 4; i++) {
    const tx = x - 12 + i * 8;
    const w = Math.sin(t * 6 + i * 1.3) * 3;
    g.strokeStyle = PAL.pink;
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(tx, y - 18);
    g.quadraticCurveTo(tx + w, y - 8, tx - w * 0.5, y);
    g.stroke();
  }
  g.fillStyle = PAL.pink;
  g.beginPath();
  g.ellipse(x, y - 32, 15, 18, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ff9fc5';
  g.beginPath();
  g.ellipse(x - 5, y - 40, 4, 7, -0.4, 0, Math.PI * 2);
  g.fill();
  face(g, x, y - 30, 11, mood, t, '#1b1030');
  // The roller: a handle from the side of the head and a cylinder that turns as it rolls.
  line(g, x + 12, y - 28, x + 28, y - 10, PAL.dim, 3);
  g.fillStyle = PAL.cyan;
  g.fillRect(x + 20, y - 12, 18, 8);
  for (let i = 0; i < 3; i++) line(g, x + 22 + ((i * 6 + roll * 6) % 16), y - 12, x + 22 + ((i * 6 + roll * 6) % 16), y - 4, '#0a1030', 1.5);
}

function level(n: number, random: () => number): DialLevel<Round> {
  const hero = HEROES[n - 1];
  const rounds = buildRounds(n, random);
  const kind = rounds[0].kind;
  const geo = rounds.map((r) => {
    if (kind === 'ellipse') return { x0: -1, x1: 1, y0: -1, y1: 1, lo: -r.p[0] };
    const x0 = kind === 'cubic' ? -3 : 0;
    const x1 = kind === 'line' ? 9 : kind === 'sine' ? 4 * Math.PI : 4;
    const ys = Array.from({ length: 121 }, (_, i) => height(r, x0 + ((x1 - x0) * i) / 120));
    const y0 = Math.min(0, ...ys);
    const y1 = Math.max(0, ...ys);
    const pad = (y1 - y0) * 0.06;
    return { x0, x1, y0: y0 - pad, y1: y1 + pad, lo: kind === 'cubic' ? -r.p[1] : 0 };
  });
  const at = (r: Round) => geo[rounds.indexOf(r)] ?? geo[0];
  const X = (r: Round, x: number) => F.x0 + ((x - at(r).x0) / (at(r).x1 - at(r).x0)) * (F.x1 - F.x0);
  const Y = (r: Round, y: number) => F.bottom - ((y - at(r).y0) / (at(r).y1 - at(r).y0)) * (F.bottom - F.top);
  const edge = (r: Round, v: number) => (r.kind === 'sine' ? (v * Math.PI) / 2 : v);
  const handle: HandleSpec<Round> =
    kind === 'ellipse'
      ? { dial: 'v', at: (_r, v) => [E.cx, E.cy - v.v * E.u], drag: (_r, _px, py) => (E.cy - py) / E.u, radius: 24 }
      : { dial: 'v', at: (r, v) => [X(r, edge(r, v.v)), Y(r, 0)], drag: (r, px) => ((px - X(r, 0)) / (X(r, 1) - X(r, 0))) / (r.kind === 'sine' ? Math.PI / 2 : 1), radius: 24 };
  const labels = ['Ellipse height b', 'Roller at x', 'Quarter waves n', 'Roller at x'];
  return {
    hero: { name: 'Inky', role: 'a paint-roller squid kid who covers a turf with exactly the paint it needs', story: hero.story, objective: hero.objective },
    rounds,
    charges: [1, 1, 0],
    dials: [{ key: 'v', aria: 'Roller setting', label: labels[n - 1], unit: '', step: 1, min: (r: Round) => r.min, max: (r: Round) => r.max, start: (r: Round) => r.start, text: (v: number) => (kind === 'ellipse' ? `b = ${v}` : kind === 'sine' ? `${v} quarter waves` : `x = ${v}`) }],
    handles: [handle],
    test: { button: '🎯 Ink gauge', aria: 'Ink gauge: read the paint laid at this setting', read: (r, v) => spotText(r, v.v) },
    fire: { button: '🖌️ Seal the turf', aria: 'Seal the turf' },
    judge: (r, v) => judge(r, v.v),
    miss: (r, v) => missText(r, v.v),
    win: (r) => `Turf sealed! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The paint counter is live.' : r.assist === 1 ? 'The counter is dim: an ink gauge costs a charge.' : 'Boss round: no counter, no gauge.'}`,
    hit: (r) => (kind === 'ellipse' ? [E.cx, E.cy] : [X(r, edge(r, r.ans)), Y(r, 0)]),
    delay: VERDICT,
    draw: ({ g, r, v, t, rt, shot }) => {
      backdrop(g);
      const val = shot ? shot.v.v : v.v;
      const sweep = shot ? Math.min(1, rt / RUN) : 1;
      let painted = 0;
      let overT = false;
      let px: number;
      let py: number;
      if (kind === 'ellipse') {
        const a = r.p[0];
        const b = Math.max(0.05, val);
        line(g, E.cx - 7 * E.u, E.cy, E.cx + 7 * E.u, E.cy, PAL.dim, 1.5);
        line(g, E.cx, E.cy - 9 * E.u, E.cx, E.cy + 9 * E.u, PAL.dim, 1.5);
        painted = a * val * sweep;
        overT = shot !== null && a * val > r.T;
        g.save();
        g.beginPath();
        g.rect(E.cx - a * E.u - 2, 0, 2 * a * E.u * sweep + 4, 340);
        g.clip();
        g.fillStyle = overT ? 'rgba(255,90,90,0.55)' : 'rgba(255,77,141,0.5)';
        g.beginPath();
        g.ellipse(E.cx, E.cy, a * E.u, b * E.u, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
        g.strokeStyle = PAL.cyan;
        g.lineWidth = 3;
        g.beginPath();
        g.ellipse(E.cx, E.cy, a * E.u, b * E.u, 0, 0, Math.PI * 2);
        g.stroke();
        text(g, `a = ${a}`, E.cx + a * E.u + 22, E.cy + 14, PAL.dim, 11);
        px = E.cx + (shot ? -a * E.u + 2 * a * E.u * sweep : 0) + 0;
        py = E.cy - b * E.u;
        if (shot) py = E.cy;
      } else {
        const lo = at(r).lo;
        const hi = edge(r, val);
        const z = Y(r, 0);
        line(g, F.x0, z, F.x1, z, PAL.dim, 1.5);
        // The curve and the paint laid under it so far
        const N = 120;
        const dx = (hi - lo) / N;
        let cum = 0;
        for (let i = 0; i < N * sweep; i++) {
          const x = lo + (i + 0.5) * dx;
          const h = height(r, x);
          cum += Math.abs(h) * dx;
          const over = shot !== null && cum > r.T + 1e-9;
          g.fillStyle = over ? 'rgba(255,90,90,0.55)' : h < 0 ? 'rgba(255,155,61,0.5)' : 'rgba(255,77,141,0.5)';
          g.fillRect(X(r, lo + i * dx), Math.min(Y(r, h), z), X(r, lo + (i + 1) * dx) - X(r, lo + i * dx) + 0.6, Math.abs(z - Y(r, h)));
        }
        painted = shot ? cum : area(r, val);
        overT = shot !== null && area(r, val) > r.T;
        g.strokeStyle = PAL.cyan;
        g.lineWidth = 3;
        g.beginPath();
        for (let i = 0; i <= 200; i++) {
          const x = at(r).x0 + ((at(r).x1 - at(r).x0) * i) / 200;
          if (i === 0) g.moveTo(X(r, x), Y(r, height(r, x)));
          else g.lineTo(X(r, x), Y(r, height(r, x)));
        }
        g.stroke();
        if (r.kind === 'sine') for (let i = 0; i <= 8; i++) text(g, i === 0 ? '0' : `${i}`, X(r, (i * Math.PI) / 2), z + (i % 2 ? 15 : 28), PAL.dim, 9);
        else for (let i = Math.ceil(at(r).x0); i <= at(r).x1; i++) text(g, String(i), X(r, i), z + 14, PAL.dim, 9);
        px = X(r, lo + (hi - lo) * (shot ? sweep : 1));
        py = z;
        line(g, X(r, hi), F.top, X(r, hi), F.bottom, PAL.yellow, 1.5, [4, 4]);
      }
      // The counter
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && !shot;
      g.globalAlpha = dim ? 0.3 : 1;
      if (live || dim) text(g, `painted ${show(r, Math.round(painted * 10) / 10)}`, 500, 40, overT ? PAL.red : PAL.yellow, 13);
      else text(g, 'counter off', 500, 40, PAL.dim, 12);
      g.globalAlpha = 1;
      text(g, `need ${show(r, r.T)}`, 500, 58, PAL.green, 13);
      const mood: Mood = shot ? (rt > RUN ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      inky(g, px, py + (kind === 'ellipse' && !shot ? -6 : 0), t, mood, shot ? rt * 4 : 0);
      if (shot && rt > VERDICT - 0.3) verdict(g, shot.ok, 'TURF SEALED', overT ? 'SPILLED ON THE RIVAL' : 'BARE PATCHES');
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(4, ctx.level)), ctx.random) as never, 'A paint-roller squid kid on a turf bounded by a curve and the x-axis, dragged to lay exactly the paint the turf needs.');
  },
});
