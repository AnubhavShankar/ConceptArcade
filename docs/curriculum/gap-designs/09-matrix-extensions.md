# 09 · Matrix extensions: Hole in the Wall level 5 and Mirror Crystal level 4 (Maths Ch 3)

Read `README.md` in this folder first. This brief **adds a level to two existing games**; it does not create a game. Read each game's four files and its UI test before you change anything, and keep every existing level working exactly as it does now.

## Part A · Hole in the Wall, level 5 "Twice through the machine" (§3.4.6; Ex 3.2 Q15 to Q18, Misc Q5)

Folder: `src/games/mathematics/class-12/ch03-matrices/hole-in-the-wall/`, UI test `tests/hole-in-the-wall-ui.test.ts`.

### A.1 The idea

The wall's hole was carved by sending Blocky through machine A **twice**, so the hole is A²P. The park wants a faster "express" machine that does the job in one pass: kA − mI. The player sets **k** and **m** so that the express machine gives exactly the same hole: (kA − mI)P = A²P. Because P is invertible and A is not a multiple of I, there is exactly one such pair, k = tr A and m = det A (the student does not need to know that: they compute A² and match entries). This is the textbook's "show that A² − 5A + 7I = O" and "find k so that A² = kA − 2I".

### A.2 Logic changes (`logic.ts`)

1. `export type Kind = 'equal' | 'product' | 'rotate' | 'order' | 'identity';` and `KINDS` gets `'identity'` at the end.
2. `Round` gets an optional `M?: Mat` (the machine A of an identity round).
3. `DIALS.identity = [{ key: 'k', label: 'k', min: -6, max: 9, start: 0 }, { key: 'm', label: 'm', min: -6, max: 12, start: 0 }]`.
4. `outline` case `'identity'`: `mul([[v.k * M[0][0] - v.m, v.k * M[0][1]], [v.k * M[1][0], v.k * M[1][1] - v.m]], r.P!)`.
5. The generator, called once per round with the round index:

```ts
const ID_EASY: Mat[] = [[[2, 1], [1, 2]], [[2, 1], [3, 1]], [[3, 2], [1, 1]], [[2, 3], [1, 2]]];
const ID_MID: Mat[] = [[[2, -1], [1, 3]], [[1, -2], [1, 2]], [[1, 2], [-1, 3]], [[2, -3], [1, -1]], [[0, 1], [-1, 0]]];
const ID_BOSS: Mat[] = [[[3, 1], [-1, 2]], [[3, -2], [4, -2]], [[3, 2], [-2, 1]]];   // Misc Q5, Ex 3.2 Q17, one more
function identityRound(i: number, random: () => number): Round {
  const M = pick(i === 0 ? ID_EASY : i === 1 ? ID_MID : ID_BOSS, random);
  const P: Mat = [[1, 2], [1, 3]];
  return { kind: 'identity', M, P, H: mul(mul(M, M), P), ans: { k: M[0][0] + M[1][1], m: M[0][0] * M[1][1] - M[0][1] * M[1][0] }, assist: 0 };
}
```

   `buildRounds` currently calls `make(random)` for each round. For `'identity'` call `identityRound(i, random)` instead (round index i). Do not change how the other kinds are built, so existing seeds give the same rounds as before.

   Checked by script: for every matrix above, scanning k from −6 to 9 and m from −6 to 12, exactly one pair fits, and it is (tr A, det A). Every det is non-zero. The answers are (4,3), (5,−2), (4,1), (4,1), (5,7), (5,6), (4,5), (1,1), (0,1), (5,7), (1,2), (7,10).
6. `machineText` case `'identity'`: `` `Machine A = ${matText(r.M!)}, pose P = ${matText(r.P!)}. The hole was carved by A twice (A²P). The express machine is kA − mI: set k and m so one pass carves the same hole` ``.
7. `explain` case `'identity'`: with `S = mul(M, M)`:
   `` `A² = ${matText(S)}. Match kA − mI to it: the top-right entry gives ${num(M[0][1])}k = ${num(S[0][1])}, so k = ${k}; then the top-left entry gives ${num(M[0][0])}k − m = ${num(S[0][0])}, so m = ${m}. So A² = ${k}A − ${m}I, that is A² − ${k}A + ${m}I = O.` `` (write `− −2` as `+ 2`: if m is negative, write `A² = ${k}A + ${-m}I` and `A² − ${k}A − ${-m}I = O`.)
