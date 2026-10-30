// Thrill Ride: the rules. Rex lays a coaster track whose slope at every pylon must be the blueprint's f(x), so the track is an antiderivative F of f.
// The player sets the coefficients of F in a fixed form (knobs in quarters from −2 to 2). Pure functions only: no DOM, no canvas.
import { aid, type Values } from '@core/dialgame';
import { shuffle } from '@core/quiz';

export interface Row {
  /** The blueprint slope as written, e.g. 'x sin x'. */
  name: string;
  f: (x: number) => number;
  /** The track form, e.g. 'F(x) = A·x cos x + B·sin x + C', and the basis functions it uses, in knob order. */
  form: string;
  basis: ((x: number) => number)[];
  /** Knob names in order: ['A', 'B'] or ['p', 'q', 'r']. */
  keys: string[];
  /** The winning coefficients, in quarters (4 means 1). */
  ans: number[];
  lo: number;
  hi: number;
  /** The antiderivative as the textbook writes it, and the working. */
  answerText: string;
  work: string;
}
export interface Round extends Row {
  assist: 0 | 1 | 2;
}
export const PYLONS = 8;
/** Seconds to lay the track. */
export const BUILD = 0.5;
/** Seconds for the car to ride the whole track. */
export const RIDE = 1.4;
/** A clip fits when the track's slope is within this share of the largest |f| at the pylons. */
export const TOL = 0.02;

const { sin, cos, exp, log, atan, asin, sqrt, tan, PI } = Math;
const R2 = (name: string, f: (x: number) => number, form: string, b1: (x: number) => number, b2: (x: number) => number, ans: [number, number], lo: number, hi: number, answerText: string, work: string): Row =>
  ({ name, f, form, basis: [b1, b2], keys: ['A', 'B'], ans, lo, hi, answerText, work });
const R3 = (name: string, f: (x: number) => number, k: number, ans: [number, number, number], lo: number, hi: number, answerText: string, work: string): Row =>
  ({ name, f, form: `F(x) = e^(${k === 1 ? '' : k === -1 ? '−' : k}x)(p x² + q x + r) + C`, basis: [(x) => x * x * exp(k * x), (x) => x * exp(k * x), (x) => exp(k * x)], keys: ['p', 'q', 'r'], ans, lo, hi, answerText, work });

