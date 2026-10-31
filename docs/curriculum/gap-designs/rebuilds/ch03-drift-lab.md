# Rebuild · Drift Lab as "The Slowest Race" (Physics Ch 3, §3.2, 3.5, 3.5.1)

Read `../README.md` first (above all "A miss must not show the answer either", "UX checklist" and "Helpers fade"), then `README.md` in this folder. Everything below is required unless marked "optional". If a number in this brief does not work, stop and report it; do not improvise.

The old Drift Lab was a number-entry quiz. This brief **replaces the whole game** with an arcade race in a real setting. It keeps the id, so links and the menu position stay, and it keeps every concept: current as charge per second, the direction of conventional current, I = nAev_d, the slow drift against the fast signal, a thinner wire drifting faster, and mobility.

## 1. Identity

| Field | Value |
|---|---|
| Game id | `drift-lab` (unchanged) |
| Folder | `src/games/physics/class-12/ch03-current-electricity/drift-lab/` (existing) |
| Files | **Replace** `game.json` with `docs/curriculum/gap-designs/rebuilds/json/drift-lab.json` (copy exactly). **Delete and rewrite** `logic.ts`, `logic.test.ts`, `index.ts`. **Add** `art.ts`. |
| UI test | **Delete** `tests/drift-ui.test.ts`. **Create** `tests/drift-lab-ui.test.ts`. |
| Engine | `mountDialLevel` from `@core/dialgame`, one `DialLevel` per level (4 levels); `paidFlash`, `helperOn`, `FLASH` from `@core/aidflash` |
| Book coverage | §3.2 (I = Q/t, the direction of current), §3.5 (I = nAev_d; Ex 3.9; Examples 3.1, 3.2), §3.5.1 (mobility, v_d = μE) |
| Inspiration (code comment only) | Kart-racer time trials against a ghost racer, the pacing lights of athletics meets, village-fair snail races |
| Core verb | **Set the pace.** Throttle the race current, flip its current arrow, pick the race wire off the spool rack, slide the millivolt throttle; then the Marshal drops the flag and the race runs. No other chapter 3 game races. |

Nothing else in the repo imports the old `drift-lab/logic.ts` (checked 2026-10-31: only `tests/drift-ui.test.ts` uses it). Search again for `drift-lab/logic` before deleting, and delete only the files named above.

## 2. What the student learns

- Current is charge per second through a cross-section: I = Q/t = Ne/t, with e = 1.6 × 10⁻¹⁹ C.
- Electrons are negative, so they drift toward the battery's + end, and the conventional current points the opposite way.
- I = n e A v_d. In copper n = 8.5 × 10²⁸ m⁻³, so the drift speed is tiny: a few amperes make electrons crawl at a snail's pace (Ex 3.9, Example 3.1).
- The field that starts every electron drifting travels at about 3 × 10⁸ m/s, which is why a lamp lights at once although each electron crawls (Example 3.2). Each nanosecond is 30 cm of wire.
- For the same current, v_d ∝ 1/A: a thinner wire drifts faster.
- Mobility: v_d = μE with E = V/L, and then I = nAev_d.

Working unit: **I (A) = 13.6 × A (mm²) × v_d (mm/s)**, because n e = 8.5 × 10²⁸ × 1.6 × 10⁻¹⁹ = 1.36 × 10¹⁰ C/m³, and 1 mm² × 1 mm/s = 10⁻⁹ m³/s.

## 3. The mechanic, physically

**Zip** is a free electron in a copper wire. The wire lies in a glass tube along a fair's snail-racing table, beside the chalk lane of **Shelly**, the champion racing snail. A brass magnifier, the **Zoom Lens**, shows the inside of the wire in a round window: rows of copper ions and Zip among them. A **race battery** at the left end drives the wire's current; a **finish lamp** on a post at the finish end lights the photo-finish camera. The **Marshal** starts each heat with a flag.

When the flag drops the battery connects. The field races along the wire at 3 × 10⁸ m/s and the finish lamp lights at once. Every free electron, Zip too, starts to drift at v_d = I/(neA) toward the battery's + end, while still jiggling in every direction (thermal motion). The race is time-lapsed. Zip must drift at exactly Shelly's record pace so they cross the line together: a **dead heat**, the only result the stewards accept as Zip pacing the record.

| Level | The player sets | What decides the heat |
|---|---|---|
| 1 Start gate | current I and the current arrow (→ or ←) | The record pace is so many electrons through the start gate per second: I = Ne/t. Electrons drift against the arrow, so the arrow must point away from the finish. |
| 2 A slow crawl | current I | Shelly's record gives her pace v = L/T; the wire's area is given; I = 13.6 × A × v. |
| 3 Thick and thin | the race wire's cross-section A | The battery current is fixed. The track length comes from the lamp's delay (L = c × τ); then v = L/T and A = I/(13.6 v). |
| 4 Mobility | the voltage across the track wire (mV) and the race wire A | v_d = μV/L must equal Shelly's pace, and I = 13.6 × A × v_d must equal the finish lamp's current. |

Physical consequences. Every miss shows what the player's setting did, by direction only, at **fixed** positions (never in proportion to the error):
- **Dead heat** (win): Zip and Shelly cross the finish line together; the camera flashes; the photo frame reads `DEAD HEAT · RECORD!`.
- **Too slow**: Shelly crosses alone; Zip is at a fixed 60% of the track. Frame: `SHELLY ALONE · NO RECORD`.
- **Too fast**: Zip crosses alone; Shelly is at a fixed 60% and stops, eye stalks drooping. Frame: `ZIP RAN AWAY`.
- **Backwards** (level 1, wrong arrow): Zip drifts back to the tube's end cap behind the start and bonks it, dizzy. Frame: `WRONG WAY`.
- **Too dim** (level 4): a dead heat, but the finish lamp glows at a fixed dull level and the photo is black. Frame: `TOO DARK TO JUDGE`.
- **Lamp blown** (level 4): a dead heat, but the lamp flares and pops early. Frame: `NO LIGHT`.

## 4. Story and characters

Hero banner: `name: 'Zip'`, `role: 'a free electron in a copper wire, hired to pace the champion racing snail'`.

| Level | story | objective |
|---|---|---|
| 1 | `The fair’s snail race has a new pacer: Zip, a free electron in a copper wire laid along the track in a glass tube. When the flag drops the battery connects, and every free electron starts to drift toward the battery’s + end. A current is charge per second through the start gate, and by convention it points the opposite way to the electrons’ drift.` | `Set the current and its direction so Zip drifts beside Shelly to a dead heat, in three heats.` |
| 2 | `Now the stewards give Shelly’s record time and the wire’s cross-section. Every free electron drifts at v_d = I/(neA), and copper has 8.5 × 10²⁸ free electrons in each cubic metre, so even a big current only makes them crawl.` | `Set the current that makes Zip drift at exactly Shelly’s record pace.` |
| 3 | `The race battery now drives a fixed current, and you pick the race wire from the spool rack. The same current flows through the thick feeder and the race wire, so where the wire is thinner the electrons drift faster. Nobody measured the track, but the finish lamp lit a few nanoseconds after the field passed the start gate: the field that starts the drift moves at 3 × 10⁸ m/s.` | `Pick the race wire that makes Zip drift at Shelly’s record pace.` |
| 4 | `The finals use a millivolt supply that holds the voltage across the track wire. That voltage sets a field E = V/L, and each electron drifts at v_d = μE, where μ is copper’s mobility on the day. The current that drift carries, I = nAev_d, lights the photo-finish lamp in series: too little and the photo is too dark, too much and the lamp blows.` | `Set the voltage and the race wire so Zip ties Shelly and the lamp lights the photo.` |

