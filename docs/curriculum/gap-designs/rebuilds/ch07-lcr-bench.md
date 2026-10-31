# Ch 7 · LCR Bench rebuilt as "Main Stage Soundcheck" (§7.6.1, 7.7)

Read `../README.md` (every rule, the leak rules and the UX checklist) and `README.md` in this folder first. Copy the structure of the model rebuild `capacitor-bench` (brief `../20-capacitor-bench.md`) and of `ch07-phasor-bench.md`. Everything below is required.

## 1. Identity

| Field | Value |
|---|---|
| Game id | `lcr-bench` (unchanged), `order: 1` (unchanged) |
| Folder | `src/games/physics/class-12/ch07-alternating-current/lcr-bench/` |
| Files | Replace `game.json` with `rebuilds/json/lcr-bench.json` (exact copy). Rewrite `logic.ts`, `logic.test.ts`, `index.ts`. Add `art.ts`. |
| UI test | Delete `tests/lcrbench-ui.test.ts`. Create `tests/lcr-bench-ui.test.ts`. |
| Engine | `mountDialLevel` from `@core/dialgame`, one `DialLevel` per level (4 levels) |
| Book coverage | §7.6.1 (series LCR: Z = √(R² + (X_L − X_C)²), tan φ = (X_L − X_C)/R, lag or lead, phasor addition of V_R, V_L, V_C), §7.7 (a coil as R in series with L, power factor cos φ = R/Z, only R dissipates); Examples 7.6, 7.8 |
| Inspiration (code comment only) | Rhythm and music-festival games (the crowd reacts to every drop), and DJ games where the player rides faders on a mixer |
| Core verb | **Ride a fader on the festival's crossover rack, then drop the beat.** One vertical fader per level sets a capacitor, a coil tap, the master voltage or the bass note. No other chapter 7 game uses a fader, a crowd or sound. |

Search the repo for `lcr-bench/logic` before deleting the old `logic.ts`; on 2026-10-31 only `tests/lcrbench-ui.test.ts` imports it.

## 2. What the student learns

- In a series RC circuit the voltage across R is in phase with the current and the voltage across C is a quarter cycle behind, so Z = √(R² + X_C²), not R + X_C. The two voltages V_R and V_C add up to more than the source voltage, yet √(V_R² + V_C²) equals it (Example 7.6).
- In a series LCR circuit X_L and X_C act against each other: Z = √(R² + (X_L − X_C)²) and tan φ = (X_L − X_C)/R. When X_L > X_C the current lags the voltage; when X_C > X_L it leads (Example 7.8). One current size can come from two coils, one lagging and one leading.
- The three voltages add as phasors: V = √(V_R² + (V_L − V_C)²) (§7.6.1).
- A real coil is a resistance in series with an inductance. Only the resistance dissipates power: P = I²R = VI cos φ, with power factor cos φ = R/Z (§7.7, Example 7.8).

## 3. The mechanic, physically

**Mehr** runs the sound at an open-air music festival. Every speaker stack has three drivers, each behind its own crossover parts on a rack beside her mixing desk. The amplifier plays the song's test tone at a known frequency and voltage, and each driver must get exactly the current (or power) the song needs when the beat drops. She sets it with one vertical fader on the rack.

| Level | The fader sets | What decides the drop |
|---|---|---|
| 1 Tweeter and capacitor | the capacitor C (µF, 1 to 30) in front of the tweeter (R) | The tweeter needs a current I at the tone's frequency: Z = V/I = √(R² + X_C²). Too much C: too much current, the tweeter burns out. Too little: the highs vanish. |
| 2 The mid driver | the coil tap L (mH, 0.1 to 4.0) in front of the mid driver, which also has a fixed C | The mid needs a current I **and** a lagging or leading phase. Two coil settings give the same current, one lagging and one leading; only the one with the asked phase wins. |
| 3 The master | the master voltage V (10 to 150 V) | Three soundcheck readings V_R, V_L, V_C are written on the rack. The master must go back to the voltage that made them: the phasor sum. |
| 4 The woofer | the bass note f (Hz, 20 to 300, steps of 5) | The woofer's coil is R in series with L. The drop needs a power P in it: P = V²R/(R² + (2πfL)²). A low note gives too much power; a high note too little. |

Fixed effects (never proportional to the error): a driver's sound rings have three fixed strengths (faint alpha 0.25, right alpha 1, blown: smoke and no rings); the crowd has four fixed reactions (jump, stand still, cover ears, look puzzled); the level 3 meter needles go to three fixed places (the soundcheck mark on a win, 50% of it when low, 125% when high).

## 4. Story and characters

Hero banner: `name: 'Mehr'`, `role: 'the sound engineer of an open-air music festival, who sets every speaker’s crossover by hand'`.

