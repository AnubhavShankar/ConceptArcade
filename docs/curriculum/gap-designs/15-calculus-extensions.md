# 15 · Calculus extensions: Catch Rate level 4, Gear Train level 5, Turf War level 5 (Maths Ch 6, 5, 8)

Read `README.md` in this folder first. This brief **adds one level to each of three existing games**. For each game read its four files and its UI test before changing anything, follow the game's existing patterns (round type, drawing, texts, helpers that fade), and keep the existing levels exactly as they are (same seeds, same rounds). Update each game's UI test harness level count and `levels` list, and its logic tests, as in the earlier extension briefs (09, 11).

## Part A · Catch Rate level 4 "Running costs" (§6.2; Ex 6.1 Q15, Q16, Q18)

Folder `src/games/mathematics/class-12/ch06-application-of-derivatives/catch-rate/`.

**Idea.** The marginal cost C′(x) is the cost of one more unit at output x. If output grows at w units per hour, money flows at C′(x)·w per hour: the chain rule through time, which is what Catch Rate already plays (output rate = (mn/md)·w). The rescue base's supply boat now has a budget: its running cost, its donations or its net funds must change at exactly the target rate. The player sets w.

**Rounds** (new kinds `'cost'`, `'revenue'`, `'profit'`; the derivative mn/md is a whole number here, md = 1):

| Round | kind | the function (shown) | at x | derivative | scene words |
|---|---|---|---|---|---|
| 1 | cost | pick: `C(x) = 2x² + 10x + 500` at x = 5 (30); `C(x) = x² + 40x + 900` at x = 10 (60); `C(x) = 3x² + 5x + 200` at x = 4 (29) | | C′(x) | `The boat has run x km; the fuel cost so far is C(x) rupees.` input `the boat runs at w km per hour`, output `The fuel cost must grow at` (unit `₹`) |
| 2 | revenue | pick: `R(x) = 2x² + 40x + 7` at x = 6 (64); `R(x) = 5x² + 12x` at x = 3 (42); `R(x) = 4x² + 30x` at x = 5 (70) | | R′(x) | `The rescue fund has signed up x volunteers; their pledges total R(x) rupees.` input `volunteers join at w per hour`, output `The fund must grow at` |
| 3 (boss) | profit | pick: `R(x) = 60x − x²` and `C(x) = 2x² + 10x + 100` at x = 4 (26); `R(x) = 80x − 2x²` and `C(x) = x² + 20x + 50` at x = 6 (24) | | R′(x) − C′(x) | `The charity boat earns R(x) and spends C(x) after x trips.` input `it makes w trips per day`, output `Its net funds must grow at` (unit `₹ per day`) |

All derivatives checked numerically. Use the game's existing `make(...)` so the crank speed w is a whole number from 2 to 12 and the target has at most two decimals.

**Words.** `explain`: cost: `` `Marginal cost C′(x) = ${formula} = ${value} at x = ${x}. The cost rate is C′(x)·w, so ${target} = ${value}w and w = ${ans}.` `` (similarly `R′(x)`; profit: `` `Marginal profit = R′(x) − C′(x) = ${r} − ${c} = ${value} at x = ${x}; then ${target} = ${value}w, so w = ${ans}.` ``). Miss and spot texts: the game's existing ones (they describe the output rate the player's w produced).

**Scene.** A rescue harbour at night: a lifeboat on a slipway with a fuel gauge (cost), a donation jar with coins flying in (revenue), or both with a net-funds meter (profit). The "winch" control becomes the boat's throttle or the volunteer queue, with the same slider and handle. Run: the money flows at the player's rate. Too slow: the meter falls short of the target line at the bell. Too fast: it overflows and alarms. The helper fades as in the other levels.

**HEROES** entry 4: story `'Rhea’s rescue base runs on a budget. Marginal cost is the cost of one more unit, C′(x). If units come at w per hour, money flows at C′(x)·w per hour.'`, objective `'Set the rate w so the money flows at exactly the target, in three rounds.'`

