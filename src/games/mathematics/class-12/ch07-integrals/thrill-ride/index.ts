// Inspirations (code comment only): theme-park building games (lay a coaster track, then watch the test car ride it) and Trials and Poly Bridge (one bad joint and
// the run fails). The player sets the coefficients of the track on knobs; the track's slope must be the blueprint's f(x) at every pylon. The art is in art.ts.
// The player's track is drawn only in round 1 (live), for 1.5 s after a test lay in round 2, or while the car is sent. The pylons stand at fixed heights that say
// nothing about the answer: the clips are on masts that settle onto the rail only where the player's own rail is on show. The end station is a tall terminal, so
// where the car arrives is not marked. A miss shows only the player's own rail kinking at the first clip it does not fit; the winning track is never drawn.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type SceneInput } from '@core/dialgame';
import { backdrop } from '@core/mathkit';
import { DIM_RAIL, bulbs, goalLine, skyTint, buckle, car, fallen, ferris, ground, knobBox, pylon, rails, rex, sign, station, terminal, type ClipState, type RexMood, type RexPose } from './art';
import { BUILD, PYLONS, RIDE, buildRounds, coeffs, firstFault, hintText, judge, missText, pylonX, q4, slopeAt, testText, track, verdictTime, winText, type Round } from './logic';

const ARIA = 'A theme-park roller coaster under construction: pylons with rail clips at set slopes, a station with an engineer, and a test car.';
const ROLE = 'a coaster engineer who builds a track whose slope must match the blueprint at every pylon';
const OBJ = 'Set the coefficients so the car rides the whole track, in three rounds.';
const HEROES = [
  {
    story: 'Every pylon holds a rail clip at the slope the blueprint asks for: the slope at x must be f(x). So the track’s height is an antiderivative of f. Here f is x times a wave, so integrate by parts with u = x. The station fixes the height at the start.',
    objective: 'Set the track’s coefficients so the test car rides the whole track, in three rounds.',
  },
  {
    story: 'These blueprints have exponentials, and the boss track needs x², which means integrating by parts twice. The track is e^(kx) times a quadratic: set its three coefficients.',
    objective: OBJ,
  },
  {
    story: 'These blueprints are log x, tan⁻¹ x, sin⁻¹ x and friends. Make the log or the inverse trig function u, and dv = dx or x dx.',
    objective: OBJ,
  },
  {
    story: 'These blueprints hide the pattern eˣ[f(x) + f′(x)], whose integral is eˣ f(x). Spot f, and the track is almost written for you.',
    objective: OBJ,
  },
  {
    story: 'Cyclic blueprints such as eˣ sin x: integrate by parts twice and the integral comes back. Call it I and solve for it.',
    objective: OBJ,
  },
];

const ROUTE = { x0: 74, x1: 590, top: 64, bottom: 250, ground: 292 };
const REX_X = 36;
const N = 160; // the track is sampled at N + 1 points; pylon i sits at sample 20 i + 10
const PEEK_SECONDS = 1.5;
const FLIGHT = 0.3;
const MIN_KINK = (12 * Math.PI) / 180;

type P = [number, number];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (u: number) => clamp01(u) * clamp01(u) * (3 - 2 * clamp01(u));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

// ---- The map from the world to the screen ----------------------------------------------------------------------------------------------------------------

interface Geo {
  X: (x: number) => number;
  Y: (y: number) => number;
  /** Screen angle (radians, up positive) of a slope. */
  ang: (slope: number) => number;
  /** Screen y of the top of each pylon's mast before the player's rail is on show: fixed, and nothing to do with the answer. */
  decoy: number[];
  clip: number[];
  start: number;
}
const geos = new WeakMap<object, Geo>();
/**
 * Heights are scaled per round so the winning track fits the screen (the scene does not jump as the knobs turn). Only the scale is taken from it: the winning track
 * itself is never drawn, and the masts stand at heights taken from the blueprint's name alone.
 */
