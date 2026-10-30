// Pure rules of Turf War: no DOM, no canvas. Inky the paint-roller squid kid drags the edge of a turf to a whole-number setting v so the paint laid between
// the curve and the x-axis is exactly the area the turf needs. Paint counts as area, so the part below the axis is paint too (not a negative).
import { aid } from '@core/dialgame';
import { num } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'ellipse' | 'line' | 'sine' | 'cubic' | 'sideways' | 'round';
export interface Round {
  kind: Kind;
  /** The turf: ellipse [a]; line y = m(x − s) from x = 0 [m, s]; sine y = a·sin x from x = 0 [a]; cubic y = k·x³ from x = −p [k, p];
   *  sideways: the curve x = g(y) is CURVES[p[0]], from y = 0 up to the top edge v; round: the circle x² + y² = a² [a], from x = 0 to the right edge v. */
  p: number[];
  /** The target as it is written when it is not a plain number (9/4, 2√3 + 4π/3); the new levels set it. */
  text?: string;
  /** The area the turf needs, the winning setting, and the dial range. */
  T: number;
  ans: number;
  min: number;
  max: number;
  start: number;
  assist: 0 | 1 | 2;
}

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const ri = (lo: number, hi: number, random: () => number) => lo + Math.floor(random() * (hi - lo + 1));

/** The curves x = g(y) of level 5: the formula as written, the antiderivative as written, g itself and the area from y = 0 to y = v. */
export interface Curve {
  fx: string;
  anti: string;
  g: (y: number) => number;
  area: (v: number) => number;
}
export const CURVES: Curve[] = [
  { fx: '3y²', anti: 'y³', g: (y) => 3 * y * y, area: (v) => v ** 3 },
  { fx: 'y + 1', anti: 'y²/2 + y', g: (y) => y + 1, area: (v) => (v * v) / 2 + v },
  { fx: '4y³', anti: 'y⁴', g: (y) => 4 * y ** 3, area: (v) => v ** 4 },
  { fx: 'y²/4', anti: 'y³/12', g: (y) => (y * y) / 4, area: (v) => v ** 3 / 12 },
  { fx: '6y − y²', anti: '3y² − y³/3', g: (y) => 6 * y - y * y, area: (v) => 3 * v * v - v ** 3 / 3 },
  { fx: '2√y', anti: '(4/3)y^(3/2)', g: (y) => 2 * Math.sqrt(y), area: (v) => (4 / 3) * v ** 1.5 },
  { fx: 'y² − 4y + 5', anti: 'y³/3 − 2y² + 5y', g: (y) => y * y - 4 * y + 5, area: (v) => v ** 3 / 3 - 2 * v * v + 5 * v },
];
/** The area under the arc of x² + y² = a² from x = 0 to x = q. */
export const roundArea = (a: number, q: number) => (q / 2) * Math.sqrt(a * a - q * q) + ((a * a) / 2) * Math.asin(q / a);
/** Level 6 dial: the edge may be set anywhere from 1 to this, whatever the circle; past the fence's end (q > a) the setting is invalid and never fires. */
export const ROUND_DIAL_MAX = 10;
/** The arc itself: y = √(a² − x²). */
export const arcHeight = (a: number, x: number) => Math.sqrt(Math.max(0, a * a - x * x));

/** The area painted at setting v. For the ellipse it is counted in units of π. */
export function area(r: Round, v: number): number {
  if (r.kind === 'sideways') return CURVES[r.p[0]].area(v);
  if (r.kind === 'round') return roundArea(r.p[0], Math.min(v, r.p[0]));
  const [a, b] = r.p;
  if (r.kind === 'ellipse') return a * v;
  if (r.kind === 'line') return v <= b ? a * (b * v - (v * v) / 2) : (a * b * b) / 2 + (a * (v - b) ** 2) / 2;
  if (r.kind === 'sine') return a * v;
  return (a * (b ** 4 + v ** 4)) / 4;
}
/** The signed integral over the same stretch, which is the wrong thing to count (NaN for the ellipse). */
export function signed(r: Round, v: number): number {
  const [a, b] = r.p;
  if (r.kind === 'line') return a * ((v * v) / 2 - b * v);
  if (r.kind === 'sine') return a * [0, 1, 2, 1][v % 4];
  if (r.kind === 'cubic') return (a * (v ** 4 - b ** 4)) / 4;
  return Number.NaN;
}
/** The curve itself, for drawing. */
export function height(r: Round, x: number): number {
  const [a, b] = r.p;
  if (r.kind === 'line') return a * (x - b);
  if (r.kind === 'sine') return a * Math.sin(x);
  if (r.kind === 'cubic') return a * x ** 3;
  return 0;
}

