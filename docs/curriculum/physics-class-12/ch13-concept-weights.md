# Chapter 13 concept weights

Class 12 Physics, Chapter 13: Nuclei (NCERT 2026-27 reprint, `leph2dd/leph205.pdf`; topics and exercise numbers only, no NCERT text or figures). Same method as `ch01-concept-weights.md`. Games follow AGENTS.md section 5 items 13 to 16.

## How the weight is computed

`score = 2 × (NCERT exercises that test it + worked examples that test it) + board tier` where tier A = 6, B = 3, C = 1. The tier is my judgement, not measured from papers. In this reprint the radioactive decay law (N = N₀e^−λt, half-life, activity) is not examined, so decay appears only through conservation of A and Z (Example 13.4).

## Summary

| Concepts | Total weight | Covered by games |
|---|---|---|
| 6 | 57 | 100% |

## Every concept, heaviest first

| Rank | ID | Concept | § | Exercises | Examples | Tier | Score |
|---|---|---|---|---|---|---|---|
| 1 | N1 | Mass defect and binding energy, 1 u = 931.5 MeV/c² | 13.4 | 13.1, 13.2, 13.3 | 13.3 | A | 14 |
| 2 | N3 | Nuclear size R = R₀A^⅓ and the constant nuclear density | 13.3 | 13.4, 13.10 | 13.1 | A | 12 |
| 3 | N2 | The Q value of a reaction; exothermic or endothermic; whether fission is possible | 13.7 | 13.5, 13.6 | 13.4 | A | 12 |
| 4 | N4 | Energy released by fission and fusion of a given mass, E = mc² | 13.7 | 13.7, 13.8 | 13.2 | B | 9 |
| 5 | N5 | The Coulomb barrier for fusion | 13.7.2 | 13.9 | – | B | 5 |
| 6 | N6 | Radioactive decays and the conservation of A and Z | 13.6 | – | 13.4 | B | 5 |

N2 scores 12 because exercises 13.5 and 13.6 count twice (4), Example 13.4 once (2), plus tier A (6). N4 scores 9: exercises 13.7 and 13.8 (4), Example 13.2 (2), tier B (3).

## Build waves

| Wave | Game | Concepts | Cluster weight | Exercises and examples it must test |
|---|---|---|---|---|
| 1 (done) | Binding Lab (§13.4 to 13.7) | N1, N2, N4 | 35 | Ex 13.1, 13.2, 13.5, 13.6, 13.7, 13.8; Examples 13.2, 13.3 |
| 2 (done) | Nucleus Builder (§13.3, 13.6, 13.7.2) | N3, N5, N6 | 22 | Ex 13.4, 13.9, 13.10; Examples 13.1, 13.4 |

Ex 13.3 (a coin’s binding energy) is covered by the first level’s method (mass defect to MeV).

## Notes for the builders

- Games live in `src/games/physics/class-12/ch13-nuclei/<id>/`.
- Data given in the book: m_H = 1.007825 u, m_n = 1.008665 u, 1 u = 931.5 MeV/c², N_A = 6.023 × 10²³ per mol, R₀ = 1.2 fm, e²/4πε₀ = 1.44 MeV fm.
- Use `src/core/dialgame.ts` and `tests/helpers/arcade-harness.ts`.
