// Pure rules of the Galvanometer Bench: no DOM, no canvas.
import { pick } from '@core/quiz';

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

/** Current sensitivity θ/I = NAB/k in degrees per µA (A in cm², B in T, k in µN m/rad). */
export const sensitivityDegPerMicroA = (n: number, aCm2: number, b: number, kMicro: number) => (((n * (aCm2 * 1e-4) * b) / (kMicro * 1e-6)) * (180 / Math.PI)) * 1e-6;
/** Full-scale current in µA for a full-scale deflection in degrees. */
export const fullScaleMicroA = (n: number, aCm2: number, b: number, kMicro: number, thetaDeg: number) => thetaDeg / sensitivityDegPerMicroA(n, aCm2, b, kMicro);
/** Shunt (in mΩ) that turns a galvanometer (R_G ohms, full-scale current Ig mA) into an ammeter of range I amperes. */
export const shuntMilliOhm = (rg: number, igMilli: number, rangeA: number) => (((igMilli / 1000) * rg) / (rangeA - igMilli / 1000)) * 1000;
/** Resistance (in mΩ) of the galvanometer with its shunt in parallel. */
export const ammeterMilliOhm = (rg: number, shuntMilli: number) => ((rg * (shuntMilli / 1000)) / (rg + shuntMilli / 1000)) * 1000;
/** Current read in a circuit of a source V and resistor R when the meter has resistance rMilli (mΩ). */
export const readingA = (v: number, r: number, rMilli: number) => v / (r + rMilli / 1000);
/** Series resistance (in kΩ) that makes a voltmeter of range V volts from a galvanometer (R_G ohms, Ig mA). */
export const seriesKiloOhm = (rg: number, igMilli: number, rangeV: number) => (rangeV / (igMilli / 1000) - rg) / 1000;
/** Total resistance of the voltmeter in kΩ. */
export const voltmeterKiloOhm = (igMilli: number, rangeV: number) => rangeV / igMilli;

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelDeflect {
  kind: 'deflect';
  story: string;
  n: number;
  aCm2: number;
  b: number;
  kMicro: number;
  thetaFull: number;
  sens: number;
  fullMicro: number;
  freeTests: number;
}
export interface LevelAmmeter {
  kind: 'ammeter';
  story: string;
  rg: number;
  igMilli: number;
  rangeA: number;
  shunt: number;
  reading: number;
  bareReading: number;
  freeTests: number;
}
export interface LevelVoltmeter {
  kind: 'voltmeter';
  story: string;
  rg: number;
  igMilli: number;
  rangeV: number;
  series: number;
  total: number;
  freeTests: number;
}
export interface LevelRatio {
  kind: 'ratio';
  story: string;
  m1: { n: number; a: number; b: number; r: number };
  m2: { n: number; a: number; b: number; r: number };
  current: number;
  voltage: number;
  freeTests: number;
}
export interface LevelTurns {
  kind: 'turns';
  story: string;
  k: number;
  sensI: number;
  rg: number;
  sensV: number;
  newI: number;
  newV: number;
  freeTests: number;
}
export type Level = LevelDeflect | LevelAmmeter | LevelVoltmeter | LevelRatio | LevelTurns;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const n = pick([50, 100, 200], random);
    const aCm2 = pick([10, 20, 30], random);
    const b = pick([0.1, 0.2, 0.25], random);
    const kMicro = pick([1, 2, 5], random);
    const thetaFull = pick([30, 45, 60], random);
    return {
      kind: 'deflect',
      story: 'The coil of a moving-coil galvanometer turns until the magnetic torque NIAB is balanced by the restoring torque kθ of the spring. Find the current sensitivity, the deflection per unit current, and the current that gives full-scale deflection.',
      n,
      aCm2,
      b,
      kMicro,
      thetaFull,
      sens: sensitivityDegPerMicroA(n, aCm2, b, kMicro),
      fullMicro: fullScaleMicroA(n, aCm2, b, kMicro, thetaFull),
      freeTests: 1,
    };
  }
  if (level === 2) {
    for (;;) {
      const rg = pick([20, 50, 60, 100], random);
      const igMilli = pick([1, 2, 5], random);
      const rangeA = pick([1, 2, 5], random);
      const shunt = shuntMilliOhm(rg, igMilli, rangeA);
      const aMilli = ammeterMilliOhm(rg, shunt);
      const reading = readingA(3, 3, aMilli);
      // keep the ammeter's own resistance big enough to show: at least 2.5% below the ideal 1 A
      if (reading > 0.975) continue;
      return {
        kind: 'ammeter',
        story: 'A galvanometer gives full-scale deflection for a small current, and its own resistance would disturb a circuit. A small shunt resistance in parallel lets most of the current bypass the coil. Find the shunt that makes an ammeter of the stated range. Then find what this ammeter reads when it is put in series with a 3 V source and a 3 Ω resistor.',
        rg,
        igMilli,
        rangeA,
        shunt,
        reading,
        bareReading: readingA(3, 3, rg * 1000),
        freeTests: 1,
      };
    }
  }
  if (level === 3) {
    const rg = pick([50, 100, 200], random);
    const igMilli = pick([1, 2, 5], random);
    const rangeV = pick([5, 10, 15], random);
    return {
      kind: 'voltmeter',
      story: 'To read a voltage the galvanometer is joined in parallel with the part of the circuit, but it must draw only a tiny current, so a large resistor is put in series with the coil. Find the series resistance that makes a voltmeter of the stated range, and the total resistance of the voltmeter.',
      rg,
      igMilli,
      rangeV,
      series: seriesKiloOhm(rg, igMilli, rangeV),
      total: voltmeterKiloOhm(igMilli, rangeV),
      freeTests: 1,
    };
  }
  if (level === 4) {
    const n1 = pick([30, 40], random);
    const a1 = pick([3.6, 2.4, 1.8], random);
    const b1 = pick([0.25, 0.5], random);
    const r1 = pick([10, 20], random);
    const nf = pick([1.4, 2, 0.5], random);
    const af = pick([0.5, 1, 2], random);
    const bf = pick([0.5, 1, 2], random);
    const rf = pick([1, 1.4, 2], random);
    const m1 = { n: n1, a: a1, b: b1, r: r1 };
    const m2 = { n: Number((n1 * nf).toPrecision(4)), a: Number((a1 * af).toPrecision(4)), b: b1 * bf, r: Number((r1 * rf).toPrecision(4)) };
    const current = (m2.n * m2.a * m2.b) / (m1.n * m1.a * m1.b);
    return {
      kind: 'ratio',
      story: 'Two moving-coil meters have the same spring. The current sensitivity of a meter is the deflection per unit current, NAB/k. Its voltage sensitivity is the deflection per unit voltage, NAB/kR, where R is the resistance of the coil. Find the ratios of the sensitivities of meter 2 to meter 1.',
      m1,
      m2,
      current,
      voltage: current / (m2.r / m1.r),
      freeTests: 1,
    };
  }
  const k = pick([2, 3, 0.5], random);
  const sensI = pick([10, 20, 50], random);
  const rg = pick([20, 50, 100], random);
  return {
    kind: 'turns',
    story: 'A manufacturer changes the number of turns on the coil of a galvanometer. The wire is the same, so the resistance of the coil is proportional to the number of turns, while the area, the field and the spring are unchanged. Find the new current sensitivity and the new voltage sensitivity.',
    k,
    sensI,
    rg,
    sensV: (sensI * 1000) / rg,
    newI: k * sensI,
    newV: (sensI * 1000) / rg,
    freeTests: 1,
  };
}

