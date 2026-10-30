# 03 · Air Time (Maths Ch 7, §7.4 Integrals of some particular functions)

Read `README.md` in this folder first. Everything below is required unless marked "optional".

**Depends on brief 02**: `DialLevel.delay` must accept a function (`src/core/dialgame.ts`, added by the Stage Lift build). Check that `delay?: number | ((r: R, v: Values) => number)` is there before you start; if it is not, add exactly that change as brief 02 section 6.1 describes.

## 1. Identity

| Field | Value |
|---|---|
| Game id | `air-time` |
| Folder | `src/games/mathematics/class-12/ch07-integrals/air-time/` |
| Files | `game.json`, `logic.ts`, `logic.test.ts`, `index.ts`, `art.ts` |
| UI test | `tests/air-time-ui.test.ts` |
| Book coverage | §7.4 formulas (1) to (6) and completing the square; Ex 7.4 Q1 to Q12, Q14; Examples 8, 9 |
| Inspiration (code comment only) | Tony Hawk's Pro Skater and motocross stunt games (land the flip or crash), Trials (physics wipe-outs), Need for Speed nitro (boost to clear a gap) |
| Core verb | **Drag the landing ramp** (spin rounds) or **drag the nitro cut-off cone** (boost rounds) along the course, then launch and watch the jump. |

## 2. What the student learns

The standard forms and their definite integrals:

- ∫ dx/(x² + a²) = (1/a) tan⁻¹(x/a)
- ∫ dx/√(a² − x²) = sin⁻¹(x/a)
- ∫ dx/√(x² + a²) = log|x + √(x² + a²)| and ∫ dx/√(x² − a²) = log|x + √(x² − a²)|
- ∫ dx/(x² − a²) = (1/2a) log|(x − a)/(x + a)|
- Completing the square turns x² + bx + c into (x + b/2)² ± k², which reaches one of the forms.

The game makes each integral a physical total. A **spin rate** ω(x) (radians per metre of horizontal travel) integrates to the total spin in the air, and a backflip lands only if the total is exactly 2π (or 4π for a double). A **nitro rate** k(x) (relative speed gain per metre) integrates to log(speed ratio), so the nitro multiplies the speed by e^(∫k dx), and a canyon is cleared only at exactly the right speed.

## 3. Story and characters

**Blaze** is a stunt rider on a dirt bike at a freestyle show.

- **Spin rounds**: Blaze leaves the kicker ramp at x = p and spins backwards at the rate ω(x) as the bike flies. The player places the landing ramp at x = q. The bike lands upright only if ∫ₚ^q ω dx is exactly the trick's angle. Too little spin and the bike lands rear-first with its nose up and loops out; too much and it lands nose-first and throws the rider over the bars.
- **Boost rounds**: the nitro fires from x = p and the player places the cut-off cone at x = q. The bike reaches the canyon lip at its start speed of 40 km/h times e^(∫ₚ^q k dx). Too slow and it falls into the canyon; too fast and it overshoots the landing pad into the billboard.

Hero banner: `name: 'Blaze'`, `role: 'a stunt rider on a dirt bike at a freestyle show'`.

| Level | story | objective |
|---|---|---|
| 1 | `In the air Blaze spins backwards at ω(x) radians per metre, where x is the distance along the course. The total spin from the kicker at x = p to the landing ramp at x = q is the definite integral of ω. A backflip lands clean only if the total is exactly 2π; the boss trick is a double backflip, 4π.` | `Place the landing ramp so every flip lands clean, in three rounds.` |
| 2 | `This bike spins faster and faster near the end of its arc: the rate has the form k/√(a² − x²). The same rule holds: the total spin must be exactly the trick.` | `Place the landing ramp so every flip lands clean, in three rounds.` |
| 3 | `The canyon jump. The nitro raises the speed by k(x) of itself per metre, so over the strip the speed is multiplied by e^(∫k dx). Blaze starts at 40 km/h and must reach the lip at exactly the speed the canyon needs.` | `Place the nitro cut-off cone so the bike clears the canyon and lands on the pad, in three rounds.` |
| 4 | `The rates are written with the square not yet completed, such as 16/(x² − 6x + 13). Complete the square to reach a standard form, then integrate. The boss round is a canyon jump.` | `Land two flips and clear the canyon, in three rounds.` |

## 4. Rules (`logic.ts`)

### 4.1 Types

```ts
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { shuffle } from '@core/quiz';

export type Kind = 'spin' | 'boost';
export interface Entry {
  /** The integrand as written on the course sign, e.g. '16/(x² + 4)'. */
  rate: string;
  f: (x: number) => number;
  /** An antiderivative of f. */
  F: (x: number) => number;
  p: number;        // kicker or nitro start
  q: number;        // the winning ramp or cone position
  lo: number;       // dial range
  hi: number;
  kind: Kind;
  /** spin: the trick angle in radians (2π or 4π); boost: the speed factor. */
  target: number;
  /** How the target is written: '2π', '4π', '3', '√2', '5/2'. */
  label: string;
  /** The working shown after a win. */
  work: string;
}
export interface Round extends Entry { start: number; assist: 0 | 1 | 2 }
export const V0 = 40; // km/h at the start of a boost round
export const SPIN_LAND = 1.35; // seconds into the launch when the bike lands (spin)
export const BOOST_LAND = 1.55; // seconds into the launch when the bike lands or misses (boost)
```

