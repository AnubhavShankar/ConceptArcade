import { describe, expect, it } from 'vitest';
import { fmt } from '@core/judge';
import {
  CAL, DUST, E, G, GAP, HOLD, N_DIAL, U_DIAL, buildRounds, calFault, checkText, dustFault, faultOf, fits, goalText, hintLine, holdFault, intel, isDust, lcdText, missText, offBy, push, reading, weight, winText,
  type CalRow, type DustRow, type Fault, type HoldRow, type Round,
} from './logic';

const SEEDS = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The token as a separate number, so "12 electrons" does not match "2 electrons". */
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const holdRows = HOLD.flat();
const calRows = CAL.flat();
const dustRows = DUST.flat();
const uRange = Array.from({ length: Math.round((U_DIAL.max - U_DIAL.min) / U_DIAL.step) + 1 }, (_, i) => Number((U_DIAL.min + i * U_DIAL.step).toFixed(6)));
const nRange = Array.from({ length: N_DIAL.max - N_DIAL.min + 1 }, (_, i) => N_DIAL.min + i);
const patterns = Array.from({ length: 32 }, (_, m) => [0, 1, 2, 3, 4].map((i) => ((m >> i) & 1) === 1));
const pattern = (r: DustRow) => r.ks.map((k) => (isDust(k) ? '1' : '0')).join('');
const hold = (row: HoldRow, assist: 0 | 1 | 2 = 0): Round => ({ ...row, kind: 'hold', assist });
const cal = (row: CalRow, assist: 0 | 1 | 2 = 0): Round => ({ ...row, kind: 'cal', assist });
const dust = (row: DustRow, assist: 0 | 1 | 2 = 0): Round => ({ ...row, kind: 'dust', assist });

describe('the pools (every row was checked by script)', () => {
  it('hold: the shown mass is the mass that balances the answer, and only the answer hovers the drop', () => {
    for (const r of holdRows) {
      expect(fmt((r.n * E * r.V) / (G * GAP) / 1e-15)).toBe(String(r.m));
      expect(Math.abs((r.m * 1e-15 * G * GAP) / (E * r.V) - r.n)).toBeLessThan(0.02);
      const ok = nRange.filter((n) => Math.abs(push(r, n) / weight(r) - 1) < 0.02);
      expect(ok).toEqual([r.n]);
    }
  });
  it('cal: readings are counts times the unit, the counts share no factor, and only the answer fits every reading', () => {
    for (const r of calRows) {
      r.ns.forEach((n, i) => expect(r.reads[i]).toBe(Number((n * r.u).toFixed(1))));
      expect(r.ns.reduce(gcd)).toBe(1);
      expect(Math.min(...r.ns)).toBeGreaterThanOrEqual(2);
      expect(r.u).toBeGreaterThan(2);
      expect(r.u).toBeLessThan(4);
      expect(uRange.filter((u) => fits(r, u))).toEqual([r.u]);
      for (const u of uRange.filter((x) => Math.abs(x - r.u) > 1e-9)) expect(Math.max(...r.reads.map((q) => offBy(q, u))), `u = ${u}`).toBeGreaterThanOrEqual(0.15);
    }
  });
  it('dust: distinct readings, 1 or 2 dust drops, 3 or more good ones, clear gaps from whole numbers of e, and no pattern shared between rounds', () => {
    for (const r of dustRows) {
      const reads = r.ks.map(reading);
      expect(new Set(reads).size).toBe(5);
      const nd = r.ks.filter(isDust).length;
      expect(nd === 1 || nd === 2).toBe(true);
      expect(5 - nd).toBeGreaterThanOrEqual(3);
      for (const k of r.ks) {
        const e = (reading(k) / 1.6);
        const off = Math.abs(e - Math.round(e));
        if (isDust(k)) expect(off).toBeGreaterThanOrEqual(0.3);
        else expect(off).toBeLessThan(0.01);
      }
    }
    const seen = new Map<string, number>();
    DUST.forEach((pool, k) => pool.forEach((r) => {
      const p = pattern(r);
      if (seen.has(p)) expect(seen.get(p), `pattern ${p}`).toBe(k);
      seen.set(p, k);
    }));
    DUST.forEach((pool, k) => pool.forEach((r) => DUST.forEach((other, j) => j !== k && other.forEach((o) => expect(pattern(o) === pattern(r), `${pattern(r)} in pools ${k} and ${j}`).toBe(false)))));
  });
  it('the reading helper writes 1.07, 3.73, 4.80', () => {
    expect(reading(2)).toBe(1.07);
    expect(reading(7)).toBe(3.73);
    expect(reading(9)).toBe(4.8);
  });
});

