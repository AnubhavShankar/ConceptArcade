# 01 · Fog Rally (Maths Ch 6, §6.3 Increasing and decreasing functions)

Read `README.md` in this folder first. Everything below is required unless marked "optional".

## 1. Identity

| Field | Value |
|---|---|
| Game id | `fog-rally` |
| Folder | `src/games/mathematics/class-12/ch06-application-of-derivatives/fog-rally/` |
| Files | `game.json`, `logic.ts`, `logic.test.ts`, `index.ts` (split drawing into `art.ts` if `index.ts` passes 400 lines) |
| UI test | `tests/fog-rally-ui.test.ts` |
| Book coverage | §6.3; Ex 6.2 Q1 to Q6, Q8, Q14, Q18; Examples 7 to 13 |
| Inspiration (code comment only) | Hill Climb Racing (a truck on a hill road, gas and brake), Trials (one wrong input and the bike flips), Guitar Hero note charts (the gear strip is a chart you write before the song plays) |
| Core verb | **Tap a gear strip** under a fogged road (each stretch GAS or BRAKE), then watch the truck drive it. Level 5 uses one dial. |

## 2. What the student learns

- f increases where f′(x) > 0 and decreases where f′(x) < 0 (§6.3).
- The roots of f′ split the line into intervals; the sign of f′ is constant on each one (sign chart).
- A root where f′ does not change sign (a squared factor) is a flat spot, not a turn.
- Trigonometric functions on [0, 2π].
- With a parameter, f′ must keep its sign on the whole interval; the boundary value of the parameter comes from the end point where f′ is weakest (Ex 6.2 Q14).

## 3. Story and hero

**Dusty**, a rally driver in a monster truck, must drive a mountain stage through fog so thick the road is invisible. The organisers radio the road's height as a formula f(x). Dusty plans the gearbox for every stretch before the start:

- **GAS on a climb**: the truck powers up. **BRAKE on a drop**: it rolls down under control.
- **BRAKE on a climb**: the truck loses speed, stalls and rolls back. **GAS on a drop**: it runs away, bounces at the bottom and flips.

The finish line has a **marshal** (an NPC) who waves the flag.

Hero banner (pass to `createArcade` as `{ name, role, story, objective }`):

- `name`: `Dusty`
- `role`: `a rally driver in a monster truck who has to drive a mountain stage through thick fog`
- Stories and objectives per level:

| Level | story | objective |
|---|---|---|
| 1 | `The fog is so thick that Dusty cannot see the road. The organisers radio the road as a formula f(x), its height at x. Where f′(x) > 0 the road climbs and needs GAS; where f′(x) < 0 it falls and needs BRAKE. Braking on a climb stalls the truck; gas on a drop makes it run away and flip.` | `Set GAS or BRAKE for every stretch of the stage so Dusty reaches the finish flag, in three rounds.` |
| 2 | `This stage follows a cubic road. Its slope f′ has two roots, so the road turns twice and splits into three stretches. A sign chart of f′ tells Dusty which stretches climb and which fall.` | `Set the gearbox for all three stretches so Dusty reaches the finish flag, in three rounds.` |
| 3 | `Some roads flatten for a moment and then carry on the same way. Where f′ = 0 but its sign does not change, the road does not turn, so the gear must not change there. Other roads turn three times.` | `Change gear only where the road really turns, and reach the finish flag in three rounds.` |
| 4 | `A mountain pass whose height is a trigonometric function of x, from 0 to 2π. Each stretch of the gearbox is π/4 long, and the road can turn at any multiple of π/4.` | `Set GAS or BRAKE for all eight stretches of the pass, in three rounds.` |
| 5 | `Before the stage the roadworks crew shapes the road with one setting a. Dusty drives the whole stage in one gear, so the slope must keep its sign from the start gate to the finish. The organisers want the road to turn exactly at the start gate, not earlier and not inside the stage.` | `Set a so the road turns exactly at the start gate and runs the right way all the way to the finish, in three rounds.` |

## 4. Rules (`logic.ts`)

### 4.1 Imports and helpers

```ts
import { aid } from '@core/dialgame';
import { num, piText, poly } from '@core/mathkit';
import { shuffle } from '@core/quiz';

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
/** "(x − 3)", "(x + 2)" or "x" for the factor x − c. */
export const lin = (c: number) => (c === 0 ? 'x' : c > 0 ? `(x − ${c})` : `(x + ${-c})`);
/** A whole number with a true minus sign; −0 is written 0. */
const n = (x: number) => num(x + 0);
```

### 4.2 Types and constants

```ts
export type Gear = 'gas' | 'brake' | null;
export type Kind = 'quad' | 'cubic' | 'cube' | 'flat' | 'square' | 'trig';
export interface StripRound {
  kind: Kind;
  /** The road as the organisers radio it, e.g. "f(x) = 2x³ − 3x² − 36x + 7". */
  text: string;
  /** f′ factored, e.g. "f′(x) = 6(x + 2)(x − 3)". */
  fpText: string;
  f: (x: number) => number;
  fp: (x: number) => number;
  lo: number;          // −4, or 0 for trig
  hi: number;          // 4, or 2π for trig
  width: number;       // 1, or π/4 for trig
  cells: 8;
  trig: boolean;
  /** Roots of f′ where its sign changes, ascending (for trig: in units of π/4, e.g. 1 means π/4). */
  turns: number[];
  /** Roots of f′ where its sign does not change (level 3 only). Same units as turns. */
  flats: number[];
  /** The winning gear of each of the 8 cells. */
  want: ('gas' | 'brake')[];
  assist: 0 | 1 | 2;
}
export const CELLS = 8;
/** Seconds the truck takes to drive the whole stage when nothing goes wrong. */
export const DRIVE = 1.6;
```

`want[i]` is computed, never typed in: `want[i] = r.fp(mid(i)) > 0 ? 'gas' : 'brake'`, where `mid(i) = r.lo + (i + 0.5) * r.width`. Every pool entry below has been checked: f′ is never 0 at a cell midpoint, and all roots sit on cell edges.

### 4.3 The pools (copy exactly)

Cells cover x from −4 to 4 (levels 1 to 3) or 0 to 2π (level 4).

**Level 1, quadratics.** Entry `[a, c, e]` means f(x) = a·x² − 2ac·x + e, f′(x) = 2a(x − c).

