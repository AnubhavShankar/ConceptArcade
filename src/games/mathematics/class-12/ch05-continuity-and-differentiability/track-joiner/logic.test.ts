import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { DIALS, FRAME, KINDS, X_END, buildRounds, explain, filled, firstFault, intel, judge, missText, pieceText, spotText, trackText, type Round } from './logic';

const seeds = Array.from({ length: 50 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));

function combos(r: Round): Record<string, number>[] {
  let out: Record<string, number>[] = [{}];
  for (const d of DIALS[r.kind]) {
    const next: Record<string, number>[] = [];
    for (const o of out) for (let v = d.min; v <= d.max; v++) next.push({ ...o, [d.key]: v });
    out = next;
  }
  return out;
}

describe('every round has exactly one way to join the track', () => {
  it('a scan of every dial combination finds only the answer, and the start never wins', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 60)) {
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
  it('levels use their kinds, the helpers fade and the rounds differ', () => {
    for (const level of [1, 2, 3]) {
      const rs = buildRounds(level, createRng(9));
      expect(rs.every((r) => r.kind === KINDS[level - 1])).toBe(true);
      expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(new Set(rs.map((r) => trackText(r))).size).toBe(3);
    }
  });
  it('in the smooth level the value and the slope both match at the answer, and a right value alone is a corner', () => {
    for (const r of all(3)) {
      expect(firstFault(r, r.ans)).toBeNull();
      const f = firstFault(r, { k: r.ans.k + 1, m: r.ans.m - r.joins[0] });
      expect(f?.kind).toBe('corner');
      expect(f?.x).toBe(r.joins[0]);
    }
  });
  it('in the continuity levels a wrong constant is a gap at the first broken join', () => {
    for (const r of all(1).slice(0, 40)) expect(firstFault(r, { k: r.ans.k + 1 })?.kind).toBe('gap');
    for (const r of all(2).slice(0, 40)) {
      const f = firstFault(r, { a: r.ans.a, b: r.ans.b + 1 });
      expect(f?.kind).toBe('gap');
      expect(f?.x).toBe(r.joins[0]);
    }
  });
});

describe('a miss and the start never give the answer away', () => {
  const widely = Array.from({ length: 1500 }, (_, i) => i * 7919 + 13);
  it('every dial starts at 0, and no row of any level is won by the start (the smooth row with k = 0 and m = 0 is drawn again)', () => {
    let near = 0;
    for (const level of [1, 2, 3]) {
      expect(DIALS[KINDS[level - 1]].every((d) => d.start === 0)).toBe(true);
      for (const s of widely) {
        for (const r of buildRounds(level, createRng(s))) {
          const start = Object.fromEntries(DIALS[r.kind].map((d) => [d.key, d.start]));
          expect(judge(r, start)).toBe(false);
          if (r.kind === 'smooth' && r.ans.k === 0) near++;
        }
      }
    }
    // the row p = 1, c = 1, q₀ = −2, r₀ = 1 is a real row of the generator: its answer is (0, 0), so the start would win it without the re-roll
    const row: Round = { kind: 'smooth', joins: [1], pieces: [{ p: 1, q: -2, r: 1 }, null], ans: { k: 0, m: 0 }, m0: 0, assist: 0 };
    expect(judge(row, { k: 0, m: 0 })).toBe(true);
    expect(near).toBeGreaterThan(0);
  });
  it('level 1: every wrong k on one side of the answer reads the same, and the two sides differ', () => {
    for (const r of all(1)) {
      const lows = new Set<string>();
      const highs = new Set<string>();
      for (let k = DIALS.gap[0].min; k <= DIALS.gap[0].max; k++) {
        if (k === r.ans.k) continue;
        const text = missText(r, { k });
        expect(text).not.toMatch(/\d/);
        (k < r.ans.k ? lows : highs).add(text);
      }
      expect([lows.size, highs.size]).toEqual([1, 1]);
      expect([...lows][0]).toMatch(/starts too low/);
      expect([...highs][0]).toMatch(/starts too high/);
    }
  });
  it('levels 2 and 3: no wrong setting prints a number, and only the kind of fault and a direction are said', () => {
    for (const level of [2, 3]) {
      for (const r of all(level).slice(0, 20)) {
        const kinds = new Set<string>();
        for (const v of combos(r).filter((x) => !judge(r, x))) {
          const text = missText(r, v);
          expect(text).not.toMatch(/\d/);
          kinds.add(text.replace(/ too (low|high|steep|shallow)/, ' too _'));
        }
        // at most a gap text and a corner text, apart from the direction word
        expect(kinds.size).toBeLessThanOrEqual(2);
      }
    }
  });
  it('the fixed y frame of each level holds every finished track the level can make', () => {
    for (const level of [1, 2, 3]) {
      const [y0, y1] = FRAME[KINDS[level - 1]];
      for (const r of all(level)) {
        const ps = filled(r, r.ans);
        for (let x = 0; x <= X_END; x += 0.25) {
          const i = r.joins.filter((j) => x >= j).length;
          const y = ps[i].p * x * x + ps[i].q * x + ps[i].r;
          expect(y).toBeGreaterThanOrEqual(y0);
          expect(y).toBeLessThanOrEqual(y1);
        }
      }
    }
  });
});

describe('words', () => {
  it('writes pieces, and the textbook anchor: x² + 1 for x < 2 and kx − 1 for x ≥ 2 needs k = 3', () => {
    expect(pieceText({ p: 1, q: 0, r: 1 })).toBe('x² + 1');
    expect(pieceText({ p: 2, q: -1, r: -3 })).toBe('2x² − x − 3');
    expect(pieceText({ p: 0, q: 3, r: 0 })).toBe('3x');
    const r: Round = { kind: 'gap', joins: [2], pieces: [{ p: 1, q: 0, r: 1 }, null], ans: { k: 3 }, m0: -1, assist: 0 };
    expect(judge(r, { k: 3 })).toBe(true);
    expect(judge(r, { k: 2 })).toBe(false);
    expect(filled(r, { k: 3 })[1]).toEqual({ p: 0, q: 3, r: -1 });
  });
  it('misses name the broken quantity and a direction, never the join, the height, the slope or the constants', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 30)) {
        const wrong = Object.fromEntries(DIALS[r.kind].map((d) => [d.key, r.ans[d.key] + 1]));
        expect(missText(r, wrong)).toMatch(/track broke|bent sharply/);
        expect(missText(r, wrong)).not.toMatch(/\d/);
        expect(missText(r, wrong)).not.toMatch(/k = |a = |b = |m = /);
        expect(spotText(r, wrong)).toMatch(/Test ride/);
        expect(explain(r).length).toBeGreaterThan(40);
        expect(intel(r)).toContain('f(x) =');
      }
    }
  });
});
