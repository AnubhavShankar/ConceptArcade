// Pure rules of the Net-Force Workshop: no DOM, no canvas. Charges are in µC, lengths in cm, forces in N.
//   F = k |q1 q2| / r²  with k = 9 × 10⁹  becomes  F = 90 |q1 q2| / r²  in these units.
import { pick } from '@core/quiz';

export const forceN = (q1: number, q2: number, rCm: number) => (90 * Math.abs(q1 * q2)) / (rCm * rCm);

export interface Pt {
  x: number;
  y: number;
}
export interface Charge {
  name: string;
  q: number;
  at: Pt;
}

/** Force (N) on `target` from `source`. Like charges push the target away from the source, unlike ones pull it in. */
export function forceOn(target: Charge, source: Charge): Pt {
  const dx = target.at.x - source.at.x;
  const dy = target.at.y - source.at.y;
  const r = Math.hypot(dx, dy);
  const f = (90 * target.q * source.q) / (r * r); // positive: repulsion
  return { x: (f * dx) / r, y: (f * dy) / r };
}
/** Superposition: the vector sum of the force from each other charge, taken one at a time. */
export function netForceOn(target: Charge, others: Charge[]): Pt {
  return others.reduce((s, o) => {
    const f = forceOn(target, o);
    return { x: s.x + f.x, y: s.y + f.y };
  }, { x: 0, y: 0 });
}
export const magnitude = (v: Pt) => Math.hypot(v.x, v.y);

/** "up and to the right", from a vector (y up). */
export function describeDirection(v: Pt): string {
  const a = (Math.atan2(v.y, v.x) * 180) / Math.PI; // -180..180, 0 = right
  const names = ['to the right', 'up and to the right', 'up', 'up and to the left', 'to the left', 'down and to the left', 'down', 'down and to the right'];
  return names[Math.round((a < 0 ? a + 360 : a) / 45) % 8];
}

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
/** 3 significant figures, in scientific notation when very large or small. */
export function fmt(x: number): string {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e4 || a < 1e-2)) {
    const [m, e] = x.toExponential(2).split('e');
    return `${Number(m)} × 10${[...String(Number(e))].map((c) => SUP['0123456789-'.indexOf(c)]).join('')}`;
  }
  return String(Number(x.toPrecision(3)));
}
export const signed = (q: number) => `${q < 0 ? '−' : '+'}${Math.abs(q)} µC`;

// ---- levels ------------------------------------------------------------------------------------

/** Changes made to a pair of charges in level 2. */
export type OpId = 'q1x2' | 'q2x2' | 'q2x3' | 'rHalf' | 'rDouble' | 'touchA' | 'touchBoth' | 'flipB';
export const OPS: Record<OpId, string> = {
  q1x2: 'Charge A is doubled.',
  q2x2: 'Charge B is doubled.',
  q2x3: 'Charge B is tripled.',
  rHalf: 'The gap is halved.',
  rDouble: 'The gap is doubled.',
  touchA: 'Sphere A is touched by an identical, uncharged sphere, which is then removed.',
  touchBoth: 'Spheres A and B are each touched by an identical, uncharged sphere, which is then removed.',
  flipB: 'Charge B is replaced by the same amount of opposite charge.',
};
export interface Pair {
  q1: number;
  q2: number;
  r: number;
}
export function applyOp(p: Pair, op: OpId): Pair {
  switch (op) {
    case 'q1x2': return { ...p, q1: p.q1 * 2 };
    case 'q2x2': return { ...p, q2: p.q2 * 2 };
    case 'q2x3': return { ...p, q2: p.q2 * 3 };
    case 'rHalf': return { ...p, r: p.r / 2 };
    case 'rDouble': return { ...p, r: p.r * 2 };
    case 'touchA': return { ...p, q1: p.q1 / 2 }; // identical spheres share charge equally on contact
    case 'touchBoth': return { ...p, q1: p.q1 / 2, q2: p.q2 / 2 };
    case 'flipB': return { ...p, q2: -p.q2 };
  }
}
export const applyOps = (p: Pair, ops: OpId[]) => ops.reduce(applyOp, p);
/** New force divided by the old one. */
export const forceFactor = (before: Pair, after: Pair) => forceN(after.q1, after.q2, after.r) / forceN(before.q1, before.q2, before.r);
export const attracts = (p: Pair) => p.q1 * p.q2 < 0;

