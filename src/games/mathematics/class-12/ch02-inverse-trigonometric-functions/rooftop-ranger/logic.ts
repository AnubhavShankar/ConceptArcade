// Pure rules of Rooftop Ranger: no DOM, no canvas. Angles are whole steps of π/12, lengths are exact surds c√root in metres.
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { shuffle } from '@core/quiz';

export type Kind = 'street' | 'range' | 'sky' | 'turret' | 'gadget';
export const KINDS: Kind[] = ['street', 'range', 'sky', 'turret', 'gadget'];
/** The four scenes. A gadget round is drawn in the sky scene (cosec) or the turret scene (sec, cot). */
export type Frame = Exclude<Kind, 'gadget'>;

/**
 * c√root metres; c carries the sign of an offset (above or below, east or west). The 15° and 75° rows of levels 1 and 3 need a second term,
 * c2√root2: a tan 75° distance is a(2 + √3) and a sin 15° height is b(√6 − √2).
 */
export interface Surd {
  c: number;
  root: 1 | 2 | 3 | 6;
  c2?: number;
  root2?: 1 | 2 | 3 | 6;
}
export interface Round {
  kind: Kind;
  /** Street levels: the roof height and the street distance to the robot. */
  h?: Surd;
  d?: Surd;
  /** Sky and turret levels: the laser range to the target. */
  r?: number;
  /** Sky level: height of the target above the scope (negative below it). */
  y?: Surd;
  /** Turret level: how far east of the turret the target is (negative is west). */
  x?: Surd;
  /** The one tilt or bearing that hits, in steps of π/12. */
  k: number;
  /** Range level: the straight-line distance the range turret must be set to, m. */
  range?: number;
  assist: 0 | 1 | 2;
  /** Gadget level: which reciprocal the scope shows, and the reading as written on its screen. */
  fn?: 'sec' | 'cosec' | 'cot';
  ratio?: string;
  /** Where the target is drawn. The picture is not to scale, so it never shows the angle. */
  vx: number;
  vy: number;
}

export const STEP = Math.PI / 12;
export const DIAL = {
  tilt: { min: -6, max: 6 },
  pan: { min: 0, max: 12 },
  range: { min: 5, max: 60 },
};
/** The scope muzzle (street and range), the balcony (sky) and the wall turret (turret) on the canvas. */
export const ORIGIN: Record<Frame, [number, number]> = { street: [80, 80], range: [80, 80], sky: [80, 170], turret: [240, 300] };
export const GROUND: Record<Frame, number> = { street: 286, range: 286, sky: 330, turret: 300 };
/** The scene a round is drawn in (and the geometry its target follows). */
export const frame = (r: Round): Frame => (r.kind === 'gadget' ? (r.fn === 'cosec' ? 'sky' : 'turret') : r.kind);

export const value = (s: Surd) => s.c * Math.sqrt(s.root) + (s.c2 === undefined ? 0 : s.c2 * Math.sqrt(s.root2!));
export const square = (s: Surd) => (s.c2 === undefined ? s.c * s.c * s.root : value(s) ** 2);
const term = (c: number, root: number) => (root === 1 ? `${c}` : `${c === 1 ? '' : c}√${root}`);
export function surdText(s: Surd): string {
  if (s.c2 !== undefined) {
    // Two terms, written with their common factor out: 10(2 + √3), 4(√6 − √2), −(√6 − √2).
    const sg = s.c < 0 ? -1 : 1;
    const a = s.c * sg;
    const b = s.c2 * sg;
    const f = gcd(a, Math.abs(b));
    return `${sg < 0 ? '−' : ''}${f === 1 ? '' : f}(${term(a / f, s.root)} ${b < 0 ? '−' : '+'} ${term(Math.abs(b) / f, s.root2!)})`;
  }
  const sign = s.c < 0 ? '−' : '';
  const c = Math.abs(s.c);
  return `${sign}${term(c, s.root)}`;
}
/** The same length with the sign flipped, and the length without its sign. */
export const flip = (s: Surd): Surd => (s.c2 === undefined ? { ...s, c: -s.c } : { ...s, c: -s.c, c2: -s.c2 });
export const absSurd = (s: Surd): Surd => (s.c < 0 ? flip(s) : s);
/** A length inside a fraction: a two-term one gets brackets. */
const grp = (s: Surd) => {
  const t = surdText(s);
  return s.c2 === undefined || /^\(.*\)$/.test(t) ? t : `(${t})`;
};

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
/** k steps of π/12 written the textbook way: −π/6, 2π/3, π. */
export function piText(k: number): string {
  if (k === 0) return '0';
  const a = Math.abs(k);
  const g = gcd(a, 12);
  const n = a / g;
  const d = 12 / g;
  return `${k < 0 ? '−' : ''}${n === 1 ? '' : n}π${d === 1 ? '' : `/${d}`}`;
}
export const degText = (k: number) => `${k < 0 ? '−' : ''}${Math.abs(k) * 15}°`;
export const angleText = (k: number) => `${piText(k)} (${degText(k)})`;

