# Ch 7 · Reactance Lab rebuilt as "Lights of the High Pass" (§7.4, 7.5)

Read `../README.md` (every rule, the leak rules and the UX checklist) and `README.md` in this folder first. Copy the structure of the model rebuild `capacitor-bench` (brief `../20-capacitor-bench.md`) and of `ch07-phasor-bench.md`. Everything below is required.

## 1. Identity

| Field | Value |
|---|---|
| Game id | `reactance-lab` (unchanged), `order: 1` (unchanged) |
| Folder | `src/games/physics/class-12/ch07-alternating-current/reactance-lab/` |
| Files | Replace `game.json` with `rebuilds/json/reactance-lab.json` (exact copy). Rewrite `logic.ts`, `logic.test.ts`, `index.ts`. Add `art.ts`. |
| UI test | Delete `tests/reactance-ui.test.ts`. Create `tests/reactance-lab-ui.test.ts`. |
| Engine | `mountDialLevel` from `@core/dialgame`, one `DialLevel` per level (4 levels) |
| Book coverage | §7.4 (X_L = ωL, current lags by a quarter cycle, no average power), §7.5 (X_C = 1/ωC, current leads, no average power, peak current √2 I); Examples 7.2, 7.3, 7.4, 7.5; Ex 7.3, 7.4, 7.5 |
| Inspiration (code comment only) | Survival-in-the-snow games (guide the lost party home before they freeze) and lighthouse-keeper games; the "two lamps a quarter cycle apart" finale borrows the feel of rhythm games (the beat must be steady) |
| Core verb | **Throttle the water turbine.** In every level the player drags the sluice lever up or down, which sets the turbine's speed and so the supply frequency; then flips the lamp switch. No other chapter 7 game sets the frequency of the supply. |

Search the repo for `reactance-lab/logic` before deleting the old `logic.ts`; on 2026-10-31 only `tests/reactance-ui.test.ts` imports it.

## 2. What the student learns

- A choke (a coil with negligible resistance) opposes AC with X_L = ωL = 2πfL. With a low-voltage lamp in series, the choke takes nearly all the supply voltage, so I = V/X_L. A higher frequency means more reactance and less current.
- A capacitor passes AC with X_C = 1/ωC = 1/(2πfC), and I = V/X_C. A higher frequency means less reactance and more current; the peak current is √2 I.
- So speeding up a supply dims a choke-fed lamp and brightens a capacitor-fed lamp (Examples 7.3, 7.4 doubling the frequency, 7.5).
- In a choke the current lags the voltage by a quarter cycle; in a capacitor it leads by a quarter cycle. Neither takes any average power: the energy stored in one quarter cycle comes back in the next, so a choke or capacitor limits a current without wasting energy, unlike a resistor (Ex 7.5).

## 3. The mechanic, physically

**Dolma** keeps a trekkers' lodge on a high mountain pass. The lodge has no grid: a small water turbine in a stone shed beside the stream makes its AC. Its regulator holds the voltage steady, but the frequency follows the turbine's speed, which Dolma sets by hand with the **sluice lever** (more water, faster turbine, higher frequency). The lamps were wired long ago through a sealed **choke** and a sealed **capacitor**, so in a storm the only thing she can change is the frequency. Each round a party of trekkers is caught on the trail in a blizzard, and only the lodge's lamps can guide them in.

| Level | The player sets | What decides the round |
|---|---|---|
| 1 The trail choke | turbine frequency f (Hz) | The trail lamps (12 V lamps in parallel) are fed through a choke of L mH. They need a current I: f = V/(2πLI). Too slow: X_L too small, too much current, a lamp bursts. Too fast: too little current, the lamps only glow. |
| 2 The porch capacitor | f | The red porch beacon (a 12 V lamp) is fed through a capacitor of C µF. It needs I: f = I/(2πCV). Too slow: too little current, dim. Too fast: too much current, the beacon bursts. |
| 3 Both lamps | f | One turbine feeds both. The trail needs at least its current (f ≤ f_a) and the beacon at least its current (f ≥ f_b). Exactly one whole frequency does both. |
| 4 Steady light | f (10 to 60 Hz) | In winter the stream is low and the turbine runs slowly, so a lamp flickers visibly. The roof beacon has two lamps: one through a resistor dropper of R Ω (in phase), one through a choke or a capacitor (a quarter cycle out of phase). When the two currents are equal, one lamp peaks as the other goes dark and the light is steady: X = R. |

Fixed effects (never proportional to the error): a lamp is **off**, **dim** (alpha 0.25, dull orange), **right** (alpha 1, warm white) or **burst** (a white flash, then dark with glass shards). The trekkers' walk has four fixed paths (win, off-trail, past the door, dazzled). The level 4 flicker is one fixed pulse (2 Hz, alpha 0.3 to 1).

## 4. Story and characters

Hero banner: `name: 'Dolma'`, `role: 'the keeper of a high-pass trekkers’ lodge, whose lamps run on a water turbine she sets by hand'`.

