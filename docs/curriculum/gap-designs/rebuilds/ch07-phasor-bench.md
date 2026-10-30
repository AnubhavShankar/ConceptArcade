# Ch 7 · Phasor Bench rebuilt as "Chai Before the Whistle" (§7.2, 7.3)

Read `../README.md` (every rule, the leak rules and the UX checklist) and `README.md` in this folder first. Copy the structure of the model rebuild `capacitor-bench` (brief `../20-capacitor-bench.md`). Everything below is required.

## 1. Identity

| Field | Value |
|---|---|
| Game id | `phasor-bench` (unchanged), `order: 1` (unchanged) |
| Folder | `src/games/physics/class-12/ch07-alternating-current/phasor-bench/` |
| Files | Replace `game.json` with `rebuilds/json/phasor-bench.json` (exact copy). Rewrite `logic.ts`, `logic.test.ts`, `index.ts`. Add `art.ts`. |
| UI test | Delete `tests/phasorbench-ui.test.ts`. Create `tests/phasor-bench-ui.test.ts`. |
| Engine | `mountDialLevel` from `@core/dialgame`, one `DialLevel` per level (4 levels) |
| Book coverage | §7.2 (rms and peak, P = V²/R, average power V_rms I_rms, power never negative), §7.3 (phasors, v = v_m sin ωt, current in phase in a resistor); Example 7.1; Ex 7.1, 7.2 |
| Inspiration (code comment only) | Cooking-rush games (serve the order before the timer ends: a train that leaves on time), and photo-timing games (snap at the exact moment) for level 4 |
| Core verb | **Rig a railway chai stall's electric kettle by hand**: slide a clip along the heating coil (L1), turn the kettle's voltage selector knob (L2), wind the brew timer along a track (L3), and swing the scope's phasor arm to sync a camera (L4). Then flip the stall switch. |

Search the repo for `phasor-bench/logic` before deleting the old `logic.ts`; on 2026-10-30 only its own test and `tests/phasorbench-ui.test.ts` import it.

## 2. What the student learns

- Ratings are rms values: a "1100 W, 220 V" element has R = V²/P = 44 Ω and draws I = P/V.
- A scope shows the peak. v_m = √2 V_rms, so the mains of 220 V rms peaks at 311 V; the same holds for currents, i_m = √2 I_rms.
- In a resistor the power p = v·i never goes negative. Its average over a cycle is V_rms I_rms = V²/R, half the peak power, so the energy delivered is (V²/R)·t.
- v = v_m sin ωt, and in a resistor i = i_m sin ωt: the current is in phase with the voltage, so one phasor angle fixes both.

## 3. The mechanic, physically

**Gopal** sells chai on Platform 3 of a busy junction. His electric kettle runs on the station's AC supply. Each round a train pulls in; a passenger at the window wants chai before the guard's whistle.

| Level | The player sets | What decides the round |
|---|---|---|
| 1 Wind the coil | coil resistance R (Ω), a clip on the bare nichrome coil | The kettle must give its rated power at the rated rms voltage: R = V²/P. Less R draws more than the rated current and the stall's fuse blows; more R is too weak and the train leaves first. |
| 2 Read the scope | the kettle's voltage selector (rms, V) | The supply is shown only on Gopal's pocket scope, as a peak. The selector must equal the rms value v_m/√2. Set too low, the element gets too much power and the fuse blows; too high, too little and the train leaves. |
| 3 Brew on time | the brew timer t (s) | The chai needs E kJ. The average power is V²/R, so t = E·R/V². Too short: lukewarm. Too long: it boils over. |
| 4 Sync to the phasor | the camera sync angle ωt (degrees) | The station's neon CHAI sign strikes when the supply voltage first reaches v_s (or, in `i` rounds, when the kettle current first reaches i_t). The camera fires at the player's ωt. Early: dark sign. Late: glare. |

Fixed effects (never proportional to the error): the steam plume has three fixed sizes (weak 0.3, right 1, over 1.6 with spill); the kettle glow has three fixed colours (dull red, orange, white); the departing train always leaves the same way; the level 4 photo is one of three fixed frames.

## 4. Story and characters

Hero banner: `name: 'Gopal'`, `role: 'the chai-seller on Platform 3, whose electric kettle runs on the station’s AC supply'`.

