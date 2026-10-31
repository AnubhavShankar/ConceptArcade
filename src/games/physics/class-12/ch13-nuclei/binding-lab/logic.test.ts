import { describe, expect, it } from 'vitest';
import { HIT, SLIDERS, START, bindExplain, markX, bindMiss, bindReading, bindRounds, bindingMeV, judgeBind, judgePower, judgeQ, massDefect, powerExplain, powerMiss, powerReading, powerRounds, qExplain, qMeV, qMiss, qReading, qRounds } from './logic';

const grid = (min: number, max: number, step: number) => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => Math.round((min + i * step) * 1e6) / 1e6);

describe('the numbers from the textbook', () => {
  it('Exercise 13.1: the binding energy of nitrogen-14 is 104.7 MeV', () => {
    expect(bindingMeV(7, 14, 14.00307)).toBeCloseTo(104.66, 1);
  });
  it('Exercise 13.2: iron-56 has 492.3 MeV (8.79 MeV per nucleon) and bismuth-209 has 1640.3 MeV (7.85 per nucleon)', () => {
    expect(bindingMeV(26, 56, 55.934939)).toBeCloseTo(492.26, 1);
    expect(bindingMeV(26, 56, 55.934939) / 56).toBeCloseTo(8.79, 2);
    expect(bindingMeV(83, 209, 208.980388)).toBeCloseTo(1640.26, 1);
  });
  it('Exercise 13.5: Q = −4.03 MeV for ¹H + ³H → ²H + ²H (endothermic) and +4.62 MeV for ¹²C + ¹²C → ²⁰Ne + ⁴He (exothermic)', () => {
    const r = qRounds();
    expect(r.find((x) => x.label.includes('tritium'))!.sol).toBeCloseTo(-4.03, 2);
    expect(r.find((x) => x.label.includes('carbon'))!.sol).toBeCloseTo(4.62, 2);
  });
  it('Exercise 13.6: Fe-56 into two Al-28 has Q = −26.9 MeV, so the fission is not energetically possible', () => {
    expect(qMeV(55.93494, 2 * 27.98191)).toBeCloseTo(-26.9, 1);
  });
  it('Exercise 13.7: 1 kg of plutonium-239 releases 4.5 × 10²⁶ MeV, and Exercise 13.8: 2 kg of deuterium runs a 100 W lamp for about 5 × 10⁴ years', () => {
    const pu = powerRounds().find((r) => r.name.includes('plutonium'))!;
    expect((pu.atoms * 180) / 1e26).toBeCloseTo(4.54, 2);
    const d = powerRounds().find((r) => r.name.includes('deuterium'))!;
    expect((d.sol * 1e13) / 100 / 3.154e7 / 1e4).toBeCloseTo(4.997, 2);
  });
  it('Example 13.2: 1 g of matter is 9 × 10¹³ J', () => {
    expect(powerRounds().find((r) => r.name.includes('1 g'))!.sol).toBeCloseTo(9, 9);
  });
  it('the mass defect is positive for every bound nucleus', () => {
    for (const r of bindRounds()) expect(massDefect(r.z, r.a, r.m)).toBeGreaterThan(0);
  });
});

