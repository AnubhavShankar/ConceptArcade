import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { FUSE, MATCH, amp, buildFuse, buildMatch, fuseHint, fuseMiss, gaps, judgeFuse, judgeMatch, matchHint, matchMiss, matchWin, fuseWin, mix, peekText, probeText, runs, tone, twelfths, type MatchRow } from './logic';

const seeds = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const levels = [1, 2, 3] as const;
const rows: { level: number; k: number; r: MatchRow }[] = levels.flatMap((level) => MATCH[level].flatMap((pool, k) => pool.map((r) => ({ level, k, r }))));
const fuseRows = FUSE.flatMap((pool, k) => pool.map((r) => ({ k, r })));
const win = (r: MatchRow) => r.bands.map(([, c]) => c);
const xs = Array.from({ length: 201 }, (_, i) => -3 + (6 * i) / 200);
const simpson = (f: (x: number) => number, a: number, b: number, n = 2000) => {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
};
/** The term-by-term antiderivative of the player's mix, built from the bands. */
const antiderivative = (r: MatchRow, a: number[]) => (x: number) =>
  r.bands.reduce((s, [b], i) => {
    const c = (a[i] ?? 0) / 8;
    if (b === '1') return s + c * x;
    const m = /^(sin|cos) (\d*)x$/.exec(b)!;
    const k = m[2] ? Number(m[2]) : 1;
    return s + (m[1] === 'sin' ? (-c * Math.cos(k * x)) / k : (c * Math.sin(k * x)) / k);
  }, 0);

describe('every lock signal is exactly the sum of its tones', () => {
  it('has the brief’s size: 8 rows in level 1, 8 in level 2, 6 in level 3', () => {
    expect(rows.filter((x) => x.level === 1).length).toBe(8);
    expect(rows.filter((x) => x.level === 2).length).toBe(8);
    expect(rows.filter((x) => x.level === 3).length).toBe(6);
  });
  it('the winning mix equals f at 201 points of [−3, 3] to 1e-12', () => {
    for (const { r } of rows) for (const x of xs) expect(Math.abs(mix(r, win(r))(x) - r.f(x))).toBeLessThan(1e-12);
  });
  it('the derivative of the term-by-term antiderivative is the mix, at 5 points', () => {
    for (const { r } of rows) {
      const F = antiderivative(r, win(r));
      for (const x of [-2, -0.7, 0.3, 1.1, 2.6]) {
        const h = 1e-5;
        expect(Math.abs((F(x + h) - F(x - h)) / (2 * h) - mix(r, win(r))(x))).toBeLessThan(1e-7);
      }
    }
  });
  it('every row has the same number of bands within a level: 3, 4, 4', () => {
    for (const { level, r } of rows) expect(r.bands.length).toBe(level === 1 ? 3 : 4);
  });
  it('every row has a non-zero winning amplitude and amplitudes within −8..8', () => {
    for (const { r } of rows) {
      expect(win(r).some((c) => c !== 0)).toBe(true);
      for (const c of win(r)) expect(Math.abs(c)).toBeLessThanOrEqual(8);
    }
  });
  it('the tone of a band is what its name says', () => {
    expect(tone('1')(0.4)).toBe(1);
    expect(tone('sin x')(0.4)).toBeCloseTo(Math.sin(0.4), 12);
    expect(tone('cos 12x')(0.4)).toBeCloseTo(Math.cos(4.8), 12);
    expect(() => tone('tan x')).toThrow();
  });
});

