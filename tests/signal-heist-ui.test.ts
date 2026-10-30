// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/mathematics/class-12/ch07-integrals/signal-heist/index';
import { LIQUID, SLEEVE } from '../src/games/mathematics/class-12/ch07-integrals/signal-heist/art';
import { buildFuse, buildMatch, type FuseRound, type MatchRound } from '../src/games/mathematics/class-12/ch07-integrals/signal-heist/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'signal-heist', 4);
const setBands = (r: MatchRound, bump = 0) => r.bands.forEach(([, c], i) => h.setSlider(c + (i === 0 ? bump : 0), i));

shellTests<MatchRound[]>(h, {
  levels: [1, 2, 3],
  build: (level, seed) => buildMatch(level as 1 | 2 | 3, createRng(seed)),
  setRight: (g, k) => setBands(g[k]),
  setWrong: (g, k) => setBands(g[k], g[k].bands[0][1] < 8 ? 1 : -1),
  commit: () => h.click('Transmit the tone mix to the lock'),
});
shellTests<FuseRound[]>(h, {
  levels: [4],
  build: (_level, seed) => buildFuse(createRng(seed)),
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(g[k].ans + 1),
  commit: () => h.click('Run the charge through the fuse'),
});

const TRANSMIT = 'Transmit the tone mix to the lock';
const CHARGE = 'Run the charge through the fuse';
const PEEK = 'Scope peek: show your mix on the scope for a moment';
const PROBE = 'Probe: is the net charge more or less than the rating?';
const CYAN = '#4de1ff';
const PINK = '#ff4d8d';
const buildM = (level: number, seed: number) => buildMatch(level as 1 | 2 | 3, createRng(seed));
const buildF = (seed: number) => buildFuse(createRng(seed));
const wrongBump = (r: MatchRound) => (r.bands[0][1] < 8 ? 1 : -1);

