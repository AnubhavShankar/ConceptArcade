import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { area, arcHeight, buildRounds, CURVES, edgeText, explain, height, hitPoint, intel, judge, missText, needText, pastFence, ROUND_DIAL_MAX, roundArea, show, signed, spotText, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/** Composite Simpson rule on |f| between lo and hi. */
const integral = (f: (x: number) => number, lo: number, hi: number, n = 2000) => {
  const h = (hi - lo) / n;
  let s = f(lo) + f(hi);
  for (let i = 1; i < n; i++) s += f(lo + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
};
/** The edge of the painted stretch for setting v, and where it starts. */
const bounds = (r: Round, v: number): [number, number] => (r.kind === 'sine' ? [0, (v * Math.PI) / 2] : r.kind === 'cubic' ? [-r.p[1], v] : [0, v]);

describe('the area formulas are right', () => {
  it('textbook anchors: the ellipse x²/9 + y²/4 = 1 has area 6π; one arch of sin x has area 2; the line y = 2x − 4 on [0, 4] has area 8', () => {
    const e: Round = { kind: 'ellipse', p: [3], T: 6, ans: 2, min: 0, max: 8, start: 0, assist: 0 };
    expect(area(e, 2)).toBe(6);
    const s: Round = { kind: 'sine', p: [1], T: 2, ans: 4, min: 0, max: 8, start: 0, assist: 0 };
    expect(area(s, 4)).toBe(4);
    const l: Round = { kind: 'line', p: [2, 2], T: 8, ans: 4, min: 0, max: 9, start: 0, assist: 0 };
    expect(area(l, 4)).toBe(8);
  });
  it('the closed forms match numerical integration of |f| (and of f for the signed value)', () => {
    for (const level of [2, 3, 4]) {
      for (const r of all(level).slice(0, 60)) {
        for (const v of span(r.min, r.max)) {
          const [lo, hi] = bounds(r, v);
          if (hi === lo) continue;
          expect(integral((x) => Math.abs(height(r, x)), lo, hi, 4000)).toBeCloseTo(area(r, v), 2);
          expect(integral((x) => height(r, x), lo, hi)).toBeCloseTo(signed(r, v), 3);
        }
      }
    }
  });
  it('the ellipse area is π a b: numerical integration of 4b√(1 − x²/a²)', () => {
    for (const r of all(1).slice(0, 30)) {
      const a = r.p[0];
      const b = r.ans;
      expect(integral((x) => 2 * b * Math.sqrt(Math.max(0, 1 - (x * x) / (a * a))), -a, a, 20000)).toBeCloseTo(Math.PI * a * b, 2);
    }
  });
});

describe('every round has exactly one winning setting', () => {
  it('only the answer wins, the amounts are whole numbers, area grows with the roller, and the start never wins', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) {
        expect(span(r.min, r.max).filter((v) => judge(r, v))).toEqual([r.ans]);
        expect(judge(r, r.start)).toBe(false);
        for (const v of span(r.min, r.max)) expect(Number.isInteger(area(r, v))).toBe(true);
        for (const v of span(r.min + 1, r.max)) expect(area(r, v)).toBeGreaterThan(area(r, v - 1));
      }
    }
  });
  it('the signed integral is a real trap: it differs from the area where the turf dips below the axis', () => {
    for (const level of [2, 3, 4]) {
      for (const r of all(level)) expect(signed(r, r.ans)).not.toBe(area(r, r.ans));
    }
  });
  it('helpers fade', () => {
    for (const level of [1, 2, 3, 4]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
});

describe('words', () => {
  it('misses state what was painted and which way; a signed-integral slip is named', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 40)) {
        const wrong = r.ans === r.max ? r.ans - 1 : r.ans + 1;
        expect(missText(r, wrong)).toMatch(/bare patches|spilled/);
        expect(spotText(r, wrong)).toMatch(/Ink gauge/);
        expect(explain(r).length).toBeGreaterThan(40);
        expect(intel(r)).toMatch(/needs exactly/);
      }
    }
    // A round where the player's setting makes the signed integral equal the need gets the slip named.
    const r: Round = { kind: 'line', p: [2, 2], T: 12, ans: 4, min: 0, max: 9, start: 0, assist: 0 };
    expect(signed(r, 6)).toBe(12);
    expect(missText(r, 6)).toMatch(/below the axis as negative/);
  });
  it('rounds in a level differ', () => {
    for (const s of seeds) for (const level of [1, 2, 3, 4]) {
      const rs = buildRounds(level, createRng(s));
      expect(new Set(rs.map((r) => r.p.join() + r.ans)).size).toBe(3);
    }
  });
});