### 4.2 The pools (copy exactly)

`const P = Math.PI, sq = Math.sqrt, at = Math.atan, as = Math.asin, ln = Math.log;`

Every row below was checked numerically: F′ = f, Simpson's rule agrees with F(q) − F(p), and **exactly one whole q in lo..hi hits the target**. Neighbouring q values miss by at least 0.07π of spin or 0.1 of speed factor.

```ts
const S = (rate: string, f: (x: number) => number, F: (x: number) => number, p: number, q: number, lo: number, hi: number, target: number, label: string, work: string): Entry => ({ rate, f, F, p, q, lo, hi, kind: 'spin', target, label, work });
const B = (rate: string, f: (x: number) => number, F: (x: number) => number, p: number, q: number, lo: number, hi: number, target: number, label: string, work: string): Entry => ({ rate, f, F, p, q, lo, hi, kind: 'boost', target, label, work });

export const POOLS: Record<1 | 2 | 3 | 4, [Entry[], Entry[], Entry[]]> = {
  1: [
    [
      S('16/(x² + 4)', (x) => 16 / (x * x + 4), (x) => 8 * at(x / 2), 0, 2, 1, 10, 2 * P, '2π', '∫ 16/(x² + 4) dx = 16 · ½ tan⁻¹(x/2) = 8 tan⁻¹(x/2). From 0 to 2: 8(π/4 − 0) = 2π.'),
      S('8/(x² + 1)', (x) => 8 / (x * x + 1), (x) => 8 * at(x), 0, 1, 1, 10, 2 * P, '2π', '∫ 8/(x² + 1) dx = 8 tan⁻¹ x. From 0 to 1: 8(π/4 − 0) = 2π.'),
      S('24/(x² + 9)', (x) => 24 / (x * x + 9), (x) => 8 * at(x / 3), 0, 3, 1, 10, 2 * P, '2π', '∫ 24/(x² + 9) dx = 24 · ⅓ tan⁻¹(x/3) = 8 tan⁻¹(x/3). From 0 to 3: 8(π/4 − 0) = 2π.'),
    ],
    [
      S('16/(x² + 4)', (x) => 16 / (x * x + 4), (x) => 8 * at(x / 2), 1, 6, 2, 11, 2 * P, '2π', '8 tan⁻¹(x/2) from 1 to 6 is 8(tan⁻¹ 3 − tan⁻¹ ½). tan of the difference is (3 − ½)/(1 + 3/2) = 1, so it is π/4 and the spin is 8 · π/4 = 2π.'),
      S('24/(x² + 9)', (x) => 24 / (x * x + 9), (x) => 8 * at(x / 3), 1, 6, 2, 11, 2 * P, '2π', '8 tan⁻¹(x/3) from 1 to 6 is 8(tan⁻¹ 2 − tan⁻¹ ⅓). tan of the difference is (2 − ⅓)/(1 + ⅔) = 1, so the spin is 8 · π/4 = 2π.'),
      S('8/(x² + 4)', (x) => 8 / (x * x + 4), (x) => 4 * at(x / 2), -2, 2, -1, 8, 2 * P, '2π', '∫ 8/(x² + 4) dx = 4 tan⁻¹(x/2). From −2 to 2: 4(π/4 − (−π/4)) = 2π.'),
      S('4/(x² + 1)', (x) => 4 / (x * x + 1), (x) => 4 * at(x), -1, 1, 0, 9, 2 * P, '2π', '∫ 4/(x² + 1) dx = 4 tan⁻¹ x. From −1 to 1: 4(π/4 + π/4) = 2π.'),
    ],
    [
      S('16/(x² + 4)', (x) => 16 / (x * x + 4), (x) => 8 * at(x / 2), -2, 2, -1, 8, 4 * P, '4π', '8 tan⁻¹(x/2) from −2 to 2: 8(π/4 + π/4) = 4π, a double backflip.'),
      S('8/(x² + 1)', (x) => 8 / (x * x + 1), (x) => 8 * at(x), -1, 1, 0, 9, 4 * P, '4π', '8 tan⁻¹ x from −1 to 1: 8(π/4 + π/4) = 4π, a double backflip.'),
      S('32/(x² + 4)', (x) => 32 / (x * x + 4), (x) => 16 * at(x / 2), 0, 2, 1, 10, 4 * P, '4π', '∫ 32/(x² + 4) dx = 16 tan⁻¹(x/2). From 0 to 2: 16 · π/4 = 4π, a double backflip.'),
    ],
  ],
  2: [
    [
      S('12/√(64 − x²)', (x) => 12 / sq(64 - x * x), (x) => 12 * as(x / 8), 0, 4, 1, 7, 2 * P, '2π', '∫ 12/√(64 − x²) dx = 12 sin⁻¹(x/8). From 0 to 4: 12(π/6 − 0) = 2π.'),
      S('12/√(144 − x²)', (x) => 12 / sq(144 - x * x), (x) => 12 * as(x / 12), 0, 6, 1, 11, 2 * P, '2π', '12 sin⁻¹(x/12) from 0 to 6: 12 · π/6 = 2π.'),
      S('12/√(256 − x²)', (x) => 12 / sq(256 - x * x), (x) => 12 * as(x / 16), 0, 8, 1, 15, 2 * P, '2π', '12 sin⁻¹(x/16) from 0 to 8: 12 · π/6 = 2π.'),
    ],
    [
      S('6/√(64 − x²)', (x) => 6 / sq(64 - x * x), (x) => 6 * as(x / 8), -4, 4, -3, 7, 2 * P, '2π', '6 sin⁻¹(x/8) from −4 to 4: 6(π/6 + π/6) = 2π.'),
      S('6/√(144 − x²)', (x) => 6 / sq(144 - x * x), (x) => 6 * as(x / 12), -6, 6, -5, 11, 2 * P, '2π', '6 sin⁻¹(x/12) from −6 to 6: 6(π/6 + π/6) = 2π.'),
      S('6/√(256 − x²)', (x) => 6 / sq(256 - x * x), (x) => 6 * as(x / 16), -8, 8, -7, 15, 2 * P, '2π', '6 sin⁻¹(x/16) from −8 to 8: 6(π/6 + π/6) = 2π.'),
    ],
    [
      S('24/√(256 − 4x²)', (x) => 24 / sq(256 - 4 * x * x), (x) => 12 * as(x / 8), 0, 4, 1, 7, 2 * P, '2π', 'Take out the 4: √(256 − 4x²) = 2√(64 − x²), so the rate is 12/√(64 − x²) and the spin is 12 sin⁻¹(x/8) from 0 to 4 = 12 · π/6 = 2π.'),
      S('36/√(576 − 9x²)', (x) => 36 / sq(576 - 9 * x * x), (x) => 12 * as(x / 8), 0, 4, 1, 7, 2 * P, '2π', '√(576 − 9x²) = 3√(64 − x²), so the rate is 12/√(64 − x²): 12 sin⁻¹(x/8) from 0 to 4 = 2π.'),
      S('24/√(576 − 4x²)', (x) => 24 / sq(576 - 4 * x * x), (x) => 12 * as(x / 12), 0, 6, 1, 11, 2 * P, '2π', '√(576 − 4x²) = 2√(144 − x²), so the rate is 12/√(144 − x²): 12 sin⁻¹(x/12) from 0 to 6 = 2π.'),
      S('48/√(256 − 4x²)', (x) => 48 / sq(256 - 4 * x * x), (x) => 24 * as(x / 8), 0, 4, 1, 7, 4 * P, '4π', '√(256 − 4x²) = 2√(64 − x²), so the rate is 24/√(64 − x²): 24 sin⁻¹(x/8) from 0 to 4 = 24 · π/6 = 4π, a double backflip.'),
    ],
  ],
  3: [
    [
      B('1/√(x² + 9)', (x) => 1 / sq(x * x + 9), (x) => ln(x + sq(x * x + 9)), 0, 4, 1, 14, 3, '3', '∫ dx/√(x² + 9) = log|x + √(x² + 9)|. From 0 to 4: log 9 − log 3 = log 3, so the speed is multiplied by e^(log 3) = 3: 120 km/h.'),
      B('1/√(x² + 16)', (x) => 1 / sq(x * x + 16), (x) => ln(x + sq(x * x + 16)), 0, 3, 1, 14, 2, '2', 'log|x + √(x² + 16)| from 0 to 3: log 8 − log 4 = log 2, so the speed doubles to 80 km/h.'),
      B('1/√(x² + 25)', (x) => 1 / sq(x * x + 25), (x) => ln(x + sq(x * x + 25)), 0, 12, 1, 14, 5, '5', 'log|x + √(x² + 25)| from 0 to 12: log 25 − log 5 = log 5, so the speed is multiplied by 5: 200 km/h.'),
    ],
    [
      B('1/√(x² − 64)', (x) => 1 / sq(x * x - 64), (x) => ln(x + sq(x * x - 64)), 10, 17, 11, 20, 2, '2', '∫ dx/√(x² − 64) = log|x + √(x² − 64)|. From 10 to 17: log 32 − log 16 = log 2: 80 km/h.'),
      B('1/√(x² − 144)', (x) => 1 / sq(x * x - 144), (x) => ln(x + sq(x * x - 144)), 13, 20, 14, 23, 2, '2', 'log|x + √(x² − 144)| from 13 to 20: log 36 − log 18 = log 2: 80 km/h.'),
      B('1/√(x² − 144)', (x) => 1 / sq(x * x - 144), (x) => ln(x + sq(x * x - 144)), 15, 20, 16, 25, 1.5, '3/2', 'log|x + √(x² − 144)| from 15 to 20: log 36 − log 24 = log(3/2): 60 km/h.'),
    ],
    [
      B('1/(x² − 1)', (x) => 1 / (x * x - 1), (x) => 0.5 * ln(Math.abs((x - 1) / (x + 1))), 2, 5, 3, 12, Math.SQRT2, '√2', '∫ dx/(x² − 1) = ½ log|(x − 1)/(x + 1)|. From 2 to 5: ½(log(4/6) − log(1/3)) = ½ log 2, so the speed is multiplied by e^(½ log 2) = √2: 40√2 ≈ 56.6 km/h.'),
      B('2/(x² − 1)', (x) => 2 / (x * x - 1), (x) => ln(Math.abs((x - 1) / (x + 1))), 2, 5, 3, 12, 2, '2', '∫ 2/(x² − 1) dx = log|(x − 1)/(x + 1)|. From 2 to 5: log(4/6) − log(1/3) = log 2: 80 km/h.'),
      B('4/(x² − 4)', (x) => 4 / (x * x - 4), (x) => ln(Math.abs((x - 2) / (x + 2))), 3, 6, 4, 13, 2.5, '5/2', '∫ 4/(x² − 4) dx = log|(x − 2)/(x + 2)|. From 3 to 6: log(4/8) − log(1/5) = log(5/2): 100 km/h.'),
    ],
  ],
  4: [
    [
      S('16/(x² − 6x + 13)', (x) => 16 / (x * x - 6 * x + 13), (x) => 8 * at((x - 3) / 2), 3, 5, 4, 13, 2 * P, '2π', 'x² − 6x + 13 = (x − 3)² + 4, so the integral is 8 tan⁻¹((x − 3)/2). From 3 to 5: 8(π/4 − 0) = 2π.'),
      S('8/(x² − 4x + 5)', (x) => 8 / (x * x - 4 * x + 5), (x) => 8 * at(x - 2), 2, 3, 3, 12, 2 * P, '2π', 'x² − 4x + 5 = (x − 2)² + 1, so the integral is 8 tan⁻¹(x − 2). From 2 to 3: 8 · π/4 = 2π.'),
      S('8/(x² + 2x + 2)', (x) => 8 / (x * x + 2 * x + 2), (x) => 8 * at(x + 1), -1, 0, 0, 9, 2 * P, '2π', 'x² + 2x + 2 = (x + 1)² + 1, so the integral is 8 tan⁻¹(x + 1). From −1 to 0: 8 · π/4 = 2π.'),
    ],
    [
      S('12/√(60 + 4x − x²)', (x) => 12 / sq(60 + 4 * x - x * x), (x) => 12 * as((x - 2) / 8), 2, 6, 3, 9, 2 * P, '2π', '60 + 4x − x² = 64 − (x − 2)², so the integral is 12 sin⁻¹((x − 2)/8). From 2 to 6: 12 · π/6 = 2π.'),
      S('6/√(60 + 4x − x²)', (x) => 6 / sq(60 + 4 * x - x * x), (x) => 6 * as((x - 2) / 8), -2, 6, -1, 9, 2 * P, '2π', '60 + 4x − x² = 64 − (x − 2)², so the integral is 6 sin⁻¹((x − 2)/8). From −2 to 6: 6(π/6 + π/6) = 2π.'),
      S('12/√(140 + 4x − x²)', (x) => 12 / sq(140 + 4 * x - x * x), (x) => 12 * as((x - 2) / 12), 2, 8, 3, 13, 2 * P, '2π', '140 + 4x − x² = 144 − (x − 2)², so the integral is 12 sin⁻¹((x − 2)/12). From 2 to 8: 12 · π/6 = 2π.'),
    ],
    [
      B('1/√(x² + 4x + 13)', (x) => 1 / sq(x * x + 4 * x + 13), (x) => ln(x + 2 + sq(x * x + 4 * x + 13)), -2, 2, -1, 12, 3, '3', 'x² + 4x + 13 = (x + 2)² + 9, so the integral is log|x + 2 + √(x² + 4x + 13)|. From −2 to 2: log 9 − log 3 = log 3: 120 km/h.'),
      B('1/√(x² − 2x + 17)', (x) => 1 / sq(x * x - 2 * x + 17), (x) => ln(x - 1 + sq(x * x - 2 * x + 17)), 1, 4, 2, 15, 2, '2', 'x² − 2x + 17 = (x − 1)² + 16, so the integral is log|x − 1 + √(x² − 2x + 17)|. From 1 to 4: log 8 − log 4 = log 2: 80 km/h.'),
      B('1/√(x² + 6x + 34)', (x) => 1 / sq(x * x + 6 * x + 34), (x) => ln(x + 3 + sq(x * x + 6 * x + 34)), -3, 9, -2, 13, 5, '5', 'x² + 6x + 34 = (x + 3)² + 25, so the integral is log|x + 3 + √(x² + 6x + 34)|. From −3 to 9: log 25 − log 5 = log 5: 200 km/h.'),
    ],
  ],
};
```

