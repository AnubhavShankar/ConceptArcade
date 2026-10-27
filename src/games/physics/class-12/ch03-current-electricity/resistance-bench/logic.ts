// Pure rules of the Resistance Bench: no DOM, no canvas.
// Voltage in V, current in A, resistance in ohms, resistivity in 10⁻⁷ ohm metres where named.
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
const within = (value: number, answer: number, tol: number) => Math.abs(value - answer) / Math.abs(answer) <= tol;

// ---- Ohm's law and ohmic or not -----------------------------------------------------------------------------------------

export type CompKind = 'resistor' | 'lamp' | 'diode';
export interface Comp {
  name: string;
  kind: CompKind;
  /** Resistance for a resistor; the scale of the others. */
  r: number;
}
/** The current through a component at a given voltage. Only the resistor obeys Ohm's law. */
export function currentThrough(c: Comp, v: number): number {
  if (c.kind === 'resistor') return v / c.r;
  if (c.kind === 'lamp') return (0.9 * Math.pow(v, 0.55)) / Math.sqrt(c.r);
  return v < 0.6 ? 0.001 * v : 0.0006 + ((v - 0.6) * 1.1) / (c.r / 5);
}
export const isOhmic = (c: Comp) => c.kind === 'resistor';

// ---- resistivity ----------------------------------------------------------------------------------------------------------------

export const resistance = (rhoE7: number, lenM: number, aE7: number) => ((rhoE7 * 1e-7) * lenM) / (aE7 * 1e-7);

// ---- colour code ----------------------------------------------------------------------------------------------------------------

export const COLOURS = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white'] as const;
export const bandsValue = (d1: number, d2: number, mult: number) => (10 * d1 + d2) * Math.pow(10, mult);
/** The bands that make a target resistance, as digits (for the explanation). */
export function bandsFor(target: number): [number, number, number] {
  let m = 0;
  let v = target;
  while (v >= 100) {
    v /= 10;
    m++;
  }
  while (v < 10 && m > 0) {
    v *= 10;
    m--;
  }
  return [Math.floor(Math.round(v) / 10), Math.round(v) % 10, m];
}
export const formatOhms = (r: number) => (r >= 1e6 ? `${fmt(r / 1e6)} MΩ` : r >= 1e3 ? `${fmt(r / 1e3)} kΩ` : `${fmt(r)} Ω`);

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelOhm {
  kind: 'ohm';
  story: string;
  r: number;
  volts: number[];
  freeTests: number;
}
export interface LevelOhmic {
  kind: 'ohmic';
  story: string;
  comps: Comp[];
  volts: number[];
  freeTests: number;
}
export interface LevelRho {
  kind: 'rho';
  story: string;
  rhoE7: number;
  lenM: number;
  aE7: number;
  r: number;
  /** The second wire: its length is lenFactor times longer and its radius radiusFactor times bigger. */
  lenFactor: number;
  radiusFactor: number;
  r2: number;
  freeTests: number;
}
export type Rho = 'unchanged' | 'increases' | 'decreases';
export interface LevelStretch {
  kind: 'stretch';
  story: string;
  r: number;
  k: number;
  r2: number;
  freeTests: number;
}
export interface LevelColour {
  kind: 'colour';
  story: string;
  target: number;
  freeTests: number;
}
export type Level = LevelOhm | LevelOhmic | LevelRho | LevelStretch | LevelColour;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    return {
      kind: 'ohm',
      story: 'A hidden resistor is wired to an adjustable supply, with an ammeter in series. Apply some voltages, watch the current, and find the resistance of the resistor.',
      r: pick([5, 8, 12, 20, 25, 40], random),
      volts: [2, 4, 6, 8, 10, 12],
      freeTests: 1,
    };
  }
  if (level === 2) {
    const kinds: CompKind[] = shuffle(['resistor', 'lamp', 'diode'] as CompKind[], random);
    if (random() < 0.5) kinds[kinds.indexOf('diode')] = 'resistor';
    const comps: Comp[] = kinds.map((kind, i) => ({ name: 'ABC'[i], kind, r: pick([5, 10, 20], random) }));
    return {
      kind: 'ohmic',
      story: 'Three components sit in a box. Sweep the voltage across each one and watch its current plot. Mark every component that obeys Ohm\'s law.',
      comps,
      volts: [0.5, 1, 2, 3, 4, 5, 6],
      freeTests: 1,
    };
  }
  if (level === 3) {
    const rhoE7 = pick([1.5, 2, 4, 5, 10], random);
    const lenM = pick([10, 15, 20], random);
    const aE7 = pick([3, 6], random);
    const lenFactor = pick([2, 3], random);
    const radiusFactor = pick([0.5, 1, 2], random);
    const r = resistance(rhoE7, lenM, aE7);
    return {
      kind: 'rho',
      story: 'A uniform wire has a measured resistance. Find the resistivity of its material. Then a second wire is made of the same material: longer, and with a different radius. Find its resistance.',
      rhoE7,
      lenM,
      aE7,
      r,
      lenFactor,
      radiusFactor,
      r2: (r * lenFactor) / (radiusFactor * radiusFactor),
      freeTests: 1,
    };
  }
  if (level === 4) {
    const r = pick([2, 4, 5, 10], random);
    const k = pick([2, 3, 4], random);
    return {
      kind: 'stretch',
      story: 'A wire is drawn out through a die until it is longer. No metal is added or lost, so its volume stays the same. Find its new resistance, and say what happens to the resistivity of the metal.',
      r,
      k,
      r2: r * k * k,
      freeTests: 1,
    };
  }
  return {
    kind: 'colour',
    story: 'Carbon resistors carry coloured bands: two digits and a power of ten. Set the three bands so that the resistor has the value that is asked for.',
    target: pick([150, 220, 470, 680, 1000, 2200, 3300, 4700, 10000, 33000], random),
    freeTests: 1,
  };
}

