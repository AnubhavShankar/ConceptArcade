// Rules of Warp Lane (Maths Ch 7, sections 7.3.1 and 7.9): the warp pipe substitutes u = g(x). The player places the entry mouth at u = g(a), the exit mouth at
// u = g(b) and sets the boost factor from du = g′(x) dx. Pure: no DOM, no canvas, no Math.random. The pools and every text live here and are tested in logic.test.ts.
import { aid, type Values } from '@core/dialgame';
import { shuffle } from '@core/quiz';

export interface Row {
  /** The integral as shown: '∫₀² x(x² + 1)³ dx'. */
  text: string;
  /** The integrand, its limits and the substitution, for the tests and the drawing. */
  f: (x: number) => number;
  a: number;
  b: number;
  aText: string;
  bText: string;
  uText: string; // 'u = x² + 1'
  duText: string; // 'du = 2x dx'
  u: (x: number) => number;
  /** The integrand in u-land without the factor, and its text: 'u³'. */
  h: (u: number) => number;
  hText: string;
  /** The answer: the new limits and the factor in sixths. */
  lo: number;
  hi: number;
  k6: number;
  /** The value of the integral, written: '78', 'e⁴ − e', 'π/4'. */
  valueText: string;
}
export interface Round extends Row {
  assist: 0 | 1 | 2;
}
export type Level = 1 | 2 | 3 | 4;
export const RUN = { into: 0.4, lane: 1.0, out: 0.3 }; // seconds

const { sin, cos, tan, exp, log, sqrt, PI, E } = Math;
const R = (text: string, f: (x: number) => number, a: number, b: number, aText: string, bText: string, uText: string, duText: string, u: (x: number) => number, h: (u: number) => number, hText: string, lo: number, hi: number, k6: number, valueText: string): Row =>
  ({ text, f, a, b, aText, bText, uText, duText, u, h, hText, lo, hi, k6, valueText });