### 4.3 Rounds, values and judging

```ts
const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
export function buildRounds(level: 1 | 2 | 3 | 4, random: () => number): Round[] {
  return POOLS[level].map((pool, k) => {
    const e = pick(pool, random);
    return { ...e, start: e.q === e.lo ? e.hi : e.lo, assist: aid(k) };
  });
}
/** spin: total radians F(q) − F(p); boost: the speed factor e^(F(q) − F(p)). */
export const value = (r: Entry, q: number) => (r.kind === 'spin' ? r.F(q) - r.F(r.p) : Math.exp(r.F(q) - r.F(r.p)));
export const judge = (r: Entry, q: number) => Math.abs(value(r, q) - r.target) < 1e-9;
/** How the attempt fails: spin under/over (small) or way under/over (more than π/2 off); boost short/long. */
export function fault(r: Entry, q: number): 'under' | 'over' | 'wayUnder' | 'wayOver' | 'short' | 'long' | null {
  if (judge(r, q)) return null;
  if (r.kind === 'boost') return value(r, q) < r.target ? 'short' : 'long';
  const d = value(r, q) - r.target;
  return d < -Math.PI / 2 ? 'wayUnder' : d < 0 ? 'under' : d > Math.PI / 2 ? 'wayOver' : 'over';
}
/** Seconds into the launch when the verdict lands. */
export const landTime = (r: Entry) => (r.kind === 'spin' ? SPIN_LAND : BOOST_LAND);
/** The target speed in km/h, written: '120 km/h' or '40√2 ≈ 56.6 km/h'. */
export const speedText = (r: Entry) => (r.label === '√2' ? '40√2 ≈ 56.6 km/h' : `${fmt(V0 * r.target)} km/h`);
```

