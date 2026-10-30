# Ch 6 · Faraday Bench rebuilt as "The Glowing Hoop" (Physics Ch 6, §6.3 and 6.4)

Read `../README.md` first (every rule, above all "A miss must not show the answer either", "Helpers fade" and the "UX checklist"), then `README.md` in this folder (the rules for a rebuild). The model rebuild is `src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-bench/` (brief `../20-capacitor-bench.md`). Everything below is required unless marked "optional".

The old Faraday Bench was a number-entry quiz (type the flux, type the emf). This brief **replaces the whole game** with an arcade game on a theatre stage. It keeps the id, folder and `order`, and keeps every concept: Φ = BA cos θ and its change, Faraday’s law with N turns, the loop inside a solenoid (Ex 6.3), the 180° turn of a coil with ε and I = ε/R (Example 6.3), and the emf as the slope of a flux graph with the largest emf in the steepest segment. It adds Example 6.2 (a field that dies to zero through a tilted loop), which `ch06-concept-weights.md` lists under E2.

## 1. Identity

| Field | Value |
|---|---|
| Game id | `faraday-bench` (unchanged) |
| Folder | `src/games/physics/class-12/ch06-electromagnetic-induction/faraday-bench/` (existing) |
| Files | **Replace** `game.json` with `docs/curriculum/gap-designs/rebuilds/json/faraday-bench.json` (exact copy). **Delete and rewrite** `logic.ts`, `logic.test.ts`, `index.ts`. **Add** `art.ts`. |
| UI test | **Delete** `tests/faradaybench-ui.test.ts`. **Create** `tests/faraday-bench-ui.test.ts`. |
| Engine | `mountDialLevel` from `@core/dialgame`, one `DialLevel` per level (4 levels) |
| Book coverage | §6.3 (Φ = BA cos θ), §6.4 (ε = −N dΦ/dt), Example 6.2 (field dying through a loop at 45°), Ex 6.3 (loop in a solenoid), Example 6.3 (180° turn, ε and I), §6.4 flux graph |
| Inspiration (code comment only) | Stage-magic games and the classic "floating light bulb" illusion; the finale borrows the read-the-pattern loop of rhythm games (the brightest flash lands on the steepest beat) |
| Core verb | **Turn the hoop**: drag the hoop to a tilt (level 1), choose the ring that goes into the tube (level 2), choose how fast to flip the hoop over (level 3), choose how many turns the finale hoop has (level 4); then say "Abracadabra!" and the trick plays. |

Nothing else in the repo imports the old `logic.ts` (only `tests/faradaybench-ui.test.ts`, which is deleted). Check again with a search for `faraday-bench/logic` before deleting.

## 2. What the student learns

- Flux through a flat coil in a uniform field is Φ = BA cos θ, with θ the angle between the field and the coil’s normal. Flat (θ = 0) holds the most flux, edge-on (θ = 90°) none. N turns link NΦ.
- An emf appears only while the flux changes: ε = N ΔΦ/Δt. A steady field or a steady current gives nothing (the bulb goes dark the moment the change stops).
- Inside a long solenoid B = μ₀nI, so a ramping current changes the flux through a ring inside: ε = Nμ₀nA ΔI/Δt.
- Turning a coil through 180° changes its flux from +BA to −BA, a change of 2BA (not zero). The average emf is 2NBA/t and the current I = ε/R.
- On a flux–time graph the emf is the slope. The steepest step gives the largest emf, rising or falling. 1 mWb/s is 1 mV per turn.

## 3. The mechanic, physically

**Mira** is a stage illusionist. Her act is the "self-lighting bulb": **Glim**, a light bulb that floats above her hand, glows with no battery. The secret is induction. Under her table hides an electromagnet whose field points straight up. Glim is wired to a hoop (a flat coil of wire) that Mira holds over the table. Her assistant **Theo** runs the magnet from a control desk at the side of the stage.

Glim is rated for one exact voltage (or current). Too little and it only glows dimly; too much and it bursts.

| Level | The player sets | What decides the trick |
|---|---|---|
| 1 Lights out | the hoop’s tilt θ | Theo switches the magnet off; the flux linkage NBA cos θ falls to zero in 0.5 s, so ε = NBA cos θ / 0.5 s. |
| 2 The magic tube | the ring radius r | A ring of 200 turns sits inside a long solenoid; Theo ramps the current in 0.2 s, so ε = 200 μ₀ n πr² ΔI / 0.2 s. |
| 3 The flip | the flip time t | Mira turns the flat hoop over through 180°, so ε = 2NBA/t and Glim’s current is ε/R. |
| 4 The finale | the hoop’s turns N | Theo’s program drives the flux per turn along a graph; the steepest step must give exactly Glim’s rating: N × (steepest slope) = rating. |

Physical consequences (every miss shows only what the player’s own setting did, and only its direction):
- **Dim**: Glim glows at a **fixed** faint level (alpha 0.25) while the flux changes, its face droops, the APPLAUSE sign shows `Zzz…`.
- **Blown**: Glim’s glass cracks with a `POP`, sparks and smoke; Mira is frazzled; the sign shows `GASP!`.
- **Win**: Glim glows warm and full while the flux changes, then goes dark as soon as the change stops (the lesson), and the sign lights `APPLAUSE`.

