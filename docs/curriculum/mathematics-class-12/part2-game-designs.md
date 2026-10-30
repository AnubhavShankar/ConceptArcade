# Class 12 Mathematics, Part 2: concept weights and game designs

NCERT Mathematics Class XII Part 2, reprint 2026-27 (`../Maths/lemh2dd/lemh201.pdf` to `lemh207.pdf`, outside the repo; topics and exercise numbers only, no NCERT text or figures). Same method, same design rules and same engine pattern as `part1-game-designs.md`: a hero, one dial per unknown, exactly one winning setting per round, helpers that fade (live, dim, none), a test charge, a BOSS round, misses that show the effect and never the answer.

**Weight:** `score = 2 × (exercise questions + worked examples that test it) + tier`, with tiers A = 6, B = 3, C = 1 (judgement). Counts were taken from the chapter text by one reader per chapter.

This edition is trimmed: Ch 8 has only the area under simple curves, Ch 11 has lines in space only (no planes), Ch 12 has one exercise, Ch 13 has no distributions. Games stay inside what the book teaches.

## Design review before building

The first drafts of these designs were "set a dial, press fire", which is a calculator with a hero on it. The review changed how each game *plays*, with three rules for all of them:

1. **The verdict happens in the world, over time.** Pressing fire starts a run: water flows, paint rolls, a board rides the curve, a ball drops. The player watches the consequence arrive and can see where it goes wrong. A run is 1.5 to 3 seconds and never gives the answer, only the effect of the chosen setting.
2. **The picture helps in round 1 and goes quiet.** The live curve, the live gauge or the guide line is on in round 1, dim and costs a charge in round 2, and absent in the BOSS round. The picture is drawn to scale only where the number cannot be read off by eye.
3. **The trap is physical.** Each level has one wrong idea a student really has (total flow instead of net, the other root, the wrong side of the gate, the reduced fraction) and the world punishes it visibly.

| Game | What the review changed |
|---|---|
| Flow Control | Was "pick b, read a number". Now the gate opens and the water *runs in real time*: a cursor sweeps the rate graph, the tank rises at the true rate, drains where the rate is negative, and the gate slams shut at b. Too little leaves dry taps, too much floods the village. |
| Prism Split | Was "type A and B". Now the recombined beam is drawn against the original beam along x, and the run sweeps a scanner across the screen so the player sees *where* the two disagree (near a pole, or far out). Round 1 plots the recombined curve live; round 3 shows it only after the run. |
| Turf War | Was "find the boundary". Now the roller sweeps across the field laying paint while a counter ticks; paint below the axis spills onto the rival's turf, which is the sign trap. A rival squid paints the rest. |
| Slope Surfer | Was "pick C". Now the board rides the actual solution curve over wind arrows (the slope field), collecting stars on the way; a wrong C sails past the beacon. Round 3 hides the arrows. |
| Culture Dish | Order and degree become a *door scanner* with traps, then growth and the vibrating dish, so it is not a list of definitions. |
| Drone Dispatch | The drone flies the commanded vector over a city; a wrong vector lands on a rooftop it names. The relay drops at the section point. |
| Break Shot | Kept: the pool collision is the right physical model. After an off-centre hit of equal balls the two paths are at a right angle. The balls run their paths on fire. |
| Panel Tilt (was Screw Driver) | Renamed. A solar installer must drive the mount in the direction a × b (order and right-hand rule matter), then size the panel by |a × b|. |
| Laser Grid | Beams are drawn in an oblique 3D view, and a fired beam really travels and clips the receiver or misses it. |
| Rover Ridge | The rover is dragged around the plateau; ore stripes show the objective. A probe costs a charge. The player parks at the best corner, not the first one that looks good. |
| Pachinko Bayes | Uses *natural frequencies*: out of N balls dropped, how many land red, and of those how many came from bag 1. Whole numbers, no fractions to guess, and Bayes becomes counting. |
| Card Sharp | Dials are the two counts of a probability (cards that fit the clue, cards that match), so the reduced fraction is not enough: the player must count the *reduced sample space*. |

