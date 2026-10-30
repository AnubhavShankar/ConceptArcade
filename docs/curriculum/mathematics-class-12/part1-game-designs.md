# Class 12 Mathematics, Part 1: concept weights and game designs

NCERT Mathematics Class XII Part 1, reprint 2026-27 (`../Maths/lemh1dd/lemh101.pdf` to `lemh106.pdf`, outside the repo; topics and exercise numbers only, no NCERT text or figures). The method is the same as `docs/curriculum/physics-class-12/ch01-concept-weights.md`.

**Weight:** `score = 2 × (exercise questions + worked examples that test it) + board tier`, with tiers A = 6, B = 3, C = 1. The tier is judgement, not measured from papers. A question counts once even when it has parts.

**Design rule:** every game follows AGENTS.md section 5, items 13 to 16:
- a hero with an objective that only the concept can reach;
- the arcade engine (3 rounds, 3 hearts, charges, helpers that fade, BOSS round);
- direct manipulation: dials and drag handles, never the workshop, shop or order style;
- one famous game's loop per game;
- exactly one setting wins each round;
- misses show the effect of the choice, never the answer.

In maths the picture must never give the answer away. When a scene could be measured by eye (an angle, a length), draw it *not to scale*, with the numbers on labels. Rooftop Ranger does this.

## Build status

| Ch | Game | Status |
|---|---|---|
| 2 | Rooftop Ranger | built (4 levels), pilot for the maths style |
| 6 | Max Out | built (4 levels: box, can and tank, fit inside, rescue line) |
| 5 | Gear Train | built (4 levels: chain, exp and log, implicit and parametric, second derivative) |
| 3 | Hole in the Wall | built (4 levels: equal entries, A·P, rotation, order of two machines) |
| 4 | Vault Tumblers | built (4 levels: 2×2, 3×3, shopping bills, jammed vault) |
| 1 | Portal Line | built (3 levels: one-one fences, onto fences, counting maps) |
| 5 | Track Joiner | built (3 levels: close a gap, two joins, no corners) |
| 6 | Catch Rate | built (3 levels: sizes, ladder, similar triangles) |
| 1 | Room Keeper | built (3 levels: repair chart, modulus, count plans) |
| 6 | Ridge Runner | built (3 levels: hilltop or valley, flat-spot trap, highest on the walk) |
| 2 | Relay Tower | built (3 levels: back into the branch, adding angles, substitution) |
| 3 | Mirror Crystal | built (3 levels: symmetric, skew, split P + Q) |
| 4 | Field Claim | built (3 levels: deed area, straight rope, line through beacons) |

---

## Chapter 1: Relations and Functions

35 exercise questions (Ex 1.1: 16, Ex 1.2: 12, Misc: 7) and 26 examples. Section 1.4 (composition, inverse) keeps Examples 15 to 17 but has no exercise. Binary operations are gone from this edition.

| ID | Concept | § | Score |
|---|---|---|---|
| R1 | One-one test (equal outputs force equal inputs, or a colliding pair) | 1.3 | 48 |
| R2 | Onto test (solve for x, check it is in the domain) | 1.3 | 44 |
| R3 | Equivalence relation (prove R, S, T) | 1.2 | 40 |
| R4 | Classify reflexive, symmetric, transitive with counter-examples | 1.2 | 32 |
| R5 | Bijective | 1.3 | 26 |
| R6 | Equivalence classes and partitions | 1.2 | 22 |
| R7 | Count relations on {1,2,3} with given pairs and properties (Misc Q6, Q7) | Misc | 11 |
| R8 | One-one or onto depends on the domain and co-domain (x² on N, Z, R) | 1.3 | 11 |
| R9 | Finite X to X: one-one if and only if onto; n! such maps | 1.3 | 11 |
| R10, R16 | Composition gof vs fog; inverse of a bijection | 1.4 | 7, 3 |

### Game 1.1: Portal Line (R1, R2, R5, R8, R9), Lemmings plus Portal

- **Hero:** Pip and a crowd of numbered travellers. Each traveller x walks into the portal machine f and comes out at door f(x).
- **Objective:** every door gets exactly one traveller, so the return portal (the inverse) can be switched on.
- **Mechanic:** the player drags two fences:
  - the **domain fence**, on the input number line, sets who may enter;
  - the **co-domain fence**, on the door wall, sets which doors exist.

  Then they press Run.
