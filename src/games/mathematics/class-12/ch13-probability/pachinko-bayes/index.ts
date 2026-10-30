// Inspirations: Plinko and pachinko (balls fall through gates into trays) and the natural-frequency way of seeing Bayes: out of 60 balls, count them. Bounce is a
// pachinko ball with a face. Chances become counts of balls, so total probability and Bayes' theorem are counting, and the exact fraction is the answer.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { backdrop, face, num, track, trackHandle, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { buildRounds, explain, frac, intel, judge, missText, spotText, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const RUN = 2.2;
const Y = { spawn: 66, gate: 128, tray: 276 };

const HEROES = [
  { story: 'Sixty balls drop through two gates. Each gate takes a share of the balls and sends a fraction of its own balls to the red tray. Turn the fractions into counts of balls: the red balls from each gate add up, and the total divided by 60 is P(red) by the theorem of total probability.', objective: 'Set the number of balls that land red in all, in three rounds. The counts per gate show in round 1, dim in round 2 and are gone in the boss round.' },
  { story: 'Now a ball has landed red, and the question is which gate it came through. Count the red balls from the gate asked about and the red balls in all: the chance is the first count out of the second. This is Bayes’ theorem, done by counting. Do not reduce the fraction: the counts themselves are the answer.', objective: 'Set the count from the gate and the total count of red landings, in three rounds. The counts per gate show in round 1; a check costs a charge later.' },
  { story: 'Three gates, one red landing: which gate did it come through? The method is the same: count the red balls per gate, add them for the total, and put the asked gate’s count over it.', objective: 'Set the count from the gate and the total red landings, in three rounds. The boss round has no counts shown.' },
];

