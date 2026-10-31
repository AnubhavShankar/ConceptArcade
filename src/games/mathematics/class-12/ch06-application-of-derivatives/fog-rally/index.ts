// Inspirations: Hill Climb Racing (a truck on a hill road, gas and brake), Trials (one wrong input and the bike flips) and Guitar Hero note charts
// (the gear strip is a chart you write before the song plays). Dusty drives a mountain stage in thick fog: levels 1 to 4 are a tap-the-strip gear plan
// decided by the sign of f′, level 5 is one dial (the road parameter a) that must keep f′ one-signed on the whole stage.
import { PAL, RESOLVE, createArcade, type Arcade } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { TRACK, backdrop, num, trackHandle, verdict } from '@core/mathkit';
import { text, type Mood } from '@core/neon';
import { pointerToLocal } from '@core/sim';
import type { GameContext } from '@core/types';
import {
  billboard, centreFor, drone, finishFlag, fog, gearStrip, goalLine, knob, KNOB_R, makeGeo, makePuffs, marshal, roadLine, ROAD, silhouette, sky, startGate, startPad, STRIP, trackBar, truck, NEUTRAL_Y,
  type G, type Geo, type MarshalState, type Puffs, type TruckOpts,
} from './art';
import {
  CELLS, DRIVE, buildBuilder, buildExplain, buildFault, buildFormula, buildIntel, buildMiss, buildScout, buildStrip, complete, edgeText, firstFault, impactTime, judgeBuild, judgeStrip,
  mid, roadF, roadFp, scoutText, stripExplain, stripIntel, stripMiss, turnAt, type BuildRound, type Gear, type StripRound,
} from './logic';

const ROLE = 'a rally driver in a monster truck who has to drive a mountain stage through thick fog';
const STORY = [
  'The fog is so thick that Dusty cannot see the road. The organisers radio the road as a formula f(x), its height at x. Where f′(x) > 0 the road climbs and needs GAS; where f′(x) < 0 it falls and needs BRAKE. Braking on a climb stalls the truck; gas on a drop makes it run away and flip.',
  'This stage follows a cubic road. Its slope f′ has two roots, so the road turns twice and splits into three stretches. A sign chart of f′ tells Dusty which stretches climb and which fall.',
  'Some roads flatten for a moment and then carry on the same way. Where f′ = 0 but its sign does not change, the road does not turn, so the gear must not change there. Other roads turn three times.',
  'A mountain pass whose height is a trigonometric function of x, from 0 to 2π. Each stretch of the gearbox is π/4 long, and the road can turn at any multiple of π/4.',
  'Before the stage the roadworks crew shapes the road with one setting a. Dusty drives the whole stage in one gear, so the slope must keep its sign from the start gate to the finish. The organisers want the road to turn exactly at the start gate, not earlier and not inside the stage.',
];
const OBJECTIVE = [
  'Set GAS or BRAKE for every stretch of the stage so Dusty reaches the finish flag, in three rounds.',
  'Set the gearbox for all three stretches so Dusty reaches the finish flag, in three rounds.',
  'Change gear only where the road really turns, and reach the finish flag in three rounds.',
  'Set GAS or BRAKE for all eight stretches of the pass, in three rounds.',
  'Set a so the road turns exactly at the start gate and runs the right way all the way to the finish, in three rounds.',
];
/** The round's goal, as the one short line drawn on the scene at the start of each round. */
const GOALS =['GAS on climbs, BRAKE on drops', 'Sign of f′ gives each stretch’s gear', 'Change gear only where the road turns', 'Set the gear for all 8 stretches', 'Set a: the road turns at the gate'];
const ARIA14 ='A rally truck at the start of a mountain road hidden in fog, with a strip of eight road stretches below it that the player sets to gas or brake.';
const ARIA5 = 'A rally truck at a start gate on a foggy mountain road that the roadworks setting a reshapes.';
const hero = (level: number) => ({ name: 'Dusty', role: ROLE, story: STORY[level - 1], objective: OBJECTIVE[level - 1] });
const assistLine = (assist: 0 | 1 | 2, what: string) =>
  assist === 0 ? 'Round 1: the road shows faintly through the fog.' : assist === 1 ? `Thick fog: a ${what} costs a charge.` : 'Boss round: thick fog, no scout.';

// ---- Where the truck is during a run -----------------------------------------------------------------------------------------------------------------