function geoOf(r: Round): Geo {
  let c = geos.get(r);
  if (c) return c;
  const win = track(r, r.ans);
  let lo = Infinity;
  let hi = -Infinity;
  for (let j = 0; j <= N; j++) {
    const y = win(r.lo + ((r.hi - r.lo) * j) / N);
    lo = Math.min(lo, y);
    hi = Math.max(hi, y);
  }
  const span = hi - lo || 1;
  const y0 = lo - 0.1 * span;
  const y1 = hi + 0.1 * span;
  const sx = (ROUTE.x1 - ROUTE.x0) / (r.hi - r.lo);
  const sy = (ROUTE.bottom - ROUTE.top) / (y1 - y0);
  const X = (x: number) => ROUTE.x0 + (x - r.lo) * sx;
  const Y = (y: number) => ROUTE.bottom - (y - y0) * sy;
  const seed = [...r.name].reduce((s, ch) => s + ch.charCodeAt(0), 0);
  c = {
    X,
    Y,
    ang: (s) => Math.atan2(s * sy, sx),
    decoy: Array.from({ length: PYLONS }, (_, i) => ROUTE.bottom - (0.28 + 0.44 * (0.5 + 0.5 * Math.sin(seed * 0.7 + i * 1.9))) * (ROUTE.bottom - ROUTE.top)),
    clip: Array.from({ length: PYLONS }, (_, i) => Math.atan2(r.f(pylonX(r, i)) * sy, sx)),
    start: Y(0),
  };
  geos.set(r, c);
  return c;
}

/** The player's track on screen: 161 points, clamped to y 20..320. */
function railPts(r: Round, c: number[], geo: Geo): P[] {
  const F = track(r, c);
  return Array.from({ length: N + 1 }, (_, j): P => {
    const x = r.lo + ((r.hi - r.lo) * j) / N;
    const y = geo.Y(F(x));
    return [geo.X(x), Number.isFinite(y) ? clamp(y, 20, 320) : 320];
  });
}
/** The screen angle of the rail between samples j - 1 and j + 1. */
const angleAt = (pts: P[], j: number) => {
  const a = pts[Math.max(0, j - 1)];
  const b = pts[Math.min(N, j + 1)];
  return Math.atan2(a[1] - b[1], b[0] - a[0]);
};
const at = (pts: P[], p: number): P => {
  const j = clamp(p, 0, 1) * N;
  const i = Math.min(N - 1, Math.floor(j));
  return [lerp(pts[i][0], pts[i + 1][0], j - i), lerp(pts[i][1], pts[i + 1][1], j - i)];
};

// ---- The level -------------------------------------------------------------------------------------------------------------------------------------------

