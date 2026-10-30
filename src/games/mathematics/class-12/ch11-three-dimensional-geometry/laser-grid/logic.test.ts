import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { num } from '@core/mathkit';
import { buildRounds, clearance, cosOf, cross, dot, explain, intel, judge, missText, norm, spotText, tipAt, type Round, type V3 } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

describe('the 3D formulas are right', () => {
  it('textbook anchors: the cosines of (2, 3, 6) are 2/7, 3/7, 6/7; (1, 2, 2) and (3, 2, 6) meet at cos θ = 19/21; two skew lines 3 apart', () => {
    expect(norm([2, 3, 6])).toBe(7);
    const r: Round = { kind: 'angle', a: [1, 2, 2], b: [3, 2, 0], free: 2, N: 0, cn: 19, cd: 21, T: 0, off: [0, 0, 0], ans: [6], min: 0, max: 12, start: [0], assist: 0 };
    expect(cosOf(r, 6)).toBeCloseTo(19 / 21, 12);
    const s: Round = { kind: 'skew', a: [1, 0, 0], b: [0, 1, 0], free: 0, N: 0, cn: 0, cd: 1, T: 3, off: [0, 0, 3], ans: [3], min: 0, max: 9, start: [0], assist: 0 };
    expect(clearance(s, 3)).toBe(3);
  });
  it('level 1: the cosines are square-sum 1, and the target is a multiple of the direction', () => {
    for (const r of all(1)) {
      expect(norm(r.ans as V3)).toBe(r.N);
      expect(cross(r.a, r.ans as V3).every((x) => x === 0)).toBe(true);
      expect(dot(r.a, r.ans as V3)).toBeGreaterThan(0);
    }
  });
  it('level 2: the beams are at a right angle when the dot product is 0', () => {
    for (const r of all(2)) expect(dot(r.a, [r.ans[0], r.b[1], r.b[2]])).toBe(0);
  });
});

describe('every round has exactly one winning setting', () => {
  it('level 1: of all whole triples from −12 to 12, only the direction numerators win', () => {
    for (const r of all(1).slice(0, 12)) {
      const wins: string[] = [];
      for (const p of span(r.min, r.max)) for (const q of span(r.min, r.max)) for (const s of span(r.min, r.max)) if (judge(r, [p, q, s])) wins.push(`${p},${q},${s}`);
      expect(wins).toEqual([r.ans.join()]);
      // the requirement behind judge: the numbers over N form a unit vector along the target
      for (const p of span(r.min, r.max)) for (const q of span(r.min, r.max)) {
        const s2 = r.N * r.N - p * p - q * q;
        const s = Math.round(Math.sqrt(Math.max(0, s2)));
        for (const z of [s, -s]) if (s2 >= 0 && s * s === s2 && cross(r.a, [p, q, z]).every((x) => x === 0) && dot(r.a, [p, q, z]) > 0) expect([p, q, z]).toEqual(r.ans);
      }
    }
  });
  it('levels 2 to 4: only the answer wins over the whole dial, and the start never wins', () => {
    for (const level of [2, 3, 4]) {
      for (const r of all(level)) {
        const ok = (l: number) => (r.kind === 'perp' ? dot(r.a, [l, r.b[1], r.b[2]]) === 0 : r.kind === 'angle' ? l > 0 && Math.abs(cosOf(r, l) - r.cn / r.cd) < 1e-12 : Math.abs(clearance(r, l) - r.T) < 1e-9);
        expect(span(r.min, r.max).filter(ok)).toEqual([r.ans[0]]);
        expect(span(r.min, r.max).filter((l) => judge(r, [l]))).toEqual([r.ans[0]]);
        expect(judge(r, r.start)).toBe(false);
      }
    }
  });
  it('level 4: the clearance is a whole number', () => {
    for (const r of all(4)) expect(Number.isInteger(r.T)).toBe(true);
  });
  it('helpers fade', () => {
    for (const level of [1, 2, 3, 4]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
});

describe('words', () => {
  it('misses and checks report readings, not the answer; the working is stated', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 30)) {
        const wrong = r.kind === 'cosines' ? [r.ans[0] + 1, r.ans[1], r.ans[2]] : [r.ans[0] === r.max ? r.ans[0] - 1 : r.ans[0] + 1];
        expect(missText(r, wrong).length).toBeGreaterThan(30);
        expect(spotText(r, wrong)).toMatch(/Check/);
        expect(explain(r).length).toBeGreaterThan(40);
        expect(intel(r).length).toBeGreaterThan(40);
      }
    }
  });
  it('rounds in a level differ', () => {
    for (const s of seeds) for (const level of [1, 2, 3, 4]) {
      const rs = buildRounds(level, createRng(s));
      expect(new Set(rs.map((r) => r.a.join() + r.b.join() + r.off.join())).size).toBe(3);
    }
  });
});

