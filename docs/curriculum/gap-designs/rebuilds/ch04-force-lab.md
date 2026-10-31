# Ch 4 · Force Lab rebuilt as "Beam Hall" (§4.2, 4.3; Examples 4.1, 4.2, 4.3; Ex 4.5, 4.6, 4.11, 4.12)

Read `../README.md` first (every rule, above all "A miss must not show the answer either", "Helpers fade" and the "UX checklist"), then `README.md` in this folder. The model rebuild is `src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-bench/` (brief `../20-capacitor-bench.md`). Everything below is required unless marked optional. If a number here does not work, stop and report it; do not improvise.

The old Force Lab was a number-entry quiz (type a direction, type a force, type a radius). This brief **replaces the whole game** with an arcade game in a hospital's proton-therapy beam hall. It keeps the id, folder and `order`, and every concept: the direction and size of F = qv × B for protons and electrons, the force on a wire F = BIl sin θ balanced against its weight, r = mv/qB, the lap frequency qB/2πm that does not depend on speed, the faster particle on a bigger circle in the same time, and the helix (radius from v sin θ, pitch from v cos θ). It adds one item the book states in §4.3: the magnetic force does no work, so it bends a path without changing the speed.

## 1. Identity

| Field | Value |
|---|---|
| Game id | `force-lab` (unchanged), `order: 1` (unchanged) |
| Folder | `src/games/physics/class-12/ch04-moving-charges-and-magnetism/force-lab/` (existing) |
| Files | **Replace** `game.json` with `docs/curriculum/gap-designs/rebuilds/json/force-lab.json` (exact copy). **Delete and rewrite** `logic.ts`, `logic.test.ts`, `index.ts`. **Add** `art.ts`. |
| UI test | **Delete** `tests/force-ui.test.ts`. **Create** `tests/force-lab-ui.test.ts`. |
| Engine | `mountDialLevel` from `@core/dialgame`, one `DialLevel` per level (5 levels); `paidFlash`, `helperOn` from `@core/aidflash` |
| Book coverage | §4.2.2 (F = q v × B, reversed for a negative charge; Example 4.2), §4.2.3 (F = BIl sin θ; Example 4.1; Ex 4.5, 4.6), §4.3 (no work done; r = mv/qB; ω = qB/m independent of speed; the helix and its pitch; Example 4.3; Ex 4.11, 4.12), Summary point 3 (the cyclotron uses this frequency) |
| Inspiration (code comment only) | Pinball and marble-run games (bend a ball into the right lane with a flipper), the beam-steering puzzles of sci-fi lab games, and rhythm games for the cyclotron (the kick must land on the beat of every lap) |
| Core verb | **Steer a beam with a magnet**: flip the magnet's polarity and turn its strength (L1), set a current's direction and size (L2), set the magnet and the RF beat (L3), slide the extraction port and set the RF (L4), turn the focusing coil (L5); then press **Power on** and watch the beam fly. No other chapter 4 game steers a moving beam. |

Search the repo for `force-lab/logic` before deleting the old `logic.ts`. On 2026-10-31 only its own `logic.test.ts` and `tests/force-ui.test.ts` import it.

## 2. What the student learns

- A charge moving through a magnetic field feels F = q v × B: at right angles to both v and B, of size qvB when v ⟂ B. A negative electron is pushed the opposite way to a proton with the same velocity.
- The push is always at right angles to the motion, so it does no work: it bends the path and never changes the speed.
- A straight wire carrying I across a field feels F = BIl sin θ (θ between the wire and the field), in the direction of I l × B. A rod floats when this push equals its weight mg (Example 4.1).
- Across a uniform field the push is the centripetal force: qvB = mv²/r, so r = mv/qB. One lap takes 2πm/qB at any speed, so the lap frequency is f = qB/2πm (the cyclotron frequency). A faster particle goes round a bigger circle in the same time.
- If v makes an angle θ with B, the part v sin θ circles (width 2mv sin θ/qB) and the part v cos θ moves along the field: the path is a helix of pitch p = 2πm v cos θ/qB. After one turn every electron is back on the axis, which is how a coil focuses a beam. 1 G = 10⁻⁴ T.

## 3. The mechanic, physically

**Dr. Imani Osei** is the medical physicist on the night shift at a proton-therapy centre. Before the first patient arrives at seven, she runs the morning checks on the beam line with **Phil**, the hospital's test phantom (a mannequin with a target painted inside). Each round is one **run**: she sets the controls, presses **Power on**, and the beam flies.

| Level | The player sets | What decides the run |
|---|---|---|
| 1 Kick to the room | the kicker's field direction (into or out of the screen) and strength B | The beam must turn into the open room: the push must point toward the room (q v × B) and have the size the room needs, B = F/qv. |
| 2 Float the test rod | the current's direction (→ or ←) and size I | A copper rod on two threads sits in a test magnet. I l × B must point up, and BIl sin θ must equal mg. |
| 3 Tune the cyclotron | the magnet B and the RF frequency f | The RF must kick once per lap, f = qB/2πm, or the protons fall out of step. Protons leave by the port at speed v = qBr/m, which sets how deep the dose goes in Phil. |
| 4 A new speed | the port's radius r and the RF f | Same magnet, new speed: r = mv/qB moves in proportion to v; the lap frequency does not change. |
| 5 Focus the gun | the focusing coil's field B (gauss) | Electrons leave the gun at θ to the axis. The helix must fit in the tube (width 2mv sin θ/qB < tube radius) and return to the axis exactly at the screen (pitch = screen distance). |

Physical consequences. Every miss shows what the player's own setting did, and only its direction; every effect takes a **fixed** form, never one proportional to the error:
- **Wrong way** (L1): the beam bends away from the room and hits the chamber wall at the mirror point (sparks, `CLANG!`).
- **Too weak / too strong** (L1): the beam bends too little or too much and hits the wall 46 px beyond or before the door (fixed paths).
- **Pushed down** (L2): the rod jerks down and the left thread snaps (`SNAP!`).
- **Sag / jump** (L2): the rod stays on taut threads, or leaps up and clangs against the stop bar.
- **Out of step** (L3, L4): the bunch wobbles and hits a dee wall at a fixed point (`FZZT`), never reaching the port.
- **Shallow / deep** (L3, L4): the protons leave the port, but the dose glow lands at a fixed spot before or past Phil's target.
- **Scrape** (L5): the helix touches the glass at a fixed point; **blur** (L5): the spot on the screen is a fixed fuzzy blob.

## 4. Story and characters

Hero banner: `name: 'Imani'`, `role: 'the night-shift medical physicist at a proton-therapy centre, who checks the beam before the first patient'`.

| Level | story | objective |
|---|---|---|
| 1 | `It is five in the morning at the proton-therapy centre, and the first patient comes at seven. Dr. Imani Osei checks the beam line with Phil, the hospital’s test phantom. A charge moving through a magnetic field feels a push F = qv × B, at right angles to both v and B, of size qvB; for a negative electron it is reversed. The push bends the beam but never speeds it up.` | `Set the kicker’s field direction and strength so the beam turns into Phil’s room, in three runs.` |
| 2 | `Next, the test magnet. A copper rod hangs on two fine threads across its field. A wire carrying a current I feels F = BIl sin θ, with θ the angle between the wire and the field, in the direction of I l × B. When that push equals the rod’s weight mg, the threads go slack and the rod floats.` | `Set the current’s direction and size so the test rod floats, in three tries.` |
| 3 | `Now the cyclotron. Its magnet bends protons into circles, because qvB = mv²/r gives r = mv/qB, and a radio-frequency (RF) kick speeds them up once every lap. A lap takes 2πm/qB at any speed, so the RF must beat at f = qB/2πm. Protons leave by the port when their circle reaches it, and their speed there decides how deep the dose goes in Phil.` | `Set the magnet and the RF so the protons leave the port at the speed Phil’s plan needs, in three runs.` |
| 4 | `Today’s plan needs protons at a new speed, from the same magnet. r = mv/qB grows in proportion to the speed, so the extraction port has to move. Think about the lap time before you touch the RF.` | `Move the port and set the RF for the new speed, in three runs.` |
| 5 | `Last check: the electron gun of the imaging tube. Electrons leave the gun at an angle to the field of a focusing coil. The part of the velocity across the field, v sin θ, makes them circle; the part along it, v cos θ, carries them forward one pitch, p = 2πm v cos θ/qB, every turn. After exactly one turn they are back on the axis: a sharp spot.` | `Set the focusing field so the spot is sharp on the screen and no electron scrapes the tube, in three runs.` |

