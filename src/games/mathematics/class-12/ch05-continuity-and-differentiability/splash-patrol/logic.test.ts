import { describe, expect, it } from 'vitest';
import { RESOLVE } from '@core/arcade';
import { createRng } from '@core/random';
import {
  POOLS, RUN, buildRounds, complete, explain, facts, firstFault, flagText, hintLine, intel, jointAria, jointTime, judge, missText, nextFlag, verdictTime, want, winText, zoomText, zoomWindow,
  type Fault, type Flag, type Level, type Round, type Row,
} from './logic';

const LEVELS: Level[] = [1, 2, 3, 4];
const SEEDS = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const allRows = (): { level: Level; k: number; row: Row }[] => LEVELS.flatMap((level) => POOLS[level].flatMap((pool, k) => pool.map((row) => ({ level, k, row }))));
const asRound = (row: Row, level: Level, assist: 0 | 1 | 2 = 0): Round => ({ ...row, level, assist });
const flagSet = (level: Level): Exclude<Flag, null>[] => (level === 1 ? ['fine', 'gap'] : ['fine', 'kink', 'gap']);
/** Every complete flag assignment for n joints. */
const assignments = (level: Level, n: number): Exclude<Flag, null>[][] => {
  let out: Exclude<Flag, null>[][] = [[]];
  for (let i = 0; i < n; i++) out = out.flatMap((a) => flagSet(level).map((f) => [...a, f]));
  return out;
};
/** The kind of a joint, recomputed from the function: both one-sided limits against f(c), then both one-sided slopes. */
function numericKind(f: (x: number) => number, c: number): 'smooth' | 'kink' | 'gap' {
  const e = 1e-6;
  const v = f(c);
  if (Math.abs(f(c - e) - v) > 1e-4 || Math.abs(f(c + e) - v) > 1e-4) return 'gap';
  const h = 1e-4;
  const sl = (v - f(c - h)) / h;
  const sr = (f(c + h) - v) / h;
  return Math.abs(sl - sr) > 1e-2 ? 'kink' : 'smooth';
}
const holds = (s: string, cText: string) => new RegExp(`x = ${cText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w/.])`).test(s);

describe('the pools', () => {
  it('every joint of every row has the kind the function really has (limits, value and one-sided slopes)', () => {
    for (const { row } of allRows()) {
      for (const j of row.joints) expect(numericKind(row.f, j.c), `${row.name} at x = ${j.cText}`).toBe(j.kind);
    }
  });
  it('joints lie strictly inside the range, run left to right, and every row has 1 to 4 of them', () => {
    for (const { row } of allRows()) {
      expect(row.joints.length).toBeGreaterThanOrEqual(1);
      expect(row.joints.length).toBeLessThanOrEqual(4);
      row.joints.forEach((j, i) => {
        expect(j.c).toBeGreaterThan(row.lo);
        expect(j.c).toBeLessThan(row.hi);
        if (i > 0) expect(j.c).toBeGreaterThan(row.joints[i - 1].c);
      });
    }
  });
  it('every level has at least one gap, one kink and one smooth joint between its rows, as the level promises', () => {
    const kinds = (level: Level) => new Set(POOLS[level].flat().flatMap((r) => r.joints.map((j) => j.kind)));
    expect(kinds(1)).toContain('gap');
    expect(kinds(1)).toContain('kink');
    for (const level of [2, 3, 4] as Level[]) for (const k of ['gap', 'kink', 'smooth'] as const) expect(kinds(level), `level ${level} ${k}`).toContain(k);
  });
  it('level 4 holds traps: a smooth joint inside a sum of [x] and |x − 1|, and x|x| inside a piece', () => {
    const names = POOLS[4].flat().map((r) => r.name);
    expect(names).toContain('f(x) = [x] + |x − 1|');
    expect(names).toContain('f(x) = x|x|, 2x − 1 or x + 2');
  });
});