**Fixed glows.** Glim’s brightness on a miss is one of the fixed values in `GLOW` (dim 0.25; blown 0.6 until the pop). It is never proportional to the player’s emf, so a miss cannot be measured to scale up the next try.

## 4. Story and characters

Hero banner: `name: 'Mira'`, `role: 'a stage illusionist who lights a floating bulb with a hoop of wire and a hidden electromagnet'`.

| Level | story | objective |
|---|---|---|
| 1 | `Tonight’s opening trick: Glim, the floating bulb, lights up by itself. Under the table hides an electromagnet whose field points straight up through Mira’s hoop. The flux through the hoop is Φ = BA cos θ, where θ is the tilt of the hoop’s normal from the field. When Theo switches the magnet off, the flux dies in 0.5 s, and the emf ε = NΔΦ/Δt lights Glim only while the flux is changing.` | `Tilt the hoop so that, when the field dies, Glim gets exactly the voltage it needs, in three tricks.` |
| 2 | `Next, the magic tube: a long tube secretly wound as a solenoid, so the field inside is B = μ₀nI. Mira lowers a ring of 200 turns into it, flat across the tube, and Theo ramps the current up in 0.2 s. The flux through the ring rises with the current, and Glim glows only while the current is changing.` | `Pick the ring size that gives Glim exactly its voltage when the current ramps, in three tricks.` |
| 3 | `The flip: Mira holds the hoop flat over the magnet and turns it over through 180°. The flux per turn goes from +BA to −BA, a change of 2BA, so the average emf is 2NBA/t and the current through Glim is ε/R. Her flip time is her flourish.` | `Choose how fast to flip so Glim gets exactly the current it needs, in three tricks.` |
| 4 | `The grand finale: Theo’s desk runs a program that drives the flux per turn through the hoop step by step, as the stage monitor shows. The emf in each step is the slope of the graph, so Glim flashes brightest in the steepest step, whether the flux is rising or falling. Mira chooses how many turns her finale hoop has.` | `Pick the number of turns so Glim reaches exactly its rating at the brightest moment, without bursting, in three tricks.` |

Characters (each in its own function in `art.ts`, AGENTS.md item 17):
- **Mira** (hero), `mira(g, t, o)`. Feet at (150, 300), about 110 px tall (head centre (150, 196), radius 15).
  - Gear: a black top hat with a red band and a playing card (♠) tucked in it; a purple tailcoat with long tails and three gold buttons; a sparkly silver waistcoat (three tiny white dots that twinkle in turn); a short black cape; white gloves; boots. In her right hand a black wand with a white tip. A thin brass rod runs from her right hand (206, 214) to the hoop’s left end (levels 1, 3, 4) or to the ring’s hanger (level 2), so she visibly holds the prop.
  - Pose: standing three-quarter toward the table, right arm out to the rod, left hand on her hip.
  - Idle: the cape and tails sway (`sin(t·2.5)·2` px), she blinks every 3 s, the wand tip draws a small 2 px circle every 4 s, and she glances at the audience (head turns 5 px left) every 5 s.
  - Action (rt 0.00 to 0.30): her left arm sweeps up in a flourish (0° to 70° over 0.25 s), 8 `PAL.yellow` sparkles burst from her left glove once, and an `ABRACADABRA!` floater appears at (150, 140).
  - Moods: `face(g, …, 'happy')` while waiting; `'cheer'` and a bow on a win (body leans 15° forward, hat tipped 10°, from the verdict for 0.6 s); `'worried'` with a sweat drop on a dim miss; **frazzled** on a blown miss (hat knocked 20° askew, spiral eyes drawn by hand since `face` has no such mood, a grey soot dot on her cheek).
- **Glim** (the target), `glim(g, t, o)`. A pear-shaped glass bulb, radius 15, centre `GLIM` (300, 96) in levels 1, 3, 4 and (404, 206) in level 2, with a brass screw base (12 × 8) underneath and a coiled filament inside. Two short wires run from its base to the hoop (or ring).
  - Idle: it floats with a bob (`sin(t·2)·3` px), sleepy half-closed eyes, a small `z` (11 px, `PAL.dim`) every 4 s at its upper right.
  - Lit: a warm radial glow (`#ffd27a`) with alpha = the glow value; when the glow is 1, eight short rays around it. Eyes wide open and a grin on a win.
  - Dim: a faint orange glow (alpha 0.25), a sad mouth, the eyes half closed.
  - Blown: three jagged white crack lines on the glass, a black filament, spiral (dizzy) eyes, grey smoke wisps rising until 2.3 s; at the pop, 14 `PAL.yellow` sparks burst from it once and a `POP` floater appears beside it.
