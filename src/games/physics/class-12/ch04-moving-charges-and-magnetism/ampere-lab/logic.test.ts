import { describe, expect, it } from 'vitest';
import {
  ARROW, BUS, COL, DIAL, LCD_OFF, SOL, TOR, XPT, buildRounds, busUT, fault, fieldAt, goal, hintText, inMT, intel, judge, lcdText, meterText, missText, netMT, outMT, solMT, solTurnsPerM,
  torMT, torRegion, winText, type Dir, type Round, type Values,
} from './logic';

const SEEDS = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
};
const range = (lo: number, hi: number, step = 1) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The answer token as a separate number, so "12 cm" does not match "2 cm". */
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const p3 = (x: number) => Number(x.toPrecision(3));
const round = (kind: Round['kind'], row: object, assist: 0 | 1 | 2 = 0) => ({ ...row, kind, assist }) as Round;
const DIRS: Dir[] = ['up', 'down', 'left', 'right'];

describe('the pools (every row was checked by script)', () => {
  it('bus: the calibration field solves back, exactly one side has the field along the arrow, and the distance matters', () => {
    for (const row of BUS.flat()) {
      expect(p3(busUT(row.I, row.r))).toBe(row.ut);
      expect(fieldAt(row.cur, row.side)).toBe(row.arrow);
      expect([0, 1, 2, 3].filter((s) => fieldAt(row.cur, s) === row.arrow)).toEqual([row.side]);
      expect(Math.abs((20 * row.I) / row.ut - row.r)).toBeLessThan(1);
      for (const dr of [-5, 5]) expect(Math.abs(busUT(row.I, row.r + dr) / row.ut - 1)).toBeGreaterThan(0.02);
    }
    for (const pool of BUS) expect(new Set(pool.map((r) => r.side)).size).toBeGreaterThanOrEqual(3);
  });

  it('col: r_in × r_out = a², both probes read the target, and neighbours differ', () => {
    for (const row of COL.flat()) {
      expect(row.rin * row.rout).toBe(row.a ** 2);
      expect(p3(inMT(row, row.rin))).toBe(row.mt);
      expect(p3(outMT(row, row.rout))).toBe(row.mt);
      expect(Math.abs((row.mt * row.a * row.a) / (20 * row.I) - row.rin)).toBeLessThan(0.2);
      expect(Math.abs((20 * row.I) / row.mt - row.rout)).toBeLessThan(0.2);
      for (const dx of [-1, 1]) {
        expect(Math.abs(inMT(row, row.rin + dx) / row.mt - 1)).toBeGreaterThan(0.02);
        expect(Math.abs(outMT(row, row.rout + dx) / row.mt - 1)).toBeGreaterThan(0.02);
      }
      expect(row.rin).toBeGreaterThan(1);
      expect(row.rin).toBeLessThan(row.a - 1);
      expect(row.rout).toBeGreaterThan(row.a + 1);
      expect(row.rout).toBeLessThan(3 * row.a);
    }
  });

  it('xpt: x is the null point, the net field is zero there, and nowhere else comes near zero', () => {
    for (const row of XPT.flat()) {
      expect(row.x).toBe(row.same ? (row.d * row.I1) / (row.I1 + row.I2) : (row.d * row.I1) / (row.I1 - row.I2));
      expect(Math.abs(netMT(row, row.x))).toBeLessThan(1e-9);
      expect(row.d % 2).toBe(1);
      for (const x of range(DIAL.x.min, DIAL.x.max, DIAL.x.step)) {
        if (x === row.x) continue;
        expect(Math.abs(netMT(row, x))).toBeGreaterThanOrEqual(0.05 * (20 * row.I1) / x);
      }
    }
  });

  it('sol: the field solves back, a length of ±5 cm changes it, and one layer alone never lands on the answer', () => {
    for (const row of SOL.flat()) {
      expect(p3(solMT(row, row.L))).toBe(row.mt);
      const back = (MU0n * row.layers * row.per * row.I * 1000) / row.mt;
      expect(Math.abs(back * 100 - row.L)).toBeLessThan(1);
      for (const dl of [-5, 5]) expect(Math.abs(solMT(row, row.L + dl) / row.mt - 1)).toBeGreaterThan(0.02);
      // the one-layer slip (counting only one layer of turns) asks for a length that is not the answer
      if (row.layers > 1) expect(judge(round('sol', row), { L: row.L / row.layers })).toBe(false);
    }
  });

  it('tor: the field solves back, the answer sits well inside the winding, and ±1 cm changes it', () => {
    for (const row of TOR.flat()) {
      expect(p3(torMT(row, row.r))).toBe(row.mt);
      expect(row.r - row.rIn).toBeGreaterThanOrEqual(6);
      expect(row.rOut - row.r).toBeGreaterThanOrEqual(6);
      expect(Math.abs((0.02 * row.N * row.I) / row.mt - row.r)).toBeLessThan(0.2);
      for (const dx of [-1, 1]) expect(Math.abs(torMT(row, row.r + dx) / row.mt - 1)).toBeGreaterThan(0.02);
    }
  });

  it('no two pools of a level share an answer', () => {
    const keys: [unknown[][], (r: never) => string][] = [
      [BUS, (r: (typeof BUS)[0][0]) => `${r.side}/${r.r}`],
      [COL, (r: (typeof COL)[0][0]) => `${r.rin}/${r.rout}`],
      [XPT, (r: (typeof XPT)[0][0]) => String(r.x)],
      [SOL, (r: (typeof SOL)[0][0]) => String(r.L)],
      [TOR, (r: (typeof TOR)[0][0]) => String(r.r)],
    ] as never;
    for (const [pools, key] of keys) {
      const ans = pools.map((p) => new Set(p.map((r) => key(r as never))));
      for (let i = 0; i < ans.length; i++) for (let j = i + 1; j < ans.length; j++) for (const x of ans[i]) expect(ans[j].has(x)).toBe(false);
    }
  });
});
const MU0n = 4 * Math.PI * 1e-7;

