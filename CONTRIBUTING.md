# Contributing a game

Anyone can add a game by opening a pull request. **A game is one self-contained folder.** You never edit shared files, so PRs don't conflict, and the app discovers your game automatically.

> **Write your `summary` for search engines too.** It becomes the description Google shows for your game's page: 60 to 140 characters, one real sentence, different from every other game.

## Quick start

> New here? Read **"Levels"** below first: it's the one rule that shapes the whole game.

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
  game.json       metadata: concept, NCERT reference, LEVELS (with hints), author (validated)
  index.ts        the UI: export default defineGame({ mount(ctx) { ... } })
  logic.ts        pure functions: build each level's questions, check answers (no DOM)
  logic.test.ts   tests proving the physics/maths is right (required)
  *.css, *.svg, *.png, *.webp   optional assets
```

The folder path must match `game.json` (subject, class, chapter number and name, id). `npm run validate` tells you the exact path it expects. Look at
`src/games/physics/class-12/ch01-electric-charges-and-fields/coulomb-balance/` for a complete example.

## Levels: a ladder, or a single level

A game has **1 to 6 levels**. A **single-difficulty game is fine**: give it one level (kind `foundation`) and you can ignore the rest of this section. If you add more levels, they form a **ladder**, and each level must go one of two ways from the one before:

- **`complexity`**: same idea, harder (more steps, trickier numbers or units, more bodies), or
- **`concept`**: an *additional* idea that builds on what the student just showed they can do.

Level 1 is the `foundation`. In `game.json`:

```json
"levels": [
  { "title": "Find the force", "tier": "concept", "kind": "foundation",
    "adds": "Baseline: substitute charges and a separation into Coulomb's law.",
    "hints": ["gentle nudge", "stronger hint", "almost the answer"] },
  { "title": "Find the separation", "tier": "concept", "kind": "complexity",
    "adds": "Harder: the force is given and you rearrange the law to find r.",
    "hints": ["..."] }
]
```

Rules the validator enforces: level 1 is `foundation` and later levels are not; tiers (`concept` < `application` < `challenge`) never go down; each level has an `adds` sentence and 2 to 4 hints; and, when there is more than one level, your game code must read `ctx.level`. Students unlock level n+1 by clearing level n.

Make each level genuinely different, not just bigger numbers. A single-level game just needs one well-chosen difficulty.

## Be a game, not a quiz

The best games here let the student *do something to a world and learn from what happens*: probe, build, tune, balance, deduce. A game that is just "read a question, pick an answer" is a worksheet in costume. Prefer a real mechanic with a story or a real-world setting (a curator's sealed spheres, a petrol-pump static shock, a lab balance). `attract-or-repel` ("The Curator's Spheres") is the model to copy: a canvas scene with simple physics, a notebook, and a deduction the student has to *earn*.

Two things to build into any such game:
- **Make the answer earned, not guessable.** Check that the student's evidence actually proves their answer before you judge it (`attract-or-repel` does this in `deduce()`), and never let an under-probed lucky guess count as an efficient win.
- **Keep it fair.** If the size of a reaction would give the answer away, make it the same size for every case (and test that, as the `FAIRNESS` test does).

`@core/sim` gives you the plumbing for canvas games: `fitCanvas`, `pointerToLocal`, `startLoop` (returns your cleanup function) and `stepPendulum`. Keep the rules in pure functions in `logic.ts` and unit-test them; keep `index.ts` for drawing and input.

## The quiz template (for the rounds-of-questions case)

Some concepts do suit short rounds of questions (calculations, unit conversion). For those, use `@core/quiz`, but treat it as a building block *inside* a game with some context, not the whole game. It handles the question flow, feedback and scoring. `@core/quiz` runs those for you: question flow, feedback, scoring, retry, and star grading. You only write the question builder:

```ts
// index.ts
import { defineGame } from '@core/define';
import { mountQuiz } from '@core/quiz';
import { buildQuestions } from './logic';

export default defineGame({
  mount(ctx) {
    return mountQuiz(ctx, { questions: buildQuestions(ctx.level, ctx.random) });
  },
});
```

`buildQuestions(level, random)` in `logic.ts` returns `Question[]` using `choice(...)` for multiple choice and `{ kind: 'number', ... }` for numeric answers (scientific notation like `3.2e-19` is accepted). Every question needs an `explain` (shown after answering) and can add `whyWrong` feedback for a specific misconception or unit slip. Clear a level with at most one mistake; fewer mistakes, more stars. `@core/figures` has `chargeRow` for drawing charged bodies. See `attract-or-repel` for a game with figures and `quantum-of-charge` for numeric ones.

Need something else (drag and drop, a simulation)? Skip the quiz template and use the raw API below.

## The game API

Your `index.ts` default-exports `defineGame({ mount(ctx) { ... } })`. `ctx` gives you:

| Member | Purpose |
|---|---|
| `ctx.root` | Empty element to render into |
| `ctx.level` / `ctx.levelCount` / `ctx.levelInfo` | Which level to play (1-based) and its entry from `game.json` |
| `ctx.random()` / `ctx.randomInt(a, b)` | Seeded randomness. Use it instead of `Math.random()`; open the game with `#/game/<id>?seed=42` to reproduce a round |
| `ctx.win({ stars: 1 \| 2 \| 3 })` | Call when the student beats this level. The shell subtracts one star per hint used, saves progress, unlocks the next level and shows the result screen |
| `ctx.restart()` | Replay this level with a fresh seed |
| `ctx.manifest` | Your `game.json` |

