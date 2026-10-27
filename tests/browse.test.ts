import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildCourses, compareGames, compareSections, continueTarget, gameStatus, matchesFilter, nextLevel, numberGames, searchEntries, statsFor } from '../src/core/browse';
import type { GameManifest } from '../src/core/manifest';
import { parseCurriculum, type Curriculum } from '../src/core/curriculum';
import { applyResult, type Store } from '../src/core/progress';
import { entry as gameEntry, manifest } from './fixtures';

const entry = gameEntry;

const physics12: Curriculum = {
  subject: 'physics',
  classLevel: 12,
  chapters: [
    { number: 1, name: 'Electric Charges and Fields' },
    { number: 2, name: 'Electrostatic Potential and Capacitance' },
    { number: 3, name: 'Current Electricity' },
  ],
};

const done = (store: Store, id: string, levels: number[]) => levels.reduce((s, l) => applyResult(s, id, l, 3), store);

describe('buildCourses', () => {
  it('lists planned chapters from the curriculum even when they have no games', () => {
    const [course] = buildCourses([entry('a')], [physics12]);
    expect(course.chapters.map((c) => [c.number, c.games.length])).toEqual([[1, 1], [2, 0], [3, 0]]);
  });

  it('still shows a game whose chapter is missing from the curriculum', () => {
    const [course] = buildCourses([entry('a', { chapter: { number: 9, name: 'Ray Optics and Optical Instruments' } })], [physics12]);
    expect(course.chapters.map((c) => c.number)).toEqual([1, 2, 3, 9]);
    expect(course.chapters.find((c) => c.number === 9)?.games).toHaveLength(1);
  });

  it('works with no curriculum at all: courses and chapters come from the games', () => {
    const courses = buildCourses([entry('a'), entry('b', { chapter: { number: 2, name: 'Electrostatic Potential and Capacitance' } })], []);
    expect(courses).toHaveLength(1);
    expect(courses[0].chapters.map((c) => c.number)).toEqual([1, 2]);
  });

  it('separates subjects and classes, ordered subject, then class', () => {
    const courses = buildCourses(
      [
        entry('chem12', { subject: 'chemistry', classLevel: 12, chapter: { number: 1, name: 'Solutions' } }),
        entry('phys12'),
        entry('phys11', { classLevel: 11, chapter: { number: 1, name: 'Units and Measurements' } }),
        entry('math10', { subject: 'mathematics', classLevel: 10, chapter: { number: 1, name: 'Real Numbers' } }),
      ],
      [],
    );
    expect(courses.map((c) => `${c.subject}-${c.classLevel}`)).toEqual(['physics-11', 'physics-12', 'chemistry-12', 'mathematics-10']);
  });

  it('keeps games in the order given within a chapter, and sorts chapters by number', () => {
    const courses = buildCourses([entry('z'), entry('a'), entry('m', { chapter: { number: 2, name: 'Electrostatic Potential and Capacitance' } })], [physics12]);
    expect(courses[0].chapters[0].games.map((g) => g.manifest.id)).toEqual(['z', 'a']);
    expect(courses[0].chapters.map((c) => c.number)).toEqual([1, 2, 3]);
  });

  it('scales: 1 subject x 3 classes x 14 chapters x 3 games each', () => {
    const entries = [];
    for (const cl of [10, 11, 12]) for (let ch = 1; ch <= 14; ch++) for (let g = 0; g < 3; g++) entries.push(entry(`g-${cl}-${ch}-${g}`, { classLevel: cl, chapter: { number: ch, name: `Chapter number ${ch}` } }));
    const courses = buildCourses(entries, []);
    expect(courses).toHaveLength(3);
    expect(courses.every((c) => c.chapters.length === 14 && c.chapters.every((ch) => ch.games.length === 3))).toBe(true);
  });
});

describe('status and progress', () => {
  const m = manifest('x');
  it('new, in progress, done', () => {
    expect(gameStatus({}, m)).toBe('new');
    expect(gameStatus(done({}, 'x', [1]), m)).toBe('progress');
    expect(gameStatus(done({}, 'x', [1, 2, 3]), m)).toBe('done');
  });
  it('matchesFilter', () => {
    expect(matchesFilter('new', 'all')).toBe(true);
    expect(matchesFilter('new', 'done')).toBe(false);
    expect(matchesFilter('progress', 'progress')).toBe(true);
  });
  it('statsFor counts games, levels and stars', () => {
    const store = done(done({}, 'a', [1, 2, 3]), 'b', [1]);
    expect(statsFor(store, [entry('a'), entry('b'), entry('c')])).toEqual({ games: 3, gamesDone: 1, levelsDone: 4, levelsTotal: 9, stars: 12, maxStars: 27 });
  });
  it('nextLevel is the first level not yet beaten, or null when finished', () => {
    expect(nextLevel({}, m)).toBe(1);
    expect(nextLevel(done({}, 'x', [1]), m)).toBe(2);
    expect(nextLevel(done({}, 'x', [1, 2, 3]), m)).toBeNull();
  });
});

