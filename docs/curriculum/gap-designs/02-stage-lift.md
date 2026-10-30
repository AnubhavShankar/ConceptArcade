# 02 · Stage Lift (Maths Ch 3, §3.4.1 to 3.4.4 Addition and scalar multiples of matrices)

Read `README.md` in this folder first. Everything below is required unless marked "optional".

## 1. Identity

| Field | Value |
|---|---|
| Game id | `stage-lift` |
| Folder | `src/games/mathematics/class-12/ch03-matrices/stage-lift/` |
| Files | `game.json`, `logic.ts`, `logic.test.ts`, `index.ts` (+ `art.ts` for the characters, recommended) |
| UI test | `tests/stage-lift-ui.test.ts` |
| Shared change | one small, backward-compatible edit to `src/core/dialgame.ts` (section 6.1) |
| Book coverage | §3.4.1 to 3.4.4; Ex 3.2 Q1, Q4, Q5, Q7 to Q12 |
| Inspiration (code comment only) | Mirror's Edge and parkour games (a free-runner who must land every jump), concert stage shows with hydraulic lifts, DJ mixing-desk faders |
| Core verb | **Push faders** on a mixing desk (one fader per unknown entry or letter), then watch the stage pillars rise and the runner perform. |

## 2. What the student learns

- Matrices of the same order add and subtract entry by entry; kA multiplies every entry by k.
- Solve a matrix equation by moving known matrices across, entry by entry, then dividing by the scalar: 2X + B = C gives X = ½(C − B).
- Two matrix equations in two unknown matrices: add or subtract them (X + Y = P, X − Y = Q).
- Matrix equality gives one ordinary equation per entry, so letters inside entries can be found.

## 3. Story and characters

**Kiko**, a free-runner, performs a parkour show at a concert. The stage floor is a grid of **hydraulic pillars**; the heights of the pillars form a matrix (row 1 is the back row, row 2 the front row). The stage computer builds the heights from programs: it adds programs, multiplies a program by the master gain, and so on. Kiko rehearsed her routine for the heights on the **choreography card** (a matrix C). She jumps for exactly those heights: if a pillar stands too high she slams into its side, and if it stands too low she drops into the gap.

The player is the stage technician: they set the unknown program on the **faders** of the mixing desk.

Level 3 adds a second runner, **Jax**, on a second stage.

Hero banner (`hero` of every DialLevel): `name: 'Kiko'`, `role: 'a free-runner who performs a parkour show across a stage of hydraulic pillars'`.

| Level | story | objective |
|---|---|---|
| 1 | `The stage computer adds two programs: the base program A is already loaded, and you set program Y on the faders. Each pillar rises to its entry of A + Y. Kiko jumps for the heights on her choreography card C, so A + Y must equal C entry by entry.` | `Set program Y so every pillar stands at the height on Kiko’s card, in three rounds. In the boss round the computer subtracts: A − Y.` |
| 2 | `The master gain multiplies a whole program: 2X doubles every entry of X. The stage now runs a gained program X together with a fixed program B, and you set X.` | `Set program X so the pillars match Kiko’s card exactly, in three rounds.` |
| 3 | `Two stages run side by side. Kiko’s stage computes one combination of programs X and Y, and Jax’s stage another, such as X + Y and X − Y. You set both X and Y.` | `Set X and Y so both runners land every jump, in three rounds.` |
| 4 | `The stage crew wrote the programs with letters x, y, z and t inside the entries. Each pillar’s height is an expression in the letters. Matching each pillar to Kiko’s card gives one equation per entry.` | `Set the four letters so every pillar matches the card, in three rounds.` |

## 4. Rules (`logic.ts`)

### 4.1 Helpers