export const POOLS: Record<1 | 2 | 3 | 4 | 5, [Row[], Row[], Row[]]> = {
  1: [
    [
      R2('x sin x', (x) => x * sin(x), 'F(x) = A·x cos x + B·sin x + C', (x) => x * cos(x), sin, [-4, 4], 0.3, 2 * PI - 0.3, '−x cos x + sin x + C', 'u = x, dv = sin x dx, so v = −cos x: ∫ x sin x dx = −x cos x + ∫ cos x dx = −x cos x + sin x + C. So A = −1, B = 1.'),
      R2('x cos x', (x) => x * cos(x), 'F(x) = A·x sin x + B·cos x + C', (x) => x * sin(x), cos, [4, 4], 0.3, 2 * PI - 0.3, 'x sin x + cos x + C', 'u = x, dv = cos x dx, so v = sin x: ∫ x cos x dx = x sin x − ∫ sin x dx = x sin x + cos x + C. So A = 1, B = 1.'),
    ],
    [
      R2('x sin 2x', (x) => x * sin(2 * x), 'F(x) = A·x cos 2x + B·sin 2x + C', (x) => x * cos(2 * x), (x) => sin(2 * x), [-2, 1], 0.3, PI - 0.1, '−(x cos 2x)/2 + (sin 2x)/4 + C', 'u = x, v = −(cos 2x)/2: ∫ x sin 2x dx = −(x cos 2x)/2 + ∫ (cos 2x)/2 dx = −(x cos 2x)/2 + (sin 2x)/4 + C. So A = −1/2, B = 1/4.'),
      R2('x cos 2x', (x) => x * cos(2 * x), 'F(x) = A·x sin 2x + B·cos 2x + C', (x) => x * sin(2 * x), (x) => cos(2 * x), [2, 1], 0.3, PI - 0.1, '(x sin 2x)/2 + (cos 2x)/4 + C', 'u = x, v = (sin 2x)/2: ∫ x cos 2x dx = (x sin 2x)/2 − ∫ (sin 2x)/2 dx = (x sin 2x)/2 + (cos 2x)/4 + C. So A = 1/2, B = 1/4.'),
    ],
    [
      R2('x sec² x', (x) => x / cos(x) ** 2, 'F(x) = A·x tan x + B·log(cos x) + C', (x) => x * tan(x), (x) => log(cos(x)), [4, 4], -1.2, 1.2, 'x tan x + log|cos x| + C', 'u = x, dv = sec² x dx, so v = tan x: ∫ x sec² x dx = x tan x − ∫ tan x dx = x tan x + log|cos x| + C. So A = 1, B = 1.'),
    ],
  ],
  2: [
    [
      R3('x eˣ', (x) => x * exp(x), 1, [0, 4, -4], -2, 1.5, 'eˣ(x − 1) + C', 'u = x, dv = eˣ dx: ∫ x eˣ dx = x eˣ − ∫ eˣ dx = eˣ(x − 1) + C. So p = 0, q = 1, r = −1.'),
      R3('x e^(2x)', (x) => x * exp(2 * x), 2, [0, 2, -1], -2, 1, 'e^(2x)(x/2 − 1/4) + C', 'u = x, v = e^(2x)/2: ∫ x e^(2x) dx = (x e^(2x))/2 − ∫ e^(2x)/2 dx = e^(2x)(x/2 − 1/4) + C. So p = 0, q = 1/2, r = −1/4.'),
    ],
    [
      R3('x e^(−x)', (x) => x * exp(-x), -1, [0, -4, -4], -1, 3, '−e^(−x)(x + 1) + C', 'u = x, v = −e^(−x): ∫ x e^(−x) dx = −x e^(−x) + ∫ e^(−x) dx = −e^(−x)(x + 1) + C. So p = 0, q = −1, r = −1.'),
    ],
    [
      R3('x² eˣ', (x) => x * x * exp(x), 1, [4, -8, 8], -2, 1.5, 'eˣ(x² − 2x + 2) + C', 'Twice by parts: ∫ x² eˣ dx = x² eˣ − 2∫ x eˣ dx = x² eˣ − 2eˣ(x − 1) = eˣ(x² − 2x + 2) + C. So p = 1, q = −2, r = 2.'),
      R3('x² e^(−x)', (x) => x * x * exp(-x), -1, [-4, -8, -8], -1, 3, '−e^(−x)(x² + 2x + 2) + C', 'Twice by parts: ∫ x² e^(−x) dx = −x² e^(−x) + 2∫ x e^(−x) dx = −x² e^(−x) − 2e^(−x)(x + 1) = −e^(−x)(x² + 2x + 2) + C. So p = −1, q = −2, r = −2.'),
    ],
  ],
  3: [
    [
      R2('log x', log, 'F(x) = A·x log x + B·x + C', (x) => x * log(x), (x) => x, [4, -4], 0.5, 3, 'x log x − x + C', 'u = log x, dv = dx, so v = x: ∫ log x dx = x log x − ∫ x · (1/x) dx = x log x − x + C. So A = 1, B = −1.'),
      R2('x log x', (x) => x * log(x), 'F(x) = A·x² log x + B·x² + C', (x) => x * x * log(x), (x) => x * x, [2, -1], 0.5, 3, '(x² log x)/2 − x²/4 + C', 'u = log x, dv = x dx, so v = x²/2: ∫ x log x dx = (x² log x)/2 − ∫ (x/2) dx = (x² log x)/2 − x²/4 + C. So A = 1/2, B = −1/4.'),
    ],
    [
      R2('tan⁻¹ x', atan, 'F(x) = A·x tan⁻¹ x + B·log(1 + x²) + C', (x) => x * atan(x), (x) => log(1 + x * x), [4, -2], -2, 2, 'x tan⁻¹ x − (1/2) log(1 + x²) + C', 'u = tan⁻¹ x, dv = dx: ∫ tan⁻¹ x dx = x tan⁻¹ x − ∫ x/(1 + x²) dx = x tan⁻¹ x − (1/2) log(1 + x²) + C. So A = 1, B = −1/2.'),
      R2('sin⁻¹ x', asin, 'F(x) = A·x sin⁻¹ x + B·√(1 − x²) + C', (x) => x * asin(x), (x) => sqrt(1 - x * x), [4, 4], -0.9, 0.9, 'x sin⁻¹ x + √(1 − x²) + C', 'u = sin⁻¹ x, dv = dx: ∫ sin⁻¹ x dx = x sin⁻¹ x − ∫ x/√(1 − x²) dx = x sin⁻¹ x + √(1 − x²) + C. So A = 1, B = 1.'),
    ],
    [
      R2('x tan⁻¹ x', (x) => x * atan(x), 'F(x) = A·(x² + 1) tan⁻¹ x + B·x + C', (x) => (x * x + 1) * atan(x), (x) => x, [2, -2], -2, 2, '((x² + 1)/2) tan⁻¹ x − x/2 + C', 'u = tan⁻¹ x, v = x²/2: ∫ x tan⁻¹ x dx = (x²/2) tan⁻¹ x − (1/2)∫ x²/(1 + x²) dx = (x²/2) tan⁻¹ x − (1/2)(x − tan⁻¹ x) = ((x² + 1)/2) tan⁻¹ x − x/2 + C. So A = 1/2, B = −1/2.'),
    ],
  ],
  4: [
    [
      R2('eˣ(sin x + cos x)', (x) => exp(x) * (sin(x) + cos(x)), 'F(x) = A·eˣ sin x + B·eˣ cos x + C', (x) => exp(x) * sin(x), (x) => exp(x) * cos(x), [4, 0], -PI, PI, 'eˣ sin x + C', 'With f = sin x, f′ = cos x, so the integrand is eˣ[f + f′] and the integral is eˣ sin x + C. So A = 1, B = 0.'),
      R2('eˣ(cos x − sin x)', (x) => exp(x) * (cos(x) - sin(x)), 'F(x) = A·eˣ sin x + B·eˣ cos x + C', (x) => exp(x) * sin(x), (x) => exp(x) * cos(x), [0, 4], -PI, PI, 'eˣ cos x + C', 'With f = cos x, f′ = −sin x, so the integrand is eˣ[f + f′] and the integral is eˣ cos x + C. So A = 0, B = 1.'),
    ],
    [
      R2('eˣ(1/x − 1/x²)', (x) => exp(x) * (1 / x - 1 / (x * x)), 'F(x) = A·eˣ/x + B·eˣ + C', (x) => exp(x) / x, exp, [4, 0], 0.5, 3, 'eˣ/x + C', 'With f = 1/x, f′ = −1/x², so the integral is eˣ/x + C. So A = 1, B = 0.'),
      R2('x eˣ/(1 + x)²', (x) => (x * exp(x)) / (1 + x) ** 2, 'F(x) = A·eˣ/(1 + x) + B·eˣ + C', (x) => exp(x) / (1 + x), exp, [4, 0], 0, 3, 'eˣ/(1 + x) + C', 'x/(1 + x)² = 1/(1 + x) − 1/(1 + x)², and with f = 1/(1 + x), f′ = −1/(1 + x)², so the integral is eˣ/(1 + x) + C. So A = 1, B = 0.'),
    ],
    [
      R2('eˣ(x² + 2x)', (x) => exp(x) * (x * x + 2 * x), 'F(x) = A·x² eˣ + B·x eˣ + C', (x) => x * x * exp(x), (x) => x * exp(x), [4, 0], -2, 1.5, 'x² eˣ + C', 'With f = x², f′ = 2x, so the integral is x² eˣ + C. So A = 1, B = 0.'),
      R2('eˣ(sin x − cos x)', (x) => exp(x) * (sin(x) - cos(x)), 'F(x) = A·eˣ sin x + B·eˣ cos x + C', (x) => exp(x) * sin(x), (x) => exp(x) * cos(x), [0, -4], -PI, PI, '−eˣ cos x + C', 'With f = −cos x, f′ = sin x, so the integrand is eˣ[f + f′] and the integral is −eˣ cos x + C. So A = 0, B = −1.'),
    ],
  ],
  5: [
    [
      R2('eˣ sin x', (x) => exp(x) * sin(x), 'F(x) = A·eˣ sin x + B·eˣ cos x + C', (x) => exp(x) * sin(x), (x) => exp(x) * cos(x), [2, -2], -PI, PI, '(eˣ/2)(sin x − cos x) + C', 'Let I = ∫ eˣ sin x dx. By parts twice: I = −eˣ cos x + eˣ sin x − I, so 2I = eˣ(sin x − cos x) and I = (eˣ/2)(sin x − cos x) + C. So A = 1/2, B = −1/2.'),
      R2('eˣ cos x', (x) => exp(x) * cos(x), 'F(x) = A·eˣ sin x + B·eˣ cos x + C', (x) => exp(x) * sin(x), (x) => exp(x) * cos(x), [2, 2], -PI, PI, '(eˣ/2)(sin x + cos x) + C', 'Let I = ∫ eˣ cos x dx. By parts twice: I = eˣ sin x + eˣ cos x − I, so I = (eˣ/2)(sin x + cos x) + C. So A = 1/2, B = 1/2.'),
    ],
    [
      R2('e^(−x) sin x', (x) => exp(-x) * sin(x), 'F(x) = A·e^(−x) sin x + B·e^(−x) cos x + C', (x) => exp(-x) * sin(x), (x) => exp(-x) * cos(x), [-2, -2], -PI, PI, '−(e^(−x)/2)(sin x + cos x) + C', 'Let I = ∫ e^(−x) sin x dx. By parts twice: I = −e^(−x) cos x − e^(−x) sin x − I, so I = −(e^(−x)/2)(sin x + cos x) + C. So A = −1/2, B = −1/2.'),
    ],
    [
      R2('e^(2x) sin 2x', (x) => exp(2 * x) * sin(2 * x), 'F(x) = A·e^(2x) sin 2x + B·e^(2x) cos 2x + C', (x) => exp(2 * x) * sin(2 * x), (x) => exp(2 * x) * cos(2 * x), [1, -1], -PI / 2, PI / 2, '(e^(2x)/4)(sin 2x − cos 2x) + C', 'Let I = ∫ e^(2x) sin 2x dx. By parts twice: I = (e^(2x)/2)(sin 2x − cos 2x) − I, so 2I = (e^(2x)/2)(sin 2x − cos 2x) and I = (e^(2x)/4)(sin 2x − cos 2x) + C. So A = 1/4, B = −1/4.'),
      R2('e^(2x) cos 2x', (x) => exp(2 * x) * cos(2 * x), 'F(x) = A·e^(2x) sin 2x + B·e^(2x) cos 2x + C', (x) => exp(2 * x) * sin(2 * x), (x) => exp(2 * x) * cos(2 * x), [1, 1], -PI / 2, PI / 2, '(e^(2x)/4)(sin 2x + cos 2x) + C', 'Let I = ∫ e^(2x) cos 2x dx. By parts twice the integral comes back: 2I = (e^(2x)/2)(sin 2x + cos 2x), so I = (e^(2x)/4)(sin 2x + cos 2x) + C. So A = 1/4, B = 1/4.'),
    ],
  ],
};

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
export const buildRounds = (level: 1 | 2 | 3 | 4 | 5, random: () => number): Round[] => POOLS[level].map((pool, k) => ({ ...pick(pool, random), assist: aid(k) }));
export const coeffs = (r: Row, v: Values) => r.keys.map((k) => v[k] ?? 0);
/** The player's track: F(x) = Σ (c_i/4)·basis_i(x), shifted so F(lo) = 0 (the station fixes the constant). */
export const track = (r: Row, c: number[]) => (x: number) => r.basis.reduce((s, g, i) => s + (c[i] / 4) * (g(x) - g(r.lo)), 0);
/** The track's slope, by a central difference (h = 1e-5). */
export const slopeAt = (r: Row, c: number[], x: number) => (track(r, c)(x + 1e-5) - track(r, c)(x - 1e-5)) / 2e-5;
export const pylonX = (r: Row, i: number) => r.lo + ((r.hi - r.lo) * (i + 0.5)) / PYLONS;
export const judge = (r: Row, c: number[]) => c.every((v, i) => v === r.ans[i]);

