# Ch 1 · Quantum of Charge rebuilt as "The Quark Hunt" (§1.4.3; Ex 1.4(a), Ex 1.11(a))

Read `../README.md` first (every rule, above all "A miss must not show the answer either", "Helpers fade" and the "UX checklist"), then `README.md` in this folder. The model rebuild is `capacitor-bench` (brief `../20-capacitor-bench.md`). Levels 1 and 3 are tap boards built on `createArcade`, like level 1 of `src/games/mathematics/class-12/ch13-probability/card-sharp/index.ts`; level 2 is a `mountDialLevel` level. Everything below is required unless marked optional. If a number here does not work, stop and report it.

The old Millikan's Oil-Drop Lab made the player type electron counts and the unit of charge. This brief **replaces the whole game**. It keeps the id, folder and `order`, and keeps every concept: q = n e, counting electrons from a balanced drop, finding the unit of charge from data (and that the smallest reading is not the unit), and telling a possible charge from an impossible one.

## 1. Identity

| Field | Value |
|---|---|
| Game id | `quantum-of-charge` (unchanged); the old `game.json` has no `order`, and the new one has none either |
| Folder | `src/games/physics/class-12/ch01-electric-charges-and-fields/quantum-of-charge/` |
| Files | **Replace** `game.json` with `docs/curriculum/gap-designs/rebuilds/json/quantum-of-charge.json` (copy exactly). **Delete and rewrite** `logic.ts`, `logic.test.ts`, `index.ts`. **Add** `art.ts`. |
| Old UI test | **Delete** `tests/oildrop-ui.test.ts`. **Create** `tests/quantum-of-charge-ui.test.ts`. |
| Imports of the old logic | Only `tests/oildrop-ui.test.ts` (checked 2026-10-31). Search for `quantum-of-charge/logic` again before deleting. |
| Engine | Level 1 and level 3: `createArcade` from `@core/arcade` (custom tap controls). Level 2: `mountDialLevel` from `@core/dialgame`. Helpers: `paidFlash`, `helperOn` from `@core/aidflash`. |
| Book coverage | §1.4.3 quantisation, q = n e (A6); Millikan's measurement (named in §1.4.3); Ex 1.4(a) (what "quantised" means); Ex 1.11(a) (counting electrons) |
| Inspiration (code comment only) | Lunar Lander (hold a hover by balancing two forces), a guitar tuner (level 2: tune the rung spacing until every string rings true), Papers, Please (level 3: inspect and reject) |
| Core verb | **Add electrons to an oil drop one at a time** (an X-ray zap adds one, a UV flash knocks one off) until it hovers; then tune a ruler's spacing and reject impossible readings. In this chapter it is the only game whose verb is counting single electrons. |

## 2. What the student learns

- A drop between two plates hovers when the electric push equals its weight: n e V / d = m g.
- So the number of extra electrons is n = m g d / (e V), always a whole number, and the drop's charge is q = −n e.
- Charge can change only in whole steps of e: one electron too few and the drop falls, one too many and it rises.
- To find the unit from data, look for the **largest** step that every reading is a whole number of. The smallest reading need not be one unit.
- A free charge that is not a whole number of e (a third of e would be a free quark) has never been found. A reading like 2.33 e is a contaminated drop.

## 3. The mechanic, physically

**Eli** works the night shift at a lab that hunts for free quarks: a modern, automated version of Millikan's oil-drop experiment. A fine oil drop floats between two horizontal plates 5 mm apart, seen through a camera. The top plate is +, the bottom −, so a drop carrying extra electrons is pushed up.

| Level | The player | What decides the attempt |
|---|---|---|
| 1 Hold the drop | taps `+1 electron` (X-ray zap) and `−1 electron` (UV flash) | exactly n = m g d/(e V) electrons hovers the drop |
| 2 Calibrate the detector | slides the rung spacing of the detector's charge ladder | the one spacing on the dial that makes every reading a whole number of rungs |
| 3 Quark or dust? | taps drops to flag them | flag exactly the drops whose reading is not a whole number of e |

