// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/mathematics/class-12/ch05-continuity-and-differentiability/splash-patrol/index';
import { GROUND, TUBE_FILL, ZOOM, duckPose, jointPoint, slideAt } from '../src/games/mathematics/class-12/ch05-continuity-and-differentiability/splash-patrol/art';
import { POOLS, buildRounds, firstFault, verdictTime, want, type Flag, type Level, type Round } from '../src/games/mathematics/class-12/ch05-continuity-and-differentiability/splash-patrol/logic';
import { GOAL } from '../src/games/mathematics/class-12/ch05-continuity-and-differentiability/splash-patrol/index';
import { createRng } from '../src/core/random';
import { RESOLVE } from '../src/core/arcade';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'splash-patrol', 4);
const LEVELS: Level[] = [1, 2, 3, 4];
const buttons = () => [...document.querySelectorAll('[data-joint]')].filter((b) => !(b as HTMLElement).hidden) as HTMLButtonElement[];
const press = (b: HTMLElement) => b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
function setFlags(r: Round) {
  buttons().forEach((b, i) => {
    const w = want(r.level, r.joints[i]);
    for (let k = 0; k < 4 && b.dataset.flag !== w; k++) press(b);
  });
}
function setWrong(r: Round) {
  setFlags(r);
  const b = buttons()[0];
  const w = b.dataset.flag;
  for (let k = 0; k < 4 && b.dataset.flag === w; k++) press(b);
  if (b.dataset.flag === 'none') press(b);
}
const build = (level: number, seed: number) => buildRounds(level as Level, createRng(seed));
const SEND = 'Send the test duck';
const ZOOMB = 'Zoom drone: a close-up of the joint you last tapped';

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => setFlags(g[k]),
  setWrong: (g, k) => setWrong(g[k]),
  commit: () => h.click(SEND),
});

/** Play rounds 1 to `round` (0 based) correctly and return the rounds. */
function playTo(level: number, round: number, seed = 5) {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    setFlags(g[k]);
    h.click(SEND);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
}
/** All the flags wrong at once, so several joints are at fault and only the first may be shown. */
function setAllWrong(r: Round) {
  buttons().forEach((b, i) => {
    const w = want(r.level, r.joints[i]);
    for (let k = 0; k < 4 && (b.dataset.flag === w || b.dataset.flag === 'none'); k++) press(b);
  });
}

