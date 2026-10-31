# 12 · Field Claim level 4 "Scale the field" (Maths Ch 4, §4.2 and 4.3; Ex 4.1 Q3, Q4)

Read `README.md` in this folder first. This brief **adds one level to Field Claim**. Read the game's files (`src/games/mathematics/class-12/ch04-determinants/field-claim/`) and `tests/field-claim-ui.test.ts` first, and keep levels 1 to 3 exactly as they are.

## 1. The idea

The farmer's field is a triangle of three posts. The new deed scales the whole field: Scout moves **every post from (x, y) to (kx, ky)**, scaling from the corner of the map (the origin). The deed states the new area. The player sets the scale factor **k** (a whole number from 1 to 6).

The determinant behind the area, the 2 × 2 one with rows (x₂ − x₁, y₂ − y₁) and (x₃ − x₁, y₃ − y₁), has both its columns multiplied by k. So the determinant, and the area, are multiplied by k². That is |kA| = k²|A| for a 2 × 2 matrix, and kⁿ|A| for n × n (Ex 4.1 Q3: |2A| = 4|A|; Q4: |3A| = 27|A|).

The student must find the original area with the determinant (½|x₁(y₂ − y₃) + …|), then solve k²·Δ = new area. k is positive (a stretch), so exactly one k from 1 to 6 wins.

## 2. Logic changes (`logic.ts`)

1. `Kind` gets `'scale'`; `KINDS` gets `'scale'` at the end; `DIALS.scale = [{ key: 'k', label: 'Scale k', min: 1, max: 6, start: 1 }]`.
2. `Round` gets an optional `k0?: number` (the winning factor) and uses `pts` (the three original posts) and `deed` (the new area).
3. Pools (copy exactly; each triangle's area is in the comment):

```ts
const TRI: Pt[][] = [
  [[1, 0], [3, 1], [0, 2]],    // area 5/2
  [[0, 0], [3, 1], [1, 2]],    // 5/2
  [[1, 1], [2, 3], [-1, 2]],   // 5/2
  [[2, 0], [0, 1], [1, 2]],    // 3/2
  [[-1, 0], [1, 1], [0, 2]],   // 3/2
  [[1, 2], [2, -1], [-1, 1]],  // 7/2
];
const KS: [number[], number[], number[]] = [[2, 3], [3, 4], [4, 5]];
```

   Round i: `pts = pick(TRI)`, `k0 = pick(KS[i])`, `deed = k0 * k0 * area(...pts)`, `ans = { k: k0 }`. Keep the existing de-duplication of rounds within a level (a repeated triangle with the same k is redrawn).
4. `movePost`/`triangle` for `'scale'`: the triangle for dial value k is the three posts times k.
5. `judge` for `'scale'`: `v.k === r.k0`. (`area` of the scaled triangle equals `deed` only at k0, since k² grows; check it in a test.)
6. Words:
   - `intel`: `` `The field’s posts stand at ${pts}. The new deed scales every post from (x, y) to (kx, ky) and gives the field an area of ${fmtArea(deed)}. Set k.` `` where `fmtArea` writes halves as `45/2` and whole numbers plainly.
   - `missText`: `` `With k = ${v.k} the stretched field came out ${scaled < deed ? 'too small' : 'too big'} for the deed: the fence did not close on the marker stones.` `` (direction only; never the areas).
   - `spotText`: `` `Survey: with k = ${v.k} the stretched field is ${scaled < deed ? 'smaller' : scaled > deed ? 'bigger' : 'exactly'} than the deed${scaled === deed ? '' : ' asks'}.` `` (direction only).
   - `explain`: `` `The original area is ½|${detText}| = ${fmtArea(a0)}. Multiplying every coordinate by k multiplies both columns of the determinant by k, so the area becomes k²·${fmtArea(a0)}. k²·${fmtArea(a0)} = ${fmtArea(deed)} gives k² = ${k0 * k0}, so k = ${k0}. In general |kA| = kⁿ|A| for an n × n matrix.` `` with `detText` the expanded x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂) using the numbers.

## 3. Index changes (`index.ts`)

- A fourth `HEROES` entry: story `'The new deed stretches the whole field: every post moves from (x, y) to (kx, ky). Stretching both coordinates by k multiplies the determinant, and so the area, by k².'`, objective `'Set the scale k so the stretched field has exactly the deed’s area, in three rounds.'`
- Clamp to 4 levels.
- Dial k with `trackHandle('k', () => 1, () => 6)`.
- Draw the original triangle faintly (dashed `PAL.dim`), and the stretched triangle for the current k. **Round 1**: draw the stretched triangle live with its area readout (the level's helper). **Round 2**: the stretched triangle is drawn but the area readout is hidden; a survey (charge) gives the direction. **Round 3**: the stretched triangle is not drawn until Fire. The deed's area is a number on the deed card, never drawn as a shape.
- Draw the grid **not to scale** for areas as the other levels do (no square-counting by eye: hide the grid's minor lines in rounds 2 and 3).
- Fire: Scout flies to each scaled post and plants it, and the fence closes. Win: the marker stones (deed corners) light green. Miss: the fence stops short of, or overshoots, the marker stones and Scout shrugs.

## 4. game.json changes

Append:

```json
{
  "title": "Scale the field",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: scaling every post by k multiplies the area by k², because |kA| = kⁿ|A| for an n × n matrix; find k from the new deed (Ex 4.1 Q3, Q4).",
  "hints": [
    "First find the original area with the determinant.",
    "Multiplying every coordinate by k multiplies the area by k², not by k.",
    "Solve k² × (original area) = (new area)."
  ]
}
```

Add the concept `"Scaling: |kA| = kⁿ|A|"` (6 concepts in all if there are 5 now; if there are already 6, replace the least specific one). Extend `learningOutcome` only if it stays within 200 characters (check with `npm run validate`). `estimatedMinutes`: add 5.

## 5. Tests

- `logic.test.ts`: level 4 over 80 seeds: `deed = k0²·area`; scanning k from 1 to 6 only `k0` gives the deed's area; `start` (1) never wins; `missText` says `too small` for k < k0 and `too big` for k > k0 and contains no area value; `explain` contains `kⁿ`.
- `tests/field-claim-ui.test.ts`: harness level count 3 → 4 and `levels: [1, 2, 3]` → `[1, 2, 3, 4]`.

## 6. Not designed (and why)

- **|adj A| = |A|ⁿ⁻¹** appears only as multiple-choice questions (Ex 4.4 Q17 style); there is no physical picture that makes it a game.
- **The inverse from a matrix identity** (A² − 5A + 7I = O, hence A⁻¹ = (5I − A)/7; Ex 4.4 Q13 to Q16): for 2 × 2 matrices this is the same as adj A = (tr A)I − A, which Vault Tumblers already plays. Finding the identity itself is now Hole in the Wall level 5 (brief 09). The 3 × 3 version (A³ − 6A² + 5A + 11I = O) is long arithmetic with no game loop.
