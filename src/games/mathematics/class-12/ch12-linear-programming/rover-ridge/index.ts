// Inspirations: Mars rover missions and Lunar Lander (a craft that can only work on a fenced patch of ground) and the sliding-ruler picture of linear
// programming. Rover is a mining rover on a plateau fenced by cliffs. The player slides the ore ruler Z = a·x + b·y across the map and stops it where the
// plateau only just touches it: that is the richest (or poorest) ground, and it is always at a corner.
import { helperOn, paidFlash } from '@core/aidflash';
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type HandleSpec } from '@core/dialgame';
import { TRACK, backdrop, num, track, trackHandle, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { rover, type Mood } from './art';
import { mountOpen } from './open';
import { goalLine, grip, tint } from './ux';
import { HIT_MAP, buildRounds, explain, intel, judge, missText, ore, ruler, spotText, type Pt, type Round } from './logic';

const M = { x: 200, y: 288, u: 22 };
const RUN = 1.9;
const X = (x: number) => M.x + x * M.u;
const Y = (y: number) => M.y - y * M.u;

const HEROES = [
  { story: 'The plateau is the region where every inequality holds. The ore map is Z = ax + by. Slide the ruler line Z = z across the map: the last place the plateau touches it is a corner, and that corner has the largest Z. So the best Z is the biggest of the values at the corners.', objective: 'Park the ruler at the largest Z the plateau touches, in three rounds. The corners and the ruler show in round 1; a probe costs a charge.' },
  { story: 'The ore map can now have a minus sign, so the ground gets richer in a different direction, and sometimes the poorest ground is wanted. Still the answer is at a corner: work out the corners, find Z at each, and take the largest or smallest as asked.', objective: 'Park the ruler at the Z asked for (largest or smallest), in three rounds. The corners are dim in round 2; a probe costs a charge.' },
  { story: 'A bigger plateau has more corners and a mixed-sign ore map, so the obvious corner is often wrong. The boss round hides the plateau: use the inequalities to find where pairs of edges meet, then compare Z at every corner.', objective: 'Park the ruler at the Z asked for. The boss round shows no plateau and no probe: the cliffs only appear once Rover parks at the right Z.' },
  { story: 'Out on the open plains the plateau runs off the edge of the map. The least ore can still be at a corner, but the most may never end. And sometimes the cliffs leave no ground at all.', objective: 'Park at the best Z, or declare no maximum or no plateau, in three rounds.' },
  { story: 'Some ridges are level: the ore ruler lies flat along a whole edge of the plateau, so every point on that edge is just as rich.', objective: 'Park at the best Z and say whether it is one corner or a whole edge, in three rounds.' },
];

/** Where the ruler line is anchored: the middle of its visible stretch in the 0..10 map box. */
function anchor(r: Round, z: number): Pt {
  const hits: Pt[] = [];
  const { a, b } = r;
  for (const x of [0, 10]) if (b !== 0) {
    const y = (z - a * x) / b;
    if (y >= 0 && y <= 10) hits.push([x, y]);
  }
  for (const y of [0, 10]) if (a !== 0) {
    const x = (z - b * y) / a;
    if (x >= 0 && x <= 10) hits.push([x, y]);
  }
  if (hits.length >= 2) return [(hits[0][0] + hits[hits.length - 1][0]) / 2, (hits[0][1] + hits[hits.length - 1][1]) / 2];
  return [Math.max(0, Math.min(10, 5)), Math.max(0, Math.min(10, 5))];
}

/** The two ends of the ruler's chord across the plateau, or null when it misses. */
function chord(r: Round, z: number): [Pt, Pt] | null {
  const ends: Pt[] = [];
  r.corners.forEach((p, i) => {
    const q = r.corners[(i + 1) % r.corners.length];
    const zp = ore(r, p) - z;
    const zq = ore(r, q) - z;
    if (zp === 0) ends.push(p);
    if (zp * zq < 0) {
      const s = zp / (zp - zq);
      ends.push([p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s]);
    }
  });
  return ends.length >= 2 ? [ends[0], ends[ends.length - 1]] : ends.length === 1 ? [ends[0], ends[0]] : null;
}

function level(n: number, random: () => number): DialLevel<Round> {
  const hero = HEROES[n - 1];
  const rounds = buildRounds(n, random);
  const flash = paidFlash();
  const handle: HandleSpec<Round> = {
    dial: 'z',
    at: (r, v) => {
      const [x, y] = anchor(r, v.z);
      return [X(x), Y(y)];
    },
    drag: (r, px, py) => r.a * Math.max(0, Math.min(10, (px - M.x) / M.u)) + r.b * Math.max(0, Math.min(10, (M.y - py) / M.u)),
    radius: 22,
  };
  return {
    hero: { name: 'Rover', role: 'a mining rover who parks at the richest corner of a fenced plateau', story: hero.story, objective: hero.objective },
    rounds,
    charges: [1, 1, 0],
    dials: [{ key: 'z', aria: 'Ruler setting Z', label: 'Ruler Z', unit: '', step: 1, min: (r: Round) => r.min, max: (r: Round) => r.max, start: (r: Round) => r.start, text: (v: number) => `Z = ${num(v)}` }],
    handles: [handle, trackHandle<Round>('z', (r) => r.min, (r) => r.max)],
    test: { button: '📡 Probe', aria: 'Probe: see how the ruler sits at this Z', read: (r, v) => (flash.paid(), spotText(r, v.z)) },
    fire: { button: '🚙 Send the rover', aria: 'Send the rover' },
    judge: (r, v) => judge(r, v.z),
    miss: (r, v) => missText(r, v.z),
    win: (r) => `Ore found! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The plateau and its corners are drawn.' : r.assist === 1 ? 'The plateau shows for a moment after a probe, and a probe costs a charge.' : 'Boss round: no plateau, no probe.'}`,
    hit: () => [X(HIT_MAP[0]), Y(HIT_MAP[1])],
    delay: RUN,
    draw: ({ g, r, v, t, rt, shot, k, A }) => {
      backdrop(g);
      tint(g, k, t);
      const z = shot ? shot.v.z : v.z;
      // The plateau is the helper: live in round 1, a moment after a paid probe in round 2, never in round 3, and always after a win.
      const helper = helperOn(r.assist, shot?.ok === true, shot ? Infinity : flash.since(t, k));
      A.canvas.dataset.helper = helper ? '1' : '0';
      // The map
      line(g, X(0), Y(0), X(10), Y(0), PAL.dim, 1.5);
      line(g, X(0), Y(0), X(0), Y(10), PAL.dim, 1.5);
      for (let i = 0; i <= 10; i += 2) {
        line(g, X(i), Y(0), X(i), Y(10), PAL.grid, 1);
        line(g, X(0), Y(i), X(10), Y(i), PAL.grid, 1);
        text(g, String(i), X(i), Y(0) + 13, PAL.dim, 9);
        if (i > 0) text(g, String(i), X(0) - 10, Y(i) + 3, PAL.dim, 9);
      }
      // a missed drive in round 2 or 3 must not draw the hidden plateau before the replay
      if (helper) {
        g.globalAlpha = 1;
        g.fillStyle = 'rgba(160,110,60,0.55)';
        g.strokeStyle = PAL.orange;
        g.lineWidth = 3;
        g.beginPath();
        r.corners.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))));
        g.closePath();
        g.fill();
        g.stroke();
        if (r.assist === 0 || (shot && shot.ok)) for (const p of r.corners) {
          g.fillStyle = PAL.yellow;
          g.beginPath();
          g.arc(X(p[0]), Y(p[1]), 4, 0, Math.PI * 2);
          g.fill();
          text(g, `(${num(p[0])}, ${num(p[1])})`, X(p[0]) + 6, Y(p[1]) - 8, PAL.yellow, 10, 'left');
        }
        g.globalAlpha = 1;
      } else text(g, 'the plateau is hidden: use the inequalities', X(5), Y(5), PAL.dim, 12);
      // The ruler line Z = z across the map box
      const ends: Pt[] = [];
      for (const x of [0, 10]) if (r.b !== 0) {
        const y = (z - r.a * x) / r.b;
        if (y >= 0 && y <= 10) ends.push([x, y]);
      }
      for (const y of [0, 10]) if (r.a !== 0) {
        const x = (z - r.b * y) / r.a;
        if (x >= 0 && x <= 10) ends.push([x, y]);
      }
      const st = ruler(r, z);
      const color = shot && rt > 1.0 ? (shot.ok ? PAL.green : PAL.red) : PAL.cyan;
      if (ends.length >= 2) line(g, X(ends[0][0]), Y(ends[0][1]), X(ends[1][0]), Y(ends[1][1]), color, 3);
      if (r.assist === 0 && !shot) text(g, `ruler ${st}`, 560, 40, st === 'touches' ? PAL.green : PAL.yellow, 12);
      text(g, `Z = ${num(z)}`, 560, 22, PAL.yellow, 13);
      text(g, `ore Z = ${num(r.a)}x ${r.b < 0 ? '−' : '+'} ${Math.abs(r.b)}y: want the ${r.goal === 'max' ? 'LARGEST' : 'SMALLEST'}`, 480, 58, PAL.green, 11);
      r.constraints.forEach((c, i) => text(g, c, 560, 84 + i * 16, PAL.dim, 11));
      // The rover drives to where the ruler meets the plateau
      let spot: Pt = [0.6, 0.6];
      if (shot) {
        const ch = chord(r, z);
        spot = ch ? [(ch[0][0] + ch[1][0]) / 2, (ch[0][1] + ch[1][1]) / 2] : [r.corners.reduce((s, p) => s + p[0], 0) / r.corners.length, r.corners.reduce((s, p) => s + p[1], 0) / r.corners.length];
        const p = Math.min(1, rt / (RUN - 0.5));
        spot = [0.6 + (spot[0] - 0.6) * p, 0.6 + (spot[1] - 0.6) * p];
      }
      const mood: Mood = shot ? (rt > RUN - 0.5 ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      rover(g, X(spot[0]), Y(spot[1]) - 6, t, mood, shot !== null && rt < RUN - 0.5);
      track(g, r.min, r.max);
      if (!shot) {
        // the two handles of the one dial: the ruler on the map and the knob on the track, with the player's own Z beside the knob
        const [mx, my] = anchor(r, z);
        const hx = TRACK.x0 + ((z - r.min) / (r.max - r.min)) * (TRACK.x1 - TRACK.x0);
        grip(g, A.canvas, t, { x: X(mx), y: Y(my), r: 22, dir: 'both', read: '', side: 'right', cue: n === 1 && k === 0 });
        grip(g, A.canvas, t, { x: hx, y: TRACK.y, r: 20, dir: 'h', read: `Z = ${num(z)} ore`, side: hx > 450 ? 'left' : 'right', cue: n === 1 && k === 0 });
      }
      goalLine(g, `Goal: park at the ${r.goal === 'max' ? 'LARGEST' : 'SMALLEST'} Z the plateau touches`, A.t, shot !== null);
      if (shot && rt > RUN - 0.4) verdict(g, shot.ok, 'RICHEST GROUND FOUND', st === 'misses' ? 'NO GROUND THERE' : 'BETTER GROUND LEFT');
    },
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(5, ctx.level));
    if (n >= 4) return mountOpen(ctx, n as 4 | 5, HEROES[n - 1]);
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, 'A mining rover on a fenced plateau with an ore ruler that slides across the map to the best corner.');
  },
});
