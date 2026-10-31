import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import {
  ARC, AXIS, COIL, DIAL, LCD_OFF, PAIR, TRIM, arcUT, axisFraction, axisUT, buildRounds, card, centreUT, fault, goal, hintText, innerUT, judge, lcdText,
  meterText, missText, netUT, trimNT, trimUp, verdictDelay, winText, type Fault, type Round, type Values,
} from './logic';

const SEEDS = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const p3 = (x: number) => Number(x.toPrecision(3));
const range = (lo: number, hi: number, step = 1) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
type L = 1 | 2 | 3 | 4 | 5;
const LEVELS: L[] = [1, 2, 3, 4, 5];

describe('the pools: every target is the row’s field at its answer', () => {
  it('level 1: the calibration field, its direction, and neighbours differ by more than 2%', () => {
    for (const pool of TRIM) for (const r of pool) {
      expect(p3(trimNT(r, r.i)), JSON.stringify(r)).toBe(r.nt);
      expect(trimUp(r, r.dir)).toBe(r.up);
      expect(trimUp(r, 1 - r.dir)).toBe(!r.up);
      expect(Math.abs(trimNT(r, r.i + 1) / r.nt - 1)).toBeGreaterThan(0.02);
      if (r.i > 1) expect(Math.abs(trimNT(r, r.i - 1) / r.nt - 1)).toBeGreaterThan(0.02);
      expect(r.i).toBeGreaterThanOrEqual(1);
      expect(r.i).toBeLessThanOrEqual(30);
    }
  });
  it('level 2: the centre field B = μ₀NI/2R, the direction and neighbours', () => {
    for (const pool of COIL) for (const r of pool) {
      expect(p3(centreUT(r.n, r.i, r.R)), JSON.stringify(r)).toBe(r.ut);
      expect(r.sense === 1).toBe(r.up);
      expect(Math.abs(centreUT(r.n + 5, r.i, r.R) / r.ut - 1)).toBeGreaterThan(0.02);
      expect(Math.abs(centreUT(r.n - 5, r.i, r.R) / r.ut - 1)).toBeGreaterThan(0.02);
    }
  });
  it('level 3: an arc gives deg/360 of the loop field, and neighbours differ', () => {
    for (const pool of ARC) for (const r of pool) {
      expect(p3(arcUT(r, r.deg)), JSON.stringify(r)).toBe(r.ut);
      expect(r.sense === 1).toBe(r.up);
      expect(Math.abs(arcUT(r, r.deg + 30) / r.ut - 1)).toBeGreaterThan(0.02);
      expect(Math.abs(arcUT(r, r.deg - 30) / r.ut - 1)).toBeGreaterThan(0.02);
      expect(r.deg).toBeGreaterThanOrEqual(30);
      expect(r.deg).toBeLessThanOrEqual(360);
    }
  });
  it('level 4: the axis field, the direction, neighbours, and the forgot-the-fall-off trap never lands on the answer', () => {
    for (const pool of AXIS) for (const r of pool) {
      expect(p3(axisUT(r, r.n)), JSON.stringify(r)).toBe(r.ut);
      expect(r.sense === 1).toBe(r.up);
      expect(Math.abs(axisUT(r, r.n + 5) / r.ut - 1)).toBeGreaterThan(0.02);
      expect(Math.abs(axisUT(r, r.n - 5) / r.ut - 1)).toBeGreaterThan(0.02);
      expect(Math.round(r.ut / centreUT(1, r.i, r.R) / 5) * 5).not.toBe(r.n);
      expect(axisFraction(r)).toBeLessThan(1);
    }
  });
  it('level 5: the net field, the direction and the three pool kinds (add, take away, overpower)', () => {
    PAIR.forEach((pool, kind) => {
      for (const r of pool) {
        const net = netUT(r, r.sense, r.n);
        expect(p3(Math.abs(net)), JSON.stringify(r)).toBe(r.ut);
        expect(net > 0).toBe(r.up);
        const inner = innerUT(r);
        if (kind === 0) {
          expect(r.sense).toBe(r.s1);
          expect(Math.abs(net)).toBeGreaterThan(inner);
        } else if (kind === 1) {
          expect(r.sense).not.toBe(r.s1);
          expect(Math.abs(net)).toBeLessThan(inner);
          expect(net > 0).toBe(r.s1 === 1);
        } else {
          expect(r.sense).not.toBe(r.s1);
          expect(net > 0).toBe(r.s1 !== 1);
        }
      }
    });
  });
});