```ts
import { aid, type Values } from '@core/dialgame';
import { num } from '@core/mathkit';

export type Mat = number[][];
const ri = (lo: number, hi: number, random: () => number) => lo + Math.floor(random() * (hi - lo + 1));
const mat = (r: number, c: number, lo: number, hi: number, random: () => number): Mat => Array.from({ length: r }, () => Array.from({ length: c }, () => ri(lo, hi, random)));
const zip = (A: Mat, B: Mat, f: (a: number, b: number) => number): Mat => A.map((row, i) => row.map((v, j) => f(v, B[i][j])));
const scale = (k: number, A: Mat): Mat => A.map((row) => row.map((v) => k * v));
const flat = (M: Mat) => M.flat();
const nonzero = (M: Mat) => flat(M).filter((v) => v !== 0).length;
const negatives = (M: Mat) => flat(M).filter((v) => v < 0).length;
const inRange = (M: Mat) => flat(M).every((v) => v >= -8 && v <= 14);
export const sameMat = (A: Mat, B: Mat) => flat(A).every((v, i) => v === flat(B)[i]);
/** "[3 −1; 4 2]": rows separated by "; ", true minus signs. */
export const matText = (M: Mat) => `[${M.map((row) => row.map(num).join(' ')).join('; ')}]`;
const SUB = '₀₁₂₃₄₅₆₇₈₉';
/** "y₁₂": the name of entry (i, j) of matrix `name`, counting from 1. */
export const entryName = (name: string, i: number, j: number) => `${name}${SUB[i + 1]}${SUB[j + 1]}`;
```

### 4.2 Round type

```ts
export type Kind = 'add' | 'sub' | 'gain2' | 'gain3' | 'gainBack' | 'pair1' | 'pair2' | 'pair3' | 'letters1' | 'letters2' | 'letters3';
export interface Round {
  kind: Kind;
  rows: 2;
  cols: 2 | 3;
  /** The dial keys in fader order, e.g. ['y11', 'y12', 'y21', 'y22'] or ['x11', …, 'y22'] or ['x', 'y', 'z', 't']. */
  keys: string[];
  /** The winning value of each key. */
  ans: Values;
  /** Known matrices shown in the equation (A, B, P, Q as the kind needs). */
  known: Record<string, Mat>;
  /** Kiko's card (and Jax's card in level 3). */
  card: Mat;
  card2?: Mat;
  assist: 0 | 1 | 2;
}
```

Dial keys: an entry of an unknown matrix `M` at row i, column j (from 0) has key `` `${M.toLowerCase()}${i + 1}${j + 1}` `` (`y11`, `x23`). Letters use `x`, `y`, `z`, `t`. All dials run from −9 to 9 in steps of 1 and start at 0.

### 4.3 The heights (the stage computer)

```ts
/** The unknown matrix `name` (2 × cols) read from the dial values. */
export const fromDials = (name: string, cols: number, v: Values): Mat => [0, 1].map((i) => Array.from({ length: cols }, (_, j) => v[`${name}${i + 1}${j + 1}`] ?? 0));
/** The pillar heights of Kiko's stage (and Jax's stage) for the dial values v. */
export function heights(r: Round, v: Values): { kiko: Mat; jax?: Mat }
```

| kind | level / round | equation shown | Kiko's heights | Jax's heights |
|---|---|---|---|---|
| `add` | L1 R1, R2 | A + Y = C | A + Y | – |
| `sub` | L1 R3 (boss) | A − Y = C | A − Y | – |
| `gain2` | L2 R1 | 2X + B = C | 2X + B | – |
| `gain3` | L2 R2 | 3X − B = C | 3X − B | – |
| `gainBack` | L2 R3 (boss) | B − 2X = C | B − 2X | – |
| `pair1` | L3 R1 | X + Y = P, X − Y = Q | X + Y | X − Y |
| `pair2` | L3 R2 | 2X + Y = P, X − Y = Q | 2X + Y | X − Y |
| `pair3` | L3 R3 (boss) | 2X + 3Y = P, 3X + 2Y = Q | 2X + 3Y | 3X + 2Y |
| `letters1` | L4 R1 | 2[x z; y t] + B = C | [2x + b₁₁, 2z + b₁₂; 2y + b₂₁, 2t + b₂₂] | – |
| `letters2` | L4 R2 | [x + y, z + t; z − t, x − y] + B = C | [x + y + b₁₁, z + t + b₁₂; z − t + b₂₁, x − y + b₂₂] | – |
| `letters3` | L4 R3 (boss) | 2[x z; y t] + [y t; x z] + B = C | [2x + y + b₁₁, 2z + t + b₁₂; 2y + x + b₂₁, 2t + z + b₂₂] | – |

