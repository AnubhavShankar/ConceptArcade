import { h } from './dom';
import type { GameContext } from './types';

// A reusable round-based template for predict / sort / numeric games.
// A game builds its questions from `ctx.random()` for the current level, then calls `mountQuiz`.
// Pure helpers are exported separately so a game's logic can be unit-tested without a DOM.

export interface ChoiceQuestion {
  kind: 'choice';
  prompt: string;
  figure?: Node;
  options: string[];
  /** Index into `options`. */
  answer: number;
  /** Always shown after answering: the *reason*, not just the result. */
  explain: string;
  /** Extra feedback for a specific wrong option, keyed by the option's text (targets a misconception). */
  whyWrong?: Record<string, string>;
}

export interface NumberQuestion {
  kind: 'number';
  prompt: string;
  figure?: Node;
  unit?: string;
  answer: number;
  /** Relative tolerance, e.g. 0.02 for 2%. */
  tolerance: number;
  explain: string;
  /** Extra feedback for a specific wrong value (e.g. a unit slip). Return undefined for no extra. */
  whyWrong?: (given: number) => string | undefined;
}

export type Question = ChoiceQuestion | NumberQuestion;

// ---- pure helpers --------------------------------------------------------------------------

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

/** Build a choice question with shuffled options. `wrong` should be plausible mistakes, not filler. */
export function choice(args: {
  prompt: string;
  correct: string;
  wrong: string[];
  random: () => number;
  explain: string;
  figure?: Node;
  whyWrong?: Record<string, string>;
}): ChoiceQuestion {
  const options = shuffle([args.correct, ...args.wrong], args.random);
  return {
    kind: 'choice',
    prompt: args.prompt,
    figure: args.figure,
    options,
    answer: options.indexOf(args.correct),
    explain: args.explain,
    whyWrong: args.whyWrong,
  };
}

/** Accepts "0.25", "3.2e-19", "3.2 x 10^-19", "3.2×10-19". Returns null if not a number. */
export function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(/,/g, '').replace(/−/g, '-');
  if (s === '') return null;
  const m = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+))\s*[x×*]\s*10\s*\^?\s*\(?([+-]?\d+)\)?$/i);
  const n = m ? Number(`${m[1]}e${m[2]}`) : Number(s);
  return Number.isFinite(n) ? n : null;
}

export function isCloseEnough(given: number, answer: number, tolerance: number): boolean {
  if (answer === 0) return Math.abs(given) <= tolerance;
  return Math.abs(given - answer) / Math.abs(answer) <= tolerance;
}

/** Pass if you made at most one mistake (or whatever `passMark` says). Stars: perfect 3, one slip 2, else 1. */
export function gradeQuiz(correct: number, total: number, passMark = total - 1): { passed: boolean; stars: 0 | 1 | 2 | 3 } {
  if (correct < passMark) return { passed: false, stars: 0 };
  return { passed: true, stars: correct === total ? 3 : correct === total - 1 ? 2 : 1 };
}

// ---- UI ------------------------------------------------------------------------------------

export function mountQuiz(ctx: GameContext, opts: { questions: Question[]; passMark?: number }): () => void {
  const { questions } = opts;
  const total = questions.length;
  const passMark = opts.passMark ?? total - 1;
  let index = 0;
  let correct = 0;
  let alive = true;

  const show = () => {
    if (!alive) return;
    const q = questions[index];
    let answered = false;

    const feedback = h('div', { class: 'feedback', hidden: true, 'aria-live': 'polite' });
    const nextBtn = h(
      'button',
      {
        class: 'btn',
        hidden: true,
        onclick: () => {
          index++;
          if (index < total) show();
          else finish();
        },
      },
      index + 1 < total ? 'Next question' : 'See result',
    );

    const settle = (ok: boolean, extra?: string) => {
      answered = true;
      if (ok) correct++;
      feedback.hidden = false;
      feedback.className = ok ? 'feedback good' : 'feedback bad';
      feedback.replaceChildren(h('strong', null, ok ? 'Correct. ' : 'Not quite. '), extra ? `${extra} ` : '', q.explain);
      nextBtn.hidden = false;
      nextBtn.focus();
    };

    const answerArea = h('div', { class: 'answer-area' });
    if (q.kind === 'choice') {
      const buttons = q.options.map((opt, i) =>
        h(
          'button',
          {
            class: 'btn secondary option',
            onclick: () => {
              if (answered) return;
              const ok = i === q.answer;
              buttons.forEach((b, j) => {
                b.setAttribute('disabled', '');
                if (j === q.answer) b.classList.add('correct');
                else if (j === i) b.classList.add('wrong');
              });
              settle(ok, ok ? undefined : q.whyWrong?.[opt]);
            },
          },
          opt,
        ),
      );
      answerArea.append(h('div', { class: 'options' }, ...buttons));
    } else {
      const input = h('input', {
        class: 'field',
        type: 'text',
        inputmode: 'decimal',
        autocomplete: 'off',
        'aria-label': 'Your answer',
        placeholder: 'e.g. 0.25 or 3.2e-19',
      });
      const msg = h('p', { class: 'muted', hidden: true });
      const check = () => {
        if (answered) return;
        const given = parseNumber(input.value);
        if (given === null) {
          msg.hidden = false;
          msg.textContent = 'Enter a number, like 0.25 or 3.2e-19.';
          return;
        }
        msg.hidden = true;
        input.setAttribute('disabled', '');
        checkBtn.setAttribute('disabled', '');
        const ok = isCloseEnough(given, q.answer, q.tolerance);
        settle(ok, ok ? undefined : q.whyWrong?.(given));
      };
      const checkBtn = h('button', { class: 'btn', onclick: check }, 'Check');
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') check();
      });
      answerArea.append(h('div', { class: 'row' }, input, q.unit ? h('span', { class: 'unit' }, q.unit) : null, checkBtn), msg);
    }

    ctx.root.replaceChildren(
      ...[
        h('p', { class: 'muted' }, `Question ${index + 1} of ${total}`),
        h('p', { class: 'prompt' }, q.prompt),
        q.figure,
        answerArea,
        feedback,
        h('div', { class: 'row' }, nextBtn),
      ].filter((n): n is Node => n !== undefined),
    );
  };

  const finish = () => {
    const { passed, stars } = gradeQuiz(correct, total, passMark);
    ctx.root.replaceChildren(
      h('p', { class: 'prompt' }, `You answered ${correct} of ${total} correctly.`),
      passed
        ? h('p', { class: 'feedback good' }, 'Level cleared.')
        : h('p', { class: 'feedback bad' }, `You need at least ${passMark} of ${total}. Use a hint if you're stuck, then try again.`),
      ...(passed ? [] : [h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => ctx.restart() }, 'Try again'))]),
    );
    if (passed && stars > 0) ctx.win({ stars: stars as 1 | 2 | 3 });
  };

  show();
  return () => {
    alive = false;
  };
}
