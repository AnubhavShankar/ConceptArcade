import { describe, expect, it } from 'vitest';
import { BARRIER_HIT, BARRIER_START, PACK_STEP, SIZE_HIT, SIZE_START, barrierEffect, packRadius } from './logic';
import { TWIN_MATCH, TWIN_ROWS, TWIN_SLIDERS, TWIN_START, judgeTwin, nuclideName, nuclideSymbol, sub, sup, twinExplain, twinExtraOk, twinIntel, twinMiss, twinReading, twinRelationOk, twinRound, twinRounds, twinWin } from './logic';
import { DECAY_START, PARTICLE, SLIDERS, barrierExplain, barrierKeV, barrierMiss, barrierReading, barrierRounds, decayExplain, decayMiss, decayReading, decayRounds, judgeBarrier, judgeDecay, judgeSize, radiusFm, sizeExplain, sizeMiss, sizeReading, sizeRounds } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const grid = (min: number, max: number, step: number) => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => Math.round((min + i * step) * 1e6) / 1e6);

describe('the numbers from the textbook', () => {
  it('Exercise 13.4: the radius ratio of gold-197 to silver-107 is about 1.23', () => {
    expect(radiusFm(197) / radiusFm(107)).toBeCloseTo(1.2256, 3);
  });
  it('Exercise 13.10: the density A m_u / (4/3 π R₀³ A) does not depend on A', () => {
    const rho = (a: number) => (a * 1.66e-27) / ((4 / 3) * Math.PI * (radiusFm(a) * 1e-15) ** 3);
    expect(rho(16) / rho(238)).toBeCloseTo(1, 9);
    expect(rho(56)).toBeCloseTo(2.3e17, -16);
  });
  it('Exercise 13.9: two deuterons of radius 2.0 fm have a barrier of 360 keV', () => {
    expect(barrierKeV(1, 1, 4)).toBeCloseTo(360, 6);
  });
  it('α, β⁻ and β⁺ decay conserve A and Z: ²³⁸U → ²³⁴Th, ¹⁴C → ¹⁴N, ¹¹C → ¹¹B', () => {
    const rounds = decayRounds(() => 0.3);
    expect(rounds.map((r) => r.kind)).toEqual(['alpha', 'beta-', 'beta+']);
    for (const r of rounds) {
      expect(r.aSol + PARTICLE[r.kind].a).toBe(r.a);
      expect(r.zSol + PARTICLE[r.kind].z).toBe(r.z);
    }
  });
});

describe('level 3: the β⁺ rows, checked against an independent table of atomic numbers', () => {
  // [parent name, parent A, parent Z, daughter name, daughter A, daughter Z]: N is 7, O is 8, F is 9, C is 6, B is 5, and a β⁺ decay turns a proton into a neutron
  const TABLE: [string, number, number, number, number][] = [
    ['carbon-11', 11, 6, 11, 5],
    ['nitrogen-13', 13, 7, 13, 6],
    ['oxygen-15', 15, 8, 15, 7],
    ['fluorine-18', 18, 9, 18, 8],
  ];
  it('every β⁺ parent in the pool has the right Z, and its daughter has the same A and one fewer proton', () => {
    const seen = new Set<string>();
    for (let s = 0; s < 300; s++) {
      const r = decayRounds(lcg(s * 7919 + 13))[2];
      expect(r.kind).toBe('beta+');
      const row = TABLE.find((t) => t[0] === r.name);
      expect(row).toBeDefined();
      expect([r.a, r.z]).toEqual([row![1], row![2]]);
      expect([r.aSol, r.zSol]).toEqual([row![3], row![4]]);
      // the proton count falls by one and a positron (A = 0, Z = +1) leaves, so both numbers balance
      expect(r.aSol + PARTICLE['beta+'].a).toBe(r.a);
      expect(r.zSol + PARTICLE['beta+'].z).toBe(r.z);
      seen.add(r.name);
    }
    expect([...seen].sort()).toEqual(TABLE.map((t) => t[0]).sort());
  });
  it('round 3 is no longer always the same answer, and rounds 1 and 2 never fix round 3', () => {
    const answers = new Set<string>();
    const third = new Map<string, Set<string>>();
    for (let s = 0; s < 400; s++) {
      const [a, b, c] = decayRounds(lcg(s * 7919 + 13));
      answers.add(`${c.aSol},${c.zSol}`);
      third.set(`${a.name},${b.name}`, (third.get(`${a.name},${b.name}`) ?? new Set()).add(c.name));
    }
    expect(answers.size).toBe(4);
    expect([...third.values()].every((v) => v.size >= 2)).toBe(true);
  });
  it('the dials start where no pool row is won, and every round still has exactly one winning pair', () => {
    for (const s of seeds) {
      for (const r of decayRounds(lcg(s))) {
        expect(judgeDecay(r, DECAY_START.a, DECAY_START.z).ok).toBe(false);
        expect(judgeDecay(r, DECAY_START.a, DECAY_START.z).aOk).toBe(false);
        expect(judgeDecay(r, DECAY_START.a, DECAY_START.z).zOk).toBe(false);
        let winners = 0;
        for (const a of grid(SLIDERS.a.min, SLIDERS.a.max, SLIDERS.a.step)) for (const z of grid(SLIDERS.z.min, SLIDERS.z.max, SLIDERS.z.step)) if (judgeDecay(r, a, z).ok) winners++;
        expect(winners).toBe(1);
      }
    }
  });
});