describe('Splash Patrol controls', () => {
  it('the number of visible joint buttons equals the round’s joint count, each labelled with its x', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = build(level, 5);
      for (let k = 0; k < 3; k++) {
        const bs = buttons();
        expect(bs).toHaveLength(g[k].joints.length);
        bs.forEach((b, i) => expect(b.getAttribute('aria-label')).toBe(`Joint at x = ${g[k].joints[i].cText}`));
        expect(document.querySelectorAll('[data-joint]')).toHaveLength(4);
        setFlags(g[k]);
        h.click(SEND);
        h.advance(2.8);
        h.advance(1);
      }
    }
  });

  it('level 1 cycles unset, joined, patch, joined; levels 2 to 4 cycle unset, fine, smooth, patch, fine', () => {
    h.start(1, 5);
    const b = buttons()[0];
    const seen = [b.dataset.flag];
    const text = [b.textContent];
    for (let k = 0; k < 4; k++) {
      press(b);
      seen.push(b.dataset.flag);
      text.push(b.textContent);
    }
    expect(seen).toEqual(['none', 'fine', 'gap', 'fine', 'gap']);
    expect(text).toEqual(['?', '✓ joined', '🔴 patch', '✓ joined', '🔴 patch']);
    h.start(2, 5);
    const c = buttons()[0];
    const seen2 = [c.dataset.flag];
    const text2 = [c.textContent];
    for (let k = 0; k < 5; k++) {
      press(c);
      seen2.push(c.dataset.flag);
      text2.push(c.textContent);
    }
    expect(seen2).toEqual(['none', 'fine', 'kink', 'gap', 'fine', 'kink']);
    expect(text2).toEqual(['?', '✓ fine', '🟡 smooth', '🔴 patch', '✓ fine', '🟡 smooth']);
  });

  it('a tap on a joint ring on the canvas flags it; a tap elsewhere does nothing', () => {
    h.start(2, 5);
    const g = build(2, 5);
    const n = g[0].joints.length;
    const [x, y] = jointPoint(1, n);
    h.pointer('pointerdown', x + 10, y - 8);
    expect(buttons().map((b) => b.dataset.flag)).toEqual(['none', 'fine']);
    h.pointer('pointerdown', 330, 30);
    h.pointer('pointerdown', x + 40, y + 40);
    expect(buttons().map((b) => b.dataset.flag)).toEqual(['none', 'fine']);
  });

  it('Send with an unflagged joint is free', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = build(level, 5);
      h.click(SEND);
      expect(h.feedback()).toMatch(/does not cost you anything/);
      expect(h.feedback()).toMatch(/Flag every joint first/);
      expect(h.hearts()).toBe(3);
      expect(h.phase()).toBe('play');
      if (g[0].joints.length > 1) {
        // the unset state is only the start (there is no way back to it): flag all but the last joint
        buttons().slice(0, g[0].joints.length - 1).forEach((x) => press(x));
        h.click(SEND);
        expect(h.feedback()).toMatch(/Flag every joint first/);
        expect(h.hearts()).toBe(3);
        expect(h.phase()).toBe('play');
      }
    }
  });

  it('the zoom drone needs a tapped joint first (free), costs the round’s one charge, then says No charges left', () => {
    h.start(2, 5);
    playTo(2, 1);
    expect(h.hud()).toMatch(/Round 2 of 3/);
    expect(h.hud()).toMatch(/Charges ⚡/);
    h.click(ZOOMB);
    expect(h.feedback()).toMatch(/Tap a joint first/);
    expect(h.feedback()).toMatch(/does not cost you anything/);
    expect(h.hud()).toMatch(/Charges ⚡/);
    press(buttons()[0]);
    h.click(ZOOMB);
    expect(h.feedback()).toMatch(/Zoom drone at x = /);
    expect(h.hud()).toMatch(/Charges ·/);
    h.click(ZOOMB);
    expect(h.feedback()).toMatch(/No charges left/);
  });

  it('in round 1 the zoom is live, so the button is free and keeps the charge', () => {
    h.start(2, 5);
    h.click(ZOOMB);
    expect(h.feedback()).toMatch(/Tap a joint first/);
    press(buttons()[0]);
    h.click(ZOOMB);
    expect(h.feedback()).toMatch(/Round 1: the zoom already shows/);
    expect(h.feedback()).toMatch(/does not cost you anything/);
    expect(h.hud()).toMatch(/Charges ⚡/);
  });

  it('a win says Slide approved! with the working, a miss names the joint where the first fault is', () => {
    h.start(2, 5);
    const g = build(2, 5);
    setFlags(g[0]);
    h.click(SEND);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/^Slide approved! x = /);
    expect(h.hearts()).toBe(3);
    h.advance(1);
    setWrong(g[1]);
    h.click(SEND);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/^Sir Quacks stopped at the joint at x = /);
    expect(h.hearts()).toBe(2);
  });

  it('the hint line fades round by round: live zoom, a zoom drone, then none', () => {
    h.start(2, 5);
    expect(h.note()).toMatch(/Round 1: the zoom shows the joint you last tapped/);
    const g = playTo(2, 1);
    expect(h.note()).toMatch(/No zoom: a zoom drone costs a charge/);
    setFlags(g[1]);
    h.click(SEND);
    h.advance(3.8);
    expect(h.note()).toMatch(/Boss round: no zoom/);
    expect(h.note()).toContain(`Blueprint: ${g[2].name}`);
  });

  it('the joint buttons lock while the duck rides', () => {
    h.start(2, 5);
    const g = build(2, 5);
    setFlags(g[0]);
    expect(buttons()[0].hasAttribute('disabled')).toBe(false);
    h.click(SEND);
    h.advance(0.3);
    expect(h.phase()).toBe('resolve');
    expect(buttons()[0].hasAttribute('disabled')).toBe(true);
    const before = buttons().map((b) => b.dataset.flag);
    press(buttons()[0]);
    expect(buttons().map((b) => b.dataset.flag)).toEqual(before);
  });

  it('the verdict lands when the duck reaches the fault: hearts and score do not move before it', () => {
    for (const level of LEVELS) {
      const g = build(level, 5);
      h.start(level, 5);
      setWrong(g[0]);
      const fault = firstFault(g[0], buttons().map((b) => (b.dataset.flag === 'none' ? null : b.dataset.flag)) as Flag[])!;
      const vt = verdictTime(g[0], fault);
      h.click(SEND);
      h.advance(vt - 0.15);
      expect(h.hearts()).toBe(3);
      h.advance(0.3);
      expect(h.hearts()).toBe(2);
      h.start(level, 5);
      setFlags(g[0]);
      h.click(SEND);
      h.advance(verdictTime(g[0], null) - 0.15);
      expect(h.score()).toBe(0);
      h.advance(0.3);
      expect(h.score()).toBeGreaterThan(0);
    }
  });
});

