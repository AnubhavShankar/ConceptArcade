# 20 · Capacitor Bench rebuilt as "Lightning on Set" (Physics Ch 2, §2.11 to 2.13 and 2.15)

Read `README.md` in this folder first (especially "A miss must not show the answer either"). Everything below is required unless marked "optional".

The owner did not want the old Capacitor Bench, which was a number-entry quiz. This brief **replaces the whole game** with an arcade game in a real setting. It keeps the same id, so links and the menu position stay. It keeps every concept of the old game (C = Q/V, C = ε₀A/d, a dielectric multiplies C by K, the supply connected or not) and adds the two items the audit found missing: the dielectric strength of air (§2.11) and the energy density of the field, u = ½ε₀E² (§2.15).

## 1. Identity

| Field | Value |
|---|---|
| Game id | `capacitor-bench` (unchanged) |
| Folder | `src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-bench/` (existing) |
| Files | **Replace** `game.json` with `docs/curriculum/gap-designs/json/capacitor-bench.json` (copy exactly). **Delete and rewrite** `logic.ts`, `logic.test.ts` and `index.ts`. **Add** `art.ts`. |
| UI test | **Delete** `tests/capacitor-ui.test.ts`. **Create** `tests/capacitor-bench-ui.test.ts`. |
| Engine | `mountDialLevel` from `@core/dialgame`, one `DialLevel` per level (4 levels) |
| Book coverage | §2.11 (C = Q/V, dielectric strength of air), §2.12 (C = ε₀A/d), §2.13 (C = KC₀), §2.15 (u = ½ε₀E²); Ex 2.5, 2.8, 2.9 |
| Inspiration (code comment only) | Movie-stunt games (each attempt is a "take" and the director reacts), the sparking lab sets of old monster films, rhythm games for level 4 (the flash has to land on the beat) |
| Core verb | **Rig a real plate capacitor** (turn up the charger, crank the plate gap, slide in a dielectric panel, throw the charger switch, size the plates), then **call "Action!" and pull the discharge lever**. |

Nothing else in the repo uses the old `logic.ts` exports. Check with a search for `capacitor-bench/logic` before you delete it, and delete only those five files.

## 2. What the student learns

- A capacitor's plates hold Q = CV. C depends only on the plates and what lies between them, not on Q or V.
- C = ε₀A/d: a smaller gap gives more capacitance (half the gap doubles C), and a dielectric that fills the gap multiplies C by K.
- With the charger **connected**, V stays fixed, so a dielectric panel draws in K times the charge. With the charger **unplugged**, Q is trapped, so the panel makes V fall K times.
- Air breaks down at about 3 × 10⁶ V/m, which is 3 kV per millimetre. Above that field the gap sparks over and the charge is lost.
- The energy sits in the field between the plates: u = ½ε₀E² per cubic metre, so the total is U = u × A × d (the same as ½CV²).

## 3. The mechanic, physically

**Zara**, the special-effects chief of a robot movie, has to wake the giant robot prop **TITAN-7** on camera. Her rig is a real parallel-plate capacitor: two big copper plates on insulating posts, a high-voltage charger with a knob and a voltmeter, a knife switch between the charger and the plates, a rack of dielectric panels, and a big red discharge lever. A cable runs from the top plate over a gantry to TITAN-7's head antenna. When she pulls the lever, the plates dump their charge along the cable into the robot's **power core**, a gauge on its chest.

Each round is one **take**. The director shouts "Action!" when the player commits.

| Level | The player sets | What decides the take |
|---|---|---|
| 1 Wake-up charge | the charger voltage V | The core needs an exact charge Q, with C fixed, so V = Q/C. Too much V for the plate gap and the rig flashes over. |
| 2 Set the gap | the plate gap d | The charger voltage is fixed. The core needs Q, so C = Q/V, and d comes from C = Kε₀A/d. Air flashes over at small gaps. |
| 3 Slide in a panel | the panel K and the charger switch | The rig starts charged. After the panel goes in, Q and V must both suit the take. |
| 4 Flash on cue | the plate gap d and the plate area A | The finale flash is the air between the plates breaking down. The gap sets when it fires (V = 3 kV/mm × d) and the plate area sets how much energy it releases (u × A × d). |

