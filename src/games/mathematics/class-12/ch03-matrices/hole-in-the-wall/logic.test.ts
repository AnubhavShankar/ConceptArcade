import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { DIALS, KINDS, buildRounds, explain, formText, intel, judge, matText, missText, mul, outline, spotText, surdText, type Round } from './logic';

const seeds = Array.from({ length: 40 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));

/** Every combination of dial settings of a round. */
function combos(r: Round): Record<string, number>[] {
  let out: Record<string, number>[] = [{}];
  for (const d of DIALS[r.kind]) {
    const next: Record<string, number>[] = [];
    for (const o of out) for (let v = d.min; v <= d.max; v++) next.push({ ...o, [d.key]: v });
    out = next;
  }
  return out;
}

describe('every round has exactly one setting that fits the hole', () => {
  it('a scan of every dial combination finds only the answer, and the dials start away from it', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 36)) {
        const wins = combos(r).filter((v) => judge(r, v));
        expect(wins).toEqual([r.ans]);
        const start = Object.fromEntries(DIALS[r.kind].map((d) => [d.key, d.start]));
        expect(judge(r, start)).toBe(false);
        for (const d of DIALS[r.kind]) {
          expect(r.ans[d.key]).toBeGreaterThanOrEqual(d.min);
          expect(r.ans[d.key]).toBeLessThanOrEqual(d.max);
        }
      }
    }
  });
  it('levels use their kinds, the holes differ within a level, and the helpers fade', () => {
    for (const level of [1, 2, 3, 4]) {
      const rs = buildRounds(level, createRng(9));
      expect(rs.every((r) => r.kind === KINDS[level - 1])).toBe(true);
      expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(new Set(rs.map((r) => JSON.stringify(r.H))).size).toBe(3);
    }
  });
  it('level 3 holes are exact: 2cos α and 2sin α are 0, ±1, ±2, ±√2 or ±√3', () => {
    for (const r of all(3)) {
      for (const row of r.H) for (const x of row) expect(surdText(x)).not.toMatch(/\./);
    }
  });
  it('level 4: the two orders give different holes for every shear', () => {
    for (const r of all(4)) {
      const v1 = { k: r.ans.k, o: 1 };
      const v2 = { k: r.ans.k, o: 2 };
      expect(JSON.stringify(outline(r, v1))).not.toBe(JSON.stringify(outline(r, v2)));
    }
  });
});

describe('arithmetic and words', () => {
  it('matrix multiplication is row by column, and order matters', () => {
    expect(mul([[1, 2], [3, 4]], [[0, 1], [1, 0]])).toEqual([[2, 1], [4, 3]]);
    expect(mul([[0, 1], [1, 0]], [[1, 2], [3, 4]])).toEqual([[3, 4], [1, 2]]);
  });
  it('writes entries in x and y', () => {
    expect(formText([1, 0, 2])).toBe('x + 2');
    expect(formText([0, 2, -1])).toBe('2y − 1');
    expect(formText([1, -1, 0])).toBe('x − y');
    expect(formText([0, 0, 4])).toBe('4');
    expect(formText([1, 1, -2])).toBe('x + y − 2');
  });
  it('a miss names the first vertex that is wrong and never the setting', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 20)) {
        const wrong = Object.fromEntries(DIALS[r.kind].map((d) => [d.key, r.ans[d.key] === d.max ? d.max - 1 : r.ans[d.key] + 1]));
        expect(missText(r, wrong)).toMatch(/vertex \d came out at/);
        expect(missText(r, wrong)).not.toMatch(/α =|x =|y =|a =|b =/);
        expect(spotText(r, wrong)).toMatch(/\[/);
        expect(explain(r).length).toBeGreaterThan(30);
        expect(intel(r)).toContain(matText(r.H, r));
      }
    }
  });
  it('the working states the answer', () => {
    for (const r of all(1).slice(0, 10)) expect(explain(r)).toContain(`x = ${r.ans.x}`);
    for (const r of all(2).slice(0, 10)) expect(explain(r)).toContain(`a = ${r.ans.a}`);
    for (const r of all(3).slice(0, 10)) expect(explain(r)).toContain(`${r.ans.k * 15}°`);
  });
});
