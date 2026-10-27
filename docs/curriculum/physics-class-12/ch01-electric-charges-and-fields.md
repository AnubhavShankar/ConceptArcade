# Class 12 Physics · Ch 1: Electric Charges and Fields

Coverage map for contributors. Each row is one **concept** a game can target (put its ID in `game.json` under `concepts`, and the section in `ncertRef`). This file records concept names, section numbers and original game ideas only. It never reproduces NCERT text or figures.

Source: NCERT Physics Part 1, Chapter 1 (2026-27 reprint). Section numbers below refer to it. The chapter has 14 sections and 12 worked examples.

**Status:** ✅ game exists · 🟡 in progress · ⬜ open (claim it by opening an issue)

Every game is a ladder of levels that each add complexity or a concept (see CONTRIBUTING.md). Group A concepts are covered as follows: `attract-or-repel` (A1), `electron-ledger` (A2), `conduct-or-insulate` (A3), `net-charge` (A4), `charge-conserved` (A5), `quantum-of-charge` (A6), and `coulomb-balance` also covers B1.

See `ch01-coverage-review.md` for the review of what the games cover against the textbook exercises and typical exam questions, the gaps, and the recommended build order.

## How the chapter is structured

```
Charge itself ──► Coulomb force ──► Electric field ──► Visualising & measuring it ──► Special case: dipole ──► Gauss's law
 1.2–1.4          1.5–1.6           1.7               1.8 lines · 1.9 flux            1.10–1.11               1.12–1.14
```

Everything after Coulomb's law is a different way of asking "what does a charge arrangement do?", so good games here ask students to **go between force, field and charge arrangement**.

## A. Charge itself (1.2–1.4)

| ID | Concept | § | What the student must apply | Common misconception | Game idea | Tier | Status |
|---|---|---|---|---|---|---|---|
| A1 | Two kinds of charge; like repel, unlike attract | 1.2 | Predict attraction/repulsion for rubbed pairs from the sign convention | Neutral objects can't be attracted by a charged one | *predict-then-reveal*: predict what happens when rod/fur/silk pairs meet | concept | ✅ `attract-or-repel` |
| A2 | Charging = transfer of electrons; none created | 1.2 | Decide which body gains or loses electrons and so its sign | "Positive charge moves" in solids | *match-and-sort*: assign signs after rubbing | concept | ✅ `electron-ledger` |
| A3 | Conductors vs insulators | 1.3 | Predict where added charge goes and which objects hold a charge | A metal spoon can't be charged at all (it can, if insulated from the hand) | *match-and-sort*: classify materials and predict charge behaviour | concept | 🟡 `conduct-or-insulate` (discharge paths; not charge spreading on a conductor) |
| A4 | Additivity (charge is a scalar, algebraic sum) | 1.4.1 | Sum signed charges of a system | Adding magnitudes ignores sign | *numeric-puzzle*: net charge of a cluster | concept | ✅ `net-charge` |
| A5 | Conservation of charge | 1.4.2 | Find the unknown charge after contact/transfer | Charge is "used up" when neutralised | *fix-the-broken*: spot the reaction/transfer that breaks conservation | concept | 🟡 `charge-conserved` (sharing; no "spot the violation") |
| A6 | Quantisation, q = ne | 1.4.3 | Convert between charge and number of electrons; test whether a value is allowed | Treating charge as continuous at the atomic scale | *numeric-puzzle*: Millikan-style "which of these charges are possible?" | application | 🟡 `quantum-of-charge` (not "why ignore at macro scale") |

## B. Coulomb's law and superposition (1.5–1.6)

| ID | Concept | § | What the student must apply | Common misconception | Game idea | Tier | Status |
|---|---|---|---|---|---|---|---|
| B1 | Coulomb's law (magnitude), inverse square, k and ε₀ | 1.5 | Rearrange F = kq₁q₂/r² for any unknown | Force ∝ 1/r; forgetting unit conversion (μC, cm) | `coulomb-balance` solves for q from equilibrium; direct force and r not yet | concept | 🟡 `coulomb-balance` + `net-force-workshop` L1 (Ex 1.1, 1.2) |
| B2 | Same law, solving for charge, and scaling | 1.5 | Predict F after changing q or r (×2, ×½, ×3) without recalculating | Doubling r halves F | *predict-then-reveal* scaling quiz | concept | ✅ `net-force-workshop` L2 (Ex 1.12) |
| B3 | Vector form: direction and sign of force | 1.5 | Give the direction of F on each charge from the signs | Attraction/repulsion reversed; force on q₁ ≠ force on q₂ in direction | *build-the-setup*: drag charges so the force arrow points a given way | concept | 🟡 `net-force-workshop` L1 (direction, equal and opposite); vector components not yet |
| B4 | Sharing of charge between identical conducting spheres | 1.5 (Ex 1.4) | Charge splits equally on contact, then re-apply Coulomb | Charge doesn't change the force after contact | *numeric-puzzle*: touch spheres, predict the new force | application | ✅ `net-force-workshop` L2 (Example 1.4 sharing, then force) |
| B5 | Electric vs gravitational force | 1.5 | Compare magnitudes; explain why gravity wins at large scale | "Gravity is stronger" (it is far weaker; electric forces cancel) | *predict-then-reveal*: which force dominates? | application | ⬜ |
| B6 | Superposition principle (several charges) | 1.6 | Vector-add pairwise forces on one charge | Superposition is just "adding numbers"; ignoring direction | *build-the-setup*: arrange charges for a target net force | application | ✅ `net-force-workshop` L3 (Ex 1.6, Examples 1.5 and 1.6) |
| B7 | Equilibrium of a charge under several forces | 1.6 | Locate the point where net force is zero (on a line or triangle) | Equilibrium point is always the midpoint | *tune-to-target*: place a third charge so it is balanced (needs a computed prediction first) | challenge | ✅ `net-force-workshop` L4 and L5 |

