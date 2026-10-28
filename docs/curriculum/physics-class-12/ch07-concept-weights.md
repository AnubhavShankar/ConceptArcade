# Chapter 7 concept weights

Class 12 Physics, Chapter 7: Alternating Current (NCERT 2026-27 reprint, read locally; topics and exercise numbers only, no NCERT text or figures). Built the same way as `ch01-concept-weights.md`: **list ALL concepts, weight them by the questions asked, build in textbook order, one game at a time, each level mirroring a named exercise or example.**

## How the weight is computed

`score = 2 × (NCERT exercises that test it + worked examples that test it) + board tier` where tier A = 6, B = 3, C = 1.

- The exercises (7.1 to 7.8) and the 10 worked examples are counted directly. An example-to-concept link is a best reading; correct it if you find one that is off.
- The tier is my judgement (the reactance, impedance, resonance and power numericals are A). It is not measured from papers.
- The exercise list in the text extraction ends at 7.8; some exercises are mapped to the concept they test most directly.

## Summary

| Concepts | Total weight | Covered by games |
|---|---|---|
| 8 | 90 | 48% |

## Every concept, heaviest first

| Rank | ID | Concept | § | Exercises | Examples | Tier | Score | Share | Games |
|---|---|---|---|---|---|---|---|---|---|
| 1 | A6 | Resonance: ω₀ = 1/√(LC), maximum current, V_L = V_C, quality factor | 7.6.2 | 7.6, 7.7, 7.8 | 7.9, 7.10 | A | 16 | 17.8% | ⬜ |
| 2 | A3 | AC through an inductor: X_L = ωL, current lags by 90°, no average power | 7.4 | 7.3, 7.5 | 7.2, 7.5 | A | 14 | 15.6% | ✅ |
| 3 | A4 | AC through a capacitor: X_C = 1/ωC, current leads by 90°, no average power | 7.5 | 7.4, 7.5 | 7.3, 7.4 | A | 14 | 15.6% | ✅ |
| 4 | A7 | Power in an AC circuit: P = V_rms I_rms cos φ, the power factor, wattless current | 7.7 | 7.5, 7.7 | 7.7, 7.8 | A | 14 | 15.6% | ⬜ |
| 5 | A1 | AC through a resistor: rms and peak values, V = V_m sin ωt, average power V_rms I_rms, bulb ratings | 7.2 | 7.1, 7.2 | 7.1 | A | 12 | 13.3% | ✅ |
| 6 | A5 | Series LCR circuit: impedance Z = √(R² + (X_L − X_C)²), phase angle | 7.6.1 | 7.8 | 7.6, 7.8 | A | 12 | 13.3% | ⬜ |
| 7 | A8 | Transformers: V_s/V_p = N_s/N_p, step-up and step-down, power transmission | 7.8 | – | 7.7 | B | 5 | 5.6% | ⬜ |
| 8 | A2 | Phasors: current in phase with the voltage for a resistor; rotating-vector representation | 7.3 | – | – | B | 3 | 3.3% | ✅ |

## Build waves (textbook order)

| Wave | Game (working title) | Concepts | Cluster weight | Exercises and examples it must test |
|---|---|---|---|---|
| 1 (done) | Phasor bench (§7.2 to 7.3): rms and peak values, power in a resistor, phasors | A1, A2 | 15 (16.7%) | Ex 7.1, 7.2; Example 7.1 |
| 2 (done) | Reactance lab (§7.4 to 7.5): inductor and capacitor, reactance, phase, no power | A3, A4 | 28 (31.1%) | Ex 7.3, 7.4, 7.5; Examples 7.2 to 7.5 |
| 3 | LCR bench (§7.6.1): impedance, phase and current in a series LCR circuit | A5 | 12 (13.3%) | Ex 7.8(b); Examples 7.6, 7.8 |
| 4 | Resonance lab (§7.6.2): resonant frequency, current, voltages, Q | A6 | 16 (17.8%) | Ex 7.6, 7.7, 7.8; Examples 7.9, 7.10 |
| 5 | Power and transformers (§7.7 to 7.8): power factor and the transformer | A7, A8 | 19 (21.1%) | Ex 7.7; Examples 7.7, 7.8 |

Waves 2 (reactance) and 4 (resonance) carry most of the numericals.

## Notes for the builders

- Games live in `src/games/physics/class-12/ch07-alternating-current/<id>/`. Check the chapter name in `src/curriculum/physics/class-12.json` first.
- Every game follows AGENTS.md: real mechanic with animation, answers earned, wrong-answer messages never give the answer, a jsdom UI test, and a `summary` of 60 to 140 characters.
- Units to drill: mH, µF, kHz, Hz, rad/s, Ω, V (rms and peak), W, kW.
