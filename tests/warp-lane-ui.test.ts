// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/mathematics/class-12/ch07-integrals/warp-lane/index';
import { GHOST, HIT, LANE_C, XLAND, Ux, ghostPose, racePose, tubeIn, tubeOut, uAt } from '../src/games/mathematics/class-12/ch07-integrals/warp-lane/art';
import { POOLS, RANGE, buildRounds, hintText, judge, missText, outcome, sixths, uv, winText, type Level, type Round, type Row } from '../src/games/mathematics/class-12/ch07-integrals/warp-lane/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'warp-lane', 4);
const LEVELS: Level[] = [1, 2, 3, 4];
const build = (level: number, seed: number) => buildRounds(level as Level, createRng(seed));
const set = (lo: number, hi: number, k: number) => {
  h.setSlider(lo, 0);
  h.setSlider(hi, 1);
  h.setSlider(k, 2);
};
const setAns = (r: Row) => set(r.lo, r.hi, r.k6);

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => setAns(g[k]),
  setWrong: (g, k) => set(g[k].lo + 1, g[k].hi, g[k].k6),
  commit: () => h.click('Race through the warp'),
});

const RACE = 'Race through the warp';
const TEST = 'Test lap: check the entry, the exit and the boost';

// A canvas recorder: every string drawn (with its position), every stroke colour and every fill colour.
const recorder = () => {
  const rec = { at: [] as { s: string; x: number; y: number }[], strokes: [] as string[], fills: [] as string[] };
  const store: Record<string, unknown> = {};
  const proxy = new Proxy(store, {
    get: (_t, p) => {
      if (p === 'fillText') return (s: string, x: number, y: number) => rec.at.push({ s: String(s), x, y });
      if (p === 'stroke') return () => rec.strokes.push(String(store.strokeStyle));
      if (p === 'fill') return () => rec.fills.push(String(store.fillStyle));
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
  };
  return { rec, clear };
};
type Recorder = ReturnType<typeof recorder>;
type Rec = Recorder['rec'];
const frame = (r: Recorder, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  r.clear();
  h.advance(0.05);
  return r.rec;
};
const texts = (rec: Rec) => rec.at.map((a) => a.s);
const ghostDrawn = (rec: Rec) => rec.fills.includes(GHOST) || rec.strokes.includes(GHOST);
/** Step through `seconds` of the clock one frame at a time and say whether the ghost kart was drawn in any frame. */
const ghostSeen = (r: Recorder, seconds: number) => {
  let seen = false;
  for (let i = 0; i < Math.round(seconds / 0.05); i++) seen = ghostDrawn(frame(r)) || seen;
  return seen;
};
const flag = () => h.$('canvas')!.dataset.ghost;
const playTo = (level: number, round: number, seed = 5) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    setAns(g[k]);
    h.click(RACE);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
/** One setting for each way a race can go wrong, for a round, or null where the dials cannot show it. */
const wrongs = (r: Row) => ({
  entry: [r.lo + 1, r.hi, r.k6] as const,
  exit: [r.lo, r.hi + 1, r.k6] as const,
  fast: [r.lo, r.hi, r.k6 + (r.k6 > 0 ? 1 : -1)] as const,
  slow: [r.lo, r.hi, r.k6 > 0 ? r.k6 - 1 : r.k6 + 1] as const,
});
type Kind = keyof ReturnType<typeof wrongs>;
const KINDS: Kind[] = ['entry', 'exit', 'fast', 'slow'];
const fire = (r: Row, kind: Kind) => {
  const [lo, hi, k] = wrongs(r)[kind];
  set(lo, hi, k);
  h.click(RACE);
};

describe('Warp Lane', () => {
  it('has three sliders with the ranges of the brief: the mouths from −5 to 30, the boost from −12 to 12, all in steps of 1 starting at 0', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      const s = h.sliders();
      expect(s.length).toBe(3);
      expect(s.map((x) => Number(x.min))).toEqual([-5, -5, -12]);
      expect(s.map((x) => Number(x.max))).toEqual([30, 30, 12]);
      expect(s.map((x) => Number(x.value))).toEqual([0, 0, 0]);
      expect(s.map((x) => Number(x.step))).toEqual([1, 1, 1]);
    }
  });

  it('the boost readout is written in sixths, reduced, with a true minus sign', () => {
    h.start(1, 5);
    for (const [k, w] of [[3, '×1/2'], [-6, '×−1'], [2, '×1/3'], [12, '×2'], [-3, '×−1/2'], [0, '×0']] as const) {
      h.setSlider(k, 2);
      expect(h.$('.lab-controls')!.textContent).toContain(w);
    }
  });

  it('the test lap costs a charge, says right or wrong for each part, and is refused when none are left', () => {
    h.start(1, 5);
    const g = build(1, 5);
    set(g[0].lo, g[0].hi + 1, g[0].k6 + 1);
    h.click(TEST);
    expect(h.feedback()).toBe('Test lap: the entry is right, the exit is wrong and the boost is wrong.');
    expect(h.hud()).toMatch(/Charges ·/);
    expect(h.hearts()).toBe(3);
    h.click(TEST);
    expect(h.feedback()).toMatch(/No charges left/);
    expect(h.hearts()).toBe(3);
  });

  it('a win says Clean warp! with the working, and the hint line fades round by round; round 3 has no test lap', () => {
    h.start(3, 5);
    const g = build(3, 5);
    expect(h.note()).toMatch(/Round 1: the ghost kart shows the clean line/);
    setAns(g[0]);
    h.click(RACE);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/^Clean warp!/);
    expect(h.feedback()).toBe(winText(g[0]));
    expect(h.hearts()).toBe(3);
    h.advance(1);
    expect(h.note()).toMatch(/No ghost: a test lap costs a charge/);
    setAns(g[1]);
    h.click(RACE);
    h.advance(3.8);
    expect(h.note()).toMatch(/Boss round: no ghost, no test lap/);
    h.click(TEST);
    expect(h.feedback()).toMatch(/No charges left/);
  });

  it('invalid input is free: a test lap with no charge left costs no heart', () => {
    h.start(2, 5);
    h.click(TEST);
    h.click(TEST);
    expect(h.feedback()).toMatch(/does not cost you anything/);
    expect(h.hearts()).toBe(3);
  });

  it('the verdict lands when the race gets there: a dead entry at 0.55 s, a dead exit at 1.4 s, a wrong boost at 1.5 s, a win at 1.7 s', () => {
    const g = build(1, 5);
    const when: [Kind, number][] = [['entry', 0.55], ['exit', 1.4], ['fast', 1.5], ['slow', 1.5]];
    for (const [kind, at] of when) {
      h.start(1, 5);
      fire(g[0], kind);
      h.advance(at - 0.15);
      expect(h.hearts(), kind).toBe(3);
      h.advance(0.3);
      expect(h.hearts(), kind).toBe(2);
    }
    h.start(1, 5);
    setAns(g[0]);
    h.click(RACE);
    h.advance(1.55);
    expect(h.score()).toBe(0);
    h.advance(0.3);
    expect(h.score()).toBeGreaterThan(0);
  });

  it('every miss says which part of the setting failed, and never states a right value', () => {
    for (const level of LEVELS) {
      const r = build(level, 5)[0];
      for (const kind of KINDS) {
        h.start(level, 5);
        fire(r, kind);
        h.advance(2.8);
        const [lo, hi, k] = wrongs(r)[kind];
        const text = h.feedback();
        expect(text).toBe(missText(r, { lo, hi, k }));
        expect(text).toMatch(kind === 'entry' ? /does not open at u = / : kind === 'exit' ? /exit mouth at u = / : /Both mouths were right/);
        if (kind === 'fast') expect(text).toMatch(/too fast and spun out/);
        if (kind === 'slow') expect(text).toMatch(/too slow and stalled/);
        if (kind === 'exit') expect(text.includes(`u = ${uv(r.hi)} `)).toBe(false);
        if (kind === 'entry') expect(text.includes(`u = ${uv(r.lo)}:`)).toBe(false);
        if (kind === 'fast' || kind === 'slow') expect(text.includes(`boost ${sixths(r.k6)} was`)).toBe(false);
        expect(h.hearts()).toBe(2);
      }
    }
  });

  it('a boost of the wrong sign says so, whichever way it is too fast or too slow', () => {
    h.start(3, 5);
    const r = build(3, 5)[0];
    set(r.lo, r.hi, -r.k6);
    h.click(RACE);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/facing the wrong way/);
  });

  it('the handles on the canvas drag the two mouths along the u-lane and snap to whole numbers', () => {
    h.start(1, 5);
    // the entry handle sits just above the lane, the exit handle just below it
    h.pointer('pointerdown', Ux(0), 236);
    h.pointer('pointermove', Ux(10), 236);
    expect(h.sliders()[0].value).toBe('10');
    h.pointer('pointermove', Ux(12.4), 236);
    expect(h.sliders()[0].value).toBe('12');
    h.pointer('pointerup', 0, 0);
    h.pointer('pointerdown', Ux(0), 264);
    h.pointer('pointermove', Ux(7), 264);
    expect(h.sliders()[1].value).toBe('7');
    h.pointer('pointermove', Ux(-3), 264);
    expect(h.sliders()[1].value).toBe('-3');
    h.pointer('pointerup', 0, 0);
    expect(h.sliders()[0].value).toBe('12');
    expect(Math.round(uAt(Ux(17)))).toBe(17);
  });
});

