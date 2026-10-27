import { describe, expect, it } from 'vitest';
import { buildLevel, deduce, possibleSigns, pullAccel, reaction, REACH, scoreTags, simpleScanCost, starsForRun, type Probe, type Sign } from './logic';

const lcg = (seed: number) => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const SIGNS: Sign[] = [1, -1, 0];

describe('reaction', () => {
  it('like repels, unlike attracts', () => {
    expect(reaction(1, 1)).toBe('repel');
    expect(reaction(-1, -1)).toBe('repel');
    expect(reaction(1, -1)).toBe('attract');
    expect(reaction(-1, 1)).toBe('attract');
  });
  it('a neutral body is attracted by a charged rod of either sign', () => {
    expect(reaction(1, 0)).toBe('attract');
    expect(reaction(-1, 0)).toBe('attract');
    expect(reaction(0, 1)).toBe('attract');
  });
  it('two neutral bodies do nothing', () => {
    expect(reaction(0, 0)).toBe('none');
  });
});

describe('pullAccel', () => {
  it('attract pulls toward the rod, repel pushes away', () => {
    expect(pullAccel('attract', 100, 100)).toBeGreaterThan(0); // rod to the right: pulled right
    expect(pullAccel('attract', -100, 100)).toBeLessThan(0);
    expect(pullAccel('repel', 100, 100)).toBeLessThan(0); // pushed left, away
    expect(pullAccel('repel', -100, 100)).toBeGreaterThan(0);
  });
  it('fades to zero smoothly at the edge of its reach (no sudden jump)', () => {
    expect(Math.abs(pullAccel('attract', REACH - 0.5, REACH - 0.5))).toBeLessThan(20);
    expect(pullAccel('attract', REACH, REACH)).toBe(0);
  });
  it('a rod parked at the bottom of the scene cannot move any sphere', () => {
    // Sphere rest height 180 below the ceiling bar, rod parked 136 px below that: out of reach.
    expect(pullAccel('attract', 0, 136)).toBe(0);
    expect(pullAccel('repel', 60, 150)).toBe(0);
  });
  it('is zero for no reaction and out of reach', () => {
    expect(pullAccel('none', 50, 50)).toBe(0);
    expect(pullAccel('repel', REACH + 1, REACH + 1)).toBe(0);
  });
  it('is stronger when closer', () => {
    expect(Math.abs(pullAccel('attract', 50, 50))).toBeGreaterThan(Math.abs(pullAccel('attract', 100, 100)));
  });
  it('FAIRNESS: attraction to a neutral sphere is as strong as to an oppositely charged one', () => {
    // If it were weaker, the player could read the sphere's sign off the size of the swing.
    const toNeutral = pullAccel(reaction(1, 0), 80, 90);
    const toOpposite = pullAccel(reaction(1, -1), 80, 90);
    expect(toNeutral).toBe(toOpposite);
    expect(pullAccel(reaction(-1, 0), 80, 90)).toBe(pullAccel(reaction(-1, 1), 80, 90));
  });
});

describe('deduction', () => {
  it('probing a sphere with a + rod and a − rod always pins down its sign', () => {
    for (const truth of SIGNS) {
      const obs = [1, -1].map((rodSign) => ({ rodSign: rodSign as Sign, reaction: reaction(rodSign as Sign, truth) }));
      expect(possibleSigns(obs)).toEqual([truth]);
    }
  });
  it('a single + probe is not enough to tell negative from neutral (attraction deceives)', () => {
    expect(possibleSigns([{ rodSign: 1, reaction: 'attract' }]).sort()).toEqual([-1, 0].sort());
  });
  it('a push is conclusive: only a like charge repels', () => {
    expect(possibleSigns([{ rodSign: 1, reaction: 'repel' }])).toEqual([1]);
    expect(possibleSigns([{ rodSign: -1, reaction: 'repel' }])).toEqual([-1]);
  });
  it('being attracted by BOTH rods means neutral', () => {
    expect(possibleSigns([{ rodSign: 1, reaction: 'attract' }, { rodSign: -1, reaction: 'attract' }])).toEqual([0]);
  });
  it('no observations leaves all three possible', () => {
    expect(possibleSigns([])).toHaveLength(3);
  });
});

