// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { numberGames } from '../src/core/browse';
import { startApp } from '../src/core/app';
import { catalog } from '../src/core/registry';

// The game page mounts the real game after it loads; give it a stub canvas and a clock that never ticks.
beforeEach(() => {
  document.body.innerHTML = '';
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({}, { get: () => () => undefined, set: () => true }) as never);
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('scrollTo', () => undefined);
});
afterEach(async () => {
  // the game module loads lazily after the page renders: let it finish mounting while the stubs are still in place,
  // otherwise it mounts after teardown and logs a console error into a closed worker
  await vi.dynamicImportSettled();
  await new Promise((r) => setTimeout(r, 0));
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function open(id: string): HTMLElement {
  location.hash = `#/game/${id}`;
  const app = document.createElement('div');
  document.body.append(app);
  startApp(app);
  return app;
}

describe('the game page header shows the game number', () => {
  it('says which game of the chapter this is', () => {
    const numbers = numberGames(catalog);
    const first = catalog.find((g) => g.manifest.id === 'attract-or-repel')!;
    const n = numbers.get(first.manifest.id)!;
    const app = open(first.manifest.id);
    const meta = app.querySelector('.game-meta')?.textContent ?? '';
    expect(meta).toContain(`Game ${n.n} of ${n.of} in Chapter ${first.manifest.chapter.number}`);
    expect(meta).toContain(first.manifest.ncertRef);
    expect(meta).toContain(`by ${first.manifest.author.name}`);
  });

  it('the number on the game page matches the number on its home card, for every game', () => {
    const numbers = numberGames(catalog);
    // Only the header is checked, so skip loading every game module (slow, and it grows with every game added).
    for (const g of catalog) vi.spyOn(g, 'load').mockReturnValue(new Promise(() => undefined));
    // One app, many pages: starting an app per game would stack a hashchange listener each time and re-render every earlier page on every change.
    const app = document.createElement('div');
    document.body.append(app);
    history.replaceState(null, '', `#/game/${catalog[0].manifest.id}`);
    startApp(app);
    for (const g of catalog) {
      const n = numbers.get(g.manifest.id)!;
      history.replaceState(null, '', `#/game/${g.manifest.id}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      expect(app.querySelector('.game-meta')?.textContent).toContain(`Game ${n.n} of ${n.of}`);
    }
  });

  it('the first game of the textbook is Game 1', () => {
    const app = open('attract-or-repel');
    expect(app.querySelector('.game-meta')?.textContent).toMatch(/Game 1 of \d+ in Chapter 1/);
  });
});

describe('moving between games without going home', () => {
  it('a game page links to the previous and next game of the course, and the menu marks the game you are in', () => {
    const app = open('attract-or-repel');
    const nav = app.querySelector('.game-nav')!;
    expect(nav.querySelector('.game-nav-prev')).toBeNull(); // the first game of the textbook has no previous
    const next = nav.querySelector('.game-nav-next') as HTMLAnchorElement;
    expect(next.getAttribute('href')).toMatch(/^#\/game\/[a-z0-9-]+$/);
    expect(app.querySelector('.drawer-game.current')?.textContent).toContain(catalog.find((g) => g.manifest.id === 'attract-or-repel')!.manifest.title);
    // the chapter of the game opens by itself, so the way to the neighbouring games is one click away
    expect(app.querySelector('.drawer-games:not([hidden]) a.drawer-game')).not.toBeNull();
  });
});
