# 06 · Thrill Ride (Maths Ch 7, §7.6 Integration by parts)

Read `README.md` in this folder first. Everything below is required unless marked "optional". This game needs the `delay` function in `src/core/dialgame.ts` (added by brief 02; check it is there).

## 1. Identity

| Field | Value |
|---|---|
| Game id | `thrill-ride` |
| Folder | `src/games/mathematics/class-12/ch07-integrals/thrill-ride/` |
| Files | `game.json` (**copy `docs/curriculum/gap-designs/json/thrill-ride.json` byte for byte**), `logic.ts`, `logic.test.ts`, `index.ts`, `art.ts` |
| UI test | `tests/thrill-ride-ui.test.ts` |
| Book coverage | §7.6, 7.6.1; Ex 7.6 Q1 to Q9, Q12, Q13, Q16 to Q21; Examples 17 to 22 |
| Inspiration (code comment only) | Theme-park building games (build a coaster and watch the test car ride it), Trials and Poly Bridge (one bad joint and the run fails) |
| Core verb | **Set the track's coefficients on knobs** so the coaster track is the antiderivative, then send the test car. |

## 2. What the student learns

- ∫ u dv = uv − ∫ v du; u is chosen so its derivative is simpler (log, inverse trig, algebraic, trig, exponential).
- By parts twice for x²eˣ; log x and tan⁻¹ x as u with dv = dx or x dx.
- The pattern ∫ eˣ[f(x) + f′(x)] dx = eˣ f(x) + C.
- Cyclic integrals: ∫ eˣ sin x dx comes back to itself after two steps; solve for it.

## 3. The mechanic, physically

**Rex**, a coaster engineer in a hard hat, builds a test track. The **pylons** along the route are already standing, and each carries a **rail clip** set at the slope the ride's blueprint demands at that point: the slope at x must be the integrand f(x). So the track's height must be an **antiderivative F** of f. The player chooses F by setting its **coefficients** on knobs in a fixed form (for example F(x) = A·x cos x + B·sin x). The station fixes the height at the start, so the constant of integration takes care of itself.

When the car is sent, the track is laid from the station, and at every pylon the rail must enter the clip at the clip's angle. The first clip where the track's slope F′(x) is not f(x) buckles, and the car flies off the rails there. If every clip fits, the car rides the whole loop to the end station.

Hero banner: `name: 'Rex'`, `role: 'a coaster engineer who builds a track whose slope must match the blueprint at every pylon'`.

| Level | story | objective |
|---|---|---|
| 1 | `Every pylon holds a rail clip at the slope the blueprint asks for: the slope at x must be f(x). So the track’s height is an antiderivative of f. Here f is x times a wave, so integrate by parts with u = x. The station fixes the height at the start.` | `Set the track’s coefficients so the test car rides the whole track, in three rounds.` |
| 2 | `These blueprints have exponentials, and the boss track needs x², which means integrating by parts twice. The track is e^(kx) times a quadratic: set its three coefficients.` | `Set the coefficients so the car rides the whole track, in three rounds.` |
| 3 | `These blueprints are log x, tan⁻¹ x, sin⁻¹ x and friends. Make the log or the inverse trig function u, and dv = dx or x dx.` | `Set the coefficients so the car rides the whole track, in three rounds.` |
| 4 | `These blueprints hide the pattern eˣ[f(x) + f′(x)], whose integral is eˣ f(x). Spot f, and the track is almost written for you.` | `Set the coefficients so the car rides the whole track, in three rounds.` |
| 5 | `Cyclic blueprints such as eˣ sin x: integrate by parts twice and the integral comes back. Call it I and solve for it.` | `Set the coefficients so the car rides the whole track, in three rounds.` |

