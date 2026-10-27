import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  CLEARLY_OFF,
  deviation,
  dist,
  distToLines,
  explainSolution,
  fieldAt,
  fieldLines,
  FLAW_RULE,
  FOLLOWS,
  judgeFlaw,
  judgeRank,
  judgeRead,
  judgeRelease,
  polylinesCross,
  releasePath,
  segmentsCross,
  starsFor,
  strength,
  strengthsAt,
  trace,
  type LevelFlaw,
  type LevelRank,
  type LevelRead,
  type LevelRelease,
  type Src,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const src = (name: string, q: number, x: number, y = 0): Src => ({ name, q, at: { x, y } });
const dipole = (qa: number, qb: number): Src[] => [src('A', qa, -7), src('B', qb, 7)];

describe('the field and its lines', () => {
  it('points away from a positive charge and towards a negative one', () => {
    expect(fieldAt({ x: 5, y: 0 }, [src('A', 1, 0)]).x).toBeGreaterThan(0);
    expect(fieldAt({ x: 5, y: 0 }, [src('A', -1, 0)]).x).toBeLessThan(0);
  });
  it('falls as 1/r² and is not defined on the charge itself', () => {
    expect(strength({ x: 4, y: 0 }, [src('A', 1, 0)])).toBeCloseTo(strength({ x: 2, y: 0 }, [src('A', 1, 0)]) / 4, 12);
    expect(Number.isFinite(fieldAt({ x: 0, y: 0 }, [src('A', 1, 0)]).x)).toBe(true);
  });
  it('a lone positive charge has straight radial lines that run off the picture', () => {
    const t = trace([src('A', 1, 0)], { x: 0.7, y: 0 }, 1);
    expect(t.end).toBe(-1);
    expect(t.pts.every((p) => Math.abs(p.y) < 1e-9)).toBe(true);
  });
  it('the central line of a dipole runs straight from + to −', () => {
    const t = trace(dipole(1, -1), { x: -6.3, y: 0 }, 1);
    expect(t.end).toBe(1);
  });
});

describe('drawing the picture', () => {
  it('draws a number of lines proportional to the charge', () => {
    const lines = fieldLines([src('A', 2, -7), src('B', 1, 7)], 6); // two positive charges
    expect(lines.filter((l) => l.from === 0)).toHaveLength(12);
    expect(lines.filter((l) => l.from === 1)).toHaveLength(6);
  });
  it('an unequal opposite pair: twice the charge means twice the lines at it, and the extra ones come from far away', () => {
    const lines = fieldLines(dipole(1, -2), 6);
    expect(lines.filter((l) => l.from === 0)).toHaveLength(6);
    const atB = lines.filter((l) => l.to === 1);
    expect(atB.length).toBeGreaterThanOrEqual(11);
    expect(atB.length).toBeLessThanOrEqual(13);
    expect(lines.filter((l) => l.from === -1).length).toBeGreaterThanOrEqual(5);
  });
  it('every line leaves a positive charge or arrives from far away, and ends on a negative charge or runs off', () => {
    for (const q of [[1, -1], [1, -2], [2, -1], [1, 1], [-1, -2]]) {
      const srcs = dipole(q[0], q[1]);
      for (const l of fieldLines(srcs, 6)) {
        expect(l.from === -1 || srcs[l.from].q > 0).toBe(true);
        expect(l.to === -1 || srcs[l.to].q < 0).toBe(true);
        expect(l.from === l.to && l.from !== -1).toBe(false); // no loop back to the same charge
      }
    }
  });
  it('lines run in the direction of the field (+ towards −)', () => {
    for (const l of fieldLines(dipole(1, -2), 6)) {
      const i = Math.floor(l.pts.length / 2);
      const f = fieldAt(l.pts[i], dipole(1, -2));
      const tx = l.pts[i + 1].x - l.pts[i - 1].x;
      const ty = l.pts[i + 1].y - l.pts[i - 1].y;
      expect(f.x * tx + f.y * ty).toBeGreaterThan(0);
    }
  });
  it('NO two lines of a correct picture ever cross (Exercise 1.7b), for many charge pairs', () => {
    for (const q of [[1, -1], [1, -2], [2, -1], [1, 1], [2, 1], [-1, -2], [2, -3]]) {
      const lines = fieldLines(dipole(q[0], q[1]), 6);
      for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) expect(polylinesCross(lines[i].pts, lines[j].pts)).toBe(false);
    }
  });
  it('segments that really cross are detected, and touching or parallel ones are not', () => {
    expect(segmentsCross({ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }, { x: 2, y: 0 })).toBe(true);
    expect(segmentsCross({ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 2, y: 1 })).toBe(false);
    expect(segmentsCross({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: -1 }, { x: 2, y: 1 })).toBe(false);
  });
});