// A canvas recorder: every string drawn, every stroke (colour, dash, the points of the path) and every fill colour.
const recorder = () => {
  const rec = { at: [] as { s: string; x: number; y: number }[], strokes: [] as { style: string; dash: boolean; pts: [number, number][] }[], fills: [] as string[], sizes: [] as number[], arcs: [] as { x: number; y: number; r: number }[] };
  const store: Record<string, unknown> = {};
  let pts: [number, number][] = [];
  let dash = false;
  const proxy = new Proxy(store, {
    get: (_t, p) => {
      if (p === 'fillText') return (s: string, x: number, y: number) => (rec.at.push({ s: String(s), x, y }), rec.sizes.push(Number(/(\d+(\.\d+)?)px/.exec(String(store.font))?.[1] ?? 99)));
      if (p === 'arc') return (x: number, y: number, r: number) => rec.arcs.push({ x, y, r });
      if (p === 'beginPath') return () => (pts = []);
      if (p === 'moveTo' || p === 'lineTo') return (x: number, y: number) => pts.push([x, y]);
      if (p === 'setLineDash') return (a: number[]) => (dash = a.length > 0);
      if (p === 'stroke') return () => rec.strokes.push({ style: String(store.strokeStyle), dash, pts: [...pts] });
      if (p === 'fill' || p === 'fillRect') return () => rec.fills.push(String(store.fillStyle));
      return () => undefined;
    },
    set: (_t, p, v) => {
      store[String(p)] = v;
      return true;
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(proxy as never);
  const clear = () => {
    rec.at.length = 0;
    rec.strokes.length = 0;
    rec.fills.length = 0;
    rec.sizes.length = 0;
    rec.arcs.length = 0;
  };
  return { rec, clear };
};
type R =ReturnType<typeof recorder>;
const frame = (r: R, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  r.clear();
  h.advance(0.05);
  return r.rec;
};
/** The zoom's own marks: the left and right pieces of the real graph, drawn in two colours found nowhere else. */
const zoomDrawn = (rec: R['rec']) => rec.strokes.some((s) => s.style === ZOOM.left || s.style === ZOOM.right);
const lensDrawn = (rec: R['rec']) => rec.at.some((a) => a.s.startsWith('ZOOM'));
const zoomFlag = () => h.$('canvas')!.dataset.zoom;

describe('Splash Patrol never leaks the shape of f', () => {
  for (const level of LEVELS) {
    it(`level ${level}: the zoom is live in round 1 (for the last tapped joint only), shows for 1.5 s after a drone in round 2, and never in round 3`, () => {
      const R = recorder();
      h.start(level, 5);
      const g0 = build(level, 5);
      // round 1: nothing tapped yet, no curves; the last tapped joint appears live
      let rec = frame(R);
      expect(zoomDrawn(rec)).toBe(false);
      expect(zoomFlag()).toBe('0');
      const last = g0[0].joints.length - 1;
      press(buttons()[last]);
      rec = frame(R);
      expect(zoomDrawn(rec)).toBe(true);
      expect(zoomFlag()).toBe('1');
      expect(h.$('canvas')!.dataset.zoomJoint).toBe(String(last));
      press(buttons()[0]);
      frame(R);
      expect(h.$('canvas')!.dataset.zoomJoint).toBe('0');
      // round 2: hidden at any tap; a drone shows it for 1.5 s, once
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      rec = frame(R, 0.3);
      expect(zoomDrawn(rec) || lensDrawn(rec)).toBe(false);
      expect(zoomFlag()).toBe('0');
      for (let i = 0; i < g[1].joints.length; i++) {
        press(buttons()[i]);
        rec = frame(R);
        expect(zoomDrawn(rec) || lensDrawn(rec)).toBe(false);
        expect(zoomFlag()).toBe('0');
      }
      press(buttons()[0]);
      h.click(ZOOMB);
      expect(zoomDrawn(frame(R, 0.3))).toBe(true);
      expect(zoomFlag()).toBe('1');
      expect(zoomDrawn(frame(R, 1.0))).toBe(true);
      expect(zoomDrawn(frame(R, 0.5))).toBe(false);
      expect(lensDrawn(R.rec)).toBe(false);
      expect(zoomFlag()).toBe('0');
      h.click(ZOOMB);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(zoomDrawn(frame(R, 0.5))).toBe(false);
      // round 3: never, at any tap, even when every flag is right; the drone is refused
      setFlags(g[1]);
      h.click(SEND);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (let i = 0; i < g[2].joints.length; i++) {
        press(buttons()[i]);
        rec = frame(R, 0.1);
        expect(zoomDrawn(rec) || lensDrawn(rec)).toBe(false);
        expect(zoomFlag()).toBe('0');
      }
      setFlags(g[2]);
      expect(zoomDrawn(frame(R))).toBe(false);
      h.click(ZOOMB);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(zoomDrawn(frame(R, 0.5))).toBe(false);
      expect(lensDrawn(R.rec)).toBe(false);
      expect(zoomFlag()).toBe('0');
    });
  }

  it('the slide on screen is the same picture for every blueprint, level and seed: it is never the graph of f', () => {
    const R = recorder();
    const tubeOf = (level: number, seed: number) => {
      h.start(level, seed);
      const rec = frame(R);
      return JSON.stringify(rec.strokes.filter((s) => s.style === TUBE_FILL).map((s) => s.pts));
    };
    const ref = tubeOf(1, 5);
    expect(ref.length).toBeGreaterThan(200);
    for (const [level, seed] of [[1, 99], [2, 5], [3, 5], [3, 77], [4, 5], [4, 31]] as [number, number][]) expect(tubeOf(level, seed)).toBe(ref);
    // and across rounds
    h.start(2, 5);
    playTo(2, 2);
    expect(JSON.stringify(frame(R).strokes.filter((s) => s.style === TUBE_FILL).map((s) => s.pts))).toBe(ref);
  });

  it('joint rings sit at evenly spaced fractions of the fixed slide, whatever the blueprint, and the slide is the briefed S-curve', () => {
    expect(slideAt(0)).toEqual([90, 70]);
    expect(slideAt(1)[0]).toBeCloseTo(470, 6);
    expect(slideAt(1)[1]).toBeCloseTo(280, 6);
    for (const level of LEVELS) {
      for (const pool of POOLS[level]) {
        for (const row of pool) {
          const n = row.joints.length;
          const pts = row.joints.map((_, i) => jointPoint(i, n));
          for (let i = 0; i < n; i++) expect(pts[i]).toEqual(slideAt((i + 1) / (n + 1)));
        }
      }
    }
  });

  it('the blueprint sign and the joint labels are the only places the formula appears; no axis numbers are drawn on the slide', () => {
    const R = recorder();
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = build(level, 5);
      const rec = frame(R);
      const texts = rec.at.map((a) => a.s);
      for (const line of g[0].lines) expect(texts).toContain(line);
      expect(texts).toContain('BLUEPRINT');
      for (const j of g[0].joints) expect(texts).toContain(`x = ${j.cText}`);
      // nothing else on the tube drawn as a bare number or value
      expect(texts.filter((s) => /^[−-]?\d+(\.\d+)?$/.test(s)).every((s) => /^[1-4]$/.test(s))).toBe(true);
    }
  });

  it('a flagged joint is drawn exactly as flagged: a kink flag never changes where the duck is, and unset joints show ?', () => {
    const R = recorder();
    h.start(2, 5);
    let rec = frame(R);
    expect(rec.at.filter((a) => a.s === '?').length).toBeGreaterThanOrEqual(2);
    press(buttons()[0]);
    rec = frame(R);
    expect(rec.at.some((a) => a.s === '✓ FINE')).toBe(true);
  });
});

/** Every joint right except joint `i`, which gets flag `f`. */
function setOneWrong(r: Round, i: number, f: Exclude<Flag, null>) {
  setFlags(r);
  const b = buttons()[i];
  for (let k = 0; k < 4 && b.dataset.flag !== f; k++) press(b);
}
const FAULT_TAG = /^⚠ FAULT at x = /;

describe('a miss says where the first fault is, and nothing else', () => {
  it('the one fault of every wrong assignment is the first wrong joint: one marker "⚠ FAULT at x = …" there, the duck stops there, and only the crews the player ordered work', () => {
    for (const level of LEVELS) {
      for (const seed of [5, 19, 33]) {
        const R = recorder();
        h.start(level, seed);
        const g = build(level, seed);
        setAllWrong(g[0]);
        const flags = buttons().map((b) => (b.dataset.flag === 'none' ? null : b.dataset.flag)) as Flag[];
        const fault = firstFault(g[0], flags)!;
        expect(fault).not.toBeNull();
        h.click(SEND);
        let tags = 0;
        for (let step = 0; step < 46; step++) {
          const rec = frame(R);
          expect(h.$('canvas')!.dataset.fault).toBe(`joint:${fault.joint}`);
          const crew = flags.map((f, i) => (f === 'gap' || f === 'kink' ? `${i}:${f}` : '')).filter(Boolean).join(',');
          expect(h.$('canvas')!.dataset.crew).toBe(crew);
          const marks = rec.at.filter((a) => FAULT_TAG.test(a.s));
          expect(marks.length).toBeLessThanOrEqual(1);
          for (const m of marks) expect(m.s).toBe(`⚠ FAULT at x = ${g[0].joints[fault.joint].cText}`);
          tags = Math.max(tags, marks.length);
          // none of the old kind-specific effects
          expect(rec.at.some((a) => /STOP|LEAK|KINK|WRONG REPAIR/.test(a.s))).toBe(false);
        }
        expect(tags).toBe(1);
        expect(h.$('canvas')!.dataset.duck).toMatch(/^stuck:/);
        h.advance(0.5);
        expect(h.phase()).not.toBe('resolve');
      }
    }
  });

  it('two wrong flags at the same joint give the same miss text, the same marker and the same duck, frame by frame', () => {
    for (const level of LEVELS) {
      const g = build(level, 5);
      const r = g[0];
      const flagSet: Exclude<Flag, null>[] = level === 1 ? ['fine', 'gap'] : ['fine', 'kink', 'gap'];
      for (let i = 0; i < r.joints.length; i++) {
        const wrong = flagSet.filter((f) => f !== want(level, r.joints[i]));
        if (wrong.length < 2) continue;
        const runs = wrong.map((f) => {
          const R = recorder();
          h.start(level, 5);
          setOneWrong(r, i, f);
          h.click(SEND);
          const trace: string[] = [];
          for (let step = 0; step < 46; step++) {
            const rec = frame(R);
            const c = h.$('canvas')!;
            trace.push(`${c.dataset.fault}|${c.dataset.duck}|${rec.at.filter((a) => FAULT_TAG.test(a.s)).map((a) => `${a.s}@${Math.round(a.x)},${Math.round(a.y)}`).join(';')}`);
          }
          h.advance(0.5);
          return { text: h.feedback(), trace, hearts: h.hearts() };
        });
        for (const x of runs.slice(1)) {
          expect(x.text).toBe(runs[0].text);
          expect(x.trace).toEqual(runs[0].trace);
          expect(x.hearts).toBe(runs[0].hearts);
        }
        expect(runs[0].hearts).toBe(2);
      }
    }
  });

  it('every miss costs one heart and its text holds no word of the kind of fault', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = build(level, 5);
      setWrong(g[0]);
      h.click(SEND);
      h.advance(2.8);
      expect(h.hearts()).toBe(2);
      expect(h.feedback()).not.toMatch(/leak|bent|bend|welder|needless|dropped|flew|whistle|nobody/i);
    }
  });

  it('a win shows no fault at all, and every crew the player ordered', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = build(level, 5);
      setFlags(g[0]);
      h.click(SEND);
      h.advance(0.5);
      expect(h.$('canvas')!.dataset.fault).toBe('');
      const crew = g[0].joints.map((j, i) => (want(level, j) === 'fine' ? '' : `${i}:${want(level, j)}`)).filter(Boolean).join(',');
      expect(h.$('canvas')!.dataset.crew).toBe(crew);
    }
  });
});