/** Bounce: a silver pachinko ball with a face, little sneakers and arms that go up when the drop pays off. */
function bounce(g: G, x: number, y: number, t: number, mood: Mood) {
  const hop = Math.abs(Math.sin(t * 3)) * (mood === 'cheer' ? 12 : 4);
  const yy = y - hop;
  g.fillStyle = PAL.white;
  g.fillRect(x - 12, y + 12, 10, 5);
  g.fillRect(x + 3, y + 12, 10, 5);
  g.fillStyle = '#cfd8ff';
  g.beginPath();
  g.arc(x, yy, 17, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.beginPath();
  g.arc(x - 6, yy - 7, 5, 0, Math.PI * 2);
  g.fill();
  face(g, x, yy + 1, 11, mood, t, '#1b1030');
  const up = mood === 'cheer' ? -10 : 6;
  line(g, x - 16, yy + 2, x - 26, yy + up, '#cfd8ff', 4);
  line(g, x + 16, yy + 2, x + 26, yy + up, '#cfd8ff', 4);
}

function level(n: number, random: () => number): DialLevel<Round> {
  const hero = HEROES[n - 1];
  const rounds = buildRounds(n, random);
  const keys = n === 1 ? ['t'] : ['a', 't'];
  const gx = (r: Round, i: number) => (r.gates.length === 2 ? [230, 410][i] : [150, 320, 490][i]);
  return {
    hero: { name: 'Bounce', role: 'a pachinko ball who drops sixty balls through gates and counts where they land', story: hero.story, objective: hero.objective },
    rounds,
    charges: [1, 1, 0],
    dials: keys.map((k) => ({ key: k, aria: n === 1 ? 'Number of red landings' : k === 'a' ? 'Red landings from the asked gate' : 'Total red landings', label: n === 1 ? 'Red in all' : k === 'a' ? 'From the gate' : 'Red in all', unit: '', step: 1, min: 0, max: (r: Round) => r.max, start: 0, text: (v: number) => `${v} balls` })),
    handles: [trackHandle<Round>(keys[0], () => 0, (r) => r.max)],
    test: { button: '🎯 Check', aria: 'Check: see what these counts mean as a chance', read: (r, v) => spotText(r, keys.map((k) => v[k])) },
    fire: { button: '⚪ Drop the balls', aria: 'Drop the balls' },
    judge: (r, v) => judge(r, keys.map((k) => v[k])),
    miss: (r, v) => missText(r, keys.map((k) => v[k])),
    win: (r) => `Counted right! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The counts per gate are shown.' : r.assist === 1 ? 'The counts are dim: a check costs a charge.' : 'Boss round: no counts, no check.'}`,
    hit: () => [320, 220],
    delay: RUN,
    draw: ({ g, r, v, t, rt, shot }) => {
      backdrop(g);
      const show = r.assist <= 1;
      const dim = r.assist === 1;
      // The pegs
      for (let row = 0; row < 5; row++) for (let c = 0; c < 11 + (row % 2); c++) {
        g.fillStyle = PAL.dim;
        g.beginPath();
        g.arc(110 + c * 42 + (row % 2) * 21, 160 + row * 20, 2.5, 0, Math.PI * 2);
        g.fill();
      }
      // The gates and trays
      r.gates.forEach((gt, i) => {
        const x = gx(r, i);
        g.strokeStyle = PAL.pink;
        g.lineWidth = 3;
        g.strokeRect(x - 34, Y.gate - 16, 68, 32);
        text(g, `gate ${gt.name}`, x, Y.gate + 4, PAL.pink, 13);
        text(g, `takes ${frac(gt.n, r.N)} · red ${frac(gt.red, gt.n)}`, x, Y.gate - 24, PAL.white, 10);
        if (show) {
          g.globalAlpha = dim ? 0.3 : 1;
          text(g, `${gt.n} balls, ${gt.red} red`, x, Y.gate + 30, PAL.yellow, 11);
          g.globalAlpha = 1;
        }
        g.strokeStyle = PAL.red;
        g.lineWidth = 2;
        g.strokeRect(x - 34, Y.tray - 4, 32, 40);
        g.strokeStyle = PAL.cyan;
        g.strokeRect(x + 2, Y.tray - 4, 32, 40);
      });
      // The balls
      const tally = r.gates.map(() => [0, 0]);
      if (shot) {
        let index = 0;
        const jobs: { gate: number; red: boolean }[] = [];
        r.gates.forEach((gt, i) => {
          for (let k = 0; k < gt.n; k++) jobs.push({ gate: i, red: k < gt.red });
        });
        // spread the gates and colours so the stream looks mixed
        jobs.sort((p, q) => ((p.gate * 7 + (p.red ? 3 : 0)) % 11) - ((q.gate * 7 + (q.red ? 3 : 0)) % 11));
        for (const j of jobs) {
          const t0 = index * 0.02;
          index++;
          const p = (rt - t0) / 1.0;
          if (p < 0) continue;
          const x0 = 320;
          const xg = gx(r, j.gate);
          const xt = xg + (j.red ? -18 : 18);
          const k = tally[j.gate][j.red ? 0 : 1];
          const yEnd = Y.tray + 30 - Math.floor(k / 5) * 5;
          const xEnd = xt - 10 + (k % 5) * 5;
          let bx: number;
          let by: number;
          if (p < 0.4) {
            bx = x0 + (xg - x0) * (p / 0.4);
            by = Y.spawn + (Y.gate - Y.spawn) * (p / 0.4);
          } else if (p < 1) {
            const q = (p - 0.4) / 0.6;
            bx = xg + (xEnd - xg) * q + Math.sin(q * 12 + index) * 6 * (1 - q);
            by = Y.gate + (yEnd - Y.gate) * q;
          } else {
            bx = xEnd;
            by = yEnd;
            tally[j.gate][j.red ? 0 : 1]++;
          }
          g.fillStyle = j.red ? PAL.red : PAL.cyan;
          g.beginPath();
          g.arc(bx, by, 3, 0, Math.PI * 2);
          g.fill();
        }
        r.gates.forEach((_gt, i) => {
          text(g, String(tally[i][0]), gx(r, i) - 18, Y.tray + 54, PAL.red, 12);
          text(g, String(tally[i][1]), gx(r, i) + 18, Y.tray + 54, PAL.cyan, 12);
        });
        const redNow = tally.reduce((s, tt) => s + tt[0], 0);
        text(g, `red so far: ${redNow}`, 560, 40, PAL.red, 12);
      }
      // The player's counts
      const mine = keys.map((k) => v[k]);
      text(g, n === 1 ? `your count: ${mine[0]} red of ${r.N}` : `your count: ${mine[0]} of ${mine[1]} red landings`, 500, 300, PAL.yellow, 12);
      // The dispenser and Bounce
      g.fillStyle = PAL.dim;
      g.fillRect(300, Y.spawn - 22, 40, 20);
      const mood: Mood = shot ? (rt > RUN - 0.3 ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      bounce(g, 50, 300, t, mood);
      track(g, 0, r.max);
      if (shot && rt > RUN - 0.2) verdict(g, shot.ok, 'COUNTED RIGHT', 'THE COUNTS WERE OFF');
      void num;
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(3, ctx.level)), ctx.random) as never, 'A pachinko ball and a board where sixty balls fall through two or three gates into red and blue trays, to be counted.');
  },
});