Physical consequences (misses show the direction only, with fixed effects):
- Level 1 **too few** (`low`): the drop sinks at a fixed speed and lands on the bottom plate with a flattened `plip`. **Too many** (`high`): it rises at the same fixed speed and sticks to the top plate with a `tik`. **Right**: it hangs still, glinting in the lamp, with a tiny jiggle.
- Level 2 **wrong spacing**: the drop markers slide onto the ladder and at least one hangs between two rungs with a red `?`. **Right**: every marker clicks onto a rung, and the counts appear.
- Level 3 **kept dust**: the run is sent to the journal and comes back stamped `RETRACTED`. **Threw away a good drop**: the stamp reads `TOO FEW DROPS`. Neither shows which drop was wrong. **Right**: the kept drops line up on the e-ladder at whole numbers and the journal cover reads `PUBLISHED: NO FREE QUARKS`.

## 4. Story and characters

Hero banner: `name: 'Eli'`, `role: 'a particle physicist on the night shift, hunting for free quarks with charged oil drops'`.

| Level | story | objective |
|---|---|---|
| 1 | `A free quark would carry a third of an electron’s charge, so Eli’s lab weighs charge itself. An oil drop sits between two plates 5 mm apart; the top plate is positive, so every extra electron on the drop adds an upward push e V/d. The drop hovers when n e V / d = m g. Charge only comes in whole electrons: an X-ray zap adds one, a UV flash knocks one off.` | `Give the drop exactly the number of electrons that makes it hover, in three runs.` |
| 2 | `The lab’s new charge detector reads in its own units, du, and nobody knows how many du one electron gives. Every drop carries a whole number of electrons, so every reading is a whole number of the same step. The step is the largest one that fits every reading, and the smallest reading need not be a single electron.` | `Set the detector’s rung spacing so every reading lands on a rung, in three runs.` |
| 3 | `Tonight’s run measured five drops. Every real free charge is a whole number of e = 1.6 × 10⁻¹⁹ C. A reading of a third or two thirds of e more would be a free quark, but every such reading so far has been dust on the lens or a misread drop.` | `Flag every drop that is not a whole number of e, then publish the run, in three nights.` |

Characters (each in its own function in `art.ts`, AGENTS.md item 17):
- **Eli** (hero) sits on a lab stool at the monitor desk on the left, feet at (86, 318), about 74 px tall seated.
  - Gear: a dark green hoodie under an open white lab coat; round wire glasses; headphones round the neck; a mug labelled `QUARK?`; sneakers.
  - Pose: one hand near the control box with the X-ray and UV buttons (at (150, 236)); the other holds the mug.
  - Idle: sips from the mug every 5 s (the arm lifts 10 px, a small steam curl), blinks every 3 s, the glasses glint every 4 s, one foot taps.
  - Action: on every `+1` or `−1` tap the hand jabs forward 4 px for 0.12 s; on fire (level 1) he flips the plate switch (a lever at (150, 268) swings 50° over 0.15 s, `CLACK` floater); level 2 he turns the detector knob; level 3 he points at the chamber.
  - Moods: `'happy'` while waiting; squinting from fire to the verdict; `'cheer'` with both arms up (the mug sloshes, two drips) on a win; `'worried'` with a sweat drop on a miss; a facepalm (one hand on the face) on `RETRACTED`.
- **Pico** (the camera robot, NPC) hangs from a gantry over the chamber, centre (340, 34), about 40 px.
  - Gear: a boxy camera body with a big round lens for an eye, a red `REC` light, two short antennae, a small side screen.
  - Idle: the lens refocuses (radius 9 to 11, slowly), `REC` blinks every 1 s, the antennae bob.
  - On fire: the lens ring lights `PAL.cyan`.
  - Win: a photo flash (a white disc around the lens, alpha 0.3 for 0.12 s, no full-screen flash), `CLICK` floater, green `✓` on its screen.
  - Miss: the lens droops 4 px, red `✗` on its screen, a `hmm` floater.
