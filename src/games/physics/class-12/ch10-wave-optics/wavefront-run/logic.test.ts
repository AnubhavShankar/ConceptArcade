import { describe, expect, it } from 'vitest';
import { C, HEAD, RACE, SLIDERS, asinD, bandExplain, bandMiss, bandRounds, fmtHead, freq, judgeBand, judgeMud, judgeRainbow, mudExplain, mudMiss, mudReading, mudRounds, raceTimes, rainbowDelay, rainbowExplain, rainbowLeader, rainbowMiss, rainbowRounds, rainbowTest, sinD } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const grid = (min: number, max: number, step: number) => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => Math.round((min + i * step) * 1e6) / 1e6);

describe('the numbers from the textbook', () => {
  it('Exercise 10.1: 589 nm light entering water (n = 1.33) has λ′ = 443 nm, v′ = 2.26 × 10⁸ m/s and the same frequency, 5.09 × 10¹⁴ Hz', () => {
    expect(589 / 1.33).toBeCloseTo(442.9, 1);
    expect(C / 1.33).toBeCloseTo(2.256, 3);
    expect(freq(C, 589)).toBeCloseTo(5.093e14, -11);
    expect(freq(C / 1.33, 589 / 1.33)).toBeCloseTo(freq(C, 589), -8);
  });
  it('Exercise 10.3: light in glass of n = 1.5 travels at 2 × 10⁸ m/s', () => {
    expect(C / 1.5).toBe(2);
  });
});

describe('every level has three solvable rounds', () => {
  it('level 1: the wavelength and speed are clean, the frequency is conserved, and exactly one pair of dials wins', () => {
    for (const s of seeds.slice(0, 40)) {
      const rounds = mudRounds(lcg(s));
      expect(rounds).toHaveLength(3);
      expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(rounds.map((r) => r.n)).toEqual([...rounds.map((r) => r.n)].sort((a, b) => b - a));
      for (const r of rounds) {
        expect(Number.isInteger(r.lamSol)).toBe(true);
        expect(r.vSol * 100).toBeCloseTo(Math.round(r.vSol * 100), 6);
        expect(freq(r.vSol, r.lamSol)).toBeCloseTo(freq(C, r.lambda), -6);
        const winners: [number, number][] = [];
        for (const lam of grid(SLIDERS.lam.min, SLIDERS.lam.max, SLIDERS.lam.step)) {
          if (!judgeMud(r, lam, r.vSol).lamOk) continue;
          for (const v of grid(SLIDERS.v.min, SLIDERS.v.max, SLIDERS.v.step)) if (judgeMud(r, lam, v).ok) winners.push([lam, v]);
        }
        expect(winners).toHaveLength(1);
      }
    }
  });
  it('level 2: sin r = (v₂/v₁) sin 30°, to a clean half degree, and only that dial setting wins', () => {
    for (const s of seeds) {
      const rounds = bandRounds(lcg(s));
      expect(rounds).toHaveLength(3);
      expect(new Set(rounds.map((r) => `${r.v1}/${r.v2}`)).size).toBe(3);
      for (const r of rounds) {
        expect(sinD(r.rSol)).toBeCloseTo((r.v2 / r.v1) * sinD(30), 9);
        expect(r.rSol).toBeLessThan(85);
        const winners = grid(SLIDERS.r.min, SLIDERS.r.max, SLIDERS.r.step).filter((d) => judgeBand(r, d));
        expect(winners).toHaveLength(1);
        expect(Math.abs(winners[0] - r.rSol)).toBeLessThanOrEqual(0.26);
      }
    }
  });
});

describe('judging: classic mistakes do not win', () => {
  it('level 1: the wavelength unchanged, or the speed unchanged, or λ′ = nλ, fails', () => {
    const r = mudRounds(lcg(3))[0];
    expect(judgeMud(r, r.lambda, C).ok).toBe(false);
    expect(judgeMud(r, r.lambda * r.n, r.vSol).ok).toBe(false);
    expect(judgeMud(r, r.lamSol, C).ok).toBe(false);
    expect(judgeMud(r, r.lamSol, r.vSol).ok).toBe(true);
  });
  it('level 2: the angle of incidence, and the inverted speed ratio, fail', () => {
    for (const r of bandRounds(lcg(3))) {
      expect(judgeBand(r, r.i)).toBe(false);
      expect(judgeBand(r, asinD(Math.min(1, (r.v1 / r.v2) * sinD(r.i))))).toBe(false);
    }
  });
});

