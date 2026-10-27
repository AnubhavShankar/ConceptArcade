import { h } from './dom';
import { numberGames } from './browse';
import { wrapInShell } from './drawer';
import { renderHome } from './home';
import { DIFFICULTIES, type LevelDef } from './manifest';
import { highestUnlocked, isUnlocked, levelStars, loadLast, loadStore, recordResult, saveLast, starString } from './progress';
import { createRng, newSeed } from './random';
import { catalog, curricula, findGame, type GameEntry } from './registry';
import { applyMeta, gameMeta, homeMeta } from './seo';
import type { GameContext } from './types';

let teardown: (() => void) | null = null;

/** In `npm run dev`, every level is open so authors can test level 4 without replaying 1 to 3. */
const UNLOCK_ALL = import.meta.env.DEV;

const KIND_LABEL: Record<LevelDef['kind'], string> = {
  foundation: 'Foundation',
  complexity: 'Harder',
  concept: 'New idea',
};

export function startApp(app: HTMLElement): void {
  const route = () => {
    teardown?.();
    teardown = null;
    const m = location.hash.match(/^#\/game\/([a-z0-9-]+)(?:\?(.*))?$/);
    const entry = m ? findGame(m[1]) : undefined;
    if (entry) {
      const params = new URLSearchParams(m![2] ?? '');
      const wanted = Math.floor(Number(params.get('level'))) || 1;
      const seed = params.get('seed') ? Number(params.get('seed')) : undefined;
      renderGame(app, entry, wanted, seed);
      applyMeta(gameMeta(entry.manifest));
    } else {
      renderHome(app);
      applyMeta(homeMeta());
    }
    window.scrollTo(0, 0);
  };
  window.addEventListener('hashchange', route);
  route();
}

function renderGame(app: HTMLElement, entry: GameEntry, wantedLevel: number, seedParam?: number): void {
  const { manifest } = entry;
  const levelCount = manifest.levels.length;

  // Clamp to a real, unlocked level.
  const maxOpen = UNLOCK_ALL ? levelCount : highestUnlocked(loadStore(), manifest.id, levelCount);
  const level = Math.min(Math.max(1, wantedLevel), maxOpen);
  const levelInfo = manifest.levels[level - 1];
  saveLast(manifest.id, level);
  const position = numberGames(catalog).get(manifest.id); // this game's place in its chapter

  let seed = seedParam ?? newSeed();
  let hintsUsed = 0;
  let finished = false;
  let alive = true;
  let cleanup: (() => void) | void;

  const levelBar = h('nav', { class: 'levels', 'aria-label': 'Levels' });
  const stage = h('section', { class: 'panel stage' });
  const rotateTip = h('p', { class: 'rotate-tip', hidden: true }, 'Tip: turn your phone sideways for a bigger board.');
  const hintList = h('ol', { class: 'hints' });
  const hintBtn = h('button', { class: 'btn secondary', onclick: () => revealHint() });
  const result = h('section', { class: 'panel result', hidden: true });

  const renderBar = () => {
    const store = loadStore();
    levelBar.replaceChildren(
      ...manifest.levels.map((l, i) => {
        const n = i + 1;
        const open = UNLOCK_ALL || isUnlocked(store, manifest.id, n);
        const stars = levelStars(store, manifest.id, n);
        const label = [h('span', { class: 'lvl-num' }, `Level ${n}`), h('span', { class: 'stars' }, starString(stars))];
        const common = { class: `lvl${n === level ? ' current' : ''}${open ? '' : ' locked'}`, title: l.title };
        return open
          ? h('a', { ...common, href: `#/game/${manifest.id}?level=${n}`, 'aria-current': n === level ? 'step' : false }, ...label)
          : h('span', { ...common, 'aria-disabled': 'true', title: 'Beat the previous level to unlock' }, ...label);
      }),
    );
  };

  const updateHintBtn = () => {
    const left = levelInfo.hints.length - hintsUsed;
    hintBtn.textContent = left > 0 ? `Hint (${left} left, −1 ★ each)` : 'No more hints';
    hintBtn.toggleAttribute('disabled', left === 0 || finished);
  };

  const revealHint = () => {
    if (hintsUsed >= levelInfo.hints.length || finished) return;
    hintList.append(h('li', null, levelInfo.hints[hintsUsed++]));
    updateHintBtn();
  };

  const showResult = (final: number) => {
    const next = manifest.levels[level];
    const nextLink = `#/game/${manifest.id}?level=${level + 1}`;
    result.replaceChildren(
      h('h2', null, next ? `Level ${level} cleared` : levelCount === 1 ? 'Solved!' : 'Game complete!'),
      h('p', { class: 'big-stars' }, starString(final)),
      h('p', { class: 'muted' }, hintsUsed ? `Hints used: ${hintsUsed}` : 'No hints used'),
      next
        ? h('p', null, h('strong', null, `Next, Level ${level + 1}: ${next.title}. `), next.adds)
        : h('p', null, manifest.learningOutcome),
      h(
        'div',
        { class: 'row' },
        next ? h('a', { class: 'btn', href: nextLink }, `Level ${level + 1} →`) : null,
        h('button', { class: next ? 'btn secondary' : 'btn', onclick: () => ctx_restart() }, 'Replay level'),
        h('a', { class: 'btn secondary', href: '#/' }, 'All games'),
      ),
    );
    result.hidden = false;
    // On a phone the result lands below the fold: bring it into view.
    result.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  };

  let ctx_restart: () => void = () => undefined;

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
      level,
      levelCount,
      levelInfo,
      random,
      randomInt: (min, max) => min + Math.floor(random() * (max - min + 1)),
      win: ({ stars }) => {
        if (finished) return;
        finished = true;
        updateHintBtn();
        const final = Math.max(1, stars - hintsUsed);
        recordResult(manifest.id, level, final);
        renderBar();
        showResult(final);
      },
      restart: () => {
        seed = newSeed();
        void mount();
      },
    };
    ctx_restart = ctx.restart;
    try {
      cleanup = mod.mount(ctx);
      rotateTip.hidden = !stage.querySelector('canvas');
    } catch (e) {
      console.error(e);
      stage.replaceChildren(h('p', { class: 'feedback bad' }, 'This game crashed.'));
    }
  };

  renderBar();
  const page = h(
      'main',
      { class: 'page' },
      h('a', { class: 'back', href: '#/' }, h('span', { 'aria-hidden': 'true' }, '←'), ' All games'),
      h('h1', null, manifest.title),
      h('p', { class: 'muted game-meta' }, `${manifest.ncertRef} · ${position ? `Game ${position.n} of ${position.of} in Chapter ${manifest.chapter.number} · ` : ''}by ${manifest.author.name}`),
      ...(levelCount > 1 ? [levelBar] : []),
      ...(levelCount > 1 ? [h(
        'p',
        { class: 'level-intro' },
        h('span', { class: `badge ${levelInfo.tier}` }, `${KIND_LABEL[levelInfo.kind]} · ${DIFFICULTIES.includes(levelInfo.tier) ? levelInfo.tier : ''}`),
        h('strong', null, ` Level ${level}: ${levelInfo.title}`),
        h('br'),
        h('span', { class: 'muted' }, levelInfo.adds),
      )] : []),
      rotateTip,
      stage,
      h('div', { class: 'row' }, hintBtn),
      hintList,
      result,
  );
  app.replaceChildren(wrapInShell(page, { entries: catalog, curricula, store: loadStore(), last: loadLast(), active: { subject: manifest.subject, classLevel: manifest.classLevel, chapter: manifest.chapter.number } }));
  teardown = () => {
    alive = false;
    cleanup?.();
  };
  void mount();
}
