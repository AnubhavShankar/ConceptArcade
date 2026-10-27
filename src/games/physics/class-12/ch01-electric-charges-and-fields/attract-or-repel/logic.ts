// Pure game rules: no DOM, no canvas. The UI in index.ts only draws and moves things.
import { shuffle } from '@core/quiz';

export type Sign = 1 | -1 | 0;
export type Reaction = 'attract' | 'repel' | 'none';

export const LETTERS = 'ABCDEFG';
export const symbol = (s: Sign) => (s > 0 ? '+' : s < 0 ? '−' : '0');

/**
 * What a charged (or neutral) rod does to a sphere.
 * Like charges repel; unlike attract; a neutral body is attracted by a charged one of EITHER sign;
 * two neutral bodies do nothing.
 */
export function reaction(rod: Sign, sphere: Sign): Reaction {
  if (rod === 0 && sphere === 0) return 'none';
  if (rod === 0 || sphere === 0) return 'attract';
  return rod === sphere ? 'repel' : 'attract';
}

// ---- the physics of the swing --------------------------------------------------------------

/** Beyond this distance (px) a rod has no effect, so a parked rod never gives anything away. */
export const REACH = 120;
export const STRENGTH = 1800;

/**
 * Horizontal acceleration (px/s²) of a hanging sphere, given the reaction and where the rod tip is.
 * `dx` is rod.x − sphere.x, `dist` the straight-line distance.
 * The magnitude is the SAME for every pair: only the direction carries information, so a neutral
 * sphere can't be told apart from a charged one by how hard it moves.
 */
export function pullAccel(r: Reaction, dx: number, dist: number): number {
  if (r === 'none' || dist < 1 || dist > REACH) return 0;
  const magnitude = STRENGTH * (1 - (dist / REACH) ** 2); // fades smoothly to zero at REACH
  return (r === 'attract' ? 1 : -1) * (dx / dist) * magnitude;
}

// ---- levels --------------------------------------------------------------------------------

export interface Rod {
  id: string;
  label: string;
  sign: Sign;
  /** How the rod is presented: its sign, its material (convention level) or just a letter (unknown). */
  style: 'sign' | 'material' | 'letter';
  color: string;
}

export interface Level {
  /** Hidden signs of the spheres the student must identify. */
  spheres: Sign[];
  rods: Rod[];
  /** A known-positive sphere hangs in the scene (calibration level). */
  reference: boolean;
  /** The student must also say whether rod X is + or −. */
  tagRod: boolean;
  /** The student is told there is exactly one +, one − and one neutral sphere (level 1). */
  oneOfEach: boolean;
  story: string;
}

const PLUS: Rod = { id: 'plus', label: '+ rod', sign: 1, style: 'sign', color: '#c0392b' };
const MINUS: Rod = { id: 'minus', label: '− rod', sign: -1, style: 'sign', color: '#3156d3' };
const GLASS: Rod = { id: 'glass', label: 'Glass rod (rubbed with silk)', sign: 1, style: 'material', color: '#6fc7e6' };
const PLASTIC: Rod = { id: 'plastic', label: 'Plastic rod (rubbed with fur)', sign: -1, style: 'material', color: '#d9a441' };

const ALL: Sign[] = [1, -1, 0];

/** Draw `n` signs at random, retrying until `ok` accepts the set. */
function draw(n: number, random: () => number, ok: (s: Sign[]) => boolean): Sign[] {
  for (let i = 0; i < 200; i++) {
    const s = Array.from({ length: n }, () => ALL[Math.floor(random() * 3)]);
    if (ok(s)) return s;
  }
  return shuffle([1, -1, 0, 0, 1].slice(0, n) as Sign[], random);
}

const hasAll = (s: Sign[]) => ALL.every((k) => s.includes(k));

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    return {
      spheres: shuffle<Sign>([1, -1, 0], random),
      rods: [PLUS, MINUS],
      reference: false,
      tagRod: false,
      oneOfEach: true,
      story: 'The curator’s three sealed spheres have lost their labels. One is positive, one is negative and one is neutral. Bring a rod near each sphere, watch which way it swings, then tag them.',
    };
  }
  if (level === 2) {
    return {
      spheres: draw(4, random, (s) => s.includes(0) && s.some((x) => x !== 0)),
      rods: [PLUS, MINUS],
      reference: false,
      tagRod: false,
      oneOfEach: false,
      story: 'Four more spheres arrive, and this time nobody says how many of each kind there are. The springs are tuned so every push or pull looks equally strong. Only the direction tells you anything.',
    };
  }
  if (level === 3) {
    return {
      spheres: draw(5, random, hasAll),
      rods: [GLASS, PLASTIC],
      reference: false,
      tagRod: false,
      oneOfEach: false,
      story: 'The curator hands you two rods she charged herself: glass rubbed with silk, and plastic rubbed with fur. She did not label their signs. Five spheres to identify.',
    };
  }
  const s: Sign = random() < 0.5 ? 1 : -1;
  return {
    spheres: draw(5, random, hasAll),
    rods: [
      { id: 'x', label: 'Rod X', sign: s, style: 'letter', color: '#8a93a3' },
      { id: 'y', label: 'Rod Y', sign: (-s) as Sign, style: 'letter', color: '#8a93a3' },
    ],
    reference: true,
    tagRod: true,
    oneOfEach: false,
    story: 'A shipment arrives with two unlabelled rods, X and Y: one is positive and one is negative, but nobody knows which. A reference sphere marked + hangs on the left. Calibrate your rods first, then identify the five spheres and say whether rod X is + or −.',
  };
}