describe('every level has three solvable rounds', () => {
  it('level 1: nitrogen, iron, bismuth; the binding energy is reachable and the winning dial values are a short run', () => {
    const rounds = bindRounds();
    expect(rounds.map((r) => r.name)).toEqual(['nitrogen-14', 'iron-56', 'bismuth-209']);
    expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
    for (const r of rounds) {
      expect(r.sol).toBeGreaterThan(SLIDERS.be.min);
      expect(r.sol).toBeLessThan(SLIDERS.be.max);
      const winners = grid(SLIDERS.be.min, SLIDERS.be.max, SLIDERS.be.step).filter((e) => judgeBind(r, e));
      expect(winners.length).toBeGreaterThanOrEqual(5);
      for (const w of winners) expect(Math.abs(w - r.sol) / r.sol).toBeLessThanOrEqual(0.005 + 1e-9);
    }
  });
  it('level 2: one endothermic, one exothermic, and the fission that cannot happen; the sign matters', () => {
    const rounds = qRounds();
    expect(rounds.map((r) => Math.sign(r.sol)).sort()).toEqual([-1, -1, 1]);
    for (const r of rounds) {
      expect(r.sol).toBeGreaterThan(SLIDERS.q.min);
      expect(r.sol).toBeLessThan(SLIDERS.q.max);
      expect(grid(SLIDERS.q.min, SLIDERS.q.max, SLIDERS.q.step).filter((q) => judgeQ(r, q)).length).toBeGreaterThanOrEqual(5);
      expect(judgeQ(r, -r.sol)).toBe(false);
    }
  });
  it('level 3: three fuels in increasing order of energy, each reachable on the dial', () => {
    const rounds = powerRounds();
    expect(rounds.map((r) => r.sol)).toEqual([...rounds.map((r) => r.sol)].sort((a, b) => a - b));
    for (const r of rounds) {
      expect(r.sol).toBeLessThan(SLIDERS.e.max);
      expect(grid(SLIDERS.e.min, SLIDERS.e.max, SLIDERS.e.step).filter((e) => judgePower(r, e)).length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('judging: classic mistakes do not win', () => {
  it('level 1: forgetting the electrons’ share (using the proton mass) or the u-to-MeV factor fails', () => {
    for (const r of bindRounds()) {
      expect(judgeBind(r, r.dm)).toBe(false);
      expect(judgeBind(r, (r.dm * 931.5) / r.a)).toBe(false);
    }
  });
  it('level 2: giving the mass difference in u, or Q with the sign flipped, fails', () => {
    for (const r of qRounds()) {
      expect(judgeQ(r, r.left - r.right)).toBe(false);
      expect(judgeQ(r, -r.sol)).toBe(false);
    }
  });
  it('level 3: a result in MeV instead of joules, or atoms instead of mass, fails', () => {
    for (const r of powerRounds()) {
      expect(judgePower(r, r.sol * 1e13 / 1.6e-13 / 1e13)).toBe(false);
      expect(judgePower(r, r.sol / 1000)).toBe(false);
    }
  });
});

describe('words: the working and the misses', () => {
  it('the working names the exercises', () => {
    expect(bindExplain(bindRounds()[0])[1]).toMatch(/Exercises 13\.1, 13\.2/);
    expect(qExplain(qRounds()[0])[1]).toMatch(/endothermic|exothermic/);
    expect(powerExplain(powerRounds()[0])[1]).toMatch(/Exercises 13\.7, 13\.8/);
  });
  it('a miss describes the effect and never states the answer', () => {
    const b = bindRounds()[0];
    expect(bindMiss(b, b.sol * 2)).toMatch(/more binding/);
    expect(bindMiss(b, b.sol / 2)).toMatch(/too little/);
    const q = qRounds()[0];
    expect(qMiss(q, -q.sol)).toMatch(/sign is wrong/);
    expect(qMiss(q, q.sol + 5)).toMatch(/energy/);
    const p = powerRounds()[0];
    expect(powerMiss(p, p.sol * 2)).toMatch(/more energy/);
    expect(powerMiss(p, p.sol / 2)).toMatch(/supplies more/);
  });
  it('test shots read out the masses and counts', () => {
    expect(bindReading(bindRounds()[0])).toMatch(/mass defect is/);
    expect(qReading(qRounds()[0])).toMatch(/difference of/);
    expect(powerReading(powerRounds()[0])).toMatch(/atoms|kilogram/);
  });
});

describe('no leaks: the start, the burst point and the misses', () => {
  const levels = [
    { key: 'be' as const, rounds: bindRounds, judge: judgeBind, miss: bindMiss, S: SLIDERS.be },
    { key: 'q' as const, rounds: qRounds, judge: judgeQ, miss: qMiss, S: SLIDERS.q },
    { key: 'e' as const, rounds: powerRounds, judge: judgePower, miss: powerMiss, S: SLIDERS.e },
  ];
  it('the start never wins any round of its level, and the hit point is never where the answer is', () => {
    for (const L of levels) {
      for (const r of L.rounds() as never[]) {
        expect(L.judge(r, START[L.key])).toBe(false);
        // the burst of points is a fixed point: it is not above the true value on the bar or track
        expect(Math.abs(HIT[L.key][0] - markX(L.key, (r as { sol: number }).sol))).toBeGreaterThan(20);
      }
    }
  });
  it('the burst point is a constant, not a function of the round', () => {
    expect(HIT.be).toEqual([200, 170]);
    expect(HIT.q).toEqual([330, 170]);
    expect(HIT.e).toEqual([330, 150]);
  });
  it('two wrong settings on the same side give the same miss text, and no miss text holds the answer or a number', () => {
    for (const L of levels) {
      for (const r of L.rounds() as never[]) {
        const sol = (r as { sol: number }).sol;
        const wrong = grid(L.S.min, L.S.max, L.S.step * 10).filter((x) => !L.judge(r, x));
        // for the Q level the sign counts as a side of its own
        const side = (x: number) => (L.key === 'q' ? `${Math.sign(x) !== Math.sign(sol)}${x > sol}` : `${x > sol}`);
        const texts = new Map<string, Set<string>>();
        for (const x of wrong) {
          const s = side(x);
          if (!texts.has(s)) texts.set(s, new Set());
          texts.get(s)!.add(L.miss(r, x));
        }
        for (const set of texts.values()) expect(set.size).toBe(1);
        for (const set of texts.values()) for (const t of set) expect(t).not.toMatch(/\d/);
      }
    }
  });
});