describe('the duck’s ride fits the 2.4 s resolve and never leaves the screen', () => {
  it('for every row and every fault the duck has landed (or stopped) well inside the resolve, on screen, never below the ground', () => {
    for (const level of LEVELS) {
      for (const pool of POOLS[level]) {
        for (const row of pool) {
          const r: Round = { ...row, level, assist: 0 };
          const faults = [null, ...row.joints.map((_, joint) => ({ joint }))];
          for (const f of faults) {
            for (let rt = 0; rt <= RESOLVE; rt += 0.05) {
              const p = duckPose(r, f, rt);
              expect(p.x).toBeGreaterThan(0);
              expect(p.x).toBeLessThan(640);
              expect(p.y).toBeLessThanOrEqual(GROUND + 2);
              expect(p.y).toBeGreaterThan(0);
            }
            const end = duckPose(r, f, RESOLVE - 0.01);
            if (!f) expect(end.state).toBe('float');
            else {
              // every fault is the same: the duck stops at its joint, still on the slide
              expect(end.state).toBe('stuck');
              expect(end.landedAt).toBeNull();
              expect(end.u).toBeLessThan(1);
              expect(verdictTime(r, f)).toBeLessThan(RESOLVE - 0.5);
            }
          }
        }
      }
    }
  });

  it('on the way to a fault the duck is exactly where it is on the way to a win (the ride gives nothing away)', () => {
    const r: Round = { ...POOLS[2][1][0], level: 2, assist: 0 };
    for (let rt = 0; rt < 0.8; rt += 0.05) {
      const win = duckPose(r, null, rt);
      const p = duckPose(r, { joint: 0 }, rt);
      expect([p.x, p.y, p.ang, p.state]).toEqual([win.x, win.y, win.ang, win.state]);
    }  });
});