**game.json**: append
```json
{
  "title": "Running costs",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: marginal cost C′(x), marginal revenue R′(x) and marginal profit R′ − C′; money flows at C′(x) times the rate w (Ex 6.1 Q15, Q16, Q18).",
  "hints": [
    "Marginal cost is the derivative C′(x), worked out at the given x.",
    "If x grows at w per hour, C changes at C′(x)·w per hour.",
    "Marginal profit is R′(x) − C′(x)."
  ]
}
```
and add the concept `"Marginal cost and marginal revenue"` (6 concepts).

## Part B · Gear Train level 5 "Wobble gears" (§5.3.1; Ex 5.2 Q1 to Q8)

Folder `src/games/mathematics/class-12/ch05-continuity-and-differentiability/gear-train/`.

**Idea.** Level 1 only chains powers of polynomials, but Ex 5.2 Q1 to Q8 chain trigonometric functions: sin(x² + 5), cos(sin x), sin(ax + b). The new level's machines are trigonometric chains at special angles, so the derivative comes out as a clean number.

**Rounds** (new kind `'trig'`, `order: 1`, `unit: ''`, derivative = mn/md):

| Round | pick one machine (y and x₀) | derivative at x₀ |
|---|---|---|
| 1 | `y = sin 3x` at x = π/9 → 3/2; `y = −cos 2x` at x = π/12 → 1; `y = cos 4x` at x = −π/24 → 2 | as listed |
| 2 | `y = sin² x` at x = π/4 → 1; `y = 2 sin(2x + π/6)` at x = π/12 → 2; `y = sin(x/2)` at x = 2π/3 → 1/4 | as listed |
| 3 (boss) | `y = tan 2x` at x = π/8 → 4; `y = tan² x` at x = π/4 → 4; `y = −cos²(3x)` at x = π/12 → 3 | as listed |

All checked numerically (central difference). Store mn/md exactly (3/2 as `mn 3, md 2`; 1/4 as `mn 1, md 4`) and use the game's `make(...)` so w is a whole number and the target has at most two decimals. Each row also has `fn` (for the numerical test) and `x0`.

**Words.** `explain` for trig: `` `Chain rule: ${chain}. At x = ${x0Text}: ${value}. Output rate = ${slope} × w; ${target} = ${slope}w, so w = ${ans}.` `` with per-row `chain` strings:
- sin 3x: `dy/dx = 3 cos 3x, and 3 cos(π/3) = 3/2`
- −cos 2x: `dy/dx = 2 sin 2x, and 2 sin(π/6) = 1`
- cos 4x: `dy/dx = −4 sin 4x, and −4 sin(−π/6) = 2`
- sin² x: `dy/dx = 2 sin x cos x, and 2·(1/√2)·(1/√2) = 1`
- 2 sin(2x + π/6): `dy/dx = 4 cos(2x + π/6), and 4 cos(π/3) = 2`
- sin(x/2): `dy/dx = (1/2) cos(x/2), and (1/2) cos(π/3) = 1/4`
- tan 2x: `dy/dx = 2 sec² 2x, and 2 sec²(π/4) = 4`
- tan² x: `dy/dx = 2 tan x sec² x, and 2·1·2 = 4`
- −cos²(3x): `dy/dx = 6 cos 3x sin 3x, and 6·(1/√2)·(1/√2) = 3`

`intel` shows the machine as `` `y = ${f} at x = ${x0Text}` `` with x₀ in π form (`π/9`, `−π/24`, `2π/3`).

**Scene.** As the other Gear Train levels, with the output gear marked with a wave symbol (∿) to show a trigonometric stage, and the input gear turning a small eccentric cam (a disc with an off-centre pin) to suggest a wave.

**HEROES** entry 5: story `'These machines have wave stages: sines, cosines and tangents of an inner function. The chain rule peels them from the outside in, and the special angles make the slope a clean number.'`, objective `'Set the crank speed so the output gear hits the target rate, in three rounds.'`