In level 3, Kiko's card is P and Jax's card is Q.

```ts
export const judge = (r: Round, v: Values) => { const h = heights(r, v); return sameMat(h.kiko, r.card) && (!h.jax || sameMat(h.jax, r.card2!)); };
```

### 4.4 Building the rounds (`buildRounds(level, random)`)

Each generator **loops** (rejection sampling) until its conditions hold; each takes about 2 tries on average. Call the generators in round order. Every round gets `assist: aid(k)`. Order: L1 and L3 and L4 use 2 × 2; **L2 uses 2 × 3 in all three rounds** (the dials are fixed per level, so the order of a level never changes between rounds).

- **`add`** (L1 R1 and R2): A = `mat(2, 2, −2, 6)`, Y* = `mat(2, 2, −4, 5)`; require `nonzero(Y*) ≥ 2`, `negatives(Y*) ≥ 1`; C = A + Y*; require `inRange(C)`. `known = { A }`, `card = C`, `ans` = the entries of Y* under keys `y11 … y22`.
- **`sub`** (L1 R3): A = `mat(2, 2, 0, 8)`, Y* = `mat(2, 2, −4, 5)`; require `nonzero ≥ 3`, `negatives ≥ 1`; C = A − Y*; `inRange(C)`.
- **`gain2`** (L2 R1): X* = `mat(2, 3, −4, 4)`, B = `mat(2, 3, −3, 5)`; require `nonzero(X*) ≥ 3`, `negatives(X*) ≥ 1`; C = 2X* + B; `inRange(C)`. Keys `x11 … x23`.
- **`gain3`** (L2 R2): X* = `mat(2, 3, −3, 3)`, B = `mat(2, 3, −3, 5)`; same requirements; C = 3X* − B.
- **`gainBack`** (L2 R3): X* = `mat(2, 3, −4, 4)`, B = `mat(2, 3, 0, 8)`; same requirements; C = B − 2X*.
- **`pair1`, `pair2`, `pair3`** (L3): X*, Y* = `mat(2, 2, lo, hi)` with lo..hi = −3..4 for pair1 and pair2, −2..3 for pair3; require `nonzero(X*) + nonzero(Y*) ≥ 4` and `negatives(X*) + negatives(Y*) ≥ 1`; P, Q from the table; require `inRange(P)` and `inRange(Q)`. Keys `x11 x12 x21 x22 y11 y12 y21 y22` (8 faders). `known = {}`, `card = P`, `card2 = Q`.
- **`letters1`, `letters2`, `letters3`** (L4): x, y, z, t each `ri(−4, 5)`; require at least 3 of them non-zero; B = `mat(2, 2, −3, 4)`; C from the table; `inRange(C)`. Keys `x y z t`. `known = { B }`.

Checked by script over 400 draws of every kind: every answer lies in −9..9, every round has exactly one winning setting on the faders, and all-zero faders never win.

### 4.5 The run plan (what Kiko does)

Kiko runs a **snake path**: row 1 from left to right, then row 2 from right to left, starting on a platform left of row 1 and ending on a platform left of row 2. In level 3 Jax runs the same path on his own stage at the same time.

```ts
export const RISE = 0.3;   // seconds for the pillars to rise
export const HOP = 0.24;   // seconds per hop
export function order(cols: number): [number, number][]   // [[0,0],[0,1],…,[0,cols−1],[1,cols−1],…,[1,0]]
export interface Fault { runner: 'kiko' | 'jax'; hop: number; i: number; j: number; kind: 'high' | 'low'; at: number }
/** The first wrong pillar on the path (the earliest in time over both runners), or null. */
export function firstFault(r: Round, v: Values): Fault | null
```

- For each runner, walk `order(cols)`; at hop k (0-based) the pillar (i, j) is wrong when its height differs from the card. `kind = 'high'` if the height is bigger than the card, `'low'` if smaller.
- `at` (seconds into the run when the verdict lands): `'high'`: `RISE + HOP * (k + 0.6)` (she hits the side mid-jump); `'low'`: `RISE + HOP * (k + 1)` (she lands on air).
- With two runners, return the fault with the smaller `at` (Kiko first on a tie).
- **Verdict time** for `DialLevel.delay`: `fault ? fault.at : RISE + HOP * (cols * 2 + 1)` (the hop onto the exit platform). Its largest value is 0.3 + 0.24 × 7 = 1.98 s, inside 2.4.

