# Chapter 1 concept weights

**Working rule (from the owner, 2026-10-27): for every chapter, start by listing ALL its concepts and weighting each one by the questions asked about it. Build games in weight order, and make each game test the same checks the exercise and worked-example questions test.**

This file does that for Class 12 Physics, Chapter 1 (Electric Charges and Fields). It lists topics and exercise numbers only; it never reproduces NCERT text or figures.

## How the weight is computed

`score = 2 × (NCERT exercises that test it + worked examples that test it) + board tier`

- **Exercises and examples:** counted directly from the 23 exercises and 12 worked examples of the 2026-27 reprint. This part is hard evidence. A question that tests two concepts counts for both.
- **Board tier:** A = 6 (a derivation or a standard numerical that appears most years), B = 3 (a common 1 to 3 mark question or assertion-reason), C = 1 (occasional). **This part is my judgement.** No source gives a Chapter 1-only mark split (the CBSE paper puts Electrostatics, Chapters 1 and 2 together, at roughly 16 of 70 theory marks), so check it against the official CBSE sample paper and past papers before leaning on it.
- Coverage: ✅ a game teaches it (counts 1), 🟡 partly (counts ½), ⬜ no game (counts 0).

## Summary

| Group | Concepts | Weight | Share of chapter | Covered by games |
|---|---|---|---|---|
| A. Charge itself (1.2 to 1.4) | 9 | 35 | 13.4% | 74% |
| B. Coulomb's law and superposition (1.5 to 1.6) | 8 | 61 | 23.3% | 77% |
| C. Electric field (1.7) | 6 | 38 | 14.5% | 63% |
| D. Field lines (1.8) | 3 | 12 | 4.6% | 0% |
| E. Flux (1.9) | 3 | 21 | 8.0% | 93% |
| F. Dipole (1.10 to 1.11) | 5 | 30 | 11.5% | 100% |
| G. Continuous charge (1.12) | 1 | 5 | 1.9% | 0% |
| H. Gauss's law (1.13 to 1.14) | 7 | 60 | 22.9% | 0% |
| **Chapter 1** | **42** | **262** | **100%** | **56%** |

Only about **56%** of the exam-weighted content is covered by the seven built games.

## Every concept, heaviest first

