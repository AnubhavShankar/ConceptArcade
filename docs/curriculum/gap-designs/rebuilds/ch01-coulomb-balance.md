# Ch 1 · Coulomb Balance rebuilt as "Float the Bead" (§1.5; Ex 1.1, 1.2; Example 1.3)

Read `../README.md` first (every rule, above all "A miss must not show the answer either", "Helpers fade" and the "UX checklist"), then `README.md` in this folder. The model rebuild is `src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-bench/` (brief `../20-capacitor-bench.md`): copy its structure. Everything below is required unless marked optional. If a number here does not work, stop and report it.

The old Coulomb's Levitator was a number-entry game (type the charge). This brief **replaces the whole game** with an arcade game in a levitation lab. It keeps the id, folder and `order`, and keeps every concept: Coulomb's force balancing weight, the inverse-square law (height goes as √q), small-scale units (mg, mm, nC, pC), and the sign rule (only like charges repel, so an opposite charge falls). It adds solving Coulomb's law for the distance (Ex 1.2(a)).

## 1. Identity

| Field | Value |
|---|---|
| Game id | `coulomb-balance` (unchanged), `order: 2` (unchanged) |
| Folder | `src/games/physics/class-12/ch01-electric-charges-and-fields/coulomb-balance/` |
| Files | **Replace** `game.json` with `docs/curriculum/gap-designs/rebuilds/json/coulomb-balance.json` (copy exactly). **Delete and rewrite** `logic.ts`, `logic.test.ts`, `index.ts`. **Add** `art.ts`. |
| Old UI test | **Delete** `tests/levitator-ui.test.ts`. **Create** `tests/coulomb-balance-ui.test.ts`. |
| Imports of the old logic | Only `tests/levitator-ui.test.ts` imports `coulomb-balance/logic` (checked 2026-10-31). Search for `coulomb-balance/logic` again before deleting. |
| Engine | `mountDialLevel` from `@core/dialgame`, one `DialLevel` per level (4 levels); `paidFlash`, `helperOn` from `@core/aidflash` |
| Book coverage | §1.5 Coulomb's law (B1: magnitude, inverse square, solve for any unknown); Ex 1.1, Ex 1.2(a) (solve for the distance); Example 1.3 (electric force against weight, here at lab scale) |
| Inspiration (code comment only) | Portal's numbered test chambers (each round is a chamber, with a robot that inspects the result) and golf games (one clean shot per hole) |
| Core verb | **Charge the bead on the charger dial** (levels 1 to 3), or **slide the laser up its rail** (level 4), then **release the bead and fire the laser**. In this chapter it is the only game whose verb is one charge dial. |

## 2. What the student learns

- A charged bead above a charged base floats where the Coulomb push equals its weight: k q Q / h² = m g.
- So q = m g h² / (k Q), and h = √(k q Q / (m g)): the float height goes as √q, not as q (four times the charge, twice the height).
- Work in SI units first: 1 g = 10⁻³ kg, 1 mg = 10⁻⁶ kg, 1 cm = 10⁻² m, 1 mm = 10⁻³ m, 1 µC = 10⁻⁶ C, 1 nC = 10⁻⁹ C, 1 pC = 10⁻¹² C; k = 9 × 10⁹ N m² C⁻², g = 9.8 m/s².
- Only like charges repel. A bead charged opposite to the base is pulled down onto it; an uncharged bead feels no push at all.

## 3. The mechanic, physically

**Femi** runs a levitation furnace. A metal bead sits in a narrow vacuum glass column above a fixed charged **base electrode**. When she releases it, the base pushes it up and it floats where the push equals its weight. A heating **laser** crosses the column at one height. If the bead floats in the beam it melts and, with nothing touching it, cools into a perfect sphere. If it floats above or below the beam, the laser hits nothing.

| Level | The player sets | Given (shown) | What decides the shot |
|---|---|---|---|
| 1 Float it | the bead's charge q (nC) | m (g), Q (µC), beam height h (cm) | q = m g h²/(k Q) |
| 2 Tiny scale | the bead's charge q (pC) | m (mg), Q (nC), beam height h (mm) | the same, with prefixes |
| 3 Opposite base | the bead's charge q (pC, signed) | m (mg), Q (nC, signed), h (mm) | the sign must match the base |
| 4 Aim the laser | the laser height h (cm) | m (g), Q (µC), the bead's charge q (nC) | h = √(k q Q/(m g)) |

Physical consequences (every miss shows only the direction, at fixed positions):
- **Low**: the bead floats a fixed 34 px **below** the beam; the beam passes over it.
- **High**: the bead floats a fixed 34 px **above** the beam; the beam passes under it.
- **Pulled** (level 3, opposite sign): the bead snaps down onto the base with blue sparks; its charge is lost.
- **Flat** (level 3, q = 0): the bead stays sitting on the base; nothing pushes it.
- **Win**: the bead floats in the beam, glows orange then white, and becomes a gleaming mirror sphere.

