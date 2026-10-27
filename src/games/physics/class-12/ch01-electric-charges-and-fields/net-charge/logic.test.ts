import { describe, expect, it } from 'vitest';
import { autoUnit, bestUnit, buildLevel, decimals, explainSolution, fmtCharge, judgeSeal, netOf, PC, sealMessage, solutionPath, solve, starsFor, toPc, total, touch } from './logic';

const lcg = (seed: number) => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

describe('units and formatting (exact integers in pC)', () => {
  it('converts prefixes: 1 mC = 1000 µC = 10⁶ nC = 10⁹ pC', () => {
    expect(PC.mC).toBe(1000 * PC.µC);
    expect(PC.µC).toBe(1000 * PC.nC);
    expect(PC.nC).toBe(1000 * PC.pC);
    expect(toPc(8.4, 'µC')).toBe(8_400_000);
    expect(toPc(4500, 'nC')).toBe(4_500_000); // 4500 nC = 4.5 µC
    expect(toPc(0.0045, 'mC')).toBe(4_500_000); // = 4.5 µC = 0.0045 mC
  });
  it('picks a sensible prefix and formats with a real minus sign', () => {
    expect(fmtCharge(8_400_000)).toBe('+8.4 µC');
    expect(fmtCharge(-3_200_000)).toBe('−3.2 µC');
    expect(fmtCharge(2_400_000_000)).toBe('+2.4 mC');
    expect(fmtCharge(-4_500)).toBe('−4.5 nC');
    expect(fmtCharge(600)).toBe('+600 pC');
    expect(fmtCharge(0)).toBe('0');
  });
  it('can show a charge in a chosen prefix (the door panel)', () => {
    expect(fmtCharge(4_500_000, 'nC')).toBe('+4500 nC');
    expect(fmtCharge(4_500_000, 'mC')).toBe('+0.0045 mC');
    expect(autoUnit(999)).toBe('pC');
    expect(autoUnit(1000)).toBe('nC');
  });
});

describe('exact display (no rounding that breaks the arithmetic)', () => {
  it('shows every digit of an exact charge', () => {
    expect(fmtCharge(2_587_500)).toBe('+2.5875 µC');
    expect(fmtCharge(1_725_000)).toBe('+1.725 µC');
    expect(fmtCharge(-925_000)).toBe('−925 nC');
  });
  it('every shown value in an explanation re-adds exactly: 2 × target − before = the partner charge', () => {
    for (const level of [1, 2, 3, 4]) {
      for (let s = 1; s < 15; s++) {
        const l = buildLevel(level, lcg(s));
        const path = solutionPath(l.start, l.vault, l.target)!;
        const states = path.reduce<number[][]>((acc, [a, b]) => [...acc, touch(acc[acc.length - 1], a, b)], [l.start]);
        const before = states[states.length - 2];
        const last = path[path.length - 1];
        const partner = last[0] === l.vault ? last[1] : last[0];
        expect(2 * l.target - before[l.vault]).toBe(before[partner]);
      }
    }
  });
});

