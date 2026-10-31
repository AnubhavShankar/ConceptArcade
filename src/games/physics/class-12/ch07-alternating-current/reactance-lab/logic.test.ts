import { describe, expect, it } from 'vitest';
import { fmt } from '@core/judge';
import { createRng } from '@core/random';
import {
  BOTH, CAP, CHOKE, DIAL, GLOW, STEADY, buildRounds, dialOf, edges, fault, goal, hintText, judge, lcdText, meterText, missText, verdictDelay, winText, xc, xl, xPart,
  type BothRow, type Round,
} from './logic';

type L = 1 | 2 | 3 | 4;
const SEEDS = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const rowsOf = (level: L): Round[] => {
  const kind = (['choke', 'cap', 'both', 'steady'] as const)[level - 1];
  const pools = [CHOKE, CAP, BOTH, STEADY][level - 1] as unknown[][];
  return pools.flatMap((pool) => pool.map((row) => ({ ...(row as object), kind, assist: 0 }) as Round));
};
const dialRange = (level: L) => range(dialOf(level).min, dialOf(level).max);

describe('the pools', () => {
  it('shows the true current at the answer (3 figures) and solves back to the answer', () => {
    for (const r of rowsOf(1) as Extract<Round, { kind: 'choke' }>[]) {
      expect(fmt(r.v / xl(r.l, r.f))).toBe(String(r.i));
      expect(Math.abs(r.v / (2 * Math.PI * r.l * 1e-3 * r.i) - r.f)).toBeLessThan(0.2);
    }
    for (const r of rowsOf(2) as Extract<Round, { kind: 'cap' }>[]) {
      expect(fmt(r.v / xc(r.c, r.f))).toBe(String(r.i));
      expect(Math.abs(r.i / (2 * Math.PI * r.c * 1e-6 * r.v) - r.f)).toBeLessThan(0.2);
    }
  });
  it('level 3: the edges sit 0.25 to 0.75 Hz either side of the answer', () => {
    for (const r of rowsOf(3) as Extract<Round, { kind: 'both' }>[]) {
      const e = edges(r);
      expect(e.fa - r.f).toBeGreaterThan(0.25);
      expect(e.fa - r.f).toBeLessThan(0.75);
      expect(r.f - e.fb).toBeGreaterThan(0.25);
      expect(r.f - e.fb).toBeLessThan(0.75);
    }
  });
  it('level 4: the reactance equals R at the answer (within 1.5%)', () => {
    for (const r of rowsOf(4) as Extract<Round, { kind: 'steady' }>[]) expect(Math.abs(xPart(r, r.f) / r.r - 1)).toBeLessThan(0.015);
  });
  it('includes the book examples exactly (Ex 7.3, Ex 7.4, Example 7.4) and never has an answer at a dial end or the start', () => {
    expect(CHOKE[0][0]).toEqual({ v: 220, l: 44, i: 15.9, f: 50 });
    expect(CAP[0][1]).toEqual({ v: 110, c: 60, i: 2.49, f: 60 });
    expect(CAP[0][0]).toEqual({ v: 220, c: 15, i: 1.04, f: 50 });
    for (const level of [1, 2, 3, 4] as L[]) {
      const d = dialOf(level);
      for (const r of rowsOf(level)) {
        expect(r.f).toBeGreaterThan(d.min);
        expect(r.f).toBeLessThan(d.max);
        expect(r.f).not.toBe(d.start);
      }
    }
  });
  it('within a level no answer appears in two pools', () => {
    for (const pools of [CHOKE, CAP, BOTH, STEADY] as { f: number }[][][]) {
      const all = pools.flatMap((p) => p.map((r) => r.f));
      expect(new Set(all).size).toBe(all.length);
    }
  });
});

describe('exactly one winner', () => {
  it('on every row, scanning every whole frequency of the dial, only the answer wins, and the start fails', () => {
    for (const level of [1, 2, 3, 4] as L[]) {
      for (const r of rowsOf(level)) {
        const winners = dialRange(level).filter((f) => judge(r, { f }));
        expect(winners).toEqual([r.f]);
        expect(judge(r, { f: dialOf(level).start })).toBe(false);
      }
    }
  });
  it('forgetting the 2π never lands on the answer', () => {
    for (const r of rowsOf(1) as Extract<Round, { kind: 'choke' }>[]) expect(Math.round(r.v / (r.l * 1e-3 * r.i))).not.toBe(r.f);
    for (const r of rowsOf(2) as Extract<Round, { kind: 'cap' }>[]) expect(Math.round(r.i / (r.c * 1e-6 * r.v))).not.toBe(r.f);
  });
});

describe('the fault matches the physics at every frequency', () => {
  it('levels 1 and 2: burst when the true current is more than 1% over the shown one, dim when more than 1% short', () => {
    for (const r of [...rowsOf(1), ...rowsOf(2)] as (Extract<Round, { kind: 'choke' | 'cap' }>)[]) {
      for (const f of dialRange(r.kind === 'choke' ? 1 : 2)) {
        const cur = r.kind === 'choke' ? r.v / xl(r.l, f) : r.v / xc(r.c, f);
        const got = fault(r, { f });
        if (f === r.f) expect(got).toBeNull();
        else if (cur > r.i * 1.01) expect(got).toBe('burst');
        else if (cur < r.i * 0.99) expect(got).toBe('dim');
        else throw new Error(`a wrong frequency within 1% of the current: ${r.kind} ${r.f} at ${f}`);
      }
    }
  });
  it('level 3: trail exactly when the trail current is short, porch exactly when the beacon current is short, never both', () => {
    for (const r of rowsOf(3) as (BothRow & { kind: 'both'; assist: 0 })[]) {
      for (const f of dialRange(3)) {
        const trailShort = r.v / xl(r.l, f) < r.trail;
        const porchShort = r.v / xc(r.c, f) < r.porch;
        expect(trailShort && porchShort).toBe(false);
        const got = fault(r, { f });
        expect(got === 'trail').toBe(trailShort);
        expect(got === 'porch').toBe(porchShort);
        expect(got === null).toBe(!trailShort && !porchShort);
      }
    }
  });
  it('level 4: part exactly when the choke or capacitor lamp carries more than the dropper lamp', () => {
    for (const r of rowsOf(4) as Extract<Round, { kind: 'steady' }>[]) {
      for (const f of dialRange(4)) {
        if (f === r.f) continue;
        const part = 1 / xPart(r, f) > 1 / r.r;
        expect(fault(r, { f })).toBe(part ? 'part' : 'dropper');
        expect(Math.abs(xPart(r, f) / r.r - 1)).toBeGreaterThan(0.025);
      }
    }
  });
});

