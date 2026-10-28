import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeConcentric, judgeDensity, judgeMutual, judgeSelf, judgeSolenoid, starsFor } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const REVEAL = 0.9;
const RUN = 3.2;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const CX = 320;
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

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'Coils and solenoids with a changing current, field lines, and a meter for the induced emf or stored energy.' });
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
    if (lvl.kind === 'self') {
      const isL = lvl.mode === 'L';
      const aIn = field(isL ? 'Self-inductance in H' : 'Induced emf in V', isL ? 'L = ? H' : 'ε = ? V');
      const run = () => {
        if (finished || busy()) return;
        const a = num(aIn);
        if (!positive(a)) return freeNote('Enter a positive number.');
        const ok = judgeSelf(lvl, a as number).ok;
        verdict(ok);
        if (ok) return succeed(isL ? `L = ${fmt(lvl.l)} H.` : `ε = ${fmt(lvl.emf)} V.`);
        miss(isL ? 'That is not the self-inductance: the emf is L times the rate of change of the current.' : 'That is not the emf: it is L times the rate of change of the current, ΔI/Δt.');
      };
      controls.append(row(isL ? 'Self-inductance' : 'Induced emf', aIn, isL ? 'H' : 'V'), actionBtn('Change the current', 'Change the current', run));
      hint.textContent = isL ? `The current changes by ${lvl.dI} A in ${lvl.dt} s and the average emf is ${fmt(lvl.emf)} V.` : `L = ${lvl.l} H. The current changes by ${lvl.dI} A in ${lvl.dt} s.`;
    }
    if (lvl.kind === 'mutual') {
      const lIn = field('Change in flux linkage in Wb', 'Δ(NΦ) = ? Wb');
      const eIn = field('Average emf in V', 'ε = ? V');
      const run = () => {
        if (finished || busy()) return;
        const a = num(lIn);
        const e = num(eIn);
        if (!positive(a, e)) return freeNote('Enter both answers as positive numbers.');
        const res = judgeMutual(lvl, a as number, e as number);
        verdict(res.ok);
        if (res.ok) return succeed(`Δ(NΦ) = ${fmt(lvl.linkage)} Wb and ε = ${fmt(lvl.emf)} V.`);
        const parts: string[] = [];
        if (!res.lOk) parts.push('The flux linkage change is not right: the flux linkage of the second coil is M times the current in the first.');
        if (!res.eOk) parts.push('The emf is not right: it is the change in flux linkage divided by the time it takes.');
        miss(parts.join(' '));
      };
      controls.append(row('Flux linkage change', lIn, 'Wb'), row('Average emf', eIn, 'V'), actionBtn('Change the current', 'Change the current', run));
      hint.textContent = `Mutual inductance ${lvl.m} H. The current in the first coil changes by ${lvl.dI} A in ${lvl.dt} s.`;
    }
    if (lvl.kind === 'solenoid') {
      const lIn = field('Self-inductance in mH', 'L = ? mH');
      const uIn = field('Stored energy in mJ', 'U = ? mJ');
      const run = () => {
        if (finished || busy()) return;
        const a = num(lIn);
        const u = num(uIn);
        if (!positive(a, u)) return freeNote('Enter both answers as positive numbers.');
        const res = judgeSolenoid(lvl, a as number, u as number);
        verdict(res.ok);
        if (res.ok) return succeed(`L = ${fmt(lvl.mH)} mH and U = ${fmt(lvl.mJ)} mJ.`);
        const parts: string[] = [];
        if (!res.lOk) parts.push('The inductance is not right: it is μ₀N²A/l, with the area and length in SI units. Give it in mH.');
        if (!res.uOk) parts.push('The energy is not right: the energy stored in an inductor is a half of L times the square of the current.');
        miss(parts.join(' '));
      };
      controls.append(row('Self-inductance', lIn, 'mH'), row('Stored energy', uIn, 'mJ'), actionBtn('Switch on the current', 'Switch on the current', run));
      hint.textContent = `${lvl.n} turns, cross-section ${lvl.aCm2} cm², length ${lvl.lCm} cm, carrying ${lvl.i} A.`;
    }
    if (lvl.kind === 'concentric') {
      const mIn = field('Mutual inductance in nH', 'M = ? nH');
      const run = () => {
        if (finished || busy()) return;
        const a = num(mIn);
        if (!positive(a)) return freeNote('Enter the mutual inductance as a positive number of nH.');
        const ok = judgeConcentric(lvl, a as number).ok;
        verdict(ok);
        if (ok) return succeed(`M = ${fmt(lvl.nH)} nH.`);
        miss('That is not the mutual inductance: find the field at the centre of the large coil per unit current, then the flux linkage of the small coil. The small coil sees a uniform field.');
      };
      controls.append(row('Mutual inductance', mIn, 'nH'), actionBtn('Measure the pair', 'Measure the pair', run));
      hint.textContent = `Small coil: ${lvl.n1} turns, radius ${lvl.r1} cm. Large coil: ${lvl.n2} turns, radius ${lvl.r2} cm.`;
    }
    if (lvl.kind === 'density') {
      const uIn = field('Energy density in J/m³', 'u = ? J/m³');
      const eIn = field('Energy in the volume in mJ', 'U = ? mJ');
      const run = () => {
        if (finished || busy()) return;
        const u = num(uIn);
        const e = num(eIn);
        if (!positive(u, e)) return freeNote('Enter both answers as positive numbers.');
        const res = judgeDensity(lvl, u as number, e as number);
        verdict(res.ok);
        if (res.ok) return succeed(`u = ${fmt(lvl.u)} J/m³ and U = ${fmt(lvl.mJ)} mJ.`);
        const parts: string[] = [];
        if (!res.uOk) parts.push('The energy density is not right: it depends on the square of B and on μ₀.');
        if (!res.eOk) parts.push('The energy is not right: it is the density times the volume in cubic metres. Give it in mJ.');
        miss(parts.join(' '));
      };
      controls.append(row('Energy density', uIn, 'J/m³'), row('Energy in the volume', eIn, 'mJ'), actionBtn('Measure the field', 'Measure the field', run));
      hint.textContent = `Uniform field ${lvl.b} T filling a volume of ${lvl.volCm3} cm³.`;
    }

    // ---- drawing helpers -------------------------------------------------------------------------------------------------
    const coilDraw = (x: number, y: number, w: number, hh: number, turns: number, color = '#b87333') => {
      g.strokeStyle = color;
      g.lineWidth = 3;
      for (let k = 0; k < turns; k++) {
        g.beginPath();
        g.ellipse(x - w / 2 + ((k + 0.5) / turns) * w, y, 6, hh / 2, 0, 0, Math.PI * 2);
        g.stroke();
      }
    };
    const bar = (x: number, y: number, w: number, frac: number, color: string, text: string) => {
      g.strokeStyle = col.text;
      g.lineWidth = 2;
      g.strokeRect(x - w / 2, y - 12, w, 24);
      g.fillStyle = color;
      g.globalAlpha = 0.8;
      g.fillRect(x - w / 2, y - 10, Math.max(0, Math.min(1, frac)) * w, 20);
      g.globalAlpha = 1;
      label(g, text, x, y + 28, { size: 12, color: col.text });
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const runF = () => (runT === null ? 0 : ease(Math.min(1, runT / RUN)));
    const flow = (x0: number, x1: number, y: number, speed: number, n = 8) => {
      for (let k = 0; k < n; k++) disc(g, x0 + (x1 - x0) * ((((clock * speed + k / n) % 1) + 1) % 1), y, 2.6, POS);
    };

    function drawSelf() {
      if (lvl.kind !== 'self') return;
      const f = runF();
      coilDraw(CX, 120, 200, 60, 10);
      flow(120, 520, 70, 0.1 + (1 - f * 0.9) * 0.4, 12);
      const cur = lvl.dI * (1 - f * 0.0);
      bar(CX, 230, 260, f > 0 && f < 1 ? 0.7 : 0.05, POS, f > 0 && f < 1 ? `emf ε = L ΔI/Δt while I changes (ΔI = ${cur} A in ${lvl.dt} s)` : 'no emf while I is steady');
      verdictLabel(lvl.mode === 'L' ? `L = ${fmt(lvl.l)} H` : `ε = ${fmt(lvl.emf)} V`, CX, 30);
    }
    function drawMutual() {
      if (lvl.kind !== 'mutual') return;
      const f = runF();
      coilDraw(200, 120, 120, 80, 8);
      coilDraw(440, 120, 120, 80, 8, col.accent);
      for (let k = 0; k < 6; k++) {
        const t = (((clock * 0.3 + k / 6) % 1) + 1) % 1;
        g.globalAlpha = 0.4;
        disc(g, 260 + t * 120, 96 + (k % 3) * 24, 2.6, col.accent);
        g.globalAlpha = 1;
      }
      label(g, `I₁ changes by ${lvl.dI} A`, 200, 190, { size: 12, color: col.text });
      label(g, 'second coil', 440, 190, { size: 12, color: col.text });
      bar(CX, 250, 260, f > 0 && f < 1 ? 0.7 : 0.05, POS, f > 0 && f < 1 ? 'emf in the second coil' : 'no emf while I₁ is steady');
      verdictLabel(`Δ(NΦ) = ${fmt(lvl.linkage)} Wb, ε = ${fmt(lvl.emf)} V`, CX, 30);
    }
    function drawSolenoid() {
      if (lvl.kind !== 'solenoid') return;
      const f = runF();
      coilDraw(CX, 120, 300, 80, 16);
      const lines = Math.round(2 + f * 4);
      for (let k = 0; k < lines; k++) {
        const y = 120 - 30 + (k / Math.max(1, lines - 1)) * 60;
        const t = (((clock * 0.4 + k * 0.1) % 1) + 1) % 1;
        g.globalAlpha = 0.6;
        disc(g, 190 + t * 260, y, 2.8, col.accent);
        g.globalAlpha = 1;
      }
      bar(CX, 240, 280, f, col.accent, runT === null ? 'energy stored: 0' : `energy stored ${fmt(lvl.mJ * f)} mJ`);
      verdictLabel(`L = ${fmt(lvl.mH)} mH, U = ${fmt(lvl.mJ)} mJ`, CX, 30);
    }
    function drawConcentric() {
      if (lvl.kind !== 'concentric') return;
      const f = runF();
      const R = 50 + lvl.r2 * 2;
      const r = Math.max(8, Math.min(40, lvl.r1 * 6));
      g.strokeStyle = '#b87333';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(CX, CY, R, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = col.accent;
      g.lineWidth = 4;
      g.beginPath();
      g.arc(CX, CY, r, 0, Math.PI * 2);
      g.stroke();
      for (let k = 0; k < 14; k++) {
        const a = clock * 1.4 + (k / 14) * Math.PI * 2;
        disc(g, CX + Math.cos(a) * R, CY + Math.sin(a) * R, 2.6, POS);
      }
      label(g, `${lvl.n2} turns, ${lvl.r2} cm`, CX, CY - R - 14, { size: 12, color: col.text });
      label(g, `${lvl.n1} turns, ${lvl.r1} cm`, CX, CY + 2, { size: 11, color: col.text });
      label(g, f > 0 ? `M = ${fmt(lvl.nH * f)} nH` : 'M = ?', CX, CY + R + 22, { size: 13, color: col.text });
      verdictLabel(`M = μ₀N₁N₂πr₁²/2r₂ = ${fmt(lvl.nH)} nH`, CX, 30);
    }
    function drawDensity() {
      if (lvl.kind !== 'density') return;
      const f = runF();
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      g.strokeRect(220, 60, 200, 150);
      g.fillStyle = col.accent;
      g.globalAlpha = 0.12 + 0.3 * f;
      g.fillRect(220, 60, 200, 150);
      g.globalAlpha = 1;
      for (let x = 250; x < 420; x += 50) for (let y = 90; y < 210; y += 40) {
        const t = (((clock * 0.3 + x * 0.003) % 1) + 1) % 1;
        g.strokeStyle = col.accent;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x - 12 + t * 6, y);
        g.lineTo(x + 12 + t * 6, y);
        g.stroke();
      }
      label(g, `B = ${lvl.b} T, ${lvl.volCm3} cm³`, 320, 232, { size: 13, color: col.text });
      bar(CX, 280, 260, f, col.accent, f > 0 ? `energy ${fmt(lvl.mJ * f)} mJ` : 'energy: ?');
      verdictLabel(`u = ${fmt(lvl.u)} J/m³`, CX, 30);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawSelf();
      drawMutual();
      drawSolenoid();
      drawConcentric();
      drawDensity();
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