export const POOLS: Record<1 | 2 | 3 | 4, [Row[], Row[], Row[]]> = {
  1: [
    [
      R('∫₀² x(x² + 1)³ dx', (x) => x * (x * x + 1) ** 3, 0, 2, '0', '2', 'u = x² + 1', 'du = 2x dx', (x) => x * x + 1, (u) => u ** 3, 'u³', 1, 5, 3, '78'),
      R('∫₁² 2x e^(x²) dx', (x) => 2 * x * exp(x * x), 1, 2, '1', '2', 'u = x²', 'du = 2x dx', (x) => x * x, (u) => exp(u), 'eᵘ', 1, 4, 6, 'e⁴ − e'),
    ],
    [
      R('∫₀¹ 3x²(x³ + 1)⁴ dx', (x) => 3 * x * x * (x ** 3 + 1) ** 4, 0, 1, '0', '1', 'u = x³ + 1', 'du = 3x² dx', (x) => x ** 3 + 1, (u) => u ** 4, 'u⁴', 1, 2, 6, '31/5'),
      R('∫₀² x/(x² + 5) dx', (x) => x / (x * x + 5), 0, 2, '0', '2', 'u = x² + 5', 'du = 2x dx', (x) => x * x + 5, (u) => 1 / u, '1/u', 5, 9, 3, '(1/2) log(9/5)'),
    ],
    [
      R('∫₁³ (2x + 1)/(x² + x) dx', (x) => (2 * x + 1) / (x * x + x), 1, 3, '1', '3', 'u = x² + x', 'du = (2x + 1) dx', (x) => x * x + x, (u) => 1 / u, '1/u', 2, 12, 6, 'log 6'),
      R('∫₀³ x√(x² + 16) dx', (x) => x * sqrt(x * x + 16), 0, 3, '0', '3', 'u = x² + 16', 'du = 2x dx', (x) => x * x + 16, (u) => sqrt(u), '√u', 16, 25, 3, '61/3'),
    ],
  ],
  2: [
    [
      R('∫₁^e (log x)/x dx', (x) => log(x) / x, 1, E, '1', 'e', 'u = log x', 'du = dx/x', log, (u) => u, 'u', 0, 1, 6, '1/2'),
      R('∫_e^(e²) dx/(x log x)', (x) => 1 / (x * log(x)), E, E * E, 'e', 'e²', 'u = log x', 'du = dx/x', log, (u) => 1 / u, '1/u', 1, 2, 6, 'log 2'),
    ],
    [
      R('∫₀^(log 2) eˣ/(1 + eˣ) dx', (x) => exp(x) / (1 + exp(x)), 0, log(2), '0', 'log 2', 'u = 1 + eˣ', 'du = eˣ dx', (x) => 1 + exp(x), (u) => 1 / u, '1/u', 2, 3, 6, 'log(3/2)'),
      R('∫₁^(e³) (log x)²/x dx', (x) => log(x) ** 2 / x, 1, E ** 3, '1', 'e³', 'u = log x', 'du = dx/x', log, (u) => u * u, 'u²', 0, 3, 6, '9'),
    ],
    [
      R('∫₀^(log 3) e^(2x)/(1 + e^(2x)) dx', (x) => exp(2 * x) / (1 + exp(2 * x)), 0, log(3), '0', 'log 3', 'u = 1 + e^(2x)', 'du = 2e^(2x) dx', (x) => 1 + exp(2 * x), (u) => 1 / u, '1/u', 2, 10, 3, '(1/2) log 5'),
    ],
  ],
  3: [
    [
      R('∫₀^(π/4) sec² x tan x dx', (x) => tan(x) / cos(x) ** 2, 0, PI / 4, '0', 'π/4', 'u = tan x', 'du = sec² x dx', tan, (u) => u, 'u', 0, 1, 6, '1/2'),
      R('∫₀^(π/2) sin x cos² x dx', (x) => sin(x) * cos(x) ** 2, 0, PI / 2, '0', 'π/2', 'u = cos x', 'du = −sin x dx', cos, (u) => u * u, 'u²', 1, 0, -6, '1/3'),
    ],
    [
      R('∫₀^(π/2) sin x/(1 + cos² x) dx', (x) => sin(x) / (1 + cos(x) ** 2), 0, PI / 2, '0', 'π/2', 'u = cos x', 'du = −sin x dx', cos, (u) => 1 / (1 + u * u), '1/(1 + u²)', 1, 0, -6, 'π/4'),
      R('∫₀¹ x(1 − x²)³ dx', (x) => x * (1 - x * x) ** 3, 0, 1, '0', '1', 'u = 1 − x²', 'du = −2x dx', (x) => 1 - x * x, (u) => u ** 3, 'u³', 1, 0, -3, '1/8'),
    ],
    [
      R('∫₀^(π/2) sin x cos² x dx', (x) => sin(x) * cos(x) ** 2, 0, PI / 2, '0', 'π/2', 'u = cos x', 'du = −sin x dx', cos, (u) => u * u, 'u²', 1, 0, -6, '1/3'),
      R('∫₀^(π/2) sin x/(1 + cos² x) dx', (x) => sin(x) / (1 + cos(x) ** 2), 0, PI / 2, '0', 'π/2', 'u = cos x', 'du = −sin x dx', cos, (u) => 1 / (1 + u * u), '1/(1 + u²)', 1, 0, -6, 'π/4'),
      R('∫₀¹ x(1 − x²)³ dx', (x) => x * (1 - x * x) ** 3, 0, 1, '0', '1', 'u = 1 − x²', 'du = −2x dx', (x) => 1 - x * x, (u) => u ** 3, 'u³', 1, 0, -3, '1/8'),
    ],
  ],
  4: [
    [
      R('∫₀^(π/2) cos x/(1 + sin x) dx', (x) => cos(x) / (1 + sin(x)), 0, PI / 2, '0', 'π/2', 'u = 1 + sin x', 'du = cos x dx', (x) => 1 + sin(x), (u) => 1 / u, '1/u', 1, 2, 6, 'log 2'),
    ],
    [
      R('∫₀² x²√(x³ + 1) dx', (x) => x * x * sqrt(x ** 3 + 1), 0, 2, '0', '2', 'u = x³ + 1', 'du = 3x² dx', (x) => x ** 3 + 1, (u) => sqrt(u), '√u', 1, 9, 2, '52/9'),
      R('∫₀² x²/(x³ + 1) dx', (x) => (x * x) / (x ** 3 + 1), 0, 2, '0', '2', 'u = x³ + 1', 'du = 3x² dx', (x) => x ** 3 + 1, (u) => 1 / u, '1/u', 1, 9, 2, '(2/3) log 3'),
    ],
    [
      R('∫₀¹ x e^(−x²) dx', (x) => x * exp(-x * x), 0, 1, '0', '1', 'u = −x²', 'du = −2x dx', (x) => -x * x, (u) => exp(u), 'eᵘ', 0, -1, -3, '(1/2)(1 − 1/e)'),
    ],
  ],
};

/** The dials: the whole numbers the mouths can take, and the boost in sixths. */
export const RANGE = { lo: { min: -5, max: 30 }, hi: { min: -5, max: 30 }, k: { min: -12, max: 12 } };
export const START: Values = { lo: 0, hi: 0, k: 0 };