Characters:
- **Rex** (hero): stands on the station platform with a yellow hard hat, a hi-vis vest, a rolled blueprint under one arm and a walkie-talkie. Idle: taps the blueprint, looks along the track, adjusts the hat. Send: raises the walkie-talkie (`“Car away!”`). Moods with `face`: happy waiting, cheer on a win (throws the hat up), worried with a sweat drop on a derail, then face-palms.
- **The test car** with two crash-test riders (dummies with yellow-and-black round marks on their heads, which is funny and safe): a red car with a headlight and a number. Idle at the station: the car rocks slightly. Riding: the riders lean with the slope; on drops their arms go up. On a derail: the car flies off along its last direction, tumbles twice, the dummies pop out, and stars circle their heads. On a win: both raise their arms and the car brakes into the end station with sparks from the brake fins.
- **Pylons and clips**: steel lattice towers from the ground to the clip height, each with a bright `PAL.yellow` clip drawn as a short rail segment at the blueprint slope. On a fit the clip flashes `PAL.green` as the track snaps in; on the first misfit it flashes `PAL.red` and the rail buckles (draw a visible kink of at least 12° on screen, even if the true angle difference is smaller).

## 4. Rules (`logic.ts`)

### 4.1 Types

```ts
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
export interface Round extends Row { assist: 0 | 1 | 2 }
export const PYLONS = 8;
export const BUILD = 0.5;   // seconds to lay the track
export const RIDE = 1.4;    // seconds for the car to ride the whole track
```

Knob values are whole numbers of **quarters** from −8 to 8 (that is −2 to 2), so `A = 4` means A = 1 and `B = −1` means B = −1/4.

### 4.2 The pools (copy exactly)

All rows were checked numerically: Σ (ans[i]/4)·basis[i]′ equals f on [lo, hi] to 1e-5, and **every** other setting of the knobs (288 settings for two knobs, 4912 for three) misses at least one pylon's slope by at least 4% of the largest |f| at the pylons.

```ts
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
```

### 4.3 Rounds, the track and judging

```ts
const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
export const buildRounds = (level: 1 | 2 | 3 | 4 | 5, random: () => number): Round[] => POOLS[level].map((pool, k) => ({ ...pick(pool, random), assist: aid(k) }));
export const coeffs = (r: Row, v: Values) => r.keys.map((k) => v[k] ?? 0);
/** The player's track: F(x) = Σ (c_i/4)·basis_i(x), shifted so F(lo) = 0 (the station fixes the constant). */
export const track = (r: Row, c: number[]) => (x: number) => r.basis.reduce((s, g, i) => s + (c[i] / 4) * (g(x) - g(r.lo)), 0);
/** The track's slope, by a central difference (h = 1e-5). */
export const slopeAt = (r: Row, c: number[], x: number) => (track(r, c)(x + 1e-5) - track(r, c)(x - 1e-5)) / 2e-5;
export const pylonX = (r: Row, i: number) => r.lo + ((r.hi - r.lo) * (i + 0.5)) / PYLONS;
export const judge = (r: Row, c: number[]) => c.every((v, i) => v === r.ans[i]);
/** The first pylon whose clip the track does not fit (slope off by more than 2% of the largest |f| at the pylons), and whether the track is too steep or too shallow there. */
export function firstFault(r: Row, c: number[]): { pylon: number; steep: boolean } | null
/** Seconds into the run when the verdict lands. */
export const verdictTime = (r: Row, c: number[]) => { const f = firstFault(r, c); return f ? BUILD + (RIDE * (f.pylon + 0.5)) / PYLONS + 0.3 : BUILD + RIDE; };
```

`firstFault` returns null exactly when `judge` is true (checked over every setting; see 8.1). "Too steep" means the track's slope is above the clip's.

### 4.4 Words

- Knob text: `q4(v)` writes v/4 reduced with a true minus sign: `4 → '1'`, `-2 → '−1/2'`, `1 → '1/4'`, `-8 → '−2'`, `6 → '3/2'`, `0 → '0'`.
- `intel(r)`: `` `Blueprint slope: f(x) = ${r.name}. Track form: ${r.form}. Set ${r.keys.join(', ')} so the track’s slope is f(x) at every pylon.` ``
- Hint line: `` `${intel(r)} ${r.assist === 0 ? 'Round 1: the track shows live as you turn the knobs.' : r.assist === 1 ? 'The track is hidden: a test lay costs a charge.' : 'Boss round: no preview.'}` ``
- `missText(r, c)`: `` `The track ran into pylon ${f.pylon + 1} ${f.steep ? 'too steep' : 'too shallow'} for its clip: the rail buckled and the test car flew off.` `` (never name a coefficient).
- `testText(r, c)` (charge, round 2): `` `Test lay: the track fits ${n} of the 8 clips.` `` with n the number of pylons whose slope fits (within the same 2%).
- Win: `` `The car rode the whole track! ∫ ${r.name} dx = ${r.answerText}. ${r.work}` ``

