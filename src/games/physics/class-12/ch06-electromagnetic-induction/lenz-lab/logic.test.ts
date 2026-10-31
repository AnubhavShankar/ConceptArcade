import { describe, expect, it } from 'vitest';
import {
  BRAKE, CHANGE, PACE, ROCKET, RUN, TUNNEL, brakeI, buildRounds, cueText, fault, firstWrong, goalLine, hintText, judge, lcdText, meterText, missText, rocket, rocketAnswer, rocketField,
  steady, tunnelAnswer, tunnelGlow, verdictDelay, winText,
  type Ev, type Fault, type Round, type Values,
} from './logic';

const SEEDS = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
};
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const rocketRound = (row: (typeof ROCKET)[number][number], assist: 0 | 1 | 2 = 0) => ({ ...row, kind: 'rocket', assist }) as Round;
const tunnelRound = (row: (typeof TUNNEL)[number][number], assist: 0 | 1 | 2 = 0) => ({ ...row, kind: 'tunnel', assist }) as Round;
const brakeRound = (row: (typeof BRAKE)[number][number], assist: 0 | 1 | 2 = 0) => ({ ...row, kind: 'brake', assist }) as Round;
const rocketSettings = () => [0, 1].flatMap((pole) => [-1, 0, 1].flatMap((move) => [0, 1].map((ring) => ({ pole, move, ring }))));
const tunnelSettings = () => Array.from({ length: 8 }, (_, i) => ({ z0: (i >> 2) & 1, z1: (i >> 1) & 1, z2: i & 1 }));

describe('level 1: the Ring Rocket', () => {
  it('every row has exactly one winning setting among the 12, equal to rocketAnswer with the ring closed, and the start never wins', () => {
    for (const row of ROCKET.flat()) {
      const r = rocketRound(row);
      const winners = rocketSettings().filter((x) => judge(r, x));
      expect(winners).toEqual([{ ...rocketAnswer(row) }]);
      expect(winners[0].ring).toBe(1);
      expect(judge(r, { pole: 1, move: 0, ring: 1 })).toBe(false);
    }
  });

  it('the eight answers are the ones the brief lists', () => {
    const want: [RocketRowKey, number, number][] = [
      ['below launch red', 1, 1], ['below launch green', 0, 1], ['below clamp green', 1, -1], ['below clamp red', 0, -1],
      ['above launch red', 1, -1], ['above launch green', 0, -1], ['above clamp green', 1, 1], ['above clamp red', 0, 1],
    ];
    for (const [key, pole, move] of want) {
      const [magnet, go, glow] = key.split(' ');
      const row = ROCKET.flat().find((x) => x.magnet === magnet && x.go === go && x.glow === glow)!;
      expect(rocketAnswer(row), key).toEqual({ pole, move, ring: 1 });
    }
  });

  it('the physics by hand-rules: toward launches from below, away launches from above, hold and split do nothing', () => {
    for (const row of ROCKET.flat()) {
      for (const pole of [0, 1]) {
        const toward = rocket(row, pole, 1, 1).split('-')[0];
        const away = rocket(row, pole, -1, 1).split('-')[0];
        expect(toward).toBe(row.magnet === 'below' ? 'launch' : 'clamp');
        expect(away).toBe(row.magnet === 'above' ? 'launch' : 'clamp');
        for (const ring of [0, 1]) expect(rocket(row, pole, 0, ring)).toBe('hold');
        for (const move of [-1, 1]) expect(rocket(row, pole, move, 0)).toBe('split');
      }
    }
  });

  it('Lenz in numbers: the induced field is against a rise and along a fall, and the same pole toward or away gives opposite colours', () => {
    const row = { magnet: 'below', go: 'launch', glow: 'red' } as const;
    expect(rocketField(row, 1, 1)).toEqual({ fieldUp: true, inducedUp: false });
    expect(rocketField(row, 1, -1)).toEqual({ fieldUp: true, inducedUp: true });
    expect(rocketField({ ...row, magnet: 'above' }, 1, 1)).toEqual({ fieldUp: false, inducedUp: true });
    for (const r of ROCKET.flat()) for (const pole of [0, 1]) expect(rocket(r, pole, 1, 1).split('-')[1]).not.toBe(rocket(r, pole, -1, 1).split('-')[1]);
  });

  it('rounds: round 1 from pool 1, round 2 from pool 2, round 3 from pool 3, assist 0 1 2, three different (pole, move) answers', () => {
    for (const seed of SEEDS) {
      const rs = buildRounds(1, lcg(seed));
      expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(rs.map((r) => r.kind)).toEqual(['rocket', 'rocket', 'rocket']);
      rs.forEach((r, k) => {
        const row = r as Extract<Round, { kind: 'rocket' }>;
        expect(ROCKET[k].some((x) => x.magnet === row.magnet && x.go === row.go && x.glow === row.glow)).toBe(true);
      });
      const keys = rs.map((r) => {
        const a = rocketAnswer(r as Extract<Round, { kind: 'rocket' }>);
        return `${a.pole}${a.move}`;
      });
      expect(new Set(keys).size).toBe(3);
    }
  });
});

