// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch13-probability/card-sharp/index';
import { CARDS, RANKS, SUITS, buildRounds, type Round } from '../src/games/mathematics/class-12/ch13-probability/card-sharp/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

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
    expect(h.feedback()).toMatch(/left out/);
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
