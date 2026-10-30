// The left menu drawer. On a wide screen it is a sidebar that the student can fold away; on a phone it slides over
// the page. It is built for navigating: jump to any chapter, resume, change theme, find how to add a game.
import { buildCourses, compareGames, gameStatus, searchEntries, statsFor, type Course, type GameStatus } from './browse';
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
  active?: { subject: string; classLevel: number; chapter: number; game?: string };
}

export interface DrawerGame {
  id: string;
  title: string;
  status: GameStatus;
}
export interface DrawerChapter {
  number: number;
  name: string;
  games: number;
  gamesDone: number;
  levelsDone: number;
  levelsTotal: number;
  soon: boolean;
  list: DrawerGame[];
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
      const list = [...ch.games].sort((a, b) => compareGames(a.manifest, b.manifest)).map((g) => ({ id: g.manifest.id, title: g.manifest.title, status: gameStatus(store, g.manifest) }));
      return { number: ch.number, name: ch.name, games: s.games, gamesDone: s.gamesDone, levelsDone: s.levelsDone, levelsTotal: s.levelsTotal, soon: ch.games.length === 0, list };
    }),
  }));
}

const KEY = 'concept-arcade:drawer';
const COURSES_KEY = 'concept-arcade:drawer-courses';
const CHAPTERS_KEY = 'concept-arcade:drawer-chapters';
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

/** The courses (e.g. "physics-12") the student folded away in the menu; all open by default. */
function foldedCourses(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(COURSES_KEY) ?? '[]');
    return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}
function rememberFolded(folded: Set<string>): void {
  try {
    localStorage.setItem(COURSES_KEY, JSON.stringify([...folded]));
  } catch {
    /* it just will not be remembered */
  }
}

/** The chapters (e.g. "physics-12-3") whose game lists the student opened in the menu. */
function openedChapters(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(CHAPTERS_KEY) ?? '[]');
    return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}