export type Shape = 'square' | 'triangle';
export interface Level1 {
  kind: 'gap';
  story: string;
  q1: number;
  q2: number;
  /** The reading the force scale must show (N) and the separation that gives it (cm). */
  target: number;
  rAnswer: number;
  tol: number;
  freeTests: number;
}
export interface Level2 {
  kind: 'rescale';
  story: string;
  before: Pair;
  f0: number;
  ops: OpId[];
  after: Pair;
  factor: number;
  tol: number;
  freeTests: number;
}
export interface Level3 {
  kind: 'null';
  story: string;
  shape: Shape;
  /** Distance from the probe to each corner (cm). */
  radius: number;
  probe: Charge;
  /** The corners in order. `q` is the given charge, or null where the student chooses it. */
  corners: { name: string; q: number | null; at: Pt }[];
  /** The charges that make the net force on the probe zero, one per adjustable corner, in order. */
  answers: number[];
  tol: number;
  freeTests: number;
}
export interface Level4 {
  kind: 'rest';
  story: string;
  a: Charge;
  b: Charge;
  probe: number; // the probe's charge, µC
  /** Where the net force on the probe is zero: the signed position (cm) along the line, A at 0. */
  xEq: number;
  region: Region;
  tol: number;
  freeTests: number;
}
export interface Level5 {
  kind: 'allrest';
  story: string;
  a: Charge;
  b: Charge;
  xAnswer: number;
  qAnswer: number;
  tol: number;
  freeTests: number;
}
export type Level = Level1 | Level2 | Level3 | Level4 | Level5;
export type Region = 'left' | 'between' | 'right';

/** Where a probe feels no net force from two fixed charges on a line (A at x = 0, B at x = d). Null if none exists. */
export function equilibrium(qA: number, qB: number, d: number): { x: number; region: Region } | null {
  const sa = Math.sqrt(Math.abs(qA));
  const sb = Math.sqrt(Math.abs(qB));
  if (qA * qB > 0) return { x: (d * sa) / (sa + sb), region: 'between' };
  if (sa === sb) return null; // equal and opposite: the forces never cancel on the line
  return sa < sb ? { x: -(d * sa) / (sb - sa), region: 'left' } : { x: d + (d * sb) / (sa - sb), region: 'right' };
}