interface Pose { x: number; lift: number; flip: number; fast: boolean; mood: Mood; state: 'drive' | 'stall' | 'flip' | 'finish'; landed: boolean }
const drive = (x: number, fast = false): Pose => ({ x, lift: 0, flip: 0, fast, mood: 'happy', state: 'drive', landed: false });
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** A run of the strip: the truck drives the stage, or crashes in the first wrong cell (a flip on the gas, a stall on the brake). */
function stripPose(r: StripRound, fault: ReturnType<typeof firstFault>, rt: number): Pose {
  const per = DRIVE / CELLS;
  const w = r.width;
  if (!fault) {
    const done = rt >= DRIVE;
    return { ...drive(r.lo + clamp01(rt / DRIVE) * (r.hi - r.lo)), mood: done ? 'cheer' : 'happy', state: done ? 'finish' : 'drive' };
  }
  const c = fault.cell;
  const tf = (c + 0.5) * per;
  const start = r.lo + c * w;
  if (rt < c * per) return drive(r.lo + (rt / per) * w);
  if (fault.kind === 'flip') {
    if (rt < tf) return drive(Math.min(start + ((rt - c * per) / per) * w * 1.8, mid(r, c) + 0.3 * w), true);
    const u = clamp01((rt - tf) / 0.45);
    return { x: start + 0.8 * w + 0.1 * w * u, lift: -30 * Math.sin(u * Math.PI), flip: u, fast: false, mood: u > 0.5 ? 'dizzy' : 'worried', state: 'flip', landed: u >= 1 };
  }
  if (rt < tf) return drive(start + 0.5 * w * (1 - (1 - (rt - c * per) / (tf - c * per)) ** 2));
  return { ...drive(mid(r, c) - 0.3 * w * clamp01((rt - tf) / 0.4)), mood: 'worried', state: 'stall' };
}
/** A run of level 5: everything lands at 1.3 s. 'late' crashes a little past the gate; 'early' and a win reach the finish. */
function buildPose(r: BuildRound, fault: 'late' | 'early' | null, rt: number): Pose {
  const D = 1.3;
  if (fault !== 'late') {
    const done = rt >= D;
    return { ...drive(r.m + clamp01(rt / D) * (r.n - r.m)), mood: done ? (fault ? 'worried' : 'cheer') : 'happy', state: done ? 'finish' : 'drive' };
  }
  if (r.gear === 'gas') {
    if (rt < 0.85) return drive(r.m + 0.5 * (rt / 0.85), true);
    const u = clamp01((rt - 0.85) / 0.45);
    return { x: r.m + 0.5 + 0.1 * u, lift: -30 * Math.sin(u * Math.PI), flip: u, fast: false, mood: u > 0.5 ? 'dizzy' : 'worried', state: 'flip', landed: u >= 1 };
  }
  if (rt < 0.9) return drive(r.m + 0.5 * (1 - (1 - rt / 0.9) ** 2));
  return { ...drive(r.m + 0.5 - 0.3 * clamp01((rt - 0.9) / 0.4)), mood: 'worried', state: 'stall' };
}

// ---- One frame of the stage ---------------------------------------------------------------------------------------------------------------------------

