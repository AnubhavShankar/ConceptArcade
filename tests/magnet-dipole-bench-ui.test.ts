// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch05-magnetism-and-matter/magnet-dipole-bench/index';
import { FADER, THR, compassAt, iX, knobAt, mX, portAt } from '../src/games/physics/class-12/ch05-magnetism-and-matter/magnet-dipole-bench/art';
import { ARROW, answerOf, buildRounds, goalText, type Round, type Values } from '../src/games/physics/class-12/ch05-magnetism-and-matter/magnet-dipole-bench/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'magnet-dipole-bench', 5);
type L = 1 | 2 | 3 | 4 | 5;
const LEVELS: L[] = [1, 2, 3, 4, 5];
const build = (level: number, seed: number) => buildRounds(level as L, createRng(seed));
const FIRE = 'Command the burn: send the command to Pebble';
const CHECK = 'Check telemetry: read what this setting would do before the burn';

/** The dial keys of a round, in slider order. */
const order = (r: Round): (keyof Values)[] => (r.kind === 'coil' ? ['i', 'thr'] : r.kind === 'dock' ? ['port', 'q'] : r.kind === 'park' ? ['h'] : ['m']);
const apply = (r: Round, x: Values) => order(r).forEach((key, i) => h.setSlider(x[key]!, i));
/** A setting that is certainly a miss. */
function wrongOf(r: Round): Values {
  const a = answerOf(r);
  switch (r.kind) {
    case 'spin':
    case 'swing': return { m: Math.round((a.m! + 0.2) * 10) / 10 };
    case 'park': return { h: a.h! + 15 };
    case 'coil': return { i: a.i! + 20, thr: a.thr };
    case 'dock': return { port: a.port, q: (a.q! + 1) % 4 };
  }
}
const set = (r: Round, right: boolean) => apply(r, right ? answerOf(r) : wrongOf(r));
shellTests<Round[]>(h, { levels: LEVELS, build, setRight: (g, k) => set(g[k], true), setWrong: (g, k) => set(g[k], false), commit: () => h.click(FIRE) });

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const one = (x: number) => String(Math.round(x * 10) / 10);
const canvas = () => h.$('canvas')!;
const R = () => canvasRecorder();
/** Advance `dt` seconds, then record one frame; the strings drawn in it. */
const frame = (c: ReturnType<typeof canvasRecorder>, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  c.clear();
  h.advance(0.05);
  return c.rec.at.map((a) => a.s);
};
const playTo = (level: L, round: number, seed = 5) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    set(g[k], true);
    h.click(FIRE);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
const TLM_RE = [/^τ .* µN m$/, /^θ .* · τ .* · U /, /^(rests at \d+°|tumbles over)$/, /^m .* · τ .* µN m$/, /^U .* · τ /];
const tlmDrawn = (level: L, texts: string[]) => texts.some((s) => TLM_RE[level - 1].test(s));
const INSET = ['τ = mB sin θ', 'U = −mB cos θ', 'W = ΔU', 'F = 0 net', 'field of Pebble'];
const steps = (lo: number, hi: number, step: number) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => Math.round((lo + i * step) * 1000) / 1000);

