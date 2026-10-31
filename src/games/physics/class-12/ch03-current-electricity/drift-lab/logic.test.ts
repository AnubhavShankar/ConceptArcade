import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import {
  CRAWL, DIAL, E_CHARGE, GATE, K, LCD_OFF, MOB, N_CU, THICK, buildRounds, factLabel, fault, goalLine, hintText, judge, lampState, lcdText, meterText, missText, mmss, pace, paceMob, perSecond, shellyPace,
  verdictDelay, winText, type CrawlRow, type GateRow, type MobRow, type Round, type ThickRow, type Values,
} from './logic';

const seeds = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const range = (lo: number, hi: number, step: number) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
type L = 1 | 2 | 3 | 4;
const LEVELS: L[] = [1, 2, 3, 4];

/** Every setting a level can reach. */
function settings(level: L): Values[] {
  if (level === 1) return range(DIAL.i1.min, DIAL.i1.max, DIAL.i1.step).flatMap((i) => [0, 1].map((dir) => ({ i, dir })));
  if (level === 2) return range(DIAL.i2.min, DIAL.i2.max, DIAL.i2.step).map((i) => ({ i }));
  if (level === 3) return range(DIAL.a.min, DIAL.a.max, DIAL.a.step).map((a) => ({ a }));
  return range(DIAL.mv.min, DIAL.mv.max, DIAL.mv.step).flatMap((mv) => range(DIAL.a.min, DIAL.a.max, DIAL.a.step).map((a) => ({ mv, a })));
}
const startOf = (level: L): Values => (level === 1 ? { i: DIAL.i1.start, dir: DIAL.dir.start } : level === 2 ? { i: DIAL.i2.start } : level === 3 ? { a: DIAL.a.start } : { mv: DIAL.mv.start, a: DIAL.a.start });
const answerOf = (r: Round): Values => (r.kind === 'gate' ? { i: r.i, dir: r.dir } : r.kind === 'crawl' ? { i: r.i } : r.kind === 'thick' ? { a: r.a } : { mv: r.V, a: r.a });
const allRows = (): Round[] => [
  ...GATE.flatMap((p, k) => p.map((row) => ({ ...row, kind: 'gate' as const, assist: Math.min(2, k) as 0 | 1 | 2 }))),
  ...CRAWL.flatMap((p, k) => p.map((row) => ({ ...row, kind: 'crawl' as const, assist: Math.min(2, k) as 0 | 1 | 2 }))),
  ...THICK.flatMap((p, k) => p.map((row) => ({ ...row, kind: 'thick' as const, assist: Math.min(2, k) as 0 | 1 | 2 }))),
  ...MOB.flatMap((p, k) => p.map((row) => ({ ...row, kind: 'mob' as const, assist: Math.min(2, k) as 0 | 1 | 2 }))),
];
const levelOf = (r: Round): L => ({ gate: 1, crawl: 2, thick: 3, mob: 4 })[r.kind] as L;

describe('the numbers from the textbook', () => {
  it('K is n e times 1e-9', () => near(K, N_CU * E_CHARGE * 1e-9));
  it('level 1 rows: I = Q/t, the arrow follows the heading, both headings in every pool', () => {
    for (const pool of GATE) {
      for (const r of pool as GateRow[]) {
        near((1.6 * r.e19) / r.t, r.i);
        expect(r.dir).toBe(r.heading === 'right' ? 1 : 0);
      }
      expect(new Set(pool.map((r) => r.heading))).toEqual(new Set(['right', 'left']));
    }
  });
  it('level 2 rows: I = 13.6 A v, and the pace is a snail’s', () => {
    for (const r of CRAWL.flat() as CrawlRow[]) {
      const v = (10 * r.len) / r.T;
      near(K * r.a * v, r.i);
      expect(v).toBeGreaterThanOrEqual(0.4);
      expect(v).toBeLessThanOrEqual(2.8);
    }
  });
  it('level 3 rows: A = I / (13.6 v) with v = 300 tau / T', () => {
    for (const r of THICK.flat() as ThickRow[]) near(r.i / (K * ((300 * r.tau) / r.T)), r.a);
  });
  it('level 4 rows: V = 1000 v L / mu, the lamp shows 3 figures, and the nearest dial area is the answer', () => {
    for (const r of MOB.flat() as MobRow[]) {
      near((1000 * r.v * r.L) / r.mu, r.V);
      expect(Number((K * r.a * r.v).toPrecision(3))).toBe(r.lamp);
      const need = r.lamp / (K * r.v);
      const nearest = range(DIAL.a.min, DIAL.a.max, DIAL.a.step).reduce((best, a) => (Math.abs(a - need) < Math.abs(best - need) ? a : best));
      expect(nearest).toBe(r.a);
    }
  });
  it('paceMob is mu V / L', () => near(paceMob(4, 50, 0.4), 0.5));
  it('perSecond and mmss', () => {
    near(perSecond(4), 2.5);
    expect(mmss(340)).toBe('5 min 40 s');
    expect(mmss(1020)).toBe('17 min');
  });
});