// ---- Levels 5 (sideways turf) and 6 (round turf) ----
const SLIP = ' You counted the stretch below the axis as negative paint: it is still turf, so it adds to the area.';
const seeds80 = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const all80 = (level: number) => seeds80.flatMap((s) => buildRounds(level, createRng(s)));
/** A target written as a plain number or a fraction, as a number. */
const plain = (t: string) => (t.includes('/') ? Number(t.split('/')[0]) / Number(t.split('/')[1]) : Number(t));
/** The level 6 targets as written, recomputed independently with the constants spelled out. */
const ROUND_TARGETS: Record<string, number> = {
  '4π': 4 * Math.PI,
  '9π': 9 * Math.PI,
  '2√3 + 4π/3': 2 * Math.sqrt(3) + (4 * Math.PI) / 3,
  '9√3/2 + 3π': (9 * Math.sqrt(3)) / 2 + 3 * Math.PI,
  '8√3 + 16π/3': 8 * Math.sqrt(3) + (16 * Math.PI) / 3,
  '25√3/2 + 25π/3': (25 * Math.sqrt(3)) / 2 + (25 * Math.PI) / 3,
  '16π': 16 * Math.PI,
  '25π': 25 * Math.PI,
};

describe('level 5, sideways turf: the area is the integral of g(y) dy', () => {
  it('every curve is positive on (0, 6) and Simpson’s rule on g matches the closed area for every v', () => {
    for (const c of CURVES) {
      for (let y = 0.05; y < 6; y += 0.05) expect(c.g(y)).toBeGreaterThan(0);
      for (const v of span(1, 6)) {
        expect(integral(c.g, 0, v, 4000)).toBeCloseTo(c.area(v), 3);
        expect(c.area(v)).toBeGreaterThan(c.area(v - 1));
      }
    }
  });
  it('the table of the brief: every row appears, with the stated winning v and target', () => {
    const rows = new Map<string, Round>();
    for (const r of all80(5)) rows.set(`${r.p[0]}:${r.ans}:${r.text}`, r);
    const expected = ['0:3:27', '0:4:64', '1:4:12', '1:3:15/2', '2:2:16', '2:3:81', '3:3:9/4', '4:3:18', '5:4:32/3', '6:3:6'];
    expect([...rows.keys()].sort()).toEqual([...expected].sort());
    for (const r of rows.values()) {
      expect(r.T).toBeCloseTo(plain(r.text!), 9);
      // the target is the numerical area up to the winning v
      expect(integral(CURVES[r.p[0]].g, 0, r.ans, 4000)).toBeCloseTo(r.T, 3);
    }
    // anchors from the textbook (Ex 8.1 Q4): x = y²/4 up to y = 3 has area 9/4; x = 2√y up to y = 4 has area 32/3
    expect(CURVES[3].area(3)).toBe(2.25);
    expect(CURVES[5].area(4)).toBeCloseTo(32 / 3, 12);
  });
  it('each round draws from its own pool, with dial 1 to 6', () => {
    const pools = [new Set(['0:3', '0:4', '1:4', '1:3', '2:2', '2:3']), new Set(['3:3', '4:3']), new Set(['5:4', '6:3'])];
    for (const s of seeds80) {
      const rs = buildRounds(5, createRng(s));
      expect(rs).toHaveLength(3);
      rs.forEach((r, i) => {
        expect(r.kind).toBe('sideways');
        expect(pools[i].has(`${r.p[0]}:${r.ans}`)).toBe(true);
        expect([r.min, r.max]).toEqual([1, 6]);
      });
    }
  });
});

