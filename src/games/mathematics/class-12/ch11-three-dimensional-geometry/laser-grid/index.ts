// Inspirations: Portal laser puzzles and laser-tag arenas (aim a beam in 3D at a target). Lux is a laser technician with a tripod emitter. The scene is drawn
// in a 3D view with the beams to scale in direction only: the readings are in the numbers, not in the picture.
import { PAL } from '@core/arcade';
import { FLASH, helperOn, paidFlash } from '@core/aidflash';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type SceneInput } from '@core/dialgame';
import { backdrop, face, num, track, trackHandle, verdict } from '@core/mathkit';
import { glow, line, text } from '@core/neon';
import { buildRounds, clearance, cosOf, cross, dot, explain, intel, judge, missText, norm, spotText, tipAt, type Round, type V3 } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const O = { x: 250, y: 220, s: 20 };
const RUN = 1.7;
/** Levels 5 and 6 draw in their own view: level 6 is zoomed out so the receiver (a + 3b) always fits, and nothing is measurable by eye. */
const VIEWS: Record<number, { x: number; y: number; s: number }> = { 5: { x: 330, y: 205, s: 15 }, 6: { x: 320, y: 205, s: 7 } };
/** The wall the beam hits: the beams are clipped to this box, and a miss scorches where the player's beam meets its edge. */
const WALL = { x0: 150, y0: 72, x1: 620, y1: 330 };
/** How long a test pulse keeps the player's beam on screen (seconds). */
const PULSE = 1.5;
/** The largest tick (λ) at which the ray p + λd is still inside the wall. */
function exitLam(p: [number, number], d: [number, number]): number {
  let m = Infinity;
  if (d[0] > 1e-9) m = Math.min(m, (WALL.x1 - p[0]) / d[0]);
  else if (d[0] < -1e-9) m = Math.min(m, (WALL.x0 - p[0]) / d[0]);
  if (d[1] > 1e-9) m = Math.min(m, (WALL.y1 - p[1]) / d[1]);
  else if (d[1] < -1e-9) m = Math.min(m, (WALL.y0 - p[1]) / d[1]);
  return Number.isFinite(m) ? Math.max(0, m) : 0;
}
const inWall = (p: [number, number]) => p[0] >= WALL.x0 && p[0] <= WALL.x1 && p[1] >= WALL.y0 && p[1] <= WALL.y1;
const P = (v: V3): [number, number] => [O.x + O.s * (v[0] - 0.45 * v[2]), O.y - O.s * (v[1] - 0.3 * v[2])];
const unit = (v: V3, len: number): V3 => {
  const n = norm(v);
  return n === 0 ? [0, 0, 0] : [(v[0] / n) * len, (v[1] / n) * len, (v[2] / n) * len];
};

const HEROES = [
  { story: 'The direction cosines of a line are l = cos α, m = cos β, n = cos γ, the cosines of the angles it makes with the axes, and l² + m² + n² = 1. From direction ratios (a, b, c) you get them by dividing by √(a² + b² + c²).', objective: 'Set the numerators so the cosines over the denominator aim the beam at the target, in three rounds. The check shows in round 1; a check costs a charge later.' },
  { story: 'Two lines with direction ratios (a₁, a₂, a₃) and (b₁, b₂, b₃) are perpendicular exactly when a₁b₁ + a₂b₂ + a₃b₃ = 0. Only direction ratios matter, not where the lines pass.', objective: 'Set the unknown ratio p so the two beams are perpendicular, in three rounds. The dot product shows live in round 1; a check costs a charge later.' },
  { story: 'The angle θ between two lines satisfies cos θ = (a₁b₁ + a₂b₂ + a₃b₃)/(|a||b|). With one ratio unknown, the length of b changes too, so the equation is not a straight line in the unknown.', objective: 'Set the unknown ratio c so the beams meet at the cosine wanted, in three rounds. The cosine shows live in round 1; a check costs a charge later.' },
  { story: 'Skew lines never meet and are not parallel. Their shortest distance is d = |(a₂ − a₁)·(b₁ × b₂)| / |b₁ × b₂|: the offset between the two lines, projected on the direction square to both.', objective: 'Set the offset h so the two beams clear each other by exactly the distance wanted, in three rounds. The boss round shows no live clearance.' },
  { story: 'Lux’s new laser runs on the line r = a + λb: it starts at the emitter a and its tip moves by b every tick. The emitter is bolted to relay A, and the beam must pass relay B at the tick shown.', objective: 'Set the step b so the beam passes relay B on time, in three rounds.' },
  { story: 'The control room sends the line as a cartesian code. Read the start point and the step out of it, and mind the signs: (3 − x)/2 = λ means x = 3 − 2λ.', objective: 'Set the emitter and the step from the code so the beam hits the receiver, in three rounds.' },
];

