# Ch 4 · Field Maker rebuilt as "Turtle Compass" (§4.4, 4.5; Examples 4.4, 4.5, 4.6; Ex 4.1)

Read `../README.md` first (every rule, above all "A miss must not show the answer either", "Helpers fade" and the "UX checklist"), then `README.md` in this folder. The model rebuild is `src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-bench/` (brief `../20-capacitor-bench.md`). Everything below is required unless marked optional. If a number here does not work, stop and report it; do not improvise.

The old Field Maker was a number-entry quiz (type the field, pick out of or into the page). This brief **replaces the whole game** with an arcade game in a sea-turtle research lab. It keeps the id, folder and `order`, and every concept: the Biot–Savart law for a current element with its direction, the field at the centre of a coil B = μ₀NI/2R with the right-hand thumb rule, the arc (its fraction of the loop field, straight leads in line with the centre give nothing, the other way round reverses it), the field on the axis falling off from the centre value, and two coils with one centre adding or subtracting.

The setting is real science: hatchling sea turtles read the Earth's magnetic field (its size and whether it points down into or up out of the sea floor) to know where they are, and researchers test them in tanks surrounded by coils that copy the field of a place in the ocean.

## 1. Identity

| Field | Value |
|---|---|
| Game id | `field-maker` (unchanged), `order: 1` (unchanged) |
| Folder | `src/games/physics/class-12/ch04-moving-charges-and-magnetism/field-maker/` (existing) |
| Files | **Replace** `game.json` with `docs/curriculum/gap-designs/rebuilds/json/field-maker.json` (exact copy). **Delete and rewrite** `logic.ts`, `logic.test.ts`, `index.ts`. **Add** `art.ts`. |
| UI test | **Delete** `tests/fieldmaker-ui.test.ts`. **Create** `tests/field-maker-ui.test.ts`. |
| Engine | `mountDialLevel` from `@core/dialgame`, one `DialLevel` per level (5 levels); `paidFlash`, `helperOn` from `@core/aidflash` |
| Book coverage | §4.4 (Biot–Savart law, dl × r, μ₀/4π = 10⁻⁷; Example 4.4), §4.5 (field on the axis of a loop and at its centre, the right-hand thumb rule; Ex 4.1; Examples 4.5, 4.6) |
| Inspiration (code comment only) | Creature-care games where you tune a habitat until the pet is happy, and "lead the critter home" puzzle games (the hatchling swims for the right exit only when the world is set up right) |
| Core verb | **Wind and bend wire**: set a trim wire's current and direction (L1), wind turns onto a coil and set its current's sense (L2, L4, L5), bend a wire into an arc by dragging its end round the circle (L3); then press **Switch on** and watch the hatchling choose a gate. No other chapter 4 game winds or bends a coil. |

Search the repo for `field-maker/logic` before deleting the old `logic.ts`. On 2026-10-31 only its own `logic.test.ts` and `tests/fieldmaker-ui.test.ts` import it.

## 2. What the student learns

- Biot–Savart: a short element dl carrying I makes dB = (μ₀/4π) I dl sin θ/r² at a point a distance r away, θ being the angle between dl and the line to the point. It points along dl × r: fingers along the current, bent towards the point, thumb along the field. μ₀/4π = 10⁻⁷ T m/A.
- Every turn of a tight coil adds μ₀I/2R at the centre, so B = μ₀NI/2R. Right-hand thumb rule: curl the fingers along the current; the thumb gives the field. Seen from above, an anticlockwise current makes a field pointing up.
- An arc of angle φ gives φ/360 of the loop field at its centre. Straight leads that point at the centre add nothing (dl × r = 0). Current round the arc the other way reverses the field.
- On the axis, B = μ₀NIR²/2(R² + x²)^(3/2): at x = 0 it is the centre value, and it falls off as the point moves away.
- Fields of coils with one centre add when their currents go the same way and subtract when they go opposite ways; the bigger one decides the direction.
- (From the setting, a real fact) The Earth's field points down into the ground in the northern hemisphere and up out of it in the southern, and its size is about 25 to 65 µT. 1 µT = 10⁻⁶ T, 1 nT = 10⁻⁹ T.

## 3. The mechanic, physically

**Leilani** is a marine biologist at a beach research station. Tonight's hatchlings must be released at dawn, but first each one is tested in a round tank inside a shielded lab, where a coil around the tank is the only magnetic field. The star of the night is **Nui**, a loggerhead hatchling. When the field at the tank's centre is exactly the field of home (its size and its direction), Nui swims straight for the gate marked `OPEN SEA`. Each round is one **trial**.

| Level | The player sets | What decides the trial |
|---|---|---|
| 1 The trim wire | the trim wire's current I and its direction (→ or ←) | Before the trials, the probe at the tank's centre must read a small calibration field from a short trim wire: dB = 10⁻⁷ I dl sin θ/r², up or down by dl × r. |
| 2 Wind the coil | the turns N and the current's sense (↻ or ↺ seen from above) | B = μ₀NI/2R at the centre, up for ↺ and down for ↻. |
| 3 Bend an arc | the arc's angle φ (drag its end round the circle) and the sense | B = (φ/360) μ₀I/2R; the radial leads add nothing. |
| 4 Raise the tank | the turns N and the sense | The tank sits x above the coil on its axis: B = μ₀NIR²/2(R² + x²)^(3/2). |
| 5 Two coils | the outer coil's turns and sense | The inner coil's field is fixed; the outer one adds to it, takes away from it, or overpowers it. |

Physical consequences. Every miss shows what the player's own setting did, and only its direction; every effect takes a **fixed** form, never one proportional to the error:
- **Weak** (field too small, right direction): Nui swims for the `SHALLOWS` gate (upper left) and bumps its net (`bonk`). L1: the probe's needle stops at a fixed 45% of the way to its mark.
- **Strong** (field too big, right direction): Nui swims for the `ROCKS` gate (upper right) and bumps its net. L1: the needle overshoots to a fixed 135%.
- **Flip** (field the wrong way): Nui paddles in two tight circles, lost (`?`): it has felt the other hemisphere's field. L1: the needle swings to the mirror position on the wrong side.

## 4. Story and characters

Hero banner: `name: 'Leilani'`, `role: 'a marine biologist who tests sea-turtle hatchlings in a coil-wrapped tank before their dawn release'`.

| Level | story | objective |
|---|---|---|
| 1 | `A sea-turtle hatchling knows where it is from the Earth’s magnetic field: how strong it is, and whether it points down into the sea floor or up out of it. In Leilani’s shielded lab a coil around the tank makes the only field. First she calibrates the probe at the tank’s centre with a short trim wire. A current element makes dB = (μ₀/4π) I dl sin θ/r², pointing along dl × r.` | `Set the trim wire’s current and its direction so the probe reads the calibration field, in three tries.` |
| 2 | `The first trial. Nui, a loggerhead hatchling, swims for the open sea only if the tank holds the field of home. Every turn of the coil adds μ₀I/2R at the centre, so B = μ₀NI/2R. Curl your right fingers along the current and the thumb points along the field: anticlockwise seen from above points up.` | `Wind the coil and set its current’s sense so Nui feels home and swims for the open sea, in three trials.` |
| 3 | `The coil frame cracked, so Leilani bends a single thick wire into an arc instead. Each part of the arc adds to the field at the centre, so an arc of φ degrees gives φ/360 of the loop’s μ₀I/2R. The straight leads point at the centre: for them dl × r = 0, and they add nothing.` | `Drag the arc round the circle and set the current’s sense to make the field of home, in three trials.` |
| 4 | `The new hatchlings are too lively for the shallow tank, so it sits on a stand above the coil, on its axis. There the field is weaker: B = μ₀NIR²/2(R² + x²)^(3/2), which at x = 0 is the centre value μ₀NI/2R.` | `Wind the coil so the raised tank holds the field of home, in three trials.` |
| 5 | `Dawn is close, and the last hatchlings need fields from far across the ocean. A second coil around the first shares its centre and carries the same current. With the currents the same way their fields add; opposite ways, they subtract, and the bigger one wins.` | `Wind the outer coil and set its sense so the two fields together make the field of home, in three trials.` |