/** The exact ratios of the special angles, by function and step. */
const TAN: Record<number, string> = { 1: '2 − √3', 2: '1/√3', 3: '1', 4: '√3', 5: '2 + √3' };
const SIN: Record<number, string> = { 0: '0', 1: '(√6 − √2)/4', 2: '1/2', 3: '1/√2', 4: '√3/2', 5: '(√6 + √2)/4', 6: '1' };
const COS: Record<number, string> = { 0: '1', 2: '√3/2', 3: '1/√2', 4: '1/2', 6: '0', 8: '−1/2', 9: '−1/√2', 10: '−√3/2', 12: '−1' };
/** −s, with brackets round a sum such as 2 − √3. */
const neg = (s: string) => (s === '0' ? s : s.startsWith('−') ? s.slice(1) : s.startsWith('(') || !s.includes(' ') ? `−${s}` : `−(${s})`);
export const tanText = (k: number) => (k < 0 ? neg(TAN[-k]) : TAN[k]);
export const sinText = (k: number) => (k < 0 ? neg(SIN[-k]) : SIN[k]);
export const cosText = (k: number) => COS[k];

/** What the gadget scope shows, by step k: sec θ = r/x, cosec θ = r/y, cot θ = x/y. */
const SEC: Record<number, string> = { 2: '2/√3', 3: '√2', 4: '2', 8: '−2', 9: '−√2', 10: '−2/√3' };
const COSEC: Record<number, string> = { 2: '2', 3: '√2', 4: '2/√3', 6: '1', [-2]: '−2', [-3]: '−√2', [-4]: '−2/√3', [-6]: '−1' };
const COT: Record<number, string> = { 2: '√3', 3: '1', 4: '1/√3', 6: '0', 8: '−1/√3', 9: '−1', 10: '−√3' };
export const GADGET = { sec: SEC, cosec: COSEC, cot: COT };
/** tan θ written out, for the cot working. */
const TAN_OF: Record<number, string> = { 2: '1/√3', 3: '1', 4: '√3', 8: '−√3', 9: '−1', 10: '−1/√3' };

/** Sides of the right triangle for a tilt of m steps (2, 3, 4 = π/6, π/4, π/3) with hypotenuse 2b: [opposite, adjacent]. */
function sides(m: number, b: number): [Surd, Surd] {
  if (m === 2) return [{ c: b, root: 1 }, { c: b, root: 3 }];
  if (m === 3) return [{ c: b, root: 2 }, { c: b, root: 2 }];
  if (m === 4) return [{ c: b, root: 3 }, { c: b, root: 1 }];
  return [{ c: 2 * b, root: 1 }, { c: 0, root: 1 }];
}

const pick = <T>(xs: readonly T[], random: () => number) => xs[Math.floor(random() * xs.length) % xs.length];
const between = (lo: number, hi: number, random: () => number) => Math.round(lo + (hi - lo) * random());