8. `missText` and `spotText` work unchanged (they use `outline`).

### A.3 Index changes (`index.ts`)

- Add a fifth entry to `HEROES`: story `` 'The hole in this wall was carved by sending Blocky through machine A twice, so it is A²P. The express machine kA − mI does the job in one pass, if k and m are right. Compute A², then match it entry by entry.' `` and objective `` 'Set k and m so one pass through the express machine fits the hole, in three rounds.' ``.
- Add a fifth `FIRE` label: `'Send Blocky through the express machine'`.
- Add `m: 'Value of m in kA − mI'` to `ARIA`, and make the `k` entry's aria work for both (it already says `Turn or shear`; for level 5 use `Value of k in kA − mI`: pick the aria by kind if `ARIA` is keyed by dial only).
- Clamp the level to 5: `Math.min(5, ctx.level)`.
- Draw the identity round like the `product` round, with the machine panel showing `kA − mI` and the current k and m, and a small inset showing A twice (two stacked machine icons labelled `A` with an arrow) beside the hole to tell the story. Blocky, the hole and the run work as in the other levels.

### A.4 game.json changes

- Append this level:
```json
{
  "title": "Twice through the machine",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: matrix identities. Find k and m with A² = kA − mI by matching entries, as in A² − 5A + 7I = O (Ex 3.2 Q15 to Q18; Misc Q5).",
  "hints": [
    "Work out A² = A·A first, row by column.",
    "Write kA − mI entry by entry: the off-diagonal entries contain only k.",
    "Then a diagonal entry gives m."
  ]
}
```
- Add the concept `"Matrix identities such as A² − 5A + 7I = O"` (6 concepts in all).
- Replace `learningOutcome` with `"The student can match entries of equal matrices, compute a row-by-column product, read a rotation matrix, see that AB and BA differ, and find k and m in A² = kA − mI."` (166 characters).
- `estimatedMinutes`: 25.

### A.5 Tests

- `logic.test.ts`: add level 5 to the existing loops (kinds, assist `[0, 1, 2]`, one winner by scanning both dials over their ranges, the answer is (tr A, det A), the start (0, 0) never wins, `explain` contains `A² −`).
- `tests/hole-in-the-wall-ui.test.ts`: change `arcadeHarness(game, 'hole-in-the-wall', 4)` to 5 and `levels: [1, 2, 3, 4]` to `[1, 2, 3, 4, 5]`; make `setRight`/`setWrong` set both sliders for level 5 (they probably already loop over the dials of the level; check). Add one check that a level 5 win says `A² −`.

## Part B · Mirror Crystal, level 4 "The reversal law" (§3.5.1; Ex 3.3 Q4, Q5; Misc Q1, Q2)

Folder: `src/games/mathematics/class-12/ch03-matrices/mirror-crystal/`, UI test `tests/mirror-crystal-ui.test.ts`.

### B.1 The idea

The vault door reads a crystal made from two others: it wants **(AB)′**, the product of crystals A and B seen in the diagonal mirror. The player sets the four gems of the answer crystal X. The trap is the wrong order: A′B′ is usually different, while B′A′ is the same as (AB)′.

### B.2 Logic changes (`logic.ts`)

