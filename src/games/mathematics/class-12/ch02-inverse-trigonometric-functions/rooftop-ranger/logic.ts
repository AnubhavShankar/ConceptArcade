// Pure rules of Rooftop Ranger: no DOM, no canvas. Angles are whole steps of π/12, lengths are exact surds c√root in metres.
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { shuffle } from '@core/quiz';

export type Kind = 'street' | 'range' | 'sky' | 'turret';
export const KINDS: Kind[] = ['street', 'range', 'sky', 'turret'];

/** c√root metres; c carries the sign of an offset (above or below, east or west). */
export interface Surd {
  c: number;
  root: 1 | 2 | 3;
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
export const ORIGIN: Record<Kind, [number, number]> = { street: [80, 80], range: [80, 80], sky: [80, 170], turret: [240, 300] };
export const GROUND: Record<Kind, number> = { street: 286, range: 286, sky: 330, turret: 300 };

export const value = (s: Surd) => s.c * Math.sqrt(s.root);
export const square = (s: Surd) => s.c * s.c * s.root;
export function surdText(s: Surd): string {
  const sign = s.c < 0 ? '−' : '';
  const c = Math.abs(s.c);
  if (s.root === 1) return `${sign}${c}`;
  return `${sign}${c === 1 ? '' : c}√${s.root}`;
}

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
const TAN: Record<number, string> = { 2: '1/√3', 3: '1', 4: '√3' };
const SIN: Record<number, string> = { 0: '0', 2: '1/2', 3: '1/√2', 4: '√3/2', 6: '1' };
const COS: Record<number, string> = { 0: '1', 2: '√3/2', 3: '1/√2', 4: '1/2', 6: '0', 8: '−1/2', 9: '−1/√2', 10: '−√3/2', 12: '−1' };
const neg = (s: string) => (s === '0' ? s : s.startsWith('−') ? s.slice(1) : `−${s}`);
export const tanText = (k: number) => (k < 0 ? neg(TAN[-k]) : TAN[k]);
export const sinText = (k: number) => (k < 0 ? neg(SIN[-k]) : SIN[k]);
export const cosText = (k: number) => COS[k];

/** Sides of the right triangle for a tilt of m steps (2, 3, 4 = π/6, π/4, π/3) with hypotenuse 2b: [opposite, adjacent]. */
function sides(m: number, b: number): [Surd, Surd] {
  if (m === 2) return [{ c: b, root: 1 }, { c: b, root: 3 }];
  if (m === 3) return [{ c: b, root: 2 }, { c: b, root: 2 }];
  if (m === 4) return [{ c: b, root: 3 }, { c: b, root: 1 }];
  return [{ c: 2 * b, root: 1 }, { c: 0, root: 1 }];
}

const pick = <T>(xs: readonly T[], random: () => number) => xs[Math.floor(random() * xs.length) % xs.length];
const between = (lo: number, hi: number, random: () => number) => Math.round(lo + (hi - lo) * random());

function streetRound(m: number, k: number, random: () => number): Round {
  const a = pick([10, 12, 15, 18, 20, 24, 25, 30], random);
  const [h, d] = m === 2 ? [{ c: a, root: 1 }, { c: a, root: 3 }] : m === 3 ? [{ c: a, root: 1 }, { c: a, root: 1 }] : [{ c: a, root: 3 }, { c: a, root: 1 }];
  return { kind: 'street', h: h as Surd, d: d as Surd, k: -m, assist: aid(k), vx: between(250, 440, random), vy: GROUND.street };
}
function rangeRound(m: number, k: number, random: () => number): Round {
  const b = pick([8, 9, 10, 12, 14, 15, 16, 18, 20, 24, 25], random);
  const [h, d] = sides(m, b);
  return { kind: 'range', h, d, range: 2 * b, k: -m, assist: aid(k), vx: between(250, 440, random), vy: GROUND.range };
}
function skyRound(m: number, up: boolean, k: number, random: () => number): Round {
  const b = pick([8, 10, 12, 15, 16, 18, 20, 24, 25], random);
  const [opp] = sides(m, b);
  const y = { c: up ? opp.c : -opp.c, root: opp.root };
  const off = between(80, 140, random);
  const vx = m === 6 ? ORIGIN.sky[0] + 6 : between(240, 380, random);
  const vy = up ? ORIGIN.sky[1] - Math.min(off, 150) : Math.min(GROUND.sky - 24, ORIGIN.sky[1] + off);
  return { kind: 'sky', r: 2 * b, y, k: up ? m : -m, assist: aid(k), vx, vy };
}
function turretRound(step: number, k: number, random: () => number): Round {
  const b = pick([8, 10, 12, 15, 16, 18, 20, 24, 25], random);
  const m = step > 6 ? 12 - step : step;
  const [, adj] = sides(m, b);
  const x = { c: step > 6 ? -adj.c : adj.c, root: adj.root };
  const vx = step === 6 ? ORIGIN.turret[0] : ORIGIN.turret[0] + (step > 6 ? -1 : 1) * between(80, 190, random);
  return { kind: 'turret', r: 2 * b, x, k: step, assist: aid(k), vx, vy: ORIGIN.turret[1] - between(110, 230, random) };
}

/** Three rounds of a level. Street and range: robots below at π/6, π/4 or π/3 down. Sky: targets above and below. Turret: at least one robot on the west side. */
export function buildRounds(level: number, random: () => number): Round[] {
  const kind = KINDS[Math.max(0, Math.min(3, level - 1))];
  if (kind === 'street' || kind === 'range') {
    const ms = [pick([2, 3, 4], random), 0, 0];
    ms[1] = pick([2, 3, 4].filter((m) => m !== ms[0]), random);
    ms[2] = pick([2, 3, 4], random);
    return ms.map((m, k) => (kind === 'street' ? streetRound(m, k, random) : rangeRound(m, k, random)));
  }
  if (kind === 'sky') {
    const up = random() < 0.5;
    const ms = shuffle([2, 3, 4], random);
    const boss = pick([ms[2], 6], random);
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
  const L = landing(r, k)!;
  const d = value(r.d!);
  return L < d ? `Too steep: the round struck the street about ${fmt(L)} m from the wall, short of the robot.` : `Too shallow: the round passed over the robot and hit the street about ${fmt(L)} m out.`;
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
  if (r.kind === 'sky') {
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
  if (s.k === r.k) return r.kind === 'sky' ? 'Spotter: that line runs right through the target.' : 'Spotter: that bearing runs right through the robot.';
  if (r.kind === 'sky') return `Spotter: that line passes ${s.k > r.k ? 'above' : 'below'} the target.`;
  return `Spotter: that bearing passes ${s.k < r.k ? 'east' : 'west'} of the robot.`;
}

/** After a hit: the working, the fewest steps from the data to the setting. */
export function explain(r: Round): string {
  if (r.kind === 'street' || r.kind === 'range') {
    const ratio = `tan θ = −height/distance = −${surdText(r.h!)}/${surdText(r.d!)} = ${tanText(r.k)}`;
    const main = `${ratio}. In the principal branch (−π/2, π/2), tan⁻¹(${tanText(r.k)}) = ${piText(r.k)}, so the scope tilts ${degText(-r.k)} down.`;
    if (r.kind === 'street') return main;
    const h2 = square(r.h!);
    const d2 = square(r.d!);
    return `${main} Range: r = √(h² + d²) = √(${h2} + ${d2}) = √${h2 + d2} = ${r.range} m.`;
  }
  if (r.kind === 'sky') return `sin θ = height/range = ${surdText(r.y!)}/${r.r} = ${sinText(r.k)}. In the principal branch [−π/2, π/2], sin⁻¹(${sinText(r.k)}) = ${piText(r.k)}.`;
  const tail = r.k > 6 ? `, not ${piText(r.k - 12)}: the wall stops the turret below 0` : '';
  return `cos φ = east offset/range = ${surdText(r.x!)}/${r.r} = ${cosText(r.k)}. In the principal branch [0, π], cos⁻¹(${cosText(r.k)}) = ${piText(r.k)}${tail}.`;
}

/** The intel for the round, as the hero's earpiece reads it. */
export function intel(r: Round): string {
  if (r.kind === 'street') return `Roof height ${surdText(r.h!)} m; the robot is ${surdText(r.d!)} m along the street from the wall.`;
  if (r.kind === 'range') return `Roof height ${surdText(r.h!)} m; the robot is ${surdText(r.d!)} m along the street. The range turret wants the straight-line distance.`;
  if (r.kind === 'sky') {
    const what = r.k > 0 ? 'drone' : 'robot';
    return `Laser range ${r.r} m; the ${what} is ${surdText({ c: Math.abs(r.y!.c), root: r.y!.root })} m ${r.y!.c > 0 ? 'above' : 'below'} your scope.`;
  }
  const side = r.x!.c === 0 ? 'neither east nor west of you' : `${surdText({ c: Math.abs(r.x!.c), root: r.x!.root })} m ${r.x!.c > 0 ? 'east' : 'west'} of the turret`;
  return `Laser range ${r.r} m; the robot is ${side}.`;
}

/** Canvas mapping (not to scale): true metres from the origin to pixels, chosen so the target sits at (vx, vy). */
export function scale(r: Round): { sx: number; sy: number } {
  const [ox, oy] = ORIGIN[r.kind];
  if (r.kind === 'street' || r.kind === 'range') return { sx: (r.vx - ox) / value(r.d!), sy: (GROUND[r.kind] - oy) / value(r.h!) };
  if (r.kind === 'sky') {
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
  const [ox, oy] = ORIGIN[r.kind];
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
  if (dy > 1e-9) ts.push((GROUND[r.kind] - oy) / dy);
  if (dy < -1e-9) ts.push((0 - oy) / dy);
  const t = Math.min(...ts.filter((x) => x > 0), 2000);
  return [ox + dx * t, oy + dy * t];
}
const judgeAngle = (r: Round, k: number) => k === r.k;
