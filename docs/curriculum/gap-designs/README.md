# Gap designs: games for the concepts the 2026-10-30 audit found uncovered

Each `NN-<id>.md` file in this folder is a complete build brief for one game, or for new levels in an existing game. The briefs are written to be implemented by an agent that has not seen the design discussion, so they state every number, string, file and test. **If a brief and your own idea differ, follow the brief.** If a brief is wrong (a number that does not work, a test that cannot pass), stop and report it rather than improvising.

## Read before you build (in this order)

1. `AGENTS.md` sections 4 (validator rules), 5 (what a good game looks like, items 1 to 17), 6 (testing without a browser), 8 (routine), 10 (Windows gotchas).
2. This README.
3. Your brief.
4. The reference files your brief names (usually `ridge-runner` for a dial game, `card-sharp` for a tap board, `flow-control` for real-time play, `rooftop-ranger/index.ts` functions `head`, `rifle`, `shooter` for character detail).

## Hard rules for every build

**Files.** A new game is one folder `src/games/mathematics/class-12/chNN-<slug>/<id>/` (or `physics`) holding `game.json`, `logic.ts`, `logic.test.ts`, `index.ts`, plus `tests/<id>-ui.test.ts`. Do not touch shared files (`src/core/*`, other games) unless your brief says so. The chapter folder names already exist; reuse them exactly.

**Logic is pure.** `logic.ts` has no DOM, no canvas and no `Math.random`. Randomness comes only from the `random` argument (the seeded `ctx.random`), through `shuffle` from `@core/quiz`. Every judge, text and number lives in `logic.ts` and is unit-tested.

**Exactly one winner.** Every round has exactly one winning setting. The logic test scans every reachable setting (every dial value, every combination of cells) and asserts that only the answer wins. The start setting is never the answer.

**Never leak the answer.** A miss text describes what the player's setting did (the truck stalled at x = 2.5, the shot went over), never the right value. The picture is never to scale where the answer could be measured by eye. No label, pose or prop gives the answer away.

**A miss must not show the answer either (lessons from the first builds).** The same round is replayed after a miss, so:
- `hit` (where the burst and the "−1 ♥" float appear) must never be the winning position; use the player's own setting or a fixed point.
- A miss animation shows what the player's setting did. It must not draw the true path to the true target (for example a drifting robot must not hit the wall at the right height). Show only the direction, as the miss text does.
- Every miss must look like a miss on screen, and the winning setting must look like a win: check the animation's own formula against `judge` for every reachable setting.
- A miss must not print or draw a quantity from which the answer follows in one step. For example, if the player knows their own input w, the output rate w·f′(a) gives away f′(a). Miss texts give the direction only. Bars, fills and spins on a miss take fixed values (for example 0.55 of the target when short, 1.45 when over), never values proportional to the player's result. Only the paid test run (a charge) may show numbers.

**UX checklist (every game and every fix; owner, 2026-10-30: "hope you are improving the game UX too, as you review").** Most players are students on phones. Check each item in the code, since none of this has been seen on screen:
1. **The goal is on the canvas.** At round start, the round's goal shows on the scene in one short line, for example `Wake TITAN-7: core needs 32 µC`. It must not sit only in the text panel under the canvas.
2. **The player's own setting is readable on the scene.** Show it next to its handle, with its unit (`8 kV`, `4 mm`). The target is shown the same way when it is a given fact.
3. **Handles are easy to grab.** Each drag handle has radius ≥ 18 px (about 44 px on a phone), a visible grip (ring plus arrows ⇕ or ⇔) and a highlight while dragged. Level 1 round 1 pulses the handle with a small "drag" cue until the player first touches it.
4. **Text is legible.**
   - Scene text is at least 11 px at 640 wide.
   - Labels never overlap the hero, the target or each other.
   - Contrast is high against the dark scene.
   - Colour is never the only cue: pair it with a word or symbol.
   - A busy scene shows at most 3 numbers besides the player's own setting.
5. **The action answers at once.** Within 100 ms of Fire something moves (lever, wind-up, ACTION!). The verdict lands at the moment of impact, and a win and a miss look and sound completely different.
6. **After a win, teach briefly.** The working is short (two or three lines) and the Next button is easy to find. After a miss, the direction text says what to change in plain words ("too much charge: lower the voltage"), never the answer.
7. **The hero feels alive.** It has idle motion, a reaction to every action and a mood after every result, so the screen is never static (AGENTS.md item 17).
8. **Variety.** Within a level the three rounds look different (a new planet, a new robot pose, a different time of day). The boss round looks like a boss round.
9. **Accessibility.**
   - Every control has an aria-label.
   - Sliders work from the keyboard.
   - The scene's ARIA text describes the setting.
   - The engine's reduced-motion check is respected: no big shakes or flashes when `prefers-reduced-motion` is set.
10. **Comfort.** No flashing faster than 3 times a second. Full-screen flashes are kept short, with alpha ≤ 0.45.

**Invalid input is free.** An incomplete or impossible input calls `A.freeNote(...)` and costs nothing.