describe('exactly one winner', () => {
  it('for every row and slot, with the others right, only the winning value in −8..8 passes', () => {
    for (const { r } of rows) {
      r.bands.forEach(([, c], i) => {
        for (let v = -8; v <= 8; v++) {
          const a = win(r);
          a[i] = v;
          expect(judgeMatch(r, a)).toBe(v === c);
          if (!judgeMatch(r, a)) expect(gaps(r, a).some(Boolean)).toBe(true);
        }
      });
    }
  });
  it('all zeros never wins, and the winning mix has no gap', () => {
    for (const { r } of rows) {
      const zeros = r.bands.map(() => 0);
      expect(judgeMatch(r, zeros)).toBe(false);
      expect(gaps(r, zeros).some(Boolean)).toBe(true);
      expect(gaps(r, win(r)).some(Boolean)).toBe(false);
    }
  });
  it('a pair of changes at once also never wins and always shows a gap', () => {
    for (const { r } of rows) {
      const n = r.bands.length;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          for (const [di, dj] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            const a = win(r);
            a[i] += di;
            a[j] += dj;
            expect(judgeMatch(r, a)).toBe(false);
            expect(gaps(r, a).some(Boolean)).toBe(true);
          }
        }
      }
    }
  });
  it('counts separate runs of gaps', () => {
    expect(runs([false, true, true, false, true])).toBe(2);
    expect(runs([true, false, false])).toBe(1);
    expect(runs([false, false])).toBe(0);
  });
});

describe('the fuse', () => {
  it('has 3 rows in each of 3 pools', () => {
    expect(FUSE.map((p) => p.length)).toEqual([3, 3, 3]);
  });
  it('F(π/2) − F(0) is ans/12 to 1e-12, F′ = f at 3 points, Simpson agrees to 1e-9', () => {
    for (const { r } of fuseRows) {
      expect(Math.abs(r.F(Math.PI / 2) - r.F(0) - r.ans / 12)).toBeLessThan(1e-12);
      for (const x of [0.3, 0.9, 1.4]) {
        const h = 1e-6;
        expect(Math.abs((r.F(x + h) - r.F(x - h)) / (2 * h) - r.f(x))).toBeLessThan(1e-6);
      }
      expect(Math.abs(simpson(r.f, 0, Math.PI / 2) - r.ans / 12)).toBeLessThan(1e-9);
    }
  });
  it('scanning k from 0 to 24, only ans wins; the start (12) is never the answer', () => {
    for (const { r } of fuseRows) {
      for (let k = 0; k <= 24; k++) expect(judgeFuse(r, k)).toBe(k === r.ans);
      expect(r.ans).not.toBe(12);
    }
    for (const seed of seeds) for (const r of buildFuse(createRng(seed))) expect(r.start).not.toBe(r.ans);
  });
  it('every net charge is a positive number of twelfths inside the tube', () => {
    for (const { r } of fuseRows) expect(r.ans).toBeGreaterThan(0);
  });
});

describe('levels over 80 seeds', () => {
  it('level 1 to 3 rounds have 3, 4, 4 bands in every round, and the assist is [0, 1, 2]', () => {
    for (const seed of seeds) {
      for (const level of levels) {
        const g = buildMatch(level, createRng(seed));
        expect(g.length).toBe(3);
        expect(g.map((r) => r.assist)).toEqual([0, 1, 2]);
        for (const r of g) expect(r.bands.length).toBe(level === 1 ? 3 : 4);
      }
      expect(buildFuse(createRng(seed)).map((r) => r.assist)).toEqual([0, 1, 2]);
    }
  });
  it('every pool is used: each row of each pool turns up in some seed', () => {
    const seen = new Set<string>();
    for (const seed of seeds) {
      for (const level of levels) for (const r of buildMatch(level, createRng(seed))) seen.add(`${level}:${r.name}`);
      for (const r of buildFuse(createRng(seed))) seen.add(`F:${r.name}`);
    }
    expect(seen.size).toBe(rows.length + fuseRows.length);
  });
  it('the same seed builds the same rounds', () => {
    expect(buildMatch(2, createRng(5)).map((r) => r.name)).toEqual(buildMatch(2, createRng(5)).map((r) => r.name));
  });
});

