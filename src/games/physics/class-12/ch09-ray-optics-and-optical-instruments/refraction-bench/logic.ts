// Pure rules of the Refraction Arcade: no DOM, no canvas.
import { shuffle } from '@core/quiz';
import { fmt, within } from '@core/judge';

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

// ---- the physics ----------------------------------------------------------------------------------------------------------

/** Apparent depth of an object at real depth H under a surface of index n, seen from above. */
export const apparentDepth = (H: number, n: number) => H / n;
export const criticalDeg = (n: number) => asinD(1 / n);
/** The widest cone, in degrees, that a fibre with core n1 and cladding n2 accepts from air (90 when every angle is guided). */
export function acceptanceDeg(n1: number, n2: number): number {
  const s = Math.sqrt(Math.max(0, n1 * n1 - n2 * n2));
  return s >= 1 ? 90 : asinD(s);
}
/** Radius of the circle on the surface through which light from a source at depth d can leave. */
export const coneRadius = (d: number, n: number) => d / Math.sqrt(n * n - 1);
export const slabShift = (t: number, n: number) => t * (1 - 1 / n);
/** Angle of refraction (degrees) for a ray at `i` degrees going from index nA into nB. */
export const refractDeg = (nA: number, nB: number, i: number) => asinD((nA * sinD(i)) / nB);

// ---- the rounds -----------------------------------------------------------------------------------------------------------

export const PROBE_DEG = 60;
export interface SnellRound {
  nA: number;
  nB: number;
  /** The incidence in medium A that lands the ray on the detector. */
  iSol: number;
  /** Where the detector is, in degrees from the normal in medium B (exact, and as shown to 0.1°). */
  r: number;
  rShown: number;
  /** What a probe shot from air at PROBE_DEG does in each medium (to 0.1°); air itself is null. */
  probeA: number | null;
  probeB: number;
}
export interface DepthRound {
  H: number;
  n1: number;
  n2: number;
  /** How far the microscope must move, cm, positive up. */
  move: number;
  assist: 0 | 1 | 2;
}
export interface SlabRound {
  t: number;
  n: number;
  shift: number;
  /** Where the slab sits between the table (0) and the camera (1); it must not matter. */
  slabAt: number;
  assist: 0 | 1 | 2;
}
export interface ConeRound {
  d: number;
  n: number;
  radius: number;
  assist: 0 | 1 | 2;
}
export interface PipeRound {
  n1: number;
  n2: number;
  maxDeg: number;
  assist: 0 | 1 | 2;
}
export type Game =
  | { kind: 'snell'; hero: Hero; rounds: SnellRound[]; charges: number[] }
  | { kind: 'depth'; hero: Hero; rounds: DepthRound[]; charges: number[] }
  | { kind: 'slab'; hero: Hero; rounds: SlabRound[]; charges: number[] }
  | { kind: 'cone'; hero: Hero; rounds: ConeRound[]; charges: number[] }
  | { kind: 'pipe'; hero: Hero; rounds: PipeRound[]; charges: number[] };

/** [nA, nB, incidence in A] */
const SNELL_AIR: [number, number, number][] = [[1, 1.5, 40], [1, 1.6, 35]];
const SNELL_WATER: [number, number, number][] = [[1.33, 1.5, 45], [1.33, 1.6, 30], [1.33, 1.52, 50], [1.33, 1.7, 40], [1.36, 1.5, 35], [1.33, 1.65, 55]];
/** [real depth cm, first index, second index] */
const DEPTH: [number, number, number][] = [[12, 1.2, 1.5], [18, 1.5, 1.2], [20, 1.25, 1.6], [15, 1.25, 1.5], [24, 1.5, 1.2], [21, 1.4, 1.5], [24, 1.2, 1.6]];
/** [thickness cm, index] */
const SLAB: [number, number][] = [[15, 1.5], [12, 1.5], [9, 1.5], [20, 1.25], [16, 1.6], [12, 1.2], [18, 1.2], [21, 1.75]];
/** [depth cm, index] */
const CONE: [number, number][] = [[60, 1.25], [80, 1.33], [100, 1.5], [120, 1.33], [50, 1.6], [90, 1.25]];
/** [core, cladding] for rounds 1 and 2: every one of them clads the core, so the limit is below 90°. */
const PIPE: [number, number][] = [[1.68, 1.44], [1.5, 1.3], [1.6, 1.4], [1.5, 1.2], [1.45, 1.4]];
/**
 * [core, cladding] for round 3, the boss: wider limits than rounds 1 and 2, and one bare fibre (air outside, limit 90°, the end of
 * the dial). Only one row in six is bare, so the end of the dial is not the answer of the boss round in general.
 */
