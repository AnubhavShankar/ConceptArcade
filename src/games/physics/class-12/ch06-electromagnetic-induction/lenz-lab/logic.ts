// Rules for "Night Shift at Magnet Park" (Lenz's law). Pure functions: the pools, the physics of each ride, the judging, the timing and every piece of text.
// Level 1 (Ring Rocket): pole, move and ring decide what the ring does. Level 2 (The Light Tunnel): three field switches. Level 3 (The Brake Run): a brake resistance.
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export type Glow = 'green' | 'red'; // green ↺ anticlockwise, red ↻ clockwise (seen from above in level 1, as you look at the sign in level 2)
export type Go = 'launch' | 'clamp';
export type Ev = 'enter' | 'leave' | 'squeeze' | 'stretch' | 'rise' | 'fade';
export const CHANGE: Record<Ev, 1 | -1> = { enter: 1, leave: -1, squeeze: -1, stretch: 1, rise: 1, fade: -1 };
/** Level 3: the car's pace on screen, fixed for each outcome and never proportional to the player's steady speed. */
export const PACE = { slow: 0.55, win: 1, fast: 1.45 } as const;

export interface RocketRow { magnet: 'below' | 'above'; go: Go; glow: Glow } // answer: pole (1 = N faces the ring), move (1 toward, -1 away), ring 1
export interface TunnelRow { ev: [Ev, Ev, Ev]; cue: [Glow, Glow, Glow] } // answer: z0, z1, z2 (1 = field into the page)
export interface BrakeRow { b: number; l: number; f: number; v: number; r: number } // B in T, bar l in m, pull f in N, safe speed v in m/s; answer r in mΩ

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'rocket'; assist: Assist } & RocketRow)
  | ({ kind: 'tunnel'; assist: Assist } & TunnelRow)
  | ({ kind: 'brake'; assist: Assist } & BrakeRow);

// ---- the pools (every row was checked by script) -----------------------------------------------------------------------------------------------------------

export const ROCKET: RocketRow[][] = [
  [{ magnet: 'below', go: 'launch', glow: 'red' }, { magnet: 'below', go: 'launch', glow: 'green' }],
  [{ magnet: 'below', go: 'clamp', glow: 'green' }, { magnet: 'below', go: 'clamp', glow: 'red' }],
  [
    { magnet: 'above', go: 'launch', glow: 'red' }, { magnet: 'above', go: 'launch', glow: 'green' },
    { magnet: 'above', go: 'clamp', glow: 'green' }, { magnet: 'above', go: 'clamp', glow: 'red' },
  ],
];

export const TUNNEL: TunnelRow[][] = [
  [
    { ev: ['enter', 'leave', 'rise'], cue: ['green', 'green', 'red'] },
    { ev: ['leave', 'fade', 'enter'], cue: ['green', 'red', 'red'] },
    { ev: ['rise', 'fade', 'leave'], cue: ['red', 'green', 'red'] },
  ],
  [
    { ev: ['stretch', 'squeeze', 'enter'], cue: ['green', 'red', 'red'] },
    { ev: ['squeeze', 'leave', 'stretch'], cue: ['green', 'red', 'green'] },
    { ev: ['leave', 'stretch', 'squeeze'], cue: ['red', 'green', 'green'] },
  ],
  [
    { ev: ['stretch', 'fade', 'leave'], cue: ['green', 'green', 'red'] },
    { ev: ['fade', 'rise', 'stretch'], cue: ['red', 'red', 'green'] },
    { ev: ['rise', 'squeeze', 'leave'], cue: ['red', 'green', 'green'] },
  ],
];

export const BRAKE: BrakeRow[][] = [
  [{ b: 1, l: 0.5, f: 250, v: 4, r: 4 }, { b: 1, l: 0.5, f: 250, v: 5, r: 5 }, { b: 1, l: 0.6, f: 300, v: 5, r: 6 }],
  [{ b: 2, l: 0.5, f: 500, v: 4, r: 8 }, { b: 0.8, l: 1, f: 320, v: 5, r: 10 }, { b: 1.5, l: 0.8, f: 480, v: 4, r: 12 }],
  [{ b: 1.2, l: 0.5, f: 360, v: 7, r: 7 }, { b: 1.5, l: 0.6, f: 450, v: 5, r: 9 }, { b: 1, l: 1.5, f: 600, v: 4, r: 15 }],
];

// ---- the physics, the rounds and the judging ---------------------------------------------------------------------------------------------------------------

