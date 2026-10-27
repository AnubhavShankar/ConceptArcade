import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import {
  buildLevel,
  describeLanding,
  explainSolution,
  fieldAt,
  fmt,
  forceOnCharge,
  judgeJet,
  judgePair,
  judgePoint,
  judgeTracks,
  magnitude,
  pathAt,
  pointField,
  signed,
  starsFor,
  type Pt,
  type Source,
} from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const NEG = '#3156d3';
const TRACK_COLORS = ['#e07a1f', '#1f9d8a', '#8e44ad'];
const REVEAL = 0.9;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

interface Speck {
  x: number;
  y: number;
  age: number;
  life: number;
}
interface Drop {
  delay: number;
  landed: Pt | null;
}

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

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'The field bench: charges, drifting dust that shows the field, and the test objects you place.' });
    const g = fitCanvas(canvas, W, H);
    const feedback = h('p', { class: 'feedback', hidden: true, 'aria-live': 'polite' });
    const solution = h('section', { class: 'panel solution', hidden: true });
    const hint = h('p', { class: 'muted note' });
    const controls = h('div', { class: 'lab-controls' });
    const meter = h('span', { class: 'v-readout', 'aria-live': 'off' });
    const say = (text: string, good = false) => {
      feedback.hidden = false;
      feedback.className = `feedback ${good ? 'good' : 'bad'}`;
      feedback.textContent = text;
    };
    const free = lvl.freeTests;
    const costNote = () => (misses > free ? ' That cost a star.' : free > 0 ? ` ${free - misses} free test${free - misses === 1 ? '' : 's'} left.` : '');
    const freeNote = (m: string) => say(`${m} That does not cost you anything.`);
    const num = (el: HTMLInputElement) => parseNumber(el.value);
    const field = (aria: string, placeholder: string) => h('input', { class: 'field', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': aria, placeholder }) as HTMLInputElement;
    const choiceGroup = (name: string, options: [string, string, string][]) => {
      let value: string | null = null;
      const buttons = options.map(([v, text, aria]) => h('button', { class: 'btn secondary small', type: 'button', 'aria-pressed': 'false', 'aria-label': aria, onclick: () => {
        value = v;
        buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i][0] === v)));
      } }, text));
      return { buttons, get: () => value, box: h('div', { class: 'route-group' }, h('strong', null, name), ...buttons) };
    };
    const actionBtn = (text: string, aria: string, fn: () => void) => h('button', { class: 'btn', type: 'button', 'aria-label': aria, onclick: fn }, text);
    const lockAll = () => controls.querySelectorAll('button, input').forEach((b) => b.setAttribute('disabled', ''));
    const miss = (text: string) => {
      misses++;
      say(text + costNote());
    };
    const succeed = (text: string, stars: 1 | 2 | 3) => {
      finished = true;
      say(text, true);
      solution.replaceChildren(h('h3', null, 'Why that works'), ...explainSolution(lvl).map((t) => h('p', null, t)));
      solution.hidden = false;
      lockAll();
      pendingWin = stars;
    };
    const stars = () => starsFor(misses, free);

    // ---- drifting dust that shows the field (levels 1 and 2) ----------------------------------------
    let specks: Speck[] = [];
    let toCm: (p: Pt) => Pt = (p) => p;
    let toPx: (p: Pt) => Pt = (p) => p;
    let sources: Source[] = [];
    if (lvl.kind === 'point') {
      const ks = (W - 190) / 60;
      toPx = (p) => ({ x: 90 + p.x * ks, y: H / 2 - p.y * ks });
      toCm = (p) => ({ x: (p.x - 90) / ks, y: (H / 2 - p.y) / ks });
      sources = [{ q: lvl.Q, at: { x: 0, y: 0 } }];
    } else if (lvl.kind === 'pair') {
      const a = lvl.sources[1].at.x;
      const ks = (W - 140) / (3.7 * a);
      toPx = (p) => ({ x: 70 + (p.x + 1.2 * a) * ks, y: H / 2 - p.y * ks });
      toCm = (p) => ({ x: (p.x - 70) / ks - 1.2 * a, y: (H / 2 - p.y) / ks });
      sources = lvl.sources;
    }
    const spawn = (): Speck => ({ x: 10 + rnd() * (W - 20), y: 10 + rnd() * (H - 20), age: 0, life: 2.5 + rnd() * 3 });
    if (sources.length) specks = Array.from({ length: 110 }, () => ({ ...spawn(), age: rnd() * 3 }));
    function moveSpecks(dt: number) {
      for (const s of specks) {
        s.age += dt;
        const e = fieldAt(toCm({ x: s.x, y: s.y }), sources);
        const m = magnitude(e);
        const near = sources.some((c) => Math.hypot(toPx(c.at).x - s.x, toPx(c.at).y - s.y) < 16);
        if (s.age > s.life || near || s.x < 0 || s.x > W || s.y < 0 || s.y > H) Object.assign(s, spawn());
        if (m > 0) {
          const speed = 22 + 30 * Math.log10(1 + m / 120); // px/s: stronger field, faster drift
          s.x += (e.x / m) * speed * dt;
          s.y -= (e.y / m) * speed * dt;
        }
      }
    }
    function drawSpecks() {
      g.lineWidth = 1.5;
      for (const s of specks) {
        const e = fieldAt(toCm({ x: s.x, y: s.y }), sources);
        const m = magnitude(e) || 1;
        const a = Math.min(1, s.age / 0.6, (s.life - s.age) / 0.6);
        g.globalAlpha = Math.max(0, a) * 0.75;
        g.strokeStyle = col.accent;
        g.fillStyle = col.accent;
        g.beginPath();
        g.moveTo(s.x, s.y);
        g.lineTo(s.x - (e.x / m) * 7, s.y + (e.y / m) * 7);
        g.stroke();
        g.beginPath();
        g.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }

    // ---- level 1: probe the field -------------------------------------------------------------------
    let probeR = 30;
    let test: { t: number; ok: boolean; pushDir: number; force: number } | null = null;
    if (lvl.kind === 'point') {
      const slider = h('input', { type: 'range', min: 5, max: 60, step: 0.5, value: String(probeR), class: 'v-slider', 'aria-label': 'Probe distance from the source in cm', oninput: () => { probeR = Number(slider.value); } }) as HTMLInputElement;
      const nudge = (text: string, d: number) => h('button', { class: 'btn secondary small', type: 'button', 'aria-label': `Probe ${d > 0 ? 'away' : 'closer'} ${Math.abs(d)} cm`, onclick: () => { probeR = Math.min(60, Math.max(5, probeR + d)); slider.value = String(probeR); } }, text);
      const dir = choiceGroup('A negative test charge placed there will be…', [['toward', 'Pulled towards the source', 'Pulled towards the source'], ['away', 'Pushed away from the source', 'Pushed away from the source']]);
      const run = () => {
        if (finished) return;
        if (!dir.get()) return freeNote('Say which way you expect the negative test charge to be pushed first.');
        const res = judgePoint(lvl, probeR, dir.get() as 'toward' | 'away');
        const force = Math.abs(forceOnCharge(lvl.testQ, pointField(lvl.Q, probeR)));
        test = { t: 0, ok: res.ok, pushDir: res.truth === 'toward' ? -1 : 1, force };
        if (res.ok) return succeed(`The meter reads ${fmt(res.field)} N/C: right on target. The test charge feels ${fmt(force)} N.`, stars());
        const parts: string[] = [];
        if (!res.fieldOk) parts.push(`The field here is ${res.verdict === 'too-strong' ? 'stronger' : 'weaker'} than the target of ${fmt(lvl.target)} N/C: the probe is too ${res.verdict === 'too-strong' ? 'close' : 'far'}.`);
        if (!res.directionOk) parts.push(`A negative test charge is ${res.truth === 'toward' ? 'pulled towards a positive source' : 'pushed away from a negative source'}: it feels a force opposite to the field.`);
        miss(parts.join(' '));
      };
      controls.append(
        h('div', { class: 'control' }, h('span', { class: 'control-label' }, `Target field: ${fmt(lvl.target)} N/C`), slider, nudge('−0.5', -0.5), nudge('+0.5', 0.5), meter),
        dir.box,
        actionBtn('Place the test charge', 'Place the test charge', run),
      );
      hint.textContent = `The source is ${signed(lvl.Q)}. The test charge is ${signed(lvl.testQ)}.`;
    }

    // ---- level 2: two sources, one point -------------------------------------------------------------
    if (lvl.kind === 'pair') {
      const qIn = field('Test charge at P in nC', 'q = ? nC');
      const need = lvl.targetF;
      const run = () => {
        if (finished) return;
        const q = num(qIn);
        if (q === null || q === 0) return freeNote('Enter the test charge in nC, with a minus sign if it is negative.');
        const res = judgePair(lvl, q);
        test = { t: 0, ok: res.ok, pushDir: Math.sign(res.force), force: Math.abs(res.force) };
        if (res.ok) return succeed(`The force on the test charge is ${fmt(Math.abs(res.force))} N ${res.force > 0 ? 'to the right' : 'to the left'}: exactly the order.`, stars());
        if (Math.sign(res.force) !== Math.sign(need)) return miss(`The force on your charge points ${res.force > 0 ? 'to the right' : 'to the left'}, the wrong way.`);
        miss(`The force on your charge is ${Math.abs(res.force) > Math.abs(need) ? 'too strong' : 'too weak'}.`);
      };
      qIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, `Order: ${fmt(Math.abs(need))} N ${need > 0 ? 'to the right' : 'to the left'}`), qIn, h('span', { class: 'unit' }, 'nC')), actionBtn('Place the test charge at P', 'Place the test charge', run));
      hint.textContent = `A is ${signed(lvl.sources[0].q)} at the left, B is ${signed(lvl.sources[1].q)} at the right, ${lvl.sources[1].at.x * 2} cm apart. P is ${lvl.probe.x === 0 ? 'the midpoint' : `${lvl.sources[1].at.x} cm beyond B`}.`;
    }

    // ---- levels 3 and 5: the ink-jet -------------------------------------------------------------------
    const XS = 5; // px per mm along the beam
    const YS = 16; // px per mm sideways (exaggerated so small bends show)
    let drops: Drop[] = [];
    let fireT = 0;
    let firing = false;
    let spots: Pt[] = [];
    let chosenDir: 1 | -1 | null = null;
    let jetField = 0;
    let jetLanding: number | null = null;
    let onFireDone: (() => void) | null = null;
    if (lvl.kind === 'jet') {
      const dir = choiceGroup('Field between the plates', [['up', 'Field up', 'Field up'], ['down', 'Field down', 'Field down']]);
      dir.buttons.forEach((b, i) => b.addEventListener('click', () => { chosenDir = i === 0 ? 1 : -1; }));
      const eIn = field('Field strength in N/C', 'E = ? N/C');
      const fire = () => {
        if (finished || firing) return;
        const e = num(eIn);
        if (e === null || e <= 0) return freeNote('Enter the field strength as a positive number of N/C. The direction is the buttons above.');
        if (!chosenDir) return freeNote('Choose whether the field points up or down first.');
        const res = judgeJet(lvl, e, chosenDir);
        jetField = e;
        jetLanding = res.landing;
        drops = Array.from({ length: 7 }, (_, i) => ({ delay: i * 0.22, landed: null }));
        spots = [];
        fireT = 0;
        firing = true;
        pendingFire = res;
      };
      let pendingFire: ReturnType<typeof judgeJet> | null = null;
      onFireDone = () => {
        const res = pendingFire;
        pendingFire = null;
        if (!res) return;
        if (res.ok) return succeed(`The drops land ${describeLanding(res.landing)}: on the spot.`, stars());
        if (res.side === 'wrong-side') return miss(`The drops bend ${res.landing > 0 ? 'up' : 'down'}, away from the target. ${lvl.drop.q > 0 ? 'A positive drop moves along the field.' : 'A negative drop moves against the field.'}`);
        miss(`The drops land ${res.side === 'too-high' ? 'beyond' : 'short of'} the marked spot: ${res.side === 'too-high' ? 'the field is too strong' : 'the field is too weak'}.`);
      };
      eIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && fire());
      controls.append(
        h('div', { class: 'control' }, h('span', { class: 'control-label' }, `Target: ${fmt(Math.abs(lvl.yTarget))} mm ${lvl.yTarget > 0 ? 'above' : 'below'} the beam line`)),
        dir.box,
        h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Field strength'), eIn, h('span', { class: 'unit' }, 'N/C')),
        actionBtn('Fire the ink drops', 'Fire the drops', fire),
      );
      hint.textContent = `Drops: ${signed(lvl.drop.q)}, mass ${lvl.drop.m} µg, speed ${lvl.v0} m/s. Plates ${lvl.L} cm long${lvl.D > 0 ? `, paper ${lvl.D} cm beyond them` : ', paper at the plate edge'}. The sideways scale is stretched.`;
    }

    // ---- level 4: tracks ------------------------------------------------------------------------------
    let fired = false;
    let trackT = 0;
    if (lvl.kind === 'tracks') {
      const groups = lvl.tracks.map((t) => choiceGroup(`Track ${t.id}`, [['1', 'Positive', `Track ${t.id} positive`], ['-1', 'Negative', `Track ${t.id} negative`]]));
      const top = choiceGroup('Highest charge-to-mass ratio', lvl.tracks.map((t) => [String(t.id), `Track ${t.id}`, `Track ${t.id} has the highest charge-to-mass ratio`] as [string, string, string]));
      const fire = () => {
        if (finished) return;
        fired = true;
        trackT = 0;
      };
      const submit = () => {
        if (finished) return;
        if (!fired) return freeNote('Fire the particles and watch the tracks first.');
        const signs = groups.map((gr) => (gr.get() === null ? null : (Number(gr.get()) as 1 | -1)));
        if (signs.some((s) => s === null) || top.get() === null) return freeNote('Tag all three tracks and pick the one with the highest charge-to-mass ratio.');
        const res = judgeTracks(lvl, signs, Number(top.get()));
        if (res.ok) return succeed('All three tags are right.', stars());
        const wrong = res.signsOk.filter((v) => !v).length;
        const parts: string[] = [];
        if (wrong) parts.push(`${wrong} of the 3 signs ${wrong === 1 ? 'is' : 'are'} wrong: a positive particle bends along the field and a negative one against it.`);
        if (!res.highestOk) parts.push('The particle with the highest charge-to-mass ratio is not the one you picked: compare how far each track bends.');
        miss(parts.join(' '));
      };
      controls.append(actionBtn('Fire all three particles', 'Fire all three particles', fire), ...groups.map((gr) => gr.box), top.box, actionBtn('Submit the tags', 'Submit the tags', submit));
      hint.textContent = `The field points ${lvl.dir > 0 ? 'up' : 'down'}. All three particles enter at ${lvl.v0} m/s. The sideways scale is stretched.`;
    }

    // ---- drawing ----------------------------------------------------------------------------------------
    function arrow(from: Pt, dx: number, dy: number, len: number, color: string, width = 4) {
      const m = Math.hypot(dx, dy) || 1;
      const ux = dx / m;
      const uy = dy / m;
      const x2 = from.x + ux * len;
      const y2 = from.y + uy * len;
      g.strokeStyle = color;
      g.fillStyle = color;
      g.lineWidth = width;
      g.beginPath();
      g.moveTo(from.x, from.y);
      g.lineTo(x2, y2);
      g.stroke();
      const hd = 11;
      g.beginPath();
      g.moveTo(x2, y2);
      g.lineTo(x2 - ux * hd - uy * hd * 0.55, y2 - uy * hd + ux * hd * 0.55);
      g.lineTo(x2 - ux * hd + uy * hd * 0.55, y2 - uy * hd - ux * hd * 0.55);
      g.closePath();
      g.fill();
    }
    const chargeDot = (p: Pt, q: number, r: number, name?: string) => {
      disc(g, p.x, p.y, r, q < 0 ? NEG : POS, '#ffffff', 2);
      label(g, q < 0 ? '−' : '+', p.x, p.y + 5, { size: r * 0.95, color: '#ffffff' });
      if (name) label(g, name, p.x, p.y - r - 8, { size: 13, color: col.text });
    };

    function drawPoint() {
      if (lvl.kind !== 'point') return;
      drawSpecks();
      const src = toPx({ x: 0, y: 0 });
      const p = toPx({ x: probeR, y: 0 });
      g.strokeStyle = col.muted;
      g.lineWidth = 1;
      g.setLineDash([5, 5]);
      g.beginPath();
      g.moveTo(src.x, src.y + 52);
      g.lineTo(p.x, p.y + 52);
      g.stroke();
      g.setLineDash([]);
      label(g, `r = ${fmt(probeR)} cm`, (src.x + p.x) / 2, src.y + 70, { size: 13, bold: false, color: col.muted });
      chargeDot(src, lvl.Q, 22, 'source');
      // the probe: a ring where the field is measured
      disc(g, p.x, p.y, 9, 'rgba(0,0,0,0)', col.text, 2.5);
      label(g, 'probe', p.x, p.y - 20, { size: 12, bold: false, color: col.muted });
      const e = pointField(lvl.Q, probeR);
      meter.textContent = `E = ${fmt(Math.abs(e))} N/C`;
      // a field arrow at the probe, pointing the way a positive charge would be pushed
      arrow({ x: p.x, y: p.y - 38 }, Math.sign(lvl.Q), 0, Math.min(70, 10 + 14 * Math.log10(1 + Math.abs(e) / 50)), col.good, 3);
      if (test) {
        const k = ease(Math.min(1, test.t / REVEAL));
        const bx = p.x + test.pushDir * 46 * k;
        disc(g, bx, p.y, 11, NEG, '#ffffff', 2);
        label(g, '−', bx, p.y + 5, { size: 14, color: '#ffffff' });
        arrow({ x: bx, y: p.y + 24 }, test.pushDir, 0, 50 * k, test.ok ? col.good : col.bad, 4);
        if (k >= 1) label(g, `F = ${fmt(test.force)} N`, bx, p.y + 52, { size: 13, color: test.ok ? col.good : col.bad });
      }
    }

    function drawPair() {
      if (lvl.kind !== 'pair') return;
      drawSpecks();
      lvl.sources.forEach((s, i) => chargeDot(toPx(s.at), s.q, 21, i === 0 ? 'A' : 'B'));
      const p = toPx(lvl.probe);
      disc(g, p.x, p.y, 9, 'rgba(0,0,0,0)', col.text, 2.5);
      label(g, 'P', p.x, p.y - 20, { size: 14, color: col.text });
      if (test) {
        const k = ease(Math.min(1, test.t / REVEAL));
        const q = Number((controls.querySelector('input') as HTMLInputElement).value);
        const sgn = Number.isFinite(q) && q !== 0 ? q : 1;
        disc(g, p.x, p.y, 11, sgn < 0 ? NEG : POS, '#ffffff', 2);
        label(g, sgn < 0 ? '−' : '+', p.x, p.y + 4, { size: 14, color: '#ffffff' });
        const len = Math.min(130, 70 * (test.force / Math.abs(lvl.targetF))) * k;
        arrow({ x: p.x, y: p.y + 36 }, test.pushDir, 0, Math.max(6, len), test.ok ? col.good : col.bad, 5);
        if (k >= 1) label(g, `${fmt(test.force)} N`, p.x, p.y + 66, { size: 13, color: test.ok ? col.good : col.bad });
      }
    }

    function drawJet() {
      if (lvl.kind !== 'jet') return;
      const x0 = 130;
      const x1 = x0 + lvl.L * 10 * XS;
      const paperX = x1 + lvl.D * 10 * XS;
      const cy = H / 2;
      const gap = 72; // visual half-gap between the plates
      // plates and polarity
      const up = chosenDir === null ? null : chosenDir;
      for (const side of [-1, 1] as const) {
        g.fillStyle = col.line;
        g.fillRect(x0, cy + side * gap - 4, x1 - x0, 8);
        if (up !== null) {
          const positive = (side > 0 && up === 1) || (side < 0 && up === -1); // E points from + to −, so for E up the lower plate (side > 0) is +
          label(g, positive ? '+' : '−', (x0 + x1) / 2, cy + side * gap + (side > 0 ? 24 : -14), { size: 20, color: positive ? POS : NEG });
        }
      }
      // moving chevrons show the field direction between the plates
      if (up !== null) {
        const sp = 34;
        const off = (clock * 40) % sp;
        g.strokeStyle = col.good;
        g.lineWidth = 2;
        g.globalAlpha = 0.6;
        for (let x = x0 + 14; x < x1 - 8; x += 38) {
          for (let k = -1; k <= 1; k++) {
            const y = cy - up * (((off + k * sp) % (2 * gap - 30)) - (gap - 15));
            if (Math.abs(y - cy) > gap - 12) continue;
            g.beginPath();
            g.moveTo(x - 5, y + up * 5);
            g.lineTo(x, y - up * 5);
            g.lineTo(x + 5, y + up * 5);
            g.stroke();
          }
        }
        g.globalAlpha = 1;
      }
      // emitter and beam line
      g.strokeStyle = col.muted;
      g.setLineDash([4, 5]);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(60, cy);
      g.lineTo(paperX, cy);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = col.panel;
      g.strokeStyle = col.muted;
      g.lineWidth = 2;
      g.fillRect(24, cy - 18, 36, 36);
      g.strokeRect(24, cy - 18, 36, 36);
      label(g, 'jet', 42, cy + 5, { size: 12, color: col.text });
      // paper and target
      g.fillStyle = col.panel;
      g.fillRect(paperX, 18, 14, H - 36);
      g.strokeStyle = col.muted;
      g.strokeRect(paperX, 18, 14, H - 36);
      const ty = cy - lvl.yTarget * YS;
      g.strokeStyle = col.good;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(paperX + 7, ty, 10, 0, Math.PI * 2);
      g.moveTo(paperX - 6, ty);
      g.lineTo(paperX + 20, ty);
      g.stroke();
      label(g, `${fmt(Math.abs(lvl.yTarget))} mm ${lvl.yTarget > 0 ? 'above' : 'below'}`, paperX - 4, ty + (lvl.yTarget > 0 ? -16 : 24), { size: 12, align: 'right', color: col.good });
      // spots already printed
      for (const s of spots) disc(g, paperX + 7, s.y, 3.2, lvl.drop.q < 0 ? NEG : POS);
      // flying drops
      if (firing && jetLanding !== null) {
        const Lm = lvl.L / 100;
        const T = (Lm + lvl.D / 100) / lvl.v0;
        for (const d of drops) {
          if (d.landed) continue;
          const tau = ((fireT - d.delay) / 1.5) * T;
          if (tau < 0) continue;
          const pos = pathAt(lvl.drop, jetField, chosenDir ?? 1, lvl.v0, Lm, Math.min(tau, T));
          const px = x0 + pos.x * 1000 * XS;
          const py = cy - pos.y * 1000 * YS;
          if (tau >= T) {
            d.landed = { x: px, y: py };
            spots.push({ x: px, y: py });
            continue;
          }
          disc(g, px, py, 4.5, lvl.drop.q < 0 ? NEG : POS, '#ffffff', 1);
        }
      }
      label(g, 'sideways scale stretched', W - 12, H - 8, { size: 11, bold: false, align: 'right', color: col.muted });
    }

    function drawTracks() {
      if (lvl.kind !== 'tracks') return;
      const x0 = 130;
      const Lpx = lvl.L * 10 * XS;
      const x1 = x0 + Lpx;
      const cy = H / 2;
      const T = (lvl.L / 100 + 0.012) / lvl.v0; // time to cross the field and the short drift after it
      // the field region
      g.fillStyle = col.panel;
      g.fillRect(x0, 22, Lpx, H - 44);
      g.strokeStyle = col.line;
      g.lineWidth = 2;
      g.strokeRect(x0, 22, Lpx, H - 44);
      g.strokeStyle = col.good;
      g.lineWidth = 2;
      g.globalAlpha = 0.65;
      const sp = 40;
      const off = (clock * 40) % sp;
      for (let x = x0 + 16; x < x1 - 6; x += 34) {
        for (let k = 0; k < 8; k++) {
          const y = ((k * sp + off) % (H - 70)) + 36;
          g.beginPath();
          g.moveTo(x - 5, y + lvl.dir * 5);
          g.lineTo(x, y - lvl.dir * 5);
          g.lineTo(x + 5, y + lvl.dir * 5);
          g.stroke();
        }
      }
      g.globalAlpha = 1;
      label(g, `field ${lvl.dir > 0 ? 'up' : 'down'}`, (x0 + x1) / 2, H - 8, { size: 12, color: col.good });
      g.fillStyle = col.muted;
      g.fillRect(40, cy - 4, x0 - 40, 8);
      label(g, 'source', 70, cy - 14, { size: 12, bold: false, color: col.muted });
      if (!fired) return;
      const prog = Math.min(1, trackT / 2.0);
      lvl.tracks.forEach((t, i) => {
        const col2 = TRACK_COLORS[i];
        g.strokeStyle = col2;
        g.lineWidth = 3;
        g.beginPath();
        const steps = 70;
        let head = { x: x0, y: cy };
        for (let s = 0; s <= steps * prog; s++) {
          const tau = (s / steps) * T;
          const pos = pathAt({ q: t.q, m: t.m }, lvl.e, lvl.dir, lvl.v0, lvl.L / 100, tau);
          head = { x: x0 + pos.x * 1000 * XS, y: cy - pos.y * 1000 * YS };
          if (s === 0) g.moveTo(head.x, head.y);
          else g.lineTo(head.x, head.y);
        }
        g.stroke();
        disc(g, head.x, head.y, 6, col2, '#ffffff', 1.5);
        if (prog >= 1) label(g, String(t.id), head.x + 14, head.y + 5, { size: 15, color: col2 });
      });
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);

    return startLoop((dt) => {
      clock += dt;
      if (sources.length) moveSpecks(dt);
      if (test && test.t < REVEAL + 0.4) test.t += dt;
      if (firing) {
        fireT += dt;
        if (fireT > 0.22 * 6 + 1.6) {
          firing = false;
          drops.forEach((d) => (d.landed = d.landed ?? { x: 0, y: 0 }));
          onFireDone?.();
        }
      }
      if (fired && trackT < 2.4) trackT += dt;
      g.clearRect(0, 0, W, H);
      drawPoint();
      drawPair();
      drawJet();
      drawTracks();
      const active = lvl.kind === 'jet' ? (firing ? 'testing' : fireT > 0 ? 'done' : 'idle') : lvl.kind === 'tracks' ? (!fired ? 'idle' : trackT < 2 ? 'testing' : 'done') : !test ? 'idle' : test.t < REVEAL ? 'testing' : 'done';
      canvas.dataset.phase = active;
      if (pendingWin !== null && active !== 'testing') {
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
