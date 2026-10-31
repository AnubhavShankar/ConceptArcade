# 10 · Stage Lift level 5 "Rule cards" (Maths Ch 3, §3.2 and 3.3; Ex 3.1 Q4, Q5)

Read `README.md` in this folder first. This brief **adds one level to Stage Lift** (brief 02, already built). Read the game's files (`src/games/mathematics/class-12/ch03-matrices/stage-lift/`) and `tests/stage-lift-ui.test.ts` first, and keep levels 1 to 4 exactly as they are (same seeds must give the same rounds).

## 1. The idea

The choreographer is in a hurry: Kiko's card arrives as a **rule** instead of numbers, such as cᵢⱼ = |i − 3j| for i = 1, 2 and j = 1, 2, 3. The stage has no base program this time. The player sets program Y on the six faders so that each pillar (i, j) stands at cᵢⱼ. This is Ex 3.1 Q4 and Q5: construct a matrix from a rule for its entries, and know that i counts rows and j counts columns. The trap is swapping i and j.

## 2. Logic changes (`logic.ts`)

1. Add the kind `'rule'` to `Kind`. Level 5's three rounds are all `'rule'`, 2 × 3, keys `y11 y12 y13 y21 y22 y23` (six faders, −9..9, start 0).
2. `Round` gets an optional `rule?: string` (the rule as text).
3. The pools (copy exactly):

```ts
interface Rule { text: string; f: (i: number, j: number) => number; calc: (i: number, j: number) => string }
const RULES: [Rule[], Rule[], Rule[]] = [
  [
    { text: 'i + 2j', f: (i, j) => i + 2 * j, calc: (i, j) => `${i} + 2·${j}` },
    { text: '2i − j', f: (i, j) => 2 * i - j, calc: (i, j) => `2·${i} − ${j}` },
    { text: 'ij', f: (i, j) => i * j, calc: (i, j) => `${i}·${j}` },
  ],
  [
    { text: '|i − 3j|', f: (i, j) => Math.abs(i - 3 * j), calc: (i, j) => `|${i} − ${3 * j}|` },
    { text: '(i − j)²', f: (i, j) => (i - j) ** 2, calc: (i, j) => `(${i} − ${j})²` },
    { text: '3i − 2j', f: (i, j) => 3 * i - 2 * j, calc: (i, j) => `${3 * i} − ${2 * j}` },
  ],
  [
    { text: '(−1)^(i + j)·(i + j)', f: (i, j) => (-1) ** (i + j) * (i + j), calc: (i, j) => `(−1)^${i + j}·${i + j}` },
    { text: '|2i − 3j| − 1', f: (i, j) => Math.abs(2 * i - 3 * j) - 1, calc: (i, j) => `|${2 * i} − ${3 * j}| − 1` },
    { text: 'i² − j²', f: (i, j) => i * i - j * j, calc: (i, j) => `${i * i} − ${j * j}` },
  ],
];
```

   The resulting cards (rows i = 1, 2; columns j = 1, 2, 3) are, in order: `[[3,5,7],[4,6,8]]`, `[[1,0,−1],[3,2,1]]`, `[[1,2,3],[2,4,6]]`; `[[2,5,8],[1,4,7]]`, `[[0,1,4],[1,0,1]]`, `[[1,−1,−3],[4,2,0]]`; `[[2,−3,4],[−3,4,−5]]`, `[[0,3,6],[0,1,4]]`, `[[0,−3,−8],[3,0,−5]]`. All entries lie in −8..14 and none is all zero (checked).
