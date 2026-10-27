import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { acceleration, buildLevel, explainSolution, G, judge, mag, restOf, starsFor, stepBall, toCoulombs, type Ball, type Verdict } from './logic';

const W = 640;
const H = 410;
const TUBE_X = 250;
const TUBE_W = 90;
const BASE_TOP = 360; // y of the top of the base; the ball's height is measured up from here
const TUBE_H = 300; // pixels for the full height of the tube
const BALL_R = 12;
const SETTLE = 3.2; // seconds the ball is given to settle before the verdict
const POS = '#c0392b';
const NEG = '#3156d3';

export default defineGame({
  mount(ctx) {
    const lvl = buildLevel(ctx.level, ctx.random);
    const col = themeColors();
    const u = lvl.units;
    const scale = TUBE_H / lvl.tubeMax;
    const yOf = (r: number) => BASE_TOP - r * scale;
    const lengthUnit = u.length === 'cm' ? 0.01 : 0.001;
    const baseSign = lvl.baseQ > 0 ? 1 : -1;

    let ballQ = 0; // the ball's charge in coulombs, signed
    let sign: 1 | -1 | null = lvl.needsSign ? null : 1;
    let failed = 0;
    let finished = false;
    let ball: Ball = { r: lvl.tubeMax / 2, v: 0 };
    let run: { q: number; t: number } | null = null;
    let verdict: Verdict | null = null;
    let lastStatus = '';

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A glass tube with a fixed charged base at the bottom and a small charged ball floating above it. A dashed line marks the target height.' });
    const g = fitCanvas(canvas, W, H);
    const status = h('p', { class: 'status-line', 'aria-live': 'polite' });
    const feedback = h('p', { class: 'feedback', hidden: true, 'aria-live': 'polite' });
    const solution = h('section', { class: 'panel solution', hidden: true });
    const readout = h('span', { class: 'v-readout' });
    const qShown = h('span', { class: 'knob-val' });
    const releaseBtn = h('button', { class: 'btn', 'aria-label': 'Release the ball', onclick: () => release() }, 'Release the ball');

    // level 1 sets the charge with a slider; the others type it in (they must work it out)
    const slider = h('input', {
      type: 'range',
      min: 0,
      max: 25,
      step: 0.05,
      value: '0',
      class: 'v-slider',
      'aria-label': `Ball charge in ${u.ball}`,
      oninput: () => setSlider(Number(slider.value)),
    }) as HTMLInputElement;
    const nudge = (text: string, d: number) => h('button', { class: 'btn secondary small', 'aria-label': `Charge ${d > 0 ? 'up' : 'down'} ${Math.abs(d)} ${u.ball}`, onclick: () => setSlider(Number(slider.value) + d) }, text);
    const input = h('input', { class: 'field', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': `Ball charge in ${u.ball}`, placeholder: `q = ? ${u.ball}` }) as HTMLInputElement;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') release();
    });
    const signBtns = ([1, -1] as const).map((s) =>
      h('button', { class: 'btn secondary small', 'aria-pressed': 'false', 'aria-label': s > 0 ? 'Give the ball a positive charge' : 'Give the ball a negative charge', onclick: () => chooseSign(s) }, s > 0 ? '+  positive' : '−  negative'),
    );

    // ---- actions ----------------------------------------------------------------------------
    function say(text: string, kind: 'good' | 'bad' | '') {
      feedback.hidden = false;
      feedback.className = `feedback ${kind}`;
      feedback.textContent = text;
    }
    const busy = () => run !== null;

    function setSlider(v: number) {
      if (finished || busy()) return;
      const nC = Math.max(0, Math.min(25, Math.round(v * 100) / 100));
      slider.value = String(nC);
      ballQ = toCoulombs(nC, u.ball);
      qShown.textContent = `${nC.toFixed(2)} ${u.ball}`;
    }
    function chooseSign(s: 1 | -1) {
      if (finished || busy()) return;
      sign = s;
      refresh();
    }

    function chargeToRelease(): number | null {
      if (!lvl.showHeight) {
        const n = parseNumber(input.value);
        if (n === null || !(n > 0)) {
          say(`Enter the ball's charge as a positive number of ${u.ball}. (This does not cost you anything.)`, 'bad');
          return null;
        }
        if (sign === null) {
          say('Choose whether the ball is charged positively or negatively first. (This does not cost you anything.)', 'bad');
          return null;
        }
        return sign * toCoulombs(n, u.ball);
      }
      return ballQ;
    }

    function release() {
      if (finished || busy()) return;
      const q = chargeToRelease();
      if (q === null) return;
      run = { q, t: 0 };
      ball = { r: lvl.tubeMax / 2, v: 0 };
      verdict = null;
      feedback.hidden = true;
      refresh();
    }

    function finishRun(q: number) {
      run = null;
      verdict = judge(q, lvl);
      const hText = `${(verdict.height / lengthUnit).toFixed(1)} ${u.length}`;
      const target = `${mag(lvl.target, u.length)} ${u.length}`;
      if (verdict.ok) {
        finished = true;
        say(`It floats at the target height. The ball sits where the electric force balances its weight.`, 'good');
        solution.replaceChildren(h('h3', null, 'Why that charge works'), ...explainSolution(lvl).map((t) => h('p', null, t)));
        solution.hidden = false;
        refresh();
        ctx.win({ stars: starsFor(failed, lvl.freeReleases) });
        return;
      }
      failed++;
      const free = Math.max(0, lvl.freeReleases - failed);
      const costNote = lvl.freeReleases > 0 ? (failed <= lvl.freeReleases ? ` (${free} free ${free === 1 ? 'try' : 'tries'} left)` : ' (That cost a star.)') : ' (That cost a star.)';
      let why: string;
      if (verdict.how === 'on-base') why = q * lvl.baseQ < 0 ? 'The ball was pulled down onto the base: unlike charges attract.' : 'The ball fell and rests on the base: it does not have enough charge to hold itself up.';
      else if (verdict.how === 'at-top') why = 'The ball was pushed to the top of the tube: far too much charge.';
      else if (lvl.showHeight) why = `The ball settled at ${hText}, ${verdict.direction === 'too-high' ? 'above' : 'below'} the target of ${target}.`;
      else why = `The ball settled ${verdict.direction === 'too-high' ? 'above' : 'below'} the target height.`;
      say(`${why}${costNote}`, 'bad');
      refresh();
    }

    // ---- DOM refresh ------------------------------------------------------------------------
    function refresh() {
      signBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(sign === (i === 0 ? 1 : -1))));
      for (const b of signBtns) b.toggleAttribute('disabled', finished || busy());
      input.toggleAttribute('disabled', finished || busy());
      slider.toggleAttribute('disabled', finished || busy());
      releaseBtn.toggleAttribute('disabled', finished || busy());
    }

    // ---- animation --------------------------------------------------------------------------
    function frame(dt: number) {
      if (run) {
        run.t += dt;
        stepBall(ball, dt, run.q, lvl.baseQ, lvl.mass, lvl.tubeMax);
        if (run.t >= SETTLE) finishRun(run.q);
      }
      readout.textContent = lvl.showHeight ? `Ball height: ${(ball.r / lengthUnit).toFixed(1)} ${u.length}` : 'Ball height: read it off the ruler';
      const text = run ? 'The ball is bobbing and settling…' : finished ? 'The ball floats at the target.' : 'Choose the ball’s charge, then release it.';
      if (text !== lastStatus) {
        lastStatus = text;
        status.textContent = text;
      }
      draw();
    }

    function arrow(x: number, y0: number, y1: number, color: string, text: string, side: 1 | -1) {
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
      label(g, text, x + 10 * side, (y0 + y1) / 2 + 4, { size: 11, color, align: side > 0 ? 'left' : 'right', bold: false });
    }

    function draw() {
      g.clearRect(0, 0, W, H);
      g.fillStyle = col.panel;
      g.fillRect(0, 0, W, H);

      // tube and ruler
      g.strokeStyle = col.muted;
      g.lineWidth = 2;
      g.strokeRect(TUBE_X - TUBE_W / 2, BASE_TOP - TUBE_H, TUBE_W, TUBE_H);
      const ticks = Math.round(lvl.tubeMax / lengthUnit);
      for (let i = 0; i <= ticks; i++) {
        const y = yOf(i * lengthUnit);
        const major = i % 2 === 0;
        g.beginPath();
        g.moveTo(TUBE_X - TUBE_W / 2, y);
        g.lineTo(TUBE_X - TUBE_W / 2 - (major ? 12 : 6), y);
        g.stroke();
        if (major) label(g, String(i), TUBE_X - TUBE_W / 2 - 16, y + 4, { size: 11, color: col.muted, align: 'right', bold: false });
      }
      label(g, u.length, TUBE_X - TUBE_W / 2 - 16, BASE_TOP - TUBE_H - 10, { size: 11, color: col.muted, align: 'right', bold: false });

      // target marker
      const ty = yOf(lvl.target);
      g.setLineDash([6, 5]);
      g.strokeStyle = '#1a7f4b';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(TUBE_X - TUBE_W / 2 - 4, ty);
      g.lineTo(TUBE_X + TUBE_W / 2 + 4, ty);
      g.stroke();
      g.setLineDash([]);
      label(g, `target ${mag(lvl.target, u.length)} ${u.length}`, TUBE_X + TUBE_W / 2 + 12, ty + 4, { size: 12, color: '#1a7f4b', align: 'left' });

      // the fixed base charge
      disc(g, TUBE_X, BASE_TOP + 22, 30, baseSign > 0 ? POS : NEG, col.text);
      label(g, baseSign > 0 ? '+' : '−', TUBE_X, BASE_TOP + 30, { size: 26, color: '#ffffff' });
      label(g, `base Q = ${baseSign > 0 ? '+' : '−'}${mag(lvl.baseQ, u.base)} ${u.base}`, TUBE_X, BASE_TOP + 66, { size: 12, color: col.text });

      // the ball, and the two forces on it
      const by = yOf(ball.r);
      const q = run ? run.q : ballQ || (sign ?? 1) * 1e-9;
      disc(g, TUBE_X, by, BALL_R, q > 0 ? POS : NEG, col.text);
      label(g, q > 0 ? '+' : '−', TUBE_X, by + 5, { size: 14, color: '#ffffff' });
      if (run || verdict) {
        const qq = run ? run.q : q;
        const accNet = acceleration(Math.max(ball.r, restOf(lvl.tubeMax)), qq, lvl.baseQ, lvl.mass);
        const electric = Math.max(0, Math.min(150, 42 * ((accNet + G) / G)));
        arrow(TUBE_X + 28, by + BALL_R + 2, by + BALL_R + 2 + 42, '#3156d3', 'weight', 1);
        if (electric > 1) arrow(TUBE_X - 28, by - BALL_R - 2, by - BALL_R - 2 - electric, '#c0392b', 'electric force', -1);
      }

      // the facts on the right
      const lines = [`Ball mass: ${mag(lvl.mass, u.mass)} ${u.mass}`, `Base charge: ${baseSign > 0 ? '+' : '−'}${mag(lvl.baseQ, u.base)} ${u.base}`, `Target height: ${mag(lvl.target, u.length)} ${u.length}`, 'g = 9.8 m/s²', 'k = 9 × 10⁹ N m² C⁻²'];
      lines.forEach((t, i) => label(g, t, 440, 70 + i * 22, { size: 13, color: i < 3 ? col.text : col.muted, align: 'left', bold: i < 3 }));
    }

    // ---- assemble ---------------------------------------------------------------------------
    const chargeRow = lvl.showHeight
      ? h('div', { class: 'control' }, h('span', { class: 'control-label' }, `Ball charge (${u.ball})`), slider, qShown)
      : h('div', { class: 'control' }, h('span', { class: 'control-label' }, `Ball charge (${u.ball})`), input, h('span', { class: 'unit' }, u.ball));
    ctx.root.append(
      h('p', { class: 'story' }, lvl.story),
      status,
      canvas,
      h(
        'div',
        { class: 'lab-controls' },
        h('div', { class: 'control total' }, h('span', { class: 'control-label' }, 'Reading'), readout),
        chargeRow,
        ...(lvl.showHeight ? [h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Nudge'), nudge('−1', -1), nudge('−0.1', -0.1), nudge('+0.1', 0.1), nudge('+1', 1))] : []),
        ...(lvl.needsSign ? [h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Ball sign'), ...signBtns)] : []),
        h('div', { class: 'control record-row' }, h('span', { class: 'control-label' }, 'Release'), releaseBtn, h('span', { class: 'muted' }, lvl.freeReleases > 0 ? `${lvl.freeReleases} free tries, then each miss costs a star.` : 'Each miss costs a star.')),
      ),
      feedback,
      solution,
    );
    if (lvl.showHeight) setSlider(0);
    refresh();
    return startLoop(frame);
  },
});
