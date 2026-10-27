import { describe, expect, it } from 'vitest';
import {
  applyOp,
  applyOps,
  attracts,
  buildLevel,
  describeDirection,
  equilibrium,
  explainSolution,
  fmt,
  forceFactor,
  forceN,
  forceOn,
  judgeAllRest,
  judgeGap,
  judgeNull,
  judgeRescale,
  judgeRest,
  magnitude,
  netForceOn,
  nullCorners,
  starsFor,
  type Charge,
  type Level1,
  type Level2,
  type Level3,
  type Level4,
  type Level5,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 120 }, (_, i) => i * 7919 + 13);
const c = (name: string, q: number, x: number, y = 0): Charge => ({ name, q, at: { x, y } });

describe('Coulomb force in these units', () => {
  it('is k q1 q2 / r² (checked against SI)', () => {
    expect(forceN(2, 3, 30)).toBeCloseTo((9e9 * 2e-6 * 3e-6) / 0.3 ** 2, 9);
    expect(forceN(0.2, 0.3, 30)).toBeCloseTo(0.006, 9); // two small charges 30 cm apart
  });
  it('depends on the size of the charges, not their sign, and falls as 1/r²', () => {
    expect(forceN(-4, 5, 10)).toBe(forceN(4, 5, 10));
    expect(forceN(4, 5, 20)).toBeCloseTo(forceN(4, 5, 10) / 4, 12);
  });
});

describe('force vectors', () => {
  it('like charges push apart, unlike pull together', () => {
    const a = c('A', 3, 0);
    expect(forceOn(c('B', 3, 10), a).x).toBeGreaterThan(0); // B is pushed away from A
    expect(forceOn(c('B', -3, 10), a).x).toBeLessThan(0); // B is pulled towards A
  });
  it("obeys Newton's third law: equal and opposite forces on the two charges", () => {
    const a = c('A', 3, 0, 1);
    const b = c('B', -5, 7, 4);
    const fa = forceOn(a, b);
    const fb = forceOn(b, a);
    expect(fa.x).toBeCloseTo(-fb.x, 12);
    expect(fa.y).toBeCloseTo(-fb.y, 12);
    expect(magnitude(fa)).toBeCloseTo(forceN(3, -5, Math.hypot(7, 3)), 12);
  });
  it('superposition: a charge feels the vector sum of the forces taken one at a time', () => {
    const t = c('T', 1, 0);
    const net = netForceOn(t, [c('A', 4, 10), c('B', -2, -5)]);
    expect(net.x).toBeCloseTo(forceOn(t, c('A', 4, 10)).x + forceOn(t, c('B', -2, -5)).x, 12);
  });
  it('three equal charges at the corners of an equilateral triangle give no force at the centre (Example 1.5)', () => {
    const R = 10 / Math.sqrt(3);
    const at = (d: number) => ({ x: R * Math.cos((d * Math.PI) / 180), y: R * Math.sin((d * Math.PI) / 180) });
    const net = netForceOn(c('Q', 2, 0), [90, -30, 210].map((d, i) => ({ name: 'ABC'[i], q: 5, at: at(d) })));
    expect(magnitude(net)).toBeCloseTo(0, 9);
  });
  it('charges q, q, −q at a triangle: the three forces sum to zero (Example 1.6, Newton third law)', () => {
    const l = 10;
    const cs = [c('A', 3, 0, 0), c('B', 3, l, 0), { name: 'C', q: -3, at: { x: l / 2, y: (l * Math.sqrt(3)) / 2 } }];
    const forces = cs.map((t, i) => netForceOn(t, cs.filter((_, j) => j !== i)));
    expect(forces.reduce((s, f) => s + f.x, 0)).toBeCloseTo(0, 9);
    expect(forces.reduce((s, f) => s + f.y, 0)).toBeCloseTo(0, 9);
    const pair = forceN(3, 3, l);
    expect(magnitude(forces[0])).toBeCloseTo(pair, 9); // F1 has the size of one pair force
    expect(magnitude(forces[2])).toBeCloseTo(Math.sqrt(3) * pair, 9); // F3 is √3 F
  });
  it('charges 2, −5, 2, −5 at the corners of a square give no force at the centre (Exercise 1.6)', () => {
    const h = 5;
    const net = netForceOn(c('P', 1, 0), [c('A', 2, -h, h), c('B', -5, h, h), c('C', 2, h, -h), c('D', -5, -h, -h)]);
    expect(magnitude(net)).toBeCloseTo(0, 9);
    const unequal = netForceOn(c('P', 1, 0), [c('A', 2, -h, h), c('B', -5, h, h), c('C', 3, h, -h), c('D', -5, -h, -h)]);
    expect(magnitude(unequal)).toBeGreaterThan(0.1);
  });
  it('describes a direction in words', () => {
    expect(describeAll()).toEqual(['to the right', 'up', 'to the left', 'down', 'up and to the right']);
  });
});
const describeAll = () => [describeDirection({ x: 1, y: 0 }), describeDirection({ x: 0, y: 2 }), describeDirection({ x: -3, y: 0 }), describeDirection({ x: 0, y: -1 }), describeDirection({ x: 1, y: 1 })];

