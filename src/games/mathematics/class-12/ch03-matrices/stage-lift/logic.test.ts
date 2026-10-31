import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import type { Values } from '@core/dialgame';
import {
  HOP, RISE, ariaFor, buildRounds, equations, explain, firstFault, fromDials, hintText, heights, intel, judge, labelFor, matText, missText, order, runnerFault, sameMat, testText, verdictTime,
  type Mat, type Round,
} from './logic';

const seeds = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const zero = (r: Round): Values => Object.fromEntries(r.keys.map((k) => [k, 0]));
const range = Array.from({ length: 19 }, (_, i) => i - 9);
const wins = (r: Round, v: Values) => judge(r, v);

describe('kinds and shapes', () => {
  it('every level has the brief’s kinds, shapes, fading aid and fixed dials', () => {
    const kinds: Record<number, string[]> = { 1: ['add', 'add', 'sub'], 2: ['gain2', 'gain3', 'gainBack'], 3: ['pair1', 'pair2', 'pair3'], 4: ['letters1', 'letters2', 'letters3'] };
    const dials: Record<number, number> = { 1: 4, 2: 6, 3: 8, 4: 4 };
    for (const level of [1, 2, 3, 4]) {
      for (const s of seeds) {
        const rs = buildRounds(level, createRng(s));
        expect(rs.map((r) => r.kind)).toEqual(kinds[level]);
        expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
        for (const r of rs) {
          expect(r.keys).toEqual(rs[0].keys);
          expect(r.keys.length).toBe(dials[level]);
          expect(r.rows).toBe(2);
          expect(r.cols).toBe(level === 2 ? 3 : 2);
          expect(r.card.length).toBe(2);
          expect(r.card[0].length).toBe(r.cols);
          expect(Boolean(r.card2)).toBe(level === 3);
        }
      }
    }
  });
  it('is deterministic for a seed', () => {
    for (const level of [1, 2, 3, 4]) expect(buildRounds(level, createRng(77)).map((r) => r.card)).toEqual(buildRounds(level, createRng(77)).map((r) => r.card));
  });
});

describe('the answer wins and the start loses', () => {
  it('judge is true at the answer and false with every fader at 0', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) {
        expect(judge(r, r.ans)).toBe(true);
        expect(judge(r, zero(r))).toBe(false);
      }
    }
  });
});

describe('exactly one winning setting, scanned', () => {
  it('levels 1 and 2: with the other faders at their answers, one value per fader wins', () => {
    for (const level of [1, 2]) {
      for (const r of all(level)) {
        for (const key of r.keys) {
          const w = range.filter((n) => wins(r, { ...r.ans, [key]: n }));
          expect(w).toEqual([r.ans[key]]);
        }
      }
    }
  });
  it('level 3: for each entry, only one (x, y) pair wins', () => {
    for (const r of all(3)) {
      for (const i of [1, 2]) {
        for (const j of [1, 2]) {
          const found: [number, number][] = [];
          for (const a of range) for (const b of range) if (wins(r, { ...r.ans, [`x${i}${j}`]: a, [`y${i}${j}`]: b })) found.push([a, b]);
          expect(found).toEqual([[r.ans[`x${i}${j}`], r.ans[`y${i}${j}`]]]);
        }
      }
    }
  });
  it('level 4: only one (x, y) and one (z, t) pair wins', () => {
    for (const r of all(4)) {
      for (const [p, q] of [['x', 'y'], ['z', 't']]) {
        const found: [number, number][] = [];
        for (const a of range) for (const b of range) if (wins(r, { ...r.ans, [p]: a, [q]: b })) found.push([a, b]);
        expect(found).toEqual([[r.ans[p], r.ans[q]]]);
      }
    }
  });
});

