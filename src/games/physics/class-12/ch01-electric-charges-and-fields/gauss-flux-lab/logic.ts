// Pure rules of Gauss Lab I (charge and flux): no DOM, no canvas. SI units unless stated; charges are given in µC.
import { pick } from '@core/quiz';

export const EPS0 = 8.854e-12;
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
export function fmt(x: number): string {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e4 || a < 1e-2)) {
    const [m, e] = x.toExponential(2).split('e');
    return `${Number(m)} × 10${[...String(Number(e))].map((c) => SUP['0123456789-'.indexOf(c)]).join('')}`;
  }
  return String(Number(x.toPrecision(3)));
}
/** Gauss's law: net flux through a closed surface = enclosed charge / ε₀. Charge in µC, flux in N m²/C. */
export const fluxOf = (qMicro: number) => (qMicro * 1e-6) / EPS0;
/** The enclosed charge (µC) from a net flux: q = ε₀ Φ. */
export const chargeOf = (flux: number) => (flux * EPS0) / 1e-6;
const within = (value: number, answer: number, tol: number) => (answer === 0 ? Math.abs(value) <= 1e-6 : Math.abs(value - answer) / Math.abs(answer) <= tol);

// ---- level 1: charge from a density ------------------------------------------------------------------------------

export type Density = 'λ' | 'σ' | 'ρ';
export interface LevelDensity {
  kind: 'density';
  story: string;
  shape: 'line' | 'surface' | 'volume';
  /** Plain description for the order sheet. */
  what: string;
  symbol: Density;
  /** The density value and its unit text. */
  value: number;
  unit: string;
  /** Total charge in µC. */
  answer: number;
  /** How the answer is worked out, for the explanation. */
  working: string;
  freeTests: number;
}
export function buildDensity(random: () => number): LevelDensity {
  const shape = pick(['line', 'surface', 'volume'] as const, random);
  if (shape === 'line') {
    const L = pick([0.5, 1, 2, 4], random);
    const lam = pick([2, 5, 8, 10], random);
    return { kind: 'density', story: STORY1, shape, what: `a thin rod ${L} m long, charged evenly along its length`, symbol: 'λ', value: lam, unit: 'µC per metre', answer: lam * L, working: `Q = λ L = ${lam} µC/m × ${L} m = ${fmt(lam * L)} µC`, freeTests: 1 };
  }
  if (shape === 'surface') {
    const sphere = random() < 0.5;
    const sigma = pick([20, 50, 80], random);
    if (sphere) {
      const r = pick([0.5, 1, 1.2, 2], random);
      const area = 4 * Math.PI * r * r;
      return { kind: 'density', story: STORY1, shape, what: `a metal sphere of radius ${r} m, charged evenly over its surface`, symbol: 'σ', value: sigma, unit: 'µC per square metre', answer: sigma * area, working: `Q = σ × 4πr² = ${sigma} µC/m² × 4π × (${r} m)² = ${fmt(sigma * area)} µC`, freeTests: 1 };
    }
    const s = pick([0.5, 1, 2], random);
    return { kind: 'density', story: STORY1, shape, what: `a flat square plate ${s} m on each side, charged evenly over one face`, symbol: 'σ', value: sigma, unit: 'µC per square metre', answer: sigma * s * s, working: `Q = σ A = ${sigma} µC/m² × (${s} m)² = ${fmt(sigma * s * s)} µC`, freeTests: 1 };
  }
  const R = pick([0.1, 0.2, 0.3], random);
  const rho = pick([50, 100, 200], random);
  const vol = (4 / 3) * Math.PI * R ** 3;
  return { kind: 'density', story: STORY1, shape, what: `a solid ball of radius ${R} m, charged evenly throughout its volume`, symbol: 'ρ', value: rho, unit: 'µC per cubic metre', answer: rho * vol, working: `Q = ρ × (4/3)πR³ = ${rho} µC/m³ × (4/3)π × (${R} m)³ = ${fmt(rho * vol)} µC`, freeTests: 1 };
}
const STORY1 = 'A charged object arrives with a label giving how densely the charge is spread. Choose the right kind of density for its shape, then work out the total charge it carries.';
export function judgeDensity(lvl: LevelDensity, symbol: Density, q: number): { ok: boolean; symbolOk: boolean; qOk: boolean } {
  const symbolOk = symbol === lvl.symbol;
  const qOk = within(q, lvl.answer, 0.03);
  return { ok: symbolOk && qOk, symbolOk, qOk };
}

// ---- level 2: flux from the enclosed charge ---------------------------------------------------------------------

