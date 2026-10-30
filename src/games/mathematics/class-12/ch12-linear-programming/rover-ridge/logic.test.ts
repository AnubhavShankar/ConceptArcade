import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { buildRounds, chord, explain, halfBox, intel, judge, judgeEdge, judgeOpen, missText, missTextEdge, missTextOpen, ore, parseConstraint, DECLARE_HIT, exampleCorner, HIT_MAP, POOL4, POOL5, round4, round5, ruleEnds, ruler, spotFor, spotText, type Attempt, type Half, type Pt, type Region, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/** The best Z found by checking every whole-number point of the plateau, as an independent check on the corner rule. */
function bruteBest(r: Round) {
  let best = r.goal === 'max' ? -Infinity : Infinity;
  for (const x of span(0, 9)) for (const y of span(0, 9)) {
    // inside the convex polygon (counter-clockwise: every cross product is non-negative)
    const inside = r.corners.every((p, i) => {
      const q = r.corners[(i + 1) % r.corners.length];
      return (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]) >= 0;
    });
    if (!inside) continue;
    const z = ore(r, [x, y]);
    best = r.goal === 'max' ? Math.max(best, z) : Math.min(best, z);
  }
  return best;
}

describe('the corner rule is right', () => {
  it('textbook anchor: corners (0,0), (4,0), (3,3), (0,5) with Z = 3x + 2y: the largest is 15 at (3, 3)', () => {
    const corners: Pt[] = [[0, 0], [4, 0], [3, 3], [0, 5]];
    const r: Round = { corners, constraints: [], a: 3, b: 2, goal: 'max', ans: 15, best: [3, 3], min: -4, max: 20, start: 0, assist: 0 };
    expect(Math.max(...corners.map((p) => ore(r, p)))).toBe(15);
  });
  it('every round: the best whole-number point of the plateau gives the same Z as the best corner', () => {
    for (const level of [1, 2, 3]) for (const r of all(level).slice(0, 60)) expect(bruteBest(r)).toBe(r.ans);
  });
  it('the plateau is convex with whole corners, and the best corner is unique', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level)) {
        const vals = r.corners.map((p) => ore(r, p));
        expect(vals.filter((v) => v === r.ans)).toHaveLength(1);
        expect(r.corners.length).toBeGreaterThanOrEqual(4);
        expect(r.constraints).toHaveLength(r.corners.length);
      }
    }
  });
});

describe('every round has exactly one winning setting', () => {
  it('only the best Z wins over the whole dial, and the start never wins', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level)) {
        expect(span(r.min, r.max).filter((z) => judge(r, z))).toEqual([r.ans]);
        expect(judge(r, r.start)).toBe(false);
        expect(ruler(r, r.ans)).toBe('touches');
        expect(r.ans).toBeGreaterThanOrEqual(r.min);
        expect(r.ans).toBeLessThanOrEqual(r.max);
      }
    }
  });
  it('level 1 is a maximum with positive ore; levels 2 and 3 have mixed signs', () => {
    for (const r of all(1)) {
      expect(r.goal).toBe('max');
      expect(r.a * r.b).toBeGreaterThan(0);
    }
    for (const level of [2, 3]) for (const r of all(level)) expect(r.a * r.b).toBeLessThan(0);
  });
  it('helpers fade', () => {
    for (const level of [1, 2, 3]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
});

describe('words', () => {
  it('misses and probes describe the ruler, never the best Z; the working lists the corners', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 40)) {
        const wrong = r.ans === r.max ? r.ans - 1 : r.ans + 1;
        expect(missText(r, wrong).length).toBeGreaterThan(30);
        expect(spotText(r, wrong)).toMatch(/Probe/);
        expect(explain(r)).toMatch(/→/);
        expect(intel(r)).toContain('≤');
      }
    }
  });
  it('rounds in a level differ', () => {
    for (const s of seeds) for (const level of [1, 2, 3]) {
      const rs = buildRounds(level, createRng(s));
      expect(new Set(rs.map((r) => r.corners.join() + r.a + r.b)).size).toBe(3);
    }
  });
});

