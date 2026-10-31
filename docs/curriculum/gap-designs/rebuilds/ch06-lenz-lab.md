# Ch 6 · Lenz Lab rebuilt as "Night Shift at Magnet Park" (Physics Ch 6, §6.5; Ex 6.1, 6.2; Examples 6.4, 6.5)

Read `../README.md` first (every rule, above all "A miss must not show the answer either", "Helpers fade" and the "UX checklist"), then `README.md` in this folder (the rules for a rebuild). The model rebuild is `src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-bench/` (brief `../20-capacitor-bench.md`). Everything below is required unless marked "optional".

The old Lenz Lab was a quiz: pick clockwise or anticlockwise, attracts or repels, then type a current, a force and a power. This brief **replaces the whole game** with an arcade game in a theme park at night. It keeps the id, folder and `order`, and keeps every concept: Lenz’s law, the direction of the induced current, a coil repelling an approaching magnet and attracting a receding one, deciding whether the flux rises, falls or stays the same, no change of flux means no emf, and the work done against the induced current turning into heat (I = Blv/R, F = BIl, P = Fv = I²R). It adds one item from §6.5: an open circuit gets an emf but no current (the split ring).

## 1. Identity

| Field | Value |
|---|---|
| Game id | `lenz-lab` (unchanged) |
| Folder | `src/games/physics/class-12/ch06-electromagnetic-induction/lenz-lab/` (existing) |
| Files | **Replace** `game.json` with `docs/curriculum/gap-designs/rebuilds/json/lenz-lab.json` (exact copy). **Delete and rewrite** `logic.ts`, `logic.test.ts`, `index.ts`. **Add** `art.ts`. |
| UI test | **Delete** `tests/lenzlab-ui.test.ts`. **Create** `tests/lenz-lab-ui.test.ts`. |
| Engine | `mountDialLevel` from `@core/dialgame`, one `DialLevel` per level (3 levels); `paidFlash`, `helperOn` from `@core/aidflash` |
| Book coverage | §6.5 (Lenz’s law, the bar magnet and coil, the open circuit, conservation of energy and Joule heating), Ex 6.1 and 6.2 (direction of the induced current, a loop stretched into a circle or squeezed flat), Example 6.4 (loops moving into or out of a field), Example 6.5(a) (a still magnet induces nothing, however strong); the brake uses ε = Blv (§6.6) and F = BIl (Chapter 4) |
| Inspiration (code comment only) | Theme-park management games (keep the rides running and the riders happy), the real eddy-current brakes of roller coasters and drop towers, the classic "jumping ring" demonstration scaled up into a ride, and the cue-matching of rhythm games for the light show |
| Core verb | **Throw the ride’s switches**: three podium levers (the magnet’s pole, its move, the ring closed or split) in level 1, three field switches in level 2, then the brake-bank dial in level 3; press "Go!" and the ride runs. No other chapter 6 game is played with switches. |

Nothing else in the repo imports the old `logic.ts` (only `tests/lenzlab-ui.test.ts`, which is deleted). Check again with a search for `lenz-lab/logic` before deleting.

## 2. What the student learns

- Lenz’s law: the induced current always flows the way that opposes the change of flux that makes it.
- A pole moving **toward** a ring raises the flux through it: the ring’s face toward the magnet becomes the **same** pole, so the ring **repels** the magnet. A pole moving **away** lowers the flux: the ring’s near face becomes the **opposite** pole, so it **attracts** the magnet. Either way the force opposes the motion.
- From the induced field to the current: seen from one side, anticlockwise current makes a field pointing toward you, clockwise current a field pointing away.
- The flux rises when a loop moves into a field, is stretched open, or its field is switched on; it falls when the loop moves out, is squeezed flat, or its field fades. The induced field points **against** a rise and **along** a fall.
- No change of flux, no emf: a magnet held still induces nothing, however strong. A split ring gets an emf across its gap but no current, so it feels no force.
- A magnetic brake: a bar moving through a field makes ε = Blv, the current I = ε/R feels a force F = BIl against the motion, and at a steady speed that force balances the pull. The power Fv equals I²R: the energy of the motion all becomes heat. If the current helped the motion instead, energy would come from nothing.

## 3. The mechanic, physically

**Joon** is the night-shift ride engineer at **Magnet Park**. Three rides run on Lenz’s law.

| Level | The player sets | What decides the show |
|---|---|---|
| 1 Ring Rocket | the magnet’s pole facing the ring (N or S), its move (toward, hold, away) and the ring (closed or split) | The magnet sits under the ring (rounds 1 and 2) or hangs over it on a crane (round 3). The ring’s induced current sets its lights (green ↺ or red ↻, seen from above) and its push or pull sets whether it launches up the tower or is pulled down onto its seat. |
| 2 The Light Tunnel | each of three electromagnets’ field: ⊗ into or ⊙ out of the page | Each of three loop signs undergoes a fixed change (driven in or out, squeezed, sprung open, field switched on or faded). Its current, and so its colour, must match the show’s cue for that sign. |
| 3 The Brake Run | the brake bank’s resistance R (mΩ) | The coaster car settles at the steady speed where the brake force B²l²v/R equals the pull down the slope. It must reach the station at exactly the safe speed. |

Physical consequences (every miss shows what the player’s own setting did):
- **Level 1**:
  - Hold, or a split ring: nothing happens. The ring stays on its seat, its lights stay dark, and the riders look bored (`…`). A split ring shows a tiny `+ −` across its gap (the emf with nowhere to go).
  - Launch: the lights of the induced colour glow, and the ring shoots up the tower with the riders shouting `WHEEE!`, then sinks back to its seat.
  - Clamp: the lights glow, and the ring is yanked down onto its seat with a `CLUNK`; the seat springs squash and the riders bounce.
  - If the ring did the wrong thing or showed the wrong colour, the cue board shows `✗ WRONG MOVE` or `✗ WRONG COLOUR` and the crowd groans.
- **Level 2**: the signs flash in turn. The first sign whose colour is wrong flashes its own colour, its cue card shows `✗`, and the show stops there (later signs do not play). If all three match, fireworks burst over the tunnel.
- **Level 3**: too much resistance (too weak a brake): the car steadies too fast and slams into the end buffer with a `BANG`, the riders’ hats fly off. Too little (too strong a brake): it steadies too slow and stops short of the platform, the riders groan. Right: it glides in and stops on the `STOP` line, the riders cheer.

**Fixed effects.** The level 3 car moves at one of three fixed paces (0.55×, 1× or 1.45× the win pace), never a pace proportional to the player’s steady speed, and the brake bank glows at a fixed alpha 0.6 on every run. Level 1 and 2 outcomes are discrete, so they show exactly what the player’s setting did.

## 4. Story and characters

Hero banner: `name: 'Joon'`, `role: 'the night-shift ride engineer at Magnet Park, whose rides launch, glow and brake by Lenz’s law'`.