export interface FluxCharge {
  q: number; // µC, signed
  r: number; // distance from the centre, in surface-radius units where the surface has radius 1
  angle: number; // degrees, for drawing
}
export interface LevelFlux {
  kind: 'flux';
  story: string;
  charges: FluxCharge[];
  /** The surface changes by this factor in radius for the second question. */
  factor: number;
  first: number;
  second: number;
  changes: boolean;
  freeTests: number;
}
const enclosed = (charges: FluxCharge[], radius: number) => charges.filter((c) => c.r < radius).reduce((s, c) => s + c.q, 0);
export function buildFlux(random: () => number): LevelFlux {
  const factor = pick([2, 2, 0.5], random);
  const changes = random() < 0.5;
  const q = () => (random() < 0.3 ? -1 : 1) * pick([1, 2, 3, 4, 5], random);
  const charges: FluxCharge[] = [];
  const lo = Math.min(1, factor);
  const hi = Math.max(1, factor);
  // two charges clearly inside both surfaces, one clearly outside both, and (maybe) one in the band between them
  const inside = lo * 0.5;
  const outside = hi * 1.5;
  charges.push({ q: q(), r: inside * (0.3 + random() * 0.5), angle: random() * 360 }, { q: q(), r: inside * (0.2 + random() * 0.6), angle: random() * 360 }, { q: q(), r: outside * (1 + random() * 0.3), angle: random() * 360 });
  if (changes) charges.push({ q: q(), r: lo + (hi - lo) * (0.35 + random() * 0.3), angle: random() * 360 });
  const first = fluxOf(enclosed(charges, 1));
  const second = fluxOf(enclosed(charges, factor));
  return {
    kind: 'flux',
    story: 'Charges are scattered around a closed surface. Gauss’s law says the net flux depends only on the charge inside. Work out the net flux through the surface as drawn, then through the surface after its radius has been changed. The shape and size of the surface do not matter, only what it encloses.',
    charges,
    factor,
    first,
    second,
    changes,
    freeTests: 1,
  };
}
export function judgeFlux(lvl: LevelFlux, a: number, b: number): { ok: boolean; firstOk: boolean; secondOk: boolean } {
  const firstOk = within(a, lvl.first, 0.03);
  const secondOk = within(b, lvl.second, 0.03);
  return { ok: firstOk && secondOk, firstOk, secondOk };
}

// ---- level 3: the black box -----------------------------------------------------------------------------------------

export interface BoxContents {
  id: string;
  text: string;
  /** Net charge in units of q. */
  net: number;
}
export interface LevelBox {
  kind: 'box';
  story: string;
  /** The measured outward flux through the box, N m²/C, and the charge it means, µC. */
  measured: number;
  answer: number;
  contents: BoxContents[];
  /** The ids that would give zero net flux. */
  zero: string[];
  freeTests: number;
}
export function buildBox(random: () => number): LevelBox {
  const measured = pick([3000, 5000, 8000, 12000, 20000], random) * (random() < 0.3 ? -1 : 1);
  const contents: BoxContents[] = [
    { id: 'none', text: 'No charge at all', net: 0 },
    { id: 'pair', text: 'A +q charge and a −q charge', net: 0 },
    { id: 'one', text: 'A single +q charge', net: 1 },
    { id: 'big', text: 'A +3q and a −3q charge, side by side', net: 0 },
    { id: 'two', text: 'Two +q charges', net: 2 },
  ];
  return {
    kind: 'box',
    story: 'A sealed black box is measured from outside: the field at its surface gives a net outward flux. Work out the charge inside. Then think about the opposite case: suppose the net flux had been zero. Does that mean the box is empty? Tick every set of contents that would give zero net flux.',
    measured,
    answer: chargeOf(measured) * 1000, // in nC
    contents,
    zero: contents.filter((c) => c.net === 0).map((c) => c.id),
    freeTests: 1,
  };
}
export function judgeBox(lvl: LevelBox, qNano: number, ticked: string[]): { ok: boolean; qOk: boolean; setOk: boolean } {
  const qOk = within(qNano, lvl.answer, 0.03);
  const a = [...ticked].sort().join(',');
  const b = [...lvl.zero].sort().join(',');
  return { ok: qOk && a === b, qOk, setOk: a === b };
}

// ---- level 4: one face of a cube ------------------------------------------------------------------------------------