// ---- Levels 4 and 5 ---------------------------------------------------------------------------------------------------------------------------------------
// Every pool row is checked against a numerical computation that uses only the constraint texts: the corners come from intersecting every pair of boundary
// lines and keeping those that satisfy all constraints, and the best Z comes from a grid search over the region.

const seeds80 = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const holds = (cs: Half[], x: number, y: number) => cs.every((h) => (h.ge ? h.a * x + h.b * y >= h.c - 1e-9 : h.a * x + h.b * y <= h.c + 1e-9));
const cornersFromText = (texts: string[]): Pt[] => {
  const cs = texts.map(parseConstraint);
  const out: Pt[] = [];
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
    const det = cs[i].a * cs[j].b - cs[j].a * cs[i].b;
    if (Math.abs(det) < 1e-12) continue;
    const x = (cs[i].c * cs[j].b - cs[j].c * cs[i].b) / det;
    const y = (cs[i].a * cs[j].c - cs[j].a * cs[i].c) / det;
    if (holds(cs, x, y) && !out.some((p) => Math.abs(p[0] - x) < 1e-9 && Math.abs(p[1] - y) < 1e-9)) out.push([Math.round(x * 1e6) / 1e6, Math.round(y * 1e6) / 1e6]);
  }
  return out;
};
const ptsKey = (ps: Pt[]) => ps.map((p) => p.join(',')).sort().join(';');
/** The best Z over every grid point (step 0.25, from 0 to hi) of the region, and how many grid points reach it. */
function gridBest(texts: string[], a: number, b: number, goal: 'max' | 'min', hi: number) {
  const cs = texts.map(parseConstraint);
  let best = goal === 'max' ? -Infinity : Infinity;
  let count = 0;
  let any = false;
  for (let i = 0; i <= hi * 4; i++) for (let j = 0; j <= hi * 4; j++) {
    const x = i / 4;
    const y = j / 4;
    if (!holds(cs, x, y)) continue;
    any = true;
    const z = a * x + b * y;
    if (Math.abs(z - best) < 1e-9) count++;
    else if (goal === 'max' ? z > best : z < best) {
      best = z;
      count = 1;
    }
  }
  return { any, best, count };
}
const area = (p: Pt[]) => Math.abs(p.reduce((s, q, i) => s + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0)) / 2;
const rows4 = POOL4.flatMap((pool, k) => pool.map((row) => ({ row, k })));
const rows5 = POOL5.flatMap((pool, k) => pool.map((row) => ({ row, k })));
const regions: Region[] = [];
for (const reg of [...rows4.map((x) => x.row[0]), ...rows5.map((x) => x.row[0])]) if (!regions.includes(reg)) regions.push(reg);
const declares: Attempt[] = [{ action: 'nomax' }, { action: 'empty' }];
const dial = (r: Round) => span(r.min, r.max);

