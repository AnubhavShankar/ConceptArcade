import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { DIALS, buildRounds, explain, filled, intel, judge, missText, mulM, pSymmetric, qSkew, spotText, sumPQ, type Round } from './logic';

const seeds = Array.from({ length: 40 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const range = (lo: number, hi: number, step = 1) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
const transpose = (M: number[][]) => M[0].map((_, j) => M.map((row) => row[j]));

describe('levels 1 and 2: exactly one setting of x, y, z', () => {
  it('a scan of every combination finds only the answer, which really is symmetric or skew, and the start never wins', () => {
    for (const level of [1, 2]) {
      for (const r of all(level).slice(0, 40)) {
        const vs = range(-9, 9);
        const wins: string[] = [];
        for (const x of vs) for (const y of vs) for (const z of vs) if (judge(r, { x, y, z })) wins.push(`${x},${y},${z}`);
        expect(wins).toEqual([`${r.ans.x},${r.ans.y},${r.ans.z}`]);
        const M = filled(r, r.ans);
        const T = transpose(M);
        expect(M.every((row, i) => row.every((v, j) => (level === 1 ? v === T[i][j] : v === -T[i][j])))).toBe(true);
        expect(judge(r, { x: 0, y: 0, z: 0 })).toBe(false);
      }
    }
  });
  it('each crystal has exactly three unknown gems, and the skew crystal has one on the mirror line', () => {
    for (const r of all(1)) expect(r.A.flat().filter((c) => c === null)).toHaveLength(3);
    for (const r of all(2)) {
      expect(r.A.flat().filter((c) => c === null)).toHaveLength(3);
      expect([0, 1, 2].filter((i) => r.A[i][i] === null)).toHaveLength(1);
    }
  });
});

describe('level 3: split into P + Q', () => {
  it('P is symmetric, Q is skew, P + Q = A, and the answer is the only one when p12 and q12 are scanned', () => {
    for (const r of all(3).slice(0, 40)) {
      const [[a, b], [c, d]] = r.M;
      expect(r.ans.p12).toBe((b + c) / 2);
      expect(r.ans.q12).toBe((b - c) / 2);
      const wins: string[] = [];
      for (const p12 of range(-12, 12, 0.5)) for (const q12 of range(-12, 12, 0.5)) if (judge(r, { p11: a, p12, p21: p12, p22: d, q11: 0, q12, q21: -q12, q22: 0 })) wins.push(`${p12},${q12}`);
      expect(wins).toEqual([`${r.ans.p12},${r.ans.q12}`]);
      expect(judge(r, { ...r.ans, p11: a + 0.5 })).toBe(false);
      expect(judge(r, { ...r.ans, p22: d - 0.5 })).toBe(false);
      // every gem is a lever: a sum that is right but whose parts break the rules does not open the crystal
      const lopsidedP = { ...r.ans, p21: r.ans.p21 + 1, q21: r.ans.q21 - 1 };
      expect(sumPQ(lopsidedP)).toEqual(r.M);
      expect(pSymmetric(lopsidedP)).toBe(false);
      expect(judge(r, lopsidedP)).toBe(false);
      expect(missText({ ...r, assist: 0 }, lopsidedP)).toMatch(/P is not symmetric/);
      const gemOnMirror = { ...r.ans, p11: a - 1, q11: 1 };
      expect(sumPQ(gemOnMirror)).toEqual(r.M);
      expect(qSkew(gemOnMirror)).toBe(false);
      expect(judge(r, gemOnMirror)).toBe(false);
      expect(missText({ ...r, assist: 0 }, gemOnMirror)).toMatch(/Q is not skew symmetric/);
      const looseQ = { ...r.ans, p12: r.ans.p12 + 1, q12: r.ans.q12 - 1, p21: r.ans.p21 - 1, q21: r.ans.q21 + 1 };
      expect(sumPQ(looseQ)).toEqual(r.M);
      expect(judge(r, looseQ)).toBe(false);
      expect(sumPQ(r.ans)).toEqual(r.M);
      expect(Math.abs(r.ans.p12)).toBeLessThanOrEqual(12);
    }
  });
  it('there are eight levers, the four gems of P and the four gems of Q', () => {
    expect(DIALS.split.map((d) => d.key)).toEqual(['p11', 'p12', 'p21', 'p22', 'q11', 'q12', 'q21', 'q22']);
  });
  it('a textbook split: A = [3 5; 1 −1] gives P = [3 3; 3 −1] and Q = [0 2; −2 0]', () => {
    const r: Round = { kind: 'split', A: [], M: [[3, 5], [1, -1]], ans: { p11: 3, p12: 3, p21: 3, p22: -1, q11: 0, q12: 2, q21: -2, q22: 0 }, assist: 0 };
    expect(judge(r, r.ans)).toBe(true);
    expect(sumPQ(r.ans)).toEqual([[3, 5], [1, -1]]);
  });
});

describe('level 4: the reversal law (AB)′ = B′A′', () => {
  const seeds80 = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
  const rounds4 = seeds80.flatMap((s) => buildRounds(4, createRng(s)));
  const dialsOf = (M: number[][]) => ({ x11: M[0][0], x12: M[0][1], x21: M[1][0], x22: M[1][1] });
  it('the conditions hold: sizes, range, C not symmetric, A′B′ different, at least two non-zero gems', () => {
    for (const seed of seeds80) {
      const rs = buildRounds(4, createRng(seed));
      expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(new Set(rs.map((r) => JSON.stringify([r.RA, r.RB]))).size).toBe(3);
      rs.forEach((r, i) => {
        const A = r.RA!;
        const B = r.RB!;
        expect(r.kind).toBe('reverse');
        expect(A.length).toBe(2);
        expect(A[0].length).toBe(i === 2 ? 3 : 2);
        expect(B.length).toBe(i === 2 ? 3 : 2);
        expect(B[0].length).toBe(2);
        const lo = i === 2 ? -2 : -3;
        const hi = i === 2 ? 3 : 4;
        expect([...A.flat(), ...B.flat()].every((x) => x >= lo && x <= hi)).toBe(true);
        const C = mulM(A, B);
        const X = transpose(C);
        expect(C.flat().every((c) => Math.abs(c) <= 20)).toBe(true);
        expect(C).not.toEqual(X);
        expect(X.flat().filter((c) => c !== 0).length).toBeGreaterThanOrEqual(2);
        expect(r.ans).toEqual(dialsOf(X));
        const wrong = mulM(transpose(A), transpose(B));
        expect(wrong.length).toBe(i === 2 ? 3 : 2);
        if (i !== 2) expect(wrong).not.toEqual(X);
        // the law itself
        expect(mulM(transpose(B), transpose(A))).toEqual(X);
      });
    }
  });
  it('the answer wins, every single-gem change loses, and the all-zero start loses', () => {
    for (const r of rounds4) {
      expect(judge(r, r.ans)).toBe(true);
      expect(judge(r, { x11: 0, x12: 0, x21: 0, x22: 0 })).toBe(false);
      for (const d of DIALS.reverse) {
        expect(r.ans[d.key]).toBeGreaterThanOrEqual(d.min);
        expect(r.ans[d.key]).toBeLessThanOrEqual(d.max);
        for (const delta of [-1, 1]) expect(judge(r, { ...r.ans, [d.key]: r.ans[d.key] + delta })).toBe(false);
      }
      expect(judge(r, dialsOf(mulM(r.RA!, r.RB!)))).toBe(false);
    }
  });
  it('for 2 by 2 rounds A′B′ loses and the miss says so; AB itself loses and the miss says so', () => {
    for (const r of rounds4.filter((x) => x.RA![0].length === 2)) {
      const wrong = dialsOf(mulM(transpose(r.RA!), transpose(r.RB!)));
      expect(judge(r, wrong)).toBe(false);
      expect(missText(r, wrong)).toContain('A′B′');
      const plainC = dialsOf(mulM(r.RA!, r.RB!));
      if (JSON.stringify(plainC) !== JSON.stringify(wrong)) {
        expect(judge(r, plainC)).toBe(false);
        expect(missText(r, plainC)).toContain('AB itself');
      }
    }
  });
  it('other misses name the first wrong gem and never state any number of the answer; the test glow counts matches', () => {
    for (const r of rounds4) {
      const wrong = { ...r.ans, x12: r.ans.x12 + 1 };
      const special = [mulM(r.RA!, r.RB!), ...(r.RA![0].length === 2 ? [mulM(transpose(r.RA!), transpose(r.RB!))] : [])];
      if (special.some((M) => JSON.stringify(dialsOf(M)) === JSON.stringify(wrong))) continue;
      const text = missText(r, wrong);
      expect(text).toMatch(/gem does not match the vault’s crystal/);
      expect(text).not.toMatch(/\d/);
      expect(spotText(r, wrong)).toBe('Test glow: 3 of the 4 gems match.');
      expect(spotText(r, r.ans)).toBe('Test glow: 4 of the 4 gems match.');
      expect(spotText(r, { x11: 0, x12: 0, x21: 0, x22: 0 })).toMatch(/Test glow: \d of the 4 gems match\./);
    }
  });
  it('the working contains B′A′ and the intel names both crystals', () => {
    for (const r of rounds4.slice(0, 60)) {
      expect(explain(r)).toContain('B′A′');
      expect(explain(r)).toContain('(AB)′');
      expect(intel(r)).toContain('(AB)′');
      expect(intel(r)).toContain('A = [');
    }
  });
});

describe('rounds 2 and 3 give one generic miss text, so a miss is not the paid check for free', () => {
  it('every wrong setting of a round 2 or 3 gives the same text, with no gem, pair, part or number in it', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).filter((x) => x.assist > 0).slice(0, 40)) {
        const texts = new Set<string>();
        const ds = DIALS[r.kind];
        for (const bump of [1, -1, 2]) {
          const wrong = Object.fromEntries(ds.map((d, i) => [d.key, r.ans[d.key] + (i === 0 ? bump * d.step : 0)]));
          texts.add(missText(r, wrong));
        }
        for (const bad of [{ ...r.ans, [ds[ds.length - 1].key]: r.ans[ds[ds.length - 1].key] + ds[0].step }]) texts.add(missText(r, bad));
        expect(texts.size).toBe(1);
        const text = [...texts][0];
        expect(text).not.toMatch(/row \d|column \d|\d/);
      }
    }
  });
  it('the start (every dial 0) never wins in levels 1 to 3', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level)) expect(judge(r, Object.fromEntries(DIALS[r.kind].map((d) => [d.key, d.start])))).toBe(false);
    }
  });
});

describe('words', () => {
  it('helpers fade; misses name the pair, not the value; the working is stated', () => {
    for (const level of [1, 2, 3]) {
      expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
      for (const r0 of all(level).slice(0, 30)) {
        const wrong = Object.fromEntries(DIALS[r0.kind === 'sym' ? 'sym' : r0.kind].map((d) => [d.key, r0.ans[d.key] + d.step]));
        const r = { ...r0, assist: 0 as const };
        expect(missText(r, wrong)).toMatch(/row \d, column \d/);
        expect(missText(r, wrong)).not.toMatch(/should be|must be \d/);
        expect(missText(r, wrong)).not.toMatch(/\d\.\d|\d{2}/);
        expect(spotText(r, wrong).length).toBeGreaterThan(15);
        expect(explain(r).length).toBeGreaterThan(30);
        expect(intel(r).length).toBeGreaterThan(30);
      }
    }
  });
});