const squares: [number, number][] = [[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [1, 4], [4, 1]];

export function buildLevel(level: number, random: () => number): Level {
  const sign = () => (random() < 0.5 ? -1 : 1);
  const mags = [2, 3, 4, 5, 6];
  if (level === 1) {
    const q1 = sign() * pick(mags, random);
    const q2 = sign() * pick(mags, random);
    const rAnswer = pick([4, 5, 6, 8, 10, 12, 15, 20], random);
    return {
      kind: 'gap',
      story: 'A force scale is clipped to charge A, and charge B slides along a rail towards it. The scale must read the target value exactly. Work out how far apart the charges must be, set the gap, and test it. Before each test, say what you expect the two charges to do.',
      q1,
      q2,
      rAnswer,
      target: forceN(q1, q2, rAnswer),
      tol: 0.03,
      freeTests: 1,
    };
  }
  if (level === 2) {
    const combos: OpId[][] = [['q1x2', 'rHalf'], ['q2x3', 'rDouble'], ['touchA', 'rHalf'], ['touchBoth', 'rHalf'], ['q1x2', 'q2x3'], ['touchA', 'q2x3'], ['rDouble', 'touchBoth'], ['flipB', 'rHalf'], ['q1x2', 'flipB'], ['q1x2', 'q2x2', 'rHalf']];
    const ops = pick(combos, random);
    const before: Pair = { q1: sign() * pick([2, 4, 6], random), q2: sign() * pick([2, 4, 6], random), r: pick([5, 6, 8, 10, 12, 15, 20], random) };
    const after = applyOps(before, ops);
    return {
      kind: 'rescale',
      story: 'The bench has just measured the force between two charged spheres. Now the experiment is changed in the steps listed. Predict the new reading as a multiple of the old one, and say whether the spheres will attract or repel, without recalculating from scratch. Then run it.',
      before,
      f0: forceN(before.q1, before.q2, before.r),
      ops,
      after,
      factor: forceFactor(before, after),
      tol: 0.02,
      freeTests: 0,
    };
  }
  if (level === 3) {
    const shape: Shape = random() < 0.5 ? 'square' : 'triangle';
    const probe: Charge = { name: 'probe', q: 1, at: { x: 0, y: 0 } };
    const a = sign() * pick(mags, random);
    let b = sign() * pick(mags, random);
    if (b === a) b = -b;
    if (shape === 'square') {
      const side = pick([10, 12, 14, 16, 20], random);
      const h = side / 2;
      return {
        kind: 'null',
        story: 'A probe charge sits at the centre of a square. Charges A and B are fixed at two corners. Choose the charges at C and D so that the probe feels no net force. The probe is not pushed away or pulled in if you get it right.',
        shape,
        radius: Math.hypot(h, h),
        probe,
        corners: [
          { name: 'A', q: a, at: { x: -h, y: h } },
          { name: 'B', q: b, at: { x: h, y: h } },
          { name: 'C', q: null, at: { x: h, y: -h } },
          { name: 'D', q: null, at: { x: -h, y: -h } },
        ],
        answers: [a, b],
        tol: 0.02,
        freeTests: 1,
      };
    }
    const side = pick([10, 12, 15, 18], random);
    const R = side / Math.sqrt(3);
    const at = (deg: number): Pt => ({ x: R * Math.cos((deg * Math.PI) / 180), y: R * Math.sin((deg * Math.PI) / 180) });
    return {
      kind: 'null',
      story: 'A probe charge sits at the centre of an equilateral triangle of charges. Charge A is fixed. Choose the charges at B and C so that the probe feels no net force.',
      shape,
      radius: R,
      probe,
      corners: [
        { name: 'A', q: a, at: at(90) },
        { name: 'B', q: null, at: at(-30) },
        { name: 'C', q: null, at: at(210) },
      ],
      answers: [a, a],
      tol: 0.02,
      freeTests: 1,
    };
  }
  const [sA, sB] = pick(squares, random);
  if (level === 4) {
    const m = pick([1, 2, 3], random);
    const s = sign();
    const like = random() < 0.5;
    const d = pick([12, 24, 30, 60], random);
    const qA = s * sA * sA * m;
    const qB = (like ? s : -s) * sB * sB * m;
    let eq = equilibrium(qA, qB, d);
    // equal and opposite magnitudes have no balance point; the table never produces them, but be safe
    if (!eq) eq = { x: d / 2, region: 'between' };
    return {
      kind: 'rest',
      story: 'Charges A and B are fixed on a line. A small probe charge will be released at a place of your choosing. Find the one point on the line where the probe feels no net force, say which region it lies in, and give its distance from A. A probe left anywhere else slides away.',
      a: { name: 'A', q: qA, at: { x: 0, y: 0 } },
      b: { name: 'B', q: qB, at: { x: d, y: 0 } },
      probe: 1,
      xEq: eq.x,
      region: eq.region,
      tol: 0.03,
      freeTests: 1,
    };
  }
  // level 5: a third charge that makes ALL THREE rest. A and B share a sign, so the third sits between them with the opposite sign.
  const [tA, tB] = pick([[1, 2], [2, 1], [1, 3], [3, 1]], random);
  const m = (tA + tB) ** 2;
  const s = sign();
  const d = pick([12, 24, 36, 60], random);
  return {
    kind: 'allrest',
    story: 'Two like charges, A and B, are held on a line. Place a third charge between them and choose its charge so that all three charges, the two held ones as well as the new one, feel no net force. Give its distance from A and its signed charge.',
    a: { name: 'A', q: s * tA * tA * m, at: { x: 0, y: 0 } },
    b: { name: 'B', q: s * tB * tB * m, at: { x: d, y: 0 } },
    xAnswer: (d * tA) / (tA + tB),
    qAnswer: -s * tA * tA * tB * tB,
    tol: 0.03,
    freeTests: 1,
  };
}

// ---- judging ------------------------------------------------------------------------------------

export interface GapResult {
  ok: boolean;
  reading: number;
  verdict: 'on-target' | 'too-strong' | 'too-weak';
}
export function judgeGap(lvl: Level1, r: number): GapResult {
  const reading = forceN(lvl.q1, lvl.q2, r);
  const off = (reading - lvl.target) / lvl.target;
  const ok = Math.abs(off) <= lvl.tol;
  return { ok, reading, verdict: ok ? 'on-target' : off > 0 ? 'too-strong' : 'too-weak' };
}
/** What the pair of charges will do: attract or repel. */
export const pairBehaviour = (q1: number, q2: number): 'attract' | 'repel' => (q1 * q2 < 0 ? 'attract' : 'repel');

export interface RescaleResult {
  ok: boolean;
  factorOk: boolean;
  directionOk: boolean;
  /** Is the true factor above or below the guess? (used for a nudge that does not give the number away) */
  trueIs: 'higher' | 'lower' | 'equal';
}
export function judgeRescale(lvl: Level2, factor: number, attractGuess: boolean): RescaleResult {
  const factorOk = Math.abs(factor - lvl.factor) / lvl.factor <= lvl.tol;
  const directionOk = attractGuess === attracts(lvl.after);
  return { ok: factorOk && directionOk, factorOk, directionOk, trueIs: factorOk ? 'equal' : lvl.factor > factor ? 'higher' : 'lower' };
}

/** All charges of a level 3 board, with the student's choices filled in. */
export function nullCorners(lvl: Level3, chosen: number[]): Charge[] {
  let i = 0;
  return lvl.corners.map((c) => ({ name: c.name, q: c.q ?? chosen[i++], at: c.at }));
}
export interface NullResult {
  ok: boolean;
  net: Pt;
  /** Net force as a fraction of the biggest single force, so a small leftover from a near miss is forgiven. */
  residual: number;
}
export function judgeNull(lvl: Level3, chosen: number[]): NullResult {
  const corners = nullCorners(lvl, chosen);
  const net = netForceOn(lvl.probe, corners);
  const biggest = Math.max(...corners.map((c) => magnitude(forceOn(lvl.probe, c))));
  const residual = magnitude(net) / biggest;
  return { ok: residual <= lvl.tol, net, residual };
}

export interface RestResult {
  ok: boolean;
  regionOk: boolean;
  /** The net force on the probe where the student put it: its sign tells which way it slides (+ is towards B). */
  net: Pt;
  x: number;
}
export function judgeRest(lvl: Level4, region: Region, distance: number): RestResult {
  const x = region === 'left' ? -distance : distance;
  const probe: Charge = { name: 'probe', q: lvl.probe, at: { x, y: 0 } };
  const atCharge = Math.abs(x) < 1e-9 || Math.abs(x - lvl.b.at.x) < 1e-9;
  const net = atCharge ? { x: 0, y: 0 } : netForceOn(probe, [lvl.a, lvl.b]);
  const regionOk = region === lvl.region;
  const close = Math.abs(x - lvl.xEq) <= lvl.tol * Math.abs(lvl.xEq) + 0.01;
  return { ok: regionOk && close, regionOk, net, x };
}

export interface AllRestResult {
  ok: boolean;
  /** Net force on each of the three charges (A, B, the new one). */
  nets: Pt[];
  worst: number;
  charges: Charge[];
}
export function judgeAllRest(lvl: Level5, x: number, q3: number): AllRestResult {
  const third: Charge = { name: 'C', q: q3, at: { x, y: 0 } };
  const charges = [lvl.a, lvl.b, third];
  const nets = charges.map((c, i) => netForceOn(c, charges.filter((_, j) => j !== i)));
  const ref = Math.max(forceN(lvl.a.q, lvl.b.q, lvl.b.at.x), forceN(lvl.a.q, q3, Math.max(x, 0.01)), forceN(lvl.b.q, q3, Math.max(lvl.b.at.x - x, 0.01)));
  const worst = Math.max(...nets.map(magnitude)) / ref;
  return { ok: worst <= lvl.tol, nets, worst, charges };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

// ---- what is shown after a win ---------------------------------------------------------------------

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'gap') {
    return [
      `F = k q₁ q₂ / r², so r = √(k q₁ q₂ / F).`,
      `With q₁ = ${Math.abs(lvl.q1)} µC, q₂ = ${Math.abs(lvl.q2)} µC and F = ${fmt(lvl.target)} N: r = √(9 × 10⁹ × ${Math.abs(lvl.q1)} × 10⁻⁶ × ${Math.abs(lvl.q2)} × 10⁻⁶ / ${fmt(lvl.target)}) = ${lvl.rAnswer / 100} m = ${lvl.rAnswer} cm.`,
      `The charges ${pairBehaviour(lvl.q1, lvl.q2)}${lvl.q1 * lvl.q2 < 0 ? ' (unlike signs)' : ' (like signs)'}. The force on B is equal in size and opposite in direction to the force on A: Newton's third law holds for Coulomb forces.`,
    ];
  }
  if (lvl.kind === 'rescale') {
    const steps = lvl.ops.map((op) => `${OPS[op]}`);
    return [
      'F depends on q₁ q₂ / r². Multiply the change in each part:',
      ...steps,
      `Together: the new force is ${fmt(lvl.factor)} times the old one, ${fmt(lvl.f0)} N × ${fmt(lvl.factor)} = ${fmt(lvl.f0 * lvl.factor)} N, and the spheres ${attracts(lvl.after) ? 'attract' : 'repel'}.`,
      lvl.ops.includes('touchBoth') && lvl.ops.includes('rHalf') ? 'Each sphere kept half its charge and the gap halved, so the force is unchanged: the halves of both charges cancel the effect of the halved gap.' : 'Identical spheres share charge equally on contact, so a touch halves the charge.',
    ];
  }
  if (lvl.kind === 'null') {
    const shown = lvl.shape === 'square' ? 'Each charge pushes or pulls the probe along the line from its corner through the centre. Opposite corners are the same distance from the probe, so their forces lie on the same line: they cancel exactly when the two charges are equal.' : 'The three corners are the same distance from the centre, with their forces 120° apart. Three equal-size forces 120° apart add to zero, so all three charges must be equal.';
    return [shown, `So the charges are ${lvl.corners.filter((c) => c.q === null).map((c, i) => `${c.name} = ${signed(lvl.answers[i])}`).join(' and ')}.`, 'Add the force from each corner, one at a time, as vectors: this is the principle of superposition.'];
  }
  if (lvl.kind === 'rest') {
    const sa = Math.sqrt(Math.abs(lvl.a.q));
    const sb = Math.sqrt(Math.abs(lvl.b.q));
    const where = lvl.region === 'between' ? 'Like charges push the probe in opposite directions between them, so the forces can cancel there.' : `Unlike charges pull the probe the same way between them, so the forces cannot cancel there. Outside, the weaker charge must be the closer one, so the point is on the ${lvl.region === 'left' ? 'A' : 'B'} side.`;
    return [where, 'At the balance point the two forces are equal: k |qA| q / rA² = k |qB| q / rB², so rA : rB = √|qA| : √|qB|, where rA and rB are the probe’s distances from A and from B.', `Here √|qA| : √|qB| = ${fmt(sa)} : ${fmt(sb)}, which puts the probe ${fmt(Math.abs(lvl.xEq))} cm ${lvl.region === 'left' ? 'to the left of A' : lvl.region === 'right' ? 'from A, beyond B' : 'from A, between the charges'}.`];
  }
  return [
    'The third charge must rest, so it sits where the forces from A and B cancel: x = d √|qA| / (√|qA| + √|qB|).',
    `That gives x = ${fmt(lvl.xAnswer)} cm from A.`,
    'A must also rest. B pushes A away from B, so the third charge must pull A towards itself: its sign is opposite to A and B. Balancing the forces on A: k qA qB / d² = k qA |q| / x², so |q| = qB x² / d².',
    `So the third charge is ${signed(lvl.qAnswer)}, the same as q = −qA qB / (√qA + √qB)² = ${fmt(lvl.qAnswer)} µC. The forces on B balance for the same reason.`,
  ];
}