/** One row per round; a pool that repeats an earlier round's rows (level 3's boss) skips the integral already raced. */
export function buildRounds(level: Level, random: () => number): Round[] {
  const used = new Set<string>();
  return POOLS[level].map((pool, k) => {
    const order = shuffle(pool, random);
    const row = order.find((r) => !used.has(r.text)) ?? order[0];
    used.add(row.text);
    return { ...row, assist: aid(k) };
  });
}
export const judge = (r: Row, v: Values) => v.lo === r.lo && v.hi === r.hi && v.k === r.k6;
/** The first part of the warp that fails, in the order the kart meets them. */
export const fault = (r: Row, v: Values): 'entry' | 'exit' | 'boost' | null => (v.lo !== r.lo ? 'entry' : v.hi !== r.hi ? 'exit' : v.k !== r.k6 ? 'boost' : null);
/** Seconds into the race when the verdict lands. */
export const verdictTime = (r: Row, v: Values) => {
  const f = fault(r, v);
  return f === 'entry' ? RUN.into + 0.15 : f === 'exit' ? RUN.into + RUN.lane : f === 'boost' ? RUN.into + RUN.lane + 0.1 : RUN.into + RUN.lane + RUN.out;
};

export type Outcome = 'win' | 'entry' | 'exit' | 'fast' | 'slow';
/** What the race shows. The scene and the miss text both read this, so they cannot disagree: a boost that is too big is `fast`, any other wrong boost is `slow`. */
export const outcome = (r: Row, v: Values): Outcome => {
  const f = fault(r, v);
  return f === null ? 'win' : f === 'boost' ? (Math.abs(v.k) > Math.abs(r.k6) ? 'fast' : 'slow') : f;
};
/** The boost points the wrong way: a real boost of the opposite sign (a boost of 0 has no direction). */
export const backwards = (r: Row, v: Values) => v.k !== 0 && Math.sign(v.k) !== Math.sign(r.k6);
/** Which way the kart drives in u-land: 1 to the right, −1 to the left (towards a smaller u). */
export const laneDir = (v: Values): 1 | -1 => (v.hi < v.lo ? -1 : 1);

// ---- Words -----------------------------------------------------------------------------------------------------------------------------------------------

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
/** k sixths, reduced, with a true minus sign: 6 → '1', 3 → '1/2', −6 → '−1', 2 → '1/3', 0 → '0'. */
export const sixths = (k: number) => {
  if (k === 0) return '0';
  const a = Math.abs(k);
  const g = gcd(a, 6);
  const n = a / g;
  const d = 6 / g;
  return `${k < 0 ? '−' : ''}${n}${d === 1 ? '' : `/${d}`}`;
};

/** A whole number with a true minus sign. */
export const uv = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n));

export const intel = (r: Row) => `Track: ${r.text}. Warp: ${r.uText}. Place the entry mouth at the u where x = ${r.aText} lands, the exit mouth where x = ${r.bText} lands, and set the boost from ${r.duText}.`;
export const hintText = (r: Round) => `${intel(r)} ${r.assist === 0 ? 'Round 1: the ghost kart shows the clean line.' : r.assist === 1 ? 'No ghost: a test lap costs a charge.' : 'Boss round: no ghost, no test lap.'}`;
export const missText = (r: Row, v: Values) => {
  const o = outcome(r, v);
  if (o === 'entry') return `The warp from x = ${r.aText} does not open at u = ${uv(v.lo)}: Zip shot out of a dead pipe and tumbled into the void.`;
  if (o === 'exit') return `Zip warped in cleanly, but the exit mouth at u = ${uv(v.hi)} is not where x = ${r.bText} lands: the kart missed the exit and crashed into the end of the lane.`;
  return `Both mouths were right, but the boost ${sixths(v.k)} was wrong: Zip came out of the warp ${o === 'fast' ? 'too fast and spun out' : 'too slow and stalled'}${backwards(r, v) ? ', facing the wrong way' : ''}.`;
};
export const testText = (r: Row, v: Values) => `Test lap: the entry is ${v.lo === r.lo ? 'right' : 'wrong'}, the exit is ${v.hi === r.hi ? 'right' : 'wrong'} and the boost is ${v.k === r.k6 ? 'right' : 'wrong'}.`;
export const winText = (r: Row) => `Clean warp! ${r.uText}, ${r.duText}. When x = ${r.aText}, u = ${uv(r.lo)}; when x = ${r.bText}, u = ${uv(r.hi)}. So ${r.text} = ${sixths(r.k6)} × ∫ from ${uv(r.lo)} to ${uv(r.hi)} of ${r.hText} du = ${r.valueText}.`;