const tolerance = (r: Row) => TOL * Math.max(...Array.from({ length: PYLONS }, (_, i) => Math.abs(r.f(pylonX(r, i)))));
/** Does the track's slope fit the clip at pylon i? */
export const fits = (r: Row, c: number[], i: number) => Math.abs(slopeAt(r, c, pylonX(r, i)) - r.f(pylonX(r, i))) <= tolerance(r);
/** How many of the 8 clips the track fits. */
export const fitCount = (r: Row, c: number[]) => Array.from({ length: PYLONS }, (_, i) => fits(r, c, i)).filter(Boolean).length;
/** The first pylon whose clip the track does not fit (slope off by more than 2% of the largest |f| at the pylons), and whether the track is too steep or too shallow there. */
export function firstFault(r: Row, c: number[]): { pylon: number; steep: boolean } | null {
  const tol = tolerance(r);
  for (let i = 0; i < PYLONS; i++) {
    const d = slopeAt(r, c, pylonX(r, i)) - r.f(pylonX(r, i));
    if (Math.abs(d) > tol) return { pylon: i, steep: d > 0 };
  }
  return null;
}
/** Seconds into the run when the verdict lands. */
export const verdictTime = (r: Row, c: number[]) => {
  const f = firstFault(r, c);
  return f ? BUILD + (RIDE * (f.pylon + 0.5)) / PYLONS + 0.3 : BUILD + RIDE;
};

