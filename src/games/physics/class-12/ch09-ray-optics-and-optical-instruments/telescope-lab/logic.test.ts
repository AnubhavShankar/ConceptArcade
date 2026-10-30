import { describe, expect, it } from 'vitest';
import {
  D,
  MISS_BLUR,
  MOON_ANGLE,
  PLATE_MISS,
  SCOPE_MISS_RADIUS,
  blurPx,
  cassIntel,
  cassSide,
  cassV,
  judgeCass,
  SLIDERS,
  buildGame,
  eyeSees,
  explainRound,
  judgeNear,
  judgePlate,
  judgeZoom,
  lRange,
  missText,
  nearL,
  nearM,
  normalM,
  plateSide,
  plateSize,
  resultLine,
  scopeMiss,
  view,
  viewReading,
  type Game,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const as = <K extends Game['kind']>(g: Game, _kind: K) => g as Extract<Game, { kind: K }>;
const grid = (min: number, max: number, step: number) => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => Math.round((min + i * step) * 1e6) / 1e6);

describe('the numbers from the textbook', () => {
  it('Exercise 9.13: fo = 144 cm and fe = 6 cm give 24× with the lenses 150 cm apart', () => {
    expect(normalM(144, 6)).toBe(24);
    expect(144 + 6).toBe(150);
  });
  it('Exercise 9.14: fo = 15 m and fe = 1 cm give 1500×, and the Moon’s image is 13.7 cm across', () => {
    expect(normalM(1500, 1)).toBe(1500);
    expect(plateSize(1500, MOON_ANGLE)).toBeCloseTo(13.7, 1);
  });
  it('Exercise 9.27: fo = 140 cm and fe = 5 cm give 28× in normal adjustment and 33.6× with the image at 25 cm', () => {
    expect(normalM(140, 5)).toBe(28);
    expect(nearM(140, 5)).toBeCloseTo(33.6, 6);
  });
  it('Exercise 9.28: the 100 m tower 3 km away makes an image 4.7 cm tall in the objective, and 145 cm is the lens separation', () => {
    expect(plateSize(140, 100 / 3000)).toBeCloseTo(4.67, 2);
    expect(140 + 5).toBe(145);
  });
  it('the tube length for a near-point view follows from the eyepiece’s object distance', () => {
    const w = view(140, 5, nearL(140, 5));
    expect(w.v).toBeCloseTo(D, 6);
    expect(w.M).toBeCloseTo(33.6, 6);
    expect(view(140, 5, 145).v).toBe(Infinity);
  });
});