export const DIAL = {
  pole: { min: 0, max: 1, start: 1 }, // L1: 1 = N faces the ring, 0 = S
  move: { min: -1, max: 1, start: 0 }, // L1: 1 toward the ring, 0 hold, -1 away
  ring: { min: 0, max: 1, start: 1 }, // L1: 1 closed, 0 split
  z: { min: 0, max: 1, start: 1 }, // L2, each of z0, z1, z2: 1 = field into the page ⊗, 0 = out ⊙
  r: { min: 1, max: 25, start: 1 }, // L3, mΩ, step 1
};

export type Outcome = 'hold' | 'split' | `${Go}-${Glow}`;

/** Level 1: the direction the field through the ring points and the direction of the induced field, for a pole and a move (seen from above). */
export function rocketField(r: RocketRow, pole: number, move: number): { fieldUp: boolean; inducedUp: boolean } {
  const below = r.magnet === 'below';
  const fieldUp = below === (pole === 1); // N under the ring or S over it: the field through the ring points up
  const inducedUp = move === 1 ? !fieldUp : fieldUp; // against a rise, along a fall
  return { fieldUp, inducedUp };
}

/** Level 1: what the ring does. The magnet's near pole points along the field: N sends field lines away from its face. */
export function rocket(r: RocketRow, pole: number, move: number, ring: number): Outcome {
  if (move === 0) return 'hold';
  if (ring === 0) return 'split';
  const below = r.magnet === 'below';
  const { inducedUp } = rocketField(r, pole, move);
  const glow: Glow = inducedUp ? 'green' : 'red'; // anticlockwise seen from above makes a field pointing up
  const go: Go = (move === 1) === below ? 'launch' : 'clamp'; // toward repels; repelled from below flies up, from above is pushed down
  return `${go}-${glow}`;
}
/** Level 2: the colour sign i flashes for the field direction into (1) or out of (0) the page. */
export const tunnelGlow = (ev: Ev, into: number): Glow => ((CHANGE[ev] === 1) === (into === 1) ? 'green' : 'red');
/** Level 3: the steady speed in m/s for a brake bank of R mΩ. */
export const steady = (r: BrakeRow, R: number) => (r.f * (R / 1000)) / (r.b ** 2 * r.l ** 2);
export const brakeI = (r: BrakeRow, R: number) => (r.b * r.l * steady(r, R)) / (R / 1000); // A

export function rocketAnswer(r: RocketRow): { pole: number; move: number; ring: number } {
  for (const pole of [0, 1]) for (const move of [-1, 1]) if (rocket(r, pole, move, 1) === `${r.go}-${r.glow}`) return { pole, move, ring: 1 };
  throw new Error('no answer');
}
export const tunnelAnswer = (r: TunnelRow) => r.ev.map((e, i) => ((CHANGE[e] === 1) === (r.cue[i] === 'green') ? 1 : 0));

