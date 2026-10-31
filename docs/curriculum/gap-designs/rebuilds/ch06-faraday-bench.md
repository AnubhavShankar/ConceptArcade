# Ch 6 · Faraday Bench rebuilt as "The Deep-Sea Beacon" (Physics Ch 6, §6.3 and 6.4)

Read `../README.md` first (every rule, above all "A miss must not show the answer either", "Helpers fade" and the "UX checklist"), then `README.md` in this folder (the rules for a rebuild). The model rebuild is `src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-bench/` (brief `../20-capacitor-bench.md`). Everything below is required unless marked "optional".

**Revised 2026-10-31.** The first version of this brief ("The Glowing Hoop") put a stage illusionist over a hidden electromagnet, which clashed with magnet-bench's "The Floating Act" (chapter 5). The setting, the characters and the words have moved to a shipwreck dive. **The physics, the pools, the judging and the checks are unchanged** and were re-run by script on 2026-10-31.

The old Faraday Bench was a number-entry quiz (type the flux, type the emf). This brief **replaces the whole game** with an arcade game on the seabed. It keeps the id, folder and `order`, and keeps every concept: Φ = BA cos θ and its change, Faraday’s law with N turns, the loop inside a solenoid (Ex 6.3), the 180° turn of a coil with ε and I = ε/R (Example 6.3), and the emf as the slope of a flux graph with the largest emf in the steepest segment. It adds Example 6.2 (a field that dies to zero through a tilted loop), which `ch06-concept-weights.md` lists under E2.

## 1. Identity

| Field | Value |
|---|---|
| Game id | `faraday-bench` (unchanged) |
| Folder | `src/games/physics/class-12/ch06-electromagnetic-induction/faraday-bench/` (existing) |
| Files | **Replace** `game.json` with `docs/curriculum/gap-designs/rebuilds/json/faraday-bench.json` (exact copy). **Delete and rewrite** `logic.ts`, `logic.test.ts`, `index.ts`. **Add** `art.ts`. |
| UI test | **Delete** `tests/faradaybench-ui.test.ts`. **Create** `tests/faraday-bench-ui.test.ts`. |
| Engine | `mountDialLevel` from `@core/dialgame`, one `DialLevel` per level (4 levels); `paidFlash`, `helperOn` from `@core/aidflash` |
| Book coverage | §6.3 (Φ = BA cos θ), §6.4 (ε = −N dΦ/dt), Example 6.2 (field dying through a loop at 45°), Ex 6.3 (loop in a solenoid), Example 6.3 (180° turn, ε and I), §6.4 flux graph |
| Inspiration (code comment only) | Deep-sea exploration games (a diver, a robot submarine and the dark below), the real practice of powering sealed underwater lamps and sensors by induction because seawater shorts any plug, and rhythm games for level 4 (the brightest flash lands on the steepest beat) |
| Core verb | **Turn and size the hoop by hand**: drag the hoop to a tilt (level 1), drag the ring to a size before it goes into the sleeve (level 2), set how fast to flip the hoop over (level 3), set how many turns the hoop has (level 4); then press "Signal!" and the station runs. No other chapter 6 game turns a coil by hand. |

Nothing else in the repo imports the old `logic.ts` (only `tests/faradaybench-ui.test.ts`, which is deleted). Check again with a search for `faraday-bench/logic` before deleting.

## 2. What the student learns

- Flux through a flat coil in a uniform field is Φ = BA cos θ, with θ the angle between the field and the coil’s normal. Flat (θ = 0) holds the most flux, edge-on (θ = 90°) none. N turns link NΦ.
- An emf appears only while the flux changes: ε = N ΔΦ/Δt. A steady field or a steady current gives nothing (the beacon goes dark the moment the change stops).
- Inside a long solenoid B = μ₀nI, so a ramping current changes the flux through a ring inside: ε = Nμ₀nA ΔI/Δt.
- Turning a coil through 180° changes its flux from +BA to −BA, a change of 2BA (not zero). The average emf is 2NBA/t and the current I = ε/R.
- On a flux–time graph the emf is the slope. The steepest step gives the largest emf, rising or falling. 1 mWb/s is 1 mV per turn.

## 3. The mechanic, physically

**Kavya** is a salvage diver marking a shipwreck for the survey ship above. Seawater would short any plug, so the marker beacon, **Wink**, is sealed in glass, and its two leads run to a flat coil of wire, **the hoop**, that Kavya holds on a brass rod. On the seabed stands the survey station. Its **docking pad** is a big electromagnet whose field points straight up through the hoop. The station also has a long **charging sleeve** (a solenoid) and a console with a screen. **Tug**, a little robot submarine flown from the ship, works the console.

Wink is rated for one exact voltage (or current). Too little and it only glows dimly, so the ship’s camera sees nothing; too much and its hot glass cracks in the cold water and it floods.

| Level | The player sets | What decides the dive |
|---|---|---|
| 1 Pad switch-off | the hoop’s tilt θ | Tug switches the pad off; the flux linkage NBA cos θ falls to zero in 0.5 s, so ε = NBA cos θ / 0.5 s. |
| 2 The charging sleeve | the ring radius r | A ring of 200 turns sits inside a long solenoid; Tug ramps the current in 0.2 s, so ε = 200 μ₀ n πr² ΔI / 0.2 s. |
| 3 The flip | the flip time t | Kavya turns the flat hoop over through 180°, so ε = 2NBA/t and Wink’s current is ε/R. |
| 4 The flux program | the hoop’s turns N | The station’s program drives the flux per turn along a graph; the steepest step must give exactly Wink’s rating: N × (steepest slope) = rating. |

Physical consequences (every miss shows only what the player’s own setting did, and only its direction):
- **Dim**: Wink glows at a **fixed** faint level (alpha 0.25) while the flux changes, its face droops, and the topside screen shows `NOTHING…`.
- **Blown**: Wink’s glass cracks with a `CRACK`, a rush of bubbles bursts out and water floods the bulb; Kavya is frazzled; the topside screen shows `BEACON LOST`.
- **Win**: Wink glows warm and full while the flux changes, then goes dark as soon as the change stops (the lesson), and the topside screen lights `SPOTTED!`.

**Fixed glows.** Wink’s brightness on a miss is one of the fixed values in `GLOW` (dim 0.25; blown 0.6 until the crack). It is never proportional to the player’s emf, so a miss cannot be measured to scale up the next try.

## 4. Story and characters

Hero banner: `name: 'Kavya'`, `role: 'a salvage diver who lights a sealed beacon with a hoop of wire over a seabed electromagnet'`.