describe('Warp Lane plays what the player’s own setting did', () => {
  it('the race outcome on screen follows judge for every setting: only the answer is a win (every row, a scan of every dial)', () => {
    for (const level of LEVELS) {
      for (const seed of [5, 11, 23]) {
        for (const r of build(level, seed)) {
          for (let lo = RANGE.lo.min; lo <= RANGE.lo.max; lo += 5)
            for (let hi = RANGE.hi.min; hi <= RANGE.hi.max; hi += 5)
              for (let k = RANGE.k.min; k <= RANGE.k.max; k += 4) {
                const v = { lo, hi, k };
                const end = racePose(r, v, 2.35);
                if (judge(r, v)) expect(end.mood).toBe('cheer');
                else expect(['worried', 'dizzy']).toContain(end.mood);
                expect(outcome(r, v) === 'win').toBe(judge(r, v));
              }
          const ans = { lo: r.lo, hi: r.hi, k: r.k6 };
          const end = racePose(r, ans, 2.35);
          expect(end.mood).toBe('cheer');
          expect(end.x).toBeGreaterThanOrEqual(XLAND.finish);
          for (const kind of KINDS) {
            const [lo, hi, k] = wrongs(r)[kind];
            const miss = racePose(r, { lo, hi, k }, 2.35);
            if (miss.where === 'x' || miss.where === 'air') expect(miss.x, `${r.text} ${kind}: a miss never crosses the finish line`).toBeLessThan(XLAND.finish);
            expect(miss.mood).not.toBe('cheer');
          }
        }
      }
    }
  });

  it('every pose of every race stays on the screen and finishes inside 2.4 s', () => {
    for (const level of LEVELS) {
      for (const r of build(level, 5)) {
        for (const kind of ['win', ...KINDS] as const) {
          const v = kind === 'win' ? { lo: r.lo, hi: r.hi, k: r.k6 } : (([lo, hi, k]) => ({ lo, hi, k }))(wrongs(r)[kind]);
          for (let rt = 0; rt <= 2.4; rt += 0.05) {
            const p = racePose(r, v, rt);
            expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.rot) && Number.isFinite(p.scale)).toBe(true);
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.x).toBeLessThanOrEqual(640);
            expect(p.y).toBeLessThanOrEqual(340);
          }
        }
      }
    }
  });

  it('the miss effects are fixed: the tumble, the crash, the fling and the stall are the same whatever the error', () => {
    const r = POOLS[1][0][0];
    // a dead entry: the tumble is the same offset and drop for every wrong entry
    const tumble = (lo: number) => {
      const p = racePose(r, { lo, hi: r.hi, k: r.k6 }, 2.3);
      return [Math.round((p.x - Ux(lo)) * 1000), Math.round(p.y * 1000), Math.round(p.rot * 1000)];
    };
    expect(tumble(-4)).toEqual(tumble(9));
    expect(tumble(0)).toEqual(tumble(23));
    // a dead exit: the same bounce for every wrong exit to the right (and the mirror image to the left)
    const crash = (hi: number) => {
      const p = racePose(r, { lo: r.lo, hi, k: r.k6 }, 2.0);
      return [Math.round(Math.abs(p.x - Ux(hi)) * 1000), Math.round(p.y * 1000), Math.round(Math.abs(p.rot) * 1000)];
    };
    expect(crash(7)).toEqual(crash(25));
    expect(crash(-3)).toEqual(crash(0));
    // a fast kart: the same fling for every k that is too big; a slow one: the same stall for every k that is too small
    const fast = (k: number) => {
      const p = racePose(r, { lo: r.lo, hi: r.hi, k }, 2.1);
      return [Math.round(p.x * 1000), Math.round(p.y * 1000), Math.round(p.rot * 1000)];
    };
    expect(fast(4)).toEqual(fast(11));
    const stall = (k: number) => {
      const p = racePose(r, { lo: r.lo, hi: r.hi, k }, 1.65);
      return [Math.round(p.x * 1000), Math.round(p.y * 1000), p.where];
    };
    expect(stall(1)).toEqual(stall(2));
    expect(stall(-2)).toEqual(stall(1));
    expect(stall(-3)).toEqual(stall(2));
    expect(stall(1)[2]).toBe('tube');
  });

  it('the warp tubes join the player’s own mouths, and the entry and the exit follow the dials', () => {
    const r = POOLS[2][0][0];
    for (const [lo, hi] of [[0, 0], [14, -3], [30, 22]]) {
      const tin = tubeIn(r, { lo, hi, k: 0 });
      const tout = tubeOut(r, { lo, hi, k: 0 });
      expect(tin[3][0]).toBe(Ux(lo));
      expect(tout[0][0]).toBe(Ux(hi));
      expect(tin[0][0]).toBe(XLAND.x0);
      expect(tout[3][0]).toBe(XLAND.x1);
      expect(tin[3][1]).toBe(LANE_C);
    }
  });

  it('in level 3 the kart drives to the left along the lane when the exit is left of the entry', () => {
    for (const level of [3, 4] as const) {
      const rows = POOLS[level].flat().filter((x) => x.hi < x.lo);
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) {
        const v = { lo: r.lo, hi: r.hi, k: r.k6 };
        const a = racePose(r, v, 0.6);
        const b = racePose(r, v, 1.2);
        expect(a.where).toBe('lane');
        expect(b.x).toBeLessThan(a.x);
        expect(a.flip).toBe(true);
        expect(a.dir).toBe(-1);
      }
    }
    const fwd = POOLS[1][0][0];
    expect(racePose(fwd, { lo: fwd.lo, hi: fwd.hi, k: fwd.k6 }, 1.2).x).toBeGreaterThan(racePose(fwd, { lo: fwd.lo, hi: fwd.hi, k: fwd.k6 }, 0.6).x);
    // and on screen
    h.start(3, 5);
    const g = playTo(3, 1);
    setAns(g[1]);
    h.click(RACE);
    h.advance(0.9);
    expect(h.$('canvas')!.dataset.race).toBe('win');
    expect(h.$('canvas')!.dataset.dir).toBe('-1');
    expect(h.$('canvas')!.dataset.kart).toBe('lane');
  });

  it('the canvas says which way each race goes, from the player’s setting alone', () => {
    const r = build(1, 5)[0];
    for (const kind of KINDS) {
      h.start(1, 5);
      fire(r, kind);
      h.advance(0.3);
      expect(h.$('canvas')!.dataset.race).toBe(kind);
    }
    h.start(1, 5);
    setAns(r);
    h.click(RACE);
    h.advance(0.3);
    expect(h.$('canvas')!.dataset.race).toBe('win');
  });

  it('the miss burst and the −1 float land at the same fixed point whichever part failed', () => {
    const spots: string[] = [];
    for (const [level, kind] of [[1, 'entry'], [2, 'exit'], [3, 'fast'], [4, 'slow'], [3, 'entry'], [1, 'exit']] as const) {
      const R = recorder();
      h.start(level, 11);
      fire(build(level, 11)[0], kind);
      R.clear();
      h.advance(2.8);
      const f = R.rec.at.filter((a) => a.s === '−1 ♥');
      expect(f.length).toBeGreaterThan(0);
      spots.push(...f.map((a) => String(a.x)));
    }
    expect(new Set(spots).size).toBe(1);
    expect(spots[0]).toBe(String(HIT[0]));
  });

  it('a miss draws no boost label but the player’s own, and no finished warp text', () => {
    const R = recorder();
    for (const level of LEVELS) {
      const r = build(level, 11)[0];
      for (const kind of KINDS) {
        h.start(level, 11);
        fire(r, kind);
        R.clear();
        h.advance(2.8);
        const [, , k] = wrongs(r)[kind];
        const drawn = texts(R.rec);
        expect(drawn).toContain(`boost ×${sixths(k)}`);
        // the gauge reads the player's own boost: when only the boost is wrong, it is never the right one
        if (kind === 'fast' || kind === 'slow') expect(drawn).not.toContain(`boost ×${sixths(r.k6)}`);
        expect(drawn.some((s) => s.startsWith('Clean warp'))).toBe(false);
      }
    }
  });

  it('every race animates with no console error, and only the answer costs no heart', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of LEVELS) {
      const r = build(level, 11)[0];
      h.start(level, 11);
      setAns(r);
      h.click(RACE);
      h.advance(3);
      expect(h.hearts()).toBe(3);
      for (const kind of KINDS) {
        h.start(level, 11);
        fire(r, kind);
        h.advance(3);
        expect(h.hearts(), `${level} ${kind}`).toBe(2);
      }
      h.start(level, 11);
      set(RANGE.lo.min, RANGE.hi.max, RANGE.k.min);
      h.click(RACE);
      h.advance(3);
      expect(h.hearts()).toBe(2);
    }
    expect(err).not.toHaveBeenCalled();
  });
});