Characters (each in its own function in `art.ts`, AGENTS.md item 17):
- **Imani** (hero) stands at the bottom left, feet at `IMANI` (44, 318), about 74 px tall, beside her control desk.
  - Gear: short dark curls; small gold stud earrings; safety glasses; a white lab coat over a teal scrub top; a blue lanyard with an ID card; a yellow radiation-dosimeter badge (a small square with the trefoil) on the coat pocket; a tablet in her left hand; dark trousers and white clogs.
  - Pose: her right hand hovers over the red **Power on** button on the desk at `BUTTON`.
  - Idle: breathes (chest rises 1 px, `sin(t·2)`), blinks every 3 s, glances up at the wall monitor every 5 s (head tilts 8° for 0.6 s), taps the tablet every 4 s.
  - Action (on fire, 0.00 to 0.10 s): her hand presses the button (it drops 6 px), the button glows, a `POWER ON` floater rises at (110, 236), and the red beacon at (24, 20) starts turning.
  - Moods: `face(…, 'happy')` while waiting; `'cheer'` on a win with the tablet raised overhead; `'worried'` with a sweat drop on any miss. After a spark miss (wrong way, snap, jump, out of step, scrape) she first **flinches** for 0.4 s (shoulders up 3 px, eyes squeezed shut as two short lines, drawn by hand) and then turns `'worried'`.
- **Phil** (the target in levels 1, 3 and 4) is a smooth grey phantom lying on a padded treatment couch.
  - Gear: a dome head with a small **face screen** (two eyes and a mouth drawn in `PAL.cyan`), a hospital wristband (blue in round 1, green in round 2, gold in round 3), a green **target ring** painted on his chest (L1) or seen through a cutaway in his torso (L3, L4).
  - Idle: the face screen blinks every 2.5 s; a small green LED on the couch pulses every 1.5 s.
  - Win: the target ring glows `PAL.green`, the face screen shows a smile (`^ ^` eyes), and a `✓ DOSE OK` stamp appears beside him.
  - Miss: the face screen shows round `o o` eyes and a small `?`, and the couch LED turns `PAL.red` for 1 s.
- **Rodney** (the target in level 2) is the copper test rod, with two googly eyes the night shift stuck on its middle and a paper tag.
  - Idle: the threads sway the rod ±1 px (`sin(t·1.5)`), and the googly pupils jiggle after each sway.
  - Win: the pupils look up, and a small `whee!` floater rises.
  - Sag: the pupils droop to the bottom of the eyes.
  - Jump: after hitting the stop bar the pupils spin (dizzy) for 0.8 s.
  - Snap: the pupils go wide while the rod dangles from one thread.
- **The screen** (the target in level 5) is a round phosphor disc at the right end of the tube, shown face-on in an inset with a faint bullseye. Win: a sharp bright dot in the centre and `SHARP!`. Blur: a fuzzy blob and `BLUR`. Scrape: stays dark.

## 5. Rules (`logic.ts`)

### 5.1 Constants and types

```ts
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const Q = 1.6e-19;    // C, the charge of a proton or (in size) an electron
export const MP = 1.67e-27;  // kg, proton
export const ME = 9.1e-31;   // kg, electron
export const G = 9.8;        // m/s²
const DEG = Math.PI / 180;

export interface KickRow { pt: 'p' | 'e'; from: 'left' | 'right'; port: 'up' | 'down'; v: number; f: number; out: 0 | 1; b: number }
// v in 10⁶ m/s; f, the push the room needs, in 10⁻¹³ N. Answer: out (1 = field out of the screen) and b (T).
export interface LiftRow { bOut: boolean; t: number; l: number; th: 30 | 90; m: number; cur: 0 | 1; i: number }
// t = B in T; l in cm; th = angle between rod and field; m in g. Answer: cur (1 = left to right) and i (A).
export interface CycRow { v: number; r: number; b: number; f: number }
// v, the speed the plan needs, in 10⁷ m/s; r, the port radius, in cm. Answer: b (T) and f (MHz).
export interface FastRow { b: number; r0: number; k: number; f0: number; r: number }
// Yesterday: port r0 (cm) and RF f0 (MHz) in a b T field. Today the speed is k times. Answer: r (cm) and f = f0.
export interface FocusRow { v: number; th: 30 | 45 | 60; pipe: number; L: number; b: number }
// v in 10⁶ m/s; th, the angle to the axis; pipe, the tube's radius, and L, the screen distance, in cm. Answer: b (G).

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'kick'; assist: Assist } & KickRow)
  | ({ kind: 'lift'; assist: Assist } & LiftRow)
  | ({ kind: 'cyc'; assist: Assist } & CycRow)
  | ({ kind: 'speed'; assist: Assist } & FastRow)
  | ({ kind: 'focus'; assist: Assist } & FocusRow);
```

### 5.2 The pools (copy exactly)

Every row was checked by script on 2026-10-31 (`rebuild-checks/ch04/fl-final-check.mjs`). The checks are listed in section 9 and must be in `logic.test.ts`.

```ts
export const KICK: KickRow[][] = [
  [
    { pt: 'p', from: 'left', port: 'up', v: 5, f: 3.2, out: 0, b: 0.4 }, { pt: 'p', from: 'left', port: 'down', v: 2, f: 1.92, out: 1, b: 0.6 },
    { pt: 'p', from: 'left', port: 'down', v: 4, f: 3.2, out: 1, b: 0.5 }, { pt: 'p', from: 'left', port: 'up', v: 3, f: 3.36, out: 0, b: 0.7 },
  ],
  [
    { pt: 'e', from: 'left', port: 'up', v: 2.5, f: 3.2, out: 1, b: 0.8 }, { pt: 'e', from: 'left', port: 'down', v: 5, f: 9.6, out: 0, b: 1.2 },
    { pt: 'e', from: 'left', port: 'up', v: 4, f: 5.76, out: 1, b: 0.9 }, { pt: 'e', from: 'left', port: 'down', v: 2, f: 4.8, out: 0, b: 1.5 },
  ],
  [
    { pt: 'p', from: 'right', port: 'up', v: 5, f: 8.8, out: 1, b: 1.1 }, { pt: 'e', from: 'right', port: 'up', v: 2.5, f: 5.6, out: 0, b: 1.4 },
    { pt: 'p', from: 'right', port: 'down', v: 2, f: 5.76, out: 0, b: 1.8 }, { pt: 'e', from: 'right', port: 'down', v: 4, f: 1.92, out: 1, b: 0.3 },
  ],
];

export const LIFT: LiftRow[][] = [
  [
    { bOut: false, t: 1.5, l: 20, th: 90, m: 61.2, cur: 1, i: 2.0 }, { bOut: true, t: 1.5, l: 10, th: 90, m: 49, cur: 0, i: 3.2 },
    { bOut: false, t: 1.5, l: 25, th: 90, m: 45.9, cur: 1, i: 1.2 }, { bOut: true, t: 1.5, l: 15, th: 90, m: 59.7, cur: 0, i: 2.6 },
  ],
  [
    { bOut: true, t: 3, l: 20, th: 90, m: 49, cur: 0, i: 0.8 }, { bOut: false, t: 3, l: 10, th: 90, m: 45.9, cur: 1, i: 1.5 },
    { bOut: true, t: 3, l: 12, th: 90, m: 91.8, cur: 0, i: 2.5 }, { bOut: false, t: 3, l: 16, th: 90, m: 88.2, cur: 1, i: 1.8 },
  ],
  [
    { bOut: false, t: 1.5, l: 20, th: 30, m: 64.3, cur: 1, i: 4.2 }, { bOut: true, t: 3, l: 20, th: 30, m: 42.9, cur: 0, i: 1.4 },
    { bOut: false, t: 1.5, l: 16, th: 30, m: 42.9, cur: 1, i: 3.5 }, { bOut: true, t: 3, l: 10, th: 30, m: 45.9, cur: 0, i: 3.0 },
  ],
];

export const CYC: CycRow[][] = [
  [{ v: 2, r: 17.4, b: 1.2, f: 18.3 }, { v: 3, r: 20.9, b: 1.5, f: 22.9 }, { v: 2.4, r: 31.3, b: 0.8, f: 12.2 }, { v: 3.6, r: 18.8, b: 2.0, f: 30.5 }],
  [{ v: 2.5, r: 23.7, b: 1.1, f: 16.8 }, { v: 3.2, r: 25.7, b: 1.3, f: 19.8 }, { v: 4, r: 26.1, b: 1.6, f: 24.4 }, { v: 1.5, r: 22.4, b: 0.7, f: 10.7 }],
  [{ v: 3, r: 16.5, b: 1.9, f: 29.0 }, { v: 2.8, r: 17.2, b: 1.7, f: 25.9 }, { v: 3.5, r: 15.9, b: 2.3, f: 35.1 }, { v: 2.6, r: 30.2, b: 0.9, f: 13.7 }],
];

export const FAST: FastRow[][] = [
  [{ b: 1.2, r0: 15, k: 2, f0: 18.3, r: 30 }, { b: 1.5, r0: 12, k: 2, f0: 22.9, r: 24 }, { b: 0.9, r0: 18, k: 2, f0: 13.7, r: 36 }, { b: 1.6, r0: 14, k: 2, f0: 24.4, r: 28 }],
  [{ b: 1.3, r0: 30, k: 1.5, f0: 19.8, r: 45 }, { b: 1.1, r0: 11, k: 3, f0: 16.8, r: 33 }, { b: 0.8, r0: 14, k: 3, f0: 12.2, r: 42 }, { b: 1.9, r0: 26, k: 1.5, f0: 29.0, r: 39 }],
  [{ b: 2.0, r0: 40, k: 0.5, f0: 30.5, r: 20 }, { b: 1.7, r0: 14, k: 2.5, f0: 25.9, r: 35 }, { b: 1.2, r0: 50, k: 0.5, f0: 18.3, r: 25 }, { b: 1.5, r0: 20, k: 2.5, f0: 22.9, r: 50 }],
];

export const FOCUS: FocusRow[][] = [
  [{ v: 5, th: 30, pipe: 6, L: 22.1, b: 7 }, { v: 6, th: 30, pipe: 5.5, L: 20.6, b: 9 }, { v: 4, th: 30, pipe: 4, L: 15.5, b: 8 }, { v: 3, th: 30, pipe: 4, L: 14.3, b: 6.5 }],
  [{ v: 5, th: 45, pipe: 6, L: 12.6, b: 10 }, { v: 8, th: 45, pipe: 9, L: 19.3, b: 10.5 }, { v: 4.8, th: 45, pipe: 5, L: 10.5, b: 11.5 }, { v: 6, th: 45, pipe: 5.5, L: 11.7, b: 13 }],
  [{ v: 4.8, th: 60, pipe: 7, L: 9.03, b: 9.5 }, { v: 4, th: 60, pipe: 7.5, L: 9.53, b: 7.5 }, { v: 3, th: 60, pipe: 8, L: 9.75, b: 5.5 }, { v: 4.8, th: 60, pipe: 11.5, L: 14.3, b: 6 }],
];
```

