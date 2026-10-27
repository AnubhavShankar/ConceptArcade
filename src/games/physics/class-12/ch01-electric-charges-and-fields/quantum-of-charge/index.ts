import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import {
  buildLevel,
  checkElectrons,
  checkUnit,
  determinesUnit,
  G,
  GAP,
  in19,
  isHovering,
  measuredCharge,
  netRatio,
  scoreFlags,
  speed,
  starsFor,
  V_MAX,
  type Drop,
} from './logic';

const W = 640;
const H = 340;
const TOP = 46; // top plate, y
const BOTTOM = H - 46; // bottom plate, y
const PLATE_X0 = 150;
const PLATE_X1 = 490;
const R = 11;
const HOLD = 1; // seconds the drop must stay hovering before it can be recorded
const FINE = 5; // the fine knob covers ±5 V around the coarse setting

const sci = (m: number) => {
  const [a, b] = m.toExponential(2).split('e');
  return `${Number(a)} × 10${[...String(Number(b))].map((c) => ({ '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' })[c] ?? c).join('')}`;
};

export default defineGame({
  mount(ctx) {
    const lvl = buildLevel(ctx.level, ctx.random);
    const col = themeColors();
    const mid = (TOP + BOTTOM) / 2;

    let current = 0;
    let volts = 0;
    let y = mid;
    let stable = 0;
    let wrong = 0;
    let finished = false;
    let lastStatus = '';
    const recorded = new Map<number, { volts: number; q: number }>();
    const rightN = new Set<number>(); // level 1: drops whose electron count is right
    const flagged = new Set<number>(); // level 3

    const drop = (): Drop => lvl.drops[current];

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'Two horizontal plates with a charged oil drop between them, and arrows for its weight and the electric force.' });
    const g = fitCanvas(canvas, W, H);
    const status = h('p', { class: 'status-line', 'aria-live': 'polite' });
    const feedback = h('p', { class: 'feedback', hidden: true, 'aria-live': 'polite' });
    const readout = h('span', { class: 'v-readout', 'aria-label': 'Total voltage' });
    const coarseVal = h('span', { class: 'knob-val' });
    const fineVal = h('span', { class: 'knob-val' });
    const holdFill = h('span', { class: 'bar-fill', style: 'width:0%' });
    const hold = h('span', { class: 'bar hold-bar', role: 'progressbar', 'aria-label': 'Time held steady', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0 }, holdFill);
    // Two knobs, like the real apparatus: coarse (whole volts) and fine (±5 V in hundredths of a volt).
    // The voltage is their sum. Dragging one never moves the other, so a drag never jumps under your finger.
    const coarse = h('input', { type: 'range', min: 0, max: V_MAX, step: 1, value: '0', 'aria-label': 'Voltage, coarse knob', class: 'v-slider', oninput: () => dialsChanged() }) as HTMLInputElement;
    const fine = h('input', { type: 'range', min: -FINE, max: FINE, step: 0.01, value: '0', 'aria-label': 'Voltage, fine knob', class: 'v-slider', oninput: () => dialsChanged() }) as HTMLInputElement;
    const nudge = (label: string, delta: number) => h('button', { class: 'btn secondary small', 'aria-label': `Voltage ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)} volt`, onclick: () => setVolts(volts + delta) }, label);
    const recordBtn = h('button', { class: 'btn', 'aria-label': 'Record this drop', disabled: true, onclick: () => record() }, 'Record this drop');
    const dropButtons = lvl.drops.map((d, i) => h('button', { class: 'btn secondary small', 'aria-pressed': 'false', onclick: () => select(i) }, `Drop ${d.id}`));
    const resultsEl = h('div', { class: 'results' });
    const answerEl = h('div', { class: 'answer' });

    // ---- actions ----------------------------------------------------------------------------
    function say(text: string, kind: 'good' | 'bad' | '') {
      feedback.hidden = false;
      feedback.className = `feedback ${kind}`;
      feedback.textContent = text;
    }
    function showVolts() {
      const f = Number(fine.value);
      readout.textContent = `${volts.toFixed(2)} V`;
      coarseVal.textContent = `${Number(coarse.value)} V`;
      fineVal.textContent = `${f < 0 ? '−' : '+'}${Math.abs(f).toFixed(2)} V`;
    }
    /** A knob moved: the voltage is coarse + fine. The knobs themselves are left alone while being dragged. */
    function dialsChanged() {
      if (finished) return;
      volts = Math.max(0, Math.min(V_MAX, Math.round((Number(coarse.value) + Number(fine.value)) * 100) / 100));
      showVolts();
    }
    /** Set the voltage directly (nudge buttons, tests) and bring both knobs to match it. */
    function setVolts(v: number) {
      if (finished) return;
      volts = Math.max(0, Math.min(V_MAX, Math.round(v * 100) / 100));
      const c = Math.round(volts);
      coarse.value = String(c);
      fine.value = String(Math.round((volts - c) * 100) / 100);
      showVolts();
    }
    function select(i: number) {
      if (finished || i === current) return; // clicking the drop you are already on must not restart its timer
      current = i;
      y = mid;
      stable = 0;
      refresh();
    }
    function record() {
      const d = drop();
      if (finished || recorded.has(d.id) || stable < HOLD) return;
      recorded.set(d.id, { volts, q: measuredCharge(volts, d) });
      stable = 0;
      const next = lvl.drops.findIndex((x) => !recorded.has(x.id));
      if (next >= 0) {
        current = next;
        y = mid;
      }
      say(`Recorded drop ${d.id}: V = ${volts.toFixed(2)} V, so q = m g d / V = ${in19(recorded.get(d.id)!.q).toFixed(2)} × 10⁻¹⁹ C.`, 'good');
      refresh();
    }
    function win(message: string) {
      finished = true;
      say(message, 'good');
      refresh();
      ctx.win({ stars: starsFor(wrong) });
    }

    // level 1: how many electrons?
    function checkCount(d: Drop, raw: string) {
      const n = Number(raw);
      if (raw.trim() === '' || !Number.isFinite(n)) return say('Enter a whole number of electrons.', 'bad');
      if (checkElectrons(n, d)) {
        rightN.add(d.id);
        say(`Yes: drop ${d.id} carries ${d.multiple} electron${d.multiple === 1 ? '' : 's'}.`, 'good');
        if (rightN.size === lvl.drops.length) return win('All three drops counted. Charge always comes as a whole number of electrons.');
      } else {
        wrong++;
        say('Not quite. Divide the drop’s charge by e = 1.6 × 10⁻¹⁹ C. (That cost a star.)', 'bad');
      }
      refresh();
    }

    // level 2: what is the unit of charge?
    function submitUnit(raw: string) {
      if (finished) return;
      const measured = lvl.drops.filter((d) => recorded.has(d.id));
      if (!determinesUnit(measured)) {
        // The student's data cannot tell e from 2e yet: say so, and cost nothing.
        return say(
          measured.length < 3
            ? 'Measure at least three drops first. Two numbers cannot show what unit they are multiples of.'
            : 'Your drops could all be multiples of something bigger than the true unit, so any answer would be a guess. Measure another drop. (This does not cost you anything.)',
          'bad',
        );
      }
      const n = parseNumber(raw);
      if (n === null) return say('Enter a number, like 1.6 (in units of 10⁻¹⁹ C).', 'bad');
      if (checkUnit(n, lvl.unitTol)) return win('That is the unit of charge: every drop carries a whole number of it. Millikan found 1.6 × 10⁻¹⁹ C.');
      wrong++;
      say('That does not fit all your data. Every measured charge should be a whole number of the unit. (That cost a star.)', 'bad');
      refresh();
    }

    // level 3: which samples are impure?
    function submitFlags() {
      if (finished) return;
      if (recorded.size < lvl.drops.length) return say(`Measure all ${lvl.drops.length} drops first. (This does not cost you anything.)`, 'bad');
      if (scoreFlags([...flagged], lvl.drops).correct) return win('Right: those two samples carry charges that are not whole numbers of e, so they cannot be real.');
      wrong++;
      say('Not quite: you flagged a good sample or missed an impure one. (That cost a star.)', 'bad');
      refresh();
    }

    // ---- rendering of the DOM parts ---------------------------------------------------------
    function refresh() {
      dropButtons.forEach((b, i) => {
        const d = lvl.drops[i];
        b.setAttribute('aria-pressed', String(i === current));
        b.textContent = `Drop ${d.id}${recorded.has(d.id) ? ' ✓' : ''}`;
        b.toggleAttribute('disabled', finished);
      });
      recordBtn.toggleAttribute('disabled', finished || recorded.has(drop().id) || stable < HOLD);

      const rows = lvl.drops.filter((d) => recorded.has(d.id));
      const showRatio = lvl.mode === 'flag';
      resultsEl.replaceChildren(
        rows.length === 0
          ? h('p', { class: 'muted' }, 'Nothing recorded yet. Tune a drop until it hovers, hold it steady, then record it.')
          : h(
              'table',
              { class: 'data' },
              h('thead', null, h('tr', null, h('th', null, 'Drop'), h('th', null, 'Mass (kg)'), h('th', null, 'V (volts)'), h('th', null, 'q (10⁻¹⁹ C)'), ...(showRatio ? [h('th', null, 'q ÷ e'), h('th', null, 'Impure?')] : []), ...(lvl.mode === 'count' ? [h('th', null, 'Electrons')] : []))),
              h(
                'tbody',
                null,
                ...rows.map((d) => {
                  const rec = recorded.get(d.id)!;
                  const cells: Node[] = [h('td', null, String(d.id)), h('td', null, sci(d.mass)), h('td', null, rec.volts.toFixed(2)), h('td', null, in19(rec.q).toFixed(2))];
                  if (showRatio) {
                    cells.push(h('td', null, (rec.q / 1.6e-19).toFixed(2)));
                    cells.push(
                      h(
                        'td',
                        null,
                        h('input', {
                          type: 'checkbox',
                          'aria-label': `Flag drop ${d.id} as impure`,
                          checked: flagged.has(d.id),
                          disabled: finished,
                          onchange: (e: Event) => {
                            if ((e.target as HTMLInputElement).checked) flagged.add(d.id);
                            else flagged.delete(d.id);
                          },
                        }),
                      ),
                    );
                  }
                  if (lvl.mode === 'count') {
                    if (rightN.has(d.id)) cells.push(h('td', null, `${d.multiple} ✓`));
                    else {
                      const input = h('input', { class: 'field small-field', type: 'number', min: 0, step: 1, 'aria-label': `Electrons on drop ${d.id}` }) as HTMLInputElement;
                      cells.push(h('td', null, input, h('button', { class: 'btn small', 'aria-label': `Check electrons on drop ${d.id}`, onclick: () => checkCount(d, input.value) }, 'Check')));
                    }
                  }
                  return h('tr', null, ...cells);
                }),
              ),
            ),
      );

      answerEl.replaceChildren();
      if (lvl.mode === 'unit') {
        const input = h('input', { class: 'field', type: 'text', inputmode: 'decimal', 'aria-label': 'Unit of charge, in 10⁻¹⁹ C', placeholder: 'e = ? × 10⁻¹⁹ C', autocomplete: 'off' }) as HTMLInputElement;
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') submitUnit(input.value);
        });
        answerEl.append(
          h('p', null, h('strong', null, 'The unit of charge: '), `measured ${recorded.size} of ${lvl.drops.length} drops.`),
          h('div', { class: 'row' }, input, h('span', { class: 'unit' }, '× 10⁻¹⁹ C'), h('button', { class: 'btn', disabled: finished, onclick: () => submitUnit(input.value) }, 'Submit unit')),
        );
      } else if (lvl.mode === 'flag') {
        answerEl.append(h('p', null, 'Tick the impure samples, then submit.'), h('div', { class: 'row' }, h('button', { class: 'btn', 'aria-label': 'Submit flags', disabled: finished, onclick: () => submitFlags() }, 'Submit flags')));
      }
    }

    // ---- the chamber ------------------------------------------------------------------------
    function describeDrop(): string {
      const d = drop();
      if (recorded.has(d.id)) return `Drop ${d.id} is already recorded.`;
      const ratio = netRatio(volts, d);
      if (volts === 0) return `Drop ${d.id}: no voltage yet, so it falls.`;
      if (isHovering(volts, d, lvl.tol)) return stable >= HOLD ? `Drop ${d.id} is hovering. You can record it.` : `Drop ${d.id} is hovering. Hold it steady…`;
      return ratio > 0 ? `Drop ${d.id} is rising ↑` : `Drop ${d.id} is falling ↓`;
    }

    function frame(dt: number) {
      const d = drop();
      if (!recorded.has(d.id) && !finished) {
        y -= speed(netRatio(volts, d)) * dt;
        const lo = TOP + 8 + R;
        const hi = BOTTOM - R;
        y = Math.max(lo, Math.min(hi, y));
        stable = isHovering(volts, d, lvl.tol) ? stable + dt : 0;
      }
      const pct = Math.round(Math.min(1, stable / HOLD) * 100);
      holdFill.style.width = `${pct}%`;
      hold.setAttribute('aria-valuenow', String(pct));
      recordBtn.toggleAttribute('disabled', finished || recorded.has(d.id) || stable < HOLD);
      const text = describeDrop();
      if (text !== lastStatus) {
        lastStatus = text;
        status.textContent = text;
      }
      draw();
    }

    function arrow(x: number, y0: number, y1: number, color: string, text: string) {
      g.strokeStyle = color;
      g.fillStyle = color;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, y0);
      g.lineTo(x, y1);
      g.stroke();
      const dir = Math.sign(y1 - y0) || 1;
      g.beginPath();
      g.moveTo(x, y1);
      g.lineTo(x - 6, y1 - 9 * dir);
      g.lineTo(x + 6, y1 - 9 * dir);
      g.closePath();
      g.fill();
      label(g, text, x + 10, (y0 + y1) / 2 + 4, { size: 11, color, align: 'left', bold: false });
    }

    function draw() {
      const d = drop();
      g.clearRect(0, 0, W, H);
      g.fillStyle = col.panel;
      g.fillRect(0, 0, W, H);

      // plates, and a faint field between them that strengthens with voltage
      g.fillStyle = col.muted;
      g.fillRect(PLATE_X0, TOP, PLATE_X1 - PLATE_X0, 8);
      g.fillRect(PLATE_X0, BOTTOM, PLATE_X1 - PLATE_X0, 8);
      label(g, '+', PLATE_X0 - 14, TOP + 9, { size: 18, color: '#c0392b' });
      label(g, '−', PLATE_X0 - 14, BOTTOM + 9, { size: 22, color: '#3156d3' });
      g.globalAlpha = 0.08 + 0.4 * Math.min(1, volts / V_MAX);
      g.strokeStyle = col.accent;
      g.lineWidth = 1;
      for (let x = PLATE_X0 + 20; x < PLATE_X1; x += 34) {
        g.beginPath();
        g.moveTo(x, TOP + 12);
        g.lineTo(x, BOTTOM - 4);
        g.stroke();
      }
      g.globalAlpha = 1;

      const x = (PLATE_X0 + PLATE_X1) / 2;
      disc(g, x, y, R, '#d9a441', col.text);
      // the two forces on the drop: weight is fixed, the electric force grows with voltage
      const weightLen = 38;
      const electricLen = Math.max(0, Math.min(110, weightLen * (1 + netRatio(volts, d))));
      arrow(x - 26, y + R + 3, y + R + 3 + weightLen, '#3156d3', 'weight');
      if (electricLen > 1) arrow(x + 26, y - R - 3, y - R - 3 - electricLen, '#c0392b', 'electric force');

      label(g, `Drop ${d.id}`, 24, 70, { size: 14, color: col.text, align: 'left' });
      label(g, `mass ${sci(d.mass)} kg`, 24, 90, { size: 12, color: col.muted, align: 'left', bold: false });
      label(g, `V = ${volts.toFixed(2)} V`, W - 24, 70, { size: 16, color: col.text, align: 'right' });
      label(g, `plate gap d = ${(GAP * 1000).toFixed(1)} mm`, W - 24, 90, { size: 12, color: col.muted, align: 'right', bold: false });
    }

    // ---- assemble ---------------------------------------------------------------------------
    ctx.root.append(
      h('p', { class: 'story' }, lvl.story),
      h(
        'p',
        { class: 'formula' },
        h('strong', null, 'Lab notes: '),
        `at balance the electric force equals the weight, so  q = m g d / V  (g = ${G} m/s², d = ${(GAP * 1000).toFixed(1)} mm).`,
        lvl.eKnown ? '  The charge of one electron is e = 1.6 × 10⁻¹⁹ C.' : '  The unit of charge is not known yet.',
      ),
      status,
      canvas,
      // One grid with real gaps between every control, so nothing can touch or overlap its neighbour.
      h(
        'div',
        { class: 'lab-controls' },
        h('div', { class: 'control total' }, h('span', { class: 'control-label' }, 'Voltage'), readout, h('span', { class: 'muted' }, '= coarse knob + fine knob')),
        h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Coarse knob'), coarse, coarseVal),
        h('div', { class: 'control' }, h('span', { class: 'control-label' }, `Fine knob (±${FINE} V)`), fine, fineVal),
        h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Nudge'), nudge('−1', -1), nudge('−0.1', -0.1), nudge('+0.1', 0.1), nudge('+1', 1)),
        h('div', { class: 'control record-row' }, h('span', { class: 'control-label' }, 'Held steady'), hold, recordBtn),
        h('div', { class: 'control drops' }, h('span', { class: 'control-label' }, 'Drops'), ...dropButtons),
      ),
      h('h3', null, 'Results'),
      resultsEl,
      answerEl,
      feedback,
    );
    setVolts(0);
    refresh();
    return startLoop(frame);
  },
});
