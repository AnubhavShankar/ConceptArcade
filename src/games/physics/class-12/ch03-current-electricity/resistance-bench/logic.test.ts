import { describe, expect, it } from 'vitest';
import {
  BANDS, BREAK, COL, DIAL, JKM, JOINT, SLIDE, WIRE, amps, bandValue, buildRounds, cardText, fault, goalText, hintText, intel, jointI, jointVI, judge, lcdText, loopOhm, meterText, metalLoop, missText, ohms, readingAt,
  testerR, verdictDelay, wantValue, winText, LCD_OFF,
  type Round,
} from './logic';

const SEEDS = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
};
const range = (lo: number, hi: number, step = 1) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The answer token as a separate number: a leading non-digit and no digit or decimal fraction after it, so "km 6" does not match "km 6.5". */
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}(?![0-9]|\\.[0-9])`).test(s);
const KINDS = ['break', 'joint', 'wire', 'slide', 'bands'] as const;
const POOLS = [BREAK, JOINT, WIRE, SLIDE, BANDS] as unknown as object[][][];
const LEVELS = [1, 2, 3, 4, 5] as const;
const row = (level: number, k: number, i: number, assist: 0 | 1 | 2 = 0) => ({ ...POOLS[level - 1][k][i], kind: KINDS[level - 1], assist }) as Round;
const allRows = (level: number) => POOLS[level - 1].flatMap((pool, k) => pool.map((_, i) => row(level, k, i, Math.min(2, k) as 0 | 1 | 2)));
/** The settings the player can reach in a level, as Values. */
const settings = (r: Round): { d?: number; j?: number; b1?: number; b2?: number; m?: number }[] => {
  if (r.kind === 'joint') return range(1, 8).map((j) => ({ j }));
  if (r.kind === 'bands') return range(1, 9).flatMap((b1) => range(0, 9).flatMap((b2) => range(0, 6).map((m) => ({ b1, b2, m }))));
  return range(DIAL.d.min, DIAL.d.max, DIAL.d.step).map((d) => ({ d }));
};
const answerToken = (r: Round) => (r.kind === 'joint' ? `Joint ${r.bad}` : r.kind === 'bands' ? ohms(wantValue(r)) : `km ${r.d}`);

describe('the pools (every row was checked by script)', () => {
  it('break: V/I divided by the loop ohms per km is the answer', () => {
    for (const r of allRows(1).concat(allRows(3)).filter((x) => x.kind === 'break')) {
      if (r.kind !== 'break') continue;
      expect(Math.abs(testerR(r) / loopOhm(r) - r.d)).toBeLessThan(1e-9);
      expect(r.d).toBeGreaterThanOrEqual(1);
      expect(r.d).toBeLessThanOrEqual(11);
      expect(amps(r)).toBeGreaterThan(0);
    }
  });

  it('wire: the reading at the answer is the tester reading, and half rows have the answer beyond the sign', () => {
    for (const r of allRows(3)) {
      if (r.kind !== 'wire') continue;
      expect(Math.abs(readingAt(r, r.d) - r.R)).toBeLessThan(1e-9);
      if (r.half) expect(r.d).toBeGreaterThan(r.s!);
      else expect(Math.abs(metalLoop(r) * r.d - r.R)).toBeLessThan(1e-9);
    }
  });

  it('slide: the reading at the answer is the tester reading, and the answer is never inside the stretched span', () => {
    for (const r of allRows(4)) {
      if (r.kind !== 'slide') continue;
      expect(Math.abs(readingAt(r, r.d) - r.R)).toBeLessThan(1e-9);
      expect(r.d > r.a && r.d < r.a + 1).toBe(false);
    }
  });

  it('bands: V over mA is the value the bands make, band 1 is never black and the digits are in range', () => {
    for (const r of allRows(5)) {
      if (r.kind !== 'bands') continue;
      expect(Math.abs((r.V / r.mA) * 1000 - wantValue(r))).toBeLessThan(1e-9);
      expect(r.d1).toBeGreaterThanOrEqual(2);
      expect(r.d1).toBeLessThanOrEqual(8);
      expect(r.d2).toBeGreaterThanOrEqual(1);
      expect(r.d2).toBeLessThanOrEqual(8);
      expect(r.m).toBeGreaterThanOrEqual(1);
      expect(r.m).toBeLessThanOrEqual(5);
    }
  });

  it('joint: an ohmic joint has the same V/I either way round, the bad one does not, and every trace fits its card', () => {
    for (const r of allRows(2)) {
      if (r.kind !== 'joint') continue;
      for (let j = 1; j <= 8; j++) {
        const { plus, minus } = jointVI(r, j);
        if (j === r.bad) expect(Math.abs(plus - minus) / Math.min(Math.abs(plus), Math.abs(minus))).toBeGreaterThan(0.2);
        else expect(Math.abs(plus - minus)).toBeLessThan(1e-9);
        for (const V of [-2, -1, 0, 1, 2]) expect(Math.abs(jointI(r, j, V)) * 2.2).toBeLessThanOrEqual(15);
      }
    }
  });

  it('joint positions are inside the line and the answer is never at a dial end', () => {
    expect(JKM.length).toBe(8);
    for (const r of allRows(2)) if (r.kind === 'joint') expect([1, 8]).not.toContain(r.bad);
  });
});

describe('exactly one winning setting', () => {
  for (const level of LEVELS) {
    it(`level ${level}: only the answer passes judge, and the start setting fails`, () => {
      for (const r of allRows(level)) {
        const winners = settings(r).filter((x) => judge(r, x));
        expect(winners.length).toBe(1);
        const start = { d: DIAL.d.start, j: DIAL.j.start, b1: DIAL.b1.start, b2: DIAL.b2.start, m: DIAL.m.start };
        expect(judge(r, start)).toBe(false);
        if (r.kind === 'joint') expect(winners[0].j).toBe(r.bad);
        else if (r.kind === 'bands') expect(bandValue(winners[0].b1!, winners[0].b2!, winners[0].m!)).toBe(wantValue(r));
        else expect(winners[0].d).toBe(r.d);
      }
    });
  }
  it('the answer is never at a dial end (km 0 or 12)', () => {
    for (const level of [1, 3, 4]) for (const r of allRows(level)) if ('d' in r) expect([0, 12]).not.toContain(r.d);
  });
});

describe('the tester reading agrees with the direction', () => {
  it('for every row of levels 1, 3 and 4 and every wrong d, near means the reading is below the tester reading, and never equal', () => {
    for (const level of [1, 3, 4]) {
      for (const r of allRows(level)) {
        for (const d of range(0, 12, 0.5)) {
          if (d === (r as { d: number }).d) continue;
          const f = fault(r, { d });
          const reading = readingAt(r, d);
          expect(reading).not.toBe(testerR(r));
          expect(f === 'near').toBe(reading < testerR(r));
          expect(f === 'far').toBe(reading > testerR(r));
        }
      }
    }
  });
  it('the reading rises with the distance', () => {
    for (const level of [1, 3, 4]) for (const r of allRows(level)) for (let d = 0.5; d <= 12; d += 0.5) expect(readingAt(r, d)).toBeGreaterThan(readingAt(r, d - 0.5));
  });
});

describe('the pools of one level never share an answer', () => {
  it('the three pools of every level have disjoint answers', () => {
    for (const level of LEVELS) {
      const sets = POOLS[level - 1].map((pool, k) => new Set(pool.map((_, i) => answerToken(row(level, k, i)))));
      for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) for (const x of sets[a]) expect(sets[b].has(x), `level ${level}: ${x}`).toBe(false);
    }
  });
});

describe('buildRounds', () => {
  it('gives 3 rounds of the level’s kind, assist 0, 1, 2, and round k comes from pool k', () => {
    for (const seed of SEEDS) {
      for (const level of LEVELS) {
        const rounds = buildRounds(level, lcg(seed));
        expect(rounds.length).toBe(3);
        expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
        rounds.forEach((r, k) => {
          expect(r.kind).toBe(KINDS[level - 1]);
          const { kind: _kind, assist: _assist, ...rest } = r;
          expect(POOLS[level - 1][k]).toContainEqual(rest);
        });
      }
    }
  });
  it('is deterministic for a seed and varies across seeds', () => {
    expect(buildRounds(1, lcg(5))).toEqual(buildRounds(1, lcg(5)));
    const firsts = new Set(SEEDS.map((s) => (buildRounds(1, lcg(s))[0] as Extract<Round, { kind: 'break' }>).d));
    expect(firsts.size).toBeGreaterThan(2);
  });
});

describe('delays', () => {
  it('0.95 s for levels 1, 3 and 4, 1.45 s for level 2, 0.65 s for level 5, all inside the 2.4 s take', () => {
    const want = [0.95, 1.45, 0.95, 0.95, 0.65];
    LEVELS.forEach((level, i) => {
      const r = row(level, 0, 0);
      expect(verdictDelay(r)).toBe(want[i]);
      expect(verdictDelay(r)).toBeLessThan(2.4);
    });
  });
});

describe('words', () => {
  it('a miss never contains the answer, and ends by saying what to change', () => {
    const ends = /(Drive farther out\.|Drive back\.|Try another joint\.|Use a bigger value\.|Use a smaller value\.)$/;
    for (const level of LEVELS) {
      for (const r of allRows(level)) {
        const token = answerToken(r);
        for (const x of settings(r).filter((_, i) => r.kind !== 'bands' || i % 7 === 0)) {
          if (judge(r, x)) continue;
          const t = missText(r, x);
          expect(t.length).toBeGreaterThan(20);
          expect(t).toMatch(ends);
          // the miss text names only the player's own value, which is never the answer's value
          expect(has(t, token)).toBe(false);
          if (r.kind === 'bands') for (const c of COL) expect(t.includes(c)).toBe(false);
        }
      }
    }
  });
  it('a miss names the direction that agrees with the physics', () => {
    for (const r of allRows(1)) {
      if (r.kind !== 'break') continue;
      expect(missText(r, { d: r.d - 0.5 })).toMatch(/Drive farther out\.$/);
      expect(missText(r, { d: r.d + 0.5 })).toMatch(/Drive back\.$/);
    }
    for (const r of allRows(5)) {
      if (r.kind !== 'bands') continue;
      expect(missText(r, { b1: r.d1, b2: r.d2, m: r.m - 1 })).toMatch(/Use a bigger value\.$/);
      expect(missText(r, { b1: r.d1, b2: r.d2, m: r.m + 1 })).toMatch(/Use a smaller value\.$/);
    }
  });
  it('a win states the working', () => {
    const want: RegExp[][] = [[/R = V\/I/], [/straight line through the origin/], [/ρl\/A|quarter of the area/], [/² =|less than/], [/R = V\/I/]];
    LEVELS.forEach((level) => {
      for (const r of allRows(level)) {
        const t = winText(r);
        expect(want[level - 1].some((re) => re.test(t)), `${level}: ${t}`).toBe(true);
      }
    });
    expect(winText(row(1, 0, 0))).toBe('Lights on! R = V/I = 12 V ÷ 2 A = 6 Ω. At 1 Ω per km, the short is 6 ÷ 1 = 6 km out.');
    expect(winText(row(5, 0, 0))).toMatch(/^Water’s flowing! R = V\/I = 9.4 V ÷ 2 mA = 4.7 kΩ = 47 × 10\^2 Ω: yellow, violet, red\.$/);
  });
  it('the goal lines are at most 40 characters', () => {
    for (const level of LEVELS) for (const r of allRows(level)) expect(goalText(r).length).toBeLessThanOrEqual(40);
  });
  it('the card and the intel state the given facts, the hint fades with the round', () => {
    expect(cardText(row(1, 2, 0))).toBe('1 Ω per km in each wire');
    expect(cardText(row(1, 0, 0))).toBe('1 Ω per km of line');
    expect(cardText(row(3, 0, 0))).toBe('copper · ρ = 1.7 × 10⁻⁸ Ω m · 17 mm²');
    expect(cardText(row(3, 2, 0))).toBe('0.5 Ω per km of line');
    expect(cardText(row(4, 0, 0))).toBe('');
    for (const level of LEVELS) {
      expect(hintText(row(level, 0, 0, 0))).toMatch(/Round 1: the tester screen is live\.$/);
      expect(hintText(row(level, 1, 0, 1))).toMatch(/a tester check costs a charge\.$/);
      expect(hintText(row(level, 2, 0, 2))).toMatch(/Storm at its worst: no tester screen\.$/);
      expect(intel(row(level, 0, 0)).length).toBeGreaterThan(20);
    }
  });
  it('the tester check and the screen read the player’s own setting', () => {
    const r1 = row(1, 0, 0);
    expect(meterText(r1, { d: 4 })).toBe('Tester check: a short at km 4 would read 4 Ω.');
    expect(lcdText(r1, { d: 4 })).toBe('short here: 4 Ω');
    const r2 = row(2, 0, 0);
    expect(meterText(r2, { j: 1 })).toMatch(/^Tester check: joint 1 gives V\/I = .* Ω at \+2 V and .* Ω at −1 V\.$/);
    expect(lcdText(r2, { j: 1 })).toMatch(/^J1: .* Ω at \+2 V · .* Ω at −1 V$/);
    const r5 = row(5, 0, 0);
    expect(meterText(r5, { b1: 1, b2: 0, m: 0 })).toBe('Tester check: your bands make 10 Ω.');
    expect(lcdText(r5, { b1: 4, b2: 7, m: 2 })).toBe('your bands: 4.7 kΩ');
    expect(LCD_OFF).toBe('— — —');
  });
  it('ohms is written as a resistor label', () => {
    expect(ohms(330)).toBe('330 Ω');
    expect(ohms(4700)).toBe('4.7 kΩ');
    expect(ohms(47000)).toBe('47 kΩ');
    expect(ohms(2200000)).toBe('2.2 MΩ');
  });
});
