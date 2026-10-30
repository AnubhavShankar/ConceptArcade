# 04 · Dock Drift (Maths Ch 5, §5.5 Logarithmic differentiation, and §5.3.3 inverse trigonometric derivatives)

Read `README.md` in this folder first. Everything below is required unless marked "optional". This brief covers two audit items: logarithmic differentiation (levels 1 to 4) and the derivatives of inverse trigonometric functions (level 5).

## 1. Identity

| Field | Value |
|---|---|
| Game id | `dock-drift` |
| Folder | `src/games/mathematics/class-12/ch05-continuity-and-differentiability/dock-drift/` |
| Files | `game.json`, `logic.ts`, `logic.test.ts`, `index.ts`, `art.ts` |
| UI test | `tests/dock-drift-ui.test.ts` |
| Book coverage | §5.5: Ex 5.5 Q1 to Q11, Q16, Q17; §5.3.3: Ex 5.3 Q9 to Q15 |
| Inspiration (code comment only) | Sonic grind rails (ride a rail, fly off along it), Kerbal Space Program docking (no gravity: momentum carries you straight on), Portal momentum puzzles |
| Core verb | **Drag the docking clamp up or down the station wall**, then release the robot and watch it drift. |

## 2. What the student learns

- Taking logs turns a product, quotient or root into a sum: for y = (x − a)ᵐ(x − b)ⁿ/(x − c)ᵏ, y′/y = m/(x − a) + n/(x − b) − k/(x − c).
- y = u^v: log y = v log u, so y′ = y(v′ log u + v·u′/u).
- A sum of such terms is differentiated term by term; the log of a sum does not split.
- (sin⁻¹ x)′ = 1/√(1 − x²), (cos⁻¹ x)′ = −1/√(1 − x²), (tan⁻¹ x)′ = 1/(1 + x²), and substitutions such as x = tan θ simplify sin⁻¹(2x/(1 + x²)) to 2 tan⁻¹ x on the right range.

## 3. The mechanic, physically