interface Stage {
  A: Arcade;
  g: G;
  t: number;
  geo: Geo;
  assist: 0 | 1 | 2;
  /** The round, 0 to 2: it picks the sky. */
  k: number;
  rt: number;
  pose: Pose | null;
  gear: Gear;
  flagAt: number;
  gateAt: number | null;
  idleX: number;
  outcome: 'win' | 'crash' | 'void';
  impact: number;
  /** The headlights never reveal road beyond this screen x (after a crash the same round is replayed). */
  fogLimit: number;
  flags: { landed: boolean; honk: boolean };
  puffs: Puffs;
}
/** Draw order: backdrop, mountains, road, fog, start pad, gate, flag, marshal, truck, effects. Returns where the truck stands. */
function drawStage(s: Stage) {
  const { g, geo, A, t, rt, pose } = s;
  const ease = pose ? clamp01(rt / 0.15) : 0;
  // While the road is hidden the pad, flag and truck sit at a neutral height so their height cannot hint at the shape.
  const yOf = (x: number) => {
    const real = geo.Y(geo.f(x));
    return s.assist === 0 ? real : NEUTRAL_Y + (real - NEUTRAL_Y) * ease;
  };
  const wx = pose ? s.idleX + (pose.x - s.idleX) * clamp01(rt / 0.12) : s.idleX;
  const onRoad = wx >= geo.lo;
  const sx = geo.X(wx);
  const sy = yOf(onRoad ? wx : geo.lo);
  const slope = onRoad ? Math.atan2(geo.Y(geo.f(wx + 0.05)) - geo.Y(geo.f(wx - 0.05)), geo.X(wx + 0.05) - geo.X(wx - 0.05)) : 0;
  const ang = Math.max(-0.9, Math.min(0.9, slope)) * (s.assist === 0 ? 1 : ease);
  const cut = pose ? Math.min(sx + 60, s.fogLimit) : -1;
  const lift = pose && s.outcome === 'win' ? clamp01((rt - (RESOLVE - 0.6)) / 0.6) : 0;

  backdrop(g);
  sky(g, t, s.k);
  roadLine(g, geo, cut);
  fog(g, t, cut, 1 - lift);
  if (s.assist === 0) silhouette(g, geo);
  startPad(g, geo, yOf(geo.lo));
  if (s.gateAt !== null) startGate(g, geo.X(s.gateAt), yOf(s.gateAt));
  const fx = geo.X(s.flagAt);
  const fy = yOf(s.flagAt);
  finishFlag(g, fx, fy, t);
  const mstate: MarshalState = pose && rt >= s.impact ? s.outcome : 'idle';
  marshal(g, fx + 24, fy, t, mstate);

  s.puffs.draw(g, t);
  const landedUpside = !!pose && pose.state === 'flip' && pose.landed;
  const o: TruckOpts = { gear: s.gear, mood: pose ? pose.mood : 'happy', wheel: sx / 11 + (landedUpside ? t * 12 : 0), flip: pose ? pose.flip : 0, speedLines: !!pose && pose.fast };
  const [cx, cy] = centreFor(sx, sy, ang, pose ? pose.lift : 0);
  const pipe = truck(g, cx, cy, ang, t, o);
  if (!pose || pose.state === 'finish') s.puffs.emit(t, pipe.px, pipe.py, 0.5);
  else if (pose.state === 'drive' && s.gear === 'gas') s.puffs.emit(t, pipe.px, pipe.py, 0.08);
  else if (pose.state === 'stall') s.puffs.emit(t, sx, sy - 4, 0.06, 'rgba(120,120,130,');
  if (pose) {
    if (pose.landed && !s.flags.landed) {
      s.flags.landed = true;
      A.burst(sx, sy - 10, PAL.yellow, 18, 160);
    }
    if (pose.state === 'finish' && s.outcome === 'win' && !s.flags.honk) {
      s.flags.honk = true;
      A.float('HONK!', fx, fy - 50, PAL.yellow);
    }
    if (pose.landed) text(g, 'FLIPPED!', sx, sy - 52, PAL.red, 16);
    if (pose.state === 'stall') text(g, 'STALLED!', sx, sy - 52, PAL.orange, 16);
  }
}

/** The scout drone's flight: in from the left over the scouted spot, a lamp for 1.3 s, then away. */
function scoutDrone(g: G, t: number, age: number, x: number, dir: 'up' | 'down' | 'flat') {
  const f = clamp01(age / 0.5);
  const dx = -20 + (x + 20) * (1 - (1 - f) ** 2);
  const dy = 70 + 8 * f + Math.sin(t * 5) * 2 - (age > 1.8 ? (age - 1.8) * 90 : 0);
  drone(g, dx, dy, t, age >= 0.5 && age < 1.8 ? dir : null);
}

// ---- Levels 1 to 4: the gear strip ------------------------------------------------------------------------------------------------------------------------

