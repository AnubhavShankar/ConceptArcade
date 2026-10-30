// Inspirations (code comment only): Tony Hawk's Pro Skater and motocross stunt games (land the flip or crash), Trials (physics wipe-outs), and nitro-boost
// racing games (boost to clear a gap). The player drags the landing ramp (spin rounds) or the nitro cut-off cone (boost rounds) along the course, then launches.
// Blaze spins by exactly F(x) − F(p) in the air, so a clean flight really ends upright and a bad one really comes down at the wrong attitude.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type SceneInput } from '@core/dialgame';
import { backdrop, num } from '@core/mathkit';
import { glow, line, text } from '@core/neon';
import { bike, checkFlag, crowd, dirt, kicker, landingRamp, portrait, rider, rr, sign, speedo, spinGauge, starsAround, towers, type CrowdMode, type G, type Mood, type Pose } from './art';
import { BOOST_LAND, SPIN_LAND, V0, buildRounds, fault, hintText, judge, landTime, missText, speedText, testText, value, winText, type Fault, type Round } from './logic';

const ARIA = 'A stunt rider on a dirt bike at a kicker ramp, with a landing ramp or a nitro cone the player places along the course.';
const ROLE = 'a stunt rider on a dirt bike at a freestyle show';
const HEROES = [
  {
    story: 'In the air Blaze spins backwards at ω(x) radians per metre, where x is the distance along the course. The total spin from the kicker at x = p to the landing ramp at x = q is the definite integral of ω. A backflip lands clean only if the total is exactly 2π; the boss trick is a double backflip, 4π.',
    objective: 'Place the landing ramp so every flip lands clean, in three rounds.',
  },
  {
    story: 'This bike spins faster and faster near the end of its arc: the rate has the form k/√(a² − x²). The same rule holds: the total spin must be exactly the trick.',
    objective: 'Place the landing ramp so every flip lands clean, in three rounds.',
  },
  {
    story: 'The canyon jump. The nitro raises the speed by k(x) of itself per metre, so over the strip the speed is multiplied by e^(∫k dx). Blaze starts at 40 km/h and must reach the lip at exactly the speed the canyon needs.',
    objective: 'Place the nitro cut-off cone so the bike clears the canyon and lands on the pad, in three rounds.',
  },
  {
    story: 'The rates are written with the square not yet completed, such as 16/(x² − 6x + 13). Complete the square to reach a standard form, then integrate. The boss round is a canyon jump.',
    objective: 'Land two flips and clear the canyon, in three rounds.',
  },
];

const SPIN = { x0: 90, span: 470, ground: 280, kickTop: 208, landTop: 228 };
const Xs = (r: Round, x: number) => SPIN.x0 + ((x - r.p) / (r.hi - r.p)) * SPIN.span;
const BOOST = { x0: 50, span: 390, road: 250, lip: 460, padX0: 540, padX1: 600, sign: 608 };
const Xb = (r: Round, x: number) => BOOST.x0 + ((x - r.p) / (r.hi - r.p)) * BOOST.span;
const SC = 0.65; // the bike is drawn smaller in the canyon scene
const BLEND0 = 1.15; // a losing flight eases into its landing pose over the last 0.2 s

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (u: number) => clamp01(u) * clamp01(u) * (3 - 2 * clamp01(u));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const wrapPi = (a: number) => ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
const clampX = (x: number) => Math.max(110, Math.min(530, x));

// ---- Where the bike and the rider are during a jump ------------------------------------------------------------------------------------------------------

interface Frame {
  bx: number;
  by: number;
  ang: number;
  /** The pose of the rider on the bike. */
  pose: Pose;
  compress: number;
  nitro: boolean;
  wheel: number;
  squash: number;
  scale: number;
  mood: Mood;
  /** The rider thrown off the bike, drawn on their own. */
  sep: { x: number; y: number; ang: number; pose: Pose; starsAt: [number, number] | null } | null;
}
const frame = (bx: number, by: number, ang: number, pose: Pose, wheel: number, extra: Partial<Frame> = {}): Frame => ({ bx, by, ang, pose, compress: 0, nitro: false, wheel, squash: 1, scale: 1, mood: 'happy', sep: null, ...extra });

