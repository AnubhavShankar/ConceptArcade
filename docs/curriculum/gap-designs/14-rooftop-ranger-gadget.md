# 14 · Rooftop Ranger level 5 "Gadget readouts": sec⁻¹, cosec⁻¹, cot⁻¹ (Maths Ch 2, §2.2; Ex 2.1 Q3, Q7, Q8, Q10)

Read `README.md` in this folder first. This brief **adds one level to Rooftop Ranger**. Read the game's files (`src/games/mathematics/class-12/ch02-inverse-trigonometric-functions/rooftop-ranger/`) and `tests/rooftop-ranger-ui.test.ts` first (the game is also the reference for character detail: keep Hawk, the rifle and the robots exactly as they are). Keep levels 1 to 4 unchanged (same seeds, same rounds).

## 1. The idea

Hawk's new gadget scope shows its readings **upside down**, as reciprocal ratios:
- **Round 1, sec**: the range-finder shows **sec θ = r/x**, the laser range over the robot's east offset (negative means west). The wall turret's bearing θ runs over [0, π] (as in level 4), so θ = sec⁻¹(r/x), in [0, π] without π/2.
- **Round 2, cosec**: the balcony scope shows **cosec θ = r/y**, the range over the target's height (negative means below). The tilt θ runs over [−π/2, π/2] (as in level 3), so θ = cosec⁻¹(r/y), in [−π/2, π/2] without 0.
- **Round 3 (boss), cot**: the turret shows **cot θ = x/y**, the target's east offset over its height above the turret (the height is always positive here). The bearing runs over (0, π), so θ = cot⁻¹(x/y), and a negative ratio means an **obtuse** bearing, not a negative one.

This is exactly the principal-value table of §2.2 for the three reciprocal functions (Ex 2.1 Q3 cosec⁻¹ 2, Q7 sec⁻¹(2/√3), Q8 cot⁻¹ √3, Q10 cosec⁻¹(−√2)).

## 2. Logic changes (`logic.ts`)

1. `Kind` gets `'gadget'`; `KINDS` gets `'gadget'` (level 5). `Round` gets optional `fn?: 'sec' | 'cosec' | 'cot'` and `ratio?: string` (the reading as shown).
2. Readings by step k (steps of π/12; checked numerically against `acos(1/v)`, `asin(1/v)` and the (0, π) cot⁻¹):

```ts
const SEC: Record<number, string> = { 2: '2/√3', 3: '√2', 4: '2', 8: '−2', 9: '−√2', 10: '−2/√3' };
const COSEC: Record<number, string> = { 2: '2', 3: '√2', 4: '2/√3', 6: '1', [-2]: '−2', [-3]: '−√2', [-4]: '−2/√3', [-6]: '−1' };
const COT: Record<number, string> = { 2: '√3', 3: '1', 4: '1/√3', 6: '0', 8: '−1/√3', 9: '−1', 10: '−√3' };
```

3. Rounds of level 5 (one `pick` each, in order):
   - Round 1: `fn 'sec'`, k from `[2, 3, 4, 8, 9, 10]`, drawn like a `turret` round (target east for k < 6, west for k > 6). Dial: the turret's pan dial, 0..12.
   - Round 2: `fn 'cosec'`, k from `[2, 3, 4, 6, -2, -3, -4, -6]`, drawn like a `sky` round (drone above for k > 0, robot below for k < 0). Dial: tilt, −6..6.
   - Round 3: `fn 'cot'`, k from `[8, 9, 10, 2, 3, 4, 6]` but **at least half the time obtuse**: pick from `[8, 9, 10]` when `random() < 0.6`, else from `[2, 3, 4, 6]`. Drawn like a `turret` round with the target **above** the turret's level on the far wall. Dial: pan, 0..12.
   - `assist: aid(i)`. Each round's geometry fields (`r`, `x`, `y`, `vx`, `vy`) are set so the existing drawing works: reuse the `turretRound`/`skyRound` helpers to make the position, then add `fn` and `ratio`.
