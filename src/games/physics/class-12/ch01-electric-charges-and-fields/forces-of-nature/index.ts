import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, conserves, explainSolution, fmt, judgeBasic, judgeConserve, judgeCoulomb, judgeGravity, judgeMass, starsFor, totalIn, totalOut, type Scale, type Third, type Why } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const NEG = '#3156d3';
const NEU = '#8a93a3';
const REVEAL = 0.9;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
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

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'Charged particles and bodies, with the forces and electrons that the question is about.' });
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
      g.lineTo(x2 - ux * 10 - uy * 6, y2 - uy * 10 + ux * 6);
      g.lineTo(x2 - ux * 10 + uy * 6, y2 - uy * 10 - ux * 6);
      g.closePath();
      g.fill();
    };
    const ball = (x: number, y: number, q: number, r = 16, text?: string) => {
      disc(g, x, y, r, q > 0 ? POS : q < 0 ? NEG : NEU, '#ffffff', 2);
      label(g, text ?? (q > 0 ? '+' : q < 0 ? '−' : '0'), x, y + r * 0.35, { size: r * 0.9, color: '#ffffff' });
    };

    // ---- level 1: force and distance -----------------------------------------------------------------------
    if (lvl.kind === 'basic') {
      const valueIn = field(lvl.mode === 'force' ? 'Force between the spheres in N' : 'Distance between the spheres in cm', lvl.mode === 'force' ? 'F = ? N' : 'r = ? cm');
      const third = choiceGroup<Third>('The force on the second sphere is…', [['equal-opposite', 'Equal in size, opposite in direction', 'Force on the second sphere: equal and opposite'], ['bigger-on-small', 'Bigger on the smaller charge', 'Force on the second sphere: bigger on the smaller charge'], ['zero', 'Zero', 'Force on the second sphere: zero']]);
      const run = () => {
        if (finished) return;
        const v = num(valueIn);
        if (v === null || v <= 0) return freeNote(`Enter ${lvl.mode === 'force' ? 'the force as a positive number of newtons' : 'the distance as a positive number of centimetres'}.`);
        if (!third.get()) return freeNote('Say how the force on the second sphere compares with the force on the first.');
        const res = judgeBasic(lvl, v, third.get() as Third);
        verdict(res.ok);
        if (res.ok) return succeed(lvl.mode === 'force' ? `F = ${fmt(lvl.f)} N, and the two spheres push on each other equally.` : `r = ${lvl.r} cm, and the two spheres push on each other equally.`);
        const parts: string[] = [];
        if (!res.valueOk) parts.push(lvl.mode === 'force' ? `Your force is too ${v > lvl.f ? 'large' : 'small'}: check the units of the charges and the distance.` : `Your distance is too ${v > lvl.r ? 'large' : 'small'}.`);
        if (!res.thirdOk) parts.push('Coulomb forces obey Newton’s third law.');
        miss(parts.join(' '));
      };
      valueIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, lvl.mode === 'force' ? 'Force' : 'Distance'), valueIn, h('span', { class: 'unit' }, lvl.mode === 'force' ? 'N' : 'cm')), third.box, actionBtn('Check my answer', 'Check my answer', run));
      hint.textContent = lvl.mode === 'force' ? `Charges: ${lvl.q1} µC and ${lvl.q2} µC, ${lvl.r} cm apart in air.` : `Charges: ${lvl.q1} µC and ${lvl.q2} µC. The force between them is ${fmt(lvl.f)} N.`;
    }

    // ---- level 2: electric against gravity -------------------------------------------------------------------
    if (lvl.kind === 'gravity') {
      const ratioIn = field('How many times bigger the electric force is', '× ?  (for example 3 × 10^30)');
      const why = choiceGroup<Why>('Gravity rules the planets because…', [['cancel', 'Electric forces cancel: charges come in both signs', 'Electric forces cancel'], ['stronger', 'Gravity is stronger over long distances', 'Gravity is stronger at long range'], ['uncharged', 'Planets carry no charge at all', 'Planets carry no charge']]);
      const run = () => {
        if (finished) return;
        const v = num(ratioIn);
        if (v === null || v <= 0) return freeNote('Enter the ratio as a positive number, such as 1.2e36 or 1.2 x 10^36.');
        if (!why.get()) return freeNote('Say why gravity rules the motion of planets.');
        const res = judgeGravity(lvl, v, why.get() as Why);
        verdict(res.ok);
        if (res.ok) return succeed(`The electric force is about ${fmt(lvl.ratio)} times the gravitational force.`);
        const parts: string[] = [];
        if (!res.valueOk) parts.push(`Your ratio is too ${v > lvl.ratio ? 'large' : 'small'} by many powers of ten: check the masses and the charge.`);
        if (!res.whyOk) parts.push('Think about why large objects feel almost no net electric force.');
        miss(parts.join(' '));
      };
      ratioIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'F(electric) ÷ F(gravity)'), ratioIn), why.box, actionBtn('Compare the forces', 'Compare the forces', run));
      hint.textContent = 'e = 1.6 × 10⁻¹⁹ C, k = 9 × 10⁹ N m²/C², G = 6.67 × 10⁻¹¹ N m²/kg², proton mass 1.67 × 10⁻²⁷ kg, electron mass 9.11 × 10⁻³¹ kg. The distance cancels out of the ratio.';
    }

    // ---- level 3: the size of a coulomb -----------------------------------------------------------------------
    if (lvl.kind === 'coulomb') {
      const nIn = field(`Number of electrons in ${lvl.micro} µC`, 'N = ?  (for example 2 × 10^13)');
      const yIn = field('Years to collect 1 C', 'years = ?');
      const scale = choiceGroup<Scale>('We can ignore quantisation here because…', [['tiny-steps', 'One electron is a tiny step compared with the whole charge', 'One electron is a tiny step'], ['not-quantised', 'Charge is not quantised for big objects', 'Charge is not quantised for big objects'], ['light', 'Electrons are very light', 'Electrons are very light']]);
      const run = () => {
        if (finished) return;
        const n = num(nIn);
        const y = num(yIn);
        if (n === null || y === null || n <= 0 || y <= 0) return freeNote('Enter both numbers as positive numbers (for example 6.25e12).');
        if (!scale.get()) return freeNote('Say why quantisation can be ignored for charges this size.');
        const res = judgeCoulomb(lvl, n, y, scale.get() as Scale);
        verdict(res.ok);
        if (res.ok) return succeed(`${fmt(lvl.electrons)} electrons, and ${fmt(lvl.years)} years to collect a coulomb.`);
        const parts: string[] = [];
        if (!res.nOk) parts.push('The number of electrons is not right: N = q / e.');
        if (!res.yearsOk) parts.push('The time is not right: find the charge gathered each second, then how many seconds for 1 C, then convert to years.');
        if (!res.scaleOk) parts.push('Charge is quantised everywhere: the question is about the size of the steps.');
        miss(parts.join(' '));
      };
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Electrons'), nIn), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Years for 1 C'), yIn), scale.box, actionBtn('Check my counts', 'Check my counts', run));
      hint.textContent = `Charge: ${lvl.micro} µC. Electrons leave a body at ${fmt(lvl.rate)} per second. e = 1.6 × 10⁻¹⁹ C; take 1 year = 365 days.`;
    }

    // ---- level 4: the mass of charging ---------------------------------------------------------------------------
    if (lvl.kind === 'mass') {
      const nIn = field('Number of electrons transferred', 'N = ?');
      const mIn = field('Mass transferred in kg', 'm = ? kg');
      const from = choiceGroup<'partner' | 'body'>('The electrons moved…', [['partner', `From the ${lvl.partner} to the ${lvl.body}`, `Electrons moved from the ${lvl.partner} to the ${lvl.body}`], ['body', `From the ${lvl.body} to the ${lvl.partner}`, `Electrons moved from the ${lvl.body} to the ${lvl.partner}`]]);
      const run = () => {
        if (finished) return;
        const n = num(nIn);
        const m = num(mIn);
        if (n === null || m === null || n <= 0 || m <= 0) return freeNote('Enter the number of electrons and the mass as positive numbers (for example 1.9e12 and 1.7e-18).');
        if (!from.get()) return freeNote('Say which way the electrons moved.');
        const res = judgeMass(lvl, n, m, from.get() as 'partner' | 'body');
        verdict(res.ok);
        if (res.ok) return succeed(`${fmt(lvl.electrons)} electrons moved, with a mass of ${fmt(lvl.massKg)} kg: nothing you could ever weigh.`);
        const parts: string[] = [];
        if (!res.nOk) parts.push('The number of electrons is not right: N = q / e.');
        if (!res.massOk) parts.push('The mass is not right: it is the number of electrons times the mass of one electron.');
        if (!res.fromOk) parts.push('Electrons are what move: a body that ends up negative has gained them, and one that ends up positive has lost them.');
        miss(parts.join(' '));
      };
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Electrons'), nIn), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Mass moved'), mIn, h('span', { class: 'unit' }, 'kg')), from.box, actionBtn('Check the transfer', 'Check the transfer', run));
      hint.textContent = 'e = 1.6 × 10⁻¹⁹ C, mass of an electron 9.11 × 10⁻³¹ kg.';
    }

    // ---- level 5: the collisions ------------------------------------------------------------------------------------
    const flagged = new Set<string>();
    let revealAll = false;
    if (lvl.kind === 'conserve') {
      const chips = lvl.reactions.map((r, i) => h('button', { class: 'btn secondary small', type: 'button', 'aria-pressed': 'false', 'aria-label': `Flag collision ${i + 1}`, onclick: () => {
        if (finished) return;
        if (flagged.has(r.id)) flagged.delete(r.id);
        else flagged.add(r.id);
        chips.forEach((b, k) => b.setAttribute('aria-pressed', String(flagged.has(lvl.reactions[k].id))));
      } }, `${i + 1}. ${r.text}`));
      const run = () => {
        if (finished) return;
        if (flagged.size === 0) return freeNote('Flag the collisions that break the law of conservation of charge.');
        const res = judgeConserve(lvl, [...flagged]);
        verdict(res.ok);
        revealAll = true;
        if (res.ok) return succeed('Exactly the three collisions that would create or destroy charge.');
        const parts: string[] = [];
        if (res.missed) parts.push(`${res.missed} forbidden collision${res.missed === 1 ? ' is' : 's are'} still unflagged.`);
        if (res.falseAlarms) parts.push(`${res.falseAlarms} of the collisions you flagged obey the law.`);
        revealAll = false;
        miss(parts.join(' ') + ' Add up the charges on each side.');
      };
      controls.append(h('div', { class: 'bench' }, ...chips), actionBtn('Run the collisions', 'Run the collisions', run));
      hint.textContent = 'Charges are in units of e: electron −1, positron and proton +1, neutron, neutrino and photon 0.';
    }

    // ---- drawing --------------------------------------------------------------------------------------------------
    function drawBasic() {
      if (lvl.kind !== 'basic') return;
      const scale = 8;
      const gap = lvl.r * scale;
      const sway = 5 * Math.sin(clock * 3);
      const xa = C.x - gap / 2 - sway;
      const xb = C.x + gap / 2 + sway;
      g.strokeStyle = col.muted;
      g.setLineDash([5, 5]);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(xa, C.y + 56);
      g.lineTo(xb, C.y + 56);
      g.stroke();
      g.setLineDash([]);
      label(g, `r = ${lvl.r} cm`, C.x, C.y + 76, { size: 13, color: col.muted });
      ball(xa, C.y, 1, 20);
      ball(xb, C.y, 1, 20);
      label(g, `${lvl.q1} µC`, xa, C.y - 32, { size: 13, color: col.text });
      label(g, `${lvl.q2} µC`, xb, C.y - 32, { size: 13, color: col.text });
      const p = 0.8 + 0.2 * Math.sin(clock * 3);
      arrow(xa - 24, C.y, xa - 24 - 50 * p, C.y, POS, 4);
      arrow(xb + 24, C.y, xb + 24 + 50 * p, C.y, POS, 4);
      label(g, 'F', xa - 24 - 25 * p, C.y - 12, { size: 14, color: POS });
      label(g, 'F′', xb + 24 + 25 * p, C.y - 12, { size: 14, color: POS });
    }
    function drawGravity() {
      if (lvl.kind !== 'gravity') return;
      const a = lvl.pair === 'ee' ? -1 : lvl.pair === 'ep' ? -1 : 1;
      const b = lvl.pair === 'pp' ? 1 : lvl.pair === 'ep' ? 1 : -1;
      ball(C.x - 90, C.y - 60, a, 20, lvl.pair === 'pp' ? 'p' : 'e');
      ball(C.x + 90, C.y - 60, b, 20, lvl.pair === 'ee' ? 'e' : 'p');
      const reveal = verdictAt !== null ? ease(Math.min(1, (clock - verdictAt) / REVEAL)) : 0.4 + 0.1 * Math.sin(clock * 2);
      g.strokeStyle = col.muted;
      g.lineWidth = 1;
      g.strokeRect(70, C.y + 10, 500, 22);
      g.fillStyle = POS;
      g.fillRect(70, C.y + 10, 500 * reveal, 22);
      label(g, 'electric force', 70, C.y + 6, { size: 12, color: col.text, align: 'left' });
      g.fillStyle = NEU;
      g.fillRect(70, C.y + 64, Math.max(1, 500 * reveal / Math.max(1, lvl.ratio)), 14);
      label(g, 'gravitational force', 70, C.y + 60, { size: 12, color: col.text, align: 'left' });
      if (verdictAt !== null) label(g, `gravity is about 1 / ${fmt(lvl.ratio)} of this: the bar is far too thin to see`, C.x, C.y + 100, { size: 12, color: col.muted });
    }
    function drawStream(from: { x: number; y: number }, to: { x: number; y: number }, speed: number, count: number) {
      g.fillStyle = NEG;
      for (let k = 0; k < count; k++) {
        const t = ((clock * speed + k / count) % 1 + 1) % 1;
        g.globalAlpha = 0.9 * Math.sin(t * Math.PI);
        g.beginPath();
        g.arc(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t + Math.sin((t + k) * 9) * 8, 3, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }
    function drawCoulomb() {
      if (lvl.kind !== 'coulomb') return;
      g.fillStyle = col.panel;
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(C.x - 160, C.y, 56, 0, Math.PI * 2);
      g.arc(C.x + 160, C.y, 56, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(C.x - 160, C.y, 56, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(C.x + 160, C.y, 56, 0, Math.PI * 2);
      g.stroke();
      drawStream({ x: C.x - 104, y: C.y }, { x: C.x + 104, y: C.y }, 0.5, 14);
      label(g, '+', C.x - 160, C.y + 12, { size: 36, color: POS });
      label(g, '−', C.x + 160, C.y + 12, { size: 36, color: NEG });
      label(g, `${fmt(lvl.rate)} electrons per second`, C.x, C.y - 70, { size: 14, color: col.text });
      const counted = Math.floor(clock * lvl.rate * 0.6);
      label(g, `${fmt(counted)} electrons moved so far`, C.x, C.y + 100, { size: 13, bold: false, color: col.muted });
    }
    function drawMass() {
      if (lvl.kind !== 'mass') return;
      const body = { x: C.x + 150, y: C.y };
      const partner = { x: C.x - 150, y: C.y };
      g.fillStyle = col.panel;
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      for (const [p, name] of [[partner, lvl.partner], [body, lvl.body]] as const) {
        g.beginPath();
        g.rect(p.x - 60, p.y - 40, 120, 80);
        g.fill();
        g.stroke();
        label(g, name, p.x, p.y + 6, { size: 15, color: col.text });
      }
      const gain = lvl.from === 'partner';
      drawStream(gain ? { x: partner.x + 60, y: partner.y } : { x: body.x - 60, y: body.y }, gain ? { x: body.x - 60, y: body.y } : { x: partner.x + 60, y: partner.y }, 0.5, 10);
      // a balance whose needle never moves
      g.strokeStyle = col.muted;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(C.x - 50, C.y + 90);
      g.lineTo(C.x + 50, C.y + 90);
      g.stroke();
      g.beginPath();
      g.moveTo(C.x, C.y + 90);
      g.lineTo(C.x + Math.sin(clock * 20) * 0.6, C.y + 56);
      g.stroke();
      label(g, 'a balance: the needle does not move', C.x, C.y + 112, { size: 12, bold: false, color: col.muted });
    }
    function drawTile(i: number, x0: number, y0: number, w: number, hh: number) {
      if (lvl.kind !== 'conserve') return;
      const r = lvl.reactions[i];
      const cx = x0 + w / 2;
      const cy = y0 + hh / 2 - 8;
      const period = 3.2;
      const t = ((clock + i * 0.5) % period) / period; // 0..1
      const on = flagged.has(r.id);
      g.strokeStyle = revealAll ? (conserves(r) ? col.good : col.bad) : on ? col.accent : col.line;
      g.lineWidth = on || revealAll ? 3 : 1.5;
      g.strokeRect(x0 + 3, y0 + 3, w - 6, hh - 6);
      label(g, String(i + 1), x0 + 14, y0 + 20, { size: 13, color: col.muted });
      const place = (n: number, k: number, spread: number) => (n === 1 ? 0 : (k - (n - 1) / 2) * spread);
      if (t < 0.4) {
        const f = ease(t / 0.4);
        r.inn.forEach(([name, q], k) => {
          const side = r.inn.length === 1 ? 0 : k === 0 ? -1 : 1;
          const px = cx + side * (w / 2 - 28) * (1 - f);
          ball(px, cy + place(r.inn.length, k, 0) , q, 13, name);
        });
      } else if (t < 0.5) {
        g.fillStyle = col.accent;
        g.globalAlpha = 1 - (t - 0.4) / 0.1;
        g.beginPath();
        g.arc(cx, cy, 8 + (t - 0.4) * 160, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
      } else {
        const f = ease((t - 0.5) / 0.5);
        const n = r.out.length;
        r.out.forEach(([name, q], k) => {
          const ang = n === 1 ? 0 : (k / n) * Math.PI * 2 + Math.PI / 6;
          const dist = n === 1 ? 0 : (w / 2 - 28) * f;
          ball(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist * 0.7, q, 13, name);
        });
      }
      if (revealAll || (verdictAt !== null && finished)) label(g, `${totalIn(r)} → ${totalOut(r)}`, cx, y0 + hh - 10, { size: 12, color: conserves(r) ? col.good : col.bad });
    }
    function drawConserve() {
      if (lvl.kind !== 'conserve') return;
      const cols = 3;
      const w = (W - 20) / cols;
      const hh = (H - 10) / 2;
      for (let i = 0; i < 6; i++) drawTile(i, 10 + (i % cols) * w, 5 + Math.floor(i / cols) * hh, w - 6, hh - 6);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      g.clearRect(0, 0, W, H);
      drawBasic();
      drawGravity();
      drawCoulomb();
      drawMass();
      drawConserve();
      if (verdictAt !== null && clock - verdictAt < REVEAL) {
        g.strokeStyle = verdictOk ? col.good : col.bad;
        g.lineWidth = 6;
        g.globalAlpha = 1 - (clock - verdictAt) / REVEAL;
        g.strokeRect(3, 3, W - 6, H - 6);
        g.globalAlpha = 1;
      }
      const phase = verdictAt === null ? 'idle' : clock - verdictAt < REVEAL ? 'testing' : 'done';
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