**game.json**: append
```json
{
  "title": "Wobble gears",
  "tier": "challenge",
  "kind": "complexity",
  "adds": "Harder: trigonometric chains such as sin 3x, sin² x and tan 2x at special angles; peel the layers from the outside in (Ex 5.2 Q1 to Q8).",
  "hints": [
    "(sin u)′ = cos u · u′, (cos u)′ = −sin u · u′, (tan u)′ = sec² u · u′.",
    "sin² x is (sin x)²: the outer layer is a square.",
    "Put in the special angle at the end: cos(π/3) = 1/2, sec²(π/4) = 2."
  ]
}
```
Add the concept `"Chain rule with trigonometric layers"` (6 concepts). Also correct level 1's `adds` text so it no longer claims Ex 5.2 Q1 to Q8 (they are trigonometric, now in level 5): change `(Ex 5.2 Q1 to Q8)` to `(Ex 5.2; Misc Q1)`, and level 2's `adds` so it no longer claims Ex 5.5 (that is now Dock Drift): remove `; Ex 5.5`. Check every changed `adds` is at most 160 characters.

## Part C · Turf War level 5 "Sideways turf" (§8.2, area with respect to y; Ex 8.1 Q4)

Folder `src/games/mathematics/class-12/ch08-application-of-integrals/turf-war/`.

**Idea.** The summary of Chapter 8 also gives the area between a curve x = g(y), the y-axis and the lines y = c and y = d, which is ∫ g(y) dy. The turf now lies between the y-axis and a curve x = g(y), from y = 0 up to the top edge y = v. Inky rolls horizontal strips from the bottom up, and the player drags the top edge to the whole number v that gives exactly the target area.

**Rounds** (new kind `'sideways'`; v from 1 to 6, start 1 unless the answer is 1, then 6; the area is monotone in v because g > 0, so exactly one v wins):

| Round | pick one curve and target (the winning v in brackets) |
|---|---|
| 1 | `x = 3y²`, area v³: target 27 (3) or 64 (4); `x = y + 1`, area v²/2 + v: target 12 (4) or 7.5 (3); `x = 4y³`, area v⁴: target 16 (2) or 81 (3) |
| 2 | `x = y²/4`, area v³/12: target 9/4 (3, Ex 8.1 Q4); `x = 6y − y²`, area 3v² − v³/3: target 18 (3) |
| 3 (boss) | `x = 2√y`, area (4/3)v^(3/2): target 32/3 (4); `x = y² − 4y + 5`, area v³/3 − 2v² + 5v: target 6 (3) |

Each row stores `g`, `area(v)` and the target as text (`9/4`, `32/3`, `7.5` written `15/2`). Checked: Simpson's rule on g from 0 to 3 matches `area(3)` for every curve, and the areas are strictly increasing in v.

**Words.** `explain`: `` `Area = ∫₀^v g(y) dy = ${antiderivative} from 0 to v = ${areaText(v)}. Setting it equal to ${target} gives v = ${ans}.` `` with per-row antiderivative text (`y³`, `y²/2 + y`, `y⁴`, `y³/12`, `3y² − y³/3`, `(4/3)y^(3/2)`, `y³/3 − 2y² + 5y`). Miss texts follow the level's existing too-little or too-much paint wording, without the area value.

**Scene.** The existing turf drawing turned on its side: the y-axis is the left wall, the curve x = g(y) bounds the turf on the right, and the horizontal top edge y = v is the drag handle (vertical drag). Inky rolls horizontal strips from y = 0 upward. The picture is not to scale and has no grid numbers, as in the other levels.

**HEROES** entry 5: story `'This turf lies between the left wall (the y-axis) and a curve x = g(y). Each horizontal strip has length g(y) and height dy, so the area is ∫ g(y) dy from the bottom to the top edge.'`, objective `'Drag the top edge so the turf gets exactly the paint it needs, in three rounds.'`

