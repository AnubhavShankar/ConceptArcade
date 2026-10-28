import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeCharge, judgeLoad, judgeMeasure, judgeParallel, judgeSeries, loadCurrent, reading, starsFor, terminalV, type Why } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const REVEAL = 0.9;
const RUN = 3;
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
    let load = 10; // level 2: the adjustable load
    let touched = false;
    let why: Why | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A cell with its internal resistance driving a circuit, with meters and flowing charge.' });
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
    if (lvl.kind === 'load') {
      const first = lvl.mode === 'current';
      const aIn = field(first ? 'Current in A' : 'Resistance of the resistor in Ω', first ? 'I = ? A' : 'R = ? Ω');
      const vIn = field('Terminal voltage in V', 'V = ? V');
      const run = () => {
        if (finished || busy()) return;
        const a = num(aIn);
        const v = num(vIn);
        if (a === null || v === null || a <= 0 || v <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeLoad(lvl, a, v);
        verdict(res.ok);
        if (res.ok) return succeed(first ? `I = ${fmt(lvl.i)} A and V = ${fmt(lvl.v)} V.` : `R = ${fmt(lvl.load)} Ω and V = ${fmt(lvl.v)} V.`);
        const parts: string[] = [];
        if (!res.firstOk) parts.push(first ? 'The current is not right: the cell\'s own resistance is in series with the resistor.' : 'The resistance is not right: the current flows through the resistor and the internal resistance together.');
        if (!res.vOk) parts.push('The terminal voltage is not right: some of the emf is lost across the internal resistance.');
        miss(parts.join(' '));
      };
      controls.append(first ? row('Current', aIn, 'A') : row('Resistor', aIn, 'Ω'), row('Terminal voltage', vIn, 'V'), actionBtn('Connect the cell', 'Connect the cell', run));
      hint.textContent = first ? `Cell: emf ${lvl.e} V, internal resistance ${lvl.r} Ω. Resistor: ${lvl.load} Ω.` : `Cell: emf ${lvl.e} V, internal resistance ${lvl.r} Ω. The current is ${lvl.i} A.`;
    }
    if (lvl.kind === 'measure') {
      const slider = h('input', { type: 'range', min: '1', max: '20', step: '0.5', value: '10', 'aria-label': 'Load resistance in Ω' }) as HTMLInputElement;
      const sync = () => {
        load = Number(slider.value);
        touched = true;
      };
      slider.addEventListener('input', sync);
      slider.addEventListener('change', sync);
      const rIn = field('Internal resistance in Ω', 'r = ? Ω');
      const iIn = field('Maximum current in A', 'I max = ? A');
      const run = () => {
        if (finished || busy()) return;
        if (!touched) return freeNote('Connect a load first, with the slider, and read the meters.');
        const r = num(rIn);
        const i = num(iIn);
        if (r === null || i === null || r <= 0 || i <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeMeasure(lvl, r, i);
        verdict(res.ok);
        if (res.ok) return succeed(`r = ${fmt(lvl.r)} Ω and the largest current is ${fmt(lvl.iMax)} A.`);
        const parts: string[] = [];
        if (!res.rOk) parts.push('The internal resistance is not right: the voltage that goes missing between the emf and the meter reading is lost inside the cell.');
        if (!res.iOk) parts.push('The largest current is not right: when is the current in the circuit greatest?');
        miss(parts.join(' '));
      };
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Load'), slider), row('Internal resistance', rIn, 'Ω'), row('Largest current', iIn, 'A'), actionBtn('Check the cell', 'Check the cell', run));
      hint.textContent = `The cell's emf is ${lvl.e} V. Slide the load and read the terminal voltage and current.`;
    }
    if (lvl.kind === 'charge') {
      const iIn = field('Charging current in A', 'I = ? A');
      const vIn = field('Terminal voltage during charging in V', 'V = ? V');
      const opts: [Why, string][] = [['limit', 'To limit the charging current'], ['raise', 'To raise the emf of the battery'], ['reverse', 'To reverse the current in the battery']];
      const btns: HTMLElement[] = opts.map(([v, text]) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': text, 'aria-pressed': 'false', onclick: () => {
          why = v;
          btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        } }, text);
        return b;
      });
      const run = () => {
        if (finished || busy()) return;
        const i = num(iIn);
        const v = num(vIn);
        if (i === null || v === null || i <= 0 || v <= 0) return freeNote('Enter both answers as positive numbers.');
        if (why === null) return freeNote('Choose the purpose of the series resistor.');
        const res = judgeCharge(lvl, i, v, why);
        verdict(res.ok);
        if (res.ok) return succeed(`I = ${fmt(lvl.i)} A and V = ${fmt(lvl.v)} V.`);
        const parts: string[] = [];
        if (!res.iOk) parts.push('The charging current is not right: the supply and the battery\'s emf push against each other.');
        if (!res.vOk) parts.push('The terminal voltage is not right: the current enters the positive terminal, so the direction of the voltage drop across r is reversed.');
        if (!res.whyOk) parts.push('Think about what the current would be without the resistor, with only the tiny internal resistance in the way.');
        miss(parts.join(' '));
      };
      controls.append(row('Charging current', iIn, 'A'), row('Terminal voltage', vIn, 'V'), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Why the resistor?'), ...btns), actionBtn('Start charging', 'Start charging', run));
      hint.textContent = `Battery: emf ${lvl.e} V, internal resistance ${lvl.r} Ω. Supply ${lvl.supply} V, series resistor ${lvl.rSeries} Ω.`;
    }
    if (lvl.kind === 'series') {
      const eIn = field('Equivalent emf in V', 'ε = ? V');
      const rIn = field('Equivalent internal resistance in Ω', 'r = ? Ω');
      const run = () => {
        if (finished || busy()) return;
        const e = num(eIn);
        const r = num(rIn);
        if (e === null || r === null || e <= 0 || r <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeSeries(lvl, e, r);
        verdict(res.ok);
        if (res.ok) return succeed(`ε = ${fmt(lvl.e)} V and r = ${fmt(lvl.r)} Ω.`);
        const parts: string[] = [];
        if (!res.eOk) parts.push(lvl.aiding ? 'The emf is not right: the cells push the current the same way round.' : 'The emf is not right: the cells push the current in opposite directions, so one pushes against the other.');
        if (!res.rOk) parts.push('The internal resistance is not right: the current has to pass through both cells.');
        miss(parts.join(' '));
      };
      controls.append(row('Equivalent emf', eIn, 'V'), row('Equivalent r', rIn, 'Ω'), actionBtn('Combine the cells', 'Combine the cells', run));
      hint.textContent = `Cell 1: ${lvl.e1} V, ${lvl.r1} Ω. Cell 2: ${lvl.e2} V, ${lvl.r2} Ω.`;
    }
    if (lvl.kind === 'parallel') {
      const eIn = field('Equivalent emf in V', 'ε = ? V');
      const iIn = field('Current in the resistor in A', 'I = ? A');
      const run = () => {
        if (finished || busy()) return;
        const e = num(eIn);
        const i = num(iIn);
        if (e === null || i === null || e <= 0 || i <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeParallel(lvl, e, i);
        verdict(res.ok);
        if (res.ok) return succeed(`ε = ${fmt(lvl.e)} V and I = ${fmt(lvl.i)} A.`);
        const parts: string[] = [];
        if (!res.eOk) parts.push('The equivalent emf is not right: it lies between the two emfs, and the cell with the smaller internal resistance counts for more.');
        if (!res.iOk) parts.push('The current is not right: the pair acts as one cell with its own emf and a smaller internal resistance than either.');
        miss(parts.join(' '));
      };
      controls.append(row('Equivalent emf', eIn, 'V'), row('Current in R', iIn, 'A'), actionBtn('Connect the cells', 'Connect the cells', run));
      hint.textContent = `Cell 1: ${lvl.e1} V, ${lvl.r1} Ω. Cell 2: ${lvl.e2} V, ${lvl.r2} Ω. Resistor: ${lvl.load} Ω.`;
    }

    // ---- drawing helpers -------------------------------------------------------------------------------------------------
    const wire = (...pts: Pt[]) => {
      g.strokeStyle = col.muted;
      g.lineWidth = 2;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    };
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
    const zigzag = (x: number, y: number, len: number, color: string, amp = 9) => {
      g.strokeStyle = color;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, y);
      for (let i = 0; i < 6; i++) g.lineTo(x + ((i + 0.5) / 6) * len, y + (i % 2 ? amp : -amp));
      g.lineTo(x + len, y);
      g.stroke();
    };
    /** A real cell drawn as an ideal emf (two plates) in series with its internal resistance. flip reverses the polarity. */
    const cell = (x: number, y: number, e: number, r: number, flip = false) => {
      const longTop = flip ? y + 8 : y - 8;
      const shortTop = flip ? y - 8 : y + 8;
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x - 16, longTop);
      g.lineTo(x + 16, longTop);
      g.stroke();
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(x - 9, shortTop);
      g.lineTo(x + 9, shortTop);
      g.stroke();
      g.strokeStyle = col.accent;
      g.setLineDash([4, 4]);
      g.lineWidth = 1.5;
      g.strokeRect(x - 34, y - 26, 68, 52);
      g.setLineDash([]);
      label(g, `${fmt(e)} V`, x, y - 36, { size: 12, color: col.text });
      label(g, `r = ${fmt(r)} Ω`, x, y + 44, { size: 11, color: col.muted });
    };
    const meter = (x: number, y: number, name: string, text: string) => {
      disc(g, x, y, 24, col.panel);
      g.strokeStyle = col.text;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(x, y, 24, 0, Math.PI * 2);
      g.stroke();
      label(g, name, x, y - 3, { size: 14, color: col.text });
      label(g, text, x, y + 40, { size: 12, color: col.text });
    };
    /** A bar showing how the emf splits into the lost volts inside the cell and the terminal voltage. */
    const splitBar = (x: number, y: number, e: number, v: number, f: number) => {
      const w = 200;
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      g.strokeRect(x, y, w, 16);
      const vw = (Math.max(0, Math.min(e * 1.6, v)) / (e * 1.6)) * w * f;
      g.fillStyle = col.accent;
      g.globalAlpha = 0.85;
      g.fillRect(x, y, Math.min(w, vw), 16);
      g.globalAlpha = 1;
      label(g, `terminal ${fmt(v * f)} V of emf ${fmt(e)} V`, x + w / 2, y + 34, { size: 12, color: col.muted });
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const runF = () => (runT === null ? 0 : ease(Math.min(1, runT / RUN)));

    function drawLoad() {
      if (lvl.kind !== 'load') return;
      const f = runF();
      const top = 100;
      const bot = 240;
      const loop: Pt[] = [[110, top], [200, top], [560, top], [560, bot], [110, bot], [110, top]];
      wire([110, top], [260, top]);
      wire([370, top], [560, top], [560, bot], [110, bot], [110, top]);
      cell(110, (top + bot) / 2, lvl.e, lvl.r);
      zigzag(260, top, 110, col.text);
      label(g, lvl.mode === 'current' ? `${lvl.load} Ω` : 'R = ?', 315, top - 24, { size: 13, color: col.text });
      flowAlong(loop, 0.05 + f * 0.35, 12);
      if (f > 0.05) {
        meter(560, (top + bot) / 2, 'A', verdictAt !== null && verdictOk ? `${fmt(lvl.i)} A` : '…');
        splitBar(220, 290, lvl.e, lvl.v, f);
      }
      verdictLabel(`V = ${fmt(lvl.v)} V < ε = ${lvl.e} V`, 320, 50);
    }
    function drawMeasure() {
      if (lvl.kind !== 'measure') return;
      const i = loadCurrent(lvl.e, lvl.r, load);
      const v = terminalV(lvl.e, lvl.r, i);
      const top = 90;
      const bot = 240;
      wire([110, top], [260, top]);
      wire([370, top], [560, top], [560, bot], [110, bot], [110, top]);
      cell(110, (top + bot) / 2, lvl.e, 0, false);
      label(g, 'r = ?', 110, (top + bot) / 2 + 44, { size: 11, color: col.accent });
      g.strokeStyle = col.text;
      zigzag(260, top, 110, col.text, 4 + load * 0.5);
      label(g, `load ${fmt(load)} Ω`, 315, top - 26, { size: 13, color: col.text });
      flowAlong([[110, top], [560, top], [560, bot], [110, bot], [110, top]], 0.05 + i * 0.05, 12);
      meter(560, (top + bot) / 2, 'A', touched ? `${reading(i)} A` : '—');
      meter(440, bot, 'V', touched ? `${reading(v)} V` : '—');
      if (verdictAt !== null && verdictOk) verdictLabel(`r = ${fmt(lvl.r)} Ω, I max = ${fmt(lvl.iMax)} A`, 320, 40);
    }
    function drawCharge() {
      if (lvl.kind !== 'charge') return;
      const f = runF();
      const top = 100;
      const bot = 240;
      wire([110, top], [260, top]);
      wire([370, top], [560, top], [560, bot], [110, bot], [110, top]);
      // the supply on the right, the battery being charged on the left
      cell(110, (top + bot) / 2, lvl.e, lvl.r);
      cell(560, (top + bot) / 2, lvl.supply, 0, false);
      zigzag(260, top, 110, col.text);
      label(g, `${lvl.rSeries} Ω`, 315, top - 24, { size: 13, color: col.text });
      label(g, 'battery being charged', 110, bot + 40, { size: 11, color: col.muted });
      label(g, 'dc supply', 560, bot + 40, { size: 11, color: col.muted });
      // current runs into the + terminal of the battery, against its emf
      flowAlong([[560, top], [110, top], [110, bot], [560, bot], [560, top]], 0.05 + f * 0.3, 12);
      if (f > 0.05) splitBar(220, 290, lvl.e, lvl.v, f);
      verdictLabel(`I = ${fmt(lvl.i)} A, V = ${fmt(lvl.v)} V > ε`, 320, 50);
    }
    function drawSeries() {
      if (lvl.kind !== 'series') return;
      const f = runF();
      const top = 120;
      const bot = 240;
      wire([80, top], [150, top]);
      wire([210, top], [330, top]);
      wire([330, top], [400, top]);
      wire([80, top], [80, bot], [560, bot], [560, top], [470, top]);
      cell(180, (top + bot) / 2, lvl.e1, lvl.r1);
      wire([180, top], [180, top - 30]);
      cell(430, (top + bot) / 2, lvl.e2, lvl.r2, !lvl.aiding);
      label(g, lvl.aiding ? 'emfs help' : 'emfs oppose', 305, 60, { size: 13, color: col.accent });
      flowAlong([[80, top], [560, top], [560, bot], [80, bot], [80, top]], lvl.aiding ? 0.08 + f * 0.3 : 0.06 + f * 0.1, 12);
      verdictLabel(`ε = ${fmt(lvl.e)} V, r = ${fmt(lvl.r)} Ω`, 320, 300);
    }
    function drawParallel() {
      if (lvl.kind !== 'parallel') return;
      const f = runF();
      const top = 70;
      const mid = 160;
      const bot = 250;
      wire([120, top], [440, top]);
      wire([120, bot], [440, bot]);
      wire([120, top], [120, bot]);
      wire([300, top], [300, bot]);
      wire([440, top], [440, 110]);
      wire([440, 210], [440, bot]);
      cell(120, mid, lvl.e1, lvl.r1);
      cell(300, mid, lvl.e2, lvl.r2);
      zigzag(430, 150, 20, col.text, 8);
      label(g, `${lvl.load} Ω`, 500, mid, { size: 13, color: col.text });
      flowAlong([[120, top], [440, top]], 0.05 + f * 0.25, 10);
      verdictLabel(`ε = ${fmt(lvl.e)} V, I = ${fmt(lvl.i)} A`, 320, 300);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawLoad();
      drawMeasure();
      drawCharge();
      drawSeries();
      drawParallel();
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