Characters (each in its own function in `art.ts`, AGENTS.md item 17):
- **Leilani** (hero) stands at the bottom left, feet at `LEI` (52, 318), about 76 px tall.
  - Gear: dark hair in a bun with a pencil through it; a headlamp with a **red** lamp (turtle-safe light); a teal field vest with pockets and a turtle patch over a white T-shirt; khaki shorts; green rubber boots; a clipboard under her left arm; a small remote control in her right hand.
  - Idle: breathes (chest 1 px, `sin(t·2)`); the headlamp's faint red cone (alpha 0.08) sweeps the floor ±10° every 4 s; blinks every 3 s; taps the clipboard with the pencil every 5 s.
  - Action (on fire, 0.00 to 0.10 s): she raises the remote and presses it; a `CLICK` floater rises at (92, 232); the supply's lamp turns green.
  - Moods: `face(…, 'happy')` while waiting; `'cheer'` on a win (a 4 px hop, clipboard raised); `'worried'` with a sweat drop on any miss.
- **Nui** (the target) is a loggerhead hatchling about 22 px long, seen from above in the tank in levels 2 to 5: a brown oval shell (18 × 14) with a darker hexagon pattern, four flippers, a head with two dark eyes.
  - Idle: the flippers paddle (front pair ±20° at 2 Hz), Nui swims a slow circle of radius 10 px round the tank's centre, blinks every 2 s.
  - Win: turns to face the `OPEN SEA` gate, swims straight out through it, and a `♥` floater rises.
  - Weak or strong: swims to the `SHALLOWS` or `ROCKS` gate, bumps the net (shell wobbles ±10° for 0.3 s), `bonk` floater, eyes become `x x` for 0.5 s; a red `✗` appears on that gate.
  - Flip: paddles two tight circles (radius 16 px) at the centre, `?` floater, eyes spin.
  - Level 1: Nui sits in a bucket at `BUCKET`, seen from the side with head and front flippers over the rim. Win: claps its flippers. Miss: pulls its head into its shell for 0.6 s.
- **The bucket hatchlings** (decor at `BUCKET` in levels 2 to 5): one hatchling head peeks over the rim in round 1, two in round 2, three in round 3; they bob every 2 s and turn to watch the tank during a trial.

## 5. Rules (`logic.ts`)

### 5.1 Constants and types

```ts
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const MU0 = 4 * Math.PI * 1e-7; // T m/A
const DEG = Math.PI / 180;

export interface TrimRow { dl: number; r: number; th: 30 | 90 | 150; side: 'north' | 'south'; up: boolean; nt: number; dir: 0 | 1; i: number }
// dl and r in cm; th, the angle from the wire's +x direction to the line to the probe; side: where the probe is from the wire
// (north = up the screen); nt, the calibration field in nT (up = out of the tank floor). Answer: dir (1 = current →) and i (A).
export interface CoilRow { i: number; R: number; ut: number; up: boolean; sense: 0 | 1; n: number }
// i in A, R in cm, ut in µT. Answer: sense (1 = anticlockwise seen from above) and n turns.
export interface ArcRow { i: number; R: number; ut: number; up: boolean; sense: 0 | 1; deg: number }
// Answer: sense and deg, the arc's angle (the arc always starts at the east end and runs anticlockwise on screen).
export interface AxisRow { R: number; x: number; i: number; ut: number; up: boolean; sense: 0 | 1; n: number }
// x, the tank's height above the coil on its axis, in cm. Answer: sense and n.
export interface PairRow { n1: number; R1: number; s1: 0 | 1; R2: number; i: number; ut: number; up: boolean; sense: 0 | 1; n: number }
// The inner coil (n1 turns, R1 cm, sense s1) is fixed; both coils carry i. Answer: the outer coil's sense and n.

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'trim'; assist: Assist } & TrimRow)
  | ({ kind: 'coil'; assist: Assist } & CoilRow)
  | ({ kind: 'arc'; assist: Assist } & ArcRow)
  | ({ kind: 'axis'; assist: Assist } & AxisRow)
  | ({ kind: 'pair'; assist: Assist } & PairRow);
```

### 5.2 The pools (copy exactly)

Every row was checked by script on 2026-10-31 (`rebuild-checks/ch04/fm-final-check.mjs`). The checks are listed after the pools and in section 9.

