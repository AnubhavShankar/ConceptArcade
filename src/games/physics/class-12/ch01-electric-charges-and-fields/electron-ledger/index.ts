import { defineGame } from '@core/define';
import { themeColors } from '@core/draw';
import { h } from '@core/dom';
import { fitCanvas, pointerToLocal, startLoop } from '@core/sim';
import { createScene } from './scene';
import { buildLevel, explainSolution, impliedBy, judgeCount, judgeSign, nanoCoulombs, relationOf, rankCorrect, rub, sci, signOf, starsFor, type Delivery, type Finding, type Material, type Sign } from './logic';

const W = 640;
const H = 250;
const signWord = (s: Sign) => (s > 0 ? 'positive' : 'negative');
const signMark = (s: 0 | Sign) => (s === 0 ? '0' : s > 0 ? '+' : '−');

export default defineGame({
  mount(ctx) {
    const lvl = buildLevel(ctx.level, ctx.random);
    const byName = new Map(lvl.bench.map((m) => [m.name, m]));

    // ---- state ------------------------------------------------------------------------------
    let gained = 0; // level 1: electrons gained by the body (negative if lost)
    let moved = 0; // level 3: electrons moved from one body to the other so far
    let selected: string[] = [];
    let pair: { a: Material; b: Material; gainA: number; gainB: number } | null = null; // the last rub (levels 2 and 4)
    const findings: Finding[] = [];
    let rubs = 0;
    let misses = 0;
    let finished = false;
    // Level 4: the student's order. Start from the alphabet, nudged if that happens to be the answer.
    let order = [...lvl.bench.map((m) => m.name)].sort();
    if (lvl.truth && rankCorrect(order, lvl.truth)) order = [...order.slice(1), order[0]];

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'The workshop bench.' });
    const g = fitCanvas(canvas, W, H);
    const sc = lvl.scenario;
    // Level 1 also draws the other body, with a fixed surplus or shortage of electrons. Its sign is not labelled: read the dots.
    const otherUnits = sc ? (sc.sign > 0 ? -4 : 4) : 0;
    const otherName = sc ? sc.desc.replace(/^an? /, '').replace(/ that .*/, '') : '';
    const sceneBodies = sc
      ? [{ name: lvl.bench[0].name, x: 140 }, { name: otherName, x: 340 }]
      : (lvl.kind === 'count' ? [lvl.ship!, lvl.partner!] : lvl.bench).map((m, i, arr) => ({ name: m.name, x: ((i + 1) * W) / (arr.length + 1) }));
    const scene = createScene({ g, W, H, col: themeColors(), bodies: sceneBodies, port: lvl.kind === 'pump' ? { x: 570, label: 'Electron pump' } : undefined, initial: sc ? [0, otherUnits] : undefined, unknown: sc ? [1] : undefined, legend: `Each dot stands for ${sci(lvl.perStroke)} electrons. Blue dots are electrons, red dots are protons.` });
    let pendingRub: number[] | null = null;
    const order$ = h('p', { class: 'order-card' });
    const stage = h('div', { class: 'workshop' });
    const log = h('ol', { class: 'notebook-log', 'aria-live': 'polite' });
    const feedback = h('p', { class: 'feedback', hidden: true, 'aria-live': 'polite' });
    const solution = h('section', { class: 'panel solution', hidden: true });
    const strokesInput = h('input', { type: 'number', min: '1', max: '40', value: '1', 'aria-label': 'Strokes' }) as HTMLInputElement;

    const say = (text: string, good = false) => {
      feedback.hidden = false;
      feedback.className = `feedback ${good ? 'good' : 'bad'}`;
      feedback.textContent = text;
    };
    const lock = () => stage.querySelectorAll('button, input').forEach((b) => b.setAttribute('disabled', ''));

    function bodyCard(name: string, gain: number | null, note = '') {
      const s = gain === null ? 0 : signOf(gain);
      const reading = gain === null ? 'not rubbed yet' : s === 0 ? 'neutral' : `${signWord(s)} (detector ${signMark(s)})`;
      const ledger = gain === null || gain === 0 ? 'electrons: unchanged' : gain < 0 ? `lost ${sci(-gain)} electrons` : `gained ${sci(gain)} electrons`;
      return h('div', { class: `body-card ${s > 0 ? 'pos' : s < 0 ? 'neg' : ''}` }, h('strong', null, name), h('span', { class: 'detector', 'aria-label': `${name} detector` }, signMark(s)), h('span', { class: 'muted' }, reading), h('span', { class: 'muted' }, ledger), note ? h('span', { class: 'muted' }, note) : null);
    }

    // ---- delivery ---------------------------------------------------------------------------
    function judged(result: Delivery, name: string) {
      if (result === 'ok') return win(name);
      misses++;
      const lost = starsFor(misses) < starsFor(misses - 1);
      const tail = lost ? ' That cost a star.' : '';
      const msg: Record<Delivery, string> = {
        ok: '',
        neutral: `The ${name} is still neutral, so the customer rejects it.${tail}`,
        'wrong-sign': sc
          ? `Your ${name} is ${signWord((-lvl.wantSign) as Sign)}, so it would ${relationOf((-lvl.wantSign) as Sign, sc.sign)} ${sc.desc}, the opposite of what was ordered.${tail}`
          : `The customer wanted a ${signWord(lvl.wantSign)} body, but the detector shows the opposite sign on the ${name}.${tail}`,
        'too-little': `Charged the right way, but not enough: the order needs more charge than the ${name} carries.${tail}`,
        'too-much': `Right sign, but the ${name} carries more charge than the order allows. Discharge and try again.${tail}`,
      };
      say(msg[result]);
      render();
    }
    function win(name: string) {
      finished = true;
      const stars = starsFor(misses, Math.max(0, rubs - lvl.freeRubs));
      say(sc ? `Delivered: the ${name} will ${sc.relation} ${sc.desc}, exactly what the customer ordered.` : `Delivered: the ${name} is exactly what the customer ordered.`, true);
      solution.replaceChildren(h('h3', null, 'Why that works'), ...explainSolution(lvl).map((t) => h('p', null, t)));
      solution.hidden = false;
      render();
      lock();
      ctx.win({ stars });
    }
    const ship = (name: string, gain: number) => {
      if (finished) return;
      if (sc) {
        // Show what the sphere really does to the other body, right or wrong. A weak charge gives a weak effect.
        const s = signOf(gain);
        scene.demo(s === 0 ? null : relationOf(s, sc.sign), Math.abs(gain) >= lvl.minPulses * lvl.perStroke ? 1 : 0.4);
      }
      if (lvl.kind === 'pump') judged(judgeSign(gain, lvl.wantSign, lvl.minPulses * lvl.perStroke), name);
      else if (lvl.kind === 'sign') judged(judgeSign(gain, lvl.wantSign), name);
      else judged(judgeCount(gain, lvl.wantSign, lvl.targetElectrons!), name);
    };

    // ---- rendering --------------------------------------------------------------------------
    function benchButtons() {
      return lvl.bench.map((m) => {
        const b = h('button', { class: 'btn secondary tag-btn', 'aria-pressed': String(selected.includes(m.name)), 'aria-label': `Select ${m.name}`, onclick: () => select(m.name) }, m.name);
        if (finished) b.setAttribute('disabled', '');
        return b;
      });
    }
    function select(name: string) {
      if (finished) return;
      selected = selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name].slice(-2);
      render();
    }
    function rubSelected() {
      if (finished || selected.length !== 2) return;
      const [a, b] = selected.map((n) => byName.get(n)!);
      const r = rub(a, b, 1, lvl.perStroke);
      scene.reset();
      pair = { a, b, ...r };
      pendingRub = [lvl.bench.indexOf(a), lvl.bench.indexOf(b)];
      rubs++;
      const [loser, gainer] = r.gainA < 0 ? [a, b] : [b, a];
      const known = lvl.kind === 'rank' ? impliedBy(findings, a.name, b.name) : null;
      if (!findings.some((f) => f.loser === loser.name && f.gainer === gainer.name)) findings.push({ loser: loser.name, gainer: gainer.name });
      selected = [];
      log.append(h('li', null, `${loser.name} gave electrons to ${gainer.name}${known ? ' (you could have worked this out)' : ''}.`));
      if (lvl.kind === 'rank') say(rubs <= lvl.freeRubs ? `Test rub ${rubs} of ${lvl.freeRubs} free.` : 'That rub cost you progress towards three stars.', rubs <= lvl.freeRubs);
      render();
    }

    function unitsNow(): number[] {
      if (lvl.kind === 'pump') return sc ? [gained / lvl.perStroke, otherUnits] : [gained / lvl.perStroke];
      if (lvl.kind === 'count') {
        const u = rub(lvl.ship!, lvl.partner!, 1, moved).gainA / lvl.perStroke;
        return [u, -u];
      }
      return lvl.bench.map((m) => (pair && m.name === pair.a.name ? pair.gainA : pair && m.name === pair.b.name ? pair.gainB : 0) / lvl.perStroke);
    }
    function syncScene() {
      const units = unitsNow();
      scene.selected.clear();
      selected.forEach((n) => scene.selected.add(n));
      scene.set(units, pendingRub ? { rub: pendingRub } : {});
      pendingRub = null;
      canvas.setAttribute('aria-label', 'The workshop bench. ' + sceneBodies.map((b, i) => `${b.name}: ${units[i] === 0 ? 'neutral' : units[i] < 0 ? 'positive' : 'negative'}.`).join(' '));
    }

    function render() {
      syncScene();
      const row = (...c: Node[]) => h('div', { class: 'bench' }, ...c);
      if (lvl.kind === 'pump') {
        const body = lvl.bench[0].name;
        const pulses = gained / lvl.perStroke;
        order$.textContent = `Order: make the ${body} ${sc!.relation} ${sc!.desc}. Give it at least ${lvl.minPulses} pulses so the effect is clear. One pulse moves ${sci(lvl.perStroke)} electrons.`;
        stage.replaceChildren(
          bodyCard(body, gained, `net pulses: ${pulses > 0 ? '+' : ''}${pulses}`),
          row(
            h('button', { class: 'btn secondary', 'aria-label': 'Remove electrons', disabled: finished, onclick: () => (scene.clearDemo(), (gained -= lvl.perStroke), render()) }, 'Remove electrons'),
            h('button', { class: 'btn secondary', 'aria-label': 'Add electrons', disabled: finished, onclick: () => (scene.clearDemo(), (gained += lvl.perStroke), render()) }, 'Add electrons'),
            h('button', { class: 'btn secondary', 'aria-label': 'Add protons', disabled: finished, onclick: () => say('Protons are locked inside the nuclei and cannot be pumped. Only electrons move. That does not cost you anything.') }, 'Add protons'),
            h('button', { class: 'btn secondary', 'aria-label': 'Earth it', disabled: finished, onclick: () => (scene.clearDemo(), (gained = 0), render()) }, 'Earth it (discharge)'),
          ),
          h('button', { class: 'btn', 'aria-label': 'Ship it', disabled: finished, onclick: () => ship(body, gained) }, 'Ship it'),
        );
      } else if (lvl.kind === 'count') {
        const s = lvl.ship!;
        const p = lvl.partner!;
        const gainShip = rub(s, p, 1, moved).gainA;
        const gainPartner = -gainShip;
        order$.textContent = `Order: a ${s.name} with ${lvl.wantSign > 0 ? '+' : '−'}${nanoCoulombs(lvl.targetElectrons!)} nC, rubbed with a ${p.name}. One stroke moves ${sci(lvl.perStroke)} electrons.`;
        stage.replaceChildren(
          row(bodyCard(s.name, moved === 0 ? 0 : gainShip), bodyCard(p.name, moved === 0 ? 0 : gainPartner)),
          h('p', { class: 'muted' }, `Electrons moved so far: ${moved === 0 ? '0' : sci(moved)}`),
          row(
            h('label', null, 'Strokes ', strokesInput),
            h('button', { class: 'btn secondary', 'aria-label': 'Rub', disabled: finished, onclick: () => rubStrokes() }, 'Rub'),
            h('button', { class: 'btn secondary', 'aria-label': 'Discharge both', disabled: finished, onclick: () => ((moved = 0), render()) }, 'Discharge both'),
          ),
          h('button', { class: 'btn', 'aria-label': `Ship the ${s.name}`, disabled: finished, onclick: () => ship(s.name, moved === 0 ? 0 : gainShip) }, `Ship the ${s.name}`),
        );
      } else if (lvl.kind === 'sign') {
        order$.textContent = `Order: a ${signWord(lvl.wantSign)} body, any material on the bench. Each rub uses fresh, neutral pieces.`;
        stage.replaceChildren(row(...benchButtons()), h('button', { class: 'btn secondary', 'aria-label': 'Rub the two selected', disabled: finished || selected.length !== 2, onclick: rubSelected }, 'Rub the two selected'), pair ? row(bodyCard(pair.a.name, pair.gainA), bodyCard(pair.b.name, pair.gainB)) : h('p', { class: 'muted' }, 'Select two materials and rub them.'), ...(pair ? [row(h('button', { class: 'btn', 'aria-label': `Ship the ${pair.a.name}`, disabled: finished, onclick: () => ship(pair!.a.name, pair!.gainA) }, `Ship the ${pair.a.name}`), h('button', { class: 'btn', 'aria-label': `Ship the ${pair.b.name}`, disabled: finished, onclick: () => ship(pair!.b.name, pair!.gainB) }, `Ship the ${pair.b.name}`))] : []));
      } else {
        order$.textContent = `Order: rank the four pads, from the one that gives up electrons most easily (top) to the one that grabs them most (bottom). Free test rubs left: ${Math.max(0, lvl.freeRubs - rubs)}.`;
        stage.replaceChildren(
          row(...benchButtons()),
          h('button', { class: 'btn secondary', 'aria-label': 'Rub the two selected', disabled: finished || selected.length !== 2, onclick: rubSelected }, 'Rub the two selected'),
          pair ? row(bodyCard(pair.a.name, pair.gainA), bodyCard(pair.b.name, pair.gainB)) : h('p', { class: 'muted' }, 'Select two pads and rub them.'),
          h('ol', { class: 'rank-list' }, ...order.map((n, i) => h('li', null, n, ' ', h('button', { class: 'btn secondary', 'aria-label': `Move ${n} up`, disabled: finished || i === 0, onclick: () => move(i, -1) }, '↑'), h('button', { class: 'btn secondary', 'aria-label': `Move ${n} down`, disabled: finished || i === order.length - 1, onclick: () => move(i, 1) }, '↓')))),
          h('button', { class: 'btn', 'aria-label': 'Submit order', disabled: finished, onclick: submitOrder }, 'Submit this order'),
        );
      }
    }
    function rubStrokes() {
      if (finished) return;
      const n = Math.floor(Number(strokesInput.value));
      if (!Number.isFinite(n) || n < 1 || n > 40) return say('Enter a whole number of strokes from 1 to 40. That does not cost you anything.');
      moved += n * lvl.perStroke;
      pendingRub = [0, 1];
      say(`${n} stroke${n === 1 ? '' : 's'} rubbed.`, true);
      render();
    }
    function move(i: number, d: number) {
      if (finished) return;
      [order[i], order[i + d]] = [order[i + d], order[i]];
      render();
    }
    function submitOrder() {
      if (finished) return;
      // Guessing is not allowed: every neighbouring pair must be settled by what the rubs showed (directly or by chaining).
      for (let i = 0; i < order.length - 1; i++) {
        if (!impliedBy(findings, order[i], order[i + 1])) return say(`You have not seen enough to be sure how ${order[i]} and ${order[i + 1]} compare. Rub more pairs first. That does not cost you anything.`);
      }
      if (rankCorrect(order, lvl.truth!)) return win('whole set');
      misses++;
      const tail = starsFor(misses) < starsFor(misses - 1) ? ' That cost a star.' : '';
      say(`That order contradicts your own test rubs. Re-read the log.${tail}`);
      render();
    }

    canvas.addEventListener('click', (e) => {
      if (lvl.kind !== 'sign' && lvl.kind !== 'rank') return;
      const p = pointerToLocal(e, canvas, W, H);
      const i = scene.hit(p.x, p.y);
      if (i >= 0) select(lvl.bench[i].name);
    });
    ctx.root.append(h('p', null, lvl.story), canvas, order$, stage, feedback, h('div', { class: 'panel', hidden: lvl.kind === 'pump' || lvl.kind === 'count' }, h('h3', null, 'What your rubs showed'), log), solution);
    render();
    return startLoop((dt) => {
      scene.frame(dt);
      canvas.dataset.settled = String(scene.settled());
      canvas.dataset.demo = scene.demoState();
    });
  },
});
