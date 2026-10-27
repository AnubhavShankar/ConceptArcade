// Pure rules of the Circuit Solver: no DOM, no canvas.
// emf and voltage in volts, resistance in ohms, current in amperes.
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

export const seriesR = (rs: number[]) => rs.reduce((s, r) => s + r, 0);
export const parallelR = (rs: number[]) => 1 / rs.reduce((s, r) => s + 1 / r, 0);

export type Topology = 'r1-series-with-pair' | 'r1-parallel-with-chain';
export function networkR(topology: Topology, r1: number, r2: number, r3: number): number {
  return topology === 'r1-series-with-pair' ? seriesR([r1, parallelR([r2, r3])]) : parallelR([r1, seriesR([r2, r3])]);
}
/** The voltage across R1 in the two topologies, for a battery V across the whole network. */
export function voltageAcrossR1(topology: Topology, r1: number, r2: number, r3: number, v: number): number {
  const req = networkR(topology, r1, r2, r3);
  return topology === 'r1-series-with-pair' ? (v / req) * r1 : v;
}

/** The middle-branch current of the two-loop circuit (positive = flowing downwards). Branch currents flow upwards in the outer branches. */
export function twoLoop(e1: number, r1: number, e2: number, r2: number, r3: number, sign: 1 | -1) {
  const i3 = (e1 / r1 + (sign * e2) / r2) / (1 + r3 * (1 / r1 + 1 / r2));
  return { i1: (e1 - i3 * r3) / r1, i2: (sign * e2 - i3 * r3) / r2, i3 };
}
/** Cube of 12 equal resistors, battery across opposite corners: R_eq = 5R/6. */
export const cubeR = (r: number) => (5 * r) / 6;

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelReduce {
  kind: 'reduce';
  story: string;
  topology: Topology;
  r1: number;
  r2: number;
  r3: number;
  v: number;
  req: number;
  vR1: number;
  freeTests: number;
}
export interface LevelJunction {
  kind: 'junction';
  story: string;
  /** Currents of the first three wires, positive meaning into the junction. */
  known: number[];
  /** The fourth current in magnitude, and whether it flows into the junction. */
  fourth: number;
  fourthIn: boolean;
  freeTests: number;
}
export interface LevelLoop {
  kind: 'loop';
  story: string;
  aiding: boolean;
  e1: number;
  e2: number;
  r1: number;
  r2: number;
  i: number;
  vR1: number;
  /** True when the current runs clockwise round the loop. */
  clockwise: boolean;
  freeTests: number;
}
export interface LevelTwoLoop {
  kind: 'twoloop';
  story: string;
  e1: number;
  r1: number;
  e2: number;
  r2: number;
  r3: number;
  sign: 1 | -1;
  i1: number;
  i3: number;
  /** True when the middle current flows downwards. */
  down: boolean;
  freeTests: number;
}
export interface LevelCube {
  kind: 'cube';
  story: string;
  r: number;
  e: number;
  req: number;
  total: number;
  edge: number;
  freeTests: number;
}
export type Level = LevelReduce | LevelJunction | LevelLoop | LevelTwoLoop | LevelCube;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const topology: Topology = random() < 0.5 ? 'r1-series-with-pair' : 'r1-parallel-with-chain';
    const [r1, r2, r3] = [pick([2, 3, 4, 6, 12], random), pick([2, 3, 4, 6, 12], random), pick([2, 3, 4, 6, 12], random)];
    const v = pick([12, 24], random);
    return {
      kind: 'reduce',
      story: topology === 'r1-series-with-pair' ? 'A resistor R₁ is in series with a pair, R₂ and R₃, that are in parallel. Find the resistance of the whole network, and the voltage across R₁.' : 'A resistor R₁ is in parallel with a chain, R₂ and R₃, that are in series. Find the resistance of the whole network, and the voltage across R₁.',
      topology,
      r1,
      r2,
      r3,
      v,
      req: networkR(topology, r1, r2, r3),
      vR1: voltageAcrossR1(topology, r1, r2, r3, v),
      freeTests: 1,
    };
  }
  if (level === 2) {
    for (;;) {
      const a = pick([1, 2, 3, 4], random);
      const b = pick([1, 2, 3], random);
      const c = pick([1, 2, 3, 4], random);
      // wires 1 and 2 bring current in, wire 3 takes some out; the fourth must balance them
      const net = a + b - c;
      if (net === 0) continue;
      return {
        kind: 'junction',
        story: 'Four wires meet at a junction. Three of the currents are known. Charge cannot pile up at a junction. Find the fourth current, and say whether it flows into the junction or out of it.',
        known: [a, b, -c],
        fourth: Math.abs(net),
        fourthIn: net < 0,
        freeTests: 1,
      };
    }
  }
  if (level === 3) {
    const aiding = random() < 0.5;
    const e1 = pick([6, 9, 12], random);
    let e2 = pick([3, 4.5, 6], random);
    if (!aiding && e2 === e1) e2 = 3;
    const r1 = pick([2, 3, 4], random);
    const r2 = pick([2, 3, 6], random);
    const net = aiding ? e1 + e2 : e1 - e2;
    return {
      kind: 'loop',
      story: aiding ? 'A single loop contains two cells that push the current the same way round, and two resistors. Use the loop rule: the emfs and the drops across the resistors add up to zero round the loop. Find the current, the voltage across the ringed resistor, and the direction of the current.' : 'A single loop contains two cells that push against each other, and two resistors. The larger emf wins. Find the current, the voltage across the ringed resistor, and the direction of the current.',
      aiding,
      e1,
      e2,
      r1,
      r2,
      i: Math.abs(net) / (r1 + r2),
      vR1: (Math.abs(net) / (r1 + r2)) * r1,
      clockwise: net > 0,
      freeTests: 1,
    };
  }
  if (level === 4) {
    for (;;) {
      const e1 = pick([6, 8, 10, 12], random);
      const e2 = pick([6, 8, 10, 12], random);
      const r1 = pick([1, 2, 3, 4], random);
      const r2 = pick([1, 2, 3, 4], random);
      const r3 = pick([1, 2, 3, 4], random);
      const sign: 1 | -1 = random() < 0.5 ? 1 : -1;
      const sol = twoLoop(e1, r1, e2, r2, r3, sign);
      if (Math.abs(sol.i3) < 0.3 || Math.abs(sol.i1) < 0.2) continue;
      return {
        kind: 'twoloop',
        story: sign === 1 ? 'Two cells feed a shared resistor R₃ through their own resistors, as in a two-loop network. Apply the junction rule once and the loop rule twice. Find the current from cell 1, the current in R₃, and the direction of the current in R₃.' : 'Two cells are joined with opposite polarity into a shared resistor R₃, through their own resistors. Apply the junction rule once and the loop rule twice. Find the current from cell 1, the current in R₃, and its direction.',
        e1,
        r1,
        e2,
        r2,
        r3,
        sign,
        i1: sol.i1,
        i3: Math.abs(sol.i3),
        down: sol.i3 > 0,
        freeTests: 1,
      };
    }
  }
  const r = pick([1, 2, 3, 6], random);
  const e = pick([6, 10, 12], random);
  const req = cubeR(r);
  return {
    kind: 'cube',
    story: 'A battery is connected across the diagonally opposite corners of a cube whose twelve edges are each a resistor. The network cannot be reduced by series and parallel rules, but symmetry makes the three edges at each end carry equal currents. Find the equivalent resistance of the cube, and the current in each edge leaving the positive corner.',
    r,
    e,
    req,
    total: e / req,
    edge: e / req / 3,
    freeTests: 1,
  };
}

