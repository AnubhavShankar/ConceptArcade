// Pure game rules: no DOM. Charges are exact integers in picocoulombs, so there is no float noise.
import { pick } from '@core/quiz';

export type Unit = 'mC' | 'µC' | 'nC' | 'pC';
/** How many pC one of each unit is. */
export const PC: Record<Unit, number> = { mC: 1e9, µC: 1e6, nC: 1e3, pC: 1 };
const UNITS: Unit[] = ['mC', 'µC', 'nC', 'pC'];

export function autoUnit(pc: number): Unit {
  const a = Math.abs(pc);
  return a >= 1e9 ? 'mC' : a >= 1e6 ? 'µC' : a >= 1e3 ? 'nC' : 'pC';
}

/** "+8.4 µC", "−3200 nC", "0". Auto-ranges to a sensible prefix unless one is given. */
export function fmtCharge(pc: number, unit?: Unit): string {
  if (pc === 0) return '0';
  const u = unit ?? autoUnit(pc);
  // Charges are exact whole picocoulombs, so show every digit (10 significant figures only strips float noise).
  return `${pc < 0 ? '−' : '+'}${Number(Math.abs(pc / PC[u]).toPrecision(10))} ${u}`;
}

export const toPc = (value: number, unit: Unit) => Math.round(value * PC[unit]);

/** How many decimal places a charge needs when written in a prefix. Exact, because charges are whole pC. */
export function decimals(pc: number, unit: Unit): number {
  const s = (Math.abs(pc) / PC[unit]).toFixed(12).replace(/0+$/, '').replace(/\.$/, '');
  return s.includes('.') ? s.split('.')[1].length : 0;
}

/**
 * The prefix to write these charges in: the natural one for the largest of them (so it matches what the
 * game's readouts show), unless that needs more than 2 decimal places, in which case the next finer
 * prefix that does not. Worked arithmetic therefore stays in the game's own units and never needs rounding.
 */
export function bestUnit(values: number[]): Unit {
  const auto = autoUnit(Math.max(...values.map(Math.abs), 1));
  for (const u of UNITS.slice(UNITS.indexOf(auto))) {
    if (Math.max(...values.map((v) => Math.abs(v) / PC[u])) >= 100000) break; // too many digits to read
    if (Math.max(...values.map((v) => decimals(v, u))) <= 2) return u;
  }
  return auto;
}

// ---- physics -------------------------------------------------------------------------------

/** Two identical conductors touch and part: each keeps half of the combined charge. */
export function touch(s: number[], i: number, j: number): number[] {
  const m = (s[i] + s[j]) / 2;
  const n = [...s];
  n[i] = m;
  n[j] = m;
  return n;
}

export const total = (s: number[]) => s.reduce((a, b) => a + b, 0);
/** A composite body's net charge is the algebraic sum of its internal charges. */
export const netOf = (parts: number[]) => parts.reduce((a, b) => a + b, 0);

export interface Level {
  names: string[];
  /** Charges (pC) at the start. */
  start: number[];
  /**
   * Internal charges (pC) per body when the body is a composite cell (level 3), else null.
   * On level 3 the LAST part is the sealed capsule: its value is never shown, and it equals the target.
   */
  parts: (number[] | null)[];
  vault: number;
  /** Required vault charge (pC) and the prefix the door asks in. */
  target: number;
  targetUnit: Unit;
  /** Fewest touches that put the target in the vault (found by search). */
  par: number;
  /** Level 3: the door does not state the charge, it says "match the sealed capsule", so it must be deduced. */
  hiddenTarget: boolean;
  story: string;
}

export function movesOf(n: number): [number, number][] {
  const ms: [number, number][] = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) ms.push([a, b]);
  return ms;
}

const key = (s: number[]) => s.join(',');

/** Breadth-first search: fewest touches until the vault holds `target`. null if not reachable. */
export function solve(start: number[], vault: number, target: number, maxDepth = 7): number | null {
  if (start[vault] === target) return 0;
  const moves = movesOf(start.length);
  let frontier = [start];
  const seen = new Set([key(start)]);
  for (let depth = 1; depth <= maxDepth; depth++) {
    const next: number[][] = [];
    for (const s of frontier) {
      for (const [a, b] of moves) {
        const t = touch(s, a, b);
        const k = key(t);
        if (seen.has(k)) continue;
        if (t[vault] === target) return depth;
        seen.add(k);
        next.push(t);
      }
    }
    frontier = next;
  }
  return null;
}

