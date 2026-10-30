// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch12-linear-programming/rover-ridge/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch12-linear-programming/rover-ridge/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, type Rec } from './helpers/canvas-rec';
import { GRIP_MIN } from '../src/games/mathematics/class-12/ch12-linear-programming/rover-ridge/ux';

const h = arcadeHarness(game, 'rover-ridge', 5);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.kind !== undefined && r.kind !== 'value' ? 3 : r.ans === r.max ? r.ans - 1 : r.ans + 1);

const SEND = 'Send the rover';
const NOMAX = 'Declare: there is no maximum';
const NOMIN = 'Declare: there is no minimum';
const EMPTY = 'Declare: there is no feasible region';
const TOGGLE = 'Toggle: best at one corner or along a whole edge';
/** The button the next commit presses: Send for a parked value, a declaration for a no-maximum or empty round. */
let press = SEND;
const shape = () => h.$('[data-shape]')?.dataset.shape;
const setShape = (want: string) => {
  if (shape() !== want) h.click(TOGGLE);
};
/** Set the controls to the winning attempt of round k. */
function right(g: Round[], k: number, level: number) {
  const r = g[k];
  press = SEND;
  if (level === 4 && r.kind !== 'value') press = r.kind === 'nomax' ? NOMAX : EMPTY;
  else h.setSlider(r.ans);
  if (level === 5) setShape(r.edge ? 'edge' : 'corner');
}
const disabled = (label: string) => (h.$(`[aria-label="${label}"]`) as HTMLButtonElement).disabled;
/** Win rounds 1 .. k (0-based k rounds) so the next round is on screen. */
function playTo(level: number, seed: number, k: number) {
  h.start(level, seed);
  const g = build(level, seed);
  for (let i = 0; i < k; i++) {
    right(g, i, level);
    h.click(press);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
}
const seedWhere = (level: number, ok: (g: Round[]) => boolean) => {
  for (let s = 1; s < 500; s++) if (ok(build(level, s))) return s;
  throw new Error('no seed');
};

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4, 5],
  build,
  setRight: right,
  setWrong: (g, k, level) => {
    press = SEND;
    h.setSlider(wrong(g[k]));
    if (level === 5) setShape('corner');
  },
  commit: () => h.click(press),
});

describe('Rover Ridge', () => {
  it('the dial follows each round’s range, starts away from the best Z, and the inequalities are in the note', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      const g = build(level, 5);
      const s = h.sliders()[0];
      expect([Number(s.min), Number(s.max), Number(s.value)]).toEqual([g[0].min, g[0].max, g[0].start]);
      expect(Number(s.value)).not.toBe(g[0].ans);
      expect(h.note()).toContain('≤');
    }
  });
  it('a miss describes the ruler, never the best Z; a probe costs a charge; a win lists the corners', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(wrong(g[0]));
    h.click('Send the rover');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/ruler at Z/);
    h.click('Probe: see how the ruler sits at this Z');
    expect(h.feedback()).toMatch(/Probe at Z/);
    h.click('Probe: see how the ruler sits at this Z');
    expect(h.feedback()).toMatch(/No charges left/);
    h.setSlider(g[0].ans);
    h.click('Send the rover');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/Z at each corner/);
  });
  it('dragging the ruler handle moves the dial through the pointer', () => {
    h.start(1, 5);
    const g = build(1, 5);
    const r = g[0];
    // the handle starts at the ruler's midpoint; drag it to the map point (4, 3), which gives Z = 4a + 3b
    const px = 200 + 4 * 22;
    const py = 288 - 3 * 22;
    h.pointer('pointerdown', 200 + 5 * 22, 288 - 5 * 22);
    h.pointer('pointermove', px, py);
    h.pointer('pointerup', px, py);
    const z = Number(h.sliders()[0].value);
    expect([z, r.start].length).toBe(2);
    expect(z).not.toBeNaN();
  });
});

