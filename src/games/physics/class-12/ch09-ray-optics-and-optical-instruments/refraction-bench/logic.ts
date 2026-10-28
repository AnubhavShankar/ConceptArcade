// Pure rules of the Refraction Bench: no DOM, no canvas.
import { pick } from '@core/quiz';
import { fmt, within } from '@core/judge';

export { starsFor } from '@core/judge';

const RAD = Math.PI / 180;
export const sinD = (d: number) => Math.sin(d * RAD);
export const asinD = (x: number) => Math.asin(x) / RAD;
const round1 = (x: number) => Math.round(x * 10) / 10;

export interface Hero {
  name: string;
  role: string;
  story: string;
  objective: string;
}
export interface LevelSnell {
  kind: 'snell';
  hero: Hero;
  nW: number;
  nG: number;
  /** The common incidence from air that the two photographs used, and what each medium did to it (to 0.1°). */
  airDeg: number;
  rWater: number;
  rGlass: number;
  /** Incidence inside the water, and the angle the ray takes in the glass. */
  inDeg: number;
  answer: number;
  freeTests: number;
}
export interface LevelDepth {
  kind: 'depth';
  hero: Hero;
  H: number;
  n1: number;
  n2: number;
  /** How far the microscope must move, in cm; positive means up. */
  move: number;
  freeTests: number;
}
export interface LevelSlab {
  kind: 'slab';
  hero: Hero;
  t: number;
  n: number;
  shift: number;
  freeTests: number;
}
export interface LevelCone {
  kind: 'cone';
  hero: Hero;
  d: number;
  n: number;
  radius: number;
  freeTests: number;
}
export interface LevelPipe {
  kind: 'pipe';
  hero: Hero;
  n1: number;
  n2: number;
  /** Largest angle of incidence from air that is still guided, in degrees (90 when every angle is). */
  maxDeg: number;
  freeTests: number;
}
export type Level = LevelSnell | LevelDepth | LevelSlab | LevelCone | LevelPipe;

/** Apparent depth of an object at real depth H under a surface of index n, seen from above. */
export const apparentDepth = (H: number, n: number) => H / n;
export const criticalDeg = (n: number) => asinD(1 / n);
/** The widest cone, in degrees, that a fibre with core n1 and cladding n2 accepts from air. */
export function acceptanceDeg(n1: number, n2: number): number {
  const s = Math.sqrt(Math.max(0, n1 * n1 - n2 * n2));
  return s >= 1 ? 90 : asinD(s);
}
/** Radius of the circle on the surface through which light from a source at depth d can leave. */
export const coneRadius = (d: number, n: number) => d / Math.sqrt(n * n - 1);
export const slabShift = (t: number, n: number) => t * (1 - 1 / n);