| Level | story | objective |
|---|---|---|
| 1 | `The festival opens tonight and Mehr runs the sound. Each speaker stack has a tweeter for the highs, a mid driver and a woofer for the bass. The tweeter sits behind a capacitor, so its current is set by its resistance R and the capacitor’s reactance X_C = 1/(2πfC). They do not simply add: the voltage across R is in step with the current and the voltage across C is a quarter cycle behind, so Z = √(R² + X_C²).` | `Set the capacitor so the tweeter gets exactly the current it needs when the beat drops, in three songs.` |
| 2 | `The mid driver sits behind a coil and a capacitor in series. Their reactances pull against each other: Z = √(R² + (X_L − X_C)²). When X_L is bigger the current lags the voltage; when X_C is bigger it leads, with tan φ = (X_L − X_C)/R. To sound in step with the woofer, each song asks for a lagging or a leading current.` | `Slide the coil’s tap so the mid gets the right current, lagging or leading as the song asks, in three songs.` |
| 3 | `At soundcheck the crew wrote down three meter readings: across the tweeter, its coil and its capacitor. Then someone bumped the master fader. The three voltages do not add up to the amplifier’s voltage, because they are not in step: V_L and V_C are opposite, and V_R is a quarter cycle from both.` | `Put the master fader back on the exact voltage that gave the soundcheck readings, in three songs.` |
| 4 | `The woofer’s voice coil is a real coil: a resistance R in series with an inductance L. Only the resistance turns electrical power into sound and heat, so P = I²R = VI cos φ, with the power factor cos φ = R/Z. The higher the bass note, the bigger X_L, so the smaller the current and the power.` | `Pick the bass note that gives the woofer exactly the power the drop needs, in three songs.` |

Characters (each in its own function in `art.ts`, AGENTS.md item 17):
- **Mehr** (hero) stands behind the mixing desk on the left, visible from the waist up, head centre about (96, 184), about 64 px above the desk top at y = 236.
  - Gear: big over-ear headphones (the left cup on her ear, the right cup pushed back), a cap worn backwards, a black T-shirt with a white sound-wave print across the chest, a lanyard with an `ALL ACCESS` pass, fingerless gloves, a small torch clipped to the shirt.
  - Pose: both hands on the desk, the right one by the big red `DROP` button.
  - Idle: nods to the beat (head bobs 2 px at 2 Hz); blinks every 3 s; every 4 s presses the left headphone cup to listen (hand up for 0.6 s); taps the desk with two fingers.
  - Action (on fire): slams the `DROP` button with her right fist (0.00 to 0.12 s, the button sinks 3 px), `DROP!` floater at (140, 170).
  - Moods: `face(…, 'happy')` while waiting; `'cheer'` on a win, with both fists up and the headphones jumping 4 px; `'worried'` with a sweat drop after quiet, hollow or out-of-mark results. After a burnt-out driver or a slammed woofer she is **frazzled**: hair standing in spikes from under the cap, a grey smudge on one cheek and spiral eyes, drawn by hand.
- **The speaker stack** (the target object) stands at the front of the stage at `STACK`: a black cabinet column with, from the top, a tweeter horn (a small flared mouth), a mid driver (a 30 px cone) and a woofer (a 52 px cone), each with a dust cap and a surround ring, and a thin LED strip down its side.
  - Idle: the cones twitch 1 px to the background music; the LED strip glows dim blue.
  - Take: the driver of the level (tweeter, mid, all three, woofer) pumps (its cone moves ±3 px at 4 Hz) and sends sound rings (arcs of growing radius from its centre, 3 rings in flight).
  - Win: rings at full strength, the LED strip turns `PAL.green`.
  - Quiet: rings at the fixed faint alpha, the LED strip stays blue.
  - Burnt out (tweeter or mid): a `POP!`, the dome cracks (a jagged line), grey smoke rises from it, no more rings; the LED strip blinks `PAL.red` twice.
  - Slammed (woofer): the cone jumps 8 px forward and back with a `BONK`, the whole stack shakes 3 px for 0.3 s (skipped under reduced motion).
  - Hollow (level 2 phase): the mid's rings are drawn in `PAL.pink` and the woofer's in `PAL.cyan`; where they meet they fade out (a fixed meeting radius of 60 px).
- **The crowd** (the target audience) fills the bottom strip (y 268 to 340, x 150 to 640): about 24 silhouettes in three rows, heads, shoulders and raised hands, some holding glow sticks (`PAL.green`, `PAL.pink`, `PAL.cyan`).
  - Idle: they sway (each by its index, `sin(t·2 + i)`), the glow sticks wave.
  - Win: they jump (each bobs 6 px at 4 Hz), hands up, `WOOO!` floater at (420, 250); confetti cannons at the stage edges fire at 0.9 s (`A.burst` twice).
  - Quiet: they stand still with hands down, `HUH?` floater.
  - Burnt out or slammed or distorted: they cover their ears (hands to heads), `OW!` floater.
  - Hollow: they look at each other (heads turn), `HOLLOW…` floater.
- **Neon Tiger** (NPC), the headliner DJ on the stage at about (540, 150): a tiger mask with glowing `PAL.yellow` whiskers, a sleeveless jacket, behind a DJ booth with two turntables. Idle: scratches a record (a hand moves back and forth) and bobs. On fire: raises one hand. Win: both hands up, `YEAH!`. Any miss: shrugs and points at Mehr's desk.

## 5. Rules (`logic.ts`)

### 5.1 Constants and types