Characters (each in its own function in `art.ts`, AGENTS.md item 17):
- **Zip** (hero), drawn twice.
  - In the Zoom Lens: a round electron of radius 20 at the lens centre, deep blue body (`#3a6cff`) with a `−` on its chest in white (13 px).
    - Gear: a racing helmet in `PAL.cyan` with a dark visor, tiny goggles pushed up, a red scarf, white racing gloves, and a number bib reading `e⁻`.
    - Pose: crouched forward, helmet tilted 10° toward the finish (the heading is a given fact, so this is no leak).
  - On the track: a glowing dot of radius 5 (`PAL.cyan`, glow 8) on the wire's copper core, with the label `Zip` (11 px) at (Zip's x, 264).
  - Idle (both): thermal jitter, an offset of `(3·sin(7.3t) + 2·sin(11.1t), 2·sin(9.7t))` px; blinks every 3 s (eyes 0.12 s closed when `t % 3 < 0.12`); every 4 s glances toward Shelly (pupils shift 2 px when `t % 4 < 0.6`).
  - Action (at fire): the visor snaps down over 0.1 s, the scarf streams back, and three speed lines trail Zip in the lens.
  - Moods: `face(g, …, 'happy')` while waiting; `'cheer'` with both arms up and four sparkles on a win; `'worried'` with a sweat drop after slow, fast, dim or blown; **dizzy** after a backward bonk (spiral eyes and three stars circling the helmet, drawn by hand).
- **Shelly** (the rival and target), a garden snail on the chalk lane, about 58 px long, foot on `LANE.snailY`, facing the finish.
  - Body: a soft green-grey foot (`#9fb48a`), a brown spiral shell (`#8a5a2b`, radius 15) with a white racing roundel reading `7` (12 px), a red sweatband, two eye stalks with round eyes, and a glistening slime trail (a 2 px line, `rgba(200,230,255,0.5)`) behind her from `startX(r)` to her tail.
  - Idle: the eye stalks sway ±8° at different rates (`sin(2.1t)`, `sin(2.7t + 1)`); the foot breathes (scale x 1 ± 0.02).
  - Racing: the foot ripples (scale x 1 ± 0.05 at 1.5 Hz) and the trail grows behind her.
  - Win: both eye stalks stand straight up, and two small hearts float up.
  - Slow miss (she wins alone): she looks back with a `?` floater.
  - Fast miss: she stops; the eye stalks droop 40°; a `sigh…` floater.
  - Backward miss: the eye stalks swing back toward Zip; a `?` floater.
- **The Marshal** (NPC) at the right end, feet at (606, 334), about 72 px tall (x 580 to 632).
  - Gear: a straw boater hat, a red-and-white striped blazer, a whistle on a cord, a stopwatch in one hand (no digits), a green flag and a chequered flag.
  - Idle: looks at her stopwatch every 3 s and taps a foot.
  - Fire: drops the green flag (it swings from up to down over 0.12 s), with a `GO!` floater.
  - Win: waves the chequered flag overhead, with a `RECORD!` floater.
  - Slow, fast, dim or blown: shakes her head, with a `NO RECORD` floater. Backward: a face-palm, with a `WRONG WAY` floater.
  - All Marshal floaters are at (572, 250), so the 20 px floater text stays on the canvas.
- **The crowd**: dark silhouettes (`#0d1124`) behind the table (heads and shoulders, y 150 to 200): 9 figures in round 1, 11 in round 2 (with umbrellas), 14 in round 3. On a win they bob up 4 px twice.
- **The finish lamp**: a brass lamp on a post at the finish end; dark until the take.
- **The photo-finish camera**: a box camera on a short stand at the finish line; it flashes at the crossing.

## 5. Rules (`logic.ts`)

### 5.1 Constants and types

```ts
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const E_CHARGE = 1.6e-19; // C
export const N_CU = 8.5e28;      // free electrons per m³ in copper (the book's value)
export const K = 13.6;           // amperes per (mm² × mm/s): N_CU × E_CHARGE × 1e-9
export const C_LIGHT = 3e8;      // m/s
export const FEEDER = 6;         // mm², the thick feeder from the battery to the start line (level 3 win text)

export interface GateRow { e19: number; t: number; heading: 'right' | 'left'; i: number; dir: 0 | 1 } // e19: electrons in units of 1e19; i: answer A; dir: answer (1 = current arrow ←)
export interface CrawlRow { a: number; len: number; T: number; i: number }   // a mm², len cm, T s, i answer A
export interface ThickRow { i: number; tau: number; T: number; a: number }   // i A (fixed), tau ns, T s, a answer mm²
export interface MobRow { mu: number; L: number; v: number; V: number; a: number; lamp: number } // mu in 1e-3 m²/(V s), L m, v mm/s, V answer mV, a answer mm², lamp A (shown)

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'gate'; assist: Assist } & GateRow)
  | ({ kind: 'crawl'; assist: Assist } & CrawlRow)
  | ({ kind: 'thick'; assist: Assist } & ThickRow)
  | ({ kind: 'mob'; assist: Assist } & MobRow);
```

### 5.2 The pools (copy exactly)

Every row was checked by script on 2026-10-31 (`scratchpad/rebuild-checks/ch03/drift-final-check.mjs`): one winner over the full dial range, the start never wins, the answer is never at a dial end, displayed numbers solve back to the answer (level 4: the nearest dial area to `lamp / (13.6 v)` is the answer and no other area is within 5%), the scene's physics agrees with the judge's direction for every setting, the goal line is at most 51 characters, no miss text names the answer, and **no two rounds of a level can share an answer** (the three pools of each level have disjoint answers; in level 4 the voltages are disjoint too).

