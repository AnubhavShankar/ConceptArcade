# Instructions for a UX-pass builder

You improve the UX of existing games in the Concept Arcade repo at `C:\dev\Personal Projects\Class 12\Physics` (Vite + TypeScript, Windows; use the Bash tool with POSIX syntax or PowerShell). Your prompt names your games. These games were built recently, before the UX checklist and the stricter round 2 helper rule existed.

## Read first

- `AGENTS.md` sections 5, 6 and 10.
- `docs/curriculum/gap-designs/README.md`, especially the **UX checklist**, **Helpers fade** (round 2 shows the helper only for about 1.5 s after a paid check) and **A miss must not show the answer either**.
- The shared helpers `src/core/aidflash.ts` (`helperOn`, `paidFlash`, `FLASH`) and `tests/helpers/canvas-rec.ts`.
- Every file of your games and their UI tests. Find each test with `grep -l "/<id>/" tests/*.ts`.
- For the brief each game was built from, see `docs/curriculum/gap-designs/` (for example `01-fog-rally.md`).

## What to do in each game

1. **Helper rule.** If round 2 shows any helper dimly all the time, change it to show only for about 1.5 s after the paid check (`helperOn`/`paidFlash`). Update the round 2 hint text to match.
2. **UX checklist.** Apply every item you can check in code:
   - The round's goal appears on the canvas at round start as one short line (`text(...)`, at least 12 px, top centre or above the target). It fades after 3 s, or stays small in a corner.
   - The player's own setting is shown with its unit beside its handle.
   - Every drag handle has radius ≥ 18 px, a visible grip (a ring plus ⇕ or ⇔ arrows) and a highlight while dragged.
   - Level 1 round 1 pulses the handle with a small "drag" cue until the first touch.
   - Scene text is ≥ 11 px, labels do not overlap, and colour always comes with a word or symbol.
   - Fire gets an instant visible response.
   - The miss text says in plain words what to change (direction only, never the answer).
   - The three rounds of a level look different, for example a varied backdrop tint, time of day or prop.
   - Every control has an aria-label.
   - Respect reduced motion: no big shake or flash. The engine's `A.shake` already checks it, so don't add your own.
   - No flashing faster than 3 Hz, and full-screen flashes have alpha ≤ 0.45.
3. **Leak re-check.** While you are in the code, check each level against the leak rules:
   - `hit` is fixed or the player's own setting.
   - A miss gives the direction only, with fixed effects.
   - Nothing on a miss gives the answer in one step.
   - The start never wins.

   Fix anything you find, and report it.
4. **Keep the game.** Leave `game.json`, the story, the pools and the win texts alone, and keep the game's look and characters. Improve; do not redesign.

## Tests

- Update tests that assert old behaviour.
- Add tests: round 2 has no helper before a check (canvas recorder), round 3 has none, the goal line is drawn at round start, and handle radius is ≥ 18 px (from the exported constants or the `HandleSpec`).

## Working rules (many agents share a low-memory machine)

- Never touch files outside your games' folders and their UI tests.
- Write files with the Write and Edit tools only. Never use shell heredocs, here-strings, `sed -i` or `node -e` edits.
- While working, run only `npx vitest run --maxWorkers=1 <your game folders> <your UI tests>`.
- Run `npx tsc --noEmit` once at the end, and ignore errors that are only in other agents' files.
- Do not run `npm run check`.
- No watch mode, no servers, no browser, no `npx tsx`, no commits.

## Final report (short)

- For each game: the files changed, the UX changes, the helper change, and any leak found and fixed.
- The test result.
- "tsc clean for my games" (or the errors).
- "not seen on screen".