const same1 = (a: RocketRow, b: RocketRow) => {
  const x = rocketAnswer(a);
  const y = rocketAnswer(b);
  return x.pole === y.pole && x.move === y.move;
};
export function buildRounds(level: 1 | 2 | 3, random: () => number): Round[] {
  if (level === 1) {
    const r1 = pick(ROCKET[0], random);
    const r2 = pick(ROCKET[1], random);
    const r3 = pick(ROCKET[2].filter((x) => !same1(x, r1) && !same1(x, r2)), random);
    return [r1, r2, r3].map((row, k) => ({ ...row, kind: 'rocket', assist: aid(k) }) as Round);
  }
  const pools = (level === 2 ? TUNNEL : BRAKE) as unknown[][];
  const kind = level === 2 ? 'tunnel' : 'brake';
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

export type Values = { pole?: number; move?: number; ring?: number; z0?: number; z1?: number; z2?: number; r?: number };
export type Fault = 'hold' | 'split' | 'move' | 'colour' | 'both' | 'cue' | 'slow' | 'fast';

export function fault(r: Round, x: Values): Fault | null {
  switch (r.kind) {
    case 'rocket': {
      const o = rocket(r, x.pole!, x.move!, x.ring!);
      if (o === 'hold' || o === 'split') return o;
      const [go, glow] = o.split('-');
      if (go === r.go && glow === r.glow) return null;
      return go !== r.go && glow !== r.glow ? 'both' : go !== r.go ? 'move' : 'colour';
    }
    case 'tunnel': return firstWrong(r, x) < 0 ? null : 'cue';
    case 'brake': return x.r === r.r ? null : x.r! < r.r ? 'slow' : 'fast';
  }
}
/** Level 2: the index of the first sign that flashes the wrong colour, or -1. */
export function firstWrong(r: TunnelRow, x: Values): number {
  const z = [x.z0!, x.z1!, x.z2!];
  return r.ev.findIndex((e, i) => tunnelGlow(e, z[i]) !== r.cue[i]);
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;

/** Seconds into the ride at which the verdict lands. */
export function verdictDelay(r: Round, x: Values): number {
  if (r.kind === 'rocket') return 0.65;
  if (r.kind === 'tunnel') {
    const i = firstWrong(r, x);
    return i < 0 ? 2.05 : 0.55 + 0.6 * i;
  }
  const f = fault(r, x);
  return f === 'fast' ? 1.5 : f === 'slow' ? 1.9 : 1.8;
}

/** Level 3: where the car ends (s = 1 is the STOP line, 1.18 the buffer) and when it gets there, by outcome. Fixed for each outcome. */
export const RUN = { win: { end: 1, dur: 1.7 }, fast: { end: 1.18, dur: 1.4 }, slow: { end: 0.82, dur: 1.8 } } as const;

// ---- words -------------------------------------------------------------------------------------------------------------------------------------------------

export const poleText = (p: number | undefined) => (p ? 'N' : 'S');
export const glowText = (g: Glow) => (g === 'green' ? 'green ↺' : 'red ↻');
export const cueText = (row: RocketRow) => `${row.go === 'launch' ? 'LAUNCH' : 'PULL DOWN'} · ${row.glow === 'green' ? 'GREEN ↺' : 'RED ↻'}`;
export const EV_TEXT: Record<Ev, string> = {
  enter: 'was driven into its field',
  leave: 'was driven out of its field',
  squeeze: 'was squeezed flat',
  stretch: 'sprang open into a circle',
  rise: 'had its field switched on',
  fade: 'had its field fade away',
};
export const LCD_OFF = '— — —';

/** The round's goal, one line on the canvas. */
export function goalLine(r: Round): string {
  if (r.kind === 'rocket') {
    return `${r.go === 'launch' ? 'Launch the ring with its' : 'Pull the ring down with its'} ${r.glow === 'green' ? 'green ↺' : 'red ↻'} lights`;
  }
  if (r.kind === 'tunnel') return `Flash the cues: ${r.cue.map((c) => (c === 'green' ? 'GREEN ↺' : 'RED ↻')).join(' · ')}`;
  return `Safe speed: ${r.v} m/s`;
}

export function intel(r: Round): string {
  if (r.kind === 'rocket') {
    return `The magnet waits ${r.magnet === 'below' ? 'in the pit under' : 'on the crane over'} the ring. Show cue: ${cueText(r)}. The lights are read from above: green ↺ anticlockwise, red ↻ clockwise.`;
  }
  if (r.kind === 'tunnel') {
    return `Three signs, three cues in order. Sign 1 ${EV_TEXT[r.ev[0]]}, sign 2 ${EV_TEXT[r.ev[1]]}, sign 3 ${EV_TEXT[r.ev[2]]}. Lights: green ↺ anticlockwise, red ↻ clockwise, as you look at the page.`;
  }
  return `Brake run: magnets of ${r.b} T across a copper bar ${r.l} m long, joined through the brake bank. Down the slope the car is pulled with ${r.f} N. It must reach the station at ${r.v} m/s.`;
}

export function hintText(r: Round): string {
  const run = r.kind === 'brake';
  const tail = r.assist === 0 ? `${run ? 'Run' : 'Show'} 1: the ${run ? 'brake' : 'flux'} meter is live.` : r.assist === 1 ? 'The meter is off: a check costs a charge.' : `Final ${run ? 'run' : 'show'}: no meter.`;
  return `${intel(r)} ${tail}`;
}

/** What the player's setting did. Never the answer. */
export function missText(r: Round, x: Values): string {
  if (r.kind === 'rocket') {
    const o = rocket(r, x.pole!, x.move!, x.ring!);
    if (o === 'hold') return 'The magnet held still, so the flux through the ring did not change: no current flowed, the ring stayed put and its lights stayed dark, however strong the magnet.';
    if (o === 'split') return 'The magnet moved, but the ring was split: an emf appeared across the gap, yet with no closed path no current flowed, so the ring stayed put and its lights stayed dark.';
    const [go, glow] = o.split('-') as [Go, Glow];
    const toward = x.move === 1;
    return `With ${poleText(x.pole)} facing the ring and the magnet moving ${toward ? 'toward' : 'away from'} it, the flux through the ring ${toward ? 'rose' : 'fell'}, and the ring’s current ${toward ? 'opposed the rise' : 'propped the flux up'}: it ${go === 'launch' ? 'shot up the tower' : 'was pulled down onto its seat'} with its ${glowText(glow)} lights on. The cue was ${cueText(r)}.`;
  }
  if (r.kind === 'tunnel') {
    const i = firstWrong(r, x);
    const z = [x.z0!, x.z1!, x.z2!][i];
    const g = tunnelGlow(r.ev[i], z);
    return `Sign ${i + 1} ${EV_TEXT[r.ev[i]]} with its field ${z ? 'into' : 'out of'} the page: its flux ${CHANGE[r.ev[i]] === 1 ? 'rose' : 'fell'}, so its current flowed ${g === 'green' ? 'anticlockwise' : 'clockwise'} and it flashed ${glowText(g)}, but cue ${i + 1} was ${glowText(r.cue[i])}. The show stopped there.`;
  }
  if (x.r! > r.r) return `With ${x.r} mΩ in the brake bank the current was too weak: the car only steadied at a speed above the safe one and slammed into the buffer. Use less resistance.`;
  return `With ${x.r} mΩ in the brake bank the current was too strong: the car steadied below the safe speed and stopped short of the platform. Use more resistance.`;
}

/** The paid check (a charge). */
export function meterText(r: Round, x: Values): string {
  if (r.kind === 'rocket') {
    const up = (r.magnet === 'below') === (x.pole === 1);
    return `Flux check: with ${poleText(x.pole)} facing the ring, the field through it points ${up ? 'up' : 'down'}, and with the magnet ${x.move === 1 ? 'moving toward it the flux would rise' : x.move === -1 ? 'moving away the flux would fall' : 'held still the flux would not change'}${x.ring === 0 ? ' (but the ring is split)' : ''}.`;
  }
  if (r.kind === 'tunnel') {
    const z = [x.z0!, x.z1!, x.z2!];
    return `Flux check: ${[0, 1, 2].map((i) => `sign ${i + 1} field ${z[i] ? '⊗ into' : '⊙ out of'} the page, flux ${CHANGE[r.ev[i]] === 1 ? 'rising' : 'falling'}`).join('; ')}.`;
  }
  return `Brake check: with ${x.r} mΩ the car would settle at ${fmt(steady(r, x.r!))} m/s, with ${fmt(brakeI(r, x.r!))} A in the bar.`;
}

/** The live helper. It shows the induced field (levels 1 and 2) or the player's steady speed (level 3), never the current's sense or the outcome. `i` is the sign in level 2. */
export function lcdText(r: Round, x: Values, i = 0): string {
  if (r.kind === 'rocket') {
    if (x.move === 0 || x.ring === 0) return 'RING: NO CURRENT';
    return `RING MAKES B ${rocketField(r, x.pole!, x.move!).inducedUp ? '⬆' : '⬇'}`;
  }
  if (r.kind === 'tunnel') {
    const into = [x.z0!, x.z1!, x.z2!][i] === 1;
    return `INDUCED ${into === (CHANGE[r.ev[i]] === 1) ? '⊙' : '⊗'}`;
  }
  return `STEADY ${fmt(steady(r, x.r!))} m/s`;
}

/** The working after a win, two short lines. */
export function winText(r: Round): string {
  if (r.kind === 'rocket') {
    const a = rocketAnswer(r);
    const toward = a.move === 1;
    return `Showtime! ${poleText(a.pole)} moving ${toward ? 'toward' : 'away from'} the ring made its flux ${toward ? 'rise' : 'fall'}, so the induced current ${toward ? 'opposed the rise' : 'propped the flux up'}: ${r.glow === 'green' ? 'anticlockwise' : 'clockwise'} seen from above (${glowText(r.glow)}). The ring ${toward ? 'repelled' : 'attracted'} the magnet, so it ${r.go === 'launch' ? 'launched up the tower' : 'was pulled down onto its seat'}.`;
  }
  if (r.kind === 'tunnel') {
    return `What a show! Each sign’s current opposed its change of flux: a rise needs an induced field against the magnet’s, a fall one along it, and anticlockwise current makes a field out of the page (⊙). Your fields: ${tunnelAnswer(r).map((z) => (z ? '⊗' : '⊙')).join(' ')}.`;
  }
  return `Smooth stop! At ${r.v} m/s the bar makes ε = Blv = ${fmt(r.b * r.l * r.v)} V, so I = ε/R = ${fmt(brakeI(r, r.r))} A and the brake force BIl = ${r.f} N balances the pull. The power Fv = I²R = ${fmt(r.f * r.v)} W: the car’s lost energy all became heat in the brake bank.`;
}