const kickerY = (x: number) => SPIN.ground - (SPIN.ground - SPIN.kickTop) * clamp01(x / SPIN.x0);
/** Height of the landing ramp's surface at x for a ramp whose flat top starts at xs. */
function rampY(xs: number, x: number): number {
  const { ground, landTop } = SPIN;
  if (x < xs - 36) return ground;
  if (x < xs) return ground - ((ground - landTop) * (x - (xs - 36))) / 36;
  if (x <= xs + 30) return landTop;
  if (x <= xs + 90) return landTop + ((ground - landTop) * (x - xs - 30)) / 60;
  return ground;
}
/** The exact turn of the bike at the fraction s of the flight: minus the integral of ω from the kicker to the world x reached (a backflip turns anticlockwise). */
const turn = (r: Round, q: number, s: number) => -(r.F(r.p + s * (q - r.p)) - r.F(r.p));

function flightPos(r: Round, q: number, s: number): [number, number] {
  const x0 = Xs(r, r.p);
  const xl = Xs(r, q) + 15;
  const H = 60 + 0.12 * (Xs(r, q) - x0);
  return [lerp(x0, xl, s), lerp(SPIN.kickTop, SPIN.landTop, s) - 4 * H * s * (1 - s)];
}

/** The spin jump `rt` seconds after the launch, for the ramp set at q. */
function spinFrame(r: Round, q: number, rt: number, ft: Fault | null): Frame {
  const xp = Xs(r, r.p);
  const xl = Xs(r, q) + 15;
  const xs = Xs(r, q);
  const wheel = rt * 35;
  if (rt < 0.35) {
    const x = lerp(40, xp, rt / 0.35);
    return frame(x, kickerY(x) - 20, -0.4, 'ride', wheel);
  }
  if (rt < SPIN_LAND) {
    const s = (rt - 0.35) / 1.0;
    const [x, cy] = flightPos(r, q, s);
    let ang = turn(r, q, s) - 0.4 * Math.max(0, 1 - s / 0.2);
    if (ft && rt > BLEND0) {
      // The flight is exact; a losing one eases from where it is into the landing it is going to make (the pose the verdict names).
      const s0 = BLEND0 - 0.35;
      const a0 = wrapPi(turn(r, q, s0));
      const touch = ft === 'under' ? -0.45 : ft === 'over' ? 0.5 : a0 >= 0 ? Math.PI : -Math.PI;
      ang = lerp(a0 + (turn(r, q, s) - turn(r, q, s0)), touch, ease((rt - BLEND0) / (SPIN_LAND - BLEND0)));
    }
    return frame(x, cy - 20, ang, 'air', wheel, { nitro: false });
  }
  const tl = rt - SPIN_LAND;
  const top = SPIN.landTop;
  const lie = (lx: number, u: number, from: [number, number], pose: Pose, dir: 1 | -1): Frame['sep'] => {
    const ly = rampY(xs, lx) - 6;
    const e = ease(u);
    const x = lerp(from[0], lx, e);
    const y = lerp(from[1], ly, e) - 28 * 4 * e * (1 - e);
    return { x, y, ang: (dir * Math.PI * (u < 1 ? e : 1)) / 2, pose: u < 1 ? 'launched' : pose, starsAt: u >= 1 && pose === 'dizzy' ? [lx + dir * 24, ly - 14] : null };
  };
  if (!ft) {
    const bump = tl < 0.12 ? Math.sin((Math.PI * tl) / 0.12) : 0;
    return frame(xl, top - 20, 0, tl < 0.45 ? 'stand' : 'fist', wheel, { compress: bump, mood: tl < 0.1 ? 'happy' : 'cheer' });
  }
  if (ft === 'under') {
    const x = xl - 40 * ease(tl / 0.7);
    const side = ease((tl - 0.5) / 0.3);
    const f = frame(x, rampY(xs, x) - 20 + 8 * side, lerp(-0.45, -0.1, ease(tl / 0.5)), 'air', wheel * (1 - ease(tl / 0.4)), { squash: 1 - 0.5 * side, mood: tl < 0.5 ? 'worried' : 'dizzy' });
    if (tl >= 0.3) f.sep = lie(xl - 52, (tl - 0.3) / 0.4, [x - 7, f.by - 14], 'dizzy', -1);
    return f;
  }
  if (ft === 'over') {
    const tumble = ease(tl / 0.7);
    const by = rampY(xs, xl) - 22 - 12 * Math.sin(Math.PI * clamp01(tl / 0.7));
    const f = frame(xl, by, 0.5 + (0.4 + 2 * Math.PI) * tumble, 'air', 0, { compress: tl < 0.15 ? 0.6 : 0, mood: tl < 0.9 ? 'worried' : 'dizzy' });
    const u = clamp01(tl / 0.5);
    const lx = xl + 60;
    const ly = rampY(xs, lx) - 6;
    const e = ease(u);
    f.sep = { x: lerp(xl + 4, lx, e), y: lerp(by - 18, ly, e) - 44 * 4 * e * (1 - e), ang: u * (Math.PI / 2 + 2 * Math.PI), pose: u < 1 ? 'launched' : tl > 0.9 ? 'dizzy' : 'fall', starsAt: u >= 1 && tl > 0.9 ? [lx + 24, ly - 14] : null };
    if (u >= 1) f.sep.ang = Math.PI / 2;
    return f;
  }
  // wayUnder / wayOver: lands upside down, bounces once, lies wheels-up with the rider dizzy beside it
  const a0 = wrapPi(turn(r, q, BLEND0 - 0.35));
  const T = a0 >= 0 ? Math.PI : -Math.PI;
  const f = frame(xl, rampY(xs, xl) - 16 - 18 * Math.sin(Math.PI * clamp01(tl / 0.4)), T, 'air', 0, { mood: tl < 0.5 ? 'worried' : 'dizzy' });
  if (tl >= 0.3) f.sep = lie(xl - 30, (tl - 0.3) / 0.3, [xl - 6, f.by - 14], 'dizzy', -1);
  return f;
}