function rememberOpened(opened: Set<string>): void {
  try {
    localStorage.setItem(CHAPTERS_KEY, JSON.stringify([...opened]));
  } catch {
    /* it just will not be remembered */
  }
}
const STATUS_MARK: Record<GameStatus, string> = { new: '○', progress: '◐', done: '●' };
const STATUS_WORD: Record<GameStatus, string> = { new: 'not started', progress: 'in progress', done: 'completed' };

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

  const folded = foldedCourses();
  const opened = openedChapters();
  const closedActive = new Set<string>(); // the chapter you are in opens by itself unless you shut it
  const courseBlocks = model.map((c) => {
    const id = `${c.subject}-${c.classLevel}`;
    const listId = `drawer-course-${id}`;
    const done = c.chapters.filter((ch) => !ch.soon).length;
    const caret = h('span', { class: 'drawer-caret', 'aria-hidden': 'true' }, '▾');
    const toggle = h('button', { class: 'drawer-course-toggle', type: 'button', 'aria-controls': listId, 'aria-expanded': 'true' }, caret, h('span', { class: 'drawer-course-name' }, `${subjectLabel(c.subject)} · Class ${c.classLevel}`), h('span', { class: 'drawer-course-count' }, `${done}/${c.chapters.length}`));
    const list = h(
        'ul',
        { class: 'drawer-chapters', id: listId },
        ...c.chapters.map((ch) => {
          const here = !!opts.active && opts.active.subject === c.subject && opts.active.classLevel === c.classLevel && opts.active.chapter === ch.number;
          if (ch.soon) return h('li', { class: 'soon' }, h('span', { class: 'drawer-ch-num' }, String(ch.number)), h('span', { class: 'drawer-ch-name' }, ch.name), h('span', { class: 'drawer-ch-meta' }, 'soon'));
          const pct = ch.levelsTotal ? Math.round((ch.levelsDone / ch.levelsTotal) * 100) : 0;
          const key = `${id}-${ch.number}`;
          const gamesId = `drawer-games-${key}`;
          const caretCh = h('span', { class: 'drawer-ch-caret', 'aria-hidden': 'true' }, '▸');
          const head = h(
            'button',
            { class: `drawer-chapter${here ? ' current' : ''}`, type: 'button', 'aria-current': here ? 'true' : false, 'aria-controls': gamesId, 'aria-expanded': 'false' },
            h('span', { class: 'drawer-ch-num' }, String(ch.number)),
            h('span', { class: 'drawer-ch-name' }, ch.name),
            h('span', { class: 'drawer-ch-meta' }, `${ch.gamesDone}/${ch.games} games`, caretCh),
            h('span', { class: 'bar', role: 'img', 'aria-label': `${pct}% complete` }, h('span', { class: 'bar-fill', style: `width:${pct}%` })),
          );
          // The game links are built the first time the chapter opens, so a closed menu stays light.
          const games = h('ul', { class: 'drawer-games', id: gamesId });
          let filled = false;
          const fill = () => {
            if (filled) return;
            filled = true;
            games.append(
              ...ch.list.map((g) => {
                const current = opts.active?.game === g.id;
                return h('li', null, h('a', { class: `drawer-game${current ? ' current' : ''}`, href: `#/game/${g.id}`, 'aria-current': current ? 'page' : false }, h('span', { class: `drawer-game-mark ${g.status}`, role: 'img', 'aria-label': STATUS_WORD[g.status] }, STATUS_MARK[g.status]), h('span', { class: 'drawer-game-title' }, g.title)));
              }),
              h('li', null, h('button', { class: 'drawer-see', type: 'button', onclick: () => goToChapter(c.subject, c.classLevel, ch.number) }, 'See this chapter’s page →')),
            );
          };
          const paintCh = () => {
            const open = opened.has(key) || (here && !closedActive.has(key));
            if (open) fill();
            games.hidden = !open;
            head.setAttribute('aria-expanded', String(open));
            caretCh.textContent = open ? '▾' : '▸';
          };
          head.addEventListener('click', () => {
            if (!games.hidden) {
              opened.delete(key);
              if (here) closedActive.add(key);
            } else {
              opened.add(key);
              closedActive.delete(key);
            }
            rememberOpened(opened);
            paintCh();
          });
          paintCh();
          return h('li', null, head, games);
        }),
    );
    const paintFold = () => {
      const closed = folded.has(id);
      list.hidden = closed;
      toggle.setAttribute('aria-expanded', String(!closed));
      caret.textContent = closed ? '▸' : '▾';
    };
    toggle.addEventListener('click', () => {
      if (folded.has(id)) folded.delete(id);
      else folded.add(id);
      rememberFolded(folded);
      paintFold();
    });
    paintFold();
    return h('section', { class: 'drawer-course' }, h('h2', null, toggle), list);
  });

  // ---- quick find: type a few letters, jump to a game from any page --------------------------------
  const results = h('ul', { class: 'drawer-results', 'aria-label': 'Matching games', hidden: true });
  const courses = h('div', { class: 'drawer-courses' }, ...courseBlocks);
  const find = h('input', { class: 'drawer-find', type: 'search', placeholder: 'Jump to a game…  ( / )', 'aria-label': 'Find a game', autocomplete: 'off' }) as HTMLInputElement;
  function showResults() {
    const q = find.value.trim();
    results.hidden = q === '';
    courses.hidden = q !== '';
    if (!q) return;
    const hits = searchEntries(opts.entries, q).slice(0, 12);
    results.replaceChildren(
      ...(hits.length
        ? hits.map((e) => h('li', null, h('a', { class: 'drawer-result', href: `#/game/${e.manifest.id}` }, h('strong', null, e.manifest.title), h('small', null, `${subjectLabel(e.manifest.subject)} · Ch ${e.manifest.chapter.number}: ${e.manifest.chapter.name}`))))
        : [h('li', { class: 'drawer-none' }, 'No games match that.')]),
    );
  }
  find.addEventListener('input', showResults);
  find.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && find.value) {
      e.stopPropagation();
      find.value = '';
      showResults();
    } else if (e.key === 'Enter') {
      const first = results.querySelector<HTMLAnchorElement>('a.drawer-result');
      if (first) {
        e.preventDefault();
        location.hash = first.getAttribute('href') ?? '#/';
        find.value = '';
        showResults();
        find.blur();
        if (overlay()) setState('closed', false);
      }
    }
  });

  const drawer = h(
    'aside',
    { class: 'drawer', id: 'drawer', 'aria-label': 'Menu' },
    h('div', { class: 'drawer-head' }, h('a', { class: 'brand', href: '#/' }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, '◆'), 'Concept Arcade'), closeBtn),
    h('div', { class: 'drawer-findrow' }, find),
    h(
      'nav',
      { class: 'drawer-nav', 'aria-label': 'Browse' },
      h('a', { class: 'drawer-link', href: '#/' }, 'All games'),
      lastEntry && opts.last ? h('a', { class: 'drawer-link resume', href: `#/game/${lastEntry.manifest.id}?level=${opts.last.level}` }, h('small', null, 'Continue'), h('span', null, lastEntry.manifest.title)) : null,
      results,
      courses,
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

  const focusables = () => [...drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')].filter((el) => !el.closest('[hidden]'));

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
    const t = (e.target as HTMLElement).closest('a[href^="#/"], .drawer-see');
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
  // "/" or Ctrl+K jumps to the quick find from anywhere, opening the menu if it is folded away.
  const onFind = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    const slash = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !typing;
    const ctrlK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
    if (!slash && !ctrlK) return;
    e.preventDefault();
    if (state === 'closed') setState('open', true);
    find.focus();
  };
  document.addEventListener('keydown', onFind);

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
    document.removeEventListener('keydown', onFind);
    mq?.removeEventListener?.('change', onResize);
    document.body.classList.remove('no-scroll');
  };

  paint();
  return shell;
}