| Level | story | objective |
|---|---|---|
| 1 | `Magnet Park’s star ride is the Ring Rocket: riders sit in a big aluminium ring round a tower, and a giant magnet moves toward or away from it. The ring’s induced current always opposes the change in flux, so an approaching pole repels the ring and a retreating pole pulls it back. The ring’s show lights are wired through one-way diodes: green ↺ glows for anticlockwise current and red ↻ for clockwise, seen from above. A magnet held still does nothing, however strong.` | `Set the magnet’s pole, its move and the ring so the ring does exactly what each show cue asks, in three shows.` |
| 2 | `In the Light Tunnel, three loop-shaped signs hang in the fields of three electromagnets. As the ride passes, each sign is driven in or out of its field, squeezed flat, sprung open, or has its field switched on or faded. A sign’s current flows only while its flux changes, and always the way that opposes the change. Its lights glow green ↺ for anticlockwise current and red ↻ for clockwise, as you look at it.` | `Set each magnet’s field ⊗ into or ⊙ out of the page so the signs flash the show’s colours in order, in three shows.` |
| 3 | `The coaster’s last slope ends in a magnetic brake. The car drags a copper bar across two rails between strong magnets, and the rails are joined through a brake bank of resistance R. The bar’s motional emf drives a current, and the force BIl on it opposes the motion. The car speeds up until that force equals the pull down the slope, then rolls at a steady speed: all the work the slope does becomes heat in the brake bank.` | `Set the brake bank so the car steadies at exactly the safe speed and glides into the station, in three runs.` |

Characters (each in its own function in `art.ts`, AGENTS.md item 17):
- **Joon** (hero), `joon(g, t, o)`. Feet at (40, 300), about 100 px tall (head centre (40, 204), radius 14).
  - Gear: a white hard hat with a small headlamp and the park’s magnet logo (a red-and-blue horseshoe); short black hair under it; an orange hi-vis vest with two silver reflective stripes over a navy shirt; a radio clipped to the left shoulder with a curly black cord; a tool belt with a torch and a wrench; ear defenders hanging round the neck; work boots. In the right hand a yellow control pendant (16 × 24) with a big green `GO` button and a red mushroom E-STOP.
  - Pose: standing, three-quarter toward the ride, the pendant held at chest height.
  - Idle: breathing (chest rises 1 px, `sin(t·2)`), blinks every 3 s, the headlamp flickers on for 0.2 s every 6 s, taps the radio every 5 s, and looks up at the ride (head tilts back 4°) every 7 s.
  - Action (rt 0.00 to 0.25): the thumb presses `GO` (the button lights `PAL.green`), the radio gives a `KSHH` floater at (64, 180), and a `GO!` floater appears at (110, 150).
  - Moods: `face(g, …, 'happy')` while waiting; `'cheer'` with a fist pump on a win (from the verdict for 0.6 s); `'worried'` with a sweat drop on a miss; **frazzled** after the buffer slam in level 3 (the hard hat knocked 20° askew, spiral eyes drawn by hand since `face` has no such mood).
- **The riders** (targets), `riders(g, t, o)`: two riders side by side, each a head of radius 8 over a seat back. Rider A has a red cap worn backwards; rider B has pigtails and round glasses. They sit in the ring (level 1), in a small parked car watching the signs at (96, 304) (level 2), or in the coaster car (level 3), and they hold a lap bar.
  - Idle: they chat (heads turn to each other every 3 s) and swing their feet.
  - Launch or a smooth stop: arms up, `'cheer'`, a `WHEEE!` floater (launch) or `YAY!` (stop).
  - Clamp: they bounce 4 px with the seat springs, `'happy'`.
  - Nothing happened, a wrong cue, or a short stop: `'worried'`, slumped, a `…` floater.
  - Buffer slam: both hats (the cap and rider B’s glasses) fly off in an arc, dizzy spiral eyes for 1 s, a `WHOA!` floater.
- **The cue board** (the show’s brief), `cueBoard(g, o)`: a black LED board on a post, drawn per level (section 6). Its words always carry the meaning (`GREEN ↺`, `RED ↻`, `LAUNCH`, `PULL DOWN`, `✗`), so colour is never the only cue.
- **The ride ticket** (decor): a paper ticket drops in at the top centre for 0.8 s whenever a new round starts (detect `k` changing in `draw`): `SHOW 1`, `SHOW 2`, `FINAL SHOW` in levels 1 and 2, `RUN 1`, `RUN 2`, `FINAL RUN` in level 3, with a `DING` floater.

## 5. Rules (`logic.ts`)

### 5.1 Constants and types

```ts
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export type Glow = 'green' | 'red';          // green ↺ anticlockwise, red ↻ clockwise (seen from above in level 1, as you look at the sign in level 2)
export type Go = 'launch' | 'clamp';
export type Ev = 'enter' | 'leave' | 'squeeze' | 'stretch' | 'rise' | 'fade';
export const CHANGE: Record<Ev, 1 | -1> = { enter: 1, leave: -1, squeeze: -1, stretch: 1, rise: 1, fade: -1 };
/** Level 3: the car’s pace on screen, fixed for each outcome and never proportional to the player’s steady speed. */
export const PACE = { slow: 0.55, win: 1, fast: 1.45 } as const;

export interface RocketRow { magnet: 'below' | 'above'; go: Go; glow: Glow }       // answer: pole (1 = N faces the ring), move (1 toward, -1 away), ring 1
export interface TunnelRow { ev: [Ev, Ev, Ev]; cue: [Glow, Glow, Glow] }          // answer: z0, z1, z2 (1 = field into the page)
export interface BrakeRow { b: number; l: number; f: number; v: number; r: number } // B in T, bar l in m, pull f in N, safe speed v in m/s; answer r in mΩ

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'rocket'; assist: Assist } & RocketRow)
  | ({ kind: 'tunnel'; assist: Assist } & TunnelRow)
  | ({ kind: 'brake'; assist: Assist } & BrakeRow);
```

### 5.2 The pools (copy exactly)

Every row was checked by script on 2026-10-31 (`lenz-final-check.mjs`; the checks are listed in section 9 and must be in `logic.test.ts`).

```ts
export const ROCKET: RocketRow[][] = [
  [{ magnet: 'below', go: 'launch', glow: 'red' }, { magnet: 'below', go: 'launch', glow: 'green' }],
  [{ magnet: 'below', go: 'clamp', glow: 'green' }, { magnet: 'below', go: 'clamp', glow: 'red' }],
  [
    { magnet: 'above', go: 'launch', glow: 'red' }, { magnet: 'above', go: 'launch', glow: 'green' },
    { magnet: 'above', go: 'clamp', glow: 'green' }, { magnet: 'above', go: 'clamp', glow: 'red' },
  ],
];

export const TUNNEL: TunnelRow[][] = [
  [
    { ev: ['enter', 'leave', 'rise'], cue: ['green', 'green', 'red'] },
    { ev: ['leave', 'fade', 'enter'], cue: ['green', 'red', 'red'] },
    { ev: ['rise', 'fade', 'leave'], cue: ['red', 'green', 'red'] },
  ],
  [
    { ev: ['stretch', 'squeeze', 'enter'], cue: ['green', 'red', 'red'] },
    { ev: ['squeeze', 'leave', 'stretch'], cue: ['green', 'red', 'green'] },
    { ev: ['leave', 'stretch', 'squeeze'], cue: ['red', 'green', 'green'] },
  ],
  [
    { ev: ['stretch', 'fade', 'leave'], cue: ['green', 'green', 'red'] },
    { ev: ['fade', 'rise', 'stretch'], cue: ['red', 'red', 'green'] },
    { ev: ['rise', 'squeeze', 'leave'], cue: ['red', 'green', 'green'] },
  ],
];

export const BRAKE: BrakeRow[][] = [
  [{ b: 1, l: 0.5, f: 250, v: 4, r: 4 }, { b: 1, l: 0.5, f: 250, v: 5, r: 5 }, { b: 1, l: 0.6, f: 300, v: 5, r: 6 }],
  [{ b: 2, l: 0.5, f: 500, v: 4, r: 8 }, { b: 0.8, l: 1, f: 320, v: 5, r: 10 }, { b: 1.5, l: 0.8, f: 480, v: 4, r: 12 }],
  [{ b: 1.2, l: 0.5, f: 360, v: 7, r: 7 }, { b: 1.5, l: 0.6, f: 450, v: 5, r: 9 }, { b: 1, l: 1.5, f: 600, v: 4, r: 15 }],
];
```