What the script proved (repeat these in `logic.test.ts`, section 9):
- KICK: `push13(v, b)` to 3 figures equals `f`; `f / (1.6 v)` gives back `b` within 0.02 T; the push points to the port for `out` and away for `1 − out`; neighbouring b (±0.1 T) give a push more than 2% different.
- LIFT: `BIl sin θ / g` to 3 figures equals `m` grams; `mg/(Bl sin θ)` gives back `i` within 0.02 A; `cur` pushes up and `1 − cur` pushes down.
- CYC: `mv/qB` to 3 figures equals `r` cm; `rfFor(b) === f`; the true lap frequency is within 0.03 MHz of `f` (never near a rounding edge); `mv/(q r)` gives back `b` within 0.02 T.
- FAST: `r = r0 × k`; `rfFor(b) === f0`; no two pools share an `r`; `k × f0` (the tempting wrong RF) never rounds to `f0`.
- FOCUS: `helixPitch(r, b)` to 3 figures equals `L`; the helix width at the answer is at most 0.8 of the tube radius; the start (1 G) scrapes; no dial value gives a width within 2% of the tube radius; `L` solves back to `b` within 0.1 G; neighbouring b (±0.5 G) give a pitch more than 2% different.
- Every level: exactly one winning setting over the full dial grid, the start never wins, no answer sits at a dial end, and no two pools of a level share an answer.

### 5.3 Physics, rounds and judging

```ts
export const DIAL = {
  out: { min: 0, max: 1, start: 1 },              // L1: 1 = field out of the screen ⊙, 0 = into ⊗
  kb: { min: 0.1, max: 2, step: 0.1, start: 0.1 },  // L1 kicker, T
  cur: { min: 0, max: 1, start: 1 },              // L2: 1 = current left to right →, 0 = right to left ←
  i: { min: 0.1, max: 5, step: 0.1, start: 0.1 },   // L2, A
  cb: { min: 0.5, max: 2.5, step: 0.1, start: 0.5 },// L3 magnet, T
  f: { min: 8, max: 40, step: 0.1, start: 8 },      // L3 and L4 RF, MHz
  r: { min: 10, max: 80, step: 1, start: 10 },      // L4 port radius, cm
  gb: { min: 1, max: 20, step: 0.5, start: 1 },     // L5 focusing coil, G
};

const same = (a: number, b: number) => Math.abs(a - b) < 1e-6;
/** L1: the push qvB in units of 10⁻¹³ N (v in 10⁶ m/s, b in T). */
export const push13 = (v: number, b: number) => 1.6 * v * b;
/** L1: true when q v × B points up the screen. v is along ±x, B along ±z, so F_y = −q·v_x·B_z. */
export const pushUp = (pt: 'p' | 'e', from: 'left' | 'right', out: number) => (pt === 'p' ? 1 : -1) * -(from === 'left' ? 1 : -1) * (out ? 1 : -1) > 0;
/** L2: true when I l × B points up. The rod lies along x; the field's z part decides: F_y = −s_x·B_z. */
export const liftUp = (bOut: boolean, cur: number) => -(cur ? 1 : -1) * (bOut ? 1 : -1) > 0;
/** L2: the push on the rod and its weight, both in mN. */
export const liftMN = (r: LiftRow, i: number) => r.t * i * (r.l / 100) * Math.sin(r.th * DEG) * 1000;
export const weightMN = (r: LiftRow) => r.m * G;
/** L3, L4: the lap frequency in MHz, the RF dial value that matches it, and the speed (10⁷ m/s) of a proton leaving radius rCm. */
export const lapMHz = (b: number) => (Q * b) / (2 * Math.PI * MP) / 1e6;
export const rfFor = (b: number) => Math.round(lapMHz(b) * 10) / 10;
export const exitV7 = (b: number, rCm: number) => (Q * b * (rCm / 100)) / MP / 1e7;
/** L5: the helix's full width (2r) and its pitch, both in cm, for a field of bG gauss. */
export const helixWidth = (r: FocusRow, bG: number) => 2 * ((ME * r.v * 1e6 * Math.sin(r.th * DEG)) / (Q * bG * 1e-4)) * 100;
export const helixPitch = (r: FocusRow, bG: number) => ((2 * Math.PI * ME * r.v * 1e6 * Math.cos(r.th * DEG)) / (Q * bG * 1e-4)) * 100;

const POOLS = [KICK, LIFT, CYC, FAST, FOCUS] as unknown[][][];
const KINDS = ['kick', 'lift', 'cyc', 'speed', 'focus'] as const;
export function buildRounds(level: 1 | 2 | 3 | 4 | 5, random: () => number): Round[] {
  return POOLS[level - 1].map((pool, k) => ({ ...(pick(pool, random) as object), kind: KINDS[level - 1], assist: aid(k) }) as Round);
}

export type Fault = 'wrong' | 'weak' | 'strong' | 'down' | 'sag' | 'jump' | 'slow' | 'fast' | 'shallow' | 'deep' | 'scrape' | 'long' | 'short';
export type Values = { out?: number; b?: number; cur?: number; i?: number; f?: number; r?: number };

export function fault(r: Round, x: Values): Fault | null {
  switch (r.kind) {
    case 'kick':
      if (x.out !== r.out) return 'wrong';
      return same(x.b!, r.b) ? null : x.b! < r.b ? 'weak' : 'strong';
    case 'lift':
      if (x.cur !== r.cur) return 'down';
      return same(x.i!, r.i) ? null : x.i! < r.i ? 'sag' : 'jump';
    case 'cyc': {
      const want = rfFor(x.b!);
      if (!same(x.f!, want)) return x.f! < want ? 'slow' : 'fast';
      return same(x.b!, r.b) ? null : x.b! < r.b ? 'shallow' : 'deep';
    }
    case 'speed':
      if (!same(x.f!, r.f0)) return x.f! < r.f0 ? 'slow' : 'fast';
      return same(x.r!, r.r) ? null : x.r! < r.r ? 'shallow' : 'deep';
    case 'focus':
      if (helixWidth(r, x.b!) >= r.pipe) return 'scrape';
      return same(x.b!, r.b) ? null : x.b! < r.b ? 'long' : 'short';
  }
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;
```