```ts
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const TWO_PI = 2 * Math.PI;
export const RING = { faint: 0.25, right: 1 } as const; // sound-ring strength: fixed, never proportional
export const NEEDLE = { low: 0.5, right: 1, high: 1.25 } as const; // level 3 meter needles, as a fraction of the soundcheck mark

export interface TweetRow { r: number; fk: number; v: number; c: number; i: number }                       // shown r (Ω), fk (kHz), v (V), i (A); answer c (µF)
export interface MidRow { r: number; fk: number; c: number; v: number; l: number; i: number; lag: boolean } // shown r, fk, c (µF), v, i, lag; answer l (mH)
export interface MeterRow { vr: number; vl: number; vc: number; v: number }                                // shown vr, vl, vc (V); answer v (V)
export interface WoofRow { r: number; l: number; v: number; f: number; p: number }                         // shown r (Ω), l (mH), v (V), p (W); answer f (Hz)

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'tweet'; assist: Assist } & TweetRow)
  | ({ kind: 'mid'; assist: Assist } & MidRow)
  | ({ kind: 'meters'; assist: Assist } & MeterRow)
  | ({ kind: 'woof'; assist: Assist } & WoofRow);
```

### 5.2 The pools (copy exactly; checked by script on 2026-10-31)

```ts
export const TWEET: TweetRow[][] = [
  [{ r: 8, fk: 2, v: 10, c: 10, i: 0.886 }, { r: 6, fk: 2.5, v: 12, c: 6, i: 0.984 }, { r: 8, fk: 3, v: 12, c: 5, i: 0.903 }, { r: 4, fk: 2, v: 12, c: 12, i: 1.55 }],
  [{ r: 8, fk: 2, v: 12, c: 7, i: 0.863 }, { r: 6, fk: 2, v: 20, c: 14, i: 2.42 }, { r: 8, fk: 2.5, v: 16, c: 4, i: 0.898 }, { r: 6, fk: 3, v: 10, c: 9, i: 1.19 }],
  [{ r: 8, fk: 2, v: 12, c: 8, i: 0.94 }, { r: 6, fk: 2.5, v: 16, c: 11, i: 1.92 }, { r: 6, fk: 2, v: 12, c: 13, i: 1.4 }, { r: 4, fk: 2, v: 12, c: 16, i: 1.88 }],
];
export const MID: MidRow[][] = [
  [{ r: 6, fk: 1, c: 10, v: 8, l: 3.6, i: 0.889, lag: true }, { r: 4, fk: 1, c: 15, v: 10, l: 0.5, i: 1.18, lag: false }, { r: 4, fk: 1, c: 20, v: 12, l: 1.7, i: 2.48, lag: true }],
  [{ r: 6, fk: 1, c: 10, v: 10, l: 1.3, i: 1.02, lag: false }, { r: 4, fk: 1.25, c: 10, v: 12, l: 2.2, i: 1.98, lag: true }, { r: 4, fk: 1, c: 25, v: 8, l: 1.6, i: 1.47, lag: true }],
  [{ r: 6, fk: 1, c: 15, v: 8, l: 2.6, i: 0.965, lag: true }, { r: 4, fk: 1.25, c: 10, v: 8, l: 1.2, i: 1.54, lag: false }, { r: 4, fk: 1, c: 10, v: 12, l: 1.4, i: 1.47, lag: false }],
];
export const METERS: MeterRow[][] = [
  [{ vr: 30, vl: 110, vc: 70, v: 50 }, { vr: 36, vl: 40, vc: 88, v: 60 }, { vr: 24, vl: 75, vc: 43, v: 40 }],
  [{ vr: 20, vl: 66, vc: 45, v: 29 }, { vr: 45, vl: 140, vc: 80, v: 75 }, { vr: 40, vl: 30, vc: 105, v: 85 }],
  [{ vr: 33, vl: 120, vc: 64, v: 65 }, { vr: 48, vl: 95, vc: 40, v: 73 }, { vr: 39, vl: 30, vc: 110, v: 89 }, { vr: 12, vl: 70, vc: 35, v: 37 }],
];
export const WOOF: WoofRow[][] = [
  [{ r: 6, l: 5, v: 20, f: 200, p: 31.8 }, { r: 6, l: 6, v: 20, f: 130, p: 40 }, { r: 6, l: 8, v: 16, f: 90, p: 27.2 }],
  [{ r: 6, l: 5, v: 16, f: 150, p: 26.4 }, { r: 6, l: 6, v: 24, f: 170, p: 44.8 }, { r: 6, l: 8, v: 20, f: 110, p: 36.1 }],
  [{ r: 6, l: 5, v: 30, f: 240, p: 58.2 }, { r: 6, l: 6, v: 30, f: 140, p: 84.6 }, { r: 6, l: 8, v: 16, f: 120, p: 21.2 }, { r: 4, l: 5, v: 20, f: 160, p: 38.8 }],
];
```

The script checked, for every row: the shown current or power is the true value at the answer to 3 figures; with a ±0.6% window exactly one dial setting passes over the full dial (in level 2, only with the asked phase), every other setting of the same phase misses by more than 1.2% (1.5% in level 4), and no coil setting sits on resonance; each level 3 row is an exact Pythagorean triple; answers are never at a dial end or the start, and no two pools of a level share an answer; using Z = R + X_C in level 1 lands more than 0.6 µF from the answer; and in level 3 neither V_R + V_L + V_C nor V_R + |V_L − V_C| lands within 5 V of the answer.