describe('words: the working and the misses', () => {
  it('the working names the exercise and keeps the frequency fixed', () => {
    const r = mudRounds(lcg(3))[0];
    expect(mudExplain(r)[0]).toMatch(/Exercise 10\.1/);
    expect(mudExplain(r)[1]).toMatch(/reflected/);
    expect(bandExplain(bandRounds(lcg(3))[0])[1]).toMatch(/Huygens/);
  });
  it('a miss describes the effect and never states the right answer', () => {
    const r = mudRounds(lcg(3))[0];
    expect(mudMiss(r, r.lambda, r.vSol)).toMatch(/drift off the crests/);
    // no change at all keeps the frequency, so the karts keep up, but the numbers are wrong for this medium
    expect(mudMiss(r, r.lambda, C)).toMatch(/keep up with the crests/);
    expect(mudMiss(r, r.lamSol, r.vSol + 0.1)).toMatch(/drift off|not what its refractive index allows|does not have/);
    expect(mudMiss(r, r.lambda, r.vSol)).not.toContain(`${r.lamSol} nm`);
    const b = bandRounds(lcg(3))[0];
    expect(bandMiss(b, b.rSol + 10)).toMatch(/cuts through/);
    expect(bandMiss(b, b.rSol - 10)).toMatch(/floats clear/);
  });
  it('a test shot reports both frequencies', () => {
    const r = mudRounds(lcg(3))[0];
    expect(mudReading(r, r.lamSol, r.vSol)).toMatch(/They agree/);
    expect(mudReading(r, r.lambda, r.vSol)).toMatch(/do not agree/);
    expect(mudReading(r, r.lambda, C)).toMatch(/They agree/);
  });
});

// ---- level 3: Rainbow race ---------------------------------------------------------------------------------------------------
const headGrid = grid(HEAD.min, HEAD.max, HEAD.step);
/** Δt = d(n_v − n_r)/c computed straight from the formula, in tenths of a ns. */
const dtFormula = (d: number, nr: number, nv: number) => Math.round(((d * (nv - nr)) / 3e8) * 1e9 * 10);

describe('rainbow race: the numbers', () => {
  it('every row of the brief gives Δt = d(n_v − n_r)/c with c = 3 × 10⁸ m/s', () => {
    const rows: [number, number, number, number][] = [
      [3, 1.51, 1.53, 2],
      [6, 1.5, 1.53, 6],
      [15, 1.52, 1.54, 10],
      [12, 1.51, 1.535, 10],
    ];
    for (const [d, nr, nv, dt] of rows) {
      expect(dtFormula(d, nr, nv)).toBe(dt);
      // the same figure to within rounding, in seconds
      expect((d * (nv - nr)) / 3e8).toBeCloseTo(dt * 1e-10, 12);
    }
  });
  it('the rounds on every seed: 0.2, 0.6 and 1.0 ns, matching the formula and the times through the glass', () => {
    const seen = new Set<string>();
    for (const s of seeds.slice(0, 80)) {
      const rounds = rainbowRounds(lcg(s));
      expect(rounds).toHaveLength(3);
      expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(rounds.map((r) => r.dt)).toEqual([2, 6, 10]);
      for (const r of rounds) {
        expect(r.dt).toBe(dtFormula(r.d, r.nr, r.nv));
        expect(r.nv).toBeGreaterThan(r.nr);
        // red takes d·n_r/c and violet d·n_v/c in the glass: the difference is the head start
        expect(r.trT).toBe(Math.round(((r.d * r.nr) / 3e8) * 1e10));
        expect(r.tvT).toBe(Math.round(((r.d * r.nv) / 3e8) * 1e10));
        expect(r.tvT - r.trT).toBe(r.dt);
        expect(r.dt / 10).toBeGreaterThanOrEqual(HEAD.min / 10);
        expect(r.dt / 10).toBeLessThanOrEqual(HEAD.max / 10);
      }
      seen.add(`${rounds[2].d}/${rounds[2].nv}`);
    }
    expect([...seen].sort()).toEqual(['12/1.535', '15/1.54']);
  });
});

describe('rainbow race: only the answer wins', () => {
  it('exactly one head start on the dial wins, in every round on every seed, and the start never does', () => {
    for (const s of seeds.slice(0, 80)) {
      for (const r of rainbowRounds(lcg(s))) {
        const winners = headGrid.filter((x) => judgeRainbow(r, x));
        expect(winners).toEqual([r.dt]);
        expect(judgeRainbow(r, HEAD.start)).toBe(false);
        expect(r.dt).not.toBe(HEAD.start);
        expect(headGrid).toContain(r.dt);
      }
    }
  });
  it('the sign matters: red first, the unchanged setting, the doubled answer and the transit times all fail', () => {
    for (const r of rainbowRounds(lcg(3))) {
      expect(judgeRainbow(r, -r.dt)).toBe(false);
      expect(judgeRainbow(r, 0)).toBe(false);
      expect(judgeRainbow(r, 2 * r.dt)).toBe(false);
      expect(judgeRainbow(r, r.dt - 1)).toBe(false);
      expect(judgeRainbow(r, r.dt + 1)).toBe(false);
      expect(judgeRainbow(r, r.dt)).toBe(true);
    }
  });
  it('the answer is not a fixed position: it differs by round and the boss row is not given away by the round alone', () => {
    const answers = rainbowRounds(lcg(3)).map((r) => r.dt);
    expect(new Set(answers).size).toBe(3);
  });
});

