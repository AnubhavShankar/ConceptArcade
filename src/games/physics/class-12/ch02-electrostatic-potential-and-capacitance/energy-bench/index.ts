import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeDipole, judgeMove, judgeSystem, potentialAt, starsFor, type Path, type Pt } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const NEG = '#3156d3';
const REVEAL = 0.9;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const rad = (d: number) => (d * Math.PI) / 180;
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
    let runT: number | null = null; // time since the run started, for the scene animation
    const RUN = 3.2;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'Charges and a dipole whose potential energy changes as they are assembled, moved or turned.' });
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
    const choiceGroup = <T extends string>(name: string, options: [T, string, string][]) => {
      let value: T | null = null;
      const buttons = options.map(([v, text, aria]) => h('button', { class: 'btn secondary small', type: 'button', 'aria-pressed': 'false', 'aria-label': aria, onclick: () => {
        value = v;
        buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i][0] === v)));
      } }, text));
      return { get: () => value, box: h('div', { class: 'route-group' }, h('strong', null, name), ...buttons) };
    };
    const ball = (x: number, y: number, q: number, r = 15) => {
      disc(g, x, y, r, q > 0 ? POS : NEG, '#ffffff', 2);
      label(g, q > 0 ? '+' : '−', x, y + r * 0.4, { size: r * 1.1, color: '#ffffff' });
    };

    // ---- level 1: assemble the system ------------------------------------------------------------------------------
    const k1 = 9;
    if (lvl.kind === 'system') {
      const uIn = field('Potential energy of the system in µJ', 'U = ? µJ');
      const run = () => {
        if (finished) return;
        const u = num(uIn);
        if (u === null) return freeNote('Enter the potential energy in µJ, with a minus sign if it is negative.');
        const res = judgeSystem(lvl, u);
        verdict(res.ok);
        if (res.ok) return succeed(`U = ${fmt(lvl.answer)} µJ: the work done in bringing the three charges in.`);
        miss(`Your energy is too ${res.verdict === 'too-high' ? 'high' : 'low'}. Count every pair once, and keep the signs.`);
      };
      uIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Potential energy'), uIn, h('span', { class: 'unit' }, 'µJ')), actionBtn('Assemble the system', 'Assemble the system', run));
      hint.textContent = `Charges: ${lvl.charges.map((c) => `${c.q > 0 ? '+' : '−'}${Math.abs(c.q)}`).join(', ')} nC at the corners of an equilateral triangle of side ${lvl.side} cm.`;
    }

    // ---- level 2: carry a charge from A to B ----------------------------------------------------------------------------
    const k2 = 13;
    const toPx2 = (p: Pt): Pt => ({ x: C.x + p.x * k2, y: C.y - p.y * k2 });
    const map = document.createElement('canvas');
    map.width = 128;
    map.height = 68;
    const mg = map.getContext('2d')!;
    if (lvl.kind === 'move') {
      for (let i = 0; i < 128; i++) {
        for (let j = 0; j < 68; j++) {
          const cm = { x: ((i + 0.5) * W) / 128 - C.x, y: C.y - ((j + 0.5) * H) / 68 };
          const v = potentialAt({ x: cm.x / k2, y: cm.y / k2 }, lvl.fixed);
          const a = Math.min(0.7, Math.abs(Math.tanh(v / 260)) * 0.7);
          mg.fillStyle = v >= 0 ? `rgba(192,57,43,${a})` : `rgba(49,86,211,${a})`;
          mg.fillRect(i, j, 1, 1);
        }
      }
      const path = choiceGroup<Path>('Taking a longer, curving route…', [['same', 'Takes the same work', 'The work is the same by any route'], ['longer-more', 'Takes more work', 'The longer route takes more work'], ['shorter-more', 'Takes less work', 'The longer route takes less work']]);
      const wIn = field('Work done by the agent in nJ', 'W = ? nJ');
      const run = () => {
        if (finished) return;
        const w = num(wIn);
        if (w === null) return freeNote('Enter the work in nJ, with a minus sign if it is negative.');
        if (!path.get()) return freeNote('Say what a longer, curving route would do to the work.');
        const res = judgeMove(lvl, w, path.get() as Path);
        verdict(res.ok);
        if (res.ok) return succeed(`W = ${fmt(lvl.answer)} nJ, by any route.`);
        const parts: string[] = [];
        if (!res.wOk) parts.push('The work is not right: W = q₀(V_B − V_A), with the sign.');
        if (!res.pathOk) parts.push('The electrostatic force is conservative: the route makes no difference.');
        miss(parts.join(' '));
      };
      wIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Work done'), wIn, h('span', { class: 'unit' }, 'nJ')), path.box, actionBtn('Carry the charge', 'Carry the charge', run));
      hint.textContent = `Fixed charges: ${lvl.fixed.map((c) => `${c.q > 0 ? '+' : '−'}${Math.abs(c.q)}`).join(' nC and ')} nC. The test charge is ${lvl.testQ > 0 ? '+' : '−'}${Math.abs(lvl.testQ)} nC, carried slowly from A to B.`;
    }

    // ---- level 3: turn the dipole ------------------------------------------------------------------------------------------
    if (lvl.kind === 'dipole') {
      const wIn = field('Work done by the agent in µJ', 'W = ? µJ');
      const run = () => {
        if (finished) return;
        const w = num(wIn);
        if (w === null) return freeNote('Enter the work in µJ, with a minus sign if it is negative.');
        const res = judgeDipole(lvl, w);
        verdict(res.ok);
        if (res.ok) return succeed(`W = ${fmt(lvl.answer)} µJ.`);
        miss(res.verdict === 'wrong-sign' ? 'Check the sign: the energy is lowest when the dipole points along the field.' : `Your work is too ${res.verdict === 'too-high' ? 'high' : 'low'}.`);
      };
      wIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, `From ${lvl.t1}° to ${lvl.t2}°`), wIn, h('span', { class: 'unit' }, 'µJ')), actionBtn('Turn the dipole', 'Turn the dipole', run));
      hint.textContent = `Dipole: ±${lvl.q} nC, ${lvl.sep} cm apart (p = ${fmt(lvl.p)} C m), in a field of ${fmt(lvl.e)} N/C. It is turned from θ = ${lvl.t1}° to θ = ${lvl.t2}°, θ being the angle between p and E.`;
    }

    // ---- drawing ------------------------------------------------------------------------------------------------------------
    function drawSystem() {
      if (lvl.kind !== 'system') return;
      const home = lvl.charges.map((c) => ({ x: C.x + c.at.x * k1 * 1.2, y: C.y - c.at.y * k1 * 1.2 + 14 }));
      const t = runT === null ? 3 : Math.min(RUN, runT);
      home.forEach((hm, i) => {
        // each charge flies in from far away in turn, over one second
        const start = i * 0.9;
        const f = runT === null ? 1 : ease(Math.max(0, Math.min(1, (t - start) / 0.9)));
        const from = { x: i === 0 ? -40 : i === 1 ? W + 40 : C.x, y: i === 2 ? H + 40 : -40 };
        const x = from.x + (hm.x - from.x) * f;
        const y = from.y + (hm.y - from.y) * f;
        if (f > 0) ball(x, y, lvl.charges[i].q, 17);
        if (f >= 1) label(g, `${lvl.charges[i].q > 0 ? '+' : '−'}${Math.abs(lvl.charges[i].q)} nC`, x, y - 26, { size: 12, color: col.text });
      });
      g.strokeStyle = col.muted;
      g.setLineDash([5, 5]);
      g.lineWidth = 1.5;
      g.beginPath();
      home.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
      g.closePath();
      g.stroke();
      g.setLineDash([]);
      label(g, `${lvl.side} cm`, C.x, H - 12, { size: 13, bold: false, color: col.muted });
    }
    function drawMove() {
      if (lvl.kind !== 'move') return;
      g.drawImage(map, 0, 0, W, H);
      for (const f of lvl.fixed) ball(toPx2(f.at).x, toPx2(f.at).y, f.q, 14);
      const A = toPx2(lvl.a);
      const B = toPx2(lvl.b);
      const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
      const nx = -(B.y - A.y);
      const ny = B.x - A.x;
      const len = Math.hypot(nx, ny) || 1;
      const via = { x: mid.x + (nx / len) * 90, y: mid.y + (ny / len) * 90 };
      g.strokeStyle = col.muted;
      g.setLineDash([6, 5]);
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(A.x, A.y);
      g.lineTo(B.x, B.y);
      g.moveTo(A.x, A.y);
      g.quadraticCurveTo(via.x * 1.2 - mid.x * 0.2, via.y * 1.2 - mid.y * 0.2, B.x, B.y);
      g.stroke();
      g.setLineDash([]);
      for (const [p, name] of [[A, 'A'], [B, 'B']] as const) {
        disc(g, p.x, p.y, 8, col.panel, col.text, 2.5);
        label(g, name, p.x, p.y - 16, { size: 15, color: col.text });
      }
      if (runT !== null) {
        const f = ease(Math.min(1, runT / (RUN * 0.5)));
        const f2 = ease(Math.min(1, Math.max(0, (runT - RUN * 0.5) / (RUN * 0.5))));
        const direct = { x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f };
        const cx = via.x * 1.2 - mid.x * 0.2;
        const cy = via.y * 1.2 - mid.y * 0.2;
        const curve = { x: (1 - f2) ** 2 * A.x + 2 * (1 - f2) * f2 * cx + f2 ** 2 * B.x, y: (1 - f2) ** 2 * A.y + 2 * (1 - f2) * f2 * cy + f2 ** 2 * B.y };
        ball(runT < RUN * 0.5 ? direct.x : curve.x, runT < RUN * 0.5 ? direct.y : curve.y, lvl.testQ, 9);
      }
    }
    function drawDipole() {
      if (lvl.kind !== 'dipole') return;
      // field arrows
      g.strokeStyle = col.accent;
      g.lineWidth = 2;
      g.globalAlpha = 0.45;
      for (let row = 0; row < 5; row++) for (let k = 0; k < 8; k++) {
        const x = 20 + ((k * 80 + clock * 40) % 600);
        const y = 40 + row * 55;
        g.beginPath();
        g.moveTo(x - 10, y);
        g.lineTo(x + 6, y);
        g.moveTo(x, y - 5);
        g.lineTo(x + 6, y);
        g.lineTo(x, y + 5);
        g.stroke();
      }
      g.globalAlpha = 1;
      const f = runT === null ? 0 : ease(Math.min(1, runT / (RUN * 0.6)));
      const th = lvl.t1 + (lvl.t2 - lvl.t1) * f;
      const cx = 170;
      const cy = H / 2;
      const u = { x: Math.cos(rad(th)), y: -Math.sin(rad(th)) };
      g.strokeStyle = col.muted;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(cx - u.x * 60, cy - u.y * 60);
      g.lineTo(cx + u.x * 60, cy + u.y * 60);
      g.stroke();
      ball(cx - u.x * 60, cy - u.y * 60, -1, 15);
      ball(cx + u.x * 60, cy + u.y * 60, 1, 15);
      label(g, `θ = ${Math.round(th)}°`, cx, cy + 96, { size: 14, color: col.text });
      // U(θ) curve with a moving dot
      const gx = 330;
      const gw = 270;
      const gy = H / 2;
      g.strokeStyle = col.line;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(gx, gy);
      g.lineTo(gx + gw, gy);
      g.stroke();
      g.strokeStyle = col.good;
      g.lineWidth = 3;
      g.beginPath();
      for (let a = 0; a <= 180; a += 3) {
        const x = gx + (a / 180) * gw;
        const y = gy + -Math.cos(rad(a)) * 70;
        if (a === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
      const thc = Math.max(0, Math.min(180, th));
      disc(g, gx + (thc / 180) * gw, gy - Math.cos(rad(thc)) * 70, 7, col.accent, '#ffffff', 2);
      label(g, 'U = −pE cos θ', gx + gw / 2, gy - 96, { size: 13, color: col.good });
      label(g, '0°', gx, gy + 100, { size: 12, color: col.muted });
      label(g, '180°', gx + gw, gy + 100, { size: 12, color: col.muted });
      label(g, 'lowest', gx, gy + 84, { size: 11, bold: false, color: col.muted, align: 'left' });
      label(g, 'highest', gx + gw, gy - 76, { size: 11, bold: false, color: col.muted, align: 'right' });
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawSystem();
      drawMove();
      drawDipole();
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
