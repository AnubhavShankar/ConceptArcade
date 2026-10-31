# Ch 4 · Ampère Lab rebuilt as "First Plasma" (§4.6, 4.7; Examples 4.7, 4.8; Ex 4.2, 4.3, 4.4, 4.8; the toroid kept by owner decision)

Read `../README.md` first (every rule, above all "A miss must not show the answer either", "Helpers fade" and the "UX checklist"), then `README.md` in this folder. The model rebuild is `src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-bench/` (brief `../20-capacitor-bench.md`). Everything below is required unless marked optional. If a number here does not work, stop and report it; do not improvise.

The old Ampère Lab was a number-entry quiz (type a field, pick a direction). This brief **replaces the whole game** with an arcade game inside a fusion reactor (a tokamak), which happens to use every case of Ampère's law: busbars, a current-carrying plasma column, a null point between two currents, a central solenoid and a ring of toroidal coils. It keeps the id, folder and `order`, and every concept: B = μ₀I/2πr with its direction by the right-hand grip rule, the field inside and outside a thick conductor, the neutral point of two wires, the solenoid B = μ₀nI with all its layers, and the toroid (owner decision 2026-10-30: keep the toroid level, which goes beyond §4.7 of the 2026-27 edition).

## 1. Identity

| Field | Value |
|---|---|
| Game id | `ampere-lab` (unchanged), `order: 1` (unchanged) |
| Folder | `src/games/physics/class-12/ch04-moving-charges-and-magnetism/ampere-lab/` (existing) |
| Files | **Replace** `game.json` with `docs/curriculum/gap-designs/rebuilds/json/ampere-lab.json` (exact copy). **Delete and rewrite** `logic.ts`, `logic.test.ts`, `index.ts`. **Add** `art.ts`. |
| UI test | **Delete** `tests/ampere-ui.test.ts`. **Create** `tests/ampere-lab-ui.test.ts`. |
| Engine | `mountDialLevel` from `@core/dialgame`, one `DialLevel` per level (5 levels); `paidFlash`, `helperOn` from `@core/aidflash` |
| Book coverage | §4.6 (Ampère's circuital law, B = μ₀I/2πr, the right-hand grip rule; Ex 4.2, 4.3, 4.4; Example 4.7, inside and outside a wire), §4.7 (the solenoid, B = μ₀nI; Ex 4.8; Example 4.8). The two-wire null point is superposition of §4.6 fields. The toroid is the owner's kept extension. |
| Inspiration (code comment only) | Remote-handling robot games (drive the arm into a hot zone, set the tool, back out), "find the sweet spot" probe puzzles, and the shot countdown of rocket-launch games |
| Core verb | **Place a probe with a robot arm**: pick the side of a busbar and slide the probe out (L1), set two probes inside and outside the plasma (L2), slide the exhaust plate along a line (L3), stretch a solenoid's free end (L4), slide a probe across a toroid (L5); then **Fire the shot** and watch the plasma hold or break up. No other chapter 4 game places a sensor in a field. |

Search the repo for `ampere-lab/logic` before deleting the old `logic.ts`. On 2026-10-31 only its own `logic.test.ts` and `tests/ampere-ui.test.ts` import it.

## 2. What the student learns

- Ampère's law round a circle of radius r about a long straight wire gives B = μ₀I/2πr = 2 × 10⁻⁷ I/r. The field lines are circles: grip the wire with the right thumb along the current, and the fingers curl the way the field goes. At any point the field is at right angles to the line from the wire.
- Inside a column carrying a uniform current, a circle of radius r encloses only I r²/a², so B = μ₀Ir/2πa² grows with r; outside, B = μ₀I/2πr falls. The same field therefore occurs once inside and once outside (and r_in × r_out = a²).
- Two parallel currents: their fields cancel between them if the currents go the same way (at I₁/x = I₂/(d − x)), and only outside, beyond the smaller current, if they go opposite ways. The null point is always nearer the smaller current.
- Inside a long solenoid B = μ₀nI, the same everywhere inside, with n the turns per metre counted over all the layers. The same turns spread over a longer coil give a weaker field.
- In a toroid, a circle inside the winding encloses N turns of current, so B = μ₀NI/2πr; a circle in the hole (or outside the ring) encloses no net current, so B = 0 there.

## 3. The mechanic, physically

**Spanner** is a remote-handling robot that works inside a small research tokamak, a ring-shaped fusion reactor that holds a plasma (a gas of charged particles hotter than the Sun's core) with magnetic fields. Tonight is **first plasma**, and before each test shot Spanner must set one system right. Each round is one **shot**: Spanner sets its tool, the control room fires, and the plasma either **holds** (a steady pink ring on the vessel camera) or **disrupts** (it flickers, breaks up and goes dark).

| Level | The player sets | What decides the shot |
|---|---|---|
| 1 Calibrate the busbar probe | the side of the busbar (right, above, left, below) and the distance r | The probe reads only a field along its arrow: the side must be where the field circles along that arrow, and the distance where B = μ₀I/2πr equals the calibration value. |
| 2 Inside the plasma | the inner probe's radius and the outer probe's radius | Both probes must read the same field: inside, μ₀Ir/2πa²; outside, μ₀I/2πr. |
| 3 The X-point | the exhaust plate's position x along the line through the two currents | The plate must sit at the null point of the plasma current and the divertor coil's current, where the exhaust is guided. |
| 4 Stretch the solenoid | the solenoid's length L | B = μ₀(N/L)I inside, with N counted over all layers. |
| 5 The toroidal field | the probe's radius r across the ring | Inside the winding B = μ₀NI/2πr; in the hole and outside B = 0. |

Physical consequences. Every miss shows what the player's own setting did, and only its direction; every effect takes a **fixed** form:
- Every miss ends in a **disruption** on the vessel camera (the same fixed animation), after the level's own local effect.
- L1: the probe's display shows `ERR` (wrong side or wrong distance; the scene never shows which way the field pointed).
- L2: the first wrong probe (the inner one is checked first) shows `ERR`; the other shows `—` (not checked).
- L3: the exhaust stream misses the plate and scorches the vessel wall at one of two fixed points (one for "too near", one for "too far").
- L4: too short, the solenoid frosts over and its alarm shows `QUENCH!`; too long, it glows dimly and the plasma never forms.
- L5: in the hole or outside the ring the probe shows `ZERO`; in the winding at the wrong radius it shows `ERR`.

## 4. Story and characters

Hero banner: `name: 'Spanner'`, `role: 'a remote-handling robot inside a fusion reactor, getting every system ready for first plasma'`.

| Level | story | objective |
|---|---|---|
| 1 | `Tonight the reactor tries for its first plasma, and Spanner, its remote-handling robot, is setting up. Thick busbars feed the magnets, and each needs a field probe calibrated beside it. Ampère’s law round a circle of radius r gives B = μ₀I/2πr. The field circles the busbar: grip it with your right thumb along the current, and your fingers curl the way the field goes. The probe reads only a field along its arrow.` | `Put the probe on the right side of the busbar, at the distance where it reads the calibration field, in three shots.` |
| 2 | `The plasma column itself carries a current, spread evenly over its cross-section. Outside it the whole current counts: B = μ₀I/2πr. Inside, a circle of radius r encloses only I r²/a² of it, so B = μ₀Ir/2πa², growing from zero at the centre. One probe goes inside the column and one outside, and both must read the same field.` | `Set the inner and outer probes so both read the target field, in three shots.` |
| 3 | `The plasma’s exhaust must be steered onto a tough tungsten plate at the X-point, where the fields of the plasma current and the divertor coil’s current cancel. Two parallel currents the same way cancel between them; opposite ways, they cancel only outside, beyond the smaller current.` | `Slide the exhaust plate to the null point, in three shots.` |
| 4 | `The central solenoid starts the plasma current. Spanner can slide its free end on a telescopic former, spreading the same turns over a different length. Inside a long solenoid B = μ₀nI, the same everywhere inside, where n counts the turns per metre in all the layers.` | `Stretch the solenoid to the length that gives the field it needs inside, in three shots.` |
| 5 | `Last, the ring of toroidal coils that holds the plasma. A toroid is a solenoid bent into a ring. A circle inside the winding encloses N turns of current, so B = μ₀NI/2πr there; a circle in the hole encloses no current at all. The field probe slides out from the middle of the ring.` | `Slide the probe to the radius where the toroidal field is the target, in three shots.` |

Characters (each in its own function in `art.ts`, AGENTS.md item 17):
- **Spanner** (hero) stands at the bottom left on rubber tracks, base at `SPANNER` (70, 316), about 76 px tall.
  - Gear: a boxy yellow body with black hazard stripes and bolted shielding plates; a `SPANNER` stencil and a radiation-trefoil sticker on its side; a round head with one big camera eye (a lens with a moving iris) and two LED eyebrows; an antenna with a red tip LED; a jointed grey boom arm with hydraulic pistons, from the shoulder at `SHOULDER` (92, 250) to a two-finger gripper that holds the level's tool (probe, plate or the solenoid's end).
  - The arm: two straight segments from `SHOULDER` to the tool, with the elbow at the midpoint lifted 22 px; it follows the tool as the player drags.
  - Idle: the tracks inch ±1 px (`sin(t·1.2)`), the iris pulses (radius ±1 px at 1 Hz), the antenna LED blinks every 1.5 s, the head tilts toward the tool every 4 s, a small piston puff every 6 s.
  - Action (on fire, 0.00 to 0.20 s): the arm locks with a `CLUNK` floater at (96, 224), and the eye flashes white for 0.1 s.
  - Moods: happy (LED eyebrows level, a curved "smile" segment under the lens); cheer on a win (the head spins once in 0.5 s, the free gripper makes an OK sign, a `BEEP BOOP!` floater); worried on a miss (the eyebrows slant, a drop of oil runs down the head). After a disruption the eye shows static lines for 0.5 s and two sparks jump at the antenna.
- **Ana** (NPC) is the shift leader in the control-room window at `CTRL` (top left), seen from the chest up behind glass.
  - Gear: short grey hair, round glasses, a headset with a boom mic, a teal fleece, a mug reading `I ♥ PLASMA`.
  - Idle: sips from the mug every 5 s, glances down at her monitors every 3 s.
  - On fire: leans forward, `Shot away!` floater at (86, 112).
  - Win: both arms up, `Nice!` (rounds 1 and 2) or `FIRST PLASMA!` (round 3). Miss: a hand on her forehead, `Disruption…`.
- **The plasma** (the target) lives in the `VESSEL CAM` inset at `CAM` (top right): a pink glowing ring seen in perspective, with two small eyes.
  - Before the shot: dim, eyes closed as two short lines, a tiny `z` floating up every 2 s.
  - Ignite (0.60 to 0.70 s): it brightens and opens its eyes.
  - Win: a steady bright glow with a slow shimmer, eyes `^ ^`, a `mmm` floater.
  - Miss (a disruption): it wobbles (0.70 to 0.85), breaks into 12 sparks inside the inset, the eyes become `> <`, and the inset goes dark; a small flash lights the inset only (alpha 0.45 down to 0 over 0.2 s).

## 5. Rules (`logic.ts`)

### 5.1 Constants and types

```ts
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const MU0 = 4 * Math.PI * 1e-7; // T m/A

export type Dir = 'up' | 'down' | 'left' | 'right';
export interface BusRow { cur: 'out' | 'in'; arrow: Dir; I: number; ut: number; side: 0 | 1 | 2 | 3; r: number }
// I in A; ut, the calibration field, in µT; arrow, the probe's sensing direction. Answer: side (0 right, 1 above, 2 left, 3 below) and r (cm).
export interface ColRow { a: number; I: number; mt: number; rin: number; rout: number }
// a, the column's radius, in cm; I in kA; mt in mT. Answer: rin (inside) and rout (outside), cm; rin × rout = a².
export interface XptRow { same: boolean; I1: number; I2: number; d: number; x: number }
// I1 (the plasma) and I2 (the divertor coil) in kA; d, their spacing, in cm (always odd). Answer: x, the null point's distance from current 1 (cm, even).
export interface SolRow { layers: number; per: number; I: number; mt: number; L: number }
// layers × per turns, I in A, mt in mT. Answer: L (cm).
export interface TorRow { N: number; I: number; mt: number; rIn: number; rOut: number; r: number }
// N turns, I in A, mt in mT; the winding runs from rIn to rOut (cm). Answer: r (cm).

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'bus'; assist: Assist } & BusRow)
  | ({ kind: 'col'; assist: Assist } & ColRow)
  | ({ kind: 'xpt'; assist: Assist } & XptRow)
  | ({ kind: 'sol'; assist: Assist } & SolRow)
  | ({ kind: 'tor'; assist: Assist } & TorRow);
```

### 5.2 The pools (copy exactly)

Every row was checked by script on 2026-10-31 (`rebuild-checks/ch04/al-final-check.mjs`).

```ts
export const BUS: BusRow[][] = [
  [
    { cur: 'out', arrow: 'up', I: 35, ut: 35, side: 0, r: 20 }, { cur: 'out', arrow: 'left', I: 120, ut: 80, side: 1, r: 30 },
    { cur: 'out', arrow: 'down', I: 200, ut: 160, side: 2, r: 25 }, { cur: 'out', arrow: 'right', I: 90, ut: 120, side: 3, r: 15 },
  ],
  [
    { cur: 'in', arrow: 'up', I: 150, ut: 75, side: 2, r: 40 }, { cur: 'in', arrow: 'right', I: 50, ut: 100, side: 1, r: 10 },
    { cur: 'in', arrow: 'down', I: 300, ut: 80, side: 0, r: 75 }, { cur: 'in', arrow: 'left', I: 250, ut: 111, side: 3, r: 45 },
  ],
  [
    { cur: 'out', arrow: 'right', I: 400, ut: 100, side: 3, r: 80 }, { cur: 'in', arrow: 'right', I: 180, ut: 103, side: 1, r: 35 },
    { cur: 'out', arrow: 'down', I: 75, ut: 27.3, side: 2, r: 55 }, { cur: 'in', arrow: 'down', I: 500, ut: 154, side: 0, r: 65 },
  ],
];

export const COL: ColRow[][] = [
  [{ a: 12, I: 30, mt: 33.3, rin: 8, rout: 18 }, { a: 15, I: 50, mt: 40, rin: 9, rout: 25 }, { a: 10, I: 25, mt: 25, rin: 5, rout: 20 }, { a: 20, I: 60, mt: 48, rin: 16, rout: 25 }],
  [{ a: 18, I: 45, mt: 33.3, rin: 12, rout: 27 }, { a: 24, I: 96, mt: 40, rin: 12, rout: 48 }, { a: 12, I: 36, mt: 30, rin: 6, rout: 24 }, { a: 20, I: 80, mt: 40, rin: 10, rout: 40 }],
  [{ a: 30, I: 120, mt: 53.3, rin: 20, rout: 45 }, { a: 24, I: 64, mt: 40, rin: 18, rout: 32 }, { a: 18, I: 54, mt: 30, rin: 9, rout: 36 }, { a: 16, I: 64, mt: 40, rin: 8, rout: 32 }],
];

export const XPT: XptRow[][] = [
  [{ same: true, I1: 200, I2: 100, d: 57, x: 38 }, { same: true, I1: 400, I2: 300, d: 35, x: 20 }, { same: true, I1: 200, I2: 100, d: 27, x: 18 }, { same: true, I1: 400, I2: 300, d: 21, x: 12 }],
  [{ same: false, I1: 400, I2: 100, d: 21, x: 28 }, { same: false, I1: 600, I2: 100, d: 25, x: 30 }, { same: false, I1: 400, I2: 100, d: 33, x: 44 }, { same: false, I1: 600, I2: 100, d: 35, x: 42 }],
  [{ same: true, I1: 200, I2: 300, d: 35, x: 14 }, { same: false, I1: 400, I2: 100, d: 45, x: 60 }, { same: true, I1: 300, I2: 150, d: 39, x: 26 }, { same: false, I1: 800, I2: 200, d: 27, x: 36 }],
];

export const SOL: SolRow[][] = [
  [{ layers: 1, per: 500, I: 5, mt: 6.28, L: 50 }, { layers: 1, per: 800, I: 4, mt: 10.1, L: 40 }, { layers: 1, per: 600, I: 6, mt: 5.03, L: 90 }, { layers: 1, per: 1000, I: 3, mt: 6.28, L: 60 }],
  [{ layers: 5, per: 400, I: 8, mt: 25.1, L: 80 }, { layers: 3, per: 200, I: 6, mt: 15.1, L: 30 }, { layers: 4, per: 250, I: 5, mt: 6.28, L: 100 }, { layers: 2, per: 300, I: 7, mt: 7.54, L: 70 }],
  [{ layers: 6, per: 300, I: 4, mt: 8.23, L: 110 }, { layers: 4, per: 500, I: 3, mt: 6.28, L: 120 }, { layers: 3, per: 400, I: 9, mt: 30.2, L: 45 }, { layers: 8, per: 150, I: 5, mt: 11.6, L: 65 }],
];

export const TOR: TorRow[][] = [
  [{ N: 1000, I: 20, mt: 16, rIn: 15, rOut: 40, r: 25 }, { N: 500, I: 30, mt: 15, rIn: 12, rOut: 35, r: 20 }, { N: 2000, I: 10, mt: 12.5, rIn: 20, rOut: 48, r: 32 }, { N: 800, I: 25, mt: 10, rIn: 26, rOut: 52, r: 40 }],
  [{ N: 1500, I: 20, mt: 20, rIn: 18, rOut: 44, r: 30 }, { N: 1200, I: 15, mt: 15, rIn: 14, rOut: 38, r: 24 }, { N: 600, I: 40, mt: 13.3, rIn: 22, rOut: 50, r: 36 }, { N: 900, I: 20, mt: 20, rIn: 10, rOut: 32, r: 18 }],
  [{ N: 2500, I: 12, mt: 21.4, rIn: 16, rOut: 42, r: 28 }, { N: 1000, I: 35, mt: 20, rIn: 22, rOut: 50, r: 35 }, { N: 1800, I: 15, mt: 20, rIn: 15, rOut: 40, r: 27 }, { N: 2000, I: 15, mt: 27.3, rIn: 12, rOut: 36, r: 22 }],
];
```

What the script proved (repeat in `logic.test.ts`):
- BUS: `busUT(I, r)` to 3 figures is `ut`; exactly one side has the field along `arrow`, and it is `side`; `20 I / ut` gives back `r` within 1 cm; r ± 5 cm changes the field by more than 2%; each pool uses at least three different sides.
- COL: `rin × rout = a²`; both `inMT(rin)` and `outMT(rout)` are `mt` to 3 figures; each solves back within 0.2 cm; neighbours (±1 cm) differ by more than 2%; neither answer is at its dial's end.
- XPT: `x` is exactly `d·I1/(I1 + I2)` (same) or `d·I1/(I1 − I2)` (opposite); the net field is zero there; at every other dial position the net field is at least 5% of current 1's own field (no near-nulls); `d` is odd, so the even dial never lands on a current.
- SOL: `solMT(L)` to 3 figures is `mt`; it solves back within 1 cm; ±5 cm changes the field by more than 2%; the "one layer only" mistake never lands on the answer.
- TOR: `torMT(r)` to 3 figures is `mt`; the answer is at least 6 cm inside the winding from both edges; it solves back within 0.2 cm; ±1 cm changes the field by more than 2%.
- Every level: exactly one winning setting over the full dial grid (L2 on each row's own ranges), the start never wins, and no two pools of a level share an answer.

### 5.3 Physics, rounds and judging

```ts
export const DIAL = {
  side: { min: 0, max: 3, start: 0 },              // L1: 0 right, 1 above, 2 left, 3 below
  r: { min: 5, max: 100, step: 5, start: 5 },        // L1 distance, cm
  x: { min: 2, max: 98, step: 2, start: 2 },         // L3 plate position, cm from current 1
  L: { min: 20, max: 150, step: 5, start: 20 },      // L4 solenoid length, cm
  tr: { min: 2, max: 60, step: 1, start: 2 },        // L5 probe radius, cm
};
// L2's ranges depend on the round: rin from 1 to a − 1 (start 1), rout from a + 1 to 3a (start a + 1), both in steps of 1 cm.

const CCW: Dir[] = ['up', 'left', 'down', 'right'];
const FLIP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
/** L1: the field's direction on side s (0 right, 1 above, 2 left, 3 below). It circles anticlockwise on screen for a current out of the screen. */
export const fieldAt = (cur: 'out' | 'in', s: number): Dir => (cur === 'out' ? CCW[s] : FLIP[CCW[s]]);
/** L1: µT, I in A, r in cm. */
export const busUT = (I: number, r: number) => (20 * I) / r;
/** L2: mT, I in kA, lengths in cm. */
export const inMT = (r: ColRow, x: number) => (20 * r.I * x) / (r.a * r.a);
export const outMT = (r: ColRow, x: number) => (20 * r.I) / x;
/** L3: the net field (mT, signed along one fixed direction) at x cm from current 1. */
export const netMT = (r: XptRow, x: number) => (20 * r.I1) / x + ((r.same ? 1 : -1) * 20 * r.I2) / (x - r.d);
/** L4: mT inside, for a length of L cm. */
export const solTurnsPerM = (r: SolRow, L: number) => (r.layers * r.per) / (L / 100);
export const solMT = (r: SolRow, L: number) => MU0 * solTurnsPerM(r, L) * r.I * 1000;
/** L5: mT at radius x cm; zero in the hole and outside the ring. */
export const torRegion = (r: TorRow, x: number) => (x <= r.rIn ? 'hole' : x >= r.rOut ? 'outside' : 'winding');
export const torMT = (r: TorRow, x: number) => (torRegion(r, x) === 'winding' ? (0.02 * r.N * r.I) / x : 0);

const POOLS = [BUS, COL, XPT, SOL, TOR] as unknown[][][];
const KINDS = ['bus', 'col', 'xpt', 'sol', 'tor'] as const;
export function buildRounds(level: 1 | 2 | 3 | 4 | 5, random: () => number): Round[] {
  return POOLS[level - 1].map((pool, k) => ({ ...(pick(pool, random) as object), kind: KINDS[level - 1], assist: aid(k) }) as Round);
}

export type Fault = 'wrong' | 'weak' | 'strong' | 'inLow' | 'inHigh' | 'outHigh' | 'outLow' | 'near' | 'far' | 'quench' | 'dim' | 'zero';
export type Values = { side?: number; r?: number; rin?: number; rout?: number; x?: number; L?: number };

export function fault(r: Round, v: Values): Fault | null {
  switch (r.kind) {
    case 'bus':
      if (fieldAt(r.cur, v.side!) !== r.arrow) return 'wrong';
      return v.r === r.r ? null : v.r! > r.r ? 'weak' : 'strong';
    case 'col':
      if (v.rin !== r.rin) return v.rin! < r.rin ? 'inLow' : 'inHigh';
      if (v.rout !== r.rout) return v.rout! < r.rout ? 'outHigh' : 'outLow';
      return null;
    case 'xpt':
      return v.x === r.x ? null : v.x! < r.x ? 'near' : 'far';
    case 'sol':
      return v.L === r.L ? null : v.L! < r.L ? 'quench' : 'dim';
    case 'tor':
      if (torRegion(r, v.r!) !== 'winding') return 'zero';
      return v.r === r.r ? null : v.r! < r.r ? 'strong' : 'weak';
  }
}
export const judge = (r: Round, v: Values) => fault(r, v) === null;
```

- Every dial is whole-numbered, so `===` is safe.
- L1 checks the side first: on a side where the field does not point along the arrow, the probe misreads whatever the distance.
- L2 checks the inner probe first, then the outer one (as capacitor-bench L4 checks the gap before the area).
- L3: `near` means between current 1 and the null; `far` means beyond it.
- L4: a shorter coil packs more turns per metre (too strong: `quench`); a longer one too few (`dim`).
- L5: the hole and the outside give `zero`; inside the winding B falls as 1/r, so a smaller r is `strong`.
- `buildRounds` must be the **first** use of `random` in the level.
- Start settings: L1 `side 0, r 5`; L2 `rin 1, rout a + 1`; L3 `x 2`; L4 `L 20`; L5 `r 2`. None of them wins on any row (tested).

### 5.4 Words

`fmt` from `@core/judge`. Helper words:
- `SIDE = ['right of', 'above', 'left of', 'below']`; `sideWord(s)` = `` `${SIDE[s]} the busbar` ``.
- `ARROW: Record<Dir, string> = { up: '↑', down: '↓', left: '←', right: '→' }`.
- `curSym(cur)`: `cur === 'out' ? '⊙ out of the screen' : '⊗ into the screen'`.
- `sense(cur)`: `cur === 'out' ? 'anticlockwise' : 'clockwise'` (as seen on the screen).

**`goal(r)`** (each at most 40 characters):
- bus: `` `Calibrate: ${r.ut} µT along the arrow` ``
- col: `` `Both probes must read ${r.mt} mT` ``
- xpt: `Put the plate on the null point`
- sol: `` `Solenoid: ${r.mt} mT inside` ``
- tor: `` `Toroidal field: ${r.mt} mT` ``

**`intel(r)`**:
- bus: `` `The busbar carries ${r.I} A, ${curSym(r.cur)}. The probe reads only a field along its arrow ${ARROW[r.arrow]}, and must read ${r.ut} µT.` ``
- col: `` `The plasma column has a radius of ${r.a} cm and carries ${r.I} kA spread evenly over it. One probe goes inside it and one outside; both must read ${r.mt} mT.` ``
- xpt: `` `The plasma carries ${r.I1} kA and the divertor coil ${r.I2} kA, ${r.same ? 'the same way' : 'the opposite way'}, ${r.d} cm apart. The plate must sit where their fields cancel.` ``
- sol: `` `The solenoid has ${r.layers} layer${r.layers > 1 ? 's' : ''} of ${r.per} turns and carries ${r.I} A. Its field inside must be ${r.mt} mT.` ``
- tor: `` `The toroidal coil has ${r.N} turns carrying ${r.I} A. The probe slides out from the middle of the ring, through the hole and across the winding; it must read ${r.mt} mT.` ``

**Hint line**: `` `${intel(r)} ${r.assist === 0 ? 'Round 1: the probe readout is live.' : r.assist === 1 ? 'The readout is off: a probe check costs a charge.' : 'Last shot: no readout.'}` ``

**`missText(r, v)`** (the player's own setting, what it did, what to change; never the answer, and never the field's direction on a wrong side):
- bus wrong: `` `${sideWord(v.side!)[0].toUpperCase()}${sideWord(v.side!).slice(1)}, the field did not point along the probe’s arrow, so the probe misread and the shot disrupted. Use the right-hand grip rule to choose the side.` ``
- bus weak: `` `At ${v.r} cm the field was too weak for the calibration. Move the probe closer.` ``
- bus strong: `` `At ${v.r} cm the field was too strong for the calibration. Move the probe farther out.` ``
- col inLow: `` `The inner probe at ${v.rin} cm read too little: inside the column the field grows with r. Move it out.` ``
- col inHigh: `` `The inner probe at ${v.rin} cm read too much. Move it in.` ``
- col outHigh: `` `The inner probe was right, but the outer probe at ${v.rout} cm read too much: outside, the field falls as 1/r. Move it out.` ``
- col outLow: `` `The inner probe was right, but the outer probe at ${v.rout} cm read too little. Move it in.` ``
- xpt near: `` `At ${v.x} cm the two fields did not cancel: the exhaust missed the plate and scorched the wall. The null lies farther from the plasma.` ``
- xpt far: `` `At ${v.x} cm the two fields did not cancel: the exhaust missed the plate and scorched the wall. The null lies nearer the plasma.` ``
- sol quench: `` `Squeezed to ${v.L} cm, the turns were packed too tightly: the field was too strong and the solenoid quenched. Make it longer.` ``
- sol dim: `` `Stretched to ${v.L} cm, the turns were spread too thinly: the field was too weak to start the plasma. Make it shorter.` ``
- tor zero: `` `At ${v.r} cm the probe was ${torRegion(r, v.r!) === 'hole' ? 'in the hole' : 'outside the ring'}: a circle there encloses no net current, so it read zero. Move it into the winding.` ``
- tor strong: `` `At ${v.r} cm, in the winding, the field was too strong. Move the probe farther out.` ``
- tor weak: `` `At ${v.r} cm, in the winding, the field was too weak. Move the probe in.` ``

**`meterText(r, v)`** (the probe check, a charge):
- bus: `` `Probe check: ${sideWord(v.side!)}, ${v.r} cm out, the field is ${fmt(busUT(r.I, v.r!))} µT pointing ${ARROW[fieldAt(r.cur, v.side!)]}.` ``
- col: `` `Probe check: the inner probe reads ${fmt(inMT(r, v.rin!))} mT and the outer probe ${fmt(outMT(r, v.rout!))} mT.` ``
- xpt: `` `Probe check: at ${v.x} cm the net field is ${fmt(Math.abs(netMT(r, v.x!)))} mT.` ``
- sol: `` `Probe check: at ${v.L} cm long there are ${fmt(solTurnsPerM(r, v.L!))} turns per metre, and the field inside is ${fmt(solMT(r, v.L!))} mT.` ``
- tor: `` `Probe check: at ${v.r} cm the probe is ${torRegion(r, v.r!) === 'winding' ? 'in the winding' : torRegion(r, v.r!) === 'hole' ? 'in the hole' : 'outside the ring'} and reads ${fmt(torMT(r, v.r!))} mT.` ``

**`winText(r)`** (two or three sentences):
- bus: `` `Calibrated! B = μ₀I/2πr = 2 × 10⁻⁷ × ${r.I} ÷ ${fmt(r.r / 100)} = ${r.ut} µT. With the current ${curSym(r.cur)}, the right-hand grip rule makes the field circle ${sense(r.cur)}, so ${sideWord(r.side)} it points ${ARROW[r.arrow]}, along the arrow.` ``
- col: `` `Both probes agree! Outside, the whole current counts: B = μ₀I/2πr = ${r.mt} mT at ${r.rout} cm. Inside, a circle encloses only r²/a² of it, so B = μ₀Ir/2πa² = ${r.mt} mT at ${r.rin} cm, and ${r.rin} × ${r.rout} = ${r.a}².` ``
- xpt (same): `` `Exhaust on target! Currents the same way have opposing fields between them, which cancel where I₁/x = I₂/(d − x): x = d I₁/(I₁ + I₂) = ${r.d} × ${r.I1} ÷ ${r.I1 + r.I2} = ${r.x} cm, nearer the smaller current.` ``
- xpt (opposite): `` `Exhaust on target! With opposite currents the fields cancel only outside, beyond the smaller current, where I₁/x = I₂/(x − d): x = d I₁/(I₁ − I₂) = ${r.d} × ${r.I1} ÷ ${r.I1 - r.I2} = ${r.x} cm.` ``
- sol: `` `Plasma current started! n = ${r.layers} × ${r.per} ÷ ${fmt(r.L / 100)} m = ${fmt(solTurnsPerM(r, r.L))} turns per metre, and B = μ₀nI = 4π × 10⁻⁷ × ${fmt(solTurnsPerM(r, r.L))} × ${r.I} = ${r.mt} mT, the same everywhere inside.` ``
- tor: `` `Plasma held! A circle inside the winding encloses N turns of current, so B = μ₀NI/2πr and r = 2 × 10⁻⁷ × ${r.N} × ${r.I} ÷ ${fmt(r.mt / 1000)} = ${fmt(r.r / 100)} m. In the hole a circle encloses no current, so B = 0 there.` ``

## 6. Screen and art

Canvas 640 × 340 (`mountDialLevel`). Each level shows the part of the reactor Spanner is working on (cross-sections and top views, as in a technical manual), with Spanner, the control window and the vessel camera around it. **Draw over the engine background with opaque fills**, so the engine grid never shows.

```ts
export const SPANNER = { x: 70, base: 316 };             // the robot (x 30 to 110, y 240 to 316)
export const SHOULDER = { x: 92, y: 250 };                // the arm's shoulder joint
export const CTRL = { x: 10, y: 40, w: 150, h: 82 };      // the control-room window with Ana (top left)
export const CAM = { x: 474, y: 40, w: 156, h: 88 };      // the VESSEL CAM inset with the plasma (top right)
export const LCD = { x: 456, y: 300, w: 176, h: 20 };     // the probe readout: the helper (bottom right)
export const GOAL = { x: 320, y: 22 };
export const HIT: [number, number] = [320, 60];
export const C = { x: 320, y: 186 };                      // the scene centre in L1, L2 and L5
// L1
export const BUSBAR_R = 16;                                // the busbar's drawn radius (cross-section)
export const rayPx = (rCm: number) => 26 + 1.2 * rCm;      // probe distance on screen: 5 cm → 32 px, 100 cm → 146 px (a picture)
export const SIDE_V: [number, number][] = [[1, 0], [0, -1], [-1, 0], [0, 1]]; // screen directions of sides 0 to 3
export const PAD = { x: 440, y: 294, r: 24 };              // the side pad, a compass rose with four arms
// L2
export const COL_R = 70;                                   // the column's drawn radius
export const inPx = (r: ColRow, x: number) => COL_R * (x / r.a);                  // inner probe, left of the centre
export const outPx = (r: ColRow, x: number) => COL_R + 80 * ((x - r.a) / (2 * r.a)); // outer probe, right of the centre (a → 70 px, 3a → 150 px)
// L3
export const LINE = { x0: 150, y: 230, span: 330 };        // current 1 at x0; 1 cm = 3.3 px along the line
export const xPx = (xCm: number) => LINE.x0 + (xCm / 100) * LINE.span;
export const WALL_NEAR: [number, number] = [470, 120];     // where the exhaust scorches on a "near" miss
export const WALL_FAR: [number, number] = [190, 120];      // and on a "far" miss
// L4
export const SOLE = { x0: 150, y: 196, h: 60 };            // the solenoid's fixed left end and centre line (side view)
export const lenPx = (L: number) => 80 + (L - 20) * 2.4;   // 20 cm → 80 px, 150 cm → 392 px (a picture)
// L5
export const TOR_IN = 46;                                  // the ring's drawn inner radius
export const TOR_OUT = 120;                                // and outer radius
export const torPx = (r: TorRow, x: number) =>
  x <= r.rIn ? 6 + (TOR_IN - 6) * ((x - 2) / (r.rIn - 2))
  : x >= r.rOut ? TOR_OUT + 30 * ((x - r.rOut) / (60 - r.rOut))
  : TOR_IN + (TOR_OUT - TOR_IN) * ((x - r.rIn) / (r.rOut - r.rIn)); // probe on the ray to the right of C
```

### 6.1 The set

- **The reactor hall**: a dark steel wall `#121826` with riveted panel lines every 64 px, cable trays along the top (y 30 to 36), and the hall's light tinted by round (6.4).
- **The control window** at `CTRL`: a dark frame with the label `CONTROL` (11 px) above it at (85, 36); Ana behind the glass with two small monitors glowing in front of her.
- **The vessel camera** at `CAM`: a black inset with a thin cyan frame, the label `VESSEL CAM` (11 px) at (552, 36), a `REC ●` dot that blinks every 1 s, and the plasma (section 4). A shot counter in its corner: `` `SHOT ${k + 1}` `` (11 px).
- **The probe readout** at `LCD`: black with green digits and the label `PROBE READOUT` (11 px) above it at (544, 296).
- **L1, the busbar** (cross-section): a copper disc of radius `BUSBAR_R` at `C` with the current symbol drawn on it (`⊙` a dot or `⊗` a cross, 14 px, dark), and below it at (320, 214) its label `` `${r.I} A` `` (12 px). Four faint dashed guide rays (alpha 0.2) run from it to the right, up, left and down, with **no** tick marks or numbers. The probe: a grey box 22 × 14 on the end of Spanner's arm at `C + SIDE_V[side] · rayPx(r)`, with its sensing arrow drawn on it (`ARROW[r.arrow]`, 12 px, `PAL.yellow`) and a small display that shows `—` before the shot. The side pad at `PAD`: a round dial with four short arms labelled `→ ↑ ← ↓` (11 px); the arm for the player's side is lit.
- **L2, the plasma column** (cross-section): a pink disc of radius `COL_R` at `C` with a soft glow and many tiny `⊙` dots (alpha 0.35; the current flows out of the screen), its edge dashed, and the label `` `a = ${r.a} cm · ${r.I} kA` `` (12 px) at (320, 270). The inner probe (a slim grey rod with a tip LED) sits at (`C.x − inPx(r, rin)`, `C.y`) on a rail from the centre to the left edge of the column; the outer probe sits at (`C.x + outPx(r, rout)`, `C.y`) on a rail to the right. Each has a small display (`—` before the shot).
- **L3, the X-point** (cross-section): current 1, the plasma's edge current, is a pink disc (radius 14) at (`LINE.x0`, `LINE.y`); current 2, the divertor coil, is a copper disc (radius 12) at (`xPx(r.d)`, `LINE.y`). Each carries its symbol: current 1 always `⊙`; current 2 `⊙` if `same`, `⊗` if not. Labels under them at y 262 (12 px): `` `${r.I1} kA` `` and `` `${r.I2} kA` ``. A dimension line between them at y 280: `` `d = ${r.d} cm` `` (12 px). A dashed line (alpha 0.25) runs along `LINE.y` from x 150 to 480, with no ticks. The **exhaust plate**: a dark-grey tungsten tile 8 × 40 centred on the line at `xPx(x)`, held by Spanner's gripper.
- **L4, the central solenoid** (side view): a coil from `SOLE.x0` to `SOLE.x0 + lenPx(L)`, height `SOLE.h`, drawn as copper turns: always 16 turns spread evenly over the drawn length (never more or fewer with N or L), with a darker back half and a brighter front half. The left end is bolted to a stand; the right end is a flange held by Spanner's gripper. A spec plate on the stand at (150, 248): `` `${r.layers} × ${r.per} turns · ${r.I} A` `` (12 px). A field probe sits inside the coil at its middle (a small rod with an LED) and a second one sits outside, above it, at (`SOLE.x0 + lenPx(L) / 2`, 140), labelled `outside` (11 px).
- **L5, the toroidal coil** (top view): a ring at `C` from `TOR_IN` to `TOR_OUT` (a copper-coloured doughnut) wound with 36 radial copper bands; its hole is dark. The label `` `${r.N} turns · ${r.I} A` `` (12 px) at (320, 320). The probe rides a rail from the centre to the right, at (`C.x + torPx(r, x)`, `C.y`), and its tiny region tag reads `hole`, `winding` or `outside` (11 px, from `torRegion`, the player's own position) under it.

### 6.2 The helper (the probe readout at `LCD`)

| Round | Readout |
|---|---|
| 1 (`assist 0`) | live: `lcdText(r, v)` in `PAL.green` |
| 2 (`assist 1`) | `— — —`, except for 1.5 s after a probe check, when it shows `lcdText(r, v)` in `PAL.yellow` |
| 3 (`assist 2`) | `— — —` always; the check button gives `A.freeNote('No charges left this round.')` through the engine (charges `[1, 1, 0]`) |

`lcdText(r, v)` (12 px; export it with `LCD_OFF = '— — —'`):
- bus: `` `${fmt(busUT(r.I, v.r))} µT ${ARROW[fieldAt(r.cur, v.side)]}` ``
- col: `` `in ${fmt(inMT(r, v.rin))} · out ${fmt(outMT(r, v.rout))} mT` ``
- xpt: `` `net ${fmt(Math.abs(netMT(r, v.x)))} mT` ``
- sol: `` `inside ${fmt(solMT(r, v.L))} mT` ``
- tor: `` `${torRegion(r, v.r)} ${fmt(torMT(r, v.r))} mT` ``

The readout is the **only** place where the field at the player's setting (or its direction, in L1) appears before a shot. Use `const flash = paidFlash()` per level, call `flash.paid()` in `test.read`, compute `since = flash.since(t, k)` once per frame in `draw`, and `live = !shot && helperOn(r.assist, false, since)`. Set `A.canvas.dataset.lcd = live ? '1' : '0'` every frame.

### 6.3 The shot (`rt` = seconds since fire)

Every level:
- 0.00 to 0.20: Spanner's arm locks (`CLUNK`), its eye flashes; Ana leans forward (`Shot away!`). This is the instant response (UX item 5).
- 0.60 to 0.70: the plasma ignites in the vessel camera.
- 0.70 to 0.90: win: the plasma holds, glowing; miss: the disruption (section 4).
- Verdict at **0.90** (`delay: 0.9` in every level). On a win also call `A.sound('win')` at 0.90.

Each level's local effect between 0.20 and 0.60:
- **L1**: the probe's display shows `CAL ✓` (green) on a win, `ERR` (red) on any miss, from 0.40. Nothing in the scene shows the field's direction.
- **L2**: from 0.40, both displays show `✓` on a win; on a miss the first wrong probe (inner first) shows `ERR` and the other `—`.
- **L3**: from 0.20, a pink exhaust stream (a 6 px glowing band) pours down from (`LINE.x0 + 30`, 60). Win: it curves down onto the plate (a fixed quadratic curve to the plate's top at `xPx(x)`, the player's own plate) and the plate glows orange at 0.60. Near: it curves instead to `WALL_NEAR`; far: to `WALL_FAR`; a scorch mark (a dark blot, radius 8) stays there and `A.burst(that point, PAL.orange, 12, 120)` at 0.60. The stream never goes to the true null on a miss.
- **L4**: from 0.20 the coil's turns light up from left to right. Win: the coil glows steadily and a small arrow `→ B` appears inside it at 0.60. Quench: white frost puffs rise from the coil (0.40 to 0.90) and `QUENCH!` (red) at (`SOLE.x0 + lenPx(L) / 2`, 150). Dim: the coil glows at half brightness and a `…` floater rises.
- **L5**: from 0.20 yellow dots run round the ring's winding (they circle the ring's hole, one lap per 1.2 s). From 0.40 the probe's display shows `✓` (win), `ZERO` (zero) or `ERR` (weak or strong).

Everything ends by 2.3 s.

### 6.4 Rounds that look different (UX item 8)

Detect `k` inside `draw`:
- Round 1: the hall lit in cool white (`rgba(200,220,255,0.06)` over the wall); the camera reads `SHOT 1`.
- Round 2: the hall lights dimmed blue (`rgba(80,120,255,0.08)`), a row of small amber status lamps along the cable tray; `SHOT 2`.
- Round 3, the boss: red warning lamps turning slowly (0.5 Hz) at the top corners, the banner `FIRST PLASMA` (11 px, `PAL.red`) at (320, 46) under the goal, Ana standing; `SHOT 3`.

### 6.5 What must never show

- No answer is drawn: no target distance, side, radius, position or length, except the player's own settings and the given facts named in 6.1.
- No field lines, field arrows or field magnitudes in the scene before a shot; the field's direction in L1 appears only in the round 1 live readout or around a paid check.
- On a miss the scene never shows where the right spot is: the L3 exhaust goes to the fixed wall points; the L1 probe shows only `ERR`.
- The solenoid always shows 16 drawn turns; the ring always 36 bands; the guide rays have no ticks.
- `hit` is the fixed point `HIT` in every level.

### 6.6 Art functions (`art.ts`)

`hall(g, t, k)`, `controlWindow(g, t, mood)`, `vesselCam(g, t, k, state)`, `readout(g, text, color)`, `spanner(g, t, o)`, `arm(g, tool)`, `busbar(g, r)`, `sidePad(g, side)`, `probe(g, x, y, arrow, display)`, `column(g, r)`, `xpoint(g, r)`, `plate(g, x, glow)`, `exhaust(g, to, f)`, `solenoid(g, r, L, state)`, `toroid(g, r, t, live)`, `goalLine(g, text)`, `handleGrip(g, x, y, glyph, hot)`. Keep each under about 80 lines.

### 6.7 UX checklist (all ten items; logical canvas pixels)

1. **Goal on the canvas**: `goalLine(g, goal(r))` at `GOAL` (320, 22), 13 px bold `PAL.white` on a dark rounded plate (`rgba(0,0,0,0.6)`, 10 px padding), from round start until fire, and again when the round is replayed after a miss.
2. **Own setting beside its handle** (12 px `PAL.yellow`): L1 `` `${r} cm` `` 18 px beyond the probe along its ray, and the side's arrow lit on the pad; L2 `` `${rin} cm` `` above the inner probe and `` `${rout} cm` `` above the outer probe; L3 `` `${x} cm` `` above the plate; L4 `` `${L} cm` `` above the solenoid's free end; L5 `` `${r} cm` `` above the probe. Given facts are drawn the same way, in 12 px `PAL.white`, at the places in 6.1.
3. **Handles**: every handle has `radius: 20`; the game draws `handleGrip` (a white 2 px ring with a 12 px glyph): `⇔` for every slide along a line or ray (L1 to L5), `✥` for the side pad. While dragged (last `drag` call under 0.15 s ago) the ring fills with `rgba(255,210,63,0.35)`. In level 1 round 1, until the first `drag`, a bubble `drag the probe ⇔` (12 px `PAL.yellow`) bobs 30 px above the probe.
4. **Legible text**: all scene text is 11 px or more, light on the dark hall. Labels stay clear of Spanner (x 30 to 110, y 240 to 316), the busbar, the column, the plate and the ring. Colour always comes with a symbol or word (`⊙`, `⊗`, `↑`, `→`, `✓`, `ERR`, `ZERO`). Numbers on screen besides the player's own settings: L1 two, L2 three, L3 three, L4 four (layers, turns per layer and current on one spec plate, plus the goal), L5 three.
5. **Instant response**: the arm lock, the eye flash and Ana's lean start on the first frame after fire; the verdict lands at 0.90 with the plasma holding or breaking up; a win (`BEEP BOOP!`, the steady glow, `A.sound('win')`) never looks or sounds like a miss (`ERR`, scorch, frost, disruption, the engine's `bad`).
6. **Teaching**: `winText` is at most three sentences; every `missText` ends with what to change.
7. **Living hero**: Spanner, Ana and the plasma idle every frame, react to fire and show a mood after every verdict (section 4).
8. **Variety**: section 6.4, and each level is a different part of the reactor.
9. **Accessibility**: every slider and button has the aria-label of section 7; the sliders are the engine's range inputs (keyboard). When `window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches`, skip the turning warning lamps, the tracks' inching and the plasma's shimmer.
10. **Comfort**: the only flash is the disruption, inside the camera inset only (alpha ≤ 0.45, 0.2 s). Nothing blinks faster than 3 times a second (the REC dot 1 Hz, the lamps 0.5 Hz).

## 7. Controls and mount

Write five functions `bus`, `col`, `xpt`, `sol` and `tor`, each `(random: () => number) => DialLevel<Round>`, each starting with `const rounds = buildRounds(n, random)`. `dist = (px, py) => Math.hypot(px - C.x, py - C.y)`.

| Level | dials | handles |
|---|---|---|
| 1 | `{ key: 'side', aria: 'Side of the busbar for the probe: 0 right, 1 above, 2 left, 3 below', label: 'Side', unit: '', step: 1, min: 0, max: 3, start: 0, text: (x) => ['right', 'above', 'left', 'below'][x] }`, `{ key: 'r', aria: 'Probe distance from the busbar in centimetres', label: 'Distance', unit: 'cm', step: 5, min: 5, max: 100, start: 5 }` | probe: `{ dial: 'r', at: (_r, v) => [C.x + SIDE_V[v.side][0] * rayPx(v.r), C.y + SIDE_V[v.side][1] * rayPx(v.r)], drag: (_r, px, py) => (dist(px, py) - 26) / 1.2, radius: 20 }`; pad: `{ dial: 'side', at: (_r, v) => [PAD.x + 22 * SIDE_V[v.side][0], PAD.y + 22 * SIDE_V[v.side][1]], drag: (_r, px, py) => (((Math.round(Math.atan2(PAD.y - py, px - PAD.x) / (Math.PI / 2))) % 4) + 4) % 4, radius: 20 }` |
| 2 | `{ key: 'rin', aria: 'Inner probe radius in centimetres', label: 'Inner probe', unit: 'cm', step: 1, min: 1, max: (r) => r.a - 1, start: 1 }`, `{ key: 'rout', aria: 'Outer probe radius in centimetres', label: 'Outer probe', unit: 'cm', step: 1, min: (r) => r.a + 1, max: (r) => 3 * r.a, start: (r) => r.a + 1 }` | inner: `{ dial: 'rin', at: (r, v) => [C.x - inPx(r, v.rin), C.y], drag: (r, px) => ((C.x - px) / COL_R) * r.a, radius: 20 }`; outer: `{ dial: 'rout', at: (r, v) => [C.x + outPx(r, v.rout), C.y], drag: (r, px) => r.a + ((px - C.x - COL_R) / 80) * 2 * r.a, radius: 20 }` |
| 3 | `{ key: 'x', aria: 'Exhaust plate position in centimetres from the plasma current', label: 'Plate', unit: 'cm', step: 2, min: 2, max: 98, start: 2 }` | `{ dial: 'x', at: (_r, v) => [xPx(v.x), LINE.y], drag: (_r, px) => ((px - LINE.x0) / LINE.span) * 100, radius: 20 }` |
| 4 | `{ key: 'L', aria: 'Solenoid length in centimetres', label: 'Length', unit: 'cm', step: 5, min: 20, max: 150, start: 20 }` | `{ dial: 'L', at: (_r, v) => [SOLE.x0 + lenPx(v.L), SOLE.y], drag: (_r, px) => 20 + (px - SOLE.x0 - 80) / 2.4, radius: 20 }` |
| 5 | `{ key: 'r', aria: 'Probe radius from the middle of the ring in centimetres', label: 'Probe', unit: 'cm', step: 1, min: 2, max: 60, start: 2 }` | `{ dial: 'r', at: (r, v) => [C.x + torPx(r, v.r), C.y], drag: (r, px) => invTorPx(r, px - C.x), radius: 20 }`, where `invTorPx` inverts `torPx` piece by piece (write it in `art.ts` next to `torPx`) |

The engine's `slider.set` clamps and snaps every drag. Every `drag` also records the clock for the highlight and clears the level 1 round 1 cue. In L2, the inner and outer handles never overlap: the inner one stays inside x 250 to 320 and the outer one inside x 390 to 470.

Common to every level:
- `hero: { name: 'Spanner', role: ROLE, ...HEROES[n - 1] }` with the role and stories of section 4; `charges: [1, 1, 0]`.
- `test: { button: '🔎 Probe check', aria: 'Probe check: read the probe for this setting', read: (r, v) => { flash.paid(); return meterText(r, v); } }`.
- `fire: { button: '⚡ Fire the shot', aria: 'Fire a test plasma shot with these settings' }`.
- `judge`, `miss: missText`, `win: winText`, `hint`, `hit: () => HIT`, `delay: 0.9`, and `draw`.
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(5, ctx.level)) as 1 | 2 | 3 | 4 | 5; return mountDialLevel(ctx as never, [bus, col, xpt, sol, tor][n - 1](ctx.random) as never, ARIA); } })`.
- `ARIA = 'Inside a fusion reactor: a robot with a long arm sets field probes beside busbars, a plasma column and magnet coils, while a shift leader watches from the control room.'`

## 8. game.json

Copy `docs/curriculum/gap-designs/rebuilds/json/ampere-lab.json` over the existing `game.json`, exactly. Its lengths were checked by script on 2026-10-31: summary 132 characters, learningOutcome 174 with a curly apostrophe, `adds` 88/121/95/119/121, 3 hints per level (the longest 96), 6 concepts (the longest 53), 5 misconceptions; the title "First Plasma" and the summary are unique against every `game.json` in `src/games` and `rebuilds/json/`. It keeps `order: 1` and `ncertRef: "Section 4.6, Ampere's circuital law"`. The toroid level's `adds` says "(beyond Section 4.7)" on purpose (owner decision).

## 9. Tests

### 9.1 `logic.test.ts`

1. **Pools** (every row): BUS `Number(busUT(r.I, r.r).toPrecision(3)) === r.ut`, `fieldAt(r.cur, r.side) === r.arrow`, and no other side gives `r.arrow`; COL `r.rin * r.rout === r.a ** 2` and both `inMT(r, r.rin)` and `outMT(r, r.rout)` to 3 figures equal `r.mt`; XPT `netMT(r, r.x)` is 0 to 1e-9, `r.d % 2 === 1`, and for every other dial x `|netMT(r, x)| ≥ 0.05 · 20 · r.I1 / x`; SOL `Number(solMT(r, r.L).toPrecision(3)) === r.mt`; TOR `Number(torMT(r, r.r).toPrecision(3)) === r.mt`, `r.r − r.rIn ≥ 6` and `r.rOut − r.r ≥ 6`.
2. **One winner**: scan every reachable setting (L1 side 0 to 3 × r 5 to 100 in 5; L2 rin 1 to a − 1 × rout a + 1 to 3a, per row; L3 x 2 to 98 in 2; L4 L 20 to 150 in 5; L5 r 2 to 60). Only the answer passes `judge`; the start fails.
3. **Rounds**: 80 seeds `Array.from({ length: 80 }, (_, i) => i * 7919 + 13)`. Each level has 3 rounds of its kind, `assist` is `[0, 1, 2]`, round k's row comes from pool k, and no two rounds of a level have the same answer.
4. **Faults**: L1 the right r on any other side gives `wrong`, r + 5 gives `weak`, r − 5 gives `strong`; L2 rin ± 1 gives `inHigh`/`inLow`, and with the right rin, rout ± 1 gives `outLow`/`outHigh`; L3 x − 2 gives `near` and x + 2 `far`; L4 L − 5 gives `quench` and L + 5 `dim`; L5 r = 2 and r = 60 give `zero`, and r ± 1 gives `weak`/`strong`.
5. **Words**: for every row and every wrong setting, `missText` never contains the answer token (`` `${r.r} cm` `` L1, `` `${r.rin} cm` `` and `` `${r.rout} cm` `` L2, `` `${r.x} cm` `` L3, `` `${r.L} cm` `` L4, `` `${r.r} cm` `` L5) unless it is the player's own value in that text; use regexes with a leading `(^|[^0-9.])`. A `wrong` text in L1 contains none of `↑ ↓ ← →` (it must not tell the field's direction). `winText` contains `μ₀I/2πr` (bus), `r²/a²` (col), `I₁` (xpt), `μ₀nI` (sol) and `B = 0` (tor). Every `goal(r)` is at most 40 characters.

### 9.2 `tests/ampere-lab-ui.test.ts`

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/ampere-lab/index';
import { buildRounds, type Round } from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/ampere-lab/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'ampere-lab', 5);
type L = 1 | 2 | 3 | 4 | 5;
const build = (level: number, seed: number) => buildRounds(level as L, createRng(seed));
const FIRE = 'Fire a test plasma shot with these settings';
const TEST = 'Probe check: read the probe for this setting';
function set(r: Round, right: boolean) {
  if (r.kind === 'bus') { h.setSlider(r.side, 0); h.setSlider(right ? r.r : r.r + 5, 1); }
  if (r.kind === 'col') { h.setSlider(right ? r.rin : r.rin + 1, 0); h.setSlider(r.rout, 1); }
  if (r.kind === 'xpt') h.setSlider(right ? r.x : r.x + 2);
  if (r.kind === 'sol') h.setSlider(right ? r.L : r.L + 5);
  if (r.kind === 'tor') h.setSlider(right ? r.r : r.r + 1);
}
shellTests<Round[]>(h, { levels: [1, 2, 3, 4, 5], build, setRight: (g, k) => set(g[k], true), setWrong: (g, k) => set(g[k], false), commit: () => h.click(FIRE) });
```