**Orbit**, a maintenance robot on a space station, slides along a curved rail whose shape is y = f(x) (the station's engineers post the formula). Its thrusters are out of fuel. At the release point x = x₀ it lets go, and in zero gravity it **drifts in a straight line along the rail's tangent**. The docking clamp is on the hull wall **d metres** further along. The robot reaches the wall at a height `d · f′(x₀)` metres above the release height (below if negative). The player slides the clamp to that height.

- Clamp too high: the robot passes under it, bonks the hull and tumbles away.
- Clamp too low: the robot passes over it, bonks the hull and tumbles away.
- Right height: the clamp catches it, the airlock ring turns green, and the commander cheers.

The **answer** of each round is the whole number `ans = d · f′(x₀)`. The dial is the clamp's height in metres relative to the release point, from −12 to 12 in steps of 1.

## 4. Story and characters

Hero banner: `name: 'Orbit'`, `role: 'a maintenance robot that rides the rails of a space station and must drift into its docking clamp'`.

| Level | story | objective |
|---|---|---|
| 1 | `Orbit slides along a rail shaped like y = f(x), lets go at the release point and, with no gravity and no fuel, drifts straight on along the rail’s tangent. Over the d metres to the wall it rises d·f′(x₀). The rails here are products and quotients of factors, so take logs to differentiate.` | `Set the docking clamp at the height where Orbit reaches the wall, in three rounds.` |
| 2 | `These rails are power towers like x^x, where both the base and the power change. Neither the power rule nor the exponential rule applies: take logs first.` | `Catch Orbit in the clamp on every power-tower rail, in three rounds.` |
| 3 | `These rails are square roots of quotients. Taking logs turns the root into a factor of one half.` | `Catch Orbit in the clamp on every root rail, in three rounds.` |
| 4 | `These rails are sums of power towers. The log of a sum does not split, so differentiate each term on its own and add.` | `Catch Orbit in the clamp on every sum rail, in three rounds.` |
| 5 | `These rails follow inverse trigonometric functions. A substitution such as x = tan θ often turns them into a simple multiple of tan⁻¹ x or sin⁻¹ x first.` | `Catch Orbit in the clamp on every inverse-trig rail, in three rounds.` |

Characters:
- **Orbit** (hero): a squat cylindrical robot (not a ball): a grey-white body 30 × 26 px with rivets on the panels, a dark face screen showing LED eyes, a stubby antenna with a blinking tip, a magnetic **grip claw** on top that holds the rail, two side thruster pods with a red `EMPTY` light that flickers, and a tool belt.
  - Idle: hangs from the rail and sways a little (`sin(t·2)·2°`), the antenna tip blinks every 1.2 s, the LED eyes blink, the empty thrusters cough a tiny spark every 2.5 s.
  - Release: the claw opens with a small flash and a `CLACK` floater, and a push-off puff.
  - Drift: no spin; a faint motion trail of 5 fading ghost outlines.
  - Moods on the LED screen: waiting `^ ^` (happy), drifting `o o` (focused), docked `★ ★` with a wave of one arm (cheer), bonk `> <` with a sweat drop (worried), tumbling `@ @` (dizzy).
- **Commander Vega** (NPC) in the airlock window beside the clamp: a helmeted astronaut face (use `face(g, …)` inside a round visor). Idle: looks at Orbit. Win: thumbs up and cheers. Miss: face-palm (a gloved hand over the visor).
- **The clamp** (the player's object): a ring of radius 14 with four claws, mounted on a vertical rail on the hull wall. On a catch the claws close and the ring lights `PAL.green`.

## 5. Rules (`logic.ts`)

### 5.1 Types

```ts
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
export interface Round extends Entry { start: number; assist: 0 | 1 | 2 }
export const DIAL = { min: -12, max: 12 };
export const DOCK = 1.4; // seconds from release to reaching the wall
```

### 5.2 The pools (copy exactly)

Every row was checked numerically: the central difference of `f` at `x0` times `d` is `ans` to 1e-6, and every `ans` is a whole number in −12..12.

```ts
const E = Math.E, ln = Math.log, sq = Math.sqrt, at = Math.atan, as = Math.asin, ac = Math.acos;
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
```

(The last row's `f` is written as `cos⁻¹(2x² − 1)`, which equals `sec⁻¹(1/(2x² − 1))`; JavaScript has no `asec`.)

### 5.3 Rounds and judging

```ts
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
```

### 5.4 Words

- `intel(r)`: `` `Rail: ${r.text}. Orbit lets go at x = ${r.x0Text}, and the wall is ${r.d} m further on. Set the clamp at the height where Orbit reaches the wall, measured from the release height.` ``
- Hint line: `` `${intel(r)} ${r.assist === 0 ? 'Round 1: the guide laser shows the drift line.' : r.assist === 1 ? 'No laser: a sensor ping costs a charge.' : 'Boss round: no laser, no ping.'}` ``
- `missText(r, h)` (h is the player's height; never mention `r.ans` or the slope):
  - high: `` `With the clamp ${where(h)} Orbit drifted in underneath it, bonked the hull and tumbled away.` ``
  - low: `` `With the clamp ${where(h)} Orbit drifted in above it, bonked the hull and tumbled away.` ``
  - `where(h)`: `h > 0` → `` `${h} m up` ``; `h < 0` → `` `${-h} m down` ``; `h === 0` → `level with the release point`.
- `pingText(r, h)` (the charge): `` `Sensor ping: on its present line Orbit will pass ${h > r.ans ? 'below' : h < r.ans ? 'above' : 'right through'} the clamp.` `` (direction only).
- Win: `` `Docked! ${r.work}` ``.

## 6. Screen and art

Canvas 640 × 340 (`mountDialLevel`).

```ts
const REL = { x: 230, y: 176 };   // the release point on screen, the same every round
const WALL = { x: 540, top: 34, bottom: 318, unit: 11 };   // 11 px per metre on the wall ruler
const clampY = (h: number) => REL.y - h * WALL.unit;
```

- **Backdrop**: deep space: `backdrop(g)` then 60 stars (two sizes, twinkling), the curved limb of a blue planet across the bottom-left corner with a thin atmosphere glow, and a slowly drifting satellite (decor).
- **Station**: grey truss beams across the top (crossed lines), and the **hull wall** at `WALL.x`: a vertical panel 60 px wide from `top` to `bottom` with rivets and warning stripes, plus the airlock window (Commander Vega) just right of the clamp's rail.
- **The rail**: a glowing tube (`PAL.cyan`, width 6, with a darker core) entering from the top left and curving down to the **release cradle** at `REL`. **Draw the same decorative curve every round**: a fixed Bézier from (20, 60) through (120, 40) and (170, 210) to `REL`. It is a picture of a rail, **not** a graph of f, so its slope at the cradle never hints at f′(x₀). The cradle is a dark box 34 × 24 centred on `REL` that hides the rail's true last direction.
- **The formula sign**: a panel at (14, 236), 300 × 52, `RAIL` in `PAL.dim` size 10, then `r.text` in `PAL.yellow` size 13 and `release at x = ${x0Text} · wall ${d} m away` in `PAL.white` size 11.
- **The wall ruler**: ticks every metre from −12 to 12 on the wall's left edge, labelled every 2 m (size 9, `PAL.dim`), with the 0 tick level with `REL.y` and labelled `release height`, plus a dashed `PAL.dim` line from `REL` to the wall at that height. **The distances are not to scale** (the wall is always at the same screen x whatever d is), and that is intended.
- **The clamp**: drawn at `(WALL.x − 8, clampY(h))`, the drag handle (radius 18). Its readout beside it shows `+3 m` or `−5 m`.
- **The guide laser (helper)**: round 1 only, a dashed `PAL.pink` line from `REL` to `(WALL.x − 8, clampY(r.ans))`, with small chevrons moving along it. Rounds 2 and 3: no laser. **Note**: the laser points at the answer, which is the round 1 helper; it must never appear in rounds 2 and 3, not even faintly.
- **Sensor ping** (charge): a radar ring expands from Orbit for 1.2 s and a short arrow appears on the clamp pointing up or down toward where Orbit will pass (direction only).

### 6.1 The drift (resolve)

**The robot's line must not reveal the answer on a miss** (the same round is replayed after a miss). On a win the line runs from `REL` to `(WALL.x − 8, clampY(r.ans))`. On a miss it runs from `REL` to the hull **2 m past the clamp on the side the robot really passes**: `clampY(h + 2)` when `r.ans > h` (it passes above), `clampY(h − 2)` when `r.ans < h` (it passes below), clamped to the wall's ruler. So the picture shows only "above" or "below", as the text does. With `rt` = seconds since release:
- 0 to 0.2 s: the claw opens (`CLACK` floater at 0.05 s), a push-off puff.
- 0.2 to `DOCK` (1.4 s): Orbit moves along the line at constant speed (u = (rt − 0.2)/1.2), with the motion trail.
- At `DOCK` the verdict lands (`delay: DOCK`):
  - **Win**: the clamp's claws close on Orbit, the ring flashes `PAL.green`, the airlock light turns green, a burst of `PAL.green` and `PAL.yellow` particles comes from the clamp, Vega gives a thumbs up, and Orbit waves (LED `★ ★`). Float `DOCKED!`.
  - **Miss**: Orbit hits the hull at the line's end (above or below the clamp) with a `THUNK` floater and sparks (`A.burst(x, y, PAL.yellow, 16, 150)`), then bounces back left and away along a slow arc while spinning (two full turns by 2.3 s), with LED `@ @`. Vega face-palms. The clamp flashes `PAL.red` once.
- All motion is finished by 2.3 s.

## 7. Controls and mount

```ts
function level(n: 1 | 2 | 3 | 4 | 5, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  return {
    hero: { name: 'Orbit', role: '…', ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials: [{ key: 'h', aria: 'Clamp height on the wall, in metres above the release point', label: 'Clamp height', unit: 'm', step: 1, min: DIAL.min, max: DIAL.max, start: (r) => r.start, text: (v) => (v > 0 ? `+${v}` : num(v)) }],
    handles: [{ dial: 'h', at: (_r, v) => [WALL.x - 8, clampY(v.h)], drag: (_r, _px, py) => (REL.y - py) / WALL.unit, radius: 18 }],
    test: { button: '📡 Ping', aria: 'Sensor ping: will Orbit pass above or below the clamp?', read: (r, v) => { pingPending = true; return pingText(r, v.h); } },
    fire: { button: '🚀 Release', aria: 'Release Orbit from the rail' },
    judge: (r, v) => judge(r, v.h),
    miss: (r, v) => missText(r, v.h),
    win: (r) => `Docked! ${r.work}`,
    hint: (r) => hintText(r),
    hit: () => [WALL.x - 8, REL.y],
    delay: DOCK,
    draw: (s) => drawScene(s),
  };
}
```

- `hit` must not point at the answer before the verdict; the burst only appears when the verdict lands, and at the wall's mid-height, so it reveals nothing.
- Ping animation: closure `let pingPending = false; let pingAt = -10;`, set in `draw` as in brief 03.
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(5, ctx.level)) as 1 | 2 | 3 | 4 | 5; return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA); } })` with `ARIA = 'A maintenance robot on a curved space-station rail, about to drift across to a docking clamp on the hull wall that the player slides up or down.'`

## 8. game.json (copy exactly)

```json
{
  "$schema": "../../../../../../schema/game.schema.json",
  "id": "dock-drift",
  "title": "Dock Drift",
  "summary": "Guide a robot drifting off a space-station rail into its docking clamp, using logarithmic differentiation to find the slope.",
  "subject": "mathematics",
  "classLevel": 12,
  "chapter": { "number": 5, "name": "Continuity and Differentiability" },
  "ncertRef": "Section 5.5, Logarithmic Differentiation",
  "concepts": [
    "Logarithmic differentiation of products and quotients",
    "Derivative of u(x)^v(x) by taking logs",
    "Roots of quotients by taking logs",
    "Differentiate a sum term by term",
    "Derivatives of inverse trigonometric functions",
    "Simplifying by a trigonometric substitution first"
  ],
  "learningOutcome": "The student can differentiate products, quotients, roots and powers like u(x)^v(x) by taking logs, and inverse trigonometric functions after a substitution, then evaluate the slope at a point.",
  "mechanic": "tune-to-target",
  "estimatedMinutes": 22,
  "levels": [
    {
      "title": "Many factors",
      "tier": "concept",
      "kind": "foundation",
      "adds": "Baseline: for a product or quotient take logs, so y′/y is a sum of terms like m/(x − a); multiply by y at the point (Ex 5.5 Q1, Q16, Q17).",
      "hints": [
        "log y turns the product into a sum: log y = m log|x − a| + n log|x − b|.",
        "Differentiate: y′/y = m/(x − a) + n/(x − b), and a factor in the denominator gives a minus sign.",
        "Find y at the release point, multiply, then times the distance to the wall."
      ]
    },
    {
      "title": "Power towers",
      "tier": "application",
      "kind": "concept",
      "adds": "New: y = u^v. Take logs, log y = v log u, so y′/y = v′ log u + v u′/u; when u = 1 the log term vanishes (Ex 5.5 Q3, Q4, Q7).",
      "hints": [
        "Neither the power rule nor the exponential rule works when both base and exponent vary.",
        "log y = v log u, so y′ = y(v′ log u + v u′/u).",
        "At the release point the base is 1, so log u = 0 and y = 1."
      ]
    },
    {
      "title": "Root rails",
      "tier": "application",
      "kind": "complexity",
      "adds": "Harder: a square root of a quotient. log y = ½[log|x − a| + log|x − b| − log|x − c| …] (Ex 5.5 Q2).",
      "hints": [
        "Take logs first: the root becomes a factor ½ in front of the sum.",
        "Each factor under the root gives ±1/(x − r) inside the bracket.",
        "Work out y itself at the point: it is a whole number here."
      ]
    },
    {
      "title": "Sums of towers",
      "tier": "challenge",
      "kind": "concept",
      "adds": "New: for a sum such as x^x + (2x − 1)^x, differentiate each term on its own; log of a sum does not split (Ex 5.5 Q5 to Q11).",
      "hints": [
        "Write y = u + v and find u′ and v′ separately.",
        "Take logs of each term, never of the whole sum.",
        "Add the two slopes at the release point."
      ]
    },
    {
      "title": "Inverse trig rails",
      "tier": "challenge",
      "kind": "concept",
      "adds": "New: derivatives of sin⁻¹, cos⁻¹ and tan⁻¹; substitute x = tan θ or sin θ to simplify first (Ex 5.3 Q9 to Q15).",
      "hints": [
        "(sin⁻¹ x)′ = 1/√(1 − x²), (cos⁻¹ x)′ = −1/√(1 − x²), (tan⁻¹ x)′ = 1/(1 + x²).",
        "With x = tan θ, 2x/(1 + x²) = sin 2θ, so sin⁻¹(2x/(1 + x²)) = 2 tan⁻¹ x here.",
        "Check the range of x: it decides which simplification is true."
      ]
    }
  ],
  "misconceptions": [
    "The derivative of x^x is x·x^(x − 1)",
    "log(u + v) = log u + log v",
    "sin⁻¹(2x/(1 + x²)) is always 2 tan⁻¹ x"
  ],
  "author": { "name": "Concept Arcade maintainers", "github": "AnubhavShankar" }
}
```

## 9. Tests

### 9.1 `logic.test.ts`

1. **Every pool row** (loop over all rows of all pools): `(f(x0 + 1e-6) − f(x0 − 1e-6)) / 2e-6 · d` is within 1e-5 of `ans`; `ans` is a whole number in −12..12; `work` contains the string of `ans` as it appears in the last sentence (`` `${Math.abs(ans)} m` `` or the word `level`); `x0Text` evaluates to `x0` (`'e'` → `Math.E`, `'a/b'` → a / b).
2. **One winner**: for every row, scanning h from −12 to 12, only `ans` passes `judge`.
3. **Levels**: 80 seeds; the kinds are `product` (level 1), `tower` (2), `root` (3), `sum` (4), `invtrig` (5); `assist` is `[0, 1, 2]`; `start` is in range and never `ans`.
4. **Faults and words**: `fault(r, ans + 1)` is `high`, `fault(r, ans − 1)` is `low`; `missText` says `underneath` for high and `above it` for low; for every miss h with `|h| !== |ans|`, `missText(r, h)` does not contain `` `${Math.abs(r.ans)} m` `` (use a regex with a leading word boundary so `13 m` does not match `3 m`); `pingText` contains `below`, `above` or `right through` and no digits.

### 9.2 `tests/dock-drift-ui.test.ts`

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch05-continuity-and-differentiability/dock-drift/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch05-continuity-and-differentiability/dock-drift/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'dock-drift', 5);
const build = (level: number, seed: number) => buildRounds(level as 1 | 2 | 3 | 4 | 5, createRng(seed));
const wrong = (r: Round) => (r.ans < 12 ? r.ans + 1 : r.ans - 1);

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4, 5],
  build,
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: () => h.click('Release Orbit from the rail'),
});
```

Then `describe('Dock Drift', …)`: the slider runs −12..12 and starts at the round's `start`; a miss says `bonked the hull`; the ping costs a charge (`/Sensor ping/`, then `/No charges left/`); a win says `Docked!`.

## 10. Traps to avoid

- The rail picture is decorative and the same every round. Never draw the real graph of f, and never let the cradle show the release direction.
- The guide laser is round 1 only.
- The wall is not to scale; do not "fix" it by placing it at `d` metres.
- Miss texts give the direction (under or over) only.
- `(log x)^x` at x = e: compute with `Math.log(x) ** x`; at e it is exactly 1.
- Every animation finishes inside 2.4 s.
