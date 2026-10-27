import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeCharge, judgePlate, judgeSlab, starsFor } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const NEG = '#3156d3';
const REVEAL = 0.9;
const RUN = 2.6;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const C = { x: W / 2, y: H / 2 };

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
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A parallel-plate capacitor with a battery, charge on the plates and a dielectric slab.' });
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
    const field = (aria: string, placeholder: string) => h('input', { class: 'field', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': aria, placeholder }) as HTMLInputElement;
    const num = (el: HTMLInputElement) => parseNumber(el.value);
    const actionBtn = (text: string, aria: string, fn: () => void) => h('button', { class: 'btn', type: 'button', 'aria-label': aria, onclick: fn }, text);

    // ---- the levels -------------------------------------------------------------------------------------------
    if (lvl.kind === 'charge') {
      const aria = lvl.mode === 'charge' ? 'Charge on the plates in nC' : 'Voltage across the plates in V';
      const vIn = field(aria, lvl.mode === 'charge' ? 'Q = ? nC' : 'V = ? V');
      const run = () => {
        if (finished) return;
        const v = num(vIn);
        if (v === null || v <= 0) return freeNote(`Enter ${lvl.mode === 'charge' ? 'the charge as a positive number of nC' : 'the voltage as a positive number of volts'}.`);
        const res = judgeCharge(lvl, v);
        verdict(res.ok);
        if (res.ok) return succeed(lvl.mode === 'charge' ? `Q = CV = ${fmt(lvl.q)} nC on the positive plate, and −${fmt(lvl.q)} nC on the other.` : `V = Q/C = ${fmt(lvl.v)} V.`);
        miss(`Your ${lvl.mode === 'charge' ? 'charge' : 'voltage'} is too ${res.verdict === 'too-big' ? 'large' : 'small'}: check the units (pF and nC).`);
      };
      vIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, lvl.mode === 'charge' ? 'Charge' : 'Voltage'), vIn, h('span', { class: 'unit' }, lvl.mode === 'charge' ? 'nC' : 'V')), actionBtn('Check the capacitor', 'Check the capacitor', run));
      hint.textContent = lvl.mode === 'charge' ? `A ${lvl.c} pF capacitor is connected to a ${lvl.v} V battery.` : `A ${lvl.c} pF capacitor carries ${fmt(lvl.q)} nC on its positive plate.`;
    }
    if (lvl.kind === 'plate') {
      const dIn = field('Gap between the plates in mm', 'd = ? mm');
      const cIn = field('Capacitance after halving the gap and adding the dielectric in pF', 'C′ = ? pF');
      const run = () => {
        if (finished) return;
        const d = num(dIn);
        const c2 = num(cIn);
        if (d === null || c2 === null || d <= 0 || c2 <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgePlate(lvl, d, c2);
        verdict(res.ok);
        if (res.ok) return succeed(`d = ${lvl.d} mm, and the new capacitance is ${fmt(lvl.c2)} pF.`);
        const parts: string[] = [];
        if (!res.dOk) parts.push('The gap is not right: C = ε₀A/d, so d = ε₀A/C. Use A in m².');
        if (!res.c2Ok) parts.push('The new capacitance is not right: halving the gap and adding a dielectric both increase C.');
        miss(parts.join(' '));
      };
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, `Order: ${fmt(lvl.c)} pF`), dIn, h('span', { class: 'unit' }, 'mm')), h('div', { class: 'control' }, h('span', { class: 'control-label' }, `Gap ÷ 2, K = ${lvl.k}`), cIn, h('span', { class: 'unit' }, 'pF')), actionBtn('Check the plates', 'Check the plates', run));
      hint.textContent = `Plate area A = ${fmt(lvl.a)} m², air gap to be found. ε₀ = 8.854 × 10⁻¹² C²/(N m²).`;
    }
    if (lvl.kind === 'slab') {
      const vIn = field('Potential difference after the slab in V', 'V′ = ? V');
      const qIn = field('Charge on the plates after the slab in nC', 'Q′ = ? nC');
      const run = () => {
        if (finished || runT !== null) return;
        const v = num(vIn);
        const q = num(qIn);
        if (v === null || q === null || v <= 0 || q <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeSlab(lvl, v, q);
        verdict(res.ok);
        if (res.ok) return succeed(`V′ = ${fmt(lvl.v1)} V and Q′ = ${fmt(lvl.q1)} nC.`);
        const parts: string[] = [];
        if (!res.vOk) parts.push('The potential difference is not right.');
        if (!res.qOk) parts.push('The charge is not right.');
        miss(parts.join(' ') + (lvl.connected ? ' The battery holds V fixed.' : ' The disconnected capacitor cannot lose or gain charge.'));
      };
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Potential difference'), vIn, h('span', { class: 'unit' }, 'V')), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Charge'), qIn, h('span', { class: 'unit' }, 'nC')), actionBtn('Slide in the slab', 'Slide in the slab', run));
      hint.textContent = `Before: C = ${lvl.c0} pF at ${lvl.v0} V (Q = ${fmt(lvl.q0)} nC). The slab has dielectric constant K = ${lvl.k}. The battery is ${lvl.connected ? 'still connected' : 'disconnected'}.`;
    }

    // ---- drawing --------------------------------------------------------------------------------------------------------
    function plates(x: number, gap: number, width: number, qFill: number, slab = 0) {
      const y1 = C.y - gap / 2;
      const y2 = C.y + gap / 2;
      g.fillStyle = col.line;
      g.fillRect(x - width / 2, y1 - 8, width, 8);
      g.fillRect(x - width / 2, y2, width, 8);
      if (slab > 0) {
        g.fillStyle = col.accent;
        g.globalAlpha = 0.28;
        g.fillRect(x - width / 2, y1, width * slab, gap);
        g.globalAlpha = 1;
        g.strokeStyle = col.accent;
        g.lineWidth = 2;
        g.strokeRect(x - width / 2, y1, width * slab, gap);
      }
      // charge on the plates
      const n = Math.max(0, Math.round(qFill * 14));
      for (let i = 0; i < n; i++) {
        const px = x - width / 2 + 10 + ((i + 0.5) / 14) * (width - 20);
        disc(g, px, y1 - 14, 4.5, POS);
        disc(g, px, y2 + 22, 4.5, NEG);
      }
      // field between the plates
      g.strokeStyle = col.accent;
      g.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        const px = x - width / 2 + 16 + (i / 6) * (width - 32);
        const t = ((clock * 0.4 + i / 7) % 1 + 1) % 1;
        g.globalAlpha = 0.7 * Math.sin(t * Math.PI) * Math.min(1, qFill + 0.2);
        g.beginPath();
        g.moveTo(px, y1 + gap * t * 0.8);
        g.lineTo(px, y1 + gap * Math.min(1, t * 0.8 + 0.15));
        g.stroke();
      }
      g.globalAlpha = 1;
    }
    function battery(x: number, connected = true) {
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x - 16, C.y - 14);
      g.lineTo(x + 16, C.y - 14);
      g.stroke();
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(x - 9, C.y + 6);
      g.lineTo(x + 9, C.y + 6);
      g.stroke();
      label(g, '+', x + 28, C.y - 8, { size: 14, color: POS });
      label(g, '−', x + 28, C.y + 14, { size: 14, color: NEG });
      label(g, connected ? 'battery' : 'disconnected', x, C.y + 40, { size: 11, bold: false, color: col.muted });
    }
    function wires(xb: number, xp: number, gap: number, connected: boolean, flow: number) {
      const y1 = C.y - gap / 2 - 8;
      const y2 = C.y + gap / 2 + 8;
      g.strokeStyle = col.muted;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(xb, C.y - 14);
      g.lineTo(xb, y1 - 34);
      g.lineTo(xp, y1 - 34);
      g.lineTo(xp, y1);
      g.moveTo(xb, C.y + 6);
      g.lineTo(xb, y2 + 36);
      g.lineTo(xp, y2 + 36);
      g.lineTo(xp, y2);
      if (!connected) {
        g.stroke();
        g.fillStyle = col.panel;
        g.fillRect(xb - 8, y1 - 40, 16, 12);
        label(g, '×', xb, y1 - 28, { size: 16, color: col.bad });
        return;
      }
      g.stroke();
      g.fillStyle = POS;
      for (let i = 0; i < 6; i++) {
        const t = ((clock * 0.6 * flow + i / 6) % 1 + 1) % 1;
        g.globalAlpha = 0.8;
        g.beginPath();
        g.arc(xb + (xp - xb) * t, y1 - 34, 3, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }
    function drawCharge() {
      if (lvl.kind !== 'charge') return;
      const run = runT === null ? 0.25 : Math.min(1, 0.25 + ease(Math.min(1, runT / RUN)) * 0.75);
      battery(160);
      wires(160, 380, 90, true, runT !== null && runT < RUN ? 1 : 0.2);
      plates(380, 90, 200, run);
      label(g, `${lvl.c} pF`, 380, C.y + 100, { size: 14, color: col.text });
      if (verdictAt !== null && verdictOk) label(g, lvl.mode === 'charge' ? `Q = ${fmt(lvl.q)} nC` : `V = ${fmt(lvl.v)} V`, 380, 36, { size: 15, color: col.good });
    }
    function drawPlate() {
      if (lvl.kind !== 'plate') return;
      const f = runT === null ? 0 : ease(Math.min(1, runT / RUN));
      const gap0 = lvl.d * 18;
      const gap = gap0 - (gap0 / 2) * f;
      plates(C.x, gap, 280, 0.5, f);
      label(g, `d = ${lvl.d} mm`, C.x, C.y - gap0 / 2 - 34, { size: 13, color: col.muted });
      label(g, `A = ${fmt(lvl.a)} m²`, C.x, C.y + gap0 / 2 + 60, { size: 13, color: col.muted });
      if (f > 0.05) label(g, `gap ÷ 2, dielectric K = ${lvl.k}`, C.x, 28, { size: 14, color: col.accent });
    }
    function drawSlab() {
      if (lvl.kind !== 'slab') return;
      const f = runT === null ? 0 : ease(Math.min(1, runT / RUN));
      const gap = 100;
      battery(130, lvl.connected);
      wires(130, 340, gap, lvl.connected, 0.4 + f);
      const q0 = 0.4;
      const q1 = lvl.connected ? Math.min(1, q0 * (1 + f * (lvl.k - 1) * 0.35)) : q0;
      plates(340, gap, 230, q1, f);
      label(g, `K = ${lvl.k}`, 340 + 115 * f, C.y - gap / 2 - 22, { size: 13, color: col.accent });
      label(g, lvl.connected ? 'battery connected: V fixed' : 'disconnected: Q fixed', C.x, H - 14, { size: 13, color: col.muted });
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawCharge();
      drawPlate();
      drawSlab();
      if (verdictAt !== null && clock - verdictAt < REVEAL) {
        g.strokeStyle = verdictOk ? col.good : col.bad;
        g.lineWidth = 6;
        g.globalAlpha = 1 - (clock - verdictAt) / REVEAL;
        g.strokeRect(3, 3, W - 6, H - 6);
        g.globalAlpha = 1;
      }
      const busy = runT !== null && runT < RUN;
      const phase = verdictAt === null ? 'idle' : busy || clock - verdictAt < REVEAL ? 'testing' : 'done';
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