### 4.6 Words

- `intel(r)`, one sentence plus the equation, by kind:
  - add: `` `Base program A = ${matText(A)} is loaded. The stage adds your program Y. Kiko’s card: C = ${matText(C)}.` ``
  - sub: `` `Base program A = ${matText(A)}. This stage subtracts your program: the pillars stand at A − Y. Kiko’s card: C = ${matText(C)}.` ``
  - gain2 / gain3 / gainBack: `` `Program B = ${matText(B)}. The stage runs ${eq} with your program X. Kiko’s card: C = ${matText(C)}.` `` with `eq` = `2X + B`, `3X − B`, `B − 2X`.
  - pair kinds: `` `Kiko’s stage runs ${e1} and Jax’s stage runs ${e2}. Kiko’s card: P = ${matText(P)}. Jax’s card: Q = ${matText(Q)}.` `` with e1, e2 from the table.
  - letters kinds: `` `The stage runs ${eq}, with B = ${matText(B)}. Kiko’s card: C = ${matText(C)}.` `` with eq from the table (written with the letters).
- Hint line: `` `${intel(r)} ${r.assist === 0 ? 'Round 1: the pillars follow the faders live.' : r.assist === 1 ? 'The pillars stay down until showtime: a test lift costs a charge.' : 'Boss round: no preview, no test lift.'}` ``
- `missText(r, v)` with the fault f (it always exists after a miss) and the entry name `` `(${f.i + 1}, ${f.j + 1})` ``:
  - high: `` `${who}’s pillar for entry (${i}, ${j}) stood too high: ${who} slammed into its side and dropped into the pit.` ``
  - low: `` `${who}’s pillar for entry (${i}, ${j}) stood too low: ${who} landed on thin air and fell into the gap.` ``
  - `who` is `Kiko` or `Jax`. The text never states the needed value or the size of the error.
- `testText(r, v)` (the charge): list the wrong pillars by direction only: `` `Test lift: ${parts}.` `` where parts is, for each runner with wrong pillars, `` `${who}’s stage has entries ${list} too high and ${list} too low` `` (omit an empty half), or `Test lift: every pillar matches the card.` when all are right. Entries are written `(1, 2)`.
- `explain(r)` after a win, entry by entry (use `entryName` and true minus signs):
  - add: `` `Matrices add entry by entry, so Y = C − A: ${items}.` `` with items like `y₁₁ = 7 − 3 = 4`, joined by `, `.
  - sub: `` `A − Y = C, so Y = A − C: ${items}.` ``
  - gain2: `` `2X + B = C, so X = ½(C − B): ${items}.` `` with items `x₁₁ = ½(9 − 3) = 3`.
  - gain3: `` `3X − B = C, so X = ⅓(C + B): ${items}.` ``
  - gainBack: `` `B − 2X = C, so X = ½(B − C): ${items}.` ``
  - pair1: `` `Adding the equations gives 2X = P + Q, so X = ½(P + Q) = ${matText(X)}; subtracting gives 2Y = P − Q, so Y = ${matText(Y)}.` ``
  - pair2: `` `Adding the equations gives 3X = P + Q, so X = ⅓(P + Q) = ${matText(X)}; then Y = X − Q = ${matText(Y)}.` ``
  - pair3: `` `Adding gives 5(X + Y) = P + Q and subtracting gives Y − X = P − Q, so X = ½[⅕(P + Q) − (P − Q)] = ${matText(X)} and Y = ½[⅕(P + Q) + (P − Q)] = ${matText(Y)}.` ``
  - letters1: `` `Matching entries: 2x + ${b11} = ${c11} gives x = ${x}; 2z + ${b12} = ${c12} gives z = ${z}; 2y + ${b21} = ${c21} gives y = ${y}; 2t + ${b22} = ${c22} gives t = ${t}.` `` (write `+ −3` as `− 3`: use a helper `plus(n)` that gives `+ 3` or `− 3`).
  - letters2: `` `Matching entries: x + y = ${s1} and x − y = ${d1}, so x = ${x} and y = ${y}; z + t = ${s2} and z − t = ${d2}, so z = ${z} and t = ${t}.` `` where s1 = c₁₁ − b₁₁, d1 = c₂₂ − b₂₂, s2 = c₁₂ − b₁₂, d2 = c₂₁ − b₂₁.
  - letters3: `` `Matching entries: 2x + y = ${e11} and x + 2y = ${e21}, so x = ${x} and y = ${y}; 2z + t = ${e12} and z + 2t = ${e22}, so z = ${z} and t = ${t}.` `` where eᵢⱼ = cᵢⱼ − bᵢⱼ.

