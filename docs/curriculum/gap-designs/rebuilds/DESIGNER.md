# Instructions for a rebuild designer

You design **rebuild briefs** for Concept Arcade, a set of free browser games for NCERT Class 12 Physics (Vite + TypeScript, deployed to GitHub Pages). Sonnet builders implement your briefs later.

## Limits

- Do not write or edit any code in `src/` or `tests/`.
- Do not run tests, builds, servers or `npx`.
- Small `node` scripts that check numbers are fine. Put them in `C:\Users\ANUBHA~1.SHA\AppData\Local\Temp\claude\C--dev-Personal-Projects-Class-12-Physics\ef0a89c3-bb77-47d9-b101-4245952116f5\scratchpad\rebuild-checks\chNN\` and write them with the Write tool, never shell heredocs.
- Other designers and builders work in the same repo at the same time. Write only your own brief files.
- Do not edit `rebuilds/README.md`; the reviewer keeps its index.

## What the owner wants

The owner's words:
- "I don't like Q&A challenge. Redesign the game in a realistic setting where objective is achieved by solving the challenge."
- "You may need to redesign the game on the updated guideline."
- "The challenge should be not bookish, it should resonate with the gamers. For example: Spider-Man wants to swing from building A to building B, x apart, at height y. Where should he fix his webs so that he doesn't crash into the ground? And the scene, characters and animations should truly show what's happening, for both success and failure."

What follows from that:
- The owner liked "Planet night", a stargazer focusing Saturn, Jupiter and Neptune. Prefer real-world wonder and real jobs over diagrams.
- Never use the workshop, crafting, shop, customer-order or inventory-card style.
- Every game has a hero (any thing) with an objective that only the concept reaches.
- Every game in a chapter has a different core verb.
- Briefs must be so complete that a lower-level model has no chance of making a mistake.

## Read first, in this order

1. `AGENTS.md`, all of it, especially section 5, items 1 to 17.
2. `docs/curriculum/gap-designs/README.md`, especially every bullet of "A miss must not show the answer either" and "Helpers fade". These are lessons from real builds.
3. `docs/curriculum/gap-designs/rebuilds/README.md`: the rules for a rebuild, and the brief format.
4. `docs/curriculum/gap-designs/20-capacitor-bench.md`, the model brief, and the code it produced in `src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-bench/`.
5. The engine: `src/core/dialgame.ts` (`DialLevel.delay` may be a function), `src/core/arcade.ts`, `src/core/mathkit.ts`, `src/core/neon.ts`, and `src/core/aidflash.ts` (`helperOn`, `paidFlash`: the round 2 helper shows only after a paid check, and true values only on a win).
6. For each of your games:
   - all its files;
   - its old UI test, found with `grep -l "<chapter folder>/<id>/" tests/*.ts`;
   - `docs/curriculum/physics-class-12/chNN-concept-weights.md`.
7. The chapter text, extracted for reference, at `C:\Users\ANUBHA~1.SHA\AppData\Local\Temp\claude\C--dev-Personal-Projects-Class-12-Physics\ef0a89c3-bb77-47d9-b101-4245952116f5\scratchpad\txt\leph1NN.txt` (leph104 is chapter 4, and so on). Use it for facts and section or exercise numbers only. Never copy NCERT text or figures into a brief.
8. To avoid repeating what other designers chose, glance at the briefs already in `rebuilds/` and the hero names they used.

## For each game, one at a time

1. **List** every concept and level it teaches now. Nothing may be dropped.
2. **Choose a setting.** Pick a real setting, a hero and an objective.
   - The physics consequence plays out on screen, and success and failure look like what they are.
   - Vary settings and core verbs across your games and the whole chapter.
   - Pick what makes the physics honest and the game fun.
3. **Design levels and rounds** with pools of real numbers. Write a `node` script that checks every row:
   - exactly one winning setting over the full dial range;
   - the start never wins and tells nothing;
   - no wrong setting lies on a tolerance edge;
   - displayed targets solve back to the answer;
   - the answer is not at a dial end, and not in the same place every round;
   - rounds of one level never share an answer.

   Put the checked rows in the brief exactly.
4. **Write the brief** to `docs/curriculum/gap-designs/rebuilds/chNN-<id>.md`, in the format of `rebuilds/README.md`.
5. **Write the game.json** to `docs/curriculum/gap-designs/rebuilds/json/<id>.json`.
   - Keep the id and `order`. Give it a new, unique title and summary.
   - Check its lengths with a script:
     - summary 60–140 characters;
     - learningOutcome ≤ 200 characters, with a curly apostrophe;
     - each level's adds 5–160 characters;
     - 2–4 hints, each ≤ 200 characters;
     - ≤ 6 concepts, each ≤ 60 characters;
     - ≤ 5 misconceptions;
     - ncertRef starts with "Section N.N";
     - level 1 kind is "foundation", and tiers never go down.
   - Check that the title and summary are unique against every `game.json` in `src/games` and in `rebuilds/json/`.
6. **Design for UX.** Apply every item of the "UX checklist" in docs/curriculum/gap-designs/README.md, and write each one into the brief with exact coordinates and sizes. That covers: the goal line on the canvas, the player's own setting with its unit beside its handle, handles of at least 18 px radius with a grip and a first-touch pulse, legible text, an instant response to Fire, short teaching after a win, a living hero, rounds that look different, accessibility and comfort.
7. **Leak-proof every level.**
   - `hit` is a fixed point.
   - A miss gives the direction only, with fixed effects.
   - Nothing on a miss gives the answer in one step.
   - The true path appears only on a win, in the round 1 live helper, or around a paid check.
   - Helpers: round 1 live; round 2 only for 1.5 s after a paid check (`helperOn`); round 3 none.

## Final report (short)

- For each game: the brief path, the setting and hero in one line, the core verb, and any concept you could not fit (and why).
- Anything you found wrong in the old games.
- The results of the check scripts.