/** The tilts of the street level: π/12 and 5π/12 (tan 15° = 2 − √3, tan 75° = 2 + √3) join the three special angles. */
export const STREET_STEPS = [1, 2, 3, 4, 5];
function streetRound(m: number, k: number, random: () => number): Round {
  const a = pick([10, 12, 15, 18, 20, 24, 25, 30], random);
  const sq = (c: number, root: 1 | 2 | 3): Surd => ({ c, root });
  const [h, d]: [Surd, Surd] =
    m === 1
      ? [sq(a, 1), { c: 2 * a, root: 1, c2: a, root2: 3 }]
      : m === 2
        ? [sq(a, 1), sq(a, 3)]
        : m === 3
          ? [sq(a, 1), sq(a, 1)]
          : m === 4
            ? [sq(a, 3), sq(a, 1)]
            : [{ c: 2 * a, root: 1, c2: a, root2: 3 }, sq(a, 1)];
  return { kind: 'street', h, d, k: -m, assist: aid(k), vx: between(250, 440, random), vy: GROUND.street };
}
function rangeRound(m: number, k: number, random: () => number): Round {
  const b = pick([8, 9, 10, 12, 14, 15, 16, 18, 20, 24, 25], random);
  const [h, d] = sides(m, b);
  return { kind: 'range', h, d, range: 2 * b, k: -m, assist: aid(k), vx: between(250, 440, random), vy: GROUND.range };
}
/** The tilts of the sky level: π/12 and 5π/12 (sin 15° = (√6 − √2)/4, sin 75° = (√6 + √2)/4) join π/6, π/4, π/3 and the straight-up boss. */
export const SKY_STEPS = [1, 2, 3, 4, 5];
function skyRound(m: number, up: boolean, k: number, random: () => number): Round {
  const wide = m === 1 || m === 5;
  const b = pick(wide ? [5, 6, 8, 10, 12] : [8, 10, 12, 15, 16, 18, 20, 24, 25], random);
  const opp: Surd = wide ? { c: b, root: 6, c2: m === 1 ? -b : b, root2: 2 } : sides(m, b)[0];
  const y = up ? opp : flip(opp);
  const off = between(80, 140, random);
  const vx = m === 6 ? ORIGIN.sky[0] + 6 : between(240, 380, random);
  const vy = up ? ORIGIN.sky[1] - Math.min(off, 150) : Math.min(GROUND.sky - 24, ORIGIN.sky[1] + off);
  return { kind: 'sky', r: (wide ? 4 : 2) * b, y, k: up ? m : -m, assist: aid(k), vx, vy };
}
function turretRound(step: number, k: number, random: () => number): Round {
  const b = pick([8, 10, 12, 15, 16, 18, 20, 24, 25], random);
  const m = step > 6 ? 12 - step : step;
  const [, adj] = sides(m, b);
  const x = { c: step > 6 ? -adj.c : adj.c, root: adj.root };
  const vx = step === 6 ? ORIGIN.turret[0] : ORIGIN.turret[0] + (step > 6 ? -1 : 1) * between(80, 190, random);
  return { kind: 'turret', r: 2 * b, x, k: step, assist: aid(k), vx, vy: ORIGIN.turret[1] - between(110, 230, random) };
}

/** The gadget level: round 1 sec (turret scene), round 2 cosec (sky scene), boss cot (turret scene, target above the turret, mostly obtuse). */
function gadgetRounds(random: () => number): Round[] {
  const kSec = pick([2, 3, 4, 8, 9, 10], random);
  const sec: Round = { ...turretRound(kSec, 0, random), kind: 'gadget', fn: 'sec', ratio: SEC[kSec] };
  const kCosec = pick([2, 3, 4, 6, -2, -3, -4, -6], random);
  const cosec: Round = { ...skyRound(Math.abs(kCosec), kCosec > 0, 1, random), kind: 'gadget', fn: 'cosec', ratio: COSEC[kCosec] };
  const kCot = random() < 0.6 ? pick([8, 9, 10], random) : pick([2, 3, 4, 6], random);
  const cot: Round = { ...turretRound(kCot, 2, random), kind: 'gadget', fn: 'cot', ratio: COT[kCot] };
  return [sec, cosec, cot];
}

/**
 * Three rounds of a level. Street: robots below at three different tilts out of π/12 to 5π/12 down. Range: robots below at π/6, π/4 or π/3 down.
 * Sky: targets above and below, three different tilts out of π/12 to 5π/12 and a boss that is one of them or straight up. Turret: at least one
 * robot on the west side. Gadget: sec, cosec, cot readings.
 */
