// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch13-nuclei/nucleus-builder/index';
import { barrierRounds, decayRounds, sizeRounds, twinRounds } from '../src/games/physics/class-12/ch13-nuclei/nucleus-builder/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'nb', 4);
type G = { size: ReturnType<typeof sizeRounds>; barrier: ReturnType<typeof barrierRounds>; decay: ReturnType<typeof decayRounds>; twin: ReturnType<typeof twinRounds> };
const build = (level: number, seed: number): G => ({ size: level === 1 ? sizeRounds(createRng(seed)) : [], barrier: level === 2 ? barrierRounds(createRng(seed)) : [], decay: level === 3 ? decayRounds(createRng(seed)) : [], twin: level === 4 ? twinRounds(createRng(seed)) : [] });
const FIRE = ['Roll the nucleus out at this radius', 'Set the barrier and climb it', 'Let the nucleus decay into this daughter', 'Roll the nuclide out with these protons and neutrons'];

shellTests<G>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k, level) => {
    if (level === 1) h.setSlider(g.size[k].sol);
    else if (level === 2) h.setSlider(g.barrier[k].sol);
    else if (level === 3) {
      h.setSlider(g.decay[k].aSol, 0);
      h.setSlider(g.decay[k].zSol, 1);
    } else {
      h.setSlider(g.twin[k].z, 0);
      h.setSlider(g.twin[k].n, 1);
    }
  },
  setWrong: (g, k, level) => {
    if (level === 1) h.setSlider(Math.min(9, g.size[k].sol * 1.5));
    else if (level === 2) h.setSlider(Math.min(2000, g.barrier[k].sol * 2));
    else if (level === 3) {
      h.setSlider(g.decay[k].aSol, 0);
      h.setSlider(g.decay[k].zSol + 3, 1);
    } else {
      h.setSlider(g.twin[k].z, 0);
      h.setSlider(g.twin[k].n + 1, 1);
    }
  },
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('level 1: Katamari’s radius', () => {
  it('a ball too big or too small is described, and a test shot gives the cube root of A', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(Math.min(9, g.size[0].sol * 1.5));
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/bigger than the real one/);
    h.setSlider(g.size[0].sol / 1.5);
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/smaller than the real one/);
    h.click('Test shot: read the cube root of the mass number');
    expect(h.feedback()).toMatch(/A\^⅓ for A = \d+ is/);
  });
  it('dragging the ball’s edge sets the radius', () => {
    h.start(1, 5);
    h.pointer('pointerdown', 330 + 20 * 2, 170);
    h.pointer('pointermove', 330 + 20 * 5.5, 170);
    expect(Number(h.sliders()[0].value)).toBeCloseTo(5.5, 1);
  });
});

describe('level 2: Climber’s hill', () => {
  it('a hill too high or too low is described, never the height; the curve help fades', () => {
    h.start(2, 5);
    const g = build(2, 5);
    expect(h.note()).toMatch(/curve is drawn live/);
    h.setSlider(Math.min(2000, g.barrier[0].sol * 2));
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/too high/);
    expect(h.feedback()).not.toContain(`${g.barrier[0].sol} keV`);
  });
});

describe('level 3: Evo’s decay', () => {
  it('the right mass number with the wrong charge names the charge; a test shot says what the particle carries', () => {
    h.start(3, 5);
    const g = build(3, 5);
    expect(h.sliders()).toHaveLength(2);
    h.setSlider(g.decay[0].aSol, 0);
    h.setSlider(g.decay[0].zSol + 3, 1);
    h.click(FIRE[2]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/a higher total charge/);
    h.click('Test shot: what the emitted particle carries away');
    expect(h.feedback()).toMatch(/mass number 4 and charge \+2/);
  });
});