| Level | story | objective |
|---|---|---|
| 1 | `Kavya is marking a shipwreck for the survey ship above. Seawater would short any plug, so Wink, the beacon, is sealed in glass and wired to a hoop of wire. The station’s docking pad is an electromagnet whose field points straight up through the hoop. The flux is Φ = BA cos θ, where θ is the tilt of the hoop’s normal from the field. When Tug switches the pad off, the flux dies in 0.5 s, and the emf ε = NΔΦ/Δt lights Wink only while the flux is changing.` | `Tilt the hoop so that, when the pad switches off, Wink gets exactly the voltage it needs, in three dives.` |
| 2 | `Next, the charging sleeve: a long tube on the station, wound as a solenoid, so the field inside is B = μ₀nI. Kavya lowers a ring of 200 turns into it, flat across the tube, and Tug ramps the current up in 0.2 s. The flux through the ring rises with the current, and Wink glows only while the current is changing.` | `Pick the ring size that gives Wink exactly its voltage when the current ramps, in three dives.` |
| 3 | `The flip: Kavya holds the hoop flat over the docking pad and turns it over through 180°. The flux per turn goes from +BA to −BA, a change of 2BA, so the average emf is 2NBA/t and the current through Wink is ε/R. How fast she flips sets the current.` | `Choose how fast to flip so Wink gets exactly the current it needs, in three dives.` |
| 4 | `The ship wants a signal it can film. The station’s program drives the flux per turn through the hoop step by step, as its screen shows. The emf in each step is the slope of the graph, so Wink flashes brightest in the steepest step, whether the flux is rising or falling. Kavya chooses how many turns her hoop has.` | `Pick the number of turns so Wink reaches exactly its rating at the brightest moment, without cracking, in three dives.` |

Characters (each in its own function in `art.ts`, AGENTS.md item 17):
- **Kavya** (hero), `kavya(g, t, o)`. Boots on the seabed at (150, 300), about 110 px tall (helmet centre (150, 192), radius 17).
  - Gear: a round copper dive helmet with a round front faceplate (radius 10, her face visible inside: skin `#c98b5e`, dark hair at the edge), two small side windows, six brass bolts round the faceplate and a brass exhaust valve on the right side; a brass breastplate (corselet) with four bolts; a grey-blue canvas dive suit; a weight belt with three lead blocks; heavy lead boots; thick gloves; a dive knife strapped to her right calf; a chest lamp on the breastplate; a black air hose from the back of the helmet that curves up and out of the top of the screen. In her right hand a brass rod runs from (206, 214) to the hoop’s left end (levels 1, 3, 4) or to the ring’s hanger (level 2), so she visibly holds the prop. A dive computer on her left wrist (a small black square with a green dot).
  - Pose: standing three-quarter toward the pad, knees slightly bent, right arm out to the rod, left hand resting on the hose.
  - Idle: three bubbles rise from the exhaust valve every 1.5 s (each a 2 to 4 px circle, `rgba(220,240,255,0.7)`, wobbling `sin(t·6)·2` px sideways as it rises 60 px over 1.5 s); her body bobs `sin(t·1.5)·1.5` px (buoyancy); the hose sways `sin(t·1.2)·4` px at its top; she blinks every 3 s inside the faceplate; every 5 s she glances up at Wink (eyes move 2 px up).
  - Action (rt 0.00 to 0.30): she gives the diver’s "OK" sign with her left hand (thumb and finger in a ring, raised beside the helmet over 0.25 s), a burst of 8 bubbles leaves the valve once, and a `SIGNAL!` floater appears at (150, 140).
  - Moods: `face(g, …, 'happy')` inside the faceplate while waiting; `'cheer'` with a thumbs-up on a win (from the verdict for 0.6 s); `'worried'` with a sweat drop on a dim miss; **frazzled** on a blown miss (the helmet knocked 15° askew, spiral eyes drawn by hand since `face` has no such mood, and the faceplate fogged with five small grey dots).
- **Wink** (the target), `wink(g, t, o)`. A pear-shaped sealed glass bulb, radius 15, centre `WINK_AT` (300, 96) in levels 1, 3, 4 and (404, 206) in level 2, with a brass screw base (12 × 8) underneath, an orange float collar round the base (an ellipse 22 × 6), and a coiled filament inside. Two short leads run from its base down to the hoop (or to the ring in level 2).
  - Idle: it floats with a bob (`sin(t·2)·3` px), sleepy half-closed eyes, a small `z` (11 px, `PAL.dim`) every 4 s at its upper right.
  - Lit: a warm radial glow (`#ffd27a`) with alpha = the glow value; when the glow is 1, eight short rays around it. Eyes wide open and a grin on a win.
  - Dim: a faint orange glow (alpha 0.25), a sad mouth, the eyes half closed.
  - Blown: three jagged white crack lines on the glass, a black filament, spiral (dizzy) eyes, the bulb filling with blue water from the bottom (a `rgba(60,140,220,0.6)` fill rising to the top over 0.5 s), and small bubbles rising from the cracks until 2.3 s. At the crack, 14 white bubbles (`A.burst(x, y, '#e6f6ff', 14, 140)`) burst from it once and a `CRACK` floater appears beside it.
- **Tug** (NPC), `tug(g, t, o)`. A little robot submarine (an ROV) hovering beside the station console on the right (console x 490 to 630, y 250 to 300; Tug’s body centre (585, 222), 48 × 34).
  - Gear: a yellow box frame (`PAL.yellow`) with black corner bars and four bolts; two ducted thrusters on its sides whose propeller blades spin; a clear front dome holding a black screen with two LED eyes (rounded rectangles, `PAL.cyan`); three small lights on top; a manipulator arm with a two-finger claw reaching toward the console; a yellow tether cable rising from its top out of the screen. The console holds a big knife switch (level 1), a ramp lever with a small ammeter dial (level 2), a dive timer (level 3) and a PLAY button (level 4), plus the LCD helper (section 6.2).
  - Idle: the propeller blades turn (`t·6` rad), it bobs `sin(t·2)·2` px, the LED eyes blink every 3 s, and the top lights glow in turn every 1 s.
  - Action: level 1 the claw throws the knife switch open (0.00 to 0.30, `CLICK` floater at 0.25); level 2 the claw pulls the ramp lever (0.30 to 0.50) while the ammeter needle swings; level 3 the claw holds up the dive timer from 0.30 until the flip ends; level 4 the claw presses PLAY at 0.00 and a small `▶` on the console blinks until 1.80.
  - Win: the claw snaps open and shut every 0.3 s (clapping) and the LED eyes turn to happy arcs. Dim: it tilts 10° (a shrug) and the eyes go to flat lines. Blown: it drops 16 px behind the console and the eyes go to `> <`.
