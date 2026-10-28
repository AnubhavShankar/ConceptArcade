import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeLeave, judgeRod, judgeWheel, judgeWire, starsFor, type End } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const NEG = '#3156d3';
const REVEAL = 0.9;
const RUN = 3.4;
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
    let endPick: End | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A wire, loop, rod or wheel moving in a magnetic field, with charge separating along it.' });
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
    if (lvl.kind === 'wire') {
      const eIn = field('Induced emf in mV', 'ε = ? mV');
      const opts: [End, string, string][] = [['east', 'East end is at the higher potential', 'East end'], ['west', 'West end is at the higher potential', 'West end']];
      const btns: HTMLElement[] = opts.map(([v, aria, text]) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': aria, 'aria-pressed': 'false', onclick: () => {
          endPick = v;
          btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        } }, text);
        return b;
      });
      const run = () => {
        if (finished || busy()) return;
        const e = num(eIn);
        if (e === null || e <= 0) return freeNote('Enter the emf as a positive number of mV.');
        if (endPick === null) return freeNote('Choose which end is at the higher potential.');
        const res = judgeWire(lvl, e, endPick);
        verdict(res.ok);
        if (res.ok) return succeed(`ε = ${fmt(lvl.milliV)} mV, with the ${lvl.end} end at the higher potential.`);
        const parts: string[] = [];
        if (!res.eOk) parts.push('The emf is not right: ε = Blv, with the field in tesla. Give it in mV.');
        if (!res.endOk) parts.push('The end is not right: the force on positive charge is q v × B. Take north as the field and think about the direction of motion.');
        miss(parts.join(' '));
      };
      controls.append(row('Induced emf', eIn, 'mV'), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Higher potential'), ...btns), actionBtn('Let go of the wire', 'Let go of the wire', run));
      hint.textContent = `Wire ${lvl.lM} m long, speed ${lvl.v} m/s, horizontal field ${lvl.bMicro} × 10⁻⁶ T pointing north.`;
    }
    if (lvl.kind === 'leave') {
      const eIn = field('Emf across the cut in µV', 'ε = ? µV');
      const tIn = field('Duration of the emf in s', 't = ? s');
      const run = () => {
        if (finished || busy()) return;
        const e = num(eIn);
        const t = num(tIn);
        if (e === null || t === null || e <= 0 || t <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeLeave(lvl, e, t);
        verdict(res.ok);
        if (res.ok) return succeed(`ε = ${fmt(lvl.microV)} µV, lasting ${fmt(lvl.seconds)} s.`);
        const parts: string[] = [];
        if (!res.eOk) parts.push('The emf is not right: only the edge parallel to the boundary cuts the field lines as the loop leaves. Give it in µV.');
        if (!res.tOk) parts.push('The duration is not right: it is the distance the loop must travel to leave the field, divided by its speed.');
        miss(parts.join(' '));
      };
      controls.append(row('Emf', eIn, 'µV'), row('Duration', tIn, 's'), actionBtn('Pull the loop out', 'Pull the loop out', run));
      hint.textContent = `Loop ${lvl.longCm} cm by ${lvl.shortCm} cm, field ${lvl.b} T, speed ${lvl.vCm} cm/s, at right angles to the ${lvl.normalToLong ? 'longer' : 'shorter'} side.`;
    }
    if (lvl.kind === 'rod') {
      const eIn = field('Emf between the centre and the ring in V', 'ε = ? V');
      const run = () => {
        if (finished || busy()) return;
        const e = num(eIn);
        if (e === null || e <= 0) return freeNote('Enter the emf as a positive number of volts.');
        const ok = judgeRod(lvl, e).ok;
        verdict(ok);
        if (ok) return succeed(`ε = ${fmt(lvl.volts)} V.`);
        miss('That is not the emf: the speed along the rod grows from zero at the axis to ωl at the end, so the average counts. Use ω in rad/s.');
      };
      controls.append(row('Emf', eIn, 'V'), actionBtn('Spin the rod', 'Spin the rod', run));
      hint.textContent = `Rod ${lvl.lM} m long, field ${lvl.b} T along the axis, turning at ${lvl.rate} ${lvl.unit}.`;
    }
    if (lvl.kind === 'wheel') {
      const eIn = field('Emf between the axle and the rim in µV', 'ε = ? µV');
      const run = () => {
        if (finished || busy()) return;
        const e = num(eIn);
        if (e === null || e <= 0) return freeNote('Enter the emf as a positive number of µV.');
        const ok = judgeWheel(lvl, e).ok;
        verdict(ok);
        if (ok) return succeed(`ε = ${fmt(lvl.microV)} µV, whatever the number of spokes.`);
        miss('That is not the emf: each spoke is a rotating rod, and the spokes are connected in parallel between the axle and the rim. Convert the speed to rad/s and the field to tesla.');
      };
      controls.append(row('Emf', eIn, 'µV'), actionBtn('Spin the wheel', 'Spin the wheel', run));
      hint.textContent = `${lvl.spokes} spokes, each ${lvl.lM} m long, turning at ${lvl.rpm} rev/min, field ${lvl.bGauss} G (1 G = 10⁻⁴ T).`;
    }

    // ---- drawing helpers -------------------------------------------------------------------------------------------------
    const cross = (x: number, y: number, out: boolean) => {
      g.strokeStyle = col.muted;
      g.fillStyle = col.muted;
      g.lineWidth = 1.5;
      g.globalAlpha = 0.55;
      g.beginPath();
      g.arc(x, y, 7, 0, Math.PI * 2);
      g.stroke();
      if (out) disc(g, x, y, 2.2, col.muted);
      else {
        g.beginPath();
        g.moveTo(x - 4, y - 4);
        g.lineTo(x + 4, y + 4);
        g.moveTo(x + 4, y - 4);
        g.lineTo(x - 4, y + 4);
        g.stroke();
      }
      g.globalAlpha = 1;
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const runF = () => (runT === null ? 0 : ease(Math.min(1, runT / RUN)));

    function drawWire() {
      if (lvl.kind !== 'wire') return;
      const f = runF();
      const y = 100 + (lvl.falling ? 1 : -1) * 70 * (f - 0.5) * -1 * -1 + (lvl.falling ? 60 * f : -60 * f) * 0;
      const yy = lvl.falling ? 90 + 120 * f : 210 - 120 * f;
      void y;
      // the field points north: draw arrows away from the viewer's left to right as "north"
      for (let k = 0; k < 4; k++) {
        const ay = 60 + k * 60;
        g.strokeStyle = col.muted;
        g.globalAlpha = 0.45;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(50, ay);
        g.lineTo(100, ay);
        g.stroke();
        g.globalAlpha = 1;
      }
      label(g, 'B (north, into the page)', 130, 30, { size: 12, color: col.muted });
      for (let x = 120; x < 560; x += 70) for (let yv = 60; yv < 300; yv += 60) cross(x, yv, false);
      g.strokeStyle = '#b87333';
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(200, yy);
      g.lineTo(440, yy);
      g.stroke();
      label(g, 'W', 180, yy, { size: 14, color: col.text });
      label(g, 'E', 460, yy, { size: 14, color: col.text });
      // charge separates towards the end that ends up positive
      const sep = f;
      const posX = lvl.end === 'east' ? 440 : 200;
      const negX = lvl.end === 'east' ? 200 : 440;
      for (let k = 0; k < 4; k++) {
        const dx = (k - 1.5) * 8 * sep;
        disc(g, posX + (lvl.end === 'east' ? -12 - k * 6 : 12 + k * 6) * sep, yy - 10, 3, POS);
        disc(g, negX + (lvl.end === 'east' ? 12 + k * 6 : -12 - k * 6) * sep, yy + 10, 3, NEG);
        void dx;
      }
      label(g, lvl.falling ? 'falling' : 'rising', 320, yy + (lvl.falling ? -26 : 30), { size: 12, color: col.accent });
      verdictLabel(`ε = ${fmt(lvl.milliV)} mV, ${lvl.end} end positive`, 320, 322);
    }
    function drawLeave() {
      if (lvl.kind !== 'leave') return;
      const f = runF();
      // field region on the left, the loop moving right out of it
      g.fillStyle = col.accent;
      g.globalAlpha = 0.07;
      g.fillRect(40, 50, 270, 240);
      g.globalAlpha = 1;
      for (let x = 70; x < 300; x += 50) for (let yv = 80; yv < 280; yv += 50) cross(x, yv, false);
      const w = lvl.normalToLong ? 150 : 80;
      const hh = lvl.normalToLong ? 60 : 130;
      const x = 160 + f * (w + 150);
      g.strokeStyle = '#b87333';
      g.lineWidth = 5;
      g.strokeRect(x, CY - hh / 2, w, hh);
      g.fillStyle = col.panel;
      g.fillRect(x + w - 4, CY - 6, 8, 12);
      label(g, 'cut', x + w, CY + 22, { size: 11, color: col.muted });
      const inside = Math.max(0, Math.min(1, (310 - x) / w));
      const live = f > 0 && f < 1 && inside > 0 && inside < 1;
      label(g, live ? `ε = ${fmt(lvl.microV)} µV` : 'no emf', CX, 32, { size: 14, color: live ? col.accent : col.muted });
      verdictLabel(`${fmt(lvl.microV)} µV for ${fmt(lvl.seconds)} s`, CX, 322);
    }
    function drawRod() {
      if (lvl.kind !== 'rod') return;
      const a = clock * (runT === null ? 1 : 3);
      for (let x = 60; x < 600; x += 60) for (let yv = 40; yv < 320; yv += 60) cross(x, yv, false);
      g.strokeStyle = col.line;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(CX, CY, 110, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = '#b87333';
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(CX, CY);
      g.lineTo(CX + Math.cos(a) * 110, CY + Math.sin(a) * 110);
      g.stroke();
      disc(g, CX, CY, 5, col.text);
      // electrons pushed to the rim end
      for (let k = 0; k < 6; k++) disc(g, CX + Math.cos(a) * (20 + k * 15 + runF() * 0), CY + Math.sin(a) * (20 + k * 15), 3, runF() > 0 ? NEG : col.muted);
      label(g, `${lvl.rate} ${lvl.unit}`, CX, 40, { size: 13, color: col.muted });
      verdictLabel(`ε = ½Bωl² = ${fmt(lvl.volts)} V`, CX, 322);
    }
    function drawWheel() {
      if (lvl.kind !== 'wheel') return;
      const a = clock * (runT === null ? 0.8 : 2.5);
      for (let x = 60; x < 600; x += 60) for (let yv = 40; yv < 320; yv += 60) cross(x, yv, false);
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(CX, CY, 110, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = '#b87333';
      g.lineWidth = 3;
      for (let k = 0; k < lvl.spokes; k++) {
        const ang = a + (k / lvl.spokes) * Math.PI * 2;
        g.beginPath();
        g.moveTo(CX, CY);
        g.lineTo(CX + Math.cos(ang) * 110, CY + Math.sin(ang) * 110);
        g.stroke();
      }
      disc(g, CX, CY, 7, col.text);
      label(g, `${lvl.spokes} spokes, ${lvl.rpm} rev/min`, CX, 40, { size: 13, color: col.muted });
      verdictLabel(`ε = ${fmt(lvl.microV)} µV (one spoke's emf)`, CX, 322);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawWire();
      drawLeave();
      drawRod();
      drawWheel();
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