export function buildRounds(level: number, random: () => number): Round[] {
  const kind = KINDS[Math.max(0, Math.min(4, level - 1))];
  if (kind === 'gadget') return gadgetRounds(random);
  if (kind === 'street') return shuffle(STREET_STEPS, random).slice(0, 3).map((m, k) => streetRound(m, k, random));
  if (kind === 'range') {
    const ms = [pick([2, 3, 4], random), 0, 0];
    ms[1] = pick([2, 3, 4].filter((m) => m !== ms[0]), random);
    ms[2] = pick([2, 3, 4], random);
    return ms.map((m, k) => rangeRound(m, k, random));
  }
  if (kind === 'sky') {
    const up = random() < 0.5;
    const ms = shuffle(SKY_STEPS, random);
    const boss = random() < 0.25 ? 6 : ms[2];
    return [skyRound(ms[0], up, 0, random), skyRound(ms[1], !up, 1, random), skyRound(boss, random() < 0.5, 2, random)];
  }
  const firstTwo = shuffle([pick([2, 3, 4], random), pick([8, 9, 10], random)], random);
  const boss = pick([6, 8, 9, 10].filter((s) => !firstTwo.includes(s)), random);
  return [...firstTwo, boss].map((s, k) => turretRound(s, k, random));
}

export interface Shot {
  k: number;
  range?: number;
}
export const judge = (r: Round, s: Shot) => s.k === r.k && (r.kind !== 'range' || s.range === r.range);

/** Where a street shot fired at tilt k lands, metres from the wall, or null when it never comes down. */
export function landing(r: Round, k: number): number | null {
  if (k >= 0) return null;
  if (k === -6) return 0;
  return value(r.h!) / Math.tan(-k * STEP);
}

function tiltEffect(r: Round, k: number): string {
  if (k > 0) return 'Your scope pointed upward, so the round sailed over the street and away into the night.';
  if (k === 0) return 'Your scope was level, so the round flew straight over the street and never came down near the robot.';
  if (k === -6) return 'Straight down: the round hit the pavement at the foot of your own building.';
  // The side only, never the distance the round landed at (that distance and the robot's would give the angle in one step).
  return k < r.k ? 'Too steep: the round struck the street short of the robot.' : 'Too shallow: the round passed over the robot and hit the street beyond it.';
}

/** After a miss: what the shot did, never the setting that would have hit. */
export function missText(r: Round, s: Shot): string {
  if (r.kind === 'street') return tiltEffect(r, s.k);
  if (r.kind === 'range') {
    const parts: string[] = [];
    if (s.k !== r.k) parts.push(tiltEffect(r, s.k));
    if (s.range !== r.range) {
      const near = (s.range ?? 0) < r.range!;
      parts.push(
        s.k === r.k
          ? `Your tilt was true, but the range turret was set for a target ${near ? 'nearer' : 'farther'} than the robot, so the round ${near ? 'dropped and hit the street just in front of it' : 'rose and passed just over its head'}.`
          : `The range turret was also set for a target ${near ? 'nearer' : 'farther'} than this one.`,
      );
    }
    return parts.join(' ');
  }
  if (frame(r) === 'sky') {
    const what = r.k > 0 ? 'drone' : 'robot';
    if (s.k > 0 && r.k < 0) return `Your scope pointed upward, but the ${what} is below you, so the shot passed far above it.`;
    if (s.k < 0 && r.k > 0) return `Your scope pointed downward, but the ${what} is above you, so the shot passed far below it.`;
    return `Your shot passed ${s.k > r.k ? 'above' : 'below'} the ${what}.`;
  }
  if (s.k < 6 && r.k > 6) return 'Your turret swung into the east half of the street, but the robot is on the west side.';
  if (s.k > 6 && r.k < 6) return 'Your turret swung into the west half of the street, but the robot is on the east side.';
  return `Your shot passed ${s.k < r.k ? 'east' : 'west'} of the robot.`;
}

