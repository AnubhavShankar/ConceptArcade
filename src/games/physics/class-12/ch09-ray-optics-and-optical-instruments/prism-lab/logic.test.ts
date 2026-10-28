import { describe, expect, it } from 'vitest';
import {
  SLIDERS,
  asinD,
  buildGame,
  explainRound,
  indexFromMinDev,
  judgeGel,
  judgePong,
  judgeSweet,
  minDevIncidence,
  minDeviation,
  missText,
  path,
  resultLine,
  sinD,
  testText,
  tirLimit,
  trapped,
  type Game,
} from './logic';
import { rot, trace3 } from './geometry';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const as = <K extends Game['kind']>(g: Game, _kind: K) => g as Extract<Game, { kind: K }>;
const ints = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_, i) => min + i);

describe('the numbers from the textbook', () => {
  it('Exercise 9.6: A = 60° and a minimum deviation of 40° give n = 1.53', () => {
    expect(indexFromMinDev(60, 40)).toBeCloseTo(1.532, 3);
  });
  it('Exercise 9.6: in water (n = 1.33) the same prism deviates least by about 10° instead', () => {
    const n = indexFromMinDev(60, 40);
    expect(minDeviation(60, n, 1.33)).toBeCloseTo(10.0, 0);
  });
  it('Exercise 9.21: A = 60° and n = 1.524 are just totally reflected at the second face for i ≈ 30°', () => {
    expect(tirLimit(60, 1.524)).toBeCloseTo(29.74, 1);
  });
  it('at the minimum deviation the ray crosses symmetrically: r1 = r2 = A/2 and e = i', () => {
    const n = 1.5;
    const i = minDevIncidence(60, n);
    const p = path(60, n, i);
    expect(p.r1).toBeCloseTo(30, 6);
    expect(p.r2).toBeCloseTo(30, 6);
    expect(p.e).toBeCloseTo(i, 6);
  });
  it('two incidences with the same deviation lie symmetrically either side of the sweet spot', () => {
    const n = 1.5;
    const A = 60;
    const i0 = minDevIncidence(A, n);
    const a = path(A, n, i0 - 8);
    expect(a.D).not.toBeNull();
    const b = path(A, n, a.e!);
    expect(b.D).toBeCloseTo(a.D!, 6);
    // the sweet spot lies between the two, near the middle (exactly midway only for a small gap)
    expect(i0).toBeGreaterThan(Math.min(i0 - 8, a.e!));
    expect(i0).toBeLessThan(Math.max(i0 - 8, a.e!));
    expect(Math.abs((i0 - 8 + a.e!) / 2 - i0)).toBeLessThan(1);
    const near = path(A, n, i0 - 2);
    expect(Math.abs((i0 - 2 + near.e!) / 2 - i0)).toBeLessThan(0.05);
  });
});

describe('the drawn beam agrees with the physics', () => {
  it('the angle between the incident and the emergent ray is the deviation D', () => {
    for (const [A, n] of [[60, 1.5], [60, 1.532], [50, 1.6], [70, 1.43]] as [number, number][]) {
      for (let i = 30; i <= 70; i += 5) {
        const tr = trace3(A, n, i);
        if (!tr.out) continue;
        const dot = tr.u[0] * tr.out[0] + tr.u[1] * tr.out[1];
        const angle = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
        expect(angle).toBeCloseTo(tr.p.D!, 4);
      }
    }
  });
  it('at the sweet spot the emergent ray leaves as far below the axis as the incident ray arrives above it', () => {
    const tr = trace3(60, indexFromMinDev(60, 40), 50);
    const angOf = (v: [number, number]) => (Math.atan2(v[1], v[0]) * 180) / Math.PI;
    expect(angOf(tr.u)).toBeCloseTo(-angOf(tr.out!), 4);
  });
  it('a totally reflected ray is turned back into the prism, not out of it', () => {
    const tr = trace3(60, 1.6, 20);
    expect(tr.out).toBeNull();
    expect(tr.tirEnd).not.toBeNull();
    // it ends on the base of the prism, below the point where it struck the second face
    expect(tr.tirEnd![1]).toBeGreaterThan(tr.P2[1]);
  });
  it('rotating a direction by 90° and back is the identity', () => {
    const v = rot(rot([1, 0], 90), -90);
    expect(v[0]).toBeCloseTo(1, 9);
    expect(v[1]).toBeCloseTo(0, 9);
  });
});

