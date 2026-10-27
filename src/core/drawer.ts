// The left menu drawer. On a wide screen it is a sidebar that the student can fold away; on a phone it slides over
// the page. It is built for navigating: jump to any chapter, resume, change theme, find how to add a game.
import { buildCourses, statsFor, type Course } from './browse';
import { subjectLabel, type Curriculum } from './curriculum';
import { h } from './dom';
import { showChapter } from './home';
import type { LastPlayed, Store } from './progress';
import { themeToggle } from './theme';

interface EntryLike {
  manifest: import('./manifest').GameManifest;
}

export interface ShellOptions<E extends EntryLike> {
  entries: E[];
  curricula: Curriculum[];
  store: Store;
  last: LastPlayed | null;
  /** The chapter of the game being played, so the menu can show where you are. */
  active?: { subject: string; classLevel: number; chapter: number };
}

export interface DrawerChapter {
  number: number;
  name: string;
  games: number;
  gamesDone: number;
  levelsDone: number;
  levelsTotal: number;
  soon: boolean;
}
export interface DrawerCourse {
  subject: string;
  classLevel: number;
  chapters: DrawerChapter[];
}

/** What the menu lists: every course and chapter, with progress; chapters with no games are marked "soon". */
export function drawerModel<E extends EntryLike>(entries: E[], curricula: Curriculum[], store: Store): DrawerCourse[] {
  return buildCourses(entries, curricula).map((c: Course<E>) => ({
    subject: c.subject,
    classLevel: c.classLevel,
    chapters: c.chapters.map((ch) => {
      const s = statsFor(store, ch.games);
      return { number: ch.number, name: ch.name, games: s.games, gamesDone: s.gamesDone, levelsDone: s.levelsDone, levelsTotal: s.levelsTotal, soon: ch.games.length === 0 };
    }),
  }));
}

const KEY = 'concept-arcade:drawer';
const WIDE = '(min-width: 900px)';
const CONTRIBUTING = 'https://github.com/AnubhavShankar/ConceptArcade/blob/main/CONTRIBUTING.md';

const isWide = () => (typeof window.matchMedia === 'function' ? window.matchMedia(WIDE).matches : true);
function remembered(): 'open' | 'closed' {
  try {
    return localStorage.getItem(KEY) === 'closed' ? 'closed' : 'open';
  } catch {
    return 'open';
  }
}
function remember(state: 'open' | 'closed'): void {
  try {
    localStorage.setItem(KEY, state);
  } catch {
    /* it just will not be remembered */
  }
}

let detach: (() => void) | null = null; // the previous shell's listeners go when a new page replaces it

