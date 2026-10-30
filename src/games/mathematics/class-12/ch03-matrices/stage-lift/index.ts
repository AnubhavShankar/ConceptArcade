// Inspirations: Mirror's Edge and parkour games (a free-runner who must land every jump), concert stage shows with hydraulic lifts, and DJ mixing-desk faders.
// The player is the stage technician: they push faders to set the unknown program, then press Showtime; the pillars rise to the heights the stage computer
// builds from the equation, and Kiko (and Jax in level 3) jump for the heights on the choreography card. A wrong pillar stops the show on the spot.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type HandleSpec, type Values } from '@core/dialgame';
import { backdrop, verdict } from '@core/mathkit';
import {
  STAGE, STAGE2_X0, bang, base, crowd, desk, drawPillars, dust, equationBand, exitStand, faderValue, knobY, runner, spotlights, startStand, stand, stars, trackX,
  type Mood, type Pose, type RunnerOpts,
} from './art';
import {
  HOP, RISE, ariaFor, buildRounds, equations, explain, firstFault, hintText, heights, judge, labelFor, letterValues, missText, order, testText, verdictTime,
  type Fault, type Mat, type Round,
} from './logic';

const ROLE = 'a free-runner who performs a parkour show across a stage of hydraulic pillars';
const STORY = [
  'The stage computer adds two programs: the base program A is already loaded, and you set program Y on the faders. Each pillar rises to its entry of A + Y. Kiko jumps for the heights on her choreography card C, so A + Y must equal C entry by entry.',
  'The master gain multiplies a whole program: 2X doubles every entry of X. The stage now runs a gained program X together with a fixed program B, and you set X.',
  'Two stages run side by side. Kiko’s stage computes one combination of programs X and Y, and Jax’s stage another, such as X + Y and X − Y. You set both X and Y.',
  'The stage crew wrote the programs with letters x, y, z and t inside the entries. Each pillar’s height is an expression in the letters. Matching each pillar to Kiko’s card gives one equation per entry.',
  'The choreographer sent the card as a rule for its entries, cᵢⱼ, where i is the row (back row 1, front row 2) and j the column. There is no base program this time: the pillars stand at program Y.',
];
const OBJECTIVE = [
  'Set program Y so every pillar stands at the height on Kiko’s card, in three rounds. In the boss round the computer subtracts: A − Y.',
  'Set program X so the pillars match Kiko’s card exactly, in three rounds.',
  'Set X and Y so both runners land every jump, in three rounds.',
  'Set the four letters so every pillar matches the card, in three rounds.',
  'Build program Y from the rule so Kiko lands every jump, in three rounds.',
];
const ARIA = 'A concert stage of hydraulic pillars that rise to the heights of a matrix, a free-runner who jumps across them, and a mixing desk of faders.';
const CROWD_Y = 250;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 2;

// ---- Where a runner is during the show ---------------------------------------------------------------------------------------------------------------

interface Run {
  x: number;
  y: number;
  pose: Pose;
  mood: Mood;
  facing: 1 | -1;
  rot: number;
  /** Pillars landed on so far, in path order. */
  landed: number;
  stars: boolean;
  bang: boolean;
  /** Where she is standing at the end (for the spotlights). */
  head: [number, number];
}
interface Plan {
  x0: number;
  cols: number;
  /** Actual heights on this stage, and the card heights the runner aims at. */
  hs: Mat;
  card: Mat;
  fault: Fault | null;
  /** When the other runner has failed, this one stops at the end of the hop she is in. */
  freezeAt: number | null;
}
const FLIGHT = 0.05 / HOP;

