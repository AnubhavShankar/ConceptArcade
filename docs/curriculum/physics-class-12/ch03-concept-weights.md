# Chapter 3 concept weights

Class 12 Physics, Chapter 3: Current Electricity (NCERT 2026-27 reprint, read locally; topics and exercise numbers only, no NCERT text or figures). Built the same way as `ch01-concept-weights.md`: **list ALL concepts, weight them by the questions asked, build in textbook order, one game at a time, each level mirroring a named exercise or example.**

## How the weight is computed

`score = 2 × (NCERT exercises that test it + worked examples that test it) + board tier` where tier A = 6, B = 3, C = 1.

- The exercises (3.1 to 3.9) and the 7 worked examples are counted directly. An example-to-concept link is a best reading; correct it if you find one that is off.
- The tier is my judgement (standard numericals and Kirchhoff problems are A). It is not measured from papers.
- This reprint has no potentiometer or meter-bridge section; the chapter ends at the Wheatstone bridge (§3.13).

## Summary

| Concepts | Total weight | Covered by games |
|---|---|---|
| 13 | 104 | 34% |

## Every concept, heaviest first

| Rank | ID | Concept | § | Exercises | Examples | Tier | Score | Share | Games |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Q8 | Temperature dependence, R = R₀(1 + α ΔT); thermistors, alloys | 3.8 | 3.3, 3.5, 3.6 | 3.3, 3.4 | A | 16 | 15.4% | ⬜ |
| 2 | Q10 | EMF, internal resistance, terminal voltage V = ε − Ir; charging a cell | 3.10 | 3.1, 3.2, 3.8 | – | A | 12 | 11.5% | ⬜ |
| 3 | Q12 | Kirchhoff's junction and loop rules | 3.12 | 3.7 | 3.5, 3.6 | A | 12 | 11.5% | ⬜ |
| 4 | Q2 | Drift velocity and current: I = n e A v_d; drift speed is tiny, the signal is fast | 3.5 | 3.9 | 3.1, 3.2 | A | 12 | 11.5% | ✅ |
| 5 | Q9 | Electrical energy and power: P = VI = I²R = V²/R; the kilowatt-hour | 3.9 | 3.6 | 3.3 | A | 10 | 9.6% | ⬜ |
| 6 | Q13 | Wheatstone bridge and its balance condition | 3.13 | – | 3.7 | A | 8 | 7.7% | ⬜ |
| 7 | Q4 | Resistivity: R = ρl/A, and what it depends on | 3.4 | 3.4 | – | A | 8 | 7.7% | ✅ |
| 8 | Q6 | Resistors in series and in parallel: equivalent resistance, current and voltage sharing | 3.12 | – | 3.5 | A | 8 | 7.7% | ⬜ |
| 9 | Q3 | Ohm's law, V = IR; ohmic and non-ohmic conductors | 3.4 | – | – | A | 6 | 5.8% | ✅ |
| 10 | Q5 | Mobility and the origin of resistivity, ρ = m/(ne²τ) | 3.5 | – | 3.2 | B | 5 | 4.8% | ✅ |
| 11 | Q1 | Electric current as the flow of charge, I = Q/t; the direction convention | 3.2 | – | – | B | 3 | 2.9% | ✅ |
| 12 | Q11 | Cells in series and in parallel | 3.11 | – | – | B | 3 | 2.9% | ⬜ |
| 13 | Q7 | Colour code of carbon resistors; resistivity of various materials | 3.7 | – | – | C | 1 | 1.0% | ✅ |

## Build waves (textbook order)

| Wave | Game (working title) | Concepts | Cluster weight | Exercises and examples it must test |
|---|---|---|---|---|
| 1 (done) | Drift lab (§3.2 to 3.5): current as flow, drift speed from I = nAev, why the signal is fast | Q1, Q2, Q5 | 20 (19.2%) | Ex 3.9; Examples 3.1, 3.2 |
| 2 (done) | Resistance bench (§3.4, 3.7): Ohm's law, R = ρl/A, the colour code | Q3, Q4, Q7 | 15 (14.4%) | Ex 3.4 |
| 3 | Heating wire (§3.8 to 3.9): temperature dependence and power | Q8, Q9 | 26 (25.0%) | Ex 3.3, 3.5, 3.6; Examples 3.3, 3.4 |
| 4 | Cell bench (§3.10 to 3.11): emf, internal resistance, terminal voltage, charging, cells in series and parallel | Q10, Q11 | 15 (14.4%) | Ex 3.1, 3.2, 3.8 |
| 5 | Circuit solver (§3.12): series/parallel networks and Kirchhoff's rules | Q6, Q12 | 20 (19.2%) | Ex 3.7; Examples 3.5, 3.6 |
| 6 | Bridge balance (§3.13): the Wheatstone bridge | Q13 | 8 (7.7%) | Example 3.7 |

Waves 3 (temperature and power) and 5 (Kirchhoff) carry most of the numerical questions.

## Notes for the builders

- Games live in `src/games/physics/class-12/ch03-current-electricity/<id>/`. Check the chapter name in `src/curriculum/physics/class-12.json` first.
- Every game follows AGENTS.md: real mechanic with animation, answers earned, wrong-answer messages never give the answer, a jsdom UI test, and a `summary` of 60 to 140 characters.
- Units to drill: mA, A, Ω, kΩ, mm², mm, °C; n = 8.5 × 10²⁸ m⁻³ for copper, e = 1.6 × 10⁻¹⁹ C.
