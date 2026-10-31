# ch12 · Bohr Orbits rebuilt as "Snap the Electron" (Physics Ch 12, §12.4 and 12.6)

Read `../README.md` first, especially "A miss must not show the answer either", "Helpers fade" and the UX checklist, and `README.md` in this folder (the rules for a rebuild). Everything below is required unless marked "optional". If something here cannot work, stop and report it; do not improvise.

The owner asked: "Make Bohr orbit interesting." The old game is three bare dials (ring radius, speed plus lap time, log of n) whose levels 2 and 3 are the same on every play. This brief **replaces the whole game**. It keeps the id, the folder, `order: 1` and every concept, and adds one Bohr-model item from the 2026-27 book: de Broglie's picture that orbit n holds exactly n matter waves, 2πrₙ = nλ (§12.6, Eq. 12.12, Fig. 12.8).

## 1. Identity

| Field | Value |
|---|---|
| Game id | `bohr-orbits` (unchanged) |
| Folder | `src/games/physics/class-12/ch12-atoms/bohr-orbits/` (existing) |
| Files | **Replace** `game.json` with `docs/curriculum/gap-designs/rebuilds/json/bohr-orbits.json` (copy exactly). **Delete and rewrite** `logic.ts`, `logic.test.ts` and `index.ts`. **Add** `art.ts`. |
| UI test | **Delete** `tests/bohr-ui.test.ts`. **Create** `tests/bohr-orbits-ui.test.ts` (the name is free on 2026-10-31; check again). |
| Old tests | The leak-fix tests now in `logic.test.ts` and `tests/bohr-ui.test.ts` (fixed hit point, helper fading, "two wrong rings give the same scene", "a miss text never holds a number") are **replaced** by the tests in section 9. Do not keep or port the old ones: they test functions (`ringRounds`, `lapRounds`, `bigRounds`, `HIT.ring` …) that no longer exist. |
| Engine | `mountDialLevel` from `@core/dialgame`, one `DialLevel<Round>` per level (4 levels), `helperOn` and `paidFlash` from `@core/aidflash` |
| Book coverage | §12.4 (Bohr's postulates, rₙ = n²a₀, L = nh/2π), Example 12.3 (a₀ = 5.3 × 10⁻¹¹ m, v = 2.2 × 10⁶ m/s), Ex 12.6 (speeds and periods for n = 1, 2, 3), Ex 12.7 (r₂, r₃), Ex 12.9 (the Earth's quantum number), §12.6 (2πrₙ = nλ) |
| Inspiration (code comment only) | A creature-photography rail game (photograph elusive creatures for an album), duck-hunt style "lead the target" shooting for levels 2 and 3, and the "powers of ten" zoom film for level 4 |
| Core verb | **Frame the shot and fire the flash**: size a ring flash around the atom (level 1), park a camera on the orbit where the electron *will be* (levels 2 and 3), zoom a scope by powers of ten (level 4). Then fire, and the photo shows what really happened. |

The other chapter 12 games: Energy Ladder dials a photon's wavelength or a beam's energy and fires it at the atom; Rutherford Range dials an α-particle's energy or the nuclear charge and fires it. This game fires nothing at the atom: it **predicts where the target will be and photographs it**. It does not teach energy levels, transitions, spectral lines, K = −E or closest approach.

Only `tests/bohr-ui.test.ts` imports the old `logic.ts`. Check with a search for `bohr-orbits/logic` before deleting it, and delete only the files named above.

## 2. What the student learns

- In Bohr's model the electron may circle the proton only on orbits of radius rₙ = n²a₀, with a₀ = 0.53 Å (Example 12.3, Ex 12.7). Level 3 is 9a₀, not 3a₀. The "k-th excited state" is level n = k + 1.
- De Broglie's reason (§12.6): orbit n holds exactly n matter waves, 2πrₙ = nλ. A ring between the allowed orbits holds a broken number of waves, so no standing wave closes there.
- On level n the speed is vₙ = v₁/n (v₁ = 2.19 × 10⁶ m/s): higher levels are slower. One lap takes T = 2πr/v (Ex 12.6).
- Because r grows as n² and v falls as 1/n, the period grows as n³: a lap on level 2 lasts 8 ground-orbit laps, on level 3 it lasts 27 (Ex 12.6).
- Bohr's rule mvr = nħ holds for any orbit. For a moon or a planet n = mvr/ħ has dozens of zeros (the Earth: 2.6 × 10⁷⁴, Ex 12.9), so its steps of ħ can never be noticed.

## 3. The mechanic, physically

**Kiran** is a laser physicist on a space station. A single hydrogen atom floats in her vacuum cell, and her **attosecond flash camera** (real flashes this short exist; their inventors won the 2023 Nobel Prize in Physics) is shown on a big monitor, the **ATOM CAM**. In Bohr's picture the electron circles the proton like a tiny planet, far too fast to see. The only way to see it is to fire a flash exactly where it is: the photo then freezes it.

The electron is **never drawn** before a winning photo. During play the atom shows only the proton, a fixed haze (level 1) or a fixed blurred band on the known orbit (levels 2 and 3).

| Level | The player sets | What decides the photo |
|---|---|---|
| 1 Ring flash | the radius of a ring-shaped flash, in steps of a₀ | The electron is on level n (given three ways), so the ring must be n²a₀. |
| 2 Camera trap | the camera's angle on the known orbit, clockwise from the gate, in 15° steps | A gate clicks as the electron passes the top; the flash fires Δt later. The electron has gone Δt/T laps, T = 2πrₙ/vₙ. |
| 3 Twin atoms | the camera's angle on atom B's orbit | Both electrons leave their gates together. When A has lapped k times, B has lapped k(n_A/n_B)³ times (T ∝ n³). |
| 4 Powers of ten | the zoom of the "Bohr scope", a power of ten | The orbit of a ball, satellite, moon or planet holds n = mvr/ħ matter waves. A zoom of ×10ᶻ leaves n/10ᶻ waves in the window; they can be counted only if 1 ≤ n/10ᶻ < 10, i.e. z = ⌊log₁₀ n⌋. |