describe('ranges and the equations', () => {
  it('every answer is on the faders (−9 to 9) and every card entry is in −8 to 14', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) {
        for (const k of r.keys) {
          expect(Number.isInteger(r.ans[k])).toBe(true);
          expect(r.ans[k]).toBeGreaterThanOrEqual(-9);
          expect(r.ans[k]).toBeLessThanOrEqual(9);
        }
        for (const c of [r.card, r.card2 ?? []].flat(2)) {
          expect(c).toBeGreaterThanOrEqual(-8);
          expect(c).toBeLessThanOrEqual(14);
        }
      }
    }
  });
  it('heights at the answer equal the card(s)', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) {
        const h = heights(r, r.ans);
        expect(sameMat(h.kiko, r.card)).toBe(true);
        if (r.card2) expect(sameMat(h.jax!, r.card2)).toBe(true);
      }
    }
  });
  it('the heights follow the table of equations at a second random setting (computed independently)', () => {
    const rnd = createRng(2024);
    const pick = () => Math.floor(rnd() * 19) - 9;
    const el = (f: (i: number, j: number) => number, cols: number): Mat => [0, 1].map((i) => Array.from({ length: cols }, (_, j) => f(i, j)));
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 90)) {
        const v: Values = Object.fromEntries(r.keys.map((k) => [k, pick()]));
        const X = fromDials('x', r.cols, v);
        const Y = fromDials('y', r.cols, v);
        const { A, B } = r.known;
        const [x, y, z, t] = [v.x, v.y, v.z, v.t];
        const h = heights(r, v);
        const want: Record<string, () => [Mat, Mat?]> = {
          add: () => [el((i, j) => A[i][j] + Y[i][j], 2)],
          sub: () => [el((i, j) => A[i][j] - Y[i][j], 2)],
          gain2: () => [el((i, j) => 2 * X[i][j] + B[i][j], 3)],
          gain3: () => [el((i, j) => 3 * X[i][j] - B[i][j], 3)],
          gainBack: () => [el((i, j) => B[i][j] - 2 * X[i][j], 3)],
          pair1: () => [el((i, j) => X[i][j] + Y[i][j], 2), el((i, j) => X[i][j] - Y[i][j], 2)],
          pair2: () => [el((i, j) => 2 * X[i][j] + Y[i][j], 2), el((i, j) => X[i][j] - Y[i][j], 2)],
          pair3: () => [el((i, j) => 2 * X[i][j] + 3 * Y[i][j], 2), el((i, j) => 3 * X[i][j] + 2 * Y[i][j], 2)],
          letters1: () => [[[2 * x + B[0][0], 2 * z + B[0][1]], [2 * y + B[1][0], 2 * t + B[1][1]]]],
          letters2: () => [[[x + y + B[0][0], z + t + B[0][1]], [z - t + B[1][0], x - y + B[1][1]]]],
          letters3: () => [[[2 * x + y + B[0][0], 2 * z + t + B[0][1]], [2 * y + x + B[1][0], 2 * t + z + B[1][1]]]],
        };
        const [w1, w2] = want[r.kind]();
        expect(h.kiko).toEqual(w1);
        if (w2) expect(h.jax).toEqual(w2);
        else expect(h.jax).toBeUndefined();
      }
    }
  });
  it('the textbook sum [[1 2],[3 4]] + [[5 6],[7 8]] is [[6 8],[10 12]] on the stage', () => {
    const r: Round = { kind: 'add', rows: 2, cols: 2, keys: ['y11', 'y12', 'y21', 'y22'], ans: { y11: 5, y12: 6, y21: 7, y22: 8 }, known: { A: [[1, 2], [3, 4]] }, card: [[6, 8], [10, 12]], assist: 0 };
    expect(judge(r, r.ans)).toBe(true);
    expect(judge(r, { ...r.ans, y22: 7 })).toBe(false);
  });
});