describe('searchEntries', () => {
  const entries = [
    entry('coulomb', { title: 'Coulomb Balance', concepts: ['Inverse-square law'], ncertRef: 'Section 1.5, Coulomb’s Law' }),
    entry('spheres', { title: 'The Curator’s Spheres', summary: 'Probe sealed spheres with charged rods to find the hidden charges on each.', concepts: ['Like repel, unlike attract'] }),
    entry('conserve', { title: 'Share the Charge', concepts: ['Conservation of charge'], ncertRef: 'Section 1.4.2, Charge is conserved' }),
    entry('chem', { title: 'Mole Maker', subject: 'chemistry', classLevel: 11, chapter: { number: 1, name: 'Some Basic Concepts of Chemistry' }, concepts: ['The mole'] }),
  ];
  const ids = (q: string) => searchEntries(entries, q).map((e) => e.manifest.id);

  it('matches titles, concepts, chapters, section numbers and subjects', () => {
    expect(ids('coulomb')).toContain('coulomb');
    expect(ids('conservation')).toEqual(['conserve']);
    expect(ids('mole')).toEqual(['chem']);
    expect(ids('1.4')).toEqual(['conserve']);
    expect(ids('chemistry')).toEqual(['chem']);
    expect(ids('class 11')).toEqual(['chem']);
  });
  it('is case-insensitive', () => {
    expect(ids('COULOMB')).toEqual(ids('coulomb'));
  });
  it('requires EVERY word to match', () => {
    expect(ids('charge conservation')).toEqual(['conserve']);
    expect(ids('coulomb mole')).toEqual([]);
  });
  it('ranks a title match above a concept match above a summary match', () => {
    const e = [
      entry('c', { title: 'Alpha', concepts: ['Flux'], summary: 'Plain text one, with nothing in it about the other topic at all, sorry.' }),
      entry('b', { title: 'Beta', concepts: ['Other'], summary: 'Mentions flux here, and a few more words so that it is long enough.' }),
      entry('a', { title: 'Flux Lab', concepts: ['Other'], summary: 'Plain text two, with nothing in it about the other topic at all, sorry.' }),
    ];
    expect(searchEntries(e, 'flux').map((x) => x.manifest.id)).toEqual(['a', 'c', 'b']);
  });
  it('returns nothing for an empty or blank query, and for no match', () => {
    expect(ids('')).toEqual([]);
    expect(ids('   ')).toEqual([]);
    expect(ids('zzzz')).toEqual([]);
  });
});

describe('continueTarget', () => {
  const entries = [entry('a'), entry('b'), entry('c')];
  it('a new student is told where to start', () => {
    const t = continueTarget({}, null, entries)!;
    expect([t.entry.manifest.id, t.level, t.kind]).toEqual(['a', 1, 'start']);
  });
  it('continues the last game at its first unbeaten level', () => {
    const t = continueTarget(done({}, 'b', [1]), { id: 'b', level: 1 }, entries)!;
    expect([t.entry.manifest.id, t.level, t.kind]).toEqual(['b', 2, 'continue']);
  });
  it('moves to the next unfinished game once the last one is complete', () => {
    const t = continueTarget(done({}, 'b', [1, 2, 3]), { id: 'b', level: 3 }, entries)!;
    expect([t.entry.manifest.id, t.level, t.kind]).toEqual(['c', 1, 'next']);
  });
  it('wraps around to earlier games, and skips finished ones', () => {
    const store = done(done({}, 'c', [1, 2, 3]), 'b', [1, 2, 3]);
    const t = continueTarget(store, { id: 'c', level: 3 }, entries)!;
    expect(t.entry.manifest.id).toBe('a');
  });
  it('is null when everything is finished', () => {
    const store = done(done(done({}, 'a', [1, 2, 3]), 'b', [1, 2, 3]), 'c', [1, 2, 3]);
    expect(continueTarget(store, { id: 'b', level: 3 }, entries)).toBeNull();
  });
  it('ignores a last-played id that no longer exists', () => {
    const t = continueTarget({}, { id: 'gone', level: 2 }, entries)!;
    expect([t.entry.manifest.id, t.kind]).toEqual(['a', 'start']);
  });
  it('is null with no games', () => {
    expect(continueTarget({}, null, [])).toBeNull();
  });
});

