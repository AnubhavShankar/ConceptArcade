# 13 · Rover Ridge levels 4 and 5: unbounded, empty and tied regions (Maths Ch 12, §12.2.2; Ex 12.1 Q4, Q6 to Q10)

Read `README.md` in this folder first. This brief **adds two levels to Rover Ridge**. Read the game's files (`src/games/mathematics/class-12/ch12-linear-programming/rover-ridge/`) and `tests/rover-ridge-ui.test.ts` first, and keep levels 1 to 3 exactly as they are (same seeds, same rounds).

## 1. The idea

Rover slides the ore ruler Z = ax + by across the plateau and parks it where the plateau only just touches it. Two new situations from the textbook:
- **Level 4, "Open plains"**: the plateau runs off the map (an unbounded region). A **minimum** can still exist at a corner, but a **maximum** may not: the ore grows forever. And some constraints have **no common ground at all** (an empty region). The player either parks the ruler at the best Z, or declares "No maximum" or "No plateau".
- **Level 5, "Level ridge"**: the ruler can lie flat along a whole edge, so every point of that edge is best (Ex 12.1 Q6, "the minimum occurs at more than two points"). The player parks the ruler at the best Z **and** says whether the best is at **one corner** or along **a whole edge**.

## 2. Logic changes (`logic.ts`)

1. `Round` gets optional fields: `kind?: 'value' | 'nomax' | 'empty'` (level 4), `open?: boolean` (unbounded), `draw?: Pt[]` (the visible part of the region inside the 0..12 window, for drawing), `edge?: boolean` (level 5: the best is along an edge), `bestAt?: Pt[]` (all best corners).
2. Level 4 and 5 rounds come from fixed pools (below), one `pick` per round, then `assist: aid(i)`. `min` and `max` of the dial: level 4 `0..40`, level 5 `0..20`; `start`: 0 unless the answer is 0, then 1.
3. **Regions** (copy exactly):

```ts
const U1 = { constraints: ['x + y ≥ 4', 'x + 3y ≥ 6', 'x ≥ 0', 'y ≥ 0'], corners: [[0, 4], [3, 1], [6, 0]] as Pt[], draw: [[0, 4], [3, 1], [6, 0], [12, 0], [12, 12], [0, 12]] as Pt[] };
const U2 = { constraints: ['2x + y ≥ 6', 'x + 2y ≥ 6', 'x ≥ 0', 'y ≥ 0'], corners: [[0, 6], [2, 2], [6, 0]] as Pt[], draw: [[0, 6], [2, 2], [6, 0], [12, 0], [12, 12], [0, 12]] as Pt[] };
const U3 = { constraints: ['x + y ≥ 5', '3x + y ≥ 9', 'x ≥ 0', 'y ≥ 0'], corners: [[0, 9], [2, 3], [5, 0]] as Pt[], draw: [[0, 9], [2, 3], [5, 0], [12, 0], [12, 12], [0, 12]] as Pt[] };
const U4 = { constraints: ['x + 2y ≥ 8', '3x + 2y ≥ 12', 'x ≥ 0', 'y ≥ 0'], corners: [[0, 6], [2, 3], [8, 0]] as Pt[], draw: [[0, 6], [2, 3], [8, 0], [12, 0], [12, 12], [0, 12]] as Pt[] };
const E1 = { constraints: ['x + y ≤ 2', 'x + y ≥ 5', 'x ≥ 0', 'y ≥ 0'] };
const E2 = { constraints: ['x − y ≤ −1', '−x + y ≤ 0', 'x ≥ 0', 'y ≥ 0'] };   // Ex 12.1 Q10
const B1 = { corners: [[0, 0], [6, 0], [4, 4], [0, 6]] as Pt[] };            // bounded: y ≥ 0, 2x + y ≤ 12, x + 2y ≤ 12, x ≥ 0
const B2 = { corners: [[0, 0], [5, 0], [5, 2], [2, 5], [0, 5]] as Pt[] };    // bounded: y ≥ 0, x ≤ 5, x + y ≤ 7, y ≤ 5, x ≥ 0
const T3 = { constraints: ['x + 2y ≥ 6', '2x + y ≥ 3', 'x ≥ 0', 'y ≥ 0'], corners: [[0, 3], [6, 0]] as Pt[], draw: [[0, 3], [6, 0], [12, 0], [12, 12], [0, 12]] as Pt[] };  // Ex 12.1 Q6
```

   For B1 and B2 build the constraint texts with the existing `edgeText` from the corners, as levels 1 to 3 do.
4. **Level 4 pools** (`[region, a, b, goal, kind, answer]`; `answer` is the best Z for `value` rounds and `null` otherwise):

