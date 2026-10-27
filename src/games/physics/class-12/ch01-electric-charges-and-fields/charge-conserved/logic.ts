// Pure game rules: no DOM. The UI only draws and animates.
import { pick, shuffle } from '@core/quiz';

/** Charges (µC) on the spheres, in order A, B, C, ... */
export type State = number[];
/** Goal per sphere; null means "don't care". */
export type Target = (number | null)[];

export interface Level {
  start: State;
  target: Target;
  allowGround: boolean;
  /** Fewest moves that can reach the goal (found by search), the benchmark for 3 stars. */
  par: number;
  story: string;
}

export type Move = { kind: 'touch'; a: number; b: number } | { kind: 'ground'; a: number };

export const LETTERS = 'ABCDEF';
export const total = (s: State) => s.reduce((a, b) => a + b, 0);

/** Two identical conducting spheres touch and part: each keeps half of the combined charge. */
export function touch(s: State, i: number, j: number): State {
  const m = (s[i] + s[j]) / 2;
  const n = [...s];
  n[i] = m;
  n[j] = m;
  return n;
}

/** A sphere touched to the Earth loses all its charge to the ground. */
export function ground(s: State, i: number): State {
  const n = [...s];
  n[i] = 0;
  return n;
}

export function apply(s: State, m: Move): State {
  return m.kind === 'touch' ? touch(s, m.a, m.b) : ground(s, m.a);
}

export const isGoal = (s: State, t: Target) => t.every((x, i) => x === null || Math.abs(s[i] - x) < 1e-9);

const key = (s: State) => s.map((x) => Math.round(x * 1024)).join(',');

export function movesFrom(n: number, allowGround: boolean): Move[] {
  const ms: Move[] = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) ms.push({ kind: 'touch', a, b });
  if (allowGround) for (let a = 0; a < n; a++) ms.push({ kind: 'ground', a });
  return ms;
}

/** Breadth-first search for the fewest moves to the goal. null if not reachable within `maxDepth`. */
export function solve(start: State, target: Target, allowGround: boolean, maxDepth = 7): number | null {
  if (isGoal(start, target)) return 0;
  const moves = movesFrom(start.length, allowGround);
  let frontier: State[] = [start];
  const seen = new Set([key(start)]);
  for (let depth = 1; depth <= maxDepth; depth++) {
    const next: State[] = [];
    for (const s of frontier) {
      for (const m of moves) {
        const t = apply(s, m);
        const k = key(t);
        if (seen.has(k)) continue;
        if (isGoal(t, target)) return depth;
        seen.add(k);
        next.push(t);
      }
    }
    frontier = next;
  }
  return null;
}

export function starsForMoves(moves: number, par: number): 1 | 2 | 3 {
  return moves <= par ? 3 : moves <= par + 1 ? 2 : 1;
}

// ---- levels --------------------------------------------------------------------------------

const sgn = (random: () => number) => (random() < 0.5 ? -1 : 1);

function walk(start: State, random: () => number, steps: number, allowGround: boolean): State {
  let s = start;
  const moves = movesFrom(start.length, allowGround);
  for (let i = 0; i < steps; i++) {
    for (let tries = 0; tries < 30; tries++) {
      const m = moves[Math.floor(random() * moves.length)];
      const t = apply(s, m);
      if (key(t) !== key(s)) {
        s = t;
        break;
      }
    }
  }
  return s;
}

export function buildLevel(level: number, random: () => number): Level {
  for (let attempt = 0; attempt < 400; attempt++) {
    if (level === 1) {
      const q = pick([8, 16], random) * sgn(random);
      const start = shuffle([q, 0, 0], random);
      const target = walk(start, random, 2, false);
      const par = solve(start, target, false);
      if (par === 2) return { start, target, allowGround: false, par, story: 'Your lab has three identical metal spheres on insulating stands, and one of them is charged. An experiment needs exact charges on each. Touch pairs of spheres together until every sphere matches its goal.' };
    } else if (level === 2) {
      const a = pick([8, 12, 16], random);
      const b = -pick([4, 8], random);
      const s = sgn(random);
      const start = shuffle([a * s, b * s, 0, 0], random);
      const target = walk(start, random, 3, false);
      const par = solve(start, target, false);
      if (par !== null && par >= 3 && !isGoal(start, target)) return { start, target, allowGround: false, par, story: 'A new batch arrives with both positive and negative spheres. The experiment wants exact charges again. Watch what happens when opposite charges meet.' };
    } else if (level === 3) {
      const q = pick([16, 32], random) * sgn(random);
      const start = [q, 0, 0, 0];
      const idx = 1 + Math.floor(random() * 3);
      const target: Target = [null, null, null, null];
      target[idx] = q / 8;
      const par = solve(start, target, false);
      if (par !== null && par >= 3) return { start, target, allowGround: false, par, story: `Only sphere ${LETTERS[idx]} matters this time. It must end up with exactly one eighth of the charge you started with. The other spheres can be left in any state.` };
    } else {
      const base = pick([8, 12, 16], random) * sgn(random);
      const start = shuffle([base, base / 2, 0, 0], random);
      const target = walk(start, random, 4, true);
      const par = solve(start, target, true);
      const needsGround = solve(start, target, false) === null;
      if (par !== null && par >= 3 && needsGround && Math.abs(total(target)) < Math.abs(total(start)) - 1e-9) {
        return { start, target, allowGround: true, par, story: 'The experiment needs less total charge than you have. A Ground tool is now available: touch a sphere to the Earth and its charge drains away. Reach the goal charges.' };
      }
    }
  }
  throw new Error('could not generate a level');
}