describe('levels 4 and 5: every region in the pools', () => {
  it('the feasible corners found from the constraints alone are the listed corners (none for an empty region)', () => {
    expect(regions).toHaveLength(9);
    for (const reg of regions) expect(ptsKey(cornersFromText(reg.constraints))).toBe(ptsKey(reg.corners ?? []));
  });
  it('the drawn part of an open region is its corners plus three window corners, all feasible; it really runs on for ever', () => {
    for (const reg of regions) {
      const cs = reg.constraints.map(parseConstraint);
      const unbounded = holds(cs, 1000, 1000) && holds(cs, 2000, 2000);
      expect(reg.draw !== undefined).toBe(unbounded);
      if (reg.draw && reg.corners) {
        expect(reg.draw).toEqual([...reg.corners, [12, 0], [12, 12], [0, 12]]);
        for (const p of reg.draw) expect(holds(cs, p[0], p[1])).toBe(true);
      }
      if (!unbounded && reg.corners) {
        // a bounded region lies inside its corners' bounding box
        const hiX = Math.max(...reg.corners.map((p) => p[0]));
        const hiY = Math.max(...reg.corners.map((p) => p[1]));
        for (let i = 0; i <= 160; i++) for (let j = 0; j <= 160; j++) if (holds(cs, i / 4, j / 4)) {
          expect(i / 4).toBeLessThanOrEqual(hiX);
          expect(j / 4).toBeLessThanOrEqual(hiY);
        }
      }
    }
  });
  it('the empty regions have no point in common, found by search and by the named clash', () => {
    for (const reg of regions.filter((x) => !x.corners)) {
      expect(gridBest(reg.constraints, 1, 1, 'max', 50).any).toBe(false);
      // the first two constraints alone already clash (that is what explain names), even without x, y ≥ 0
      const [p, q] = reg.constraints.slice(0, 2).map(parseConstraint);
      for (let i = -80; i <= 80; i++) for (let j = -80; j <= 80; j++) expect(holds([p, q], i / 4, j / 4)).toBe(false);
    }
  });
  it('the constraint reader and the half-plane clip are right', () => {
    expect(parseConstraint('x − y ≤ −1')).toEqual({ a: 1, b: -1, c: -1, ge: false });
    expect(parseConstraint('−x + y ≤ 0')).toEqual({ a: -1, b: 1, c: 0, ge: false });
    expect(parseConstraint('3x + 2y ≥ 12')).toEqual({ a: 3, b: 2, c: 12, ge: true });
    expect(parseConstraint('−y ≤ 0')).toEqual({ a: 0, b: -1, c: 0, ge: false });
    // E2: y ≥ x + 1 is a triangle of area 11²/2, y ≤ x one of 12²/2, and they share no point
    const upper = halfBox(parseConstraint('x − y ≤ −1'));
    const lower = halfBox(parseConstraint('−x + y ≤ 0'));
    expect(area(upper)).toBeCloseTo(60.5, 9);
    expect(area(lower)).toBeCloseTo(72, 9);
    const cs = [parseConstraint('x − y ≤ −1'), parseConstraint('−x + y ≤ 0')];
    for (let i = 0; i <= 24; i++) for (let j = 0; j <= 24; j++) expect(holds(cs, i / 2, j / 2)).toBe(false);
  });
});

describe('level 4 pool rows', () => {
  it('has three pools of the sizes the design gives', () => {
    expect(POOL4.map((p) => p.length)).toEqual([4, 8, 8]);
    expect(POOL5.map((p) => p.length)).toEqual([4, 4, 2]);
  });
  it('a value row: the answer is the unique best corner value (smallest on an open region, largest on a bounded one), and no grid point does better', () => {
    for (const { row } of rows4.filter((x) => x.row[4] === 'value')) {
      const [reg, a, b, goal, , ans] = row;
      const vals = (reg.corners ?? []).map((p) => a * p[0] + b * p[1]);
      expect(a).toBeGreaterThan(0);
      expect(b).toBeGreaterThan(0);
      expect(vals.filter((v) => v === ans)).toHaveLength(1);
      // an open region has a smallest value and no largest; a bounded one has both, so either goal can be asked
      if (reg.draw) expect(goal).toBe('min');
      expect(goal === 'min' ? Math.min(...vals) : Math.max(...vals)).toBe(ans);
      expect(gridBest(reg.constraints, a, b, goal, 40).best).toBe(ans);
      expect(gridBest(reg.constraints, a, b, goal, 40).count).toBe(1);
      // the corner quoted when a 'no plateau' claim is refuted is never the one that gives the answer
      expect(vals[(reg.corners ?? []).indexOf(exampleCorner(round4(row, 0)))]).not.toBe(ans);
    }
  });
  it('a no-maximum row: positive a and b on a region that runs to infinity, so Z has no largest value', () => {
    const rows = rows4.filter((x) => x.row[4] === 'nomax');
    expect(rows).toHaveLength(4);
    for (const { row } of rows) {
      const [reg, a, b, goal, , ans] = row;
      expect(goal).toBe('max');
      expect(ans).toBeNull();
      expect(a).toBeGreaterThan(0);
      expect(b).toBeGreaterThan(0);
      const cs = reg.constraints.map(parseConstraint);
      const top = Math.max(...(reg.corners ?? []).map((p) => a * p[0] + b * p[1]));
      for (const t of [50, 500, 5000]) {
        expect(holds(cs, t, t)).toBe(true);
        expect(a * t + b * t).toBeGreaterThan(top);
      }
      // the best Z found in a bigger and bigger window keeps growing
      expect(gridBest(reg.constraints, a, b, 'max', 40).best).toBeGreaterThan(gridBest(reg.constraints, a, b, 'max', 20).best);
    }
  });
  it('an empty row: no feasible region, so no optimal value', () => {
    const rows = rows4.filter((x) => x.row[4] === 'empty');
    expect(rows).toHaveLength(4);
    expect(rows.map((x) => x.row[3]).sort()).toEqual(['max', 'max', 'min', 'min']);
    for (const { row } of rows) {
      expect(row[0].corners).toBeUndefined();
      expect(row[5]).toBeNull();
      expect(gridBest(row[0].constraints, row[1], row[2], row[3], 50).any).toBe(false);
    }
  });
  it('round 1 is all values; the goal does not give the kind away in rounds 2 and 3 (value and empty rows come with either goal; only no-maximum is max)', () => {
    expect(POOL4[0].every((r) => r[4] === 'value' && r[3] === 'min')).toBe(true);
    for (const k of [1, 2]) {
      const goals = (kind: string) => new Set(POOL4[k].filter((r) => r[4] === kind).map((r) => r[3]));
      expect([...goals('value')].sort()).toEqual(['max', 'min']);
      expect([...goals('empty')].sort()).toEqual(k === 1 ? ['min'] : ['max', 'min']);
      expect([...goals('nomax')]).toEqual(['max']);
    }
    expect(POOL4[1].filter((r) => r[4] === 'empty')).toHaveLength(1);
    expect(POOL4[2].filter((r) => r[4] === 'empty')).toHaveLength(3);
  });
});