describe('every game has three solvable rounds', () => {
  it('level 1: the sweet spot is a whole number of degrees, the index to two decimals, and only that pair wins', () => {
    for (const s of seeds) {
      const g = as(buildGame(1, lcg(s)), 'sweet');
      expect(g.rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(g.charges).toEqual([1, 3, 3]);
      expect(new Set(g.rounds.map((r) => `${r.A}/${r.Dmin}`)).size).toBe(3);
      for (const r of g.rounds) {
        expect(Number.isInteger(r.iSol)).toBe(true);
        expect(minDevIncidence(r.A, r.nSol)).toBeCloseTo(r.iSol, 6);
        expect(r.nSol).toBeGreaterThan(SLIDERS.n.min);
        expect(r.nSol).toBeLessThan(SLIDERS.n.max);
        const iWins = ints(SLIDERS.i.min, SLIDERS.i.max).filter((i) => judgeSweet(r, i, r.nSol).iOk);
        expect(iWins).toEqual([r.iSol]);
        const nWins = Array.from({ length: 51 }, (_, k) => Math.round((1.3 + k * 0.01) * 100) / 100).filter((n) => judgeSweet(r, r.iSol, n).nOk);
        expect(nWins.length).toBeGreaterThanOrEqual(1);
        expect(nWins.length).toBeLessThanOrEqual(2);
        expect(nWins).toContain(Math.round(r.nSol * 100) / 100);
      }
    }
  });
  it('level 2: the sweet spot in the gel is a different angle from the one in air, and only that whole degree wins', () => {
    for (const s of seeds) {
      const g = as(buildGame(2, lcg(s)), 'gel');
      expect(g.rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      for (const r of g.rounds) {
        expect(r.nL).toBeGreaterThan(1);
        expect(r.iSol).toBeLessThan(minDevIncidence(r.A, r.n));
        expect(r.iSol).toBeGreaterThan(SLIDERS.i.min);
        expect(ints(SLIDERS.i.min, SLIDERS.i.max).filter((i) => judgeGel(r, i).ok)).toEqual([Math.round(r.iSol)]);
      }
    }
  });
  it('level 3: the widest bouncing angle is reachable; the winner is one whole degree and anything wider escapes', () => {
    for (const s of seeds) {
      const g = as(buildGame(3, lcg(s)), 'pong');
      for (const r of g.rounds) {
        expect(r.iSol).toBeGreaterThan(SLIDERS.i.min);
        expect(r.iSol).toBeLessThan(SLIDERS.i.max);
        expect(ints(SLIDERS.i.min, SLIDERS.i.max).filter((i) => judgePong(r, i).ok)).toEqual([Math.round(r.iSol)]);
        expect(path(r.A, r.n, Math.ceil(r.iSol) + 2).e).not.toBeNull();
        expect(path(r.A, r.n, Math.round(r.iSol) - 3).e).toBeNull();
      }
    }
  });
  it('every game has a hero with a name, a story and an objective, in plain game words', () => {
    for (const lv of [1, 2, 3]) {
      const g = buildGame(lv, lcg(5));
      expect(g.hero.name.length).toBeGreaterThan(2);
      expect(g.hero.story.length).toBeGreaterThan(60);
      expect(g.hero.objective.length).toBeGreaterThan(30);
      expect(`${g.hero.story} ${g.hero.objective}`).not.toMatch(/\border\b|stock|shop|workshop|customer|inventory|craft/i);
    }
  });
});

describe('the game can be won from the information given', () => {
  it('one test beam 5° off the sweet spot, then the midpoint of i and e (e = D + A − i), lands within half a degree of it', () => {
    for (const s of seeds) {
      for (const r of as(buildGame(1, lcg(s)), 'sweet').rounds) {
        for (const off of [-5, 5]) {
          const i1 = r.iSol + off;
          const D1 = path(r.A, r.nSol, i1).D!;
          const e1 = D1 + r.A - i1;
          expect(Math.abs((i1 + e1) / 2 - r.iSol)).toBeLessThanOrEqual(0.5);
        }
      }
    }
  });
  it('from the sweet spot the index follows exactly: n = sin i / sin(A/2) = sin((A + D)/2) / sin(A/2)', () => {
    for (const r of as(buildGame(1, lcg(7)), 'sweet').rounds) {
      const D = path(r.A, r.nSol, r.iSol).D!;
      expect(D).toBeCloseTo(r.Dmin, 6);
      expect(Math.abs(sinD(r.iSol) / sinD(r.A / 2) - r.nSol)).toBeLessThan(1e-9);
    }
  });
});

describe('judging: classic mistakes do not win', () => {
  it('level 1: the incidence for the apex angle alone, or a wrong index, fails', () => {
    const r = as(buildGame(1, lcg(3)), 'sweet').rounds[0];
    expect(judgeSweet(r, r.A, r.nSol).iOk).toBe(false);
    expect(judgeSweet(r, r.iSol, r.nSol + 0.05).nOk).toBe(false);
    expect(judgeSweet(r, r.iSol, r.nSol).ok).toBe(true);
  });
  it('level 2: the angle that would be right in air is wrong in the gel', () => {
    for (const s of seeds.slice(0, 30)) {
      for (const r of as(buildGame(2, lcg(s)), 'gel').rounds) expect(judgeGel(r, Math.round(minDevIncidence(r.A, r.n))).ok).toBe(false);
    }
  });
  it('level 3: a narrower angle bounces too but is not the objective, a wider one escapes', () => {
    for (const r of as(buildGame(3, lcg(3)), 'pong').rounds) {
      const narrow = Math.round(r.iSol) - 6;
      expect(judgePong(r, narrow)).toMatchObject({ ok: false, trapped: true });
      expect(judgePong(r, Math.round(r.iSol) + 4)).toMatchObject({ ok: false, trapped: false });
      expect(trapped(r, r.iSol)).toBe(true);
    }
  });
});

describe('words: the working and the misses', () => {
  it('every round explains itself with two lines and a result line', () => {
    for (const lv of [1, 2, 3]) {
      const g = buildGame(lv, lcg(11));
      for (let k = 0; k < 3; k++) {
        const lines = explainRound(g, k);
        expect(lines).toHaveLength(2);
        lines.forEach((t) => expect(t.length).toBeGreaterThan(30));
        expect(resultLine(g, k).length).toBeGreaterThan(20);
      }
    }
  });
  it('a miss describes the effect and does not hand over the answer', () => {
    const g1 = buildGame(1, lcg(3));
    const r1 = as(g1, 'sweet').rounds[0];
    expect(missText(g1, 0, { i: r1.iSol + 8, n: r1.nSol })).toMatch(/bent by/);
    expect(missText(g1, 0, { i: r1.iSol + 8, n: r1.nSol })).not.toContain(`${r1.iSol}°`);
    const g3 = buildGame(3, lcg(3));
    const r3 = as(g3, 'pong').rounds[0];
    expect(missText(g3, 0, { i: Math.round(r3.iSol) + 6 })).toMatch(/escapes/);
    expect(missText(g3, 0, { i: Math.round(r3.iSol) - 6 })).toMatch(/bounces back inside/);
  });
  it('a test beam reads out the bend, or says the beam stays inside', () => {
    expect(testText(60, 1.5, 49)).toMatch(/bent by [\d.]+°/);
    expect(testText(60, 1.8, 15)).toMatch(/totally reflected/);
    expect(asinD(sinD(33))).toBeCloseTo(33, 9);
  });
});