describe('buildLevel: incremental levels', () => {
  it('level 1: exactly one of each and a + and a − rod', () => {
    for (let s = 1; s < 40; s++) {
      const l = buildLevel(1, lcg(s));
      expect([...l.spheres].sort()).toEqual([-1, 0, 1]);
      expect(l.rods.map((r) => r.sign)).toEqual([1, -1]);
      expect(l.reference || l.tagRod).toBe(false);
    }
  });
  it('level 2: four spheres, at least one neutral and one charged, counts not fixed', () => {
    const shapes = new Set<string>();
    for (let s = 1; s < 80; s++) {
      const l = buildLevel(2, lcg(s));
      expect(l.spheres).toHaveLength(4);
      expect(l.spheres).toContain(0);
      expect(l.spheres.some((x) => x !== 0)).toBe(true);
      shapes.add([...l.spheres].sort().join(','));
    }
    expect(shapes.size).toBeGreaterThan(2); // different mixes, so "one of each" can't be assumed
  });
  it('level 3: five spheres with all three kinds; rods are glass (+) and plastic (−) shown by material', () => {
    for (let s = 1; s < 40; s++) {
      const l = buildLevel(3, lcg(s));
      expect(l.spheres).toHaveLength(5);
      expect([1, -1, 0].every((k) => l.spheres.includes(k as Sign))).toBe(true);
      expect(l.rods.map((r) => [r.id, r.sign, r.style])).toEqual([['glass', 1, 'material'], ['plastic', -1, 'material']]);
    }
  });
  it('level 4: unknown rod signs are opposite and vary; reference sphere and rod tag are on', () => {
    const xSigns = new Set<number>();
    for (let s = 1; s < 60; s++) {
      const l = buildLevel(4, lcg(s));
      expect(l.rods[0].sign + l.rods[1].sign).toBe(0);
      expect(l.rods.every((r) => r.style === 'letter')).toBe(true);
      expect(l.reference).toBe(true);
      expect(l.tagRod).toBe(true);
      xSigns.add(l.rods[0].sign);
    }
    expect(xSigns.size).toBe(2);
  });
  it('every level is solvable: both rods on every sphere identify it uniquely', () => {
    for (const level of [1, 2, 3, 4]) {
      for (let s = 1; s < 30; s++) {
        const l = buildLevel(level, lcg(s));
        for (const truth of l.spheres) {
          const obs = l.rods.map((r) => ({ rodSign: r.sign, reaction: reaction(r.sign, truth) }));
          expect(possibleSigns(obs)).toEqual([truth]);
        }
      }
    }
  });
  it('is deterministic for a seed', () => {
    for (const level of [1, 2, 3, 4]) expect(buildLevel(level, lcg(3))).toEqual(buildLevel(level, lcg(3)));
  });
  it('levels get harder: more spheres, then convention, then unknown rods', () => {
    const sizes = [1, 2, 3, 4].map((l) => buildLevel(l, lcg(1)).spheres.length);
    expect(sizes[0]).toBeLessThan(sizes[1]);
    expect(sizes[1]).toBeLessThan(sizes[2]);
  });
});

describe('scoring', () => {
  it('simpleScanCost: a + sphere costs 1 probe, anything else 2, calibration adds 1', () => {
    expect(simpleScanCost([1, -1, 0])).toBe(5);
    expect(simpleScanCost([0, 0, -1, -1])).toBe(8);
    expect(simpleScanCost([1, -1, 0], true)).toBe(6);
  });
  it('the scan strategy really does solve every assignment in that many probes', () => {
    for (const truth of SIGNS) {
      let probes = 1;
      let r = reaction(1, truth);
      if (r !== 'repel') {
        probes++;
        r = reaction(-1, truth);
      }
      expect(probes).toBe(simpleScanCost([truth]));
    }
  });
  it('stars: efficient is 3, a little extra is 2, wasteful is 1', () => {
    expect(starsForRun(5, 5, 0)).toBe(3);
    expect(starsForRun(7, 5, 0)).toBe(2);
    expect(starsForRun(9, 5, 0)).toBe(1);
  });
  it('each wrong submission costs a star but never below 1', () => {
    expect(starsForRun(5, 5, 1)).toBe(2);
    expect(starsForRun(5, 5, 2)).toBe(1);
    expect(starsForRun(5, 5, 5)).toBe(1);
  });
  it('scoreTags counts correct tags and requires all to be filled', () => {
    expect(scoreTags([1, -1, 0], [1, -1, 0])).toMatchObject({ correct: 3, allCorrect: true, complete: true });
    expect(scoreTags([1, -1, 0], [1, 0, -1])).toMatchObject({ correct: 1, allCorrect: false, complete: true });
    expect(scoreTags([1, -1, 0], [1, null, 0]).complete).toBe(false);
  });
});

// ---- the notebook must PROVE a label before the game accepts it ------------------------------

/** Probes a student would make: each listed rod on each listed target, with the reaction the rules give. */
const probe = (level: ReturnType<typeof buildLevel>, rod: number, target: number | 'ref'): Probe => {
  const sign: Sign = target === 'ref' ? 1 : level.spheres[target];
  return { rod, target, reaction: reaction(level.rods[rod].sign, sign) };
};

