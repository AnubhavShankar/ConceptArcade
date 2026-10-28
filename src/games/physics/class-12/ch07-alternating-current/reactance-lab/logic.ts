// Pure rules of the Reactance Lab: no DOM, no canvas.
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

/** Inductive reactance X_L = 2πfL, with L in mH. */
export const xl = (lMilliH: number, hz: number) => 2 * Math.PI * hz * lMilliH * 1e-3;
/** Capacitive reactance X_C = 1/(2πfC), with C in µF. */
export const xc = (cMicroF: number, hz: number) => 1 / (2 * Math.PI * hz * cMicroF * 1e-6);

export type Element = 'inductor' | 'capacitor';
export type Lead = 'lags' | 'leads';
export const leadOf = (e: Element): Lead => (e === 'inductor' ? 'lags' : 'leads');

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelInductor {
  kind: 'inductor';
  story: string;
  lMilliH: number;
  v: number;
  hz: number;
  x: number;
  i: number;
  freeTests: number;
}
export interface LevelCapacitor {
  kind: 'capacitor';
  story: string;
  cMicroF: number;
  v: number;
  hz: number;
  x: number;
  i: number;
  freeTests: number;
}
export type Brightness = 'brighter' | 'dimmer';
export interface LevelFrequency {
  kind: 'frequency';
  story: string;
  element: Element;
  hz1: number;
  hz2: number;
  x1: number;
  x2: number;
  glow: Brightness;
  freeTests: number;
}
export interface LevelPower {
  kind: 'power';
  story: string;
  element: Element;
  v: number;
  x: number;
  i: number;
  lead: Lead;
  freeTests: number;
}
export type Level = LevelInductor | LevelCapacitor | LevelFrequency | LevelPower;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const lMilliH = pick([25, 44, 100, 200], random);
    const v = pick([110, 220], random);
    const hz = pick([50, 60, 400], random);
    const x = xl(lMilliH, hz);
    return {
      kind: 'inductor',
      story: 'A pure inductor is connected to an AC source. It has no resistance, but it opposes the changing current with an inductive reactance. Find its reactance and the rms current in the circuit.',
      lMilliH,
      v,
      hz,
      x,
      i: v / x,
      freeTests: 1,
    };
  }
  if (level === 2) {
    const cMicroF = pick([15, 30, 60, 100], random);
    const v = pick([110, 220], random);
    const hz = pick([50, 60], random);
    const x = xc(cMicroF, hz);
    return {
      kind: 'capacitor',
      story: 'A capacitor is connected to an AC source. It passes the alternating current, opposing it with a capacitive reactance. Find its reactance and the rms current in the circuit.',
      cMicroF,
      v,
      hz,
      x,
      i: v / x,
      freeTests: 1,
    };
  }
  if (level === 3) {
    const element = pick(['inductor', 'capacitor'] as Element[], random);
    const hz1 = pick([50, 100, 200], random);
    const hz2 = pick([25, 400, 800], random);
    const x1 = pick([20, 50, 100], random);
    const x2 = element === 'inductor' ? (x1 * hz2) / hz1 : (x1 * hz1) / hz2;
    return {
      kind: 'frequency',
      story: `A lamp is in series with ${element === 'inductor' ? 'an inductor' : 'a capacitor'} on an AC source. The reactance of the ${element} is known at one frequency. The frequency of the source is then changed. Find the reactance at the new frequency, and say whether the lamp glows brighter or dimmer.`,
      element,
      hz1,
      hz2,
      x1,
      x2,
      glow: (x2 < x1 ? 'brighter' : 'dimmer'),
      freeTests: 1,
    };
  }
  const element = pick(['inductor', 'capacitor'] as Element[], random);
  const v = pick([110, 220], random);
  const x = pick([50, 100, 200], random);
  return {
    kind: 'power',
    story: `A pure ${element} is connected to an AC source. Find the net power it absorbs over a complete cycle, and say whether the current lags or leads the voltage. Explain to yourself where the energy goes.`,
    element,
    v,
    x,
    i: v / x,
    lead: leadOf(element),
    freeTests: 1,
  };
}

export function judgeInductor(lvl: LevelInductor, x: number, i: number): { ok: boolean; xOk: boolean; iOk: boolean } {
  const xOk = within(x, lvl.x, 0.03);
  const iOk = within(i, lvl.i, 0.03);
  return { ok: xOk && iOk, xOk, iOk };
}
export function judgeCapacitor(lvl: LevelCapacitor, x: number, i: number): { ok: boolean; xOk: boolean; iOk: boolean } {
  const xOk = within(x, lvl.x, 0.03);
  const iOk = within(i, lvl.i, 0.03);
  return { ok: xOk && iOk, xOk, iOk };
}
export function judgeFrequency(lvl: LevelFrequency, x2: number, glow: Brightness): { ok: boolean; xOk: boolean; gOk: boolean } {
  const xOk = within(x2, lvl.x2, 0.03);
  const gOk = glow === lvl.glow;
  return { ok: xOk && gOk, xOk, gOk };
}
export function judgePower(lvl: LevelPower, p: number, lead: Lead): { ok: boolean; pOk: boolean; lOk: boolean } {
  const pOk = Math.abs(p) < 1e-9;
  const lOk = lead === lvl.lead;
  return { ok: pOk && lOk, pOk, lOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'inductor') {
    return [`X_L = ωL = 2π × ${lvl.hz} × ${lvl.lMilliH} × 10⁻³ = ${fmt(lvl.x)} Ω.`, `I_rms = V_rms/X_L = ${lvl.v} / ${fmt(lvl.x)} = ${fmt(lvl.i)} A. The reactance grows with frequency, as the induced emf is greater when the current changes faster.`];
  }
  if (lvl.kind === 'capacitor') {
    return [`X_C = 1/ωC = 1 / (2π × ${lvl.hz} × ${lvl.cMicroF} × 10⁻⁶) = ${fmt(lvl.x)} Ω.`, `I_rms = V_rms/X_C = ${lvl.v} / ${fmt(lvl.x)} = ${fmt(lvl.i)} A. The reactance falls as the frequency rises: the capacitor charges and discharges more often, so more charge flows per second.`];
  }
  if (lvl.kind === 'frequency') {
    return [
      lvl.element === 'inductor' ? `X_L = 2πfL is proportional to f, so X = ${lvl.x1} × ${lvl.hz2}/${lvl.hz1} = ${fmt(lvl.x2)} Ω.` : `X_C = 1/2πfC is proportional to 1/f, so X = ${lvl.x1} × ${lvl.hz1}/${lvl.hz2} = ${fmt(lvl.x2)} Ω.`,
      `The reactance went from ${lvl.x1} Ω to ${fmt(lvl.x2)} Ω, so the current in the lamp ${lvl.glow === 'brighter' ? 'rises: it glows brighter' : 'falls: it glows dimmer'}.`,
    ];
  }
  return [
    'The average power is V_rms I_rms cos φ, with φ = 90° for a pure inductor or capacitor, so cos φ = 0 and the net power over a cycle is zero.',
    `The current ${lvl.lead} the voltage by 90° for a pure ${lvl.element}. Energy goes into the ${lvl.element === 'inductor' ? 'magnetic field' : 'electric field'} for a quarter of a cycle and comes back in the next quarter.`,
  ];
}
