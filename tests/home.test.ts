// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Curriculum } from '../src/core/curriculum';
import { renderHome, resetHomeState } from '../src/core/home';
import { applyResult, type Store } from '../src/core/progress';
import { catalog, curricula } from '../src/core/registry';
import { entry } from './fixtures';

let app: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  app = document.createElement('div');
  document.body.append(app);
  localStorage.clear();
  resetHomeState();
});
afterEach(() => vi.restoreAllMocks());

const $ = (sel: string) => app.querySelector(sel) as HTMLElement | null;
const $$ = (sel: string) => [...app.querySelectorAll(sel)] as HTMLElement[];
const click = (el: Element | null) => {
  if (!el) throw new Error('nothing to click');
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};
const clickText = (sel: string, text: string) => click($$(sel).find((e) => e.textContent?.includes(text)) ?? null);
const type = (value: string) => {
  const input = $('input.search') as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
const titles = () => $$('.game-card strong').map((e) => e.textContent);
const done = (store: Store, id: string, levels: number[]) => levels.reduce((s, l) => applyResult(s, id, l, 3), store);

const physics12: Curriculum = {
  subject: 'physics',
  classLevel: 12,
  chapters: [
    { number: 1, name: 'Electric Charges and Fields' },
    { number: 2, name: 'Electrostatic Potential and Capacitance' },
    { number: 3, name: 'Current Electricity' },
  ],
};
const render = (entries = [entry('a'), entry('b'), entry('c')], over: Parameters<typeof renderHome>[1] = {}) =>
  renderHome(app, { entries, curricula: [physics12], store: {}, last: null, ...over });

describe('depth appears only when there is depth', () => {
  it('one subject and one class: no tabs, no class selector, games shown straight away', () => {
    render();
    expect($('.tabs')).toBeNull();
    expect($('.seg')).toBeNull();
    expect($$('.game-card')).toHaveLength(3);
    expect($$('.chapter')).toHaveLength(1);
    expect($('.chapter-head')?.textContent).toContain('Electric Charges and Fields');
  });

  it('several subjects and classes: tabs and a class selector appear, and switching works', () => {
    const entries = [
      entry('phys12', { title: 'Physics Twelve' }),
      entry('phys11', { title: 'Physics Eleven', classLevel: 11, chapter: { number: 1, name: 'Units and Measurements' } }),
      entry('chem12', { title: 'Chemistry Twelve', subject: 'chemistry', chapter: { number: 1, name: 'Solutions' } }),
    ];
    renderHome(app, { entries, curricula: [], store: {}, last: null });
    expect($$('.tab').map((t) => t.textContent)).toEqual(['Physics2', 'Chemistry1']);
    expect($$('.seg-btn').map((t) => t.textContent)).toEqual(['Class 11', 'Class 12']);
    expect(titles()).toEqual(['Physics Eleven']); // first class of the first subject

    clickText('.seg-btn', 'Class 12');
    expect(titles()).toEqual(['Physics Twelve']);

    clickText('.tab', 'Chemistry');
    expect(titles()).toEqual(['Chemistry Twelve']);
    expect($('.seg')).toBeNull(); // chemistry has only one class
    expect($$('.tab').find((t) => t.textContent?.startsWith('Chemistry'))?.getAttribute('aria-pressed')).toBe('true');
  });

  it('remembers the subject, class and filter for the next visit', () => {
    const entries = [entry('p', { title: 'Phys' }), entry('c', { title: 'Chem', subject: 'chemistry', chapter: { number: 1, name: 'Solutions' } })];
    renderHome(app, { entries, curricula: [], store: {}, last: null });
    clickText('.tab', 'Chemistry');
    clickText('.filter', 'Not started');
    renderHome(app, { entries, curricula: [], store: {}, last: null }); // e.g. coming back from a game
    expect(titles()).toEqual(['Chem']);
    expect($$('.filter').find((f) => f.getAttribute('aria-pressed') === 'true')?.textContent).toContain('Not started');
  });

  it('opens on the subject and class the student last played in', () => {
    const entries = [entry('p', { title: 'Phys' }), entry('c', { title: 'Chem', subject: 'chemistry', chapter: { number: 1, name: 'Solutions' } })];
    renderHome(app, { entries, curricula: [], store: done({}, 'c', [1]), last: { id: 'c', level: 1 } });
    expect(titles()).toEqual(['Chem']);
  });
});

describe('continue where you left off', () => {
  it('tells a new student where to start', () => {
    render();
    expect($('.continue .eyebrow')?.textContent).toBe('Start here');
    expect($('.continue a')?.getAttribute('href')).toBe('#/game/a?level=1');
  });
  it('sends a returning student to their next level', () => {
    render([entry('a'), entry('b')], { store: done({}, 'b', [1]), last: { id: 'b', level: 1 } });
    expect($('.continue .eyebrow')?.textContent).toBe('Continue where you left off');
    expect($('.continue a')?.getAttribute('href')).toBe('#/game/b?level=2');
  });
  it('says so when everything is finished', () => {
    render([entry('a')], { store: done({}, 'a', [1, 2, 3]), last: { id: 'a', level: 3 } });
    expect($('.continue .eyebrow')?.textContent).toBe('All caught up');
    expect($('.continue a')).toBeNull();
  });
});

describe('search', () => {
  const entries = [
    entry('a', { title: 'Coulomb Balance', concepts: ['Inverse-square law'] }),
    entry('b', { title: 'Share the Charge', concepts: ['Conservation of charge'] }),
    entry('c', { title: 'Mole Maker', subject: 'chemistry', classLevel: 11, chapter: { number: 1, name: 'Basic Concepts' }, concepts: ['The mole'] }),
  ];
  const go = () => renderHome(app, { entries, curricula: [], store: {}, last: null });

  it('searches across every subject and class, and says where each result lives', () => {
    go();
    type('mole');
    expect(titles()).toEqual(['Mole Maker']);
    expect($('.card-context')?.textContent).toBe('Chemistry · Class 11 · Ch 1: Basic Concepts · Game 1');
    expect($('.result-count')?.textContent).toBe('1 game for “mole”');
    expect($('.tabs')).toBeNull(); // results replace the browse view
  });

  it('keeps focus in the box: typing does not rebuild the input', () => {
    go();
    const input = $('input.search');
    type('co');
    type('cou');
    expect($('input.search')).toBe(input);
  });

  it('shows a helpful empty state, and Escape clears the search', () => {
    go();
    type('zzzz');
    expect($('.empty')?.textContent).toContain('No games match that search.');
    ($('input.search') as HTMLInputElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(($('input.search') as HTMLInputElement).value).toBe('');
    expect($('.empty')).toBeNull();
    expect($('.continue')).not.toBeNull(); // back to browsing
  });

  it('the Clear search button works too', () => {
    go();
    type('zzzz');
    clickText('.empty button', 'Clear search');
    expect($('.empty')).toBeNull();
    expect(($('input.search') as HTMLInputElement).value).toBe('');
  });

  it('the result count is announced to screen readers', () => {
    go();
    type('charge');
    expect($('.result-count')?.getAttribute('aria-live')).toBe('polite');
  });
});

describe('filters', () => {
  const entries = [entry('a'), entry('b'), entry('c')];
  const store = done(done({}, 'a', [1, 2, 3]), 'b', [1]);

  it('show counts and narrow the list', () => {
    render(entries, { store });
    expect($$('.filter').map((f) => f.textContent)).toEqual(['All (3)', 'Not started (1)', 'In progress (1)', 'Completed (1)']);
    clickText('.filter', 'Completed');
    expect(titles()).toEqual(['Game a']);
    clickText('.filter', 'In progress');
    expect(titles()).toEqual(['Game b']);
    clickText('.filter', 'Not started');
    expect(titles()).toEqual(['Game c']);
    clickText('.filter', 'All');
    expect(titles()).toHaveLength(3);
  });

  it('an empty filter explains itself and offers a way back', () => {
    render([entry('a')], { store: {} });
    clickText('.filter', 'Completed');
    expect($('.empty')?.textContent).toContain('No games match this filter.');
    clickText('.empty button', 'Show all games');
    expect($$('.game-card')).toHaveLength(1);
  });

  it('planned chapters are hidden while a filter is on (they have no games to filter)', () => {
    render(entries, { store });
    expect($('details.coming')).not.toBeNull();
    clickText('.filter', 'In progress');
    expect($('details.coming')).toBeNull();
  });
});

describe('chapters scale', () => {
  it('a chapter section collapses and expands, with correct aria attributes', () => {
    render();
    const head = $('.chapter-head')!;
    const panel = document.getElementById(head.getAttribute('aria-controls')!)!;
    expect(head.getAttribute('aria-expanded')).toBe('true');
    expect(panel.hasAttribute('hidden')).toBe(false);
    click(head);
    const head2 = $('.chapter-head')!;
    expect(head2.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById(head2.getAttribute('aria-controls')!)!.hasAttribute('hidden')).toBe(true);
  });

  it('with many chapters only the next unfinished one opens by default, and Expand/Collapse all work', () => {
    const entries = [1, 2, 3, 4, 5, 6].map((n) => entry(`g${n}`, { chapter: { number: n, name: `Chapter named ${n}` } }));
    const store = done({}, 'g1', [1, 2, 3]); // chapter 1 finished, so chapter 2 is next
    renderHome(app, { entries, curricula: [], store, last: null });
    expect($$('.chapter-head').map((c) => c.getAttribute('aria-expanded'))).toEqual(['false', 'true', 'false', 'false', 'false', 'false']);
    expect($('.row.end button')?.textContent).toBe('Expand all chapters');
    click($('.row.end button'));
    expect($$('.chapter-head').every((c) => c.getAttribute('aria-expanded') === 'true')).toBe(true);
    expect($('.row.end button')?.textContent).toBe('Collapse all chapters');
    click($('.row.end button'));
    expect($$('.chapter-head').every((c) => c.getAttribute('aria-expanded') === 'false')).toBe(true);
  });

  it('chapters with no games are tucked into one "coming soon" list', () => {
    render([entry('a')]);
    expect($('details.coming summary')?.textContent).toBe('2 more chapters coming soon');
    expect($$('details.coming li').map((l) => l.textContent)).toEqual(['Chapter 2: Electrostatic Potential and Capacitance', 'Chapter 3: Current Electricity']);
  });

  it('each chapter shows its own progress', () => {
    render([entry('a'), entry('b')], { store: done({}, 'a', [1, 2, 3]) });
    expect($('.chapter-meta')?.textContent).toContain('1/2 games');
  });
});

describe('game numbers on the cards', () => {
  const nums = () => $$('.game-card').map((c) => `${c.querySelector('strong')?.textContent}=${c.querySelector('.num')?.textContent}`);

  it('every card shows its place in the chapter, in order, with an accessible label', () => {
    render([entry('a'), entry('b', { ncertRef: 'Section 1.3, Conductors and Insulators' }), entry('c', { ncertRef: 'Section 1.4, Basic Properties' })]);
    expect(nums()).toEqual(['Game a=1', 'Game b=2', 'Game c=3']);
    expect($$('.num').map((n) => n.getAttribute('aria-label'))).toEqual(['Game 1 of 3 in this chapter', 'Game 2 of 3 in this chapter', 'Game 3 of 3 in this chapter']);
  });

  it('a filter never renumbers: Game 3 stays Game 3 when it is the only one shown', () => {
    const entries = [entry('a'), entry('b', { ncertRef: 'Section 1.3, Conductors and Insulators' }), entry('c', { ncertRef: 'Section 1.4, Basic Properties' })];
    render(entries, { store: done({}, 'c', [1, 2, 3]) });
    clickText('.filter', 'Completed');
    expect(nums()).toEqual(['Game c=3']);
    clickText('.filter', 'Not started');
    expect(nums()).toEqual(['Game a=1', 'Game b=2']);
  });

  it('search results keep the real number and show it in the context line too', () => {
    const entries = [entry('a'), entry('b', { title: 'Findme', ncertRef: 'Section 1.3, Conductors and Insulators' })];
    renderHome(app, { entries, curricula: [], store: {}, last: null });
    type('findme');
    expect(nums()).toEqual(['Findme=2']);
    expect($('.card-context')?.textContent).toMatch(/Game 2$/);
  });

  it('numbering restarts in each chapter', () => {
    const entries = [
      entry('a'),
      entry('b', { ncertRef: 'Section 1.3, Conductors and Insulators' }),
      entry('c', { chapter: { number: 2, name: 'Electrostatic Potential and Capacitance' }, ncertRef: 'Section 2.1, Introduction' }),
    ];
    renderHome(app, { entries, curricula: [], store: {}, last: null });
    expect(nums()).toEqual(['Game a=1', 'Game b=2', 'Game c=1']);
  });

  it('on the real catalog, Chapter 1 is numbered 1, 2, 3 … in NCERT order', () => {
    renderHome(app, { store: {}, last: null });
    const byId = new Map($$('.game-card').map((c) => [c.getAttribute('href')!.replace('#/game/', ''), Number(c.querySelector('.num')?.textContent)]));
    const ids = ['attract-or-repel', 'electron-ledger', 'conduct-or-insulate', 'net-charge', 'charge-conserved', 'quantum-of-charge', 'coulomb-balance'];
    const numbers = ids.map((id) => byId.get(id)!);
    expect(numbers.every((n) => Number.isInteger(n))).toBe(true);
    expect([...numbers].sort((a, b) => a - b)).toEqual(numbers); // already in increasing order
    expect(new Set(numbers).size).toBe(ids.length);
    expect(numbers[0]).toBe(1);
  });
});

describe('cards', () => {
  it('show status, level pips and stars', () => {
    render([entry('a')], { store: done({}, 'a', [1, 2]) });
    expect($('.status')?.textContent).toBe('In progress');
    expect($$('.pip')).toHaveLength(3);
    expect($$('.pip.on')).toHaveLength(2);
    expect($('.pips')?.getAttribute('aria-label')).toBe('2 of 3 levels done');
  });
  it('link to the game', () => {
    render([entry('a')]);
    expect($('.game-card')?.getAttribute('href')).toBe('#/game/a');
  });
});

describe('safety and accessibility', () => {
  it('game text is shown as text, never as HTML', () => {
    render([entry('a', { title: '<img src=x onerror=alert(1)>' })]);
    expect(app.querySelector('img')).toBeNull();
    expect($('.game-card strong')?.textContent).toBe('<img src=x onerror=alert(1)>');
  });
  it('the search box is labelled, and selectors expose their pressed state', () => {
    const entries = [entry('p'), entry('c', { subject: 'chemistry', chapter: { number: 1, name: 'Solutions' } })];
    renderHome(app, { entries, curricula: [], store: {}, last: null });
    expect($('input.search')?.getAttribute('aria-label')).toBeTruthy();
    expect($$('.tab').every((t) => t.hasAttribute('aria-pressed'))).toBe(true);
    expect($$('.filter').every((t) => t.hasAttribute('aria-pressed'))).toBe(true);
  });
});

describe('the real catalog', () => {
  it('renders every game and lists the planned chapters, with no errors', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderHome(app, { store: {}, last: null }); // real games and the real curriculum files
    expect($$('.game-card').length).toBeGreaterThanOrEqual(7);
    expect($('.chapter-head')?.textContent).toContain('Electric Charges and Fields');
    // Derived from the data, so building another chapter never breaks this test.
    const real12 = curricula.find((c) => c.subject === 'physics' && c.classLevel === 12)!;
    const built = new Set(catalog.filter((g) => g.manifest.subject === 'physics' && g.manifest.classLevel === 12).map((g) => g.manifest.chapter.number));
    const planned = real12.chapters.filter((c) => !built.has(c.number)).length;
    // Once every chapter has games there is nothing left to announce, so the list is not drawn at all.
    if (planned === 0) expect($('details.coming')).toBeNull();
    else expect($('details.coming summary')?.textContent).toBe(`${planned} more chapter${planned === 1 ? '' : 's'} coming soon`);
    expect(err).not.toHaveBeenCalled();
  });

  it('lists Chapter 1 in NCERT order on the actual page', () => {
    renderHome(app, { store: {}, last: null });
    const shown = $$('.game-card').map((a) => a.getAttribute('href')!.replace('#/game/', ''));
    const known = ['attract-or-repel', 'electron-ledger', 'conduct-or-insulate', 'net-charge', 'charge-conserved', 'quantum-of-charge', 'coulomb-balance'];
    expect(shown.filter((id) => known.includes(id))).toEqual(known);
  });
});
