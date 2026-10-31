// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch12-atoms/energy-ladder/index';
import { absorbRounds, beamRounds, budgetRounds } from '../src/games/physics/class-12/ch12-atoms/energy-ladder/logic';
import { createRng } from '../src/core/random';
import { fmt } from '../src/core/judge';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'el', 3);
type G = { abs: ReturnType<typeof absorbRounds>; beam: ReturnType<typeof beamRounds>; budget: ReturnType<typeof budgetRounds> };
const build = (level: number, seed: number): G => ({ abs: level === 1 ? absorbRounds(createRng(seed)) : [], beam: level === 2 ? beamRounds(createRng(seed)) : [], budget: level === 3 ? budgetRounds(createRng(seed)) : [] });
const FIRE = ['Fire the photon at the atom', 'Fire the electron beam at the gas', 'Check the energy budget'];
const mid = (lo: number, hi: number) => Math.round(((lo + hi) / 2) * 100) / 100;

shellTests<G>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k, level) => {
    if (level === 1) h.setSlider(g.abs[k].lamSol);
    else if (level === 2) h.setSlider(mid(g.beam[k].lo, Math.min(g.beam[k].hi, 13.6)));
    else {
      h.setSlider(g.budget[k].ke, 0);
      h.setSlider(g.budget[k].pe, 1);
    }
  },
  setWrong: (g, k, level) => {
    if (level === 1) h.setSlider(g.abs[k].lamSol < 300 ? 650 : 100);
    else if (level === 2) h.setSlider(g.beam[k].lines === 1 ? 13.5 : 9);
    else {
      h.setSlider(g.budget[k].ke + 3, 0);
      h.setSlider(g.budget[k].pe, 1);
    }
  },
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('level 1: Hop’s jump', () => {
  it('a photon too weak passes through; a photon for a different rung makes a different jump; a test shot lists the gaps', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(700);
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/too weak|does not match|different rung/);
    h.click('Test shot: compare the photon with the rung gaps');
    expect(h.feedback()).toMatch(/each photon has [\d.]+ eV/);
    expect(g.abs).toHaveLength(3);
  });
  it('dragging the wavelength knob sets the dial in tenths of a nanometre', () => {
    h.start(1, 5);
    h.pointer('pointerdown', 400 + ((300 - 80) / 620) * 210, 312);
    h.pointer('pointermove', 400 + ((486.3 - 80) / 620) * 210, 312);
    expect(Number(h.sliders()[0].value)).toBeCloseTo(486.3, 0);
  });
});

describe('level 2: Key’s doors', () => {
  it('too little energy shows too few lines, too much shows too many, and the miss never names the energy', () => {
    h.start(2, 5);
    const g = build(2, 5);
    h.setSlider(8);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/not lifted high enough/);
    h.setSlider(13.5);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/lifted too high|not lifted high enough/);
    expect(h.feedback()).not.toContain(`${g.beam[0].lo.toFixed(2)} eV`);
  });
});

describe('level 3: Orbit’s budget', () => {
  it('has two dials; the right total in the wrong split is named as such', () => {
    h.start(3, 5);
    const g = build(3, 5);
    expect(h.sliders()).toHaveLength(2);
    h.setSlider(0, 0);
    h.setSlider(g.budget[0].ke + g.budget[0].pe, 1);
    h.click(FIRE[2]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/out of balance/);
    expect(h.hearts()).toBe(2);
  });
  it('the energy bars are live in round 1 and dropped later', () => {
    h.start(3, 5);
    const g = build(3, 5);
    expect(h.note()).toMatch(/bars and the total are live/);
    h.setSlider(g.budget[0].ke, 0);
    h.setSlider(g.budget[0].pe, 1);
    h.click(FIRE[2]);
    h.advance(3.8);
    expect(h.note()).toMatch(/for a moment after a test shot/);
  });
});

// ---- no leaks: the helper fades, a miss shows no key energy, no line count and no verdict ------------------------------------