```ts
export const TRIM: TrimRow[][] = [
  [
    { dl: 1, r: 50, th: 90, side: 'north', up: true, nt: 40, dir: 1, i: 10 }, { dl: 2, r: 40, th: 90, side: 'south', up: true, nt: 100, dir: 0, i: 8 },
    { dl: 1, r: 25, th: 90, side: 'north', up: false, nt: 80, dir: 0, i: 5 }, { dl: 5, r: 100, th: 90, side: 'south', up: false, nt: 60, dir: 1, i: 12 },
  ],
  [
    { dl: 2, r: 50, th: 30, side: 'north', up: false, nt: 60, dir: 0, i: 15 }, { dl: 4, r: 80, th: 150, side: 'south', up: true, nt: 50, dir: 0, i: 16 },
    { dl: 3, r: 60, th: 30, side: 'north', up: true, nt: 75, dir: 1, i: 18 }, { dl: 1, r: 20, th: 150, side: 'south', up: false, nt: 175, dir: 1, i: 14 },
  ],
  [
    { dl: 2.5, r: 50, th: 30, side: 'south', up: true, nt: 120, dir: 0, i: 24 }, { dl: 1.5, r: 30, th: 90, side: 'north', up: false, nt: 333, dir: 0, i: 20 },
    { dl: 4, r: 40, th: 150, side: 'north', up: true, nt: 275, dir: 1, i: 22 }, { dl: 5, r: 50, th: 90, side: 'south', up: false, nt: 120, dir: 1, i: 6 },
  ],
];

export const COIL: CoilRow[][] = [
  [{ i: 0.4, R: 10, ut: 50.3, up: false, sense: 0, n: 20 }, { i: 0.5, R: 15, ut: 52.4, up: true, sense: 1, n: 25 }, { i: 0.2, R: 12, ut: 47.1, up: false, sense: 0, n: 45 }, { i: 0.3, R: 20, ut: 47.1, up: true, sense: 1, n: 50 }],
  [{ i: 0.25, R: 10, ut: 47.1, up: false, sense: 0, n: 30 }, { i: 0.5, R: 25, ut: 50.3, up: true, sense: 1, n: 40 }, { i: 0.4, R: 30, ut: 46.1, up: false, sense: 0, n: 55 }, { i: 0.2, R: 15, ut: 50.3, up: true, sense: 1, n: 60 }],
  [{ i: 1, R: 40, ut: 55, up: false, sense: 0, n: 35 }, { i: 0.75, R: 25, ut: 28.3, up: true, sense: 1, n: 15 }, { i: 0.5, R: 45, ut: 52.4, up: true, sense: 1, n: 75 }, { i: 0.6, R: 45, ut: 54.5, up: false, sense: 0, n: 65 }],
];

export const ARC: ArcRow[][] = [
  [{ i: 12, R: 10, ut: 50.3, up: false, sense: 0, deg: 240 }, { i: 10, R: 12, ut: 39.3, up: true, sense: 1, deg: 270 }, { i: 8, R: 9, ut: 46.5, up: false, sense: 0, deg: 300 }, { i: 9, R: 12, ut: 35.3, up: false, sense: 0, deg: 270 }],
  [{ i: 12, R: 10, ut: 37.7, up: true, sense: 1, deg: 180 }, { i: 9, R: 8, ut: 29.5, up: false, sense: 0, deg: 150 }, { i: 6, R: 5, ut: 25.1, up: true, sense: 1, deg: 120 }, { i: 20, R: 8, ut: 39.3, up: false, sense: 0, deg: 90 }],
  [{ i: 20, R: 24, ut: 48, up: true, sense: 1, deg: 330 }, { i: 40, R: 12, ut: 34.9, up: false, sense: 0, deg: 60 }, { i: 15, R: 20, ut: 27.5, up: true, sense: 1, deg: 210 }, { i: 18, R: 25, ut: 41.5, up: false, sense: 0, deg: 330 }],
];

export const AXIS: AxisRow[][] = [
  [{ R: 12, x: 9, i: 0.5, ut: 53.6, up: false, sense: 0, n: 40 }, { R: 16, x: 12, i: 0.8, ut: 48.3, up: true, sense: 1, n: 30 }, { R: 12, x: 5, i: 0.3, ut: 43.2, up: false, sense: 0, n: 35 }, { R: 20, x: 15, i: 1, ut: 40.2, up: true, sense: 1, n: 25 }],
  [{ R: 15, x: 20, i: 0.5, ut: 54.3, up: false, sense: 0, n: 120 }, { R: 15, x: 8, i: 0.4, ut: 51.8, up: true, sense: 1, n: 45 }, { R: 24, x: 10, i: 1, ut: 41.2, up: false, sense: 0, n: 20 }, { R: 9, x: 12, i: 0.4, ut: 45.2, up: true, sense: 1, n: 75 }],
  [{ R: 20, x: 21, i: 1, ut: 51.5, up: false, sense: 0, n: 50 }, { R: 24, x: 7, i: 0.5, ut: 63.7, up: true, sense: 1, n: 55 }, { R: 10, x: 24, i: 1, ut: 50, up: false, sense: 0, n: 140 }, { R: 18, x: 24, i: 0.8, ut: 51.3, up: true, sense: 1, n: 85 }],
];

// Pool 0: the outer coil adds (same sense, stronger). Pool 1: it takes away (opposite, weaker, same way as the inner coil).
// Pool 2: it overpowers (opposite and stronger: the net field reverses).
export const PAIR: PairRow[][] = [
  [
    { n1: 20, R1: 10, s1: 1, R2: 20, i: 0.35, ut: 60.5, up: true, sense: 1, n: 15 }, { n1: 15, R1: 8, s1: 0, R2: 16, i: 0.3, ut: 58.9, up: false, sense: 0, n: 20 },
    { n1: 10, R1: 6, s1: 1, R2: 15, i: 0.3, ut: 62.8, up: true, sense: 1, n: 25 }, { n1: 25, R1: 12, s1: 0, R2: 24, i: 0.25, ut: 52.4, up: false, sense: 0, n: 30 },
  ],
  [
    { n1: 30, R1: 10, s1: 1, R2: 20, i: 0.4, ut: 31.4, up: true, sense: 0, n: 35 }, { n1: 40, R1: 12, s1: 0, R2: 25, i: 0.3, ut: 28.9, up: false, sense: 1, n: 45 },
    { n1: 25, R1: 8, s1: 1, R2: 18, i: 0.5, ut: 28.4, up: true, sense: 0, n: 40 }, { n1: 50, R1: 15, s1: 0, R2: 30, i: 0.2, ut: 14.7, up: false, sense: 1, n: 65 },
  ],
  [
    { n1: 10, R1: 10, s1: 1, R2: 15, i: 0.4, ut: 58.6, up: false, sense: 0, n: 50 }, { n1: 15, R1: 12, s1: 0, R2: 20, i: 0.4, ut: 37.7, up: true, sense: 1, n: 55 },
    { n1: 20, R1: 15, s1: 1, R2: 25, i: 0.6, ut: 40.2, up: false, sense: 0, n: 60 }, { n1: 10, R1: 8, s1: 0, R2: 16, i: 0.3, ut: 58.9, up: true, sense: 1, n: 70 },
  ],
];
```

What the script proved (repeat in `logic.test.ts`):
- Every displayed target (`nt`, `ut`) is the row's field at the answer, to 3 figures, and solves back to the answer within 0.2 of a dial step; neighbouring dial values (±1 A, ±5 turns, ±30°) give a field more than 2% different.
- `up` agrees with the answer's direction (`dir`, `sense`) and is wrong for the other direction.
- L4: the "forgot the fall-off" trap, `Math.round(ut / (μ₀I/2R in µT) / 5) · 5`, never equals the answer.
- L5: the pool kinds hold (add, take away, overpower); the inner coil's field shown to 3 figures with the target gives back the outer turns within 0.1 turn; no other setting gives a net field within 2% of the target in the same direction.
- Every level: exactly one winning setting over the full dial grid, the start never wins, no answer sits at a dial end (other than on a binary dial), no two pools of a level share an answer, and the binary answer (`dir` or `sense`) is mixed within every pool.

### 5.3 Physics, rounds and judging

