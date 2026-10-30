# Leak audit of the newer physics games, 2026-10-30

This audit was read-only: nothing was edited or run. Paths are under `src/games/physics/class-12/`. Round 2 means assist 1 and round 3 means assist 2. The fault letters follow `2026-10-30-maths-leaks.md`.

There are two fixes that apply to almost every game:
- **E-dim.** In round 2 the helper must show **only for about 1.5 s after the paid check**. It must not stay on dimly all the time. Update the hint text to match.
- **`live = assist===0 || shot!==null`.** This draws the round 1 helper, numbers included, after any miss, round 3 included. Use `live = assist===0 || (shot && shot.ok)`. On a miss draw only fixed-size, direction-only effects.

## microscope-lab (ch09)
- **[E] L1, index.ts:98-116.** The round 2 dim eye view is live: its size and the sharp/blur flip find the near-point edge.
- **[D][E] L2, index.ts:191-195.**
  - The "LOCK SIGNAL" meter is live in round 2 and appears after any miss in round 3.
  - It scales with the distance to the true pair, so two misses triangulate the answer.
  - Fix: remove it from misses; in round 2 show it only after a paid check.
- **[C] L2, logic.ts:191.** The miss prints the player's own total magnification and final image distance. Fix: direction only.

## mirror-bench (ch09)
- **[C] L1, logic.ts:212.** The miss prints the true image distance `img.dist`. Fix: "in front of" or "behind the wall" only.
- **[D] L1, index.ts:109-127.**
  - A miss draws the ray diagram and the real image at its true place ("the image forms here").
  - The blur is proportional to the error.
  - The virtual branch (l.134) draws the true v and m.
  - Fix: a fixed blur, no image marker.
- **[A][B][D] L2.**
  - The bar starts at 8, and row `[10,40]` has behind = 8, so the start wins (index.ts:152, 166).
  - `hit` is the true image spot (index.ts:162).
  - The image car drives to the true image position, and a red gap bar is drawn from it (l.196-220).
  - Fix: a start that no row has as its answer, a fixed `hit`, and "short of" or "beyond" with a fixed-length marker.
- **[E] L3, index.ts:294.** Round 2 draws the live image against the ring all the time (`visible = 0.3`).
- **[C][D] L3, logic.ts:218-219 and index.ts:293-297.**
  - A miss prints the player's own magnification.
  - Round 3 shows the live face against the ring on a resolve, with a radius of 14·m.
  - Fix: a fixed size on a miss, direction only.

## prism-lab (ch09)
- **[A] L3, logic.ts:83 and 86.** Row `[60,1.524]` has iSol = 29.75°, and the start of 30 lies within the tolerance of ±0.51. Fix: move the start.
- **[D] L1-2, index.ts:145-154.** `shown = R.assist===0 || resolving` draws the crystal at the true sweet-spot exit after a miss. Fix: do not draw it on a miss.
- **[E] L1-3, index.ts:157.** `live` includes `R.assist===1 && A.phase==='play'`, so the whole beam path is live in round 2. Fix: remove that clause.
- **[C] L1-2, logic.ts:196 and 204.** The miss prints the player's own bend D. Fix: "bent too much" or "too little" only.

## refraction-bench (ch09)
- **[D] L1, index.ts:107-109.** A miss draws the exact refracted ray of the hidden media, to scale. Fix: draw the outgoing leg at a fixed angle beside the detector.
- **[D] L2, index.ts:212-215.** After a shot, a red line "Needle seems to be here" marks the answer position, and the blur is proportional to the error. Fix: nothing on a miss, or a fixed blur.
- **[B][D] L3.** `hit` is the true apparent position (index.ts:237), and a ghost pin appears after a miss (l.273-278). Fix: a fixed `hit`, and no ghost on a miss.
- **[D] L4, index.ts:322-337.** After a miss the fan includes the rays at ±θc, so the edge of the yellow rays is the answer. Fix: a fixed fan.
- **[F] L5, logic.ts:179 and 99.** Round 3 is always `[1.5, 1]`, whose answer is 90°, the end of the slider. Fix: add rows, or extend the dial.