- **Theo** (NPC), `theo(g, t, o)`. The stage assistant behind the control desk on the right (desk x 490 to 630, y 250 to 300; his head centre (585, 222), radius 14).
  - Gear: a flat cap, round glasses, a black T-shirt marked `CREW` (11 px, `PAL.white`), a headset. The desk holds a big knife switch (level 1), a ramp lever with a small ammeter dial (level 2), a stopwatch (level 3) and a PLAY button with two tape reels (level 4), plus the LCD helper (section 6.2).
  - Idle: drums his fingers on the desk every 2 s and adjusts the headset every 5 s.
  - Action: level 1 throws the knife switch open (0.00 to 0.30, `CLICK` floater at 0.25); level 2 pulls the ramp lever (0.30 to 0.50) while the ammeter needle swings; level 3 holds up the stopwatch from 0.30 until the flip ends; level 4 presses PLAY at 0.00 and the reels spin until 1.80.
  - Win: claps (hands meet every 0.3 s), `'cheer'`. Dim: shrugs, `'worried'`. Blown: ducks (his head drops 16 px behind the desk).
- **The hidden electromagnet** (decor), `magnet(g, t, field)`: a cut-away under the table top (`MAGNET`): a grey iron core wound with copper (orange stripes every 6 px), a dashed outline, and the label `hidden magnet · B ${b} T ⬆` (11 px, `PAL.dim`) in levels 1, 3 and 4. While it is on it hums: two short vibration lines at each side, alternating every 0.25 s (2 Hz).
- **The APPLAUSE sign** (decor), `sign(g, state)`: a theatre light box at (16, 52), 124 × 24. Idle: `APPLAUSE` in `PAL.dim`. Win: `APPLAUSE` in `PAL.yellow`, blinking at 2 Hz. Dim: `Zzz…` in `PAL.dim`. Blown: `GASP!` in `PAL.red`. The word always carries the meaning, so colour is never the only cue.
- **The trick card** (decor): a small playing card drops in at the top centre for 0.8 s whenever a new round starts (detect `k` changing in `draw`): `TRICK 1`, `TRICK 2`, or `FINAL TRICK` in round 3, with a `TA-DUM` floater.

## 5. Rules (`logic.ts`)

### 5.1 Constants and types

```ts
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const MU0 = 4 * Math.PI * 1e-7;
export const DT1 = 0.5;  // s: in level 1 the magnet dies in 0.5 s (every row)
export const DT2 = 0.2;  // s: in level 2 Theo ramps the current in 0.2 s (every row)
export const NR = 200;   // turns on the level 2 ring (every row)
/** Glim’s glow: fixed values, never proportional to the player’s emf. */
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

Every row was checked by script on 2026-10-30 (section 9 lists the checks; they must be in `logic.test.ts`). `vb` and `ma` are the targets shown to 3 significant figures.

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

Script results (for the reviewer): every row has exactly one winning dial value; the nearest wrong setting differs from the target by at least 3.5% (L1, the 25° row), 13.8% (L2), 5.8% (L3) and 6.7% (L4); every target solves back to its answer (L1 within 0.3°, L2 within 0.005 cm, L3 within 0.002 s); no answer sits at a dial end; the three rounds of each level have disjoint answers.

### 5.3 Physics, rounds and judging

```ts
export const DIAL = {
  th: { min: 0, max: 90, step: 5, start: 90 },    // L1, degrees: 0 flat, 90 edge-on (no flux)
  r: { min: 1, max: 8, step: 0.5, start: 1 },     // L2, cm
  t: { min: 0.1, max: 2, step: 0.1, start: 2 },   // L3, s
  n: { min: 10, max: 200, step: 10, start: 10 },  // L4, turns
};

const rad = (deg: number) => (deg * Math.PI) / 180;
/** L1: emf in V when the field dies, for a tilt of th degrees. */
export const emfOut = (r: OutRow, th: number) => (r.n * r.b * r.a * 1e-4 * Math.cos(rad(th))) / DT1;
/** L2: emf in V for a ring of radius rad cm. */
export const emfTube = (r: TubeRow, rc: number) => (NR * MU0 * r.n * 100 * Math.PI * (rc / 100) ** 2 * (r.i2 - r.i1)) / DT2;
/** L3: average emf in V and current in mA for a flip lasting t s. */
export const emfFlip = (r: FlipRow, t: number) => (2 * r.n * r.b * Math.PI * (r.rc / 100) ** 2) / t;
export const maFlip = (r: FlipRow, t: number) => (emfFlip(r, t) / r.R) * 1000;
/** L4: the emf per turn in mV in each 1 s step (signed), the steepest size, and Glim’s peak in V for n turns. */
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