| Level | story | objective |
|---|---|---|
| 1 | `Trains stop at Platform 3 for two minutes, and every passenger wants Gopal’s chai. His kettle’s coil burnt out, so he must fit a new one from a roll of bare nichrome wire. The rating on the kettle, power at a voltage, is an rms rating: the coil must give that power at that rms voltage. Too little resistance draws more current than the stall’s fuse allows.` | `Slide the clip to the coil resistance that gives the rated power, before the whistle, in three trains.` |
| 2 | `The station’s supply changes from one platform to the next, and the only meter Gopal has is a pocket scope. A scope shows the peak of the wave, but the kettle’s selector is marked in rms volts, like every rating. The peak is √2 times the rms value.` | `Turn the selector to the supply’s rms voltage, read from the scope’s peak, in three trains.` |
| 3 | `Each order needs a set amount of heat. In a resistor the power v·i rises and falls twice every cycle but never goes negative, and its average is V_rms I_rms = V²/R, half its peak. The timer switches the kettle off.` | `Set the timer so the chai gets exactly the heat it needs: not lukewarm, not boiling over.` |
| 4 | `A travel magazine wants a photo of the neon CHAI sign at the instant it strikes. The neon strikes when the supply first reaches a set voltage; the camera is synced to the mains phasor, v = v_m sin ωt. The kettle’s current is in phase with the voltage, i = i_m sin ωt, so a relay on the kettle line can trigger the shot too.` | `Swing the phasor arm to the instant the sign strikes, and get the shot in three trains.` |

Characters (each in its own function in `art.ts`):
- **Gopal** (hero) stands behind his stall counter, head centre about (112, 168), visible from the waist up (about 70 px above the counter top at y = 230).
  - Gear: a thick black moustache, short hair, a white kurta with rolled sleeves, a red-and-white checked towel (gamchha) over the left shoulder, a steel ladle in a cup beside him.
  - Idle: breathes (chest rises 1 px, `sin(t·2)`), blinks every 3 s, wipes the counter with the towel every 4 s (arm sweeps 20 px over 0.6 s), and a `♪` floater rises beside him every 6 s.
  - Action (on fire): his right hand flips the red wall switch at (40, 196) (0.00 to 0.15 s), with a `CLICK` floater at (40, 180).
  - Moods: `face(…, 'happy')` while waiting; `'cheer'` on a win, with the long "high pour" (chai pours from the kettle held high into a clay cup in a 60 px arc, 0 to 0.4 s after the verdict); `'worried'` with a sweat drop after weak, cold, boil-over, early or late. After a fuse blow he is **sooty**: a grey face smudge, hair standing in spikes and spiral eyes, drawn by hand.
- **Mr. Iyer** (the target), a passenger at the open train window, head centre (500, 168).
  - Gear: round spectacles, grey hair, a newspaper, a coin held out in one hand.
  - Idle: turns a newspaper page every 5 s, glances at the platform clock every 3 s, taps the window sill.
  - Win: takes the clay cup, sips, steam curls up, `AAH!` floater at (500, 140).
  - Weak (L1, L2): the train leaves while he waves an empty hand, sad face (`'worried'`).
  - Blow (L1, L2): the stall lights go out; he peers with a `?` floater.
  - Cold (L3): sips and shivers, `COLD!`. Over (L3): leans back from the steam cloud, `HOT!`.
  - L4: he is the photographer's model; on a win he poses with a thumbs up; on a miss he blinks at the flash.
- **The guard** (NPC) at (612, 262): white uniform, cap, whistle on a cord, green flag. Idle: checks his wristwatch every 4 s. On weak (L1, L2) and on any L3/L4 miss: blows the whistle (`TWEET!` floater at (600, 230)) and waves the flag.
- **The train**: a carriage from x 360 to 700 (it runs off the right edge), y 122 to 300, with three windows, Mr. Iyer at the middle one. It departs only on weak (L1, L2): it slides right by `300 · ease((rt − 1.0) / 1.2)` px.
- **The neon sign** (L4): a sign `CHAI` above the stall at (110, 70), letters 18 px, dark tubes until it strikes.

## 5. Rules (`logic.ts`)

### 5.1 Constants and types

```ts
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const RT2 = Math.SQRT2;
export const DEG = Math.PI / 180;
export const PLUME = { weak: 0.3, right: 1, over: 1.6 } as const; // steam plume heights: fixed, never proportional

export interface CoilRow { v: number; p: number; r: number }                     // answer r (Ω)
export interface ScopeRow { vm: number; v: number }                              // shown vm (V peak); answer v (V rms)
export interface BrewRow { v: number; r: number; e: number; t: number }           // shown v, r, e (kJ); answer t (s)
export interface SignRow { kind: 'v' | 'i'; rms: number; th: number; at: number } // shown rms and at; answer th (degrees)

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'coil'; assist: Assist } & CoilRow)
  | ({ kind: 'scope'; assist: Assist } & ScopeRow)
  | ({ kind: 'brew'; assist: Assist } & BrewRow)
  | ({ kind: 'sign'; assist: Assist; trig: 'v' | 'i' } & Omit<SignRow, 'kind'>);
```