describe('exactly one winning setting', () => {
  it('level 1: only n electrons hovers the drop, and the start setting does not', () => {
    for (const r of holdRows) {
      expect(nRange.filter((n) => holdFault(r, n) === null)).toEqual([r.n]);
      expect(holdFault(r, N_DIAL.start)).not.toBeNull();
      expect(holdFault(r, r.n - 1)).toBe('low');
      expect(holdFault(r, r.n + 1)).toBe('high');
    }
  });
  it('level 2: only the unit wins, and the start setting does not', () => {
    for (const r of calRows) {
      expect(uRange.filter((u) => calFault(r, u) === null)).toEqual([r.u]);
      expect(calFault(r, U_DIAL.start)).toBe('offrung');
    }
  });
  it('level 3: of all 32 flag patterns only the dust pattern wins; nothing flagged does not', () => {
    for (const r of dustRows) {
      const want = r.ks.map(isDust);
      const wins = patterns.filter((p) => dustFault(r, p) === null);
      expect(wins).toEqual([want]);
      expect(dustFault(r, [false, false, false, false, false])).toBe('kept');
    }
  });
  it('kept dust is reported before a tossed good drop', () => {
    const r = dust({ ks: [9, 7, 15, 12, 24] });
    if (r.kind !== 'dust') throw new Error('kind');
    expect(dustFault(r, [true, false, true, true, true])).toBe('kept');
    expect(dustFault(r, [true, true, false, false, false])).toBe('tossed');
    expect(faultOf(r, { n: 0, u: 6, flags: [false, true, false, false, false] })).toBeNull();
  });
});

describe('no shared answers', () => {
  it('within level 1 and level 2 no answer appears in two pools, and none is at a dial end', () => {
    for (const [pools, key, dial] of [[HOLD, 'n', N_DIAL], [CAL, 'u', U_DIAL]] as const) {
      const seen = new Set<number>();
      for (const pool of pools) for (const row of pool as unknown as Record<string, number>[]) {
        expect(seen.has(row[key]), `${key} = ${row[key]}`).toBe(false);
        seen.add(row[key]);
        expect(row[key]).toBeGreaterThan(dial.min);
        expect(row[key]).toBeLessThan(dial.max);
      }
    }
  });
});

describe('the rounds', () => {
  it('80 seeds: three rounds of the level’s kind, assist 0, 1, 2, and round k comes from pool k', () => {
    for (const seed of SEEDS) {
      ([1, 2, 3] as const).forEach((level) => {
        const rounds = buildRounds(level, rng(seed));
        expect(rounds.length).toBe(3);
        expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
        const kind = (['hold', 'cal', 'dust'] as const)[level - 1];
        const pools = [HOLD, CAL, DUST][level - 1] as unknown as object[][];
        rounds.forEach((r, k) => {
          expect(r.kind).toBe(kind);
          const { kind: _kind, assist: _assist, ...rest } = r as Round & Record<string, unknown>;
          expect(pools[k].some((row) => JSON.stringify(row) === JSON.stringify(rest))).toBe(true);
        });
      });
    }
  });
  it('the pools are used: over 80 seeds every row of every pool turns up', () => {
    for (const level of [1, 2, 3] as const) {
      const hit = [new Set<string>(), new Set<string>(), new Set<string>()];
      for (const seed of SEEDS) buildRounds(level, rng(seed)).forEach((r, k) => hit[k].add(JSON.stringify(r)));
      hit.forEach((s) => expect(s.size).toBeGreaterThanOrEqual(3));
    }
  });
});