Script results (2026-10-31):
- Level 1: each row has exactly one winning setting among the 12 (pole 0..1 × move −1..1 × ring 0..1). The answers are: below, launch, red → N toward; below, launch, green → S toward; below, clamp, green → N away; below, clamp, red → S away; above, launch, red → N away; above, launch, green → S away; above, clamp, green → N toward; above, clamp, red → S toward. Every answer has the ring closed. The start (N, hold, closed) never wins. Rounds 1 and 2 never share an answer, and for every pair of them exactly two round 3 rows are left (see `buildRounds`).
- Level 2: each row has exactly one winning setting among the 8; the answers are `100, 010, 001` (pool 1), `110, 011, 110` (pool 2) and `101, 101, 000` (pool 3), written z0 z1 z2 with 1 = into the page. The pools share no answer, and none is the start `111`. All six events are used.
- Level 3: each row has exactly one winning dial value in 1..25 mΩ; the answers are `4, 5, 6`, `8, 10, 12` and `7, 9, 15`; no answer is a dial end or the start (1); the nearest wrong setting gives a steady speed at least 6.7% off the safe one; for every row BIl equals the pull and I²R equals Fv.

### 5.3 Physics, rounds and judging

```ts
export const DIAL = {
  pole: { min: 0, max: 1, start: 1 },   // L1: 1 = N faces the ring, 0 = S
  move: { min: -1, max: 1, start: 0 },  // L1: 1 toward the ring, 0 hold, -1 away
  ring: { min: 0, max: 1, start: 1 },   // L1: 1 closed, 0 split
  z: { min: 0, max: 1, start: 1 },      // L2, each of z0, z1, z2: 1 = field into the page ⊗, 0 = out ⊙
  r: { min: 1, max: 25, start: 1 },     // L3, mΩ, step 1
};

export type Outcome = 'hold' | 'split' | `${Go}-${Glow}`;
/** Level 1: what the ring does. The magnet’s near pole points along the field: N sends field lines away from its face. */
export function rocket(r: RocketRow, pole: number, move: number, ring: number): Outcome {
  if (move === 0) return 'hold';
  if (ring === 0) return 'split';
  const below = r.magnet === 'below';
  const fieldUp = below === (pole === 1);               // N under the ring or S over it: the field through the ring points up
  const inducedUp = move === 1 ? !fieldUp : fieldUp;     // against a rise, along a fall
  const glow: Glow = inducedUp ? 'green' : 'red';        // anticlockwise seen from above makes a field pointing up
  const go: Go = (move === 1) === below ? 'launch' : 'clamp'; // toward repels; repelled from below flies up, from above is pushed down
  return `${go}-${glow}`;
}
/** Level 2: the colour sign i flashes for the field direction into (1) or out of (0) the page. */
export const tunnelGlow = (ev: Ev, into: number): Glow => ((CHANGE[ev] === 1) === (into === 1) ? 'green' : 'red');
/** Level 3: the steady speed in m/s for a brake bank of R mΩ. */
export const steady = (r: BrakeRow, R: number) => (r.f * (R / 1000)) / (r.b ** 2 * r.l ** 2);
export const brakeI = (r: BrakeRow, R: number) => (r.b * r.l * steady(r, R)) / (R / 1000); // A

export function rocketAnswer(r: RocketRow): { pole: number; move: number; ring: number } {
  for (const pole of [0, 1]) for (const move of [-1, 1]) if (rocket(r, pole, move, 1) === `${r.go}-${r.glow}`) return { pole, move, ring: 1 };
  throw new Error('no answer');
}
export const tunnelAnswer = (r: TunnelRow) => r.ev.map((e, i) => ((CHANGE[e] === 1) === (r.cue[i] === 'green') ? 1 : 0));

const same1 = (a: RocketRow, b: RocketRow) => { const x = rocketAnswer(a); const y = rocketAnswer(b); return x.pole === y.pole && x.move === y.move; };
export function buildRounds(level: 1 | 2 | 3, random: () => number): Round[] {
  if (level === 1) {
    const r1 = pick(ROCKET[0], random);
    const r2 = pick(ROCKET[1], random);
    const r3 = pick(ROCKET[2].filter((x) => !same1(x, r1) && !same1(x, r2)), random);
    return [r1, r2, r3].map((row, k) => ({ ...row, kind: 'rocket', assist: aid(k) }) as Round);
  }
  const pools = (level === 2 ? TUNNEL : BRAKE) as unknown[][];
  const kind = level === 2 ? 'tunnel' : 'brake';
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

export type Values = { pole?: number; move?: number; ring?: number; z0?: number; z1?: number; z2?: number; r?: number };
export type Fault = 'hold' | 'split' | 'move' | 'colour' | 'both' | 'cue' | 'slow' | 'fast';

export function fault(r: Round, x: Values): Fault | null {
  switch (r.kind) {
    case 'rocket': {
      const o = rocket(r, x.pole!, x.move!, x.ring!);
      if (o === 'hold' || o === 'split') return o;
      const [go, glow] = o.split('-');
      if (go === r.go && glow === r.glow) return null;
      return go !== r.go && glow !== r.glow ? 'both' : go !== r.go ? 'move' : 'colour';
    }
    case 'tunnel': return firstWrong(r, x) < 0 ? null : 'cue';
    case 'brake': return x.r === r.r ? null : x.r! < r.r ? 'slow' : 'fast';
  }
}
/** Level 2: the index of the first sign that flashes the wrong colour, or -1. */
export function firstWrong(r: TunnelRow, x: Values): number {
  const z = [x.z0!, x.z1!, x.z2!];
  return r.ev.findIndex((e, i) => tunnelGlow(e, z[i]) !== r.cue[i]);
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;

/** Seconds into the ride at which the verdict lands. */
export function verdictDelay(r: Round, x: Values): number {
  if (r.kind === 'rocket') return 0.65;
  if (r.kind === 'tunnel') { const i = firstWrong(r, x); return i < 0 ? 2.05 : 0.55 + 0.6 * i; }
  const f = fault(r, x);
  return f === 'fast' ? 1.5 : f === 'slow' ? 1.9 : 1.8;
}
```