## lens-bench (ch09, levels 1, 2, 3 and 5)
- **[A][C][D] L1.**
  - The grind start of 30 equals the answer of row `[1.5,30]` (logic.ts:124).
  - The miss prints f_own (logic.ts:396).
  - The focus is drawn at the player's own f, to scale (index.ts:103-115).
  - Fix: move the start, use direction-only text, and put the focus at a fixed offset (like `curvedMissDen` in level 6).
- **[C][D] L2, logic.ts:400 and index.ts:160-193.** The miss prints "pair measures p D" and draws rays at the player's own power, in round 3 too. Fix: "too converging" or "too diverging" only.
- **[A][C][D] L3.**
  - The position starts at D/2, which is the answer of row `[80,1,20]` (index.ts:229).
  - The miss prints v and the magnification (logic.ts:404).
  - The blur is proportional to the error, and "picture forms here" is drawn (index.ts:289, 296).
  - Fix: move the start, direction only, a fixed blur.
- **[F][C][D] L5.**
  - The answers cluster (target rows 1.25, 1.20, 1.20, 1.25; diverge rows 1.80, 1.75, 1.80), so two guesses cover every row (logic.ts:114-115).
  - The miss prints f′ (logic.ts:408, index.ts:482).
  - The lens fades in proportion to the error (index.ts:459, 472).
  - Fix: widen the pools, direction only, a fixed fade.

## telescope-lab (ch09, levels 1 to 3)
- **[C] L1 and L3, logic.ts:276.** The miss prints the player's own M and final image distance. Fix: direction only.
- **[E] L1 and L3, index.ts:139-158.** Round 2 has a live dim scope view.
- **[C][D] L2.**
  - The miss prints "the image is X cm across", so fo_true = fo_own·plate/X (logic.ts:271).
  - On a resolve the player's image ring is drawn against the plate ring, to scale (index.ts:227-241).
  - Fix: direction only, and a fixed ring on a miss.
- **[F, low] logic.ts:96 and 181.** The rounds are the same every play.

## light-dimmer (ch10)
- **[E] L1, index.ts:49, 52-57.** A dim pattern is live in round 2.
- **[D] L1, index.ts:48 and 73-83.** After a miss the full pattern for the player's own width is drawn, plus their dark-band dot on the cm scale, so a_true = a_own·sin(θ_dot)/sin(θ_target). Fix: a dot at a fixed offset on the correct side.
- **[F] L2-3, logic.ts:61 and 64.** The whole 3-value pool is shuffled with no slice, so rounds 1 and 2 give away round 3. Fix: add values and slice 3.
- **[C, low] L2-3, index.ts:169 and 221.** The player's own output fraction is printed after a shot.

## matter-waves (ch11)
- **[C][D][E] L1, index.ts:52-66.** On a resolve, `implied = n·photonE` is printed and drawn, so n_true = n_own·P/implied. The round 2 bar is live.
- **[C][D][E] L2, index.ts:139 and 146.** "your electron: λ nm" is printed and drawn, so V_true = V_own·(λ/target)². It is live in round 2.
- **[C][D][E] L3, index.ts:215.** The player's own cut-off λ is printed, so kV_true = kV_own·λ/target. It is live in round 2.
- Fix for all three: only a fixed over/under effect on a miss; numbers only after a paid check.

## bohr-orbits (ch12)
- **[B][D][E] L1.**
  - `hit` is the winning ring (index.ts:33).
  - After a miss, every ring with n = 1..5 is drawn with labels (l.38-51).
  - Round 2 draws dim rings.
  - Fix: `hit` on the player's own setting or a fixed point, and no rings on a miss.
- **[D] L2, index.ts:111-113.** "A lap would take lapNow" exposes r_n. Fix: print nothing on a miss.
- **[F, low] L2-3, logic.ts:60-66.** The rounds are fixed.