describe('judging: exactly one winning assignment per row', () => {
  it('level 1 scans 2^n, levels 2 to 4 scan 3^n: only the wanted flags win, and the winner has no fault', () => {
    for (const { level, row } of allRows()) {
      const r = asRound(row, level);
      const all = assignments(level, row.joints.length);
      expect(all.length).toBe((level === 1 ? 2 : 3) ** row.joints.length);
      const winners = all.filter((a) => judge(r, a));
      expect(winners, row.name).toHaveLength(1);
      expect(winners[0]).toEqual(row.joints.map((j) => want(level, j)));
      for (const a of all) {
        if (judge(r, a)) expect(firstFault(r, a)).toBeNull();
        else expect(firstFault(r, a), `${row.name} ${a.join(',')}`).not.toBeNull();
      }
    }
  });
  it('an assignment with an unset joint is incomplete and never wins', () => {
    for (const { level, row } of allRows()) {
      const r = asRound(row, level);
      const right: Flag[] = row.joints.map((j) => want(level, j));
      expect(complete(right, right.length)).toBe(true);
      for (let i = 0; i < right.length; i++) {
        const a = [...right];
        a[i] = null;
        expect(complete(a, a.length)).toBe(false);
        expect(judge(r, a)).toBe(false);
      }
      expect(complete([], row.joints.length)).toBe(false);
    }
  });
  it('level 1 treats a kink as joined, and levels 2 to 4 ask for the kink flag', () => {
    const kink = POOLS[1][0][0].joints[0];
    expect(kink.kind).toBe('kink');
    expect(want(1, kink)).toBe('fine');
    expect(want(2, kink)).toBe('kink');
    expect(want(3, { c: 0, cText: '0', kind: 'smooth' })).toBe('fine');
    for (const level of LEVELS) expect(want(level, { c: 0, cText: '0', kind: 'gap' })).toBe('gap');
  });
  it('the start (nothing flagged) never wins, and neither does flagging everything fine', () => {
    for (const { level, row } of allRows()) {
      const r = asRound(row, level);
      expect(judge(r, Array(row.joints.length).fill(null))).toBe(false);
      const anyNeed = row.joints.some((j) => want(level, j) !== 'fine');
      expect(judge(r, Array(row.joints.length).fill('fine'))).toBe(!anyNeed);
    }
  });
  it('the flag cycle never returns to unset, skips the kink flag in level 1, and visits every flag', () => {
    expect(nextFlag(1, null)).toBe('fine');
    expect(nextFlag(1, 'fine')).toBe('gap');
    expect(nextFlag(1, 'gap')).toBe('fine');
    expect(nextFlag(2, null)).toBe('fine');
    expect(nextFlag(2, 'fine')).toBe('kink');
    expect(nextFlag(2, 'kink')).toBe('gap');
    expect(nextFlag(2, 'gap')).toBe('fine');
    expect(flagText(1, null)).toBe('?');
    expect(flagText(1, 'fine')).toBe('✓ joined');
    expect(flagText(2, 'fine')).toBe('✓ fine');
    expect(flagText(2, 'kink')).toBe('🟡 smooth');
    expect(flagText(2, 'gap')).toBe('🔴 patch');
  });
});