const PIPE_BOSS: [number, number][] = [[1.5, 1], [1.55, 1.25], [1.62, 1.3], [1.62, 1.28], [1.68, 1.4], [1.58, 1.24]];

export const SLIDER = {
  snell: { min: 1, max: 80, step: 1, start: 20 },
  depth: { min: -6, max: 6, step: 0.5, start: 0 },
  slab: { min: 0, max: 12, step: 0.5, start: 0 },
  pipe: { min: 0, max: 90, step: 1, start: 30 },
};
export const coneMax = (d: number) => Math.round(1.5 * d);
export const CONE_MIN = 5;
/** Level 4: where the disc starts in a pool of depth d. */
export const coneStart = (d: number) => Math.round(0.4 * d);

/** Where things sit on the canvas, shared by the scene and the tests. */
export const GEOM = {
  snell: { CX: 320, BY: 175, R: 140 },
  depth: { ex: 550, ey: 120 },
  slab: { table: 290, fx: 530, span: 120 },
  cone: { surface: 110, lampDrop: 150 },
};
/** Level 1, on a miss: the outgoing leg is drawn this many degrees past the detector (too much bend) or short of it (too little), whatever the player's angle. */
export const MISS_DEG = 12;
/** Level 1, on a miss: which side of the detector the ray was heading for. */
export const snellSide = (r: SnellRound, tried: number): 'over' | 'short' => (refractDeg(r.nA, r.nB, tried) > r.r ? 'over' : 'short');
/** Level 1: the angle in medium B at which the outgoing leg is drawn: the detector on a hit, a fixed offset beside it on a miss. */
export const snellLegDeg = (r: SnellRound, tried: number, ok: boolean) => (ok ? r.r : r.r + (snellSide(r, tried) === 'over' ? MISS_DEG : -MISS_DEG));

function snellRound([nA, nB, iSol]: [number, number, number]): SnellRound {
  const r = refractDeg(nA, nB, iSol);
  return {
    nA,
    nB,
    iSol,
    r,
    rShown: round1(r),
    probeA: nA === 1 ? null : round1(refractDeg(1, nA, PROBE_DEG)),
    probeB: round1(refractDeg(1, nB, PROBE_DEG)),
  };
}

export function buildGame(level: number, random: () => number): Game {
  const assist = (i: number) => i as 0 | 1 | 2;
  if (level === 1) {
    const air = shuffle(SNELL_AIR, random)[0];
    const [w1, w2] = shuffle(SNELL_WATER, random);
    return {
      kind: 'snell',
      hero: {
        name: 'Ray',
        role: 'a beam of light that must land on a detector',
        story: `Ray must cross from one transparent material into another and land on a detector in the second one. The materials are unknown: a probe shot from air at ${PROBE_DEG}° shows how strongly each one bends light.`,
        objective: 'Aim Ray, at the angle of incidence in the first material, so it lands on the detector in the second, in all three rounds.',
      },
      rounds: [snellRound(air), snellRound(w1), snellRound(w2)],
      charges: [2, 2, 2],
    };
  }
  if (level === 2) {
    const size = ([H, n1, n2]: [number, number, number]) => Math.abs(H / n1 - H / n2);
    const picks = shuffle(DEPTH, random).slice(0, 3).sort((x, y) => size(x) - size(y));
    return {
      kind: 'depth',
      hero: {
        name: 'Needle',
        role: 'lying at the bottom of a tank',
        story: 'A microscope is focused on Needle through a liquid. Then the liquid is swapped for one of a different refractive index, filled to the same height, and Needle seems to move.',
        objective: 'Slide the microscope until Needle is sharp again, in three tanks. The live eyepiece help goes off after the first tank.',
      },
      rounds: picks.map(([H, n1, n2], i) => ({ H, n1, n2, move: apparentDepth(H, n1) - apparentDepth(H, n2), assist: assist(i) })),
      charges: [0, 0, 0],
    };
  }
  if (level === 3) {
    const picks = shuffle(SLAB, random).slice(0, 3).sort((a, b) => slabShift(a[0], a[1]) - slabShift(b[0], b[1]));
    const spots = shuffle([0.25, 0.5, 0.75], random);
    return {
      kind: 'slab',
      hero: {
        name: 'Pin',
        role: 'on a table, seen from above by a camera',
        story: 'A camera looks straight down at Pin. A slab of glass is laid between them and Pin seems to jump upward, so the camera must refocus by exactly that much. The slab can be dragged anywhere between the camera and Pin.',
        objective: 'Raise the camera’s focus by exactly the amount Pin seems to rise. The live ghost of Pin goes off after the first slab.',
      },
      rounds: picks.map(([t, n], i) => ({ t, n, shift: slabShift(t, n), slabAt: spots[i], assist: assist(i) })),
      charges: [0, 0, 0],
    };
  }
  if (level === 4) {
    const picks = shuffle(CONE, random).slice(0, 3).sort((a, b) => a[0] - b[0]);
    return {
      kind: 'cone',
      hero: {
        name: 'Glow',
        role: 'a lamp at the bottom of a pool',
        story: 'Glow shines in every direction. Where light meets the surface at too steep an angle it cannot leave: it is totally internally reflected. Only a circle of the surface lets light out.',
        objective: 'Float a disc over Glow that blocks all the light that can escape, and no more. The live ray view goes off after the first pool.',
      },
      rounds: picks.map(([d, n], i) => ({ d, n, radius: coneRadius(d, n), assist: assist(i) })),
      charges: [0, 0, 0],
    };
  }
  const picks = shuffle(PIPE, random).slice(0, 2).sort((a, b) => acceptanceDeg(a[0], a[1]) - acceptanceDeg(b[0], b[1]));
  const boss = shuffle(PIPE_BOSS, random)[0];
  const rounds: PipeRound[] = [...picks, boss].map(([n1, n2], i) => ({ n1, n2, maxDeg: acceptanceDeg(n1, n2), assist: assist(i) }));
  return {
    kind: 'pipe',
    hero: {
      name: 'Pulse',
      role: 'a spark entering an optical fibre',
      story: 'Pulse reaches the far end only if it is totally internally reflected every time it meets the wall of the fibre. The wider the angle it enters at, the steeper it hits the wall.',
      objective: 'Aim Pulse at the widest angle from the axis that the fibre still guides. The last fibre may have no cladding at all.',
    },
    rounds,
    charges: [0, 0, 0],
  };
}