## 5. Screen and art

Canvas 640 × 340 (`mountDialLevel` fixes it). Regions:

```ts
const EQ = { y: 14, h: 76 };                         // equation band across the top
const STAGE = { x0: 34, floor: 262, dx: 58, backDx: 30, backDy: 30, unit: 7, w: 40, d: 26 };  // one stage
const STAGE2_X0 = 214;                                // level 3: Jax's stage
const DESK = { x0: 404, x1: 632, top: 104, trackTop: 132, trackBottom: 286, y1: 316 };
```

### 5.1 Equation band (top)

Draw the equation of the round as bracketed grids, centred, cell 26 × 20, numbers in `PAL.white` size 12 (`num`). Unknown matrices show their **current fader values** in `PAL.yellow` with the entry names underneath in size 8. Known matrices in `PAL.white`, the card in `PAL.pink` labelled `card`. Operators (`+`, `−`, `=`, `2·`) in `PAL.dim` size 16. Level 3 draws its two equations on one line, smaller (cell 20 × 16). Level 4 draws letter expressions inside the cells (e.g. `x + y`) in `PAL.yellow` with the current letter values listed underneath: `x = 0  y = 0  z = 0  t = 0`.

### 5.2 The stage (left)

- Pillar (i, j) of one stage, front-bottom-left corner: row 2 (`i = 1`, front): `(x0 + j·dx, floor)`; row 1 (`i = 0`, back): `(x0 + j·dx + backDx, floor − backDy)`. Draw the back row first.
- A pillar of height h (in units) is `cuboid(g, x, y, w, d, h·unit, colour, false)` from `@core/mathkit`, sides in `#1d2a6a`, edges `PAL.cyan`, the top face glowing `PAL.cyan` while still and `PAL.green` when Kiko lands on it. Write the entry `(i, j)` on the top face in size 8.
- **Negative heights**: draw a dark shaft (`#03040f`) from the floor down `|h|·unit` px at the pillar's position and the pillar's top face at the bottom of the shaft; then redraw the floor edge in front so the pillar looks sunk.
- The stage floor: a dark slab from `x0 − 60` to `x0 + cols·dx + 70` with a neon rim, the start platform (height 0) left of row 1 and the exit platform left of row 2.
- **What the pillars show while playing**:
  - Round 1 (`assist 0`): the pillars stand at `heights(r, v)` live as the faders move, and the card heights are drawn as dashed `PAL.pink` outline boxes (ghosts) on every pillar.
  - Round 2 (`assist 1`): all pillars flat at height 0 and no ghosts, until a **test lift** (charge): the pillars rise to the current heights with the ghosts for 1.5 s, then sink.
  - Round 3: flat, no ghosts, no test lift.
- During the run the pillars rise from 0 to their heights in `RISE` seconds (ease-out), with a hiss: small white steam puffs at each base.
- The picture is **not to scale against the numbers**: the ghosts and live heights appear only in round 1 and in a test lift, so the answer cannot be read off later rounds.

### 5.3 Kiko (and Jax)

`runner(g, x, y, t, o: { pose: 'idle' | 'crouch' | 'air' | 'land' | 'slam' | 'fall' | 'flip' | 'cheer'; mood: Mood; facing: 1 | -1; look: 'kiko' | 'jax' })`, feet at (x, y), about 34 px tall.