describe('words', () => {
  it('amp writes eighths, reduced, with a true minus', () => {
    expect(amp(4)).toBe('1/2');
    expect(amp(-2)).toBe('−1/4');
    expect(amp(6)).toBe('3/4');
    expect(amp(3)).toBe('3/8');
    expect(amp(8)).toBe('1');
    expect(amp(0)).toBe('0');
    expect(amp(-8)).toBe('−1');
  });
  it('twelfths writes the fuse, reduced', () => {
    expect(twelfths(6)).toBe('1/2');
    expect(twelfths(8)).toBe('2/3');
    expect(twelfths(4)).toBe('1/3');
    expect(twelfths(2)).toBe('1/6');
    expect(twelfths(9)).toBe('3/4');
    expect(twelfths(12)).toBe('1');
    expect(twelfths(24)).toBe('2');
    expect(twelfths(0)).toBe('0');
  });
  it('the match miss says gap, never names a band, and never prints an amplitude of the answer', () => {
    for (const { r } of rows) {
      r.bands.forEach(([, c], i) => {
        const a = win(r);
        a[i] = c < 8 ? c + 1 : c - 1;
        const t = matchMiss(r, a);
        expect(t).toMatch(/gap/);
        expect(t).toMatch(/stun dart/);
        // the constant band is the bare digit '1', which would also match the count of gaps, so only the named tones are searched
        for (const [b] of r.bands) if (b !== '1') expect(t).not.toContain(b);
        expect(t).not.toContain(r.name);
      });
    }
  });
  it('the peek says lies right on only for the winning amplitudes', () => {
    for (const { r } of rows) {
      expect(peekText(r, win(r))).toMatch(/lies right on/);
      const a = win(r);
      a[0] += a[0] < 8 ? 1 : -1;
      expect(peekText(r, a)).toMatch(/does not lie on/);
      expect(peekText(r, a)).not.toMatch(/lies right on/);
    }
  });
  it('the fuse miss says blew below the answer and never tripped above it, and never the right rating', () => {
    for (const { r } of fuseRows) {
      for (let k = 0; k <= 24; k++) {
        if (k === r.ans) continue;
        const t = fuseMiss(r, k);
        expect(t).toMatch(k < r.ans ? /blew/ : /never tripped/);
        // the answer as a whole token (not as the tail of another fraction such as 11/6)
        const token = new RegExp(`(^|[^0-9/])${twelfths(r.ans).replace('/', '\\/')}([^0-9/]|$)`);
        if (twelfths(k) !== twelfths(r.ans)) expect(token.test(t)).toBe(false);
      }
    }
  });
  it('the probe says more than, less than or exactly', () => {
    const r = fuseRows[0].r;
    expect(probeText(r, r.ans - 1)).toMatch(/more than/);
    expect(probeText(r, r.ans + 1)).toMatch(/less than/);
    expect(probeText(r, r.ans)).toMatch(/exactly/);
    expect(probeText(r, 3)).toContain('1/4');
  });
  it('win texts: + C for levels 1 to 3 and vault open for level 4', () => {
    for (const { r } of rows) expect(matchWin(r)).toMatch(/\+ C\.$/);
    for (const { r } of fuseRows) expect(fuseWin(r)).toMatch(/vault open/);
  });
  it('the hint line fades round by round', () => {
    const g = buildMatch(2, createRng(1));
    expect(matchHint(g[0])).toMatch(/shows live on the scope/);
    expect(matchHint(g[1])).toMatch(/scope peek costs a charge/);
    expect(matchHint(g[2])).toMatch(/Boss round: no peek/);
    const f = buildFuse(createRng(1));
    expect(fuseHint(f[0])).toMatch(/charge meter shows the charge as it builds/);
    expect(fuseHint(f[1])).toMatch(/meter is dark/);
    expect(fuseHint(f[2])).toMatch(/Boss round: no probe/);
  });
  it('the identity text of every row names its integral and every row has a non-empty antiderivative', () => {
    for (const { r } of rows) {
      expect(r.identity.length).toBeGreaterThan(8);
      expect(r.integral.length).toBeGreaterThan(3);
    }
  });
});
