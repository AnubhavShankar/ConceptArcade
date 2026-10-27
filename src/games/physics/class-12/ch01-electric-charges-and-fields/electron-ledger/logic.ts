// Pure rules of the static-charge workshop: no DOM. Charges are kept as whole electron counts, so the arithmetic is exact.
import { pick, shuffle } from '@core/quiz';

/** Magnitude of the electron charge, as used in NCERT (C). */
export const E = 1.6e-19;

export type Sign = 1 | -1;

/** Real materials, listed from the one that gives up electrons most easily to the one that grabs them most. */
export const SERIES = ['fur', 'glass rod', 'wool', 'silk', 'plastic rod', 'ebonite rod'] as const;

export interface Material {
  name: string;
  /** Lower rank gives up electrons to higher rank when the two are rubbed together. */
  rank: number;
}

/** Electrons gained by each of two fresh, neutral bodies after rubbing `strokes` times. Positive means gained. */
export function rub(a: Material, b: Material, strokes: number, perStroke: number): { gainA: number; gainB: number } {
  const moved = strokes * perStroke;
  return a.rank < b.rank ? { gainA: -moved, gainB: moved } : { gainA: moved, gainB: -moved };
}

/** Net charge of a body that has gained `gained` electrons (negative if it lost some), in coulombs. */
export const chargeOf = (gained: number) => -gained * E;
export const signOf = (gained: number): 0 | Sign => (gained === 0 ? 0 : gained < 0 ? 1 : -1);
export const nanoCoulombs = (gained: number) => Number((Math.abs(gained) * E * 1e9).toPrecision(6));

export function sup(n: number): string {
  return String(n)
    .split('')
    .map((c) => '⁰¹²³⁴⁵⁶⁷⁸⁹⁻'['0123456789-'.indexOf(c)] ?? c)
    .join('');
}
/** 6.25e10 becomes "6.25 × 10¹⁰". */
export function sci(x: number): string {
  if (x === 0) return '0';
  const [m, e] = x.toExponential(2).split('e');
  return `${Number(m)} × 10${sup(Number(e))}`;
}

/** Level 1: an effect to produce on another body, so the student must work out the sign first. */
export interface Scenario {
  /** How the other body is described: only what happened to its electrons. */
  desc: string;
  /** The other body's true sign. */
  sign: Sign;
  relation: 'attract' | 'repel';
}
export const SCENARIOS: { desc: string; sign: Sign }[] = [
  { desc: 'a rod that has gained electrons', sign: -1 },
  { desc: 'a rod that has lost electrons', sign: 1 },
  { desc: 'a cloth that has lost electrons', sign: 1 },
  { desc: 'a comb that has gained electrons', sign: -1 },
];
/** The sphere that produces the wanted effect: like charges repel, unlike attract. */
export const signNeeded = (other: Sign, relation: Scenario['relation']): Sign => (relation === 'repel' ? other : ((-other) as Sign));
/** What two bodies with these signs do to each other. */
export const relationOf = (a: Sign, b: Sign): Scenario['relation'] => (a === b ? 'repel' : 'attract');

export type Kind = 'pump' | 'sign' | 'count' | 'rank';

export interface Level {
  kind: Kind;
  story: string;
  /** Electrons moved by one pump pulse or one rubbing stroke. */
  perStroke: number;
  /** The bench: one body for the pump, otherwise the materials to rub. */
  bench: Material[];
  /** The sign the customer wants (pump and sign levels). */
  wantSign: Sign;
  /** Level 1: the effect the customer wants. */
  scenario?: Scenario;
  /** Level 3: the body to ship, the partner it is rubbed with, and the charge ordered (whole strokes, in electrons). */
  ship?: Material;
  partner?: Material;
  targetElectrons?: number;
  /** Level 4: the true order, most generous first. Names are fictional pads so it cannot be looked up. */
  truth?: string[];
  /** Rubs that cost nothing (level 4). */
  freeRubs: number;
  /** Pulses needed so the detector is clearly deflected (level 1). */
  minPulses: number;
}

