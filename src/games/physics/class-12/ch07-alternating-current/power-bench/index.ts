import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeCircuit, judgeCorrect, judgeLoss, judgePhase, judgeTransformer, starsFor, type Kind } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const REVEAL = 0.9;
const RUN = 3;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

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
    let kindPick: Kind | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'Phasors of voltage and current, a transformer, or a power line, with the power flowing.' });
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
    const positive = (...vs: (number | null)[]) => vs.every((v) => v !== null && v > 0);

    // ---- the levels -------------------------------------------------------------------------------------------
    if (lvl.kind === 'phase') {
      const pIn = field('Average power in W', 'P = ? W');
      const qIn = field('Wattless current in A', 'I sin φ = ? A');
      const run = () => {
        if (finished || busy()) return;
        const p = num(pIn);
        const q = num(qIn);
        if (!positive(p, q)) return freeNote('Enter both answers as positive numbers.');
        const res = judgePhase(lvl, p as number, q as number);
        verdict(res.ok);
        if (res.ok) return succeed(`P = ${fmt(lvl.p)} W and the wattless current is ${fmt(lvl.iq)} A.`);
        const parts: string[] = [];
        if (!res.pOk) parts.push('The power is not right: only the component of the current in phase with the voltage delivers power, P = V I cos φ.');
        if (!res.qOk) parts.push('The wattless current is not right: it is the component of the current at right angles to the voltage.');
        miss(parts.join(' '));
      };
      controls.append(row('Average power', pIn, 'W'), row('Wattless current', qIn, 'A'), actionBtn('Run the circuit', 'Run the circuit', run));
      hint.textContent = `${lvl.v} V rms, ${lvl.i} A rms, the current lags the voltage by ${lvl.phi}°.`;
    }
    if (lvl.kind === 'circuit') {
      const pIn = field('Power dissipated in W', 'P = ? W');
      const fIn = field('Power factor', 'cos φ = ?');
      const run = () => {
        if (finished || busy()) return;
        const p = num(pIn);
        const f = num(fIn);
        if (!positive(p, f)) return freeNote('Enter both answers as positive numbers.');
        const res = judgeCircuit(lvl, p as number, f as number);
        verdict(res.ok);
        if (res.ok) return succeed(`P = ${fmt(lvl.p)} W and cos φ = ${fmt(lvl.pf)}.`);
        const parts: string[] = [];
        if (!res.pOk) parts.push('The power is not right: use the rms current, and only the resistance dissipates power.');
        if (!res.fOk) parts.push('The power factor is not right: it is the ratio of the resistance to the impedance.');
        miss(parts.join(' '));
      };
      controls.append(row('Power', pIn, 'W'), row('Power factor', fIn, ''), actionBtn('Run the circuit', 'Run the circuit', run));
      hint.textContent = `R = ${lvl.r} Ω, X_L = ${lvl.xl} Ω, X_C = ${lvl.xc} Ω, source peak voltage ${lvl.vPeak} V.`;
    }
    if (lvl.kind === 'correct') {
      const cIn = field('Capacitance in µF', 'C = ? µF');
      const iIn = field('Supply current after correction in A', 'I = ? A');
      const run = () => {
        if (finished || busy()) return;
        const c = num(cIn);
        const i = num(iIn);
        if (!positive(c, i)) return freeNote('Enter both answers as positive numbers.');
        const res = judgeCorrect(lvl, c as number, i as number);
        verdict(res.ok);
        if (res.ok) return succeed(`C = ${fmt(lvl.cMicroF)} µF, and the supply current falls to ${fmt(lvl.iNew)} A.`);
        const parts: string[] = [];
        if (!res.cOk) parts.push('The capacitance is not right: the capacitor must draw a current equal to the wattless current of the load, and it leads the voltage by 90°.');
        if (!res.iOk) parts.push('The supply current is not right: after the correction only the power component remains.');
        miss(parts.join(' '));
      };
      controls.append(row('Capacitance', cIn, 'µF'), row('Supply current', iIn, 'A'), actionBtn('Add the capacitor', 'Add the capacitor', run));
      hint.textContent = `Load: R = ${lvl.r} Ω in series with X_L = ${lvl.xl} Ω, on a ${lvl.v} V rms, ${lvl.hz} Hz supply. The capacitor goes in parallel with the load.`;
    }
    if (lvl.kind === 'transformer') {
      const vIn = field('Secondary voltage in V', 'V_s = ? V');
      const iIn = field('Secondary current in A', 'I_s = ? A');
      const opts: [Kind, string, string][] = [['step-up', 'Step-up transformer', 'Step-up'], ['step-down', 'Step-down transformer', 'Step-down']];
      const btns: HTMLElement[] = opts.map(([v, aria, text]) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': aria, 'aria-pressed': 'false', onclick: () => {
          kindPick = v;
          btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        } }, text);
        return b;
      });
      const run = () => {
        if (finished || busy()) return;
        const v = num(vIn);
        const i = num(iIn);
        if (!positive(v, i)) return freeNote('Enter both answers as positive numbers.');
        if (kindPick === null) return freeNote('Choose whether it steps the voltage up or down.');
        const res = judgeTransformer(lvl, v as number, i as number, kindPick);
        verdict(res.ok);
        if (res.ok) return succeed(`V_s = ${fmt(lvl.vs)} V and I_s = ${fmt(lvl.is)} A: a ${lvl.type} transformer.`);
        const parts: string[] = [];
        if (!res.vOk) parts.push('The secondary voltage is not right: it is in the same ratio to the primary voltage as the turns.');
        if (!res.iOk) parts.push('The secondary current is not right: an ideal transformer delivers all the power it takes in.');
        if (!res.tOk) parts.push('Step-up or step-down is not right: compare the two voltages.');
        miss(parts.join(' '));
      };
      controls.append(row('Secondary voltage', vIn, 'V'), row('Secondary current', iIn, 'A'), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Type'), ...btns), actionBtn('Switch on the transformer', 'Switch on the transformer', run));
      hint.textContent = `Primary: ${lvl.np} turns, ${lvl.vp} V, ${lvl.ip} A. Secondary: ${lvl.ns} turns.`;
    }
    if (lvl.kind === 'loss') {
      const aIn = field('Power lost at the low voltage in W', 'loss 1 = ? W');
      const bIn = field('Power lost after stepping up in W', 'loss 2 = ? W');
      const run = () => {
        if (finished || busy()) return;
        const a = num(aIn);
        const b = num(bIn);
        if (!positive(a, b)) return freeNote('Enter both answers as positive numbers.');
        const res = judgeLoss(lvl, a as number, b as number);
        verdict(res.ok);
        if (res.ok) return succeed(`${fmt(lvl.loss1)} W at ${lvl.v1} V, and ${fmt(lvl.loss2)} W after stepping up ${lvl.k} times.`);
        const parts: string[] = [];
        if (!res.aOk) parts.push('The first loss is not right: find the current in the line from the power and the voltage, then the heating I²R.');
        if (!res.bOk) parts.push('The second loss is not right: stepping the voltage up changes the line current, and the loss goes as the square of the current.');
        miss(parts.join(' '));
      };
      controls.append(row('Loss at low voltage', aIn, 'W'), row('Loss after step-up', bIn, 'W'), actionBtn('Send the power', 'Send the power', run));
      hint.textContent = `${lvl.pKw} kW sent along a line of ${lvl.r} Ω, at ${lvl.v1} V, or at ${lvl.v1 * lvl.k} V after a ${lvl.k}× step-up transformer.`;
    }

    // ---- drawing --------------------------------------------------------------------------------------------------------
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const arrow = (x: number, y: number, dx: number, dy: number, color: string, text: string) => {
      const len = Math.hypot(dx, dy);
      if (len < 2) return;
      const ux = dx / len;
      const uy = dy / len;
      g.strokeStyle = color;
      g.fillStyle = color;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + dx, y + dy);
      g.stroke();
      g.beginPath();
      g.moveTo(x + dx + ux * 9, y + dy + uy * 9);
      g.lineTo(x + dx - uy * 5, y + dy + ux * 5);
      g.lineTo(x + dx + uy * 5, y + dy - ux * 5);
      g.fill();
      label(g, text, x + dx / 2 + (dx === 0 ? 40 : 0), y + dy / 2 + (dy === 0 ? 16 : 0), { size: 12, color });
    };
    const f = () => (runT === null ? 0 : ease(Math.min(1, runT / RUN)));
    function drawPhasors(phiDeg: number, name: string) {
      const phi = (phiDeg * Math.PI) / 180;
      const ox = 110;
      const oy = 210;
      arrow(ox, oy, 150, 0, col.accent, 'V');
      arrow(ox, oy, Math.cos(phi) * 150 * (0.5 + 0.5 * f()), Math.sin(phi) * 150 * (0.5 + 0.5 * f()), POS, name);
      g.strokeStyle = col.muted;
      g.setLineDash([4, 4]);
      g.beginPath();
      g.moveTo(ox + Math.cos(phi) * 150 * (0.5 + 0.5 * f()), oy + Math.sin(phi) * 150 * (0.5 + 0.5 * f()));
      g.lineTo(ox + Math.cos(phi) * 150 * (0.5 + 0.5 * f()), oy);
      g.stroke();
      g.setLineDash([]);
      label(g, `φ = ${fmt(phiDeg)}°`, ox + 70, oy - 22, { size: 12, color: col.text });
      label(g, 'I cos φ along V: power. I sin φ across V: wattless.', 330, 40, { size: 12, color: col.muted });
      // a meter for the power, filling to I cos φ
      g.strokeStyle = col.text;
      g.lineWidth = 2;
      g.strokeRect(400, 120, 180, 24);
      g.fillStyle = col.accent;
      g.globalAlpha = 0.8;
      g.fillRect(402, 122, 176 * Math.cos(phi) * f(), 20);
      g.globalAlpha = 1;
      label(g, f() > 0 ? 'power used (fraction of V I)' : 'power meter', 490, 164, { size: 11, color: col.muted });
    }
    function drawTransformer() {
      if (lvl.kind !== 'transformer') return;
      const ratio = lvl.ns / lvl.np;
      g.strokeStyle = col.text;
      g.lineWidth = 12;
      g.strokeRect(200, 80, 240, 160);
      g.strokeStyle = '#b87333';
      g.lineWidth = 4;
      const turnsP = Math.min(10, Math.max(2, Math.round(Math.log2(lvl.np / 25)) + 3));
      const turnsS = Math.min(10, Math.max(2, Math.round(turnsP * ratio)));
      for (let k = 0; k < turnsP; k++) {
        g.beginPath();
        g.ellipse(200, 100 + (k / turnsP) * 120, 14, 6, 0, 0, Math.PI * 2);
        g.stroke();
      }
      for (let k = 0; k < turnsS; k++) {
        g.beginPath();
        g.ellipse(440, 100 + (k / turnsS) * 120, 14, 6, 0, 0, Math.PI * 2);
        g.stroke();
      }
      label(g, `${lvl.np} turns, ${lvl.vp} V`, 110, 160, { size: 12, color: col.text });
      label(g, `${lvl.ns} turns, ${f() > 0 ? fmt(lvl.vs) : '?'} V`, 540, 160, { size: 12, color: col.text });
      for (let k = 0; k < 6; k++) disc(g, 200 + ((clock * 0.5 + k / 6) % 1) * 240, 80, 2.5, col.accent);
    }
    function drawLoss() {
      if (lvl.kind !== 'loss') return;
      const x0 = 80;
      const x1 = 560;
      g.fillStyle = col.panel;
      g.fillRect(40, 130, 40, 60);
      g.fillRect(560, 130, 40, 60);
      label(g, 'station', 60, 210, { size: 11, color: col.muted });
      label(g, 'town', 580, 210, { size: 11, color: col.muted });
      for (const [yy, name, loss] of [[110, `at ${lvl.v1} V`, lvl.loss1], [230, `at ${lvl.v1 * lvl.k} V`, lvl.loss2]] as [number, string, number][]) {
        g.strokeStyle = col.text;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x0, yy);
        g.lineTo(x1, yy);
        g.stroke();
        const heat = Math.min(1, loss / (lvl.pKw * 1000 * 0.2)) * f();
        g.strokeStyle = `rgba(192,57,43,${0.15 + 0.7 * heat})`;
        g.lineWidth = 3 + 7 * heat;
        g.beginPath();
        g.moveTo(x0, yy);
        g.lineTo(x1, yy);
        g.stroke();
        label(g, `${name}: ${f() > 0 ? `loss ${fmt(loss * f())} W` : 'loss ?'}`, 320, yy - 18, { size: 12, color: col.text });
      }
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      if (lvl.kind === 'phase') drawPhasors(-lvl.phi, 'I');
      if (lvl.kind === 'circuit') drawPhasors(-(Math.atan2(lvl.xl - lvl.xc, lvl.r) * 180) / Math.PI, 'I');
      if (lvl.kind === 'correct') drawPhasors(-(Math.atan2(lvl.xl, lvl.r) * 180) / Math.PI, 'I');
      drawTransformer();
      drawLoss();
      verdictLabel(lvl.kind === 'phase' ? `P = ${fmt(lvl.p)} W, I sin φ = ${fmt(lvl.iq)} A` : lvl.kind === 'circuit' ? `P = ${fmt(lvl.p)} W, cos φ = ${fmt(lvl.pf)}` : lvl.kind === 'correct' ? `C = ${fmt(lvl.cMicroF)} µF` : lvl.kind === 'transformer' ? `${lvl.type}: ${fmt(lvl.vs)} V, ${fmt(lvl.is)} A` : `loss ÷ ${lvl.k * lvl.k}`, 320, 326);
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