function make(kind: Kind, random: () => number): Round {
  if (kind === 'ellipse') {
    const a = ri(2, 6, random);
    const ans = ri(1, 8, random);
    return { kind, p: [a], T: a * ans, ans, min: 0, max: 8, start: 0, assist: 0 };
  }
  if (kind === 'line') {
    const m = pick([2, 4], random);
    const s = ri(1, 3, random);
    const ans = ri(s + 1, 9, random);
    const r: Round = { kind, p: [m, s], T: 0, ans, min: 0, max: 9, start: 0, assist: 0 };
    return { ...r, T: area(r, ans) };
  }
  if (kind === 'sine') {
    const a = ri(1, 3, random);
    const ans = ri(3, 8, random);
    return { kind, p: [a], T: a * ans, ans, min: 0, max: 8, start: 0, assist: 0 };
  }
  const k = pick([4, 8], random);
  const p = ri(2, 3, random);
  const ans = ri(1, 4, random);
  const r: Round = { kind, p: [k, p], T: 0, ans, min: 0, max: 4, start: 0, assist: 0 };
  return { ...r, T: area(r, ans) };
}

/** Level 5 pools, one per round: [curve, winning v, target as written]. The area is monotone in v because g > 0 on (0, 6). */
const SIDEWAYS: [number, number, string][][] = [
  [[0, 3, '27'], [0, 4, '64'], [1, 4, '12'], [1, 3, '15/2'], [2, 2, '16'], [2, 3, '81']],
  [[3, 3, '9/4'], [4, 3, '18']],
  [[5, 4, '32/3'], [6, 3, '6']],
];
/** Level 6 pools, one per round: [a, winning q, target as written]. The answer is often not the end of the fence, so position alone never wins. */
const ROUND: [number, number, string][][] = [
  [[4, 4, '4π'], [6, 6, '9π'], [4, 2, '2√3 + 4π/3']],
  [[6, 3, '9√3/2 + 3π'], [8, 8, '16π'], [4, 2, '2√3 + 4π/3']],
  [[8, 4, '8√3 + 16π/3'], [10, 5, '25√3/2 + 25π/3'], [10, 10, '25π']],
];

function buildNew(level: 5 | 6, random: () => number): Round[] {
  const used = new Set<string>();
  return (level === 5 ? SIDEWAYS : ROUND).map((pool, i) => {
    // The same row never comes twice in one level.
    const [c, ans, text] = pick(pool.filter((row) => !used.has(`${row[0]}:${row[1]}`)), random);
    used.add(`${c}:${ans}`);
    // The valid range is 1 to the end of the fence; the level 6 dial itself runs to ROUND_DIAL_MAX.
    const r: Round = level === 5 ? { kind: 'sideways', p: [c], T: 0, ans, min: 1, max: 6, start: 1, assist: aid(i), text } : { kind: 'round', p: [c], T: 0, ans, min: 1, max: c, start: 1, assist: aid(i), text };
    return { ...r, T: area(r, ans), start: ans === 1 ? r.max : 1 };
  });
}

export function buildRounds(level: number, random: () => number): Round[] {
  if (level >= 5) return buildNew(level === 5 ? 5 : 6, random);
  const kind: Kind = (['ellipse', 'line', 'sine', 'cubic'] as const)[level - 1];
  const out: Round[] = [];
  for (let i = 0; i < 3; i++) {
    let r = make(kind, random);
    for (let t = 0; t < 50 && out.some((o) => o.p.join() === r.p.join() && o.ans === r.ans); t++) r = make(kind, random);
    out.push({ ...r, assist: aid(i) });
  }
  return out;
}

/** Whole-number areas compare exactly; the new levels have fractions and π, so they compare within rounding. */
export const judge = (r: Round, v: number) => !(r.kind === 'round' && v > r.p[0]) && Math.abs(area(r, v) - r.T) < 1e-9;
/** Level 6 only: an edge past the end of the fence is invalid input (free, never fired). */
export const pastFence = (r: Round, v: number) => r.kind === 'round' && v > r.p[0];
/** Where the burst of points and the "−1 ♥" appear: a fixed point of each level's scene, the same for every possible answer, so a miss never marks the true edge. */
export function hitPoint(r: Round): [number, number] {
  if (r.kind === 'ellipse') return [320, 170];
  if (r.kind === 'sideways' || r.kind === 'round') return [580, 170];
  return [320, 300];
}
const unit = (r: Round) => (r.kind === 'ellipse' ? 'π' : '');
export const show = (r: Round, x: number) => `${num(x)}${unit(r)}`;
/** The paint the turf needs, as written (9/4, 4π) when the level gives it that way. */
export const needText = (r: Round) => r.text ?? show(r, r.T);
/** Where the player's setting puts the edge, in words. */
export const edgeText = (r: Round, v: number) =>
  r.kind === 'sideways' ? `the top edge at y = ${v}` : r.kind === 'round' ? `the right edge at x = ${v}` : r.kind === 'ellipse' ? `the ellipse top at b = ${v}` : r.kind === 'sine' ? `the roller at ${v} quarter waves` : `the roller at x = ${v}`;