## C. Electric field (1.7)

| ID | Concept | § | What the student must apply | Common misconception | Game idea | Tier | Status |
|---|---|---|---|---|---|---|---|
| C1 | Definition: E = F/q (test charge) | 1.7 | Convert between force on a charge and field at the point | Field depends on the test charge | *numeric-puzzle*: force on a probe from a given field | concept | ✅ `field-bench` L1 (Ex 1.8b) |
| C2 | Field of a point charge, 1/r² and direction | 1.7 | Magnitude and direction at a point; sign decides in/out | Direction independent of sign | *tune-to-target*: find the distance giving a target field | concept | ✅ `field-bench` L1 |
| C3 | Field of several charges (superposition) | 1.7.1 | Vector sum at a point; find where E = 0 | Field magnitudes add arithmetically | *build-the-setup*: make E zero at a marked point | application | 🟡 `field-bench` L2 (Ex 1.8, Example 1.8); "where is E = 0" not yet |
| C4 | Charged particle in a uniform field (kinematics) | 1.7.2 (Ex 1.7) | F = qE gives a, then use constant-acceleration equations | Ignoring charge sign in the direction of deflection | *numeric-puzzle*: aim a charged particle at a target | application | ✅ `field-bench` L3 and L5 (Example 1.7) |
| C5 | Field is undefined at a point charge's own location; discontinuity across a surface charge | 1.7 | Recognise where E is/isn't defined | Field at the charge = infinity or "just large" | *fix-the-broken*: critique flawed statements | challenge | ⬜ |

## D. Field lines (1.8)

| ID | Concept | § | What the student must apply | Common misconception | Game idea | Tier | Status |
|---|---|---|---|---|---|---|---|
| D1 | Properties of field lines (tangent = direction; density = strength; never cross; start on +, end on −; no closed loops) | 1.8 | Judge whether a drawn pattern is physically possible | Lines are physical paths; lines can cross where fields "meet" | *fix-the-broken*: find the invalid field-line diagram | concept | ✅ `field-line-detective` L1 (Ex 1.7) |
| D2 | Reading a field-line picture | 1.8 | From line density and direction, compare field strength and charge signs/magnitudes | More lines = more charge only in one diagram, not across diagrams | *predict-then-reveal*: infer charges from a pattern | application | ✅ `field-line-detective` L2 and L3 |
| D3 | Motion of a charge vs field lines | 1.8 | Path of a released charge does not generally follow a line | A released charge always moves along the field line | *predict-then-reveal* | challenge | ✅ `field-line-detective` L4 |

## E. Electric flux (1.9)

| ID | Concept | § | What the student must apply | Common misconception | Game idea | Tier | Status |
|---|---|---|---|---|---|---|---|
| E1 | Flux through a flat area, E·ΔS = EΔS cosθ | 1.9 | Compute flux for any orientation; zero when E ∥ surface | Flux is largest when E is parallel to the surface | *tune-to-target*: rotate a loop for a target flux | concept | ✅ `flux-gate` L1 and L3 (Ex 1.14) |
| E2 | Outward normal convention and sign of flux | 1.9 | Sign of flux through each face of a closed surface | Sign depends on the field only | *numeric-puzzle*: net flux through a box in a uniform field (Ex 1.10, 1.11) | application | ✅ `flux-gate` L2 and L4 (Ex 1.15, Example 1.10) |
| E3 | Units and dimensions of E and flux | 1.9 | Check dimensional consistency | – | *match-and-sort*: units to quantities | concept | 🟡 `flux-gate` (N m²/C used throughout; no unit-sorting task) |

## F. Electric dipole (1.10–1.11)

