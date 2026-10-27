import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeAmmeter, judgeDeflect, judgeRatio, judgeTurns, judgeVoltmeter, starsFor } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const REVEAL = 0.9;
const RUN = 3;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const CX0 = 380;
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
    let slide = 0; // level 1: the current set on the slider, in µA
    let needle = 0;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A moving-coil galvanometer with its pointer, and the circuit it is used in as an ammeter or voltmeter.' });
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
    if (lvl.kind === 'deflect') {
      const slider = h('input', { type: 'range', min: '0', max: String(Math.round(lvl.fullMicro * 12) / 10), step: String(Math.max(0.01, lvl.fullMicro / 60)), value: '0', 'aria-label': 'Current in µA' }) as HTMLInputElement;
      const sync = () => (slide = Number(slider.value));
      slider.addEventListener('input', sync);
      slider.addEventListener('change', sync);
      const sIn = field('Current sensitivity in degrees per µA', 'S = ? °/µA');
      const fIn = field('Full-scale current in µA', 'I full = ? µA');
      const run = () => {
        if (finished || busy()) return;
        const s = num(sIn);
        const f = num(fIn);
        if (s === null || f === null || s <= 0 || f <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeDeflect(lvl, s, f);
        verdict(res.ok);
        if (res.ok) return succeed(`S = ${fmt(lvl.sens)} degrees per µA, and full scale needs ${fmt(lvl.fullMicro)} µA.`);
        const parts: string[] = [];
        if (!res.sOk) parts.push('The sensitivity is not right: at balance the magnetic torque NIAB equals kθ. Convert the area to m² and the spring constant to N m/rad, and give the answer in degrees per µA.');
        if (!res.fOk) parts.push('The full-scale current is not right: it is the full-scale deflection divided by the sensitivity.');
        miss(parts.join(' '));
      };
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Current'), slider), row('Sensitivity', sIn, '°/µA'), row('Full scale', fIn, 'µA'), actionBtn('Check the meter', 'Check the meter', run));
      hint.textContent = `N = ${lvl.n} turns, A = ${lvl.aCm2} cm², B = ${lvl.b} T, spring constant k = ${lvl.kMicro} µN m/rad. Full-scale deflection ${lvl.thetaFull}°. Slide the current to watch the pointer.`;
    }
    if (lvl.kind === 'ammeter') {
      const sIn = field('Shunt resistance in mΩ', 'rs = ? mΩ');
      const rIn = field('Reading of the ammeter in A', 'I = ? A');
      const run = () => {
        if (finished || busy()) return;
        const s = num(sIn);
        const r = num(rIn);
        if (s === null || r === null || s <= 0 || r <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeAmmeter(lvl, s, r);
        verdict(res.ok);
        if (res.ok) return succeed(`r_s = ${fmt(lvl.shunt)} mΩ, and the ammeter reads ${fmt(lvl.reading)} A.`);
        const parts: string[] = [];
        if (!res.sOk) parts.push('The shunt is not right: at full range the coil and the shunt have the same voltage across them. Give it in mΩ.');
        if (!res.rOk) parts.push('The reading is not right: the ammeter has a small resistance of its own, which is in series with the 3 Ω.');
        miss(parts.join(' '));
      };
      controls.append(row('Shunt', sIn, 'mΩ'), row('Ammeter reading', rIn, 'A'), actionBtn('Check the ammeter', 'Check the ammeter', run));
      hint.textContent = `Galvanometer: R_G = ${lvl.rg} Ω, full-scale current ${lvl.igMilli} mA. Wanted: an ammeter of range ${lvl.rangeA} A. Test circuit: 3 V source, 3 Ω resistor.`;
    }
    if (lvl.kind === 'voltmeter') {
      const sIn = field('Series resistance in kΩ', 'R = ? kΩ');
      const tIn = field('Resistance of the voltmeter in kΩ', 'R total = ? kΩ');
      const run = () => {
        if (finished || busy()) return;
        const s = num(sIn);
        const t = num(tIn);
        if (s === null || t === null || s <= 0 || t <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeVoltmeter(lvl, s, t);
        verdict(res.ok);
        if (res.ok) return succeed(`R = ${fmt(lvl.series)} kΩ, and the voltmeter has ${fmt(lvl.total)} kΩ.`);
        const parts: string[] = [];
        if (!res.sOk) parts.push('The series resistance is not right: at full range the whole voltage drives the full-scale current through the coil and the series resistor together.');
        if (!res.tOk) parts.push('The resistance of the voltmeter is not right: it is the series resistor and the coil together.');
        miss(parts.join(' '));
      };
      controls.append(row('Series resistor', sIn, 'kΩ'), row('Voltmeter resistance', tIn, 'kΩ'), actionBtn('Check the voltmeter', 'Check the voltmeter', run));
      hint.textContent = `Galvanometer: R_G = ${lvl.rg} Ω, full-scale current ${lvl.igMilli} mA. Wanted: a voltmeter of range ${lvl.rangeV} V.`;
    }
    if (lvl.kind === 'ratio') {
      const cIn = field('Ratio of the current sensitivities, M2 to M1', 'Is₂/Is₁ = ?');
      const vIn = field('Ratio of the voltage sensitivities, M2 to M1', 'Vs₂/Vs₁ = ?');
      const run = () => {
        if (finished || busy()) return;
        const c = num(cIn);
        const v = num(vIn);
        if (c === null || v === null || c <= 0 || v <= 0) return freeNote('Enter both ratios as positive numbers.');
        const res = judgeRatio(lvl, c, v);
        verdict(res.ok);
        if (res.ok) return succeed(`Current sensitivity ratio ${fmt(lvl.current)}, voltage sensitivity ratio ${fmt(lvl.voltage)}.`);
        const parts: string[] = [];
        if (!res.cOk) parts.push('The current sensitivity ratio is not right: it is the ratio of NAB for the two meters, with the same spring.');
        if (!res.vOk) parts.push('The voltage sensitivity ratio is not right: it is the current sensitivity divided by the resistance of the coil.');
        miss(parts.join(' '));
      };
      controls.append(row('Current sensitivity', cIn, 'M2 : M1'), row('Voltage sensitivity', vIn, 'M2 : M1'), actionBtn('Compare the meters', 'Compare the meters', run));
      hint.textContent = `M1: R = ${lvl.m1.r} Ω, N = ${lvl.m1.n}, A = ${lvl.m1.a} × 10⁻³ m², B = ${lvl.m1.b} T. M2: R = ${lvl.m2.r} Ω, N = ${lvl.m2.n}, A = ${lvl.m2.a} × 10⁻³ m², B = ${lvl.m2.b} T. The springs are identical.`;
    }
    if (lvl.kind === 'turns') {
      const iIn = field('New current sensitivity in div per mA', 'Is′ = ? div/mA');
      const vIn = field('New voltage sensitivity in div per V', 'Vs′ = ? div/V');
      const run = () => {
        if (finished || busy()) return;
        const i = num(iIn);
        const v = num(vIn);
        if (i === null || v === null || i <= 0 || v <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeTurns(lvl, i, v);
        verdict(res.ok);
        if (res.ok) return succeed(`Is′ = ${fmt(lvl.newI)} div/mA and Vs′ = ${fmt(lvl.newV)} div/V.`);
        const parts: string[] = [];
        if (!res.iOk) parts.push('The new current sensitivity is not right: how does NAB/k depend on the number of turns?');
        if (!res.vOk) parts.push('The new voltage sensitivity is not right: it also depends on the resistance of the coil, which changes with the length of wire.');
        miss(parts.join(' '));
      };
      controls.append(row('Current sensitivity', iIn, 'div/mA'), row('Voltage sensitivity', vIn, 'div/V'), actionBtn('Rewind the coil', 'Rewind the coil', run));
      hint.textContent = `The coil has ${lvl.sensI} div/mA and R_G = ${lvl.rg} Ω. The number of turns is multiplied by ${lvl.k}.`;
    }

    // ---- drawing helpers -------------------------------------------------------------------------------------------------
    const wire = (...pts: Pt[]) => {
      g.strokeStyle = col.muted;
      g.lineWidth = 2;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    };
    const flowAlong = (pts: Pt[], speed: number, n = 10) => {
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
    const zigzag = (x: number, y: number, len: number, color: string, amp = 8) => {
      g.strokeStyle = color;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, y);
      for (let i = 0; i < 6; i++) g.lineTo(x + ((i + 0.5) / 6) * len, y + (i % 2 ? amp : -amp));
      g.lineTo(x + len, y);
      g.stroke();
    };
    /** A meter dial. frac is the deflection from 0 to 1 of full scale (and beyond to 1.2). */
    const dial = (x: number, y: number, frac: number, name: string, size = 56, text = '') => {
      disc(g, x, y, size, col.panel);
      g.strokeStyle = col.text;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(x, y, size, Math.PI, Math.PI * 2);
      g.stroke();
      for (let k = 0; k <= 10; k++) {
        const a = Math.PI + (k / 10) * Math.PI * 0.84 + Math.PI * 0.08;
        g.beginPath();
        g.moveTo(x + Math.cos(a) * size * 0.82, y + Math.sin(a) * size * 0.82);
        g.lineTo(x + Math.cos(a) * size * 0.95, y + Math.sin(a) * size * 0.95);
        g.stroke();
      }
      const a = Math.PI + Math.max(0, Math.min(1.2, frac)) * Math.PI * 0.84 * (1 / 1.0) + Math.PI * 0.08;
      g.strokeStyle = frac > 1 ? col.bad : POS;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * size * 0.85, y + Math.sin(a) * size * 0.85);
      g.stroke();
      disc(g, x, y, 4, col.text);
      label(g, name, x, y + 16, { size: 12, color: col.text });
      if (text) label(g, text, x, y + 34, { size: 12, color: col.muted });
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const runF = () => (runT === null ? 0 : ease(Math.min(1, runT / RUN)));
    const follow = (target: number) => {
      needle += (target - needle) * 0.15;
      return needle;
    };

    function drawDeflect() {
      if (lvl.kind !== 'deflect') return;
      const frac = (lvl.sens * slide) / lvl.thetaFull;
      dial(CX0, 170, follow(frac), 'G', 110, `${fmt(slide)} µA → ${fmt(lvl.sens * slide)}°`);
      // full-scale marker
      const a = Math.PI + 1 * Math.PI * 0.84 + Math.PI * 0.08;
      g.strokeStyle = col.accent;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(CX0 + Math.cos(a) * 100, 170 + Math.sin(a) * 100);
      g.lineTo(CX0 + Math.cos(a) * 118, 170 + Math.sin(a) * 118);
      g.stroke();
      label(g, `full scale ${lvl.thetaFull}°`, CX0 + Math.cos(a) * 140 + 10, 170 + Math.sin(a) * 120, { size: 12, color: col.accent });
      // the coil and spring, drawn as a small schematic
      g.strokeStyle = '#b87333';
      g.lineWidth = 5;
      g.strokeRect(80, 230, 70, 54);
      label(g, `${lvl.n} turns`, 115, 300, { size: 11, color: col.muted });
      verdictLabel(`S = ${fmt(lvl.sens)} °/µA, full scale ${fmt(lvl.fullMicro)} µA`, CX0, 30);
    }
    function drawAmmeter() {
      if (lvl.kind !== 'ammeter') return;
      const f = runF();
      const top = 80;
      const bot = 270;
      wire([80, top], [200, top]);
      wire([380, top], [560, top], [560, bot], [80, bot], [80, top]);
      // the source and the 3 Ω resistor
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(64, 160);
      g.lineTo(96, 160);
      g.stroke();
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(71, 180);
      g.lineTo(89, 180);
      g.stroke();
      label(g, '3 V', 80, 206, { size: 12, color: col.muted });
      zigzag(440, bot, 80, col.text);
      label(g, '3 Ω', 480, bot + 26, { size: 12, color: col.text });
      // the ammeter: galvanometer in parallel with a small shunt
      g.strokeStyle = col.accent;
      g.setLineDash([5, 5]);
      g.lineWidth = 1.5;
      g.strokeRect(200, top - 40, 180, 100);
      g.setLineDash([]);
      disc(g, 260, top, 18, col.panel);
      g.strokeStyle = col.text;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(260, top, 18, 0, Math.PI * 2);
      g.stroke();
      label(g, 'G', 260, top, { size: 13, color: col.text });
      wire([200, top], [242, top]);
      wire([278, top], [380, top]);
      g.strokeStyle = col.text;
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(290, top + 24);
      g.lineTo(350, top + 24);
      g.stroke();
      wire([290, top], [290, top + 24]);
      wire([350, top], [350, top + 24]);
      label(g, 'shunt', 320, top + 44, { size: 11, color: col.muted });
      if (f > 0) flowAlong([[80, top], [560, top], [560, bot], [80, bot], [80, top]], 0.3, 14);
      dial(300, 200, runT === null ? 0 : follow(lvl.reading / lvl.rangeA), 'ammeter', 42, runT === null ? '' : `${fmt(lvl.reading)} A`);
      verdictLabel(`r_s = ${fmt(lvl.shunt)} mΩ, reads ${fmt(lvl.reading)} A (bare: ${fmt(lvl.bareReading)} A)`, 320, 318);
    }
    function drawVoltmeter() {
      if (lvl.kind !== 'voltmeter') return;
      const f = runF();
      const cy = 130;
      // a resistor in the circuit, with the voltmeter across it
      wire([60, cy], [200, cy]);
      wire([440, cy], [580, cy]);
      zigzag(200, cy, 240, col.text, 12);
      wire([230, cy], [230, 235], [250, 235]);
      wire([410, cy], [410, 235], [390, 235]);
      g.strokeStyle = col.accent;
      g.setLineDash([5, 5]);
      g.lineWidth = 1.5;
      g.strokeRect(240, 210, 160, 50);
      g.setLineDash([]);
      disc(g, 276, 235, 16, col.panel);
      g.strokeStyle = col.text;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(276, 235, 16, 0, Math.PI * 2);
      g.stroke();
      label(g, 'G', 276, 235, { size: 12, color: col.text });
      wire([292, 235], [315, 235]);
      zigzag(315, 235, 60, col.text, 7);
      wire([375, 235], [390, 235]);
      label(g, 'R (series)', 345, 266, { size: 11, color: col.muted });
      dial(320, 55, runT === null ? 0 : follow(1), 'V', 36, runT === null ? '' : `full scale ${lvl.rangeV} V`);
      if (f > 0) flowAlong([[60, cy], [580, cy]], 0.3, 12);
      verdictLabel(`R = ${fmt(lvl.series)} kΩ, voltmeter ${fmt(lvl.total)} kΩ`, 320, 318);
    }
    function drawRatio() {
      if (lvl.kind !== 'ratio') return;
      const f = runF();
      const s1 = 0.4;
      const s2 = Math.min(1.15, s1 * lvl.current);
      dial(200, 170, runT === null ? s1 : follow(s1 + (s1 - s1) * f), 'M1', 70, 'same current');
      // M2 moves to its own deflection once the current is applied
      const t2 = runT === null ? s1 : s1 + (s2 - s1) * f;
      dial(450, 170, t2, 'M2', 70, 'same current');
      label(g, 'N A B / k  →  deflection per unit current', 320, 40, { size: 12, color: col.muted });
      verdictLabel(`Is: ${fmt(lvl.current)}, Vs: ${fmt(lvl.voltage)}`, 320, 318);
    }
    function drawTurns() {
      if (lvl.kind !== 'turns') return;
      const f = runF();
      // bars for the current and voltage sensitivities before and after
      const bar = (x: number, v0: number, v1: number, name: string, scale: number, color: string) => {
        g.fillStyle = col.muted;
        g.globalAlpha = 0.6;
        g.fillRect(x, 270 - v0 * scale, 50, v0 * scale);
        g.globalAlpha = 1;
        g.fillStyle = color;
        const v = v0 + (v1 - v0) * f;
        g.fillRect(x + 60, 270 - v * scale, 50, v * scale);
        label(g, 'before', x + 25, 286, { size: 11, color: col.muted });
        label(g, 'after', x + 85, 286, { size: 11, color: col.muted });
        label(g, name, x + 55, 60, { size: 13, color: col.text });
      };
      const maxI = Math.max(lvl.sensI, lvl.newI) * 1.15;
      bar(120, lvl.sensI, lvl.newI, 'current sensitivity', 180 / maxI, col.accent);
      bar(380, lvl.sensV, lvl.newV, 'voltage sensitivity', 180 / (lvl.sensV * 1.3), '#2e9e4a');
      label(g, `N × ${lvl.k}, R_G × ${lvl.k}`, 320, 30, { size: 13, color: col.muted });
      verdictLabel(`current ${fmt(lvl.newI)} div/mA, voltage ${fmt(lvl.newV)} div/V`, 320, 318);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawDeflect();
      drawAmmeter();
      drawVoltmeter();
      drawRatio();
      drawTurns();
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
