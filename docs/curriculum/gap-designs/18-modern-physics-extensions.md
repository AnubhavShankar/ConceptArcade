# 18 · Modern physics extensions: Photon Cannon level 4, Nucleus Builder level 4 (Physics Ch 11, 13)

Read `README.md` in this folder first. This brief **adds one level to each of two existing games**. Read each game's four files and UI test first, follow its patterns, keep the existing levels exactly as they are, and extend each UI test's harness level count and `levels` list.

## Part A · Photon Cannon level 4 "Brightness and colour" (§11.4.1 to 11.4.3)

Folder `src/games/physics/class-12/ch11-dual-nature-of-radiation-and-matter/photon-cannon/`.

**Idea.** The experiment's three findings, played together:
- The **saturation current** is proportional to the light's **intensity** (§11.4.1).
- The **stopping potential** does **not** depend on intensity (§11.4.2).
- The stopping potential follows the **photon energy**: eV₀ = hν − φ, so a photon energy higher by ΔE raises V₀ by ΔE/e (§11.4.3).

Each round gives a reference reading of the phototube (lamp brightness b₁, saturation current I₁, photon energy E₁, stopping potential V₀₁). The task asks for a new saturation current I₂, perhaps with a new photon energy E₂. The player sets **two dials**: the lamp brightness b (1 to 10) and the stopping voltage V (0.0 to 4.0 V in 0.1 V steps, stored as whole tenths 0 to 40).

Answers: b₂ = b₁·I₂/I₁, and V₀₂ = V₀₁ + (E₂ − E₁), the same V₀ when the colour is unchanged.

Review fix 2026-10-30: the knob is the lamp's **photon rate** (shown as "Photon rate (brightness)"), not its power. The saturation current is set by how many photons arrive each second, so "same rate, new colour, same current" is true physics. At a fixed power, a bluer lamp would send fewer photons.

**Rounds** (copy exactly; currents in µA, energies in eV, voltages in V):

| Round | pick one `[b₁, I₁, E₁, V₀₁, E₂, I₂]` | answer b₂, V₀₂ |
|---|---|---|
| 1 (same colour) | `[2, 6, 3.0, 1.2, 3.0, 15]`, `[3, 9, 2.8, 0.8, 2.8, 21]`, `[4, 10, 3.5, 1.5, 3.5, 20]`, `[1, 4, 2.6, 0.6, 2.6, 12]` | (5, 1.2), (7, 0.8), (8, 1.5), (3, 0.6) |
| 2 (new colour, same current) | `[3, 9, 2.8, 0.8, 3.6, 9]`, `[2, 8, 3.0, 1.0, 4.2, 8]`, `[5, 10, 2.5, 0.3, 3.1, 10]` | (3, 1.6), (2, 2.2), (5, 0.9) |
| 3 (boss, both change) | `[4, 8, 2.5, 0.5, 3.9, 14]`, `[2, 5, 3.2, 1.1, 2.6, 15]`, `[3, 6, 4.0, 1.7, 3.3, 16]` | (7, 1.9), (6, 0.5), (8, 1.0) |

Checked: b₂ is a whole number, and E₂ is above the work function φ = E₁ − V₀₁ in every row, so emission still happens. Compute V₀₂ in tenths with integer arithmetic (`Math.round(10·V₀₁) + Math.round(10·(E₂ − E₁))`) to avoid floating-point slips.