describe('exactly one winner', () => {
  it('every row of every level: only the answer wins over every reachable setting, and the start setting loses', () => {
    for (const r of allRows()) {
      const level = levelOf(r);
      const wins = settings(level).filter((x) => judge(r, x));
      expect(wins).toEqual([answerOf(r)]);
      expect(judge(r, startOf(level))).toBe(false);
    }
  });
  it('the answer is never at a dial end', () => {
    for (const r of allRows()) {
      const a = answerOf(r);
      if (r.kind === 'gate' || r.kind === 'crawl') {
        const d = r.kind === 'gate' ? DIAL.i1 : DIAL.i2;
        expect(a.i).toBeGreaterThan(d.min);
        expect(a.i).toBeLessThan(d.max);
      }
      if (r.kind === 'thick' || r.kind === 'mob') {
        expect(a.a).toBeGreaterThan(DIAL.a.min);
        expect(a.a).toBeLessThan(DIAL.a.max);
      }
      if (r.kind === 'mob') {
        expect(a.mv).toBeGreaterThan(DIAL.mv.min);
        expect(a.mv).toBeLessThan(DIAL.mv.max);
      }
    }
  });
  it('the three pools of a level never share an answer', () => {
    const key = (level: L, row: unknown): string => {
      const r = row as Record<string, number>;
      return level === 1 || level === 2 ? String(r.i) : level === 3 ? String(r.a) : `${r.a}/${r.V}`;
    };
    const pools: [L, unknown[][]][] = [[1, GATE], [2, CRAWL], [3, THICK], [4, MOB]];
    for (const [level, pool] of pools) {
      const sets = pool.map((p) => new Set(p.map((row) => key(level, row))));
      for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) for (const k of sets[a]) expect(sets[b].has(k)).toBe(false);
    }
    // level 4 voltages are disjoint too
    const vs = MOB.map((p) => new Set(p.map((r) => r.V)));
    for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) for (const k of vs[a]) expect(vs[b].has(k)).toBe(false);
  });
});

describe('rounds', () => {
  it('80 seeds: three rounds of the right kind, assist 0, 1, 2, and round k comes from pool k', () => {
    const pools = [GATE, CRAWL, THICK, MOB] as unknown[][][];
    const kinds = ['gate', 'crawl', 'thick', 'mob'];
    for (const level of LEVELS) {
      for (const s of seeds) {
        const rounds = buildRounds(level, createRng(s));
        expect(rounds).toHaveLength(3);
        expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
        rounds.forEach((r, k) => {
          expect(r.kind).toBe(kinds[level - 1]);
          const { kind: _k, assist: _a, ...row } = r;
          expect(pools[level - 1][k]).toContainEqual(row);
        });
      }
    }
  });
  it('the same seed builds the same rounds', () => {
    for (const level of LEVELS) expect(buildRounds(level, createRng(5))).toEqual(buildRounds(level, createRng(5)));
  });
});

