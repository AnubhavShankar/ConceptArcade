// Pure rules of Dock Drift: no DOM, no canvas. A maintenance robot lets go of a rail y = f(x) at x = x0 and, in zero gravity, drifts straight on along the
// tangent. The docking clamp is on the hull wall d metres further along, so the robot arrives d · f′(x0) metres above (or below) the release height.
// The player slides the clamp to that whole-number height; exactly one height in the dial range catches the robot.
import { aid } from '@core/dialgame';
import { num } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'product' | 'tower' | 'root' | 'sum' | 'invtrig';
export interface Entry {
  kind: Kind;
  /** The rail as posted, e.g. 'y = (x − 1)²(x − 3)³'. */
  text: string;
  f: (x: number) => number;
  /** The release point and how it is written ('2', '1/2', 'e'). */
  x0: number;
  x0Text: string;
  /** Metres from the release point to the wall. */
  d: number;
  /** The winning clamp height: d · f′(x0), a whole number. */
  ans: number;
  /** The working shown after a win. */
  work: string;
}
export interface Round extends Entry {
  start: number;
  assist: 0 | 1 | 2;
}
export const DIAL = { min: -12, max: 12 };
export const DOCK = 1.4; // seconds from release to reaching the wall

const E = Math.E,
  ln = Math.log,
  sq = Math.sqrt,
  at = Math.atan,
  as = Math.asin,
  ac = Math.acos;
const row = (kind: Kind, text: string, f: (x: number) => number, x0: number, x0Text: string, d: number, ans: number, work: string): Entry => ({ kind, text, f, x0, x0Text, d, ans, work });

