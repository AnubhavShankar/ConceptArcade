# Chapter 12 concept weights

Class 12 Physics, Chapter 12: Atoms (NCERT 2026-27 reprint, `leph2dd/leph204.pdf`; topics and exercise numbers only, no NCERT text or figures). Same method as `ch01-concept-weights.md`. Games follow AGENTS.md section 5 items 13 to 16.

## How the weight is computed

`score = 2 × (NCERT exercises that test it + worked examples that test it) + board tier` where tier A = 6, B = 3, C = 1. The tier is my judgement, not measured from papers.

## Summary

| Concepts | Total weight | Covered by games |
|---|---|---|
| 7 | 59 | 93% (left out: A7, the Thomson and Rutherford comparison in words) |

## Every concept, heaviest first

| Rank | ID | Concept | § | Exercises | Examples | Tier | Score |
|---|---|---|---|---|---|---|---|
| 1 | A1 | Bohr energy levels Eₙ = −13.6/n² eV, and the photon of a transition (absorbed or emitted), λ = hc/ΔE | 12.4, 12.5 | 12.3, 12.5, 12.8 | 12.3 | A | 16 |
| 2 | A6 | Rutherford scattering: distance of closest approach r = 2Ze²/(4πε₀K), which grows as K falls and with Z | 12.2 | 12.2 | 12.1, 12.2 | A | 12 |
| 3 | A3 | Bohr orbits: rₙ = n²a₀, vₙ = v₁/n, period Tₙ ∝ n³ | 12.4 | 12.6, 12.7 | – | A | 10 |
| 4 | A2 | The spectral series of hydrogen and how many lines an excitation can give | 12.5 | 12.8 | – | A | 8 |
| 5 | A4 | Kinetic and potential energy in a Bohr level: K = −E, U = 2E | 12.4 | 12.4 | – | B | 5 |
| 6 | A8 | Quantisation of angular momentum mvr = nh/2π, and the quantum number of a large orbit | 12.6 | 12.9 | – | B | 5 |
| 7 | A7 | Thomson against Rutherford: the size and mass distribution of the atom | 12.2 | 12.1 | – | C | 3 |

## Build waves

| Wave | Game | Concepts | Cluster weight | Exercises and examples it must test |
|---|---|---|---|---|
| 1 (done) | Energy Ladder (§12.4 to 12.5) | A1, A2, A4 | 29 | Ex 12.3, 12.4, 12.5, 12.8; Example 12.3 |
| 2 (done) | Rutherford Range (§12.2) | A6 | 12 | Ex 12.2; Examples 12.1, 12.2 |
| 3 (done) | Bohr Orbits (§12.4, 12.6) | A3, A8 | 15 | Ex 12.6, 12.7, 12.9 |

## Notes for the builders

- Games live in `src/games/physics/class-12/ch12-atoms/<id>/`.
- Constants: hc = 1240 eV nm, E₁ = −13.6 eV, a₀ = 0.53 × 10⁻¹⁰ m, v₁ = 2.19 × 10⁶ m/s, e²/4πε₀ = 1.44 MeV fm, ħ = 1.055 × 10⁻³⁴ J s.
- Use `src/core/dialgame.ts` and `tests/helpers/arcade-harness.ts`.
