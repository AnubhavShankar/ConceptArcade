// Pure rules of the Flux Gate: no DOM, no canvas. SI units: field in N/C, lengths in m, flux in N m²/C.
import { pick } from '@core/quiz';

const rad = (deg: number) => (deg * Math.PI) / 180;
/** Flux of a uniform field E through a flat area A whose outward normal makes angle θ with the field: Φ = E A cos θ. */
export const flux = (e: number, area: number, thetaDeg: number) => {
  const v = e * area * Math.cos(rad(thetaDeg));
  return Math.abs(v) < 1e-9 * Math.abs(e * area) ? 0 : v; // cos 90° is not exactly zero in floating point
};

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
export function fmt(x: number): string {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e4 || a < 1e-2)) {
    const [m, e] = x.toExponential(2).split('e');
    return `${Number(m)} × 10${[...String(Number(e))].map((c) => SUP['0123456789-'.indexOf(c)]).join('')}`;
  }
  return String(Number(x.toPrecision(3)));
}
export const round3 = (x: number) => Number(x.toPrecision(3));

// ---- cube faces -------------------------------------------------------------------------------------------

export const FACES = ['+x', '−x', '+y', '−y', '+z', '−z'] as const;
export type Face = (typeof FACES)[number];
const NORMAL: Record<Face, [number, number, number]> = { '+x': [1, 0, 0], '−x': [-1, 0, 0], '+y': [0, 1, 0], '−y': [0, -1, 0], '+z': [0, 0, 1], '−z': [0, 0, -1] };
export type FaceState = 1 | -1 | 0;

/** Flux of a uniform field at angle α (in the x-y plane, from +x) through each face of a cube of side a. */
export function faceFluxes(e: number, a: number, alphaDeg: number): number[] {
  const ex = e * Math.cos(rad(alphaDeg));
  const ey = e * Math.sin(rad(alphaDeg));
  return FACES.map((f) => {
    const [nx, ny, nz] = NORMAL[f];
    return (ex * nx + ey * ny + 0 * nz) * a * a;
  });
}
export const signOf = (x: number, eps: number): FaceState => (Math.abs(x) <= eps ? 0 : x > 0 ? 1 : -1);

// ---- levels --------------------------------------------------------------------------------------------------

export interface LevelTilt {
  kind: 'tilt';
  story: string;
  e: number;
  /** Side of the square loop (m). */
  side: number;
  thetaAnswer: number;
  target: number;
  freeTests: number;
}
export interface LevelCube {
  kind: 'cube';
  story: string;
  e: number;
  side: number;
  alpha: number;
  states: FaceState[];
  rightFlux: number;
  freeTests: number;
}
export interface LevelAngle {
  kind: 'angle';
  story: string;
  e: number;
  side: number;
  thetaAnswer: number;
  target: number;
  freeTests: number;
}
export interface LevelGrow {
  kind: 'grow';
  story: string;
  /** E = alpha √x (SI), cube side a with its near face at x = a and far face at x = 2a. */
  alpha: number;
  a: number;
  net: number;
  freeTests: number;
}
export type Level = LevelTilt | LevelCube | LevelAngle | LevelGrow;

/** Net flux through the cube of Example 1.10 style: E = α √x, faces at x = a and x = 2a, each of area a². */
export const growNet = (alpha: number, a: number) => alpha * a * a * (Math.sqrt(2 * a) - Math.sqrt(a));

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const e = pick([2000, 3000, 4000, 5000], random);
    const side = pick([0.1, 0.2], random);
    const thetaAnswer = pick([0, 30, 45, 60, 120, 135, 150, 180], random);
    return {
      kind: 'tilt',
      story: 'A square loop sits in a steady stream of field. The flux is a measure of how much of the field passes through the loop. Turn the loop until the meter reads the target flux. Watch the specks: they flash as they cross the loop.',
      e,
      side,
      thetaAnswer,
      target: flux(e, side * side, thetaAnswer),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const e = pick([2000, 3000, 4000], random);
    const side = pick([0.1, 0.2], random);
    const alpha = pick([0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330], random);
    const ff = faceFluxes(e, side, alpha);
    const eps = 1e-6 * e * side * side;
    return {
      kind: 'cube',
      story: 'A cube sits in a uniform field. Each face has an outward normal. For every face, decide whether the field leaves through it (positive flux), enters through it (negative flux) or just skims along it (zero flux). Then work out the flux through the +x face and the net flux through the whole cube.',
      e,
      side,
      alpha,
      states: ff.map((v) => signOf(v, eps)),
      rightFlux: ff[0],
      freeTests: 1,
    };
  }
  if (level === 3) {
    const e = pick([2000, 3000, 4000, 5000], random);
    const side = pick([0.1, 0.2], random);
    const thetaAnswer = pick([0, 30, 45, 60, 120, 135, 150, 180], random);
    return {
      kind: 'angle',
      story: 'The meter on this loop has broken, but its order sheet gives the field, the size of the loop and the flux it must show. Work out the angle between the loop’s outward normal and the field, type it, and see whether the loop reads the target.',
      e,
      side,
      thetaAnswer,
      target: flux(e, side * side, thetaAnswer),
      freeTests: 1,
    };
  }
  const alpha = pick([400, 600, 800, 1000], random);
  const a = pick([0.05, 0.1, 0.2], random);
  return {
    kind: 'grow',
    story: 'This field gets stronger as x grows: E = α√x, along +x. A cube of side a has its near face at x = a and its far face at x = 2a. More field leaves through the far face than enters through the near one. Work out the net flux through the cube.',
    alpha,
    a,
    net: growNet(alpha, a),
    freeTests: 1,
  };
}