describe('every game has three solvable rounds', () => {
  it('level 1: Exercises 9.13, 9.27(a) and 9.14(a); the eyepiece and tube length are unique', () => {
    for (const s of seeds.slice(0, 3)) {
      const g = as(buildGame(1, lcg(s)), 'zoom');
      expect(g.rounds.map((r) => r.exercise)).toEqual(['Exercise 9.13', 'Exercise 9.27(a)', 'Exercise 9.14(a)']);
      expect(g.rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      for (const r of g.rounds) {
        const lr = lRange(r.fo, 1);
        const winners: [number, number][] = [];
        for (const fe of grid(SLIDERS.fe.min, SLIDERS.fe.max, SLIDERS.fe.step)) for (const L of grid(lr.min, lr.max, lr.step)) if (judgeZoom(r, fe, L).ok) winners.push([fe, L]);
        expect(winners).toEqual([[r.feSol, r.LSol]]);
        const w = view(r.fo, r.feSol, r.LSol);
        expect(w.v).toBe(Infinity);
        expect(w.M).toBeCloseTo(r.M, 6);
      }
    }
  });
  it('level 2: three different plates, each fitted by exactly one focal-length dial setting, in the order of the plate size', () => {
    for (const s of seeds) {
      const g = as(buildGame(2, lcg(s)), 'plate');
      expect(g.rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      const plates = g.rounds.map((r) => r.plate);
      expect(plates).toEqual([...plates].sort((a, b) => a - b));
      expect(new Set(plates).size).toBe(3);
      for (const r of g.rounds) {
        expect(r.foSol).toBeGreaterThan(SLIDERS.fo.min);
        expect(r.foSol).toBeLessThan(SLIDERS.fo.max);
        const winners = grid(SLIDERS.fo.min, SLIDERS.fo.max, SLIDERS.fo.step).filter((fo) => judgePlate(r, fo).ok);
        expect(winners).toHaveLength(1);
        expect(Math.abs(winners[0] - r.foSol)).toBeLessThanOrEqual(5.01);
        expect(plateSize(r.foSol, r.theta)).toBeCloseTo(r.plate, 6);
      }
    }
  });
  it('level 3: the first round is Exercise 9.27(b); every round has the final image at the near point, and one pair of dials wins', () => {
    for (const s of seeds.slice(0, 20)) {
      const g = as(buildGame(3, lcg(s)), 'near');
      expect(g.rounds[0]).toMatchObject({ fo: 140, feSol: 5 });
      expect(g.rounds[0].M).toBeCloseTo(33.6, 6);
      expect(new Set(g.rounds.map((r) => `${r.fo}/${r.feSol}`)).size).toBe(3);
      for (const r of g.rounds) {
        const lr = lRange(r.fo, 0.1);
        const winners: [number, number][] = [];
        for (const fe of grid(SLIDERS.fe.min, SLIDERS.fe.max, SLIDERS.fe.step)) for (const L of grid(lr.min, lr.max, lr.step)) if (judgeNear(r, fe, L).ok) winners.push([fe, L]);
        expect(winners).toHaveLength(1);
        expect(winners[0][0]).toBe(r.feSol);
        expect(Math.abs(winners[0][1] - r.LSol)).toBeLessThanOrEqual(0.05);
        expect(view(r.fo, r.feSol, r.LSol).v).toBeCloseTo(D, 6);
      }
    }
  });
  it('every game has a hero with a name, a story and an objective, in plain game words', () => {
    for (const lv of [1, 2, 3]) {
      const g = buildGame(lv, lcg(5));
      expect(g.hero.name.length).toBeGreaterThan(2);
      expect(g.hero.story.length).toBeGreaterThan(60);
      expect(g.hero.objective.length).toBeGreaterThan(30);
      expect(`${g.hero.story} ${g.hero.objective}`).not.toMatch(/\border\b|stock|shop|workshop|customer|inventory|craft/i);
    }
  });
});

describe('judging: classic mistakes do not win', () => {
  it('level 1: the right eyepiece with the near-point tube length (or the reverse) misses', () => {
    const r = as(buildGame(1, lcg(3)), 'zoom').rounds[0];
    expect(judgeZoom(r, r.feSol, nearL(r.fo, r.feSol))).toMatchObject({ ok: false, feOk: true, lOk: false });
    expect(judgeZoom(r, r.feSol * 2, r.LSol)).toMatchObject({ ok: false, feOk: false, lOk: true });
  });
  it('level 2: the plate-sized focal length (cm of image mistaken for cm of focal length) and a halved one miss', () => {
    for (const r of as(buildGame(2, lcg(3)), 'plate').rounds) {
      expect(judgePlate(r, r.plate).ok).toBe(false);
      expect(judgePlate(r, r.foSol / 2).ok).toBe(false);
      expect(judgePlate(r, r.foSol * 2).ok).toBe(false);
    }
  });
  it('level 3: the normal-adjustment tube length puts the image at infinity, which is not the near-point view', () => {
    for (const r of as(buildGame(3, lcg(3)), 'near').rounds) {
      expect(judgeNear(r, r.feSol, r.fo + r.feSol).ok).toBe(false);
      expect(judgeNear(r, r.feSol, r.LSol).ok).toBe(true);
    }
  });
});

describe('words: the working and the misses', () => {
  it('every round explains itself with two lines and a result line', () => {
    for (const lv of [1, 2, 3]) {
      const g = buildGame(lv, lcg(11));
      for (let k = 0; k < 3; k++) {
        const lines = explainRound(g, k);
        expect(lines).toHaveLength(2);
        lines.forEach((t) => expect(t.length).toBeGreaterThan(30));
        expect(resultLine(g, k).length).toBeGreaterThan(20);
      }
    }
  });
  it('a miss describes the effect and does not hand over the answer', () => {
    const g2 = as(buildGame(2, lcg(3)), 'plate');
    const r = g2.rounds[0];
    expect(missText(g2, 0, { fo: r.foSol * 2 })).toMatch(/too big.*spills over/);
    expect(missText(g2, 0, { fo: r.foSol / 2 })).toMatch(/too small.*partly empty/);
    const g1 = buildGame(1, lcg(3));
    expect(missText(g1, 0, { fe: 3, L: 120 })).toMatch(/No clear picture/);
    expect(missText(g1, 0, { fe: 3, L: 146 })).toMatch(/overfills the ring, and the picture is blurred/);
    expect(missText(g1, 0, { fe: 12, L: 156 })).toMatch(/does not fill the ring: this is not the view/);
  });
  it('a test shot reads the view in words', () => {
    expect(viewReading(144, 6, 150)).toMatch(/at infinity, magnification 24×/);
    expect(viewReading(140, 5, nearL(140, 5))).toMatch(/25 cm from the eyepiece, magnification 33\.6×/);
    expect(viewReading(140, 5, 135)).toMatch(/inside the objective/);
    expect(viewReading(140, 5, 160)).toMatch(/outside the eyepiece/);
    expect(eyeSees(24)).toBe(false);
  });
});

describe('level 4: Planet night, the Cassegrain (Section 9.7.2, Exercise 9.29)', () => {
  const seeds80 = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
  const cg = (s: number) => as(buildGame(4, lcg(s)), 'cass');
  const dial = grid(SLIDERS.cass.min, SLIDERS.cass.max, SLIDERS.cass.step);
  /** Every row of the brief: [R₁, R₂, d] to v, each also checked by the mirror formula written out by hand. */
  const TABLE: Record<number, [number, number, number, number][]> = {
    0: [[220, 140, 20, 315]],
    1: [[200, 120, 25, 300], [240, 160, 20, 400]],
    2: [[180, 100, 15, 150]],
  };

  it('Exercise 9.29: R₁ = 220 mm, R₂ = 140 mm, 20 mm apart put the final image 315 mm from the small mirror', () => {
    expect(cassV(220, 140, 20)).toBeCloseTo(315, 9);
    // by hand: f₁ = 110, f₁ − d = 90 behind the small mirror (a virtual object, u = +90), f₂ = +70 for the convex mirror
    expect(1 / 70 - 1 / 90).toBeCloseTo(1 / 315, 12);
  });
  it('every row of the table gives its v: 315, then 300 and 400, then 150, by the formula and by the mirror formula', () => {
    for (const rows of Object.values(TABLE)) {
      for (const [R1, R2, d, v] of rows) {
        expect(cassV(R1, R2, d)).toBeCloseTo(v, 9);
        const u = R1 / 2 - d; // virtual object distance behind the small mirror
        const f2 = R2 / 2;
        // the mirror formula for the convex mirror, 1/v + 1/u = 1/f, with the virtual object at +u
        expect(1 / v + 1 / u).toBeCloseTo(1 / f2, 12);
      }
    }
    expect(1 / 60 - 1 / 75).toBeCloseTo(1 / 300, 12);
    expect(1 / 80 - 1 / 100).toBeCloseTo(1 / 400, 12);
    expect(1 / 50 - 1 / 75).toBeCloseTo(1 / 150, 12);
  });
  it('over 80 seeds the rounds are Saturn, Jupiter, Neptune with the brief’s rows, every row turns up, and the aids fade', () => {
    const seen: Record<number, Set<number>> = { 0: new Set(), 1: new Set(), 2: new Set() };
    for (const s of seeds80) {
      const g = cg(s);
      expect(g.rounds.map((r) => r.planet)).toEqual(['Saturn', 'Jupiter', 'Neptune']);
      expect(g.rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(g.charges).toEqual([1, 1, 0]);
      g.rounds.forEach((r, i) => {
        const row = TABLE[i].find(([R1, R2, d]) => R1 === r.R1 && R2 === r.R2 && d === r.d);
        expect(row).toBeDefined();
        expect(r.v).toBe(row![3]);
        expect(r.f1).toBe(r.R1 / 2);
        expect(r.f2).toBe(r.R2 / 2);
        expect(r.u).toBe(r.f1 - r.d);
        seen[i].add(r.v);
      });
    }
    expect([...seen[0]]).toEqual([315]);
    expect([...seen[1]].sort((a, b) => a - b)).toEqual([300, 400]);
    expect([...seen[2]]).toEqual([150]);
  });
  it('the first image is a virtual object for the small mirror (f₁ > d) and every v is a multiple of 5 mm inside the dial', () => {
    for (const s of seeds80) {
      for (const r of cg(s).rounds) {
        expect(r.u).toBeGreaterThan(0);
        expect(r.v % 5).toBe(0);
        expect(r.v).toBeGreaterThan(SLIDERS.cass.min);
        expect(r.v).toBeLessThan(SLIDERS.cass.max);
        expect(r.v).toBeCloseTo(cassV(r.R1, r.R2, r.d), 9);
      }
    }
  });
  it('only the answer wins: scanning the whole dial gives exactly one winner, and the start (50 mm) is never it', () => {
    for (const s of seeds80) {
      for (const r of cg(s).rounds) {
        expect(dial.filter((x) => judgeCass(r, x).ok)).toEqual([r.v]);
        expect(judgeCass(r, SLIDERS.cass.start).ok).toBe(false);
        expect(r.v).not.toBe(SLIDERS.cass.start);
      }
    }
  });
  it('classic slips do not win: the big mirror’s focus, the virtual object distance, or v measured from the big mirror', () => {
    for (const s of seeds80.slice(0, 20)) {
      for (const r of cg(s).rounds) {
        for (const slip of [r.f1, r.u, r.f2, r.R1, r.f1 + r.d, r.v - r.d, r.v + r.d]) {
          if (slip !== r.v) expect(judgeCass(r, Math.round(slip / 5) * 5).ok).toBe(false);
        }
      }
    }
  });
  it('the picture is sharp only at the answer: the live blur is 0 at v and grows with the error', () => {
    for (const s of seeds80.slice(0, 20)) {
      for (const r of cg(s).rounds) {
        expect(dial.filter((x) => blurPx(x, r.v) === 0)).toEqual([r.v]);
        for (const x of dial) {
          if (x < r.v - 5) expect(blurPx(x, r.v)).toBeGreaterThanOrEqual(blurPx(x + 5, r.v));
          if (x > r.v + 5) expect(blurPx(x, r.v)).toBeGreaterThanOrEqual(blurPx(x - 5, r.v));
        }
      }
    }
    expect(MISS_BLUR).toBe(14);
    expect(MISS_BLUR).toBeGreaterThan(blurPx(0, 5));
  });
  it('a miss gives the brief’s words, with the side only: the same text (apart from the player’s own x) however far off, and never v', () => {
    for (const s of seeds80) {
      const g = cg(s);
      g.rounds.forEach((r, i) => {
        const bySide = new Map<string, Set<string>>();
        for (const x of dial) {
          if (x === r.v) continue;
          const text = missText(g, i, { x });
          expect(text).toBe(`With the sensor at ${x} mm, ${r.planet} came out as a blurred disc: the light ${x < r.v ? 'had not yet come to a focus' : 'had already focused and spread out again'}.`);
          expect(text.replace(String(x), 'X')).not.toMatch(new RegExp(`\\b${r.v}\\b`));
          expect(text.replace(String(x), 'X')).not.toMatch(/\d/);
          const side = cassSide(r, x);
          const set = bySide.get(side) ?? new Set<string>();
          set.add(text.replace(String(x), 'X'));
          bySide.set(side, set);
        }
        bySide.forEach((set) => expect(set.size).toBe(1));
        expect(bySide.get('short')!.size + bySide.get('long')!.size).toBe(2);
      });
    }
  });
  it('the words: the intel line and the working, exactly as the brief says, for every row', () => {
    const lines = new Map<string, string>();
    for (const s of seeds80) {
      const g = cg(s);
      g.rounds.forEach((r, i) => {
        expect(cassIntel(r)).toBe(`Tonight: ${r.planet}. Big mirror R₁ = ${r.R1} mm, small convex mirror R₂ = ${r.R2} mm, ${r.d} mm apart. Slide the camera sensor to where the planet’s image forms, measured from the small mirror.`);
        lines.set(`${r.R1}/${r.R2}/${r.d}`, explainRound(g, i)[0]);
        expect(explainRound(g, i)).toHaveLength(2);
        expect(resultLine(g, i)).toMatch(/pin-sharp/);
      });
    }
    expect(lines.get('220/140/20')).toBe('The big mirror would focus Saturn at f₁ = 110 mm, which is 110 − 20 = 90 mm behind the small mirror: a virtual object. With f₂ = 70 mm, 1/v = 1/70 − 1/90, so v = 315 mm from the small mirror.');
    expect(lines.get('200/120/25')).toBe('The big mirror would focus Jupiter at f₁ = 100 mm, which is 100 − 25 = 75 mm behind the small mirror: a virtual object. With f₂ = 60 mm, 1/v = 1/60 − 1/75, so v = 300 mm from the small mirror.');
    expect(lines.get('240/160/20')).toContain('so v = 400 mm from the small mirror.');
    expect(lines.get('180/100/15')).toBe('The big mirror would focus Neptune at f₁ = 90 mm, which is 90 − 15 = 75 mm behind the small mirror: a virtual object. With f₂ = 50 mm, 1/v = 1/50 − 1/75, so v = 150 mm from the small mirror.');
  });
  it('Stella has the name, role, story and objective of the brief, in plain game words', () => {
    const g = buildGame(4, lcg(5));
    expect(g.hero.name).toBe('Stella');
    expect(g.hero.role).toBe('a young stargazer with a Cassegrain telescope on a rooftop observatory');
    expect(g.hero.story).toBe('Stella wants to photograph a planet tonight. Her Cassegrain telescope folds the light: the big concave mirror sends it to a small convex mirror, which sends it back through a hole in the big mirror to the camera. The big mirror’s image is a virtual object for the small one.');
    expect(g.hero.objective).toBe('Slide the camera sensor to where the planet comes into focus, and photograph all three planets.');
    expect(`${g.hero.story} ${g.hero.objective}`).not.toMatch(/\border\b|stock|shop|workshop|customer|inventory|craft/i);
  });
  it('levels 1 to 3 are unchanged by the new level', () => {
    expect(buildGame(1, lcg(3)).kind).toBe('zoom');
    expect(buildGame(2, lcg(3)).kind).toBe('plate');
    expect(buildGame(3, lcg(3)).kind).toBe('near');
  });
});

describe('no leaks, levels 1 to 3: the start and the misses', () => {
  it('the start never wins: the eyepiece and tube length, the plate focal length', () => {
    for (const s of seeds) {
      for (const r of as(buildGame(1, lcg(s)), 'zoom').rounds) expect(judgeZoom(r, SLIDERS.fe.start, r.fo).ok).toBe(false);
      for (const r of as(buildGame(3, lcg(s)), 'near').rounds) expect(judgeNear(r, SLIDERS.fe.start, r.fo + 8).ok).toBe(false);
      for (const r of as(buildGame(2, lcg(s)), 'plate').rounds) expect(judgePlate(r, SLIDERS.fo.start).ok).toBe(false);
    }
  });
  it('levels 1 and 3: a miss is worded by category only (size against the ring, blurred or not), with no number, whatever the settings', () => {
    for (const level of [1, 3]) {
      const g = buildGame(level, lcg(5)) as Extract<Game, { kind: 'zoom' | 'near' }>;
      g.rounds.forEach((r, k) => {
        const lr = lRange(r.fo, level === 1 ? 1 : 0.5);
        const byKind = new Map<string, Set<string>>();
        const all = new Set<string>();
        for (const fe of grid(SLIDERS.fe.min, SLIDERS.fe.max, SLIDERS.fe.step * 2)) {
          for (const L of grid(lr.min, lr.max, lr.step)) {
            const win = level === 1 ? judgeZoom(r as never, fe, L).ok : judgeNear(r as never, fe, L).ok;
            if (win) continue;
            const t = missText(g, k, { fe, L });
            const key = JSON.stringify(scopeMiss(r, fe, L));
            byKind.set(key, (byKind.get(key) ?? new Set()).add(t));
            all.add(t);
            expect(t).not.toMatch(/\d/);
          }
        }
        byKind.forEach((set) => expect(set.size).toBe(1));
        expect(all.size).toBeLessThanOrEqual(7);
      });
    }
  });
  it('level 2: every wrong focal length on one side gives the same text, with no number, and the same fixed ring', () => {
    for (const s of seeds.slice(0, 20)) {
      const g = as(buildGame(2, lcg(s)), 'plate');
      g.rounds.forEach((r, k) => {
        const wrong = grid(SLIDERS.fo.min, SLIDERS.fo.max, SLIDERS.fo.step).filter((fo) => !judgePlate(r, fo).ok);
        for (const side of ['over', 'under'] as const) {
          const set = wrong.filter((fo) => plateSide(r, fo) === side);
          expect(set.length).toBeGreaterThan(0);
          expect(new Set(set.map((fo) => missText(g, k, { fo }))).size).toBe(1);
          expect(missText(g, k, { fo: set[0] })).not.toMatch(/\d/);
        }
      });
    }
    expect(PLATE_MISS.over).toBeGreaterThan(1);
    expect(PLATE_MISS.under).toBeLessThan(1);
  });
  it('a missed scope draws the target at a fixed size for its category: over the ring, under it, about the ring', () => {
    expect(SCOPE_MISS_RADIUS.over).toBeGreaterThan(56);
    expect(SCOPE_MISS_RADIUS.under).toBeLessThan(56);
    expect(SCOPE_MISS_RADIUS.about).toBe(56);
    expect(scopeMiss({ fo: 144, M: 24 }, 3, 146)).toEqual({ none: false, size: 'over', blurred: true });
    expect(scopeMiss({ fo: 144, M: 24 }, 12, 156)).toEqual({ none: false, size: 'under', blurred: false });
    expect(scopeMiss({ fo: 144, M: 24 }, 3, 120)).toEqual({ none: true });
  });
});