- L1 checks the polarity first: a push the wrong way is `wrong` whatever the strength.
- L2 checks the current direction first: a downward push is `down` whatever the size.
- L3 checks the RF against the **player's own** field first: if the RF does not match a lap in that field (`rfFor(x.b)`), the protons fall out of step (`slow` or `fast`) whatever the field. If it matches, the protons reach the port at v = qBr/m, which is too slow (`shallow`) or too fast (`deep`) unless B is the answer. Only (`r.b`, `r.f`) wins.
- L4 checks the RF against yesterday's `f0` first (the lap time does not change with speed), then the port.
- L5 checks the scrape first: a helix wider than the tube never reaches the screen.
- `buildRounds` must be the **first** use of `random` in the level, so the UI test rebuilds the same rounds from the same seed.
- Start settings: L1 `out 1, b 0.1`; L2 `cur 1, i 0.1`; L3 `b 0.5, f 8`; L4 `r 10, f 8`; L5 `b 1`. None of them wins on any row (tested).

### 5.4 Words

`fmt` from `@core/judge` (3 significant figures). Helper words:
- `pName(r)`: `r.pt === 'p' ? 'proton' : 'electron'`.
- `moving(r)`: `r.from === 'left' ? 'to the right' : 'to the left'`.
- `room(r)`: `r.port === 'up' ? 'Room A' : 'Room B'`.
- `fieldWord(out)`: `out ? 'out of the screen' : 'into the screen'`.
- `curWord(cur)`: `cur ? 'left to right' : 'right to left'`.

**`goal(r)`** (the canvas goal line, UX item 1; each at most 40 characters):
- kick: `` `Turn the ${pName(r)} beam into ${room(r)}` ``
- lift: `` `Float the ${r.m} g test rod` ``
- cyc: `` `Protons out at ${r.v} × 10⁷ m/s` ``
- speed: `` `New plan: ${r.k} × yesterday’s speed` ``
- focus: `` `Sharp spot at ${r.L} cm` ``