```ts
// I = 1.6 × e19 / t. heading 'right' means the finish is on the right, so electrons must drift right and the current arrow points left (dir 1).
export const GATE: GateRow[][] = [
  [{ e19: 2.5, t: 1, heading: 'right', i: 4, dir: 1 }, { e19: 3.75, t: 2, heading: 'left', i: 3, dir: 0 }, { e19: 5, t: 1, heading: 'right', i: 8, dir: 1 },
   { e19: 6.25, t: 2, heading: 'left', i: 5, dir: 0 }, { e19: 7.5, t: 2, heading: 'right', i: 6, dir: 1 }],
  [{ e19: 3.75, t: 4, heading: 'left', i: 1.5, dir: 0 }, { e19: 6.25, t: 5, heading: 'right', i: 2, dir: 1 }, { e19: 8.75, t: 4, heading: 'left', i: 3.5, dir: 0 },
   { e19: 4.5, t: 0.8, heading: 'right', i: 9, dir: 1 }, { e19: 6.25, t: 4, heading: 'left', i: 2.5, dir: 0 }],
  [{ e19: 8.75, t: 2, heading: 'left', i: 7, dir: 0 }, { e19: 6.25, t: 1, heading: 'right', i: 10, dir: 1 }, { e19: 2.5, t: 4, heading: 'right', i: 1, dir: 1 },
   { e19: 2.75, t: 0.8, heading: 'left', i: 5.5, dir: 0 }],
];

// v = 10 × len / T mm/s; I = 13.6 × a × v.
export const CRAWL: CrawlRow[][] = [
  [{ a: 0.25, len: 30, T: 255, i: 4 }, { a: 0.25, len: 25, T: 170, i: 5 }, { a: 0.5, len: 30, T: 340, i: 6 }, { a: 0.75, len: 40, T: 510, i: 8 }, { a: 1, len: 50, T: 680, i: 10 }],
  [{ a: 0.25, len: 50, T: 680, i: 2.5 }, { a: 0.5, len: 30, T: 680, i: 3 }, { a: 0.75, len: 25, T: 340, i: 7.5 }, { a: 2, len: 30, T: 680, i: 12 }, { a: 1, len: 30, T: 255, i: 16 }],
  [{ a: 0.25, len: 30, T: 510, i: 2 }, { a: 0.75, len: 30, T: 680, i: 4.5 }, { a: 1.5, len: 30, T: 680, i: 9 }, { a: 0.75, len: 50, T: 340, i: 15 }, { a: 1, len: 40, T: 320, i: 17 }],
];

// Track length = 300 × tau mm (the field covers 300 mm per ns); v = length / T; a = i / (13.6 v).
export const THICK: ThickRow[][] = [
  [{ i: 6, tau: 1, T: 510, a: 0.75 }, { i: 10, tau: 1, T: 612, a: 1.5 }, { i: 17, tau: 1, T: 600, a: 2.5 }, { i: 4, tau: 1.5, T: 765, a: 0.5 }],
  [{ i: 8, tau: 2, T: 1020, a: 1 }, { i: 12, tau: 1, T: 595, a: 1.75 }, { i: 17, tau: 1.5, T: 990, a: 2.75 }, { i: 15, tau: 1.5, T: 918, a: 2.25 }],
  [{ i: 8, tau: 2, T: 1275, a: 1.25 }, { i: 15, tau: 1.5, T: 816, a: 2 }, { i: 18, tau: 1.5, T: 1020, a: 3 }, { i: 9, tau: 1.5, T: 850, a: 1.25 }],
];

// V (mV) = 1000 × v × L / mu; lamp = 13.6 × a × v, shown to 3 figures.
export const MOB: MobRow[][] = [
  [{ mu: 4, L: 0.4, v: 0.5, V: 50, a: 1, lamp: 6.8 }, { mu: 4, L: 0.3, v: 0.8, V: 60, a: 0.75, lamp: 8.16 }, { mu: 3.6, L: 0.6, v: 0.6, V: 100, a: 1.25, lamp: 10.2 },
   { mu: 3.2, L: 0.4, v: 0.8, V: 100, a: 0.5, lamp: 5.44 }],
  [{ mu: 4, L: 0.6, v: 1.2, V: 180, a: 0.75, lamp: 12.2 }, { mu: 4, L: 0.4, v: 0.4, V: 40, a: 2, lamp: 10.9 }, { mu: 5, L: 0.5, v: 1.4, V: 140, a: 0.5, lamp: 9.52 },
   { mu: 4.4, L: 0.44, v: 1.2, V: 120, a: 1, lamp: 16.3 }],
  [{ mu: 3.2, L: 0.6, v: 0.8, V: 150, a: 1.5, lamp: 16.3 }, { mu: 3.6, L: 0.6, v: 1.5, V: 250, a: 0.75, lamp: 15.3 }, { mu: 4, L: 0.3, v: 1.2, V: 90, a: 1, lamp: 16.3 },
   { mu: 4.4, L: 0.33, v: 1.2, V: 90, a: 0.5, lamp: 8.16 }],
];
```

### 5.3 Physics, rounds and judging

```ts
export const DIAL = {
  i1: { min: 0.5, max: 12, step: 0.5, start: 0.5 },   // level 1 current, A
  dir: { min: 0, max: 1, step: 1, start: 0 },         // level 1: 0 = current arrow →, 1 = current arrow ←
  i2: { min: 0.5, max: 20, step: 0.5, start: 0.5 },   // level 2 current, A
  a: { min: 0.25, max: 4, step: 0.25, start: 4 },     // levels 3 and 4: race wire, mm² (starts on the thickest spool)
  mv: { min: 10, max: 300, step: 10, start: 10 },     // level 4 track voltage, mV
};

/** Zip's drift speed in mm/s for a current i (A) in a wire of a (mm²). */
export const pace = (i: number, a: number) => i / (K * a);
/** Level 4: drift speed in mm/s for mobility mu (1e-3 m²/(V s)), mV across L metres. */
export const paceMob = (mu: number, mv: number, L: number) => (mu * mv) / (1000 * L);
/** Level 1: electrons per second through the gate, in units of 1e19. */
export const perSecond = (i: number) => i / 1.6;
/** The record time written the race way: 340 -> '5 min 40 s', 1020 -> '17 min'. */
export const mmss = (T: number) => `${Math.floor(T / 60)} min${T % 60 ? ` ${T % 60} s` : ''}`;
/** Level 4 lamp: compares the player's current with the lamp's, exactly (a and mv are exact binary values). */
export const lampState = (r: MobRow, x: Values): 'dim' | 'ok' | 'blown' => {
  const mine = x.a! * x.mv!;
  const need = r.a * r.V;
  return mine === need ? 'ok' : mine < need ? 'dim' : 'blown';
};

export function buildRounds(level: 1 | 2 | 3 | 4, random: () => number): Round[] {
  const pools = [GATE, CRAWL, THICK, MOB][level - 1] as unknown[][];
  const kind = (['gate', 'crawl', 'thick', 'mob'] as const)[level - 1];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

export type Fault = 'backward' | 'slow' | 'fast' | 'dim' | 'blown';
export type Values = { i?: number; dir?: number; a?: number; mv?: number };

export function fault(r: Round, x: Values): Fault | null {
  switch (r.kind) {
    case 'gate':
      if (x.dir !== r.dir) return 'backward';
      return x.i === r.i ? null : x.i! < r.i ? 'slow' : 'fast';
    case 'crawl':
      return x.i === r.i ? null : x.i! < r.i ? 'slow' : 'fast';
    case 'thick':
      return x.a === r.a ? null : x.a! > r.a ? 'slow' : 'fast'; // thicker wire, slower drift
    case 'mob':
      if (x.mv !== r.V) return x.mv! < r.V ? 'slow' : 'fast';
      return x.a === r.a ? null : x.a! < r.a ? 'dim' : 'blown';
  }
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;
/** The moment of the verdict, in seconds after Fire. */
export const verdictDelay = (r: Round, x: Values) => {
  const f = fault(r, x);
  return f === 'backward' ? 0.65 : f === 'fast' ? 1.05 : 1.65;
};
```

- `buildRounds` must be the **first** use of `random` in the level, so the UI test rebuilds the same rounds from the same seed.
- Level 1 checks the arrow first: with the wrong arrow Zip drifts backwards whatever the current.
- Level 4 checks the pace (the voltage) before the lamp (the area). The lamp in the picture is still drawn from `lampState`, which uses both dials.
- Start settings: level 1 `i = 0.5, dir = 0`; level 2 `i = 0.5`; level 3 `a = 4`; level 4 `mv = 10, a = 4`. None of them wins any row (tested), and none of them is drawn as anything but the player's own setting.

### 5.4 Words

