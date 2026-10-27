import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  changesMade,
  checkConfig,
  circuitResistance,
  costOf,
  countSolutions,
  evaluate,
  explainFailure,
  explainSuccess,
  initialConfig,
  MATERIALS,
  material,
  minChanges,
  remaining,
  routeResistance,
  solutions,
  starsFor,
  type Config,
  type Level,
} from './logic';

const lcg = (seed: number) => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const isInsulator = (id: string | null) => id !== null && material(id).kind === 'insulator';
const insulators = (parts: (string | null)[]) => parts.filter((id) => id === null || isInsulator(id)).length;

describe('materials', () => {
  it('metals conduct, insulators do not', () => {
    for (const id of ['copper', 'aluminium', 'brass', 'steel', 'iron']) expect(Number.isFinite(material(id).r)).toBe(true);
    for (const id of ['rubber', 'plastic', 'glass', 'wood', 'nylon', 'porcelain']) expect(material(id).r).toBe(Infinity);
  });
  it('the in-between materials conduct, but worse than a metal', () => {
    expect(material('silicon').kind).toBe('semiconductor');
    expect(material('saltgel').kind).toBe('electrolyte');
    for (const id of ['silicon', 'saltgel', 'carbon']) {
      expect(material(id).r).toBeGreaterThan(material('copper').r);
      expect(Number.isFinite(material(id).r)).toBe(true);
    }
  });
  it('ids are unique', () => {
    expect(new Set(MATERIALS.map((m) => m.id)).size).toBe(MATERIALS.length);
  });
});

describe('the circuit physics', () => {
  it('resistances in series add', () => {
    expect(routeResistance(['copper', 'steel', 'carbon'])).toBe(1 + 1 + 4);
  });
  it('one insulator, or a gap, makes a series path infinite however good the rest is', () => {
    expect(routeResistance(['copper', 'rubber', 'copper'])).toBe(Infinity);
    expect(routeResistance(['copper', null])).toBe(Infinity);
  });
  it('parallel routes: any complete route lets charge through, and two routes beat one', () => {
    expect(circuitResistance([['rubber'], ['copper']])).toBe(1);
    expect(circuitResistance([['rubber'], ['glass']])).toBe(Infinity);
    expect(circuitResistance([['copper'], ['copper']])).toBeCloseTo(0.5, 10);
    expect(circuitResistance([['carbon'], ['carbon']])).toBeCloseTo(2, 10);
  });
  it('the worker is safe when the total resistance is at or below the limit', () => {
    const level = { rMax: 10 } as Level;
    expect(evaluate(level, [['copper', 'carbon']]).safe).toBe(true);
    expect(evaluate(level, [['silicon', 'silicon']]).safe).toBe(false); // 14 > 10
    expect(evaluate(level, [['silicon', 'carbon']]).safe).toBe(false); // 11 > 10
    expect(evaluate(level, [['silicon', 'steel']]).safe).toBe(true); // 8
  });
  it('evaluate names the first blocking part on each route', () => {
    const level = { rMax: 50 } as Level;
    const ev = evaluate(level, [['copper', 'rubber', 'glass'], ['copper', 'steel']]);
    expect(ev.blocked).toEqual([{ route: 0, slot: 1, material: 'rubber' }]);
  });
  it('the charge decays smoothly and reaches exactly 10% on arrival when R equals the limit', () => {
    expect(remaining(0, 5, 10, 3)).toBe(1);
    expect(remaining(3, 10, 10, 3)).toBeCloseTo(0.1, 10);
    expect(remaining(3, 5, 10, 3)).toBeLessThan(0.1); // lower resistance drains faster
    expect(remaining(3, 20, 10, 3)).toBeGreaterThan(0.1); // higher resistance drains slower
    expect(remaining(1, 10, 10, 3)).toBeLessThan(remaining(0.5, 10, 10, 3)); // and it keeps falling
    expect(remaining(3, Infinity, 10, 3)).toBe(1); // a cut path drains nothing
  });
  it('the cost adds up and ignores empty gaps', () => {
    expect(costOf([['copper', 'steel', null]])).toBe(9 + 3);
  });
});

