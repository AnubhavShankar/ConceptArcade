// Pure rules of Relay Tower: no DOM, no canvas. The dish dial turns in steps of π/12 from −π to π (−12 to 12). Each round is an expression made of
// inverse trigonometric functions whose value is a multiple of π/12; the player points the dish at that value.
import { aid } from '@core/dialgame';
import { piText } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'branch' | 'sum' | 'subst';
export interface Round {
  kind: Kind;
  /** The expression in words. */
  text: string;
  /** Its value in radians, computed from the real functions. */
  value: () => number;
  /** The steps of π/12 of the answer. */
  ans: number;
  /** The range of the outermost inverse function, in steps, for the hint arc; 'open' ends are not reached. */
  range: [number, number];
  work: string;
  assist: 0 | 1 | 2;
}

export const DIAL = { min: -12, max: 12 };
export const STEP = Math.PI / 12;
const pick = <T>(xs: readonly T[], random: () => number, n = 1): T[] => shuffle(xs, random).slice(0, n);
const stepsOf = (x: number) => Math.round(x / STEP);
/** Keep a ratio inside [−1, 1] so a rounding error such as 1.0000000000000002 does not give NaN. */
const clamp = (x: number) => Math.max(-1, Math.min(1, x));
const rangeWords = (r: [number, number]) => `[${piText(r[0])}, ${piText(r[1])}]`;

type Fn = 'sin' | 'cos' | 'tan';
const INV: Record<Fn, (x: number) => number> = { sin: Math.asin, cos: Math.acos, tan: Math.atan };
const FWD: Record<Fn, (x: number) => number> = { sin: Math.sin, cos: Math.cos, tan: Math.tan };
const BRANCH: Record<Fn, [number, number]> = { sin: [-6, 6], cos: [0, 12], tan: [-6, 6] };
const OUTSIDE: Record<Fn, number[]> = { sin: [8, 9, 10, 14, 15, 16, -8, -9, -10], cos: [-2, -3, -4, -6, 14, 15, 16], tan: [8, 9, 10, 14, 15, 16, -8, -9, -10] };

function branchRound(fn: Fn, random: () => number): Round {
  const x = pick(OUTSIDE[fn], random)[0];
  const xr = x * STEP;
  const ans = stepsOf(INV[fn](FWD[fn](xr)));
  const mid = fn === 'tan' ? `${piText(x)} is not between ${piText(-6)} and ${piText(6)} (open)` : `${piText(x)} is outside ${rangeWords(BRANCH[fn])}`;
  return {
    kind: 'branch',
    text: `${fn}⁻¹(${fn} ${piText(x)})`,
    value: () => INV[fn](FWD[fn](xr)),
    ans,
    range: BRANCH[fn],
    work: `${mid}, but ${fn} ${piText(x)} = ${fn} ${piText(ans)} and ${piText(ans)} is in the principal branch of ${fn}⁻¹, so ${fn}⁻¹(${fn} ${piText(x)}) = ${piText(ans)}.`,
    assist: 0,
  };
}