Use `fmt` from `@core/judge` for computed numbers. `count(r)` is `` `${r.e19} × 10¹⁹` ``. `arrowWord(dir)` is `dir ? '← (right to left)' : '→ (left to right)'`. `cm(L)` is `` `${Math.round(L * 100)} cm` ``.

**`intel(r)`**:
- gate: `` `Record pace in this wire: ${count(r)} electrons cross the start gate every ${r.t} s. This heat runs ${r.heading === 'right' ? 'left to right' : 'right to left'}.` ``
- crawl: `` `Copper wire of ${r.a} mm². Shelly’s record: ${r.len} cm in ${mmss(r.T)}. n = 8.5 × 10²⁸ per m³, e = 1.6 × 10⁻¹⁹ C.` ``
- thick: `` `The battery drives ${r.i} A. The finish lamp lit ${r.tau} ns after the field passed the start gate. Shelly’s record over this track: ${mmss(r.T)}.` ``
- mob: `` `Track wire ${cm(r.L)} long; copper’s mobility today μ = ${r.mu} × 10⁻³ m²/(V s). Shelly’s pace: ${r.v} mm/s. The finish lamp needs ${r.lamp} A.` ``

**`hintText(r)`** (the hint line): `` `${intel(r)} ${r.assist === 0 ? 'Round 1: the pace board is live.' : r.assist === 1 ? 'The pace board is off: a pace check costs a charge.' : 'Grand final: no pace board.'}` ``

**`missText(r, x)`**: what the setting did and what to change, in plain words. It prints only the player's own values, never the answer.
- gate backward: `` `With the current arrow ${arrowWord(x.dir!)}, the electrons drifted toward the start and Zip went backwards. Electrons drift against the current arrow.` ``
- gate slow: `` `At ${x.i} A too few electrons crossed the gate each second, so Zip drifted too slowly. Raise the current.` ``
- gate fast: `` `At ${x.i} A too many electrons crossed the gate each second, so Zip drifted too fast and ran away from Shelly. Lower the current.` ``
- crawl slow: `` `At ${x.i} A Zip drifted slower than Shelly’s record pace. Raise the current.` ``
- crawl fast: `` `At ${x.i} A Zip drifted faster than Shelly and ran away. Lower the current.` ``
- thick slow: `` `In the ${x.a} mm² wire the battery’s current drifted too slowly. Pick a thinner wire.` ``
- thick fast: `` `In the ${x.a} mm² wire the battery’s current drifted too fast. Pick a thicker wire.` ``
- mob slow: `` `At ${x.mv} mV the field was too weak and Zip drifted too slowly. Raise the voltage.${lampClause}` ``
- mob fast: `` `At ${x.mv} mV the field was too strong and Zip drifted too fast. Lower the voltage.${lampClause}` ``, where `lampClause` is `''` when `lampState` is `'ok'`, `' The finish lamp was too dim as well.'` for `'dim'`, and `' The finish lamp blew as well.'` for `'blown'`.
- mob dim: `` `A dead heat! But in the ${x.a} mm² wire the current was too small and the lamp was too dim for the photo. Pick a thicker wire.` ``
- mob blown: `` `A dead heat! But in the ${x.a} mm² wire the current was too big and the lamp blew. Pick a thinner wire.` ``

**`meterText(r, x)`** (the pace check, which costs a charge):
- gate: `` `Pace check: at ${x.i} A, ${fmt(perSecond(x.i!))} × 10¹⁹ electrons cross the gate each second, drifting ${x.dir ? 'left to right' : 'right to left'}.` ``
- crawl: `` `Pace check: at ${x.i} A Zip would drift at ${fmt(pace(x.i!, r.a))} mm/s.` ``
- thick: `` `Pace check: in a ${x.a} mm² wire Zip would drift at ${fmt(pace(r.i, x.a!))} mm/s.` ``
- mob: `` `Pace check: ${x.mv} mV gives E = ${fmt(x.mv! / 1000 / r.L)} V/m, so Zip would drift at ${fmt(paceMob(r.mu, x.mv!, r.L))} mm/s and the lamp would get ${fmt(K * x.a! * paceMob(r.mu, x.mv!, r.L))} A.` ``