describe('rescaling', () => {
  const base = { q1: 4, q2: -6, r: 10 };
  it('doubling both charges and halving the gap multiplies the force by 16 (Exercise 1.12)', () => {
    expect(forceFactor(base, applyOps(base, ['q1x2', 'q2x2', 'rHalf']))).toBeCloseTo(16, 12);
  });
  it('touching both spheres with identical neutral ones and halving the gap leaves the force unchanged (Example 1.4)', () => {
    const after = applyOps(base, ['touchBoth', 'rHalf']);
    expect(forceFactor(base, after)).toBeCloseTo(1, 12);
  });
  it('touching shares charge equally and conserves it', () => {
    const after = applyOp(base, 'touchA');
    expect(after.q1).toBe(2);
    expect(after.q1 + 2 /* the sphere that touched it */ + 0).toBe(base.q1);
  });
  it('replacing a charge by its opposite flips attraction into repulsion without changing the size', () => {
    const flipped = applyOp(base, 'flipB');
    expect(attracts(base)).toBe(true);
    expect(attracts(flipped)).toBe(false);
    expect(forceFactor(base, flipped)).toBeCloseTo(1, 12);
  });
  it('tripling and doubling work as expected', () => {
    expect(forceFactor(base, applyOp(base, 'q2x3'))).toBeCloseTo(3, 12);
    expect(forceFactor(base, applyOp(base, 'rDouble'))).toBeCloseTo(0.25, 12);
  });
});

