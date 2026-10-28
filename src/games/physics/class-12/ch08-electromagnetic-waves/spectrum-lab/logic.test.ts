import { describe, expect, it } from 'vitest';
import {
  BANDS,
  bandName,
  bandOf,
  buildLevel,
  explainSolution,
  fmt,
  frequencyOf,
  judgeClassify,
  judgeOrder,
  judgePhoton,
  judgeSame,
  photonEv,
  starsFor,
  type LevelClassify,
  type LevelOrder,
  type LevelPhoton,
  type LevelSame,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('X-rays of 10⁻¹⁰ m, red light of 6800 Å and radio waves of 500 m all move at c (Exercise 8.3)', () => {
    for (const l of [1e-10, 6.8e-7, 500]) expect(frequencyOf(l) * l).toBeCloseTo(3e8, -3);
  });
  it('photon energies: 500 m is 2.5 × 10⁻⁹ eV, 6800 Å is 1.8 eV and 10⁻¹⁰ m is 1.2 × 10⁴ eV (Exercise 8.9)', () => {
    expect(photonEv(500)).toBeCloseTo(2.49e-9, 11);
    expect(photonEv(6.8e-7)).toBeCloseTo(1.83, 2);
    expect(photonEv(1e-10)).toBeCloseTo(12431, -1);
  });
});

describe('the rules', () => {
  it('the bands run from the longest to the shortest typical wavelength', () => {
    const t = BANDS.map((b) => b.typical);
    expect([...t].sort((a, b) => b - a)).toEqual(t);
  });
  it('each typical wavelength falls in its own band', () => {
    for (const b of BANDS) expect(bandOf(b.typical)).toBe(b.id);
  });
  it('bandName gives readable names', () => {
    expect(bandName('xray')).toBe('X-rays');
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(2);
    }
  });
  it('level 1: five bands in a shuffled set; the correct order wins; reversed or partial loses', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelOrder;
      expect(l.bands.length).toBe(5);
      expect(judgeOrder(l, l.order).ok).toBe(true);
      expect(judgeOrder(l, [...l.order].reverse()).ok).toBe(false);
      expect(judgeOrder(l, l.order.slice(0, 3)).complete).toBe(false);
    }
  });
  it('level 2: all six bands occur; the band and frequency win; the wrong band loses', () => {
    const bands = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelClassify;
      bands.add(l.band);
      expect(judgeClassify(l, l.band, l.hz).ok).toBe(true);
      expect(judgeClassify(l, l.band === 'radio' ? 'xray' : 'radio', l.hz).bOk).toBe(false);
      expect(judgeClassify(l, l.band, l.hz * 1000).fOk).toBe(false);
    }
    expect(bands.size).toBe(6);
  });
  it('level 3: energy and the more energetic photon win; the longer wavelength loses', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelPhoton;
      expect(l.lambda).not.toBe(l.other);
      expect(judgePhoton(l, l.ev, l.larger).ok).toBe(true);
      expect(judgePhoton(l, l.ev, l.larger === 'first' ? 'second' : 'first').lOk).toBe(false);
    }
  });
  it('level 4: the common time and "speed" win; "frequency" loses', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelSame;
      expect(judgeSame(l, l.ms, 'speed').ok).toBe(true);
      expect(judgeSame(l, l.ms, 'frequency').sOk).toBe(false);
      expect(judgeSame(l, l.ms * 1000, 'speed').tOk).toBe(false);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/longest wavelength/, /c\/λ|f = c/, /hc\/λ/, /Only the speed/];
    [1, 2, 3, 4].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