describe('every level has three solvable rounds', () => {
  it('level 1: three nuclei by increasing A; the radius is reachable and the dial winners are a short run', () => {
    for (const s of seeds) {
      const rounds = sizeRounds(lcg(s));
      expect(rounds.map((r) => r.a)).toEqual([...rounds.map((r) => r.a)].sort((a, b) => a - b));
      expect(new Set(rounds.map((r) => r.a)).size).toBe(3);
      for (const r of rounds) {
        expect(r.sol).toBeGreaterThan(SLIDERS.r.min);
        expect(r.sol).toBeLessThan(SLIDERS.r.max);
        const winners = grid(SLIDERS.r.min, SLIDERS.r.max, SLIDERS.r.step).filter((x) => judgeSize(r, x));
        expect(winners.length).toBeGreaterThanOrEqual(5);
        expect(winners.length).toBeLessThanOrEqual(7);
        expect(winners).toContain(Math.round(r.sol * 100) / 100);
      }
    }
  });
  it('level 2: three distinct barriers in increasing height, each reachable on the dial', () => {
    for (const s of seeds) {
      const rounds = barrierRounds(lcg(s));
      expect(rounds.map((r) => r.sol)).toEqual([...rounds.map((r) => r.sol)].sort((a, b) => a - b));
      expect(new Set(rounds.map((r) => r.sol)).size).toBe(3);
      for (const r of rounds) {
        expect(r.sol).toBeGreaterThan(SLIDERS.u.min);
        expect(r.sol).toBeLessThan(SLIDERS.u.max);
        const winners = grid(SLIDERS.u.min, SLIDERS.u.max, SLIDERS.u.step).filter((u) => judgeBarrier(r, u));
        expect(winners.length).toBeGreaterThanOrEqual(5);
      }
    }
  });
  it('level 3: one α, one β⁻ and one β⁺ decay, and exactly one (A, Z) pair wins each', () => {
    for (const s of seeds) {
      const rounds = decayRounds(lcg(s));
      expect(rounds.map((r) => r.kind)).toEqual(['alpha', 'beta-', 'beta+']);
      for (const r of rounds) {
        expect(r.aSol).toBeGreaterThan(0);
        expect(r.zSol).toBeGreaterThan(0);
        const winners: [number, number][] = [];
        for (const a of grid(SLIDERS.a.min, SLIDERS.a.max, SLIDERS.a.step)) for (const z of [r.zSol - 1, r.zSol, r.zSol + 1]) if (judgeDecay(r, a, z).ok) winners.push([a, z]);
        expect(winners).toEqual([[r.aSol, r.zSol]]);
      }
    }
  });
});

describe('judging: classic mistakes do not win', () => {
  it('level 1: R₀A (not the cube root) or the radius of the wrong nucleus fails', () => {
    for (const r of sizeRounds(lcg(3))) {
      expect(judgeSize(r, Math.min(9, 1.2 * r.a))).toBe(false);
      expect(judgeSize(r, radiusFm(r.a * 2))).toBe(false);
    }
  });
  it('level 2: using one radius for the distance, or forgetting a charge, fails', () => {
    for (const r of barrierRounds(lcg(3))) {
      expect(judgeBarrier(r, r.sol * 2)).toBe(false);
      expect(judgeBarrier(r, r.sol / (r.z1 * r.z2 === 1 ? 2 : r.z1 * r.z2))).toBe(false);
    }
  });
  it('level 3: leaving A or Z as the parent’s, or flipping the β sign, fails', () => {
    for (const r of decayRounds(lcg(3))) {
      expect(judgeDecay(r, r.a, r.z).ok).toBe(false);
      expect(judgeDecay(r, r.aSol, r.z + PARTICLE[r.kind].z).ok).toBe(PARTICLE[r.kind].z === 0 ? true : false);
      expect(judgeDecay(r, r.aSol, r.zSol).ok).toBe(true);
    }
  });
});

