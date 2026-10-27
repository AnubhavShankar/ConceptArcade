// Pure rules of the Conductor Lab: no DOM, no canvas. Charges in nC, lengths in cm, fields in N/C, potentials in volts.
import { pick, shuffle } from '@core/quiz';

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
export function fmt(x: number): string {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e4 || a < 1e-2)) {
    const [m, e] = x.toExponential(2).split('e');
    return `${Number(m)} × 10${[...String(Number(e))].map((c) => SUP['0123456789-'.indexOf(c)]).join('')}`;
  }
  return String(Number(x.toPrecision(3)));
}
const within = (value: number, answer: number, tol: number) => (answer === 0 ? Math.abs(value) <= 1e-6 : Math.abs(value - answer) / Math.abs(answer) <= tol);

/** Field of a charged conducting sphere (q nC, radius R cm) at r cm from the centre: zero inside, kq/r² outside. */
export const sphereField = (q: number, R: number, r: number) => (r < R ? 0 : (9e9 * q * 1e-9) / (r / 100) ** 2);
/** Its potential: kq/R everywhere inside (constant), kq/r outside. */
export const spherePotential = (q: number, R: number, r: number) => (900 * q) / Math.max(r, R);

// ---- level 1: the charged conducting sphere --------------------------------------------------------------------------

export type Inside = 'zero' | 'not-zero';
export interface LevelSphere {
  kind: 'sphere';
  story: string;
  q: number;
  R: number;
  r: number;
  surface: number;
  atR: number;
  freeTests: number;
}
export function judgeSphere(lvl: LevelSphere, surface: number, atR: number, inside: Inside): { ok: boolean; surfaceOk: boolean; atOk: boolean; insideOk: boolean } {
  const surfaceOk = within(surface, lvl.surface, 0.03);
  const atOk = within(atR, lvl.atR, 0.03);
  const insideOk = inside === 'zero';
  return { ok: surfaceOk && atOk && insideOk, surfaceOk, atOk, insideOk };
}

// ---- level 2: shielding -------------------------------------------------------------------------------------------------

export interface Tile {
  id: string;
  /** Where the charge is and where the probe is. */
  charge: 'outside' | 'cavity';
  probe: 'outside' | 'cavity';
  /** Is there an electric field at the probe? */
  field: boolean;
  caption: string;
  /** Layout for drawing: angles in degrees. */
  chargeAngle: number;
  probeAngle: number;
}
export interface LevelShield {
  kind: 'shield';
  story: string;
  tiles: Tile[];
  freeTests: number;
}
const CASES: Omit<Tile, 'id' | 'chargeAngle' | 'probeAngle'>[] = [
  { charge: 'outside', probe: 'cavity', field: false, caption: 'A charge outside the shell; the probe is in the empty cavity' },
  { charge: 'cavity', probe: 'outside', field: true, caption: 'A charge inside the cavity; the probe is outside the shell' },
  { charge: 'cavity', probe: 'cavity', field: true, caption: 'A charge inside the cavity; the probe is in the cavity too' },
  { charge: 'outside', probe: 'outside', field: true, caption: 'A charge outside the shell; the probe is outside too' },
];
export function judgeShield(lvl: LevelShield, answers: (boolean | null)[]): { ok: boolean; wrong: number } {
  const wrong = lvl.tiles.filter((t, i) => answers[i] !== t.field).length;
  return { ok: wrong === 0, wrong };
}

// ---- level 3: dielectrics -------------------------------------------------------------------------------------------------

export interface Molecule {
  name: string;
  polar: boolean;
}
const MOLECULES: Molecule[] = [
  { name: 'H₂O (water)', polar: true },
  { name: 'HCl', polar: true },
  { name: 'NH₃ (ammonia)', polar: true },
  { name: 'CO₂', polar: false },
  { name: 'O₂', polar: false },
  { name: 'CH₄ (methane)', polar: false },
  { name: 'N₂', polar: false },
];
export interface LevelDielectric {
  kind: 'dielectric';
  story: string;
  e0: number;
  k: number;
  answer: number;
  molecules: Molecule[];
  freeTests: number;
}
export function judgeDielectric(lvl: LevelDielectric, e: number, polarNames: string[]): { ok: boolean; eOk: boolean; setOk: boolean } {
  const eOk = within(e, lvl.answer, 0.03);
  const want = lvl.molecules.filter((m) => m.polar).map((m) => m.name).sort().join('|');
  const setOk = [...polarNames].sort().join('|') === want;
  return { ok: eOk && setOk, eOk, setOk };
}