/** Where the bike lands in the canyon scene for a speed ratio: the pad centre at 1, short of the pad for less, past the pad for more. */
function landXFor(ratio: number): number {
  const dev = Math.log(ratio);
  if (Math.abs(dev) < 1e-9) return 585;
  return dev < 0 ? 520 - 60 * Math.min(1, -dev * 2) : 615 + 150 * Math.min(1, dev * 2);
}
const FLY0 = 1.0;
const FLY = BOOST_LAND - FLY0;
const X1 = BOOST.lip - 12;

interface BoostOut {
  f: Frame;
  /** Seconds since the bike hit the billboard, or -1. */
  hit: number;
  /** Contact height of the bike (for the splash). */
  contact: number;
}
function boostFrame(r: Round, q: number, rt: number, ft: Fault | null): BoostOut {
  const road = BOOST.road;
  const mk = (x: number, contact: number, ang: number, pose: Pose, extra: Partial<Frame> = {}): Frame => frame(x, contact - 20 * SC, ang, pose, rt * 40, { scale: SC, ...extra });
  const landX = landXFor(value(r, q) / r.target);
  if (rt < FLY0) {
    const x = lerp(Xb(r, r.p) - 30, X1, rt / FLY0);
    return { f: mk(x, road, 0, 'ride', { nitro: x < Xb(r, q) }), hit: -1, contact: road };
  }
  const at = (u: number): [number, number] => [lerp(X1, landX, u), road - 200 * u * (1 - u)];
  const tilt = (u: number) => 0.8 * Math.atan2(-200 * (1 - 2 * u), Math.max(40, landX - X1));
  if (ft === 'long') {
    const uHit = (588 - X1) / (landX - X1);
    const tHit = FLY0 + FLY * uHit;
    if (rt < tHit) {
      const u = (rt - FLY0) / FLY;
      const [x, y] = at(u);
      return { f: mk(x, y, tilt(u), 'air'), hit: -1, contact: y };
    }
    const yHit = at(uHit)[1];
    const tl = rt - tHit;
    const y = Math.min(road, yHit + 500 * tl * tl);
    const f = mk(588 - 6 * ease(tl / 0.15), y, 0.9 * ease(tl / 0.5), 'air', { compress: tl < 0.15 ? 0.7 : 0, mood: tl < 0.6 ? 'worried' : 'dizzy', wheel: 0 });
    if (tl >= 0.1) {
      const u = clamp01((tl - 0.1) / 0.4);
      const e = ease(u);
      const ly = road - 6;
      f.sep = { x: lerp(586, 566, e), y: lerp(y - 24 * SC, ly, e) - 30 * 4 * e * (1 - e), ang: -(Math.PI / 2) * e, pose: u < 1 ? 'launched' : 'dizzy', starsAt: u >= 1 ? [566 - 24, ly - 14] : null };
    }
    return { f, hit: tl, contact: y };
  }
  if (rt < BOOST_LAND) {
    const u = (rt - FLY0) / FLY;
    const [x, y] = at(u);
    return { f: mk(x, y, tilt(u), 'air'), hit: -1, contact: y };
  }
  const tl = rt - BOOST_LAND;
  if (!ft) {
    const bump = tl < 0.12 ? Math.sin((Math.PI * tl) / 0.12) : 0;
    const wheelie = ease((tl - 0.15) / 0.2) * (1 - ease((tl - 0.8) / 0.2));
    return { f: mk(585 + 7 * ease(tl / 0.5), road, -0.35 * wheelie, tl > 0.5 ? 'fist' : 'stand', { compress: bump, mood: tl < 0.1 ? 'happy' : 'cheer' }), hit: -1, contact: road };
  }
  // short: keeps falling with the speed it had, nose down, shrinking, into the river
  const vx = (landX - X1) / FLY;
  const y = road + 364 * tl + 500 * tl * tl;
  return { f: mk(landX + vx * tl, y, tilt(1) + 0.5 * tl, 'air', { scale: SC * (1 - 0.25 * (tl / 0.55)), mood: 'worried' }), hit: -1, contact: y };
}