describe('words: the working and the misses', () => {
  it('the working names the exercise or the example', () => {
    expect(sizeExplain(sizeRounds(lcg(3))[0])[1]).toMatch(/Exercises 13\.4, 13\.10; Example 13\.1/);
    expect(barrierExplain(barrierRounds(lcg(3))[0])[1]).toMatch(/Exercise 13\.9/);
    expect(decayExplain(decayRounds(lcg(3))[0])[1]).toMatch(/Example 13\.4/);
  });
  it('a miss describes the effect and never states the answer', () => {
    const s = sizeRounds(lcg(3))[0];
    expect(sizeMiss(s, s.sol * 1.5)).toMatch(/bigger than the real one/);
    expect(sizeMiss(s, s.sol / 1.5)).toMatch(/smaller than the real one/);
    const b = barrierRounds(lcg(3))[0];
    expect(barrierMiss(b, b.sol * 2)).toMatch(/too high/);
    expect(barrierMiss(b, b.sol / 2)).toMatch(/too low/);
    const d = decayRounds(lcg(3))[0];
    expect(decayMiss(d, d.aSol, d.zSol + 3)).toMatch(/the same number of nucleons and a higher total charge/);
    expect(decayMiss(d, d.aSol + 3, d.zSol)).toMatch(/more nucleons than before and the same total charge/);
    expect(decayMiss(d, 1, 1)).toMatch(/fewer nucleons than before and a lower total charge/);
  });
  it('level 3: a decay miss gives only the direction of each count, in fixed words, and never a number', () => {
    for (const s of seeds.slice(0, 20)) {
      for (const r of decayRounds(lcg(s))) {
        const words = new Set<string>();
        for (const a of grid(SLIDERS.a.min, SLIDERS.a.max, 7)) for (const z of grid(SLIDERS.z.min, SLIDERS.z.max, 5)) {
          if (judgeDecay(r, a, z).ok) continue;
          const t = decayMiss(r, a, z);
          words.add(t);
          expect(t).not.toMatch(/\d/);
        }
        // nine side pairs at most, the same sentence for every setting on one side
        expect(words.size).toBeLessThanOrEqual(9);
        for (const t of words) expect(t).toMatch(/^After that decay there would be /);
      }
    }
  });
  it('test shots read out the helpful numbers', () => {
    expect(sizeReading(sizeRounds(lcg(3))[0])).toMatch(/A\^⅓ for A = \d+ is/);
    expect(barrierReading(barrierRounds(lcg(3))[0], 300)).toMatch(/repulsion energy/);
    expect(decayReading(decayRounds(lcg(3))[0])).toMatch(/α-particle.*mass number 4 and charge \+2/);
  });
});