| Level | story | objective |
|---|---|---|
| 1 | `A blizzard has caught a party of trekkers below the pass. Dolma’s lodge makes its own AC with a small water turbine: the regulator holds the voltage, but the frequency follows the turbine’s speed, set by the sluice lever. The trail lamps are 12-volt lamps fed through a sealed choke, so the choke’s reactance X_L = 2πfL sets their current.` | `Set the turbine’s frequency so the trail lamps get exactly the current they need, in three storms.` |
| 2 | `The red porch beacon shows the trekkers the lodge door. It is a 12-volt lamp fed through a sealed capacitor, whose reactance X_C = 1/(2πfC) sets the current. A capacitor works the other way round from a choke: the faster the turbine, the smaller its reactance.` | `Set the frequency so the porch beacon gets exactly its current, in three storms.` |
| 3 | `Tonight one turbine feeds both: the trail lamps through the choke and the porch beacon through the capacitor. Speeding up dims one and brightens the other. These lamps can take far more than they need; the danger in a blizzard is too little light.` | `Find the one frequency at which both the trail and the beacon are bright enough, in three storms.` |
| 4 | `Deep winter: the stream is low, the turbine turns slowly, and a lamp flickers so much that the falling snow strobes. The roof beacon has two lamps. One is fed through a resistor dropper, with its current in step with the voltage; the other through the choke or the capacitor, with its current a quarter cycle out of step. If the two currents are equal, one lamp is at its brightest just as the other goes dark.` | `Set the frequency that makes the two beacon lamps carry equal currents, so the light is steady, in three storms.` |

Characters (each in its own function in `art.ts`, AGENTS.md item 17):
- **Dolma** (hero) stands beside the turbine shed, feet at (206, 318), about 70 px tall.
  - Gear: a long maroon wool chuba coat with a yellow sash; a fur-lined hat with ear flaps and a small headlamp on its brow; a striped scarf (red, yellow, green); thick grey mittens; felt boots; a steel thermos on a strap across her back.
  - Pose: her right mitten rests on the T-grip of the sluice lever.
  - Idle: a puff of breath mist (a white ellipse drifting up and fading) every 2 s; blinks every 3 s; stamps her feet every 4 s (each boot lifts 3 px in turn); every 6 s she shades her eyes with her left mitten and looks up the trail. Snow settles on her hat: a white cap that grows from 0 to 3 px over the round.
  - Action (on fire): leans in and heaves the lever with both mittens (0.00 to 0.25 s, her body tilts 8°), the headlamp flicks on, `CLUNK` floater at (250, 150).
  - Moods: `face(…, 'happy')` while waiting; `'cheer'` on a win, with both arms up, then she waves to the trekkers; `'worried'` after a dim, off-trail or dazzled result. After a burst she is **startled**: the hat jumps up 4 px, eyes drawn as two wide white circles with small pupils, and a `!` above her head, drawn by hand because `face` has no such mood.
- **The trekkers** (the target): a roped party walking in a line along the trail, starting at the right edge.
  - Gear: each wears a helmet with a headlamp, a bright down jacket (leader `PAL.orange`, second `PAL.cyan`, third `PAL.yellow`), a backpack with a rolled mat, and carries an ice axe; a rope (a curved `PAL.white` line, alpha 0.7) joins their waists. Each is about 34 px tall.
  - Idle: they trudge in place (legs swing ±3 px), lean into the wind (tilt 6° to the right), and the leader's headlamp beam (a faint cone, alpha 0.15) sweeps left and right every 3 s.
  - Win: they walk the lit trail up to the lodge door (positions along `TRAIL`), the leader waves, `NAMASTE!` floater at the door (120, 250).
  - Dim (off-trail): at the second lamp they veer off the path and topple into a snowdrift; only their boots stick out, `FLUMP` floater.
  - Porch dim (level 3): they reach the top of the trail and walk past the dark door into the drift beside the lodge, `FLUMP`.
  - Burst: they stop and huddle, the leader's headlamp swings round, `?` floater.
  - Dazzled (level 4): they stop and shield their eyes from the strobing snow, `WHICH WAY?` floater.
- **Norbu the yak** (NPC) stands by the lodge at about (60, 300), 46 px long: shaggy dark-brown coat, curved horns, a bell on a red collar. Idle: chews (jaw moves), flicks its tail, the bell sways. On fire: lifts its head. Win: `GRUNT!` floater and a happy head-toss. Burst: startles and turns its back. Other misses: lowers its head.
- **The turbine** in the shed: a wheel of 8 spokes at `TURBINE`, seen through an opening, with a white water chute above it. It spins slowly while idle and fast in the take (a fixed spin speed, the same for every setting).

## 5. Rules (`logic.ts`)

### 5.1 Constants and types