/** One shortest sequence of touches that puts `target` in the vault (breadth-first, so it is minimal). */
export function solutionPath(start: number[], vault: number, target: number, maxDepth = 7): [number, number][] | null {
  if (start[vault] === target) return [];
  const moves = movesOf(start.length);
  let frontier: { s: number[]; via: [number, number][] }[] = [{ s: start, via: [] }];
  const seen = new Set([key(start)]);
  for (let depth = 1; depth <= maxDepth; depth++) {
    const next: typeof frontier = [];
    for (const n of frontier) {
      for (const [a, b] of moves) {
        const t = touch(n.s, a, b);
        const k = key(t);
        if (seen.has(k)) continue;
        const via: [number, number][] = [...n.via, [a, b]];
        if (t[vault] === target) return via;
        seen.add(k);
        next.push({ s: t, via });
      }
    }
    frontier = next;
  }
  return null;
}

export interface Explanation {
  /** The set-up: door conversion, composite nets. */
  setup: string[];
  /** One entry per touch: the arithmetic, and why the touch is useful. */
  steps: { calc: string; note: string }[];
  /** The reasoning that finds the plan, and why it cannot be shorter. */
  rationale: string[];
}

/** Show a charge in a given prefix; zero is just "0". */
const inUnit = (q: number, u: Unit) => (q === 0 ? '0' : fmtCharge(q, u));
/** For use inside arithmetic: positives plain ("3.1 µC"), negatives bracketed ("(−3.7 µC)"), zero "0". */
const term = (q: number, u: Unit) => (q === 0 ? '0' : q < 0 ? `(${fmtCharge(q, u)})` : fmtCharge(q, u).slice(1));

/** The fewest-touches solution with the calculation and the reasoning behind it. */
export function explainSolution(level: Level): Explanation {
  const path = solutionPath(level.start, level.vault, level.target);
  if (path === null) throw new Error('level has no solution');
  const { names, vault, target, targetUnit } = level;
  const setup: string[] = [];

  const door = fmtCharge(target, targetUnit);
  const seen = fmtCharge(target);
  if (level.hiddenTarget) {
    // Level 3: the door only says "match the sealed capsule", so the first job is to deduce that charge.
    level.parts.forEach((parts, i) => {
      if (!parts) return;
      const listed = parts.slice(0, -1);
      const u = bestUnit([...parts, netOf(parts)]);
      setup.push(`The door only asks you to match the sealed capsule in ${names[i]}. A cell's net charge is the algebraic sum of ALL its internal charges, the sealed one included.`);
      setup.push(`Measuring ${names[i]} with the electrometer gives a net charge of ${inUnit(netOf(parts), u)}. The listed charges add up to ${listed.map((p) => term(p, u)).join(' + ')} = ${inUnit(netOf(listed), u)}.`);
      setup.push(`So the sealed capsule holds ${inUnit(netOf(parts), u)} − ${term(netOf(listed), u)} = ${inUnit(target, u)}. That is the charge the vault must end up with.`);
    });
  } else {
    setup.push(door === seen ? `The door asks for ${door}.` : `The door asks for ${door}, which is ${seen} in the prefix the readouts use. Convert first, then compare.`);
  }

  const steps: Explanation['steps'] = [];
  let s = level.start;
  let lastBefore: number[] = s;
  path.forEach(([a, b], idx) => {
    const qa = s[a];
    const qb = s[b];
    const after = (qa + qb) / 2;
    const u = bestUnit([qa, qb, after]);
    const calc = `Touch ${names[a]} (${inUnit(qa, u)}) with ${names[b]} (${inUnit(qb, u)}): (${term(qa, u)} + ${term(qb, u)}) / 2 = ${inUnit(after, u)} on each.`;
    let note: string;
    if (qa === 0 || qb === 0) {
      const [blank, other] = qa === 0 ? [names[a], names[b]] : [names[b], names[a]];
      note = `${blank} starts blank, so the touch just halves ${other}’s charge between the two (a blank body is a halver).`;
    } else if (Math.sign(qa) !== Math.sign(qb)) note = 'The charges have opposite signs, so they partly cancel in the sum before the result is shared equally.';
    else note = 'Both bodies carry the same sign, so each ends up with the average of the two.';
    if (a === vault || b === vault) note += ` This puts ${inUnit(after, u)} in the vault${idx === path.length - 1 ? ', exactly what the door asks.' : '.'}`;
    steps.push({ calc, note });
    if (idx === path.length - 1) lastBefore = s;
    s = touch(s, a, b);
  });

  const rationale: string[] = [];
  const last = path[path.length - 1];
  if (last) {
    const partner = last[0] === vault ? last[1] : last[0];
    const vBefore = lastBefore[vault];
    const need = 2 * target - vBefore;
    const u = bestUnit([target, lastBefore[partner], vBefore, need]);
    rationale.push(
      `Working backwards: before the last touch the vault held ${inUnit(vBefore, u)} and ${names[partner]} held an unknown charge p. The vault ends with (${term(vBefore, u)} + p) / 2 = ${inUnit(target, u)}, so p = 2 × ${term(target, u)} − ${term(vBefore, u)} = ${inUnit(need, u)}. Everything earlier exists to build ${inUnit(need, u)} in ${names[partner]}.`,
    );
  }
  rationale.push(
    `Fewest possible: ${path.length} touch${path.length === 1 ? '' : 'es'}. A search of every sequence of ${path.length - 1} or fewer touches finds none that leaves exactly ${door} in the vault, so ${path.length} cannot be beaten.`,
  );
  const tu = bestUnit([...level.start, total(level.start), total(s)]);
  rationale.push(`Check: touching never changes the total. It is ${inUnit(total(level.start), tu)} before and ${inUnit(total(s), tu)} after.`);
  return { setup, steps, rationale };
}