## energy-ladder (ch12)
- L1 is clean.
- **[D][E] L2.** Every key energy is printed after a miss (index.ts:126), and they bound the winning interval. Round 2 draws the doors, the electron and "N lines" live (l.110-129).
- **[C, low] L2, logic.ts:105.** The player's own line count is printed.
- **[C, low] L3, logic.ts:107-110.** The texts give a verdict on each dial.

## rutherford-range (ch12)
- **[C][D] L1, index.ts:45-48 and 76.** "Turns back at d fm" is printed for the player's own k, so k_true = k_own·d_own/target. Fix: a fixed-length mark, no number.
- **[C][D] L2.** The same label is printed for the player's own Z.
- **[F, low] L2, logic.ts:31.** The Z pool has only 4 values.

## binding-lab (ch13), the most direct leak
- **[D] L1, index.ts:58-62 and 46-49.** "real: X MeV" and Δm are drawn on any shot, a miss included.
- **[D] L2, index.ts:120-124.** "real Q = …" is drawn after any shot.
- **[D] L3, index.ts:183-187.** "real: …" is drawn after any shot.
- **[E] L1, index.ts:49.** The dim Δm is shown in round 2.
- **[F, low] logic.ts:63-79.** The rounds are fixed.
- Fix: show the "real" values only when `shot.ok`.

## nucleus-builder (ch13, level 3)
- **[E] index.ts:212-216.** Round 2 shows the dim ✓/✗ for A and Z live.
- **[F] logic.ts:60-67 and 90-91.** Round 3 is always carbon-11, so the answer is always (11, 5). Fix: add β⁺ rows.
- **[C, low] logic.ts:128-130.** The texts give a verdict on each dial.

## photon-cannon (ch11, level 3)
- **[A][F] logic.ts:47 and index.ts:183.** φ starts at 3.00, the answer for row `[3.0]`. The h dial's answer is always 6.63. Fix: move the start.
- **[D] index.ts:222-233.** On a resolve the player's own line is drawn against the public points, so the offsets correct the slope and intercept. Fix: a fixed tilt or offset on a miss.
- **[E] index.ts:225-229.** Round 2 has a dim live line.

## wavefront-run (ch10, level 1)
- **[E] index.ts:57-82.** Round 2 draws dim crests and karts live.

## gap-jump (ch14)
- **[E] L1, index.ts:49-54.** Round 2 has a dim photon bar, "photon x eV" text, and a colour flip at the answer.
- **[D] L2, index.ts:113-128.** The labels "spare electron" and "a hole" give the carrier type in every round.
- **[E] L2, index.ts:134-141.** Round 2 shows live ✓/✗.
- **[F, low] logic.ts:75-83.** The rounds are fixed: round 1 is always a donor and round 2 always an acceptor.

## junction-run (ch14)
- **[E] L1, index.ts:49-67.** Round 2 shows a dim hill with "barrier X V" live.
- **[C][D] L1, index.ts:66.** The player's own barrier is printed after a miss.
- **[D][F][E] L2.**
  - After a miss in round 3 the true output trace is drawn (index.ts:120-138), and counting its pulses gives f.
  - The kinds are fixed ['half','full','full'], and f3 is the other value of {50, 60} (logic.ts:91-92).
  - Round 2 has a dim live output.
- **[E, low] L3, index.ts:203-211.** Round 2 shows dim ΔV and ΔI live.

## Ranking (worst first)
1. binding-lab
2. mirror-bench
3. prism-lab
4. bohr-orbits
5. refraction-bench
6. matter-waves
7. rutherford-range
8. lens-bench (levels 1, 2, 3 and 5)
9. energy-ladder level 2
10. telescope-lab
11. microscope-lab level 2
12. junction-run
13. light-dimmer
14. photon-cannon level 3, gap-jump, nucleus-builder level 3 and wavefront-run level 1