**`lcdText(r, x)`** (the pace board, section 6.2):
- gate: `` `${fmt(perSecond(x.i!))}×10¹⁹ e⁻/s ${x.dir ? '→' : '←'}` `` (the arrow is the electrons' drift, the opposite of the current arrow)
- crawl: `` `Zip ${fmt(pace(x.i!, r.a))} mm/s` ``; thick: `` `Zip ${fmt(pace(r.i, x.a!))} mm/s` ``
- mob: `` `${fmt(paceMob(r.mu, x.mv!, r.L))} mm/s · ${fmt(K * x.a! * paceMob(r.mu, x.mv!, r.L))} A` ``
- `LCD_OFF = '— — —'`.

**`winText(r)`** (two or three short sentences: the working, then one line of wonder):
- gate: `` `Record! ${count(r)} electrons carry ${fmt(1.6 * r.e19)} C, so I = Q/t = ${fmt(1.6 * r.e19)} C ÷ ${r.t} s = ${r.i} A. Electrons drift toward the battery’s + end, so the current arrow points ${arrowWord(r.dir)}, against their drift.` ``
- crawl: `` `Dead heat! Shelly’s pace is ${r.len * 10} mm ÷ ${r.T} s = ${fmt((10 * r.len) / r.T)} mm/s, so I = neAv_d = 13.6 × ${r.a} × ${fmt((10 * r.len) / r.T)} = ${r.i} A. Electrons crawl at a snail’s pace, yet a lamp lights at once: the field races along the wire at 3 × 10⁸ m/s.` ``
- thick: `` `Dead heat! The lamp lit after ${r.tau} ns, so the track is 3 × 10⁸ × ${r.tau} × 10⁻⁹ = ${fmt(0.3 * r.tau)} m, and Shelly’s pace is ${fmt((300 * r.tau) / r.T)} mm/s. A = I ÷ (13.6 v_d) = ${r.a} mm². In the ${FEEDER} mm² feeder the same ${r.i} A drifts only ${fmt(r.i / (K * FEEDER))} mm/s: thicker wire, slower drift.` ``
- mob: `` `Dead heat and a sharp photo! E = V/L = ${fmt(r.V / 1000 / r.L)} V/m, so v_d = μE = ${r.v} mm/s, and I = neAv_d = 13.6 × ${r.a} × ${r.v} = ${fmt(K * r.a * r.v)} A for the lamp.` ``

## 6. Screen and art

Canvas 640 × 340 (`mountDialLevel`). **Draw the whole scene over the engine's grid with opaque fills**, so the grid never shows (the Mirror Mage lesson). All scene text is at least 11 px (`text(g, s, x, y, color, size)` from `@core/neon`), white or yellow on the dark scene. Use a deterministic hash for any scatter (copy `jit` and `frac` from `capacitor-bench/art.ts`); never `Math.random` in drawing.

```ts
export const TRACK = { x0: 92, x1: 540 };        // START and FINISH lines (swapped when a level 1 heat runs right to left)
export const LANE = { snailY: 222, wireY: 243 }; // Shelly's foot line; the wire's copper core
export const TUBE = { x0: 70, x1: 560, y0: 235, y1: 251 };
export const LENS = { x: 150, y: 110, r: 62 };   // the Zoom Lens window
export const BOX = { x: 12, y: 266, w: 122, h: 68 }; // the race battery (title and terminals only; L3 shows its current)
export const BOARD = { x: 470, y: 52, w: 152, h: 26 }; // the pace board (the helper), a fairground scoreboard top right
export const RAIL = { x0: 170, x1: 556, y: 326 };    // levels 1, 2 and 4: the throttle rail along the bottom (ends short of the Marshal)
export const SWITCH = { x: 40, y: 222, len: 18 };    // level 1: the two-way arrow switch on the table's left end
export const RACK3 = { x0: 160, w: 25, y: 296, h: 34 }; // level 3: 16 spool slots, slot k holds a = 0.25 (k + 1)
export const RACK4 = { x0: 160, w: 25, y: 266, h: 28 }; // level 4: the same rack, raised to make room for the rail
export const CAP = { left: TUBE.x0 + 6, right: TUBE.x1 - 6 }; // the tube's end caps, where a backward Zip bonks
export const finishX = (r: Round) => (r.kind === 'gate' && r.heading === 'left' ? TRACK.x0 : TRACK.x1);
export const startX = (r: Round) => (r.kind === 'gate' && r.heading === 'left' ? TRACK.x1 : TRACK.x0);
export const capX = (r: Round) => (startX(r) === TRACK.x0 ? CAP.left : CAP.right); // the end cap behind the start
export const lampAt = (r: Round): [number, number] => [finishX(r) === TRACK.x1 ? 566 : 66, 160]; // the finish lamp's bulb
export const cameraAt = (r: Round): [number, number] => [finishX(r), 184]; // a box camera on a short stand at the finish line
export const FRAME = { x: 235, y: 54, w: 170, h: 92 }; // the photo-finish frame
export const slotX = (a: number) => RACK3.x0 + RACK3.w * (a / 0.25 - 1) + RACK3.w / 2;
export const reelR = (a: number, level: 3 | 4) => (level === 3 ? 4 + 2 * a : 3 + 2 * a); // the drawn winding radius
```

Layout rules (no label may overlap another, the hero or the target):
- The top band holds the round banner (12, 20), the goal line (320, 20) and the bunting (y 30 to 44). The Zoom Lens spans x 88 to 212, y 48 to 172; the photo frame x 235 to 405, y 54 to 146; the pace board x 470 to 622, y 52 to 78.
- The crowd stands behind the table, y 150 to 200. The table top is y 200 to 256 and its front edge y 256 to 262.
- Below the table, y 264 to 340: the battery box on the left (x 12 to 134); the spool rack (L3 at y 296 to 330, L4 at y 266 to 294) from x 160 to 560, and the throttle rail (y 326) from x 170 to 556; the Marshal on the right (x 580 to 632).

### 6.1 The fairground

- **Sky** (opaque, full canvas), one look per round (UX item 8):
  - Round 1, `HEAT 1`, early morning: `#14204a` with a pale moon (radius 8, `#e8ecff`) at (618, 14).
  - Round 2, `SEMI-FINAL`, rainy afternoon: `#1d2a3a`, with 40 rain streaks: streak j is a 1 px line from (x, y) to (x − 3, y + 9) in `rgba(180,200,255,0.35)`, with `x = (j * 53 + 17) % 640` and `y = (t * 300 + j * 37) % 340`. The crowd holds umbrellas.
  - Round 3, `GRAND FINAL` (the boss round): dusk `#1b1033`, a row of 14 fairy lights along y 47 at `x = 30 + 42 j` (radius 3, alternating `PAL.yellow` and `PAL.pink`, glow 6), each with alpha `0.55 + 0.45 · sin(π t / 2 + j)` (a slow 4 s breath, never a blink), a gold trophy on a stand at (470, 188) and the 14-figure crowd.
- **Bunting** across the top, y 30 to 44: triangles 16 px wide in `PAL.pink`, `PAL.yellow` and `PAL.cyan`.
- **The race table**: a wooden plank from x 20 to 600, top `#5a3a22` from y 200 to 256, front edge `#3e2817` from y 256 to 262.
- **Shelly's lane**: two chalk lines at y 208 and y 230 (`rgba(255,255,255,0.6)`, 1.5 px). START and FINISH: a white chalk line at `startX(r)` and a chequered strip 8 px wide at `finishX(r)`, each labelled `START` or `FINISH` (11 px, white) at y 196. In a level 1 heat that runs right to left the two labels swap ends and Shelly faces left.
- **Zip's lane**: the glass tube `TUBE` (fill `rgba(170,210,255,0.12)`, edge `rgba(200,230,255,0.6)`, end caps 4 px wide at `TUBE.x0` and `TUBE.x1`), with a copper core along `LANE.wireY` (`#c8742c`, 4 px). Cables run from both tube ends down to the battery's terminals.
- **The Zoom Lens**: a brass ring (6 px, `#c9a04a`) round `LENS`, on a brass arm from (150, 172) down to a clamp on the tube at (150, 235). Inside, on `#2a1608`, are 4 rows × 6 columns of copper ions (radius 7, `PAL.orange`, with a `+` of 11 px, spacing 18 px), each jiggling ±1.5 px, and Zip at the centre. Clip the inside to the lens circle.
- **The race battery** `BOX`: a dark box with `RACE BATTERY` (11 px) at (73, 280), red `+` and black `−` terminals on its top, and cables to both tube ends. In level 3 it also shows the given current `` `${r.i} A` `` (14 px bold, white) at (73, 308).
- **The pace board** `BOARD`: a black scoreboard on a post, with the helper text centred at (546, 70), 12 px (section 6.2).
- **The finish lamp** at `lampAt(r)`, on a post from the table top (y 200) up to the bulb: dark (`#333`) before the take.
- **The camera** at `cameraAt(r)`: a box camera (22 × 14) on a short stand standing on the table's back edge at the finish line.
- Level 1: **the arrow switch** `SWITCH`, a brass two-way knife switch on the table's left end, hinge at (40, 222), with two contacts at (22, 222) and (58, 222), marked `←` and `→` (13 px bold, white) at (22, 198) and (58, 198). Its blade runs from the hinge to the contact of the current arrow (`dir` 1: the left contact).
- Levels 3 and 4: **the spool rack** (`RACK3` or `RACK4`): 16 wooden reels at `slotX(0.25 (k + 1))` with copper windings of radius `reelR(a, level)`, whole-number tick labels `1`, `2`, `3`, `4` (11 px) under the reels for a = 1, 2, 3 and 4 (L3 at y 338; L4 at y 304), and the chosen reel raised 3 px and outlined in `PAL.yellow`.
- Level 3: a **thick feeder** (a copper bar 8 px thick) from the battery up to the tube's left end, labelled `feeder 6 mm²` (11 px) at (60, 258) on the table's front edge.

### 6.2 The helper (the pace board)

The pace board at `BOARD` (green digits on black, 12 px) is the **only** place the player's resulting drift speed, electron count or lamp current appears before a take. It follows `helperOn` from `@core/aidflash`:

```ts
const flash = paidFlash();               // one per level function
// in draw:
const since = flash.since(t, k);
const won = shot !== null && shot.ok;
const missed = shot !== null && !shot.ok;
const live = helperOn(r.assist, won, missed ? Infinity : since);
A.canvas.dataset.lcd = live ? '1' : '0';
const boardText = live ? lcdText(r, v) : LCD_OFF;
```

| Round | Pace board |
|---|---|
| 1 (`assist 0`) | live: `lcdText(r, v)` in `PAL.green` (during a take it shows the fired values, the player's own) |
| 2 (`assist 1`) | `— — —`, except for `FLASH` (1.5 s) after a pace check, when it shows `lcdText` in `PAL.yellow`, and during a winning take |
| 3 (`assist 2`) | `— — —`, except during a winning take; the pace check gives `A.freeNote('No charges left this round.')` through the engine (charges are `[1, 1, 0]`) |

In rounds 2 and 3 the board **never** shows the live text during or after a miss. Call `flash.paid()` from `test.read`.

### 6.3 The take (`rt` = seconds since Fire; `p` = progress along the track, 0 at START, 1 at FINISH)

Shared by every level:
- 0.00: the Marshal's green flag swings down (0 to 0.12 s) with a `GO!` floater at (572, 250). Zip's visor snaps down. Level 1: the arrow switch blade snaps into its contact. **Something moves at once** (UX item 5).
- 0.00 to 0.08: the **signal**: a white pulse (radius 4, glow 10) runs along the copper core from `startX(r)` to `finishX(r)` (x = startX + (finishX − startX) · rt / 0.08).
- 0.08: the finish lamp lights (`PAL.yellow`, glow 18; level 4 by `lampState`, below). From 0.08 to 1.20 s the hand-drawn label `signal 3 × 10⁸ m/s` (11 px, white, alpha falling from 1 to 0 over the last 0.4 s) sits at (315, 184). Do not use `A.float` for it: the engine draws floaters at 20 px.
- 0.10 onward: Zip's dot moves along the core; Shelly glides along her lane. In the lens the ion rows scroll by `−(zipX − startX(r)) · 0.5` px (wrapped modulo 18), so they stream past Zip the other way from his drift.

Positions by outcome (all **fixed**, never in proportion to the error; `c(x) = clamp(x, 0, 1)`). Zip's track x is `startX + p · (finishX − startX)`, except in a backward miss:

| Outcome | Shelly's p | Zip | Crossing | Verdict (`delay`) |
|---|---|---|---|---|
| win, dim, blown | `c((rt − 0.1) / 1.5)` | p the same as Shelly's | both at 1.60 | 1.65 |
| slow | `c((rt − 0.1) / 1.5)` | p = `0.6 · c((rt − 0.1) / 1.5)` | Shelly at 1.60 | 1.65 |
| fast | `0.6 · c((rt − 0.1) / 0.9)`, then she stops | p = `c((rt − 0.1) / 0.9)` | Zip at 1.00 | 1.05 |
| backward | `0.25 · c((rt − 0.1) / 0.5)`, then she stops and stares | x = `startX + (capX(r) − startX) · c((rt − 0.1) / 0.5)` (he reaches the end cap behind the start) | none; bonk at 0.60 | 0.65 |

- At the crossing: the camera flash, a white rectangle from `finishX(r) − 60` to `finishX(r) + 60`, y 150 to 262, alpha 0.45 falling to 0 over 0.15 s, once (UX item 10). Skip it when `calm` is set (6.4 item 9).
- During the take, hide Zip's `Zip` label and the chosen reel's value label (they are drawn only in the play phase), so nothing moving runs over a label.
- Backward: at 0.60 a `BONK` floater at (capX(r), 222), three dizzy stars on Zip, and `A.shake(5)`.
- Level 4 lamp: from 0.08, `'ok'` glows full; `'dim'` glows at a fixed alpha 0.3 with the word `dim` (11 px) beside the bulb; `'blown'` flares to white (0.08 to 0.25), then pops at 0.30 (four glass shards, a `POP` floater at (lamp x, 140)) and stays dark.
- At the verdict the **photo frame** slides down into `FRAME` over 0.25 s (from y = −92 to 54), with sprocket holes on both sides:
  - win: Zip and Shelly nose to nose, green border, `DEAD HEAT · RECORD!`;
  - slow: Shelly alone, red border, `SHELLY ALONE · NO RECORD`;
  - fast: Zip alone, red border, `ZIP RAN AWAY`;
  - backward: an empty lane, red border, `WRONG WAY`;
  - dim: a black frame, red border, `TOO DARK TO JUDGE`;
  - blown: a black frame, red border, `NO LIGHT`.
  - The caption is 12 px bold white at (320, 138), inside the frame.
- Then the reactions of section 4, until 2.35 s. On a win, 30 confetti pieces fall from the bunting (none when `calm`): piece j is a 4 × 6 rectangle at `x = 20 + (j * 97) % 600`, `y = 44 + 150 · u + 12 · sin(5u + j)`, where u is seconds since the verdict, coloured `PAL.pink`, `PAL.yellow`, `PAL.cyan` or `PAL.green` by `j % 4`.
- `delay: (r, v) => verdictDelay(r, v)`.

### 6.4 UX checklist (README items 1 to 10, with coordinates)

1. **Goal line on the canvas.** At round start, at (320, 20), 13 px bold, `PAL.white`, centred:
   - L1: `` `Pace Shelly: ${count(r)} e⁻ every ${r.t} s` ``
   - L2: `` `Tie Shelly: ${r.len} cm in ${mmss(r.T)}` ``
   - L3: `` `Tie Shelly: lamp lit at ${r.tau} ns · record ${mmss(r.T)}` ``
   - L4: `` `Tie Shelly at ${r.v} mm/s · lamp needs ${r.lamp} A` ``

   The round banner `HEAT 1` / `SEMI-FINAL` / `GRAND FINAL` sits at (12, 20), 11 px, `PAL.yellow`, left-aligned. These goal lines are at most 51 characters (checked), so they fit between x 120 and 520. The given facts on the scene are, besides the goal line: the wire label (L2: `` `wire ${r.a} mm²` ``), the track label (L4: `` `track ${cm(r.L)}` ``), both at (315, 196), 11 px, white, between the START and FINISH labels; and the battery's current (L3: `` `${r.i} A` `` at (73, 308)). No scene shows more than 3 numbers besides the player's own settings.
2. **The player's own setting beside its handle**, with its unit (12 px bold, `PAL.yellow`, on a dark backing rectangle `#0b1030` 4 px wider than the text on each side):
   - throttle (L1, L2): `` `${v.i} A` `` centred at (handle x, 302);
   - throttle (L4): `` `${v.mv} mV` `` at (handle x + 26, 334), left-aligned; when the handle x is above 480, at (handle x − 26, 334), right-aligned;
   - arrow switch (L1): `` `current ${v.dir ? '←' : '→'}` `` centred at (44, 262);
   - spool: `` `${v.a} mm²` `` centred at (slotX(v.a), 292) in L3 and at (slotX(v.a), 264) in L4.
3. **Handles.** Every handle has `radius: 20` and draws a grip: a filled disc (r 14, `#2b3566`) with a 2 px white ring and an arrow glyph (14 px, white): `⇔` on the throttle, the spools and the arrow switch (on the switch the grip sits on the blade's tip). The engine draws the pulse ring and its full-alpha highlight while dragged. In **level 1 round 1 only**, a `drag ⇔` cue (12 px, `PAL.yellow`) bobs above the throttle handle at y `286 + 3·sin(4t)` until `v.i` first differs from its start; keep a `touched` flag in the level closure.
4. **Legibility.** Every scene string is 11 px or more. Labels never cover Zip, Shelly or each other: Shelly's lane is y 200 to 232 and the tube y 235 to 251; the scene labels sit at y 198 and above or y 258 and below, at the positions listed here. Zip's `Zip` label (11 px) is at (Zip's x, 264) and is drawn only before the take. Colour is never the only cue: the lamp states also say `dim` or `POP`, the outcome frames carry words, and the chosen spool shows its number.
5. **Instant answer to Fire**: see 6.3 (flag, visor and switch move at rt 0). The verdict lands at the crossing or the bonk. A win plays the engine's `ok` sound with confetti and a green frame; a miss plays `bad` with a red frame and no confetti.
6. **Teaching.** `winText` is the short working (section 5.4); the engine shows it under the canvas. Miss texts say what to change ("Raise the current", "Pick a thinner wire").
7. **A living hero**: Zip jitters, blinks and glances all the time, snaps his visor at Fire and shows a mood after every result (section 4). Shelly and the Marshal idle too, so the screen is never still.
8. **Rounds look different**: morning, rain and dusk skies, a growing crowd, and the boss round's fairy lights, trophy and `GRAND FINAL` banner (6.1).
9. **Accessibility**: every dial and button has the `aria` text in section 7. The sliders are native range inputs (keyboard works). The scene ARIA is the `ARIA` string in section 7. Compute `const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;` once at mount; when `calm` is true, skip the camera flash, the confetti and the rain, and freeze Zip's jitter to 0. `A.shake` already respects the setting.
10. **Comfort**: the only full-scene-ish flash is the camera flash (alpha ≤ 0.45, 0.15 s, once). Nothing flashes faster than 3 times a second: the fairy lights breathe over 4 s, and the board does not blink.

### 6.5 Draw order (each frame)

1. Sky and its round dressing (moon, rain or fairy lights and trophy), bunting.
2. Crowd.
3. Photo frame (only after the verdict; it slides over the crowd, under the lens).
4. Table top and front edge, chalk lane, START and FINISH, the given-fact labels (wire or track at (315, 196)).
5. Lamp post and lamp, camera.
6. The lens arm, then Shelly and her trail (so she passes in front of the arm), then the tube, the copper core, the signal pulse and Zip's dot.
7. The Zoom Lens window (ions and Zip).
8. Battery, feeder (L3), cables, arrow switch (L1).
9. Spool rack (L3, L4) and throttle rail (L1, L2, L4) with their handles' grips and the player's value labels.
10. Marshal, pace board, goal line and round banner.
11. Take effects: the `signal` label, the camera flash, confetti.

### 6.6 What must never show

- Zip never drifts before Fire: before the take he only jitters in place, in the lens and on the track.
- The finish lamp is dark before Fire. The drift direction is never drawn before Fire, except by the round 1 pace board (the electron arrow in its live text).
- No race position, lamp brightness or frame depends on the size of the player's error: only the fixed values of 6.3.
- The stopwatch in the Marshal's hand has no digits. No time is drawn for Zip.
- `hit` is the fixed point `[320, 170]` in every level.

## 7. Controls and mount

Write one function `level(n: 1 | 2 | 3 | 4, random)` returning `DialLevel<Round>`, which builds `rounds = buildRounds(n, random)` first, as in `capacitor-bench/index.ts`.

| Level | dials | handles |
|---|---|---|
| 1 | `{ key: 'i', aria: 'Race current in amperes', label: 'Current', unit: 'A', ...DIAL.i1 }` and `{ key: 'dir', aria: 'Current arrow: 0 points left to right, 1 points right to left', label: 'Current arrow', unit: '', ...DIAL.dir, text: (x) => (x ? '← right to left' : '→ left to right') }` | the throttle `rail('i', DIAL.i1)` and the arrow switch: `{ dial: 'dir', at: (_r, v) => [SWITCH.x + (v.dir ? -SWITCH.len : SWITCH.len), SWITCH.y], drag: (_r, px) => (px < SWITCH.x ? 1 : 0), radius: 20 }` |
| 2 | `{ key: 'i', aria: 'Race current in amperes', label: 'Current', unit: 'A', ...DIAL.i2 }` | `rail('i', DIAL.i2)` |
| 3 | `{ key: 'a', aria: 'Race wire cross-section in square millimetres', label: 'Race wire', unit: 'mm²', ...DIAL.a }` | `spool(RACK3)` |
| 4 | `{ key: 'mv', aria: 'Voltage across the track wire in millivolts', label: 'Voltage', unit: 'mV', ...DIAL.mv }` and the level 3 `a` dial | `rail('mv', DIAL.mv)` and `spool(RACK4)` |

- `rail(key, d)` returns `{ dial: key, at: (_r, v) => [RAIL.x0 + ((v[key] - d.min) / (d.max - d.min)) * (RAIL.x1 - RAIL.x0), RAIL.y], drag: (_r, px) => d.min + ((px - RAIL.x0) / (RAIL.x1 - RAIL.x0)) * (d.max - d.min), radius: 20 }`. Draw the rail (3 px, `PAL.dim`) from `RAIL.x0` to `RAIL.x1`, with its end values (`d.min` and `d.max`, 11 px, `PAL.dim`) centred at RAIL.x0 and RAIL.x1, baseline 338.
- `spool(rack)` returns `{ dial: 'a', at: (_r, v) => [slotX(v.a), rack.y + rack.h / 2], drag: (_r, px) => 0.25 * (Math.floor((px - rack.x0) / rack.w) + 1), radius: 20 }`.
- The slider snaps every value to its step and clamps it to the range, so the handles may return any number.
- Common: `hero: { name: 'Zip', role: ROLE, ...HEROES[n - 1] }`, `charges: [1, 1, 0]`.
- `test: { button: '⏱ Pace check', aria: 'Pace check: read the pace board for this setting', read: (r, v) => { flash.paid(); return meterText(r, v); } }`.
- `fire: { button: '🏁 Drop the flag', aria: 'Drop the flag and start the heat' }`.
- `judge`, `miss: missText`, `win: winText`, `hint: hintText`, `hit: () => [320, 170]`, `delay: (r, v) => verdictDelay(r, v)`, `draw`.
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(4, ctx.level)) as 1 | 2 | 3 | 4; return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA); } })`.
- `ARIA = 'A snail race at a fair: a racing snail on a chalk lane beside a copper wire in a glass tube, a magnifier showing a free electron inside the wire, a race battery at one end and a finish lamp at the other.'`
- `ROLE = 'a free electron in a copper wire, hired to pace the champion racing snail'`, and `HEROES` holds the four story and objective pairs of section 4, copied exactly.

## 8. game.json (copy exactly)

Copy `docs/curriculum/gap-designs/rebuilds/json/drift-lab.json` over the existing `game.json`. Its lengths were checked on 2026-10-31 (`scratchpad/rebuild-checks/ch03/json-final-check.mjs`): title 16, summary 126, learningOutcome 170 (curly apostrophes only), adds at most 144, hints at most 95, 6 concepts, 4 misconceptions; the title and summary are unique against every game.json in `src/games` and `rebuilds/json`. It keeps `order: 1` and `ncertRef: "Section 3.5, Drift of electrons and the origin of resistivity"`. Every old concept is kept: "Current as charge per second" is now "Current as charge per second, I = Q/t", "Speed of the signal versus drift" is now "The drift is slow, the signal is fast", and "Mobility" is now "Mobility, v_d = μE"; "A thinner wire drifts faster" is new (it was in the old level 3).

## 9. Tests

### 9.1 `logic.test.ts`

1. **Pools** (every row):
   - gate: `1.6 * r.e19 / r.t` equals `r.i` (to 1e-9); `r.dir === (r.heading === 'right' ? 1 : 0)`; each pool has both headings.
   - crawl: `K * r.a * (10 * r.len / r.T)` equals `r.i` (to 1e-9), and the pace is between 0.4 and 2.8 mm/s.
   - thick: `r.i / (K * (300 * r.tau / r.T))` equals `r.a` (to 1e-9).
   - mob: `1000 * r.v * r.L / r.mu` equals `r.V` (to 1e-9); `Number((K * r.a * r.v).toPrecision(3))` equals `r.lamp`; the dial area nearest to `r.lamp / (K * r.v)` is `r.a`.
   - `K` equals `N_CU * E_CHARGE * 1e-9` to 1e-9.
2. **One winner**: scan every reachable setting (L1: i 0.5 to 12 by 0.5 × dir 0 and 1; L2: i 0.5 to 20; L3: a 0.25 to 4; L4: mv 10 to 300 by 10 × a 0.25 to 4). Only the answer passes `judge`, and the start setting fails.
3. **Rounds never share an answer**: for each level, the answer sets of pools 0, 1 and 2 are disjoint (L1 by `i`, L2 by `i`, L3 by `a`, L4 by `V` and by `a + '/' + V`).
4. **Rounds**: 80 seeds `Array.from({ length: 80 }, (_, i) => i * 7919 + 13)`. Every level has 3 rounds of its kind, `assist` is `[0, 1, 2]`, and round k's row comes from pool k.
5. **Faults**: L1 the right current with the wrong arrow gives `backward`; `i ± 0.5` gives `fast`/`slow`. L3 `a + 0.25` gives `slow` and `a − 0.25` gives `fast`. L4 `mv ± 10` gives `fast`/`slow`; the right mv with `a ± 0.25` gives `blown`/`dim`. `lampState` is `'ok'` exactly when `x.a * x.mv === r.a * r.V`. For every setting, a `slow` fault means `pace` (or `paceMob`) is below Shelly's pace, so the scene and the judge agree.
6. **Delays**: `verdictDelay` is 0.65 for backward, 1.05 for fast, 1.65 otherwise; all below 2.4.
7. **Words**: for every row and every wrong setting, `missText` never contains the answer token: `` `${r.i} A` `` (L1, L2), `` `${r.a} mm²` `` (L3, and L4 when the player's a differs), `` `${r.V} mV` `` (L4 when the player's mv differs), and in L1 never the right arrow word when the player's arrow is wrong. Use regexes with a leading `(^|[^0-9.])`. `winText` contains `I = Q/t` (gate), `neAv_d` (crawl, mob), `3 × 10⁸` (thick) and `μE` (mob). Every miss text ends with a "what to change" sentence (`Raise`, `Lower`, `Pick`, or the arrow sentence), optionally followed by the lamp clause.

### 9.2 `tests/drift-lab-ui.test.ts`

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch03-current-electricity/drift-lab/index';
import { buildRounds, type Round } from '../src/games/physics/class-12/ch03-current-electricity/drift-lab/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'drift-lab', 4);
const build = (level: number, seed: number) => buildRounds(level as 1 | 2 | 3 | 4, createRng(seed));
const FIRE = 'Drop the flag and start the heat';
function set(r: Round, right: boolean) {
  if (r.kind === 'gate') { h.setSlider(r.i, 0); h.setSlider(right ? r.dir : 1 - r.dir, 1); }
  if (r.kind === 'crawl') h.setSlider(right ? r.i : r.i + 0.5);
  if (r.kind === 'thick') h.setSlider(right ? r.a : r.a + 0.25);
  if (r.kind === 'mob') { h.setSlider(right ? r.V : r.V + 10, 0); h.setSlider(r.a, 1); }
}
shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => set(g[k], true),
  setWrong: (g, k) => set(g[k], false),
  commit: () => h.click(FIRE),
});
```