describe('level 6, round turf: ∫ √(a² − x²) dx', () => {
  it('the closed form matches Simpson’s rule for every a and every q, and grows with q', () => {
    for (const a of [4, 6, 8, 10]) {
      for (const q of span(1, a)) {
        expect(integral((x) => arcHeight(a, x), 0, q, 8000)).toBeCloseTo(roundArea(a, q), 2);
        expect(roundArea(a, q)).toBeGreaterThan(roundArea(a, q - 1));
      }
    }
    // a quarter circle is πa²/4; a = 6 with q = 3 is (9√3)/2 + 3π
    expect(roundArea(6, 6)).toBeCloseTo((Math.PI * 36) / 4, 12);
    expect(roundArea(6, 3)).toBeCloseTo(ROUND_TARGETS['9√3/2 + 3π'], 12);
  });
  it('the table of the brief: every row appears, and its written target equals the area at the winning q', () => {
    const rows = new Map<string, Round>();
    for (const r of all80(6)) rows.set(`${r.p[0]}:${r.ans}:${r.text}`, r);
    const expected = ['4:4:4π', '6:6:9π', '4:2:2√3 + 4π/3', '6:3:9√3/2 + 3π', '8:8:16π', '8:4:8√3 + 16π/3', '10:5:25√3/2 + 25π/3', '10:10:25π'];
    expect([...rows.keys()].sort()).toEqual([...expected].sort());
    for (const r of rows.values()) {
      expect(r.T).toBeCloseTo(ROUND_TARGETS[r.text!], 9);
      expect(integral((x) => arcHeight(r.p[0], x), 0, r.ans, 8000)).toBeCloseTo(r.T, 2);
      // the explain angle is π/2 at q = a and π/6 at q = a/2: the only two cases there are
      expect(r.ans === r.p[0] || 2 * r.ans === r.p[0]).toBe(true);
    }
  });
  it('each round draws from its own mixed pool, never repeats a row, and the valid range is 1 to the end of the fence', () => {
    const pools = [new Set(['4:4', '6:6', '4:2']), new Set(['6:3', '8:8', '4:2']), new Set(['8:4', '10:5', '10:10'])];
    for (const s of seeds80) {
      const rs = buildRounds(6, createRng(s));
      expect(rs).toHaveLength(3);
      expect(new Set(rs.map((r) => `${r.p[0]}:${r.ans}`)).size).toBe(3);
      rs.forEach((r, i) => {
        expect(r.kind).toBe('round');
        expect(pools[i].has(`${r.p[0]}:${r.ans}`)).toBe(true);
        expect([r.min, r.max]).toEqual([1, r.p[0]]);
      });
    }
  });
  it('position alone never wins: the answer is the end of the fence in some rounds and not in others, and the quarter circles are πa²/4', () => {
    const atEnd = all80(6).map((r) => r.ans === r.p[0]);
    expect(atEnd).toContain(true);
    expect(atEnd).toContain(false);
    for (let i = 0; i < 3; i++) expect(seeds80.map((s) => buildRounds(6, createRng(s))[i].ans === buildRounds(6, createRng(s))[i].p[0])).toContain(false);
    expect(roundArea(8, 8)).toBeCloseTo(16 * Math.PI, 12);
    expect(roundArea(10, 10)).toBeCloseTo(25 * Math.PI, 12);
  });
  it('an edge past the end of the fence (q > a, up to the dial maximum of 10) is invalid and never wins', () => {
    expect(ROUND_DIAL_MAX).toBe(10);
    for (const r of all80(6)) {
      for (const q of span(r.p[0] + 1, ROUND_DIAL_MAX)) {
        expect(pastFence(r, q)).toBe(true);
        expect(judge(r, q)).toBe(false);
      }
      for (const q of span(1, r.p[0])) expect(pastFence(r, q)).toBe(false);
    }
  });
});

