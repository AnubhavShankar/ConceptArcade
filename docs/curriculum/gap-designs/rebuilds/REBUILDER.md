# Instructions for a rebuild builder

You rebuild one old physics game in Concept Arcade (`C:\dev\Personal Projects\Class 12\Physics`, Vite + TypeScript, Windows; use the Bash tool with POSIX syntax or PowerShell) from its brief, `docs/curriculum/gap-designs/rebuilds/chNN-<id>.md`. Your prompt names the game.

## Read first, in this order

1. `AGENTS.md`, sections 4, 5, 6, 8 and 10.
2. `docs/curriculum/gap-designs/README.md`. Read every rule, including "A miss must not show the answer either", "Helpers fade" and the "UX checklist".
3. `docs/curriculum/gap-designs/rebuilds/README.md`, the rules for a rebuild.
4. Your brief.
5. The engine and shared helpers:
   - `src/core/dialgame.ts`, `src/core/arcade.ts`, `src/core/mathkit.ts`, `src/core/neon.ts`
   - `src/core/aidflash.ts` (`helperOn`, `paidFlash`)
   - `tests/helpers/arcade-harness.ts`
   - `tests/helpers/canvas-rec.ts`
6. The model rebuild: `src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-bench/` with `tests/capacitor-bench-ui.test.ts`.
7. The old game's files. You replace them, but check what they export: grep the repo for imports of the old `logic.ts`. If anything outside the folder imports it, keep those exports working.

## What to do

- Build exactly what the brief says.
  - Overwrite `game.json` with `rebuilds/json/<id>.json`, an exact copy.
  - Rewrite `logic.ts`, `logic.test.ts` and `index.ts`.
  - Add `art.ts`, plus any further files the brief names.
- Find the old UI test with `grep -l "<chapter folder>/<id>/" tests/*.ts`. Delete it and create `tests/<id>-ui.test.ts`, using `arcadeHarness` and `shellTests` as the brief says.
- Copy the pools exactly; they were checked by script.
- If something in the brief is impossible, contradicts the engine, or would leak the answer, take the closest working reading that keeps the answer hidden, note it, and carry on. Do not redesign.
- Before you finish, check every level against the leak rules and the UX checklist.

## Working rules (many agents share a low-memory machine)

- Never touch files outside your game's folder, its old and new UI tests and the brief's JSON.
- Write files with the Write and Edit tools only. Never use shell heredocs, here-strings, `sed -i` or `node -e` edits.
- While working, run only `npx vitest run --maxWorkers=1 <your game folder> tests/<id>-ui.test.ts`.
- Run `npx tsc --noEmit` **once at the end**. Ignore errors that are only in other agents' files.
- Do not run `npm run check`; the reviewer runs it once per batch.
- No watch mode, no servers, no browser, no `npx tsx`, no commits.

## Final report (short)

- The files created, changed and deleted.
- The test result.
- "tsc clean for <id>" (or the errors).
- Every deviation from the brief, and why.
- Any flaw in the brief.
- "not seen on screen".