/** The runner's pose, place and mood `rt` seconds into the show. Hop k lands on pillar k of the snake path; hop 2·cols is the exit. */
function runAt(p: Plan, rt: number): Run {
  const ord = order(p.cols);
  const n = ord.length;
  const pts: [number, number][] = [startStand(p.x0), ...ord.map(([i, j]) => stand(p.x0, i, j, p.hs[i][j])), exitStand(p.x0)];
  const hopStart = (k: number) => RISE + HOP * k;
  const tt = p.freezeAt !== null ? Math.min(rt, p.freezeAt) : rt;
  const frozen = p.freezeAt !== null && rt >= p.freezeAt;
  const faceOf = (k: number): 1 | -1 => (pts[Math.min(k + 1, n + 1)][0] - pts[Math.min(k, n)][0] >= 0 ? 1 : -1);
  const out = (x: number, y: number, pose: Pose, mood: Mood, facing: 1 | -1, k: number, extra: Partial<Run> = {}): Run => ({ x, y, pose, mood, facing, rot: 0, landed: Math.min(k, n + 1), stars: false, bang: false, head: [x, y - 36], ...extra });
  const hop = (a: [number, number], b: [number, number], u: number): [number, number] => {
    const lift = 28 + Math.abs(a[1] - b[1]) / 2;
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - 4 * lift * u * (1 - u)];
  };
  const f = p.fault;
  // A failed hop: the jump is aimed at the card height of the pillar, so the runner crashes into its side or lands on thin air.
  if (f && tt >= hopStart(f.hop)) {
    const k = f.hop;
    const from = pts[k];
    const [i, j] = ord[k];
    const aim = stand(p.x0, i, j, p.card[i][j]);
    const real = pts[k + 1];
    const face = faceOf(k);
    const s = (tt - hopStart(k)) / HOP;
    if (f.kind === 'high') {
      const [bx, by] = base(p.x0, i, j);
      const wall = face > 0 ? bx - 7 : bx + STAGE.w + STAGE.d * 0.5 + 7;
      const hit: [number, number] = [wall, Math.min(by - 2, real[1] + 12)];
      const ts = tt - f.at;
      if (s < FLIGHT) return out(from[0], from[1], 'crouch', 'happy', face, k);
      if (ts < 0) {
        const u = (s - FLIGHT) / (0.6 - FLIGHT);
        const [x, y] = hop(from, hit, clamp01(u));
        return out(x, y, 'air', 'happy', face, k);
      }
      if (ts < 0.1) return out(hit[0], hit[1], 'slam', 'worried', face, k, { stars: true });
      const slide = easeOut((ts - 0.1) / 0.35);
      return out(hit[0], hit[1] + (by + 4 - hit[1]) * slide, 'fall', 'worried', face, k, { stars: ts < 0.9 });
    }
    // low: she lands where the card's top should be, pedals for 0.15 s, then drops onto the low pillar
    if (s < FLIGHT) return out(from[0], from[1], 'crouch', 'happy', face, k);
    const ts = tt - f.at;
    if (ts < 0) {
      const [x, y] = hop(from, aim, clamp01((s - FLIGHT) / (1 - FLIGHT)));
      return out(x, y, 'air', 'happy', face, k);
    }
    if (ts < 0.15) return out(aim[0], aim[1], 'fall', 'worried', face, k, { bang: true });
    const d = clamp01((ts - 0.15) / 0.25);
    const y = aim[1] + (real[1] - aim[1]) * d * d;
    return out(aim[0], y, d < 1 ? 'fall' : 'crouch', 'worried', face, k, { stars: d >= 1 });
  }
  if (frozen) {
    const m = Math.min(n + 1, Math.round(((p.freezeAt as number) - RISE) / HOP));
    return out(pts[m][0], pts[m][1], 'idle', 'worried', faceOf(Math.max(0, m - 1)), m);
  }
  if (tt < RISE) return out(pts[0][0], pts[0][1], 'idle', 'happy', 1, 0);
  const k = Math.floor((tt - RISE) / HOP);
  if (k > n) {
    const u = (tt - hopStart(n + 1)) / 0.3;
    const e = pts[n + 1];
    if (u < 1) return out(e[0], e[1] - 14 * Math.sin(Math.PI * clamp01(u)), 'flip', 'cheer', -1, n + 1, { rot: -2 * Math.PI * clamp01(u) });
    return out(e[0], e[1], 'cheer', 'cheer', -1, n + 1);
  }
  const s = (tt - hopStart(k)) / HOP;
  const face = faceOf(k);
  if (s < FLIGHT) return out(pts[k][0], pts[k][1], k === 0 ? 'crouch' : 'land', 'happy', face, k);
  const [x, y] = hop(pts[k], pts[k + 1], clamp01((s - FLIGHT) / (1 - FLIGHT)));
  return out(x, y, 'air', 'happy', face, k);
}

/** The hop is over when its time is up: the freeze time of the runner who did not fail. */
const hopEnd = (at: number) => RISE + HOP * Math.ceil((at - RISE) / HOP - 1e-9);

// ---- The faders ------------------------------------------------------------------------------------------------------------------------------------------

function faderHandle(key: string, idx: number, n: number): HandleSpec<Round> {
  // With eight faders the tracks are only 25 px apart, so the grab radius shrinks to keep a neighbour from stealing the drag.
  return { dial: key, at: (_r, v) => [trackX(idx, n), knobY(v[key])], drag: (_r, _px, py) => faderValue(py), radius: n >= 7 ? 5 : n >= 6 ? 10 : 14 };
}

// ---- One level -------------------------------------------------------------------------------------------------------------------------------------------