```ts
const L4: [any[][], any[][], any[][]] = [
  [[U1, 2, 3, 'min', 'value', 9], [U2, 1, 1, 'min', 'value', 4], [U3, 2, 1, 'min', 'value', 7], [U4, 1, 1, 'min', 'value', 5]],
  [[U1, 1, 2, 'min', 'value', 5], [U2, 3, 2, 'min', 'value', 10], [U4, 2, 3, 'min', 'value', 13], [U1, 2, 3, 'max', 'nomax', null], [U3, 1, 1, 'max', 'nomax', null], [B1, 1, 1, 'max', 'value', 8], [B2, 2, 1, 'max', 'value', 12], [E1, 1, 1, 'min', 'empty', null]],
  [[U2, 3, 4, 'max', 'nomax', null], [U4, 1, 3, 'max', 'nomax', null], [E1, 1, 1, 'max', 'empty', null], [E2, 1, 1, 'max', 'empty', null], [U3, 4, 3, 'min', 'value', 17], [U4, 3, 1, 'min', 'value', 6], [B2, 1, 2, 'max', 'value', 12], [E2, 1, 1, 'min', 'empty', null]],
];
```

   Review fix (2026-10-30): both goals now appear with every kind of round, so the goal alone never tells the round type; bounded B1 and B2 rows use the bounded ruler states. B1 x + y gives 8 only at (4, 4), B2 2x + y gives 12 only at (5, 2), B2 x + 2y gives 12 only at (2, 5), U4 3x + y gives 6 only at (0, 6). The declare button reads `No minimum` on min rounds.

   Checked: every `value` answer is the unique smallest corner value, and a grid search over the region (step 0.25 up to 40) finds no smaller Z. Every `nomax` objective has positive a and b on a region that runs to infinity. The `empty` constraints have no common point.
5. **Level 5 pools** (`[region, a, b, goal, answer, edge]`):

```ts
const L5: [any[][], any[][], any[][]] = [
  [[B1, 2, 1, 'max', 12, true], [B2, 1, 1, 'max', 7, true], [B1, 1, 1, 'max', 8, false], [B2, 2, 1, 'max', 12, false]],
  [[B1, 1, 1, 'max', 8, false], [B2, 2, 1, 'max', 12, false], [B1, 2, 1, 'max', 12, true], [B2, 1, 1, 'max', 7, true]],
  [[T3, 1, 2, 'min', 6, true], [U1, 2, 3, 'min', 9, false]],
];
```

   Checked: B1 with 2x + y gives 12 at (6, 0) and (4, 4) (an edge); B2 with x + y gives 7 at (5, 2) and (2, 5); T3 with x + 2y gives 6 at (0, 3) and (6, 0) (the whole edge x + 2y = 6, Ex 12.1 Q6). B1 with x + y gives 8 only at (4, 4); B2 with 2x + y gives 12 only at (5, 2); U1 with 2x + 3y gives 9 only at (3, 1).
6. **Judging**:
   - Level 4: the attempt is `{ action: 'park', z } | { action: 'nomax' } | { action: 'empty' }`. A `value` round wins only with `park` at the answer; a `nomax` round only with `nomax`; an `empty` round only with `empty`.
   - Level 5: the attempt is `{ z, shape: 'corner' | 'edge' }`; it wins when z is the answer and `shape` matches `edge`.
