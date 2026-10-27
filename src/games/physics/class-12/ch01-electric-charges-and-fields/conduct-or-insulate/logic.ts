// Pure game rules: no DOM, no canvas. The UI only draws the scene and reads these functions.
import { pick, shuffle } from '@core/quiz';

export type Kind = 'conductor' | 'semiconductor' | 'electrolyte' | 'insulator';

export interface Material {
  id: string;
  name: string;
  kind: Kind;
  /** Resistance on a relative scale. Insulators have none of the free charges needed, so it is infinite. */
  r: number;
  cost: number;
}

const M = (id: string, name: string, kind: Kind, r: number, cost: number): Material => ({ id, name, kind, r, cost });

export const MATERIALS: Material[] = [
  M('copper', 'Copper', 'conductor', 1, 9),
  M('aluminium', 'Aluminium', 'conductor', 1, 5),
  M('brass', 'Brass', 'conductor', 1, 6),
  M('steel', 'Steel', 'conductor', 1, 3),
  M('iron', 'Iron', 'conductor', 1, 2),
  M('carbon', 'Carbon-loaded rubber', 'conductor', 4, 2),
  M('saltgel', 'Salt-water gel', 'electrolyte', 2, 4),
  M('silicon', 'Silicon pad', 'semiconductor', 7, 3),
  M('rubber', 'Rubber', 'insulator', Infinity, 1),
  M('plastic', 'Plastic', 'insulator', Infinity, 1),
  M('glass', 'Glass', 'insulator', Infinity, 1),
  M('wood', 'Dry wood', 'insulator', Infinity, 1),
  M('nylon', 'Nylon', 'insulator', Infinity, 1),
  M('porcelain', 'Porcelain', 'insulator', Infinity, 1),
];

export const material = (id: string): Material => {
  const m = MATERIALS.find((x) => x.id === id);
  if (!m) throw new Error(`unknown material ${id}`);
  return m;
};

const int = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

const METALS = ['copper', 'aluminium', 'brass', 'steel', 'iron'];
const INSULATORS = ['rubber', 'plastic', 'glass', 'wood', 'nylon', 'porcelain'];

// ---- the circuit ---------------------------------------------------------------------------

export interface Slot {
  name: string;
  /** Material id, or null for an empty gap in the path. */
  material: string | null;
  /** Level 4: the materials you may choose from for this part. */
  options?: string[];
}

export interface Route {
  name: string;
  slots: Slot[];
}

export type Mode = 'single' | 'replace' | 'parallel' | 'tradeoff';

export interface Level {
  mode: Mode;
  routes: Route[];
  /** Materials you can swap in (levels 1 to 3). Level 4 uses each part's own options. */
  toolbox: string[];
  /** How many parts you may change from the start (null = no limit). */
  maxChanges: number | null;
  /** Largest total resistance that still drains the worker before they reach the nozzle. */
  rMax: number;
  /** Largest total cost allowed (level 4 only). */
  costCap: number | null;
  /** Seconds the worker takes to walk to the nozzle. */
  walk: number;
  story: string;
}

export type Config = (string | null)[][];

export const initialConfig = (level: Level): Config => level.routes.map((r) => r.slots.map((s) => s.material));

/** Resistance of parts in series: they add, and one insulator (or an empty gap) makes it infinite. */
export function routeResistance(parts: (string | null)[]): number {
  let total = 0;
  for (const id of parts) {
    if (id === null) return Infinity;
    total += material(id).r;
  }
  return total;
}

/** Routes in parallel: the conductances add, so any complete route lets charge through. */
export function circuitResistance(config: Config): number {
  const conductance = config.reduce((g, parts) => {
    const r = routeResistance(parts);
    return r === Infinity ? g : g + 1 / r;
  }, 0);
  return conductance === 0 ? Infinity : 1 / conductance;
}

export const costOf = (config: Config) => config.flat().reduce<number>((c, id) => c + (id === null ? 0 : material(id).cost), 0);

export const changesMade = (level: Level, config: Config): number => {
  const start = initialConfig(level);
  return config.flat().filter((id, i) => id !== start.flat()[i]).length;
};

export interface Blocked {
  route: number;
  slot: number;
  /** null: an empty gap. */
  material: string | null;
}

export interface Evaluation {
  /** Total resistance of the whole circuit. */
  resistance: number;
  /** Does the charge drain before the worker reaches the nozzle? */
  safe: boolean;
  /** The first part on each route that stops the charge (insulator or gap). */
  blocked: Blocked[];
}