- Level 1 is judged on the outcome: the ring must do the cue’s move with the cue’s colour. The `rocket` function is the physics; `rocketAnswer` and the tests prove that only one of the 12 settings matches each row.
- Level 2 is judged sign by sign; the show stops at the first wrong sign.
- Level 3 is judged by dial value. A larger R means a weaker current, so the car steadies faster (`fast`); a smaller R steadies slower (`slow`).
- `buildRounds` must be the **first** use of `random` in the level, so the UI test rebuilds the same rounds from the same seed. In level 1 it draws round 3 from the above-the-ring rows whose answer differs from rounds 1 and 2 (always two of them).
- Start settings: level 1 N, hold, closed (nothing happens, which tells nothing); level 2 all three ⊗ (no row has the answer `111`); level 3 R = 1 mΩ (too slow on every row). None wins (tested).

### 5.4 Words

Helpers: `poleText = (p) => (p ? 'N' : 'S')`; `glowText = (g) => (g === 'green' ? 'green ↺' : 'red ↻')`; `cueText(row)` for level 1 is `` `${row.go === 'launch' ? 'LAUNCH' : 'PULL DOWN'} · ${row.glow === 'green' ? 'GREEN ↺' : 'RED ↻'}` ``. Event phrases for level 2: `EV_TEXT = { enter: 'was driven into its field', leave: 'was driven out of its field', squeeze: 'was squeezed flat', stretch: 'sprang open into a circle', rise: 'had its field switched on', fade: 'had its field fade away' }`. Number formatting: `fmt` from `@core/judge`.

**`goalLine(r)`** (drawn on the canvas, UX item 1):
- rocket: launch+red `Launch the ring with its red ↻ lights`; launch+green `Launch the ring with its green ↺ lights`; clamp+green `Pull the ring down with its green ↺ lights`; clamp+red `Pull the ring down with its red ↻ lights`.
- tunnel: `` `Flash the cues: ${r.cue.map((c) => (c === 'green' ? 'GREEN ↺' : 'RED ↻')).join(' · ')}` ``
- brake: `` `Safe speed: ${r.v} m/s` ``

**`intel(r)`**:
- rocket: `` `The magnet waits ${r.magnet === 'below' ? 'in the pit under' : 'on the crane over'} the ring. Show cue: ${cueText(r)}. The lights are read from above: green ↺ anticlockwise, red ↻ clockwise.` ``
- tunnel: `` `Three signs, three cues in order. Sign 1 ${EV_TEXT[r.ev[0]]}, sign 2 ${EV_TEXT[r.ev[1]]}, sign 3 ${EV_TEXT[r.ev[2]]}. Lights: green ↺ anticlockwise, red ↻ clockwise, as you look at the page.` ``
- brake: `` `Brake run: magnets of ${r.b} T across a copper bar ${r.l} m long, joined through the brake bank. Down the slope the car is pulled with ${r.f} N. It must reach the station at ${r.v} m/s.` ``

**Hint line** (`hintText`): `` `${intel(r)} ${r.assist === 0 ? 'Show 1: the flux meter is live.' : r.assist === 1 ? 'The meter is off: a check costs a charge.' : 'Final show: no meter.'}` `` (level 3 says `Run 1: the brake meter is live.` and `Final run: no meter.`).

**`missText(r, x)`** (what the player’s setting did; never the answer):
- rocket hold: `` `The magnet held still, so the flux through the ring did not change: no current flowed, the ring stayed put and its lights stayed dark, however strong the magnet.` ``
- rocket split: `` `The magnet moved, but the ring was split: an emf appeared across the gap, yet with no closed path no current flowed, so the ring stayed put and its lights stayed dark.` ``
- rocket move, colour or both: `` `With ${poleText(x.pole)} facing the ring and the magnet moving ${x.move === 1 ? 'toward' : 'away from'} it, the flux through the ring ${x.move === 1 ? 'rose' : 'fell'}, and the ring’s current ${x.move === 1 ? 'opposed the rise' : 'propped the flux up'}: it ${go === 'launch' ? 'shot up the tower' : 'was pulled down onto its seat'} with its ${glowText(glow)} lights on. The cue was ${cueText(r)}.` `` (with `go` and `glow` from `rocket(r, …)` for the player’s setting).
- tunnel (i = `firstWrong`, z = the player’s switch i): `` `Sign ${i + 1} ${EV_TEXT[r.ev[i]]} with its field ${z ? 'into' : 'out of'} the page: its flux ${CHANGE[r.ev[i]] === 1 ? 'rose' : 'fell'}, so its current flowed ${tunnelGlow(r.ev[i], z) === 'green' ? 'anticlockwise' : 'clockwise'} and it flashed ${glowText(tunnelGlow(r.ev[i], z))}, but cue ${i + 1} was ${glowText(r.cue[i])}. The show stopped there.` ``
- brake fast: `` `With ${x.r} mΩ in the brake bank the current was too weak: the car only steadied at a speed above the safe one and slammed into the buffer. Use less resistance.` ``
- brake slow: `` `With ${x.r} mΩ in the brake bank the current was too strong: the car steadied below the safe speed and stopped short of the platform. Use more resistance.` ``

**`meterText(r, x)`** (the paid check, a charge):
- rocket: `` `Flux check: with ${poleText(x.pole)} facing the ring, the field through it points ${(r.magnet === 'below') === (x.pole === 1) ? 'up' : 'down'}, and with the magnet ${x.move === 1 ? 'moving toward it the flux would rise' : x.move === -1 ? 'moving away the flux would fall' : 'held still the flux would not change'}${x.ring === 0 ? ' (but the ring is split)' : ''}.` ``
- tunnel: `` `Flux check: ${[0, 1, 2].map((i) => `sign ${i + 1} field ${z[i] ? '⊗ into' : '⊙ out of'} the page, flux ${CHANGE[r.ev[i]] === 1 ? 'rising' : 'falling'}`).join('; ')}.` ``
- brake: `` `Brake check: with ${x.r} mΩ the car would settle at ${fmt(steady(r, x.r!))} m/s, with ${fmt(brakeI(r, x.r!))} A in the bar.` ``

**`lcdText(r, x)`** (the live helper, section 6.4): rocket `` `RING MAKES B ${inducedUp ? '⬆' : '⬇'}` `` when the setting gives a current, `RING: NO CURRENT` for hold or split (with `inducedUp` from the same rule as `rocket`); tunnel, for each sign i, `` `INDUCED ${into === (CHANGE[ev] === 1) ? '⊙' : '⊗'}` `` (the induced field: against a rise, along a fall); brake `` `STEADY ${fmt(steady(r, x.r!))} m/s` ``. `LCD_OFF = '— — —'`. The helper shows the induced **field**, never the current’s sense or the outcome: turning the field into a colour and a push or pull is the player’s step.