type RocketRowKey = string;

describe('level 2: the Light Tunnel', () => {
  it('every row has exactly one winning switch setting among the 8, equal to tunnelAnswer, and never the start 111', () => {
    for (const row of TUNNEL.flat()) {
      const r = tunnelRound(row);
      const winners = tunnelSettings().filter((x) => judge(r, x));
      expect(winners).toHaveLength(1);
      expect([winners[0].z0, winners[0].z1, winners[0].z2]).toEqual(tunnelAnswer(row));
      expect(tunnelAnswer(row)).not.toEqual([1, 1, 1]);
    }
  });

  it('the answers of the three pools are disjoint, and every event is used', () => {
    const answers = TUNNEL.map((pool) => pool.map((row) => tunnelAnswer(row).join('')));
    expect(answers).toEqual([['100', '010', '001'], ['110', '011', '110'], ['101', '101', '000']]);
    const sets = answers.map((a) => new Set(a));
    for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) for (const a of sets[i]) expect(sets[j].has(a)).toBe(false);
    const used = new Set(TUNNEL.flat().flatMap((row) => row.ev));
    expect([...used].sort()).toEqual((Object.keys(CHANGE) as Ev[]).sort());
  });

  it('the colour rule: a rise with the field in is green, a fall with the field in is red, and the switch flips it', () => {
    expect(tunnelGlow('enter', 1)).toBe('green');
    expect(tunnelGlow('leave', 1)).toBe('red');
    expect(tunnelGlow('rise', 0)).toBe('red');
    expect(tunnelGlow('fade', 0)).toBe('green');
  });

  it('firstWrong is the first index whose switch differs from the answer, and the show stops there', () => {
    for (const row of TUNNEL.flat()) {
      const r = tunnelRound(row) as Extract<Round, { kind: 'tunnel' }>;
      const a = tunnelAnswer(row);
      for (const x of tunnelSettings()) {
        const z = [x.z0, x.z1, x.z2];
        expect(firstWrong(r, x)).toBe(z.findIndex((v, i) => v !== a[i]));
        expect(fault(r, x)).toBe(z.every((v, i) => v === a[i]) ? null : 'cue');
      }
    }
  });

  it('rounds: three tunnel rounds, assist 0 1 2, round k from pool k', () => {
    for (const seed of SEEDS) {
      const rs = buildRounds(2, lcg(seed)) as Extract<Round, { kind: 'tunnel' }>[];
      expect(rs.map((r) => r.kind)).toEqual(['tunnel', 'tunnel', 'tunnel']);
      expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
      rs.forEach((r, k) => expect(TUNNEL[k].some((x) => x.ev.join() === r.ev.join() && x.cue.join() === r.cue.join())).toBe(true));
    }
  });
});