// A canvas recorder: every string drawn, every stroke (with its colour and the number of points in its path) and every filled rectangle (with its colour).
const recorder = () => {
  const rec = { texts: [] as string[], strokes: [] as { style: string; n: number }[], fills: [] as string[] };
  const store: Record<string, unknown> = {};
  let n = 0;
  const proxy = new Proxy(store, {
    get: (_t, p) => {
      if (p === 'fillText') return (s: string) => rec.texts.push(String(s));
      if (p === 'beginPath') return () => (n = 0);
      if (p === 'lineTo') return () => n++;
      if (p === 'stroke') return () => rec.strokes.push({ style: String(store.strokeStyle), n });
      if (p === 'fillRect') return () => rec.fills.push(String(store.fillStyle));
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
    rec.strokes.length = 0;
    rec.fills.length = 0;
  };
  return { rec, clear };
};
const MIX_POINTS = 300;
const mixDrawn = (rec: ReturnType<typeof recorder>['rec']) => rec.strokes.some((s) => s.style === CYAN && s.n >= MIX_POINTS);
const signalDrawn = (rec: ReturnType<typeof recorder>['rec']) => rec.strokes.some((s) => s.style === PINK && s.n >= 150);
/** The last frame the scene draws after advancing by `dt` (one frame is 0.05 s). */
const frame = (r: ReturnType<typeof recorder>, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  r.clear();
  h.advance(0.05);
  return r.rec;
};
const playMatchTo = (level: number, round: number, seed = 5) => {
  const g = buildM(level, seed);
  for (let k = 0; k < round; k++) {
    setBands(g[k]);
    h.click(TRANSMIT);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
const playFuseTo = (round: number, seed = 5) => {
  const g = buildF(seed);
  for (let k = 0; k < round; k++) {
    h.setSlider(g[k].ans);
    h.click(CHARGE);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};

describe('Signal Heist', () => {
  it('has 3 sliders in level 1, 4 in levels 2 and 3 and 1 in level 4, all at their start values', () => {
    for (const [level, n] of [[1, 3], [2, 4], [3, 4], [4, 1]] as const) {
      h.start(level, 5);
      expect(h.sliders().length).toBe(n);
      for (const s of h.sliders()) {
        expect(Number(s.step)).toBe(1);
        if (level === 4) {
          expect(Number(s.min)).toBe(0);
          expect(Number(s.max)).toBe(24);
          expect(Number(s.value)).toBe(12);
        } else {
          expect(Number(s.min)).toBe(-8);
          expect(Number(s.max)).toBe(8);
          expect(Number(s.value)).toBe(0);
        }
      }
    }
  });
  it('a level 1 miss says stun dart and gap, and never a band, a signal name or an amplitude of the answer', () => {
    h.start(1, 5);
    const r = buildM(1, 5)[0];
    setBands(r, wrongBump(r));
    h.click(TRANSMIT);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/stun dart/);
    expect(h.feedback()).toMatch(/gap/);
    expect(h.feedback()).not.toContain(r.name);
    for (const [b] of r.bands) if (b !== '1') expect(h.feedback()).not.toContain(b);
    expect(h.hearts()).toBe(2);
  });
  it('the peek costs a charge: Scope peek, then No charges left', () => {
    h.start(2, 5);
    h.click(PEEK);
    expect(h.feedback()).toMatch(/Scope peek/);
    h.click(PEEK);
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('the peek reads the player’s own mix: it lies right on the signal only at the winning amplitudes', () => {
    h.start(2, 5);
    const r = buildM(2, 5)[0];
    setBands(r, wrongBump(r));
    h.click(PEEK);
    expect(h.feedback()).toMatch(/does not lie on/);
    h.start(2, 5);
    setBands(r);
    h.click(PEEK);
    expect(h.feedback()).toMatch(/lies right on/);
  });
  it('a level 2 win says + C', () => {
    h.start(2, 5);
    setBands(buildM(2, 5)[0]);
    h.click(TRANSMIT);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/\+ C\.$/);
    expect(h.feedback()).toMatch(/^Lock open!/);
  });
  it('a level 4 miss below the answer says blew, above it says never tripped, and neither names the right rating', () => {
    for (const [d, re] of [[-1, /blew/], [1, /never tripped/]] as const) {
      h.start(4, 5);
      const r = buildF(5)[0];
      h.setSlider(r.ans + d);
      h.click(CHARGE);
      h.advance(2.8);
      expect(h.feedback()).toMatch(re);
      expect(h.hearts()).toBe(2);
    }
  });
  it('a level 4 win says vault open', () => {
    h.start(4, 5);
    h.setSlider(buildF(5)[0].ans);
    h.click(CHARGE);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/vault open/);
  });
  it('the verdict lands at 0.9 s for levels 1 to 3 and at 1.3 s for level 4, not before', () => {
    h.start(1, 5);
    const r = buildM(1, 5)[0];
    setBands(r, wrongBump(r));
    h.click(TRANSMIT);
    h.advance(0.8);
    expect(h.hearts()).toBe(3);
    h.advance(0.2);
    expect(h.hearts()).toBe(2);
    h.start(4, 5);
    h.setSlider(buildF(5)[0].ans + 1);
    h.click(CHARGE);
    h.advance(1.2);
    expect(h.hearts()).toBe(3);
    h.advance(0.2);
    expect(h.hearts()).toBe(2);
  });
  it('round 3 has no charge and no peek or probe, and the note says so', () => {
    h.start(2, 5);
    playMatchTo(2, 2);
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
    h.click(PEEK);
    expect(h.feedback()).toMatch(/No charges left/);
    expect(h.note()).toMatch(/Boss round: no peek/);
    h.start(4, 5);
    playFuseTo(2);
    h.click(PROBE);
    expect(h.feedback()).toMatch(/No charges left/);
    expect(h.note()).toMatch(/Boss round: no probe/);
  });
  it('the hint line fades round by round', () => {
    h.start(1, 5);
    expect(h.note()).toMatch(/shows live on the scope/);
    playMatchTo(1, 1);
    expect(h.note()).toMatch(/scope peek costs a charge/);
    h.start(4, 5);
    expect(h.note()).toMatch(/charge meter shows the charge as it builds/);
    playFuseTo(1);
    expect(h.note()).toMatch(/meter is dark/);
  });
  it('every setting of every slot animates through a transmit, with no console error, and only the right mix opens the lock', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3]) {
      const r = buildM(level, 11)[0];
      r.bands.forEach(([, c], i) => {
        for (const v of [-8, 0, 8, c]) {
          h.start(level, 11);
          setBands(r);
          h.setSlider(v, i);
          h.click(TRANSMIT);
          h.advance(3);
          expect(h.hearts()).toBe(v === c ? 3 : 2);
        }
      });
    }
    expect(err).not.toHaveBeenCalled();
  });
  it('every fuse rating animates through a run, with no console error, and only the net charge opens the lock', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const round of [0, 1]) {
      const r = buildF(11)[round];
      for (let k = 0; k <= 24; k += 2) {
        h.start(4, 11);
        if (round) playFuseTo(round, 11);
        h.setSlider(k);
        h.click(CHARGE);
        h.advance(3);
        expect(h.hearts()).toBe(k === r.ans ? 3 : 2);
      }
      h.start(4, 11);
      if (round) playFuseTo(round, 11);
      h.setSlider(r.ans);
      h.click(CHARGE);
      h.advance(3);
      expect(h.hearts()).toBe(3);
    }
    expect(err).not.toHaveBeenCalled();
  });

  // ---- Never leak the answer: the mix curve, the peek and the sealed meter ----------------------------------------------------------------------------

  for (const level of [1, 2, 3]) {
    it(`level ${level}: the mix curve is live in round 1, shows for 1.5 s after a peek in round 2, and never shows in round 3 until Transmit`, () => {
      const R = recorder();
      h.start(level, 5);
      const canvas = () => h.$('canvas')!;
      // round 1: the lock signal and the live mix
      let rec = frame(R);
      expect(signalDrawn(rec)).toBe(true);
      expect(mixDrawn(rec)).toBe(true);
      expect(canvas().dataset.mixShown).toBe('1');
      // the scope never writes an axis number or π; the slots write only their own band names and amplitudes
      for (const s of rec.texts) expect(s).not.toMatch(/π/);
      // round 2: hidden for every setting, shown for 1.5 s after a peek
      const g = playMatchTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      rec = frame(R, 0.3);
      expect(mixDrawn(rec)).toBe(false);
      expect(signalDrawn(rec)).toBe(true);
      expect(canvas().dataset.mixShown).toBe('0');
      for (const bump of [0, 1, -1]) {
        setBands(g[1], bump || 0);
        expect(mixDrawn(frame(R))).toBe(false);
      }
      setBands(g[1]);
      h.click(PEEK);
      expect(mixDrawn(frame(R, 0.3))).toBe(true);
      expect(canvas().dataset.mixShown).toBe('1');
      expect(mixDrawn(frame(R, 1.0))).toBe(true);
      expect(mixDrawn(frame(R, 0.5))).toBe(false);
      expect(canvas().dataset.mixShown).toBe('0');
      // a second peek in round 2 is refused, so it never shows again
      h.click(PEEK);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(mixDrawn(frame(R, 0.5))).toBe(false);
      // round 3: never, for any setting of any slot, and a peek is refused
      h.click(TRANSMIT);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      const r3 = g[2];
      r3.bands.forEach((_b, i) => {
        for (let v = -8; v <= 8; v += 4) {
          h.setSlider(v, i);
          expect(mixDrawn(frame(R))).toBe(false);
        }
      });
      setBands(r3);
      expect(mixDrawn(frame(R))).toBe(false);
      h.click(PEEK);
      expect(mixDrawn(frame(R, 0.5))).toBe(false);
      expect(canvas().dataset.mixShown).toBe('0');
      // Transmit sweeps the mix across the scope (complete at 0.8 s; from 0.9 s a win flashes both curves white)
      h.click(TRANSMIT);
      expect(mixDrawn(frame(R, 0.8))).toBe(true);
    });
  }

  it('level 1 to 3 slots draw only the player’s own amplitude: the amplitude text follows the slider, not the answer', () => {
    const R = recorder();
    h.start(1, 5);
    const r = buildM(1, 5)[0];
    let rec = frame(R);
    expect(rec.texts.filter((s) => /^(−?\d+(\/\d+)?)$/.test(s) && s !== '1')).toEqual(['0', '0', '0']);
    h.setSlider(3, 2);
    rec = frame(R);
    expect(rec.texts).toContain('3/8');
    expect(rec.texts).toContain(r.bands[0][0]);
  });

  it('level 4, round 1: the net charge is marked and the liquid follows the integral during the run', () => {
    const R = recorder();
    h.start(4, 5);
    const canvas = () => h.$('canvas')!;
    let rec = frame(R);
    expect(rec.texts).toContain('NET');
    expect(rec.fills).not.toContain(LIQUID);
    expect(rec.fills).not.toContain(SLEEVE);
    expect(canvas().dataset.meterSealed).toBe('0');
    h.setSlider(buildF(5)[0].ans + 1);
    h.click(CHARGE);
    rec = frame(R, 0.6);
    expect(rec.fills).toContain(LIQUID);
  });

  it('level 4, rounds 2 and 3: the meter is sealed, the liquid and the net-charge mark never appear, in play or in the run, hit or miss', () => {
    const R = recorder();
    h.start(4, 5);
    const g = playFuseTo(1);
    expect(h.hud()).toMatch(/Round 2 of 3/);
    for (const round of [1, 2]) {
      const canvas = () => h.$('canvas')!;
      let rec = frame(R, 0.3);
      expect(canvas().dataset.meterSealed).toBe('1');
      expect(rec.fills).toContain(SLEEVE);
      expect(rec.fills).not.toContain(LIQUID);
      expect(rec.texts).not.toContain('NET');
      // a miss: watch every frame of the whole run
      h.setSlider(g[round].ans + 1);
      h.click(CHARGE);
      R.clear();
      h.advance(2.8);
      expect(R.rec.fills).not.toContain(LIQUID);
      expect(R.rec.texts).not.toContain('NET');
      expect(R.rec.fills).toContain(SLEEVE);
      expect(h.hearts()).toBe(round === 1 ? 2 : 1);
      // the replay of the same round is sealed too
      rec = frame(R, 0.3);
      expect(canvas().dataset.meterSealed).toBe('1');
      expect(rec.fills).not.toContain(LIQUID);
      // a hit: the run is sealed as well
      h.setSlider(g[round].ans);
      h.click(CHARGE);
      R.clear();
      h.advance(2.8);
      expect(R.rec.fills).not.toContain(LIQUID);
      expect(R.rec.texts).not.toContain('NET');
      h.advance(1);
    }
  });

  it('level 4, round 2: the probe shows a direction arrow beside the fuse for 1.5 s; round 3 never shows one', () => {
    const R = recorder();
    h.start(4, 5);
    const g = playFuseTo(1);
    const arrows = (rec: ReturnType<typeof recorder>['rec']) => rec.texts.filter((s) => /^[▲▼◎]$/.test(s));
    expect(arrows(frame(R, 0.3))).toEqual([]);
    h.setSlider(g[1].ans - 3);
    h.advance(0.3);
    expect(arrows(frame(R))).toEqual([]);
    h.click(PROBE);
    expect(h.feedback()).toMatch(/more than/);
    expect(arrows(frame(R, 0.3))).toEqual(['▲']);
    expect(arrows(frame(R, 1.0))).toEqual(['▲']);
    expect(arrows(frame(R, 0.5))).toEqual([]);
    h.setSlider(g[1].ans);
    h.click(CHARGE);
    h.advance(2.8);
    h.advance(1);
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
    for (let k = 0; k <= 24; k += 4) {
      h.setSlider(k);
      expect(arrows(frame(R))).toEqual([]);
    }
    h.click(PROBE);
    expect(arrows(frame(R, 0.5))).toEqual([]);
  });

  it('a probe above the answer shows a down arrow, and an exact one shows a target mark', () => {
    const R = recorder();
    h.start(4, 5);
    const g = playFuseTo(1);
    h.setSlider(g[1].ans + 2);
    h.click(PROBE);
    expect(h.feedback()).toMatch(/less than/);
    expect(frame(R, 0.3).texts).toContain('▼');
    h.start(4, 5);
    playFuseTo(1);
    h.setSlider(g[1].ans);
    h.click(PROBE);
    expect(h.feedback()).toMatch(/exactly/);
    expect(frame(R, 0.3).texts).toContain('◎');
  });

  it('the scene writes no stray answer: level 4 draws no net charge number, and the signal name is never drawn on the canvas', () => {
    const R = recorder();
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 5);
      const rec = frame(R, 0.5);
      const name = level === 4 ? buildF(5)[0].name : buildM(level, 5)[0].name;
      expect(rec.texts).not.toContain(name);
      expect(rec.texts.some((s) => /π/.test(s))).toBe(false);
    }
  });
});