describe('level 1: spot the flaw', () => {
  it('all four kinds of fault turn up, and are deterministic for a seed', () => {
    const kinds = new Set(seeds.map((s) => (buildLevel(1, lcg(s)) as LevelFlaw).flaw));
    expect(kinds.size).toBe(4);
    expect(buildLevel(1, lcg(5))).toEqual(buildLevel(1, lcg(5)));
  });
  it('a crossing fault really crosses a legitimate line, at the place to tap', () => {
    let seen = 0;
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelFlaw;
      if (l.flaw !== 'cross') continue;
      seen++;
      const extra = l.lines.find((x) => x.extra)!;
      const legit = l.lines.filter((x) => !x.extra);
      expect(legit.some((x) => polylinesCross(x.pts, extra.pts))).toBe(true);
      expect(distToLines(l.at, legit)).toBeLessThan(0.5);
    }
    expect(seen).toBeGreaterThan(3);
  });
  it('a closed loop is a separate closed curve, away from the other lines', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelFlaw;
      if (l.flaw !== 'loop') continue;
      const loop = l.lines.find((x) => x.extra)!;
      expect(dist(loop.pts[0], loop.pts[loop.pts.length - 1])).toBeLessThan(1e-9);
      expect(l.lines.filter((x) => !x.extra).some((x) => polylinesCross(x.pts, loop.pts))).toBe(false);
    }
  });
  it('a broken line stops in empty space, nowhere near a charge', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelFlaw;
      if (l.flaw !== 'gap') continue;
      expect(l.sources.every((c) => dist(c.at, l.at) > 3)).toBe(true);
      expect(l.lines.some((x) => dist(x.pts[x.pts.length - 1], l.at) < 1e-9 && x.to === -1)).toBe(true);
    }
  });
  it('a reversed arrow marks exactly one line, and the tap spot lies on it', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelFlaw;
      if (l.flaw !== 'arrow') continue;
      const rev = l.lines.filter((x) => x.reversed);
      expect(rev).toHaveLength(1);
      expect(distToLines(l.at, rev)).toBeLessThan(0.5);
    }
  });
  it('only a tap near the fault with the matching rule is right', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelFlaw;
      expect(judgeFlaw(l, l.at, l.flaw).ok).toBe(true);
      expect(judgeFlaw(l, { x: l.at.x + 1.5, y: l.at.y }, l.flaw).ok).toBe(true);
      expect(judgeFlaw(l, { x: l.at.x + 8, y: l.at.y }, l.flaw).tapOk).toBe(false);
      const other = (['cross', 'loop', 'gap', 'arrow'] as const).find((k) => k !== l.flaw)!;
      const r = judgeFlaw(l, l.at, other);
      expect(r.ok).toBe(false);
      expect(r.ruleOk).toBe(false);
      expect(r.tapOk).toBe(true);
    }
  });
});

describe('level 2: read the picture', () => {
  it('the answer matches the charges, and the picture is honest: lines at a charge are proportional to its size', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelRead;
      const [a, b] = l.sources;
      const count = (i: number) => l.lines.filter((x) => x.from === i || x.to === i).length;
      const ratio = count(0) / count(1);
      const want = Math.abs(a.q) / Math.abs(b.q);
      expect(Math.abs(ratio - want) / want).toBeLessThan(0.25);
      expect(judgeRead(l, Math.sign(a.q) as 1 | -1, Math.sign(b.q) as 1 | -1, l.stronger).ok).toBe(true);
    }
  });
  it('a wrong sign or a wrong ranking is caught separately', () => {
    const l = buildLevel(2, lcg(3)) as LevelRead;
    const [a, b] = l.sources;
    const sa = Math.sign(a.q) as 1 | -1;
    const sb = Math.sign(b.q) as 1 | -1;
    expect(judgeRead(l, (-sa) as 1 | -1, sb, l.stronger).signsOk).toEqual([false, true]);
    expect(judgeRead(l, sa, (-sb) as 1 | -1, l.stronger).signsOk).toEqual([true, false]);
    expect(judgeRead(l, sa, sb, l.stronger === 'A' ? 'B' : 'A').strongerOk).toBe(false);
  });
  it('equal, larger-A and larger-B charges all appear, with every sign combination', () => {
    const outcomes = new Set<string>();
    const signs = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelRead;
      outcomes.add(l.stronger);
      signs.add(l.sources.map((c) => Math.sign(c.q)).join(','));
    }
    expect(outcomes.size).toBe(3);
    expect(signs.size).toBe(4);
  });
});