describe('what goes wrong at a wrong flag', () => {
  const faultOf = (r: Round, i: number, f: Flag) => {
    const a: Flag[] = r.joints.map((j) => want(r.level, j));
    a[i] = f;
    return firstFault(r, a);
  };
  it('a gap left fine, or only smoothed, leaks', () => {
    for (const { level, row } of allRows()) {
      const r = asRound(row, level);
      row.joints.forEach((j, i) => {
        if (j.kind !== 'gap') return;
        for (const f of flagSet(level).filter((x) => x !== 'gap')) expect(faultOf(r, i, f)).toEqual({ joint: i, what: 'leak' });
      });
    }
  });
  it('a kink left fine bends (levels 2 to 4), a kink flagged gap is a wrong repair, and a fine joint flagged kink or gap is a needless repair', () => {
    for (const { level, row } of allRows()) {
      const r = asRound(row, level);
      row.joints.forEach((j, i) => {
        if (want(level, j) === 'kink') {
          expect(faultOf(r, i, 'fine')).toEqual({ joint: i, what: 'kink' });
          expect(faultOf(r, i, 'gap')).toEqual({ joint: i, what: 'wrongfix' });
        }
        if (want(level, j) === 'fine') {
          expect(faultOf(r, i, 'gap')).toEqual({ joint: i, what: 'needless' });
          if (level > 1) expect(faultOf(r, i, 'kink')).toEqual({ joint: i, what: 'needless' });
        }
      });
    }
  });
  it('in level 1 a kink joint flagged fine is correct', () => {
    const r = asRound(POOLS[1][0][0], 1);
    expect(r.joints.map((j) => j.kind)).toEqual(['kink', 'gap']);
    expect(judge(r, ['fine', 'gap'])).toBe(true);
    expect(firstFault(r, ['fine', 'gap'])).toBeNull();
  });
  it('the first fault is the leftmost wrong joint, whatever is wrong further right', () => {
    const r = asRound(POOLS[3][0][0], 3);   // [x]: gap, gap, smooth, gap
    expect(firstFault(r, ['fine', 'fine', 'gap', 'fine'])?.joint).toBe(0);
    expect(firstFault(r, ['gap', 'fine', 'gap', 'fine'])?.joint).toBe(1);
    expect(firstFault(r, ['gap', 'gap', 'gap', 'fine'])).toEqual({ joint: 2, what: 'needless' });
    expect(firstFault(r, ['gap', 'gap', 'fine', 'fine'])).toEqual({ joint: 3, what: 'leak' });
  });
});

describe('timing', () => {
  it('every verdict lands before the 2.4 s resolve, for every row and every fault', () => {
    for (const { level, row } of allRows()) {
      const r = asRound(row, level);
      expect(verdictTime(r, null)).toBeCloseTo(0.3 + RUN, 12);
      expect(verdictTime(r, null)).toBeLessThan(RESOLVE);
      row.joints.forEach((_, i) => {
        for (const what of ['leak', 'kink', 'needless', 'wrongfix'] as Fault['what'][]) expect(verdictTime(r, { joint: i, what })).toBeLessThan(RESOLVE - 0.5);
      });
    }
  });
  it('the joints are reached in order and before the pool', () => {
    for (const { level, row } of allRows()) {
      const r = asRound(row, level);
      row.joints.forEach((_, i) => {
        expect(jointTime(r, i)).toBeGreaterThan(0.3);
        expect(jointTime(r, i)).toBeLessThan(0.3 + RUN);
        if (i > 0) expect(jointTime(r, i)).toBeGreaterThan(jointTime(r, i - 1));
      });
    }
    expect(verdictTime(asRound(POOLS[3][0][0], 3), { joint: 3, what: 'leak' })).toBeCloseTo(0.3 + (RUN * 4) / 5 + 0.25, 12);
  });
});

describe('the rounds of a level', () => {
  it('three rounds, assist 0, 1, 2, one row from each pool, 1 to 4 joints each, over 80 seeds', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const rs = buildRounds(level, createRng(seed));
        expect(rs).toHaveLength(3);
        expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
        rs.forEach((r, k) => {
          expect(r.level).toBe(level);
          expect(POOLS[level][k].map((x) => x.name)).toContain(r.name);
          expect(r.joints.length).toBeGreaterThanOrEqual(1);
          expect(r.joints.length).toBeLessThanOrEqual(4);
        });
      }
    }
  });
  it('the same seed builds the same rounds, and different seeds reach every row of a pool', () => {
    for (const level of LEVELS) {
      const a = buildRounds(level, createRng(5)).map((r) => r.name);
      expect(buildRounds(level, createRng(5)).map((r) => r.name)).toEqual(a);
      POOLS[level].forEach((pool, k) => {
        const seen = new Set(SEEDS.map((s) => buildRounds(level, createRng(s))[k].name));
        expect(seen.size).toBe(pool.length);
      });
    }
  });
  it('no round starts solved: nothing is flagged at the start', () => {
    for (const level of LEVELS) {
      for (const r of buildRounds(level, createRng(3))) expect(judge(r, [])).toBe(false);
    }
  });
});

