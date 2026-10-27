import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeEnergy, judgeMixed, judgeParallel, judgeSeries, judgeShare, parallelCharges, seriesVoltages, starsFor, type Double, type Where } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const NEG = '#3156d3';
const REVEAL = 0.9;
const RUN = 2.8;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
type Pt = [number, number];

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
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A circuit of capacitors and a battery, with charge flowing round the wires.' });
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
    const row = (name: string, input: HTMLElement, unit: string) => h('div', { class: 'control' }, h('span', { class: 'control-label' }, name), input, h('span', { class: 'unit' }, unit));
    const choiceGroup = <T extends string>(name: string, options: [T, string][], onPick: (v: T) => void) => {
      const btns: HTMLElement[] = options.map(([value, text]) => {
        const b = h('button', {
          class: 'btn btn-ghost',
          type: 'button',
          'aria-label': text,
          'aria-pressed': 'false',
          onclick: () => {
            btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
            onPick(value);
          },
        }, text);
        return b;
      });
      return h('div', { class: 'control' }, h('span', { class: 'control-label' }, name), ...btns);
    };

    // ---- the levels -------------------------------------------------------------------------------------------
    if (lvl.kind === 'series') {
      const cIn = field('Capacitance of the chain in pF', 'C = ? pF');
      const vIn = field('Voltage across the ringed capacitor in V', 'V = ? V');
      const run = () => {
        if (finished || (runT !== null && runT < RUN)) return;
        const c = num(cIn);
        const v = num(vIn);
        if (c === null || v === null || c <= 0 || v <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeSeries(lvl, c, v);
        verdict(res.ok);
        if (res.ok) return succeed(`The chain is ${fmt(lvl.ceq)} pF, and the ringed capacitor has ${fmt(lvl.vTarget)} V across it.`);
        const parts: string[] = [];
        if (!res.ceqOk) parts.push('The capacitance of the chain is not right: capacitors in series share one charge, so think about how their reciprocals combine.');
        if (!res.vOk) parts.push('The voltage across the ringed capacitor is not right: the same charge sits on each capacitor, and the battery voltage is split between them.');
        miss(parts.join(' '));
      };
      controls.append(row('Chain', cIn, 'pF'), row('Ringed capacitor', vIn, 'V'), actionBtn('Check the chain', 'Check the chain', run));
      hint.textContent = `Capacitors: ${lvl.cs.join(' pF, ')} pF in series, across a ${lvl.v} V battery. The ringed one is capacitor ${lvl.target + 1} (${lvl.cs[lvl.target]} pF).`;
    }
    if (lvl.kind === 'parallel') {
      const cIn = field('Capacitance of the combination in pF', 'C = ? pF');
      const qIn = field('Charge on the ringed capacitor in nC', 'Q = ? nC');
      const run = () => {
        if (finished || (runT !== null && runT < RUN)) return;
        const c = num(cIn);
        const q = num(qIn);
        if (c === null || q === null || c <= 0 || q <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeParallel(lvl, c, q);
        verdict(res.ok);
        if (res.ok) return succeed(`The combination is ${fmt(lvl.ceq)} pF, and the ringed capacitor holds ${fmt(lvl.qTarget)} nC.`);
        const parts: string[] = [];
        if (!res.ceqOk) parts.push('The capacitance of the combination is not right: side by side, the plate areas effectively add.');
        if (!res.qOk) parts.push('The charge is not right: ask what voltage the ringed capacitor has, and use Q = CV for that capacitor alone, in nC.');
        miss(parts.join(' '));
      };
      controls.append(row('Combination', cIn, 'pF'), row('Ringed capacitor', qIn, 'nC'), actionBtn('Check the combination', 'Check the combination', run));
      hint.textContent = `Capacitors: ${lvl.cs.join(' pF, ')} pF in parallel, across a ${lvl.v} V battery. The ringed one is capacitor ${lvl.target + 1} (${lvl.cs[lvl.target]} pF).`;
    }
    if (lvl.kind === 'mixed') {
      const cIn = field('Capacitance of the network in pF', 'C = ? pF');
      const qIn = field('Total charge supplied in nC', 'Q = ? nC');
      const run = () => {
        if (finished || (runT !== null && runT < RUN)) return;
        const c = num(cIn);
        const q = num(qIn);
        if (c === null || q === null || c <= 0 || q <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeMixed(lvl, c, q);
        verdict(res.ok);
        if (res.ok) return succeed(`The network is ${fmt(lvl.ceq)} pF and the battery supplies ${fmt(lvl.q)} nC.`);
        const parts: string[] = [];
        if (!res.ceqOk) parts.push('The capacitance of the network is not right: reduce one group first, then combine the result with the rest.');
        if (!res.qOk) parts.push('The total charge is not right: the battery sees one equivalent capacitor, so use its capacitance.');
        miss(parts.join(' '));
      };
      controls.append(row('Network', cIn, 'pF'), row('Total charge', qIn, 'nC'), actionBtn('Check the network', 'Check the network', run));
      hint.textContent = `C₁ = ${lvl.c1} pF, C₂ = ${lvl.c2} pF, C₃ = ${lvl.c3} pF, battery ${lvl.v} V.`;
    }
    if (lvl.kind === 'energy') {
      let dbl: Double | null = null;
      const uIn = field('Energy stored in nJ', 'U = ? nJ');
      const run = () => {
        if (finished || (runT !== null && runT < RUN)) return;
        const u = num(uIn);
        if (u === null || u <= 0) return freeNote('Enter the energy as a positive number of nJ.');
        if (dbl === null) return freeNote('Choose what happens to the energy when the voltage is doubled.');
        const res = judgeEnergy(lvl, u, dbl);
        verdict(res.ok);
        if (res.ok) return succeed(`U = ${fmt(lvl.u)} nJ, and doubling the voltage multiplies it by 4.`);
        const parts: string[] = [];
        if (!res.uOk) parts.push('The energy is not right: check the formula for the energy stored and the units (pF and volts give nJ after dividing by 1000).');
        if (!res.dblOk) parts.push('Think again about how the energy depends on the voltage.');
        miss(parts.join(' '));
      };
      controls.append(
        row('Energy stored', uIn, 'nJ'),
        choiceGroup<Double>('Voltage doubled', [['x2', 'Energy ×2'], ['x4', 'Energy ×4'], ['x8', 'Energy ×8']], (v) => (dbl = v)),
        actionBtn('Check the energy', 'Check the energy', run),
      );
      hint.textContent = `A ${lvl.c} pF capacitor is charged by a ${lvl.v} V battery.`;
    }
    if (lvl.kind === 'share') {
      let where: Where | null = null;
      const vIn = field('Common voltage in V', 'V′ = ? V');
      const eIn = field('Energy lost in µJ', 'ΔU = ? µJ');
      const run = () => {
        if (finished || (runT !== null && runT < RUN)) return;
        const v = num(vIn);
        const e = num(eIn);
        if (v === null || e === null || v <= 0 || e <= 0) return freeNote('Enter both answers as positive numbers.');
        if (where === null) return freeNote('Choose where the lost energy went.');
        const res = judgeShare(lvl, v, e, where);
        verdict(res.ok);
        if (res.ok) return succeed(`V′ = ${fmt(lvl.v2)} V, and ${fmt(lvl.lost)} µJ is dissipated.`);
        const parts: string[] = [];
        if (!res.vOk) parts.push('The common voltage is not right: charge is conserved when it spreads, so think about the total charge and the total capacitance.');
        if (!res.lostOk) parts.push('The energy lost is not right: compare the energy stored before and after, in µJ.');
        if (!res.whereOk) parts.push('Think about what happens to charge that flows through connecting wires that have some resistance.');
        miss(parts.join(' '));
      };
      controls.append(
        row('Common voltage', vIn, 'V'),
        row('Energy lost', eIn, 'µJ'),
        choiceGroup<Where>('Where did it go?', [['heat', 'Dissipated as heat and radiation'], ['wires', 'Stored in the wires'], ['vanished', 'Destroyed, it just vanishes']], (v) => (where = v)),
        actionBtn('Close the switch', 'Close the switch', run),
      );
      hint.textContent = `C₁ = ${lvl.c1} pF charged to ${lvl.v} V, C₂ = ${lvl.c2} pF uncharged.`;
    }

    // ---- drawing helpers -------------------------------------------------------------------------------------------------
    const wire = (...pts: Pt[]) => {
      g.strokeStyle = col.muted;
      g.lineWidth = 2;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    };
    /** Specks drifting along a polyline (charge flowing). */
    const flowAlong = (pts: Pt[], speed: number, n = 14) => {
      const lens: number[] = [];
      let total = 0;
      for (let i = 1; i < pts.length; i++) {
        const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        lens.push(l);
        total += l;
      }
      g.fillStyle = POS;
      g.globalAlpha = 0.85;
      for (let k = 0; k < n; k++) {
        let d = ((((clock * speed + k / n) % 1) + 1) % 1) * total;
        let i = 0;
        while (i < lens.length - 1 && d > lens[i]) d -= lens[i++];
        const t = d / lens[i];
        g.beginPath();
        g.arc(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t, 3, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    };
    const battery = (x: number, y: number) => {
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x - 16, y - 8);
      g.lineTo(x + 16, y - 8);
      g.stroke();
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(x - 9, y + 8);
      g.lineTo(x + 9, y + 8);
      g.stroke();
      label(g, '+', x + 28, y - 8, { size: 14, color: POS });
      label(g, '−', x + 28, y + 14, { size: 14, color: NEG });
    };
    /** A capacitor symbol: two plates; vertical=true means the wire runs top to bottom. */
    const cap = (x: number, y: number, vertical: boolean, text: string, ringed: boolean, fill = 1) => {
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      g.beginPath();
      if (vertical) {
        g.moveTo(x - 18, y - 6);
        g.lineTo(x + 18, y - 6);
        g.moveTo(x - 18, y + 6);
        g.lineTo(x + 18, y + 6);
      } else {
        g.moveTo(x - 6, y - 18);
        g.lineTo(x - 6, y + 18);
        g.moveTo(x + 6, y - 18);
        g.lineTo(x + 6, y + 18);
      }
      g.stroke();
      const n = Math.round(fill * 4);
      for (let i = 0; i < n; i++) {
        const o = -12 + i * 8;
        if (vertical) {
          disc(g, x + o, y - 14, 2.5, POS);
          disc(g, x + o, y + 14, 2.5, NEG);
        } else {
          disc(g, x - 14, y + o, 2.5, POS);
          disc(g, x + 14, y + o, 2.5, NEG);
        }
      }
      if (ringed) {
        g.strokeStyle = col.accent;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(x, y, 30, 0, Math.PI * 2);
        g.stroke();
      }
      label(g, text, vertical ? x + 46 : x, vertical ? y + 4 : y + 46, { size: 12, color: col.text });
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 13, color: col.good });
    };
    const runF = () => (runT === null ? 0 : ease(Math.min(1, runT / RUN)));
    const speed = () => (runT !== null && runT < RUN ? 0.5 : 0.18);

    function drawSeries() {
      if (lvl.kind !== 'series') return;
      const xs = [210, 340, 470];
      const top = 110;
      const bot = 250;
      const loop: Pt[] = [[60, top], [610, top], [610, bot], [60, bot], [60, top]];
      wire([60, top - 0], [610, top], [610, bot], [60, bot], [60, top]);
      g.fillStyle = col.panel;
      xs.forEach((x) => g.fillRect(x - 14, top - 10, 28, 20));
      flowAlong(loop, speed());
      battery(60, (top + bot) / 2);
      xs.forEach((x, i) => cap(x, top, false, `${lvl.cs[i]} pF`, i === lvl.target, 0.3 + runF() * 0.7));
      label(g, `${lvl.v} V`, 60, bot + 30, { size: 13, color: col.muted });
      if (verdictAt !== null && verdictOk) {
        const vs = seriesVoltages(lvl.cs, lvl.v);
        xs.forEach((x, i) => verdictLabel(`${fmt(vs[i])} V`, x, top + 70));
        verdictLabel(`C = ${fmt(lvl.ceq)} pF`, 340, 40);
      }
    }
    function drawParallel() {
      if (lvl.kind !== 'parallel') return;
      const xs = [240, 360, 480];
      const top = 90;
      const bot = 260;
      wire([60, top], [520, top]);
      wire([60, bot], [520, bot]);
      wire([60, top], [60, bot]);
      xs.forEach((x) => {
        wire([x, top], [x, 150]);
        wire([x, 190], [x, bot]);
      });
      flowAlong([[60, top], [520, top]], speed(), 9);
      battery(60, (top + bot) / 2);
      xs.forEach((x, i) => cap(x, 170, true, `${lvl.cs[i]} pF`, i === lvl.target, 0.3 + runF() * 0.7));
      label(g, `${lvl.v} V across each`, 360, bot + 30, { size: 13, color: col.muted });
      if (verdictAt !== null && verdictOk) {
        const qs = parallelCharges(lvl.cs, lvl.v);
        xs.forEach((x, i) => verdictLabel(`${fmt(qs[i])} nC`, x, 215));
        verdictLabel(`C = ${fmt(lvl.ceq)} pF`, 360, 40);
      }
    }
    function drawMixed() {
      if (lvl.kind !== 'mixed') return;
      const top = 90;
      const bot = 260;
      const f = 0.3 + runF() * 0.7;
      wire([60, top], [60, bot]);
      battery(60, (top + bot) / 2);
      if (lvl.topology === 'c1-series-with-pair') {
        wire([60, top], [200, top]);
        wire([200, top], [380, top], [380, 150]);
        wire([380, top], [500, top], [500, 150]);
        wire([380, 190], [380, bot]);
        wire([500, 190], [500, bot]);
        wire([60, bot], [500, bot]);
        flowAlong([[60, top], [380, top]], speed(), 8);
        cap(200, top, false, 'C₁', false, f);
        cap(380, 170, true, 'C₂', false, f);
        cap(500, 170, true, 'C₃', false, f);
      } else {
        wire([60, top], [440, top]);
        wire([60, bot], [440, bot]);
        wire([220, top], [220, 150]);
        wire([220, 190], [220, bot]);
        wire([440, top], [440, 120]);
        wire([440, 150], [440, 200]);
        wire([440, 230], [440, bot]);
        flowAlong([[60, top], [440, top]], speed(), 8);
        cap(220, 170, true, 'C₁', false, f);
        cap(440, 135, true, 'C₂', false, f);
        cap(440, 215, true, 'C₃', false, f);
      }
      label(g, `${lvl.v} V`, 60, bot + 30, { size: 13, color: col.muted });
      verdictLabel(`C = ${fmt(lvl.ceq)} pF, Q = ${fmt(lvl.q)} nC`, 340, 36);
    }
    function drawEnergy() {
      if (lvl.kind !== 'energy') return;
      const f = runF();
      const top = 100;
      const bot = 250;
      wire([60, top], [330, top]);
      wire([60, bot], [330, bot]);
      wire([60, top], [60, bot]);
      wire([330, top], [330, 150]);
      wire([330, 190], [330, bot]);
      flowAlong([[60, top], [330, top]], speed(), 8);
      battery(60, (top + bot) / 2);
      cap(330, 170, true, `${lvl.c} pF`, false, 1);
      const v = f > 0 ? lvl.v * (1 + f) : lvl.v;
      label(g, `V = ${fmt(v)} V`, 60, bot + 30, { size: 13, color: col.muted });
      // energy bar, grows by U ∝ V² as the voltage doubles
      const h0 = 50;
      const bar = h0 * (1 + 3 * f);
      g.fillStyle = col.accent;
      g.globalAlpha = 0.85;
      g.fillRect(520, bot - bar, 50, bar);
      g.globalAlpha = 1;
      g.strokeStyle = col.muted;
      g.strokeRect(520, bot - h0 * 4, 50, h0 * 4);
      label(g, 'energy in the field', 545, bot - h0 * 4 - 12, { size: 12, color: col.muted });
      if (f > 0.05) label(g, 'voltage doubled', 330, 40, { size: 13, color: col.accent });
      verdictLabel(`U = ${fmt(lvl.u)} nJ`, 330, 70);
    }
    function drawShare() {
      if (lvl.kind !== 'share') return;
      const f = runF();
      const top = 130;
      const bot = 250;
      const total = lvl.c1 + lvl.c2;
      const swX = 330;
      wire([160, top], [swX - 30, top]);
      wire([swX + 30, top], [480, top]);
      wire([160, bot], [480, bot]);
      wire([160, top], [160, 150]);
      wire([160, 190], [160, bot]);
      wire([480, top], [480, 150]);
      wire([480, 190], [480, bot]);
      // the switch
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(swX - 30, top);
      g.lineTo(swX + 30, top - 40 * (1 - Math.min(1, f * 6)));
      g.stroke();
      const fill1 = 1 - f * (1 - lvl.c1 / total);
      const fill2 = f * (lvl.c2 / total);
      cap(160, 170, true, `C₁ ${lvl.c1} pF`, false, fill1);
      cap(480, 170, true, `C₂ ${lvl.c2} pF`, false, fill2);
      if (f > 0.02 && f < 0.98) {
        flowAlong([[160, top], [480, top]], 0.7, 8);
        // the spark at the switch
        g.fillStyle = '#f4b400';
        for (let i = 0; i < 5; i++) {
          g.globalAlpha = 0.5 + 0.5 * Math.sin(clock * 40 + i);
          disc(g, swX + (Math.sin(clock * 31 + i * 2) * 14), top - 6 + Math.cos(clock * 27 + i * 3) * 10, 2.5, '#f4b400');
        }
        g.globalAlpha = 1;
      }
      const vNow = lvl.v - (lvl.v - lvl.v2) * f;
      label(g, `${fmt(vNow)} V`, 160, bot + 30, { size: 13, color: col.muted });
      label(g, `${fmt(lvl.v2 * f)} V`, 480, bot + 30, { size: 13, color: col.muted });
      if (verdictAt !== null && verdictOk) label(g, `lost ${fmt(lvl.lost)} µJ as heat`, 320, 50, { size: 14, color: col.good });
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawSeries();
      drawParallel();
      drawMixed();
      drawEnergy();
      drawShare();
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
