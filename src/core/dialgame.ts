// A template for arcade levels made of dials: a level is its rounds, its dials, its judge and its scene drawing.
// Controls, charges, hearts, rounds, fading aids, drag handles and the hint line are handled here once.
import { createArcade, type Arcade, type Hero } from './arcade';
import type { GameContext } from './types';

export type Values = Record<string, number>;
type Num<R> = number | ((r: R) => number);
const val = <R>(n: Num<R>, r: R) => (typeof n === 'function' ? n(r) : n);

export interface DialSpec<R> {
  key: string;
  aria: string;
  label: string;
  unit: string;
  step: number;
  min: Num<R>;
  max: Num<R>;
  start: Num<R>;
  /** How the readout is written (default: the number). */
  text?: (v: number) => string;
}
export interface HandleSpec<R> {
  dial: string;
  /** Where the handle sits on the canvas for the current round and dial values. */
  at: (r: R, v: Values) => [number, number];
  /** The dial value for a pointer at (px, py). */
  drag: (r: R, px: number, py: number, v: Values) => number;
  radius?: number;
}
export interface SceneInput<R> {
  g: CanvasRenderingContext2D;
  /** The round data. */
  r: R;
  /** The round number, 0 to 2. */
  k: number;
  /** The dial values to draw: the live ones, or the ones that were fired while the shot plays. */
  v: Values;
  /** Seconds the clock has run, for idle animation. */
  t: number;
  /** Seconds since the shot was fired (0 when not firing). */
  rt: number;
  /** The shot being played, or null. */
  shot: { ok: boolean; v: Values } | null;
  A: Arcade;
}
export interface DialLevel<R> {
  hero: Hero;
  rounds: R[];
  charges: number[];
  dials: DialSpec<R>[];
  handles?: HandleSpec<R>[];
  /** A test shot that costs a charge and reads something out. */
  test?: { button: string; aria: string; read: (r: R, v: Values) => string };
  fire: { button: string; aria: string };
  judge: (r: R, v: Values) => boolean;
  /** After a miss: the effect of what the player chose, never the right answer. */
  miss: (r: R, v: Values) => string;
  /** After a hit: the result and the working. */
  win: (r: R, k: number) => string;
  hint: (r: R, k: number) => string;
  /** Where the burst of points appears. */
  hit: (r: R, k: number) => [number, number];
  /** Seconds into the shot at which the verdict lands (default 1.2). */
  delay?: number;
  draw: (s: SceneInput<R>) => void;
}

export function mountDialLevel<R>(ctx: GameContext, L: DialLevel<R>, aria: string): () => void {
  let onRound: (k: number) => void = () => undefined;
  const W = 640;
  const H = 340;
  const A = createArcade(ctx, L.hero, { W, H, aria, rounds: 3, charges: L.charges, onRound: (k) => onRound(k) });
  const ri = () => Math.min(A.round, 2);
  const values: Values = {};
  let shot: { ok: boolean; v: Values } | null = null;
  const r0 = L.rounds[0];
  for (const d of L.dials) values[d.key] = val(d.start, r0);
  const sliders = L.dials.map((d) =>
    A.slider({ aria: d.aria, label: d.label, min: val(d.min, r0), max: val(d.max, r0), step: d.step, value: values[d.key], unit: d.unit, text: d.text, onInput: (v) => (values[d.key] = v) }),
  );
  const byKey = (key: string) => sliders[L.dials.findIndex((d) => d.key === key)];
  for (const hs of L.handles ?? []) {
    A.handle({
      x: () => hs.at(L.rounds[ri()], values)[0],
      y: () => hs.at(L.rounds[ri()], values)[1],
      r: hs.radius ?? 24,
      drag: (px, py) => byKey(hs.dial).set(hs.drag(L.rounds[ri()], px, py, values)),
    });
  }
  A.controls.append(...sliders.map((s) => s.row));
  if (L.test) {
    const t = L.test;
    A.controls.append(A.button(t.button, t.aria, () => {
      if (!A.spend()) return;
      A.say(t.read(L.rounds[ri()], { ...values }), true);
    }, 'secondary'));
  }
  A.controls.append(A.button(L.fire.button, L.fire.aria, () => {
    const k = ri();
    const r = L.rounds[k];
    const v = { ...values };
    const ok = L.judge(r, v);
    shot = { ok, v };
    const [hx, hy] = L.hit(r, k);
    A.resolve(ok, ok ? L.win(r, k) : L.miss(r, v), { x: hx, y: hy }, L.delay ?? 1.2);
  }));
  onRound = (k) => {
    const r = L.rounds[k];
    L.dials.forEach((d, i) => {
      sliders[i].range(val(d.min, r), val(d.max, r));
      sliders[i].set(val(d.start, r));
    });
    shot = null;
    A.feedback.hidden = true;
    A.hint.textContent = L.hint(r, k);
  };
  A.scene((g, t) => {
    if (A.phase === 'between') return;
    const k = ri();
    const resolving = A.phase === 'resolve' && shot !== null;
    L.draw({ g, r: L.rounds[k], k, v: resolving ? shot!.v : { ...values }, t, rt: resolving ? A.rt : 0, shot: resolving ? shot : null, A });
  });
  A.mountAll();
  return A.run();
}

/** Aid level for a round: 0 live help, 1 reduced help, 2 none. The rounds of every level fade this way. */
export const aid = (k: number) => Math.min(2, k) as 0 | 1 | 2;