// ---- Words -----------------------------------------------------------------------------------------------------------------------------------------------

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
/** A knob value in quarters written as a reduced fraction with a true minus sign: 4 → 1, −2 → −1/2, 1 → 1/4. */
export function q4(v: number): string {
  if (v === 0) return '0';
  const a = Math.abs(v);
  const d = gcd(a, 4);
  const n = a / d;
  const den = 4 / d;
  return `${v < 0 ? '−' : ''}${n}${den === 1 ? '' : `/${den}`}`;
}

export const intel = (r: Row) => `Blueprint slope: f(x) = ${r.name}. Track form: ${r.form}. Set ${r.keys.join(', ')} so the track’s slope is f(x) at every pylon.`;
export const hintText = (r: Round) => `${intel(r)} ${r.assist === 0 ? 'Round 1: the track shows live as you turn the knobs.' : r.assist === 1 ? 'The track is hidden: a test lay costs a charge.' : 'Boss round: no preview.'}`;
export function missText(r: Row, c: number[]): string {
  const f = firstFault(r, c);
  if (!f) return 'The track fits every clip.';
  return `The track ran into pylon ${f.pylon + 1} ${f.steep ? 'too steep' : 'too shallow'} for its clip: the rail buckled and the test car flew off.`;
}
export const testText = (r: Row, c: number[]) => `Test lay: the track fits ${fitCount(r, c)} of the 8 clips.`;
export const winText = (r: Row) => `The car rode the whole track! ∫ ${r.name} dx = ${r.answerText}. ${r.work}`;