**`winText(r)`** (two short lines, UX item 6):
- rocket: `` `Showtime! ${poleText(a.pole)} moving ${a.move === 1 ? 'toward' : 'away from'} the ring made its flux ${a.move === 1 ? 'rise' : 'fall'}, so the induced current ${a.move === 1 ? 'opposed the rise' : 'propped the flux up'}: ${r.glow === 'green' ? 'anticlockwise' : 'clockwise'} seen from above (${glowText(r.glow)}). The ring ${a.move === 1 ? 'repelled' : 'attracted'} the magnet, so it ${r.go === 'launch' ? 'launched up the tower' : 'was pulled down onto its seat'}.` `` (a = `rocketAnswer(r)`).
- tunnel: `` `What a show! Each sign’s current opposed its change of flux: a rise needs an induced field against the magnet’s, a fall one along it, and anticlockwise current makes a field out of the page (⊙). Your fields: ${tunnelAnswer(r).map((z) => (z ? '⊗' : '⊙')).join(' ')}.` ``
- brake: `` `Smooth stop! At ${r.v} m/s the bar makes ε = Blv = ${fmt(r.b * r.l * r.v)} V, so I = ε/R = ${fmt(brakeI(r, r.r))} A and the brake force BIl = ${r.f} N balances the pull. The power Fv = I²R = ${fmt(r.f * r.v)} W: the car’s lost energy all became heat in the brake bank.` ``

## 6. Screen and art

Canvas 640 × 340. Draw the park over the engine’s background with **opaque fills** (sky gradient, ground), so the engine grid never shows. Ground from y = 300 (dark asphalt `#1b1d2b` with a yellow painted safety line at y = 302).

```ts
export const PODIUM = { x: 70, y: 228, w: 192, h: 72 };      // level 1 control podium (x 70..262, y 228..300)
export const LEVER_X = [98, 166, 234];                        // level 1 lever slots: POLE, MOVE, RING
export const LEVER_Y = { top: 252, mid: 268, bottom: 284 };   // handle heights: binary levers use top (1) and bottom (0); MOVE uses top (toward), mid (hold), bottom (away)
export const TOWER = { x: 400, top: 30, base: 300 };          // level 1 launch tower (a column 16 px wide)
export const RING = { x: 400, y: 232, rx: 64, ry: 13 };       // level 1 gondola ring at rest (ellipse)
export const MAG_BELOW = { x: 400, face: 262, w: 30, h: 70 }; // the magnet in the pit (top face at y 262 at rest, body to 332)
export const MAG_ABOVE = { x: 400, face: 176, w: 30, h: 70 }; // the magnet on the crane (bottom face at y 176 at rest, body up to 106)
export const SHIFT = 24;                                      // px the magnet moves toward or away
export const RIG_X = [200, 350, 500];                         // level 2 sign rigs (frame centres)
export const FRAME = { y0: 104, y1: 214, half: 48 };          // level 2 field frames: x from c - 48 to c + 48
export const SIGN = { half: 22, y: 159, h: 50 };              // level 2 loop sign: 44 × 50, centred at y 159
export const TRACK3 = { x0: 70, y0: 120, x1: 470, y1: 250, end: 600 }; // level 3 slope, then flat to the buffer at x 600
export const BRAKE_ZONE = { x0: 210, x1: 390 };              // level 3 magnet banks along the slope
export const BANK = { x: 250, y: 256, w: 100, h: 30 };        // level 3 brake bank cabinet (LCD inside it)
export const STOP_X = 560;                                    // level 3 STOP line on the platform
```

### 6.1 Rounds that look different (UX item 8)

- Round 1: dusk, a sky gradient `#3a2160` at the top to `#140c2c` at y = 300; a lit Ferris wheel silhouette at the far left behind everything (centre (120, 120), radius 70, 12 spokes, lamps on the rim twinkling in turn, alpha 0.35, turning slowly).
- Round 2: night, `#141638` to `#080a1c`; the Ferris wheel plus a distant firework burst (a ring of 12 dots, alpha 0.4) somewhere along the top every 3 s.
- Round 3 (BOSS): a storm night, `#0a0d1c` to `#04050d`; rain streaks (40 short lines, `rgba(180,200,255,0.25)`, falling at 300 px/s and wrapping); a lightning flash every 4.5 s (a full-screen white fill at alpha 0.25 for 0.1 s, skipped under reduced motion), and the park’s neon sign `MAGNET PARK` at the top right (x 470..630, y 14..34) flickering.

### 6.2 Level 1: the Ring Rocket

- **The tower** (`TOWER`): a steel column 16 px wide from y 30 to the ground, with a red blinking lamp on top (1 Hz) and guide rails drawn as two thin lines.
- **The ring** (`RING`): an aluminium ellipse (stroke 7 px, `#c9d2e3`, with a darker inner edge) round the tower, four seats on it and the two riders on the front seats. Eight lamps sit on the rim: four green lamps each with a small `↺` beside it (11 px) and four red lamps each with `↻`, alternating. Unlit lamps are dark grey; lit lamps glow in their colour with a 6 px glow. If the ring dial is 0 (split), draw a 6 px gap at the ring’s front-right with two tiny jaws, and a small `split` tag (11 px) under it.
- **The seat**: a sprung collar on the tower under the ring (y 238 to 250) with two springs.
- **The magnet**: a bar magnet 30 × 70, split in two halves: the half facing the ring shows the player’s pole (N: `PAL.red` with a white `N`; S: `#3d7bff` with a white `S`, 13 px bold), the far half the other pole. Below the ring (rounds 1 and 2) it stands on a hydraulic piston in a pit (a grey cylinder under it into the ground). Above the ring (round 3) it hangs from a yellow crane arm that reaches in from the right (from (640, 70) to (400, 90)) on a short chain.
- **The field**: five faint dashed field lines (`PAL.cyan`, alpha 0.3) from the magnet’s face through the ring, with arrowheads pointing away from an N face or toward an S face (the player’s own setting, so it is fine to show).
- **The podium** (`PODIUM`): a grey desk with three lever slots at `LEVER_X`, labels `POLE`, `MOVE`, `RING` (11 px, `PAL.dim`) above the slots at y 240, and small end marks beside each slot (11 px, `PAL.dim`): `N`/`S` (POLE, top and bottom), `▲`/`■`/`▼` (MOVE: toward, hold, away), `●`/`◌` (RING: closed, split). Under the podium at y 318 (13 px bold `PAL.yellow`, centred on each slot) the player’s settings: `N` or `S`; `TOWARD`, `HOLD` or `AWAY`; `CLOSED` or `SPLIT`.
- **The cue board**: at (470, 120), 150 × 44, two lines (13 px bold): line 1 `LAUNCH` or `PULL DOWN` in `PAL.white`, line 2 `GREEN ↺` in `PAL.green` or `RED ↻` in `PAL.red`. On a miss of kind move, colour or both it shows `✗ WRONG MOVE` / `✗ WRONG COLOUR` / `✗ WRONG MOVE` (line 1) for 1.5 s from the verdict, in `PAL.red`.
- **The flux meter** (the helper, section 6.4) on the podium front at (80, 290), 120 × 16.

The take (`rt` = seconds since Go):
- 0.00 to 0.25: Joon presses GO, `GO!`, `KSHH`.
- 0.10 to 0.45: the magnet moves `SHIFT` px toward the ring (`move = 1`), away (`move = -1`), or not at all (hold); the piston or chain moves with it.
- 0.30 to 0.65, by outcome (`rocket(…)` for the fired setting):
  - launch: the lit lamps of the outcome’s colour glow from 0.30; the ring rises from `RING.y` to y = 60 between 0.35 and 0.95 (ease-out), `WHEEE!` at 0.40; it hovers, then sinks back to its seat between 1.30 and 2.20 (ease-in-out).
  - clamp: the lamps glow from 0.30; at 0.40 the ring drops 4 px onto the squashed springs with a `CLUNK` floater and `A.shake(3)`; it rises back 4 px by 0.80.
  - hold or split: nothing moves; split shows a small `+ −` (11 px, `PAL.dim`) across the gap from 0.30 to 1.2.