Physical consequences (each miss shows what the player's own setting did, and only its direction):
- **Level 1, empty ring**: the ring flash lights empty space. A faint streak of the passing electron shows for a moment just **inside** the ring (ring too wide) or just **outside** it (too small), always 12 px from the ring and always on the same 40° arc, whatever the error.
- **Levels 2 and 3, empty spot**: the camera's flash lights an empty stretch of orbit. A fading comet trail shows just **ahead** of the camera (the electron had already passed) or a faint glow just **behind** it (it had not arrived), always 35° long, whatever the error.
- **Level 4, too little zoom**: the window shows a fixed grey blur of fine lines ("too many to count"). **Too much zoom**: the window shows a fixed gentle curve, 0.3 of one wave ("less than one wave").
- **A win**: the electron appears frozen in the flash, with a viewfinder around it, its standing wave glows round the orbit (levels 1 to 3), or the window shows the true number of waves (level 4).

## 4. Story and characters

Hero banner: `name: 'Kiran'`, `role: 'a laser physicist on a space station who photographs the electron of a hydrogen atom with attosecond flashes'`. (Kiran means "ray of light". The name is not used by any other game; Noor, Mira, Zara, Zip and Gopal are taken by other rebuilds.)

| Level | story | objective |
|---|---|---|
| 1 | `A single hydrogen atom floats in Kiran’s vacuum cell. In Bohr’s picture its electron circles the proton like a tiny planet, but only on orbits of radius rₙ = n²a₀, where a₀ = 0.53 Å is the ground orbit. It moves far too fast to see, so Kiran’s camera fires a ring of light a few hundred attoseconds long: the photo catches the electron only if the ring lies on its orbit. (Flashes this short are real; their inventors won the 2023 Nobel Prize in Physics.)` | `Size the ring flash to the electron’s orbit and photograph it, in three rounds.` |
| 2 | `Now Kiran wants a sharp spot photo. On level n the electron moves at vₙ = v₁/n, with v₁ = 2.19 × 10⁶ m/s, round a circle of radius n²a₀, so one lap takes T = 2πr/v. It circles clockwise. A gate at the top clicks as it passes, and the camera fires a set time later at the spot where Kiran parked it.` | `Park the camera where the electron will be when the flash fires, in three rounds.` |
| 3 | `Two hydrogen atoms float side by side: A on a low level, B on a higher one. The radius grows as n² and the speed falls as 1/n, so a lap takes n³ times as long as on the ground orbit. Kiran’s pump flash starts both electrons from their gates together, and she uses the fast atom A as a clock: when A has lapped a set number of times, the camera fires at B.` | `Park the camera on B’s orbit where its electron will be, in three rounds.` |
| 4 | `From the station’s window Kiran looks at bigger orbits. Bohr’s rule mvr = nħ, with ħ = 1.055 × 10⁻³⁴ J s, holds for any orbit, and in de Broglie’s picture the orbit holds exactly n matter waves. Her Bohr scope is a thought experiment: it zooms in by powers of ten until the waves can be counted, at least one and fewer than ten in its window. No real lens could do this, which is why nobody ever sees a planet’s orbit come in steps.` | `Zoom the scope until the waves in its window can be counted, in three rounds.` |

Characters (each in its own function in `art.ts`, AGENTS.md item 17):

- **Kiran** (hero) floats at the camera console on the left (hips at `KIRAN.hip` = (78, 236), head top near y = 172, feet near (44, 284); about 115 px tall). `kiran(g, t, s: KiranState)` with `KiranState = { mood: 'happy' | 'focus' | 'cheer' | 'worried'; goggles: boolean; press: number; spin: number; sweat: number; facepalm: boolean; thumbsUp: boolean }`.
  - Gear: a navy-blue station polo (`#26357a`) with a white V collar and a round mission patch on the left shoulder (radius 4, `PAL.yellow` outline, a dot with a ring inside); khaki cargo trousers (`#b59b6b`); grey socks (no shoes in the station); a lanyard with a white ID badge (7 × 9) that floats out from her chest; dark hair (`#2a1a12`) in a bun with a yellow pencil stuck through it, and three loose strands that drift; a headset with one ear cup and a boom mic; orange laser-safety goggles (`rgba(255,155,61,0.8)`, a 22 × 7 band) pushed up on her forehead.
  - Pose: floating, the body tilted 8° forward, knees bent, both feet hooked under a yellow foot loop on top of the console (the loop is drawn with the console at (42, 290)). Her right hand rests on the console's big button; her left hand holds the yellow handrail above (hand at (44, 132)).
  - Idle: the whole body bobs `3·sin(1.2t)` px and sways ±2°; the hair strands drift (`sin(1.6t + i)`); the badge swings `0.2·sin(2t)` rad; she blinks (from `face`); every 5 s she glances at the porthole for 0.6 s (eyes shift 2 px left). A pen floats beside her head at `(126 + 6·sin(0.6t), 176 + 6·cos(0.6t))`, turning slowly (a 12 px `PAL.orange` line with a white tip).
  - While the player is setting a dial (the dial value changed in the last 0.5 s): mood `'focus'`, drawn by hand (two short horizontal lines for squinting eyes and a flat mouth).
  - Action (on fire, rt = 0): the goggles snap down over her eyes (drawn after the face so they cover it); `press` goes 0 → 1 over 0.12 s and back to 0 by 0.4 s (the button moves down 3 px and glows white); a floater `FLASH!` (levels 1 to 3) or `ZOOM!` (level 4) appears at (96, 268) in `PAL.white`.
  - Win: mood `'cheer'` and a somersault in free fall: `spin = 2π·ease((rt − REVEAL)/0.9)` about her hips, from the reveal for 0.9 s. With reduced motion, no somersault: `thumbsUp` instead (her left hand leaves the rail and shows a fist with a raised thumb by her shoulder).
  - Miss: mood `'worried'`, and a cyan sweat drop that floats **up** (no gravity): it starts at her temple and rises 20 px over 1 s, then fades (`sweat` = seconds since the verdict, −1 for none). Her left hand goes to her forehead (`facepalm`).
- **Pico** (NPC), a small floating camera robot of the station, at `PICO` = (142, 100), right of the porthole and above the handrail. `pico(g, t, s: { mood: 'idle' | 'busy' | 'happy' | 'sad'; look: [number, number] })`.
  - Body: a sphere of radius 12 (`#d9def2`, outline `PAL.dim`) with a darker band round the middle, two side fan grilles (circles of radius 3 at ±12 px with three short lines each) and a top LED (radius 2).
  - Eye: a camera lens (radius 5, fill `#101830`, ring `PAL.cyan`) shifted 2 px toward `look` (the ATOM CAM centre (400, 186) in levels 1 to 3, the wave window centre (400, 234) in level 4), with a white glint.
  - Idle: bobs `2·sin(1.7t)` px; green LED.
  - Busy (during a take): the LED blinks amber at 2 Hz (on 0.25 s, off 0.25 s; never faster than 3 Hz).
  - Happy (win): the lens circles once round the body in 0.6 s, Pico rises 4 px, a pink `♥` (12 px) shows above it and a floater `BEEP!` (once, at (142, 84), `PAL.pink`).
  - Sad (miss): the lens droops 3 px down and a `?` (12 px, `PAL.dim`) shows above it.
- **The electron** (the target): `electron(g, x, y, t, since)`, drawn **only** in a winning photo (levels 1 to 3), where `since` is the seconds since the reveal.
  - A glowing sphere of radius 8 (`PAL.cyan` with a white core), a `−` badge (11 px, white) at its upper right, and three short motion arcs behind it along the orbit (alpha 0.4), the frozen blur of its speed.
  - For `since < 0.3` it is surprised by the flash: wide eyes (white circles of radius 2.5 with dark pupils) and a small round mouth. After that it grins and winks: `face(…, 'cheer')` with one eye drawn as a short line.
- **The proton**: `proton(g, x, y, R, t, mood: 'sleepy' | 'smile' | 'yawn')`, radius 12 (10 in level 3), `PAL.red` with a breathing glow (`shadowBlur 10 + 4·sin(2t)`), a `+` badge (11 px, white) at its upper right, and a face: sleepy half-closed eyes (short arcs) and a small mouth while waiting, `'smile'` on a win, `'yawn'` (a round open mouth) from rt 0.9 to 1.5 after a miss.
- **The orbiting body** (level 4 target): drawn per row (section 6.6) with a small face (`face(g, x, y, R, mood, t)`, R at least 7): `'happy'` while waiting, `'cheer'` with four little white sparkle stars round it on a win, `'worried'` on a miss.

## 5. Rules (`logic.ts`)

### 5.1 Constants and types

```ts
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick, shuffle } from '@core/quiz';

export const A0 = 0.53;                                  // Å, the ground orbit a₀ (Example 12.3)
export const V1 = 2.19e6;                                // m/s, the ground-orbit speed (Ex 12.6)
export const HBAR = 1.055e-34;                           // J s
export const T1 = (2 * Math.PI * A0 * 1e-10) / V1;       // s, one ground-orbit lap: 1.52 × 10⁻¹⁶ s
export const radius = (n: number) => A0 * n * n;         // Å
export const speed = (n: number) => V1 / n;              // m/s
export const period = (n: number) => T1 * n ** 3;        // s, the same as 2π·radius(n)·1e-10 / speed(n)
export const ringA = (k: number) => (53 * k) / 100;      // Å, the ring flash at k steps of a₀
/** Matter waves round a circular orbit of radius k·a₀ with the speed such an orbit has: 2πr/λ = √(r/a₀) (§12.6). */
export const waves = (k: number) => Math.sqrt(k);

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
/** An integer exponent in superscript, with a true minus sign: sup(74) = '⁷⁴', sup(-15) = '⁻¹⁵'. */
export const sup = (e: number) => `${e < 0 ? '⁻' : ''}${[...String(Math.abs(e))].map((c) => SUP[Number(c)]).join('')}`;
/** Two significant figures, the book's style: 0.16, 2.0, 0.50, 3.0 × 10³, 6.0 × 10²⁴. */
export function sci(x: number): string {
  const e = Math.floor(Math.log10(Math.abs(x)) + 1e-9);
  if (e >= -1 && e <= 1) return x.toFixed(e === 1 ? 0 : e === 0 ? 1 : 2);
  return `${(x / 10 ** e).toFixed(1)} × 10${sup(e)}`;
}

export const DIAL = {
  k: { min: 1, max: 30, step: 1, start: 6 },      // level 1: the ring flash in steps of a₀ (0.53 Å to 15.9 Å)
  deg: { min: 0, max: 345, step: 15, start: 0 },  // levels 2 and 3: degrees clockwise from the gate
  z: { min: 0, max: 90, step: 1, start: 0 },      // level 4: the zoom ×10ᶻ
};
export const HANDLE_R = 20;                       // every drag handle (UX: at least 18)

export type Say = 'level' | 'excited' | 'waves';
export interface TrapRow { n: number; laps: number; deg: number; dt: number }      // dt in s; answer deg
export interface TwinRow { na: number; nb: number; k: number; deg: number }        // answer deg (on B)
export type Scene = 'cabin' | 'earth' | 'planet' | 'sun';
export interface ZoomRow { id: string; name: string; short: string; around: string; scene: Scene; m: number; v: number; r: number; b: number } // answer b
type Assist = 0 | 1 | 2;
export type Round =
  | { kind: 'ring'; n: number; say: Say; assist: Assist }
  | ({ kind: 'trap'; assist: Assist } & TrapRow)
  | ({ kind: 'twin'; assist: Assist } & TwinRow)
  | ({ kind: 'zoom'; assist: Assist } & ZoomRow);
export type Values = { k?: number; deg?: number; z?: number };
```

### 5.2 The pools (copy exactly)

Every row was checked by script on 2026-10-31 (`rebuild-checks/ch12/bohr-check.mjs` in the session scratchpad). The checks are listed in section 9.1 and must be in `logic.test.ts`.

Level 1 has no table: `buildRounds` draws three different levels from 2, 3, 4, 5, sorted upward, and states them three ways (section 5.3).

```ts
// Level 2. laps = whole laps done before the flash; deg = the angle of the electron at the flash (the answer).
// dt is shown to 3 significant figures and solves back to the angle within 5° for v₁ = 2.18, 2.19 or 2.2 × 10⁶ m/s,
// a₀ = 0.529 or 0.53 Å, or T₁ = 1.52 × 10⁻¹⁶ s; the dial step is 15°.
export const TRAP: TrapRow[][] = [
  [
    { n: 1, laps: 0, deg: 90, dt: 3.8e-17 }, { n: 1, laps: 0, deg: 120, dt: 5.07e-17 }, { n: 1, laps: 0, deg: 270, dt: 1.14e-16 },
    { n: 2, laps: 0, deg: 90, dt: 3.04e-16 }, { n: 2, laps: 0, deg: 180, dt: 6.08e-16 }, { n: 2, laps: 0, deg: 270, dt: 9.12e-16 },
  ],
  [
    { n: 2, laps: 1, deg: 60, dt: 1.42e-15 }, { n: 2, laps: 0, deg: 210, dt: 7.1e-16 }, { n: 2, laps: 1, deg: 300, dt: 2.23e-15 },
    { n: 3, laps: 0, deg: 150, dt: 1.71e-15 }, { n: 3, laps: 0, deg: 300, dt: 3.42e-15 }, { n: 3, laps: 1, deg: 210, dt: 6.5e-15 },
  ],
  [
    { n: 3, laps: 1, deg: 30, dt: 4.45e-15 }, { n: 3, laps: 1, deg: 330, dt: 7.87e-15 }, { n: 4, laps: 1, deg: 45, dt: 1.09e-14 },
    { n: 4, laps: 1, deg: 135, dt: 1.34e-14 }, { n: 4, laps: 1, deg: 225, dt: 1.58e-14 }, { n: 4, laps: 0, deg: 315, dt: 8.52e-15 },
  ],
];

// Level 3. A is the clock (the lower level), B carries the camera. B's laps = k·(na/nb)³ exactly; deg = its fraction × 360.
export const TWIN: TwinRow[][] = [
  [
    { na: 1, nb: 2, k: 2, deg: 90 }, { na: 1, nb: 2, k: 3, deg: 135 }, { na: 1, nb: 2, k: 6, deg: 270 },
    { na: 2, nb: 4, k: 2, deg: 90 }, { na: 2, nb: 4, k: 3, deg: 135 }, { na: 2, nb: 4, k: 6, deg: 270 },
  ],
  [
    { na: 1, nb: 3, k: 9, deg: 120 }, { na: 1, nb: 3, k: 18, deg: 240 }, { na: 1, nb: 3, k: 36, deg: 120 },
    { na: 1, nb: 3, k: 45, deg: 240 }, { na: 2, nb: 3, k: 9, deg: 240 }, { na: 2, nb: 3, k: 18, deg: 120 },
  ],
  [
    { na: 1, nb: 4, k: 8, deg: 45 }, { na: 1, nb: 4, k: 32, deg: 180 }, { na: 1, nb: 4, k: 40, deg: 225 },
    { na: 1, nb: 4, k: 56, deg: 315 }, { na: 1, nb: 4, k: 72, deg: 45 }, { na: 1, nb: 4, k: 104, deg: 225 },
  ],
];

// Level 4. Values to 2 significant figures (shown with sci). b = ⌊log₁₀(mvr/ħ)⌋, the same for ħ = 1.05, 1.0546 or
// 1.055 × 10⁻³⁴ J s and for h/2π with h = 6.6 or 6.63 × 10⁻³⁴ J s. Round 3's Earth row is Ex 12.9.
export const ZOOM: ZoomRow[][] = [
  [
    { id: 'ball', name: 'Kiran’s cricket ball', short: 'the ball', around: 'her hand on a string', scene: 'cabin', m: 0.16, v: 2.0, r: 0.5, b: 33 },
    { id: 'weather', name: 'a weather satellite', short: 'the satellite', around: 'the Earth', scene: 'earth', m: 3.0e3, v: 3.1e3, r: 4.2e7, b: 48 },
    { id: 'station', name: 'this space station', short: 'this station', around: 'the Earth', scene: 'earth', m: 4.2e5, v: 7.7e3, r: 6.8e6, b: 50 },
  ],
  [
    { id: 'phobos', name: 'Phobos', short: 'Phobos', around: 'Mars', scene: 'planet', m: 1.1e16, v: 2.1e3, r: 9.4e6, b: 60 },
    { id: 'moon', name: 'the Moon', short: 'the Moon', around: 'the Earth', scene: 'planet', m: 7.4e22, v: 1.0e3, r: 3.8e8, b: 68 },
    { id: 'io', name: 'Io', short: 'Io', around: 'Jupiter', scene: 'planet', m: 8.9e22, v: 1.7e4, r: 4.2e8, b: 69 },
    { id: 'ganymede', name: 'Ganymede', short: 'Ganymede', around: 'Jupiter', scene: 'planet', m: 1.5e23, v: 1.1e4, r: 1.1e9, b: 70 },
  ],
  [
    { id: 'mars', name: 'Mars', short: 'Mars', around: 'the Sun', scene: 'sun', m: 6.4e23, v: 2.4e4, r: 2.3e11, b: 73 },
    { id: 'earth', name: 'the Earth', short: 'the Earth', around: 'the Sun', scene: 'sun', m: 6.0e24, v: 3.0e4, r: 1.5e11, b: 74 },
    { id: 'venus', name: 'Venus', short: 'Venus', around: 'the Sun', scene: 'sun', m: 4.9e24, v: 3.5e4, r: 1.1e11, b: 74 },
    { id: 'neptune', name: 'Neptune', short: 'Neptune', around: 'the Sun', scene: 'sun', m: 1.0e26, v: 5.4e3, r: 4.5e12, b: 76 },
    { id: 'jupiter', name: 'Jupiter', short: 'Jupiter', around: 'the Sun', scene: 'sun', m: 1.9e27, v: 1.3e4, r: 7.8e11, b: 77 },
  ],
];
```

The checked values, for reference: T₁ = 1.5206 × 10⁻¹⁶ s, T₂ = 1.2165 × 10⁻¹⁵ s, T₃ = 4.1056 × 10⁻¹⁵ s, T₄ = 9.7318 × 10⁻¹⁵ s. The Earth row gives mvr = 2.7 × 10⁴⁰ J s and n = 2.56 × 10⁷⁴ (book: 2.6 × 10⁷⁴). The waves in view at the answer zoom are 1.52 (ball), 3.70, 2.08, 2.06, 2.67, 6.02, 1.72, 3.35, 2.56, 1.79, 2.30 and 1.83.

The answer sets of the three rounds never meet: level 2 {90, 120, 180, 270}, {60, 150, 210, 300}, {30, 45, 135, 225, 315, 330}; level 3 {90, 135, 270}, {120, 240}, {45, 180, 225, 315}; level 4 {33, 48, 50}, {60, 68, 69, 70}, {73, 74, 76, 77}. Level 1 draws three different n.

### 5.3 Rounds and judging

```ts
const SAY: Say[] = ['level', 'excited', 'waves'];
export const ORD: Record<number, string> = { 2: 'first', 3: 'second', 4: 'third', 5: 'fourth' };

export function buildRounds(level: 1 | 2 | 3 | 4, random: () => number): Round[] {
  if (level === 1) {
    const ns = shuffle([2, 3, 4, 5], random).slice(0, 3).sort((a, b) => a - b);
    return ns.map((n, k) => ({ kind: 'ring', n, say: SAY[k], assist: aid(k) }));
  }
  const pools = [TRAP, TWIN, ZOOM][level - 2] as unknown[][];
  const kind = (['trap', 'twin', 'zoom'] as const)[level - 2];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

/** The winning dial value of a round. */
export const answer = (r: Round): number => (r.kind === 'ring' ? r.n * r.n : r.kind === 'zoom' ? r.b : r.deg);
/** The player's own dial value for this round's dial. */
export const own = (r: Round, x: Values): number => (r.kind === 'ring' ? x.k! : r.kind === 'zoom' ? x.z! : x.deg!);

export type Out = 'win' | 'wide' | 'narrow' | 'passed' | 'early' | 'many' | 'few';
export function outcome(r: Round, x: Values): Out {
  const a = answer(r);
  const v = own(r, x);
  if (v === a) return 'win';
  if (r.kind === 'ring') return v > a ? 'wide' : 'narrow';
  if (r.kind === 'zoom') return v < a ? 'many' : 'few';
  return v < a ? 'passed' : 'early';   // trap and twin: a smaller angle means the electron had already gone by
}
export const judge = (r: Round, x: Values) => outcome(r, x) === 'win';

/** Seconds into the take at which the photo is revealed, and at which the verdict lands. */
export const REVEAL = { ring: 0.3, trap: 0.95, twin: 1.05, zoom: 1.0 } as const;
export const DELAY = { ring: 0.45, trap: 1.0, twin: 1.1, zoom: 1.1 } as const;
/** The fixed looks of a miss: never proportional to the error. */
export const MISS_LOOK = { streakOffset: 12, streakDeg: 40, trailDeg: 35, blurLines: 40, fewWaves: 0.3 } as const;
export const HIT: [number, number] = [400, 52]; // the burst and "−1 ♥" point, the same in every level and round
```

- All dial values are integers (k, deg, z), so compare with `===`. The `deg` dial runs 0 to 345; a drag near 360° wraps to 0 (section 7).
- `buildRounds` must be the **first** use of `random` in the level, so the UI test rebuilds the same rounds from the same seed.
- The start settings (k = 6, deg = 0, z = 0) win no round of any pool (tested). No answer sits on a dial end (1 or 30, 0 or 345, 0 or 90).

### 5.4 Words

Number formatting: `fmt` from `@core/judge` (3 significant figures; `fmt(3.8e-17)` is `3.8 × 10⁻¹⁷`), `sci` for the level 4 data, `ringA(k).toFixed(2)` for ring radii, `sup` for zoom exponents. `cap(s)` makes the first letter upper case.

Export every word function from `logic.ts`, with these names and signatures: `phrase(r)`, `goal(r)`, `intel(r)`, `hintText(r)`, `testText(r, x)`, `missText(r, x)`, `winText(r)` and `helperLabel(r, x)`, where `x: Values` is the player's setting. The `DialLevel` wiring is `hint: (r) => hintText(r)`, `miss: (r, v) => missText(r, v)`, `win: (r) => winText(r)`.

**`phrase(r)`** (level 1): level → `` `on level n = ${n}` ``; excited → `` `in the ${ORD[n]} excited state` ``; waves → `` `on the orbit that holds ${n} of its matter waves` ``.

**`goal(r)`** (the one-line goal drawn on the canvas, section 6.1; each is at most 58 characters, tested):
- ring: level `` `Snap the electron on level n = ${n}` ``; excited `` `Snap the electron in the ${ORD[n]} excited state` ``; waves `` `Snap the electron whose orbit holds ${n} waves` ``
- trap: `` `Level ${n}: the flash fires ${fmt(dt)} s after the gate` ``
- twin: `` `Flash at B when A has lapped ${k} times` ``
- zoom: `` `Zoom in to count the waves of ${short}` ``

**`intel(r)`** (the facts, in the hint line under the canvas):
- ring: `` `The electron is ${phrase(r)}. The ground orbit is a₀ = 0.53 Å.` ``
- trap: `` `Level n = ${n}. The electron circles clockwise and passes the gate at the top; the flash fires ${fmt(dt)} s later. v₁ = 2.19 × 10⁶ m/s, a₀ = 0.53 Å.` ``
- twin: `` `Atom A is on level ${na} and atom B on level ${nb}. Both electrons leave their gates together; the camera fires at B when A has lapped ${k} times.` ``
- zoom: `` `${cap(name)} round ${around}: m = ${sci(m)} kg, v = ${sci(v)} m/s, r = ${sci(r)} m. ħ = 1.055 × 10⁻³⁴ J s.` ``

**`hintText(r)`**: `` `${intel(r)} ${AIDLINE}` `` with AIDLINE:
- assist 0: ring `Round 1: the matter-wave preview is live.`; trap `Round 1: the lap meter is live.`; twin `Round 1: B’s lap meter is live.`; zoom `Round 1: the scope’s live view is on.`
- assist 1: `The helper is off: a test flash shows it for a moment (costs a charge).`
- assist 2: `Final shot: no helper and no test flash.`

**`testText(r, x)`** (the paid check, read out in the feedback panel; it may hold numbers):
- ring: `` `Test flash: a ring of ${ringA(k).toFixed(2)} Å would hold ${fmt(waves(k))} matter waves. Only a whole number of waves closes up.` ``
- trap: `` `Test flash: on level ${n} the electron moves at ${fmt(speed(n))} m/s, and one lap takes ${fmt(period(n))} s.` ``
- twin: `` `Test flash: one lap of B (n = ${nb}) lasts as long as ${fmt((nb / na) ** 3)} laps of A (n = ${na}).` ``
- zoom: `` `Test flash: mvr = ${fmt(m * v * r)} J s for ${name}.` ``

**`missText(r, x)`** (what the player's setting did, and which way to go; never the answer):
- wide: `` `The ring flash at ${ringA(k).toFixed(2)} Å lit empty space: the electron circles closer in. Make the ring smaller.` ``
- narrow: `` `The ring flash at ${ringA(k).toFixed(2)} Å lit empty space: the electron circles farther out. Make the ring bigger.` ``
- passed: `` `At ${deg}° the flash lit an empty spot: ${who} had already gone past the camera. Try a larger angle.` ``
- early: `` `At ${deg}° the flash lit an empty spot: ${who} had not reached the camera yet. Try a smaller angle.` ``
  - `who` is `the electron` (trap) or `B’s electron` (twin).
- many: `` `At ×10${sup(z)} the window held far too many waves to count. Zoom in more.` ``
- few: `` `At ×10${sup(z)} the window held less than one wave. Zoom out.` ``

**`winText(r)`** (the working, short):
- ring: `` `Got it! rₙ = n²a₀ = ${n}² × 0.53 Å = ${radius(n).toFixed(2)} Å, not ${n} × 0.53 Å. Its matter wave fits ${n} times round the orbit, because 2πr = nλ (Ex 12.7, §12.6).` ``
- trap: `` `Got it! On level ${n}, v = v₁/${n} = ${fmt(speed(n))} m/s round r = ${radius(n).toFixed(2)} Å, so one lap takes T = 2πr/v = ${fmt(period(n))} s. ${fmt(dt)} s is ${fmt(dt / period(n))} laps: ${deg}° past the gate (Ex 12.6).` ``
- twin: `` `Got it! T ∝ n³, so one lap of B (n = ${nb}) lasts ${fmt((nb / na) ** 3)} laps of A (n = ${na}). ${k} laps of A is ${fmt(k * (na / nb) ** 3)} laps of B: ${deg}° past its gate (Ex 12.6).` ``
- zoom: `` `Counted! n = mvr/ħ = ${fmt(m * v * r)} ÷ (1.055 × 10⁻³⁴) = ${fmt(m * v * r / HBAR)}, so a zoom of ×10${sup(b)} leaves ${fmt(m * v * r / HBAR / 10 ** b)} waves in view. Steps of ħ in an orbit this big are far too small ever to notice (Ex 12.9).` ``

**`helperLabel(r, x)`** (drawn on the canvas only while the helper is on; the UI test looks for it). Every helper describes **the player's own setting**, never the answer, so a paid flash in round 2 buys information, not the answer:
- ring: `` `${fmt(waves(k))} waves: ${Number.isInteger(waves(k)) ? 'fits ✓' : 'no fit ✗'}` `` (the waves round the player's ring)
- trap: `` `first reaches here ${fmt((period(n) * deg) / 360)} s after the gate` `` (when the electron first passes the player's camera)
- twin: `` `B first reaches here after ${fmt((deg / 360) * (nb / na) ** 3)} laps of A` ``
- zoom: `live view` (the window shows the waves for the player's zoom; no number)

Its one number describes the player's own setting, so it does not count against the three-number limit of the UX checklist.

## 6. Screen and art

Canvas 640 × 340 (`mountDialLevel`). Draw the station over the engine's background with opaque fills, so the engine grid never shows.

```ts
// art.ts
export const SCREEN = { x: 168, y: 34, w: 464, h: 300 };   // the ATOM CAM monitor (levels 1–3) and the cupola window (level 4)
export const GOAL_Y = 22;                                    // the goal line, centred at x = 400
export const ATOM = { x: 400, y: 186 };                      // level 1
export const ringPx = (k: number) => 12 + 4.2 * k;           // level 1 ring on screen: a picture, not to scale
export const TRAP = { x: 400, y: 190 };                      // level 2
export const trapPx = (n: number) => 50 + 16 * n;            // level 2 orbit on screen, not to scale
export const TWIN_A = { x: 276, y: 190 };
export const TWIN_B = { x: 500, y: 190 };
export const twinPxA = (n: number) => 40 + 14 * n;
export const twinPxB = (n: number) => 56 + 14 * n;
export const WAVE_WIN = { x: 220, y: 206, w: 360, h: 56 };   // level 4: the Bohr scope's window (mid line y = 234)
export const ZTRACK = { x0: 196, x1: 616, y: 312 };          // level 4: the zoom lever's track
export const PORTHOLE = { x: 80, y: 70, r: 42 };
export const CONSOLE = { x: 22, y: 288, w: 124, h: 44 };
export const BUTTON = { x: 118, y: 304, r: 9 };
export const KIRAN = { hip: { x: 78, y: 236 } };
export const PICO = { x: 142, y: 100 };
/** A point at `deg` clockwise from 12 o'clock on a circle. */
export const onRing = (cx: number, cy: number, R: number, deg: number): [number, number] => [cx + R * Math.sin((deg * Math.PI) / 180), cy - R * Math.cos((deg * Math.PI) / 180)];
```

All angles in this game are measured **clockwise from 12 o'clock**, so use `onRing` everywhere. Do not use the canvas `arc` angle convention without converting (canvas angle = (deg − 90)·π/180).

### 6.1 The station (every level)

- **Module wall**: fill the whole canvas `#121830`; a vertical frame edge at x = 160 (`#2a3159`, 3 px); faint panel seams (horizontal lines at y = 140 and 250 in x 0 to 160, `PAL.grid`); a yellow handrail (`PAL.yellow`, 4 px) from (10, 128) to (150, 128) with three small brackets.
- **Porthole** at `PORTHOLE`: a grey frame ring (8 px, `#5a6380`) with 8 bolts; inside, clipped to the glass, the view changes **by round** (the three rounds look different):
  - round 1: the Earth's day side: the lower part of the glass is the Earth's limb (a circle centred at (80, 140), radius 70, `#2b6fd6`) with a green land patch, three white cloud swirls and a thin cyan atmosphere line; a few stars above.
  - round 2: sunset over the limb: the Earth dark navy with an orange band along the limb and a bright Sun dot at (104, 46).
  - round 3 (boss): the night side with 8 yellow city-light dots at fixed spots and a green aurora (three wavy vertical strokes, alpha 0.5, swaying `sin(t)`; still with reduced motion).
- **Console** at `CONSOLE`: a grey box (`#3a4166`, outline `PAL.dim`) with a small green LCD reading `ARMED` (11 px), a joystick at (44, 304), the yellow foot loop on its top at (42, 290), the big round button at `BUTTON` (`PAL.red`, white when pressed) and the label `FLASH` (levels 1 to 3) or `ZOOM` (level 4) under it (11 px, white).
- **Kiran** and **Pico** as in section 4.
- **The goal line**: `goal(r)` in `PAL.yellow`, 13 px bold, centred at (400, `GOAL_Y`), drawn in every play frame and during the take.
- **Shot stamp**: when a new round starts (detect `k` changing inside `draw`), `SHOT ${k + 1}` in `PAL.white`, or `FINAL SHOT` in `PAL.red` in round 3, shows right-aligned at (620, 50), 14 px, for 1.2 s.

### 6.2 The ATOM CAM (levels 1 to 3)

- A rounded rectangle at `SCREEN`, fill `#04071a`, a 2 px bezel in `PAL.cyan` (round 3: `PAL.red`), faint scanlines every 4 px (alpha 0.04) and the label `ATOM CAM · H` (round 3: `ATOM CAM · FINAL SHOT`) left-aligned at (180, 50), 11 px, `PAL.dim` (round 3 `PAL.red`).
- The helper label (section 5.4) is drawn left-aligned at (180, 72), 12 px, `PAL.green` (level 1: `PAL.red` when it says `no fit ✗`).
- **The grip** of every handle: a see-through ring of radius `HANDLE_R` (stroke `PAL.yellow`, 2 px, fill `rgba(255,210,63,0.12)`) and a glyph: `⇔` (14 px, `PAL.yellow`, at its centre) for the ring flash and the zoom lever, `↻` (11 px, at the ring's upper right, (x + 14, y − 14)) for the cameras. The engine adds its own pulsing ring and thickens it while dragging.
- **The drag cue** (round 1 of every level, while the dial still holds its start value and no take is playing): `drag ⇔` or `drag ↻` in `PAL.yellow`, 11 px, alpha `0.5 + 0.5·sin(4t)`: level 1 at (hx, ATOM.y + 32); levels 2 and 3 above the gate, at (cx, cy − R − 34), since the camera starts on the gate (the `GATE` label is at cy − R − 16 and the readout is inside the ring); level 4 left-aligned at (x + 30, ZTRACK.y + 4).

### 6.3 Level 1: the ring flash

- **The atom**: the proton at `ATOM`, radius 12, mood `'sleepy'`. Around it a **haze**: a radial gradient from `rgba(77,225,255,0.10)` at the centre to transparent at 140 px, plus 10 twinkling dots (2 px, white, alpha `0.2 + 0.2·sin(3t + i)`) at fixed positions that are **not** on circles: `(400 + 120·sin(2.3i), 186 + 110·cos(1.7i))` for i = 0 to 9. The haze is the same in every round and never moves with the answer.
- **The ring flash** (the player's own setting): a dashed circle (`PAL.cyan`, 2 px, dash [6, 6], alpha 0.8) of radius `ringPx(v.k)` at `ATOM`, with 8 small white "bulbs" (radius 2) evenly round it.
- **The handle**: at `(ATOM.x + ringPx(v.k), ATOM.y)`, the grip with `⇔`. The readout `` `${ringA(v.k).toFixed(2)} Å` `` (12 px, `PAL.white`) at (hx, ATOM.y − 30).
- **The given**: `a₀ = 0.53 Å (ground orbit)` left-aligned at (180, 322), 11 px, `PAL.dim`.
- **The helper (the matter-wave preview)**, when on (section 6.7): a solid `PAL.green` line (2 px) round the ring, `R(θ) = ringPx(k) + 6·sin(N·θ)` with `N = waves(k)`, θ from 0 to 2π clockwise from 12 o'clock, 120 segments. If N is not a whole number the line jumps at 12 o'clock: draw a red `✗` (12 px) at (400, ATOM.y − ringPx(k) − 14). Plus the helper label.

**The take** (`rt` = seconds since fire):
- 0.00: Kiran fires (section 4); Pico busy; floater `FLASH!`.
- 0.10 to 0.35: the ring flash fires: the ring drawn solid `PAL.white` with glow (`shadowBlur 16`), line width `7 − 20·(rt − 0.10)` (7 down to 2); a wash over the ATOM CAM only: fill `SCREEN` with white at alpha `0.35·(1 − (rt − 0.10)/0.25)` (halve it with reduced motion).
- **Reveal at `REVEAL.ring` = 0.30.** From then on, by `outcome`:
  - **win**: the ring stays solid `PAL.green` (2.5 px); the standing wave with n crests round it (the helper drawing, label `${n} waves: fits ✓`); the electron at `onRing(ATOM.x, ATOM.y, ringPx(k), 315)` (upper left, clear of the readout); a viewfinder (four white L-shaped corners, 34 px box) round it and a red `REC` dot blinking at 1 Hz in its corner; floater `SNAP!` at the electron (once); the proton smiles; Pico happy; Kiran cheers. `GOT IT ✓` (`PAL.green`, 16 px, glow) at (400, 318).
  - **wide / narrow**: the ring stays white at alpha 0.5. The streak: a `PAL.cyan` arc, 3 px, from 200° to 240°, at radius `max(16, ringPx(k) − 12)` (wide: the electron is inside) or `ringPx(k) + 12` (narrow: outside), alpha `0.6·(1 − (rt − 0.30)/0.8)` until it fades at 1.10. `EMPTY FRAME ✗` (`PAL.red`, 16 px) at (400, 318). The proton yawns (rt 0.9 to 1.5); Pico sad; Kiran worried.
- Verdict at **0.45** (`delay: DELAY.ring`). Everything is still by 2.3 s.

### 6.4 Level 2: the camera trap

With `R = trapPx(r.n)` and centre `TRAP`:
- **The orbit** (given, not the answer): a soft band (`PAL.cyan`, alpha 0.18, 10 px) with a thin line on it (`PAL.cyan`, alpha 0.5, 1.5 px). Six static sparkles at 20° + 60°·i on the band (2 px, white, alpha `0.25 + 0.25·sin(5t + i)`). **Nothing moves round the ring**, so no speed or period can be timed on screen.
- **Ticks** every 15° just outside the band (from R + 6 to R + 10, `PAL.dim`, alpha 0.6), longer every 90° (to R + 14). **No numbers** on the ticks.
- **The gate** at 12 o'clock: a U-shaped clamp over the band (two bars 14 px tall at x ± 7, joined on top), an LED (radius 3) at (TRAP.x, TRAP.y − R − 10), dim green at rest, and `GATE` (11 px, `PAL.dim`) at (TRAP.x, TRAP.y − R − 16).
- **The direction**: a curved arrow just outside the ring from 20° to 50° (radius R + 18, `PAL.dim`, with a head) and `↻ clockwise` (11 px, `PAL.dim`) at `onRing(TRAP.x, TRAP.y, R + 34, 35)`.
- **The level**: `` `n = ${n}` `` (12 px, `PAL.white`) right-aligned at (TRAP.x − R − 8, TRAP.y + R).
- **The proton** at the centre, radius 12.
- **The camera** (the player's own setting) at `onRing(TRAP.x, TRAP.y, R, v.deg)`: a small body (18 × 12, `#2a3159`, white outline) with a lens (radius 3.5, `PAL.cyan`) on the side toward the centre and a white flash head on top, inside the grip ring with `↻`. The readout `` `${v.deg}°` `` (12 px, `PAL.white`) at `onRing(TRAP.x, TRAP.y, R − 32, v.deg)`.
- **The helper (the lap meter)**, when on: a thick translucent arc on the orbit (`PAL.green`, alpha 0.22, 20 px wide) from the gate clockwise to **the player's camera** (`v.deg`, not the answer), plus the helper label `first reaches here … s after the gate`. In round 1 (whose rows all finish within the first lap) the player can drag until that time equals the flash time; in rounds 2 and 3 extra laps must be worked out.

**The take**:
- 0.00: Kiran fires; floater `ARMED` at (96, 268).
- 0.10: the gate LED flashes bright green for 0.15 s; floater `CLICK` at (TRAP.x, TRAP.y − R − 24), once.
- 0.10 to 0.95 (hidden from the reveal on): a countdown bar at (528, 60), 84 × 8, outline `PAL.dim`, filling with `PAL.yellow` at a **fixed** rate `(rt − 0.10)/0.80` (the same for every row; it never encodes Δt or T), labelled `Δt` (11 px) left-aligned at (616, 68), to the bar's right, clear of the `↻ clockwise` label. The band's alpha rises from 0.18 to 0.3.
- 0.90: the camera fires: a white disc at the camera, radius 6 to 26 over 0.25 s, alpha 0.9 to 0; a wash over the ATOM CAM at alpha 0.25 down to 0 over 0.2 s (halved with reduced motion).
- **Reveal at 0.95**, by `outcome`:
  - **win**: the electron frozen at the camera's ring point, the viewfinder and `SNAP!`, the lap-meter arc and label (now for the winning camera), `GOT IT ✓`, and the reactions.
  - **passed** (camera short of the true angle): the spot is empty; a comet trail on the ring from `deg + 5°` to `deg + 40°` (ahead of the camera, clockwise) with a bright head at the far end, `PAL.cyan`, alpha 0.6 fading to 0 over 0.8 s. `EMPTY FRAME ✗` at (400, 318) and under it `it had already passed` (12 px, `PAL.red`) at (400, 332).
  - **early** (camera beyond the true angle): a faint glow arc from `deg − 40°` to `deg − 5°` (behind the camera), alpha 0.4 fading to 0 over 0.8 s. `EMPTY FRAME ✗` and `it had not arrived yet`.
  - The trail length (35°) is `MISS_LOOK.trailDeg` and never depends on how far off the camera was.
- Verdict at **1.0**.

### 6.5 Level 3: twin atoms

Two atoms in the ATOM CAM: A at `TWIN_A` with `RA = twinPxA(na)`, B at `TWIN_B` with `RB = twinPxB(nb)`, both drawn like the level 2 orbit (band, sparkles, gate, proton of radius 10), with ticks **only on B**.
- Labels: `` `A · n = ${na}` `` at (TWIN_A.x, TWIN_A.y + RA + 20) and `` `B · n = ${nb}` `` at (TWIN_B.x, TWIN_B.y + RB + 18), 12 px, `PAL.white`.
- A's lap counter: a small LCD (56 × 16, black, green digits) at (TWIN_A.x − 28, TWIN_A.y − RA − 36). It shows `— —` during play and counts during the take.
- `↻ both clockwise` (11 px, `PAL.dim`) centred at (388, 50).
- The camera and its readout on B, exactly as in level 2.
- The helper (B's lap meter), when on: the lap-meter arc on B from its gate to **the player's camera** (`v.deg`), plus the label `B first reaches here after … laps of A`.

**The take**:
- 0.00: Kiran fires; floater `GO` at (96, 268).
- 0.10: both gate LEDs flash; floater `CLICK` at A's gate, once.
- 0.10 to 1.00: A's LCD shows `` `laps ${Math.min(k, Math.floor((k * (rt - 0.10)) / 0.90))}` `` (it reaches k at 1.00). A's band brightens. The LED stays steadily lit (it must not blink once per lap: that would flash faster than 3 Hz).
- 1.00: B's camera fires, as in level 2.
- **Reveal at 1.05**: win, passed or early on B, as in level 2, except that the verdict lines go under atom A, at (276, 318) and (276, 332), so they never meet B's label.
- Verdict at **1.1**.

### 6.6 Level 4: powers of ten

The right side is the station's cupola window: at `SCREEN`, fill `#02030a`, 40 fixed stars (`(176 + (i·97) % 448, 42 + (i·53) % 150)`, 1.5 px, alpha `0.4 + 0.4·sin(1.3t + i)`), a thick grey frame (10 px, `#5a6380`) with bolts every 58 px. Round 3: a thin red line inside the frame.

**The body scene** (above y = 200; clip to it), by `row.scene`, **not to scale**:
- `cabin` (the ball, inside the cupola): a string from a small clip at (360, 96) to the ball circling (360, 140) at radius 44, turning at a fixed 2 rad/s (decor, not the physics). The ball: radius 8, `#c0392b`, a white seam arc, a face.
- `earth` (the satellite, the station): the Earth's limb (a circle centred at (400, 430), radius 270, `#2b6fd6`, with green patches and a cyan atmosphere line), a dashed orbit arc (radius 310, white, alpha 0.4) and the craft at (400, 120). The weather satellite: a box 10 × 8 with two blue panels 14 × 6 and a dish, and LED eyes. This station: a truss line with four blue panels and `YOU ARE HERE` (11 px, `PAL.yellow`) at (400, 104), no face.
- `planet` (the moons): the parent disc at (300, 140), radius 26 (Mars `#d0623a` with a white cap for Phobos; the Earth `#2b6fd6` for the Moon; Jupiter `#d9a066` with three brown bands for Io and Ganymede); a dashed orbit ellipse round it (rx 110, ry 30); the moon at (410, 140): Phobos a lumpy grey ellipse (rx 8, ry 5); the Moon grey, radius 8, with three craters; Io `#e8d34a` with orange dots, radius 7; Ganymede `#9a8f80`, radius 8.
- `sun` (the planets): the Sun at (176, 140), radius 40, with a glare (radial gradient from `PAL.yellow` to transparent at 90 px); a dashed orbit arc centred on the Sun (radius 230, from −25° to +25° about the horizontal); the planet at (406, 140): Mars `#d0623a` radius 8; the Earth `#2b6fd6` radius 9 with a white swirl; Venus `#f0d9a0` radius 9; Neptune `#3a5fd9` radius 12; Jupiter radius 14 with bands.
- Every orbiting body except the station has a face (section 4).

**The data card** at (428, 40), 196 × 64, fill `rgba(10,16,48,0.85)`, outline `PAL.dim`: `cap(short)` (12 px bold, `PAL.white`) at (436, 56), then `` `m = ${sci(m)} kg` ``, `` `v = ${sci(v)} m/s` ``, `` `r = ${sci(r)} m` `` (11 px, `PAL.white`) at y = 72, 86 and 100. These are the only three numbers in the scene besides the player's zoom.

**The wave window** at `WAVE_WIN`: fill `#060b22`, outline `PAL.cyan` (1.5 px), a faint mid line. With the helper off and no take: a centred `?` (20 px, `PAL.dim`) and `waves in view` (11 px, `PAL.dim`) left-aligned at (226, 220). Under the window, `BOHR SCOPE · a thought experiment` (11 px, `PAL.dim`) at (400, 280), hidden during a take.

**`strip(g, c, colour)`**: c periods of a sine across the window's 360 px, amplitude 18, about y = 234, 600 segments. If c > 60, draw a solid band instead (fill between y 216 and 252, alpha 0.35).

**The zoom lever**: a groove from (196, 312) to (616, 312) (`PAL.dim`, 3 px) with small ticks every 10 notches and **no numbers**; `−` at (184, 316) and `+` at (628, 316) (12 px, `PAL.dim`). The handle at `(ZTRACK.x0 + (v.z / 90)·420, ZTRACK.y)` with the `⇔` grip; the readout `` `×10${sup(v.z)}` `` (12 px, `PAL.white`) at (hx, 292).

**The helper (the live view)**, when on: `strip(g, c, PAL.green)` with `c = (m·v·r/ħ)/10^z` for the **player's** z, and the label `live view` (11 px, `PAL.green`) right-aligned at (574, 220). No numbers.

**The take**:
- 0.00: Kiran fires; floater `ZOOM!` at (96, 268); Pico busy.
- 0.05 to 1.00: the zoom: six rounded rectangles centred on (400, 234), each with `s = frac((rt − 0.05)·1.2 + i/6)`, half-size `(40 + 300s) × (12 + 90s)`, `PAL.cyan` at alpha `0.5·(1 − s)` (reduced motion: three still rectangles). The body scene fades to alpha 0.3. The player's readout stays as it is at the handle. **Do not draw a counter that counts up through the powers of ten**: on a miss above the answer it would pass through the answer's exponent.
- **Reveal at 1.00**, by `outcome`. The verdict text goes at (400, 198), just above the window (the faded scene is behind it), so it never meets the handle readout at y = 292:
  - **win**: `strip(g, n/10^b, PAL.green)` with glow, `` `${fmt(n / 10 ** b)} waves in view` `` (12 px, `PAL.green`) at (400, 222), `COUNTED ✓` (16 px, `PAL.green`) at (400, 198); the body cheers; Kiran, Pico react.
  - **many**: a fixed blur: the band at alpha 0.35 in `PAL.dim` plus `MISS_LOOK.blurLines` = 40 fine vertical lines every 9 px from x = 222; `TOO MANY TO COUNT ✗` (14 px, `PAL.red`) at (400, 198).
  - **few**: a fixed gentle curve: `strip(g, MISS_LOOK.fewWaves, PAL.dim)` (0.3 of a wave); `LESS THAN ONE WAVE ✗` (14 px, `PAL.red`) at (400, 198).
- Verdict at **1.1**.

### 6.7 The helper rule

| Round | Helper (level 1 wave preview, level 2 lap meter, level 3 B lap meter, level 4 live view) |
|---|---|
| 1 (`assist 0`) | on during play |
| 2 (`assist 1`) | off, except for 1.5 s after a paid test flash (`paidFlash` + `helperOn`) |
| 3 (`assist 2`) | never; charges are `[1, 1, 0]`, so the test button gives the engine's `No charges left this round.` |
| during a take | **off on a miss in every round, round 1 included**; on after the reveal of a win |

In `draw`: `const since = flash.since(A.clock, k); const helper = shot ? shot.ok && rt >= REVEAL[r.kind] : helperOn(r.assist, false, since);`. Set `A.canvas.dataset.helper = helper ? 'on' : 'off'` and `A.canvas.dataset.out = shot && rt >= REVEAL[r.kind] ? outcome(r, shot.v) : ''` in every frame, for the tests. Every helper is drawn for the values in `v` (the player's own setting; during a winning take that is the winning setting). Outside the helper and the paid test text, nothing on screen tells the player what their setting would do before the take.

### 6.8 What must never show

- The electron, before the reveal of a winning photo (levels 1 to 3).
- Any allowed orbit other than the player's own ring (level 1), except inside the helper.
- Any number on the angle ticks or the zoom track; any countdown or animation whose speed depends on Δt, T or n.
- A miss streak, trail, blur or curve whose size or place depends on how far off the player was (use `MISS_LOOK`).
- More than three numbers in a scene besides the player's own readout (the goal line, the given a₀ or the ring labels, the data card, and at most one helper number).
- `hit` is always `HIT` = (400, 52).

### 6.9 The UX checklist, item by item

| # | Item | Where it is met |
|---|---|---|
| 1 | Goal on the canvas | `goal(r)`, 13 px `PAL.yellow`, centred at (400, 22), every frame (6.1) |
| 2 | Own setting by its handle, with unit | `4.77 Å` above the ring handle (6.3); `90°` inside the ring by the camera (6.4, 6.5); `×10⁷⁴` above the zoom lever (6.6) |
| 3 | Handles easy to grab | radius `HANDLE_R` = 20, see-through grip ring with `⇔` or `↻` (6.2); the engine's pulse and drag highlight; the pulsing `drag ⇔` / `drag ↻` cue in round 1 until the dial leaves its start (6.2) |
| 4 | Legible text | everything 11 px or more; the label positions in 6.2 to 6.6 were checked against the rings, handles and each other (`rebuild-checks/ch12/bohr-check.mjs` checks the ring sizes); every colour comes with a word or symbol (`GOT IT ✓`, `EMPTY FRAME ✗`, `fits ✓`, `no fit ✗`, `↻ clockwise`); at most three given numbers per scene (6.8) |
| 5 | Instant answer to Fire | at rt = 0 the goggles drop, the button sinks and glows, `FLASH!` / `ZOOM!` floats, Pico's LED turns amber; the verdict lands at the photo's reveal (0.45, 1.0, 1.1, 1.1 s); a win (green photo, viewfinder, somersault, `BEEP!`) and a miss (empty frame, streak, sweat drop, `?`) look and sound different (the engine's ok and bad sounds) |
| 6 | Teach after a win | `winText`: one or two sentences with the working; a miss says what to change in plain words (`Make the ring smaller`, `Try a larger angle`, `Zoom in more`) |
| 7 | A living hero | Kiran bobs, sways, blinks, her hair and badge float, a pen drifts, she glances at the porthole, squints while the player sets a dial, reacts to every take; Pico bobs and reacts; the proton breathes, smiles or yawns (section 4) |
| 8 | Rounds look different | the porthole view per round (day, sunset, night with aurora), the `SHOT 1/2/3` stamp, the red bezel and `FINAL SHOT` in the boss round; level 2 and 3 rings change size with n; level 4 bodies change per round (6.1, 6.2, 6.6) |
| 9 | Accessibility | every dial, the test and the fire buttons have the aria labels of section 7; sliders work from the keyboard (engine); the canvas `aria-label` gives the scene, the goal and the player's setting; reduced motion halves the washes, drops the somersault and stills the zoom rings |
| 10 | Comfort | no full-canvas flash: washes cover the ATOM CAM only, at most alpha 0.35 and 0.25 s; Pico's LED 2 Hz, the REC dot 1 Hz, level 3's LED steady |

## 7. Controls and mount

Write four functions `ring`, `trap`, `twin` and `zoom`, each `(random: () => number) => DialLevel<Round>`. Each builds `rounds = buildRounds(n, random)` first, then `const flash = paidFlash()`, then returns its `DialLevel`:

| Level | dial | handle |
|---|---|---|
| 1 | `{ key: 'k', aria: 'Ring flash radius, in steps of the ground orbit of 0.53 ångström', label: 'Ring flash', unit: 'Å', step: 1, min: 1, max: 30, start: 6, text: (x) => ringA(x).toFixed(2) }` | `at: (_r, v) => [ATOM.x + ringPx(v.k), ATOM.y]`, `drag: (_r, px, py) => (Math.hypot(px - ATOM.x, py - ATOM.y) - 12) / 4.2`, `radius: HANDLE_R` |
| 2 | `{ key: 'deg', aria: 'Camera angle in degrees, clockwise from the gate', label: 'Camera angle', unit: '', step: 15, min: 0, max: 345, start: 0, text: (x) => `${x}°` }` | `at: (r, v) => onRing(TRAP.x, TRAP.y, trapPx(r.n), v.deg)`, `drag: (_r, px, py) => wrap15(px, py, TRAP)`, `radius: HANDLE_R` |
| 3 | as level 2, but `aria: 'Camera angle on atom B in degrees, clockwise from its gate'` | `at: (r, v) => onRing(TWIN_B.x, TWIN_B.y, twinPxB(r.nb), v.deg)`, `drag: (_r, px, py) => wrap15(px, py, TWIN_B)` |
| 4 | `{ key: 'z', aria: 'Zoom of the Bohr scope, as a power of ten', label: 'Zoom', unit: '', step: 1, min: 0, max: 90, start: 0, text: (x) => `×10${sup(x)}` }` | `at: (_r, v) => [ZTRACK.x0 + (v.z / 90) * 420, ZTRACK.y]`, `drag: (_r, px) => ((px - ZTRACK.x0) / 420) * 90`, `radius: HANDLE_R` |

`wrap15(px, py, c)`: `let d = (Math.atan2(px - c.x, -(py - c.y)) * 180) / Math.PI; if (d < 0) d += 360; return (Math.round(d / 15) * 15) % 360;` (so a drag at 355° gives 0, not 345). The `r` of level 2 and 3 handles is the round object; in TypeScript narrow it with `r.kind === 'trap'` (or cast), as the round's kind is fixed per level.

Common to every level:
- `hero: { name: 'Kiran', role: ROLE, ...HEROES[n - 1] }` with the stories of section 4; `charges: [1, 1, 0]`.
- `test: { button: '🔎 Test flash', aria: 'Test flash: preview this setting (costs a charge)', read: (r, v) => { flash.paid(); return testText(r, v); } }`.
- `fire`: levels 1 to 3 `{ button: '📸 Flash!', aria: 'Fire the flash and take the photo' }`; level 4 `{ button: '🔭 Zoom!', aria: 'Zoom the scope to this power of ten' }`.
- `judge`, `miss: missText`, `win: winText`, `hint: hintText`, `hit: () => HIT`, `delay: DELAY[kind]`, and `draw`.
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(4, ctx.level)) as 1 | 2 | 3 | 4; return mountDialLevel(ctx as never, [ring, trap, twin, zoom][n - 1](ctx.random) as never, ARIA); } })`.
- `ARIA = 'A space-station lab: a laser physicist floats at the controls of an attosecond flash camera that photographs the electron of a hydrogen atom, with the Earth in the porthole.'` In `draw`, when it changes, set the canvas `aria-label` to `` `${ARIA} ${goal(r)}. Your setting: ${readout}.` `` (readout = the dial's text plus unit).
- Read `const REDUCE = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false` once at mount (jsdom has no `matchMedia`, hence the `?.`).
- `focus` mood: keep `lastValue` and `changedAt` in the level closure; Kiran is `'focus'` while `t − changedAt < 0.5` and no take is playing.
- One-shot floaters (`SNAP!`, `CLICK`, `BEEP!`): use a `once(key)` set cleared when `shot` changes, as `capacitor-bench/index.ts` does.
- Put the art in `art.ts` (it will pass 400 lines) and keep `index.ts` to the four level builders, `draw` and the mount.

## 8. game.json (copy exactly)

Copy `docs/curriculum/gap-designs/rebuilds/json/bohr-orbits.json` over the existing `game.json`. Its lengths were checked on 2026-10-31 (`rebuild-checks/ch12/bohr-json-check.mjs`): title `Snap the Electron` (17 characters), summary 139, learningOutcome 175 with curly apostrophes, `adds` 138, 124, 117 and 121, every hint at most 112, 6 concepts (the longest 45), 5 misconceptions; the title and summary are unique against the 119 game files in `src/games`, `gap-designs/json` and `rebuilds/json` (checked again when the JSON was published). It keeps `id`, `order: 1`, `chapter` and `ncertRef: "Section 12.4, Bohr model of the hydrogen atom"`; `mechanic` becomes `predict-then-reveal` (a valid value) and `estimatedMinutes` 25. The levels are `Ring flash` (concept, foundation), `Camera trap` (application, concept), `Twin atoms` (application, concept) and `Powers of ten` (challenge, concept).

## 9. Tests

### 9.1 `logic.test.ts`

Use `const seeds = Array.from({ length: 80 }, (_, i) => i * 7919 + 13)` and `createRng` from `@core/random` (or the LCG of the old test).

1. **Book numbers**:
   - `radius(2)` is 2.12 and `radius(3)` is 4.77 (Å, Ex 12.7); `ringA(9)` is 4.77; `radius(1)` is `A0`.
   - `speed(1..3)` are within 1% of 2.18 × 10⁶, 1.09 × 10⁶ and 7.27 × 10⁵ m/s, and `period(1..3)` within 1% of 1.52 × 10⁻¹⁶, 1.22 × 10⁻¹⁵ and 4.11 × 10⁻¹⁵ s (Ex 12.6); `period(3) / period(1)` is 27; `period(n)` equals `2π·radius(n)·1e-10 / speed(n)` to 1e-12 relative.
   - `6e24 * 3e4 * 1.5e11 / HBAR` is within 2% of 2.6 × 10⁷⁴ (Ex 12.9).
   - `waves(n * n)` is exactly n for n = 1 to 5, and `waves(k)` is a whole number for k in 1 to 30 only when k is 1, 4, 9, 16 or 25.
   - `sci` gives `0.16`, `2.0`, `0.50`, `3.0 × 10³`, `6.0 × 10²⁴` and `1.0 × 10²⁶`; `sup(74)` is `⁷⁴` and `sup(-15)` is `⁻¹⁵`.
2. **Pools** (every row):
   - TRAP: `|dt / period(n) − (laps + deg/360)| < 0.006`; `Math.floor(dt / period(n)) === laps`; the angle snapped to 15° is `deg`; `Number(dt.toPrecision(3)) === dt`; for each of `T(n) = 2π·a·n²/(v/n)` with a in {0.529, 0.53} × 10⁻¹⁰ m and v in {2.18, 2.19, 2.2} × 10⁶ m/s, and for `T(n) = 1.52e-16·n³`, the angle `frac(dt/T)·360` is within 5° of `deg`.
   - TWIN: `frac(k·na³/nb³)·360` equals `deg` to 1e-6, and `na < nb`.
   - ZOOM: `Math.floor(Math.log10(m·v·r/HBAR)) === b`, and the same for ħ in {1.05e-34, 1.0546e-34, 6.6e-34/2π, 6.63e-34/2π}; the mantissa `n/10^b` is between 1.3 and 8; `sci` of m, v and r reads back the stored value.
   - Every answer is strictly inside its dial (not 1 or 30, 0 or 345, 0 or 90) and is not the start; TRAP and TWIN answers are multiples of 15 from 30 to 330.
   - The three pools of each level share no answer (the sets in section 5.2).
3. **One winner**: for every row (and for n = 2 to 5 in level 1), scan every reachable value (k 1 to 30; deg 0 to 345 in 15s; z 0 to 90): exactly one passes `judge`, it is `answer(r)`, and the start fails. For level 4 also check that `1 ≤ n/10^z < 10` holds for exactly one z, and it is b.
4. **Rounds** over the 80 seeds: every level has 3 rounds of its kind with `assist` `[0, 1, 2]`; level 1 has three different n, increasing, from 2 to 5, with `say` `['level', 'excited', 'waves']`; in levels 2 to 4 round k's row is from pool k; the three answers of a level are always different; over the seeds each round slot sees at least two different answers.
5. **Classic mistakes fail**:
   - level 1: k = n (n times a₀) never wins;
   - level 2: for every row with n > 1, the angles from "speed grows with n" (`T = T1·n`) and from "the period grows as n²" (`T = T1·n²`), snapped to 15°, are not `deg`;
   - level 3: `frac(k·(na/nb)²)·360` snapped is not `deg`;
   - level 4: `Math.floor(Math.log10(m·v·r))` (forgetting ħ) and `Math.floor(Math.log10(m·v·r/6.6e-34))` (h instead of ħ) are not b.
6. **Outcomes**: for every reachable value, `outcome` is `win` only at the answer; level 1 gives `wide` above and `narrow` below; levels 2 and 3 give `passed` below and `early` above; level 4 gives `many` below and `few` above.
7. **Words**:
   - For every row and every wrong value, `missText` never contains the answer token: `` `${ringA(n * n).toFixed(2)} Å` `` (level 1), `` `${deg}°` `` (levels 2, 3), `` `×10${sup(b)}` `` (level 4), tested with a leading `(^|[^0-9.])`; it always contains the player's own value token; and it has the direction words (`closer in` / `farther out`, `already gone past` / `not reached`, `too many waves` / `less than one wave`).
   - `winText` contains `rₙ = n²a₀` (ring), `T = 2πr/v` (trap), `T ∝ n³` (twin), `n = mvr/ħ` (zoom).
   - `goal(r)` is at most 58 characters for every row and every level 1 round; `hintText` ends with the assist line of its round.
   - `helperLabel` describes the player's setting: for every round 1 row of TRAP (all within the first lap), the label at the answer angle holds `fmt(dt)`, and at any other angle it does not; for every TWIN row, the label at the answer holds `fmt((deg / 360) * (nb / na) ** 3)`, which is exactly k for the round 1 rows (B has not finished a lap); for level 1 the label at k = n² says `${n} waves: fits ✓`.
   - `MISS_LOOK` is exactly `{ streakOffset: 12, streakDeg: 40, trailDeg: 35, blurLines: 40, fewWaves: 0.3 }`, `HIT` is `[400, 52]`, `HANDLE_R` is at least 18, and every `REVEAL` is below its `DELAY`, every `DELAY` below 1.2.

### 9.2 `tests/bohr-orbits-ui.test.ts`

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch12-atoms/bohr-orbits/index';
import { DELAY, answer, buildRounds, goal, outcome, ringA, sup, type Round } from '../src/games/physics/class-12/ch12-atoms/bohr-orbits/logic';
import { onRing, ringPx, trapPx } from '../src/games/physics/class-12/ch12-atoms/bohr-orbits/art';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'bohr-orbits', 4);
const build = (level: number, seed: number) => buildRounds(level as 1 | 2 | 3 | 4, createRng(seed));
const FIRE = (level: number) => (level === 4 ? 'Zoom the scope to this power of ten' : 'Fire the flash and take the photo');
const TEST = 'Test flash: preview this setting (costs a charge)';
const wrong = (r: Round) => (r.kind === 'trap' || r.kind === 'twin' ? (answer(r) + 15) % 360 : answer(r) + 1);
shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => h.setSlider(answer(g[k])),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: (level) => h.click(FIRE(level)),
});
```

(`answer + 1` stays inside every dial: at most 26 in level 1 and 78 in level 4; `answer + 15` is at most 345.)

The canvas recorder must be installed **before** `h.start(...)`, because the engine takes the canvas context at mount (see `tests/bohr-ui.test.ts`, the old file, for the pattern, before you delete it). Then `describe('Snap the Electron', …)`:
- Each level has one slider: level 1 runs 1 to 30 and starts at 6; levels 2 and 3 run 0 to 345 in steps of 15 and start at 0; level 4 runs 0 to 90 and starts at 0.
- **Instant response**: one 50 ms frame after Fire, the phase is `resolve` and the drawn texts include `FLASH!` (levels 1 to 3) or `ZOOM!` (level 4).
- **The start never wins**: in every round of every level, firing at once costs a heart.
- **Test flash**: in round 1 it reads `/^Test flash/` and spends the charge, a second click gives `/No charges left/`; in round 3 the first click already gives `/No charges left/`.
- **Words**: a win says `Got it!` (levels 1 to 3) or `Counted!` (level 4); misses on each side give the direction words of 9.1 item 7.
- **The goal line** `goal(r)` is among the drawn texts in the first frame of every round.
- **Dragging**: level 1, `pointerdown` on the handle at (400 + ringPx(6), 186) and `pointermove` to (400 + ringPx(9), 186) sets the slider to 9; level 2, `pointerdown` on the camera at the gate `onRing(400, 190, trapPx(n), 0)` and `pointermove` to `onRing(400, 190, trapPx(n), 90)` sets 90, and to `onRing(…, 356)` sets 0 (the wrap).

`describe('Snap the Electron never leaks the answer', …)`:
- **Helper fading** (each level, with `HELPER = [/waves: (fits|no fit)/, /^first reaches here /, /^B first reaches here /, /^live view$/]` and `canvas.dataset.helper`): round 1 on; round 2 off; on 0.3 s after a test flash; off again 1.6 s after it; round 3 off, before and after clicking the test button.
- **Never during a miss**: in each round (round 1 included), a wrong setting fired and stepped to 2.0 s has the helper off and draws none of `HELPER`; the right setting fired and stepped past the reveal has it on.
- **No answer token is drawn before the player sets it**: for every round of every level, sweep every other dial value (and the start), stepping one frame each; no drawn text contains `` `${ringA(answer).toFixed(2)} Å` `` (level 1), `` `${answer}°` `` (levels 2, 3) or `` `×10${sup(answer)}` `` (level 4), with the leading `(^|[^0-9.])`, round 1's helper included except for level 1's own readout when the dial is on it. (In level 1 round 1 the helper label at the answer reads `n waves: fits ✓`, which holds no radius; that is allowed.)
- **Fixed misses**: two wrong settings on the same side (level 1: answer + 2 and + 4; levels 2 and 3: + 15° and + 30°, or − 15° and − 30° when the answer is above 300; level 4: answer + 1 and + 3, and − 1 and − 3) end, 2.0 s after Fire, on the same drawn texts except the player's own readout (no floater of this game holds a number).
- **The miss burst** `−1 ♥` is drawn at the same (x, y) for two different wrong settings in every level, and that point is not the answer's on-screen position.
- **The screen agrees with the rules**: `canvas.dataset.out` after the reveal equals `outcome` for, in level 1, every k from 1 to 30 (restart the level for each k, so hearts never run out); in levels 2 and 3, every angle for round 1 of seed 5; in level 4, z = 0, b − 1, b, b + 1 and 90.
- **Timing**: the verdict (the hearts or score change) lands at `DELAY[kind]` and not before; after 2.4 s the phase has left `resolve`.

## 10. Traps to avoid

- **The electron is invisible.** Never draw it, its orbit (level 1) or a moving dot on the orbit (levels 2, 3) before the reveal of a winning photo. The level 2 and 3 band, sparkles and countdown bar are deliberately static or fixed-speed: if anything moved at the electron's rate, the player could time the answer by eye.
- **Level 1's dial is in steps of a₀**, not in ångström. The judge is `k === n * n`. The readout shows `ringA(k).toFixed(2)` Å. Do not switch to a 0.01 Å step: that would allow many winners and would be undraggable.
- **The wave preview uses N = √k** (the matter waves of an orbit of that radius, with the speed such an orbit would have). Using k/n or a fixed wavelength would show false "fits" at 3a₀, 6a₀, …
- **Angles are clockwise from 12 o'clock** (`onRing`). The canvas `arc` call needs `(deg − 90)·π/180`. A drag at 352.5° or more wraps to 0.
- **Direction words**: a camera angle **smaller** than the answer means the electron had already gone past (`passed`, "try a larger angle"); a larger one means it had not arrived (`early`, "try a smaller angle"). Both are measured from the gate on the final lap. Do not phrase it as "toward the gate".
- **Level 3's counter** must not blink per lap. It counts with digits; the LED stays lit.
- **Level 4**: the answer is the stored `b`. On a miss the window shows the fixed blur or the fixed 0.3-wave curve, never `strip` with the true count. Only the round 1 live view (and a paid flash in round 2) draws the true count for the player's zoom, and it draws no number.
- **Numbers on screen**: no tick or track labels. The level 4 track has only `−` and `+`.
- **Floats**: every dial value is an integer, so compare with `===`.
- **Timing**: every animation ends by 2.3 s; the latest verdict is 1.1 s.
- **Comfort and motion**: washes at most 0.35 alpha and short; Pico's LED 2 Hz, the REC dot 1 Hz; with reduced motion halve the washes, skip the somersault (thumbs-up instead) and keep the zoom rectangles still.
- **Names on screen**: no trademarked game or character names. The inspirations go only in the comment at the top of `index.ts`.
- **The old tests**: delete `tests/bohr-ui.test.ts`; rewrite `logic.test.ts` from section 9.1. The old leak-fix tests are replaced, not ported.
- **The harness** fakes a 3-level manifest; level 4 still mounts (it only reads `ctx.level`), so pass `4` as `levelCount` to `arcadeHarness`.
- **Docs**: do not edit `docs/curriculum/physics-class-12/ch12-concept-weights.md` or `rebuilds/README.md`; the reviewer updates them after the build.
