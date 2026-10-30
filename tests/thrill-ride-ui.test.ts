// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/mathematics/class-12/ch07-integrals/thrill-ride/index';
import { KNOB } from '../src/games/mathematics/class-12/ch07-integrals/thrill-ride/art';
import { PYLONS, buildRounds, firstFault, q4, testText, verdictTime, type Round } from '../src/games/mathematics/class-12/ch07-integrals/thrill-ride/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'thrill-ride', 5);
const set = (r: Round, bump = 0) => r.ans.forEach((v, i) => h.setSlider(v + (i === 0 ? bump : 0), i));

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4, 5],
  build: (level, seed) => buildRounds(level as 1 | 2 | 3 | 4 | 5, createRng(seed)),
  setRight: (g, k) => set(g[k]),
  setWrong: (g, k) => set(g[k], g[k].ans[0] < 8 ? 1 : -1),
  commit: () => h.click('Send the test car'),
});

const SEND = 'Send the test car';
const TEST = 'Test lay: show the track for a moment and count the clips it fits';
const CYAN = '#4de1ff';
const build = (level: number, seed: number) => buildRounds(level as 1 | 2 | 3 | 4 | 5, createRng(seed));
const wrongBump = (r: Round) => (r.ans[0] < 8 ? 1 : -1);