- **The oil drop** (level 1 target): a golden droplet (`#e8c15a`, radius 10) with a white highlight, and one small cyan `−` dot on its rim for each electron the player has added (the player's own setting), evenly spaced. It wobbles slightly while idle.

## 5. Rules (`logic.ts`)

### 5.1 Constants, types and pools (copy exactly)

```ts
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const E = 1.6e-19;  // C, as in NCERT
export const G = 9.8;      // m/s²
export const GAP = 0.005;  // m, between the plates

type Assist = 0 | 1 | 2;
export interface HoldRow { V: number; n: number; m: number }        // V volts, answer n electrons, shown m in units of 10⁻¹⁵ kg
export interface CalRow { u: number; ns: number[]; reads: number[] } // answer u du per electron; reads = ns × u (shown)
export interface DustRow { ks: number[] }                           // five drops; drop i carries ks[i]/3 of e; ks[i] % 3 !== 0 is dust

// Checked by script on 2026-10-31. Round k's row comes from pool k.
export const HOLD: HoldRow[][] = [
  [{ V: 300, n: 3, m: 2.94 }, { V: 450, n: 2, m: 2.94 }, { V: 240, n: 5, m: 3.92 }, { V: 500, n: 4, m: 6.53 }],
  [{ V: 200, n: 7, m: 4.57 }, { V: 350, n: 6, m: 6.86 }, { V: 150, n: 9, m: 4.41 }, { V: 300, n: 8, m: 7.84 }],
  [{ V: 250, n: 10, m: 8.16 }, { V: 270, n: 11, m: 9.7 }, { V: 240, n: 12, m: 9.4 }, { V: 160, n: 13, m: 6.79 }],
];
export const CAL: CalRow[][] = [
  [{ u: 2.4, ns: [3, 5, 7], reads: [7.2, 12, 16.8] }, { u: 3.2, ns: [2, 5, 6], reads: [6.4, 16, 19.2] }, { u: 2.7, ns: [4, 6, 9], reads: [10.8, 16.2, 24.3] }, { u: 3.5, ns: [3, 4, 8], reads: [10.5, 14, 28] }],
  [{ u: 2.6, ns: [5, 7, 8], reads: [13, 18.2, 20.8] }, { u: 3.3, ns: [2, 3, 7], reads: [6.6, 9.9, 23.1] }, { u: 2.9, ns: [4, 7, 9], reads: [11.6, 20.3, 26.1] }, { u: 3.7, ns: [2, 6, 9], reads: [7.4, 22.2, 33.3] }],
  [{ u: 2.2, ns: [6, 9, 10], reads: [13.2, 19.8, 22] }, { u: 3.1, ns: [4, 5, 6], reads: [12.4, 15.5, 18.6] }, { u: 3.6, ns: [3, 8, 9], reads: [10.8, 28.8, 32.4] }, { u: 2.5, ns: [6, 8, 9], reads: [15, 20, 22.5] }],
];
export const DUST: DustRow[][] = [
  [{ ks: [9, 7, 15, 12, 24] }, { ks: [6, 18, 10, 21, 9] }, { ks: [12, 3, 21, 14, 6] }, { ks: [21, 9, 6, 18, 16] }],
  [{ ks: [6, 11, 18, 22, 12] }, { ks: [13, 3, 24, 17, 9] }, { ks: [9, 21, 4, 12, 19] }, { ks: [8, 25, 6, 15, 24] }],
  [{ ks: [16, 3, 12, 18, 23] }, { ks: [9, 5, 26, 12, 21] }, { ks: [18, 6, 25, 11, 15] }, { ks: [20, 15, 2, 24, 9] }],
];
/** A drop's reading in units of 10⁻¹⁹ C, to 2 decimals: 4.80, 3.73, 1.07, … */
export const reading = (k: number) => Number(((k / 3) * 1.6).toFixed(2));
export const isDust = (k: number) => k % 3 !== 0;
```

The level 3 dust patterns are one dust drop per row in pool 1 (at positions 1, 2, 3, 4), two in pool 2 (01010, 10010, 00101, 11000) and two in pool 3 (10001, 01100, 00110, 10100): no pattern is shared between rounds.

```ts
export type Round =
  | ({ kind: 'hold'; assist: Assist } & HoldRow)
  | ({ kind: 'cal'; assist: Assist } & CalRow)
  | ({ kind: 'dust'; assist: Assist } & DustRow);

export function buildRounds(level: 1 | 2 | 3, random: () => number): Round[] {
  const pools = [HOLD, CAL, DUST][level - 1] as unknown[][];
  const kind = (['hold', 'cal', 'dust'] as const)[level - 1];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}
```

`buildRounds` is the **first** use of `random` in the level.

### 5.2 Physics and judging

```ts
export const N_DIAL = { min: 0, max: 15, start: 0 };          // level 1: extra electrons on the drop
export const U_DIAL = { min: 2, max: 6, step: 0.1, start: 6 }; // level 2: du per electron

/** Level 1: the upward electric push and the weight, in N. */
export const push = (r: HoldRow, n: number) => (n * E * r.V) / GAP;
export const weight = (r: HoldRow) => r.m * 1e-15 * G;
export type Fault = 'low' | 'high' | 'offrung' | 'kept' | 'tossed';

export function holdFault(r: HoldRow, n: number): Fault | null {
  return n === r.n ? null : n < r.n ? 'low' : 'high';
}
/** Level 2: how far a reading is from a whole number of rungs at spacing u. */
export const offBy = (q: number, u: number) => Math.abs(q / u - Math.round(q / u));
export const fits = (r: CalRow, u: number) => r.reads.every((q) => offBy(q, u) < 0.02);
export function calFault(r: CalRow, u: number): Fault | null {
  return Math.abs(u - r.u) < 1e-9 ? null : 'offrung';
}
/** Level 3: flags[i] true means drop i was flagged as dust. Kept dust is reported before a tossed good drop. */
export function dustFault(r: DustRow, flags: boolean[]): Fault | null {
  if (r.ks.some((k, i) => isDust(k) && !flags[i])) return 'kept';
  if (r.ks.some((k, i) => !isDust(k) && flags[i])) return 'tossed';
  return null;
}
```

- The dial values in level 2 are floats: compare with `Math.abs(u - r.u) < 1e-9` (the slider snaps to 0.1 steps; `Number(x.toFixed(6))` is what the engine stores).
- Start settings: level 1 `n = 0`, level 2 `u = 6.0`, level 3 nothing flagged. None wins on any row (tested).

### 5.3 Words

`sci(x)` = `fmt(x)` from `@core/judge` (it writes `2.88 × 10⁻¹⁴`). `two(x)` = `x.toFixed(2)`.

**`intel(r)`**:
- hold: `` `The drop’s mass is ${r.m} × 10⁻¹⁵ kg. The plates are 5 mm apart at ${r.V} V, top plate positive. Each electron carries e = 1.6 × 10⁻¹⁹ C.` ``
- cal: `` `The detector read three drops at ${r.reads[0]}, ${r.reads[1]} and ${r.reads[2]} du. Every drop carries a whole number of electrons.` ``
- dust: `` `Five drops, in units of 10⁻¹⁹ C: ${r.ks.map(reading).map(two).join(', ')}. A real free charge is a whole number of e = 1.6 × 10⁻¹⁹ C.` ``

**Hint line**: `` `${intel(r)} ${r.assist === 0 ? 'Round 1: the gauge is live.' : r.assist === 1 ? 'The gauge is off: a check costs a charge.' : 'Final run: no gauge.'}` ``

**`missText`**:
- hold low, n = 0: `With no extra electrons nothing pushed the drop up: it sank onto the bottom plate. Zap some electrons on.`
- hold low: `` `With ${n} electron${n === 1 ? '' : 's'} the push n e V/d was less than the drop’s weight: it sank onto the bottom plate. It needs more electrons.` ``
- hold high: `` `With ${n} electrons the push beat the weight: the drop rose and stuck to the top plate. It needs fewer electrons.` ``
- cal offrung: `` `At ${u.toFixed(1)} du per electron, not every reading is a whole number of rungs: a drop hung between two rungs. The right step fits all three readings exactly.` ``
- dust kept: `Retracted: a drop you published is not a whole number of e. Divide every reading by 1.6 before you publish.`
- dust tossed: `Too few drops: you threw away a drop whose reading is a whole number of e. Flag only the readings that are not.`

**`checkText`** (a charge):
- hold: `` `Force check: ${n} electron${n === 1 ? '' : 's'} push up with ${sci(push(r, n))} N; the weight is ${sci(weight(r))} N.` ``
- cal: `` `Fit check: at ${u.toFixed(1)} du per electron the drops would hold ${r.reads.map((q) => two(q / u)).join(', ')} electrons.` ``
- dust: `Ladder check: the strip of whole numbers of e shows for a moment.`

**`lcdText`** (the live gauge in round 1, and for 1.5 s after a check in round 2):
- hold: `` `up ${sci(push(r, n))} N · down ${sci(weight(r))} N` ``
- cal: `` `counts ${r.reads.map((q) => two(q / u)).join(' · ')}` ``
- dust: no text; the helper is the e-ladder strip (6.4).
- `LCD_OFF = '— — —'`

**`winText(r)`**:
- hold: `` `It hovers! n e V / d = m g, so n = m g d / (e V) = ${r.m} × 10⁻¹⁵ × 9.8 × 0.005 ÷ (1.6 × 10⁻¹⁹ × ${r.V}) = ${r.n}. The drop’s charge is q = −${r.n}e = −${fmt(r.n * 1.6)} × 10⁻¹⁹ C. Charge comes only in whole electrons: ${r.n - 1} would let it sink and ${r.n + 1} would lift it.` ``
- cal: `` `Calibrated! ${r.reads.join(', ')} du are ${r.ns.join(', ')} electrons: each is a whole number of ${r.u} du. The smallest drop held ${Math.min(...r.ns)} electrons, not one. Half the step, ${fmt(r.u / 2)} du, would fit too, but then every count would be even: the unit is the largest step that fits every drop.` ``
- dust: `` `Published! The kept drops are ${keptList} e: whole numbers, as q = n e says. The flagged ones would be ${dustList} e. No free charge has ever been found that is not a whole number of e, so they were dust.` `` where `keptList` joins `k / 3` of the good drops (`3, 5, 8`) and `dustList` joins `two(k / 3)` of the dust drops (`2.33`).

## 6. Screen and art

Canvas 640 × 340. Draw the lab over the backdrop with opaque fills.

```ts
export const CHAMBER = { x0: 230, x1: 450, top: 76, bottom: 268 };  // the two plates (level 1)
export const DROP_Y = 172;                                          // the drop's held position
export const LADDER = { x: 360, y0: 300, px: 7 };                    // level 2: 0 du at y = 300, 7 px per du
export const STRIP = { x0: 120, x1: 600, y: 250, perE: 52 };         // level 3: the e-ladder strip, 52 px per e from x0
export const DROPS = [130, 230, 330, 430, 530].map((x) => ({ x, y: 150 })); // level 3: the five drops in the viewer
export const LCD = { x: 20, y: 150, w: 150, h: 20 };
export const HIT: [number, number] = [520, 64];
```

### 6.1 The set (every level)

- A dim lab at night: a dark wall (`#121830`), a window at the top right (580, 70) whose sky is dusk (round 1), midnight with stars (round 2) and dawn pink (round 3). Racks of electronics with blinking green LEDs at the far right (x 600 to 636).
- The goal line (UX 1) at (330, 18), 14 px, `PAL.yellow`: level 1 `` `Hover the drop: ${r.V} V across 5 mm` ``; level 2 `Calibrate: how many du is one electron?`; level 3 `Flag every reading that is not a whole number of e`.
- A stencil tag at the top left, 12 px: `` `RUN ${k + 1}` ``, or `FINAL RUN · BOSS` in `PAL.red` in round 3.
- Eli at his desk on the left with the control box and the LCD at `LCD`; Pico on its gantry above the chamber.

### 6.2 Level 1: the chamber

- Two steel plates: top at y 70 to 76 and bottom at y 268 to 274, x 230 to 450, with `+` signs along the top plate and `−` along the bottom plate (12 px, white); a label `5 mm` at (462, 175) beside a small bracket (a fixed fact; the picture is not to scale).
- A camera reticle: a circle radius 84 centred (340, 172), `PAL.cyan` alpha 0.35, with cross-hairs.
- The X-ray tube on the left of the chamber at (205, 172) (a grey cylinder with a yellow radiation trefoil drawn as three wedges) and the UV lamp on the right at (475, 172) (a purple bulb). On each `+1` tap a yellow zigzag flashes from the tube to the drop for 0.15 s with a `⚡` floater; on each `−1` tap a violet ray flashes from the lamp with a `☀` floater.
- The voltage label at (340, 62), 12 px, `PAL.white`: `` `${r.V} V` ``; the mass label at (340, 296): `` `drop ${r.m} × 10⁻¹⁵ kg` ``.
- The player's count, bold 15 px `PAL.yellow`, at (340, 214): `` `${n} electron${n === 1 ? '' : 's'}` `` (UX 2).
- The plates are dark grey until fire; on fire they glow faintly (`PAL.cyan` alpha 0.15 strip on each).

### 6.3 Level 2: the detector's charge ladder

- A tall display panel (x 300 to 460, y 40 to 310) showing a vertical axis at `LADDER.x` from y = 300 (0 du) up to y = 48 (36 du). No numbers on the axis except `0` at the bottom and `36 du` at the top.
- Three **drop markers**: golden circles radius 7 at x = 420, y = 300 − 7·read, each labelled with its reading (`7.2 du`, 11 px, `PAL.white`) at x = 432. These are the round's facts.
- The **first rung** (always drawn): a cyan bar from x 330 to 390 at y = 300 − 7u, with a grip (ring radius 20 and `⇕`) at (360, y) and the player's own spacing beside it at (300, y + 4), right-aligned, bold 13 px `PAL.yellow`: `` `${u.toFixed(1)} du` ``.
- The **full ladder** (the helper, see 6.5): rungs every 7u px up to 36 du, alpha 0.6.

### 6.4 Level 3: the five drops

- The camera view: a wide dark rectangle (x 90 to 590, y 70 to 210) with five golden drops at `DROPS`, labelled A to E above them (12 px) and with their readings below (12 px, `PAL.white`): `4.80` … The unit `× 10⁻¹⁹ C` is written once at (340, 228), 11 px, `PAL.dim`. (These five readings are the board itself, the one allowed exception to "at most 3 numbers".)
- Tapping a drop toggles its flag: a red dashed ring radius 18 around it, a `DUST?` tag above it (`PAL.red`, 11 px), and an air nozzle that swings down from the top of the view to aim at it.
- The **e-ladder strip** (the helper, see 6.5): a horizontal line at `STRIP.y` from x0 to x1 with a tick and a small `n` label at every whole e (1 to 9) and, for each drop, a small marker of its letter at x0 + perE·(reading/1.6) on the strip.

### 6.5 The helper

| Round | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| 1 (`assist 0`) | LCD live `lcdText` | LCD live and the full ladder | the e-ladder strip |
| 2 (`assist 1`) | `LCD_OFF`, except 1.5 s after a check (`PAL.yellow`) | `LCD_OFF` and first rung only, except 1.5 s after a check | no strip, except 1.5 s after a check |
| 3 (`assist 2`) | `LCD_OFF` | `LCD_OFF`, first rung only | no strip |

Use `const pf = paidFlash()`; the check calls `pf.paid()`, and each frame computes `const since = pf.since(A.clock, k)` and `helperOn(r.assist, false, since)`. These are the only places a force, a count at the player's spacing or the e-ladder appear before the attempt (prove it with the canvas recorder).

### 6.6 The attempt (`rt` = seconds since fire)

**Level 1**, `delay 1.2`:
- 0.00: Eli flips the plate switch (`CLACK`); the plates glow; Pico's lens lights.
- 0.10 to 1.00: win: the drop stays at `DROP_Y` with a jiggle `sin(t·20)·1` px; `low`: it moves down at a fixed 110 px/s to the bottom plate (it arrives by 0.97 s) and flattens into an ellipse 14 × 6 with a `plip` floater; `high`: it moves up at a fixed 110 px/s to the top plate and stays stuck there with a `tik` floater.
- 1.20: verdict. Win: the drop glints (a white `✦` twinkles), Pico takes the photo; reactions until 2.3 s.

**Level 2**, `delay 1.1`:
- 0.00: Eli turns the knob; a `FIT` floater on the panel.
- 0.10 to 0.60: the full ladder draws upward from the first rung at the player's spacing (rungs appear one by one).
- 0.60 to 1.00: the three markers slide left from x 420 to the ladder at x 360. A marker within 0.02 of a rung (`offBy < 0.02`) snaps onto it with a green `✓`; any other hangs between two rungs with a red `?` and wobbles.
- 1.10: verdict. Win: each marker shows its count beside it (`3 e`, `5 e`, `7 e`, 12 px, `PAL.green`).

**Level 3**, `delay 1.4`:
- 0.00 to 0.40: the nozzles puff each flagged drop out of the view (`PFFT` floaters; the drops fly up and fade).
- 0.40 to 0.90: the remaining drops shrink into an envelope that slides to Pico.
- 0.90 to 1.40: Pico reads it; at 1.40 a stamp slams onto the envelope: win `PUBLISHED: NO FREE QUARKS` (green) with the kept drops then lining up on the e-ladder strip at their whole numbers; `kept` → `RETRACTED` (red); `tossed` → `TOO FEW DROPS` (orange). On a miss, nothing shows which drop was wrong, and the strip is not drawn.

Everything ends by 2.3 s.

### 6.7 What must never show

- Level 1: the hovering count, a force or the weight before the attempt, except in the helper windows; the drop's motion on a miss is at a fixed speed.
- Level 2: rungs above the first one before the attempt, except in the helper windows; never a rung at the answer spacing unless it is the player's own spacing.
- Level 3: on a miss, no per-drop verdict and no strip.
- `hit` is the fixed point `HIT = [520, 64]`.

## 7. Controls and mount

```ts
export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(3, ctx.level)) as 1 | 2 | 3;
    if (n === 2) return mountDialLevel(ctx as never, calLevel(ctx.random) as never, ARIA);
    return boardLevel(ctx, n); // levels 1 and 3
  },
});
```

`ARIA = 'A night-shift physics lab: a physicist at a monitor beside a camera chamber where a charged oil drop floats between two plates, watched by a robot camera.'`

**Level 2 (`calLevel`)**: `rounds = buildRounds(2, random)` first. Dial `{ key: 'u', aria: 'Detector units per electron: the spacing of the rungs', label: 'Rung spacing', unit: 'du', step: 0.1, min: 2, max: 6, start: 6, text: (x) => x.toFixed(1) }`. Handle: `{ dial: 'u', at: (_r, v) => [360, 300 - 7 * v.u], drag: (_r, _px, py) => (300 - py) / 7, radius: 20 }`. `test: { button: '🔎 Fit check', aria: 'Fit check: see the counts at this spacing', read: (r, v) => { pf.paid(); return checkText(r, v); } }`; `fire: { button: '📏 Fit the ladder', aria: 'Fit the ladder to the readings' }`; `charges: [1, 1, 0]`; `hit: () => HIT`; `delay: 1.1`.

**Levels 1 and 3 (`boardLevel(ctx, n)`)**, on `createArcade` (copy the shape of card-sharp's `board` function):
- `const rounds = buildRounds(n, ctx.random)` first; `const A = createArcade(ctx, hero, { W: 640, H: 340, aria: ARIA, rounds: 3, charges: [1, 1, 0], onRound })`; `const pf = paidFlash()`.
- State: level 1 `let count = 0`; level 3 `let flags = [false, false, false, false, false]`; `let fired: { ok: boolean; count: number; flags: boolean[] } | null = null`.
- `onRound(k)`: reset `count = 0` and `flags` to all false, `fired = null`, `A.feedback.hidden = true`, `A.hint.textContent = hintLine(rounds[k])`, sync the slider and the flag buttons.
- **Level 1 controls**, in this order in `A.controls`:
  - `A.button('☀ −1 electron', 'UV flash: knock one electron off the drop', () => setCount(count - 1), 'secondary')`
  - `A.button('⚡ +1 electron', 'X-ray zap: add one electron to the drop', () => setCount(count + 1), 'secondary')`
  - `A.slider({ aria: 'Electrons on the drop', label: 'Electrons', min: 0, max: 15, step: 1, value: 0, unit: '', onInput: (v) => (count = v) })` (the accessible twin; `setCount` clamps to 0..15, calls `slider.set`, plays `A.sound('blip')` and starts the zap flash).
  - `A.button('🔎 Force check', 'Force check: compare the push with the weight', () => { if (!A.spend()) return; pf.paid(); A.say(checkText(r, count), true); }, 'secondary')`
  - `A.button('🔌 Switch on the plates', 'Switch on the plates and release the drop', fire)`
- **Level 3 controls**: five toggle buttons `A.button(`Drop ${L} · ${two(reading(k))}`, `Flag drop ${L}`, () => toggle(i), 'small')` (L = A to E; `aria-pressed` follows the flag), then the check `A.button('🔎 Ladder check', 'Ladder check: see the whole numbers of e for a moment', …)` and `A.button('📰 Publish the run', 'Publish the run', fire)`. A `pointerdown` on the canvas within 22 px of a drop in `DROPS` also toggles it (convert with the canvas rect as card-sharp does).
- `fire()`: `const r = rounds[Math.min(A.round, 2)]`; `const f = n === 1 ? holdFault(r, count) : dustFault(r, flags)`; `fired = { ok: f === null, count, flags: [...flags] }`; `A.resolve(f === null, f === null ? winText(r) : missText(r, …), { x: HIT[0], y: HIT[1] }, n === 1 ? 1.2 : 1.4)`.
- `A.scene((g, t) => { if (A.phase === 'between') return; … })`: draws from `fired` while `A.phase === 'resolve'`, else from the live state; clear `fired` when the phase returns to `play`.
- `A.mountAll(); return A.run();`
- **First-touch pulse** (UX 3): in level 1 round 1, until the first tap, the `⚡ +1` tube on the canvas pulses (alpha `0.5 + 0.5·sin(5t)`) with a `tap +1` label; in level 3 round 1 a `tap a drop` label pulses over drop A until the first flag.
- Accessibility: every button has its aria-label; the slider works from the keyboard; reduced motion turns off the jiggle and the envelope slide (it just appears).

## 8. game.json (copy exactly)

Copy `docs/curriculum/gap-designs/rebuilds/json/quantum-of-charge.json` over the existing `game.json`. Its lengths were checked by script on 2026-10-31. It keeps `ncertRef: "Section 1.4.3, Quantisation of charge"` and 3 levels.

## 9. Tests

### 9.1 `logic.test.ts`

1. **Pools**:
   - hold: `fmt(r.n * E * r.V / (G * GAP) / 1e-15) === String(r.m)`; `m·10⁻¹⁵·G·GAP/(E·V)` is within 0.02 of `n`; over n = 0 to 15, only `r.n` makes `|push/weight − 1| < 0.02`.
   - cal: `reads[i] === Number((ns[i] * u).toFixed(1))`; the gcd of `ns` is 1; `min(ns) ≥ 2`; `2 < u < 4`; over the dial 2.0 to 6.0 (step 0.1) only `u` makes `fits` true, and every other spacing leaves some reading at least 0.15 off a rung.
   - dust: the five readings are distinct; each row has 1 or 2 dust drops and at least 3 good ones; every good reading is within 0.01 of a whole number of e and every dust reading at least 0.3 away; no dust pattern appears in two pools.
2. **One winner**: level 1 over n = 0 to 15, level 2 over the dial, level 3 over all 32 flag patterns: only the answer gives `null`, and the start setting does not.
3. **No shared answers**: within level 1 and level 2, no answer appears in two pools; none is at a dial end.
4. **Rounds**: 80 seeds: 3 rounds of the level's kind, `assist` `[0, 1, 2]`, round k from pool k.
5. **Words**: no `missText` contains the answer token: level 1 `` `${r.n} electrons` `` (with the leading `(^|[^0-9.])`); level 2 `` `${r.u.toFixed(1)} du` `` unless the player's own spacing equals it (impossible on a miss); level 3 misses never contain a drop letter. `winText` contains `n = m g d / (e V)`, `largest step` and `q = n e` respectively.

### 9.2 `tests/quantum-of-charge-ui.test.ts`

`arcadeHarness(game, 'quantum-of-charge', 3)` and `shellTests` with:

```ts
const build = (level: number, seed: number) => buildRounds(level as 1 | 2 | 3, createRng(seed));
const FIRE = ['Switch on the plates and release the drop', 'Fit the ladder to the readings', 'Publish the run'];
function set(r: Round, right: boolean) {
  if (r.kind === 'hold') h.setSlider(right ? r.n : r.n + 1);
  if (r.kind === 'cal') h.setSlider(right ? r.u : Number((r.u + 0.1).toFixed(1)));
  if (r.kind === 'dust') r.ks.forEach((k, i) => { if (right && isDust(k)) h.click(`Flag drop ${'ABCDE'[i]}`); });
}
// commit: (level) => h.click(FIRE[level - 1])
```

Then `describe('The Quark Hunt', …)`:
- Level 1: three clicks on `X-ray zap: add one electron to the drop` set the slider to 3; one click on `UV flash…` at 0 keeps it at 0.
- Level 1 with one electron too many: the miss text contains `stuck to the top plate`.
- Level 2's slider runs 2 to 6 in steps of 0.1 and starts at 6.
- Level 3: flagging a good drop and all the dust gives `Too few drops`; flagging nothing gives `Retracted`.
- A check costs a charge, then round 3 says `No charges left`.
- **Canvas recorder** (pattern of `tests/capacitor-bench-ui.test.ts`): the level 1 gauge `/^up .* N · down .* N$/` and the level 2 gauge `/^counts /` show in round 1, in round 2 only within 1.5 s after a check, never in round 3. In level 3 the strip's tick labels (`/^[1-9]$/` drawn at `STRIP.y + 14`) follow the same rule. On a level 3 miss, no text `✓` or `?` is drawn next to a drop.

### 9.3 JSON check

`node <scratchpad>/rebuild-checks/ch01a/json-check.mjs quantum-of-charge` passed on 2026-10-31.

## 10. Traps to avoid

- **Fixed speeds** in level 1: the drop sinks or rises at 110 px/s whatever the error.
- **Level 2 rungs**: before the attempt, only the first rung is drawn in rounds 2 and 3. A full ladder would let the player align by eye.
- **Float compare** in level 2: never `===` on `u`.
- **Level 3 misses** must not mark individual drops.
- **The quark line is honest**: say that no free fractional charge has ever been found, never that the game found one.
- **Docs**: do not edit `docs/curriculum/physics-class-12/ch01-concept-weights.md`.