export type Level = LevelSphere | LevelShield | LevelDielectric;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const q = pick([40, 80, 160, 200], random);
    const R = pick([8, 10, 12, 15], random);
    const r = Math.round(R * pick([1.5, 2, 2.5], random));
    return {
      kind: 'sphere',
      story: 'A metal sphere carries a charge spread evenly over its surface. Move the probe from the centre outwards and watch the two meters: one for the field, one for the potential. Then find the field just outside the surface and at the marked distance, and decide what it is inside.',
      q,
      R,
      r,
      surface: sphereField(q, R, R),
      atR: sphereField(q, R, r),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const tiles = shuffle(CASES, random).map((c, i) => ({ ...c, id: `t${i}`, chargeAngle: 20 + random() * 320, probeAngle: 20 + random() * 320 }));
    return {
      kind: 'shield',
      story: 'A conductor with a hollow cavity shields what is inside from charges outside, but not the other way round. For each of the four set-ups, decide whether the probe feels any electric field.',
      tiles,
      freeTests: 1,
    };
  }
  const e0 = pick([1200, 3000, 6000, 9000], random);
  const k = pick([2, 3, 4, 5, 6], random);
  const polar = shuffle(MOLECULES.filter((m) => m.polar), random).slice(0, 2);
  const non = shuffle(MOLECULES.filter((m) => !m.polar), random).slice(0, 3);
  return {
    kind: 'dielectric',
    story: 'A slab of dielectric is placed in an electric field. Its molecules become polarised, and the surface charges this produces make a field of their own that opposes the applied field. Find the field inside the slab, and tick the molecules that are polar.',
    e0,
    k,
    answer: e0 / k,
    molecules: shuffle([...polar, ...non], random),
    freeTests: 1,
  };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

// ---- what is shown after a win ------------------------------------------------------------------------------------------------

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'sphere') {
    return [
      'Inside a conductor in electrostatic equilibrium the field is zero, and all the charge sits on the surface. A Gaussian sphere inside the conductor encloses no charge.',
      `Just outside the surface E = kq/R² = 9 × 10⁹ × ${lvl.q} × 10⁻⁹ / (${lvl.R / 100})² = ${fmt(lvl.surface)} N/C, perpendicular to the surface (σ/ε₀).`,
      `At ${lvl.r} cm from the centre E = kq/r² = ${fmt(lvl.atR)} N/C. The field jumps from 0 to ${fmt(lvl.surface)} N/C across the surface, but the potential kq/R does not jump: it is the same all through the conductor.`,
    ];
  }
  if (lvl.kind === 'shield') {
    return [
      'Charges outside a conductor induce charges on its surface in just the way that cancels their field inside the conductor and in an empty cavity: the cavity is shielded.',
      'Shielding does not work the other way. A charge inside the cavity induces charge on the cavity wall and the outer surface, so there is a field outside the shell too.',
      'The probe feels a field in every set-up except the one with an empty cavity and the charge outside.',
    ];
  }
  return [
    `In the dielectric the polarised molecules produce an opposing field, so the net field is reduced by the dielectric constant K: E = E₀ / K = ${fmt(lvl.e0)} / ${lvl.k} = ${fmt(lvl.answer)} N/C.`,
    `Polar molecules have a permanent dipole moment (${lvl.molecules.filter((m) => m.polar).map((m) => m.name).join(', ')}); non-polar ones (${lvl.molecules.filter((m) => !m.polar).map((m) => m.name).join(', ')}) get an induced dipole moment only when a field is applied.`,
    'Either way the molecules line up with the field, which puts negative charge on the face towards the positive plate and positive charge on the other.',
  ];
}