describe('faults', () => {
  const row = <T extends Round['kind']>(kind: T, k = 0) => allRows().filter((r) => r.kind === kind)[k] as Extract<Round, { kind: T }>;
  it('level 1: the wrong arrow is backward whatever the current; i ± 0.5 is fast or slow', () => {
    for (const r of allRows().filter((x) => x.kind === 'gate') as Extract<Round, { kind: 'gate' }>[]) {
      for (const i of range(DIAL.i1.min, DIAL.i1.max, DIAL.i1.step)) expect(fault(r, { i, dir: 1 - r.dir })).toBe('backward');
      expect(fault(r, { i: r.i + 0.5, dir: r.dir })).toBe('fast');
      expect(fault(r, { i: r.i - 0.5, dir: r.dir })).toBe('slow');
    }
  });
  it('level 2: i ± 0.5', () => {
    const r = row('crawl');
    expect(fault(r, { i: r.i + 0.5 })).toBe('fast');
    expect(fault(r, { i: r.i - 0.5 })).toBe('slow');
  });
  it('level 3: a thicker wire is slow, a thinner one is fast', () => {
    for (const r of allRows().filter((x) => x.kind === 'thick') as Extract<Round, { kind: 'thick' }>[]) {
      expect(fault(r, { a: r.a + 0.25 })).toBe('slow');
      expect(fault(r, { a: r.a - 0.25 })).toBe('fast');
    }
  });
  it('level 4: mv ± 10 is fast or slow; the right mv with a ± 0.25 is blown or dim; lampState is ok exactly when a·mv matches', () => {
    for (const r of allRows().filter((x) => x.kind === 'mob') as Extract<Round, { kind: 'mob' }>[]) {
      expect(fault(r, { mv: r.V + 10, a: r.a })).toBe('fast');
      expect(fault(r, { mv: r.V - 10, a: r.a })).toBe('slow');
      expect(fault(r, { mv: r.V, a: r.a + 0.25 })).toBe('blown');
      expect(fault(r, { mv: r.V, a: r.a - 0.25 })).toBe('dim');
      for (const x of settings(4)) expect(lampState(r, x) === 'ok').toBe(x.a! * x.mv! === r.a * r.V);
    }
  });
  it('the scene and the judge agree: a slow fault always means a pace below Shelly’s, a fast fault above it', () => {
    for (const r of allRows()) {
      const level = levelOf(r);
      for (const x of settings(level)) {
        const f = fault(r, x);
        if (f !== 'slow' && f !== 'fast') continue;
        let mine: number;
        let hers: number;
        if (r.kind === 'gate') {
          mine = perSecond(x.i!);
          hers = r.e19 / r.t;
        } else if (r.kind === 'crawl') {
          mine = pace(x.i!, r.a);
          hers = shellyPace(r);
        } else if (r.kind === 'thick') {
          mine = pace(r.i, x.a!);
          hers = shellyPace(r);
        } else {
          mine = paceMob(r.mu, x.mv!, r.L);
          hers = r.v;
        }
        if (f === 'slow') expect(mine).toBeLessThan(hers);
        else expect(mine).toBeGreaterThan(hers);
      }
    }
  });
  it('the win is a dead heat: the answer’s pace equals Shelly’s', () => {
    for (const r of allRows()) {
      if (r.kind === 'crawl') near(pace(r.i, r.a), shellyPace(r));
      if (r.kind === 'thick') near(pace(r.i, r.a), shellyPace(r));
      if (r.kind === 'mob') near(paceMob(r.mu, r.V, r.L), r.v);
    }
  });
});

describe('delays', () => {
  it('0.65 s backward, 1.05 s fast, 1.65 s otherwise, all below 2.4 s', () => {
    const g = allRows().find((r) => r.kind === 'gate') as Extract<Round, { kind: 'gate' }>;
    expect(verdictDelay(g, { i: g.i, dir: 1 - g.dir })).toBe(0.65);
    expect(verdictDelay(g, { i: g.i + 0.5, dir: g.dir })).toBe(1.05);
    expect(verdictDelay(g, { i: g.i - 0.5, dir: g.dir })).toBe(1.65);
    expect(verdictDelay(g, answerOf(g))).toBe(1.65);
    for (const r of allRows()) for (const x of settings(levelOf(r))) expect(verdictDelay(r, x)).toBeLessThan(2.4);
  });
});

