# 16 · Small maths extensions: Portal Line levels 4 and 5, Drone Dispatch level 4, Card Sharp level 4 (Maths Ch 1, 10, 13)

Read `README.md` in this folder first. This brief **adds levels to three existing games**. For each game read its four files and its UI test first, follow the game's own patterns, keep existing levels exactly as they are (same seeds, same rounds), and extend each UI test's harness level count and `levels` list.

## Part A · Portal Line levels 4 and 5: inverse and composition (§1.4; Examples 15 to 17)

Folder `src/games/mathematics/class-12/ch01-relations-and-functions/portal-line/`.

**Idea.** Portal Line's travellers walk through a portal f to doors. Section 1.4 keeps composition and the inverse of a bijection (worked examples, no exercise).
- **Level 4, "The return portal"**: f(x) = ax + b is a bijection of the number line. Build the return portal g(y) = (y − p)/q that brings **every** traveller home. It works only when q = a and p = b: g is f⁻¹.
- **Level 5, "Two portals"**: the travellers pass f, then g. One return portal must undo the composite g∘f, so it is (g∘f)⁻¹. The trap is composing in the wrong order: f∘g is a different map.

**Dials** (both levels): `p` from −9 to 9 and `q` from −5 to 5, start p = 0, q = 1 (q = 1 is never an answer below except where noted; if a round's answer has q = 1, start q at 2). q = 0 is invalid: `A.freeNote('A portal cannot divide by zero.')`.

**Rounds.** Entries are `[a, b]` for f(x) = ax + b, and for level 5 `[[a, b], [c, d]]` with g(y) = cy + d.

| Level | Round 1 | Round 2 | Round 3 (boss) |
|---|---|---|---|
| 4 | `[2, 3]`, `[3, −4]`, `[4, 1]` | `[−2, 7]`, `[−1, 4]`, `[−3, −2]` | written as `5 − 2x` `[−2, 5]`, `6 − 3x` `[−3, 6]`, `2(x − 3)` `[2, −6]` |
| 5 | `f = x + 2, g = 3x` (g∘f = 3x + 6); `f = 2x, g = x − 5` (2x − 5) | `f = 2x + 1, g = 2x − 3` (4x − 1); `f = x − 3, g = −2x + 1` (−2x + 7) | `f = 3x − 1, g = −x + 4` (−3x + 5); `f = −x + 2, g = 2x + 3` (−2x + 7) |

Answers: level 4 `p = b, q = a`; level 5 `p = cb + d, q = ca`. Checked: g(f(x)) = x for the level 4 answers, and for level 5 the wrong order f∘g gives a different p every time (2, −10, −5, −2, 11, −1 against 6, −5, −1, 7, 5, 7).

**Words.**
- `intel` L4: `` `Portal f sends traveller x to door ${fText}. Build the return portal g(y) = (y − p)/q so every traveller gets home.` ``
- `intel` L5: `` `Travellers go through portal f(x) = ${fText}, then portal g(x) = ${gText}. Build one return portal (y − p)/q that brings them all home.` ``
- `missText`: send travellers 0 to 4. Name the first one that does not get home and where it lands: `` `Traveller ${x} came out of the return portal at ${landing}, not at home: the portal does not undo the trip.` ``. Review fix 2026-10-30, as built: the side only, with no number or traveller named, because one landing together with the player's own p and q gives f in one step. The text is `a traveller came out of the return portal to the left/right of home`, and the whole crowd stops a fixed 27 px to that side.
- `explain` L4: `` `f(x) = ${a}x + ${b}. To undo it, subtract ${b} and divide by ${a}: f⁻¹(y) = (y − ${b})/${a}. So p = ${b}, q = ${a}.` `` (write `+ −4` as `− 4` and `(y − −4)` as `(y + 4)`).
- `explain` L5: `` `g(f(x)) = ${c}(${a}x + ${b}) + ${d} = ${q}x + ${p}. Undo that: x = (y − ${p})/${q}. In the other order, f(g(x)) = ${fogText}, which is a different map: the order of composition matters.` ``

**Scene.** The existing portal and number-line scene. Level 4 adds a second, return portal arch (glowing `PAL.pink`) that sends travellers back along the line. Level 5 shows two arches f and g in a row. The run: travellers 0 to 4 walk through, then back. Win: all five step onto their home markers and cheer. Miss: the lost travellers land on the wrong markers, look around confused, and a sign pops up `LOST!`.

**HEROES** entries: L4 story `'Portal f is a bijection: every door gets exactly one traveller. So it can be undone. The return portal subtracts p and divides by q, and only the right p and q bring everyone home.'`, objective `'Build the return portal so all travellers get home, in three rounds.'`; L5 story `'Now the travellers pass two portals, f and then g. To bring them home in one step, the return portal must undo g∘f, the whole trip in that order.'`, objective `'Build one return portal for the two-portal trip, in three rounds.'`

**game.json**: append
```json
{
  "title": "The return portal",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: a bijection has an inverse; build the return portal (y − p)/q that brings every traveller home from f(x) = qx + p (Section 1.4; Examples 15 to 17).",
  "hints": [
    "f multiplies by a and then adds b.",
    "Undo the steps in reverse: subtract b, then divide by a.",
    "Check with a traveller: f(1), then the return portal, must give 1."
  ]
},
{
  "title": "Two portals",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: through f, then g, the travellers meet g(f(x)); one return portal must undo that composite, and the order matters (Section 1.4; Examples 15, 16).",
  "hints": [
    "Work out g(f(x)) first: put f(x) into g.",
    "g(f(x)) is again of the form qx + p.",
    "f(g(x)) is usually different, so keep the order."
  ]
}
```
and add the concept `"Inverse of a bijection; composition gof"` (6 concepts).

## Part B · Drone Dispatch level 4 "Crosswind": adding vectors (§10.4; Ex 10.2 Q6, Misc Q3)

Folder `src/games/mathematics/class-12/ch10-vector-algebra/drone-dispatch/`.

**Idea.** Vectors add tip to tail (the triangle law). Dash either flies two legs as one hop, or flies against a wind: the ground track is Dash's own vector plus the wind, so the own vector is target − wind. The player taps the vector plane as in the other levels.

**Rounds** (new kinds `'legs'`, `'wind'`, `'wind2'`; the answer is a whole-number vector):

| Round | kind | pick one | answer |
|---|---|---|---|
| 1 | legs | legs (3, 1) and (−1, 4); (2, −3) and (1, 5); (−4, 2) and (1, 3); (4, 0) and (−1, 3) | the sum: (2, 5), (3, 2), (−3, 5), (3, 3) |
| 2 | wind | wind (−2, 1), target (3, 4); wind (1, −2), target (−2, 3); wind (2, 2), target (4, −1) | target − wind: (5, 3), (−3, 5), (2, −3) |
| 3 (boss) | wind2 (the target is two minutes away; the command is per minute) | wind (2, −3), target (−2, 4); wind (−1, 2), target (4, 6); wind (1, 1), target (6, −2) | target/2 − wind: (−3, 5), (3, 1), (2, −2) |

Check every answer fits the plane's range in `index.ts`.

**Words.** `explain`: legs: `` `Triangle law: one hop covering both legs is their sum, ${v1} + ${v2} = ${ans}.` ``; wind: `` `Ground track = own vector + wind, so own vector = target − wind = ${T} − ${w} = ${ans}.` ``; wind2: `` `Each minute Dash must cover half the trip, ${half}. Own vector = ${half} − ${w} = ${ans}.` `` Miss (review fix 2026-10-30): **direction only**. If a miss named or drew where Dash really landed, shifting the command by the gap to the target would win at once, without the triangle law. So the miss text names only the compass direction of the error from the target: ``Dash came down on a rooftop  of the target.`` with `dir` one of 8 compass words from the sign of (landing − target). The flight ends at a **fixed** 1.5 units from the target in that compass direction, never at the true landing point.

**Scene.** The existing city and vector plane. For wind rounds, draw a windsock and wind streaks blowing with the wind vector, and draw Dash's own vector, the wind vector and the resultant as a triangle (the triangle law made visible) **only after a win**. A miss must not draw the resultant to the true landing point. In round 1 the helper arrow shows the live resultant; in round 2 only on a charge; in round 3 nothing.

**HEROES** entry 4: story `'A crosswind blows over the city. Dash’s path over the ground is its own vector plus the wind, tip to tail. To reach the target, Dash must aim at target − wind.'`, objective `'Send Dash the vector that lands on the target despite the wind, in three rounds.'`

**game.json**: append
```json
{
  "title": "Crosswind",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: the triangle law. Two legs add tip to tail, and a wind adds to the drone’s own vector, so own vector = target − wind (Ex 10.2 Q6; Misc Q3).",
  "hints": [
    "Add vectors component by component.",
    "Ground track = own vector + wind.",
    "If the target is two minutes away, each minute covers half of it."
  ]
}
```
and add the concept `"Adding vectors: triangle law, wind"` (6 concepts).

## Part C · Card Sharp level 4 "Not and or": properties of conditional probability (§13.2.1)

Folder `src/games/mathematics/class-12/ch13-probability/card-sharp/`.

**Idea.** On the reduced deck (cards that fit B), P(E′ | B) = 1 − P(E | B), and P(A ∪ C | B) = P(A | B) + P(C | B) − P(A ∩ C | B). Level 4 reuses level 1's **tap board**: tap every card that fits B, then tap again the ones that also fit the new event. The new events are "not A" and "A or C".

**Rounds** (kind `'board'` with a compound event):
- Round 1: event `not A` (`test = !pa.test`).
- Round 2: event `A or C` (`test = pa.test || pc.test`, with pa and pc from different families).
- Round 3 (boss): event `neither A nor C` (`test = !(pa.test || pc.test)`).
- Use the existing `PREDS` and `board` generator logic, with the new event test and text (`` `not ${pa.text}` ``, `` `${pa.text} or ${pc.text}` ``, `` `neither ${pa.text} nor ${pc.text}` ``). Require the event to hold for at least one card of B and fail for at least one, so the reduced fraction is not 0 or 1.

**Words.** `explain` adds the property: not: `` `P(not A | B) = 1 − P(A | B) = 1 − ${frac(k, n)} = ${frac(n − k, n)}.` ``; or: `` `P(A ∪ C | B) = P(A | B) + P(C | B) − P(A ∩ C | B) = (${a} + ${c} − ${ac})/${n} = ${frac(u, n)}.` ``; neither: `` `P(neither | B) = 1 − P(A ∪ C | B) = 1 − ${frac(u, n)} = ${frac(n − u, n)}.` ``

**HEROES** entry 4: story `'The audience now names compound events on the reduced deck: not A, A or C, neither. The rules of probability still hold once B is given: P(not A | B) = 1 − P(A | B), and for a union add and take off the overlap.'`, objective `'Mark the reduced deck and the cards of the compound event exactly, in three rounds.'`

**game.json**: append
```json
{
  "title": "Not and or",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: P(E′ | F) = 1 − P(E | F) and P(A ∪ C | F) = P(A | F) + P(C | F) − P(A ∩ C | F), counted on the reduced deck (Section 13.2.1).",
  "hints": [
    "First mark every card that fits B: that is the new sample space.",
    "Not A: the cards of B that do not fit A.",
    "A or C: count A and C, and do not count the overlap twice."
  ]
}
```
and add the concept `"Complement and union given F"` (6 concepts).

## Tests (all parts)

- Logic tests over 80 seeds: the tables' answers; one winner (scan the dials, or for Card Sharp, every board that differs from the target in one card loses); the start never wins; no miss text contains the answer.
- UI tests: harness level counts and `levels` extended; the new levels play through `shellTests`.