```ts
const L1_UP: [number, number, number][] = [[1, 2, 3], [2, 3, 5], [1, -1, -4], [3, 1, 2], [2, -2, 1], [1, -3, 0]];
const L1_DOWN: [number, number, number][] = [[-1, 1, 4], [-2, 2, -3], [-1, -2, 6], [-3, -1, 0], [-2, 0, 5], [-1, 3, -2]];
const L1_BOSS: [number, number, number][] = [[-2, 3, 5], [3, -2, 1], [2, -1, -7], [-3, 2, 4], [-1, -3, 8], [2, 2, -3]];
```

- `text`: rounds 1 and 2: `` `f(x) = ${poly([[a, 2], [-2 * a * c, 1], [e, 0]], 'x')}` `` (e.g. `f(x) = 2x² − 12x + 5`). Boss: the same terms in **reverse** order, `poly([[e, 0], [-2 * a * c, 1], [a, 2]], 'x')` (e.g. `f(x) = 5 + 12x − 2x²`), so the student must not read the leading coefficient off the first term.
- `fpText`: `` `f′(x) = ${n(2 * a)}${lin(c)}` `` (e.g. `f′(x) = 4(x − 3)`, `f′(x) = −4x`).
- `turns = [c]`, `flats = []`.

**Level 2, cubics.** Rounds 1 and 2: entry `[s, p, q, e]` means f(x) = s(2x³ − 3(p + q)x² + 6pq·x) + e, f′(x) = 6s(x − p)(x − q). Boss: entry `[s, p, q, e]` (p + q is even) means f(x) = s(x³ − 1.5(p + q)x² + 3pq·x) + e, f′(x) = 3s(x − p)(x − q).

```ts
const L2_UP: [number, number, number, number][] = [[1, -2, 3, 7], [1, -1, 2, 0], [1, 0, 3, 1], [1, -3, 1, 4], [1, 1, 3, -2]];
const L2_DOWN: [number, number, number, number][] = [[-1, -1, 3, 5], [-1, -2, 1, 0], [-1, 0, 2, -3], [-1, -3, 0, 2], [-1, 1, 2, 4]];
const L2_BOSS: [number, number, number, number][] = [[1, -2, 2, 0], [-1, -1, 3, 0], [1, -3, 1, 5], [1, 1, 3, 0], [-1, -3, 3, 0], [1, 0, 2, 4]];
```

- `text`: `` `f(x) = ${poly([[c3, 3], [c2, 2], [c1, 1], [e, 0]], 'x')}` `` with the coefficients above (`[1, -2, 3, 7]` gives `f(x) = 2x³ − 3x² − 36x + 7`, which is Ex 6.2 Q5).
- `fpText`: factors in ascending root order with `x` first when a root is 0: `[1, -2, 3, 7]` gives `f′(x) = 6(x + 2)(x − 3)`; `[-1, 0, 2, -3]` gives `f′(x) = −6x(x − 2)`; boss `[1, -2, 2, 0]` gives `f′(x) = 3(x + 2)(x − 2)`.
- `turns = [p, q]`, `flats = []`.

**Level 3, flat spots.** Three kinds, one per round, in this order: `cube`, `flat`, `square`.

```ts
/** cube: f(x) = s(x − a)³ + e, written expanded; f′(x) = 3s(x − a)². */
const L3_CUBE: [number, number, number][] = [[1, 1, -99], [1, -2, 0], [-1, 2, 0], [1, 0, 5], [-1, -1, 3], [1, 2, 1]];
/** flat: f(x) = s(x − a)³(x − b), written factored; f′(x) = 4s(x − a)²(x − r) with r = (a + 3b)/4. */
const L3_FLAT: [number, number, number][] = [[1, -1, 3], [1, 1, -3], [-1, 3, -1], [1, -3, 1], [-1, 2, -2], [-1, -2, 2], [1, 0, 4], [-1, 0, -4]];
/** square: f(x) = [(x − s)(x − s − 2k)]², written factored; f′(x) = 4(x − s)(x − s − k)(x − s − 2k). */
const L3_SQUARE: [number, number][] = [[0, 1], [-1, 1], [-2, 1], [-3, 3], [-2, 2], [1, 1], [-1, 2]];
```

- cube `text`: expanded, `poly([[s, 3], [-3 * s * a, 2], [3 * s * a * a, 1], [-s * a ** 3 + e, 0]], 'x')`. `[1, 1, -99]` gives `f(x) = x³ − 3x² + 3x − 100` (Ex 6.2 Q18). `fpText`: `` `f′(x) = ${s < 0 ? '−' : ''}3${lin(a)}²` `` (`f′(x) = 3(x − 1)²`, `f′(x) = 3x²`). `turns = []`, `flats = [a]`.
- flat `text`: `` `f(x) = ${s < 0 ? '−' : ''}${lin(a)}³${lin(b)}` `` (`f(x) = (x + 1)³(x − 3)`, `f(x) = x³(x − 4)`). `fpText`, with `sign = s < 0 ? '−' : ''`: if `r === 0`, `` `f′(x) = ${sign}4x${lin(a)}²` `` (`[-1, 3, -1]` gives `f′(x) = −4x(x − 3)²`); otherwise `` `f′(x) = ${sign}4${lin(a)}²${lin(r)}` `` (`[1, -1, 3]` gives `f′(x) = 4(x + 1)²(x − 2)`; `[1, 0, 4]` gives `f′(x) = 4x²(x − 3)`). `turns = [r]`, `flats = [a]`.
- square `text`: `` `f(x) = [${lin(s)}${lin(s + 2 * k)}]²` `` with `x` first if a root is 0 (`[0, 1]` gives `f(x) = [x(x − 2)]²`, Ex 6.2 Q8). `fpText`: `` `f′(x) = 4${factors}` `` with the three factors `lin(s)`, `lin(s + k)`, `lin(s + 2k)`, `x` first if any is 0 (`[0, 1]` gives `f′(x) = 4x(x − 1)(x − 2)`). `turns = [s, s + k, s + 2k]`, `flats = []`.

**Level 4, trigonometric roads on [0, 2π].** `lo = 0`, `hi = 2π`, `width = π/4`, `trig = true`. Turns are stored in units of π/4.

