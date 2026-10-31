# UX pass: status when paused (2026-10-30)

The UX pass follows `UXPASS.md`: the UX checklist plus the round 2 helper rule.

**Done:** fog-rally, thrill-ride, mirror-mage, splash-patrol and rover-ridge.

**Not started:**

| Game | Notes from the builders |
|---|---|
| stage-lift | |
| air-time | |
| dock-drift | |
| signal-heist | |
| warp-lane | |
| capacitor-bench | |
| catch-rate | dim gauge and bars in round 2 |
| gear-train | dim ghost ring and dim "output" reading in round 2 |
| turf-war | dim "painted" counter in round 2, levels 1 to 6 |
| portal-line | dim graph (L1), dim "doors in use" (L2) and dim ghosts (L4-5) in round 2; the p and q handles in L4-5 have radius 10, so raise them to at least 18; the L4-5 tracks sit at y = 288 and 322, so check `tests/portal-line-ui.test.ts` before moving them |
| drone-dispatch | dim guide line and size readout in round 2; the plane handle has radius 12, so raise it to at least 18 |
| slit-dash | dim stripes (L1), the 0.55 patterns (L2) and the waves (L3-4) in round 2; the "stripe spacing" text is always on, round 3 included |

**Leak fixes not done** (follow `FIXER.md`; the findings are in `2026-10-30-maths-leaks.md`):
- **room-keeper**: the round 3 count pool is so small that blind guessing wins, and the round 2 helper stays dim but visible all the time.
- **card-sharp levels 1 to 3**: the level 1 miss text gives the counts, the level 2 and 3 miss texts print the product and the chance, and the round 2 helper is not gated.
- **hole-in-the-wall level 5**: it has the same "came out at" miss text and dim round 2 helper that were fixed in levels 1 to 4.

**Smaller items the fix builders reported but left alone:**
- **telescope-lab level 1**: the "zoom on the eyepiece end" inset draws the player's own eyepiece focus against the objective's focus in every round, the boss round included. A player can line them up by eye.
- **microscope-lab level 1**: the old winning window is so narrow that the exact answer rounded to 0.1 can miss (f = 10 wins at 7.2, not 7.1).
- **photon-cannon level 3**: the engine's drag handles sit on the player's own line, so part of it shows in rounds 2 and 3.
- **bohr-orbits**: its rounds are the same every play. Its fun redesign, which the owner asked for, has not been written yet.
- **refraction-bench level 5**: one boss row in six is still the bare fibre (90°).

**Owner decision pending: splash-patrol.** A miss names the first wrong joint and what was wrong there. With 3 hearts and up to 4 joints, a player can learn joints by missing. The brief designed it this way, and changing it is a redesign.
