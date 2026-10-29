# Chapter 14 concept weights

Class 12 Physics, Chapter 14: Semiconductor Electronics: Materials, Devices and Simple Circuits (NCERT 2025-26 reprint, `leph2dd/leph206.pdf`; topics and exercise numbers only, no NCERT text or figures). Same method as `ch01-concept-weights.md`. Games follow AGENTS.md section 5 items 13 to 16.

## How the weight is computed

`score = 2 × (NCERT exercises that test it + worked examples that test it) + board tier` where tier A = 6, B = 3, C = 1. The tier is my judgement, not measured from papers. This reprint keeps only six exercises (14.1 to 14.6, mostly multiple choice) and four examples (14.1 to 14.4); the transistor, logic gate and amplifier numericals of older editions are gone.

## Summary

| Concepts | Total weight | Covered by games |
|---|---|---|
| 5 | 47 | 100% |

## Every concept, heaviest first

| Rank | ID | Concept | § | Exercises | Examples | Tier | Score |
|---|---|---|---|---|---|---|---|
| 1 | S1 | Doping: majority and minority carriers, n_e n_h = n_i², n_e ≈ N_D | 14.4 | 14.1, 14.2 | 14.2 | A | 12 |
| 2 | S3 | The p–n junction: diffusion, the depletion layer, forward and reverse bias and the potential barrier | 14.5 to 14.6 | 14.4, 14.5 | 14.3 | A | 12 |
| 3 | S2 | Energy bands and the band gap: C 5.4 eV, Si 1.1 eV, Ge 0.7 eV | 14.2, 14.3 | 14.3 | 14.1 | A | 10 |
| 4 | S4 | Rectifiers: half-wave output has the input frequency, full-wave has twice | 14.7 | 14.6 | – | A | 8 |
| 5 | S5 | Diode resistance from the V–I curve: forward ΔV/ΔI, reverse V/I | 14.6 | – | 14.4 | B | 5 |

## Build waves

| Wave | Game | Concepts | Cluster weight | Exercises and examples it must test |
|---|---|---|---|---|
| 1 (done) | Gap Jump (§14.2 to 14.4) | S1, S2 | 22 | Ex 14.1 to 14.3; Examples 14.1, 14.2 |
| 2 (done) | Junction Run (§14.5 to 14.7) | S3, S4, S5 | 25 | Ex 14.4 to 14.6; Examples 14.3, 14.4 |

Example 14.3 (a p slab and an n slab pressed together do not make a junction) is conceptual and is only told in the Hopper’s story and the working text, not played as a level.

The multiple-choice exercises (14.1 to 14.5) are turned into dials with the same physical content: the dopant’s valence and which carrier is the majority, the size of the gap, the height of the barrier.

## Notes for the builders

- Games live in `src/games/physics/class-12/ch14-semiconductor-electronics-materials-devices-and-simple-circuits/<id>/`; the folder must match the chapter name in the curriculum file.
- Data: E_g(C) = 5.4 eV, E_g(Si) = 1.1 eV, E_g(Ge) = 0.7 eV; hc = 1240 eV nm; Si has 5 × 10²⁸ atoms m⁻³ and n_i = 1.5 × 10¹⁶ m⁻³; the barrier of a silicon junction is about 0.7 V.
- Use `src/core/dialgame.ts` and `tests/helpers/arcade-harness.ts`.