export function evaluate(level: Level, config: Config): Evaluation {
  const resistance = circuitResistance(config);
  const blocked: Blocked[] = [];
  config.forEach((parts, route) => {
    const slot = parts.findIndex((id) => id === null || material(id).r === Infinity);
    if (slot >= 0) blocked.push({ route, slot, material: parts[slot] });
  });
  return { resistance, safe: resistance <= level.rMax, blocked };
}

/** Fraction of the worker's charge left after t seconds. Reaches 10% at the nozzle exactly when R = rMax. */
export function remaining(t: number, resistance: number, rMax: number, walk: number): number {
  if (!Number.isFinite(resistance)) return 1;
  return Math.exp(-(Math.LN10 / walk) * (rMax / resistance) * t);
}

/** The safety threshold: the worker is safe if 10% or less of the charge is left on arrival. */
export const SAFE_FRACTION = 0.1;

export type Check = { status: 'ok' } | { status: 'gap' } | { status: 'too-many-changes'; made: number; allowed: number } | { status: 'over-budget'; cost: number; cap: number };

/** Is this configuration allowed to be tested at all? These are mistakes you are told about, not sparks. */
export function checkConfig(level: Level, config: Config): Check {
  if (config.flat().some((id) => id === null)) return { status: 'gap' };
  if (level.maxChanges !== null) {
    const made = changesMade(level, config);
    if (made > level.maxChanges) return { status: 'too-many-changes', made, allowed: level.maxChanges };
  }
  if (level.costCap !== null) {
    const cost = costOf(config);
    if (cost > level.costCap) return { status: 'over-budget', cost, cap: level.costCap };
  }
  return { status: 'ok' };
}

/** Fewest part swaps that make some route complete (levels 1 to 3). */
export function minChanges(level: Level): number {
  const start = initialConfig(level);
  return Math.min(...start.map((parts) => parts.filter((id) => id === null || material(id).r === Infinity).length));
}

// ---- explanations --------------------------------------------------------------------------

const slotLabel = (level: Level, b: Blocked) => {
  const r = level.routes[b.route];
  return level.routes.length > 1 ? `${r.name}, ${r.slots[b.slot].name}` : r.slots[b.slot].name;
};

/** Why a test failed: names the real culprit, and what an insulator or resistance means. */
export function explainFailure(level: Level, config: Config): string {
  const ev = evaluate(level, config);
  if (ev.blocked.length === config.length) {
    // every route is cut: name EVERY insulating part, not just the first on each route
    const parts = config.flatMap((route, r) =>
      route.flatMap((id, s) => (id !== null && material(id).r === Infinity ? [`${slotLabel(level, { route: r, slot: s, material: id })} (${material(id).name.toLowerCase()})`] : [])),
    );
    return `Every route is cut: ${parts.join('; ')}. An insulator has no free charges to carry current, so the worker stays charged and sparks at the nozzle.`;
  }
  if (Number.isFinite(ev.resistance)) {
    return `The path conducts, but its total resistance is ${fmtR(ev.resistance)}, above the limit of ${level.rMax}. The charge drains too slowly, so some of it is still on the worker at the nozzle.`;
  }
  return 'The path is cut, so the worker stays charged and sparks at the nozzle.';
}

export const fmtR = (r: number) => (r === Infinity ? '∞' : String(Number(r.toFixed(2))));

/** After a win: what made the path work, and why that was the fewest swaps. */
export function explainSuccess(level: Level, config: Config): string[] {
  const ev = evaluate(level, config);
  if (level.mode === 'tradeoff') {
    const rs = config.flat().map((id) => material(id!).r);
    const cost = costOf(config);
    return [
      `Resistances in series add: ${rs.join(' + ')} = ${fmtR(ev.resistance)}, within the limit of ${level.rMax}.`,
      `The three parts cost ${config.flat().map((id) => material(id!).cost).join(' + ')} = ${cost}, within the cap of ${level.costCap}.`,
      `${countSolutions(level)} combination${countSolutions(level) === 1 ? '' : 's'} meet both limits.`,
    ];
  }
  const made = changesMade(level, config);
  const need = minChanges(level);
  const lines = [`The charge drains through a route where every part conducts (total resistance ${fmtR(ev.resistance)}).`];
  if (level.mode === 'replace') lines.push('In parts connected one after another the charge must pass through every part, so a single insulator stops the whole path. That is why only that part needed swapping.');
  if (level.mode === 'parallel') lines.push(`Charge only needs one complete route. Route by route, the fewest swaps needed were ${level.routes.map((r) => r.slots.filter((s) => s.material === null || material(s.material).r === Infinity).length).join(' and ')}, so with one swap only the cheaper route could be repaired.`);
  if (level.mode !== 'single') lines.push(made === need ? `You used ${made} swap${made === 1 ? '' : 's'}, the fewest possible.` : `You used ${made} swaps; the fewest possible is ${need}.`);
  return lines;
}