describe('textbook order', () => {
  const ids = (list: ReturnType<typeof manifest>[]) => [...list].sort(compareGames).map((m) => m.id);

  it('compareSections is numeric, part by part: 1.4.2 < 1.5 < 1.10', () => {
    expect(compareSections([1, 4, 2], [1, 5])).toBeLessThan(0);
    expect(compareSections([1, 5], [1, 10])).toBeLessThan(0);
    expect(compareSections([1, 4], [1, 4, 1])).toBeLessThan(0); // a section comes before its sub-sections
    expect(compareSections([1, 4, 1], [1, 4, 1])).toBe(0);
  });

  it('orders by section number, not by title or by the order the folders happen to be read', () => {
    const list = [
      manifest('z', { title: 'A first alphabetically', ncertRef: 'Section 1.5, Coulomb’s Law' }),
      manifest('y', { title: 'Zebra', ncertRef: 'Section 1.2, Electric Charge' }),
      manifest('x', { title: 'Middle', ncertRef: 'Section 1.4.2, Charge is conserved' }),
      manifest('w', { title: 'Another', ncertRef: 'Section 1.10, Electric Dipole' }),
      manifest('v', { title: 'Mid-one', ncertRef: 'Section 1.4.1, Additivity of charges' }),
    ];
    expect(ids(list)).toEqual(['y', 'v', 'x', 'z', 'w']);
    expect(ids([...list].reverse())).toEqual(['y', 'v', 'x', 'z', 'w']); // input order is irrelevant
  });

  it('games in the same section follow their explicit `order`, and the title is only the last resort', () => {
    const list = [
      manifest('b', { title: 'Aardvark', ncertRef: 'Section 1.2, Electric Charge', order: 2 }),
      manifest('a', { title: 'Zulu', ncertRef: 'Section 1.2, Electric Charge', order: 1 }),
      manifest('c', { title: 'Beta', ncertRef: 'Section 1.2, Electric Charge' }),
      manifest('d', { title: 'Alpha', ncertRef: 'Section 1.2, Electric Charge' }),
    ];
    expect(ids(list)).toEqual(['d', 'c', 'a', 'b']); // no order = 0 comes first, then 1, then 2; ties by title
  });

  it('chapters come before sections, classes before chapters, subjects before classes', () => {
    const list = [
      manifest('ch2', { chapter: { number: 2, name: 'Electrostatic Potential and Capacitance' }, ncertRef: 'Section 2.1, Introduction' }),
      manifest('ch1late', { ncertRef: 'Section 1.14, Applications of Gauss’s Law' }),
      manifest('c11', { classLevel: 11, chapter: { number: 9, name: 'Mechanical Properties of Solids' }, ncertRef: 'Section 9.1, Introduction' }),
      manifest('chem', { subject: 'chemistry', chapter: { number: 1, name: 'Solutions' }, ncertRef: 'Section 1.1, Introduction' }),
    ];
    expect(ids(list)).toEqual(['c11', 'ch1late', 'ch2', 'chem']);
  });

  it('REAL GAMES: Chapter 1 reads in NCERT order, and the two Section 1.2 games are in the right order', () => {
    const root = path.resolve('src/games');
    const found: GameManifest[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name === 'game.json') found.push(JSON.parse(fs.readFileSync(full, 'utf8')));
      }
    };
    walk(root);
    const order = ids(found).filter((id) =>
      ['attract-or-repel', 'electron-ledger', 'conduct-or-insulate', 'net-charge', 'charge-conserved', 'quantum-of-charge', 'coulomb-balance'].includes(id),
    );
    expect(order).toEqual(['attract-or-repel', 'electron-ledger', 'conduct-or-insulate', 'net-charge', 'charge-conserved', 'quantum-of-charge', 'coulomb-balance']);
  });

  it('every real game declares its textbook section, so none can fall to the end of the list by accident', () => {
    const root = path.resolve('src/games');
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : e.name === 'game.json' ? [path.join(dir, e.name)] : []));
    for (const file of walk(root)) {
      const m = JSON.parse(fs.readFileSync(file, 'utf8'));
      expect(m.ncertRef, file).toMatch(/^Section \d+(\.\d+)*[ ,]/);
    }
  });
});