```ts
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const TWO_PI = 2 * Math.PI;
export const GLOW = { dim: 0.25, right: 1 } as const; // lamp brightness: fixed, never proportional

export interface ChokeRow { v: number; l: number; i: number; f: number }                              // shown v (V), l (mH), i (A); answer f (Hz)
export interface CapRow { v: number; c: number; i: number; f: number }                                // shown v, c (µF), i; answer f
export interface BothRow { v: number; l: number; c: number; trail: number; porch: number; f: number } // trail needs ≥ trail A, beacon ≥ porch A
export interface SteadyRow { r: number; part: 'L' | 'C'; l?: number; c?: number; f: number }          // answer f where X = R

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'choke'; assist: Assist } & ChokeRow)
  | ({ kind: 'cap'; assist: Assist } & CapRow)
  | ({ kind: 'both'; assist: Assist } & BothRow)
  | ({ kind: 'steady'; assist: Assist } & SteadyRow);
```

### 5.2 The pools (copy exactly; checked by script on 2026-10-31)

```ts
export const CHOKE: ChokeRow[][] = [
  [{ v: 220, l: 44, i: 15.9, f: 50 }, { v: 230, l: 100, i: 9.15, f: 40 }, { v: 240, l: 80, i: 8.68, f: 55 }, { v: 220, l: 60, i: 13, f: 45 }],
  [{ v: 230, l: 90, i: 11.6, f: 35 }, { v: 230, l: 65, i: 8.8, f: 64 }, { v: 220, l: 120, i: 6.08, f: 48 }, { v: 230, l: 75, i: 9.39, f: 52 }],
  [{ v: 240, l: 110, i: 8.27, f: 42 }, { v: 230, l: 45, i: 11.3, f: 72 }, { v: 230, l: 60, i: 10.5, f: 58 }, { v: 240, l: 90, i: 6.43, f: 66 }],
];
export const CAP: CapRow[][] = [
  [{ v: 220, c: 15, i: 1.04, f: 50 }, { v: 110, c: 60, i: 2.49, f: 60 }, { v: 230, c: 20, i: 1.3, f: 45 }, { v: 240, c: 25, i: 1.51, f: 40 }],
  [{ v: 220, c: 30, i: 1.49, f: 36 }, { v: 240, c: 18, i: 1.9, f: 70 }, { v: 220, c: 45, i: 3.42, f: 55 }, { v: 240, c: 20, i: 1.93, f: 64 }],
  [{ v: 230, c: 40, i: 1.85, f: 32 }, { v: 220, c: 30, i: 3.11, f: 75 }, { v: 240, c: 35, i: 2.53, f: 48 }, { v: 110, c: 80, i: 3.21, f: 58 }],
];
export const BOTH: BothRow[][] = [
  [{ v: 230, l: 80, c: 30, trail: 9.08, porch: 2.15, f: 50 }, { v: 220, l: 100, c: 25, trail: 7.87, porch: 1.51, f: 44 }, { v: 240, l: 60, c: 20, trail: 11.1, porch: 1.71, f: 57 }],
  [{ v: 220, l: 70, c: 40, trail: 13, porch: 2.07, f: 38 }, { v: 230, l: 50, c: 15, trail: 11.5, porch: 1.36, f: 63 }, { v: 240, l: 90, c: 35, trail: 9.14, porch: 2.4, f: 46 }],
  [{ v: 230, l: 120, c: 45, trail: 8.84, porch: 2.18, f: 34 }, { v: 240, l: 45, c: 18, trail: 12.4, porch: 1.83, f: 68 }, { v: 220, l: 65, c: 28, trail: 10.1, porch: 2.03, f: 53 }, { v: 230, l: 55, c: 22, trail: 10.8, porch: 1.93, f: 61 }],
];
export const STEADY: SteadyRow[][] = [
  [{ r: 30, part: 'L', l: 298, f: 16 }, { r: 40, part: 'C', c: 199, f: 20 }, { r: 25, part: 'L', l: 181, f: 22 }],
  [{ r: 50, part: 'C', c: 227, f: 14 }, { r: 35, part: 'L', l: 223, f: 25 }, { r: 20, part: 'C', c: 284, f: 28 }],
  [{ r: 45, part: 'L', l: 398, f: 18 }, { r: 30, part: 'C', c: 166, f: 32 }, { r: 60, part: 'L', l: 367, f: 26 }, { r: 40, part: 'C', c: 332, f: 12 }],
];
```

The script checked, for every row: the shown current is the true current at the answer to 3 figures and solves back to the answer within 0.2 Hz; with a ±0.6% window around the shown current exactly one whole frequency on the dial passes, and every other frequency misses by more than 1%; in level 3 the beam edge f_a lies 0.25 to 0.75 Hz above the answer and the beacon edge f_b 0.25 to 0.75 Hz below it, and no frequency leaves both lamps dim at once; in level 4 exactly one frequency gives X within 1.5% of R and every other misses by more than 2.5%; answers are never at a dial end or the start; no two pools of a level share an answer; and forgetting the 2π never lands on the answer. The pools include Ex 7.3 (44 mH, 220 V, 50 Hz, 15.9 A), Ex 7.4 (60 µF, 110 V, 60 Hz, 2.49 A) and Example 7.4 (15 µF, 220 V, 50 Hz, 1.04 A).

### 5.3 Dials, rounds and judging