describe('what may be tested', () => {
  it('an empty gap cannot be tested', () => {
    const l = buildLevel(1, lcg(1));
    expect(checkConfig(l, initialConfig(l)).status).toBe('gap');
  });
  it('swapping more parts than allowed is refused, and says how many were used', () => {
    const l = buildLevel(2, lcg(1));
    const config = initialConfig(l).map((r) => r.map(() => 'copper'));
    const c = checkConfig(l, config);
    expect(c.status).toBe('too-many-changes');
  });
  it('the starting configuration counts as zero changes', () => {
    for (const level of [2, 3]) {
      const l = buildLevel(level, lcg(2));
      expect(changesMade(l, initialConfig(l))).toBe(0);
    }
  });
  it('over the cost cap is refused (level 4)', () => {
    const l = buildLevel(4, lcg(1));
    const dear: Config = [l.routes[0].slots.map((s) => [...s.options!].sort((a, b) => material(b).cost - material(a).cost)[0])];
    if (costOf(dear) > l.costCap!) expect(checkConfig(l, dear).status).toBe('over-budget');
  });
});

describe('level 1: ground the worker', () => {
  it('a single empty slot and a toolbox of three metals and three insulators', () => {
    for (let s = 1; s < 40; s++) {
      const l = buildLevel(1, lcg(s));
      expect(l.mode).toBe('single');
      expect(l.routes).toHaveLength(1);
      expect(l.routes[0].slots).toEqual([{ name: 'Earth lead', material: null }]);
      expect(l.toolbox).toHaveLength(6);
      expect(l.toolbox.filter(isInsulator)).toHaveLength(3);
      expect(l.toolbox.filter((id) => !isInsulator(id))).toHaveLength(3);
      expect(new Set(l.toolbox).size).toBe(6);
    }
  });
  it('any metal works and any insulator sparks', () => {
    const l = buildLevel(1, lcg(3));
    for (const id of l.toolbox) expect(evaluate(l, [[id]]).safe).toBe(!isInsulator(id));
  });
});

describe('level 2: find the break', () => {
  it('four parts in series, exactly one insulator, one swap allowed', () => {
    for (let s = 1; s < 60; s++) {
      const l = buildLevel(2, lcg(s));
      const parts = initialConfig(l)[0];
      expect(l.mode).toBe('replace');
      expect(parts).toHaveLength(4);
      expect(insulators(parts)).toBe(1);
      expect(l.maxChanges).toBe(1);
      expect(minChanges(l)).toBe(1);
      expect(evaluate(l, initialConfig(l)).safe).toBe(false); // it starts broken
    }
  });
  it('the break can be at any position', () => {
    const at = new Set<number>();
    for (let s = 1; s < 80; s++) at.add(initialConfig(buildLevel(2, lcg(s)))[0].findIndex(isInsulator));
    expect(at.size).toBe(4);
  });
  it('replacing the insulator with any metal fixes it; replacing a part that already conducts never does', () => {
    for (let s = 1; s < 40; s++) {
      const l = buildLevel(2, lcg(s));
      const start = initialConfig(l)[0];
      const bad = start.findIndex(isInsulator);
      for (const metal of l.toolbox.filter((id) => !isInsulator(id))) {
        const fixed = start.map((id, i) => (i === bad ? metal : id));
        expect(evaluate(l, [fixed]).safe).toBe(true);
      }
      for (let i = 0; i < 4; i++) {
        if (i === bad) continue;
        for (const swap of l.toolbox) expect(evaluate(l, [start.map((id, k) => (k === i ? swap : id))]).safe).toBe(false);
      }
    }
  });
  it('the failure message names the real culprit', () => {
    const l = buildLevel(2, lcg(5));
    const start = initialConfig(l);
    const bad = start[0].findIndex(isInsulator);
    const msg = explainFailure(l, start);
    expect(msg).toContain(l.routes[0].slots[bad].name);
    expect(msg.toLowerCase()).toContain(material(start[0][bad]!).name.toLowerCase());
    expect(msg).toMatch(/insulator has no free charges/);
  });
});

