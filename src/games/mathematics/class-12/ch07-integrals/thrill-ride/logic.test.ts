import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { BUILD, POOLS, PYLONS, RIDE, buildRounds, coeffs, firstFault, fitCount, hintText, intel, judge, missText, pylonX, q4, slopeAt, testText, track, verdictTime, winText, type Row } from './logic';

const seeds = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const levels = [1, 2, 3, 4, 5] as const;
const rows: { level: number; k: number; r: Row }[] = levels.flatMap((level) => POOLS[level].flatMap((pool, k) => pool.map((r) => ({ level, k, r }))));
/** Every setting of the knobs: −8..8 for each. */
function settings(n: number): number[][] {
  let all: number[][] = [[]];
  for (let i = 0; i < n; i++) all = all.flatMap((s) => Array.from({ length: 17 }, (_, v) => [...s, v - 8]));
  return all;
}
const S2 = settings(2);
const S3 = settings(3);
const all = (r: Row) => (r.keys.length === 3 ? S3 : S2);

describe('the pools', () => {
  it('have the brief’s size: 5 levels, 3 rounds each, 2-knob rows except level 2', () => {
    expect(rows.length).toBe(26);
    for (const level of levels) {
      expect(POOLS[level].length).toBe(3);
      for (const pool of POOLS[level]) for (const r of pool) expect(r.keys.length).toBe(level === 2 ? 3 : 2);
    }
  });

  it('every answer is an antiderivative: the track’s slope is f(x) at 30 points of [lo, hi]', () => {
    for (const { r } of rows) {
      for (let j = 0; j < 30; j++) {
        const x = r.lo + ((r.hi - r.lo) * (j + 0.5)) / 30;
        expect(Math.abs(slopeAt(r, r.ans, x) - r.f(x))).toBeLessThan(1e-4 * Math.max(1, Math.abs(r.f(x))));
      }
    }
  });

  it('the answer has a non-zero knob, so the all-zero start never wins', () => {
    for (const { r } of rows) expect(r.ans.some((v) => v !== 0)).toBe(true);
    for (const { r } of rows) expect(r.ans.every((v) => v >= -8 && v <= 8)).toBe(true);
  });

  it('the station fixes the height: every track starts at 0 at x = lo', () => {
    for (const { r } of rows) for (const c of [r.ans, r.ans.map(() => 5)]) expect(track(r, c)(r.lo)).toBe(0);
  });
});

describe('exactly one setting wins, and the picture agrees', () => {
  it('for every row, only the answer passes judge, and only the answer fits all 8 clips', () => {
    for (const { r } of rows) {
      let winners = 0;
      for (const c of all(r)) {
        const j = judge(r, c);
        const f = firstFault(r, c);
        if (j) {
          winners++;
          expect(c).toEqual(r.ans);
          expect(f).toBeNull();
          expect(fitCount(r, c)).toBe(PYLONS);
        } else {
          expect(f, `${r.name} ${c.join(',')}`).not.toBeNull();
          expect(fitCount(r, c)).toBeLessThan(PYLONS);
        }
      }
      expect(winners).toBe(1);
    }
  });

  it('every wrong setting misses a clip by a margin that the picture can show (at least 4% of the largest |f|)', () => {
    for (const { r } of rows) {
      const top = Math.max(...Array.from({ length: PYLONS }, (_, i) => Math.abs(r.f(pylonX(r, i)))));
      for (const c of all(r)) {
        if (judge(r, c)) continue;
        const worst = Math.max(...Array.from({ length: PYLONS }, (_, i) => Math.abs(slopeAt(r, c, pylonX(r, i)) - r.f(pylonX(r, i)))));
        expect(worst, `${r.name} ${c.join(',')}`).toBeGreaterThanOrEqual(0.04 * top);
      }
    }
  });

  it('a fault is reported as too steep when the track is above the clip’s slope, too shallow below', () => {
    for (const { r } of rows) {
      for (const c of all(r)) {
        const f = firstFault(r, c);
        if (!f) continue;
        const x = pylonX(r, f.pylon);
        expect(slopeAt(r, c, x) > r.f(x)).toBe(f.steep);
      }
    }
  });
});