const SNELL: [number, number, number][] = [[1.33, 1.5, 45], [1.33, 1.6, 30], [1.33, 1.52, 50], [1.33, 1.7, 40], [1.36, 1.5, 35], [1.33, 1.65, 55]];
const DEPTH: [number, number, number][] = [[12, 1.2, 1.5], [18, 1.5, 1.2], [20, 1.25, 1.6], [15, 1.25, 1.5], [24, 1.5, 1.2], [21, 1.4, 1.5], [16, 1.6, 1.25], [24, 1.2, 1.6]];
const SLAB: [number, number][] = [[15, 1.5], [12, 1.5], [9, 1.5], [20, 1.25], [16, 1.6], [12, 1.2], [18, 1.2], [21, 1.75]];
const CONE: [number, number][] = [[60, 1.25], [80, 1.33], [100, 1.5], [120, 1.33], [50, 1.6], [90, 1.25]];
const PIPE: [number, number][] = [[1.68, 1.44], [1.5, 1.3], [1.6, 1.4], [1.5, 1.2], [1.45, 1.4], [1.5, 1]];

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const [nW, nG, inDeg] = pick(SNELL, random);
    const airDeg = 60;
    return {
      kind: 'snell',
      hero: {
        name: 'Ray',
        role: 'a beam of light crossing from water into glass',
        story: `Two photographs show Ray entering the same glass block and the same water from air, both at ${airDeg}°. In the glass it bends to ${round1(asinD(sinD(airDeg) / nG))}° from the normal, and in the water to ${round1(asinD(sinD(airDeg) / nW))}°. Now Ray travels inside the water and meets the water–glass boundary at ${inDeg}°.`,
        objective: 'Set the detector in the glass at the angle Ray will take, measured from the normal.',
      },
      nW,
      nG,
      airDeg,
      rWater: round1(asinD(sinD(airDeg) / nW)),
      rGlass: round1(asinD(sinD(airDeg) / nG)),
      inDeg,
      answer: asinD((nW * sinD(inDeg)) / nG),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const [H, n1, n2] = pick(DEPTH, random);
    return {
      kind: 'depth',
      hero: {
        name: 'Needle',
        role: `lying at the bottom of a tank ${H} cm deep`,
        story: `A travelling microscope is focused on Needle through a liquid of refractive index ${n1}. The liquid is drained and replaced by one of refractive index ${n2}, filled to the same height of ${H} cm.`,
        objective: 'Move the microscope so that Needle is sharp again, saying how far and which way.',
      },
      H,
      n1,
      n2,
      move: apparentDepth(H, n1) - apparentDepth(H, n2),
      freeTests: 1,
    };
  }
  if (level === 3) {
    const [t, n] = pick(SLAB, random);
    return {
      kind: 'slab',
      hero: {
        name: 'Pin',
        role: `on a table, seen through a glass slab ${t} cm thick`,
        story: `A camera looks down at Pin from above. A slab of glass of refractive index ${n} and thickness ${t} cm is laid over it, and the camera must refocus.`,
        objective: 'Say how far Pin appears to be raised, and whether sliding the slab nearer to Pin would change that.',
      },
      t,
      n,
      shift: slabShift(t, n),
      freeTests: 1,
    };
  }
  if (level === 4) {
    const [d, n] = pick(CONE, random);
    return {
      kind: 'cone',
      hero: {
        name: 'Glow',
        role: `a small lamp ${d} cm below the surface of a pool of index ${n}`,
        story: `Glow shines in every direction. Where the light meets the surface at too steep an angle it cannot leave: it is totally internally reflected. Only a circle of the surface lets light out.`,
        objective: 'Cut a disc that floats directly above Glow and just blocks all the light that escapes: give its radius.',
      },
      d,
      n,
      radius: coneRadius(d, n),
      freeTests: 1,
    };
  }
  const [n1, n2] = pick(PIPE, random);
  return {
    kind: 'pipe',
    hero: {
      name: 'Pulse',
      role: 'a pulse of light entering an optical fibre from air',
      story: `The fibre has a core of refractive index ${n1} ${n2 === 1 ? 'and no cladding, so the outside is air.' : `inside a cladding of index ${n2}.`} Pulse reaches the end only if it is totally internally reflected every time it meets the wall.`,
      objective: 'Aim Pulse at the widest angle of incidence on the end face, from the axis, that the fibre still guides.',
    },
    n1,
    n2,
    maxDeg: acceptanceDeg(n1, n2),
    freeTests: 1,
  };
}

/** Does a ray entering the end face at this angle stay trapped? A rounded entry up to 0.3° over the limit is forgiven. */
export function pipeGuided(lvl: LevelPipe, deg: number): boolean {
  return deg <= lvl.maxDeg + 0.3;
}

