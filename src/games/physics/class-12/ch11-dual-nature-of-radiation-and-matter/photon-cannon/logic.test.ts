import { describe, expect, it } from 'vitest';
import { FLY_SPEED, STOP_START, THRESHOLD_START, stopKind, stopTurnFraction, thresholdFly } from './logic';
import { BRIGHT_ROWS,BRIGHT_SLIDERS, BRIGHT_START, NEEDLE_MAX, NEEDLE_OFFSET, brightExplain, brightIntel, brightMiss, brightReading, brightRound, brightRounds, brightWin, judgeBright, needleReading, streamKind, turnFraction, voltsText } from './logic';
import { E, H, LINE_START, SLIDERS, judgeLine, judgeStop, judgeThreshold, kMax, lineExplain, lineMiss, lineReading, lineRounds, photonEv, stopExplain, stopMiss, stopReading, stopRounds, stopV, thresholdExplain, thresholdMiss, thresholdReading, thresholdRounds } from './logic';

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
    expect(lineMiss(l, H, l.phi + 1)).toMatch(/passes below both measured points/);
    expect(lineMiss(l, H, l.phi - 1)).toMatch(/passes above both measured points/);
    // a steeper line pivoted about the middle of the two points is below the left one and above the right one
    const mid = ((l.f1 + l.f2) / 2) * (H / 16);
    expect(lineMiss(l, H * 1.5, l.phi + 0.5 * mid)).toMatch(/climbs too steeply/);
    expect(lineMiss(l, H * 0.6, l.phi - 0.4 * mid)).toMatch(/climbs too gently/);
    expect(lineMiss(l, H * 1.2, l.phi)).toMatch(/passes above both measured points/);
  });
  it('level 3: a miss gives only the side of each point, in four fixed sentences with no number and no verdict on a dial', () => {
    const seen = new Set<string>();
    for (const s of Array.from({ length: 30 }, (_, i) => i * 7919 + 13)) {
      for (const r of lineRounds(lcg(s))) {
        for (let h = SLIDERS.h.min; h <= SLIDERS.h.max; h += 0.25) {
          for (let phi = SLIDERS.phi.min; phi <= SLIDERS.phi.max; phi += 0.25) {
            if (judgeLine(r, h, phi).ok) continue;
            const t = lineMiss(r, h, phi);
            seen.add(t);
            expect(t).not.toMatch(/\d|slope|parallel/);
          }
        }
      }
    }
    expect(seen.size).toBe(4);
  });
  it('level 3: the start dials never win a round, and neither dial starts at any round’s answer', () => {
    for (const s of Array.from({ length: 80 }, (_, i) => i * 7919 + 13)) {
      for (const r of lineRounds(lcg(s))) {
        expect(judgeLine(r, LINE_START.h, LINE_START.phi).ok).toBe(false);
        expect(judgeLine(r, LINE_START.h, LINE_START.phi).phiOk).toBe(false);
        expect(judgeLine(r, LINE_START.h, LINE_START.phi).hOk).toBe(false);
      }
    }
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

describe('levels 1 and 2: the start never wins, and a miss shows fixed effects that depend only on the side', () => {
  const seeds80 = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
  it('the start wavelength and the start voltage never win any round', () => {
    for (const s of seeds80) {
      for (const r of thresholdRounds(lcg(s))) expect(judgeThreshold(r, THRESHOLD_START)).toBe(false);
      for (const r of stopRounds(lcg(s))) expect(judgeStop(r, STOP_START)).toBe(false);
    }
  });
  it('level 1: the electron speed has one fixed value per side, whatever the wavelength', () => {
    for (const s of seeds80) {
      for (const r of thresholdRounds(lcg(s))) {
        const win = new Set<number>();
        const strong = new Set<number>();
        const weak = new Set<number>();
        for (const lam of grid(SLIDERS.lam.min, SLIDERS.lam.max, SLIDERS.lam.step)) {
          const sp = thresholdFly(r, lam);
          if (judgeThreshold(r, lam)) win.add(sp);
          else if (photonEv(lam) < r.phi) weak.add(sp);
          else strong.add(sp);
          // the same words for every setting on a side
          if (!judgeThreshold(r, lam)) expect(thresholdMiss(r, lam)).toBe(photonEv(lam) < r.phi ? thresholdMiss(r, r.lamSol * 1.3) : thresholdMiss(r, r.lamSol * 0.7));
        }
        expect([...win]).toEqual([FLY_SPEED.win]);
        expect([...strong]).toEqual([FLY_SPEED.strong]);
        expect([...weak]).toEqual([0]);
      }
    }
  });
  it('level 2: three fixed patterns, a win stops the fastest electron exactly at the collector, and no pattern is L·K_max/V', () => {
    for (const s of seeds80) {
      for (const r of stopRounds(lcg(s))) {
        const kinds = new Set<string>();
        for (const v of grid(SLIDERS.v.min, SLIDERS.v.max, SLIDERS.v.step)) {
          const kind = stopKind(r, v);
          kinds.add(kind);
          expect(kind === 'stopped').toBe(judgeStop(r, v));
          expect(kind === 'through').toBe(!judgeStop(r, v) && v < r.v0);
          // the same words for every setting on a side
          if (kind === 'through') expect(stopMiss(r, v)).toBe(stopMiss(r, 0));
          if (kind === 'early') expect(stopMiss(r, v)).toBe(stopMiss(r, 4));
        }
        expect([...kinds].sort()).toEqual(['early', 'stopped', 'through']);
      }
    }
    const pat = (kind: 'stopped' | 'through' | 'early') => [1, 2, 3, 4, 5].map((i) => stopTurnFraction(kind, i));
    expect(pat('stopped')[4]).toBe(1);
    expect(pat('stopped').slice(0, 4).every((f) => f < 1)).toBe(true);
    expect(pat('through').filter((f) => f >= 1)).toHaveLength(3);
    expect(pat('through').filter((f) => f < 1).every((f) => f < 0.9)).toBe(true);
    expect(Math.max(...pat('early'))).toBeCloseTo(0.55, 9);
  });
});

describe('level 4: brightness and colour (Sections 11.4.1 to 11.4.3)', () => {
  const seeds80 = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
  /** The brief's answers: [b₂, V₀₂ in volts] for each row of each round, in table order. */
  const BRIEF: [number, number][][] = [
    [[5, 1.2], [7, 0.8], [8, 1.5], [3, 0.6]],
    [[3, 1.6], [2, 2.2], [5, 0.9]],
    [[7, 1.9], [6, 0.5], [8, 1.0]],
  ];
  const bGrid = grid(BRIGHT_SLIDERS.b.min, BRIGHT_SLIDERS.b.max, BRIGHT_SLIDERS.b.step);
  const vGrid = grid(BRIGHT_SLIDERS.vt.min, BRIGHT_SLIDERS.vt.max, BRIGHT_SLIDERS.vt.step);

  it('every row is verified numerically: b₂ = b₁I₂/I₁ (whole), V₀₂ = V₀₁ + (E₂ − E₁), E₂ above φ, and the brief’s answers', () => {
    expect(BRIGHT_ROWS.map((g) => g.length)).toEqual([4, 3, 3]);
    BRIGHT_ROWS.forEach((rows, k) =>
      rows.forEach((row, j) => {
        const [b1, i1, e1, v01, e2, i2] = row;
        const r = brightRound(row, k);
        // the saturation current is proportional to the brightness
        expect((b1 * i2) / i1).toBeCloseTo(Math.round((b1 * i2) / i1), 12);
        expect(r.b2).toBe(Math.round((b1 * i2) / i1));
        expect(r.b2 / b1).toBeCloseTo(i2 / i1, 12);
        // eV₀ = hν − φ with φ fixed by the reference run
        const phi = e1 - v01;
        expect(r.phi).toBeCloseTo(phi, 9);
        expect(e2).toBeGreaterThan(phi);
        expect(r.v02t / 10).toBeCloseTo(e2 - phi, 9);
        expect(r.v02t).toBe(Math.round(r.v02t));
        expect(r.v02t).toBeGreaterThan(0);
        expect(r.v02t).toBeLessThanOrEqual(BRIGHT_SLIDERS.vt.max);
        // the brief's table
        expect(r.b2).toBe(BRIEF[k][j][0]);
        expect(r.v02t / 10).toBeCloseTo(BRIEF[k][j][1], 9);
        // the same colour keeps V₀; a new colour moves it by ΔE
        if (e2 === e1) expect(r.v02t / 10).toBeCloseTo(v01, 9);
        else expect(r.v02t / 10 - v01).toBeCloseTo(e2 - e1, 9);
        // the round-2 rows keep the current, so the brightness does not change
        if (k === 1) {
          expect(i2).toBe(i1);
          expect(r.b2).toBe(b1);
        }
        expect(r.b2).toBeGreaterThanOrEqual(BRIGHT_SLIDERS.b.min);
        expect(r.b2).toBeLessThanOrEqual(BRIGHT_SLIDERS.b.max);
      }),
    );
  });

  it('three rounds with fading help, drawn from the right group, over 80 seeds', () => {
    for (const s of seeds80) {
      const rounds = brightRounds(lcg(s));
      expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      rounds.forEach((r, k) => {
        expect(BRIGHT_ROWS[k].some((row) => row[0] === r.b1 && row[1] === r.i1 && row[2] === r.e1 && row[3] === r.v01 && row[4] === r.e2 && row[5] === r.i2)).toBe(true);
      });
      expect(rounds[0].e2).toBe(rounds[0].e1);
      expect(rounds[1].e2).not.toBe(rounds[1].e1);
      expect(rounds[1].i2).toBe(rounds[1].i1);
      expect(rounds[2].e2).not.toBe(rounds[2].e1);
      expect(rounds[2].i2).not.toBe(rounds[2].i1);
    }
  });

  it('exactly one (brightness, voltage) pair wins each round, the start never wins, and neither dial alone is enough', () => {
    for (const s of seeds80) {
      for (const r of brightRounds(lcg(s))) {
        const winners: [number, number][] = [];
        for (const b of bGrid) for (const vt of vGrid) if (judgeBright(r, b, vt).ok) winners.push([b, vt]);
        expect(winners).toEqual([[r.b2, r.v02t]]);
        // scanning one dial with the other at the answer
        expect(bGrid.filter((b) => judgeBright(r, b, r.v02t).ok)).toEqual([r.b2]);
        expect(vGrid.filter((vt) => judgeBright(r, r.b2, vt).ok)).toEqual([r.v02t]);
        // the start setting is never the answer, on either dial
        expect(judgeBright(r, BRIGHT_START.b, BRIGHT_START.vt).ok).toBe(false);
        expect(BRIGHT_START.b).not.toBe(r.b2);
        expect(BRIGHT_START.vt).not.toBe(r.v02t);
        // the classic mistakes fail: keeping the old V₀ after a colour change, or scaling V₀ with the brightness
        if (r.e2 !== r.e1) expect(judgeBright(r, r.b2, Math.round(r.v01 * 10)).ok).toBe(false);
        expect(judgeBright(r, r.b2, Math.round((r.v02t * r.b2) / r.b1)).ok).toBe(r.b2 === r.b1);
        // the reference brightness only wins in the rounds that keep the current
        expect(judgeBright(r, r.b1, r.v02t).ok).toBe(r.b1 === r.b2);
      }
    }
  });

  it('no row has the reference setting as its answer', () => {
    for (const rows of BRIGHT_ROWS) for (const row of rows) expect(row[4] === row[0] && row[5] === row[1]).toBe(false);
  });

  it('a wrong brightness parks the needle a fixed distance above or below the mark, whatever the brightness', () => {
    for (const s of seeds80) {
      for (const r of brightRounds(lcg(s))) {
        const seen = new Set<number>();
        for (const b of bGrid) {
          const n = needleReading(r, b);
          if (b === r.b2) expect(n).toBe(r.i2);
          else {
            expect(n - r.i2).toBe(b < r.b2 ? -NEEDLE_OFFSET : NEEDLE_OFFSET);
            seen.add(n);
          }
          expect(n).toBeGreaterThanOrEqual(0);
          expect(n).toBeLessThanOrEqual(NEEDLE_MAX);
        }
        expect(seen.size).toBeLessThanOrEqual(2);
      }
    }
  });

  it('the electron stream has three fixed looks: stopped at the collector, partly through, or turned back early', () => {
    const r = brightRounds(lcg(3))[0];
    const looks = new Set(vGrid.map((vt) => streamKind(r, vt)));
    expect([...looks].sort()).toEqual(['early', 'stopped', 'through']);
    for (const vt of vGrid) expect(streamKind(r, vt) === 'stopped').toBe(judgeBright(r, r.b2, vt).ok);
    const all = (kind: 'stopped' | 'through' | 'early') => [0, 1, 2, 3, 4, 5].map((i) => turnFraction(kind, i));
    // a win: the fastest electron turns back exactly at the collector, the others earlier
    expect(all('stopped')[5]).toBe(1);
    expect(all('stopped').slice(0, 5).every((f) => f < 1)).toBe(true);
    // too low: the same three electrons reach the collector whatever the voltage
    expect(all('through').filter((f) => f >= 1)).toHaveLength(3);
    // too high: every electron turns back well short of the collector, leaving a gap
    expect(Math.max(...all('early'))).toBeLessThan(0.6);
  });

  it('a miss gives the direction only: no target current, no stopping voltage, no saturation current', () => {
    for (const s of seeds80) {
      for (const r of brightRounds(lcg(s))) {
        const v0 = voltsText(r.v02t);
        for (const b of bGrid) {
          for (const vt of [0, 5, 10, 15, 20, 25, 30, 40, r.v02t - 1, r.v02t + 1, r.v02t]) {
            if (vt < 0 || vt > 40) continue;
            const j = judgeBright(r, b, vt);
            if (j.ok) continue;
            const m = brightMiss(r, b, vt);
            expect(m).not.toMatch(/µA/);
            expect(m).not.toContain(`${v0} V`);
            expect(m).not.toContain(`photon rate ${r.b2} `);
            if (!j.bOk) {
              // the brightness is checked first, and only the side is named
              expect(m).toBe(`At photon rate ${b} the current saturated ${b < r.b2 ? 'below' : 'above'} the target mark.`);
              expect(m).not.toMatch(/ V/);
            } else {
              expect(m).toContain(`At ${voltsText(vt)} V`);
              expect(m).toContain(vt < r.v02t ? 'still reached the collector' : 'turned back before the gap was closed');
              expect(m).not.toMatch(/photon rate/);
            }
          }
        }
      }
    }
  });

  it('the paid test run may show numbers; the win names the working', () => {
    const r = brightRound(BRIGHT_ROWS[1][1], 1);
    expect(brightReading(r, 2, 0)).toMatch(/saturation current of 8 µA \(target 8 µA\)/);
    expect(brightReading(r, 2, 0)).toMatch(/some still reach the collector/);
    expect(brightReading(r, 2, r.v02t)).toMatch(/none reaches the collector/);
    expect(brightIntel(r)).toBe('Reference run: the lamp sends 2 photon streams and gives a saturation current of 8 µA, and photons of 3.0 eV are stopped by 1.0 V. Now photons of 4.2 eV and a target current of 8 µA: set the photon rate (the number of streams) and the stopping voltage.');
    expect(brightIntel(brightRound(BRIGHT_ROWS[0][3], 0))).toContain('the lamp sends 1 photon stream and');
    expect(brightIntel(brightRound(BRIGHT_ROWS[0][0], 0))).toContain('Now the same colour and a target current of 15 µA');
    expect(brightExplain(r)).toBe('The saturation current is set by how many photons arrive per second, so it is proportional to the photon rate: b = 2 × 8/8 = 2. The stopping potential depends only on the photon energy: φ = 3.0 − 1.0 = 2.0 eV, so V₀ = 4.2 − 2.0 = 2.2 V.');
    expect(brightExplain(brightRound(BRIGHT_ROWS[0][0], 0))).toContain('the same as before, however many photons arrive');
    expect(brightWin(r)).toBe(`Both readings match! ${brightExplain(r)}`);
  });
});
