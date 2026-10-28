// Pure rules of Forces of Nature: no DOM, no canvas. SI constants as used in NCERT.
import { pick, shuffle } from '@core/quiz';

export const K = 9e9;
export const E_CHARGE = 1.6e-19;
export const G = 6.67e-11;
export const M_PROTON = 1.67e-27;
export const M_ELECTRON = 9.11e-31;
const YEAR = 365 * 24 * 3600;

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
export function fmt(x: number): string {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e4 || a < 1e-2)) {
    const [m, e] = x.toExponential(2).split('e');
    return `${Number(m)} × 10${[...String(Number(e))].map((c) => SUP['0123456789-'.indexOf(c)]).join('')}`;
  }
  return String(Number(x.toPrecision(3)));
}
const within = (value: number, answer: number, tol: number) => Math.abs(value - answer) / Math.abs(answer) <= tol;
/** Close in orders of magnitude: the huge numbers here depend on which constants are used. */
const withinLog = (value: number, answer: number, dec = 0.15) => value > 0 && Math.abs(Math.log10(value) - Math.log10(answer)) <= dec;

/** Coulomb force (N) from charges in µC at a distance in cm: F = k q1 q2 / r² = 90 q1 q2 / r². */
export const forceN = (q1: number, q2: number, rCm: number) => (90 * Math.abs(q1 * q2)) / (rCm * rCm);
/** The distance (cm) that gives force F between charges q1 and q2 (µC). */
export const distanceFor = (q1: number, q2: number, f: number) => Math.sqrt((90 * Math.abs(q1 * q2)) / f);

// ---- level 1: force and distance --------------------------------------------------------------------------------------

export type Third = 'equal-opposite' | 'bigger-on-small' | 'zero';
export interface LevelBasic {
  kind: 'basic';
  story: string;
  mode: 'force' | 'distance';
  q1: number;
  q2: number;
  r: number;
  f: number;
  freeTests: number;
}
export function judgeBasic(lvl: LevelBasic, value: number, third: Third): { ok: boolean; valueOk: boolean; thirdOk: boolean } {
  const valueOk = within(value, lvl.mode === 'force' ? lvl.f : lvl.r, lvl.mode === 'force' ? 0.03 : 0.02);
  const thirdOk = third === 'equal-opposite';
  return { ok: valueOk && thirdOk, valueOk, thirdOk };
}

// ---- level 2: electric against gravity ---------------------------------------------------------------------------------

export type Why = 'cancel' | 'stronger' | 'uncharged';
export interface LevelGravity {
  kind: 'gravity';
  story: string;
  pair: 'pp' | 'ep' | 'ee';
  ratio: number;
  freeTests: number;
}
export const gravityRatio = (m1: number, m2: number) => (K * E_CHARGE * E_CHARGE) / (G * m1 * m2);
export function judgeGravity(lvl: LevelGravity, value: number, why: Why): { ok: boolean; valueOk: boolean; whyOk: boolean } {
  const valueOk = withinLog(value, lvl.ratio);
  const whyOk = why === 'cancel';
  return { ok: valueOk && whyOk, valueOk, whyOk };
}

// ---- level 3: the size of a coulomb ------------------------------------------------------------------------------------

export type Scale = 'tiny-steps' | 'not-quantised' | 'light';
export interface LevelCoulomb {
  kind: 'coulomb';
  story: string;
  micro: number;
  electrons: number;
  rate: number;
  years: number;
  freeTests: number;
}
export function judgeCoulomb(lvl: LevelCoulomb, n: number, years: number, scale: Scale): { ok: boolean; nOk: boolean; yearsOk: boolean; scaleOk: boolean } {
  const nOk = within(n, lvl.electrons, 0.03);
  const yearsOk = within(years, lvl.years, 0.03);
  const scaleOk = scale === 'tiny-steps';
  return { ok: nOk && yearsOk && scaleOk, nOk, yearsOk, scaleOk };
}

// ---- level 4: the mass of charging ---------------------------------------------------------------------------------------

export interface LevelMass {
  kind: 'mass';
  story: string;
  /** The body, its partner, whether it ended up negative, and the charge in µC. */
  body: string;
  partner: string;
  negative: boolean;
  micro: number;
  electrons: number;
  massKg: number;
  /** The id of the right "from … to …" answer. */
  from: 'partner' | 'body';
  freeTests: number;
}
export function judgeMass(lvl: LevelMass, n: number, mass: number, from: 'partner' | 'body'): { ok: boolean; nOk: boolean; massOk: boolean; fromOk: boolean } {
  const nOk = within(n, lvl.electrons, 0.03);
  const massOk = within(mass, lvl.massKg, 0.05);
  const fromOk = from === lvl.from;
  return { ok: nOk && massOk && fromOk, nOk, massOk, fromOk };
}

// ---- level 5: conservation of charge ---------------------------------------------------------------------------------------