7. **Ruler states** for open regions: `ruler(r, z)` is `misses` below the smallest corner value (for positive a, b), `touches` at it, and `cuts` above it (the region goes on forever, so the ruler never stops cutting). For empty regions every z `misses`.
8. **Words** (keep the existing style; never reveal the answer):
   - `intel` level 4: `` `The plateau is ${constraints.join(', ')}. Ore is Z = ${zText}. Park the ruler at the ${goal === 'max' ? 'largest' : 'smallest'} Z, or declare that there is no ${goal === 'max' ? 'maximum' : 'minimum'} or no plateau at all.` ``
   - `missText` level 4:
     - parked on a `nomax` round: `` `Rover parked at Z = ${z}, but past it the ruler still cuts the plateau, which runs off the map: there is always richer ground. Rover drove on and never found an end.` ``
     - parked on an `empty` round: `` `Rover tried to park at Z = ${z}, but there was no ground: no point meets every constraint at once.` ``
     - parked at the wrong value on a `value` round: the existing missText for cuts, touches or misses.
     - declared `nomax` on a `value` round (goal min): `` `The plateau does run off the map, but this is a search for the least ore, and there is a least value here: Rover had somewhere to park.` ``
     - declared `nomax` on an `empty` round: `` `There is no plateau at all, so there is nothing to grow forever: no point meets every constraint.` ``
     - declared `empty` on a round with a region: `` `There is a plateau: the constraints do meet, for example at ${pt(r.corners[0])}.` `` (a corner is not the answer).
   - `intel` level 5: the existing intel plus `` ` Then say whether the best is at one corner or along a whole edge.` ``
   - `missText` level 5: value wrong: the existing missText. Value right, shape wrong: `edge` but the player said corner: `` `Z = ${z} is right, but the ruler lies flat along a whole edge: every point between ${pt(bestAt[0])} and ${pt(bestAt[1])} is just as good, and Rover parked at one end only.` `` (the edge's ends are shown only once the value is already right); corner but the player said edge: `` `Z = ${z} is right, but only one corner reaches it: the ruler touches the plateau at a single point.` ``
   - `explain`: the existing corner list, plus for `nomax`: `` `The region runs off to infinity with a and b positive, so Z can be as large as you like: there is no maximum.` ``; for `empty`: `` `${c1} and ${c2} cannot both hold, so the feasible region is empty and there is no optimal value.` `` (name the two clashing constraints: E1 is `x + y ≤ 2` and `x + y ≥ 5`; E2 is `x − y ≤ −1` and `−x + y ≤ 0`); for an edge: `` `The best Z is reached at ${pt(a)} and ${pt(b)}, so at every point of the edge between them.` ``

## 3. Index changes (`index.ts`)

- `HEROES` entries 4 and 5:
  - Level 4: story `'Out on the open plains the plateau runs off the edge of the map. The least ore can still be at a corner, but the most may never end. And sometimes the cliffs leave no ground at all.'`, objective `'Park at the best Z, or declare no maximum or no plateau, in three rounds.'`
  - Level 5: story `'Some ridges are level: the ore ruler lies flat along a whole edge of the plateau, so every point on that edge is just as rich.'`, objective `'Park at the best Z and say whether it is one corner or a whole edge, in three rounds.'`
- Clamp to 5 levels.
- Level 4 controls: the existing ruler dial and **Park**, plus two buttons: `🚫 No maximum` (aria `Declare: there is no maximum`) and `⛔ No plateau` (aria `Declare: there is no feasible region`). Both resolve the round like Park. Level 4 needs its own small mount on `createArcade` (like Fog Rally's strip in brief 01), or a `DialLevel` with extra buttons if the existing code allows it. Choose the simpler path, but every button must lock during a run.
- Level 5 controls: the ruler dial, a toggle button `Best at: one corner` / `Best at: a whole edge` (aria `Toggle: best at one corner or along a whole edge`, `data-shape` = `corner|edge`), and Park.
- Drawing: unbounded regions use `draw` (the visible part), with small arrows at the open edges and a label `runs on` to show the plateau continues. Empty regions draw each constraint's allowed side as a separate tinted half-plane with no overlap. For `nomax` and `empty` rounds the run shows Rover driving off the map (`nomax`) or hovering with nowhere to land (`empty`) **only after** the verdict. Before it, nothing distinguishes the round types except the constraints and the goal.
- Helpers fade as in the existing levels (live ruler state in round 1, a probe charge in round 2, nothing in round 3).

## 4. game.json changes

Append:

```json
{
  "title": "Open plains",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: the plateau runs off the map. A minimum can still exist; a maximum may not, and some constraints have no common ground at all (Ex 12.1 Q4, Q9, Q10).",
  "hints": [
    "Find the corners, then ask whether the region is closed or runs on forever.",
    "For a maximum on an open region with a, b positive, Z can grow without end.",
    "If two constraints cannot both hold, there is no feasible region."
  ]
},
{
  "title": "Level ridge",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: when the ruler lies along an edge, every point of that edge is best; say so as well as the value (Ex 12.1 Q6 to Q8).",
  "hints": [
    "Work out Z at every corner.",
    "If two neighbouring corners tie for the best, the whole edge between them is best.",
    "The edge is parallel to the ruler: their slopes match."
  ]
}
```

Replace the concept `"Objective function Z = ax + by"` with `"Unbounded and empty feasible regions"`, and add `"Ties: the best Z along a whole edge"` (6 concepts). Replace `learningOutcome` with `"The student can find the best Z at the corners of a feasible region, spot when there is no maximum or no feasible region, and see when a whole edge is optimal."` (159 characters). `estimatedMinutes`: add 8.

## 5. Tests

- `logic.test.ts`: levels 4 and 5 over 80 seeds: every pool row's facts in 2.4 and 2.5 hold (recompute the corner values); for `value` rounds only `park` at the answer wins (scan the dial) and both declares lose; for `nomax` and `empty` rounds every park loses and only the right declare wins; in level 5 only (answer, right shape) wins; the miss texts never contain the answer value except the level 5 "value right, shape wrong" texts.
- `tests/rover-ridge-ui.test.ts`: harness level count 3 → 5; extend `levels` to `[1, 2, 3, 4, 5]` with setters that press the right declare button or toggle; add checks that a declare on a `value` round costs a heart and that the toggle's `data-shape` changes.

## 6. Traps to avoid

- Do not let the region's drawing reveal the round type before the verdict beyond what the constraints themselves show.
- The level 5 edge ends are named only after the value is right.
- Keep levels 1 to 3 unchanged.