/** L4, blown: the moment Glim pops, at the first step whose emf goes over the rating (0.5 s of animation per 1 s step). */
export function popAt(r: ShowRow, n: number): number {
  const i0 = slopes(r).findIndex((s) => n * Math.abs(s) > r.vb * 1000 + 1e-9);
  return 0.3 + 0.5 * i0 + 0.1;
}
/** Seconds into the trick at which the verdict lands. */
export function verdictDelay(r: Round, x: Values): number {
  const f = fault(r, x);
  if (r.kind === 'out') return f === 'blown' ? 0.45 : 0.85;
  if (r.kind === 'tube') return f === 'blown' ? 0.42 : 0.6;
  if (r.kind === 'flip') return f === 'blown' ? 0.45 : 0.3 + Math.min(x.t!, 0.7);
  return f === 'blown' ? popAt(r, x.n!) + 0.05 : 1.85;
}
```

- Judging is by dial value (the brief’s rows put exactly one dial value on the target). The physics is monotonic, so `dim` and `blown` match what the emf really does.
- `buildRounds` must be the **first** use of `random` in the level, so the UI test rebuilds the same rounds from the same seed.
- Start settings: level 1 `th = 90` (edge-on, no flux: Glim stays dark), level 2 `r = 1`, level 3 `t = 2`, level 4 `n = 10`. None wins on any row (tested). Each start "tells nothing": it gives a dim result, as every setting on that side does.

### 5.4 Words

Number formatting: `p3 = (x: number) => x.toPrecision(3)` for the targets (`1.00 V`, `0.505 V`, `62.8 mA`), and `fmt` from `@core/judge` for working values.

**`intel(r)`**:
- out: `` `Hoop: ${r.n} turns of ${r.a} cm², in ${r.b} T pointing straight up. The magnet dies in 0.5 s. Glim needs ${p3(r.vb)} V.` ``
- tube: `` `The tube has ${r.n} turns per cm. Theo ramps it from ${r.i1} A to ${r.i2} A in 0.2 s. The ring has 200 turns. Glim needs ${p3(r.vb)} V.` ``
- flip: `` `Hoop: ${r.n} turns, radius ${r.rc} cm, flat in ${r.b} T. Hoop and Glim together have ${r.R} Ω. Glim needs ${p3(r.ma)} mA.` ``
- show: `` `The program drives the flux per turn along the graph, one step per second. Glim is rated ${p3(r.vb)} V and must reach it at the brightest moment.` ``

**Hint line** (`hintText`): `` `${intel(r)} ${r.assist === 0 ? 'Trick 1: Theo’s desk meter is live.' : r.assist === 1 ? 'The meter is off: a peek costs a charge.' : 'Final trick: no meter.'}` ``

**`missText(r, x)`** (what the player’s setting did and what to change, never the answer):
- out, dim, `th = 90`: `` `Edge-on at 90°, no field lines crossed the hoop: there was no flux to lose, so Glim stayed dark. Tilt the hoop flatter.` ``
- out, dim: `` `Tilted to ${x.th}°, the hoop held too little flux: when the field died the emf was too small and Glim only glowed dimly. Tilt it flatter.` ``
- out, blown: `` `Tilted to ${x.th}°, the hoop held too much flux: when the field died the emf was too big and Glim burst. Tilt it more steeply.` ``
- tube, dim: `` `A ${x.r} cm ring caught too little of the changing flux: Glim only glowed dimly. Use a bigger ring.` ``
- tube, blown: `` `A ${x.r} cm ring caught too much of the changing flux: the emf was too big and Glim burst. Use a smaller ring.` ``
- flip, dim: `` `A ${x.t} s flip changed the flux too slowly: the current was too small and Glim only glowed dimly. Flip faster.` ``
- flip, blown: `` `A ${x.t} s flip changed the flux too fast: the current was too big and Glim burst. Flip more slowly.` ``
- show, dim: `` `With ${x.n} turns even the steepest step gave too little emf: Glim never reached full brightness. Use more turns.` ``
- show, blown: `` `With ${x.n} turns a step pushed Glim over its rating and it burst. Use fewer turns.` ``

**`meterText(r, x)`** (the paid peek; it may print numbers for the player’s own setting):
- out: `` `Meter peek: tilted to ${x.th}°, the hoop links ${fmt(emfOut(r, x.th!) * DT1)} Wb, so Glim would get ${fmt(emfOut(r, x.th!))} V.` ``
- tube: `` `Meter peek: a ${x.r} cm ring would give Glim ${fmt(emfTube(r, x.r!))} V.` ``
- flip: `` `Meter peek: a ${x.t} s flip would drive ${fmt(maFlip(r, x.t!))} mA through Glim.` ``
- show: `` `Meter peek: with ${x.n} turns the brightest step would give Glim ${fmt(peakShow(r, x.n!))} V.` ``

**`lcdText(r, x)`** (the desk LCD, section 6.2): out `` `GLIM ${fmt(emfOut(r, x.th!))} V` ``; tube `` `GLIM ${fmt(emfTube(r, x.r!))} V` ``; flip `` `GLIM ${fmt(maFlip(r, x.t!))} mA` ``; show `` `PEAK ${fmt(peakShow(r, x.n!))} V` ``. `LCD_OFF = '— — —'`.

**`winText(r)`** (two short lines, UX item 6):
- out: `` `Ta-da! The hoop linked NBA cos θ = ${r.n} × ${r.b} × ${r.a / 1e4} × cos ${r.th}° = ${fmt(emfOut(r, r.th) * DT1)} Wb. It fell to zero in 0.5 s, so ε = ΔΦ/Δt = ${p3(r.vb)} V.` ``
- tube: `` `Ta-da! Inside the tube B = μ₀nI, so the ring’s flux rose with the current: ε = Nμ₀nπr² ΔI/Δt = 200 × 4π × 10⁻⁷ × ${r.n * 100} × π × ${r.r / 100}² × ${r.i2 - r.i1} ÷ 0.2 = ${p3(r.vb)} V.` ``
- flip: `` `Ta-da! A 180° flip takes the flux from +BA to −BA, a change of 2BA. ε = 2NBA/t = 2 × ${r.n} × ${r.b} × π × ${r.rc / 100}² ÷ ${r.t} = ${fmt(emfFlip(r, r.t))} V, so I = ε/R = ${p3(r.ma)} mA.` ``
- show: `` `Grand finale! The emf is the slope of the flux graph. The steepest step ${slopes(r).find((s) => Math.abs(s) === steepest(r))! < 0 ? 'falls' : 'rises'} ${steepest(r)} mWb in 1 s, which is ${steepest(r)} mV per turn, and ${r.n} × ${steepest(r)} mV = ${p3(r.vb)} V.` ``

## 6. Screen and art

Canvas 640 × 340. Draw the theatre over the engine’s background with **opaque fills** (back wall, curtains, floor), so the engine grid never shows.

```ts
export const HOOP = { x: 300, y: 172, r: 48 };              // the hoop’s centre and half-length (levels 1, 3, 4)
export const GLIM_AT = { x: 300, y: 96 };                   // Glim floats here in levels 1, 3, 4; in level 2 it sits at (404, 206)
export const TABLE = { x0: 210, x1: 390, top: 240 };        // the magic table; its skirt runs to the floor
export const MAGNET = { x: 220, y: 250, w: 160, h: 34 };    // the hidden electromagnet (cut-away)
export const TUBE = { x: 300, top: 110, bottom: 292, r: 45, win0: 170, win1: 240 }; // level 2: the magic tube and its glass window
export const RING_Y = { held: 96, inside: 205 };            // level 2: the ring above the mouth, and inside the window
export const PX_PER_CM = 5;                                 // level 2: ring half-width = 5 px per cm of radius (not to scale with the answer)
export const LCD = { x: 500, y: 258, w: 120, h: 18 };       // the helper readout on Theo’s desk
export const GRAPH = { x: 420, y: 70, w: 180, h: 128 };     // level 4 stage monitor: 8 px per mWb (0 to 16), 60 px per second (3 steps)
```

### 6.1 The stage

- **Back wall and curtains**: a dark wall, with two velvet curtains drawn back at the sides (x 0 to 40 and 600 to 640) and a curtain pelmet along the top (y 0 to 14). Curtain colour by round (UX item 8, section 6.6).
- **Floor**: wooden boards from y = 300 (stripes every 40 px), with two footlights glowing at (200, 304) and (440, 304).
- **The table** (`TABLE`), dark wood with a gold trim; its front skirt is drawn as a cut-away showing the hidden magnet (`MAGNET`), with the label from section 4.
- **The field** (levels 1, 3, 4): seven dashed vertical lines at x = 252, 268, …, 348 from y = 236 up to y = 120, each with an arrowhead pointing up, `PAL.cyan` at alpha 0.35, and a `B ⬆` tag (11 px) at (360, 126). In level 1 their alpha falls to 0 as the magnet dies.
- **The hoop** (levels 1, 3, 4): a side view. Draw it as a copper ellipse centred on `HOOP` with half-length 48 and half-thickness 9, its long axis turned by θ from horizontal (positive θ turns the right end down; at θ = 90° it stands edge-on). Line width `2 + n/40` (level 4 uses the player’s N; other levels use the row’s n). A white dashed normal arrow (length 40) from the centre at right angles to the hoop, and a thin arc (radius 30, `PAL.white`, alpha 0.6) from the vertical to the normal: the tilt is visible. A tag on the rod near Mira’s hand at (196, 236): `` `${n} turns` `` (11 px) in levels 1 and 3.
- **Level 2, the magic tube** (`TUBE`): a glass cylinder (ellipse top and bottom, rx 45, ry 10) wound with copper stripes every 8 px (2 px, `PAL.orange`, alpha 0.8), except in the window (y 170 to 240) where the stripes are dashed so the ring inside shows. A sign on its foot: `MAGIC TUBE`. Glim sits on a small pedestal at (404, 206), joined to the ring by two thin leads (a bezier from the ring’s right rim over the tube mouth).
  - The ring is an ellipse with half-width `PX_PER_CM * r` and half-height 0.28 × that, centred at (300, `RING_Y.held`) before the trick, hanging from Mira’s rod.
  - Theo’s desk shows the ramp as text (11 px) at (560, 246): `` `I: ${r.i1} → ${r.i2} A` ``.
- **Level 4, the stage monitor** (`GRAPH`): a black screen with a white frame, a grid every 2 mWb (16 px) and every second (60 px) in `PAL.grid`-like lines (`rgba(130,160,255,0.25)`), the flux line in `PAL.cyan` (3 px) through the four points with white dots, the label `16 mWb` (11 px) at the top-left corner (424, 66), the label `1 s` (11 px) under the first column, and `flux per turn` (11 px) under the screen. No other numbers. During the show a white cursor line moves across it, and a small `×2 speed` tag (11 px) sits under the right corner (the 3 s program plays in 1.5 s).
- **Levels 3 and 4 track**: `track(g, lo, hi)` along the bottom with the handle (section 7).

### 6.2 The helper (the desk LCD)

Use `paidFlash()` and `helperOn` from `@core/aidflash` exactly as `panel-tilt/index.ts` does (`flash.paid()` inside `test.read`, `since = flash.since(A.clock, k)` in `draw`).

| Round | LCD at `LCD` (green digits on black, 12 px) |
|---|---|
| 1 (`assist 0`) | live `lcdText(r, v)` |
| 2 (`assist 1`) | `LCD_OFF`, except for 1.5 s after a meter peek, when it shows `lcdText` in `PAL.yellow` |
| 3 (`assist 2`) | `LCD_OFF` always; the peek button gives `No charges left this round.` through the engine (charges `[1, 1, 0]`) |

During a trick the LCD follows `helperOn(r.assist, shot.ok, Infinity)`: live in round 1, the true value on a win, otherwise `LCD_OFF`. The LCD is the **only** place the player’s resulting emf or current appears before a trick (prove it with the canvas recorder, section 9).

### 6.3 Level 1: the trick (`rt` = seconds since Abracadabra)

- 0.00: Mira’s flourish and `ABRACADABRA!`; Theo throws the knife switch (0.00 to 0.30, `CLICK` at 0.25).
- 0.30 to 0.80: the magnet dies. The field lines’ alpha falls from 0.35 to 0, the hum stops, the magnet’s copper dims.
- Glim during 0.30 to 0.80:
  - win: glow rises to 1 by 0.35 and holds to 0.80, then fades to 0 by 1.00 (the flux has stopped changing).
  - dim: a fixed glow of 0.25 from 0.30 to 0.80, then off (no flicker).
  - blown: glow 0.6 from 0.30; at **0.40** the pop: cracks, sparks, `POP`, and a white full-screen flash from alpha 0.35 to 0 over 0.12 s (skipped under reduced motion), then smoke.
- Verdict at **0.45** (blown) or **0.85** (otherwise). Then the reactions from section 4 until 2.3 s.

### 6.4 Level 2: the trick

- 0.00: flourish, `ABRACADABRA!`. 0.00 to 0.30: the ring sinks from `RING_Y.held` to `RING_Y.inside` (ease-out), the leads following.
- 0.30 to 0.50: Theo pulls the ramp lever; the ammeter needle on the desk swings from its `i1` mark to its `i2` mark; the tube’s copper stripes brighten from alpha 0.8 to 1 with a soft orange glow.
- Glim: win glow 1 from 0.30 to 0.50, then fades to 0 by 0.65 (the current is steady again: no change, no emf); dim 0.25 from 0.30 to 0.50; blown 0.6 from 0.30 and pops at **0.38**.
- Verdict at **0.42** (blown) or **0.60**. Reactions until 2.3 s.

### 6.5 Level 3: the trick

- 0.00: flourish, `ABRACADABRA!`; Theo raises the stopwatch.
- 0.30 to 0.30 + t: the hoop turns from θ = 0 to θ = 180° at a steady rate (`θ = 180 · clamp01((rt − 0.3)/t)`); the normal arrow turns with it, so it ends pointing down.
- Glim during the flip: win glow 1, dim 0.25, blown 0.6 with the pop at **0.40**. When the flip ends Glim goes dark.
- Verdict at **0.45** (blown) or **0.3 + min(t, 0.7)**. The flip keeps going after the verdict and ends by 2.3 s (t ≤ 2).

### 6.6 Level 4: the finale

- 0.00: flourish, `ABRACADABRA!`; Theo presses PLAY and the reels spin.
- 0.30 to 1.80: the program plays, 0.5 s per step; the cursor moves across the monitor.
- Glim:
  - win: glow `|slope_i| / steepest` in step i (full in the steepest step, with a `FLASH!` floater at Glim when that step starts);
  - dim: a fixed 0.25 in every step;
  - blown: a fixed 0.6 until `popAt(r, n)`, then the pop.
- Verdict at `popAt(r, n) + 0.05` (blown, at most 1.45 s) or **1.85**. Reactions until 2.35 s.

### 6.7 Rounds that look different (UX item 8)

- Round 1: crimson curtains (`#5a1020`), warm amber footlights.
- Round 2: royal-blue curtains (`#14245a`), cool white footlights.
- Round 3 (BOSS): black curtains with small gold stars, all footlights off, a single spotlight cone (alpha 0.12, `#fff3c4`) from the top centre onto the table and Mira, and the `FINAL TRICK` card.