describe('rounds', () => {
  it('80 seeds: three rounds of the level’s kind, assist 0, 1, 2, round k from pool k', () => {
    const pools = [CHOKE, CAP, BOTH, STEADY];
    for (const level of [1, 2, 3, 4] as L[]) {
      for (const s of SEEDS) {
        const rs = buildRounds(level, createRng(s));
        expect(rs.length).toBe(3);
        expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
        rs.forEach((r, k) => {
          expect(r.kind).toBe((['choke', 'cap', 'both', 'steady'] as const)[level - 1]);
          expect((pools[level - 1][k] as { f: number }[]).some((row) => row.f === r.f)).toBe(true);
        });
      }
    }
  });
  it('the dials: levels 1 to 3 run 20 to 100 and start at 20; level 4 runs 10 to 60 and starts at 10; GLOW is fixed', () => {
    expect(DIAL.f).toEqual({ min: 20, max: 100, step: 1, start: 20 });
    expect(DIAL.f4).toEqual({ min: 10, max: 60, step: 1, start: 10 });
    expect(GLOW).toEqual({ dim: 0.25, right: 1 });
  });
  it('the verdict lands by 1.4 s', () => {
    for (const level of [1, 2, 3, 4] as L[]) for (const r of rowsOf(level)) for (const f of dialRange(level)) expect(verdictDelay(r, { f })).toBeLessThanOrEqual(1.4);
  });
});

describe('words', () => {
  it('a miss names the player’s own frequency, never the answer, and ends with the direction', () => {
    for (const level of [1, 2, 3, 4] as L[]) {
      for (const r of rowsOf(level)) {
        for (const f of dialRange(level)) {
          if (f === r.f) continue;
          const m = missText(r, { f });
          expect(m).toContain(`${f} Hz`);
          expect(has(m, `${r.f} Hz`), m).toBe(false);
          expect(m).toMatch(/(faster|slower)\.$/);
        }
      }
    }
  });
  it('the directions follow the physics: slower is a burst for a choke, dim for a capacitor', () => {
    const c = CHOKE[0][0] as Extract<Round, { kind: 'choke' }>;
    const k = { ...CAP[0][0], kind: 'cap', assist: 0 } as Round;
    expect(missText({ ...c, kind: 'choke', assist: 0 }, { f: c.f - 1 })).toMatch(/burst.*faster\.$/);
    expect(missText({ ...c, kind: 'choke', assist: 0 }, { f: c.f + 1 })).toMatch(/only glowed.*slower\.$/);
    expect(missText(k, { f: k.f - 1 })).toMatch(/only glowed.*faster\.$/);
    expect(missText(k, { f: k.f + 1 })).toMatch(/burst.*slower\.$/);
  });
  it('wins teach the right formula', () => {
    const w = (level: L) => winText(rowsOf(level)[0]);
    expect(w(1)).toContain('The trail is lit!');
    expect(w(1)).toContain('2πfL');
    expect(w(2)).toContain('The beacon shines!');
    expect(w(2)).toContain('1/(2πfC)');
    expect(w(3)).toContain('Both lamps lit!');
    expect(w(3)).toContain('rises with f');
    expect(w(4)).toContain('A steady beacon!');
    expect(w(4)).toContain('quarter cycle');
    expect(winText(rowsOf(1)[0])).toContain('X_L = V/I = 220 ÷ 15.9 = 13.8 Ω');
    expect(winText(rowsOf(2)[1])).toContain('√2 × 2.49 = 3.52 A');
  });
  it('the goal, the hint and the meter never print the answer frequency', () => {
    for (const level of [1, 2, 3, 4] as L[]) {
      for (const r of rowsOf(level)) {
        expect(has(goal(r), `${r.f} Hz`)).toBe(false);
        expect(has(hintText(r), `${r.f} Hz`)).toBe(false);
        expect(goal(r).length).toBeLessThan(50);
        expect(lcdText(r, { f: dialOf(level).start })).not.toContain('Hz');
      }
    }
  });
  it('the hint line fades round by round and the meter reads the player’s own frequency', () => {
    const [a, b, c] = buildRounds(1, createRng(5));
    expect(hintText(a)).toMatch(/the lamp meter is live\.$/);
    expect(hintText(b)).toMatch(/a meter check costs a charge\.$/);
    expect(hintText(c)).toMatch(/Last party: no meter\.$/);
    expect(hintText(a)).toContain('12-volt lamps');
    expect(meterText(a, { f: 33 })).toMatch(/^Meter check: at 33 Hz /);
  });
  it('the intel never gives away the frequency', () => {
    for (const s of SEEDS.slice(0, 20)) for (const level of [1, 2, 3, 4] as L[]) for (const r of buildRounds(level, createRng(s))) expect(has(hintText(r), `${r.f} Hz`)).toBe(false);
  });
});
