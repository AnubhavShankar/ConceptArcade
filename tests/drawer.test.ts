// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Curriculum } from '../src/core/curriculum';
import { drawerModel, wrapInShell } from '../src/core/drawer';
import { renderHome, resetHomeState } from '../src/core/home';
import { applyResult } from '../src/core/progress';
import { entry } from './fixtures';

const physics12: Curriculum = {
  subject: 'physics',
  classLevel: 12,
  chapters: [
    { number: 1, name: 'Electric Charges and Fields' },
    { number: 2, name: 'Electrostatic Potential and Capacitance' },
    { number: 3, name: 'Current Electricity' },
  ],
  source: 'test',
} as Curriculum;
const ch = (n: number, name: string) => ({ chapter: { number: n, name } });
const entries = [entry('a'), entry('b'), entry('c', ch(2, 'Electrostatic Potential and Capacitance'))];

let app: HTMLElement;
const $ = (sel: string) => app.querySelector(sel) as HTMLElement | null;
const $$ = (sel: string) => [...app.querySelectorAll(sel)] as HTMLElement[];

/** Pretend the screen is wide (a desktop) or narrow (a phone). */
function screen(wide: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('min-width: 900px') ? wide : false, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }));
}
function mount(over: Partial<Parameters<typeof wrapInShell>[1]> = {}) {
  const page = document.createElement('main');
  page.textContent = 'the page';
  const shell = wrapInShell(page, { entries, curricula: [physics12], store: {}, last: null, ...over });
  app.replaceChildren(shell);
  return shell;
}
const shell = () => $('.shell')!;
const menu = () => $('.menu-btn') as HTMLButtonElement;

beforeEach(() => {
  document.body.innerHTML = '';
  app = document.createElement('div');
  document.body.append(app);
  localStorage.clear();
  resetHomeState();
  location.hash = '';
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.classList.remove('no-scroll');
});

describe('drawerModel', () => {
  it('lists every chapter with progress, and marks chapters without games as coming soon', () => {
    const store = [1, 2, 3].reduce((s, l) => applyResult(s, 'a', l, 3), {});
    const [c] = drawerModel(entries, [physics12], store);
    expect(c).toMatchObject({ subject: 'physics', classLevel: 12 });
    expect(c.chapters.map((x) => [x.number, x.games, x.gamesDone, x.soon])).toEqual([
      [1, 2, 1, false],
      [2, 1, 0, false],
      [3, 0, 0, true],
    ]);
  });
});

describe('the drawer on a desktop', () => {
  beforeEach(() => screen(true));
  it('is open by default and the page sits beside it', () => {
    mount();
    expect(shell().dataset.drawer).toBe('open');
    expect(menu().getAttribute('aria-expanded')).toBe('true');
    expect($('.scrim')!.hidden).toBe(true);
    expect($('.shell-main')!.textContent).toContain('the page');
  });
  it('can be folded away and brought back, and remembers the choice', () => {
    mount();
    menu().click();
    expect(shell().dataset.drawer).toBe('closed');
    expect(menu().getAttribute('aria-label')).toBe('Open menu');
    expect(localStorage.getItem('concept-arcade:drawer')).toBe('closed');
    mount(); // the next page opens the same way
    expect(shell().dataset.drawer).toBe('closed');
    menu().click();
    expect(shell().dataset.drawer).toBe('open');
    expect(localStorage.getItem('concept-arcade:drawer')).toBe('open');
  });
  it('the close button inside the drawer folds it too', () => {
    mount();
    ($('.drawer-close') as HTMLButtonElement).click();
    expect(shell().dataset.drawer).toBe('closed');
  });
  it('the page is never locked or hidden from the keyboard while the sidebar is open', () => {
    mount();
    expect($('.shell-main')!.hasAttribute('inert')).toBe(false);
    expect(document.body.classList.contains('no-scroll')).toBe(false);
  });
});