**`intel(r)`** (the round's facts):
- kick: `` `A ${pName(r)} beam moves ${moving(r)} at ${r.v} × 10⁶ m/s. ${room(r)} needs a sideways push of ${r.f} × 10⁻¹³ N.` ``
- lift: `` `The test rod is ${r.l} cm long and its mass is ${r.m} g. The field is ${r.t} T, ${r.bOut ? 'out of' : 'into'} the screen${r.th === 30 ? ', crossing the rod at 30°' : ', at right angles to the rod'}.` ``
- cyc: `` `Phil’s plan needs protons at ${r.v} × 10⁷ m/s. The extraction port is ${r.r} cm from the centre.` ``
- speed: `` `Yesterday: the port at ${r.r0} cm and the RF at ${r.f0} MHz, in a ${r.b} T field. Today’s plan needs ${r.k} times yesterday’s speed, with the same magnet.` ``
- focus: `` `Electrons leave the gun at ${r.v} × 10⁶ m/s, ${r.th}° to the axis. The tube’s radius is ${r.pipe} cm and the screen is ${r.L} cm from the gun.` ``

**Hint line**: `` `${intel(r)} ${r.assist === 0 ? 'Round 1: the beam monitor is live.' : r.assist === 1 ? 'The monitor is off: a monitor check costs a charge.' : 'Last run: no monitor.'}` ``

**`missText(r, x)`** (the player's own setting, what it did, then what to change; never the answer):
- kick wrong: `` `With the field ${fieldWord(x.out)}, q v × B pushed the ${pName(r)} the other way: the beam bent away from ${room(r)} and hit the wall. Flip the field.` ``
- kick weak: `` `At ${x.b} T the push was too weak: the beam bent too little and hit the wall beyond the door. Turn the kicker up.` ``
- kick strong: `` `At ${x.b} T the push was too strong: the beam bent too sharply and hit the wall before the door. Turn the kicker down.` ``
- lift down: `` `With the current ${curWord(x.cur)}, I l × B pushed the rod down and a thread snapped. Reverse the current.` ``
- lift sag: `` `At ${x.i} A the push was smaller than the rod’s weight: it stayed hanging on its threads. Use more current.` ``
- lift jump: `` `At ${x.i} A the push was bigger than the rod’s weight: it jumped and hit the stop bar. Use less current.` ``
- cyc slow: `` `At ${x.f} MHz the RF beat slower than the protons’ laps in ${x.b} T: they fell out of step and hit a dee wall. Match the RF to one lap.` ``
- cyc fast: `` `At ${x.f} MHz the RF beat faster than the protons’ laps in ${x.b} T: they fell out of step and hit a dee wall. Match the RF to one lap.` ``
- cyc shallow: `` `In ${x.b} T the protons reached the port too slowly: the dose stopped short of the target. Use a stronger field, with an RF to match.` ``
- cyc deep: `` `In ${x.b} T the protons reached the port too fast: the dose went past the target. Use a weaker field, with an RF to match.` ``
- speed slow: `` `At ${x.f} MHz the RF beat slower than the protons’ laps: they fell out of step and hit a dee wall.` ``
- speed fast: `` `At ${x.f} MHz the RF beat faster than the protons’ laps: they fell out of step and hit a dee wall.` ``
- speed shallow: `` `With the port at ${x.r} cm the protons left too slowly: the dose stopped short of the target. Move the port out.` ``
- speed deep: `` `With the port at ${x.r} cm the protons left too fast: the dose went past the target. Move the port in.` ``
- focus scrape: `` `At ${x.b} G the spiral was wider than the tube: the electrons scraped the glass and never reached the screen. Use more field.` ``
- focus long: `` `At ${x.b} G one turn was longer than the tube: the beam had not met the axis again at the screen, so the spot was a blur. Use more field.` ``
- focus short: `` `At ${x.b} G the beam met the axis before the screen and spread out again: a blur. Use less field.` ``

The two `speed` RF texts (slow and fast) deliberately add no hint: the level tests whether the player keeps the RF.

**`meterText(r, x)`** (the monitor check, a charge; the LCD shows the short form of 6.2):
- kick: `` `Monitor check: with ${x.b} T ${fieldWord(x.out)}, the push on the ${pName(r)} is ${fmt(push13(r.v, x.b!))} × 10⁻¹³ N, ${pushUp(r.pt, r.from, x.out!) ? 'up' : 'down'} the screen.` ``
- lift: `` `Monitor check: ${x.i} A ${curWord(x.cur)} gives a push of ${fmt(liftMN(r, x.i!))} mN, ${liftUp(r.bOut, x.cur!) ? 'up' : 'down'}; the rod weighs ${fmt(weightMN(r))} mN.` ``
- cyc: `` `Monitor check: in ${x.b} T the protons lap at ${fmt(lapMHz(x.b!))} MHz and reach the port at ${fmt(exitV7(x.b!, r.r))} × 10⁷ m/s.` ``
- speed: `` `Monitor check: from a port at ${x.r} cm the protons leave at ${fmt(exitV7(r.b, x.r!))} × 10⁷ m/s; they lap at ${fmt(lapMHz(r.b))} MHz.` ``
- focus: `` `Monitor check: at ${x.b} G one turn carries the electrons ${fmt(helixPitch(r, x.b!))} cm along the tube, and the spiral is ${fmt(helixWidth(r, x.b!))} cm wide.` ``

**`winText(r)`** (two or three sentences, UX item 6):
- kick: `` `Beam in! q v × B is at right angles to v and B: for a ${pName(r)} moving ${moving(r)} with the field ${fieldWord(r.out)} it points ${r.port}${r.pt === 'e' ? ', the reverse of a proton’s push' : ''}. Its size is qvB, so B = F/qv = ${r.f} × 10⁻¹³ ÷ (1.6 × 10⁻¹⁹ × ${r.v} × 10⁶) = ${r.b} T. The push bends the beam but does no work, so the speed stays the same.` ``
- lift: `` `It floats! BIl sin θ = mg, so I = mg/(Bl sin θ) = ${fmt(r.m / 1000)} × 9.8 ÷ (${r.t} × ${fmt(r.l / 100)}${r.th === 30 ? ' × sin 30°' : ''}) = ${r.i} A, and with the current ${curWord(r.cur)} I l × B points up.` ``
- cyc: `` `Dose on target! qvB = mv²/r gives B = mv/qr = 1.67 × 10⁻²⁷ × ${r.v} × 10⁷ ÷ (1.6 × 10⁻¹⁹ × ${fmt(r.r / 100)}) = ${r.b} T. One lap takes 2πm/qB, so the RF beats at f = qB/2πm = ${r.f} MHz.` ``
- speed: `` `Dose on target! r = mv/qB grows with the speed: ${r.r0} cm × ${r.k} = ${r.r} cm. The lap time 2πm/qB has no v in it, so the RF stays at ${r.f0} MHz.` ``
- focus: `` `Sharp spot! Across the field, v sin θ makes circles 2mv sin θ/qB = ${fmt(helixWidth(r, r.b))} cm wide, inside the ${r.pipe} cm tube. Along it, v cos θ carries the electrons one pitch, 2πm v cos θ/qB = ${r.L} cm, per turn: so B = ${r.b} G.` ``

## 6. Screen and art

Canvas 640 × 340 (`mountDialLevel`). **Draw the hall over the engine background with opaque fills**, so the engine grid never shows.

```ts
export const IMANI = { x: 44, feet: 318 };                 // hero, about 74 px tall (x 10 to 80, y 244 to 318)
export const DESK = { x: 74, y: 266, w: 66, h: 52 };        // the control desk to her right
export const BUTTON = { x: 120, y: 262 };                    // the red Power on button on the desk top
export const LCD = { x: 10, y: 36, w: 214, h: 20 };          // the beam monitor on the wall: the helper
export const GOAL = { x: 320, y: 22 };                       // goal line centre
export const CLOCK = { x: 400, y: 52, r: 12 };               // the wall clock
export const TRK = { x0: 180, x1: 600, y: 324 };             // the bottom handle track (L1 kicker, L2 current, L3 and L4 RF, L5 coil)
export const HIT: [number, number] = [320, 70];              // fixed burst point, every level
// L1
export const LINE_Y = 190;                                   // the beam line
export const KICKER = { x0: 280, x1: 380, y0: 150, y1: 230 };// the kicker magnet; its gap is y 170 to 210
export const KSWITCH = { x: 330, y: 132 };                   // L1 polarity toggle on the kicker's top: tip up = out (1), down = into (0)
export const ROOM = { w: 104, h: 58, upY: 60, downY: 244, rightX: 486, leftX: 160 }; // room boxes (top-left corners)
// L2
export const RING = { x: 360, y: 180, r: 100, inner: 86 };   // the test magnet: a copper coil seen face-on, its field along the view
export const ROD = { x0: 282, x1: 438, y: 196 };             // the rod's centre line at rest
export const STAND = { y: 60, x0: 290, x1: 430, post: 470 }; // the crossbar the threads hang from (in front of the ring)
export const STOP_Y = 150;                                   // the plastic stop bar the rod hits on a jump
export const THREADS = [300, 420];                           // thread x positions
export const PSU = { x: 154, y: 238, w: 60, h: 40 };         // L2 power supply box
export const LSWITCH = { x: 184, y: 258 };                   // L2 current-direction lever on the PSU: tip right = → (1), left = ← (0)
export const INSET = { x: 516, y: 62, w: 104, h: 76 };       // L2 top view, only in 30° rows
// L3, L4
export const CYCL = { x: 300, y: 186, R: 112 };              // the cyclotron (top view), dees split along the vertical diameter
export const rPx = (rCm: number) => (rCm / 80) * CYCL.R;     // L4: port radius on screen (80 cm at the rim); a picture, not a ruler
export const BT = { x: 452, y0: 172, y1: 52 };               // L3 magnet track: 0.5 T at y0, 2.5 T at y1
export const PHIL = { x: 545, y: 250 };                      // Phil's target (torso centre) on the couch (couch x 470 to 620, y 220 to 290)
export const PIPE: [number, number][] = [[412, 186], [440, 186], [476, 248]]; // rim to Phil's left side
// L5
export const TUBE = { x0: 170, x1: 560, y: 180, r: 34 };     // the glass tube, drawn radius 34 px (not to scale)
export const SPOT = { x: 600, y: 112, r: 28 };               // the screen seen face-on (inset)
```

### 6.1 The set

- **Hall**: concrete walls `#1a2033` with darker panel seams every 80 px, a yellow-and-black hazard stripe along the floor edge at y 304, a radiation trefoil sign at (230, 96) (L1 and L2 only, where it is clear of the scene), and a red **beacon** at (24, 20) (still; it turns only during a run). The top band y 0 to 12 is tinted by round (6.4).
- **Imani's corner**: the desk at `DESK` (grey steel, a keyboard, the red mushroom button at `BUTTON` with a yellow guard ring) and the wall monitor at `LCD` (black, green digits, a thin grey bezel, the label `BEAM MONITOR` in 11 px above it at (117, 32)).
- **The clock** at `CLOCK`: white face, black hands showing the round's time (6.4).
- **L1, the switchyard**:
  - The beam pipe enters at y `LINE_Y` from the left edge (x 150) for `from: 'left'` rows or the right edge (x 630) for `from: 'right'` rows, and runs into the kicker.
  - The kicker at `KICKER`: a dark-blue steel box with copper coil ends top and bottom, its gap (y 170 to 210) open. In the gap, 5 field symbols at x 290, 310, 330, 350, 370 (y 190), each a 12 px circle: `⊙` (a dot) when the player's `out` is 1 and `⊗` (a cross) when 0. They show the player's own setting.
  - The polarity toggle at `KSWITCH` on the kicker's top: a 14 px lever, tip up for `out 1` and down for `out 0`, with `⊙ out` (above) and `⊗ into` (below) written to its right in 11 px.
  - Beyond the kicker, a wide vacuum chamber (a translucent box `rgba(120,140,200,0.10)` with a grey rim) spans x 380 to 600 (from-left rows) or x 150 to 280 (from-right rows), from y 56 to 306. Two **rooms** stand at its far side: an up room (y `ROOM.upY` to +58) and a down room (y `ROOM.downY` to +58), at x `ROOM.rightX` (from-left) or `ROOM.leftX` (from-right). Each is a box with a door flange on the side facing the beam line: the up room's door at its bottom middle, the down room's at its top middle.
  - The round's room has its door **open** (a green rim and a lit doorway), a sign `${room(r)}` in 11 px, and the needed push written beside the door: `` `push ${r.f} × 10⁻¹³ N` `` in 12 px. Phil lies inside at 0.6 scale. The other room's door is closed (grey) with `NOT IN USE` in 11 px.
  - The incoming beam's tag, at the pipe's entry: `` `${r.pt === 'p' ? 'p⁺' : 'e⁻'} ${r.v} × 10⁶ m/s` `` in 12 px.
- **L2, the test magnet**:
  - The coil `RING` seen face-on: a copper ring (outer radius 100, inner 86), with its winding drawn as 24 short radial lines; the inside is dark `#0e1326` and holds a 4 × 3 grid of field symbols (`⊙` for `bOut`, `⊗` otherwise; 12 px, `PAL.cyan`, alpha 0.7). Under the ring at (360, 300): `` `${r.t} T, ${r.bOut ? '⊙ out of the screen' : '⊗ into the screen'}` `` in 12 px (a given fact).
  - The stand: a post at x `STAND.post` from the floor to y 60, a crossbar from x 290 to 430 at y 60, both drawn in front of the ring. Two white threads (1 px) hang from the crossbar at `THREADS` to the rod. The clear plastic stop bar at `STOP_Y` across x 290 to 430 (`rgba(200,230,255,0.35)`).
  - **Rodney** the rod at `ROD` (a copper cylinder 156 × 10 with a highlight), googly eyes at its middle, and a tag below it at (360, 218): `` `${r.l} cm · ${r.m} g` `` in 12 px.
  - Flexible leads (red and black) run from the rod's two ends down to the PSU at `PSU` (grey box, a dial face, `+`/`−` terminals) with the direction lever `LSWITCH` and the words `← current →` in 11 px under it at (184, 292).
  - In 30° rows only, the inset at `INSET`: a dark card titled `seen from above` (11 px) showing the rod as a copper line and three field lines crossing it at 30°, with the angle arc labelled `30°` (12 px).
- **L3 and L4, the cyclotron** (top view):
  - Two copper-coloured **dees** fill the circle `CYCL` (x 188 to 412, y 74 to 298), split by a 6 px gap along the vertical diameter; a small RF box at the gap's top (300, 70) with the label `RF` (11 px). A yellow proton source dot at the centre.
  - L3: the **port** is a gold notch on the rim at (412, 186) with `` `port ${r.r} cm` `` in 12 px above it at (412, 168).
  - L4: the port is a gold slider block on the horizontal radius at (`CYCL.x + rPx(v.r)`, 186), with a dashed extraction channel from it to the rim. Yesterday's facts are on a sticky note at (520, 92): `` `yesterday: port ${r.r0} cm, RF ${r.f0} MHz` `` (12 px, two lines); no mark is drawn at yesterday's radius.
  - The beam pipe `PIPE` from the rim to Phil's couch. **Phil** lies on the couch (x 470 to 620, y 220 to 290) with his head to the right; a cutaway in his torso shows the green target ring at `PHIL`.
  - L3 magnet track `BT` at x 452 (a vertical rail, 0.5 T at the bottom, 2.5 T at the top, 11 px end labels), titled `MAGNET` (11 px) at (452, 44). In L4 there is no magnet track; the magnet's plate reads `same magnet` (11 px) at (300, 312).
- **L5, the imaging tube**:
  - The glass tube from `TUBE.x0` to `TUBE.x1` at y `TUBE.y`, drawn radius 34 (pale blue `rgba(170,210,255,0.18)`, white top highlight), with its axis as a faint dashed line. 14 copper coil bands (ellipses 4 × 38) from x 200 to 530.
  - The gun (a dark cylinder with a ceramic collar) at x 130 to 170; its tag at (150, 132): `` `${r.v} × 10⁶ m/s at ${r.th}°` `` in 12 px, with a small cone at the gun mouth whose half-angle is drawn at a fixed 25° (a picture, not the true angle).
  - The tube tag at (365, 134): `` `tube radius ${r.pipe} cm` `` in 12 px. A dimension arrow under the tube from x 170 to 560 at y 236, labelled `` `${r.L} cm to the screen` `` at (365, 252) in 12 px.
  - The screen inset at `SPOT`: a dark green disc with a faint bullseye (3 rings), titled `SCREEN` (11 px) at (600, 76).

### 6.2 The helper (the beam monitor at `LCD`)

| Round | Monitor |
|---|---|
| 1 (`assist 0`) | live: `lcdText(r, v)` in `PAL.green` |
| 2 (`assist 1`) | `— — —`, except for 1.5 s after a monitor check, when it shows `lcdText(r, v)` in `PAL.yellow` |
| 3 (`assist 2`) | `— — —` always; the check button gives `A.freeNote('No charges left this round.')` through the engine (charges `[1, 1, 0]`) |

`lcdText(r, v)` (12 px; export it from `logic.ts`, and `LCD_OFF = '— — —'`):
- kick: `` `push ${fmt(push13(r.v, v.b))} × 10⁻¹³ N ${pushUp(r.pt, r.from, v.out) ? '⬆' : '⬇'}` ``
- lift: `` `push ${fmt(liftMN(r, v.i))} mN ${liftUp(r.bOut, v.cur) ? '⬆' : '⬇'} · weight ${fmt(weightMN(r))} mN` ``
- cyc: `` `lap ${fmt(lapMHz(v.b))} MHz · out ${fmt(exitV7(v.b, r.r))} × 10⁷ m/s` ``
- speed: `` `lap ${fmt(lapMHz(r.b))} MHz · out ${fmt(exitV7(r.b, v.r))} × 10⁷ m/s` ``
- focus: `` `pitch ${fmt(helixPitch(r, v.b))} cm · width ${fmt(helixWidth(r, v.b))} cm` ``

The monitor is the **only** place the push, the lap frequency, the exit speed, the pitch or the width for the player's setting appears before a run. Use `const flash = paidFlash()` per level, call `flash.paid()` in `test.read`, and in `draw` compute `since = flash.since(t, k)` once per frame and `live = !shot && helperOn(r.assist, false, since)`. Set `A.canvas.dataset.lcd = live ? '1' : '0'` every frame. Prove it with a canvas recorder (section 9).

### 6.3 The run (`rt` = seconds since fire)

Every level: 0.00 to 0.10 Imani presses the button, the `POWER ON` floater rises at (110, 236), the beacon turns (UX item 5). The win sound: call `A.sound('win')` at the verdict on a win (the engine plays `bad` on a miss).

**Level 1** (the bunch is a 7 px ball: `PAL.orange` with a dark `+` for a proton, `PAL.cyan` with a dark `−` for an electron, and a tail of 5 fading dots):
- 0.00 to 0.35: the bunch travels along `LINE_Y` from the pipe entry to the kicker centre (330, 190).
- 0.35 to 0.85: it follows a **fixed** quadratic curve from (330, 190), chosen by the fault. Let `door` be the open door's point, `s = r.from === 'left' ? 1 : −1`, `u = r.port === 'up' ? 1 : −1`:
  - win: control (door.x, 190), end `door`;
  - weak: control (door.x + 46s, 190), end (door.x + 46s, door.y + 22u);
  - strong: control (door.x − 46s, 190), end (door.x − 46s, door.y + 22u);
  - wrong: control (door.x, 190), end (door.x, 380 − door.y) (the mirror point below or above the line).
- 0.85, the impact: win: the bunch enters the door, the room fills `rgba(93,255,154,0.3)` for 0.2 s, Phil reacts, a `ZAP!` floater at the room. Miss: `A.burst(end, PAL.orange, 16, 140)`, a `CLANG!` floater, and a scorch dot stays at the end point; `A.shake(5)` for `wrong`.
- Verdict at **0.85**. Reactions until 2.3 s.

**Level 2**:
- 0.00 to 0.15: the PSU lever snaps to the player's side with a `CLUNK` floater at (184, 226).
- 0.15 to 0.45: yellow current dots run along the leads and the rod in the player's direction (120 px/s).
- 0.45 to 0.90, by fault (rod centre y; threads redrawn to the rod ends):
  - win: the rod rises 4 px and hovers with a gentle 1 px bob; the threads go slack (drawn as wavy lines).
  - sag: the rod dips 2 px and stays; the threads stay straight and taut.
  - jump: the rod shoots up to `STOP_Y + 6` by 0.60, hits the stop bar (`CLANG!`, `A.burst(360, STOP_Y, PAL.yellow, 12, 120)`), and falls back to rest by 0.90.
  - down: the rod jerks down 8 px at 0.50, the left thread snaps (`SNAP!` floater at (300, 120)), and the rod tilts 20° hanging from the right thread.
- Verdict at **0.90**.

**Levels 3 and 4** (the bunch is a 6 px orange ball with a tail):
- 0.05 to 1.00: the bunch spirals out from the centre: with `p = (rt − 0.05) / 0.95`, radius `8 + (port − 8) · p` px and angle `2π · 4 · p` (four turns, the same shape every run), where `port` is `CYCL.R` in L3 and `rPx(x.r)` in L4 (the player's own port).
- slow or fast (out of step): from 0.50 the radius jitters ±4 px; at 0.60 the bunch leaves the spiral in a straight line to the fixed point (`CYCL.x − 30`, `CYCL.y + 62`) on a dee wall, with `FZZT` and `A.burst(that point, PAL.yellow, 12, 120)`. Verdict at **0.65**.
- otherwise: at 1.00 the bunch is at the port; 1.00 to 1.25 it runs out along the channel and `PIPE` into Phil; at 1.25 a dose glow (an orange-yellow blob, radius 10) appears at a **fixed** depth: shallow (`PHIL.x − 40`, `PHIL.y`), win (`PHIL.x`, `PHIL.y`, on the green ring), deep (`PHIL.x + 40`, `PHIL.y`). Verdict at **1.30**.

**Level 5** (three cyan electron dots, 0.04 s apart, with fading trails):
- 0.00 to 0.20: the coil bands brighten.
- 0.05 to 1.00: the dots follow the drawn helix from the gun to the screen. The drawn helix is chosen by the fault, never computed from the player's B: x runs linearly from `TUBE.x0` to `TUBE.x1`; the distance from the axis is `A · (1 − cos 2πs)` above the axis, where `s` is the fraction of turns done so far and the turns at the screen are win 1.0, long 0.6, short 1.4, with `A = 11` px. For scrape, `A = 17` px and 1 turn, so the dots touch the glass (34 px off the axis) at x 365, where they stop at 0.55 with `FZZT`, an orange glow on the glass (radius 14, alpha 0.6, fading over 0.8 s) and `A.burst(365, TUBE.y − 34, PAL.orange, 12, 100)`.
- 1.00: win: a sharp bright dot (radius 3) in the bullseye centre of `SPOT` and `SHARP!`; long or short: a fuzzy blob (radius 14, alpha 0.5) in `SPOT` and `BLUR`.
- Verdict at **0.60** for scrape, **1.05** otherwise.

`delay` (export from `logic.ts` as `verdictDelay(r, x)`):
`r.kind === 'kick' ? 0.85 : r.kind === 'lift' ? 0.9 : r.kind === 'focus' ? (fault(r, x) === 'scrape' ? 0.6 : 1.05) : (fault(r, x) === 'slow' || fault(r, x) === 'fast' ? 0.65 : 1.3)`.
Everything ends by 2.3 s.

### 6.4 Rounds that look different (UX item 8)

Detect `k` inside `draw`:
- Round 1: the top band `#0d1430` (night), the clock at 05:00, Phil's wristband blue.
- Round 2: the top band `#2a3a6a` (dawn), the clock at 05:40, Phil's wristband green.
- Round 3, the boss: the top band `#6a3a2a` (sunrise), the clock at 06:20, Phil's wristband gold, the beacon glows red even before the run, and a banner `LAST CHECK BEFORE PATIENTS` (11 px, `PAL.red`) on the wall at (320, 46).

### 6.5 What must never show

- No answer is drawn: no target field, current, RF, port radius or coil field, except the player's own settings and the given facts named in 6.1.
- No beam path, spiral or helix before fire, except the round 1 live monitor text (numbers only; no path is ever drawn before fire).
- Beam paths, rod heights, spiral ends, dose depths and spot sizes take the fixed forms of 6.3, never values proportional to the player's setting.
- `hit` is the fixed point `HIT` in every level.

### 6.6 Art functions (`art.ts`)

`hall(g, t, k)`, `desk(g, pressed)`, `monitor(g, text, color)`, `clock(g, k)`, `beacon(g, t, on)`, `imani(g, t, o)`, `phil(g, x, y, scale, t, mood, band)`, `switchyard(g, r, out)`, `bunch(g, x, y, pt, t)`, `testMagnet(g, r, t)`, `rodney(g, y, tilt, mood, t)`, `psu(g, cur)`, `inset(g)`, `cyclotron(g, r, t)`, `portBlock(g, rCm)`, `tube(g, r, glow)`, `screenInset(g, kind)`, `goalLine(g, text)`, `handleGrip(g, x, y, glyph, hot)`. Keep each under about 80 lines.

### 6.7 UX checklist (all ten items; logical canvas pixels)

1. **Goal on the canvas**: `goalLine(g, goal(r))` at `GOAL` (320, 22), 13 px bold `PAL.white` on a dark rounded plate (`rgba(0,0,0,0.6)`, 10 px padding, the width of the text), from round start until fire, and again when the round is replayed after a miss.
2. **Own setting beside its handle** (12 px `PAL.yellow`): L1 `` `${b} T` `` 16 px above the TRK handle and `⊙ out`/`⊗ into` beside the toggle; L2 `` `${i} A` `` above the TRK handle and `→`/`←` on the lever; L3 `` `${b} T` `` 26 px left of the BT handle and `` `${f} MHz` `` above the TRK handle; L4 `` `${r} cm` `` 18 px above the port block and `` `${f} MHz` `` above the TRK handle; L5 `` `${b} G` `` above the TRK handle. Given facts are drawn the same way, in 12 px `PAL.white`, at the places named in 6.1.
3. **Handles**: every handle has `radius: 20`. The game draws `handleGrip`: a white 2 px ring with a 12 px glyph inside, `⇔` for the TRK handles, the L2 lever and the L4 port, `⇕` for the L1 toggle and the L3 magnet. While a handle is dragged (the clock of its last `drag` call is under 0.15 s old), fill the ring with `rgba(255,210,63,0.35)`. In level 1 round 1, until the first `drag` call, a bubble `drag ⇔` (12 px `PAL.yellow`) bobs 30 px above the TRK handle.
4. **Legible text**: all scene text is 11 px or more, `PAL.white` or `PAL.yellow` on the dark hall. Labels stay clear of Imani (x 10 to 80, y 244 to 318), the desk, the open door and Phil. Colour always comes with a symbol or word (`⊙ out`, `⊗ into`, `→`, `←`, `⬆`, `⬇`, `p⁺`, `e⁻`). Numbers on screen besides the player's own settings: L1 two (speed, push), L2 three (field, length, mass) and four in the 30° boss rows (the angle in the inset), L3 two (port radius, speed), L4 three (yesterday's port and RF, the speed factor), L5 four (speed and angle on one tag, tube radius, screen distance). The extra numbers in L2's boss rows and L5 are each needed for the working and sit on two grouped tags.
5. **Instant response**: the button press, the floater and the beacon start on the first frame after fire; the verdict lands at the impact (6.3); a win (room glow, float, dose on target, sharp spot, `A.sound('win')`) and a miss (sparks, snap, `bad` sound) never look alike.
6. **Teaching**: `winText` is at most three sentences of working; every `missText` ends with a plain "what to change" sentence (except the two `speed` RF texts, on purpose).
7. **Living hero**: Imani, Phil, Rodney and the screen idle every frame, react to fire and show a mood after every verdict (section 4).
8. **Variety**: section 6.4.
9. **Accessibility**: every slider and button has the aria-label of section 7; the sliders are the engine's range inputs, so they work from the keyboard (fine-tune the RF with the arrow keys: the canvas track is coarse, 1.3 px per 0.1 MHz). When `window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches`, skip the beacon's turning, the rod's bob and `A.shake`.
10. **Comfort**: no full-screen flash in this game; the L1 room glow (alpha 0.3, 0.2 s) and the L5 scrape glow are the only flashes. Nothing blinks faster than 3 times a second (the beacon turns at 0.5 Hz; the LEDs every 1.5 s).

## 7. Controls and mount

Write five functions `kick`, `lift`, `cyc`, `speed` and `focus`, each `(random: () => number) => DialLevel<Round>`, each starting with `const rounds = buildRounds(n, random)`. A local helper `trk(key, lo, hi)` returns `{ dial: key, at: (_r, v) => [TRK.x0 + ((v[key] - lo) / (hi - lo)) * (TRK.x1 - TRK.x0), TRK.y], drag: (_r, px) => lo + ((px - TRK.x0) / (TRK.x1 - TRK.x0)) * (hi - lo), radius: 20 }`.

| Level | dials | handles |
|---|---|---|
| 1 | `{ key: 'out', aria: 'Kicker field: 1 out of the screen, 0 into the screen', label: 'Field', unit: '', step: 1, min: 0, max: 1, start: 1, text: (x) => (x ? 'out of the screen ⊙' : 'into the screen ⊗') }`, `{ key: 'b', aria: 'Kicker field strength in tesla', label: 'Kicker', unit: 'T', step: 0.1, min: 0.1, max: 2, start: 0.1 }` | toggle: `{ dial: 'out', at: (_r, v) => [KSWITCH.x, KSWITCH.y + (v.out ? -14 : 14)], drag: (_r, _px, py) => (py < KSWITCH.y ? 1 : 0), radius: 20 }`; `trk('b', 0.1, 2)` |
| 2 | `{ key: 'cur', aria: 'Current direction in the rod: 1 left to right, 0 right to left', label: 'Current', unit: '', step: 1, min: 0, max: 1, start: 1, text: (x) => (x ? 'left to right →' : 'right to left ←') }`, `{ key: 'i', aria: 'Current in the rod in amperes', label: 'Current size', unit: 'A', step: 0.1, min: 0.1, max: 5, start: 0.1 }` | lever: `{ dial: 'cur', at: (_r, v) => [LSWITCH.x + (v.cur ? 14 : -14), LSWITCH.y], drag: (_r, px) => (px > LSWITCH.x ? 1 : 0), radius: 20 }`; `trk('i', 0.1, 5)` |
| 3 | `{ key: 'b', aria: 'Cyclotron magnet in tesla', label: 'Magnet', unit: 'T', step: 0.1, min: 0.5, max: 2.5, start: 0.5 }`, `{ key: 'f', aria: 'RF frequency in megahertz', label: 'RF', unit: 'MHz', step: 0.1, min: 8, max: 40, start: 8 }` | magnet: `{ dial: 'b', at: (_r, v) => [BT.x, BT.y0 + ((v.b - 0.5) / 2) * (BT.y1 - BT.y0)], drag: (_r, _px, py) => 0.5 + ((py - BT.y0) / (BT.y1 - BT.y0)) * 2, radius: 20 }`; `trk('f', 8, 40)` |
| 4 | `{ key: 'r', aria: 'Extraction port radius in centimetres', label: 'Port', unit: 'cm', step: 1, min: 10, max: 80, start: 10 }`, the RF dial as in L3 | port: `{ dial: 'r', at: (_r, v) => [CYCL.x + rPx(v.r), CYCL.y], drag: (_r, px) => ((px - CYCL.x) / CYCL.R) * 80, radius: 20 }`; `trk('f', 8, 40)` |
| 5 | `{ key: 'b', aria: 'Focusing coil field in gauss', label: 'Focus coil', unit: 'G', step: 0.5, min: 1, max: 20, start: 1 }` | `trk('b', 1, 20)` |

Every `drag` also records the clock for the highlight and clears the level 1 round 1 cue (UX item 3).

Common to every level:
- `hero: { name: 'Imani', role: ROLE, ...HEROES[n - 1] }` with the role and stories of section 4; `charges: [1, 1, 0]`.
- `test: { button: '🔎 Monitor check', aria: 'Monitor check: read the beam monitor for this setting', read: (r, v) => { flash.paid(); return meterText(r, v); } }`.
- `fire: { button: '⚡ Power on', aria: 'Power on: run the beam with these settings' }`.
- `judge`, `miss: missText`, `win: winText`, `hint`, `hit: () => HIT`, `delay: verdictDelay`, and `draw`.
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(5, ctx.level)) as 1 | 2 | 3 | 4 | 5; return mountDialLevel(ctx as never, [kick, lift, cyc, speed, focus][n - 1](ctx.random) as never, ARIA); } })`.
- `ARIA = 'A hospital proton-therapy beam hall: a medical physicist at her control desk steers a beam with magnets toward a test phantom on a treatment couch.'`

## 8. game.json

Copy `docs/curriculum/gap-designs/rebuilds/json/force-lab.json` over the existing `game.json`, exactly. Its lengths were checked by script on 2026-10-31: summary 130 characters, learningOutcome 164 (no apostrophe), `adds` 109/115/127/111/111, 3 hints per level (the longest 120), 6 concepts (each at most 60), 5 misconceptions; the title "Beam Hall" and the summary are unique against every `game.json` in `src/games` and in `rebuilds/json/`. It keeps `order: 1` and `ncertRef: "Section 4.2, Magnetic force"`.

## 9. Tests

### 9.1 `logic.test.ts`

1. **Pools** (loop over every row), exactly the checks listed after 5.2:
   - kick: `Number(push13(r.v, r.b).toPrecision(3)) === r.f`; `|r.f / (1.6 r.v) − r.b| < 0.02`; `pushUp(r.pt, r.from, r.out) === (r.port === 'up')` and `pushUp(r.pt, r.from, 1 − r.out) !== (r.port === 'up')`.
   - lift: `Number((liftMN(r, r.i) / G).toPrecision(3)) === r.m`; `|r.m/1000 · G / (r.t · r.l/100 · sin θ) − r.i| < 0.02`; `liftUp(r.bOut, r.cur)` is true and `liftUp(r.bOut, 1 − r.cur)` false.
   - cyc: `Number((MP · r.v·1e7 / (Q · r.b) · 100).toPrecision(3)) === r.r`; `rfFor(r.b) === r.f`; `|lapMHz(r.b) − r.f| < 0.03`.
   - speed: `r.r === r.r0 · r.k`; `rfFor(r.b) === r.f0`; `|lapMHz(r.b) − r.f0| < 0.03`; `Math.round(r.k · r.f0 · 10) / 10 !== r.f0`.
   - focus: `Number(helixPitch(r, r.b).toPrecision(3)) === r.L`; `helixWidth(r, r.b) ≤ 0.8 · r.pipe`; `helixWidth(r, 1) ≥ r.pipe`; for every dial b, `|helixWidth(r, b) − r.pipe| / r.pipe ≥ 0.02`.
2. **One winner**: scan every reachable setting (L1: out 0, 1 × b 0.1 to 2 in 0.1; L2: cur 0, 1 × i 0.1 to 5 in 0.1; L3: b 0.5 to 2.5 × f 8 to 40 in 0.1; L4: r 10 to 80 × f 8 to 40 in 0.1; L5: b 1 to 20 in 0.5). Build the grids with `Number((lo + i·step).toFixed(6))`. Only the answer passes `judge`, and the start setting fails.
3. **Rounds**: 80 seeds `Array.from({ length: 80 }, (_, i) => i * 7919 + 13)`. Every level has 3 rounds of its kind, `assist` is `[0, 1, 2]`, round k's row comes from pool k, and no two rounds of a level have the same answer.
4. **Faults**: L1 the right b with `1 − out` gives `wrong`, b ± 0.1 gives `weak`/`strong`; L2 `1 − cur` gives `down`, i ± 0.1 gives `sag`/`jump`; L3 the right b with f ± 0.1 gives `slow`/`fast`, and b ± 0.1 with `rfFor(b ± 0.1)` gives `shallow`/`deep`; L4 `f = Math.round(k·f0·10)/10` (when it is on the dial) gives `fast` for k > 1 and `slow` for k < 1; L5 b = 1 gives `scrape`, b + 0.5 gives `short`, and b − 0.5 gives `long` or `scrape`.
5. **Words**:
   - For every row and every wrong setting in the scan, `missText` never contains the answer token: `` `${r.b} T` `` (L1, L3), `` `${r.i} A` `` (L2), `` `${r.f} MHz` `` (L3), `` `${r.r} cm` `` and `` `${r.f0} MHz` `` (L4), `` `${r.b} G` `` (L5), unless that token is the player's own value in that text. Use regexes with a leading `(^|[^0-9.])` so `1.2 T` does not match `11.2 T`.
   - `winText` contains `q v × B` (kick), `BIl sin θ = mg` (lift), `f = qB/2πm` (cyc), `has no v in it` (speed) and `v cos θ` (focus).
   - Every `goal(r)` is at most 40 characters.

### 9.2 `tests/force-lab-ui.test.ts`

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/force-lab/index';
import { buildRounds, type Round } from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/force-lab/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'force-lab', 5);
type L = 1 | 2 | 3 | 4 | 5;
const build = (level: number, seed: number) => buildRounds(level as L, createRng(seed));
const FIRE = 'Power on: run the beam with these settings';
const TEST = 'Monitor check: read the beam monitor for this setting';
const up = (x: number, s: number) => Number((x + s).toFixed(1));
function set(r: Round, right: boolean) {
  if (r.kind === 'kick') { h.setSlider(r.out, 0); h.setSlider(right ? r.b : up(r.b, 0.1), 1); }
  if (r.kind === 'lift') { h.setSlider(r.cur, 0); h.setSlider(right ? r.i : up(r.i, 0.1), 1); }
  if (r.kind === 'cyc') { h.setSlider(r.b, 0); h.setSlider(right ? r.f : up(r.f, 0.1), 1); }
  if (r.kind === 'speed') { h.setSlider(right ? r.r : r.r + 1, 0); h.setSlider(r.f0, 1); }
  if (r.kind === 'focus') h.setSlider(right ? r.b : up(r.b, 0.5));
}
shellTests<Round[]>(h, { levels: [1, 2, 3, 4, 5], build, setRight: (g, k) => set(g[k], true), setWrong: (g, k) => set(g[k], false), commit: () => h.click(FIRE) });
```

