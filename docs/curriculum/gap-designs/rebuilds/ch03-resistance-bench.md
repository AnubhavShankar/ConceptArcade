# Rebuild · Resistance Bench as "Line Down" (Physics Ch 3, §3.4, 3.6)

Read `../README.md` first (above all "A miss must not show the answer either", "UX checklist" and "Helpers fade"), then `README.md` in this folder. Everything below is required unless marked "optional". If a number in this brief does not work, stop and report it; do not improvise. The model rebuild is `capacitor-bench` (brief `../20-capacitor-bench.md`); the chapter's first rebuild brief, `ch03-drift-lab.md`, uses the same helper and layout conventions.

The old Resistance Bench was a number-entry quiz. This brief **replaces the whole game** with a fault-finding game in a real setting. It keeps the id and every concept: Ohm's law V = IR, ohmic and non-ohmic components, R = ρl/A, stretching a wire, and the colour code of resistors.

## 1. Identity

| Field | Value |
|---|---|
| Game id | `resistance-bench` (unchanged) |
| Folder | `src/games/physics/class-12/ch03-current-electricity/resistance-bench/` (existing) |
| Files | **Replace** `game.json` with `docs/curriculum/gap-designs/rebuilds/json/resistance-bench.json` (copy exactly). **Delete and rewrite** `logic.ts`, `logic.test.ts`, `index.ts`. **Add** `art.ts`. |
| UI test | **Delete** `tests/resistance-ui.test.ts`. **Create** `tests/resistance-bench-ui.test.ts`. |
| Engine | `mountDialLevel` from `@core/dialgame`, one `DialLevel` per level (5 levels); `paidFlash`, `helperOn`, `FLASH` from `@core/aidflash` |
| Book coverage | §3.4 (V = IR, R ∝ l, R ∝ 1/A, R = ρl/A; Ex 3.4), §3.6 (limitations of Ohm's law: non-linear, sign-dependent). The colour code is **not** in the 2026-27 text (§3.7 is now only "resistivity of various materials"), and neither is the stretched-wire rule as a worked item; both are kept because the old game taught them (rebuild rule 2). |
| Inspiration (code comment only) | Treasure-hunt and metal-detector games (drive to the spot and dig), the "where is the fault" tension of rescue-sim games, and real line crews' resistance fault location |
| Core verb | **Go to the spot on the line.** Drive the bucket truck along the valley road to the kilometre where the fault must be (levels 1, 3, 4) or to the joint that must be bad (level 2), ride the bucket up and fix it; the last level turns three colour bands on a resistor. No other chapter 3 game locates a place. |

Before deleting, search the repo for `resistance-bench/logic`: on 2026-10-31 only `tests/resistance-ui.test.ts` imports it. Delete only the files named above.

## 2. What the student learns

- Ohm's law: R = V/I, and for an ohmic conductor the ratio is the same at every voltage.
- Resistance grows in step with length: a line with a fixed number of ohms per kilometre puts a short R ÷ (Ω per km) away. A test current runs out along one wire and back along the other, so the line's loop resistance per km is twice one wire's.
- Only a part whose V–I graph is a straight line **through the origin**, the same either way round, obeys Ohm's law. A curved graph, a one-way graph, or a straight line that misses the origin is non-ohmic (§3.6).
- R = ρl/A: ohms per km come from the metal's resistivity and the cross-section; half the radius is a quarter of the area and four times the resistance.
- A wire stretched k times at constant volume is k times longer and has 1/k of its area, so its resistance is k² times; its resistivity is unchanged.
- The colour code: two digit bands and a power-of-ten band.

## 3. The mechanic, physically

**Kabir**, a lineworker, restores a valley village's power through a monsoon night. A tester at the substation puts a voltage across the two wires of a line and reads the current. The line runs on poles along a hill road from the substation (left) to the village (right), 12 km of line with a pole every kilometre. Kabir's bucket truck parks on the road; when he commits, he rides the bucket up to the wires at that spot and his headlamp shows what is there.

| Level | The player sets | What decides it |
|---|---|---|
| 1 Find the short | where the truck parks (km) | R = V/I from the tester; d = R ÷ (loop Ω per km). In the boss round the line card gives ohms per km **per wire**, so the loop is twice that. |
| 2 The corroded joint | which of 8 joints the truck parks under | Each joint's card shows its V–I trace from −2 V to +2 V. Exactly one is non-ohmic. |
| 3 A different wire | where the truck parks (km) | Loop Ω per km = 2ρ × 1000 m ÷ A. Boss: half the radius beyond a given km, so four times the Ω per km there. |
| 4 The landslide span | where the truck parks (km) | 1 Ω per km of line, but one 1 km span was stretched k times: it now has k² Ω. If the reading is less than the distance to the landslide, the short is before it. |
| 5 The burnt resistor | three colour bands | R = V/I from the label; the bands encode it. |

Consequences (every miss shows only what the player's choice did, by direction, with fixed effects):
- **Found it** (levels 1, 3, 4 win): the headlamp lights the twisted wires and a broken branch at this span, with sparks; Kabir untwists them with his insulated hot stick; a glow runs along the line and the village lights come on.
- **Line clear here** (levels 1, 3, 4 miss): the beam shows clean wires; Kabir says `Line clear here` and a fixed arrow sign beside the bucket reads `→ farther` or `← back`. The fault is never drawn.
- **Joint replaced** (level 2 win): the glow reaches the village and the health centre's `+` sign lights.
- **Breaker trips** (level 2 miss): the glow starts from the substation, stops at a **fixed** x = 200 whatever joint is bad, and the substation flashes `TRIP`. The bad joint is never marked.
- **Pump runs** (level 5 win): the relay clicks, the motor spins, the tank fills to a fixed 85%.
- **Fuse blows** (level 5, value too small): the controller's fuse pops with sparks and smoke.
- **Relay silent** (level 5, value too big): nothing clicks; a `…` bubble by the relay; the pump stays still.

## 4. Story and characters

Hero banner: `name: 'Kabir'`, `role: 'a lineworker bringing a valley’s power back through a monsoon night'`.

| Level | story | objective |
|---|---|---|
| 1 | `A monsoon storm has blacked out the valley. Kabir’s tester at the substation puts a voltage across the two wires of the line and reads the current. Somewhere the wind has twisted the two wires together, a dead short, so the test current runs out along one wire, through the short and back. R = V/I, and every kilometre of line adds the same resistance.` | `Park the bucket truck under the short, by Ohm’s law, in three tries.` |
| 2 | `The line is up, but one of the eight joints on the health centre’s spur is corroded. The tester has swept each joint from −2 V to +2 V and drawn its trace on a card. A joint that obeys Ohm’s law gives a straight line through the origin: the same V/I at every voltage, either way round. A corroded joint does not.` | `Park under the corroded joint and replace it, in three tries.` |
| 3 | `The school’s line is another wire. R = ρl/A: each wire’s resistance depends on its metal (the resistivity ρ), its length and its cross-section. Work out the ohms per kilometre from the metal and the size, and remember that the test current goes out and back. A wire with half the radius has a quarter of the area.` | `Find the short on the school’s line, in three tries.` |
| 4 | `A landslide has dragged one span of the market line and stretched its wire. Stretched k times at constant volume, a wire is k times longer and has 1/k of its area, so its resistance rises k² times; its resistivity does not change. Away from the landslide this line has 1 Ω of loop resistance per km.` | `Find the short on the market line, before or past the landslide, in three tries.` |
| 5 | `Last job: the village pump. Its controller’s resistor has burnt out, and the circuit label says how many volts it dropped at how many milliamps, so R = V/I. A carbon resistor carries its value in colour bands: two digits, then the power of ten.` | `Set the three colour bands so the pump starts, in three tries.` |

Characters (each in its own function in `art.ts`, AGENTS.md item 17):
- **Kabir** (hero), about 46 px tall.
  - Gear: a yellow hard hat with a headlamp; an orange hi-vis rain cape with two white reflective stripes; a climbing belt with a tool pouch; thick black rubber gloves to the elbow; a test meter clipped to his chest; boots; an insulated hot stick (a yellow fibreglass pole with a hook) in the bucket.
  - Pose: in play, his head and shoulders show in the truck's cab window (levels 1 to 4); in level 5 he kneels left of the controller board with a field kit.
  - Idle: a raindrop falls from the hat brim every 0.7 s (a 2 px drop falling 8 px); the headlamp beam (a faint cone, alpha 0.12) sways ±10° with `sin(1.3t)`; blinks every 3 s; wipes his face with a glove every 5 s.
  - Action: at Fire he steps into the bucket and rides the boom up (levels 1 to 4), or plugs in the resistor and pulls the pump switch (level 5).
  - Moods: `face(…, 'happy')` while waiting; squints (eyes as short lines) while the beam scans; `'cheer'` with a fist up on a win; `'worried'` with a sweat drop on a miss, shoulders dropped 3 px.
- **The bucket truck** (the level 1 to 4 handle): a white line-crew truck 52 × 22 with a cab on the left, a folded yellow boom and bucket on the bed, a red-and-white ladder rack, an orange beacon on the cab roof and the words `LINE CREW` (11 px) on the bed side. Wheels (radius 6) turn when it moves. In play it sits at `TRUCK.y` on the road.
- **Munni** (NPC), a village girl in a yellow raincoat holding a lantern, at the village end (feet at (612, 262)) in levels 1 to 4 and at the pump-house door (feet at (606, 330)) in level 5, about 30 px tall.
  - Idle: the lantern swings ±6° and its flame flickers in size (radius 3 ± 0.6, smooth `sin(9t)`); she hops from foot to foot every 2 s.
  - Win: jumps twice with the lantern raised and a `YAY!` floater at (600, 186) (level 5: (590, 250)).
  - Miss: the lantern dims to alpha 0.5 and she shrugs, with a hand-drawn `still dark…` bubble (11 px) above her.
- **The village** (the target, levels 1 to 4): five small houses at x 590 to 636, y 214 to 262, with dark windows. In level 2 one house is the health centre, with a white board and a red `+` (colour and symbol); in level 3 one has a little bell tower (the school); in level 4 a row of market stalls with bulb strings. On a win their windows light `PAL.yellow` one at a time, 0.08 s apart.
- **The joints** (level 2): grey sleeves (10 × 6) on the upper wire at each joint's x. On a win the chosen joint sparks once as Kabir cuts it out, then a shiny new sleeve replaces it.
- **The pump** (level 5): an electric motor with a fan guard at (540, 290), a pipe up to a water tank (x 560 to 620, y 110 to 200) with a level gauge marked `85%` only on a win.

## 5. Rules (`logic.ts`)

### 5.1 Constants and types

```ts
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const LINE_KM = 12;                       // the line runs 12 km from the substation to the village
export const JKM = [1, 2.5, 4, 5.5, 7, 8.5, 10, 11.5]; // level 2: where joints J1 to J8 sit, in km
export const COL = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white'] as const;
export const ABBR = ['Bk', 'Br', 'Rd', 'Or', 'Ye', 'Gn', 'Bu', 'Vi', 'Gy', 'Wh'] as const; // the swatch labels (colour is never the only cue)

export interface BreakRow { V: number; i: number; unit: 'A' | 'mA'; ohm: number; wire: boolean; d: number } // wire: ohm is per wire (boss), else per km of line; d: answer km
export interface JointRow { bad: number; kind: 'bend' | 'oneway' | 'offset'; g: number[] }            // bad: answer joint 1..8; g: each joint's conductance in A/V for its trace
export interface WireRow { metal?: 'copper' | 'aluminium'; rho?: number; A?: number; half?: true; ohm?: number; s?: number; R: number; d: number } // rho in 1e-8 Ω m, A in mm²; half: loop ohm per km up to km s, 4 × ohm beyond
export interface SlideRow { R: number; a: number; k: number; d: number }                               // 1 Ω per km of line; the span from km a to a + 1 is stretched k times
export interface BandRow { V: number; mA: number; d1: number; d2: number; m: number }                  // answer: bands d1, d2 and multiplier m

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'break'; assist: Assist } & BreakRow)
  | ({ kind: 'joint'; assist: Assist } & JointRow)
  | ({ kind: 'wire'; assist: Assist } & WireRow)
  | ({ kind: 'slide'; assist: Assist } & SlideRow)
  | ({ kind: 'bands'; assist: Assist } & BandRow);
```

### 5.2 The pools (copy exactly)

Every row was checked by script on 2026-10-31 (`scratchpad/rebuild-checks/ch03/line-down-check.mjs`): one winner over the full dial range (levels 1, 3, 4: 25 truck positions; level 2: 8 joints; level 5: all 9 × 10 × 7 band settings), the start never wins, km answers lie in 1 to 11, the displayed facts solve back to the answer exactly, the tester reading rises with distance so the scene's direction agrees with the judge at every setting, no wrong km gives the same reading as the answer, every ohmic joint has the same V/I at +2 V and −1 V while the bad joint's differ by more than 20%, every trace fits its card, no miss text names the answer, the goal lines are at most 40 characters, and **the three pools of every level have disjoint answers**.

```ts
// R = V/I (mA rows divide by 1000); d = R ÷ loop ohms per km, where the loop is ohm (wire: false) or 2 × ohm (wire: true, the boss).
export const BREAK: BreakRow[][] = [
  [{ V: 12, i: 2, unit: 'A', ohm: 1, wire: false, d: 6 }, { V: 12, i: 3, unit: 'A', ohm: 0.5, wire: false, d: 8 }, { V: 24, i: 4, unit: 'A', ohm: 2, wire: false, d: 3 },
   { V: 6, i: 1.5, unit: 'A', ohm: 0.4, wire: false, d: 10 }, { V: 9, i: 2, unit: 'A', ohm: 1, wire: false, d: 4.5 }],
  [{ V: 1.5, i: 500, unit: 'mA', ohm: 0.6, wire: false, d: 5 }, { V: 2.8, i: 400, unit: 'mA', ohm: 1, wire: false, d: 7 }, { V: 3, i: 800, unit: 'mA', ohm: 1.5, wire: false, d: 2.5 },
   { V: 4.5, i: 625, unit: 'mA', ohm: 0.8, wire: false, d: 9 }, { V: 1.1, i: 250, unit: 'mA', ohm: 0.8, wire: false, d: 5.5 }],
  [{ V: 12, i: 0.8, unit: 'A', ohm: 1, wire: true, d: 7.5 }, { V: 6, i: 1.5, unit: 'A', ohm: 0.5, wire: true, d: 4 }, { V: 1.3, i: 200, unit: 'mA', ohm: 0.5, wire: true, d: 6.5 },
   { V: 5.1, i: 300, unit: 'mA', ohm: 1, wire: true, d: 8.5 }],
];

// Round 1 'bend' (curves upward), round 2 'oneway' (conducts one way only), round 3 'offset' (straight but misses the origin).
export const JOINT: JointRow[][] = [
  [{ bad: 2, kind: 'bend', g: [1.2, 0.8, 1.5, 0.6, 1, 1.3, 0.7, 1.1] }, { bad: 5, kind: 'bend', g: [0.9, 1.4, 0.6, 1.1, 1.2, 0.8, 1.5, 0.7] }],
  [{ bad: 3, kind: 'oneway', g: [0.7, 1.3, 1.2, 0.9, 1.5, 0.6, 1.1, 1] }, { bad: 6, kind: 'oneway', g: [1.4, 0.6, 1, 1.2, 0.8, 1.3, 0.9, 1.1] }],
  [{ bad: 4, kind: 'offset', g: [1, 1.2, 0.7, 1.3, 0.9, 1.5, 0.6, 1.4] }, { bad: 7, kind: 'offset', g: [0.8, 1.1, 1.4, 0.6, 1.3, 1, 1.2, 0.9] }],
];

// Metal rows: loop ohms per km = 20 × rho ÷ A (rho in 1e-8 Ω m, A in mm², two wires of 1000 m each). Half rows: ohm per km (loop) up to km s, 4 × ohm beyond.
export const WIRE: WireRow[][] = [
  [{ metal: 'copper', rho: 1.7, A: 17, R: 9, d: 4.5 }, { metal: 'copper', rho: 1.7, A: 34, R: 6, d: 6 }, { metal: 'copper', rho: 1.7, A: 8.5, R: 12, d: 3 }, { metal: 'copper', rho: 1.7, A: 68, R: 4, d: 8 }],
  [{ metal: 'aluminium', rho: 2.8, A: 28, R: 10, d: 5 }, { metal: 'aluminium', rho: 2.8, A: 56, R: 7, d: 7 }, { metal: 'aluminium', rho: 2.8, A: 35, R: 16, d: 10 }, { metal: 'aluminium', rho: 2.8, A: 70, R: 4.4, d: 5.5 }],
  [{ half: true, ohm: 0.5, s: 4, R: 9, d: 7.5 }, { half: true, ohm: 1, s: 3, R: 17, d: 6.5 }, { half: true, ohm: 0.25, s: 6, R: 4.5, d: 9 }, { half: true, ohm: 0.5, s: 2, R: 14, d: 8.5 }],
];

// 1 Ω of loop resistance per km; the span from km a to a + 1 has k² Ω. Round 3 mixes shorts past the landslide with shorts before it (R < a).
export const SLIDE: SlideRow[][] = [
  [{ R: 7.44, a: 3, k: 1.2, d: 7 }, { R: 9.96, a: 5, k: 1.4, d: 9 }, { R: 5.44, a: 2, k: 1.2, d: 5 }, { R: 6.46, a: 4, k: 1.4, d: 5.5 }],
  [{ R: 8.69, a: 2, k: 1.3, d: 8 }, { R: 6.21, a: 3, k: 1.1, d: 6 }, { R: 10.69, a: 6, k: 1.3, d: 10 }, { R: 4.71, a: 1, k: 1.1, d: 4.5 }],
  [{ R: 3.5, a: 6, k: 1.3, d: 3.5 }, { R: 8.46, a: 1, k: 1.4, d: 7.5 }, { R: 2.5, a: 8, k: 1.2, d: 2.5 }, { R: 11.44, a: 7, k: 1.2, d: 11 }],
];

// R = V ÷ (mA / 1000) = (10 d1 + d2) × 10^m Ω.
export const BANDS: BandRow[][] = [
  [{ V: 9.4, mA: 2, d1: 4, d2: 7, m: 2 }, { V: 6.6, mA: 20, d1: 3, d2: 3, m: 1 }, { V: 3.4, mA: 5, d1: 6, d2: 8, m: 1 }, { V: 11, mA: 5, d1: 2, d2: 2, m: 2 }],
  [{ V: 2.8, mA: 0.5, d1: 5, d2: 6, m: 2 }, { V: 5.4, mA: 20, d1: 2, d2: 7, m: 1 }, { V: 9.9, mA: 0.3, d1: 3, d2: 3, m: 3 }, { V: 4.1, mA: 5, d1: 8, d2: 2, m: 1 }],
  [{ V: 4.7, mA: 0.1, d1: 4, d2: 7, m: 3 }, { V: 13.6, mA: 2, d1: 6, d2: 8, m: 2 }, { V: 6.6, mA: 0.3, d1: 2, d2: 2, m: 3 }, { V: 7.5, mA: 0.1, d1: 7, d2: 5, m: 3 }],
];
```

### 5.3 Physics, rounds and judging

```ts
export const DIAL = {
  d: { min: 0, max: 12, step: 0.5, start: 0 },  // levels 1, 3, 4: truck position in km (0 is the substation)
  j: { min: 1, max: 8, step: 1, start: 1 },     // level 2: joint
  b1: { min: 1, max: 9, step: 1, start: 1 },    // level 5: first band (never black)
  b2: { min: 0, max: 9, step: 1, start: 0 },    // level 5: second band
  m: { min: 0, max: 6, step: 1, start: 0 },     // level 5: multiplier, black (10⁰) to blue (10⁶)
};

export const amps = (r: BreakRow) => (r.unit === 'mA' ? r.i / 1000 : r.i);
export const loopOhm = (r: BreakRow) => (r.wire ? 2 * r.ohm : r.ohm);
/** Level 3 metal rows: loop ohms per km of line. */
export const metalLoop = (r: WireRow) => (20 * r.rho!) / r.A!;
/** The tester reading a short at road km d would give (levels 1, 3, 4). It rises with d. */
export function readingAt(r: Round, d: number): number {
  if (r.kind === 'break') return loopOhm(r) * d;
  if (r.kind === 'wire') {
    if (!r.half) return metalLoop(r) * d;
    return d <= r.s! ? r.ohm! * d : r.ohm! * r.s! + 4 * r.ohm! * (d - r.s!);
  }
  if (r.kind === 'slide') {
    if (d <= r.a) return d;
    if (d >= r.a + 1) return d - 1 + r.k * r.k;
    return r.a + r.k * r.k * (d - r.a);
  }
  return 0;
}
/** The tester's reading for the round (the given fact). */
export const testerR = (r: Round) => (r.kind === 'break' ? r.V / amps(r) : r.kind === 'wire' || r.kind === 'slide' ? r.R : 0);

/** Level 2: the current through joint j (1..8) at V volts, for its card's trace and the helper. */
export function jointI(r: JointRow, j: number, V: number): number {
  const g = r.g[j - 1];
  const kind = j === r.bad ? r.kind : 'ohmic';
  if (kind === 'bend') return g * V * (1 + 0.3 * V * V);
  if (kind === 'oneway') return V >= 0 ? g * V : 0.1 * g * V;
  if (kind === 'offset') return g * (V - 0.5);
  return g * V;
}
/** Level 2: V/I of joint j at +2 V and at −1 V (equal for an ohmic joint). */
export const jointVI = (r: JointRow, j: number) => ({ plus: 2 / jointI(r, j, 2), minus: -1 / jointI(r, j, -1) });

/** Level 5: the value the bands make, in ohms. */
export const bandValue = (b1: number, b2: number, m: number) => (10 * b1 + b2) * 10 ** m;
export const wantValue = (r: BandRow) => bandValue(r.d1, r.d2, r.m);
/** Ohms written the way a resistor label is: 330 Ω, 4.7 kΩ, 47 kΩ. */
export const ohms = (R: number) => (R >= 1e6 ? `${fmt(R / 1e6)} MΩ` : R >= 1e3 ? `${fmt(R / 1e3)} kΩ` : `${fmt(R)} Ω`);

export function buildRounds(level: 1 | 2 | 3 | 4 | 5, random: () => number): Round[] {
  const pools = [BREAK, JOINT, WIRE, SLIDE, BANDS][level - 1] as unknown[][];
  const kind = (['break', 'joint', 'wire', 'slide', 'bands'] as const)[level - 1];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

export type Fault = 'near' | 'far' | 'sound' | 'low' | 'high';
export type Values = { d?: number; j?: number; b1?: number; b2?: number; m?: number };

export function fault(r: Round, x: Values): Fault | null {
  switch (r.kind) {
    case 'joint':
      return x.j === r.bad ? null : 'sound';
    case 'bands': {
      const v = bandValue(x.b1!, x.b2!, x.m!);
      const want = wantValue(r);
      return v === want ? null : v < want ? 'low' : 'high';
    }
    default:
      return x.d === r.d ? null : x.d! < r.d ? 'near' : 'far'; // near: the short is farther out than the truck
  }
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;
/** The moment of the verdict, in seconds after Fire (6.3 to 6.5). */
export const verdictDelay = (r: Round) => (r.kind === 'joint' ? 1.45 : r.kind === 'bands' ? 0.65 : 0.95);
```

- `buildRounds` must be the **first** use of `random` in the level.
- All comparisons are exact: km values are halves, band values are integers.
- Start settings: truck at km 0 (the substation), joint 1, bands brown-black-black (10 Ω). None of them wins any row (tested).

### 5.4 Words

Use `fmt` from `@core/judge` for computed numbers. `unitI(r)` is `` `${r.i} ${r.unit}` ``.

**`goalText(r)`** (the goal line on the canvas, at most 40 characters):
- break: `` `Find the short: ${r.V} V drives ${unitI(r)}` ``
- joint: `'Find the corroded joint'`
- wire, slide: `` `Find the short: the tester reads ${r.R} Ω` ``
- bands: `` `Pump resistor: ${r.V} V at ${r.mA} mA` ``

**`cardText(r)`** (the line card, the given facts besides the goal line):
- break: `r.wire ? `${r.ohm} Ω per km in each wire` : `${r.ohm} Ω per km of line``
- wire metal rows: `` `${r.metal} · ρ = ${r.rho} × 10⁻⁸ Ω m · ${r.A} mm²` ``; half rows: `` `${r.ohm} Ω per km of line` `` (the `half the radius` sign at km s carries the rest, 6.1)
- joint, slide, bands: no card (level 4's facts are the goal line and the landslide sign).

**`intel(r)`** (the facts in words, used in the hint line):
- break: `` `Tester at the substation: ${r.V} V drives ${unitI(r)} round the short. ${r.wire ? `Each wire has ${r.ohm} Ω per km, and the test current runs out on one wire and back on the other.` : `The line has ${r.ohm} Ω of loop resistance per km.`}` ``
- joint: `'Each card traces its joint’s current from −2 V to +2 V. One joint is corroded.'`
- wire metal: `` `The tester reads ${r.R} Ω. This line is ${r.metal}, ρ = ${r.rho} × 10⁻⁸ Ω m, with ${r.A} mm² in each wire, and the test current goes out and back.` ``
- wire half: `` `The tester reads ${r.R} Ω. The line has ${r.ohm} Ω of loop resistance per km up to km ${r.s}; beyond it the wire has half the radius.` ``
- slide: `` `The tester reads ${r.R} Ω. The line has 1 Ω of loop resistance per km, but the landslide stretched the span from km ${r.a} to km ${r.a + 1} to ${r.k} times its length.` ``
- bands: `` `The burnt resistor dropped ${r.V} V at ${r.mA} mA.` ``

**`hintText(r)`**: `` `${intel(r)} ${r.assist === 0 ? 'Round 1: the tester screen is live.' : r.assist === 1 ? 'The tester screen is off: a tester check costs a charge.' : 'Storm at its worst: no tester screen.'}` ``

**`missText(r, x)`** (direction only; it names only the player's own choice):
- near: `` `At km ${x.d} the line was clear: the short is farther out. A bigger reading means more line between the tester and the short. Drive farther out.` ``
- far: `` `At km ${x.d} the line was clear: the short is nearer the substation. A smaller reading means less line between the tester and the short. Drive back.` ``
- sound: `` `Joint ${x.j} was sound: its trace is a straight line through the origin, so its V/I never changes. The corroded joint stayed on the line and the breaker tripped. Try another joint.` ``
- low: `` `Your bands made ${ohms(bandValue(x.b1!, x.b2!, x.m!))}: too little resistance, so too much current flowed and the pump’s fuse blew. Use a bigger value.` ``
- high: `` `Your bands made ${ohms(bandValue(x.b1!, x.b2!, x.m!))}: too much resistance, so too little current flowed and the pump’s relay never clicked. Use a smaller value.` ``

**`meterText(r, x)`** (the tester check, which costs a charge):
- break, wire, slide: `` `Tester check: a short at km ${x.d} would read ${fmt(readingAt(r, x.d!))} Ω.` ``
- joint: `` `Tester check: joint ${x.j} gives V/I = ${fmt(jointVI(r, x.j!).plus)} Ω at +2 V and ${fmt(jointVI(r, x.j!).minus)} Ω at −1 V.` ``
- bands: `` `Tester check: your bands make ${ohms(bandValue(x.b1!, x.b2!, x.m!))}.` ``

**`lcdText(r, v)`** (the tester screen, section 6.2):
- break, wire, slide: `` `short here: ${fmt(readingAt(r, v.d!))} Ω` ``
- joint: `` `J${v.j}: ${fmt(jointVI(r, v.j!).plus)} Ω at +2 V · ${fmt(jointVI(r, v.j!).minus)} Ω at −1 V` ``
- bands: `` `your bands: ${ohms(bandValue(v.b1!, v.b2!, v.m!))}` ``
- `LCD_OFF = '— — —'`.

**`winText(r)`** (two or three short sentences):
- break: `` `Lights on! R = V/I = ${r.V} V ÷ ${unitI(r)} = ${fmt(testerR(r))} Ω. ${r.wire ? `Out and back makes 2 × ${r.ohm} = ${fmt(2 * r.ohm)} Ω per km of line` : `At ${r.ohm} Ω per km`}, the short is ${fmt(testerR(r))} ÷ ${fmt(loopOhm(r))} = ${r.d} km out.` ``
- joint: `` `Health centre on! Joint ${r.bad}’s trace ${r.kind === 'bend' ? 'curved upward' : r.kind === 'oneway' ? 'carried current one way only' : 'was straight but missed the origin, because the wet joint made a small voltage of its own'}: its V/I changes, so it does not obey Ohm’s law. A sound joint gives a straight line through the origin.` ``
- wire metal: `` `School lights on! Each wire has R = ρl/A = ${r.rho} × 10⁻⁸ × 1000 ÷ (${r.A} × 10⁻⁶) = ${fmt(metalLoop(r) / 2)} Ω per km, so the loop has ${fmt(metalLoop(r))} Ω per km and the short is ${r.R} ÷ ${fmt(metalLoop(r))} = ${r.d} km out.` ``
- wire half: `` `School lights on! Half the radius is a quarter of the area, so beyond km ${r.s} the line has 4 × ${r.ohm} = ${fmt(4 * r.ohm!)} Ω per km. ${r.R} = ${r.ohm} × ${r.s} + ${fmt(4 * r.ohm!)} × (d − ${r.s}) gives d = ${r.d} km.` ``
- slide past (`r.d > r.a`): `` `Market lights on! The stretched span is ${r.k} times longer and ${r.k} times thinner, so it has ${r.k}² = ${fmt(r.k * r.k)} Ω instead of 1. ${r.R} − ${fmt(r.k * r.k)} = ${fmt(r.R - r.k * r.k)} Ω is the other ${fmt(r.d - 1)} km, so d = ${r.d} km. Its resistivity never changed.` ``
- slide before (`r.d < r.a`): `` `Market lights on! The tester read ${r.R} Ω, less than the ${r.a} Ω of line up to the landslide, so the short is before it: d = ${r.d} km. The stretched span lies beyond the short and played no part.` ``
- bands: `` `Water’s flowing! R = V/I = ${r.V} V ÷ ${r.mA} mA = ${ohms(wantValue(r))} = ${10 * r.d1 + r.d2} × 10^${r.m} Ω: ${COL[r.d1]}, ${COL[r.d2]}, ${COL[r.m]}.` ``

## 6. Screen and art

Canvas 640 × 340 (`mountDialLevel`). **Draw the whole scene over the engine's grid with opaque fills.** All scene text is at least 11 px (`text` from `@core/neon`). Use a deterministic hash for any scatter (copy `jit` and `frac` from `capacitor-bench/art.ts`); never `Math.random` in drawing.

```ts
export const KM = { x0: 60, px: 44 };                  // road km 0 is x 60; km 12 is x 588 (a picture, not to scale with the answer)
export const kmX = (km: number) => KM.x0 + KM.px * km;
export const POLE = { top: 150, base: 262 };           // poles at every whole km
export const WIRE_Y = [154, 164];                       // the two wires at the poles; each span sags 10 px at its middle (16 px over a stretched span)
export const ROAD = { y0: 268, y1: 294 };
export const TRUCK = { y: 280, w: 52, h: 22 };         // the truck's centre in play
export const CARD = { x: 12, y: 34, w: 220, h: 26 };    // the line card (given facts)
export const LCD = { x: 404, y: 34, w: 224, h: 24 };    // the tester screen (the helper)
export const JCARD = { y: 76, w: 50, h: 40 };           // level 2: one trace card per joint, centred on kmX(JKM[j - 1])
export const SW = { x0: 160, step: 32, w: 30, h: 24 };  // level 5: colour swatches, swatch i's left edge at SW.x0 + SW.step × i
export const ROWS = [214, 252, 290];                    // level 5: swatch rows for band 1, band 2 and the multiplier (centre y)
export const RES = { cx: 320, cy: 120, w: 120, h: 30 }; // level 5: the resistor body; bands at x 290, 312 and 334 (10 px wide), a gold band at 370
export const swX = (i: number) => SW.x0 + SW.step * i + SW.w / 2;
```

Layout rules (no label may overlap another, the hero or the target):
- Top band: the round banner at (12, 20) and the goal line centred at (320, 20). Below it: the line card at `CARD` (left) and the tester screen at `LCD` (right).
- Levels 1 to 4: hills y 90 to 180; poles y 150 to 262; ground y 262 to 268; road y 268 to 294; km posts at every km (white, y 296 to 302), each labelled with its km (`0`, `1` … `12`, 11 px, `PAL.dim`, centred) at baseline 314, so the level 3 sign at km s and the level 4 span can be read off the scale; the player's truck label at baseline 332.
- The substation x 4 to 56, y 196 to 262; the village x 590 to 636, y 214 to 262.

### 6.1 The valley (levels 1 to 4)

- **Sky** (opaque, full canvas), one look per round:
  - Round 1, `DUSK`: `#2a2140`, 25 rain streaks.
  - Round 2, `NIGHT`: `#141a2e`, 45 rain streaks.
  - Round 3, `MIDNIGHT STORM` (boss): `#0c0f1c`, 70 rain streaks, and every 4 s one lightning flash: a white full-canvas rectangle at alpha 0.25 for 0.08 s plus a jagged bolt on the far hills (skipped when `calm`).
  - Streak j is a 1 px line from (x, y) to (x − 3, y + 10) in `rgba(180,200,255,0.35)`, `x = (j * 53 + 17) % 640`, `y = (t * 320 + j * 37) % 340`.
- **Hills**: two dark green silhouettes (`#14261c`, `#1b3324`) from y 90 to 180, opaque, so the grid never shows.
- **The substation** (left): a fence, a grey transformer with fins, a small control hut and a gantry at x 60 where the line starts; the word `SUBSTATION` (11 px, white) left-aligned at (6, 190). Its breaker lamp (radius 4) at (30, 206): green normally, red with `TRIP` in level 2 misses.
- **The line**: poles (6 px wide, `#5b4630`) at `kmX(0)` to `kmX(12)` with crossarms at y 152; two wires (1.5 px, `#9aa3b5`) from pole to pole at `WIRE_Y`, each span a gentle sag. In level 4 the span from `kmX(r.a)` to `kmX(r.a + 1)` sags 16 px and its pole at `kmX(r.a + 1)` leans 6°; a brown mud slope (`#5a3e26`) runs down the hill to that span, and a yellow-bordered sign centred at (`kmX(r.a + 0.5)`, 122) reads `` `stretched × ${r.k}` `` (12 px bold, white).
- Level 3 half rows: a small sign on the pole at `kmX(r.s)`, centred at (`kmX(r.s)`, 132), reads `half the radius →` (11 px, white on dark).
- **The village** (right) as in section 4.
- **The road**: asphalt `#2b2f38` with a dashed white centre line; km posts and labels as in the layout rules.
- **Level 2 joint cards**: for j = 1 to 8, a dark card (`#0b1030`, white 1 px border) of `JCARD` size centred at (`kmX(JKM[j − 1])`, `JCARD.y + 20`) with a cross of axes (1 px, `PAL.dim`) at its centre and the joint's trace: 21 points for V from −2 to +2, at `(cx + 10·V, cy − 2.2·jointI(r, j, V))`, 2 px, `PAL.cyan`. Under the card, `` `J${j}` `` (11 px, white) at baseline `JCARD.y + 52`. A thin dashed line (`PAL.dim`, alpha 0.4) drops from the card to the joint's sleeve on the wire.

### 6.2 The helper (the tester screen)

The tester screen `LCD` (green text on black, 12 px, centred) is the **only** place the reading at the player's spot, a joint's V/I or the bands' value appears before a commit:

```ts
const flash = paidFlash();               // one per level function
// in draw:
const since = flash.since(t, k);
const won = shot !== null && shot.ok;
const missed = shot !== null && !shot.ok;
const live = helperOn(r.assist, won, missed ? Infinity : since);
A.canvas.dataset.lcd = live ? '1' : '0';
const screen = live ? lcdText(r, v) : LCD_OFF;
```

| Round | Tester screen |
|---|---|
| 1 (`assist 0`) | live `lcdText(r, v)` in `PAL.green` |
| 2 (`assist 1`) | `— — —`, except for `FLASH` (1.5 s) after a tester check, in `PAL.yellow`, and during a winning take |
| 3 (`assist 2`) | `— — —`, except during a winning take; the tester check gives `A.freeNote('No charges left this round.')` through the engine (charges `[1, 1, 0]`) |

In rounds 2 and 3 the screen **never** shows the live text during or after a miss. Call `flash.paid()` from `test.read`.

### 6.3 Levels 1, 3 and 4: the take (`rt` = seconds since Fire; the truck stays at `x = kmX(v.d)`)

- 0.00: the truck's beacon starts flashing orange (on for 0.25 s, off for 0.25 s: 2 a second), and a `ROGER` floater appears at (x, 232). Kabir's head leaves the cab window. **Something moves at once.**
- 0.00 to 0.15: Kabir steps onto the truck bed into the bucket.
- 0.15 to 0.60: the boom rises; the bucket goes from (x + 10, 262) to (x + 10, 172) along a quarter arc; Kabir rides it, hot stick in hand.
- 0.60 to 0.90: the headlamp beam (a cone, `rgba(255,230,140,0.25)`) sweeps from x − 40 to x + 60 along the wires; Kabir squints.
- 0.95, the verdict (`delay: 0.95`):
  - **win**: in the beam, the two wires of the span just right of x are twisted together with a broken branch hanging on them (drawn at (x + 22, 160)); `A.burst` of yellow sparks there and a `FOUND IT!` floater at (x, 128). 0.95 to 1.40: Kabir hooks the branch off with the hot stick and the wires spring apart. 1.40 to 1.90: a white glow pulse (radius 4, glow 10) runs along the upper wire from x 60 to x 588. 1.90 to 2.30: the village windows light one at a time; Munni jumps and `YAY!`.
  - **miss**: the beam shows clean wires. A hand-drawn speech bubble from Kabir reads `Line clear here` (12 px). A fixed arrow sign (a dark board 70 × 20 with 12 px bold `PAL.yellow` text) appears at (x + 40, 132): `→ farther` for `near`, `← back` for `far`. Kabir slumps (worried, sweat drop); Munni's lantern dims and her `still dark…` bubble appears. 1.60 to 2.20: the bucket lowers.
- The burst and `−1 ♥` of the engine appear at the fixed `hit` point, never at the fault.

### 6.4 Level 2: the take

- 0.00 to 0.60: as 6.3, but the truck is under joint `v.j` at `x = kmX(JKM[v.j − 1])`.
- 0.60 to 1.00: Kabir cuts out the old sleeve (a `snip` floater at (x, 128) at 0.65) and clamps a new shiny sleeve (`PAL.white`, 0.95).
- 1.00 to 1.45: the switch-on pulse runs along the upper wire from x 60 to the **fixed** x 200 (it never travels to the bad joint).
- 1.45, the verdict (`delay: 1.45`):
  - **win**: the pulse continues to x 588 (1.45 to 1.90); the health centre's `+` board lights `PAL.red` on white and its windows light; Munni's `YAY!`.
  - **miss**: the pulse vanishes at x 200; the substation's breaker lamp turns red with a `TRIP` floater at (40, 186) and `A.shake(4)`; the village stays dark; Kabir worried; Munni's `still dark…` bubble.

### 6.5 Level 5: the pump house

A separate scene:
- **Room**: a brick wall (`#3a2420` with darker mortar lines every 12 px) filling the canvas, a window at (40, 40, 80 × 60) with rain streaks behind it, a wooden floor from y 316.
- **Controller board**: a green circuit board (`#0f4a2a`, gold trace lines) at x 170 to 470, y 60 to 170, with a relay (a grey box 34 × 24 at (440, 140)), a glass fuse (a 28 × 8 tube at (440, 84)) and the resistor slot at `RES`. The resistor: a beige body (`#e8d3a0`, rounded ends) with wire leads, three colour bands (10 px wide) at x 290, 312 and 334 coloured by the player's dials, and a gold tolerance band at x 370.
- **The player's setting**: `` `${COL[v.b1]} · ${COL[v.b2]} · ${COL[v.m]}` `` (12 px bold, `PAL.yellow`, on a dark backing) centred at (320, 188).
- **Swatch rows** at `ROWS`: band 1 has 9 swatches (brown to white, value i + 1 at swatch i), band 2 has 10 (black to white, value i at swatch i), the multiplier has 7 (black to blue). Each swatch is `SW.w × SW.h`, filled with its colour (black `#111`, brown `#7a4a21`, red `#d33`, orange `#f80`, yellow `#fd3`, green `#2a2`, blue `#36f`, violet `#93c`, grey `#888`, white `#eee`) with its `ABBR` label (11 px, black or white for contrast) inside. Row labels `band 1`, `band 2`, `× 10ⁿ` (11 px, white) right-aligned at x 152. The chosen swatch has a 2 px `PAL.yellow` outline.
- **Pump and tank** on the right (section 4), and the pump switch: a red lever on the wall at (130, 236).
- **Kabir** kneels at the left (feet at (70, 316)); Munni stands at the door on the right.

The take:
- 0.00 to 0.30: Kabir pushes the resistor into its slot (it drops 6 px) with a `CLICK` floater at (320, 92). **Something moves at once.**
- 0.30: he pulls the pump switch (the lever turns from −30° to +40° over 0.15 s) with a `CLUNK` floater at (130, 210).
- 0.30 to 0.60: five yellow dots run along a gold trace from the switch to the resistor to the relay.
- 0.65, the verdict (`delay: 0.65`):
  - **win**: a `CLICK` at the relay; the motor's fan spins; water rises in the tank from 0 to a **fixed** 0.85 of its height over 1.2 s with a `WHOOSH` floater at (590, 96); Munni's `YAY!`; Kabir cheers.
  - **low**: the fuse pops: `A.burst` of yellow sparks at (440, 84), a `POP` floater, grey smoke puffs rising until 2.3 s, the board's LED turns red; Kabir worried.
  - **high**: nothing clicks; a hand-drawn `…` bubble beside the relay; the motor stays still; Kabir scratches his helmet.
- `delay: (r) => verdictDelay(r)` for every level.

### 6.6 UX checklist (README items 1 to 10, with coordinates)

1. **Goal line on the canvas.** `goalText(r)` at (320, 20), 13 px bold, `PAL.white`, centred, from the first frame of every round. Round banner (11 px, `PAL.yellow`, left at (12, 20)): `DUSK` / `NIGHT` / `MIDNIGHT STORM` in levels 1 to 4, and `JOB 1` / `JOB 2` / `LAST JOB` in level 5. The given facts besides the goal line: `cardText(r)` in the line card (12 px, white, left-aligned at (20, 52)), the level 3 `half the radius →` sign at km s, and the level 4 `stretched × k` sign. No scene shows more than 3 numbers besides the player's own setting and the km scale.
2. **The player's own setting beside its handle** (12 px bold, `PAL.yellow`, on a dark `#0b1030` backing 4 px wider than the text on each side):
   - levels 1, 3, 4: `` `${v.d} km` `` centred at (`kmX(v.d)`, 332);
   - level 2: `` `J${v.j}` `` centred at (truck x, 332);
   - level 5: the colour names line at (320, 188) (6.5).
3. **Handles.** The truck handle has `radius: 22`; the swatch handles `radius: 18`. Each draws a grip: levels 1 to 4 a filled disc (r 12, `#2b3566`) with a white ring and `⇔` (13 px, white) on the truck's bed; level 5 a white ring of radius 16 round the chosen swatch with a small `⇔` under it. The engine draws the pulse ring and its full-alpha highlight while dragged. In **level 1 round 1 only**, a `drag ⇔` cue (12 px, `PAL.yellow`) bobs above the truck at y `246 + 3·sin(4t)` until `v.d` first differs from 0; keep a `touched` flag in the level closure.
4. **Legibility.** Every scene string is 11 px or more. The goal line, the card and the screen sit above y 60; the joint cards between y 76 and 128; the signs at y 122 to 140; the truck label at y 332, clear of the km labels at y 314. Colour is never the only cue: the swatches carry `ABBR` labels, the health centre has a `+`, the arrow signs carry words, and the breaker says `TRIP`.
5. **Instant answer to Fire**: the beacon, `ROGER` and Kabir leaving the cab (levels 1 to 4) or the resistor clicking in (level 5) at rt 0. The verdict lands when the beam reveals the span, when the switch-on pulse is judged, or when the relay acts. A win plays `ok` with lights; a miss plays `bad` with the fixed failure effect.
6. **Teaching.** `winText` is two or three short sentences of working. Miss texts end by saying what to change (`Drive farther out.`, `Drive back.`, `Try another joint.`, `Use a bigger value.`, `Use a smaller value.`).
7. **A living hero**: Kabir's dripping hat, swaying headlamp and blinks; Munni's swinging lantern; the rain; moods after every result.
8. **Rounds look different**: dusk, night and the lightning storm; in level 5 the window's rain grows heavier each job and the boss job has lightning in the window.
9. **Accessibility**: every dial and button has the `aria` of section 7; sliders are native range inputs. Compute `const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;` once at mount; when `calm`, skip the lightning, draw the rain as still streaks, and keep the beacon steadily on.
10. **Comfort**: the beacon flashes 2 times a second (below 3); the lightning is one 0.08 s flash at alpha 0.25 every 4 s; no other full-canvas flash.

### 6.7 Draw order (each frame)

Levels 1 to 4: sky, hills, rain behind; substation and village; poles and wires (with the level's signs); joint cards (level 2); road, km posts and labels; the truck with its boom, bucket and Kabir; the beam; Munni; the line card, the tester screen, the goal line and banner; take effects (glow pulse, signs, bubbles); the lightning flash last. Level 5: room and window, board and resistor, swatch rows, pump and tank, Kabir, Munni, card-free top band (screen, goal, banner), take effects.

### 6.8 What must never show

- The fault (twisted wires, branch) is drawn only on a win. The bad joint is never marked before a win; a level 2 miss stops the pulse at the fixed x 200.
- No sign, glow, arrow or sound depends on how far the player is from the answer: the arrow signs have one fixed size and position relative to the bucket.
- The tester screen follows 6.2. The joint cards carry no numbers.
- `hit` is the fixed point `[320, 70]` in every level.

## 7. Controls and mount

Write one function `level(n: 1 | 2 | 3 | 4 | 5, random)` returning `DialLevel<Round>`, which builds `rounds = buildRounds(n, random)` first.

| Level | dials | handles |
|---|---|---|
| 1, 3, 4 | `{ key: 'd', aria: 'Where to park the bucket truck, in kilometres from the substation', label: 'Truck at', unit: 'km', ...DIAL.d }` | `{ dial: 'd', at: (_r, v) => [kmX(v.d), TRUCK.y], drag: (_r, px) => (px - KM.x0) / KM.px, radius: 22 }` |
| 2 | `{ key: 'j', aria: 'Which joint to park under, 1 to 8', label: 'Joint', unit: '', ...DIAL.j, text: (x) => `J${x}` }` | `{ dial: 'j', at: (_r, v) => [kmX(JKM[v.j - 1]), TRUCK.y], drag: (_r, px) => 1 + nearestJoint(px), radius: 22 }`, where `nearestJoint(px)` is the index i of `JKM` with the smallest `Math.abs(kmX(JKM[i]) - px)` |
| 5 | `{ key: 'b1', aria: 'First colour band', label: 'Band 1', unit: '', ...DIAL.b1, text: (x) => COL[x] }`, `{ key: 'b2', aria: 'Second colour band', label: 'Band 2', unit: '', ...DIAL.b2, text: (x) => COL[x] }`, `{ key: 'm', aria: 'Multiplier band, the power of ten', label: 'Multiplier', unit: '', ...DIAL.m, text: (x) => COL[x] }` | one per row: `{ dial: 'b1', at: (_r, v) => [swX(v.b1 - 1), ROWS[0]], drag: (_r, px) => 1 + Math.round((px - SW.x0 - SW.w / 2) / SW.step), radius: 18 }`, and for `b2` and `m` the same with `swX(v.b2)`, `ROWS[1]`, `Math.round(…)` (no `1 +`), and `swX(v.m)`, `ROWS[2]` |

- The slider snaps and clamps every value, so the handles may return any number.
- Common: `hero: { name: 'Kabir', role: ROLE, ...HEROES[n - 1] }`, `charges: [1, 1, 0]`.
- `test: { button: '🔎 Tester check', aria: 'Tester check: read the tester for this setting', read: (r, v) => { flash.paid(); return meterText(r, v); } }`.
- `fire`: levels 1 to 4 `{ button: '🚚 Go and fix', aria: 'Send the bucket truck up to the line here' }`; level 5 `{ button: '🔌 Switch on the pump', aria: 'Fit the resistor and switch on the pump' }`.
- `judge`, `miss: missText`, `win: winText`, `hint: hintText`, `hit: () => [320, 70]`, `delay: (r) => verdictDelay(r)`, `draw`.
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(5, ctx.level)) as 1 | 2 | 3 | 4 | 5; return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA); } })`.
- `ARIA = 'A valley at night in monsoon rain: a power line on poles runs from a substation to a dark village, with a lineworker’s bucket truck parked on the road below.'` (level 5 uses the same string; the scene changes but the job is the same).
- `ROLE = 'a lineworker bringing a valley’s power back through a monsoon night'`, and `HEROES` holds the five story and objective pairs of section 4, copied exactly.

## 8. game.json (copy exactly)

Copy `docs/curriculum/gap-designs/rebuilds/json/resistance-bench.json` over the existing `game.json`. Its lengths were checked on 2026-10-31 (`scratchpad/rebuild-checks/ch03/json-final-check.mjs`): title 9, summary 128, learningOutcome 180 (curly apostrophes only), adds at most 143, hints at most 107, 6 concepts, 5 misconceptions, mechanic `deduce-the-hidden`; the title and summary are unique against every game.json in `src/games` and `rebuilds/json`. It keeps `order: 1` and `ncertRef: "Section 3.4, Ohm's law"`, and all five old concepts word for word, adding "Resistance grows with length".

## 9. Tests

### 9.1 `logic.test.ts`

1. **Pools** (every row):
   - break: `testerR(r) / loopOhm(r)` equals `r.d` (to 1e-9).
   - wire: `readingAt(r, r.d)` equals `r.R` (to 1e-9); half rows have `r.d > r.s`.
   - slide: `readingAt(r, r.d)` equals `r.R` (to 1e-9); `r.d` is never inside `(r.a, r.a + 1)`.
   - bands: `r.V / r.mA * 1000` equals `wantValue(r)` (to 1e-9); `r.d1` in 2 to 8, `r.d2` in 1 to 8, `r.m` in 1 to 5.
   - joint: for every row and joint, an ohmic joint has `jointVI(r, j).plus === jointVI(r, j).minus` (to 1e-9) and the bad joint's two values differ by more than 20%; `|jointI| · 2.2 ≤ 15` at V = −2, −1, 0, 1, 2.
2. **One winner**: levels 1, 3, 4 scan d from 0 to 12 by 0.5; level 2 scans j from 1 to 8; level 5 scans b1 1 to 9 × b2 0 to 9 × m 0 to 6. Only the answer passes `judge`; the start fails.
3. **Direction agrees with the physics**: for every row of levels 1, 3, 4 and every wrong d, `fault` is `near` exactly when `readingAt(r, d) < testerR(r)`, and the two are never equal.
4. **Rounds never share an answer**: the answer sets of pools 0, 1 and 2 are disjoint in every level (level 5 by `wantValue`).
5. **Rounds**: 80 seeds `Array.from({ length: 80 }, (_, i) => i * 7919 + 13)`. Every level has 3 rounds of its kind, `assist` is `[0, 1, 2]`, and round k's row comes from pool k.
6. **Delays**: 0.95 (levels 1, 3, 4), 1.45 (level 2), 0.65 (level 5); all below 2.4.
7. **Words**: for every row and wrong setting, `missText` never contains the answer token, checked with a regex that has a leading `(^|[^0-9.])` and a trailing `(?![0-9]|\.[0-9])` (so `km 6` does not match `km 6.5`): `` `km ${r.d}` `` (levels 1, 3, 4), `` `Joint ${r.bad}` `` (level 2), `ohms(wantValue(r))` and the colour name `COL[r.d1]` (level 5). Every miss text ends with `Drive farther out.`, `Drive back.`, `Try another joint.`, `Use a bigger value.` or `Use a smaller value.`. `winText` contains `R = V/I` (break, bands), `straight line through the origin` (joint), `ρl/A` or `quarter of the area` (wire), and `² =` or `less than` (slide). Every `goalText` is at most 40 characters.

### 9.2 `tests/resistance-bench-ui.test.ts`

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch03-current-electricity/resistance-bench/index';
import { buildRounds, type Round } from '../src/games/physics/class-12/ch03-current-electricity/resistance-bench/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'resistance-bench', 5);
const build = (level: number, seed: number) => buildRounds(level as 1 | 2 | 3 | 4 | 5, createRng(seed));
const fireLabel = (level: number) => (level === 5 ? 'Fit the resistor and switch on the pump' : 'Send the bucket truck up to the line here');
function set(r: Round, right: boolean) {
  if (r.kind === 'joint') h.setSlider(right ? r.bad : r.bad + 1);
  else if (r.kind === 'bands') { h.setSlider(r.d1, 0); h.setSlider(right ? r.d2 : r.d2 + 1, 1); h.setSlider(r.m, 2); }
  else h.setSlider(right ? r.d : r.d + 0.5);
}
shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4, 5],
  build,
  setRight: (g, k) => set(g[k], true),
  setWrong: (g, k) => set(g[k], false),
  commit: (level) => h.click(fireLabel(level)),
});
```

