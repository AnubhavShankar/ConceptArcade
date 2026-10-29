import { describe, expect, it } from 'vitest';
import { E, H, SLIDERS, judgeLine, judgeStop, judgeThreshold, kMax, lineExplain, lineMiss, lineReading, lineRounds, photonEv, stopExplain, stopMiss, stopReading, stopRounds, stopV, thresholdExplain, thresholdMiss, thresholdReading, thresholdRounds } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const grid = (min: number, max: number, step: number) => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => Math.round((min + i * step) * 1e6) / 1e6);

describe('the numbers from the textbook', () => {
  it('Example 11.2: caesium (φ = 2.14 eV) has a threshold of about 5.16 × 10¹⁴ Hz, and 0.60 V stopping potential means 454 nm light', () => {
    const f0 = ((2.14 * E) / H) * 10;
    expect(f0).toBeCloseTo(5.16, 2);
    expect(1240 / (0.6 + 2.14)).toBeCloseTo(452.6, 0);
  });
  it('Exercise 11.2: 6 × 10¹⁴ Hz on caesium gives K_max = 0.34 eV, so V₀ = 0.34 V', () => {
    const k = (H * 6e14 * 1e-34 * 1e0) / E / 1e-19 / 1e0;
    expect(k).toBeGreaterThan(0);
    expect(kMax(500, 2.14)).toBeCloseTo(0.34, 6);
  });
  it('Exercise 11.7: a metal of φ = 4.2 eV gives no emission for 330 nm light (3.76 eV)', () => {
    expect(photonEv(330)).toBeCloseTo(3.76, 2);
    expect(kMax(330, 4.2)).toBe(0);
  });
  it('Exercise 11.5: a slope of 4.14 × 10⁻¹⁵ V s means h = 6.6 × 10⁻³⁴ J s', () => {
    expect(4.14e-15 * 1.6e-19).toBeCloseTo(6.62e-34, -36);
  });
  it('the V₀–f line has slope h/e and meets V₀ = 0 at the threshold', () => {
    expect(stopV(H, 5.16, 2.14)).toBeCloseTo(0, 1);
    expect(stopV(H, 10, 2.14) - stopV(H, 9, 2.14)).toBeCloseTo((H / E) * 0.1, 9);
  });
});

describe('every level has three solvable rounds', () => {
  it('level 1: whole-nm threshold wavelengths, increasing with the work function falling, one dial range that wins', () => {
    for (const s of seeds) {
      const rounds = thresholdRounds(lcg(s));
      expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      const phis = rounds.map((r) => r.phi);
      expect(phis).toEqual([...phis].sort((a, b) => a - b));
      for (const r of rounds) {
        expect(Number.isInteger(r.lamSol)).toBe(true);
        expect(r.lamSol).toBeGreaterThan(SLIDERS.lam.min);
        expect(r.lamSol).toBeLessThan(SLIDERS.lam.max);
        const winners = grid(SLIDERS.lam.min, SLIDERS.lam.max, SLIDERS.lam.step).filter((l) => judgeThreshold(r, l));
        expect(winners).toContain(r.lamSol);
        for (const w of winners) expect(Math.abs(photonEv(w) - r.phi)).toBeLessThanOrEqual(0.02);
        // a contiguous run of at most about ±10 nm around the threshold (0.02 eV is a wider range of nm for a long threshold)
        expect(winners.length).toBeLessThanOrEqual(23);
        expect(winners[winners.length - 1] - winners[0] + 1).toBe(winners.length);
        // a clearly shorter or longer wavelength never wins
        expect(judgeThreshold(r, r.lamSol * 0.8)).toBe(false);
        expect(judgeThreshold(r, r.lamSol * 1.25)).toBe(false);
      }
    }
  });
  it('level 2: stopping potentials that are multiples of 0.01 V, in increasing order, and exactly one dial setting wins', () => {
    for (const s of seeds) {
      const rounds = stopRounds(lcg(s));
      expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(rounds.map((r) => r.v0)).toEqual([...rounds.map((r) => r.v0)].sort((a, b) => a - b));
      for (const r of rounds) {
        expect(r.v0 * 100).toBeCloseTo(Math.round(r.v0 * 100), 6);
        expect(r.v0).toBeGreaterThan(0);
        expect(r.v0).toBeLessThanOrEqual(SLIDERS.v.max);
        expect(grid(SLIDERS.v.min, SLIDERS.v.max, SLIDERS.v.step).filter((v) => judgeStop(r, v))).toHaveLength(1);
      }
    }
  });
  it('level 3: the measured points lie above threshold on a line with slope h/e, and only the right h and φ win', () => {
    for (const s of seeds) {
      const rounds = lineRounds(lcg(s));
      expect(new Set(rounds.map((r) => r.phi)).size).toBe(3);
      for (const r of rounds) {
        expect(r.v1).toBeGreaterThan(0);
        expect(r.v2).toBeGreaterThan(r.v1);
        const slope = (r.v2 - r.v1) / (r.f2 - r.f1);
        expect(((slope * E) / 0.1) * 1).toBeCloseTo(H, 1);
        expect(judgeLine(r, H, r.phi).ok).toBe(true);
        expect(judgeLine(r, H * 1.1, r.phi).ok).toBe(false);
        expect(judgeLine(r, H, r.phi + 0.5).ok).toBe(false);
        // the line through the dials passes through the two points
        expect(Math.abs(stopV(H, r.f1, r.phi) - r.v1)).toBeLessThan(0.006);
        expect(Math.abs(stopV(H, r.f2, r.phi) - r.v2)).toBeLessThan(0.006);
      }
    }
  });
});

