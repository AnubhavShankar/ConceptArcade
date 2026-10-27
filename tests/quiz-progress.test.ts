import { describe, expect, it } from 'vitest';
import { applyResult, highestUnlocked, isUnlocked, levelStars, summarise } from '../src/core/progress';
import { choice, gradeQuiz, isCloseEnough, parseNumber, pick, shuffle } from '../src/core/quiz';
import { createRng } from '../src/core/random';

describe('parseNumber', () => {
  it.each([
    ['0.25', 0.25],
    [' 12 ', 12],
    ['3.2e-19', 3.2e-19],
    ['3.2 x 10^-19', 3.2e-19],
    ['3.2×10-19', 3.2e-19],
    ['6.25 * 10^(12)', 6.25e12],
    ['−4', -4],
    ['1,000', 1000],
  ])('parses %s', (raw, want) => expect(parseNumber(raw)).toBeCloseTo(want, 30));

  it.each(['', 'abc', '1/2', '3.2e', 'NaN', 'Infinity'])('rejects %j', (raw) => expect(parseNumber(raw)).toBeNull());
});

describe('isCloseEnough', () => {
  it('uses relative tolerance', () => {
    expect(isCloseEnough(102, 100, 0.02)).toBe(true);
    expect(isCloseEnough(103, 100, 0.02)).toBe(false);
    expect(isCloseEnough(-100, 100, 0.5)).toBe(false);
  });
  it('handles an exact-zero answer', () => {
    expect(isCloseEnough(0, 0, 0)).toBe(true);
    expect(isCloseEnough(0.1, 0, 0)).toBe(false);
  });
});

describe('gradeQuiz', () => {
  it('passes with at most one mistake by default', () => {
    expect(gradeQuiz(4, 4)).toEqual({ passed: true, stars: 3 });
    expect(gradeQuiz(3, 4)).toEqual({ passed: true, stars: 2 });
    expect(gradeQuiz(2, 4)).toEqual({ passed: false, stars: 0 });
  });
  it('honours a custom pass mark', () => {
    expect(gradeQuiz(2, 4, 2)).toEqual({ passed: true, stars: 1 });
  });
});

describe('shuffle / pick / choice', () => {
  it('shuffle keeps every item and is seed-reproducible', () => {
    const a = shuffle([1, 2, 3, 4, 5], createRng(1));
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(a).toEqual(shuffle([1, 2, 3, 4, 5], createRng(1)));
  });
  it('shuffle does not mutate its input', () => {
    const src = [1, 2, 3];
    shuffle(src, createRng(3));
    expect(src).toEqual([1, 2, 3]);
  });
  it('pick stays in range even at random() ≈ 1', () => {
    expect(pick(['a', 'b'], () => 0.999999)).toBe('b');
  });
  it('choice records the right answer index after shuffling', () => {
    for (let s = 1; s < 30; s++) {
      const q = choice({ prompt: 'p', correct: 'RIGHT', wrong: ['x', 'y', 'z'], random: createRng(s), explain: 'e' });
      expect(q.options[q.answer]).toBe('RIGHT');
      expect(new Set(q.options).size).toBe(4);
    }
  });
});

describe('progress', () => {
  it('unlocks levels one at a time', () => {
    let s = applyResult({}, 'g', 1, 2);
    expect(isUnlocked(s, 'g', 1)).toBe(true);
    expect(isUnlocked(s, 'g', 2)).toBe(true);
    expect(isUnlocked(s, 'g', 3)).toBe(false);
    expect(highestUnlocked(s, 'g', 4)).toBe(2);
    s = applyResult(s, 'g', 2, 3);
    expect(highestUnlocked(s, 'g', 4)).toBe(3);
  });

  it('level 1 is always open, even with no data', () => {
    expect(isUnlocked({}, 'new', 1)).toBe(true);
    expect(highestUnlocked({}, 'new', 5)).toBe(1);
  });

  it('keeps the best stars and does not mutate the old store', () => {
    const a = applyResult({}, 'g', 1, 3);
    const b = applyResult(a, 'g', 1, 1);
    expect(levelStars(b, 'g', 1)).toBe(3);
    expect(b.g.plays).toBe(2);
    expect(a.g.plays).toBe(1);
  });

  it('summarises completion', () => {
    let s = applyResult({}, 'g', 1, 3);
    s = applyResult(s, 'g', 2, 1);
    expect(summarise(s, 'g', 4)).toEqual({ completed: 2, stars: 4, maxStars: 12 });
    expect(summarise({}, 'g', 3)).toEqual({ completed: 0, stars: 0, maxStars: 9 });
  });
});