describe('failure messages', () => {
  it('name EVERY insulating part when a route is cut, not just the first', () => {
    const l = buildLevel(2, lcg(5));
    const worse: Config = [initialConfig(l)[0].map((id, i) => (i === 0 ? 'rubber' : i === 1 ? 'glass' : i === 2 ? 'nylon' : id))];
    const msg = explainFailure(l, worse);
    expect(msg).toContain(l.routes[0].slots[0].name);
    expect(msg).toContain(l.routes[0].slots[1].name);
    expect(msg).toContain(l.routes[0].slots[2].name);
    expect(msg).toContain('(rubber)');
    expect(msg).toContain('(glass)');
    expect(msg).toContain('(nylon)');
  });
  it('on a two-route level they say which route each broken part is on', () => {
    const l = buildLevel(3, lcg(5));
    const msg = explainFailure(l, initialConfig(l));
    expect(msg).toContain('Route A');
    expect(msg).toContain('Route B');
  });
  it('a conducting but slow path is not described as cut', () => {
    const l = { rMax: 5, routes: [{ name: 'Earthing path', slots: [] }] } as unknown as Level;
    expect(explainFailure(l, [['silicon', 'silicon']])).toMatch(/drains too slowly/);
    expect(explainFailure(l, [['silicon', 'silicon']])).not.toMatch(/cut/);
  });
});

describe('level 3: two ways out', () => {
  it('two routes, both broken at the start; one needs one swap and the other needs two', () => {
    for (let s = 1; s < 60; s++) {
      const l = buildLevel(3, lcg(s));
      const [a, b] = initialConfig(l);
      expect(l.mode).toBe('parallel');
      expect(l.routes).toHaveLength(2);
      expect(a).toHaveLength(2);
      expect(b).toHaveLength(2);
      expect([insulators(a), insulators(b)].sort()).toEqual([1, 2]);
      expect(evaluate(l, initialConfig(l)).safe).toBe(false);
      expect(l.maxChanges).toBe(1);
      expect(minChanges(l)).toBe(1);
    }
  });
  it('with one swap, ONLY the route with a single insulator can be repaired', () => {
    for (let s = 1; s < 60; s++) {
      const l = buildLevel(3, lcg(s));
      const start = initialConfig(l);
      const metal = l.toolbox.find((id) => !isInsulator(id))!;
      const outcomes = [0, 1].map((route) => {
        let anyWorks = false;
        start[route].forEach((id, slot) => {
          if (!isInsulator(id)) return;
          const config = start.map((r, ri) => r.map((x, si) => (ri === route && si === slot ? metal : x)));
          if (evaluate(l, config).safe && changesMade(l, config) <= 1) anyWorks = true;
        });
        return anyWorks;
      });
      expect(outcomes.filter(Boolean)).toHaveLength(1);
      expect(insulators(start[outcomes.indexOf(true)])).toBe(1);
    }
  });
  it('either route can be the cheap one', () => {
    const cheap = new Set<number>();
    for (let s = 1; s < 60; s++) {
      const [a] = initialConfig(buildLevel(3, lcg(s)));
      cheap.add(insulators(a));
    }
    expect(cheap).toEqual(new Set([1, 2]));
  });
});

