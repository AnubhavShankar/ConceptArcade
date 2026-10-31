import { describe, expect, it } from 'vitest';
import { fmt } from '@core/judge';
import { createRng } from '@core/random';
import {
  BREW, COIL, DEG, DIAL, PLUME, RT2, SCOPE, SIGN, buildRounds, energy, fault, goal, hintText, instant, judge, lcdText, meterText, missText, powerL1, powerL2, verdictDelay, winText,
  type Round, type Values,
} from './logic';

const SEEDS = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const range = (lo: number, hi: number, step = 1) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);

type L = 1 | 2 | 3 | 4;
const LEVELS: L[] = [1, 2, 3, 4];
const key = (level: L) => (['r', 'v', 't', 'th'] as const)[level - 1];
const dialOf = (level: L) => [DIAL.r, DIAL.v, DIAL.t, DIAL.th][level - 1];
const answerOf = (r: Round) => (r.kind === 'coil' ? r.r : r.kind === 'scope' ? r.v : r.kind === 'brew' ? r.t : r.th);
const scan = (level: L) => {
  const d = dialOf(level);
  return range(d.min, d.max, d.step);
};
/** Every row of a level as a Round, with its pool index. */
const rowsOf = (level: L): { r: Round; k: number }[] => {
  const out: { r: Round; k: number }[] = [];
  const assist = [0, 1, 2] as const;
  if (level === 1) COIL.forEach((p, k) => p.forEach((row) => out.push({ r: { ...row, kind: 'coil', assist: assist[k] }, k })));
  if (level === 2) SCOPE.forEach((p, k) => p.forEach((row) => out.push({ r: { ...row, kind: 'scope', assist: assist[k] }, k })));
  if (level === 3) BREW.forEach((p, k) => p.forEach((row) => out.push({ r: { ...row, kind: 'brew', assist: assist[k] }, k })));
  if (level === 4) SIGN.forEach((p, k) => p.forEach(({ kind, ...row }) => out.push({ r: { ...row, trig: kind, kind: 'sign', assist: assist[k] }, k })));
  return out;
};

describe('the pools', () => {
  it('coil rows: v²/p = r exactly', () => {
    for (const p of COIL) for (const row of p) expect((row.v * row.v) / row.p).toBe(row.r);
  });
  it('scope rows: the peak is √2 × rms to 3 figures and solves back within 1.5 V', () => {
    for (const p of SCOPE) {
      for (const row of p) {
        expect(fmt(RT2 * row.v)).toBe(String(row.vm));
        expect(Math.abs(row.vm / RT2 - row.v)).toBeLessThan(1.5);
      }
    }
  });
  it('brew rows: the energy in the right time is exactly the order', () => {
    for (const p of BREW) for (const row of p) expect(Math.abs(energy(row, row.t) - row.e)).toBeLessThan(1e-9);
  });
  it('sign rows: the trigger is √2·rms·sin(th) to 3 figures and solves back within 1 degree', () => {
    for (const p of SIGN) {
      for (const row of p) {
        expect(fmt(instant(row, row.th))).toBe(String(row.at));
        expect(Math.abs(Math.asin(row.at / (RT2 * row.rms)) / DEG - row.th)).toBeLessThan(1);
        // the "rms is the peak" mistake lands well away from the answer
        expect(Math.abs(Math.asin(Math.min(1, row.at / row.rms)) / DEG - row.th)).toBeGreaterThan(4);
      }
    }
  });
  it('the plume has exactly the three fixed sizes', () => {
    expect(PLUME).toEqual({ weak: 0.3, right: 1, over: 1.6 });
  });
});

describe('one winner per round', () => {
  for (const level of LEVELS) {
    it(`level ${level}: only the answer passes judge across the whole dial, and the start fails`, () => {
      const d = dialOf(level);
      const k = key(level);
      for (const { r } of rowsOf(level)) {
        const winners = scan(level).filter((x) => judge(r, { [k]: x } as Values));
        expect(winners).toEqual([answerOf(r)]);
        expect(judge(r, { [k]: d.start } as Values)).toBe(false);
        expect(answerOf(r)).toBeGreaterThan(d.min);
        expect(answerOf(r)).toBeLessThan(d.max);
        expect((answerOf(r) - d.min) % d.step).toBe(0); // on the dial grid
      }
    });
    it(`level ${level}: no answer appears in two pools`, () => {
      const answers = rowsOf(level).map(({ r, k }) => ({ a: answerOf(r), k }));
      for (const x of answers) for (const y of answers) if (x.k !== y.k) expect(x.a).not.toBe(y.a);
    });
  }
});

describe('rounds', () => {
  for (const level of LEVELS) {
    it(`level ${level}: three rounds of the right kind, assist 0, 1, 2, round k from pool k (80 seeds)`, () => {
      const kinds = ['coil', 'scope', 'brew', 'sign'] as const;
      for (const seed of SEEDS) {
        const rs = buildRounds(level, createRng(seed));
        expect(rs.length).toBe(3);
        expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
        rs.forEach((r, k) => {
          expect(r.kind).toBe(kinds[level - 1]);
          const pool = rowsOf(level).filter((row) => row.k === k).map((row) => answerOf(row.r));
          expect(pool).toContain(answerOf(r));
        });
      }
    });
  }
  it('is the first use of the random generator: the same seed gives the same rounds', () => {
    for (const level of LEVELS) expect(buildRounds(level, createRng(5))).toEqual(buildRounds(level, createRng(5)));
  });
});