export interface SealVerdict {
  ok: boolean;
  /** Set when the vault reads a power of ten away from the target: the classic prefix mistake. */
  prefixFactor?: number;
}

export function judgeSeal(vaultPc: number, targetPc: number): SealVerdict {
  if (vaultPc === targetPc) return { ok: true };
  if (vaultPc !== 0 && targetPc !== 0 && Math.sign(vaultPc) === Math.sign(targetPc)) {
    const ratio = vaultPc / targetPc;
    const k = Math.log10(ratio);
    if (Math.abs(k - Math.round(k)) < 1e-9 && Math.round(k) !== 0) return { ok: false, prefixFactor: ratio };
  }
  return { ok: false };
}

export function starsFor(moves: number, par: number, overloads: number): 1 | 2 | 3 {
  const base = moves <= par ? 3 : moves <= par + 1 ? 2 : 1;
  return Math.max(1, Math.min(base, 3 - overloads)) as 1 | 2 | 3;
}

// ---- levels --------------------------------------------------------------------------------

const int = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const sgn = (r: () => number) => (r() < 0.5 ? -1 : 1);

/** A random sequence of real touches (no no-ops, always whole picocoulombs). */
function walk(start: number[], random: () => number, steps: number): number[] {
  let s = start;
  const moves = movesOf(start.length);
  for (let i = 0; i < steps; i++) {
    for (let tries = 0; tries < 60; tries++) {
      const [a, b] = moves[Math.floor(random() * moves.length)];
      if (s[a] === s[b] || (s[a] + s[b]) % 2 !== 0) continue;
      s = touch(s, a, b);
      break;
    }
  }
  return s;
}

/**
 * A prefix for the door that is NOT the one the vault would show, so a conversion is needed.
 * The required charge never needs more than 2 decimal places in the prefix the door uses.
 * Prefers a prefix that gives a friendly number (1 to 9999, like "4500 nC"); only if none exists does it
 * accept a smaller or larger one (0.001 to 99999). null if there is no such prefix: the caller retries.
 */
function doorUnit(pc: number, random: () => number): Unit | null {
  const natural = autoUnit(pc);
  const within = (lo: number, hi: number) =>
    UNITS.filter((u) => u !== natural && Math.abs(pc / PC[u]) >= lo && Math.abs(pc / PC[u]) < hi && decimals(pc, u) <= 2);
  const friendly = within(1, 10000);
  const ok = friendly.length ? friendly : within(0.001, 100000);
  return ok.length ? pick(ok, random) : null;
}

/**
 * Terminal A's internal charges for the sealed-capsule level: two listed charges (one in nC, one in µC) and
 * the sealed capsule, which equals the target. The three add up to `net`, so net − listed = capsule.
 */
function capsuleParts(net: number, target: number, random: () => number): number[] | null {
  const rest = net - target; // what the two listed charges must add up to
  for (let t = 0; t < 60; t++) {
    const p1 = sgn(random) * int(random, 1, 9) * 100_000; // 100 to 900 nC
    const p2 = rest - p1;
    const distinct = p1 !== p2 && p1 !== target && p2 !== target && p1 !== 0 && p2 !== 0;
    if (distinct && autoUnit(p1) === 'nC' && autoUnit(p2) === 'µC') return [p1, p2, target];
  }
  return null;
}

const NAMES4 = ['Terminal A', 'Terminal B', 'Blank sphere', 'Vault'];

