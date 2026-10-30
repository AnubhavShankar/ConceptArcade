// Inspirations: Portal laser relays and Zelda mirror puzzles (a beam must be aimed to reach a target you cannot see until it is hit), with the
// dish dial as a protractor. Beam is a bright spark that carries a message; the dish must point at the value of an inverse trigonometric expression.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { backdrop, face, piText, verdict } from '@core/mathkit';
import { glow, line, text } from '@core/neon';
import { DIAL, STEP, buildRounds, explain, intel, judge, missText, spotText, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const VERDICT = 1.6;
const C = { x: 400, y: 180, R: 92 };

const HEROES = [
  { story: 'Beam is a signal that has to reach a satellite. The dish controller only ever reports principal values: sin⁻¹ lies in [−π/2, π/2], cos⁻¹ in [0, π] and tan⁻¹ in (−π/2, π/2). So the angle in the expression is not always the angle the dish must take: first bring it inside the branch without changing the value of the sine, cosine or tangent.', objective: 'Point the dish at the value of the expression, in three rounds. The shaded arc shows the principal branch in round 1; a check costs a charge.' },
  { story: 'Some beams are the sum of two angles. For tangents, tan(A + B) = (tan A + tan B)/(1 − tan A tan B), and the sum of two positive angles can pass π/2. Use the formula, then decide which angle in the right range has that tangent.', objective: 'Point the dish at the sum, in three rounds. The shaded arc fades; a check costs a charge. The boss round goes past π/2.' },
  { story: 'A substitution can turn a messy expression into a multiple of one angle: put x = tan θ, sin θ or cos θ, simplify with an identity, then undo the substitution. The answer is then a simple multiple of an inverse function of x.', objective: 'Point the dish at the value of the expression at the given x, in three rounds.' },
];

/** Beam: a bright spark with a comet tail and a small face. */
function beam(g: G, x: number, y: number, t: number, mood: Mood) {
  for (let i = 5; i > 0; i--) {
    g.globalAlpha = 0.12 * (6 - i);
    g.fillStyle = PAL.yellow;
    g.beginPath();
    g.arc(x - i * 9, y + Math.sin(t * 6 + i) * 4, 9 - i, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  glow(g, PAL.yellow, 16, () => {
    g.fillStyle = PAL.yellow;
    g.beginPath();
    g.arc(x, y, 16, 0, Math.PI * 2);
    g.fill();
  });
  face(g, x, y, 11, mood, t, '#1b1030');
  for (let i = 0; i < 6; i++) {
    const a = t * 2 + (i * Math.PI) / 3;
    line(g, x + Math.cos(a) * 20, y + Math.sin(a) * 20, x + Math.cos(a) * 26, y + Math.sin(a) * 26, PAL.yellow, 2);
  }
}

function dish(g: G, a: number) {
  line(g, C.x, C.y + 20, C.x, C.y + 62, PAL.dim, 6);
  line(g, C.x - 24, C.y + 62, C.x + 24, C.y + 62, PAL.dim, 6);
  g.save?.();
  g.translate?.(C.x, C.y);
  g.rotate?.(-a);
  g.fillStyle = '#8f9bd6';
  g.beginPath();
  g.ellipse(14, 0, 8, 26, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 2;
  g.stroke();
  line(g, 14, 0, 38, 0, PAL.yellow, 3);
  g.restore?.();
  g.fillStyle = PAL.dim;
  g.beginPath();
  g.arc(C.x, C.y, 8, 0, Math.PI * 2);
  g.fill();
}

function level(n: number, random: () => number): DialLevel<Round> {
  const hero = HEROES[n - 1];
  const rounds = buildRounds(n, random);
  return {
    hero: { name: 'Beam', role: 'a signal spark racing to a relay tower, which must point its dish at an angle given by an inverse trigonometric expression', story: hero.story, objective: hero.objective },
    rounds,
    charges: [1, 1, 0],
    dials: [{ key: 'k', aria: 'Dish angle in steps of pi over twelve', label: 'Dish angle', unit: '', step: 1, min: DIAL.min, max: DIAL.max, start: 0, text: (v) => `${piText(v)} (${v * 15}°)` }],
    handles: [{
      dial: 'k',
      at: (_r, v) => [C.x + C.R * Math.cos(v.k * STEP), C.y - C.R * Math.sin(v.k * STEP)],
      drag: (_r, px, py) => Math.round(Math.atan2(C.y - py, px - C.x) / STEP),
      radius: 20,
    }],
    test: { button: '📡 Check', aria: 'Check the dish against the range of the outer function', read: (r, v) => spotText(r, v.k) },
    fire: { button: '📶 Send the signal', aria: 'Send the signal' },
    judge: (r, v) => judge(r, v.k),
    miss: (r, v) => missText(r, v.k),
    win: (r) => `Signal received! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The principal range is shaded.' : r.assist === 1 ? 'The range is dim: a check costs a charge.' : 'Boss round: no shading, no check.'}`,
    hit: (r) => [C.x + 130 * Math.cos(r.ans * STEP), C.y - 130 * Math.sin(r.ans * STEP)],
    delay: VERDICT,
    draw: ({ g, r, v, t, rt, shot }) => {
      backdrop(g);
      const use = shot ? shot.v.k : v.k;
      const mood: Mood = shot ? (rt > VERDICT ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      text(g, r.text, 320, 28, PAL.yellow, 14);
      // protractor ring
      g.strokeStyle = PAL.dim;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(C.x, C.y, C.R, 0, Math.PI * 2);
      g.stroke();
      for (let s = DIAL.min; s < DIAL.max; s++) {
        const a = s * STEP;
        const big = s % 3 === 0;
        line(g, C.x + (C.R - (big ? 9 : 5)) * Math.cos(a), C.y - (C.R - (big ? 9 : 5)) * Math.sin(a), C.x + C.R * Math.cos(a), C.y - C.R * Math.sin(a), PAL.dim, big ? 2 : 1);
        if (s % 6 === 0) text(g, piText(s), C.x + (C.R + 26) * Math.cos(a), C.y - (C.R + 26) * Math.sin(a) + 4, PAL.dim, 10);
        else if (s % 3 === 0) text(g, piText(s), C.x + (C.R + 24) * Math.cos(a), C.y - (C.R + 24) * Math.sin(a) + 4, 'rgba(143,155,214,0.6)', 9);
      }
      if (r.assist <= 1 || shot) {
        g.globalAlpha = r.assist === 1 && !shot ? 0.3 : 0.55;
        g.strokeStyle = PAL.green;
        g.lineWidth = 8;
        g.beginPath();
        g.arc(C.x, C.y, C.R + 5, -r.range[1] * STEP, -r.range[0] * STEP);
        g.stroke();
        g.globalAlpha = 1;
      } else text(g, 'range shading off', 560, 70, PAL.dim, 11);
      dish(g, use * STEP);
      const aim = use * STEP;
      const beamLen = shot ? Math.min(150, rt * 220) : 0;
      if (shot) glow(g, shot.ok && rt > 0.7 ? PAL.green : PAL.yellow, 10, () => line(g, C.x, C.y, C.x + beamLen * Math.cos(aim), C.y - beamLen * Math.sin(aim), PAL.yellow, 3));
      if (shot && rt > 0.4) {
        const sx = C.x + 135 * Math.cos(r.ans * STEP);
        const sy = C.y - 135 * Math.sin(r.ans * STEP);
        g.fillStyle = shot.ok && rt > 0.8 ? PAL.green : PAL.pink;
        g.fillRect(sx - 9, sy - 5, 18, 10);
        line(g, sx - 17, sy, sx - 9, sy, PAL.white, 3);
        line(g, sx + 9, sy, sx + 17, sy, PAL.white, 3);
        text(g, 'satellite', sx, sy - 12, PAL.dim, 10);
      }
      beam(g, 90, 190, t, mood);
      if (!shot) text(g, 'the satellite is hidden until you send', 140, 300, PAL.dim, 11);
      if (shot && rt > VERDICT) verdict(g, shot.ok, 'SIGNAL RECEIVED', 'SIGNAL LOST');
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(3, ctx.level)), ctx.random) as never, 'A spark character beside a relay tower with a dish and a protractor ring, pointing the dish at the value of an inverse trigonometric expression.');
  },
});
