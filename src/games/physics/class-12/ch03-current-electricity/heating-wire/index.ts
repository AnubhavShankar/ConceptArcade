import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, dat, explainSolution, fmt, hotAnswer, judgeBill, judgeHot, judgeRated, judgeThermo, judgeToaster, starsFor } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const REVEAL = 0.9;
const RUN = 3;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
type Pt = [number, number];

/** A glow colour for an element at temperature t (°C): dull grey, then red, orange, yellow-white. */
function glow(t: number): string {
  const f = Math.max(0, Math.min(1, (t - 100) / 900));
  const r = Math.round(120 + 135 * Math.min(1, f * 1.6));
  const g = Math.round(110 + 120 * Math.max(0, f * 1.4 - 0.3));
  const b = Math.round(110 + 60 * Math.max(0, f * 2 - 1.2) - 70 * Math.min(1, f * 2));
  return `rgb(${r},${Math.max(40, g - 70 * (1 - f))},${Math.max(30, b)})`;
}

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
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A heating element that glows hotter as the current heats it, with a thermometer and a current meter.' });
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
    if (lvl.kind === 'hot') {
      const forward = lvl.mode === 'forward';
      const aIn = field(forward ? 'Resistance at the higher temperature in Ω' : 'Steady temperature in °C', forward ? 'R₂ = ? Ω' : 'T₂ = ? °C');
      const run = () => {
        if (finished || busy()) return;
        const a = num(aIn);
        if (a === null || a <= 0) return freeNote('Enter a positive number.');
        const ok = judgeHot(lvl, a).ok;
        verdict(ok);
        if (ok) return succeed(forward ? `R₂ = ${fmt(lvl.r2)} Ω.` : `T₂ = ${fmt(hotAnswer(lvl))} °C.`);
        miss(forward ? 'That is not the resistance at the higher temperature: a metal\'s resistance rises with temperature, by a fraction α for each degree.' : 'That is not the steady temperature: the steady current tells you the hot resistance, and the resistance tells you how far the temperature has risen.');
      };
      controls.append(forward ? row('Resistance at T₂', aIn, 'Ω') : row('Steady temperature', aIn, '°C'), actionBtn(forward ? 'Heat the resistor' : 'Switch on the element', forward ? 'Heat the resistor' : 'Switch on the element', run));
      hint.textContent = forward ? `R₁ = ${dat(lvl.r1)} Ω at ${lvl.t1} °C. α = ${lvl.alpha4} × 10⁻⁴ per °C. Heated to ${lvl.t2} °C.` : `R₁ = ${dat(lvl.r1)} Ω at ${lvl.t1} °C. α = ${lvl.alpha4} × 10⁻⁴ per °C. Supply ${lvl.v} V; steady current ${lvl.i} A.`;
    }
    if (lvl.kind === 'toaster') {
      const tIn = field('Steady temperature in °C', 'T = ? °C');
      const pIn = field('Steady power in W', 'P = ? W');
      const run = () => {
        if (finished || busy()) return;
        const t = num(tIn);
        const p = num(pIn);
        if (t === null || p === null || t <= 0 || p <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeToaster(lvl, t, p);
        verdict(res.ok);
        if (res.ok) return succeed(`T = ${fmt(lvl.tSteady)} °C and P = ${fmt(lvl.pSteady)} W.`);
        const parts: string[] = [];
        if (!res.tOk) parts.push('The steady temperature is not right: compare the cold resistance with the steady resistance, and use the temperature coefficient.');
        if (!res.pOk) parts.push('The steady power is not right: use the steady current, not the switch-on current.');
        miss(parts.join(' '));
      };
      controls.append(row('Steady temperature', tIn, '°C'), row('Steady power', pIn, 'W'), actionBtn('Switch on the toaster', 'Switch on the toaster', run));
      hint.textContent = `${lvl.v} V supply. The current is ${lvl.i0} A at switch-on and settles to ${lvl.is} A. Room temperature ${lvl.t1} °C, α = 1.7 × 10⁻⁴ per °C.`;
    }
    if (lvl.kind === 'thermo') {
      const tIn = field('Temperature of the bath in °C', 't = ? °C');
      const aIn = field('Temperature coefficient in 10⁻³ per °C', 'α = ? × 10⁻³ per °C');
      const run = () => {
        if (finished || busy()) return;
        const t = num(tIn);
        const a = num(aIn);
        if (t === null || a === null || t <= 0 || a <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeThermo(lvl, t, a);
        verdict(res.ok);
        if (res.ok) return succeed(`t = ${fmt(lvl.tBath)} °C and α = ${fmt(lvl.alpha3)} × 10⁻³ per °C.`);
        const parts: string[] = [];
        if (!res.tOk) parts.push('The bath temperature is not right: the thermometer scale runs from 0 °C at the ice point to 100 °C at the steam point, and the resistance rises in proportion.');
        if (!res.aOk) parts.push('The coefficient is not right: it is the fractional rise in resistance per degree, measured between the two fixed points. Give it in units of 10⁻³.');
        miss(parts.join(' '));
      };
      controls.append(row('Bath temperature', tIn, '°C'), row('Coefficient α', aIn, '10⁻³ /°C'), actionBtn('Dip the thermometer', 'Dip the thermometer', run));
      hint.textContent = `Platinum wire: ${lvl.r0} Ω at the ice point, ${lvl.r100} Ω at the steam point, ${dat(lvl.rt)} Ω in the bath.`;
    }
    if (lvl.kind === 'rated') {
      const rIn = field('Resistance of the element in Ω', 'R = ? Ω');
      const pIn = field('Power at the lower voltage in W', 'P′ = ? W');
      const run = () => {
        if (finished || busy()) return;
        const r = num(rIn);
        const p = num(pIn);
        if (r === null || p === null || r <= 0 || p <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeRated(lvl, r, p);
        verdict(res.ok);
        if (res.ok) return succeed(`R = ${fmt(lvl.r)} Ω, and the power falls to ${fmt(lvl.pNew)} W.`);
        const parts: string[] = [];
        if (!res.rOk) parts.push('The resistance is not right: a heater\'s rating gives the power at its working voltage, so P = V²/R fixes R.');
        if (!res.pOk) parts.push('The power at the lower voltage is not right: with R fixed, how does power depend on the voltage?');
        miss(parts.join(' '));
      };
      controls.append(row('Resistance', rIn, 'Ω'), row('Power at lower V', pIn, 'W'), actionBtn('Check the heater', 'Check the heater', run));
      hint.textContent = `Heater rated ${lvl.pRated} W, ${lvl.vRated} V. The supply drops to ${fmt(lvl.vNew)} V.`;
    }
    if (lvl.kind === 'bill') {
      const kIn = field('Energy used in kWh', 'E = ? kWh');
      const cIn = field('Cost of the energy', 'Cost = ?');
      const run = () => {
        if (finished || busy()) return;
        const k = num(kIn);
        const c = num(cIn);
        if (k === null || c === null || k <= 0 || c <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeBill(lvl, k, c);
        verdict(res.ok);
        if (res.ok) return succeed(`${fmt(lvl.kwh)} kWh, costing ${fmt(lvl.cost)}.`);
        const parts: string[] = [];
        if (!res.kOk) parts.push('The energy is not right: the unit is the kilowatt-hour, so the power must be in kilowatts.');
        if (!res.cOk) parts.push('The cost is not right: it is the energy in kWh times the price of one kWh.');
        miss(parts.join(' '));
      };
      controls.append(row('Energy', kIn, 'kWh'), row('Cost', cIn, ''), actionBtn('Read the meter', 'Read the meter', run));
      hint.textContent = `${lvl.items.map((a) => `${a.name} ${a.watts} W for ${a.hours} h`).join(', ')}. Tariff: ${lvl.rate} per kWh.`;
    }

    // ---- drawing helpers -------------------------------------------------------------------------------------------------
    const wire = (...pts: Pt[]) => {
      g.strokeStyle = col.muted;
      g.lineWidth = 2;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    };
    const flowAlong = (pts: Pt[], speed: number, n = 12) => {
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
    /** A heating coil whose colour follows its temperature, with heat shimmer above it. */
    const coil = (x: number, y: number, len: number, temp: number) => {
      const c = glow(temp);
      if (temp > 300) {
        g.fillStyle = c;
        g.globalAlpha = Math.min(0.35, (temp - 300) / 2400);
        g.beginPath();
        g.arc(x + len / 2, y, len * 0.55 + Math.sin(clock * 6) * 3, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
      }
      g.strokeStyle = c;
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(x, y);
      for (let i = 0; i < 10; i++) g.lineTo(x + ((i + 0.5) / 10) * len, y + (i % 2 ? 14 : -14));
      g.lineTo(x + len, y);
      g.stroke();
      if (temp > 200) {
        for (let k = 0; k < 4; k++) {
          const t = (((clock * 0.6 + k / 4) % 1) + 1) % 1;
          g.globalAlpha = 0.5 * (1 - t);
          g.strokeStyle = c;
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(x + len * (0.2 + 0.2 * k) + Math.sin(clock * 3 + k) * 4, y - 24 - t * 40);
          g.lineTo(x + len * (0.2 + 0.2 * k) + Math.sin(clock * 3 + k + 1) * 4, y - 40 - t * 40);
          g.stroke();
        }
        g.globalAlpha = 1;
      }
    };
    const thermometer = (x: number, y: number, temp: number, tMax: number, text: string) => {
      g.strokeStyle = col.text;
      g.lineWidth = 2;
      g.strokeRect(x - 7, y - 90, 14, 90);
      const f = Math.max(0, Math.min(1, temp / tMax));
      g.fillStyle = POS;
      g.fillRect(x - 5, y - 88 * f, 10, 88 * f);
      disc(g, x, y + 8, 11, POS);
      label(g, text, x, y + 34, { size: 13, color: col.text });
    };
    const supply = (x: number, y: number, text: string) => {
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
      label(g, text, x, y + 36, { size: 13, color: col.muted });
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const runF = () => (runT === null ? 0 : ease(Math.min(1, runT / RUN)));

    function drawHot() {
      if (lvl.kind !== 'hot') return;
      const f = runF();
      const t2 = lvl.mode === 'forward' ? lvl.t2 : (hotAnswer(lvl));
      const temp = lvl.t1 + (Math.max(lvl.t1, Math.min(1100, t2)) - lvl.t1) * f;
      const rNow = lvl.r1 * (1 + lvl.alpha4 * 1e-4 * (temp - lvl.t1));
      const top = 110;
      const bot = 250;
      wire([70, top], [200, top]);
      wire([440, top], [560, top], [560, bot], [70, bot], [70, top]);
      supply(70, (top + bot) / 2, lvl.mode === 'forward' ? 'test supply' : `${lvl.v} V`);
      coil(200, top, 240, temp);
      flowAlong([[70, top], [560, top], [560, bot], [70, bot], [70, top]], 0.15 + 8 / Math.max(10, rNow) * 0.4, 12);
      thermometer(600, 250, temp, 1100, `${fmt(temp)} °C`);
      label(g, `R = ${fmt(rNow)} Ω`, 320, top - 60, { size: 15, color: col.text });
      verdictLabel(lvl.mode === 'forward' ? `R₂ = ${fmt(lvl.r2)} Ω` : `T₂ = ${fmt(hotAnswer(lvl))} °C`, 320, 300);
    }
    function drawToaster() {
      if (lvl.kind !== 'toaster') return;
      const f = runF();
      const temp = lvl.t1 + (lvl.tSteady - lvl.t1) * f;
      const i = lvl.i0 + (lvl.is - lvl.i0) * f;
      const top = 120;
      const bot = 250;
      wire([70, top], [200, top]);
      wire([440, top], [540, top], [540, bot], [70, bot], [70, top]);
      supply(70, (top + bot) / 2, `${lvl.v} V`);
      coil(200, top, 240, temp);
      flowAlong([[70, top], [540, top], [540, bot], [70, bot], [70, top]], 0.1 + i * 0.1, 14);
      label(g, runT === null ? 'switched off' : `I = ${fmt(i)} A`, 320, top - 60, { size: 15, color: col.text });
      // current against time, falling as the element heats
      g.strokeStyle = col.accent;
      g.lineWidth = 2;
      g.beginPath();
      const x0 = 150;
      const y0 = 320;
      for (let k = 0; k <= 30; k++) {
        const ff = k / 30;
        if (ff > f && runT !== null) break;
        const val = lvl.i0 + (lvl.is - lvl.i0) * ease(ff);
        const px = x0 + ff * 340;
        const py = y0 - ((val - lvl.is * 0.8) / (lvl.i0 - lvl.is * 0.8)) * 40;
        if (k) g.lineTo(px, py);
        else g.moveTo(px, py);
      }
      if (runT !== null) g.stroke();
      thermometer(600, 250, temp, 1100, `${fmt(temp)} °C`);
      verdictLabel(`${fmt(lvl.tSteady)} °C, ${fmt(lvl.pSteady)} W`, 320, 300);
    }
    function drawThermo() {
      if (lvl.kind !== 'thermo') return;
      const f = runF();
      // a bath that bubbles harder when hot, with a wire coil dipped in
      g.fillStyle = col.panel;
      g.fillRect(100, 140, 260, 150);
      g.strokeStyle = col.line;
      g.lineWidth = 2;
      g.strokeRect(100, 140, 260, 150);
      g.fillStyle = glow(lvl.tBath * 2.2);
      g.globalAlpha = 0.35;
      g.fillRect(102, 170, 256, 118);
      g.globalAlpha = 1;
      for (let k = 0; k < 12; k++) {
        const t = (((clock * (0.2 + lvl.tBath / 600) + k / 12) % 1) + 1) % 1;
        disc(g, 120 + ((k * 53) % 220) + Math.sin(clock * 3 + k) * 4, 285 - t * 110, 2.5 + (k % 3), col.muted);
      }
      thermometer(430, 270, lvl.tBath * f, 400, `${fmt(lvl.tBath * f)} °C`);
      const rNow = lvl.r0 + ((lvl.rt - lvl.r0) * f);
      label(g, `platinum wire: ${fmt(rNow)} Ω`, 230, 120, { size: 14, color: col.text });
      label(g, `0 °C: ${lvl.r0} Ω   100 °C: ${lvl.r100} Ω`, 230, 60, { size: 13, color: col.muted });
      verdictLabel(`t = ${fmt(lvl.tBath)} °C`, 530, 160);
    }
    function drawRated() {
      if (lvl.kind !== 'rated') return;
      const f = runF();
      const v = lvl.vRated + (lvl.vNew - lvl.vRated) * f;
      const p = (v * v) / lvl.r;
      const temp = 150 + 900 * (p / lvl.pRated) * 0.75;
      const top = 110;
      const bot = 250;
      wire([70, top], [200, top]);
      wire([440, top], [560, top], [560, bot], [70, bot], [70, top]);
      supply(70, (top + bot) / 2, `${fmt(v)} V`);
      coil(200, top, 240, temp);
      flowAlong([[70, top], [560, top], [560, bot], [70, bot], [70, top]], 0.1 + (v / lvl.r) * 0.08, 12);
      label(g, `P = ${fmt(p)} W`, 320, top - 60, { size: 15, color: col.text });
      // a power bar
      g.strokeStyle = col.muted;
      g.strokeRect(590, 150, 22, 120);
      g.fillStyle = col.accent;
      const ph = 120 * Math.min(1, p / lvl.pRated);
      g.fillRect(590, 270 - ph, 22, ph);
      verdictLabel(`R = ${fmt(lvl.r)} Ω, P′ = ${fmt(lvl.pNew)} W`, 320, 300);
    }
    function drawBill() {
      if (lvl.kind !== 'bill') return;
      const f = runF();
      let x = 70;
      lvl.items.forEach((a, idx) => {
        const bx = 70 + idx * 180;
        // each appliance as a glowing bar sized by its power and its hours
        const hgt = Math.min(120, (a.watts / 1000) * 60 + 20);
        g.fillStyle = glow(a.watts * 0.8 + 200);
        g.globalAlpha = 0.5 + 0.2 * Math.sin(clock * 4 + idx);
        g.fillRect(bx, 220 - hgt, 90, hgt);
        g.globalAlpha = 1;
        g.strokeStyle = col.line;
        g.strokeRect(bx, 220 - hgt, 90, hgt);
        label(g, `${a.name} ${a.watts} W`, bx + 45, 240, { size: 13, color: col.text });
        label(g, `${a.hours} h`, bx + 45, 258, { size: 13, color: col.muted });
        x = bx;
      });
      void x;
      // the meter dial counts up when read
      g.strokeStyle = col.text;
      g.lineWidth = 2;
      g.strokeRect(220, 40, 200, 50);
      label(g, `${fmt(lvl.kwh * f)} kWh`, 320, 72, { size: 20, color: col.text });
      verdictLabel(`${fmt(lvl.kwh)} kWh, cost ${fmt(lvl.cost)}`, 320, 300);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawHot();
      drawToaster();
      drawThermo();
      drawRated();
      drawBill();
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