```ts
export const DIAL = {
  dir: { min: 0, max: 1, start: 0 },              // L1: 1 = current →, 0 = current ←
  i: { min: 1, max: 30, step: 1, start: 1 },       // L1, A
  sense: { min: 0, max: 1, start: 0 },            // L2 to L5: 1 = anticlockwise ↺ seen from above, 0 = clockwise ↻
  n: { min: 5, max: 150, step: 5, start: 5 },      // L2, L4, L5 turns
  deg: { min: 30, max: 360, step: 30, start: 30 }, // L3 arc angle
};

/** L1: the trim wire's field at the probe, in nT. */
export const trimNT = (r: TrimRow, i: number) => ((1e-7 * i * (r.dl / 100) * Math.sin(r.th * DEG)) / (r.r / 100) ** 2) * 1e9;
/** L1: true when dl × r points up (out of the tank floor) for this current direction. */
export const trimUp = (r: TrimRow, dir: number) => (dir === 1) === (r.side === 'north');
/** The field at the centre of a coil of n turns, radius R cm, current i, in µT (L2; also the inner and outer coils of L5). */
export const centreUT = (n: number, i: number, R: number) => ((MU0 * n * i) / (2 * (R / 100))) * 1e6;
/** L3: an arc of deg degrees. */
export const arcUT = (r: ArcRow, deg: number) => (deg / 360) * centreUT(1, r.i, r.R);
/** L4: on the axis, x cm from the centre. */
export const axisUT = (r: AxisRow, n: number) => ((MU0 * n * r.i * (r.R / 100) ** 2) / (2 * ((r.R / 100) ** 2 + (r.x / 100) ** 2) ** 1.5)) * 1e6;
/** L4: the fraction of the centre value that reaches the tank. */
export const axisFraction = (r: AxisRow) => r.R ** 3 / (r.R ** 2 + r.x ** 2) ** 1.5;
/** L5: the inner coil alone, and the signed net field (positive = up) with the outer coil set to (sense, n). */
export const innerUT = (r: PairRow) => centreUT(r.n1, r.i, r.R1);
export const netUT = (r: PairRow, sense: number, n: number) => innerUT(r) * (r.s1 ? 1 : -1) + centreUT(n, r.i, r.R2) * (sense ? 1 : -1);

const POOLS = [TRIM, COIL, ARC, AXIS, PAIR] as unknown[][][];
const KINDS = ['trim', 'coil', 'arc', 'axis', 'pair'] as const;
export function buildRounds(level: 1 | 2 | 3 | 4 | 5, random: () => number): Round[] {
  return POOLS[level - 1].map((pool, k) => ({ ...(pick(pool, random) as object), kind: KINDS[level - 1], assist: aid(k) }) as Round);
}

export type Fault = 'flip' | 'weak' | 'strong';
export type Values = { dir?: number; i?: number; sense?: number; n?: number; deg?: number };

export function fault(r: Round, x: Values): Fault | null {
  switch (r.kind) {
    case 'trim':
      if (trimUp(r, x.dir!) !== r.up) return 'flip';
      return x.i === r.i ? null : x.i! < r.i ? 'weak' : 'strong';
    case 'coil':
    case 'axis':
      if ((x.sense === 1) !== r.up) return 'flip';
      return x.n === r.n ? null : x.n! < r.n ? 'weak' : 'strong';
    case 'arc':
      if ((x.sense === 1) !== r.up) return 'flip';
      return x.deg === r.deg ? null : x.deg! < r.deg ? 'weak' : 'strong';
    case 'pair': {
      const b = netUT(r, x.sense!, x.n!);
      if (Math.abs(b) < 1e-9 || (b > 0) !== r.up) return 'flip'; // one pool-0 row nets exactly zero with the other sense
      if (x.sense === r.sense && x.n === r.n) return null;
      return Math.abs(b) < r.ut ? 'weak' : 'strong';
    }
  }
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;
```

- Dial values are whole numbers in every level, so `===` is safe.
- L1 to L4 check the direction first: a field the wrong way is `flip` whatever its size.
- L5 judges the **net** field: a wrong sense can still point the right way (then it is `weak` or `strong`), and the right sense with too many turns can reverse the net (then `flip`). Only the answer wins (the script proved no other setting lands within 2% of the target in the right direction).
- `buildRounds` must be the **first** use of `random` in the level.
- Start settings: L1 `dir 0, i 1`; L2, L4, L5 `sense 0, n 5`; L3 `sense 0, deg 30`. None of them wins on any row (tested).

### 5.4 Words

`fmt` from `@core/judge`. Helper words:
- `upWord(up)`: `up ? '⊙ up' : '⊗ down'` (up means out of the tank floor, toward the viewer).
- `senseWord(s)`: `s ? 'anticlockwise ↺' : 'clockwise ↻'` (always "seen from above").
- `dirWord(d)`: `d ? 'flowing →' : 'flowing ←'`.
- `angleOf(r)`: `r.th === 90 ? 90 : 30` (the angle between the wire and the line to the probe; 150° rows are 30° on the other side).

**`goal(r)`** (the canvas goal line; each at most 40 characters):
- trim: `` `Calibrate the probe: ${r.nt} nT ${upWord(r.up)}` ``
- coil, arc: `` `Home field: ${r.ut} µT ${upWord(r.up)}` ``
- axis: `` `Raised tank: ${r.ut} µT ${upWord(r.up)}` ``
- pair: `` `Two coils: ${r.ut} µT ${upWord(r.up)}` ``

