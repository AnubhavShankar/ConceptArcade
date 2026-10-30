# 17 · Warp Lane (Maths Ch 7, §7.3.1 and 7.9 Substitution, with a change of limits)

Read `README.md` in this folder first. Everything below is required unless marked "optional". Flow Control level 3 already plays one substitution, u = t² + c; this game covers substitution in general, as a definite integral with a change of limits.

## 1. Identity

| Field | Value |
|---|---|
| Game id | `warp-lane` |
| Folder | `src/games/mathematics/class-12/ch07-integrals/warp-lane/` |
| Files | `game.json` (**copy `docs/curriculum/gap-designs/json/warp-lane.json` exactly**), `logic.ts`, `logic.test.ts`, `index.ts`, `art.ts` |
| UI test | `tests/warp-lane-ui.test.ts` |
| Book coverage | §7.3.1, 7.9; Ex 7.2; Ex 7.9 Q1 to Q8 |
| Inspiration (code comment only) | Kart racers with warp pipes and shortcut tunnels (dive in at one place, pop out at another), and boost pads that change your speed |
| Core verb | **Place the two warp mouths on the u-lane** (drag handles) and **set the warp's boost factor**, then race. |

## 2. What the student learns

- Choose u = g(x) where g′(x) appears in the integrand; du = g′(x) dx.
- The leftover constant: for x(x² + 1)³ with u = x² + 1, x dx = du/2, so the factor is 1/2.
- Change the limits: x = a and x = b become u = g(a) and u = g(b). They can come out **reversed** (u = cos x on [0, π/2] gives 1 to 0) or **negative** (u = −x²). The minus sign from du = −sin x dx must be kept.

## 3. The mechanic, physically

**Zip**, a kart racer, drives a twisty track in x-land. At x = a there is a warp pipe that leads into **u-land**, a straight lane with a ruler marked in whole u values, and at x = b a warp pipe leads back out to the finish. The warp only works if:
- the **entry mouth** on the u-lane sits at u = g(a);
- the **exit mouth** sits at u = g(b) (which can be to the left of the entry: then Zip drives left in u-land);
- the warp's **boost factor** k is the constant from du = g′(x) dx (k = 1/2 for x dx = du/2; k = −1 for sin x dx = −du).

The player sets the two mouths (dials `lo` and `hi`, whole numbers from −5 to 30) and the boost (dial `k` in sixths from −12 to 12, so 3 means 1/2 and −6 means −1). Exactly one setting works: the mouths are determined by g(a) and g(b), and the factor by du.

Hero banner: `name: 'Zip'`, `role: 'a kart racer who takes warp pipes through u-land to cut the twisty track short'`.

| Level | story | objective |
|---|---|---|
| 1 | `The x-land track is a twisty integral. The warp pipe substitutes u = g(x): it takes Zip from x = a to u = g(a), down the straight u-lane, and out at u = g(b). The warp’s boost is the constant left over from du = g′(x) dx.` | `Place both warp mouths and set the boost so Zip warps through cleanly, in three rounds.` |
| 2 | `These warps use logs and exponentials: u = log x turns dx/x into du, and u = 1 + eˣ turns eˣ dx into du.` | `Place both mouths and set the boost, in three rounds.` |
| 3 | `Backwards warps: when u falls as x rises, as u = cos x does, the exit mouth sits to the left of the entry and the boost is negative. Some warps here still run forwards, so check which way u goes.` (review fix: one level 3 row runs forwards; rounds never repeat an integral) | `Warp through the backwards pipes cleanly, in three rounds.` |
| 4 | `The warp master’s pipes bring factors of 1/3 and limits below zero.` | `Clear the master’s warps, in three rounds.` |

Characters:
- **Zip** (hero): a racer in a round helmet with a lightning stripe and a visor, scarf flapping, in a low kart with fat tyres, a spoiler and twin exhausts. Idle: the engine rumbles (the kart shakes slightly), exhaust puffs come out, Zip drums on the wheel and looks at the warp sign. Moods (`face`, visor up in the portrait): happy waiting, cheer on a win (fist out of the kart), worried with a sweat drop on a crash, dizzy stars after spinning out.
- **The warp pipes**: big neon pipes (`PAL.green` rims) that swallow the kart with a swirl effect and spit it out with a pop.
- **Rival** (optional, recommended): a ghost kart (translucent) that races the perfect line in round 1 as the helper.

## 4. Rules (`logic.ts`)

### 4.1 Rows

