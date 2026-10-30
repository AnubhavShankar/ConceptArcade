// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch04-determinants/vault-tumblers/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch04-determinants/vault-tumblers/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'vault-tumblers', 4);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const FIRE = ['Try the code', 'Try the code', 'Try the code', 'Declare the verdict'];

function set(r: Round, wrong: boolean) {
  if (r.kind === 'jam') {
    h.setSlider(wrong ? r.det + 1 : r.det, 0);
    h.setSlider(r.verdict, 1);
  } else {
    r.sol.forEach((s, i) => h.setSlider(wrong && i === 0 ? s + 1 : s, i));
  }
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => set(g[k], false),
  setWrong: (g, k) => set(g[k], true),
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('Vault Tumblers', () => {
  it('levels 1 to 3 have two or three tumblers and show the plates in the note', () => {
    for (const [level, n] of [[1, 2], [2, 3], [3, 3], [4, 2]]) {
      h.start(level, 5);
      expect(h.sliders()).toHaveLength(n);
      expect(h.note().length).toBeGreaterThan(30);
    }
  });
  it('a miss names the locked plates, a plate check costs a charge, and a win shows A⁻¹', () => {
    h.start(1, 5);
    const g = build(1, 5);
    set(g[0], true);
    h.click(FIRE[0]);
    h.advance(3);
    expect(h.feedback()).toMatch(/stayed locked/);
    expect(h.feedback()).not.toMatch(new RegExp(`\\b${g[0].sol.join('\\b.*\\b')}\\b`));
    set(g[0], false);
    h.click(FIRE[0]);
    h.advance(3);
    expect(h.feedback()).toMatch(/A⁻¹/);
    h.advance(1);
    h.click('Plate check: listen to the plates at these settings');
    expect(h.feedback()).toMatch(/Plate check/);
    h.click('Plate check: listen to the plates at these settings');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 4: a wrong determinant and a wrong verdict are told apart without giving either', () => {
    h.start(4, 5);
    const g = build(4, 5);
    h.setSlider(g[0].det + 1, 0);
    h.setSlider(g[0].verdict, 1);
    h.click(FIRE[3]);
    h.advance(3);
    expect(h.feedback()).toMatch(/disagreed/);
    h.setSlider(g[0].det, 0);
    h.setSlider(g[0].verdict === 3 ? 2 : g[0].verdict + 1, 1);
    h.click(FIRE[3]);
    h.advance(3);
    expect(h.feedback()).toMatch(/verdict/);
  });
});