function mountStrip(ctx: GameContext, level: 1 | 2 | 3 | 4) {
  const rounds = buildStrip(level, ctx.random);
  const geos = rounds.map((r) => makeGeo(r.f, r.lo, r.hi));
  const puffs = makePuffs();
  const gears: Gear[] = Array.from({ length: CELLS }, () => null);
  let last = -1;
  let touched = false;
  let scout: { cell: number; t0: number } | null = null;
  let shot: { gears: Gear[]; ok: boolean; fault: ReturnType<typeof firstFault>; flags: { landed: boolean; honk: boolean } } | null = null;
  const buttons: HTMLButtonElement[] = [];
  const GEAR_TEXT = { none: '?', gas: '⬆ GAS', brake: '⬇ BRAKE' };
  const refresh = (i: number) => {
    const k = gears[i] ?? 'none';
    buttons[i].dataset.gear = k;
    buttons[i].textContent = GEAR_TEXT[k];
    buttons[i].title = GEAR_TEXT[k];
  };
  const A = createArcade(ctx, hero(level), {
    W: 640,
    H: 340,
    aria: ARIA14,
    rounds: 3,
    charges: [1, 1, 0],
    onRound: (k) => {
      gears.fill(null);
      shot = null;
      scout = null;
      last = -1;
      buttons.forEach((_, i) => refresh(i));
      A.feedback.hidden = true;
      A.hint.textContent = `${stripIntel(rounds[k])} ${assistLine(rounds[k].assist, 'scout drone')}`;
    },
  });
  const cur = () => Math.min(A.round, 2);
  const tap = (i: number) => {
    if (A.phase !== 'play') return;
    gears[i] = gears[i] === 'gas' ? 'brake' : 'gas';
    last = i;
    touched = true;
    A.sound('blip');
    refresh(i);
  };
  const holder = document.createElement('div');
  holder.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:4px;max-width:420px;margin:8px auto';
  for (let i = 0; i < CELLS; i++) {
    const b = A.button('?', `Gear from x = ${edgeText(rounds[0], i)} to ${edgeText(rounds[0], i + 1)}`, () => tap(i), 'small');
    b.dataset.cell = String(i);
    buttons.push(b);
    refresh(i);
    holder.append(b);
  }
  A.controls.append(holder);
  A.canvas.addEventListener('pointerdown', (e) => {
    if (A.phase !== 'play') return;
    const p = pointerToLocal(e, A.canvas, 640, 340);
    if (p.y < STRIP.y || p.y > STRIP.y + STRIP.h || p.x < ROAD.x0 || p.x >= ROAD.x1) return;
    tap(Math.floor((p.x - ROAD.x0) / 65));
  });
  A.controls.append(
    A.button('🛰 Scout', 'Scout: a drone reads the slope over the stretch you last tapped', () => {
      if (last < 0) {
        A.freeNote('Tap a stretch of road first, then send the scout.');
        return;
      }
      if (!A.spend()) return;
      A.say(scoutText(rounds[cur()], last), true);
      scout = { cell: last, t0: A.clock };
    }, 'secondary'),
    A.button('🏁 Drive', 'Drive the stage', () => {
      const k = cur();
      const r = rounds[k];
      if (!complete(gears)) {
        A.freeNote('Set a gear for every stretch of road first.');
        return;
      }
      const ok = judgeStrip(r, gears);
      const fault = firstFault(r, gears);
      shot = { gears: [...gears], ok, fault, flags: { landed: false, honk: false } };
      const wx = fault ? mid(r, fault.cell) : r.hi;
      const geo = geos[k];
      A.resolve(ok, ok ? `Stage clear! ${stripExplain(r)}` : stripMiss(r, gears), { x: geo.X(wx), y: geo.Y(geo.f(wx)) - (fault ? 20 : 40) }, impactTime(fault));
    }),
  );
  A.scene((g, t) => {
    if (A.phase === 'between') return;
    const k = cur();
    const r = rounds[k];
    const geo = geos[k];
    const run = A.phase === 'resolve' ? shot : null;
    const rt = run ? A.rt : 0;
    const pose = run ? stripPose(r, run.fault, rt) : null;
    const shown = run ? run.gears : gears;
    const cell = pose ? Math.max(0, Math.min(CELLS - 1, Math.floor((pose.x - r.lo) / r.width))) : 0;
    const gear: Gear = !pose || pose.state === 'finish' ? null : pose.state === 'stall' ? 'brake' : shown[cell];
    drawStage({
      A, g, t, geo, assist: r.assist, k, rt, pose, gear, flagAt: r.hi, gateAt: null, idleX: r.lo - (30 * (r.hi - r.lo)) / (ROAD.x1 - ROAD.x0),
      outcome: run && !run.ok ? 'crash' : 'win', impact: run ? impactTime(run.fault) : 99, fogLimit: run?.fault ? geo.X(r.lo + (run.fault.cell + 1) * r.width) : Infinity,
      flags: run ? run.flags : { landed: false, honk: false }, puffs,
    });
    if (scout) {
      const age = A.clock - scout.t0;
      if (age > 2.2) scout = null;
      else scoutDrone(g, t, age, ROAD.x0 + (scout.cell + 0.5) * 65, r.fp(mid(r, scout.cell)) > 0 ? 'up' : 'down');
    }
    gearStrip(g, shown, run ? -1 : last, Array.from({ length: CELLS + 1 }, (_, i) => edgeText(r, i)), A.phase === 'play', A.clock, level === 1 && k === 0 && !touched && A.phase === 'play');
    billboard(g, ['ROAD PLAN', r.trig ? `${r.text}, 0 ≤ x ≤ 2π` : r.text]);
    if (A.phase === 'play') goalLine(g, GOALS[level - 1], A.t);
    if (run && rt > impactTime(run.fault) + 0.1) verdict(g, run.ok, 'STAGE CLEAR', 'CRASH');
  });
  A.mountAll();
  return A.run();
}