```ts
import { aid, type Values } from '@core/dialgame';
import { shuffle } from '@core/quiz';

export interface Row {
  /** The integral as shown: '∫₀² x(x² + 1)³ dx'. */
  text: string;
  /** The integrand, its limits and the substitution, for the tests and the drawing. */
  f: (x: number) => number; a: number; b: number; aText: string; bText: string;
  uText: string;          // 'u = x² + 1'
  duText: string;         // 'du = 2x dx'
  u: (x: number) => number;
  /** The integrand in u-land without the factor, and its text: 'u³'. */
  h: (u: number) => number; hText: string;
  /** The answer: the new limits and the factor in sixths. */
  lo: number; hi: number; k6: number;
  /** The value of the integral, written: '78', 'e⁴ − e', 'π/4'. */
  valueText: string;
}
export interface Round extends Row { assist: 0 | 1 | 2 }
export const RUN = { into: 0.4, lane: 1.0, out: 0.3 };   // seconds
```

### 4.2 The pools (copy exactly)

Every row was checked numerically: Simpson's rule on f from a to b equals (k6/6)·∫ from lo to hi of h(u) du to 1e-6, and u(a) = lo, u(b) = hi.

```ts
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
```

### 4.3 Rounds and judging

```ts
const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
export const buildRounds = (level: 1 | 2 | 3 | 4, random: () => number): Round[] => POOLS[level].map((pool, k) => ({ ...pick(pool, random), assist: aid(k) }));
export const judge = (r: Row, v: Values) => v.lo === r.lo && v.hi === r.hi && v.k === r.k6;
/** The first part of the warp that fails, in the order the kart meets them. */
export const fault = (r: Row, v: Values): 'entry' | 'exit' | 'boost' | null => (v.lo !== r.lo ? 'entry' : v.hi !== r.hi ? 'exit' : v.k !== r.k6 ? 'boost' : null);
/** Seconds into the race when the verdict lands. */
export const verdictTime = (r: Row, v: Values) => { const f = fault(r, v); return f === 'entry' ? RUN.into + 0.15 : f === 'exit' ? RUN.into + RUN.lane : f === 'boost' ? RUN.into + RUN.lane + 0.1 : RUN.into + RUN.lane + RUN.out; };
```

The start is `lo = 0, hi = 0, k = 0`. k = 0 is never an answer, so the start never wins.

### 4.4 Words

- `sixths(k)`: k/6 reduced with a true minus sign: `6 → '1'`, `3 → '1/2'`, `-6 → '−1'`, `-3 → '−1/2'`, `2 → '1/3'`, `0 → '0'`, `4 → '2/3'`, `12 → '2'`.
- `intel(r)`: `` `Track: ${r.text}. Warp: ${r.uText}. Place the entry mouth at the u where x = ${r.aText} lands, the exit mouth where x = ${r.bText} lands, and set the boost from ${r.duText}.` ``
- Hint line: `` `${intel(r)} ${r.assist === 0 ? 'Round 1: the ghost kart shows the clean line.' : r.assist === 1 ? 'No ghost: a test lap costs a charge.' : 'Boss round: no ghost, no test lap.'}` ``
- `missText(r, v)` by fault:
  - entry: `` `The warp from x = ${r.aText} does not open at u = ${v.lo}: Zip shot out of a dead pipe and tumbled into the void.` ``
  - exit: `` `Zip warped in cleanly, but the exit mouth at u = ${v.hi} is not where x = ${r.bText} lands: the kart missed the exit and crashed into the end of the lane.` ``
  - boost: `` `Both mouths were right, but the boost ${sixths(v.k)} was wrong: Zip came out of the warp ${Math.abs(v.k) > Math.abs(r.k6) ? 'too fast and spun out' : 'too slow and stalled'}${Math.sign(v.k) !== Math.sign(r.k6) ? ', facing the wrong way' : ''}.` ``
  - Never state the right value.
- `testText(r, v)` (charge): `` `Test lap: the entry is ${v.lo === r.lo ? 'right' : 'wrong'}, the exit is ${v.hi === r.hi ? 'right' : 'wrong'} and the boost is ${v.k === r.k6 ? 'right' : 'wrong'}.` ``
- Win: `` `Clean warp! ${r.uText}, ${r.duText}. When x = ${r.aText}, u = ${r.lo}; when x = ${r.bText}, u = ${r.hi}. So ${r.text} = ${sixths(r.k6)} × ∫ from ${r.lo} to ${r.hi} of ${r.hText} du = ${r.valueText}.` ``

## 5. Screen and art

Canvas 640 × 340 (`mountDialLevel`).

```ts
const XLAND = { x0: 40, x1: 600, y0: 40, y1: 140 };   // the twisty track, top band
const ULANE = { x0: 40, x1: 600, y: 250, uMin: -5, uMax: 30 };   // the straight u-lane, bottom band
const Ux = (u: number) => ULANE.x0 + ((u - ULANE.uMin) / (ULANE.uMax - ULANE.uMin)) * (ULANE.x1 - ULANE.x0);
```