// Levels 5 and 6: the line r = a + λb (relay line, and a line read out of its cartesian code).
const seeds80 = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const all80 = (level: number) => seeds80.flatMap((s) => buildRounds(level, createRng(s)));
const pt = (p: number[]) => `(${p.map(num).join(', ')})`;
const RELAY_ANS = [['2,3,6', '1,-2,4', '3,1,-2', '-2,4,5'], ['3,-3,4', '3,5,-4', '-3,4,5', '5,-3,4'], ['3,2,-3', '2,-4,3', '-3,-2,4']];

/** One ratio of a cartesian code, such as (3 − x)/2 or (y + 2)/(−1) or x/2, evaluated at a point. */
function ratioAt(part: string, p: number[]): number {
  const m = /^(?:\((.+?)\)|([xyz]))\/(?:\((.+?)\)|(-?\d+))$/.exec(part.replace(/−/g, '-'));
  if (!m) throw new Error(`cannot read ${part}`);
  const sub = (tok: string) => ('xyz'.includes(tok) ? p['xyz'.indexOf(tok)] : Number(tok));
  const toks = (m[1] ?? m[2]).split(' ');
  const top = toks.length === 1 ? sub(toks[0]) : toks[1] === '-' ? sub(toks[0]) - sub(toks[2]) : sub(toks[0]) + sub(toks[2]);
  return top / Number(m[3] ?? m[4]);
}

describe('level 5: the relay line', () => {
  it('the answers are the listed whole numbers, A + lam·b = B, and the boss reaches B at tick 2', () => {
    for (const s of seeds80) {
      const rs = buildRounds(5, createRng(s));
      rs.forEach((r, i) => {
        expect(RELAY_ANS[i]).toContain(r.ans.join());
        expect(r.kind).toBe('relay');
        expect(r.lam).toBe(i === 2 ? 2 : 1);
        expect(tipAt(r.A!, r.ans, r.lam!)).toEqual(r.B);
        expect(r.a).toEqual(r.A);
        expect(r.ans.every((x) => Number.isInteger(x) && x >= r.min && x <= r.max)).toBe(true);
      });
    }
  });
  it('exactly one setting wins: every single-dial change loses, and the start loses', () => {
    for (const r of all80(5)) {
      expect(judge(r, r.ans)).toBe(true);
      expect(judge(r, r.start)).toBe(false);
      r.ans.forEach((a, d) => {
        for (const x of span(r.min, r.max)) if (x !== a) expect(judge(r, r.ans.map((y, j) => (j === d ? x : y)))).toBe(false);
      });
    }
  });
  it('over the whole dial cube only the answer wins', () => {
    for (const r of all80(5).slice(0, 6)) {
      const wins: string[] = [];
      for (const p of span(r.min, r.max)) for (const q of span(r.min, r.max)) for (const z of span(r.min, r.max)) if (judge(r, [p, q, z])) wins.push(`${p},${q},${z}`);
      expect(wins).toEqual([r.ans.join()]);
    }
  });
  it('words: the miss shows only the player’s own tip, the test pulse echoes the setting, the working has r =', () => {
    for (const r of all80(5).slice(0, 60)) {
      const wrong = r.ans.map((x, i) => (i === 0 ? (x === r.max ? x - 1 : x + 1) : x));
      const miss = missText(r, wrong);
      expect(miss).toMatch(/missed/);
      expect(miss).toContain(pt(tipAt(r.A!, wrong, r.lam!)));
      expect(miss).not.toContain(pt(r.B!));
      expect(miss).not.toContain(pt(r.ans));
      expect(spotText(r, wrong)).toMatch(/^Test pulse: after tick/);
      expect(spotText(r, wrong)).toContain(pt(tipAt(r.A!, wrong, r.lam!)));
      expect(explain(r)).toContain('r =');
      expect(explain(r)).toContain(pt(r.ans));
      expect(intel(r)).toContain(pt(r.B!));
    }
  });
  it('the working writes the vector and cartesian forms the textbook way', () => {
    const r: Round = { ...buildRounds(5, createRng(1))[0], A: [1, 2, -1], B: [4, -1, 3], lam: 1, a: [1, 2, -1], b: [3, -3, 4], ans: [3, -3, 4] };
    expect(explain(r)).toBe('b = (B − A)/1 = (3, −3, 4), so the line is r = (î + 2ĵ − k̂) + λ(3î − 3ĵ + 4k̂), or (x − 1)/3 = (y − 2)/(−3) = (z + 1)/4.');
    const o: Round = { ...r, A: [0, 0, 0], B: [2, 3, 6], a: [0, 0, 0], b: [2, 3, 6], ans: [2, 3, 6] };
    expect(explain(o)).toBe('b = (B − A)/1 = (2, 3, 6), so the line is r = λ(2î + 3ĵ + 6k̂), or x/2 = y/3 = z/6.');
  });
});