## Build status

| Ch | Game | Status |
|---|---|---|
| 7 | Flow Control | built (4 levels), real-time timing: open the gate, shut it on the moment you worked out |
| 7 | Prism Split | built (3 levels), drag the crystal over the (A, B) mixing plane, scanner sweep |
| 8 | Turf War | built (4 levels), Inky is the handle: drag the roller along the turf |
| 9 | Slope Surfer | built (4 levels), surf ride over wind arrows |
| 9 | Culture Dish | built (3 levels), falling specimen cards (real time) then growth lamp and spring |
| 10 | Drone Dispatch | built (3 levels), tap the vector plane |
| 10 | Break Shot | built (3 levels), pool table, dot product meters |
| 10 | Panel Tilt | built (3 levels), 3D panel and right-hand-rule bolt |
| 11 | Laser Grid | built (4 levels), 3D beams |
| 12 | Rover Ridge | built (3 levels), slide the ore ruler to the best corner |
| 13 | Pachinko Bayes | built (3 levels), sixty falling balls, Bayes by counting |
| 13 | Card Sharp | built (3 levels), tap-the-cards board for the reduced sample space |

---

## Chapter 7: Integrals

261 exercise questions and 42 examples. Top concepts: substitution (124), partial fractions (76), properties of definite integrals (72), standard quadratic forms (64), trig identities first (59), by parts (58), the second fundamental theorem (56), antiderivatives with an initial value (55), definite substitution (42). Answers that are expressions are awkward to check by one number, so the games use definite versions or an initial value.

### Game 7.1: Flow Control (second fundamental theorem, initial value, substitution, symmetric limits), Cities: Skylines water plus Pipe Mania
- **Hero:** Dewey, the dam keeper, in a hard hat at a sluice wheel.
- **Objective:** close the gate at the moment the tank holds exactly the volume the town needs. The rate of flow f(t) is given; the volume is the integral.
- **Dial:** the closing time b (for the symmetric canal, the half-width). Gauge test costs a charge.
- **Run:** the gate opens, a cursor sweeps the rate graph, the tank rises and drains at the true rate, and the gate shuts at b. Dry taps if short, a flood if over.
- **Levels:** (1) power-rule rates and a tank that already holds some water; (2) a rate that drains first, so net is not total; (3) rate 2(n+1)·t·(t² + c)ⁿ needs u = t² + c; (4) BOSS canal from −h to h with odd decoy terms that cancel.

### Game 7.2: Prism Split (partial fractions), light-beam puzzles in Portal
- **Hero:** Prism, a glass prism on a stand that splits one beam of light into two or three colours.
- **Objective:** set the strengths A, B (and C) of the split beams so that, put back together, they make the single beam again.
- **Run:** a scanner sweeps along x; the recombined beam is drawn against the original; where they differ the scanner flags red.
- **Levels:** (1) two distinct linear factors; (2) a repeated factor, A/(x − a) + B/(x − a)²; (3) BOSS, three factors.

## Chapter 8: Application of Integrals

13 items in total (9 exercise questions, 4 examples). Weights: ellipse area 12, area where the curve crosses the axis 12, circle 7, sine arches 7, power curve between ordinates 5, strips along y 5, modulus triangle 5.

### Game 8.1: Turf War (areas under curves), Splatoon
- **Hero:** Inky, a paint-roller squid kid with a roller who must cover a field exactly.
- **Objective:** move the field's boundary so the painted area is the target and no more.
- **Run:** the roller sweeps across the field; the paint counter ticks up with the true area; paint under the axis spills onto the rival's turf.
- **Levels:** (1) ellipse πab: one semi-axis is pinned, set the other; (2) a line that crosses the axis: the area is |A₁| + A₂, not the signed sum; (3) sine arches: n quarter waves have area n; (4) BOSS, the cubic x³ between −p and q.

## Chapter 9: Differential Equations

