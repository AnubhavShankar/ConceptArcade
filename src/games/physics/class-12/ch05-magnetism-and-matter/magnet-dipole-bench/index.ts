import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, energy, explainSolution, fmt, judgeConfigs, judgeEnergy, judgeSolenoid, judgeTorque, judgeWork, starsFor, type Config } from './logic';

const W = 640;
const H = 340;
const NORTH = '#c0392b';
const SOUTH = '#3156d3';
const REVEAL = 0.9;
const RUN = 3.4;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const CX = 320;
const CY = 175;
const rad = (deg: number) => (deg * Math.PI) / 180;

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
    const picks: Record<'lowest' | 'highest' | 'noEq', string | null> = { lowest: null, highest: null, noEq: null };

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A bar magnet or solenoid in a uniform magnetic field, seen from above, turning under the torque of the field.' });
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
    if (lvl.kind === 'torque') {
      const moment = lvl.mode === 'moment';
      const aIn = field(moment ? 'Magnetic moment in J/T' : 'Torque in N m', moment ? 'm = ? J/T' : 'τ = ? N m');
      const run = () => {
        if (finished || busy()) return;
        const a = num(aIn);
        if (a === null || a <= 0) return freeNote('Enter a positive number.');
        const ok = judgeTorque(lvl, a).ok;
        verdict(ok);
        if (ok) return succeed(moment ? `m = ${fmt(lvl.answer)} J/T.` : `τ = ${fmt(lvl.answer)} N m.`);
        miss(moment ? 'That is not the magnetic moment: the torque is mB sin θ, so divide by B sin θ.' : 'That is not the torque: it depends on the moment, the field, and the sine of the angle between them.');
      };
      controls.append(moment ? row('Moment', aIn, 'J/T') : row('Torque', aIn, 'N m'), actionBtn('Release the magnet', 'Release the magnet', run));
      hint.textContent = moment ? `Field ${lvl.b} T, the axis of the magnet at ${lvl.theta}° to it, torque ${lvl.tauShown} N m.` : `Magnetic moment ${lvl.m} J/T, field ${lvl.b} T, the axis at ${lvl.theta}° to the field.`;
    }
    if (lvl.kind === 'energy') {
      const sIn = field('Energy in the stable orientation in J', 'U stable = ? J');
      const uIn = field('Energy in the unstable orientation in J', 'U unstable = ? J');
      const run = () => {
        if (finished || busy()) return;
        const s = num(sIn);
        const u = num(uIn);
        if (s === null || u === null || s === 0 || u === 0) return freeNote('Enter both energies as non-zero numbers, with their signs.');
        const res = judgeEnergy(lvl, s, u);
        verdict(res.ok);
        if (res.ok) return succeed(`Stable ${fmt(lvl.stable)} J, unstable ${fmt(lvl.unstable)} J.`);
        const parts: string[] = [];
        if (!res.sOk) parts.push('The stable energy is not right: the energy is lowest where the magnet lies along the field. U = −mB cos θ.');
        if (!res.uOk) parts.push('The unstable energy is not right: check its sign. Where is the energy highest?');
        miss(parts.join(' '));
      };
      controls.append(row('Stable', sIn, 'J'), row('Unstable', uIn, 'J'), actionBtn('Check the energies', 'Check the energies', run));
      hint.textContent = `Magnetic moment ${lvl.m} J/T in a field of ${lvl.b} T. The magnet can rotate in the plane of the field.`;
    }
    if (lvl.kind === 'work') {
      const aIn = field('Work to turn it to 90° in J', 'W 90° = ? J');
      const bIn = field('Work to turn it to 180° in J', 'W 180° = ? J');
      const tIn = field('Torque when opposite to the field in N m', 'τ 180° = ? N m');
      const run = () => {
        if (finished || busy()) return;
        const a = num(aIn);
        const b = num(bIn);
        const t = num(tIn);
        if (a === null || b === null || t === null || a <= 0 || b <= 0) return freeNote('Enter the two works as positive numbers, and the torque as a number (zero is allowed).');
        const res = judgeWork(lvl, a, b, t);
        verdict(res.ok);
        if (res.ok) return succeed(`W(90°) = ${fmt(lvl.w90)} J, W(180°) = ${fmt(lvl.w180)} J, and no torque at 180°.`);
        const parts: string[] = [];
        if (!res.aOk) parts.push('The work to reach 90° is not right: it is the rise in potential energy from the aligned position.');
        if (!res.bOk) parts.push('The work to reach 180° is not right: compare the energies at 0° and 180°.');
        if (!res.tOk) parts.push('The torque opposite to the field is not right: it is mB sin θ.');
        miss(parts.join(' '));
      };
      controls.append(row('To 90°', aIn, 'J'), row('To 180°', bIn, 'J'), row('Torque at 180°', tIn, 'N m'), actionBtn('Turn the magnet', 'Turn the magnet', run));
      hint.textContent = `Magnetic moment ${lvl.m} J/T, field ${lvl.b} T. The magnet starts aligned with the field.`;
    }
    if (lvl.kind === 'solenoid') {
      const mIn = field('Magnetic moment in J/T', 'm = ? J/T');
      const tIn = field('Torque in N m', 'τ = ? N m');
      const fIn = field('Net force in N', 'F = ? N');
      const run = () => {
        if (finished || busy()) return;
        const m = num(mIn);
        const t = num(tIn);
        const f = num(fIn);
        if (m === null || t === null || f === null || m <= 0 || t <= 0) return freeNote('Enter the moment and torque as positive numbers, and the force as a number (zero is allowed).');
        const res = judgeSolenoid(lvl, m, t, f);
        verdict(res.ok);
        if (res.ok) return succeed(`m = ${fmt(lvl.m)} J/T, τ = ${fmt(lvl.torque)} N m, F = 0.`);
        const parts: string[] = [];
        if (!res.mOk) parts.push('The magnetic moment is not right: N I A, with the area in m².');
        if (!res.tOk) parts.push('The torque is not right: τ = mB sin θ.');
        if (!res.fOk) parts.push('The net force is not right: think about the forces on the two ends of the solenoid in a uniform field.');
        miss(parts.join(' '));
      };
      controls.append(row('Moment', mIn, 'J/T'), row('Torque', tIn, 'N m'), row('Net force', fIn, 'N'), actionBtn('Check the solenoid', 'Check the solenoid', run));
      hint.textContent = `${lvl.n} turns, area ${lvl.aCm2} cm² each, ${lvl.i} A. Uniform field ${lvl.b} T at ${lvl.theta}° to the axis.`;
    }
    if (lvl.kind === 'configs') {
      const letters = lvl.configs.map((c) => c.letter);
      const group = (key: 'lowest' | 'highest' | 'noEq', name: string, ariaPrefix: string) => {
        const btns: HTMLElement[] = letters.map((letter) => {
          const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': `${ariaPrefix} ${letter}`, 'aria-pressed': 'false', onclick: () => {
            picks[key] = letter;
            btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
          } }, letter);
          return b;
        });
        return h('div', { class: 'control' }, h('span', { class: 'control-label' }, name), ...btns);
      };
      const run = () => {
        if (finished || busy()) return;
        if (!picks.lowest || !picks.highest || !picks.noEq) return freeNote('Make all three choices first.');
        const res = judgeConfigs(lvl, picks.lowest, picks.highest, picks.noEq);
        verdict(res.ok);
        if (res.ok) return succeed(`Lowest ${lvl.lowest}, highest ${lvl.highest}.`);
        const parts: string[] = [];
        if (!res.lOk) parts.push('The lowest potential energy is not right: it is where m_Q is along the field of P, and the field of P is strongest on its axis.');
        if (!res.hOk) parts.push('The highest potential energy is not right: it is where m_Q is directly against the strongest field.');
        if (!res.eOk) parts.push('That arrangement is in equilibrium: look for one where the torque on Q is not zero.');
        miss(parts.join(' '));
      };
      controls.append(group('lowest', 'Lowest energy', 'Lowest energy is'), group('highest', 'Highest energy', 'Highest energy is'), group('noEq', 'Not in equilibrium', 'Not in equilibrium:'), actionBtn('Check the arrangements', 'Check the arrangements', run));
      hint.textContent = 'In every picture P is at the centre with its moment pointing right. Q sits on the axis of P (to the right) or on the line perpendicular to P (above it).';
    }

    // ---- drawing helpers -------------------------------------------------------------------------------------------------
    const arrow = (x: number, y: number, dx: number, dy: number, color: string, text = '', width = 3) => {
      const len = Math.hypot(dx, dy);
      if (len < 1) return;
      const ux = dx / len;
      const uy = dy / len;
      g.strokeStyle = color;
      g.fillStyle = color;
      g.lineWidth = width;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + dx, y + dy);
      g.stroke();
      g.beginPath();
      g.moveTo(x + dx + ux * 8, y + dy + uy * 8);
      g.lineTo(x + dx - uy * 5, y + dy + ux * 5);
      g.lineTo(x + dx + uy * 5, y + dy - ux * 5);
      g.fill();
      if (text) label(g, text, x + dx + ux * 20, y + dy + uy * 12, { size: 12, color });
    };
    /** A short bar magnet at (x, y) whose axis, south to north, points at angle a (radians, anticlockwise from the right). */
    const bar = (x: number, y: number, a: number, len = 46, thick = 14) => {
      const ux = Math.cos(a);
      const uy = -Math.sin(a);
      g.save?.();
      g.lineWidth = thick;
      g.lineCap = 'butt';
      g.strokeStyle = SOUTH;
      g.beginPath();
      g.moveTo(x - ux * len, y - uy * len);
      g.lineTo(x, y);
      g.stroke();
      g.strokeStyle = NORTH;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + ux * len, y + uy * len);
      g.stroke();
      g.restore?.();
    };
    const fieldArrows = () => {
      for (let k = 0; k < 5; k++) {
        const y = 60 + k * 55;
        const t = (((clock * 0.2 + k * 0.13) % 1) + 1) % 1;
        g.globalAlpha = 0.45;
        arrow(40 + t * 70, y, 44, 0, col.muted, '', 2);
        g.globalAlpha = 1;
      }
      label(g, 'B', 40, 34, { size: 13, color: col.muted });
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const swing = (theta0: number) => {
      const t = runT === null ? 0 : Math.min(runT, RUN + 0.2);
      return theta0 * Math.cos(t * 3.2) * Math.exp(-t * 0.55);
    };
    const runF = () => (runT === null ? 0 : ease(Math.min(1, runT / RUN)));

    function drawTorque() {
      if (lvl.kind !== 'torque') return;
      fieldArrows();
      const t0 = rad(lvl.theta);
      bar(CX, CY, runT === null ? t0 : swing(t0));
      label(g, `θ = ${lvl.theta}°`, CX + 70, CY - 60, { size: 13, color: col.muted });
      verdictLabel(lvl.mode === 'moment' ? `m = ${fmt(lvl.answer)} J/T` : `τ = ${fmt(lvl.answer)} N m`, CX, 30);
    }
    function drawEnergy() {
      if (lvl.kind !== 'energy') return;
      const gx = 120;
      const gy = 280;
      const wid = 400;
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(gx, gy);
      g.lineTo(gx + wid, gy);
      g.moveTo(gx, gy);
      g.lineTo(gx, 70);
      g.stroke();
      label(g, 'θ', gx + wid + 10, gy + 4, { size: 12, color: col.muted });
      label(g, 'U', gx - 12, 70, { size: 12, color: col.muted });
      g.beginPath();
      g.moveTo(gx - 4, 175);
      g.lineTo(gx + wid, 175);
      g.setLineDash([3, 4]);
      g.stroke();
      g.setLineDash([]);
      g.strokeStyle = col.accent;
      g.lineWidth = 2.5;
      g.beginPath();
      for (let k = 0; k <= 80; k++) {
        const a = (k / 80) * Math.PI;
        const x = gx + (a / Math.PI) * wid;
        const y = 175 + Math.cos(a) * 85;
        if (k) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.stroke();
      const f = runF();
      const mark = (a: number, text: string, u: number) => {
        const x = gx + (a / Math.PI) * wid;
        const y = 175 + Math.cos(a) * 85;
        disc(g, x, y, 6, col.accent);
        bar(x, y + (a === 0 ? -34 : 34), a === 0 ? 0 : Math.PI, 20, 8);
        label(g, f > 0 ? `${fmt(u * f)} J` : text, x, y + (a === 0 ? 20 : -20), { size: 12, color: col.text });
      };
      mark(0, '?', lvl.stable);
      mark(Math.PI, '?', lvl.unstable);
      label(g, '0° stable', gx, gy + 18, { size: 11, color: col.muted });
      label(g, '180° unstable', gx + wid, gy + 18, { size: 11, color: col.muted });
      verdictLabel(`U = ∓mB = ∓${fmt(Math.abs(lvl.stable))} J`, CX, 30);
    }
    function drawWork() {
      if (lvl.kind !== 'work') return;
      fieldArrows();
      const f = runF();
      // 0° to 90° in the first half, 90° to 180° in the second
      const ang = f < 0.5 ? (f / 0.5) * 90 : 90 + ((f - 0.5) / 0.5) * 90;
      bar(CX, CY, rad(ang));
      label(g, `θ = ${fmt(ang)}°`, CX + 70, CY - 60, { size: 13, color: col.muted });
      // energy bar
      const u = energy(lvl.m, lvl.b, ang) / (lvl.m * lvl.b);
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      g.strokeRect(540, 80, 40, 190);
      g.fillStyle = col.accent;
      g.globalAlpha = 0.8;
      g.fillRect(540, 175, 40, -u * 90);
      g.globalAlpha = 1;
      label(g, 'U', 560, 66, { size: 12, color: col.muted });
      verdictLabel(`W = ${fmt(lvl.w90)} J to 90°, ${fmt(lvl.w180)} J to 180°`, CX, 30);
    }
    function drawSolenoid() {
      if (lvl.kind !== 'solenoid') return;
      fieldArrows();
      const t0 = rad(lvl.theta);
      const th = runT === null ? t0 : swing(t0);
      const ux = Math.cos(th);
      const uy = -Math.sin(th);
      // the solenoid as a row of loops along the axis
      for (let k = -4; k <= 4; k++) {
        const x = CX + ux * k * 14;
        const y = CY + uy * k * 14;
        g.strokeStyle = '#b87333';
        g.lineWidth = 3;
        g.beginPath();
        g.ellipse(x, y, 5, 26, -th + 0, 0, Math.PI * 2);
        g.stroke();
      }
      arrow(CX - ux * 8, CY - uy * 8, ux * 90, uy * 90, col.text, 'm', 2.5);
      label(g, `θ = ${lvl.theta}°`, CX + 80, CY - 60, { size: 13, color: col.muted });
      verdictLabel(`m = ${fmt(lvl.m)} J/T, τ = ${fmt(lvl.torque)} N m, F = 0`, CX, 30);
    }
    function drawConfigs() {
      if (lvl.kind !== 'configs') return;
      lvl.configs.forEach((c: Config, idx) => {
        const col0 = idx % 3;
        const row0 = Math.floor(idx / 3);
        const px = 110 + col0 * 210;
        const py = 100 + row0 * 130;
        g.strokeStyle = col.line;
        g.lineWidth = 1;
        g.strokeRect(px - 98, py - 56, 196, 112);
        label(g, c.letter, px - 84, py - 42, { size: 15, color: col.text });
        bar(px - 12, py, 0, 14, 7);
        const qx = c.where === 'axis' ? px + 54 : px - 12;
        const qy = c.where === 'axis' ? py : py - 38;
        const qa = c.orient === 'parallel' ? 0 : c.orient === 'antiparallel' ? Math.PI : Math.PI / 2;
        bar(qx, qy, qa, 11, 6);
        if (verdictAt !== null && verdictOk && (c.letter === lvl.lowest || c.letter === lvl.highest)) {
          label(g, c.letter === lvl.lowest ? 'lowest' : 'highest', px + 56, py + 38, { size: 11, color: col.good });
        }
      });
      verdictLabel('lowest: axis, parallel; highest: axis, antiparallel', CX, 326);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawTorque();
      drawEnergy();
      drawWork();
      drawSolenoid();
      drawConfigs();
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
