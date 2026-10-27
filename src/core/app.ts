import { h } from './dom';
import { createRng, newSeed } from './random';
import { getStars, recordResult, starString } from './progress';
import { catalog, findGame, type GameEntry } from './registry';
import type { GameContext } from './types';

let teardown: (() => void) | null = null;

export function startApp(app: HTMLElement): void {
  const route = () => {
    teardown?.();
    teardown = null;
    const m = location.hash.match(/^#\/game\/([a-z0-9-]+)(?:\?seed=(\d+))?/);
    const entry = m ? findGame(m[1]) : undefined;
    if (entry) renderGame(app, entry, m && m[2] ? Number(m[2]) : undefined);
    else renderHome(app);
    window.scrollTo(0, 0);
  };
  window.addEventListener('hashchange', route);
  route();
}

function renderHome(app: HTMLElement): void {
  const page = h('main', { class: 'page' }, h('h1', null, 'Concept Arcade'));
  page.append(h('p', { class: 'muted' }, 'Games and puzzles you win by applying what you learn in class.'));

  if (catalog.length === 0) page.append(h('p', null, 'No games yet.'));

  let lastGroup = '';
  let grid: HTMLElement | null = null;
  for (const { manifest: m } of catalog) {
    const group = `${m.subject}|${m.classLevel}|${m.chapter.number}`;
    if (group !== lastGroup) {
      lastGroup = group;
      const subject = m.subject[0].toUpperCase() + m.subject.slice(1);
      page.append(h('h2', null, `${subject} · Class ${m.classLevel} · Ch ${m.chapter.number}: ${m.chapter.name}`));
      grid = h('div', { class: 'grid' });
      page.append(grid);
    }
    grid!.append(
      h(
        'a',
        { class: 'card', href: `#/game/${m.id}` },
        h('span', { class: `badge ${m.difficulty}` }, m.difficulty),
        h('strong', null, m.title),
        h('span', { class: 'muted' }, m.summary),
        h('span', { class: 'chips' }, ...m.concepts.map((c) => h('span', { class: 'chip' }, c))),
        h('span', { class: 'meta' }, `~${m.estimatedMinutes} min`, h('span', { class: 'stars' }, starString(getStars(m.id)))),
      ),
    );
  }
  page.append(h('footer', { class: 'muted' }, 'Want to add a game? See CONTRIBUTING.md in the repository.'));
  app.replaceChildren(page);
}

function renderGame(app: HTMLElement, entry: GameEntry, seedParam?: number): void {
  const { manifest } = entry;
  let seed = seedParam ?? newSeed();
  let hintsUsed = 0;
  let finished = false;
  let alive = true;
  let cleanup: (() => void) | void;

  const stage = h('section', { class: 'panel stage' });
  const hintList = h('ol', { class: 'hints' });
  const hintBtn = h('button', { class: 'btn secondary', onclick: () => revealHint() });
  const result = h('section', { class: 'panel result', hidden: true });

  const updateHintBtn = () => {
    const left = manifest.hints.length - hintsUsed;
    hintBtn.textContent = left > 0 ? `Hint (${left} left, −1 ★ each)` : 'No more hints';
    hintBtn.toggleAttribute('disabled', left === 0 || finished);
  };

  const revealHint = () => {
    if (hintsUsed >= manifest.hints.length || finished) return;
    hintList.append(h('li', null, manifest.hints[hintsUsed++]));
    updateHintBtn();
  };

  const mount = async () => {
    cleanup?.();
    cleanup = undefined;
    finished = false;
    hintsUsed = 0;
    hintList.replaceChildren();
    result.hidden = true;
    updateHintBtn();
    stage.replaceChildren(h('p', { class: 'muted' }, 'Loading…'));

    let mod;
    try {
      mod = await entry.load();
    } catch (e) {
      console.error(e);
      stage.replaceChildren(h('p', { class: 'feedback bad' }, 'This game failed to load.'));
      return;
    }
    if (!alive) return;

    stage.replaceChildren();
    const random = createRng(seed);
    const ctx: GameContext = {
      root: stage,
      manifest,
      random,
      randomInt: (min, max) => min + Math.floor(random() * (max - min + 1)),
      win: ({ stars }) => {
        if (finished) return;
        finished = true;
        updateHintBtn();
        const final = Math.max(1, stars - hintsUsed);
        recordResult(manifest.id, final);
        result.replaceChildren(
          h('h2', null, 'Solved!'),
          h('p', { class: 'big-stars' }, starString(final)),
          h('p', { class: 'muted' }, hintsUsed ? `Hints used: ${hintsUsed}` : 'No hints used'),
          h('p', null, manifest.learningOutcome),
          h(
            'div',
            { class: 'row' },
            h('button', { class: 'btn', onclick: () => ctx.restart() }, 'Play again'),
            h('a', { class: 'btn secondary', href: '#/' }, 'All games'),
          ),
        );
        result.hidden = false;
      },
      restart: () => {
        seed = newSeed();
        void mount();
      },
    };
    try {
      cleanup = mod.mount(ctx);
    } catch (e) {
      console.error(e);
      stage.replaceChildren(h('p', { class: 'feedback bad' }, 'This game crashed.'));
    }
  };

  app.replaceChildren(
    h(
      'main',
      { class: 'page' },
      h('a', { class: 'back', href: '#/' }, '← All games'),
      h('h1', null, manifest.title),
      h('p', { class: 'muted' }, `${manifest.ncertRef} · by ${manifest.author.name}`),
      stage,
      h('div', { class: 'row' }, hintBtn),
      hintList,
      result,
    ),
  );
  teardown = () => {
    alive = false;
    cleanup?.();
  };
  void mount();
}