describe('Rover Ridge levels 4 and 5', () => {
  it('the dial runs 0..40 (level 4) and 0..20 (level 5), starts away from the best Z, and the note lists the constraints', () => {
    for (const [level, hi] of [[4, 40], [5, 20]]) {
      h.start(level, 5);
      const g = build(level, 5);
      const s = h.sliders()[0];
      expect([Number(s.min), Number(s.max), Number(s.value)]).toEqual([0, hi, g[0].start]);
      expect(Number(s.value)).not.toBe(g[0].ans);
      for (const c of g[0].constraints) expect(h.note()).toContain(c);
    }
    h.start(4, 5);
    expect(h.note()).toContain('declare that there is no');
    h.start(5, 5);
    expect(h.note()).toContain('Then say whether the best is at one corner or along a whole edge.');
  });

  it('level 4 has the two declaration buttons and level 5 the toggle, and each only on its own level', () => {
    h.start(4, 5);
    // round 1 asks for a smallest Z, so the first declaration reads 'No minimum'
    expect(build(4, 5)[0].goal).toBe('min');
    expect(h.$(`[aria-label="${NOMIN}"]`)).not.toBeNull();
    expect(h.$(`[aria-label="${NOMAX}"]`)).toBeNull();
    expect(h.$(`[aria-label="${EMPTY}"]`)).not.toBeNull();
    expect(h.$(`[aria-label="${TOGGLE}"]`)).toBeNull();
    h.start(5, 5);
    expect(h.$(`[aria-label="${TOGGLE}"]`)).not.toBeNull();
    expect(h.$(`[aria-label="${NOMAX}"]`)).toBeNull();
    expect(h.$(`[aria-label="${NOMIN}"]`)).toBeNull();
    h.start(3, 5);
    expect(h.$(`[aria-label="${TOGGLE}"]`)).toBeNull();
    expect(h.$(`[aria-label="${NOMAX}"]`)).toBeNull();
  });

  it('a declaration on a value round costs a heart and says only what the claim did, never what is right', () => {
    const g = (h.start(4, 5), build(4, 5));
    expect(g[0].kind).toBe('value');
    h.click(NOMIN);
    h.advance(0.1);
    expect(h.phase()).toBe('resolve');
    h.advance(2.8);
    expect(h.hearts()).toBe(2);
    expect(h.phase()).toBe('play');
    expect(h.feedback()).toMatch(/declared that there is no minimum/);
    expect(h.feedback()).not.toMatch(/least value|runs off|no plateau|no point meets|park/i);
    h.click(EMPTY);
    h.advance(2.8);
    expect(h.hearts()).toBe(1);
    expect(h.feedback()).toMatch(/declared that there is no plateau/);
    expect(h.feedback()).not.toMatch(/least value|runs off|no point meets/i);
    // the round is still the same one, and parking at the right Z still wins it
    expect(h.hud()).toMatch(/Round 1 of 3/);
    h.setSlider(g[0].ans);
    h.click(SEND);
    h.advance(2.8);
    expect(h.phase()).toBe('between');
    expect(h.hearts()).toBe(1);
  });

  it('every button locks during a run, so a second press changes nothing', () => {
    h.start(4, 5);
    h.click(NOMIN);
    h.advance(0.3);
    for (const label of [NOMIN, EMPTY, SEND]) expect(disabled(label)).toBe(true);
    h.click(EMPTY);
    h.click(SEND);
    h.advance(2.8);
    expect(h.hearts()).toBe(2);
    h.start(5, 5);
    h.click(SEND);
    h.advance(0.3);
    expect(disabled(TOGGLE)).toBe(true);
    const before = shape();
    h.click(TOGGLE);
    expect(shape()).toBe(before);
  });

  it('a no-maximum round: parking anywhere is a miss that describes only the ruler, and only the declaration wins', () => {
    const seed = seedWhere(4, (g) => g[1].kind === 'nomax');
    const g = playTo(4, seed, 1);
    expect(h.hud()).toMatch(/Round 2 of 3/);
    // this round asks for a largest Z, so the declaration button follows the goal
    expect(h.$(`[aria-label="${NOMAX}"]`)).not.toBeNull();
    expect(h.$(`[aria-label="${NOMIN}"]`)).toBeNull();
    h.setSlider(g[1].ans || 30);
    h.click(SEND);
    h.advance(2.8);
    expect(h.hearts()).toBe(2);
    expect(h.feedback()).toMatch(/ruler at Z = 30/);
    expect(h.feedback()).not.toMatch(/runs off|never found an end|no maximum|infinity/);
    h.click(NOMAX);
    h.advance(2.8);
    expect(h.phase()).toBe('between');
    expect(h.hearts()).toBe(2);
    expect(h.feedback()).toMatch(/there is no maximum/);
  });

  it('an empty round (boss): a wrong claim reads the same as on any round, parking misses, and the empty declaration wins', () => {
    const seed = seedWhere(4, (g) => g[2].kind === 'empty');
    const g = playTo(4, seed, 2);
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
    const word = g[2].goal === 'max' ? 'maximum' : 'minimum';
    h.click(`Declare: there is no ${word}`);
    h.advance(2.8);
    const claim = h.feedback();
    expect(claim).toMatch(new RegExp(`declared that there is no ${word}`));
    expect(claim).not.toMatch(/no plateau at all|no point meets/);
    h.setSlider(10);
    h.click(SEND);
    h.advance(2.8);
    expect(h.hearts()).toBe(1);
    expect(h.feedback()).not.toMatch(/no point meets|no plateau|empty/);
    h.click(EMPTY);
    h.advance(2.8);
    expect(h.phase()).toBe('won');
    expect(h.feedback()).toMatch(/cannot both hold/);
    expect(g[2].kind).toBe('empty');
  });

  it('the level 5 toggle flips data-shape, resets each round, and the right Z with the wrong shape is a miss that says so', () => {
    // round 1 is a tied edge for this seed
    const seed = seedWhere(5, (b) => b[0].edge === true);
    h.start(5, seed);
    const g = build(5, seed);
    expect(shape()).toBe('corner');
    expect(h.$('[data-shape]')?.textContent).toBe('Best at: one corner');
    h.click(TOGGLE);
    expect(shape()).toBe('edge');
    expect(h.$('[data-shape]')?.textContent).toBe('Best at: a whole edge');
    h.click(TOGGLE);
    expect(shape()).toBe('corner');
    // the right Z with "one corner" is a miss that names the edge ends
    expect(g[0].edge).toBe(true);
    h.setSlider(g[0].ans);
    h.click(SEND);
    h.advance(2.8);
    expect(h.hearts()).toBe(2);
    expect(h.feedback()).toMatch(/is right, but the ruler lies flat along a whole edge: every point between \(/);
    // a wrong Z says nothing about the shape, whichever shape is chosen
    h.setSlider(g[0].ans + 1);
    setShape('edge');
    h.click(SEND);
    h.advance(2.8);
    expect(h.hearts()).toBe(1);
    expect(h.feedback()).toMatch(/ruler at Z/);
    expect(h.feedback()).not.toMatch(/whole edge|single point|is right/);
    h.setSlider(g[0].ans);
    setShape('edge');
    h.click(SEND);
    h.advance(2.8);
    expect(h.phase()).toBe('between');
    h.advance(1);
    expect(shape()).toBe('corner');
  });

  it('level 5: the right Z with "whole edge" on a single-corner round is a miss that says only one corner reaches it', () => {
    const seed = seedWhere(5, (g) => g[1].edge === false);
    const g = playTo(5, seed, 1);
    h.setSlider(g[1].ans);
    setShape('edge');
    h.click(SEND);
    h.advance(2.8);
    expect(h.hearts()).toBe(2);
    expect(h.feedback()).toMatch(/only one corner reaches it/);
  });
});

describe('Rover Ridge UX pass', () => {
  const PROBE = 'Probe: see how the ruler sits at this Z';
  const canvas = () => h.$('canvas')!;
  const plateauDrawn = (rec: Rec) => rec.fills.includes('rgba(160,110,60,0.55)') || rec.fills.includes('rgba(77,225,255,0.3)');
  const frame = (R: ReturnType<typeof canvasRecorder>, dt: number) => {
    if (dt > 0.05) h.advance(dt - 0.05);
    R.clear();
    h.advance(0.05);
    return R.rec;
  };
  for (const level of [1, 2, 3, 4, 5]) {
    it(`level ${level}: the goal line is drawn at round start and fades; handles are at least ${GRIP_MIN} px`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const rec = frame(R, 0.05);
      expect(rec.at.some((a) => /^Goal: /.test(a.s))).toBe(true);
      expect(rec.at.filter((a) => /^Goal: /.test(a.s)).every((a) => a.y >= 12)).toBe(true);
      expect(GRIP_MIN).toBeGreaterThanOrEqual(18);
      expect(rec.arcs.some((a) => a.y === 322 && a.r >= 18)).toBe(true);
      expect(frame(R, 4).at.some((a) => /^Goal: /.test(a.s))).toBe(false);
    });
  }
  for (const level of [1, 2, 3, 4, 5]) {
    it(`level ${level}: the plateau is live in round 1, shows 1.5 s after a probe in round 2, never in round 3`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      expect(plateauDrawn(frame(R, 0.1))).toBe(true);
      expect(canvas().dataset.helper).toBe('1');
      const g = playTo(level, 5, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(h.note()).toMatch(/shows for a moment after a probe/);
      expect(plateauDrawn(frame(R, 0.3))).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
      h.setSlider(g[1].ans);
      expect(plateauDrawn(frame(R, 0.3))).toBe(false);
      h.click(PROBE);
      expect(plateauDrawn(frame(R, 0.3))).toBe(true);
      expect(plateauDrawn(frame(R, 0.8))).toBe(true);
      expect(plateauDrawn(frame(R, 0.8))).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
      const g2 = playTo(level, 5, 2);
      expect(h.hud()).toMatch(/BOSS/);
      h.setSlider(g2[2].ans);
      expect(plateauDrawn(frame(R, 0.3))).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
    });
  }
  it('a miss on levels 1 to 3 says which way to slide the ruler, never the best Z', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(wrong(g[0]));
    h.click(SEND);
    h.advance(3.6);
    expect(h.feedback()).toMatch(/Slide the ruler to a (higher|lower) Z/);
    expect(h.feedback()).not.toContain(`Z = ${g[0].ans}.`);
  });
});