export function judgeDeflect(lvl: LevelDeflect, sens: number, full: number): { ok: boolean; sOk: boolean; fOk: boolean } {
  const sOk = within(sens, lvl.sens, 0.03);
  const fOk = within(full, lvl.fullMicro, 0.03);
  return { ok: sOk && fOk, sOk, fOk };
}
export function judgeAmmeter(lvl: LevelAmmeter, shunt: number, reading: number): { ok: boolean; sOk: boolean; rOk: boolean } {
  const sOk = within(shunt, lvl.shunt, 0.03);
  const rOk = within(reading, lvl.reading, 0.01);
  return { ok: sOk && rOk, sOk, rOk };
}
export function judgeVoltmeter(lvl: LevelVoltmeter, series: number, total: number): { ok: boolean; sOk: boolean; tOk: boolean } {
  const sOk = within(series, lvl.series, 0.03);
  const tOk = within(total, lvl.total, 0.03);
  return { ok: sOk && tOk, sOk, tOk };
}
export function judgeRatio(lvl: LevelRatio, current: number, voltage: number): { ok: boolean; cOk: boolean; vOk: boolean } {
  const cOk = within(current, lvl.current, 0.03);
  const vOk = within(voltage, lvl.voltage, 0.03);
  return { ok: cOk && vOk, cOk, vOk };
}
export function judgeTurns(lvl: LevelTurns, i: number, v: number): { ok: boolean; iOk: boolean; vOk: boolean } {
  const iOk = within(i, lvl.newI, 0.03);
  const vOk = within(v, lvl.newV, 0.03);
  return { ok: iOk && vOk, iOk, vOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'deflect') {
    return [
      `In balance kθ = NIAB, so θ/I = NAB/k = ${lvl.n} × ${lvl.aCm2 * 1e-4} × ${lvl.b} / (${lvl.kMicro} × 10⁻⁶) rad per A = ${fmt(lvl.sens)} degrees per µA.`,
      `Full scale is ${lvl.thetaFull}°, so I = ${lvl.thetaFull} / ${fmt(lvl.sens)} = ${fmt(lvl.fullMicro)} µA. The field is radial, so sin θ = 1 at every deflection.`,
    ];
  }
  if (lvl.kind === 'ammeter') {
    return [
      `At full range the coil takes only I_g = ${lvl.igMilli} mA, and the shunt takes the rest. The same voltage is across both: I_g R_G = (I − I_g) r_s, so r_s = I_g R_G/(I − I_g) = ${fmt(lvl.shunt)} mΩ.`,
      `The ammeter's resistance is the coil and the shunt in parallel, almost exactly r_s, so it reads ${fmt(lvl.reading)} A in the circuit. The bare galvanometer would read ${fmt(lvl.bareReading)} A, because its large resistance would change the current.`,
    ];
  }
  if (lvl.kind === 'voltmeter') {
    return [
      `At full range the voltage ${lvl.rangeV} V drives I_g = ${lvl.igMilli} mA through the coil and the series resistor: R + R_G = V/I_g = ${fmt(lvl.total)} kΩ.`,
      `So the series resistance is R = V/I_g − R_G = ${fmt(lvl.series)} kΩ. The large resistance keeps the current drawn from the circuit small.`,
    ];
  }
  if (lvl.kind === 'ratio') {
    return [
      `The current sensitivity is proportional to NAB, so the ratio is (${lvl.m2.n} × ${lvl.m2.a} × ${lvl.m2.b}) / (${lvl.m1.n} × ${lvl.m1.a} × ${lvl.m1.b}) = ${fmt(lvl.current)}.`,
      `The voltage sensitivity is NAB/R, so the ratio is ${fmt(lvl.current)} × R₁/R₂ = ${fmt(lvl.current)} × ${lvl.m1.r}/${lvl.m2.r} = ${fmt(lvl.voltage)}.`,
    ];
  }
  return [
    `The current sensitivity is proportional to N, so with N × ${lvl.k} it becomes ${lvl.sensI} × ${lvl.k} = ${fmt(lvl.newI)} per mA.`,
    `But the coil resistance is also multiplied by ${lvl.k}, so NAB/kR is unchanged: the voltage sensitivity stays ${fmt(lvl.newV)} per V. More current sensitivity does not by itself give more voltage sensitivity.`,
  ];
}
