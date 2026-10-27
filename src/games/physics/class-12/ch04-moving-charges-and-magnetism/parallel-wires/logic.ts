// Pure rules of the Parallel Wires game: no DOM, no canvas.
// Currents in A, lengths as named, forces in µN, mN or µN/m as named. μ₀/2π = 2 × 10⁻⁷ T m/A.
import { pick } from '@core/quiz';

export const G_ACCEL = 9.8;
const K = 2e-7;

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

/** Force per unit length between two long parallel wires, N/m (d in m). */
export const forcePerLength = (i1: number, i2: number, dM: number) => (K * i1 * i2) / dM;
/** Force on a length L (cm) of a wire, in µN, with d in cm. */
export const forceMicro = (i1: number, i2: number, dCm: number, lCm: number) => forcePerLength(i1, i2, dCm / 100) * (lCm / 100) * 1e6;
/** Height (mm) at which a wire of mass λ g/m, carrying I₂ against a fixed wire carrying I₁ in the opposite direction, is held up. */
export const floatingGapMm = (i1: number, i2: number, lambdaGPerM: number) => ((K * i1 * i2) / ((lambdaGPerM / 1000) * G_ACCEL)) * 1000;
/** Net force per unit length (µN/m, positive towards the left wire) on the middle of three equally spaced parallel wires. */
export const middleWireMicroPerM = (i1: number, s1: number, i2: number, i3: number, s3: number, dCm: number) => ((K * i2) / (dCm / 100)) * (s1 * i1 - s3 * i3) * 1e6;
/** Net force (mN) on a rectangular loop of width a and length b (cm) at distance d (cm) from a long wire; positive = attraction, when the near side is parallel to the wire current. */
export const loopForceMilli = (i1: number, i2: number, aCm: number, bCm: number, dCm: number) => K * i1 * i2 * (bCm / 100) * (1 / (dCm / 100) - 1 / ((dCm + aCm) / 100)) * 1000;

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelPair {
  kind: 'pair';
  story: string;
  i1: number;
  i2: number;
  dCm: number;
  lCm: number;
  same: boolean;
  micro: number;
  freeTests: number;
}
export interface LevelFloat {
  kind: 'float';
  story: string;
  i1: number;
  i2: number;
  lambda: number;
  gapMm: number;
  freeTests: number;
}
export interface LevelAmpere {
  kind: 'ampere';
  story: string;
  i: number;
  dM: number;
  microPerM: number;
  doubled: number;
  freeTests: number;
}
export interface LevelThree {
  kind: 'three';
  story: string;
  i1: number;
  s1: number;
  i2: number;
  i3: number;
  s3: number;
  dCm: number;
  microPerM: number;
  toLeft: boolean;
  freeTests: number;
}
export interface LevelLoop {
  kind: 'loop';
  story: string;
  i1: number;
  i2: number;
  aCm: number;
  bCm: number;
  dCm: number;
  attracted: boolean;
  milli: number;
  freeTests: number;
}
export type Level = LevelPair | LevelFloat | LevelAmpere | LevelThree | LevelLoop;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const i1 = pick([8, 5, 10, 20], random);
    const i2 = pick([5, 3, 8, 2], random);
    const dCm = pick([4, 2, 5, 10], random);
    const lCm = pick([10, 20, 50], random);
    const same = random() < 0.5;
    return {
      kind: 'pair',
      story: 'Two long straight parallel wires carry steady currents. Each makes a field at the other, and each field pushes on the other current. Find the force on a length of one wire, and say whether the wires attract or repel.',
      i1,
      i2,
      dCm,
      lCm,
      same,
      micro: forceMicro(i1, i2, dCm, lCm),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const i1 = pick([50, 100, 200], random);
    const i2 = pick([5, 10, 20], random);
    const lambda = pick([1, 2, 5], random);
    return {
      kind: 'float',
      story: 'A light wire is laid parallel to a fixed wire and carries a current in the opposite direction, so the two repel. At the right separation the repulsion exactly balances the weight of the light wire. Choose the separation, then release it.',
      i1,
      i2,
      lambda,
      gapMm: floatingGapMm(i1, i2, lambda),
      freeTests: 1,
    };
  }
  if (level === 3) {
    const i = pick([1, 2, 5, 10], random);
    const dM = pick([0.5, 1, 2], random);
    const micro = forcePerLength(i, i, dM) * 1e6;
    return {
      kind: 'ampere',
      story: 'Two long parallel wires carry equal currents. The force per metre between them is measured. Find the current, which is how the ampere is defined. Then find the force per metre if both currents were doubled at the same separation.',
      i,
      dM,
      microPerM: micro,
      doubled: forcePerLength(2 * i, 2 * i, dM) * 1e6,
      freeTests: 1,
    };
  }
  if (level === 4) {
    for (;;) {
      const i1 = pick([2, 3, 4, 5, 6], random);
      const i2 = pick([2, 3, 4, 5, 6], random);
      const i3 = pick([2, 3, 4, 5, 6], random);
      const s1 = random() < 0.5 ? 1 : -1;
      const s3 = random() < 0.5 ? 1 : -1;
      const dCm = pick([2, 4, 5], random);
      const net = s1 * i1 - s3 * i3;
      if (net === 0) continue;
      return {
        kind: 'three',
        story: 'Three long parallel wires lie in a plane, equally spaced. Wires 1 and 3 carry currents that are either parallel or antiparallel to the current in the middle wire. Each outer wire pulls the middle one towards itself if their currents are parallel and pushes it away if antiparallel. Find the net force per metre on the middle wire, and its direction.',
        i1,
        s1,
        i2,
        i3,
        s3,
        dCm,
        microPerM: Math.abs(middleWireMicroPerM(i1, s1, i2, i3, s3, dCm)),
        toLeft: net > 0,
        freeTests: 1,
      };
    }
  }
  const i1 = pick([10, 20, 30], random);
  const i2 = pick([5, 10], random);
  const aCm = pick([10, 20], random);
  const bCm = pick([20, 30], random);
  const dCm = pick([5, 10], random);
  const attracted = random() < 0.5;
  return {
    kind: 'loop',
    story: attracted ? 'A rectangular loop lies in the plane of a long straight wire, with its near side parallel to the wire. The current in the near side flows the same way as the current in the wire. Find the net force on the loop, and whether it is pulled towards the wire or pushed away.' : 'A rectangular loop lies in the plane of a long straight wire, with its near side parallel to the wire. The current in the near side flows the opposite way to the current in the wire. Find the net force on the loop, and whether it is pulled towards the wire or pushed away.',
    i1,
    i2,
    aCm,
    bCm,
    dCm,
    attracted,
    milli: loopForceMilli(i1, i2, aCm, bCm, dCm),
    freeTests: 1,
  };
}