describe('numberGames: the numeric order shown on cards', () => {
  it('numbers games 1, 2, 3 … within a chapter, in textbook order and whatever order they were given', () => {
    const list = [
      entry('late', { title: 'Zed', ncertRef: 'Section 1.5, Coulomb’s Law' }),
      entry('early', { title: 'Alpha', ncertRef: 'Section 1.2, Electric Charge' }),
      entry('mid', { title: 'Mid', ncertRef: 'Section 1.4.2, Charge is conserved' }),
    ];
    const pick = (l: typeof list) => [...numberGames(l)].map(([id, v]) => `${id}:${v.n}/${v.of}`).sort();
    expect(pick(list)).toEqual(['early:1/3', 'late:3/3', 'mid:2/3']);
    expect(pick([...list].reverse())).toEqual(pick(list)); // input order is irrelevant
  });

  it('follows the explicit order within a section, not the alphabet', () => {
    const list = [
      entry('b', { title: 'Aardvark', ncertRef: 'Section 1.2, Electric Charge', order: 2 }),
      entry('a', { title: 'Zulu', ncertRef: 'Section 1.2, Electric Charge', order: 1 }),
    ];
    const n = numberGames(list);
    expect(n.get('a')).toEqual({ n: 1, of: 2 });
    expect(n.get('b')).toEqual({ n: 2, of: 2 });
  });

  it('restarts at 1 in every chapter, class and subject', () => {
    const list = [
      entry('c1a'),
      entry('c1b', { ncertRef: 'Section 1.3, Conductors and Insulators' }),
      entry('c2a', { chapter: { number: 2, name: 'Electrostatic Potential and Capacitance' }, ncertRef: 'Section 2.1, Introduction' }),
      entry('p11', { classLevel: 11, chapter: { number: 1, name: 'Units and Measurements' } }),
      entry('chem', { subject: 'chemistry', chapter: { number: 1, name: 'Solutions' } }),
    ];
    const n = numberGames(list);
    expect(n.get('c1a')).toEqual({ n: 1, of: 2 });
    expect(n.get('c1b')).toEqual({ n: 2, of: 2 });
    expect(n.get('c2a')).toEqual({ n: 1, of: 1 });
    expect(n.get('p11')).toEqual({ n: 1, of: 1 });
    expect(n.get('chem')).toEqual({ n: 1, of: 1 });
  });

  it('gives every game exactly one number, and the numbers in a chapter are exactly 1..of', () => {
    const list = Array.from({ length: 9 }, (_, i) => entry(`g${i}`, { ncertRef: `Section 1.${9 - i}, Topic number ${i}` }));
    const n = numberGames(list);
    expect(n.size).toBe(9);
    expect([...n.values()].map((v) => v.n).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect([...n.values()].every((v) => v.of === 9)).toBe(true);
  });

  it('is empty for no games', () => {
    expect(numberGames([]).size).toBe(0);
  });
});

describe('ncertRef and order in the manifest', () => {
  it('ncertRef must start with a section number', () => {
    expect(() => manifest('a', { ncertRef: 'Section 1.4.2, Charge is conserved' })).not.toThrow();
    expect(() => manifest('a', { ncertRef: 'Section 12, Intro' })).not.toThrow();
    expect(() => manifest('a', { ncertRef: 'Coulomb’s Law' })).toThrow(/textbook section number/);
    expect(() => manifest('a', { ncertRef: 'Section X.Y, Topic name' })).toThrow(/textbook section number/);
    expect(() => manifest('a', { ncertRef: 'Section 1.4.x, Topic' })).toThrow(/textbook section number/);
  });
  it('order is an optional whole number from 0 to 99', () => {
    expect(() => manifest('a')).not.toThrow();
    expect(() => manifest('a', { order: 0 })).not.toThrow();
    expect(() => manifest('a', { order: 99 })).not.toThrow();
    expect(() => manifest('a', { order: 100 })).toThrow();
    expect(() => manifest('a', { order: -1 })).toThrow();
    expect(() => manifest('a', { order: 1.5 })).toThrow();
  });
});

describe('curriculum files', () => {
  it('accepts a valid file and rejects mistakes', () => {
    expect(parseCurriculum(physics12).ok).toBe(true);
    expect(parseCurriculum({ ...physics12, subject: 'astrology' }).ok).toBe(false);
    expect(parseCurriculum({ ...physics12, extra: 1 }).ok).toBe(false);
    expect(parseCurriculum({ ...physics12, chapters: [] }).ok).toBe(false);
  });
  it('rejects a chapter number listed twice', () => {
    const r = parseCurriculum({ ...physics12, chapters: [{ number: 1, name: 'Electric Charges' }, { number: 1, name: 'Something Else' }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toMatch(/listed twice/);
  });
});