### 5.2 The pools (copy exactly; checked by script on 2026-10-30)

```ts
export const COIL: CoilRow[][] = [
  [{ v: 220, p: 1210, r: 40 }, { v: 240, p: 1200, r: 48 }, { v: 220, p: 1100, r: 44 }, { v: 110, p: 242, r: 50 }],
  [{ v: 240, p: 960, r: 60 }, { v: 220, p: 605, r: 80 }, { v: 230, p: 529, r: 100 }, { v: 240, p: 720, r: 80 }],
  [{ v: 240, p: 1280, r: 45 }, { v: 220, p: 880, r: 55 }, { v: 230, p: 1150, r: 46 }, { v: 240, p: 800, r: 72 }],
];
export const SCOPE: ScopeRow[][] = [
  [{ vm: 311, v: 220 }, { vm: 325, v: 230 }, { vm: 339, v: 240 }],
  [{ vm: 156, v: 110 }, { vm: 170, v: 120 }, { vm: 184, v: 130 }, { vm: 212, v: 150 }],
  [{ vm: 283, v: 200 }, { vm: 297, v: 210 }, { vm: 226, v: 160 }, { vm: 255, v: 180 }],
];
export const BREW: BrewRow[][] = [
  [{ v: 220, r: 44, e: 132, t: 120 }, { v: 220, r: 40, e: 121, t: 100 }, { v: 240, r: 48, e: 108, t: 90 }],
  [{ v: 230, r: 46, e: 161, t: 140 }, { v: 110, r: 22, e: 44, t: 80 }, { v: 240, r: 60, e: 124.8, t: 130 }],
  [{ v: 240, r: 60, e: 144, t: 150 }, { v: 240, r: 36, e: 256, t: 160 }, { v: 230, r: 46, e: 126.5, t: 110 }, { v: 220, r: 55, e: 149.6, t: 170 }],
];
// kind 'v': the sign strikes when v = √2·rms·sin(th) first reaches `at` volts. kind 'i': a relay on the kettle line fires when
// i = √2·rms·sin(th) first reaches `at` amperes (rms is then the kettle's rms current).
export const SIGN: SignRow[][] = [
  [{ kind: 'v', rms: 220, th: 20, at: 106 }, { kind: 'v', rms: 230, th: 35, at: 187 }, { kind: 'i', rms: 5, th: 50, at: 5.42 }],
  [{ kind: 'i', rms: 4, th: 25, at: 2.39 }, { kind: 'v', rms: 240, th: 40, at: 218 }, { kind: 'i', rms: 10, th: 55, at: 11.6 }],
  [{ kind: 'v', rms: 220, th: 65, at: 282 }, { kind: 'i', rms: 6, th: 30, at: 4.24 }, { kind: 'v', rms: 230, th: 70, at: 306 }, { kind: 'i', rms: 8, th: 45, at: 8 }],
];
```

The script checked: every answer is on its dial grid and not at a dial end; a full scan of each dial has exactly one winner; the start never wins; no two pools of a level share an answer; `v²/p = r` exactly; `vm` is `√2·v` to 3 figures and solves back within 1.5 V (half a selector step is 5 V); `E·1000/(v²/r) = t` exactly; `at` is `√2·rms·sin th` to 3 figures and solves back within 1°; and the "rms is the peak" mistake (`asin(at/rms)`) lands more than 4° from the answer.

### 5.3 Dials, rounds and judging

