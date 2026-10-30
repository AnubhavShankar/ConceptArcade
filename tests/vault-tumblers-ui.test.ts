// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch04-determinants/vault-tumblers/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch04-determinants/vault-tumblers/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, type CanvasRec } from './helpers/canvas-rec';

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
  it('a miss says the door stayed shut without naming a plate, a plate check costs a charge, and a win shows A⁻¹', () => {
    h.start(1, 5);
    const g = build(1, 5);
    set(g[0], true);
    h.click(FIRE[0]);
    h.advance(3);
    expect(h.feedback()).toMatch(/stayed shut/);
    expect(h.feedback()).not.toMatch(/plate \d|locked/i);
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
  it('level 4: a wrong determinant and a wrong verdict give the same miss text, so neither is told apart', () => {
    h.start(4, 5);
    const g = build(4, 5);
    h.setSlider(g[0].det + 1, 0);
    h.setSlider(g[0].verdict, 1);
    h.click(FIRE[3]);
    h.advance(3);
    const first = h.feedback();
    expect(first).toMatch(/your \|A\| or your verdict/);
    h.setSlider(g[0].det, 0);
    h.setSlider(g[0].verdict === 3 ? 2 : g[0].verdict + 1, 1);
    h.click(FIRE[3]);
    h.advance(3);
    expect(h.feedback()).toBe(first);
  });
});

const CHECK = 'Plate check: listen to the plates at these settings';
const frame = (R: CanvasRec, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec;
};
/** The lamps are the only place a plate gets a ✓ or ✗ on the canvas. */
const lampsDrawn = (rec: CanvasRec['rec']) => rec.at.some((a) => a.s === '✓' || a.s === '✗');
const canvas = () => h.$('canvas')!;
const solveRound = () => {
  h.click(FIRE[0]);
  h.advance(2.8);
  h.advance(1);
};

describe('Vault Tumblers never leaks the answer', () => {
  for (const level of [1, 2, 3]) {
    it(`level ${level}: lamps are live in round 1, show for 1.5 s after a check in round 2, and never in round 3; a miss shows none`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const g = build(level, 5);
      expect(lampsDrawn(frame(R))).toBe(true);
      expect(canvas().dataset.lamps).toBe('1');
      set(g[0], false);
      solveRound();
      expect(h.hud()).toMatch(/Round 2 of 3/);
      // round 2: no lamps, at any setting, before a check
      for (const wrongSet of [true, false]) {
        set(g[1], wrongSet);
        expect(lampsDrawn(frame(R, 0.3))).toBe(false);
      }
      expect(canvas().dataset.lamps).toBe('0');
      set(g[1], true);
      h.click(CHECK);
      expect(lampsDrawn(frame(R, 0.3))).toBe(true);
      expect(lampsDrawn(frame(R, 1.0))).toBe(true);
      expect(lampsDrawn(frame(R, 0.5))).toBe(false);
      // a miss in round 2 shows no lamps
      h.click(FIRE[0]);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) expect(lampsDrawn(frame(R, dt))).toBe(false);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      set(g[1], false);
      solveRound();
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      // round 3: never, at any setting; a check is refused; a miss shows none
      for (const wrongSet of [true, false]) {
        set(g[2], wrongSet);
        expect(lampsDrawn(frame(R, 0.3))).toBe(false);
      }
      set(g[2], true);
      h.click(CHECK);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(lampsDrawn(frame(R, 0.3))).toBe(false);
      h.click(FIRE[0]);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) expect(lampsDrawn(frame(R, dt))).toBe(false);
      expect(canvas().dataset.lamps).toBe('0');
    });
  }

  it('two wrong settings give the same miss text, and the −1 float lands at one fixed point', () => {
    for (const level of [1, 2, 3, 4]) {
      const texts: string[] = [];
      const xs = new Set<number>();
      for (const bump of [1, 3]) {
        const R = canvasRecorder();
        h.start(level, 11);
        const r = build(level, 11)[0];
        if (r.kind === 'jam') {
          h.setSlider(r.det + bump, 0);
          h.setSlider(r.verdict, 1);
        } else r.sol.forEach((s, i) => h.setSlider(i === 0 ? s + bump : s, i));
        h.click(FIRE[level - 1]);
        R.clear();
        h.advance(2.8);
        texts.push(h.feedback());
        R.rec.at.filter((a) => a.s === '−1 ♥').forEach((a) => xs.add(a.x));
      }
      expect(texts[0]).toBe(texts[1]);
      expect([...xs]).toEqual([470]);
    }
  });

  it('the start never wins in any round of any level', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        h.start(level, seed);
        h.click(FIRE[level - 1]);
        h.advance(2.8);
        expect(h.hearts()).toBe(2);
      }
    }
  });
});