Physical consequences (every miss shows what the player's own setting did, and only its direction):
- **Flashover** (levels 1 and 2, air only): a jagged arc snaps between the plates themselves with a BANG. The charge is lost and the robot stays asleep.
- **Short of charge**: the core fills to a fixed 55%, one eye flickers and the robot slumps back.
- **Too much charge**: the core overflows, a fuse pops on its chest with sparks, and smoke rises from its head.
- **No spark** (level 3): the voltage is too low to jump the striker gap, and the spark fizzles in mid-air.
- **Punch-through** (level 3): the voltage is above the robot shell's rating, and the spark strikes its chest instead of the antenna.
- **Early or late flash** (level 4): the flash fires before or after the camera's shutter opens, so the frame is black.
- **Too dim or too bright** (level 4): the flash is on cue but the frame is dark or washed out.

**Fixed fills.** The core gauge shows only short, right or over, at fixed heights (55%, 80% and 100% plus overflow). It is never proportional to the charge, so a miss cannot be measured to scale up the next try.

## 4. Story and characters

Hero banner: `name: 'Zara'`, `role: 'the special-effects chief on a robot movie, who wakes the giant robot prop with a real plate capacitor'`.

| Level | story | objective |
|---|---|---|
| 1 | `The film’s big scene: the giant robot TITAN-7 wakes when lightning hits it. Zara’s rig is a real parallel-plate capacitor. Its plates hold a charge Q = CV, and when she pulls the lever it all rushes into the robot’s power core. Air breaks down at about 3 kV per millimetre, so too high a voltage for the gap makes the rig flash over. (Zara is a trained high-voltage technician. Never try this at home.)` | `Set the charger voltage so the core gets exactly the charge it needs, in three takes.` |
| 2 | `Now the charger is fixed, so Zara sets the gap between the plates instead. C = ε₀A/d: a smaller gap gives more capacitance, and a dielectric panel that fills the gap multiplies C by its constant K. Air still flashes over at 3 kV per millimetre; the panels are far stronger.` | `Crank the top plate to the gap that gives the core its charge, in three takes.` |
| 3 | `The rig is already charged, and the director wants a change. A dielectric panel slid into the gap multiplies C by K. With the charger still connected the voltage stays fixed and more charge flows in; unplugged, the charge is trapped and the voltage falls. The cable now stops short of the antenna: the spark jumps the striker gap only at 3 kV per millimetre or more, and above the shell’s rating it punches into the robot instead.` | `Pick the panel and the charger switch so the spark lands and the core gets its charge, in three takes.` |
| 4 | `The finale: a sheet of lightning between the plates themselves lights TITAN-7 for the poster shot. The charger ramps up until the air breaks down at E = 3 × 10⁶ V/m, so the gap sets when the flash fires. At that moment the field’s energy is all released: u = ½ε₀E² in every cubic metre between the plates, so the plate area sets how bright it is.` | `Set the gap and the plate area so the flash fires on cue and exposes the shot just right, in three takes.` |

Characters (each in its own function in `art.ts`, AGENTS.md item 17):
- **Zara** (hero) stands left of the rig beside the control desk (feet at about (64, 318), about 72 px tall).
  - Gear: a dark ponytail; a headset with a boom mic; safety goggles pushed up on her forehead; a black crew T-shirt with `SFX` in `PAL.yellow`; cargo trousers; a tool belt with a tape roll and pliers; thick orange rubber gloves up to the elbow; boots.
  - Pose: one gloved hand rests on the red discharge lever.
  - Idle: the ponytail sways (`sin(t·3)·3°`), she blinks every 3 s, taps the headset every 4 s, and glances at the voltmeter (a small head turn).
  - Action (on fire): the goggles drop over her eyes, she pulls the lever with both hands (it turns from −30° to +40° over 0.3 s), and a `CLUNK` floater appears.
  - Moods: `face(g, …, 'happy')` while waiting and `'cheer'` with a fist pump on a win. On any other miss, `'worried'` with a sweat drop. After a flashover she is **frazzled**: hair standing up in spikes, a grey soot smudge on one cheek and spiral eyes, drawn by hand because `face` has no such mood.
- **The Director** (NPC) sits in a canvas chair marked `DIRECTOR` in the bottom-right corner (about (596, 300), about 52 px tall).
  - Gear: a beret, round dark glasses, a long scarf and a megaphone.
  - Idle: taps a foot, frames the shot with both hands every 5 s, and checks a wristwatch.
  - On fire: raises the megaphone, with an `ACTION!` floater.
  - Win: jumps up with arms raised, the beret pops up 6 px, and a `CUT! PRINT IT!` floater appears.
  - Short, no spark, too dim, early or late: slumps and face-palms, with a `CUT…` floater.
  - Flashover, overload or punch-through: ducks behind the chair, with a `CUT! CUT!` floater.
- **TITAN-7** (the target) stands on a prop frame on the right (feet at about (512, 318), about 180 px tall).
  - Body: a boxy riveted head (44 × 36) with an antenna and a ball tip (the cable's end), two round eyes, a mouth grille, shoulders with vent slits, a chest **power core** (a vertical gauge 16 × 70 with 8 segments and a target notch at 80%), hanging arms with claw hands, and legs clamped to the frame's two posts. A thick cable runs from its back to the floor.
  - Asleep (idle, levels 1 to 3): the head droops 15°, the vents puff a tiny steam cloud every 3 s, and a dim red LED on the chest blinks every 1.5 s. The core is dark.
  - In level 4 it is already awake from the earlier levels: eyes glowing `PAL.cyan`, standing straight, fists on hips, and it turns its head toward the camera every 4 s.
  - Win (levels 1 to 3): the core fills to the notch and glows `PAL.green`, the eyes light `PAL.cyan`, the head lifts, both arms rise 30°, and steam blasts from the shoulder vents, with a `WHIRR` floater.
  - Short or no spark: one eye flickers twice, the head droops further, and a `pfft` floater appears.
  - Overload or punch-through: the core flashes `PAL.red`, a fuse on the chest pops with yellow sparks, smoke rises from the head, and the head spins one full turn.
  - Level 4 miss: the shoulders slump. Level 4 win: a fist pump.
- **The camera** (decor in levels 1 to 3, active in level 4) sits on a wheeled dolly at about (420, 282), pointing at TITAN-7. It has a film magazine on top, a red `REC` light, and a small iris icon on its side that opens when the shutter opens.
- **The clapperboard** drops in at the top centre for 0.8 s whenever a new round starts (detect `k` changing inside `draw`). It shows `SCENE 42` and `TAKE ${k + 1}`, or `FINAL TAKE` in round 3, with a `CLACK` floater.

## 5. Rules (`logic.ts`)

### 5.1 Constants and types

```ts
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const EPS0 = 8.85e-12;          // F/m, the book's value
export const EB = 3;                    // kV per mm: air breaks down at 3 × 10⁶ V/m
export const U_AIR = 0.5 * EPS0 * 9e12; // J/m³ in air at breakdown, 39.825
export const FILL = { short: 0.55, win: 0.8, over: 1 } as const; // the core gauge: fixed heights, never proportional

export interface WakeRow { c: number; unit: 'nF' | 'pF'; q: number; gap: number; v: number }   // v: answer in kV
export interface GapRow { a?: number; c0?: number; k: number; v: number; q: number; d: number } // d: answer in mm
export interface PanelRow { c0: number; v0: number; k: number; on: boolean; striker: string; vLo: number; vHi: number } // answer: panel k, switch on
export interface FlashRow { cue: number; joules: number; d: number; a: number }                  // answer: d mm, a m²

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'wake'; assist: Assist } & WakeRow)
  | ({ kind: 'gap'; assist: Assist } & GapRow)
  | ({ kind: 'panel'; assist: Assist } & PanelRow)
  | ({ kind: 'flash'; assist: Assist } & FlashRow);
```

Units used everywhere: C in nF (a `pF` row is divided by 1000), V in kV, Q in µC (nF × kV = µC), d in mm, A in m², U in J.

### 5.2 The pools (copy exactly)

Every row was checked by script on 2026-10-30. The checks are listed in section 9 and must be in `logic.test.ts`.

```ts
export const WAKE: WakeRow[][] = [
  [
    { c: 4, unit: 'nF', q: 32, gap: 4, v: 8 }, { c: 5, unit: 'nF', q: 30, gap: 4, v: 6 }, { c: 2, unit: 'nF', q: 18, gap: 4, v: 9 },
    { c: 6, unit: 'nF', q: 42, gap: 4, v: 7 }, { c: 3, unit: 'nF', q: 15, gap: 4, v: 5 },
  ],
  [
    { c: 2.5, unit: 'nF', q: 25, gap: 5, v: 10 }, { c: 1.5, unit: 'nF', q: 18, gap: 5, v: 12 },
    { c: 4, unit: 'nF', q: 44, gap: 5, v: 11 }, { c: 0.5, unit: 'nF', q: 7, gap: 5, v: 14 },
  ],
  [
    { c: 2500, unit: 'pF', q: 30, gap: 6, v: 12 }, { c: 1200, unit: 'pF', q: 18, gap: 6, v: 15 }, { c: 750, unit: 'pF', q: 9, gap: 6, v: 12 },
    { c: 4000, unit: 'pF', q: 56, gap: 6, v: 14 }, { c: 800, unit: 'pF', q: 13.6, gap: 6, v: 17 },
  ],
];

// Rows with `a`: C = Kε₀A/d. Rows with `c0`: the plates make c0 nF with air and a 6 mm gap, so C = K·c0·6/d.
// k = 1 means air (it can flash over); k > 1 is a panel that fills the gap (it never flashes over).
export const GAP: GapRow[][] = [
  [
    { a: 1, k: 1, v: 8, q: 17.7, d: 4 }, { a: 0.5, k: 1, v: 5, q: 11.1, d: 2 }, { a: 2, k: 1, v: 8, q: 28.3, d: 5 },
    { a: 1.5, k: 1, v: 10, q: 22.1, d: 6 }, { a: 1, k: 1, v: 14, q: 17.7, d: 7 },
  ],
  [
    { c0: 2, k: 3, v: 5, q: 45, d: 4 }, { c0: 1.5, k: 4, v: 6, q: 72, d: 3 }, { c0: 3, k: 2, v: 4, q: 18, d: 8 },
    { c0: 2.5, k: 6, v: 2, q: 36, d: 5 }, { c0: 2, k: 6, v: 3, q: 72, d: 3 },
  ],
  [
    { a: 1, k: 4, v: 3, q: 17.7, d: 6 }, { a: 0.5, k: 6, v: 4, q: 13.3, d: 8 }, { a: 2, k: 3, v: 2, q: 26.6, d: 4 },
    { a: 0.8, k: 5, v: 6, q: 23.6, d: 9 },
  ],
];

// on: true means the take needs more charge (keep the charger connected); false means keep the charge and lower V (unplug).
// The spark jumps the striker gap only when V ≥ vLo = 3 × striker (kV); above vHi it punches through the shell.
export const PANEL: PanelRow[][] = [
  [
    { c0: 2, v0: 12, k: 3, on: true, striker: '3', vLo: 9, vHi: 15 }, { c0: 5, v0: 8, k: 4, on: true, striker: '2', vLo: 6, vHi: 10 },
    { c0: 3, v0: 10, k: 2, on: true, striker: '2', vLo: 6, vHi: 12 }, { c0: 4, v0: 6, k: 5, on: true, striker: '1.5', vLo: 4.5, vHi: 9 },
  ],
  [
    { c0: 2, v0: 12, k: 3, on: false, striker: '1.2', vLo: 3.6, vHi: 5 }, { c0: 5, v0: 20, k: 4, on: false, striker: '1.5', vLo: 4.5, vHi: 6 },
    { c0: 3, v0: 15, k: 5, on: false, striker: '0.9', vLo: 2.7, vHi: 3.5 }, { c0: 4, v0: 12, k: 2, on: false, striker: '1.8', vLo: 5.4, vHi: 9 },
  ],
  [
    { c0: 2.5, v0: 8, k: 6, on: true, striker: '2', vLo: 6, vHi: 10 }, { c0: 1.5, v0: 14, k: 4, on: true, striker: '4', vLo: 12, vHi: 16 },
    { c0: 6, v0: 15, k: 3, on: false, striker: '1.4', vLo: 4.2, vHi: 6 }, { c0: 2, v0: 18, k: 6, on: false, striker: '0.8', vLo: 2.4, vHi: 3.5 },
  ],
];

// The camera rolls when the charger reaches `cue` kV, so d = cue/3. The flash carries U_AIR × a × d/1000 J (shown to 3 figures).
export const FLASH: FlashRow[][] = [
  [{ cue: 15, joules: 0.199, d: 5, a: 1 }, { cue: 12, joules: 0.239, d: 4, a: 1.5 }, { cue: 18, joules: 0.119, d: 6, a: 0.5 }, { cue: 9, joules: 0.239, d: 3, a: 2 }],
  [{ cue: 21, joules: 0.697, d: 7, a: 2.5 }, { cue: 24, joules: 0.398, d: 8, a: 1.25 }, { cue: 30, joules: 0.299, d: 10, a: 0.75 }, { cue: 27, joules: 0.538, d: 9, a: 1.5 }],
  [{ cue: 27, joules: 0.986, d: 9, a: 2.75 }, { cue: 33, joules: 0.767, d: 11, a: 1.75 }, { cue: 36, joules: 1.43, d: 12, a: 3 }, { cue: 30, joules: 0.896, d: 10, a: 2.25 }],
];
```

### 5.3 Physics, rounds and judging

```ts
export const DIAL = {
  v: { min: 1, max: 20, start: 2 },     // level 1, kV
  d: { min: 1, max: 12 },               // levels 2 and 4, mm (start 12 in level 2, 2 in level 4)
  k: { min: 1, max: 6, start: 1 },      // level 3: 1 is no panel (air)
  on: { min: 0, max: 1, start: 1 },     // level 3: 1 connected, 0 unplugged
  a: { min: 0.25, max: 3, step: 0.25, start: 0.25 }, // level 4, m²
};

export const nF = (r: WakeRow) => (r.unit === 'pF' ? r.c / 1000 : r.c);
/** Level 2: capacitance in nF for a gap of d mm. */
export const capOf = (r: GapRow, d: number) => (r.c0 !== undefined ? (r.k * r.c0 * 6) / d : (8.85 * r.k * r.a!) / d);
/** Level 3: Q (µC) and V (kV) after the panel goes in. */
export const after = (r: PanelRow, k: number, on: number) => (on ? { q: k * r.c0 * r.v0, v: r.v0 } : { q: r.c0 * r.v0, v: r.v0 / k });
export const targetQ = (r: PanelRow) => (r.on ? r.k * r.c0 * r.v0 : r.c0 * r.v0);
/** Level 4: the flash energy in J for a gap of d mm and plates of a m². */
export const flashJ = (d: number, a: number) => (U_AIR * a * d) / 1000;

export function buildRounds(level: 1 | 2 | 3 | 4, random: () => number): Round[] {
  const pools = [WAKE, GAP, PANEL, FLASH][level - 1] as unknown[][];
  const kind = (['wake', 'gap', 'panel', 'flash'] as const)[level - 1];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

export type Fault = 'flash' | 'short' | 'over' | 'nospark' | 'punch' | 'early' | 'late' | 'dim' | 'bright';
export type Values = { v?: number; d?: number; k?: number; on?: number; a?: number };

export function fault(r: Round, x: Values): Fault | null {
  switch (r.kind) {
    case 'wake': {
      const v = x.v!;
      if (v >= EB * r.gap) return 'flash';
      return v === r.v ? null : v < r.v ? 'short' : 'over';
    }
    case 'gap': {
      const d = x.d!;
      if (r.k === 1 && r.v >= EB * d) return 'flash';
      return d === r.d ? null : d > r.d ? 'short' : 'over';
    }
    case 'panel': {
      const { q, v } = after(r, x.k!, x.on!);
      if (v < r.vLo) return 'nospark';
      if (v > r.vHi) return 'punch';
      const qt = targetQ(r);
      return Math.abs(q - qt) < 1e-9 ? null : q < qt ? 'short' : 'over';
    }
    case 'flash': {
      if (x.d !== r.d) return x.d! < r.d ? 'early' : 'late';
      return x.a === r.a ? null : x.a! < r.a ? 'dim' : 'bright';
    }
  }
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;
```

- In level 1, `fault` checks flashover first. For example, 12 kV across a 4 mm gap is 3 kV/mm, so it flashes over even though it is also "over".
- In level 2, a larger gap means a smaller C, so `short`; a smaller gap means `over`. Only air (k = 1) flashes over.
- In level 3, the voltage checks come first: with no spark no charge reaches the core, and a punch-through hits the shell. No reachable setting lands exactly on `vLo` or `vHi`, and the test proves it.
- In level 4, the gap is checked before the area: a wrong gap makes the flash miss the shutter whatever the area.
- `buildRounds` must be the **first** use of `random` in the level, so the UI test rebuilds the same rounds from the same seed.
- Start settings: level 1 `v = 2`; level 2 `d = 12`; level 3 `k = 1`, `on = 1`; level 4 `d = 2`, `a = 0.25`. None of them wins on any row (tested).

### 5.4 Words

Number formatting: use `fmt` from `@core/judge` (3 significant figures). Use `cText(r)`, which gives `` `${r.c} ${r.unit}` ``.

**`intel(r)`** (the round's facts):
- wake: `` `Rig: C = ${cText(r)}, with ${r.gap} mm of air between the plates. TITAN-7’s core needs ${r.q} µC.` ``
- gap with `a`: `` `Plates of ${r.a} m², charger at ${r.v} kV, ${r.k === 1 ? 'air between the plates' : `a K = ${r.k} panel filling the gap`}. The core needs ${r.q} µC.` ``
- gap with `c0`: `` `With air and a 6 mm gap these plates make ${r.c0} nF. Charger at ${r.v} kV, with K = ${r.k} panels filling the gap. The core needs ${r.q} µC.` ``
- panel: `` `The rig holds ${r.c0} nF charged to ${r.v0} kV. The core needs ${fmt(targetQ(r))} µC. Striker gap ${r.striker} mm; the robot’s shell is rated to ${r.vHi} kV.` ``
- flash: `` `The camera rolls when the charger reaches ${r.cue} kV. The shot needs a flash of ${r.joules} J.` ``

**Hint line**: `` `${intel(r)} ${r.assist === 0 ? 'Round 1: the rig meter is live.' : r.assist === 1 ? 'The meter is off: a meter check costs a charge.' : 'Final take: no meter.'}` ``

**`missText(r, x)`**: what the player's setting did, by `fault`. It never prints the answer.
- wake flash: `` `At ${v} kV across ${r.gap} mm of air the field reached 3 kV per millimetre: the air broke down and the rig flashed over between its own plates.` ``
- wake short: `` `At ${v} kV the plates held too little charge: TITAN-7’s core only flickered.` ``
- wake over: `` `At ${v} kV the plates held too much charge: the core overloaded and blew its fuse.` ``
- gap flash: `` `With only ${d} mm of air, ${r.v} kV is 3 kV per millimetre or more: the air broke down and the rig flashed over.` ``
- gap short: `` `With a ${d} mm gap the capacitance was too small: the core got too little charge and only flickered.` ``
- gap over: `` `With a ${d} mm gap the capacitance was too big: the core got too much charge and blew its fuse.` ``
- For the panel texts, `lead` is `` `${on ? 'With the charger connected' : 'With the charger unplugged'} ${k === 1 ? 'and no panel' : `and the K = ${k} panel`},` ``. Then:
  - nospark: `` `${lead} the voltage ended too low to jump the striker gap: the spark fizzled out in mid-air.` ``
  - punch: `` `${lead} the voltage ended too high for the robot’s shell: the spark punched into its chest.` ``
  - short: `` `${lead} the spark landed, but the core got too little charge and only flickered.` ``
  - over: `` `${lead} the spark landed, but the core got too much charge and blew its fuse.` ``
- flash early: `` `A ${d} mm gap broke down before the charger reached the cue: the flash went off before the camera rolled.` ``
- flash late: `` `A ${d} mm gap held out past the cue: the camera had stopped rolling when the flash came.` ``
- flash dim: `` `On cue, but plates of ${a} m² stored too little energy in the field: the frame came out dark.` ``
- flash bright: `` `On cue, but plates of ${a} m² stored too much energy in the field: the frame washed out white.` ``

**`meterText(r, x)`** (the meter check, a charge; also the live LCD text in round 1, shortened as in 6.2):
- wake: `` `Meter check: at ${v} kV these plates hold ${fmt(nF(r) * v)} µC.` ``
- gap: `` `Meter check: a ${d} mm gap gives C = ${fmt(capOf(r, d))} nF, so the plates hold ${fmt(capOf(r, d) * r.v)} µC.` ``
- panel: `` `Meter check: after the panel goes in, V = ${fmt(after(r, k, on).v)} kV and Q = ${fmt(after(r, k, on).q)} µC.` ``
- flash: `` `Meter check: this gap fires at ${EB * d} kV, and the flash would carry ${fmt(flashJ(d, a))} J.` ``

**`winText(r)`**:
- wake: `` `It’s alive! V = Q/C = ${r.q} µC ÷ ${fmt(nF(r))} nF = ${r.v} kV${r.unit === 'pF' ? ` (${r.c} pF = ${fmt(nF(r))} nF)` : ''}. The field, ${fmt(r.v / r.gap)} kV per millimetre, stays below the 3 at which air breaks down.` ``
- gap with `a`: `` `It’s alive! The core needs C = Q/V = ${fmt(r.q / r.v)} nF. With C = ${r.k > 1 ? 'Kε₀A/d' : 'ε₀A/d'}, d = ${r.k > 1 ? `${r.k} × ` : ''}8.85 × 10⁻¹² × ${r.a} ÷ (${fmt(r.q / r.v)} × 10⁻⁹) m = ${r.d} mm.` ``
- gap with `c0`: `` `It’s alive! The core needs C = Q/V = ${fmt(r.q / r.v)} nF. The panels multiply C by ${r.k}, and C grows as the gap shrinks: ${r.k} × ${r.c0} × 6/d = ${fmt(r.q / r.v)} gives d = ${r.d} mm.` ``
- panel, on: `` `It’s alive! Connected, the charger held ${r.v0} kV while the K = ${r.k} panel raised C to ${fmt(r.k * r.c0)} nF, so Q = KCV = ${fmt(targetQ(r))} µC. The spark jumped the ${r.striker} mm gap, and ${r.v0} kV is within the shell’s ${r.vHi} kV.` ``
- panel, off: `` `It’s alive! Unplugged, the charge stayed at ${fmt(targetQ(r))} µC while the K = ${r.k} panel raised C to ${fmt(r.k * r.c0)} nF, so V = Q/C fell to ${fmt(r.v0 / r.k)} kV: enough to jump ${r.striker} mm, and within the shell’s ${r.vHi} kV.` ``
- flash: `` `Perfect shot! Air breaks down at 3 kV per millimetre, so a ${r.d} mm gap fires at ${r.cue} kV, on cue. The field then holds u = ½ε₀E² = ½ × 8.85 × 10⁻¹² × (3 × 10⁶)² ≈ 39.8 J/m³, and U = u × A × d = 39.8 × ${r.a} × ${fmt(r.d / 1000)} = ${r.joules} J, the same as ½CV² with C = ε₀A/d.` ``

## 6. Screen and art

Canvas 640 × 340 (`mountDialLevel`). **Draw the sound stage over `backdrop(g)` with opaque fills**, so the backdrop grid never shows (the Mirror Mage lesson).

```ts
export const RIG = { cx: 250, bottom: 252, mm: 9, w: 160, plate: 6 }; // 9 px per mm of gap: a picture, not to scale with the answer
export const topY = (d: number) => RIG.bottom - RIG.plate - d * RIG.mm; // the top plate's upper edge
export const plateW = (a: number) => 60 + 60 * a;                       // level 4 only: the plate width follows A
export const METER = { x: 72, y: 150, r: 34, max: 40 };                  // the charger's voltmeter, 0 to 40 kV
export const LCD = { x: 22, y: 186, w: 100, h: 18 };                     // the helper readout
export const ANTENNA = { x: 512, y: 112 };                               // TITAN-7's antenna tip
export const CORE = { x: 512, y: 214, w: 16, h: 70 };                    // the chest gauge (centre, size)
```

### 6.1 The set

- **Sound stage**: a dark grey back wall (`#151a2e`) with a painted retro-lab set flat behind TITAN-7 (shelves with three glowing jars in `PAL.cyan`, `PAL.green` and `PAL.pink`, flickering a little). Two studio lamps on stands sit in the top corners, with soft light cones (alpha 0.08). A boom mic hangs from the top on a pole. The floor is a darker band from y = 300 with white tape marks.
- **Control desk** (left, x 12 to 128, y 196 to 300): a grey desk holding the charger box.
  - The **voltmeter**: a round dial at `METER`, scale 0 to 40 kV, ticks every 5 kV, labelled every 10.
  - The **knob**, the **knife switch** at (118, 214), the **red discharge lever** at (34, 236), and the **LCD** at `LCD` (green digits on black).
  - Red and black HV cables run from the charger through the switch to the top and bottom plates.
- **The rig** (centre):
  - The bottom plate at `RIG.bottom` and the top plate at `topY(gap)`. Both are copper rectangles `RIG.w` wide (level 4: `plateW(a)`) and `RIG.plate` thick, centred on `RIG.cx`, with a darker edge line.
  - Four white ceramic posts with ribs, a screw jack with a crank on the right end of the top plate (the gap handle), and a gap readout beside it: `` `${d} mm` `` (the player's own setting).
  - **Field lines**: vertical lines every 16 px between the plates, `PAL.cyan` at alpha 0.15. In level 4 the alpha rises during the ramp (6.5).
  - **Charge tokens**: six `+` signs on the top plate and six `−` signs on the bottom plate, always six before the take whatever the setting, so the picture never shows Q.
- **The panel** (levels 2 and 3): a translucent slab (`rgba(255,209,102,0.35)`, edge `PAL.yellow`) labelled `K = ${k}`.
  - Level 2: it fills the gap at the player's gap when `k > 1`. With air there is no slab and a small `air` tag sits in the gap.
  - Level 3: a **panel rack** sits under the rig (y 300 to 330) with six slots labelled `air`, `K=2` … `K=6`. The chosen slot is lit (this is the panel handle). The chosen panel waits beside the gap until the take.
- **The cable to the robot**: from the top plate's left end up to a gantry at y = 40, then right and down to `ANTENNA`.
  - Levels 1 and 2: it clamps onto the antenna.
  - Level 3: it ends in a copper **striker ball** 16 px above the antenna, with a label `` `striker gap ${r.striker} mm` `` beside it. A plate on the robot's chest reads `` `SHELL ${r.vHi} kV` ``.
- **The core gauge**: 8 segments in `CORE`, with a notch at 80% labelled `` `${q} µC` `` (the target, from `intel`). It stays dark until the take.
- **Level 3 voltmeter**: draws a green band from `vLo` to `vHi` (the facts of the round, not the answer), with its needle at `v0` before the take.
- **Level 4 voltmeter**: draws a yellow cue tick at `cue`, labelled `` `CUE ${cue} kV` ``.
- **Level 1 charger track**: `track(g, 1, 20)` along the bottom, with the handle `trackHandle('v', () => 1, () => 20)`. The voltmeter needle shows the dial voltage (the player's setting).

### 6.2 The helper (the rig meter LCD)

| Round | LCD |
|---|---|
| 1 (`assist 0`) | live: level 1 `` `Q ${fmt(nF(r) * v)} µC` ``; level 2 `` `C ${fmt(capOf(r, d))} nF · Q ${fmt(capOf(r, d) * r.v)} µC` ``; level 3 `` `after: ${fmt(V)} kV · ${fmt(Q)} µC` ``; level 4 `` `fires ${EB * d} kV · ${fmt(flashJ(d, a))} J` `` |
| 2 (`assist 1`) | `— — —`, except for 1.5 s after a meter check, when it shows the live text in `PAL.yellow` |
| 3 (`assist 2`) | `— — —` always; the meter check button gives `A.freeNote('No charges left this round.')` through the engine (charges are `[1, 1, 0]`) |

The LCD is the **only** place the player's resulting Q, C, V-after or flash energy appears before a take. Prove it with a canvas recorder (section 9). Use the meter-check pattern from brief 03 (a closure `meterPending` set by `test.read`, and `meterAt` set in `draw`).

### 6.3 Levels 1 and 2: the take (`rt` = seconds since fire)

- 0.00: `ACTION!` floater from the Director's megaphone.
- 0.00 to 0.30: Zara pulls the lever; the goggles drop.
- **Flashover** (`fault === 'flash'`):
  - 0.30: three jagged white-blue arcs between the two plates across their width, re-jittered every 0.05 s from `t` (no `Math.random`), with a `BANG!` floater.
  - 0.30 to 0.45: a full-screen white flash, alpha 0.35 down to 0.
  - 0.30 to 2.3: grey smoke puffs rise from the gap.
  - From 0.35 Zara is frazzled. TITAN-7 stays asleep. The Director ducks.
  - Verdict at **0.55**.
- **Otherwise**:
  - 0.30 to 0.80: a bright arc runs along the cable from the top plate to the antenna (`trace` with f = (rt − 0.3)/0.5), with five `+` tokens riding along it (`along`).
  - 0.80 to 0.95: the core fills to `FILL.short`, `FILL.win` or `FILL.over` (the last flashes `PAL.red` and spills two segments' worth of glow above the gauge).
  - Verdict at **0.95**.
  - Then the reactions from section 4, until 2.3 s.
- `delay: (r, v) => (fault(r, v) === 'flash' ? 0.55 : 0.95)`.

### 6.4 Level 3: the take

- 0.00 to 0.50, the panel and the switch:
  - If `k > 1`, the chosen panel slides from beside the rig into the gap. If `k = 1`, an `air only` tag blinks.
  - Connected: the knife switch stays closed, and if `k > 1` six more `+` and `−` tokens stream along the cables onto the plates (0.1 to 0.5). The voltmeter needle stays at `v0`.
  - Unplugged: the switch blade swings open from 0.00 to 0.15 with a `CLICK` floater, no tokens move, and from 0.15 to 0.50 the needle swings from `v0` to `v0 / k`.
- 0.50: `ACTION!`. From 0.50 to 0.70 the lever is pulled.
- 0.70 to 0.95: the arc runs along the cable to the striker ball.
- 0.95 to 1.10, by fault:
  - **nospark**: an 8 px flickering stub at the ball that dies away, and a `fzzt` floater. The core stays dark.
  - **punch**: the arc bends past the antenna and strikes the chest shell (a black scorch mark and yellow sparks).
  - **otherwise**: a bright zigzag jumps the striker gap to the antenna.
- 1.10 to 1.40: the core fills. Short is 0.55. Win is 0.8. Over is 1 plus overflow. Punch shows the red overload flash. Nospark shows no fill.
- Verdict at **1.45** (`delay: 1.45`). Then the reactions until 2.35 s.

### 6.5 Level 4: the flash on cue

With `ramp(rt) = 24 · (rt − 0.3)` kV, the charger climbs from 0 to 36 kV between 0.30 and 1.80 s:
- 0.00 to 0.30: the lever pull and `ACTION!`. The camera's `REC` light starts blinking.
- From 0.30, the needle follows `ramp`. The field lines' alpha is `0.15 + 0.85 · (V / (EB · d))²` (the field grows toward breakdown).
- **Shutter** at `rtCue = 0.3 + r.cue / 24`: the camera's iris opens for 0.12 s, with a `SNAP` floater by the camera.
- **Flash** at `rtFlash = 0.3 + (EB · d) / 24 = 0.3 + d / 8`: five jagged arcs fill the whole gap across the plate width (a sheet of lightning), the screen flashes white (alpha 0.45 down to 0 over 0.25 s), and a `BOOM` floater appears. The needle falls to 0.
- **Verdict** at `rtFlash + 0.25` (`delay: (r, v) => 0.55 + v.d / 8`; at most 2.05 s).
  - The **dailies frame** slides down at the top centre: a film frame 150 × 96 at (245, 30) with sprocket holes on both sides.
  - win: TITAN-7 well lit in warm light, a green border, `PERFECT SHOT`.
  - early: a black frame with `TOO EARLY`.
  - late: a black frame with `TOO LATE`.
  - dim: a dark frame with the robot's silhouette at a **fixed** alpha 0.25, `TOO DARK`.
  - bright: a white frame with the robot at a **fixed** alpha 0.15, `WASHED OUT`.
  - The Director, Zara and TITAN-7 react as in section 4.
- Everything is finished by 2.3 s.

### 6.6 What must never show

- No target gap, voltage or area is drawn anywhere, except the given facts: the core notch, the level 3 voltage band and the level 4 cue tick.
- The `+` and `−` tokens before a take are always six each, never proportional to Q.
- Core fills and frame brightness take the fixed values above, never values proportional to the player's charge or energy.
- `hit` is the fixed point `[320, 70]` in every level.

## 7. Controls and mount

Write four functions `wake`, `gap`, `panel` and `flash`, each `(random: () => number) => DialLevel<Round>`. Each level builds `rounds = buildRounds(n, random)` first, then returns its `DialLevel`:

| Level | dials | handles |
|---|---|---|
| 1 | `{ key: 'v', aria: 'Charger voltage in kilovolts', label: 'Charger', unit: 'kV', step: 1, min: 1, max: 20, start: 2, text: (x) => `${x} kV` }` | `trackHandle('v', () => 1, () => 20)` |
| 2 | `{ key: 'd', aria: 'Gap between the plates in millimetres', label: 'Gap', unit: 'mm', step: 1, min: 1, max: 12, start: 12, text: (x) => `${x} mm` }` | the crank on the top plate: `at: (_r, v) => [RIG.cx + RIG.w / 2 + 14, topY(v.d)]`, `drag: (_r, _px, py) => (RIG.bottom - RIG.plate - py) / RIG.mm` |
| 3 | `{ key: 'k', aria: 'Dielectric panel to slide in', label: 'Panel', unit: '', step: 1, min: 1, max: 6, start: 1, text: (x) => (x === 1 ? 'none (air)' : `K = ${x}`) }` and `{ key: 'on', aria: 'Charger switch: 1 connected, 0 unplugged', label: 'Charger', unit: '', step: 1, min: 0, max: 1, start: 1, text: (x) => (x ? 'connected' : 'unplugged') }` | the rack slot under the rig (drag x across six slots) and the knife switch (drag y: above its hinge is 1, below is 0) |
| 4 | `{ key: 'd', …same as level 2 but start: 2 }` and `{ key: 'a', aria: 'Plate area in square metres', label: 'Plate area', unit: 'm²', step: 0.25, min: 0.25, max: 3, start: 0.25, text: (x) => `${x} m²` }` | the crank on the top plate (gap) and the plates' right edge (drag x: `a = (2 · (px − RIG.cx) − 60) / 60`) |

Common to every level:
- `hero: { name: 'Zara', role: '…', ...HEROES[n - 1] }` and `charges: [1, 1, 0]`.
- `test: { button: '🔎 Meter check', aria: 'Meter check: read the rig meter for this setting', read: (r, v) => { meterPending = true; return meterText(r, v); } }`.
- `fire: { button: '🎬 Action!', aria: 'Call action and pull the discharge lever' }`.
- `judge`, `miss: missText`, `win: winText`, `hint` (the hint line from 5.4), `hit: () => [320, 70]`, `delay` as in section 6, and `draw`.
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(4, ctx.level)) as 1 | 2 | 3 | 4; return mountDialLevel(ctx as never, [wake, gap, panel, flash][n - 1](ctx.random) as never, ARIA); } })`.
- `ARIA = 'A film set: a special-effects chief beside a giant parallel-plate capacitor rig wired to a sleeping robot prop, with the director watching from his chair.'`

## 8. game.json (copy exactly)

Copy `docs/curriculum/gap-designs/json/capacitor-bench.json` over the existing `game.json`. Its lengths were checked on 2026-10-30: summary 123 characters, learningOutcome 168, every `adds` at most 148, 6 concepts, 5 misconceptions, and the title and summary are unique. It keeps `order: 1` and `ncertRef: "Section 2.11, Capacitors and capacitance"`.

## 9. Tests

### 9.1 `logic.test.ts`

1. **Pools** (loop over every row):
   - wake: `nF(r) * r.v` equals `r.q` (to 1e-9), and `r.v < EB * r.gap`.
   - gap: `|capOf(r, r.d) * r.v / r.q − 1| < 0.003`; solving back, `capOf`'s formula with `r.q / r.v` gives `r.d` within 0.05; for air rows `r.v < EB * r.d`.
   - panel: `r.vLo` equals `EB * Number(r.striker)` (to 1e-9); for all 12 settings (k 1 to 6, on 0 and 1), `after(r, k, on).v` is more than 0.05 away from both `vLo` and `vHi`.
   - flash: `r.d === r.cue / 3`; `|flashJ(r.d, r.a) / r.joules − 1| < 0.003`; `r.joules / (39.8 · r.d / 1000)` is within 0.03 of `r.a`. `U_AIR` is 39.825 to 1e-9.
2. **One winner**: scan every reachable setting (level 1: v 1 to 20; level 2: d 1 to 12; level 3: k 1 to 6 × on 0 and 1; level 4: d 1 to 12 × a 0.25 to 3 in steps of 0.25). Only the answer passes `judge`, and the start setting fails.
3. **Rounds**: 80 seeds `Array.from({ length: 80 }, (_, i) => i * 7919 + 13)`. Every level has 3 rounds of its kind, `assist` is `[0, 1, 2]`, and round k's row comes from pool k.
4. **Faults**:
   - level 1: `v = EB * gap` gives `flash`.
   - level 2: an air row with `d = 1` gives `flash`, and a panel row with `d = 1` gives `over`.
   - level 3: for each row, the right panel with the wrong switch gives the fault the scene shows (check the four kinds each appear somewhere in the pools).
   - level 4: `d ± 1` gives `early` or `late`, and the right `d` with `a ± 0.25` gives `dim` or `bright`.
5. **Words**:
   - For every row and every wrong setting, `missText` never contains the answer token. That token is `` `${r.v} kV` `` (level 1, unless the player's own v equals it, which cannot happen on a miss), `` `${r.d} mm` `` for a wrong d (levels 2 and 4), `` `K = ${r.k}` `` when the player's k is not r.k (level 3), and `` `${r.a} m²` `` when the player's a is not r.a (level 4). Use regexes with a leading `(^|[^0-9.])` so `12 mm` does not match `2 mm`.
   - `winText` contains `V = Q/C` (wake), `ε₀A/d` or `× 6/d` (gap), `KCV` or `V = Q/C` (panel), and `u = ½ε₀E²` (flash).
   - `FILL` is exactly `{ short: 0.55, win: 0.8, over: 1 }`.

### 9.2 `tests/capacitor-bench-ui.test.ts`

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-bench/index';
import { buildRounds, type Round } from '../src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-bench/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'capacitor-bench', 4);
const build = (level: number, seed: number) => buildRounds(level as 1 | 2 | 3 | 4, createRng(seed));
function set(r: Round, right: boolean) {
  if (r.kind === 'wake') h.setSlider(right ? r.v : r.v + 1);
  if (r.kind === 'gap') h.setSlider(right ? r.d : r.d + 1);
  if (r.kind === 'panel') { h.setSlider(r.k, 0); h.setSlider(right === r.on ? 1 : 0, 1); }
  if (r.kind === 'flash') { h.setSlider(right ? r.d : r.d < 12 ? r.d + 1 : r.d - 1, 0); h.setSlider(r.a, 1); } // one row has d = 12
}
shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => set(g[k], true),
  setWrong: (g, k) => set(g[k], false),
  commit: () => h.click('Call action and pull the discharge lever'),
});
```

The panel line works because flipping the switch on the answer panel always fails (tested in 9.1). Check that `h.setSlider` takes the slider index as its second argument (it does in `tests/helpers/arcade-harness.ts`).

Then `describe('Lightning on Set', …)`:
- The level 1 slider runs from 1 to 20 and starts at 2.
- Level 1 at 20 kV gives a miss containing `flashed over` (20 kV is above 3 kV/mm for every gap in the pool).
- A meter check costs a charge: `/Meter check/`, then `/No charges left/`.
- A win says `It’s alive!` in levels 1 to 3 and `Perfect shot!` in level 4.
- **Canvas recorder** (copy the pattern from `tests/mirror-mage-ui.test.ts`): the LCD's live text (`µC` in level 1) is drawn in round 1, in round 2 only within 1.5 s after a meter check, and never in round 3. No drawn text ever contains the round's answer token (`` `${r.v} kV` `` in level 1, `` `${r.d} mm` `` in level 2) before the player sets it.
- Level 3's dials are `Panel` and `Charger`. The panel slider runs from 1 to 6, the switch from 0 to 1, and both start at 1.

## 10. Traps to avoid

- **Fixed fills**: the core gauge and the level 4 frame brightness must not scale with the player's charge or energy. Otherwise one miss lets the player measure the answer.
- **Fixed tokens**: the plates show six `+` and six `−` before a take. Never draw a count that follows Q.
- **Flashover is air only**: a panel that fills the gap never flashes over (levels 2 and 3).
- **Level 3 is two dials**: the switch must matter. Connected keeps V and multiplies Q; unplugged keeps Q and divides V. Do not "simplify" the voltage band away, or unplugged rounds would have no reason to unplug.
- **Level 4**: the flash fires when the ramp reaches `EB · d`, never at the cue. The cue is only when the shutter opens. A wrong gap therefore misses the shutter, which is the lesson.
- **Floats**: `0.25`-step areas are exact in binary, so compare dial values with `===`. Level 3 voltages like `12 / 5` are not exact, which is why no option sits near a band edge (tested).
- **Safety**: keep the "Never try this at home" sentence in the level 1 story.
- **Timing**: every animation ends by 2.4 s; the latest verdict is 2.05 s (level 4, d = 12).
- **Docs**: do not edit `docs/curriculum/physics-class-12/ch02-concept-weights.md`; the reviewer updates it after the build.