// ---- judging -------------------------------------------------------------------------------------------------

export function judgeTilt(lvl: LevelTilt | LevelAngle, thetaDeg: number): { ok: boolean; flux: number; verdict: 'on-target' | 'too-much' | 'too-little' } {
  const f = flux(lvl.e, lvl.side * lvl.side, thetaDeg);
  const ok = Math.abs(f - lvl.target) <= 0.03 * lvl.e * lvl.side * lvl.side;
  return { ok, flux: f, verdict: ok ? 'on-target' : f > lvl.target ? 'too-much' : 'too-little' };
}

export interface CubeResult {
  ok: boolean;
  facesWrong: number;
  rightOk: boolean;
  netOk: boolean;
}
export function judgeCube(lvl: LevelCube, states: FaceState[], right: number, net: number): CubeResult {
  const facesWrong = lvl.states.filter((s, i) => states[i] !== s).length;
  const rightOk = lvl.rightFlux === 0 ? Math.abs(right) <= 1e-6 : Math.abs(right - lvl.rightFlux) / Math.abs(lvl.rightFlux) <= 0.03;
  const netOk = Math.abs(net) <= 0.01 * lvl.e * lvl.side * lvl.side;
  return { ok: facesWrong === 0 && rightOk && netOk, facesWrong, rightOk, netOk };
}

export function judgeGrow(lvl: LevelGrow, value: number): { ok: boolean; verdict: 'on-target' | 'too-big' | 'too-small' } {
  const ok = Math.abs(value - lvl.net) / lvl.net <= 0.03;
  return { ok, verdict: ok ? 'on-target' : value > lvl.net ? 'too-big' : 'too-small' };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

// ---- what is shown after a win ---------------------------------------------------------------------------------------

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'tilt' || lvl.kind === 'angle') {
    const a = lvl.side * lvl.side;
    return [
      'The flux of a uniform field through a flat area is Φ = E A cos θ, where θ is the angle between the field and the area’s outward normal.',
      `Here E A = ${fmt(lvl.e)} × ${fmt(a)} = ${fmt(lvl.e * a)} N m²/C, so cos θ = ${fmt(lvl.target)} / ${fmt(lvl.e * a)} = ${fmt(Math.cos(rad(lvl.thetaAnswer)))} and θ = ${lvl.thetaAnswer}°.`,
      lvl.thetaAnswer === 0 ? 'At θ = 0 the field is along the normal: the most field passes through.' : lvl.thetaAnswer > 90 ? 'Beyond 90° the outward normal points against the field, so the field enters through that side and the flux is negative.' : 'The more the loop is tilted away from facing the field, the smaller the flux. At 90° the loop is edge-on and the flux is zero.',
    ];
  }
  if (lvl.kind === 'cube') {
    const a2 = lvl.side * lvl.side;
    return [
      'For each face, Φ = E · n A, where n is the face’s outward normal. A face the field leaves through has positive flux, one it enters through has negative flux, and one the field runs along has zero.',
      `Through the +x face: Φ = E A cos ${lvl.alpha}° = ${fmt(lvl.e)} × ${fmt(a2)} × ${fmt(Math.cos(rad(lvl.alpha)))} = ${fmt(lvl.rightFlux)} N m²/C.`,
      'Opposite faces have equal and opposite flux, because the field is uniform: everything that enters leaves. So the net flux through the cube is zero.',
    ];
  }
  return [
    'The field is the same over each face because the faces are flat and perpendicular to x, so Φ = E A for the far face (outward) and Φ = −E A for the near face (inward). The other four faces are parallel to the field and carry no flux.',
    `Far face (x = 2a): E = α√(2a), near face (x = a): E = α√a. Net: Φ = a² α (√(2a) − √a) = α a^(5/2) (√2 − 1) = ${fmt(lvl.net)} N m²/C.`,
    'The net flux is not zero, so the cube must contain charge. (Gauss’s law makes this precise: Φ = q / ε₀.)',
  ];
}
