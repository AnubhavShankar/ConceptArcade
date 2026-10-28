import { describe, expect, it } from 'vitest';
import { heartsToStars, roundScore } from '../src/core/arcade';

describe('arcade scoring', () => {
  it('a fast, charge-saving, streaking round scores more than a slow, costly, cold one', () => {
    const best = roundScore({ chargesLeft: 2, seconds: 2, streak: 3 });
    const worst = roundScore({ chargesLeft: 0, seconds: 120, streak: 0 });
    expect(worst).toBe(100);
    expect(best).toBeGreaterThan(worst * 2);
  });
  it('each unused charge is worth 50 points and the speed bonus never goes below zero', () => {
    expect(roundScore({ chargesLeft: 1, seconds: 100, streak: 0 }) - roundScore({ chargesLeft: 0, seconds: 100, streak: 0 })).toBe(50);
    expect(roundScore({ chargesLeft: 0, seconds: 1e6, streak: 0 })).toBe(100);
  });
  it('the streak multiplier is capped at four', () => {
    expect(roundScore({ chargesLeft: 0, seconds: 100, streak: 4 })).toBe(200);
    expect(roundScore({ chargesLeft: 0, seconds: 100, streak: 40 })).toBe(200);
  });
  it('hearts left map to stars between 1 and 3', () => {
    expect([0, 1, 2, 3, 5].map(heartsToStars)).toEqual([1, 1, 2, 3, 3]);
  });
});