98 exercise questions and 22 examples. Top concepts: separable (62), homogeneous (52), linear with an integrating factor (40), verify a solution (35), order and degree (34), curve through a point (17), growth and decay (13). Answers are functions, so the dial is the constant C or k that fits a point.

### Game 9.1: Slope Surfer (particular solutions), Tiny Wings and Alto's Adventure
- **Hero:** Surf, a kid on a hoverboard riding a curve from a family of solutions.
- **Objective:** choose the constant C so the ride passes through the beacon and collects the stars on the way.
- **Levels:** (1) separable; (2) y′ = ky; (3) homogeneous; (4) BOSS, linear with an integrating factor.

### Game 9.2: Culture Dish (order, degree, growth, oscillation), Plague Inc.
- **Hero:** Petri, a lab-coat robot with a dish and a growth lamp.
- **Levels:** (1) the door scanner reads order and degree (with traps where degree is undefined); (2) y′ = ky; (3) BOSS, the vibrating dish y″ = −m²y.

## Chapter 10: Vector Algebra

73 exercise questions and 30 examples. Top: unit vector or given magnitude (32), perpendicular test (30), dot-product algebra (27), components (21), angle (20), cross product (18), area (18), direction cosines (17), section formula (16), collinear (15).

### Game 10.1: Drone Dispatch (components, magnitude, section formula), Lunar Lander and Asteroids
- **Hero:** Dash, a courier drone with four rotors.
- **Levels:** (1) vector between two points; (2) thrust of a given magnitude along a direction; (3) BOSS, the relay that divides the leg in the ratio m : n.

### Game 10.2: Break Shot (dot product, perpendicular, projection), pool
- **Hero:** Cue, a pool player. After a glancing hit of equal balls the two paths are at a right angle, so their dot product is zero.
- **Levels:** (1) find λ for a right angle; (2) angle from the dot product; (3) BOSS, the shadow (projection) of one path on the rail.

### Game 10.3: Panel Tilt (cross product, area, parallel), Minecraft building plus a drill game
- **Hero:** Sol, a solar installer robot with a drill.
- **Levels:** (1) the mount direction a × b (order matters); (2) the panel area |a × b| with one unknown side; (3) BOSS, make two supports parallel.

## Chapter 11: Three Dimensional Geometry

25 exercise questions and 10 examples. Top: shortest distance between skew lines (18), a line through a point with a direction (16), the angle between lines (14), direction cosines (11), parallel or perpendicular (11).

### Game 11.1: Laser Grid (direction cosines, perpendicular, angle, skew distance), Portal lasers
- **Hero:** Lux, a laser technician with a tripod emitter.
- **Levels:** (1) the cosines of a beam; (2) two beams at a right angle; (3) the angle between two beams; (4) BOSS, the clearance between two skew beams.

## Chapter 12: Linear Programming

10 exercise questions and 5 examples. Top: feasible region and corner points (36), the corner-point method (18), ties (11), unbounded regions (9), mixed-sign objectives (7).

### Game 12.1: Rover Ridge (corner points), Lunar Lander plus Mars rovers
- **Hero:** Rover, a mining rover on a plateau fenced by cliffs. The cliffs are the constraints.
- **Objective:** park at the corner with the most ore, where ore is a x + b y.
- **Levels:** (1) maximum on a bounded plateau; (2) minimum; (3) BOSS, mixed signs.

## Chapter 13: Probability

62 exercise questions and 24 examples. Top: conditional probability by counting (40), Bayes with two causes (38), conditional probability by formula (34), independence (34), Bayes with three causes (22). No distributions in this edition.

### Game 13.1: Pachinko Bayes (total probability, Bayes), Plinko
- **Hero:** Bounce, a ball that drops through two or three gates.
- **Levels:** (1) total probability as a count; (2) Bayes with two causes as a count of the red ones; (3) BOSS, three causes.

### Game 13.2: Card Sharp (conditional probability, independence), card tricks
- **Hero:** Ace, a stage magician who stacks the deck.
- **Levels:** (1) conditional probability by counting; (2) independence; (3) draws without replacement.