```ts
const L4_POOL = {
  easy: [
    { text: 'f(x) = sin x', fpText: 'f′(x) = cos x', f: Math.sin, fp: Math.cos, turns: [2, 6] },
    { text: 'f(x) = cos x', fpText: 'f′(x) = −sin x', f: Math.cos, fp: (x: number) => -Math.sin(x), turns: [4] },
  ],
  mid: [
    { text: 'f(x) = sin x + cos x', fpText: 'f′(x) = cos x − sin x', f: (x: number) => Math.sin(x) + Math.cos(x), fp: (x: number) => Math.cos(x) - Math.sin(x), turns: [1, 5] },
    { text: 'f(x) = sin x − cos x', fpText: 'f′(x) = cos x + sin x', f: (x: number) => Math.sin(x) - Math.cos(x), fp: (x: number) => Math.cos(x) + Math.sin(x), turns: [3, 7] },
  ],
  boss: [
    { text: 'f(x) = sin 2x', fpText: 'f′(x) = 2 cos 2x', f: (x: number) => Math.sin(2 * x), fp: (x: number) => 2 * Math.cos(2 * x), turns: [1, 3, 5, 7] },
    { text: 'f(x) = cos 2x', fpText: 'f′(x) = −2 sin 2x', f: (x: number) => Math.cos(2 * x), fp: (x: number) => -2 * Math.sin(2 * x), turns: [2, 4, 6] },
  ],
};
```

(cos x has f′ = 0 at 0 and 2π too; those are the ends of the stage, not turns, so they are not listed.)

**Expected winning strips** (G = gas, B = brake, cells left to right). The tests must reproduce these exactly:

| Round data | want |
|---|---|
| L1 `[2, 3, 5]` `2x² − 12x + 5` | BBBBBBBG |
| L1 `[-1, 1, 4]` `−x² + 2x + 4` | GGGGGBBB |
| L2 `[1, -2, 3, 7]` `2x³ − 3x² − 36x + 7` (Ex 6.2 Q5) | GGBBBBBG |
| L2 `[-1, -2, 1, 0]` `−2x³ − 3x² + 12x` | BBGGGBBB |
| L2 boss `[1, -2, 2, 0]` `x³ − 12x` | GGBBBBGG |
| L3 cube `[1, 1, -99]` `x³ − 3x² + 3x − 100` (Ex 6.2 Q18) | GGGGGGGG |
| L3 flat `[1, -1, 3]` `(x + 1)³(x − 3)` | BBBBBBGG |
| L3 square `[0, 1]` `[x(x − 2)]²` (Ex 6.2 Q8) | BBBBGBGG |
| L4 `sin x + cos x` (Example 13) | GBBBBGGG |
| L4 `cos x` (Example 9) | BBBBGGGG |
| L4 `sin 2x` | GBBGGBBG |

### 4.4 Building the rounds

```ts
export function buildStrip(level: 1 | 2 | 3 | 4, random: () => number): StripRound[]
```

- Level 1: `[quad(pick(L1_UP)), quad(pick(L1_DOWN)), quadBoss(pick(L1_BOSS))]`.
- Level 2: `[cubic6(pick(L2_UP)), cubic6(pick(L2_DOWN)), cubic3(pick(L2_BOSS))]`.
- Level 3: `[cube(pick(L3_CUBE)), flat(pick(L3_FLAT)), square(pick(L3_SQUARE))]`.
- Level 4: `[trig(pick(easy)), trig(pick(mid)), trig(pick(boss))]`.
- Then set `assist: aid(i)` on round i. Call `pick` in that order (round 1 first) so the UI test can rebuild the same rounds from the same seed.

### 4.5 Judging and run planning

```ts
export const mid = (r: StripRound, i: number) => r.lo + (i + 0.5) * r.width;
export const complete = (gears: Gear[]) => gears.length === CELLS && gears.every((g) => g !== null);
export const judgeStrip = (r: StripRound, gears: Gear[]) => complete(gears) && gears.every((g, i) => g === r.want[i]);
/** The first cell whose gear is wrong, and what happens there. Call only with a complete strip. */
export function firstFault(r: StripRound, gears: Gear[]): { cell: number; kind: 'stall' | 'flip' } | null {
  for (let i = 0; i < CELLS; i++) if (gears[i] !== r.want[i]) return { cell: i, kind: r.want[i] === 'gas' ? 'stall' : 'flip' };
  return null;
}
/** Seconds into the run when the verdict lands: the crash, or the finish. Always below 2.4. */
export const impactTime = (f: ReturnType<typeof firstFault>) => (f ? ((f.cell + 0.5) * DRIVE) / CELLS + 0.25 : DRIVE);
```

`stall` means the player chose BRAKE where the road climbs; `flip` means GAS where it falls.

### 4.6 Words (copy the templates; `A`, `B` are cell edges)

```ts
/** A cell edge as the student reads it: "−3", "0", "π/4", "2π". */
export const edgeText = (r: StripRound, i: number) => (r.trig ? piText(3 * i) : n(r.lo + i));
```

`edgeText(r, i)` is the left edge of cell i, and `edgeText(r, i + 1)` its right edge. For a turn value t stored in `turns`/`flats`: polynomials write `n(t)`, trig writes `piText(3 * t)`.

- `stripIntel(r)`: `` `Road plan: ${r.text}, for x from ${edgeText(r, 0)} to ${edgeText(r, 8)}. Set GAS where the road climbs and BRAKE where it falls.` ``
- `stripMiss(r, gears)` (complete strip, wrong): with `f = firstFault(...)`, `A = edgeText(r, f.cell)`, `B = edgeText(r, f.cell + 1)`:
  - stall: `` `Between x = ${A} and x = ${B} Dusty was braking while the road climbed: the truck lost speed, stalled and rolled back.` ``
  - flip: `` `Between x = ${A} and x = ${B} Dusty was on the gas while the road dropped away: the truck ran too fast, hit the dip and flipped.` ``