**game.json**: append
```json
{
  "title": "Sideways turf",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: area between x = g(y), the y-axis and y = c, y = d is ∫ g(y) dy; drag the top edge (Ex 8.1 Q4).",
  "hints": [
    "Take horizontal strips: each has length x = g(y).",
    "Area = ∫₀^v g(y) dy.",
    "Set the area equal to the target and solve for v."
  ]
}
```
Check whether the game already has 6 concepts; if it has 5, add `"Area with respect to y: ∫ x dy"`.

## Part D · Turf War level 6 "Round turf" (§7.6.2, ∫ √(a² − x²) dx; Ex 7.7 Q1, Q2; Ex 8.1 Q3)

Same folder as Part C; build Part C first, then this level.

**Idea.** Ex 7.7 integrates √(a² − x²): ∫ √(a² − x²) dx = (x/2)√(a² − x²) + (a²/2) sin⁻¹(x/a) + C. The turf is the region under the arc of the circle x² + y² = a² from x = 0 to the right edge x = q. The player drags the right edge to the whole number q that paints exactly the target area. The area grows with q, so exactly one q wins (checked for every row).

**Rounds** (new kind `'round'`; the dial q runs 1 to 10 in every round, start 1, and q > a is an invalid input that gives a free note, so the answer is never at the end of the dial). Review fix 2026-10-30: the first build had quarter circles only in round 1 and halves only later, so position alone won; the pools are now mixed:

| Round | pick one (a, winning q, target text) |
|---|---|
| 1 | (4, 4, `4π`); (6, 6, `9π`); (4, 2, `2√3 + 4π/3`) |
| 2 | (6, 3, `9√3/2 + 3π`); (8, 8, `16π`); (4, 2, `2√3 + 4π/3`) |
| 3 (boss) | (8, 4, `8√3 + 16π/3`); (10, 5, `25√3/2 + 25π/3`); (10, 10, `25π`) |

`area(q) = (q/2)√(a² − q²) + (a²/2)·asin(q/a)`; checked by Simpson's rule and by scanning q (one winner).

**Words.** `explain`: `` `∫₀^q √(a² − x²) dx = [(x/2)√(a² − x²) + (a²/2) sin⁻¹(x/a)] from 0 to q. With q = ${q}: ${q/2}·√${a * a - q * q} + ${a * a / 2}·${angle} = ${target}.` `` with angle `π/2` (q = a) or `π/6` (q = a/2). Misses use the level's too-little or too-much wording, without values.

**Scene.** The turf under a quarter-circle arc (a glowing circular fence), with the right edge x = q as the handle. Not to scale, no grid numbers.

**HEROES** entry 6: story `'This turf sits under a round fence, the circle x² + y² = a². Its area from the centre line to the edge x = q is ∫ √(a² − x²) dx, a standard integral with a sin⁻¹ in it.'`, objective `'Drag the edge so the round turf gets exactly the paint it needs, in three rounds.'`

**game.json**: append
```json
{
  "title": "Round turf",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: ∫ √(a² − x²) dx = (x/2)√(a² − x²) + (a²/2) sin⁻¹(x/a); the turf is part of a circle (Ex 7.7 Q1, Q2; Ex 8.1 Q3).",
  "hints": [
    "The fence is y = √(a² − x²), a quarter of the circle of radius a.",
    "Use ∫ √(a² − x²) dx = (x/2)√(a² − x²) + (a²/2) sin⁻¹(x/a).",
    "sin⁻¹(1/2) = π/6 and sin⁻¹ 1 = π/2."
  ]
}
```

## Tests (all four parts)

- Logic tests: the new level's rounds over 80 seeds; the numbers in the tables (recompute derivatives and areas numerically); one winner by scanning the dial; the start never wins; no miss text contains the answer.
- UI tests: harness level count and `levels` extended; the new level plays through `shellTests`.
