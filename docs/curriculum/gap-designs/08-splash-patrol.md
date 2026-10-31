# 08 · Splash Patrol (Maths Ch 5, §5.2 Continuity and §5.3 Differentiability)

Read `README.md` in this folder first (especially "A miss must not show the answer either"). Everything below is required unless marked "optional". Track Joiner already covers finding a constant k that makes a function continuous; this game covers **deciding where** a given function is discontinuous or not differentiable.

## 1. Identity

| Field | Value |
|---|---|
| Game id | `splash-patrol` |
| Folder | `src/games/mathematics/class-12/ch05-continuity-and-differentiability/splash-patrol/` |
| Files | `game.json` (**copy `docs/curriculum/gap-designs/json/splash-patrol.json` exactly**), `logic.ts`, `logic.test.ts`, `index.ts`, `art.ts` |
| UI test | `tests/splash-patrol-ui.test.ts` |
| Book coverage | §5.2, 5.3; Ex 5.1 Q6 to Q16, Q19, Q31 to Q34; Ex 5.2 Q9, Q10; Misc Q20 |
| Inspiration (code comment only) | Water-park slides and inspection games (find every fault before opening), Minesweeper flags (mark exactly the right spots) |
| Core verb | **Tap each joint of the slide to flag it**: fine, kink (needs smoothing) or gap (needs a patch). Then send the test duck. Built on `createArcade` directly, like Fog Rally's strip. |

## 2. What the student learns

- f is continuous at c when lim from the left = lim from the right = f(c); a joint where they differ is a discontinuity, including a single wrong point (a removable gap).
- A continuous joint can still be non-differentiable: compare the left and right derivatives (|x − 1| at 1).
- [x] and x − [x] jump at every integer; |g(x)| folds into a corner where g changes sign, not where g only touches a peak (|cos x| at π is smooth).
- Sums and products: x|x| is differentiable at 0, |x| + |x − 2| is flat between 0 and 2, and [x] + |x − 1| jumps at every integer.

## 3. Story and characters

**Marlo**, the lifeguard and chief inspector of a water park, must sign off a new **tube slide** before opening. The slide is enclosed (you cannot see inside), and the blueprint gives its shape as a function f(x), built from pieces. Marlo flags each **joint**:
- **fine**: nothing to do.
- **kink** (🟡 SMOOTH): the tube is joined but bends sharply. A sander smooths it.
- **gap** (🔴 PATCH): the tube is broken there. A welder patches it.

Then the test dummy, **Sir Quacks**, a giant rubber duck wearing goggles, rides the slide.
- An unpatched gap: the duck drops out of the tube into the splash pool below.
- An unsmoothed kink: the duck slams into it and is launched over the side.
- A repair ordered where none was needed, or the wrong repair: the whistle blows and the test stops.

Hero banner: `name: 'Marlo'`, `role: 'a lifeguard who inspects a new tube slide joint by joint before the park opens'`.

| Level | story | objective |
|---|---|---|
| 1 | `The blueprint gives the slide as a function f(x) in pieces, and the slide is enclosed, so only the formula can tell where it is broken. At each joint, the end of the piece on the left, the start of the piece on the right and the value there must all agree. If they do not, the slide has a gap there.` | `Flag every joint as joined or gap so the test duck rides the slide to the pool, in three rounds.` |
| 2 | `Now a joined joint can still hide a kink: the two pieces meet, but at different slopes. A kink throws the duck out. Flag each joint fine, kink or gap.` | `Flag every joint correctly, in three rounds.` |
| 3 | `These slides are made with the greatest integer [x] and with moduli like |cos x|. [x] steps at every integer. A modulus folds the slide where the inside changes sign, but not at a peak.` | `Flag every joint correctly, in three rounds.` |
| 4 | `The chief inspector’s slides mix pieces, [x] and moduli. Some joints are traps that look broken but are smooth.` | `Flag every joint correctly, in three rounds.` |