export function judgePair(lvl: LevelPair, micro: number, attract: boolean): { ok: boolean; fOk: boolean; kindOk: boolean } {
  const fOk = within(micro, lvl.micro, 0.03);
  const kindOk = attract === lvl.same;
  return { ok: fOk && kindOk, fOk, kindOk };
}
export function judgeFloat(lvl: LevelFloat, gapMm: number): { ok: boolean; verdict: 'balanced' | 'rises' | 'falls' } {
  const ok = within(gapMm, lvl.gapMm, 0.03);
  return { ok, verdict: ok ? 'balanced' : gapMm < lvl.gapMm ? 'rises' : 'falls' };
}
export function judgeAmpere(lvl: LevelAmpere, i: number, doubled: number): { ok: boolean; iOk: boolean; dOk: boolean } {
  const iOk = within(i, lvl.i, 0.03);
  const dOk = within(doubled, lvl.doubled, 0.03);
  return { ok: iOk && dOk, iOk, dOk };
}
export function judgeThree(lvl: LevelThree, micro: number, toLeft: boolean): { ok: boolean; fOk: boolean; dirOk: boolean } {
  const fOk = within(micro, lvl.microPerM, 0.03);
  const dirOk = toLeft === lvl.toLeft;
  return { ok: fOk && dirOk, fOk, dirOk };
}
export function judgeLoop(lvl: LevelLoop, milli: number, attracted: boolean): { ok: boolean; fOk: boolean; dirOk: boolean } {
  const fOk = within(milli, lvl.milli, 0.03);
  const dirOk = attracted === lvl.attracted;
  return { ok: fOk && dirOk, fOk, dirOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'pair') {
    return [
      `Wire 1 makes B = μ₀I₁/2πd at wire 2, and wire 2 feels F = I₂ L B = (μ₀/2π) I₁I₂ L/d = 2 × 10⁻⁷ × ${lvl.i1} × ${lvl.i2} × ${lvl.lCm / 100} / ${lvl.dCm / 100} = ${fmt(lvl.micro)} µN.`,
      `Currents in the ${lvl.same ? 'same direction attract' : 'opposite directions repel'}. By Newton's third law the other wire feels an equal and opposite force.`,
    ];
  }
  if (lvl.kind === 'float') {
    return [
      `Balance: (μ₀/2π) I₁I₂/d per metre equals the weight per metre λg. So d = 2 × 10⁻⁷ I₁I₂/(λg) = 2 × 10⁻⁷ × ${lvl.i1} × ${lvl.i2} / (${lvl.lambda / 1000} × 9.8) = ${fmt(lvl.gapMm)} mm.`,
      'Closer than this, the repulsion is greater than the weight and the wire rises; further away it falls. The balance is the reason the ampere is defined through the force between wires.',
    ];
  }
  if (lvl.kind === 'ampere') {
    return [
      `F/L = 2 × 10⁻⁷ I²/d, so I = √(F/L × d / 2 × 10⁻⁷) = ${lvl.i} A. For one ampere in each of two wires 1 m apart the force is 2 × 10⁻⁷ N per metre: this is the definition of the ampere.`,
      `Doubling both currents makes the force 2 × 2 = 4 times bigger: ${fmt(lvl.doubled)} µN/m.`,
    ];
  }
  if (lvl.kind === 'three') {
    return [
      `Each outer wire gives a force per metre of (μ₀/2π) I₂Iₙ/d on the middle wire: parallel currents attract, antiparallel repel. Taking "towards wire 1" as positive: ${lvl.s1 > 0 ? '+' : '−'}I₁ ${lvl.s3 > 0 ? '−' : '+'}I₃ combine to ${lvl.s1 * lvl.i1 - lvl.s3 * lvl.i3}.`,
      `So F/L = 2 × 10⁻⁷ × ${lvl.i2} / ${lvl.dCm / 100} × |${lvl.s1 * lvl.i1 - lvl.s3 * lvl.i3}| = ${fmt(lvl.microPerM)} µN/m, towards ${lvl.toLeft ? 'wire 1' : 'wire 3'}.`,
    ];
  }
  return [
    `The near side (distance d) and the far side (distance d + a) feel opposite forces of (μ₀/2π) I₁I₂ b/distance. The near side is closer, so its force wins: net F = (μ₀/2π) I₁I₂ b (1/d − 1/(d + a)) = ${fmt(lvl.milli)} mN.`,
    `The two side arms feel equal and opposite forces that cancel. Parallel currents on the near side attract, so the loop is ${lvl.attracted ? 'pulled towards the wire' : 'pushed away, because the near side carries the opposite current'}.`,
  ];
}
