// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { neighbours } from '../src/core/browse';
import type { Curriculum } from '../src/core/curriculum';
import { drawerModel, wrapInShell } from '../src/core/drawer';
import { resetHomeState } from '../src/core/home';
import { applyResult } from '../src/core/progress';
import { entry } from './fixtures';

const physics12: Curriculum = {
  subject: 'physics',
  classLevel: 12,
  chapters: [
    { number: 1, name: 'Electric Charges and Fields' },
    { number: 2, name: 'Electrostatic Potential and Capacitance' },
  ],
  source: 'test',
} as Curriculum;
const ch2 = { chapter: { number: 2, name: 'Electrostatic Potential and Capacitance' } };
const entries = [entry('a', { title: 'Alpha Game' }), entry('b', { title: 'Bravo Game', order: 2 }), entry('c', { title: 'Charlie Game', ...ch2 })];
const maths = entry('m', { title: 'Maths Game', subject: 'mathematics', chapter: { number: 1, name: 'Relations and Functions' } });

let app: HTMLElement;
const $ = (sel: string) => app.querySelector(sel) as HTMLElement | null;
const $$ = (sel: string) => [...app.querySelectorAll(sel)] as HTMLElement[];
function screen(wide: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('min-width: 900px') ? wide : false, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }));
}
function mount(over: Partial<Parameters<typeof wrapInShell>[1]> = {}) {
  const page = document.createElement('main');
  const shell = wrapInShell(page, { entries, curricula: [physics12], store: {}, last: null, ...over });
  app.replaceChildren(shell);
}
const find = () => $('.drawer-find') as HTMLInputElement;
function type(text: string) {
  find().value = text;
  find().dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  document.body.innerHTML = '';
  app = document.createElement('div');
  document.body.append(app);
  localStorage.clear();
  resetHomeState();
  location.hash = '';
  screen(true);
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.classList.remove('no-scroll');
});

describe('games under each chapter in the menu', () => {
  it('the model lists each chapter’s games in textbook order with their status', () => {
    const store = [1, 2, 3].reduce((s, l) => applyResult(s, 'a', l, 3), {});
    const [c] = drawerModel(entries, [physics12], store);
    expect(c.chapters[0].list.map((g) => [g.id, g.status])).toEqual([['a', 'done'], ['b', 'new']]);
    expect(c.chapters[1].list.map((g) => g.id)).toEqual(['c']);
  });
  it('a chapter opens to its games with one click, each game is a direct link, and a second click folds it', () => {
    mount();
    const head = $$('.drawer-chapter')[0];
    const list = document.getElementById(head.getAttribute('aria-controls')!)!;
    expect(list.hidden).toBe(true);
    expect(head.getAttribute('aria-expanded')).toBe('false');
    head.click();
    expect(list.hidden).toBe(false);
    expect(head.getAttribute('aria-expanded')).toBe('true');
    expect([...list.querySelectorAll('a.drawer-game')].map((a) => a.getAttribute('href'))).toEqual(['#/game/a', '#/game/b']);
    head.click();
    expect(list.hidden).toBe(true);
  });
  it('remembers which chapters are open', () => {
    mount();
    $$('.drawer-chapter')[1].click();
    expect(JSON.parse(localStorage.getItem('concept-arcade:drawer-chapters')!)).toEqual(['physics-12-2']);
    mount();
    expect($$('.drawer-chapter')[1].getAttribute('aria-expanded')).toBe('true');
    expect($$('.drawer-chapter')[0].getAttribute('aria-expanded')).toBe('false');
  });
  it('while playing, the chapter of the game is open and the game is marked as the current page', () => {
    mount({ active: { subject: 'physics', classLevel: 12, chapter: 2, game: 'c' } });
    expect($$('.drawer-chapter')[1].getAttribute('aria-expanded')).toBe('true');
    const here = $$('.drawer-game.current');
    expect(here).toHaveLength(1);
    expect(here[0].getAttribute('aria-current')).toBe('page');
    expect(here[0].textContent).toContain('Charlie Game');
    $$('.drawer-chapter')[1].click(); // the student may shut it
    expect($$('.drawer-chapter')[1].getAttribute('aria-expanded')).toBe('false');
  });
  it('opening a chapter on a phone does not close the menu, but choosing a game does', () => {
    screen(false);
    mount();
    ($('.menu-btn') as HTMLButtonElement).click();
    $$('.drawer-chapter')[0].click();
    expect($('.shell')!.dataset.drawer).toBe('open');
    ($$('.drawer-game')[0] as HTMLAnchorElement).click();
    expect($('.shell')!.dataset.drawer).toBe('closed');
  });
  it('survives unreadable saved state', () => {
    localStorage.setItem('concept-arcade:drawer-chapters', '{nope');
    mount();
    expect($$('.drawer-chapter').every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);
  });
});

describe('quick find in the menu', () => {
  it('typing shows matching games as links and hides the chapter list; clearing brings it back', () => {
    mount({ entries: [...entries, maths], curricula: [physics12] });
    type('bravo');
    const hits = $$('a.drawer-result');
    expect(hits.map((a) => a.getAttribute('href'))).toEqual(['#/game/b']);
    expect($('.drawer-courses')!.hidden).toBe(true);
    expect($('.drawer-results')!.hidden).toBe(false);
    type('');
    expect($('.drawer-courses')!.hidden).toBe(false);
    expect($('.drawer-results')!.hidden).toBe(true);
  });
  it('says so when nothing matches', () => {
    mount();
    type('zzzzqq');
    expect($('.drawer-none')?.textContent).toMatch(/No games match/);
  });
  it('finds games of every subject, and Enter opens the first match', () => {
    mount({ entries: [...entries, maths], curricula: [physics12] });
    type('maths');
    expect($$('a.drawer-result')[0].getAttribute('href')).toBe('#/game/m');
    find().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(location.hash).toBe('#/game/m');
    expect(find().value).toBe('');
  });
  it('Escape clears the text first', () => {
    mount();
    type('alpha');
    find().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(find().value).toBe('');
    expect($('.drawer-courses')!.hidden).toBe(false);
  });
  it('the / key and Ctrl+K jump to it from the page, even with the menu folded away, but not while typing in a field', () => {
    mount();
    ($('.menu-btn') as HTMLButtonElement).click();
    expect($('.shell')!.dataset.drawer).toBe('closed');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
    expect($('.shell')!.dataset.drawer).toBe('open');
    expect(document.activeElement).toBe(find());
    (document.activeElement as HTMLElement).blur();
    const input = document.createElement('input');
    app.append(input);
    input.focus();
    const typing = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    input.dispatchEvent(typing);
    expect(typing.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(input);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(find());
  });
});

describe('previous and next game', () => {
  it('neighbours follow textbook order within the same subject and class, and stop at the ends', () => {
    const all = [...entries, maths];
    expect(neighbours(all, 'a')).toMatchObject({ prev: null });
    expect(neighbours(all, 'a').next?.manifest.id).toBe('b');
    expect(neighbours(all, 'b').prev?.manifest.id).toBe('a');
    expect(neighbours(all, 'b').next?.manifest.id).toBe('c');
    expect(neighbours(all, 'c').next).toBeNull();
    expect(neighbours(all, 'm')).toEqual({ prev: null, next: null });
    expect(neighbours(all, 'nope')).toEqual({ prev: null, next: null });
  });
});