/** A spotter call (costs a charge): the effect of the current tilt or bearing, in words. */
export function spotterText(r: Round, s: Shot): string {
  if (r.kind === 'street' || r.kind === 'range') {
    const L = landing(r, s.k);
    return L === null ? 'Spotter: at that tilt the round never comes down on the street.' : `Spotter: at that tilt the round would hit the street about ${fmt(L)} m from the wall.`;
  }
  if (s.k === r.k) return frame(r) === 'sky' ? 'Spotter: that line runs right through the target.' : 'Spotter: that bearing runs right through the robot.';
  if (frame(r) === 'sky') return `Spotter: that line passes ${s.k > r.k ? 'above' : 'below'} the target.`;
  return `Spotter: that bearing passes ${s.k < r.k ? 'east' : 'west'} of the robot.`;
}

/** After a hit: the working, the fewest steps from the data to the setting. */
export function explain(r: Round): string {
  if (r.kind === 'street' || r.kind === 'range') {
    const ratio = `tan θ = −height/distance = −${grp(r.h!)}/${grp(r.d!)} = ${tanText(r.k)}`;
    const main = `${ratio}. In the principal branch (−π/2, π/2), tan⁻¹(${tanText(r.k)}) = ${piText(r.k)}, so the scope tilts ${degText(-r.k)} down.`;
    if (r.kind === 'street') return main;
    const h2 = square(r.h!);
    const d2 = square(r.d!);
    return `${main} Range: r = √(h² + d²) = √(${h2} + ${d2}) = √${h2 + d2} = ${r.range} m.`;
  }
  if (r.kind === 'gadget') {
    const { fn, ratio, k } = r;
    if (fn === 'sec') return `sec θ = ${ratio}, so cos θ = ${cosText(k)}. The branch of sec⁻¹ is [0, π] without π/2, so θ = sec⁻¹(${ratio}) = ${angleText(k)}.`;
    if (fn === 'cosec') return `cosec θ = ${ratio}, so sin θ = ${sinText(k)}. The branch of cosec⁻¹ is [−π/2, π/2] without 0, so θ = cosec⁻¹(${ratio}) = ${angleText(k)}.`;
    if (k === 6) return 'cot θ = 0, so θ = π/2 (straight up the wall), inside the branch (0, π).';
    return `cot θ = ${ratio}, so tan θ = ${TAN_OF[k]}. The branch of cot⁻¹ is (0, π), so a ${k > 6 ? 'negative ratio gives an obtuse angle' : 'positive ratio gives an acute angle'}: θ = cot⁻¹(${ratio}) = ${angleText(k)}.`;
  }
  if (r.kind === 'sky') return `sin θ = height/range = ${grp(r.y!)}/${r.r} = ${sinText(r.k)}. In the principal branch [−π/2, π/2], sin⁻¹(${sinText(r.k)}) = ${piText(r.k)}.`;
  const tail = r.k > 6 ? `, not ${piText(r.k - 12)}: the wall stops the turret below 0` : '';
  return `cos φ = east offset/range = ${surdText(r.x!)}/${r.r} = ${cosText(r.k)}. In the principal branch [0, π], cos⁻¹(${cosText(r.k)}) = ${piText(r.k)}${tail}.`;
}

/** The intel for the round, as the hero's earpiece reads it. */
export function intel(r: Round): string {
  if (r.kind === 'street') return `Roof height ${surdText(r.h!)} m; the robot is ${surdText(r.d!)} m along the street from the wall.`;
  if (r.kind === 'range') return `Roof height ${surdText(r.h!)} m; the robot is ${surdText(r.d!)} m along the street. The range turret wants the straight-line distance.`;
  if (r.kind === 'gadget') {
    const { fn, ratio } = r;
    return `The gadget shows ${fn === 'sec' ? 'sec θ = range ÷ east offset' : fn === 'cosec' ? 'cosec θ = range ÷ height' : 'cot θ = east offset ÷ height'} = ${ratio}. ${fn === 'cosec' ? 'Tilt' : 'Swing'} the ${fn === 'cosec' ? 'scope' : 'turret'} to θ.`;
  }
  if (r.kind === 'sky') {
    const what = r.k > 0 ? 'drone' : 'robot';
    return `Laser range ${r.r} m; the ${what} is ${surdText(absSurd(r.y!))} m ${r.y!.c > 0 ? 'above' : 'below'} your scope.`;
  }
  const side = r.x!.c === 0 ? 'neither east nor west of you' : `${surdText({ c: Math.abs(r.x!.c), root: r.x!.root })} m ${r.x!.c > 0 ? 'east' : 'west'} of the turret`;
  return `Laser range ${r.r} m; the robot is ${side}.`;
}