- **Consequences:**
  - Two travellers who land on one door collide and fall over (the function is not one-one).
  - An empty door flashes (not onto).
  - Charges buy single test walkers.
- **Levels:**
  1. **Arrows on small finite sets:** find the collision with the fewest test walkers (Ex 1.2 Q4, Q6).
  2. **Fence the domain:** make x², |x| and the floor function one-one (Ex 1.2 Q2, Q3).
  3. **Fence the co-domain to the range** so the map is onto: x/(1+|x|) only reaches (−1, 1), and (x−2)/(x−3) never gives 1 (Ex 1.2 Q5, Q9; Examples 9 to 12).
  4. **Boss, n doors and n travellers:** one-one forces onto. The player counts the n! arrangements that light every door (Misc Q4; Examples 13, 14).

  This game sets up Chapter 2, where the domain of each trig function is fenced to get its inverse.

### Game 1.2: Room Keeper (R3, R4, R6, R7, R12), Professor Layton plus Flow Free

- **Hero:** Keeper, the robot butler of a mansion. The rule "x and y belong together" (same remainder mod 4, same distance from the origin, similar triangles) decides who shares a room.
- **Objective:** seat every guest so the rule holds and no room breaks it.
- **Mechanic:**
  - Draw links between guests on a small graph (drag from one node to another).
  - Drag guests into rooms.
  - A charge tests one pair.
- **Levels:**
  1. **Break the claim:** find the one link or chain a→b→c that breaks reflexive, symmetric or transitive (Ex 1.1 Q1 to Q6).
  2. **Seat the guests in classes** (mod 3 and mod 4 classes, parity), checked when the doors close (Ex 1.1 Q8, Q11 to Q14; Example 6).
  3. **Add the fewest links** that make a relation an equivalence, which is its closure (Misc Q7; Example 24).
  4. **Boss:** build a relation that is reflexive and symmetric but not transitive, with the fewest pairs (Ex 1.1 Q10; Misc Q6).

## Chapter 2: Inverse Trigonometric Functions

24 exercise questions (Ex 2.1: 14, Ex 2.2: 15, Misc: 14; some are multiple choice) and 6 examples. The properties section keeps only sin⁻¹(sin x) = x on the branch plus simplification by substitution; most sum and difference formulas are gone, but Misc Q3 to Q7 still compose angles of Pythagorean triangles.

| ID | Concept | § | Score (approx.) |
|---|---|---|---|
| T1 | Principal value of each inverse function, with its branch and sign (Ex 2.1 Q1 to Q12) | 2.2 | ~34 |
| T2 | Reduce sin⁻¹(sin x), cos⁻¹(cos x), tan⁻¹(tan x) into the branch (Ex 2.2 Q10, Q11, Q13, Q14; Misc Q1, Q2; Example 6) | 2.3 | ~20 |
| T3 | Simplest form by substitution x = sin θ, tan θ, a sec θ (Ex 2.2 Q3 to Q7; Examples 3 to 5) | 2.3 | ~18 |
| T4 | Angles of right triangles composed: sin⁻¹(8/17) + sin⁻¹(3/5) = tan⁻¹(77/36) (Misc Q3 to Q7; Ex 2.2 Q12) | Misc | ~16 |
| T5 | Domain and range tables; sin⁻¹ x is not (sin x)⁻¹ (Ex 2.1 Q13, Q14) | 2.2 | ~9 |

### Game 2.1: Rooftop Ranger (T1, T5), Hitman Sniper plus Angry Birds. BUILT.

- **Hero:** Hawk, a rooftop ranger who stuns runaway robots at night.
- **Mechanic:**
  - The scope's tilt dial physically swings only through the principal branch (−π/2 to π/2). The turret dial in level 4 swings through 0 to π.
  - The dials snap to π/12, and exactly one step hits.
  - The picture is not to scale, so the angle cannot be measured off the screen.
  - The laser sight is live in round 1. A spotter call costs a charge in round 2. Round 3 is the boss, with neither.
  - A miss says where the shot went: short, over, above, below, east or west.
- **Levels:**
  1. **Down the street:** tan⁻¹(−h/d) with ratios 1/√3, 1 and √3 (Ex 2.1 Q4, Q6, Q8).
  2. **Range turret:** the straight-line distance by **Pythagoras**, r = √(h² + d²), plus the tilt. This is the owner's example.
  3. **Drones and ledges:** sin⁻¹ with sign (Ex 2.1 Q1, Q13).
  4. **The wall turret:** cos⁻¹ in [0, π], so a robot to the west needs an obtuse bearing (Ex 2.1 Q2, Q5, Q9).