describe('words', () => {
  const wrongAssignments = (r: Round) => assignments(r.level, r.joints.length).filter((a) => !judge(r, a));
  it('a miss names the joint where it went wrong, says what happened, and never names another joint', () => {
    for (const { level, row } of allRows()) {
      const r = asRound(row, level);
      for (const a of wrongAssignments(r)) {
        const f = firstFault(r, a)!;
        const text = missText(r, a);
        expect(holds(text, r.joints[f.joint].cText), text).toBe(true);
        expect(text).toMatch(/dropped out|flew over the side|test was stopped/);
        r.joints.forEach((j, i) => {
          if (i !== f.joint) expect(holds(text, j.cText), `${row.name}: ${text}`).toBe(false);
        });
      }
    }
  });
  it('the four miss texts are the briefed sentences', () => {
    const r = asRound(POOLS[2][1][0], 2);   // x², x, x + 1: kink at 1, gap at 2
    expect(missText(r, ['fine', 'gap'])).toBe('At x = 1 the tube bent sharply and nobody smoothed it: Sir Quacks slammed into the kink and flew over the side.');
    expect(missText(r, ['gap', 'gap'])).toBe('At x = 1 the welder came to patch a gap, but the tube was joined there with a sharp bend: the kink stayed and Sir Quacks flew over the side.');
    expect(missText(r, ['kink', 'fine'])).toBe('At x = 2 the tube was broken and nobody patched it: Sir Quacks dropped out of the slide into the pool.');
    const q = asRound(POOLS[2][0][0], 2);   // |x − 1|: smooth at 0, kink at 1
    expect(missText(q, ['kink', 'kink'])).toBe('At x = 0 a repair crew was sent where the slide needed nothing: the whistle blew and the test was stopped.');
  });
  it('a miss text of a solved round is empty', () => {
    const r = asRound(POOLS[2][0][0], 2);
    expect(missText(r, ['fine', 'kink'])).toBe('');
  });
  it('the working mentions every joint and the win says Slide approved!', () => {
    for (const { level, row } of allRows()) {
      const r = asRound(row, level);
      const e = explain(r);
      for (const j of row.joints) expect(e).toContain(`x = ${j.cText}`);
      expect(e.split('; ')).toHaveLength(row.joints.length);
      expect(winText(r)).toMatch(/^Slide approved! /);
    }
  });
  it('the working states the real numbers: |x − 1| at 1, [x] at 0, x² with f(0) = 1, |cos x| at π/2, x|x| at 0', () => {
    const find = (level: Level, name: string) => allRows().find((x) => x.level === level && x.row.name === name)!.row;
    expect(explain(asRound(find(2, 'f(x) = |x − 1|'), 2))).toBe('x = 0: smooth (value 1, slope −1 on both sides); x = 1: kink (joined at 0, but the slope jumps from −1 to 1)');
    expect(explain(asRound(find(3, 'f(x) = [x]'), 3))).toBe(
      'x = −1: gap (from the left −2, from the right −1, value −1); x = 0: gap (from the left −1, from the right 0, value 0); x = 1/2: smooth (value 0, slope 0 on both sides); x = 1: gap (from the left 0, from the right 1, value 1)',
    );
    expect(explain(asRound(find(1, 'f(x) = x², with f(0) = 1'), 1))).toBe('x = −1: joined at 1; x = 0: gap (both sides tend to 0, but f(0) = 1)');
    expect(explain(asRound(find(1, 'f(x) = |x|/x, with f(0) = 0'), 1))).toBe('x = 0: gap (from the left −1, from the right 1, value 0); x = 1: joined at 1');
    expect(explain(asRound(find(3, 'f(x) = |cos x|'), 3))).toBe(
      'x = π/2: kink (joined at 0, but the slope jumps from −1 to 1); x = π: smooth (value 1, slope 0 on both sides); x = 3π/2: kink (joined at 0, but the slope jumps from −1 to 1)',
    );
    expect(explain(asRound(find(4, 'f(x) = x|x|, 2x − 1 or x + 2'), 4))).toBe('x = 0: smooth (value 0, slope 0 on both sides); x = 1: smooth (value 1, slope 2 on both sides); x = 2: gap (from the left 3, from the right 4, value 3)');
    expect(explain(asRound(find(1, 'f(x) = 2x, 0 or 4x'), 1))).toBe('x = 0: joined at 0; x = 1: gap (from the left 0, from the right 4, value 0)');
  });
  it('no working or miss text writes a negative zero', () => {
    for (const { level, row } of allRows()) {
      const r = asRound(row, level);
      expect(explain(r)).not.toMatch(/−0(?![.\d])/);
      for (const j of row.joints) {
        const t = facts(r, j);
        for (const v of [t.L, t.R, t.V, t.sl, t.sr]) expect(v).not.toBe('−0');
      }
    }
  });
  it('the hint line gives the blueprint and fades round by round', () => {
    const r = asRound(POOLS[3][1][0], 3);
    expect(intel(r)).toBe('Blueprint: f(x) = |cos x|, from x = 0 to 2π. Joints to inspect at x = π/2, π, 3π/2.');
    expect(hintLine({ ...r, assist: 0 })).toMatch(/Round 1: the zoom shows the joint you last tapped\.$/);
    expect(hintLine({ ...r, assist: 1 })).toMatch(/No zoom: a zoom drone costs a charge\.$/);
    expect(hintLine({ ...r, assist: 2 })).toMatch(/Boss round: no zoom\.$/);
    expect(zoomText(r, 1)).toBe('Zoom drone at x = π: close-up of the joint for a moment.');
    expect(jointAria(r.joints[2])).toBe('Joint at x = 3π/2');
  });
  it('the hint line never says which joints are gaps or kinks', () => {
    for (const { level, row } of allRows()) {
      const r = asRound(row, level);
      for (const a of [0, 1, 2] as const) expect(hintLine({ ...r, assist: a })).not.toMatch(/gap|kink|smooth|broken|fine/i);
    }
  });
});