describe('rounds', () => {
  it('level 2 rounds have keys p, q, r and the others A, B, the same in all three rounds; assist is 0, 1, 2; the zero setting never wins', () => {
    for (const seed of seeds) {
      for (const level of levels) {
        const rounds = buildRounds(level, createRng(seed));
        expect(rounds.length).toBe(3);
        expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
        for (const r of rounds) {
          expect(r.keys).toEqual(level === 2 ? ['p', 'q', 'r'] : ['A', 'B']);
          expect(judge(r, r.keys.map(() => 0))).toBe(false);
          expect(judge(r, coeffs(r, Object.fromEntries(r.keys.map((k, i) => [k, r.ans[i]]))))).toBe(true);
        }
      }
    }
  });

  it('different seeds give different tracks in a level that has a choice', () => {
    const names = new Set(seeds.map((s) => buildRounds(1, createRng(s))[0].name));
    expect(names.size).toBe(2);
  });
});

describe('times', () => {
  it('the verdict lands before 2.4 s for every setting, and at exactly 1.9 s for the answer', () => {
    for (const { r } of rows) {
      for (const c of all(r)) {
        const t = verdictTime(r, c);
        expect(t).toBeLessThan(2.4);
        if (judge(r, c)) expect(t).toBeCloseTo(BUILD + RIDE, 9);
        else expect(t).toBeLessThan(BUILD + RIDE + 0.3 + 1e-9);
      }
      expect(verdictTime(r, r.ans)).toBeCloseTo(1.9, 9);
    }
  });

  it('the fault verdict is when the car reaches the faulty pylon, plus the 0.3 s flight', () => {
    const r = POOLS[1][0][0];
    const f = firstFault(r, [0, 0])!;
    expect(verdictTime(r, [0, 0])).toBeCloseTo(BUILD + (RIDE * (f.pylon + 0.5)) / PYLONS + 0.3, 9);
  });
});

describe('words', () => {
  it('q4 writes quarters as reduced fractions with a true minus sign', () => {
    expect(q4(4)).toBe('1');
    expect(q4(-2)).toBe('−1/2');
    expect(q4(1)).toBe('1/4');
    expect(q4(-8)).toBe('−2');
    expect(q4(6)).toBe('3/2');
    expect(q4(0)).toBe('0');
    expect(q4(-3)).toBe('−3/4');
    expect(q4(8)).toBe('2');
  });

  it('a miss names a pylon and too steep or too shallow, never a knob followed by =, never the answer', () => {
    for (const { r } of rows) {
      for (const c of all(r)) {
        if (judge(r, c)) continue;
        const t = missText(r, c);
        expect(t).toMatch(/pylon [1-8] too (steep|shallow)/);
        expect(t).toContain('flew off');
        for (const k of r.keys) expect(t).not.toContain(`${k} =`);
        expect(t).not.toContain(r.answerText);
      }
    }
  });

  it('the test lay reports how many of the 8 clips fit: 8 for the answer, fewer otherwise', () => {
    for (const { r } of rows) {
      expect(testText(r, r.ans)).toBe('Test lay: the track fits 8 of the 8 clips.');
      expect(testText(r, r.ans.map(() => 0))).toMatch(/fits [0-7] of the 8 clips/);
    }
  });

  it('the test lay is a count only: it never names a pylon, a direction or a coefficient', () => {
    for (const { r } of rows) {
      const t = testText(r, r.ans.map((v) => v + 1));
      expect(t).not.toMatch(/steep|shallow|pylon/);
      expect(t).not.toContain(r.answerText);
    }
  });

  it('the win text gives the integral, the antiderivative with + C and the working', () => {
    for (const { r } of rows) {
      const t = winText(r);
      expect(t).toContain('rode the whole track');
      expect(t).toContain(`∫ ${r.name} dx = ${r.answerText}`);
      expect(t).toContain('+ C');
      expect(t).toContain(r.work);
    }
  });

  it('the hint line fades round by round', () => {
    const [a, b, c] = buildRounds(1, createRng(5));
    expect(hintText(a)).toContain('shows live');
    expect(hintText(b)).toContain('test lay costs a charge');
    expect(hintText(c)).toContain('Boss round: no preview');
    expect(hintText(a)).toContain(intel(a));
    expect(intel(a)).toContain(a.form);
  });

  it('level 2 forms spell the exponent: e^(x), e^(2x) and e^(−x)', () => {
    expect(POOLS[2][0][0].form).toBe('F(x) = e^(x)(p x² + q x + r) + C');
    expect(POOLS[2][0][1].form).toBe('F(x) = e^(2x)(p x² + q x + r) + C');
    expect(POOLS[2][1][0].form).toBe('F(x) = e^(−x)(p x² + q x + r) + C');
  });
});
