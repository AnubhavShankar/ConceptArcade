import { describe, expect, it } from 'vitest';
import { fmt } from '@core/judge';
import {
  A0, DELAY, DIAL, HANDLE_R, HBAR, HIT, MISS_LOOK, REVEAL, TRAP, TWIN, ZOOM, V1,
  answer, buildRounds, goal, helperLabel, hintText, aidLine, judge, missText, outcome, period, radius, ringA, sci, speed, sup, testText, waves, winText,
  type Round, type Values,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
};
const seeds = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);
const range = (lo: number, hi: number, step = 1) => Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
const frac = (x: number) => x - Math.floor(x);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const T1 = period(1);

const trapRows: Round[] = TRAP.flat().map((row) => ({ kind: 'trap', assist: 0, ...row }));
const twinRows: Round[] = TWIN.flat().map((row) => ({ kind: 'twin', assist: 0, ...row }));
const zoomRows: Round[] = ZOOM.flat().map((row) => ({ kind: 'zoom', assist: 0, ...row }));
const ringRows: Round[] = [2, 3, 4, 5].map((n) => ({ kind: 'ring', n, say: 'level', assist: 0 }));
const allRows = [...ringRows, ...trapRows, ...twinRows, ...zoomRows];
/** Every value the player can set for a round. */
const reach = (r: Round): Values[] =>
  r.kind === 'ring' ? range(1, 30).map((k) => ({ k })) : r.kind === 'zoom' ? range(0, 90).map((z) => ({ z })) : range(0, 345, 15).map((deg) => ({ deg }));
const startOf = (r: Round): Values => (r.kind === 'ring' ? { k: DIAL.k.start } : r.kind === 'zoom' ? { z: DIAL.z.start } : { deg: DIAL.deg.start });
const ansOf = (r: Round): Values => (r.kind === 'ring' ? { k: answer(r) } : r.kind === 'zoom' ? { z: answer(r) } : { deg: answer(r) });
const same = (a: Values, b: Values) => a.k === b.k && a.deg === b.deg && a.z === b.z;

describe('the numbers from the textbook', () => {
  it('Ex 12.7 and Example 12.3: r₂ = 2.12 Å, r₃ = 4.77 Å, and the ring dial gives 9 steps of a₀ = 4.77 Å', () => {
    expect(radius(1)).toBe(A0);
    expect(radius(2).toFixed(2)).toBe('2.12');
    expect(radius(3).toFixed(2)).toBe('4.77');
    expect(ringA(9).toFixed(2)).toBe('4.77');
    expect(ringA(4).toFixed(2)).toBe('2.12');
  });
  it('Ex 12.6: speeds and periods for n = 1, 2, 3, and T ∝ n³', () => {
    [2.18e6, 1.09e6, 7.27e5].forEach((v, i) => expect(rel(speed(i + 1), v)).toBeLessThan(0.01));
    [1.52e-16, 1.22e-15, 4.11e-15].forEach((p, i) => expect(rel(period(i + 1), p)).toBeLessThan(0.01));
    expect(period(3) / period(1)).toBeCloseTo(27, 9);
    for (const n of [1, 2, 3, 4, 5]) expect(rel(period(n), (2 * Math.PI * radius(n) * 1e-10) / speed(n))).toBeLessThan(1e-12);
    expect(V1).toBe(2.19e6);
  });
  it('Ex 12.9: the Earth’s quantum number is about 2.6 × 10⁷⁴', () => {
    expect(rel((6e24 * 3e4 * 1.5e11) / HBAR, 2.6e74)).toBeLessThan(0.02);
  });
  it('the matter waves round a ring: √k, whole only at 1, 4, 9, 16, 25', () => {
    for (let n = 1; n <= 5; n++) expect(waves(n * n)).toBe(n);
    const whole = range(1, 30).filter((k) => Number.isInteger(waves(k)));
    expect(whole).toEqual([1, 4, 9, 16, 25]);
  });
  it('sci and sup write the book’s style', () => {
    expect(sci(0.16)).toBe('0.16');
    expect(sci(2.0)).toBe('2.0');
    expect(sci(0.5)).toBe('0.50');
    expect(sci(3.0e3)).toBe('3.0 × 10³');
    expect(sci(6.0e24)).toBe('6.0 × 10²⁴');
    expect(sci(1.0e26)).toBe('1.0 × 10²⁶');
    expect(sup(74)).toBe('⁷⁴');
    expect(sup(-15)).toBe('⁻¹⁵');
  });
});