function level(n: 1 | 2 | 3 | 4 | 5, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const keys = rounds[0].keys;
  let testPending = false;
  let testAt = -10;
  let testV: Values = {};
  let lastK = -1;
  let seen: unknown = null;
  let floated = false;
  const x0s = n === 3 ? [STAGE.x0, STAGE2_X0] : [STAGE.x0];
  return {
    hero: { name: 'Kiko', role: ROLE, story: STORY[n - 1], objective: OBJECTIVE[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials: keys.map((key) => ({ key, aria: ariaFor(key), label: labelFor(key), unit: '', step: 1, min: -9, max: 9, start: 0 })),
    handles: keys.map((key, idx) => faderHandle(key, idx, keys.length)),
    test: {
      button: '🔧 Test lift',
      aria: 'Test lift: raise the pillars for a moment to the heights you set',
      read: (r, v) => {
        testPending = true;
        return testText(r, v);
      },
    },
    fire: { button: '▶ Showtime', aria: 'Start the show' },
    judge: (r, v) => judge(r, v),
    miss: (r, v) => missText(r, v),
    win: (r) => `Perfect run! ${explain(r)}`,
    hint: (r) => hintText(r),
    hit: () => [STAGE.x0 + 60, STAGE.floor - 80],
    delay: (r, v) => verdictTime(r, v),
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      if (k !== lastK) {
        lastK = k;
        testAt = -10;
        testPending = false;
      }
      if (testPending && !shot) {
        testPending = false;
        testAt = t;
        testV = { ...v };
      }
      if (shot !== seen) {
        seen = shot;
        floated = false;
      }
      backdrop(g);
      // What the pillars show: live in round 1, the fired values during the show, the snapshot during a test lift, and flat otherwise.
      const tAge = t - testAt;
      const testing = !shot && r.assist > 0 && tAge >= 0 && tAge < 1.5;
      const f = shot ? shot.v : testing ? testV : v;
      const hs = heights(r, f);
      const showH = r.assist === 0 || !!shot || testing;
      const rise = shot ? (r.assist === 0 ? 1 : easeOut(rt / RISE)) : testing ? clamp01(Math.min(tAge / 0.3, (1.5 - tAge) / 0.3)) : r.assist === 0 ? 1 : 0;
      const ghostOn = r.assist === 0 || testing;
      const ghostAlpha = testing ? rise : r.assist === 0 ? 1 : 0;
      const steamAge = shot && r.assist > 0 ? rt : testing ? tAge : -1;
      const fault = shot ? firstFault(r, shot.v) : null;
      const vt = shot ? verdictTime(r, shot.v) : 0;
      const done = !!shot && rt >= vt;
      const win = !!shot && shot.ok;
      // The runners
      const runs = x0s.map((x0, ri) => {
        const who = ri === 0 ? 'kiko' : 'jax';
        const own = ri === 0 ? hs.kiko : hs.jax!;
        // Level 5 hides the card's numbers, so a short jump aims one unit above the player's own pillar, never at the true height.
        const card = r.kind === 'rule' ? own.map((row, i) => row.map((h, j) => (h < r.card[i][j] ? h + 1 : r.card[i][j]))) : ri === 0 ? r.card : r.card2!;
        const mine = fault && fault.runner === who ? fault : null;
        const plan: Plan = { x0, cols: r.cols, hs: shot ? own : zeros(r.cols), card, fault: mine, freezeAt: fault && !mine ? hopEnd(fault.at) : null };
        return { who, x0, run: runAt(plan, shot ? rt : 0), failed: mine };
      });
      // Light and crowd first, then the stages, the runners, and last the desk and the equation
      const kiko = runs[0].run;
      spotlights(g, t, win && done ? { x: kiko.head[0], y: kiko.head[1], f: easeOut((rt - vt) / 0.6) } : null);
      x0s.forEach((x0, ri) => {
        const landed = new Set<string>();
        const ord = order(r.cols);
        for (let q = 0; q < runs[ri].run.landed && q < ord.length; q++) landed.add(`${ord[q][0]}${ord[q][1]}`);
        const failed = runs[ri].failed && rt >= runs[ri].failed.at ? `${runs[ri].failed.i}${runs[ri].failed.j}` : null;
        drawPillars(g, { x0, cols: r.cols, h: showH ? (ri === 0 ? hs.kiko : hs.jax!) : null, rise, ghost: ghostOn ? (ri === 0 ? r.card : r.card2!) : null, ghostAlpha, landed, failed, t, steam: steamAge });
      });
      if (shot) {
        for (const { x0, run: u } of runs) {
          const ord = order(r.cols);
          const hsRun = x0 === STAGE.x0 ? hs.kiko : hs.jax!;
          const pts = [...ord.map(([i, j]) => stand(x0, i, j, hsRun[i][j])), exitStand(x0)];
          pts.forEach((pt, q) => q < u.landed && dust(g, pt[0], pt[1], rt - (RISE + HOP * (q + 1))));
        }
      }
      runs.forEach(({ who, run: u }) => {
        const o: RunnerOpts = { pose: u.pose, mood: u.mood, facing: u.facing, look: who === 'kiko' ? 'kiko' : 'jax', rot: u.rot };
        runner(g, u.x, u.y, t, o);
        if (u.stars) stars(g, u.x, u.y - 42, t);
        if (u.bang) bang(g, u.x, u.y - 40);
      });
      crowd(g, t, done ? (win ? 'cheer' : 'groan') : 'idle');
      if (done && !floated) {
        floated = true;
        if (win) A.float('WOOO!', 200, CROWD_Y, PAL.yellow);
        else A.float('OOOH…', 200, CROWD_Y, PAL.dim);
      }
      desk(g, keys, v, labelFor);
      if (shot && rt > vt + 0.1) verdict(g, shot.ok, 'PERFECT RUN', 'SHOW STOPPED');
      else equationBand(g, equations(r, v), n, n === 4 ? letterValues(v) : null);
    },
  };
}

const zeros = (cols: number): Mat => [new Array<number>(cols).fill(0), new Array<number>(cols).fill(0)];

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(5, ctx.level)) as 1 | 2 | 3 | 4 | 5;
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA);
  },
});