describe('the zoom window', () => {
  it('shows the real graph on [c − w, c + w], w = 6% of the range, split into a left piece and a right piece', () => {
    for (const { level, row } of allRows()) {
      const r = asRound(row, level);
      row.joints.forEach((j, i) => {
        const z = zoomWindow(r, i);
        expect(z.w).toBeCloseTo(0.06 * (row.hi - row.lo), 12);
        expect(z.left[0][0]).toBeCloseTo(j.c - z.w, 9);
        expect(z.left[z.left.length - 1][0]).toBeLessThan(j.c);
        expect(z.right[0][0]).toBeGreaterThan(j.c);
        expect(z.right[z.right.length - 1][0]).toBeCloseTo(j.c + z.w, 9);
        for (const [x, y] of [...z.left, ...z.right]) expect(y).toBeCloseTo(row.f(x), 12);
        expect(z.V).toBe(row.f(j.c));
      });
    }
  });
  it('the limits and the value tell the kind: a gap shows an open end, a joined joint closes up', () => {
    for (const { level, row } of allRows()) {
      const r = asRound(row, level);
      row.joints.forEach((j, i) => {
        const z = zoomWindow(r, i);
        const closed = Math.abs(z.L - z.V) < 1e-6 && Math.abs(z.R - z.V) < 1e-6;
        expect(closed, `${row.name} at ${j.cText}`).toBe(j.kind !== 'gap');
      });
    }
  });
});