```ts
export const DIAL = {
  r: { min: 10, max: 120, step: 1, start: 120 },  // L1, Ω
  v: { min: 100, max: 250, step: 10, start: 100 }, // L2, V rms
  t: { min: 30, max: 300, step: 10, start: 30 },   // L3, s
  th: { min: 0, max: 355, step: 5, start: 0 },     // L4, degrees
};

export function buildRounds(level: 1 | 2 | 3 | 4, random: () => number): Round[] {
  if (level === 1) return COIL.map((pool, k) => ({ ...pick(pool, random), kind: 'coil', assist: aid(k) }));
  if (level === 2) return SCOPE.map((pool, k) => ({ ...pick(pool, random), kind: 'scope', assist: aid(k) }));
  if (level === 3) return BREW.map((pool, k) => ({ ...pick(pool, random), kind: 'brew', assist: aid(k) }));
  return SIGN.map((pool, k) => {
    const { kind: trig, ...row } = pick(pool, random);
    return { ...row, trig, kind: 'sign', assist: aid(k) };
  });
}

export type Fault = 'blow' | 'weak' | 'cold' | 'over' | 'early' | 'late';
export type Values = { r?: number; v?: number; t?: number; th?: number };

/** The power (W) the kettle really gives: L1 at coil R; L2 with the selector at `sel` (the coil is sized for sel, the supply is v). */
export const powerL1 = (r: CoilRow, R: number) => (r.v * r.v) / R;
export const powerL2 = (sel: number, v: number, pRated = 1000) => pRated * (v / sel) ** 2;
/** L3: energy delivered in t seconds, kJ. */
export const energy = (r: BrewRow, t: number) => ((r.v * r.v) / r.r) * t / 1000;
/** L4: the instantaneous value at the player's angle (V or A). */
export const instant = (r: { rms: number }, th: number) => RT2 * r.rms * Math.sin(th * DEG);

export function fault(r: Round, x: Values): Fault | null {
  switch (r.kind) {
    case 'coil': return x.r === r.r ? null : x.r! < r.r ? 'blow' : 'weak';
    case 'scope': return x.v === r.v ? null : x.v! < r.v ? 'blow' : 'weak';
    case 'brew': return x.t === r.t ? null : x.t! < r.t ? 'cold' : 'over';
    case 'sign': return x.th === r.th ? null : x.th! < r.th ? 'early' : 'late';
  }
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;
```

- `buildRounds` is the first use of `random` in the level (the UI test rebuilds the rounds from the seed).
- L1: less R than the answer always draws more than the rated current P/V, so `blow` is honest for every lower R.
- L2: the selector sets which coil tap is used; a lower setting on a higher supply over-powers the element (`powerL2 > rating`), so `blow`.
- L4: "late" covers every angle past the answer, including the falling half. The answer is the first time the value is reached.

### 5.4 Words

`fmt` from `@core/judge` (3 significant figures).

**`goal(r)`** (the canvas goal line, UX item 1):
- coil: `` `New coil: ${r.p} W at ${r.v} V` ``
- scope: `` `Scope peak ${r.vm} V: set the selector` ``
- brew: `` `This order needs ${r.e} kJ of heat` ``
- sign: `` r.trig === 'v' ? `Snap when the sign strikes at ${r.at} V` : `Snap when the kettle current hits ${r.at} A` ``

**`intel(r)`**:
- coil: `` `The kettle is rated ${r.p} W at ${r.v} V. The stall’s fuse allows the rated current and no more.` ``
- scope: `` `The scope shows a peak of ${r.vm} V. The selector is marked in rms volts.` ``
- brew: `` `The supply is ${r.v} V and the coil is ${r.r} Ω. The chai needs ${r.e} kJ.` ``
- sign, v: `` `The supply is ${r.rms} V rms. The neon strikes when the voltage first reaches ${r.at} V.` ``
- sign, i: `` `The kettle draws ${r.rms} A rms. The relay fires when the current first reaches ${r.at} A.` ``

**Hint line**: `` `${intel(r)} ${r.assist === 0 ? 'Round 1: the stall meter is live.' : r.assist === 1 ? 'The meter is off: a meter check costs a charge.' : 'Last train: no meter.'}` ``

