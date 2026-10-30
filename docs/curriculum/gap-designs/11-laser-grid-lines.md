# 11 · Laser Grid levels 5 and 6: the equation of a line (Maths Ch 11, §11.3; Ex 11.2 Q4 to Q7, Misc Q2)

Read `README.md` in this folder first. This brief **adds two levels to Laser Grid**. Read the game's files (`src/games/mathematics/class-12/ch11-three-dimensional-geometry/laser-grid/`) and `tests/laser-grid-ui.test.ts` first, and keep levels 1 to 4 exactly as they are (same seeds, same rounds).

## 1. The idea

Lux's laser now runs on the line's equation **r = a + λb**: the emitter sits at **a**, and each tick (λ = 1, 2, …) the beam's tip moves by **b**.
- **Level 5, "Relay line"**: the emitter is at relay A, and the beam must pass relay B after one tick (λ = 1). So b = B − A. In the boss round B is reached after two ticks, so b = (B − A)/2. This is "the line through two points" (Ex 11.2 Q4 to Q6, Misc Q2).
- **Level 6, "Read the code"**: the line arrives as a cartesian code such as (3 − x)/2 = (y − 1)/(−5) = (4 − z)/1. The player sets a and b, six dials, so that x = a₁ + b₁λ and so on with the **same λ** as the code. The code then fixes a and b exactly, including signs: (3 − x)/2 = λ means x = 3 − 2λ, so b₁ = −2 (Ex 11.2 Q7).

## 2. Logic changes (`logic.ts`)

1. `Kind` gets `'relay'` and `'code'`. `Round` gets optional fields `A?: V3`, `B?: V3`, `lam?: number` (the tick at which B is reached), `code?: string`.
2. `buildRounds`: levels 5 and 6 build their rounds from the pools below with `pick` per round; keep the existing de-duplication loop and the `start` rule (`ans.map((x) => (x === 0 ? 1 : 0))`).
3. **Level 5 pools** (`ans` = b, three dials `b1 b2 b3`, range −9..9):

```ts
const RELAY: [[V3, V3, number][], [V3, V3, number][], [V3, V3, number][]] = [
  [[[0, 0, 0], [2, 3, 6], 1], [[0, 0, 0], [1, -2, 4], 1], [[0, 0, 0], [3, 1, -2], 1], [[0, 0, 0], [-2, 4, 5], 1]],
  [[[1, 2, -1], [4, -1, 3], 1], [[-2, 0, 3], [1, 5, -1], 1], [[2, -3, 1], [-1, 1, 6], 1], [[0, 4, -2], [5, 1, 2], 1]],
  [[[1, -1, 2], [7, 3, -4], 2], [[-3, 2, 0], [1, -6, 6], 2], [[2, 5, -1], [-4, 1, 7], 2]],
];
// round: { kind: 'relay', A, B, lam, a: A, b: (B − A)/lam, ans: (B − A)/lam, min: -9, max: 9, … }
```

   The answers are (2, 3, 6), (1, −2, 4), (3, 1, −2), (−2, 4, 5); (3, −3, 4), (3, 5, −4), (−3, 4, 5), (5, −3, 4); (3, 2, −3), (2, −4, 3), (−3, −2, 4), all whole numbers in −9..9.
4. **Level 6 pools** (`ans` = [a₁, a₂, a₃, b₁, b₂, b₃], six dials `a1 a2 a3 b1 b2 b3`, range −9..9):

```ts
const CODE: [[string, V3, V3][], [string, V3, V3][], [string, V3, V3][]] = [
  [['(x − 2)/3 = (y + 1)/4 = (z − 5)/2', [2, -1, 5], [3, 4, 2]], ['(x + 3)/2 = (y − 4)/(−1) = (z − 1)/5', [-3, 4, 1], [2, -1, 5]], ['(x − 1)/4 = (y − 6)/3 = (z + 2)/(−2)', [1, 6, -2], [4, 3, -2]]],
  [['x/2 = (y − 3)/(−5) = (z + 4)/1', [0, 3, -4], [2, -5, 1]], ['(x + 1)/3 = y/4 = (z − 2)/(−6)', [-1, 0, 2], [3, 4, -6]], ['(x − 4)/(−3) = (y + 2)/2 = z/7', [4, -2, 0], [-3, 2, 7]]],
  [['(3 − x)/2 = (y − 1)/(−5) = (4 − z)/1', [3, 1, 4], [-2, -5, -1]], ['(1 − x)/3 = (y + 2)/4 = (5 − z)/2', [1, -2, 5], [-3, 4, -2]], ['(x + 2)/1 = (4 − y)/3 = (z + 1)/(−2)', [-2, 4, -1], [1, -3, -2]]],
];
```

   Checked by script: for every code, the point a + λb satisfies all three ratios equal to λ for λ = 0, 1, 2, 3.