- Verdict at **0.65** (`delay: 0.65`). Then the reactions until 2.3 s. The cue board shows `✓ SHOW!` in `PAL.green` on a win.

### 6.3 Level 2: the Light Tunnel

- **Backdrop**: the tunnel’s inside: a dark wall (`#141026`) with a curved ceiling edge and a row of tiny star lights.
- **Three rigs** at `RIG_X`. Each rig has:
  - a field frame (x `c − 48` to `c + 48`, y 104 to 214): a steel border (3 px, `#5a6480`) and a 4 × 4 grid of field marks inside, in `PAL.cyan` at alpha 0.6: `⊗` (a circle with a cross) for into the page or `⊙` (a circle with a dot) for out of the page, by the player’s switch (radius 6 each);
  - a cue card above it at (c, 82), 92 × 26, `GREEN ↺` (13 px bold, `PAL.green`) or `RED ↻` (13 px bold, `PAL.red`) on black, and a number tag `1`, `2`, `3` (11 px) at its top-left;
  - the loop sign: a rounded-rectangle loop of wire 44 × 50 (stroke 3, `#d9a441`), with two lamps on its top edge, a green one marked `↺` and a red one marked `↻` (11 px). Its start state follows its event: `enter` sits in the gap left of the frame (centre x = c − 75); `stretch` starts folded flat (a thin strip 44 × 6); every other event starts centred in the frame (x = c);
  - an event label under the frame at (c, 228), 11 px `PAL.dim`: `drives in →`, `drives out →`, `squeezed flat`, `springs open`, `field on ▲`, `field fades ▼`;
  - the helper readout at (c, 242), 11 px (section 6.4);
  - the switch handle (section 7) and, at (c + 24, 286), the player’s setting `⊗ in` or `⊙ out` (13 px bold `PAL.yellow`, left-aligned).
- **The riders** sit in a little parked ride car at (96, 304) and watch; Joon stands at (40, 300).
- For `rise` rigs, the field marks are drawn at alpha 0.15 before the show (the field is still off); for `fade` rigs at 0.6.

The show (`rt` = seconds since Go): Joon’s GO at 0.00. Sign i plays from `0.3 + 0.6·i` to `0.75 + 0.6·i`:
- its event: `enter` slides the sign from x = c − 75 into the frame (to c); `leave` slides it from c out to c + 75; `squeeze` two grey rollers close from above and below and squash it to 44 × 6; `stretch` it springs from the flat strip into a circle of radius 26; `rise` the marks’ alpha climbs from 0.15 to 0.8; `fade` the marks’ alpha falls from 0.6 to 0;
- from `0.45 + 0.6·i` its lamp of colour `tunnelGlow(ev, z_i)` glows (a 10 px glow) until the end of its slot;
- if that colour matches the cue: a `✓` (13 px, `PAL.green`) appears on the cue card and the riders say `ooh!`;
- if not: the cue card shows `✗` (13 px, `PAL.red`), a buzzer (the engine’s `bad` sound comes with the verdict), and nothing more plays: later signs stay still.
- Verdict at `0.55 + 0.6·i` for the first wrong sign i, or **2.05** when all three match (then three firework bursts over the tunnel, `A.burst` in `PAL.yellow`, `PAL.pink`, `PAL.green`).

### 6.4 The helper (the flux meter LCD)

Use `paidFlash()` and `helperOn` from `@core/aidflash` exactly as `src/games/mathematics/class-12/ch10-vector-algebra/panel-tilt/index.ts` does (`flash.paid()` inside `test.read`, `since = flash.since(A.clock, k)` in `draw`).

| Round | LCD (green text on black, 11 px; level 1 one box on the podium, level 2 one line under each rig, level 3 the box in the brake bank) |
|---|---|
| 1 (`assist 0`) | live `lcdText(r, v)` |
| 2 (`assist 1`) | `LCD_OFF`, except for 1.5 s after a check, when it shows `lcdText` in `PAL.yellow` |
| 3 (`assist 2`) | `LCD_OFF` always; the check button gives `No charges left this round.` through the engine (charges `[1, 1, 0]`) |

During a show the LCD follows `helperOn(r.assist, shot.ok, Infinity)`. The LCD is the **only** place the induced field (levels 1, 2) or the player’s steady speed (level 3) appears before a show (prove it with the canvas recorder, section 9).

### 6.5 Level 3: the Brake Run

- **The track** (`TRACK3`): a straight slope of two rails (3 px, `#9aa3b8`) from (70, 120) to (470, 250), then flat from (470, 250) to the buffer at x 600 (a red-and-white striped block 20 × 22 with a big spring in front of it). Lattice supports (thin lines) from the track to the ground every 80 px.
- **The brake zone** (`BRAKE_ZONE`, along the slope): a row of magnet blocks above and below the rails (alternating `PAL.red` and `#3d7bff`, 14 × 10), and a sign over its middle (13 px bold `PAL.white`): `` `BRAKE · B ${b} T · bar ${l} m` ``.
- **The car**: a two-seat coaster car (56 × 24) in `PAL.pink` with a white racing stripe, a headlight, two wheels on the rails and a copper bar under it (a 6 × 6 copper square, the bar seen end-on). The two riders sit in it with the lap bar down. It starts at the top of the slope (x 86).
- **The brake bank** (`BANK`): a steel cabinet with cooling fins on top, joined to the rails by two cables, and its LCD inside (the helper, at (258, 266), 84 × 16). During a run it glows orange (a fixed `rgba(255,140,40,0.6)` glow) while the car is in the brake zone, with a `HEAT` floater (11 px) the first time.
- **The station**: a platform from x 470 to 600 along the flat, a yellow `STOP` line at `STOP_X` with the word `STOP` (11 px) above it.
- **The cue board**: none; the goal line carries the safe speed.

The run (`rt` = seconds since Go):
- 0.00: GO, `GO!`, the lap bars click.
- 0.10 to the end: the car runs along the path, parametrised by `s` from 0 (top) to 1 (the `STOP` line; s = 1.18 is the buffer):
  - win: `s = ease((rt − 0.1)/1.7)` reaching 1 at 1.80 and staying; riders `YAY!` at the verdict.
  - fast (`PACE.fast`): s rises at 1.45 times the win pace and reaches the buffer (s = 1.18) at **1.50**: `BANG!`, `A.shake(9)`, the spring squashes, the hats fly, Joon is frazzled.
  - slow (`PACE.slow`): s rises at 0.55 times the win pace and the car stops at s = 0.82 (short of the platform) at **1.90**; riders `…`.
- Verdict at **1.80** (win), **1.50** (fast) or **1.90** (slow): `delay: (r, v) => verdictDelay(r, v)`. Everything ends by 2.35 s.

### 6.6 What must never show