// ---- level 4: every combination -----------------------------------------------------------

export function* combinations(level: Level): Generator<string[]> {
  const slots = level.routes[0].slots;
  const walk = function* (i: number, acc: string[]): Generator<string[]> {
    if (i === slots.length) return yield acc;
    for (const o of slots[i].options ?? []) yield* walk(i + 1, [...acc, o]);
  };
  yield* walk(0, []);
}

export function solutions(level: Level): string[][] {
  return [...combinations(level)].filter((c) => {
    const config = [c];
    return circuitResistance(config) <= level.rMax && costOf(config) <= (level.costCap ?? Infinity);
  });
}
export const countSolutions = (level: Level) => solutions(level).length;

export function starsFor(sparks: number): 1 | 2 | 3 {
  return Math.max(1, 3 - sparks) as 1 | 2 | 3;
}

// ---- levels --------------------------------------------------------------------------------

const WALK = 3;
const BASE = { toolbox: [] as string[], maxChanges: null as number | null, rMax: 50, costCap: null as number | null, walk: WALK };

function toolbox(random: () => number): string[] {
  return shuffle([...shuffle(METALS, random).slice(0, 3), ...shuffle(INSULATORS, random).slice(0, 3)], random);
}

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    return {
      ...BASE,
      mode: 'single',
      toolbox: toolbox(random),
      routes: [{ name: 'Earth lead', slots: [{ name: 'Earth lead', material: null }] }],
      story: 'A worker has walked across a dry forecourt and picked up a static charge. If they touch the fuel nozzle still charged, the discharge can ignite petrol vapour. Fit the lead that connects them to the Earth rod, then run the test.',
    };
  }
  if (level === 2) {
    const breakAt = Math.floor(random() * 4);
    const metals = shuffle(METALS, random);
    const names = ['Wrist strap', 'Cable', 'Clip', 'Earth plate'];
    return {
      ...BASE,
      mode: 'replace',
      toolbox: toolbox(random),
      maxChanges: 1,
      routes: [{ name: 'Earthing path', slots: names.map((name, i) => ({ name, material: i === breakAt ? pick(INSULATORS, random) : metals[i] })) }],
      story: 'The earthing path from the worker’s wrist to the Earth plate is made of four parts, one after another, and the test keeps failing. One part is not doing its job. You have time to swap exactly one part. Find the faulty one.',
    };
  }
  if (level === 3) {
    const metals = shuffle(METALS, random);
    const cheap = Math.floor(random() * 2); // which route has just one insulator
    const oneBad = Math.floor(random() * 2);
    const route = (name: string, names: [string, string], bad: number[], m: string[]): Route => ({
      name,
      slots: names.map((n, i) => ({ name: n, material: bad.includes(i) ? pick(INSULATORS, random) : m[i] })),
    });
    const a = route('Route A', ['Wrist strap', 'Floor lead'], cheap === 0 ? [oneBad] : [0, 1], metals.slice(0, 2));
    const b = route('Route B', ['Belt clip', 'Pump bond'], cheap === 1 ? [oneBad] : [0, 1], metals.slice(2, 4));
    return {
      ...BASE,
      mode: 'parallel',
      toolbox: toolbox(random),
      maxChanges: 1,
      routes: [a, b],
      story: 'There are two ways for the charge to reach the Earth, but both routes have faulty parts. Charge needs only one complete route. You can swap just one part before the worker walks up. Choose wisely.',
    };
  }
  // Level 4: three parts, three options each, a resistance limit and a cost cap.
  const names = ['Wrist strap', 'Floor mat', 'Earth lead'];
  for (let attempt = 0; attempt < 2000; attempt++) {
    const options = names.map(() => shuffle(MATERIALS, random).slice(0, 3).map((m) => m.id));
    const chosen = options.map((o) => pick(o, random));
    const finite = chosen.every((id) => Number.isFinite(material(id).r));
    if (!finite) continue;
    const config = [chosen];
    const lvl: Level = {
      ...BASE,
      mode: 'tradeoff',
      routes: [{ name: 'Earthing path', slots: names.map((name, i) => ({ name, material: null, options: options[i] })) }],
      rMax: circuitResistance(config) + int(random, 0, 2),
      costCap: costOf(config) + int(random, 0, 1),
      story: 'A static charge only drains safely if it leaks away before the worker reaches the nozzle, and a high-resistance path drains too slowly. Pick one part for each of the three positions from the datasheet. Keep the total resistance under the limit and the total cost under the cap.',
    };
    const n = countSolutions(lvl);
    if (n >= 1 && n <= 3) return lvl;
  }
  throw new Error('could not build level 4');
}