describe('level 5 pool rows', () => {
  it('the best Z is right by grid search, and a tie is exactly an edge', () => {
    for (const { row } of rows5) {
      const [reg, a, b, goal, ans, edge] = row;
      const corners = reg.corners ?? [];
      const vals = corners.map((p) => a * p[0] + b * p[1]);
      const best = goal === 'max' ? Math.max(...vals) : Math.min(...vals);
      expect(best).toBe(ans);
      const tied = corners.filter((_, i) => vals[i] === ans);
      expect(tied.length >= 2).toBe(edge);
      const g = gridBest(reg.constraints, a, b, goal, goal === 'min' ? 40 : 12);
      expect(g.best).toBe(ans);
      expect(g.count > 1).toBe(edge);
      if (edge) {
        expect(tied).toHaveLength(2);
        // the two tied corners are neighbours on the plateau's edge, that edge is one of the constraints, and the ruler lies parallel to it
        const i = corners.indexOf(tied[0]);
        const j = corners.indexOf(tied[1]);
        expect([1, corners.length - 1]).toContain(Math.abs(i - j));
        const [p, q] = tied;
        expect(a * (q[0] - p[0]) + b * (q[1] - p[1])).toBe(0);
        const onLine = reg.constraints.map(parseConstraint).some((h) => h.a * p[0] + h.b * p[1] === h.c && h.a * q[0] + h.b * q[1] === h.c);
        expect(onLine).toBe(true);
        // every point between them is just as good
        for (const s of [0.25, 0.5, 0.75]) expect(a * (p[0] + (q[0] - p[0]) * s) + b * (p[1] + (q[1] - p[1]) * s)).toBeCloseTo(ans, 9);
      }
    }
  });
  it('the textbook rows: B1 with 2x + y ties at (6, 0) and (4, 4), B2 with x + y at (5, 2) and (2, 5), T3 with x + 2y at (0, 3) and (6, 0)', () => {
    const find = (k: number, ans: number, edge: boolean) => round5(POOL5[k].find((r) => r[4] === ans && r[5] === edge && r[0].corners)!, 0);
    expect(find(0, 12, true).bestAt).toEqual([[6, 0], [4, 4]]);
    expect(find(0, 7, true).bestAt).toEqual([[5, 2], [2, 5]]);
    expect(find(2, 6, true).bestAt).toEqual([[0, 3], [6, 0]]);
    expect(find(1, 8, false).bestAt).toEqual([[4, 4]]);
    expect(find(1, 12, false).bestAt).toEqual([[5, 2]]);
    expect(find(2, 9, false).bestAt).toEqual([[3, 1]]);
  });
});