Characters:
- **Marlo** (hero): stands on the inspection deck at the top left: a red lifeguard tank top and shorts, white sunglasses pushed up, zinc cream on the nose, a whistle on a cord, and a clipboard with the blueprint. Idle: twirls the whistle cord, taps the clipboard, glances along the slide. Send: blows the whistle (a `TWEET!` floater, three short lines from the whistle). Moods (`face`): happy waiting, cheer on a win (thumbs up, sunglasses down), worried with a sweat drop on a fault, face-palm on a wrong repair order.
- **Sir Quacks** (the test dummy, the "target"): a big yellow rubber duck with an orange beak, aviator goggles and a tiny crash helmet. Idle: bobs at the top platform and blinks. Riding: slides with water spray particles. Faults: drops with X eyes and lands in the pool with a big splash ring; or bonks at a kink, flies out spinning, and lands on the deck with stars circling. Win: shoots out of the tube's end into the pool, splashes, and floats with a satisfied grin.
- **The repair crew**: at each flagged joint before the run, a small worker appears. For a gap, a welder with a mask and torch (blue sparks while working). For a kink, a worker with a sander (dust puffs). They finish in the first 0.3 s of the run.

## 4. Rules (`logic.ts`)

### 4.1 Types

```ts
import { aid } from '@core/dialgame';
import { num } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'smooth' | 'kink' | 'gap';
export type Flag = null | 'fine' | 'kink' | 'gap';
export interface Joint { c: number; cText: string; kind: Kind }
export interface Row {
  /** The slide on one line, for the hint: 'f(x) = |x − 1|'. */
  name: string;
  /** The blueprint lines for the sign: ['x + 1, x ≤ 1', 'x² + 1, 1 < x ≤ 2', '7 − x, x > 2'] or ['|x − 1|']. */
  lines: string[];
  f: (x: number) => number;
  lo: number; hi: number; loText: string; hiText: string;
  joints: Joint[];   // left to right
}
export interface Round extends Row { assist: 0 | 1 | 2; level: 1 | 2 | 3 | 4 }
```

**Level 1 has only two flags**: `fine` (joined) and `gap`. A kink counts as joined there, because level 1 is about continuity only. Levels 2 to 4 have three flags.

### 4.2 The pools (copy exactly)

Every joint's kind was checked numerically (left and right values at c ± 1e-6 against f(c); left and right slopes at c ± 1e-4). In level 1, the kinds marked `kink` below are joined; treat them as `fine` there.