```ts
export const DIAL = {
  f: { min: 20, max: 100, step: 1, start: 20 },  // levels 1 to 3, Hz
  f4: { min: 10, max: 60, step: 1, start: 10 },  // level 4, Hz
};

export function buildRounds(level: 1 | 2 | 3 | 4, random: () => number): Round[] {
  const pools = [CHOKE, CAP, BOTH, STEADY][level - 1] as unknown[][];
  const kind = (['choke', 'cap', 'both', 'steady'] as const)[level - 1];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

/** Reactances in ohms (l in mH, c in µF). */
export const xl = (lmH: number, f: number) => TWO_PI * f * lmH * 1e-3;
export const xc = (cuF: number, f: number) => 1 / (TWO_PI * f * cuF * 1e-6);
/** Level 4: the reactance of the round's choke or capacitor. */
export const xPart = (r: SteadyRow, f: number) => (r.part === 'L' ? xl(r.l!, f) : xc(r.c!, f));
/** Level 3: the frequency edges from the shown numbers (beam bright enough iff f ≤ fa, beacon iff f ≥ fb). */
export const edges = (r: BothRow) => ({ fa: r.v / (TWO_PI * r.l * 1e-3 * r.trail), fb: r.porch / (TWO_PI * r.c * 1e-6 * r.v) });

export type Fault = 'burst' | 'dim' | 'trail' | 'porch' | 'part' | 'dropper';
export type Values = { f?: number };

export function fault(r: Round, x: Values): Fault | null {
  const f = x.f!;
  if (f === r.f) return null;
  switch (r.kind) {
    case 'choke': return f < r.f ? 'burst' : 'dim';   // slower: smaller X_L, more current
    case 'cap': return f < r.f ? 'dim' : 'burst';     // slower: bigger X_C, less current
    case 'both': return f < r.f ? 'porch' : 'trail'; // slower starves the beacon, faster the trail
    case 'steady': return (r.part === 'L') === (f < r.f) ? 'part' : 'dropper'; // 'part': the choke or capacitor lamp outshone the dropper lamp
  }
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;
```

- `buildRounds` is the first use of `random` in the level (the UI test rebuilds the rounds from the seed).
- Level 3 has no burst fault: the story says these lamps can take far more than they need. `fault` returns `'porch'` below the answer and `'trail'` above it; the logic test proves this matches the physics of `edges` for every frequency on the dial.
- Level 4: for a choke, f below the answer makes X_L < R, so the choke lamp is brighter (`'part'`); for a capacitor, f below the answer makes X_C > R, so the dropper lamp is brighter (`'dropper'`).

### 5.4 Words

`fmt` from `@core/judge` (3 significant figures). `partName(r)` is `'choke'` or `'capacitor'`; `partValue(r)` is `` `${r.l} mH` `` or `` `${r.c} µF` ``.

**`goal(r)`** (the canvas goal line, UX item 1):
- choke: `` `Trail lamps need ${r.i} A` ``
- cap: `` `Porch beacon needs ${r.i} A` ``
- both: `` `Trail ≥ ${r.trail} A and beacon ≥ ${r.porch} A` ``
- steady: `` `Make the beacon steady` ``

**`intel(r)`**:
- choke: `` `The trail lamps are 12-volt lamps fed through a sealed ${r.l} mH choke, so the choke sets their current. The regulator holds ${r.v} V. They need ${r.i} A.` ``
- cap: `` `The porch beacon is a 12-volt lamp fed through a sealed ${r.c} µF capacitor, so the capacitor sets its current. The regulator holds ${r.v} V. It needs ${r.i} A.` ``
- both: `` `One turbine at ${r.v} V feeds the trail lamps through a ${r.l} mH choke and the porch beacon through a ${r.c} µF capacitor. The trail needs at least ${r.trail} A and the beacon at least ${r.porch} A.` ``
- steady: `` `One beacon lamp is fed through a resistor dropper (${r.r} Ω with its lamp), the other through a sealed ${partValue(r)} ${partName(r)}. Their currents must be equal.` ``

**Hint line**: `` `${intel(r)} ${r.assist === 0 ? 'Round 1: the lamp meter is live.' : r.assist === 1 ? 'The meter is off: a meter check costs a charge.' : 'Last party: no meter.'}` ``