### Game 2.2: Relay Tower (T2, T4, T3), Portal laser relays plus Zelda mirrors

- **Hero:** Beam, a rescue signal that must reach a stranded climber by bouncing off mirrors on girders. The girders are Pythagorean triangles: 3-4-5, 5-12-13, 8-15-17, 7-24-25.
- **Objective:** aim the receiving dish so it catches the beam.
- **Mechanic:**
  - Each mirror turns the beam by an angle given as a ratio of girder sides. The player finds the missing side by Pythagoras.
  - The dish dial is set as tan⁻¹(p/q), with integer p and q dials.
  - A charge lights one leg of the path.
- **Levels:**
  1. **Periscope:** the periscope only turns through [−π/2, π/2], so a target at 3π/5 must be reached at 2π/5 (Example 6; Ex 2.2 Q10, Q11; Misc Q1, Q2).
  2. **Two mirrors:** the turns add, sin⁻¹(3/5) + sin⁻¹(8/17), and the dish is set to tan⁻¹(77/36) (Misc Q4 to Q7).
  3. **Boss, the folded beam:** a substitution x = tan θ turns tan⁻¹ of a messy expression into a multiple of θ. The dish must follow it for three values of x (Ex 2.2 Q3 to Q7).

## Chapter 3: Matrices

56 exercise questions and 25 examples. Elementary row operations and inverse by row operations are gone; induction proofs about powers are gone from the exercises.

| ID | Concept | § | Score |
|---|---|---|---|
| M1 | Matrix product, row by column | 3.4.5 | 66 |
| M2 | Equality: match entries to find unknowns | 3.3.1 | 44 |
| M3, M4 | Addition and scalar multiples | 3.4.1 to 3.4.2 | 37, 29 |
| M5 | Powers and identities: A², A² − 5A + 7I = O, A² = I | 3.4.6 | 22 |
| M6 | Symmetric or skew symmetric | 3.6 | 20 |
| M7, M11 | Transpose and (AB)′ = B′A′ | 3.5 | 19, 15 |
| M8 | When a sum or product is defined, and the order of the result | 3.4.5 | 18 |
| M10 | Matrices as data: the bonds split, takings, revenue (Ex 3.2 Q19, Q20; Misc Q7) | 3.2 to 3.4 | 15 |
| M14 | AB ≠ BA; AB = O with A, B ≠ O | 3.4.5 | 11 |
| M13 | Split into symmetric plus skew parts | 3.6 | 12 |

Rotation matrices [cos −sin; sin cos] run through 6 exercises (Ex 3.2 Q2(iv), Q6, Q13, Q18; Ex 3.3 Q6, Q12) and Example 23.

### Game 3.1: Hole in the Wall (M1, M2, M5, M14, rotation), the Hole in the Wall game show plus Tetris rotation

- **Hero:** Blocky, a robot whose outline is a vertex matrix P (2 × n). A wall with a cut-out shape rushes toward it.
- **Objective:** set the transformation matrix A so the new outline A·P fits the hole exactly.
- **Mechanic:**
  - Four entry dials, or an angle dial for rotations.
  - A charge previews one transformed vertex.
  - A wrong matrix makes Blocky smash into the wall at the corner that does not fit.
- **Levels:**
  1. **Equality of matrices:** find x and y in entries such as 2x + 1 so that A·P matches the hole (Ex 3.1 Q6, Q7).
  2. **Row-by-column product:** compute where each vertex lands (Ex 3.2 Q1, Q3).
  3. **Rotate by α:** set α to fit a tilted hole; A + A′ = I fixes α = π/3 (Ex 3.2 Q6, Q13; Ex 3.3 Q12).
  4. **Boss, two walls:** order matters. Fit AB, not BA (Ex 3.2 Q14), and use A² = I to come back through the same hole (Misc Q9).

### Game 3.2: Mirror Crystal (M6, M7, M11, M13), Sudoku plus 2048

- **Hero:** Crystal, a 3 × 3 grid of glowing gems that must balance across its diagonal mirror to open a vault.
- **Mechanic:**
  - Drag gems to flip them across the diagonal (the transpose).
  - Step entries up and down.
  - Split one crystal into two by setting the P and Q grids, which must sum to A.