describe('Pebble in Orbit', () => {
  it('has the dials of the brief', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      const sl = h.sliders();
      const spec = (s: HTMLInputElement) => [Number(s.min), Number(s.max), Number(s.value), Number(s.step)];
      const r0 = build(level, 5)[0];
      if (level === 1 || level === 3) expect([sl.length, spec(sl[0])]).toEqual([1, [0.2, 4, 0.2, 0.2]]);
      if (level === 2) expect([sl.length, spec(sl[0])]).toEqual([1, [0, 345, 90, 15]]);
      if (level === 4) expect([sl.length, spec(sl[0]), spec(sl[1])]).toEqual([2, [20, 600, 20, 20], [0, 1, 0, 1]]);
      if (level === 5 && r0.kind === 'dock') expect([sl.length, spec(sl[0]), spec(sl[1])]).toEqual([2, [0, 1, 0, 1], [0, 3, (r0.pDir + 1) % 4, 1]]);
      const labels = [...document.querySelectorAll('.control-label')].map((e) => e.textContent);
      expect(labels).toEqual([['Rod moment'], ['Heading'], ['Rod moment'], ['Coil current', 'Thruster'], ['Port', 'Grit points']][level - 1]);
    }
  });

  it('the first miss at the start settings says what the setting did', () => {
    const want = [/still spinning/, /swung Pebble away/, /went past/, /stopped short of the guide star/, /hatch was shut/];
    for (const level of LEVELS) {
      h.start(level, 5);
      h.click(FIRE);
      h.advance(2.8);
      expect(h.feedback(), `level ${level}`).toMatch(want[level - 1]);
    }
  });

  it('a verdict lands when the take says: level 2 at 1.0 s, level 4 at 1.4 s', () => {
    h.start(2, 5);
    h.click(FIRE);
    h.advance(0.8);
    expect(h.hearts()).toBe(3);
    h.advance(0.4);
    expect(h.hearts()).toBe(2);
    h.start(4, 5);
    h.click(FIRE);
    h.advance(1.2);
    expect(h.hearts()).toBe(3);
    h.advance(0.4);
    expect(h.hearts()).toBe(2);
  });

  it('a telemetry check costs a charge: it reads out, a second press says there are no charges left', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      h.click(CHECK);
      expect(h.feedback()).toMatch(/Check: /);
      h.click(CHECK);
      expect(h.feedback()).toMatch(/No charges left/);
    }
  });

  it('a win teaches', () => {
    const want = [/Spin stopped!/, /Parked!|Balanced!/, /Locked on!|Balanced!/, /On the star!/, /Docked!|Ready to fly!|Tightest dock!/];
    for (const level of LEVELS) {
      h.start(level, 5);
      set(build(level, 5)[0], true);
      h.click(FIRE);
      h.advance(2.8);
      expect(h.feedback(), `level ${level}`).toMatch(want[level - 1]);
    }
  });

  it('a miss ends with the change to make, in words', () => {
    const ends = [/rod\.$/, /(zero\.|unstable\.|highest energy\.)$/, /rod\.$/, /(current\.|needs no thrust\.|with the thruster\.)$/, /(names\.|there\.|unstable\.|higher energy\.|deeper energy\.)$/];
    for (const level of LEVELS) {
      h.start(level, 5);
      set(build(level, 5)[0], false);
      h.click(FIRE);
      h.advance(2.8);
      expect(h.feedback(), `level ${level}`).toMatch(ends[level - 1]);
    }
  });

  it('every handle’s ring sits where the player’s setting puts it', () => {
    for (const level of LEVELS) {
      const c = R();
      h.start(level, 5);
      frame(c);
      const r0 = build(level, 5)[0];
      const at: [number, number][] =
        level === 1 || level === 3 ? [[mX(0.2), FADER.y]] :
        level === 2 ? [compassAt(90)] :
        level === 4 ? [[iX(20), FADER.y], [THR.x0, THR.y]] :
        r0.kind === 'dock' ? [portAt(r0.pDir, 0), knobAt((r0.pDir + 1) % 4)] : [];
      for (const [x, y] of at) expect(c.rec.arcs.some((a) => Math.abs(a.x - x) < 1 && Math.abs(a.y - y) < 1 && a.r >= 20), `level ${level} at ${x},${y}`).toBe(true);
    }
  });
});

describe('Pebble in Orbit UX', () => {
  for (const level of LEVELS) {
    it(`level ${level}: the goal line is drawn at round start and gone after Fire; the player’s own setting is read beside its handle`, () => {
      const c = R();
      h.start(level, 5);
      const r = build(level, 5)[0];
      const texts = frame(c);
      expect(texts).toContain(goalText(r));
      const own =
        level === 1 || level === 3 ? ['0.2 J/T'] : level === 2 ? ['90°'] : level === 4 ? ['20 mA', 'THRUSTER OFF'] : r.kind === 'dock' ? ['nose port', `points ${ARROW[(r.pDir + 1) % 4]}`] : [];
      for (const s of own) expect(texts, `level ${level}`).toContain(s);
      set(r, false);
      h.click(FIRE);
      const after = frame(c, 0.3);
      expect(after).not.toContain(goalText(r));
      for (const s of own.filter((x) => x !== 'THRUSTER OFF')) expect(after, `level ${level} after Fire`).not.toContain(s);
    });

    it(`level ${level}: the first handle carries a drag cue in round 1 until touched, and not in round 2`, () => {
      const c = R();
      h.start(level, 5);
      expect(frame(c)).toContain('drag');
      playTo(level, 1);
      expect(frame(c, 0.3)).not.toContain('drag');
    });
  }

  it('level 4 shows the coil plate; level 5 draws no number in the scene', () => {
    const c = R();
    h.start(4, 5);
    const r = build(4, 5)[0];
    if (r.kind === 'coil') expect(frame(c)).toContain(`${r.n} turns · ${r.a} cm²`);
    h.start(5, 5);
    expect(frame(c).filter((s) => /\d/.test(s) && !TLM_RE[4].test(s))).toEqual([]); // the telemetry box is the helper
  });
});