// ---- The scene --------------------------------------------------------------------------------------------------------------------------------------------

function drawFrame(g: G, t: number, f: Frame) {
  if (f.by - f.scale * 20 > 400) return;
  const o = { pose: f.pose, mood: f.mood, nitro: f.nitro, wheel: f.wheel, compress: f.compress, scale: f.scale, squash: f.squash };
  if (f.sep) {
    bike(g, f.bx, f.by, f.ang, t, o);
    rider(g, f.sep.x, f.sep.y, f.sep.ang, t, { ...o, pose: f.sep.pose, squash: 1 });
    if (f.sep.starsAt) starsAround(g, f.sep.starsAt[0], f.sep.starsAt[1], t);
  } else rider(g, f.bx, f.by, f.ang, t, o);
}

/** The idle bike before a launch: it vibrates, puffs grey exhaust every 0.5 s and the rider bobs. */
function idle(t: number, f: Frame): Frame {
  return { ...f, bx: f.bx + Math.sin(t * 60), by: f.by + Math.sin(t * 5) * 0.8 };
}
function puff(g: G, x: number, y: number, t: number) {
  const age = t % 0.5;
  g.fillStyle = `rgba(200,205,230,${0.5 * (1 - age / 0.5)})`;
  g.beginPath();
  g.arc(x - age * 40, y - age * 14, 2 + age * 8, 0, Math.PI * 2);
  g.fill();
}

interface Fx {
  shot: unknown;
  landed: boolean;
  splash: boolean;
  smash: boolean;
}

