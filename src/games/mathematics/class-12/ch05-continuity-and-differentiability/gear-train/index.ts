// Inspirations: The Incredible Machine and Factorio (a chain of linked parts whose speed you set at one end and watch at the
// other). Cog is a clockwork robot at a hand crank: set the crank speed w so the last gear turns at the dispatch rate.
import { helperOn, paidFlash } from '@core/aidflash';
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { TRACK, backdrop, face, gear, track, trackHandle, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { goalLine, grip, tint } from './ux';
import { DIAL, buildRounds, explain, flowEnd, intel, judge, missText, output, rateText, spotText, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const VERDICT = 1.6;

const HEROES = [
  { story: 'The dispatch bell of the clockwork city rings at an exact rate, and Cog’s machine has to turn its last gear at that rate. Each stage is a layer of one function: the output rate is the derivative times the crank rate, and for layers inside layers the derivatives multiply (the chain rule).', objective: 'Set the crank speed w so the output gear turns at the dispatch rate, in three rounds. The ghost gear shows the target speed in round 1; a test run costs a charge.' },
  { story: 'Some stages are exponentials and logarithms. Their output rates come out in units of e raised to a power, or of ln a, because the derivative of e^g is g′e^g and of a^g is a^g (ln a) g′. The dispatch bell counts in those units.', objective: 'Set the crank speed so the output hits the target rate, in three rounds. The ghost fades and a test run costs a charge.' },
  { story: 'Now the machine drives a bead or a drone along a curve that is not given as y = f(x). On a curve like x² + y² = r² the slope comes from differentiating both sides at once (implicit); on x = at², y = bt³ it is (dy/dt)/(dx/dt). The crank sets how fast x moves.', objective: 'Set the crank speed so that y moves at the target rate, in three rounds. Read the slope from the point, not from the picture.' },
  { story: 'A steady crank moves x at a constant speed w, but y = f(x) bends, so y accelerates. The acceleration of y is the second derivative times w², and w only counts once it is squared.', objective: 'Set the crank speed so that the output gear’s acceleration matches the target, in three rounds.' },
  { story: 'These machines have wave stages: sines, cosines and tangents of an inner function. The chain rule peels them from the outside in, and the special angles make the slope a clean number.', objective: 'Set the crank speed so the output gear hits the target rate, in three rounds.' },
];
const FIRE = [
  { button: '⚙️ Start the machine', aria: 'Start the machine' },
  { button: '⚙️ Start the machine', aria: 'Start the machine' },
  { button: '⚙️ Start the machine', aria: 'Start the machine' },
  { button: '⚙️ Start the machine', aria: 'Start the machine' },
  { button: '⚙️ Start the machine', aria: 'Start the machine' },
];

/** A small cam (a disc with an off-centre pin) on the input side that traces a wave: the stage is a sine, cosine or tangent. */
function cam(g: G, x: number, y: number, angle: number) {
  g.fillStyle = '#4a3a7a';
  g.beginPath();
  g.arc(x, y, 14, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1.5;
  g.stroke();
  const px = x + Math.cos(angle) * 8;
  const py = y + Math.sin(angle) * 8;
  g.fillStyle = PAL.yellow;
  g.beginPath();
  g.arc(px, py, 3.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = PAL.dim;
  g.beginPath();
  g.arc(x, y, 2, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  for (let i = 0; i <= 12; i++) g.lineTo(x + 24 + i * 6, y + Math.sin(angle - i * 0.7) * 8);
  g.strokeStyle = 'rgba(77,225,255,0.6)';
  g.lineWidth = 1.5;
  g.stroke();
}

/** Cog: a clockwork robot with a gear for a head, an antenna and an arm on the crank. */
function cog(g: G, x: number, y: number, t: number, mood: Mood, crank: number) {
  g.fillStyle = '#4a3a7a';
  g.fillRect(x - 24, y - 10, 48, 50);
  g.strokeStyle = PAL.orange;
  g.lineWidth = 1.5;
  g.strokeRect(x - 24, y - 10, 48, 50);
  g.fillStyle = PAL.orange;
  for (let i = 0; i < 3; i++) g.fillRect(x - 14 + i * 12, y + 22, 6, 6);
  gear(g, x, y - 26, 20, 8, t * 0.4, '#8f9bd6');
  g.fillStyle = '#0a1030';
  g.beginPath();
  g.arc(x, y - 26, 13, 0, Math.PI * 2);
  g.fill();
  face(g, x, y - 26, 13, mood, t, PAL.cyan);
  line(g, x, y - 46, x - 6, y - 58, PAL.dim, 2);
  g.fillStyle = PAL.red;
  g.beginPath();
  g.arc(x - 6, y - 59, 3, 0, Math.PI * 2);
  g.fill();
  const hx = x + 50 + Math.cos(crank) * 14;
  const hy = y + 10 + Math.sin(crank) * 14;
  line(g, x + 22, y + 6, hx, hy, '#4a3a7a', 6);
  g.fillStyle = PAL.yellow;
  g.beginPath();
  g.arc(hx, hy, 5, 0, Math.PI * 2);
  g.fill();
  line(g, x - 14, y + 40, x - 14, y + 52, PAL.dim, 4);
  line(g, x + 14, y + 40, x + 14, y + 52, PAL.dim, 4);
}

function level(n: number, random: () => number): DialLevel<Round> {
  const hero = HEROES[n - 1];
  const flash = paidFlash();
  return {
    hero: { name: 'Cog', role: 'a clockwork robot who runs the dispatch machine of the city', story: hero.story, objective: hero.objective },
    rounds: buildRounds(n, random),
    charges: [1, 1, 0],
    dials: [{ key: 'w', aria: 'Crank speed w', label: 'Crank speed w', unit: 'per second', step: 1, min: DIAL.min, max: DIAL.max, start: DIAL.min, text: (v) => `${v}` }],
    handles: [trackHandle('w', () => DIAL.min, () => DIAL.max)],
    test: { button: '🔧 Test run', aria: 'Test run: read the output at this crank speed', read: (r, v) => (flash.paid(), spotText(r, v.w)) },
    fire: FIRE[n - 1],
    judge: (r, v) => judge(r, v.w),
    miss: (r, v) => missText(r, v.w),
    win: (r) => `Dispatched! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The ghost gear and the live reading are on.' : r.assist === 1 ? 'The ghost and the reading show for a moment after a test run, which costs a charge.' : 'Boss round: no ghost, no reading, no test run.'}`,
    hit: () => [440, 140],
    delay: VERDICT,
    draw: ({ g, r, v, t, rt, shot, k, A }) => {
      backdrop(g);
      tint(g, k, t);
      const w = v.w;
      const out = output(r, w);
      // The helper (the ghost ring and the output reading) is live in round 1, shows for 1.5 s after a paid test run in round 2, never in round 3.
      const helper = helperOn(r.assist, shot?.ok === true, shot ? Infinity : flash.since(t, k));
      A.canvas.dataset.helper = helper ? '1' : '0';
      const mood: Mood = shot ? (rt > VERDICT ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      const spin = (w / DIAL.max) * 4;
      // Without the helper the output gear turns by the crank alone: its speed against the target would otherwise read out the answer.
      const outSpin = (shot ? flowEnd(r, w) : helper ? out / r.target : w / DIAL.max) * 1.6;
      const clock = shot ? rt : t;
      cog(g, 78, 130, t, mood, clock * spin * 2);
      gear(g, 200, 120, 38, 10, clock * spin, '#6f7fd0');
      gear(g, 275, 150, 28, 8, -clock * spin * 1.4 + 0.2, '#8f9bd6');
      gear(g, 380, 140, 46, 12, clock * outSpin, shot && rt > VERDICT ? (shot.ok ? PAL.green : PAL.red) : '#6f7fd0');
      line(g, 238, 126, 252, 142, PAL.dim, 2);
      line(g, 300, 146, 336, 144, PAL.dim, 2);
      text(g, r.kind === 'trig' ? '∿ output' : 'output', 380, 204, r.kind === 'trig' ? PAL.yellow : PAL.dim, 12);
      if (r.kind === 'trig') {
        text(g, '∿', 380, 142, PAL.yellow, 22);
        line(g, 170, 64, 188, 88, PAL.dim, 2);
        cam(g, 170, 50, clock * spin * 2);
      }
      if (helper && !shot) {
        g.globalAlpha = 0.9;
        g.strokeStyle = PAL.yellow;
        g.lineWidth = 2;
        g.setLineDash?.([6, 5]);
        g.beginPath();
        g.arc(380, 140, 58, clock * 1.6, clock * 1.6 + Math.PI * 1.5);
        g.stroke();
        g.setLineDash?.([]);
        g.globalAlpha = 1;
      }
      text(g, `target ${rateText(r, r.target)}`, 470, 70, PAL.yellow, 13, 'center');
      if (shot && !shot.ok) text(g, out < r.target ? 'output ⬇ too slow' : 'output ⬆ too fast', 320, 288, PAL.cyan, 14);
      else if (helper) text(g, `output ${rateText(r, out)}`, 320, 288, PAL.cyan, 14);
      else text(g, r.assist === 2 ? 'reading off' : 'reading off: a test run shows it', 320, 288, PAL.dim, 12);
      if (shot && !shot.ok && rt > 0.6) {
        for (let i = 0; i < 5; i++) {
          g.fillStyle = 'rgba(180,180,200,0.4)';
          g.beginPath();
          g.arc(380 + Math.sin(rt * 8 + i) * 8, 90 - ((rt * 40 + i * 12) % 50), 5 + i, 0, Math.PI * 2);
          g.fill();
        }
      }
      track(g, DIAL.min, DIAL.max);
      if (!shot) {
        const hx = TRACK.x0 + ((w - DIAL.min) / (DIAL.max - DIAL.min)) * (TRACK.x1 - TRACK.x0);
        grip(g, A.canvas, t, { x: hx, y: TRACK.y, r: 20, dir: 'h', read: `crank w = ${w} per s`, side: hx > 400 ? 'left' : 'right', cue: n === 1 && k === 0 });
      }
      goalLine(g, 'Goal: set w so the last gear turns at the target rate', A.t, shot !== null);
      if (shot && rt > VERDICT) verdict(g, shot.ok, 'DISPATCHED ON TIME', 'MISSED THE WINDOW');
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(5, ctx.level)), ctx.random) as never, 'A clockwork robot turning a hand crank that drives a chain of gears, with a target rate for the last gear.');
  },
});