### 6.8 What must never show

- No target angle, radius, flip time or number of turns is drawn anywhere. The tilt arc, ring size, track handle and tags show only the player’s own setting.
- Glim’s glow on a miss is one of the fixed `GLOW` values.
- `hit` is the fixed point `[320, 70]` in every level.
- The LCD rule of 6.2.

### 6.9 UX checklist (README, all ten items)

| # | Item | In this game |
|---|---|---|
| 1 | Goal on the canvas | During play, one line at (320, 40), 13 px bold `PAL.white`: L1 `` `Light Glim: it needs ${p3(vb)} V` ``; L2 same; L3 `` `Light Glim: it needs ${p3(ma)} mA` ``; L4 `` `Finale: Glim peaks at exactly ${p3(vb)} V` ``. Hidden during a trick (the verdict line takes y = 22). |
| 2 | Own setting by its handle | L1 `` `θ ${th}°` `` at (handle.x + 26, handle.y + 5), 13 px bold `PAL.yellow`, left-aligned; L2 `` `r ${r} cm` `` at (300 + 5r + 26, 100); L3 `` `${t} s flip` `` and L4 `` `N ${n}` `` centred 26 px above their track handle (at y = 296). Given facts on the scene: `B ⬆`, the magnet’s B, the hoop’s turns tag, the ramp text, the monitor labels. At most 3 numbers on the scene besides the player’s setting: L1 vb, B, n; L2 vb, i1, i2; L3 ma, B, n; L4 vb, `16 mWb`, `1 s`. |
| 3 | Handles | Radius 20 in every level. Draw a grip: a `PAL.yellow` ring (2 px) with `⇕` (L1, on the hoop’s right end) or `⇔` (L2, L3, L4) at 13 px inside. The engine brightens a handle while it is dragged. In level 1 round 1, until the dial first moves from its start, draw `drag` (11 px, `PAL.yellow`) 28 px below the handle, blinking at 1.5 Hz. |
| 4 | Legible text | Every scene string ≥ 11 px; labels placed at the coordinates above do not overlap Mira, Glim, the hoop or each other (the APPLAUSE sign sits at the top left, the monitor at the top right, Theo below it). Every colour has a word (`APPLAUSE`, `GASP!`, `Zzz…`, `POP`) or symbol (`⬆`, `⇕`). |
| 5 | Instant response | At rt = 0 Mira’s flourish starts and `ABRACADABRA!` appears. A win (warm glow, `Ta-da!`, applause sound `ok`) and a miss (pop or droop, sound `bad`) look and sound completely different. |
| 6 | Teach briefly | `winText` is two lines of working. Miss texts end with the plain fix (`Tilt it flatter.`, `Use a bigger ring.`, `Flip faster.`, `Use fewer turns.`). |
| 7 | Living hero | Mira, Glim and Theo all have idle motion, an action at rt 0 to 0.3, and a mood after every verdict (section 4). |
| 8 | Variety | Section 6.7. |
| 9 | Accessibility | Sliders from `mountDialLevel` (keyboard ready) with the aria labels of section 7; buttons with aria labels; the ARIA scene text of section 7. Use `A.shake` and `A.burst` only (the engine trims them under reduced motion) and skip the white pop flash when `matchMedia('(prefers-reduced-motion: reduce)')` matches (guard with `?.`). |
| 10 | Comfort | Nothing blinks faster than 2 Hz. The only full-screen flash is the level 1 pop, alpha ≤ 0.35 for 0.12 s. |

