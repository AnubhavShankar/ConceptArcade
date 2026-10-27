const KEY = 'concept-arcade:v1';

type Store = Record<string, { stars: number; plays: number }>;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

export function getStars(gameId: string): number {
  return read()[gameId]?.stars ?? 0;
}

/** Keeps the best star count. Silently no-ops if storage is unavailable (private mode etc.). */
export function recordResult(gameId: string, stars: number): void {
  const store = read();
  const prev = store[gameId];
  store[gameId] = { stars: Math.max(prev?.stars ?? 0, stars), plays: (prev?.plays ?? 0) + 1 };
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export function starString(n: number): string {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));
}