// ---- deduction and scoring -----------------------------------------------------------------

export interface Observation {
  rodSign: Sign;
  reaction: Reaction;
}

/** Signs a sphere could have, given everything seen so far (rod signs known). */
export function possibleSigns(obs: Observation[]): Sign[] {
  return ALL.filter((s) => obs.every((o) => reaction(o.rodSign, s) === o.reaction));
}

/** One probe the student has made: which rod, on what, and what happened. */
export interface Probe {
  rod: number;
  target: number | 'ref';
  reaction: Reaction;
}

export interface Deduction {
  /** A sphere's sign if the notebook PROVES it, otherwise null. */
  spheres: (Sign | null)[];
  /** Rod X's sign if proven (calibration level), otherwise null. */
  rodX: Sign | null;
}

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

/**
 * What the notebook actually proves. A lucky guess is not a deduction, so the game only accepts a
 * submission once every label is proven here.
 *  - Rod signs are known (levels 1 to 3), or must be worked out from the reference sphere (level 4).
 *  - On level 1 the "one of each" rule can finish the job for the last sphere.
 */
export function deduce(level: Pick<Level, 'rods' | 'reference' | 'oneOfEach'>, n: number, probes: Probe[]): Deduction {
  // Hypotheses about the signs of [rod 0, rod 1] that fit what was seen on the known-positive reference.
  const hypotheses: Sign[][] = level.reference
    ? ([[1, -1], [-1, 1]] as Sign[][]).filter((h) => probes.every((p) => p.target !== 'ref' || reaction(h[p.rod], 1) === p.reaction))
    : [level.rods.map((r) => r.sign)];

  const possible: Set<Sign>[] = Array.from({ length: n }, () => new Set<Sign>());
  for (let i = 0; i < n; i++) {
    for (const h of hypotheses) {
      for (const s of ALL) {
        if (probes.every((p) => p.target !== i || reaction(h[p.rod], s) === p.reaction)) possible[i].add(s);
      }
    }
  }

  let sets: Set<Sign>[] = possible;
  if (level.oneOfEach && n === 3) {
    const fits = permutations<Sign>([1, -1, 0]).filter((perm) => perm.every((s, i) => possible[i].has(s)));
    if (fits.length > 0) sets = perm3Sets(fits);
  }
  return {
    spheres: sets.map((s) => (s.size === 1 ? [...s][0] : null)),
    rodX: hypotheses.length === 1 ? hypotheses[0][0] : null,
  };
}

function perm3Sets(fits: Sign[][]): Set<Sign>[] {
  return [0, 1, 2].map((i) => new Set(fits.map((f) => f[i])));
}

/**
 * Probes a straightforward scan needs: try the + rod first; a push settles a sphere in one probe,
 * anything else needs the − rod as well. Calibration levels add one probe on the reference sphere.
 */
export function simpleScanCost(spheres: Sign[], calibrate = false): number {
  return spheres.reduce<number>((n, s) => n + (s === 1 ? 1 : 2), calibrate ? 1 : 0);
}

/** Efficiency stars from probes used vs the straightforward scan, minus a star per wrong submission. */
export function starsForRun(probes: number, cost: number, wrongSubmissions: number): 1 | 2 | 3 {
  const efficiency = probes <= cost ? 3 : probes <= cost + 2 ? 2 : 1;
  return Math.max(1, Math.min(efficiency, 3 - wrongSubmissions)) as 1 | 2 | 3;
}

export function scoreTags(truth: Sign[], given: (Sign | null)[]) {
  const correct = truth.filter((t, i) => given[i] === t).length;
  return { correct, total: truth.length, allCorrect: correct === truth.length, complete: given.length >= truth.length && given.slice(0, truth.length).every((g) => g !== null) };
}