describe('deduce: a lucky guess is not a deduction', () => {
  const L1 = { rods: buildLevel(1, lcg(1)).rods, reference: false, oneOfEach: true };
  const L2 = { rods: buildLevel(2, lcg(1)).rods, reference: false, oneOfEach: false };

  it('with no probes nothing is proven', () => {
    expect(deduce(L2, 4, []).spheres).toEqual([null, null, null, null]);
  });

  it('a push is proof in one probe', () => {
    expect(deduce(L2, 2, [{ rod: 0, target: 0, reaction: 'repel' }]).spheres).toEqual([1, null]);
    expect(deduce(L2, 2, [{ rod: 1, target: 1, reaction: 'repel' }]).spheres).toEqual([null, -1]);
  });

  it('attraction by one rod is NOT proof (negative and neutral both attract a + rod)', () => {
    expect(deduce(L2, 1, [{ rod: 0, target: 0, reaction: 'attract' }]).spheres).toEqual([null]);
  });

  it('attraction by BOTH rods proves neutral; attract-then-push proves negative', () => {
    expect(deduce(L2, 1, [{ rod: 0, target: 0, reaction: 'attract' }, { rod: 1, target: 0, reaction: 'attract' }]).spheres).toEqual([0]);
    expect(deduce(L2, 1, [{ rod: 0, target: 0, reaction: 'attract' }, { rod: 1, target: 0, reaction: 'repel' }]).spheres).toEqual([-1]);
  });

  it('level 1: probing only sphere A cannot prove B or C, even though "one of each" narrows them', () => {
    const l = { ...buildLevel(1, lcg(1)) };
    const probes = [0, 1].map((r) => probe(l, r, 0));
    const d = deduce(L1, 3, probes);
    expect(d.spheres[0]).toBe(l.spheres[0]);
    expect(d.spheres[1]).toBeNull();
    expect(d.spheres[2]).toBeNull();
  });

  it('level 1: the one-of-each rule lets the last sphere be deduced without probing it', () => {
    for (let s = 1; s < 30; s++) {
      const l = buildLevel(1, lcg(s));
      // Fully identify spheres 0 and 1, never touch sphere 2.
      const probes = [probe(l, 0, 0), probe(l, 1, 0), probe(l, 0, 1), probe(l, 1, 1)];
      const d = deduce(L1, 3, probes);
      expect(d.spheres).toEqual([l.spheres[0], l.spheres[1], l.spheres[2]]);
    }
  });

  it('is never wrong: whatever is "proven" equals the truth, for every level and many seeds', () => {
    for (const level of [1, 2, 3, 4]) {
      for (let s = 1; s < 40; s++) {
        const l = buildLevel(level, lcg(s));
        const rng = lcg(s + 100);
        const probes: Probe[] = [];
        for (let k = 0; k < 14; k++) {
          const target = l.reference && rng() < 0.3 ? 'ref' : Math.floor(rng() * l.spheres.length);
          probes.push(probe(l, Math.floor(rng() * 2), target));
          const d = deduce(l, l.spheres.length, probes);
          d.spheres.forEach((v, i) => v !== null && expect(v).toBe(l.spheres[i]));
          if (d.rodX !== null) expect(d.rodX).toBe(l.rods[0].sign);
        }
      }
    }
  });

  it('probing every sphere with both rods proves everything on levels 1 to 3', () => {
    for (const level of [1, 2, 3]) {
      for (let s = 1; s < 30; s++) {
        const l = buildLevel(level, lcg(s));
        const probes = l.spheres.flatMap((_, i) => [probe(l, 0, i), probe(l, 1, i)]);
        expect(deduce(l, l.spheres.length, probes).spheres).toEqual(l.spheres);
      }
    }
  });
});

describe('deduce: level 4 needs calibration first', () => {
  it('without probing the reference sphere the rod signs are unknown, so no CHARGED sphere can be proven', () => {
    for (let s = 1; s < 30; s++) {
      const l = buildLevel(4, lcg(s));
      const probes = l.spheres.flatMap((_, i) => [probe(l, 0, i), probe(l, 1, i)]);
      const d = deduce(l, l.spheres.length, probes);
      expect(d.rodX).toBeNull();
      d.spheres.forEach((v, i) => {
        if (l.spheres[i] !== 0) expect(v).toBeNull(); // + or − needs the calibration
        else expect(v).toBe(0); // but a sphere both rods attract is neutral whichever rod is which
      });
    }
  });
  it('after calibrating on the reference, everything probed with both rods is proven, and rod X is known', () => {
    for (let s = 1; s < 30; s++) {
      const l = buildLevel(4, lcg(s));
      const probes = [probe(l, 0, 'ref'), ...l.spheres.flatMap((_, i) => [probe(l, 0, i), probe(l, 1, i)])];
      const d = deduce(l, l.spheres.length, probes);
      expect(d.rodX).toBe(l.rods[0].sign);
      expect(d.spheres).toEqual(l.spheres);
    }
  });
  it('a push by the reference tells you that rod is positive; an attraction tells you it is negative', () => {
    const rods = buildLevel(4, lcg(1)).rods;
    const L4 = { rods, reference: true, oneOfEach: false };
    expect(deduce(L4, 1, [{ rod: 0, target: 'ref', reaction: 'repel' }]).rodX).toBe(1);
    expect(deduce(L4, 1, [{ rod: 0, target: 'ref', reaction: 'attract' }]).rodX).toBe(-1);
  });
});