export function judgeSnell(lvl: LevelSnell, deg: number): { ok: boolean } {
  return { ok: within(deg, lvl.answer, 0.02) };
}
export function judgeDepth(lvl: LevelDepth, up: number): { ok: boolean } {
  return { ok: within(up, lvl.move, 0.03) };
}
export function judgeSlab(lvl: LevelSlab, shift: number, change: 'changes' | 'same'): { ok: boolean; sOk: boolean; cOk: boolean } {
  const sOk = within(shift, lvl.shift, 0.03);
  const cOk = change === 'same';
  return { ok: sOk && cOk, sOk, cOk };
}
export function judgeCone(lvl: LevelCone, r: number): { ok: boolean } {
  return { ok: within(r, lvl.radius, 0.03) };
}
export function judgePipe(lvl: LevelPipe, deg: number): { ok: boolean; guided: boolean } {
  const guided = pipeGuided(lvl, deg);
  return { ok: guided && deg <= 90 && within(deg, lvl.maxDeg, 0.03), guided };
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'snell') {
    return [
      `From air, n = sin ${lvl.airDeg}° / sin r: so water has n = ${fmt(lvl.nW)} and glass has n = ${fmt(lvl.nG)} (about; from sin ${lvl.airDeg}° divided by the sine of ${lvl.rWater}° and ${lvl.rGlass}°).`,
      `At the water–glass boundary, n_w sin ${lvl.inDeg}° = n_g sin r, so sin r = ${fmt(lvl.nW)} × ${fmt(sinD(lvl.inDeg))} / ${fmt(lvl.nG)} = ${fmt(sinD(lvl.answer))}, and r = ${fmt(lvl.answer)}° (Exercise 9.4).`,
    ];
  }
  if (lvl.kind === 'depth') {
    const a1 = apparentDepth(lvl.H, lvl.n1);
    const a2 = apparentDepth(lvl.H, lvl.n2);
    return [
      `Apparent depth = real depth / n. First liquid: ${lvl.H}/${lvl.n1} = ${fmt(a1)} cm. Second liquid: ${lvl.H}/${lvl.n2} = ${fmt(a2)} cm.`,
      `The image of Needle ${a2 < a1 ? 'rises' : 'sinks'} by ${fmt(Math.abs(lvl.move))} cm, so the microscope must move ${lvl.move > 0 ? 'up' : 'down'} by ${fmt(Math.abs(lvl.move))} cm to keep it in focus (Exercise 9.3).`,
    ];
  }
  if (lvl.kind === 'slab') {
    return [
      `The glass makes the pin look nearer by t(1 − 1/n) = ${lvl.t} × (1 − 1/${lvl.n}) = ${fmt(lvl.shift)} cm.`,
      'The shift depends only on the thickness and the index of the slab, not on where the slab sits between the camera and the pin, so sliding it changes nothing (Exercise 9.16).',
    ];
  }
  if (lvl.kind === 'cone') {
    return [
      `Light leaves only if it meets the surface at less than the critical angle: sin θc = 1/n = 1/${lvl.n}, so θc = ${fmt(criticalDeg(lvl.n))}°.`,
      `The circle has radius r = d tan θc = ${lvl.d} / √(${lvl.n}² − 1) = ${fmt(lvl.radius)} cm (Exercise 9.5).`,
    ];
  }
  const sinCrit = lvl.n2 / lvl.n1;
  return [
    `Inside the core the ray makes the angle (90° − r) with the wall, and total reflection needs sin(90° − r) ≥ n₂/n₁ = ${fmt(sinCrit)}, i.e. cos r ≥ ${fmt(sinCrit)}.`,
    lvl.maxDeg >= 90
      ? `With sin i = n₁ sin r, the largest sin i is √(n₁² − n₂²) = ${fmt(Math.sqrt(lvl.n1 * lvl.n1 - lvl.n2 * lvl.n2))}, which is more than 1: every angle up to 90° is guided (Exercise 9.17b).`
      : `With sin i = n₁ sin r, the largest angle is sin i = √(n₁² − n₂²) = ${fmt(Math.sqrt(lvl.n1 * lvl.n1 - lvl.n2 * lvl.n2))}, so i = ${fmt(lvl.maxDeg)}° (Exercise 9.17a).`,
  ];
}