- **The docking pad** (decor), `pad(g, t, field)`: the seabed station’s electromagnet. A steel deck plate `PAD` with yellow-and-black hazard stripes along its front edge, standing on four short legs. Its front skirt is drawn as a cut-away showing the electromagnet (`MAGNET`): a grey iron core wound with copper (orange stripes every 6 px) and a dashed outline. The label `docking pad · B ${b} T ⬆` (11 px, `PAL.dim`) sits under it in levels 1, 3 and 4. While it is on it hums: two short vibration lines at each side, alternating every 0.25 s (2 Hz).
- **The topside screen** (decor), `topside(g, state)`: a small monitor box at (16, 52), 124 × 24, showing what the ship’s camera sees, with a thin cable drawn up to the top edge. Idle: `WATCHING…` in `PAL.dim`. Win: `SPOTTED!` in `PAL.yellow`, blinking at 2 Hz. Dim: `NOTHING…` in `PAL.dim`. Blown: `BEACON LOST` in `PAL.red`. The word always carries the meaning, so colour is never the only cue.
- **The dive slate** (decor): a white diver’s slate (a rounded rectangle 90 × 40 with a pencil on a string) drops in at the top centre for 0.8 s whenever a new round starts (detect `k` changing in `draw`): `DIVE 1`, `DIVE 2`, or `FINAL DIVE` in round 3, with a `PLONK` floater.
- **Sea life** (decor, optional detail but keep it light): two small fish that swim slowly left to right across y 130 to 150 and wrap round, and a crab that sidesteps on the seabed near (60, 304). They never pass in front of Wink, the hoop or a label (keep the fish above y 150 only between x 0 and 200).

## 5. Rules (`logic.ts`)

### 5.1 Constants and types

```ts
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const MU0 = 4 * Math.PI * 1e-7;
export const DT1 = 0.5;  // s: in level 1 the pad dies in 0.5 s (every row)
export const DT2 = 0.2;  // s: in level 2 Tug ramps the current in 0.2 s (every row)
export const NR = 200;   // turns on the level 2 ring (every row)
/** Wink’s glow: fixed values, never proportional to the player’s emf. */
export const GLOW = { dim: 0.25, blown: 0.6, win: 1 } as const;

export interface OutRow { n: number; b: number; a: number; vb: number; th: number }                  // L1: a in cm², vb in V; answer th in degrees
export interface TubeRow { n: number; i1: number; i2: number; vb: number; r: number }                // L2: n per cm, currents in A, vb in V; answer r in cm
export interface FlipRow { n: number; b: number; rc: number; R: number; ma: number; t: number }      // L3: hoop radius rc in cm, R in Ω, ma in mA; answer t in s
export interface ShowRow { phi: [number, number, number, number]; vb: number; n: number }           // L4: flux per turn in mWb at t = 0, 1, 2, 3 s, vb in V; answer n turns

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'out'; assist: Assist } & OutRow)
  | ({ kind: 'tube'; assist: Assist } & TubeRow)
  | ({ kind: 'flip'; assist: Assist } & FlipRow)
  | ({ kind: 'show'; assist: Assist } & ShowRow);
```

### 5.2 The pools (copy exactly)

Every row was checked by script on 2026-10-30 and again on 2026-10-31 (section 9 lists the checks; they must be in `logic.test.ts`). `vb` and `ma` are the targets shown to 3 significant figures.

```ts
export const OUT: OutRow[][] = [
  [
    { n: 50, b: 0.4, a: 500, vb: 1, th: 60 }, { n: 40, b: 0.5, a: 600, vb: 1.7, th: 45 }, { n: 100, b: 0.3, a: 500, vb: 2.6, th: 30 },
    { n: 80, b: 0.25, a: 400, vb: 0.8, th: 60 }, { n: 60, b: 0.5, a: 300, vb: 1.27, th: 45 },
  ],
  [
    { n: 50, b: 0.6, a: 400, vb: 1.84, th: 40 }, { n: 120, b: 0.2, a: 500, vb: 2.18, th: 25 }, { n: 75, b: 0.4, a: 300, vb: 1.03, th: 55 },
    { n: 30, b: 0.5, a: 800, vb: 1.84, th: 40 },
  ],
  [
    { n: 40, b: 0.75, a: 500, vb: 1.93, th: 50 }, { n: 90, b: 0.25, a: 400, vb: 1.47, th: 35 }, { n: 60, b: 0.4, a: 250, vb: 0.507, th: 65 },
    { n: 150, b: 0.2, a: 300, vb: 0.616, th: 70 },
  ],
];

export const TUBE: TubeRow[][] = [
  [{ n: 20, i1: 0, i2: 40, vb: 0.505, r: 4 }, { n: 15, i1: 0, i2: 30, vb: 0.444, r: 5 }, { n: 25, i1: 0, i2: 20, vb: 0.178, r: 3 }],
  [{ n: 10, i1: 0, i2: 50, vb: 0.4, r: 4.5 }, { n: 20, i1: 0, i2: 25, vb: 0.711, r: 6 }, { n: 12, i1: 0, i2: 40, vb: 0.232, r: 3.5 }],
  [{ n: 15, i1: 10, i2: 40, vb: 0.537, r: 5.5 }, { n: 20, i1: 5, i2: 30, vb: 0.967, r: 7 }, { n: 25, i1: 10, i2: 30, vb: 0.123, r: 2.5 }],
];

export const FLIP: FlipRow[][] = [
  [{ n: 50, b: 0.2, rc: 10, R: 4, ma: 314, t: 0.5 }, { n: 40, b: 0.25, rc: 10, R: 5, ma: 157, t: 0.8 }, { n: 100, b: 0.1, rc: 8, R: 4, ma: 251, t: 0.4 }],
  [{ n: 60, b: 0.15, rc: 12, R: 6, ma: 151, t: 0.9 }, { n: 80, b: 0.2, rc: 6, R: 5, ma: 121, t: 0.6 }, { n: 25, b: 0.4, rc: 15, R: 4, ma: 295, t: 1.2 }],
  [{ n: 120, b: 0.1, rc: 10, R: 8, ma: 62.8, t: 1.5 }, { n: 50, b: 0.3, rc: 9, R: 3, ma: 364, t: 0.7 }, { n: 200, b: 0.05, rc: 12, R: 10, ma: 56.5, t: 1.6 }],
];

// Round 1: the steepest step rises. Rounds 2 and 3: the steepest step falls (a student who takes the steepest rise picks the wrong N).
export const SHOW: ShowRow[][] = [
  [{ phi: [0, 4, 10, 12], vb: 0.3, n: 50 }, { phi: [2, 10, 12, 8], vb: 0.32, n: 40 }, { phi: [4, 6, 14, 12], vb: 0.48, n: 60 }],
  [{ phi: [2, 8, 14, 4], vb: 0.3, n: 30 }, { phi: [12, 16, 4, 8], vb: 0.84, n: 70 }, { phi: [14, 10, 2, 6], vb: 0.72, n: 90 }],
  [{ phi: [0, 10, 14, 2], vb: 0.96, n: 80 }, { phi: [4, 12, 16, 2], vb: 0.28, n: 20 }, { phi: [16, 6, 8, 16], vb: 1.1, n: 110 }, { phi: [2, 14, 16, 0], vb: 1.92, n: 120 }],
];
```

