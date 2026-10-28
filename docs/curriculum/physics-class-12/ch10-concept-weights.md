# Chapter 10 concept weights

Class 12 Physics, Chapter 10: Wave Optics (NCERT 2026-27 reprint, `leph2dd/leph202.pdf`, read locally; topics and exercise numbers only, no NCERT text or figures). Same method as `ch01-concept-weights.md`: **list ALL concepts, weight them by the questions asked, build in textbook order.** Games follow AGENTS.md section 5 items 13 to 16 (hero with an objective, any genre except workshop, famous-game inspiration, arcade engine).

## How the weight is computed

`score = 2 × (NCERT exercises that test it + worked examples that test it) + board tier` where tier A = 6, B = 3, C = 1.

- This reprint has only 6 exercises (10.1 to 10.6) and 2 worked examples (10.1, 10.2); the single-slit diffraction and polarisation numericals of older editions are gone. Concepts with no exercise keep their board tier, which is my judgement, not measured from papers.

## Summary

| Concepts | Total weight | Covered by games |
|---|---|---|
| 9 | 57 | 89% (left out: W6 dispersion, W9 photon picture) |

## Every concept, heaviest first

| Rank | ID | Concept | § | Exercises | Examples | Tier | Score |
|---|---|---|---|---|---|---|---|
| 1 | W4 | Speed, wavelength and frequency in a medium: n = c/v, λ′ = λ/n, f unchanged | 10.3 | 10.1, 10.3 | 10.1 | A | 12 |
| 2 | W1 | Young’s double slit: bright fringes at x = nλD/d, fringe width λD/d | 10.5 | 10.4, 10.6 | – | A | 10 |
| 3 | W3 | Intensity from path difference: I = 4I₀cos²(φ/2), φ = 2πΔ/λ | 10.4 | 10.5 | – | A | 8 |
| 4 | W7 | Single-slit diffraction: first minimum at sin θ = λ/a, wider slit gives a narrower pattern | 10.6 | – | – | A | 6 |
| 5 | W2 | Where the bright fringes of two wavelengths coincide | 10.5 | 10.6 | – | B | 5 |
| 6 | W5 | Huygens’ construction: wavefront shapes, reflection and refraction of a plane wave | 10.2, 10.3 | 10.2 | – | B | 5 |
| 7 | W8 | Polarisation: Malus’ law I = I₀cos²θ, three polaroids | 10.7 | – | 10.2 | B | 5 |
| 8 | W6 | Dispersion: speed in glass depends on colour, violet is slower | 10.3 | 10.3 | – | C | 3 |
| 9 | W9 | Coherent and incoherent addition; intensity in the photon picture | 10.4 | – | 10.1 | C | 3 |

W8 scores 5 because Example 10.2 counts once (2) plus tier B (3).

## Build waves

| Wave | Game | Concepts | Cluster weight | Exercises and examples it must test |
|---|---|---|---|---|
| 1 (done) | Wavefront Run (§10.2 to 10.3) | W4, W5 | 17 | Ex 10.1, 10.3(a); Example 10.1 |
| 2 (done) | Slit Dash (§10.4 to 10.5) | W1, W2, W3 | 23 | Ex 10.4, 10.5, 10.6 |
| 3 (done) | Light Dimmer (§10.6 to 10.7) | W7, W8 | 11 | Example 10.2 |

W6 (dispersion) and W9 (photon picture) are conceptual with tiny weight and are left out on purpose; W5 is covered only through the Huygens marching-band level.

## Notes for the builders

- Games live in `src/games/physics/class-12/ch10-wave-optics/<id>/`; the chapter name must match `src/curriculum/physics/class-12.json` ("Wave Optics").
- Use `src/core/dialgame.ts` (`mountDialLevel`): a level is its rounds, its dials, its judge and its scene.
- Units to drill: nm and µm, mm, cm, m, degrees, fractions of an intensity, 10⁸ m/s.