describe('equilibrium on a line', () => {
  it('like charges balance between them, closer to the smaller one', () => {
    const e = equilibrium(4, 16, 30)!;
    expect(e.region).toBe('between');
    expect(e.x).toBeCloseTo(10, 12); // 1 : 2 ratio of distances
  });
  it('unlike charges balance outside, on the side of the smaller one', () => {
    expect(equilibrium(4, -16, 30)!.region).toBe('left');
    expect(equilibrium(16, -4, 30)!.region).toBe('right');
  });
  it('equal and opposite charges have no balance point on the line', () => {
    expect(equilibrium(5, -5, 20)).toBeNull();
  });
  it('the net force on a probe at the balance point really is zero', () => {
    for (const [qa, qb] of [[4, 16], [9, 36], [-4, 25], [9, -4], [-16, -1], [2, -8]]) {
      const d = 24;
      const e = equilibrium(qa, qb, d)!;
      const net = netForceOn(c('P', 1, e.x), [c('A', qa, 0), c('B', qb, d)]);
      expect(Math.abs(net.x)).toBeLessThan(1e-9);
    }
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      const distinct = new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s)))));
      expect(distinct.size).toBeGreaterThan(3);
    }
  });

  it('level 1: the target reading is what the answer gap gives, and it sits inside the tolerance band', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as Level1;
      expect(forceN(l.q1, l.q2, l.rAnswer)).toBeCloseTo(l.target, 12);
      expect(judgeGap(l, l.rAnswer).ok).toBe(true);
    }
  });
  it('level 1: a wrong gap says too strong or too weak, and 3% on the force is the boundary', () => {
    const l = buildLevel(1, lcg(3)) as Level1;
    expect(judgeGap(l, l.rAnswer * 0.8).verdict).toBe('too-strong'); // closer: stronger
    expect(judgeGap(l, l.rAnswer * 1.3).verdict).toBe('too-weak');
    expect(judgeGap(l, l.rAnswer * 1.01).ok).toBe(true); // 2% on F
    expect(judgeGap(l, l.rAnswer * 1.05).ok).toBe(false); // about 10% on F
    expect(judgeGap(l, l.rAnswer * 1.1).ok).toBe(false);
  });
  it('level 1: both attraction and repulsion occur', () => {
    const kinds = new Set(seeds.map((s) => attractsLevel1(buildLevel(1, lcg(s)) as Level1)));
    expect(kinds.size).toBe(2);
  });

  it('level 2: the factor is the product of the changes, and judging accepts it with the right direction', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as Level2;
      expect(l.factor).toBeCloseTo(forceFactor(l.before, applyOps(l.before, l.ops)), 12);
      expect(forceN(l.after.q1, l.after.q2, l.after.r)).toBeCloseTo(l.f0 * l.factor, 9);
      expect(judgeRescale(l, l.factor, attracts(l.after)).ok).toBe(true);
    }
  });
  it('level 2: a wrong factor or direction fails, and a hint says higher or lower without the number', () => {
    const l = buildLevel(2, lcg(11)) as Level2;
    const bad = judgeRescale(l, l.factor * 2, attracts(l.after));
    expect(bad.ok).toBe(false);
    expect(bad.trueIs).toBe('lower');
    expect(judgeRescale(l, l.factor / 2, attracts(l.after)).trueIs).toBe('higher');
    const wrongDir = judgeRescale(l, l.factor, !attracts(l.after));
    expect(wrongDir.factorOk).toBe(true);
    expect(wrongDir.directionOk).toBe(false);
  });
  it('level 2: the unchanged-force trap (Example 1.4) and a sign flip both turn up', () => {
    const factors = seeds.map((s) => (buildLevel(2, lcg(s)) as Level2).factor);
    expect(factors.some((f) => Math.abs(f - 1) < 1e-12)).toBe(true);
    expect(seeds.some((s) => (buildLevel(2, lcg(s)) as Level2).ops.includes('flipB'))).toBe(true);
  });

  it('level 3: the answers null the force, for both shapes', () => {
    const shapes = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as Level3;
      shapes.add(l.shape);
      const r = judgeNull(l, l.answers);
      expect(r.ok).toBe(true);
      expect(r.residual).toBeLessThan(1e-9);
    }
    expect(shapes.size).toBe(2);
  });
  it('level 3: guessing patterns do not null the force', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as Level3;
      const a = l.answers;
      if (l.shape === 'square') {
        expect(judgeNull(l, [a[1], a[0]]).ok).toBe(false); // swapped
        expect(judgeNull(l, [a[0], a[0]]).ok).toBe(false); // same as A
        expect(judgeNull(l, [-a[0], -a[1]]).ok).toBe(false); // opposite signs
        expect(judgeNull(l, [0, 0]).ok).toBe(false); // nothing
      } else {
        expect(judgeNull(l, [-a[0], -a[0]]).ok).toBe(false);
        expect(judgeNull(l, [a[0], 0]).ok).toBe(false);
        expect(judgeNull(l, [a[0] + 1, a[0]]).ok).toBe(false);
      }
    }
  });
  it('level 3: adjustable corners are the ones the student fills, in order', () => {
    const l = buildLevel(3, lcg(3)) as Level3;
    const filled = nullCorners(l, l.answers);
    expect(filled.map((x) => x.q)).toEqual(l.corners.map((x, i) => x.q ?? l.answers[l.corners.slice(0, i).filter((y) => y.q === null).length]));
  });
  it('level 3: a near miss is forgiven, a clear miss is not', () => {
    const l = buildLevel(3, lcg(21)) as Level3;
    const near = l.answers.map((v) => v * 1.005);
    expect(judgeNull(l, near).ok).toBe(true);
    const far = l.answers.map((v, i) => (i === 0 ? v * 1.3 : v));
    expect(judgeNull(l, far).ok).toBe(false);
  });

  it('level 4: the answer region and distance leave the probe at rest', () => {
    const regions = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as Level4;
      regions.add(l.region);
      const eq = judgeRest(l, l.region, Math.abs(l.xEq));
      expect(eq.ok).toBe(true);
      expect(Math.abs(eq.net.x)).toBeLessThan(1e-9);
    }
    expect(regions.size).toBe(3);
  });
  it('level 4: the wrong region or the midpoint fails, and the probe slides the way the net force points', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as Level4;
      const d = l.b.at.x;
      const wrong = (['left', 'between', 'right'] as const).filter((r) => r !== l.region);
      for (const r of wrong) expect(judgeRest(l, r, Math.abs(l.xEq)).ok).toBe(false);
      const mid = judgeRest(l, 'between', d / 2);
      if (l.region === 'between' && Math.abs(l.xEq - d / 2) > 0.05 * d) expect(mid.ok).toBe(false);
    }
    // A (4) and B (16), like charges, 30 cm apart: balance 10 cm from A. At 20 cm the stronger B pushes the probe back towards A.
    const l: Level4 = { kind: 'rest', story: '', a: c('A', 4, 0), b: c('B', 16, 30), probe: 1, xEq: 10, region: 'between', tol: 0.03, freeTests: 1 };
    expect(judgeRest(l, 'between', 20).net.x).toBeLessThan(0);
    expect(judgeRest(l, 'between', 5).net.x).toBeGreaterThan(0);
  });
  it('level 4: a probe placed on a charge is rejected without blowing up', () => {
    const l = buildLevel(4, lcg(3)) as Level4;
    expect(() => judgeRest(l, 'between', 0)).not.toThrow();
    expect(judgeRest(l, 'between', 0).ok).toBe(false);
  });

  it('level 5: the answers put all three charges at rest', () => {
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as Level5;
      const r = judgeAllRest(l, l.xAnswer, l.qAnswer);
      expect(r.ok).toBe(true);
      expect(r.worst).toBeLessThan(1e-9);
      expect(l.a.q * l.b.q).toBeGreaterThan(0); // like charges
      expect(l.qAnswer * l.a.q).toBeLessThan(0); // the third is the opposite sign
    }
  });
  it('level 5: balancing only the new charge, or only the held ones, is not enough', () => {
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as Level5;
      expect(judgeAllRest(l, l.xAnswer, -l.qAnswer).ok).toBe(false); // wrong sign
      expect(judgeAllRest(l, l.xAnswer, l.qAnswer * 2).ok).toBe(false); // right place, wrong size
      expect(judgeAllRest(l, l.b.at.x / 2, l.qAnswer).ok).toBe(l.b.at.x / 2 === l.xAnswer ? true : false);
    }
  });
  it('level 5: the answers are clean numbers', () => {
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as Level5;
      expect(Math.abs(l.qAnswer)).toBe(Math.round(Math.abs(l.qAnswer)));
      expect(l.xAnswer * 100).toBeCloseTo(Math.round(l.xAnswer * 100), 9);
    }
  });
});

const attractsLevel1 = (l: Level1) => l.q1 * l.q2 < 0;

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star, never below one', () => {
    expect(starsFor(0, 1)).toBe(3);
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(2, 1)).toBe(2);
    expect(starsFor(9, 1)).toBe(1);
    expect(starsFor(1, 0)).toBe(2);
  });
  it('every level explains its answer, mentioning the physics', () => {
    const must = [/r = √/, /Together/, /superposition/, /rA : rB/, /rest/];
    [1, 2, 3, 4, 5].forEach((level, i) => {
      const text = explainSolution(buildLevel(level, lcg(3))).join('\n');
      expect(text.length).toBeGreaterThan(80);
      expect(text).toMatch(must[i]);
    });
  });
  it('formats numbers to three significant figures', () => {
    expect(fmt(0.006)).toBe('6 × 10⁻³');
    expect(fmt(12.3456)).toBe('12.3');
    expect(fmt(202.5)).toBe('203');
  });
});