**`missText(r, x)`** (the player's own value only, then what to change):
- coil blow: `` `With ${x.r} Ω the coil drew more current than the fuse allows, and it blew. Use more resistance.` ``
- coil weak: `` `With ${x.r} Ω the coil was too weak: the chai was not ready when the train left. Use less resistance.` ``
- scope blow: `` `Set to ${x.v} V on this supply, the coil got too much power and the fuse blew. Turn the selector up.` ``
- scope weak: `` `Set to ${x.v} V on this supply, the coil got too little power and the train left first. Turn the selector down.` ``
- brew cold: `` `After ${x.t} s the chai had too little heat: lukewarm. Run the kettle longer.` ``
- brew over: `` `After ${x.t} s the chai had too much heat and boiled over. Run it for less time.` ``
- sign early: `` `At ${x.th}° the ${r.trig === 'v' ? 'voltage' : 'current'} had not yet reached the trigger: the photo shows a dark sign. Sync later in the cycle.` ``
- sign late: `` `At ${x.th}° the sign had already struck: the photo is a glare. Sync earlier in the cycle.` ``

**`meterText(r, x)`** (the paid check; the LCD shows the short form in 6.2):
- coil: `` `Meter check: a ${x.r} Ω coil on ${r.v} V draws ${fmt(r.v / x.r!)} A and gives ${fmt(powerL1(r, x.r!))} W.` ``
- scope: `` `Meter check: set to ${x.v} V, the coil would give ${fmt(powerL2(x.v!, r.v) / 10)}% of its rated power.` ``
- brew: `` `Meter check: in ${x.t} s the kettle gives ${fmt(energy(r, x.t!))} kJ.` ``
- sign: `` `Meter check: at ${x.th}° the ${r.trig === 'v' ? 'voltage' : 'current'} is ${fmt(instant(r, x.th!))} ${r.trig === 'v' ? 'V' : 'A'}.` ``

**`winText(r)`** (short teaching, two lines, UX item 6):
- coil: `` `Served! R = V²/P = ${r.v}² ÷ ${r.p} = ${r.r} Ω, drawing I = P/V = ${fmt(r.p / r.v)} A. The rating is rms; the supply peaks at √2 × ${r.v} = ${fmt(RT2 * r.v)} V.` ``
- scope: `` `Served! The scope shows the peak, so V_rms = v_m/√2 = ${r.vm} ÷ 1.414 ≈ ${r.v} V, the value every rating uses.` ``
- brew: `` `Served! The power never goes negative and averages V²/R = ${r.v}² ÷ ${r.r} = ${fmt((r.v * r.v) / r.r)} W (half its peak), so t = E/P = ${r.e * 1000} ÷ ${fmt((r.v * r.v) / r.r)} = ${r.t} s.` ``
- sign, v: `` `Got the shot! v = v_m sin ωt with v_m = √2 × ${r.rms} = ${fmt(RT2 * r.rms)} V, so sin ωt = ${r.at} ÷ ${fmt(RT2 * r.rms)} and ωt = ${r.th}°.` ``
- sign, i: `` `Got the shot! In a resistor the current is in phase with the voltage: i = i_m sin ωt, i_m = √2 × ${r.rms} = ${fmt(RT2 * r.rms)} A, so ωt = ${r.th}°.` ``

## 6. Screen and art

Canvas 640 × 340. Draw the platform over `backdrop(g)` with opaque fills (the backdrop grid must not show).

```ts
export const STALL = { x: 12, y: 230, w: 220, h: 78 };            // the counter (top edge y = 230)
export const KETTLE = { x: 168, y: 214 };                          // kettle base centre on the stove plate
export const COIL_TRACK = { x0: 30, x1: 220, y: 290 };             // L1: the bare coil runs along the counter front
export const clipX = (R: number) => COIL_TRACK.x0 + ((R - 10) / 110) * (COIL_TRACK.x1 - COIL_TRACK.x0);
export const KNOB = { x: 168, y: 262, r: 15, tip: 26 };            // L2: the selector knob on the kettle base
export const knobAngle = (v: number) => (-120 + ((v - 100) / 150) * 240) * DEG; // from straight up, clockwise
export const SCOPE_BOX = { x: 250, y: 56, w: 140, h: 86 };         // L2 and L4: Gopal's pocket scope, on a hook
export const PHASOR = { x: 320, y: 99, r: 34 };                    // L4: the phasor circle inside the scope
export const FUSE = { x: 40, y: 120 };                             // the stall's fuse box on the pillar
export const LCD = { x: 250, y: 150, w: 140, h: 18 };              // the stall meter (the helper)
export const TRAIN = { x: 360, y: 122 };                           // the carriage's left edge and roof
```

### 6.1 The set

- **Platform**: a station roof with iron trusses (y 0 to 40), a hanging clock at (430, 30) whose minute hand moves during the round, a yellow platform edge line at y = 306, rails below it.
- **Times of day (UX item 8)**: round 1 morning (sky between the trusses `#f2a65a` to `#3a3f7a`), round 2 noon (`#7fb8e8` to `#33507a`), round 3 night (`#0b1030` to `#1d2556`, with three hanging lamps glowing). Round 3 is the boss: the carriage is red with a gold stripe and a `SUPERFAST` board on its side, and the engine's headlight glows at its right.
- **The stall** (x 12 to 232): a wooden counter, a stove plate with the kettle (steel, round, a spout pointing right, a lid knob), a row of clay cups (kulhads), a tin of biscuits, a hand-painted board `GOPAL CHAI` on the stall roof.
- **The fuse box** at `FUSE`: a grey box with a ceramic fuse and a red wall switch below it at (40, 196).
- **L1**: the bare coil is a spring drawn as 22 loops along `COIL_TRACK`, copper-coloured, with the crocodile clip (the handle) at `clipX(R)`. The used part (left of the clip) is drawn brighter.
- **L2**: the scope on its hook shows two full sine cycles in green on black with a dashed peak line labelled `${vm} V peak` (a given fact). The selector knob on the kettle base has ticks every 10 V from 100 to 250, labels at 100, 150, 200 and 250 (11 px).
- **L3**: a brass timer clock on the kettle at (120, 196), and a timer track `track(g, 30, 300)` along the bottom (`TRACK.y = 322`). The power graph (a small strip at `SCOPE_BOX`) shows p(t) as a sin² curve that never dips below its axis, labelled `p = v·i` (no numbers).
- **L4**: the neon sign, the scope with the phasor circle at `PHASOR` (a fixed voltage arrow is never drawn; only the player's arm), a camera on a tripod at (250, 262) aimed at the sign.

### 6.2 The helper (the stall meter at `LCD`)

| Round | LCD |
|---|---|
| 1 (`assist 0`) | live: coil `` `P ${fmt(powerL1(r, R))} W` ``; scope `` `power ${fmt(powerL2(sel, r.v) / 10)}%` ``; brew `` `heat ${fmt(energy(r, t))} kJ` ``; sign `` `${fmt(instant(r, th))} ${r.trig === 'v' ? 'V' : 'A'} at ${th}°` `` |
| 2 (`assist 1`) | `— — —`, except for 1.5 s after a meter check, when it shows the live text in `PAL.yellow`. Use `paidFlash()` and `helperOn()` from `@core/aidflash`. |
| 3 (`assist 2`) | `— — —` always. The meter check button gets the engine's `No charges left this round.` |

The LCD is the only place the player's resulting power, energy or instantaneous value appears before Fire.

### 6.3 The take (`rt` = seconds since fire)

All levels: 0.00 to 0.15 Gopal flips the wall switch (`CLICK`). UX item 5: the switch moves on the first frame.

- **L1 and L2**:
  - 0.00 to 0.40: the kettle glows (dull red if `weak`, orange if right, white if `blow`).
  - **blow**: at 0.45 the fuse box spits yellow sparks (`A.burst(40, 120, PAL.yellow, 14, 150)`), a `BANG!` floater, one white flash over the stall only (rect x 0 to 240, alpha 0.35 to 0 over 0.15 s), the stall's bulbs go dark, Gopal turns sooty. Verdict at **0.55**.
  - **weak**: a thin plume (`PLUME.weak`) from 0.4; at 1.00 the guard blows `TWEET!`; from 1.00 the train slides out to the right. Verdict at **1.05**.
  - **win**: a full plume (`PLUME.right`) from 0.4; at 0.90 Gopal pours; at 1.10 the cup reaches Mr. Iyer (the cup glides from (200, 200) to (480, 180)). Verdict at **1.10**.
- **L3**: the timer hand spins once from 0.0 to 0.80 (always the same speed, whatever t).
  - **cold**: the timer rings at 0.80 (`DING`) while the plume is only `PLUME.weak`; Mr. Iyer sips and shivers. Verdict at **1.00**.
  - **over**: the chai rolls at 0.60, foam spills over the rim at 0.70 (`PSSSH!`, plume `PLUME.over`), the timer rings at 0.80. Verdict at **1.00**.
  - **win**: the boil and the ring land together at 0.80; pour at 0.85. Verdict at **1.00**.
- **L4**: the player's arm sweeps from 0° to their angle between 0.00 and 0.60, and the sign's tubes stay dark. At 0.60 the camera flashes (a white burst at the lens, `SNAP`).
  - **win**: the sign's first letter is half-lit, the rest dark ("just striking"); the photo frame (130 × 80 at (440, 40)) drops in with `PERFECT SHOT`.
  - **early**: the photo frame shows a dark sign, `TOO EARLY`.
  - **late**: the photo frame is washed with glare (fixed alpha 0.6 white), `TOO LATE`.
  - Verdict at **0.80**.
- `delay: (r, x) => r.kind === 'brew' ? 1.0 : r.kind === 'sign' ? 0.8 : fault(r, x) === 'blow' ? 0.55 : fault(r, x) === 'weak' ? 1.05 : 1.1`.
- Everything ends by 2.3 s.

### 6.4 UX checklist (README items 1 to 10)

1. **Goal line**: `goal(r)` at (320, 52), 13 px bold, `PAL.white`, on a dark pill (`rgba(6,10,36,0.8)`, 300 × 20) from round start until Fire. After the verdict the engine's feedback and the scene reactions take over.
2. **Own setting by its handle**: L1 `` `${R} Ω` `` 12 px above the clip; L2 `` `${sel} V` `` 12 px right of the knob at (196, 266); L3 `` `${t} s` `` above the track handle and on the timer clock's face; L4 `` `${th}°` `` 12 px beyond the arm tip. Given facts drawn the same way: the scope's `vm V peak`, the kettle plate `${p} W · ${v} V` (L1), `${e} kJ` on the order slip (L3, at (60, 215)).
3. **Handles**: radius 20 (clip, track), 18 (knob tip, arm tip). Each has a ring and grip arrows: ⇔ for the clip and track, ↻ for the knob and arm. While dragged the ring is solid `PAL.yellow`. In level 1 round 1 the clip pulses with a small `drag` label (11 px) until the first pointerdown on the canvas.
   - L1 handle: `at: (_r, v) => [clipX(v.r), COIL_TRACK.y]`, `drag: (_r, px) => 10 + ((px - COIL_TRACK.x0) / (COIL_TRACK.x1 - COIL_TRACK.x0)) * 110`.
   - L2 handle: `at: (_r, v) => [KNOB.x + KNOB.tip * Math.sin(knobAngle(v.v)), KNOB.y - KNOB.tip * Math.cos(knobAngle(v.v))]`, `drag: (_r, px, py) => 100 + ((Math.atan2(px - KNOB.x, KNOB.y - py) / DEG + 120) / 240) * 150`.
   - L3 handle: `trackHandle('t', () => 30, () => 300)`.
   - L4 handle: `at: (_r, v) => [PHASOR.x + PHASOR.r * Math.cos(v.th * DEG), PHASOR.y - PHASOR.r * Math.sin(v.th * DEG)]`, `drag: (_r, px, py) => ((Math.atan2(PHASOR.y - py, px - PHASOR.x) / DEG) + 360) % 360`.
4. **Text**: every scene label ≥ 11 px; the LCD 12 px. Labels sit in their own spots above (goal, LCD, handle labels) and never on Gopal (x 80 to 150, y 130 to 230) or Mr. Iyer (x 470 to 530, y 140 to 200). At most 3 given numbers on screen besides the player's own setting.
5. **Instant response**: the switch flips at rt = 0; the verdicts land at the impact times above; a win plays the cup glide and `AAH!`, a miss plays a fuse spark, a whistle or a glare. They never look alike.
6. **Teaching**: `winText` is the two-line working above. Miss texts end with what to change ("Use more resistance.").
7. **Living hero**: Gopal's idle, action and moods in section 4; Mr. Iyer and the guard always move.
8. **Rounds look different**: morning, noon, night (boss train), and the order slip changes (`Masala chai`, `Ginger chai`, `Elaichi chai`).
9. **Accessibility**: the sliders below (keyboard), aria-labels on every button, `ARIA` text in section 7.
10. **Comfort**: one flash per take, on part of the screen, alpha ≤ 0.35 and ≤ 0.15 s; the neon never blinks faster than twice a second.

### 6.5 What must never show

- No answer is drawn: no coil resistance, rms value, time or angle except the player's own setting and the given facts listed in 6.4 item 2.
- The plume, the glow and the photo take the fixed values in section 3, never values proportional to the error.
- No voltage or current arrow is drawn on the phasor circle except the player's arm. The striking point is never marked.
- `hit` is the fixed point `[320, 80]` in every level.

## 7. Controls and mount

| Level | dial |
|---|---|
| 1 | `{ key: 'r', aria: 'Coil resistance in ohms', label: 'Coil', unit: 'Ω', step: 1, min: 10, max: 120, start: 120 }` |
| 2 | `{ key: 'v', aria: 'Kettle voltage selector in rms volts', label: 'Selector', unit: 'V', step: 10, min: 100, max: 250, start: 100 }` |
| 3 | `{ key: 't', aria: 'Brew timer in seconds', label: 'Timer', unit: 's', step: 10, min: 30, max: 300, start: 30 }` |
| 4 | `{ key: 'th', aria: 'Camera sync angle in degrees', label: 'Sync ωt', unit: '°', step: 5, min: 0, max: 355, start: 0 }` |

Common to every level:
- `hero: { name: 'Gopal', role: '…', ...HEROES[n - 1] }`, `charges: [1, 1, 0]`.
- `test: { button: '🔎 Meter check', aria: 'Meter check: read the stall meter for this setting', read: (r, v) => { flash.paid(); return meterText(r, v); } }` with `const flash = paidFlash()` per level.
- `fire: { button: '☕ Switch on', aria: 'Flip the stall switch and serve' }`.
- `judge`, `miss: missText`, `win: winText`, `hint`, `hit: () => [320, 80]`, `delay` from 6.3, `draw`.
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(4, ctx.level)) as 1 | 2 | 3 | 4; return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA); } })`.
- `ARIA = 'A railway platform: a chai-seller at his stall with an electric kettle, a pocket scope and a neon sign, and a passenger waiting at a train window.'`

## 8. game.json

Copy `rebuilds/json/phasor-bench.json` exactly. Its lengths were checked by script (see the final report of the designer).

## 9. Tests

### 9.1 `logic.test.ts`

1. **Pools**: for every row, `v²/p === r`; `fmt(√2·v) === String(vm)` and `|vm/√2 − v| < 1.5`; `energy(r, r.t) === r.e` to 1e-9; `fmt(instant(r, th))` equals `at` and `asin(at/(√2·rms))` is within 1° of `th`.
2. **One winner**: scan every dial value of each level for every row; only the answer passes `judge`, and the start fails.
3. **Disjoint pools**: within each level, no answer appears in two pools.
4. **Rounds**: 80 seeds (`i * 7919 + 13`): three rounds of the level's kind, `assist` `[0, 1, 2]`, round k from pool k.
5. **Faults**: lower R or selector gives `blow`, higher gives `weak`; shorter t `cold`, longer `over`; smaller angle `early`, larger `late`.
6. **Words**: for every row and every wrong value, `missText` contains the player's own value and never the answer token (`${r.r} Ω`, `${r.v} V`, `${r.t} s`, `${r.th}°`), using a `(^|[^0-9.])` lead so `40 Ω` does not match `140 Ω`. `winText` contains `V²/P`, `√2`, `V²/R` and `sin ωt` for levels 1 to 4. `PLUME` is exactly `{ weak: 0.3, right: 1, over: 1.6 }`.

### 9.2 `tests/phasor-bench-ui.test.ts`

Use `arcadeHarness(game, 'phasor-bench', 4)` and `shellTests` as in `tests/capacitor-bench-ui.test.ts`. `setRight` sets the slider to the answer; `setWrong` sets it to the answer plus one step (`+1 Ω`, `+10 V`, `+10 s`, `+5°`). `commit: () => h.click('Flip the stall switch and serve')`.

Then `describe('Chai Before the Whistle', …)`:
- Level 1's slider runs 10 to 120 and starts at 120; level 4's runs 0 to 355 and starts at 0.
- Level 1 at 10 Ω gives a miss containing `fuse`.
- A meter check costs a charge: `/Meter check/`, then a second press says `/No charges left/`.
- A win says `Served!` in levels 1 to 3 and `Got the shot!` in level 4.
- **Canvas recorder** (`tests/helpers/canvas-rec.ts`): the LCD's live text (`/ W$/` in level 1, `/%$/` in level 2, `/ kJ$/` in level 3, `/° *$|at \d+°$/` in level 4) is drawn in round 1, in round 2 only within 1.5 s after a meter check, and never in round 3. No drawn text ever contains the answer token before the player sets it. The goal line `goal(r)` is drawn at round start.

## 10. Traps to avoid

- **The rating is rms**: never draw "220 V peak" or show the peak as the rating. The scope is the only place a peak appears (L2 and its fact line).
- **Fixed effects**: the plume, glow and photo take three fixed forms. Do not scale them with the error.
- **L3 timer animation**: the timer hand spins at the same speed for every setting; the boil and the ring use the fixed moments in 6.3.
- **L4**: never draw the voltage arrow or the striking angle. Only the player's arm moves.
- **Pools**: copy them exactly. Do not "tidy" `124.8`, `126.5` or `149.6` kJ: they make t exact.
- **Timing**: the latest verdict is 1.10 s; every animation ends by 2.3 s.
- **Docs**: do not edit `docs/curriculum/physics-class-12/ch07-concept-weights.md`; the reviewer updates it.
