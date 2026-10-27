# Concept Arcade

Games and puzzles that students win by **applying** what they learn in class. Starting with NCERT Class 12 Physics, built to grow to other subjects and classes.

Static site (Vite + TypeScript), hosted on GitHub Pages. No backend, no accounts. Progress is stored in the student's own browser.

## Run it

```bash
npm install
npm run dev        # local dev server
npm run check      # validate + typecheck + tests + build (what CI runs)
```

## Add a game

Open a PR with one new folder. See **[CONTRIBUTING.md](CONTRIBUTING.md)**. `npm run new-game` scaffolds it for you.

## How it works

```
src/core/        shell: home page, game page, hints, stars, progress, helpers
src/games/       one folder per game, auto-discovered (no registry to edit)
scripts/         new-game scaffolder, validator (runs in CI), schema generator
tests/           tests for the framework itself
```

- **Auto-discovery:** `import.meta.glob` finds every `game.json` + `index.ts`, so PRs only add files.
- **Validated metadata:** `game.json` is checked against a strict schema (`src/core/manifest.ts`).
- **Safety rules:** a static check rejects network access, HTML injection, third-party imports and similar (see CONTRIBUTING).
- **Correctness:** every game must ship tests for its logic.

## Maintainer setup (one time)

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Branch protection on `main`: require the `CI / check` status and at least one approving review; require review from code owners if you add a `CODEOWNERS` file.
3. Under **Settings → Actions → General**, require approval to run workflows from first-time contributors.

Merging a PR to `main` deploys the site.

## Content and copyright

The NCERT textbooks are copyrighted. This project references chapters and sections but never copies their text or figures. Keep the textbook PDFs out of the repo (they are in `.gitignore`).