export interface Reaction {
  id: string;
  text: string;
  /** Each particle with its charge in units of e. */
  inn: [string, number][];
  out: [string, number][];
}
export const totalIn = (r: Reaction) => r.inn.reduce((s, p) => s + p[1], 0);
export const totalOut = (r: Reaction) => r.out.reduce((s, p) => s + p[1], 0);
export const conserves = (r: Reaction) => totalIn(r) === totalOut(r);
const P = (name: string, q: number): [string, number] => [name, q];
export const REACTIONS: Reaction[] = [
  { id: 'beta-minus', text: 'neutron → proton + electron + antineutrino', inn: [P('n', 0)], out: [P('p', 1), P('e⁻', -1), P('ν̄', 0)] },
  { id: 'annihilate', text: 'electron + positron → photon + photon', inn: [P('e⁻', -1), P('e⁺', 1)], out: [P('γ', 0), P('γ', 0)] },
  { id: 'beta-plus', text: 'proton → neutron + positron + neutrino', inn: [P('p', 1)], out: [P('n', 0), P('e⁺', 1), P('ν', 0)] },
  { id: 'capture', text: 'proton + electron → neutron + neutrino', inn: [P('p', 1), P('e⁻', -1)], out: [P('n', 0), P('ν', 0)] },
  { id: 'pion', text: 'positive pion → positive muon + neutrino', inn: [P('π⁺', 1)], out: [P('μ⁺', 1), P('ν', 0)] },
  { id: 'pair', text: 'photon → electron + positron', inn: [P('γ', 0)], out: [P('e⁻', -1), P('e⁺', 1)] },
  { id: 'bad-electron', text: 'electron → neutrino + photon', inn: [P('e⁻', -1)], out: [P('ν', 0), P('γ', 0)] },
  { id: 'bad-pp', text: 'proton + proton → proton + proton + electron', inn: [P('p', 1), P('p', 1)], out: [P('p', 1), P('p', 1), P('e⁻', -1)] },
  { id: 'bad-photon', text: 'photon → electron + electron', inn: [P('γ', 0)], out: [P('e⁻', -1), P('e⁻', -1)] },
  { id: 'bad-neutron', text: 'neutron → proton + photon', inn: [P('n', 0)], out: [P('p', 1), P('γ', 0)] },
  { id: 'bad-positron', text: 'electron + positron → electron', inn: [P('e⁻', -1), P('e⁺', 1)], out: [P('e⁻', -1)] },
  { id: 'bad-pion', text: 'positive pion → negative muon + neutrino', inn: [P('π⁺', 1)], out: [P('μ⁻', -1), P('ν', 0)] },
];
export interface LevelConserve {
  kind: 'conserve';
  story: string;
  reactions: Reaction[];
  /** The ids that break conservation of charge. */
  bad: string[];
  freeTests: number;
}
export function judgeConserve(lvl: LevelConserve, flagged: string[]): { ok: boolean; missed: number; falseAlarms: number } {
  const set = new Set(flagged);
  const missed = lvl.bad.filter((b) => !set.has(b)).length;
  const falseAlarms = flagged.filter((f) => !lvl.bad.includes(f)).length;
  return { ok: missed === 0 && falseAlarms === 0, missed, falseAlarms };
}

export type Level = LevelBasic | LevelGravity | LevelCoulomb | LevelMass | LevelConserve;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const q1 = pick([0.2, 0.3, 0.4, 0.5, 0.8], random);
    const q2 = pick([0.2, 0.3, 0.4, 0.5, 0.8], random);
    const r = pick([10, 20, 25, 30, 40], random);
    const mode = random() < 0.5 ? 'force' : 'distance';
    return {
      kind: 'basic',
      story:
        mode === 'force'
          ? 'Two small charged spheres sit in air. Work out the force between them from Coulomb’s law. Then say what the force on the second sphere is, compared with the force on the first.'
          : 'The force between two small charged spheres in air has been measured. Work out how far apart they are. Then say what the force on the second sphere is, compared with the force on the first.',
      mode,
      q1,
      q2,
      r,
      f: forceN(q1, q2, r),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const pair = pick(['pp', 'ep', 'ee'] as const, random);
    const names = { pp: 'Two protons', ep: 'An electron and a proton', ee: 'Two electrons' };
    return {
      kind: 'gravity',
      story: `${names[pair]} sit next to each other. Both gravity and the electric force act between them. Find how many times the electric force is bigger than the gravitational force, then say why gravity still rules the motion of planets.`,
      pair,
      ratio: pair === 'pp' ? gravityRatio(M_PROTON, M_PROTON) : pair === 'ep' ? gravityRatio(M_ELECTRON, M_PROTON) : gravityRatio(M_ELECTRON, M_ELECTRON),
      freeTests: 1,
    };
  }
  if (level === 3) {
    const micro = pick([1, 2, 5, 10], random);
    const rate = pick([1e8, 1e9, 1e10], random);
    return {
      kind: 'coulomb',
      story: 'A coulomb is a huge amount of charge. Count the electrons in a small, everyday charge, and find how long it would take to gather a whole coulomb if electrons moved off a body at a steady rate. Then say why we can ignore quantisation for charges this size.',
      micro,
      electrons: (micro * 1e-6) / E_CHARGE,
      rate,
      years: 1 / (rate * E_CHARGE) / YEAR,
      freeTests: 1,
    };
  }
  if (level === 4) {
    const negative = random() < 0.5;
    const body = negative ? 'polythene' : 'glass rod';
    const partner = negative ? 'wool' : 'silk';
    const micro = pick([0.2, 0.3, 0.5, 1], random);
    const electrons = (micro * 1e-6) / E_CHARGE;
    return {
      kind: 'mass',
      story: `A piece of ${body} is rubbed with ${partner}, and ends up with a charge of ${negative ? '−' : '+'}${micro} µC. Find how many electrons were transferred and say which way they went. Then find the mass that was moved: is it enough to notice?`,
      body,
      partner,
      negative,
      micro,
      electrons,
      massKg: electrons * M_ELECTRON,
      from: negative ? 'partner' : 'body',
      freeTests: 1,
    };
  }
  const good = shuffle(REACTIONS.filter(conserves), random).slice(0, 3);
  const bad = shuffle(REACTIONS.filter((r) => !conserves(r)), random).slice(0, 3);
  const reactions = shuffle([...good, ...bad], random);
  return {
    kind: 'conserve',
    story: 'Six collisions are about to happen in the particle chamber. Charge can never be created or destroyed, so the total charge going in must equal the total charge coming out. Flag every collision that breaks the law, then run them all.',
    reactions,
    bad: bad.map((b) => b.id),
    freeTests: 1,
  };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