describe('levels 5 and 6: only the answer wins, and a miss never gives the answer away', () => {
  it('scanning every dial value finds exactly one winner; the start never wins; area is strictly increasing', () => {
    for (const level of [5, 6]) {
      for (const r of all80(level)) {
        expect(span(r.min, r.max).filter((v) => judge(r, v))).toEqual([r.ans]);
        expect(judge(r, r.start)).toBe(false);
        expect(r.start).toBe(r.min);
        for (const v of span(r.min + 1, r.max)) expect(area(r, v)).toBeGreaterThan(area(r, v - 1));
        // a setting one off, on either side, loses
        for (const v of [r.ans - 1, r.ans + 1].filter((x) => x >= r.min && x <= r.max)) expect(judge(r, v)).toBe(false);
      }
    }
  });
  it('helpers fade', () => {
    for (const level of [5, 6]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
  it('in every level a miss names the player’s own edge and the direction, and nothing else: no amount, no target, no winning setting', () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      for (const r of all80(level)) {
        for (const v of span(r.min, r.max).filter((x) => x !== r.ans)) {
          const m = missText(r, v).replace(SLIP, '');
          expect(m).toBe(`With ${edgeText(r, v)}, ${v < r.ans ? 'bare patches are left' : 'paint spilled onto the rival’s turf'}.`);
          // the player's own edge may share a digit with the target (y = 6, target 6), so look at the rest of the sentence
          const rest = m.replace(edgeText(r, v), '');
          expect(rest).not.toMatch(/\d/);
          expect(rest).not.toContain(needText(r));
          expect(rest).not.toContain(show(r, area(r, v)));
          expect(m).not.toContain(edgeText(r, r.ans));
          expect(missText(r, v)).not.toMatch(/laid|needs/);
        }
      }
    }
  });
  it('two wrong settings on the same side give the same miss text, apart from the player’s own edge', () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      for (const r of all80(level)) {
        const flat = (v: number) => missText(r, v).replace(SLIP, '').replace(edgeText(r, v), 'EDGE');
        const below = span(r.min, r.ans - 1);
        const above = span(r.ans + 1, r.max);
        for (const side of [below, above]) for (const v of side) expect(flat(v)).toBe(flat(side[0]));
        if (below.length && above.length) expect(flat(below[0])).not.toBe(flat(above[0]));
      }
    }
  });
  it('the burst of a miss is at a fixed point of the scene, the same for every possible answer, so it never marks the true edge', () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const points = new Set<string>();
      for (const r of all80(level)) {
        for (const ans of span(r.min, r.max)) points.add(hitPoint({ ...r, ans, T: area(r, ans) }).join());
        points.add(hitPoint(r).join());
      }
      expect(points.size).toBe(1);
    }
  });
  it('the intel states the need as written; the working appears only after a win and contains the answer', () => {
    for (const level of [5, 6]) {
      for (const r of all80(level).slice(0, 60)) {
        expect(intel(r)).toContain(`needs exactly ${r.text} of paint`);
        expect(spotText(r, r.ans)).toMatch(/Ink gauge/);
        const e = explain(r);
        expect(e).toContain(r.text!);
        if (level === 5) {
          expect(e).toContain(`v = ${r.ans}`);
          expect(e).toContain(CURVES[r.p[0]].anti);
        } else {
          const [a] = r.p;
          expect(e).toContain(`With q = ${r.ans}: ${r.ans / 2}·√${a * a - r.ans * r.ans} + ${(a * a) / 2}·${r.ans === a ? 'π/2' : 'π/6'} = ${r.text}.`);
        }
      }
    }
  });
});
