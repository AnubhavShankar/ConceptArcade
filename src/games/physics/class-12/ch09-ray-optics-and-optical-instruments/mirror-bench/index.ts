import { createArcade, PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { fmt } from '@core/judge';
import { trace } from '@core/neon';
import { car, face, flame, glow, line, mirror, ruler, target, text, type Mood } from './art';
import { helperOn, paidFlash } from '@core/aidflash';
import { GEOM, GHOST_GAP, RAIL_MAX, SELFIE_MISS, START_BAR, buildGame, driveMiss, explainRound, flashText, hitPoint, judgeDrive, judgeLaser, judgeSelfie, judgeWall, mirrorImage, missText, resultLine, selfieMiss, tanDeg, wallMiss, type Image } from './logic';

const W = 640;
const H = 340;
const RAD = Math.PI / 180;
const DRIVE_T = 1.7;

export default defineGame({
  mount(ctx) {
    const game = buildGame(ctx.level, ctx.random);
    let onRound: (i: number) => void = () => undefined;
    const A = createArcade(ctx, game.hero, { W, H, aria: 'An arcade screen: a hero, a mirror and a target, with the light rays drawn as glowing lines.', rounds: 3, charges: game.charges, onRound: (i) => onRound(i) });
    const clearSay = () => {
      A.feedback.hidden = true;
    };
    const ri = () => Math.min(A.round, 2);

    // ================= level 1: Flicker lights the wall =================================================
    if (game.kind === 'wall') {
      const rounds = game.rounds;
      const { x0, sc, AX } = GEOM.wall;
      let u = rounds[0].uStart;
      let flash: { u: number; img: Image; born: number } | null = null;
      let attempt: { ok: boolean; img: Image; u: number } | null = null;
      const slider = A.slider({ aria: 'Flicker position from the mirror in cm', label: 'Flicker stands at', min: 5, max: RAIL_MAX, step: 1, value: u, unit: 'cm', onInput: (v) => (u = v) });
      A.handle({ x: () => x0 + u * sc, y: () => AX - 24, r: 28, drag: (px) => slider.set((px - x0) / sc) });
      A.controls.append(
        slider.row,
        A.button('⚡ Flash', 'Flash: see where the image lands from here', () => {
          if (!A.spend()) return;
          const img = mirrorImage(rounds[ri()].F, true, u);
          flash = { u, img, born: A.clock };
          A.say(flashText(u, img), true);
        }, 'secondary'),
        A.button('🔥 Ignite', 'Ignite Flicker at this spot', () => {
          const R = rounds[ri()];
          const r = judgeWall(R, u);
          attempt = { ok: r.ok, img: r.image, u };
          const [hx, hy] = hitPoint(game, ri(), u);
          A.resolve(r.ok, r.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[0]}` : missText(game, ri(), u), { x: hx, y: hy }, 1.3);
        }),
      );
      onRound = (i) => {
        u = rounds[i].uStart;
        slider.set(u);
        flash = null;
        attempt = null;
        clearSay();
        A.hint.textContent = `The wall is ${fmt(rounds[i].wall)} cm from the mirror. The focal length is a secret: flash from the rail, read where the image lands, and work out where Flicker must stand.`;
      };
      A.scene((g, t) => {
        if (A.phase === 'between') return;
        const R = rounds[ri()];
        line(g, x0, AX, 630, AX, PAL.dim, 1.5, [6, 6]);
        ruler(g, x0, AX + 66, sc, RAIL_MAX);
        mirror(g, x0, AX, true);
        text(g, 'mystery mirror', x0 + 40, AX - 104, PAL.dim, 11);
        const xw = x0 + R.wall * sc;
        const resolving = A.phase === 'resolve' && attempt !== null;
        const lit = resolving && attempt!.ok && A.rt > 1.3;
        glow(g, PAL.green, lit ? 22 : 6, () => {
          g.fillStyle = lit ? PAL.green : 'rgba(93,255,154,0.35)';
          g.fillRect(xw - 3, AX - 100, 6, 200);
        });
        text(g, `WALL ${fmt(R.wall)} cm`, xw, AX - 110, PAL.green, 12);
        if (flash && A.phase === 'play') {
          const age = A.clock - flash.born;
          const stale = flash.u !== u;
          if (age < 0.6) {
            g.strokeStyle = PAL.cyan;
            g.globalAlpha = 1 - age / 0.6;
            g.lineWidth = 3;
            g.beginPath();
            g.arc(x0 + flash.u * sc, AX - 24, age * 150, 0, Math.PI * 2);
            g.stroke();
            g.globalAlpha = 1;
          }
          const f = flash.img;
          if (f.kind !== 'none') {
            const mx = f.kind === 'real' ? x0 + f.dist * sc : x0 - f.dist * sc;
            if (mx > 6 && mx < W - 6) {
              g.globalAlpha = stale ? 0.4 : 1;
              glow(g, PAL.cyan, 10, () => {
                g.fillStyle = PAL.cyan;
                g.beginPath();
                g.moveTo(mx, AX - 9);
                g.lineTo(mx + 8, AX);
                g.lineTo(mx, AX + 9);
                g.lineTo(mx - 8, AX);
                g.closePath();
                g.fill();
              });
              text(g, `${stale ? 'earlier flash: ' : 'image: '}${fmt(f.dist)} cm${f.kind === 'virtual' ? ' behind' : ''}`, mx, AX - 18, PAL.cyan, 11);
              g.globalAlpha = 1;
            }
          }
        }
        const fx = x0 + u * sc;
        const mood: Mood = resolving ? (attempt!.ok ? (A.rt > 1.3 ? 'cheer' : 'happy') : 'worried') : 'happy';
        if (resolving) {
          const tipY = AX - 46;
          const miss = wallMiss(R, attempt!.u);
          if (attempt!.ok) {
            // the true construction, only for the winning spot
            const img = attempt!.img;
            const xi = x0 + img.dist * sc;
            const hi = Math.min(140, Math.abs(img.m) * 46);
            const yi = AX + hi;
            const f = Math.min(1, A.rt / 1.0);
            trace(g, [[fx, tipY], [x0, tipY], [xi, yi]], f, PAL.cyan);
            trace(g, [[fx, tipY], [x0, yi], [xi, yi]], f, PAL.yellow);
            if (A.rt > 1.0) {
              flame(g, xi, AX, hi, t, 'cheer', true, 0.95);
              glow(g, PAL.green, 20, () => text(g, 'SHARP!', xw, AX + 120, PAL.green, 16));
            }
          } else {
            // a miss: the incident rays only, a fixed blur on the wall and the direction in words; never the true image
            const f = Math.min(1, A.rt / 1.0);
            trace(g, [[fx, tipY], [x0, tipY]], f, PAL.cyan);
            trace(g, [[fx, tipY], [x0, AX + 40]], f, PAL.yellow);
            if (A.rt > 1.0 && (miss === 'before' || miss === 'behind')) {
              g.save();
              g.shadowColor = PAL.orange;
              g.shadowBlur = 12;
              g.globalAlpha = 0.6;
              flame(g, xw, AX, 60, t, 'worried', true, 0.8);
              g.restore();
              text(g, miss === 'before' ? 'a blur: the image lands in front of the wall' : 'a blur: the image lands behind the wall', xw, AX + 120, PAL.red, 11);
            } else if (A.rt > 1.0 && miss === 'virtual') {
              flame(g, x0 - 50, AX, 60, t, 'worried', false, 0.45);
              text(g, 'a virtual image: no wall can catch it', 330, AX + 130, PAL.red, 12);
            } else if (A.rt > 1.0) text(g, 'no image forms: the rays leave parallel', 330, AX + 130, PAL.red, 12);
          }
        }
        flame(g, fx, AX, 46, t, mood);
        text(g, 'Flicker', fx, AX + 16, PAL.white, 11);
      });
    }

    // ================= level 2: Dash and the catch-bar ==================================================
    if (game.kind === 'drive') {
      const rounds = game.rounds;
      const { x0, sc, AX } = GEOM.drive;
      const START = 100;
      let bar = START_BAR;
      let attempt: { bar: number; ok: boolean } | null = null;
      const slider = A.slider({ aria: 'Catch-bar position behind the mirror in cm', label: 'Catch-bar, behind the mirror', min: 1, max: 20, step: 1, value: bar, unit: 'cm', onInput: (v) => (bar = v) });
      A.handle({ x: () => x0 - bar * sc, y: () => AX - 30, r: 28, drag: (px) => slider.set((x0 - px) / sc) });
      A.controls.append(
        slider.row,
        A.button('🚗 Drive!', 'Start Dash driving to the finish line', () => {
          const R = rounds[ri()];
          const r = judgeDrive(R, bar);
          attempt = { bar, ok: r.ok };
          const [hx, hy] = hitPoint(game, ri(), bar);
          A.resolve(r.ok, r.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[0]}` : missText(game, ri(), bar), { x: hx, y: hy }, DRIVE_T);
        }),
      );
      onRound = (i) => {
        bar = START_BAR;
        slider.set(bar);
        attempt = null;
        clearSay();
        A.hint.textContent = `Convex mirror, focal length ${rounds[i].F} cm, finish line ${rounds[i].line} cm from the mirror. Dash starts ${START} cm away. Slide the catch-bar, then drive.`;
      };
      A.scene((g) => {
        if (A.phase === 'between') return;
        const R = rounds[ri()];
        const resolving = A.phase === 'resolve' && attempt !== null;
        line(g, 10, AX, W - 10, AX, PAL.dim, 1.5, [6, 6]);
        ruler(g, x0, AX + 66, sc, START);
        ruler(g, x0, AX + 66, sc, 20, -1);
        mirror(g, x0, AX, false);
        const xF = x0 - R.F * sc;
        line(g, xF, AX - 6, xF, AX + 6, PAL.dim, 2);
        text(g, 'F', xF, AX + 22, PAL.dim, 11);
        text(g, 'behind the mirror', x0 - 60, AX - 104, PAL.dim, 11);
        const xl = x0 + R.line * sc;
        for (let y = AX - 100; y < AX + 60; y += 16) {
          g.fillStyle = (y / 16) % 2 === 0 ? PAL.white : PAL.dim;
          g.fillRect(xl - 3, y, 6, 8);
        }
        text(g, `FINISH ${R.line} cm`, xl, AX - 110, PAL.white, 12);
        const f = resolving ? Math.min(1, A.rt / DRIVE_T) : 0;
        const d = START + (R.line - START) * f;
        const k = 0.8;
        const xnose = x0 + d * sc;
        car(g, xnose + 34 * k, AX, k, A.clock * (resolving && f < 1 ? 1 : 0.2), resolving ? (attempt!.ok ? 'cheer' : A.rt > DRIVE_T ? 'worried' : 'happy') : 'happy');
        text(g, 'Dash', xnose + 34 * k, AX + 16, PAL.white, 11);
        const xb = x0 - (resolving ? attempt!.bar : bar) * sc;
        if (resolving) {
          // the image of Dash. On a win it follows the real mirror formula onto the bar; on a miss it glides to a fixed gap
          // beyond or short of the bar, at a fixed size, so the picture never shows where the image really is.
          const v = (R.F * d) / (R.F + d);
          const xTrue = x0 - v * sc;
          const dir = driveMiss(R, attempt!.bar) === 'beyond' ? -1 : 1;
          const xi = attempt!.ok ? xTrue : xTrue + (xb + dir * GHOST_GAP - xTrue) * f;
          g.save();
          g.translate(xi, 0);
          g.scale(-1, 1);
          g.globalAlpha = 0.7;
          car(g, 0, AX, attempt!.ok ? k * (v / d) : k * 0.45, A.clock, 'happy');
          g.restore();
          line(g, xnose, AX - 20, x0, AX - 20, PAL.cyan, 1.5, [4, 5]);
          line(g, x0, AX - 20, xi, AX - 12, PAL.cyan, 1.5, [4, 5]);
        }
        const done = resolving && A.rt >= DRIVE_T;
        const barColor = done ? (attempt!.ok ? PAL.green : PAL.red) : PAL.pink;
        glow(g, barColor, done ? 20 : 8, () => {
          g.fillStyle = barColor;
          g.fillRect(xb - 3, AX - 74, 6, 84);
        });
        text(g, 'catch-bar', xb, AX - 82, barColor, 11);
        if (done && !attempt!.ok) {
          // a marker of fixed length on the side where the image was
          const dir = driveMiss(R, attempt!.bar) === 'beyond' ? -1 : 1;
          line(g, xb, AX - 90, xb + dir * 40, AX - 90, PAL.red, 3);
          text(g, dir < 0 ? 'image beyond the bar' : 'image short of the bar', xb + dir * 20, AX - 98, PAL.red, 11);
        }
        if (resolving && A.rt >= DRIVE_T && A.rt < DRIVE_T + 0.3) {
          g.fillStyle = '#fff';
          g.globalAlpha = 0.7 * (1 - (A.rt - DRIVE_T) / 0.3);
          g.fillRect(0, 0, W, H);
          g.globalAlpha = 1;
        }
      });
    }

    // ================= level 3: the selfie ring ==========================================================
    if (game.kind === 'selfie') {
      const rounds = game.rounds;
      const x0 = 290;
      const AX = 210;
      const R14 = 14;
      const flash = paidFlash();
      let d = Math.round(2 * rounds[0].F);
      const scFor = () => 320 / (3 * rounds[ri()].F);
      let snap: { ok: boolean; img: Image; d: number } | null = null;
      const slider = A.slider({ aria: 'Distance of her face from the mirror in cm', label: 'Her face is', min: 1, max: 3 * rounds[0].F, step: 1, value: d, unit: 'cm from the mirror', onInput: (v) => (d = v) });
      A.handle({ x: () => x0 + d * scFor(), y: () => AX - 34, r: 26, drag: (px) => slider.set((px - x0) / scFor()) });
      A.controls.append(
        slider.row,
        A.button('👀 Peek', 'Peek: show the live view for a moment', () => {
          if (!A.spend()) return;
          flash.paid();
          A.say('The live view shows for a moment.', true);
        }, 'secondary'),
        A.button('📸 Snap!', 'Take the selfie at this distance', () => {
          const r = judgeSelfie(rounds[ri()], d);
          snap = { ok: r.ok, img: r.image, d };
          A.resolve(r.ok, r.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[0]}` : missText(game, ri(), d), { x: 120, y: 170 }, 0.5);
        }),
      );
      onRound = (i) => {
        slider.range(1, 3 * rounds[i].F);
        d = Math.round(2 * rounds[i].F);
        slider.set(d);
        snap = null;
        clearSay();
        const a = rounds[i].assist;
        A.hint.textContent = `Concave mirror, focal length ${rounds[i].F} cm. Fit the face to the ring (${rounds[i].want}× her real face). ${a === 0 ? 'Round 1: the tolerance band is shown.' : a === 1 ? 'Round 2: the live view shows for a moment after a peek (one charge).' : 'Round 3: no live view. Work it out, then snap.'}`;
      };
      A.scene((g) => {
        if (A.phase === 'between') return;
        const R = rounds[ri()];
        const sc = scFor();
        const resolving = A.phase === 'resolve' && snap !== null;
        // the viewfinder
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(10, 24, 220, 292);
        g.strokeStyle = PAL.cyan;
        g.lineWidth = 2;
        g.strokeRect(10, 24, 220, 292);
        text(g, 'VIEWFINDER', 120, 18, PAL.cyan, 11);
        const cx = 120;
        const cy = 170;
        const ring = R14 * R.want;
        g.save();
        g.beginPath();
        g.rect(10, 24, 220, 292);
        g.clip();
        g.strokeStyle = PAL.yellow;
        g.lineWidth = 2;
        g.setLineDash([6, 5]);
        g.beginPath();
        g.arc(cx, cy, ring, 0, Math.PI * 2);
        g.stroke();
        g.setLineDash([]);
        if (R.assist === 0) {
          g.strokeStyle = 'rgba(255,210,63,0.45)';
          g.lineWidth = 1;
          for (const k of [0.97, 1.03]) {
            g.beginPath();
            g.arc(cx, cy, ring * k, 0, Math.PI * 2);
            g.stroke();
          }
        }
        const since = flash.since(A.clock, ri());
        const img = resolving ? snap!.img : mirrorImage(R.F, true, d);
        // live in round 1, for a moment after the peek in round 2, never in round 3; after a snap only the winning face is drawn to scale
        const visible = resolving || helperOn(R.assist, false, since) ? 1 : 0;
        if (img.kind !== 'none' && visible > 0) {
          // a miss draws a face of a fixed size (too small or too big for the ring), never the player's own magnification
          const r = resolving && !snap!.ok ? ring * (selfieMiss(R, snap!.d) === 'big' ? SELFIE_MISS.big : SELFIE_MISS.small) : Math.min(110, R14 * Math.abs(img.m));
          face(g, cx, cy, Math.min(110, r), resolving ? (snap!.ok ? 'cheer' : 'dizzy') : 'happy', img.kind === 'real', visible);
        } else if (img.kind === 'none') text(g, 'no image', cx, cy, PAL.red, 14);
        else text(g, '?', cx, cy + 14, PAL.dim, 44);
        g.restore();
        // the bench
        line(g, x0, AX, 630, AX, PAL.dim, 1.5, [6, 6]);
        ruler(g, x0, AX + 74, sc, 3 * R.F);
        mirror(g, x0, AX, true);
        const xF = x0 + R.F * sc;
        line(g, xF, AX - 6, xF, AX + 6, PAL.dim, 2);
        text(g, 'F', xF, AX + 22, PAL.dim, 11);
        const fx = x0 + d * sc;
        line(g, fx, AX - 18, fx, AX, PAL.dim, 3);
        face(g, fx, AX - 34, R14 * 0.9, resolving ? (snap!.ok ? 'cheer' : 'dizzy') : 'happy');
        if (resolving && A.rt < 0.4) {
          g.fillStyle = '#fff';
          g.globalAlpha = 0.8 * (1 - A.rt / 0.4);
          g.fillRect(10, 24, 220, 292);
          g.globalAlpha = 1;
        }
        if (resolving && A.rt >= 0.5) {
          glow(g, snap!.ok ? PAL.green : PAL.red, 12, () => text(g, snap!.ok ? 'PERFECT FIT' : 'NOT A FIT', 120, 306, snap!.ok ? PAL.green : PAL.red, 14));
        }
      });
    }

    // ================= level 4: the laser gallery ========================================================
    if (game.kind === 'laser') {
      const rounds = game.rounds;
      const px0 = 110;
      const { xw, AX, ps } = GEOM.laser;
      let theta = 1;
      let shot: { theta: number; ok: boolean; shift: number } | null = null;
      const slider = A.slider({ aria: 'Mirror dial angle in degrees', label: 'Mirror dial', min: 0, max: 10, step: 0.5, value: theta, unit: '°', onInput: (v) => (theta = v) });
      const tip = () => ({ x: px0 + 50 * Math.sin(4 * theta * RAD), y: AX - 50 * Math.cos(4 * theta * RAD) });
      A.handle({ x: () => tip().x, y: () => tip().y, r: 22, drag: (px, py) => slider.set(Math.atan2(px - px0, AX - py) / RAD / 4) });
      A.controls.append(
        slider.row,
        A.button('🔫 Fire!', 'Fire the laser at this dial setting', () => {
          const R = rounds[ri()];
          const r = judgeLaser(R, theta);
          shot = { theta, ok: r.ok, shift: r.shift };
          A.resolve(r.ok, r.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[0]}` : missText(game, ri(), theta), { x: hitPoint(game, ri(), theta)[0], y: hitPoint(game, ri(), theta)[1] }, 0.9);
        }),
      );
      onRound = (i) => {
        theta = 1;
        slider.set(theta);
        shot = null;
        clearSay();
        const a = rounds[i].assist;
        A.hint.textContent = `The wall is ${rounds[i].L} cm from the mirror; the target is ${fmt(rounds[i].shift)} cm above the centre mark (drawing not to scale, mirror tilt exaggerated). ${a === 0 ? 'Round 1: the aim light shows where the spot is.' : 'The aim light is off: work out the dial angle.'}`;
      };
      A.scene((g) => {
        if (A.phase === 'between') return;
        const R = rounds[ri()];
        const resolving = A.phase === 'resolve' && shot !== null;
        // the wall, its scale and the gun
        g.fillStyle = 'rgba(140,155,214,0.35)';
        g.fillRect(xw - 3, 20, 6, 300);
        for (let c = 0; c <= 25; c += 5) {
          line(g, xw - 10, AX - c * ps, xw, AX - c * ps, PAL.dim, 1.5);
          text(g, String(c), xw + 18, AX - c * ps + 4, PAL.dim, 10);
        }
        text(g, 'cm above the centre mark', xw - 20, 322, PAL.dim, 10, 'right');
        g.fillStyle = PAL.pink;
        g.fillRect(xw - 22, AX - 9, 20, 18);
        text(g, 'laser', xw - 12, AX + 28, PAL.pink, 11);
        // the beam in, always on
        glow(g, PAL.pink, 8, () => line(g, xw - 22, AX, px0, AX, PAL.pink, 2.5, [10, 6]));
        // the mirror, turned (drawn four times too large)
        const tp = tip();
        glow(g, PAL.cyan, 12, () => line(g, 2 * px0 - tp.x, 2 * AX - tp.y, tp.x, tp.y, PAL.white, 6));
        g.fillStyle = PAL.dim;
        g.beginPath();
        g.arc(px0, AX, 6, 0, Math.PI * 2);
        g.fill();
        text(g, `dial ${fmt(theta)}°`, px0, AX + 76, PAL.white, 15);
        text(g, 'plane mirror', px0, AX + 94, PAL.dim, 10);
        // target
        const ty = AX - R.shift * ps;
        const hit = resolving && shot!.ok && A.rt >= 0.9;
        target(g, xw - 3, ty, 15, hit, A.clock);
        // the beam out
        const liveShift = R.L * tanDeg(2 * theta);
        if (R.assist === 0 && A.phase === 'play') {
          glow(g, PAL.yellow, 8, () => line(g, px0, AX, xw, AX - liveShift * ps, PAL.yellow, 2));
          g.fillStyle = PAL.yellow;
          g.beginPath();
          g.arc(xw, AX - liveShift * ps, 5, 0, Math.PI * 2);
          g.fill();
        } else if (A.phase === 'play') {
          text(g, 'aim light off', 330, 40, PAL.dim, 12);
        }
        if (resolving) {
          const sy = Math.max(24, Math.min(H - 24, AX - shot!.shift * ps));
          trace(g, [[px0, AX], [xw, sy]], Math.min(1, A.rt / 0.9), PAL.yellow, 3);
          if (A.rt >= 0.9) {
            g.fillStyle = shot!.ok ? PAL.green : PAL.red;
            g.beginPath();
            g.arc(xw, sy, 7, 0, Math.PI * 2);
            g.fill();
            if (!shot!.ok) text(g, 'missed', xw - 40, sy + 4, PAL.red, 12, 'right');
          }
        }
      });
    }

    A.mountAll();
    return A.run();
  },
});