describe('rainbow race: a miss shows direction only', () => {
  it('who leaves first follows the sign of the error', () => {
    for (const r of rainbowRounds(lcg(5))) {
      for (const x of headGrid) {
        const lead = rainbowLeader(r, x);
        expect(lead).toBe(x < r.dt ? 'red' : x > r.dt ? 'violet' : 'together');
        // the pulses really would leave in that order: violet leaves at tvT − x, red at trT
        const gap = r.tvT - x - r.trT;
        // violet later than red (gap > 0) means red leaves first
        expect(Math.sign(gap)).toBe(lead === 'red' ? 1 : lead === 'violet' ? -1 : 0);
      }
    }
  });
  it('the miss text names only the pulse that left first, and nothing else but the player’s own figure', () => {
    for (const r of rainbowRounds(lcg(5))) {
      for (const x of headGrid) {
        if (judgeRainbow(r, x)) continue;
        const t = rainbowMiss(r, x);
        expect(t).toMatch(x < r.dt ? /the red pulse left the block first\.$/ : /the violet pulse left the block first\.$/);
        // take out the player's own figure: no number is left, so no answer, no gap, no time
        expect(t.replace(fmtHead(x), '')).not.toMatch(/\d/);
        expect(t).not.toMatch(/Δt|n_v|n_r|speed|c\/n/);
      }
    }
  });
  it('the drawn race: exit gap is zero on a win and the SAME fixed gap on every miss, whatever the error', () => {
    for (const r of rainbowRounds(lcg(5))) {
      const gaps = { red: new Set<number>(), violet: new Set<number>() };
      for (const x of headGrid) {
        const t = raceTimes(r, x);
        const gap = Math.round((t.exitV - t.exitR) * 1e6) / 1e6;
        if (judgeRainbow(r, x)) {
          expect(gap).toBe(0);
          continue;
        }
        // red leaves first: violet exits after red (gap > 0); violet first: gap < 0
        if (rainbowLeader(r, x) === 'red') gaps.red.add(gap);
        else gaps.violet.add(gap);
      }
      expect([...gaps.red]).toEqual([RACE.gap]);
      expect([...gaps.violet]).toEqual([-RACE.gap]);
    }
  });
  it('the drawn race fits the 2.4 s shot, every kart has a positive run time, and the verdict lands after the later exit', () => {
    for (const r of rainbowRounds(lcg(5))) {
      for (const x of headGrid) {
        const t = raceTimes(r, x);
        expect(t.durR).toBeGreaterThan(0.5);
        expect(t.durV).toBeGreaterThan(0.5);
        expect(Math.max(t.exitR, t.exitV)).toBeLessThan(2.2);
        expect(rainbowDelay(r, x)).toBeGreaterThan(Math.max(t.exitR, t.exitV));
        expect(rainbowDelay(r, x)).toBeLessThan(2.4);
        // the later kart starts after the earlier one in the order the player set, and the start gap is only their own setting
        if (x > 0) expect(t.sv).toBe(0);
        if (x < 0) expect(t.sr).toBe(0);
      }
    }
  });
  it('the exit gap does not depend on the error: two different misses on one side draw the same race after the start', () => {
    const r = rainbowRounds(lcg(5))[2];
    const a = raceTimes(r, -30);
    const b = raceTimes(r, -10);
    expect(a.exitV - a.exitR).toBe(b.exitV - b.exitR);
    const c = raceTimes(r, r.dt + 5);
    const d = raceTimes(r, 30);
    expect(c.exitV - c.exitR).toBe(d.exitV - d.exitR);
  });
});

describe('rainbow race: words and the helper that fades', () => {
  it('the working shows d(n_v − n_r)/c and the answer, and names Exercise 10.3', () => {
    for (const r of rainbowRounds(lcg(3))) {
      const [a, b] = rainbowExplain(r);
      expect(a).toContain(`violet (n = ${r.nv}) is slower than red (n = ${r.nr})`);
      expect(a).toContain(`${(r.dt / 10).toFixed(1)} ns`);
      expect(a).toContain('(3 × 10⁸)');
      expect(b).toMatch(/Exercise 10\.3/);
    }
  });
  it('the paid test may show numbers: the time through the glass for each colour and where violet leaves', () => {
    const r = rainbowRounds(lcg(3))[0];
    expect(rainbowTest(r, 0)).toMatch(/red takes 15\.1 ns .* violet takes 15\.3 ns, so violet leaves 0\.2 ns after red/);
    expect(rainbowTest(r, 5)).toMatch(/0\.3 ns before red/);
    expect(rainbowTest(r, r.dt)).toMatch(/together with red/);
  });
  it('the text of a win is not shown by a miss (a miss never contains the working)', () => {
    const r = rainbowRounds(lcg(3))[1];
    expect(rainbowMiss(r, 0)).not.toContain(rainbowExplain(r)[0]);
    expect(rainbowMiss(r, 0)).toMatch(/red pulse/);
    expect(rainbowMiss(r, 40 - 10)).toMatch(/violet pulse/);
  });
});