**Fixed positions.** On a miss the bead is never drawn at its true float height (that would let the player measure the answer). It sits exactly 34 px above or below the beam line.

## 4. Story and characters

Hero banner: `name: 'Femi'`, `role: 'a materials scientist who floats metal beads above a charged base and melts them in mid-air with a laser'`.

| Level | story | objective |
|---|---|---|
| 1 | `Femi’s furnace has no crucible: a charged base pushes a charged metal bead up a glass column until the push equals the bead’s weight, k q Q / h² = m g. Where it floats, a laser melts it into a perfect sphere. The higher the bead must float, the more charge it needs, but not in proportion: the push falls as 1/h².` | `Charge the bead so it floats exactly in the laser beam, in three test chambers.` |
| 2 | `The new column is only 12 mm tall and the beads weigh milligrams. The law is the same, but every prefix must become SI first: 1 mg = 10⁻⁶ kg, 1 mm = 10⁻³ m, 1 nC = 10⁻⁹ C, and the answer comes out in picocoulombs (10⁻¹² C).` | `Charge each tiny bead to the right number of picocoulombs to float it in the beam.` |
| 3 | `The base can now be charged either way. Only like charges repel: a bead charged opposite to the base is pulled straight down onto it, and an uncharged bead just sits there.` | `Choose the sign and the size of the bead’s charge to float it in the beam.` |
| 4 | `The beads now arrive already charged, and the laser rides on a rail. Turn the balance around: the bead floats where k q Q / h² = m g, so h = √(k q Q / (m g)).` | `Slide the laser to the height where the bead will float, in three test chambers.` |

Characters (each in its own function in `art.ts`, AGENTS.md item 17):
- **Femi** (hero) stands at the console on the left, feet at (88, 318), about 76 px tall.
  - Gear: a white lab coat with a blue name tag `FEMI`; orange laser-safety goggles pushed up on her forehead; a short curly hair puff; silver heat-resistant gloves; a tablet clipped to the console.
  - Pose: her left hand rests on the charger knob at (132, 214).
  - Idle: blinks every 3 s, the goggles glint every 4 s (a white tick on the lens), taps the tablet every 5 s, and turns her head up toward the column every 6 s.
  - Action (on fire): pulls the goggles down over her eyes (0.0 to 0.15 s), presses the red `RELEASE` button with her right hand (arm forward, 0.0 to 0.2 s), a `CLICK` floater; at 1.0 s she turns the laser key (a small wrist turn).
  - Moods: `'happy'` while waiting; squinting (draw the eyes as two short lines) from 0 s to the verdict; `'cheer'` with a fist raised on a win; `'worried'` with a sweat drop on low or high; **startled** after `pulled` (eyes as two circles, hair puff 4 px bigger), drawn by hand; a shrug (both hands up 8 px) after `flat`.
- **Dot** (the inspection robot, NPC) rolls on the right, centre (560, 286), about 60 px tall.
  - Gear: a rounded grey box body on three small wheels; one big magnifier lens for an eye on a stalk; a chest screen 22 × 14; two pincer arms.
  - Idle: the lens scans left and right (`sin(t·1.5)·6` px), the chest LED blinks every 1.2 s, it rolls ±3 px.
  - On fire: the lens zooms (radius 10 → 14) and the stalk leans toward the column.
  - Win: the chest screen shows a green `✓`, both pincers rise, a 6 px hop, and a `FLAWLESS` floater.
  - Low or high: a red `✗`, the stalk shakes side to side twice, a `MISSED` floater.
  - Pulled: the stalk retracts (ducks) and yellow sparks pop near it, a `!!` floater.
  - Flat: the screen shows `…` and the body tilts 10°.
- **The bead** (the target): a metal sphere of radius 7 px with a highlight. Round 1 is nickel (`#b8bcc8`), round 2 titanium (`#8fa3c0`), round 3 gold (`#e0b84a`). Before the shot it sits in a small two-pronged release clamp on top of the base. On a win it glows from its metal colour to `PAL.orange` to `#fff6dc` (1.10 to 1.60 s), then becomes a mirror sphere (a light top half, a darker bottom half and a `✦` sparkle that twinkles).

## 5. Rules (`logic.ts`)

### 5.1 Constants and types

