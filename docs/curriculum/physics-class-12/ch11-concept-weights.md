# Chapter 11 concept weights

Class 12 Physics, Chapter 11: Dual Nature of Radiation and Matter (NCERT 2026-27 reprint, `leph2dd/leph203.pdf`; topics and exercise numbers only, no NCERT text or figures). Same method as `ch01-concept-weights.md`. Games follow AGENTS.md section 5 items 13 to 16.

## How the weight is computed

`score = 2 × (NCERT exercises that test it + worked examples that test it) + board tier` where tier A = 6, B = 3, C = 1. The tier is my judgement, not measured from papers.

## Summary

| Concepts | Total weight | Covered by games |
|---|---|---|
| 8 | 69 | 94% (P8 Davisson–Germer is not in the 2026-27 edition: listed for reference only) |

## Every concept, heaviest first

| Rank | ID | Concept | § | Exercises | Examples | Tier | Score |
|---|---|---|---|---|---|---|---|
| 1 | P1 | Einstein’s equation K_max = hf − φ and the stopping potential eV₀ = hf − φ | 11.6 | 11.2, 11.3, 11.6, 11.8, 11.9 | 11.2 | A | 18 |
| 2 | P2 | Threshold frequency and wavelength, and whether emission happens | 11.3 to 11.4 | 11.6, 11.7, 11.8 | 11.2 | A | 14 |
| 3 | P5 | de Broglie wavelength λ = h/p = h/√(2mK) and h/√(2meV) | 11.8 | 11.10, 11.11 | 11.3 | A | 12 |
| 4 | P4 | Photon energy hf, momentum h/λ, photons per second from the power | 11.7 | 11.4 | 11.1 | A | 10 |
| 5 | P7 | What the experiment shows: photocurrent follows intensity, the stopping potential follows frequency | 11.4 to 11.5 | – | – | A | 6 |
| 6 | P3 | The V₀–f graph is a straight line of slope h/e | 11.4.3 | 11.5 | – | B | 5 |
| 7 | P6 | X-ray production: the shortest wavelength is hc/eV | 11.2 | 11.1 | – | B | 5 |
| 8 | P8 | Davisson–Germer: electrons diffract, so matter has a wavelength (not in the 2026-27 edition) | 11.8 | – | – | C | 1 |

P2 shares exercises 11.6 and 11.8 with P1, because each tests both ideas.

## Build waves

| Wave | Game | Concepts | Cluster weight | Exercises and examples it must test |
|---|---|---|---|---|
| 1 (done) | Photon Cannon (§11.3 to 11.6) | P1, P2, P3, P7 | 43 | Ex 11.2, 11.3, 11.5, 11.6, 11.7, 11.8, 11.9; Example 11.2 |
| 2 (done) | Matter Waves (§11.7 to 11.8, 11.2) | P4, P5, P6, P8 | 28 | Ex 11.1, 11.4, 11.10; Examples 11.1, 11.3 |

## Notes for the builders

- Games live in `src/games/physics/class-12/ch11-dual-nature-of-radiation-and-matter/<id>/`; the chapter name must match the curriculum file.
- Constants used: h = 6.63 × 10⁻³⁴ J s, c = 3 × 10⁸ m/s, e = 1.6 × 10⁻¹⁹ C, and hc ≈ 1240 eV nm (1.24 × 10⁻⁶ eV m); electron mass 9.1 × 10⁻³¹ kg.
- Use `src/core/dialgame.ts` and `tests/helpers/arcade-harness.ts`.
