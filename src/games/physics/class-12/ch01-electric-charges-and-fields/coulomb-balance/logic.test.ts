import { describe, expect, it } from 'vitest';
import { answerCm, coulombForce, fmt, judge, makeRound, starsForAttempts, type Round } from './logic';

// Worked example: 4 μC and 5 μC at 30 cm: F = 9e9 × 20e-12 / 0.09 = 2 N.
const worked: Round = { q1uC: 4, q2uC: 5, rCm: 30, targetForce: 2 };

describe('coulombForce', () => {
  it('matches the hand calculation', () => {
    expect(coulombForce(4e-6, 5e-6, 0.3)).toBeCloseTo(2, 10);
  });

  it('is inverse-square: doubling r quarters F', () => {
    expect(coulombForce(1e-6, 1e-6, 0.2)).toBeCloseTo(coulombForce(1e-6, 1e-6, 0.1) / 4, 12);
  });

  it('ignores the sign of the charges (magnitude only)', () => {
    expect(coulombForce(-4e-6, 5e-6, 0.3)).toBeCloseTo(2, 10);
  });
});

describe('makeRound', () => {
  it('is deterministic for a given random sequence', () => {
    expect(makeRound(() => 0.37)).toEqual(makeRound(() => 0.37));
  });

  it('always has a solvable, in-range answer for any random input', () => {
    for (const x of [0, 0.1, 0.5, 0.9, 0.999999]) {
      const r = makeRound(() => x);
      expect(r.q1uC).toBeGreaterThanOrEqual(1);
      expect(r.q1uC).toBeLessThanOrEqual(9);
      expect(answerCm(r)).toBeGreaterThan(4);
      expect(answerCm(r)).toBeLessThan(52);
    }
  });
});

describe('judge', () => {
  it('accepts the right distance', () => {
    expect(answerCm(worked)).toBeCloseTo(30, 6);
    expect(judge(worked, 30).outcome).toBe('win');
    expect(judge(worked, 30.5).outcome).toBe('win'); // within 3%
  });

  it('rejects answers just outside tolerance', () => {
    expect(judge(worked, 31.5).outcome).not.toBe('win');
  });

  it('says "tooClose" when force at the guess is larger than the target', () => {
    const j = judge(worked, 15);
    expect(j.outcome).toBe('tooClose');
    expect(j.forceAtGuess).toBeCloseTo(8, 8);
  });

  it('says "tooFar" when force at the guess is smaller than the target', () => {
    expect(judge(worked, 60).outcome).toBe('tooFar');
  });

  it('spots a metres-for-centimetres slip', () => {
    expect(judge(worked, 0.3).outcome).toBe('units');
  });

  it('catches the 1/r misconception: linear scaling gives the wrong answer', () => {
    // If force were ∝ 1/r, going from 2 N at 30 cm to 1 N would need 60 cm. The truth is ≈ 42.4 cm.
    const half: Round = { ...worked, targetForce: 1 };
    expect(answerCm(half)).toBeCloseTo(42.43, 1);
    expect(judge(half, 60).outcome).not.toBe('win');
  });
});

describe('starsForAttempts / fmt', () => {
  it('awards fewer stars for more attempts', () => {
    expect([1, 2, 3, 9].map(starsForAttempts)).toEqual([3, 2, 1, 1]);
  });
  it('formats to 3 s.f.', () => {
    expect(fmt(2)).toBe('2');
    expect(fmt(1.23456)).toBe('1.23');
  });
});