describe('level 3: compare the strength', () => {
  it('the three points are clearly different in strength, away from the charges and each other', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelRank;
      const e = strengthsAt(l);
      const sorted = [...e].sort((a, b) => b - a);
      expect(sorted[0] / sorted[1]).toBeGreaterThanOrEqual(1.7 - 1e-9);
      expect(sorted[1] / sorted[2]).toBeGreaterThanOrEqual(1.7 - 1e-9);
      for (const p of l.points) expect(l.sources.every((c) => dist(c.at, p.at) >= 3.5 - 1e-9)).toBe(true);
      expect(new Set(l.points.map((p) => p.name)).size).toBe(3);
    }
  });
  it('the answer lists the points from strongest to weakest, and only that order is right', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelRank;
      const e = strengthsAt(l);
      expect(l.answer.map((i) => e[i])).toEqual([...e].sort((a, b) => b - a));
      expect(judgeRank(l, l.answer).ok).toBe(true);
      expect(judgeRank(l, [...l.answer].reverse()).ok).toBe(false);
      expect(judgeRank(l, l.answer.slice(0, 2)).ok).toBe(false);
    }
  });
  it('counts how many places are right', () => {
    const l = buildLevel(3, lcg(3)) as LevelRank;
    const a = l.answer;
    expect(judgeRank(l, [a[0], a[2], a[1]]).correctPlaces).toBe(1);
  });
});

describe('level 4: does a released charge follow its line?', () => {
  it('a charge on the straight line through the charges stays exactly on the line', () => {
    const srcs = dipole(1, -1);
    for (const p of [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: -12, y: 0 }]) {
      for (const sign of [1, -1] as const) expect(deviation(srcs, p, sign)).toBeLessThan(1e-6);
    }
    const path = releasePath(srcs, { x: 3, y: 0 }, 1);
    expect(path.every((p) => Math.abs(p.y) < 1e-9)).toBe(true);
  });
  it('a charge on a curved line leaves it, because it keeps its inertia', () => {
    expect(deviation(dipole(1, -1), { x: 0, y: 6 }, 1)).toBeGreaterThan(CLEARLY_OFF);
    expect(deviation(dipole(1, -1), { x: 0, y: 9 }, 1)).toBeGreaterThan(CLEARLY_OFF);
  });
  it('every point is clearly one thing or the other, the truth matches, and both answers occur', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelRelease;
      expect(l.points).toHaveLength(6);
      expect(l.follows.some(Boolean)).toBe(true);
      expect(l.follows.some((f) => !f)).toBe(true);
      l.points.forEach((p, i) => {
        const dev = deviation(l.sources, p, l.sign);
        expect(dev <= FOLLOWS || dev >= CLEARLY_OFF).toBe(true);
        expect(l.follows[i]).toBe(dev <= FOLLOWS);
        if (Math.abs(p.y) < 1e-9) expect(l.follows[i]).toBe(true); // on the axis the line is straight
      });
    }
  });
  it('judging the chosen set: missed and extra points are counted', () => {
    const l = buildLevel(4, lcg(3)) as LevelRelease;
    const truth = l.follows.map((f, i) => (f ? i : -1)).filter((i) => i >= 0);
    expect(judgeRelease(l, truth).ok).toBe(true);
    expect(judgeRelease(l, []).missed).toBe(truth.length);
    const wrong = l.follows.findIndex((f) => !f);
    const r = judgeRelease(l, [...truth, wrong]);
    expect(r.ok).toBe(false);
    expect(r.extra).toBe(1);
  });
  it('is deterministic and uses both signs of released charge', () => {
    expect(buildLevel(4, lcg(5))).toEqual(buildLevel(4, lcg(5)));
    expect(new Set(seeds.map((s) => (buildLevel(4, lcg(s)) as LevelRelease).sign)).size).toBe(2);
  });
});

describe('stars and explanations', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(2, 1)).toBe(2);
    expect(starsFor(9, 1)).toBe(1);
  });
  it('every level explains the answer, and level 1 names the broken rule', () => {
    const l1 = buildLevel(1, lcg(3)) as LevelFlaw;
    expect(explainSolution(l1).join(' ')).toContain(FLAW_RULE[l1.flaw].toLowerCase());
    for (const level of [2, 3, 4]) expect(explainSolution(buildLevel(level, lcg(3))).join(' ').length).toBeGreaterThan(150);
  });
});