- `scoutText(r, i)`: `` `Scout drone over x = ${A} to ${B}: the road ${up ? 'climbs' : 'falls'} there (f′ = ${num(r.fp(mid(r, i)))} at the middle of the stretch).` `` where `up = r.fp(mid(r, i)) > 0`.
- `stripExplain(r)` (after a win), three sentences joined by spaces:
  1. `` `${r.fpText}.` ``
  2. Roots: if `flats` is empty: `` `f′ = 0 at x = ${list(turns)}.` ``; if `flats` is not empty and `turns` is empty: `` `f′ = 0 only at x = ${list(flats)}, and the squared factor keeps its sign there, so the road just flattens.` ``; if both: `` `f′ = 0 at x = ${list(flats)} and x = ${list(turns)}; the squared factor does not change sign at ${list(flats)}, so the only turn is at x = ${list(turns)}.` ``. `list` joins with `, ` using the turn format above.
  3. Intervals: split the domain at `turns` (polynomials: from `−∞` to `∞`; trig: from `0` to `2π`); in each piece take the sign of f′ at its middle (for an infinite piece, at the finite end ∓ 1). Write `` `So f increases on ${inc} and decreases on ${dec}.` `` where each list is its pieces joined with ` and `, each piece written `(L, R)` with `−∞`, `∞`, `n(t)` or `piText(3t)`. If `dec` is empty write `` `So f increases on ${whole} and never decreases.` ``; if `inc` is empty write `` `So f decreases on ${whole} and never increases.` ``, where `whole` is `(−∞, ∞)` for polynomials and `(0, 2π)` for trig.

  Example, L2 `[1, -2, 3, 7]`: `f′(x) = 6(x + 2)(x − 3). f′ = 0 at x = −2, 3. So f increases on (−∞, −2) and (3, ∞) and decreases on (−2, 3).`

### 4.7 Level 5: the road builder

```ts
export type BuildKind = 'inc' | 'dec' | 'cub';
export interface BuildRound {
  kind: BuildKind;
  m: number;            // start gate
  n: number;            // finish = m + 2
  ans: number;          // the winning a
  min: number; max: number; start: number;
  gear: 'gas' | 'brake';
  assist: 0 | 1 | 2;
}
export function buildBuilder(random: () => number): BuildRound[]
```

| Round | kind | road f(x) | f′(x) | m picked from | ans | dial min..max | start | gear |
|---|---|---|---|---|---|---|---|---|
| 1 | `inc` | x² + ax + 1 | 2x + a | −2, −1, 0, 1, 2 | −2m | −8..8 | 0, or 4 if ans = 0 | gas |
| 2 | `dec` | −x² + ax + 1 | −2x + a | −2, −1, 0, 1, 2 | 2m | −8..8 | 0, or 4 if ans = 0 | brake |
| 3 (boss) | `cub` | x³ + ax | 3x² + a | 1, 2 | −3m² | −15..3 | 0 | gas |

Write `ans` as `-2 * m + 0` (and `2 * m + 0`) so m = 0 gives 0, not −0. `n = m + 2` always. Pick m with `pick([...], random)` in round order.

```ts
export const roadF = (r: BuildRound, a: number) => (x: number) => (r.kind === 'inc' ? x * x + a * x + 1 : r.kind === 'dec' ? -x * x + a * x + 1 : x ** 3 + a * x);
export const roadFp = (r: BuildRound, a: number) => (x: number) => (r.kind === 'inc' ? 2 * x + a : r.kind === 'dec' ? -2 * x + a : 3 * x * x + a);
/** Where the road turns just before or inside the stage: the dip floor (inc, cub) or the hump top (dec); null if the cubic never turns (a ≥ 0). */
export const turnAt = (r: BuildRound, a: number) => (r.kind === 'inc' ? -a / 2 : r.kind === 'dec' ? a / 2 : a < 0 ? Math.sqrt(-a / 3) : null);
export const judgeBuild = (r: BuildRound, a: number) => a === r.ans;
/** 'late': the turn is inside the stage (crash); 'early': before the gate or no turn (marshal voids it). */
export const buildFault = (r: BuildRound, a: number): 'late' | 'early' | null => { const t = turnAt(r, a); return a === r.ans ? null : t !== null && t > r.m ? 'late' : 'early'; };
```

The scan over every whole a in min..max gives exactly one winner per round; this was checked for every m in the table.

Words (`A = num(a)`):

- `buildIntel(r)`: inc: `` `Roadworks: f(x) = x² + ax + 1. The stage runs from the start gate at x = ${n(m)} to the finish at x = ${n(m + 2)}, all in GAS, so the road must climb the whole way. Set a so the dip before the stage ends exactly at the gate.` ``; dec: same with `f(x) = −x² + ax + 1`, `all in BRAKE, so the road must fall the whole way. Set a so the hump before the stage tops out exactly at the gate.`; cub: same as inc with `f(x) = x³ + ax`.
- `buildMiss(r, a)`:
  - late, gear gas: `` `With a = ${A} the road is still falling after the start gate, so its lowest point is inside the stage. Dusty was on the gas, ran down into the dip and flipped.` ``
  - late, gear brake: `` `With a = ${A} the road is still climbing after the start gate, so its highest point is inside the stage. Dusty was braking, stalled on the climb and rolled back.` ``
  - early, gear gas: `` `With a = ${A} the whole stage climbs, but the road ${t === null ? 'never dips at all' : 'stopped dipping before the start gate'}. The marshal wanted the turn exactly at the gate: stage voided.` ``
  - early, gear brake: `` `With a = ${A} the whole stage falls, but the hump topped out before the start gate. The marshal wanted the turn exactly at the gate: stage voided.` ``
- `buildScout(r, a)`: `` `Scout at the start gate x = ${n(r.m)}: with a = ${A} the slope there is f′(${n(r.m)}) = ${num(roadFp(r, a)(r.m))}.` ``
- `buildExplain(r)`:
  - inc: `` `f′(x) = 2x + a grows with x, so on the stage it is weakest at the gate. The road climbs the whole stage when f′(${n(m)}) = 2·(${n(m)}) + a ≥ 0, and it turns exactly at the gate when that is 0: a = ${n(ans)}.` ``
  - dec: `` `f′(x) = −2x + a falls as x grows, so on the stage it is largest at the gate. The road falls the whole stage when f′(${n(m)}) = −2·(${n(m)}) + a ≤ 0, and it turns exactly at the gate when that is 0: a = ${n(ans)}.` ``
  - cub: `` `f′(x) = 3x² + a grows with x for x > 0, so on the stage it is weakest at the gate. The road climbs the whole stage when f′(${m}) = 3·${m}² + a ≥ 0, and it turns exactly at the gate when that is 0: a = ${n(ans)}.` ``