describe('building rounds for levels 4 and 5', () => {
  it('level 4: kinds, dial 0..40, the start never wins, helpers fade, and every round comes from its pool', () => {
    for (const s of seeds80) {
      const rs = buildRounds(4, createRng(s));
      expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
      rs.forEach((r, k) => {
        expect([r.min, r.max]).toEqual([0, 40]);
        expect(r.start).toBe(0);
        expect(r.edge).toBeUndefined();
        expect(POOL4[k].some((row) => row[1] === r.a && row[2] === r.b && row[3] === r.goal && row[4] === r.kind && row[0].constraints.join() === r.constraints.join())).toBe(true);
        expect(judgeOpen(r, { action: 'park', z: r.start })).toBe(false);
        if (r.kind === 'nomax') expect(r.open).toBe(true);
        if (r.kind === 'empty') expect(r.open).toBe(false);
        expect(r.kind === 'value' ? Number.isInteger(r.ans) : Number.isNaN(r.ans)).toBe(true);
      });
    }
  });
  it('level 5: dial 0..20, the start never wins with either shape, helpers fade', () => {
    for (const s of seeds80) {
      const rs = buildRounds(5, createRng(s));
      expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
      rs.forEach((r, k) => {
        expect([r.min, r.max]).toEqual([0, 20]);
        expect(r.start).toBe(0);
        expect(r.kind).toBeUndefined();
        expect(typeof r.edge).toBe('boolean');
        expect(POOL5[k].some((row) => row[1] === r.a && row[2] === r.b && row[4] === r.ans && row[5] === r.edge)).toBe(true);
        expect(r.ans).toBeGreaterThan(r.min);
        expect(r.ans).toBeLessThan(r.max);
        for (const shape of ['corner', 'edge'] as const) expect(judgeEdge(r, r.start, shape)).toBe(false);
      });
    }
  });
  it('rounds in a level differ, and each level takes its rounds from all three pools over many seeds', () => {
    for (const level of [4, 5]) {
      const seen = [new Set<string>(), new Set<string>(), new Set<string>()];
      for (const s of seeds80) {
        const rs = buildRounds(level, createRng(s));
        expect(new Set(rs.map((r) => r.constraints.join() + r.a + r.b + r.goal)).size).toBe(3);
        rs.forEach((r, k) => seen[k].add(r.constraints.join() + r.a + r.b + r.goal));
      }
      expect(seen.map((x) => x.size)).toEqual((level === 4 ? POOL4 : POOL5).map((p) => new Set(p.map((row) => row[0].constraints.join() + row[1] + row[2] + row[3])).size));
    }
  });
});

describe('exactly one winning attempt', () => {
  it('level 4: a value round is won only by parking at the answer; no-maximum and no-plateau rounds only by their own declaration', () => {
    for (const row of rows4) for (const assist of [0, 1, 2] as const) {
      const r = round4(row.row, assist);
      const wins: string[] = [];
      for (const z of dial(r)) if (judgeOpen(r, { action: 'park', z })) wins.push(`park ${z}`);
      for (const d of declares) if (judgeOpen(r, d)) wins.push(d.action);
      expect(wins).toEqual(r.kind === 'value' ? [`park ${r.ans}`] : [r.kind]);
    }
  });
  it('level 5: only the right Z with the right shape wins', () => {
    for (const row of rows5) {
      const r = round5(row.row, 0);
      const wins: string[] = [];
      for (const z of dial(r)) for (const shape of ['corner', 'edge'] as const) if (judgeEdge(r, z, shape)) wins.push(`${z} ${shape}`);
      expect(wins).toEqual([`${r.ans} ${r.edge ? 'edge' : 'corner'}`]);
    }
  });
  it('blind declaring: the odds are exactly the share of rows of that kind in each pool, and round 1 can never be won by a declaration', () => {
    const share = (k: number, kind: string) => POOL4[k].filter((row) => row[4] === kind).length / POOL4[k].length;
    expect([share(0, 'nomax'), share(0, 'empty')]).toEqual([0, 0]);
    expect([share(1, 'nomax'), share(1, 'empty')]).toEqual([0.25, 0.125]);
    expect([share(2, 'nomax'), share(2, 'empty')]).toEqual([0.25, 0.375]);
    // and from the built rounds: a fixed declaration wins round 1 never
    const nomax = [0, 0, 0];
    for (const s of seeds80) buildRounds(4, createRng(s)).forEach((r, k) => {
      if (judgeOpen(r, { action: 'nomax' })) nomax[k]++;
      if (k === 0) expect(judgeOpen(r, { action: 'empty' })).toBe(false);
    });
    expect(nomax[0]).toBe(0);
    expect(nomax[1]).toBeGreaterThan(0);
    expect(nomax[1]).toBeLessThan(80);
  });
});