describe('the drawer on a phone', () => {
  beforeEach(() => screen(false));
  it('starts closed and does not read the saved desktop choice', () => {
    localStorage.setItem('concept-arcade:drawer', 'open');
    mount();
    expect(shell().dataset.drawer).toBe('closed');
  });
  it('opens over the page: dimmed background, page inert, scrolling locked, focus moves in', () => {
    mount();
    menu().click();
    expect(shell().dataset.drawer).toBe('open');
    expect($('.scrim')!.hidden).toBe(false);
    expect($('.shell-main')!.hasAttribute('inert')).toBe(true);
    expect(document.body.classList.contains('no-scroll')).toBe(true);
    expect(document.activeElement).toBe($('.drawer-close'));
  });
  it('closes on Escape, on tapping outside, and on the close button, giving focus back to the menu button', () => {
    for (const how of ['escape', 'scrim', 'close']) {
      mount();
      menu().click();
      if (how === 'escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      if (how === 'scrim') $('.scrim')!.click();
      if (how === 'close') ($('.drawer-close') as HTMLButtonElement).click();
      expect(shell().dataset.drawer).toBe('closed');
      expect($('.shell-main')!.hasAttribute('inert')).toBe(false);
      expect(document.body.classList.contains('no-scroll')).toBe(false);
      expect(document.activeElement).toBe(menu());
    }
  });
  it('a swipe to the left closes it, a small nudge does not', () => {
    mount();
    menu().click();
    const touch = (type: string, x: number) => {
      const e = new Event(type, { bubbles: true }) as Event & { touches: unknown[]; changedTouches: unknown[] };
      e.touches = [{ clientX: x }];
      e.changedTouches = [{ clientX: x }];
      $('.drawer')!.dispatchEvent(e);
    };
    touch('touchstart', 200);
    touch('touchend', 180);
    expect(shell().dataset.drawer).toBe('open');
    touch('touchstart', 200);
    touch('touchend', 100);
    expect(shell().dataset.drawer).toBe('closed');
  });
  it('keeps keyboard focus inside the open drawer (Tab wraps round)', () => {
    mount();
    menu().click();
    const items = [...app.querySelectorAll<HTMLElement>('.drawer a[href], .drawer button:not([disabled])')];
    items[items.length - 1].focus();
    const tab = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
    document.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(items[0]);
    const back = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });
    document.dispatchEvent(back);
    expect(document.activeElement).toBe(items[items.length - 1]);
  });
  it('picking a chapter or a link closes it so the destination is visible', () => {
    mount();
    menu().click();
    ($$('.drawer-chapter')[0] as HTMLButtonElement).click();
    expect(shell().dataset.drawer).toBe('open');
    ($$('.drawer-game')[0] as HTMLAnchorElement).click();
    expect(shell().dataset.drawer).toBe('closed');
    menu().click();
    $('.drawer-link')!.click();
    expect(shell().dataset.drawer).toBe('closed');
  });
});

describe('what the drawer contains', () => {
  beforeEach(() => screen(true));
  it('chapters with progress, coming-soon chapters that are not clickable, and an add-a-game link', () => {
    mount();
    expect($$('.drawer-chapter').map((b) => b.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('Electric Charges and Fields')]));
    expect($$('.drawer-chapter')).toHaveLength(2);
    const soon = $$('.drawer-chapters li.soon');
    expect(soon).toHaveLength(1);
    expect(soon[0].textContent).toContain('Current Electricity');
    expect(soon[0].querySelector('button')).toBeNull();
    const add = $$('.drawer a').find((a) => a.textContent!.includes('Add a game'))!;
    expect(add.getAttribute('target')).toBe('_blank');
    expect(add.getAttribute('rel')).toContain('noopener');
  });
  it('shows overall progress, the theme toggle, and a continue link to the last game', () => {
    const store = applyResult({}, 'a', 1, 3);
    mount({ store, last: { id: 'b', level: 2 } });
    expect($('.drawer-progress')!.textContent).toBe('0/3 games · 3 ★');
    expect($('.drawer .theme-toggle')).not.toBeNull();
    const resume = $('.drawer-link.resume')!;
    expect(resume.getAttribute('href')).toBe('#/game/b?level=2');
    expect(resume.textContent).toContain('Game b');
  });
  it('omits the continue link when the last game no longer exists', () => {
    mount({ last: { id: 'gone', level: 1 } });
    expect($('.drawer-link.resume')).toBeNull();
  });
  it('marks the chapter you are in while playing', () => {
    mount({ active: { subject: 'physics', classLevel: 12, chapter: 2 } });
    const current = $$('.drawer-chapter.current');
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain('Electrostatic');
    expect(current[0].getAttribute('aria-current')).toBe('true');
  });
});