describe('level 4: dissipate it', () => {
  it('three parts with three options each, a resistance limit and a cost cap', () => {
    for (let s = 1; s < 40; s++) {
      const l = buildLevel(4, lcg(s));
      expect(l.mode).toBe('tradeoff');
      expect(l.routes[0].slots).toHaveLength(3);
      for (const slot of l.routes[0].slots) {
        expect(slot.options).toHaveLength(3);
        expect(new Set(slot.options).size).toBe(3);
        expect(slot.material).toBeNull(); // nothing is pre-chosen
      }
      expect(l.costCap).not.toBeNull();
    }
  });
  it('only a handful of the 27 combinations meet both limits: at least one, at most three', () => {
    for (let s = 1; s < 60; s++) {
      const n = countSolutions(buildLevel(4, lcg(s)));
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(3);
    }
  });
  it('every listed solution really passes the checks, and nothing else does', () => {
    for (let s = 1; s < 25; s++) {
      const l = buildLevel(4, lcg(s));
      const good = new Set(solutions(l).map((c) => c.join('|')));
      for (const slotChoices of (function* () {
        for (const a of l.routes[0].slots[0].options!) for (const b of l.routes[0].slots[1].options!) for (const c of l.routes[0].slots[2].options!) yield [a, b, c];
      })()) {
        const config: Config = [slotChoices];
        const passes = evaluate(l, config).safe && checkConfig(l, config).status === 'ok';
        expect(passes).toBe(good.has(slotChoices.join('|')));
      }
    }
  });
  it('an insulator in any slot can never be part of a solution', () => {
    for (let s = 1; s < 40; s++) for (const sol of solutions(buildLevel(4, lcg(s)))) expect(sol.some(isInsulator)).toBe(false);
  });
  it('a path of semiconductors can be too slow even though it conducts', () => {
    const l = { rMax: 10 } as Level;
    const ev = evaluate(l, [['silicon', 'silicon']]);
    expect(Number.isFinite(ev.resistance)).toBe(true);
    expect(ev.safe).toBe(false);
  });
  it('the slow-drain failure message says so, with the numbers', () => {
    const l = buildLevel(4, lcg(2));
    const slow: Config = [l.routes[0].slots.map((s) => s.options![0])];
    if (!evaluate(l, slow).safe && Number.isFinite(evaluate(l, slow).resistance)) expect(explainFailure(l, slow)).toMatch(/drains too slowly/);
  });
});

describe('explanations after a win', () => {
  it('level 2 explains why one insulator breaks a series path', () => {
    const l = buildLevel(2, lcg(4));
    const start = initialConfig(l);
    const fixed = start.map((r) => r.map((id) => (isInsulator(id) ? 'copper' : id)));
    expect(explainSuccess(l, fixed).join(' ')).toMatch(/single insulator stops the whole path/);
    expect(explainSuccess(l, fixed).join(' ')).toMatch(/fewest possible/);
  });
  it('level 4 shows the sums', () => {
    const l = buildLevel(4, lcg(3));
    const sol: Config = [solutions(l)[0]];
    const text = explainSuccess(l, sol).join(' ');
    expect(text).toMatch(/Resistances in series add/);
    expect(text).toMatch(/combination/);
  });
});

describe('buildLevel: general', () => {
  it('is deterministic for a seed and varies between seeds', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(JSON.stringify(buildLevel(level, lcg(5)))).not.toEqual(JSON.stringify(buildLevel(level, lcg(6))));
    }
  });
  it('levels get more demanding: more parts, then more routes, then trade-offs', () => {
    expect(buildLevel(1, lcg(1)).routes.flatMap((r) => r.slots)).toHaveLength(1);
    expect(buildLevel(2, lcg(1)).routes.flatMap((r) => r.slots)).toHaveLength(4);
    expect(buildLevel(3, lcg(1)).routes).toHaveLength(2);
    expect(buildLevel(4, lcg(1)).costCap).not.toBeNull();
  });
});

describe('stars', () => {
  it('each spark costs a star, minimum one', () => {
    expect([0, 1, 2, 7].map(starsFor)).toEqual([3, 2, 1, 1]);
  });
});