## 7. Controls and mount

Write one function `level(n: 1 | 2 | 3 | 4, random)` returning a `DialLevel<Round>`; it calls `buildRounds(n, random)` first.

| Level | dial | handle |
|---|---|---|
| 1 | `{ key: 'th', aria: 'Tilt of the hoop in degrees from flat', label: 'Tilt', unit: '', step: 5, min: 0, max: 90, start: 90, text: (x) => `${x}°` }` | the hoop’s right end: `at: (_r, v) => [HOOP.x + HOOP.r * Math.cos(rad(v.th)), HOOP.y + HOOP.r * Math.sin(rad(v.th))]`, `drag: (_r, px, py) => (Math.atan2(py - HOOP.y, px - HOOP.x) * 180) / Math.PI`, radius 20 |
| 2 | `{ key: 'r', aria: 'Radius of the magic ring in centimetres', label: 'Ring', unit: 'cm', step: 0.5, min: 1, max: 8, start: 1 }` | the ring’s right rim: `at: (_r, v) => [TUBE.x + PX_PER_CM * v.r, RING_Y.held]`, `drag: (_r, px) => (px - TUBE.x) / PX_PER_CM`, radius 20 |
| 3 | `{ key: 't', aria: 'Time for the half-turn flip in seconds', label: 'Flip time', unit: 's', step: 0.1, min: 0.1, max: 2, start: 2 }` | `trackHandle('t', () => 0.1, () => 2)` |
| 4 | `{ key: 'n', aria: 'Number of turns on the finale hoop', label: 'Turns', unit: '', step: 10, min: 10, max: 200, start: 10 }` | `trackHandle('n', () => 10, () => 200)` |