function make(level: number, start: number[], names: string[], steps: number, minPar: number, maxPar: number, story: string, random: () => number, capsule = false): Level | null {
  const vault = names.length - 1;
  const end = walk(start, random, steps);
  const target = end[vault];
  if (target === 0 || target === start[vault]) return null;
  const par = solve(start, vault, target);
  if (par === null || par < minPar || par > maxPar) return null;
  // Level 3: Terminal A is a composite cell whose last internal charge is a sealed capsule equal to the target.
  const capsuleA = capsule ? capsuleParts(start[0], target, random) : null;
  if (capsule && capsuleA === null) return null;
  const parts = start.map((_, i) => (i === 0 ? capsuleA : null));
  // The required charge is never more than 2 decimal places, in the door's prefix AND in the prefix the
  // vault reads in, so no rounding is ever needed to compare them.
  if (decimals(target, autoUnit(target)) > 2) return null;
  // Level 1 is the gentle one: door and readouts must share a prefix (µC), so no conversion is needed yet.
  if (level === 1 && (autoUnit(target) !== 'µC' || decimals(target, 'µC') > 2)) return null;
  const targetUnit = level === 1 ? 'µC' : doorUnit(target, random);
  if (targetUnit === null) return null;
  return { names, start, parts, vault, target, targetUnit, par, hiddenTarget: capsule, story };
}

/**
 * What the circuit says after a wrong seal. On the capsule level it must NOT reveal the hidden charge
 * (or even a factor-of-1000 hint), otherwise the overload would give the answer away.
 */
export function sealMessage(level: Level, vaultPc: number, verdict: SealVerdict): string {
  if (level.hiddenTarget) return 'OVERLOAD! The vault does not match the sealed capsule. (That cost a star.)';
  const reads = fmtCharge(vaultPc);
  const wants = fmtCharge(level.target, level.targetUnit);
  if (verdict.prefixFactor) {
    const f = verdict.prefixFactor;
    return `OVERLOAD! The vault holds ${reads} but the door wants ${wants}: that is off by a factor of ${f >= 1 ? f : '1/' + 1 / f}. Check your prefixes. (That cost a star.)`;
  }
  return `OVERLOAD! The vault holds ${reads}, not ${wants}. (That cost a star.)`;
}

export function buildLevel(level: number, random: () => number): Level {
  for (let attempt = 0; attempt < 3000; attempt++) {
    let lvl: Level | null = null;
    if (level === 1) {
      // Multiples of 0.8 µC: halving them up to four times never needs more than 2 decimal places.
      const a = int(random, 4, 15) * 800_000;
      const b = -int(random, 2, 7) * 800_000;
      lvl = make(1, [a, b, 0, 0], NAMES4, 3, 2, 3, 'The vault’s lock needs an exact charge, but the only sources are two terminals with mismatched charges. Every body here is an identical conductor, so touching two of them shares their combined charge equally. Route exactly the charge on the door panel into the vault.', random);
    } else if (level === 2) {
      const a = int(random, 2, 11) * 800_000_000; // 1.6 to 8.8 mC, multiples of 0.8 mC
      const b = -int(random, 1, 2) * 400_000_000; // −0.4 or −0.8 mC: reads in µC, so mC and µC are mixed
      lvl = make(2, [a, b, 0, 0], NAMES4, 3, 3, 4, 'The readouts are in different prefixes, and the door panel asks in yet another. The circuit overloads if you seal with a charge that is off by a factor of a thousand.', random);
    } else if (level === 3) {
      const a = int(random, 4, 11) * 800_000;
      const b = -int(random, 2, 6) * 800_000;
      lvl = make(3, [a, b, 0, 0], NAMES4, 3, 3, 4, 'Terminal A is a composite cell: two charges are listed on its label, and a third is sealed inside a capsule. The vault door does not state a number. It only says “match the capsule”. Measure the cell with the electrometer, work out what the capsule holds, then route exactly that charge into the vault. A wrong seal overloads the circuit and gives nothing away.', random, true);
    } else {
      const a = int(random, 2, 6) * 1600;
      const b = -int(random, 1, 3) * 1600;
      lvl = make(4, [a, b, 0, 0, 0], ['Terminal A', 'Terminal B', 'Blank sphere 1', 'Blank sphere 2', 'Vault'], 5, 4, 6, 'At the fine-particle scale the door asks for a charge only a few picocoulombs wide. It takes a long chain of touches to get down there, so plan it before you start.', random);
    }
    if (lvl) return lvl;
  }
  throw new Error('could not generate a level');
}