interface Row {
  text: string;
  value: () => number;
  work: string;
  range?: [number, number];
}
const NEG: [number, number] = [-12, 0];
/** Level 2, round 1: a sum of two tangent angles that stays inside (−π/2, π/2). The answers are π/4, −π/4, π/3 and π/6, so the pool never hands out the same one. */
const SUMS_A: Row[] = [
  { text: 'tan⁻¹(1/2) + tan⁻¹(1/3)', value: () => Math.atan(1 / 2) + Math.atan(1 / 3), work: 'tan(A + B) = (1/2 + 1/3)/(1 − 1/6) = 1, and A + B is between 0 and π/2, so it is π/4.' },
  { text: 'tan⁻¹(1/5) + tan⁻¹(2/3)', value: () => Math.atan(1 / 5) + Math.atan(2 / 3), work: 'tan(A + B) = (1/5 + 2/3)/(1 − 2/15) = 1, and A + B is between 0 and π/2, so it is π/4.' },
  { text: 'tan⁻¹(1/4) + tan⁻¹(3/5)', value: () => Math.atan(1 / 4) + Math.atan(3 / 5), work: 'tan(A + B) = (1/4 + 3/5)/(1 − 3/20) = 1, and A + B is between 0 and π/2, so it is π/4.' },
  { text: '2 tan⁻¹(1/3) + tan⁻¹(1/7)', value: () => 2 * Math.atan(1 / 3) + Math.atan(1 / 7), work: 'tan(2·tan⁻¹(1/3)) = (2/3)/(1 − 1/9) = 3/4; then (3/4 + 1/7)/(1 − 3/28) = 1, so the sum is π/4.' },
  { text: 'tan⁻¹(−1/2) + tan⁻¹(−1/3)', value: () => Math.atan(-1 / 2) + Math.atan(-1 / 3), work: 'tan(A + B) = (−1/2 − 1/3)/(1 − 1/6) = −1, and A + B is between −π/2 and 0, so it is −π/4.', range: NEG },
  { text: 'tan⁻¹(−1/5) + tan⁻¹(−2/3)', value: () => Math.atan(-1 / 5) + Math.atan(-2 / 3), work: 'tan(A + B) = (−1/5 − 2/3)/(1 − 2/15) = −1, and A + B is between −π/2 and 0, so it is −π/4.', range: NEG },
  { text: 'tan⁻¹ 1 + tan⁻¹(2 − √3)', value: () => Math.atan(1) + Math.atan(2 - Math.sqrt(3)), work: 'tan(A + B) = (1 + 2 − √3)/(1 − (2 − √3)) = (3 − √3)/(√3 − 1) = √3, and A + B is between 0 and π/2, so it is π/3.' },
  { text: '2 tan⁻¹(2 − √3)', value: () => 2 * Math.atan(2 - Math.sqrt(3)), work: 'tan 2A = 2(2 − √3)/(1 − (2 − √3)²) = 2(2 − √3)/(4√3 − 6) = 1/√3, and 2A is between 0 and π/2, so it is π/6.' },
];
/** Level 2, round 2: an identity or a sum of sines. The answers are ±π/2 and ±π/3. */
const SUMS_B: Row[] = [
  { text: 'sin⁻¹(3/5) + cos⁻¹(3/5)', value: () => Math.asin(3 / 5) + Math.acos(3 / 5), work: 'sin⁻¹x + cos⁻¹x = π/2 for every x from −1 to 1.' },
  { text: 'sin⁻¹(4/5) + sin⁻¹(3/5)', value: () => Math.asin(4 / 5) + Math.asin(3 / 5), work: 'sin(A + B) = (4/5)(4/5) + (3/5)(3/5) = 1 with both angles positive, so A + B = π/2.' },
  { text: 'sin⁻¹(5/13) + sin⁻¹(12/13)', value: () => Math.asin(5 / 13) + Math.asin(12 / 13), work: 'sin(A + B) = (5/13)(5/13) + (12/13)(12/13) = 1 with both angles positive, so A + B = π/2.' },
  { text: 'sin⁻¹(−1/3) + cos⁻¹(−1/3)', value: () => Math.asin(-1 / 3) + Math.acos(-1 / 3), work: 'sin⁻¹x + cos⁻¹x = π/2 for every x from −1 to 1, and −1/3 is in that interval.' },
  { text: 'sin⁻¹(−4/5) + sin⁻¹(−3/5)', value: () => Math.asin(-4 / 5) + Math.asin(-3 / 5), work: 'sin(A + B) = (−4/5)(4/5) + (−3/5)(3/5) = −1 with both angles negative, so A + B = −π/2.', range: NEG },
  { text: 'sin⁻¹(1/2) + sin⁻¹(1/2)', value: () => Math.asin(1 / 2) + Math.asin(1 / 2), work: 'sin(A + B) = 2·(1/2)(√3/2) = √3/2 and A + B is small (below π/2), so it is π/3.' },
  { text: 'sin⁻¹(−1/2) + sin⁻¹(−1/2)', value: () => Math.asin(-1 / 2) + Math.asin(-1 / 2), work: 'sin(A + B) = 2·(−1/2)(√3/2) = −√3/2 and A + B is between −π/2 and 0, so it is −π/3.', range: NEG },
];
/** Level 2, the boss: a sum that leaves the principal branch of tan⁻¹ or sin⁻¹. The answers are ±3π/4, 2π/3 and π. */
const SUMS_C: Row[] = [
  { text: 'tan⁻¹ 2 + tan⁻¹ 3', value: () => Math.atan(2) + Math.atan(3), work: 'tan(A + B) = (2 + 3)/(1 − 6) = −1, and A + B is between π/2 and π, so it is 3π/4 (not −π/4).' },
  { text: 'tan⁻¹(3/2) + tan⁻¹ 5', value: () => Math.atan(3 / 2) + Math.atan(5), work: 'tan(A + B) = (3/2 + 5)/(1 − 15/2) = −1, and A + B is between π/2 and π, so it is 3π/4.' },
  { text: 'tan⁻¹(−2) + tan⁻¹(−3)', value: () => Math.atan(-2) + Math.atan(-3), work: 'tan(A + B) = (−2 − 3)/(1 − 6) = 1, and A + B is between −π and −π/2, so it is −3π/4 (not π/4).', range: NEG },
  { text: 'tan⁻¹(−3/2) + tan⁻¹(−5)', value: () => Math.atan(-3 / 2) + Math.atan(-5), work: 'tan(A + B) = (−3/2 − 5)/(1 − 15/2) = 1, and A + B is between −π and −π/2, so it is −3π/4.', range: NEG },
  { text: 'sin⁻¹(√3/2) + sin⁻¹(√3/2)', value: () => Math.asin(Math.sqrt(3) / 2) + Math.asin(Math.sqrt(3) / 2), work: 'Each angle is π/3, so the sum is 2π/3. Its sine is √3/2, the same as the sine of π/3, but the sum is past π/2 and π/3 is not the sum.' },
  { text: 'cos⁻¹(1/3) + cos⁻¹(−1/3)', value: () => Math.acos(1 / 3) + Math.acos(-1 / 3), work: 'cos⁻¹(−x) = π − cos⁻¹x, so the two angles add up to π.' },
];
/** Rows grouped by their answer in steps of π/12, so a round picks an answer first and a row second: every answer is about equally likely. */
function pickRow(rows: Row[], random: () => number, not: number[] = []): Row {
  const groups = new Map<number, Row[]>();
  for (const row of rows) {
    const a = stepsOf(row.value());
    groups.set(a, [...(groups.get(a) ?? []), row]);
  }
  const options = [...groups.keys()].filter((a) => !not.includes(a));
  const a = pick(options.length ? options : [...groups.keys()], random)[0];
  return pick(groups.get(a)!, random)[0];
}
const SUBST: Row[] = [
  { text: 'tan⁻¹((√(1 + x²) − 1)/x) at x = √3', value: () => Math.atan((Math.sqrt(1 + 3) - 1) / Math.sqrt(3)), work: 'Put x = tan θ: the expression is (sec θ − 1)/tan θ = tan(θ/2), so the value is ½ tan⁻¹ x = ½·π/3 = π/6.', range: [-6, 6] },
  { text: 'tan⁻¹((√(1 + x²) − 1)/x) at x = 1/√3', value: () => Math.atan((Math.sqrt(1 + 1 / 3) - 1) / (1 / Math.sqrt(3))), work: 'Put x = tan θ: the expression is tan(θ/2), so the value is ½ tan⁻¹ x = ½·π/6 = π/12.', range: [-6, 6] },
  { text: 'sin⁻¹(2x√(1 − x²)) at x = 1/2', value: () => Math.asin(clamp(2 * 0.5 * Math.sqrt(1 - 0.25))), work: 'Put x = sin θ: 2 sin θ cos θ = sin 2θ, so the value is 2 sin⁻¹ x = 2·π/6 = π/3 (valid because |x| ≤ 1/√2).', range: [-6, 6] },
  { text: 'sin⁻¹(2x√(1 − x²)) at x = 1/√2', value: () => Math.asin(clamp(2 * Math.SQRT1_2 * Math.sqrt(1 - 0.5))), work: 'Put x = sin θ: 2 sin θ cos θ = sin 2θ, so the value is 2 sin⁻¹ x = 2·π/4 = π/2.', range: [-6, 6] },
  { text: 'cos⁻¹(4x³ − 3x) at x = 1/2', value: () => Math.acos(clamp(4 * 0.125 - 1.5)), work: 'Put x = cos θ: 4cos³θ − 3cos θ = cos 3θ, so the value is 3 cos⁻¹ x = 3·π/3 = π (valid because 1/2 ≤ x ≤ 1).', range: [0, 12] },
  { text: 'cos⁻¹(4x³ − 3x) at x = √3/2', value: () => Math.acos(clamp(4 * (Math.sqrt(3) / 2) ** 3 - 3 * (Math.sqrt(3) / 2))), work: 'Put x = cos θ: the expression is cos 3θ, so the value is 3 cos⁻¹ x = 3·π/6 = π/2.', range: [0, 12] },
  { text: 'tan⁻¹(2x/(1 − x²)) at x = 1/√3', value: () => Math.atan((2 / Math.sqrt(3)) / (1 - 1 / 3)), work: 'Put x = tan θ: 2tan θ/(1 − tan²θ) = tan 2θ, so the value is 2 tan⁻¹ x = 2·π/6 = π/3 (valid because |x| < 1).', range: [-6, 6] },
  { text: 'sin⁻¹(3x − 4x³) at x = 1/2', value: () => Math.asin(clamp(1.5 - 0.5)), work: 'Put x = sin θ: 3 sin θ − 4 sin³θ = sin 3θ, so the value is 3 sin⁻¹ x = 3·π/6 = π/2 (valid because |x| ≤ 1/2).', range: [-6, 6] },
];