function level(n: 1 | 2 | 3 | 4 | 5, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const keys = rounds[0].keys;
  let testPending = false;
  let testAt = -10;
  let lastK = -1;
  let roundT0 = 0;
  const fx = { shot: null as unknown, away: false, spark: false, crash: false, done: false };
  let run: { shot: unknown; f: ReturnType<typeof firstFault>; vtm: number; pts: P[] } | null = null;

  function draw(s: SceneInput<Round>) {
    const { g, r, k, t, rt, shot, A, v } = s;
    if (k !== lastK) {
      lastK = k;
      roundT0 = t;
      testPending = false;
      testAt = -10;
    }
    if (testPending && !shot) {
      testPending = false;
      testAt = t;
    }
    const c = coeffs(r, v);
    const geo = geoOf(r);
    const peekT = t - testAt;
    const peeking = !shot && r.assist === 1 && peekT >= 0 && peekT < PEEK_SECONDS;
    const live = !shot && (r.assist === 0 || peeking);
    A.canvas.dataset.trackShown = live || shot ? '1' : '0';
    if (!shot) {
      delete A.canvas.dataset.kink;
      delete A.canvas.dataset.fault;
    }
    if (shot && (!run || run.shot !== shot)) {
      const f = firstFault(r, c);
      run = { shot, f, vtm: verdictTime(r, c), pts: railPts(r, c, geo) };
      Object.assign(fx, { shot, away: false, spark: false, crash: false, done: false });
    }
    const pts: P[] | null = shot ? run!.pts : live ? railPts(r, c, geo) : null;
    const f = shot ? run!.f : null;
    const faultIdx = f ? f.pylon : PYLONS;
    const win = !!shot && shot.ok;
    const vt = shot ? rt - run!.vtm : -1;
    const ts = (i: number) => (BUILD * (i + 0.5)) / PYLONS;
    const fade = peeking ? ease(peekT / 0.15) * (1 - ease((peekT - 1.35) / 0.15)) : 1;

    // the masts: fixed heights, until the player's own rail is on show and the clip settles onto it
    const tops = Array.from({ length: PYLONS }, (_, i) => {
      const e = shot ? (i <= faultIdx ? ease((rt - (ts(i) - 0.12)) / 0.12) : 0) : live ? fade : 0;
      return e > 0 && pts ? lerp(geo.decoy[i], pts[20 * i + 10][1], e) : geo.decoy[i];
    });
    A.canvas.dataset.masts = tops.map((y) => Math.round(y)).join(',');

    // the park at dusk
    backdrop(g);
    skyTint(g, k, t, ROUTE.ground);
    ferris(g, 520, 128, 62, t);
    bulbs(g, t);
    ground(g, ROUTE.ground);
    terminal(g, 596, 640, 40, ROUTE.ground, t);
    station(g, 8, 84, geo.start + 8, ROUTE.ground, t);

    // the pylons and their clips
    for (let i = 0; i < PYLONS; i++) {
      let state: ClipState = 'idle';
      let flash = 0;
      if (shot && rt >= ts(i)) {
        if (i < faultIdx) {
          state = 'green';
          flash = clamp01(1 - (rt - ts(i)) / 0.35);
        } else if (i === faultIdx) {
          state = 'red';
          flash = Math.max(0.35, clamp01(1 - (rt - ts(i)) / 0.5));
        }
      }
      pylon(g, geo.X(pylonX(r, i)), ROUTE.ground, tops[i], geo.clip[i], state, flash, i + 1);
    }

    // the rail: live in round 1, a test lay in round 2, the lay itself when the car is sent
    if (pts && !shot) {
      g.globalAlpha = fade;
      rails(g, pts, N + 1, PAL.cyan);
      g.globalAlpha = 1;
    }
    if (shot && pts) {
      const upTo = Math.round(clamp01(rt / BUILD) * N) + 1;
      if (f) {
        const idx = 20 * f.pylon + 10;
        rails(g, pts, Math.min(upTo, idx - 6 + 1), PAL.cyan);
        rails(g, pts.slice(idx + 6), upTo - (idx + 6), DIM_RAIL);
        if (rt >= ts(f.pylon)) {
          if (!fx.spark) {
            fx.spark = true;
            A.burst(pts[idx][0], tops[f.pylon], PAL.orange, 12, 120);
          }
          const slope = slopeAt(r, c, pylonX(r, f.pylon));
          const delta = geo.ang(slope) - geo.clip[f.pylon];
          const kink = (f.steep ? 1 : -1) * clamp(Math.abs(delta), MIN_KINK, 1.05);
          buckle(g, pts[idx][0], tops[f.pylon], geo.clip[f.pylon], kink, clamp01(1 - (rt - ts(f.pylon)) / 0.5));
          A.canvas.dataset.kink = String(Math.round((Math.abs(kink) * 180) / Math.PI));
          A.canvas.dataset.fault = String(f.pylon + 1);
        }
      } else rails(g, pts, upTo, PAL.cyan);
    }

    // the car
    const tau = shot ? (rt - BUILD) / RIDE : -1;
    let cx = geo.X(r.lo);
    let cy = geo.start;
    let ang = 0;
    let arms: 'down' | 'up' = 'down';
    let lean = 0;
    let brake = false;
    let riders = true;
    let rock = Math.sin(t * 3) * 0.03;
    let crashAt: P | null = null;
    if (shot && pts && tau > 0) {
      rock = 0;
      const pF = f ? (f.pylon + 0.5) / PYLONS : 1;
      const p = Math.min(1, tau, pF);
      [cx, cy] = at(pts, p);
      ang = lerp(0, angleAt(pts, Math.round(p * N)), ease((tau * RIDE) / 0.1));
      if (f && tau > pF) {
        // the car leaves the rail along its last direction, tumbling twice, and lands at the verdict
        const j = 20 * f.pylon + 10;
        const [x0, y0] = pts[j];
        const angF = angleAt(pts, j);
        const vx = (geo.X(r.hi) - geo.X(r.lo)) / RIDE;
        const a = -vx * clamp(Math.tan(angF), -1.5, 1.5) * FLIGHT;
        const yL = Math.min(320, Math.max(y0, ROUTE.ground - 2));
        const xL = Math.min(610, x0 + vx * FLIGHT);
        const u = clamp01((rt - (BUILD + RIDE * pF)) / FLIGHT);
        cx = lerp(x0, xL, u);
        cy = y0 + a * u + (yL - y0 - a) * u * u;
        ang = angF * (1 - u) + (4 * Math.PI + 0.45) * u;
        arms = 'up';
        if (u >= 1) {
          riders = false;
          crashAt = [cx, cy];
        }
      } else {
        lean = clamp(-ang * 3, -3, 3);
        arms = ang < -0.26 ? 'up' : 'down';
        if (win && tau > 0.85) brake = true;
        if (win && tau > 1) {
          const sl = clamp01((rt - (BUILD + RIDE)) / 0.3);
          cx = geo.X(r.hi) + 18 * sl * (2 - sl);
          brake = sl < 1;
          arms = 'up';
        }
      }
    }
    car(g, cx, cy, ang, t, { lean, arms, brake, riders, rock });
    if (crashAt) {
      if (!fx.crash) {
        fx.crash = true;
        A.burst(crashAt[0], crashAt[1] - 6, PAL.orange, 22, 170);
        A.burst(crashAt[0], crashAt[1] - 6, '#9aa0b8', 10, 60);
        A.float('CRASH!', crashAt[0], crashAt[1] - 40, PAL.orange);
      }
      const pop = clamp01(vt / 0.25);
      fallen(g, crashAt[0] - 6 - 20 * pop, crashAt[1] + 2 - 34 * Math.sin(Math.PI * pop), -1.2 * pop, t, pop);
      fallen(g, crashAt[0] + 8 + 24 * pop, crashAt[1] + 2 - 34 * Math.sin(Math.PI * pop), 1.4 * pop, t, pop);
    }

    // Rex
    let pose: RexPose = 'idle';
    let mood: RexMood = 'happy';
    let hat: [number, number, number] | undefined;
    if (shot && rt < BUILD) pose = 'radio';
    if (shot && vt >= 0) {
      if (win) {
        pose = 'cheer';
        mood = 'cheer';
        hat = [8 * vt, -62 * Math.sin(Math.PI * clamp01(vt / 0.7)), vt < 0.7 ? vt * 9 : 0];
        if (!fx.done) {
          fx.done = true;
          A.float('RIDE COMPLETE!', 320, 214, PAL.green);
        }
      } else {
        mood = 'worried';
        pose = vt < 0.3 ? 'idle' : 'facepalm';
      }
    }
    if (shot && !fx.away && rt > 0.05) {
      fx.away = true;
      A.float('“Car away!”', REX_X + 36, geo.start - 52, PAL.white);
    }
    rex(g, REX_X, geo.start + 8, t, { mood, pose, hat });

    // the blueprint and the knob box
    sign(g, 96, 6, r.name, r.form);
    if (!shot) goalLine(g, 'Goal: fit all 8 clips', 538, 26, t - roundT0);
    knobBox(g, 452, 294, 178, keys.map((key) => ({ key, shown: q4(v[key] ?? 0), turn: (v[key] ?? 0) / 8 })));
  }

  return {
    hero: { name: 'Rex', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials: keys.map((key) => ({ key, aria: `Coefficient ${key} of the track, in quarters`, label: key, unit: '', step: 1, min: -8, max: 8, start: 0, text: (v: number) => q4(v) })),
    test: {
      button: '🔧 Test lay',
      aria: 'Test lay: show the track for a moment and count the clips it fits',
      read: (r, v) => {
        testPending = true;
        return testText(r, coeffs(r, v));
      },
    },
    fire: { button: '🎢 Send the car', aria: 'Send the test car' },
    judge: (r, v) => judge(r, coeffs(r, v)),
    miss: (r, v) => missText(r, coeffs(r, v)),
    win: (r) => winText(r),
    hint: (r) => hintText(r),
    hit: () => [ROUTE.x1, ROUTE.top + 40],
    delay: (r, v) => verdictTime(r, coeffs(r, v)),
    draw,
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(5, ctx.level)) as 1 | 2 | 3 | 4 | 5;
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA);
  },
});
