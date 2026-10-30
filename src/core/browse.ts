// Pure logic behind the home page: grouping, search, progress and "what to play next".
// No DOM here, so all of it is unit-tested.
import type { Curriculum } from './curriculum';
import { SUBJECTS, sectionKey, type GameManifest } from './manifest';
import { highestUnlocked, levelStars, type LastPlayed, type Store } from './progress';

export interface EntryLike {
  manifest: GameManifest;
}

export interface ChapterGroup<E> {
  number: number;
  name: string;
  games: E[];
}

/** One subject in one class: the unit a student works through. */
export interface Course<E> {
  subject: string;
  classLevel: number;
  chapters: ChapterGroup<E>[];
}

/** Position of a subject in the list of subjects (unknown subjects go last). */
export function subjectRank(subject: string): number {
  const i = (SUBJECTS as readonly string[]).indexOf(subject);
  return i < 0 ? SUBJECTS.length : i;
}

/** Compare two textbook section numbers part by part, numerically: [1,4,2] < [1,5] < [1,10]. */
export function compareSections(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? -1) - (b[i] ?? -1);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * The order games are listed in: textbook order. Subject, then class, then chapter, then the section the
 * game belongs to (from `ncertRef`), then its explicit `order` among games in the same section, and only
 * then the title, so the result never depends on alphabet unless nothing else says otherwise.
 */
export function compareGames(x: GameManifest, y: GameManifest): number {
  return (
    subjectRank(x.subject) - subjectRank(y.subject) ||
    x.subject.localeCompare(y.subject) ||
    x.classLevel - y.classLevel ||
    x.chapter.number - y.chapter.number ||
    compareSections(sectionKey(x), sectionKey(y)) ||
    (x.order ?? 0) - (y.order ?? 0) ||
    x.title.localeCompare(y.title)
  );
}

/** The games before and after this one in textbook order, within the same subject and class (null at either end). */
export function neighbours<E extends EntryLike>(entries: E[], id: string): { prev: E | null; next: E | null } {
  const me = entries.find((e) => e.manifest.id === id);
  if (!me) return { prev: null, next: null };
  const course = entries.filter((e) => e.manifest.subject === me.manifest.subject && e.manifest.classLevel === me.manifest.classLevel).sort((a, b) => compareGames(a.manifest, b.manifest));
  const i = course.findIndex((e) => e.manifest.id === id);
  return { prev: i > 0 ? course[i - 1] : null, next: i < course.length - 1 ? course[i + 1] : null };
}

export interface GameNumber {
  /** 1-based position of the game within its chapter, in textbook order. */
  n: number;
  /** How many games the chapter has in total. */
  of: number;
}

/**
 * Number every game within its chapter (1, 2, 3, ...) in textbook order. The numbers always come from the
 * WHOLE chapter, never from a filtered or searched list, so "Game 3" stays Game 3 wherever it is shown.
 */
export function numberGames<E extends EntryLike>(entries: E[]): Map<string, GameNumber> {
  const byChapter = new Map<string, E[]>();
  for (const e of [...entries].sort((a, b) => compareGames(a.manifest, b.manifest))) {
    const m = e.manifest;
    const key = `${m.subject}|${m.classLevel}|${m.chapter.number}`;
    byChapter.set(key, [...(byChapter.get(key) ?? []), e]);
  }
  const out = new Map<string, GameNumber>();
  for (const list of byChapter.values()) list.forEach((e, i) => out.set(e.manifest.id, { n: i + 1, of: list.length }));
  return out;
}

/**
 * Group games into courses (subject + class) and chapters. Chapters come from the curriculum files AND
 * from the games themselves, so a chapter with games always shows, and a planned chapter with none still
 * appears (as "coming soon"). Entries keep the order they are given in within a chapter.
 */
export function buildCourses<E extends EntryLike>(entries: E[], curricula: Curriculum[]): Course<E>[] {
  const courses = new Map<string, Course<E>>();
  const courseOf = (subject: string, classLevel: number) => {
    const key = `${subject}|${classLevel}`;
    let c = courses.get(key);
    if (!c) {
      c = { subject, classLevel, chapters: [] };
      courses.set(key, c);
    }
    return c;
  };
  const chapterOf = (c: Course<E>, number: number, name: string) => {
    let ch = c.chapters.find((x) => x.number === number);
    if (!ch) {
      ch = { number, name, games: [] };
      c.chapters.push(ch);
    }
    return ch;
  };

  for (const cur of curricula) {
    const c = courseOf(cur.subject, cur.classLevel);
    for (const ch of cur.chapters) chapterOf(c, ch.number, ch.name);
  }
  for (const e of entries) {
    const m = e.manifest;
    chapterOf(courseOf(m.subject, m.classLevel), m.chapter.number, m.chapter.name).games.push(e);
  }

  const out = [...courses.values()].sort((a, b) => subjectRank(a.subject) - subjectRank(b.subject) || a.subject.localeCompare(b.subject) || a.classLevel - b.classLevel);
  out.forEach((c) => c.chapters.sort((a, b) => a.number - b.number));
  return out;
}