**Words.**
- `intel`: `` `Reference run: brightness ${b1} gives a saturation current of ${I1} µA, and photons of ${E1} eV are stopped by ${V01} V. Now ${E2 === E1 ? 'the same colour' : `photons of ${E2} eV`} and a target current of ${I2} µA: set the brightness and the stopping voltage.` ``
- `missText` (brightness checked first): brightness wrong (review fix 2026-10-30: direction only, because printing the saturation current would give b₂ in one division): `` `At brightness ${b} the current saturated ${b < b2 ? "below" : "above"} the target mark.` ``; voltage wrong: `` `At ${V} V the fastest electrons ${V < V02 ? 'still reached the collector' : 'turned back before the gap was closed'}: the meter did not read zero exactly at the stopping voltage.` `` (the first part is the player's own reading; never print V₀₂).
- `explain`: `` `The saturation current is proportional to intensity: b = ${b1} × ${I2}/${I1} = ${b2}. The stopping potential depends only on the photon energy: φ = ${E1} − ${V01} = ${phi} eV, so V₀ = ${E2} − ${phi} = ${V02} V${E2 === E1 ? ', the same as before, however bright the lamp' : ''}.` ``
- Win: `` `Both readings match! ${explain}` ``

**Scene.** The phototube (an emitter plate and a collector in a glass bulb), a lamp with a brightness knob (the number of photon streams drawn matches b), a battery set to the retarding voltage, and an ammeter with its needle, plus the game's existing characters. Round 1 helper: a live I–V graph showing the player's curve (saturation level ∝ b, cut-off at −V₀ for the colour). Round 2: no graph; a test run (charge) shows it for 1.8 s. Round 3: nothing. Run: electrons stream across. A wrong brightness makes the needle stop a **fixed** distance above or below the target mark (the same for any wrong brightness on that side, never proportional to b). A wrong voltage sends some electrons into the collector (too low), or turns them all back early with a gap in the stream (too high). A win makes the needle settle on the target, the electrons turn back exactly at the collector, and a green light shows.

**HEROES** entry 4: story `'Volt runs the reference experiment again with a new lamp. A brighter lamp frees more electrons, so the saturation current grows, but each electron still gets the same energy from one photon. Only a new colour changes the stopping potential.'`, objective `'Set the brightness and the stopping voltage that match the new run, in three rounds.'`

**game.json**: append
```json
{
  "title": "Brightness and colour",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: the saturation current grows with intensity, but the stopping potential does not; it follows the photon energy, eV₀ = hν − φ (Sections 11.4.1 to 11.4.3).",
  "hints": [
    "The saturation current is proportional to the intensity.",
    "A brighter lamp of the same colour does not change the stopping potential.",
    "A new colour changes V₀ by the change in photon energy, in eV."
  ]
}
```
Add the concept `"Intensity sets the current, frequency sets V₀"` (6 concepts).

## Part B · Nucleus Builder level 4 "Nuclide twins" (§13.2)

Folder `src/games/physics/class-12/ch13-nuclei/nucleus-builder/`.

**Idea.** Katamari rolls a nucleus out of protons and neutrons. The clue names a relation to a known nuclide: an **isotope** (same Z), an **isobar** (same A) or an **isotone** (same N), plus one more fact. The player sets **Z** (1 to 30) and **N** (0 to 40). There is exactly one answer.

**Rounds** (copy exactly; `[reference, relation, extra, Z, N, name]`):

| Round | pick one |
|---|---|
| 1 (isotope) | `³⁵₁₇Cl`, isotope, `with 20 neutrons` → (17, 20) ³⁷Cl; `⁵⁶₂₆Fe`, isotope, `with mass number 54` → (26, 28) ⁵⁴Fe; `¹₁H`, isotope, `with mass number 3` → (1, 2) ³H |
| 2 (isobar) | `¹⁴₆C`, isobar, `with Z = 7` → (7, 7) ¹⁴N; `⁴⁰₁₈Ar`, isobar, `with Z = 20` → (20, 20) ⁴⁰Ca; `³₁H`, isobar, `with Z = 2` → (2, 1) ³He |
| 3 (isotone, boss) | `¹⁶₈O`, isotone, `with mass number 17` → (9, 8) ¹⁷F; `¹³₆C`, isotone, `with Z = 7` → (7, 7) ¹⁴N; `⁴⁰₁₈Ar`, isotone, `with mass number 42` → (20, 22) ⁴²Ca |

**Words.**
- `intel`: `` `Build ${article} ${relation} of ${ref} ${extra}. Set the number of protons Z and neutrons N.` ``
- `missText`: `` `You rolled Z = ${Z}, N = ${N}, so A = ${Z + N}: that ${problem}.` `` where `problem` names the first failed condition: `is not ${relation === 'isotope' ? `an isotope of ${ref} (Z must match)` : relation === 'isobar' ? `an isobar of ${ref} (A must match)` : `an isotone of ${ref} (N must match)`}`, or `does not have ${extra}`. These are the player's own numbers; the rule is from the book; no answer is given.
- `explain`: isotope: `` `Isotopes share Z = ${Z}; ${extraText}, so N = ${N} and the nuclide is ${name}.` ``; isobar: `` `Isobars share A = ${A}; with Z = ${Z}, N = A − Z = ${N}: ${name}.` ``; isotone: `` `Isotones share N = ${N}; ${extraText}, so Z = ${Z}: ${name}.` ``

**Scene.** The existing nucleon ball, with protons (red, `+`) and neutrons (grey, `0`) added as the dials change, and a nuclide card showing the player's ᴬ_Z symbol (from Z and N; the element letters are drawn only after a win, because the element name would give Z away). The reference nuclide's card sits beside it. Helpers: round 1 shows a live check light for each condition; round 2 a charge shows them for 1.5 s; round 3 nothing. Win: the ball locks into a glowing nucleus and the card shows the element. Miss: the ball wobbles and sheds a nucleon.

**HEROES** entry 4: story `'Nuclides come in families. Isotopes have the same number of protons Z, isobars the same mass number A, isotones the same number of neutrons N.'`, objective `'Roll the nuclide each clue describes, in three rounds.'`

**game.json**: append
```json
{
  "title": "Nuclide twins",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: isotopes share Z, isobars share A and isotones share N; build the nuclide that matches the clue (Section 13.2).",
  "hints": [
    "A = Z + N.",
    "Isotope: same Z. Isobar: same A. Isotone: same N.",
    "Use the clue’s extra fact to fix the other number."
  ]
}
```
Add the concept `"Isotopes, isobars and isotones"` (6 concepts).

## Tests

- Logic tests over 80 seeds: the table answers; one winner (scan both dials with the other at the answer); the start never wins; no miss text contains the winning V₀₂ (Part A) or the winning nuclide name (Part B).
- UI tests: harness level counts and `levels` extended; the new level plays through `shellTests`.
