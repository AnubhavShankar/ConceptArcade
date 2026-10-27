# Chapter 4 concept weights

Class 12 Physics, Chapter 4: Moving Charges and Magnetism (NCERT 2026-27 reprint, read locally; topics and exercise numbers only, no NCERT text or figures). Built the same way as `ch01-concept-weights.md`: **list ALL concepts, weight them by the questions asked, build in textbook order, one game at a time, each level mirroring a named exercise or example.**

## How the weight is computed

`score = 2 × (NCERT exercises that test it + worked examples that test it) + board tier` where tier A = 6, B = 3, C = 1.

- The exercises (4.1 to 4.13) and the 12 worked examples are counted directly. An example-to-concept link is a best reading; correct it if you find one that is off.
- The tier is my judgement (standard numericals and the field formulas are A). It is not measured from papers.
- The exercise numbers in the text extraction are garbled for 4.4 to 4.13, so they were matched by their order in the exercise list.

## Summary

| Concepts | Total weight | Covered by games |
|---|---|---|
| 12 | 122 | 43% |

## Every concept, heaviest first

| Rank | ID | Concept | § | Exercises | Examples | Tier | Score | Share | Games |
|---|---|---|---|---|---|---|---|---|---|
| 1 | M2 | Force on a current-carrying conductor, F = BIl sinθ, and its direction | 4.2.3 | 4.5, 4.6 | 4.1, 4.9 | A | 14 | 11.5% | ✅ |
| 2 | M6 | Ampère’s circuital law and the long straight wire, B = μ₀I/2πr, with direction | 4.6 | 4.2, 4.3, 4.4 | 4.7 | A | 14 | 11.5% | ⬜ |
| 3 | M9 | Torque on a current loop, τ = NIAB sinθ, and the magnetic moment m = NIA | 4.9.1 | 4.9, 4.13 | 4.10, 4.11 | A | 14 | 11.5% | ⬜ |
| 4 | M3 | Circular motion in a uniform field: r = mv/qB, period independent of speed, helical paths | 4.3 | 4.11, 4.12 | 4.3 | A | 12 | 9.8% | ✅ |
| 5 | M5 | Field of a circular loop and an arc: B = μ₀NI/2R at the centre | 4.5 | 4.1 | 4.5, 4.6 | A | 12 | 9.8% | ✅ |
| 6 | M1 | Magnetic force on a moving charge, F = qvB sinθ: direction for electrons and protons, zero along the field, no work done | 4.2.2 | 4.11 | 4.2 | A | 10 | 8.2% | ✅ |
| 7 | M7 | Solenoid and toroid: B = μ₀nI, uniform inside and nearly zero outside | 4.7 | 4.8 | 4.8 | A | 10 | 8.2% | ⬜ |
| 8 | M11 | Moving coil galvanometer: current and voltage sensitivity | 4.10 | 4.10 | – | A | 8 | 6.6% | ⬜ |
| 9 | M12 | Converting a galvanometer to an ammeter (shunt) and a voltmeter (series resistor) | 4.10 | – | 4.12 | A | 8 | 6.6% | ⬜ |
| 10 | M8 | Force between two parallel currents; the definition of the ampere | 4.8 | 4.7 | – | A | 8 | 6.6% | ⬜ |
| 11 | M10 | A current loop as a magnetic dipole: energy −m·B, equilibrium orientation | 4.9.2 | – | 4.10, 4.11 | B | 7 | 5.7% | ⬜ |
| 12 | M4 | Biot–Savart law: field of a current element, direction by the right-hand rule | 4.4 | – | 4.4 | B | 5 | 4.1% | ✅ |

## Build waves (textbook order)

| Wave | Game (working title) | Concepts | Cluster weight | Exercises and examples it must test |
|---|---|---|---|---|
| 1 (done) | Force lab (§4.2 to 4.3): force on a moving charge and on a wire, circular and helical motion | M1, M2, M3 | 36 (29.5%) | Ex 4.5, 4.6, 4.11, 4.12; Examples 4.1, 4.2, 4.3, 4.9 |
| 2 (done) | Field maker (§4.4 to 4.5): Biot–Savart, a loop and an arc | M4, M5 | 17 (13.9%) | Ex 4.1; Examples 4.4, 4.5, 4.6 |
| 3 | Ampère lab (§4.6 to 4.7): long straight wire, solenoid and toroid | M6, M7 | 24 (19.7%) | Ex 4.2, 4.3, 4.4, 4.8; Examples 4.7, 4.8 |
| 4 | Parallel wires (§4.8): attraction and repulsion, the ampere | M8 | 8 (6.6%) | Ex 4.7 |
| 5 | Coil torque bench (§4.9): torque, magnetic moment, dipole energy | M9, M10 | 21 (17.2%) | Ex 4.9, 4.13; Examples 4.10, 4.11 |
| 6 | Galvanometer bench (§4.10): sensitivity, shunts and series resistors | M11, M12 | 16 (13.1%) | Ex 4.10; Example 4.12 |

Waves 1 (force and motion) and 3 (Ampère) carry most of the numerical questions.

## Notes for the builders

- Games live in `src/games/physics/class-12/ch04-moving-charges-and-magnetism/<id>/`. Check the chapter name in `src/curriculum/physics/class-12.json` first.
- Every game follows AGENTS.md: real mechanic with animation, answers earned, wrong-answer messages never give the answer, a jsdom UI test, and a `summary` of 60 to 140 characters.
- Units to drill: G and T (1 G = 10⁻⁴ T), cm, mA, A, μ₀ = 4π × 10⁻⁷ T m/A, e = 1.6 × 10⁻¹⁹ C, mₑ = 9.1 × 10⁻³¹ kg.