describe('going to a chapter', () => {
  beforeEach(() => screen(true));
  it('from the home page: repaints home with that chapter open', () => {
    renderHome(app, { entries, curricula: [physics12], store: {}, last: null });
    // chapter 2 starts collapsed or open depending on defaults; close it by clicking its head, then ask the drawer for it
    const head = () => $$('.chapter-head').find((b) => b.textContent!.includes('Electrostatic'))!;
    if (head().getAttribute('aria-expanded') === 'true') head().click();
    expect(head().getAttribute('aria-expanded')).toBe('false');
    const repaint = vi.fn(() => renderHome(app, { entries, curricula: [physics12], store: {}, last: null }));
    window.addEventListener('hashchange', repaint);
    ($$('.drawer-chapter')[1] as HTMLButtonElement).click();
    const button = $$('.drawer-see')[0];
    button.click();
    window.removeEventListener('hashchange', repaint);
    expect(repaint).toHaveBeenCalledTimes(1);
    expect(head().getAttribute('aria-expanded')).toBe('true');
    expect($('.chapter#chapter-sec-physics-12-2')).not.toBeNull();
  });
  it('from a game page: sends the student home', () => {
    location.hash = '#/game/a?level=1';
    mount({ active: { subject: 'physics', classLevel: 12, chapter: 1 } });
    ($$('.drawer-chapter')[1] as HTMLButtonElement).click();
    ($$('.drawer-see')[0] as HTMLButtonElement).click();
    expect(location.hash).toBe('#/');
  });
});

describe('the pages use it', () => {
  it('the home page is wrapped in the shell, with the hero and the games inside', () => {
    screen(true);
    renderHome(app, { entries, curricula: [physics12], store: {}, last: null });
    expect($('.shell .drawer')).not.toBeNull();
    expect($('.shell-main .home-hero')).not.toBeNull();
    expect($('.shell-main .game-card')).not.toBeNull();
  });
});

describe('collapsible subject sections', () => {
  beforeEach(() => screen(true));
  const maths12: Curriculum = { subject: 'mathematics', classLevel: 12, chapters: [{ number: 1, name: 'Relations and Functions' }], source: 'test' } as Curriculum;
  const mathsEntry = entry('m', { subject: 'mathematics', chapter: { number: 1, name: 'Relations and Functions' } });
  const toggles = () => $$('.drawer-course-toggle') as HTMLButtonElement[];

  it('every subject has a toggle that is open at first and controls its chapter list', () => {
    mount({ entries: [...entries, mathsEntry], curricula: [physics12, maths12] });
    expect(toggles().map((t) => t.textContent)).toEqual([expect.stringContaining('Physics · Class 12'), expect.stringContaining('Mathematics · Class 12')]);
    for (const t of toggles()) {
      expect(t.getAttribute('aria-expanded')).toBe('true');
      expect(document.getElementById(t.getAttribute('aria-controls')!)?.hidden).toBe(false);
    }
  });
  it('folding one subject hides only its chapters and a second click opens it again', () => {
    mount({ entries: [...entries, mathsEntry], curricula: [physics12, maths12] });
    toggles()[0].click();
    expect(toggles()[0].getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById(toggles()[0].getAttribute('aria-controls')!)?.hidden).toBe(true);
    expect(document.getElementById(toggles()[1].getAttribute('aria-controls')!)?.hidden).toBe(false);
    toggles()[0].click();
    expect(toggles()[0].getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(toggles()[0].getAttribute('aria-controls')!)?.hidden).toBe(false);
  });
  it('remembers which subjects are folded for the next page', () => {
    mount({ entries: [...entries, mathsEntry], curricula: [physics12, maths12] });
    toggles()[1].click();
    expect(JSON.parse(localStorage.getItem('concept-arcade:drawer-courses')!)).toEqual(['mathematics-12']);
    mount({ entries: [...entries, mathsEntry], curricula: [physics12, maths12] });
    expect(toggles()[0].getAttribute('aria-expanded')).toBe('true');
    expect(toggles()[1].getAttribute('aria-expanded')).toBe('false');
  });
  it('survives unreadable saved state', () => {
    localStorage.setItem('concept-arcade:drawer-courses', '{not json');
    mount({ entries: [...entries, mathsEntry], curricula: [physics12, maths12] });
    expect(toggles().every((t) => t.getAttribute('aria-expanded') === 'true')).toBe(true);
  });
  it('a folded subject’s chapter buttons do not count for keyboard focus on a phone', () => {
    screen(false);
    mount({ entries: [...entries, mathsEntry], curricula: [physics12, maths12] });
    toggles()[0].click();
    menu().click();
    const f = $$('.drawer a[href], .drawer button:not([disabled])').filter((el) => !el.closest('[hidden]'));
    expect(f.some((el) => el.classList.contains('drawer-chapter') && el.textContent!.includes('Electric'))).toBe(false);
  });
});