/** Canvas mapping (not to scale): true metres from the origin to pixels, chosen so the target sits at (vx, vy). */
export function scale(r: Round): { sx: number; sy: number } {
  const f = frame(r);
  const [ox, oy] = ORIGIN[f];
  if (f === 'street' || f === 'range') return { sx: (r.vx - ox) / value(r.d!), sy: (GROUND[f] - oy) / value(r.h!) };
  if (f === 'sky') {
    const X = Math.sqrt(Math.max(0, r.r! * r.r! - square(r.y!)));
    const sy = Math.abs(r.vy - oy) / Math.abs(value(r.y!));
    return { sx: X < 1e-9 ? sy : (r.vx - ox) / X, sy };
  }
  const Y = Math.sqrt(Math.max(0, r.r! * r.r! - square(r.x!)));
  const sy = (oy - r.vy) / Y;
  return { sx: r.x!.c === 0 ? sy : Math.abs(r.vx - ox) / Math.abs(value(r.x!)), sy };
}

/** Where a shot at step k leaves the scene: the end point of the tracer in pixels. A hit ends on the target. */
export function rayEnd(r: Round, k: number, W = 480): [number, number] {
  const [ox, oy] = ORIGIN[frame(r)];
  if (judgeAngle(r, k)) return [r.vx, r.vy];
  const { sx, sy } = scale(r);
  const th = k * STEP;
  let dx = sx * Math.cos(th);
  let dy = -sy * Math.sin(th);
  const n = Math.hypot(dx, dy) || 1;
  dx /= n;
  dy /= n;
  const ts: number[] = [];
  if (dx > 1e-9) ts.push((W - ox) / dx);
  if (dx < -1e-9) ts.push((0 - ox) / dx);
  if (dy > 1e-9) ts.push((GROUND[frame(r)] - oy) / dy);
  if (dy < -1e-9) ts.push((0 - oy) / dy);
  const t = Math.min(...ts.filter((x) => x > 0), 2000);
  return [ox + dx * t, oy + dy * t];
}
const judgeAngle = (r: Round, k: number) => k === r.k;

/**
 * Where the tracer of a wrong shot ends. It never follows the true geometry, because the offsets from the target at two settings would give the
 * angle: it ends a fixed 40 px from the target on the side the shot went (the same text, the same ending), or at one fixed spot for a shot that
 * went far off (up or level on the street, the wrong sign in the sky, the wrong half of the street at the wall). Pure, so a test scans it.
 */
export function missEnd(r: Round, s: Shot): [number, number] {
  const f = frame(r);
  const [ox, oy] = ORIGIN[f];
  const ground = GROUND[f];
  const OFF = 40;
  const RIGHT = 470;
  const at = (x: number, y: number): [number, number] => [Math.max(10, Math.min(RIGHT, x)), Math.max(4, Math.min(ground, y))];
  if (f === 'street' || f === 'range') {
    if (s.k !== r.k) {
      if (s.k > 0) return [RIGHT, 24];
      if (s.k === 0) return [RIGHT, oy];
      if (s.k === -6) return [ox + 6, ground];
      return at(r.vx + (s.k < r.k ? -OFF : OFF), ground);
    }
    // The tilt is true and the range turret is off: it dropped short of the robot or rose over its head.
    return (s.range ?? 0) < r.range! ? at(r.vx - OFF, ground) : at(r.vx + OFF, r.vy - 46);
  }
  if (f === 'sky') {
    if (s.k > 0 && r.k < 0) return [RIGHT, 30];
    if (s.k < 0 && r.k > 0) return [RIGHT, ground - 30];
    return at(r.vx, r.vy + (s.k > r.k ? -OFF : OFF));
  }
  if (s.k < 6 && r.k > 6) return [ox + 90, r.vy];
  if (s.k > 6 && r.k < 6) return [ox - 90, r.vy];
  return at(r.vx + (s.k < r.k ? OFF : -OFF), r.vy);
}
