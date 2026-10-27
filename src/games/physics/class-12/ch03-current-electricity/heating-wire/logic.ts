// Pure rules of the Heating Wire: no DOM, no canvas.
// Resistance in ohms, temperature in °C, α in units of 10⁻⁴ per °C unless named, power in W, energy in kWh.
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
/** A data value shown to the player: never rounded to fewer figures than it was built with. */
export const dat = (x: number) => String(Number(x.toPrecision(5)));
const within = (value: number, answer: number, tol: number) => Math.abs(value - answer) / Math.abs(answer) <= tol;

export const T_ROOM = 27;
/** R at temperature t2 from R at t1, with α in 10⁻⁴ per °C. */
export const resistanceAt = (r1: number, alpha4: number, t1: number, t2: number) => r1 * (1 + alpha4 * 1e-4 * (t2 - t1));
/** The temperature at which a resistance R2 is reached. */
export const temperatureFor = (r1: number, r2: number, alpha4: number, t1: number) => t1 + (r2 - r1) / (r1 * alpha4 * 1e-4);
/** Platinum thermometer: temperature from the resistance at 0 °C, 100 °C and now. */
export const thermometerT = (r0: number, r100: number, rt: number) => ((rt - r0) / (r100 - r0)) * 100;
/** α in 10⁻³ per °C from the resistance at 0 °C and 100 °C. */
export const alphaFromFixedPoints = (r0: number, r100: number) => (((r100 - r0) / (r0 * 100)) * 1e3);
export const powerAt = (v: number, r: number) => (v * v) / r;

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelHot {
  kind: 'hot';
  story: string;
  mode: 'forward' | 'inverse';
  r1: number;
  alpha4: number;
  t1: number;
  /** forward: the final temperature is given and R₂ is asked */
  t2: number;
  r2: number;
  /** inverse: the steady current and voltage are given and T₂ is asked */
  v: number;
  i: number;
  freeTests: number;
}
export interface LevelToaster {
  kind: 'toaster';
  story: string;
  v: number;
  i0: number;
  is: number;
  alpha4: number;
  t1: number;
  tSteady: number;
  pSteady: number;
  pStart: number;
  freeTests: number;
}
export interface LevelThermo {
  kind: 'thermo';
  story: string;
  r0: number;
  r100: number;
  rt: number;
  tBath: number;
  alpha3: number;
  freeTests: number;
}
export interface LevelRated {
  kind: 'rated';
  story: string;
  pRated: number;
  vRated: number;
  vNew: number;
  r: number;
  pNew: number;
  freeTests: number;
}
export interface Appliance {
  name: string;
  watts: number;
  hours: number;
}
export interface LevelBill {
  kind: 'bill';
  story: string;
  items: Appliance[];
  rate: number;
  kwh: number;
  cost: number;
  freeTests: number;
}
export type Level = LevelHot | LevelToaster | LevelThermo | LevelRated | LevelBill;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const alpha4 = pick([1.7, 39, 43], random);
    const dts = alpha4 < 10 ? [300, 600, 800] : [50, 100, 150];
    const dt = pick(dts, random);
    const r1 = pick([50, 60, 75.3, 100, 120], random);
    const mode = random() < 0.5 ? 'forward' : 'inverse';
    const t2 = T_ROOM + dt;
    const r2 = resistanceAt(r1, alpha4, T_ROOM, t2);
    const v = pick([115, 230], random);
    const i = Number((v / r2).toPrecision(3));
    return {
      kind: 'hot',
      story: mode === 'forward' ? 'A resistor is heated and its resistance rises almost linearly with temperature. Find its resistance at the higher temperature.' : 'A heating element is connected to a supply and, after a few seconds, settles at a steady current. Its resistance has risen as it warmed. Find its steady temperature.',
      mode,
      r1,
      alpha4,
      t1: T_ROOM,
      t2,
      r2: mode === 'forward' ? r2 : v / i,
      v,
      i,
      freeTests: 1,
    };
  }
  if (level === 2) {
    const [i0, is] = pick([[3.2, 2.8], [4.0, 3.5], [2.5, 2.2], [5.0, 4.4], [3.0, 2.6]] as [number, number][], random);
    const v = pick([115, 230], random);
    const alpha4 = 1.7;
    const dt = (i0 / is - 1) / (alpha4 * 1e-4);
    return {
      kind: 'toaster',
      story: 'A toaster\'s nichrome element draws a large current the moment it is switched on, then the current settles to a smaller steady value as the element heats up. Find the steady temperature of the element and the power it uses in the steady state.',
      v,
      i0,
      is,
      alpha4,
      t1: T_ROOM,
      tSteady: T_ROOM + dt,
      pSteady: v * is,
      pStart: v * i0,
      freeTests: 1,
    };
  }
  if (level === 3) {
    const r0 = 5;
    const r100 = pick([5.2, 5.23, 5.25, 5.4], random);
    const tBath = pick([50, 150, 200, 250, 300, 350], random);
    const rt = Number((r0 + ((r100 - r0) * tBath) / 100).toPrecision(5));
    return {
      kind: 'thermo',
      story: 'A platinum resistance thermometer has a known resistance at the ice point and at the steam point. It is put in a hot bath. Find the temperature of the bath, and the temperature coefficient of resistance of platinum from the two fixed points.',
      r0,
      r100,
      rt,
      tBath: thermometerT(r0, r100, rt),
      alpha3: alphaFromFixedPoints(r0, r100),
      freeTests: 1,
    };
  }
  if (level === 4) {
    const vRated = pick([230, 220], random);
    const pRated = pick([500, 1000, 1500, 2000], random);
    const vNew = vRated / pick([2, 4 / 3, 1.25], random);
    const r = (vRated * vRated) / pRated;
    return {
      kind: 'rated',
      story: 'A heater is rated for a power at its working voltage. Find the resistance of its element. Then the mains voltage drops: find the power it now delivers, taking the resistance as unchanged.',
      pRated,
      vRated,
      vNew: Number(vNew.toPrecision(4)),
      r,
      pNew: powerAt(Number(vNew.toPrecision(4)), r),
      freeTests: 1,
    };
  }
  const pool: Appliance[] = [
    { name: 'lamp', watts: 60, hours: pick([5, 8, 10], random) },
    { name: 'fan', watts: 75, hours: pick([6, 8, 12], random) },
    { name: 'heater', watts: 1000, hours: pick([1, 2, 3], random) },
    { name: 'iron', watts: 750, hours: pick([1, 2], random) },
  ];
  const drop = Math.floor(random() * pool.length);
  const items = pool.filter((_, i) => i !== drop);
  const kwh = items.reduce((s, a) => s + (a.watts * a.hours) / 1000, 0);
  const rate = pick([5, 6, 8, 10], random);
  return {
    kind: 'bill',
    story: 'Electrical energy is billed in kilowatt-hours: the power in kilowatts times the hours it runs. Find the energy these appliances use in a day, and the cost at the tariff.',
    items,
    rate,
    kwh,
    cost: kwh * rate,
    freeTests: 1,
  };
}

