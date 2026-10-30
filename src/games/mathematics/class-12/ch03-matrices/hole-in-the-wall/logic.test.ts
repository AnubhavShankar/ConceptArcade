import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { num } from '@core/mathkit';
import { DIALS, GATES, KINDS, buildRounds, explain, formText, intel, judge, machineText, matText, missText, mul, outline, spotText, surdText, type Round } from './logic';

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
    for (const level of [1, 2, 3, 4, 5]) {
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
    for (const level of [1, 2, 3, 4, 5]) {
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

describe('level 4: a wide pool of shears, gates and poses', () => {
  const rounds4 = Array.from({ length: 150 }, (_, i) => i * 7919 + 13).flatMap((s) => buildRounds(4, createRng(s)));
  it('shears run from 1 to 6, both orders occur, and every gate and pose is used', () => {
    expect([...new Set(rounds4.map((r) => r.ans.k))].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...new Set(rounds4.map((r) => r.ans.o))].sort()).toEqual([1, 2]);
    expect(new Set(rounds4.map((r) => JSON.stringify(r.T))).size).toBe(GATES.length);
    expect(new Set(rounds4.map((r) => JSON.stringify(r.P))).size).toBe(3);
    expect(new Set(rounds4.map((r) => `${r.ans.k},${r.ans.o},${JSON.stringify(r.T)}`)).size).toBeGreaterThanOrEqual(40);
  });
  it('no single (k, order) setting wins more than a small share of rounds', () => {
    for (const k of [1, 2, 3, 4, 5, 6]) for (const o of [1, 2]) expect(rounds4.filter((r) => r.ans.k === k && r.ans.o === o).length / rounds4.length).toBeLessThan(0.15);
  });
  it('the dial reaches past the largest answer, so the answer is never pinned to the end of the dial', () => {
    expect(DIALS.order[0].max).toBeGreaterThan(6);
    expect(DIALS.order[0].min).toBe(0);
  });
});

describe('level 5: A² = kA − mI', () => {
  it('the hole is A²P, the answer is (tr A, det A), A is not a multiple of I and det A is not 0', () => {
    for (const r of all(5)) {
      const M = r.M!;
      expect(r.ans).toEqual({ k: M[0][0] + M[1][1], m: M[0][0] * M[1][1] - M[0][1] * M[1][0] });
      expect(r.H).toEqual(mul(mul(M, M), r.P!));
      expect(r.ans.m).not.toBe(0);
      expect(M[0][1] !== 0 || M[1][0] !== 0 || M[0][0] !== M[1][1]).toBe(true);
    }
  });
  it('the machines grow harder round by round and the worked examples are present', () => {
    const rs = buildRounds(5, createRng(3));
    expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
    const answers = new Set(all(5).filter((r) => r.assist === 2).map((r) => `${r.ans.k},${r.ans.m}`));
    // Misc Q5 (A = [3 1; −1 2]) gives A² − 5A + 7I = O
    expect(answers.has('5,7')).toBe(true);
  });
  it('the working shows A² and states k and m, and the miss does not state them', () => {
    for (const r of all(5).slice(0, 30)) {
      const text = explain(r);
      expect(text).toContain('A² −');
      expect(text).toContain(`k = ${r.ans.k}`);
      expect(text).toContain(`m = ${num(r.ans.m)}`);
      expect(text).toContain(matText(mul(r.M!, r.M!)));
      const wrong = { k: r.ans.k + 1, m: r.ans.m };
      expect(missText(r, wrong)).toMatch(/vertex \d came out at/);
      expect(missText(r, wrong)).not.toMatch(/k =|m =|trace|determinant/);
      expect(machineText(r)).toContain('kA − mI');
    }
  });
  it('a negative m is written as + in the identity', () => {
    const M: number[][] = [[1, 2], [3, 4]];
    const r: Round = { kind: 'identity', M, P: [[1, 2], [1, 3]], H: mul(mul(M, M), [[1, 2], [1, 3]]), ans: { k: 5, m: -2 }, assist: 0 };
    expect(explain(r)).toContain('A² = 5A + 2I, that is A² − 5A − 2I = O');
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
  it('a miss never prints a coordinate; round 1 names the first vertex that jammed, rounds 2 and 3 do not (level 5 keeps its reviewed text)', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      for (const r of all(level).slice(0, 30)) {
        const wrong = Object.fromEntries(DIALS[r.kind].map((d) => [d.key, r.ans[d.key] === d.max ? d.max - 1 : r.ans[d.key] + 1]));
        if (level === 5) expect(missText(r, wrong)).toMatch(/vertex \d came out at/);
        else if (r.assist === 0) expect(missText(r, wrong)).toMatch(/^Vertex \d landed outside the hole/);
        else expect(missText(r, wrong)).toMatch(/^Blocky jammed in the wall: at least one corner/);
        if (level < 5) expect(missText(r, wrong)).not.toMatch(/\(|\[|came out at/);
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
