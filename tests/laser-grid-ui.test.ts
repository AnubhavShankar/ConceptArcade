// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch11-three-dimensional-geometry/laser-grid/index';
import { buildRounds, clearance, cosOf, dot, type Round } from '../src/games/mathematics/class-12/ch11-three-dimensional-geometry/laser-grid/logic';
import { PAL } from '../src/core/arcade';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts, type CanvasRec } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'laser-grid', 6);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));

/** Set the right setting, or one step off in the first dial (away from the dial end). */
function set(r: Round, wrong: boolean) {
  r.ans.forEach((a, i) => h.setSlider(wrong && i === 0 ? (a === r.max ? a - 1 : a + 1) : a, i));
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4, 5, 6],
  build,
  setRight: (g, k) => set(g[k], false),
  setWrong: (g, k) => set(g[k], true),
  commit: () => h.click('Fire the beam'),
});

describe('Laser Grid', () => {
  it('level 1 has three numerator dials, the others one; the setup is in the note', () => {
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 5);
      expect(h.sliders()).toHaveLength(level === 1 ? 3 : 1);
      expect(h.note().length).toBeGreaterThan(40);
      expect(h.sliders().every((s) => Number(s.value) !== build(level, 5)[0].ans[0] || level === 1)).toBe(true);
    }
  });
  it('level 5 has three step dials b₁ to b₃, level 6 has six dials a₁ to b₃, all starting at 0 and away from the answer', () => {
    for (const [level, n, first] of [[5, 3, 'b₁'], [6, 6, 'a₁']] as const) {
      h.start(level, 5);
      expect(h.sliders()).toHaveLength(n);
      expect(h.$('.v-readout')?.textContent).toMatch(new RegExp(`^${first} = 0`));
      expect(h.sliders().every((s) => Number(s.value) === 0)).toBe(true);
      expect(h.sliders().every((s, i) => Number(s.value) !== build(level, 5)[0].ans[i])).toBe(true);
      expect(h.note().length).toBeGreaterThan(40);
    }
  });
  it('level 6 shows the code in the note and never gives the receiver coordinates', () => {
    h.start(6, 5);
    expect(h.note()).toContain(build(6, 5)[0].code!);
    expect(h.note()).not.toMatch(/receiver \(/);
  });
  it('the player’s beam: live in round 1, a test pulse shows it for 1.5 s in round 2, never before Fire in the boss round', () => {
    for (const level of [5, 6]) {
      h.start(level, 5);
      const g = build(level, 5);
      const shown = () => h.$('canvas')?.dataset.beamShown;
      h.setSlider(2, 0);
      h.advance(0.2);
      expect(shown()).toBe('1');
      set(g[0], false);
      h.click('Fire the beam');
      h.advance(2.8);
      h.advance(1);
      // round 2: no beam until a test pulse, then 1.5 s, then gone; the pulse costs the charge
      expect(h.hud()).toMatch(/Round 2 of 3/);
      h.setSlider(3, 0);
      h.advance(0.2);
      expect(shown()).toBe('0');
      h.click('Test pulse: fire a weak beam for this setting');
      expect(h.feedback()).toMatch(/Test pulse:/);
      h.advance(0.2);
      expect(shown()).toBe('1');
      h.advance(1.0);
      expect(shown()).toBe('1');
      h.advance(0.6);
      expect(shown()).toBe('0');
      h.click('Test pulse: fire a weak beam for this setting');
      expect(h.feedback()).toMatch(/No charges left/);
      h.advance(0.2);
      expect(shown()).toBe('0');
      set(g[1], false);
      h.click('Fire the beam');
      h.advance(2.8);
      h.advance(1);
      // boss round: never shown before Fire, and a pulse is refused
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      h.setSlider(4, 0);
      h.advance(0.3);
      expect(shown()).toBe('0');
      h.click('Test pulse: fire a weak beam for this setting');
      expect(h.feedback()).toMatch(/No charges left/);
      h.advance(0.3);
      expect(shown()).toBe('0');
      set(g[2], false);
      h.click('Fire the beam');
      h.advance(0.5);
      expect(shown()).toBe('1');
      h.advance(2.5);
      expect(h.phase()).toBe('won');
    }
  });
  it('a miss shows what the player’s own setting did, never the true line; a win shows the vector form', () => {
    h.start(5, 5);
    const g = build(5, 5);
    set(g[0], true);
    h.click('Fire the beam');
    h.advance(3.6);
    const b = g[0].ans.map((x, i) => (i === 0 ? (x === g[0].max ? x - 1 : x + 1) : x));
    expect(h.feedback()).toMatch(/missed the ring and hit the wall/);
    expect(h.feedback()).toContain(`(${b.map((x, i) => (g[0].A![i] + g[0].lam! * x < 0 ? '−' : '') + Math.abs(g[0].A![i] + g[0].lam! * x)).join(', ')})`);
    expect(h.feedback()).not.toContain(`(${g[0].B!.map((x) => (x < 0 ? '−' : '') + Math.abs(x)).join(', ')})`);
    set(g[0], false);
    h.click('Fire the beam');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/so the line is r = /);
    h.start(6, 5);
    const c = build(6, 5);
    set(c[0], true);
    h.click('Fire the beam');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/Emitter|emitter|The beam set off/);
    expect(h.feedback()).toMatch(/missed the receiver/);
    set(c[0], false);
    h.click('Fire the beam');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/Each ratio equals λ/);
  });
  it('a miss reports a reading; a check costs a charge; a win shows the working', () => {
    h.start(2, 5);
    const g = build(2, 5);
    set(g[0], true);
    h.click('Fire the beam');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/at (less|more) than a right angle/);
    h.click('Check: read the beams for this setting');
    expect(h.feedback()).toMatch(/Check/);
    h.click('Check: read the beams for this setting');
    expect(h.feedback()).toMatch(/No charges left/);
    set(g[0], false);
    h.click('Fire the beam');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/Perpendicular beams/);
  });
  it('level 1 names the length of the target vector in the working', () => {
    h.start(1, 5);
    const g = build(1, 5);
    set(g[0], false);
    h.click('Fire the beam');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/cosines/);
  });
});