export function judgeHot(lvl: LevelHot, answer: number): { ok: boolean } {
  const target = lvl.mode === 'forward' ? lvl.r2 : temperatureFor(lvl.r1, lvl.v / lvl.i, lvl.alpha4, lvl.t1);
  return { ok: within(answer, target, 0.03) };
}
export const hotAnswer = (lvl: LevelHot) => (lvl.mode === 'forward' ? lvl.r2 : temperatureFor(lvl.r1, lvl.v / lvl.i, lvl.alpha4, lvl.t1));
export function judgeToaster(lvl: LevelToaster, t: number, p: number): { ok: boolean; tOk: boolean; pOk: boolean } {
  const tOk = within(t, lvl.tSteady, 0.03);
  const pOk = within(p, lvl.pSteady, 0.03);
  return { ok: tOk && pOk, tOk, pOk };
}
export function judgeThermo(lvl: LevelThermo, t: number, alpha3: number): { ok: boolean; tOk: boolean; aOk: boolean } {
  const tOk = within(t, lvl.tBath, 0.03);
  const aOk = within(alpha3, lvl.alpha3, 0.03);
  return { ok: tOk && aOk, tOk, aOk };
}
export function judgeRated(lvl: LevelRated, r: number, p: number): { ok: boolean; rOk: boolean; pOk: boolean } {
  const rOk = within(r, lvl.r, 0.03);
  const pOk = within(p, lvl.pNew, 0.03);
  return { ok: rOk && pOk, rOk, pOk };
}
export function judgeBill(lvl: LevelBill, kwh: number, cost: number): { ok: boolean; kOk: boolean; cOk: boolean } {
  const kOk = within(kwh, lvl.kwh, 0.03);
  const cOk = within(cost, lvl.cost, 0.03);
  return { ok: kOk && cOk, kOk, cOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'hot') {
    if (lvl.mode === 'forward') {
      return [
        `R₂ = R₁[1 + α(T₂ − T₁)] = ${dat(lvl.r1)} × [1 + ${lvl.alpha4} × 10⁻⁴ × (${lvl.t2} − ${lvl.t1})] = ${fmt(lvl.r2)} Ω.`,
        'For metals α is positive: resistance rises with temperature because the ions vibrate harder and the electrons collide more often.',
      ];
    }
    const r2 = lvl.v / lvl.i;
    return [
      `The steady resistance is R₂ = V/I = ${lvl.v} / ${lvl.i} = ${fmt(r2)} Ω.`,
      `From R₂ = R₁[1 + α(T₂ − T₁)]: T₂ − T₁ = (R₂ − R₁)/(R₁α) = (${fmt(r2)} − ${dat(lvl.r1)}) / (${dat(lvl.r1)} × ${lvl.alpha4} × 10⁻⁴) = ${fmt(temperatureFor(lvl.r1, r2, lvl.alpha4, lvl.t1) - lvl.t1)} °C, so T₂ = ${fmt(temperatureFor(lvl.r1, r2, lvl.alpha4, lvl.t1))} °C.`,
      'The temperature settles where the heat produced by the current equals the heat lost to the surroundings.',
    ];
  }
  if (lvl.kind === 'toaster') {
    return [
      `Cold, R₁ = V/I₀ = ${lvl.v} / ${lvl.i0} = ${fmt(lvl.v / lvl.i0)} Ω. Steady, R₂ = V/I = ${lvl.v} / ${lvl.is} = ${fmt(lvl.v / lvl.is)} Ω.`,
      `T₂ − T₁ = (R₂ − R₁)/(R₁α) = ${fmt(lvl.tSteady - lvl.t1)} °C, so the element settles at ${fmt(lvl.tSteady)} °C.`,
      `The steady power is P = VI = ${lvl.v} × ${lvl.is} = ${fmt(lvl.pSteady)} W, lower than the ${fmt(lvl.pStart)} W at switch-on.`,
    ];
  }
  if (lvl.kind === 'thermo') {
    return [
      `R_t = R₀(1 + αt), so t = (R_t − R₀)/(R₁₀₀ − R₀) × 100 = (${dat(lvl.rt)} − ${lvl.r0}) / (${lvl.r100} − ${lvl.r0}) × 100 = ${fmt(lvl.tBath)} °C.`,
      `α = (R₁₀₀ − R₀)/(R₀ × 100) = ${fmt(alphaFromFixedPoints(lvl.r0, lvl.r100))} × 10⁻³ per °C.`,
    ];
  }
  if (lvl.kind === 'rated') {
    return [
      `P = V²/R, so R = V²/P = ${lvl.vRated}² / ${lvl.pRated} = ${fmt(lvl.r)} Ω.`,
      `At ${fmt(lvl.vNew)} V the power is P′ = V′²/R = ${fmt(lvl.pNew)} W. Power goes as the square of the voltage, so a modest drop in voltage cuts the power by more.`,
    ];
  }
  return [
    `Energy = power × time: ${lvl.items.map((a) => `${a.watts} W × ${a.hours} h`).join(' + ')} = ${fmt(lvl.kwh)} kWh (1 kWh = 1000 W for one hour = 3.6 × 10⁶ J).`,
    `Cost = ${fmt(lvl.kwh)} kWh × ${lvl.rate} per kWh = ${fmt(lvl.cost)}.`,
  ];
}
