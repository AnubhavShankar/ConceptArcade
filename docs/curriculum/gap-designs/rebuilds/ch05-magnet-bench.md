# Ch 5 · Magnet Bench rebuilt as "The Floating Act" (§5.1, 5.2.1, 5.2.2; Example 5.1(a); Ex 5.3)

Read `../README.md` first (above all "A miss must not show the answer either" and the "UX checklist"), then `README.md` in this folder. Everything below is required unless marked optional. The model brief is `../20-capacitor-bench.md`; its code is in `src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-bench/`.

The old Magnet Bench was a typing quiz (label the poles, type m, type I). This brief **replaces the whole game** with an arcade game on a magic-theatre stage. It keeps the same id, folder and `order`.

## 1. Identity

| Field | Value |
|---|---|
| Game id | `magnet-bench` (unchanged) |
| Folder | `src/games/physics/class-12/ch05-magnetism-and-matter/magnet-bench/` (existing) |
| Files | **Replace** `game.json` with `docs/curriculum/gap-designs/rebuilds/json/magnet-bench.json` (copy exactly). **Delete and rewrite** `logic.ts`, `logic.test.ts`, `index.ts`. **Add** `art.ts`. |
| UI test | **Delete** `tests/magnet-ui.test.ts`. **Create** `tests/magnet-bench-ui.test.ts`. |
| Engine | `mountDialLevel` from `@core/dialgame`, one `DialLevel` per level (3 levels) |
| Book coverage | §5.1(iv) (no isolated poles; halves are weaker magnets), §5.2.1 (field lines), §5.2.2 (bar magnet as an equivalent solenoid, same moment same field), Example 5.1(a) (cut across or along: two magnets), Ex 5.3 (m = NIA of a solenoid). M = m/V (§5.4) is why a piece of k/12 of the bar has k/12 of the moment. |
| Inspiration (code comment only) | Stage-magic games and the real 1845 "light and heavy chest" trick, in which a magician hid an electromagnet under the stage; the floating ring-magnet toy; "Cut the Rope"-style one-cut puzzles for level 1. |
| Core verb | **Saw a magnet and stand the piece the right way up** (level 1), then **wind a hidden coil and wire its battery** (levels 2 and 3), then shout "Showtime!" and watch the ring float, fall or fly. |

Nothing outside the old game and `tests/magnet-ui.test.ts` imports the old `logic.ts` (checked 2026-10-30 with a search for `magnet-bench/logic`). Search again before deleting.

## 2. What the student learns

- Every piece of a magnet is a whole magnet with a north and a south pole. Sawing a bar across gives a new pole at each sawn face; sawing it along its length gives thin magnets with the same N and S ends. There is no isolated pole (monopole).
- The paint on a school magnet (one half coloured) only marks the old poles. A piece cut from the "north half" still has a south pole at its sawn face.
- A piece is a weaker magnet: for a uniformly magnetised bar, a piece of k/12 of the bar has k/12 of its magnetic moment (M = m/V is the same everywhere in it).
- A current-carrying coil (solenoid) acts like a bar magnet, with no iron needed: m = NIA (A in m²).
- Right-hand rule: curl the fingers of the right hand along the current in the turns; the thumb points to the north pole.
- A coil and a bar magnet with the same moment make the same field far away, so a coil can replace a magnet exactly. Areas in cm² must be changed to m² (1 cm² = 10⁻⁴ m²).

## 3. The mechanic, physically

**Noor**, a stage illusionist, performs "The Floating Ring". A glass wand stands upright on her table. A chrome ring magnet, its underside a known pole, is dropped onto the wand from the top. Hidden in the table under the wand is a socket for a magnet (levels 1) or a coil (levels 2 and 3). If the hidden magnet's top pole is the **same** as the ring's underside, they repel and the ring floats; the stronger the hidden magnet, the higher it floats. The ring floats exactly at the **gold ribbon** tied on the wand only when the hidden magnet has the moment found in rehearsal.

| Level | The player sets | What decides the act |
|---|---|---|
| 1 Saw the magnet | the saw mark k (1 to 11 twelfths) and which end of the piece goes up | m = m0 × k/12 must equal the needed moment, and the up end must be the same pole as the ring's underside |
| 2 The hidden coil | the turns N wound on the coil and which way the battery drives the current | m = NIA (A in m²) must equal the needed moment, and the right-hand rule must put the right pole on top |
| 3 Swap a magnet for a coil | the same two controls | the coil must have the bar magnet's moment (A in cm²) and its top pole, so the second ring floats as before |

