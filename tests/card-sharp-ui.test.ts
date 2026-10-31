// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch13-probability/card-sharp/index';
import { CARDS, RANKS, SUITS, buildRounds, type Round } from '../src/games/mathematics/class-12/ch13-probability/card-sharp/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts, type CanvasRec } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'card-sharp', 4);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === r.max ? r.ans - 1 : r.ans + 1);
const name = (i: number) => `Card ${RANKS[i % RANKS.length]}${SUITS[Math.floor(i / RANKS.length)]}`;
const NAMES = ['not marked', 'fits B', 'fits B and A'];
/** Tap a card until it reaches the wanted state (0 blank, 1 in B, 2 in both), whatever state it is in now. */
const setCard = (i: number, want: number) => {
  const cur = NAMES.indexOf((h.$(`[aria-label="${name(i)}"]`) as HTMLElement).title);
  for (let k = 0; k < (want - cur + 3) % 3; k++) h.click(name(i));
};

/** Mark the board to match the target; for a miss, leave the first card of B blank. */
function markBoard(r: Round, bad: boolean) {
  let skipped = false;
  r.target.forEach((x, i) => {
    if (bad && x > 0 && !skipped) {
      skipped = true;
      setCard(i, 0);
      return;
    }
    setCard(i, x);
  });
}
const isBoard = (level: number) => level === 1 || level === 4;
const commitLabel = (level: number) => (isBoard(level) ? 'Show the cards' : 'Show the trick');

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k, level) => (isBoard(level) ? markBoard(g[k], false) : h.setSlider(g[k].ans)),
  setWrong: (g, k, level) => (isBoard(level) ? markBoard(g[k], true) : h.setSlider(wrong(g[k]))),
  commit: (level) => h.click(commitLabel(level)),
});

describe('Card Sharp', () => {
  it('level 1 has 24 cards, the condition and the event are in the note, and a miss says what was left out', () => {
    h.start(1, 5);
    const g = build(1, 5);
    expect(h.$('.lab-controls')?.querySelectorAll('button[aria-label^="Card"]').length).toBe(CARDS);
    expect(h.note()).toContain(g[0].textB);
    markBoard(g[0], true);
    h.click('Show the cards');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/at least one card is marked wrong/);
    expect(h.feedback()).not.toMatch(/\d/);
  });
  it('tapping a card on the table cycles it and a peek costs a charge', () => {
    h.start(1, 5);
    const g = build(1, 5);
    const first = g[0].target.findIndex((x) => x > 0);
    h.pointer('pointerdown', 190 + (first % 6) * 62 + 10, 60 + Math.floor(first / 6) * 58 + 10);
    expect((h.$(`[aria-label="${name(first)}"]`) as HTMLElement).getAttribute('aria-pressed')).toBe('true');
    h.click('Peek: the cards that fit B glow for a moment');
    expect(h.feedback()).toMatch(/glow/);
    h.click('Peek: the cards that fit B glow for a moment');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 1 win shows P(A | B); levels 2 and 3 read checks as effects', () => {
    h.start(1, 5);
    const g = build(1, 5);
    markBoard(g[0], false);
    h.click('Show the cards');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/P\(A \| B\)/);
    for (const level of [2, 3]) {
      h.start(level, 5);
      h.click('Check: see the chance this setting gives');
      expect(h.feedback()).toMatch(/Check/);
    }
  });
  it('level 4 is the tap board with a compound event: 24 cards, the event in the note, a clean start, a miss that says what was left out', () => {
    h.start(4, 5);
    const g = build(4, 5);
    expect(h.$('.lab-controls')?.querySelectorAll('button[aria-label^="Card"]').length).toBe(CARDS);
    expect(h.note()).toContain(g[0].textB);
    expect(h.note()).toContain(g[0].textA);
    expect(g[0].textA).toMatch(/^not /);
    // the start board is blank, so it is not the answer
    expect([...document.querySelectorAll('button[aria-label^="Card"]')].every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
    markBoard(g[0], true);
    h.click('Show the cards');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/left out/);
    expect(h.feedback()).not.toMatch(/\d\/\d/);
  });
  it('level 4 shows the rule in the working in all three rounds, and the boss round has no peek', () => {
    h.start(4, 5);
    const g = build(4, 5);
    const want = [/P\(not A \| B\) = 1 − P\(A \| B\)/, /P\(A ∪ C \| B\) = P\(A \| B\) \+ P\(C \| B\) − P\(A ∩ C \| B\)/, /P\(neither \| B\) = 1 − P\(A ∪ C \| B\)/];
    for (let k = 0; k < 3; k++) {
      if (k === 2) {
        h.click('Peek: the cards that fit B glow for a moment');
        expect(h.feedback()).toMatch(/No charges left/);
      }
      markBoard(g[k], false);
      h.click('Show the cards');
      h.advance(2.8);
      expect(h.feedback()).toMatch(want[k]);
      h.advance(1);
    }
    expect(h.phase()).toBe('won');
  });
});

