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
const SUMS: Row[] = [
  { text: 'tan⁻¹(1/2) + tan⁻¹(1/3)', value: () => Math.atan(1 / 2) + Math.atan(1 / 3), work: 'tan(A + B) = (1/2 + 1/3)/(1 − 1/6) = 1, and A + B is between 0 and π/2, so it is π/4.' },
  { text: 'tan⁻¹(1/5) + tan⁻¹(2/3)', value: () => Math.atan(1 / 5) + Math.atan(2 / 3), work: 'tan(A + B) = (1/5 + 2/3)/(1 − 2/15) = 1, and A + B is between 0 and π/2, so it is π/4.' },
  { text: 'tan⁻¹(1/4) + tan⁻¹(3/5)', value: () => Math.atan(1 / 4) + Math.atan(3 / 5), work: 'tan(A + B) = (1/4 + 3/5)/(1 − 3/20) = 1, and A + B is between 0 and π/2, so it is π/4.' },
  { text: '2 tan⁻¹(1/3) + tan⁻¹(1/7)', value: () => 2 * Math.atan(1 / 3) + Math.atan(1 / 7), work: 'tan(2·tan⁻¹(1/3)) = (2/3)/(1 − 1/9) = 3/4; then (3/4 + 1/7)/(1 − 3/28) = 1, so the sum is π/4.' },
  { text: 'sin⁻¹(3/5) + cos⁻¹(3/5)', value: () => Math.asin(3 / 5) + Math.acos(3 / 5), work: 'sin⁻¹x + cos⁻¹x = π/2 for every x from −1 to 1.' },
  { text: 'sin⁻¹(4/5) + sin⁻¹(3/5)', value: () => Math.asin(4 / 5) + Math.asin(3 / 5), work: 'sin(A + B) = (4/5)(4/5) + (3/5)(3/5) = 1 with both angles positive, so A + B = π/2.' },
  { text: 'tan⁻¹ 2 + tan⁻¹ 3', value: () => Math.atan(2) + Math.atan(3), work: 'tan(A + B) = (2 + 3)/(1 − 6) = −1, and A + B is between π/2 and π, so it is 3π/4 (not −π/4).' },
  { text: 'tan⁻¹(3/2) + tan⁻¹ 5', value: () => Math.atan(3 / 2) + Math.atan(5), work: 'tan(A + B) = (3/2 + 5)/(1 − 15/2) = −1, and A + B is between π/2 and π, so it is 3π/4.' },
];
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
    const pairs = pick(SUMS.filter((r) => /tan⁻¹\(?1/.test(r.text) || r.text.startsWith('2 tan')), random)[0];
    const ident = pick(SUMS.filter((r) => r.text.startsWith('sin⁻¹')), random)[0];
    const boss = pick(SUMS.filter((r) => r.text.startsWith('tan⁻¹ 2') || r.text.startsWith('tan⁻¹(3/2)')), random)[0];
    rs = [fromRow(pairs, 'sum', [0, 12]), fromRow(ident, 'sum', [0, 12]), fromRow(boss, 'sum', [0, 12])];
  } else rs = pick(SUBST, random, 3).map((r) => fromRow(r, 'subst', [-6, 6]));
  return rs.map((r, i) => ({ ...r, assist: aid(i) }));
}

export const judge = (r: Round, k: number) => k === r.ans;

/** After a miss: what the dish did, never the right angle. */
export function missText(r: Round, k: number): string {
  if (k < r.range[0] || k > r.range[1]) return `The dish swung to ${piText(k)}, but the value of this expression can only lie in ${rangeWords(r.range)}: the beam went where no signal can come from.`;
  return `The beam left the dish at ${piText(k)} and passed ${k > r.ans ? 'anticlockwise' : 'clockwise'} of the satellite without catching it.`;
}
export const spotText = (r: Round, k: number) => `Check: at ${piText(k)} the dish is ${k >= r.range[0] && k <= r.range[1] ? 'inside' : 'outside'} the range ${rangeWords(r.range)} of the outer inverse function.`;
export const explain = (r: Round) => r.work;
export const intel = (r: Round) => `Point the dish at the value of ${r.text}.`;