// ---- judging --------------------------------------------------------------------------------------------------------------

export function judgeSnell(r: SnellRound, i: number): { ok: boolean; r: number } {
  const got = refractDeg(r.nA, r.nB, i);
  return { ok: Math.abs(got - r.r) <= 0.3, r: got };
}
export function judgeDepth(r: DepthRound, up: number): { ok: boolean } {
  return { ok: Math.abs(up - r.move) <= 0.25 };
}
export function judgeSlab(r: SlabRound, raise: number): { ok: boolean } {
  return { ok: Math.abs(raise - r.shift) <= 0.25 };
}
export function judgeCone(r: ConeRound, radius: number): { ok: boolean } {
  return { ok: within(radius, r.radius, 0.02) };
}
/** A ray entering at `deg` stays trapped; a rounded entry up to 0.3° over the limit is forgiven. */
export const pipeGuided = (r: PipeRound, deg: number) => deg <= r.maxDeg + 0.3;
export function judgePipe(r: PipeRound, deg: number): { ok: boolean; guided: boolean } {
  const guided = pipeGuided(r, deg);
  return { ok: guided && deg <= 90 && r.maxDeg - deg < 1, guided };
}

/** A probe shot at PROBE_DEG from air, in words. */
export function probeText(which: 'A' | 'B', r: SnellRound): string {
  const v = which === 'A' ? r.probeA : r.probeB;
  return v === null ? 'Medium A is air: it does not bend a ray from air at all.' : `Probe from air at ${PROBE_DEG}° into medium ${which}: the ray bends to ${fmt(v)}° from the normal.`;
}

