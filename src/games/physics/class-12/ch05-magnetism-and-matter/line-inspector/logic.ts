// Pure rules of the Field-Line Inspector: no DOM, no canvas.
// Fluxes in µWb, outward positive.
import { pick, shuffle } from '@core/quiz';

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
export function fmt(x: number): string {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e5 || a < 1e-2)) {
    const [m, e] = x.toExponential(2).split('e');
    return `${Number(m)} × 10${[...String(Number(e))].map((c) => SUP['0123456789-'.indexOf(c)]).join('')}`;
  }
  return String(Number(x.toPrecision(3)));
}
const within = (value: number, answer: number, tol: number) => (answer === 0 ? Math.abs(value) < 1e-9 : Math.abs(value - answer) / Math.abs(answer) <= tol);

export type Verdict = 'magnetic' | 'electrostatic' | 'neither';
export type DiagramKind = 'm-dipole' | 'm-solenoid' | 'e-dipole' | 'e-radial' | 'n-cross' | 'n-open';
export const VERDICT: Record<DiagramKind, Verdict> = {
  'm-dipole': 'magnetic',
  'm-solenoid': 'magnetic',
  'e-dipole': 'electrostatic',
  'e-radial': 'electrostatic',
  'n-cross': 'neither',
  'n-open': 'neither',
};
export const REASON: Record<DiagramKind, string> = {
  'm-dipole': 'closed loops that continue through the magnet from south to north',
  'm-solenoid': 'closed loops, running along the inside of the solenoid and round the outside',
  'e-dipole': 'lines that start on the positive charge and end on the negative one: possible for an electric field only',
  'e-radial': 'lines spreading from a single point: an isolated charge, so an electric field only (no magnetic monopoles)',
  'n-cross': 'lines that cross, which no field can have, as the field would have two directions at the crossing point',
  'n-open': 'lines that stop in empty space, which neither field can have',
};

export interface Card {
  letter: string;
  kind: DiagramKind;
}
export interface LevelSpot {
  kind: 'spot';
  story: string;
  cards: Card[];
  freeTests: number;
}
export interface LevelFaces {
  kind: 'faces';
  story: string;
  known: number[];
  missing: number;
  freeTests: number;
}
export interface LevelHalf {
  kind: 'half';
  story: string;
  pole: 'north' | 'south';
  outer: number;
  cut: number;
  freeTests: number;
}
export type Level = LevelSpot | LevelFaces | LevelHalf;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const kinds = shuffle(['m-dipole', 'm-solenoid', 'e-dipole', 'e-radial', 'n-cross', 'n-open'] as DiagramKind[], random);
    return {
      kind: 'spot',
      story: 'Six diagrams show field lines. Magnetic field lines are continuous closed loops with no beginning and no end. Electric field lines may begin and end on charges. Decide for each diagram whether it could show a magnetic field, an electrostatic field only, or neither.',
      cards: kinds.map((kind, i) => ({ letter: 'ABCDEF'[i], kind })),
      freeTests: 1,
    };
  }
  if (level === 2) {
    for (;;) {
      const known = Array.from({ length: 4 }, () => pick([-6, -4, -3, -2, 2, 3, 5, 7, 8], random));
      const missing = -known.reduce((a, b) => a + b, 0);
      if (missing === 0) continue;
      return {
        kind: 'faces',
        story: 'A closed surface made of five faces is placed in a magnetic field. The magnetic flux through four of the faces is known, in µWb, counted positive when the lines leave the surface. Find the flux through the fifth face, with its sign.',
        known,
        missing,
        freeTests: 1,
      };
    }
  }
  const pole = random() < 0.5 ? 'north' : 'south';
  const outer = pick([6, 8, 12, 15], random);
  return {
    kind: 'half',
    story: `A closed surface is drawn round the ${pole} end of a bar magnet, so that it cuts through the middle of the magnet. Outside the magnet the lines ${pole === 'north' ? 'leave' : 'enter'} the surface, carrying a flux of ${outer} µWb ${pole === 'north' ? 'outward' : 'inward'}. Magnetic lines are continuous, and they run on inside the magnet. Find the flux through the part of the surface that cuts across the magnet, counted outward.`,
    pole,
    outer: pole === 'north' ? outer : -outer,
    cut: pole === 'north' ? -outer : outer,
    freeTests: 1,
  };
}

export function judgeSpot(lvl: LevelSpot, labels: (Verdict | null)[]): { ok: boolean; unset: boolean; wrong: string[] } {
  const unset = labels.some((l) => l === null);
  const wrong = lvl.cards.filter((c, i) => labels[i] !== VERDICT[c.kind]).map((c) => c.letter);
  return { ok: !unset && wrong.length === 0, unset, wrong };
}
export function judgeFaces(lvl: LevelFaces, v: number): { ok: boolean } {
  return { ok: within(v, lvl.missing, 0.03) };
}
export function judgeHalf(lvl: LevelHalf, v: number): { ok: boolean; signOk: boolean } {
  return { ok: within(v, lvl.cut, 0.03), signOk: Math.sign(v) === Math.sign(lvl.cut) };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'spot') {
    return lvl.cards.map((c) => `${c.letter}: ${VERDICT[c.kind]}. It shows ${REASON[c.kind]}.`);
  }
  if (lvl.kind === 'faces') {
    return [
      `Gauss's law for magnetism: the flux through any closed surface is zero, Φ = ΣB·ΔS = 0, because there are no magnetic monopoles.`,
      `So the fifth face carries −(${lvl.known.join(' + ')}) = ${lvl.missing} µWb.`,
    ];
  }
  return [
    'The net flux through any closed surface is zero, since magnetic field lines have no ends: every line that goes out comes back in.',
    `The outside part has ${lvl.outer} µWb, so the cut across the magnet has ${lvl.cut} µWb: the lines carry on inside the magnet from south to north.`,
  ];
}
