import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeCompensate, judgeScale, judgeShort, netOnAxisUT, starsFor, type Along } from './logic';

const W = 640;
const H = 340;
const NORTH = '#c0392b';
const SOUTH = '#3156d3';
const REVEAL = 0.9;
const RUN = 3;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const CX = 260;
const CY = 175;

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
    let axialPick: Along | null = null;
    let eqPick: Along | null = null;
    let probe = 20; // level 2: the probe distance in cm
    let touched = false;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A short bar magnet with its dipole field lines and probe points on the axis and the equatorial line.' });
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
    const choice = (name: string, kind: string, onPick: (v: Along) => void) => {
      const opts: [Along, string, string][] = [['along', `${kind} field points along the moment`, 'Along m'], ['against', `${kind} field points against the moment`, 'Against m']];
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
    if (lvl.kind === 'short') {
      const aIn = field('Field on the axis in µT', 'B axis = ? µT');
      const eIn = field('Field on the equatorial line in µT', 'B equator = ? µT');
      const run = () => {
        if (finished || busy()) return;
        const a = num(aIn);
        const e = num(eIn);
        if (a === null || e === null || a <= 0 || e <= 0) return freeNote('Enter both fields as positive numbers of µT.');
        if (axialPick === null || eqPick === null) return freeNote('Choose a direction for each field.');
        const res = judgeShort(lvl, a, e, axialPick, eqPick);
        verdict(res.ok);
        if (res.ok) return succeed(`Axial ${fmt(lvl.axial)} µT along m, equatorial ${fmt(lvl.equatorial)} µT against m.`);
        const parts: string[] = [];
        if (!res.aOk) parts.push('The axial field is not right: use (μ₀/4π) 2m/r³ with r in metres, and give it in µT.');
        if (!res.eOk) parts.push('The equatorial field is not right: compare it with the axial field at the same distance.');
        if (!res.adOk) parts.push('The direction on the axis is not right.');
        if (!res.edOk) parts.push('The direction on the equatorial line is not right: compare with the electric dipole.');
        miss(parts.join(' '));
      };
      controls.append(row('On the axis', aIn, 'µT'), row('On the equator', eIn, 'µT'), choice('Axial direction', 'Axial', (v) => (axialPick = v)), choice('Equatorial direction', 'Equatorial', (v) => (eqPick = v)), actionBtn('Measure the fields', 'Measure the fields', run));
      hint.textContent = `Magnetic moment ${lvl.m} J/T. Both points are ${lvl.rCm} cm from the centre of the magnet. μ₀/4π = 10⁻⁷ T m/A.`;
    }
    if (lvl.kind === 'compensate') {
      const slider = h('input', { type: 'range', min: '5', max: '40', step: '0.5', value: '20', 'aria-label': 'Probe distance in cm' }) as HTMLInputElement;
      const sync = () => {
        probe = Number(slider.value);
        touched = true;
      };
      slider.addEventListener('input', sync);
      slider.addEventListener('change', sync);
      const rIn = field('Distance in cm', 'r = ? cm');
      const run = () => {
        if (finished || busy()) return;
        if (!touched) return freeNote('Slide the probe along the axis first and watch the meter.');
        const r = num(rIn);
        if (r === null || r <= 0) return freeNote('Enter the distance as a positive number of cm.');
        const ok = judgeCompensate(lvl, r).ok;
        verdict(ok);
        if (ok) return succeed(`The fields cancel ${fmt(lvl.rCm)} cm from the magnet.`);
        miss('That is not the point where the net field is zero. At the null point the magnet\'s axial field equals the external field in size.');
      };
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Probe'), slider), row('Null point', rIn, 'cm'), actionBtn('Check the null point', 'Check the null point', run));
      hint.textContent = `Magnetic moment ${lvl.m} J/T. The external field is ${lvl.bExt} µT, pointing against the moment of the magnet.`;
    }
    if (lvl.kind === 'scale') {
      const eIn = field('Equatorial field in µT', 'B = ? µT');
      const run = () => {
        if (finished || busy()) return;
        const e = num(eIn);
        if (e === null || e <= 0) return freeNote('Enter the field as a positive number of µT.');
        const ok = judgeScale(lvl, e).ok;
        verdict(ok);
        if (ok) return succeed(`B = ${fmt(lvl.eqNew)} µT.`);
        miss('That is not the equatorial field at the new distance: compare the equatorial and axial fields, and remember how the field depends on distance.');
      };
      controls.append(row('Equatorial field', eIn, 'µT'), actionBtn('Predict the field', 'Predict the field', run));
      hint.textContent = `On the axis at ${lvl.r1Cm} cm the field is ${lvl.b1} µT. Predict the field on the equatorial line at ${fmt(lvl.k * lvl.r1Cm)} cm (${lvl.k} times as far).`;
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
      if (text) label(g, text, x + dx + ux * 26, y + dy + uy * 14, { size: 12, color });
    };
    const magnet = (x: number, y: number) => {
      g.fillStyle = SOUTH;
      g.fillRect(x - 40, y - 12, 40, 24);
      g.fillStyle = NORTH;
      g.fillRect(x, y - 12, 40, 24);
      g.strokeStyle = col.line;
      g.lineWidth = 2;
      g.strokeRect(x - 40, y - 12, 80, 24);
      label(g, 'S', x - 20, y, { size: 14, color: '#fff' });
      label(g, 'N', x + 20, y, { size: 14, color: '#fff' });
      arrow(x - 24, y + 34, 48, 0, col.text, 'm', 2.5);
    };
    /** Dipole field lines r = L sin²θ, drawn on both sides of the axis and animated with drifting arrowheads. */
    const lines = (x: number, y: number, scale: number) => {
      for (let k = 1; k <= 4; k++) {
        const L = k * 24 * scale;
        for (const side of [-1, 1]) {
          g.strokeStyle = col.accent;
          g.lineWidth = 1.3;
          g.globalAlpha = 0.5;
          g.beginPath();
          for (let i = 0; i <= 90; i++) {
            const a = (i / 90) * Math.PI;
            const r = L * Math.sin(a) ** 2 * 1.7;
            const px = x + r * Math.cos(a);
            const py = y - side * r * Math.sin(a);
            if (i) g.lineTo(px, py);
            else g.moveTo(px, py);
          }
          g.stroke();
          g.globalAlpha = 1;
          const a = ((((clock * 0.18 + k * 0.1) % 1) + 1) % 1) * Math.PI;
          const r = L * Math.sin(a) ** 2 * 1.7;
          disc(g, x + r * Math.cos(a), y - side * r * Math.sin(a), 2.4, col.accent);
        }
      }
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const runF = () => (runT === null ? 0 : ease(Math.min(1, runT / RUN)));

    function drawShort() {
      if (lvl.kind !== 'short') return;
      lines(CX, CY, 1);
      magnet(CX, CY);
      const rpx = 100 + lvl.rCm * 3;
      const ax = CX + rpx;
      const ey = CY - rpx * 0.7;
      disc(g, ax, CY, 5, col.accent);
      disc(g, CX, ey, 5, col.accent);
      label(g, `axis, ${lvl.rCm} cm`, ax, CY + 22, { size: 12, color: col.accent });
      label(g, `equator, ${lvl.rCm} cm`, CX + 66, ey, { size: 12, color: col.accent });
      const f = runF();
      if (f > 0) {
        arrow(ax, CY - 18, 50 * f, 0, col.good, `${fmt(lvl.axial)} µT`);
        arrow(CX, ey + 18, -30 * f, 0, col.good, `${fmt(lvl.equatorial)} µT`);
      }
      verdictLabel('B(axis) = 2 B(equator), opposite directions', 440, 30);
    }
    function drawCompensate() {
      if (lvl.kind !== 'compensate') return;
      const left = 120;
      magnet(left, CY);
      const px = left + probe * 8;
      const net = netOnAxisUT(lvl.m, probe, lvl.bExt);
      // the external field pointing left
      for (let k = 0; k < 3; k++) {
        const t = (((clock * 0.2 + k / 3) % 1) + 1) % 1;
        g.globalAlpha = 0.5;
        arrow(600 - t * 140, 60 + k * 14, -44, 0, col.muted, '', 2);
        g.globalAlpha = 1;
      }
      label(g, `external field ${lvl.bExt} µT`, 520, 30, { size: 12, color: col.muted });
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(left + 40, CY);
      g.lineTo(600, CY);
      g.stroke();
      g.strokeStyle = col.accent;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(px, CY - 16);
      g.lineTo(px, CY + 16);
      g.stroke();
      disc(g, px, CY - 18, 4, col.accent);
      label(g, `${fmt(probe)} cm`, px, CY + 32, { size: 12, color: col.accent });
      // the meter
      const mx = 330;
      const my = 270;
      g.strokeStyle = col.text;
      g.lineWidth = 2;
      g.strokeRect(mx - 130, my - 16, 260, 32);
      g.beginPath();
      g.moveTo(mx, my - 16);
      g.lineTo(mx, my + 16);
      g.stroke();
      const swing = Math.tanh(net / 40) * 126;
      g.fillStyle = Math.abs(net) < 0.4 ? col.good : NORTH;
      g.globalAlpha = 0.8;
      g.fillRect(swing >= 0 ? mx : mx + swing, my - 12, Math.abs(swing), 24);
      g.globalAlpha = 1;
      label(g, Math.abs(net) < 0.4 ? 'net field ≈ 0' : `net ${fmt(Math.abs(net))} µT ${net > 0 ? 'along m' : 'against m'}`, mx, my + 34, { size: 12, color: col.text });
      if (runF() > 0 && verdictOk) {
        const nx = left + lvl.rCm * 8;
        g.strokeStyle = col.good;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(nx, CY - 30);
        g.lineTo(nx, CY + 30);
        g.stroke();
      }
      verdictLabel(`null point at ${fmt(lvl.rCm)} cm`, CX, 326);
    }
    function drawScale() {
      if (lvl.kind !== 'scale') return;
      lines(CX, CY, 0.8);
      magnet(CX, CY);
      const r1 = 40 + lvl.r1Cm * 8;
      const ax = CX + r1;
      const r2 = r1 * lvl.k;
      const ey = Math.max(30, CY - r2);
      disc(g, ax, CY, 5, col.accent);
      label(g, `${lvl.b1} µT at ${lvl.r1Cm} cm`, ax, CY + 22, { size: 12, color: col.accent });
      disc(g, CX, ey, 5, col.accent);
      label(g, runT === null ? `equator, ${fmt(lvl.k * lvl.r1Cm)} cm: ?` : `${fmt(lvl.eqNew * runF())} µT`, CX + 90, ey, { size: 12, color: col.text });
      verdictLabel(`B = ${fmt(lvl.eqNew)} µT`, 440, 30);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawShort();
      drawCompensate();
      drawScale();
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