(`r.rin + 1` is always inside the inner probe's range, since no answer sits at a range end.)

Then `describe('First Plasma', …)`, copying the patterns of `tests/capacitor-bench-ui.test.ts`:
- Level 1 has `Side` (0 to 3, start 0) and `Distance` (5 to 100, step 5, start 5); level 2's sliders take the round's ranges (for round 1, `min`/`max` of the inner slider are 1 and a − 1, of the outer a + 1 and 3a); level 5 has `Probe` (2 to 60, start 2).
- Level 5 at 2 cm gives a miss containing `encloses no net current`.
- A probe check costs a charge: `/Probe check:/`, then `/No charges left/`.
- A win says `Calibrated!` (L1), `Both probes agree!` (L2), `Exhaust on target!` (L3), `Plasma current started!` (L4) and `Plasma held!` (L5).
- The verdict lands at 0.9 s: after `h.advance(0.8)` the hearts are still 3 on a miss; after another 0.2 s they are 2.
- **Canvas recorder**: the readout's live text (`/^[\d.]+ µT [↑↓←→]$/` L1, `/^in .* · out .* mT$/` L2, `/^net .* mT$/` L3, `/^inside .* mT$/` L4, `/^(hole|winding|outside) .* mT$/` L5) is drawn in round 1, in round 2 only within 1.5 s after a probe check, and never in round 3. No text drawn before fire contains the answer token while the player's value differs. The goal line is drawn at round start in every level. In level 1, no arrow glyph other than the probe's own `ARROW[r.arrow]` and the pad's four labels is drawn before fire.

## 10. Traps to avoid

- **Never show the field's direction on a miss in L1**: with four sides, telling the player which way the field pointed would give the circulation, and the answer, in one step. `ERR` only.
- **Grip rule on screen**: a current out of the screen (`⊙`) makes the field circle anticlockwise as seen; `fieldAt` already encodes it. Do not mirror it.
- **L2 ranges belong to the round**: pass functions for `min`, `max` and `start`, so each round re-ranges its sliders (the engine calls `range` and `set` at round start).
- **L3 positions**: `d` is odd and the dial is even, so the plate never sits on a current. The exhaust goes to the fixed wall points on a miss, never toward the null.
- **L4 drawing**: always 16 drawn turns, whatever L, layers or turns per layer.
- **L5 regions**: the region tag under the probe is the player's own position (fine to show); the field value is not shown except by the readout.
- **Toroid scope**: the toroid is beyond §4.7 of this edition and is kept by owner decision. Do not "fix" it out.
- **Timing**: every verdict is at 0.90 s; everything ends by 2.3 s.
- **Docs**: do not edit `docs/curriculum/physics-class-12/ch04-concept-weights.md`; the reviewer updates it.
