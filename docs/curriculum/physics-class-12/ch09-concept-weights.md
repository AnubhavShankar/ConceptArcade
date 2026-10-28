# Chapter 9 concept weights

Class 12 Physics, Chapter 9: Ray Optics and Optical Instruments (NCERT 2026-27 reprint, `leph2dd/leph201.pdf`, read locally; topics and exercise numbers only, no NCERT text or figures). Built the same way as `ch01-concept-weights.md`: **list ALL concepts, weight them by the questions asked, build in textbook order, each level mirroring a named exercise or example.**

From this chapter on every game follows the owner's rule of 2026-10-28: **a hero with an objective, reached only by applying the concept** (see AGENTS.md section 5, item 13).

## How the weight is computed

`score = 2 × (NCERT exercises that test it + worked examples that test it) + board tier` where tier A = 6, B = 3, C = 1.

- The exercises (9.1 to 9.31) and the 8 worked examples are counted directly. An example-to-concept link is a best reading; correct it if you find one that is off.
- The tier is my judgement (lens, refraction and instrument numericals are A). It is not measured from papers.
- Exercises 9.25 (a to e) is one exercise with five conceptual parts; it is counted once for the magnifier and once for the compound microscope.

## Summary

| Concepts | Total weight | Covered by games |
|---|---|---|
| 14 | 155 | 94% (all six waves done; left out on purpose: R4 and the Cassegrain exercise 9.29) |

## Every concept, heaviest first

| Rank | ID | Concept | § | Exercises | Examples | Tier | Score |
|---|---|---|---|---|---|---|---|
| 1 | L1 | Thin lens formula 1/v − 1/u = 1/f, magnification, sign convention, two-lens systems | 9.5.2 | 9.8, 9.9, 9.18, 9.19, 9.20b | 9.8 | A | 18 |
| 2 | M1 | Mirror equation and magnification for concave and convex mirrors | 9.2.3 | 9.1, 9.2, 9.15 | 9.3, 9.4 | A | 16 |
| 3 | I3 | Telescope: angular magnification f_o/f_e, tube length, image size, Cassegrain | 9.7.2 | 9.13, 9.14, 9.27, 9.28, 9.29 | – | A | 16 |
| 4 | I2 | Compound microscope: m = (v_o/u_o)(D/f_e), tube length, final image at D or ∞ | 9.7.1 | 9.11, 9.12, 9.25, 9.26 | – | A | 14 |
| 5 | L2 | Lens maker’s formula, and the lens in another medium | 9.5.2 | 9.7, 9.31 | 9.6, 9.7 | A | 14 |
| 6 | L3 | Power of a lens and lenses in contact or apart | 9.5.3 to 9.5.4 | 9.10, 9.20a | 9.7, 9.8 | A | 14 |
| 7 | R3 | Total internal reflection, critical angle, light pipe | 9.4 | 9.5, 9.17, 9.21 | – | A | 12 |
| 8 | I1 | Simple microscope: magnification versus magnifying power | 9.7.1 | 9.22, 9.23, 9.24, 9.25 | – | B | 11 |
| 9 | P1 | Prism: n from the angle of minimum deviation, in air and in water | 9.6 | 9.6, 9.21 | – | A | 10 |
| 10 | R2 | Apparent depth, and the shift through a slab | 9.3 | 9.3, 9.16 | – | A | 10 |
| 11 | M2 | Which image: real or virtual, bigger or smaller, by object position; half-covered mirror | 9.2.3 | 9.15 | 9.1, 9.2 | B | 9 |
| 12 | R1 | Snell’s law and relative refractive index | 9.3 | 9.4 | – | B | 5 |
| 13 | M3 | Plane mirror turned through an angle: the reflected ray turns twice as much | 9.2 | 9.30 | – | C | 3 |
| 14 | R4 | Refraction at a single spherical surface | 9.5.1 | – | 9.5 | C | 3 |

## Build waves (textbook order)

| Wave | Game (working title) | Concepts | Cluster weight | Exercises and examples it must test |
|---|---|---|---|---|
| 1 (done) | Mirror Arcade (§9.2): hero projects, reflects and magnifies with mirrors | M1, M2, M3 | 28 (18.1%) | Ex 9.1, 9.2, 9.15, 9.30; Examples 9.1 to 9.4 |
| 2 (done) | Refraction Arcade (§9.3 to 9.4): apparent depth, light pipe, critical angle | R1, R2, R3 | 27 (17.4%) | Ex 9.3, 9.4, 9.5, 9.16, 9.17 |
| 3 (done) | Lens Lab (§9.5): lens formula, lens maker, power and combinations | L1, L2, L3 | 46 (29.7%) | Ex 9.7 to 9.10, 9.18 to 9.20, 9.31; Examples 9.6 to 9.8 |
| 4 (done) | Prism Lab (§9.6) | P1 | 10 (6.5%) | Ex 9.6, 9.21 |
| 5 (done) | Microscope Lab (§9.7.1): magnifier and compound microscope | I1, I2 | 25 (16.1%) | Ex 9.11, 9.12, 9.22 to 9.26 |
| 6 (done) | Telescope Lab (§9.7.2) | I3 | 16 (10.3%) | Ex 9.13, 9.14, 9.27 to 9.29 |

R4 (refraction at one spherical surface, weight 3) is left out on purpose: it is a stepping stone to the lens formula and carries almost no questions.

## Notes for the builders

- Games live in `src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/<id>/`. The chapter name must match `src/curriculum/physics/class-12.json`.
- Use `src/core/arcade.ts` (hero banner, HUD, hearts, rounds, score, charges, drag handles, juice) and `src/core/neon.ts`, and keep the rules in `logic.ts`. See AGENTS.md section 5, items 13 and 14.
- Cartesian sign convention throughout (distances measured from the pole or optical centre, positive in the direction of the incident light): u is negative for a real object. For mirrors f = R/2, negative for a concave mirror and positive for a convex one. For lenses f is positive for a convex lens and negative for a concave lens.
- Units to drill: cm and m, dioptre (1 D = 1 m⁻¹), degrees, magnification as a signed number.

## Status

All six games are built, in the arcade style (hearts, rounds, score, charges, fading aids, drag handles), each borrowing a famous game's loop. Exercise 9.29 (the Cassegrain telescope) is not covered: the textbook answer gives 315 mm from the smaller mirror without saying on which side the image forms, and I could not verify the sign convention. R4 (refraction at a single surface, weight 3) is also left out.