- No target pole, move, field direction or resistance is drawn anywhere. The levers, switches, field marks and the track handle show only the player’s own setting.
- The level 3 car pace takes the fixed values of `PACE`, and the brake bank’s glow is the same on every run.
- The helper shows the induced field (levels 1, 2) or the player’s own steady speed (level 3), and only as section 6.4 allows.
- `hit` is the fixed point `[320, 70]` in every level.

### 6.7 UX checklist (README, all ten items)

| # | Item | In this game |
|---|---|---|
| 1 | Goal on the canvas | During play, `goalLine(r)` at (320, 40), 13 px bold `PAL.white`. Hidden during a show (the verdict line takes y = 22). |
| 2 | Own setting by its handle | L1: `N`/`S`, `TOWARD`/`HOLD`/`AWAY`, `CLOSED`/`SPLIT` under each lever at y 318, plus the magnet’s painted pole, the piston arrow and the ring’s gap. L2: `⊗ in`/`⊙ out` beside each switch, plus the field marks. L3: `` `R ${r} mΩ` `` centred 26 px above the track handle (y 296), 13 px bold `PAL.yellow`. Given facts on the scene: L1 none; L2 none; L3 the safe speed (goal), B and the bar length (sign): three numbers. |
| 3 | Handles | L1 levers and L2 switches radius 18; L3 track handle radius 20. Grip: a `PAL.yellow` ring (2 px) with `⇕` inside (13 px) on the levers and switches and `⇔` on the track handle. The engine brightens a handle while it is dragged. In level 1 round 1, until any dial first moves from its start, draw `drag` (11 px, `PAL.yellow`) 28 px above the MOVE lever, blinking at 1.5 Hz. |
| 4 | Legible text | Every scene string ≥ 11 px; labels sit where section 6 puts them and do not overlap Joon, the riders, the ring, the signs or each other. Every colour has a word or symbol (`GREEN ↺`, `RED ↻`, `⊗`, `⊙`, `✓`, `✗`, `N`, `S`). |
| 5 | Instant response | At rt = 0 the GO button lights, `GO!` and `KSHH` appear, and the magnet, car or first sign starts to move by 0.1 s. A win (fireworks or cheers, sound `ok`) and a miss (stillness, `✗`, a slam or a stall, sound `bad`) look and sound completely different. |
| 6 | Teach briefly | `winText` is two lines of working. Miss texts say what the setting did (level 3 ends with the plain fix `Use less resistance.` or `Use more resistance.`). |
| 7 | Living hero | Joon, the riders and the ring all have idle motion, an action at rt 0 to 0.3, and a mood after every verdict (section 4). |
| 8 | Variety | Section 6.1. Round 3 of level 1 also moves the magnet above the ring, which flips which move launches. |
| 9 | Accessibility | Sliders from `mountDialLevel` (keyboard ready) with the aria labels of section 7; buttons with aria labels; the per-level ARIA text of section 7. Use `A.shake` and `A.burst` only (the engine trims them under reduced motion) and skip the lightning flash when `matchMedia('(prefers-reduced-motion: reduce)')` matches (guard with `?.`). |
| 10 | Comfort | Nothing blinks faster than 2 Hz. The only full-screen flash is the round 3 lightning, alpha 0.25 for 0.1 s every 4.5 s. |

## 7. Controls and mount

Write one function `level(n: 1 | 2 | 3, random)` returning a `DialLevel<Round>`; it calls `buildRounds(n, random)` first.

| Level | dials | handles |
|---|---|---|
| 1 | `{ key: 'pole', aria: 'Magnet pole facing the ring: 1 north, 0 south', label: 'Pole', unit: '', step: 1, min: 0, max: 1, start: 1, text: (x) => (x ? 'N faces the ring' : 'S faces the ring') }`, `{ key: 'move', aria: 'Magnet move: 1 toward the ring, 0 hold still, -1 away', label: 'Move', unit: '', step: 1, min: -1, max: 1, start: 0, text: (x) => (x > 0 ? 'toward the ring' : x < 0 ? 'away from the ring' : 'hold still') }`, `{ key: 'ring', aria: 'Ring: 1 closed, 0 split', label: 'Ring', unit: '', step: 1, min: 0, max: 1, start: 1, text: (x) => (x ? 'closed' : 'split') }` | one per lever: POLE `at: (_r, v) => [LEVER_X[0], v.pole ? LEVER_Y.top : LEVER_Y.bottom]`, `drag: (_r, _px, py) => (py < LEVER_Y.mid ? 1 : 0)`; MOVE `at: (_r, v) => [LEVER_X[1], v.move > 0 ? LEVER_Y.top : v.move < 0 ? LEVER_Y.bottom : LEVER_Y.mid]`, `drag: (_r, _px, py) => (py < LEVER_Y.mid - 8 ? 1 : py > LEVER_Y.mid + 8 ? -1 : 0)`; RING like POLE at `LEVER_X[2]`. Radius 18. |
| 2 | three dials `z0`, `z1`, `z2`: `{ key: 'z0', aria: 'Sign 1 magnet: 1 field into the page, 0 out of the page', label: 'Sign 1', unit: '', step: 1, min: 0, max: 1, start: 1, text: (x) => (x ? '⊗ into the page' : '⊙ out of the page') }`, and the same for `z1` (Sign 2) and `z2` (Sign 3) | one per rig i: `at: (_r, v) => [RIG_X[i], v['z' + i] ? 262 : 292]`, `drag: (_r, _px, py) => (py < 277 ? 1 : 0)`, radius 18 |
| 3 | `{ key: 'r', aria: 'Brake bank resistance in milliohms', label: 'Brake bank', unit: 'mΩ', step: 1, min: 1, max: 25, start: 1 }` | `trackHandle('r', () => 1, () => 25)` |

