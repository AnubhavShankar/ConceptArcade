import { describe, expect, it } from 'vitest';
import { expectedDir, parseManifest, slugify } from '../src/core/manifest';
import { createRng } from '../src/core/random';

describe('createRng', () => {
  it('is reproducible and within [0, 1)', () => {
    const a = createRng(42);
    const b = createRng(42);
    const xs = Array.from({ length: 50 }, () => a());
    expect(xs).toEqual(Array.from({ length: 50 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('differs between seeds', () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });
});

describe('manifest helpers', () => {
  it('slugifies chapter names', () => {
    expect(slugify('Electric Charges and Fields')).toBe('electric-charges-and-fields');
    expect(slugify("  Moving Charges & Magnetism! ")).toBe('moving-charges-magnetism');
  });

  it('derives the expected folder', () => {
    const r = parseManifest({
      id: 'x-game',
      title: 'X Game',
      summary: 'Ten chars at least.',
      subject: 'physics',
      classLevel: 12,
      chapter: { number: 3, name: 'Current Electricity' },
      ncertRef: 'Section 3.1',
      concepts: ['Ohm'],
      learningOutcome: 'Student can apply Ohm law.',
      mechanic: 'other',
      difficulty: 'concept',
      estimatedMinutes: 1,
      hints: ['one', 'two'],
      author: { name: 'A', github: 'a' },
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(expectedDir(r.manifest)).toBe('physics/class-12/ch03-current-electricity/x-game');
  });

  it('rejects unknown fields (typos should not pass silently)', () => {
    expect(parseManifest({ title: 'x', extra: 1 }).ok).toBe(false);
  });
});