// Levels 1 to 4 never leak the answer: the readings, the player's beam (level 1) and the clearance segment (level 4) are the helper;
// a miss shows only a direction.
const FIRE = 'Fire the beam';
const CHECK = 'Check: read the beams for this setting';
const READ = [/^length over/, /^dot product /, /^cos θ /, /^clearance /];
const frame = (rc: CanvasRec, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  rc.clear();
  h.advance(0.05);
  return rc.rec;
};
const readingDrawn = (rec: CanvasRec['rec'], level: number) => texts(rec).some((s) => READ[level - 1].test(s));
/** The dashed clearance segment of level 4 (the only dashed green stroke). */
const segmentDrawn = (rec: CanvasRec['rec']) => rec.strokes.some((s) => s.dash && s.style === PAL.green);
const beamShown = () => h.$('canvas')?.dataset.beamShown;
const helperFlag = () => h.$('canvas')?.dataset.helper;
const playTo = (level: number, round: number, seed: number) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    set(g[k], false);
    h.click(FIRE);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
/** The direction of the error of setting l: above or below what is wanted (levels 2 to 4). */
const side = (r: Round, l: number) =>
  r.kind === 'perp' ? dot(r.a, [l, r.b[1], r.b[2]]) > 0 : r.kind === 'angle' ? cosOf(r, l) > r.cn / r.cd : clearance(r, l) > r.T;