export function explainRound(g: Game, i: number): string[] {
  if (g.kind === 'snell') {
    const r = g.rounds[i];
    return [
      `Each probe gives an index: n = sin ${PROBE_DEG}° / sin(bent angle). So n(B) = ${fmt(r.nB)}${r.probeA === null ? ' and A is air, n = 1' : ` and n(A) = ${fmt(r.nA)}`}.`,
      `At the boundary n(A) sin i = n(B) sin r. For the detector at r = ${fmt(r.rShown)}°: sin i = ${fmt(r.nB)} × ${fmt(sinD(r.r))} / ${fmt(r.nA)}, so i = ${r.iSol}° (Exercise 9.4).`,
    ];
  }
  if (g.kind === 'depth') {
    const r = g.rounds[i];
    return [
      `Apparent depth = real depth / n: first ${r.H}/${r.n1} = ${fmt(apparentDepth(r.H, r.n1))} cm, then ${r.H}/${r.n2} = ${fmt(apparentDepth(r.H, r.n2))} cm.`,
      `Needle’s image ${r.move > 0 ? 'rises' : 'sinks'} by ${fmt(Math.abs(r.move))} cm, so the microscope moves ${r.move > 0 ? 'up' : 'down'} by ${fmt(Math.abs(r.move))} cm (Exercise 9.3).`,
    ];
  }
  if (g.kind === 'slab') {
    const r = g.rounds[i];
    return [
      `The glass makes the pin look nearer by t(1 − 1/n) = ${r.t} × (1 − 1/${r.n}) = ${fmt(r.shift)} cm.`,
      'It depends only on the thickness and the index of the slab, not on where the slab sits between the camera and the pin (Exercise 9.16).',
    ];
  }
  if (g.kind === 'cone') {
    const r = g.rounds[i];
    return [
      `Light leaves only inside the critical angle: sin θc = 1/n = 1/${r.n}, so θc = ${fmt(criticalDeg(r.n))}°.`,
      `The circle has radius r = d tan θc = ${r.d} / √(${r.n}² − 1) = ${fmt(r.radius)} cm (Exercise 9.5).`,
    ];
  }
  const r = g.rounds[i];
  return [
    `Inside the core the ray meets the wall at 90° − r and is trapped if cos r ≥ n₂/n₁ = ${fmt(r.n2 / r.n1)}. With sin i = n₁ sin r the limit is sin i = √(n₁² − n₂²) = ${fmt(Math.sqrt(r.n1 * r.n1 - r.n2 * r.n2))}.`,
    r.maxDeg >= 90 ? 'That is more than 1, so every angle up to 90° is guided: with no cladding the fibre accepts the whole half-space (Exercise 9.17b).' : `So i = ${fmt(r.maxDeg)}° is the widest guided angle (Exercise 9.17a).`,
  ];
}

export function resultLine(g: Game, i: number): string {
  if (g.kind === 'snell') return `Ray lands on the detector, ${fmt(g.rounds[i].rShown)}° from the normal in the second material.`;
  if (g.kind === 'depth') return `Needle is sharp: the microscope moved ${g.rounds[i].move > 0 ? 'up' : 'down'} ${fmt(Math.abs(g.rounds[i].move))} cm.`;
  if (g.kind === 'slab') return `Focused: Pin looks ${fmt(g.rounds[i].shift)} cm higher, wherever the slab sits.`;
  if (g.kind === 'cone') return `The disc blocks every ray that could leave: radius ${fmt(g.rounds[i].radius)} cm.`;
  return g.rounds[i].maxDeg >= 90 ? 'Pulse is guided at any angle: no cladding, no limit.' : `Pulse is carried to the far end at up to ${fmt(g.rounds[i].maxDeg)}°.`;
}

/**
 * Where the burst of points and the "−1 ♥" appear: the end of the drawn outgoing leg (level 1), a fixed point (level 2) or the
 * player's own setting (levels 3 and 4); never where the answer is. The fibre (level 5) puts it at the end of the player's own path.
 */
export function hitPoint(g: Game, i: number, tried: number, ok: boolean): [number, number] | null {
  const RAD = Math.PI / 180;
  if (g.kind === 'snell') {
    const { CX, BY, R } = GEOM.snell;
    const leg = snellLegDeg(g.rounds[i], tried, ok);
    return [CX + R * sinD(leg), BY + R * Math.cos(leg * RAD)];
  }
  if (g.kind === 'depth') return [GEOM.depth.ex, GEOM.depth.ey];
  if (g.kind === 'slab') return [GEOM.slab.fx, GEOM.slab.table - (tried * GEOM.slab.span) / g.rounds[i].t];
  if (g.kind === 'cone') return [320 + (tried * 150) / g.rounds[i].d, GEOM.cone.surface - 10];
  return null;
}

/** After a miss: the effect of what the player chose, never the right answer. */
export function missText(g: Game, i: number, tried: number): string {
  if (g.kind === 'snell') return snellSide(g.rounds[i], tried) === 'over' ? 'Ray overshoots the detector: it lands farther from the normal than the detector does.' : 'Ray falls short of the detector: it lands nearer the normal than the detector does.';
  if (g.kind === 'depth') return 'Needle is still blurred in the eyepiece.';
  if (g.kind === 'slab') return 'The camera is out of focus: Pin appears at a different height.';
  if (g.kind === 'cone') return tried < g.rounds[i].radius ? 'Light still escapes round the edge of the disc.' : 'The disc blocks all the light, but it is wider than it needs to be: part of it covers surface where no light could leave anyway.';
  return pipeGuided(g.rounds[i], tried) ? 'Pulse is carried to the far end, but the fibre would still have guided a wider beam.' : 'At that angle Pulse leaks out through the wall at the first bounce and never reaches the end.';
}