export function judgeReduce(lvl: LevelReduce, req: number, v: number): { ok: boolean; reqOk: boolean; vOk: boolean } {
  const reqOk = within(req, lvl.req, 0.03);
  const vOk = within(v, lvl.vR1, 0.03);
  return { ok: reqOk && vOk, reqOk, vOk };
}
export function judgeJunction(lvl: LevelJunction, fourth: number, into: boolean): { ok: boolean; magOk: boolean; dirOk: boolean } {
  const magOk = within(fourth, lvl.fourth, 0.03);
  const dirOk = into === lvl.fourthIn;
  return { ok: magOk && dirOk, magOk, dirOk };
}
export function judgeLoop(lvl: LevelLoop, i: number, v: number, clockwise: boolean): { ok: boolean; iOk: boolean; vOk: boolean; dirOk: boolean } {
  const iOk = within(i, lvl.i, 0.03);
  const vOk = within(v, lvl.vR1, 0.03);
  const dirOk = clockwise === lvl.clockwise;
  return { ok: iOk && vOk && dirOk, iOk, vOk, dirOk };
}
export function judgeTwoLoop(lvl: LevelTwoLoop, i1: number, i3: number, down: boolean): { ok: boolean; i1Ok: boolean; i3Ok: boolean; dirOk: boolean } {
  const i1Ok = within(i1, Math.abs(lvl.i1), 0.03);
  const i3Ok = within(i3, lvl.i3, 0.03);
  const dirOk = down === lvl.down;
  return { ok: i1Ok && i3Ok && dirOk, i1Ok, i3Ok, dirOk };
}
export function judgeCube(lvl: LevelCube, req: number, edge: number): { ok: boolean; reqOk: boolean; edgeOk: boolean } {
  const reqOk = within(req, lvl.req, 0.03);
  const edgeOk = within(edge, lvl.edge, 0.03);
  return { ok: reqOk && edgeOk, reqOk, edgeOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'reduce') {
    return [
      lvl.topology === 'r1-series-with-pair'
        ? `The parallel pair is R₂₃ = R₂R₃/(R₂ + R₃) = ${fmt(parallelR([lvl.r2, lvl.r3]))} Ω. In series with R₁: R = ${lvl.r1} + ${fmt(parallelR([lvl.r2, lvl.r3]))} = ${fmt(lvl.req)} Ω.`
        : `The series chain is R₂₃ = R₂ + R₃ = ${lvl.r2 + lvl.r3} Ω. In parallel with R₁: 1/R = 1/${lvl.r1} + 1/${lvl.r2 + lvl.r3}, so R = ${fmt(lvl.req)} Ω.`,
      lvl.topology === 'r1-series-with-pair' ? `The current is I = V/R = ${lvl.v} / ${fmt(lvl.req)} = ${fmt(lvl.v / lvl.req)} A, and R₁ carries all of it: V₁ = IR₁ = ${fmt(lvl.vR1)} V.` : `R₁ is connected straight across the battery, so it has the full ${lvl.v} V.`,
    ];
  }
  if (lvl.kind === 'junction') {
    return [
      `Kirchhoff's junction rule: the currents into a junction add up to the currents out. Taking into-the-junction as positive, the known currents are ${lvl.known.map((k) => fmt(k)).join(', ')} A, which sum to ${fmt(lvl.known.reduce((s, k) => s + k, 0))} A.`,
      `The fourth wire must carry ${fmt(lvl.fourth)} A ${lvl.fourthIn ? 'into' : 'out of'} the junction so that the total is zero.`,
    ];
  }
  if (lvl.kind === 'loop') {
    return [
      lvl.aiding ? `Loop rule: ε₁ + ε₂ − I(R₁ + R₂) = 0, so I = (${lvl.e1} + ${lvl.e2}) / (${lvl.r1} + ${lvl.r2}) = ${fmt(lvl.i)} A.` : `Loop rule: ε₁ − ε₂ − I(R₁ + R₂) = 0 taking the larger cell's direction, so I = (${lvl.e1} − ${lvl.e2}) / (${lvl.r1} + ${lvl.r2}) = ${fmt(lvl.i)} A.`,
      `The voltage across R₁ is IR₁ = ${fmt(lvl.i)} × ${lvl.r1} = ${fmt(lvl.vR1)} V. The current flows ${lvl.clockwise ? 'clockwise' : 'anticlockwise'}, the way the stronger emf pushes it.`,
    ];
  }
  if (lvl.kind === 'twoloop') {
    return [
      `Junction rule: I₃ = I₁ + I₂. Loop rule for the left loop: ε₁ − I₁R₁ − I₃R₃ = 0. For the right loop: ${lvl.sign === 1 ? 'ε₂' : '−ε₂'} − I₂R₂ − I₃R₃ = 0.`,
      `Solving gives I₁ = ${fmt(lvl.i1)} A and I₃ = ${fmt(lvl.i3)} A, flowing ${lvl.down ? 'down' : 'up'} through R₃.`,
      'Three unknowns need three equations: one from the junction and two independent loops.',
    ];
  }
  return [
    'By symmetry the three edges leaving the positive corner carry equal currents, I each, and at the next corners each splits equally into two edges, so each of the six middle edges carries I/2.',
    `Loop rule round one path of the cube: ε = IR + (I/2)R + IR = (5/2)IR. The total current is 3I, so R_eq = ε/(3I) = 5R/6 = ${fmt(lvl.req)} Ω.`,
    `The total current is ε/R_eq = ${lvl.e} / ${fmt(lvl.req)} = ${fmt(lvl.total)} A, so each edge at the positive corner carries ${fmt(lvl.edge)} A.`,
  ];
}