### 4.4 Words

- `intel(r)`:
  - spin: `` `Kicker at x = ${n(r.p)} m. In the air Blaze spins at ω(x) = ${r.rate} radians per metre. Place the landing ramp so the total spin from the kicker is exactly ${r.label}, ${r.target > 3 * Math.PI ? 'a double backflip' : 'one backflip'}.` ``
  - boost: `` `The nitro fires from x = ${n(r.p)} m and raises the speed at the rate k(x) = ${r.rate} per metre, so the speed is multiplied by e^(∫k dx). The bike starts at 40 km/h; cut the nitro where it reaches ${speedText(r)} (×${r.label}).` ``
  - `n` writes a whole number with a true minus sign (`num` from `@core/mathkit`).
- Hint line: `` `${intel(r)} ${r.assist === 0 ? 'Round 1: the gauge shows your setting live.' : r.assist === 1 ? 'The gauge is off: a test run costs a charge.' : 'Boss round: no gauge, no test run.'}` ``
- `missText(r, q)` (q is the player's setting; never mention `r.q`):
  - under: `` `With the landing ramp at x = ${n(q)} m Blaze had not spun far enough: the bike came down rear wheel first with its nose up and looped out from under the rider.` ``
  - over: `` `With the landing ramp at x = ${n(q)} m Blaze spun too far: the bike came down nose first and threw the rider over the handlebars.` ``
  - wayUnder: `` `With the landing ramp at x = ${n(q)} m Blaze was still upside down from too little spin and landed on the helmet.` ``
  - wayOver: `` `With the landing ramp at x = ${n(q)} m Blaze spun so far past the trick that the bike landed upside down.` ``
  - short: `` `Cutting the nitro at x = ${n(q)} m left the bike too slow: it fell short of the landing pad and dropped into the canyon.` ``
  - long: `` `Cutting the nitro at x = ${n(q)} m made the bike too fast: it flew over the landing pad and smashed into the billboard.` ``
- `testText(r, q)` (the charge): spin: `` `Practice jump: with the ramp at x = ${n(q)} m the total spin is ${Math.round((value(r, q) * 180) / Math.PI)}°.` ``; boost: `` `Dyno test: cutting the nitro at x = ${n(q)} m gives ${fmt(V0 * value(r, q))} km/h at the lip.` ``
- Win text: spin `` `Clean landing! ${r.work}` ``; boost `` `Big air! ${r.work}` ``.

## 5. Screen and art

Canvas 640 × 340 (`mountDialLevel`). The scene depends on `r.kind`.

### 5.1 Spin scene (side view)

```ts
const SPIN = { x0: 90, span: 470, ground: 280, kickTop: 208, landTop: 228 };
const Xs = (r: Round, x: number) => SPIN.x0 + ((x - r.p) / (r.hi - r.p)) * SPIN.span;
```

- **Backdrop**: `backdrop(g)`, a night stadium: two floodlight towers (grey poles with a bank of 6 glowing lamps, light cones `rgba(255,255,220,0.08)`), a fence at y 262 with a crowd behind it (14 heads with phase-offset bobbing, a few waving flags in `PAL.pink`, `PAL.cyan`).
- **Ground**: a dirt band from y `ground` to 340 (`#3b2a1c`) with tyre tracks (dashed darker lines).
- **Kicker**: a dirt ramp (brown polygon) rising from x 20 to `Xs(p)`, its lip at height `kickTop`, a wooden face with planks.
- **Landing ramp** at `Xs(q)` (q = the dial value): a flat top 30 px wide at `landTop` with a checkered strip, then a down slope 60 px long to the ground. **It is the drag handle.**
- **Metre marks**: a tick and label (size 10, `PAL.dim`) at every whole x from `lo` to `hi` along y 296. The course is drawn evenly in metres; that is fine because the spin is not visible in the picture.
- **Course sign** (top left, rounded panel 300 × 40): `SPIN RATE` (size 10, `PAL.dim`) and `ω(x) = ${rate}` (size 14, `PAL.yellow`).
- **Spin gauge** (top right, centre (560, 60), radius 34): a circular dial marked at 0, 90, 180 and 270 degrees, a needle at the predicted total spin for the current ramp position, and the number in degrees underneath. A red tick marks the target. **Shown live only in round 1**; in round 2 only for 1.8 s after a test run; never in round 3. While it shows, also draw a faint **ghost rider** (alpha 0.35) on the landing ramp at the predicted landing attitude.
- **The jump** (launch phase, `rt` = seconds since launch):
  - 0 to 0.35 s: ride up the kicker from x 30 to `Xs(p)`, front wheel lifting.
  - 0.35 to `SPIN_LAND` (1.35 s): flight with s = (rt − 0.35)/1.0 from 0 to 1. Screen position: x = lerp(Xs(p), Xs(q), s), y = lerp(kickTop, landTop, s) − 4H·s(1 − s) with H = 60 + 0.12·(Xs(q) − Xs(p)). World x = p + s(q − p). **Rotation** = −(F(world x) − F(p)), applied to bike and rider together about the bike's centre (negative because screen y points down, so a backflip turns anticlockwise on screen).
  - At `SPIN_LAND` the verdict lands (`delay: (r) => landTime(r)`), with the attitude mod 2π giving the landing pose:
    - **Win**: both wheels touch, the forks and rear shock compress for 0.12 s, a dust burst (`A.burst(x, landTop, '#c9a27a', 20, 140)`), Blaze stands on the pegs with a fist up, and the crowd cheers. Float `BACKFLIP!` or `DOUBLE BACKFLIP!` (`A.float`, `PAL.yellow`).
    - **under**: rear wheel first, nose up; the bike slides out backwards about 40 px and falls on its side; the rider lands on the back with three stars circling. Text `LOOPED OUT!` (`PAL.orange`).
    - **over**: nose first; the bike stops dead and the rider flies over the bars in an arc (0.5 s, 60 px forward, rotating), lands face down; the bike tumbles once. Text `OVER THE BARS!` (`PAL.red`).
    - **wayUnder / wayOver**: lands upside down; sparks (`A.burst(x, landTop, PAL.yellow, 24, 180)`), the bike bounces once and lies wheels-up, rider dizzy. Text `UPSIDE DOWN!` (`PAL.red`).
  - Everything finishes by 2.3 s.

### 5.2 Boost scene (side view, the canyon)

```ts
const BOOST = { x0: 50, span: 390, road: 250, lip: 460, padX0: 540, padX1: 600, sign: 608 };
const Xb = (r: Round, x: number) => BOOST.x0 + ((x - r.p) / (r.hi - r.p)) * BOOST.span;
```

- **Road**: asphalt from x 0 to `lip` at y `road`, with a dashed line. **Nitro strip**: glowing `PAL.cyan` chevrons on the road from `Xb(p)` to `Xb(q)`, pulsing.
- **Cut-off cone** at `Xb(q)`: an orange traffic cone with a white band, standing on the road. **It is the drag handle.**
- **Metre marks** under the road (y 268) from `lo` to `hi`.
- **Canyon**: from `lip` to `padX0`, dark rock walls going down to a river at y 330 (blue, with animated ripples).
- **Landing pad**: a ledge from `padX0` to `padX1` at y `road`, with a checkered flag at 570.
- **Billboard** at `sign`: two posts and a board reading `BIG AIR` (do not use a brand), which shatters on an overshoot.
- **Course sign** (top left): `NITRO RATE` and `k(x) = ${rate}`, plus a line `start 40 km/h · needs ${speedText(r)}`.
- **Speedometer** (top right, centre (560, 64), radius 36): a half dial from 0 to 220 km/h with the needle at the predicted lip speed `V0 · value(r, q)` for the current cone, a red mark at the target speed, and the speed in digits. Live in round 1, for 1.8 s after a test run in round 2, never in round 3.
- **The run**:
  - 0 to 1.0 s: the bike rides from `Xb(p) − 30` to the lip. While its world x is below q, a blue-white nitro flame flickers from the exhaust and speed lines grow; after q the flame stops.
  - 1.0 s: take-off at the lip. Flight for 0.55 s: let `ratio = value(r, q) / r.target`. The bike flies a parabola whose landing x at pad height is `lip + (585 − lip) · ratio²` (so `ratio = 1` lands at the pad centre 585), peak 50 px above the road.
  - `BOOST_LAND` (1.55 s): the verdict.
    - **Win**: lands on the pad, dust, skids to a stop at the flag, Blaze pulls a wheelie with a fist pump. Float `BIG AIR!`.
    - **short** (landing x below `padX0`): the bike keeps falling into the canyon, shrinking slightly, gone below the screen by 2.1 s, with a splash of blue particles at the river (`A.burst(x, 330, PAL.cyan, 24, 160)`). Text `INTO THE CANYON!`.
    - **long** (landing x beyond `padX1`): the bike hits the billboard; wood splinters (`A.burst(BOOST.sign, 200, '#a0703c', 26, 200)`), the board tilts and falls behind the bike. Text `THROUGH THE BILLBOARD!`.

### 5.3 Blaze and the bike (`art.ts`)

`rider(g, x, y, angle, t, o: { pose: 'ride' | 'air' | 'stand' | 'fist' | 'fall' | 'launched' | 'dizzy'; mood: Mood; nitro: boolean; wheel: number; compress: number })`, drawn rotated by `angle` about the bike's centre (x, y).

- **Bike**: a red frame, black seat, silver exhaust; knobby tyres (radius 12) with 12 tread blocks; wheel spokes turned by `o.wheel`; front forks (two parallel lines) and a rear shock that shorten by `o.compress`·4 px; a white front number plate with `7`. A blue-white flickering flame (two triangles, sizes changing with `sin(t·40)`) from the exhaust when `o.nitro`.
- **Rider**: a full-face helmet (red with a white stripe), a dark visor with a white glint that slides across every 3 s, a chin guard, a grey chest protector, black gloves, boots on the pegs, a jersey with the number 7. Poses: `ride` (crouched, arms bent); `air` (tucked, knees to the tank); `stand` (standing on the pegs); `fist` (one arm up); `launched` (arms out, flying free of the bike: draw the rider separately); `fall` (lying on the back or face down); `dizzy` (lying, with three stars).
- **Portrait** (mood): a rounded frame 44 × 44 at (14, 56) under the course sign, showing Blaze's face with the visor up: `face(g, cx, cy, 14, mood, t)` inside a helmet outline. Moods: waiting `happy`, in the air `happy`, landed `cheer`, crash `worried` (with its sweat drop) and, after a crash, X eyes for `dizzy` (draw two small crosses instead of `face`).
- **Idle life**: before launch the bike vibrates (±1 px at `sin(t·60)`) with exhaust puffs every 0.5 s, the rider bobs, and the helmet turns slightly toward the ramp and back every 4 s.
- **Crowd**: cheers on a win (jumping, flags waving fast, `A.float('WOOO!', 160, 240, PAL.yellow)`); hands to faces on a crash (`A.float('OOOH…', 160, 240, PAL.dim)`).

### 5.4 Handles

```ts
handles: [{
  dial: 'q',
  at: (r, v) => (r.kind === 'spin' ? [Xs(r, v.q) + 15, SPIN.landTop - 6] : [Xb(r, v.q), BOOST.road - 14]),
  drag: (r, px) => r.p + ((px - (r.kind === 'spin' ? SPIN.x0 + 15 : BOOST.x0)) / (r.kind === 'spin' ? SPIN.span : BOOST.span)) * (r.hi - r.p),
  radius: 18,
}]
```

## 6. Controls and mount

```ts
function level(n: 1 | 2 | 3 | 4, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  return {
    hero: { name: 'Blaze', role: 'a stunt rider on a dirt bike at a freestyle show', ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials: [{ key: 'q', aria: 'Position of the landing ramp or the nitro cut-off, in metres', label: 'Place at', unit: 'm', step: 1, min: (r) => r.lo, max: (r) => r.hi, start: (r) => r.start, text: (v) => `x = ${num(v)}` }],
    handles: [/* 5.4 */],
    test: { button: '🧪 Test run', aria: 'Test run: read the spin or the speed for this setting', read: (r, v) => { testPending = true; return testText(r, v.q); } },
    fire: { button: '🏍 Launch', aria: 'Launch the jump' },
    judge: (r, v) => judge(r, v.q),
    miss: (r, v) => missText(r, v.q),
    win: (r) => winText(r),
    hint: (r) => hintText(r),
    hit: (r, k) => (r.kind === 'spin' ? [Xs(r, r.q) + 15, SPIN.landTop] : [570, BOOST.road]),
    delay: (r) => landTime(r),
    draw: (s) => (s.r.kind === 'spin' ? drawSpin(s) : drawBoost(s)),
  };
}
```

- Test-run animation: closure `let testPending = false; let testAt = -10;`. In `draw`, if `testPending`, set `testAt = s.t` and clear it. The gauge and the ghost show while `s.t − testAt < 1.8` in round 2.
- `hit` for the burst: the winning spot is used only for the burst position; that is fine because the burst only appears at the verdict.
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(4, ctx.level)) as 1 | 2 | 3 | 4; return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA); } })`, with `ARIA = 'A stunt rider on a dirt bike at a kicker ramp, with a landing ramp or a nitro cone the player places along the course.'`

## 7. game.json (copy exactly)

```json
{
  "$schema": "../../../../../../schema/game.schema.json",
  "id": "air-time",
  "title": "Air Time",
  "summary": "Place the landing ramp and cut the nitro for a stunt rider, using the standard integrals for tan⁻¹, sin⁻¹ and log forms.",
  "subject": "mathematics",
  "classLevel": 12,
  "chapter": { "number": 7, "name": "Integrals" },
  "ncertRef": "Section 7.4, Integrals of Some Particular Functions",
  "concepts": [
    "∫ dx/(x² + a²) = (1/a) tan⁻¹(x/a)",
    "∫ dx/√(a² − x²) = sin⁻¹(x/a)",
    "∫ dx/√(x² ± a²) = log|x + √(x² ± a²)|",
    "∫ dx/(x² − a²) = (1/2a) log|(x − a)/(x + a)|",
    "Completing the square in the denominator",
    "Definite integrals of the standard forms"
  ],
  "learningOutcome": "The student can integrate the standard forms in tan⁻¹, sin⁻¹ and log, complete the square to reach them, and evaluate the definite integrals exactly.",
  "mechanic": "tune-to-target",
  "estimatedMinutes": 20,
  "levels": [
    {
      "title": "One backflip",
      "tier": "concept",
      "kind": "foundation",
      "adds": "Baseline: ∫ dx/(x² + a²) = (1/a) tan⁻¹(x/a), so the spin from the kicker to the ramp is a difference of inverse tangents (Ex 7.4 Q1, Q5).",
      "hints": [
        "Take the constant out: ∫ k/(x² + a²) dx = (k/a) tan⁻¹(x/a).",
        "The total spin is F(ramp) − F(kicker).",
        "One backflip is 2π: solve (k/a)(tan⁻¹(q/a) − tan⁻¹(p/a)) = 2π for q."
      ]
    },
    {
      "title": "Tight spins",
      "tier": "application",
      "kind": "concept",
      "adds": "New: ∫ dx/√(a² − x²) = sin⁻¹(x/a); in the boss round take a factor out of the root first, as in √(9 − 25x²) (Ex 7.4 Q4).",
      "hints": [
        "∫ k/√(a² − x²) dx = k sin⁻¹(x/a).",
        "sin⁻¹(1/2) = π/6, so the ramp often sits at half of a.",
        "In √(256 − 4x²), take out the 4: it is 2√(64 − x²)."
      ]
    },
    {
      "title": "Nitro canyon",
      "tier": "application",
      "kind": "concept",
      "adds": "New: log forms. The nitro multiplies the speed by e^(∫k dx), so ∫ dx/√(x² ± a²) or ∫ dx/(x² − a²) must equal a log (Ex 7.4 Q2, Q6, Q8; Example 8).",
      "hints": [
        "∫ dx/√(x² + a²) = log|x + √(x² + a²)|, and the same with x² − a².",
        "The speed is multiplied by e^(F(q) − F(p)), so F(q) − F(p) must be the log of the factor.",
        "∫ dx/(x² − a²) = (1/2a) log|(x − a)/(x + a)|: do not forget the 1/2a."
      ]
    },
    {
      "title": "Complete the square",
      "tier": "challenge",
      "kind": "concept",
      "adds": "New: complete the square, x² − 6x + 13 = (x − 3)² + 4, to reach a standard form, then integrate (Ex 7.4 Q10 to Q12, Q14; Example 9).",
      "hints": [
        "x² + bx + c = (x + b/2)² + (c − b²/4).",
        "With t = x − 3 the integral becomes a standard form in t.",
        "Change the limits as well, or put x back before using them."
      ]
    }
  ],
  "misconceptions": [
    "∫ dx/(x² + a²) is tan⁻¹(x/a), without the 1/a",
    "∫ dx/√(a² − x²) and ∫ dx/√(x² − a²) are the same kind of answer",
    "Completing the square changes the value of the integral"
  ],
  "author": { "name": "Concept Arcade maintainers", "github": "AnubhavShankar" }
}
```

## 8. Tests

### 8.1 `logic.test.ts`

1. **Every pool row is right** (loop over every entry of every pool, not only sampled rounds):
   - `(F(x + 1e-6) − F(x − 1e-6)) / 2e-6` is within `1e-4 · max(1, |f(x)|)` of `f(x)` at x = p + 0.3(q − p), p + 0.5(q − p), p + 0.8(q − p).
   - Simpson's rule with 2000 steps from p to q is within 1e-6 of `F(q) − F(p)`.
   - Scanning every whole x from lo to hi, exactly one passes `judge`, and it is `q`.
   - `f` is finite at 51 evenly spaced points of [p, hi].
   - `value(r, q ± 1)` (when in range) differs from the target by more than 0.05.
2. **Levels and fading**: 80 seeds; levels 1 and 2 are all `spin`, level 3 all `boost`, level 4 is `spin, spin, boost`; `assist` is `[0, 1, 2]`; `start` is in range and never equals `q`; level 1 round 3 and level 2 round 3 targets are 2π or 4π.
3. **Faults**: for each row, `fault` at q is null; at every other q in range, spin rows give `under`/`wayUnder` below q and `over`/`wayOver` above it (the spin grows with q); boost rows give `short` below and `long` above.
4. **Words**: `missText` never contains `` `x = ${q} m` `` for the winning q when called with another x; every `missText` is longer than 40 characters; `testText` contains `°` (spin) or `km/h` (boost); `speedText` of the √2 row is `40√2 ≈ 56.6 km/h`; win texts start with `Clean landing!` or `Big air!`.
5. **Times**: `landTime` is 1.35 for spin and 1.55 for boost (both below 2.4).

### 8.2 `tests/air-time-ui.test.ts`

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch07-integrals/air-time/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch07-integrals/air-time/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'air-time', 4);
const build = (level: number, seed: number) => buildRounds(level as 1 | 2 | 3 | 4, createRng(seed));
const wrong = (r: Round) => (r.q < r.hi ? r.q + 1 : r.q - 1);

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => h.setSlider(g[k].q),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: () => h.click('Launch the jump'),
});
```

Then `describe('Air Time', …)`:
1. The slider follows the round's range and starts at `start` (levels 1 to 4, seed 5).
2. A spin miss says `spun too far`, `had not spun far enough`, `upside down` or `over the handlebars`; a boost miss says `canyon` or `billboard`.
3. Test run costs a charge: level 1 seed 5, click `Test run: read the spin or the speed for this setting` → feedback matches `/Practice jump/`; again → `/No charges left/`. Level 3 → `/Dyno test/`.
4. A level 4 win in round 3 says `Big air!`.

## 9. Traps to avoid

- The spin gauge, the ghost rider and the speedometer needle are helpers: live in round 1 only, 1.8 s after a test in round 2, never in round 3.
- During the flight use the exact `F(x) − F(p)` for the rotation, so a winning flight really ends upright and a losing one really lands at the wrong attitude.
- The landing ramp and cone are the player's setting; nothing else on screen may mark the winning position.
- Keep every animation inside 2.4 s (landing at 1.35 or 1.55 s, effects done by 2.3 s).
- `value` for a boost uses `Math.exp`; the judge tolerance 1e-9 is enough (checked).
- Do not use a pronoun for Blaze in any text; the texts above avoid it.