4. `judge` is unchanged (`s.k === r.k`).
5. `missText` and `spotterText`: reuse the turret (east or west) and sky (above or below) texts by `fn` (`sec`, `cot` → turret; `cosec` → sky).
6. `intel` for gadget: `` `The gadget shows ${fn === 'sec' ? 'sec θ = range ÷ east offset' : fn === 'cosec' ? 'cosec θ = range ÷ height' : 'cot θ = east offset ÷ height'} = ${ratio}. ${fn === 'cosec' ? 'Tilt' : 'Swing'} the ${fn === 'cosec' ? 'scope' : 'turret'} to θ.` ``
7. `explain` for gadget:
   - sec: `` `sec θ = ${ratio}, so cos θ = ${cosText(k)}. The branch of sec⁻¹ is [0, π] without π/2, so θ = sec⁻¹(${ratio}) = ${angleText(k)}.` ``
   - cosec: `` `cosec θ = ${ratio}, so sin θ = ${sinText(k)}. The branch of cosec⁻¹ is [−π/2, π/2] without 0, so θ = cosec⁻¹(${ratio}) = ${angleText(k)}.` ``
   - cot: k = 6: `` `cot θ = 0, so θ = π/2 (straight up the wall), inside the branch (0, π).` ``; otherwise `` `cot θ = ${ratio}, so tan θ = ${tanOf(k)}. The branch of cot⁻¹ is (0, π), so a ${k > 6 ? 'negative ratio gives an obtuse angle' : 'positive ratio gives an acute angle'}: θ = cot⁻¹(${ratio}) = ${angleText(k)}.` `` where `tanOf(k)` is the reciprocal written: for k = 2 `1/√3`, 3 `1`, 4 `√3`, 8 `−√3`, 9 `−1`, 10 `−1/√3`.

## 3. Index changes (`index.ts`)

- A fifth `HEROES` entry (keyed by kind `gadget`): story `'Hawk’s new gadget scope is wired backwards: it shows sec, cosec or cot of the angle instead of the angle. Each reciprocal function has its own principal branch, and only the angle in that branch hits.'`, objective `'Read the gadget, find the angle in the right branch, and stun all three targets.'`
- Clamp to 5 levels.
- Drawing: reuse the turret scene for `sec` and `cot`, the sky scene for `cosec`. Add the **gadget display**: a small cracked screen clipped to Hawk's scope showing `sec θ = 2`, `cosec θ = −√2` or `cot θ = −1/√3` in `PAL.green` digits that flicker slightly. The picture stays not to scale (the existing code already places targets so the angle cannot be read off).
- The dial is the existing tilt or pan control for the scene; in level 5 the control switches by round (round 2 uses tilt), so set the dial's range per round, as `DialSpec` allows (min, max and start as functions of the round).
- The laser sight (round 1), the spotter call (round 2, charge) and nothing (round 3) as in the other levels.

## 4. game.json changes

Append:

```json
{
  "title": "Gadget readouts",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: the scope shows sec, cosec or cot ratios; use their branches: sec⁻¹ in [0, π], cosec⁻¹ in [−π/2, π/2], cot⁻¹ in (0, π) (Ex 2.1 Q3, Q7, Q8, Q10).",
  "hints": [
    "sec θ = 1/cos θ, cosec θ = 1/sin θ and cot θ = 1/tan θ.",
    "cosec⁻¹ of a negative number is a negative angle, but sec⁻¹ and cot⁻¹ of a negative number are obtuse.",
    "cot⁻¹(−1) = 3π/4, not −π/4: its branch is (0, π)."
  ]
}
```

Add the concept `"Branches of sec⁻¹, cosec⁻¹ and cot⁻¹"` (6 concepts). The `learningOutcome` is 194 characters now: leave it unchanged. `estimatedMinutes`: add 5.

## 5. Tests

- `logic.test.ts`: level 5 over 80 seeds: the functions are `sec`, `cosec`, `cot` in order; `ratio` matches the table for k; scanning the dial's range only k wins; at least one boss round over the seeds is obtuse and at least one acute; `explain` names the branch.
- `tests/rooftop-ranger-ui.test.ts`: harness level count 4 → 5, `levels` → `[1, 2, 3, 4, 5]`; the slider's range in level 5 round 2 is −6..6 and in rounds 1 and 3 is 0..12.

## 6. Traps to avoid

- Never draw the scope or rifle pointing at the answer before the shot (the reference already keeps the rifle in a rest pose; keep it).
- cot⁻¹ of a negative ratio is obtuse: test it.
