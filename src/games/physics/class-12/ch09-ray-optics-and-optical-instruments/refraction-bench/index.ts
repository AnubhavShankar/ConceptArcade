import { createArcade, PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { fmt } from '@core/judge';
import { along, glow, line, orb, text, trace } from '@core/neon';
import { helperOn } from '@core/aidflash';
import { CONE_MIN, GEOM, PROBE_DEG, SLIDER, buildGame, coneMax, coneStart, criticalDeg, explainRound, hitPoint, judgeCone, judgeDepth, judgePipe, judgeSlab, judgeSnell, missText, pipeGuided, probeText, resultLine, sinD, snellLegDeg, type PipeRound } from './logic';
import { pinCharacter, target } from './art';

const W = 640;
const H = 340;
const RAD = Math.PI / 180;

/** The zigzag path of a ray entering the fibre at `i`, and whether it leaks at the first wall. */
function pipePath(r: PipeRound, i: number, x0: number, x1: number, y0: number, half: number): { pts: [number, number][]; leaks: boolean } {
  const sinR = sinD(i) / r.n1;
  const slope = Math.tan(Math.asin(Math.min(1, sinR)));
  const leaks = !pipeGuided(r, i);
  const pts: [number, number][] = [[x0, y0]];
  if (slope < 1e-6) return { pts: [[x0, y0], [x1, y0]], leaks: false };
  let x = x0;
  let y = y0;
  let dir = -1;
  let run = half / slope;
  for (let k = 0; k < 80 && x < x1; k++) {
    const nx = Math.min(x1, x + run);
    y += dir * slope * (nx - x);
    x = nx;
    pts.push([x, y]);
    if (leaks) break;
    dir = -dir;
    run = (2 * half) / slope;
  }
  return { pts, leaks };
}

export default defineGame({
  mount(ctx) {
    const game = buildGame(ctx.level, ctx.random);
    let onRound: (i: number) => void = () => undefined;
    const A = createArcade(ctx, game.hero, { W, H, aria: 'An arcade screen: a glowing hero, light rays bending or bouncing at the edge between two materials, and a target.', rounds: 3, charges: game.charges, onRound: (i) => onRound(i) });
    const clearSay = () => {
      A.feedback.hidden = true;
    };
    const ri = () => Math.min(A.round, 2);

    // ================= level 1: Ray and the detector ====================================================
    if (game.kind === 'snell') {
      const rounds = game.rounds;
      const { CX, BY, R } = GEOM.snell;
      const S = SLIDER.snell;
      let inc: number = S.start;
      /** r is the angle at which the outgoing leg is drawn: the detector on a hit, a fixed offset beside it on a miss. */
      let shot: { ok: boolean; r: number } | null = null;
      let notes: string[] = [];
      let inset: { which: 'A' | 'B'; born: number } | null = null;
      const slider = A.slider({ aria: 'Angle of incidence in the first material in degrees', label: 'Ray’s angle in medium A', min: S.min, max: S.max, step: S.step, value: inc, unit: '°', onInput: (v) => (inc = v) });
      A.handle({ x: () => CX - R * sinD(inc), y: () => BY - R * Math.cos(inc * RAD), r: 24, drag: (px, py) => slider.set(Math.atan2(CX - px, BY - py) / RAD) });
      const probe = (which: 'A' | 'B') => () => {
        const r = rounds[ri()];
        if (which === 'A' && r.probeA === null) return A.freeNote('Medium A is air: a probe from air goes straight on, and its index is 1.');
        if (!A.spend()) return;
        notes.push(`probe ${which}: ${PROBE_DEG}° in air → ${fmt((which === 'A' ? r.probeA : r.probeB) ?? 0)}°`);
        notes = notes.slice(-3);
        inset = { which, born: A.clock };
        A.say(probeText(which, r), true);
      };
      A.controls.append(
        slider.row,
        A.button('🔦 Probe A', 'Probe medium A with a shot from air', probe('A'), 'secondary'),
        A.button('🔦 Probe B', 'Probe medium B with a shot from air', probe('B'), 'secondary'),
        A.button('🔥 Fire', 'Fire Ray at this angle', () => {
          const r = rounds[ri()];
          const j = judgeSnell(r, inc);
          shot = { ok: j.ok, r: snellLegDeg(r, inc, j.ok) };
          const [hx, hy] = hitPoint(game, ri(), inc, j.ok)!;
          A.resolve(j.ok, j.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[1]}` : missText(game, ri(), inc), { x: hx, y: hy }, 1.3);
        }),
      );
      onRound = (i) => {
        inc = S.start;
        slider.set(inc);
        shot = null;
        notes = [];
        inset = null;
        clearSay();
        A.hint.textContent = `The detector sits ${fmt(rounds[i].rShown)}° from the normal in medium B. Use probes to find each material’s refractive index, then work out the angle for Ray.`;
      };
      A.scene((g, t) => {
        if (A.phase === 'between') return;
        const r = rounds[ri()];
        const air = r.probeA === null;
        g.fillStyle = air ? 'rgba(77,225,255,0.05)' : 'rgba(77,225,255,0.2)';
        g.fillRect(0, 0, W, BY);
        g.fillStyle = 'rgba(160,170,230,0.28)';
        g.fillRect(0, BY, W, H - BY);
        line(g, 0, BY, W, BY, PAL.white, 2);
        line(g, CX, 20, CX, H - 10, PAL.dim, 1.5, [6, 5]);
        text(g, air ? 'A: air' : 'A: unknown material', 70, 24, PAL.cyan, 12);
        text(g, 'B: unknown material', 80, H - 18, PAL.dim, 12);
        text(g, 'normal', CX + 30, 34, PAL.dim, 11);
        const tx = CX + R * sinD(r.r);
        const ty = BY + R * Math.cos(r.r * RAD);
        const resolving = A.phase === 'resolve' && shot !== null;
        target(g, tx, ty, 16, resolving && shot!.ok && A.rt >= 1.2, A.clock);
        text(g, `detector ${fmt(r.rShown)}°`, tx + 28, ty + 36, PAL.white, 11, 'left');
        const ox = CX - R * sinD(inc);
        const oy = BY - R * Math.cos(inc * RAD);
        const end: [number, number] = resolving ? [CX + R * sinD(shot!.r), BY + R * Math.cos(shot!.r * RAD)] : [CX, BY];
        const path: [number, number][] = resolving ? [[ox, oy], [CX, BY], end] : [[ox, oy], [CX, BY]];
        trace(g, path, resolving ? A.rt / 1.2 : 1, PAL.yellow, 3);
        if (resolving && A.rt < 1.2) {
          const [hx, hy] = along(path, A.rt / 1.2);
          orb(g, hx, hy, 8, PAL.yellow, t);
        } else {
          orb(g, ox, oy, 14, PAL.yellow, t, resolving ? (shot!.ok ? 'cheer' : 'worried') : 'happy');
        }
        notes.forEach((n, k) => text(g, n, 14, 46 + k * 14, PAL.cyan, 10, 'left'));
        if (inset) {
          const bx = 478;
          const by = 12;
          g.fillStyle = 'rgba(0,0,0,0.45)';
          g.fillRect(bx, by, 150, 112);
          g.strokeStyle = PAL.cyan;
          g.lineWidth = 1.5;
          g.strokeRect(bx, by, 150, 112);
          const mx = bx + 75;
          const my = by + 56;
          line(g, bx, my, bx + 150, my, PAL.white, 1.5);
          line(g, mx, by + 8, mx, by + 104, PAL.dim, 1, [4, 4]);
          const rr = inset.which === 'A' ? r.probeA ?? 0 : r.probeB;
          line(g, mx - 46 * sinD(PROBE_DEG), my - 46 * Math.cos(PROBE_DEG * RAD), mx, my, PAL.yellow, 2);
          line(g, mx, my, mx + 46 * sinD(rr), my + 46 * Math.cos(rr * RAD), PAL.yellow, 2);
          text(g, `probe ${inset.which}: ${PROBE_DEG}° → ${fmt(rr)}°`, mx, by + 108, PAL.cyan, 10);
        }
      });
    }

    // ================= level 2: Needle under a new liquid ===============================================
    if (game.kind === 'depth') {
      const rounds = game.rounds;
      const S = SLIDER.depth;
      const surface = 120;
      let s: number = S.start;
      let attempt: { ok: boolean } | null = null;
      const scOf = () => 150 / rounds[ri()].H;
      const slider = A.slider({ aria: 'Microscope height change in cm, positive is up', label: 'Move the microscope', min: S.min, max: S.max, step: S.step, value: s, unit: 'cm (+ up)', text: (v) => (v > 0 ? `+${v}` : String(v)), onInput: (v) => (s = v) });
      A.handle({ x: () => 320, y: () => 52 - s * scOf(), r: 30, drag: (_px, py) => slider.set((52 - py) / scOf()) });
      A.controls.append(
        slider.row,
        A.button('🔬 Lock focus', 'Lock the microscope focus here', () => {
          const r = rounds[ri()];
          const j = judgeDepth(r, s);
          attempt = { ok: j.ok };
          const [hx, hy] = hitPoint(game, ri(), s, j.ok)!;
          A.resolve(j.ok, j.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[0]}` : missText(game, ri(), s), { x: hx, y: hy }, 0.8);
        }),
      );
      onRound = (i) => {
        s = 0;
        slider.set(0);
        attempt = null;
        clearSay();
        const r = rounds[i];
        A.hint.textContent = `Tank ${r.H} cm deep. The focus was set for the old liquid (n = ${r.n1}); the new liquid has n = ${r.n2}. ${r.assist === 0 ? 'The eyepiece shows Needle live.' : 'The eyepiece is off: work it out.'}`;
      };
      A.scene((g, t) => {
        if (A.phase === 'between') return;
        const r = rounds[ri()];
        const sc = scOf();
        const bottom = surface + 150;
        const a1 = (r.H / r.n1) * sc;
        const a2 = (r.H / r.n2) * sc;
        g.fillStyle = 'rgba(77,225,255,0.22)';
        g.fillRect(190, surface, 260, 150);
        g.strokeStyle = PAL.white;
        g.lineWidth = 3;
        g.strokeRect(190, surface - 20, 260, 170);
        line(g, 190, surface, 450, surface, PAL.cyan, 2);
        text(g, `new liquid, n = ${r.n2}`, 320, bottom + 22, PAL.cyan, 12);
        text(g, `(it was n = ${r.n1})`, 320, bottom + 38, PAL.dim, 11);
        pinCharacter(g, 320, bottom, 26, t, attempt && A.phase === 'resolve' ? (attempt.ok ? 'cheer' : 'worried') : 'happy');
        // microscope body and its focal plane (a1 is where it was focused; s moves it up)
        const my = 52 - s * sc;
        g.fillStyle = PAL.white;
        g.fillRect(296, my - 34, 48, 50);
        g.fillStyle = PAL.dim;
        g.fillRect(308, my + 16, 24, 14);
        const fy = surface + a1 - s * sc;
        line(g, 320, my + 30, 320, fy, PAL.dim, 1.5, [4, 4]);
        line(g, 292, fy, 348, fy, PAL.green, 2);
        text(g, 'focus', 372, fy + 4, PAL.green, 11, 'left');
        // the eyepiece
        const { ex, ey } = GEOM.depth;
        const resolving = A.phase === 'resolve' && attempt !== null;
        const won = resolving && attempt!.ok;
        // the eyepiece view is the helper: live in round 1 and on a win; after a miss in rounds 2 and 3 only a fixed blur
        const live = helperOn(r.assist, won, Infinity);
        g.fillStyle = 'rgba(0,0,0,0.55)';
        g.beginPath();
        g.arc(ex, ey, 52, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = resolving ? (attempt!.ok ? PAL.green : PAL.red) : PAL.cyan;
        g.lineWidth = 3;
        g.stroke();
        text(g, 'eyepiece', ex, ey + 70, PAL.dim, 11);
        if (live || resolving) {
          const blur = live ? Math.min(24, Math.abs(fy - (surface + a2)) * 0.6) : 14;
          g.save();
          g.shadowColor = PAL.red;
          g.shadowBlur = blur;
          g.globalAlpha = Math.max(0.25, 1 - blur / 26);
          line(g, ex, ey - 22, ex, ey + 22, PAL.red, blur < 1.5 ? 4 : 7);
          g.restore();
        } else text(g, '?', ex, ey + 12, PAL.dim, 38);
        // where Needle seems to be: shown only when the player has it right
        if (won && A.rt > 0.3) {
          line(g, 312, surface + a2, 328, surface + a2, PAL.red, 3);
          text(g, 'Needle seems to be here', 400, surface + a2 + 4, PAL.red, 11, 'left');
        }
      });
    }

    // ================= level 3: Pin under glass ==========================================================
    if (game.kind === 'slab') {
      const rounds = game.rounds;
      const S = SLIDER.slab;
      const { table } = GEOM.slab;
      let raise: number = S.start;
      let frac = rounds[0].slabAt;
      let attempt: { ok: boolean } | null = null;
      const pxCm = () => 120 / rounds[ri()].t;
      const slabBottom = () => table - frac * 110;
      const slider = A.slider({ aria: 'How far to raise the camera focus in cm', label: 'Raise the focus by', min: S.min, max: S.max, step: S.step, value: raise, unit: 'cm', onInput: (v) => (raise = v) });
      A.handle({ x: () => 565, y: () => table - raise * pxCm(), r: 22, drag: (_px, py) => slider.set((table - py) / pxCm()) });
      A.handle({ x: () => 420, y: () => slabBottom() - 60, r: 26, drag: (_px, py) => (frac = Math.max(0, Math.min(1, (table - (py + 60)) / 110))) });
      A.controls.append(
        slider.row,
        A.button('📷 Refocus', 'Refocus the camera here', () => {
          const j = judgeSlab(rounds[ri()], raise);
          attempt = { ok: j.ok };
          const [hx, hy] = hitPoint(game, ri(), raise, j.ok)!;
          A.resolve(j.ok, j.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[1]}` : missText(game, ri(), raise), { x: hx, y: hy }, 0.7);
        }),
      );
      onRound = (i) => {
        raise = S.start;
        slider.set(raise);
        frac = rounds[i].slabAt;
        attempt = null;
        clearSay();
        const r = rounds[i];
        A.hint.textContent = `Glass slab: thickness ${r.t} cm, refractive index ${r.n}. Drag the slab up and down as you like. ${r.assist === 0 ? 'A ghost shows where Pin seems to be.' : 'The ghost is off: work it out.'}`;
      };
      A.scene((g, t) => {
        if (A.phase === 'between') return;
        const r = rounds[ri()];
        const px = pxCm();
        const resolving = A.phase === 'resolve' && attempt !== null;
        line(g, 100, table, 540, table, PAL.white, 4);
        // camera
        g.fillStyle = PAL.dim;
        g.fillRect(290, 10, 60, 36);
        g.fillStyle = PAL.cyan;
        g.beginPath();
        g.arc(320, 52, 12, 0, Math.PI * 2);
        g.fill();
        text(g, 'camera', 320, 8, PAL.dim, 10);
        line(g, 320, 64, 320, table - raise * px, PAL.dim, 1.2, [4, 5]);
        // slab
        const sb = slabBottom();
        g.fillStyle = 'rgba(160,170,230,0.32)';
        g.fillRect(210, sb - 120, 220, 120);
        g.strokeStyle = PAL.cyan;
        g.lineWidth = 2;
        g.strokeRect(210, sb - 120, 220, 120);
        text(g, `glass n = ${r.n}`, 322, sb - 50, PAL.cyan, 11);
        pinCharacter(g, 320, table, 30, t, resolving ? (attempt!.ok ? 'cheer' : 'dizzy') : 'happy');
        // the ghost of Pin is the helper: live in round 1, and on a win; never after a miss
        if (helperOn(r.assist, resolving && attempt!.ok && A.rt > 0.2, Infinity)) {
          g.globalAlpha = 0.6;
          pinCharacter(g, 320, table - r.shift * px, 30, t, 'happy');
          g.globalAlpha = 1;
          text(g, 'where Pin seems to be', 215, table - r.shift * px - 6, PAL.pink, 10, 'right');
        }
        // the focus plane
        const fy = table - raise * px;
        const col = resolving && A.rt > 0.7 ? (attempt!.ok ? PAL.green : PAL.red) : PAL.yellow;
        glow(g, col, 8, () => line(g, 470, fy, 590, fy, col, 3));
        text(g, `focus +${fmt(raise)} cm`, 560, fy - 12, col, 11);
      });
    }

    // ================= level 4: the disc over Glow =======================================================
    if (game.kind === 'cone') {
      const rounds = game.rounds;
      const surface = GEOM.cone.surface;
      let rad = 20;
      let attempt: { ok: boolean } | null = null;
      const scOf = () => 150 / rounds[ri()].d;
      const slider = A.slider({ aria: 'Radius of the disc in cm', label: 'Disc radius', min: CONE_MIN, max: coneMax(rounds[0].d), step: 1, value: rad, unit: 'cm', onInput: (v) => (rad = v) });
      A.handle({ x: () => 320 + rad * scOf(), y: () => surface - 6, r: 24, drag: (px) => slider.set((px - 320) / scOf()) });
      A.controls.append(
        slider.row,
        A.button('🥏 Float the disc', 'Float the disc on the surface', () => {
          const j = judgeCone(rounds[ri()], rad);
          attempt = { ok: j.ok };
          const [hx, hy] = hitPoint(game, ri(), rad, j.ok)!;
          A.resolve(j.ok, j.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[1]}` : missText(game, ri(), rad), { x: hx, y: hy }, 1.0);
        }),
      );
      onRound = (i) => {
        slider.range(CONE_MIN, coneMax(rounds[i].d));
        rad = coneStart(rounds[i].d);
        slider.set(rad);
        attempt = null;
        clearSay();
        A.hint.textContent = `The lamp is ${rounds[i].d} cm deep in water-like material of refractive index ${rounds[i].n}. ${rounds[i].assist === 0 ? 'The live rays show what escapes.' : 'The live rays are off: work out the radius.'}`;
      };
      A.scene((g, t) => {
        if (A.phase === 'between') return;
        const r = rounds[ri()];
        const sc = scOf();
        const lampY = surface + 150;
        const resolving = A.phase === 'resolve' && attempt !== null;
        g.fillStyle = 'rgba(77,225,255,0.16)';
        g.fillRect(0, surface, W, H - surface);
        line(g, 0, surface, W, surface, PAL.white, 2);
        const theta = criticalDeg(r.n);
        // the live rays, with the two edge rays at ±θc, are the helper: live in round 1 and on a win; never after a miss
        const show = helperOn(r.assist, resolving && attempt!.ok, Infinity);
        if (show) {
          const f = resolving ? Math.min(1, A.rt / 0.8) : 1;
          const angles = [-75, -62, -50, -38, -26, -14, 0, 14, 26, 38, 50, 62, 75, -theta, theta];
          for (const a of angles) {
            const hitX = 320 + r.d * sc * Math.tan(a * RAD);
            const out = Math.abs(a) <= theta;
            const blocked = out && Math.abs(hitX - 320) <= rad * sc;
            if (hitX < 4 || hitX > W - 4) continue;
            trace(g, [[320, lampY], [hitX, surface]], f, out ? PAL.yellow : PAL.dim, 1.4);
            if (f >= 1) {
              if (blocked) line(g, hitX - 4, surface - 4, hitX + 4, surface + 4, PAL.red, 3);
              else if (out) glow(g, PAL.green, 6, () => line(g, hitX, surface, hitX + (hitX - 320) * 0.25, surface - 70, PAL.green, 2));
              else line(g, hitX, surface, 320 + (hitX - 320) * 2, lampY, PAL.dim, 1.2, [4, 4]);
            }
          }
        }
        if (!show && resolving) {
          // after a miss in rounds 2 and 3: fixed-size, direction-only marks beside the disc edge; no rays, no θc
          const small = rad < r.radius;
          g.globalAlpha = Math.min(1, A.rt / 0.8);
          for (const s of [-1, 1]) {
            if (small) {
              const x = 320 + s * (rad * sc + 28);
              glow(g, PAL.green, 6, () => line(g, x, surface, x + s * 8, surface - 60, PAL.green, 2));
              text(g, 'light escapes', x + s * 8, surface - 70, PAL.green, 10);
            } else {
              line(g, 320 + s * (rad * sc - 30), surface - 6, 320 + s * rad * sc, surface - 6, PAL.orange, 7);
              text(g, 'no light here', 320 + s * (rad * sc - 15), surface - 34, PAL.orange, 10);
            }
          }
          g.globalAlpha = 1;
        }
        orb(g, 320, lampY, 14, PAL.yellow, t, resolving ? (attempt!.ok ? 'cheer' : 'worried') : 'happy');
        const col = resolving && A.rt > 0.8 ? (attempt!.ok ? PAL.green : PAL.red) : PAL.white;
        glow(g, col, 8, () => line(g, 320 - rad * sc, surface - 6, 320 + rad * sc, surface - 6, col, 7));
        text(g, `disc ${fmt(rad)} cm`, 320, surface - 20, col, 12);
      });
    }

    // ================= level 5: Pulse in the fibre =======================================================
    if (game.kind === 'pipe') {
      const rounds = game.rounds;
      const S = SLIDER.pipe;
      const x0 = 150;
      const x1 = 590;
      const y0 = 170;
      const half = 34;
      let ang: number = S.start;
      let attempt: { ok: boolean; guided: boolean } | null = null;
      const slider = A.slider({ aria: 'Angle of incidence on the end face in degrees', label: 'Pulse’s entry angle', min: S.min, max: S.max, step: S.step, value: ang, unit: '°', onInput: (v) => (ang = v) });
      A.handle({ x: () => x0 - 80 * Math.cos(ang * RAD), y: () => y0 + 80 * Math.sin(ang * RAD), r: 24, drag: (px, py) => slider.set(Math.atan2(py - y0, x0 - px) / RAD) });
      A.controls.append(
        slider.row,
        A.button('⚡ Launch', 'Launch Pulse at this angle', () => {
          const r = rounds[ri()];
          const j = judgePipe(r, ang);
          attempt = { ok: j.ok, guided: j.guided };
          const path = pipePath(r, ang, x0, x1, y0, half);
          const last = path.pts[path.pts.length - 1];
          A.resolve(j.ok, j.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[1]}` : missText(game, ri(), ang), { x: last[0], y: last[1] }, 1.6);
        }),
      );
      onRound = (i) => {
        ang = S.start;
        slider.set(ang);
        attempt = null;
        clearSay();
        const r = rounds[i];
        A.hint.textContent = `Fibre: core n = ${r.n1}, ${r.n2 === 1 ? 'no cladding (air outside)' : `cladding n = ${r.n2}`}. ${r.assist === 0 ? 'The live path shows whether Pulse is guided.' : 'The live path is off: work out the limit.'}`;
      };
      A.scene((g, t) => {
        if (A.phase === 'between') return;
        const r = rounds[ri()];
        const resolving = A.phase === 'resolve' && attempt !== null;
        g.fillStyle = 'rgba(143,155,214,0.3)';
        g.fillRect(x0, y0 - half - 16, x1 - x0, 2 * half + 32);
        g.fillStyle = 'rgba(77,225,255,0.16)';
        g.fillRect(x0, y0 - half, x1 - x0, 2 * half);
        line(g, x0, y0 - half, x1, y0 - half, PAL.white, 2);
        line(g, x0, y0 + half, x1, y0 + half, PAL.white, 2);
        text(g, `core n = ${r.n1}`, 370, y0 + 4, PAL.cyan, 12);
        text(g, r.n2 === 1 ? 'air outside' : `cladding n = ${r.n2}`, 370, y0 + half + 34, PAL.dim, 11);
        line(g, x0, y0 - 70, x0, y0 + 70, PAL.dim, 1, [4, 5]);
        const sx = x0 - 80 * Math.cos(ang * RAD);
        const sy = y0 + 80 * Math.sin(ang * RAD);
        glow(g, PAL.yellow, 8, () => line(g, sx, sy, x0, y0, PAL.yellow, 3));
        const path = pipePath(r, ang, x0, x1, y0, half);
        const showPath = r.assist === 0 || resolving;
        if (showPath) {
          const f = resolving ? Math.min(1, A.rt / 1.6) : 1;
          trace(g, path.pts, f, path.leaks ? PAL.red : PAL.green, 3);
          if (resolving && f < 1) {
            const [hx, hy] = along(path.pts, f);
            orb(g, hx, hy, 9, PAL.yellow, t);
          }
          if (path.leaks && (resolving ? A.rt > 1.6 : true)) {
            const last = path.pts[path.pts.length - 1];
            const up = last[1] < y0 ? -1 : 1;
            line(g, last[0], last[1], last[0] + 60, last[1] + up * 60, PAL.red, 2.5, [5, 4]);
            text(g, 'leaks out', last[0] + 66, last[1] + up * 68, PAL.red, 12, 'left');
          }
        }
        if (!(resolving && A.rt < 1.6)) orb(g, sx, sy, 14, PAL.yellow, t, resolving ? (attempt!.ok ? 'cheer' : 'worried') : 'happy');
        if (resolving && A.rt >= 1.6 && !path.leaks) glow(g, PAL.green, 10, () => text(g, 'ARRIVED', x1 - 30, y0 - half - 26, PAL.green, 14));
        if (r.assist > 0 && !resolving) text(g, 'live path off', 370, 40, PAL.dim, 12);
      });
    }

    A.mountAll();
    return A.run();
  },
});