describe('level 3: the Brake Run', () => {
  const range = Array.from({ length: 25 }, (_, i) => i + 1);

  it('the answer is 1000 b²l²v / f, and exactly one dial value from 1 to 25 gives the safe speed', () => {
    for (const row of BRAKE.flat()) {
      expect(Math.abs((1000 * row.b ** 2 * row.l ** 2 * row.v) / row.f - row.r)).toBeLessThan(1e-9);
      expect(range.filter((R) => Math.abs(steady(row, R) - row.v) < 1e-9)).toEqual([row.r]);
      expect(judge(brakeRound(row), { r: row.r })).toBe(true);
    }
  });

  it('too much resistance steadies too fast, too little too slow, by at least 6%, and no answer is a dial end or the start', () => {
    for (const row of BRAKE.flat()) {
      const r = brakeRound(row);
      for (const R of range) {
        if (R === row.r) continue;
        expect(fault(r, { r: R })).toBe(R < row.r ? 'slow' : 'fast');
        expect(Math.abs(steady(row, R) / row.v - 1)).toBeGreaterThan(0.06);
        expect(judge(r, { r: R })).toBe(false);
      }
      expect(row.r).toBeGreaterThan(1);
      expect(row.r).toBeLessThan(25);
    }
  });

  it('the bar, the current and the power agree: BIl = pull and I²R = Fv', () => {
    for (const row of BRAKE.flat()) {
      const I = brakeI(row, row.r);
      expect(Math.abs(row.b * I * row.l - row.f)).toBeLessThan(1e-6);
      expect(Math.abs(I * I * (row.r / 1000) - row.f * row.v)).toBeLessThan(1e-6);
    }
  });

  it('the answers of the three pools are 4 5 6, 8 10 12, 7 9 15, all different', () => {
    expect(BRAKE.map((p) => p.map((x) => x.r))).toEqual([[4, 5, 6], [8, 10, 12], [7, 9, 15]]);
    expect(new Set(BRAKE.flat().map((x) => x.r)).size).toBe(9);
  });

  it('rounds: three brake rounds, assist 0 1 2, round k from pool k', () => {
    for (const seed of SEEDS) {
      const rs = buildRounds(3, lcg(seed)) as Extract<Round, { kind: 'brake' }>[];
      expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
      rs.forEach((r, k) => expect(BRAKE[k].some((x) => x.r === r.r && x.b === r.b && x.f === r.f)).toBe(true));
    }
  });

  it('the car’s pace and its end points are fixed for each outcome', () => {
    expect(PACE).toEqual({ slow: 0.55, win: 1, fast: 1.45 });
    expect(RUN.win.end).toBe(1);
    expect(RUN.fast.end).toBe(1.18);
    expect(RUN.slow.end).toBe(0.82);
  });
});