Script results (2026-10-31, `faraday-recheck.mjs`): every row has exactly one winning dial value; the nearest wrong setting differs from the target by at least 3.5% (L1, the 25° row), 13.8% (L2), 5.8% (L3) and 8.3% (L4); for every wrong value the emf (current, peak) lies on the side that `fault` names; every target solves back to its answer (L1 within 1°, L2 within 0.05 cm, L3 within 0.02 s); no answer sits at a dial end; no start setting wins; the three pools of each level have disjoint answers; the latest blown verdict in level 4 is 1.45 s.

### 5.3 Physics, rounds and judging

```ts
export const DIAL = {
  th: { min: 0, max: 90, step: 5, start: 90 },    // L1, degrees: 0 flat, 90 edge-on (no flux)
  r: { min: 1, max: 8, step: 0.5, start: 1 },     // L2, cm
  t: { min: 0.1, max: 2, step: 0.1, start: 2 },   // L3, s
  n: { min: 10, max: 200, step: 10, start: 10 },  // L4, turns
};

export const rad = (deg: number) => (deg * Math.PI) / 180;
/** L1: emf in V when the field dies, for a tilt of th degrees. */
export const emfOut = (r: OutRow, th: number) => (r.n * r.b * r.a * 1e-4 * Math.cos(rad(th))) / DT1;
/** L2: emf in V for a ring of radius rc cm. */
export const emfTube = (r: TubeRow, rc: number) => (NR * MU0 * r.n * 100 * Math.PI * (rc / 100) ** 2 * (r.i2 - r.i1)) / DT2;
/** L3: average emf in V and current in mA for a flip lasting t s. */
export const emfFlip = (r: FlipRow, t: number) => (2 * r.n * r.b * Math.PI * (r.rc / 100) ** 2) / t;
export const maFlip = (r: FlipRow, t: number) => (emfFlip(r, t) / r.R) * 1000;
/** L4: the emf per turn in mV in each 1 s step (signed), the steepest size, and Wink’s peak in V for n turns. */
export const slopes = (r: ShowRow) => [1, 2, 3].map((i) => r.phi[i] - r.phi[i - 1]);
export const steepest = (r: ShowRow) => Math.max(...slopes(r).map(Math.abs));
export const peakShow = (r: ShowRow, n: number) => (n * steepest(r)) / 1000;

export function buildRounds(level: 1 | 2 | 3 | 4, random: () => number): Round[] {
  const pools = [OUT, TUBE, FLIP, SHOW][level - 1] as unknown[][];
  const kind = (['out', 'tube', 'flip', 'show'] as const)[level - 1];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

export type Fault = 'dim' | 'blown';
export type Values = { th?: number; r?: number; t?: number; n?: number };
const same = (a: number, b: number) => Math.abs(a - b) < 1e-6;

export function fault(r: Round, x: Values): Fault | null {
  switch (r.kind) {
    case 'out': return x.th === r.th ? null : x.th! > r.th ? 'dim' : 'blown';   // more tilt, less flux
    case 'tube': return same(x.r!, r.r) ? null : x.r! < r.r ? 'dim' : 'blown';
    case 'flip': return same(x.t!, r.t) ? null : x.t! > r.t ? 'dim' : 'blown';   // a slower flip, a smaller emf
    case 'show': return x.n === r.n ? null : x.n! < r.n ? 'dim' : 'blown';
  }
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;

/** L4, blown: the moment Wink cracks, at the first step whose emf goes over the rating (0.5 s of animation per 1 s step). */
export function popAt(r: ShowRow, n: number): number {
  const i0 = slopes(r).findIndex((s) => n * Math.abs(s) > r.vb * 1000 + 1e-9);
  return 0.3 + 0.5 * i0 + 0.1;
}
/** Seconds into the dive at which the verdict lands. */
export function verdictDelay(r: Round, x: Values): number {
  const f = fault(r, x);
  if (r.kind === 'out') return f === 'blown' ? 0.45 : 0.85;
  if (r.kind === 'tube') return f === 'blown' ? 0.42 : 0.6;
  if (r.kind === 'flip') return f === 'blown' ? 0.45 : 0.3 + Math.min(x.t!, 0.7);
  return f === 'blown' ? popAt(r, x.n!) + 0.05 : 1.85;
}
```

- Judging is by dial value (the rows put exactly one dial value on the target). The physics is monotonic, so `dim` and `blown` match what the emf really does (checked by script, and tested in 9.1).
- `buildRounds` must be the **first** use of `random` in the level, so the UI test rebuilds the same rounds from the same seed.
- Start settings: level 1 `th = 90` (edge-on, no flux: Wink stays dark), level 2 `r = 1`, level 3 `t = 2`, level 4 `n = 10`. None wins on any row (tested). Each start "tells nothing": it gives a dim result, as every setting on that side does.

### 5.4 Words

Number formatting: `p3 = (x: number) => x.toPrecision(3)` for the targets (`1.00 V`, `0.505 V`, `62.8 mA`), and `fmt` from `@core/judge` for working values.

**`intel(r)`**:
- out: `` `Hoop: ${r.n} turns of ${r.a} cm², in ${r.b} T pointing straight up. The pad dies in 0.5 s. Wink needs ${p3(r.vb)} V.` ``
- tube: `` `The sleeve has ${r.n} turns per cm. Tug ramps it from ${r.i1} A to ${r.i2} A in 0.2 s. The ring has 200 turns. Wink needs ${p3(r.vb)} V.` ``
- flip: `` `Hoop: ${r.n} turns, radius ${r.rc} cm, flat in ${r.b} T. Hoop and Wink together have ${r.R} Ω. Wink needs ${p3(r.ma)} mA.` ``
- show: `` `The program drives the flux per turn along the graph, one step per second. Wink is rated ${p3(r.vb)} V and must reach it at the brightest moment.` ``

**Hint line** (`hintText`): `` `${intel(r)} ${r.assist === 0 ? 'Dive 1: the console meter is live.' : r.assist === 1 ? 'The meter is off: a console check costs a charge.' : 'Final dive: no meter.'}` ``

