import { describe, expect, it } from 'vitest';
import { DOPE_TOL, GAP_TOL, GAPS, LOG_NI2, SLIDERS, dopeExplain, dopeMiss, dopeReading, dopeRounds, doping, gapExplain, gapMiss, gapReading, gapRounds, judgeDope, judgeGap, wavelengthNm } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const grid = (min: number, max: number, step: number) => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => Math.round((min + i * step) * 1e6) / 1e6);

describe('the numbers from the textbook', () => {
  it('Exercise 14.3 and Example 14.1: the gaps are C 5.4 eV > Si 1.1 eV > Ge 0.7 eV, and λ = hc/E_g', () => {
    expect(GAPS.map((g) => g.eg)).toEqual([0.7, 1.1, 5.4]);
    expect(wavelengthNm(1.1)).toBeCloseTo(1127.27, 2);
    expect(wavelengthNm(5.4)).toBeCloseTo(229.63, 2);
  });
  it('Example 14.2: 1 ppm of arsenic in 5 × 10²⁸ Si atoms/m³ gives n_e = 5 × 10²² and n_h = 4.5 × 10⁹ m⁻³', () => {
    const d = doping({ name: 'arsenic', valence: 5 }, 1);
    expect(d.type).toBe('n');
    expect(10 ** d.logE).toBeCloseTo(5e22, -19);
    expect(10 ** d.logH / 4.5e9).toBeCloseTo(1, 3);
  });
  it('a trivalent dopant makes a p-type crystal: the holes are the majority and the electrons the rare carrier', () => {
    const d = doping({ name: 'boron', valence: 3 }, 1);
    expect(d.type).toBe('p');
    expect(d.logH).toBeGreaterThan(d.logE);
    expect(d.logE + d.logH).toBeCloseTo(LOG_NI2, 5);
  });
});

describe('every level has three solvable rounds', () => {
  it('level 1: Ge, Si and C in order, each wavelength on the dial with a short run of winners', () => {
    for (const s of seeds) {
      const rounds = gapRounds(lcg(s));
      expect(rounds.map((r) => r.name.split(' ')[0])).toEqual(['germanium', 'silicon', 'carbon']);
      for (const r of rounds) {
        expect(r.sol).toBeGreaterThan(SLIDERS.l.min);
        expect(r.sol).toBeLessThan(SLIDERS.l.max);
        const winners = grid(SLIDERS.l.min, SLIDERS.l.max, SLIDERS.l.step).filter((l) => judgeGap(r, l));
        expect(winners.length).toBeGreaterThanOrEqual(5);
        expect(winners).toContain(Math.round(r.sol));
      }
    }
  });
  it('level 2: an n-type, a p-type and a heavier doping, each count on the dial and judged by a short run of winners', () => {
    for (const s of seeds) {
      const rounds = dopeRounds(lcg(s));
      expect(rounds.map((r) => r.type).slice(0, 2)).toEqual(['n', 'p']);
      expect(rounds[2].ppm).toBeGreaterThanOrEqual(10);
      for (const r of rounds) {
        for (const x of [r.logE, r.logH]) {
          expect(x).toBeGreaterThan(SLIDERS.c.min);
          expect(x).toBeLessThan(SLIDERS.c.max);
        }
        expect(judgeDope(r, r.logE, r.logH).ok).toBe(true);
        const winners = grid(SLIDERS.c.min, SLIDERS.c.max, SLIDERS.c.step).filter((x) => Math.abs(x - r.logE) <= DOPE_TOL);
        expect(winners.length).toBeGreaterThanOrEqual(9);
      }
    }
  });
});

describe('judging: classic mistakes do not win', () => {
  it('level 1: the wavelength for the wrong material, or a photon with the energy of the gap taken as its wavelength, fails', () => {
    for (const r of gapRounds(lcg(3))) {
      for (const other of GAPS.filter((g) => g.eg !== r.eg)) expect(judgeGap(r, wavelengthNm(other.eg))).toBe(false);
      expect(judgeGap(r, r.eg * 1000)).toBe(false);
      expect(judgeGap(r, r.sol * (1 + 1.5 * GAP_TOL))).toBe(false);
    }
  });
  it('level 2: swapping the two carriers, or counting every dopant as a hole and an electron, fails', () => {
    for (const r of dopeRounds(lcg(3))) {
      expect(judgeDope(r, r.logH, r.logE).ok).toBe(false);
      expect(judgeDope(r, r.logE, r.logE).ok).toBe(false);
      expect(judgeDope(r, r.logE, LOG_NI2 - r.logE + 1).ok).toBe(false);
    }
  });
});

describe('words: the working and the misses', () => {
  it('the working names the exercise or the example', () => {
    expect(gapExplain(gapRounds(lcg(3))[0])[1]).toMatch(/Exercise 14\.3; Example 14\.1/);
    expect(dopeExplain(dopeRounds(lcg(3))[0])[1]).toMatch(/Exercises 14\.1, 14\.2; Example 14\.2/);
  });
  it('a gap miss describes the effect and does not state the wavelength', () => {
    const r = gapRounds(lcg(3))[1];
    expect(gapMiss(r, r.sol * 2)).toMatch(/too weak/);
    expect(gapMiss(r, r.sol / 2)).toMatch(/energy to spare/);
    expect(gapMiss(r, r.sol * 2)).not.toContain(String(Math.round(r.sol)));
  });
  it('a doping miss names the effect: too many dopants, too few, the wrong majority, too many or too few thermal pairs', () => {
    const r = dopeRounds(lcg(3))[0];
    expect(r.type).toBe('n');
    expect(dopeMiss(r, r.logE + 1, r.logH)).toMatch(/more free carriers than dopant atoms/);
    expect(dopeMiss(r, r.logE - 1, r.logH)).toMatch(/fewer free carriers than dopant atoms/);
    expect(dopeMiss(r, 10, 15)).toMatch(/holes outnumber the electrons/);
    expect(dopeMiss(r, r.logE, r.logH + 1)).toMatch(/recombine/);
    expect(dopeMiss(r, r.logE, r.logH - 1)).toMatch(/thermal generation/);
    const p = dopeRounds(lcg(3))[1];
    expect(dopeMiss(p, 15, 10)).toMatch(/electrons outnumber the holes/);
  });
  it('test shots read out the helpful numbers', () => {
    expect(gapReading(gapRounds(lcg(3))[1], 1000)).toMatch(/1\.24 eV.*silicon is 1\.1 eV/);
    expect(dopeReading(dopeRounds(lcg(3))[0])).toMatch(/5 valence electrons, silicon has 4/);
    expect(dopeReading(dopeRounds(lcg(3))[1])).toMatch(/3 valence electrons/);
  });
});
