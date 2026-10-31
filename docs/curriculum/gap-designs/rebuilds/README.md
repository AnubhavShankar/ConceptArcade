# Rebuilds: the old physics games of chapters 1 to 8

The owner, 2026-10-30: "I don't like Q&A challenge. Redesign the game in a realistic setting where objective is achieved by solving the challenge", and later: "You may need to redesign the game on the updated guideline."

There are 49 physics games in chapters 1 to 8. They are built on the old toolkit (`@core/sim`, `@core/dom`, `@core/draw`, `@core/quiz`), in which the player types in numbers worked out on paper. Each is rebuilt as an arcade game, the way `capacitor-bench` was rebuilt as "Lightning on Set" (brief `../20-capacitor-bench.md`, the model brief to copy).

Read `../README.md` first: every rule there applies, above all "A miss must not show the answer either". This file adds the rules for a **rebuild**.

## Rules for a rebuild

1. **Keep the id, the folder and `order`.** Links, the menu position and search keep working. The title may change, but it must stay unique. The summary must be new and unique.
2. **Keep every concept.** Every concept in the old `game.json` (`concepts`, each level's `adds`) and every row of `docs/curriculum/physics-class-12/chNN-concept-weights.md` that names this game must still be taught. Levels may be regrouped, but nothing may be dropped. Add a book item only if it is in the 2026-27 edition, and say where (section, exercise or example).
3. **No number entry.** The player turns dials, drags handles on the canvas, taps targets or flips switches. The physics then plays out on screen. Use `mountDialLevel` from `@core/dialgame` (preferred) or `createArcade`. Each level has 3 rounds, 3 hearts, charges `[1, 1, 0]` and fading helpers (`aid(k)`).
4. **A real setting, a hero and an objective** (AGENTS.md section 5, owner feedback):
   - The setting is a real place with a real job: a film set, a stargazer's rooftop, a lifeboat, a water park.
   - The objective is reached only by applying the concept.
   - The consequence plays out physically, for success and for failure.
   - The hero is any thing (a person, a robot, a duck), drawn with the gear of its role, a pose, idle life, an action effect and moods (item 17).
   - No trademarked names on screen. Each game takes its loop from a famous game, named only in a code comment.
   - Never the workshop, crafting, shop, customer-order or inventory-card style.
5. **A different core verb from the other games of its chapter.** Two games of one chapter must not both be "slide one dial to a number". Vary the verb: drag a handle, place an object, time a release, tap targets, set two linked dials, flip a switch.
6. **Leak rules, all of them** (README "A miss must not show the answer either"):
   - `hit` is a fixed point.
   - The start setting never wins.
   - The answer is never at a dial end or a fixed position.
   - A miss gives the direction only, with fixed effects, never effects proportional to the error.
   - Nothing on a miss gives the answer in one step.
   - The true path, curve or region is drawn only on a win (or by the round 1 live helper, or a paid test).
   - Helpers: round 1 live, round 2 only for about 1.5 s after a paid check, round 3 none.
7. **Numbers checked by script.** Every pool row in a brief is checked by a script before the brief is written:
   - exactly one winning dial setting;
   - no wrong setting sitting on a tolerance edge;
   - targets shown to 3 figures that solve back to the answer.

   List the rows exactly in the brief.
8. **Files.**
   - Overwrite `game.json` with the brief's finished JSON, which must pass the validator limits in `../README.md`.
   - Rewrite `logic.ts`, `logic.test.ts` and `index.ts`, and add `art.ts`.
   - Find the old UI test with `grep -l "<chapter folder>/<id>/" tests/*.ts`. Delete it, and create `tests/<id>-ui.test.ts` on `arcadeHarness` and `shellTests`.
   - Before deleting the old `logic.ts`, grep the repo for imports of it, because another game or test may use its physics helpers. If something does, keep those helpers exported.

## Brief format

Copy the sections of `../20-capacitor-bench.md`:

| # | Section | What it holds |
|---|---|---|
| 1 | Identity | id, folder, files, old UI test to delete, engine, book coverage, inspiration (comment only), core verb |
| 2 | What the student learns | the concepts the game teaches |
| 3 | The mechanic, physically | how the scene works, and what success and every kind of failure look like |
| 4 | Story and characters | the hero banner, the story and objective for each level, and every character with gear, pose, idle life, action and moods |
| 5 | Rules (`logic.ts`) | constants, types, pools copied exactly, judging and faults, and words (intel, hint, miss text, meter or test text, win text) |
| 6 | Screen and art | the layout constants, the helper table, the take for each level with timings, and what must never show |
| 7 | Controls and mount | dials, handles, test, fire, `hit`, `delay`, mount, ARIA |
| 8 | game.json | the finished JSON, written to `rebuilds/json/<id>.json` with its lengths checked |
| 9 | Tests | logic tests and the UI test, including a canvas recorder for the helper |
| 10 | Traps to avoid | anything a builder is likely to get wrong |

Name the brief `rebuilds/chNN-<id>.md`.

## Index

| Chapter | Game id | Brief | Status |
|---|---|---|---|
| 1 | coulomb-balance | `ch01-coulomb-balance.md` | built "Float the Bead" |
| 1 | quantum-of-charge | `ch01-quantum-of-charge.md` | built "The Quark Hunt" |
| 2 | capacitor-bench | `../20-capacitor-bench.md` | built "Lightning on Set" |
| 3 | drift-lab | `ch03-drift-lab.md` | built "The Slowest Race" |
| 3 | resistance-bench | `ch03-resistance-bench.md` | built "Line Down" |
| 4 | force-lab | `ch04-force-lab.md` | built "Beam Hall" |
| 4 | field-maker | `ch04-field-maker.md` | built "Turtle Compass" |
| 4 | ampere-lab | `ch04-ampere-lab.md` | built "First Plasma" |
| 5 | magnet-bench | `ch05-magnet-bench.md` | built "The Floating Act" |
| 5 | magnet-dipole-bench | `ch05-magnet-dipole-bench.md` | built "Pebble in Orbit" (brief finished 2026-10-31) |
| 6 | faraday-bench | `ch06-faraday-bench.md` | built "The Deep-Sea Beacon" (setting moved to a shipwreck dive) |
| 6 | lenz-lab | `ch06-lenz-lab.md` | built "Night Shift at Magnet Park" |
| 7 | phasor-bench | `ch07-phasor-bench.md` | built "Chai Before the Whistle" |
| 7 | reactance-lab | `ch07-reactance-lab.md` | built "Lights of the High Pass" |
| 7 | lcr-bench | `ch07-lcr-bench.md` | built "Main Stage Soundcheck" |
| 12 | bohr-orbits | `ch12-bohr-orbits.md` | built "Snap the Electron" (redesign) |

All built games: own tests green, not seen on screen. **Resumed 2026-10-31** (owner: finish the work left, two at a time): the half-done rebuilds were finished and the remaining briefs built. Not yet briefed: the other ~33 old games of chapters 1 to 8.

**Paused 2026-10-30.** The owner said: "Let's close this with whatever is done… We'll resume some day else." The designers for chapters 1 to 8 and for the bohr-orbits redesign were stopped partway; no brief beyond the four above was written. The three rebuild builds that had started (phasor-bench, magnet-bench, faraday-bench) were stopped, and their folders were restored to the committed versions.

To resume:
1. Review the four briefs above.
2. Re-launch the designers with `DESIGNER.md`. Their check scripts are in the session scratchpad and may be gone.
3. Build with `REBUILDER.md`.