Then `describe('Beam Hall', …)`, copying the patterns of `tests/capacitor-bench-ui.test.ts`:
- Level 1 has two sliders, `Field` (0 to 1, start 1) and `Kicker` (0.1 to 2, step 0.1, start 0.1); level 3 has `Magnet` (0.5 to 2.5) and `RF` (8 to 40, step 0.1); level 5 has one slider `Focus coil` (1 to 20, step 0.5, start 1).
- Level 1 with the right strength and the wrong polarity gives a miss containing `Flip the field`, and the hearts drop to 2.
- Level 5 at 1 G gives a miss containing `scraped the glass` (1 G scrapes on every row).
- A monitor check costs a charge: `/Monitor check:/`, then a second press says `/No charges left/`.
- A win says `Beam in!` (L1), `It floats!` (L2), `Dose on target!` (L3, L4) and `Sharp spot!` (L5).
- The verdict lands at the impact: in level 2, after `h.advance(0.8)` the hearts are still 3 on a miss; after another 0.2 s they are 2.
- **Canvas recorder** (copy from `tests/capacitor-bench-ui.test.ts`): the monitor's live text (`/^push .* N [⬆⬇]$/` in L1, `/^push .* mN [⬆⬇] · weight/` in L2, `/^lap .* MHz · out/` in L3 and L4, `/^pitch .* cm · width/` in L5) is drawn in round 1, in round 2 only within 1.5 s after a monitor check, and never in round 3. No drawn text before fire contains the answer token (`` `${r.b} T` `` in L1 and L3 while the player's b differs, `` `${r.i} A` `` in L2, `` `${r.r} cm` `` in L4, `` `${r.b} G` `` in L5). The goal line is drawn at round start in every level.

