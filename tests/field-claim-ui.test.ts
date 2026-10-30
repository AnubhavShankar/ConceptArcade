// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch04-determinants/field-claim/index';
import { DIALS, KINDS, buildRounds, type Round } from '../src/games/mathematics/class-12/ch04-determinants/field-claim/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, type CanvasRec, type Rec } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'field-claim', 4);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const keys = (r: Round) => DIALS[r.kind].map((d) => d.key);

function set(r: Round, wrong: boolean) {
  keys(r).forEach((k, i) => {
    const d = DIALS[r.kind][i];
    const off = wrong && i === 0 ? (r.ans[k] + 1 > d.max ? -1 : 1) : 0;
    h.setSlider(r.ans[k] + off, i);
  });
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => set(g[k], false),
  setWrong: (g, k) => set(g[k], true),
  commit: () => h.click('Stake the posts'),
});

describe('Field Claim', () => {
  it('each level has its dials, and the posts are in the note', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      expect(h.sliders()).toHaveLength(DIALS[KINDS[level - 1]].length);
      expect(h.note()).toMatch(/\(/);
    }
  });
  it('the mirror post gives the right area but the wrong side, and the message reads like any wrong post: a direction, no value, no hint of the mirror', () => {
    h.start(1, 5);
    const r = build(1, 5)[0];
    const B = r.pts[0][r.axis === 'x' ? 0 : 1];
    h.setSlider(2 * B - r.ans.k);
    h.click('Stake the posts');
    h.advance(3);
    expect(h.feedback()).toMatch(/too far (east|west|north|south)/);
    expect(h.feedback()).not.toMatch(/\d|right area|wrong side/);
  });
  it('a check costs a charge and a win shows the determinant formula', () => {
    h.start(2, 5);
    const g = build(2, 5);
    h.setSlider(g[0].ans.k);
    h.click('Stake the posts');
    h.advance(3);
    expect(h.feedback()).toMatch(/determinant is 0/);
    h.advance(1);
    h.click('Check the determinant of the posts');
    expect(h.feedback()).toMatch(/Check:/);
    h.click('Check the determinant of the posts');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 4 has one scale dial from 1 to 6 that starts at 1, and the posts and the deed are in the note', () => {
    h.start(4, 5);
    const [k] = h.sliders();
    expect(h.sliders()).toHaveLength(1);
    expect([k.min, k.max, k.value]).toEqual(['1', '6', '1']);
    expect(h.note()).toMatch(/\(.*\).*scales every post.*area of \d/);
  });
  it('level 4: the start setting never wins, and a miss says only too small or too big', () => {
    h.start(4, 5);
    const g = build(4, 5);
    expect(g[0].k0).toBeGreaterThan(1);
    h.click('Stake the posts');
    h.advance(3);
    expect(h.hearts()).toBe(2);
    expect(h.feedback()).toMatch(/with k = 1 the stretched field came out too small/i);
    expect(h.feedback().replace('k = 1', '')).not.toMatch(/\d/);
    h.setSlider(6);
    h.click('Stake the posts');
    h.advance(3);
    if ((g[0].k0 as number) < 6) expect(h.feedback()).toMatch(/too big/);
    expect(h.hearts()).toBe(1);
  });
  it('level 4: a survey costs a charge and gives only a direction; a win shows kⁿ', () => {
    h.start(4, 5);
    const g = build(4, 5);
    h.click('Survey the stretched field');
    expect(h.feedback()).toMatch(/Survey: with k = 1 the stretched field is smaller than the deed asks/);
    expect(h.feedback().replace('k = 1', '')).not.toMatch(/\d/);
    h.click('Survey the stretched field');
    expect(h.feedback()).toMatch(/No charges left/);
    h.setSlider(g[0].k0 as number);
    h.click('Stake the posts');
    h.advance(3);
    expect(h.feedback()).toMatch(/kⁿ/);
    expect(h.hearts()).toBe(3);
  });
  it('level 3: a miss says the line does not pass through both beacons, and never which one is on', () => {
    h.start(3, 5);
    const g = build(3, 5);
    h.setSlider(g[0].ans.m, 0);
    h.setSlider(g[0].ans.c + 1 > 12 ? g[0].ans.c - 1 : g[0].ans.c + 1, 1);
    h.click('Stake the posts');
    h.advance(3);
    expect(h.feedback()).toMatch(/does not pass through both beacons/i);
    expect(h.feedback()).not.toMatch(/beacon [12]|\d/);
  });
});

const FIRE = 'Stake the posts';
const CHECK = 'Check the determinant of the posts';
const canvas = () => h.$('canvas')!;
const frame = (R: CanvasRec, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec;
};
/** The helper of levels 1 to 3: the area readout (1), the true rope line and the area readout (2), the player's line, its equation and the ticks (3). */
const helperDrawn = (level: number, rec: Rec) =>
  level === 1
    ? rec.at.some((a) => /^area now /.test(a.s))
    : level === 2
      ? rec.at.some((a) => /^area of PQR/.test(a.s)) || rec.strokes.some((s) => s.dash)
      : rec.at.some((a) => /^y = /.test(a.s) || a.s === '✓' || a.s === '✗');