**Helpers fade.** Use `aid(k)` from `@core/dialgame`:
- Round 1 (`assist 0`) has the live helper.
- Round 2 (`assist 1`) shows the helper **only for about 1.5 s after a paid check**. Updated 2026-10-30: a dim helper that stays on all the time made the paid check pointless and round 2 trivial.
- Round 3 (`assist 2`, the BOSS) has none.

Charges are `[1, 1, 0]` unless the brief says otherwise.

**Timing.** The engine plays each attempt for exactly `RESOLVE = 2.4` s (`src/core/arcade.ts`). Every consequence animation must finish inside 2.4 s. Pass the moment of impact as the `delay` argument of `A.resolve(ok, text, at, delay)` (or `delay` in a `DialLevel`), so hearts, score and text land when the crash or the win happens on screen.

**Scene.** The canvas is 640 × 340 logical pixels. Use `PAL` colours from `@core/arcade`, `line`, `text`, `glow`, `trace`, `along` from `@core/neon`, and `backdrop`, `face`, `verdict`, `num`, `poly`, `piText`, `track`, `trackHandle` from `@core/mathkit`. Pair every colour with a symbol or word (⬆ GAS, ⬇ BRAKE), because colour must not be the only cue.

**Characters (AGENTS.md item 17).** The hero and every target or enemy is drawn as what it is, with the gear of its role, a pose that suits the scene, idle life (breathing, blinking, bobbing, exhaust), an action effect at the moment of the attempt, and moods (happy while waiting, worried with a sweat drop on a miss, cheer on a win, dizzy after a crash). Each brief lists the parts to draw. Keep each character in its own function in `index.ts` (or `art.ts` if `index.ts` passes 400 lines).

**Real names.** Heroes are original characters inspired by famous games. Never use a trademarked character or game name in anything a student sees (titles, stories, labels). The inspiration goes in a code comment at the top of `index.ts`.

**game.json limits** (the validator and `tests/seo.test.ts` enforce them): `summary` 60 to 140 characters and unique; `title` unique, at most 60; `learningOutcome` at most 200, with a curly apostrophe (’) if it needs one; 1 to 6 levels; level 1 `kind` is `foundation`, later levels `complexity` or `concept`; `tier` never goes down (`concept` → `application` → `challenge`); each level `title` 3 to 50, `adds` 5 to 160, 2 to 4 `hints` of at most 200; at most 6 `concepts` of at most 60; `ncertRef` starts with `Section N.N`. The briefs give finished game.json text that already fits; copy it exactly.

**Ids and test names must be unique.** Existing game ids and test files are listed by `ls src/games/*/class-12/*/` and `ls tests`. The briefs pick names that are free on 2026-10-30; check again before you create files.

**Tests.** `logic.test.ts` covers the rules (numbers checked against a numerical computation of the real function), the one-winner scan over many seeds (`Array.from({ length: 80 }, (_, i) => i * 7919 + 13)`), the fading helpers, and that miss texts never contain the answer. `tests/<id>-ui.test.ts` uses `tests/helpers/arcade-harness.ts` (`arcadeHarness` + `shellTests`) exactly like `tests/ridge-runner-ui.test.ts`, plus the game-specific checks in the brief.

## How to work (fast, and light on memory)

- Write files with the Write and Edit tools, never shell heredocs.
- While building, run only your own tests: `npx vitest run <path-to-logic.test.ts> tests/<id>-ui.test.ts` and `npx tsc --noEmit`. Never start `vitest` in watch mode, `npm run dev` or any server. Never use browser tools.
- Run `npm run check` **once**, at the end, and only one test process at a time. If it fails, fix and run it again.
- Do not commit, push, or change git state.
- Report: files created or changed, the `npm run check` result (pass or the failing output), anything in the brief you could not follow and why, and "not seen on screen" (no browser was used).

## Briefs

| # | Brief | Ch | What it covers | Kind |
|---|---|---|---|---|
| 01 | [Fog Rally](01-fog-rally.md) | Maths 6 | Increasing and decreasing functions, §6.3, Ex 6.2 | new game |
| 02 | [Stage Lift](02-stage-lift.md) | Maths 3 | Matrix addition, subtraction, scalar multiples, matrix equations, §3.4.1 to 3.4.4, Ex 3.2 | new game (+ a small `dialgame.ts` change) |
| 03 | [Air Time](03-air-time.md) | Maths 7 | Standard-form integrals (tan⁻¹, sin⁻¹, log), completing the square, §7.4, Ex 7.4 | new game (needs the 02 change) |
| 04 | [Dock Drift](04-dock-drift.md) | Maths 5 | Logarithmic differentiation, §5.5, Ex 5.5; inverse-trig derivatives, §5.3.3, Ex 5.3 Q9 to Q15 | new game |
| 05 | [Signal Heist](05-signal-heist.md) | Maths 7 | Integration using trigonometric identities, §7.3.2, Ex 7.3 | new game |
| 06 | [Thrill Ride](06-thrill-ride.md) | Maths 7 | Integration by parts, eˣ[f + f′], cyclic integrals, §7.6, Ex 7.6 | new game (game.json in `json/`) |
| 07 | [Mirror Mage](07-mirror-mage.md) | Maths 7 | Properties of definite integrals (split, a − x, [0, 2a], logs), §7.10, Ex 7.10 | new game (game.json in `json/`) |
| 08 | [Splash Patrol](08-splash-patrol.md) | Maths 5 | Points of discontinuity and non-differentiability, [x], moduli, §5.2, 5.3, Ex 5.1, Ex 5.2 Q9, Q10 | new game (game.json in `json/`) |
| 09 | [Matrix extensions](09-matrix-extensions.md) | Maths 3 | Hole in the Wall L5 (A² = kA − mI), Mirror Crystal L4 ((AB)′ = B′A′) | new levels |
| 10 | [Stage Lift rule cards](10-stage-lift-rule-cards.md) | Maths 3 | Building a matrix from a rule aᵢⱼ, Ex 3.1 Q4, Q5 | new level |