Consequences (each miss shows only what the player's own setting did, at fixed heights):
- **Snap** (wrong end up, or the current the wrong way): unlike poles face, so the ring is pulled down the wand and slams onto the table with a `CLACK`.
- **Low** (moment too small): the ring slides down and floats at a fixed low height, far below the ribbon; the audience murmurs.
- **High** (moment too big): the ring is pushed up off the top of the wand, flies in an arc and lands on Biscuit the rabbit's ears.
- **Win**: the ring settles at the gold ribbon and bobs there; the audience applauds.

**Fixed heights.** The ring's resting centre is `HOVER.win = 124` (the ribbon), `HOVER.low = 200` or `HOVER.snap = 222` (on the table). These never depend on how far the player's moment is from the answer.

## 4. Story and characters

Hero banner: `name: 'Noor'`, `role: 'a stage illusionist whose floating-ring act runs on real magnets and a hidden coil'`.

| Level | story | objective |
|---|---|---|
| 1 | `Noor’s act: a ring magnet floats on a glass wand, held up by a magnet hidden in the table, like poles facing. Tonight she saws the hidden magnet from a bar ruled in 12 equal marks. Every piece of a magnet is a whole magnet with its own N and S, and a piece of k/12 of the bar has k/12 of its moment. The paint only shows where the bar’s old poles were.` | `Saw the right piece and stand it the right way up, so the ring floats at the gold ribbon, in three shows.` |
| 2 | `Noor swaps the hidden magnet for a coil on a plastic tube, so she can switch the float on and off. No iron is needed: a coil carrying a current is a magnet with m = NIA. Curl your right hand’s fingers along the current in the turns and your thumb points to the north end.` | `Wind the coil and wire the battery so the ring floats at the ribbon, in three shows.` |
| 3 | `The grand finale has a second wand over a real bar magnet. Noor will replace that magnet with a coil in front of the audience, and the ring must not move: a coil with the same moment as the magnet makes the same field. The coil’s turns are measured in cm², and 1 cm² is 10⁻⁴ m².` | `Wind a coil with the bar magnet’s moment and its pole on top, so the ring stays at the ribbon, in three shows.` |

Characters (each in its own function in `art.ts`, AGENTS.md item 17):
- **Noor** (hero) stands left of the table, feet at `NOOR` (96, 286), about 112 px tall.
  - Gear: a tall black top hat with a red band; a midnight-blue tailcoat with sequins (three small white dots that glint in turn, one every 0.4 s); a white shirt and red bow tie; white gloves; black boots; a short black magic wand with a white tip in her right hand. In level 1 she holds a fine hacksaw in her left hand.
  - Pose: three-quarter view facing the table, right arm raised slightly with the wand.
  - Idle: breathing (the body scales 1 + 0.015·sin(t·2.2) vertically), blinks every 3 s, twirls the wand once every 4 s (a 360° spin over 0.5 s), and tips her hat 4° every 6 s.
  - Action (on fire): at rt 0.00 she flicks the wand forward (the wand rotates −60° over 0.1 s) and white sparkles burst from its tip (`A.burst(…, PAL.white, 10, 90)`), with a `Hey presto!` floater above her.
  - Moods: `face(g, …, 'happy')` while waiting; `'cheer'` and a deep bow (body tilts 25° forward for 0.6 s, the hat held out in her hand) on a win; `'worried'` with a sweat drop on a low or snap; on a high she is **startled**: eyebrows up (two short lines 3 px above the eyes), mouth an `o` (circle r 3), hat knocked 6 px up off her head for 0.4 s, drawn by hand.
- **Biscuit** (NPC, the rabbit assistant) sits in an upturned top hat on the floor right of the table, hat at `HAT` (520, 286), the rabbit about 40 px tall above the brim.
  - Body: white with a pink nose, two long ears (pink inside), round black eyes, small paws on the brim.
  - Idle: the nose wiggles (1 px, 8 times a second for 0.5 s every 2 s), one ear flops and springs back every 5 s.
  - On fire: covers its eyes with both paws.
  - Win: pops 14 px higher out of the hat, ears straight up, and claps (paws together twice), with a `👏` floater.
  - Low: ears droop flat.
  - Snap: ducks into the hat (only the ear tips show) for 0.8 s.
  - High: the ring lands around its ears at about 1.3 s; stars circle its head (three yellow `✦` orbiting at radius 12) and its eyes become spirals (dizzy), drawn by hand.
- **Rondo, the ring** (the target) is a chrome ring magnet seen edge-on: an ellipse 34 × 10, `#c9d3e6` with a white highlight, its underside pole printed below it as `N▾` or `S▾` in 11 px (a given fact). It has two tiny dot eyes on its front rim.
  - Idle: before the act it hangs in a clip at the top of the wand (y 78) and sways ±2 px.
  - Win: bobs ±3 px at the ribbon, eyes happy (upturned arcs).
  - Low: eyes worried (small down-turned mouth), bobs ±1 px.
  - Snap: squashes to 34 × 7 for 0.15 s on impact, eyes `x x`.
  - High: spins as it flies (the ellipse alternates 34 × 10 and 10 × 34 every 0.1 s), eyes spirals.
- **The audience**: a row of 14 head-and-shoulder silhouettes along the bottom (y 306 to 340, `#120a1e`), bobbing ±1 px out of phase. Win: their arms go up (two short lines each) and `CLAP CLAP` floaters appear at (200, 300) and (440, 300). Low or snap: an `ooh…` floater at (320, 300). High: a `gasp!` floater.

## 5. Rules (`logic.ts`)

### 5.1 Constants and types

```ts
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export type Pole = 'N' | 'S';
export const MARKS = 12; // the bar is ruled in 12 equal marks

export interface SawRow { cut: 'across' | 'along'; m0: number; need: number; nLeft: boolean; under: Pole }
export interface CoilRow { a: number; i: number; need: number; under: Pole } // a: turn area in units of 10⁻⁴ m²
export interface MatchRow { mBar: number; aCm2: number; i: number; top: Pole }

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'saw'; assist: Assist } & SawRow)
  | ({ kind: 'coil'; assist: Assist } & CoilRow)
  | ({ kind: 'match'; assist: Assist } & MatchRow);
```

Units: moments in J/T, areas in m² (shown as `× 10⁻⁴ m²` in level 2 and in cm² in level 3), currents in A.

- `nLeft`: the bar's left end (as it lies on the table) is its N end. The bar's left half is painted in the colour of its left pole (N red `#e0453a`, S off-white `#e8e4d8`), the right half in the other, and each end face is stamped with its letter.
- `under`: the pole on the ring's underside (level 1 and 2).
- `top`: the pole on top of the real bar magnet under the second wand (level 3); the ring's underside is the same pole.

### 5.2 The pools (copy exactly)

Every row was checked by `check-magnet-bench.mjs` on 2026-10-30 (section 9 lists the checks; they must also be in `logic.test.ts`).

```ts
// Level 1. Round 1 saws a thin strip along the whole length; rounds 2 and 3 saw a piece off the left end.
export const SAW: SawRow[][] = [
  [
    { cut: 'along', m0: 0.6, need: 0.2, nLeft: true, under: 'N' }, { cut: 'along', m0: 0.48, need: 0.28, nLeft: false, under: 'N' },
    { cut: 'along', m0: 0.72, need: 0.54, nLeft: true, under: 'S' }, { cut: 'along', m0: 0.84, need: 0.28, nLeft: false, under: 'S' },
  ],
  [
    { cut: 'across', m0: 0.6, need: 0.15, nLeft: true, under: 'N' }, { cut: 'across', m0: 0.48, need: 0.24, nLeft: false, under: 'N' },
    { cut: 'across', m0: 0.72, need: 0.48, nLeft: false, under: 'S' }, { cut: 'across', m0: 0.96, need: 0.24, nLeft: true, under: 'S' },
  ],
  [
    { cut: 'across', m0: 0.6, need: 0.25, nLeft: false, under: 'N' }, { cut: 'across', m0: 0.84, need: 0.14, nLeft: true, under: 'S' },
    { cut: 'across', m0: 0.48, need: 0.4, nLeft: false, under: 'S' }, { cut: 'across', m0: 0.72, need: 0.3, nLeft: true, under: 'N' },
  ],
];

// Level 2: a in units of 10⁻⁴ m². Answers (N, dir): r1 800/1, 500/0, 300/0, 600/1; r2 1000/0, 700/1, 900/0, 450/1; r3 1100/1, 350/0, 1300/0, 250/1.
export const COIL: CoilRow[][] = [
  [{ a: 2.5, i: 3, need: 0.6, under: 'N' }, { a: 2, i: 2, need: 0.2, under: 'S' }, { a: 5, i: 2, need: 0.3, under: 'S' }, { a: 4, i: 1.5, need: 0.36, under: 'N' }],
  [{ a: 1.6, i: 4, need: 0.64, under: 'S' }, { a: 3, i: 2.5, need: 0.525, under: 'N' }, { a: 2.5, i: 4, need: 0.9, under: 'S' }, { a: 1.2, i: 5, need: 0.27, under: 'N' }],
  [{ a: 2, i: 3, need: 0.66, under: 'N' }, { a: 1.5, i: 4, need: 0.21, under: 'S' }, { a: 4, i: 2.5, need: 1.3, under: 'S' }, { a: 2.5, i: 2, need: 0.125, under: 'N' }],
];

// Level 3: areas in cm². Answers (N, dir): r1 600/0, 700/1, 400/1, 500/0; r2 850/1, 1200/0, 550/0, 750/1; r3 1400/0, 950/1, 650/1, 1050/0.
export const MATCH: MatchRow[][] = [
  [{ mBar: 0.48, aCm2: 4, i: 2, top: 'S' }, { mBar: 0.35, aCm2: 2.5, i: 2, top: 'N' }, { mBar: 0.4, aCm2: 5, i: 2, top: 'N' }, { mBar: 0.6, aCm2: 6, i: 2, top: 'S' }],
  [{ mBar: 0.51, aCm2: 2, i: 3, top: 'N' }, { mBar: 0.96, aCm2: 2, i: 4, top: 'S' }, { mBar: 0.33, aCm2: 4, i: 1.5, top: 'S' }, { mBar: 0.75, aCm2: 2.5, i: 4, top: 'N' }],
  [{ mBar: 0.84, aCm2: 2, i: 3, top: 'S' }, { mBar: 0.57, aCm2: 3, i: 2, top: 'N' }, { mBar: 0.39, aCm2: 1.5, i: 4, top: 'N' }, { mBar: 0.63, aCm2: 1.5, i: 4, top: 'S' }],
];
```

Level 1 answers (k, up; up 0 = left end, 1 = right end): r1 4/0, 7/1, 9/1, 4/0; r2 3/0, 6/1, 8/0, 3/1; r3 5/1, 2/1, 10/0, 5/0.

### 5.3 Physics, rounds and judging

```ts
export const DIAL = {
  k: { min: 1, max: 11, start: 1 },          // level 1 saw mark
  up: { min: 0, max: 1, start: 0 },          // level 1: 0 left end up, 1 right end up
  n: { min: 100, max: 1500, step: 50, start: 100 }, // levels 2 and 3: turns
  dir: { min: 0, max: 1, start: 0 },         // levels 2 and 3: 0 front current ←, 1 front current →
};

export const other = (p: Pole): Pole => (p === 'N' ? 'S' : 'N');
/** Level 1: the moment of a piece sawn to mark k. */
export const pieceMoment = (r: SawRow, k: number) => (r.m0 * k) / MARKS;
/** Level 1: the pole at the end that is put up (up 0 = the piece's left end). Every piece points the same way as the bar. */
export const pieceTop = (r: SawRow, up: number): Pole => ((up === 0) === r.nLeft ? 'N' : 'S');
/** Levels 2 and 3: m = NIA. */
export const coilMoment = (r: CoilRow | MatchRow, n: number) => n * r.i * ('a' in r ? r.a : r.aCm2) * 1e-4;
/** Right-hand rule for an upright coil seen from the front: front current to the right (dir 1) makes the top end N. */
export const coilTop = (dir: number): Pole => (dir === 1 ? 'N' : 'S');
export const needOf = (r: Round) => (r.kind === 'match' ? r.mBar : r.need);
export const topNeeded = (r: Round): Pole => (r.kind === 'match' ? r.top : r.under);

export function sawAnswer(r: SawRow) {
  const k = Math.round((MARKS * r.need) / r.m0);
  const up = pieceTop(r, 0) === r.under ? 0 : 1;
  return { k, up };
}
export function coilAnswer(r: CoilRow | MatchRow) {
  const n = Math.round(('need' in r ? r.need : r.mBar) / (r.i * ('a' in r ? r.a : r.aCm2) * 1e-4));
  const dir = ('under' in r ? r.under : r.top) === 'N' ? 1 : 0;
  return { n, dir };
}

export function buildRounds(level: 1 | 2 | 3, random: () => number): Round[] {
  const pools = [SAW, COIL, MATCH][level - 1] as unknown[][];
  const kind = (['saw', 'coil', 'match'] as const)[level - 1];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

export type Fault = 'snap' | 'low' | 'high';
export type Values = { k?: number; up?: number; n?: number; dir?: number };

export function fault(r: Round, x: Values): Fault | null {
  const top = r.kind === 'saw' ? pieceTop(r, x.up!) : coilTop(x.dir!);
  if (top !== topNeeded(r)) return 'snap';
  const m = r.kind === 'saw' ? pieceMoment(r, x.k!) : coilMoment(r, x.n!);
  const need = needOf(r);
  if (Math.abs(m / need - 1) < 1e-6) return null;
  return m < need ? 'low' : 'high';
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;
export const VERDICT_AT = 1.2; // seconds into the act: the ring reaches its fixed resting place
```

- `fault` checks the pole first: with unlike poles facing, the ring snaps down whatever the moment.
- `buildRounds` must be the **first** use of `random` in the level.
- Start settings: level 1 `k = 1`, `up = 0`; levels 2 and 3 `n = 100`, `dir = 0`. None wins on any row (tested): no answer has k = 1 or N = 100.

### 5.4 Words

Use `fmt` from `@core/judge` (3 significant figures).

**`goalText(r)`** (the one-line goal drawn on the canvas, section 6.7 item 1):
- saw: `` `Float the ring: saw a ${r.need} J/T piece` ``
- coil: `` `Float the ring: wind a ${r.need} J/T coil` ``
- match: `` `Swap the ${r.mBar} J/T magnet for a coil` ``

**`intel(r)`**:
- saw: `` `The bar is ${r.m0} J/T, ruled in 12 equal marks, and its left end is stamped ${r.nLeft ? 'N' : 'S'}. Noor saws ${r.cut === 'across' ? 'a piece off the left end' : 'a thin strip along its whole length'}. The ring’s underside is ${r.under}, and it floats at the ribbon over a ${r.need} J/T magnet.` ``
- coil: `` `Each turn of the coil is ${r.a} × 10⁻⁴ m² and the battery gives ${r.i} A. The ring’s underside is ${r.under}, and it floats at the ribbon over a ${r.need} J/T magnet.` ``
- match: `` `The bar magnet under the second wand is ${r.mBar} J/T, standing with its ${r.top} end up. Each turn of the coil is ${r.aCm2} cm² and the battery gives ${r.i} A.` ``

**Hint line** (`hint`): `` `${intel(r)} ${r.assist === 0 ? 'Round 1: the rehearsal card is live.' : r.assist === 1 ? 'The card is blank: a rehearsal costs a charge.' : 'Gala night: no rehearsal.'}` ``

**`missText(r, x)`** (what the player's setting did and what to change, never the answer; it never prints the player's k or N in a snap, because they may equal the answer):
- saw snap: `` `With the ${x.up ? 'right' : 'left'} end up, the piece’s top pole was unlike the ring’s underside, so they attracted and the ring snapped down. A float needs like poles facing: think about which pole the ${r.cut === 'across' ? 'sawn face' : 'top end'} is.` ``
- saw low: `` `A piece to mark ${x.k} was too weak a magnet: the ring floated far below the ribbon. Saw off a bigger piece.` ``
- saw high: `` `A piece to mark ${x.k} was too strong a magnet: the ring was pushed right off the wand. Saw off a smaller piece.` ``
- coil or match snap: `` `With the front current flowing ${x.dir ? 'right' : 'left'}, the coil’s top end was unlike the ring’s underside, so the ring snapped down. Use the right-hand rule on the front turns.` ``
- coil or match low: `` `${x.n} turns made too small a magnetic moment: the ring floated far below the ribbon. Wind more turns.` ``
- coil or match high: `` `${x.n} turns made too big a magnetic moment: the ring was pushed right off the wand. Wind fewer turns.` ``

**`rehearsalText(r, x)`** (the paid check, a charge):
- saw: `` `Rehearsal: a piece to mark ${x.k} is a ${fmt(pieceMoment(r, x.k!))} J/T magnet, and with the ${x.up ? 'right' : 'left'} end up its top is a ${pieceTop(r, x.up!)} pole.` ``
- coil or match: `` `Rehearsal: ${x.n} turns give m = ${fmt(coilMoment(r, x.n!))} J/T, and with the front current flowing ${x.dir ? 'right' : 'left'} the top end is ${coilTop(x.dir!)}.` ``

**`cardText(r, x)`** (the rehearsal card on the canvas, section 6.2): `` `m ${fmt(m)} J/T · top ${top}` `` with m and top as in `rehearsalText`. `CARD_OFF = '— — —'`.

**`winText(r)`** (two or three short sentences):
- saw across: `` `Ta-da! Every piece of a magnet is a whole magnet: the sawn face became ${r.nLeft ? 'an S' : 'an N'} pole, so the ${sawAnswer(r).up ? 'sawn face' : 'stamped end'} went up to face the ring’s ${r.under}. The piece is ${sawAnswer(r).k}/12 of the bar, so m = ${sawAnswer(r).k}/12 × ${r.m0} = ${r.need} J/T.` ``
- saw along: `` `Ta-da! A strip sawn along the length is still a whole magnet, with the same N and S ends as the bar, so its ${sawAnswer(r).up ? 'right' : 'left'} end went up to face the ring’s ${r.under}. It is ${sawAnswer(r).k}/12 of the bar, so m = ${sawAnswer(r).k}/12 × ${r.m0} = ${r.need} J/T.` ``
- coil: `` `Ta-da! A coil is a magnet, no iron needed: m = NIA = ${coilAnswer(r).n} × ${r.i} × ${r.a} × 10⁻⁴ = ${r.need} J/T. Fingers along the current, thumb to N: front current ${coilAnswer(r).dir ? '→' : '←'} put ${r.under} on top.` ``
- match: `` `Ta-da! Same moment, same field: N = m/(IA) = ${r.mBar} ÷ (${r.i} × ${r.aCm2} × 10⁻⁴) = ${coilAnswer(r).n} turns, since ${r.aCm2} cm² = ${r.aCm2} × 10⁻⁴ m². Front current ${coilAnswer(r).dir ? '→' : '←'} puts ${r.top} on top, like the magnet.` ``

## 6. Screen and art

Canvas 640 × 340. Draw the theatre over the engine's background with **opaque fills**, so the engine grid never shows.

```ts
export const STAGE = { floor: 286 };                         // stage floor line
export const TABLE = { x0: 160, x1: 440, top: 228 };         // velvet-covered table, cloth down to the floor
export const WAND = { x: 380, top: 72, base: 228 };          // the glass wand
export const HOVER = { start: 78, win: 124, low: 200, snap: 222 }; // ring centre y: clip, ribbon, low float, on the table
export const SOCKET = { x: 380, y: 258, w: 56, h: 52 };      // cutaway window in the table front under the wand (centre)
export const BAR = { x0: 176, y: 204, len: 144, h: 18, slab: 60 }; // level 1 bar: 12 px per mark across; along: a slab 144 × 60, 5 px per mark
export const NOOR = { x: 96, feet: 286 };
export const HAT = { x: 520, y: 286 };                        // Biscuit's top hat
export const CARD = { x: 556, y: 132, w: 116, h: 54 };        // the rehearsal card on an easel (centre)
export const TURNS = { x0: 150, x1: 470, y: 300 };            // levels 2 and 3: the winding track along the stage edge
export const BATTERY = { x: 250, y: 262 };                    // levels 2 and 3: battery box with the polarity switch (centre)
export const HIT: [number, number] = [300, 60];               // fixed burst point
```

### 6.1 The set

- **Theatre**: dark violet back wall `#1a1030`; red velvet curtains as two vertical bands with folds (x 0 to 44 and 596 to 640, `#8a1530` with darker fold lines every 11 px); a gold proscenium band at the top (y 0 to 22, `#c9a24a`); a spotlight cone from (320, 0) widening to the table (alpha 0.10). The floor is dark wood from `STAGE.floor` to 306, with a row of 9 footlight bulbs at y 302.
- **The table**: a velvet cloth (`#2b1a5a`, gold fringe along its lower edge) from x 160 to 440, top at 228, falling to the floor. In its front, under the wand, a **cutaway window** at `SOCKET` (a dark recess with a thin gold frame and an `X-RAY` tag in 11 px) shows what is hidden in the table. The audience cannot see it; the player can.
- **The wand**: a glass rod 6 px wide (`rgba(200,230,255,0.55)`, white edge highlight) from `WAND.base` up to `WAND.top`, with a round knob and a small clip at y 78 holding the ring before the act. A **gold ribbon** is tied round the wand at `HOVER.win` (a bow, `#f0c040`, 11 px label `ribbon` beside it, left side).
- **Level 1, the bar**: lies on a cutting board on the table's left part.
  - Across rounds: a bar `BAR.len` × `BAR.h` at x 176 to 320, y 204 to 222, the left half in its left pole's colour, the right half in the other; the end faces stamped `N` and `S` (11 px, dark text on the paint). Ruler ticks every 12 px along its top edge, labelled 1 to 11 in 11 px only at the player's own mark (no other numbers). Its moment is stamped in the middle: `` `${m0} J/T` ``.
  - Along rounds: the bar is drawn as a slab `BAR.len` × `BAR.slab` (x 176 to 320, y 162 to 222), painted the same way left and right; ruler ticks every 5 px up its left end. The strip sawn off is the bottom k × 5 px of the slab, along the whole length.
  - The **saw** (handle, see 7): a hacksaw blade (grey, with teeth) standing at the player's mark: vertical at x = 176 + 12k (across) or horizontal at y = 222 − 5k (along). Before the act, the part that would be sawn off is outlined with a dashed white line.
- **Level 1, the socket**: shows the piece the player has chosen, standing on its end in the cutaway window, drawn at 0.5 scale, with its paint and stamps as on the bar, so the player sees which end is up. A small `▲ up` arrow on the window frame points at its top end. The piece's own poles are **not** written on it, except by the rehearsal card.
- **Levels 2 and 3, the coil**: in the socket window, an upright coil: a white plastic tube (20 × 44) with 8 copper turns drawn as ellipses (16 × 5) and their front halves brighter. The turn count is shown beside the window in 12 px: `` `${n} turns` `` (the player's setting). Red and black wires run from the coil to the **battery box** at `BATTERY` (a 60 × 36 box on the table front, `+` and `−` terminals) and its **polarity switch**: a two-way lever with the labels `←` and `→` (12 px) and the word `front current` (11 px) under it.
  - Level 3 only: a **second wand** at x 470 (shorter, top 120) over a real bar magnet standing upright in a small glass case on the right end of the table, its top end stamped with `top` and its side with `` `${mBar} J/T` ``. A second ring floats at that wand's ribbon throughout (the given fact). When the act runs, the bar slides out and the coil (drawn in the main socket) is what holds the main ring; the second wand is decor.
- **The rehearsal card**: a blackboard on an easel at `CARD`, title `REHEARSAL` (11 px), one line of 13 px text below (section 6.2).

### 6.2 The helper (the rehearsal card)

| Round | Card |
|---|---|
| 1 (`assist 0`) | live: `cardText(r, v)` in `PAL.green` |
| 2 (`assist 1`) | `— — —`, except for 1.5 s after a paid rehearsal, when it shows `cardText(r, v)` in `PAL.yellow` |
| 3 (`assist 2`) | `— — —` always; the rehearsal button gives `A.freeNote('No charges left this round.')` through the engine (charges `[1, 1, 0]`) |

The card is the **only** place where the piece's or coil's moment or top pole appears before the act. Use `paidFlash()` and `helperOn(r.assist, false, since)` from `@core/aidflash` (call `paid()` in `test.read`; call `since(t, k)` once per frame in `draw`). Prove it with a canvas recorder (section 9).

### 6.3 The act (`rt` = seconds since fire)

- **0.00 to 0.10**: Noor flicks her wand; the `Hey presto!` floater appears at (96, 150); Biscuit covers its eyes. This is the instant response to Fire.
- **Level 1, 0.00 to 0.70**: the saw zips through the bar at the player's mark (0.00 to 0.30, 6 grey sawdust particles via `A.burst(…, '#bbbbbb', 6, 60)`), then the sawn piece lifts off the board, turns end-up the way the player chose and drops into the socket (0.30 to 0.70, along a straight path to `SOCKET`).
- **Levels 2 and 3, 0.00 to 0.70**: the polarity switch snaps to the player's side with a `CLICK` floater (0.00 to 0.15); from 0.15 the coil's front turns light up and yellow dots stream along them in the player's current direction (speed 120 px/s); in level 3 the real bar slides out of its case to the right (0.15 to 0.50).
- **0.70**: the clip at the top of the wand opens (`click` floater, 11 px) and the ring drops from `HOVER.start`.
- **0.70 to 1.20, by fault** (ring centre y; ease functions as in capacitor-bench):
  - win: falls and settles at `HOVER.win` with one 6 px bounce by 1.15; gold sparkles at the ribbon at 1.20.
  - low: slides down and settles at `HOVER.low` with a 4 px bounce by 1.15.
  - snap: accelerates down and hits the table (`HOVER.snap`) at 1.15 with a `CLACK!` floater and `A.shake(5)`.
  - high: moves up 20 px off the knob (0.70 to 0.85), then flies in an arc (a parabola from (380, 58) peaking at (450, 40) and landing at (520, 236) on Biscuit's ears at 1.30), spinning.
- **Verdict at 1.20** (`delay: VERDICT_AT`).
- **1.20 to 2.30**: the reactions of section 4. On a win, gold field lines appear for 1 s round the ring and the hidden magnet (four closed loops from the hidden magnet's top up round the ring and back to its bottom, `PAL.yellow` alpha 0.5): the true picture, shown only on a win.

### 6.4 Three rounds that look different (checklist item 8)

Detect the round with `k` (0, 1, 2) inside `draw`:
- Round 1, **Matinee**: a warm white spotlight (`rgba(255,240,200,0.10)`), a small banner on the back wall `MATINEE` (11 px).
- Round 2, **Evening show**: a violet spotlight (`rgba(200,170,255,0.12)`), two candles on the table's left end, banner `EVENING SHOW`.
- Round 3, **Gala night** (the boss): a red-gold spotlight (`rgba(255,120,90,0.14)`), a chandelier hanging from the top centre (a gold frame with 5 glowing bulbs at y 30 to 44, swaying ±2°), gold confetti pieces drifting down slowly behind the stage (10 of them, alpha 0.5), banner `★ GALA NIGHT ★`.

### 6.5 What must never show

- No piece moment, coil moment or top pole before the act except on the rehearsal card (6.2).
- No ruler number except the player's own mark; no answer mark or answer turn count anywhere.
- The ring's final heights are the fixed values in `HOVER`, never proportional to the player's moment.
- The gold field-line loops only on a win.
- `hit` is the fixed point `HIT` in every level.

### 6.6 Art functions (`art.ts`)

`stage(g, t, k)`, `table(g)`, `wand(g, ribbonGlow)`, `bar(g, r, k, sawn)`, `saw(g, r, k, moving)`, `piece(g, r, k, up, x, y, scale)`, `coil(g, n, dir, t, live)`, `battery(g, dir, t)`, `secondWand(g, r)`, `ring(g, x, y, t, mood, spin)`, `noor(g, t, o)`, `biscuit(g, t, o)`, `audience(g, t, mood)`, `card(g, text, color)`, `goalLine(g, text)`. Keep each under about 80 lines.

### 6.7 UX checklist (all ten items; coordinates are logical canvas pixels)

1. **Goal on the canvas**: `goalLine(g, goalText(r))` draws the goal at (320, 40), 13 px bold `PAL.white`, on a dark rounded plate (`rgba(0,0,0,0.55)`, 12 px padding, the width of the text). It shows from round start until fire, and comes back if the round is replayed after a miss.
2. **Own setting beside its handle**: level 1: `` `mark ${k} · ${k}/12` `` in 12 px `PAL.yellow` just above the saw handle (across: at (saw x, 190); along: at (150, saw y)), and `` `${up ? 'right' : 'left'} end up` `` in 12 px under the socket window at (380, 296). Levels 2 and 3: `` `${n} turns` `` in 12 px above the turns handle on the track and again beside the coil at (420, 246); `` `front current ${dir ? '→' : '←'}` `` in 12 px under the battery at (250, 292). Given facts drawn the same way: the bar's stamp `` `${m0} J/T` ``, the ring's `N▾`/`S▾`, and in level 3 the real bar's `` `${mBar} J/T` ``.
3. **Handles**: every handle has radius 20 (`radius: 20`), drawn by the game as a white ring (2 px) with a grip glyph inside in 12 px: `⇔` for the across saw, the turns handle and the polarity switch, `⇕` for the along saw and the piece-flip handle. While a handle is dragged, the game fills its ring with `rgba(255,210,63,0.35)` (track it with a `dragging` flag set in `drag` and cleared when `A.phase !== 'play'` or on the next frame without a drag call; a simple way: remember the clock of the last `drag` call and highlight for 0.15 s after it). In level 1 round 1 only, until the saw handle has been dragged once, a bubble `drag the saw ⇔` (12 px, `PAL.yellow`) bobs 30 px above the saw handle and the handle's ring pulses (radius 20 to 26, 2 Hz).
4. **Legible text**: all scene text is 11 px or larger. Placement keeps labels clear of Noor (x 50 to 150), the wand (x 370 to 390 above the table) and Biscuit (x 490 to 550, y 230 to 290). The scene shows at most these numbers besides the player's own settings: level 1 the bar's moment and the needed moment (in the goal line); level 2 the turn area, the current and the needed moment; level 3 the magnet's moment, the turn area and the current. Colour always comes with a word or letter (`N`, `S`, `→`, `←`, `top N`).
5. **Instant response**: within the first frame after fire, Noor's wand flick, the floater and Biscuit's paws move (6.3). A win and a miss sound different: on a win also call `A.sound('win')` at 1.20; the engine plays `bad` on a miss.
6. **Teaching**: `winText` is at most three sentences; `missText` ends with a plain "what to change" sentence (more or fewer turns, a bigger or smaller piece, or which rule to use for the pole), never the answer.
7. **Living hero**: Noor, Biscuit, Rondo and the audience all have idle motion every frame, a reaction to fire and a mood after every verdict (section 4).
8. **Variety**: section 6.4.
9. **Accessibility**: every slider and button has the aria-label in section 7; sliders are the engine's range inputs, so they work from the keyboard. ARIA scene text is `ARIA` in section 7. When `window.matchMedia('(prefers-reduced-motion: reduce)')` matches, skip the confetti, the chandelier sway and the `A.shake(5)` (the engine already limits shakes and bursts).
10. **Comfort**: the only flash is the win sparkle at the ribbon; no full-screen flash in this game. Nothing blinks faster than 3 times a second (the sequin glints step every 0.4 s; the handle pulse is 2 Hz).

## 7. Controls and mount

Write three functions `saw`, `coil` and `match`, each `(random: () => number) => DialLevel<Round>`, each starting with `const rounds = buildRounds(n, random)`.

| Level | dials | handles |
|---|---|---|
| 1 | `{ key: 'k', aria: 'Saw mark: how many twelfths of the bar to saw off', label: 'Saw at', unit: '', step: 1, min: 1, max: 11, start: 1, text: (x) => `mark ${x} (${x}/12)` }` and `{ key: 'up', aria: 'Which end of the piece goes up: 0 the left end, 1 the right end', label: 'End up', unit: '', step: 1, min: 0, max: 1, start: 0, text: (x) => (x ? 'right end' : 'left end') }` | the saw: across `at: (_r, v) => [BAR.x0 + 12 * v.k, BAR.y - 16]`, `drag: (_r, px) => (px - BAR.x0) / 12`; along `at: (_r, v) => [BAR.x0 - 18, BAR.y + BAR.h - 5 * v.k]`, `drag: (_r, _px, py) => (BAR.y + BAR.h - py) / 5` (choose by `r.cut`). The flip: `at: () => [SOCKET.x, SOCKET.y]`, `drag: (_r, px) => (px > SOCKET.x ? 1 : 0)` |
| 2, 3 | `{ key: 'n', aria: 'Number of turns wound on the coil', label: 'Turns', unit: '', step: 50, min: 100, max: 1500, start: 100, text: (x) => `${x} turns` }` and `{ key: 'dir', aria: 'Battery switch: 0 the front current flows left, 1 it flows right', label: 'Current', unit: '', step: 1, min: 0, max: 1, start: 0, text: (x) => (x ? 'front turns →' : 'front turns ←') }` | turns: `trackHandle('n', () => 100, () => 1500, TURNS.y)` but with `TRACK` replaced by `TURNS` (write a local version: `at: (_r, v) => [TURNS.x0 + ((v.n - 100) / 1400) * (TURNS.x1 - TURNS.x0), TURNS.y]`, `drag: (_r, px) => 100 + ((px - TURNS.x0) / (TURNS.x1 - TURNS.x0)) * 1400`); polarity: `at: (_r, v) => [BATTERY.x + (v.dir ? 14 : -14), BATTERY.y]`, `drag: (_r, px) => (px > BATTERY.x ? 1 : 0)` |

All handles `radius: 20`. Every `drag` also records the clock for the highlight and clears the level 1 round 1 cue (item 3).

Common to every level:
- `hero: { name: 'Noor', role: ROLE, ...HEROES[n - 1] }` with `ROLE` and the stories of section 4; `charges: [1, 1, 0]`.
- `test: { button: '🪄 Rehearse', aria: 'Rehearse: try this setting backstage first', read: (r, v) => { flash.paid(); return rehearsalText(r, v); } }`.
- `fire: { button: '🎩 Showtime!', aria: 'Showtime: perform the floating ring act' }`.
- `judge`, `miss: missText`, `win: winText`, `hint`, `hit: () => HIT`, `delay: VERDICT_AT`, and `draw`.
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(3, ctx.level)) as 1 | 2 | 3; return mountDialLevel(ctx as never, [saw, coil, match][n - 1](ctx.random) as never, ARIA); } })`.
- `ARIA = 'A magic theatre stage: an illusionist beside a table with a glass wand, a ring magnet that floats over a magnet or coil hidden in the table, a rabbit in a top hat and an audience.'`

## 8. game.json

Copy `docs/curriculum/gap-designs/rebuilds/json/magnet-bench.json` over the existing `game.json`. Its lengths were checked on 2026-10-30 (see the report of `check-json-ch05.mjs`): summary 60 to 140, learningOutcome at most 200 with a curly apostrophe, every `adds` at most 160, 2 to 4 hints of at most 200, at most 6 concepts and 5 misconceptions, and the title and summary are unique. It keeps `order: 1` and `ncertRef: "Section 5.2, The bar magnet"`.

## 9. Tests

### 9.1 `logic.test.ts`

1. **Pools** (every row):
   - saw: `MARKS * r.need / r.m0` is a whole number k with 2 ≤ k ≤ 10, and `pieceMoment(r, k)` equals `r.need` to 1e-9; `r.need` has at most 3 significant figures; `r.m0 / 12 / r.need ≥ 0.07` (neighbouring marks are far apart).
   - coil and match: `coilAnswer(r).n` is a multiple of 50 with 100 < n < 1500, and `coilMoment(r, n)` equals the target to 1e-6 relative; for every other n on the dial with the right `dir`, the moment differs from the target by more than 3%.
2. **One winner**: scan every setting (level 1: k 1 to 11 × up 0, 1; levels 2 and 3: n 100 to 1500 in steps of 50 × dir 0, 1). Only the answer passes `judge`; the start setting fails.
3. **Rounds**: 80 seeds `Array.from({ length: 80 }, (_, i) => i * 7919 + 13)`. Each level has 3 rounds of its kind, `assist` is `[0, 1, 2]`, round k's row comes from pool k, and no two rounds of one level have the same answer.
4. **Physics**: `pieceTop` follows the bar: for an across row with `nLeft`, the left end is N and the sawn face (up 1) is S; for `nLeft` false the sawn face is N. `coilTop(1)` is `N` (front current to the right, seen from the front, is anticlockwise seen from above). `fault` gives `snap` for the right size with the wrong pole, `low` for k − 1 (or n − 50) and `high` for k + 1 (or n + 50) with the right pole.
5. **Words**:
   - For every row and every wrong setting, `missText` never contains the answer token: `` `mark ${k}` `` for the answer k (level 1) and `` `${n} turns` `` for the answer n (levels 2 and 3). Use regexes with a leading `(^|[^0-9.])`.
   - A snap text never contains `mark` or `turns` at all.
   - `winText` contains `whole magnet` (level 1), `m = NIA` (level 2) and `Same moment, same field` (level 3).
   - Every `goalText` is at most 44 characters.
   - `HOVER` is exactly `{ start: 78, win: 124, low: 200, snap: 222 }`.

### 9.2 `tests/magnet-bench-ui.test.ts`

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch05-magnetism-and-matter/magnet-bench/index';
import { buildRounds, coilAnswer, sawAnswer, type Round } from '../src/games/physics/class-12/ch05-magnetism-and-matter/magnet-bench/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'magnet-bench', 3);
const build = (level: number, seed: number) => buildRounds(level as 1 | 2 | 3, createRng(seed));
const FIRE = 'Showtime: perform the floating ring act';
const TEST = 'Rehearse: try this setting backstage first';
function set(r: Round, right: boolean) {
  if (r.kind === 'saw') { const a = sawAnswer(r); h.setSlider(right ? a.k : a.k + 1, 0); h.setSlider(a.up, 1); }
  else { const a = coilAnswer(r); h.setSlider(right ? a.n : a.n + 50, 0); h.setSlider(a.dir, 1); }
}
shellTests<Round[]>(h, { levels: [1, 2, 3], build, setRight: (g, k) => set(g[k], true), setWrong: (g, k) => set(g[k], false), commit: () => h.click(FIRE) });
```