export const POOLS: Record<1 | 2 | 3 | 4 | 5, [Entry[], Entry[], Entry[]]> = {
  1: [
    [
      row('product', 'y = (x − 1)²(x − 3)³', (x) => (x - 1) ** 2 * (x - 3) ** 3, 2, '2', 4, 4, 'log|y| = 2 log|x − 1| + 3 log|x − 3|, so y′/y = 2/(x − 1) + 3/(x − 3). At x = 2: y = −1 and y′/y = 2 − 3 = −1, so y′ = 1. Over 4 m the clamp sits 4 × 1 = 4 m up.'),
      row('product', 'y = (x + 1)³(x − 1)²', (x) => (x + 1) ** 3 * (x - 1) ** 2, 0, '0', 3, 3, 'y′/y = 3/(x + 1) + 2/(x − 1). At x = 0: y = 1 and y′/y = 3 − 2 = 1, so y′ = 1. Over 3 m: 3 m up.'),
      row('product', 'y = x³(x − 2)²', (x) => x ** 3 * (x - 2) ** 2, 1, '1', 5, 5, 'y′/y = 3/x + 2/(x − 2). At x = 1: y = 1 and y′/y = 3 − 2 = 1, so y′ = 1. Over 5 m: 5 m up.'),
      row('product', 'y = (x − 2)²(x + 1)³', (x) => (x - 2) ** 2 * (x + 1) ** 3, 1, '1', 2, -8, 'y′/y = 2/(x − 2) + 3/(x + 1). At x = 1: y = 8 and y′/y = −2 + 3/2 = −1/2, so y′ = −4. Over 2 m: 8 m down.'),
      row('product', 'y = (x + 2)²(x − 1)⁴', (x) => (x + 2) ** 2 * (x - 1) ** 4, 0, '0', 1, -12, 'y′/y = 2/(x + 2) + 4/(x − 1). At x = 0: y = 4 and y′/y = 1 − 4 = −3, so y′ = −12. Over 1 m: 12 m down.'),
    ],
    [
      row('product', 'y = (x + 1)(x − 1)²(x + 2)', (x) => (x + 1) * (x - 1) ** 2 * (x + 2), 0, '0', 6, -6, 'y′/y = 1/(x + 1) + 2/(x − 1) + 1/(x + 2). At x = 0: y = 2 and y′/y = 1 − 2 + 1/2 = −1/2, so y′ = −1. Over 6 m: 6 m down.'),
      row('product', 'y = (x − 1)(x + 1)²(x − 2)³', (x) => (x - 1) * (x + 1) ** 2 * (x - 2) ** 3, 0, '0', 2, -8, 'y′/y = 1/(x − 1) + 2/(x + 1) + 3/(x − 2). At x = 0: y = 8 and y′/y = −1 + 2 − 3/2 = −1/2, so y′ = −4. Over 2 m: 8 m down.'),
      row('product', 'y = (x + 1)²(x + 2)(x − 2)', (x) => (x + 1) ** 2 * (x + 2) * (x - 2), 0, '0', 1, -8, 'y′/y = 2/(x + 1) + 1/(x + 2) + 1/(x − 2). At x = 0: y = −4 and y′/y = 2 + 1/2 − 1/2 = 2, so y′ = −8. Over 1 m: 8 m down.'),
      row('product', 'y = (2x + 1)(x + 1)²(x − 1)³', (x) => (2 * x + 1) * (x + 1) ** 2 * (x - 1) ** 3, 0, '0', 5, -5, 'y′/y = 2/(2x + 1) + 2/(x + 1) + 3/(x − 1). At x = 0: y = −1 and y′/y = 2 + 2 − 3 = 1, so y′ = −1. Over 5 m: 5 m down.'),
    ],
    [
      row('product', 'y = (x + 1)³(x − 2)²/(x + 2)²', (x) => ((x + 1) ** 3 * (x - 2) ** 2) / (x + 2) ** 2, 0, '0', 7, 7, 'y′/y = 3/(x + 1) + 2/(x − 2) − 2/(x + 2). At x = 0: y = 1 and y′/y = 3 − 1 − 1 = 1, so y′ = 1. Over 7 m: 7 m up.'),
      row('product', 'y = (x + 2)²/(x + 1)³', (x) => (x + 2) ** 2 / (x + 1) ** 3, 0, '0', 1, -8, 'y′/y = 2/(x + 2) − 3/(x + 1). At x = 0: y = 4 and y′/y = 1 − 3 = −2, so y′ = −8. Over 1 m: 8 m down.'),
      row('product', 'y = x²(x + 3)/(x + 1)²', (x) => (x * x * (x + 3)) / (x + 1) ** 2, 1, '1', 4, 5, 'y′/y = 2/x + 1/(x + 3) − 2/(x + 1). At x = 1: y = 1 and y′/y = 2 + 1/4 − 1 = 5/4, so y′ = 5/4. Over 4 m: 5 m up.'),
      row('product', 'y = (x − 1)²(x + 2)/(x + 1)⁴', (x) => ((x - 1) ** 2 * (x + 2)) / (x + 1) ** 4, 0, '0', 1, -11, 'y′/y = 2/(x − 1) + 1/(x + 2) − 4/(x + 1). At x = 0: y = 2 and y′/y = −2 + 1/2 − 4 = −11/2, so y′ = −11. Over 1 m: 11 m down.'),
    ],
  ],
  2: [
    [
      row('tower', 'y = x^x', (x) => x ** x, 1, '1', 3, 3, 'log y = x log x, so y′/y = log x + 1. At x = 1: y = 1 and y′/y = 0 + 1 = 1, so y′ = 1. Over 3 m: 3 m up.'),
      row('tower', 'y = x^(x²)', (x) => x ** (x * x), 1, '1', 5, 5, 'log y = x² log x, so y′/y = 2x log x + x. At x = 1: y = 1 and y′/y = 0 + 1 = 1. Over 5 m: 5 m up.'),
      row('tower', 'y = x^(2x)', (x) => x ** (2 * x), 1, '1', 4, 8, 'log y = 2x log x, so y′/y = 2 log x + 2. At x = 1: y = 1 and y′ = 2. Over 4 m: 8 m up.'),
    ],
    [
      row('tower', 'y = (2x − 1)^x', (x) => (2 * x - 1) ** x, 1, '1', 5, 10, 'log y = x log(2x − 1), so y′/y = log(2x − 1) + 2x/(2x − 1). At x = 1 the base is 1: y = 1 and y′/y = 0 + 2 = 2. Over 5 m: 10 m up.'),
      row('tower', 'y = (2x − 3)^(x²)', (x) => (2 * x - 3) ** (x * x), 2, '2', 1, 8, 'log y = x² log(2x − 3), so y′/y = 2x log(2x − 3) + 2x²/(2x − 3). At x = 2 the base is 1: y′/y = 0 + 8 = 8. Over 1 m: 8 m up.'),
      row('tower', 'y = (x² − 3)^(x + 1)', (x) => (x * x - 3) ** (x + 1), 2, '2', 1, 12, 'log y = (x + 1) log(x² − 3), so y′/y = log(x² − 3) + 2x(x + 1)/(x² − 3). At x = 2 the base is 1: y′/y = 0 + 12 = 12. Over 1 m: 12 m up.'),
      row('tower', 'y = (3 − x)^x', (x) => (3 - x) ** x, 2, '2', 4, -8, 'log y = x log(3 − x), so y′/y = log(3 − x) − x/(3 − x). At x = 2 the base is 1: y′/y = 0 − 2 = −2. Over 4 m: 8 m down.'),
      row('tower', 'y = (x² − x − 1)^x', (x) => (x * x - x - 1) ** x, 2, '2', 2, 12, 'log y = x log(x² − x − 1), so y′/y = log(x² − x − 1) + x(2x − 1)/(x² − x − 1). At x = 2 the base is 1: y′/y = 0 + 6 = 6. Over 2 m: 12 m up.'),
    ],
    [
      row('tower', 'y = (x/2)^x', (x) => (x / 2) ** x, 2, '2', 7, 7, 'log y = x log(x/2), so y′/y = log(x/2) + 1. At x = 2: y = 1 and y′/y = 1. Over 7 m: 7 m up.'),
      row('tower', 'y = (x/3)^(x²)', (x) => (x / 3) ** (x * x), 3, '3', 3, 9, 'log y = x² log(x/3), so y′/y = 2x log(x/3) + x. At x = 3: y = 1 and y′/y = 3. Over 3 m: 9 m up.'),
      row('tower', 'y = (log x)^x', (x) => ln(x) ** x, E, 'e', 6, 6, 'log y = x log(log x), so y′/y = log(log x) + 1/log x. At x = e, log x = 1: y = 1 and y′/y = 0 + 1 = 1. Over 6 m: 6 m up.'),
      row('tower', 'y = (log x)^(2x)', (x) => ln(x) ** (2 * x), E, 'e', 4, 8, 'log y = 2x log(log x), so y′/y = 2 log(log x) + 2/log x. At x = e: y = 1 and y′/y = 2. Over 4 m: 8 m up.'),
    ],
  ],
  3: [
    [
      row('root', 'y = √((x + 2)(x − 4)/(x − 2))', (x) => sq(((x + 2) * (x - 4)) / (x - 2)), 0, '0', 4, 3, 'log y = ½[log|x + 2| + log|x − 4| − log|x − 2|], so y′/y = ½[1/(x + 2) + 1/(x − 4) − 1/(x − 2)]. At x = 0: y = √4 = 2 and y′/y = ½(1/2 − 1/4 + 1/2) = 3/8, so y′ = 3/4. Over 4 m: 3 m up.'),
      row('root', 'y = √((x + 1)(x − 4)/(x − 1))', (x) => sq(((x + 1) * (x - 4)) / (x - 1)), 0, '0', 4, 7, 'y′/y = ½[1/(x + 1) + 1/(x − 4) − 1/(x − 1)]. At x = 0: y = √4 = 2 and y′/y = ½(1 − 1/4 + 1) = 7/8, so y′ = 7/4. Over 4 m: 7 m up.'),
      row('root', 'y = √((x + 3)(x − 3)/(x − 1))', (x) => sq(((x + 3) * (x - 3)) / (x - 1)), 0, '0', 2, 3, 'y′/y = ½[1/(x + 3) + 1/(x − 3) − 1/(x − 1)]. At x = 0: y = √9 = 3 and y′/y = ½(1/3 − 1/3 + 1) = 1/2, so y′ = 3/2. Over 2 m: 3 m up.'),
      row('root', 'y = √((x + 5)(x − 1)/(x − 2))', (x) => sq(((x + 5) * (x - 1)) / (x - 2)), 3, '3', 4, -3, 'y′/y = ½[1/(x + 5) + 1/(x − 1) − 1/(x − 2)]. At x = 3: y = √16 = 4 and y′/y = ½(1/8 + 1/2 − 1) = −3/16, so y′ = −3/4. Over 4 m: 3 m down.'),
    ],
    [
      row('root', 'y = √((x + 4)(x + 1)/((x − 1)(x − 4)))', (x) => sq(((x + 4) * (x + 1)) / ((x - 1) * (x - 4))), 0, '0', 4, 5, 'y′/y = ½[1/(x + 4) + 1/(x + 1) − 1/(x − 1) − 1/(x − 4)]. At x = 0: y = 1 and y′/y = ½(1/4 + 1 + 1 + 1/4) = 5/4. Over 4 m: 5 m up.'),
      row('root', 'y = √((x + 5)(x + 1)/((x − 1)(x − 5)))', (x) => sq(((x + 5) * (x + 1)) / ((x - 1) * (x - 5))), 0, '0', 5, 6, 'y′/y = ½[1/(x + 5) + 1/(x + 1) − 1/(x − 1) − 1/(x − 5)]. At x = 0: y = 1 and y′/y = ½(1/5 + 1 + 1 + 1/5) = 6/5. Over 5 m: 6 m up.'),
      row('root', 'y = √((x + 4)(x + 2)/((x − 2)(x − 4)))', (x) => sq(((x + 4) * (x + 2)) / ((x - 2) * (x - 4))), 0, '0', 4, 3, 'y′/y = ½[1/(x + 4) + 1/(x + 2) − 1/(x − 2) − 1/(x − 4)]. At x = 0: y = 1 and y′/y = ½(1/4 + 1/2 + 1/2 + 1/4) = 3/4. Over 4 m: 3 m up.'),
    ],
    [
      row('root', 'y = √((x + 4)(x + 2)/((x − 1)(x − 2)))', (x) => sq(((x + 4) * (x + 2)) / ((x - 1) * (x - 2))), 0, '0', 4, 9, 'y′/y = ½[1/(x + 4) + 1/(x + 2) − 1/(x − 1) − 1/(x − 2)]. At x = 0: y = √4 = 2 and y′/y = ½(1/4 + 1/2 + 1 + 1/2) = 9/8, so y′ = 9/4. Over 4 m: 9 m up.'),
      row('root', 'y = √((x + 4)(x − 2)/((x + 2)(x − 1)))', (x) => sq(((x + 4) * (x - 2)) / ((x + 2) * (x - 1))), 0, '0', 4, 1, 'y′/y = ½[1/(x + 4) + 1/(x − 2) − 1/(x + 2) − 1/(x − 1)]. At x = 0: y = √4 = 2 and y′/y = ½(1/4 − 1/2 − 1/2 + 1) = 1/8, so y′ = 1/4. Over 4 m: 1 m up.'),
      row('root', 'y = √((x + 4)(x − 6)/((x + 3)(x − 2)))', (x) => sq(((x + 4) * (x - 6)) / ((x + 3) * (x - 2))), 0, '0', 4, 1, 'y′/y = ½[1/(x + 4) + 1/(x − 6) − 1/(x + 3) − 1/(x − 2)]. At x = 0: y = √4 = 2 and y′/y = ½(1/4 − 1/6 − 1/3 + 1/2) = 1/8, so y′ = 1/4. Over 4 m: 1 m up.'),
    ],
  ],
  4: [
    [
      row('sum', 'y = x^x + (2x − 1)^x', (x) => x ** x + (2 * x - 1) ** x, 1, '1', 2, 6, 'Differentiate each term: (x^x)′ = x^x(log x + 1) = 1 at x = 1, and ((2x − 1)^x)′ = (2x − 1)^x[log(2x − 1) + 2x/(2x − 1)] = 2 at x = 1. So y′ = 3. Over 2 m: 6 m up.'),
      row('sum', 'y = x^x + x^(1/x)', (x) => x ** x + x ** (1 / x), 1, '1', 3, 6, '(x^x)′ = 1 at x = 1, and (x^(1/x))′ = x^(1/x)(1 − log x)/x² = 1 at x = 1. So y′ = 2. Over 3 m: 6 m up.'),
    ],
    [
      row('sum', 'y = (x/2)^x + (x − 1)^x', (x) => (x / 2) ** x + (x - 1) ** x, 2, '2', 2, 6, '((x/2)^x)′ = (x/2)^x[log(x/2) + 1] = 1 at x = 2, and ((x − 1)^x)′ = (x − 1)^x[log(x − 1) + x/(x − 1)] = 2 at x = 2. So y′ = 3. Over 2 m: 6 m up.'),
      row('sum', 'y = x^(2x) + (3 − 2x)^x', (x) => x ** (2 * x) + (3 - 2 * x) ** x, 1, '1', 4, 0, '(x^(2x))′ = 2 at x = 1, and ((3 − 2x)^x)′ = (3 − 2x)^x[log(3 − 2x) − 2x/(3 − 2x)] = −2 at x = 1. The slopes cancel: y′ = 0, so the clamp sits level with the release point.'),
      row('sum', 'y = (2x − 1)^x − x^x', (x) => (2 * x - 1) ** x - x ** x, 1, '1', 5, 5, '((2x − 1)^x)′ = 2 and (x^x)′ = 1 at x = 1, so y′ = 2 − 1 = 1. Over 5 m: 5 m up.'),
    ],
    [
      row('sum', 'y = x^x + (x + 1)²(x − 2)³', (x) => x ** x + (x + 1) ** 2 * (x - 2) ** 3, 1, '1', 1, 9, '(x^x)′ = 1 at x = 1. For the product, y₂′/y₂ = 2/(x + 1) + 3/(x − 2) = 1 − 3 = −2 with y₂ = −4, so y₂′ = 8. Total y′ = 9. Over 1 m: 9 m up.'),
      row('sum', 'y = (x/2)^x + (x − 1)²(x − 3)³', (x) => (x / 2) ** x + (x - 1) ** 2 * (x - 3) ** 3, 2, '2', 3, 6, '((x/2)^x)′ = 1 at x = 2. For the product, y₂ = −1 and y₂′/y₂ = 2 − 3 = −1, so y₂′ = 1. Total y′ = 2. Over 3 m: 6 m up.'),
      row('sum', 'y = x^(x²) + x²(x + 3)/(x + 1)²', (x) => x ** (x * x) + (x * x * (x + 3)) / (x + 1) ** 2, 1, '1', 4, 9, '(x^(x²))′ = 1 at x = 1. For the quotient, y₂ = 1 and y₂′/y₂ = 2 + 1/4 − 1 = 5/4. Total y′ = 9/4. Over 4 m: 9 m up.'),
    ],
  ],
  5: [
    [
      row('invtrig', 'y = sin⁻¹(x/2)', (x) => as(x / 2), 0, '0', 4, 2, 'y′ = (1/2)/√(1 − x²/4) = 1/√(4 − x²). At x = 0: y′ = 1/2. Over 4 m: 2 m up.'),
      row('invtrig', 'y = tan⁻¹(2x)', (x) => at(2 * x), 0.5, '1/2', 3, 3, 'y′ = 2/(1 + 4x²). At x = 1/2: y′ = 2/2 = 1. Over 3 m: 3 m up.'),
      row('invtrig', 'y = cos⁻¹(x/2)', (x) => ac(x / 2), 0, '0', 4, -2, 'y′ = −1/√(4 − x²). At x = 0: y′ = −1/2. Over 4 m: 2 m down.'),
    ],
    [
      row('invtrig', 'y = sin⁻¹(2x/(1 + x²))', (x) => as((2 * x) / (1 + x * x)), 0.5, '1/2', 5, 8, 'Put x = tan θ: 2x/(1 + x²) = sin 2θ, and for |x| ≤ 1, y = 2θ = 2 tan⁻¹ x. So y′ = 2/(1 + x²) = 2/(5/4) = 8/5 at x = 1/2. Over 5 m: 8 m up.'),
      row('invtrig', 'y = tan⁻¹((3x − x³)/(1 − 3x²))', (x) => at((3 * x - x ** 3) / (1 - 3 * x * x)), 0.5, '1/2', 5, 12, 'Put x = tan θ: (3x − x³)/(1 − 3x²) = tan 3θ, and for |x| < 1/√3, y = 3 tan⁻¹ x. So y′ = 3/(1 + x²) = 12/5 at x = 1/2. Over 5 m: 12 m up.'),
      row('invtrig', 'y = cos⁻¹((1 − x²)/(1 + x²))', (x) => ac((1 - x * x) / (1 + x * x)), 0.5, '1/2', 5, 8, 'Put x = tan θ: (1 − x²)/(1 + x²) = cos 2θ, and for 0 < x < 1, y = 2 tan⁻¹ x. So y′ = 2/(1 + x²) = 8/5 at x = 1/2. Over 5 m: 8 m up.'),
      row('invtrig', 'y = sin⁻¹(2x√(1 − x²))', (x) => as(2 * x * sq(1 - x * x)), 0.6, '3/5', 2, 5, 'Put x = sin θ: 2x√(1 − x²) = sin 2θ, and for |x| < 1/√2, y = 2 sin⁻¹ x. So y′ = 2/√(1 − x²) = 2/(4/5) = 5/2 at x = 3/5. Over 2 m: 5 m up.'),
    ],
    [
      row('invtrig', 'y = sin⁻¹((1 − x²)/(1 + x²))', (x) => as((1 - x * x) / (1 + x * x)), 0.5, '1/2', 5, -8, 'Put x = tan θ: (1 − x²)/(1 + x²) = cos 2θ = sin(π/2 − 2θ), so for 0 < x < 1, y = π/2 − 2 tan⁻¹ x and y′ = −2/(1 + x²) = −8/5 at x = 1/2. Over 5 m: 8 m down.'),
      row('invtrig', 'y = cos⁻¹(2x/(1 + x²))', (x) => ac((2 * x) / (1 + x * x)), 1 / 3, '1/3', 5, -9, 'Put x = tan θ: 2x/(1 + x²) = sin 2θ, so for −1 < x < 1, y = π/2 − 2 tan⁻¹ x and y′ = −2/(1 + x²) = −2/(10/9) = −9/5 at x = 1/3. Over 5 m: 9 m down.'),
      row('invtrig', 'y = sec⁻¹(1/(2x² − 1))', (x) => ac(2 * x * x - 1), 0.6, '3/5', 2, -5, 'sec⁻¹(1/u) = cos⁻¹ u. Put x = cos θ: 2x² − 1 = cos 2θ, so for 0 < x < 1/√2, y = 2θ = 2 cos⁻¹ x and y′ = −2/√(1 − x²) = −5/2 at x = 3/5. Over 2 m: 5 m down.'),
    ],
  ],
};

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
export function buildRounds(level: 1 | 2 | 3 | 4 | 5, random: () => number): Round[] {
  return POOLS[level].map((pool, k) => {
    const e = pick(pool, random);
    return { ...e, start: e.ans === 0 ? 6 : 0, assist: aid(k) };
  });
}
export const judge = (r: Entry, h: number) => h === r.ans;
/** The slope at release, for drawing the drift line: ans / d. */
export const slope = (r: Entry) => r.ans / r.d;
/** 'high': the clamp is above the robot's line (the robot passes under it); 'low': below. */
export const fault = (r: Entry, h: number): 'high' | 'low' | null => (h === r.ans ? null : h > r.ans ? 'high' : 'low');