```ts
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const K = 9e9;   // N m² C⁻², as in NCERT
export const G = 9.8;   // m/s²
export const OFFSET = 34; // px: on a miss the bead is drawn this far above or below the beam, never at its true height

export interface FloatRow { m: number; Q: number; q: number; h: number }   // level 1: m g, Q µC, answer q nC, shown h cm
export interface TinyRow { m: number; Q: number; q: number; h: number }    // levels 2 and 3: m mg, Q nC (signed in level 3), answer q pC (signed), shown h mm
export interface AimRow { m: number; Q: number; h: number; q: number }     // level 4: m g, Q µC, answer h cm, shown q nC

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'float'; assist: Assist } & FloatRow)
  | ({ kind: 'tiny'; assist: Assist } & TinyRow)
  | ({ kind: 'signed'; assist: Assist } & TinyRow)
  | ({ kind: 'aim'; assist: Assist } & AimRow);
```

### 5.2 The pools (copy exactly)

Every row was checked by script on 2026-10-31 (section 9 lists the checks; they must be in `logic.test.ts`). `h` in levels 1 to 3 and `q` in level 4 are the shown values, to 3 significant figures; they solve back to the answer.

```ts
export const FLOAT: FloatRow[][] = [
  [{ m: 1, Q: 2, q: 4, h: 8.57 }, { m: 2, Q: 3, q: 8, h: 10.5 }, { m: 1.5, Q: 4, q: 7, h: 13.1 }, { m: 0.5, Q: 1, q: 11, h: 14.2 }],
  [{ m: 1, Q: 3, q: 5, h: 11.7 }, { m: 2, Q: 1, q: 13, h: 7.73 }, { m: 1.5, Q: 2, q: 9, h: 10.5 }, { m: 2, Q: 4, q: 14, h: 16 }],
  [{ m: 1, Q: 1, q: 16, h: 12.1 }, { m: 2, Q: 3, q: 17, h: 15.3 }, { m: 1.5, Q: 3, q: 6, h: 10.5 }, { m: 2, Q: 1, q: 19, h: 9.34 }],
];
export const TINY: TinyRow[][] = [
  [{ m: 20, Q: 20, q: 27, h: 4.98 }, { m: 50, Q: 50, q: 21, h: 4.39 }, { m: 20, Q: 50, q: 12, h: 5.25 }, { m: 80, Q: 50, q: 34, h: 4.42 }],
  [{ m: 20, Q: 10, q: 32, h: 3.83 }, { m: 50, Q: 50, q: 29, h: 5.16 }, { m: 20, Q: 50, q: 16, h: 6.06 }, { m: 20, Q: 20, q: 19, h: 4.18 }],
  [{ m: 50, Q: 20, q: 38, h: 3.74 }, { m: 20, Q: 50, q: 24, h: 7.42 }, { m: 80, Q: 50, q: 26, h: 3.86 }, { m: 20, Q: 20, q: 35, h: 5.67 }],
];
export const SIGNED: TinyRow[][] = [
  [{ m: 20, Q: -20, q: -23, h: 4.6 }, { m: 50, Q: 50, q: 17, h: 3.95 }, { m: 20, Q: -50, q: -8, h: 4.29 }, { m: 80, Q: 50, q: 30, h: 4.15 }],
  [{ m: 20, Q: 50, q: 20, h: 6.78 }, { m: 50, Q: -50, q: -33, h: 5.51 }, { m: 20, Q: -10, q: -36, h: 4.07 }, { m: 20, Q: 20, q: 11, h: 3.18 }],
  [{ m: 50, Q: -50, q: -25, h: 4.79 }, { m: 20, Q: -20, q: -31, h: 5.34 }, { m: 80, Q: -50, q: -22, h: 3.55 }, { m: 20, Q: 50, q: 28, h: 8.02 }],
];
export const AIM: AimRow[][] = [
  [{ m: 1, Q: 2, h: 9, q: 4.41 }, { m: 2, Q: 3, h: 12, q: 10.5 }, { m: 1.5, Q: 2, h: 7, q: 4 }, { m: 1, Q: 4, h: 15, q: 6.13 }],
  [{ m: 2, Q: 2, h: 10, q: 10.9 }, { m: 1, Q: 3, h: 13, q: 6.13 }, { m: 0.5, Q: 1, h: 6, q: 1.96 }, { m: 2, Q: 4, h: 16, q: 13.9 }],
  [{ m: 1, Q: 1, h: 11, q: 13.2 }, { m: 2, Q: 4, h: 14, q: 10.7 }, { m: 1.5, Q: 3, h: 8, q: 3.48 }, { m: 1, Q: 2, h: 5, q: 1.36 }],
];
```

Round k's row comes from pool k. No answer appears in two rounds of the same level (tested), so a round never repeats the last answer.

### 5.3 Physics, rounds and judging