1. `Kind` gets `'reverse'`; `KINDS` gets `'reverse'` at the end.
2. `Round` gets optional `RA?: number[][]` and `RB?: number[][]` (the two crystals).
3. `DIALS.reverse = ['x11', 'x12', 'x21', 'x22'].map((k, i) => ({ key: k, label: ['X top left', 'X top right', 'X bottom left', 'X bottom right'][i], min: -20, max: 20, step: 1, start: 0 }))`.
4. Generator for round index i (loop until the conditions hold; about 2 tries on average):
   - Rounds 1 and 2: A, B are 2 × 2 with entries `ri(-3, 4, random)`; round 3 (boss): A is 2 × 3 and B is 3 × 2 with entries `ri(-2, 3, random)`.
   - With C = AB and X = C′: require every entry of C within −20..20, C ≠ C′ (not symmetric, so transposing matters), A′B′ is defined and differs from X (for the boss, A′ is 3 × 2 and B′ is 2 × 3, so A′B′ is 3 × 3: always different, fine), and X has at least two non-zero entries.
   - `ans = { x11: X[0][0], x12: X[0][1], x21: X[1][0], x22: X[1][1] }`.
5. `judge` case reverse: all four dials equal `ans`.
6. `missText` case reverse:
   - If the player's crystal equals A′B′ (2 × 2 rounds only): `` `Your crystal is A′B′, the mirror images multiplied in the same order: the vault stayed shut. A transpose turns a product round.` ``
   - Else if it equals C = AB: `` `Your crystal is AB itself, not its mirror image: the vault stayed shut.` ``
   - Else: the first wrong gem in reading order: `` `The ${['top left', 'top right', 'bottom left', 'bottom right'][i]} gem does not match the vault’s crystal: the vault stayed shut.` ``
7. `spotText` case reverse: `` `Test glow: ${n} of the 4 gems match.` `` (n = count of matching gems).
8. `explain` case reverse: `` `AB = ${mat(C)}, so (AB)′ = ${mat(X)}. Check: B′A′ = ${mat(mul(Bt, At))}, the same, because (AB)′ = B′A′.` `` (use the file's matrix-text helper or `num` for entries).
9. `intel` case reverse: `` `The vault reads (AB)′ with A = ${mat(A)} and B = ${mat(B)}. Set the four gems of X.` ``

### B.3 Index changes (`index.ts`)

- A fourth `HEROES` entry: story `'The vault reads a crystal made from two others: the product AB, seen in the diagonal mirror. Mirror images of a product come in the reverse order: (AB)′ = B′A′, not A′B′.'`, objective `'Set the four gems of the crystal the vault reads, in three rounds.'`
- Clamp to 4 levels: `Math.min(4, ctx.level)`.
- Draw crystals A and B small at the top (as gem grids, A × B with a `×` between), the vault door with `(AB)′` engraved, and the answer crystal X as a 2 × 2 gem grid like level 3's grids, its gems lit by the dials. The helper follows the level's existing pattern: round 1 shows whether each gem matches (green or red rim) live; round 2 only via the test glow (charge); round 3 nothing.

### B.4 game.json changes

- Append:
```json
{
  "title": "The reversal law",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: the transpose of a product reverses the order, (AB)′ = B′A′; build the crystal the vault reads (Ex 3.3 Q4, Q5; Misc Q1, Q2).",
  "hints": [
    "Multiply A by B first, row by column.",
    "Then reflect the result in the diagonal: rows become columns.",
    "Check with B′A′: it gives the same crystal, while A′B′ usually does not."
  ]
}
```
- Add the concept `"Transpose of a product: (AB)′ = B′A′"` (6 concepts).
- Replace `learningOutcome` with `"The student can use A′ = A and A′ = −A to find unknown entries, write a square matrix as a symmetric plus a skew symmetric part, and use (AB)′ = B′A′."` (150 characters).
- `estimatedMinutes`: 20.

### B.5 Tests

- `logic.test.ts`: level 4 over 80 seeds: the conditions in B.2.4 hold; the answer wins; each single-gem change loses; the all-zero start loses; for 2 × 2 rounds A′B′ (as dials) loses and its miss text says `A′B′`; `explain` contains `B′A′`.
- `tests/mirror-crystal-ui.test.ts`: harness level count 3 → 4, `levels: [1, 2, 3]` → `[1, 2, 3, 4]`, and the right and wrong setters handle the four X dials.

## Traps to avoid

- Do not change the rounds of the existing levels (same seeds must give the same rounds).
- Run both games' full test files, not only the new tests.
- Keep the miss texts free of the answer's numbers.