| ID | Concept | § | What the student must apply | Common misconception | Game idea | Tier | Status |
|---|---|---|---|---|---|---|---|
| F1 | Dipole and dipole moment, p = 2qa, direction −→+ | 1.10 | Compute p; give its direction | p points + to − | *numeric-puzzle* | concept | ✅ `dipole-bench` L1 (Ex 1.9) |
| F2 | Field on the axis and on the equatorial plane | 1.10.1 | Choose the right formula; far-field limits; axis ≈ 2 × equator at large r | Same direction on axis and equator | *numeric-puzzle*; *predict-then-reveal* directions | application | ✅ `dipole-bench` L4 (Example 1.9) |
| F3 | Dipole field falls as 1/r³, faster than a point charge | 1.10.1–1.10.2 | Compare how fields change when distance doubles | Net-zero charge means zero field | *predict-then-reveal*: "double the distance, what happens?" | application | ✅ `dipole-bench` L5 (and L1: zero total charge) |
| F4 | Torque on a dipole in a uniform field, τ = pE sinθ; net force zero | 1.11 | Compute torque; predict rotation and equilibrium orientation | A dipole in a uniform field accelerates sideways | *tune-to-target*: choose angle/field for a target torque | application | ✅ `dipole-bench` L2 (Ex 1.10) |
| F5 | Stable vs unstable equilibrium of a dipole | 1.11 | Identify θ = 0 vs θ = 180° and what happens after a small push | Both orientations are equally stable | *predict-then-reveal* | challenge | ✅ `dipole-bench` L3 |

## G. Continuous charge distributions (1.12)

| ID | Concept | § | What the student must apply | Common misconception | Game idea | Tier | Status |
|---|---|---|---|---|---|---|---|
| G1 | Linear, surface and volume charge density (λ, σ, ρ) | 1.12 | Pick the right density and compute total charge; use units | Mixing C/m, C/m², C/m³ | *match-and-sort*: pick the density for a geometry; *numeric-puzzle*: total charge | concept | ⬜ |

## H. Gauss's law (1.13–1.14)

| ID | Concept | § | What the student must apply | Common misconception | Game idea | Tier | Status |
|---|---|---|---|---|---|---|---|
| H1 | Gauss's law: net flux = q_enclosed / ε₀ | 1.13 | Find flux from enclosed charge, ignoring surface shape and outside charges | Outside charges contribute to net flux; flux depends on the surface's shape | *predict-then-reveal*: deform the surface, does the flux change? | application | ⬜ |
| H2 | Flux through part of a surface using symmetry (e.g. one face of a cube, hemisphere) | 1.13 (Ex 1.10, 1.11) | Apply symmetry to split flux equally | – | *numeric-puzzle* | challenge | ⬜ |
| H3 | Choosing a Gaussian surface | 1.14 | Match a charge distribution's symmetry to sphere, cylinder or pillbox | Any closed surface makes the calculation easy | *match-and-sort*: distribution → surface | application | ⬜ |
| H4 | Infinite line charge, E = λ/2πε₀r | 1.14.1 | Use the result; field ∝ 1/r | Same 1/r² as a point | *numeric-puzzle* | application | ⬜ |
| H5 | Infinite plane sheet, E = σ/2ε₀ (independent of distance) | 1.14.2 | Use the result; superpose two sheets/plates | Field weakens with distance from a large sheet | *predict-then-reveal*, *numeric-puzzle* (parallel plates) | application | ⬜ |
| H6 | Spherical shell: outside acts like a point charge, zero inside | 1.14.3 (Ex 1.12) | Choose inside/outside formula; extend to solid uniform sphere | Field inside a charged shell is non-zero; enclosed charge ignores a smaller radius | *tune-to-target*: probe radius, with "inside/outside?" committed first | challenge | ⬜ |

## Skills that cut across all concepts

- Unit handling (μC, nC, cm, mm → SI): the most common source of lost marks
- Vector addition in 2-D (components, symmetry cancellation)
- Estimating before calculating (does the answer have the right size and sign?)
- Reading and drawing diagrams

## Suggested build order

1. **Wave 1: foundations (builds on the existing game):** B2, B3, B5, A6, D1. Short, mostly *concept* tier.
2. **Wave 2: core problem-solving:** B6, B7, C2, C3, E1, F4. These carry the most exam weight.
3. **Wave 3: Gauss's law:** H1, H3, H5, H6, with H1 and H6 being the best "apply, not guess" candidates.
4. **Wave 4: depth and challenge:** C4, D3, F5, H2.

Aim for 2 to 3 games per concept in the *application* band; one is enough for *concept* tier.

## Notes

- This edition has **no section on charging by induction or earthing** (older editions did). Don't build games for it unless the syllabus changes.
- Chapter 1 has no potential or potential-energy content (the text never mentions it), so keep those out. They belong to the next chapter.
- Numerical practice for each section is in the chapter's exercises (1.1 to 1.23). The examples above (Ex 1.1 to 1.12) are good sources of *kinds* of problems. Write original numbers and contexts. Don't reuse the textbook's.