/** Wrap a page in the app shell: top bar, menu drawer and the page itself. */
export function wrapInShell<E extends EntryLike>(page: HTMLElement, opts: ShellOptions<E>): HTMLElement {
  detach?.();

  const model = drawerModel(opts.entries, opts.curricula, opts.store);
  const total = statsFor(opts.store, opts.entries);
  const lastEntry = opts.last ? opts.entries.find((e) => e.manifest.id === opts.last!.id) : undefined;

  const menuBtn = h('button', { class: 'menu-btn', type: 'button', 'aria-controls': 'drawer', 'aria-expanded': 'false', 'aria-label': 'Open menu' }, h('span', { 'aria-hidden': 'true' }, '☰'), h('span', { class: 'menu-label' }, 'Menu'));
  const closeBtn = h('button', { class: 'drawer-close', type: 'button', 'aria-label': 'Close menu' }, h('span', { 'aria-hidden': 'true' }, '✕'));
  const scrim = h('div', { class: 'scrim', hidden: true });

  function goToChapter(subject: string, classLevel: number, chapter: number) {
    showChapter(subject, classLevel, chapter);
    const at = `${subject}-${classLevel}-${chapter}`;
    const scroll = () => window.setTimeout(() => document.getElementById(`chapter-sec-${at}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 60);
    if (location.hash === '' || location.hash === '#/' || location.hash === '#') {
      window.dispatchEvent(new HashChangeEvent('hashchange')); // already home: repaint with the chapter open
    } else {
      location.hash = '#/';
    }
    scroll();
  }

  const courseBlocks = model.map((c) =>
    h(
      'section',
      { class: 'drawer-course' },
      h('h2', null, `${subjectLabel(c.subject)} · Class ${c.classLevel}`),
      h(
        'ul',
        { class: 'drawer-chapters' },
        ...c.chapters.map((ch) => {
          const here = opts.active && opts.active.subject === c.subject && opts.active.classLevel === c.classLevel && opts.active.chapter === ch.number;
          if (ch.soon) return h('li', { class: 'soon' }, h('span', { class: 'drawer-ch-num' }, String(ch.number)), h('span', { class: 'drawer-ch-name' }, ch.name), h('span', { class: 'drawer-ch-meta' }, 'soon'));
          const pct = ch.levelsTotal ? Math.round((ch.levelsDone / ch.levelsTotal) * 100) : 0;
          return h(
            'li',
            null,
            h(
              'button',
              { class: `drawer-chapter${here ? ' current' : ''}`, type: 'button', 'aria-current': here ? 'true' : false, onclick: () => goToChapter(c.subject, c.classLevel, ch.number) },
              h('span', { class: 'drawer-ch-num' }, String(ch.number)),
              h('span', { class: 'drawer-ch-name' }, ch.name),
              h('span', { class: 'drawer-ch-meta' }, `${ch.gamesDone}/${ch.games} games`),
              h('span', { class: 'bar', role: 'img', 'aria-label': `${pct}% complete` }, h('span', { class: 'bar-fill', style: `width:${pct}%` })),
            ),
          );
        }),
      ),
    ),
  );

  const drawer = h(
    'aside',
    { class: 'drawer', id: 'drawer', 'aria-label': 'Menu' },
    h('div', { class: 'drawer-head' }, h('a', { class: 'brand', href: '#/' }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, '◆'), 'Concept Arcade'), closeBtn),
    h(
      'nav',
      { class: 'drawer-nav', 'aria-label': 'Browse' },
      h('a', { class: 'drawer-link', href: '#/' }, 'All games'),
      lastEntry && opts.last ? h('a', { class: 'drawer-link resume', href: `#/game/${lastEntry.manifest.id}?level=${opts.last.level}` }, h('small', null, 'Continue'), h('span', null, lastEntry.manifest.title)) : null,
      ...courseBlocks,
    ),
    h(
      'div',
      { class: 'drawer-foot' },
      h('p', { class: 'drawer-progress' }, `${total.gamesDone}/${total.games} games · ${total.stars} ★`),
      h('div', { class: 'drawer-row' }, h('span', null, 'Theme'), themeToggle()),
      h('a', { class: 'drawer-link', href: CONTRIBUTING, target: '_blank', rel: 'noopener noreferrer' }, 'Add a game ↗'),
    ),
  );

  const main = h('div', { class: 'shell-main' }, h('header', { class: 'topbar' }, menuBtn, h('a', { class: 'brand', href: '#/' }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, '◆'), 'Concept Arcade')), page);
  const shell = h('div', { class: 'shell' }, drawer, scrim, main);

  // ---- behaviour --------------------------------------------------------------------------------
  const overlay = () => !isWide();
  let state: 'open' | 'closed' = isWide() ? remembered() : 'closed';

  const focusables = () => [...drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];

  function paint() {
    shell.dataset.drawer = state;
    const open = state === 'open';
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    scrim.hidden = !(open && overlay());
    if (open && overlay()) main.setAttribute('inert', '');
    else main.removeAttribute('inert');
    document.body.classList.toggle('no-scroll', open && overlay());
  }
  function setState(next: 'open' | 'closed', byUser: boolean) {
    state = next;
    if (byUser && isWide()) remember(next);
    paint();
    if (overlay()) (next === 'open' ? (closeBtn as HTMLElement) : menuBtn).focus();
  }
  menuBtn.addEventListener('click', () => setState(state === 'open' ? 'closed' : 'open', true));
  closeBtn.addEventListener('click', () => setState('closed', true));
  scrim.addEventListener('click', () => setState('closed', true));
  // Choosing a destination on a phone should reveal it, not leave the menu covering it.
  drawer.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('a[href^="#/"], .drawer-chapter');
    if (t && overlay()) setState('closed', false);
  });

  const onKey = (e: KeyboardEvent) => {
    if (state !== 'open' || !overlay()) return;
    if (e.key === 'Escape') {
      setState('closed', true);
    } else if (e.key === 'Tab') {
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !drawer.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !drawer.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  document.addEventListener('keydown', onKey);

  let touchX = 0;
  drawer.addEventListener('touchstart', (e) => (touchX = e.touches[0]?.clientX ?? 0), { passive: true });
  drawer.addEventListener('touchend', (e) => {
    const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX;
    if (dx < -60 && overlay()) setState('closed', true);
  });

  const mq = typeof window.matchMedia === 'function' ? window.matchMedia(WIDE) : null;
  const onResize = () => {
    state = isWide() ? remembered() : 'closed';
    paint();
  };
  mq?.addEventListener?.('change', onResize);

  detach = () => {
    document.removeEventListener('keydown', onKey);
    mq?.removeEventListener?.('change', onResize);
    document.body.classList.remove('no-scroll');
  };

  paint();
  return shell;
}
