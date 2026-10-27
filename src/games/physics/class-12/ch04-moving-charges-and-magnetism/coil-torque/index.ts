import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeCircular, judgeEnergy, judgeFar, judgeSquare, judgeSwing, starsFor, type Equilibrium, type Shape } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const NEG = '#3156d3';
const REVEAL = 0.9;
const RUN = 3.4;
const CX = 320;
const CY = 175;
const rad = (deg: number) => (deg * Math.PI) / 180;

export default defineGame({
  mount(ctx) {
    const lvl = buildLevel(ctx.level, ctx.random);
    const col = themeColors();

    let misses = 0;
    let finished = false;
    let pendingWin: 1 | 2 | 3 | null = null;
    let wonAt: number | null = null;
    let clock = 0;
    let verdictAt: number | null = null;
    let verdictOk = false;
    let runT: number | null = null;
    let shapePick: Shape | null = null;
    let eqPick: Equilibrium | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A current loop in a uniform magnetic field, seen from above, turning under the torque of the field.' });
    const g = fitCanvas(canvas, W, H);
    const feedback = h('p', { class: 'feedback', hidden: true, 'aria-live': 'polite' });
    const solution = h('section', { class: 'panel solution', hidden: true });
    const hint = h('p', { class: 'muted note' });
    const controls = h('div', { class: 'lab-controls' });
    const free = lvl.freeTests;
    const say = (text: string, good = false) => {
      feedback.hidden = false;
      feedback.className = `feedback ${good ? 'good' : 'bad'}`;
      feedback.textContent = text;
    };
    const costNote = () => (misses > free ? ' That cost a star.' : free > 0 ? ` ${free - misses} free test${free - misses === 1 ? '' : 's'} left.` : '');
    const freeNote = (m: string) => say(`${m} That does not cost you anything.`);
    const miss = (text: string) => {
      misses++;
      say(text + costNote());
    };
    const succeed = (text: string) => {
      finished = true;
      say(text, true);
      solution.replaceChildren(h('h3', null, 'Why that works'), ...explainSolution(lvl).map((t) => h('p', null, t)));
      solution.hidden = false;
      controls.querySelectorAll('button, input').forEach((b) => b.setAttribute('disabled', ''));
      pendingWin = starsFor(misses, free);
    };
    const verdict = (ok: boolean) => {
      verdictAt = clock;
      verdictOk = ok;
      runT = 0;
    };
    const busy = () => runT !== null && runT < RUN;
    const field = (aria: string, placeholder: string) => h('input', { class: 'field', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': aria, placeholder }) as HTMLInputElement;
    const num = (el: HTMLInputElement) => parseNumber(el.value);
    const actionBtn = (text: string, aria: string, fn: () => void) => h('button', { class: 'btn', type: 'button', 'aria-label': aria, onclick: fn }, text);
    const row = (name: string, input: HTMLElement, unit: string) => h('div', { class: 'control' }, h('span', { class: 'control-label' }, name), input, h('span', { class: 'unit' }, unit));
    const choice = <T extends string>(name: string, opts: [T, string, string][], onPick: (v: T) => void) => {
      const btns: HTMLElement[] = opts.map(([v, aria, text]) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': aria, 'aria-pressed': 'false', onclick: () => {
          onPick(v);
          btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        } }, text);
        return b;
      });
      return h('div', { class: 'control' }, h('span', { class: 'control-label' }, name), ...btns);
    };

    // ---- the levels -------------------------------------------------------------------------------------------
    if (lvl.kind === 'square') {
      const tIn = field('Torque in N m', 'τ = ? N m');
      const run = () => {
        if (finished || busy()) return;
        const t = num(tIn);
        if (t === null || t <= 0) return freeNote('Enter the torque as a positive number of N m.');
        const ok = judgeSquare(lvl, t).ok;
        verdict(ok);
        if (ok) return succeed(`τ = ${fmt(lvl.torque)} N m.`);
        miss('That is not the torque: it depends on the number of turns, the current, the area in m², the field, and the sine of the angle between the normal to the coil and the field.');
      };
      controls.append(row('Torque', tIn, 'N m'), actionBtn('Release the coil', 'Release the coil', run));
      hint.textContent = `${lvl.n} turns, side ${lvl.sideCm} cm, ${lvl.i} A, field ${lvl.b} T. The normal to the coil makes ${lvl.theta}° with the field.`;
    }
    if (lvl.kind === 'circular') {
      const mIn = field('Magnetic moment in A m²', 'm = ? A m²');
      const tIn = field('Counter torque in N m', 'τ = ? N m');
      const run = () => {
        if (finished || busy()) return;
        const m = num(mIn);
        const t = num(tIn);
        if (m === null || t === null || m <= 0 || t <= 0) return freeNote('Enter both answers as positive numbers.');
        if (shapePick === null) return freeNote('Choose what happens for an irregular coil of the same area.');
        const res = judgeCircular(lvl, m, t, shapePick);
        verdict(res.ok);
        if (res.ok) return succeed(`m = ${fmt(lvl.m)} A m², τ = ${fmt(lvl.torque)} N m, and the shape does not matter.`);
        const parts: string[] = [];
        if (!res.mOk) parts.push('The magnetic moment is not right: it is the number of turns times the current times the area, with the area in m².');
        if (!res.tOk) parts.push('The torque is not right: τ = mB sin θ, with θ the angle between the moment (the normal) and the field.');
        if (!res.shapeOk) parts.push('Think again about the shape: what quantities does the torque depend on?');
        miss(parts.join(' '));
      };
      controls.append(
        row('Magnetic moment', mIn, 'A m²'),
        row('Counter torque', tIn, 'N m'),
        choice<Shape>('Irregular coil', [['same', 'Irregular coil of the same area: torque is the same', 'Same torque'], ['changes', 'Irregular coil of the same area: torque changes', 'Torque changes']], (v) => (shapePick = v)),
        actionBtn('Check the coil', 'Check the coil', run),
      );
      hint.textContent = `${lvl.n} turns of radius ${lvl.rCm} cm carrying ${lvl.i} A, in a field of ${lvl.b} T. The field lines make ${lvl.theta}° with the normal of the coil.`;
    }
    if (lvl.kind === 'swing') {
      const tIn = field('Torque at release in N m', 'τ = ? N m');
      const wIn = field('Angular speed in rad/s', 'ω = ? rad/s');
      const run = () => {
        if (finished || busy()) return;
        const t = num(tIn);
        const w = num(wIn);
        if (t === null || w === null || t <= 0 || w <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeSwing(lvl, t, w);
        verdict(res.ok);
        if (res.ok) return succeed(`τ = ${fmt(lvl.torque)} N m at release, and ω = ${fmt(lvl.omega)} rad/s at alignment.`);
        const parts: string[] = [];
        if (!res.tOk) parts.push('The torque is not right: at release the moment is at right angles to the field.');
        if (!res.wOk) parts.push('The angular speed is not right: the work done by the torque as the coil turns becomes its kinetic energy of rotation.');
        miss(parts.join(' '));
      };
      controls.append(row('Torque at release', tIn, 'N m'), row('Angular speed', wIn, 'rad/s'), actionBtn('Release the coil', 'Release the coil', run));
      hint.textContent = `${lvl.n} turns of radius ${lvl.rCm} cm carrying ${lvl.i} A. Field ${lvl.b} T. Moment of inertia ${lvl.inertia} kg m².`;
    }
    if (lvl.kind === 'energy') {
      const wIn = field('Work needed in J', 'W = ? J');
      const run = () => {
        if (finished || busy()) return;
        const w = num(wIn);
        if (w === null || w < 0) return freeNote('Enter the work as a number of joules, zero or more.');
        if (eqPick === null) return freeNote('Choose the kind of equilibrium, if any.');
        const res = judgeEnergy(lvl, w, eqPick);
        verdict(res.ok);
        if (res.ok) return succeed(`W = ${fmt(lvl.work)} J, and the orientation is ${lvl.eq === 'none' ? 'not an equilibrium' : `a ${lvl.eq} equilibrium`}.`);
        const parts: string[] = [];
        if (!res.wOk) parts.push('The work is not right: it is the change in the potential energy U = −mB cos θ, from the stable orientation to this one.');
        if (!res.eqOk) parts.push('The kind of equilibrium is not right: where is the torque zero, and does a small turn make the torque restore the loop or push it further away?');
        miss(parts.join(' '));
      };
      controls.append(
        row('Work needed', wIn, 'J'),
        choice<Equilibrium>('Orientation is', [['stable', 'Orientation is a stable equilibrium', 'Stable'], ['unstable', 'Orientation is an unstable equilibrium', 'Unstable'], ['none', 'Orientation is not an equilibrium', 'Not an equilibrium']], (v) => (eqPick = v)),
        actionBtn('Turn the loop', 'Turn the loop', run),
      );
      hint.textContent = `Magnetic moment ${lvl.m} A m², field ${lvl.b} T, the moment is at ${lvl.theta}° to the field. The stable orientation is θ = 0.`;
    }
    if (lvl.kind === 'far') {
      const aIn = field('Field on the axis in µT', 'B axis = ? µT');
      const eIn = field('Field on the equatorial line in µT', 'B equator = ? µT');
      const run = () => {
        if (finished || busy()) return;
        const a = num(aIn);
        const e = num(eIn);
        if (a === null || e === null || a <= 0 || e <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeFar(lvl, a, e);
        verdict(res.ok);
        if (res.ok) return succeed(`On the axis ${fmt(lvl.axial)} µT, on the equatorial line ${fmt(lvl.equatorial)} µT.`);
        const parts: string[] = [];
        if (!res.aOk) parts.push('The axial field is not right: far away the loop acts as a dipole, so use its magnetic moment and the cube of the distance.');
        if (!res.eOk) parts.push('The equatorial field is not right: compare it with the axial field, as for a bar magnet.');
        miss(parts.join(' '));
      };
      controls.append(row('On the axis', aIn, 'µT'), row('On the equator', eIn, 'µT'), actionBtn('Measure the field', 'Measure the field', run));
      hint.textContent = `A loop of ${lvl.n} turns, radius ${lvl.rCm} cm, carrying ${lvl.i} A. The points are ${lvl.xM} m from its centre.`;
    }

    // ---- drawing helpers -------------------------------------------------------------------------------------------------
    const arrow = (x: number, y: number, dx: number, dy: number, color: string, text = '', width = 3) => {
      const len = Math.hypot(dx, dy);
      if (len < 1) return;
      const ux = dx / len;
      const uy = dy / len;
      g.strokeStyle = color;
      g.fillStyle = color;
      g.lineWidth = width;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + dx, y + dy);
      g.stroke();
      g.beginPath();
      g.moveTo(x + dx + ux * 9, y + dy + uy * 9);
      g.lineTo(x + dx - uy * 6, y + dy + ux * 6);
      g.lineTo(x + dx + uy * 6, y + dy - ux * 6);
      g.fill();
      if (text) label(g, text, x + dx + ux * 24, y + dy + uy * 14, { size: 12, color });
    };
    const fieldArrows = (text = 'B') => {
      for (let k = 0; k < 5; k++) {
        const y = 60 + k * 55;
        const t = (((clock * 0.2 + k * 0.13) % 1) + 1) % 1;
        const x = 40 + t * 80;
        g.globalAlpha = 0.5;
        arrow(x, y, 46, 0, col.muted, '', 2);
        g.globalAlpha = 1;
      }
      label(g, text, 40, 36, { size: 13, color: col.muted });
    };
    /** A coil seen from above as a thick line, with its normal. theta is the angle of the normal from the field (to the right), positive upwards. */
    const coil = (theta: number, size: number, withTorque = false) => {
      const nx = Math.cos(theta);
      const ny = -Math.sin(theta);
      const tx = -ny;
      const ty = nx;
      g.strokeStyle = '#b87333';
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(CX - tx * size, CY - ty * size);
      g.lineTo(CX + tx * size, CY + ty * size);
      g.stroke();
      // the current comes out of the page at one end and into it at the other
      g.fillStyle = '#fff';
      disc(g, CX + tx * size, CY + ty * size, 6, POS);
      disc(g, CX + tx * size, CY + ty * size, 2, '#fff');
      disc(g, CX - tx * size, CY - ty * size, 6, NEG);
      g.strokeStyle = '#fff';
      g.lineWidth = 1.5;
      g.beginPath();
      const ex = CX - tx * size;
      const ey = CY - ty * size;
      g.moveTo(ex - 3, ey - 3);
      g.lineTo(ex + 3, ey + 3);
      g.moveTo(ex + 3, ey - 3);
      g.lineTo(ex - 3, ey + 3);
      g.stroke();
      arrow(CX, CY, nx * 70, ny * 70, col.text, 'm', 2.5);
      if (withTorque) {
        g.strokeStyle = col.accent;
        g.lineWidth = 3;
        g.beginPath();
        g.arc(CX, CY, 46, -theta + 0.2, 0.0, theta > 0);
        g.stroke();
      }
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    /** Damped swing of the angle towards zero: a coil released at theta0 rocks to alignment with the field. */
    const swing = (theta0: number) => {
      const t = runT === null ? 0 : Math.min(runT, RUN + 0.2);
      return theta0 * Math.cos(t * 3.2) * Math.exp(-t * 0.55);
    };

    function drawSquare() {
      if (lvl.kind !== 'square') return;
      fieldArrows();
      const t0 = rad(lvl.theta);
      const th = runT === null ? t0 : swing(t0);
      coil(th, 56 + lvl.sideCm * 2, runT === null);
      label(g, `θ = ${lvl.theta}°`, CX + 78, CY - 56, { size: 13, color: col.muted });
      verdictLabel(`τ = ${fmt(lvl.torque)} N m`, CX, 30);
    }
    function drawCircular() {
      if (lvl.kind !== 'circular') return;
      fieldArrows();
      const t0 = rad(lvl.theta);
      const th = runT === null ? t0 : swing(t0);
      coil(th, 60, runT === null);
      label(g, `θ = ${lvl.theta}°`, CX + 78, CY - 56, { size: 13, color: col.muted });
      // the two coils with the same area, side by side
      g.strokeStyle = col.muted;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(500, 280, 24, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      for (let k = 0; k <= 40; k++) {
        const a = (k / 40) * Math.PI * 2;
        const r = 24 * (1 + 0.28 * Math.sin(3 * a) + 0.12 * Math.cos(2 * a));
        const x = 570 + Math.cos(a) * r;
        const y = 280 + Math.sin(a) * r;
        if (k) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.stroke();
      label(g, 'same area A', 535, 318, { size: 11, color: col.muted });
      verdictLabel(`m = ${fmt(lvl.m)} A m², τ = ${fmt(lvl.torque)} N m`, CX, 30);
    }
    function drawSwing() {
      if (lvl.kind !== 'swing') return;
      fieldArrows();
      const th = runT === null ? Math.PI / 2 : swing(Math.PI / 2);
      coil(th, 60, runT === null);
      label(g, 'released at 90°', CX + 80, CY - 60, { size: 13, color: col.muted });
      const w = runT === null ? 0 : Math.min(1, Math.abs(Math.sin(Math.min(runT, 1) * 1.6)));
      label(g, runT === null ? 'ω = 0' : `ω up to ${fmt(lvl.omega * w)} rad/s`, CX, 300, { size: 13, color: col.text });
      verdictLabel(`τ = ${fmt(lvl.torque)} N m, ω = ${fmt(lvl.omega)} rad/s`, CX, 30);
    }
    function drawEnergy() {
      if (lvl.kind !== 'energy') return;
      fieldArrows();
      const t0 = rad(lvl.theta);
      const th = runT === null ? t0 : lvl.eq === 'none' ? swing(t0) : t0;
      // the moment as an arrow at the angle, and the energy curve U(θ)
      arrow(CX - 100, CY, Math.cos(th) * 80, -Math.sin(th) * 80, col.text, 'm', 3);
      label(g, `θ = ${lvl.theta}°`, CX - 100, CY + 50, { size: 13, color: col.muted });
      const gx = 330;
      const gy = 290;
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(gx, gy);
      g.lineTo(600, gy);
      g.moveTo(gx, gy);
      g.lineTo(gx, 110);
      g.stroke();
      label(g, 'θ (0° to 180°)', 590, gy + 14, { size: 11, color: col.muted });
      label(g, 'U = −mB cos θ', gx + 70, 100, { size: 12, color: col.muted });
      g.strokeStyle = col.accent;
      g.lineWidth = 2.5;
      g.beginPath();
      for (let k = 0; k <= 60; k++) {
        const a = (k / 60) * Math.PI;
        const x = gx + (a / Math.PI) * 250;
        const yy = 200 + Math.cos(a) * 80; // the energy −mB cos θ is lowest at θ = 0
        if (k) g.lineTo(x, yy);
        else g.moveTo(x, yy);
      }
      g.stroke();
      const mx = gx + (t0 / Math.PI) * 250;
      const my = 200 + Math.cos(t0) * 80;
      disc(g, mx, my, 6, col.accent);
      const f = runT === null ? 0 : Math.min(1, runT / RUN);
      if (f > 0 && verdictOk) {
        label(g, lvl.eq === 'stable' ? 'minimum: stable' : lvl.eq === 'unstable' ? 'maximum: unstable' : 'slope: a torque acts', mx, my - 18, { size: 12, color: col.good });
      }
      verdictLabel(`W = ${fmt(lvl.work)} J`, CX, 30);
    }
    function drawFar() {
      if (lvl.kind !== 'far') return;
      // a small loop at the centre with dipole field lines, and the two points
      const cx = 300;
      const cy = 175;
      for (let k = 1; k <= 4; k++) {
        const Lk = 34 * k;
        g.strokeStyle = col.accent;
        g.lineWidth = 1.5;
        g.globalAlpha = 0.6;
        g.beginPath();
        for (let i = 0; i <= 80; i++) {
          const a = (i / 80) * Math.PI;
          const r = Lk * Math.sin(a) ** 2 * 1.9;
          const x = cx + r * Math.cos(a);
          const y = cy - r * Math.sin(a);
          if (i) g.lineTo(x, y);
          else g.moveTo(x, y);
        }
        g.stroke();
        g.beginPath();
        for (let i = 0; i <= 80; i++) {
          const a = (i / 80) * Math.PI;
          const r = Lk * Math.sin(a) ** 2 * 1.9;
          const x = cx + r * Math.cos(a);
          const y = cy + r * Math.sin(a);
          if (i) g.lineTo(x, y);
          else g.moveTo(x, y);
        }
        g.stroke();
        g.globalAlpha = 1;
      }
      g.strokeStyle = '#b87333';
      g.lineWidth = 6;
      g.beginPath();
      g.ellipse(cx, cy, 6, 28, 0, 0, Math.PI * 2);
      g.stroke();
      arrow(cx - 30, cy, 60, 0, col.text, 'm', 2.5);
      const ax = cx + 190;
      const ey = cy - 120;
      disc(g, ax, cy, 5, col.accent);
      disc(g, cx, ey, 5, col.accent);
      label(g, `axis: ${lvl.xM} m`, ax, cy + 20, { size: 12, color: col.accent });
      label(g, `equator: ${lvl.xM} m`, cx + 56, ey, { size: 12, color: col.accent });
      const f = runT === null ? 0 : Math.min(1, runT / RUN);
      if (f > 0) {
        label(g, `${fmt(lvl.axial * f)} µT`, ax, cy - 18, { size: 13, color: col.text });
        label(g, `${fmt(lvl.equatorial * f)} µT`, cx + 56, ey + 18, { size: 13, color: col.text });
      }
      verdictLabel('B(axis) = 2 × B(equator)', CX, 30);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawSquare();
      drawCircular();
      drawSwing();
      drawEnergy();
      drawFar();
      if (verdictAt !== null && clock - verdictAt < REVEAL) {
        g.strokeStyle = verdictOk ? col.good : col.bad;
        g.lineWidth = 6;
        g.globalAlpha = 1 - (clock - verdictAt) / REVEAL;
        g.strokeRect(3, 3, W - 6, H - 6);
        g.globalAlpha = 1;
      }
      const phase = verdictAt === null ? 'idle' : busy() || clock - verdictAt < REVEAL ? 'testing' : 'done';
      canvas.dataset.phase = phase;
      if (pendingWin !== null && phase !== 'testing') {
        wonAt ??= clock;
        if (clock - wonAt > 0.3) {
          const s = pendingWin;
          pendingWin = null;
          ctx.win({ stars: s });
        }
      }
    });
  },
});