- **Levels:**
  1. **Make A symmetric or skew symmetric** with the fewest changes (Ex 3.3 Q7, Q8; Misc Q10).
  2. **Split A = P + Q** with P symmetric and Q skew. The entries come out as halves (Ex 3.3 Q9, Q10; Example 22).
  3. **Boss, the reversal law:** the vault reads (AB)′, so build B′A′ in the right order (Ex 3.3 Q5, Q11; Misc Q1, Q2).

## Chapter 4: Determinants

61 exercise questions and 19 examples. The "Properties of determinants" section and its exercise are gone, and so is Cramer's rule: games must not need row operations.

| ID | Concept | § | Score |
|---|---|---|---|
| D21 | Matrix method: AX = B, then X = A⁻¹B | 4.6.1 | 36 |
| D16 | Inverse as adj A / \|A\| | 4.5 | 34 |
| D3 | Expand a 3 × 3 along any row or column | 4.2.3 | 21 |
| D15 | Singular or not; invertible only if \|A\| ≠ 0 | 4.5 | 21 |
| D11, D13 | Cofactors (sign checkerboard), adjoint | 4.4 to 4.5 | 17, 17 |
| D20 | Consistency: \|A\| = 0, so check (adj A)B | 4.6 | 15 |
| D19 | Inverse from a matrix identity | 4.5 | 13 |
| D18, D4 | \|adj A\| = \|A\|ⁿ⁻¹; \|kA\| = kⁿ\|A\| | 4.5, 4.2.3 | 12, 10 |
| D7, D6, D8, D9 | Area, unknown vertex (both signs), collinear, line through two points | 4.3 | 9, 7, 3, 5 |

### Game 4.1: Field Claim (D6, D7, D8, D9), Paper.io plus Qix

- **Hero:** Scout, a survey drone that fences triangular fields on a coordinate grid for farmers.
- **Objective:** drop the third fence post so the field has exactly the area the deed promises.
- **Mechanic:**
  - Drag the post on the grid.
  - The live area readout fades by round 3.
  - A charge reads one determinant.
- **Levels:**
  1. **Area from three posts:** ½ |det| (Ex 4.2 Q1; Example 6).
  2. **The unknown post:** both signs give two valid spots (k = 0 or 8; k = 12 or −2), and the deed only accepts one, the post inside the farmer's land (Ex 4.2 Q3, Q5; Example 7).
  3. **Boss, line up three beacons:** area 0 means they are collinear. Then give the line through two of them (Ex 4.2 Q2, Q4).

### Game 4.2: Vault Tumblers (D21, D16, D15, D20, D11, D13, D23), Fallout lockpicking plus Mastermind

- **Hero:** Tumbler, a safecracker robot facing a three-dial vault. Each clue plate is a linear equation of the three code numbers (onion, wheat and rice weights; three numbers whose sum and combinations are given).
- **Objective:** open the vault with the one code that satisfies every plate.
- **Mechanic:**
  - Fill the cofactor grid: drag the + and − checkerboard signs, then the cofactors.
  - Read the adjoint and divide by |A|.
  - Set the three code dials.
  - The live plate gauges fade.
  - A jammed vault (|A| = 0) must be declared "no unique code" from (adj A)B.
- **Levels:**
  1. **2 × 2 vaults:** the inverse by swap-and-negate (Ex 4.4 Q1, Q5; Ex 4.5 Q7 to Q10).
  2. **3 × 3 vaults:** cofactors, adjoint and inverse (Ex 4.4 Q7 to Q11; Ex 4.5 Q11 to Q14).
  3. **The jammed vault:** consistent or not (Ex 4.5 Q1 to Q6).
  4. **Boss:** a word problem written as a matrix system (Ex 4.5 Q16; Example 18).

## Chapter 5: Continuity and Differentiability

137 exercise questions and 43 examples, and no multiple choice. Rolle's theorem and the Mean Value Theorem are gone.

| ID | Concept | § | Score |
|---|---|---|---|
| C10 | Chain rule | 5.3.1 | 70 |
| C16 | Logarithmic differentiation | 5.5 | 62 |
| C15 | Derivatives of eˣ, aˣ, log x | 5.4 | 61 |
| C18 | Second-order derivative | 5.7 | 56 |
| C2 | Continuity of a piecewise function at the joins | 5.2 | 48 |
| C11, C17 | Implicit; parametric | 5.3.2, 5.6 | 44, 44 |
| C3 | Modulus: split at the zero, find corners | 5.2 to 5.3 | 32 |
| C12, C13 | Inverse trig derivatives; by substitution | 5.3.3 | 27, 26 |
| C5 | Find k (or a, b) that make a function continuous; boards ask it often | 5.2 | 20 |
| C9 | Differentiability at a point (left and right derivatives) | 5.3 | 14 |

