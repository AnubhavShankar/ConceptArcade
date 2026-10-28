import { defineGame } from '@core/define';
import { label } from '@core/draw';
import { createLab } from '@core/labkit';
import { fmt } from '@core/judge';
import { startLoop } from '@core/sim';
import { asinD, buildLevel, criticalDeg, explainSolution, judgeCone, judgeDepth, judgePipe, judgeSlab, judgeSnell, sinD } from './logic';

const W = 640;
const H = 300;
const ease = (t: number) => t * t * (3 - 2 * t);
const RAD = Math.PI / 180;

export default defineGame({
  mount(ctx) {
    const lvl = buildLevel(ctx.level, ctx.random);
    const lab = createLab(ctx, lvl.hero, { W, H, aria: 'A side view of light bending, bouncing or escaping at the boundary between two materials.', free: lvl.freeTests });
    const { g, col } = lab;
    let tryA: number | null = null;
    let started = false;
    let dirUp = true;
    let sameQ: 'changes' | 'same' | null = null;

    const go = (text: string, run: () => void) => lab.button(text, text, () => {
      if (lab.finished || lab.busy()) return;
      run();
    });
    const need = (v: number | null, what: string, unit: string) => {
      if (v === null || v <= 0) {
        lab.freeNote(`Enter ${what} as a positive number of ${unit}.`);
        return false;
      }
      return true;
    };
    const finish = (ok: boolean, win: string, miss: string) => {
      started = true;
      lab.verdict(ok);
      if (ok) lab.succeed(win, explainSolution(lvl));
      else lab.miss(miss);
    };

    if (lvl.kind === 'snell') {
      const aIn = lab.field('Detector angle from the normal in degrees', 'r = ? °');
      lab.controls.append(
        lab.row('Detector angle', aIn, '°'),
        go('Send the ray', () => {
          const a = lab.num(aIn);
          if (!need(a, 'the angle', 'degrees')) return;
          if (a! >= 90) return lab.freeNote('The angle from the normal must be less than 90°.');
          tryA = a;
          const ok = judgeSnell(lvl, a!).ok;
          finish(ok, `Ray hits the detector at ${fmt(lvl.answer)}° in the glass.`, 'Ray lands away from the detector.');
        }),
      );
      lab.hint.textContent = 'Find each index from the two photographs (n = sin 60° / sin r), then apply n₁ sin i = n₂ sin r at the water–glass boundary.';
    }
    if (lvl.kind === 'depth') {
      const dIn = lab.field('Distance to move the microscope in cm', 'x = ? cm');
      const dirChoice = lab.choice<'up' | 'down'>('Direction', [['up', 'Move the microscope up', 'Up'], ['down', 'Move the microscope down', 'Down']], (v) => (dirUp = v === 'up'));
      let dirChosen = false;
      dirChoice.addEventListener('click', () => (dirChosen = true));
      lab.controls.append(
        lab.row('Move the microscope', dIn, 'cm'),
        dirChoice,
        go('Refocus the microscope', () => {
          const d = lab.num(dIn);
          if (!need(d, 'the distance', 'cm')) return;
          if (!dirChosen) return lab.freeNote('Choose whether the microscope goes up or down.');
          tryA = dirUp ? d! : -d!;
          finish(judgeDepth(lvl, tryA!).ok, `Needle is sharp again: the microscope moved ${dirUp ? 'up' : 'down'} ${fmt(Math.abs(lvl.move))} cm.`, 'Needle is still blurred in the eyepiece.');
        }),
      );
      lab.hint.textContent = 'Seen from above, an object at real depth H under a liquid of index n appears at depth H/n.';
    }
    if (lvl.kind === 'slab') {
      const sIn = lab.field('How far the pin appears raised in cm', 'x = ? cm');
      lab.controls.append(
        lab.row('Pin appears raised by', sIn, 'cm'),
        lab.choice<'changes' | 'same'>('Slide the slab nearer to the pin', [['changes', 'The raise changes when the slab slides', 'The raise changes'], ['same', 'The raise stays the same when the slab slides', 'The raise stays the same']], (v) => (sameQ = v)),
        go('Lay the slab over Pin', () => {
          const s = lab.num(sIn);
          if (!need(s, 'the raise', 'cm')) return;
          if (sameQ === null) return lab.freeNote('Say whether sliding the slab changes the raise.');
          tryA = s;
          const r = judgeSlab(lvl, s!, sameQ);
          const parts: string[] = [];
          if (!r.sOk) parts.push('The camera is still out of focus: Pin appears at a different height.');
          if (!r.cOk) parts.push('Sliding the slab nearer the pin does not move the image: watch it stay put.');
          finish(r.ok, `Pin looks ${fmt(lvl.shift)} cm higher, wherever the slab sits.`, parts.join(' '));
        }),
      );
      lab.hint.textContent = `Slab: refractive index ${lvl.n}, thickness ${lvl.t} cm. The camera is far above.`;
    }
    if (lvl.kind === 'cone') {
      const rIn = lab.field('Radius of the disc in cm', 'r = ? cm');
      lab.controls.append(
        lab.row('Disc radius', rIn, 'cm'),
        go('Float the disc', () => {
          const r = lab.num(rIn);
          if (!need(r, 'the radius', 'cm')) return;
          tryA = r;
          const ok = judgeCone(lvl, r!).ok;
          finish(ok, `The disc blocks every ray that could leave: radius ${fmt(lvl.radius)} cm.`, r! < lvl.radius ? 'Light still escapes round the edge of the disc.' : 'The disc blocks all the light, but it is wider than it needs to be: part of it covers surface where no light could leave anyway.');
        }),
      );
      lab.hint.textContent = 'A ray escapes only if it meets the surface at less than the critical angle, sin θc = 1/n.';
    }
    if (lvl.kind === 'pipe') {
      const aIn = lab.field('Angle of incidence in degrees', 'i = ? °');
      lab.controls.append(
        lab.row('Angle on the end face', aIn, '°'),
        go('Send the pulse', () => {
          const a = lab.num(aIn);
          if (!need(a, 'the angle', 'degrees')) return;
          if (a! > 90) return lab.freeNote('The angle of incidence cannot be more than 90°.');
          tryA = a;
          const r = judgePipe(lvl, a!);
          finish(r.ok, `Pulse is carried to the far end at up to ${fmt(lvl.maxDeg)}°.`, r.guided ? 'The pulse is carried to the far end, but the fibre would still have guided a wider beam.' : 'At that angle the pulse leaks out through the wall at the first bounce and never reaches the end.');
        }),
      );
      lab.hint.textContent = 'The ray inside the core meets the wall at 90° − r; it is trapped only beyond the critical angle for core and cladding.';
    }

    // ---- drawing --------------------------------------------------------------------------------
    const seg = (x1: number, y1: number, x2: number, y2: number, color: string, w = 2.5, dash: number[] = []) => {
      g.strokeStyle = color;
      g.lineWidth = w;
      g.setLineDash(dash);
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
      g.setLineDash([]);
    };
    const part = (x1: number, y1: number, x2: number, y2: number, f: number) => [x1 + (x2 - x1) * f, y1 + (y2 - y1) * f] as const;
    function drawScene() {
      const p = lab.progress;
      if (lvl.kind === 'snell') {
        g.fillStyle = col.accent;
        g.globalAlpha = 0.12;
        g.fillRect(0, 0, W, 150);
        g.fillStyle = col.muted;
        g.globalAlpha = 0.2;
        g.fillRect(0, 150, W, 150);
        g.globalAlpha = 1;
        seg(0, 150, W, 150, col.text, 2);
        seg(320, 20, 320, 280, col.muted, 1.5, [5, 4]);
        label(g, 'water', 60, 30, { size: 13, color: col.muted });
        label(g, 'glass', 60, 280, { size: 13, color: col.muted });
        label(g, 'normal', 350, 28, { size: 11, color: col.muted });
        const R = 130;
        const ix = 320 - R * sinD(lvl.inDeg);
        const iy = 150 - R * Math.cos(lvl.inDeg * RAD);
        const f1 = Math.min(1, p * 2);
        const [ex, ey] = part(ix, iy, 320, 150, started ? f1 : 1);
        seg(ix, iy, ex, ey, col.accent);
        label(g, `${lvl.inDeg}° in the water`, 200, 80, { size: 12, color: col.text });
        if (started) {
          const r = lvl.answer;
          const [rx, ry] = part(320, 150, 320 + R * sinD(r), 150 + R * Math.cos(r * RAD), Math.max(0, Math.min(1, (p - 0.5) * 2)));
          seg(320, 150, rx, ry, col.accent);
        }
        if (tryA !== null) {
          const dx = 320 + R * sinD(tryA);
          const dy = 150 + R * Math.cos(tryA * RAD);
          g.strokeStyle = lab.ok && p >= 1 ? col.good : col.bad;
          g.lineWidth = 3;
          g.strokeRect(dx - 9, dy - 9, 18, 18);
          label(g, 'detector', dx + 40, dy + 4, { size: 11, color: col.muted });
        }
      } else if (lvl.kind === 'depth') {
        const surface = 110;
        const px = 150 / lvl.H;
        const bottom = surface + 150;
        g.fillStyle = col.accent;
        g.globalAlpha = 0.15;
        g.fillRect(180, surface, 280, 150);
        g.globalAlpha = 1;
        g.strokeStyle = col.text;
        g.lineWidth = 3;
        g.strokeRect(180, surface - 30, 280, 180);
        seg(180, surface, 460, surface, col.text, 2);
        label(g, `liquid, ${started ? 'n = ' + lvl.n2 : 'n = ' + lvl.n1}`, 520, surface + 40, { size: 12, color: col.muted });
        seg(320, bottom - 22, 320, bottom, col.bad, 5);
        label(g, 'Needle', 320, bottom + 18, { size: 12, color: col.muted });
        const a1 = (lvl.H / lvl.n1) * px;
        const a2 = (lvl.H / lvl.n2) * px;
        const e = started ? ease(p) : 0;
        const move = tryA === null ? 0 : tryA * px * e;
        const focusDepth = a1 - move;
        const imageDepth = started ? a2 : a1;
        // microscope
        const my = 40 - move;
        g.fillStyle = col.text;
        g.fillRect(290, my - 30, 60, 50);
        seg(320, my + 20, 320, surface + focusDepth, col.muted, 1.5, [4, 4]);
        seg(300, surface + focusDepth, 340, surface + focusDepth, col.good, 2);
        label(g, 'focus', 380, surface + focusDepth + 4, { size: 11, color: col.good });
        // where the image of the needle's tip seems to be
        const blur = Math.abs(focusDepth - imageDepth) * 0.6;
        g.save();
        g.shadowColor = col.bad;
        g.shadowBlur = Math.min(20, blur);
        g.globalAlpha = Math.max(0.35, 1 - blur / 18);
        seg(318, surface + imageDepth, 322, surface + imageDepth + 22, col.bad, 5, [3, 2]);
        g.restore();
        label(g, 'image of the tip', 250, surface + imageDepth + 6, { size: 10, color: col.muted, align: 'right' });
      } else if (lvl.kind === 'slab') {
        const t = 120;
        const table = 250;
        const e = started ? ease(Math.max(0, (p - 0.4) / 0.6)) : 0;
        const bottomY = 200 + 50 * e;
        seg(120, table, 520, table, col.text, 4);
        seg(320, table - 24, 320, table, col.bad, 5);
        label(g, 'Pin', 345, table - 8, { size: 12, color: col.muted, align: 'left' });
        g.fillStyle = col.accent;
        g.globalAlpha = 0.25;
        g.fillRect(230, bottomY - t, 180, t);
        g.globalAlpha = 1;
        g.strokeStyle = col.accent;
        g.lineWidth = 2;
        g.strokeRect(230, bottomY - t, 180, t);
        label(g, `glass, n = ${lvl.n}`, 440, bottomY - t / 2, { size: 12, color: col.muted, align: 'left' });
        seg(320, 20, 320, 40, col.muted, 1);
        label(g, 'camera above', 320, 16, { size: 11, color: col.muted });
        if (started) {
          const rise = Math.min(130, lvl.shift * (t / lvl.t)) * Math.min(1, p * 4);
          g.globalAlpha = 0.8;
          seg(320, table - rise - 24, 320, table - rise, col.bad, 5, [4, 3]);
          g.globalAlpha = 1;
          label(g, 'where it seems to be', 300, table - rise - 28, { size: 11, color: col.muted, align: 'right' });
        }
      } else if (lvl.kind === 'cone') {
        const surface = 90;
        const dpx = 140;
        const sc = dpx / lvl.d;
        const lampY = surface + dpx;
        g.fillStyle = col.accent;
        g.globalAlpha = 0.12;
        g.fillRect(0, surface, W, H - surface);
        g.globalAlpha = 1;
        seg(0, surface, W, surface, col.text, 2);
        g.fillStyle = col.accent;
        g.beginPath();
        g.arc(320, lampY, 8, 0, Math.PI * 2);
        g.fill();
        label(g, 'Glow', 320, lampY + 26, { size: 12, color: col.muted });
        const half = tryA === null ? 0 : tryA * sc;
        const theta = criticalDeg(lvl.n);
        const rays = [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75, -theta, theta, -theta - 10, theta + 10, -theta + 10, theta - 10];
        if (started) {
          for (const a of rays) {
            const hitX = 320 + dpx * Math.tan(a * RAD);
            const f = Math.min(1, p * 1.6);
            const out = Math.abs(a) < theta;
            const blocked = out && Math.abs(hitX - 320) <= half;
            const [x, y] = part(320, lampY, hitX, surface, f);
            seg(320, lampY, x, y, col.accent, 1.5);
            if (f >= 1) {
              if (blocked) seg(hitX - 3, surface - 3, hitX + 3, surface + 3, col.muted, 3);
              else if (out) seg(hitX, surface, hitX + (hitX - 320) * 0.3, surface - 60, col.good, 2);
              else seg(hitX, surface, 320 + (hitX - 320) * 2, lampY, col.muted, 1.2, [4, 4]);
            }
          }
        }
        if (tryA !== null) {
          g.strokeStyle = col.text;
          g.lineWidth = 6;
          g.beginPath();
          g.moveTo(320 - half, surface - 5);
          g.lineTo(320 + half, surface - 5);
          g.stroke();
          label(g, 'floating disc', 320, surface - 16, { size: 11, color: col.muted });
        }
      } else {
        const y0 = 150;
        const half = 30;
        const x0 = 110;
        const x1 = 560;
        g.fillStyle = col.muted;
        g.globalAlpha = 0.25;
        g.fillRect(x0, y0 - half - 14, x1 - x0, 2 * half + 28);
        g.fillStyle = col.accent;
        g.globalAlpha = 0.25;
        g.fillRect(x0, y0 - half, x1 - x0, 2 * half);
        g.globalAlpha = 1;
        label(g, `core n = ${lvl.n1}`, 330, y0 + 4, { size: 12, color: col.muted });
        label(g, lvl.n2 === 1 ? 'air outside' : `cladding n = ${lvl.n2}`, 330, y0 + half + 28, { size: 11, color: col.muted });
        if (tryA !== null) {
          const i = tryA;
          const r = asinD(sinD(i) / lvl.n1);
          const slope = Math.tan(r * RAD);
          const guided = judgePipe(lvl, i).guided;
          // the pulse path, up to the first wall when it leaks
          const pts: [number, number][] = [[x0, y0]];
          let x = x0;
          let y = y0;
          let dir = -1;
          let wall = (y0 + dir * half - y) / (dir * slope || 1e-9);
          const stopAfterFirst = !guided;
          while (x < x1 && pts.length < 60) {
            const nx = Math.min(x1, x + Math.abs(wall));
            y += dir * slope * (nx - x);
            x = nx;
            pts.push([x, y]);
            if (stopAfterFirst) break;
            dir = -dir;
            wall = (2 * half) / (slope || 1e-9);
            if (slope < 1e-6) {
              pts.push([x1, y0]);
              break;
            }
          }
          // incoming ray from air, below and to the left
          const inLen = 70;
          seg(x0 - inLen * Math.cos(i * RAD), y0 + inLen * Math.sin(i * RAD), x0, y0, col.accent);
          let total = 0;
          const lens: number[] = [];
          for (let k = 1; k < pts.length; k++) {
            lens.push(Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
            total += lens[k - 1];
          }
          let left = started ? total * Math.min(1, p) : 0;
          for (let k = 1; k < pts.length && left > 0; k++) {
            const f = Math.min(1, left / lens[k - 1]);
            const [ex, ey] = part(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], f);
            seg(pts[k - 1][0], pts[k - 1][1], ex, ey, col.accent);
            left -= lens[k - 1];
          }
          if (started && !guided && p >= 1) {
            const last = pts[pts.length - 1];
            seg(last[0], last[1], last[0] + 50, last[1] + (last[1] < y0 ? -50 : 50), col.bad, 2.5, [5, 3]);
            label(g, 'leaks out', last[0] + 60, last[1] + (last[1] < y0 ? -56 : 62), { size: 12, color: col.bad });
          }
          if (started && guided && p >= 1) label(g, 'pulse arrives', x1 - 20, y0 - half - 30, { size: 13, color: col.good });
        }
      }
    }

    lab.mountAll();
    return startLoop((dt) => {
      lab.tick(dt);
      g.clearRect(0, 0, W, H);
      drawScene();
      lab.endFrame();
    });
  },
});