const fromRow = (row: Row, kind: Kind, defaultRange: [number, number]): Round => ({ kind, text: row.text, value: row.value, ans: stepsOf(row.value()), range: row.range ?? defaultRange, work: row.work, assist: 0 });

export function buildRounds(level: number, random: () => number): Round[] {
  let rs: Round[];
  if (level === 1) rs = (['sin', 'cos', 'tan'] as Fn[]).map((fn) => branchRound(fn, random));
  else if (level === 2) {
    // The three rounds draw their answer from different pools, and no two rounds of a level share an answer.
    const pairs = pickRow(SUMS_A, random);
    const ident = pickRow(SUMS_B, random, [stepsOf(pairs.value())]);
    const boss = pickRow(SUMS_C, random, [stepsOf(pairs.value()), stepsOf(ident.value())]);
    rs = [fromRow(pairs, 'sum', [0, 12]), fromRow(ident, 'sum', [0, 12]), fromRow(boss, 'sum', [0, 12])];
  } else rs = pick(SUBST, random, 3).map((r) => fromRow(r, 'subst', [-6, 6]));
  return rs.map((r, i) => ({ ...r, assist: aid(i) }));
}

export const judge = (r: Round, k: number) => k === r.ans;

/**
 * After a miss: what the dish did, never the right angle. The principal range is a helper (live in round 1, a paid check in round 2, absent in the boss round), so only
 * round 1 names it in a miss; later rounds give the direction for every wrong setting, in or out of the range.
 */
export function missText(r: Round, k: number): string {
  if (r.assist === 0 && (k < r.range[0] || k > r.range[1])) return `The dish swung to ${piText(k)}, but the value of this expression can only lie in ${rangeWords(r.range)}: the beam went where no signal can come from.`;
  return `The beam left the dish at ${piText(k)} and passed ${k > r.ans ? 'anticlockwise' : 'clockwise'} of the satellite without catching it.`;
}
export const spotText = (r: Round, k: number) => `Check: at ${piText(k)} the dish is ${k >= r.range[0] && k <= r.range[1] ? 'inside' : 'outside'} the range ${rangeWords(r.range)} of the outer inverse function.`;
export const explain = (r: Round) => r.work;
export const intel = (r: Round) => `Point the dish at the value of ${r.text}.`;