Then `describe('The Slowest Race', …)`:
- Level 1 has two sliders, `Current` (0.5 to 12, step 0.5, starts 0.5) and `Current arrow` (0 to 1, starts 0). Level 3's slider runs 0.25 to 4 and starts at 4. Level 4 has `Voltage` (10 to 300, starts 10) and `Race wire`.
- Level 1 with the wrong arrow gives a miss containing `backwards`, and the hearts drop to 2 at 0.65 s (3 hearts at 0.55 s).
- A fast miss lands at 1.05 s (3 hearts at 0.95 s, 2 at 1.10 s). A slow miss lands at 1.65 s (3 hearts at 1.55 s, 2 at 1.70 s).
- A pace check costs a charge (`/Pace check/`, then `/No charges left/`).
- A win's feedback starts with `Record!` in level 1 and `Dead heat` in levels 2 to 4.
- **Canvas recorder** (copy the `recorder` and `frame` pattern from `tests/capacitor-bench-ui.test.ts`, or use `canvasRecorder` from `tests/helpers/canvas-rec.ts`):
  - The goal line is drawn in the first frame of every round (a string containing `Shelly`).
  - The player's own setting label is drawn (L1 `` `${value} A` ``).
  - The pace board's live text (`mm/s` in levels 2 to 4, `e⁻/s` in level 1) is drawn in round 1; in round 2 only within 1.5 s after a pace check; never in round 3 before a win; and never during or after a miss in rounds 2 and 3.
  - No drawn string ever contains the round's answer token (`` `${r.i} A` `` in L2, `` `${r.a} mm²` `` in L3) unless the player's own setting equals it.
