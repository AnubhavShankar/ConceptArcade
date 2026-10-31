# Ch 5 · Magnet Dipole Bench rebuilt as "Pebble in Orbit" (§5.2.3, 5.2.4; Examples 5.1(b), 5.2; Ex 5.1, 5.2, 5.4, 5.5, 5.6)

Read `../README.md` first (above all "A miss must not show the answer either" and the "UX checklist"), then `README.md` in this folder. Everything below is required unless marked optional. The model brief is `../20-capacitor-bench.md`; its code is in `src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-bench/`.

The old Dipole Bench was a typing quiz (type m, type U, type the work, type the force, pick letters). This brief **replaces the whole game** with an arcade game in Earth orbit. It keeps the same id, folder and `order`, and all five levels.

## 1. Identity

| Field | Value |
|---|---|
| Game id | `magnet-dipole-bench` (unchanged) |
| Folder | `src/games/physics/class-12/ch05-magnetism-and-matter/magnet-dipole-bench/` (existing) |
| Files | **Replace** `game.json` with `docs/curriculum/gap-designs/rebuilds/json/magnet-dipole-bench.json` (copy exactly). **Delete and rewrite** `logic.ts`, `logic.test.ts`, `index.ts`. **Add** `art.ts` (drawing) and `take.ts` (the pure poses and floaters of each take, as built). |
| UI test | **Delete** `tests/magnetdipole-ui.test.ts`. **Create** `tests/magnet-dipole-bench-ui.test.ts`. |
| Engine | `mountDialLevel` from `@core/dialgame`, one `DialLevel` per level (5 levels) |
| Book coverage | §5.2.3 (τ = m × B, U = −m·B, stable at 0°, unstable at 180°), §5.2.4 and Table 5.1 (axial field 2k along m, equatorial field k against m), Example 5.1(b) (uniform field: torque, no force; non-uniform: a force too), Example 5.2 (two small magnets: equilibrium, stability, lowest energy), Ex 5.1 (m from τ), Ex 5.2 (U stable and unstable), Ex 5.5 (work to 90° and 180°, torque there), Ex 5.4 and 5.6 (m = NIA of a solenoid, its torque, no net force) |
| Inspiration (code comment only) | Real CubeSat magnetorquers (student satellites steer with magnet rods and coils against Earth's field), real magnetic detumbling, and the docking games of space simulators (line up, ease in, hold). Level 3 borrows the "golf power meter" loop: one kick, coast to rest on the spot. |
| Core verb | **Steer a satellite by its magnet**: set the magnet rod's strength (levels 1 and 3), rotate the satellite to a heading (level 2), set the coil current and the station-keeping thruster (level 4), place the twin satellite at a port and turn it (level 5). Then command the burn and watch Pebble turn, hold, tip or drift. No other chapter 5 game rotates or steers. |

Nothing outside the old game and `tests/magnetdipole-ui.test.ts` imports the old `logic.ts` (checked 2026-10-31 with a search for `magnet-dipole-bench/logic`). Search again before deleting.

## 2. What the student learns

- A magnet (or a current coil) in a uniform field B feels a torque τ = mB sin θ, where θ is the angle between m and B. The torque is zero at θ = 0 and θ = 180°, and largest at 90°.
- Its potential energy is U = −mB cos θ. It is lowest (−mB) along the field, the **stable** equilibrium, and highest (+mB) against the field, the **unstable** one. A magnet's moment points from its S end to its N end.
- The work an outside agent does to turn the magnet is the rise in U: from along the field to 90° it is mB, and to 180° it is 2mB. At 180° the torque is zero even though work was needed to get there.
- A coil (solenoid) has m = NIA, with A in m² (1 cm² = 10⁻⁴ m²).
- In a uniform field the forces on the two ends of a magnet or coil cancel, so there is a torque but no net force. In a non-uniform field there is a net force too.
- The field of a small magnet P is 2k on its axis, pointing along m_P, and k on the line through its middle at right angles, pointing against m_P (k = μ₀m/4πr³). A second magnet Q has U = −m_Q·B_P: in equilibrium when it lies along or against that field, stable when along it, and lowest of all on P's axis, parallel to P.

## 3. The mechanic, physically

**Pebble** is a shoebox-sized student satellite (a CubeSat) in low Earth orbit. It has no fuel for turning. To steer, it switches on a **magnet rod** (an electromagnet whose moment m it can set) or, in level 4, a flat **magnetorquer coil**, and Earth's magnetic field (a few tens of µT, uniform across the little satellite) turns it. Mission control on the ground commands each manoeuvre; the player is mission control.

Units everywhere: m in J/T (the same as A m²), B in µT, so τ = mB sin θ comes out in µN m and U = mB in µJ. Currents in mA, coil areas in cm².

| Level | The player sets | What decides the manoeuvre |
|---|---|---|
| 1 Stop the spin | the rod's moment m | Pebble is tumbling. One short burn at a known angle θ to the field must give exactly the torque τ that stops the spin: m = τ/(B sin θ). |
| 2 Park it | Pebble's heading | During the eclipse the power is off, so only the field holds Pebble. The heading must be torque-free and, depending on the plan, stable (it rides out a bump) or unstable (it flips on command). |
| 3 Coast to the target | the rod's moment m | One reaction-wheel kick of fixed energy W turns Pebble from along the field. It must coast to rest exactly at 90° (W = mB) or 180° (W = 2mB) from the field. |
| 4 Coil near the station | the coil current I and the station-keeping thruster | The coil's moment m = NIA must give the turn's torque. In a uniform field the thruster must stay off; near the space station's docking magnet (a non-uniform field) it must be on to hold Pebble in place. |
| 5 Twin dock | the port where the twin Grit docks, and which way Grit points | Grit must sit in Pebble's field the way the docking plan needs: stable, unstable, or the lowest energy of all. |

Consequences (each miss shows only what the player's own setting did, with fixed sizes):
- **Still spinning / spinning back** (level 1): after the burn Pebble keeps turning at a fixed 40% of its old spin rate, the same way (too little torque) or the other way (too much).
- **Torque** (level 2): Pebble swings a fixed 25° off its heading, toward the field side, with a `TORQUE` floater.
- **Tipped over** (levels 2 and 5): it holds still, the bump comes, and it tips a fixed 60° and tumbles out of view of mission control (the LEDs go dizzy).
- **Won't flip** (levels 2 and 5): on the release command it only wobbles ±8° and settles back.
- **Stopped short** (levels 3 and 4): it turns a fixed 60% of the way to the target, stops and swings back.
- **Overshot** (levels 3 and 4): it turns a fixed 30% past the target (level 3 with target 180°: it tumbles on through 230°).
- **Drifted** (level 4): with the thruster on in a uniform field, Pebble slides a fixed 40 px out of its slot. **Pulled in**: with the thruster off near the station, Pebble slides a fixed 40 px toward the station and clanks against the truss.
- **Hatch shut** (level 5): Grit bumps the closed hatch of the wrong port and bounces back. **Pulled loose** (level 5): Grit sits stable at the side port, but the pull test tugs it a fixed 30 px away.
- **Win**: the spin stops dead; Pebble parks and rides out the bump (or flips on cue); it coasts to rest exactly on the guide star; it turns onto the guide star and holds its slot; Grit docks and holds (or springs away on cue).

**Fixed sizes.** No miss animation depends on how far the player's setting is from the answer. Every swing, tip, overshoot and drift above is a fixed number.

## 4. Story and characters

Hero banner: `name: 'Pebble'`, `role: 'a shoebox-sized student satellite that steers with a magnet rod against Earth’s magnetic field'`.

| Level | story | objective |
|---|---|---|
| 1 | `Pebble has just been thrown out of the rocket and is tumbling. It has no fuel: it steers with a magnet rod whose moment m it can set. In Earth’s field the rod feels a torque τ = mB sin θ, largest at right angles to the field and zero along it. One short burn at a known angle must give exactly the torque that stops the spin.` | `Set the rod’s moment so the burn stops the spin dead, in three passes.` |
| 2 | `Night is coming: in Earth’s shadow Pebble switches everything off, and only the field holds it. The torque is zero along the field and against it, but the energy U = −mB cos θ is lowest along it (stable) and highest against it (unstable). The moment points from the rod’s S end to its N end. Some passes need a heading that rides out a bump, others one that flips on command.` | `Turn Pebble to the heading the plan needs, so it holds or flips as planned, in three passes.` |
| 3 | `To turn without fuel Pebble kicks its reaction wheel once and coasts. Turning from along the field takes energy: mB to reach 90° and 2mB to reach 180°, the rise in U. The kick’s energy is fixed, so Pebble sets its rod’s strength to come to rest exactly on the guide star. At 90° the field still pulls back with a torque; at 180° the torque is zero.` | `Set the rod’s moment so Pebble coasts to rest on the guide star, in three passes.` |
| 4 | `Pebble’s second steering tool is a flat coil, a magnet with m = NIA, its area in cm² (1 cm² = 10⁻⁴ m²). In a uniform field the forces on the coil cancel: a torque, but no net force. Near the space station’s big docking magnet the field is far from uniform, and the coil is pulled too, so Pebble must fire its station-keeping thruster to stay in its slot.` | `Set the coil current and the thruster so Pebble turns onto the guide star and keeps its slot, in three passes.` |
| 5 | `Pebble’s twin, Grit, docks beside it, two small magnets together. On Pebble’s axis (the nose port) Pebble’s field is 2k and points the same way as Pebble; on the line through its middle (the side port) it is k and points the opposite way. Grit has U = −m·B: torque-free along or against that field, stable along it.` | `Dock Grit at the right port, pointing the right way, for each docking plan, in three passes.` |

Characters (each in its own function in `art.ts`, AGENTS.md item 17):
- **Pebble** (hero) floats at `PEB` (300, 170), drawn rotated by its heading.
  - Body: a 56 × 56 cube seen face-on, gold-foil sides (`#d9a441` with a few crinkle lines in `#b8862e`), a dark front panel 40 × 40 (`#1a2040`). Two blue solar-panel wings (each 52 × 22, `#2a4fbf` with a 4 × 2 grid of cell lines in `#6f8ff0`) on short struts left and right. A whip antenna 26 px long from the top corner with a red tip.
  - The camera: a round lens (r 7, `#0d0f1a` with a cyan glint) on the body's camera side (the right side when the heading is 0°). A short white tick beside it marks "camera".
  - The magnet rod (levels 1, 2, 3 and 5): a bar 44 × 8 across the front panel, one half `#e0453a` stamped `N` (11 px, white), the other half `#e8e4d8` stamped `S` (11 px, dark). Which end is N comes from the round (level 2 `rod`), else the N end is on the camera side.
  - The coil (level 4): a copper rectangle loop 40 × 30 (`#c87533`, 3 px) on the front panel with three thin winding lines inside it.
  - The face: two round LED eyes (r 4) and a mouth of five LED dots on the front panel, above the rod.
  - Idle: bobs ±2 px (`sin(t·1.6)·2`), the panels glint (a white highlight sweeps across each wing every 2 s), the antenna tip blinks red every 1.5 s, the LED eyes blink every 3 s.
  - Action (on fire): levels 1 and 3 and 4, the rod or coil glows `PAL.orange` (a 6 px glow) for the burn, with a `BURN` floater (level 3: `KICK`, and a white flash ring at the body centre for the reaction wheel); level 2, four tiny white thruster puffs at the corners and a `PARKED` floater; level 5, Pebble's LEDs turn toward Grit (the eyes shift 2 px).
  - Moods (LED colours, drawn by hand): **happy** green eyes and a smile while waiting; **cheer** cyan eyes as upturned arcs, a wide smile, and the wings flap ±10° twice on a win; **worried** amber eyes, a flat mouth and a small amber `!` beside the head on a stop-short, overshoot, drift, won't-flip or hatch-shut miss; **dizzy** spiral eyes after a tip-over or a spin-back, with three tiny yellow `✦` circling at radius 34.
- **Grit** (level 5, the target): Pebble's twin, the same drawing at 0.8 scale with green wings (`#2f9e5b`) and its own rod with `N` and `S`. It flies in from the right edge to the chosen port.
  - Idle: hovers off to the right at (600, 150) before the dock, bobbing out of phase with Pebble.
  - Moods as Pebble's (happy, cheer, worried, dizzy). On a win it winks (one eye closes for 0.3 s).
- **Dele, CAPCOM** (NPC) sits in the mission-control window `GROUND` at the top left.
  - Gear: headset with boom mic, a navy polo with a round mission patch, a coffee mug, two small monitors in front of him (one shows a tiny green sine wave).
  - Idle: sips the coffee every 5 s (the mug rises to his mouth over 0.4 s), blinks every 3 s.
  - On fire: leans to the mic, with a floater from the window: `Burn!` (levels 1, 3, 4), `Park it` (2), `Dock!` (5).
  - Win: both fists up and a `Nice!` floater. Miss: hands on his head, with an `Uh-oh` floater.
- **The space station** (level 4 rounds with `uniform: false` only): a truss along the right edge (x 470 to 640, y 120 to 220, grey girders with blue solar panels) holding a big red-and-grey **docking magnet ring** (outer radius 30) at (520, 170). Its field lines bend toward the ring. In uniform rounds the station is not drawn.
- **The guide star** (levels 3 and 4): a bright white four-point star with a soft glow, at 120 px from `PEB` in the target direction, with a dashed ring (r 12) round it. It is a given fact (it shows where Pebble must end up, never the dial value).

## 5. Rules (`logic.ts`)

### 5.1 Constants and types

```ts
import { aid } from '@core/dialgame';
import { fmt, sgn } from '@core/judge';
import { pick } from '@core/quiz';

export const rad = (deg: number) => (deg * Math.PI) / 180;
export const ARROW = ['→', '↑', '←', '↓'] as const; // quarter turns, anticlockwise on screen from →

export interface SpinRow { b: number; th: number; tau: number; m: number }                  // answer m (J/T)
export interface ParkRow { phi: number; rod: 0 | 180; goal: 'stable' | 'unstable'; m: number; b: number } // answer: heading
export interface SwingRow { target: 90 | 180; b: number; w: number; m: number }             // answer m (J/T)
export interface CoilRow { n: number; a: number; b: number; th: number; uniform: boolean; tau: number; i: number } // answer i (mA), thruster
export interface DockRow { pDir: 0 | 1 | 2 | 3; goal: 'stable' | 'unstable' | 'lowest'; port: 'nose' | 'side' | 'any' } // answer: port, q

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'spin'; assist: Assist } & SpinRow)
  | ({ kind: 'park'; assist: Assist } & ParkRow)
  | ({ kind: 'swing'; assist: Assist } & SwingRow)
  | ({ kind: 'coil'; assist: Assist } & CoilRow)
  | ({ kind: 'dock'; assist: Assist } & DockRow);
```

- `b` is Earth's field at Pebble in µT; `th` the angle between m and B in degrees; `tau` the needed torque in µN m as shown (3 significant figures); `w` the kick's energy in µJ.
- Level 2: `phi` is the field direction on screen (degrees, anticlockwise from →); `rod` is where the rod's N end points relative to the camera (0: on the camera side; 180: opposite it). The player's heading `h` is the camera's direction, so the N end points at `h + rod`.
- Level 4: `n` turns, `a` the area of one turn in cm², `i` the answer in mA; `uniform` false means the round is next to the station's docking magnet.
- Level 5: `pDir` is Pebble's moment as a quarter turn (0 →, 1 ↑, 2 ←, 3 ↓). The nose port is 92 px from `PEB` along Pebble's moment; the side port is 92 px from `PEB` a quarter turn anticlockwise from it.

### 5.2 The pools (copy exactly)

Every row was checked by `check-dipole-orbit.mjs` on 2026-10-31 (section 9 lists the checks; they must also be in `logic.test.ts`).

```ts
export const SPIN: SpinRow[][] = [
  [{ b: 30, th: 30, tau: 24, m: 1.6 }, { b: 40, th: 30, tau: 24, m: 1.2 }, { b: 50, th: 30, tau: 20, m: 0.8 }, { b: 25, th: 30, tau: 30, m: 2.4 }],
  [{ b: 40, th: 60, tau: 48.5, m: 1.4 }, { b: 30, th: 60, tau: 52, m: 2.0 }, { b: 50, th: 60, tau: 43.3, m: 1.0 }, { b: 20, th: 60, tau: 45, m: 2.6 }],
  [{ b: 40, th: 45, tau: 84.9, m: 3.0 }, { b: 25, th: 45, tau: 31.8, m: 1.8 }, { b: 50, th: 45, tau: 77.8, m: 2.2 }, { b: 30, th: 45, tau: 12.7, m: 0.6 }],
];

// Answers (heading h): r1 45, 165, 255, 300; r2 15, 120, 195, 330; r3 75, 150, 240, 285.
export const PARK: ParkRow[][] = [
  [{ phi: 45, rod: 0, goal: 'stable', m: 0.8, b: 30 }, { phi: 165, rod: 0, goal: 'stable', m: 1.2, b: 40 }, { phi: 255, rod: 0, goal: 'stable', m: 0.6, b: 50 }, { phi: 300, rod: 0, goal: 'stable', m: 1.0, b: 30 }],
  [{ phi: 195, rod: 0, goal: 'unstable', m: 0.8, b: 40 }, { phi: 300, rod: 0, goal: 'unstable', m: 0.6, b: 30 }, { phi: 15, rod: 0, goal: 'unstable', m: 1.2, b: 50 }, { phi: 150, rod: 0, goal: 'unstable', m: 1.0, b: 40 }],
  [{ phi: 255, rod: 180, goal: 'stable', m: 0.8, b: 50 }, { phi: 330, rod: 180, goal: 'stable', m: 1.2, b: 30 }, { phi: 60, rod: 180, goal: 'stable', m: 0.6, b: 40 }, { phi: 105, rod: 180, goal: 'stable', m: 1.0, b: 50 }],
];

export const SWING: SwingRow[][] = [
  [{ target: 90, b: 30, w: 36, m: 1.2 }, { target: 90, b: 40, w: 64, m: 1.6 }, { target: 90, b: 25, w: 70, m: 2.8 }, { target: 90, b: 50, w: 40, m: 0.8 }],
  [{ target: 180, b: 30, w: 84, m: 1.4 }, { target: 180, b: 40, w: 48, m: 0.6 }, { target: 180, b: 20, w: 88, m: 2.2 }, { target: 180, b: 50, w: 100, m: 1.0 }],
  [{ target: 180, b: 25, w: 150, m: 3.0 }, { target: 90, b: 20, w: 68, m: 3.4 }, { target: 90, b: 45, w: 90, m: 2.0 }, { target: 180, b: 35, w: 126, m: 1.8 }],
];

export const COIL: CoilRow[][] = [
  [{ n: 500, a: 80, b: 40, th: 30, uniform: true, tau: 16, i: 200 }, { n: 400, a: 50, b: 30, th: 90, uniform: true, tau: 18, i: 300 },
   { n: 250, a: 100, b: 50, th: 30, uniform: true, tau: 22.5, i: 360 }, { n: 800, a: 25, b: 40, th: 60, uniform: true, tau: 9.7, i: 140 }],
  [{ n: 600, a: 40, b: 60, th: 30, uniform: false, tau: 18.7, i: 260 }, { n: 300, a: 60, b: 50, th: 60, uniform: false, tau: 31.2, i: 400 },
   { n: 1000, a: 20, b: 80, th: 30, uniform: false, tau: 14.4, i: 180 }, { n: 450, a: 80, b: 40, th: 90, uniform: false, tau: 17.3, i: 120 }],
  [{ n: 1200, a: 30, b: 45, th: 30, uniform: true, tau: 17.8, i: 220 }, { n: 700, a: 50, b: 35, th: 60, uniform: false, tau: 36.1, i: 340 },
   { n: 350, a: 70, b: 55, th: 90, uniform: true, tau: 62, i: 460 }, { n: 900, a: 35, b: 30, th: 30, uniform: false, tau: 23.6, i: 500 }],
];

// Answers (port, q): r1 side with q = pDir + 2; r2 nose with q = pDir + 2; r3 nose with q = pDir.
export const DOCK: DockRow[][] = [
  [{ pDir: 0, goal: 'stable', port: 'side' }, { pDir: 1, goal: 'stable', port: 'side' }, { pDir: 2, goal: 'stable', port: 'side' }, { pDir: 3, goal: 'stable', port: 'side' }],
  [{ pDir: 0, goal: 'unstable', port: 'nose' }, { pDir: 1, goal: 'unstable', port: 'nose' }],
  [{ pDir: 0, goal: 'lowest', port: 'any' }, { pDir: 1, goal: 'lowest', port: 'any' }],
];
```

The pools of one level never share an answer, so the three rounds of a level always have three different answers (tested).

### 5.3 Physics, rounds and judging

```ts
export const DIAL = {
  m: { min: 0.2, max: 4, step: 0.2, start: 0.2 },  // levels 1 and 3, J/T
  h: { min: 0, max: 345, step: 15, start: 90 },     // level 2, degrees
  i: { min: 20, max: 600, step: 20, start: 20 },    // level 4, mA
  thr: { min: 0, max: 1, start: 0 },                // level 4: 0 off, 1 on
  port: { min: 0, max: 1, start: 0 },               // level 5: 0 nose, 1 side
  q: { min: 0, max: 3 },                            // level 5: start (pDir + 1) % 4, always across the field
};
export const VERDICT = { spin: 1.0, park: 1.7, swing: 1.3, coil: 1.3, dock: 1.6 } as const;
export const FIXED = { spinLeft: 0.4, swingOff: 25, tip: 60, wobble: 8, short: 0.6, over: 0.3, drift: 40, loose: 30 } as const;

const mod = (x: number, n: number) => ((x % n) + n) % n;
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

export const spinTau = (r: SpinRow, m: number) => m * r.b * Math.sin(rad(r.th));
/** Level 2: the angle (0 to 345) from the field to the rod's N end for heading h. */
export const parkTheta = (r: ParkRow, h: number) => mod(h + r.rod - r.phi, 360);
export const parkAnswer = (r: ParkRow) => mod(r.phi - r.rod + (r.goal === 'unstable' ? 180 : 0), 360);
/** Level 2: τ (µN m, never negative) and U (µJ) at the angle th. `clean` stops sin 180° = 1.2e-16 printing as 1.47 × 10⁻¹⁵ (added by the 2026-10-31 review). */
const clean = (x: number) => (Math.abs(x) < 1e-9 ? 0 : x);
export const parkTau = (r: ParkRow, th: number) => clean(Math.abs(r.m * r.b * Math.sin(rad(th))));
export const parkU = (r: ParkRow, th: number) => clean(-r.m * r.b * Math.cos(rad(th)));
/** Level 3: where the kick brings Pebble to rest, in degrees from the field, or Infinity if it tumbles right over. */
export function stopAt(r: SwingRow, m: number) {
  const c = 1 - r.w / (m * r.b);
  if (c < -1 - 1e-9) return Infinity;
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}
export const coilM = (r: CoilRow, i: number) => r.n * (i / 1000) * r.a * 1e-4;   // J/T
export const coilTau = (r: CoilRow, i: number) => coilM(r, i) * r.b * Math.sin(rad(r.th)); // µN m
/** Level 5: the direction (quarter turn) of Pebble's field at a port: along Pebble at the nose, against it at the side. */
export const fieldAt = (r: DockRow, port: number) => (port === 0 ? r.pDir : mod(r.pDir + 2, 4));
/** Level 5: Grit's energy in units of k = μ₀m²/4πr³: −2 or +2 at the nose, −1 or +1 at the side, 0 across the field. */
export function dockU(r: DockRow, port: number, q: number) {
  const rel = mod(q - fieldAt(r, port), 4);
  const size = port === 0 ? 2 : 1;
  return rel === 0 ? -size : rel === 2 ? size : 0;
}
export const dockAnswer = (r: DockRow) =>
  r.goal === 'stable' ? { port: 1, q: mod(r.pDir + 2, 4) } : r.goal === 'unstable' ? { port: 0, q: mod(r.pDir + 2, 4) } : { port: 0, q: r.pDir };

export function buildRounds(level: 1 | 2 | 3 | 4 | 5, random: () => number): Round[] {
  const pools = [SPIN, PARK, SWING, COIL, DOCK][level - 1] as unknown[][];
  const kind = (['spin', 'park', 'swing', 'coil', 'dock'] as const)[level - 1];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

export type Fault = 'low' | 'high' | 'swing' | 'flip' | 'steady' | 'short' | 'over' | 'drift' | 'pulled' | 'closed' | 'torque' | 'loose';
export type Values = { m?: number; h?: number; i?: number; thr?: number; port?: number; q?: number };

export function fault(r: Round, x: Values): Fault | null {
  switch (r.kind) {
    case 'spin':
      return near(x.m!, r.m) ? null : x.m! < r.m ? 'low' : 'high';
    case 'park': {
      const th = parkTheta(r, x.h!);
      if (th !== 0 && th !== 180) return 'swing';
      if (r.goal === 'stable') return th === 0 ? null : 'flip';
      return th === 180 ? null : 'steady';
    }
    case 'swing':
      return near(x.m!, r.m) ? null : x.m! > r.m ? 'short' : 'over';
    case 'coil': {
      const thrNeeded = r.uniform ? 0 : 1;
      if (x.thr !== thrNeeded) return r.uniform ? 'drift' : 'pulled';
      return x.i === r.i ? null : x.i! < r.i ? 'short' : 'over';
    }
    case 'dock': {
      const port = x.port!;
      if ((r.port === 'nose' && port !== 0) || (r.port === 'side' && port !== 1)) return 'closed';
      const u = dockU(r, port, x.q!);
      if (u === 0) return 'torque';
      if (r.goal === 'stable') return u < 0 ? null : 'flip';
      if (r.goal === 'unstable') return u > 0 ? null : 'steady';
      if (u > 0) return 'flip';
      return port === 0 ? null : 'loose';
    }
  }
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;
```

- Level 1: a larger m than the answer gives too much torque (`high`, the spin reverses); a smaller one too little (`low`).
- Level 3: a **larger** m makes the field take the kick's energy sooner, so Pebble stops **short**; a smaller m lets it **overshoot**. Dial values are multiples of 0.2 snapped by the engine, so compare with `near`, never `===`.
- Level 4: the thruster is checked first (a wrong thruster ruins the slot whatever the current); then the current. Currents are whole numbers of mA, so `===` is safe.
- Level 5: the port is checked first (a shut hatch), then whether Grit is across the field (torque), then stability.
- `buildRounds` must be the **first** use of `random` in the level.
- Start settings: level 1 and 3 `m = 0.2`; level 2 `h = 90`; level 4 `i = 20`, `thr = 0`; level 5 `port = 0`, `q = (pDir + 1) % 4` (a function of the round: `start: (r) => (r.pDir + 1) % 4`). None of them wins on any row (tested).

### 5.4 Words

Use `fmt` from `@core/judge` (3 significant figures) for every computed number. `angleOf(th)` is the angle between m and B folded into 0 to 180 (`th <= 180 ? th : 360 - th`). `kText(u)` writes Grit's energy: `−2k`, `−k`, `0`, `+k`, `+2k` (true minus sign).

**`goalText(r)`** (the one-line goal on the canvas, section 6.7 item 1; every one is at most 44 characters):
- spin: `` `Stop the spin: burn ${r.tau} µN m` ``
- park: `'Park Pebble so a bump can’t tip it'` (stable) or `'Park Pebble balanced, ready to flip'` (unstable)
- swing: `` `Coast to ${r.target}° on one ${r.w} µJ kick` ``
- coil: `` `Turn to the star: burn ${r.tau} µN m` ``
- dock: `'Dock Grit at the side port, stable'` (stable), `'Dock Grit at the nose port, ready to flip'` (unstable), `'Dock Grit with the lowest energy'` (lowest)

**`intel(r)`** (the round's facts):
- spin: `` `Pebble is tumbling. The rod fires when it is at ${r.th}° to Earth’s ${r.b} µT field, and the burn must give a torque of ${r.tau} µN m to stop the spin.` ``
- park: `` `The rod is ${r.m} J/T in a ${r.b} µT field, with its N end ${r.rod === 0 ? 'on the camera side' : 'opposite the camera'}. In the eclipse only the field holds Pebble. ${r.goal === 'stable' ? 'It must ride out a bump from a speck of dust.' : 'It must sit torque-free at its highest energy, ready to flip on command.'}` ``
- swing: `` `Pebble starts with its rod along Earth’s ${r.b} µT field. One reaction-wheel kick gives it ${r.w} µJ, and it must come to rest at ${r.target}° from the field, on the guide star.` ``
- coil: `` `The coil has ${r.n} turns of ${r.a} cm² each, at ${r.th}° to a ${r.b} µT field ${r.uniform ? 'that is uniform out here' : 'next to the station’s docking magnet, where it is far from uniform'}. The turn needs ${r.tau} µN m.` ``
- dock: `` `Pebble points ${ARROW[r.pDir]}. ${r.goal === 'stable' ? 'Grit docks at the side port and must stay put when bumped.' : r.goal === 'unstable' ? 'Grit docks at the nose port, torque-free but ready to spring away on a nudge.' : 'Grit may use either port: the plan wants the lowest energy, the tightest dock of all.'}` ``

**Hint line** (`hint`): `` `${intel(r)} ${r.assist === 0 ? 'Round 1: telemetry is live.' : r.assist === 1 ? 'Telemetry is off: a check costs a charge.' : 'Boss pass: no telemetry.'}` ``

**`missText(r, x)`** (what the player's setting did and what to change, never the answer):
- spin low: `` `With m = ${x.m} J/T the burn’s torque was too small: Pebble is still spinning the same way. Use a stronger rod.` ``
- spin high: `` `With m = ${x.m} J/T the burn’s torque was too big: Pebble now spins the other way. Use a weaker rod.` ``
- park swing: `` `At ${x.h}° the rod was at an angle to the field, so the torque mB sin θ swung Pebble away. Park where the torque is zero.` ``
- park flip: `` `At ${x.h}° the torque was zero, but the rod’s N end pointed against the field: the bump tipped Pebble over. That balance is unstable.` ``
- park steady: `` `At ${x.h}° Pebble was torque-free but at its lowest energy, so on the command it only wobbled back. The plan needs the torque-free heading with the highest energy.` ``
- swing short: `` `With m = ${x.m} J/T the field soaked up the kick too soon: Pebble stopped short of ${r.target}° and swung back. Use a weaker rod.` ``
- swing over: `` `With m = ${x.m} J/T the kick had energy to spare: Pebble went past ${r.target}°${r.target === 180 ? ' and tumbled right over' : ''}. Use a stronger rod.` ``
- coil drift: `'In a uniform field the forces on the coil cancel, so there was nothing to hold against: the thruster pushed Pebble out of its slot. Out here it needs no thrust.'`
- coil pulled: `'Next to the docking magnet the field is not uniform, so it pulled on the coil and Pebble clanked into the truss. Hold the slot with the thruster.'`
- coil short: `` `${x.i} mA gave the coil too small a moment: Pebble stopped short of the guide star. More current.` ``
- coil over: `` `${x.i} mA gave the coil too big a moment: Pebble swung past the guide star. Less current.` ``
- dock closed: `'That port’s hatch was shut, and Grit bounced off it. Dock at the port the plan names.'`
- dock torque: `'Grit pointed across Pebble’s field at that port, so a torque turned it: not in equilibrium. Line Grit up with the field there.'`
- dock flip: `'Grit was torque-free but pointed against Pebble’s field there: the bump flipped it over. That is unstable.'`
- dock steady: `'Grit was torque-free and stable there, so on the release it only wobbled. The plan needs the torque-free way with the higher energy.'`
- dock loose: `'Grit was stable at the side port, but Pebble’s field there is only half as strong, and the pull test tugged it loose. Find the deeper energy.'`

The drift, pulled, closed and all dock texts never print the player's current, port or direction, because those may equal the answer.

**`checkText(r, x)`** (the paid check, a charge):
- spin: `` `Check: m = ${x.m} J/T at ${r.th}° gives τ = ${fmt(spinTau(r, x.m))} µN m.` ``
- park: `` `Check: at ${x.h}° the rod is ${angleOf(th)}° from the field: τ = ${fmt(parkTau(r, th))} µN m, U = ${sgn(parkU(r, th))} µJ.` `` with `th = parkTheta(r, x.h)`; `sgn` is exported by `@core/judge` and writes a true minus sign `−` (add it to the import in 5.1). Never call `fmt` on the raw `Math.sin` product: at 180° it prints 1.47 × 10⁻¹⁵.
- swing: `` `Check: with m = ${x.m} J/T the kick would ${s === Infinity ? 'tumble Pebble right over' : `bring Pebble to rest at ${Math.round(s)}° from the field`}.` `` with `s = stopAt(r, x.m)`.
- coil: `` `Check: m = NIA = ${fmt(coilM(r, x.i))} J/T, so τ = ${fmt(coilTau(r, x.i))} µN m.` ``
- dock: `` `Check: at the ${x.port ? 'side' : 'nose'} port Pebble’s field points ${ARROW[fieldAt(r, x.port)]}. Grit pointing ${ARROW[x.q]} has U = ${kText(dockU(r, x.port, x.q))}${dockU(r, x.port, x.q) === 0 ? ' and a torque on it' : ' and no torque'}.` ``

**`tlmText(r, v)`** (the live telemetry box, section 6.2; at most 28 characters):
- spin: `` `τ ${fmt(spinTau(r, v.m))} µN m` ``
- park: `` `θ ${angleOf(th)}° · τ ${fmt(…)} · U ${fmt(…)}` `` (the same numbers as `checkText`)
- swing: `` s === Infinity ? 'tumbles over' : `rests at ${Math.round(s)}°` ``
- coil: `` `m ${fmt(coilM(r, v.i))} · τ ${fmt(coilTau(r, v.i))} µN m` ``
- dock: `` `U ${kText(u)} · τ ${u === 0 ? '≠ 0' : '0'}` ``
- `TLM_OFF = '— — —'`

**`winText(r)`** (two or three short sentences):
- spin: `` `Spin stopped! τ = mB sin θ, so m = τ/(B sin θ) = ${r.tau} ÷ (${r.b} × sin ${r.th}°) = ${r.m} J/T. The torque is largest at right angles to the field and zero along it.` ``
- park stable: `` `Parked! The torque mB sin θ is zero at 0° and at 180°. With the N end along the field, U = −mB = −${fmt(r.m * r.b)} µJ, the lowest, so a bump only makes Pebble wobble back; at 180° U = +${fmt(r.m * r.b)} µJ and a bump tips it over.` ``
- park unstable: `` `Balanced! With the N end against the field, θ = 180°: no torque, but U = +mB = +${fmt(r.m * r.b)} µJ, the highest, so the gentlest nudge flips it, as planned. Along the field U = −mB is the stable one.` ``
- swing 90: `` `Locked on! Turning from along the field to 90° costs W = U(90°) − U(0°) = 0 − (−mB) = mB, so m = W/B = ${r.w} ÷ ${r.b} = ${r.m} J/T. At 90° the field still pulls back with τ = mB = ${r.w} µN m, so the star lock holds Pebble there.` ``
- swing 180: `` `Balanced! Turning to 180° costs W = (+mB) − (−mB) = 2mB, so m = W/(2B) = ${r.w} ÷ (2 × ${r.b}) = ${r.m} J/T. At 180° the torque mB sin 180° is zero, though it took work to get there.` ``
- coil: `` `On the star! m = NIA, so I = τ/(NAB sin θ) = ${r.tau} ÷ (${r.n} × ${r.a} × 10⁻⁴ × ${r.b} × sin ${r.th}°) = ${r.i / 1000} A = ${r.i} mA. ${r.uniform ? 'In a uniform field the forces on the coil cancel: a torque but no net force.' : 'Next to the magnet the field is not uniform, so there is a net force as well, and the thruster held Pebble in its slot.'}` ``
- dock stable: `` `Docked! At the side port Pebble’s field is k and points opposite to Pebble (${ARROW[fieldAt(r, 1)]}), so Grit pointing ${ARROW[dockAnswer(r).q]} lines up with it: U = −m·B = −k, stable.` ``
- dock unstable: `` `Ready to fly! On Pebble’s axis its field is 2k and points the same way as Pebble, so Grit pointing ${ARROW[dockAnswer(r).q]}, against it, is torque-free with U = +2k, the highest: a nudge flips it away.` ``
- dock lowest: `` `Tightest dock! On Pebble’s axis the field is 2k along Pebble, so Grit pointing the same way (${ARROW[r.pDir]}) has U = −2k, the lowest of all; the best at the side port is only −k.` ``

### 5.5 Scene helpers and answers (also in `logic.ts`, pure, tested)

The art and the tests need the round's field direction, the answers, the start settings, the outcome and the verdict time. Put them in `logic.ts`.

```ts
export const FIELD1 = [15, 195, 340] as const;                              // level 1: field direction per round (degrees anticlockwise from →)
export const FIELD3 = { 90: [-100, 110, -125], 180: [20, -30, 40] } as const; // level 3: per target and round (puts the guide star clear of the HUD)
export const FIELD4 = { uniform: [150, 210, 170], station: 20 } as const;     // level 4: per round; next to the station 20° (toward the docking magnet)

/** The field's direction on screen for round k (level 5 has no external field: 0). */
export function fieldDeg(r: Round, k: number): number {
  switch (r.kind) {
    case 'spin': return FIELD1[k];
    case 'park': return r.phi;
    case 'swing': return FIELD3[r.target][k];
    case 'coil': return r.uniform ? FIELD4.uniform[k] : FIELD4.station;
    case 'dock': return 0;
  }
}
/** Where Pebble's moment points when the round starts, or (level 2) for the heading v.h: the camera side, except the level 2 rod may be N-opposite. */
export const startHeading = (r: Round, k: number, v: Values) =>
  r.kind === 'spin' || r.kind === 'coil' ? fieldDeg(r, k) + r.th : r.kind === 'park' ? v.h! : r.kind === 'swing' ? fieldDeg(r, k) : r.pDir * 90;
/** The guide star's direction (levels 3 and 4). */
export const starDeg = (r: Round, k: number) => (r.kind === 'swing' ? fieldDeg(r, k) + r.target : fieldDeg(r, k));

/** The one winning setting of a round, and the dial values it starts on. */
export function answerOf(r: Round): Values {
  switch (r.kind) {
    case 'spin': case 'swing': return { m: r.m };
    case 'park': return { h: parkAnswer(r) };
    case 'coil': return { i: r.i, thr: r.uniform ? 0 : 1 };
    case 'dock': return dockAnswer(r);
  }
}
export function startOf(r: Round): Values {
  switch (r.kind) {
    case 'spin': case 'swing': return { m: DIAL.m.start };
    case 'park': return { h: DIAL.h.start };
    case 'coil': return { i: DIAL.i.start, thr: DIAL.thr.start };
    case 'dock': return { port: DIAL.port.start, q: (r.pDir + 1) % 4 };
  }
}

/** Level 1: the tumble. Pebble spins at TUMBLE.rate °/s until the burn; the burn lasts TUMBLE.ramp s and leaves the spin at `end` times the old rate. */
export const TUMBLE = { rate: 120, turn: 0.3, ramp: 0.5 } as const;
export const SPIN_END = { win: 0, low: FIXED.spinLeft, high: -FIXED.spinLeft } as const;
/** Spin angle in units of TUMBLE.rate, s seconds after the burn begins: the integral of 1 + (end − 1) · smooth(σ / ramp). */
export function spinG(end: number, s: number): number {
  const u = Math.max(0, s) / TUMBLE.ramp;
  const is = u <= 1 ? (u - Math.sin(Math.PI * u) / Math.PI) / 2 : 0.5 + (u - 1); // ∫ smooth, smooth(u) = (1 − cos πu)/2
  return Math.max(0, s) + (end - 1) * TUMBLE.ramp * is;
}

export type Outcome = 'win' | Fault;
export const outcomeOf = (r: Round, x: Values): Outcome => fault(r, x) ?? 'win';
/** Seconds into the take at which the verdict lands (hearts, score, text). Every value is at most 2.3 minus the longest tail. */
export function verdictAt(r: Round, x: Values): number {
  const o = outcomeOf(r, x);
  switch (r.kind) {
    case 'spin': return o === 'win' ? 1.0 : o === 'low' ? 1.1 : 1.2;
    case 'park': return o === 'swing' ? 1.0 : o === 'flip' ? 1.6 : 1.5;
    case 'swing': return o === 'win' ? 1.1 : o === 'short' ? 1.4 : 1.2;
    case 'coil': return o === 'drift' ? 1.0 : o === 'pulled' ? 0.95 : o === 'win' ? 1.1 : o === 'short' ? 1.4 : 1.2;
    case 'dock': return o === 'closed' ? 1.0 : o === 'torque' ? 1.3 : o === 'flip' ? 1.6 : 1.5;
  }
}
```

(`Values` here is the logic's own `Values` type of section 5.3. The `Outcome` names are exactly the `Fault` names plus `'win'`, so the art switches on them.)

## 6. Screen and art

Canvas 640 × 340, drawn over `backdrop(g)` with opaque fills (the backdrop grid must not show). No `Math.random`, no gradients (the jsdom stub has none): every twinkle, drift and wobble comes from the clock `t` and the index. Read `rebuilds/ch07-reactance-lab.md` section 6 and `src/games/physics/class-12/ch07-alternating-current/reactance-lab/art.ts` for the layout of an `art.ts` of this kind, and copy the small generic helpers `tag`, `goalLine`, `handleRing`, `rr` (rounded rectangle), `ease`, `clamp01` from `magnet-bench/art.ts` into this game's `art.ts` (never import across games). Goal pill: see 6.4.

```ts
// art.ts: geometry (exported so the UI test can find the handles)
export const PEB = { x: 300, y: 170 };                       // Pebble's centre in every level
export const GROUND = { x: 8, y: 8, w: 146, h: 84 };         // Dele's mission-control window (top left)
export const TLM = { x: 420, y: 48, w: 212, h: 20 };         // the telemetry box (the helper)
export const STRIP = { x: 100, y: 262, w: 420, h: 74 };      // the dark control strip behind the fader (levels 1, 3, 4)
export const FADER = { x0: 130, x1: 490, y: 312 };           // the rod / coil fader
export const mX = (m: number) => FADER.x0 + ((m - 0.2) / 3.8) * (FADER.x1 - FADER.x0);    // levels 1, 3
export const iX = (i: number) => FADER.x0 + ((i - 20) / 580) * (FADER.x1 - FADER.x0);      // level 4
export const COMPASS = { r: 100 };                           // level 2: the heading ring round Pebble
export const compassAt = (h: number): [number, number] => [PEB.x + COMPASS.r * Math.cos(rad(h)), PEB.y - COMPASS.r * Math.sin(rad(h))];
export const THR = { x0: 546, x1: 586, y: 300 };             // level 4: the thruster switch, knob at x0 (off) or x1 (on)
export const STATION = { x: 470, y: 120, w: 170, h: 100, ring: [520, 170] as const, ringR: 30 }; // level 4 rounds with uniform: false
export const FENDER = { x0: 420, x1: 470, y: 170 };          // a rubber-tipped boom from the truss: its face is at x 420
export const SLOT = { w: 104, h: 104 };                      // level 4: the dashed station-keeping slot round PEB
export const STAR_D = 120;
export const starAt = (deg: number): [number, number] => [PEB.x + STAR_D * Math.cos(rad(deg)), PEB.y - STAR_D * Math.sin(rad(deg))];
export const PORT_D = 92;                                    // level 5: ports; nose along Pebble's moment, side a quarter turn anticlockwise
export const portAt = (pDir: number, port: number): [number, number] => [PEB.x + PORT_D * Math.cos(rad(90 * (pDir + port))), PEB.y - PORT_D * Math.sin(rad(90 * (pDir + port)))];
export const GRIT = { x: 548, y: 214 };                      // level 5: where Grit hovers before the dock
export const KNOB_R = 52;                                    // level 5: the turn ring round Grit
export const knobAt = (q: number): [number, number] => [GRIT.x + KNOB_R * Math.cos(rad(90 * q)), GRIT.y - KNOB_R * Math.sin(rad(90 * q))];
export const HIT: [number, number] = [320, 118];             // the fixed burst point of every level
export const INSET = { x: 8, y: 100, w: 132, h: 70 };        // the win-only teaching picture (dark panel, 11 px label in its top-left corner, the picture below it)
export const PLATE4 = { x: 300, y: 236 };                    // level 4: the coil plate `${n} turns · ${a} cm²` (12 px, PAL.white, on a tag pill)
```

The script `check-dipole-orbit.mjs` also checked that every guide star (levels 3 and 4), every dock port (all four `pDir`, both ports) and all 24 compass knob positions lie clear of the goal pill, the Dele window and the control strip.

### 6.1 The set

- **Space** (`space(g, t, k, reduce)`, all levels), drawn first. Sky `#04061a`; 50 stars at `x = (i·97) % 640`, `y = (i·53) % 262`, radius 1 (every fifth radius 1.5), alpha `0.4 + 0.4·sin(t·1.2 + i)` (steady alpha 0.6 when `reduce`). The **Earth** is a huge disc at (320, 700), radius 440 (its top edge is at y 260), with a thin atmosphere ring (4 px, `#6fb7ff`, alpha 0.6). Rounds differ (UX item 8):
  - round 1, **dayside**: ocean `#1f5fbf`, six white cloud ellipses sliding left at 6 px/s (positions from the index and `t`);
  - round 2, **nightside**: `#0a1230`, 30 city-light dots (`#ffd27a`) from the index, a crescent moon at (60, 142) radius 14;
  - round 3, the boss, **sunrise**: `#12254f` with an orange limb band (`#ff9a3c`, alpha 0.6, 8 px), a sun flare at (610, 276) (six rays rotating 5°/s, alpha 0.5), and six grey debris chips drifting left at 14 px/s.
- **The field** (`fieldArrows(g, deg, t)`; levels 1, 2, 3 and 4 uniform rounds): five dashed `PAL.cyan` lines (alpha 0.35, 1.5 px, dash `[10, 8]`, dash offset `−t·20`) through points 60 px apart across the field direction, each 640 px long, running behind Pebble, with an arrowhead (10 px) on every line at 160 px each side of its middle. A level 4 round with `uniform: false` draws five curves bending into the docking magnet ring instead (`fieldBend(g, t)`: quadratic curves from x 330, y 90 to 250 in steps of 40 ending at the ring (490, 170), same style).
- **B plate** (levels 1, 2, 3): `` `B ${b} µT` `` in `PAL.cyan`, 12 px bold, on a `tag` pill at (560, 296), with a small arrow glyph `→` rotated to the field (24 px) beside it.
- **Level 2 compass**: a dim white ring round Pebble (radius 100, 2 px, alpha 0.4) with a tick every 15° (6 px, no numbers), the knob at `compassAt(h)`, and a small camera glyph on the knob's inner side. `m` plate: `` `m ${m} J/T` `` 12 px bold white at (560, 316).
- **Fader strip** (levels 1, 3, 4): `STRIP` filled `rgba(6,10,36,0.82)` with a slot along `FADER` (4 px, `PAL.dim`), a tick at every dial step (3 px tall, none labelled) and the two end numbers `0.2` and `4` (levels 1, 3) or `20` and `600` (level 4) in 11 px `PAL.dim`. The knob is at `mX(m)` or `iX(i)`.
- **The guide star** (levels 3 and 4): `star(g, x, y, t)` at `starAt(starDeg(r, k))`: four white points (inner 4, outer 14 px) with a glow circle (radius 22, alpha 0.25) pulsing ±3 px each 2 s, and a dashed ring (radius 12). Drawn from round start, dashed ring turns gold on a win only.
- **The station** (`station(g, t)`, level 4 rounds with `uniform: false`): the truss (`STATION`: grey girders `#8b93b5` with cross braces, two blue solar panels `#2a4fbf` above and below), the docking magnet ring at `STATION.ring` (outer radius 30, inner 18, split red `#d6453d` and grey `#9aa0b8` halves with a 2 px dark gap), and the fender boom (`FENDER`, 8 px thick, a dark rubber tip 6 px long at x 420 to 426). A faint heat shimmer is not needed.
- **The slot** (`SLOT`, level 4 only): a dashed square (`PAL.white`, alpha 0.4, dash `[5, 5]`) centred on `PEB`, with a small `SLOT` label (11 px, `PAL.dim`) on its top-left corner. It is there in every level 4 round from the start, so a slide out of it is visible.
- **The ports** (level 5): two hatch rings at `portAt(pDir, 0)` (nose) and `portAt(pDir, 1)` (side), radius 22, `#8f98c0` 3 px, four small bolts, each filled with a dark iris of six petals. **They look identical before Fire**, whatever the plan. The selected port has the yellow handle ring and its tag (6.4 item 2); the other is dashed white at alpha 0.5.

### 6.2 The characters in `art.ts` (section 4 gives the look; these are the signatures)

```ts
export type PebbleMood = 'happy' | 'cheer' | 'worried' | 'dizzy' | 'dark'; // 'dark': eclipse, LEDs off (level 2 take only)
export interface PebbleOpts {
  x: number; y: number; deg: number;       // centre; heading in degrees anticlockwise from → (the camera side)
  scale?: number;                          // 1 by default
  rod: 'rod' | 'coil';                     // the magnet rod (levels 1, 2, 3, 5) or the coil (level 4)
  nOpposite?: boolean;                     // level 2 rows with rod: 180: the rod's N end is opposite the camera
  glow?: number;                           // 0..1: the orange 6 px glow of the rod or coil during the burn
  folded?: boolean;                        // level 5: the wings fold flat against the body
  wings?: string;                          // wing colour (Pebble blue `#2a4fbf`, Grit green `#2f9e5b`)
  flap?: number;                           // cheer: wing angle in degrees (±10, two flaps in 0.8 s)
  alpha?: number; mood: PebbleMood; t: number; look?: [number, number]; wink?: boolean; // look: level 5, the LEDs shift 2 px toward Grit; wink: Grit's win wink
}
export function pebble(g: G, o: PebbleOpts): void; // Pebble and Grit (Grit: wings green, scale 0.8, folded)
export function dele(g: G, t: number, mood: 'idle' | 'lean' | 'cheer' | 'oops', rt: number): void; // inside GROUND, clipped to it
export function star(g: G, x: number, y: number, t: number, gold: boolean): void;
export function station(g: G, t: number): void;
export function fieldArrows(g: G, deg: number, t: number): void;
export function fieldBend(g: G, t: number): void;
export function inset(g: G, kind: 'tau' | 'well' | 'work' | 'forces' | 'lines', r: Round, rt: number): void; // win-only teaching pictures, 6.3
```

- **Rotation.** The body, wings, antenna, camera, the rod or coil and its N and S stamps rotate with `deg` (`g.rotate(-rad(deg))`, since screen y points down). **The face stays upright** (the LED panel keeps itself level): draw it after the rotation is undone, on an upright 34 × 20 dark plate at (0, −8) from the centre, over the rod (the rod's ends, with their N and S stamps, stay visible). The stamps' letters are always 11 px, whatever the scale.
- **Level 5 folded mode.** Pebble and Grit fold their wings flat (each wing becomes a 6 px strip along the body side) so the two satellites fit side by side: the folded body extent is 34 px from the centre (Grit 27), and with the ports at 92 px nothing overlaps. Grit is drawn at scale 0.8.
- **Level 4 coil.** The copper loop 40 × 30 on the front panel replaces the rod, its axis the heading. No N and S stamps (a coil is not marked).
- **Moods**: as section 4 (happy green eyes; cheer cyan arc eyes and a wing flap; worried amber eyes and a flat mouth and a small amber `!`; dizzy spiral eyes with three yellow `✦` circling at radius 34, one turn per second). `'dark'`: both eyes a dim 2 px line, no mouth.
- **Dele** (`dele`): head and shoulders drawn inside `GROUND` (clip to the window), his hand-drawn head with `face(…)` from `@core/mathkit` when its signature fits, else by hand. `'lean'` is the leaning pose (0.4 s long) while the take starts; `'cheer'` both fists up; `'oops'` both hands on his head.

### 6.3 The take (`rt` = seconds since Fire)

`outcomeOf(r, shot.v)` picks the take. `verdictAt(r, shot.v)` is the verdict time and the `delay`. Everything ends by 2.3 s. The `hit` point is `HIT` in every level and every outcome. Pebble bobs `sin(t·1.6)·2` px (section 4) except while a take moves it. Every miss effect is a **fixed** size (`FIXED`), never a function of how far the setting was from the answer.

**All levels, rt 0.00 (first frame, UX item 5):** Dele leans to his mic and his floater appears at (150, 70): `Burn!` (levels 1, 3, 4), `Park it` (2), `Dock!` (5); the goal pill disappears; and the level's own first motion starts (a burn glow, thruster puffs, the kick ring or Grit's launch). At the verdict Dele raises both fists (`Nice!`) or puts his hands on his head (`Uh-oh`), and Pebble's mood changes (cheer or worried or dizzy as below).

**Level 1 (spin).** Before Fire Pebble tumbles: heading `fieldDeg + th + TUMBLE.rate · t` (mod 360, anticlockwise), the dashed yellow ghost of the **burn pose** (a 70 px line from `PEB` at `startHeading`) and a cyan field line through `PEB` with an arc (radius 40) between them labelled `` `θ = ${th}°` `` (11 px) show the given angle.
- 0.00 to 0.30: Pebble eases along the shortest arc (smoothstep) from its tumbling heading at Fire to the burn pose; the rod glow rises 0 to 1.
- 0.30: `BURN` floater at (300, 108) `PAL.orange`; the rod glows (6 px, `PAL.orange`) until 0.90 then fades.
- From 0.30: heading `= burn pose + TUMBLE.rate · spinG(end, rt − 0.30)`, with `end = SPIN_END[outcome]` (`win` 0, `low` +0.4, `high` −0.4).
- `win`: the spin eases to a dead stop (it is still by rt 0.80); `STOPPED` floater at 0.85 `PAL.green`; verdict 1.0, Pebble cheers. At 1.0 the `τ = mB sin θ` inset appears (win only).
- `low`: it keeps turning the same way at 48°/s; `STILL SPINNING` floater at 0.90 `PAL.orange`; verdict 1.1, worried.
- `high`: it turns the other way at 48°/s; `SPUN BACK` floater at 0.90; verdict 1.2, dizzy.

**Level 2 (park).** Before Fire Pebble sits at the player's heading `h` (the knob drags it round; the field lines run behind). The rod's N end is at `h` (or opposite the camera for `nOpposite`).
- 0.00 to 0.45: four white thruster puffs at the body's corners (6 px circles growing to 14, alpha 0.5 to 0), `PARKED` floater at (300, 108); the eclipse: a dark overlay `rgba(2,4,16,a)` rises to a = 0.45 between 0.15 and 0.50; at 0.50 Pebble's LEDs go dark (`'dark'`).
- `swing` (θ not 0 or 180): from 0.55 to 1.00 the heading turns a fixed 25° (smoothstep) in the direction that carries the N end toward the field (clockwise when θ < 180, anticlockwise when θ > 180); `TORQUE` floater at 0.60; verdict 1.0, worried.
- The **bump** (stable plan: win and `flip`) is a grey 5 px speck with a 3-dot trail that crosses from (640, 60) to Pebble's centre between 0.90 and 1.10; `tink` floater at 1.10. The **command** (unstable plan: win and `steady`) is a white ring growing from Dele's window to Pebble (radius 0 to 60, alpha 0.45 to 0, 0.4 s, from 0.90) with `Flip!` from Dele.
- stable `win` (θ = 0): after 1.10 the heading wobbles `6°·e^{−3s}·sin(2π·2.5·s)`, `s = rt − 1.10`; `STEADY` floater at 1.15 `PAL.green`; LEDs back on, cheer at 1.5; the `U = −mB cos θ` well inset appears at 1.5.
- `flip` (stable plan, θ = 180): at 1.10 the heading turns a further fixed 60° over 0.25 s, then Pebble spins at 240°/s and drifts (+80, −50) px (linear from 1.35 to 2.2) while its alpha fades from 1 to 0.4; `TIPPED` floater at 1.30 `PAL.orange`; dizzy from 1.35; verdict 1.6.
- unstable `win` (θ = 180): from 1.00 the heading turns 180° (smoothstep over 0.4 s) with a damped overshoot after 1.40 (`8°·e^{−6s}·sin(2π·3·s)`, `s = rt − 1.40`); `FLIPPED` floater at 1.05 `PAL.green`; cheer at 1.5; same inset.
- `steady` (unstable plan, θ = 0): the ring arrives, Pebble only wobbles `8°·e^{−3s}·sin(2π·2.5·s)` from 1.10; `NO FLIP` floater at 1.10 `PAL.orange`; worried; verdict 1.5.

**Level 3 (swing).** Before Fire Pebble sits along the field (heading `fieldDeg`), the guide star at `starAt(starDeg)`. Let `A` be the angle turned from the field: `win` `target`; `short` `FIXED.short · target`; `over` `(1 + FIXED.over) · target`.
- 0.00: white kick ring at the body centre (radius 0 to 44 in 0.3 s, alpha 0.45 to 0) and a `KICK` floater at (300, 108) `PAL.white`.
- 0.15 to 1.00: `A(rt) = A · (1 − (1 − u)³)`, `u = (rt − 0.15)/0.85` (it coasts to rest); heading `= fieldDeg + A(rt)`.
- `win`: rests on the star at 1.00; at target 90 it trembles ±1.5° at 2.5 Hz (the field still pulls back), at 180 it is still; `ON STAR` floater at 1.00 `PAL.green`; the star's ring turns gold; verdict 1.1; the `W = ΔU` inset appears at 1.1.
- `short`: stops at 1.00 and swings back to the field direction (smoothstep from 1.10 to 1.80); `SHORT` floater at 1.00 `PAL.orange`; verdict 1.4, worried.
- `over`: reaches 130% at 1.00 and holds; if the target is 180 it keeps turning at 60°/s after 1.00 (it tumbles on); `PAST` floater at 1.00; verdict 1.2, worried (dizzy if the target is 180).

**Level 4 (coil).** Before Fire Pebble sits at `startHeading` (its coil axis `th` degrees from the field), with the star along the field. The thruster, if on, shows no puffs until Fire.
- 0.00: the coil glows `PAL.orange` (6 px) from 0 to 0.90; `BURN` floater at (300, 108). With `thr = 1`: three white puffs every 0.2 s from Pebble's left side (station rounds) or its bottom (uniform rounds), from 0.00 to 0.90.
- Heading: let `F` be the field direction and `s0` the start heading. `win`: from 0.15 to 1.00 it eases out to `F`. `short`: eases out to `s0 − 0.6·(s0 − F)` by 0.80 (60% of the way), then back to `s0` over 0.90 to 1.50. `over`: to `F − 0.3·(s0 − F)` by 1.00 and holds. `drift` and `pulled`: the heading does not change.
- `win`: it settles on the star and keeps its slot (±1 px jitter at 6 Hz when the thruster is working against the pull); `ON STAR` floater at 1.00 `PAL.green`; verdict 1.1; the **forces inset** appears at 1.1 (uniform: two equal and opposite arrows on the coil, labelled `F = 0 net`; station: unequal arrows, labelled `net F`).
- `short`: `SHORT` floater at 0.85 `PAL.orange`; verdict 1.4, worried. `over`: `PAST` floater at 1.00; verdict 1.2, worried.
- `drift` (thruster on, uniform field): Pebble slides (0, +40) px (smoothstep, 0.20 to 0.90), out of the dashed slot; `DRIFT` floater at 0.90 `PAL.orange`; verdict 1.0, worried.
- `pulled` (thruster off, next to the station): Pebble slides (+40, 0) px toward the docking magnet (0.20 to 0.90); at 0.90 a spark `A.burst(418, 170, PAL.orange, 10, 100)`, `CLANK` floater and `A.shake(4)` (skipped when the user prefers reduced motion); verdict 0.95, worried.

**Level 5 (dock).** Pebble is at `PEB` with heading `pDir·90`, wings folded, and Grit at `GRIT` (scale 0.8) with heading `q·90` (the player's turn setting, live), bobbing out of phase. The selected port has the handle ring; both hatches look the same.
- 0.00 to 0.15: Grit's two tiny thrusters puff; Dele says `Dock!`. 0.15 to 0.90: Grit flies from `GRIT` to the chosen port, straight, smoothstep; its heading stays `q·90`.
- 0.70: the chosen hatch irises open (petals retract in 0.2 s), **except** `closed`, where the petals snap shut into a grey disc (`CLANG` floater at 0.90 and a spark at the port); then Grit bounces 40 px back toward `GRIT` (0.90 to 1.20); verdict 1.0, worried.
- At 0.90 any other Grit arrives (`CLUNK` floater at the port) and holds there; Pebble's LED eyes shift 2 px toward it.
- `torque` (Grit across the field): from 0.90 Grit turns in place, clockwise, at 150°/s whatever the setting (so the turn does not show the field's direction); `TURNS` floater at 1.00 `PAL.orange`; Grit worried; verdict 1.3.
- At 1.20 the **release test**, by outcome: a **bump** speck hits Grit (stable `win` and `flip`), a **command ring** circles it (unstable `win` and `steady`), a **pull test** tether tugs it outward (lowest `win` and `loose`).
  - stable `win` (side port): wobble `6°·e^{−3s}·sin(2π·2.5·s)`; `DOCKED` floater `PAL.green`.
  - unstable `win` (nose): Grit flips 180° (0.4 s) and springs 50 px away from Pebble (1.4 to 1.9); `AWAY!` floater `PAL.green`.
  - lowest `win` (nose): the tether stretches and Grit holds (±2 px); `TIGHT` floater `PAL.green`.
  - `flip`: Grit tips a fixed 60° (0.25 s), then spins at 240°/s and drifts (+70, −40) px, fading to alpha 0.4 by 2.2; `FLIPPED` floater `PAL.orange`; Grit dizzy; verdict 1.6.
  - `steady`: the command ring arrives, Grit only wobbles `8°·e^{−3s}·sin(2π·2.5·s)`; `NO FLIP` floater; verdict 1.5.
  - `loose` (side port in the lowest plan): the tether tugs Grit 30 px away along the outward direction (1.20 to 1.45) and it hangs there; `LOOSE` floater; verdict 1.5.
- Win verdict 1.5: both satellites cheer (wings stay folded, LEDs cyan) and Grit winks 0.3 s; Pebble's dipole field lines (`lines` inset: three loops `r = L·sin²φ` for L = 40, 70, 100 around Pebble's axis `pDir`, gold, alpha 0.6) are drawn from 1.5 on, win only, with the label `field of Pebble` in the inset's corner. Grit's worried and dizzy moods are as Pebble's.

**Delays.** `delay: (r, v) => verdictAt(r, v as Values)`.

### 6.4 UX checklist (README items 1 to 10)

1. **Goal line**: `goalText(r)` at (320, 30), 12 px bold `PAL.white`, on a dark pill `rgba(6,10,36,0.8)`, 20 px tall, `chars × 7 + 20` wide, centred, from round start until Fire (the longest text, 41 characters, makes the pill 307 wide, clear of Dele's window at x 154).
2. **Own setting beside its handle, with its unit** (12 to 13 px bold `PAL.yellow`, on a `tag` pill):
   - levels 1 and 3: `` `${m} J/T` `` centred above the knob at (clamp(`mX(m)`, 150, 470), 284);
   - level 2: `` `${h}°` `` at the knob's side: to the right of the knob (x + 28, y + 5, left-aligned) if the knob is on the right half of the ring, else to its left;
   - level 4: `` `${i} mA` `` above the knob like level 1, and `THRUSTER ${thr ? 'ON' : 'OFF'}` (11 px bold, `PAL.white`) at (566, 278) over the switch;
   - level 5: `` `${port ? 'side' : 'nose'} port` `` 34 px outward from the selected port (away from `PEB`), and `` `points ${ARROW[q]}` `` at (548, 302) under Grit's turn ring.
   - Given facts are drawn the same way: the B plate, the `m` plate, the star's goal.
3. **Handles** (all radius 20, drawn by `handleRing` with a grip glyph: `⇔` the faders and the thruster switch, `↻` the compass knob and Grit's turn ring, `⇔` the port ring; solid yellow fill while dragged and for 0.15 s after). Round 1 of every level pulses the first handle (radius 23 to 29) with a small `drag` label (11 px `PAL.yellow`) 34 px above it until the first pointerdown within 34 px of it on the canvas (the `touch` pattern of `magnet-bench/index.ts`). Level 5 pulses the port ring.
4. **Text**: every scene label at least 11 px; the TLM text 12 px. Labels never sit on Pebble, Grit, the star or each other. **At most 3 given numbers besides the player's setting**: level 1 shows the goal torque, `B` and `θ`; level 2 `B` and `m`; level 3 the goal's target angle and kick energy, and `B`; level 4 the goal torque, and the coil plate `` `${n} turns · ${a} cm²` `` (the field `B` and the angle `θ` are in the hint line, `θ` also drawn as the arc between the coil axis and the star line, without a number); level 5 none (the arrow `ARROW[pDir]` is drawn by Pebble's rod and printed in the hint line).
5. **Instant response**: see 6.3 "All levels, rt 0.00". A burn glow, a kick ring, a command ring and a bump never look alike, and a win never looks like a miss (green floaters and a cheer against orange floaters and a worried or dizzy face).
6. **Teaching**: `winText` (two or three short sentences) in the feedback panel; every miss text names what the setting did and what to change, never the answer; the win-only insets of 6.3 give a picture.
7. **Living hero**: Pebble's bob, panel glint, antenna blink and LED blink; Dele's coffee and blink; Earth's clouds or city lights; the stars; the field flowing along its lines; Grit bobbing.
8. **Rounds look different**: dayside, nightside, sunrise boss (6.1), and the field direction changes every round (`fieldDeg`).
9. **Accessibility**: every slider has its `aria`; the two buttons have aria-labels (section 7); the canvas `ARIA` describes the scene; the sliders work from the keyboard (they are the engine's); reduced motion (`window.matchMedia('(prefers-reduced-motion: reduce)')`): no `A.shake`, no twinkle, no flare rotation, no thruster-puff growth beyond the first frame.
10. **Comfort**: the eclipse overlay is at most alpha 0.45 and rises over 0.35 s; the kick ring is alpha 0.45 for 0.3 s; the dizzy stars turn once a second; the burn glow is steady (no flicker); nothing flashes more than 3 times a second.

### 6.5 What must never show

- No dial value is marked as the answer: no tick, colour or label on the fader, the compass ring, the thruster switch, the ports or Grit's turn ring is special. The compass ticks and the fader ticks carry no numbers.
- The ports look the same, closed or open, until the take.
- The guide star and the burn pose are given facts (where Pebble must end up and where the burn happens); they never show the dial value.
- The insets (`τ = mB sin θ`, `U = −mB cos θ`, `W = ΔU`, the forces, the dipole field lines) are drawn only on a win.
- No miss effect depends on the distance of the setting from the answer (6.3 uses only `FIXED`).
- The level 5 `torque` take turns Grit clockwise whatever the setting.
- `hit` is `HIT` always.

## 7. Controls and mount

Dials (the `DIAL` of 5.3; `DialSpec` of `@core/dialgame`, in this order, because the UI tests find the sliders by index):

| Level | dials |
|---|---|
| 1 and 3 | `{ key: 'm', aria: 'Magnet rod moment in joules per tesla', label: 'Rod moment', unit: 'J/T', step: 0.2, min: 0.2, max: 4, start: 0.2 }` |
| 2 | `{ key: 'h', aria: 'Pebble’s heading in degrees, the direction its camera faces', label: 'Heading', unit: '', step: 15, min: 0, max: 345, start: 90, text: (v) => `${v}°` }` |
| 4 | `{ key: 'i', aria: 'Coil current in milliamperes', label: 'Coil current', unit: 'mA', step: 20, min: 20, max: 600, start: 20 }` then `{ key: 'thr', aria: 'Station-keeping thruster: 0 off, 1 on', label: 'Thruster', unit: '', step: 1, min: 0, max: 1, start: 0, text: (v) => (v ? 'ON' : 'OFF') }` |
| 5 | `{ key: 'port', aria: 'Docking port: 0 the nose port, 1 the side port', label: 'Port', unit: '', step: 1, min: 0, max: 1, start: 0, text: (v) => (v ? 'side port' : 'nose port') }` then `{ key: 'q', aria: 'Which way Grit points: 0 right, 1 up, 2 left, 3 down', label: 'Grit points', unit: '', step: 1, min: 0, max: 3, start: (r) => (r.pDir + 1) % 4, text: (v) => ARROW[v] }` |

Handles (`HandleSpec`, all `radius: 20`, each `drag` wrapped to call `touch(key)` as in `magnet-bench/index.ts`):
- levels 1, 3: `{ dial: 'm', at: (_r, v) => [mX(v.m), FADER.y], drag: (_r, px) => 0.2 + ((px - FADER.x0) / (FADER.x1 - FADER.x0)) * 3.8 }`
- level 2: `{ dial: 'h', at: (_r, v) => compassAt(v.h), drag: (_r, px, py) => mod(Math.round(((Math.atan2(PEB.y - py, px - PEB.x) * 180) / Math.PI) / 15) * 15, 360) }`
- level 4: `{ dial: 'i', at: (_r, v) => [iX(v.i), FADER.y], drag: (_r, px) => 20 + ((px - FADER.x0) / (FADER.x1 - FADER.x0)) * 580 }` and `{ dial: 'thr', at: (_r, v) => [v.thr ? THR.x1 : THR.x0, THR.y], drag: (_r, px) => (px > (THR.x0 + THR.x1) / 2 ? 1 : 0) }`
- level 5: `{ dial: 'port', at: (r, v) => portAt(r.pDir, v.port), drag: (r, px, py) => (Math.hypot(px - portAt(r.pDir, 0)[0], py - portAt(r.pDir, 0)[1]) <= Math.hypot(px - portAt(r.pDir, 1)[0], py - portAt(r.pDir, 1)[1]) ? 0 : 1) }` and `{ dial: 'q', at: (_r, v) => knobAt(v.q), drag: (_r, px, py) => mod(Math.round(Math.atan2(GRIT.y - py, px - GRIT.x) / (Math.PI / 2)), 4) }`

`r` in these handlers is the level's `Round`; in level 5 `r.kind === 'dock'` (narrow it with a cast).

Common to every level:
- `hero: { name: 'Pebble', role: ROLE, ...HEROES[n - 1] }`, `charges: [1, 1, 0]`; `ROLE` and the `HEROES` stories and objectives are the section 4 text, copied exactly.
- `test: { button: '📡 Check telemetry', aria: 'Check telemetry: read what this setting would do before the burn', read: (r, v) => { flash.paid(); return checkText(r, v); } }` with `const flash = paidFlash()` per level. (The telemetry box is the helper; the check also lights it for 1.5 s in round 2.)
- `fire: { button: n === 5 ? '🛰 Dock Grit' : '🚀 Command the burn', aria: 'Command the burn: send the command to Pebble' }` (the same aria in every level).
- `judge: (r, v) => judge(r, v as Values)`, `miss: missText`, `win: (r) => winText(r)`, `hint: (r) => hintText(r)`, `hit: () => HIT`, `delay`, `draw`.
- **The telemetry box** (the helper, `TLM`, 12 px, green digits on black): `live = r.assist === 0 || (!shot && helperOn(r.assist, false, since) && since < 1.5)` with `since = flash.since(t, k)`, as in `reactance-lab/index.ts`; the text is `tlmText(r, v)` when live and `TLM_OFF` otherwise; `PAL.green` in round 1, `PAL.yellow` after a paid check. Set `canvas.dataset.tlm = live ? '1' : '0'`. The telemetry box is the only place a computed torque, energy or rest angle appears before Fire. Also set `canvas.dataset.take = outcome` during a take (and delete it otherwise).
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(5, ctx.level)) as 1 | 2 | 3 | 4 | 5; return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA); } })`.
- `ARIA = 'Low Earth orbit: a shoebox-sized student satellite floats above the planet in Earth’s magnetic field, a mission-control window at the top left, and its twin satellite waits to dock.'`
- `index.ts` header comment: the inspirations of section 1 (CubeSat magnetorquers, detumbling, docking sims) and the "never leak the answer" summary, as in the other rebuilds.

## 8. game.json

Copy `rebuilds/json/magnet-dipole-bench.json` exactly. Title "Pebble in Orbit"; summary "Steer a student satellite with a magnet rod and a coil against Earth’s field: stop its spin, park it, turn it and dock a twin." (126 characters). Checked by `check-json.mjs` on 2026-10-31: summary 126, learningOutcome 175 (curly apostrophe; no straight ones), level `adds` 117, 128, 125, 116, 121, level titles 13, 19, 17, 25, 9 characters, 3 hints per level (each under 200), 5 concepts (the old five, unchanged), 4 misconceptions (unchanged), `ncertRef` "Section 5.2.3, …", level 1 `foundation`, tiers `concept, concept, application, application, application`, title and summary unique against all 118 `game.json` files in `src/games` and `rebuilds/json/`. The id, `order`, `ncertRef`, five concepts and five level topics are the old game's.

## 9. Tests

### 9.1 `logic.test.ts`

1. **Pools** (the `check-dipole-orbit.mjs` checks): for every row, the shown number solves back (`fmt` of the true value equals the shown one: `spinTau`, `coilTau` against `tau`; `w` equals `mB` or `2mB`); every pool has the section 5.2 row counts (4, 4, 4 for levels 1 to 4; 4, 2, 2 for level 5).
2. **One winner**: scan every reachable setting (level 1 and 3: the 20 values of `m`; level 2: the 24 headings; level 4: the 30 currents times the 2 thruster settings; level 5: 2 ports times 4 directions). Exactly one setting passes `judge` and it equals `answerOf(r)`; `startOf(r)` fails; the answer is not at either end of the dial for levels 1 to 4 (levels 2's ends are 0 and 345; the level 5 selectors are discrete and exempt).
3. **Faults**: level 1, `m` below the answer is `low`, above is `high`; level 3, `m` above the answer is `short`, below is `over` (and `stopAt` agrees: above stops before the target, below goes past it or is `Infinity`; at the answer `stopAt` equals the target within 1e-6); level 2, `fault` is `swing` exactly when θ is not 0 or 180, `flip` and `steady` as 5.3, and `parkTheta` agrees with the heading; level 4, a wrong thruster is `drift` (uniform) or `pulled` (station) whatever the current, a right thruster and a low current is `short`, a high one `over`; level 5, `closed`, `torque`, `flip`, `steady`, `loose` as 5.3, and every fault name occurs for some row.
4. **Disjoint pools**: within each level, no answer appears in two pools (`answerOf`).
5. **Rounds**: 80 seeds (`i * 7919 + 13`): `buildRounds` returns three rounds of the level's `kind`, `assist` `[0, 1, 2]`, round k from pool k, and three different answers.
6. **Words**: `goalText` is at most 44 characters for every row; `tlmText` at most 28 characters for every row and every setting; for every row and every wrong setting `missText` mentions the player's own setting where section 5.4 says it does and never contains the answer token (`` `m = ${r.m} J/T` ``, `` `${answer}°` ``, `` `${r.i} mA` ``; use a regex with a `(^|[^0-9.])` lead so `2 J/T` does not match `12 J/T`); the drift, pulled, closed and dock texts contain no digit; `winText` of each level contains its key phrase (`τ = mB sin θ`, `torque mB sin θ is zero` or `U = +mB`, `W = `, `m = NIA`, `side port` or `2k` or `Tightest dock`); `checkText` for a park heading of 180° contains `τ = 0 µN m` (the `clean` rule) and a true minus `−` for a negative U.
7. **Scene helpers**: `spinG(0, s)` rises monotonically and is constant for `s ≥ 0.5` (within 1e-9); `spinG(1, s) = s`; `spinG(0.4, 2) − spinG(0.4, 1) = 0.4`; `spinG(-0.4, 2) − spinG(-0.4, 1) = −0.4`; `verdictAt` is at most 1.7 for every row and setting and equals the table in 5.5; `fieldDeg` and `starDeg` put every star (levels 3 and 4, every round, both targets) at `y` between 80 and 262 and outside the Dele window (x below 170 and y below 100); `FIXED` is exactly `{ spinLeft: 0.4, swingOff: 25, tip: 60, wobble: 8, short: 0.6, over: 0.3, drift: 40, loose: 30 }`.

### 9.2 `tests/magnet-dipole-bench-ui.test.ts`

Use `arcadeHarness(game, 'magnet-dipole-bench', 5)` and `shellTests` as in `tests/reactance-lab-ui.test.ts`, and the two-dial `set`/`apply` pattern of `tests/magnet-bench-ui.test.ts`. `FIRE = 'Command the burn: send the command to Pebble'`, `CHECK = 'Check telemetry: read what this setting would do before the burn'`. `setRight` applies `answerOf(r)` to the sliders in dial order (`h.setSlider(value, index)`); `setWrong` applies the answer with a change that stays a miss: level 1 and 3 `m + 0.2`, level 2 `h + 15`, level 4 `i + 20` (thruster right), level 5 `q` turned a quarter (`(q + 1) % 4`; a different fault, still a miss). `commit: () => h.click(FIRE)`.

Then `describe('Pebble in Orbit', …)`:
- **Dials**: level 1 and 3 one slider `[0.2, 4, 0.2 (start), step 0.2]` with the label `Rod moment`; level 2 one slider `[0, 345, 90, 15]`, label `Heading`; level 4 two sliders `[20, 600, 20, 20]` and `[0, 1, 0, 1]`; level 5 two sliders `[0, 1, 0, 1]` and `[0, 3, (pDir + 1) % 4, 1]` where `pDir` is round 1's (built from the seed).
- **Start misses**: at the start settings the first miss reads, per level 1 to 5: `/still spinning/`, `/swung Pebble away/`, `/went past/` (m = 0.2 overshoots every row), `/stopped short of the guide star/` (round 1 is uniform, so the thruster is right, and 20 mA is short), `/hatch was shut/`.
- **Timing**: a level 2 start `swing` lands at 1.0 s: the heart is still there at 0.8 s and gone at 1.2 s; a level 4 start miss (`short`) lands at 1.4 s: the heart is still there at 1.2 s and gone at 1.6 s. (`pulled` is in no round-1 pool; its 0.95 s is covered by `verdictAt` in 9.1.)
- **A check costs a charge**: `/Check: /`, then a second press says `/No charges left/`, in every level.
- **A win teaches** (level 1 to 5): `/Spin stopped!/`, `/Parked!|Balanced!/`, `/Locked on!|Balanced!/`, `/On the star!/`, `/Docked!|Ready to fly!|Tightest dock!/`.
- **Misses end with the direction in words** (the closing phrase of each 5.4 text): levels 1 and 3 `/rod\.$/`; level 4 `/(current\.|needs no thrust\.|with the thruster\.)$/`; level 2 `/(zero\.|unstable\.|highest energy\.)$/`; level 5 `/(names\.|there\.|unstable\.|higher energy\.|deeper energy\.)$/`.
- **Handles**: the canvas recorder sees an arc of radius ≥ 20 at the start position of each handle: level 1 and 3 `(mX(0.2), FADER.y)`, level 2 `compassAt(90)`, level 4 `(iX(20), FADER.y)` and `(THR.x0, THR.y)`, level 5 `portAt(pDir, 0)` and `knobAt((pDir + 1) % 4)`.
- **UX**: the goal line `goalText(r)` is drawn at round start and gone after Fire; the player's own setting is drawn (`` `0.2 J/T` ``, `` `90°` ``, `` `0.2 J/T` ``, `` `20 mA` `` and `THRUSTER OFF`, `` `nose port` `` and `` `points ${ARROW[(pDir + 1) % 4]}` ``) and gone after Fire; the first handle carries the `drag` cue in round 1 of every level and not in round 2; level 4's coil plate `` `${n} turns · ${a} cm²` `` is drawn; level 5 draws no digit-bearing text in the scene (given numbers: none).
- **The telemetry box never leaks**: with `canvasRecorder` (`tests/helpers/canvas-rec.ts`), the live text (per level `/^τ .* µN m$/`, `/^θ .* · τ .* · U /`, `/^(rests at \d+°|tumbles over)$/`, `/^m .* · τ .* µN m$/`, `/^U .* · τ /`) is drawn in round 1, in round 2 only within 1.5 s after a check, and never in round 3 (also with a check pressed: `No charges left`); `canvas.dataset.tlm` is `'1'` and `'0'` accordingly.
- **No drawn text contains the answer** unless the player's own setting is the answer (levels 1 to 4, all rounds, every setting of the dials): the tokens `` `${r.m} J/T` ``, `` `${answer}°` ``, `` `${r.i} mA` ``; for level 5 `` `points ${ARROW[answer.q]}` `` is drawn only when `q` is the answer.
- **Win-only insets**: the strings `τ = mB sin θ` (level 1), `U = −mB cos θ` (level 2), `W = ΔU` (level 3), `F = 0 net` or `net F` (level 4) and `field of Pebble` (level 5) are drawn only after a win (checked before Fire, during a miss take, and after a win). The `dataset.take` is `win` or the fault name after Fire.

## 10. Traps to avoid

- **Level 3 directions**: a **larger** `m` stops **short**; a **smaller** one overshoots (and at target 180 tumbles). Level 1: larger `m` is `high` (the spin reverses). They are opposite in meaning, so do not share a branch. Compare `m` with `near`, never `===`; compare `i` with `===`.
- **Level 4 judges the thruster first**: a wrong thruster ruins the slot whatever the current, and in that take the heading does not turn (so the take never hints that the current was right).
- **Level 5 judges the port first, then `torque`, then stability**. The three-way `goal` includes `lowest`, whose winning port is the nose, and a stable side port is `loose`, not a win.
- **The start setting must never win** and `q`'s start is a function of the round: `start: (r) => (r.pDir + 1) % 4`; `min` and `max` of that dial are constants.
- **Quarter turns run anticlockwise on screen** (`ARROW = → ↑ ← ↓`). On the canvas y points down, so angles use `PEB.y - r·sin` (as in `compassAt`, `starAt`, `portAt`), and `g.rotate(-rad(deg))`.
- **Fixed effects only**: every swing, slide, tip and wobble is a `FIXED` number. In the level 3 take the angle reached is `target`, 0.6 target or 1.3 target; never the angle `stopAt` returns.
- **The `torque` take (level 5) turns Grit clockwise at a fixed rate** and does not move toward the field: a swing toward the field would give away the field's direction at the right port.
- **Hatches look identical before the take**; the closed one is only seen at 0.70.
- **`checkText` and `tlmText` for level 2 use `parkTau` and `parkU`**, not `fmt(Math.sin(...))`: `fmt` prints sin 180° as 1.47 × 10⁻¹⁵.
- **Dial floats**: the engine snaps 0.2 steps to 6 decimals; the pools hold the same decimals, so `near` always holds at the answer.
- **The face stays upright** while the body rotates; a rotated face is unreadable.
- **The check scripts**: `check-dipole-orbit.mjs` covers the pools and the scene geometry; do not move a star, a port or a compass knob without re-checking they stay clear of the goal pill, Dele's window and the control strip.
- **Folded wings in level 5**, or Pebble's 88 px wings overlap the ports 92 px away.
- **The old tests**: delete `tests/magnetdipole-ui.test.ts` with `git rm`; nothing else imports the old `logic.ts` (search `magnet-dipole-bench/logic` again before deleting).
- **Docs**: do not edit `docs/curriculum/physics-class-12/ch05-concept-weights.md`; the reviewer updates it.
- **Known weakness**: the level 5 selectors (a port of two, a direction of four) cannot avoid dial ends; the answers differ between rounds (`side/pDir+2`, `nose/pDir+2`, `nose/pDir`) so a pattern cannot be learned across rounds, and the 12 rows put the answer at every direction.

