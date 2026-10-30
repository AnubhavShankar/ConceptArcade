# 05 · Signal Heist (Maths Ch 7, §7.3.2 Integration using trigonometric identities)

Read `README.md` in this folder first. Everything below is required unless marked "optional". This game uses the `delay` function support in `src/core/dialgame.ts` only if you need it (all delays here are constants).

## 1. Identity

| Field | Value |
|---|---|
| Game id | `signal-heist` |
| Folder | `src/games/mathematics/class-12/ch07-integrals/signal-heist/` |
| Files | `game.json`, `logic.ts`, `logic.test.ts`, `index.ts`, `art.ts` |
| UI test | `tests/signal-heist-ui.test.ts` |
| Book coverage | §7.3.2; Ex 7.3 Q1 to Q4, Q6, Q7, Q10, Q11; Example 7; definite versions as in Ex 7.8 |
| Inspiration (code comment only) | The frequency-matching hacking mini-games of stealth and superhero games (tune a signal to match a lock's waveform), heist games (laser grids, vault doors, security turrets) |
| Core verb | **Drag the crest of each pure tone** up or down on its own mini-scope (its amplitude) until the mix rebuilds the lock's waveform. Level 4: set a fuse rating on a charge meter. |

## 2. What the student learns

- Power reduction: sin² x = ½ − ½ cos 2x, cos² x = ½ + ½ cos 2x, sin x cos x = ½ sin 2x.
- Products to sums: 2 sin A cos B = sin(A + B) + sin(A − B), 2 cos A cos B = cos(A + B) + cos(A − B), 2 sin A sin B = cos(A − B) − cos(A + B); a negative angle flips a sine's sign.
- Powers: sin³ x = ¾ sin x − ¼ sin 3x, cos³ x = ¾ cos x + ¼ cos 3x, cos⁴ x and sin⁴ x by squaring the double angle formula; products of three factors in two steps.
- Once the integrand is a sum of pure tones, each tone integrates at once (shown after every win), and the definite integral from 0 to π/2 is a net value (level 4).

## 3. Story and characters

**Hex**, a hacker in a dark hoodie with a glowing visor and a wrist deck, cracks a vault. The vault's lock broadcasts a **lock signal** f(x) (a power or product of sines and cosines). Hex's wrist deck can only send **pure tones** (a constant, or a·sin kx, or a·cos kx). The lock opens when the sum of Hex's tones equals the lock signal **exactly**. That is the trigonometric identity. In level 4 the lock also has a **capacitor fuse**: the signal charges the capacitor from x = 0 to x = π/2, and the fuse rating must equal the net charge ∫₀^(π/2) f dx.

The enemy is the **security turret** in the ceiling, which drops out and fires a stun dart when the alarm goes off.

Hero banner: `name: 'Hex'`, `role: 'a hacker who cracks vault locks by rebuilding their signals from pure tones'`.

| Level | story | objective |
|---|---|---|
| 1 | `The vault lock broadcasts a signal such as sin² x. Hex’s wrist deck can only send pure tones: a constant and waves like cos 2x. Rewrite the signal with the double angle formulas, set each tone’s amplitude, and the lock reads the mix.` | `Rebuild each lock signal exactly from pure tones, in three rounds.` |
| 2 | `These locks broadcast products such as sin 3x cos 4x. Products of waves are sums of waves in disguise: 2 sin A cos B = sin(A + B) + sin(A − B).` | `Rebuild each product signal from pure tones, in three rounds.` |
| 3 | `These locks use cubes, fourth powers and products of three waves. Use the identities twice.` | `Rebuild each signal from pure tones, in three rounds.` |
| 4 | `The vault’s capacitor charges at the rate of the lock signal from x = 0 to x = π/2, and discharges where the signal is negative. The lock reads the net charge once, at the end, and the fuse rating must equal it exactly.` | `Set the fuse rating to the net charge ∫ f dx from 0 to π/2, in three rounds.` |

Characters:
- **Hex** (hero): crouched beside the vault door: a dark hoodie with the hood up, a cyan glowing visor across the eyes (eye shapes show in the visor), a wrist deck projecting a small holo screen, sneakers. Idle: fingers tap the wrist deck (small flickers on the holo), the hood sways, the visor eyes blink, glances up at the turret hatch every 4 s. Moods (visor eyes): focused `— —` while playing, happy arcs on a win, worried with a sweat drop when the alarm starts, frizzled hair (zigzag lines poking out of the hood) and spinning eyes after a stun dart.
- **Security turret** (enemy): hidden in a ceiling hatch above the door. On an alarm, the hatch opens, the turret drops down on an arm (0.3 s), its red eye sweeps and locks on Hex, and it fires a cyan stun dart (a streak with a spark at impact). After a win it stays hidden and its hatch light turns green.
- **The vault door**: a round steel door with six bolts around the rim and a wheel in the middle, a laser grid of five red beams in front of it. On a win the bolts retract one by one, the beams switch off left to right, and the door swings open with a gold glow inside.

## 4. Rules (`logic.ts`)

### 4.1 Tones and rows

A **band** is a string: `'1'` (the constant), or `'sin kx'` / `'cos kx'` with k a whole number (`'sin x'` for k = 1). Amplitudes are whole numbers of **eighths** from −8 to 8.

```ts
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';

export type Band = string;
/** The pure tone of a band, as a function of x. */
export function tone(b: Band): (x: number) => number {
  if (b === '1') return () => 1;
  const m = /^(sin|cos) (\d*)x$/.exec(b);
  if (!m) throw new Error(`bad band ${b}`);
  const k = m[2] ? Number(m[2]) : 1;
  return m[1] === 'sin' ? (x) => Math.sin(k * x) : (x) => Math.cos(k * x);
}
export interface MatchRow {
  /** The lock signal as shown, e.g. 'sin 3x cos 4x'. */
  name: string;
  f: (x: number) => number;
  /** The tones offered, in slot order, with the winning amplitude of each in eighths. */
  bands: [Band, number][];
  /** The identity, as a sentence. */
  identity: string;
  /** The antiderivative of f, without + C. */
  integral: string;
}
export interface FuseRow {
  name: string;
  f: (x: number) => number;
  /** An antiderivative, for the charge meter. */
  F: (x: number) => number;
  /** The net charge ∫₀^(π/2) f dx in twelfths. */
  ans: number;
  work: string;
}
```

### 4.2 Pools (copy exactly)

All rows were checked: the sum of tones equals f at 201 points of [−3, 3] to 1e-12, and the level 4 integrals equal `ans / 12` by Simpson's rule to 1e-9.

```ts
const { sin, cos } = Math;
const m = (name: string, f: (x: number) => number, bands: [Band, number][], identity: string, integral: string): MatchRow => ({ name, f, bands, identity, integral });

export const MATCH: Record<1 | 2 | 3, [MatchRow[], MatchRow[], MatchRow[]]> = {
  1: [
    [
      m('sin² x', (x) => sin(x) ** 2, [['1', 4], ['cos 2x', -4], ['sin 2x', 0]], 'sin² x = (1 − cos 2x)/2 = 1/2 − (1/2) cos 2x.', 'x/2 − (sin 2x)/4'),
      m('cos² x', (x) => cos(x) ** 2, [['1', 4], ['cos 2x', 4], ['sin 2x', 0]], 'cos² x = (1 + cos 2x)/2 = 1/2 + (1/2) cos 2x.', 'x/2 + (sin 2x)/4'),
      m('sin x cos x', (x) => sin(x) * cos(x), [['1', 0], ['sin 2x', 4], ['cos 2x', 0]], 'sin x cos x = (1/2) sin 2x.', '−(cos 2x)/4'),
    ],
    [
      m('sin² 2x', (x) => sin(2 * x) ** 2, [['1', 4], ['cos 2x', 0], ['cos 4x', -4]], 'sin² 2x = (1 − cos 4x)/2.', 'x/2 − (sin 4x)/8'),
      m('cos² 3x', (x) => cos(3 * x) ** 2, [['1', 4], ['cos 3x', 0], ['cos 6x', 4]], 'cos² 3x = (1 + cos 6x)/2.', 'x/2 + (sin 6x)/12'),
      m('2 sin² x', (x) => 2 * sin(x) ** 2, [['1', 8], ['cos 2x', -8], ['sin 2x', 0]], '2 sin² x = 1 − cos 2x.', 'x − (sin 2x)/2'),
    ],
    [
      m('sin² x cos² x', (x) => sin(x) ** 2 * cos(x) ** 2, [['1', 1], ['cos 2x', 0], ['cos 4x', -1]], 'sin² x cos² x = (1/4) sin² 2x = (1/8)(1 − cos 4x).', 'x/8 − (sin 4x)/32'),
      m('cos² x − sin² x', (x) => cos(x) ** 2 - sin(x) ** 2, [['1', 0], ['cos 2x', 8], ['sin 2x', 0]], 'cos² x − sin² x = cos 2x: no constant at all.', '(sin 2x)/2'),
    ],
  ],
  2: [
    [
      m('sin 3x cos x', (x) => sin(3 * x) * cos(x), [['sin x', 0], ['sin 2x', 4], ['sin 3x', 0], ['sin 4x', 4]], '2 sin A cos B = sin(A + B) + sin(A − B), so sin 3x cos x = (1/2)(sin 4x + sin 2x).', '−(cos 4x)/8 − (cos 2x)/4'),
      m('cos 3x cos x', (x) => cos(3 * x) * cos(x), [['cos x', 0], ['cos 2x', 4], ['cos 3x', 0], ['cos 4x', 4]], '2 cos A cos B = cos(A + B) + cos(A − B), so cos 3x cos x = (1/2)(cos 4x + cos 2x).', '(sin 4x)/8 + (sin 2x)/4'),
      m('sin 3x sin x', (x) => sin(3 * x) * sin(x), [['cos 2x', 4], ['cos 3x', 0], ['cos 4x', -4], ['sin 4x', 0]], '2 sin A sin B = cos(A − B) − cos(A + B), so sin 3x sin x = (1/2)(cos 2x − cos 4x).', '(sin 2x)/4 − (sin 4x)/8'),
    ],
    [
      m('sin x cos 3x', (x) => sin(x) * cos(3 * x), [['sin 2x', -4], ['sin 3x', 0], ['sin 4x', 4], ['cos 2x', 0]], 'sin x cos 3x = (1/2)(sin 4x + sin(−2x)) = (1/2)(sin 4x − sin 2x).', '−(cos 4x)/8 + (cos 2x)/4'),
      m('sin 3x cos 4x', (x) => sin(3 * x) * cos(4 * x), [['sin x', -4], ['sin 3x', 0], ['sin 4x', 0], ['sin 7x', 4]], 'sin 3x cos 4x = (1/2)(sin 7x + sin(−x)) = (1/2)(sin 7x − sin x).', '−(cos 7x)/14 + (cos x)/2'),
      m('sin 4x sin 8x', (x) => sin(4 * x) * sin(8 * x), [['cos 4x', 4], ['cos 8x', 0], ['cos 12x', -4], ['sin 12x', 0]], 'sin 4x sin 8x = (1/2)(cos 4x − cos 12x).', '(sin 4x)/8 − (sin 12x)/24'),
    ],
    [
      m('2 sin 2x cos 5x', (x) => 2 * sin(2 * x) * cos(5 * x), [['sin 3x', -8], ['sin 5x', 0], ['sin 7x', 8], ['cos 3x', 0]], '2 sin 2x cos 5x = sin 7x + sin(−3x) = sin 7x − sin 3x.', '−(cos 7x)/7 + (cos 3x)/3'),
      m('2 cos 4x cos 2x', (x) => 2 * cos(4 * x) * cos(2 * x), [['cos 2x', 8], ['cos 4x', 0], ['cos 6x', 8], ['sin 6x', 0]], '2 cos 4x cos 2x = cos 6x + cos 2x.', '(sin 6x)/6 + (sin 2x)/2'),
    ],
  ],
  3: [
    [
      m('sin³ x', (x) => sin(x) ** 3, [['sin x', 6], ['sin 2x', 0], ['sin 3x', -2], ['cos 3x', 0]], 'sin 3x = 3 sin x − 4 sin³ x, so sin³ x = (3/4) sin x − (1/4) sin 3x.', '−(3/4) cos x + (cos 3x)/12'),
      m('cos³ x', (x) => cos(x) ** 3, [['cos x', 6], ['cos 2x', 0], ['cos 3x', 2], ['sin 3x', 0]], 'cos 3x = 4 cos³ x − 3 cos x, so cos³ x = (3/4) cos x + (1/4) cos 3x.', '(3/4) sin x + (sin 3x)/12'),
    ],
    [
      m('cos⁴ x', (x) => cos(x) ** 4, [['1', 3], ['cos 2x', 4], ['cos 3x', 0], ['cos 4x', 1]], 'cos⁴ x = ((1 + cos 2x)/2)² = (1/4)(1 + 2 cos 2x + cos² 2x) = 3/8 + (1/2) cos 2x + (1/8) cos 4x.', '3x/8 + (sin 2x)/4 + (sin 4x)/32'),
      m('sin⁴ x', (x) => sin(x) ** 4, [['1', 3], ['cos 2x', -4], ['cos 3x', 0], ['cos 4x', 1]], 'sin⁴ x = ((1 − cos 2x)/2)² = 3/8 − (1/2) cos 2x + (1/8) cos 4x.', '3x/8 − (sin 2x)/4 + (sin 4x)/32'),
    ],
    [
      m('cos 2x cos 4x cos 6x', (x) => cos(2 * x) * cos(4 * x) * cos(6 * x), [['1', 2], ['cos 4x', 2], ['cos 8x', 2], ['cos 12x', 2]], 'cos 2x cos 4x = (1/2)(cos 6x + cos 2x); multiply by cos 6x and use the identities again: (1/4)(1 + cos 4x + cos 8x + cos 12x).', 'x/4 + (sin 4x)/16 + (sin 8x)/32 + (sin 12x)/48'),
      m('sin x sin 2x sin 3x', (x) => sin(x) * sin(2 * x) * sin(3 * x), [['sin 2x', 2], ['sin 4x', 2], ['sin 6x', -2], ['cos 2x', 0]], 'sin x sin 3x = (1/2)(cos 2x − cos 4x); multiply by sin 2x: (1/4)(sin 2x + sin 4x − sin 6x).', '−(cos 2x)/8 − (cos 4x)/16 + (cos 6x)/24'),
    ],
  ],
};

const fz = (name: string, f: (x: number) => number, F: (x: number) => number, ans: number, work: string): FuseRow => ({ name, f, F, ans, work });
export const FUSE: [FuseRow[], FuseRow[], FuseRow[]] = [
  [
    fz('sin 3x cos x', (x) => sin(3 * x) * cos(x), (x) => 0.5 * (-cos(4 * x) / 4 - cos(2 * x) / 2), 6, 'sin 3x cos x = (1/2)(sin 4x + sin 2x), so the integral is (1/2)[−(cos 4x)/4 − (cos 2x)/2] from 0 to π/2 = (1/2)[(−1/4 + 1/2) − (−1/4 − 1/2)] = 1/2.'),
    fz('sin 2x cos x', (x) => sin(2 * x) * cos(x), (x) => 0.5 * (-cos(3 * x) / 3 - cos(x)), 8, 'sin 2x cos x = (1/2)(sin 3x + sin x), so the integral is (1/2)[−(cos 3x)/3 − cos x] from 0 to π/2 = (1/2)[0 − (−1/3 − 1)] = 2/3.'),
    fz('cos 2x cos x', (x) => cos(2 * x) * cos(x), (x) => 0.5 * (sin(3 * x) / 3 + sin(x)), 4, 'cos 2x cos x = (1/2)(cos 3x + cos x), so the integral is (1/2)[(sin 3x)/3 + sin x] from 0 to π/2 = (1/2)(−1/3 + 1) = 1/3.'),
  ],
  [
    fz('sin 4x cos 2x', (x) => sin(4 * x) * cos(2 * x), (x) => 0.5 * (-cos(6 * x) / 6 - cos(2 * x) / 2), 8, 'sin 4x cos 2x = (1/2)(sin 6x + sin 2x), so the integral is (1/2)[−(cos 6x)/6 − (cos 2x)/2] from 0 to π/2 = (1/2)[(1/6 + 1/2) − (−1/6 − 1/2)] = 2/3.'),
    fz('sin 5x cos x', (x) => sin(5 * x) * cos(x), (x) => 0.5 * (-cos(6 * x) / 6 - cos(4 * x) / 4), 2, 'sin 5x cos x = (1/2)(sin 6x + sin 4x), so the integral is (1/2)[−(cos 6x)/6 − (cos 4x)/4] from 0 to π/2 = (1/2)[(1/6 − 1/4) − (−1/6 − 1/4)] = 1/6.'),
    fz('sin 3x cos 3x', (x) => sin(3 * x) * cos(3 * x), (x) => 0.5 * (-cos(6 * x) / 6), 2, 'sin 3x cos 3x = (1/2) sin 6x, so the integral is (1/2)[−(cos 6x)/6] from 0 to π/2 = (1/2)(1/6 + 1/6) = 1/6.'),
  ],
  [
    fz('sin x sin 2x sin 3x', (x) => sin(x) * sin(2 * x) * sin(3 * x), (x) => 0.25 * (-cos(2 * x) / 2 - cos(4 * x) / 4 + cos(6 * x) / 6), 2, 'sin x sin 2x sin 3x = (1/4)(sin 2x + sin 4x − sin 6x), so the integral is (1/4)[−(cos 2x)/2 − (cos 4x)/4 + (cos 6x)/6] from 0 to π/2 = (1/4)[(1/2 − 1/4 − 1/6) − (−1/2 − 1/4 + 1/6)] = 1/6.'),
    fz('sin³ x', (x) => sin(x) ** 3, (x) => -0.75 * cos(x) + cos(3 * x) / 12, 8, 'sin³ x = (3/4) sin x − (1/4) sin 3x, so the integral is [−(3/4) cos x + (cos 3x)/12] from 0 to π/2 = 0 − (−3/4 + 1/12) = 2/3.'),
    fz('cos³ x', (x) => cos(x) ** 3, (x) => 0.75 * sin(x) + sin(3 * x) / 12, 8, 'cos³ x = (3/4) cos x + (1/4) cos 3x, so the integral is [(3/4) sin x + (sin 3x)/12] from 0 to π/2 = 3/4 − 1/12 = 2/3.'),
  ],
];
```

### 4.3 Rounds and judging

```ts
const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
export type MatchRound = MatchRow & { assist: 0 | 1 | 2 };
export type FuseRound = FuseRow & { assist: 0 | 1 | 2; start: number };
export const buildMatch = (level: 1 | 2 | 3, random: () => number): MatchRound[] => MATCH[level].map((pool, k) => ({ ...pick(pool, random), assist: aid(k) }));
export const buildFuse = (random: () => number): FuseRound[] => FUSE.map((pool, k) => ({ ...pick(pool, random), assist: aid(k), start: 12 }));
/** The player's mix at x, with the amplitudes a[i] in eighths for the bands in slot order. */
export const mix = (r: MatchRow, a: number[]) => (x: number) => r.bands.reduce((s, [b], i) => s + ((a[i] ?? 0) / 8) * tone(b)(x), 0);
export const judgeMatch = (r: MatchRow, a: number[]) => r.bands.every(([, c], i) => a[i] === c);
export const judgeFuse = (r: FuseRow, k: number) => k === r.ans;
/** Where the mix is off by more than 0.02 on [0, 2π], sampled at 400 points: true means a gap there. */
export const gaps = (r: MatchRow, a: number[]) => Array.from({ length: 400 }, (_, i) => { const x = (2 * Math.PI * i) / 399; return Math.abs(mix(r, a)(x) - r.f(x)) > 0.02; });
```

`judgeMatch` is exact, but check that it agrees with the waveform: if `judgeMatch` is false, at least one of the 400 gap samples is true (tests in 8.1). Every row has at least one non-zero amplitude, so the starting mix (all zero) never wins. The fuse answer is never 12, so the fuse start never wins.

### 4.4 Words

- Amplitude text (eighths): `amp(k)` writes k/8 reduced, with a true minus sign: `amp(4) = '1/2'`, `amp(-2) = '−1/4'`, `amp(6) = '3/4'`, `amp(3) = '3/8'`, `amp(8) = '1'`, `amp(0) = '0'`.
- Fuse text (twelfths): `twelfths(k)` reduced: `6 → '1/2'`, `8 → '2/3'`, `4 → '1/3'`, `2 → '1/6'`, `9 → '3/4'`, `12 → '1'`, `24 → '2'`, `0 → '0'`.
- `matchIntel(r)`: `` `Lock signal: f(x) = ${r.name}. Tones offered: ${r.bands.map(([b]) => b).join(', ')}. Set each amplitude so the tones add up to the signal exactly.` ``
- Match hint line: `` `${matchIntel(r)} ${r.assist === 0 ? 'Round 1: your mix shows live on the scope.' : r.assist === 1 ? 'Your mix is hidden: a scope peek costs a charge.' : 'Boss round: no peek.'}` ``
- `matchMiss(r, a)`: `` `The mix did not match the lock signal: the scope flagged ${count} gap${count === 1 ? '' : 's'} in red, the alarm went off and the turret fired a stun dart.` `` where `count` is the number of separate runs of `true` in `gaps(r, a)`. Never name a band or an amplitude.
- `peekText(r, a)` (charge, round 2): `` `Scope peek: your mix ${judgeMatch(r, a) ? 'lies right on' : 'does not lie on'} the lock signal.` ``
- Match win: `` `Lock open! ${r.identity} So ∫ ${r.name} dx = ${r.integral} + C.` ``
- `fuseIntel(r)`: `` `The lock signal f(x) = ${r.name} charges the capacitor from x = 0 to x = π/2, and discharges where it is negative. Set the fuse rating to the net charge, ∫ f dx from 0 to π/2.` ``
- Fuse hint line: as the match line, with `Round 1: the charge meter shows the charge as it builds.` / `The meter is dark: a probe costs a charge.` / `Boss round: no probe.`
- `fuseMiss(r, k)`: k below ans: `` `The capacitor ended with more charge than the ${twelfths(k)} fuse could take: it blew, the alarm went off and the turret fired.` ``; k above ans: `` `The capacitor ended below the ${twelfths(k)} rating, so the fuse never tripped and the backup alarm went off.` ``
- `probeText(r, k)` (charge): `` `Probe: the net charge will be ${k < r.ans ? 'more than' : k > r.ans ? 'less than' : 'exactly'} your ${twelfths(k)} rating.` ``
- Fuse win: `` `Fuse tripped, vault open! ${r.work}` ``

## 5. Screen and art

Canvas 640 × 340 (`mountDialLevel`).

```ts
const SCOPE = { x0: 20, x1: 440, y0: 34, y1: 154 };          // the main oscilloscope
const DOOR = { cx: 548, cy: 120, r: 70 };                     // the round vault door
const HEX = { x: 452, y: 232 };                               // Hex's feet
const SLOTS = { y0: 244, y1: 322, x0: 20, x1: 620 };          // the tone slots (levels 1 to 3)
const METER = { x: 460, y0: 40, y1: 210, w: 18 };             // level 4 charge meter, 0 to 2
```

### 5.1 The main scope (levels 1 to 3)

- A dark green-black screen with a faint grid of 8 × 4 cells and a bezel, `LOCK SIGNAL` in `PAL.dim` at its top left.
- The lock signal f over x from 0 to 2π (400 samples), drawn in `PAL.pink`, glowing, **normalised**: scale so the largest |f| over the samples fills 45% of the scope height around its middle. **Do not draw a zero line, axis numbers or labels**: the player sees the shape of the signal but cannot read its offset or amplitude off the screen.
- The player's mix, drawn with the **same scale and centre**, in `PAL.cyan`: live in round 1; in round 2 only for 1.5 s after a scope peek (charge); never in round 3 until Transmit.

### 5.2 The tone slots (levels 1 to 3)

- One slot per band, spread evenly over `SLOTS`, each a small screen (width `(x1 − x0)/n − 10`, height 62) with the band's name under it (`1`, `cos 2x`, `sin 7x`, size 11, `PAL.white`) and the amplitude above it (`amp(k)`, size 11, `PAL.yellow`).
- Inside each slot, its own pure tone times the amplitude, over x from 0 to 2π, in `PAL.cyan` (the constant band draws a flat line). The scale is fixed: amplitude 1 reaches 26 px from the slot's middle line. This shows only the player's own input, so it is not a leak.
- **Handle**: one per slot, at the slot's centre x and `y = midY − (k/8)·26`, radius 12; `drag(r, px, py) = Math.round(((midY − py) / 26) * 8)` (the slider clamps to −8..8).

### 5.3 The vault, the turret and Hex

- The **door**: a steel disc (`#5a6378` rim, `#3b4252` face) with six bolts on the rim, a three-spoke wheel in the middle that turns slowly while waiting (idle life), and a small screen above it showing a padlock icon. In front: five horizontal red laser beams across the door (`PAL.red`, glowing, slight flicker).
- The **turret hatch** in the ceiling above the door (a dark rectangle with a small status light).
- **Hex** at `HEX` (feet), about 46 px tall, crouched and facing the door, with the holo screen of the wrist deck showing tiny animated waves.

### 5.4 Transmit (resolve, levels 1 to 3)

`delay: 0.9`.
- 0 to 0.8 s: Hex's holo beams to the scope, and the mix sweeps across the scope from left to right in `PAL.cyan`. Wherever `gaps(...)` is true the area between the two curves is shaded red as the sweep passes it.
- 0.9 s, **win**: both curves flash white, `LOCK OPEN` on the door screen; the bolts retract one by one (0.9 to 1.5 s), the laser beams switch off left to right (1.2 to 1.6 s), the door swings open (1.6 to 2.2 s) with a gold glow, and Hex fist-pumps, then dashes toward the door (2.0 to 2.3 s). Float `ACCESS GRANTED`.
- 0.9 s, **miss**: a red strobe tint over the whole screen (alpha 0.18, toggling every 0.12 s), `ALARM` on the door screen, the turret drops from the hatch (0.9 to 1.2 s), its red eye locks on Hex, and it fires a stun dart at 1.35 s. At impact: sparks (`A.burst(HEX.x, HEX.y − 30, PAL.cyan, 18, 150)`), a float `ZAP!`, Hex's hair frizzes and Hex sits down dizzy.

### 5.5 Level 4: the fuse

- The **main scope** shows f only over [0, π/2] (200 samples), normalised as in 5.1, in `PAL.pink`, with a faint zero line this time (the sign matters) but no numbers.
- The **charge meter** at `METER`: a vertical tube from 0 (bottom) to 2 (top) with ticks every 1/12 and labels at 0, 1/2, 1, 3/2 and 2. The player's **fuse** is a bright `PAL.yellow` bar across the tube at `twelfths(k)`. It is the drag handle: `at = [METER.x + 9, y(k)]` with `y(k) = METER.y1 − (k / 24)·(METER.y1 − METER.y0)`, and `drag = (r, px, py) => ((METER.y1 − py) / (METER.y1 − METER.y0)) · 24`.
- **Helper**: round 1 shows the final net charge as a dashed `PAL.green` mark on the meter (this is the round 1 help; it reveals the answer, as other games' round 1 helpers do). Round 2: no mark; a probe (charge) shows an up or down arrow beside the fuse for 1.5 s. Round 3: nothing.
- **Run** (`delay: 1.3`): 0 to 1.2 s, a cursor sweeps x from 0 to π/2 over the scope and the area between f and the zero line fills (`PAL.cyan` where f > 0, `PAL.orange` where f < 0). **Round 1 only**: the meter's liquid level follows F(x) − F(0), going up and down. **Rounds 2 and 3: the meter tube is sealed** (an opaque steel sleeve with rivets over the tube, only the fuse bar showing through a slot), during play **and during the run**, because the same round is replayed after a miss and a visible final level would give the answer away. At 1.3 s:
  - **Win**: the level sits exactly at the fuse, the fuse glows white and trips (`click`), and the door opens as in 5.4.
  - **k < ans**: the fuse blows (sparks and smoke at the bar) and the alarm and turret sequence of 5.4 plays.
  - **k > ans**: the level stops below the fuse, the fuse stays dark, and the alarm and turret sequence plays.

## 6. Controls and mount

```ts
function matchLevel(n: 1 | 2 | 3, random: () => number): DialLevel<MatchRound> {
  const rounds = buildMatch(n, random);
  const count = rounds[0].bands.length;            // 3 in level 1, 4 in levels 2 and 3
  return {
    hero: { name: 'Hex', role: '…', ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials: Array.from({ length: count }, (_, i) => ({ key: `b${i}`, aria: `Amplitude of tone ${i + 1}, in eighths`, label: `Tone ${i + 1}`, unit: '', step: 1, min: -8, max: 8, start: 0, text: (v: number) => amp(v) })),
    handles: Array.from({ length: count }, (_, i) => slotHandle(i, count)),
    test: { button: '🔍 Peek', aria: 'Scope peek: show your mix on the scope for a moment', read: (r, v) => { peekPending = true; return peekText(r, amps(v)); } },
    fire: { button: '📡 Transmit', aria: 'Transmit the tone mix to the lock' },
    judge: (r, v) => judgeMatch(r, amps(v)),
    miss: (r, v) => matchMiss(r, amps(v)),
    win: (r) => `Lock open! ${r.identity} So ∫ ${r.name} dx = ${r.integral} + C.`,
    hint: (r) => matchHint(r),
    hit: () => [DOOR.cx, DOOR.cy],
    delay: 0.9,
    draw: (s) => drawMatch(s),
  };
}
```

where `amps(v) = Array.from({ length: count }, (_, i) => v[`b${i}`])`. Every round of a level has the same number of bands (checked: 3, 4, 4).

```ts
function fuseLevel(random: () => number): DialLevel<FuseRound> {
  const rounds = buildFuse(random);
  return {
    hero: { name: 'Hex', role: '…', ...HEROES[3] },
    rounds,
    charges: [1, 1, 0],
    dials: [{ key: 'k', aria: 'Fuse rating, in twelfths', label: 'Fuse rating', unit: '', step: 1, min: 0, max: 24, start: (r) => r.start, text: (v) => twelfths(v) }],
    handles: [/* 5.5 */],
    test: { button: '🔍 Probe', aria: 'Probe: is the net charge more or less than the rating?', read: (r, v) => { probePending = true; return probeText(r, v.k); } },
    fire: { button: '⚡ Charge', aria: 'Run the charge through the fuse' },
    judge: (r, v) => judgeFuse(r, v.k),
    miss: (r, v) => fuseMiss(r, v.k),
    win: (r) => `Fuse tripped, vault open! ${r.work}`,
    hint: (r) => fuseHint(r),
    hit: () => [METER.x + 9, (METER.y0 + METER.y1) / 2],
    delay: 1.3,
    draw: (s) => drawFuse(s),
  };
}
```

Mount: levels 1 to 3 → `mountDialLevel(ctx, matchLevel(n, ctx.random), ARIA)`; level 4 → `mountDialLevel(ctx, fuseLevel(ctx.random), ARIA)`. `ARIA = 'A hacker beside a vault door with a laser grid, rebuilding the lock’s waveform on an oscilloscope from pure tones.'`

The labels of the DOM sliders are `Tone 1` to `Tone 4` (the band names change every round and are drawn on the canvas and listed in the hint line).

## 7. game.json (copy exactly)

```json
{
  "$schema": "../../../../../../schema/game.schema.json",
  "id": "signal-heist",
  "title": "Signal Heist",
  "summary": "Crack a vault lock by rebuilding its signal from pure tones with trigonometric identities, then charge the fuse with the integral.",
  "subject": "mathematics",
  "classLevel": 12,
  "chapter": { "number": 7, "name": "Integrals" },
  "ncertRef": "Section 7.3.2, Integration using trigonometric identities",
  "concepts": [
    "sin² x and cos² x by the double angle formula",
    "Products to sums: 2 sin A cos B and the like",
    "Powers such as sin³ x and cos⁴ x",
    "Triple products of sines and cosines",
    "Integrating a sum of pure tones",
    "Net value of a definite integral that changes sign"
  ],
  "learningOutcome": "The student can rewrite powers and products of sines and cosines as sums with trigonometric identities, integrate the result, and evaluate the definite integral.",
  "mechanic": "tune-to-target",
  "estimatedMinutes": 20,
  "levels": [
    {
      "title": "Double angle locks",
      "tier": "concept",
      "kind": "foundation",
      "adds": "Baseline: sin² x = (1 − cos 2x)/2 and cos² x = (1 + cos 2x)/2 turn a square into pure tones you can integrate (Ex 7.3 Q1; Example 7).",
      "hints": [
        "Use cos 2x = 1 − 2 sin² x = 2 cos² x − 1.",
        "A constant is a tone of frequency 0: the first slot.",
        "sin x cos x = (1/2) sin 2x."
      ]
    },
    {
      "title": "Product locks",
      "tier": "application",
      "kind": "concept",
      "adds": "New: products to sums, 2 sin A cos B = sin(A + B) + sin(A − B), and the cos cos and sin sin forms (Ex 7.3 Q2, Q7).",
      "hints": [
        "2 sin A cos B = sin(A + B) + sin(A − B); 2 cos A cos B = cos(A + B) + cos(A − B).",
        "2 sin A sin B = cos(A − B) − cos(A + B).",
        "If A < B, sin(A − B) is negative: sin(−2x) = −sin 2x."
      ]
    },
    {
      "title": "Power and triple locks",
      "tier": "application",
      "kind": "complexity",
      "adds": "Harder: cubes and fourth powers, and products of three, need the identities twice (Ex 7.3 Q3, Q4, Q6, Q10, Q11).",
      "hints": [
        "sin 3x = 3 sin x − 4 sin³ x and cos 3x = 4 cos³ x − 3 cos x.",
        "cos⁴ x = (cos² x)²: use the double angle formula twice.",
        "For three factors, turn two of them into a sum first, then multiply by the third."
      ]
    },
    {
      "title": "Charge the fuse",
      "tier": "challenge",
      "kind": "concept",
      "adds": "New: evaluate the definite integral from 0 to π/2 after the identity; parts below the axis count as negative (Ex 7.3 with Ex 7.8).",
      "hints": [
        "Rewrite the product as a sum of pure tones first.",
        "Integrate each tone: ∫ sin kx dx = −(cos kx)/k and ∫ cos kx dx = (sin kx)/k.",
        "Put in π/2 and 0 and subtract; the lock reads the net charge."
      ]
    }
  ],
  "misconceptions": [
    "∫ sin² x dx = (sin³ x)/3",
    "sin x cos 3x = (1/2)(sin 4x + sin 2x)",
    "A definite integral of a wave is always positive"
  ],
  "author": { "name": "Concept Arcade maintainers", "github": "AnubhavShankar" }
}
```

## 8. Tests

### 8.1 `logic.test.ts`

1. **Identities hold**: for every row of `MATCH`, `mix(r, winning amplitudes)` equals `r.f` at 201 points of [−3, 3] to 1e-12; the antiderivative text is not tested numerically, but test that d/dx of the mix's term-by-term antiderivative equals the mix (build it from the bands: ∫ a·sin kx = −a cos kx / k, ∫ a·cos kx = a sin kx / k, ∫ a = a x) at 5 points.
2. **One winner**: for every row and every slot i, with the other slots at their winning amplitudes, only the winning value in −8..8 passes `judgeMatch`. All zeros never win. If `judgeMatch` is false for a one-slot change, `gaps` has at least one `true`.
3. **Fuse**: for every row of `FUSE`, `F(π/2) − F(0)` is within 1e-12 of `ans / 12`, F′ = f at 3 points (central difference, 1e-6), Simpson's rule on f from 0 to π/2 agrees to 1e-9, and scanning k from 0 to 24 only `ans` wins; `start` (12) never equals `ans`.
4. **Levels**: 80 seeds; levels 1 to 3 have 3, 4, 4 bands in every round; `assist` is `[0, 1, 2]`.
5. **Words**: `amp` and `twelfths` give the strings listed in 4.4; `matchMiss` contains `gap` and no band name; `peekText` contains `lies right on` only for the winning amplitudes; `fuseMiss` contains `blew` (k < ans) or `never tripped` (k > ans) and never `twelfths(ans)` unless `twelfths(k)` is the same string (it is not, for a miss); win texts contain `+ C` (levels 1 to 3) or `vault open` (level 4).

### 8.2 `tests/signal-heist-ui.test.ts`

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch07-integrals/signal-heist/index';
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
```

Then `describe('Signal Heist', …)`: there are 3 sliders in level 1, 4 in levels 2 and 3, and 1 in level 4, all at their start values; a level 1 miss says `stun dart`; the peek costs a charge (`/Scope peek/`, then `/No charges left/`); a level 2 win contains `+ C`; a level 4 miss below the answer says `blew`.

## 9. Traps to avoid

- Never draw the zero line, the grid scale or numbers on the level 1 to 3 scope, and always normalise the signal: the amplitudes must not be readable off the picture.
- The player's mix on the main scope is a helper (round 1 live, round 2 on a peek only).
- Miss texts never name a band or an amplitude.
- The dials of a level are fixed, so every round of a level has the same number of bands.
- All motion finishes inside 2.4 s.
- Do not use a pronoun for Hex in any text.