## 5. Screen and art (`index.ts`)

Canvas 640 × 340. Draw order every frame: backdrop → mountains → road → fog → start pad, gates, flag, marshal → truck → effects → gear strip → billboard → verdict.

### 5.1 Layout

```ts
const ROAD = { x0: 60, x1: 580, top: 96, bottom: 236 };
const STRIP = { y: 252, h: 34 };            // levels 1–4 only
const TICKS_Y = 300;                        // edge labels under the strip (level 5: under the road at y 252)
```

- World to screen: `X(x) = ROAD.x0 + ((x − lo) / (hi − lo)) · (ROAD.x1 − ROAD.x0)`. `Y(y) = ROAD.bottom − ((y − y0) / (y1 − y0)) · (ROAD.bottom − ROAD.top)` where y0, y1 are the min and max of f on 161 samples over [lo, hi], padded by 8% of the span (if the span is 0 use y1 = y0 + 1). Level 5 recomputes y0, y1 from the current a each frame (cheap). The road is therefore **not to scale**, which is fine because it is hidden.
- Level 5 world range: lo = −4, hi = 4.

### 5.2 Backdrop and mountains

`backdrop(g)` from `@core/mathkit`, then 30 stars (fixed positions from a tiny seeded table, twinkling with `0.5 + 0.5·sin(t·2 + i)`), then two far mountain silhouettes (filled polygons in `#141a4a` and `#1b2260`) across the top third. Decoration only; they never follow f.

### 5.3 The road

A thick polyline (`lineWidth 10`, `#3a2f55`) from `X(lo)` to `X(hi)` following f, with a dashed centre line (`PAL.yellow`, `lineWidth 2`, dash `[10, 10]`). A flat start pad from x = 20 to `X(lo)` at `Y(f(lo))`. Levels 1 to 4: a checkered finish flag at `X(hi)`. Level 5: a start gate (two posts and a banner reading `START`) at `X(m)` and the finish flag at `X(n)`.

### 5.4 Fog (the heart of "do not leak the answer")

- Fog covers the whole road band (x 50 to 600, y 60 to 248) in **vertical columns 8 px wide**, filled `rgba(150,165,210,0.93)`, with 6 drifting puffs on top (ellipses, alpha 0.25, x moving at 6 px/s and wrapping) for life.
- **Round 1 (`assist 0`)**: after the fog, draw the road as a faint silhouette, `PAL.cyan` at `globalAlpha 0.35`, `lineWidth 3`. This is the round 1 helper. Level 5 round 1 draws the silhouette for the **current** a, so it moves as the dial moves.
- Rounds 2 and 3: no silhouette.
- **During a run**, skip fog columns whose x is less than `truckScreenX + 60` (the headlights). The fog never lifts beyond the truck.
- **After a miss**, the fog returns as the round restarts. Never reveal the road beyond the crash point, because the same round is replayed.
- **After a win**, lift the fog completely in the last 0.6 s of the resolve, so the player sees the road they solved.

### 5.5 Gear strip (levels 1 to 4)

- 8 cells from `ROAD.x0` to `ROAD.x1` (65 px each), y `STRIP.y` to `STRIP.y + STRIP.h`, 3 px gaps.
- Cell fill and label (colour **and** symbol): unset `#2a3270` with `?` in `PAL.dim`; gas `PAL.green` with `⬆ GAS` in `#06301a`; brake `PAL.orange` with `⬇ BRAKE` in `#3a1a00`. Text size 12, bold.
- The last tapped cell gets a 2 px `PAL.yellow` outline.
- Edge labels under the strip at `TICKS_Y`, one per edge, `edgeText(r, i)` in `PAL.dim` size 10.
- Caption at y 320 while playing: `tap a stretch to switch it between GAS and BRAKE` in `PAL.dim` size 11.

### 5.6 Billboard (top left)

A rounded rectangle at (14, 10), 330 × 44, fill `rgba(10,14,50,0.85)`, stroke `PAL.cyan`. Line 1, size 10, `PAL.dim`: `ROAD PLAN` (level 5: `ROADWORKS · stage x = ${m} → ${n}`). Line 2, size 14, `PAL.yellow`: `r.text` (level 5: the formula with the word `a` in it, e.g. `f(x) = x² + ax + 1`). Trig: add `, 0 ≤ x ≤ 2π`.

### 5.7 Dusty's truck (the hero)

`truck(g, x, y, angle, t, o: { gear: 'gas' | 'brake' | null; mood: Mood; wheel: number; flip: number; speedLines: boolean })`, drawn rotated by `angle + o.flip · π` about its centre (x, y), with the wheels touching the road.

- **Wheels**: two monster tyres, radius 11, centres at ±17 px from the centre, fill `#151515`, 10 tread blocks around the rim, a silver hub (radius 4) with 4 spokes rotated by `o.wheel`.
- **Suspension**: a zigzag spring from each axle to the body, length bobbing `1.5·sin(t·12)` while idle.
- **Body**: a rounded chassis 52 × 17 in `PAL.orange`, a white circle on the door with the race number `6`, a black roll cage (three bars) above the cab, a mud flap at the rear.
- **Lights**: a yellow headlight at the front with a light cone (a triangle 70 px long, `rgba(255,230,140,0.22)`); a red brake light at the rear that glows (`glow(g, PAL.red, 12, …)`) when the gear is brake.
- **Exhaust**: a pipe at the rear. Keep a small local list of puffs (grey circles that grow from r 3 to 10 and fade over 0.6 s). Add a puff every 0.5 s while idle, and every 0.08 s while driving on gas.
- **Driver (Dusty)**: head in the cab window: a `PAL.cyan` helmet dome with a white stripe, yellow goggles with a white glint that slides across every 3 s, the face from `face(g, x, y, R, mood, t)` for `happy`, `worried` (with its sweat drop) and `cheer`. For `dizzy` draw X eyes and three small stars orbiting the helmet. A red scarf trails behind the helmet, waving `sin(t·8)`.
- **Moods**: waiting `happy`; driving `happy`; stalled `worried`; flipped `dizzy`; finished `cheer`, with one arm out of the window punching the air (a line and a fist circle moving up and down).
- **Speed lines**: three white lines behind the truck, alpha 0.6, when `o.speedLines`.