Then `describe('The Floating Act', …)`, copying the patterns of `tests/capacitor-bench-ui.test.ts`:
- Level 1 has two sliders, `Saw at` (1 to 11, start 1) and `End up` (0 to 1, start 0); levels 2 and 3 have `Turns` (100 to 1500, step 50, start 100) and `Current` (0 to 1, start 0).
- The right size with the wrong pole gives a miss containing `snapped down`, and the hearts drop to 2.
- A rehearsal costs a charge: `/Rehearsal:/`, then `/No charges left/`.
- A win says `Ta-da!` in every level.
- The verdict lands at 1.2 s: after `h.advance(1.1)` the hearts are still 3 on a miss; after another 0.2 s they are 2.
- **Canvas recorder** (copy from `tests/capacitor-bench-ui.test.ts`): the card's live text (`/^m .* J\/T · top [NS]$/`) is drawn in round 1, in round 2 only within 1.5 s after a rehearsal, never in round 3. No drawn text before fire contains the answer token (`` `mark ${k} ` `` for the answer k while the player's mark is different; `` `${n} turns` `` for the answer n while the player's turns differ).
- The goal line (`/^Float the ring|^Swap the/`) is drawn at round start in every level.

## 10. Traps to avoid

- **Fixed heights**: the ring's resting heights are `HOVER` values only. Never compute a hover height from the player's moment.
- **The paint is a trap, on purpose**: a piece cut from the red half is still a whole magnet. Do not mark the piece's own poles anywhere except the rehearsal card and the win.
- **Across vs along**: across rounds saw a piece off the left end (the sawn face is its right end); along rounds saw a strip along the whole length (it keeps both stamped ends). `pieceTop` is the same formula for both, because every piece points the same way as the bar.
- **Right-hand rule**: `coilTop(1) === 'N'` for current flowing to the right on the front turns. Draw the moving dots on the front turns in the player's direction, so the picture matches the rule.
- **No numbers on the ruler** except the player's own mark.
- **Snap texts** must not print the player's mark or turns (they may equal the answer).
- **Timing**: everything ends by 2.3 s; the verdict is at 1.2 s; the high fly-off lands at 1.3 s, after the verdict, which is fine.
- **Docs**: do not edit `docs/curriculum/physics-class-12/ch05-concept-weights.md`; the reviewer updates it.
