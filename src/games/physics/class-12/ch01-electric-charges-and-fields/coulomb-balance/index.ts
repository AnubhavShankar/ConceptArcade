import { defineGame } from '@core/define';
import { h, svg } from '@core/dom';
import { fmt, judge, makeRound, starsForAttempts, type Outcome } from './logic';

const MESSAGES: Record<Outcome, string> = {
  win: 'Correct!',
  units: 'Check your units: that looks like metres. The answer is asked in centimetres.',
  tooClose: 'At your distance the force is larger than the target, so the charges must be farther apart.',
  tooFar: 'At your distance the force is smaller than the target, so the charges must be closer.',
};

/** Two charges drawn to scale for a separation in cm (diagram spans 0 to 100 cm). */
function diagram(rCm: number | null) {
  const x1 = 40;
  const x2 = rCm === null ? 200 : 40 + Math.min(rCm, 100) * 3.2;
  const label = rCm === null ? 'r = ?' : `r = ${fmt(rCm)} cm`;
  return svg(
    'svg',
    { viewBox: '0 0 400 90', role: 'img', 'aria-label': `Two charges separated by ${label}` },
    svg('line', { x1, y1: 45, x2, y2: 45, stroke: 'currentColor', 'stroke-dasharray': '4 4' }),
    svg('circle', { cx: x1, cy: 45, r: 14, fill: '#3156d3' }),
    svg('circle', { cx: x2, cy: 45, r: 14, fill: '#c0392b' }),
    svg('text', { x: x1, y: 50, 'text-anchor': 'middle', fill: '#fff', 'font-size': 14 }, 'q₁'),
    svg('text', { x: x2, y: 50, 'text-anchor': 'middle', fill: '#fff', 'font-size': 14 }, 'q₂'),
    svg('text', { x: (x1 + x2) / 2, y: 25, 'text-anchor': 'middle', fill: 'currentColor', 'font-size': 13 }, label),
  );
}

export default defineGame({
  mount(ctx) {
    const round = makeRound(ctx.random);
    let attempts = 0;

    const figure = h('div', null, diagram(null));
    const input = h('input', { class: 'field', type: 'number', inputmode: 'decimal', min: 0, step: 'any', id: 'r' });
    const feedback = h('p', { class: 'feedback', hidden: true, 'aria-live': 'polite' });

    const check = () => {
      const guess = Number(input.value);
      if (!Number.isFinite(guess) || guess <= 0) {
        feedback.hidden = false;
        feedback.className = 'feedback bad';
        feedback.textContent = 'Enter a positive distance in cm.';
        return;
      }
      attempts++;
      const { outcome, forceAtGuess } = judge(round, guess);
      figure.replaceChildren(diagram(guess));
      feedback.hidden = false;
      feedback.className = outcome === 'win' ? 'feedback good' : 'feedback bad';
      feedback.textContent =
        outcome === 'win' ? MESSAGES.win : `${MESSAGES[outcome]} (At ${fmt(guess)} cm the force would be ${fmt(forceAtGuess)} N.)`;
      if (outcome === 'win') ctx.win({ stars: starsForAttempts(attempts) });
    };

    ctx.root.append(
      h(
        'p',
        null,
        `Two point charges, q₁ = ${round.q1uC} μC and q₂ = ${round.q2uC} μC, are placed in vacuum. ` +
          `At what separation (in cm) is the force between them exactly ${fmt(round.targetForce)} N? ` +
          'Take k = 9 × 10⁹ N m² C⁻².',
      ),
      figure,
      h('label', { for: 'r' }, 'Separation r (cm)'),
      h('div', { class: 'row' }, input, h('button', { class: 'btn', onclick: check }, 'Check')),
      feedback,
    );
  },
});