```ts
const { abs, floor, sin, cos, PI } = Math;
type Piece = [(x: number) => boolean, (x: number) => number];
const pw = (pieces: Piece[]) => (x: number) => { for (const [test, g] of pieces) if (test(x)) return g(x); return NaN; };
const J = (c: number, kind: Kind, cText = num(c)): Joint => ({ c, cText, kind });
const R = (name: string, lines: string[], f: (x: number) => number, lo: number, hi: number, joints: Joint[], loText = num(lo), hiText = num(hi)): Row => ({ name, lines, f, lo, hi, loText, hiText, joints });

export const POOLS: Record<1 | 2 | 3 | 4, [Row[], Row[], Row[]]> = {
  1: [
    [
      R('f(x) = 2x, 0 or 4x', ['2x, x < 0', '0, 0 ≤ x ≤ 1', '4x, x > 1'], pw([[(x) => x < 0, (x) => 2 * x], [(x) => x <= 1, () => 0], [() => true, (x) => 4 * x]]), -1, 2, [J(0, 'kink'), J(1, 'gap')]),
      R('f(x) = 3, 4 or 5', ['3, x ≤ 1', '4, 1 < x < 3', '5, x ≥ 3'], pw([[(x) => x <= 1, () => 3], [(x) => x < 3, () => 4], [() => true, () => 5]]), 0, 4, [J(1, 'gap'), J(3, 'gap')]),
      R('f(x) = x + 5, x − 5 or 2x − 8', ['x + 5, x ≤ 1', 'x − 5, 1 < x ≤ 3', '2x − 8, x > 3'], pw([[(x) => x <= 1, (x) => x + 5], [(x) => x <= 3, (x) => x - 5], [() => true, (x) => 2 * x - 8]]), 0, 4, [J(1, 'gap'), J(3, 'kink')]),
    ],
    [
      R('f(x) = x + 1, x² + 1 or 7 − x', ['x + 1, x ≤ 1', 'x² + 1, 1 < x ≤ 2', '7 − x, x > 2'], pw([[(x) => x <= 1, (x) => x + 1], [(x) => x <= 2, (x) => x * x + 1], [() => true, (x) => 7 - x]]), 0, 3, [J(1, 'kink'), J(2, 'kink')]),
      R('f(x) = −2, 2x or 2', ['−2, x ≤ −1', '2x, −1 < x ≤ 1', '2, x > 1'], pw([[(x) => x <= -1, () => -2], [(x) => x <= 1, (x) => 2 * x], [() => true, () => 2]]), -2, 2, [J(-1, 'kink'), J(1, 'kink')]),
      R('f(x) = x³ − 3, x² + 1 or 2x + 4', ['x³ − 3, x ≤ 2', 'x² + 1, 2 < x ≤ 3', '2x + 4, x > 3'], pw([[(x) => x <= 2, (x) => x ** 3 - 3], [(x) => x <= 3, (x) => x * x + 1], [() => true, (x) => 2 * x + 4]]), 1, 4, [J(2, 'kink'), J(3, 'kink')]),
      R('f(x) = x¹⁰ − 1, x² or x + 1', ['x¹⁰ − 1, x ≤ 1', 'x², 1 < x ≤ 2', 'x + 1, x > 2'], pw([[(x) => x <= 1, (x) => x ** 10 - 1], [(x) => x <= 2, (x) => x * x], [() => true, (x) => x + 1]]), 0, 3, [J(1, 'gap'), J(2, 'gap')]),
    ],
    [
      // Two joints each with mixed answers, so a blind guess does not win (fixed after the first build).
      R('f(x) = |x|/x, with f(0) = 0', ['|x|/x, x ≠ 0', '0, x = 0'], (x) => (x === 0 ? 0 : abs(x) / x), -2, 2, [J(0, 'gap'), J(1, 'smooth')]),
      R('f(x) = x², with f(0) = 1', ['x², x ≠ 0', '1, x = 0'], (x) => (x === 0 ? 1 : x * x), -2, 2, [J(-1, 'smooth'), J(0, 'gap')]),
      R('f(x) = (x² − 1)/(x − 1), with f(1) = 2', ['(x² − 1)/(x − 1), x ≠ 1', '2, x = 1'], (x) => (x === 1 ? 2 : (x * x - 1) / (x - 1)), -1, 2, [J(0, 'smooth'), J(1, 'smooth')]),
      R('f(x) = |x + 1|', ['|x + 1|'], (x) => abs(x + 1), -2, 2, [J(-1, 'kink'), J(1, 'smooth')]),
    ],
  ],
  2: [
    [
      R('f(x) = |x − 1|', ['|x − 1|'], (x) => abs(x - 1), -1, 3, [J(0, 'smooth'), J(1, 'kink')]),
      R('f(x) = x², 2x − 1 or 3', ['x², x ≤ 1', '2x − 1, 1 < x ≤ 2', '3, x > 2'], pw([[(x) => x <= 1, (x) => x * x], [(x) => x <= 2, (x) => 2 * x - 1], [() => true, () => 3]]), 0, 3, [J(1, 'smooth'), J(2, 'kink')]),
    ],
    [
      R('f(x) = x², x or x + 1', ['x², x ≤ 1', 'x, 1 < x ≤ 2', 'x + 1, x > 2'], pw([[(x) => x <= 1, (x) => x * x], [(x) => x <= 2, (x) => x], [() => true, (x) => x + 1]]), 0, 3, [J(1, 'kink'), J(2, 'gap')]),
      R('f(x) = |x| − |x + 1|', ['|x| − |x + 1|'], (x) => abs(x) - abs(x + 1), -3, 2, [J(-1, 'kink'), J(0, 'kink')]),
    ],
    [
      R('f(x) = x|x| + |x − 1|', ['x|x| + |x − 1|'], (x) => x * abs(x) + abs(x - 1), -2, 2, [J(0, 'smooth'), J(1, 'kink')]),
      R('f(x) = x², 2x − 1 or x + 2', ['x², x ≤ 1', '2x − 1, 1 < x ≤ 2', 'x + 2, x > 2'], pw([[(x) => x <= 1, (x) => x * x], [(x) => x <= 2, (x) => 2 * x - 1], [() => true, (x) => x + 2]]), 0, 3, [J(1, 'smooth'), J(2, 'gap')]),
    ],
  ],
  3: [
    [
      R('f(x) = [x]', ['[x], the greatest integer ≤ x'], (x) => floor(x), -2, 2, [J(-1, 'gap'), J(0, 'gap'), J(0.5, 'smooth', '1/2'), J(1, 'gap')]),
      R('f(x) = x − [x]', ['x − [x]'], (x) => x - floor(x), -2, 2, [J(-1, 'gap'), J(0, 'gap'), J(1, 'gap'), J(1.5, 'smooth', '3/2')]),
    ],
    [
      R('f(x) = |cos x|', ['|cos x|'], (x) => abs(cos(x)), 0, 2 * PI, [J(PI / 2, 'kink', 'π/2'), J(PI, 'smooth', 'π'), J((3 * PI) / 2, 'kink', '3π/2')], '0', '2π'),
      R('f(x) = |x² − 1|', ['|x² − 1|'], (x) => abs(x * x - 1), -2, 2, [J(-1, 'kink'), J(0, 'smooth'), J(1, 'kink')]),
    ],
    [
      R('f(x) = sin|x|', ['sin|x|'], (x) => sin(abs(x)), -PI, PI, [J(-PI / 2, 'smooth', '−π/2'), J(0, 'kink'), J(PI / 2, 'smooth', 'π/2')], '−π', 'π'),
      R('f(x) = |sin x|', ['|sin x|'], (x) => abs(sin(x)), -PI, PI, [J(-PI / 2, 'smooth', '−π/2'), J(0, 'kink'), J(PI / 2, 'smooth', 'π/2')], '−π', 'π'),
    ],
  ],
  4: [
    [
      R('f(x) = |x| + |x − 2|', ['|x| + |x − 2|'], (x) => abs(x) + abs(x - 2), -1, 3, [J(0, 'kink'), J(1, 'smooth'), J(2, 'kink')]),
      R('f(x) = |x − 1| or 3 − x', ['|x − 1|, x ≤ 2', '3 − x, x > 2'], pw([[(x) => x <= 2, (x) => abs(x - 1)], [() => true, (x) => 3 - x]]), 0, 3, [J(1, 'kink'), J(2, 'kink')]),
    ],
    [
      R('f(x) = [x] + |x − 1|', ['[x] + |x − 1|'], (x) => floor(x) + abs(x - 1), -1, 3, [J(0, 'gap'), J(0.5, 'smooth', '1/2'), J(1, 'gap'), J(2, 'gap')]),
      R('f(x) = x[x]', ['x[x]'], (x) => x * floor(x), 0, 3, [J(1, 'gap'), J(1.5, 'smooth', '3/2'), J(2, 'gap')]),
    ],
    [
      R('f(x) = x|x|, 2x − 1 or x + 2', ['x|x|, x ≤ 1', '2x − 1, 1 < x ≤ 2', 'x + 2, x > 2'], pw([[(x) => x <= 1, (x) => x * abs(x)], [(x) => x <= 2, (x) => 2 * x - 1], [() => true, (x) => x + 2]]), -1, 3, [J(0, 'smooth'), J(1, 'smooth'), J(2, 'gap')]),
    ],
  ],
};
```