describe('the words', () => {
  const allFaults = (r: Round): { f: Fault; n: number; u: number }[] => {
    if (r.kind === 'hold') return nRange.filter((n) => n !== r.n).map((n) => ({ f: holdFault(r, n)!, n, u: 6 }));
    if (r.kind === 'cal') return uRange.filter((u) => Math.abs(u - r.u) > 1e-9).map((u) => ({ f: 'offrung' as Fault, n: 0, u }));
    return [{ f: 'kept' as Fault, n: 0, u: 6 }, { f: 'tossed' as Fault, n: 0, u: 6 }];
  };
  it('no miss text contains the answer', () => {
    for (const row of holdRows) {
      const r = hold(row);
      for (const s of allFaults(r)) expect(has(missText(r, s.f, s), `${row.n} electrons`), `n = ${s.n}`).toBe(false);
    }
    for (const row of calRows) {
      const r = cal(row);
      for (const s of allFaults(r)) expect(has(missText(r, s.f, s), `${row.u.toFixed(1)} du`)).toBe(false);
    }
    for (const row of dustRows) {
      const r = dust(row);
      for (const s of allFaults(r)) expect(/(^|[^A-Za-z])[A-E]([^A-Za-z]|$)/.test(missText(r, s.f, s))).toBe(false);
    }
  });
  it('misses tell the direction in plain words', () => {
    const r = hold(HOLD[0][0]);
    expect(missText(r, 'low', { n: 0, u: 6 })).toMatch(/sank onto the bottom plate\. Zap some electrons on\.$/);
    expect(missText(r, 'low', { n: 1, u: 6 })).toMatch(/With 1 electron the push/);
    expect(missText(r, 'low', { n: 2, u: 6 })).toMatch(/With 2 electrons the push/);
    expect(missText(r, 'high', { n: 9, u: 6 })).toMatch(/stuck to the top plate\. It needs fewer electrons\.$/);
    expect(missText(cal(CAL[0][0]), 'offrung', { n: 0, u: 5.5 })).toMatch(/^At 5\.5 du per electron/);
  });
  it('win texts carry the working', () => {
    for (const row of holdRows) {
      const t = winText(hold(row));
      expect(t).toContain('n = m g d / (e V)');
      expect(t).toContain(`= ${row.n}.`);
      expect(t).toContain(`q = −${row.n}e`);
    }
    for (const row of calRows) {
      const t = winText(cal(row));
      expect(t).toContain('largest step');
      expect(t).toContain(`${row.reads.join(', ')} du are ${row.ns.join(', ')} electrons`);
    }
    for (const row of dustRows) {
      const t = winText(dust(row));
      expect(t).toContain('q = n e');
      for (const k of row.ks) {
        if (isDust(k)) expect(t).toContain((k / 3).toFixed(2));
      }
    }
  });
  it('the gauge, check and intel texts', () => {
    const r = hold({ V: 300, n: 3, m: 2.94 });
    expect(lcdText(r, { n: 3, u: 6 })).toMatch(/^up .* N · down .* N$/);
    expect(lcdText(r, { n: 3, u: 6 })).toBe(`up ${fmt(push(r as never, 3))} N · down ${fmt(weight(r as never))} N`);
    expect(lcdText(cal(CAL[0][0]), { n: 0, u: 3 })).toBe('counts 2.40 · 4.00 · 5.60');
    expect(lcdText(dust(DUST[0][0]), { n: 0, u: 6 })).toBe('');
    expect(checkText(r, { n: 1, u: 6 })).toMatch(/^Force check: 1 electron push up with .* N; the weight is .* N\.$/);
    expect(checkText(cal(CAL[0][0]), { n: 0, u: 2.4 })).toBe('Fit check: at 2.4 du per electron the drops would hold 3.00, 5.00, 7.00 electrons.');
    expect(intel(dust({ ks: [9, 7, 15, 12, 24] }))).toContain('4.80, 3.73, 8.00, 6.40, 12.80');
    expect(hintLine(r)).toMatch(/Round 1: the gauge is live\.$/);
    expect(hintLine(hold(HOLD[0][0], 1))).toMatch(/a check costs a charge\.$/);
    expect(hintLine(hold(HOLD[0][0], 2))).toMatch(/Final run: no gauge\.$/);
    expect(goalText(r)).toBe('Hover the drop: 300 V across 5 mm');
  });
  it('the hint line never gives the answer before the attempt', () => {
    for (const row of holdRows) expect(has(hintLine(hold(row)), `${row.n} electrons`)).toBe(false);
    for (const row of calRows) expect(has(hintLine(cal(row)), `${row.u} du`)).toBe(false);
  });
  it('the unit is not the smallest reading in any calibration row', () => {
    for (const row of calRows) expect(Math.min(...row.reads)).toBeGreaterThan(row.u);
  });
});
