# 07 · Mirror Mage (Maths Ch 7, §7.10 Some properties of definite integrals)

Read `README.md` in this folder first (especially "A miss must not show the answer either"). Everything below is required unless marked "optional". Even and odd integrands over [−a, a] are already in Flow Control level 4; this game adds splitting (P3), the a − x property (P4) and its uses, the [0, 2a] property (P7), and the log integrals.

## 1. Identity

| Field | Value |
|---|---|
| Game id | `mirror-mage` |
| Folder | `src/games/mathematics/class-12/ch07-integrals/mirror-mage/` |
| Files | `game.json` (**copy `docs/curriculum/gap-designs/json/mirror-mage.json` exactly**), `logic.ts`, `logic.test.ts`, `index.ts`, `art.ts` |
| UI test | `tests/mirror-mage-ui.test.ts` |
| Book coverage | §7.10; Ex 7.10 Q1 to Q8, Q10, Q11, Q13, Q14, Q16 to Q18 |
| Inspiration (code comment only) | Fantasy RPG spell casting with an exact mana cost, and mirror and reflection puzzles (the mirror shows the hidden shape of the problem) |
| Core verb | **Turn the mana ring** (a rotary dial around the mage's staff) to the rune's exact value, then cast. The mirror spell (a charge) shows the shape that cracks the integral. |

## 2. What the student learns

- P3: split ∫ |x − c| dx at c (and |x² − 1| at ±1).
- P4: ∫₀^a f(x) dx = ∫₀^a f(a − x) dx; adding the two forms, 2I = ∫₀^a [f(x) + f(a − x)] dx, which is often just a.
- P4 to tame a power: ∫₀¹ x(1 − x)ⁿ dx = ∫₀¹ (1 − x)xⁿ dx.
- P6 and P7: over [0, 2a], 2∫₀^a f or 0, depending on f(2a − x) = ±f(x); odd integrands over [−a, a] give 0.
- The classic log integrals: ∫₀^(π/4) log(1 + tan x) dx = (π/8) log 2 and ∫₀^(π/2) log sin x dx = −(π/2) log 2.

## 3. Story and characters

**Lyra**, a mirror mage, breaks the rune barriers of a ruined tower. Each barrier carries a **rune**: the region between a curve y = f(x) and the axis, from x = a to x = b. The rune drinks **exactly** ∫ₐᵇ f dx of mana; where f is negative, it gives mana back. Lyra sets the mana on the ring of her staff and casts:
- Exact: the rune fills with light and the barrier shatters.
- Too little: the spell runs dry with part of the rune still dark, it fizzles, and the Stone Warden behind the barrier strikes back.
- Too much: the rune overflows and the spell backfires at the caster.

Lyra's **mirror spell** (a charge) shows the rune together with its mirror image, which is the idea that cracks the integral.

Hero banner: `name: 'Lyra'`, `role: 'a mirror mage who breaks rune barriers by channelling exactly the mana each rune holds'`.

| Level | story | objective |
|---|---|---|
| 1 | `A rune drinks exactly the integral of its curve. These runes are V-shaped, the curve |x − c|, so split the integral where the V turns and add the two triangles.` | `Channel exactly each rune’s mana, in three rounds. Mana is counted in halves.` |
| 2 | `These runes look impossible to integrate. But a rune and its mirror image, f(a − x), fit together into a full block of height 1. So the rune holds exactly half the block.` | `Channel exactly each rune’s mana, in three rounds. Mana is counted in units of π/8.` |
| 3 | `These runes are powers like x(1 − x)⁵. In the mirror they become (1 − x)x⁵, which falls apart into easy powers of x.` | `Channel exactly each rune’s mana, in three rounds. Each rune holds 1/m of a crystal: find m.` |
| 4 | `These runes run over whole half-turns or symmetric ranges. Fold the rune at its middle: the halves are equal and add, or opposite and cancel.` | `Channel exactly each rune’s mana, in three rounds. Mana is counted in units of π/8; a balanced rune holds 0.` |
| 5 | `The tower’s last runes are logarithms, and some give mana back. Mirror them, add, and the logs collapse into log 2.` | `Channel exactly each rune’s mana, in three rounds. Mana is counted in units of (π/8) log 2.` |

Characters:
- **Lyra** (hero): stands at the left in a hooded deep-blue robe embroidered with small stars, holding a tall staff topped with a round silver mirror; a spellbook floats beside her, its pages flipping.
  - Idle: the robe's hem sways, the mirror glints every 2.5 s, the book bobs.
  - Casting: the staff rises, and a stream of `PAL.cyan` mana particles flows from the mirror into the rune.
  - Moods (`face`): focused while waiting, cheer and a staff twirl on a win. On a fizzle, worried with a sweat drop and knocked back a step. On a backfire, sooty face, smoke wisps and frizzed hair.
- **The Stone Warden** (enemy): a golem of floating rock blocks behind the barrier, with two glowing eyes and moss on the shoulders. Idle: the rocks hover and grind slightly. On a win the barrier shatters and the Warden crumbles into a pile of rubble with its eyes going dark. On a fizzle it slams a fist on the ground, and a shockwave ring runs to Lyra. On a backfire it rumbles with a mocking glow.
- **The barrier**: a translucent violet wall with the rune carved into it as a glowing outline; cracks spread across it on a win before it shatters into shards.

## 4. Rules (`logic.ts`)

### 4.1 Types and units

```ts
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';

export type Unit = 'half' | 'pi8' | 'recip' | 'pilog';
export interface Row {
  /** The rune's integrand as written, e.g. '√(sin x)/(√(sin x) + √(cos x))'. */
  name: string;
  f: (x: number) => number;
  a: number; b: number;
  /** The limits as written: '0', 'π/2', '−5'. */
  aText: string; bText: string;
  /** The answer as a whole number of the level's unit (for 'recip', the m in 1/m). */
  ans: number;
  /** For level 1: where the V turns (the split points), used by the mirror spell. */
  splits?: number[];
  work: string;
}
export interface Round extends Row { assist: 0 | 1 | 2 }
export const UNIT: Record<1 | 2 | 3 | 4 | 5, Unit> = { 1: 'half', 2: 'pi8', 3: 'recip', 4: 'pi8', 5: 'pilog' };
export const RANGE: Record<1 | 2 | 3 | 4 | 5, { min: number; max: number; start: number }> = {
  1: { min: 0, max: 60, start: 30 },
  2: { min: 0, max: 16, start: 8 },
  3: { min: 2, max: 120, start: 2 },
  4: { min: 0, max: 16, start: 12 },
  5: { min: -12, max: 12, start: 4 },
};
/** The mana value of dial k in the level's unit, as a real number. */
export const manaValue = (u: Unit, k: number) => (u === 'half' ? k / 2 : u === 'pi8' ? (k * Math.PI) / 8 : u === 'recip' ? 1 / k : ((k * Math.PI) / 8) * Math.log(2));
export const judge = (r: Row, k: number) => k === r.ans;
/** 'low': less mana than the rune holds; 'high': more. Compare values, not dial numbers (for 'recip' a bigger m is less mana). */
export const fault = (u: Unit, r: Row, k: number): 'low' | 'high' | null => (k === r.ans ? null : manaValue(u, k) < manaValue(u, r.ans) ? 'low' : 'high');
```

### 4.2 Unit texts

- `half(k)`: k/2 reduced: `10 → '5'`, `13 → '13/2'`, `9 → '9/2'`, `0 → '0'`.
- `pi8(k)`: `0 → '0'`, `1 → 'π/8'`, `2 → 'π/4'`, `3 → '3π/8'`, `4 → 'π/2'`, `6 → '3π/4'`, `8 → 'π'`, `12 → '3π/2'`, `16 → '2π'`, and in general k/8 reduced times π (`5 → '5π/8'`, `10 → '5π/4'`).
- `recip(m)`: `` `1/${m}` ``.
- `pilog(k)`: `0 → '0'`; otherwise the sign, then `(π/8) log 2` style with k/8 reduced: `1 → '(π/8) log 2'`, `2 → '(π/4) log 2'`, `4 → '(π/2) log 2'`, `8 → 'π log 2'`, `-4 → '−(π/2) log 2'`, `-8 → '−π log 2'`, `3 → '(3π/8) log 2'`, `12 → '(3π/2) log 2'`.
- `manaText(u, k)`: the text above for the level's unit.

### 4.3 The pools (copy exactly)

All values were checked numerically (Simpson's rule; the log rows with an end-flattening substitution, see 8.1).

```ts
const { sin, cos, tan, exp, log, sqrt, abs, PI } = Math;
const r = (name: string, f: (x: number) => number, a: number, b: number, aText: string, bText: string, ans: number, work: string, splits?: number[]): Row => ({ name, f, a, b, aText, bText, ans, work, splits });

export const POOLS: Record<1 | 2 | 3 | 4 | 5, [Row[], Row[], Row[]]> = {
  1: [
    [
      r('|x − 1|', (x) => abs(x - 1), 0, 4, '0', '4', 10, 'Split at x = 1: ∫₀¹ (1 − x) dx + ∫₁⁴ (x − 1) dx = 1/2 + 9/2 = 5.', [1]),
      r('|x − 2|', (x) => abs(x - 2), 0, 6, '0', '6', 20, 'Split at x = 2: ∫₀² (2 − x) dx + ∫₂⁶ (x − 2) dx = 2 + 8 = 10.', [2]),
      r('|x − 2|', (x) => abs(x - 2), 0, 5, '0', '5', 13, 'Split at x = 2: ∫₀² (2 − x) dx + ∫₂⁵ (x − 2) dx = 2 + 9/2 = 13/2.', [2]),
    ],
    [
      r('|x − 5|', (x) => abs(x - 5), 2, 8, '2', '8', 18, 'Split at x = 5: ∫₂⁵ (5 − x) dx + ∫₅⁸ (x − 5) dx = 9/2 + 9/2 = 9.', [5]),
      r('|x − 1|', (x) => abs(x - 1), -2, 6, '−2', '6', 34, 'Split at x = 1: ∫₋₂¹ (1 − x) dx + ∫₁⁶ (x − 1) dx = 9/2 + 25/2 = 17.', [1]),
      r('|2x − 3|', (x) => abs(2 * x - 3), 0, 3, '0', '3', 9, 'Split at x = 3/2: ∫₀^(3/2) (3 − 2x) dx + ∫_(3/2)³ (2x − 3) dx = 9/4 + 9/4 = 9/2.', [1.5]),
    ],
    [
      r('|x + 2|', (x) => abs(x + 2), -5, 5, '−5', '5', 58, 'Split at x = −2: ∫₋₅⁻² (−2 − x) dx + ∫₋₂⁵ (x + 2) dx = 9/2 + 49/2 = 29.', [-2]),
      r('|x² − 1|', (x) => abs(x * x - 1), 0, 2, '0', '2', 4, 'Split at x = 1: ∫₀¹ (1 − x²) dx + ∫₁² (x² − 1) dx = 2/3 + 4/3 = 2.', [1]),
      r('|x² − 1|', (x) => abs(x * x - 1), -2, 2, '−2', '2', 8, 'Split at x = −1 and 1, or note the integrand is even: twice ∫₀² |x² − 1| dx = 2 × 2 = 4.', [-1, 1]),
    ],
  ],
  2: [
    [
      r('√(sin x)/(√(sin x) + √(cos x))', (x) => sqrt(sin(x)) / (sqrt(sin(x)) + sqrt(cos(x))), 0, PI / 2, '0', 'π/2', 2, 'Replace x by π/2 − x: I = ∫ √(cos x)/(√(cos x) + √(sin x)) dx. Adding the two forms, 2I = ∫₀^(π/2) 1 dx = π/2, so I = π/4.'),
      r('cos⁵ x/(sin⁵ x + cos⁵ x)', (x) => cos(x) ** 5 / (sin(x) ** 5 + cos(x) ** 5), 0, PI / 2, '0', 'π/2', 2, 'With π/2 − x, I = ∫ sin⁵ x/(cos⁵ x + sin⁵ x) dx. Adding, 2I = π/2, so I = π/4.'),
      r('sin^(3/2) x/(sin^(3/2) x + cos^(3/2) x)', (x) => sin(x) ** 1.5 / (sin(x) ** 1.5 + cos(x) ** 1.5), 0, PI / 2, '0', 'π/2', 2, 'With π/2 − x the sines and cosines swap; adding the two forms, 2I = π/2, so I = π/4.'),
      r('cos² x', (x) => cos(x) ** 2, 0, PI / 2, '0', 'π/2', 2, 'With π/2 − x, I = ∫₀^(π/2) sin² x dx as well. Adding, 2I = ∫ (cos² x + sin² x) dx = π/2, so I = π/4.'),
    ],
    [
      r('eˣ/(eˣ + e^(π − x))', (x) => exp(x) / (exp(x) + exp(PI - x)), 0, PI, '0', 'π', 4, 'With π − x, I = ∫ e^(π − x)/(e^(π − x) + eˣ) dx. Adding, 2I = π, so I = π/2.'),
      r('x²/(x² + (π − x)²)', (x) => (x * x) / (x * x + (PI - x) ** 2), 0, PI, '0', 'π', 4, 'With π − x, I = ∫ (π − x)²/((π − x)² + x²) dx. Adding, 2I = π, so I = π/2.'),
      r('sin x/(sin x + sin(π/4 − x))', (x) => sin(x) / (sin(x) + sin(PI / 4 - x)), 0, PI / 4, '0', 'π/4', 1, 'With π/4 − x, I = ∫ sin(π/4 − x)/(sin(π/4 − x) + sin x) dx. Adding, 2I = π/4, so I = π/8.'),
    ],
    [
      r('x⁴/(x⁴ + (π/4 − x)⁴)', (x) => x ** 4 / (x ** 4 + (PI / 4 - x) ** 4), 0, PI / 4, '0', 'π/4', 1, 'With π/4 − x the two powers swap; adding, 2I = π/4, so I = π/8.'),
      r('1/(1 + e^(cos x))', (x) => 1 / (1 + exp(cos(x))), 0, PI, '0', 'π', 4, 'With π − x, cos x becomes −cos x: I = ∫ 1/(1 + e^(−cos x)) dx = ∫ e^(cos x)/(e^(cos x) + 1) dx. Adding, 2I = π, so I = π/2.'),
      r('1/(1 + tan³ x)', (x) => 1 / (1 + tan(x) ** 3), 0, PI / 2, '0', 'π/2', 2, 'With π/2 − x, tan x becomes cot x: I = ∫ 1/(1 + cot³ x) dx = ∫ tan³ x/(tan³ x + 1) dx. Adding, 2I = π/2, so I = π/4.'),
    ],
  ],
  3: [
    [
      r('x(1 − x)²', (x) => x * (1 - x) ** 2, 0, 1, '0', '1', 12, '∫₀¹ x(1 − x)² dx = ∫₀¹ (1 − x)x² dx = 1/3 − 1/4 = 1/12.'),
      r('x(1 − x)³', (x) => x * (1 - x) ** 3, 0, 1, '0', '1', 20, '∫₀¹ x(1 − x)³ dx = ∫₀¹ (1 − x)x³ dx = 1/4 − 1/5 = 1/20.'),
    ],
    [
      r('x(1 − x)⁴', (x) => x * (1 - x) ** 4, 0, 1, '0', '1', 30, '∫₀¹ (1 − x)x⁴ dx = 1/5 − 1/6 = 1/30.'),
      r('x(1 − x)⁵', (x) => x * (1 - x) ** 5, 0, 1, '0', '1', 42, '∫₀¹ (1 − x)x⁵ dx = 1/6 − 1/7 = 1/42.'),
      r('x²(1 − x)²', (x) => x * x * (1 - x) ** 2, 0, 1, '0', '1', 30, 'The mirror leaves it the same, so expand: ∫₀¹ (x² − 2x³ + x⁴) dx = 1/3 − 1/2 + 1/5 = 1/30.'),
    ],
    [
      r('x²(1 − x)³', (x) => x * x * (1 - x) ** 3, 0, 1, '0', '1', 60, '∫₀¹ (1 − x)²x³ dx = ∫₀¹ (x³ − 2x⁴ + x⁵) dx = 1/4 − 2/5 + 1/6 = 1/60.'),
      r('x(1 − x)⁹', (x) => x * (1 - x) ** 9, 0, 1, '0', '1', 110, '∫₀¹ (1 − x)x⁹ dx = 1/10 − 1/11 = 1/110.'),
    ],
  ],
  4: [
    [
      r('sin² x', (x) => sin(x) ** 2, -PI / 2, PI / 2, '−π/2', 'π/2', 4, 'sin² x is even, so I = 2∫₀^(π/2) sin² x dx = 2 · π/4 = π/2.'),
      r('sin² x', (x) => sin(x) ** 2, 0, PI, '0', 'π', 4, 'sin²(π − x) = sin² x, so I = 2∫₀^(π/2) sin² x dx = π/2.'),
      r('sin² x', (x) => sin(x) ** 2, 0, 2 * PI, '0', '2π', 8, 'Over a whole turn, I = 4∫₀^(π/2) sin² x dx = 4 · π/4 = π.'),
    ],
    [
      r('cos⁵ x', (x) => cos(x) ** 5, 0, 2 * PI, '0', '2π', 0, 'cos⁵(π − x) = −cos⁵ x, so ∫₀^π cos⁵ x dx = 0, and the same over [π, 2π]: I = 0.'),
      r('sin⁷ x', (x) => sin(x) ** 7, -PI / 2, PI / 2, '−π/2', 'π/2', 0, 'sin⁷ x is odd, so over symmetric limits I = 0.'),
      r('cos² x', (x) => cos(x) ** 2, 0, 2 * PI, '0', '2π', 8, 'I = 4∫₀^(π/2) cos² x dx = 4 · π/4 = π.'),
      r('cos² x', (x) => cos(x) ** 2, 0, PI, '0', 'π', 4, 'cos²(π − x) = cos² x, so I = 2∫₀^(π/2) cos² x dx = π/2.'),
    ],
    [
      r('sin⁴ x', (x) => sin(x) ** 4, 0, 2 * PI, '0', '2π', 6, 'I = 4∫₀^(π/2) sin⁴ x dx = 4 · 3π/16 = 3π/4.'),
      r('cos² 3x', (x) => cos(3 * x) ** 2, 0, PI, '0', 'π', 4, 'cos² 3x = (1 + cos 6x)/2, and cos 6x integrates to 0 over [0, π], so I = π/2.'),
      r('sin² x', (x) => sin(x) ** 2, -PI, PI, '−π', 'π', 8, 'sin² x is even, so I = 2∫₀^π sin² x dx = 2 · π/2 = π.'),
    ],
  ],
  5: [
    [
      r('log(1 + tan x)', (x) => log(1 + tan(x)), 0, PI / 4, '0', 'π/4', 1, 'With π/4 − x: 1 + tan(π/4 − x) = 2/(1 + tan x), so I = ∫ [log 2 − log(1 + tan x)] dx = (π/4) log 2 − I. So 2I = (π/4) log 2 and I = (π/8) log 2.'),
      r('log tan x', (x) => log(tan(x)), 0, PI / 2, '0', 'π/2', 0, 'Replace x by π/2 − x: log tan x becomes log cot x = −log tan x, so I = −I and I = 0.'),
    ],
    [
      r('2 log sin x − log sin 2x', (x) => 2 * log(sin(x)) - log(sin(2 * x)), 0, PI / 2, '0', 'π/2', -4, 'log sin 2x = log 2 + log sin x + log cos x, so the integrand is log sin x − log cos x − log 2. On [0, π/2], ∫ log sin x = ∫ log cos x (replace x by π/2 − x), so I = −(π/2) log 2.'),
      r('log sin x', (x) => log(sin(x)), 0, PI / 2, '0', 'π/2', -4, 'Let I = ∫₀^(π/2) log sin x dx = ∫₀^(π/2) log cos x dx. Then 2I = ∫ log(sin 2x/2) dx = ∫₀^(π/2) log sin 2x dx − (π/2) log 2 = I − (π/2) log 2, so I = −(π/2) log 2.'),
      r('log sin 2x', (x) => log(sin(2 * x)), 0, PI / 2, '0', 'π/2', -4, 'With t = 2x, I = ½∫₀^π log sin t dt = ½ · 2∫₀^(π/2) log sin t dt = −(π/2) log 2.'),
    ],
    [
      r('log(1 + cos x)', (x) => log(2) + 2 * log(abs(cos(x / 2))), 0, PI, '0', 'π', -8, '1 + cos x = 2 cos²(x/2), so I = π log 2 + 2∫₀^π log cos(x/2) dx = π log 2 + 4∫₀^(π/2) log cos t dt = π log 2 − 2π log 2 = −π log 2.'),
      r('log sin x', (x) => log(sin(x)), 0, PI, '0', 'π', -8, 'log sin(π − x) = log sin x, so I = 2∫₀^(π/2) log sin x dx = −π log 2.'),
    ],
  ],
};
```

(`log(1 + cos x)` is computed as `log 2 + 2 log|cos(x/2)|`, the same function, because `1 + cos x` rounds to 0 near π in floating point.)

### 4.4 Rounds

```ts
const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
export const buildRounds = (level: 1 | 2 | 3 | 4 | 5, random: () => number): Round[] => POOLS[level].map((pool, k) => ({ ...pick(pool, random), assist: aid(k) }));
```

The `start` of each level is in `RANGE` and is never an answer of that level (checked: 30, 8, 2, 12, 4).

### 4.5 Words

- `intel(level, r)`: `` `The rune is ∫ ${r.name} dx from ${r.aText} to ${r.bText}. Channel exactly that much mana, ${UNIT_WORDS[level]}.` `` with `UNIT_WORDS` = `{1: 'counted in halves', 2: 'in units of π/8', 3: 'as 1/m of a crystal: set m', 4: 'in units of π/8', 5: 'in units of (π/8) log 2'}`.
- Hint line: `` `${intel(level, r)} ${r.assist === 0 ? 'Round 1: the mirror shows the rune’s hidden shape.' : r.assist === 1 ? 'The mirror is dark: a mirror spell costs a charge.' : 'Boss round: no mirror.'}` ``
- `missText(level, r, k)`: low: `` `With ${manaText(UNIT[level], k)} of mana the spell ran dry before the rune was full: it fizzled and the Stone Warden struck back.` ``; high: `` `With ${manaText(UNIT[level], k)} of mana the rune overflowed and the spell backfired at the caster.` `` Never mention `r.ans`.
- `mirrorText(level)` (charge): level 1 `Mirror spell: the rune shows where to split it.`; others `Mirror spell: the rune and its mirror image appear together for a moment.`
- Win: `` `Barrier broken! ${r.work}` ``

## 5. Screen and art

Canvas 640 × 340 (`mountDialLevel`).

```ts
const RUNE = { x0: 168, x1: 470, top: 70, bottom: 250 };   // the rune panel on the barrier
const RING = { cx: 84, cy: 128, R: 44 };                     // the mana ring around the staff's mirror
const LYRA = { x: 84, y: 300 };                              // feet
const WARDEN = { x: 560, y: 262 };
```

- **Backdrop**: a ruined tower interior: `backdrop(g)`, dark stone blocks, two torches with flickering flames (`PAL.orange` and `PAL.yellow` triangles), and a few floating dust motes.
- **The barrier**: a translucent violet slab from x 150 to 490 and y 50 to 270, edged in `PAL.pink`.
- **The rune**: the region between f and the axis over [a, b], mapped onto `RUNE` **with no axis numbers and no grid**: x → `RUNE.x0 + ((x − a)/(b − a))·(RUNE.x1 − RUNE.x0)`; y is scaled so the largest |f| on 240 samples (skip the first and last sample, where logs blow up) fills 80% of the half-height around a zero line in the panel's middle. Draw the zero line faintly. Fill positive parts with `rgba(77,225,255,0.18)` and a glowing `PAL.cyan` outline, and negative parts with `rgba(255,77,141,0.18)` and a `PAL.pink` outline (shadow mana). Under the panel, in `PAL.white` size 12: `∫ ${name} dx, from ${aText} to ${bText}`.
- **The mirror spell (helper)**: live in round 1; in round 2 only for 1.5 s after a mirror spell (charge); never in round 3. What it shows by level:
  - Level 1: a vertical dashed `PAL.yellow` line at each split point and the outline of each triangle piece.
  - Level 2: the outline of the full block [a, b] × [0, 1] in `PAL.yellow`, and the rune's partner, the region **above** the curve inside the block, tinted gold. The rune and its partner fill the block exactly.
  - Levels 3 and 5: the mirrored curve f(a + b − x) as a dashed `PAL.yellow` line.
  - Level 4: the rune folded at the middle of [a, b]: the right half reflected onto the left as a dashed `PAL.yellow` outline, or, if the halves are opposite (odd), reflected through the zero line.
- **The mana ring** at `RING`: a circle with 24 rune marks. The handle is a glowing gem on the ring; its angle runs from −π/2 (top, the range's `min`) clockwise all the way round to just short of the top (`max`). Drag maps the pointer's angle back to a value. The current mana is written inside the ring with `manaText` (size 12, `PAL.yellow`).
- **Lyra** at `LYRA`, the staff's mirror at the ring's centre.
- **The Stone Warden** at `WARDEN`, behind the barrier's right edge, partly visible through it.

### 5.1 Cast (resolve)

`delay: 1.3`.
- 0 to 1.1 s: a stream of `PAL.cyan` particles flows from the staff's mirror into the rune, and the rune fills with light from left to right (the fill is a clip rectangle growing over the rune).
- At 1.3 s:
  - **Win**: the rune flares white, cracks spread over the barrier (0.1 s), it shatters into shards (`A.burst(320, 160, PAL.pink, 40, 240)`), and the Warden crumbles into rubble. Lyra twirls the staff. Float `BARRIER BROKEN!`.
  - **low**: the fill stops at **70% of the rune whatever the value** (a fixed amount, so the picture never shows how far off the guess was), grey smoke puffs where it stops, the Warden slams the ground, and a shockwave ring runs to Lyra, who staggers back. Float `FIZZLE!`.
  - **high**: the rune fills completely and overflows: sparks spray out of its outline, then a backfire burst at Lyra (`A.burst(LYRA.x, LYRA.y − 60, PAL.orange, 26, 200)`), sooty face and smoke wisps. Float `BACKFIRE!`.
- All motion finishes by 2.3 s. `hit` returns a fixed point, `[320, 160]`, never anything that depends on the answer.

## 6. Controls and mount

```ts
function level(n: 1 | 2 | 3 | 4 | 5, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const u = UNIT[n];
  const R = RANGE[n];
  return {
    hero: { name: 'Lyra', role: '…', ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials: [{ key: 'k', aria: n === 3 ? 'Mana as 1 over m: set m' : 'Mana to channel into the rune', label: n === 3 ? 'Mana 1/m' : 'Mana', unit: '', step: 1, min: R.min, max: R.max, start: R.start, text: (v) => manaText(u, v) }],
    handles: [ringHandle(R.min, R.max)],
    test: { button: '🪞 Mirror spell', aria: 'Mirror spell: show the rune with its mirror image for a moment', read: () => { mirrorPending = true; return mirrorText(n); } },
    fire: { button: '✨ Cast', aria: 'Cast the spell' },
    judge: (r, v) => judge(r, v.k),
    miss: (r, v) => missText(n, r, v.k),
    win: (r) => `Barrier broken! ${r.work}`,
    hint: (r) => hintText(n, r),
    hit: () => [320, 160],
    delay: 1.3,
    draw: (s) => drawScene(n, s),
  };
}
```

- Mirror-spell animation: closure `mirrorPending` / `mirrorAt` as in brief 03.
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(5, ctx.level)) as 1 | 2 | 3 | 4 | 5; return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA); } })`, `ARIA = 'A mirror mage with a staff facing a rune barrier, with a mana ring to set the exact mana the rune holds.'`

## 7. game.json

Copy `docs/curriculum/gap-designs/json/mirror-mage.json` exactly.

## 8. Tests

### 8.1 `logic.test.ts`

1. **Values**: for every row of every pool, the integral of f from a to b equals `manaValue(UNIT[level], r.ans)`:
   - Rows without logs: Simpson's rule with 20000 steps, tolerance 1e-7.
   - Rows with logs (level 5; `log(1 + tan x)` is not singular and can use plain Simpson): use the end-flattening substitution below with 200000 steps, tolerance 2e-4.
     ```ts
     const simpson = (f: (x: number) => number, a: number, b: number, n: number) => { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * h); return (s * h) / 3; };
     const flat = (f: (x: number) => number, a: number, b: number, n: number) => simpson((t) => { const s = 3 * t * t - 2 * t ** 3, ds = 6 * t - 6 * t * t; return ds === 0 ? 0 : f(a + (b - a) * s) * (b - a) * ds; }, 0, 1, n);
     ```
   - `1/(1 + tan³ x)` on [0, π/2]: integrate to `π/2 − 1e-12`.
2. **One winner**: for every row, scanning k over the level's `RANGE`, only `ans` passes `judge`; `ans` lies in the range; `start` is not `ans`.
3. **Faults compare values**: level 3, m = ans + 1 is `low` (less mana) and m = ans − 1 is `high`; other levels, k = ans − 1 is `low` and k = ans + 1 is `high`.
4. **Levels**: 80 seeds, `assist` is `[0, 1, 2]`.
5. **Words**: `half`, `pi8`, `recip`, `pilog` give the strings in 4.2; `missText` contains `fizzled` (low) or `backfired` (high) and never `manaText(u, r.ans)` (with a word boundary) unless that string equals the player's `manaText`; the win text contains `Barrier broken!`.

### 8.2 `tests/mirror-mage-ui.test.ts`

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch07-integrals/mirror-mage/index';
import { RANGE, buildRounds, type Round } from '../src/games/mathematics/class-12/ch07-integrals/mirror-mage/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'mirror-mage', 5);
shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4, 5],
  build: (level, seed) => buildRounds(level as 1 | 2 | 3 | 4 | 5, createRng(seed)),
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k, level) => h.setSlider(g[k].ans + 1 <= RANGE[level as 1].max ? g[k].ans + 1 : g[k].ans - 1),
  commit: () => h.click('Cast the spell'),
});
```

Then `describe('Mirror Mage', …)`:
1. The slider range and start follow `RANGE` per level.
2. A miss says `fizzled` or `backfired`.
3. The mirror spell costs a charge (`/Mirror spell/`, then `/No charges left/`).
4. A win says `Barrier broken!`.
5. Record the strings drawn with `fillText` (as `tests/air-time-ui.test.ts` does) and check that in round 3 nothing drawn contains the answer's `manaText` before the cast.

## 9. Traps to avoid

- Never draw axis numbers or a grid on the rune: the area must not be measurable.
- The mirror shapes are helpers (round 1 live, round 2 on a charge only).
- On a fizzle, the fill stops at a fixed 70%, never at a fraction that depends on the guess.
- `hit` is a fixed point.
- Sample the rune's curve away from the end points (log rows are infinite there).
- Do not use a pronoun for Lyra in any text.