### 4.3 Judging

```ts
/** The flag a joint needs in this level: level 1 has no kinks (a kink is joined, so it needs 'fine'). */
export const want = (level: 1 | 2 | 3 | 4, j: Joint): 'fine' | 'kink' | 'gap' => (j.kind === 'gap' ? 'gap' : level === 1 || j.kind === 'smooth' ? 'fine' : 'kink');
export const complete = (flags: Flag[], n: number) => flags.length >= n && flags.slice(0, n).every((f) => f !== null);
export const judge = (r: Round, flags: Flag[]) => complete(flags, r.joints.length) && r.joints.every((j, i) => flags[i] === want(r.level, j));
export type Fault = { joint: number; what: 'leak' | 'kink' | 'needless' | 'wrongfix' };
/** The first joint (left to right) where the flag is wrong, and what happens there. */
export function firstFault(r: Round, flags: Flag[]): Fault | null {
  for (let i = 0; i < r.joints.length; i++) {
    const w = want(r.level, r.joints[i]);
    const f = flags[i];
    if (f === w) continue;
    if (w === 'gap') return { joint: i, what: 'leak' };          // a gap left open, or only smoothed
    if (w === 'kink') return { joint: i, what: f === 'gap' ? 'wrongfix' : 'kink' };
    return { joint: i, what: 'needless' };                        // a repair ordered on a fine joint
  }
  return null;
}
export const RUN = 1.6;  // seconds from the start of the ride to the pool
export const jointTime = (r: Round, i: number) => 0.3 + (RUN * (i + 1)) / (r.joints.length + 1);
export const verdictTime = (r: Round, f: Fault | null) => (f ? jointTime(r, f.joint) + 0.25 : 0.3 + RUN);
```

