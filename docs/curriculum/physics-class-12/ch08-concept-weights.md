# Chapter 8 concept weights

Class 12 Physics, Chapter 8: Electromagnetic Waves (NCERT 2026-27 reprint, read locally; topics and exercise numbers only, no NCERT text or figures). Built the same way as `ch01-concept-weights.md`: **list ALL concepts, weight them by the questions asked, build in textbook order, one game at a time, each level mirroring a named exercise or example.**

## How the weight is computed

`score = 2 × (NCERT exercises that test it + worked examples that test it) + board tier` where tier A = 6, B = 3, C = 1.

- The exercises (8.1 to 8.10) and the 2 worked examples are counted directly. An example-to-concept link is a best reading; correct it if you find one that is off.
- The tier is my judgement (the wave-relation numericals are A). It is not measured from papers.
- Some exercise numbers are garbled in the text extraction (8.3 to 8.10) and were matched by their order and content.

## Summary

| Concepts | Total weight | Covered by games |
|---|---|---|
| 6 | 62 | 24% |

## Every concept, heaviest first

| Rank | ID | Concept | § | Exercises | Examples | Tier | Score | Share | Games |
|---|---|---|---|---|---|---|---|---|---|
| 1 | W4 | Wave relations c = fλ, ω = 2πf, k = 2π/λ, and reading a wave equation | 8.3 | 8.4, 8.5, 8.6, 8.8, 8.10 | 8.2 | A | 18 | 29.0% | ⬜ |
| 2 | W3 | Nature of EM waves: transverse, E ⟂ B ⟂ direction of travel, E = cB, c = 1/√(μ₀ε₀) | 8.3 | 8.3, 8.4, 8.7 | 8.1 | A | 14 | 22.6% | ⬜ |
| 3 | W1 | Displacement current I_d = ε₀ dΦ_E/dt: a changing electric field continues the current across a capacitor, and Kirchhoff’s rule holds | 8.2 | 8.1, 8.2 | – | A | 10 | 16.1% | ✅ |
| 4 | W6 | The electromagnetic spectrum: order by frequency and wavelength, photon energy E = hf, sources and uses | 8.4 | 8.3, 8.9 | – | A | 10 | 16.1% | ⬜ |
| 5 | W2 | Magnetic field between the plates of a charging capacitor from the displacement current (Ampère–Maxwell law) | 8.2 | 8.2 | – | B | 5 | 8.1% | ✅ |
| 6 | W5 | Energy of EM waves: equal electric and magnetic energy densities, u = ½ε₀E² + B²/2μ₀ | 8.3 | 8.10 | – | B | 5 | 8.1% | ⬜ |

## Build waves (textbook order)

| Wave | Game (working title) | Concepts | Cluster weight | Exercises and examples it must test |
|---|---|---|---|---|
| 1 (done) | Displacement bench (§8.2): displacement current and the field between capacitor plates | W1, W2 | 15 (24.2%) | Ex 8.1, 8.2 |
| 2 | Wave bench (§8.3): E, B, c, frequency, wavelength, wave equation, energy | W3, W4, W5 | 37 (59.7%) | Ex 8.4 to 8.8, 8.10; Examples 8.1, 8.2 |
| 3 | Spectrum lab (§8.4): the order of the spectrum and photon energies | W6 | 10 (16.1%) | Ex 8.3, 8.9 |

Wave 2 (the wave itself) carries most of the numericals.

## Notes for the builders

- Games live in `src/games/physics/class-12/ch08-electromagnetic-waves/<id>/`. Check the chapter name in `src/curriculum/physics/class-12.json` first.
- Every game follows AGENTS.md: real mechanic with animation, answers earned, wrong-answer messages never give the answer, a jsdom UI test, and a `summary` of 60 to 140 characters.
- Units to drill: nT, V/m, MHz, GHz, m, nm, Å (10⁻¹⁰ m), eV (1 eV = 1.6 × 10⁻¹⁹ J), c = 3 × 10⁸ m/s, h = 6.63 × 10⁻³⁴ J s.