export const PAD_NAMES = ['Amber pad', 'Teal pad', 'Cedar pad', 'Onyx pad', 'Coral pad', 'Slate pad', 'Ivory pad'];

export function buildLevel(level: number, random: () => number): Level {
  const sign = (): Sign => (random() < 0.5 ? -1 : 1);
  const mat = (i: number): Material => ({ name: SERIES[i], rank: i });
  const base = { freeRubs: 0, minPulses: 3, perStroke: 2e9, wantSign: sign() };
  if (level === 1) {
    const body = pick(['metal sphere', 'foil ball', 'pith ball'], random);
    const other = pick(SCENARIOS, random);
    const relation = random() < 0.5 ? 'attract' : 'repel';
    return {
      ...base,
      kind: 'pump',
      wantSign: signNeeded(other.sign, relation),
      scenario: { ...other, relation },
      bench: [{ name: body, rank: 0 }],
      story: `The customer does not say which charge they want. They tell you what the ${body} must DO. Work out the charge it needs, then use the electron pump to give it that charge. Only electrons can be moved: protons are stuck in the nuclei.`,
    };
  }
  if (level === 2) {
    const picks = shuffle([0, 1, 2, 3, 4, 5], random).slice(0, 3).map(mat);
    return {
      ...base,
      kind: 'sign',
      perStroke: 5e9,
      bench: picks,
      story: 'The customer wants a body with a particular charge. Pick any two materials from the bench and rub them together. The detector shows what each one became. You decide which body to ship, so learn which materials give electrons away.',
    };
  }
  if (level === 3) {
    const [a, b] = shuffle([0, 1, 2, 3, 4, 5], random).slice(0, 2).sort((x, y) => x - y);
    const perStroke = pick([2.5e9, 5e9, 1e10], random);
    const strokes = 3 + Math.floor(random() * 10);
    const shipPositive = random() < 0.5;
    return {
      ...base,
      kind: 'count',
      perStroke,
      wantSign: shipPositive ? 1 : -1,
      bench: [mat(a), mat(b)],
      ship: mat(shipPositive ? a : b),
      partner: mat(shipPositive ? b : a),
      targetElectrons: strokes * perStroke,
      story: 'The customer orders an exact amount of charge. The gauge counts the electrons you move, but the order is written in nanocoulombs. Convert, rub the right number of strokes, then ship. There is no undo, only a full discharge.',
    };
  }
  const names = shuffle(PAD_NAMES, random).slice(0, 4);
  return {
    ...base,
    kind: 'rank',
    perStroke: 5e9,
    freeRubs: 5,
    bench: names.map((name, rank) => ({ name, rank })),
    truth: names,
    story: 'Four unknown pads sit on the bench. Rub any two together to see which gave electrons to the other, then put all four in order, from the pad that gives up electrons most easily to the one that grabs them most. You get five test rubs for free, so reason from what you have already seen.',
  };
}

// ---- rules for judging a delivery --------------------------------------------------------------

export type Delivery = 'ok' | 'neutral' | 'wrong-sign' | 'too-little' | 'too-much';

/** Level 1 and 2: is the shipped body the right sign (and, with the pump, clearly charged)? */
export function judgeSign(gained: number, want: Sign, minElectrons = 0): Delivery {
  const s = signOf(gained);
  if (s === 0) return 'neutral';
  if (s !== want) return 'wrong-sign';
  return Math.abs(gained) >= minElectrons ? 'ok' : 'too-little';
}

/** Level 3: exact charge. Shipping the wrong partner's sign is caught first. */
export function judgeCount(gained: number, want: Sign, target: number): Delivery {
  const s = signOf(gained);
  if (s === 0) return 'neutral';
  if (s !== want) return 'wrong-sign';
  const n = Math.abs(gained);
  return n === target ? 'ok' : n < target ? 'too-little' : 'too-much';
}

/** Level 4: exact order. */
export const rankCorrect = (guess: string[], truth: string[]) => guess.length === truth.length && guess.every((n, i) => n === truth[i]);

