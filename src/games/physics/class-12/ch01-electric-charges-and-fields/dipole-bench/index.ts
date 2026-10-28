import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, dipoleField, explainSolution, fmt, judgeAxis, judgeFade, judgeMoment, judgeStable, judgeTorque, magnitude, moment, starsFor, stepTorsion, wrap, type ForceGuess, type TotalGuess } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const NEG = '#3156d3';
const REVEAL = 0.9;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const rad = (d: number) => (d * Math.PI) / 180;
const C = { x: W / 2, y: H / 2 };

interface Speck {
  x: number;
  y: number;
  age: number;
  life: number;
}

export default defineGame({
  mount(ctx) {
    const lvl = buildLevel(ctx.level, ctx.random);
    const col = themeColors();
    const rnd = ctx.random;

    let misses = 0;
    let finished = false;
    let predictionCharged = false;
    let pendingWin: 1 | 2 | 3 | null = null;
    let wonAt: number | null = null;
    let clock = 0;
    let verdictAt: number | null = null;
    let verdictOk = false;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'An electric dipole, a pair of equal and opposite charges, with its field and the tests you run on it.' });
    const g = fitCanvas(canvas, W, H);
    const feedback = h('p', { class: 'feedback', hidden: true, 'aria-live': 'polite' });
    const solution = h('section', { class: 'panel solution', hidden: true });
    const hint = h('p', { class: 'muted note' });
    const controls = h('div', { class: 'lab-controls' });
    const meter = h('span', { class: 'v-readout', 'aria-live': 'off' });
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
      pendingWin = Math.max(1, starsFor(misses, free) - (predictionCharged ? 1 : 0)) as 1 | 2 | 3;
    };
    const verdict = (ok: boolean) => {
      verdictAt = clock;
      verdictOk = ok;
    };
    const field = (aria: string, placeholder: string) => h('input', { class: 'field', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': aria, placeholder }) as HTMLInputElement;
    const num = (el: HTMLInputElement) => parseNumber(el.value);
    const choiceGroup = <T extends string>(name: string, options: [T, string, string][]) => {
      let value: T | null = null;
      const buttons = options.map(([v, text, aria]) => h('button', { class: 'btn secondary small', type: 'button', 'aria-pressed': 'false', 'aria-label': aria, onclick: () => {
        value = v;
        buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i][0] === v)));
      } }, text));
      return { get: () => value, box: h('div', { class: 'route-group' }, h('strong', null, name), ...buttons) };
    };
    const slider = (aria: string, min: number, max: number, step: number, value: number, on: (v: number) => void) => h('input', { type: 'range', min, max, step, value: String(value), class: 'v-slider', 'aria-label': aria, oninput: (e: Event) => on(Number((e.target as HTMLInputElement).value)) }) as HTMLInputElement;
    const actionBtn = (text: string, aria: string, fn: () => void) => h('button', { class: 'btn', type: 'button', 'aria-label': aria, onclick: fn }, text);

    // ---- drawing helpers -------------------------------------------------------------------------------
    const arrow = (x1: number, y1: number, x2: number, y2: number, color: string, width = 3) => {
      const m = Math.hypot(x2 - x1, y2 - y1) || 1;
      const ux = (x2 - x1) / m;
      const uy = (y2 - y1) / m;
      g.strokeStyle = color;
      g.fillStyle = color;
      g.lineWidth = width;
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
      g.beginPath();
      g.moveTo(x2, y2);
      g.lineTo(x2 - ux * 11 - uy * 6, y2 - uy * 11 + ux * 6);
      g.lineTo(x2 - ux * 11 + uy * 6, y2 - uy * 11 - ux * 6);
      g.closePath();
      g.fill();
    };
    /** A dipole centred at c, its moment pointing at `deg` (counter-clockwise from +x), with the charges `len` px apart. */
    function drawDipole(c: { x: number; y: number }, deg: number, len: number, r = 16) {
      const u = { x: Math.cos(rad(deg)), y: -Math.sin(rad(deg)) };
      const plus = { x: c.x + (u.x * len) / 2, y: c.y + (u.y * len) / 2 };
      const minus = { x: c.x - (u.x * len) / 2, y: c.y - (u.y * len) / 2 };
      g.strokeStyle = col.muted;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(minus.x, minus.y);
      g.lineTo(plus.x, plus.y);
      g.stroke();
      disc(g, minus.x, minus.y, r, NEG, '#ffffff', 2);
      label(g, '−', minus.x, minus.y + 6, { size: r * 1.2, color: '#ffffff' });
      disc(g, plus.x, plus.y, r, POS, '#ffffff', 2);
      label(g, '+', plus.x, plus.y + 6, { size: r * 1.2, color: '#ffffff' });
      arrow(minus.x, minus.y, plus.x, plus.y, col.good, 3);
    }
    /** Arrows that drift in the direction of a uniform field. */
    function drawUniform(deg: number, alpha = 0.55) {
      const u = { x: Math.cos(rad(deg)), y: -Math.sin(rad(deg)) };
      const n = { x: -u.y, y: u.x };
      g.strokeStyle = col.accent;
      g.lineWidth = 2;
      g.globalAlpha = alpha;
      const gap = 44;
      const shift = (clock * 45) % gap;
      for (let row = -6; row <= 6; row++) {
        for (let k = -8; k <= 8; k++) {
          const along = k * gap + shift;
          const x = C.x + u.x * along + n.x * row * 40;
          const y = C.y + u.y * along + n.y * row * 40;
          if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
          g.beginPath();
          g.moveTo(x - u.x * 8 - n.x * 5, y - u.y * 8 - n.y * 5);
          g.lineTo(x + u.x * 6, y + u.y * 6);
          g.lineTo(x - u.x * 8 + n.x * 5, y - u.y * 8 + n.y * 5);
          g.stroke();
        }
      }
      g.globalAlpha = 1;
    }

    // ---- level 1: build the moment --------------------------------------------------------------------
    let q = 1;
    let sep = 2;
    let ang = 0;
    if (lvl.kind === 'moment') {
      const total = choiceGroup<TotalGuess>('The total charge of the dipole is…', [['zero', 'Zero', 'Total charge is zero'], ['q', '+q', 'Total charge is q'], ['2q', '2q', 'Total charge is 2q']]);
      const qS = slider('Charge q in nC', 1, 10, 0.5, q, (v) => (q = v));
      const sS = slider('Separation 2a in cm', 2, 20, 1, sep, (v) => (sep = v));
      const aS = slider('Direction of the moment in degrees', 0, 355, 5, ang, (v) => (ang = v));
      const run = () => {
        if (finished) return;
        if (!total.get()) return freeNote('Say what the total charge of the dipole is first.');
        const res = judgeMoment(lvl, q, sep, ang, total.get() as TotalGuess);
        verdict(res.ok);
        if (!res.totalOk) predictionCharged = true;
        const slip = res.totalOk ? '' : ' A dipole has equal and opposite charges, so its total charge is zero. That cost a star.';
        if (res.ok) return succeed(`The dipole has a moment of ${fmt(res.p)} C m, pointing the right way.${slip}`);
        const parts: string[] = [];
        if (!res.pOk) parts.push(`The moment is ${res.p > lvl.targetP ? 'too large' : 'too small'}.`);
        if (!res.angleOk) parts.push('The moment does not point the way the order shows.');
        miss(parts.join(' ') + slip);
      };
      controls.append(
        h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Charge q'), qS, h('span', { class: 'knob-val' }, '')),
        h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Separation 2a'), sS),
        h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Direction'), aS, meter),
        total.box,
        actionBtn('Lock the dipole', 'Lock the dipole', run),
      );
      hint.textContent = `Order: moment ${fmt(lvl.targetP)} C m, pointing along the dashed arrow. p = q × 2a.`;
    }

    // ---- level 2: the brake ----------------------------------------------------------------------------
    let swing = 0; // −1: swings in towards the field, +1: dragged out, 0: held
    let swingT: number | null = null;
    if (lvl.kind === 'torque') {
      const force = choiceGroup<ForceGuess>('The net force on the dipole is…', [['zero', 'Zero', 'Net force is zero'], ['not-zero', 'Not zero', 'Net force is not zero']]);
      const brakeIn = field('Brake torque in N m', 'τ = ? N m');
      const run = () => {
        if (finished || swingT !== null) return;
        if (!force.get()) return freeNote('Say what the net force on the dipole is first.');
        const b = num(brakeIn);
        if (b === null || b <= 0) return freeNote('Enter the brake torque as a positive number of N m, such as 2e-6.');
        const res = judgeTorque(lvl, b);
        swing = res.verdict === 'holds' ? 0 : res.verdict === 'swings-in' ? -1 : 1;
        swingT = 0;
        pendingJudge = () => {
          let slip = '';
          if (force.get() !== 'zero' && !predictionCharged) {
            predictionCharged = true;
            slip = ' The two forces qE on the charges are equal and opposite, so the net force is zero. That cost a star.';
          }
          verdict(res.ok);
          if (res.ok) return succeed(`The brake holds the dipole still: τ = pE sin θ = ${fmt(lvl.answer)} N m.${slip}`);
          miss(res.verdict === 'swings-in' ? `The brake is too weak: the dipole swings towards the field.${slip}` : `The brake is too strong: the dipole is dragged away from the field.${slip}`);
        };
      };
      brakeIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(force.box, h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Brake torque'), brakeIn, h('span', { class: 'unit' }, 'N m')), actionBtn('Apply the brake', 'Apply the brake', run));
      hint.textContent = `Dipole: ${lvl.q} nC charges ${lvl.sep} cm apart (p = ${fmt(lvl.p)} C m). Field: ${fmt(lvl.e)} N/C. The dipole makes an angle θ = ${lvl.theta}° with the field.`;
    }
    let pendingJudge: (() => void) | null = null;

    // ---- level 3: the nudge test ------------------------------------------------------------------------
    let dipoleDeg = 0;
    let nudge: { s: { theta: number; omega: number }; t: number } | null = null;
    if (lvl.kind === 'stable') {
      dipoleDeg = 90;
      const aS = slider('Orientation of the dipole in degrees', 0, 355, 5, dipoleDeg, (v) => {
        if (!nudge) dipoleDeg = v;
      });
      const run = () => {
        if (finished || nudge) return;
        nudge = { s: { theta: wrap(dipoleDeg - lvl.fieldAngle) + 4, omega: 0 }, t: 0 };
        const res = judgeStable(lvl, dipoleDeg);
        pendingJudge = () => {
          verdict(res.ok);
          if (res.ok) return succeed('A nudge and it swings back: moment along the field is stable equilibrium.');
          if (res.kind === 'unstable') return miss('A tiny nudge and it flips right round: moment against the field is an equilibrium, but an unstable one.');
          miss('The dipole is not in equilibrium there: the torque turns it at once.');
        };
      };
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Orientation'), aS), actionBtn('Give it a small nudge', 'Give it a nudge', run));
      hint.textContent = 'The field points along the arrows. Turn the dipole to an orientation, then nudge it to test whether it stays there.';
    }

    // ---- level 4: far-field probe ------------------------------------------------------------------------
    const specks: Speck[] = [];
    const scale4 = 6.6; // px per cm
    const probePos = () => {
      if (lvl.kind !== 'axis') return C;
      const a = lvl.phi;
      const u = { x: Math.cos(rad(a)), y: -Math.sin(rad(a)) };
      const v = lvl.where === 'axis' ? u : { x: -u.y * -1, y: u.x * -1 };
      const rr = Math.min(lvl.r * scale4, 250);
      return { x: C.x + (lvl.where === 'axis' ? u.x : v.x) * rr, y: C.y + (lvl.where === 'axis' ? u.y : v.y) * rr };
    };
    if (lvl.kind === 'axis') {
      const dir = choiceGroup<'1' | '-1'>('The field at the probe points…', [['1', 'Along the moment', 'Along the moment'], ['-1', 'Against the moment', 'Against the moment']]);
      const eIn = field('Field at the probe in N/C', 'E = ? N/C');
      const run = () => {
        if (finished) return;
        const v = num(eIn);
        if (v === null || v <= 0) return freeNote('Enter the field strength as a positive number of N/C.');
        if (!dir.get()) return freeNote('Say whether the field points along the moment or against it.');
        const res = judgeAxis(lvl, v, Number(dir.get()) as 1 | -1);
        verdict(res.ok);
        reveal4 = true;
        if (res.ok) return succeed(`The field at the probe is ${fmt(lvl.answer)} N/C, ${lvl.along > 0 ? 'along' : 'against'} the moment.`);
        const parts: string[] = [];
        if (!res.valueOk) parts.push(`Your field is too ${res.verdict === 'too-big' ? 'large' : 'small'}.`);
        if (!res.directionOk) parts.push('The direction is the other way round.');
        miss(parts.join(' '));
      };
      eIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Field strength'), eIn, h('span', { class: 'unit' }, 'N/C')), dir.box, actionBtn('Measure at the probe', 'Measure at the probe', run));
      hint.textContent = `Dipole: ${lvl.q} nC charges ${lvl.sep} cm apart (p = ${fmt(lvl.p)} C m). The probe is ${lvl.r} cm from its centre, on the ${lvl.where === 'axis' ? 'axis' : 'equatorial plane'}.`;
      for (let i = 0; i < 110; i++) specks.push({ x: rnd() * W, y: rnd() * H, age: rnd() * 3, life: 2.5 + rnd() * 3 });
    }
    let reveal4 = false;
    function moveSpecks(dt: number) {
      if (lvl.kind !== 'axis') return;
      for (const s of specks) {
        s.age += dt;
        const e = dipoleField(lvl.q, lvl.sep, lvl.phi, { x: (s.x - C.x) / scale4, y: (C.y - s.y) / scale4 });
        const m = magnitude(e);
        const near = Math.hypot(s.x - C.x, s.y - C.y) < 18;
        if (s.age > s.life || near || s.x < 0 || s.x > W || s.y < 0 || s.y > H) {
          s.x = 10 + rnd() * (W - 20);
          s.y = 10 + rnd() * (H - 20);
          s.age = 0;
          continue;
        }
        if (m > 0) {
          const speed = 18 + 22 * Math.log10(1 + m / 8);
          s.x += (e.x / m) * speed * dt;
          s.y -= (e.y / m) * speed * dt;
        }
      }
    }

    // ---- level 5: how fast does it fade ------------------------------------------------------------------------
    let probeK = 1;
    let probeTarget: { from: number; to: number; t: number } | null = null;
    const scale5 = 6;
    if (lvl.kind === 'fade') {
      const kIn = field('How many times farther', 'k = ? ×');
      const run = () => {
        if (finished || probeTarget) return;
        const k = num(kIn);
        if (k === null || k < 1.01 || k > 4) return freeNote('Enter a multiple between 1 and 4.');
        probeTarget = { from: probeK, to: k, t: 0 };
        pendingJudge = () => {
          const res = judgeFade(lvl, k);
          verdict(res.ok);
          if (res.ok) return succeed(`At ${fmt(k)} times the distance the field has fallen to ${fmt(res.ratio)} of its first value: the target fraction.`);
          miss(`At ${fmt(k)} times the distance the field is ${fmt(res.ratio)} of its first value: the probe is too ${res.verdict === 'too-near' ? 'near' : 'far'}.`);
        };
      };
      kIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, `Target: ${fmt(lvl.fraction)} of the first field`), kIn, h('span', { class: 'unit' }, '× the distance')), actionBtn('Move the probe', 'Move the probe', run));
      hint.textContent = `The probe starts ${lvl.r0} cm from the centre of the dipole (${lvl.q} nC charges, ${lvl.sep} cm apart), on its axis.`;
    }

    // ---- drawing the levels --------------------------------------------------------------------------------------
    function drawMoment() {
      if (lvl.kind !== 'moment') return;
      const t = rad(lvl.targetAngle);
      g.setLineDash([7, 6]);
      arrow(C.x, C.y, C.x + Math.cos(t) * 140, C.y - Math.sin(t) * 140, col.muted, 2);
      g.setLineDash([]);
      label(g, 'order', C.x + Math.cos(t) * 158, C.y - Math.sin(t) * 158 + 4, { size: 12, bold: false, color: col.muted });
      drawDipole(C, ang, sep * 11, 8 + q * 1.8);
      meter.textContent = `p = ${fmt(moment(q, sep))} C m`;
      label(g, `q = ${q} nC   2a = ${sep} cm`, C.x, H - 14, { size: 13, bold: false, color: col.text });
    }
    function drawTorque() {
      if (lvl.kind !== 'torque') return;
      drawUniform(0);
      let th = lvl.theta;
      if (swingT !== null) th += swing * 38 * ease(Math.min(1, swingT / 1.2));
      drawDipole(C, th, 130, 15);
      // the two equal and opposite forces qE
      const u = { x: Math.cos(rad(th)), y: -Math.sin(rad(th)) };
      arrow(C.x + u.x * 65, C.y + u.y * 65, C.x + u.x * 65 + 48, C.y + u.y * 65, POS, 3);
      arrow(C.x - u.x * 65, C.y - u.y * 65, C.x - u.x * 65 - 48, C.y - u.y * 65, NEG, 3);
      label(g, 'qE', C.x + u.x * 65 + 56, C.y + u.y * 65 + 5, { size: 13, color: POS });
      label(g, 'qE', C.x - u.x * 65 - 56, C.y - u.y * 65 + 5, { size: 13, color: NEG });
      label(g, `θ = ${Math.round(wrap(th))}°`, C.x, H - 14, { size: 14, color: col.text });
      if (swingT !== null && swingT >= 1.2) label(g, swing === 0 ? 'held' : swing < 0 ? 'swings towards the field' : 'dragged away from the field', C.x, 26, { size: 14, color: swing === 0 ? col.good : col.bad });
    }
    function drawStable() {
      if (lvl.kind !== 'stable') return;
      drawUniform(lvl.fieldAngle, 0.5);
      const deg = nudge ? lvl.fieldAngle + nudge.s.theta : dipoleDeg;
      drawDipole(C, deg, 130, 15);
      label(g, `field direction ${lvl.fieldAngle}°`, C.x, H - 14, { size: 12, bold: false, color: col.muted });
    }
    function drawAxis() {
      if (lvl.kind !== 'axis') return;
      g.fillStyle = col.accent;
      g.strokeStyle = col.accent;
      g.globalAlpha = 0.65;
      g.lineWidth = 1.5;
      for (const s of specks) {
        const e = dipoleField(lvl.q, lvl.sep, lvl.phi, { x: (s.x - C.x) / scale4, y: (C.y - s.y) / scale4 });
        const m = magnitude(e) || 1;
        g.beginPath();
        g.moveTo(s.x, s.y);
        g.lineTo(s.x - (e.x / m) * 7, s.y + (e.y / m) * 7);
        g.stroke();
        g.beginPath();
        g.arc(s.x, s.y, 2.1, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      drawDipole(C, lvl.phi, Math.max(18, lvl.sep * scale4), 7);
      const p = probePos();
      disc(g, p.x, p.y, 8, 'rgba(0,0,0,0)', col.text, 2.5);
      label(g, 'probe', p.x, p.y - 16, { size: 12, bold: false, color: col.muted });
      label(g, `${lvl.r} cm`, (C.x + p.x) / 2, (C.y + p.y) / 2 - 8, { size: 12, bold: false, color: col.muted });
      if (reveal4) {
        const e = lvl.along;
        const u = { x: Math.cos(rad(lvl.phi)), y: -Math.sin(rad(lvl.phi)) };
        arrow(p.x, p.y + 26, p.x + u.x * e * 50, p.y + 26 + u.y * e * 50, col.good, 4);
      }
    }
    function drawFade() {
      if (lvl.kind !== 'fade') return;
      const x0 = 60;
      const y = C.y;
      drawDipole({ x: x0, y }, 0, Math.max(18, lvl.sep * 5), 7);
      g.strokeStyle = col.muted;
      g.setLineDash([5, 5]);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x0, y + 40);
      g.lineTo(W - 20, y + 40);
      g.stroke();
      g.setLineDash([]);
      const px = x0 + lvl.r0 * probeK * scale5;
      disc(g, px, y, 9, 'rgba(0,0,0,0)', col.text, 2.5);
      label(g, 'probe', px, y - 16, { size: 12, bold: false, color: col.muted });
      label(g, `${fmt(lvl.r0 * probeK)} cm`, px, y + 58, { size: 13, color: col.text });
      const ratio = 1 / (probeK * probeK * probeK);
      g.fillStyle = col.good;
      g.fillRect(40, H - 40, 220 * ratio, 12);
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      g.strokeRect(40, H - 40, 220, 12);
      const tx = 40 + 220 * lvl.fraction;
      g.strokeStyle = col.accent;
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(tx, H - 46);
      g.lineTo(tx, H - 22);
      g.stroke();
      label(g, 'target', tx, H - 50, { size: 11, color: col.accent });
      label(g, `field: ${fmt(ratio)} of the first value`, 270, H - 30, { size: 13, bold: false, color: col.text, align: 'left' });
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (swingT !== null && swingT >= 1.2 + REVEAL && !finished) swingT = null; // ready for another try
      if (swingT !== null && swingT < 1.2 + REVEAL) {
        swingT += dt;
        if (swingT >= 1.2 && pendingJudge) {
          const j = pendingJudge;
          pendingJudge = null;
          j();
        }
      }
      if (nudge && nudge.t < 6) {
        for (let i = 0; i < 2; i++) nudge.s = stepTorsion(nudge.s, dt / 2 * 2);
        nudge.t += dt;
        if (nudge.t >= 6) {
          const j = pendingJudge;
          pendingJudge = null;
          j?.();
          dipoleDeg = lvl.kind === 'stable' ? lvl.fieldAngle + nudge.s.theta : dipoleDeg; // it stays where it ended up
          nudge = null;
        }
      }
      if (probeTarget) {
        probeTarget.t += dt;
        probeK = probeTarget.from + (probeTarget.to - probeTarget.from) * ease(Math.min(1, probeTarget.t / 1.2));
        if (probeTarget.t >= 1.2 && pendingJudge) {
          const j = pendingJudge;
          pendingJudge = null;
          j();
        }
        if (probeTarget.t >= 1.2 + REVEAL) probeTarget = finished ? probeTarget : null;
      }
      moveSpecks(dt);
      g.clearRect(0, 0, W, H);
      drawMoment();
      drawTorque();
      drawStable();
      drawAxis();
      drawFade();
      if (verdictAt !== null && clock - verdictAt < REVEAL) {
        g.strokeStyle = verdictOk ? col.good : col.bad;
        g.lineWidth = 6;
        g.globalAlpha = 1 - (clock - verdictAt) / REVEAL;
        g.strokeRect(3, 3, W - 6, H - 6);
        g.globalAlpha = 1;
      }
      const busy = (swingT !== null && swingT < 1.2) || !!nudge || (!!probeTarget && probeTarget.t < 1.2) || (verdictAt !== null && clock - verdictAt < REVEAL);
      const phase = busy ? 'testing' : verdictAt === null ? 'idle' : 'done';
      canvas.dataset.phase = phase;
      if (pendingWin !== null && !busy) {
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