- **Kiko**: an orange hoodie with the hood down, black joggers, white sneakers with `PAL.cyan` glowing soles, a red headband, a short ponytail that swings, wristbands. Face with `face(g, …)`.
- **Jax** (level 3): a green cap worn backwards, a purple tank top, baggy grey shorts, high-top sneakers with `PAL.pink` soles.
- **Idle**: bounces on the toes (`2·|sin(t·4)|`), breathing chest, shakes out the hands every 3 s, the ponytail sways.
- **Hop** (0.24 s): crouch for the first 0.05 s (squash to 80% height), then fly along a parabola from the current top to the next pillar top with stretch (110%), arms up, knees tucked at the top. Peak height: 28 px above the higher of the two tops.
- **Land**: knees bend for 0.06 s, a puff of dust (6 small grey particles), the pillar top flashes `PAL.green`.
- **high fault (`slam`)**: the jump is aimed at the card height, so she flies into the pillar's side at 60% of the hop, squashes flat against it for 0.1 s, three stars circle her head, and she slides down into the pit. Mood `worried`.
- **low fault (`fall`)**: she lands where the card's top should be, pedals in the air for 0.15 s with a cartoon `!`, then drops onto the low pillar or into the shaft. Mood `worried`.
- **Win (`flip`, then `cheer`)**: after the exit hop, a backflip (rotate 2π in 0.3 s) and a peace-sign pose. Mood `cheer`.

### 5.4 The crowd and the lights

- A row of 16 crowd silhouettes along the bottom (y 318 to 340, x 0 to 400), heads bobbing with phase offsets, glow sticks (`PAL.pink` and `PAL.cyan`) swaying.
- Win: the crowd jumps, the glow sticks wave fast, `A.float('WOOO!', 200, 250, PAL.yellow)`.
- Miss: hands on heads, `A.float('OOOH…', 200, 250, PAL.dim)`.
- Two spotlight beams from the top corners of the stage area sweep slowly (`sin(t·0.7)`). On a win they lock onto Kiko.

### 5.5 The mixing desk (right)

- A dark panel from `DESK.x0` to `DESK.x1`, top `DESK.top` to `DESK.y1`, with four screws in the corners and the title `STAGE DESK` in `PAL.dim` size 10.
- One fader per key: tracks spaced evenly across the panel (spacing `(DESK.x1 − DESK.x0) / (keys.length + 1)`), each a vertical line from `trackTop` to `trackBottom` with tick marks at −9, 0 and 9. The knob is a 22 × 12 rounded rectangle in `PAL.yellow` at `y = trackBottom − ((value + 9) / 18) · (trackBottom − trackTop)`. The value is printed above the track (size 10) and the key name below it (`y₁₁`, or `x` in level 4).
- A small LED level meter beside each knob (decoration, lit up to the knob).

### 5.6 Handles