describe('the pools', () => {
  it('level 2 rows: the stored time is the lap fraction and solves back to the angle for the usual constants', () => {
    for (const row of TRAP.flat()) {
      const T = period(row.n);
      expect(Math.abs(row.dt / T - (row.laps + row.deg / 360)), JSON.stringify(row)).toBeLessThan(0.006);
      expect(Math.floor(row.dt / T)).toBe(row.laps);
      expect((Math.round(((frac(row.dt / T) * 360) / 15)) * 15) % 360).toBe(row.deg);
      expect(Number(row.dt.toPrecision(3))).toBe(row.dt);
      const periods = [1.52e-16 * row.n ** 3];
      for (const a of [0.529, 0.53]) for (const v of [2.18, 2.19, 2.2]) periods.push((2 * Math.PI * a * 1e-10 * row.n ** 2) / ((v * 1e6) / row.n));
      for (const Tn of periods) {
        let d = Math.abs(frac(row.dt / Tn) * 360 - row.deg);
        d = Math.min(d, 360 - d);
        expect(d, JSON.stringify(row)).toBeLessThan(5);
      }
    }
  });
  it('level 3 rows: B’s lap fraction is exact and A is the lower level', () => {
    for (const row of TWIN.flat()) {
      expect(Math.abs(frac(row.k * (row.na / row.nb) ** 3) * 360 - row.deg), JSON.stringify(row)).toBeLessThan(1e-6);
      expect(row.na).toBeLessThan(row.nb);
    }
  });
  it('level 4 rows: b = floor(log₁₀(mvr/ħ)) for the usual ħ, mantissa 1.3 to 8, and the data reads back through sci', () => {
    for (const row of ZOOM.flat()) {
      const mvr = row.m * row.v * row.r;
      for (const hbar of [HBAR, 1.05e-34, 1.0546e-34, 6.6e-34 / (2 * Math.PI), 6.63e-34 / (2 * Math.PI)]) expect(Math.floor(Math.log10(mvr / hbar)), row.id).toBe(row.b);
      const mant = mvr / HBAR / 10 ** row.b;
      expect(mant, row.id).toBeGreaterThan(1.3);
      expect(mant, row.id).toBeLessThan(8);
      const back = (x: number) => Number(sci(x).replace(' × 10', 'e').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/, (m) => String([...m].map((c) => (c === '⁻' ? '-' : '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c))).join(''))));
      for (const x of [row.m, row.v, row.r]) expect(rel(back(x), x), `${row.id} ${x}`).toBeLessThan(1e-9);
    }
  });
  it('every answer is inside its dial and is not the start; level 2 and 3 answers are multiples of 15 from 30 to 330', () => {
    for (const row of allRows) {
      const a = answer(row);
      if (row.kind === 'ring') expect([a > DIAL.k.min, a < DIAL.k.max]).toEqual([true, true]);
      else if (row.kind === 'zoom') expect([a > DIAL.z.min, a < DIAL.z.max]).toEqual([true, true]);
      else {
        expect(a % 15).toBe(0);
        expect(a).toBeGreaterThanOrEqual(30);
        expect(a).toBeLessThanOrEqual(330);
      }
      expect(judge(row, startOf(row)), JSON.stringify(row)).toBe(false);
    }
  });
  it('the three pools of a level share no answer', () => {
    for (const pools of [TRAP, TWIN, ZOOM] as { deg?: number; b?: number }[][][]) {
      const sets = pools.map((p) => new Set(p.map((row) => row.deg ?? row.b)));
      for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) for (const a of sets[i]) expect(sets[j].has(a)).toBe(false);
    }
    expect([...new Set(TRAP[0].map((r) => r.deg))].sort((a, b) => a - b)).toEqual([90, 120, 180, 270]);
    expect([...new Set(ZOOM[2].map((r) => r.b))].sort((a, b) => a - b)).toEqual([73, 74, 76, 77]);
  });
});

describe('one winner per round', () => {
  it('exactly one reachable setting passes the judge, it is the answer, and the start fails', () => {
    for (const row of allRows) {
      const wins = reach(row).filter((x) => judge(row, x));
      expect(wins.length, JSON.stringify(row)).toBe(1);
      expect(same(wins[0], ansOf(row))).toBe(true);
    }
  });
  it('level 4: 1 ≤ n/10ᶻ < 10 holds for exactly one zoom, and it is b', () => {
    for (const row of zoomRows) {
      if (row.kind !== 'zoom') continue;
      const n = (row.m * row.v * row.r) / HBAR;
      const ok = range(0, 90).filter((z) => n / 10 ** z >= 1 && n / 10 ** z < 10);
      expect(ok).toEqual([row.b]);
    }
  });
});

describe('rounds', () => {
  it('every level has three rounds of its kind with assist 0, 1, 2 and three different answers', () => {
    for (const level of [1, 2, 3, 4] as const) {
      const kind = ['ring', 'trap', 'twin', 'zoom'][level - 1];
      for (const seed of seeds) {
        const rs = buildRounds(level, lcg(seed));
        expect(rs.map((r) => r.kind)).toEqual([kind, kind, kind]);
        expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
        expect(new Set(rs.map(answer)).size).toBe(3);
      }
    }
  });
  it('level 1: three different levels, increasing, from 2 to 5, stated level, excited state, waves', () => {
    for (const seed of seeds) {
      const rs = buildRounds(1, lcg(seed));
      const ns = rs.map((r) => (r.kind === 'ring' ? r.n : 0));
      expect(new Set(ns).size).toBe(3);
      expect([...ns].sort((a, b) => a - b)).toEqual(ns);
      for (const n of ns) expect(n >= 2 && n <= 5).toBe(true);
      expect(rs.map((r) => (r.kind === 'ring' ? r.say : ''))).toEqual(['level', 'excited', 'waves']);
    }
  });
  it('levels 2 to 4: round k’s row comes from pool k, and each slot varies over the seeds', () => {
    for (const level of [2, 3, 4] as const) {
      const pools = [TRAP, TWIN, ZOOM][level - 2] as unknown as Record<string, unknown>[][];
      const seen = [new Set<number>(), new Set<number>(), new Set<number>()];
      for (const seed of seeds) {
        buildRounds(level, lcg(seed)).forEach((r, k) => {
          const rr = r as unknown as Record<string, unknown>;
          expect(pools[k].some((row) => Object.keys(row).every((key) => row[key] === rr[key]))).toBe(true);
          seen[k].add(answer(r));
        });
      }
      for (const s of seen) expect(s.size).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('classic mistakes fail', () => {
  it('level 1: k = n (n times a₀) never wins', () => {
    for (const row of ringRows) if (row.kind === 'ring') expect(judge(row, { k: row.n })).toBe(false);
  });
  it('level 2: "speed grows with n" and "period grows as n²" give other angles', () => {
    for (const row of TRAP.flat()) {
      if (row.n === 1) continue;
      for (const T of [T1 * row.n, T1 * row.n ** 2]) {
        const snapped = (Math.round((frac(row.dt / T) * 360) / 15) * 15) % 360;
        expect(snapped, JSON.stringify(row)).not.toBe(row.deg);
      }
    }
  });
  it('level 3: using n² instead of n³ gives another angle', () => {
    for (const row of TWIN.flat()) {
      const snapped = (Math.round((frac(row.k * (row.na / row.nb) ** 2) * 360) / 15) * 15) % 360;
      expect(snapped, JSON.stringify(row)).not.toBe(row.deg);
    }
  });
  it('level 4: forgetting ħ, or using h instead of ħ, gives another exponent', () => {
    for (const row of ZOOM.flat()) {
      const mvr = row.m * row.v * row.r;
      expect(Math.floor(Math.log10(mvr))).not.toBe(row.b);
      expect(Math.floor(Math.log10(mvr / 6.6e-34))).not.toBe(row.b);
    }
  });
});

describe('outcomes', () => {
  it('win only at the answer, and the side of a miss follows the dial', () => {
    for (const row of allRows) {
      const a = answer(row);
      for (const x of reach(row)) {
        const v = row.kind === 'ring' ? x.k! : row.kind === 'zoom' ? x.z! : x.deg!;
        const o = outcome(row, x);
        expect(o === 'win', JSON.stringify(row)).toBe(v === a);
        if (v === a) continue;
        if (row.kind === 'ring') expect(o).toBe(v > a ? 'wide' : 'narrow');
        else if (row.kind === 'zoom') expect(o).toBe(v < a ? 'many' : 'few');
        else expect(o).toBe(v < a ? 'passed' : 'early');
      }
    }
  });
});

describe('words', () => {
  const token = (r: Round) => (r.kind === 'ring' ? `${ringA(answer(r)).toFixed(2)} Å` : r.kind === 'zoom' ? `×10${sup(answer(r))}` : `${answer(r)}°`);
  const own = (r: Round, x: Values) => (r.kind === 'ring' ? `${ringA(x.k!).toFixed(2)} Å` : r.kind === 'zoom' ? `×10${sup(x.z!)}` : `${x.deg}°`);
  const DIRECTION: Record<string, RegExp> = { wide: /closer in/, narrow: /farther out/, passed: /already gone past/, early: /not reached/, many: /too many waves/, few: /less than one wave/ };
  it('a miss text never holds the answer, always holds the player’s own value, and gives the direction', () => {
    for (const row of allRows) {
      for (const x of reach(row)) {
        const o = outcome(row, x);
        if (o === 'win') continue;
        const m = missText(row, x);
        expect(has(m, token(row)), `${JSON.stringify(row)} ${m}`).toBe(false);
        expect(m).toContain(own(row, x));
        expect(m).toMatch(DIRECTION[o]);
      }
    }
  });
  it('a win text carries the working', () => {
    expect(winText(ringRows[0])).toContain('rₙ = n²a₀');
    expect(winText(trapRows[0])).toContain('T = 2πr/v');
    expect(winText(twinRows[0])).toContain('T ∝ n³');
    expect(winText(zoomRows[0])).toContain('n = mvr/ħ');
    for (const r of [ringRows[0], trapRows[0], twinRows[0]]) expect(winText(r)).toMatch(/^Got it!/);
    expect(winText(zoomRows[0])).toMatch(/^Counted!/);
  });
  it('the goal fits in 58 characters and the hint ends with the round’s helper line', () => {
    const rings = ([2, 3, 4, 5] as const).flatMap((n) => (['level', 'excited', 'waves'] as const).map((say): Round => ({ kind: 'ring', n, say, assist: 0 })));
    for (const row of [...rings, ...trapRows, ...twinRows, ...zoomRows]) expect(goal(row).length, goal(row)).toBeLessThanOrEqual(58);
    for (const level of [1, 2, 3, 4] as const) {
      for (const r of buildRounds(level, lcg(7))) {
        expect(hintText(r).endsWith(aidLine(r))).toBe(true);
        expect(goal(r)).toBeTruthy();
      }
    }
    const [a, b, c] = buildRounds(2, lcg(3));
    expect(hintText(a)).toMatch(/lap meter is live/);
    expect(hintText(b)).toMatch(/helper is off/);
    expect(hintText(c)).toMatch(/no helper and no test flash/);
  });
  it('the helper label describes the player’s own setting', () => {
    for (const row of TRAP[0].map((t): Round => ({ kind: 'trap', assist: 0, ...t }))) {
      if (row.kind !== 'trap') continue;
      expect(row.laps).toBe(0);
      for (const deg of range(0, 345, 15)) expect(helperLabel(row, { deg }).includes(fmt(row.dt)), `${row.n} ${deg}`).toBe(deg === row.deg);
    }
    for (const row of TWIN[0].map((t): Round => ({ kind: 'twin', assist: 0, ...t }))) {
      if (row.kind !== 'twin') continue;
      expect(helperLabel(row, { deg: row.deg })).toContain(fmt((row.deg / 360) * (row.nb / row.na) ** 3));
      expect(fmt((row.deg / 360) * (row.nb / row.na) ** 3)).toBe(String(row.k));
    }
    for (const row of ringRows) if (row.kind === 'ring') expect(helperLabel(row, { k: row.n * row.n })).toBe(`${row.n} waves: fits ✓`);
    expect(helperLabel(ringRows[0], { k: 6 })).toMatch(/no fit ✗/);
    expect(helperLabel(zoomRows[0], { z: 3 })).toBe('live view');
  });
  it('the test flash reads out facts about the player’s setting', () => {
    expect(testText(ringRows[1], { k: 6 })).toMatch(/^Test flash: a ring of 3\.18 Å would hold 2\.45 matter waves/);
    expect(testText(trapRows[0], { deg: 0 })).toMatch(/^Test flash/);
    expect(testText(twinRows[0], { deg: 0 })).toMatch(/^Test flash/);
    expect(testText(zoomRows[0], { z: 0 })).toMatch(/^Test flash: mvr = /);
  });
  it('the fixed constants of the leak rules', () => {
    expect(MISS_LOOK).toEqual({ streakOffset: 12, streakDeg: 40, trailDeg: 35, blurLines: 40, fewWaves: 0.3 });
    expect(HIT).toEqual([400, 52]);
    expect(HANDLE_R).toBeGreaterThanOrEqual(18);
    for (const kind of ['ring', 'trap', 'twin', 'zoom'] as const) {
      expect(REVEAL[kind]).toBeLessThan(DELAY[kind]);
      expect(DELAY[kind]).toBeLessThan(1.2);
    }
  });
});