- **x-land** (top band): the graph of the integrand f over [a, b], drawn as a wavy neon track (scaled to fit, no numbers), with the entry pipe at its left end labelled `x = ${aText}` and the exit pipe at its right end labelled `x = ${bText}`. The integral `r.text` is on a big sign above it.
- **u-land** (bottom band): a straight neon lane with a ruler from −5 to 30, a tick at every whole u, labelled every 5 (size 9, `PAL.dim`). The **entry mouth** is a green pipe mouth standing on the lane at `Ux(lo)` (handle), and the **exit mouth** is an orange one at `Ux(hi)` (handle). On the lane, the u-integrand `hText` is painted as a road marking. The boost dial shows as a gauge beside the lane, labelled `boost ×${sixths(k)}`.
- **Warp tubes**: glowing curved tubes from the x-land entry pipe down to the entry mouth, and from the exit mouth up to the x-land exit pipe. They follow the player's mouths, so they show the player's own setting.
- **Helper**: round 1, a translucent ghost kart drives the correct line (it shows where the mouths should be, as the round 1 helper). Round 2: no ghost; a test lap (charge) gives the right or wrong text. Round 3: nothing.
- **The race** (`delay: (r, v) => verdictTime(r, v)`):
  - 0 to 0.4 s: Zip drives along x-land to the entry pipe and dives in (swirl).
  - If the entry is wrong: Zip pops out of the player's entry mouth into empty space (the mouth is not connected: draw the tube broken with sparks) and tumbles off the lane at 0.55 s, dizzy.
  - Else 0.4 to 1.4 s: Zip drives along the u-lane from the entry mouth toward the exit mouth, to the right or to the **left** when hi < lo, with the boost flames scaled by |k|.
  - If the exit is wrong: at 1.4 s Zip reaches the player's exit mouth but it is a dead end: the kart smashes into a barrier with a burst.
  - If the boost is wrong (mouths right): at 1.5 s Zip pops out of the exit pipe spinning (too fast) or stalls halfway up the tube and slides back (too slow), and faces backwards if the sign was wrong.
  - Win: at 1.7 s Zip pops out at x = b, crosses the finish with confetti and a `WARP!` float.
  - Everything finishes by 2.3 s.

## 6. Controls and mount

```ts
dials: [
  { key: 'lo', aria: 'Entry mouth position on the u-lane', label: 'Entry u', unit: '', step: 1, min: -5, max: 30, start: 0 },
  { key: 'hi', aria: 'Exit mouth position on the u-lane', label: 'Exit u', unit: '', step: 1, min: -5, max: 30, start: 0 },
  { key: 'k', aria: 'Warp boost factor, in sixths', label: 'Boost', unit: '', step: 1, min: -12, max: 12, start: 0, text: (v) => `×${sixths(v)}` },
],
handles: [
  { dial: 'lo', at: (_r, v) => [Ux(v.lo), ULANE.y - 14], drag: (_r, px) => ULANE.uMin + ((px - ULANE.x0) / (ULANE.x1 - ULANE.x0)) * (ULANE.uMax - ULANE.uMin), radius: 16 },
  { dial: 'hi', at: (_r, v) => [Ux(v.hi), ULANE.y + 14], drag: (_r, px) => ULANE.uMin + ((px - ULANE.x0) / (ULANE.x1 - ULANE.x0)) * (ULANE.uMax - ULANE.uMin), radius: 16 },
],
test: { button: '🏁 Test lap', aria: 'Test lap: check the entry, the exit and the boost', read: (r, v) => testText(r, v) },
fire: { button: '🏎 Race', aria: 'Race through the warp' },
```

The entry handle sits just above the lane and the exit handle just below, so they never overlap even when lo = hi. `hit` is a fixed point (the finish line). Mount as the other briefs, with 4 levels and `ARIA = 'A kart racer on a twisty track with warp pipes that lead down to a straight u-lane, where the player places the warp mouths.'`

## 7. game.json

Copy `docs/curriculum/gap-designs/json/warp-lane.json` exactly.

## 8. Tests

- `logic.test.ts`: every row: Simpson on f from a to b equals (k6/6)·Simpson on h from lo to hi (1e-6), u(a) = lo and u(b) = hi; one winner (scan each dial over its range with the others at the answer); the start loses; `fault` order entry → exit → boost; `verdictTime` below 2.4; `sixths` strings; miss texts never contain the right lo, hi or factor as a value (`u = ${r.lo}` only appears when the player's lo equals it, which is not a miss on entry).
- `tests/warp-lane-ui.test.ts`: `arcadeHarness(game, 'warp-lane', 4)`, `shellTests` with setters for the three sliders (wrong: bump `lo` by 1), the commit `Race through the warp`; checks: three sliders with the ranges above; the test lap costs a charge; a level 3 win says `Clean warp!`; the ghost kart is not drawn in round 3 (record canvas strings or a `data-ghost` attribute).

## 9. Traps to avoid

- The ghost kart is the round 1 helper only.
- The warp tubes follow the player's mouths, never the answer.
- In level 3 the exit is left of the entry: the kart drives left. Test it.
- Keep every animation inside 2.4 s.
