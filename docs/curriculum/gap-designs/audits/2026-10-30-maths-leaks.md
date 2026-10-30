# Leak audit of the maths games, 2026-10-30

This audit was read-only: no files were edited and nothing was run. All paths are under `src/games/mathematics/class-12/`. `L` means level.

The fault letters come from `../README.md`, "A miss must not show the answer either":

| Letter | Fault |
|---|---|
| A | the start setting can win, or tells you something |
| B | `hit` sits at the answer |
| C | the miss text gives the answer in one step |
| D | a miss draws the true path, or an effect proportional to the error |
| E | a helper shows when it should not |
| F | position or blind guessing wins |

**Fix rule for E-dim (every game listed):** in round 2 (`assist 1`) the helper must show **only for about 1.5 s after the paid check**. It must not stay on dimly, which makes the check pointless. Use the "pulse" pattern from Laser Grid level 5. Update the round 2 hint text to match.

The games with E-dim, and where:
- room-keeper index.ts:86-98
- vault-tumblers index.ts:118
- track-joiner index.ts:102
- max-out index.ts:169-175
- ridge-runner index.ts:87, 113-120
- flow-control index.ts:193-201
- prism-split index.ts:141-142
- culture-dish index.ts:184-206, 212-225
- slope-surfer index.ts:98-100, 128-136
- break-shot index.ts:118-120
- panel-tilt L1 index.ts:101-103
- pachinko-bayes index.ts:80-84
- hole-in-the-wall index.ts:201-204, 222-227
- mirror-crystal index.ts:70-71, 92 (L1-2) and 108, 119-128 (in L3, round 2 is at full strength, not dim)
- laser-grid index.ts:262, 307-309
- field-claim index.ts:236-264
- card-sharp index.ts:157-161, 194-209, 229-234
- relay-tower index.ts:105-113

## Never reviewed before

**room-keeper**
- [F] L3, logic.ts:97-104: the count pool is tiny. Round 1 answers are {2, 3}, round 2 {5, 10} and round 3 {3, 15, 10, 2}, and the dial starts at 1, so blind guessing wins within 3 hearts. Fix: draw from more rows (n = 6, 7) and vary the dial range.
- [E-dim] L1: the lamps are dim and live in round 2.
- A and B are clean.

**relay-tower** (the worst of the games not reviewed before)
- [B] L1-3, index.ts:85: `hit` returns the satellite at the angle `r.ans`. Fix: use a fixed point such as `[C.x, C.y-120]`.
- [D] L1-3, index.ts:118-126: after 0.4 s every shot draws the satellite at the true angle, pink on a miss. Fix: draw it only when `shot.ok`.
- [F] L2, logic.ts:85-88: each round's answer is the same in every seed (π/4, then π/2, then 3π/4). Fix: add more rows for each slot (for example tan⁻¹ sums giving π/3 and 2π/3) and shuffle.
- [E] L1-3, index.ts:105-113: after Fire the principal-range arc is drawn even in round 3. The out-of-range miss text (logic.ts:97) also prints the range. Fix: omit both at assist 2.

**vault-tumblers**
- [E/C] L1-3, index.ts:118-135 and logic.ts:122-124: the ✓/✗ lamp on each plate (shown with `|| shot`) and the miss text "plate N stayed locked" give away the paid Plate check for free, in round 3 too. Fix: the miss text says only "the door stayed shut", and no lamps are drawn on a shot at assist 2.
- [F] L4, logic.ts:101, 119-120: the verdicts are a permutation of {1, 2, 3}, and d = 0 is the answer in 2 of 3 rounds. The miss text says which dial is wrong. Fix: one generic miss text, and choose the verdicts at random.

**track-joiner**
- [C] L1-3, logic.ts:125-126: the miss text prints the left piece's height or slope (in L1, k = (H − m0)/c; in L3 the corner text prints k exactly). Fix: direction only.
- [A] L3, logic.ts:77-86: the start (k = 0, m = 0) wins when p = 1, c = 1, q0 = −2, r0 = 1. Fix: re-roll when the answer is (0, 0).
- [D, low] index.ts:60-70: the y-frame is fitted to the finished track. Fix: use a fixed frame for each level.
- [E-dim]: in round 2.

**max-out**
- [A/E/D] L2-3, index.ts:154-167, 232, 277: `budget()` is drawn every frame in every round. Its fill is proportional to the objective relative to the best, and it turns green only at the optimum. Fix: draw it only inside the shot animation, with fixed fills (0.55 or 1.45).
- [C] all levels, logic.ts:144-161: the miss text prints the objective value. Fix: direction words only.
- [F] L4, logic.ts:116-118 and 95: the answers are only {±1, ±2}, round 2 is the negative of round 1, and the climber sits at b = 3·x* in every round. Fix: vary k and the positions, and widen the dial and the answers.

**ridge-runner**
- [B] L1-3, index.ts:72-76: `hit` is the true answer. Fix: use a fixed point.
- [D/E] L1-3 round 3, index.ts:85-101: the hidden ground curve is drawn after Fire, so a miss shows the true peak. Fix: draw the curve only when `shot.ok`.
- [A/F] L3, logic.ts:110, 118: `start = ans===lo ? hi : lo` tells the answer, and round 2 (`wantEnd`) always has the answer at a dial end. Fix: an unrelated start, and mix interior and end answers.
- [C] logic.ts:130-139: the miss text prints the slope and height at the flag. Fix: direction only.

**flow-control**
- [C] logic.ts:149-150 and index.ts:195-209: the miss text, the tank fill and "holds N" give the exact volume. Fix: say only "short of" or "over", with a fixed fill of 0.55 or 1.45.