## 5. Screen and art

Canvas 640 × 340 (`mountDialLevel`).

```ts
const ROUTE = { x0: 74, x1: 590, top: 64, bottom: 250, ground: 292 };
```

- **World to screen**: X(x) = `ROUTE.x0 + ((x − lo)/(hi − lo))·(ROUTE.x1 − ROUTE.x0)`. Heights are scaled per round from the **winning** track: y0, y1 = the min and max of `track(r, r.ans)` on 161 samples, padded 10%; Y(y) = `ROUTE.bottom − ((y − y0)/(y1 − y0))·(ROUTE.bottom − ROUTE.top)`. Clamp the drawn player track to y 20..320.
- **Backdrop**: a theme park at dusk: `backdrop(g)`, a Ferris wheel silhouette at the back turning slowly (8 spokes and cabins, `#1b2260`), strings of coloured bulbs that twinkle, and the ground band at `ROUTE.ground`.
- **Station** at the left (x 14 to `X(lo)`), a roofed platform at height `Y(0)` (the start height, since F(lo) = 0), with Rex on it. **End station** at the right edge, at the winning track's end height.
- **Pylons**: at `pylonX(r, i)`, i = 0..7, a lattice tower (two uprights and cross braces) from the ground to `Y(F*(x_i))` (F* the winning track), topped by the **clip**: a 24 px rail segment centred on the top, rotated to the **screen** angle of slope f(x_i) (convert with the two scales: `atan2(−f(x)·(Ypx per unit), Xpx per unit)`).
- **The blueprint sign** (top left, 340 × 42): `BLUEPRINT` (size 10, `PAL.dim`), `slope f(x) = ${r.name}` (size 13, `PAL.yellow`), `track ${r.form}` (size 11, `PAL.white`).
- **The knob panel** is the DOM sliders (labelled `A`, `B` or `p`, `q`, `r`, with the value as `q4(v)`). On the canvas draw a small control box at the bottom right with one dial icon per knob showing its value (decoration; no handles needed).
- **The player's track (helper)**: round 1, drawn live as a double rail (`PAL.cyan`, ties every 12 px) from the station along `track(r, c)`. Round 2: hidden except for 1.5 s after a test lay. Round 3: hidden until the car is sent.

### 5.1 The run (resolve)

`delay: (r, v) => verdictTime(r, coeffs(r, v))`.
- 0 to `BUILD` (0.5 s): the track is laid from the station toward the right (the rail grows), and each clip it reaches flashes green as it snaps in. At the first faulty pylon the rail buckles: draw the rail segment entering the clip kinked by at least 12° on screen, the clip flashes red, and a few sparks fly. The rail after a fault is still drawn, but crooked and dim.
- From `BUILD`: the car rides at constant speed along the laid track (reaching pylon i at `BUILD + RIDE·(i + 0.5)/8`). On a fault, at that pylon the car leaves the track along its current direction, tumbling (rotation 4π over 0.3 s), and lands at the verdict time with a crash: `A.burst(x, y, PAL.orange, 22, 170)`, the dummies pop out with stars, and Rex face-palms. On a win the car brakes into the end station at `BUILD + RIDE` (1.9 s) with brake sparks, the dummies raise their arms, and Rex throws the hat. Float `RIDE COMPLETE!`.
- Everything finishes by 2.35 s (the latest fault verdict is 0.5 + 1.4 × 7.5/8 + 0.3 = 2.11 s).

## 6. Controls and mount