The flag cycle on a tap: level 1: `null → 'fine' → 'gap' → 'fine' → …`; levels 2 to 4: `null → 'fine' → 'kink' → 'gap' → 'fine' → …`. All flags start at `null`, so the start never wins.

### 4.4 Words

- `facts(r, j)`, the numbers at a joint, for the working: left value L = f(c − 1e-9), right value R = f(c + 1e-9), value V = f(c), left slope (f(c) − f(c − 1e-6))/1e-6, right slope (f(c + 1e-6) − f(c))/1e-6, each rounded with `num` (2 decimals).
- `intel(r)`: `` `Blueprint: ${r.name}, from x = ${r.loText} to ${r.hiText}. Joints to inspect at x = ${r.joints.map((j) => j.cText).join(', ')}.` ``
- Hint line: `` `${intel(r)} ${r.assist === 0 ? 'Round 1: the zoom shows the joint you last tapped.' : r.assist === 1 ? 'No zoom: a zoom drone costs a charge.' : 'Boss round: no zoom.'}` ``
- `missText(r, flags)` with the fault f and `x = ${cText}`:
  - leak: `` `At x = ${cText} the tube was broken and nobody patched it: Sir Quacks dropped out of the slide into the pool.` ``
  - kink: `` `At x = ${cText} the tube bent sharply and nobody smoothed it: Sir Quacks slammed into the kink and flew over the side.` ``
  - wrongfix: `` `At x = ${cText} the welder came to patch a gap, but the tube was joined there with a sharp bend: the kink stayed and Sir Quacks flew over the side.` ``
  - needless: `` `At x = ${cText} a repair crew was sent where the slide needed nothing: the whistle blew and the test was stopped.` ``
- `zoomText(r, i)` (charge): `` `Zoom drone at x = ${cText}: close-up of the joint for a moment.` ``
- `explain(r)` after a win: for each joint, one clause joined by `; `:
  - gap: `` `x = ${cText}: gap (from the left ${L}, from the right ${R}, value ${V})` `` (if L = R but V differs, write `` `x = ${cText}: gap (both sides tend to ${L}, but f(${cText}) = ${V})` ``)
  - kink (levels 2 to 4): `` `x = ${cText}: kink (joined at ${V}, but the slope jumps from ${sl} to ${sr})` ``
  - smooth, or kink in level 1: level 1 `` `x = ${cText}: joined at ${V}` ``; levels 2 to 4 `` `x = ${cText}: smooth (value ${V}, slope ${sl} on both sides)` ``
  - Win text: `` `Slide approved! ${explain(r)}.` ``

