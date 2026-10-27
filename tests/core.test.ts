import { describe, expect, it } from 'vitest';
import { expectedDir, parseManifest, sectionKey, slugify, type GameManifest } from '../src/core/manifest';
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
  it('sectionKey orders by textbook section, numerically', () => {
    const k = (ref: string) => sectionKey({ ncertRef: ref } as GameManifest);
    expect(k("Section 1.4.2, Charge is conserved")).toEqual([1, 4, 2]);
    expect(k('Section 1.10, Electric Dipole')).toEqual([1, 10]);
    const refs = ['Section 1.10', 'Section 1.4.1', 'Section 1.4', 'Section 1.5', 'Section 1.2'];
    expect([...refs].sort((a, b) => k(a)[1] - k(b)[1] || (k(a)[2] ?? -1) - (k(b)[2] ?? -1))).toEqual(['Section 1.2', 'Section 1.4', 'Section 1.4.1', 'Section 1.5', 'Section 1.10']);
    expect(k('Somewhere in the chapter')).toEqual([Number.MAX_SAFE_INTEGER]);
  });

  it('slugifies chapter names', () => {
    expect(slugify('Electric Charges and Fields')).toBe('electric-charges-and-fields');
    expect(slugify("  Moving Charges & Magnetism! ")).toBe('moving-charges-magnetism');
  });

  it('derives the expected folder', () => {
    const r = parseManifest({
      id: 'x-game',
      title: 'X Game',
      summary: 'A summary that is long enough to read as a real search description.',
      subject: 'physics',
      classLevel: 12,
      chapter: { number: 3, name: 'Current Electricity' },
      ncertRef: 'Section 3.1',
      concepts: ['Ohm'],
      learningOutcome: 'Student can apply Ohm law.',
      mechanic: 'other',
      estimatedMinutes: 1,
      levels: [
        { title: 'Level one', tier: 'concept', kind: 'foundation', adds: 'Baseline skill here.', hints: ['First hint here', 'Second hint here'] },
        { title: 'Level two', tier: 'concept', kind: 'complexity', adds: 'Harder numbers here.', hints: ['First hint here', 'Second hint here'] },
        { title: 'Level three', tier: 'application', kind: 'concept', adds: 'A new idea here.', hints: ['First hint here', 'Second hint here'] },
      ],
      author: { name: 'A', github: 'a' },
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(expectedDir(r.manifest)).toBe('physics/class-12/ch03-current-electricity/x-game');
  });

  it('rejects unknown fields (typos should not pass silently)', () => {
    expect(parseManifest({ title: 'x', extra: 1 }).ok).toBe(false);
  });
});