**`missText(r, x)`** (what the player’s setting did and what to change, never the answer):
- out, dim, `th = 90`: `` `Edge-on at 90°, no field lines crossed the hoop: there was no flux to lose, so Wink stayed dark. Tilt the hoop flatter.` ``
- out, dim: `` `Tilted to ${x.th}°, the hoop held too little flux: when the field died the emf was too small and Wink only glowed dimly. Tilt it flatter.` ``
- out, blown: `` `Tilted to ${x.th}°, the hoop held too much flux: when the field died the emf was too big and Wink’s glass cracked. Tilt it more steeply.` ``
- tube, dim: `` `A ${x.r} cm ring caught too little of the changing flux: Wink only glowed dimly. Use a bigger ring.` ``
- tube, blown: `` `A ${x.r} cm ring caught too much of the changing flux: the emf was too big and Wink’s glass cracked. Use a smaller ring.` ``
- flip, dim: `` `A ${x.t} s flip changed the flux too slowly: the current was too small and Wink only glowed dimly. Flip faster.` ``
- flip, blown: `` `A ${x.t} s flip changed the flux too fast: the current was too big and Wink’s glass cracked. Flip more slowly.` ``
- show, dim: `` `With ${x.n} turns even the steepest step gave too little emf: Wink never reached full brightness. Use more turns.` ``
- show, blown: `` `With ${x.n} turns a step pushed Wink over its rating and its glass cracked. Use fewer turns.` ``

**`meterText(r, x)`** (the paid console check; it may print numbers for the player’s own setting):
- out: `` `Console check: tilted to ${x.th}°, the hoop links ${fmt(emfOut(r, x.th!) * DT1)} Wb, so Wink would get ${fmt(emfOut(r, x.th!))} V.` ``
- tube: `` `Console check: a ${x.r} cm ring would give Wink ${fmt(emfTube(r, x.r!))} V.` ``
- flip: `` `Console check: a ${x.t} s flip would drive ${fmt(maFlip(r, x.t!))} mA through Wink.` ``
- show: `` `Console check: with ${x.n} turns the brightest step would give Wink ${fmt(peakShow(r, x.n!))} V.` ``

**`lcdText(r, x)`** (the console LCD, section 6.2): out `` `WINK ${fmt(emfOut(r, x.th!))} V` ``; tube `` `WINK ${fmt(emfTube(r, x.r!))} V` ``; flip `` `WINK ${fmt(maFlip(r, x.t!))} mA` ``; show `` `PEAK ${fmt(peakShow(r, x.n!))} V` ``. `LCD_OFF = '— — —'`.

**`winText(r)`** (two short lines, UX item 6):
- out: `` `Spotted! The hoop linked NBA cos θ = ${r.n} × ${r.b} × ${r.a / 1e4} × cos ${r.th}° = ${fmt(emfOut(r, r.th) * DT1)} Wb. It fell to zero in 0.5 s, so ε = ΔΦ/Δt = ${p3(r.vb)} V.` ``
- tube: `` `Spotted! Inside the sleeve B = μ₀nI, so the ring’s flux rose with the current: ε = Nμ₀nπr² ΔI/Δt = 200 × 4π × 10⁻⁷ × ${r.n * 100} × π × ${r.r / 100}² × ${r.i2 - r.i1} ÷ 0.2 = ${p3(r.vb)} V.` ``
- flip: `` `Spotted! A 180° flip takes the flux from +BA to −BA, a change of 2BA. ε = 2NBA/t = 2 × ${r.n} × ${r.b} × π × ${r.rc / 100}² ÷ ${r.t} = ${fmt(emfFlip(r, r.t))} V, so I = ε/R = ${p3(r.ma)} mA.` ``
- show: `` `Signal received! The emf is the slope of the flux graph. The steepest step ${slopes(r).find((s) => Math.abs(s) === steepest(r))! < 0 ? 'falls' : 'rises'} ${steepest(r)} mWb in 1 s, which is ${steepest(r)} mV per turn, and ${r.n} × ${steepest(r)} mV = ${p3(r.vb)} V.` ``

## 6. Screen and art

Canvas 640 × 340. Draw the sea over the engine’s background with **opaque fills** (water gradient, seabed), so the engine grid never shows.

```ts
export const HOOP = { x: 300, y: 172, r: 48 };              // the hoop’s centre and half-length (levels 1, 3, 4)
export const WINK_AT = { x: 300, y: 96 };                   // Wink floats here in levels 1, 3, 4; in level 2 it sits at (404, 206)
export const PAD = { x0: 210, x1: 390, top: 240 };          // the docking pad’s deck plate; its skirt runs to the seabed
export const MAGNET = { x: 220, y: 250, w: 160, h: 34 };    // the electromagnet inside the pad (cut-away)
export const SLEEVE = { x: 300, top: 110, bottom: 292, r: 45, win0: 170, win1: 240 }; // level 2: the charging sleeve and its glass window
export const RING_Y = { held: 96, inside: 205 };            // level 2: the ring above the mouth, and inside the window
export const PX_PER_CM = 5;                                 // level 2: ring half-width = 5 px per cm of radius (not to scale with the answer)
export const LCD = { x: 500, y: 258, w: 120, h: 18 };       // the helper readout on the console
export const GRAPH = { x: 420, y: 70, w: 180, h: 128 };     // level 4 station screen: 8 px per mWb (0 to 16), 60 px per second (3 steps)
```

### 6.1 The seabed

- **Water**: a vertical gradient over the whole canvas (colours by round, section 6.7), with faint drifting specks (12 dots of 1 px, alpha 0.3, drifting up 6 px/s and wrapping).
- **Seabed**: sand from y = 300 to the bottom (`#3a3324`, with a few darker ripples every 40 px), two clumps of sea grass at x ≈ 30 and x ≈ 460 that sway `sin(t·1.5)·3` px, and a few pebbles.
- **The docking pad** (`PAD`, `MAGNET`), drawn as in section 4.
- **The field** (levels 1, 3, 4): seven dashed vertical lines at x = 252, 268, …, 348 from y = 236 up to y = 120, each with an arrowhead pointing up, `PAL.cyan` at alpha 0.35, and a `B ⬆` tag (11 px) at (360, 126). In level 1 their alpha falls to 0 as the pad dies.
- **The hoop** (levels 1, 3, 4): a side view. Draw it as a copper ellipse centred on `HOOP` with half-length 48 and half-thickness 9, its long axis turned by θ from horizontal (positive θ turns the right end down; at θ = 90° it stands edge-on). Line width `2 + n/40` (level 4 uses the player’s N; other levels use the row’s n). A white dashed normal arrow (length 40) from the centre at right angles to the hoop, and a thin arc (radius 30, `PAL.white`, alpha 0.6) from the vertical to the normal: the tilt is visible. A tag on the rod near Kavya’s hand at (196, 236): `` `${n} turns` `` (11 px) in levels 1 and 3.
- **Level 2, the charging sleeve** (`SLEEVE`): a glass cylinder (ellipse top and bottom, rx 45, ry 10) wound with copper stripes every 8 px (2 px, `PAL.orange`, alpha 0.8), except in the window (y 170 to 240) where the stripes are dashed so the ring inside shows. It stands on a steel foot with a stencil `CHARGING SLEEVE` (11 px). Wink sits on a small pedestal at (404, 206), joined to the ring by two thin leads (a bezier from the ring’s right rim over the sleeve mouth).
  - The ring is an ellipse with half-width `PX_PER_CM * r` and half-height 0.28 × that, centred at (300, `RING_Y.held`) before the dive, hanging from Kavya’s rod.
  - The console shows the ramp as text (11 px) at (560, 246): `` `I: ${r.i1} → ${r.i2} A` ``.