describe('faults', () => {
  it('lower R or selector blows the fuse, higher is too weak', () => {
    for (const { r } of rowsOf(1)) {
      expect(fault(r, { r: (r as { r: number }).r - 1 })).toBe('blow');
      expect(fault(r, { r: (r as { r: number }).r + 1 })).toBe('weak');
    }
    for (const { r } of rowsOf(2)) {
      const v = (r as { v: number }).v;
      expect(fault(r, { v: v - 10 })).toBe('blow');
      expect(fault(r, { v: v + 10 })).toBe('weak');
    }
  });
  it('shorter time is cold, longer boils over; smaller angle is early, larger is late', () => {
    for (const { r } of rowsOf(3)) {
      const t = (r as { t: number }).t;
      expect(fault(r, { t: t - 10 })).toBe('cold');
      expect(fault(r, { t: t + 10 })).toBe('over');
    }
    for (const { r } of rowsOf(4)) {
      const th = (r as { th: number }).th;
      expect(fault(r, { th: th - 5 })).toBe('early');
      expect(fault(r, { th: th + 5 })).toBe('late');
      expect(fault(r, { th: th + 150 })).toBe('late'); // the falling half is late too
    }
  });
  it('the physics behind the fault names is honest', () => {
    for (const { r } of rowsOf(1)) {
      if (r.kind !== 'coil') continue;
      expect(powerL1(r, r.r - 1)).toBeGreaterThan(r.p);
      expect(powerL1(r, r.r)).toBeCloseTo(r.p, 9);
      expect(powerL1(r, r.r + 1)).toBeLessThan(r.p);
    }
    for (const { r } of rowsOf(2)) {
      if (r.kind !== 'scope') continue;
      expect(powerL2(r.v - 10, r.v)).toBeGreaterThan(1000);
      expect(powerL2(r.v, r.v)).toBe(1000);
      expect(powerL2(r.v + 10, r.v)).toBeLessThan(1000);
    }
  });
  it('the verdict lands at the brief’s moments', () => {
    const coil = rowsOf(1)[0].r as Extract<Round, { kind: 'coil' }>;
    expect(verdictDelay(coil, { r: coil.r - 1 })).toBe(0.55);
    expect(verdictDelay(coil, { r: coil.r + 1 })).toBe(1.05);
    expect(verdictDelay(coil, { r: coil.r })).toBe(1.1);
    expect(verdictDelay(rowsOf(3)[0].r, { t: 30 })).toBe(1.0);
    expect(verdictDelay(rowsOf(4)[0].r, { th: 0 })).toBe(0.8);
  });
});

describe('words', () => {
  const token = (r: Round) => (r.kind === 'coil' ? `${r.r} Ω` : r.kind === 'scope' ? `${r.v} V` : r.kind === 'brew' ? `${r.t} s` : `${r.th}°`);
  for (const level of LEVELS) {
    it(`level ${level}: a miss names the player’s own value and never the answer; it says what to change`, () => {
      const k = key(level);
      for (const { r } of rowsOf(level)) {
        for (const x of scan(level)) {
          if (x === answerOf(r)) continue;
          const text = missText(r, { [k]: x } as Values);
          expect(text.length).toBeGreaterThan(30);
          expect(has(text, token(r))).toBe(false);
          const own = r.kind === 'coil' ? `${x} Ω` : r.kind === 'scope' ? `${x} V` : r.kind === 'brew' ? `${x} s` : `${x}°`;
          expect(has(text, own)).toBe(true);
          expect(text).toMatch(/(Use|Turn|Run|Sync)/);
        }
      }
    });
    it(`level ${level}: the paid check and the LCD read the player’s own setting, and the check never prints the answer token`, () => {
      const k = key(level);
      for (const { r } of rowsOf(level)) {
        for (const x of scan(level)) {
          const v = { [k]: x } as Values;
          expect(meterText(r, v)).toContain('Meter check');
          expect(lcdText(r, v).length).toBeGreaterThan(3);
          if (x !== answerOf(r)) expect(has(meterText(r, v), token(r))).toBe(false);
        }
      }
    });
  }
  it('every win teaches the working', () => {
    for (const { r } of rowsOf(1)) expect(winText(r)).toMatch(/V²\/P.*√2/);
    for (const { r } of rowsOf(2)) expect(winText(r)).toContain('√2');
    for (const { r } of rowsOf(3)) expect(winText(r)).toMatch(/V²\/R/);
    for (const { r } of rowsOf(4)) expect(winText(r)).toContain('sin ωt');
  });
  it('the goal line and the hint are short and fade round by round', () => {
    for (const level of LEVELS) {
      for (const { r } of rowsOf(level)) {
        expect(goal(r).length).toBeLessThan(48);
        expect(hintText(r)).toMatch(r.assist === 0 ? /live/ : r.assist === 1 ? /costs a charge/ : /no meter/);
      }
    }
  });
  it('the power in a resistor never goes negative and averages V²/R, half its peak', () => {
    const r = BREW[0][0];
    let sum = 0;
    const n = 3600;
    for (let i = 0; i < n; i++) {
      const p = (RT2 * r.v * Math.sin((2 * Math.PI * i) / n)) ** 2 / r.r;
      expect(p).toBeGreaterThanOrEqual(0);
      sum += p;
    }
    expect(sum / n).toBeCloseTo((r.v * r.v) / r.r, 6);
  });
});