describe('judging: classic mistakes do not win', () => {
  it('level 1: hc/φ in the wrong unit, or the work function treated as a wavelength, fails', () => {
    for (const r of thresholdRounds(lcg(3))) {
      expect(judgeThreshold(r, r.phi)).toBe(false);
      expect(judgeThreshold(r, r.lamSol * 2)).toBe(false);
    }
  });
  it('level 2: giving the photon energy (not K_max), or forgetting the work function, fails', () => {
    for (const r of stopRounds(lcg(3))) {
      expect(judgeStop(r, photonEv(r.lam))).toBe(false);
      expect(judgeStop(r, r.phi)).toBe(r.phi === r.v0);
    }
  });
});

describe('words: the working and the misses', () => {
  it('the working names the exercise', () => {
    expect(thresholdExplain(thresholdRounds(lcg(3))[0])[0]).toMatch(/Exercise 11\.7/);
    expect(stopExplain(stopRounds(lcg(3))[0])[1]).toMatch(/Exercises 11\.2/);
    expect(lineExplain(lineRounds(lcg(3))[0])[0]).toMatch(/Exercise 11\.5/);
  });
  it('a miss describes the effect and never states the answer', () => {
    const t = thresholdRounds(lcg(3))[0];
    expect(thresholdMiss(t, t.lamSol * 1.3)).toMatch(/too weak/);
    expect(thresholdMiss(t, t.lamSol * 0.7)).toMatch(/more than strong enough/);
    expect(thresholdMiss(t, t.lamSol * 1.3)).not.toContain(`${t.lamSol} nm`);
    const s = stopRounds(lcg(3))[0];
    expect(stopMiss(s, s.v0 - 0.1)).toMatch(/still get through/);
    expect(stopMiss(s, s.v0 + 0.5)).toMatch(/stronger than it needs/);
    const l = lineRounds(lcg(3))[0];
    expect(lineMiss(l, H * 1.2, l.phi)).toMatch(/wrong slope/);
    expect(lineMiss(l, H, l.phi + 1)).toMatch(/too high or too low/);
  });
  it('test shots read out the energies and the points', () => {
    const t = thresholdRounds(lcg(3))[0];
    expect(thresholdReading(t, t.lamSol * 1.3)).toMatch(/No electron can leave/);
    expect(thresholdReading(t, t.lamSol * 0.7)).toMatch(/Electrons leave with up to/);
    const s = stopRounds(lcg(3))[0];
    expect(stopReading(s, 0)).toMatch(/some still reach the collector/);
    expect(stopReading(s, s.v0 + 0.5)).toMatch(/none reaches the collector/);
    const l = lineRounds(lcg(3))[0];
    expect(lineReading(l, H, l.phi)).toMatch(/the measurements are/);
  });
});