describe('Warp Lane never leaks the answer', () => {
  it('the ghost kart is the round 1 helper only', () => {
    for (const level of LEVELS) {
      const R = recorder();
      h.start(level, 5);
      // round 1: the ghost loops the clean line, whatever the dials say
      expect(ghostSeen(R, 3.7)).toBe(true);
      expect(flag()).toBe('1');
      const g = build(level, 5);
      set(g[0].lo, g[0].hi, g[0].k6 + 1);
      expect(ghostSeen(R, 3.7)).toBe(true);
      // round 2: never, at any setting
      playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(flag()).toBe('0');
      for (const [lo, hi, k] of [[0, 0, 0], [g[1].lo, g[1].hi, g[1].k6], [30, -5, 12], [-5, 30, -12]]) {
        set(lo, hi, k);
        expect(ghostSeen(R, 3.7), `level ${level} round 2 at ${lo},${hi},${k}`).toBe(false);
        expect(flag()).toBe('0');
      }
      h.click(TEST);
      expect(ghostSeen(R, 3.7)).toBe(false);
      // round 3 (the boss): never, at any setting, not even the winning one
      setAns(g[1]);
      h.click(RACE);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const [lo, hi, k] of [[0, 0, 0], [g[2].lo, g[2].hi, g[2].k6], [12, 12, 6], [-5, -5, -12]]) {
        set(lo, hi, k);
        expect(ghostSeen(R, 3.7), `level ${level} round 3 at ${lo},${hi},${k}`).toBe(false);
        expect(flag()).toBe('0');
      }
    }
  });

  it('the ghost is hidden while a race plays, also in round 1, and comes back after a miss', () => {
    const R = recorder();
    h.start(1, 5);
    const r = build(1, 5)[0];
    fire(r, 'exit');
    h.advance(0.05);
    expect(flag()).toBe('0');
    let seen = false;
    for (let i = 0; i < Math.round(2.3 / 0.05); i++) seen = ghostDrawn(frame(R)) || seen;
    expect(seen).toBe(false);
    expect(flag()).toBe('0');
    h.advance(0.6);
    expect(h.phase()).toBe('play');
    expect(ghostSeen(R, 3.7)).toBe(true);
    expect(flag()).toBe('1');
  });

  it('the ghost drives the clean line (it shows where the mouths belong) and never the boost', () => {
    for (const level of LEVELS) {
      for (const r of build(level, 5)) {
        const poses = Array.from({ length: 72 }, (_, i) => ghostPose(r, i * 0.05)).filter((p) => p !== null);
        const onLane = poses.filter((p) => p.y === LANE_C);
        expect(onLane.length).toBeGreaterThan(15);
        expect(onLane[0].x).toBeCloseTo(Ux(r.lo), 0);
        expect(onLane[onLane.length - 1].x).toBeCloseTo(Ux(r.hi), 0);
        expect(onLane.every((p) => p.flip === r.hi < r.lo)).toBe(true);
      }
    }
  });

  it('in round 3 nothing drawn before the race states the right boost, and no text on the lane names the right mouths', () => {
    const R = recorder();
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = playTo(level, 2);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      const r = g[2];
      for (const dt of [0.05, 0.4, 1, 2]) {
        const rec = frame(R, dt);
        const drawn = texts(rec);
        expect(drawn.length).toBeGreaterThan(0);
        expect(drawn).toContain('boost ×0');
        expect(drawn).not.toContain(`boost ×${sixths(r.k6)}`);
        expect(drawn.some((s) => /^u = −?\d+$/.test(s))).toBe(false);
      }
    }
  });

  it('the hint line gives the intel, the player’s own words are the only numbers: the answer is in no text before the race', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = playTo(level, 2);
      const r = g[2];
      const note = h.note();
      expect(note).toBe(hintText(r));
      expect(note).not.toMatch(/the (entry|exit) (mouth )?(is|at) u/);
      expect(note).not.toContain(`boost ${sixths(r.k6)}`);
      expect(h.$('.lab-controls')!.textContent).not.toContain(`×${sixths(r.k6)}`);
    }
  });
});