describe('Splash Patrol UX', () => {
  const said = (rec: R['rec']) => rec.at.map((a) => a.s);
  it('the goal is drawn on the canvas at the start of every round and is gone after 3 s', () => {
    const R = recorder();
    h.start(2, 5);
    expect(said(frame(R))).toContain(GOAL);
    expect(said(frame(R, 2.0))).toContain(GOAL);
    expect(said(frame(R, 1.5))).not.toContain(GOAL);
    playTo(2, 1);
    expect(said(frame(R, 0.3))).toContain(GOAL);
    expect(said(frame(R, 3.2))).not.toContain(GOAL);
    playTo(2, 2);
    expect(h.hud()).toMatch(/Round 3 of 3/);
    expect(said(frame(R, 0.3))).toContain(GOAL);
  });

  it('every joint ring is at least 18 px, and level 1 round 1 pulses a tap cue on joint 1 until the first tap', () => {
    const R = recorder();
    h.start(1, 5);
    const n = build(1, 5)[0].joints.length;
    const rec = frame(R);
    expect(said(rec)).toContain('☝ tap');
    for (let i = 0; i < n; i++) {
      const [x, y] = jointPoint(i, n);
      expect(rec.arcs.some((a) => Math.abs(a.x - x) < 0.01 && Math.abs(a.y - y) < 0.01 && a.r >= 18)).toBe(true);
    }
    press(buttons()[0]);
    expect(said(frame(R))).not.toContain('☝ tap');
    h.start(2, 5);
    expect(said(frame(R))).not.toContain('☝ tap');
  });

  it('the scene text is at least 11 px, every control is labelled, and each round has its own light', () => {
    const R = recorder();
    for (const level of LEVELS) {
      h.start(level, 5);
      frame(R, 0.5);
      expect(Math.min(...R.rec.sizes)).toBeGreaterThanOrEqual(11);
      for (const el of document.body.querySelectorAll('button, input')) expect(el.getAttribute('aria-label')).toBeTruthy();
    }
    const tints: string[] = [];
    for (const round of [0, 1, 2]) {
      h.start(1, 5);
      playTo(1, round);
      frame(R, 0.3);
      tints.push(R.rec.fills.find((f) => /^rgba\((255,110,60|20,10,80)/.test(f)) ?? '');
    }
    expect(new Set(tints).size).toBe(3);
  });
});

describe('no console error while every kind of fault plays out', () => {
  it('a fault at any joint and a win animate cleanly', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of LEVELS) {
      for (const seed of [5, 21]) {
        h.start(level, seed);
        const g = build(level, seed);
        setAllWrong(g[0]);
        h.click(SEND);
        h.advance(3);
        setFlags(g[0]);
        h.click(SEND);
        h.advance(3.5);
      }
    }
    expect(err).not.toHaveBeenCalled();
  });
});
