const KEY = 'concept-arcade:v2';

export interface GameProgress {
  /** Best stars per level, keyed by 1-based level number. */
  levels: Record<string, number>;
  plays: number;
}
export type Store = Record<string, GameProgress>;

// ---- pure helpers (unit-tested) ------------------------------------------------------------

export function applyResult(store: Store, gameId: string, level: number, stars: number): Store {
  const prev = store[gameId] ?? { levels: {}, plays: 0 };
  return {
    ...store,
    [gameId]: {
      plays: prev.plays + 1,
      levels: { ...prev.levels, [level]: Math.max(prev.levels[level] ?? 0, stars) },
    },
  };
}

export function levelStars(store: Store, gameId: string, level: number): number {
  return store[gameId]?.levels[level] ?? 0;
}

/** Level 1 is always open; level n opens once level n-1 has been beaten. */
export function isUnlocked(store: Store, gameId: string, level: number): boolean {
  return level <= 1 || levelStars(store, gameId, level - 1) > 0;
}

/** Highest level the student may play right now. */
export function highestUnlocked(store: Store, gameId: string, levelCount: number): number {
  let n = 1;
  while (n < levelCount && isUnlocked(store, gameId, n + 1)) n++;
  return n;
}

export function summarise(store: Store, gameId: string, levelCount: number) {
  let completed = 0;
  let stars = 0;
  for (let l = 1; l <= levelCount; l++) {
    const s = levelStars(store, gameId, l);
    if (s > 0) completed++;
    stars += s;
  }
  return { completed, stars, maxStars: levelCount * 3 };
}

// ---- "continue where you left off" ---------------------------------------------------------

const LAST_KEY = 'concept-arcade:last';

export interface LastPlayed {
  id: string;
  level: number;
}

export function saveLast(id: string, level: number): void {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({ id, level }));
  } catch {
    /* ignore */
  }
}

export function loadLast(): LastPlayed | null {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_KEY) ?? 'null');
    return v && typeof v.id === 'string' && Number.isInteger(v.level) ? { id: v.id, level: v.level } : null;
  } catch {
    return null;
  }
}

export function starString(n: number): string {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));
}

// ---- storage (silently degrades if unavailable: private mode, blocked storage) --------------

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

export function recordResult(gameId: string, level: number, stars: number): Store {
  const next = applyResult(loadStore(), gameId, level, stars);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