**`missText(r, x)`** (the player's own frequency, then the direction):
- choke burst: `` `At ${f} Hz the choke’s reactance was too small: too much current, and a trail lamp burst. Run the turbine faster.` ``
- choke dim: `` `At ${f} Hz the choke’s reactance was too big: the trail lamps only glowed and the trekkers lost the path. Run the turbine slower.` ``
- cap dim: `` `At ${f} Hz the capacitor’s reactance was too big: the porch beacon only glowed. Run the turbine faster.` ``
- cap burst: `` `At ${f} Hz the capacitor’s reactance was too small: too much current, and the porch beacon burst. Run the turbine slower.` ``
- both porch: `` `At ${f} Hz the trail was bright, but the beacon was too dim and the trekkers walked past the door. Run the turbine a little faster.` ``
- both trail: `` `At ${f} Hz the beacon was bright, but the trail lamps were too dim and the trekkers lost the path. Run the turbine a little slower.` ``
- steady part: `` `At ${f} Hz the ${partName(r)} lamp outshone the dropper lamp, so the beacon still flickered and the snow strobed. Run the turbine ${r.part === 'L' ? 'faster' : 'slower'}.` ``
- steady dropper: `` `At ${f} Hz the dropper lamp outshone the ${partName(r)} lamp, so the beacon still flickered and the snow strobed. Run the turbine ${r.part === 'L' ? 'slower' : 'faster'}.` ``

**`meterText(r, x)`** (the paid check; the LCD shows the short form in 6.2):
- choke: `` `Meter check: at ${f} Hz the choke’s reactance is ${fmt(xl(r.l, f))} Ω and the trail lamps draw ${fmt(r.v / xl(r.l, f))} A.` ``
- cap: `` `Meter check: at ${f} Hz the capacitor’s reactance is ${fmt(xc(r.c, f))} Ω and the beacon draws ${fmt(r.v / xc(r.c, f))} A.` ``
- both: `` `Meter check: at ${f} Hz the trail lamps draw ${fmt(r.v / xl(r.l, f))} A and the beacon ${fmt(r.v / xc(r.c, f))} A.` ``
- steady: `` `Meter check: at ${f} Hz the ${partName(r)}’s reactance is ${fmt(xPart(r, f))} Ω; the dropper line has ${r.r} Ω.` ``

**`winText(r)`** (short teaching, UX item 6):
- choke: `` `The trail is lit! The choke needs X_L = V/I = ${r.v} ÷ ${r.i} = ${fmt(r.v / r.i)} Ω, and X_L = 2πfL gives f = ${fmt(r.v / r.i)} ÷ (2π × ${r.l / 1000}) = ${r.f} Hz. In a choke the current lags the voltage by a quarter cycle.` ``
- cap: `` `The beacon shines! The capacitor needs X_C = V/I = ${r.v} ÷ ${r.i} = ${fmt(r.v / r.i)} Ω, and X_C = 1/(2πfC) gives f = 1 ÷ (2π × ${r.c} × 10⁻⁶ × ${fmt(r.v / r.i)}) = ${r.f} Hz. Its current leads by a quarter cycle and peaks at √2 × ${r.i} = ${fmt(Math.SQRT2 * r.i)} A.` ``
- both: `` `Both lamps lit! X_L = 2πfL rises with f and X_C = 1/(2πfC) falls, so speeding up dims the trail and brightens the beacon. The trail needs f ≤ ${fmt(edges(r).fa)} Hz and the beacon f ≥ ${fmt(edges(r).fb)} Hz: only ${r.f} Hz does both.` ``
- steady: `` `A steady beacon! At ${r.f} Hz the ${partName(r)}’s reactance ${r.part === 'L' ? '2πfL' : '1/(2πfC)'} equals the dropper’s ${r.r} Ω, so both lamps carry the same current. Its current is a quarter cycle ${r.part === 'L' ? 'behind' : 'ahead'}, so one lamp peaks as the other goes dark (sin² + cos² = 1). The ${partName(r)} takes no average power; the dropper burns I²R.` ``

## 6. Screen and art

Canvas 640 × 340. Draw the mountain scene over `backdrop(g)` with opaque fills (the backdrop grid must not show).

```ts
export const SLUICE = { x: 250, y0: 300, y1: 160 };        // the lever's vertical slot: y0 is the dial minimum, y1 the maximum
export const leverY = (f: number, lo: number, hi: number) => SLUICE.y0 - ((f - lo) / (hi - lo)) * (SLUICE.y0 - SLUICE.y1);
export const SHED = { x: 228, y: 196, w: 120, h: 104 };     // the turbine shed (top-left corner, size)
export const TURBINE = { x: 310, y: 262, r: 24 };           // the turbine wheel inside the shed
export const GAUGE = { x: 300, y: 214, r: 15 };             // the frequency gauge on the shed: needle at the player's f, 0 to 100 Hz
export const LODGE = { x: 14, y: 150, w: 140, h: 150 };     // the stone lodge (door centre at (120, 270))
export const PORCH = { x: 120, y: 226 };                    // the red porch beacon over the door
export const ROOF = { a: [44, 146], b: [92, 146] };         // level 4: the two roof beacon lamps (dropper lamp a, choke/capacitor lamp b)
export const CHOKE_BOX = { x: 372, y: 214 };                // the sealed choke on its post (centre)
export const CAP_CAN = { x: 168, y: 222 };                  // the sealed capacitor can on the lodge wall (centre)
export const TRAIL: [number, number][] = [[630, 312], [560, 296], [490, 282], [420, 268], [350, 304], [190, 312], [124, 296]]; // right edge to the door
export const LAMPS: [number, number][] = [[560, 268], [490, 254], [420, 240], [350, 276]]; // trail lamp heads on their posts
export const LCD = { x: 360, y: 150, w: 150, h: 18 };       // the lamp meter (the helper)
```

### 6.1 The set

- **Mountains**: two layers of jagged peaks (far `#1b2350`, near `#232c63`) across the top half, a snowfield (`#dfe6ff` at alpha 0.85) from y = 300 down, and the stream: a pale-blue band falling from (330, 60) down the slope into the shed's chute.
- **Times of day (UX item 8)**: round 1 dusk (sky `#2a1f5c` to `#d9824a` near the peaks), round 2 moonlit night (`#0b1030` to `#1d2556`, a moon at (560, 60)), round 3 the boss: a full blizzard (sky `#11163a`, twice as many snowflakes, wind streaks across the screen, the lodge's prayer flags whipping on a line from the roof to (220, 150)).
- **Snow**: 60 flakes (120 in round 3), each at a position computed from its index and `t` (no `Math.random`): `x = (i * 97 + t * 40) % 660 - 10`, `y = (i * 53 + t * (30 + i % 20)) % 350 - 10`, radius 1 to 2.
- **The lodge** (left): stone walls, a slate roof, a glowing window, a wooden door, prayer flags (five colours) on a line from the roof ridge. Norbu the yak stands in front of it.
- **The shed** at `SHED`: rough stone with a wooden door, an opening showing the turbine wheel, the water chute above it, the regulator box with the supply plate `` `${v} V` `` at (262, 212) (levels 1 to 3), and the frequency gauge at `GAUGE` (a small dial 0 to 100 Hz; its needle shows the player's f).
- **The sluice lever**: a brass slot along `SLUICE` with marks every 10 Hz (small ticks, no numbers except the two ends, 11 px), a T-grip handle at `leverY(f)`.
- **The choke** (levels 1, 3 and 4 when `part = 'L'`): a grey box on a post at `CHOKE_BOX` with copper windings drawn on its side and a plate `` `CHOKE ${l} mH` `` (level 3: `CHOKE` only, see 6.4 item 4).
- **The capacitor** (levels 2, 3 and 4 when `part = 'C'`): a silver can on the lodge wall at `CAP_CAN` with a plate `` `CAP ${c} µF` `` (level 3: `CAP` only).
- **The trail**: a trodden path through the snow along `TRAIL`, with four lamp posts whose heads are at `LAMPS` (levels 1 and 3). The lamps are dark until the take.
- **Level 4**: the two roof beacon lamps at `ROOF.a` and `ROOF.b`; under lamp a, a resistor dropper (a black grille with a plate `` `R ${r} Ω` ``); under lamp b, the choke or the capacitor with its plate. The trail lamps are not drawn.

### 6.2 The helper (the lamp meter at `LCD`, green digits on black, 12 px)

| Round | LCD |
|---|---|
| 1 (`assist 0`) | live: choke `` `trail ${fmt(r.v / xl(r.l, f))} A` ``; cap `` `beacon ${fmt(r.v / xc(r.c, f))} A` ``; both `` `trail ${fmt(…)} A · beacon ${fmt(…)} A` ``; steady `` `X ${fmt(xPart(r, f))} Ω · R ${r.r} Ω` `` |
| 2 (`assist 1`) | `— — —`, except for 1.5 s after a meter check, when it shows the live text in `PAL.yellow`. Use `paidFlash()` and `helperOn()` from `@core/aidflash`. |
| 3 (`assist 2`) | `— — —` always. The meter check button gets the engine's `No charges left this round.` |

The LCD is the only place a lamp's current or a reactance appears before Fire. Set `canvas.dataset.lcd` to `'1'` while the live text is drawn and `'0'` otherwise.

### 6.3 The take (`rt` = seconds since fire)

- **All levels**, 0.00 to 0.25: Dolma heaves the lever, `CLUNK` at (250, 150) on the first frame (UX item 5). 0.00 to 0.50: white water rushes down the chute and the turbine spins up to its fixed take speed. At 0.50 the lamp switch closes and the lamps come on.
- **Level 1** (trail lamps) and **level 2** (porch beacon):
  - **burst**: 0.50 to 0.60 the lamp(s) flash white; at 0.60 `POP!` floater, glass shards (`A.burst(x, y, PAL.white, 10, 120)` at each lamp), then dark; Dolma is startled; the trekkers stop and huddle with a `?`; Norbu turns his back. Verdict at **0.65**.
  - **dim**: the lamps glow at `GLOW.dim`. From 0.60 the trekkers walk the first part of the trail; at the second lamp (0.90) they veer off and topple into a drift (1.15, `FLUMP`). Verdict at **1.15**.
  - **win**: the lamps blaze at `GLOW.right` with a soft halo (radius 18, alpha 0.25). From 0.60 the trekkers walk the whole `TRAIL` to the door (0.60 to 1.80). Verdict at **1.00**. `NAMASTE!` at 1.80.
- **Level 3**: the trail lamps and the beacon light together at 0.50, each at `GLOW.right` or `GLOW.dim` by the fault (`'trail'` dims the trail lamps, `'porch'` dims the beacon).
  - **trail**: as level 1 dim. Verdict at **1.15**.
  - **porch**: the trekkers walk the lit trail (0.60 to 1.30), then pass the dark door and topple into the drift beside the lodge (1.40, `FLUMP`). Verdict at **1.40**.
  - **win**: as level 1 win. Verdict at **1.00**.
- **Level 4**: both roof lamps come on at 0.50.
  - **miss**: the beacon pulses at a fixed 2 Hz between alpha 0.3 and 1 (both lamps together, whatever the fault); flakes within 120 px of the beacon are drawn brighter in step with the pulse; the brighter lamp (lamp b for `'part'`, lamp a for `'dropper'`) is drawn 4 px larger; the trekkers stop and shield their eyes (`WHICH WAY?` at 0.90). Verdict at **1.00**.
  - **win**: both lamps glow steadily; a small inset (120 × 50 at (420, 70), dark panel) draws the two lamp-brightness curves sin² and cos² and their flat sum, labelled `sin² + cos² = 1` (drawn only on a win); the trekkers walk to the door. Verdict at **1.00**.
- `delay: (r, x) => { const f = fault(r, x); return f === 'burst' ? 0.65 : f === 'dim' || f === 'trail' ? 1.15 : f === 'porch' ? 1.4 : 1.0; }`.
- Everything ends by 2.3 s.

### 6.4 UX checklist (README items 1 to 10)

1. **Goal line**: `goal(r)` at (320, 30), 13 px bold, `PAL.white`, on a dark pill (`rgba(6,10,36,0.8)`, 300 × 20) from round start until Fire.
2. **Own setting by its handle**: `` `${f} Hz` `` 14 px to the right of the lever's T-grip, at (`SLUICE.x + 26`, `leverY(f) + 4`), 13 px bold `PAL.yellow`; the gauge needle shows the same f. Given facts drawn the same way, on their own plates: the supply `${v} V`, the choke `${l} mH`, the capacitor `${c} µF`, the dropper `R ${r} Ω`.
3. **Handle**: `{ dial: 'f', at: (_r, v) => [SLUICE.x, leverY(v.f, lo, hi)], drag: (_r, _px, py) => lo + ((SLUICE.y0 - py) / (SLUICE.y0 - SLUICE.y1)) * (hi - lo), radius: 20 }`, with lo, hi = 20, 100 (levels 1 to 3) or 10, 60 (level 4). Draw a ring of radius 20 with ⇕ arrows above and below; solid `PAL.yellow` while dragged. In level 1 round 1 the grip pulses with a small `drag` label (11 px) beside it until the first pointerdown on the canvas.
4. **Text**: every scene label ≥ 11 px; the LCD 12 px. Labels never sit on Dolma (x 180 to 234, y 246 to 318), the trekkers, or the lamps. **At most 3 given numbers on screen**: level 1 shows the goal current, the choke's mH and the supply V; level 2 the goal current, the capacitor's µF and V; level 3 only the two goal currents (the choke and capacitor plates read `CHOKE` and `CAP`, and L, C and V are in the hint line under the canvas); level 4 only R and the choke's mH or capacitor's µF.
5. **Instant response**: the lever moves and `CLUNK` appears on the first frame after Fire; a burst, a glow, a flicker and a blaze never look alike.
6. **Teaching**: `winText` is two or three short sentences; every miss text ends with the direction to turn the turbine.
7. **Living hero**: Dolma's idle, action and moods in section 4; the trekkers, the yak, the snow and the turbine always move.
8. **Rounds look different**: dusk, moonlit night, blizzard (boss). The trekkers' jackets swap colours each round (orange-cyan-yellow, then green-pink-white, then red-yellow-cyan).
9. **Accessibility**: the slider (keyboard), aria-labels on every button, `ARIA` in section 7.
10. **Comfort**: the burst flash covers only the lamps (radius 24, alpha ≤ 0.45, 0.1 s); the level 4 flicker is 2 Hz; the blizzard's wind streaks are thin lines at alpha 0.2.

### 6.5 What must never show

- No answer frequency is drawn or marked on the lever, the gauge or anywhere else. The lever's slot has unlabelled ticks.
- Before Fire every lamp is dark, whatever the setting. Lamp brightness takes only the fixed values of section 3.
- The level 4 inset with sin², cos² and their sum is drawn only on a win.
- The turbine's take speed is the same for every setting.
- `hit` is the fixed point `[320, 80]` in every level.

## 7. Controls and mount

| Level | dial |
|---|---|
| 1 to 3 | `{ key: 'f', aria: 'Turbine frequency in hertz', label: 'Turbine', unit: 'Hz', step: 1, min: 20, max: 100, start: 20 }` |
| 4 | `{ key: 'f', aria: 'Turbine frequency in hertz', label: 'Turbine', unit: 'Hz', step: 1, min: 10, max: 60, start: 10 }` |

Common to every level:
- `hero: { name: 'Dolma', role: ROLE, ...HEROES[n - 1] }`, `charges: [1, 1, 0]`.
- `test: { button: '🔎 Meter check', aria: 'Meter check: read the lamp meter for this frequency', read: (r, v) => { flash.paid(); return meterText(r, v); } }` with `const flash = paidFlash()` per level.
- `fire: { button: '💡 Light the lamps', aria: 'Open the sluice and switch on the lamps' }`.
- `judge`, `miss: missText`, `win: winText`, `hint`, `hit: () => [320, 80]`, `delay` from 6.3, `draw`.
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(4, ctx.level)) as 1 | 2 | 3 | 4; return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA); } })`.
- `ARIA = 'A snowbound mountain lodge at night: its keeper stands at the sluice lever of a small water turbine, and a roped party of trekkers waits on the trail for the lamps to light.'`

## 8. game.json

Copy `rebuilds/json/reactance-lab.json` exactly. Its lengths were checked by script (see the designer's report).

## 9. Tests

### 9.1 `logic.test.ts`

1. **Pools**: for every row, `fmt` of the true current at the answer equals the shown current (`fmt(r.v / xl(r.l, r.f)) === String(r.i)`, and the same for `cap`); solving back from the shown numbers gives the answer within 0.2 Hz; for level 3, `edges(r).fa − r.f` and `r.f − edges(r).fb` are both between 0.25 and 0.75; for level 4, `|xPart(r, r.f)/r.r − 1| < 0.015`.
2. **One winner**: for every row, scan every whole frequency of its dial; only the answer passes `judge`, and the start fails.
3. **Physics matches `fault`**: for every row and every frequency on the dial, `'burst'` happens exactly when the true current exceeds the shown current by more than 1% and `'dim'` exactly when it is more than 1% short (levels 1, 2); in level 3, `'trail'` exactly when the true trail current is below `r.trail` and `'porch'` exactly when the beacon current is below `r.porch`; in level 4, `'part'` exactly when the choke or capacitor lamp's current V/X exceeds the dropper's V/R.
4. **Disjoint pools**: within each level, no answer appears in two pools.
5. **Rounds**: 80 seeds (`i * 7919 + 13`): three rounds of the level's kind, `assist` `[0, 1, 2]`, round k from pool k.
6. **Words**: for every row and every wrong f, `missText` contains `` `${f} Hz` `` and never the answer token `` `${r.f} Hz` `` (regex with a `(^|[^0-9.])` lead, so `50 Hz` does not match `150 Hz`), and ends with `faster.` or `slower.`; `winText` contains `2πfL` (choke), `1/(2πfC)` (cap), `rises with f` (both) and `quarter cycle` (steady). `GLOW` is exactly `{ dim: 0.25, right: 1 }`.

### 9.2 `tests/reactance-lab-ui.test.ts`

Use `arcadeHarness(game, 'reactance-lab', 4)` and `shellTests` as in `tests/capacitor-bench-ui.test.ts`. `setRight` sets the slider to `r.f`; `setWrong` sets it to `r.f + 1`. `commit: () => h.click('Open the sluice and switch on the lamps')`.

Then `describe('Lights of the High Pass', …)`:
- Levels 1 to 3 slide 20 to 100 and start at 20; level 4 slides 10 to 60 and starts at 10.
- Level 1 at 20 Hz gives a miss containing `burst`; level 2 at 20 Hz gives a miss containing `only glowed`.
- A meter check costs a charge: `/Meter check/`, then a second press says `/No charges left/`.
- A win says `The trail is lit!` (level 1), `The beacon shines!` (level 2), `Both lamps lit!` (level 3) and `A steady beacon!` (level 4).
- **Canvas recorder** (`tests/helpers/canvas-rec.ts`): the LCD's live text (`/ A$/` in levels 1 and 2, `/ A · beacon /` in level 3, `/^X .* Ω · R /` in level 4) is drawn in round 1, in round 2 only within 1.5 s after a meter check, and never in round 3. No drawn text ever contains `` `${r.f} Hz` `` unless the player's own setting is `r.f`. The goal line `goal(r)` is drawn at round start. In level 3, no drawn text contains `mH` or `µF`. The string `sin² + cos² = 1` is drawn only after a level 4 win.

## 10. Traps to avoid

- **The dial is the frequency in every level**, never L or C: the choke and capacitor are sealed.
- **Directions differ**: in level 1 slower means more current (burst); in level 2 slower means less current (dim). Do not copy one level's fault rule into the other.
- **Fixed effects**: lamp glow, the trekkers' paths and the level 4 flicker take only the fixed forms above. Never scale them with the error.
- **Level 3 has no burst** and **level 4 does not need V**: do not draw a supply plate in level 4.
- **Low-voltage lamps**: keep the words "12-volt lamps" in the intel; they are why the choke or capacitor alone sets the current.
- **Pools**: copy them exactly. Do not round `15.9`, `1.04` or `2.49`: they are the book's examples.
- **Timing**: the latest verdict is 1.40 s; every animation ends by 2.3 s.
- **Docs**: do not edit `docs/curriculum/physics-class-12/ch07-concept-weights.md`; the reviewer updates it.