**prism-split**
- [C] logic.ts:101: the miss text prints the original and the split at the first bad checkpoint, which is almost always x = −5.5. Fix: drop the numbers.
- [D, low] index.ts:150-156: green and red scanner dots show how many checkpoints match. Fix: colour every dot red on a miss.

**culture-dish**
- [C] L1, logic.ts:117: the text "degree is not defined" gives away the answer degree 0, and the other branches say which dial is wrong. Fix: one generic miss text.
- [F] L1, logic.ts:77: the kinds are fixed per round (the degree is always 1 in round 2 and always 0 in round 3). Fix: shuffle the specimen kinds across rounds.

**slope-surfer**
- [C] L1-4, logic.ts:176-180: the miss text prints the board's height at the beacon (for a direct ODE, C* = c + (yb − h)). Fix: "above" or "below" the beacon only.
- [A] L2 and L4, logic.ts:158: the start is 0 for every non-zero answer but `cmin` when the answer is 0, so the start tells the answer. Fix: a fixed start, or re-roll when the answer is 0.
- [D, low] index.ts:58-65: the frame is fitted to the true curve. Fix: draw from fixed bounds.

**break-shot**
- [C] L1-3, logic.ts:107-110: the miss text prints the angle and the dot product (in L1, λ* = λ − dot/o₀) or the shadow value. Fix: direction words only.

**panel-tilt**
- [D] L1, index.ts:113-118: after every shot, a miss included, the true normal a×b is drawn to scale. Fix: draw it only on a win.
- [E/A] L3, index.ts:71, 92-96: the "folded flat" label and the b vector are live in every round. Fix: gate both by assist.
- [A] L1, logic.ts:80: `start = ans.map(x => x===0 ? 1 : 0)` tells you a component is 0. Fix: start every dial at 0, and re-roll if the all-zero setting could win.
- [C] L3, logic.ts:125 (and L2 at line 123): the miss text prints the area S, and c* = c ± S/√(…). Fix: direction only.
- [F] L2, logic.ts:58-59: the answer is always c ∈ {1, 2, 3}. Fix: widen the pool.

**pachinko-bayes** (the second worst)
- [D] L1-3, index.ts:93-137: every shot, win or miss, animates the true gate counts and prints the tallies, ending on the true total. Fix: on a miss, play a generic drop (fixed counts, no tallies), and show the true tallies only after a win.
- [C, low] logic.ts:93-95: the miss text says which count is right. Fix: one generic text.

## Partly reviewed before

**hole-in-the-wall (L1-4)**
- [C] logic.ts:191: the miss text prints where the first mismatching vertex came out (in L2, a* = a + (H − out)/p). Fix: "vertex 1 landed outside the hole" plus a red ring of fixed size.
- [F] L4, logic.ts:147-148: there are only 8 answers. Fix: widen k (1 to 6) and add shears.

**mirror-crystal (L1-3)**
- [E/D] round 3, index.ts:70-86 (L1-2) and 108, 119-128 (L3): on a miss, Fire draws every mirror pair or sum cell with its ✓/✗ lamp, which is the whole paid Check. Fix: colour everything neutral on a miss, and gate the L3 flags in round 2.

**laser-grid (L1-4)**
- [C] the miss text prints a quantity that solves the level in one step:
  - L1, logic.ts:208: len = |v|/N.
  - L2, logic.ts:210: the dot product.
  - L3, logic.ts:211: cos θ.
  - L4, logic.ts:212: the clearance.
  - Fix: direction only.
- [E/D] L1, index.ts:276-286: the player's beam is drawn live in every round. Fix: gate it by assist, as L5 does.
- [D/E] L4, index.ts:293-295: the dashed clearance segment is drawn live in every round. Fix: hide it unless at assist 0, and give it a fixed length on a miss.

**field-claim (L1-3)**
- [D] L2 round 3, index.ts:241-247: the true line y = mx + c is drawn after a miss. Fix: do not draw it on a miss.
- [C] the miss text gives the answer away:
  - L2, logic.ts:162: it prints the triangle area (k* = k ± 2A/(|Δx||m|)).
  - L1, logic.ts:157-158: it prints the area, and the text "right area, wrong side" implies the mirror root.
  - L3, logic.ts:164-167: it says which beacon is on or off, which is the paid Check.
  - Fix: generic texts.

**rooftop-ranger (L1-4)**
- [D] L1-4, logic.ts:261-293 and index.ts:473-481: the miss tracer is drawn in the true geometry, so the ratio of the offsets gives the answer. Fix: on a miss, end the tracer at a fixed screen offset (±40 px) in the right direction.
- [F] L1 and L3, logic.ts:146-155: the answer pools are tiny (three angles). Fix: widen the pool, for example to 5 tilts from π/12 to 5π/12 with surd data.
- [A] L4, index.ts:402: a start at 0 now means the answer is π/2. Fix: a fixed start that is never an answer (re-roll the boss row with 6 if needed).
- [C, low] L1-2, logic.ts:181: the miss text prints the landing distance L. Fix: direction only.

**card-sharp (L1-3)**
- [C] L1, logic.ts:165-168: the miss text gives the counts missing, extra and wrong colour, so marking all 24 cards yellow prints |B| and |A∩B|. Fix: one generic text.
- [C, low] L2 (logic.ts:170) and L3 (logic.ts:171-172): the miss text prints the product and the chance at the player's value. Fix: direction only.

## Ranking (worst first)

1. pachinko-bayes
2. relay-tower
3. ridge-runner
4. max-out
5. panel-tilt
6. field-claim
7. track-joiner
8. slope-surfer and break-shot (joint)
9. laser-grid
10. rooftop-ranger
11. culture-dish, vault-tumblers, mirror-crystal, hole-in-the-wall, flow-control, prism-split, room-keeper and card-sharp
