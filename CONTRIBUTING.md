# Contributing a game

Anyone can add a game by opening a pull request. **A game is one self-contained folder.** You never edit shared files, so PRs don't conflict, and the app discovers your game automatically.

## Quick start

```bash
git clone <your fork>
cd <repo>
npm install

# 1. Scaffold your game (creates the folder and a working skeleton)
npm run new-game -- --subject physics --class 12 --chapter 1 \
  --chapter-name "Electric Charges and Fields" \
  --id my-game --title "My Game" --name "Your Name" --github your-username

# 2. Edit the files, then play it
npm run dev            # http://localhost:5173

# 3. Before opening the PR
npm run check          # validate + typecheck + tests + build
```

Open a PR. CI runs the same `npm run check`. A maintainer reviews it for correctness and teaching quality, and merging to `main` deploys it.

## What's in a game folder

```
src/games/<subject>/class-<n>/ch<NN>-<chapter-slug>/<game-id>/
  game.json       metadata: concept, NCERT reference, hints, author (validated)
  index.ts        the UI: export default defineGame({ mount(ctx) { ... } })
  logic.ts        pure functions: rounds, checking answers (no DOM)
  logic.test.ts   tests proving the physics/maths is right (required)
  *.css, *.svg, *.png, *.webp   optional assets
```

The folder path must match `game.json` (subject, class, chapter number and name, id). `npm run validate` tells you the exact path it expects. Look at
`src/games/physics/class-12/ch01-electric-charges-and-fields/coulomb-balance/` for a complete example.

## The game API

Your `index.ts` default-exports `defineGame({ mount(ctx) { ... } })`. `ctx` gives you:

| Member | Purpose |
|---|---|
| `ctx.root` | Empty element to render into |
| `ctx.random()` / `ctx.randomInt(a, b)` | Seeded randomness. Use it instead of `Math.random()`; open the game with `#/game/<id>?seed=42` to reproduce a round |
| `ctx.win({ stars: 1 \| 2 \| 3 })` | Call when solved. The shell subtracts one star per hint used, saves progress, and shows the result screen |
| `ctx.restart()` | New round with a fresh seed |
| `ctx.manifest` | Your `game.json` |

`mount` may return a cleanup function (cancel timers or `requestAnimationFrame`, remove window listeners).

Helpers: `h()` and `svg()` from `@core/dom` build elements safely; strings are always text, never HTML. The shell supplies the title, hint button and hints, result screen, and styles (`.btn`, `.field`, `.panel`, `.row`, `.feedback.good|bad`). You only build the play area.

Hints live in `game.json` (2 to 4, gentlest first) and are shown by the shell. Don't build your own.

## Design rules (what reviewers look for)

1. **Apply, don't guess.** If a player can win by sliding a control until it turns green, it teaches nothing. Make them compute or predict first: type an answer, commit a prediction, or limit attempts and score on efficiency. Don't show a live readout of the quantity they're solving for.
2. **Tie it to one concept.** `game.json` names the concept, the NCERT section (reference only) and a testable `learningOutcome`.
3. **Explain wrong answers.** Say *why* it's wrong and what changes if they adjust. Target common misconceptions and list them in `game.json`.
4. **Randomise numbers** via `ctx.random()` so answers can't be memorised or shared. Pick values that give clean, answerable problems.
5. **Be right.** Put the physics in `logic.ts` and test it against hand-worked examples, edge cases and the misconception cases. A wrong answer key misleads students.
6. **Be fair about precision.** State units and constants. Use a tolerance, and accept the answer for the number as *displayed* (see `answerCm` in the example).
7. **Short.** Aim for 1 to 5 minutes per round.
8. **Mobile and accessible.** Tap targets of 44px or more, keyboard operable, don't rely on colour alone, label inputs.
9. **Original content.** Don't copy NCERT text, figures or other copyrighted material. Write your own problems and draw your own diagrams.

Pick a `difficulty`: `concept` (one idea, direct), `application` (combine ideas or a new context), `challenge` (multi-step, board-exam-plus).

## Rules enforced automatically

Games run in students' browsers, so `npm run validate` (and CI) rejects:

- network access (`fetch`, `XMLHttpRequest`, `WebSocket`, ...) and any `http(s)://` URL
- `eval` / `new Function`, `innerHTML` / `outerHTML` / `document.write`
- your own `localStorage` / cookies (the shell tracks progress)
- navigation (`window.open`, `location.href`, ...)
- imports other than `./...`, `@core/...` (and `vitest` in tests). To propose a library, open an issue first
- file types other than `.ts .json .css .svg .png .webp .md`; files over 200 KB; folders over 1 MB
- scripts or external references inside SVGs
- a missing `*.test.ts`, a folder path that doesn't match `game.json`, or a duplicate `id`

A game that passes these checks still gets a human review. The checks are a safety net, not a replacement.

## Editor autocomplete for `game.json`

Keep the `"$schema"` line that `new-game` adds. Run `npm run schema` to regenerate `schema/game.schema.json` if the manifest format changes.

## Adding a new subject or class

Just use the new values with `new-game` (`--subject chemistry --class 12 ...`). Subjects are listed in `src/core/manifest.ts`; new ones other than physics, chemistry, mathematics and biology need a small PR to that file first.

## Not sure what to build?

Open an issue titled "Game idea: <concept>" with the NCERT section and the mechanic you have in mind. Good mechanics: *tune to a target*, *build the setup*, *predict then reveal*, *fix the broken thing*, *numeric puzzle*, *match and sort*.