describe('Laser Grid levels 1 to 4 never leak the answer', () => {
  for (const level of [1, 2, 3, 4]) {
    it(`level ${level}: the helper is live in round 1, shows for 1.5 s after a check in round 2, and never in round 3, not even after a miss`, () => {
      const rc = canvasRecorder();
      h.start(level, 5);
      const rec1 = frame(rc);
      expect(readingDrawn(rec1, level)).toBe(true);
      expect(helperFlag()).toBe('1');
      if (level === 1) expect(beamShown()).toBe('1');
      if (level === 4) expect(segmentDrawn(rec1)).toBe(true);
      const g = playTo(level, 1, 5);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(h.note()).toMatch(/for a moment and costs a charge/);
      for (const a of [0, 3, g[1].ans[0]]) {
        h.setSlider(a, 0);
        const rec = frame(rc);
        expect([readingDrawn(rec, level), segmentDrawn(rec), helperFlag()]).toEqual([false, false, '0']);
        if (level === 1) expect(beamShown()).toBe('0');
      }
      h.click(CHECK);
      expect(h.feedback()).toMatch(/Check/);
      const p1 = frame(rc, 0.3);
      expect([readingDrawn(p1, level), helperFlag()]).toEqual([true, '1']);
      if (level === 1) expect(beamShown()).toBe('1');
      if (level === 4) expect(segmentDrawn(p1)).toBe(true);
      expect(readingDrawn(frame(rc, 1.0), level)).toBe(true);
      const p3 = frame(rc, 0.5);
      expect([readingDrawn(p3, level), segmentDrawn(p3), helperFlag()]).toEqual([false, false, '0']);
      if (level === 1) expect(beamShown()).toBe('0');
      h.click(CHECK);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(readingDrawn(frame(rc, 0.5), level)).toBe(false);
      // a miss in round 2: no reading and no segment while it plays or after
      set(g[1], true);
      h.click(FIRE);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) {
        const rec = frame(rc, dt);
        expect([readingDrawn(rec, level), segmentDrawn(rec)]).toEqual([false, false]);
      }
      h.advance(1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      set(g[1], false);
      h.click(FIRE);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const a of [0, 5, g[2].ans[0]]) {
        h.setSlider(a, 0);
        const rec = frame(rc);
        expect([readingDrawn(rec, level), segmentDrawn(rec), helperFlag()]).toEqual([false, false, '0']);
      }
      h.click(CHECK);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(readingDrawn(frame(rc, 0.5), level)).toBe(false);
      set(g[2], true);
      h.click(FIRE);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) {
        const rec = frame(rc, dt);
        expect([readingDrawn(rec, level), segmentDrawn(rec)]).toEqual([false, false]);
      }
      expect(helperFlag()).toBe('0');
    });
  }

  it('a win shows the helper (the reading, and in level 4 the segment) even in the boss round', () => {
    for (const level of [1, 4]) {
      const rc = canvasRecorder();
      h.start(level, 9);
      const g = playTo(level, 2, 9);
      set(g[2], false);
      h.click(FIRE);
      h.advance(1.0);
      const rec = frame(rc);
      expect(readingDrawn(rec, level)).toBe(true);
      expect(helperFlag()).toBe('1');
      if (level === 4) expect(segmentDrawn(rec)).toBe(true);
    }
  });

  it('levels 2 to 4: two wrong settings with the same error direction give the same miss text, and the −1 float lands at one fixed point', () => {
    for (const level of [2, 3, 4]) {
      for (const round of [0, 1, 2]) {
        const r = build(level, 11)[round];
        const ups: number[] = [];
        const downs: number[] = [];
        for (let l = r.min; l <= r.max; l++) if (l !== r.ans[0] && !(r.kind === 'angle' && l === 0)) (side(r, l) ? ups : downs).push(l);
        for (const group of [ups, downs]) {
          if (group.length < 2) continue;
          const seen: string[] = [];
          const xs = new Set<number>();
          for (const l of [group[0], group[group.length - 1]]) {
            const rc = canvasRecorder();
            h.start(level, 11);
            playTo(level, round, 11);
            h.setSlider(l, 0);
            h.click(FIRE);
            rc.clear();
            h.advance(2.8);
            seen.push(h.feedback());
            rc.rec.at.filter((a) => a.s === '−1 ♥').forEach((a) => xs.add(a.x));
          }
          expect(seen[0]).toBe(seen[1]);
          expect(seen[0]).not.toMatch(/\d/);
          expect([...xs]).toEqual([370]);
        }
      }
    }
  });

  it('level 1: every wrong triple gets the same words, and the −1 float lands at one fixed point', () => {
    const r = build(1, 11)[0];
    const seen = new Set<string>();
    const xs = new Set<number>();
    for (const t of [[1, 0, 0], [r.ans[0], r.ans[1], r.ans[2] + 1], [-3, 4, 5], [r.ans[0] * 2, r.ans[1] * 2, r.ans[2] * 2]]) {
      const rc = canvasRecorder();
      h.start(1, 11);
      t.forEach((x, i) => h.setSlider(Math.max(-12, Math.min(12, x)), i));
      h.click(FIRE);
      rc.clear();
      h.advance(2.8);
      seen.add(h.feedback().replace(String(r.N), '#'));
      rc.rec.at.filter((a) => a.s === '−1 ♥').forEach((a) => xs.add(a.x));
    }
    expect(seen.size).toBe(1);
    expect([...seen][0]).not.toMatch(/\d/);
    expect([...xs]).toEqual([370]);
  });

  it('the start (every dial at 0) never wins in levels 1 to 4', () => {
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 7);
      expect(h.sliders().every((s) => s.value === '0')).toBe(true);
      h.click(FIRE);
      h.advance(2.8);
      expect(h.hearts()).toBe(2);
    }
  });
});