- The level 1 round 1 `drag ⇔` cue is drawn before the throttle moves and not after `h.setSlider(1)`.

## 10. Traps to avoid

- **Fixed positions**: on a miss Zip and Shelly stop at the fixed 0.6, never at a fraction computed from the player's current.
- **No drift before Fire**: the lens must not show Zip creeping one way while the player turns the dials; that would give away the direction in level 1.
- **Direction words**: `dir = 1` means the *current arrow* points right to left, which makes the *electrons* drift left to right. The pace board shows the electron arrow; the dial shows the current arrow. Do not mix them up.
- **Level 1 heats that run right to left** swap the START and FINISH labels, Shelly's facing, the lamp's end (`lampAt`, x 66), the camera's end (`cameraAt`, x 92) and the end cap a backward Zip hits (`capX`, x 554). Zip starts at x 540. The battery and the arrow switch stay on the left.
- **Backward Zip stays inside the tube**: he stops at `capX(r)`, never past the tube's end.
- **Level 4 lamp**: use the exact product comparison of `lampState`, never a floating current comparison.
- **Units**: millivolts on the dial, volts in E; mm² and mm/s give amperes through `K = 13.6`.
- **Helper**: use `helperOn` and `paidFlash` from `@core/aidflash` with `missed ? Infinity : since` (6.2); never draw the live text after a miss in rounds 2 and 3 (the audit's `live = assist === 0 || shot !== null` bug).
- **Floaters are 20 px**: the engine draws every `A.float` at 20 px bold. Keep long labels (the `signal` label, the frame captions) as hand-drawn text.
- **Timing**: everything ends by 2.4 s; the latest verdict is 1.65 s.
- **Docs**: do not edit `docs/curriculum/physics-class-12/ch03-concept-weights.md`; the reviewer updates it after the build.