// ---- Level 5: the road builder (one dial) -------------------------------------------------------------------------------------------------------------

function builderLevel(random: () => number): DialLevel<BuildRound> {
  const rounds = buildBuilder(random);
  const puffs = makePuffs();
  let seen: unknown = null;
  let flags = { landed: false, honk: false };
  let scout: { t0: number; a: number } | null = null;
  let asked = false;
  let lastK = -1;
  let touched = false;
  return {
    hero: hero(5),
    rounds,
    charges: [1, 1, 0],
    dials: [{ key: 'a', aria: 'Roadworks setting a', label: 'Set a', unit: '', step: 1, min: (r: BuildRound) => r.min, max: (r: BuildRound) => r.max, start: (r: BuildRound) => r.start, text: (v: number) => `a = ${num(v)}` }],
    handles: [{ ...trackHandle<BuildRound>('a', (r) => r.min, (r) => r.max), radius: KNOB_R }],
    test: { button: '🛰 Scout', aria: 'Scout: read the slope at the start gate', read: (r, v) => { asked = true; return buildScout(r, v.a); } },
    fire: { button: '🏁 Drive', aria: 'Drive the stage' },
    judge: (r, v) => judgeBuild(r, v.a),
    miss: (r, v) => buildMiss(r, v.a),
    win: (r) => `Stage clear! ${buildExplain(r)}`,
    hint: (r) => `${buildIntel(r)} ${assistLine(r.assist, 'scout')}`,
    hit: (r) => [ROAD.x0 + ((r.n + 4) / 8) * (ROAD.x1 - ROAD.x0), 120],
    delay: 1.3,
    draw: ({ g, r, v, k, t, rt, shot, A }) => {
      if (k !== lastK) {
        lastK = k;
        scout = null;
      }
      if (shot !== seen) {
        seen = shot;
        flags = { landed: false, honk: false };
      }
      if (asked) {
        asked = false;
        scout = { t0: A.clock, a: v.a };
      }
      const a = v.a;
      const geo = makeGeo(roadF(r, a), -4, 4);
      const fault = buildFault(r, a);
      const pose = shot ? buildPose(r, fault, rt) : null;
      drawStage({
        A, g, t, geo, assist: r.assist, k, rt, pose, gear: pose ? r.gear : null, flagAt: r.n, gateAt: r.m, idleX: r.m,
        outcome: fault === null ? 'win' : fault === 'late' ? 'crash' : 'void', impact: 1.3, fogLimit: Infinity, flags, puffs,
      });
      if (scout) {
        const age = A.clock - scout.t0;
        if (age > 2.2) scout = null;
        else {
          const s = roadFp(r, scout.a)(r.m);
          scoutDrone(g, t, age, geo.X(r.m), s > 0 ? 'up' : s < 0 ? 'down' : 'flat');
        }
      }
      const tt = turnAt(r, a);
      if (shot && fault === 'early' && rt >= 1.3 && tt !== null && tt >= -4 && tt <= 4) text(g, '✕', geo.X(tt), geo.Y(geo.f(tt)), PAL.red, 22);
      billboard(g, [`ROADWORKS · stage x = ${num(r.m)} → ${num(r.n)}`, buildFormula(r), `GEAR: ${r.gear === 'gas' ? '⬆ GAS' : '⬇ BRAKE'} for the whole stage`]);
      if (v.a !== r.start) touched = true;
      trackBar(g, r.min, r.max, TRACK.x0, TRACK.x1, TRACK.y);
      knob(g, TRACK.x0 + ((v.a - r.min) / (r.max - r.min)) * (TRACK.x1 - TRACK.x0), TRACK.y, `a = ${num(v.a)}`, t, k === 0 && !touched && !shot);
      if (A.phase === 'play') goalLine(g, GOALS[4], A.t);
      if (shot && rt > 1.4) verdict(g, shot.ok, 'STAGE CLEAR', fault === 'early' ? 'STAGE VOIDED' : 'CRASH');
    },
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(5, ctx.level));
    return n <= 4 ? mountStrip(ctx, n as 1 | 2 | 3 | 4) : mountDialLevel(ctx as never, builderLevel(ctx.random) as never, ARIA5);
  },
});