// ---- status and progress -------------------------------------------------------------------

export type GameStatus = 'new' | 'progress' | 'done';
export type Filter = 'all' | 'new' | 'progress' | 'done';

export function gameStatus(store: Store, m: GameManifest): GameStatus {
  let done = 0;
  for (let l = 1; l <= m.levels.length; l++) if (levelStars(store, m.id, l) > 0) done++;
  return done === 0 ? 'new' : done === m.levels.length ? 'done' : 'progress';
}

export const matchesFilter = (status: GameStatus, filter: Filter) => filter === 'all' || status === filter;

export interface Stats {
  games: number;
  gamesDone: number;
  levelsDone: number;
  levelsTotal: number;
  stars: number;
  maxStars: number;
}

export function statsFor(store: Store, games: EntryLike[]): Stats {
  const s: Stats = { games: games.length, gamesDone: 0, levelsDone: 0, levelsTotal: 0, stars: 0, maxStars: 0 };
  for (const { manifest: m } of games) {
    s.levelsTotal += m.levels.length;
    s.maxStars += m.levels.length * 3;
    for (let l = 1; l <= m.levels.length; l++) {
      const st = levelStars(store, m.id, l);
      if (st > 0) s.levelsDone++;
      s.stars += st;
    }
    if (gameStatus(store, m) === 'done') s.gamesDone++;
  }
  return s;
}

/** The first level of a game the student has not beaten yet, or null when every level is done. */
export function nextLevel(store: Store, m: GameManifest): number | null {
  for (let l = 1; l <= m.levels.length; l++) if (levelStars(store, m.id, l) === 0) return Math.min(l, highestUnlocked(store, m.id, m.levels.length));
  return null;
}

// ---- search --------------------------------------------------------------------------------

/**
 * Every word you type must match somewhere in the game's title, summary, concepts, chapter, section
 * or subject/class. Title and concept matches rank above the rest. Empty query returns nothing.
 */
export function searchEntries<E extends EntryLike>(entries: E[], query: string): E[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const scored: { e: E; score: number; order: number }[] = [];
  entries.forEach((e, order) => {
    const m = e.manifest;
    const title = m.title.toLowerCase();
    const concepts = m.concepts.join(' ').toLowerCase();
    const rest = `${m.summary} ${m.chapter.name} ${m.ncertRef} ${m.subject} class ${m.classLevel} chapter ${m.chapter.number} ${m.levels.map((l) => l.title).join(' ')}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (title.includes(t)) score += 3;
      else if (concepts.includes(t)) score += 2;
      else if (rest.includes(t)) score += 1;
      else return;
    }
    scored.push({ e, score, order });
  });
  return scored.sort((a, b) => b.score - a.score || a.order - b.order).map((x) => x.e);
}

// ---- continue where you left off -----------------------------------------------------------

export interface Continue<E> {
  entry: E;
  level: number;
  /** continue: the game you were last in; next: the next unfinished game; start: you have not played yet. */
  kind: 'continue' | 'next' | 'start';
}

/** Where to send the student from the home page. null when every game is finished. */
export function continueTarget<E extends EntryLike>(store: Store, last: LastPlayed | null, entries: E[]): Continue<E> | null {
  const lastIdx = last ? entries.findIndex((e) => e.manifest.id === last.id) : -1;
  if (lastIdx >= 0) {
    const level = nextLevel(store, entries[lastIdx].manifest);
    if (level !== null) return { entry: entries[lastIdx], level, kind: 'continue' };
  }
  const after = lastIdx >= 0 ? [...entries.slice(lastIdx + 1), ...entries.slice(0, lastIdx)] : entries;
  for (const e of after) {
    const level = nextLevel(store, e.manifest);
    if (level !== null) return { entry: e, level, kind: lastIdx >= 0 ? 'next' : 'start' };
  }
  return null;
}
