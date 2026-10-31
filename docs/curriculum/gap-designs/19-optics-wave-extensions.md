# 19 · Optics and wave extensions: Lens Lab L6, Telescope Lab L4, Wavefront Run L3, Slit Dash L4 (Physics Ch 9, 10)

Read `README.md` in this folder first. This brief **adds one level to each of four existing games** that were left out on purpose in the first build: refraction at one spherical surface (R4), the Cassegrain telescope (Ex 9.29), dispersion (W6), and coherent against incoherent light (W9). For each game read its files and UI test first, follow its patterns, keep its existing levels exactly as they are, and extend its UI test's harness level count and `levels` list.

## Part A · Lens Lab level 6 "One curved face" (§9.5.1; Example 9.5)

Folder `src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/lens-bench/`.

**Idea.** A glass rod with one curved end: n₂/v − n₁/u = (n₂ − n₁)/R. A lamp sits at distance |u| in front of the curved end, and the light must focus on the sensor at depth v **inside** the rod (in the boss round, a virtual image). The player dials the radius R of the curved face (whole cm from −50 to 50, 0 not allowed, start 30).

**Rounds** (`[n₁, n₂, u, v]`, cm; answer R):

| Round | pick one | R |
|---|---|---|
| 1 | `[1, 1.5, −30, 90]`, `[1, 1.5, −60, 60]`, `[1, 1.5, −40, 60]` | 10, 12, 10 |
| 2 | `[1, 1.5, −15, 90]`, `[1, 1.5, −24, 36]`, `[1, 4/3, −30, 40]` (a water rod) | 6, 6, 5 |
| 3 (boss) | `[1, 1.5, −20, −24]` (the image is virtual, on the lamp's side) | −40 (a concave face) |

Checked with R = (n₂ − n₁)/(n₂/v − n₁/u). The start (30) is never an answer.

**Words.** `explain`: `` `n₂/v − n₁/u = ${n2}/${v} − ${n1}/(${u}) = ${lhs}, which equals (n₂ − n₁)/R = ${n2 - n1}/R, so R = ${R} cm${R < 0 ? ': a concave face' : ''}.` `` with lhs as a fraction (`1/20`, `1/24`, `−1/80`). Miss (review fix 2026-10-30, as built): direction only, "too strongly" or "too weakly", with no focus depth, because a printed depth would let two misses pin down R. In the boss round the virtual image is shown as a dashed image-target box on the lamp side.

**HEROES** entry 6: story `'A single curved glass face bends light by itself: n₂/v − n₁/u = (n₂ − n₁)/R. The lantern’s light must focus on the sensor buried inside the glass rod.'`, objective `'Grind the rod’s end to the radius that focuses the light on the sensor, in three rounds.'`

**game.json**: append
```json
{
  "title": "One curved face",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: one curved face: n₂/v − n₁/u = (n₂ − n₁)/R; dial the radius that focuses the light on the sensor inside the rod (Section 9.5.1; Example 9.5).",
  "hints": [
    "Light goes from air (n₁ = 1) into glass (n₂ = 1.5) or water (4/3).",
    "Put in u (negative, the lamp is in front) and v, the depth of the sensor.",
    "A negative R means the face curves the other way: concave."
  ]
}
```
The game already has 6 concepts: leave them.

## Part B · Telescope Lab level 4 "Planet night": the Cassegrain (§9.7.2; Ex 9.29)

Folder `src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/telescope-lab/`.

**The challenge (owner request, 2026-10-30): the hero sees a planet on a starry night.** **Stella**, a young stargazer on a rooftop observatory, wants to photograph a planet tonight: Saturn's rings, Jupiter's moons, faint blue Neptune. Her telescope is a Cassegrain. The planet's image comes to a focus at one exact distance behind the small mirror. Slide the camera sensor there and the planet snaps into focus, with rings, bands and moons. Anywhere else, the planet stays a fuzzy blob and every star swells into a soft halo.

**Idea.** A Cassegrain telescope: a big concave mirror of radius R₁, and a small convex mirror of radius R₂ placed d in front of it. Light from the far planet would focus at f₁ = R₁/2 from the big mirror, which is f₁ − d behind the small mirror: a **virtual object** for it. The small convex mirror (focal length f₂ = R₂/2) forms the final image at v = 1/(1/f₂ − 1/(f₁ − d)) from the small mirror. The player slides the camera sensor to that distance (dial from 0 to 600 mm in steps of 5 mm, start 50).

**Rounds** (`[R₁, R₂, d]`, mm; answer v; the planet of the round):

| Round | pick one | v | planet |
|---|---|---|---|
| 1 | `[220, 140, 20]` (Ex 9.29) | 315 | Saturn |
| 2 | `[200, 120, 25]`, `[240, 160, 20]` | 300, 400 | Jupiter |
| 3 (boss) | `[180, 100, 15]` | 150 | Neptune (faint, behind thin drifting cloud) |

Checked against the textbook answer for Ex 9.29 (315 mm from the smaller mirror) and the same formula for the others.

**Words.** `intel`: `` `Tonight: ${planet}. Big mirror R₁ = ${R1} mm, small convex mirror R₂ = ${R2} mm, ${d} mm apart. Slide the camera sensor to where the planet’s image forms, measured from the small mirror.` ``. `explain`: `` `The big mirror would focus ${planet} at f₁ = ${f1} mm, which is ${f1} − ${d} = ${u} mm behind the small mirror: a virtual object. With f₂ = ${f2} mm, 1/v = 1/${f2} − 1/${u}, so v = ${v} mm from the small mirror.` `` Miss: `` `With the sensor at ${x} mm, ${planet} came out as a blurred disc: the light ${x < v ? 'had not yet come to a focus' : 'had already focused and spread out again'}.` ``

**Scene** (draw it as a real night out, not a diagram):
- **Sky**: a deep navy gradient, a faint Milky Way band, about 120 stars that twinkle (seeded positions and phases), a shooting star now and then (idle life), and the planet among them, slightly brighter and **not** twinkling.
- **Stella** on the observatory roof: a woolly beanie with a pompom, a long scarf, mittens and a thermos. Idle: breath puffs in the cold (small white clouds), looks up at the sky, blinks, sips from the thermos every few seconds. While waiting she peers at the camera screen; `face` moods: happy, worried with a sweat drop on a blurred shot, and wide sparkling eyes with a `WOW!` float on a sharp one.
- **The telescope**: a white Cassegrain tube on a mount pointing at the planet, drawn in cross-section in an inset (as the other levels draw their optics): the big mirror with its central hole, the small mirror on a spider mount, the light folding twice, and the camera sensor behind the big mirror (**the drag handle**).
- **The camera screen** (a round view, radius 60, at the top right): the planet as the sensor would record it. Saturn: a banded tan disc, tilted rings with the Cassini gap, and one moon. Jupiter: a striped disc with the Great Red Spot and four moons in a line. Neptune: a small blue disc with one moon, Triton. Blur grows with |x − v| **only in the live helper (round 1) and the paid test exposure**: draw the planet and the background stars as stacked soft circles (alpha discs) whose radius grows with the defocus. On a missed Expose the blob has a **fixed** blur radius whatever the error (review fix 2026-10-30: a blur that grows with the error lets two misses pin down v), and the miss text gives only the side: the image formed in front of or behind the sensor.
- **Helpers**: round 1, the camera screen updates live as the sensor slides (the round 1 help: the player can see sharpness change). Round 2, the screen is dark until a **test exposure** (charge) shows it for 1.5 s. Round 3 (Neptune), the screen stays dark until Expose.
- **Expose** (the run): a click, the shutter closes and opens, and the exposure develops over 1 s. Win: the planet appears pin-sharp, Stella shouts `WOW!`, and the photo flies into her star journal, pinned with a gold star (`A.burst` of `PAL.yellow` stars). Miss: a blurred blob develops, Stella rubs her eyes, and a `BLURRY` stamp appears.

**HEROES** entry 4: `name: 'Stella'`, `role: 'a young stargazer with a Cassegrain telescope on a rooftop observatory'`; story `'Stella wants to photograph a planet tonight. Her Cassegrain telescope folds the light: the big concave mirror sends it to a small convex mirror, which sends it back through a hole in the big mirror to the camera. The big mirror’s image is a virtual object for the small one.'`, objective `'Slide the camera sensor to where the planet comes into focus, and photograph all three planets.'`

**game.json**: append
```json
{
  "title": "Planet night",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: a Cassegrain telescope: the big mirror’s image is a virtual object for the small convex mirror; focus the planet’s final image (Ex 9.29).",
  "hints": [
    "The big mirror alone would focus at f₁ = R₁/2.",
    "That point is f₁ − d behind the small mirror: a virtual object.",
    "Use the mirror formula for the convex mirror with f₂ = R₂/2."
  ]
}
```
Add the concept `"The Cassegrain reflecting telescope"` (6 concepts).

## Part C · Wavefront Run level 3 "Rainbow race" (§10.3; Ex 10.3)

Folder `src/games/physics/class-12/ch10-wave-optics/wavefront-run/`.

**Idea.** Dispersion: glass has a slightly larger index for violet than for red, so violet travels more slowly (v = c/n). A red and a violet pulse race through a glass block of thickness d. To leave the block together, the violet pulse must start earlier by Δt = d(n_v − n_r)/c. The player sets the violet pulse's head start (−3.0 to 3.0 ns in 0.1 ns steps, stored as tenths; positive means violet starts first; start 0). The sign matters: red first is wrong.

**Rounds** (`[d (m), n_r, n_v]`; answer Δt):

| Round | pick one | Δt |
|---|---|---|
| 1 | `[3, 1.51, 1.53]` | 0.2 ns |
| 2 | `[6, 1.50, 1.53]` | 0.6 ns |
| 3 (boss) | `[15, 1.52, 1.54]`, `[12, 1.51, 1.535]` | 1.0 ns |

Checked: d(n_v − n_r)/c with c = 3 × 10⁸ m/s. Compute in tenths of ns with rounding: `Math.round(d * (nv - nr) / 3e8 * 1e10)`.

**Words.** `explain`: `` `In glass v = c/n, so violet (n = ${nv}) is slower than red (n = ${nr}). The extra time is d(n_v − n_r)/c = ${d} × ${dn}/(3 × 10⁸) s = ${dt} ns, so violet needs that head start.` `` Miss: `` `With a head start of ${x} ns the ${x < dt ? 'red' : 'violet'} pulse left the block first.` ``

**Scene.** The existing kart lanes (the game's "karts on crests" theme): a red kart and a violet kart in lanes through a glass block (slower inside, with crests drawn closer together, since λ is shorter in glass). The violet kart's start light turns green Δt (scaled to animation time) earlier. Win: both exit side by side with a photo finish. Miss: one leads at the exit by a **fixed** gap (the same for any wrong head start on that side), never a gap proportional to the error.

**HEROES** entry 3: story `'In glass, light slows down to c/n, and n is a little bigger for violet than for red. That is dispersion: the colours do not travel together.'`, objective `'Give the violet pulse the head start that makes both colours leave the glass together, in three rounds.'`

**game.json**: append
```json
{
  "title": "Rainbow race",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: dispersion: violet is slower in glass than red, so a violet pulse needs a head start of d(n_v − n_r)/c to exit with the red one (Ex 10.3).",
  "hints": [
    "In glass the speed is c/n.",
    "Violet has the larger n, so it is the slower colour.",
    "The extra time through thickness d is d(n_v − n_r)/c."
  ]
}
```
Add the concept `"Dispersion: speed in glass depends on colour"` (6 concepts).

## Part D · Slit Dash level 4 "Lamps or lasers" (§10.4)

Folder `src/games/physics/class-12/ch10-wave-optics/slit-dash/`.

**Idea.** Two coherent sources at a point give I = 4I₀cos²(φ/2), where φ = 2πΔ/λ. Two independent lamps are **incoherent**: the phase difference changes all the time, so the average is just I₀ + I₀ = 2I₀ everywhere. The meter at a point on the screen must be set to the brightness there, in units of I₀ (0 to 4 in steps of 0.5, stored as halves 0 to 8, start 8). Exactly one value wins.

**Rounds** (source type and path difference Δ in wavelengths):

| Round | pick one | brightness (I₀) |
|---|---|---|
| 1 (coherent) | Δ = λ/4; Δ = λ/3; Δ = λ/6 | 2, 1, 3 |
| 2 (mixed) | coherent λ/3; coherent λ/6; coherent λ/2; incoherent λ/3; incoherent λ/6 | 1, 3, 0, 2, 2 |
| 3 (boss, mixed) | coherent Δ = λ/2; incoherent Δ = λ/6; coherent Δ = 0 | 0, 2, 4 |

Review fix 2026-10-30. Round 2 was all bulbs, so the source type never mattered. The boss row "incoherent λ/4" gave 2I₀ by the coherent formula too, so it did not test incoherence. The start is a constant 2.5 I₀, which is no row's answer.

**Words.** `explain`: coherent: `` `Coherent beams: φ = 2πΔ/λ = ${phiText}, so I = 4I₀cos²(φ/2) = ${I}I₀.` ``; incoherent: `` `Two separate bulbs are incoherent: their phase difference keeps changing, so the cos² term averages to 1/2 and I = 2I₀ everywhere, whatever the path difference.` `` Miss: see the scene (direction only).

**Scene.** The existing fringe screen. For a coherent round, a laser feeds two slits and fringes appear. For an incoherent round, two separate light bulbs light the screen evenly, with no fringes once the run plays. The run shows the true brightness at the point **only on a win**. On a miss the meter flashes red and an arrow says only whether the light was brighter or dimmer than the setting (review fix 2026-10-30: drawing the true brightness after a miss is the answer). Miss text: `` `The meter set to ${x}I₀ read ${x > I ? "too high" : "too low"} for the light at that point.` ``

**HEROES** entry 4: story `'Two laser slits give fringes, but two ordinary bulbs do not: their phases are not locked, so their intensities simply add.'`, objective `'Set the meter to the brightness at the marked point, in three rounds.'`

**game.json**: append
```json
{
  "title": "Lamps or lasers",
  "tier": "challenge",
  "kind": "concept",
  "adds": "New: two lamps are incoherent: their intensities just add to 2I₀ everywhere, while coherent beams give 4I₀cos²(φ/2) (Section 10.4).",
  "hints": [
    "Coherent sources keep a fixed phase difference; independent bulbs do not.",
    "Incoherent: the intensities add, I₀ + I₀ = 2I₀.",
    "Coherent: I = 4I₀cos²(φ/2) with φ = 2πΔ/λ."
  ]
}
```
Add the concept `"Coherent and incoherent addition"` (6 concepts).

## Tests (all parts)

- Logic tests over 80 seeds: the tables' answers (recompute with the formulas); one winner by scanning the dial; the start never wins; no miss text contains the answer.
- UI tests: harness level counts and `levels` extended; the new level plays through `shellTests`.
