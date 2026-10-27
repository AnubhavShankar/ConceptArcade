import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeCount, judgeDrift, judgeMobility, judgeScale, starsFor } from './logic';

const W = 640;
const H = 340;
const NEG = '#3156d3';
const POS = '#c0392b';
const REVEAL = 0.9;
const RUN = 3;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const CY = 170;
/** Display speed (px/s) for a drift speed in mm/s: slow things look slow, fast things look faster, never frantic. */
const vis = (vd: number) => 8 + 14 * Math.log10(1 + 20 * vd);
const hash = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

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
    let gateT: number | null = null; // level 1: the counting gate
    let conventionalRight: boolean | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A metal wire with free electrons jiggling about and drifting slowly along it.' });
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

    // ---- the levels -------------------------------------------------------------------------------------------
    if (lvl.kind === 'count') {
      const iIn = field('Current in A', 'I = ? A');
      const dirBtns = [true, false].map((right) => {
        const text = right ? 'Conventional current: left to right' : 'Conventional current: right to left';
        const b = h('button', {
          class: 'btn btn-ghost',
          type: 'button',
          'aria-label': text,
          'aria-pressed': 'false',
          onclick: () => {
            conventionalRight = right;
            dirBtns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
          },
        }, right ? 'Left to right' : 'Right to left');
        return b;
      });
      const run = () => {
        if (finished || busy()) return;
        if (gateT === null) return freeNote('Open the gate first to read the count.');
        const i = num(iIn);
        if (i === null || i <= 0) return freeNote('Enter the current as a positive number of amperes.');
        if (conventionalRight === null) return freeNote('Choose the direction of the conventional current.');
        const res = judgeCount(lvl, i, conventionalRight);
        verdict(res.ok);
        if (res.ok) return succeed(`I = ${fmt(lvl.i)} A, and the conventional current flows ${lvl.electronsRight ? 'right to left' : 'left to right'}.`);
        const parts: string[] = [];
        if (!res.iOk) parts.push('The current is not right: the charge that passed is the number of electrons times the charge on one, and current is charge per second.');
        if (!res.dirOk) parts.push('The direction is not right: the conventional current is defined as the flow of positive charge.');
        miss(parts.join(' '));
      };
      const open = () => {
        if (finished || gateT !== null) return;
        gateT = 0;
      };
      controls.append(actionBtn('Open the gate', 'Open the gate', open), row('Current', iIn, 'A'), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Direction'), ...dirBtns), actionBtn('Check the current', 'Check the current', run));
      hint.textContent = 'Each electron carries 1.6 × 10⁻¹⁹ C. Open the gate to start the counter.';
    }
    if (lvl.kind === 'drift') {
      const vIn = field('Drift speed in mm/s', 'v_d = ? mm/s');
      const tIn = field('Time to drift the whole wire in hours', 't = ? h');
      const run = () => {
        if (finished || busy()) return;
        const v = num(vIn);
        const t = num(tIn);
        if (v === null || t === null || v <= 0 || t <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeDrift(lvl, v, t);
        verdict(res.ok);
        if (res.ok) return succeed(`v_d = ${fmt(lvl.vd)} mm/s, and the electron needs about ${fmt(lvl.hours)} hours.`);
        const parts: string[] = [];
        if (!res.vdOk) parts.push('The drift speed is not right: the current is the charge of the free electrons crossing the cross-section each second. Give it in mm/s.');
        if (!res.hoursOk) parts.push('The time is not right: it is the length divided by the drift speed, expressed in hours.');
        miss(parts.join(' '));
      };
      controls.append(row('Drift speed', vIn, 'mm/s'), row('Time end to end', tIn, 'h'), actionBtn('Check the drift', 'Check the drift', run));
      hint.textContent = `Copper: n = 8.5 × 10²⁸ electrons per m³, e = 1.6 × 10⁻¹⁹ C. Current ${lvl.i} A, cross-section ${lvl.aMm2} mm², wire length ${lvl.lenM} m.`;
    }
    if (lvl.kind === 'scale') {
      const vIn = field('New drift speed in mm/s', 'v_d′ = ? mm/s');
      const nIn = field('Time for the signal to cross the circuit in ns', 't = ? ns');
      const run = () => {
        if (finished || busy()) return;
        const v = num(vIn);
        const n = num(nIn);
        if (v === null || n === null || v <= 0 || n <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeScale(lvl, v, n);
        verdict(res.ok);
        if (res.ok) return succeed(`v_d′ = ${fmt(lvl.vd2)} mm/s, and the signal crosses in ${fmt(lvl.ns)} ns.`);
        const parts: string[] = [];
        if (!res.vdOk) parts.push('The new drift speed is not right: the same current has to squeeze through a different cross-section.');
        if (!res.nsOk) parts.push('The signal time is not right: the electric field that sets the electrons drifting travels at the speed of light, 3 × 10⁸ m/s. Give it in ns.');
        miss(parts.join(' '));
      };
      controls.append(row('New drift speed', vIn, 'mm/s'), row('Signal time', nIn, 'ns'), actionBtn('Check the wire', 'Check the wire', run));
      hint.textContent = `Current ${lvl.i} A, copper n = 8.5 × 10²⁸ m⁻³. The wire goes from ${lvl.a1} mm² to ${lvl.a2} mm². Circuit length ${lvl.lenM} m.`;
    }
    if (lvl.kind === 'mobility') {
      const vIn = field('Drift speed in mm/s', 'v_d = ? mm/s');
      const iIn = field('Current in A', 'I = ? A');
      const run = () => {
        if (finished || busy()) return;
        const v = num(vIn);
        const i = num(iIn);
        if (v === null || i === null || v <= 0 || i <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeMobility(lvl, v, i);
        verdict(res.ok);
        if (res.ok) return succeed(`v_d = ${fmt(lvl.vd)} mm/s, and the current is ${fmt(lvl.i)} A.`);
        const parts: string[] = [];
        if (!res.vdOk) parts.push('The drift speed is not right: mobility is the drift speed per unit electric field, and the field in the wire is the voltage per metre.');
        if (!res.iOk) parts.push('The current is not right: use the drift speed with the number of electrons in the cross-section, with the area in m².');
        miss(parts.join(' '));
      };
      controls.append(row('Drift speed', vIn, 'mm/s'), row('Current', iIn, 'A'), actionBtn('Check the wire', 'Check the wire', run));
      hint.textContent = `Copper: μ = ${lvl.muMilli} × 10⁻³ m²/(V s), n = 8.5 × 10²⁸ m⁻³. ${lvl.v} V across ${lvl.lenM} m of wire, cross-section ${lvl.aMm2} mm².`;
    }

    // ---- drawing --------------------------------------------------------------------------------------------------------
    const N = 44;
    /** A stretch of wire: fixed vibrating ions, and free electrons that jiggle and drift. dir = +1 drifts right. */
    function wire(x0: number, x1: number, half: number, speedPx: number, dir: number, tag: number) {
      g.fillStyle = col.panel;
      g.fillRect(x0, CY - half, x1 - x0, half * 2);
      g.strokeStyle = col.line;
      g.lineWidth = 2;
      g.strokeRect(x0, CY - half, x1 - x0, half * 2);
      const len = x1 - x0;
      for (let i = 0; i < 18; i++) {
        const ix = x0 + 14 + (i % 9) * ((len - 28) / 8);
        const iy = CY + (i < 9 ? -half * 0.45 : half * 0.45);
        disc(g, ix + Math.sin(clock * 9 + i) * 1.4, iy + Math.cos(clock * 8 + i * 2) * 1.4, 4.5, col.muted);
      }
      const n = Math.max(10, Math.round(N * (len / 500) * Math.max(0.6, half / 30)));
      for (let i = 0; i < n; i++) {
        const base = hash(i, tag) * len;
        const dx = dir * clock * speedPx;
        const x = x0 + ((((base + dx) % len) + len) % len);
        const y = CY + (hash(i, tag + 7) * 2 - 1) * (half - 7) + Math.sin(clock * (5 + hash(i, 3) * 6) + i) * 3.5;
        disc(g, x + Math.cos(clock * (6 + hash(i, 5) * 5) + i) * 3, y, 3.5, NEG);
      }
    }
    const arrow = (x: number, y: number, dir: number, text: string, color: string) => {
      g.strokeStyle = color;
      g.fillStyle = color;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x - 30 * dir, y);
      g.lineTo(x + 30 * dir, y);
      g.stroke();
      g.beginPath();
      g.moveTo(x + 32 * dir, y);
      g.lineTo(x + 20 * dir, y - 6);
      g.lineTo(x + 20 * dir, y + 6);
      g.fill();
      label(g, text, x, y - 14, { size: 12, color });
    };

    function drawCount() {
      if (lvl.kind !== 'count') return;
      const dir = lvl.electronsRight ? 1 : -1;
      wire(50, 590, 42, 36, dir, 1);
      const gx = 320;
      g.strokeStyle = gateT === null ? col.muted : col.accent;
      g.lineWidth = gateT === null ? 3 : 4;
      g.setLineDash([6, 5]);
      g.beginPath();
      g.moveTo(gx, CY - 56);
      g.lineTo(gx, CY + 56);
      g.stroke();
      g.setLineDash([]);
      label(g, 'counting gate', gx, CY - 70, { size: 12, color: col.muted });
      const f = gateT === null ? 0 : Math.min(1, gateT / RUN);
      label(g, `N = ${fmt(lvl.n18 * ease(f))} × 10¹⁸ electrons`, gx, CY + 88, { size: 15, color: col.text });
      label(g, `t = ${fmt(lvl.t * f)} s`, gx, CY + 110, { size: 13, color: col.muted });
      arrow(gx, 40, dir, 'electrons', NEG);
      if (verdictAt !== null && verdictOk) arrow(gx, 300, -dir, 'conventional current', POS);
    }
    function drawDrift() {
      if (lvl.kind !== 'drift') return;
      const half = 14 + lvl.aMm2 * 6;
      wire(50, 590, half, vis(lvl.vd), 1, 2);
      const f = runT === null ? 0 : Math.min(1, runT / RUN);
      label(g, `A = ${lvl.aMm2} mm², L = ${lvl.lenM} m, I = ${lvl.i} A`, 320, 50, { size: 13, color: col.muted });
      if (runT !== null) {
        // the field signal races ahead; the electron has barely moved
        g.fillStyle = col.accent;
        g.globalAlpha = 0.8 * (1 - f * 0.4);
        g.fillRect(50, CY + half + 24, 540 * ease(Math.min(1, f * 5)), 6);
        g.globalAlpha = 1;
        label(g, 'electric signal', 70, CY + half + 46, { size: 12, color: col.accent });
        g.fillStyle = NEG;
        g.fillRect(50, CY + half + 62, Math.max(2, 540 * 0.0006), 6);
        label(g, 'one electron', 62, CY + half + 84, { size: 12, color: NEG });
      }
      if (verdictAt !== null && verdictOk) label(g, `${fmt(lvl.vd)} mm/s: about ${fmt(lvl.hours)} h end to end`, 320, 290, { size: 14, color: col.good });
    }
    function drawScale() {
      if (lvl.kind !== 'scale') return;
      const h1 = 14 + lvl.a1 * 6;
      const h2 = 14 + Math.min(lvl.a2, 6) * 6;
      const s1 = vis(lvl.vd1);
      const s2 = vis(lvl.vd2);
      wire(50, 320, h1, s1, 1, 3);
      wire(320, 590, h2, s2, 1, 4);
      label(g, `${lvl.a1} mm²`, 185, CY - h1 - 14, { size: 13, color: col.muted });
      label(g, `${lvl.a2} mm²`, 455, CY - h2 - 14, { size: 13, color: col.muted });
      label(g, 'same current', 320, 40, { size: 13, color: col.muted });
      // the lamp at the right end lights as the signal pulse arrives
      const f = runT === null ? 0 : Math.min(1, runT / 0.6);
      const px = 50 + 540 * ease(f);
      if (runT !== null) {
        g.fillStyle = col.accent;
        g.globalAlpha = 0.9;
        g.fillRect(px - 5, CY - 56, 10, 112);
        g.globalAlpha = 1;
      }
      disc(g, 610, CY, 14, f >= 1 ? '#f4b400' : col.muted);
      label(g, f >= 1 ? 'lit' : 'lamp', 610, CY + 34, { size: 12, color: col.muted });
      if (verdictAt !== null && verdictOk) label(g, `signal ${fmt(lvl.ns)} ns, drift ${fmt(lvl.vd2)} mm/s`, 320, 300, { size: 14, color: col.good });
    }
    function drawMobility() {
      if (lvl.kind !== 'mobility') return;
      wire(80, 560, 40, vis(lvl.vd), 1, 5);
      // the field arrows inside the wire push electrons the other way, so they drift against E
      g.strokeStyle = col.accent;
      g.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const t = (((clock * 0.3 + i / 6) % 1) + 1) % 1;
        g.globalAlpha = 0.6 * Math.sin(t * Math.PI);
        g.beginPath();
        g.moveTo(90 + t * 460 - 14, CY - 52);
        g.lineTo(90 + t * 460 + 14, CY - 52);
        g.lineTo(90 + t * 460 + 8, CY - 57);
        g.stroke();
      }
      g.globalAlpha = 1;
      label(g, `E = V/L, ${lvl.v} V over ${lvl.lenM} m`, 320, 36, { size: 13, color: col.accent });
      label(g, `μ = ${lvl.muMilli} × 10⁻³ m²/(V s)`, 320, 290, { size: 13, color: col.muted });
      if (verdictAt !== null && verdictOk) label(g, `${fmt(lvl.vd)} mm/s, ${fmt(lvl.i)} A`, 320, 312, { size: 14, color: col.good });
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      if (gateT !== null && gateT < RUN + 0.2) gateT += dt;
      g.clearRect(0, 0, W, H);
      drawCount();
      drawDrift();
      drawScale();
      drawMobility();
      if (verdictAt !== null && clock - verdictAt < REVEAL) {
        g.strokeStyle = verdictOk ? col.good : col.bad;
        g.lineWidth = 6;
        g.globalAlpha = 1 - (clock - verdictAt) / REVEAL;
        g.strokeRect(3, 3, W - 6, H - 6);
        g.globalAlpha = 1;
      }
      const running = busy() || (gateT !== null && gateT < RUN);
      const phase = verdictAt === null ? (running ? 'testing' : 'idle') : busy() || clock - verdictAt < REVEAL ? 'testing' : 'done';
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