// every reachable setting of each level
const settings = (level: L): Values[] => {
  if (level === 1) return [0, 1].flatMap((dir) => range(DIAL.i.min, DIAL.i.max).map((i) => ({ dir, i })));
  if (level === 3) return [0, 1].flatMap((sense) => range(DIAL.deg.min, DIAL.deg.max, DIAL.deg.step).map((deg) => ({ sense, deg })));
  return [0, 1].flatMap((sense) => range(DIAL.n.min, DIAL.n.max, DIAL.n.step).map((n) => ({ sense, n })));
};
const startOf = (level: L): Values => (level === 1 ? { dir: DIAL.dir.start, i: DIAL.i.start } : level === 3 ? { sense: DIAL.sense.start, deg: DIAL.deg.start } : { sense: DIAL.sense.start, n: DIAL.n.start });
const answerOf = (r: Round): Values => (r.kind === 'trim' ? { dir: r.dir, i: r.i } : r.kind === 'arc' ? { sense: r.sense, deg: r.deg } : { sense: r.sense, n: r.n });

describe('exactly one winning setting', () => {
  it('only the answer wins on every pool row, the start never wins, and no answer sits at a dial end', () => {
    for (const level of LEVELS) {
      const pools = [TRIM, COIL, ARC, AXIS, PAIR][level - 1] as unknown as Omit<Round, 'kind' | 'assist'>[][];
      const kind = ['trim', 'coil', 'arc', 'axis', 'pair'][level - 1];
      for (const pool of pools) for (const row of pool) {
        const r = { ...row, kind, assist: 0 } as Round;
        const winners = settings(level).filter((x) => judge(r, x));
        expect(winners, `${kind} ${JSON.stringify(row)}`).toEqual([answerOf(r)]);
        expect(judge(r, startOf(level))).toBe(false);
        if (r.kind === 'trim') expect([DIAL.i.min, DIAL.i.max]).not.toContain(r.i);
        if (r.kind === 'arc') expect([DIAL.deg.min, DIAL.deg.max]).not.toContain(r.deg);
        if (r.kind === 'coil' || r.kind === 'axis' || r.kind === 'pair') expect([DIAL.n.min, DIAL.n.max]).not.toContain(r.n);
      }
    }
  });
  it('no two pools of a level share an answer, and the binary answer is mixed within every pool', () => {
    const key = (r: unknown, level: L) => {
      const row = r as Record<string, number>;
      return level === 1 ? `${row.dir}/${row.i}` : level === 3 ? `${row.sense}/${row.deg}` : `${row.sense}/${row.n}`;
    };
    LEVELS.forEach((level) => {
      const pools = [TRIM, COIL, ARC, AXIS, PAIR][level - 1] as unknown as Record<string, number>[][];
      const seen = new Set<string>();
      for (const pool of pools) {
        const bin = pool.map((r) => (level === 1 ? r.dir : r.sense));
        expect(new Set(bin).size, `level ${level} mixed`).toBe(2);
        for (const r of pool) {
          const k = key(r, level);
          expect(seen.has(k), `level ${level} ${k}`).toBe(false);
          seen.add(k);
        }
      }
    });
  });
});