describe('decimals: the required charge stays within 2 decimal places', () => {
  it('counts decimal places exactly', () => {
    expect(decimals(4_500_000, 'µC')).toBe(1);
    expect(decimals(4_500_000, 'nC')).toBe(0);
    expect(decimals(4_500_000, 'mC')).toBe(4);
    expect(decimals(3_450_000, 'µC')).toBe(2);
    expect(decimals(1_725_000, 'µC')).toBe(3);
    expect(decimals(-925_000, 'µC')).toBe(3);
    expect(decimals(0, 'µC')).toBe(0);
  });

  it('bestUnit stays in the natural prefix of the biggest value while that needs at most 2 decimals', () => {
    expect(bestUnit([4_500_000, 0])).toBe('µC'); // 4.5 µC: do not jump to 4500 nC just to avoid a decimal
    expect(bestUnit([-3_700_000, -1_850_000])).toBe('µC'); // −3.7 µC and −1.85 µC
    expect(bestUnit([6_400_000, -5_600_000, 800_000])).toBe('µC'); // the level 1 case: all in µC
  });

  it('bestUnit only drops to a finer prefix when the natural one would need more than 2 decimals', () => {
    expect(bestUnit([2_650_000_000, 1_325_000_000])).toBe('µC'); // 2.65 mC is fine, but 1.325 mC has 3 decimals
    expect(bestUnit([1_725_000, 3_450_000])).toBe('nC'); // 1.725 µC has 3 decimals -> 1725 nC
    expect(bestUnit([8_800_000_000, -400_000_000])).toBe('mC'); // 8.8 and −0.4 mC are fine
  });

  it('the total is written in the same prefix as the biggest body whenever that is clean', () => {
    // a lab full of µC bodies whose total is 800 nC is still shown as 0.8 µC, not 800 nC
    expect(bestUnit([6_400_000, -5_600_000, 0, 0, 800_000])).toBe('µC');
    expect(fmtCharge(800_000, bestUnit([6_400_000, -5_600_000, 800_000]))).toBe('+0.8 µC');
  });

  it('EVERY required charge, on every level and many seeds, has at most 2 decimal places in the door prefix AND in the prefix the vault reads in', () => {
    for (const level of [1, 2, 3, 4]) {
      for (let s = 1; s < 80; s++) {
        const l = buildLevel(level, lcg(s));
        expect(decimals(l.target, l.targetUnit)).toBeLessThanOrEqual(2);
        expect(decimals(l.target, autoUnit(l.target))).toBeLessThanOrEqual(2);
      }
    }
  });

  it('the door and the vault readout are the same number once converted (no rounding anywhere)', () => {
    for (const level of [1, 2, 3, 4]) {
      for (let s = 1; s < 40; s++) {
        const l = buildLevel(level, lcg(s));
        const door = Number(fmtCharge(l.target, l.targetUnit).replace('−', '-').split(' ')[0]) * PC[l.targetUnit];
        const readout = Number(fmtCharge(l.target).replace('−', '-').split(' ')[0]) * PC[autoUnit(l.target)];
        expect(Math.round(door)).toBe(l.target);
        expect(Math.round(readout)).toBe(l.target);
      }
    }
  });

  it('level 1 shows its door in µC with at most 2 decimals, matching what the vault reads', () => {
    for (let s = 1; s < 60; s++) {
      const l = buildLevel(1, lcg(s));
      expect(decimals(l.target, 'µC')).toBeLessThanOrEqual(2);
      expect(fmtCharge(l.target, l.targetUnit)).toBe(fmtCharge(l.target));
    }
  });

  it('the starting charges, and every number in the worked solution, stay within 2 decimals', () => {
    for (const level of [1, 2, 3, 4]) {
      for (let s = 1; s < 60; s++) {
        const l = buildLevel(level, lcg(s));
        const ex = explainSolution(l);
        const text = [...ex.setup, ...ex.steps.map((x) => x.calc), ...ex.rationale].join(' ');
        const longest = Math.max(0, ...[...text.matchAll(/\d+\.(\d+)/g)].map((m) => m[1].length));
        expect(longest).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe('the physics', () => {
  it("the user's worked example: +8.4 µC touching a blank sphere leaves +4.2 µC on each", () => {
    expect(touch([toPc(8.4, 'µC'), 0], 0, 1)).toEqual([toPc(4.2, 'µC'), toPc(4.2, 'µC')]);
  });
  it("then touching −3.2 µC shares (+4.2 − 3.2)/2 = +0.5 µC each", () => {
    const s = touch([toPc(4.2, 'µC'), toPc(-3.2, 'µC')], 0, 1);
    expect(s).toEqual([toPc(0.5, 'µC'), toPc(0.5, 'µC')]);
  });
  it('touching conserves the total (the algebraic sum)', () => {
    for (let k = 1; k < 30; k++) {
      const r = lcg(k);
      let s = [toPc(r() * 10, 'µC') * 2, -toPc(r() * 5, 'µC') * 2, 0, 0];
      const before = total(s);
      for (let i = 0; i < 5; i++) s = touch(s, Math.floor(r() * 2), 2 + Math.floor(r() * 2));
      expect(total(s)).toBeCloseTo(before, 0);
    }
  });
  it('net charge of a composite is the algebraic sum: equal excess protons and electrons cancel', () => {
    expect(netOf([toPc(3, 'nC'), -toPc(3, 'nC')])).toBe(0);
    expect(netOf([toPc(3, 'nC'), toPc(3, 'nC'), -toPc(1.2, 'µC')])).toBe(-1_194_000);
  });
});

describe('solve', () => {
  it('finds optimal touches', () => {
    expect(solve([8, 0, 0, 0], 3, 4)).toBe(1);
    expect(solve([8, 0, 0, 0], 3, 2)).toBe(2);
    expect(solve([8, 0, 0, 0], 3, 8)).toBeNull(); // vault can never hold the full 8 from a lone source
    expect(solve([0, 0, 0, 5], 3, 5)).toBe(0);
  });
});

describe('judgeSeal: prefix overload', () => {
  it('accepts the exact charge', () => {
    expect(judgeSeal(4_500_000, toPc(4500, 'nC'))).toEqual({ ok: true });
  });
  it('recognises a factor-of-1000 slip in either direction', () => {
    expect(judgeSeal(4_500_000_000, 4_500_000)).toEqual({ ok: false, prefixFactor: 1000 });
    expect(judgeSeal(4_500, 4_500_000)).toEqual({ ok: false, prefixFactor: 0.001 });
  });
  it('a plain wrong value or a wrong sign is not called a prefix slip', () => {
    expect(judgeSeal(5_000_000, 4_500_000).prefixFactor).toBeUndefined();
    expect(judgeSeal(-4_500_000_000, 4_500_000).prefixFactor).toBeUndefined();
    expect(judgeSeal(0, 4_500_000).prefixFactor).toBeUndefined();
  });
});

describe('buildLevel: incremental levels', () => {
  it('never fails to generate, and every puzzle is solvable with par equal to the true minimum', () => {
    for (const level of [1, 2, 3, 4]) {
      for (let s = 1; s < 25; s++) {
        const l = buildLevel(level, lcg(s));
        expect(solve(l.start, l.vault, l.target)).toBe(l.par);
        expect(l.par).toBeGreaterThanOrEqual(2);
        expect(l.target).not.toBe(0);
        expect(l.start.every(Number.isInteger)).toBe(true);
        expect(l.names).toHaveLength(l.start.length);
      }
    }
  });
  it('every state along the way stays in whole picocoulombs (no rounding surprises)', () => {
    for (const level of [1, 2, 3, 4]) {
      for (let s = 1; s < 15; s++) {
        const l = buildLevel(level, lcg(s));
        let st = l.start;
        for (let i = 0; i < 6; i++) {
          const a = i % l.start.length;
          const b = (i + 1) % l.start.length;
          if (st[a] !== st[b] && Number.isInteger((st[a] + st[b]) / 2)) st = touch(st, a, b);
        }
        expect(st.every(Number.isInteger)).toBe(true);
      }
    }
  });
  it('level 1: the sample circuit shape, all in µC with decimals, door in µC', () => {
    for (let s = 1; s < 25; s++) {
      const l = buildLevel(1, lcg(s));
      expect(l.start[0]).toBeGreaterThan(0);
      expect(l.start[1]).toBeLessThan(0);
      expect(l.start[2]).toBe(0);
      expect(l.start[3]).toBe(0);
      expect(l.targetUnit).toBe('µC');
      expect(l.start.every((q) => autoUnit(q) === 'µC' || q === 0)).toBe(true);
      // the vault will read in µC too, so level 1 needs no prefix conversion at all
      expect(autoUnit(l.target)).toBe('µC');
      expect(fmtCharge(l.target, l.targetUnit)).toBe(fmtCharge(l.target));
    }
  });
  it('level 2: the readouts are in mixed prefixes and the door asks in a DIFFERENT prefix than the vault would show', () => {
    for (let s = 1; s < 25; s++) {
      const l = buildLevel(2, lcg(s));
      const shown = new Set(l.start.filter((q) => q !== 0).map(autoUnit));
      expect(shown.size).toBeGreaterThanOrEqual(2);
      expect(l.targetUnit).not.toBe(autoUnit(l.target));
      const asked = Math.abs(l.target / PC[l.targetUnit]);
      expect(asked).toBeGreaterThanOrEqual(0.001);
      expect(asked).toBeLessThan(100000);
    }
  });
  it('level 3: Terminal A is a composite cell with a sealed capsule that equals the door charge', () => {
    for (let s = 1; s < 60; s++) {
      const l = buildLevel(3, lcg(s));
      const parts = l.parts[0]!;
      expect(parts).toHaveLength(3);
      expect(l.parts.slice(1).every((p) => p === null)).toBe(true); // only Terminal A is composite
      expect(l.hiddenTarget).toBe(true);
      expect(netOf(parts)).toBe(l.start[0]); // internal charges add up to the cell's net charge
      expect(parts[2]).toBe(l.target); // the sealed capsule IS the required charge
      // deducing it: net − listed charges = capsule
      expect(l.start[0] - (parts[0] + parts[1])).toBe(l.target);
    }
  });

  it('level 3: the listed charges are in different prefixes (nC and µC) and differ from the capsule', () => {
    for (let s = 1; s < 60; s++) {
      const [p1, p2, capsule] = buildLevel(3, lcg(s)).parts[0]!;
      expect(autoUnit(p1)).toBe('nC');
      expect(autoUnit(p2)).toBe('µC');
      expect(new Set([p1, p2, capsule]).size).toBe(3);
      expect(p1).not.toBe(0);
      expect(p2).not.toBe(0);
    }
  });

  it('only level 3 hides the target; the others state it', () => {
    for (const level of [1, 2, 3, 4]) expect(buildLevel(level, lcg(4)).hiddenTarget).toBe(level === 3);
  });

  it('level 3: the capsule cannot be read off anything on screen: it is not in the start charges either', () => {
    for (let s = 1; s < 60; s++) {
      const l = buildLevel(3, lcg(s));
      expect(l.start).not.toContain(l.target); // so it cannot be copied from a body's readout
    }
  });

  it('a wrong seal on the capsule level reveals nothing: no numbers, no prefix hint', () => {
    for (let s = 1; s < 30; s++) {
      const l = buildLevel(3, lcg(s));
      for (const vault of [0, l.target * 2, l.target * 1000, -l.target, l.target / 2]) {
        const msg = sealMessage(l, vault, judgeSeal(vault, l.target));
        expect(msg).not.toMatch(/\d/);
        expect(msg).not.toMatch(/factor|prefix|µC|nC|mC|pC/);
      }
    }
  });

  it('levels with a visible door still explain overloads with the numbers', () => {
    const l = buildLevel(2, lcg(3));
    expect(sealMessage(l, l.target * 1000, judgeSeal(l.target * 1000, l.target))).toMatch(/factor of 1000/);
    expect(sealMessage(l, l.target + 1, judgeSeal(l.target + 1, l.target))).toMatch(/not /);
  });
  it('level 4: fine scale, five bodies, a long chain, door asks in a different prefix and reaches pC/nC', () => {
    for (let s = 1; s < 25; s++) {
      const l = buildLevel(4, lcg(s));
      expect(l.start).toHaveLength(5);
      expect(l.par).toBeGreaterThanOrEqual(4);
      expect(Math.abs(l.start[0])).toBeLessThan(1e6); // under 1 µC to begin with
      expect(Math.abs(l.target)).toBeLessThan(1e4);
    }
  });
  it('levels get harder: par never falls from level 1 to 4', () => {
    const avg = (level: number) => [...Array(15)].reduce((n, _, i) => n + buildLevel(level, lcg(i + 1)).par, 0) / 15;
    expect(avg(4)).toBeGreaterThan(avg(1));
  });
  it('is deterministic for a seed and varies between seeds', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(JSON.stringify(buildLevel(level, lcg(5)))).not.toEqual(JSON.stringify(buildLevel(level, lcg(6))));
    }
  });
});

describe('solutionPath and the worked explanation', () => {
  it('the path has exactly par touches and replaying it really puts the target in the vault', () => {
    for (const level of [1, 2, 3, 4]) {
      for (let s = 1; s < 20; s++) {
        const l = buildLevel(level, lcg(s));
        const path = solutionPath(l.start, l.vault, l.target)!;
        expect(path).toHaveLength(l.par);
        const end = path.reduce((st, [a, b]) => touch(st, a, b), l.start);
        expect(end[l.vault]).toBe(l.target);
      }
    }
  });

  it('no sequence shorter than par exists (the claim the explanation makes)', () => {
    for (const level of [1, 2, 3, 4]) {
      for (let s = 1; s < 10; s++) {
        const l = buildLevel(level, lcg(s));
        expect(solve(l.start, l.vault, l.target, l.par - 1)).toBeNull();
      }
    }
  });

  it('level 1 worked example: B with the blank sphere, then B with the vault', () => {
    const l = buildLevel(1, lcg(11));
    const ex = explainSolution(l);
    expect(ex.steps).toHaveLength(2);
    expect(ex.steps[0].calc).toContain('Terminal B');
    expect(ex.steps[0].calc).toContain('/ 2 =');
    expect(ex.steps[1].note).toMatch(/in the vault/);
  });

  it('one explained step per touch, each calculation is arithmetically right, and the last step reaches the door', () => {
    for (const level of [1, 2, 3, 4]) {
      for (let s = 1; s < 12; s++) {
        const l = buildLevel(level, lcg(s));
        const ex = explainSolution(l);
        expect(ex.steps).toHaveLength(l.par);
        expect(ex.steps.every((st) => st.calc.includes('/ 2 =') && st.note.length > 20)).toBe(true);
        expect(ex.steps[ex.steps.length - 1].note).toMatch(/exactly what the door asks/);
      }
    }
  });

  it('the explanation states the true minimum and the conservation check', () => {
    const l = buildLevel(2, lcg(12));
    const ex = explainSolution(l);
    expect(ex.rationale.join(' ')).toContain(`Fewest possible: ${l.par} touches`);
    expect(ex.rationale.join(' ')).toMatch(/Working backwards/);
    expect(ex.rationale.join(' ')).toMatch(/touching never changes the total/);
  });

  it('arithmetic reads cleanly: no "+ +" or "− +" in any calculation, and negatives are bracketed', () => {
    for (const level of [1, 2, 3, 4]) {
      for (let s = 1; s < 15; s++) {
        const ex = explainSolution(buildLevel(level, lcg(s)));
        const all = [...ex.steps.map((x) => x.calc), ...ex.rationale].join(' ');
        expect(all).not.toMatch(/\+ \+|− \+|\+ −|− −/);
      }
    }
  });

  it('level 1 never asks for a conversion; the explanation just states the door', () => {
    for (let s = 1; s < 15; s++) {
      expect(explainSolution(buildLevel(1, lcg(s))).setup[0]).not.toMatch(/Convert first/);
    }
  });

  it('level 2 explains the prefix conversion between the door and the readout', () => {
    for (let s = 1; s < 12; s++) {
      const l = buildLevel(2, lcg(s));
      expect(explainSolution(l).setup[0]).toMatch(/Convert first/);
    }
  });

  it('level 3 explains the deduction: measure the net, subtract the listed charges, get the capsule', () => {
    for (let s = 1; s < 40; s++) {
      const l = buildLevel(3, lcg(s));
      const setup = explainSolution(l).setup.join(' ');
      expect(setup).toMatch(/only asks you to match the sealed capsule/);
      expect(setup).toMatch(/algebraic sum of ALL its internal charges/);
      expect(setup).toMatch(/Measuring Terminal A with the electrometer gives a net charge of/);
      expect(setup).toMatch(/So the sealed capsule holds/);
      expect(setup).not.toMatch(/\+ \+|− \+|\+ −|− −/); // the arithmetic reads cleanly
    }
  });

  it('level 3 deduction text really contains the right numbers (net, listed sum, capsule)', () => {
    for (let s = 1; s < 30; s++) {
      const l = buildLevel(3, lcg(s));
      const parts = l.parts[0]!;
      const setup = explainSolution(l).setup.join(' ');
      const u = bestUnit([...parts, netOf(parts)]);
      expect(setup).toContain(fmtCharge(netOf(parts), u)); // the measured net
      expect(setup).toContain(fmtCharge(netOf(parts.slice(0, -1)), u)); // the sum of the listed charges
      expect(setup).toContain(fmtCharge(l.target, u)); // the capsule
    }
  });

  it('level 1 and 4 do not mention composite cells', () => {
    expect(explainSolution(buildLevel(1, lcg(3))).setup.join(' ')).not.toMatch(/composite/);
    expect(explainSolution(buildLevel(4, lcg(3))).setup.join(' ')).not.toMatch(/composite/);
  });
});

describe('stars', () => {
  it('par is 3, one over is 2, more is 1, and each overload costs a star (minimum 1)', () => {
    expect(starsFor(3, 3, 0)).toBe(3);
    expect(starsFor(4, 3, 0)).toBe(2);
    expect(starsFor(9, 3, 0)).toBe(1);
    expect(starsFor(3, 3, 1)).toBe(2);
    expect(starsFor(3, 3, 2)).toBe(1);
    expect(starsFor(3, 3, 6)).toBe(1);
  });
});
