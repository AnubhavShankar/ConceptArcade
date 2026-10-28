// Pure rules of the Motional emf game: no DOM, no canvas.
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

/** Motional emf ε = B l v. */
export const motionalEmf = (b: number, l: number, v: number) => b * l * v;
/** Emf between the centre and the rim of a rod or spoke of length l turning at ω: ½ B ω l². */
export const rotatingEmf = (b: number, omega: number, l: number) => 0.5 * b * omega * l * l;

export type End = 'east' | 'west';
/** Horizontal E–W wire in the earth's horizontal field (pointing north), falling or rising: the positive end. */
export const higherEnd = (falling: boolean): End => (falling ? 'east' : 'west');

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelWire {
  kind: 'wire';
  story: string;
  lM: number;
  v: number;
  bMicro: number;
  falling: boolean;
  milliV: number;
  end: End;
  freeTests: number;
}
export interface LevelLeave {
  kind: 'leave';
  story: string;
  longCm: number;
  shortCm: number;
  b: number;
  vCm: number;
  /** True when the loop moves at right angles to its longer side. */
  normalToLong: boolean;
  microV: number;
  seconds: number;
  freeTests: number;
}
export interface LevelRod {
  kind: 'rod';
  story: string;
  lM: number;
  b: number;
  /** The speed as given, with its unit. */
  rate: number;
  unit: 'rad/s' | 'rev/s';
  omega: number;
  volts: number;
  freeTests: number;
}
export interface LevelWheel {
  kind: 'wheel';
  story: string;
  spokes: number;
  lM: number;
  rpm: number;
  bGauss: number;
  microV: number;
  freeTests: number;
}
export type Level = LevelWire | LevelLeave | LevelRod | LevelWheel;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const lM = pick([5, 10, 20], random);
    const v = pick([2, 5, 8], random);
    const bMicro = pick([30, 40, 50], random);
    const falling = random() < 0.5;
    return {
      kind: 'wire',
      story: `A horizontal straight wire lying east to west is ${falling ? 'falling' : 'being thrown upwards'} at right angles to the horizontal component of the earth’s field, which points north. Find the emf induced in it, and say which end is at the higher electrical potential.`,
      lM,
      v,
      bMicro,
      falling,
      milliV: motionalEmf(bMicro * 1e-6, lM, v) * 1000,
      end: higherEnd(falling),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const longCm = pick([8, 10, 12], random);
    const shortCm = pick([2, 4], random);
    const b = pick([0.2, 0.3, 0.5], random);
    const vCm = pick([1, 2, 5], random);
    const normalToLong = random() < 0.5;
    const cut = normalToLong ? longCm : shortCm; // the edge parallel to the boundary
    const travel = normalToLong ? shortCm : longCm;
    return {
      kind: 'leave',
      story: `A rectangular wire loop with a small cut is moving out of a region of uniform field at right angles to its plane, at right angles to its ${normalToLong ? 'longer' : 'shorter'} side. Find the emf across the cut while the loop is leaving the field, and for how long the voltage lasts.`,
      longCm,
      shortCm,
      b,
      vCm,
      normalToLong,
      microV: motionalEmf(b, cut / 100, vCm / 100) * 1e6,
      seconds: travel / vCm,
      freeTests: 1,
    };
  }
  if (level === 3) {
    const lM = pick([0.5, 1], random);
    const b = pick([0.5, 1], random);
    const unit = random() < 0.5 ? 'rad/s' : 'rev/s';
    const rate = unit === 'rad/s' ? pick([100, 200, 400], random) : pick([25, 50], random);
    const omega = unit === 'rad/s' ? rate : 2 * Math.PI * rate;
    return {
      kind: 'rod',
      story: `A metal rod is rotated about an axis through one end, at right angles to the rod, while its other end slides on a circular ring. A uniform field parallel to the axis fills the space. Find the emf between the centre and the ring.`,
      lM,
      b,
      rate,
      unit,
      omega,
      volts: rotatingEmf(b, omega, lM),
      freeTests: 1,
    };
  }
  const spokes = pick([8, 10, 12], random);
  const lM = pick([0.4, 0.5, 0.6], random);
  const rpm = pick([60, 120, 180], random);
  const bGauss = pick([0.3, 0.4, 0.5], random);
  return {
    kind: 'wheel',
    story: 'A wheel with metallic spokes is rotated in a plane at right angles to the horizontal component of the earth’s field, with the axle and the rim connected to a meter. Find the induced emf between the axle and the rim. Does the number of spokes matter?',
    spokes,
    lM,
    rpm,
    bGauss,
    microV: rotatingEmf(bGauss * 1e-4, (2 * Math.PI * rpm) / 60, lM) * 1e6,
    freeTests: 1,
  };
}