## 10. Traps to avoid

- **Fixed paths**: the L1 curves, the L2 rod moves, the L3/L4 spiral, the dose depths and the L5 helix take the fixed forms of 6.3. Never compute a path, a height, a depth or a spot size from the player's value.
- **Electrons are pushed the other way**: `pushUp` already includes the sign of the charge. Draw the bunch with `+` or `−` so the player sees which it is.
- **L2 directions**: with the field out of the screen, a current to the right is pushed **down** (x̂ × ẑ = −ŷ). Do not "fix" `liftUp`.
- **L3 RF is judged against the player's own field**: `rfFor(x.b)`, not `r.f`. This is what makes "out of step" honest.
- **L4 shows yesterday's RF on purpose**: the level tests whether the player keeps it. Never draw a mark at yesterday's port radius.
- **The helix width is 2r** (the electrons start on the axis, so they swing out to a full diameter). The scrape test is `helixWidth ≥ pipe`.
- **Floats**: compare dial values with `same` (|a − b| < 1e-6), and in tests build values with `toFixed`.
- **RF fine-tuning**: keep the RF slider's step at 0.1; the canvas track is only for coarse moves.
- **Timing**: the latest verdict is 1.30 s; everything ends by 2.3 s.
- **Docs**: do not edit `docs/curriculum/physics-class-12/ch04-concept-weights.md`; the reviewer updates it.