describe('levels 1 and 2: the start never wins, the hit point is fixed, and a miss shows fixed effects that depend only on the side', () => {
  const seeds80 = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
  // the scene's own mappings (index.ts): radius → x on level 1, (touching distance, height) → (x, y) on level 2
  const sizeX = (rad: number) => 330 + 20 * rad;
  const barX = (d: number) => 60 + (d - 1.5) * 90;
  const barY = (u: number) => 290 - (u / 2000) * 230;

  it('the start radius and the start barrier never win any round, for any nucleus or pair', () => {
    for (const s of seeds80) {
      for (const r of sizeRounds(lcg(s))) expect(judgeSize(r, SIZE_START)).toBe(false);
      for (const r of barrierRounds(lcg(s))) expect(judgeBarrier(r, BARRIER_START)).toBe(false);
    }
    for (const a of [107, 197, 238, 56, 16]) expect(Math.abs(SIZE_START - radiusFm(a))).toBeGreaterThan(1);
  });

  it('the hit points are fixed and are never the answer position', () => {
    for (const s of seeds80) {
      for (const r of sizeRounds(lcg(s))) expect(Math.abs(SIZE_HIT[0] - sizeX(r.sol))).toBeGreaterThan(20);
      for (const r of barrierRounds(lcg(s))) {
        expect(Math.hypot(BARRIER_HIT[0] - barX(r.d), BARRIER_HIT[1] - barY(r.sol))).toBeGreaterThan(40);
        expect(BARRIER_HIT[1]).not.toBeCloseTo(barY(r.sol), -1);
      }
    }
  });

  it('level 1: on a miss the pack is a fixed step off the player’s own ring, on the right side; the true radius shows only on a win', () => {
    for (const s of seeds80) {
      for (const r of sizeRounds(lcg(s))) {
        for (const rad of grid(SLIDERS.r.min, SLIDERS.r.max, SLIDERS.r.step)) {
          const ok = judgeSize(r, rad);
          const pack = packRadius(r, rad, ok);
          if (ok) expect(pack).toBe(r.sol);
          else if (rad > r.sol) {
            expect(pack - rad).toBeCloseTo(-PACK_STEP, 9);
            expect(sizeMiss(r, rad)).toBe(sizeMiss(r, r.sol * 1.5));
          } else {
            expect(pack - rad).toBeCloseTo(PACK_STEP, 9);
            expect(sizeMiss(r, rad)).toBe(sizeMiss(r, r.sol / 1.5));
          }
        }
      }
    }
  });

  it('level 2: three fixed effects, one per side, and the same words for every setting on a side', () => {
    for (const s of seeds80) {
      for (const r of barrierRounds(lcg(s))) {
        const seen: Record<string, Set<string>> = { meet: new Set(), bounce: new Set(), overshoot: new Set() };
        for (const u of grid(SLIDERS.u.min, SLIDERS.u.max, SLIDERS.u.step)) {
          const eff = barrierEffect(r, u);
          expect(eff === 'meet').toBe(judgeBarrier(r, u));
          if (eff === 'bounce') expect(u).toBeGreaterThan(r.sol);
          if (eff === 'overshoot') expect(u).toBeLessThan(r.sol);
          seen[eff].add(eff === 'meet' ? '' : barrierMiss(r, u));
        }
        expect(seen.bounce.size).toBe(1);
        expect(seen.overshoot.size).toBe(1);
        expect([...seen.bounce][0]).toMatch(/too high/);
        expect([...seen.overshoot][0]).toMatch(/too low/);
      }
    }
  });
});