describe('rounds', () => {
  it('every level builds 3 rounds of its kind, assist 0, 1, 2, each from its own pool, with distinct answers', () => {
    const kinds = ['trim', 'coil', 'arc', 'axis', 'pair'];
    const pools = [TRIM, COIL, ARC, AXIS, PAIR] as unknown as object[][][];
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const rounds = buildRounds(level, createRng(seed));
        expect(rounds.length).toBe(3);
        expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
        rounds.forEach((r, k) => {
          expect(r.kind).toBe(kinds[level - 1]);
          const { kind: _k, assist: _a, ...row } = r as unknown as Record<string, unknown>;
          void _k;
          void _a;
          expect(pools[level - 1][k].some((p) => JSON.stringify(p) === JSON.stringify(row))).toBe(true);
        });
        const keys = rounds.map((r) => JSON.stringify(answerOf(r)));
        expect(new Set(keys).size).toBe(3);
      }
    }
  });
  it('the same seed gives the same rounds', () => {
    for (const level of LEVELS) expect(buildRounds(level, createRng(5))).toEqual(buildRounds(level, createRng(5)));
  });
});

describe('faults', () => {
  const rows = (level: L) => SEEDS.slice(0, 20).flatMap((s) => buildRounds(level, createRng(s)));
  it('levels 1 to 4: the other direction is a flip, one step below is weak, one step above strong', () => {
    for (const level of [1, 2, 3, 4] as L[]) {
      for (const r of rows(level)) {
        const a = answerOf(r) as Values;
        if (r.kind === 'trim') {
          expect(fault(r, { dir: 1 - r.dir, i: r.i })).toBe('flip');
          expect(fault(r, { dir: 1 - r.dir, i: 3 })).toBe('flip');
          expect(fault(r, { dir: r.dir, i: r.i - 1 })).toBe('weak');
          expect(fault(r, { dir: r.dir, i: r.i + 1 })).toBe('strong');
        } else if (r.kind === 'arc') {
          expect(fault(r, { sense: 1 - r.sense, deg: r.deg })).toBe('flip');
          expect(fault(r, { sense: r.sense, deg: r.deg - 30 })).toBe('weak');
          expect(fault(r, { sense: r.sense, deg: r.deg + 30 })).toBe('strong');
        } else {
          expect(fault(r, { sense: 1 - (a.sense as number), n: r.n as number })).toBe('flip');
          expect(fault(r, { sense: a.sense, n: (r.n as number) - 5 })).toBe('weak');
          expect(fault(r, { sense: a.sense, n: (r.n as number) + 5 })).toBe('strong');
        }
      }
    }
  });
  it('level 5: the right turns with the other sense never win: strong in pool 1, flip in pool 2, weak or flip in pool 0', () => {
    for (const seed of SEEDS) {
      const rounds = buildRounds(5, createRng(seed));
      rounds.forEach((r, k) => {
        if (r.kind !== 'pair') return;
        const f = fault(r, { sense: 1 - r.sense, n: r.n }) as Fault;
        expect(f).not.toBeNull();
        if (k === 1) expect(f).toBe('strong');
        if (k === 2) expect(f).toBe('flip');
        if (k === 0) expect(['weak', 'flip']).toContain(f);
      });
    }
    // the pool 0 row that nets exactly zero with the other sense counts as a flip
    const zero = PAIR[0].find((r) => Math.abs(netUT(r, 1 - r.sense, r.n)) < 1e-9);
    if (zero) expect(fault({ ...zero, kind: 'pair', assist: 0 }, { sense: 1 - zero.sense, n: zero.n })).toBe('flip');
  });
  it('level 5: the net field decides, a wrong sense that still points the right way is weak or strong, not flip', () => {
    for (const r of PAIR[1]) {
      const row: Round = { ...r, kind: 'pair', assist: 0 };
      for (const n of range(5, 150, 5)) {
        const f = fault(row, { sense: r.sense, n });
        const net = netUT(r, r.sense, n);
        expect(f === 'flip').toBe(Math.abs(net) < 1e-9 || (net > 0) !== r.up);
      }
    }
  });
});

