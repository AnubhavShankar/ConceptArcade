# Chapter 2 concept weights

Class 12 Physics, Chapter 2: Electrostatic Potential and Capacitance (NCERT 2026-27 reprint, read locally; topics and exercise numbers only, no NCERT text or figures). Built the same way as `ch01-concept-weights.md`: **list ALL concepts, weight them by the questions asked, build in textbook order, one game at a time, each level mirroring a named exercise or example.**

## How the weight is computed

`score = 2 × (NCERT exercises that test it + worked examples that test it) + board tier` where tier A = 6, B = 3, C = 1.

- The exercises (2.1 to 2.11) and the 10 worked examples are counted directly. I could not read every worked example's statement cleanly from the text extraction, so an example-to-concept link is a best reading; correct it if you find one that is off.
- The tier is my judgement (derivations and standard numericals are A). It is not measured from papers.
- The chapter's "Points to Ponder" also feed assertion-reason questions: potential is a scalar; field is discontinuous but potential is continuous across a shell; shielding works one way; qV uses the potential of the *other* charges.

## Summary

| Concepts | Total weight | Covered by games |
|---|---|---|
| 19 | 158 | 100% |

## Every concept, heaviest first

| Rank | ID | Concept | § | Exercises | Examples | Tier | Score | Share | Games |
|---|---|---|---|---|---|---|---|---|---|
| 1 | P12 | A dielectric multiplies C by K; supply connected or disconnected (V, Q, E, U change) | 2.13 | 2.5, 2.9 | 2.8 | A | 12 | 7.6% | ✅ |
| 2 | P13 | Capacitors in series and in parallel: equivalent capacitance, charge and voltage sharing | 2.14 | 2.6, 2.7 | 2.9 | A | 12 | 7.6% | ✅ |
| 3 | P2 | Potential of a point charge, V = kq/r (a scalar, sign of the charge) | 2.3 | 2.1, 2.2 | 2.1 | A | 12 | 7.6% | ✅ |
| 4 | P3 | Potential of a system of charges: add the potentials as numbers; find where V = 0 | 2.5 | 2.1, 2.2 | 2.2 | A | 12 | 7.6% | ✅ |
| 5 | P11 | Parallel-plate capacitor: C = ε₀A/d | 2.12 | 2.5, 2.8 | – | A | 10 | 6.3% | ✅ |
| 6 | P14b | Energy lost when charged and uncharged capacitors are connected | 2.15 | 2.11 | 2.10 | A | 10 | 6.3% | ✅ |
| 7 | P5 | Equipotential surfaces: E is perpendicular to them and points to lower potential | 2.6 | 2.3 | 2.3 | A | 10 | 6.3% | ✅ |
| 8 | P8 | Conductors: E = 0 inside, E perpendicular at the surface, charge on the surface, V constant | 2.9 | 2.4 | 2.7 | A | 10 | 6.3% | ✅ |
| 9 | P1 | Potential and potential difference: work per unit charge, V = W/q; zero at infinity | 2.2 | – | 2.1 | A | 8 | 5.1% | ✅ |
| 10 | P10 | Capacitance C = Q/V; the farad and its small units | 2.11 | 2.8 | – | A | 8 | 5.1% | ✅ |
| 11 | P14 | Energy stored in a capacitor: U = ½CV² = Q²/2C = ½QV | 2.15 | 2.10 | – | A | 8 | 5.1% | ✅ |
| 12 | P6 | Potential energy of a system of charges | 2.7 | – | 2.4 | A | 8 | 5.1% | ✅ |
| 13 | P7 | Potential energy of a charge in an external field, qV | 2.8.1 | – | 2.5 | A | 8 | 5.1% | ✅ |
| 14 | P7b | Potential energy of a dipole in a field, U = −pE cosθ; work to turn it | 2.8.3 | – | 2.6 | A | 8 | 5.1% | ✅ |
| 15 | P4 | Potential of a dipole: V = kp cosθ / r²; zero on the equatorial plane | 2.4 | – | – | A | 6 | 3.8% | ✅ |
| 16 | P8b | Electrostatic shielding: a cavity is shielded from outside, not the reverse | 2.9 | – | 2.7 | B | 5 | 3.2% | ✅ |
| 17 | P9b | Field and potential of a charged shell: field discontinuous, potential continuous | 2.9 | 2.4 | – | B | 5 | 3.2% | ✅ |
| 18 | P5b | Relation of field and potential: E = −dV/dr | 2.6.1 | – | – | B | 3 | 1.9% | ✅ |
| 19 | P9 | Dielectrics and polarisation: the induced field reduces the field, dielectric constant K | 2.10 | – | – | B | 3 | 1.9% | ✅ |

## Build waves (textbook order)

| Wave | Game (working title) | Concepts | Cluster weight | Exercises and examples it must test |
|---|---|---|---|---|
| 1 (done) | Potential bench (§2.2 to 2.5): potential of one charge and of a system, V = 0 points, the dipole | P1, P2, P3, P4 | 38 (24.1%) | Ex 2.1, 2.2; Examples 2.1, 2.2 |
| 2 (done) | Equipotential maps (§2.6): surfaces and the field–potential link | P5, P5b | 13 (8.2%) | Ex 2.3; Example 2.3 |
| 3 (done) | Energy bench (§2.7 to 2.8): energy of a system, a charge in a field, a dipole in a field | P6, P7, P7b | 24 (15.2%) | Examples 2.4, 2.5, 2.6 |
| 4 (done) | Conductor lab (§2.9 to 2.10): inside and surface of conductors, shielding, shell, dielectrics | P8, P8b, P9, P9b | 23 (14.6%) | Ex 2.4; Example 2.7 |
| 5 (done) | Lightning on Set, id `capacitor-bench` (§2.11 to 2.13, 2.15; rebuilt 2026-10-30 from the old number-entry bench): C = Q/V, the parallel plate, a dielectric with the charger on or off, air breakdown, energy density | P10, P11, P12 | 30 (19.0%) | Ex 2.5, 2.8, 2.9; Example 2.8 |
| 6 (done) | Circuit builder (§2.14 to 2.15): series and parallel, energy stored and lost | P13, P14, P14b | 30 (19.0%) | Ex 2.6, 2.7, 2.10, 2.11; Examples 2.9, 2.10 |

Since 2026-10-30 wave 5 also plays two items that have no exercise and so carry no weight above: the dielectric strength of air, about 3 × 10⁶ V/m (§2.11, levels 1 to 4), and the energy density of the field, u = ½ε₀E² (§2.15, level 4).

Wave 6 (series, parallel and energy) and wave 5 (the capacitor itself) are the heaviest, and between them cover most of the numerical questions (Ex 2.5 to 2.11).

## Notes for the builders

- Games live in `src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/<id>/`. The curriculum file already lists this chapter.
- Every game follows AGENTS.md: real mechanic with animation, answers earned, wrong-answer messages never give the answer, a jsdom UI test, and a `summary` of 60 to 140 characters (it is the search snippet).
- Units to drill: pF, nF, µF, cm, mm, kV; ε₀ = 8.854 × 10⁻¹² C²/(N m²), k = 9 × 10⁹ N m²/C².
- Keep the concept map for the chapter in `ch02-electrostatic-potential-and-capacitance.md` up to date as games ship.