export function judgeOhm(lvl: LevelOhm, r: number): { ok: boolean } {
  return { ok: within(r, lvl.r, 0.03) };
}
export function judgeOhmic(lvl: LevelOhmic, marked: string[]): { ok: boolean; missed: string[]; wrong: string[] } {
  const truth = lvl.comps.filter(isOhmic).map((c) => c.name);
  const missed = truth.filter((n) => !marked.includes(n));
  const wrong = marked.filter((n) => !truth.includes(n));
  return { ok: !missed.length && !wrong.length, missed, wrong };
}
export function judgeRho(lvl: LevelRho, rhoE7: number, r2: number): { ok: boolean; rhoOk: boolean; r2Ok: boolean } {
  const rhoOk = within(rhoE7, lvl.rhoE7, 0.03);
  const r2Ok = within(r2, lvl.r2, 0.03);
  return { ok: rhoOk && r2Ok, rhoOk, r2Ok };
}
export function judgeStretch(lvl: LevelStretch, r2: number, rho: Rho): { ok: boolean; r2Ok: boolean; rhoOk: boolean } {
  const r2Ok = within(r2, lvl.r2, 0.03);
  const rhoOk = rho === 'unchanged';
  return { ok: r2Ok && rhoOk, r2Ok, rhoOk };
}
export function judgeColour(lvl: LevelColour, d1: number, d2: number, mult: number): { ok: boolean; value: number } {
  const value = bandsValue(d1, d2, mult);
  return { ok: value === lvl.target, value };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'ohm') {
    return [
      `V = IR, so R = V/I. At every voltage the ratio V/I is the same: ${fmt(lvl.r)} Ω. That constant ratio is Ohm's law.`,
      'Doubling the voltage doubles the current, so the V–I graph is a straight line through the origin, and its slope is the resistance.',
    ];
  }
  if (lvl.kind === 'ohmic') {
    const ohmic = lvl.comps.filter(isOhmic).map((c) => c.name).join(' and ');
    return [
      `${ohmic} ${lvl.comps.filter(isOhmic).length > 1 ? 'give' : 'gives'} a straight line through the origin: the current is proportional to the voltage, so V/I is constant. That is Ohm's law.`,
      'The others bend: their resistance V/I changes with the voltage (the lamp filament heats up; the diode conducts only above a threshold). They are non-ohmic.',
    ];
  }
  if (lvl.kind === 'rho') {
    return [
      `R = ρl/A, so ρ = RA/l = ${fmt(lvl.r)} × ${lvl.aE7} × 10⁻⁷ / ${lvl.lenM} = ${lvl.rhoE7} × 10⁻⁷ Ω m. It depends on the material, not on the dimensions.`,
      `The new wire is ${lvl.lenFactor} times longer (R × ${lvl.lenFactor}) and its radius is ${lvl.radiusFactor} times, so its area is ${lvl.radiusFactor * lvl.radiusFactor} times (R ÷ ${lvl.radiusFactor * lvl.radiusFactor}): R′ = ${fmt(lvl.r2)} Ω.`,
    ];
  }
  if (lvl.kind === 'stretch') {
    return [
      `The volume is fixed, so if the length goes up by ${lvl.k} times the area falls to 1/${lvl.k}. R = ρl/A then goes up by ${lvl.k} × ${lvl.k} = ${lvl.k * lvl.k}: R′ = ${fmt(lvl.r2)} Ω.`,
      'The resistivity is a property of the metal itself, so it does not change when the wire is reshaped.',
    ];
  }
  const [d1, d2, m] = bandsFor(lvl.target);
  return [
    `${formatOhms(lvl.target)} = ${10 * d1 + d2} × 10${m === 0 ? '⁰' : SUP[m]} Ω. First band ${COLOURS[d1]}, second band ${COLOURS[d2]}, multiplier ${COLOURS[m]} (the power of ten).`,
    'The first two bands are digits and the third is how many zeros to add: black 0, brown 1, red 2, orange 3, yellow 4, green 5, blue 6, violet 7, grey 8, white 9.',
  ];
}