```ts
function level(n: 1 | 2 | 3 | 4 | 5, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const keys = rounds[0].keys;              // ['A','B'] except level 2: ['p','q','r']
  return {
    hero: { name: 'Rex', role: '…', ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials: keys.map((key) => ({ key, aria: `Coefficient ${key} of the track, in quarters`, label: key, unit: '', step: 1, min: -8, max: 8, start: 0, text: (v: number) => q4(v) })),
    test: { button: '🔧 Test lay', aria: 'Test lay: show the track for a moment and count the clips it fits', read: (r, v) => { testPending = true; return testText(r, coeffs(r, v)); } },
    fire: { button: '🎢 Send the car', aria: 'Send the test car' },
    judge: (r, v) => judge(r, coeffs(r, v)),
    miss: (r, v) => missText(r, coeffs(r, v)),
    win: (r) => winText(r),
    hint: (r) => hintText(r),
    hit: () => [ROUTE.x1, ROUTE.top + 40],
    delay: (r, v) => verdictTime(r, coeffs(r, v)),
    draw: (s) => drawScene(s),
  };
}
```

- No canvas handles (the knobs are the DOM sliders). That is allowed: the sliders are big and accessible.
- **All knobs start at 0.** Every row has a non-zero answer in at least one knob, so the start never wins.
- Test-lay animation: closure `testPending`/`testAt` as in brief 03.
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(5, ctx.level)) as 1 | 2 | 3 | 4 | 5; return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA); } })`, `ARIA = 'A theme-park roller coaster under construction: pylons with rail clips at set slopes, a station with an engineer, and a test car.'`

## 7. game.json

Copy `docs/curriculum/gap-designs/json/thrill-ride.json` exactly (it already passes the validator limits).

## 8. Tests

### 8.1 `logic.test.ts`

1. **Answers are antiderivatives**: for every row of every pool, `slopeAt(r, r.ans, x)` is within `1e-4 · max(1, |f(x)|)` of `f(x)` at 30 points of [lo, hi].
2. **One winner, and the picture agrees**: for every row, enumerate every knob setting (−8..8 for each knob: 289 or 4913 settings). Exactly one passes `judge` (the answer), and `firstFault` is null for it and not null for every other setting.
3. **Levels**: 80 seeds; level 2 rounds have keys `p, q, r`, the other levels `A, B`, the same in all three rounds of a level; `assist` is `[0, 1, 2]`; the all-zero setting never wins.
4. **Times**: `verdictTime` is below 2.4 for every setting checked in test 2, and equals 1.9 for the answer.
5. **Words**: `q4` gives the strings listed in 4.4; `missText` contains `too steep` or `too shallow` and `pylon`, never a knob letter followed by ` =`; `testText` contains `of the 8 clips`; the win text contains `+ C`.

### 8.2 `tests/thrill-ride-ui.test.ts`

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch07-integrals/thrill-ride/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch07-integrals/thrill-ride/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'thrill-ride', 5);
const set = (r: Round, bump = 0) => r.ans.forEach((v, i) => h.setSlider(v + (i === 0 ? bump : 0), i));

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4, 5],
  build: (level, seed) => buildRounds(level as 1 | 2 | 3 | 4 | 5, createRng(seed)),
  setRight: (g, k) => set(g[k]),
  setWrong: (g, k) => set(g[k], g[k].ans[0] < 8 ? 1 : -1),
  commit: () => h.click('Send the test car'),
});
```

Then `describe('Thrill Ride', …)`: 2 sliders in levels 1, 3, 4 and 5 and 3 in level 2, all starting at 0; a miss says `flew off`; the test lay costs a charge (`/of the 8 clips/`, then `/No charges left/`); a win says `rode the whole track`.

## 9. Traps to avoid

- The player's track is a helper (round 1 live, round 2 on a test lay only). The pylons and their clips are always shown: they are the problem, not the answer.
- Use the winning track for the height scale (so the scene does not jump as the knobs turn); clamp the player's track when it leaves the screen.
- Draw the kink exaggerated (at least 12°) so every miss is visible on screen.
- Miss texts give the pylon number and too steep or too shallow, never a coefficient.
- Every animation finishes inside 2.4 s.