### 5.8 The marshal (finish line NPC)

A small figure beside the finish flag: an orange hi-vis vest with a reflective stripe, a cap, a face (`face`), legs, and a flag in one hand. Idle: the flag sways (`sin(t·3)`). On a win: jumps (sine hop) and waves a checkered flag. On level 5 "early": waves a yellow flag and shakes the head. On a crash: hands over the eyes.

### 5.9 The scout drone (charge)

A quadcopter (body 14 × 6, four rotor discs whose blur ellipses spin with `t·40`, a blinking red light) that flies from the top left to above the scouted cell in 0.5 s, shines a downward cone through the fog for 1.3 s, and shows an arrow in the cone: `↗` in `PAL.green` if the road climbs there, `↘` in `PAL.orange` if it falls. It only shows the scouted cell.

### 5.10 The run (resolve)

Store `shot = { gears: [...gears], ok, fault, at: A.clock }` when Drive is pressed. Draw from `shot` only while `A.phase === 'resolve'`. With `rt = A.rt` and `per = DRIVE / 8` (0.2 s):

- **No fault (win)**: world x = `lo + min(1, rt / DRIVE) · (hi − lo)`. Wheels turn with distance. Exhaust on gas cells, brake light on brake cells. At `rt = DRIVE` the truck crosses the flag: `A.float('HONK!', X(hi), Y(f(hi)) − 50, PAL.yellow)` once, the marshal jumps, Dusty cheers, then the fog lifts.
- **Fault at cell c**, with `tf = (c + 0.5) · per`:
  - Before `c · per`: drive normally.
  - **flip**: from `c · per` to `tf`, speed ×1.8 with speed lines (clamp x at `mid(c) + 0.3·width`). From `tf`, the truck leaves the road: lift `−30·sin(min(1, u)·π)` px and rotation `flip = min(1, u)` with `u = (rt − tf) / 0.45`, landing upside down at `mid(c) + 0.4·width`. At landing call `A.burst(x, y, PAL.yellow, 18, 160)` once and draw `FLIPPED!` in `PAL.red` above it. Dusty is `dizzy`; the upturned wheels keep spinning.
  - **stall**: from `c · per` to `tf` decelerate to a stop at `mid(c)`: `x = cellStart + 0.5·width·(1 − (1 − u)²)` with `u = (rt − c·per)/(tf − c·per)`. From `tf` roll back `0.3·width` over 0.4 s (wheels turn backwards), grey tyre smoke puffs, brake light on, `STALLED!` in `PAL.orange`. Dusty is `worried`.
- Pass `impactTime(fault)` as the resolve delay, and `at` = the crash point (or the finish flag).
- The truck's angle follows the road: `atan2(Y(f(x + 0.05)) − Y(f(x − 0.05)), X(x + 0.05) − X(x − 0.05))`.
- Before the run (play phase) the truck idles on the start pad at x = `X(lo) − 30`.
- `verdict(g, ok, 'STAGE CLEAR', 'CRASH')` from mathkit once `rt > impactTime + 0.1` (level 5 early: `'STAGE VOIDED'`).

### 5.11 Level 5 run

Level 5 uses `mountDialLevel` (`@core/dialgame`) with `delay: 1.3`. All three outcomes land at 1.3 s:
- **Win**: the truck drives from gate m to finish n in 1.3 s and crosses the flag.
- **late**: the truck drives into the stage and crashes (flip for gas, stall and roll back for brake) at 1.3 s, a little past the gate.
- **early**: the truck reaches the finish at 1.3 s; the marshal waves the yellow flag and a small ✕ marks the turn on the road before the gate (only for `turnAt(...) !== null`).

Fog and silhouette rules are as in 5.4. There is no gear strip; the billboard shows `GEAR: ⬆ GAS for the whole stage` (or `⬇ BRAKE`) in a second line under the formula.

## 6. Controls

### Levels 1 to 4 (custom mount, like `card-sharp`'s `mountBoard`)

- `createArcade(ctx, hero, { W: 640, H: 340, aria, rounds: 3, charges: [1, 1, 0], onRound })`. In `onRound(k)`: clear the gears to `null` (all 8), clear `shot`, reset the last tapped cell to `-1`, hide feedback, set the hint line.
- Hint line: `` `${stripIntel(r)} ${r.assist === 0 ? 'Round 1: the road shows faintly through the fog.' : r.assist === 1 ? 'Thick fog: a scout drone costs a charge.' : 'Boss round: thick fog, no scout.'}` ``
- **Gear buttons** in `A.controls`: a grid (`display:grid; grid-template-columns: repeat(4, 1fr); gap: 4px; max-width: 420px; margin: 8px auto`) of 8 buttons made with `A.button(text, aria, fn, 'small')`:
  - aria-label (fixed): `` `Gear from x = ${edgeText(r0, i)} to ${edgeText(r0, i + 1)}` `` where r0 is round 1's data (levels 1 to 3 always run −4 to 4; level 4 always 0 to 2π).
  - `data-cell="${i}"`, `data-gear` = `none` | `gas` | `brake`, visible text `?` | `⬆ GAS` | `⬇ BRAKE`, and `title` the same as the text.
  - A tap cycles `null → gas → brake → gas → …`, plays `A.sound('blip')`, and sets the last tapped cell.
- **Canvas taps**: a `pointerdown` on a strip cell does the same as its button (copy the hit test from `card-sharp`).
- `🛰 Scout` (aria `Scout: a drone reads the slope over the stretch you last tapped`, class `secondary`): if no cell has been tapped this round, `A.freeNote('Tap a stretch of road first, then send the scout.')` and stop. Otherwise `if (!A.spend()) return;` then `A.say(scoutText(r, last), true)` and start the drone animation.
- `🏁 Drive` (aria `Drive the stage`): if `!complete(gears)`, `A.freeNote('Set a gear for every stretch of road first.')`. Otherwise resolve with `` ok ? `Stage clear! ${stripExplain(r)}` : stripMiss(r, gears) ``.
- **Important**: build the rounds with `ctx.random` **before** anything else uses it.

### Level 5 (`mountDialLevel`)