// ---- level 3: no leaks (the helper fades, a miss gives only the direction of each count) -------------------------------------
const L3_TEST = 'Test shot: what the emitted particle carries away';
const CHECK = /^(A|Z): \d+ \+ /;
const hasCheck = (t: string[]) => t.some((s) => CHECK.test(s));
const frame3 = (rc: ReturnType<typeof canvasRecorder>, dt: number) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  rc.clear();
  h.advance(0.05);
  return texts(rc.rec);
};
const solve3 = (g: G, k: number) => {
  h.setSlider(g.decay[k].aSol, 0);
  h.setSlider(g.decay[k].zSol, 1);
};
const playTo3 = (round: number) => {
  const g = build(3, 5);
  for (let k = 0; k < round; k++) {
    solve3(g, k);
    h.click(FIRE[2]);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
/** Two settings on one side: too many nucleons (A high, Z right), too few, or too much charge (Z high, A right). */
const side3 = (g: G, k: number, side: 'moreA' | 'lessA' | 'moreZ', f: number) => {
  const r = g.decay[k];
  h.setSlider(side === 'moreA' ? r.aSol + 3 + 5 * f : side === 'lessA' ? Math.max(1, r.aSol - 3 - 4 * f) : r.aSol, 0);
  h.setSlider(side === 'moreZ' ? r.zSol + 3 + 5 * f : r.zSol, 1);
};

describe('level 3: no leaks: the helper fades, and a miss gives only the direction of each count', () => {
  it('round 1 shows the live balance check; round 2 only for about 1.5 s after a test shot; round 3 never, even after a test shot', () => {
    const rc = canvasRecorder();
    h.start(3, 5);
    expect(hasCheck(frame3(rc, 0.1))).toBe(true);
    const g = playTo3(1);
    expect(hasCheck(frame3(rc, 0.1))).toBe(false);
    h.click(L3_TEST);
    expect(hasCheck(frame3(rc, 0.3))).toBe(true);
    expect(hasCheck(frame3(rc, 1.5))).toBe(false);
    solve3(g, 1);
    h.click(FIRE[2]);
    h.advance(2.8);
    h.advance(1);
    expect(h.hud()).toMatch(/Round 3 of 3/);
    expect(hasCheck(frame3(rc, 0.1))).toBe(false);
    h.click(L3_TEST);
    expect(hasCheck(frame3(rc, 0.3))).toBe(false);
  });
  it('the hint text says the check shows for a moment after a test shot', () => {
    h.start(3, 5);
    playTo3(1);
    expect(h.note()).toMatch(/for a moment after a test shot/);
  });
  it('a miss in round 2 or 3 draws no ✓/✗ check, only the words more, fewer or same; a win draws the check', () => {
    for (const round of [1, 2]) {
      const rc = canvasRecorder();
      h.start(3, 5);
      const g = playTo3(round);
      side3(g, round, 'moreA', 0);
      h.click(FIRE[2]);
      h.advance(2.0);
      const miss = frame3(rc, 0.05);
      expect(hasCheck(miss)).toBe(false);
      expect(miss).toContain('nucleons after: ▲ more');
      expect(miss).toContain('charge after: = same');
      expect(miss.some((s) => /[✓✗]/.test(s))).toBe(false);
      h.advance(1);
      solve3(g, round);
      h.click(FIRE[2]);
      h.advance(2.0);
      expect(hasCheck(frame3(rc, 0.05))).toBe(true);
      h.advance(1);
    }
  });
  it('two wrong settings on the same side give the same words and the same drawn end (the player’s own box aside)', () => {
    const own = /^(A|Z) = \d+$/;
    for (const side of ['moreA', 'lessA', 'moreZ'] as const) {
      const rc = canvasRecorder();
      const ends: string[][] = [];
      const says: string[] = [];
      for (const f of [0, 1]) {
        h.start(3, 5);
        const g = playTo3(2);
        side3(g, 2, side, f);
        h.click(FIRE[2]);
        h.advance(2.0);
        ends.push(frame3(rc, 0.05).filter((s) => !own.test(s)));
        h.advance(1);
        says.push(h.feedback());
      }
      expect(says[0]).toBe(says[1]);
      expect(says[0]).not.toMatch(/\d/);
      expect(ends[0]).toEqual(ends[1]);
    }
  });
  it('the start never wins: firing at once is a miss in every round', () => {
    for (const round of [0, 1, 2]) {
      h.start(3, 5);
      playTo3(round);
      const hearts = h.hearts();
      h.click(FIRE[2]);
      h.advance(2.8);
      expect(h.hearts()).toBe(hearts - 1);
    }
  });
  it('round 3 is a β⁺ decay whose answer is no longer always (11, 5): over many seeds it takes four values', () => {
    const answers = new Set<string>();
    for (let s = 0; s < 120; s++) {
      const r = decayRounds(createRng(s * 7919 + 13))[2];
      expect(r.kind).toBe('beta+');
      answers.add(`${r.aSol},${r.zSol}`);
    }
    expect([...answers].sort()).toEqual(['11,5', '13,6', '15,7', '18,8']);
    // and the new rows can be played to a win through the real controls
    h.start(3, 5);
    const g = playTo3(2);
    solve3(g, 2);
    h.click(FIRE[2]);
    h.advance(2.8);
    expect(h.phase()).toBe('won');
  });
});

describe('levels 1 and 2: a miss shows one fixed effect per side', () => {
  const settle = (label: string) => {
    h.click(label);
    h.advance(2.8);
  };
  it('level 1: the start radius never wins; two radii that are too big give the same words and the same pack step', () => {
    h.start(1, 5);
    settle(FIRE[0]);
    expect(h.hearts()).toBe(2);
    h.start(1, 5);
    const r = build(1, 5).size[0];
    h.setSlider(Math.min(9, Math.round(r.sol * 1.3 * 100) / 100));
    h.click(FIRE[0]);
    h.advance(1.6);
    const first = [h.$('canvas')?.dataset.pack, h.feedback()];
    h.advance(1.2);
    first[1] = h.feedback();
    expect(first[0]).toBe('-1.20');
    h.setSlider(Math.min(9, Math.round(r.sol * 1.6 * 100) / 100));
    h.click(FIRE[0]);
    h.advance(1.6);
    expect(h.$('canvas')?.dataset.pack).toBe('-1.20');
    h.advance(1.2);
    expect(h.feedback()).toBe(first[1]);
  });
  it('level 1: too small gives the pack a fixed step larger, and a win draws the true radius', () => {
    h.start(1, 5);
    const r = build(1, 5).size[0];
    h.setSlider(Math.round(r.sol * 0.6 * 100) / 100);
    h.click(FIRE[0]);
    h.advance(1.6);
    expect(h.$('canvas')?.dataset.pack).toBe('1.20');
    h.advance(1.2);
    h.setSlider(r.sol);
    h.click(FIRE[0]);
    h.advance(1.6);
    expect(Math.abs(Number(h.$('canvas')?.dataset.pack))).toBeLessThanOrEqual(0.03);
  });
  it('level 2: the start barrier never wins; two settings on one side give the same effect and the same words, and the true hill is not drawn', () => {
    h.start(2, 5);
    settle(FIRE[1]);
    expect(h.hearts()).toBe(2);
    const r = build(2, 5).barrier[0];
    h.start(2, 5);
    h.setSlider(Math.min(2000, Math.round(r.sol * 1.5)));
    settle(FIRE[1]);
    const high = [h.feedback(), h.$('canvas')?.dataset.barrier];
    h.setSlider(2000);
    settle(FIRE[1]);
    expect([h.feedback(), h.$('canvas')?.dataset.barrier]).toEqual(high);
    expect(high[1]).toBe('bounce');
    h.start(2, 5);
    h.setSlider(Math.round(r.sol * 0.8));
    settle(FIRE[1]);
    const low = [h.feedback(), h.$('canvas')?.dataset.barrier];
    h.setSlider(Math.round(r.sol * 0.5));
    settle(FIRE[1]);
    expect([h.feedback(), h.$('canvas')?.dataset.barrier]).toEqual(low);
    expect(low[1]).toBe('overshoot');
    expect(low[0]).toMatch(/too low/);
  });
  it('level 2: a win has the nuclei meet', () => {
    h.start(2, 5);
    h.setSlider(build(2, 5).barrier[0].sol);
    h.click(FIRE[1]);
    h.advance(1.6);
    expect(h.$('canvas')?.dataset.barrier).toBe('meet');
  });
});

describe('level 4: Nuclide twins', () => {
  const fire = () => {
    h.click(FIRE[3]);
    h.advance(2.8);
  };
  const TEST = 'Test run: check the nuclide against the clue';
  const card = () => h.$('canvas')?.dataset.card;
  it('has two dials that start at Z = 10 and N = 10, and the start setting never wins', () => {
    h.start(4, 5);
    expect(h.sliders()).toHaveLength(2);
    expect(h.sliders()[0].value).toBe('10');
    expect(h.sliders()[1].value).toBe('10');
    fire();
    expect(h.hearts()).toBe(2);
    expect(h.phase()).toBe('play');
  });
  it('a wrong Z names the relation, a right Z with a wrong N names the extra fact, and the element stays hidden', () => {
    h.start(4, 5);
    const r = build(4, 5).twin[0];
    h.setSlider(r.z + 1, 0);
    h.setSlider(r.n, 1);
    h.click(FIRE[3]);
    h.advance(1.6);
    expect(card()).toBe('?');
    expect(h.$('canvas')?.dataset.shed).toBe('1');
    h.advance(1.2);
    expect(h.feedback()).toContain(`You rolled Z = ${r.z + 1}, N = ${r.n}, so A = ${r.z + 1 + r.n}: that is not an isotope of ${r.ref} (Z must match).`);
    expect(h.feedback()).not.toContain(r.name);
    h.setSlider(r.z, 0);
    h.setSlider(r.n + 1, 1);
    h.click(FIRE[3]);
    h.advance(2.8);
    expect(h.feedback()).toContain('does not have');
    expect(h.feedback()).toContain(`You rolled Z = ${r.z}, N = ${r.n + 1}`);
    expect(h.feedback()).not.toContain(r.name);
    expect(h.hearts()).toBe(1);
  });
  it('a win locks the ball and shows the element on the card', () => {
    h.start(4, 5);
    const r = build(4, 5).twin[0];
    h.setSlider(r.z, 0);
    h.setSlider(r.n, 1);
    expect(card()).toBe('?');
    h.click(FIRE[3]);
    h.advance(1.6);
    expect(card()).toBe(r.name.replace(/[^A-Za-z]/g, ''));
    expect(h.$('canvas')?.dataset.shed).toBe('0');
    h.advance(1.2);
    expect(h.feedback()).toMatch(/^Both clues match!/);
    expect(h.hearts()).toBe(3);
  });
  it('the check lights fade, a test run costs a charge and says which conditions hold, and the boss round has no charge', () => {
    h.start(4, 5);
    const g = build(4, 5);
    expect(h.note()).toMatch(/check lights are live/);
    expect(h.hud()).toMatch(/Charges ⚡/);
    h.click(TEST);
    expect(h.feedback()).toMatch(/^Test run: same Z as .*: (yes|no); with .*: (yes|no)\.$/);
    expect(h.hud()).not.toMatch(/⚡/);
    h.click(TEST);
    expect(h.feedback()).toMatch(/No charges left this round\. That does not cost you anything\./);
    expect(h.hearts()).toBe(3);
    for (let k = 0; k < 2; k++) {
      h.setSlider(g.twin[k].z, 0);
      h.setSlider(g.twin[k].n, 1);
      fire();
      h.advance(1);
      if (k === 0) expect(h.note()).toMatch(/lights are off/);
    }
    expect(h.hud()).toMatch(/BOSS/);
    expect(h.hud()).not.toMatch(/Charges/);
    expect(h.note()).toMatch(/No lights/);
  });
  it('dragging the handles sets Z and N', () => {
    h.start(4, 5);
    const zX = (z: number) => 60 + ((z - 1) / 29) * 520;
    const nX = (n: number) => 60 + (n / 40) * 520;
    h.pointer('pointerdown', zX(10), 296);
    h.pointer('pointermove', zX(20), 296);
    expect(h.sliders()[0].value).toBe('20');
    h.pointer('pointerup', zX(20), 296);
    h.pointer('pointerdown', nX(10), 326);
    h.pointer('pointermove', nX(25), 326);
    expect(h.sliders()[1].value).toBe('25');
  });
});