describe('the physics helpers', () => {
  it('the right-hand grip rule: a current out of the screen circles anticlockwise, a current into it clockwise', () => {
    expect([0, 1, 2, 3].map((s) => fieldAt('out', s))).toEqual(['up', 'left', 'down', 'right']);
    expect([0, 1, 2, 3].map((s) => fieldAt('in', s))).toEqual(['down', 'right', 'up', 'left']);
  });
  it('B = 2 × 10⁻⁷ I/r, and a circle in the hole or outside the toroid encloses nothing', () => {
    expect(busUT(35, 20)).toBeCloseTo(35, 9);
    const t = TOR[0][0];
    expect(torRegion(t, t.rIn)).toBe('hole');
    expect(torRegion(t, t.rIn + 1)).toBe('winding');
    expect(torRegion(t, t.rOut)).toBe('outside');
    expect(torMT(t, 2)).toBe(0);
    expect(torMT(t, 60)).toBe(0);
    expect(solTurnsPerM(SOL[1][0], 80)).toBe(2500);
  });
});

describe('rounds and judging', () => {
  it('each level builds three rounds of its kind, the aid fades 0, 1, 2, and each round comes from its own pool', () => {
    const kinds = ['bus', 'col', 'xpt', 'sol', 'tor'] as const;
    const pools = [BUS, COL, XPT, SOL, TOR] as unknown as Record<string, unknown>[][][];
    for (const seed of SEEDS) {
      for (let lv = 1; lv <= 5; lv++) {
        const rs = buildRounds(lv as 1 | 2 | 3 | 4 | 5, lcg(seed));
        expect(rs.map((r) => r.kind)).toEqual([kinds[lv - 1], kinds[lv - 1], kinds[lv - 1]]);
        expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
        rs.forEach((r, k) => {
          const { kind: _k, assist: _a, ...row } = r as unknown as Record<string, unknown>;
          expect(pools[lv - 1][k].some((p) => JSON.stringify(p) === JSON.stringify(row))).toBe(true);
        });
        const ans = rs.map((r) => (r.kind === 'bus' ? `${r.side}/${r.r}` : r.kind === 'col' ? `${r.rin}/${r.rout}` : r.kind === 'xpt' ? r.x : r.kind === 'sol' ? r.L : r.r));
        expect(new Set(ans).size).toBe(3);
      }
    }
  });

  it('exactly one setting wins every row, and the start never does', () => {
    for (const row of BUS.flat()) {
      const r = round('bus', row);
      const wins: string[] = [];
      for (const side of range(0, 3)) for (const d of range(DIAL.r.min, DIAL.r.max, DIAL.r.step)) if (judge(r, { side, r: d })) wins.push(`${side}/${d}`);
      expect(wins).toEqual([`${row.side}/${row.r}`]);
      expect(judge(r, { side: DIAL.side.start, r: DIAL.r.start })).toBe(false);
    }
    for (const row of COL.flat()) {
      const r = round('col', row);
      const wins: string[] = [];
      for (const rin of range(1, row.a - 1)) for (const rout of range(row.a + 1, 3 * row.a)) if (judge(r, { rin, rout })) wins.push(`${rin}/${rout}`);
      expect(wins).toEqual([`${row.rin}/${row.rout}`]);
      expect(judge(r, { rin: 1, rout: row.a + 1 })).toBe(false);
    }
    for (const row of XPT.flat()) {
      const r = round('xpt', row);
      expect(range(DIAL.x.min, DIAL.x.max, DIAL.x.step).filter((x) => judge(r, { x }))).toEqual([row.x]);
      expect(judge(r, { x: DIAL.x.start })).toBe(false);
    }
    for (const row of SOL.flat()) {
      const r = round('sol', row);
      expect(range(DIAL.L.min, DIAL.L.max, DIAL.L.step).filter((L) => judge(r, { L }))).toEqual([row.L]);
      expect(judge(r, { L: DIAL.L.start })).toBe(false);
    }
    for (const row of TOR.flat()) {
      const r = round('tor', row);
      expect(range(DIAL.tr.min, DIAL.tr.max).filter((d) => judge(r, { r: d }))).toEqual([row.r]);
      expect(judge(r, { r: DIAL.tr.start })).toBe(false);
    }
  });

  it('the faults point the right way', () => {
    for (const row of BUS.flat()) {
      const r = round('bus', row);
      for (const side of range(0, 3).filter((s) => s !== row.side)) expect(fault(r, { side, r: row.r })).toBe('wrong');
      expect(fault(r, { side: row.side, r: row.r + 5 })).toBe('weak');
      expect(fault(r, { side: row.side, r: row.r - 5 })).toBe('strong');
    }
    for (const row of COL.flat()) {
      const r = round('col', row);
      expect(fault(r, { rin: row.rin + 1, rout: row.rout })).toBe('inHigh');
      expect(fault(r, { rin: row.rin - 1, rout: row.rout })).toBe('inLow');
      expect(fault(r, { rin: row.rin, rout: row.rout + 1 })).toBe('outLow');
      expect(fault(r, { rin: row.rin, rout: row.rout - 1 })).toBe('outHigh');
    }
    for (const row of XPT.flat()) {
      expect(fault(round('xpt', row), { x: row.x - 2 })).toBe('near');
      expect(fault(round('xpt', row), { x: row.x + 2 })).toBe('far');
    }
    for (const row of SOL.flat()) {
      expect(fault(round('sol', row), { L: row.L - 5 })).toBe('quench');
      expect(fault(round('sol', row), { L: row.L + 5 })).toBe('dim');
    }
    for (const row of TOR.flat()) {
      const r = round('tor', row);
      expect(fault(r, { r: 2 })).toBe('zero');
      expect(fault(r, { r: 60 })).toBe('zero');
      expect(fault(r, { r: row.r + 1 })).toBe('weak');
      expect(fault(r, { r: row.r - 1 })).toBe('strong');
    }
  });
});