### Game 5.1: Track Joiner (C2, C5, C3, C9, C4), Line Rider plus Hill Climb Racing

- **Hero:** Zip, a stunt cart riding a track built from function pieces.
- **Objective:** reach the finish flag without falling into a gap or jolting off a sharp corner.
- **Mechanic:**
  - Dial the constant k (then a and b) of each piece. The track redraws.
  - Ride it: at a gap (left limit ≠ right limit ≠ value) the cart falls, and at a corner it bounces off.
  - A charge zooms in on one join.
- **Levels:**
  1. **Close one gap:** find k (Ex 5.1 Q26 to Q28).
  2. **Two constants, two joins** (Ex 5.1 Q29, Q30; Examples 10 to 13).
  3. **Modulus tracks:** flag the corners of |x − 5|, |cos x| and |x| − |x + 1| before riding (Ex 5.1 Q32 to Q34; Ex 5.2 Q9).
  4. **Boss, a smooth join:** match both the value and the slope, so the join is continuous and differentiable (Misc Q20 style; Ex 5.2 Q10, the floor function at integers).

### Game 5.2: Gear Train (C10, C11, C15, C16, C17, C18), The Incredible Machine

- **Hero:** Cog, a machine of linked gears, where each layer of a composite function is one gear.
- **Objective:** the last gear must spin at the target rate when the crank is at x₀.
- **Mechanic:**
  - Set the ratio dial of each stage: dy/du, du/dx and so on. The chain rule multiplies them.
  - A parametric stage runs a drone along (x(t), y(t)), and the camera slope must be (dy/dt)/(dx/dt).
  - An implicit stage runs a bead on a closed wire such as x² + y² = 25.
- **Levels:**
  1. **Two gears:** the chain rule (Ex 5.2 Q1 to Q8).
  2. **e and log gears** (Ex 5.4).
  3. **Log-lever:** x^x and long products, taking logs first (Ex 5.5 Q1 to Q11).
  4. **The drone camera:** parametric (Ex 5.6) and implicit (Ex 5.3).
  5. **Boss:** the second gear shows the second derivative; prove y″ + y = 0 by tuning (Ex 5.7).

## Chapter 6: Application of Derivatives

82 exercise questions and 37 examples. Tangents and normals and approximations are gone. The answer key has two slips: Ex 6.3 Q5(iv) has max and min swapped, and Ex 6.3 Q6 gives a maximum at a negative output. Do not use them as data.

| ID | Concept | § | Score |
|---|---|---|---|
| A1 | Optimisation word problems | 6.4 | 68 |
| A2 | Related rates through time | 6.2 | 44 |
| A3, A4 | Increasing and decreasing: show it, or find the intervals | 6.3 | 41, 30 |
| A5 | Second derivative test | 6.4 | 30 |
| A6 | Absolute max and min on a closed interval | 6.4.1 | 28 |
| A7 | First derivative test, inflection, corners | 6.4 | 23 |
| A8, A10 | Rate at a point; marginal cost and revenue | 6.2 | 15, 11 |

### Game 6.1: Max Out (A1, A5, A6), Cut the Rope plus Tetris packing. BUILT.

As built: level 1 box from a sheet; level 2 can and open tank (dials whole numbers, so the can volume is 2πR³ and the tank base area is a perfect square); level 3 cone in a sphere, cylinder in a cone (volume), then curved surface; level 4 nearest point on a cable y = kx² (D² method). The window and the 100 cm³ can were replaced because their optima cannot sit on a whole-number dial.

- **Hero:** Fold, a cargo drone that has to carry the biggest load.
- **Objective:** build the container that holds the most.
- **Mechanic:**
  - Drag the cut on the sheet, the radius of the can or the split of the number. The model folds up live.
  - The live volume readout fades.
  - A wrong build is filled with cargo that spills or does not fit.
  - The cuts snap to clean values, and exactly one wins.
- **Levels:**
  1. **Split a number** for the largest product (Ex 6.3 Q13 to Q16; Example 22).
  2. **Fold an open box from a sheet:** 18 cm square, 45 × 24 cm, 3 × 8 m (Ex 6.3 Q17, Q18; Example 36).
  3. **The can with the least metal for 100 cm³**, and the window with the most light (Ex 6.3 Q21; Misc Q8).
  4. **Boss:** the helicopter on y = x² + 7 must fly to the point nearest a soldier at (3, 7) (Example 29; Ex 6.3 Q27).

