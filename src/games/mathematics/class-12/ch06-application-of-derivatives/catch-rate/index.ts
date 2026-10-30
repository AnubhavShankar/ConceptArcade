// Inspirations: Temple Run and Fruit Ninja (match your speed to the thing in front of you at the right instant) and Trials-style physics
// timing. Rhea runs the rescue crew's winch: set its speed w so that the quantity the rescue depends on changes at exactly the target rate.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { backdrop, cuboid, face, track, trackHandle, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { alarm, fuelDial, jar, lifeboat, night, queue, RIM, TARGET } from './harbour';
import { DIAL, FLOW, buildRounds, explain, flowEnd, intel, judge, missText, output, rateText, spotText, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const VERDICT = 1.7;

const HEROES = [
  { story: 'Rhea’s winch makes a size change at a steady rate, and the rescue depends on how fast the area or volume changes at that instant. A rate of area is the derivative of the area formula times the rate of the size: the chain rule through time.', objective: 'Set the winch speed w so the area or volume changes at exactly the target rate, in three rounds. The racing gauge shows in round 1; a test run costs a charge.' },
  { story: 'A ladder is leaning on a wall and the winch pulls one end. The ladder’s length does not change, so x² + y² is constant, and the two ends move at rates tied together by x·x′ + y·y′ = 0. The ratio of x and y at that instant is all that matters.', objective: 'Set the winch speed so the other end moves at the target rate, in three rounds. The gauge fades; a test run costs a charge.' },
  { story: 'Some relations come from similar triangles: a person’s shadow, or water in a cone whose radius is a fixed fraction of its depth. First use the shape to write the quantity with one variable, then differentiate with respect to time.', objective: 'Set the winch speed so the shadow or the volume changes at the target rate, in three rounds. The boss round has no gauge.' },
  { story: 'Rhea’s rescue base runs on a budget. Marginal cost is the cost of one more unit, C′(x). If units come at w per hour, money flows at C′(x)·w per hour.', objective: 'Set the rate w so the money flows at exactly the target, in three rounds.' },
];

/** Rhea: a rescue-crew operator in a hard hat and a hi-vis vest, her hand on a winch crank. */
function rhea(g: G, x: number, y: number, t: number, mood: Mood, w: number, clock: number) {
  g.fillStyle = '#3a4a7a';
  g.fillRect(x - 12, y - 4, 10, 28);
  g.fillRect(x + 2, y - 4, 10, 28);
  g.fillStyle = PAL.orange;
  g.fillRect(x - 15, y - 40, 30, 38);
  g.fillStyle = PAL.yellow;
  g.fillRect(x - 15, y - 28, 30, 5);
  g.fillStyle = '#f2c9a0';
  g.beginPath();
  g.arc(x, y - 52, 12, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = PAL.yellow;
  g.beginPath();
  g.arc(x, y - 55, 13, Math.PI, 2 * Math.PI);
  g.fill();
  g.fillRect(x - 15, y - 56, 30, 4);
  face(g, x, y - 50, 9, mood, t, '#1b1030');
  const wx = x + 48;
  const wy = y - 18;
  g.fillStyle = '#26305f';
  g.beginPath();
  g.arc(wx, wy, 20, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 2;
  g.stroke();
  const a = clock * w * 0.9;
  line(g, wx, wy, wx + Math.cos(a) * 20, wy + Math.sin(a) * 20, PAL.yellow, 3);
  line(g, x + 12, y - 28, wx + Math.cos(a) * 20, wy + Math.sin(a) * 20, '#d98a2b', 5);
}

/** What the running-costs scenes need: how full the meter is (0 to 1, the target line at TARGET) and the rate w the player set. */
interface Flow {
  frac: number;
  w: number;
}

function scene(g: G, r: Round, clock: number, flow: Flow) {
  const X = 450;
  switch (r.kind) {
    case 'cost': {
      night(g, clock);
      lifeboat(g, 380, 200, clock, flow.w / DIAL.max);
      fuelDial(g, 545, 165, 46, flow.frac, clock);
      if (flow.frac > RIM) alarm(g, 440, 108, clock);
      break;
    }
    case 'revenue': {
      night(g, clock);
      g.fillStyle = '#4a3a7a';
      g.fillRect(250, 236, 170, 8);
      queue(g, 285, 236, clock, flow.w, 510);
      jar(g, 510, 236, flow.frac, clock, '₹ pledges');
      if (flow.frac > RIM) alarm(g, 510, 100, clock);
      break;
    }
    case 'profit': {
      night(g, clock);
      lifeboat(g, 340, 202, clock, flow.w / DIAL.max, 0.75);
      for (let i = 0; i < 5; i++) {
        const u = (clock * (0.35 + (flow.w / DIAL.max) * 1.1) + i / 5) % 1;
        g.fillStyle = PAL.yellow;
        g.beginPath();
        g.arc(395 + 120 * u, 170 - Math.sin(u * Math.PI) * 40, 4, 0, Math.PI * 2);
        g.fill();
      }
      text(g, 'earns R(x), spends C(x)', 340, 258, PAL.white, 10);
      jar(g, 545, 236, flow.frac, clock, 'net funds ₹');
      if (flow.frac > RIM) alarm(g, 545, 100, clock);
      break;
    }
    case 'ripple': {
      const s = 9;
      for (let i = 0; i < 3; i++) {
        g.globalAlpha = 1 - i * 0.3;
        g.strokeStyle = PAL.cyan;
        g.lineWidth = 3;
        g.beginPath();
        g.arc(X, 160, Math.max(2, r.a * s - i * 14), 0, Math.PI * 2);
        g.stroke();
      }
      g.globalAlpha = 1;
      line(g, X, 160, X + r.a * s, 160, PAL.yellow, 2);
      text(g, `r = ${r.a} cm`, X + (r.a * s) / 2, 150, PAL.yellow, 12);
      break;
    }
    case 'cube': {
      const s = 24;
      cuboid(g, X - 40, 190, r.a * s, r.a * s, r.a * s, '#6f7fd0', false);
      text(g, `edge ${r.a} cm`, X, 232, PAL.yellow, 12);
      break;
    }
    case 'balloon': {
      const s = 30;
      g.fillStyle = PAL.pink;
      g.beginPath();
      g.arc(X, 150, r.a * s, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.4)';
      g.beginPath();
      g.arc(X - r.a * s * 0.35, 150 - r.a * s * 0.35, r.a * s * 0.2, 0, Math.PI * 2);
      g.fill();
      line(g, X, 150 + r.a * s, X - 8, 150 + r.a * s + 40, PAL.dim, 1.5);
      text(g, `r = ${r.a} cm`, X + r.a * s + 40, 150, PAL.yellow, 12);
      break;
    }
    case 'ladderFoot':
    case 'ladderTop': {
      const s = 180 / Math.max(r.a, r.b);
      const wallX = 320;
      const floor = 262;
      line(g, wallX, 60, wallX, floor, PAL.dim, 5);
      line(g, wallX, floor, 600, floor, PAL.dim, 4);
      const fx = wallX + r.a * s;
      const ty = floor - r.b * s;
      glowLine(g, fx, floor, wallX, ty);
      g.fillStyle = PAL.yellow;
      g.beginPath();
      g.arc(wallX + (fx - wallX) * 0.3, ty + (floor - ty) * 0.7, 6, 0, Math.PI * 2);
      g.fill();
      text(g, `${r.a} m`, (wallX + fx) / 2, floor + 16, PAL.yellow, 12);
      text(g, `${r.b} m`, wallX - 30, (floor + ty) / 2, PAL.yellow, 12);
      break;
    }
    case 'shadow': {
      const s = 200 / r.a;
      const floor = 262;
      const lampX = 300;
      const d = r.a * 1.1;
      const px = lampX + d * s;
      line(g, lampX, floor, lampX, floor - r.a * s, PAL.dim, 5);
      g.fillStyle = PAL.yellow;
      g.beginPath();
      g.arc(lampX + 4, floor - r.a * s, 7, 0, Math.PI * 2);
      g.fill();
      const tip = d + (d * r.b) / (r.a - r.b);
      line(g, lampX, floor, 600, floor, PAL.dim, 3);
      line(g, lampX + 4, floor - r.a * s, lampX + tip * s, floor, 'rgba(255,210,63,0.5)', 1.5, [4, 4]);
      line(g, px, floor, px, floor - r.b * s, PAL.cyan, 6);
      g.fillStyle = PAL.cyan;
      g.beginPath();
      g.arc(px, floor - r.b * s - 6, 7, 0, Math.PI * 2);
      g.fill();
      line(g, px, floor + 6, lampX + tip * s, floor + 6, PAL.pink, 5);
      text(g, 'shadow', (px + lampX + tip * s) / 2, floor + 24, PAL.pink, 12);
      text(g, `${r.a} m lamp, ${r.b} m person`, 480, 70, PAL.yellow, 12);
      break;
    }
    case 'coneHalf':
    case 'coneThird': {
      const d = r.kind === 'coneHalf' ? 2 : 3;
      const H = 190;
      const W = H / d / 1.0 * 0.5 * 2;
      const apexY = 262;
      const topY = apexY - H;
      g.strokeStyle = PAL.dim;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(X, apexY);
      g.lineTo(X - W / 2, topY);
      g.moveTo(X, apexY);
      g.lineTo(X + W / 2, topY);
      g.stroke();
      const dep = (r.a / 12) * H;
      const hw = ((dep / H) * W) / 2;
      g.fillStyle = 'rgba(77,225,255,0.6)';
      g.beginPath();
      g.moveTo(X, apexY);
      g.lineTo(X - hw, apexY - dep);
      g.lineTo(X + hw, apexY - dep);
      g.fill();
      text(g, `depth ${r.a} cm`, X + W / 2 + 54, apexY - dep, PAL.yellow, 12);
      void clock;
      break;
    }
  }
}
function glowLine(g: G, x1: number, y1: number, x2: number, y2: number) {
  line(g, x1, y1, x2, y2, '#b88a4a', 6);
  line(g, x1, y1, x2, y2, PAL.yellow, 1.5);
}

function level(n: number, random: () => number): DialLevel<Round> {
  const hero = HEROES[n - 1];
  const budget = n === 4;
  return {
    hero: { name: 'Rhea', role: budget ? 'a rescue-base operator whose budget must flow at the right rate' : 'a rescue-crew operator who runs a winch whose speed changes a size, an angle or a length', story: hero.story, objective: hero.objective },
    rounds: buildRounds(n, random),
    charges: [1, 1, 0],
    dials: [{ key: 'w', aria: budget ? 'Rate w' : 'Winch speed w', label: budget ? 'Rate w' : 'Winch speed w', unit: budget ? '' : 'per second', step: 1, min: DIAL.min, max: DIAL.max, start: DIAL.min, text: (v) => `${v}` }],
    handles: [trackHandle('w', () => DIAL.min, () => DIAL.max)],
    test: { button: '🔧 Test run', aria: budget ? 'Test run: read the money rate at this setting' : 'Test run: read the result rate at this winch speed', read: (r, v) => spotText(r, v.w) },
    fire: budget ? { button: '⛵ Start the run', aria: 'Start the run' } : { button: '🪢 Run the winch', aria: 'Run the winch' },
    judge: (r, v) => judge(r, v.w),
    miss: (r, v) => missText(r, v.w),
    win: (r) => `${budget ? 'Funded on time!' : 'Rescued on time!'} ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The racing gauge is on.' : r.assist === 1 ? 'The gauge is dim: a test run costs a charge.' : 'Boss round: no gauge, no test run.'}`,
    hit: () => [450, 150],
    delay: VERDICT,
    draw: ({ g, r, v, t, rt, shot }) => {
      backdrop(g);
      const w = v.w;
      const out = output(r, w);
      const mood: Mood = shot ? (rt > VERDICT ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      const clock = shot ? rt : t;
      rhea(g, 90, 200, t, mood, w, clock);
      // Running costs: a meter that ends at the target line, short of it or over the rim; a miss shows only the side, never how far.
      let frac = 0;
      if (budget && shot) frac = TARGET * flowEnd(r, w) * Math.min(1, rt / 1.2);
      else if (budget && r.assist === 0) frac = TARGET * Math.min(FLOW.over, out / r.target) * ((clock * 0.5) % 1);
      scene(g, r, clock, { frac, w });
      text(g, r.scene, 330, budget ? 22 : 30, PAL.white, 11);
      if (budget) text(g, r.fnText ?? '', 330, 38, PAL.white, 12);
      text(g, `target ${rateText(r, r.target)}`, 330, budget ? 56 : 48, PAL.yellow, 13);
      const live = r.assist === 0 || shot !== null;
      if (live || r.assist === 1) {
        g.globalAlpha = live ? 1 : 0.3;
        const prog = (clock * 0.5) % 1;
        const mine = Math.min(1.15, (shot ? flowEnd(r, w) : out / r.target) * prog);
        g.fillStyle = 'rgba(255,255,255,0.1)';
        g.fillRect(100, 272, 440, 8);
        g.fillRect(100, 286, 440, 8);
        g.fillStyle = PAL.yellow;
        g.fillRect(100, 272, 440 * prog, 8);
        g.fillStyle = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.cyan;
        g.fillRect(100, 286, 440 * Math.min(1, mine), 8);
        text(g, 'target', 70, 280, PAL.yellow, 10, 'right');
        text(g, 'you', 70, 294, PAL.cyan, 10, 'right');
        g.globalAlpha = 1;
      } else text(g, 'gauge off', 320, 286, PAL.dim, 12);
      track(g, DIAL.min, DIAL.max);
      if (shot && rt > VERDICT) verdict(g, shot.ok, budget ? 'FUNDED ON TIME' : 'RESCUED ON TIME', 'WRONG RATE');
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(4, ctx.level)), ctx.random) as never, 'A rescue operator at a winch beside a geometric scene such as a ladder, a ripple or a cone, with a target rate to match.');
  },
});
