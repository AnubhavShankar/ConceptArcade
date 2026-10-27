import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { COLOURS, buildLevel, currentThrough, explainSolution, fmt, formatOhms, judgeColour, judgeOhm, judgeOhmic, judgeRho, judgeStretch, starsFor, bandsValue, type Comp, type Rho } from './logic';

const W = 640;
const H = 340;
const NEG = '#3156d3';
const POS = '#c0392b';
const REVEAL = 0.9;
const RUN = 2.8;
const SWEEP = 2.4;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const CY = 170;
const BAND: Record<string, string> = { black: '#111', brown: '#7b4a22', red: '#d22', orange: '#f08a1c', yellow: '#f2d11d', green: '#2e9e4a', blue: '#2756c5', violet: '#7a3fb3', grey: '#8a8a8a', white: '#f4f4f4' };
const CURVE = ['#c0392b', '#3156d3', '#2e9e4a'];
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
    // level 1: the readings taken so far; level 2: the sweep of each component
    const readings: Pt[] = [];
    let lastV = 0;
    const sweepT: (number | null)[] = [null, null, null];
    const marked = new Set<string>();
    let rho: Rho | null = null;
    const bands = [1, 0, 1];

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A bench circuit with a supply, an ammeter and the component under test, with its voltage–current plot.' });
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
    if (lvl.kind === 'ohm') {
      const rIn = field('Resistance in Ω', 'R = ? Ω');
      const volts = lvl.volts.map((v) =>
        h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': `Apply ${v} V`, onclick: () => {
          if (finished) return;
          lastV = v;
          if (!readings.some(([x]) => x === v)) readings.push([v, v / lvl.r]);
        } }, `${v} V`),
      );
      const run = () => {
        if (finished || busy()) return;
        const r = num(rIn);
        if (r === null || r <= 0) return freeNote('Enter the resistance as a positive number of ohms.');
        if (!readings.length) return freeNote('Apply a voltage first and read the current.');
        const ok = judgeOhm(lvl, r).ok;
        verdict(ok);
        if (ok) return succeed(`R = ${fmt(lvl.r)} Ω.`);
        miss('That is not the resistance of this resistor. Compare the voltage with the current at each setting: what stays constant?');
      };
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Apply'), ...volts), row('Resistance', rIn, 'Ω'), actionBtn('Check the resistor', 'Check the resistor', run));
      hint.textContent = 'Apply different voltages and read the ammeter. The points build a V–I graph.';
    }
    if (lvl.kind === 'ohmic') {
      const comps = lvl.comps;
      const sweeps = comps.map((c, i) => actionBtn(`Sweep ${c.name}`, `Sweep ${c.name}`, () => {
        if (!finished && sweepT[i] === null) sweepT[i] = 0;
      }));
      const marks = comps.map((c) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': `${c.name} is ohmic`, 'aria-pressed': 'false', onclick: () => {
          if (finished) return;
          if (marked.has(c.name)) marked.delete(c.name);
          else marked.add(c.name);
          b.setAttribute('aria-pressed', String(marked.has(c.name)));
        } }, `${c.name} is ohmic`);
        return b;
      });
      const run = () => {
        if (finished || busy()) return;
        if (sweepT.some((t) => t === null)) return freeNote('Sweep every component first, so that you can see each graph.');
        const res = judgeOhmic(lvl, [...marked]);
        verdict(res.ok);
        if (res.ok) return succeed('Exactly the components with straight-line graphs through the origin obey Ohm\'s law.');
        const parts: string[] = [];
        if (res.wrong.length) parts.push(`${res.wrong.join(' and ')} ${res.wrong.length > 1 ? 'are' : 'is'} marked ohmic but the graph is curved: V/I is not constant.`);
        if (res.missed.length) parts.push(`${res.missed.join(' and ')} ${res.missed.length > 1 ? 'have' : 'has'} a graph you have not marked: look for a straight line through the origin.`);
        miss(parts.join(' '));
      };
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Sweep'), ...sweeps), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Mark'), ...marks), actionBtn('Check the components', 'Check the components', run));
      hint.textContent = 'Each sweep raises the voltage from 0 to 6 V and plots the current.';
    }
    if (lvl.kind === 'rho') {
      const rhoIn = field('Resistivity in 10⁻⁷ Ω m', 'ρ = ? × 10⁻⁷ Ω m');
      const r2In = field('Resistance of the second wire in Ω', 'R′ = ? Ω');
      const run = () => {
        if (finished || busy()) return;
        const a = num(rhoIn);
        const b = num(r2In);
        if (a === null || b === null || a <= 0 || b <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeRho(lvl, a, b);
        verdict(res.ok);
        if (res.ok) return succeed(`ρ = ${lvl.rhoE7} × 10⁻⁷ Ω m, and R′ = ${fmt(lvl.r2)} Ω.`);
        const parts: string[] = [];
        if (!res.rhoOk) parts.push('The resistivity is not right: it comes from R = ρl/A, with the area in m². Give it in units of 10⁻⁷ Ω m.');
        if (!res.r2Ok) parts.push('The resistance of the second wire is not right: think how R depends on the length and on the area, which depends on the radius.');
        miss(parts.join(' '));
      };
      controls.append(row('Resistivity', rhoIn, '10⁻⁷ Ω m'), row('Second wire', r2In, 'Ω'), actionBtn('Check the wires', 'Check the wires', run));
      hint.textContent = `Wire 1: length ${lvl.lenM} m, cross-section ${lvl.aE7} × 10⁻⁷ m², resistance ${fmt(lvl.r)} Ω. Wire 2: same material, ${lvl.lenFactor} times as long, ${lvl.radiusFactor} times the radius.`;
    }
    if (lvl.kind === 'stretch') {
      const rIn = field('New resistance in Ω', 'R′ = ? Ω');
      const opts: [Rho, string][] = [['increases', 'Resistivity increases'], ['unchanged', 'Resistivity unchanged'], ['decreases', 'Resistivity decreases']];
      const btns: HTMLElement[] = opts.map(([v, text]) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': text, 'aria-pressed': 'false', onclick: () => {
          rho = v;
          btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        } }, text);
        return b;
      });
      const run = () => {
        if (finished || busy()) return;
        const r = num(rIn);
        if (r === null || r <= 0) return freeNote('Enter the new resistance as a positive number of ohms.');
        if (rho === null) return freeNote('Choose what happens to the resistivity.');
        const res = judgeStretch(lvl, r, rho);
        verdict(res.ok);
        if (res.ok) return succeed(`R′ = ${fmt(lvl.r2)} Ω, and the resistivity is unchanged.`);
        const parts: string[] = [];
        if (!res.r2Ok) parts.push('The new resistance is not right: the wire gets longer, but its volume stays fixed, so the area changes too.');
        if (!res.rhoOk) parts.push('Think again about what the resistivity depends on: the material, or the shape?');
        miss(parts.join(' '));
      };
      controls.append(row('New resistance', rIn, 'Ω'), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Resistivity'), ...btns), actionBtn('Draw the wire', 'Draw the wire', run));
      hint.textContent = `The wire has R = ${lvl.r} Ω and is drawn out to ${lvl.k} times its length.`;
    }
    if (lvl.kind === 'colour') {
      const names = ['First band', 'Second band', 'Multiplier band'];
      const btns = names.map((name, i) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': name, onclick: () => {
          if (finished) return;
          bands[i] = (bands[i] + 1) % 10;
          b.textContent = `${name.split(' ')[0]}: ${COLOURS[bands[i]]}`;
        } }, `${name.split(' ')[0]}: ${COLOURS[bands[i]]}`);
        return b;
      });
      const run = () => {
        if (finished || busy()) return;
        const res = judgeColour(lvl, bands[0], bands[1], bands[2]);
        verdict(res.ok);
        if (res.ok) return succeed(`${formatOhms(lvl.target)}.`);
        miss(`Your bands make ${formatOhms(res.value)}, not the value asked for. Two digits, then the power of ten.`);
      };
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Bands'), ...btns), actionBtn('Check the resistor', 'Check the resistor', run));
      hint.textContent = `Make a ${formatOhms(lvl.target)} resistor. Each click moves a band to the next colour.`;
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
    const supply = (x: number, y: number, v: number) => {
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
      label(g, `${fmt(v)} V`, x, y + 36, { size: 13, color: col.muted });
    };
    const zigzag = (x: number, y: number, len: number, color: string, amp = 10) => {
      g.strokeStyle = color;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, y);
      for (let i = 0; i < 6; i++) g.lineTo(x + ((i + 0.5) / 6) * len, y + (i % 2 ? amp : -amp));
      g.lineTo(x + len, y);
      g.stroke();
    };
    const meter = (x: number, y: number, text: string) => {
      disc(g, x, y, 26, col.panel);
      g.strokeStyle = col.text;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(x, y, 26, 0, Math.PI * 2);
      g.stroke();
      label(g, 'A', x, y - 4, { size: 14, color: col.text });
      label(g, text, x, y + 44, { size: 13, color: col.text });
    };
    /** A little graph of I against V, with axes. */
    const plot = (x0: number, y0: number, w: number, hh: number, vMax: number, iMax: number) => {
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x0, y0 - hh);
      g.lineTo(x0, y0);
      g.lineTo(x0 + w, y0);
      g.stroke();
      label(g, 'V', x0 + w, y0 + 14, { size: 11, color: col.muted });
      label(g, 'I', x0 - 10, y0 - hh, { size: 11, color: col.muted });
      return (v: number, i: number): Pt => [x0 + (v / vMax) * w, y0 - (i / iMax) * hh];
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };

    function drawOhm() {
      if (lvl.kind !== 'ohm') return;
      const i = lastV ? lastV / lvl.r : 0;
      const top = 110;
      const bot = 250;
      wire([70, top], [330, top]);
      wire([430, top], [550, top], [550, bot], [70, bot], [70, top]);
      supply(70, (top + bot) / 2, lastV);
      zigzag(330, top, 100, col.text);
      if (i > 0) flowAlong([[70, top], [550, top], [550, bot], [70, bot], [70, top]], 0.1 + i * 0.15, 14);
      meter(550, (top + bot) / 2, i > 0 ? `${fmt(i)} A` : '—');
      label(g, '?  Ω', 380, top - 24, { size: 14, color: col.muted });
      const mapPt = plot(150, 290, 160, 70, 12, Math.max(...lvl.volts) / lvl.r);
      readings.forEach(([v, c]) => {
        const [px, py] = mapPt(v, c);
        disc(g, px, py, 3.5, col.accent);
      });
      if (verdictAt !== null && verdictOk) {
        g.strokeStyle = col.good;
        g.lineWidth = 2;
        g.beginPath();
        const a = mapPt(0, 0);
        const b = mapPt(12, 12 / lvl.r);
        g.moveTo(a[0], a[1]);
        g.lineTo(b[0], b[1]);
        g.stroke();
        verdictLabel(`R = ${fmt(lvl.r)} Ω`, 480, 290);
      }
    }
    function drawOhmic() {
      if (lvl.kind !== 'ohmic') return;
      const mapPt = plot(60, 300, 330, 190, 6, 1.2);
      lvl.comps.forEach((c: Comp, idx) => {
        const t = sweepT[idx];
        const f = t === null ? 0 : Math.min(1, t / SWEEP);
        const sym = (x: number, y: number) => {
          g.strokeStyle = CURVE[idx];
          g.lineWidth = 3;
          if (c.kind === 'resistor') zigzag(x, y, 70, CURVE[idx], 8);
          else if (c.kind === 'lamp') {
            g.beginPath();
            g.arc(x + 35, y, 16, 0, Math.PI * 2);
            g.moveTo(x + 24, y - 11);
            g.lineTo(x + 46, y + 11);
            g.moveTo(x + 46, y - 11);
            g.lineTo(x + 24, y + 11);
            g.stroke();
          } else {
            g.beginPath();
            g.moveTo(x + 20, y - 14);
            g.lineTo(x + 20, y + 14);
            g.lineTo(x + 50, y);
            g.closePath();
            g.moveTo(x + 52, y - 14);
            g.lineTo(x + 52, y + 14);
            g.stroke();
          }
          label(g, c.name, x + 35, y - 32, { size: 14, color: CURVE[idx] });
        };
        sym(430, 70 + idx * 90);
        if (t !== null) {
          g.strokeStyle = CURVE[idx];
          g.lineWidth = 2.5;
          g.beginPath();
          const n = Math.max(2, Math.round(f * 40));
          for (let k = 0; k <= n; k++) {
            const v = (k / 40) * 6;
            const [px, py] = mapPt(v, Math.min(1.2, currentThrough(c, v)));
            if (k) g.lineTo(px, py);
            else g.moveTo(px, py);
          }
          g.stroke();
          if (f > 0 && f < 1) {
            const [px, py] = mapPt(f * 6, Math.min(1.2, currentThrough(c, f * 6)));
            disc(g, px, py, 4, CURVE[idx]);
          }
          const iNow = currentThrough(c, f * 6);
          flowAlong([[430, 100 + idx * 90], [600, 100 + idx * 90]], 0.1 + Math.min(1, iNow) * 0.5, 6);
        }
      });
      if (verdictAt !== null && verdictOk) verdictLabel('straight line through the origin: ohmic', 220, 30);
    }
    function drawRho() {
      if (lvl.kind !== 'rho') return;
      const f = runT === null ? 0 : ease(Math.min(1, runT / RUN));
      const draw = (x: number, y: number, len: number, rad: number, text: string, sub: string) => {
        g.fillStyle = '#b87333';
        g.fillRect(x, y - rad, len, rad * 2);
        g.strokeStyle = col.line;
        g.lineWidth = 2;
        g.strokeRect(x, y - rad, len, rad * 2);
        label(g, text, x + len / 2, y - rad - 14, { size: 13, color: col.text });
        label(g, sub, x + len / 2, y + rad + 18, { size: 12, color: col.muted });
        for (let k = 0; k < 10; k++) {
          const px = x + ((((clock * 40 + k * len / 10) % len) + len) % len);
          disc(g, px, y + Math.sin(clock * 6 + k) * (rad - 3) * 0.6, 2.8, NEG);
        }
      };
      draw(60, 100, 200, 14, `l = ${lvl.lenM} m`, `R = ${fmt(lvl.r)} Ω, ρ = ?`);
      const len2 = 200 * (1 + (lvl.lenFactor - 1) * f) * (lvl.lenFactor > 2 ? 0.8 : 1);
      const rad2 = 14 * (1 + (lvl.radiusFactor - 1) * f);
      draw(60, 220, Math.min(len2, 520), rad2, runT === null ? 'wire 2: same material' : `${lvl.lenFactor}× longer, ${lvl.radiusFactor}× radius`, runT === null ? 'R′ = ?' : 'R′ = ?');
      verdictLabel(`ρ = ${lvl.rhoE7} × 10⁻⁷ Ω m, R′ = ${fmt(lvl.r2)} Ω`, 320, 310);
    }
    function drawStretch() {
      if (lvl.kind !== 'stretch') return;
      const f = runT === null ? 0 : ease(Math.min(1, runT / RUN));
      const len = 160 * (1 + (lvl.k - 1) * f);
      const rad = 28 / Math.sqrt(1 + (lvl.k - 1) * f);
      g.fillStyle = '#b87333';
      g.fillRect(60, CY - rad, Math.min(len, 520), rad * 2);
      g.strokeStyle = col.line;
      g.lineWidth = 2;
      g.strokeRect(60, CY - rad, Math.min(len, 520), rad * 2);
      for (let k = 0; k < 14; k++) {
        const L = Math.min(len, 520);
        const px = 60 + ((((clock * 50 + (k * L) / 14) % L) + L) % L);
        disc(g, px, CY + Math.sin(clock * 5 + k) * (rad - 4) * 0.6, 3, NEG);
      }
      label(g, `volume fixed: length × ${fmt(1 + (lvl.k - 1) * f)}`, 320, 70, { size: 13, color: col.muted });
      label(g, `R = ${lvl.r} Ω`, 100, CY + 70, { size: 13, color: col.text });
      verdictLabel(`R′ = ${fmt(lvl.r2)} Ω`, 320, 290);
    }
    function drawColour() {
      if (lvl.kind !== 'colour') return;
      // the resistor body with its bands
      g.strokeStyle = col.muted;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(60, CY);
      g.lineTo(200, CY);
      g.moveTo(440, CY);
      g.lineTo(580, CY);
      g.stroke();
      g.fillStyle = '#d9c49b';
      g.fillRect(200, CY - 38, 240, 76);
      g.strokeStyle = col.line;
      g.lineWidth = 2;
      g.strokeRect(200, CY - 38, 240, 76);
      [0, 1, 2].forEach((i) => {
        g.fillStyle = BAND[COLOURS[bands[i]]];
        g.fillRect(230 + i * 44, CY - 38, 20, 76);
        g.strokeRect(230 + i * 44, CY - 38, 20, 76);
      });
      g.fillStyle = '#c9a227';
      g.fillRect(390, CY - 38, 16, 76);
      const now = bandsValue(bands[0], bands[1], bands[2]);
      label(g, `your resistor: ${formatOhms(now)}`, 320, CY + 66, { size: 14, color: col.text });
      label(g, `target: ${formatOhms(lvl.target)}`, 320, 50, { size: 14, color: col.muted });
      if (runT !== null) flowAlong([[60, CY + 90], [580, CY + 90]], verdictOk ? 0.5 : 0.1, 10);
      verdictLabel(`${formatOhms(lvl.target)}`, 320, 290);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      sweepT.forEach((t, i) => {
        if (t !== null && t < SWEEP + 0.2) sweepT[i] = t + dt;
      });
      g.clearRect(0, 0, W, H);
      drawOhm();
      drawOhmic();
      drawRho();
      drawStretch();
      drawColour();
      if (verdictAt !== null && clock - verdictAt < REVEAL) {
        g.strokeStyle = verdictOk ? col.good : col.bad;
        g.lineWidth = 6;
        g.globalAlpha = 1 - (clock - verdictAt) / REVEAL;
        g.strokeRect(3, 3, W - 6, H - 6);
        g.globalAlpha = 1;
      }
      const sweeping = sweepT.some((t) => t !== null && t < SWEEP);
      const phase = verdictAt === null ? (sweeping ? 'testing' : 'idle') : busy() || clock - verdictAt < REVEAL ? 'testing' : 'done';
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