### Game 6.2: Catch Rate (A2, A8), Temple Run timing plus Fruit Ninja

- **Hero:** Rhea, a rescue runner.
- **Objective:** be in the right place at the right speed. Rates are set at an instant, and the scene plays at that instant.
- **Situations:**
  - A window cleaner rides a sliding 5 m ladder: set the speed of the catching net under the top (Ex 6.1 Q10).
  - A balloon is fed 900 cm³/s: set how fast the ring around it must widen (Ex 6.1 Q8).
  - Ripples from a stone: time the boats (Example 3; Ex 6.1 Q5).
  - A lamp-post shadow: pace the runner (Example 32).
  - A conical tank fills: set the float speed (Example 31; Ex 6.1 Q14).
- **Levels:**
  1. A direct rate dA/dr at a point (Ex 6.1 Q1, Q9).
  2. Chain through time (Ex 6.1 Q2 to Q8).
  3. A hidden relation found by similar triangles (Examples 31, 32).
  4. Boss: the ladder (Ex 6.1 Q10; Misc Q2).

### Game 6.3: Ridge Runner (A3, A4, A6, A7), Tiny Wings plus Alto's Adventure

- **Hero:** Pika, a bird gliding over hills drawn from f(x). It gains speed downhill and must flap uphill.
- **Objective:** cross the hills on a set flap budget by marking, before the run, where f rises and where it falls.
- **Mechanic:**
  - Drag flags to the critical points (the roots of f′).
  - Paint each interval up or down.
  - Place the camp at the absolute highest point of [a, b], endpoints included.
- **Levels:**
  1. **Paint the up and down intervals** of a factorable cubic (Ex 6.2 Q4 to Q6; Examples 10 to 13).
  2. **Flag the peaks and valleys** with the first derivative test, including a flat inflection where no flag belongs (Ex 6.3 Q3, Q4; Examples 17 to 19).
  3. **Boss, the camp on [a, b]:** the highest point may be an endpoint (Ex 6.3 Q5; Examples 27, 28).

---

## Build order (heaviest cluster first, one game at a time)

1. Rooftop Ranger, Ch 2 (built, the pilot).
2. Max Out, Ch 6 (68 points + A5/A6).
3. Gear Train, Ch 5 (chain, log, exp: about 190 points across C10, C15, C16).
4. Hole in the Wall, Ch 3 (product + equality: 110).
5. Vault Tumblers, Ch 4 (matrix method + inverse: 70+).
6. Portal Line, Ch 1 (one-one + onto: 92).
7. Track Joiner, Ch 5.
8. Catch Rate, Ch 6.
9. Room Keeper, Ch 1.
10. Ridge Runner, Ch 6.
11. Relay Tower, Ch 2.
12. Mirror Crystal, Ch 3.
13. Field Claim, Ch 4.

Games live in `src/games/mathematics/class-12/ch<NN>-<slug>/<id>/`, and the folder name must match `src/curriculum/mathematics/class-12.json`.


## How the built games differ from the designs above (review notes, 2026-10-30)

I reviewed every design before building and changed these, because each would otherwise have been a quiz or had a non-unique answer:
- **Gear Train:** the player sets the crank speed w so the last gear hits a target rate (output = derivative × w, or × w² for a second derivative), instead of entering derivative values.
- **Vault Tumblers:** level 4 needs both the determinant and the verdict (one, none or many codes), so a lucky guess cannot win.
- **Room Keeper:** dials and a relation grid replace graph drawing; "repair the chart" is judged by the real equivalence test.
- **Portal Line:** fences sit on real intervals and one-one is judged by turning points, not by integer coincidences.
- **Field Claim:** the deed names which side of the gate the post stands, so only one of the two solutions of the area equation is valid.
- **Hole in the Wall:** stretch gates were replaced by a 90° turn, a swap and a mirror, because with a stretch gate "A then B with shear 2" and "B then A with shear 4" gave the same hole (found by the exhaustive scan).
- **Track Joiner, Mirror Crystal, Ridge Runner, Relay Tower, Catch Rate:** as designed, with data chosen so every answer is a whole dial step and checked by scanning every dial position.

Every game's tests scan the whole dial range and require exactly one winning setting, and check each derivative or value against a numerical computation of the real function.
