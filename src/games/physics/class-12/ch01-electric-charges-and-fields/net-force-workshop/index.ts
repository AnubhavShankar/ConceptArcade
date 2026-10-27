import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import {
  attracts,
  buildLevel,
  describeDirection,
  explainSolution,
  fmt,
  forceN,
  forceOn,
  judgeAllRest,
  judgeGap,
  judgeNull,
  judgeRescale,
  judgeRest,
  magnitude,
  nullCorners,
  OPS,
  pairBehaviour,
  signed,
  starsFor,
  type Pt,
  type Region,
} from './logic';

const W = 640;
const H = 330;
const POS = '#c0392b';
const NEG = '#3156d3';
const REVEAL = 0.9; // seconds the arrows take to appear

interface Arrow {
  from: Pt; // in screen pixels
  dir: Pt; // physical direction, y up
  newtons: number;
  color: string;
  caption: string;
  thick?: boolean;
}
interface Dot {
  name: string;
  q: number | null;
  px: Pt;
  ghost?: boolean;
}

export default defineGame({
  mount(ctx) {
    const lvl = buildLevel(ctx.level, ctx.random);
    const col = themeColors();

    let misses = 0;
    let finished = false;
    let predictionCharged = false;
    let test: { t: number; ok: boolean } | null = null;
    let arrows: { list: Arrow[]; push?: { dir: number; amount: number } } | null = null;
    let wasOk = false;
    let pendingWin: 1 | 2 | 3 | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'The force bench: charges drawn as circles with their signs, and arrows showing the forces after each test.' });
    const g = fitCanvas(canvas, W, H);
    const feedback = h('p', { class: 'feedback', hidden: true, 'aria-live': 'polite' });
    const solution = h('section', { class: 'panel solution', hidden: true });
    const hint = h('p', { class: 'muted note' });
    const say = (text: string, good = false) => {
      feedback.hidden = false;
      feedback.className = `feedback ${good ? 'good' : 'bad'}`;
      feedback.textContent = text;
    };
    const free = () => lvl.freeTests;
    const costNote = () => (misses > free() ? ' That cost a star.' : free() > 0 && misses <= free() ? ` ${Math.max(0, free() - misses)} free test${free() - misses === 1 ? '' : 's'} left.` : '');
    const num = (el: HTMLInputElement) => parseNumber(el.value);
    const field = (aria: string, placeholder: string) => h('input', { class: 'field', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': aria, placeholder }) as HTMLInputElement;
    const choiceGroup = (name: string, options: [string, string][], onPick?: () => void) => {
      let value: string | null = null;
      const buttons = options.map(([v, text]) => h('button', { class: 'btn secondary small', type: 'button', 'aria-pressed': 'false', 'aria-label': text, onclick: () => {
        value = v;
        buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i][0] === v)));
        onPick?.();
      } }, text));
      return { name, buttons, get: () => value, box: h('div', { class: 'route-group' }, h('strong', null, name), ...buttons) };
    };
    const testBtn = (text: string, aria: string, fn: () => void) => h('button', { class: 'btn', type: 'button', 'aria-label': aria, onclick: fn }, text);
    const lockAll = () => controls.querySelectorAll('button, input').forEach((b) => b.setAttribute('disabled', ''));

    const controls = h('div', { class: 'lab-controls' });

    // ---- the verdict, shared by every level -----------------------------------------------------
    function start(list: Arrow[], ok: boolean, push?: { dir: number; amount: number }) {
      arrows = { list, push };
      test = { t: 0, ok };
    }
    function miss(text: string) {
      misses++;
      say(text + costNote());
    }
    function succeed(text: string) {
      finished = true;
      wasOk = true;
      say(text, true);
      solution.replaceChildren(h('h3', null, 'Why that works'), ...explainSolution(lvl).map((t) => h('p', null, t)));
      solution.hidden = false;
      lockAll();
      pendingWin = Math.max(1, starsFor(misses, free()) - (predictionCharged ? 1 : 0)) as 1 | 2 | 3;
    }
    const freeNote = (msg: string) => say(`${msg} That does not cost you anything.`);

    // ---- geometry helpers --------------------------------------------------------------------
    /** Map cm to pixels with the origin at the middle of the board. */
    const mapper = (spanCm: number, maxPx: number, cx = W / 2, cy = H / 2) => {
      const k = Math.min(maxPx / spanCm, 40);
      return { k, at: (p: Pt): Pt => ({ x: cx + p.x * k, y: cy - p.y * k }) };
    };

    let dots: Dot[] = [];
    let rulers: { a: Pt; b: Pt; text: string }[] = [];
    let captions: { text: string; x: number; y: number; size?: number; color?: string }[] = [];
    let arrowScale = 1;

    // ---- level 1: set the gap ------------------------------------------------------------------
    if (lvl.kind === 'gap') {
      const rIn = field('Separation in cm', 'r = ? cm');
      const dir = choiceGroup('The charges will…', [['pull', 'Pull together'], ['push', 'Push apart']]);
      const size = choiceGroup('Force on B compared with force on A…', [['same', 'Same size'], ['more', 'B feels more'], ['less', 'B feels less']]);
      const run = () => {
        if (finished) return;
        const r = num(rIn);
        if (r === null || r <= 0) return freeNote('Enter the separation as a positive number of cm.');
        if (!dir.get() || !size.get()) return freeNote('Say what you expect first: pick a direction and a size for the force on B.');
        const res = judgeGap(lvl, r);
        const actual = pairBehaviour(lvl.q1, lvl.q2);
        const dirOk = (dir.get() === 'pull') === (actual === 'attract');
        const sizeOk = size.get() === 'same';
        let slip = '';
        if (!predictionCharged && (!dirOk || !sizeOk)) {
          predictionCharged = true;
          slip = ` You expected ${!dirOk ? `the charges to ${dir.get() === 'pull' ? 'pull together' : 'push apart'}, but they ${actual === 'attract' ? 'pull together (unlike charges)' : 'push apart (like charges)'}` : 'a different force on B, but the forces on the two charges are equal and opposite'}. That cost a star.`;
        }
        const f = forceOn({ name: 'A', q: lvl.q1, at: { x: -r / 2, y: 0 } }, { name: 'B', q: lvl.q2, at: { x: r / 2, y: 0 } });
        const m = mapper(Math.max(r, 12), W - 200);
        const pa = m.at({ x: -r / 2, y: 0 });
        const pb = m.at({ x: r / 2, y: 0 });
        start([
          { from: pa, dir: f, newtons: magnitude(f), color: col.accent, caption: `on A: ${fmt(res.reading)} N` },
          { from: pb, dir: { x: -f.x, y: -f.y }, newtons: magnitude(f), color: col.accent, caption: `on B: ${fmt(res.reading)} N` },
        ], res.ok);
        if (res.ok) {
          succeed(`The scale reads ${fmt(res.reading)} N: exactly the target.${slip}`);
        } else {
          miss(`The scale reads ${res.verdict === 'too-strong' ? 'too high' : 'too low'} against the target of ${fmt(lvl.target)} N: the charges are too ${res.verdict === 'too-strong' ? 'close' : 'far apart'}.${slip}`);
        }
      };
      rIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, `Target reading: ${fmt(lvl.target)} N`), rIn, h('span', { class: 'unit' }, 'cm')), dir.box, size.box, testBtn('Place the charges and test', 'Place and test', run));
      hint.textContent = `Charge A is ${signed(lvl.q1)} and charge B is ${signed(lvl.q2)}.`;
    }

    // ---- level 2: rescale ------------------------------------------------------------------------
    if (lvl.kind === 'rescale') {
      const factorIn = field('New reading as a multiple of the old reading', '× ?');
      const dir = choiceGroup('Afterwards the spheres…', [['attract', 'Attract'], ['repel', 'Repel']]);
      const run = () => {
        if (finished) return;
        const fct = num(factorIn);
        if (fct === null || fct <= 0) return freeNote('Enter the new reading as a positive multiple of the old one, such as 0.5 or 8.');
        if (!dir.get()) return freeNote('Say whether the spheres will attract or repel afterwards.');
        const res = judgeRescale(lvl, fct, dir.get() === 'attract');
        const after = lvl.after;
        const m = mapper(Math.max(lvl.before.r, after.r, 8), W - 220, W / 2, H / 2);
        const f = forceN(after.q1, after.q2, after.r);
        const left = m.at({ x: -after.r / 2, y: 0 });
        const right = m.at({ x: after.r / 2, y: 0 });
        const sgn = attracts(after) ? 1 : -1;
        start([
          { from: { x: left.x, y: H * 0.74 }, dir: { x: sgn, y: 0 }, newtons: f, color: col.accent, caption: `${fmt(f)} N` },
          { from: { x: right.x, y: H * 0.74 }, dir: { x: -sgn, y: 0 }, newtons: f, color: col.accent, caption: `${fmt(f)} N` },
        ], res.ok);
        if (res.ok) return succeed(`The new reading is ${fmt(f)} N, ${fmt(lvl.factor)} times the old ${fmt(lvl.f0)} N, and the spheres ${attracts(after) ? 'attract' : 'repel'}.`);
        const parts: string[] = [];
        if (!res.factorOk) parts.push(`The new reading is ${res.trueIs === 'higher' ? 'higher' : 'lower'} than you predicted.`);
        if (!res.directionOk) parts.push(`The spheres ${attracts(after) ? 'attract' : 'repel'} after the change, not the other way round.`);
        miss(parts.join(' '));
      };
      factorIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(
        h('div', { class: 'panel' }, h('strong', null, 'The experiment is changed:'), h('ol', null, ...lvl.ops.map((op) => h('li', null, OPS[op])))),
        h('div', { class: 'control' }, h('span', { class: 'control-label' }, `Old reading: ${fmt(lvl.f0)} N`), factorIn),
        dir.box,
        testBtn('Run the changed experiment', 'Run the changed experiment', run),
      );
      hint.textContent = `Before: A is ${signed(lvl.before.q1)}, B is ${signed(lvl.before.q2)}, gap ${lvl.before.r} cm.`;
    }

    // ---- level 3: null the probe -------------------------------------------------------------------
    if (lvl.kind === 'null') {
      const adj = lvl.corners.filter((c) => c.q === null);
      const inputs = adj.map((c) => field(`Charge at ${c.name} in µC`, `${c.name} = ? µC`));
      const run = () => {
        if (finished) return;
        const vals = inputs.map(num);
        if (vals.some((v) => v === null)) return freeNote(`Enter a charge in µC for ${adj.map((c) => c.name).join(' and ')}. Use a minus sign for negative.`);
        const chosen = vals as number[];
        const res = judgeNull(lvl, chosen);
        const corners = nullCorners(lvl, chosen);
        const m = mapper(lvl.radius * 2.2, H - 90);
        const centre = m.at({ x: 0, y: 0 });
        const list: Arrow[] = corners.map((cn) => {
          const f = forceOn(lvl.probe, cn);
          return { from: centre, dir: f, newtons: magnitude(f), color: cn.q < 0 ? NEG : POS, caption: '' };
        });
        list.push({ from: centre, dir: res.net, newtons: magnitude(res.net), color: col.good, caption: magnitude(res.net) < 1e-6 ? 'net force: 0' : `net: ${fmt(magnitude(res.net))} N`, thick: true });
        start(list, res.ok);
        if (res.ok) return succeed('The forces cancel: the probe feels no net force.');
        miss(`The probe is pushed or pulled ${describeDirection(res.net)} with a net force of ${fmt(magnitude(res.net))} N.`);
      };
      inputs.forEach((i) => i.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run()));
      controls.append(h('div', { class: 'control' }, ...adj.flatMap((c, i) => [h('span', { class: 'control-label' }, `Charge at ${c.name}`), inputs[i], h('span', { class: 'unit' }, 'µC')])), testBtn('Test the probe', 'Test the probe', run));
      hint.textContent = `The probe is +1 µC. ${lvl.corners.filter((c) => c.q !== null).map((c) => `${c.name} is ${signed(c.q as number)}`).join(', ')}. Corners are ${fmt(lvl.radius)} cm from the probe.`;
    }

    // ---- level 4: rest on a line ----------------------------------------------------------------
    if (lvl.kind === 'rest') {
      const region = choiceGroup('The balance point is…', [['left', 'Left of A'], ['between', 'Between A and B'], ['right', 'Right of B']]);
      const dIn = field('Distance from A in cm', 'x = ? cm');
      const run = () => {
        if (finished) return;
        const dist = num(dIn);
        if (dist === null || dist <= 0) return freeNote('Enter the distance from A as a positive number of cm.');
        if (!region.get()) return freeNote('Choose which region of the line the balance point is in.');
        const res = judgeRest(lvl, region.get() as Region, dist);
        const view = lineView();
        const p = view.at({ x: res.x, y: 0 });
        const probeDot: Arrow = { from: p, dir: res.net, newtons: magnitude(res.net), color: col.good, caption: res.ok ? 'net force: 0' : `net: ${fmt(magnitude(res.net))} N`, thick: true };
        const pushDir = Math.sign(res.net.x);
        start([probeDot], res.ok, res.ok ? undefined : { dir: pushDir, amount: Math.min(0.2, 0.08 + 0.2 * Math.min(1, Math.abs(res.net.x) / 5)) });
        probeAt = res.x;
        if (res.ok) return succeed('The probe stays put: the two forces on it are equal and opposite.');
        const slide = pushDir === 0 ? 'stays where it is, but not at a balance point' : `slides ${pushDir > 0 ? 'towards B' : 'towards A'}`;
        miss(`${res.regionOk ? '' : 'That region cannot be right: the two forces point the same way there, or the wrong charge is stronger. '}The probe ${slide}.`);
      };
      dIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(region.box, h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Distance from A'), dIn, h('span', { class: 'unit' }, 'cm')), testBtn('Release the probe', 'Release the probe', run));
      hint.textContent = `A is ${signed(lvl.a.q)} and B is ${signed(lvl.b.q)}, ${lvl.b.at.x} cm apart. The probe is +1 µC.`;
    }

    // ---- level 5: everyone at rest -----------------------------------------------------------------
    if (lvl.kind === 'allrest') {
      const xIn = field('Distance of the new charge from A in cm', 'x = ? cm');
      const qIn = field('Charge of the new charge in µC', 'q = ? µC');
      const run = () => {
        if (finished) return;
        const x = num(xIn);
        const q = num(qIn);
        if (x === null || q === null || x <= 0 || x >= lvl.b.at.x) return freeNote(`Enter a distance from A between 0 and ${lvl.b.at.x} cm, and a charge in µC (with a minus sign if negative).`);
        const res = judgeAllRest(lvl, x, q);
        const view = lineView();
        start(res.charges.map((cn, i) => ({ from: view.at(cn.at), dir: res.nets[i], newtons: magnitude(res.nets[i]), color: magnitude(res.nets[i]) / Math.max(1e-9, forceN(lvl.a.q, lvl.b.q, lvl.b.at.x)) < lvl.tol ? col.good : col.bad, caption: magnitude(res.nets[i]) < 1e-6 ? 'at rest' : `net: ${fmt(magnitude(res.nets[i]))} N`, thick: true })), res.ok);
        thirdAt = { x, q };
        if (res.ok) return succeed('All three charges feel zero net force: the whole set is in equilibrium.');
        const bad = res.charges.filter((_, i) => magnitude(res.nets[i]) / Math.max(1e-9, forceN(lvl.a.q, lvl.b.q, lvl.b.at.x)) >= lvl.tol).map((c) => (c.name === 'C' ? 'the new charge' : `charge ${c.name}`));
        miss(`${bad.join(' and ')} still feel${bad.length === 1 ? 's' : ''} a net force.`);
      };
      [xIn, qIn].forEach((i) => i.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run()));
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Distance from A'), xIn, h('span', { class: 'unit' }, 'cm')), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Its charge'), qIn, h('span', { class: 'unit' }, 'µC')), testBtn('Release all three', 'Release all three', run));
      hint.textContent = `A is ${signed(lvl.a.q)} and B is ${signed(lvl.b.q)}, ${lvl.b.at.x} cm apart. The new charge goes between them.`;
    }

    // line views for levels 4 and 5 (the bounds depend only on d, never on the answer)
    function lineView() {
      const d = lvl.kind === 'rest' || lvl.kind === 'allrest' ? lvl.b.at.x : 10;
      const lo = lvl.kind === 'rest' ? -2.2 * d : -0.25 * d;
      const hi = lvl.kind === 'rest' ? 3.2 * d : 1.25 * d;
      const k = (W - 90) / (hi - lo);
      return { lo, hi, k, at: (p: Pt): Pt => ({ x: 45 + (p.x - lo) * k, y: H / 2 }) };
    }
    let probeAt: number | null = null;
    let thirdAt: { x: number; q: number } | null = null;

    // ---- scene for the current state ---------------------------------------------------------------
    function buildScene() {
      dots = [];
      rulers = [];
      captions = [];
      if (lvl.kind === 'gap') {
        const typed = num((controls.querySelector('input') as HTMLInputElement) ?? ({ value: '' } as HTMLInputElement));
        const r = typed !== null && typed > 0 ? Math.min(typed, 80) : 10;
        const m = mapper(Math.max(r, 12), W - 200);
        const a = m.at({ x: -r / 2, y: 0 });
        const b = m.at({ x: r / 2, y: 0 });
        dots = [{ name: 'A', q: lvl.q1, px: a }, { name: 'B', q: lvl.q2, px: b }];
        rulers = [{ a: { x: a.x, y: a.y + 62 }, b: { x: b.x, y: b.y + 62 }, text: typed !== null && typed > 0 ? `r = ${fmt(typed)} cm` : 'r = ?' }];
        captions = [{ text: `target reading: ${fmt(lvl.target)} N`, x: W / 2, y: 28, size: 15 }];
      } else if (lvl.kind === 'rescale') {
        const b = lvl.before;
        const m = mapper(Math.max(b.r, lvl.after.r, 8), W - 220, W / 2, H / 2);
        const rowY = (row: number) => (row === 0 ? H * 0.26 : H * 0.74);
        dots = [
          { name: 'A', q: b.q1, px: { x: m.at({ x: -b.r / 2, y: 0 }).x, y: rowY(0) } },
          { name: 'B', q: b.q2, px: { x: m.at({ x: b.r / 2, y: 0 }).x, y: rowY(0) } },
        ];
        captions = [{ text: `before: gap ${b.r} cm, reading ${fmt(lvl.f0)} N`, x: W / 2, y: 18, size: 13 }];
        if (test) {
          const a = lvl.after;
          dots.push({ name: 'A', q: a.q1, px: { x: m.at({ x: -a.r / 2, y: 0 }).x, y: rowY(1) } }, { name: 'B', q: a.q2, px: { x: m.at({ x: a.r / 2, y: 0 }).x, y: rowY(1) } });
          captions.push({ text: `after: gap ${fmt(a.r)} cm`, x: W / 2, y: H * 0.55, size: 13 });
        } else {
          captions.push({ text: 'after the changes: ?', x: W / 2, y: H * 0.74, size: 15, color: col.muted });
        }
      } else if (lvl.kind === 'null') {
        const inputs = [...controls.querySelectorAll('input')] as HTMLInputElement[];
        const vals = inputs.map(num);
        const m = mapper(lvl.radius * 2.2, H - 90);
        let i = 0;
        for (const c of lvl.corners) {
          const q = c.q ?? vals[i++] ?? null;
          dots.push({ name: c.name, q, px: m.at(c.at), ghost: c.q === null && q === null });
        }
        dots.push({ name: 'probe', q: lvl.probe.q, px: m.at({ x: 0, y: 0 }) });
      } else if (lvl.kind === 'rest') {
        const v = lineView();
        dots = [{ name: 'A', q: lvl.a.q, px: v.at(lvl.a.at) }, { name: 'B', q: lvl.b.q, px: v.at(lvl.b.at) }];
        if (probeAt !== null) {
          const drift = test && arrows?.push ? ease(Math.min(1, test.t / REVEAL)) * arrows.push.amount * (lvl.b.at.x) * arrows.push.dir : 0;
          const x = Math.max(v.lo + 2, Math.min(v.hi - 2, probeAt + drift));
          dots.push({ name: 'probe', q: lvl.probe, px: v.at({ x, y: 0 }) });
        }
        rulers = [{ a: v.at(lvl.a.at), b: v.at(lvl.b.at), text: `${lvl.b.at.x} cm` }];
      } else {
        const v = lineView();
        dots = [{ name: 'A', q: lvl.a.q, px: v.at(lvl.a.at) }, { name: 'B', q: lvl.b.q, px: v.at(lvl.b.at) }];
        if (thirdAt) dots.push({ name: 'C', q: thirdAt.q, px: v.at({ x: thirdAt.x, y: 0 }) });
        rulers = [{ a: v.at(lvl.a.at), b: v.at(lvl.b.at), text: `${lvl.b.at.x} cm` }];
      }
    }

    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    function draw() {
      g.clearRect(0, 0, W, H);
      buildScene();
      for (const r of rulers) {
        g.strokeStyle = col.muted;
        g.lineWidth = 1;
        g.setLineDash([4, 4]);
        g.beginPath();
        g.moveTo(r.a.x, r.a.y + (lvl.kind === 'gap' ? 0 : 40));
        g.lineTo(r.b.x, r.b.y + (lvl.kind === 'gap' ? 0 : 40));
        g.stroke();
        g.setLineDash([]);
        label(g, r.text, (r.a.x + r.b.x) / 2, r.a.y + (lvl.kind === 'gap' ? 18 : 58), { size: 13, color: col.muted });
      }
      const radius = lvl.kind === 'null' ? 20 : lvl.kind === 'rescale' ? 22 : 24;
      for (const d of dots) {
        const isProbe = d.name === 'probe';
        const fill = d.q === null ? col.panel : d.q < 0 ? NEG : POS;
        disc(g, d.px.x, d.px.y, isProbe ? 12 : radius, d.ghost ? col.panel : fill, d.ghost ? col.muted : '#ffffff', 2);
        label(g, d.q === null ? '?' : d.q < 0 ? '−' : '+', d.px.x, d.px.y + 5, { size: isProbe ? 14 : 20, color: d.ghost ? col.muted : '#ffffff' });
        if (!isProbe) {
          label(g, d.name, d.px.x, d.px.y - radius - 8, { size: 14, color: col.text });
          if (d.q !== null) label(g, `${d.q < 0 ? '−' : '+'}${fmt(Math.abs(d.q))} µC`, d.px.x, d.px.y + radius + 18, { size: 12, bold: false, color: col.muted });
        } else {
          label(g, 'probe +1 µC', d.px.x, d.px.y - 20, { size: 12, bold: false, color: col.muted });
        }
      }
      for (const c of captions) label(g, c.text, c.x, c.y, { size: c.size ?? 13, bold: false, color: c.color ?? col.text });
      if (arrows) {
        const p = ease(Math.min(1, (test?.t ?? 0) / REVEAL));
        const biggest = Math.max(...arrows.list.map((a) => a.newtons), 1e-9);
        arrowScale = 78 / biggest;
        for (const a of arrows.list) drawArrow(a, p);
      }
    }

    function drawArrow(a: Arrow, p: number) {
      const len = Math.min(110, a.newtons * arrowScale) * p;
      if (len < 1.5) {
        if (p >= 1 && a.caption) label(g, a.caption, a.from.x, a.from.y - 34, { size: 12, color: a.color });
        return;
      }
      const m = Math.hypot(a.dir.x, a.dir.y) || 1;
      const ux = a.dir.x / m;
      const uy = -a.dir.y / m; // screen y is down
      const x2 = a.from.x + ux * len;
      const y2 = a.from.y + uy * len;
      g.strokeStyle = a.color;
      g.fillStyle = a.color;
      g.lineWidth = a.thick ? 5 : 3;
      g.beginPath();
      g.moveTo(a.from.x, a.from.y);
      g.lineTo(x2, y2);
      g.stroke();
      const hd = a.thick ? 13 : 10;
      g.beginPath();
      g.moveTo(x2, y2);
      g.lineTo(x2 - ux * hd - uy * hd * 0.55, y2 - uy * hd + ux * hd * 0.55);
      g.lineTo(x2 - ux * hd + uy * hd * 0.55, y2 - uy * hd - ux * hd * 0.55);
      g.closePath();
      g.fill();
      if (p >= 1 && a.caption) label(g, a.caption, x2 + ux * 4, y2 + (uy >= 0 ? 18 : -10), { size: 12, color: a.color });
    }

    ctx.root.append(
      h('p', null, lvl.story),
      canvas,
      hint,
      controls,
      feedback,
      solution,
    );
    draw();
    return startLoop((dt) => {
      if (test && test.t < REVEAL + 0.4) test.t += dt;
      draw();
      canvas.dataset.phase = !test ? 'idle' : test.t < REVEAL ? 'testing' : 'done';
      if (pendingWin !== null && test && test.t >= REVEAL + 0.3 && wasOk) {
        const s = pendingWin;
        pendingWin = null;
        ctx.win({ stars: s });
      }
    });
  },
});