/** The emitter on its base, standing where the beam starts. */
function emitter(g: G, x: number, y: number, t: number, firing: boolean) {
  line(g, x, y - 4, x - 6, y + 8, PAL.dim, 2);
  line(g, x, y - 4, x + 6, y + 8, PAL.dim, 2);
  g.fillStyle = PAL.dim;
  g.fillRect(x - 7, y - 12, 14, 9);
  g.fillStyle = firing ? PAL.red : '#552222';
  g.beginPath();
  g.arc(x + 7, y - 7, 2.5 + (firing ? Math.sin(t * 40) : 0), 0, Math.PI * 2);
  g.fill();
}

/** A scorch mark on the wall: a dark patch with an ember ring and a few cracks. */
function scorch(g: G, x: number, y: number) {
  g.fillStyle = '#1a0a14';
  g.beginPath();
  g.arc(x, y, 9, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = PAL.orange;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(x, y, 9, 0, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < 6; i++) line(g, x + Math.cos(i * 1.05) * 9, y + Math.sin(i * 1.05) * 9, x + Math.cos(i * 1.05) * 15, y + Math.sin(i * 1.05) * 15, PAL.orange, 1.5);
}

/** Lux: a laser technician in a helmet and goggles, standing by a tripod emitter that glows when it fires. */
function lux(g: G, x: number, y: number, t: number, mood: Mood, firing: boolean) {
  g.fillStyle = '#4a3a7a';
  g.fillRect(x - 12, y + 2, 9, 24);
  g.fillRect(x + 3, y + 2, 9, 24);
  g.fillStyle = PAL.pink;
  g.fillRect(x - 16, y - 34, 32, 38);
  g.fillStyle = '#e8c9a0';
  g.beginPath();
  g.arc(x, y - 48, 12, 0, Math.PI * 2);
  g.fill();
  face(g, x, y - 46, 9, mood, t, '#1b1030');
  g.fillStyle = PAL.yellow;
  g.beginPath();
  g.arc(x, y - 52, 13, Math.PI, 2 * Math.PI);
  g.fill();
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(x - 12, y - 49);
  g.lineTo(x + 12, y - 49);
  g.stroke();
  line(g, x + 14, y - 26, x + 34, y - 14, '#e8c9a0', 5);
  // The tripod emitter
  const ex = x + 48;
  line(g, ex, y - 10, ex - 12, y + 26, PAL.dim, 3);
  line(g, ex, y - 10, ex + 12, y + 26, PAL.dim, 3);
  g.fillStyle = PAL.dim;
  g.fillRect(ex - 10, y - 24, 22, 14);
  g.fillStyle = firing ? PAL.red : '#552222';
  g.beginPath();
  g.arc(ex + 12, y - 17, 4 + (firing ? Math.sin(t * 40) : 0), 0, Math.PI * 2);
  g.fill();
}

function level(n: number, random: () => number): DialLevel<Round> {
  const hero = HEROES[n - 1];
  const rounds = buildRounds(n, random);
  /** Levels 5 and 6: the beam runs on r = a + λb, set with dials for b (level 5) or for a and b (level 6). */
  const lines = n >= 5;
  const keys = n === 1 ? ['p', 'q', 'r'] : n === 5 ? ['b1', 'b2', 'b3'] : n === 6 ? ['a1', 'a2', 'a3', 'b1', 'b2', 'b3'] : ['v'];
  const labels = n === 1 ? ['Numerator p', 'Numerator q', 'Numerator r'] : n === 5 ? ['b₁', 'b₂', 'b₃'] : n === 6 ? ['a₁', 'a₂', 'a₃', 'b₁', 'b₂', 'b₃'] : [n === 2 ? 'Ratio p' : n === 3 ? 'Ratio c' : 'Offset h'];
  const vals = (v: Record<string, number>) => keys.map((k) => v[k]);
  /** The last test pulse: its round, the setting it fired, and the clock time it first showed (set by the first frame that draws it). */
  let pulse: { r: Round; v: number[]; t0: number | null } | null = null;
  let sparked: unknown = null;
  /** Levels 1 to 4: the readings, the player's beam (level 1) and the clearance segment (level 4) are the helper: live in round 1, 1.5 s after a paid check in round 2. */
  const flash = paidFlash();
  let checked: number[] = [];

  const drawLines = ({ g, r, v, t, rt, shot, A }: SceneInput<Round>) => {
    backdrop(g);
    const view = VIEWS[n];
    const Q = (p: V3): [number, number] => [view.x + view.s * (p[0] - 0.45 * p[2]), view.y - view.s * (p[1] - 0.3 * p[2])];
    const isCode = r.kind === 'code';
    if (pulse && pulse.r === r && pulse.t0 === null) pulse.t0 = t;
    // The player's own beam shows live in round 1, for a moment after a test pulse in round 2, and never before Fire in the boss round.
    const frozen = !shot && r.assist !== 0 && pulse !== null && pulse.r === r && pulse.t0 !== null && t - pulse.t0 < PULSE;
    const showBeam = shot !== null || r.assist === 0 || frozen;
    A.canvas.dataset.beamShown = showBeam ? '1' : '0';
    const use = frozen ? pulse!.v : vals(shot ? shot.v : v);
    const a: V3 = isCode ? [use[0], use[1], use[2]] : r.A!;
    const b: V3 = isCode ? [use[3], use[4], use[5]] : [use[0], use[1], use[2]];
    const lamEnd = isCode ? 3 : r.lam!;
    const target: V3 = isCode ? tipAt(r.a, r.b, 3) : r.B!;
    const p0 = Q(a);
    const p1 = Q(tipAt(a, b, 1));
    const dv: [number, number] = [p1[0] - p0[0], p1[1] - p0[1]];
    const lamExit = exitLam(p0, dv);
    const grow = shot ? Math.min(1, rt / 0.9) : 1;
    const done = shot !== null && rt > 0.9;
    const mood: Mood = shot ? (rt > RUN - 0.4 ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
    // The floor grid, and the back wall the beam hits
    const lo = isCode ? -16 : -8;
    const step = isCode ? 4 : 1;
    g.save();
    g.beginPath();
    g.rect(WALL.x0, WALL.y0, WALL.x1 - WALL.x0, WALL.y1 - WALL.y0);
    g.clip();
    for (let i = lo; i <= -lo; i += step) {
      line(g, ...Q([i, 0, lo]), ...Q([i, 0, -lo]), PAL.grid, 1);
      line(g, ...Q([lo, 0, i]), ...Q([-lo, 0, i]), PAL.grid, 1);
    }
    // Relay level: drop lines to the floor give the depth of A and B
    if (!isCode) for (const p of [r.A!, r.B!]) line(g, ...Q(p), ...Q([p[0], 0, p[2]]), PAL.dim, 1, [3, 4]);
    // The player's beam, with a tick at every whole λ
    if (showBeam && (dv[0] !== 0 || dv[1] !== 0)) {
      const reach = shot ? (shot.ok ? lamEnd : lamExit) * grow : isCode ? 3.5 : lamEnd + 1;
      const at = (l: number): [number, number] => [p0[0] + l * dv[0], p0[1] + l * dv[1]];
      const ray = () => line(g, ...p0, ...at(reach), PAL.yellow, shot ? 3 : 2, shot ? [] : [6, 5]);
      if (shot) glow(g, PAL.yellow, 8, ray);
      else ray();
      const len = Math.hypot(dv[0], dv[1]);
      const nx = -dv[1] / len;
      const ny = dv[0] / len;
      for (let l = 1; l <= (isCode ? 3 : lamEnd + 1); l++) {
        const [x, y] = at(l);
        if (l > reach || !inWall([x, y])) continue;
        line(g, x - 5 * nx, y - 5 * ny, x + 5 * nx, y + 5 * ny, PAL.yellow, 2);
        text(g, String(l), x + 11 * nx, y + 11 * ny + 3, PAL.yellow, 10);
      }
      // Relay level: where the tip is at the tick that matters, with its drop line
      if (!isCode && lamEnd <= reach && inWall(at(lamEnd))) {
        const tip = tipAt(a, b, lamEnd);
        line(g, ...Q(tip), ...Q([tip[0], 0, tip[2]]), PAL.yellow, 1, [3, 4]);
        g.fillStyle = PAL.yellow;
        g.beginPath();
        g.arc(...Q(tip), 4, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.restore();
    g.strokeStyle = PAL.grid;
    g.lineWidth = 2;
    g.strokeRect(WALL.x0, WALL.y0, WALL.x1 - WALL.x0, WALL.y1 - WALL.y0);
    // The emitter: relay A is fixed; in level 6 it stands where the player's dials put it
    emitter(g, p0[0], p0[1], t, shot !== null && rt < RUN);
    if (!isCode) text(g, `relay A (${r.A!.map(num).join(', ')})`, p0[0], p0[1] + 24, PAL.dim, 11);
    // The ring: relay B, or the receiver (no coordinates, the code is the only source)
    const [tx, ty] = Q(target);
    const col = done ? (shot!.ok ? PAL.green : PAL.red) : PAL.yellow;
    g.strokeStyle = col;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(tx, ty, 12, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(tx, ty, 3, 0, Math.PI * 2);
    g.stroke();
    text(g, isCode ? 'receiver' : `relay B (${r.B!.map(num).join(', ')})`, tx, ty - 20, PAL.pink, 11);
    if (done) text(g, shot!.ok ? '✓' : '✕', tx + 22, ty + 5, col, 16);
    // The scorch, where the player's own beam meets the wall; sparks on the ring for a win
    if (done && sparked !== shot) {
      sparked = shot;
      if (shot!.ok) A.burst(tx, ty, PAL.green, 30, 170);
      else A.burst(p0[0] + lamExit * dv[0], p0[1] + lamExit * dv[1], PAL.orange, 16, 110);
    }
    if (done && !shot!.ok) scorch(g, p0[0] + lamExit * dv[0], p0[1] + lamExit * dv[1]);
    if (isCode) {
      g.fillStyle = '#0a1a22';
      g.fillRect(40, 30, 410, 38);
      g.strokeStyle = PAL.cyan;
      g.lineWidth = 2;
      g.strokeRect(40, 30, 410, 38);
      text(g, 'LINE CODE', 78, 43, PAL.dim, 9);
      text(g, r.code!, 245, 60, PAL.cyan, 14);
      if (Math.floor(t * 2) % 2 === 0) text(g, '▌', 436, 60, PAL.cyan, 14);
    } else text(g, `B is reached at tick λ = ${r.lam}`, 500, 58, PAL.green, 12);
    lux(g, 70, 270, t, mood, shot !== null && rt < RUN);
    if (shot && rt > RUN - 0.3) verdict(g, shot.ok, 'BEAM ON TARGET', 'BEAM OFF TARGET');
  };

  return {
    hero: { name: 'Lux', role: 'a laser technician with a tripod emitter who aims beams in three dimensions', story: hero.story, objective: hero.objective },
    rounds,
    charges: [1, 1, 0],
    dials: keys.map((k, i) => ({
      key: k,
      aria: n === 1 ? `Direction numerator ${k}` : lines ? `${n === 6 && i < 3 ? 'Emitter' : 'Step'} ${labels[i]}` : labels[0],
      label: labels[i],
      unit: '',
      step: 1,
      min: (r: Round) => r.min,
      max: (r: Round) => r.max,
      start: (r: Round) => r.start[i],
      text: (v: number) => (n === 1 ? `${k} = ${num(v)}` : lines ? `${labels[i]} = ${num(v)}` : `${n === 2 ? 'p' : n === 3 ? 'c' : 'h'} = ${num(v)}`),
    })),
    handles: n === 1 || lines ? [] : [trackHandle<Round>('v', (r) => r.min, (r) => r.max)],
    test: lines
      ? {
          button: '🔬 Test pulse',
          aria: 'Test pulse: fire a weak beam for this setting',
          read: (r, v) => {
            pulse = { r, v: vals(v), t0: null };
            return spotText(r, vals(v));
          },
        }
      : {
          button: '🔬 Check',
          aria: 'Check: read the beams for this setting',
          read: (r, v) => {
            checked = vals(v);
            flash.paid();
            return spotText(r, vals(v));
          },
        },
    fire: { button: '🔴 Fire the beam', aria: 'Fire the beam' },
    judge: (r, v) => judge(r, vals(v)),
    miss: (r, v) => missText(r, vals(v)),
    win: (r) => `Beams aligned! ${explain(r)}`,
    hint: (r) =>
      lines
        ? `${intel(r)} ${r.assist === 0 ? 'Your beam shows live.' : r.assist === 1 ? 'No live beam: a test pulse shows it for a moment and costs a charge.' : 'Boss round: no live beam and no test pulse.'}`
        : `${intel(r)} ${r.assist === 0 ? 'The live check is on.' : r.assist === 1 ? 'No live check: a check shows the readings for a moment and costs a charge.' : 'Boss round: no live check, no check.'}`,
    hit: () => [O.x + 120, O.y - 60],
    delay: RUN,
    draw: (s) => {
      if (lines) return drawLines(s);
      const { g, r, k, v, t, rt, shot, A } = s;
      backdrop(g);
      const use = vals(shot ? shot.v : v);
      // The helper (readings, the player's beam in level 1, the clearance segment in level 4): live in round 1, for 1.5 s after a paid check in
      // round 2 (showing the checked setting), on a win, never otherwise. A miss in rounds 2 and 3 draws none of it.
      const since = flash.since(t, k);
      const frozen = !shot && r.assist === 1 && since < FLASH;
      const help = helperOn(r.assist, shot !== null && shot.ok, shot ? Infinity : since);
      const hv = frozen ? checked : use;
      const showBeam = n !== 1 || shot !== null || r.assist === 0 || frozen;
      A.canvas.dataset.helper = help ? '1' : '0';
      A.canvas.dataset.beamShown = showBeam ? '1' : '0';
      const grow = shot ? Math.min(1, rt / 0.9) : 1;
      // The floor grid and axes
      for (let i = -4; i <= 6; i++) {
        line(g, ...P([i, 0, -3]), ...P([i, 0, 5]), PAL.grid, 1);
        line(g, ...P([-4, 0, i - 1]), ...P([6, 0, i - 1]), PAL.grid, 1);
      }
      const beam = (from: V3, d: V3, color: string, w: number, len = 7) => {
        const e = unit(d, len * grow);
        line(g, ...P(from), ...P([from[0] + e[0], from[1] + e[1], from[2] + e[2]]), color, w);
      };
      const mood: Mood = shot ? (rt > RUN - 0.4 ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      let reading = '';
      if (r.kind === 'cosines') {
        const tgt = unit(r.a, 7);
        g.fillStyle = PAL.pink;
        const [tx, ty] = P(tgt);
        g.fillRect(tx - 8, ty - 8, 16, 16);
        g.strokeStyle = shot && rt > 0.9 ? (shot.ok ? PAL.green : PAL.red) : PAL.yellow;
        g.lineWidth = 2;
        g.strokeRect(tx - 12, ty - 12, 24, 24);
        text(g, `target (${r.a.map(num).join(', ')})`, tx, ty - 18, PAL.pink, 11);
        if (showBeam) beam([0, 0, 0], (frozen ? checked : use) as V3, PAL.yellow, 3);
        const len = Math.hypot(hv[0], hv[1], hv[2]) / r.N;
        reading = `length over ${r.N}: ${num(Math.round(len * 100) / 100)}${cross(r.a, hv as V3).every((x) => x === 0) && dot(r.a, hv as V3) > 0 ? '  ✓ on target' : ''}`;
      } else if (r.kind === 'skew') {
        const p2: V3 = [r.off[0], r.off[1], use[0]];
        const a = unit(r.a, 4);
        const b = unit(r.b, 4);
        line(g, ...P([-a[0], -a[1], -a[2]]), ...P(a), PAL.pink, 3);
        line(g, ...P([p2[0] - b[0], p2[1] - b[1], p2[2] - b[2]]), ...P([p2[0] + b[0], p2[1] + b[1], p2[2] + b[2]]), PAL.yellow, 3);
        const nn = cross(r.a, r.b);
        // The dashed clearance segment is proportional to the clearance: it is the helper, so it appears only while the helper does.
        if (help) {
          const side = (dot([r.off[0], r.off[1], hv[0]], nn) / dot(nn, nn)) * grow;
          line(g, ...P([0, 0, 0]), ...P([nn[0] * side, nn[1] * side, nn[2] * side]), PAL.green, 1.5, [4, 4]);
        }
        text(g, 'beam 1', P(a)[0] + 6, P(a)[1], PAL.pink, 11);
        text(g, 'beam 2', P([p2[0] + b[0], p2[1] + b[1], p2[2] + b[2]])[0] + 6, P([p2[0] + b[0], p2[1] + b[1], p2[2] + b[2]])[1], PAL.yellow, 11);
        reading = `clearance ${num(Math.round(clearance(r, hv[0]) * 100) / 100)}`;
      } else {
        const b: V3 = r.kind === 'perp' ? [use[0], r.b[1], r.b[2]] : [r.b[0], r.b[1], use[0]];
        beam([0, 0, 0], r.a, PAL.pink, 3);
        beam([0, 0, 0], b, PAL.yellow, 3);
        text(g, 'beam 1', P(unit(r.a, 7))[0] + 6, P(unit(r.a, 7))[1], PAL.pink, 11);
        text(g, 'beam 2', P(unit(b, 7))[0] + 6, P(unit(b, 7))[1], PAL.yellow, 11);
        const bh: V3 = r.kind === 'perp' ? [hv[0], r.b[1], r.b[2]] : [r.b[0], r.b[1], hv[0]];
        reading = r.kind === 'perp' ? `dot product ${num(dot(r.a, bh))}` : `cos θ ${num(Math.round(cosOf(r, hv[0]) * 100) / 100)}`;
      }
      if (help) text(g, reading, 500, 40, PAL.yellow, 12);
      else text(g, 'check hidden', 500, 40, PAL.dim, 12);
      if (r.kind === 'angle') text(g, `wanted cos θ = ${r.cn}/${r.cd}`, 500, 58, PAL.green, 12);
      if (r.kind === 'skew') text(g, `wanted clearance ${num(r.T)}`, 500, 58, PAL.green, 12);
      lux(g, 70, 270, t, mood, shot !== null && rt < RUN);
      if (n > 1) track(g, r.min, r.max);
      if (shot && rt > RUN - 0.3) verdict(g, shot.ok, 'BEAMS ALIGNED', 'BEAMS OFF');
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(6, ctx.level)), ctx.random) as never, 'A laser technician beside a 3D grid with beams aimed by direction ratios at a target, against each other, or along a line a + λb through relays.');
  },
});
