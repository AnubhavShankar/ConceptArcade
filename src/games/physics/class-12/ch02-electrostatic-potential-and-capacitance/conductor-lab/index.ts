import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeDielectric, judgeShield, judgeSphere, sphereField, spherePotential, starsFor, type Inside } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const NEG = '#3156d3';
const REVEAL = 0.9;
const C = { x: W / 2, y: H / 2 };

export default defineGame({
  mount(ctx) {
    const lvl = buildLevel(ctx.level, ctx.random);
    const col = themeColors();
    const rnd = ctx.random;

    let misses = 0;
    let finished = false;
    let pendingWin: 1 | 2 | 3 | null = null;
    let wonAt: number | null = null;
    let clock = 0;
    let verdictAt: number | null = null;
    let verdictOk = false;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'Conductors and dielectrics in electric fields, with specks drifting along the field and probes that read it.' });
    const g = fitCanvas(canvas, W, H);
    const feedback = h('p', { class: 'feedback', hidden: true, 'aria-live': 'polite' });
    const solution = h('section', { class: 'panel solution', hidden: true });
    const hint = h('p', { class: 'muted note' });
    const controls = h('div', { class: 'lab-controls' });
    const meterE = h('span', { class: 'v-readout', 'aria-live': 'off' });
    const meterV = h('span', { class: 'v-readout', 'aria-live': 'off' });
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
    const slider = (aria: string, min: number, max: number, step: number, value: number, on: (v: number) => void) => h('input', { type: 'range', min, max, step, value: String(value), class: 'v-slider', 'aria-label': aria, oninput: (e: Event) => on(Number((e.target as HTMLInputElement).value)) }) as HTMLInputElement;
    const choiceGroup = <T extends string>(name: string, options: [T, string, string][]) => {
      let value: T | null = null;
      const buttons = options.map(([v, text, aria]) => h('button', { class: 'btn secondary small', type: 'button', 'aria-pressed': 'false', 'aria-label': aria, onclick: () => {
        value = v;
        buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i][0] === v)));
      } }, text));
      return { get: () => value, box: h('div', { class: 'route-group' }, h('strong', null, name), ...buttons) };
    };

    // ---- level 1: the charged sphere ----------------------------------------------------------------------------
    const k1 = 7;
    const ctr = { x: 190, y: C.y };
    let probeR = 0;
    interface Speck {
      a: number;
      r: number;
    }
    const specks: Speck[] = Array.from({ length: 70 }, () => ({ a: rnd() * Math.PI * 2, r: 0 }));
    if (lvl.kind === 'sphere') {
      probeR = lvl.R * 0.5;
      specks.forEach((s) => (s.r = lvl.R + rnd() * lvl.R * 2));
      const sl = slider('Probe distance from the centre in cm', 0, lvl.R * 3, 0.5, probeR, (v) => (probeR = v));
      const sIn = field('Field just outside the surface in N/C', 'E = ? N/C');
      const rIn = field('Field at the marked distance in N/C', 'E = ? N/C');
      const inside = choiceGroup<Inside>('Inside the sphere the field is…', [['zero', 'Zero', 'The field inside is zero'], ['not-zero', 'Not zero', 'The field inside is not zero']]);
      const run = () => {
        if (finished) return;
        const a = num(sIn);
        const b = num(rIn);
        if (a === null || b === null || a < 0 || b < 0) return freeNote('Enter both fields as numbers of N/C.');
        if (!inside.get()) return freeNote('Say what the field inside the sphere is.');
        const res = judgeSphere(lvl, a, b, inside.get() as Inside);
        verdict(res.ok);
        if (res.ok) return succeed(`Just outside: ${fmt(lvl.surface)} N/C. At ${lvl.r} cm: ${fmt(lvl.atR)} N/C. Inside: zero.`);
        const parts: string[] = [];
        if (!res.surfaceOk) parts.push('The field just outside the surface is not right: E = kq/R².');
        if (!res.atOk) parts.push('The field at the marked distance is not right: use r, the distance from the centre.');
        if (!res.insideOk) parts.push('Inside a conductor in equilibrium the field is not like that.');
        miss(parts.join(' '));
      };
      controls.append(
        h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Move the probe'), sl),
        h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Meters'), meterE, meterV),
        h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Just outside'), sIn, h('span', { class: 'unit' }, 'N/C')),
        h('div', { class: 'control' }, h('span', { class: 'control-label' }, `At ${lvl.r} cm`), rIn, h('span', { class: 'unit' }, 'N/C')),
        inside.box,
        actionBtn('Check the sphere', 'Check the sphere', run),
      );
      hint.textContent = `A conducting sphere of radius ${lvl.R} cm carries +${lvl.q} nC, spread evenly over its surface.`;
    }

    // ---- level 2: shielding ----------------------------------------------------------------------------------------------
    const answers: (boolean | null)[] = lvl.kind === 'shield' ? lvl.tiles.map(() => null) : [];
    if (lvl.kind === 'shield') {
      const groups = lvl.tiles.map((_, i) => {
        const gr = choiceGroup<'yes' | 'no'>(`Set-up ${i + 1}`, [['yes', 'The probe feels a field', `Set-up ${i + 1}: the probe feels a field`], ['no', 'The probe feels no field', `Set-up ${i + 1}: the probe feels no field`]]);
        gr.box.addEventListener('click', () => {
          answers[i] = gr.get() === null ? null : gr.get() === 'yes';
        });
        return gr;
      });
      const run = () => {
        if (finished) return;
        if (answers.some((a) => a === null)) return freeNote('Answer all four set-ups first.');
        const res = judgeShield(lvl, answers);
        verdict(res.ok);
        if (res.ok) return succeed('All four right: only an empty cavity is shielded from charges outside.');
        miss(`${res.wrong} of the 4 set-ups ${res.wrong === 1 ? 'is' : 'are'} wrong. Remember which way shielding works.`);
      };
      controls.append(...groups.map((gr) => gr.box), actionBtn('Check the four set-ups', 'Check the set-ups', run));
      hint.textContent = 'The grey ring is a conducting shell with an empty cavity. The ringed dot is the probe.';
    }

    // ---- level 3: the dielectric ---------------------------------------------------------------------------------------------
    const polar = new Set<string>();
    if (lvl.kind === 'dielectric') {
      const eIn = field('Field inside the dielectric in N/C', 'E = ? N/C');
      const chips = lvl.molecules.map((m) => h('button', { class: 'btn secondary small', type: 'button', 'aria-pressed': 'false', 'aria-label': `Polar: ${m.name}`, onclick: () => {
        if (finished) return;
        if (polar.has(m.name)) polar.delete(m.name);
        else polar.add(m.name);
        chips.forEach((b, i) => b.setAttribute('aria-pressed', String(polar.has(lvl.molecules[i].name))));
      } }, m.name));
      const run = () => {
        if (finished) return;
        const e = num(eIn);
        if (e === null || e <= 0) return freeNote('Enter the field inside as a positive number of N/C.');
        if (polar.size === 0) return freeNote('Tick the molecules that are polar.');
        const res = judgeDielectric(lvl, e, [...polar]);
        verdict(res.ok);
        if (res.ok) return succeed(`E = E₀/K = ${fmt(lvl.answer)} N/C, and the polar molecules are the ones with a permanent dipole.`);
        const parts: string[] = [];
        if (!res.eOk) parts.push('The field inside is not right: the induced field reduces the applied field by the factor K.');
        if (!res.setOk) parts.push('The set of polar molecules is not right.');
        miss(parts.join(' '));
      };
      eIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Field inside'), eIn, h('span', { class: 'unit' }, 'N/C')), h('p', { class: 'muted' }, 'Which molecules are polar?'), h('div', { class: 'bench' }, ...chips), actionBtn('Check the slab', 'Check the slab', run));
      hint.textContent = `Applied field E₀ = ${fmt(lvl.e0)} N/C. The slab has dielectric constant K = ${lvl.k}.`;
    }

    // ---- drawing -----------------------------------------------------------------------------------------------------------
    function drawSphere() {
      if (lvl.kind !== 'sphere') return;
      const R = lvl.R * k1;
      g.fillStyle = col.panel;
      g.strokeStyle = col.text;
      g.lineWidth = 4;
      g.beginPath();
      g.arc(ctr.x, ctr.y, R, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      // charge sits on the surface and sparkles
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2 + clock * 0.15;
        g.fillStyle = POS;
        g.globalAlpha = 0.55 + 0.45 * Math.sin(clock * 3 + i);
        g.beginPath();
        g.arc(ctr.x + Math.cos(a) * (R - 3), ctr.y + Math.sin(a) * (R - 3), 3, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      label(g, 'no field inside', ctr.x, ctr.y + 5, { size: 13, bold: false, color: col.muted });
      // specks flow outward only outside the sphere
      g.strokeStyle = col.accent;
      g.lineWidth = 1.8;
      for (const s of specks) {
        const rr = s.r;
        const x = ctr.x + Math.cos(s.a) * rr * k1;
        const y = ctr.y + Math.sin(s.a) * rr * k1;
        g.globalAlpha = 0.7;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - Math.cos(s.a) * 7, y - Math.sin(s.a) * 7);
        g.stroke();
      }
      g.globalAlpha = 1;
      const px = ctr.x + probeR * k1;
      g.strokeStyle = col.text;
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(px, ctr.y, 9, 0, Math.PI * 2);
      g.stroke();
      label(g, 'probe', px, ctr.y - 17, { size: 12, color: col.text });
      g.setLineDash([4, 4]);
      g.strokeStyle = col.muted;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(ctr.x + lvl.r * k1, ctr.y - 90);
      g.lineTo(ctr.x + lvl.r * k1, ctr.y + 90);
      g.stroke();
      g.setLineDash([]);
      label(g, `${lvl.r} cm`, ctr.x + lvl.r * k1, ctr.y + 106, { size: 12, color: col.muted });
      meterE.textContent = `E = ${fmt(sphereField(lvl.q, lvl.R, probeR))} N/C`;
      meterV.textContent = `V = ${fmt(spherePotential(lvl.q, lvl.R, probeR))} V`;
      // little graphs of E and V against distance, with the probe marked
      const gx = 400;
      const gw = 215;
      const peak = sphereField(lvl.q, lvl.R, lvl.R);
      const vmax = spherePotential(lvl.q, lvl.R, lvl.R);
      for (const [name, y0, f, mx, c] of [['E', 120, (r: number) => sphereField(lvl.q, lvl.R, r), peak, col.bad], ['V', 250, (r: number) => spherePotential(lvl.q, lvl.R, r), vmax, col.good]] as const) {
        g.strokeStyle = col.line;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(gx, y0);
        g.lineTo(gx + gw, y0);
        g.stroke();
        g.strokeStyle = c;
        g.lineWidth = 2.5;
        g.beginPath();
        for (let i = 0; i <= 120; i++) {
          const r = (i / 120) * lvl.R * 3;
          const x = gx + (i / 120) * gw;
          const y = y0 - Math.min(1, f(r) / mx) * 60;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
        const dx = gx + (probeR / (lvl.R * 3)) * gw;
        disc(g, dx, y0 - Math.min(1, f(probeR) / mx) * 60, 5, c, '#ffffff', 1.5);
        label(g, name + ' against distance', gx + gw / 2, y0 - 72, { size: 12, color: c });
      }
    }
    function drawShield() {
      if (lvl.kind !== 'shield') return;
      lvl.tiles.forEach((t, i) => {
        const cx = 160 + (i % 2) * 320;
        const cy = 90 + Math.floor(i / 2) * 170;
        g.strokeStyle = col.line;
        g.lineWidth = 1.5;
        g.strokeRect(cx - 150, cy - 80, 300, 160);
        label(g, String(i + 1), cx - 138, cy - 62, { size: 14, color: col.muted });
        g.fillStyle = col.muted;
        g.globalAlpha = 0.45;
        g.beginPath();
        g.arc(cx, cy, 46, 0, Math.PI * 2);
        g.arc(cx, cy, 28, 0, Math.PI * 2, true);
        g.fill();
        g.globalAlpha = 1;
        const ca = (t.chargeAngle * Math.PI) / 180;
        const pa = (t.probeAngle * Math.PI) / 180 + Math.PI * 0.7;
        const q = t.charge === 'cavity' ? { x: cx + Math.cos(ca) * 10, y: cy + Math.sin(ca) * 10 } : { x: cx + Math.cos(ca) * 98, y: cy + Math.sin(ca) * 52 };
        const pr = t.probe === 'cavity' ? { x: cx - Math.cos(ca) * 12, y: cy - Math.sin(ca) * 12 } : { x: cx + Math.cos(pa) * 98, y: cy + Math.sin(pa) * 52 };
        // specks ripple out of the charge
        g.strokeStyle = POS;
        g.lineWidth = 1.8;
        for (let r = 0; r < 3; r++) {
          const f = ((clock * 0.35 + r / 3) % 1 + 1) % 1;
          g.globalAlpha = 0.5 * (1 - f);
          g.beginPath();
          g.arc(q.x, q.y, 6 + f * (t.charge === 'cavity' ? 20 : 50), 0, Math.PI * 2);
          g.stroke();
        }
        g.globalAlpha = 1;
        disc(g, q.x, q.y, t.charge === 'cavity' ? 6 : 9, POS, '#ffffff', 1.5);
        g.strokeStyle = col.text;
        g.lineWidth = 2.5;
        g.beginPath();
        g.arc(pr.x, pr.y, 6, 0, Math.PI * 2);
        g.stroke();
        label(g, 'probe', pr.x, pr.y - 12, { size: 10, bold: false, color: col.muted });
        if (verdictAt !== null && finished) label(g, t.field ? 'field' : 'no field', cx, cy + 74, { size: 12, color: t.field ? col.bad : col.good });
      });
    }
    function drawDielectric() {
      if (lvl.kind !== 'dielectric') return;
      const x0 = 210;
      const x1 = 430;
      g.fillStyle = col.panel;
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      g.fillRect(x0, 70, x1 - x0, 200);
      g.strokeRect(x0, 70, x1 - x0, 200);
      label(g, `K = ${lvl.k}`, C.x, 62, { size: 14, color: col.text });
      // the applied field is long outside and shorter (divided by K) inside
      for (let row = 0; row < 5; row++) {
        const y = 95 + row * 40;
        g.strokeStyle = col.accent;
        g.lineWidth = 2.5;
        const shift = (clock * 30) % 40;
        for (let x = 20; x < W - 20; x += 40) {
          const inside = x + shift > x0 && x + shift < x1;
          const len = inside ? 10 / (lvl.k / 2) : 18;
          const px = x + shift;
          g.globalAlpha = 0.65;
          g.beginPath();
          g.moveTo(px, y);
          g.lineTo(px + len, y);
          g.lineTo(px + len - 5, y - 4);
          g.moveTo(px + len, y);
          g.lineTo(px + len - 5, y + 4);
          g.stroke();
        }
      }
      g.globalAlpha = 1;
      // molecules as small dipoles that line up with the field
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const mx = x0 + 35 + c * 50;
        const my = 100 + r * 45;
        const wob = Math.sin(clock * 2 + r + c) * 0.25 * Math.max(0, 1 - clock / 2);
        g.strokeStyle = col.muted;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(mx - 9 * Math.cos(wob), my + 9 * Math.sin(wob));
        g.lineTo(mx + 9 * Math.cos(wob), my - 9 * Math.sin(wob));
        g.stroke();
        disc(g, mx - 9 * Math.cos(wob), my + 9 * Math.sin(wob), 4, NEG);
        disc(g, mx + 9 * Math.cos(wob), my - 9 * Math.sin(wob), 4, POS);
      }
      // the induced surface charges
      for (let r = 0; r < 5; r++) {
        disc(g, x0 - 2, 95 + r * 40, 4, NEG);
        disc(g, x1 + 2, 95 + r * 40, 4, POS);
      }
      label(g, 'induced charge', x0 - 2, 288, { size: 11, bold: false, color: NEG });
      label(g, 'induced charge', x1 + 2, 288, { size: 11, bold: false, color: POS });
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      g.clearRect(0, 0, W, H);
      drawSphere();
      drawShield();
      drawDielectric();
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