## 5. Screen and art

Canvas 640 × 340, `createArcade(ctx, hero, { W: 640, H: 340, aria, rounds: 3, charges: [1, 1, 0], onRound })`.

- **Backdrop**: a sunny water park at dusk (the arcade screen stays dark: use a deep teal sky gradient over `PAL.bg0`), palm silhouettes, a splash pool at the bottom right (x 470 to 630, y 270 to 330) with animated ripples.
- **The tube slide**: a **decorative** fixed path, the same every round, **never the graph of f**. It runs from Marlo's deck at (90, 70) in a big S-curve down to the pool (a cubic Bézier through (230, 90), (300, 260) and (470, 280)). Draw it as a thick translucent blue tube (`rgba(77,225,255,0.25)` fill, `PAL.cyan` edges, ribs every 16 px). Because the tube is opaque blue and generic, the picture never shows where the real function breaks.
- **Joints**: rings around the tube at evenly spaced fractions `(i + 1)/(n + 1)` of the path, numbered, each with a label `x = ${cText}` and its flag icon: `?` grey (unset), `✓` green (fine or joined), `🟡 SMOOTH` (kink), `🔴 PATCH` (gap). Colour **and** text. The last tapped joint has a yellow outline.
- **The blueprint sign** (top right, 250 × 76, rounded, `rgba(10,14,50,0.85)`): `BLUEPRINT` (size 10, `PAL.dim`), then `f(x) =` and the `lines` (size 12, `PAL.yellow`), one line each, with a big brace when there is more than one line, then `from x = ${loText} to ${hiText}` (size 10).
- **The zoom (helper)**: a round magnifier (radius 46) at (300, 170), showing the **real** graph of f on [c − w, c + w] (w = 6% of the slide's x-range) around the joint, with the two pieces in different colours and open or filled dots at the joint (open for an excluded end, filled for f(c)), scaled to fit with no numbers. Round 1: it shows the last tapped joint, live. Round 2: only for 1.5 s after a zoom drone (charge), for the last tapped joint. Round 3: never. This is the only place the true shape appears.
- **Marlo** on the deck at (60, 96); **Sir Quacks** on the start platform beside Marlo.

### 5.1 The ride (resolve)

`A.resolve(ok, text, at, verdictTime(r, fault))`, `at` = the joint of the fault (or the pool for a win).
- 0 to 0.3 s: Marlo blows the whistle; the crew members at flagged joints finish their work (sparks for a patch, dust for a smoothing).
- From 0.3 s: Sir Quacks slides along the tube, reaching joint i at `jointTime(r, i)` and the pool at 1.9 s, with water spray particles.
- At the fault joint (verdict 0.25 s after reaching it):
  - **leak**: the tube splits open there, Sir Quacks drops out and falls to the pool below (or the deck if the joint is far from the pool) with a big splash ring (`A.burst(x, 300, PAL.cyan, 26, 180)`). Text `LEAK!`.
  - **kink** and **wrongfix**: the tube bends visibly at the joint, the duck slams into the bend and flies out over the side, spinning, and lands with stars. Text `KINK!`.
  - **needless**: a STOP barrier drops at the joint, the duck stops against it, and Marlo's whistle blows twice with a face-palm. Text `WRONG REPAIR!`.
- **Win**: the duck shoots out of the tube's end into the pool, splashes and floats, grinning. Marlo gives a thumbs up. Float `SLIDE APPROVED!`.
- The fault animation only shows what the player's flags did at that one joint. It never reveals the other joints. Everything finishes inside 2.4 s (the latest verdict is 0.3 + 1.6 × 4/5 + 0.25 = 1.83 s).

## 6. Controls

- **Joint buttons** in `A.controls`: up to 4 buttons in a grid, made with `A.button(text, aria, fn, 'small')`, each with `data-joint="i"` and `data-flag` = `none | fine | kink | gap`. The aria-label is set per round: `` `Joint at x = ${cText}` ``. Buttons beyond the round's joint count get the `hidden` attribute. The visible text shows the flag (`?`, `✓ fine`, `🟡 smooth`, `🔴 patch`; level 1: `?`, `✓ joined`, `🔴 patch`).
- **Canvas taps** on a joint ring (within 22 px) do the same.
- `🔍 Zoom drone` (aria `Zoom drone: a close-up of the joint you last tapped`, `secondary`): if no joint has been tapped this round, `A.freeNote('Tap a joint first, then send the zoom drone.')`; otherwise `if (!A.spend()) return;` and show the zoom for 1.5 s.
- `🦆 Send the duck` (aria `Send the test duck`): if any visible joint is unset, `A.freeNote('Flag every joint first.')`; otherwise resolve.
- `onRound(k)`: reset all flags to `null`, the last tapped joint to −1, set the buttons' labels and `hidden`, hide feedback, and set the hint line.
- Build the rounds with `ctx.random` before anything else: `buildRounds(level, random)` returns `POOLS[level].map((pool, k) => ({ ...pick(pool, random), level, assist: aid(k) }))`.

## 7. game.json

Copy `docs/curriculum/gap-designs/json/splash-patrol.json` exactly.

## 8. Tests

### 8.1 `logic.test.ts`

1. **Kinds are right**: for every joint of every row, recompute the kind numerically (gap if |f(c ± 1e-6) − f(c)| > 1e-4 on either side; else kink if the one-sided slopes at h = 1e-4 differ by more than 1e-2; else smooth) and compare with the table.
2. **One winner**: for every row, enumerate every complete flag assignment (2ⁿ in level 1, 3ⁿ in levels 2 to 4); exactly one passes `judge`, and `firstFault` is null for it and not null for every other. Assignments with a `null` fail and `complete` is false.
3. **Fault kinds**: leaving a gap `fine` gives `leak`; leaving a kink `fine` gives `kink` (levels 2 to 4); flagging a kink `gap` gives `wrongfix`; flagging a fine joint `kink` or `gap` gives `needless`. In level 1 a `kink` joint flagged `fine` is correct.
4. **Times**: `verdictTime` is below 2.4 for every row and fault.
5. **Levels**: 80 seeds, `assist` `[0, 1, 2]`, every round has 1 to 4 joints.
6. **Words**: `missText` contains the joint's `x = ${cText}` and one of `dropped out`, `flew over the side`, `test was stopped`, and never mentions another joint's position; `explain` mentions every joint.

### 8.2 `tests/splash-patrol-ui.test.ts`

Use `arcadeHarness(game, 'splash-patrol', 4)`. Helper:

```ts
const buttons = () => [...document.querySelectorAll('[data-joint]')].filter((b) => !(b as HTMLElement).hidden) as HTMLButtonElement[];
function setFlags(r: Round) {
  buttons().forEach((b, i) => {
    const w = want(r.level, r.joints[i]);
    for (let k = 0; k < 4 && b.dataset.flag !== w; k++) b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}
function setWrong(r: Round) {
  setFlags(r);
  const b = buttons()[0];
  const w = b.dataset.flag;
  for (let k = 0; k < 4 && b.dataset.flag === w; k++) b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  if (b.dataset.flag === 'none') b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}
shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build: (level, seed) => buildRounds(level as 1 | 2 | 3 | 4, createRng(seed)),
  setRight: (g, k) => setFlags(g[k]),
  setWrong: (g, k) => setWrong(g[k]),
  commit: () => h.click('Send the test duck'),
});
```

Then: an unflagged joint makes Send free (`/does not cost you anything/`, hearts 3); the zoom needs a tapped joint first (free note), then costs a charge; a miss text matches `/dropped out|flew over the side|test was stopped/`; a win says `Slide approved!`; the number of visible joint buttons equals the round's joint count.

## 9. Traps to avoid

- The slide picture is decorative and the same every round; only the zoom shows the real shape, and only as a helper.
- Level 1 has no kink flag: a kink there is joined.
- A fault shows only its own joint.
- Every animation finishes inside 2.4 s.
- Do not use pronouns for Marlo or Sir Quacks in texts.