/** The turf in words. */
export function intel(r: Round): string {
  const [a, b] = r.p;
  const need = `The turf needs exactly ${needText(r)} of paint.`;
  if (r.kind === 'sideways') return `The turf lies between the y-axis and the curve x = ${CURVES[a].fx}, from y = 0 up to the top edge. ${need}`;
  if (r.kind === 'round') return `The turf lies under the circle x² + y² = ${a * a}, from the centre line x = 0 to the right edge. ${need}`;
  if (r.kind === 'ellipse') return `The turf is the ellipse x²/${a * a} + y²/b² = 1, and the roller drags its top to height b. ${need}`;
  if (r.kind === 'line') return `The turf lies between y = ${a}(x − ${b}) and the x-axis, from x = 0 to the roller. ${need}`;
  if (r.kind === 'sine') return `The turf lies between y = ${a === 1 ? '' : a}sin x and the x-axis, from x = 0 to the roller, which stops at quarter waves of π/2. ${need}`;
  return `The turf lies between y = ${a}x³ and the x-axis, from x = −${b} to the roller. ${need}`;
}

/** An ink-gauge test: how much paint is down at this setting, never the right setting. */
export const spotText = (r: Round, v: number) => `Ink gauge at ${r.kind === 'sine' ? `${v} quarter waves` : `${v}`}: ${show(r, area(r, v))} of paint is down.`;

/** After a miss: the player's own edge and which way it is off, never an amount (an amount would give the answer in one step), plus the signed-integral slip when that is what happened. */
export function missText(r: Round, v: number): string {
  const side = area(r, v) < r.T ? 'bare patches are left' : 'paint spilled onto the rival’s turf';
  const slip = Number.isFinite(signed(r, v)) && signed(r, v) === r.T ? ' You counted the stretch below the axis as negative paint: it is still turf, so it adds to the area.' : '';
  return `With ${edgeText(r, v)}, ${side}.${slip}`;
}

/** After a hit: the working. */
export function explain(r: Round): string {
  const [a, b] = r.p;
  if (r.kind === 'sideways') return `Area = ∫₀^v g(y) dy = [${CURVES[a].anti}] from 0 to v = ${CURVES[a].anti.replace(/y/g, 'v')}. Setting it equal to ${needText(r)} gives v = ${r.ans}.`;
  if (r.kind === 'round') {
    const q = r.ans;
    const angle = q === a ? 'π/2' : 'π/6';
    return `∫₀^q √(a² − x²) dx = [(x/2)√(a² − x²) + (a²/2) sin⁻¹(x/a)] from 0 to q. With q = ${q}: ${q / 2}·√${a * a - q * q} + ${(a * a) / 2}·${angle} = ${needText(r)}.`;
  }
  if (r.kind === 'ellipse') return `The ellipse has area πab = π·${a}·${r.ans} = ${r.T}π (four times the first quadrant, 4∫₀^${a} b√(1 − x²/${a * a}) dx).`;
  if (r.kind === 'line') return `The line crosses the axis at x = ${b}. Below it the area is ${(a * b * b) / 2}, above it ${(a * (r.ans - b) ** 2) / 2}: add them, ${r.T}. (The signed integral would be ${num(signed(r, r.ans))}.)`;
  if (r.kind === 'sine') return `Each quarter wave of ${a === 1 ? '' : a}sin x has area ${a}, so ${r.ans} quarter waves give ${a}·${r.ans} = ${r.T}. (The signed integral cancels whenever the wave goes below the axis.)`;
  return `${a}x³ is below the axis for x < 0. Area = ∫ from −${b} to 0 of |${a}x³| + ∫ from 0 to ${r.ans} of ${a}x³ = ${(a * b ** 4) / 4} + ${(a * r.ans ** 4) / 4} = ${r.T}. (The signed integral would be ${num(signed(r, r.ans))}.)`;
}