Common to every level:
- `hero: { name: 'Joon', role: ROLE, ...HEROES[n - 1] }`, `charges: [1, 1, 0]`.
- `test`: levels 1 and 2 `{ button: '🔎 Flux check', aria: 'Flux check: read the flux meter for this setting', read: (r, v) => (flash.paid(), meterText(r, v)) }`; level 3 `{ button: '🔎 Brake check', aria: 'Brake check: read the brake meter for this setting', read: (r, v) => (flash.paid(), meterText(r, v)) }`.
- `fire: { button: '🎢 Go!', aria: 'Start the ride' }`.
- `judge`, `miss: missText`, `win: winText`, `hint: hintText`, `hit: () => [320, 70]`, `delay: (r, v) => verdictDelay(r, v)`, and `draw`.
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(3, ctx.level)) as 1 | 2 | 3; return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA[n - 1]); } })`.
- `ARIA`:
  1. `'A theme park at night: a ride engineer at a control podium beside a ring-shaped ride round a launch tower, with a giant bar magnet below or above the ring and two riders in it.'`
  2. `'A dark ride tunnel: three loop-shaped signs with green and red lights hang in the fields of three electromagnets, each under a colour cue card.'`
  3. `'The last slope of a roller coaster: a car with two riders rolls through a magnetic brake toward the station platform, with a brake bank cabinet below the track.'`

## 8. game.json (copy exactly)

Copy `docs/curriculum/gap-designs/rebuilds/json/lenz-lab.json` over the existing `game.json`. Its lengths were checked by script on 2026-10-31 (see below); the title and summary are unique against every other `game.json` in `src/games` and `rebuilds/json`. It keeps `order: 1` and `ncertRef: "Section 6.5, Lenz’s law and conservation of energy"`. Title `Night Shift at Magnet Park`. The level titles are `Ring Rocket`, `The Light Tunnel` and `The Brake Run`; each level keeps its old `adds` text. Copy the file; do not retype it.

Checked lengths: title 26, summary 136, learningOutcome 183 (curly apostrophe), `adds` 139, 117, 112, hints 3 per level and all under 140, 6 concepts (the longest 58), 5 misconceptions.

## 9. Tests

### 9.1 `logic.test.ts`

1. **Level 1**: for every row, scanning all 12 settings (pole 0..1 × move −1..1 × ring 0..1) with `judge` finds exactly one winner, equal to `rocketAnswer(r)` with ring 1; the start (1, 0, 1) fails. Check the eight answers listed in 5.2 one by one. Check the physics by hand-rules: for the magnet below, `move = 1` always gives `launch`; for the magnet above, `move = -1` always gives `launch`; `rocket(r, p, 0, k)` is `hold` and `rocket(r, p, ±1, 0)` is `split` for every row.
2. **Level 1 rounds**: 80 seeds `Array.from({ length: 80 }, (_, i) => i * 7919 + 13)`: round 1 is from `ROCKET[0]`, round 2 from `ROCKET[1]`, round 3 from `ROCKET[2]`; `assist` is `[0, 1, 2]`; the three answers (pole, move) are all different.
3. **Level 2**: for every row, scanning all 8 switch settings finds exactly one winner, equal to `tunnelAnswer(r)`; it is never `[1, 1, 1]`; the answers of the three pools are disjoint (`100, 010, 001` / `110, 011` / `101, 000`); every event of `CHANGE` is used. `tunnelGlow('enter', 1)` is green, `tunnelGlow('leave', 1)` is red, `tunnelGlow('rise', 0)` is red, `tunnelGlow('fade', 0)` is green. For every wrong setting, `firstWrong` is the first index whose switch differs from the answer.
4. **Level 3**: for every row, `1000·b²l²v/f === r` (to 1e-9); scanning R 1..25 finds exactly one value whose `steady` equals `v`; `fault` is `slow` below the answer and `fast` above it, and the steady speed agrees (below or above v by at least 6%); `b · brakeI(r, r.r) · l` equals `f` and `brakeI² · R` equals `f · v` (to 1e-6). The answers of the three pools are disjoint and none is 1 or 25.
5. **Rounds** (levels 2 and 3): 80 seeds; 3 rounds of the right kind; `assist` `[0, 1, 2]`; round k from pool k.
6. **Timing**: `verdictDelay` ≤ 2.05 for every row and setting.
7. **Words**: for every level 3 row and every wrong R, `missText` never contains `` `${r.r} mΩ` `` (use a leading `(^|[^0-9.])`). For level 1, the miss text for a wrong setting never names the answer’s pole and move together (it describes only the player’s setting, which differs). `winText` contains `Showtime!` (L1), `What a show!` (L2) and `Smooth stop!` with `I²R` (L3). `PACE` is exactly `{ slow: 0.55, win: 1, fast: 1.45 }`.

### 9.2 `tests/lenz-lab-ui.test.ts`

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch06-electromagnetic-induction/lenz-lab/index';
import { buildRounds, rocketAnswer, tunnelAnswer, type Round } from '../src/games/physics/class-12/ch06-electromagnetic-induction/lenz-lab/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'lenz-lab', 3);
const build = (level: number, seed: number) => buildRounds(level as 1 | 2 | 3, createRng(seed));
const FIRE = 'Start the ride';
function set(r: Round, right: boolean) {
  if (r.kind === 'rocket') {
    const a = rocketAnswer(r);
    h.setSlider(a.pole, 0);
    h.setSlider(right ? a.move : 0, 1); // hold never wins
    h.setSlider(1, 2);
  }
  if (r.kind === 'tunnel') {
    const z = tunnelAnswer(r);
    z.forEach((v, i) => h.setSlider(right || i > 0 ? v : 1 - v, i)); // flip sign 1 for a miss
  }
  if (r.kind === 'brake') h.setSlider(right ? r.r : r.r + 1);
}
shellTests<Round[]>(h, { levels: [1, 2, 3], build, setRight: (g, k) => set(g[k], true), setWrong: (g, k) => set(g[k], false), commit: () => h.click(FIRE) });
```

Then `describe('Night Shift at Magnet Park', …)`:
- Level 1 has three sliders (Pole 0..1 start 1, Move −1..1 start 0, Ring 0..1 start 1); level 2 three sliders 0..1 starting at 1; level 3 one slider 1..25 starting at 1.
- Level 1 at the start gives a miss containing `held still`; with the answer’s pole and move but the ring at 0 it gives `split`.
- A flux check costs a charge: `/Flux check/`, then `/No charges left/`, and the hearts stay at 3. In level 3 the button reads `/Brake check/`.
- A win says `Showtime!` (L1), `What a show!` (L2), `Smooth stop!` (L3).
- Level 3 one step above the answer gives `slammed into the buffer`; one step below gives `stopped short`.
- **Canvas recorder** (`tests/helpers/canvas-rec.ts`): the helper text (`/^RING MAKES B|^RING: NO CURRENT/` in L1, `/^INDUCED [⊙⊗]$/` in L2, `/^STEADY .* m\/s$/` in L3) is drawn in round 1; in round 2 only within 1.5 s after a check (and not 1.6 s after); never in round 3. In level 3, before the player moves the slider, no drawn text contains `` `R ${r.r} mΩ` ``.
- The goal line (`/^Launch the ring|^Pull the ring down|^Flash the cues:|^Safe speed:/`) is drawn during play in every level and not while a show plays.

## 10. Traps to avoid

- **"Seen from above"**: in level 1 the lamps are read from above, whether the magnet is below or above the ring. Anticlockwise from above makes a field pointing up. Keep `rocket` exactly as written; do not "simplify" it by assuming the magnet is always below.
- **Round 3 of level 1**: with the magnet above, moving it **away** launches the ring (attraction lifts it) and moving it **toward** pushes the ring down. This is the boss twist; the tests in 9.1 pin it.
- **Hold and split are real outcomes**: draw them as nothing happening (and the tiny `+ −` across a split ring’s gap). Never animate a launch or lights for them.
- **Level 2 stops at the first wrong sign**: do not play the later signs on a miss, or the player would see every sign’s result at once.
- **The helper shows the induced field only**: never draw the current’s sense, the colour or launch/clamp in the LCD.
- **Level 3 direction**: more resistance means a weaker brake and a faster car (`fast`); less resistance a stronger brake and a slower car (`slow`). The car’s pace is one of the three `PACE` values, never computed from `steady`.
- **Physics honesty in level 3**: the steady speed is where B²l²v/R equals the pull. Do not add friction or mass to the rules.
- **No Math.random** in logic; rain, fireworks and sparkles use the engine’s `burst` or `t`-based motion.
- **Names**: the park is `Magnet Park`, the engineer is `Joon`. No trademarked ride, park or game names anywhere a student sees.
- **Docs**: do not edit `docs/curriculum/physics-class-12/ch06-concept-weights.md`; the reviewer updates it.
