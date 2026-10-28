import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeAc, judgeCharge, judgeDisplacement, starsFor, type Rule } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const NEG = '#3156d3';
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
    let rulePick: Rule | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A capacitor being charged, with current in the wires and a changing electric field, the displacement current, between the plates.' });
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
    if (lvl.kind === 'charge') {
      const cIn = field('Capacitance in pF', 'C = ? pF');
      const rIn = field('Rate of change of the potential difference in V/s', 'dV/dt = ? V/s');
      const run = () => {
        if (finished || busy()) return;
        const c = num(cIn);
        const r = num(rIn);
        if (!positive(c, r)) return freeNote('Enter both answers as positive numbers.');
        const res = judgeCharge(lvl, c as number, r as number);
        verdict(res.ok);
        if (res.ok) return succeed(`C = ${fmt(lvl.cPF)} pF and dV/dt = ${fmt(lvl.rate)} V/s.`);
        const parts: string[] = [];
        if (!res.cOk) parts.push('The capacitance is not right: C = ε₀A/d, with the plate area from the radius and everything in metres.');
        if (!res.rOk) parts.push('The rate is not right: the charging current is C times the rate of change of the voltage.');
        miss(parts.join(' '));
      };
      controls.append(row('Capacitance', cIn, 'pF'), row('Rate of change of V', rIn, 'V/s'), actionBtn('Charge the capacitor', 'Charge the capacitor', run));
      hint.textContent = `Plates of radius ${lvl.rCm} cm, ${lvl.dCm} cm apart, charged by a steady ${lvl.i} A. ε₀ = 8.854 × 10⁻¹² C²/(N m²).`;
    }
    if (lvl.kind === 'displacement') {
      const iIn = field('Displacement current in A', 'I_d = ? A');
      const opts: [Rule, string, string][] = [['holds', 'The junction rule holds with the displacement current', 'Holds'], ['fails', 'The junction rule fails at the plate', 'Fails']];
      const btns: HTMLElement[] = opts.map(([v, aria, text]) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': aria, 'aria-pressed': 'false', onclick: () => {
          rulePick = v;
          btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        } }, text);
        return b;
      });
      const run = () => {
        if (finished || busy()) return;
        const i = num(iIn);
        if (!positive(i)) return freeNote('Enter the current as a positive number of amperes.');
        if (rulePick === null) return freeNote('Choose whether the junction rule holds.');
        const res = judgeDisplacement(lvl, i as number, rulePick);
        verdict(res.ok);
        if (res.ok) return succeed(`I_d = ${fmt(lvl.id)} A, and the junction rule holds.`);
        const parts: string[] = [];
        if (!res.iOk) parts.push('The displacement current is not right: it is ε₀ times the rate of change of the electric flux, ε₀ A dE/dt, with A in m².');
        if (!res.rOk) parts.push('Think again about the rule: what carries the current across the gap?');
        miss(parts.join(' '));
      };
      controls.append(row('Displacement current', iIn, 'A'), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Junction rule'), ...btns), actionBtn('Check the gap', 'Check the gap', run));
      hint.textContent = `Plate area ${lvl.aCm2} cm², the field between the plates changes at ${fmt(lvl.dEdt)} V/(m s).`;
    }
    if (lvl.kind === 'ac') {
      const iIn = field('Rms conduction current in µA', 'I = ? µA');
      const bIn = field('Amplitude of the magnetic field in pT', 'B₀ = ? pT');
      const run = () => {
        if (finished || busy()) return;
        const i = num(iIn);
        const b = num(bIn);
        if (!positive(i, b)) return freeNote('Enter both answers as positive numbers.');
        const res = judgeAc(lvl, i as number, b as number);
        verdict(res.ok);
        if (res.ok) return succeed(`I = ${fmt(lvl.iRmsMicro)} µA and B₀ = ${fmt(lvl.bPico)} pT.`);
        const parts: string[] = [];
        if (!res.iOk) parts.push('The current is not right: the capacitor has a reactance 1/ωC, so I = V ω C. Give it in µA.');
        if (!res.bOk) parts.push('The field is not right: use the peak value of the displacement current, and the fraction of it that passes inside the circle through the point. Give it in pT.');
        miss(parts.join(' '));
      };
      controls.append(row('Rms current', iIn, 'µA'), row('Field amplitude', bIn, 'pT'), actionBtn('Switch on the supply', 'Switch on the supply', run));
      hint.textContent = `Plates of radius ${lvl.rCm} cm, C = ${lvl.cPF} pF, ${lvl.v} V rms at ${lvl.omega} rad/s. The point is ${lvl.rCmField} cm from the axis, between the plates.`;
    }

    // ---- drawing --------------------------------------------------------------------------------------------------------
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    function drawCapacitor() {
      const f = runT === null ? 0 : ease(Math.min(1, runT / RUN));
      const cx = 320;
      const y1 = 130;
      const y2 = 210;
      // the plates and wires
      g.strokeStyle = col.text;
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(cx - 90, y1);
      g.lineTo(cx + 90, y1);
      g.moveTo(cx - 90, y2);
      g.lineTo(cx + 90, y2);
      g.stroke();
      g.strokeStyle = col.muted;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(cx, y1);
      g.lineTo(cx, 60);
      g.lineTo(100, 60);
      g.lineTo(100, 280);
      g.lineTo(cx, 280);
      g.lineTo(cx, y2);
      g.stroke();
      // conduction current in the wires: dots
      for (let k = 0; k < 10; k++) {
        const t = (((clock * 0.3 + k / 10) % 1) + 1) % 1;
        const total = 100 + 220 + 220 + 100;
        const d = t * total;
        let x = 0;
        let y = 0;
        if (d < 270 - 100) {
          x = cx - d;
          y = 60;
        } else if (d < 270 - 100 + 220) {
          x = 100;
          y = 60 + (d - 170);
        } else {
          x = 100 + (d - 390);
          y = 280;
        }
        disc(g, x, y, 3, POS);
      }
      // plate charges grow with time
      const n = 3 + Math.round(f * 5);
      for (let k = 0; k < n; k++) {
        const x = cx - 70 + (k / Math.max(1, n - 1)) * 140;
        disc(g, x, y1 - 12, 4, POS);
        disc(g, x, y2 + 12, 4, NEG);
      }
      // the field between the plates, drifting and getting denser: the displacement current
      for (let k = 0; k < 7; k++) {
        const x = cx - 75 + (k / 6) * 150;
        const t = (((clock * 0.5 + k * 0.1) % 1) + 1) % 1;
        g.strokeStyle = col.accent;
        g.lineWidth = 2;
        g.globalAlpha = 0.4 + 0.5 * Math.min(1, 0.3 + f);
        g.beginPath();
        g.moveTo(x, y1 + 6 + t * 50);
        g.lineTo(x, y1 + 26 + t * 50);
        g.stroke();
        g.globalAlpha = 1;
      }
      label(g, 'changing E between the plates: displacement current', cx, 172, { size: 11, color: col.accent });
      label(g, 'conduction current', 100, 300, { size: 11, color: col.muted });
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawCapacitor();
      verdictLabel(lvl.kind === 'charge' ? `C = ${fmt(lvl.cPF)} pF, dV/dt = ${fmt(lvl.rate)} V/s` : lvl.kind === 'displacement' ? `I_d = ${fmt(lvl.id)} A` : `I = ${fmt(lvl.iRmsMicro)} µA, B₀ = ${fmt(lvl.bPico)} pT`, 320, 326);
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