One handle per key, `radius 14`, at the knob; `drag(r, px, py) = −9 + ((DESK.trackBottom − py) / (DESK.trackBottom − DESK.trackTop)) · 18` (the slider's `set` snaps and clamps).

## 6. Controls and mount

### 6.1 The shared change in `src/core/dialgame.ts`

The verdict time depends on where Kiko fails, so `DialLevel.delay` must accept a function. Make exactly this change and nothing else:

```ts
// in interface DialLevel<R>
  /** Seconds into the shot at which the verdict lands (default 1.2), or a function of the round and the fired values. */
  delay?: number | ((r: R, v: Values) => number);
```

and in the Fire button handler replace `L.delay ?? 1.2` with `typeof L.delay === 'function' ? L.delay(r, v) : (L.delay ?? 1.2)`. Every existing game passes a number, so nothing else changes. Run the existing dialgame users' tests afterwards as part of `npm run check`.

### 6.2 The level

```ts
function level(n: 1 | 2 | 3 | 4, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const keys = rounds[0].keys;                       // the same in all three rounds of a level
  return {
    hero: { name: 'Kiko', role: '…', ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials: keys.map((key) => ({ key, aria: ariaFor(key), label: labelFor(key), unit: '', step: 1, min: -9, max: 9, start: 0 })),
    handles: keys.map((key, idx) => faderHandle(key, idx, keys.length)),
    test: { button: '🔧 Test lift', aria: 'Test lift: raise the pillars for a moment to the heights you set', read: (r, v) => testText(r, v) },
    fire: { button: '▶ Showtime', aria: 'Start the show' },
    judge: (r, v) => judge(r, v),
    miss: (r, v) => missText(r, v),
    win: (r) => `Perfect run! ${explain(r)}`,
    hint: (r) => hintText(r),
    hit: (r) => [STAGE.x0 + 60, STAGE.floor - 80],
    delay: (r, v) => verdictTime(r, v),
    draw: (s) => drawScene(s),
  };
}
```

- `labelFor(key)`: `y11` → `y₁₁`; letters stay `x`, `y`, `z`, `t`.
- `ariaFor(key)`: matrix entries `` `Program ${M} entry row ${i} column ${j}` `` (`Program Y entry row 1 column 2`); letters `` `Letter ${key}` ``.
- The test lift: `DialLevel.test` already spends the charge and shows the text. To animate it, keep two closure variables in `level()`: `let testPending = false; let testAt = -10;`. In `read`, set `testPending = true` before returning the text. In `draw`, if `testPending`, set `testAt = s.t` and `testPending = false`; show the lift while `s.t − testAt < 1.5`.
- **Round 1 has a charge too** (charges `[1, 1, 0]`), even though the pillars are live; that is the engine default.
- Mount: `defineGame({ mount(ctx) { const n = Math.max(1, Math.min(4, ctx.level)) as 1 | 2 | 3 | 4; return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA); } })` with `ARIA = 'A concert stage of hydraulic pillars that rise to the heights of a matrix, a free-runner who jumps across them, and a mixing desk of faders.'`.

## 7. game.json (copy exactly)

```json
{
  "$schema": "../../../../../../schema/game.schema.json",
  "id": "stage-lift",
  "title": "Stage Lift",
  "summary": "Program the hydraulic pillars of a concert stage with matrix sums and scalar multiples so a free-runner lands every jump.",
  "subject": "mathematics",
  "classLevel": 12,
  "chapter": { "number": 3, "name": "Matrices" },
  "ncertRef": "Section 3.4.1, Addition of matrices",
  "concepts": [
    "Adding matrices entry by entry",
    "Subtracting matrices",
    "Multiplying a matrix by a scalar",
    "Solving a matrix equation such as 2X + B = C",
    "Two matrix equations in two unknown matrices",
    "Unknowns inside the entries of a matrix"
  ],
  "learningOutcome": "The student can add, subtract and scale matrices, solve matrix equations such as 2X + B = C or a pair X + Y = P, X − Y = Q, and find unknowns from matching entries.",
  "mechanic": "tune-to-target",
  "estimatedMinutes": 20,
  "levels": [
    {
      "title": "The second program",
      "tier": "concept",
      "kind": "foundation",
      "adds": "Baseline: matrices of the same order add entry by entry, so if A + Y = C then Y = C − A; the boss subtracts instead (Ex 3.2 Q1, Q4).",
      "hints": [
        "Work one pillar at a time: the entry in row i, column j of A + Y is aᵢⱼ + yᵢⱼ.",
        "So each entry of Y is the card’s entry minus the base program’s entry.",
        "In the boss round the stage computes A − Y, so yᵢⱼ = aᵢⱼ − cᵢⱼ."
      ]
    },
    {
      "title": "Master gain",
      "tier": "application",
      "kind": "concept",
      "adds": "New: a scalar multiplies every entry, so 2X + B = C gives X = ½(C − B), and 3X − B = C gives X = ⅓(C + B) (Ex 3.2 Q1, Q8).",
      "hints": [
        "kX multiplies every entry of X by k.",
        "Move B to the other side first, entry by entry, then divide by the scalar.",
        "Watch the signs: B − 2X = C means 2X = B − C."
      ]
    },
    {
      "title": "Two crews",
      "tier": "application",
      "kind": "concept",
      "adds": "New: two unknown matrices. Add or subtract the two equations: X + Y = P and X − Y = Q give X = ½(P + Q), Y = ½(P − Q) (Ex 3.2 Q7).",
      "hints": [
        "Treat the two matrix equations like a pair of ordinary equations.",
        "Adding them removes Y; subtracting them removes X.",
        "Check one pillar of each stage with your X and Y before showtime."
      ]
    },
    {
      "title": "Hidden letters",
      "tier": "challenge",
      "kind": "concept",
      "adds": "New: the unknowns are letters inside the entries; matching entries give equations in x, y, z and t to solve (Ex 3.2 Q9 to Q12).",
      "hints": [
        "Two matrices are equal when every matching entry is equal.",
        "Write one equation per entry of the card, then solve for the letters.",
        "When two letters share entries, solve the pair together, as in x + y = 5 and x − y = 1."
      ]
    }
  ],
  "misconceptions": [
    "Matrices of different orders can be added",
    "In 2X + B = C you can divide by 2 before moving B",
    "X − Y is the same as Y − X"
  ],
  "author": { "name": "Concept Arcade maintainers", "github": "AnubhavShankar" }
}
```

## 8. Tests

### 8.1 `logic.test.ts` (80 seeds, `i * 7919 + 13`)

1. **Kinds and shapes**: level 1 kinds `add, add, sub`; level 2 `gain2, gain3, gainBack` with `cols 3`; level 3 `pair1, pair2, pair3`; level 4 `letters1, letters2, letters3`. The keys of a level are identical in its three rounds. `assist` is `[0, 1, 2]`.
2. **The answer wins and the start loses**: `judge(r, r.ans)` is true; `judge(r, allZero)` is false.
3. **One winner, scanned**: level 1 and 2: for each key, with the other keys at their answers, exactly one value in −9..9 wins (the answer). Level 3: for each entry position (i, j), scan all 19 × 19 pairs (xᵢⱼ, yᵢⱼ) with everything else at the answer: exactly one pair wins. Level 4: scan the 19 × 19 pairs (x, y) with z, t at the answer, and (z, t) with x, y at the answer: exactly one pair each.
4. **Ranges**: every answer value is in −9..9; every card entry is in −8..14.
5. **Equations are true**: for every round, `heights(r, r.ans)` equals the card(s) entry by entry, and the table in 4.3 holds at a second random setting (compute it independently in the test).
6. **firstFault**: null at the answer; raising one key by 1 from the answer gives a fault whose `kind` is `high` or `low` according to the sign of the change times the key's coefficient in that pillar; `verdictTime` is below 2.4 for every single-key change and equals 1.98 for a 2 × 3 win, 1.5 for a 2 × 2 win.
7. **Words**: `missText` contains `too high` or `too low` and never contains the needed value of the faulty pillar's card entry preceded by `to ` or `be `; `testText` never contains a number other than entry positions; `explain` contains every answer value; `matText([[3, -1], [4, 2]])` is `[3 −1; 4 2]`.

### 8.2 `tests/stage-lift-ui.test.ts`

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch03-matrices/stage-lift/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch03-matrices/stage-lift/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'stage-lift', 4);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const setAll = (r: Round, bump = 0) => r.keys.forEach((key, i) => h.setSlider(r.ans[key] + (i === 0 ? bump : 0), i));

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => setAll(g[k]),
  setWrong: (g, k) => setAll(g[k], g[k].ans[g[k].keys[0]] < 9 ? 1 : -1),
  commit: () => h.click('Start the show'),
});
```

Then `describe('Stage Lift', …)`:
1. The number of sliders is 4, 6, 8, 4 for levels 1 to 4, all at 0 when a round starts.
2. A miss in level 1 says `too high` or `too low` and costs a heart.
3. The test lift costs a charge: start level 1 seed 5, click `Test lift: raise the pillars for a moment to the heights you set`, feedback matches `/^Test lift/`; click again, `/No charges left/`.
4. A level 3 win mentions `X =` and `Y =` in the feedback.

## 9. Traps to avoid

- The dials of a level are fixed, so every round in a level has the same keys (that is why level 2 is 2 × 3 in all rounds).
- Do not show live heights or the ghost outlines in rounds 2 and 3, except during the 1.5 s of a test lift.
- `missText` gives the direction only, never by how much.
- Keep the run inside 2.4 s; use the times in 4.5.
- `num` prints a true minus sign; keep it in all texts.
- The equation band shows the fader values of the unknowns, which is fine; it must never show the computed heights in rounds 2 and 3.