(`r.bad + 1` is at most 8, `r.d2 + 1` at most 9 and `r.d + 0.5` at most 11.5, all inside the dials.)

Then `describe('Line Down', …)`:
- Levels 1, 3 and 4 have one slider `Truck at` (0 to 12, step 0.5, starts 0). Level 2 has `Joint` (1 to 8, starts 1). Level 5 has `Band 1` (1 to 9), `Band 2` (0 to 9) and `Multiplier` (0 to 6), starting at 1, 0, 0, and the readout says `brown`, `black`, `black`.
- A level 1 miss short of the answer says `farther out`; one past it says `Drive back`. The hearts drop at 0.95 s (3 hearts at 0.85 s, 2 at 1.0 s).
- A level 2 miss says `was sound` and lands at 1.45 s (3 hearts at 1.35 s, 2 at 1.5 s).
- A level 5 value too small says `fuse blew`; too big says `never clicked`; both land at 0.65 s.
- A tester check costs a charge (`/Tester check/`, then `/No charges left/`) in every level.
- A win's feedback starts with `Lights on!` (L1), `Health centre on!` (L2), `School lights on!` (L3), `Market lights on!` (L4), `Water’s flowing!` (L5).
- **Canvas recorder** (copy the `recorder` and `frame` pattern from `tests/capacitor-bench-ui.test.ts`, or use `canvasRecorder` from `tests/helpers/canvas-rec.ts`):
  - The goal line is drawn in the first frame of every round (`Find the short`, `Find the corroded joint` or `Pump resistor`).
  - The player's own label (`` `${value} km` ``, `` `J${j}` `` or the colour names) is drawn.
  - The screen's live text (`short here:` in levels 1, 3, 4; `at +2 V` in level 2; `your bands:` in level 5) is drawn in round 1; in round 2 only within 1.5 s after a tester check; never in round 3 before a win; never during or after a miss in rounds 2 and 3.
  - No drawn string contains `` `km ${r.d}` `` or `` `${r.d} km` `` before the player sets it, no level 2 frame draws `FOUND IT!` or any marker at the bad joint before a win, and no drawn string in level 5 contains `ohms(wantValue(r))` outside a round 1 or paid-check screen.
- The level 1 round 1 `drag ⇔` cue is drawn before the truck moves and not after `h.setSlider(1)`.

## 10. Traps to avoid

- **Never draw the fault before a win.** No branch, spark, glow or marker at the short or at the bad joint. The level 2 miss pulse stops at the fixed x 200.
- **Out and back**: the line's loop resistance counts both wires. Level 1's boss card says "per km in each wire" on purpose; do not double it in the card text.
- **Level 4 before or past**: `readingAt` handles both; rows with `r.d < r.a` are real rows, not errors. Never compute the answer as `R + 1 − k²` for them.
- **Band 1 is never black**: its dial runs 1 to 9, so every value has exactly one band setting.
- **Colour plus word**: every swatch shows its `ABBR` and the player's line shows the colour names.
- **Floaters are 20 px**: speech bubbles, signs and `still dark…` are hand-drawn text, not `A.float`.
- **Helper**: use `helperOn` with `missed ? Infinity : since` (6.2).
- **Timing**: everything ends by 2.35 s; the latest verdict is 1.45 s.
- **Docs**: do not edit `docs/curriculum/physics-class-12/ch03-concept-weights.md`; the reviewer updates it.