### 5.3 Dials, rounds and judging

```ts
export const DIAL = {
  c: { min: 1, max: 30, step: 1, start: 1 },     // L1, µF
  l: { min: 0.1, max: 4, step: 0.1, start: 0.1 }, // L2, mH
  v: { min: 10, max: 150, step: 1, start: 10 },  // L3, V
  f: { min: 20, max: 300, step: 5, start: 20 },  // L4, Hz
};

export function buildRounds(level: 1 | 2 | 3 | 4, random: () => number): Round[] {
  const pools = [TWEET, MID, METERS, WOOF][level - 1] as unknown[][];
  const kind = (['tweet', 'mid', 'meters', 'woof'] as const)[level - 1];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

export const xl = (lmH: number, fHz: number) => TWO_PI * fHz * lmH * 1e-3;
export const xc = (cuF: number, fHz: number) => 1 / (TWO_PI * fHz * cuF * 1e-6);
/** L1: the tweeter current for a capacitor of c µF. */
export const tweetI = (r: TweetRow, c: number) => r.v / Math.hypot(r.r, xc(c, r.fk * 1000));
/** L2: the net reactance X_L − X_C (Ω) and the mid current for a coil of l mH. */
export const netX = (r: MidRow, l: number) => xl(l, r.fk * 1000) - xc(r.c, r.fk * 1000);
export const midI = (r: MidRow, l: number) => r.v / Math.hypot(r.r, netX(r, l));
/** L2: the phase angle in degrees, positive when the current lags. */
export const phaseDeg = (r: MidRow, l: number) => (Math.atan2(netX(r, l), r.r) * 180) / Math.PI;
/** L3: what the three meters read at a master voltage v (they scale with v). */
export const readings = (r: MeterRow, v: number) => ({ vr: (r.vr * v) / r.v, vl: (r.vl * v) / r.v, vc: (r.vc * v) / r.v });
/** L4: the woofer power (W) at a bass note of f Hz. */
export const woofP = (r: WoofRow, f: number) => (r.v * r.v * r.r) / (r.r * r.r + xl(r.l, f) ** 2);

export type Fault = 'loud' | 'quiet' | 'phase';
export type Values = { c?: number; l?: number; v?: number; f?: number };
const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;

export function fault(r: Round, x: Values): Fault | null {
  switch (r.kind) {
    case 'tweet': return same(x.c!, r.c) ? null : x.c! > r.c ? 'loud' : 'quiet';  // more C, smaller X_C, more current
    case 'mid': {
      if (same(x.l!, r.l)) return null;
      if (netX(r, x.l!) > 0 !== r.lag) return 'phase';                         // the wrong side of resonance
      return midI(r, x.l!) > r.i ? 'loud' : 'quiet';
    }
    case 'meters': return x.v === r.v ? null : x.v! > r.v ? 'loud' : 'quiet';
    case 'woof': return x.f === r.f ? null : x.f! < r.f ? 'loud' : 'quiet';    // a lower note, smaller X_L, more power
  }
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;
/** The direction to move the fader after a miss: +1 up, −1 down. */
export const direction = (r: Round, x: Values) => {
  switch (r.kind) {
    case 'tweet': return x.c! < r.c ? 1 : -1;
    case 'mid': return x.l! < r.l ? 1 : -1;
    case 'meters': return x.v! < r.v ? 1 : -1;
    case 'woof': return x.f! < r.f ? 1 : -1;
  }
};
```

- `buildRounds` is the first use of `random` in the level (the UI test rebuilds the rounds from the seed).
- Level 2: the coil dial runs in steps of 0.1, so compare with `same` (the engine snaps to `toFixed(6)`). The other coil setting with the same current but the wrong phase is the designed trap: `fault` returns `'phase'` for every setting on the wrong side of resonance. For a lag row the answer is above resonance; for a lead row, below. Moving towards the answer is always "more coil" when `x.l < r.l` and "less coil" otherwise, which `direction` gives.

### 5.4 Words

`fmt` from `@core/judge` (3 significant figures). `phaseWord(r)` is `'lagging'` or `'leading'`.

**`goal(r)`** (the canvas goal line, UX item 1):
- tweet: `` `Tweeter needs ${r.i} A` ``
- mid: `` `Mid needs ${r.i} A, ${phaseWord(r)}` ``
- meters: `` `Match the soundcheck meters` ``
- woof: `` `Woofer needs ${r.p} W` ``

**`intel(r)`**:
- tweet: `` `The tweeter is ${r.r} Ω, fed through a capacitor. The amp plays a ${r.fk} kHz tone at ${r.v} V. The tweeter needs ${r.i} A.` ``
- mid: `` `The mid driver is ${r.r} Ω, fed through a ${r.c} µF capacitor and a tapped coil. The amp plays a ${r.fk} kHz tone at ${r.v} V. The mid needs ${r.i} A, with its current ${phaseWord(r)} the voltage.` ``
- meters: `` `At soundcheck the meters read ${r.vr} V across the tweeter, ${r.vl} V across its coil and ${r.vc} V across its capacitor.` ``
- woof: `` `The woofer’s coil is ${r.r} Ω in series with ${r.l} mH, and the amp gives ${r.v} V. The drop needs ${r.p} W in the woofer.` ``