- **Level 4, the station screen** (`GRAPH`): a black screen in a steel frame on a short mast above the console, a grid every 2 mWb (16 px) and every second (60 px) in `rgba(130,160,255,0.25)` lines, the flux line in `PAL.cyan` (3 px) through the four points with white dots, the label `16 mWb` (11 px) at the top-left corner (424, 66), the label `1 s` (11 px) under the first column, and `flux per turn` (11 px) under the screen. No other numbers. During the dive a white cursor line moves across it, and a small `×2 speed` tag (11 px) sits under the right corner (the 3 s program plays in 1.5 s).
- **Levels 3 and 4 track**: `track(g, lo, hi)` along the bottom with the handle (section 7).

### 6.2 The helper (the console LCD)

Use `paidFlash()` and `helperOn` from `@core/aidflash` exactly as `src/games/mathematics/class-12/ch10-vector-algebra/panel-tilt/index.ts` does (`flash.paid()` inside `test.read`, `since = flash.since(A.clock, k)` in `draw`).

| Round | LCD at `LCD` (green digits on black, 12 px) |
|---|---|
| 1 (`assist 0`) | live `lcdText(r, v)` |
| 2 (`assist 1`) | `LCD_OFF`, except for 1.5 s after a console check, when it shows `lcdText` in `PAL.yellow` |
| 3 (`assist 2`) | `LCD_OFF` always; the check button gives `No charges left this round.` through the engine (charges `[1, 1, 0]`) |

During a dive the LCD follows `helperOn(r.assist, shot.ok, Infinity)`: live in round 1, the true value on a win, otherwise `LCD_OFF`. The LCD is the **only** place the player’s resulting emf or current appears before a dive (prove it with the canvas recorder, section 9).

### 6.3 Level 1: the dive (`rt` = seconds since Signal)

- 0.00: Kavya’s OK sign and `SIGNAL!`; Tug throws the knife switch (0.00 to 0.30, `CLICK` at 0.25).
- 0.30 to 0.80: the pad dies. The field lines’ alpha falls from 0.35 to 0, the hum stops, the magnet’s copper dims.
- Wink during 0.30 to 0.80:
  - win: glow rises to 1 by 0.35 and holds to 0.80, then fades to 0 by 1.00 (the flux has stopped changing).
  - dim: a fixed glow of 0.25 from 0.30 to 0.80, then off (no flicker).
  - blown: glow 0.6 from 0.30; at **0.40** the crack: crack lines, the bubble burst, `CRACK`, and a white full-screen flash from alpha 0.35 to 0 over 0.12 s (skipped under reduced motion), then the flooding and rising bubbles.
- Verdict at **0.45** (blown) or **0.85** (otherwise). Then the reactions from section 4 until 2.3 s.

### 6.4 Level 2: the dive

- 0.00: the OK sign, `SIGNAL!`. 0.00 to 0.30: the ring sinks from `RING_Y.held` to `RING_Y.inside` (ease-out), the leads following.
- 0.30 to 0.50: Tug pulls the ramp lever; the ammeter needle on the console swings from its `i1` mark to its `i2` mark; the sleeve’s copper stripes brighten from alpha 0.8 to 1 with a soft orange glow.
- Wink: win glow 1 from 0.30 to 0.50, then fades to 0 by 0.65 (the current is steady again: no change, no emf); dim 0.25 from 0.30 to 0.50; blown 0.6 from 0.30 and cracks at **0.38**.
- Verdict at **0.42** (blown) or **0.60**. Reactions until 2.3 s.

### 6.5 Level 3: the dive

- 0.00: the OK sign, `SIGNAL!`; Tug raises the dive timer.
- 0.30 to 0.30 + t: the hoop turns from θ = 0 to θ = 180° at a steady rate (`θ = 180 · clamp01((rt − 0.3)/t)`); the normal arrow turns with it, so it ends pointing down.
- Wink during the flip: win glow 1, dim 0.25, blown 0.6 with the crack at **0.40**. When the flip ends Wink goes dark.
- Verdict at **0.45** (blown) or **0.3 + min(t, 0.7)**. The flip keeps going after the verdict and ends by 2.3 s (t ≤ 2).

### 6.6 Level 4: the flux program

- 0.00: the OK sign, `SIGNAL!`; Tug presses PLAY.
- 0.30 to 1.80: the program plays, 0.5 s per step; the cursor moves across the screen.
- Wink:
  - win: glow `|slope_i| / steepest` in step i (full in the steepest step, with a `FLASH!` floater at Wink when that step starts);
  - dim: a fixed 0.25 in every step;
  - blown: a fixed 0.6 until `popAt(r, n)`, then the crack.
- Verdict at `popAt(r, n) + 0.05` (blown, at most 1.45 s) or **1.85**. Reactions until 2.35 s.

### 6.7 Rounds that look different (UX item 8)

- Round 1: shallow water, a turquoise gradient (`#0d5a6e` at the top to `#06283a` at y = 300), and four sunbeams slanting down from the top (white, alpha 0.06, swaying slowly).
- Round 2: deeper water, a deep-blue gradient (`#0b2a5a` to `#04102a`), and the shipwreck behind the station: a dark hull (`#1a2238`) from x 430 to 640, y 150 to 300, with three round portholes and a broken mast leaning left. Draw it before the console so it sits behind everything.
- Round 3 (BOSS): the abyss, near black (`#02050f` to `#010208`), no sunbeams, twelve tiny bioluminescent specks (`PAL.cyan` and `PAL.green`, alpha pulsing at 0.5 Hz), a pale jellyfish drifting at the top left (a dome and four wavy tentacles, alpha 0.5), a single cone of light from Kavya’s chest lamp onto the pad (alpha 0.12, `#fff3c4`), and the `FINAL DIVE` slate.

### 6.8 What must never show