describe('level 4: nuclide twins (Section 13.2)', () => {
  const seeds80 = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
  /** The brief's table: [reference, relation, extra, Z, N, name]. */
  const BRIEF: [string, string, string, number, number, string][][] = [
    [['³⁵₁₇Cl', 'isotope', 'with 20 neutrons', 17, 20, '³⁷Cl'], ['⁵⁶₂₆Fe', 'isotope', 'with mass number 54', 26, 28, '⁵⁴Fe'], ['¹₁H', 'isotope', 'with mass number 3', 1, 2, '³H']],
    [['¹⁴₆C', 'isobar', 'with Z = 7', 7, 7, '¹⁴N'], ['⁴⁰₁₈Ar', 'isobar', 'with Z = 20', 20, 20, '⁴⁰Ca'], ['³₁H', 'isobar', 'with Z = 2', 2, 1, '³He']],
    [['¹⁶₈O', 'isotone', 'with mass number 17', 9, 8, '¹⁷F'], ['¹³₆C', 'isotone', 'with Z = 7', 7, 7, '¹⁴N'], ['⁴⁰₁₈Ar', 'isotone', 'with mass number 42', 20, 22, '⁴²Ca']],
  ];
  const ELEMENT: Record<number, string> = { 1: 'H', 2: 'He', 6: 'C', 7: 'N', 8: 'O', 9: 'F', 17: 'Cl', 18: 'Ar', 20: 'Ca', 26: 'Fe' };
  const zs = grid(TWIN_SLIDERS.z.min, TWIN_SLIDERS.z.max, TWIN_SLIDERS.z.step);
  const ns = grid(TWIN_SLIDERS.n.min, TWIN_SLIDERS.n.max, TWIN_SLIDERS.n.step);

  it('every row is verified numerically against the book’s definitions, and matches the brief’s table', () => {
    expect(TWIN_ROWS.map((g) => g.length)).toEqual([3, 3, 3]);
    TWIN_ROWS.forEach((rows, k) =>
      rows.forEach((row, j) => {
        const r = twinRound(row, k);
        const [ref, relation, extra, z, n, name] = BRIEF[k][j];
        expect([r.ref, r.relation, r.extra, r.z, r.n, r.name]).toEqual([ref, relation, extra, z, n, name]);
        const refN = row.refA - row.refZ;
        const a = z + n;
        // the relations of Section 13.2
        if (relation === 'isotope') expect(z).toBe(row.refZ);
        if (relation === 'isobar') expect(a).toBe(row.refA);
        if (relation === 'isotone') expect(n).toBe(refN);
        // the extra fact
        if (extra.startsWith('with mass number')) expect(a).toBe(Number(extra.replace('with mass number ', '')));
        else if (extra.startsWith('with Z =')) expect(z).toBe(Number(extra.replace('with Z = ', '')));
        else expect(n).toBe(Number(/with (\d+) neutrons/.exec(extra)![1]));
        // each family has exactly one of the three numbers in common, and the clue is not the reference itself
        const same = [z === row.refZ, a === row.refA, n === refN].filter(Boolean).length;
        expect(same).toBe(1);
        expect([z, n]).not.toEqual([row.refZ, refN]);
        // the symbols: A and Z, and the element letters for Z
        expect(row.refSym).toBe(ELEMENT[row.refZ]);
        expect(row.sym).toBe(ELEMENT[z]);
        expect(name).toBe(`${sup(a)}${ELEMENT[z]}`);
        expect(ref).toBe(`${sup(row.refA)}${sub(row.refZ)}${ELEMENT[row.refZ]}`);
        expect(nuclideSymbol(row.refA, row.refZ, row.refSym)).toBe(ref);
        expect(nuclideName(a, row.sym)).toBe(name);
        // on the dials
        expect(z).toBeGreaterThanOrEqual(TWIN_SLIDERS.z.min);
        expect(z).toBeLessThanOrEqual(TWIN_SLIDERS.z.max);
        expect(n).toBeGreaterThanOrEqual(TWIN_SLIDERS.n.min);
        expect(n).toBeLessThanOrEqual(TWIN_SLIDERS.n.max);
        // the relation is the round's relation
        expect(relation).toBe(['isotope', 'isobar', 'isotone'][k]);
      }),
    );
    expect(sup(1205)).toBe('¹²⁰⁵');
    expect(sub(1705)).toBe('₁₇₀₅');
  });

  it('three rounds with fading help, drawn from the right group, over 80 seeds', () => {
    for (const s of seeds80) {
      const rounds = twinRounds(lcg(s));
      expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(rounds.map((r) => r.relation)).toEqual(['isotope', 'isobar', 'isotone']);
      rounds.forEach((r, k) => expect(BRIEF[k].some((b) => b[0] === r.ref && b[5] === r.name)).toBe(true));
    }
  });

  it('exactly one (Z, N) wins each round, the start never wins, and neither condition alone is enough', () => {
    for (const s of seeds80) {
      for (const r of twinRounds(lcg(s))) {
        const winners: [number, number][] = [];
        for (const z of zs) for (const n of ns) if (judgeTwin(r, z, n).ok) winners.push([z, n]);
        expect(winners).toEqual([[r.z, r.n]]);
        expect(zs.filter((z) => judgeTwin(r, z, r.n).ok)).toEqual([r.z]);
        expect(ns.filter((n) => judgeTwin(r, r.z, n).ok)).toEqual([r.n]);
        // the start setting is not the answer, and satisfies neither condition by luck
        expect(judgeTwin(r, TWIN_START.z, TWIN_START.n).ok).toBe(false);
        // the reference nuclide itself fails (the extra fact separates the twin from it)
        expect(judgeTwin(r, r.refZ, r.refA - r.refZ).ok).toBe(false);
        // each condition on its own is satisfied by many settings, so neither is a shortcut to the answer
        expect(zs.flatMap((z) => ns.filter((n) => twinRelationOk(r, z, n))).length).toBeGreaterThan(1);
        expect(zs.flatMap((z) => ns.filter((n) => twinExtraOk(r, z, n))).length).toBeGreaterThan(1);
        // classic mistakes fail: swapping Z and N, or keeping the reference's N
        expect(judgeTwin(r, r.n, r.z).ok).toBe(r.n === r.z);
        expect(judgeTwin(r, r.z, r.refA - r.refZ).ok).toBe(r.n === r.refA - r.refZ);
      }
    }
  });

  it('the three rounds never share an answer, and every skipped pick leaves another row to choose', () => {
    for (const s of Array.from({ length: 300 }, (_, i) => i * 7919 + 13)) {
      const rounds = twinRounds(lcg(s));
      expect(new Set(rounds.map((r) => `${r.z},${r.n}`)).size).toBe(3);
      expect(new Set(rounds.map((r) => r.name)).size).toBe(3);
    }
    // the pools themselves are unchanged: (7, 7) is an answer in both round 2 and round 3, so a pick must be skipped
    expect(TWIN_ROWS[1].some((x) => x.z === 7 && x.n === 7)).toBe(true);
    expect(TWIN_ROWS[2].some((x) => x.z === 7 && x.n === 7)).toBe(true);
    const same = (p: { z: number; n: number }, q: { z: number; n: number }) => p.z === q.z && p.n === q.n;
    for (const w of TWIN_ROWS[0]) {
      expect(TWIN_ROWS[1].some((x) => !same(x, w))).toBe(true);
      for (const x of TWIN_ROWS[1].filter((y) => !same(y, w))) expect(TWIN_ROWS[2].some((y) => !same(y, w) && !same(y, x))).toBe(true);
    }
  });

  it('no row has the start setting as its answer', () => {
    for (const rows of TWIN_ROWS) for (const row of rows) expect([row.z, row.n]).not.toEqual([TWIN_START.z, TWIN_START.n]);
  });

  it('a miss names the first failed condition in the player’s own numbers and never gives the answer', () => {
    for (const s of seeds80) {
      for (const r of twinRounds(lcg(s))) {
        for (const z of zs) {
          for (const n of [0, 7, 10, 18, 20, 22, 28, 35, 40, r.n, r.n + 1, r.refA - r.refZ]) {
            const j = judgeTwin(r, z, n);
            if (j.ok) continue;
            const m = twinMiss(r, z, n);
            const own = `You rolled Z = ${z}, N = ${n}, so A = ${z + n}: that `;
            expect(m.startsWith(own)).toBe(true);
            const rest = m.slice(own.length);
            const rule = r.relation === 'isotope' ? `an isotope of ${r.ref} (Z must match)` : r.relation === 'isobar' ? `an isobar of ${r.ref} (A must match)` : `an isotone of ${r.ref} (N must match)`;
            expect(rest).toBe(j.relOk ? `does not have ${r.extra.replace('with ', '')}.` : `is not ${rule}.`);
            expect(m).not.toContain(r.name);
          }
        }
      }
    }
  });

  it('the test run and the words', () => {
    const r = twinRound(TWIN_ROWS[0][0], 0);
    expect(twinIntel(r)).toBe('Build an isotope of ³⁵₁₇Cl with 20 neutrons. Set the number of protons Z and neutrons N.');
    expect(twinReading(r, 17, 18)).toBe('Test run: same Z as ³⁵₁₇Cl: yes; with 20 neutrons: no.');
    expect(twinReading(r, 16, 20)).toBe('Test run: same Z as ³⁵₁₇Cl: no; with 20 neutrons: yes.');
    expect(TWIN_MATCH).toEqual({ isotope: 'same Z', isobar: 'same A', isotone: 'same N' });
    expect(twinMiss(r, 17, 18)).toBe('You rolled Z = 17, N = 18, so A = 35: that does not have 20 neutrons.');
    expect(twinMiss(r, 16, 20)).toBe('You rolled Z = 16, N = 20, so A = 36: that is not an isotope of ³⁵₁₇Cl (Z must match).');
    expect(twinExplain(r)).toBe('Isotopes share Z = 17; with N = 20, A = Z + N = 37: the nuclide is ³⁷Cl.');
    expect(twinExplain(twinRound(TWIN_ROWS[0][1], 0))).toBe('Isotopes share Z = 26; with A = 54, N = A − Z = 54 − 26 = 28: the nuclide is ⁵⁴Fe.');
    expect(twinExplain(twinRound(TWIN_ROWS[1][2], 1))).toBe('Isobars share A = 3; with Z = 2, N = A − Z = 3 − 2 = 1: ³He.');
    expect(twinExplain(twinRound(TWIN_ROWS[2][0], 2))).toBe('Isotones share N = 8; with A = 17, Z = A − N = 17 − 8 = 9: the nuclide is ¹⁷F.');
    expect(twinExplain(twinRound(TWIN_ROWS[2][1], 2))).toBe('Isotones share N = 7; with Z = 7, A = Z + N = 14: the nuclide is ¹⁴N.');
    expect(twinWin(r)).toBe(`Both clues match! ${twinExplain(r)}`);
  });
});