export function judgeWire(lvl: LevelWire, milliV: number, end: End): { ok: boolean; eOk: boolean; endOk: boolean } {
  const eOk = within(milliV, lvl.milliV, 0.03);
  const endOk = end === lvl.end;
  return { ok: eOk && endOk, eOk, endOk };
}
export function judgeLeave(lvl: LevelLeave, microV: number, s: number): { ok: boolean; eOk: boolean; tOk: boolean } {
  const eOk = within(microV, lvl.microV, 0.03);
  const tOk = within(s, lvl.seconds, 0.03);
  return { ok: eOk && tOk, eOk, tOk };
}
export function judgeRod(lvl: LevelRod, v: number): { ok: boolean } {
  return { ok: within(v, lvl.volts, 0.03) };
}
export function judgeWheel(lvl: LevelWheel, microV: number): { ok: boolean } {
  return { ok: within(microV, lvl.microV, 0.03) };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'wire') {
    return [
      `ε = Blv = ${lvl.bMicro} × 10⁻⁶ × ${lvl.lM} × ${lvl.v} = ${fmt(lvl.milliV)} mV.`,
      `The wire ${lvl.falling ? 'falls' : 'rises'} with the field pointing north. The force on its positive charges is q v × B, which points ${lvl.end}. So positive charge piles up at the ${lvl.end} end, which is at the higher potential.`,
    ];
  }
  if (lvl.kind === 'leave') {
    const cut = lvl.normalToLong ? lvl.longCm : lvl.shortCm;
    const travel = lvl.normalToLong ? lvl.shortCm : lvl.longCm;
    return [
      `The loop moves at right angles to its ${lvl.normalToLong ? 'longer' : 'shorter'} side, so the edge of length ${cut} cm parallel to the boundary is the one cutting field lines: ε = Blv = ${lvl.b} × ${cut / 100} × ${lvl.vCm / 100} = ${fmt(lvl.microV)} µV.`,
      `The loop takes ${travel} cm / ${lvl.vCm} cm/s = ${fmt(lvl.seconds)} s to leave the field, and the emf lasts that long. Once it is out, or while it is wholly inside, the flux does not change and there is no emf.`,
    ];
  }
  if (lvl.kind === 'rod') {
    return [
      `Each small length dr moves at v = ωr, so dε = Bωr dr and the emf along the rod is ε = ½Bωl².`,
      lvl.unit === 'rev/s' ? `ω = 2π × ${lvl.rate} = ${fmt(lvl.omega)} rad/s, so ε = ½ × ${lvl.b} × ${fmt(lvl.omega)} × ${lvl.lM}² = ${fmt(lvl.volts)} V.` : `ε = ½ × ${lvl.b} × ${lvl.rate} × ${lvl.lM}² = ${fmt(lvl.volts)} V.`,
    ];
  }
  return [
    `Each spoke has the emf ½Bωl² between the axle and the rim, with ω = 2π × ${lvl.rpm}/60 = ${fmt((2 * Math.PI * lvl.rpm) / 60)} rad/s and B = ${lvl.bGauss} G = ${lvl.bGauss * 1e-4} T. That gives ${fmt(lvl.microV)} µV.`,
    `The ${lvl.spokes} spokes are all joined in parallel between the axle and the rim, so they do not add: the emf is that of one spoke.`,
  ];
}
