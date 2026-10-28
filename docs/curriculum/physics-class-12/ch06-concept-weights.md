# Chapter 6 concept weights

Class 12 Physics, Chapter 6: Electromagnetic Induction (NCERT 2026-27 reprint, read locally; topics and exercise numbers only, no NCERT text or figures). Built the same way as `ch01-concept-weights.md`: **list ALL concepts, weight them by the questions asked, build in textbook order, one game at a time, each level mirroring a named exercise or example.**

## How the weight is computed

`score = 2 × (NCERT exercises that test it + worked examples that test it) + board tier` where tier A = 6, B = 3, C = 1.

- The exercises (6.1 to 6.8) and the 10 worked examples are counted directly. An example-to-concept link is a best reading; correct it if you find one that is off.
- The tier is my judgement (the Faraday and motional-emf numericals are A). It is not measured from papers.
- Exercises 6.1 and 6.2 are figure-based (direction of the current), so they are tested by Lenz-law reasoning in games rather than by their figures.

## Summary

| Concepts | Total weight | Covered by games |
|---|---|---|
| 9 | 84 | 44% |

## Every concept, heaviest first

| Rank | ID | Concept | § | Exercises | Examples | Tier | Score | Share | Games |
|---|---|---|---|---|---|---|---|---|---|
| 1 | E5 | Motional emf ε = Blv, rotating rod ε = ½Bωl², polarity | 6.6 | 6.4, 6.5, 6.6 | 6.6, 6.7 | A | 16 | 19.0% | ⬜ |
| 2 | E2 | Faraday’s law: ε = −N dΦ/dt, emf and current in a coil | 6.4 | 6.3 | 6.2, 6.3 | A | 12 | 14.3% | ✅ |
| 3 | E3 | Lenz’s law: direction of the induced current | 6.5 | 6.1, 6.2 | 6.4 | A | 12 | 14.3% | ✅ |
| 4 | E7 | Mutual inductance: ε = −M dI/dt and flux linkage NΦ = MI | 6.7.1 | 6.8 | 6.8 | A | 10 | 11.9% | ⬜ |
| 5 | E1 | Magnetic flux Φ = BA cos θ and its change | 6.3 | – | 6.1 | A | 8 | 9.5% | ✅ |
| 6 | E6 | Self-inductance: ε = −L dI/dt and the solenoid L = μ₀n²Al | 6.7.2 | 6.7 | – | A | 8 | 9.5% | ⬜ |
| 7 | E9 | The AC generator: ε = NBAω sin ωt, peak emf NBAω | 6.8 | – | 6.10 | A | 8 | 9.5% | ⬜ |
| 8 | E4 | Lenz’s law and conservation of energy; when no emf is induced | 6.5 | – | 6.5 | B | 5 | 6.0% | ✅ |
| 9 | E8 | Energy stored in an inductor, ½LI², and the energy density B²/2μ₀ | 6.7.2 | – | 6.9 | B | 5 | 6.0% | ⬜ |

## Build waves (textbook order)

| Wave | Game (working title) | Concepts | Cluster weight | Exercises and examples it must test |
|---|---|---|---|---|
| 1 (done) | Faraday bench (§6.2 to 6.4): flux, rate of change of flux, emf and current | E1, E2 | 20 (23.8%) | Ex 6.3; Examples 6.1, 6.2, 6.3 |
| 2 (done) | Lenz lab (§6.5): direction of the induced current, energy and no-emf cases | E3, E4 | 17 (20.2%) | Ex 6.1, 6.2; Examples 6.4, 6.5 |
| 3 | Motional emf (§6.6): sliding and rotating rods and loops leaving a field | E5 | 16 (19.0%) | Ex 6.4, 6.5, 6.6; Examples 6.6, 6.7 |
| 4 | Inductance bench (§6.7): self, mutual, solenoid, energy | E6, E7, E8 | 23 (27.4%) | Ex 6.7, 6.8; Examples 6.8, 6.9 |
| 5 | AC generator (§6.8): rotating coil, peak emf | E9 | 8 (9.5%) | Example 6.10 |

Waves 3 (motional emf) and 1 (Faraday) carry most of the numericals.

## Notes for the builders

- Games live in `src/games/physics/class-12/ch06-electromagnetic-induction/<id>/`. Check the chapter name in `src/curriculum/physics/class-12.json` first.
- Every game follows AGENTS.md: real mechanic with animation, answers earned, wrong-answer messages never give the answer, a jsdom UI test, and a `summary` of 60 to 140 characters.
- Units to drill: Wb, mWb, V, mV, H, mH, rad/s, rev/min, G and T (1 G = 10⁻⁴ T).