// ---- what is shown after a win -----------------------------------------------------------------------------------------------

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'basic') {
    return [
      lvl.mode === 'force'
        ? `F = k q₁ q₂ / r² = 9 × 10⁹ × ${lvl.q1} × 10⁻⁶ × ${lvl.q2} × 10⁻⁶ / (${lvl.r / 100})² = ${fmt(lvl.f)} N.`
        : `r = √(k q₁ q₂ / F) = √(9 × 10⁹ × ${lvl.q1} × 10⁻⁶ × ${lvl.q2} × 10⁻⁶ / ${fmt(lvl.f)}) = ${lvl.r / 100} m = ${lvl.r} cm.`,
      'The force on the second sphere has the same size as the force on the first and the opposite direction: Coulomb forces obey Newton’s third law, whatever the sizes of the charges.',
      'Like charges repel and unlike charges attract.',
    ];
  }
  if (lvl.kind === 'gravity') {
    return [
      lvl.pair === 'pp' ? 'F(electric) / F(gravity) = k e² / (G m_p²) = (9 × 10⁹ × (1.6 × 10⁻¹⁹)²) / (6.67 × 10⁻¹¹ × (1.67 × 10⁻²⁷)²).' : lvl.pair === 'ep' ? 'F(electric) / F(gravity) = k e² / (G m_e m_p) = (9 × 10⁹ × (1.6 × 10⁻¹⁹)²) / (6.67 × 10⁻¹¹ × 9.11 × 10⁻³¹ × 1.67 × 10⁻²⁷).' : 'F(electric) / F(gravity) = k e² / (G m_e²) = (9 × 10⁹ × (1.6 × 10⁻¹⁹)²) / (6.67 × 10⁻¹¹ × (9.11 × 10⁻³¹)²).',
      `That is about ${fmt(lvl.ratio)}: the electric force is enormously stronger.`,
      'Gravity wins at large scales because it is always attractive, while electric forces come in both signs and cancel. Big objects are almost exactly neutral.',
    ];
  }
  if (lvl.kind === 'coulomb') {
    return [
      `N = q / e = ${lvl.micro} × 10⁻⁶ C / (1.6 × 10⁻¹⁹ C) = ${fmt(lvl.electrons)} electrons.`,
      `At ${fmt(lvl.rate)} electrons a second, 1 C needs 1 / (${fmt(lvl.rate)} × 1.6 × 10⁻¹⁹) s = ${fmt(lvl.years)} years. A coulomb is a very large unit.`,
      'A change of one electron in about 10¹³ is far too small to notice, so charge looks continuous at this scale. Quantisation matters only when a few electrons can be counted.',
    ];
  }
  if (lvl.kind === 'mass') {
    return [
      `N = q / e = ${lvl.micro} × 10⁻⁶ / (1.6 × 10⁻¹⁹) = ${fmt(lvl.electrons)} electrons. Electrons moved from ${lvl.from === 'partner' ? lvl.partner : lvl.body} to ${lvl.from === 'partner' ? lvl.body : lvl.partner}.`,
      `Mass moved = N m_e = ${fmt(lvl.electrons)} × 9.11 × 10⁻³¹ kg = ${fmt(lvl.massKg)} kg: utterly negligible.`,
      'The body that gains electrons becomes negative and the one that loses them becomes positive, with equal and opposite charges: no charge was created.',
    ];
  }
  return [
    'In every allowed collision the total charge before equals the total charge after.',
    ...lvl.reactions.map((r) => `${r.text}: ${totalIn(r)} → ${totalOut(r)} (in units of e)${conserves(r) ? ', allowed' : ', not allowed'}.`),
  ];
}