`mount` may return a cleanup function (cancel timers or `requestAnimationFrame`, remove window listeners).

Helpers: `h()` and `svg()` from `@core/dom` build elements safely; strings are always text, never HTML. The shell supplies the title, hint button and hints, result screen, and styles (`.btn`, `.field`, `.panel`, `.row`, `.feedback.good|bad`). You only build the play area.

Hints live in `game.json` per level (2 to 4, gentlest first) and are shown by the shell. Don't build your own.

## Design rules (what reviewers look for)

1. **Apply, don't guess.** If a player can win by sliding a control until it turns green, it teaches nothing. Make them compute or predict first: type an answer, commit a prediction, or limit attempts and score on efficiency. Don't show a live readout of the quantity they're solving for.
2. **Tie it to one concept.** `game.json` names the concept, the NCERT section (reference only) and a testable `learningOutcome`.
3. **Explain wrong answers.** Say *why* it's wrong and what changes if they adjust. Target common misconceptions and list them in `game.json`.
4. **Randomise numbers** via `ctx.random()` so answers can't be memorised or shared. Pick values that give clean, answerable problems.
5. **Be right.** Put the physics in `logic.ts` and test it against hand-worked examples, edge cases and the misconception cases. A wrong answer key misleads students.
6. **Be fair about precision.** State units and constants. Use a tolerance, and accept the answer for the number as *displayed* (see `answerCm` in the example).
7. **Short.** Aim for 1 to 5 minutes per round.
8. **Build a ladder, or commit to one difficulty.** With several levels, each must add complexity or a concept (see above). Either way, the first level should be winnable by a student who has just read the section.
9. **Mobile and accessible.** Tap targets of 44px or more, keyboard operable, don't rely on colour alone, label inputs.
10. **Original content.** Don't copy NCERT text, figures or other copyrighted material. Write your own problems and draw your own diagrams.

Each level has a `tier`: `concept` (one idea, direct), `application` (combine ideas or a new context), `challenge` (multi-step, board-exam-plus).

## Where your game appears in the list

Games are listed in **textbook order**: by subject, class, chapter, and then by the section your game teaches. You control that with `ncertRef`, which **must start with the section number**, for example `"Section 1.4.2, Charge is conserved"`. Numbers compare part by part, so 1.4.2 comes before 1.5, which comes before 1.10.

If two games teach the same section, set the optional `"order"` field (a whole number, lower comes first) to say which the student should meet first, following the textbook's own flow. Without it the tie falls back to alphabetical order by title, which is rarely what you want.

## Rules enforced automatically

Games run in students' browsers, so `npm run validate` (and CI) rejects:

- network access (`fetch`, `XMLHttpRequest`, `WebSocket`, ...) and any `http(s)://` URL
- `eval` / `new Function`, `innerHTML` / `outerHTML` / `document.write`
- your own `localStorage` / cookies (the shell tracks progress)
- navigation (`window.open`, `location.href`, ...)
- imports other than `./...`, `@core/...` (and `vitest` in tests). To propose a library, open an issue first
- file types other than `.ts .json .css .svg .png .webp .md`; files over 200 KB; folders over 1 MB
- scripts or external references inside SVGs
- a multi-level game whose code never reads `ctx.level`, or a ladder that skips `foundation` or goes down in tier
- a missing `*.test.ts`, a folder path that doesn't match `game.json`, or a duplicate `id`

A game that passes these checks still gets a human review. The checks are a safety net, not a replacement.

## Editor autocomplete for `game.json`

Keep the `"$schema"` line that `new-game` adds. Run `npm run schema` to regenerate `schema/game.schema.json` if the manifest format changes.

## Adding a new subject, class or chapter

The home page is built from your files: it groups games by subject, class and chapter, and shows subject tabs and a class selector only once there is more than one of each. You never edit it.

1. **Add a curriculum file** (one new file, so it can't conflict with anyone else's PR): `src/curriculum/<subject>/class-<n>.json`. It lists the chapters of that subject and class, so the home page can show chapters that have no games yet as "coming soon", and so every game uses one agreed chapter name.

   ```json
   {
     "subject": "chemistry",
     "classLevel": 12,
     "source": "NCERT Chemistry Class XII",
     "chapters": [
       { "number": 1, "name": "Solutions" },
       { "number": 2, "name": "Electrochemistry" }
     ]
   }
   ```

   Use the chapter names exactly as the textbook prints them.
2. **Add your game** with `new-game` (`--subject chemistry --class 12 --chapter 1 ...`). Its chapter number and name must match the curriculum file: `npm run validate` checks this.
3. Subjects are listed in `src/core/manifest.ts`; a new one other than physics, chemistry, mathematics and biology needs a small PR to that file first.

If there is no curriculum file for a subject and class yet, games still work and appear under their chapter; the file just adds the planned chapters and the name check.

## Not sure what to build?

Open an issue titled "Game idea: <concept>" with the NCERT section and the mechanic you have in mind. Good mechanics: *tune to a target*, *build the setup*, *predict then reveal*, *fix the broken thing*, *numeric puzzle*, *match and sort*.