- No target angle, radius, flip time or number of turns is drawn anywhere. The tilt arc, ring size, track handle and tags show only the player’s own setting.
- Wink’s glow on a miss is one of the fixed `GLOW` values.
- `hit` is the fixed point `[320, 70]` in every level.
- The LCD rule of 6.2.

### 6.9 UX checklist (README, all ten items)

| # | Item | In this game |
|---|---|---|
| 1 | Goal on the canvas | During play, one line at (320, 40), 13 px bold `PAL.white`: L1 `` `Light Wink: it needs ${p3(vb)} V` ``; L2 same; L3 `` `Light Wink: it needs ${p3(ma)} mA` ``; L4 `` `Signal: Wink peaks at exactly ${p3(vb)} V` ``. Hidden during a dive (the verdict line takes y = 22). |
| 2 | Own setting by its handle | L1 `` `θ ${th}°` `` at (handle.x + 26, handle.y + 5), 13 px bold `PAL.yellow`, left-aligned; L2 `` `r ${r} cm` `` at (300 + 5r + 26, 100); L3 `` `${t} s flip` `` and L4 `` `N ${n}` `` centred 26 px above their track handle (at y = 296). Given facts on the scene: `B ⬆`, the pad’s B, the hoop’s turns tag, the ramp text, the screen labels. At most 3 numbers on the scene besides the player’s setting: L1 vb, B, n; L2 vb, i1, i2; L3 ma, B, n; L4 vb, `16 mWb`, `1 s`. |
| 3 | Handles | Radius 20 in every level. Draw a grip: a `PAL.yellow` ring (2 px) with `⇕` (L1, on the hoop’s right end) or `⇔` (L2, L3, L4) at 13 px inside. The engine brightens a handle while it is dragged. In level 1 round 1, until the dial first moves from its start, draw `drag` (11 px, `PAL.yellow`) 28 px below the handle, blinking at 1.5 Hz. |
| 4 | Legible text | Every scene string ≥ 11 px; labels placed at the coordinates above do not overlap Kavya, Wink, the hoop or each other (the topside screen sits at the top left, the station screen at the top right, Tug below it). Every colour has a word (`SPOTTED!`, `BEACON LOST`, `NOTHING…`, `CRACK`) or symbol (`⬆`, `⇕`). |
| 5 | Instant response | At rt = 0 Kavya’s OK sign starts, the bubbles burst and `SIGNAL!` appears. A win (warm glow, `Spotted!`, sound `ok`) and a miss (crack and bubbles, or a droop, sound `bad`) look and sound completely different. |
| 6 | Teach briefly | `winText` is two lines of working. Miss texts end with the plain fix (`Tilt it flatter.`, `Use a bigger ring.`, `Flip faster.`, `Use fewer turns.`). |
| 7 | Living hero | Kavya, Wink and Tug all have idle motion, an action at rt 0 to 0.3, and a mood after every verdict (section 4). |
| 8 | Variety | Section 6.7. |
| 9 | Accessibility | Sliders from `mountDialLevel` (keyboard ready) with the aria labels of section 7; buttons with aria labels; the ARIA scene text of section 7. Use `A.shake` and `A.burst` only (the engine trims them under reduced motion) and skip the white crack flash when `matchMedia('(prefers-reduced-motion: reduce)')` matches (guard with `?.`). |
| 10 | Comfort | Nothing blinks faster than 2 Hz. The only full-screen flash is the crack, alpha ≤ 0.35 for 0.12 s. |

## 7. Controls and mount

Write one function `level(n: 1 | 2 | 3 | 4, random)` returning a `DialLevel<Round>`; it calls `buildRounds(n, random)` first.

| Level | dial | handle |
|---|---|---|
| 1 | `{ key: 'th', aria: 'Tilt of the hoop in degrees from flat', label: 'Tilt', unit: '', step: 5, min: 0, max: 90, start: 90, text: (x) => `${x}°` }` | the hoop’s right end: `at: (_r, v) => [HOOP.x + HOOP.r * Math.cos(rad(v.th)), HOOP.y + HOOP.r * Math.sin(rad(v.th))]`, `drag: (_r, px, py) => (Math.atan2(py - HOOP.y, Math.max(1, px - HOOP.x)) * 180) / Math.PI`, radius 20 |
| 2 | `{ key: 'r', aria: 'Radius of the ring in centimetres', label: 'Ring', unit: 'cm', step: 0.5, min: 1, max: 8, start: 1 }` | the ring’s right rim: `at: (_r, v) => [SLEEVE.x + PX_PER_CM * v.r, RING_Y.held]`, `drag: (_r, px) => (px - SLEEVE.x) / PX_PER_CM`, radius 20 |
| 3 | `{ key: 't', aria: 'Time for the half-turn flip in seconds', label: 'Flip time', unit: 's', step: 0.1, min: 0.1, max: 2, start: 2 }` | `trackHandle('t', () => 0.1, () => 2)` |
| 4 | `{ key: 'n', aria: 'Number of turns on the hoop', label: 'Turns', unit: '', step: 10, min: 10, max: 200, start: 10 }` | `trackHandle('n', () => 10, () => 200)` |

(The engine’s slider clamps and snaps every drag value. In level 1, `Math.max(1, px - HOOP.x)` makes a drag to the left of the hoop’s centre read as straight down (90°) or straight up (clamped to 0°), never a jump across.)