describe('level 6: read the code', () => {
  it('every code ratio equals λ at a + λb, for λ = 0, 1, 2, 3', () => {
    for (const r of all80(6)) {
      expect(r.kind).toBe('code');
      const parts = r.code!.split(' = ');
      expect(parts).toHaveLength(3);
      expect(r.ans).toEqual([...r.a, ...r.b]);
      for (const l of [0, 1, 2, 3]) {
        const p = tipAt(r.a, r.b, l);
        for (const part of parts) expect(ratioAt(part, p)).toBeCloseTo(l, 12);
      }
    }
  });
  it('the boss codes have a reversed sign such as (3 − x)/2', () => {
    for (const s of seeds80) {
      const rs = buildRounds(6, createRng(s));
      expect(rs[2].code).toMatch(/\(\d − [xyz]\)/);
      expect(rs.map((r) => r.ans.length)).toEqual([6, 6, 6]);
    }
  });
  it('exactly one setting wins: every single-dial change loses, and the all-zero start loses without showing the zeros of a', () => {
    for (const r of all80(6)) {
      expect(judge(r, r.ans)).toBe(true);
      expect(judge(r, r.start)).toBe(false);
      expect(r.start).toEqual([0, 0, 0, 0, 0, 0]);
      r.ans.forEach((a, d) => {
        for (const x of span(r.min, r.max)) if (x !== a) expect(judge(r, r.ans.map((y, j) => (j === d ? x : y)))).toBe(false);
      });
    }
  });
  it('a miss names only the part of the code that is off, never a value', () => {
    for (const r of all80(6).slice(0, 60)) {
      r.ans.forEach((a, d) => {
        const wrong = r.ans.map((y, j) => (j === d ? (a === r.max ? a - 1 : a + 1) : y));
        const miss = missText(r, wrong);
        expect(miss).toMatch(/missed/);
        expect(miss).toContain(`check the ${'xyz'[d % 3]} part`);
        expect(miss).toContain(d < 3 ? 'The emitter is not where the code puts the line' : 'The beam set off in a direction the code does not give');
        // "λ = 0" is the only number in the text; the right value of the wrong dial never appears
        expect(miss.replace('λ = 0', '')).not.toMatch(/\d/);
      });
      expect(spotText(r, r.start)).toBe('Test pulse: the beam would start at (0, 0, 0) and step by (0, 0, 0) each tick.');
      expect(explain(r)).toContain('r =');
      expect(intel(r)).toContain(r.code!);
    }
  });
  it('the first wrong dial is the one reported when several are wrong', () => {
    const r = buildRounds(6, createRng(3))[0];
    const w = [...r.ans];
    w[4] = w[4] === r.max ? w[4] - 1 : w[4] + 1;
    w[2] = w[2] === r.max ? w[2] - 1 : w[2] + 1;
    expect(missText(r, w)).toContain('check the z part');
    expect(missText(r, w)).toContain('The emitter is not where the code puts the line');
  });
});

describe('levels 5 and 6: helpers fade and rounds differ', () => {
  it('assist is 0, 1, 2 and the three rounds are different lines', () => {
    for (const level of [5, 6]) {
      expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
      for (const s of seeds80) expect(new Set(buildRounds(level, createRng(s)).map((r) => r.a.join() + r.b.join())).size).toBe(3);
    }
  });
  it('levels 1 to 4 carry none of the new fields', () => {
    for (const level of [1, 2, 3, 4]) for (const r of all(level)) expect([r.A, r.B, r.lam, r.code]).toEqual([undefined, undefined, undefined, undefined]);
  });
});

describe('levels 1 to 4: a miss names a direction only', () => {
  it('no miss text holds a reading (level 1 holds only the given denominator), and the words depend only on the direction of the error', () => {
    for (const level of [2, 3, 4]) {
      for (const r of all(level).slice(0, 60)) {
        const target = r.kind === 'perp' ? 0 : r.kind === 'angle' ? r.cn / r.cd : r.T;
        const reading = (l: number) => (r.kind === 'perp' ? dot(r.a, [l, r.b[1], r.b[2]]) : r.kind === 'angle' ? cosOf(r, l) : clearance(r, l));
        const bySide = new Map<boolean, Set<string>>();
        for (const l of span(r.min, r.max)) {
          if (l === r.ans[0] || (r.kind === 'angle' && l === 0)) continue;
          const t = missText(r, [l]);
          expect(t).not.toMatch(/\d/);
          const up = reading(l) > target;
          bySide.set(up, (bySide.get(up) ?? new Set()).add(t));
        }
        for (const set of bySide.values()) expect(set.size).toBe(1);
        if (bySide.size === 2) expect([...bySide.get(true)!][0]).not.toBe([...bySide.get(false)!][0]);
      }
    }
    for (const r of all(1).slice(0, 40)) {
      const texts = new Set([[0, 0, 0], [r.ans[0], r.ans[1], r.ans[2] + 1], [-3, 4, 5], r.ans.map((x) => x * 2), r.ans.map((x) => -x)].map((v) => missText(r, v).replace(String(r.N), '#')));
      expect(texts.size).toBe(1);
      expect([...texts][0]).not.toMatch(/\d/);
    }
  });
  it('every dial starts at 0 in every round of levels 1 to 4, and the start never wins', () => {
    for (const level of [1, 2, 3, 4]) for (const r of all(level)) expect([r.start, judge(r, r.start)]).toEqual([r.ans.map(() => 0), false]);
  });
});