/** Strokes needed for an order: q / (e × electrons per stroke). */
export const strokesFor = (targetElectrons: number, perStroke: number) => targetElectrons / perStroke;

/** How many rubs would the best player need to rank n items? Adaptive insertion needs at most this many. */
export const parRubs = (n: number) => (n <= 1 ? 0 : n === 4 ? 5 : (n * (n - 1)) / 2);

export function starsFor(misses: number, extraRubs = 0): 1 | 2 | 3 {
  return Math.max(1, 3 - misses - Math.floor(extraRubs / 2)) as 1 | 2 | 3;
}

/** A pair-by-pair record of what rubbing showed, for the findings log. */
export interface Finding {
  loser: string;
  gainer: string;
}

/** Which fresh test rubs would still teach something, given the findings so far? Used to say a rub was redundant. */
export function impliedBy(findings: Finding[], a: string, b: string): Finding | null {
  const beats = new Map<string, Set<string>>();
  for (const f of findings) (beats.get(f.loser) ?? beats.set(f.loser, new Set()).get(f.loser)!).add(f.gainer);
  const reach = (from: string, to: string, seen = new Set<string>()): boolean => {
    if (from === to) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    return [...(beats.get(from) ?? [])].some((n) => reach(n, to, seen));
  };
  if (reach(a, b)) return { loser: a, gainer: b };
  if (reach(b, a)) return { loser: b, gainer: a };
  return null;
}

// ---- the explanation shown after a win -----------------------------------------------------------

export function explainSolution(level: Level): string[] {
  const sgn = level.wantSign > 0 ? 'positive' : 'negative';
  if (level.kind === 'pump' && level.scenario) {
    const sc = level.scenario;
    const otherWord = sc.sign > 0 ? 'positive' : 'negative';
    return [
      `${sc.desc[0].toUpperCase()}${sc.desc.slice(1)} is ${otherWord}: gaining electrons makes a body negative, losing them makes it positive.`,
      `Like charges repel and unlike charges attract. To ${sc.relation} a ${otherWord} body, the sphere must be ${sgn}.`,
      level.wantSign > 0 ? 'So electrons must be REMOVED from the sphere: it ends with more protons than electrons.' : 'So electrons must be ADDED to the sphere: it ends with more electrons than protons.',
    ];
  }
  if (level.kind === 'pump') {
    return [
      level.wantSign > 0 ? 'A body becomes positive by LOSING electrons: it then has more protons than electrons.' : 'A body becomes negative by GAINING electrons: it then has more electrons than protons.',
      'Only electrons move in a solid. The protons stay put inside the nuclei.',
    ];
  }
  if (level.kind === 'sign') {
    return [
      `When two materials are rubbed, electrons leave the one that holds them loosely and arrive on the other. The ${sgn} order was met by shipping the body that ${level.wantSign > 0 ? 'lost' : 'gained'} electrons.`,
      'Both bodies are charged, with opposite signs and equal size: the electrons were moved, not made.',
    ];
  }
  if (level.kind === 'count' && level.targetElectrons !== undefined && level.ship && level.partner) {
    const n = level.targetElectrons;
    const q = nanoCoulombs(n);
    const strokes = strokesFor(n, level.perStroke);
    return [
      `The ${level.ship.name} must become ${sgn}, so it ${level.wantSign > 0 ? 'loses' : 'gains'} electrons while the ${level.partner.name} does the opposite.`,
      `Electrons needed: N = q / e = ${q} × 10⁻⁹ C / (1.6 × 10⁻¹⁹ C) = ${sci(n)}.`,
      `One stroke moves ${sci(level.perStroke)} electrons, so strokes = ${sci(n)} / ${sci(level.perStroke)} = ${strokes}.`,
      `The ${level.partner.name} ends with exactly the same charge, ${level.wantSign > 0 ? '−' : '+'}${q} nC.`,
    ];
  }
  const order = (level.truth ?? []).join(' → ');
  return [
    `Order: ${order}.`,
    'Each pad gives electrons to every pad after it in this list. That is why you can skip a rub when two earlier results already settle it: if A gives to B and B gives to C, then A gives to C.',
  ];
}