| Rank | ID | Concept | § | Exercises | Examples | Tier | Score | Share | Games |
|---|---|---|---|---|---|---|---|---|---|
| 1 | H1 | Gauss's law: net flux = q enclosed / ε₀ | 1.13 | 1.16, 1.18, 1.19, 1.21 | 1.10, 1.11 | A | 18 | 6.9% | ⬜ |
| 2 | B1 | Coulomb's law: magnitude, inverse square, solve for any unknown | 1.5 | 1.1, 1.2, 1.12 | 1.2, 1.3 | A | 16 | 6.1% | 🟡 |
| 3 | B6 | Superposition: vector sum of forces, symmetry cancellation | 1.6 | 1.6 | 1.5, 1.6 | A | 12 | 4.6% | 🟡 |
| 4 | C3 | Field of several charges; point where E = 0 | 1.7.1 | 1.8 | 1.8 | A | 10 | 3.8% | ✅ |
| 5 | E2 | Outward normal, sign of flux, net flux through a closed surface | 1.9 | 1.15 | 1.10 | A | 10 | 3.8% | ✅ |
| 6 | H6 | Spherical shell: outside like a point charge, zero inside | 1.14.3 | 1.20 | 1.12 | A | 10 | 3.8% | ⬜ |
| 7 | A6 | Quantisation, q = ne; charge from electron count | 1.4.3 | 1.4, 1.11 | 1.1 | B | 9 | 3.4% | 🟡 |
| 8 | C1 | Definition E = F/q; force on a test charge | 1.7 | 1.8 | – | A | 8 | 3.1% | ✅ |
| 9 | C4 | Charged particle in a uniform field (kinematics) | 1.7.2 | – | 1.7 | A | 8 | 3.1% | ⬜ |
| 10 | D1 | Properties of field lines | 1.8 | 1.7 | – | A | 8 | 3.1% | ⬜ |
| 11 | E1 | Flux through a flat area, EΔS cosθ | 1.9 | 1.14 | – | A | 8 | 3.1% | ✅ |
| 12 | F1 | Dipole moment p = 2qa; total charge of a dipole | 1.10 | 1.9 | – | A | 8 | 3.1% | ✅ |
| 13 | F2 | Dipole field on the axis and the equatorial plane | 1.10.1 | – | 1.9 | A | 8 | 3.1% | ✅ |
| 14 | F4 | Torque on a dipole, τ = pE sinθ; zero net force | 1.11 | 1.10 | – | A | 8 | 3.1% | ✅ |
| 15 | H4 | Infinite line charge, E = λ/2πε₀r | 1.14.1 | 1.22 | – | A | 8 | 3.1% | ⬜ |
| 16 | H5 | Infinite plane sheet and parallel plates | 1.14.2 | 1.23 | – | A | 8 | 3.1% | ⬜ |
| 17 | A2 | Charging is electron transfer; both bodies charged, opposite signs | 1.2 | 1.5, 1.11 | – | B | 7 | 2.7% | ✅ |
| 18 | B2 | Scaling: predict F when q or r change | 1.5 | 1.12 | 1.4 | B | 7 | 2.7% | ✅ |
| 19 | B3 | Vector form: direction of F; equal and opposite forces (Newton's third law) | 1.5 | 1.2 | 1.6 | B | 7 | 2.7% | ✅ |
| 20 | B5 | Electric versus gravitational force | 1.5 | 1.3 | 1.3 | B | 7 | 2.7% | ✅ |
| 21 | B7 | Equilibrium of a charge under several forces; where to place a third charge | 1.6 | – | – | A | 6 | 2.3% | ✅ |
| 22 | C2 | Field of a point charge: 1/r², direction by sign | 1.7 | – | – | A | 6 | 2.3% | ✅ |
| 23 | H3 | Choosing a Gaussian surface by symmetry | 1.14 | – | – | A | 6 | 2.3% | ⬜ |
| 24 | A5 | Conservation of charge | 1.4.2 | 1.5 | – | B | 5 | 1.9% | 🟡 |
| 25 | B4 | Sharing of charge between identical spheres, then the force | 1.5 | – | 1.4 | B | 5 | 1.9% | ✅ |
| 26 | C6 | Reading tracks of charged particles: sign and charge-to-mass ratio | 1.7.2 | 1.13 | – | B | 5 | 1.9% | ⬜ |
| 27 | G1 | Linear, surface, volume charge density | 1.12 | 1.21 | – | B | 5 | 1.9% | ⬜ |
| 28 | H1b | Zero net flux does not mean no charge inside | 1.13 | 1.16 | – | B | 5 | 1.9% | ⬜ |
| 29 | H2 | Flux through part of a surface by symmetry (cube face) | 1.13 | 1.17 | – | B | 5 | 1.9% | ⬜ |
| 30 | A1 | Two kinds of charge; like repel, unlike attract; neutral bodies are attracted | 1.2 | – | – | B | 3 | 1.1% | ✅ |
| 31 | A2b | Mass transferred when charging is negligible | 1.2 | 1.11 | – | C | 3 | 1.1% | ✅ |
| 32 | A6b | Quantisation is invisible at macroscopic scale | 1.4.3 | 1.4 | – | C | 3 | 1.1% | 🟡 |
| 33 | A7 | Size of the coulomb; k and 1 C = 1 A s | 1.5 | – | 1.1 | C | 3 | 1.1% | ✅ |
| 34 | D2 | Reading a field-line picture | 1.8 | – | – | B | 3 | 1.1% | ⬜ |
| 35 | E3 | Units and dimensions of E and flux | 1.9 | – | – | B | 3 | 1.1% | 🟡 |
| 36 | F3 | Dipole field falls as 1/r³; zero total charge but non-zero field | 1.10.2 | – | – | B | 3 | 1.1% | ✅ |
| 37 | F5 | Stable versus unstable equilibrium of a dipole | 1.11 | – | – | B | 3 | 1.1% | ✅ |
| 38 | A3 | Conductors and insulators; earthing | 1.3 | – | – | C | 1 | 0.4% | 🟡 |
| 39 | A4 | Additivity: charge is a scalar, algebraic sum | 1.4.1 | – | – | C | 1 | 0.4% | ✅ |
| 40 | B6b | Superposition means no extra many-body forces | 1.6 | – | – | C | 1 | 0.4% | ✅ |
| 41 | C5 | Field undefined at a point charge; discontinuity across a surface | 1.7 | – | – | C | 1 | 0.4% | ⬜ |
| 42 | D3 | Motion of a charge versus field lines | 1.8 | – | – | C | 1 | 0.4% | ⬜ |

## Build waves, by weight

Games are built one at a time, **in textbook (NCERT section) order**, so the student meets them in the same flow as the chapter. Weight tells you how much care each deserves, and the heaviest cluster (Gauss, wave 6) comes last because it needs the field and flux ideas before it. A game may bundle several concepts of one cluster; each level maps to the specific exercise or example check it stands for.

| Wave | Game (working title) | Concepts | Cluster weight | Exercises and examples it must test |
|---|---|---|---|---|
| 1 (done) | Net-Force Workshop (§1.5 to 1.6) | B1, B2, B3, B4, B6, B7 | 53 (20.2%) | Ex 1.1, 1.2, 1.6, 1.12; Examples 1.4, 1.5, 1.6 |
| 2 (done) | Field bench (§1.7: field of one or several charges, particle in a field, tracks) | C1, C2, C3, C4, C5, C6 | 38 (14.5%) | Ex 1.8, 1.13; Examples 1.7, 1.8 |
| 3 (done) | Field detective (§1.8: field lines) | D1, D2, D3 | 12 (4.6%) | Ex 1.7 |
| 4 (done) | Flux gate (§1.9) | E1, E2, E3 | 21 (8.0%) | Ex 1.14, 1.15; Example 1.10 |
| 5 (done) | Dipole bench (§1.10 to 1.11) | F1, F2, F3, F4, F5 | 30 (11.5%) | Ex 1.9, 1.10; Example 1.9 |
| 6 | Gauss lab (§1.12 to 1.14) | G1, H1, H1b, H2, H3, H4, H5, H6 | 65 (24.8%) | Ex 1.16 to 1.23; Examples 1.11, 1.12 |
| 7 | Gap fill in the built games (§1.2 to 1.5) | A2b, A3, A5, A6, A6b, A7, B5 | 31 (11.8%) | Ex 1.3, 1.4, 1.11; Examples 1.1, 1.3 |

Wave 6 (Gauss) is the single heaviest cluster, then wave 1; flux (wave 4) must precede Gauss, so the textbook order is also the dependency order. Within a wave, build the highest-weight concepts first.

## Checks every game should reproduce

A game is "done" for a concept only when a student who wins it could answer these question shapes:
- the **numerical** shape of the exercise (right units, prefixes, order of magnitude);
- the **explain-why** shape (a sentence the student could write), taught by the after-win explanation;
- the **assertion-reason** shape: the misconception the game's wrong answers expose;
- the **diagram** shape where one exists (force arrows, field lines, a Gaussian surface).

## Keeping it current

When a game ships, update its rows here and in `ch01-electric-charges-and-fields.md`, and re-run this script's numbers by hand if tiers change.