describe('the run plan', () => {
  it('the path is a snake: row 1 left to right, then row 2 right to left', () => {
    expect(order(2)).toEqual([[0, 0], [0, 1], [1, 1], [1, 0]]);
    expect(order(3)).toEqual([[0, 0], [0, 1], [0, 2], [1, 2], [1, 1], [1, 0]]);
  });
  it('there is no fault at the answer', () => {
    for (const level of [1, 2, 3, 4]) for (const r of all(level)) expect(firstFault(r, r.ans)).toBeNull();
  });
  it('raising one fader by 1 gives a fault whose direction follows the change in that pillar, and the verdict lands inside 2.4 s', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 120)) {
        for (const key of r.keys) {
          const base = r.ans[key];
          const bump = base < 9 ? 1 : -1;
          const v = { ...r.ans, [key]: base + bump };
          const f = firstFault(r, v);
          expect(f).not.toBeNull();
          const h = heights(r, v);
          const M = f!.runner === 'kiko' ? h.kiko : h.jax!;
          const card = f!.runner === 'kiko' ? r.card : r.card2!;
          const delta = M[f!.i][f!.j] - card[f!.i][f!.j];
          expect(delta).not.toBe(0);
          expect(f!.kind).toBe(delta > 0 ? 'high' : 'low');
          expect(verdictTime(r, v)).toBeLessThan(2.4);
          expect(verdictTime(r, v)).toBe(f!.at);
        }
      }
    }
  });
  it('the fault is the earliest one on the path, and a tie goes to Kiko', () => {
    const r = buildRounds(3, createRng(5))[0];
    const v = { ...r.ans, x12: r.ans.x12 + 1 };
    const f = firstFault(r, v)!;
    // x + y and x − y both change at entry (1, 2): Kiko's stage goes too high and Jax's too, at the same hop (a tie in hop, 'high' for both).
    expect(f.runner).toBe('kiko');
    expect(f.hop).toBe(1);
    expect(f.at).toBeCloseTo(RISE + HOP * 1.6, 10);
    const lowFirst = runnerFault(2, [[0, 0], [0, 0]], [[0, 1], [0, 0]], 'kiko')!;
    expect(lowFirst.kind).toBe('low');
    expect(lowFirst.at).toBeCloseTo(RISE + HOP * 2, 10);
  });
  it('the verdict of a win is 1.5 s on a 2 × 2 stage and 1.98 s on a 2 × 3 stage', () => {
    for (const r of all(1)) expect(verdictTime(r, r.ans)).toBeCloseTo(1.5, 10);
    for (const r of all(3)) expect(verdictTime(r, r.ans)).toBeCloseTo(1.5, 10);
    for (const r of all(2)) expect(verdictTime(r, r.ans)).toBeCloseTo(1.98, 10);
  });
});

describe('words', () => {
  it('a miss names the pillar and the direction, and never the value that was needed', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 120)) {
        const key = r.keys[0];
        const v = { ...r.ans, [key]: r.ans[key] < 9 ? r.ans[key] + 1 : r.ans[key] - 1 };
        const m = missText(r, v);
        expect(m).toMatch(/too high|too low/);
        const f = firstFault(r, v)!;
        const need = (f.runner === 'kiko' ? r.card : r.card2!)[f.i][f.j];
        const needText = need < 0 ? `−${-need}` : String(need);
        expect(m).not.toMatch(new RegExp(`(to|be) ${needText}(?!\\d)`));
        expect(m).not.toMatch(/\d\d|[−-]\d/);
      }
    }
  });
  it('the test lift lists directions and entry positions only', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 80)) {
        const v = { ...r.ans, [r.keys[0]]: r.ans[r.keys[0]] < 9 ? r.ans[r.keys[0]] + 1 : r.ans[r.keys[0]] - 1 };
        const t = testText(r, v);
        expect(t).toMatch(/^Test lift: /);
        expect(t.replace(/\([12], [123]\)/g, '')).not.toMatch(/\d/);
        expect(t).toMatch(/too high|too low/);
      }
    }
    const r = all(1)[0];
    expect(testText(r, r.ans)).toBe('Test lift: every pillar matches the card.');
  });
  it('the working shows every answer value, with true minus signs', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) {
        const e = explain(r);
        for (const k of r.keys) expect(e).toContain(r.ans[k] < 0 ? `−${-r.ans[k]}` : String(r.ans[k]));
        expect(e).not.toMatch(/-\d/);
      }
    }
  });
  it('matText writes rows with semicolons and true minus signs', () => {
    expect(matText([[3, -1], [4, 2]])).toBe('[3 −1; 4 2]');
  });
  it('fader labels and accessible names', () => {
    expect(labelFor('y11')).toBe('y₁₁');
    expect(labelFor('x23')).toBe('x₂₃');
    expect(labelFor('t')).toBe('t');
    expect(ariaFor('y12')).toBe('Program Y entry row 1 column 2');
    expect(ariaFor('z')).toBe('Letter z');
  });
  it('the hint line says what the round gives you, by aid level', () => {
    const rs = buildRounds(1, createRng(3));
    expect(hintText(rs[0])).toMatch(/follow the faders live/);
    expect(hintText(rs[1])).toMatch(/test lift costs a charge/);
    expect(hintText(rs[2])).toMatch(/Boss round: no preview, no test lift/);
    expect(intel(rs[0])).toMatch(/Base program A = \[/);
  });
});

