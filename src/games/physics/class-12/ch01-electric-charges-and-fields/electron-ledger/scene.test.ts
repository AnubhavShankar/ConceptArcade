import { describe, expect, it } from 'vitest';
import { demoOffset, planFlow } from './scene';

const net = (prev: number[], next: number[]) => {
  const { flights, instant } = planFlow(prev, next);
  const out = prev.map((p, i) => p + instant[i]);
  for (const f of flights) {
    if (f.from >= 0) out[f.from] -= 1;
    if (f.to >= 0) out[f.to] += 1;
  }
  return out;
};

describe('planFlow', () => {
  it('sends electrons from the body that loses to the body that gains', () => {
    const { flights } = planFlow([0, 0], [-3, 3]);
    expect(flights).toHaveLength(3);
    expect(flights.every((f) => f.from === 0 && f.to === 1)).toBe(true);
  });
  it('uses the pump when only one body changes', () => {
    expect(planFlow([0], [-2]).flights).toEqual([{ from: 0, to: -1 }, { from: 0, to: -1 }]);
    expect(planFlow([0], [2]).flights).toEqual([{ from: -1, to: 0 }, { from: -1, to: 0 }]);
  });
  it('sends nothing when nothing changed', () => {
    expect(planFlow([1, -1], [1, -1]).flights).toEqual([]);
  });
  it('discharging sends the electrons back the way they came', () => {
    const { flights } = planFlow([-2, 2], [0, 0]);
    expect(flights).toEqual([{ from: 1, to: 0 }, { from: 1, to: 0 }]);
  });
  it('ends up exactly at the target for many shapes of change, including huge ones', () => {
    const cases: [number[], number[]][] = [[[0, 0], [-40, 40]], [[3, -3], [-5, 5]], [[0, 0, 0], [-2, 5, -3]], [[0], [60]], [[-30], [0]]];
    for (const [p, n] of cases) expect(net(p, n)).toEqual(n);
  });
  it('caps the number of animated flights so a huge change cannot flood the screen', () => {
    expect(planFlow([0, 0], [-40, 40]).flights.length).toBeLessThanOrEqual(24);
  });
});

describe('demoOffset', () => {
  it('attraction moves the first body towards the second, repulsion away from it', () => {
    expect(demoOffset('attract', 1, 1)).toBeGreaterThan(0);
    expect(demoOffset('repel', 1, 1)).toBeLessThan(0);
  });
  it('nothing moves when there is no force, or at the start', () => {
    expect(demoOffset(null, 1, 1)).toBe(0);
    expect(demoOffset('attract', 0, 1)).toBeCloseTo(0);
    expect(demoOffset('repel', 0, 1)).toBeCloseTo(0);
  });
  it('a weak charge moves things less', () => {
    expect(Math.abs(demoOffset('repel', 1, 0.4))).toBeLessThan(Math.abs(demoOffset('repel', 1, 1)));
  });
  it('settles to a fixed offset, and progress outside 0 to 1 is clamped', () => {
    expect(demoOffset('repel', 2, 1)).toBe(demoOffset('repel', 1, 1));
    expect(demoOffset('attract', 1, 1)).toBeCloseTo(30);
  });
});