| 11 | [Laser Grid lines](11-laser-grid-lines.md) | Maths 11 | Equation of a line through two points, cartesian to vector form, Ex 11.2 Q4 to Q7 | new levels |

| 12 | [Field Claim scale](12-field-claim-scale.md) | Maths 4 | Scaling a determinant: det(kA) = kⁿ det(A), Ex 4.1 Q3, Q4 | new level |
| 13 | [Rover Ridge open plains](13-rover-ridge-open-plains.md) | Maths 12 | Unbounded regions, no maximum, empty region, ties along an edge, Ex 12.1 Q4, Q6 to Q10 | new levels |
| 14 | [Rooftop Ranger gadget](14-rooftop-ranger-gadget.md) | Maths 2 | Principal values of sec⁻¹, cosec⁻¹, cot⁻¹, Ex 2.1 Q3, Q7, Q8, Q10 | new level |
| 15 | [Calculus extensions](15-calculus-extensions.md) | Maths 6, 5, 8 | Catch Rate L4 (marginal cost), Gear Train L5 (trig chain rule), Turf War L5 (area along y) and L6 (∫√(a² − x²), Ex 7.7) | new levels |
| 16 | [Small maths extensions](16-small-maths-extensions.md) | Maths 1, 10, 13 | Portal Line L4, L5 (inverse, composition), Drone Dispatch L4 (vector addition), Card Sharp L4 (conditional probability rules) | new levels |
| 17 | [Warp Lane](17-warp-lane.md) | Maths 7 | Substitution in definite integrals, change of limits, reversed limits, §7.3.1, 7.9, Ex 7.2, Ex 7.9 | new game (game.json in `json/`) |
| 18 | [Modern physics extensions](18-modern-physics-extensions.md) | Physics 11, 13 | Photon Cannon L4 (intensity sets the current, frequency sets V₀), Nucleus Builder L4 (isotopes, isobars, isotones) | new levels |
| 19 | [Optics and wave extensions](19-optics-wave-extensions.md) | Physics 9, 10 | Lens Lab L6 (one curved face), Telescope Lab L4 "Planet night" (Cassegrain), Wavefront Run L3 (dispersion), Slit Dash L4 (coherent vs incoherent) | new levels |
| 20 | [Capacitor Bench rebuilt: Lightning on Set](20-capacitor-bench.md) | Physics 2 | Replaces the old number-entry game: Q = CV, C = Kε₀A/d, a panel with the charger on or off, air breakdown, u = ½ε₀E², §2.11 to 2.13, 2.15 | game rebuild (game.json in `json/`) |

## Not designed, and why

Every item of the 2026-10-30 audit has a brief above except these. Each is either outside a game loop or outside this edition of the book:

- **Matrices as data, and the order of a product** (Ex 3.2 Q19 to Q22): word problems and multiple choice on the same product Hole in the Wall level 2 plays; see brief 10 section 6.
- **|adj A| = |A|ⁿ⁻¹** and **A⁻¹ from a 3 × 3 identity** (Ex 4.4): multiple choice, or long arithmetic; the 2 × 2 case is Vault Tumblers plus brief 09; see brief 12 section 6.
- **Impact parameter** (§12.2.1) and **Thomson against Rutherford** (A7): the book treats both in words only. A game would need the out-of-book formula b = (d/2) cot(θ/2), or would be guesswork.
- **Properties of the nuclear force** (§13.5): qualitative facts (short range, charge independence, the 0.8 fm minimum) with no exercise. Better added to the Nucleus Builder win texts than played.

## Owner decisions (2026-10-30)

- **Ampère Lab level 5 (the toroid)** and **Materials Lab level 3 (Curie’s law, χ ∝ 1/T)** go beyond the 2026-27 edition (§4.7 is the solenoid only; §5 says only that χ depends on temperature "in a simple fashion"). The owner chose to **keep both** as they are.
- **Capacitor Bench**: the owner did not want a number-entry quiz, so brief 20 now rebuilds the whole game in a film-set setting instead of adding a fourth quiz level.
- Doc fixes already made on 2026-10-30: `docs/curriculum/physics-class-12/ch01-concept-weights.md` (C4, D1, C6, D2, D3 are covered; chapter 1 coverage is 97%, not 87%) and `ch11-concept-weights.md` (Davisson–Germer is not in this edition).
