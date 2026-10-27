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
afterEach(() => {
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
    for (const g of catalog) {
      const n = numbers.get(g.manifest.id)!;
      const app = open(g.manifest.id);
      expect(app.querySelector('.game-meta')?.textContent).toContain(`Game ${n.n} of ${n.of}`);
    }
  });

  it('the first game of the textbook is Game 1', () => {
    const app = open('attract-or-repel');
    expect(app.querySelector('.game-meta')?.textContent).toMatch(/Game 1 of \d+ in Chapter 1/);
  });
});