describe('words', () => {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${esc(token)}`).test(s);
  const token = (r: Round): string | null => (r.kind === 'trim' ? `${r.i} A` : r.kind === 'arc' ? `${r.deg}°` : r.kind === 'pair' ? null : `${r.n} turns`);
  it('a miss never contains the answer, and ends with what to change', () => {
    for (const level of LEVELS) {
      for (const r of buildRounds(level, createRng(31))) {
        const tok = token(r);
        for (const x of settings(level)) {
          if (judge(r, x)) continue;
          const m = missText(r, x);
          if (tok) {
            const own = r.kind === 'trim' ? x.i === r.i : r.kind === 'arc' ? x.deg === r.deg : x.n === r.n;
            if (!own) expect(has(m, tok), `${m} / ${tok}`).toBe(false);
          }
          expect(m).toMatch(/(Reverse the current|Use more current|Use less current|Wind more turns|Wind fewer turns|Bend a longer arc|Bend a shorter arc|Think about which coil wins|Make the net field (stronger|weaker))\.$/);
        }
      }
    }
  });
  it('a miss never states the target field either', () => {
    for (const level of LEVELS) {
      for (const r of buildRounds(level, createRng(31))) {
        const t = r.kind === 'trim' ? `${r.nt} nT` : `${r.ut} µT`;
        for (const x of settings(level)) if (!judge(r, x)) expect(missText(r, x)).not.toContain(t);
      }
    }
  });
  it('a win names its law', () => {
    const want: Record<string, string> = { trim: 'dl × r', coil: 'B = μ₀NI/2R', arc: 'add nothing', axis: '(R² + x²)^(3/2)', pair: 'Net:' };
    for (const level of LEVELS) for (const r of buildRounds(level, createRng(7))) expect(winText(r)).toContain(want[r.kind]);
    for (const level of LEVELS) for (const r of buildRounds(level, createRng(7))) expect(winText(r).split(/[.!] /).length).toBeLessThanOrEqual(4);
  });
  it('every goal line is at most 40 characters and states a fact, not the answer', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        for (const r of buildRounds(level, createRng(seed))) {
          expect(goal(r).length).toBeLessThanOrEqual(40);
          const tok = token(r);
          if (tok) expect(has(goal(r), tok)).toBe(false);
          card(r).forEach((c) => expect(has(c, tok ?? '#')).toBe(false));
        }
      }
    }
  });
  it('the hint line says how the meter fades, and never gives the answer', () => {
    const [a, b, c] = buildRounds(2, createRng(3));
    expect(hintText(a)).toMatch(/Round 1: the field meter is live/);
    expect(hintText(b)).toMatch(/a meter check costs a charge/);
    expect(hintText(c)).toMatch(/Last trial: no meter/);
    for (const level of LEVELS) for (const r of buildRounds(level, createRng(3))) {
      const tok = token(r);
      if (tok) expect(has(hintText(r), tok)).toBe(false);
    }
  });
  it('the meter check and the meter text show the field the player’s setting makes', () => {
    const r = buildRounds(2, createRng(3))[0] as Extract<Round, { kind: 'coil' }>;
    const x = { sense: 1 - r.sense, n: 40 };
    expect(meterText(r, x)).toContain(`${p3(centreUT(40, r.i, r.R))} µT`);
    expect(lcdText(r, x)).toMatch(/^[\d.]+ µT [⊙⊗]/);
    expect(LCD_OFF).toBe('— — —');
    const pr = buildRounds(5, createRng(3))[0];
    expect(lcdText(pr, { sense: 1, n: 10 })).toMatch(/^net [\d.]+ µT [⊙⊗]/);
    expect(lcdText(buildRounds(1, createRng(3))[0], { dir: 1, i: 5 })).toMatch(/^[\d.]+ nT [⊙⊗]/);
  });
  it('the verdict lands at 0.9 s in level 1 and 1.2 s elsewhere, both inside the 2.4 s resolve', () => {
    for (const level of LEVELS) for (const r of buildRounds(level, createRng(1))) {
      expect(verdictDelay(r)).toBe(level === 1 ? 0.9 : 1.2);
      expect(verdictDelay(r)).toBeLessThan(2.3);
    }
  });
});