describe('timing, helpers and words', () => {
  const allRounds = (): { r: Round; xs: Values[] }[] => [
    ...ROCKET.flat().map((row) => ({ r: rocketRound(row), xs: rocketSettings() as Values[] })),
    ...TUNNEL.flat().map((row) => ({ r: tunnelRound(row), xs: tunnelSettings() as Values[] })),
    ...BRAKE.flat().map((row) => ({ r: brakeRound(row), xs: Array.from({ length: 25 }, (_, i) => ({ r: i + 1 })) as Values[] })),
  ];

  it('the verdict lands by 2.05 s for every row and every setting, and a win lands later than a fast crash', () => {
    for (const { r, xs } of allRounds()) for (const x of xs) expect(verdictDelay(r, x)).toBeLessThanOrEqual(2.05);
    const row = BRAKE[0][0];
    expect(verdictDelay(brakeRound(row), { r: 4 })).toBe(1.8);
    expect(verdictDelay(brakeRound(row), { r: 20 })).toBe(1.5);
    expect(verdictDelay(brakeRound(row), { r: 1 })).toBe(1.9);
    expect(verdictDelay(tunnelRound(TUNNEL[0][0]), { z0: 1, z1: 0, z2: 0 })).toBe(2.05);
    expect(verdictDelay(tunnelRound(TUNNEL[0][0]), { z0: 0, z1: 0, z2: 0 })).toBeCloseTo(0.55, 9);
    expect(verdictDelay(tunnelRound(TUNNEL[0][0]), { z0: 1, z1: 1, z2: 0 })).toBeCloseTo(1.15, 9);
  });

  it('level 3 miss texts never contain the answer, and give the plain fix', () => {
    for (const row of BRAKE.flat()) {
      const r = brakeRound(row);
      for (let R = 1; R <= 25; R++) {
        if (R === row.r) continue;
        const t = missText(r, { r: R });
        expect(has(t, `${row.r} mΩ`), `${row.r} vs ${R}`).toBe(false);
        expect(t).toMatch(R > row.r ? /Use less resistance\.$/ : /Use more resistance\.$/);
      }
    }
  });

  it('level 1 miss texts describe the player’s setting and never name the answer’s pole and move together', () => {
    for (const row of ROCKET.flat()) {
      const r = rocketRound(row);
      const a = rocketAnswer(row);
      for (const x of rocketSettings()) {
        if (judge(r, x)) continue;
        const t = missText(r, x);
        const both = t.includes(`With ${a.pole ? 'N' : 'S'} facing the ring and the magnet moving ${a.move === 1 ? 'toward' : 'away from'} it`);
        expect(both, JSON.stringify(x)).toBe(false);
        const f = fault(r, x) as Fault;
        if (f === 'hold') expect(t).toMatch(/held still/);
        if (f === 'split') expect(t).toMatch(/split/);
      }
    }
  });

  it('level 2 miss texts name the first wrong sign only, and never the later signs’ colours', () => {
    for (const row of TUNNEL.flat()) {
      const r = tunnelRound(row) as Extract<Round, { kind: 'tunnel' }>;
      for (const x of tunnelSettings()) {
        if (judge(r, x)) continue;
        const i = firstWrong(r, x);
        const t = missText(r, x);
        expect(t.startsWith(`Sign ${i + 1} `)).toBe(true);
        for (let j = i + 1; j < 3; j++) expect(t.includes(`Sign ${j + 1} `)).toBe(false);
      }
    }
  });

  it('win texts carry the working', () => {
    expect(winText(rocketRound(ROCKET[0][0]))).toMatch(/^Showtime!/);
    expect(winText(tunnelRound(TUNNEL[0][0]))).toMatch(/^What a show!/);
    const t = winText(brakeRound(BRAKE[0][0]));
    expect(t).toMatch(/^Smooth stop!/);
    expect(t).toContain('I²R');
  });

  it('the live helper shows the induced field, never the colour or the outcome', () => {
    const r = rocketRound(ROCKET[0][0]);
    for (const x of rocketSettings()) expect(lcdText(r, x)).toMatch(/^RING MAKES B [⬆⬇]$|^RING: NO CURRENT$/);
    const t = tunnelRound(TUNNEL[0][0]);
    for (const x of tunnelSettings()) for (const i of [0, 1, 2]) expect(lcdText(t, x, i)).toMatch(/^INDUCED [⊙⊗]$/);
    expect(lcdText(brakeRound(BRAKE[0][0]), { r: 7 })).toBe('STEADY 7 m/s');
  });

  it('the checks read out the player’s own setting', () => {
    expect(meterText(rocketRound(ROCKET[0][0]), { pole: 1, move: 1, ring: 1 })).toMatch(/points up.*flux would rise/);
    expect(meterText(rocketRound(ROCKET[2][0]), { pole: 1, move: 0, ring: 0 })).toMatch(/points down.*would not change.*split/);
    expect(meterText(tunnelRound(TUNNEL[0][0]), { z0: 1, z1: 0, z2: 1 })).toMatch(/sign 1 field ⊗ into the page, flux rising; sign 2 field ⊙ out of the page, flux falling/);
    expect(meterText(brakeRound(BRAKE[0][0]), { r: 8 })).toBe('Brake check: with 8 mΩ the car would settle at 8 m/s, with 500 A in the bar.');
  });

  it('goal lines and hints fade round by round', () => {
    expect(goalLine(rocketRound(ROCKET[0][0]))).toBe('Launch the ring with its red ↻ lights');
    expect(goalLine(rocketRound(ROCKET[1][0]))).toBe('Pull the ring down with its green ↺ lights');
    expect(goalLine(tunnelRound(TUNNEL[0][0]))).toBe('Flash the cues: GREEN ↺ · GREEN ↺ · RED ↻');
    expect(goalLine(brakeRound(BRAKE[0][0]))).toBe('Safe speed: 4 m/s');
    expect(cueText(ROCKET[1][0])).toBe('PULL DOWN · GREEN ↺');
    expect(hintText(rocketRound(ROCKET[0][0], 0))).toMatch(/Show 1: the flux meter is live\.$/);
    expect(hintText(rocketRound(ROCKET[0][0], 1))).toMatch(/a check costs a charge\.$/);
    expect(hintText(tunnelRound(TUNNEL[0][0], 2))).toMatch(/Final show: no meter\.$/);
    expect(hintText(brakeRound(BRAKE[0][0], 0))).toMatch(/Run 1: the brake meter is live\.$/);
    expect(hintText(brakeRound(BRAKE[0][0], 2))).toMatch(/Final run: no meter\.$/);
  });
});