```ts
{
  hero, rounds: buildBuilder(ctx.random), charges: [1, 1, 0],
  dials: [{ key: 'a', aria: 'Roadworks setting a', label: 'Set a', unit: '', step: 1, min: (r) => r.min, max: (r) => r.max, start: (r) => r.start, text: (v) => `a = ${num(v)}` }],
  handles: [trackHandle<BuildRound>('a', (r) => r.min, (r) => r.max)],
  test: { button: '🛰 Scout', aria: 'Scout: read the slope at the start gate', read: (r, v) => buildScout(r, v.a) },
  fire: { button: '🏁 Drive', aria: 'Drive the stage' },
  judge: (r, v) => judgeBuild(r, v.a),
  miss: (r, v) => buildMiss(r, v.a),
  win: (r) => `Stage clear! ${buildExplain(r)}`,
  hint: (r) => `${buildIntel(r)} ${r.assist === 0 ? 'Round 1: the road shows faintly through the fog.' : r.assist === 1 ? 'Thick fog: a scout costs a charge.' : 'Boss round: thick fog, no scout.'}`,
  hit: (r) => [X(r.n), 120],
  delay: 1.3,
  draw: (s) => { /* section 5 with s.v.a, s.rt, s.shot */ },
}
```

### Mount

```ts
export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(5, ctx.level));
    return n <= 4 ? mountStrip(ctx, n as 1 | 2 | 3 | 4) : mountDialLevel(ctx as never, builderLevel(ctx.random) as never, ARIA5);
  },
});
```

Canvas aria (levels 1 to 4): `A rally truck at the start of a mountain road hidden in fog, with a strip of eight road stretches below it that the player sets to gas or brake.` Level 5: `A rally truck at a start gate on a foggy mountain road that the roadworks setting a reshapes.`

## 7. game.json (copy exactly)

```json
{
  "$schema": "../../../../../../schema/game.schema.json",
  "id": "fog-rally",
  "title": "Fog Rally",
  "summary": "Plan throttle and brakes for a rally truck in thick fog, using the sign of f′ to find where the road climbs and where it falls.",
  "subject": "mathematics",
  "classLevel": 12,
  "chapter": { "number": 6, "name": "Application of Derivatives" },
  "ncertRef": "Section 6.3, Increasing and Decreasing Functions",
  "concepts": [
    "Increasing and decreasing functions",
    "The sign of the first derivative",
    "Critical points split the domain into intervals",
    "Sign chart of a factored derivative",
    "A zero of f′ with no change of sign",
    "Keeping f increasing on an interval with a parameter"
  ],
  "learningOutcome": "The student can find where a function increases or decreases from the sign of f′, including flat spots, trigonometric functions and a parameter that keeps f monotonic on an interval.",
  "mechanic": "predict-then-reveal",
  "estimatedMinutes": 22,
  "levels": [
    {
      "title": "Climb or dive",
      "tier": "concept",
      "kind": "foundation",
      "adds": "Baseline: where f′ > 0 the road climbs (GAS), where f′ < 0 it falls (BRAKE); a quadratic turns once, where f′ = 0 (Ex 6.2 Q4; Example 10).",
      "hints": [
        "Differentiate: for f(x) = ax² + bx + c, f′(x) = 2ax + b.",
        "Solve f′(x) = 0 to find where the road turns.",
        "Check the sign of f′ on each side: positive means GAS, negative means BRAKE."
      ]
    },
    {
      "title": "Two turns",
      "tier": "application",
      "kind": "complexity",
      "adds": "Harder: a cubic has f′ = k(x − p)(x − q), so the road has three stretches; make a sign chart (Ex 6.2 Q5, Q6; Example 11).",
      "hints": [
        "Differentiate, then factor f′ as a number times (x − p)(x − q).",
        "The two roots split the road into three stretches.",
        "Pick one test point in each stretch and read the sign of f′ there."
      ]
    },
    {
      "title": "Flat spots",
      "tier": "application",
      "kind": "concept",
      "adds": "New: a squared factor makes f′ = 0 with no change of sign, so the road only flattens and keeps its direction (Ex 6.2 Q8, Q18).",
      "hints": [
        "Factor f′ completely and keep squared factors together.",
        "A factor like (x − a)² is never negative, so it never changes the sign of f′.",
        "Only roots that change the sign of f′ split the road into climbs and falls."
      ]
    },
    {
      "title": "Mountain pass",
      "tier": "challenge",
      "kind": "concept",
      "adds": "New: trigonometric roads on [0, 2π]; f′ = 0 at multiples of π/4, then the sign of f′ on each stretch decides (Ex 6.2 Q3; Examples 9, 13).",
      "hints": [
        "(sin x)′ = cos x and (cos x)′ = −sin x; for sin 2x the chain rule gives 2 cos 2x.",
        "Find every x in [0, 2π] where f′ = 0; each one is a multiple of π/4.",
        "Test the sign of f′ in the middle of each stretch, for example at π/8."
      ]
    },
    {
      "title": "Road builder",
      "tier": "challenge",
      "kind": "concept",
      "adds": "New: a parameter. f′ must keep one sign over the whole stage, so set a to put the road’s turn exactly at the start gate (Ex 6.2 Q14).",
      "hints": [
        "Write f′(x) with a in it, for example 2x + a.",
        "On the stage f′ is weakest at the start gate x = m, so that is where it decides.",
        "The latest the road may turn is at the gate itself: solve f′(m) = 0 for a."
      ]
    }
  ],
  "misconceptions": [
    "Every zero of f′ separates a rising stretch from a falling one",
    "If f′(x) = 0 at a point, f cannot be increasing on an interval containing it",
    "A function that increases at one end of an interval increases on all of it"
  ],
  "author": { "name": "Concept Arcade maintainers", "github": "AnubhavShankar" }
}
```

## 8. Tests

### 8.1 `logic.test.ts`

Use `const seeds = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);` and `createRng` from `@core/random`.