5. `judge` is unchanged (`ans` against the dials).
6. Words:
   - `intel` relay: `` `The emitter is at relay A${pt(A)}. The beam’s tip moves by b each tick: r = a + λb. It must pass relay B${pt(B)} at tick λ = ${lam}. Set b.` `` (`pt` writes `(1, 2, −1)` with true minus signs).
   - `intel` code: `` `The line’s code is ${code}. Set the emitter a and the step b so that x = a₁ + b₁λ, y = a₂ + b₂λ, z = a₃ + b₃λ with the code’s own λ.` ``
   - `missText` relay: `` `At tick ${lam} the beam’s tip was at ${pt(tip)}, not at relay B: it missed the ring and hit the wall.` `` where `tip = A + lam·b` for the player's b (the player's own point; A and B are given, so this adds nothing new).
   - `missText` code: the first wrong dial in the order a₁, a₂, a₃, b₁, b₂, b₃: for an `a` dial, `` `The emitter is not where the code puts the line at λ = 0 (check the ${'xyz'[i]} part): the beam missed the receiver.` ``; for a `b` dial, `` `The beam set off in a direction the code does not give (check the ${'xyz'[i]} part): it missed the receiver.` `` Never write the right value.
   - `spotText` relay: `` `Test pulse: after tick ${lam} the tip would be at ${pt(tip)}.` ``; code: `` `Test pulse: the beam would start at ${pt(a)} and step by ${pt(b)} each tick.` `` (the player's own dials).
   - `explain` relay: `` `b = (B − A)/${lam} = ${pt(b)}, so the line is r = ${vec(A)} + λ${vec(b)}, or ${cart(A, b)}.` `` where `vec([1, 2, −1])` is `(î + 2ĵ − k̂)` and `cart` writes `(x − 1)/3 = (y − 2)/(−3) = (z + 1)/4` (use `x` alone for a zero coordinate, as in the code pools).
   - `explain` code: `` `Each ratio equals λ: x = ${a1} + (${b1})λ, y = ${a2} + (${b2})λ, z = ${a3} + (${b3})λ, so a = ${pt(a)}, b = ${pt(b)} and r = ${vec(a)} + λ${vec(b)}.` ``

## 3. Index changes (`index.ts`)

- Two more `HEROES` entries:
  - Level 5: story `'Lux’s new laser runs on the line r = a + λb: it starts at the emitter a and its tip moves by b every tick. The emitter is bolted to relay A, and the beam must pass relay B at the tick shown.'`, objective `'Set the step b so the beam passes relay B on time, in three rounds.'`
  - Level 6: story `'The control room sends the line as a cartesian code. Read the start point and the step out of it, and mind the signs: (3 − x)/2 = λ means x = 3 − 2λ.'`, objective `'Set the emitter and the step from the code so the beam hits the receiver, in three rounds.'`
- Clamp the level to 6 (`Math.min(6, ctx.level)`).
- Dials: level 5 uses three dials (like level 1) labelled `b₁`, `b₂`, `b₃`; level 6 uses six labelled `a₁ … b₃`. Each dial's text is `` `${label} = ${num(v)}` ``. No canvas handles (like level 1).
- Scene (reuse the level 1 oblique 3D grid and beam drawing):
  - Level 5: draw relay A as the emitter base and relay B as a ring at B, both labelled with their coordinates. **Round 1**: a dashed guide shows the player's live beam from A along b for λ = 0 to `lam + 1`, with tick marks. Rounds 2 and 3: no guide; a test pulse (charge) shows it for 1.5 s in round 2.
  - Level 6: show the code on a big console screen. The receiver ring sits at a + 3b **from the code** (the target the beam must hit), labelled `receiver` but **without its coordinates**. The player's emitter is drawn at the dials' a. In round 1 the player's beam (from a along b) is drawn live. In round 2 it shows only for 1.5 s after a test pulse, and in round 3 it is never shown.
  - Fire: the beam shoots from a along b, ticks marked at λ = 1, 2, 3. Win: the ring lights green and sparks fly. Miss: the beam passes the ring and hits the wall with a scorch mark where the **player's** beam goes. Use the level's existing delay.

## 4. game.json changes

Append:

```json
{
  "title": "Relay line",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: the line through two points is r = a + λb with b = B − A; the boss relay is reached at λ = 2, so b = (B − A)/2 (Ex 11.2 Q4 to Q6; Misc Q2).",
  "hints": [
    "The beam starts at A, so a = A.",
    "After λ = 1 the tip is at a + b, which must be B: b = B − A.",
    "If B is reached at λ = 2, then 2b = B − A."
  ]
},
{
  "title": "Read the code",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: turn a cartesian equation (x − x₁)/a = (y − y₁)/b = (z − z₁)/c into vector form, minding signs such as (3 − x)/2 (Ex 11.2 Q7).",
  "hints": [
    "Set each ratio equal to λ and solve for x, y and z.",
    "(x + 3)/2 = λ gives x = −3 + 2λ.",
    "(3 − x)/2 = λ gives x = 3 − 2λ, so that step is −2."
  ]
}
```

Add the concept `"Vector and cartesian equations of a line"` (6 concepts). Replace `learningOutcome` with `"The student can find direction cosines, test lines for a right angle, find the angle between lines and the distance between skew lines, and write a line in vector and cartesian form."` (182 characters). `estimatedMinutes`: 28.

## 5. Tests

- `logic.test.ts`: levels 5 and 6 over 80 seeds: the answers listed in 2.3 and 2.4; for relay rounds A + lam·b = B; for code rounds the ratio check of 2.4; each single-dial change loses; `start` loses; miss texts contain `missed` and never the right value of the wrong dial (check the text does not contain `= ${right}`); `explain` contains `r =`.
- `tests/laser-grid-ui.test.ts`: harness level count 4 → 6, `levels: [1, 2, 3, 4]` → `[1, 2, 3, 4, 5, 6]`, setters for 3 and 6 dials; level 6 has 6 sliders; the player's beam is not drawn in round 3 before Fire.

## 6. Traps to avoid

- Level 6's receiver shows no coordinates (they would give a + 3b away). The code is the only source.
- Keep levels 1 to 4 unchanged.