**Hint line**: `` `${intel(r)} ${r.assist === 0 ? 'Round 1: the meter bridge is live.' : r.assist === 1 ? 'The meter bridge is off: a meter check costs a charge.' : 'Headline set: no meters.'}` ``

**`missText(r, x)`** (the player's own setting, what happened, then the direction):
- tweet loud: `` `With ${x.c} µF the capacitor’s reactance was too small: too much current, and the tweeter burnt out. Use less capacitance.` ``
- tweet quiet: `` `With ${x.c} µF the capacitor’s reactance was too big: the tweeter got too little current and the highs vanished. Use more capacitance.` ``
- mid phase: `` `With ${fmt(x.l)} mH the mid’s current ${r.lag ? 'led' : 'lagged'} the voltage instead, out of step with the woofer: the sound went hollow. Use ${direction(r, x) > 0 ? 'more' : 'less'} of the coil.` ``
- mid loud: `` `With ${fmt(x.l)} mH the net reactance X_L − X_C was too small: too much current, and the mid driver’s cone tore. Use ${direction(r, x) > 0 ? 'more' : 'less'} of the coil.` ``
- mid quiet: `` `With ${fmt(x.l)} mH the net reactance X_L − X_C was too big: the mid got too little current. Use ${direction(r, x) > 0 ? 'more' : 'less'} of the coil.` ``
- meters loud: `` `At ${x.v} V the meters read more than at soundcheck: the limiter clipped and the speakers distorted. Bring the master down.` ``
- meters quiet: `` `At ${x.v} V the meters read less than at soundcheck and the crowd could hardly hear. Push the master up.` ``
- woof loud: `` `At ${x.f} Hz the coil’s reactance was too small: too much power, and the woofer’s cone slammed its stops. Pick a higher note.` ``
- woof quiet: `` `At ${x.f} Hz the coil’s reactance was too big: the woofer got too little power and the drop had no punch. Pick a lower note.` ``

**`meterText(r, x)`** (the paid check; the LCD shows the short form in 6.2):
- tweet: `` `Meter check: with ${x.c} µF, X_C = ${fmt(xc(x.c, r.fk * 1000))} Ω and the tweeter draws ${fmt(tweetI(r, x.c))} A.` ``
- mid: `` `Meter check: with ${fmt(x.l)} mH, X_L − X_C = ${fmt(netX(r, x.l))} Ω; the mid draws ${fmt(midI(r, x.l))} A, ${phaseDeg(r, x.l) > 0 ? 'lagging' : 'leading'} by ${fmt(Math.abs(phaseDeg(r, x.l)))}°.` ``
- meters: `` `Meter check: at ${x.v} V the meters would read ${fmt(readings(r, x.v).vr)}, ${fmt(readings(r, x.v).vl)} and ${fmt(readings(r, x.v).vc)} V.` ``
- woof: `` `Meter check: at ${x.f} Hz, X_L = ${fmt(xl(r.l, x.f))} Ω and the woofer takes ${fmt(woofP(r, x.f))} W.` ``

**`winText(r)`** (short teaching, UX item 6). Here `X = xc(r.c, r.fk * 1000)`, `d = netX(r, r.l)`, `Z4 = Math.hypot(r.r, xl(r.l, r.f))`:
- tweet: `` `Highs on! Z = V/I = ${r.v} ÷ ${r.i} = ${fmt(r.v / r.i)} Ω and Z = √(R² + X_C²), so X_C = ${fmt(X)} Ω and C = 1/(2πf X_C) = ${r.c} µF. The tweeter gets ${fmt(r.i * r.r)} V and the capacitor ${fmt(r.i * X)} V: more than ${r.v} V together, yet √(V_R² + V_C²) = ${r.v} V.` ``
- mid: `` `In step! Z = V/I = ${fmt(r.v / r.i)} Ω = √(R² + (X_L − X_C)²), so X_L − X_C = ${r.lag ? '+' : '−'}${fmt(Math.abs(d))} Ω and X_L = ${fmt(xl(r.l, r.fk * 1000))} Ω: L = X_L/(2πf) = ${r.l} mH. tan φ = (X_L − X_C)/R gives φ = ${fmt(Math.abs(phaseDeg(r, r.l)))}°, ${phaseWord(r)}.` ``
- meters: `` `Back on the mark! V_L and V_C are opposite, so together they leave ${Math.abs(r.vl - r.vc)} V, and V_R is a quarter cycle away: V = √(V_R² + (V_L − V_C)²) = √(${r.vr}² + ${Math.abs(r.vl - r.vc)}²) = ${r.v} V, not ${r.vr + r.vl + r.vc} V.` ``
- woof: `` `Drop landed! P = I²R gives I = √(P/R) = ${fmt(Math.sqrt(r.p / r.r))} A, so Z = V/I = ${fmt(Z4)} Ω and X_L = √(Z² − R²) = ${fmt(xl(r.l, r.f))} Ω: f = X_L/(2πL) = ${r.f} Hz. The power factor is cos φ = R/Z = ${fmt(r.r / Z4)}.` ``

## 6. Screen and art

Canvas 640 × 340. Draw the festival over `backdrop(g)` with opaque fills (the backdrop grid must not show).

```ts
export const DESK = { x: 10, y: 236, w: 186, h: 104 };     // Mehr's mixing desk (top edge y = 236)
export const RACK = { x: 208, y: 112, w: 140, h: 196 };     // the crossover rack on its flight case
export const FADER = { x: 330, y0: 300, y1: 150 };           // the vertical fader slot on the rack: y0 is the dial minimum
export const faderY = (val: number, lo: number, hi: number) => FADER.y0 - ((val - lo) / (hi - lo)) * (FADER.y0 - FADER.y1);
export const STACK = { x: 392, y: 96, w: 64, h: 176 };      // the speaker stack (tweeter at y 116, mid at y 160, woofer at y 228)
export const BOOTH = { x: 500, y: 150 };                      // Neon Tiger's DJ booth
export const LCD = { x: 24, y: 246, w: 160, h: 18 };         // the meter bridge on the desk (the helper)
```

### 6.1 The set

- **Sky and stage**: a stage roof truss (grey lattice) from x 370 to 640, y 40 to 60, with four moving-head lights whose beams (alpha 0.12) sweep slowly; a big LED screen behind the booth showing a slowly turning abstract pattern (no numbers).
- **Times of day (UX item 8)**: round 1 sunset soundcheck (sky `#f2a65a` to `#3a3f7a`, half the crowd), round 2 night (sky `#0b1030` to `#1d2556`, green laser beams fanning from the stage, full crowd), round 3 the boss: Neon Tiger's headline set (purple sky `#1a0b3a`, fireworks bursting above the stage at 0.5 s intervals in the idle scene, the crowd waving phone torches).
- **The desk** at `DESK`: a mixing desk seen from behind with rows of small knobs, the big red `DROP` button at (164, 250) and the meter bridge `LCD` (green digits on black, 12 px).
- **The rack** at `RACK`: a dark grey rack on a flight case with silver corners. What it holds changes by level:
  - L1: a capacitor decade box (a silver box with a row of switches) wired to the tweeter's cable, and the tweeter's plate `` `TWEETER ${r} Ω` ``.
  - L2: a coil (copper windings on a former) with a sliding tap, a fixed capacitor can with its plate `` `${c} µF` ``, and the mid's plate `` `MID ${r} Ω` ``.
  - L3: three round voltmeters side by side, labelled `V_R`, `V_L` and `V_C` (11 px), each with a soundcheck mark (a yellow tick) and the written reading under it: `` `${vr} V` ``, `` `${vl} V` ``, `` `${vc} V` ``. Before Fire their needles rest at zero.
  - L4: the woofer's coil plate `` `WOOFER ${r} Ω · ${l} mH` ``.
- **The amp** on the flight case under the rack (x 214 to 342, y 304 to 330), with a small display: `` `${v} V` `` (levels 1 and 4 show the supply voltage there; level 2 shows `AMP` only; level 3 shows `MASTER`, since the master is the answer).
- **Cables**: a thick black cable from the rack to the stack, drawn as a curve from (348, 200) to (392, 240).
- **The stack, the booth and the crowd** as in section 4.

### 6.2 The helper (the meter bridge at `LCD`)

| Round | LCD |
|---|---|
| 1 (`assist 0`) | live: tweet `` `tweeter ${fmt(tweetI(r, c))} A` ``; mid `` `mid ${fmt(midI(r, l))} A · ${phaseDeg(r, l) > 0 ? 'lags' : 'leads'}` ``; meters `` `${fmt(R.vr)} · ${fmt(R.vl)} · ${fmt(R.vc)} V` `` with `R = readings(r, v)`; woof `` `woofer ${fmt(woofP(r, f))} W` `` |
| 2 (`assist 1`) | `— — —`, except for 1.5 s after a meter check, when it shows the live text in `PAL.yellow`. Use `paidFlash()` and `helperOn()` from `@core/aidflash`. |
| 3 (`assist 2`) | `— — —` always. The meter check button gets the engine's `No charges left this round.` |

The LCD is the only place the player's resulting current, phase, readings or power appears before Fire. Set `canvas.dataset.lcd` to `'1'` while the live text is drawn and `'0'` otherwise.

### 6.3 The take (`rt` = seconds since fire)

- **All levels**, 0.00 to 0.12: Mehr slams `DROP`, `DROP!` at (140, 170) on the first frame (UX item 5). At 0.00 the stage lights flash once (the four beams at alpha 0.4 for 0.1 s). 0.00 to 0.40: the level's driver(s) start to pump and send rings at the fixed faint strength (the wind-up).
- At 0.40 the result shows:
  - **loud** in levels 1 and 2 (burnt out): at 0.45 `POP!` at the driver, the dome cracks, smoke from 0.45 to 2.2, the crowd covers its ears (`OW!`), Mehr is frazzled. Verdict at **0.50**.
  - **loud** in level 3 (distorted): the limiter LED on the rack turns `PAL.red`, the rings are drawn jagged (zigzag arcs), the meter needles swing to `NEEDLE.high` of their marks, the crowd covers its ears. Verdict at **0.60**.
  - **loud** in level 4 (slammed): the woofer jumps with `BONK` at 0.45, the stack shakes, the crowd covers its ears. Verdict at **0.50**.
  - **quiet**: rings stay at `RING.faint`; in level 3 the needles swing to `NEEDLE.low`; the crowd stands still (`HUH?` at 0.80). Verdict at **0.90**.
  - **phase** (level 2): the mid's pink rings and the woofer's cyan rings meet at 60 px and fade; the crowd looks puzzled (`HOLLOW…` at 0.80). Verdict at **0.90**.
  - **win**: rings at `RING.right`, the LED strip turns green, in level 3 the needles swing to their soundcheck marks, the crowd jumps (`WOOO!`), Neon Tiger throws both hands up, confetti at 0.90. Verdict at **0.90**.
- `delay: (r, x) => { const f = fault(r, x); return f === 'loud' ? (r.kind === 'meters' ? 0.6 : 0.5) : 0.9; }`.
- Everything ends by 2.3 s.

### 6.4 UX checklist (README items 1 to 10)

1. **Goal line**: `goal(r)` at (320, 22), 13 px bold, `PAL.white`, on a dark pill (`rgba(6,10,36,0.8)`, 300 × 20) from round start until Fire.
2. **Own setting by its handle**: the fader's value with its unit, 13 px bold `PAL.yellow`, 26 px left of the fader cap at (`FADER.x - 26`, `faderY(val) + 4`), right-aligned: `` `${c} µF` ``, `` `${fmt(l)} mH` ``, `` `${v} V` ``, `` `${f} Hz` ``. Given facts on their own plates and meters (6.1).
3. **Handle**: `{ dial: key, at: (_r, v) => [FADER.x, faderY(v[key], lo, hi)], drag: (_r, _px, py) => lo + ((FADER.y0 - py) / (FADER.y0 - FADER.y1)) * (hi - lo), radius: 20 }`, with `key`, `lo`, `hi` from the level's dial. Draw the fader cap as a 30 × 14 rounded rectangle with three grip lines, inside a ring of radius 20 with ⇕ arrows; solid `PAL.yellow` while dragged. In level 1 round 1 the cap pulses with a small `drag` label (11 px) until the first pointerdown on the canvas.
4. **Text**: every scene label ≥ 11 px; the LCD 12 px. Labels never sit on Mehr (x 60 to 132, y 150 to 236), the stack or the crowd's heads. **At most 3 given numbers on screen**: level 1 the goal current, the tweeter's Ω and the amp's V (the tone's kHz is in the hint line); level 2 the goal current, the mid's Ω and the capacitor's µF (the tone and the amp's V are in the hint line); level 3 the three soundcheck readings; level 4 the goal power and the woofer plate's Ω and mH (the amp's V is in the hint line).
5. **Instant response**: the button sinks and `DROP!` appears on the first frame; a burn-out, a distortion, a slam, a hollow sound, a quiet one and a win never look alike.
6. **Teaching**: `winText` is two or three short sentences; every miss text ends with which way to move the fader.
7. **Living hero**: Mehr's idle, action and moods in section 4; the crowd, the lights and Neon Tiger always move.
8. **Rounds look different**: sunset, night with lasers, the headline set with fireworks (boss). The song title on the LED screen changes: `SONG 1`, `SONG 2`, `HEADLINER`.
9. **Accessibility**: the slider (keyboard), aria-labels on every button, `ARIA` in section 7.
10. **Comfort**: the stage flash is the beams only, alpha 0.4 for 0.1 s; fireworks burst at most twice a second; no full-screen flashes; the stack shake is skipped under reduced motion.

### 6.5 What must never show

- No answer is drawn: no capacitor, coil, master voltage or note except the player's own setting and the given facts in 6.4 item 2.
- The rings, needles and crowd take only the fixed forms above, never values proportional to the error. In level 3 the needles before Fire rest at zero, never at the live readings.
- The level 2 phase angle and the level 4 power factor appear only in the LCD helper, the meter check and the win text.
- `hit` is the fixed point `[320, 80]` in every level.

## 7. Controls and mount

| Level | dial |
|---|---|
| 1 | `{ key: 'c', aria: 'Capacitor in front of the tweeter, in microfarads', label: 'Capacitor', unit: 'µF', step: 1, min: 1, max: 30, start: 1 }` |
| 2 | `{ key: 'l', aria: 'Coil tap in front of the mid driver, in millihenry', label: 'Coil', unit: 'mH', step: 0.1, min: 0.1, max: 4, start: 0.1, text: (x) => fmt(x) }` |
| 3 | `{ key: 'v', aria: 'Master fader, the amplifier voltage in volts', label: 'Master', unit: 'V', step: 1, min: 10, max: 150, start: 10 }` |
| 4 | `{ key: 'f', aria: 'Bass note frequency in hertz', label: 'Bass note', unit: 'Hz', step: 5, min: 20, max: 300, start: 20 }` |

Common to every level:
- `hero: { name: 'Mehr', role: ROLE, ...HEROES[n - 1] }`, `charges: [1, 1, 0]`.
- `test: { button: '🔎 Meter check', aria: 'Meter check: read the meter bridge for this fader setting', read: (r, v) => { flash.paid(); return meterText(r, v); } }` with `const flash = paidFlash()` per level.
- `fire: { button: '🎚️ Drop the beat', aria: 'Drop the beat and play the speakers' }`.
- `judge`, `miss: missText`, `win: winText`, `hint`, `hit: () => [320, 80]`, `delay` from 6.3, `draw`.
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(4, ctx.level)) as 1 | 2 | 3 | 4; return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA); } })`.
- `ARIA = 'An open-air music festival at night: a sound engineer at her mixing desk beside a crossover rack, a speaker stack on the stage, a masked DJ and a crowd waiting for the beat to drop.'`

## 8. game.json

Copy `rebuilds/json/lcr-bench.json` exactly. Its lengths were checked by script (see the designer's report).

## 9. Tests

### 9.1 `logic.test.ts`

1. **Pools**: for every row, `fmt` of the true value at the answer equals the shown value (`fmt(tweetI(r, r.c)) === String(r.i)`, `fmt(midI(r, r.l)) === String(r.i)`, `fmt(woofP(r, r.f)) === String(r.p)`); `netX(r, r.l) > 0 === r.lag`; each `METERS` row satisfies `Math.hypot(r.vr, r.vl - r.vc) === r.v` exactly.
2. **One winner**: for every row, scan every dial value (level 2 in steps of 0.1 from 0.1 to 4.0, built with `Number((0.1 + i * 0.1).toFixed(6))`); only the answer passes `judge`, and the start fails.
3. **Physics matches `fault`**: for every row and every dial value, `'loud'` exactly when the true current or power exceeds the shown one (levels 1, 2 with the right phase, 4) or `v > r.v` (level 3); in level 2, `'phase'` exactly when `netX > 0` differs from `r.lag`; and the true value at every non-answer setting of the right phase is more than 1.2% from the shown one.
4. **Disjoint pools**: within each level, no answer appears in two pools.
5. **Rounds**: 80 seeds (`i * 7919 + 13`): three rounds of the level's kind, `assist` `[0, 1, 2]`, round k from pool k.
6. **Words**: for every row and every wrong setting, `missText` contains the player's own value with its unit and never the answer token (`` `${r.c} µF` ``, `` `${fmt(r.l)} mH` ``, `` `${r.v} V` ``, `` `${r.f} Hz` ``, with a `(^|[^0-9.])` lead so `5 µF` does not match `15 µF`); in level 2 the `'phase'` text says `led` for lag rows and `lagged` for lead rows. `winText` contains `√(R² + X_C²)` (tweet), `tan φ` (mid), `√(V_R² + (V_L − V_C)²)` (meters) and `cos φ = R/Z` (woof). `RING` is exactly `{ faint: 0.25, right: 1 }` and `NEEDLE` exactly `{ low: 0.5, right: 1, high: 1.25 }`.

### 9.2 `tests/lcr-bench-ui.test.ts`

Use `arcadeHarness(game, 'lcr-bench', 4)` and `shellTests` as in `tests/capacitor-bench-ui.test.ts`. `setRight` sets the slider to the answer; `setWrong` sets it one step above the answer (`+1 µF`, `+0.1 mH`, `+1 V`, `+5 Hz`). `commit: () => h.click('Drop the beat and play the speakers')`.

Then `describe('Main Stage Soundcheck', …)`:
- Level 1's slider runs 1 to 30 and starts at 1; level 2's runs 0.1 to 4 and starts at 0.1; level 4's runs 20 to 300 and starts at 20.
- Level 1 at 30 µF gives a miss containing `burnt out`.
- In level 2, for a lag row, the mirror setting (the nearest grid value to `2 × L_res − r.l`, where `L_res = 1000 / ((2π·1000·fk)² · c · 10⁻⁶)` mH) gives a miss containing `hollow`.
- A meter check costs a charge: `/Meter check/`, then a second press says `/No charges left/`.
- A win says `Highs on!` (level 1), `In step!` (level 2), `Back on the mark!` (level 3) and `Drop landed!` (level 4).
- **Canvas recorder** (`tests/helpers/canvas-rec.ts`): the LCD's live text (`/^tweeter /`, `/^mid /`, `/ V$/` with two `·`, `/^woofer /`) is drawn in round 1, in round 2 only within 1.5 s after a meter check, and never in round 3. No drawn text ever contains the answer token before the player sets it. The goal line `goal(r)` is drawn at round start. In level 3 the amp display reads `MASTER`.

## 10. Traps to avoid

- **Directions**: in level 1 more capacitance means more current; in level 4 a higher note means less power. Use `direction` for every miss text; do not guess.
- **Level 2 has a mirror**: the same current on the wrong side of resonance is a `'phase'` fault, not a win. Never judge level 2 by the current alone.
- **Level 3 meters**: before Fire they rest at zero; the soundcheck marks are fixed ticks with the written readings. Never draw the live readings on them.
- **Fixed effects**: rings, needles and crowd reactions take only the fixed forms. Never scale them with the error.
- **Floats**: the level 2 coil steps of 0.1 are not exact in binary; compare with `same` and print with `fmt`.
- **Pools**: copy them exactly.
- **Timing**: the latest verdict is 0.90 s; every animation ends by 2.3 s.
- **Docs**: do not edit `docs/curriculum/physics-class-12/ch07-concept-weights.md`; the reviewer updates it.