const TEST_SHOT = [undefined, 'Test shot: see how high the beam lifts the atom', 'Test shot: read the total energy of this level'];
/** Level 2: the line count of the panel. Level 3: the K + U total. */
const HELPER = [/^$/, /^\d+ lines?$/, /^K \+ U = /];
const EL_X = 185;
const frameAfter = (rc: ReturnType<typeof canvasRecorder>, dt: number) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  rc.clear();
  h.advance(0.05);
  return rc.rec;
};
const has = (rec: ReturnType<typeof canvasRecorder>['rec'], level: number) => texts(rec).some((s) => HELPER[level - 1].test(s));
const right = (g: G, level: number, k: number) => {
  if (level === 2) h.setSlider(mid(g.beam[k].lo, Math.min(g.beam[k].hi, 13.6)));
  else {
    h.setSlider(g.budget[k].ke, 0);
    h.setSlider(g.budget[k].pe, 1);
  }
};
/** A beam that misses on the given side, and a pair of energies that misses; f varies the amount. */
const wrong = (g: G, level: number, k: number, side: 'high' | 'low', f: number) => {
  if (level === 2) {
    const b = g.beam[k];
    h.setSlider(side === 'high' ? Math.min(13.6, b.hi + 0.1 + 0.15 * f) : Math.max(8, b.lo - 0.4 - 0.5 * f));
  } else {
    const b = g.budget[k];
    h.setSlider(b.ke > 7 ? b.ke - 3 - f : b.ke + 3 + f, 0);
    h.setSlider(b.pe, 1);
  }
};
const playTo = (level: number, round: number) => {
  const g = build(level, 5);
  for (let k = 0; k < round; k++) {
    right(g, level, k);
    h.click(FIRE[level - 1]);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
const electronY = (rec: ReturnType<typeof canvasRecorder>['rec']) => rec.arcs.filter((a) => a.x === EL_X && a.r > 9 && a.r < 11.5).map((a) => Math.round(a.y * 100) / 100);

describe('no leaks: the helper fades', () => {
  it('round 1 has the live helper; round 2 only for about 1.5 s after a test shot; round 3 never, even after a test shot', () => {
    for (const level of [2, 3]) {
      const rc = canvasRecorder();
      h.start(level, 5);
      expect(has(frameAfter(rc, 0.1), level)).toBe(true);
      const g = playTo(level, 1);
      expect(has(frameAfter(rc, 0.1), level)).toBe(false);
      h.click(TEST_SHOT[level - 1]!);
      expect(has(frameAfter(rc, 0.3), level)).toBe(true);
      expect(has(frameAfter(rc, 1.5), level)).toBe(false);
      right(g, level, 1);
      h.click(FIRE[level - 1]);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3/);
      expect(has(frameAfter(rc, 0.1), level)).toBe(false);
      h.click(TEST_SHOT[level - 1]!);
      expect(has(frameAfter(rc, 0.3), level)).toBe(false);
    }
  });
  it('the hint text says the panel or the bars show for a moment after a test shot', () => {
    for (const level of [2, 3]) {
      h.start(level, 5);
      playTo(level, 1);
      expect(h.note()).toMatch(/for a moment after a test shot/);
    }
  });
  it('a miss never draws the helper, the key energies or a line count; a win does', () => {
    for (const level of [2, 3]) {
      for (const round of [0, 1, 2]) {
        const rc = canvasRecorder();
        h.start(level, 5);
        const g = playTo(level, round);
        wrong(g, level, round, 'high', 0);
        h.click(FIRE[level - 1]);
        h.advance(2.0);
        const miss = frameAfter(rc, 0.05);
        expect(has(miss, level)).toBe(false);
        if (level === 2) for (const n of [2, 3, 4, 5, 6]) expect(texts(miss)).not.toContain(`${fmt(13.6 * (1 - 1 / (n * n)))} eV`);
        h.advance(1);
        right(g, level, round);
        h.click(FIRE[level - 1]);
        h.advance(2.0);
        expect(has(frameAfter(rc, 0.05), level)).toBe(true);
        h.advance(1);
      }
    }
  });
});

describe('no leaks: misses on one side end the same way, and the start never wins', () => {
  it('level 2: two wrong beams on the same side end with the electron in the same place and the same words', () => {
    for (const round of [0, 1, 2]) {
      for (const side of ['high', 'low'] as const) {
        const rc = canvasRecorder();
        h.start(2, 5);
        const g = playTo(2, round);
        const ends: { y: number[]; words: string[] }[] = [];
        for (const f of [0, 1]) {
          wrong(g, 2, round, side, f);
          h.click(FIRE[1]);
          h.advance(2.0);
          const rec = frameAfter(rc, 0.05);
          ends.push({ y: electronY(rec), words: texts(rec).filter((s) => !/^\d+\.\d\d eV$/.test(s)) });
          h.advance(1);
        }
        expect(ends[0].y.length).toBeGreaterThan(0);
        expect(ends[0].y).toEqual(ends[1].y);
        expect(ends[0].words).toEqual(ends[1].words);
      }
    }
  });
  it('level 3: two wrong pairs end on the same words', () => {
    for (const round of [0, 1, 2]) {
      const rc = canvasRecorder();
      h.start(3, 5);
      const g = playTo(3, round);
      const ends: string[][] = [];
      for (const f of [0, 1]) {
        wrong(g, 3, round, 'high', f);
        h.click(FIRE[2]);
        h.advance(2.0);
        ends.push(texts(frameAfter(rc, 0.05)));
        h.advance(1);
      }
      expect(ends[0]).toEqual(ends[1]);
    }
  });
  it('the start never wins: firing at once is a miss in every round of every level', () => {
    for (const level of [1, 2, 3]) {
      for (const round of [0, 1, 2]) {
        h.start(level, 5);
        if (level === 1) {
          const g = build(1, 5);
          for (let k = 0; k < round; k++) {
            h.setSlider(g.abs[k].lamSol);
            h.click(FIRE[0]);
            h.advance(3.8);
          }
        } else playTo(level, round);
        const hearts = h.hearts();
        h.click(FIRE[level - 1]);
        h.advance(2.8);
        expect(h.hearts()).toBe(hearts - 1);
      }
    }
  });
});
