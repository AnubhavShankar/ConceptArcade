import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { CARDS, buildRounds, counts, drawChance, explain, frac, intel, judge, judgeBoard, missText, pOf, spotText, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

describe('conditional probability, independence and drawing without replacement', () => {
  it('textbook anchors: P(both red) from 5 red of 10 is 2/9; P(A | B) = P(A ∩ B)/P(B)', () => {
    const r: Round = { kind: 'draw', textB: '', textA: '', target: [], a: 0, N: 10, ans: 5, min: 0, max: 10, start: 0, mode: 'both', assist: 0 };
    expect(frac(...drawChance(r, 5))).toBe('2/9');
    expect(frac(3, 12) === '1/4').toBe(true);
  });
  it('level 1: the target board has the reduced sample space and the intersection, and A ⊄ B or B', () => {
    for (const r of all(1)) {
      expect(r.target).toHaveLength(CARDS);
      const [p, f] = counts(r.target);
      expect(p).toBeGreaterThanOrEqual(6);
      expect(f).toBeGreaterThanOrEqual(1);
      expect(f).toBeLessThan(p);
    }
  });
  it('level 2: P(A ∩ B) = P(A)·P(B) holds exactly at the answer and nowhere else on the dial', () => {
    for (const r of all(2)) {
      expect(span(r.min, r.max).filter((k) => pOf(r, k) === pOf(r, r.ans))).toEqual([r.ans]);
      expect(r.a * r.ans).toBeGreaterThan(0);
    }
  });
  it('level 3: the chance is exactly right at the answer, only there, and rises with the red cards', () => {
    for (const r of all(3)) {
      const [n, d] = drawChance(r, r.ans);
      const hits = span(r.min, r.max).filter((x) => { const [a, b] = drawChance(r, x); return a * d === n * b; });
      expect(hits).toEqual([r.ans]);
      expect(n).toBeGreaterThan(0);
    }
  });
});

describe('every round has exactly one winning setting', () => {
  it('board: only the exact board wins, and a blank board never wins', () => {
    for (const r of all(1)) {
      expect(judgeBoard(r, r.target)).toBe(true);
      expect(judgeBoard(r, Array(CARDS).fill(0))).toBe(false);
      const swap = [...r.target];
      swap[swap.findIndex((x) => x === 1)] = 2;
      expect(judgeBoard(r, swap)).toBe(false);
    }
  });
  it('levels 2 and 3: only the answer wins, and the start never wins', () => {
    for (const level of [2, 3]) {
      for (const r of all(level)) {
        expect(span(r.min, r.max).filter((x) => judge(r, x))).toEqual([r.ans]);
        expect(judge(r, r.start)).toBe(false);
      }
    }
  });
  it('helpers fade, and level 3 ends with at least one red', () => {
    for (const level of [1, 2, 3]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
    expect(buildRounds(3, createRng(5)).map((r) => r.mode)).toEqual(['both', 'both', 'atleast']);
  });
});

describe('words', () => {
  it('misses say what was left out or extra without the cards; probes read the chance; the working has the fraction', () => {
    for (const r of all(1).slice(0, 30)) {
      const state = [...r.target];
      state[state.findIndex((x) => x === 1)] = 0;
      expect(missText(r, 0, state)).toMatch(/left out/);      expect(spotText(r, 0, state)).toMatch(/green out of/);
      expect(explain(r)).toMatch(/P\(A \| B\)/);
    }
    for (const level of [2, 3]) {
      for (const r of all(level).slice(0, 30)) {
        const wrong = r.ans === r.max ? r.ans - 1 : r.ans + 1;
        expect(missText(r, wrong).length).toBeGreaterThan(30);
        expect(spotText(r, wrong)).toMatch(/Check/);
        expect(intel(r).length).toBeGreaterThan(40);
        expect(explain(r).length).toBeGreaterThan(30);
      }
    }
  });
  it('rounds in a level differ', () => {
    for (const s of seeds) for (const level of [1, 2, 3]) {
      const rs = buildRounds(level, createRng(s));
      expect(new Set(rs.map((r) => r.textB + r.textA + r.a + r.N + r.ans)).size).toBe(3);
    }
  });
});

describe('level 4, Not and or: compound events on the reduced deck', () => {
  const seeds80 = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
  const rounds4 = seeds80.flatMap((s) => buildRounds(4, createRng(s)));
  // An independent copy of the card tests, keyed by the words on screen. Suits 0 spade, 1 heart, 2 diamond, 3 club; ranks 1 (A) to 6.
  const T: Record<string, (s: number, r: number) => boolean> = {
    'a red card': (s) => s === 1 || s === 2,
    'a black card': (s) => s === 0 || s === 3,
    'a spade': (s) => s === 0,
    'a heart': (s) => s === 1,
    'an even rank (2, 4 or 6)': (_s, r) => r % 2 === 0,
    'an odd rank (A, 3 or 5)': (_s, r) => r % 2 === 1,
    'a rank of 4 or more': (_s, r) => r >= 4,
    'a rank of 3 or less': (_s, r) => r <= 3,
    'a prime rank (2, 3 or 5)': (_s, r) => r === 2 || r === 3 || r === 5,
  };
  const phrases = Object.keys(T);
  const has = (test: (s: number, r: number) => boolean, i: number) => test(Math.floor(i / 6), (i % 6) + 1);
  /** Parse the event text back into a test on card i, or fail. */
  function event(text: string): { kind: 'not' | 'or' | 'neither'; A: string; C: string | null } {
    for (const a of phrases) {
      if (text === `not ${a}`) return { kind: 'not', A: a, C: null };
      for (const c of phrases) {
        if (text === `${a} or ${c}`) return { kind: 'or', A: a, C: c };
        if (text === `neither ${a} nor ${c}`) return { kind: 'neither', A: a, C: c };
      }
    }
    throw new Error(`cannot read the event "${text}"`);
  }
  const board = (r: Round) => {
    const ev = event(r.textA);
    const inB = (i: number) => has(T[r.textB], i);
    const a = (i: number) => has(T[ev.A], i);
    const c = (i: number) => (ev.C ? has(T[ev.C], i) : false);
    const holds = (i: number) => (ev.kind === 'not' ? !a(i) : ev.kind === 'or' ? a(i) || c(i) : !(a(i) || c(i)));
    const idx = Array.from({ length: CARDS }, (_, i) => i);
    const B = idx.filter(inB);
    return { ev, B, a, c, holds, n: B.length, nA: B.filter(a).length, nC: B.filter(c).length, nAC: B.filter((i) => a(i) && c(i)).length, k: B.filter(holds).length };
  };

  it('the rounds run not, or, neither, with the helpers fading', () => {
    for (const s of seeds80) {
      const rs = buildRounds(4, createRng(s));
      expect(rs.map((r) => event(r.textA).kind)).toEqual(['not', 'or', 'neither']);
      expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(new Set(rs.map((r) => r.textB + r.textA)).size).toBe(3);
      expect(rs.every((r) => r.kind === 'board')).toBe(true);
    }
  });
  it('every board is checked against an independent count: the marked cards are exactly B, the green ones exactly the event', () => {
    for (const r of rounds4) {
      const b = board(r);
      expect(r.target).toHaveLength(CARDS);
      r.target.forEach((x, i) => expect(x).toBe(!has(T[r.textB], i) ? 0 : b.holds(i) ? 2 : 1));
      const [p, f] = counts(r.target);
      expect(p).toBe(b.n);
      expect(f).toBe(b.k);
      expect(p).toBeGreaterThanOrEqual(6);
      expect(p).toBeLessThanOrEqual(16);
      // the reduced fraction is neither 0 nor 1
      expect(f).toBeGreaterThanOrEqual(1);
      expect(f).toBeLessThan(p);
      // B, A and C come from different families, so none of them is nested in another
      const fam = (t: string) => (/red|black/.test(t) ? 'colour' : /spade|heart/.test(t) ? 'suit' : /even|odd/.test(t) ? 'parity' : /prime/.test(t) ? 'prime' : 'size');
      const fams = new Set([r.textB, b.ev.A, b.ev.C ?? ''].filter(Boolean).map(fam));
      expect(fams.size).toBe(b.ev.C ? 3 : 2);
      if (b.ev.C) {
        expect(b.nA).toBeGreaterThan(b.nAC);
        expect(b.nC).toBeGreaterThan(b.nAC);
      }
    }
  });
  it('the rules hold: P(not A | B) = 1 − P(A | B); P(A ∪ C | B) = P(A | B) + P(C | B) − P(A ∩ C | B); P(neither | B) = 1 − P(A ∪ C | B)', () => {
    for (const r of rounds4) {
      const b = board(r);
      if (b.ev.kind === 'not') expect(b.k).toBe(b.n - b.nA);
      else {
        expect(b.nAC).toBeGreaterThanOrEqual(1);
        const union = b.nA + b.nC - b.nAC;
        expect(union).toBe(b.B.filter((i) => b.a(i) || b.c(i)).length);
        expect(b.k).toBe(b.ev.kind === 'or' ? union : b.n - union);
      }
    }
  });
  it('only the exact board wins: every board one card away, the blank board, and the board of the plain A (or C) all lose', () => {
    for (const r of rounds4) {
      expect(judgeBoard(r, r.target)).toBe(true);
      expect(judgeBoard(r, Array(CARDS).fill(0))).toBe(false);
      const b = board(r);
      // the "forgot the not" board: B marked, green where A holds
      const plain = r.target.map((x, i) => (x === 0 ? 0 : b.a(i) ? 2 : 1));
      expect(judgeBoard(r, plain)).toBe(false);
      // the "all of B is the event" board
      expect(judgeBoard(r, r.target.map((x) => (x > 0 ? 2 : 0)))).toBe(false);
    }
    for (const r of rounds4.slice(0, 60)) {
      for (let i = 0; i < CARDS; i++) {
        for (const x of [0, 1, 2]) {
          if (x === r.target[i]) continue;
          const state = [...r.target];
          state[i] = x;
          expect(judgeBoard(r, state)).toBe(false);
        }
      }
    }
  });
  it('the words: the event is named in the note, the working shows the rule, and a miss never states a fraction or the answer', () => {
    for (const r of rounds4) {
      const b = board(r);
      expect(intel(r)).toContain(r.textA);
      expect(intel(r)).toContain(r.textB);
      const ex = explain(r);
      if (b.ev.kind === 'not') expect(ex).toBe(`P(not A | B) = 1 − P(A | B) = 1 − ${frac(b.nA, b.n)} = ${frac(b.n - b.nA, b.n)}.`);
      if (b.ev.kind === 'or') expect(ex).toBe(`P(A ∪ C | B) = P(A | B) + P(C | B) − P(A ∩ C | B) = (${b.nA} + ${b.nC} − ${b.nAC})/${b.n} = ${frac(b.k, b.n)}.`);
      if (b.ev.kind === 'neither') expect(ex).toBe(`P(neither | B) = 1 − P(A ∪ C | B) = 1 − ${frac(b.nA + b.nC - b.nAC, b.n)} = ${frac(b.k, b.n)}.`);
      const answer = frac(b.k, b.n);
      for (const mutate of [(s: number[], i: number) => (s[i] = 0), (s: number[], i: number) => (s[i] = s[i] === 2 ? 1 : 2)]) {
        const state = [...r.target];
        const i = state.findIndex((x) => x > 0);
        mutate(state, i);
        const msg = missText(r, 0, state);
        expect(msg).toMatch(/left out|wrong colour for the event/);
        expect(msg).not.toContain('/');
        expect(msg).not.toContain(answer);
        expect(msg).not.toMatch(/P\(/);
      }
      expect(spotText(r, 0, r.target)).toContain(`${b.k} green out of ${b.n} marked`);
    }
  });
});
