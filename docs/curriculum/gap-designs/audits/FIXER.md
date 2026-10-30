# Instructions for a leak-fix builder

You fix answer leaks in existing games of Concept Arcade (`C:\dev\Personal Projects\Class 12\Physics`, Vite + TypeScript, Windows; use the Bash tool with POSIX syntax or PowerShell). Your prompt names your games and which audit file lists their findings (`audits/2026-10-30-maths-leaks.md` or `audits/2026-10-30-physics-leaks.md`).

## Read first
- `AGENTS.md` sections 5, 6 and 10.
- `docs/curriculum/gap-designs/README.md`, "A miss must not show the answer either" and "Helpers fade".
- Your games' sections of the audit file.
- Every file of your games and their UI tests (find each one with `grep -l "/<id>/" tests/*.ts`).
- The shared helpers: `src/core/aidflash.ts` (`helperOn(assist, won, since)`, `paidFlash()`, `FLASH = 1.5`) and `tests/helpers/canvas-rec.ts` (a canvas recorder).
- One game already fixed this way, as a pattern: `src/games/mathematics/class-12/ch02-inverse-trigonometric-functions/relay-tower/` and `src/games/physics/class-12/ch13-nuclei/binding-lab/`, with their UI tests.

The audit's line numbers may be slightly off, so check each finding in the code. If a finding is wrong, say so and skip it.

## Rules of a fix
- **`hit`**: a fixed point or the player's own setting, never the answer.
- **What a miss shows**: the direction only, with fixed effects. A miss never draws the true path, curve, image, value or count. No miss text holds a number from which the answer follows in one step.
- **The true construction or value** appears only on a win, in the round 1 live helper, or around a paid check. Replace `live = assist===0 || shot!==null` with `shot && shot.ok` for anything that reveals the truth.
- **Round 2 (E-dim)**: the helper shows only for about 1.5 s after the paid check. Update the hint text to match.
- **The start**:
  - It never wins and tells nothing.
  - Use a constant start.
  - If a row would be won from that start, re-roll that row or move the start.
- **Position and guessing**: no position or blind guess wins. Where a fix needs new pool rows, add them, checked numerically in `logic.test.ts`, with exactly one winner per round over the whole dial.
- **Leave alone**: `game.json`, the story and the win texts. Change only what the findings need.

## UX while you are in the code
Apply the "UX checklist" in docs/curriculum/gap-designs/README.md wherever you can check it in the code of your games:
- add the goal line on the canvas at round start;
- show the player's own setting with its unit beside its handle;
- make handles at least 18 px in radius, with a grip;
- remove overlapping labels and text under 11 px;
- give colour a word or symbol as well;
- make the miss text say what to change in plain words.

Keep game.json and the stories. List the UX changes in your report.

## Tests
- Update the tests that assert the old behaviour.
- Add tests:
  - `hit` is never the answer;
  - two wrong settings on the same side give the same miss text and the same animation end (use `data-` attributes or exported pure functions);
  - the start never wins;
  - with the canvas recorder, round 2 has no helper before a check, and round 3 has none.

## Working rules (many agents share a low-memory machine)
- Never touch files outside your games' folders and their UI tests. You may add to the shared helpers only if a new function is needed, and then say so.
- Write files with the Write and Edit tools only. Never use shell heredocs, here-strings, `sed -i` or `node -e` edits.
- While working, run only `npx vitest run --maxWorkers=1 <your game folders> <your UI tests>`.
- Run `npx tsc --noEmit` **once at the end**. Ignore errors that are only in other agents' files.
- Do not run `npm run check`.
- No watch mode, no servers, no browser, no `npx tsx`, no commits.

## Final report (short)
- For each game: the files changed, each finding marked fixed or skipped (and why), and any new pool rows.
- The test result.
- "tsc clean for my games", or the errors.
- The words "not seen on screen".