```ts
export const DIAL = {
  q1: { min: 1, max: 20, start: 1 },    // level 1, nC
  q2: { min: 1, max: 40, start: 1 },    // level 2, pC
  q3: { min: -40, max: 40, start: 0 },  // level 3, pC
  h4: { min: 2, max: 19, start: 19 },   // level 4, cm
};

/** Float height for levels 1 and 4: m in g, Q in µC, q in nC; returns cm. */
export const floatCm = (m: number, Q: number, q: number) => 100 * Math.sqrt((K * q * 1e-9 * Q * 1e-6) / (m * 1e-3 * G));
/** Float height for levels 2 and 3: m in mg, |Q| in nC, |q| in pC; returns mm. */
export const floatMm = (m: number, Q: number, q: number) => 1000 * Math.sqrt((K * Math.abs(q) * 1e-12 * Math.abs(Q) * 1e-9) / (m * 1e-6 * G));
/** The push of the base at a height, and the bead's weight, for the force check: levels 1 and 4 in mN, levels 2 and 3 in µN. */
export function forces(r: Round, x: number): { push: number; weight: number; unit: 'mN' | 'µN' } {
  if (r.kind === 'float') return { push: (K * x * 1e-9 * r.Q * 1e-6) / (r.h / 100) ** 2 * 1000, weight: r.m * 1e-3 * G * 1000, unit: 'mN' };
  if (r.kind === 'aim') return { push: (K * r.q * 1e-9 * r.Q * 1e-6) / (x / 100) ** 2 * 1000, weight: r.m * 1e-3 * G * 1000, unit: 'mN' };
  return { push: (K * Math.abs(x) * 1e-12 * Math.abs(r.Q) * 1e-9) / (r.h / 1000) ** 2 * 1e6, weight: r.m * 1e-6 * G * 1e6, unit: 'µN' };
}

export function buildRounds(level: 1 | 2 | 3 | 4, random: () => number): Round[] {
  const pools = [FLOAT, TINY, SIGNED, AIM][level - 1] as unknown[][];
  const kind = (['float', 'tiny', 'signed', 'aim'] as const)[level - 1];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

export type Fault = 'low' | 'high' | 'pulled' | 'flat';
export type Values = { q?: number; h?: number };

export function fault(r: Round, x: Values): Fault | null {
  if (r.kind === 'aim') {
    const h = x.h!;
    return h === r.h ? null : h > r.h ? 'low' : 'high'; // a beam set too high leaves the bead floating below it
  }
  const q = x.q!;
  if (r.kind === 'signed') {
    if (q === 0) return 'flat';
    if (Math.sign(q) !== Math.sign(r.Q)) return 'pulled';
  }
  return q === r.q ? null : Math.abs(q) < Math.abs(r.q) ? 'low' : 'high';
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;
```

- `buildRounds` must be the **first** use of `random` in the level (the UI test rebuilds the same rounds from the seed).
- Start settings: level 1 `q = 1`, level 2 `q = 1`, level 3 `q = 0`, level 4 `h = 19`. None wins on any row (tested).
- Level 3: the sign is checked before the size, so `+23` on a `−20 nC` base is `pulled`, not `high`.

### 5.4 Words

Use `fmt` from `@core/judge` for computed numbers. Signs use the true minus `−`. Write `sgnQ(x)` = `` `${x < 0 ? '−' : '+'}${Math.abs(x)}` ``.

**`intel(r)`**:
- float: `` `The bead weighs ${r.m} g and the base holds +${r.Q} µC. The laser crosses the column at ${r.h} cm.` ``
- tiny: `` `The bead weighs ${r.m} mg and the base holds +${r.Q} nC. The laser crosses the column at ${r.h} mm.` ``
- signed: `` `The bead weighs ${r.m} mg and the base holds ${sgnQ(r.Q)} nC. The laser crosses the column at ${r.h} mm.` ``
- aim: `` `The bead weighs ${r.m} g and carries +${r.q} nC; the base holds +${r.Q} µC.` ``

**Hint line**: `` `${intel(r)} ${r.assist === 0 ? 'Round 1: the float gauge is live.' : r.assist === 1 ? 'The gauge is off: a force check costs a charge.' : 'Final chamber: no gauge.'}` ``