describe('words', () => {
  it('a miss never contains the answer, and ends with what to change', () => {
    for (const r of allRows()) {
      for (const x of settings(levelOf(r))) {
        if (judge(r, x)) continue;
        const m = missText(r, x);
        expect(m).toMatch(/(Raise|Lower|Pick|arrow\.)/);
        if (r.kind === 'gate') {
          expect(has(m, `${r.i} A`) && x.i !== r.i).toBe(false);
          if (x.dir !== r.dir) expect(m).not.toContain(r.dir ? '← (right to left)' : '→ (left to right)');
          if (x.i !== r.i && x.dir === r.dir) expect(has(m, `${r.i} A`)).toBe(false);
        }
        if (r.kind === 'crawl') expect(has(m, `${r.i} A`)).toBe(false);
        if (r.kind === 'thick') expect(has(m, `${r.a} mm²`)).toBe(false);
        if (r.kind === 'mob') {
          if (x.a !== r.a) expect(has(m, `${r.a} mm²`)).toBe(false);
          if (x.mv !== r.V) expect(has(m, `${r.V} mV`)).toBe(false);
        }
      }
    }
  });
  it('a miss never names the right arrow in level 1', () => {
    for (const r of allRows().filter((x) => x.kind === 'gate') as Extract<Round, { kind: 'gate' }>[]) {
      const m = missText(r, { i: r.i, dir: 1 - r.dir });
      expect(m).toMatch(/backwards/);
      expect(m).not.toContain(r.dir ? '← (right to left)' : '→ (left to right)');
    }
  });
  it('the win text carries the working', () => {
    for (const r of allRows()) {
      const w = winText(r);
      if (r.kind === 'gate') expect(w).toContain('I = Q/t');
      if (r.kind === 'crawl') expect(w).toContain('neAv_d');
      if (r.kind === 'thick') expect(w).toContain('3 × 10⁸');
      if (r.kind === 'mob') {
        expect(w).toContain('μE');
        expect(w).toContain('neAv_d');
      }
      expect(w.startsWith(r.kind === 'gate' ? 'Record!' : 'Dead heat')).toBe(true);
    }
  });
  it('the goal line fits (51 characters at most) and the given-fact labels are right', () => {
    for (const r of allRows()) {
      expect(goalLine(r).length).toBeLessThanOrEqual(51);
      expect(goalLine(r)).toMatch(/Shelly/);
      if (r.kind === 'crawl') expect(factLabel(r)).toBe(`wire ${r.a} mm²`);
      if (r.kind === 'mob') expect(factLabel(r)).toMatch(/^track \d+ cm$/);
      if (r.kind === 'gate' || r.kind === 'thick') expect(factLabel(r)).toBeNull();
    }
  });
  it('the hint line fades round by round', () => {
    for (const level of LEVELS) {
      const rounds = buildRounds(level, createRng(3));
      expect(hintText(rounds[0])).toMatch(/Round 1: the pace board is live/);
      expect(hintText(rounds[1])).toMatch(/a pace check costs a charge/);
      expect(hintText(rounds[2])).toMatch(/Grand final: no pace board/);
    }
  });
  it('the pace check and the board show the player’s own values', () => {
    const g = allRows().find((r) => r.kind === 'gate') as Extract<Round, { kind: 'gate' }>;
    expect(meterText(g, { i: 4, dir: 0 })).toMatch(/Pace check: at 4 A, 2\.5 × 10¹⁹ electrons .* right to left/);
    expect(lcdText(g, { i: 4, dir: 0 })).toBe('2.5×10¹⁹ e⁻/s ←');
    expect(lcdText(g, { i: 4, dir: 1 })).toBe('2.5×10¹⁹ e⁻/s →');
    const c = allRows().find((r) => r.kind === 'crawl')!;
    expect(lcdText(c, { i: 4 })).toMatch(/mm\/s$/);
    expect(LCD_OFF).toBe('— — —');
  });
});
