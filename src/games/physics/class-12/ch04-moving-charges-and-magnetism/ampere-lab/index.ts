import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeNeutral, judgeSolenoid, judgeThick, judgeToroid, judgeWire, netOnLineUT, starsFor, thickWireUT, type Dir, type Hole } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const REVEAL = 0.9;
const RUN = 3;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const CX = 320;
const CY = 175;
const DIRS: Dir[] = ['up', 'down', 'left', 'right'];

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
    let dirPick: Dir | null = null;
    let holePick: Hole | null = null;
    let probe = lvl.kind === 'neutral' ? lvl.dCm / 2 : 0;
    let touched = false;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'Wires, a solenoid or a toroid with the circular field lines of Ampère\'s law drawn round them.' });
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
    const choice = <T extends string>(name: string, opts: [T, string, string][], onPick: (v: T) => void) => {
      const btns: HTMLElement[] = opts.map(([v, aria, text]) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': aria, 'aria-pressed': 'false', onclick: () => {
          onPick(v);
          btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        } }, text);
        return b;
      });
      return h('div', { class: 'control' }, h('span', { class: 'control-label' }, name), ...btns);
    };

    // ---- the levels -------------------------------------------------------------------------------------------
    if (lvl.kind === 'wire') {
      const bIn = field('Field in µT', 'B = ? µT');
      const run = () => {
        if (finished || busy()) return;
        const b = num(bIn);
        if (b === null || b <= 0) return freeNote('Enter the field as a positive number of µT.');
        if (dirPick === null) return freeNote('Choose the direction of the field at the point.');
        const res = judgeWire(lvl, b, dirPick);
        verdict(res.ok);
        if (res.ok) return succeed(`B = ${fmt(lvl.ut)} µT, pointing ${lvl.dir}.`);
        const parts: string[] = [];
        if (!res.bOk) parts.push('The size is not right: Ampère\'s law round a circle through the point gives the field. Give it in µT.');
        if (!res.dirOk) parts.push('The direction is not right: the field circles the wire, so it is at right angles to the line from the wire to the point. Use the right-hand grip rule.');
        miss(parts.join(' '));
      };
      controls.append(row('Field', bIn, 'µT'), choice<Dir>('Direction', DIRS.map((d) => [d, `Field points ${d}`, d] as [Dir, string, string]), (d) => (dirPick = d)), actionBtn('Measure the field', 'Measure the field', run));
      hint.textContent = `A long wire carries ${lvl.i} A ${lvl.currentOut ? 'out of the page (dot)' : 'into the page (cross)'}. The point is ${lvl.rM} m to the ${lvl.pos === 'above' || lvl.pos === 'below' ? lvl.pos : lvl.pos} of the wire.`;
    }
    if (lvl.kind === 'thick') {
      const inIn = field('Field inside the wire in µT', 'B inside = ? µT');
      const outIn = field('Field outside the wire in µT', 'B outside = ? µT');
      const run = () => {
        if (finished || busy()) return;
        const a = num(inIn);
        const b = num(outIn);
        if (a === null || b === null || a <= 0 || b <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeThick(lvl, a, b);
        verdict(res.ok);
        if (res.ok) return succeed(`Inside ${fmt(lvl.inUt)} µT, outside ${fmt(lvl.outUt)} µT.`);
        const parts: string[] = [];
        if (!res.inOk) parts.push('The field inside is not right: a circle inside the wire encloses only part of the current.');
        if (!res.outOk) parts.push('The field outside is not right: a circle outside encloses all of the current.');
        miss(parts.join(' '));
      };
      controls.append(row('Inside the wire', inIn, 'µT'), row('Outside the wire', outIn, 'µT'), actionBtn('Measure the field', 'Measure the field', run));
      hint.textContent = `Wire radius ${lvl.aMm} mm carrying ${lvl.i} A. The inside point is ${fmt(lvl.rInMm)} mm from the axis and the outside point ${fmt(lvl.rOutMm)} mm.`;
    }
    if (lvl.kind === 'neutral') {
      const slider = h('input', { type: 'range', min: String(-Math.round(lvl.dCm)), max: String(Math.ceil(lvl.dCm * 2.6)), step: '0.5', value: String(lvl.dCm / 2), 'aria-label': 'Probe position in cm' }) as HTMLInputElement;
      const sync = () => {
        probe = Number(slider.value);
        touched = true;
      };
      slider.addEventListener('input', sync);
      slider.addEventListener('change', sync);
      const xIn = field('Distance from wire 1 in cm', 'x = ? cm');
      const run = () => {
        if (finished || busy()) return;
        if (!touched) return freeNote('Move the probe along the line first and watch the meter.');
        const x = num(xIn);
        if (x === null || x <= 0) return freeNote('Enter the distance as a positive number of cm.');
        const ok = judgeNeutral(lvl, x).ok;
        verdict(ok);
        if (ok) return succeed(`The fields cancel ${fmt(lvl.xCm)} cm from wire 1.`);
        miss('That is not the point where the fields cancel. At the neutral point the two fields are equal in size and opposite in direction: where does the meter read zero?');
      };
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Probe'), slider), row('Neutral point', xIn, 'cm'), actionBtn('Check the null point', 'Check the null point', run));
      hint.textContent = `Wire 1 carries ${lvl.i1} A and wire 2 carries ${lvl.i2} A, ${lvl.same ? 'in the same direction' : 'in opposite directions'}, ${lvl.dCm} cm apart. Distances are measured from wire 1.`;
    }
    if (lvl.kind === 'solenoid') {
      const nIn = field('Turns per metre', 'n = ? per m');
      const bIn = field('Field in mT', 'B = ? mT');
      const run = () => {
        if (finished || busy()) return;
        const n = num(nIn);
        const b = num(bIn);
        if (n === null || b === null || n <= 0 || b <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeSolenoid(lvl, n, b);
        verdict(res.ok);
        if (res.ok) return succeed(`n = ${fmt(lvl.n)} per metre and B = ${fmt(lvl.mt)} mT.`);
        const parts: string[] = [];
        if (!res.nOk) parts.push('The turns per metre are not right: count all the turns in all the layers, then divide by the length in metres.');
        if (!res.bOk) parts.push('The field is not right: inside a long solenoid it depends on the turns per unit length and the current. Give it in mT.');
        miss(parts.join(' '));
      };
      controls.append(row('Turns per metre', nIn, '/m'), row('Field', bIn, 'mT'), actionBtn('Measure the field', 'Measure the field', run));
      hint.textContent = `${lvl.layers} layer${lvl.layers > 1 ? 's' : ''} of ${lvl.perLayer} turns on a length of ${lvl.lCm} cm, carrying ${lvl.i} A.`;
    }
    if (lvl.kind === 'toroid') {
      const bIn = field('Field in the winding in mT', 'B = ? mT');
      const run = () => {
        if (finished || busy()) return;
        const b = num(bIn);
        if (b === null || b <= 0) return freeNote('Enter the field as a positive number of mT.');
        if (holePick === null) return freeNote('Choose what the field is in the hole of the ring.');
        const res = judgeToroid(lvl, b, holePick);
        verdict(res.ok);
        if (res.ok) return succeed(`B = ${fmt(lvl.mt)} mT in the winding, and zero in the hole.`);
        const parts: string[] = [];
        if (!res.bOk) parts.push('The field in the winding is not right: use Ampère\'s law round a circle at the mean radius. Give it in mT.');
        if (!res.holeOk) parts.push('Think about a circle in the hole: how much current does it enclose?');
        miss(parts.join(' '));
      };
      controls.append(
        row('Field in winding', bIn, 'mT'),
        choice<Hole>('In the hole', [['zero', 'Field in the hole is zero', 'Zero'], ['same', 'Field in the hole is the same as in the winding', 'Same as winding'], ['half', 'Field in the hole is half that in the winding', 'Half']], (v) => (holePick = v)),
        actionBtn('Measure the field', 'Measure the field', run),
      );
      hint.textContent = `A toroid of ${lvl.turns} turns carrying ${lvl.i} A, mean radius ${lvl.rCm} cm.`;
    }

    // ---- drawing helpers -------------------------------------------------------------------------------------------------
    const symbol = (x: number, y: number, out: boolean, size: number, color: string) => {
      g.strokeStyle = color;
      g.fillStyle = color;
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(x, y, size, 0, Math.PI * 2);
      g.stroke();
      if (out) disc(g, x, y, size * 0.28, color);
      else {
        g.beginPath();
        g.moveTo(x - size * 0.6, y - size * 0.6);
        g.lineTo(x + size * 0.6, y + size * 0.6);
        g.moveTo(x + size * 0.6, y - size * 0.6);
        g.lineTo(x - size * 0.6, y + size * 0.6);
        g.stroke();
      }
    };
    const arrowHead = (x: number, y: number, ux: number, uy: number, color: string, size = 7) => {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(x + ux * size, y + uy * size);
      g.lineTo(x - uy * size * 0.7 - ux * size * 0.4, y + ux * size * 0.7 - uy * size * 0.4);
      g.lineTo(x + uy * size * 0.7 - ux * size * 0.4, y - ux * size * 0.7 - uy * size * 0.4);
      g.fill();
    };
    /** Circular field lines round a wire at (cx, cy), anticlockwise on screen when ccw is true, with arrowheads drifting round. */
    const circles = (cx: number, cy: number, radii: number[], ccw: boolean, color: string) => {
      radii.forEach((r, k) => {
        g.strokeStyle = color;
        g.lineWidth = 1.5;
        g.globalAlpha = 0.55;
        g.beginPath();
        g.arc(cx, cy, r, 0, Math.PI * 2);
        g.stroke();
        g.globalAlpha = 1;
        for (let a = 0; a < 3; a++) {
          const ang = ((clock * 0.35 * (ccw ? -1 : 1)) / (1 + k * 0.3)) + (a * Math.PI * 2) / 3;
          const x = cx + Math.cos(ang) * r;
          const y = cy + Math.sin(ang) * r;
          // tangent in the direction of travel: derivative of the angle
          const s = ccw ? -1 : 1;
          arrowHead(x, y, -Math.sin(ang) * s, Math.cos(ang) * s, color, 6);
        }
      });
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const runF = () => (runT === null ? 0 : ease(Math.min(1, runT / RUN)));

    function drawWire() {
      if (lvl.kind !== 'wire') return;
      const wx = CX - 60;
      const wy = CY;
      const rp = Math.min(130, 40 + lvl.rM * 38);
      circles(wx, wy, [rp * 0.45, rp, rp * 1.5], lvl.currentOut, col.accent);
      symbol(wx, wy, lvl.currentOut, 16, POS);
      label(g, `${lvl.i} A`, wx, wy + 32, { size: 12, color: col.text });
      const off: Record<string, [number, number]> = { right: [rp, 0], left: [-rp, 0], above: [0, -rp], below: [0, rp] };
      const [dx, dy] = off[lvl.pos];
      const px = wx + dx;
      const py = wy + dy;
      g.strokeStyle = col.muted;
      g.setLineDash([5, 5]);
      g.beginPath();
      g.moveTo(wx, wy);
      g.lineTo(px, py);
      g.stroke();
      g.setLineDash([]);
      label(g, `r = ${lvl.rM} m`, wx + dx / 2, wy + dy / 2 - 12, { size: 12, color: col.muted });
      disc(g, px, py, 5, col.text);
      const f = runF();
      if (f > 0) {
        const vec: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
        const [vx, vy] = vec[lvl.dir];
        g.strokeStyle = col.good;
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px + vx * 46 * f, py + vy * 46 * f);
        g.stroke();
        arrowHead(px + vx * 46 * f, py + vy * 46 * f, vx, vy, col.good, 9);
        label(g, 'B', px + vx * 66 * f, py + vy * 66 * f, { size: 14, color: col.good });
      } else label(g, '?', px + 18, py - 14, { size: 18, color: col.accent });
      verdictLabel(`B = ${fmt(lvl.ut)} µT, ${lvl.dir}`, CX + 130, 32);
    }
    function drawThick() {
      if (lvl.kind !== 'thick') return;
      const cx = 170;
      const R = 70;
      g.fillStyle = '#b87333';
      g.globalAlpha = 0.45;
      disc(g, cx, CY, R, '#b87333');
      g.globalAlpha = 1;
      g.strokeStyle = '#b87333';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(cx, CY, R, 0, Math.PI * 2);
      g.stroke();
      // current dots spread uniformly over the section
      for (let k = 0; k < 28; k++) {
        const a = k * 2.399963;
        const rr = Math.sqrt((k + 0.5) / 28) * (R - 6);
        symbol(cx + Math.cos(a) * rr, CY + Math.sin(a) * rr, true, 5, POS);
      }
      const rin = (lvl.rInMm / lvl.aMm) * R;
      const rout = Math.min(125, (lvl.rOutMm / lvl.aMm) * R);
      g.strokeStyle = col.accent;
      g.setLineDash([4, 4]);
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(cx, CY, rin, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(cx, CY, rout, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
      disc(g, cx + rin, CY, 4, col.accent);
      disc(g, cx + rout, CY, 4, col.accent);
      label(g, 'inside', cx + rin, CY - 12, { size: 11, color: col.accent });
      label(g, 'outside', cx + rout, CY - 12, { size: 11, color: col.accent });
      // B against r
      const gx = 370;
      const gy = 290;
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(gx, gy);
      g.lineTo(600, gy);
      g.moveTo(gx, gy);
      g.lineTo(gx, 90);
      g.stroke();
      label(g, 'B', gx - 10, 90, { size: 11, color: col.muted });
      label(g, 'r', 600, gy + 12, { size: 11, color: col.muted });
      const rMax = Math.max(lvl.rOutMm, lvl.aMm * 3) * 1.05;
      const bMax = thickWireUT(lvl.i, lvl.aMm, lvl.aMm - 1e-9) * 1.1;
      g.strokeStyle = col.accent;
      g.lineWidth = 2.5;
      g.beginPath();
      const f = runT === null ? 0.35 : Math.max(0.35, runF());
      for (let k = 0; k <= 80 * f; k++) {
        const r = (k / 80) * rMax;
        const b = Math.min(bMax * 1.1, thickWireUT(lvl.i, lvl.aMm, Math.max(r, 1e-6)));
        const x = gx + (r / rMax) * 220;
        const y = gy - (b / bMax) * 180;
        if (k) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.stroke();
      const mark = (r: number, b: number) => disc(g, gx + (r / rMax) * 220, gy - (b / bMax) * 180, 5, col.accent);
      mark(lvl.rInMm, lvl.inUt);
      mark(lvl.rOutMm, lvl.outUt);
      g.strokeStyle = col.muted;
      g.setLineDash([3, 4]);
      g.beginPath();
      g.moveTo(gx + (lvl.aMm / rMax) * 220, gy);
      g.lineTo(gx + (lvl.aMm / rMax) * 220, 100);
      g.stroke();
      g.setLineDash([]);
      label(g, 'surface', gx + (lvl.aMm / rMax) * 220, 90, { size: 11, color: col.muted });
      verdictLabel(`inside ${fmt(lvl.inUt)} µT, outside ${fmt(lvl.outUt)} µT`, CX, 32);
    }
    function drawNeutral() {
      if (lvl.kind !== 'neutral') return;
      const lo = -Math.round(lvl.dCm);
      const hi = Math.ceil(lvl.dCm * 2.6);
      const sx = (x: number) => 60 + ((x - lo) / (hi - lo)) * 520;
      const ly = 170;
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(60, ly);
      g.lineTo(580, ly);
      g.stroke();
      symbol(sx(0), ly, true, 14, POS);
      symbol(sx(lvl.dCm), ly, lvl.same, 14, POS);
      label(g, `wire 1: ${lvl.i1} A`, sx(0), ly + 36, { size: 12, color: col.text });
      label(g, `wire 2: ${lvl.i2} A`, sx(lvl.dCm), ly + 36, { size: 12, color: col.text });
      // the probe and the meter
      const i2 = lvl.same ? lvl.i2 : -lvl.i2;
      const near = Math.abs(probe) < 0.4 || Math.abs(probe - lvl.dCm) < 0.4;
      const b = near ? 0 : netOnLineUT(probe, lvl.i1, i2, lvl.dCm);
      const px = sx(probe);
      g.strokeStyle = col.accent;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(px, ly - 22);
      g.lineTo(px, ly + 12);
      g.stroke();
      disc(g, px, ly - 24, 4, col.accent);
      // the meter: a bar that swings either side of zero
      const mx = 320;
      const my = 70;
      g.strokeStyle = col.text;
      g.lineWidth = 2;
      g.strokeRect(mx - 120, my - 16, 240, 32);
      g.beginPath();
      g.moveTo(mx, my - 16);
      g.lineTo(mx, my + 16);
      g.stroke();
      const swing = near ? 0 : Math.tanh(b / 40) * 118;
      g.fillStyle = Math.abs(b) < 0.5 && !near ? col.good : POS;
      g.globalAlpha = 0.8;
      g.fillRect(swing >= 0 ? mx : mx + swing, my - 12, Math.abs(swing), 24);
      g.globalAlpha = 1;
      label(g, near ? 'too close to a wire' : Math.abs(b) < 0.5 ? 'net field ≈ 0' : `net field ${fmt(b)} µT ${b > 0 ? 'up' : 'down'}`, mx, my + 36, { size: 12, color: col.text });
      label(g, `${fmt(probe)} cm`, px, ly + 60, { size: 12, color: col.accent });
      const f = runF();
      if (f > 0 && verdictOk) {
        const nx = sx(lvl.xCm);
        g.strokeStyle = col.good;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(nx, ly - 30 * f);
        g.lineTo(nx, ly + 30 * f);
        g.stroke();
        label(g, 'neutral point', nx, ly - 44, { size: 12, color: col.good });
      }
      verdictLabel(`x = ${fmt(lvl.xCm)} cm from wire 1`, CX, 318);
    }
    function drawSolenoid() {
      if (lvl.kind !== 'solenoid') return;
      const x0 = 130;
      const x1 = 510;
      const top = 110;
      const bot = 240;
      const turns = 14;
      g.strokeStyle = '#b87333';
      g.lineWidth = 3;
      for (let k = 0; k < turns; k++) {
        const x = x0 + ((k + 0.5) / turns) * (x1 - x0);
        g.beginPath();
        g.ellipse(x, (top + bot) / 2, 8, (bot - top) / 2, 0, 0, Math.PI * 2);
        g.stroke();
      }
      // the uniform field inside, arrows drifting along the axis
      const f = runF();
      for (let k = 0; k < 5; k++) {
        const y = top + 22 + k * ((bot - top - 44) / 4);
        const t = (((clock * 0.3 + k * 0.17) % 1) + 1) % 1;
        const x = x0 + 10 + t * (x1 - x0 - 20);
        g.strokeStyle = col.accent;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x - 14, y);
        g.lineTo(x + 14, y);
        g.stroke();
        arrowHead(x + 14, y, 1, 0, col.accent, 6);
      }
      // the field is weak and spread out on the outside
      g.strokeStyle = col.muted;
      g.lineWidth = 1;
      g.globalAlpha = 0.5;
      g.beginPath();
      g.moveTo(x1 + 10, top);
      g.bezierCurveTo(x1 + 90, top - 50, x0 - 90, top - 50, x0 - 10, top);
      g.stroke();
      g.globalAlpha = 1;
      label(g, 'weak outside', CX, top - 40, { size: 12, color: col.muted });
      label(g, `n = ${f > 0 ? fmt(lvl.n) : '?'} per m`, CX, bot + 34, { size: 13, color: col.text });
      label(g, `${lvl.i} A`, x0 - 36, (top + bot) / 2, { size: 12, color: col.text });
      verdictLabel(`B = ${fmt(lvl.mt)} mT inside`, CX, 32);
    }
    function drawToroid() {
      if (lvl.kind !== 'toroid') return;
      const Ro = 105;
      const Ri = 62;
      const Rm = (Ro + Ri) / 2;
      g.strokeStyle = col.line;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(CX, CY, Ro, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(CX, CY, Ri, 0, Math.PI * 2);
      g.stroke();
      for (let k = 0; k < 36; k++) {
        const a = (k / 36) * Math.PI * 2;
        g.strokeStyle = '#b87333';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(CX + Math.cos(a) * Ri, CY + Math.sin(a) * Ri);
        g.lineTo(CX + Math.cos(a) * Ro, CY + Math.sin(a) * Ro);
        g.stroke();
      }
      // the field circulates inside the winding only
      for (let k = 0; k < 8; k++) {
        const a = clock * 0.5 + (k / 8) * Math.PI * 2;
        arrowHead(CX + Math.cos(a) * Rm, CY + Math.sin(a) * Rm, -Math.sin(a), Math.cos(a), col.accent, 8);
      }
      g.strokeStyle = col.accent;
      g.lineWidth = 2;
      g.globalAlpha = 0.6;
      g.beginPath();
      g.arc(CX, CY, Rm, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
      label(g, runT === null ? 'hole: ?' : 'hole: B = 0', CX, CY, { size: 13, color: runT === null ? col.accent : col.good });
      label(g, `${lvl.turns} turns, ${lvl.i} A`, CX, 28, { size: 13, color: col.muted });
      verdictLabel(`B = ${fmt(lvl.mt)} mT in the winding`, CX, 318);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawWire();
      drawThick();
      drawNeutral();
      drawSolenoid();
      drawToroid();
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