describe('the ruler on an open or empty plateau', () => {
  it('open: misses below the smallest corner value, touches at it, and cuts for ever above it', () => {
    for (const row of rows4.filter((x) => x.row[0].draw)) {
      const r = round4(row.row, 0);
      const least = Math.min(...r.corners.map((p) => ore(r, p)));
      const g = gridBest(r.constraints, r.a, r.b, 'min', 40).best;
      expect(g).toBe(least);
      for (const z of dial(r)) expect(ruler(r, z)).toBe(z < least ? 'misses' : z === least ? 'touches' : 'cuts');
    }
  });
  it('empty: every ruler setting misses', () => {
    for (const row of rows4.filter((x) => x.row[4] === 'empty')) for (const z of dial(round4(row.row, 0))) expect(ruler(round4(row.row, 0), z)).toBe('misses');
  });
  it('a bounded region still behaves as in levels 1 to 3, and a value round parks only on "touches"', () => {
    for (const row of rows5.filter((x) => !x.row[0].draw)) {
      const r = round5(row.row, 0);
      expect(ruler(r, r.ans)).toBe('touches');
    }
    for (const row of rows4.filter((x) => x.row[4] === 'value')) {
      const r = round4(row.row, 0);
      expect(ruler(r, r.ans)).toBe('touches');
    }
  });
  it('the rover and its burst go where the ruler is, never to the winning corner, for every wrong setting', () => {
    for (const row of [...rows4.map((x) => round4(x.row, 0)), ...rows5.map((x) => round5(x.row, 0))]) {
      for (const z of dial(row)) {
        const s = spotFor(row, z);
        if (z !== row.ans) expect(s).not.toEqual(row.best);
        if (chord(row, z) || ruleEnds(row, z).length >= 2) expect(row.a * s[0] + row.b * s[1]).toBeCloseTo(z, 9);
      }
    }
  });
});