const fireLabel = (level: number) => (isBoard(level) ? 'Show the cards' : 'Show the trick');
const checkLabel = (level: number) => (isBoard(level) ? 'Peek: the cards that fit B glow for a moment' : 'Check: see the chance this setting gives');
const frame = (R: CanvasRec, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec;
};
/** What each level's helper writes on the canvas: the count of the board (levels 1 and 4), the product P(A)·P(B) (level 2), the chance at your red count (level 3). */
const HELPER = [/^$/, /^marked/, /^P\(A\)·P\(B\) =/, /^with \d+ red:/, /^marked/];
const liveDrawn = (level: number, rec: CanvasRec['rec']) => texts(rec).some((s) => HELPER[level].test(s));
const canvas = () => h.$('canvas')!;
const setRound = (level: number, r: Round, bad: boolean) => (isBoard(level) ? markBoard(r, bad) : h.setSlider(bad ? wrong(r) : r.ans));
const playRound = (level: number, g: Round[], k: number) => {
  setRound(level, g[k], false);
  h.click(fireLabel(level));
  h.advance(2.8);
  h.advance(1);
};
const playTo = (level: number, g: Round[], round: number) => {
  for (let k = 0; k < round; k++) playRound(level, g, k);
};

describe('Card Sharp never leaks the answer', () => {
  for (const level of [1, 2, 3, 4]) {
    it(`level ${level}: the helper is live in round 1, shows 1.5 s after a check in round 2, and never in round 3, not even after Fire`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const g = build(level, 5);
      expect(liveDrawn(level, frame(R))).toBe(true);
      expect(canvas().dataset.live).toBe('1');
      playRound(level, g, 0);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      for (const bad of [true, false]) {
        setRound(level, g[1], bad);
        expect(liveDrawn(level, frame(R, 0.3))).toBe(false);
      }
      expect(canvas().dataset.live).toBe('0');
      h.click(checkLabel(level));
      expect(liveDrawn(level, frame(R, 0.3))).toBe(true);
      expect(liveDrawn(level, frame(R, 1.0))).toBe(true);
      expect(liveDrawn(level, frame(R, 0.5))).toBe(false);
      // a miss in round 2 after the flash: nothing live, and a generic text
      setRound(level, g[1], true);
      h.click(fireLabel(level));
      for (const dt of [0.3, 0.6, 0.6, 0.6]) expect(liveDrawn(level, frame(R, dt))).toBe(false);
      h.advance(1);
      expect(h.feedback().length).toBeGreaterThan(30);
      expect(h.feedback()).not.toMatch(/\d/);
      playRound(level, g, 1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const bad of [true, false]) {
        setRound(level, g[2], bad);
        expect(liveDrawn(level, frame(R, 0.3))).toBe(false);
      }
      h.click(checkLabel(level));
      expect(h.feedback()).toMatch(/No charges left/);
      expect(liveDrawn(level, frame(R, 0.3))).toBe(false);
      setRound(level, g[2], true);
      h.click(fireLabel(level));
      for (const dt of [0.3, 0.6, 0.6, 0.6]) expect(liveDrawn(level, frame(R, dt))).toBe(false);
      expect(canvas().dataset.live).toBe('0');
    });

    it(`level ${level}: a win draws the helper`, () => {
      const R = canvasRecorder();
      h.start(level, 11);
      const g = build(level, 11);
      playRound(level, g, 0);
      setRound(level, g[1], false);
      h.click(fireLabel(level));
      let live = false;
      for (let i = 0; i < 8; i++) live = liveDrawn(level, frame(R, 0.2)) || live;
      expect(live).toBe(true);
    });
  }

  it('the peek glow on the cards of B shows only for 1.5 s after a peek (levels 1 and 4), and the count goes with it', () => {
    for (const level of [1, 4]) {
      const R = canvasRecorder();
      h.start(level, 5);
      const g = build(level, 5);
      // the scene sets data-peek on every frame: 1 only while the glow on the cards of B is drawn
      const glow = (_rec: CanvasRec['rec']) => canvas().dataset.peek === '1';
      expect(glow(frame(R))).toBe(false);
      playRound(level, g, 0);
      expect(glow(frame(R, 0.3))).toBe(false);
      h.click(checkLabel(level));
      expect(glow(frame(R, 0.3))).toBe(true);
      expect(glow(frame(R, 1.0))).toBe(true);
      expect(glow(frame(R, 0.5))).toBe(false);
    }
  });

  it('level 1: two different wrong boards give the same text, and the −1 float lands at one fixed point', () => {
    const out: string[] = [];
    const xs = new Set<number>();
    for (const board of ['skip', 'all yellow']) {
      const R = canvasRecorder();
      h.start(1, 11);
      const g = build(1, 11);
      if (board === 'skip') markBoard(g[0], true);
      else g[0].target.forEach((_, i) => setCard(i, 1));
      h.click('Show the cards');
      R.clear();
      h.advance(2.8);
      out.push(h.feedback());
      R.rec.at.filter((a) => a.s === '−1 ♥').forEach((a) => xs.add(a.x));
    }
    expect(out[0]).toBe(out[1]);
    expect([...xs]).toEqual([380]);
  });

  it('levels 2 and 3: two wrong settings on the same side give the same text, and the −1 float lands at one fixed point', () => {
    for (const level of [2, 3]) {
      for (const round of [0, 1, 2]) {
        const r = build(level, 11)[round];
        const lows = Array.from({ length: r.ans - r.min }, (_, i) => r.min + i);
        const highs = Array.from({ length: r.max - r.ans }, (_, i) => r.ans + 1 + i);
        for (const side of [lows, highs]) {
          const out: string[] = [];
          const xs = new Set<number>();
          for (const k of [side[0], side[side.length - 1]]) {
            const R = canvasRecorder();
            h.start(level, 11);
            const g = build(level, 11);
            playTo(level, g, round);
            h.setSlider(k);
            h.click(fireLabel(level));
            R.clear();
            h.advance(2.8);
            out.push(h.feedback());
            R.rec.at.filter((a) => a.s === '−1 ♥').forEach((a) => xs.add(a.x));
          }
          expect(out[0]).toBe(out[1]);
          expect([...xs]).toEqual([380]);
        }
      }
    }
  });

  it('the start never wins: a blank board (level 1), and the dial at its start (levels 2 and 3)', () => {
    for (const level of [1, 2, 3]) {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        h.start(level, seed);
        h.click(fireLabel(level));
        h.advance(2.8);
        expect(h.hearts()).toBe(2);
      }
    }
  });

  it('the goal is on the canvas, and the player’s own setting is beside the knob', () => {
    const R = canvasRecorder();
    h.start(1, 5);
    expect(texts(frame(R)).some((s) => /^Tap once: fits B \(yellow\)\. Tap twice: fits B and A \(green\)\.$/.test(s))).toBe(true);
    h.start(2, 5);
    h.setSlider(5);
    expect(texts(frame(R)).some((s) => s === 'Set k so that A and B are independent')).toBe(true);
    expect(texts(frame(R)).some((s) => s === 'k = 5 (P(B) = 5/12)')).toBe(true);
    h.start(3, 5);
    h.setSlider(4);
    expect(texts(frame(R)).some((s) => s === 'Set the red cards so the draw has the chance wanted')).toBe(true);
    expect(texts(frame(R)).some((s) => s === '4 red')).toBe(true);
    h.start(4, 5);
    expect(texts(frame(R)).some((s) => /^Tap once: fits B \(yellow\)\. Tap twice: fits B and the event \(green\)\.$/.test(s))).toBe(true);
    // the drag handle of levels 2 and 3 is easy to grab: a press 20 px from its centre still takes it
    h.start(2, 5);
    h.pointer('pointerdown', 60 + 20, 322);
    h.pointer('pointermove', 60 + (520 * 5) / 12, 322);
    expect(Number(h.sliders()[0].value)).toBe(5);
  });
});