describe('Pebble in Orbit never leaks the answer', () => {
  for (const level of LEVELS) {
    it(`level ${level}: the telemetry box is live in round 1, shows for 1.5 s after a check in round 2, and never in round 3`, () => {
      const c = R();
      h.start(level, 5);
      expect(tlmDrawn(level, frame(c))).toBe(true);
      expect(canvas().dataset.tlm).toBe('1');
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(tlmDrawn(level, frame(c, 0.3))).toBe(false);
      expect(canvas().dataset.tlm).toBe('0');
      h.click(CHECK);
      expect(tlmDrawn(level, frame(c, 0.3))).toBe(true);
      expect(canvas().dataset.tlm).toBe('1');
      expect(tlmDrawn(level, frame(c, 1.0))).toBe(true);
      expect(tlmDrawn(level, frame(c, 0.5))).toBe(false);
      expect(canvas().dataset.tlm).toBe('0');
      h.click(CHECK);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(tlmDrawn(level, frame(c, 0.5))).toBe(false);
      set(g[1], true);
      h.click(FIRE);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      set(g[2], true);
      expect(tlmDrawn(level, frame(c))).toBe(false);
      h.click(CHECK);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(tlmDrawn(level, frame(c, 0.5))).toBe(false);
      expect(canvas().dataset.tlm).toBe('0');
    });
  }

  it('no drawn text contains the answer unless it is the player’s own setting (all rounds, every setting)', () => {
    for (const level of LEVELS) {
      const c = R();
      h.start(level, 5);
      const g = build(level, 5);
      for (let k = 0; k < 3; k++) {
        const r = g[k];
        const a = answerOf(r);
        const settings: Values[] =
          r.kind === 'spin' || r.kind === 'swing' ? steps(0.2, 4, 0.2).map((m) => ({ m })) :
          r.kind === 'park' ? steps(0, 345, 15).map((hh) => ({ h: hh })) :
          r.kind === 'coil' ? steps(20, 600, 20).map((i) => ({ i, thr: a.thr })) :
          [0, 1, 2, 3].map((q) => ({ port: a.port, q }));
        const token = r.kind === 'spin' || r.kind === 'swing' ? `${one(a.m!)} J/T` : r.kind === 'park' ? `${a.h}°` : r.kind === 'coil' ? `${a.i} mA` : `points ${ARROW[a.q!]}`;
        for (const s of settings) {
          if (order(r).every((key) => s[key] === a[key])) continue;
          apply(r, s);
          // the round 1 telemetry is the live helper and may print a computed angle
          const texts = frame(c).filter((x) => !(r.kind === 'park' && x.startsWith('θ ')));
          expect(texts.some((x) => has(x, token)), `level ${level} round ${k + 1} at ${JSON.stringify(s)}`).toBe(false);
        }
        if (k < 2) {
          set(r, true);
          h.click(FIRE);
          h.advance(2.8);
          h.advance(1);
        }
      }
    }
  });

  it('the teaching pictures are drawn only after a win', () => {
    for (const level of LEVELS) {
      const c = R();
      h.start(level, 5);
      const r = build(level, 5)[0];
      const label = INSET[level - 1];
      const drawn = (texts: string[]) => texts.some((s) => (level === 4 ? /^(F = 0 net|net F)$/.test(s) : s === label));
      expect(drawn(frame(c))).toBe(false);
      set(r, false);
      h.click(FIRE);
      for (let i = 0; i < 8; i++) expect(drawn(frame(c, 0.25)), `level ${level} miss at ${i * 0.25}`).toBe(false);
      h.advance(2);
      expect(h.phase()).toBe('play');
      set(r, true);
      h.click(FIRE);
      expect(drawn(frame(c, 0.3))).toBe(false);
      expect(drawn(frame(c, 1.6))).toBe(true);
      expect(canvas().dataset.take).toBe('win');
    }
  });

  it('every take names its outcome on the canvas while it plays', () => {
    h.start(4, 5);
    const r = build(4, 5)[0];
    set(r, false);
    h.click(FIRE);
    h.advance(0.3);
    expect(canvas().dataset.take).toBe('over');
  });
});