const vals = (r: Round) => keys(r).map((k) => r.ans[k]);
const setAll = (vs: number[]) => vs.forEach((x, i) => h.setSlider(x, i));
/** A wrong setting; `which` picks one of two different wrong settings. */
const off = (r: Round, which = 0) => (r.kind === 'line' ? [r.ans.m + (which ? 0 : r.ans.m >= 6 ? -1 : 1), r.ans.c + (which ? (r.ans.c >= 12 ? -1 : 1) : 0)] : [r.ans.k === 12 ? 11 : r.ans.k + 1]);
const playTo = (level: number, round: number, seed = 5) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    setAll(vals(g[k]));
    h.click(FIRE);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
const levelDials = (level: number) => DIALS[KINDS[level - 1]];

describe('Field Claim never leaks the answer (levels 1 to 3)', () => {
  for (const level of [1, 2, 3]) {
    it(`level ${level}: the helper is live in round 1, shows for 1.5 s after a paid check in round 2, and never in round 3; a miss never shows it`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const g0 = build(level, 5);
      setAll(vals(g0[0]));
      expect(helperDrawn(level, frame(R))).toBe(true);
      expect(canvas().dataset.helper).toBe('1');
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(h.note()).toMatch(/Nothing is shown: a check shows .* for a moment and costs a charge/);
      const dials = levelDials(level);
      const at = (f: (d: (typeof dials)[number]) => number) => dials.map(f);
      // round 2, before any check: nothing at any setting, the answer included
      for (const vs of [at((d) => d.start), vals(g[1]), at((d) => d.max), at((d) => d.min)]) {
        setAll(vs);
        expect(helperDrawn(level, frame(R, 0.3))).toBe(false);
        expect(canvas().dataset.helper).toBe('0');
      }
      setAll(vals(g[1]));
      h.click(CHECK);
      expect(h.feedback()).toMatch(/Check:/);
      expect(helperDrawn(level, frame(R, 0.3))).toBe(true);
      expect(helperDrawn(level, frame(R, 1.0))).toBe(true);
      expect(helperDrawn(level, frame(R, 0.5))).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
      h.click(CHECK);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(helperDrawn(level, frame(R, 0.5))).toBe(false);
      // a miss in round 2 shows neither the true line, nor the readout, nor the ticks
      setAll(off(g[1]));
      h.click(FIRE);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) expect(helperDrawn(level, frame(R, dt))).toBe(false);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      // a win shows the construction
      setAll(vals(g[1]));
      h.click(FIRE);
      expect(helperDrawn(level, frame(R, 0.5))).toBe(true);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      // round 3: never, at any setting; a check is refused; a miss shows nothing either
      for (const vs of [at((d) => d.start), vals(g[2]), at((d) => d.max)]) {
        setAll(vs);
        expect(helperDrawn(level, frame(R, 0.3))).toBe(false);
      }
      h.click(CHECK);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(helperDrawn(level, frame(R, 0.5))).toBe(false);
      setAll(off(g[2]));
      h.click(FIRE);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) expect(helperDrawn(level, frame(R, dt))).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
    });
  }

  it('two wrong settings on the same side give the same miss text and the same animation end, and the −1 float lands at one fixed point', () => {
    const xs = new Set<number>();
    for (const level of [1, 2, 3]) {
      for (const round of [1, 2]) {
        const r = build(level, 11)[round];
        const sides: number[][][] =
          level === 3
            ? [[off(r, 0), off(r, 1)]]
            : [
                [[-12], [r.ans.k - 1]],
                [[r.ans.k + 1], [12]],
              ].map((s) => s.filter((vs) => vs[0] >= -12 && vs[0] <= 12 && vs[0] !== r.ans.k));
        for (const side of sides) {
          if (side.length < 2 || (level !== 3 && side[0][0] === side[1][0])) continue;
          const seen: { text: string; strings: string[] }[] = [];
          for (const vs of side) {
            const R = canvasRecorder();
            h.start(level, 11);
            playTo(level, round, 11);
            setAll(vs);
            h.click(FIRE);
            R.clear();
            h.advance(2.8);
            const strings = new Set(R.rec.at.map((a) => a.s));
            R.rec.at.filter((a) => a.s === '−1 ♥').forEach((a) => xs.add(a.x));
            // the moving post is labelled with its own coordinates, which differ by construction
            seen.push({ text: h.feedback(), strings: [...strings].filter((s) => !/^[ABCPQR] [−-]?\d+,[−-]?\d+$/.test(s)).sort() });
          }
          expect(seen[0].text.length).toBeGreaterThan(20);
          expect(seen[0].text).toBe(seen[1].text);
          expect(seen[0].strings).toEqual(seen[1].strings);
        }
      }
    }
    expect([...xs]).toEqual([340]);
  });

  it('the start (the dials at 0) never wins, in any row of levels 1 to 3', () => {
    for (const level of [1, 2, 3]) {
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        h.start(level, seed);
        expect(h.sliders().map((s) => Number(s.value))).toEqual(levelDials(level).map((d) => d.start));
        h.click(FIRE);
        h.advance(2.8);
        expect(h.hearts()).toBe(2);
      }
    }
  });

  it('level 3: a miss draws the same fixed red rings on both beacons, whichever beacon the line meets', () => {
    const rings = (offBy: number) => {
      const R = canvasRecorder();
      h.start(3, 11);
      playTo(3, 1, 11);
      const r = build(3, 11)[1];
      setAll(off(r, offBy));
      h.click(FIRE);
      for (let i = 0; i < 40; i++) frame(R);
      return R.rec.arcs.filter((a) => a.r === 12).length;
    };
    expect(rings(0)).toBeGreaterThan(0);
    expect(rings(0)).toBe(rings(1));
  });
});