describe('the equation band never shows computed heights', () => {
  it('its numbers are the fader values, the known matrices and the card', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 60)) {
        const v: Values = Object.fromEntries(r.keys.map((k, i) => [k, (i % 7) - 3]));
        const eqs = equations(r, v);
        expect(eqs.length).toBe(level === 3 ? 2 : 1);
        const shown = eqs.flat().flatMap((t) => ('grid' in t ? t.grid.flat().map((c) => ({ tone: t.tone, text: c.text })) : []));
        // the live-height matrix of the heights function is not among the printed unknown cells unless it equals the fader values
        for (const c of shown) if (c.tone === 'unknown' && level < 4) expect(r.keys.map((k) => (v[k] < 0 ? `−${-v[k]}` : String(v[k])))).toContain(c.text);
      }
    }
  });
});

describe('level 5: rule cards', () => {
  // The rules, written independently of logic.ts, and the cards they give (rows i = 1, 2; columns j = 1, 2, 3).
  const F: Record<string, (i: number, j: number) => number> = {
    'i + 2j': (i, j) => i + 2 * j,
    '2i − j': (i, j) => 2 * i - j,
    ij: (i, j) => i * j,
    '|i − 3j|': (i, j) => Math.abs(i - 3 * j),
    '(i − j)²': (i, j) => (i - j) * (i - j),
    '3i − 2j': (i, j) => 3 * i - 2 * j,
    '(−1)^(i + j)·(i + j)': (i, j) => ((i + j) % 2 === 0 ? 1 : -1) * (i + j),
    '|2i − 3j| − 1': (i, j) => Math.abs(2 * i - 3 * j) - 1,
    'i² − j²': (i, j) => i * i - j * j,
  };
  const CARDS: Mat[][] = [
    [[[3, 5, 7], [4, 6, 8]], [[1, 0, -1], [3, 2, 1]], [[1, 2, 3], [2, 4, 6]]],
    [[[2, 5, 8], [1, 4, 7]], [[0, 1, 4], [1, 0, 1]], [[1, -1, -3], [4, 2, 0]]],
    [[[2, -3, 4], [-3, 4, -5]], [[0, 3, 6], [0, 1, 4]], [[0, -3, -8], [3, 0, -5]]],
  ];
  const RULE_TEXTS = Object.keys(F);
  const mine = all(5);
  const nameOf = (r: Round) => RULE_TEXTS.indexOf(r.rule!);
  const cells = [[1, 1], [1, 2], [2, 1], [2, 2]];

  it('three rule rounds, 2 × 3, six faders y11 to y23, no base program, the aid fading 0, 1, 2', () => {
    for (const s of seeds) {
      const rs = buildRounds(5, createRng(s));
      expect(rs.map((r) => r.kind)).toEqual(['rule', 'rule', 'rule']);
      expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
      for (const r of rs) {
        expect(r.keys).toEqual(['y11', 'y12', 'y13', 'y21', 'y22', 'y23']);
        expect(r.rows).toBe(2);
        expect(r.cols).toBe(3);
        expect(r.known).toEqual({});
        expect(r.card2).toBeUndefined();
      }
    }
  });
  it('round k draws its rule from pool k, the card is that rule worked out, and all nine rules turn up', () => {
    const seen = new Set<string>();
    for (const s of seeds) {
      buildRounds(5, createRng(s)).forEach((r, k) => {
        const idx = nameOf(r);
        expect(Math.floor(idx / 3)).toBe(k);
        expect(r.card).toEqual(CARDS[k][idx % 3]);
        expect(r.card).toEqual([1, 2].map((i) => [1, 2, 3].map((j) => F[r.rule!](i, j))));
        seen.add(r.rule!);
      });
    }
    expect(seen.size).toBe(9);
  });
  it('the cards are integers in −8 to 14, never all zero, and the answers sit on the faders', () => {
    for (const r of mine) {
      for (const c of r.card.flat()) {
        expect(Number.isInteger(c)).toBe(true);
        expect(c).toBeGreaterThanOrEqual(-8);
        expect(c).toBeLessThanOrEqual(14);
      }
      expect(r.card.flat().some((c) => c !== 0)).toBe(true);
      for (const k of r.keys) expect(r.ans[k]).toBeGreaterThanOrEqual(-9);
    }
  });
  it('the stage stands at Y: the answer wins, the all-zero start loses, and every fader has exactly one winning value', () => {
    for (const r of mine) {
      expect(judge(r, r.ans)).toBe(true);
      expect(judge(r, zero(r))).toBe(false);
      expect(heights(r, r.ans)).toEqual({ kiko: r.card });
      for (const key of r.keys) expect(range.filter((n) => wins(r, { ...r.ans, [key]: n }))).toEqual([r.ans[key]]);
    }
  });
  it('a win takes 1.98 s, a one-step miss lands inside 2.4 s, and the intel gives the rule but no card numbers', () => {
    for (const r of mine) {
      expect(firstFault(r, r.ans)).toBeNull();
      expect(verdictTime(r, r.ans)).toBeCloseTo(1.98, 10);
      for (const key of r.keys) {
        const v = { ...r.ans, [key]: r.ans[key] < 9 ? r.ans[key] + 1 : r.ans[key] - 1 };
        expect(firstFault(r, v)).not.toBeNull();
        expect(verdictTime(r, v)).toBeLessThan(2.4);
      }
      const t = intel(r);
      expect(t).toContain(`cᵢⱼ = ${r.rule}`);
      expect(t).not.toContain(matText(r.card));
      expect(t).not.toMatch(/\[/);
    }
  });
  it('explain shows all six entries with the working, true minus signs and the card value', () => {
    for (const r of mine) {
      const e = explain(r);
      expect(e).toMatch(/^Row i, column j: /);
      for (const i of [1, 2]) {
        for (const j of [1, 2, 3]) {
          const c = r.card[i - 1][j - 1];
          const name = `c${'₀₁₂'[i]}${'₀₁₂₃'[j]}`;
          expect(e).toMatch(new RegExp(`${name} = [^,]+ = ${c < 0 ? '−' + -c : c}(,|\\.$)`));
        }
      }
      expect(e).not.toMatch(/-\d/);
    }
    const r = mine.find((q) => q.rule === '|i − 3j|')!;
    expect(explain(r)).toContain('c₁₂ = |1 − 6| = 5');
  });
  it('swapping i and j adds the "Check the rule" line, for rules that are not symmetric in i and j', () => {
    const line = 'Check the rule: i counts rows and j counts columns.';
    let swappedMisses = 0;
    for (const r of mine) {
      const f = F[r.rule!];
      const v: Values = { ...r.ans };
      for (const [i, j] of cells) v[`y${i}${j}`] = f(j, i);
      if (cells.some(([i, j]) => f(i, j) !== f(j, i))) {
        expect(missText(r, v)).toContain(line);
        swappedMisses++;
      } else {
        expect(judge(r, v)).toBe(true);
        expect(missText(r, v)).not.toContain(line);
      }
    }
    expect(swappedMisses).toBeGreaterThan(40);
  });
  it('an ordinary miss has no "Check the rule" line and no digits', () => {
    for (const r of mine) {
      for (const key of r.keys) {
        const v = { ...r.ans, [key]: r.ans[key] < 9 ? r.ans[key] + 1 : r.ans[key] - 1 };
        const m = missText(r, v);
        expect(m).toMatch(/too high|too low/);
        expect(m).not.toContain('Check the rule');
        expect(m).not.toMatch(/\d\d|[−-]\d/);
      }
    }
  });
  it('the test lift gives directions only', () => {
    for (const r of mine.slice(0, 60)) {
      const t = testText(r, { ...r.ans, y11: r.ans.y11 < 9 ? r.ans.y11 + 1 : r.ans.y11 - 1 });
      expect(t.replace(/\([12], [123]\)/g, '')).not.toMatch(/\d/);
    }
  });
  it('the equation band shows the rule in a box and the fader values, never the card', () => {
    for (const r of mine.slice(0, 60)) {
      const v: Values = Object.fromEntries(r.keys.map((k, i) => [k, (i % 5) - 2]));
      const eqs = equations(r, v);
      expect(eqs.length).toBe(1);
      const toks = eqs[0];
      const box = toks.find((t) => 'rule' in t) as { rule: string; notes: string };
      expect(box.rule).toBe(`card: cᵢⱼ = ${r.rule}`);
      expect(box.notes).toBe('i = 1, 2    j = 1, 2, 3');
      const Y = toks.find((t) => 'grid' in t && t.tone === 'unknown') as { grid: { text: string; sub?: string }[][] };
      expect(Y.grid.flat().map((c) => c.text)).toEqual(r.keys.map((k) => (v[k] < 0 ? `−${-v[k]}` : String(v[k]))));
      expect(Y.grid.flat().map((c) => c.sub)).toEqual(['y₁₁', 'y₁₂', 'y₁₃', 'y₂₁', 'y₂₂', 'y₂₃']);
      expect(toks.some((t) => 'grid' in t && t.tone === 'card')).toBe(false);
    }
  });
});