export interface LevelCubeFace {
  kind: 'cubeface';
  story: string;
  where: 'centre' | 'corner';
  q: number;
  /** Which face is asked about: for a corner charge, whether it touches the corner. */
  touchesCorner: boolean;
  faceName: string;
  answer: number;
  freeTests: number;
}
export function buildCubeFace(random: () => number): LevelCubeFace {
  const where = random() < 0.5 ? 'centre' : 'corner';
  const q = pick([2, 4, 6, 10], random);
  const touches = where === 'corner' && random() < 0.4;
  // the corner charge sits at the front, bottom, left corner: those three faces touch it, the other three do not
  const faceName = where === 'centre' ? pick(['top', 'bottom', 'front', 'back', 'left', 'right'], random) : touches ? pick(['front', 'bottom', 'left'], random) : pick(['back', 'top', 'right'], random);
  const answer = where === 'centre' ? fluxOf(q) / 6 : touches ? 0 : fluxOf(q) / 24;
  return {
    kind: 'cubeface',
    story:
      where === 'centre'
        ? 'A point charge sits at the exact centre of a cube. Find the flux through the highlighted face. The six faces are identical and the field is symmetric about the charge.'
        : 'A point charge sits at one corner of a cube. Eight such cubes would fit round the charge, and the field is symmetric. Find the flux through the highlighted face.',
    where,
    q,
    touchesCorner: touches,
    faceName,
    answer,
    freeTests: 1,
  };
}
export function judgeCubeFace(lvl: LevelCubeFace, value: number): { ok: boolean; verdict: 'on-target' | 'too-big' | 'too-small' } {
  const ok = within(value, lvl.answer, 0.03);
  return { ok, verdict: ok ? 'on-target' : value > lvl.answer ? 'too-big' : 'too-small' };
}

export type Level = LevelDensity | LevelFlux | LevelBox | LevelCubeFace;
export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) return buildDensity(random);
  if (level === 2) return buildFlux(random);
  if (level === 3) return buildBox(random);
  return buildCubeFace(random);
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

// ---- what is shown after a win ----------------------------------------------------------------------------------------

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'density') {
    return [`${lvl.symbol} is the right density for ${lvl.shape === 'line' ? 'charge spread along a line (charge per length)' : lvl.shape === 'surface' ? 'charge spread over a surface (charge per area)' : 'charge spread through a volume (charge per volume)'}.`, lvl.working + '.', 'Multiply the density by the length, area or volume that carries the charge.'];
  }
  if (lvl.kind === 'flux') {
    const q1 = lvl.first * EPS0 * 1e6;
    return [
      'Gauss’s law: the net flux through any closed surface is Φ = q(enclosed) / ε₀. Charges outside the surface contribute nothing to the net flux.',
      `Here the enclosed charge is ${fmt(q1)} µC, so Φ = ${fmt(q1 * 1e-6)} C / 8.854 × 10⁻¹² = ${fmt(lvl.first)} N m²/C.`,
      lvl.changes ? `Changing the radius by a factor ${lvl.factor} moved the surface past one charge, so the enclosed charge changed and the new flux is ${fmt(lvl.second)} N m²/C.` : `Changing the radius by a factor ${lvl.factor} did not move the surface past any charge, so the flux is unchanged: ${fmt(lvl.second)} N m²/C. Only the charge inside matters, not the size of the surface.`,
    ];
  }
  if (lvl.kind === 'box') {
    return [
      `The enclosed charge is q = ε₀ Φ = 8.854 × 10⁻¹² × ${fmt(lvl.measured)} = ${fmt(lvl.answer)} nC${lvl.measured < 0 ? ' (negative: the flux points inwards)' : ''}.`,
      'A net flux of zero means the net charge inside is zero, not that there is no charge. Equal and opposite charges inside give zero net flux too: all the field that leaves the positive one can enter the negative one.',
      'So zero net flux is consistent with an empty box, with +q and −q, or with +3q and −3q.',
    ];
  }
  const share = lvl.where === 'centre' ? 'q/(6ε₀)' : lvl.touchesCorner ? '0' : 'q/(24ε₀)';
  return [
    lvl.where === 'centre' ? 'The charge is at the centre of the cube, so by symmetry the flux q/ε₀ through the whole cube is shared equally by the six faces.' : 'Eight cubes meet at the corner, so a cube holds one eighth of the charge’s flux: q/(8ε₀). The three faces that meet at the corner have field lines running along them (zero flux), and the other three faces share the flux equally.',
    `Flux through that face: ${share} = ${fmt(lvl.answer)} N m²/C.`,
    'Using symmetry to divide the flux is how the flux through part of a closed surface is found.',
  ];
}