Common to every level:
- `hero: { name: 'Kavya', role: ROLE, ...HEROES[n - 1] }`, `charges: [1, 1, 0]`.
- `test: { button: '🔎 Console check', aria: 'Console check: read the station meter for this setting', read: (r, v) => (flash.paid(), meterText(r, v)) }`.
- `fire: { button: '🔦 Signal!', aria: 'Signal the ship: run the station and light the beacon' }`.
- `judge`, `miss: missText`, `win: winText`, `hint: hintText`, `hit: () => [320, 70]`, `delay: (r, v) => verdictDelay(r, v)`, and `draw`.
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(4, ctx.level)) as 1 | 2 | 3 | 4; return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA); } })`.
- `ARIA = 'Under the sea beside a shipwreck: a diver holds a wire hoop over a seabed electromagnet pad, a sealed beacon floats above the hoop, and a small robot submarine waits at the station console.'`

## 8. game.json (copy exactly)

Copy `docs/curriculum/gap-designs/rebuilds/json/faraday-bench.json` over the existing `game.json`. Its lengths were checked by script on 2026-10-31 (see the final lines of this section); the title and summary are unique against every other `game.json` in `src/games` and `rebuilds/json`. It keeps `order: 1` and `ncertRef: "Section 6.3, Magnetic flux"`. Title `The Deep-Sea Beacon`. The level titles are `Pad switch-off`, `The charging sleeve`, `The flip` and `The flux program`. Copy the file; do not retype it.

Checked lengths: title 19, summary 128, learningOutcome 165 (curly apostrophe), `adds` 149, 109, 107, 123, hints 3 per level and all under 120, 6 concepts, 5 misconceptions.

## 9. Tests

### 9.1 `logic.test.ts`

1. **Pools** (every row):
   - out: `Number(emfOut(r, r.th).toPrecision(3)) === r.vb`; `acos(r.vb · 0.5 / (n·b·a·1e-4))` in degrees is within 1° of `r.th`.
   - tube: `Number(emfTube(r, r.r).toPrecision(3)) === r.vb`; solving `r = 100·√(vb·0.2 / (200·μ₀·n·100·π·(i2 − i1)))` is within 0.05 cm of `r.r`.
   - flip: `Number(maFlip(r, r.t).toPrecision(3)) === r.ma`; solving `t = 2nbπ(rc/100)² / (ma/1000 · R)` is within 0.02 s of `r.t`.
   - show: every flux value is even and in 0..16; no step is flat; exactly one step has the largest size; `peakShow(r, r.n)` equals `r.vb` to 1e-9.
2. **One winner**: scan every dial value (L1 0..90 step 5; L2 1..8 step 0.5; L3 0.1..2 step 0.1, built as `Number((0.1 * i).toFixed(1))`; L4 10..200 step 10). Only the answer passes `judge`; the start fails. Also check the physics agrees: for every wrong value, the emf (or current, or peak) is below the target when `fault` says `dim` and above it when `blown`, by at least 2.5%.
3. **Rounds**: 80 seeds `Array.from({ length: 80 }, (_, i) => i * 7919 + 13)`; each level has 3 rounds of its kind, `assist` is `[0, 1, 2]`, round k comes from pool k, and the three answers of a level differ.
4. **Answers**: no answer is a dial end; the answer sets of the three pools of a level are disjoint.
5. **Timing**: `verdictDelay` ≤ 2.0 for every row and every dial value; `popAt(r, n)` is defined (index ≥ 0) for every `n > r.n`.
6. **Words**: for every row and every wrong setting, `missText` never contains the answer token: `` `${r.th}°` `` (L1), `` `${r.r} cm` `` (L2), `` `${r.t} s` `` (L3), `` `${r.n} turns` `` (L4), using a leading `(^|[^0-9.])` in the regex. `winText` contains `ΔΦ/Δt` (out), `μ₀nπr²` (tube), `2BA` (flip), `slope` (show). `GLOW` is exactly `{ dim: 0.25, blown: 0.6, win: 1 }`.

### 9.2 `tests/faraday-bench-ui.test.ts`

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch06-electromagnetic-induction/faraday-bench/index';
import { buildRounds, type Round } from '../src/games/physics/class-12/ch06-electromagnetic-induction/faraday-bench/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'faraday-bench', 4);
const build = (level: number, seed: number) => buildRounds(level as 1 | 2 | 3 | 4, createRng(seed));
const FIRE = 'Signal the ship: run the station and light the beacon';
function set(r: Round, right: boolean) {
  if (r.kind === 'out') h.setSlider(right ? r.th : r.th + 5);
  if (r.kind === 'tube') h.setSlider(right ? r.r : r.r + 0.5);
  if (r.kind === 'flip') h.setSlider(right ? r.t : Number((r.t + 0.1).toFixed(1)));
  if (r.kind === 'show') h.setSlider(right ? r.n : r.n + 10);
}
shellTests<Round[]>(h, { levels: [1, 2, 3, 4], build, setRight: (g, k) => set(g[k], true), setWrong: (g, k) => set(g[k], false), commit: () => h.click(FIRE) });
```

Then `describe('The Deep-Sea Beacon', …)`:
- Level 1’s slider runs 0 to 90 in steps of 5 and starts at 90; level 2’s runs 1 to 8 (step 0.5, start 1); level 3’s 0.1 to 2 (step 0.1, start 2); level 4’s 10 to 200 (step 10, start 10).
- Level 1 at the start (90°) gives a miss containing `stayed dark`; level 1 at 0° gives `cracked`.
- A console check costs a charge: `/Console check/`, then `/No charges left/`, and the hearts stay at 3.
- A win says `Spotted!` in levels 1 to 3 and `Signal received!` in level 4.
- A miss never states the answer (the 9.1 tokens) and costs a heart.
- **Canvas recorder** (`tests/helpers/canvas-rec.ts`): the LCD text (`/^WINK .* (V|mA)$/` or `/^PEAK .* V$/`) is drawn in round 1; in round 2 only within 1.5 s after a check (and not 1.6 s after); never in round 3. Before the player moves the slider, no drawn text contains the round’s answer token (`` `θ ${r.th}°` ``, `` `r ${r.r} cm` ``, `` `${r.t} s flip` ``, `` `N ${r.n}` ``).
- The goal line (`/^Light Wink|^Signal:/`) is drawn during play in every level and not while a dive plays.

## 10. Traps to avoid

- **Fixed glows**: Wink’s glow on a miss is 0.25 (dim) or 0.6 then a crack (blown). Never scale it with the player’s emf, current or peak.
- **Level 1 direction**: a *bigger* tilt means *less* flux, so `th > answer` is `dim`. The hoop is drawn with θ from horizontal (the normal from vertical); keep the two consistent.
- **Level 1 start**: 90° is edge-on, zero flux, and Wink stays completely dark (the "no change of flux, no emf" case is the dim text with `stayed dark`).
- **Emf only while changing**: on a win Wink must go dark when the change stops (level 1 after 0.80 s, level 2 after 0.50 s, level 3 at the end of the flip). This is the main lesson; do not leave the beacon lit.
- **Level 3 floats**: dial values like 0.7 are not exact in binary; compare with `same()` (1e-6) and build test values with `toFixed(1)`.
- **Level 4**: the steepest step may fall. `steepest` takes the size of the slope; the win text says whether it rises or falls. The blown crack happens at `popAt`, the first step over the rating, which is honest; the dim glow is fixed.
- **Level 4 time**: the 3 s program plays at double speed (0.5 s per step); keep the `×2 speed` tag.
- **No Math.random** in logic; bubbles and specks use the engine’s `burst` or `t`-based motion.
- **Busy scene**: the fish, crab, sea grass and specks are decor; keep them small and dim (alpha ≤ 0.5) so they never compete with Wink, the hoop or the labels.
- **Names**: the robot is `Tug`, the beacon is `Wink`, the diver is `Kavya`. No trademarked names anywhere a student sees.
- **Docs**: do not edit `docs/curriculum/physics-class-12/ch06-concept-weights.md`; the reviewer updates it.