4. The round: `{ kind: 'rule', rows: 2, cols: 3, keys, ans: entries of C, known: {}, card: C, rule: rule.text, assist: aid(k) }`, picking round k's rule from `RULES[k]` with `pick(…, random)`.
5. `heights` case `'rule'`: Kiko's heights are Y itself (`fromDials('y', 3, v)`).
6. `intel` case `'rule'`: `` `The card is a rule: cᵢⱼ = ${rule} for rows i = 1, 2 and columns j = 1, 2, 3. There is no base program: set program Y so each pillar (i, j) stands at cᵢⱼ.` ``
7. `explain` case `'rule'`: `` `Row i, column j: ${items}.` `` with items `` `c${sub(i)}${sub(j)} = ${calc(i, j)} = ${num(c)}` `` for all six entries, joined by `, ` (e.g. `c₁₂ = |1 − 6| = 5`).
8. `missText`, `testText`, `firstFault` and the run work unchanged. Add one extra miss line when the player's Y is the card with i and j swapped in the sense yᵢⱼ = f(j, i) for the entries where that is defined (j ≤ 2): if every one of the four entries y11, y12, y21, y22 equals f(j, i) and at least one differs from the card, append `` ` Check the rule: i counts rows and j counts columns.` `` to the miss text.

## 3. Index changes (`index.ts`)

- A fifth `HEROES` entry: story `'The choreographer sent the card as a rule for its entries, cᵢⱼ, where i is the row (back row 1, front row 2) and j the column. There is no base program this time: the pillars stand at program Y.'`, objective `'Build program Y from the rule so Kiko lands every jump, in three rounds.'`
- Clamp the level to 5.
- The equation band for `'rule'` shows `Y = [ yᵢⱼ ]` with the faders' current values, and the card as the rule text in a pink box: `card: cᵢⱼ = ${rule}`, with small `i = 1, 2` and `j = 1, 2, 3` labels. It must **not** show the card's numbers (that is the work).
- Everything else (pillars, ghosts in round 1 only, test lift, run, crowd) as in level 2 (also 2 × 3).

## 4. game.json changes

Append this level:

```json
{
  "title": "Rule cards",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: the card is a rule for its entries, such as cᵢⱼ = |i − 3j|; build the matrix entry by entry, with i for rows and j for columns (Ex 3.1 Q4, Q5).",
  "hints": [
    "i is the row number and j the column number.",
    "Work out c₁₁, c₁₂, c₁₃ for the back row, then c₂₁, c₂₂, c₂₃ for the front row.",
    "Watch the signs: (−1)^(i + j) is +1 when i + j is even."
  ]
}
```

Keep `concepts` at 6 (replace `"Subtracting matrices"` with `"Building a matrix from a rule for aᵢⱼ"`, and rename `"Adding matrices entry by entry"` to `"Adding and subtracting matrices entry by entry"` so level 1’s subtraction round keeps a tag), and set `estimatedMinutes` to 24. Run `npm run validate` to confirm the limits.

## 5. Tests

- `logic.test.ts`: level 5 over 80 seeds: kinds `rule`; cards equal the table in 2.3; one winner per fader (scan −9..9 with the others at the answer); the all-zero start loses; `explain` contains every entry; the swapped-index miss line appears for the swapped setting of a round whose rule is not symmetric in i and j.
- `tests/stage-lift-ui.test.ts`: harness level count 4 → 5, `levels: [1, 2, 3, 4]` → `[1, 2, 3, 4, 5]`; level 5 has 6 sliders.
- Check that in level 5 the canvas text never contains the card's numbers in rounds 2 and 3 before Showtime (record `fillText` calls as `tests/air-time-ui.test.ts` does).

## 6. Not designed (and why)

The audit also listed "matrices as data" (Ex 3.2 Q19, Q20; Misc Q7) and "when a product is defined, and the order of the result" (Ex 3.2 Q21, Q22, multiple choice). Both are word-problem or multiple-choice checks of the same row-by-column product that Hole in the Wall level 2 plays, and Vault Tumblers level 3 already turns a word problem into matrices. No game loop was found that would make them more than a quiz, so they are left out on purpose.

- **Review fix (2026-10-30):** in this level the card numbers are hidden, so on a "too low" miss the runner must not land at the true card height. `index.ts` aims a short jump one unit above the player's own pillar for `rule` rounds.