**`card(r)`** (the lab card's lines, 12 px, section 6.1; the given facts):
- trim: `` [`trim wire ${r.dl} cm long`, `${r.r} cm from the probe`, `wire to probe line: ${angleOf(r)}°`] ``
- coil: `` [`coil radius ${r.R} cm`, `current ${r.i} A`] ``
- arc: `` [`arc radius ${r.R} cm`, `current ${r.i} A`, `leads point at the centre`] ``
- axis: `` [`coil radius ${r.R} cm`, `current ${r.i} A`, `tank ${r.x} cm above the coil`] ``
- pair: `` [`inner coil alone: ${fmt(innerUT(r))} µT ${upWord(!!r.s1)}`, `outer coil radius ${r.R2} cm`, `current ${r.i} A in each coil`] ``

**`intel(r)`**:
- trim: `` `A ${r.dl} cm trim wire lies ${r.r} cm from the probe, ${r.side === 'north' ? 'south' : 'north'} of it, and the line from the wire to the probe makes ${angleOf(r)}° with the wire. The probe must read ${r.nt} nT, ${upWord(r.up)}.` ``
- coil: `` `The coil has a radius of ${r.R} cm and carries ${r.i} A. Nui’s home field is ${r.ut} µT, ${upWord(r.up)}.` ``
- arc: `` `The arc has a radius of ${r.R} cm and carries ${r.i} A; its straight leads point at the centre. Nui’s home field is ${r.ut} µT, ${upWord(r.up)}.` ``
- axis: `` `The coil has a radius of ${r.R} cm and carries ${r.i} A. The tank sits ${r.x} cm above it, on its axis. The home field there is ${r.ut} µT, ${upWord(r.up)}.` ``
- pair: `` `Alone, the inner coil makes ${fmt(innerUT(r))} µT, ${upWord(!!r.s1)}. The outer coil has a radius of ${r.R2} cm and the same ${r.i} A. The home field is ${r.ut} µT, ${upWord(r.up)}.` ``

**Hint line**: `` `${intel(r)} ${r.assist === 0 ? 'Round 1: the field meter is live.' : r.assist === 1 ? 'The meter is off: a meter check costs a charge.' : 'Last trial: no meter.'}` ``

**`missText(r, x)`** (the player's own setting, what it did, what to change; never the answer):
- trim flip: `` `With the current ${dirWord(x.dir!)}, dl × r made the field point the other way at the probe: the needle swung backwards. Reverse the current.` ``
- trim weak: `` `At ${x.i} A the field at the probe was too small: the needle stopped short of the mark. Use more current.` ``
- trim strong: `` `At ${x.i} A the field at the probe was too big: the needle overshot the mark. Use less current.` ``
- coil flip: `` `With the current ${senseWord(x.sense!)}, the field pointed the other way: that is the other hemisphere’s field, and Nui swam in circles. Reverse the current.` ``
- coil weak: `` `With ${x.n} turns the field at the centre was too weak: Nui swam for the shallows. Wind more turns.` ``
- coil strong: `` `With ${x.n} turns the field at the centre was too strong: Nui swam for the rocks. Wind fewer turns.` ``
- arc flip: `` `With the current ${senseWord(x.sense!)}, the arc’s field pointed the other way: Nui swam in circles. Reverse the current.` ``
- arc weak: `` `A ${x.deg}° arc gave too small a share of the loop’s field: Nui swam for the shallows. Bend a longer arc.` ``
- arc strong: `` `A ${x.deg}° arc gave too big a share of the loop’s field: Nui swam for the rocks. Bend a shorter arc.` ``
- axis flip: `` `With the current ${senseWord(x.sense!)}, the field at the raised tank pointed the other way: Nui swam in circles. Reverse the current.` ``
- axis weak: `` `With ${x.n} turns the field up at the tank was too weak: Nui swam for the shallows. Wind more turns.` ``
- axis strong: `` `With ${x.n} turns the field up at the tank was too strong: Nui swam for the rocks. Wind fewer turns.` ``
- pair flip: `` `With the outer coil ${senseWord(x.sense!)} and ${x.n} turns, the two fields together pointed the wrong way: Nui swam in circles. Think about which coil wins.` ``
- pair weak: `` `With the outer coil ${senseWord(x.sense!)} and ${x.n} turns, the net field was too weak: Nui swam for the shallows. Make the net field stronger.` ``
- pair strong: `` `With the outer coil ${senseWord(x.sense!)} and ${x.n} turns, the net field was too strong: Nui swam for the rocks. Make the net field weaker.` ``

**`meterText(r, x)`** (the meter check, a charge):
- trim: `` `Meter check: ${x.i} A ${dirWord(x.dir!)} makes ${fmt(trimNT(r, x.i!))} nT at the probe, ${upWord(trimUp(r, x.dir!))}.` ``
- coil: `` `Meter check: ${x.n} turns ${senseWord(x.sense!)} make ${fmt(centreUT(x.n!, r.i, r.R))} µT at the centre, ${upWord(x.sense === 1)}.` ``
- arc: `` `Meter check: a ${x.deg}° arc ${senseWord(x.sense!)} makes ${fmt(arcUT(r, x.deg!))} µT at the centre, ${upWord(x.sense === 1)}.` ``
- axis: `` `Meter check: ${x.n} turns ${senseWord(x.sense!)} make ${fmt(axisUT(r, x.n!))} µT at the raised tank, ${upWord(x.sense === 1)}.` ``
- pair: `` `Meter check: with the outer coil ${senseWord(x.sense!)} and ${x.n} turns, the net field is ${fmt(Math.abs(netUT(r, x.sense!, x.n!)))} µT, ${upWord(netUT(r, x.sense!, x.n!) > 0)}.` ``

**`winText(r)`** (two or three sentences):
- trim: `` `Calibrated! dB = (μ₀/4π) I dl sin θ/r² = 10⁻⁷ × ${r.i} × ${fmt(r.dl / 100)} × sin ${angleOf(r)}° ÷ ${fmt(r.r / 100)}² = ${r.nt} nT. With the current ${dirWord(r.dir)}, dl × r points ${r.up ? 'up' : 'down'} at the probe.` ``
- coil: `` `Nui swims for the open sea! B = μ₀NI/2R, so N = 2RB/μ₀I = 2 × ${fmt(r.R / 100)} × ${r.ut} × 10⁻⁶ ÷ (4π × 10⁻⁷ × ${r.i}) = ${r.n} turns. Curl your right fingers ${r.sense ? 'anticlockwise' : 'clockwise'} and the thumb points ${r.up ? 'up' : 'down'}.` ``
- arc: `` `Nui swims for the open sea! The straight leads point at the centre, so dl × r = 0 and they add nothing. A ${r.deg}° arc gives ${r.deg}/360 of μ₀I/2R = ${fmt(centreUT(1, r.i, r.R))} µT, which is ${r.ut} µT, ${r.up ? 'up' : 'down'} for a current ${r.sense ? 'anticlockwise' : 'clockwise'}.` ``
- axis: `` `Nui swims for the open sea! On the axis B = μ₀NIR²/2(R² + x²)^(3/2), only ${fmt(axisFraction(r))} of the centre value μ₀NI/2R, so it takes ${r.n} turns to make ${r.ut} µT ${r.x} cm up.` ``
- pair: `` `Nui swims for the open sea! The inner coil gives ${fmt(innerUT(r))} µT ${r.s1 ? 'up' : 'down'}, and the outer coil, ${r.n} turns ${r.sense === r.s1 ? 'the same way, adds' : 'the opposite way, takes away'} ${fmt(centreUT(r.n, r.i, r.R2))} µT. Net: ${r.ut} µT, ${r.up ? 'up' : 'down'}.` ``

## 6. Screen and art

Canvas 640 × 340 (`mountDialLevel`). The scene is the lab **seen from above** (the tank, the coils, the bench), with Leilani and the bucket drawn upright, as in many top-down games. **Draw it over the engine background with opaque fills**, so the engine grid never shows.

```ts
export const LEI = { x: 52, feet: 318 };                  // Leilani, about 76 px tall (x 16 to 90, y 242 to 318)
export const TANK = { x: 320, y: 176, r: 84 };             // the round hatchling tank (top view)
export const COIL_R = 102;                                  // the coil's drawn radius in L2 to L4; L3's arc lies on this circle
export const INNER_R = 98;                                  // L5 inner coil
export const OUTER_R = 118;                                 // L5 outer coil (the player's)
export const GATES = { sea: 90, shallows: 150, rocks: 30 }; // gate angles on the tank rim, degrees anticlockwise from east
export const gatePt = (deg: number): [number, number] => [TANK.x + TANK.r * Math.cos(deg * Math.PI / 180), TANK.y - TANK.r * Math.sin(deg * Math.PI / 180)];
export const CARD = { x: 12, y: 40, w: 170, h: 84 };       // the lab card with the round's given facts (top left)
export const LCD = { x: 458, y: 296, w: 172, h: 20 };      // the field meter on the cart: the helper
export const SUPPLY = { x: 476, y: 196, w: 70, h: 56 };    // the coil supply box
export const KNOB = { x: 511, y: 224 };                    // its sense knob (L1: the trim current's direction)
export const TRK = { x0: 160, x1: 440, y: 326 };           // bottom handle track: L1 current, L2/L4/L5 turns
export const BUCKET = { x: 150, y: 256 };                  // the hatchling bucket (centre of its rim)
export const GAUGE = { x: 560, y: 150, r: 40 };            // L1: the probe's dial gauge
export const PROBE_D = 120;                                 // L1: the trim wire's drawn distance from the probe (a picture, not to scale)
export const SIDE = { x: 470, y: 40, w: 160, h: 100 };     // L4: the side-view inset (top right)
export const GOAL = { x: 320, y: 22 };
export const HIT: [number, number] = [320, 56];
```

### 6.1 The set

- **The lab**: a dark blue-grey floor `#141c2e` with faint tile lines every 40 px (drawn by the game, opaque), a strip of window at the top right (x 470 to 630, y 0 to 30) showing the sea at night (dark blue with a moon reflection, tinted by round, 6.4). A small sign `SHIELDED ROOM` (11 px) at (560, 36) in levels 1 to 3 and 5.
- **The tank** at `TANK`: a pale rim (4 px, `#cfe3f0`) and water (round tint, 6.4) with three gates on the rim at `gatePt(GATES.sea)`, `gatePt(GATES.shallows)`, `gatePt(GATES.rocks)`: each a 22 px gap. `OPEN SEA` is an open channel with little wave marks and the label `OPEN SEA` (11 px) just inside the tank below it; `SHALLOWS` and `ROCKS` are closed by a mesh net (crossed grey lines), labelled inside the tank (11 px).
- **The coil** (L2 and L4): a copper band 8 px wide on the circle `COIL_R`, with 4 small white sense arrows on it showing the player's sense (`↺` or `↻` direction of travel). Its drawn thickness never changes with N. A winding reel icon at the left end of `TRK`.
- **The arc** (L3): a copper wire 6 px wide on the circle `COIL_R`, from 0° (east) anticlockwise to the player's angle φ, with sense arrows. Two **straight leads** run radially outward from its ends to radius 150 (the 0° lead to (470, 176), then into the supply; the φ lead out to radius 150, then round outside the tank to the supply), each with a small tag `lead → centre` (11 px) the first time the level opens (round 1 only). A faint dotted guide circle (alpha 0.25) shows the rest of the circle; it has no ticks or numbers.
- **The two coils** (L5): the inner coil on `INNER_R` with its fixed sense arrows (`r.s1`), labelled `inner` (11 px); the outer coil on `OUTER_R` with the player's sense arrows, labelled `outer` (11 px).
- **The trim wire** (L1): a copper rod 36 px long, horizontal, centred at `wireAt(r)` = (`TANK.x − PROBE_D · cos(r.th°)`, `TANK.y + s · PROBE_D · sin(r.th°)`) where `s = r.side === 'north' ? 1 : −1` (the probe is north, up the screen, of the wire when `side` is north). A dashed line (alpha 0.5) runs from its middle to the probe (a small black sensor puck with a green LED at the tank's centre), with an arc marking the angle between the wire and that line, labelled `` `${angleOf(r)}°` `` (12 px). Small red and black leads run from the wire's ends to the supply. In L1 the tank has no coil switched on; draw the coil dim (alpha 0.3) as decor.
- **The gauge** (L1) at `GAUGE`: a round dial with a scale from `⊗ down` (left end) through `0` (top) to `⊙ up` (right end), all words 11 px, no numbers. A green **target wedge** sits at +60° (right of top) for an `up` row and −60° for a `down` row: the given fact. The needle rests at 0.
- **The supply** at `SUPPLY`: a grey box with a lamp, a small analogue ammeter face (no numbers), and the **knob** at `KNOB` with its labels under the box at y 266 (11 px): L1 `← current →`; L2 to L5 `↻  seen from above  ↺`.
- **The lab card** at `CARD`: a cream card with a teal header `TRIAL CARD` (11 px) and the lines of `card(r)` in 12 px dark text.
- **The bucket** at `BUCKET`: a blue plastic bucket (40 × 34) with a handle; the bucket hatchlings or (L1) Nui.
- **L4 side inset** at `SIDE`: a dark card titled `side view` (11 px): the coil edge-on as a flat copper ellipse near its bottom, a vertical dashed axis, the tank as a small glass box on a stand above it, and two dimension arrows labelled `R` and `x` (letters only; the numbers are on the lab card).

### 6.2 The helper (the field meter at `LCD`)

| Round | Field meter |
|---|---|
| 1 (`assist 0`) | live: `lcdText(r, v)` in `PAL.green` |
| 2 (`assist 1`) | `— — —`, except for 1.5 s after a meter check, when it shows `lcdText(r, v)` in `PAL.yellow` |
| 3 (`assist 2`) | `— — —` always; the check button gives `A.freeNote('No charges left this round.')` through the engine (charges `[1, 1, 0]`) |

`lcdText(r, v)` (12 px; export it with `LCD_OFF = '— — —'`):
- trim: `` `${fmt(trimNT(r, v.i))} nT ${upWord(trimUp(r, v.dir))}` ``
- coil: `` `${fmt(centreUT(v.n, r.i, r.R))} µT ${upWord(v.sense === 1)}` ``
- arc: `` `${fmt(arcUT(r, v.deg))} µT ${upWord(v.sense === 1)}` ``
- axis: `` `${fmt(axisUT(r, v.n))} µT ${upWord(v.sense === 1)}` ``
- pair: `` `net ${fmt(Math.abs(netUT(r, v.sense, v.n)))} µT ${upWord(netUT(r, v.sense, v.n) > 0)}` ``

The meter is the **only** place the field made by the player's setting appears before a trial. Use `const flash = paidFlash()` per level, call `flash.paid()` in `test.read`, compute `since = flash.since(t, k)` once per frame in `draw`, and `live = !shot && helperOn(r.assist, false, since)`. Set `A.canvas.dataset.lcd = live ? '1' : '0'` every frame.

### 6.3 The trial (`rt` = seconds since fire)

- **0.00 to 0.10, every level**: Leilani presses the remote (`CLICK`), and the supply's lamp turns green (UX item 5). On a win also call `A.sound('win')` at the verdict.
- **Level 1**:
  - 0.10 to 0.50: yellow dots run along the trim wire in the player's direction.
  - 0.50 to 0.90: the gauge needle swings from 0 to a **fixed** position: win, the target wedge (±60°); weak, 45% of the way (±27°); strong, 135% (±81°); flip, the mirror of the wedge (∓60°) on the wrong side.
  - 0.90: win, a green `CALIBRATED` stamp at the gauge and Nui claps in the bucket; miss, a red `OFF` lamp at the gauge and Nui hides in its shell.
  - Verdict at **0.90**.
- **Levels 2 to 5**:
  - 0.10 to 0.50: bright dots (8 per coil) run round each coil in its sense (one turn every 0.8 s; anticlockwise for sense 1), and the coil glows. A 3 × 3 grid of field symbols fades in over the tank's middle (±40 px, 12 px, alpha 0.45): `⊙` if the field the player made points up, `⊗` if down (L5: the net field).
  - 0.50 to 1.20, Nui, by fault: win, turns to the `OPEN SEA` gate (0.50 to 0.70) and swims straight through it (0.70 to 1.20); weak, swims to the `SHALLOWS` gate and bumps its net at 1.20; strong, the same to `ROCKS`; flip, two tight circles at the centre (0.50 to 1.30) with `?` at 1.00. The paths are straight lines from Nui's position to the gate point (fixed), never depending on the player's value.
  - Verdict at **1.20**.
- `delay: (r) => (r.kind === 'trim' ? 0.9 : 1.2)` (export as `verdictDelay`). Everything ends by 2.3 s (the win: Nui's wake ripples fade by 2.2 s).

### 6.4 Rounds that look different (UX item 8)

Detect `k` inside `draw`:
- Round 1, **moonrise**: the window shows a low yellow moon; tank water `#1d4f7a`; one bucket hatchling.
- Round 2, **midnight**: the window shows a high white moon and stars; tank water `#1a466e`; two bucket hatchlings; a small desk lamp glows on the cart.
- Round 3, the boss, **just before dawn**: the window turns pink-orange at its bottom; tank water `#244f78`; three bucket hatchlings; a banner `DAWN RELEASE` (11 px, `PAL.pink`) under the window at (550, 44).

### 6.5 What must never show

- No answer is drawn: no target current, turn count or arc angle, except the player's own settings and the given facts on the lab card and in the goal.
- No field symbols over the tank before fire (they show only during a trial, and only the field the player made).
- Nui's paths, the needle's positions and the gates chosen take the fixed forms of 6.3, never values proportional to the player's setting.
- The arc's guide circle has no ticks or numbers; the coil's drawn thickness never follows N.
- `hit` is the fixed point `HIT` in every level.

### 6.6 Art functions (`art.ts`)

`lab(g, t, k)`, `tank(g, t, k)`, `gates(g, failed)`, `coilRing(g, radius, sense, t, live)`, `arcWire(g, deg, sense, t, live)`, `trimWire(g, r, dir, t, live)`, `probe(g)`, `gauge(g, r, needleDeg)`, `supply(g, r, value, on)`, `labCard(g, lines)`, `fieldMeter(g, text, color)`, `sideInset(g)`, `bucket(g, k, t, mood)`, `nui(g, x, y, heading, t, mood)`, `leilani(g, t, o)`, `goalLine(g, text)`, `handleGrip(g, x, y, glyph, hot)`. Keep each under about 80 lines.

### 6.7 UX checklist (all ten items; logical canvas pixels)

1. **Goal on the canvas**: `goalLine(g, goal(r))` at `GOAL` (320, 22), 13 px bold `PAL.white` on a dark rounded plate (`rgba(0,0,0,0.6)`, 10 px padding), from round start until fire, and again when the round is replayed after a miss.
2. **Own setting beside its handle** (12 px `PAL.yellow`): L1 `` `${i} A` `` 16 px above the TRK handle and `→`/`←` beside the knob; L2, L4, L5 `` `${n} turns` `` 16 px above the TRK handle and `↺`/`↻` beside the knob; L3 `` `${deg}°` `` 18 px outside the arc's end handle and `↺`/`↻` beside the knob. Given facts sit on the lab card and in the goal.
3. **Handles**: every handle has `radius: 20`; the game draws `handleGrip` (a white 2 px ring with a 12 px glyph): `⇔` for the TRK handle and the knob, `↻` for the arc's end. While dragged (last `drag` call under 0.15 s ago) the ring fills with `rgba(255,210,63,0.35)`. In level 1 round 1, until the first `drag`, a bubble `drag ⇔` (12 px `PAL.yellow`) bobs 30 px above the TRK handle.
4. **Legible text**: all scene text is 11 px or more, light on dark or dark on the cream card. Labels stay clear of Leilani (x 16 to 90, y 242 to 318), the bucket, Nui and the gates' channels. Colour always comes with a symbol or word (`⊙ up`, `⊗ down`, `↺`, `↻`, `→`, `←`, `OPEN SEA`, `✗`). Numbers on screen besides the player's own settings: L2 and L3 three (on the card and in the goal); L1, L4 and L5 four, all on the single lab card plus the goal, because each is needed for the working.
5. **Instant response**: the remote press, the floater and the supply lamp start on the first frame after fire; the verdict lands at the impact (Nui reaching a gate, the needle stopping); a win (`♥`, `CALIBRATED`, `A.sound('win')`) never looks or sounds like a miss (`bonk`, circles, `OFF`, the engine's `bad`).
6. **Teaching**: `winText` is at most three sentences; every `missText` ends with what to change.
7. **Living hero**: Leilani, Nui and the bucket hatchlings idle every frame, react to fire and show a mood after every verdict (section 4).
8. **Variety**: section 6.4.
9. **Accessibility**: every slider and button has the aria-label of section 7; the sliders are the engine's range inputs (keyboard). When `window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches`, skip the headlamp sweep, the bucket bobbing and Nui's idle circle (Nui still swims during a trial).
10. **Comfort**: no flashes in this game. Nothing blinks faster than 3 times a second (the LEDs and blinks every 2 s or slower).

## 7. Controls and mount

Write five functions `trim`, `coil`, `arc`, `axis` and `pair`, each `(random: () => number) => DialLevel<Round>`, each starting with `const rounds = buildRounds(n, random)`. A local helper `trk(key, lo, hi)` returns `{ dial: key, at: (_r, v) => [TRK.x0 + ((v[key] - lo) / (hi - lo)) * (TRK.x1 - TRK.x0), TRK.y], drag: (_r, px) => lo + ((px - TRK.x0) / (TRK.x1 - TRK.x0)) * (hi - lo), radius: 20 }`, and `knob(key)` returns `{ dial: key, at: (_r, v) => [KNOB.x + (v[key] ? 14 : -14), KNOB.y], drag: (_r, px) => (px > KNOB.x ? 1 : 0), radius: 20 }`.

| Level | dials | handles |
|---|---|---|
| 1 | `{ key: 'dir', aria: 'Trim wire current direction: 1 left to right, 0 right to left', label: 'Direction', unit: '', step: 1, min: 0, max: 1, start: 0, text: (x) => (x ? 'left to right →' : 'right to left ←') }`, `{ key: 'i', aria: 'Trim wire current in amperes', label: 'Current', unit: 'A', step: 1, min: 1, max: 30, start: 1 }` | `knob('dir')`, `trk('i', 1, 30)` |
| 2, 4 | `{ key: 'sense', aria: 'Coil current seen from above: 1 anticlockwise, 0 clockwise', label: 'Sense', unit: '', step: 1, min: 0, max: 1, start: 0, text: (x) => (x ? 'anticlockwise ↺' : 'clockwise ↻') }`, `{ key: 'n', aria: 'Number of turns on the coil', label: 'Turns', unit: '', step: 5, min: 5, max: 150, start: 5, text: (x) => `${x} turns` }` | `knob('sense')`, `trk('n', 5, 150)` |
| 3 | the `sense` dial as above, `{ key: 'deg', aria: 'Angle of the arc in degrees', label: 'Arc', unit: '°', step: 30, min: 30, max: 360, start: 30 }` | `knob('sense')`; the arc's end: `{ dial: 'deg', at: (_r, v) => [TANK.x + COIL_R * Math.cos(v.deg * Math.PI / 180), TANK.y - COIL_R * Math.sin(v.deg * Math.PI / 180)], drag: (_r, px, py) => { const a = (Math.atan2(TANK.y - py, px - TANK.x) * 180) / Math.PI; return a <= 0 ? a + 360 : a; }, radius: 20 }` |
| 5 | `{ key: 'sense', aria: 'Outer coil current seen from above: 1 anticlockwise, 0 clockwise', label: 'Outer sense', … }` and `{ key: 'n', aria: 'Number of turns on the outer coil', label: 'Outer turns', … }`, otherwise as L2 | `knob('sense')`, `trk('n', 5, 150)` |

The engine clamps and snaps every drag (`slider.set`), so an angle just above east becomes 30° and one just below it becomes 360°. Every `drag` also records the clock for the highlight and clears the level 1 round 1 cue.

Common to every level:
- `hero: { name: 'Leilani', role: ROLE, ...HEROES[n - 1] }` with the role and stories of section 4; `charges: [1, 1, 0]`.
- `test: { button: '🔎 Meter check', aria: 'Meter check: read the field meter for this setting', read: (r, v) => { flash.paid(); return meterText(r, v); } }`.
- `fire: { button: '🐢 Switch on', aria: 'Switch on the coil and start the trial' }`.
- `judge`, `miss: missText`, `win: winText`, `hint`, `hit: () => HIT`, `delay: verdictDelay`, and `draw`.
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(5, ctx.level)) as 1 | 2 | 3 | 4 | 5; return mountDialLevel(ctx as never, [trim, coil, arc, axis, pair][n - 1](ctx.random) as never, ARIA); } })`.
- `ARIA = 'A sea-turtle lab seen from above: a biologist beside a round tank wrapped in a coil of wire, where a hatchling swims for one of three gates.'`

## 8. game.json

Copy `docs/curriculum/gap-designs/rebuilds/json/field-maker.json` over the existing `game.json`, exactly. Its lengths were checked by script on 2026-10-31: summary 122 characters, learningOutcome 170 with a curly apostrophe, `adds` 74/101/122/111/126, 3 hints per level (the longest 122), 6 concepts (the longest 58), 5 misconceptions; the title "Turtle Compass" and the summary are unique against every `game.json` in `src/games` and `rebuilds/json/`. It keeps `order: 1` and `ncertRef: "Section 4.4, Magnetic field due to a current element, Biot-Savart law"`.

## 9. Tests

### 9.1 `logic.test.ts`

1. **Pools** (every row): `Number(trimNT(r, r.i).toPrecision(3)) === r.nt`; `Number(centreUT(r.n, r.i, r.R).toPrecision(3)) === r.ut` (coil); `Number(arcUT(r, r.deg).toPrecision(3)) === r.ut`; `Number(axisUT(r, r.n).toPrecision(3)) === r.ut`; `Number(Math.abs(netUT(r, r.sense, r.n)).toPrecision(3)) === r.ut` and `(netUT(r, r.sense, r.n) > 0) === r.up` (pair). The direction: `trimUp(r, r.dir) === r.up` and `trimUp(r, 1 − r.dir) !== r.up`; `(r.sense === 1) === r.up` for coil, arc and axis. The axis trap: `Math.round(r.ut / centreUT(1, r.i, r.R) / 5) * 5 !== r.n`. The pair kinds: pool 0 `r.sense === r.s1` and the net is bigger than `innerUT(r)`; pool 1 `r.sense !== r.s1`, the net is smaller and points the inner coil's way; pool 2 `r.sense !== r.s1` and the net points the other way.
2. **One winner**: scan every reachable setting (L1 dir 0, 1 × i 1 to 30; L2, L4, L5 sense 0, 1 × n 5 to 150 in 5; L3 sense 0, 1 × deg 30 to 360 in 30). Only the answer passes `judge`; the start fails.
3. **Rounds**: 80 seeds `Array.from({ length: 80 }, (_, i) => i * 7919 + 13)`. Each level has 3 rounds of its kind, `assist` is `[0, 1, 2]`, round k's row comes from pool k, and no two rounds of a level have the same answer.
4. **Faults**: the right size with the other direction gives `flip` (L1 to L4); one step below gives `weak`, one step above `strong`. L5: the answer's n with the other sense never wins; assert with `fault` that it gives `strong` in pool 1, `flip` in pool 2, and `weak` or `flip` in pool 0 (row 3 of pool 0 nets exactly zero that way, which must count as `flip`).
5. **Words**: for every row and every wrong setting, `missText` never contains the answer token: `` `${r.i} A` `` (L1), `` `${r.n} turns` `` (L2, L4, L5), `` `${r.deg}°` `` (L3), unless it is the player's own value in that text; use regexes with a leading `(^|[^0-9.])`. `winText` contains `dl × r` (trim), `B = μ₀NI/2R` (coil), `add nothing` (arc), `(R² + x²)^(3/2)` (axis) and `Net:` (pair). Every `goal(r)` is at most 40 characters.

### 9.2 `tests/field-maker-ui.test.ts`

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/field-maker/index';
import { buildRounds, type Round } from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/field-maker/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'field-maker', 5);
type L = 1 | 2 | 3 | 4 | 5;
const build = (level: number, seed: number) => buildRounds(level as L, createRng(seed));
const FIRE = 'Switch on the coil and start the trial';
const TEST = 'Meter check: read the field meter for this setting';
function set(r: Round, right: boolean) {
  if (r.kind === 'trim') { h.setSlider(r.dir, 0); h.setSlider(right ? r.i : r.i + 1, 1); }
  else if (r.kind === 'arc') { h.setSlider(r.sense, 0); h.setSlider(right ? r.deg : r.deg + 30, 1); }
  else { h.setSlider(r.sense, 0); h.setSlider(right ? r.n : r.n + 5, 1); }
}
shellTests<Round[]>(h, { levels: [1, 2, 3, 4, 5], build, setRight: (g, k) => set(g[k], true), setWrong: (g, k) => set(g[k], false), commit: () => h.click(FIRE) });
```

Then `describe('Turtle Compass', …)`, copying the patterns of `tests/capacitor-bench-ui.test.ts`:
- Level 1 has `Direction` (0 to 1, start 0) and `Current` (1 to 30, start 1); level 3 has `Sense` and `Arc` (30 to 360, step 30, start 30); level 5 has `Outer sense` and `Outer turns` (5 to 150, step 5, start 5).
- In level 2, the right turns with the other sense gives a miss containing `Reverse the current`, and the hearts drop to 2.
- A meter check costs a charge: `/Meter check:/`, then `/No charges left/`.
- A win says `Calibrated!` in level 1 and `Nui swims for the open sea!` in levels 2 to 5.
- The verdict lands at the impact: in level 2, after `h.advance(1.1)` the hearts are still 3 on a miss; after another 0.2 s they are 2.
- **Canvas recorder**: the meter's live text (`/^[\d.]+ nT [⊙⊗]/` in L1, `/^[\d.]+ µT [⊙⊗]/` in L2 to L4, `/^net [\d.]+ µT/` in L5) is drawn in round 1, in round 2 only within 1.5 s after a meter check, and never in round 3. No text drawn before fire contains the answer token (`` `${r.i} A` `` in L1, `` `${r.n} turns` `` in L2, L4, L5, `` `${r.deg}°` `` in L3) while the player's value differs. The goal line is drawn at round start in every level. No `⊙` or `⊗` symbol is drawn inside the tank (|x − 320| < 84 and |y − 176| < 84) before fire.

## 10. Traps to avoid

- **Fixed reactions**: Nui's paths go to the three fixed gate points (or the two fixed circles), and the L1 needle takes the four fixed angles. Never scale a path, a needle angle or a symbol count with the player's value.
- **Direction words**: "up" is out of the tank floor, toward the viewer (`⊙`); seen from above, anticlockwise current gives up. Do not swap them.
- **L1 geometry**: the wire's position comes from `r.th` and `r.side`; the label shows the acute angle (`angleOf`), because sin 150° = sin 30°. The direction comes only from `trimUp`.
- **L3 drag near east**: `atan2` gives values near 0 or 360 there; return `a + 360` for `a ≤ 0` so the engine snaps correctly.
- **L5 is judged on the net field**: use `netUT` for the meter, the field symbols and the faults. The inner coil's field is a given fact on the card (rounded with `fmt`).
- **No numbers on the arc**: the guide circle has no degree ticks; the player's own `deg°` label is the only angle on screen in L3.
- **Timing**: the latest verdict is 1.20 s; everything ends by 2.3 s.
- **Docs**: do not edit `docs/curriculum/physics-class-12/ch04-concept-weights.md`; the reviewer updates it.
