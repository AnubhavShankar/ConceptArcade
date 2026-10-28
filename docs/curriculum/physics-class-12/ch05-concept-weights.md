# Chapter 5 concept weights

Class 12 Physics, Chapter 5: Magnetism and Matter (NCERT 2026-27 reprint, read locally; topics and exercise numbers only, no NCERT text or figures). Built the same way as `ch01-concept-weights.md`: **list ALL concepts, weight them by the questions asked, build in textbook order, one game at a time, each level mirroring a named exercise or example.**

## How the weight is computed

`score = 2 × (NCERT exercises that test it + worked examples that test it) + board tier` where tier A = 6, B = 3, C = 1.

- The exercises (5.1 to 5.7) and the 4 worked examples are counted directly. An example-to-concept link is a best reading; correct it if you find one that is off.
- The tier is my judgement (the dipole-in-a-field numericals are A). It is not measured from papers.
- This reprint has only seven exercises and four worked examples; Exercise 5.4 refers to the solenoid of Exercise 5.3.

## Summary

| Concepts | Total weight | Covered by games |
|---|---|---|
| 7 | 57 | 100% |

## Every concept, heaviest first

| Rank | ID | Concept | § | Exercises | Examples | Tier | Score | Share | Games |
|---|---|---|---|---|---|---|---|---|---|
| 1 | G2 | A dipole in a uniform field: torque τ = mB sin θ, energy U = −mB cos θ, stable and unstable equilibrium, work to turn it | 5.2.3 | 5.1, 5.2, 5.4, 5.5 | 5.2 | A | 16 | 28.1% | ✅ |
| 2 | G1 | The bar magnet: poles come in pairs (cutting a magnet gives two magnets), field lines, and the solenoid as a bar magnet with m = NIA | 5.2.1 | 5.3 | 5.1 | A | 10 | 17.5% | ✅ |
| 3 | G4 | Field of a short bar magnet: on the axis 2× the equatorial value, both falling as 1/r³ | 5.2.4 | 5.7 | – | A | 8 | 14.0% | ✅ |
| 4 | G3 | Force and torque: a uniform field gives torque but no net force; a non-uniform field also gives a force | 5.2.3 | 5.6 | 5.1 | B | 7 | 12.3% | ✅ |
| 5 | G5 | Gauss’s law for magnetism: zero net flux, closed field lines, no isolated monopoles; spotting wrong field-line drawings | 5.3 | – | 5.3, 5.4 | B | 7 | 12.3% | ✅ |
| 6 | G6 | Magnetisation M, intensity H, B = μ₀(H + M), susceptibility χ and relative permeability μᵣ = 1 + χ | 5.4 | – | – | A | 6 | 10.5% | ✅ |
| 7 | G7 | Diamagnetic, paramagnetic and ferromagnetic materials: sign of χ, Curie’s law, domains and hysteresis | 5.5 | – | – | B | 3 | 5.3% | ✅ |

## Build waves (textbook order)

| Wave | Game (working title) | Concepts | Cluster weight | Exercises and examples it must test |
|---|---|---|---|---|
| 1 (done) | Magnet bench (§5.2.1 to 5.2.2): cutting a magnet, field lines and the solenoid as a magnet | G1 | 10 (17.5%) | Ex 5.3; Example 5.1 |
| 2 (done) | Dipole torque bench (§5.2.3): torque, energy, equilibrium and force | G2, G3 | 23 (40.4%) | Ex 5.1, 5.2, 5.4, 5.5, 5.6; Examples 5.1, 5.2 |
| 3 (done) | Magnet field (§5.2.4): axial and equatorial field of a short magnet | G4 | 8 (14.0%) | Ex 5.7 |
| 4 (done) | Field-line inspector (§5.3): closed lines, zero flux, no monopoles | G5 | 7 (12.3%) | Examples 5.3, 5.4 |
| 5 (done) | Materials lab (§5.4 to 5.5): H, M, B, χ and the three kinds of magnetism | G6, G7 | 9 (15.8%) | (no worked example or exercise; conceptual and board numericals) |

Wave 2 (the dipole in a field) carries almost all of the numerical questions.

## Notes for the builders

- Games live in `src/games/physics/class-12/ch05-magnetism-and-matter/<id>/`. Check the chapter name in `src/curriculum/physics/class-12.json` first.
- Every game follows AGENTS.md: real mechanic with animation, answers earned, wrong-answer messages never give the answer, a jsdom UI test, and a `summary` of 60 to 140 characters.
- Units to drill: J T⁻¹ for the magnetic moment, T for B, A m⁻¹ for M and H, μ₀ = 4π × 10⁻⁷ T m/A.