describe('words', () => {
  /** Every wrong setting of a round, with the token of the answer that its text must not contain. */
  const wrongs = (r: Round): { v: Values; tokens: string[] }[] => {
    if (r.kind === 'bus') return range(0, 3).flatMap((side) => range(5, 100, 5).map((d) => ({ side, d }))).filter(({ side, d }) => !(side === r.side && d === r.r)).map(({ side, d }) => ({ v: { side, r: d }, tokens: [`${r.r} cm`] }));
    if (r.kind === 'col') return [{ v: { rin: r.rin + 1, rout: r.rout }, tokens: [`${r.rout} cm`] }, { v: { rin: r.rin - 1, rout: r.rout }, tokens: [`${r.rout} cm`] }, { v: { rin: r.rin, rout: r.rout + 1 }, tokens: [`${r.rin} cm`] }, { v: { rin: r.rin, rout: r.rout - 1 }, tokens: [`${r.rin} cm`] }, { v: { rin: 1, rout: r.a + 1 }, tokens: [`${r.rin} cm`, `${r.rout} cm`] }];
    if (r.kind === 'xpt') return range(2, 98, 2).filter((x) => x !== r.x).map((x) => ({ v: { x }, tokens: [`${r.x} cm`] }));
    if (r.kind === 'sol') return range(20, 150, 5).filter((L) => L !== r.L).map((L) => ({ v: { L }, tokens: [`${r.L} cm`] }));
    return range(2, 60).filter((d) => d !== r.r).map((d) => ({ v: { r: d }, tokens: [`${r.r} cm`] }));
  };
  const rows: Round[] = [
    ...BUS.flat().map((x) => round('bus', x)), ...COL.flat().map((x) => round('col', x)), ...XPT.flat().map((x) => round('xpt', x)), ...SOL.flat().map((x) => round('sol', x)), ...TOR.flat().map((x) => round('tor', x)),
  ];

  it('a miss text never contains the answer unless it is the player’s own value, always says what to change, and never tells the field’s direction', () => {
    for (const r of rows) {
      for (const { v, tokens } of wrongs(r)) {
        const text = missText(r, v);
        const own = [v.r, v.rin, v.rout, v.x, v.L].filter((n) => n !== undefined).map((n) => `${n} cm`);
        for (const t of tokens) if (!own.includes(t)) expect(has(text, t), `${r.kind}: ${text}`).toBe(false);
        expect(text).toMatch(/(Move|Make|Use|The null lies) /);
        if (fault(r, v) === 'wrong') for (const a of Object.values(ARROW)) expect(text).not.toContain(a);
      }
    }
  });

  it('the goal fits on a line, the hint fades with the round, and the intel states the givens', () => {
    for (const r of rows) {
      expect(goal(r).length).toBeLessThanOrEqual(40);
      expect(intel(r).length).toBeGreaterThan(40);
    }
    const r = rows[0];
    expect(hintText({ ...r, assist: 0 })).toMatch(/Round 1: the probe readout is live\.$/);
    expect(hintText({ ...r, assist: 1 })).toMatch(/a probe check costs a charge\.$/);
    expect(hintText({ ...r, assist: 2 })).toMatch(/Last shot: no readout\.$/);
  });

  it('a win teaches the law of its level, in at most three sentences', () => {
    const must: Record<Round['kind'], string> = { bus: 'μ₀I/2πr', col: 'r²/a²', xpt: 'I₁', sol: 'μ₀nI', tor: 'B = 0' };
    for (const r of rows) {
      const w = winText(r);
      expect(w).toContain(must[r.kind]);
      expect(w.split(/[.!] /).length).toBeLessThanOrEqual(3);
    }
  });

  it('the probe check and the readout agree, and the readout is only ever the player’s own setting', () => {
    for (const r of rows) {
      const v: Values = { side: 1, r: 30, rin: 3, rout: 40, x: 20, L: 60 };
      expect(meterText(r, v)).toMatch(/^Probe check: /);
      expect(lcdText(r, v)).not.toBe(LCD_OFF);
    }
    const b = BUS[0][0];
    expect(lcdText(round('bus', b), { side: 0, r: 20 })).toBe(`35 µT ${ARROW.up}`);
    expect(DIRS.length).toBe(4);
  });
});