/** The tallest height (metres) the picture of the wall has room for, either way from the release height. */
export const WALL_HEIGHT = 12.8;
/**
 * Where a MISSED robot hits the hull, in metres from the release height (brief 6.1). It is 2 m past the clamp on the side the robot really passes, so the
 * picture says only "above" or "below", as the miss text does. It is never the true height (nor within half a metre of it): when the true height is itself
 * 2 m past the clamp, the robot hits 1 m past it instead. The same round is replayed after a miss, so this must not show the answer.
 */
export function missEnd(r: Entry, h: number): number {
  const dir = r.ans > h ? 1 : -1;
  let end = Math.max(-WALL_HEIGHT, Math.min(WALL_HEIGHT, h + dir * 2));
  if (Math.abs(end - r.ans) < 0.5) end = h + dir;
  return end;
}

// ---- Words -----------------------------------------------------------------------------------------------------------------------------------------------

export const intel = (r: Round) => `Rail: ${r.text}. Orbit lets go at x = ${r.x0Text}, and the wall is ${r.d} m further on. Set the clamp at the height where Orbit reaches the wall, measured from the release height.`;

export const hintText = (r: Round) => `${intel(r)} ${r.assist === 0 ? 'Round 1: the guide laser shows the drift line.' : r.assist === 1 ? 'No laser: a sensor ping costs a charge and shows its arrow for 1.5 s.' : 'Boss round: no laser, no ping.'}`;

/** Where the player's clamp is, in words. */
export const where = (h: number) => (h > 0 ? `${h} m up` : h < 0 ? `${-h} m down` : 'level with the release point');

/** What the player's setting did (h is the player's height; never the right answer or the slope). */
export function missText(r: Entry, h: number): string {
  return fault(r, h) === 'high'
    ? `With the clamp ${where(h)} Orbit drifted in underneath it, bonked the hull and tumbled away. Slide the clamp down.`
    : `With the clamp ${where(h)} Orbit drifted in above it, bonked the hull and tumbled away. Slide the clamp up.`;
}

/** The charge: the direction only. */
export const pingText = (r: Entry, h: number) => `Sensor ping: on its present line Orbit will pass ${h > r.ans ? 'below' : h < r.ans ? 'above' : 'right through'} the clamp.`;

export const winText = (r: Entry) => `Docked! ${r.work}`;

/** The clamp readout: +3 m, −5 m, 0 m. */
export const heightText = (h: number) => (h > 0 ? `+${h}` : num(h));