describe('level 4 and 5 words', () => {
  it('intel names the constraints, the ore and the options', () => {
    for (const row of rows4) {
      const r = round4(row.row, 0);
      expect(intel(r)).toContain(r.constraints.join(', '));
      expect(intel(r)).toContain(`declare that there is no ${r.goal === 'max' ? 'maximum' : 'minimum'} or no plateau at all`);
    }
    for (const row of rows5) expect(intel(round5(row.row, 0))).toMatch(/Then say whether the best is at one corner or along a whole edge\.$/);
    expect(intel(round4(POOL4[1][3], 0))).toContain('Ore is Z = 2x + 3y.');
  });
  it('a miss shows only what the player’s own choice did, never which choice is right', () => {
    const giveaways = [/runs off the map/, /never found an end/, /no point meets/, /no plateau at all/, /least value/, /nowhere to park/, /infinity/, /richer ground/];
    for (const row of rows4) {
      const r = round4(row.row, 0);
      const texts = [...dial(r).filter((z) => z !== r.ans).map((z) => missTextOpen(r, { action: 'park', z })), ...declares.filter((d) => !judgeOpen(r, d)).map((d) => missTextOpen(r, d))];
      for (const t of texts) {
        for (const g of giveaways) expect(t).not.toMatch(g);
        if (r.kind === 'value') expect(t).not.toMatch(new RegExp(`(?:=|at|is) ${r.ans}(?![0-9])`));
      }
    }
    // the same wrong claim reads the same whatever the round really is
    // (the wording follows the goal of the round, and nothing else)
    for (const goal of ['max', 'min']) {
      const wrongNomax = rows4.map((x) => round4(x.row, 0)).filter((r) => r.kind !== 'nomax' && r.goal === goal).map((r) => missTextOpen(r, { action: 'nomax' }));
      expect(wrongNomax.length).toBeGreaterThan(2);
      expect(new Set(wrongNomax).size).toBe(1);
      expect(wrongNomax[0]).toContain(goal === 'max' ? 'no maximum' : 'no minimum');
    }
    const wrongEmpty = rows4.map((x) => round4(x.row, 0)).filter((r) => r.kind !== 'empty').map((r) => missTextOpen(r, { action: 'empty' }).replace(/\(.*\)/, 'P'));
    expect(new Set(wrongEmpty).size).toBe(1);
    // a parked ruler reads the same way on a no-maximum round as on any other round with the same ruler state and goal
    const a = round4(POOL4[1][3], 0);
    expect(missTextOpen(a, { action: 'park', z: 3 })).toBe(missText(a, 3));
  });
  it('level 5: a wrong Z is described by the ruler; a right Z with the wrong shape says so, naming the edge ends only for an edge', () => {
    for (const row of rows5) {
      const r = round5(row.row, 0);
      for (const z of dial(r).filter((v) => v !== r.ans)) {
        for (const shape of ['corner', 'edge'] as const) {
          const t = missTextEdge(r, z, shape);
          expect(t).toBe(missText(r, z));
          expect(t).not.toMatch(new RegExp(`Z = ${r.ans}(?![0-9])`));
          expect(t).not.toMatch(/whole edge|single point/);
        }
      }
      if (r.edge) {
        const t = missTextEdge(r, r.ans, 'corner');
        expect(t).toBe(`Z = ${r.ans} is right, but the ruler lies flat along a whole edge: every point between (${r.bestAt![0].join(', ')}) and (${r.bestAt![1].join(', ')}) is just as good, and Rover parked at one end only.`);
      } else {
        const t = missTextEdge(r, r.ans, 'edge');
        expect(t).toBe(`Z = ${r.ans} is right, but only one corner reaches it: the ruler touches the plateau at a single point.`);
        expect(t).not.toMatch(/\(\d/);
      }
    }
  });
  it('the working names the corners, the missing maximum, the two clashing constraints, or the edge', () => {
    const nomax = round4(POOL4[1][3], 0);
    expect(explain(nomax)).toBe('Z at each corner: (0, 4) → 12, (3, 1) → 9, (6, 0) → 12. The region runs off to infinity with a and b positive, so Z can be as large as you like: there is no maximum.');
    expect(explain(round4(POOL4[2][2], 0))).toBe('x + y ≤ 2 and x + y ≥ 5 cannot both hold, so the feasible region is empty and there is no optimal value.');
    expect(explain(round4(POOL4[2][3], 0))).toBe('x − y ≤ −1 and −x + y ≤ 0 cannot both hold, so the feasible region is empty and there is no optimal value.');
    expect(explain(round5(POOL5[0][0], 0))).toContain('The best Z is reached at (6, 0) and (4, 4), so at every point of the edge between them.');
    expect(explain(round5(POOL5[1][0], 0))).not.toContain('edge between');
    expect(explain(round4(POOL4[0][0], 0))).toMatch(/^Z at each corner: .* The smallest is 9, at \(3, 1\)\./);
  });
});

describe('where the burst and the heart appear', () => {
  it('is a fixed point that is not a corner of any region, for the map levels and for the declarations', () => {
    expect(Number.isInteger(HIT_MAP[1])).toBe(false);
    for (const reg of regions) for (const c of reg.corners ?? []) {
      expect(c).not.toEqual(HIT_MAP);
      expect(c).not.toEqual(DECLARE_HIT);
    }
    for (const level of [1, 2, 3, 4, 5]) for (const r of all(level)) {
      expect(r.corners).not.toContainEqual(HIT_MAP);
      expect(r.best).not.toEqual(HIT_MAP);
      expect(r.best).not.toEqual(DECLARE_HIT);
    }
    for (const level of [4, 5]) for (const r of seeds80.flatMap((s) => buildRounds(level, createRng(s)))) {
      expect(r.corners).not.toContainEqual(DECLARE_HIT);
    }
  });
});