**`missText(r, x)`** (what the player's setting did; never the answer):
- float low: `` `With ${x.q} nC the push from the base matched the bead’s weight below the beam: the laser passed over it. More charge floats it higher.` ``
- float high: `` `With ${x.q} nC the push held the bead above the beam: the laser passed under it. Less charge floats it lower.` ``
- tiny low / high: the same two texts with `pC` in place of `nC`.
- signed pulled: `` `A ${sgnQ(x.q!)} pC bead and a ${r.Q < 0 ? 'negative' : 'positive'} base attract: the bead was pulled down onto the base and its charge sparked away. Only like charges repel.` ``
- signed flat: `An uncharged bead feels no push from the base: it just sat in the clamp.`
- signed low / high: `` `With ${sgnQ(x.q!)} pC the sign was right, but the bead floated ${fault(r, x) === 'low' ? 'below' : 'above'} the beam: ${fault(r, x) === 'low' ? 'more' : 'less'} charge of the same sign moves it toward the beam.` ``
- aim low: `` `The bead floated below a beam set at ${x.h} cm: the laser passed over it.` ``
- aim high: `` `The bead floated above a beam set at ${x.h} cm: the laser passed under it.` ``

**`checkText(r, x)`** (the force check, a charge): with `{ push, weight, unit } = forces(r, x.q ?? x.h)`:
- float, tiny, signed: `` `Force check: in the beam, a ${kind === 'float' ? `${x.q} nC` : `${sgnQ(x.q!)} pC`} bead is ${push === 0 ? 'not pushed at all' : `${kind === 'signed' && Math.sign(x.q!) !== Math.sign(r.Q) ? 'pulled down' : 'pushed up'} with ${fmt(push)} ${unit}`}; its weight is ${fmt(weight)} ${unit}.` ``
- aim: `` `Force check: at ${x.h} cm the base pushes the bead up with ${fmt(push)} mN; its weight is ${fmt(weight)} mN.` ``

**`lcdText(r, x)`** (the live gauge in round 1; also shown for 1.5 s after a check in round 2):
- float: `` `floats at ${fmt(floatCm(r.m, r.Q, x.q!))} cm` ``
- tiny: `` `floats at ${fmt(floatMm(r.m, r.Q, x.q!))} mm` ``
- signed: q = 0 → `no push`; opposite sign → `pulled to the base`; else `` `floats at ${fmt(floatMm(r.m, r.Q, x.q!))} mm` ``
- aim: `` `at ${x.h} cm: push ${fmt(forces(r, x.h!).push)} mN · weight ${fmt(forces(r, x.h!).weight)} mN` ``
- `LCD_OFF = '— — —'`

**`winText(r)`**:
- float: `` `Melted! In the beam the push equals the weight: k q Q / h² = m g, so q = m g h² / (k Q) = ${r.m} × 10⁻³ × 9.8 × (${fmt(r.h / 100)})² ÷ (9 × 10⁹ × ${r.Q} × 10⁻⁶) = ${r.q} × 10⁻⁹ C = ${r.q} nC. The height goes as √q: four times the charge floats the bead only twice as high.` ``
- tiny: `` `Melted! In SI units: q = m g h² / (k Q) = ${r.m} × 10⁻⁶ × 9.8 × (${r.h} × 10⁻³)² ÷ (9 × 10⁹ × ${r.Q} × 10⁻⁹) = ${r.q} × 10⁻¹² C = ${r.q} pC.` ``
- signed: `` `Melted! The base is ${r.Q < 0 ? 'negative' : 'positive'} and only like charges repel, so the bead needs a ${r.Q < 0 ? 'negative' : 'positive'} charge. Its size: q = m g h² / (k |Q|) = ${r.m} × 10⁻⁶ × 9.8 × (${r.h} × 10⁻³)² ÷ (9 × 10⁹ × ${Math.abs(r.Q)} × 10⁻⁹) = ${Math.abs(r.q)} pC, so q = ${sgnQ(r.q)} pC.` ``
- aim: `` `Melted! The bead floats where k q Q / h² = m g, so h = √(k q Q / (m g)) = √(9 × 10⁹ × ${r.q} × 10⁻⁹ × ${r.Q} × 10⁻⁶ ÷ (${r.m} × 10⁻³ × 9.8)) = ${fmt(r.h / 100)} m = ${r.h} cm.` ``

## 6. Screen and art

Canvas 640 × 340. Draw the lab over the backdrop with opaque fills so the engine's grid never shows.

```ts
export const COL = { x: 330, top: 40, base: 300, w: 44 };   // the glass column; the base electrode's top is at y = 300
/** Pixels per unit of height: 13 px per cm (levels 1 and 4, 0 to 20 cm), 260/12 px per mm (levels 2 and 3, 0 to 12 mm). */
export const pxPer = (kind: Round['kind']) => (kind === 'tiny' || kind === 'signed' ? 260 / 12 : 13);
export const yOf = (kind: Round['kind'], h: number) => COL.base - 7 - h * pxPer(kind); // the bead's centre at height h
export const LCD = { x: 24, y: 150, w: 132, h: 20 };          // the float gauge (helper)
export const KNOB = { x: 132, y: 214, r: 22 };                 // the charger knob on the console
export const HIT: [number, number] = [470, 70];
```

### 6.1 The set

- **Back wall**: dark blue-grey (`#141a30`) with a round porthole window at (560, 90), radius 34: round 1 shows a pale blue sky, round 2 an orange-purple sunset, round 3 a black night with stars. Two ceiling lamps; in round 3 they are dim and a red warning beacon at (600, 24) turns (a rotating light cone, alpha ≤ 0.25).
- A stencil sign at the top left: `TEST CHAMBER ${k + 1}`, and `TEST CHAMBER 3 · BOSS` in round 3 (`PAL.red`), 12 px.
- **The goal line** (UX 1) at (320, 20), 14 px, `PAL.yellow`: level 1 `` `Melt the bead: beam at ${r.h} cm` ``, level 2 `` `Melt the bead: beam at ${r.h} mm` ``, level 3 `` `Melt the bead: base ${sgnQ(r.Q)} nC, beam at ${r.h} mm` ``, level 4 `` `Bead charged +${r.q} nC: aim the laser` ``.
- **The glass column**: a vertical rectangle at `COL` (x 308 to 352, y 40 to 300), fill `rgba(160,200,255,0.10)`, edges `#9fc4ff` at alpha 0.6, small ticks on the right edge every 2 cm (levels 1, 4) or every 1 mm (levels 2, 3), **with no tick numbers**; one label at the top, `20 cm` or `12 mm`, 11 px, `PAL.dim`.
- **The base electrode**: a copper dome under the column (x 304 to 356, y 300 to 318) on a black insulating block (y 318 to 330). Its label at (380, 312), 12 px, `PAL.white`: `` `base ${sgnQ(Q)} ${unit}` `` (`µC` in levels 1 and 4, `nC` in 2 and 3), with a `+` or `−` drawn on the dome itself.
- **The release clamp**: two thin grey prongs at the column bottom holding the bead at `yOf(kind, 0)`; they swing open 30° each on release.
- **The bead label**: at (380, 290), 11 px, `PAL.dim`: `` `bead ${r.m} ${unit}` `` (`g` in levels 1 and 4, `mg` in 2 and 3).
- **The laser** (left of the column): an emitter box 50 × 18 on a vertical rail at x 248 to 298, centred on the beam line `yOf(kind, beamH)` where `beamH = r.h` (levels 1 to 3) or the dial `h` (level 4). A beam dump box 16 × 18 on the right at x 362. While idle the beam is a faint dotted red line (alpha 0.25) across the column (aim marker). In level 4 the rail runs from y 40 to 300 with a grip on the emitter (the handle).
- **The beam label** next to the emitter at (244, beamY − 12), right-aligned, 12 px: levels 1 to 3 `` `beam ${r.h} ${unit}` `` (the given fact, `PAL.white`), level 4 `` `${h} cm` `` (the player's own setting, `PAL.yellow`, bold).
- **The console** (left, x 16 to 170, y 196 to 300): a grey desk with the charger knob at `KNOB` (an arrowed grip ring, radius 22) showing the player's own charge under it at (132, 252), bold 14 px `PAL.yellow`: `` `${q} nC` `` (level 1) or `` `${sgnQ(q)} pC` `` (levels 2 and 3; `0 pC` at zero). Beside it the red `RELEASE` button at (40, 236) and the laser key at (70, 236). The LCD at `LCD` (green digits on black).
- **The charge track** (levels 1 to 3): `track(g, lo, hi)` along the bottom with `trackHandle('q', () => lo, () => hi)`; in level 3 a white `0` tick at the track's centre.

### 6.2 The helper (the float gauge and the ghost bead)

| Round | What shows |
|---|---|
| 1 (`assist 0`) | live: the LCD shows `lcdText(r, v)`; in levels 1 to 3 a **ghost bead** (the bead's outline, dashed, alpha 0.5) sits at the true float height for the dial `yOf(kind, floatH)`, clamped to the column; at `pulled` or `flat` the ghost sits on the base. |
| 2 (`assist 1`) | `LCD_OFF` and no ghost, except for 1.5 s after a force check, when both show in `PAL.yellow` (use `paidFlash()` and `helperOn(r.assist, false, since)`) |
| 3 (`assist 2`) | `LCD_OFF`, no ghost; the check button gives the engine's `No charges left this round.` note (charges `[1, 1, 0]`) |

Level 4 has **no ghost** in any round: the ghost would show the bead's float height, which is the answer. Its helper is the LCD force line only.

The LCD and the ghost are the **only** places a float height or force for the player's setting appears before the shot (prove it with the canvas recorder, section 9).

### 6.3 The shot (`rt` = seconds since fire; the same in every level)

- 0.00: Femi presses `RELEASE`, the goggles drop, a `CLICK` floater at (40, 220). Dot's lens zooms.
- 0.00 to 0.15: the clamp prongs swing open.
- 0.15 to 0.95: the bead moves from the clamp to its **drawn rest** `restY` with an ease-out, then a damped bob of amplitude 6 px (`6 · e^(−4u) · sin(14u)`, u = rt − 0.95) until 1.4 s.
  - `restY`: win → the beam line; low → beam line + `OFFSET`; high → beam line − `OFFSET`; clamp `restY` to [COL.top + 10, COL.base − 10]. `pulled` and `flat` stay in the clamp.
  - `pulled`: at 0.20 four short jagged blue sparks (`#bfe0ff`) between the bead and the dome, re-jittered every 0.05 s from `t`, a `SNAP` floater, and `A.shake(5)`; Femi turns startled.
  - `flat`: a `…` floater above the clamp at 0.30.
- 1.00: Femi turns the laser key; the beam fires: a solid line `PAL.red` 3 px with a glow (blur 10), across the column from the emitter to the dump, fading in over 0.08 s, with a `ZAP` floater at (300, beamY − 18).
- **Verdict at 1.10** (`delay: 1.1` for every level).
  - Win: the bead glows (1.10 to 1.60) and turns into the mirror sphere; a `MELT!` floater; Dot shows `✓` and hops; Femi cheers.
  - Low or high: the beam passes the bead; a small scorch glow on the beam dump; Dot shows `✗`; Femi worried.
  - Pulled and flat: the beam crosses an empty column; reactions as in section 4.
- The beam stays on until 1.6 s, then fades out by 1.8 s. Everything ends by 2.3 s.

### 6.4 What must never show

- The answer (q in levels 1 to 3, h in level 4) is never drawn, except inside the round 1 gauge, the 1.5 s window after a paid check, and after a win.
- On a miss the bead is at exactly `OFFSET` px from the beam, never at its true height.
- Level 4: before the shot the bead stays in the clamp; there is no ghost.
- `hit` is the fixed point `HIT = [470, 70]` in every level.

## 7. Controls and mount

One function `level(n, random)` returns the `DialLevel<Round>` for level n, after `const rounds = buildRounds(n, random)` and `const pf = paidFlash()`.

| Level | dial | handle |
|---|---|---|
| 1 | `{ key: 'q', aria: 'Charge on the bead in nanocoulombs', label: 'Bead charge', unit: 'nC', step: 1, min: 1, max: 20, start: 1 }` | `trackHandle('q', () => 1, () => 20)` |
| 2 | `{ key: 'q', aria: 'Charge on the bead in picocoulombs', label: 'Bead charge', unit: 'pC', step: 1, min: 1, max: 40, start: 1 }` | `trackHandle('q', () => 1, () => 40)` |
| 3 | `{ key: 'q', aria: 'Charge on the bead in picocoulombs, negative or positive', label: 'Bead charge', unit: 'pC', step: 1, min: -40, max: 40, start: 0, text: (x) => (x < 0 ? `−${-x}` : x > 0 ? `+${x}` : '0') }` | `trackHandle('q', () => -40, () => 40)` |
| 4 | `{ key: 'h', aria: 'Height of the laser beam in centimetres', label: 'Laser height', unit: 'cm', step: 1, min: 2, max: 19, start: 19 }` | the emitter on its rail: `at: (_r, v) => [273, yOf('aim', v.h)]`, `drag: (_r, _px, py) => (COL.base - 7 - py) / 13`, `radius: 20` |

Common to every level:
- `hero: { name: 'Femi', role: ROLE, ...HEROES[n - 1] }` with the stories of section 4; `charges: [1, 1, 0]`.
- `test: { button: '🔎 Force check', aria: 'Force check: compare the push of the base with the bead’s weight', read: (r, v) => { pf.paid(); return checkText(r, v); } }`.
- `fire: { button: '🔥 Release and fire', aria: 'Release the bead and fire the laser' }`.
- `judge`, `miss: missText`, `win: winText`, `hint` (5.4), `hit: () => HIT`, `delay: 1.1`, `draw`.
- **First-touch pulse** (UX 3): in level 1 round 1, until the dial value first differs from its start (check `v.q` in `draw`) or the canvas gets its first `pointerdown` (add a listener on `A.canvas` in `draw` once), draw a pulsing `drag ⇔` label (12 px, `PAL.yellow`, alpha `0.5 + 0.5·sin(5t)`) 26 px above the track handle (level 4: `drag ⇕` beside the emitter). The engine already pulses every handle's ring.
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(4, ctx.level)) as 1 | 2 | 3 | 4; return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA); } })`.
- `ARIA = 'A levitation lab: a scientist at a console beside a glass column where a charged metal bead floats above a charged base, with a heating laser crossing the column.'`
- Reduced motion: when `matchMedia('(prefers-reduced-motion: reduce)')` matches, skip the bob and Femi's head turn; the engine already limits shakes.

## 8. game.json (copy exactly)

Copy `docs/curriculum/gap-designs/rebuilds/json/coulomb-balance.json` over the existing `game.json`. Its lengths were checked by script on 2026-10-31 (section 9.3). It keeps `order: 2` and `ncertRef: "Section 1.5, Coulomb's Law"`.

## 9. Tests

### 9.1 `logic.test.ts`

1. **Pools**:
   - float: `fmt(floatCm(m, Q, q)) === String(h)`; and `m·10⁻³·9.8·(h/100)² / (K·Q·10⁻⁶)` in nC is within 0.08 of `q`.
   - tiny and signed: `fmt(floatMm(m, Q, q)) === String(h)`; solving back gives `|q|` within 0.12; `Math.sign(q) === Math.sign(Q)`.
   - aim: `fmt(m·10⁻³·9.8·(h/100)²/(K·Q·10⁻⁶)/10⁻⁹) === String(q)`; and `floatCm(m, Q, q)` is within 0.03 of `h`.
   - Every shown height is inside the column (5 to 17 cm, 3 to 10 mm) and every level 4 `q` is between 1 and 20 nC.
2. **One winner**: for every row, scan the whole dial (level 1: 1 to 20; level 2: 1 to 40; level 3: −40 to 40; level 4: 2 to 19). Only the answer passes `judge`, and the start setting fails.
3. **No shared answers**: within each level, no answer appears in two pools; no answer is at a dial end.
4. **Physical honesty**: for levels 1 to 3, the neighbours `q ± 1` float at least 1.2% away from `h` (`floatCm`/`floatMm`), so a near miss really misses a beam ±1% wide.
5. **Rounds**: 80 seeds `Array.from({ length: 80 }, (_, i) => i * 7919 + 13)`: every level has 3 rounds of its kind, `assist` is `[0, 1, 2]`, and round k's row is from pool k.
6. **Faults**: level 3, for every row: `q = 0` gives `flat`; `q = −r.q` gives `pulled`; `q = r.q ± 1` (same sign) gives `low`/`high`. Level 4: `h = r.h + 1` gives `low`, `h = r.h − 1` gives `high`.
7. **Words**: for every row and every wrong dial value, `missText` does not contain the answer token: level 1 `` `${r.q} nC` ``, levels 2 and 3 `` `${Math.abs(r.q)} pC` ``, level 4 `` `${r.h} cm` ``, each with a leading `(^|[^0-9.])` so `12 nC` does not match `2 nC`. `winText` contains `k q Q / h² = m g` (levels 1 and 4) or `q = m g h²` (levels 2 and 3).

### 9.2 `tests/coulomb-balance-ui.test.ts`

Copy `tests/capacitor-bench-ui.test.ts` for the shape: `arcadeHarness(game, 'coulomb-balance', 4)` and `shellTests` with

```ts
const build = (level: number, seed: number) => buildRounds(level as 1 | 2 | 3 | 4, createRng(seed));
function set(r: Round, right: boolean) {
  if (r.kind === 'aim') h.setSlider(right ? r.h : r.h + 1);
  else h.setSlider(right ? r.q : r.kind === 'signed' ? -r.q : r.q + 1);
}
// commit: h.click('Release the bead and fire the laser')
```

Then `describe('Float the Bead', …)`:
- Level 1's slider runs 1 to 20 and starts at 1; level 3's runs −40 to 40 and starts at 0; level 4's runs 2 to 19 and starts at 19.
- Level 3 with the opposite sign: the miss text contains `pulled down onto the base`; with 0 it contains `uncharged`.
- A force check costs a charge (`/Force check/`), then round 3 says `/No charges left/`.
- A win says `Melted!`.
- **Canvas recorder** (copy the recorder from `tests/capacitor-bench-ui.test.ts`): the gauge text (`/^floats at .* (cm|mm)$/` in levels 1 to 3, `/^at .* cm: push .* mN · weight .* mN$/` in level 4) is drawn in round 1, in round 2 only within 1.5 s after a force check, and never in round 3. No drawn text before the shot contains the answer token (`` `${r.q} nC` ``, `` `${Math.abs(r.q)} pC` ``, `` `${r.h} cm` ``) while the dial is at its start.
- On a miss in level 1, set `canvas.dataset.restY` in `draw` (the bead's drawn rest y) and check it is the beam line ± 34, never the true float height.

### 9.3 JSON check

`node <scratchpad>/rebuild-checks/ch01a/json-check.mjs coulomb-balance` passed on 2026-10-31 (lengths and uniqueness).

## 10. Traps to avoid

- **Do not draw the bead at its true height on a miss.** Use `OFFSET`. The true height lets the player solve the next try in one step.
- **No ghost in level 4.** The ghost would show where the bead floats, which is the answer.
- **The column's ticks carry no numbers.** Only the top label and the given beam height are written.
- **Signs**: level 3 checks the sign before the size. A `0` charge is `flat`, not `low`.
- **Units**: levels 1 and 4 work in g, µC, nC, cm; levels 2 and 3 in mg, nC, pC, mm. Do not show nC in a pC level's readout.
- **Timing**: the verdict is at 1.1 s in every level; everything ends by 2.3 s.
- **Docs**: do not edit `docs/curriculum/physics-class-12/ch01-concept-weights.md`; the reviewer updates it after the build.