// A canvas recorder: every string drawn (with its position) and every stroke (with its colour and the number of points in its path).
const recorder = () => {
  const rec = { texts: [] as string[], at: [] as { s: string; x: number; y: number }[], strokes: [] as { style: string; n: number }[], sizes: [] as number[] };
  const store: Record<string, unknown> = {};
  let n = 0;
  const proxy = new Proxy(store, {
    get: (_t, p) => {
      if (p === 'fillText') return (s: string, x: number, y: number) => (rec.texts.push(String(s)), rec.at.push({ s: String(s), x, y }), rec.sizes.push(Number(/(\d+(\.\d+)?)px/.exec(String(store.font))?.[1] ?? 99)));
      if (p === 'beginPath') return () => (n = 0);
      if (p === 'lineTo') return () => n++;
      if (p === 'stroke') return () => rec.strokes.push({ style: String(store.strokeStyle), n });
      return () => undefined;
    },
    set: (_t, p, v) => {
      store[String(p)] = v;
      return true;
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(proxy as never);
  const clear = () => {
    rec.texts.length = 0;
    rec.at.length = 0;
    rec.strokes.length = 0;
    rec.sizes.length = 0;
  };
  return { rec, clear };
};
const TRACK_POINTS = 100;
const trackDrawn = (rec: ReturnType<typeof recorder>['rec']) => rec.strokes.some((s) => s.style === CYAN && s.n >= TRACK_POINTS);
/** The last frame the scene draws after advancing by `dt` (one frame is 0.05 s). */
const frame = (r: ReturnType<typeof recorder>, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  r.clear();
  h.advance(0.05);
  return r.rec;
};
const masts = () => h.$('canvas')!.dataset.masts;
const shown = () => h.$('canvas')!.dataset.trackShown;
const setAll = (r: Round, bump = 0) => set(r, bump);
const playTo = (level: number, round: number, seed = 5) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    set(g[k]);
    h.click(SEND);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};

describe('Thrill Ride', () => {
  it('has 2 sliders in levels 1, 3, 4 and 5 and 3 in level 2, from −8 to 8 in steps of 1, all starting at 0', () => {
    for (const [level, n] of [[1, 2], [2, 3], [3, 2], [4, 2], [5, 2]] as const) {
      h.start(level, 5);
      expect(h.sliders().length).toBe(n);
      for (const s of h.sliders()) {
        expect(Number(s.step)).toBe(1);
        expect(Number(s.min)).toBe(-8);
        expect(Number(s.max)).toBe(8);
        expect(Number(s.value)).toBe(0);
      }
    }
  });

  it('the readouts write the knobs in quarters with a true minus sign', () => {
    h.start(1, 5);
    h.setSlider(-2, 0);
    h.setSlider(1, 1);
    const text = h.$('.lab-controls')!.textContent!;
    expect(text).toContain(q4(-2));
    expect(text).toContain('−1/2');
    expect(text).toContain('1/4');
  });

  it('a miss says flew off, names a pylon and too steep or too shallow, and never a coefficient or the antiderivative', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      h.start(level, 5);
      const r = build(level, 5)[0];
      setAll(r, wrongBump(r));
      h.click(SEND);
      h.advance(2.8);
      expect(h.feedback()).toMatch(/flew off/);
      expect(h.feedback()).toMatch(/pylon [1-8] too (steep|shallow)/);
      expect(h.feedback()).not.toContain(r.answerText);
      for (const k of r.keys) expect(h.feedback()).not.toContain(`${k} =`);
      expect(h.hearts()).toBe(2);
    }
  });

  it('the test lay costs a charge: a count of clips, then No charges left', () => {
    h.start(1, 5);
    h.click(TEST);
    expect(h.feedback()).toMatch(/of the 8 clips/);
    expect(h.hud()).toMatch(/Charges ·/);
    h.click(TEST);
    expect(h.feedback()).toMatch(/No charges left/);
  });

  it('the test lay reports the clips the player’s own track fits: 8 of 8 only at the winning setting', () => {
    h.start(2, 5);
    const r = build(2, 5)[0];
    setAll(r, wrongBump(r));
    h.click(TEST);
    expect(h.feedback()).toBe(testText(r, r.ans.map((v, i) => v + (i === 0 ? wrongBump(r) : 0))));
    expect(h.feedback()).not.toMatch(/8 of the 8/);
    h.start(2, 5);
    setAll(r);
    h.click(TEST);
    expect(h.feedback()).toMatch(/8 of the 8 clips/);
  });

  it('a win says rode the whole track, gives the antiderivative with + C and shows RIDE COMPLETE', () => {
    const R = recorder();
    h.start(1, 5);
    set(build(1, 5)[0]);
    h.click(SEND);
    R.clear();
    h.advance(2.8);
    expect(h.feedback()).toMatch(/rode the whole track/);
    expect(h.feedback()).toMatch(/\+ C\./);
    expect(R.rec.texts).toContain('RIDE COMPLETE!');
    expect(h.hearts()).toBe(3);
  });

  it('the verdict lands when the car reaches the faulty pylon, not before: 1.9 s for a win', () => {
    for (const bump of [1, -1]) {
      h.start(1, 5);
      const r = build(1, 5)[0];
      const c = r.ans.map((v, i) => v + (i === 0 ? bump : 0));
      const t = verdictTime(r, c);
      setAll(r, bump);
      h.click(SEND);
      h.advance(t - 0.15);
      expect(h.hearts()).toBe(3);
      h.advance(0.3);
      expect(h.hearts()).toBe(2);
    }
    h.start(1, 5);
    set(build(1, 5)[0]);
    h.click(SEND);
    h.advance(1.8);
    expect(h.score()).toBe(0);
    h.advance(0.2);
    expect(h.score()).toBeGreaterThan(0);
  });

  it('round 3 has no charge and no test lay, and the note says so', () => {
    h.start(1, 5);
    playTo(1, 2);
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
    h.click(TEST);
    expect(h.feedback()).toMatch(/No charges left/);
    expect(h.note()).toMatch(/Boss round: no preview/);
  });

  it('the hint line fades round by round', () => {
    h.start(1, 5);
    expect(h.note()).toMatch(/track shows live as you turn the knobs/);
    expect(h.note()).toContain(build(1, 5)[0].form);
    playTo(1, 1);
    expect(h.note()).toMatch(/test lay costs a charge/);
  });

  it('every wrong setting kinks visibly at the first pylon it does not fit: at least 12 degrees, and the pylon named in the text', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4, 5]) {
      const r = build(level, 11)[0];
      const settings = [r.ans.map(() => 0), ...r.ans.flatMap((v, i) => [1, -1, 3].map((d) => r.ans.map((w, j) => (j === i ? Math.max(-8, Math.min(8, v + d)) : w))))].filter((c) => c.some((v, i) => v !== r.ans[i]));
      for (const c of settings) {
        h.start(level, 11);
        c.forEach((v, i) => h.setSlider(v, i));
        h.click(SEND);
        h.advance(0.5);
        const f = firstFault(r, c)!;
        expect(h.$('canvas')!.dataset.fault).toBe(String(f.pylon + 1));
        expect(Number(h.$('canvas')!.dataset.kink)).toBeGreaterThanOrEqual(12);
        h.advance(2.5);
        expect(h.hearts()).toBe(2);
        expect(h.feedback()).toContain(`pylon ${f.pylon + 1} ${f.steep ? 'too steep' : 'too shallow'}`);
      }
    }
    expect(err).not.toHaveBeenCalled();
  });

  it('the winning setting has no kink at all and the car rides on', () => {
    h.start(3, 11);
    set(build(3, 11)[0]);
    h.click(SEND);
    h.advance(1.0);
    expect(h.$('canvas')!.dataset.kink).toBeUndefined();
    expect(h.$('canvas')!.dataset.fault).toBeUndefined();
    h.advance(1.8);
    expect(h.hearts()).toBe(3);
  });

  it('the miss burst and the −1 float land at the same fixed point whichever setting was wrong, never at anything that depends on the answer', () => {
    const spots: string[] = [];
    for (const [level, bump] of [[1, 1], [1, -1], [2, 1], [3, 1], [5, -1]] as const) {
      const R = recorder();
      h.start(level, 11);
      const r = build(level, 11)[0];
      setAll(r, bump);
      h.click(SEND);
      R.clear();
      h.advance(2.8);
      const f = R.rec.at.filter((a) => a.s === '−1 ♥');
      expect(f.length).toBeGreaterThan(0);
      spots.push(...f.map((a) => String(a.x)));
    }
    expect(new Set(spots).size).toBe(1);
  });

  it('the scene never writes the antiderivative or any coefficient of the answer', () => {
    const R = recorder();
    for (const level of [1, 2, 3, 4, 5]) {
      h.start(level, 5);
      const r = build(level, 5)[0];
      const rec = frame(R, 0.5);
      expect(rec.texts).not.toContain(r.answerText);
      expect(rec.texts.some((s) => s.includes('+ C') && s.includes('dx'))).toBe(false);
      expect(rec.texts).toContain(`slope f(x) = ${r.name}`);
    }
  });

  // ---- Never leak the answer: the player's track, the masts and the end station ---------------------------------------------------------------------------

  for (const level of [1, 2, 3, 4, 5]) {
    it(`level ${level}: the track is live in round 1, shows for 1.5 s after a test lay in round 2, and never shows in round 3 until the car is sent`, () => {
      const R = recorder();
      h.start(level, 5);
      // round 1: live
      let rec = frame(R);
      expect(trackDrawn(rec)).toBe(true);
      expect(shown()).toBe('1');
      // round 2: hidden for every setting, the masts fixed
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      rec = frame(R, 0.3);
      expect(trackDrawn(rec)).toBe(false);
      expect(shown()).toBe('0');
      const hidden = masts();
      for (const bump of [0, 1, -1]) {
        setAll(g[1], bump);
        expect(trackDrawn(frame(R))).toBe(false);
        expect(masts()).toBe(hidden);
      }
      for (const key of g[1].keys.keys()) {
        for (const v of [-8, 0, 8]) {
          h.setSlider(v, key);
          frame(R);
          expect(masts()).toBe(hidden);
        }
      }
      // a test lay at the winning setting shows the track and settles the masts onto it for 1.5 s, then everything goes back
      setAll(g[1]);
      h.click(TEST);
      expect(trackDrawn(frame(R, 0.3))).toBe(true);
      expect(shown()).toBe('1');
      expect(masts()).not.toBe(hidden);
      expect(trackDrawn(frame(R, 1.0))).toBe(true);
      expect(trackDrawn(frame(R, 0.5))).toBe(false);
      expect(shown()).toBe('0');
      expect(masts()).toBe(hidden);
      // a second test lay is refused, so it never shows again
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(trackDrawn(frame(R, 0.5))).toBe(false);
      // round 3: never, for any setting, even the winning one; a test lay is refused
      h.click(SEND);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      const r3 = g[2];
      const hidden3 = masts();
      r3.ans.forEach((_a, i) => {
        for (let v = -8; v <= 8; v += 4) {
          h.setSlider(v, i);
          expect(trackDrawn(frame(R))).toBe(false);
          expect(masts()).toBe(hidden3);
        }
      });
      setAll(r3);
      expect(trackDrawn(frame(R))).toBe(false);
      expect(masts()).toBe(hidden3);
      h.click(TEST);
      expect(trackDrawn(frame(R, 0.5))).toBe(false);
      expect(shown()).toBe('0');
      // sending the car lays the track
      h.click(SEND);
      expect(trackDrawn(frame(R, 0.55))).toBe(true);
      expect(shown()).toBe('1');
    });
  }

  it('the masts of the hidden rounds are not the heights of the winning track (they differ from where the clips settle on the winning rail)', () => {
    const R = recorder();
    h.start(1, 5);
    const g = playTo(1, 1);
    frame(R, 0.3);
    const hidden = masts();
    setAll(g[1]);
    h.click(TEST);
    frame(R, 0.3);
    const onWinning = masts()!.split(',').map(Number);
    expect(onWinning.length).toBe(PYLONS);
    expect(onWinning.join(',')).not.toBe(hidden);
    const decoys = hidden!.split(',').map(Number);
    const same = decoys.filter((y, i) => Math.abs(y - onWinning[i]) < 2).length;
    expect(same).toBeLessThan(PYLONS - 1);
  });

  it('the goal is drawn on the canvas at the start of every round and is gone after 3 s', () => {
    const R = recorder();
    h.start(1, 5);
    expect(frame(R).texts).toContain('Goal: fit all 8 clips');
    expect(frame(R, 2.0).texts).toContain('Goal: fit all 8 clips');
    expect(frame(R, 1.5).texts).not.toContain('Goal: fit all 8 clips');
    playTo(1, 1);
    expect(h.hud()).toMatch(/Round 2 of 3/);
    expect(frame(R, 0.3).texts).toContain('Goal: fit all 8 clips');
    expect(frame(R, 3.2).texts).not.toContain('Goal: fit all 8 clips');
    playTo(1, 2);
    expect(h.hud()).toMatch(/Round 3 of 3/);
    expect(frame(R, 0.3).texts).toContain('Goal: fit all 8 clips');
  });

  it('the scene text is at least 11 px and every control is labelled', () => {
    const R = recorder();
    for (const level of [1, 2]) {
      h.start(level, 5);
      frame(R, 0.5);
      expect(R.rec.sizes.length).toBeGreaterThan(5);
      expect(Math.min(...R.rec.sizes)).toBeGreaterThanOrEqual(11);
      for (const el of document.body.querySelectorAll('button, input')) expect(el.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('the knob box draws only the player’s own values: the dial text follows the sliders, never the answer', () => {
    const R = recorder();
    h.start(1, 5);
    let rec = frame(R);
    expect(rec.strokes.some((s) => s.style === KNOB)).toBe(true);
    const zeros = rec.at.filter((a) => a.y > 320 && a.x > 440 && /^(−?\d+(\/\d+)?)$/.test(a.s)).map((a) => a.s);
    expect(zeros).toEqual(['0', '0']);
    h.setSlider(-3, 1);
    rec = frame(R);
    expect(rec.at.filter((a) => a.y > 320 && a.x > 440).map((a) => a.s)).toContain('−3/4');
  });

  it('every knob setting at a few positions animates through a send with no console error, and only the winning one wins', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4, 5]) {
      const r = build(level, 11)[0];
      r.ans.forEach((c, i) => {
        for (const v of [-8, 0, 8, c]) {
          h.start(level, 11);
          set(r);
          h.setSlider(v, i);
          h.click(SEND);
          h.advance(3);
          expect(h.hearts()).toBe(v === c ? 3 : 2);
        }
      });
    }
    expect(err).not.toHaveBeenCalled();
  });
});
