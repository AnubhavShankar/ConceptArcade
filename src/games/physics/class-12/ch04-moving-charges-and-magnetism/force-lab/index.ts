import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeCircle, judgeHelix, judgeLorentz, judgeSpeed, judgeWire, starsFor, type Dir, type FreqChange } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const NEG = '#3156d3';
const REVEAL = 0.9;
const RUN = 3.4;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const CX = 320;
const CY = 170;
const DIRS: Dir[] = ['up', 'down', 'left', 'right'];
const VEC: Record<Dir, [number, number]> = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] }; // screen coordinates, y down

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
    let freqPick: FreqChange | null = null;
    let wireFall = 0; // level 2 levitation: -1 falls, +1 rises, 0 hovers
    let fired = false;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A charged particle or a wire in a magnetic field, with the field drawn as dots or crosses.' });
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
      fired = true;
    };
    const busy = () => runT !== null && runT < RUN;
    const field = (aria: string, placeholder: string) => h('input', { class: 'field', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': aria, placeholder }) as HTMLInputElement;
    const num = (el: HTMLInputElement) => parseNumber(el.value);
    const actionBtn = (text: string, aria: string, fn: () => void) => h('button', { class: 'btn', type: 'button', 'aria-label': aria, onclick: fn }, text);
    const row = (name: string, input: HTMLElement, unit: string) => h('div', { class: 'control' }, h('span', { class: 'control-label' }, name), input, h('span', { class: 'unit' }, unit));
    const choice = <T extends string>(name: string, opts: [T, string][], onPick: (v: T) => void) => {
      const btns: HTMLElement[] = opts.map(([v, text]) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': text, 'aria-pressed': 'false', onclick: () => {
          onPick(v);
          btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        } }, text);
        return b;
      });
      return h('div', { class: 'control' }, h('span', { class: 'control-label' }, name), ...btns);
    };

    // ---- the levels -------------------------------------------------------------------------------------------
    if (lvl.kind === 'lorentz') {
      const fIn = field('Force in 10⁻¹³ N', 'F = ? × 10⁻¹³ N');
      const run = () => {
        if (finished || busy()) return;
        const f = num(fIn);
        if (f === null || f <= 0) return freeNote('Enter the force as a positive number.');
        if (dirPick === null) return freeNote('Choose the direction of the force.');
        const res = judgeLorentz(lvl, dirPick, f);
        verdict(res.ok);
        if (res.ok) return succeed(`The force points ${lvl.dir}, F = ${fmt(lvl.f13)} × 10⁻¹³ N.`);
        const parts: string[] = [];
        if (!res.dirOk) parts.push('The direction is not right: the force is perpendicular to both the velocity and the field, and a negative charge is pushed the opposite way to a positive one.');
        if (!res.fOk) parts.push('The size is not right: the velocity is perpendicular to the field, so F = qvB. Give it in units of 10⁻¹³ N.');
        miss(parts.join(' '));
      };
      controls.append(
        choice<Dir>('Force points', DIRS.map((d) => [d, `Force points ${d}`] as [Dir, string]), (d) => (dirPick = d)),
        row('Force', fIn, '10⁻¹³ N'),
        actionBtn('Fire the charge', 'Fire the charge', run),
      );
      hint.textContent = `The ${lvl.negative ? 'electron' : 'proton'} moves ${lvl.v} at ${lvl.v6} × 10⁶ m/s. The field is ${lvl.b} T, pointing ${lvl.bOut ? 'out of the page (dots)' : 'into the page (crosses)'}.`;
    }
    if (lvl.kind === 'wire') {
      const aria = lvl.mode === 'force' ? 'Force on the wire in mN' : 'Field needed in T';
      const aIn = field(aria, lvl.mode === 'force' ? 'F = ? mN' : 'B = ? T');
      const run = () => {
        if (finished || busy()) return;
        const a = num(aIn);
        if (a === null || a <= 0) return freeNote('Enter a positive number.');
        const res = judgeWire(lvl, a);
        if (lvl.mode === 'levitate') wireFall = res.ok ? 0 : a < lvl.answer ? -1 : 1;
        verdict(res.ok);
        if (res.ok) return succeed(lvl.mode === 'force' ? `F = ${fmt(lvl.answer)} mN.` : `B = ${fmt(lvl.answer)} T.`);
        miss(lvl.mode === 'force' ? 'That is not the force on the wire: only the part of the field across the wire pushes it. Give it in mN.' : lvl.mode === 'levitate' && wireFall === -1 ? 'With that field the wire sags: the magnetic force is smaller than its weight.' : 'With that field the wire shoots up: the magnetic force is bigger than its weight.');
      };
      controls.append(lvl.mode === 'force' ? row('Force', aIn, 'mN') : row('Field', aIn, 'T'), actionBtn(lvl.mode === 'force' ? 'Switch on the field' : 'Release the wire', lvl.mode === 'force' ? 'Switch on the field' : 'Release the wire', run));
      hint.textContent = lvl.mode === 'force' ? `Wire ${lvl.lCm} cm long, current ${lvl.i} A, field ${lvl.b} T at ${lvl.theta}° to the wire.` : `Wire mass ${lvl.mGram} g, length ${lvl.lCm / 100} m, current ${lvl.i} A. Take g = 9.8 m/s².`;
    }
    if (lvl.kind === 'circle') {
      const rIn = field('Orbit radius in cm', 'r = ? cm');
      const fIn = field('Frequency in MHz', 'f = ? MHz');
      const run = () => {
        if (finished || busy()) return;
        const r = num(rIn);
        const f = num(fIn);
        if (r === null || f === null || r <= 0 || f <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeCircle(lvl, r, f);
        verdict(res.ok);
        if (res.ok) return succeed(`r = ${fmt(lvl.rCm)} cm and f = ${fmt(lvl.fMHz)} MHz.`);
        const parts: string[] = [];
        if (!res.rOk) parts.push('The radius is not right: the magnetic force supplies the centripetal force. Give it in cm.');
        if (!res.fOk) parts.push('The frequency is not right: it is how many circuits per second, in MHz.');
        miss(parts.join(' '));
      };
      controls.append(row('Radius', rIn, 'cm'), row('Frequency', fIn, 'MHz'), actionBtn('Fire the electron', 'Fire the electron', run));
      hint.textContent = `Electron speed ${lvl.v6} × 10⁶ m/s, perpendicular to a field of ${lvl.bGauss} G (1 G = 10⁻⁴ T). e = 1.6 × 10⁻¹⁹ C, m = 9.1 × 10⁻³¹ kg.`;
    }
    if (lvl.kind === 'speed') {
      const rIn = field('New orbit radius in cm', 'r′ = ? cm');
      const run = () => {
        if (finished || busy()) return;
        const r = num(rIn);
        if (r === null || r <= 0) return freeNote('Enter the radius as a positive number of cm.');
        if (freqPick === null) return freeNote('Choose what happens to the frequency.');
        const res = judgeSpeed(lvl, r, freqPick);
        verdict(res.ok);
        if (res.ok) return succeed(`r′ = ${fmt(lvl.r2Cm)} cm, and the frequency is unchanged.`);
        const parts: string[] = [];
        if (!res.rOk) parts.push('The new radius is not right: how does the radius depend on the speed?');
        if (!res.fOk) parts.push('Think again about the frequency: does the time for one circuit depend on the speed, or does the circle just get bigger?');
        miss(parts.join(' '));
      };
      controls.append(row('New radius', rIn, 'cm'), choice<FreqChange>('Frequency', [['increases', 'Frequency increases'], ['unchanged', 'Frequency unchanged'], ['decreases', 'Frequency decreases']], (v) => (freqPick = v)), actionBtn('Change the speed', 'Change the speed', run));
      hint.textContent = `The electron circled at ${lvl.v6} × 10⁶ m/s with radius ${fmt(lvl.rCm)} cm in ${lvl.bGauss} G. Its speed is now multiplied by ${lvl.factor}.`;
    }
    if (lvl.kind === 'helix') {
      const rIn = field('Helix radius in cm', 'r = ? cm');
      const pIn = field('Pitch in cm', 'p = ? cm');
      const run = () => {
        if (finished || busy()) return;
        const r = num(rIn);
        const p = num(pIn);
        if (r === null || p === null || r <= 0 || p <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeHelix(lvl, r, p);
        verdict(res.ok);
        if (res.ok) return succeed(`r = ${fmt(lvl.rCm)} cm and pitch ${fmt(lvl.pitchCm)} cm.`);
        const parts: string[] = [];
        if (!res.rOk) parts.push('The radius is not right: only the part of the velocity across the field makes the electron circle.');
        if (!res.pOk) parts.push('The pitch is not right: it is how far the electron moves along the field during one revolution.');
        miss(parts.join(' '));
      };
      controls.append(row('Radius', rIn, 'cm'), row('Pitch', pIn, 'cm'), actionBtn('Fire the electron', 'Fire the electron', run));
      hint.textContent = `Electron speed ${lvl.v6} × 10⁶ m/s at ${lvl.theta}° to a field of ${lvl.bGauss} G.`;
    }

    // ---- drawing helpers -------------------------------------------------------------------------------------------------
    /** The field out of or into the page as a grid of dots or crosses. */
    const fieldGrid = (out: boolean) => {
      g.strokeStyle = col.muted;
      g.fillStyle = col.muted;
      g.lineWidth = 1.5;
      g.globalAlpha = 0.55;
      for (let x = 40; x < W; x += 56) {
        for (let y = 30; y < H; y += 56) {
          if (out) {
            g.beginPath();
            g.arc(x, y, 8, 0, Math.PI * 2);
            g.stroke();
            disc(g, x, y, 2.5, col.muted);
          } else {
            g.beginPath();
            g.moveTo(x - 6, y - 6);
            g.lineTo(x + 6, y + 6);
            g.moveTo(x + 6, y - 6);
            g.lineTo(x - 6, y + 6);
            g.stroke();
          }
        }
      }
      g.globalAlpha = 1;
    };
    const arrow = (x: number, y: number, dx: number, dy: number, color: string, text = '') => {
      const len = Math.hypot(dx, dy);
      if (len < 1) return;
      const ux = dx / len;
      const uy = dy / len;
      g.strokeStyle = color;
      g.fillStyle = color;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + dx, y + dy);
      g.stroke();
      g.beginPath();
      g.moveTo(x + dx + ux * 8, y + dy + uy * 8);
      g.lineTo(x + dx - uy * 6, y + dy + ux * 6);
      g.lineTo(x + dx + uy * 6, y + dy - ux * 6);
      g.fill();
      if (text) label(g, text, x + dx + ux * 24, y + dy + uy * 16, { size: 12, color });
    };
    const particle = (x: number, y: number, negative: boolean) => {
      disc(g, x, y, 9, negative ? NEG : POS);
      label(g, negative ? '−' : '+', x, y + 1, { size: 13, color: '#fff' });
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const runF = () => (runT === null ? 0 : Math.min(1, runT / RUN));

    function drawLorentz() {
      if (lvl.kind !== 'lorentz') return;
      fieldGrid(lvl.bOut);
      const [vx, vy] = VEC[lvl.v];
      const [fx, fy] = VEC[lvl.dir];
      const speed = 80;
      let x: number;
      let y: number;
      if (!fired) {
        // streams straight along its velocity, wrapping round
        const t = (((clock * 0.28) % 1) + 1) % 1;
        x = CX + vx * (t - 0.5) * 360;
        y = CY + vy * (t - 0.5) * 240;
      } else {
        // the true path: a circular arc bending towards the true force direction
        const rad = 90 / Math.max(0.6, Math.min(2, lvl.v6 * lvl.b * 0.5));
        const th = Math.min(RUN, runT ?? 0) * (speed / rad);
        x = CX - vx * 120 + vx * Math.sin(th) * rad + fx * (1 - Math.cos(th)) * rad;
        y = CY - vy * 90 + vy * Math.sin(th) * rad + fy * (1 - Math.cos(th)) * rad;
      }
      arrow(x, y, vx * 38, vy * 38, col.text, 'v');
      if (fired && verdictOk) arrow(x, y, fx * 38, fy * 38, col.accent, 'F');
      particle(x, y, lvl.negative);
      verdictLabel(`F = ${fmt(lvl.f13)} × 10⁻¹³ N, ${lvl.dir}`, CX, 24);
    }
    function drawWire() {
      if (lvl.kind !== 'wire') return;
      if (lvl.mode === 'force') {
        // field lines run left to right; the wire is tilted at θ and is pushed out of the page
        g.strokeStyle = col.muted;
        g.lineWidth = 1.5;
        for (let y = 50; y < H; y += 46) {
          g.beginPath();
          g.moveTo(40, y);
          g.lineTo(W - 40, y);
          g.stroke();
          arrow(W - 70, y, 24, 0, col.muted);
        }
        const th = (lvl.theta * Math.PI) / 180;
        const f = ease(runF());
        const off = verdictOk ? f * 10 : f * 4;
        const len = 150;
        const x0 = CX - Math.cos(th) * len;
        const y0 = CY + Math.sin(th) * len;
        const x1 = CX + Math.cos(th) * len;
        const y1 = CY - Math.sin(th) * len;
        g.strokeStyle = '#b87333';
        g.lineWidth = 8;
        g.beginPath();
        g.moveTo(x0 + off, y0 - off);
        g.lineTo(x1 + off, y1 - off);
        g.stroke();
        label(g, `${lvl.theta}° to the field`, CX, CY + 80, { size: 13, color: col.muted });
        arrow(x0 + off, y0 - off, Math.cos(th) * 30, -Math.sin(th) * 30, col.accent, `${lvl.i} A`);
        if (runT !== null) label(g, 'pushed out of the page', CX, 24, { size: 13, color: col.accent });
        verdictLabel(`F = ${fmt(lvl.answer)} mN`, CX, 310);
      } else {
        // a horizontal wire between two poles, hovering, sagging or shooting up
        fieldGrid(true);
        const f = ease(runF());
        const dy = wireFall === 0 ? 0 : wireFall * f * 70;
        const y = CY - dy;
        g.strokeStyle = '#b87333';
        g.lineWidth = 10;
        g.beginPath();
        g.moveTo(150, Math.max(40, Math.min(300, y)));
        g.lineTo(490, Math.max(40, Math.min(300, y)));
        g.stroke();
        arrow(190, Math.max(40, Math.min(300, y)) - 18, 40, 0, col.accent, `${lvl.i} A`);
        arrow(CX, Math.max(40, Math.min(300, y)) + 22, 0, 36, col.text, 'mg');
        if (runT !== null && wireFall === 0) arrow(CX + 60, Math.max(40, Math.min(300, y)) + 22, 0, -36, col.good, 'BIl');
        verdictLabel(`B = ${fmt(lvl.answer)} T balances the weight`, CX, 310);
      }
    }
    function orbit(cx: number, cy: number, rpx: number, ang: number, dashed = false) {
      g.strokeStyle = dashed ? col.muted : col.accent;
      g.lineWidth = dashed ? 1.5 : 2;
      if (dashed) g.setLineDash([5, 5]);
      g.beginPath();
      g.arc(cx, cy, rpx, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
      const ex = cx + Math.cos(ang) * rpx;
      const ey = cy + Math.sin(ang) * rpx;
      // the velocity arrow is tangent to the circle, and the force points to the centre
      arrow(ex, ey, -Math.sin(ang) * 30, Math.cos(ang) * 30, col.text);
      if (!dashed) arrow(ex, ey, -Math.cos(ang) * 28, -Math.sin(ang) * 28, col.accent);
      particle(ex, ey, true);
    }
    const rpx = (r: number) => Math.min(120, 22 + r * 7);
    function drawCircle() {
      if (lvl.kind !== 'circle') return;
      fieldGrid(true);
      const r = rpx(lvl.rCm);
      if (!fired) {
        // before firing, the electron streams straight across
        const t = (((clock * 0.3) % 1) + 1) % 1;
        const x = 40 + t * (W - 80);
        arrow(x, CY, 36, 0, col.text, 'v');
        particle(x, CY, true);
      } else {
        orbit(CX, CY, r, (runT ?? 0) * 3.5);
        label(g, `r = ${fmt(lvl.rCm)} cm`, CX, CY, { size: 13, color: col.muted });
      }
      verdictLabel(`f = ${fmt(lvl.fMHz)} MHz, whatever the speed`, CX, 24);
    }
    function drawSpeed() {
      if (lvl.kind !== 'speed') return;
      fieldGrid(true);
      const r1 = rpx(lvl.rCm);
      const r2 = rpx(lvl.r2Cm);
      orbit(CX, CY, r1, (runT ?? 0) * 3.5, true);
      if (fired) orbit(CX, CY, r2, (runT ?? 0) * 3.5);
      else particle(CX + r1, CY, true);
      label(g, `before: ${fmt(lvl.rCm)} cm`, CX, CY - 4, { size: 12, color: col.muted });
      verdictLabel(`r′ = ${fmt(lvl.r2Cm)} cm, same frequency`, CX, 24);
    }
    function drawHelix() {
      if (lvl.kind !== 'helix') return;
      fieldGrid(true);
      // the field points along the page to the right: draw the helix side-on
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      arrow(60, 308, 80, 0, col.muted, 'B');
      const r = Math.min(110, 18 + lvl.rCm * 8);
      const pitch = Math.min(130, 22 + lvl.pitchCm * 4);
      const f = fired ? Math.min(1, (runT ?? 0) / RUN) : 0;
      const turns = 4 * f;
      g.strokeStyle = col.accent;
      g.lineWidth = 2.5;
      g.beginPath();
      const n = Math.max(2, Math.round(turns * 40));
      for (let k = 0; k <= n; k++) {
        const t = (k / 40);
        const x = 50 + t * pitch;
        const y = CY + Math.sin(t * Math.PI * 2) * r;
        if (k) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.stroke();
      const t = turns;
      if (fired) particle(50 + t * pitch, CY + Math.sin(t * Math.PI * 2) * r, true);
      else particle(50 + (((clock * 0.3) % 1) * 4) * 0, CY, true);
      label(g, `${lvl.theta}° to B`, 90, 40, { size: 13, color: col.muted });
      verdictLabel(`r = ${fmt(lvl.rCm)} cm, pitch ${fmt(lvl.pitchCm)} cm`, CX, 24);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawLorentz();
      drawWire();
      drawCircle();
      drawSpeed();
      drawHelix();
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