(The engine’s slider clamps and snaps every drag value, so the level 1 drag needs no clamping of its own.)

Common to every level:
- `hero: { name: 'Mira', role: ROLE, ...HEROES[n - 1] }`, `charges: [1, 1, 0]`.
- `test: { button: '🔎 Peek meter', aria: 'Peek meter: read the desk meter for this setting', read: (r, v) => (flash.paid(), meterText(r, v)) }`.
- `fire: { button: '🎩 Abracadabra!', aria: 'Perform the trick: say the magic word' }`.
- `judge`, `miss: missText`, `win: winText`, `hint: hintText`, `hit: () => [320, 70]`, `delay: (r, v) => verdictDelay(r, v)`, and `draw`.
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(4, ctx.level)) as 1 | 2 | 3 | 4; return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA); } })`.
- `ARIA = 'A theatre stage: an illusionist holds a wire hoop over a table that hides an electromagnet, a light bulb floats above the hoop, and her assistant waits at the control desk.'`

## 8. game.json (copy exactly)

Copy `docs/curriculum/gap-designs/rebuilds/json/faraday-bench.json` over the existing `game.json`. Its lengths were checked by script on 2026-10-30: title 16, summary 133, learningOutcome 165 (curly apostrophe), `adds` 149, 109, 107, 123, hints 2 to 3 per level and all under 90, 6 concepts, 5 misconceptions; the title and summary are unique against all 103 other `game.json` files. It keeps `order: 1` and `ncertRef: "Section 6.3, Magnetic flux"`. Title `The Glowing Hoop`; summary `Play a stage illusionist: tilt, flip and pick wire hoops over a hidden magnet so the changing flux lights a floating bulb just right.` The level titles are `Lights out`, `The magic tube`, `The flip` and `The finale`. Copy the file; do not retype it.

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
const FIRE = 'Perform the trick: say the magic word';
function set(r: Round, right: boolean) {
  if (r.kind === 'out') h.setSlider(right ? r.th : r.th + 5);
  if (r.kind === 'tube') h.setSlider(right ? r.r : r.r + 0.5);
  if (r.kind === 'flip') h.setSlider(right ? r.t : Number((r.t + 0.1).toFixed(1)));
  if (r.kind === 'show') h.setSlider(right ? r.n : r.n + 10);
}
shellTests<Round[]>(h, { levels: [1, 2, 3, 4], build, setRight: (g, k) => set(g[k], true), setWrong: (g, k) => set(g[k], false), commit: () => h.click(FIRE) });
```