1. **Derivatives are right.** For every round of levels 1 to 4 over all seeds, at four points inside [lo, hi], `|(f(x + 1e-5) − f(x − 1e-5)) / 2e-5 − fp(x)| < 1e-3 · max(1, |fp(x)|)`. For level 5, the same check for `roadF`/`roadFp` at a = −3, 0, 2.
2. **want follows the sign of f′.** For every strip round: `fp(mid(r, i)) !== 0` for all i, and `want[i] === (fp(mid) > 0 ? 'gas' : 'brake')`.
3. **Exactly one winning strip.** For a sample of 30 rounds per level, enumerate all 256 complete strips (bit i set = gas) and assert exactly one passes `judgeStrip`, and it equals `want`. Any strip with a `null` fails and `complete` is false.
4. **firstFault.** `firstFault(r, r.want)` is null. Switching only cell i gives `{ cell: i, kind: want[i] === 'gas' ? 'stall' : 'flip' }`. `impactTime` is below 2.4 for every cell and equals `DRIVE` for null.
5. **Flat spots really are flat.** For `cube` and `flat` rounds, for each value in `flats`, `fp(v − 0.3)` and `fp(v + 0.3)` have the same sign and `|fp(v)| < 1e-9`. For every value in `turns` (polynomials), the signs on the two sides differ.
6. **The table in 4.3.** Build each listed entry directly through the same builder helpers you used (export them, or export a `makeRound(kind, entry)` function) and assert `text` and the G/B string. In particular: `2x³ − 3x² − 36x + 7` → `GGBBBBBG`; `x³ − 3x² + 3x − 100` → `GGGGGGGG`; `[x(x − 2)]²` → `BBBBGBGG`; `sin x + cos x` → `GBBBBGGG`.
7. **Texts.** `stripExplain` of the Ex 6.2 Q5 round equals exactly `f′(x) = 6(x + 2)(x − 3). f′ = 0 at x = −2, 3. So f increases on (−∞, −2) and (3, ∞) and decreases on (−2, 3).`; the cube round's explain contains `never decreases` (or `never increases` when s = −1); for any single-cell error `stripMiss` contains `stalled` or `flipped` and the two cell edges; `scoutText` contains `climbs` or `falls`; `edgeText` for trig gives `0, π/4, π/2, 3π/4, π, 5π/4, 3π/2, 7π/4, 2π`.
8. **Fading.** `buildStrip(level, rng).map((r) => r.assist)` and `buildBuilder(rng).map(...)` are `[0, 1, 2]`.
9. **Level 5.** For every seed: rounds are `inc`, `dec`, `cub`; scanning every whole a from min to max, exactly one a passes `judgeBuild` and it is `ans`; `ans` is not `-0` (`Object.is(r.ans, -0)` is false); `start` is in range and not `ans`; for `inc` and `cub`, f′ ≥ 0 on [m, m + 2] at a = ans and f′(m) < 0 at a = ans − 1; for `dec`, f′ ≤ 0 on [m, m + 2] at ans and f′(m) > 0 at ans + 1. `buildFault(r, ans − 1)` is `'late'` for inc and cub and `'early'` for dec; `buildFault(r, ans + 1)` is the other one. `buildMiss` contains `flipped` (late, gas), `stalled` (late, brake) or `voided` (early). No miss text contains `` `a = ${num(r.ans)}` `` followed by a non-digit.

### 8.2 `tests/fog-rally-ui.test.ts`

Copy the structure of `tests/ridge-runner-ui.test.ts`.

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch06-application-of-derivatives/fog-rally/index';
import { buildBuilder, buildStrip, type BuildRound, type StripRound } from '../src/games/mathematics/class-12/ch06-application-of-derivatives/fog-rally/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'fog-rally', 5);
const cells = () => [...document.querySelectorAll('[data-cell]')] as HTMLButtonElement[];
function setGears(want: ('gas' | 'brake')[]) {
  cells().forEach((b, i) => {
    for (let k = 0; k < 3 && b.dataset.gear !== want[i]; k++) b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}
const flip0 = (w: ('gas' | 'brake')[]) => w.map((g, i) => (i === 0 ? (g === 'gas' ? 'brake' : 'gas') : g)) as ('gas' | 'brake')[];

shellTests<StripRound[]>(h, {
  levels: [1, 2, 3, 4],
  build: (level, seed) => buildStrip(level as 1 | 2 | 3 | 4, createRng(seed)),
  setRight: (g, k) => setGears(g[k].want),
  setWrong: (g, k) => setGears(flip0(g[k].want)),
  commit: () => h.click('Drive the stage'),
});
shellTests<BuildRound[]>(h, {
  levels: [5],
  build: (_level, seed) => buildBuilder(createRng(seed)),
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(g[k].ans + 1 <= g[k].max ? g[k].ans + 1 : g[k].ans - 1),
  commit: () => h.click('Drive the stage'),
});
```

Then a `describe('Fog Rally', …)` with:

1. **An unfinished strip is free**: start level 1, tap one cell, click `Drive the stage`; feedback matches `/does not cost you anything/` and hearts stay 3.
2. **Scout**: start level 1 seed 5; click `Scout: a drone reads the slope over the stretch you last tapped` before tapping: free note. Tap cell 0, scout again: feedback matches `/Scout drone over x = −4 to −3/`. Scout again: `/No charges left/`.
3. **Stall and flip**: level 2 seed 5, set the strip to `want` with one wrong cell; after `advance(3)` feedback matches `/stalled|flipped/` and hearts are 2.
4. **Win shows the intervals**: level 1 seed 5 solved; feedback matches `/increases on/`.
5. **Level 5 early and late**: level 5 seed 5 round 1 (`inc`): `setSlider(ans + 1)` then drive → `/voided/`; `setSlider(ans − 1)` → `/flipped/`.
6. **Buttons lock during the run**: after `Drive the stage`, `cells()[0].hasAttribute('disabled')` is true until the round resolves.

## 9. Traps to avoid

- Do not draw the road without fog in rounds 2 and 3, and do not reveal it past the crash point after a miss.
- Do not let the truck's speed, angle or exhaust **before** the run hint at the slope.
- Do not round the cell midpoint test; use `fp(mid) > 0` exactly.
- Do not consume `ctx.random` before the rounds are built (the UI test rebuilds them from the seed).
- `num(-0)` prints `0`, but `` `${-0}` `` prints `0` too while `Object.is` tells them apart: use `+ 0` as shown.
- Keep every animation inside 2.4 s.
- The run must reuse the player's gears **as they were when Drive was pressed** (`shot.gears`), not live gears.