function level(n: 1 | 2 | 3 | 4, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  let testPending = false;
  let testAt = -10;
  let testQ = 0;
  let lastK = -1;
  let lastQ = 0;
  const fx: Fx = { shot: null, landed: false, splash: false, smash: false };

  function drawSpin(s: SceneInput<Round>) {
    const { g, r, t, rt, shot, A } = s;
    const q = s.v.q;
    const ft = shot ? fault(r, q) : null;
    const xs = Xs(r, q);
    const win = !!shot && shot.ok;
    const done = !!shot && rt >= SPIN_LAND;
    const mode: CrowdMode = done ? (win ? 'cheer' : 'groan') : 'idle';
    backdrop(g);
    towers(g, SPIN.ground);
    crowd(g, t, mode, 262);
    dirt(g, SPIN.ground);
    kicker(g, SPIN.x0, SPIN.kickTop, SPIN.ground);
    landingRamp(g, xs, SPIN.landTop, SPIN.ground);
    // metre marks, with the kicker's own mark
    for (let x = r.lo; x <= r.hi; x++) {
      line(g, Xs(r, x), 291, Xs(r, x), 297, PAL.dim, 1.5);
      text(g, num(x), Xs(r, x), 309, PAL.dim, 10);
    }
    line(g, SPIN.x0, 288, SPIN.x0, 297, PAL.green, 2);
    text(g, `${num(r.p)} kicker`, SPIN.x0, 321, PAL.green, 10);
    sign(g, 10, 8, 300, 40, 'SPIN RATE', `ω(x) = ${r.rate}`);
    // helpers: live in round 1, for 1.8 s after a test run in round 2, never in round 3
    const testing = !shot && r.assist === 1 && t - testAt < 1.8;
    const gaugeQ = testing ? testQ : q;
    if (r.assist === 0 || testing) {
      const total = value(r, gaugeQ);
      spinGauge(g, 560, 60, 34, (total * 180) / Math.PI, 0);
      if (!shot) {
        rider(g, Xs(r, gaugeQ) + 15, SPIN.landTop - 20, wrapPi(-total), t, { pose: 'stand', mood: 'happy', nitro: false, wheel: 0, compress: 0, alpha: 0.35 });
      }
    }
    let f: Frame;
    if (shot) f = spinFrame(r, q, rt, ft);
    else {
      f = idle(t, frame(40, kickerY(40) - 20, -0.4, 'ride', 0));
      puff(g, f.bx - 30, f.by - 1, t);
    }
    drawFrame(g, t, f);
    // one-time effects at the moment of landing
    if (shot && fx.shot !== shot) Object.assign(fx, { shot, landed: false });
    if (shot && rt >= SPIN_LAND && !fx.landed) {
      fx.landed = true;
      const lx = Xs(r, q) + 15;
      if (win) {
        A.burst(lx, SPIN.landTop, '#c9a27a', 20, 140);
        A.float(r.target > 3 * Math.PI ? 'DOUBLE BACKFLIP!' : 'BACKFLIP!', clampX(lx), SPIN.landTop - 96, PAL.yellow);
        A.float('WOOO!', 160, 240, PAL.yellow);
      } else {
        if (ft === 'wayUnder' || ft === 'wayOver') A.burst(lx, SPIN.landTop, PAL.yellow, 24, 180);
        else A.burst(lx, SPIN.landTop, '#c9a27a', 14, 110);
        const say = ft === 'under' ? ['LOOPED OUT!', PAL.orange] : ft === 'over' ? ['OVER THE BARS!', PAL.red] : ['UPSIDE DOWN!', PAL.red];
        A.float(say[0], clampX(lx), SPIN.landTop - 96, say[1]);
        A.float('OOOH…', 160, 240, PAL.dim);
      }
    }
    const mood: Mood = !done ? 'happy' : win ? 'cheer' : rt - SPIN_LAND < 0.5 ? 'worried' : 'dizzy';
    portrait(g, 14, 56, mood, t);
  }

  function drawBoost(s: SceneInput<Round>) {
    const { g, r, t, rt, shot, A } = s;
    const q = s.v.q;
    const ft = shot ? fault(r, q) : null;
    const road = BOOST.road;
    const win = !!shot && shot.ok;
    const done = !!shot && rt >= BOOST_LAND;
    backdrop(g);
    crowd(g, t, done ? (win ? 'cheer' : 'groan') : 'idle', road - 4, 20, 430, 9, BOOST.lip);
    // road, canyon, pad
    g.fillStyle = '#2a2d3d';
    g.fillRect(0, road, BOOST.lip, 14);
    line(g, 0, road + 7, BOOST.lip, road + 7, '#caced9', 1.5, [12, 10]);
    g.fillStyle = '#1b1a26';
    g.fillRect(0, road + 14, BOOST.lip, 340 - road - 14);
    g.fillStyle = '#10101c';
    g.fillRect(BOOST.lip, road, BOOST.padX0 - BOOST.lip, 340 - road);
    g.fillStyle = '#1b1a26';
    g.fillRect(BOOST.padX0, road, 640 - BOOST.padX0, 340 - road);
    g.fillStyle = '#2a2d3d';
    g.fillRect(BOOST.padX0, road, 640 - BOOST.padX0, 14);
    g.fillStyle = 'rgba(77,225,255,0.55)';
    g.fillRect(BOOST.lip, 330, BOOST.padX0 - BOOST.lip, 10);
    for (let i = 0; i < 6; i++) line(g, BOOST.lip + 6 + i * 13, 334 + Math.sin(t * 3 + i) * 2, BOOST.lip + 14 + i * 13, 334 + Math.sin(t * 3 + i) * 2, PAL.white, 1.2);
    checkFlag(g, 570, road, t);
    // metre marks under the road
    for (let x = r.lo; x <= r.hi; x++) {
      line(g, Xb(r, x), road + 16, Xb(r, x), road + 22, PAL.dim, 1.5);
      text(g, num(x), Xb(r, x), 278, PAL.dim, 10);
    }
    line(g, Xb(r, r.p), road + 16, Xb(r, r.p), road + 22, PAL.green, 2);
    text(g, `${num(r.p)} nitro starts`, Xb(r, r.p), 292, PAL.green, 10);
    // nitro strip with pulsing chevrons, and the cut-off cone (the drag handle)
    const a = Xb(r, r.p);
    const b = Xb(r, q);
    for (let x = a + 6; x < b - 4; x += 14) {
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(t * 5 - x / 20));
      g.globalAlpha = pulse;
      glow(g, PAL.cyan, 6, () => {
        line(g, x, road + 3, x + 5, road + 7, PAL.cyan, 2);
        line(g, x + 5, road + 7, x, road + 11, PAL.cyan, 2);
      });
    }
    g.globalAlpha = 1;
    g.fillStyle = PAL.orange;
    g.beginPath();
    g.moveTo(b - 8, road);
    g.lineTo(b + 8, road);
    g.lineTo(b + 2.5, road - 22);
    g.lineTo(b - 2.5, road - 22);
    g.closePath();
    g.fill();
    g.fillStyle = PAL.white;
    g.fillRect(b - 5.5, road - 12, 11, 4);
    g.fillStyle = '#c8681d';
    g.fillRect(b - 10, road - 1, 20, 3);
    // the billboard (posts and a board), which tilts and falls when hit
    const out = shot ? boostFrame(r, q, rt, ft) : null;
    g.save();
    g.translate(BOOST.sign + 16, road);
    if (out && out.hit >= 0) {
      g.rotate(Math.min(1.4, out.hit * 3));
      g.globalAlpha = Math.max(0.35, 1 - out.hit);
    }
    line(g, -10, 0, -10, -28, '#6b4a2b', 3);
    line(g, 10, 0, 10, -28, '#6b4a2b', 3);
    g.fillStyle = '#a0703c';
    rr(g, -16, -74, 32, 46, 3);
    g.fill();
    text(g, 'BIG', 0, -56, PAL.white, 10);
    text(g, 'AIR', 0, -42, PAL.yellow, 10);
    g.restore();
    sign(g, 10, 8, 300, 56, 'NITRO RATE', `k(x) = ${r.rate}`, `start 40 km/h · needs ${speedText(r)}`);
    // speedometer helper: live in round 1, for 1.8 s after a test run in round 2, never in round 3
    const testing = !shot && r.assist === 1 && t - testAt < 1.8;
    if (r.assist === 0 || testing) speedo(g, 560, 64, 36, V0 * value(r, testing ? testQ : q), V0 * r.target);
    // the bike
    let f: Frame;
    if (out) f = out.f;
    else {
      f = idle(t, frame(Xb(r, r.p) - 30, road - 20 * SC, 0, 'ride', 0, { scale: SC }));
      puff(g, f.bx - 30 * SC, f.by - 1, t);
    }
    if (out && out.f.nitro) {
      const grow = clamp01((out.f.bx - a) / Math.max(20, b - a));
      for (let i = 0; i < 5; i++) line(g, out.f.bx - 24 - i * 3, out.f.by - 14 + i * 6, out.f.bx - 30 - (6 + 30 * grow) - i * 3, out.f.by - 14 + i * 6, 'rgba(255,255,255,0.5)', 1.4);
    }
    drawFrame(g, t, f);
    if (shot && fx.shot !== shot) Object.assign(fx, { shot, landed: false, splash: false, smash: false });
    if (out && !fx.smash && out.hit >= 0) {
      fx.smash = true;
      A.burst(BOOST.sign, 200, '#a0703c', 26, 200);
    }
    if (out && !fx.splash && ft === 'short' && out.contact >= 330) {
      fx.splash = true;
      A.burst(out.f.bx, 330, PAL.cyan, 24, 160);
    }
    if (shot && rt >= BOOST_LAND && !fx.landed) {
      fx.landed = true;
      if (win) {
        A.burst(585, road, '#c9a27a', 20, 140);
        A.float('BIG AIR!', 540, road - 100, PAL.yellow);
        A.float('WOOO!', 160, 240, PAL.yellow);
      } else {
        A.float(ft === 'short' ? 'INTO THE CANYON!' : 'THROUGH THE BILLBOARD!', 400, road - 100, ft === 'short' ? PAL.orange : PAL.red);
        A.float('OOOH…', 160, 240, PAL.dim);
      }
    }
    const tHitDone = out && out.hit >= 0;
    const mood: Mood = !shot ? 'happy' : win ? (done ? 'cheer' : 'happy') : tHitDone || (done && rt - BOOST_LAND < 0.5) ? 'worried' : done ? 'dizzy' : 'happy';
    portrait(g, 14, 70, mood, t);
  }

  return {
    hero: { name: 'Blaze', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials: [{ key: 'q', aria: 'Position of the landing ramp or the nitro cut-off, in metres', label: 'Place at', unit: 'm', step: 1, min: (r) => r.lo, max: (r) => r.hi, start: (r) => r.start, text: (v) => `x = ${num(v)}` }],
    handles: [
      {
        dial: 'q',
        at: (r, v) => (r.kind === 'spin' ? [Xs(r, v.q) + 15, SPIN.landTop - 6] : [Xb(r, v.q), BOOST.road - 14]),
        drag: (r, px) => r.p + ((px - (r.kind === 'spin' ? SPIN.x0 + 15 : BOOST.x0)) / (r.kind === 'spin' ? SPIN.span : BOOST.span)) * (r.hi - r.p),
        radius: 18,
      },
    ],
    test: {
      button: '🧪 Test run',
      aria: 'Test run: read the spin or the speed for this setting',
      read: (r, v) => {
        testPending = true;
        testQ = v.q;
        return testText(r, v.q);
      },
    },
    fire: { button: '🏍 Launch', aria: 'Launch the jump' },
    judge: (r, v) => {
      lastQ = v.q; // the burst of the verdict appears at the player's setting, never at the winning one
      return judge(r, v.q);
    },
    miss: (r, v) => missText(r, v.q),
    win: (r) => winText(r),
    hint: (r) => hintText(r),
    hit: (r) => (r.kind === 'spin' ? [Xs(r, lastQ) + 15, SPIN.landTop] : [570, BOOST.road]),
    delay: (r) => landTime(r),
    draw: (s) => {
      if (s.k !== lastK) {
        lastK = s.k;
        testAt = -10;
        testPending = false;
      }
      if (testPending && !s.shot) {
        testPending = false;
        testAt = s.t;
      }
      if (s.r.kind === 'spin') drawSpin(s);
      else drawBoost(s);
    },
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(4, ctx.level)) as 1 | 2 | 3 | 4;
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA);
  },
});