Then `describe('The Glowing Hoop', …)`:
- Level 1’s slider runs 0 to 90 in steps of 5 and starts at 90; level 2’s runs 1 to 8 (step 0.5, start 1); level 3’s 0.1 to 2 (step 0.1, start 2); level 4’s 10 to 200 (step 10, start 10).
- Level 1 at the start (90°) gives a miss containing `stayed dark`; level 1 at 0° gives `burst`.
- A meter peek costs a charge: `/Meter peek/`, then `/No charges left/`, and the hearts stay at 3.
- A win says `Ta-da!` in levels 1 to 3 and `Grand finale!` in level 4.
- A miss never states the answer (the 9.1 tokens) and costs a heart.
- **Canvas recorder** (`tests/helpers/canvas-rec.ts`): the LCD text (`/^GLIM .* (V|mA)$/` or `/^PEAK .* V$/`) is drawn in round 1; in round 2 only within 1.5 s after a peek (and not 1.6 s after); never in round 3. Before the player moves the slider, no drawn text contains the round’s answer token (`` `θ ${r.th}°` ``, `` `r ${r.r} cm` ``, `` `${r.t} s flip` ``, `` `N ${r.n}` ``).
- The goal line (`/^Light Glim|^Finale:/`) is drawn during play in every level and not while a trick plays.

## 10. Traps to avoid

- **Fixed glows**: Glim’s glow on a miss is 0.25 (dim) or 0.6 then a pop (blown). Never scale it with the player’s emf, current or peak.
- **Level 1 direction**: a *bigger* tilt means *less* flux, so `th > answer` is `dim`. The hoop is drawn with θ from horizontal (the normal from vertical); keep the two consistent.
- **Level 1 start**: 90° is edge-on, zero flux, and Glim stays completely dark (the "no change of flux, no emf" case is the dim text with `stayed dark`).
- **Emf only while changing**: on a win Glim must go dark when the change stops (level 1 after 0.80 s, level 2 after 0.50 s, level 3 at the end of the flip). This is the main lesson; do not leave the bulb lit.
- **Level 3 floats**: dial values like 0.7 are not exact in binary; compare with `same()` (1e-6) and build test values with `toFixed(1)`.
- **Level 4**: the steepest step may fall. `steepest` takes the size of the slope; the win text says whether it rises or falls. The blown pop happens at `popAt`, the first step over the rating, which is honest; the dim glow is fixed.
- **Level 4 time**: the 3 s program plays at double speed (0.5 s per step); keep the `×2 speed` tag.
- **No Math.random** in logic; sparkles and smoke use the engine’s `burst` or `t`-based jitter.
- **Docs**: do not edit `docs/curriculum/physics-class-12/ch06-concept-weights.md`; the reviewer updates it.
