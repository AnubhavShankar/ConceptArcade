import { buildCourses, continueTarget, gameStatus, matchesFilter, numberGames, searchEntries, statsFor, type Course, type Filter, type GameStatus } from './browse';
import { subjectLabel, type Curriculum } from './curriculum';
import { wrapInShell } from './drawer';
import { h } from './dom';
import { topTier } from './manifest';
import { loadLast, loadStore, starString, summarise, type LastPlayed, type Store } from './progress';
import { catalog, curricula as defaultCurricula, type GameEntry } from './registry';

export interface HomeOptions {
  entries?: GameEntry[];
  curricula?: Curriculum[];
  store?: Store;
  last?: LastPlayed | null;
}

// What the student picked last time is remembered (subject, class, filter), so the home page opens where they were.
const VIEW_KEY = 'concept-arcade:home';
interface View {
  subject: string | null;
  classLevel: number | null;
  filter: Filter;
}
const FILTERS: [Filter, string][] = [
  ['all', 'All'],
  ['new', 'Not started'],
  ['progress', 'In progress'],
  ['done', 'Completed'],
];

function loadView(): View {
  try {
    const v = JSON.parse(localStorage.getItem(VIEW_KEY) ?? 'null');
    const filter = FILTERS.some(([f]) => f === v?.filter) ? (v.filter as Filter) : 'all';
    return { subject: typeof v?.subject === 'string' ? v.subject : null, classLevel: Number.isInteger(v?.classLevel) ? v.classLevel : null, filter };
  } catch {
    return { subject: null, classLevel: null, filter: 'all' };
  }
}
function saveView(v: View): void {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

const view: View = loadView();
let query = ''; // kept for the session so Back from a game returns to the same search
const openChapters = new Map<string, boolean>();

/** The menu drawer sends the student to a chapter: select its course, show every game, and open that chapter. */
export function showChapter(subject: string, classLevel: number, chapter: number): void {
  view.subject = subject;
  view.classLevel = classLevel;
  view.filter = 'all';
  query = '';
  openChapters.set(`${subject}|${classLevel}|${chapter}`, true);
  saveView(view);
}

/** Test hook: forget the remembered selection, search and open chapters. */
export function resetHomeState(): void {
  view.subject = null;
  view.classLevel = null;
  view.filter = 'all';
  query = '';
  openChapters.clear();
  try {
    localStorage.removeItem(VIEW_KEY);
  } catch {
    /* ignore */
  }
}

const STATUS_LABEL: Record<GameStatus, string> = { new: 'New', progress: 'In progress', done: 'Completed' };

export function renderHome(app: HTMLElement, opts: HomeOptions = {}): void {
  const entries = opts.entries ?? catalog;
  const store = opts.store ?? loadStore();
  const last = opts.last !== undefined ? opts.last : loadLast();
  const courses = buildCourses(entries, opts.curricula ?? defaultCurricula);
  const numbers = numberGames(entries);
  const subjects = [...new Set(courses.map((c) => c.subject))];
  const lastEntry = last ? entries.find((e) => e.manifest.id === last.id) : undefined;

  /** Keep the chosen subject and class valid as content changes (and default to where the student last played). */
  function resolveSelection(): Course<GameEntry> | undefined {
    if (!view.subject || !subjects.includes(view.subject)) view.subject = lastEntry?.manifest.subject ?? subjects[0] ?? null;
    const ofSubject = courses.filter((c) => c.subject === view.subject);
    if (view.classLevel === null || !ofSubject.some((c) => c.classLevel === view.classLevel)) {
      const preferred = lastEntry && lastEntry.manifest.subject === view.subject ? lastEntry.manifest.classLevel : undefined;
      view.classLevel = (ofSubject.some((c) => c.classLevel === preferred) ? preferred : ofSubject[0]?.classLevel) ?? null;
    }
    return ofSubject.find((c) => c.classLevel === view.classLevel);
  }

  // ---- pieces ---------------------------------------------------------------------------------
  function gameCard(entry: GameEntry, context = false): HTMLElement {
    const m = entry.manifest;
    const status = gameStatus(store, m);
    const done = summarise(store, m.id, m.levels.length);
    const num = numbers.get(m.id);
    const first = m.levels[0].tier;
    const top = topTier(m);
    return h(
      'a',
      { class: `card game-card status-${status}`, href: `#/game/${m.id}` },
      context ? h('span', { class: 'card-context' }, `${subjectLabel(m.subject)} · Class ${m.classLevel} · Ch ${m.chapter.number}: ${m.chapter.name}${num ? ` · Game ${num.n}` : ''}`) : null,
      h(
        'span',
        { class: 'card-top' },
        h(
          'span',
          { class: 'card-lead' },
          // The number is the game's place in its chapter, in textbook order. It never changes with filters or search.
          num ? h('span', { class: 'num', role: 'img', 'aria-label': `Game ${num.n} of ${num.of} in this chapter` }, String(num.n)) : null,
          h('span', { class: `badge ${top}` }, first === top ? first : `${first} → ${top}`),
        ),
        h('span', { class: `status ${status}` }, STATUS_LABEL[status]),
      ),
      h('strong', null, m.title),
      h('span', { class: 'muted' }, m.summary),
      h('span', { class: 'chips' }, ...m.concepts.map((c) => h('span', { class: 'chip' }, c))),
      h(
        'span',
        { class: 'card-foot' },
        h('span', { class: 'pips', role: 'img', 'aria-label': `${done.completed} of ${m.levels.length} levels done` }, ...m.levels.map((_, i) => h('span', { class: `pip${i < done.completed ? ' on' : ''}` }))),
        h('span', { class: 'muted' }, `${m.levels.length} level${m.levels.length === 1 ? '' : 's'} · ~${m.estimatedMinutes} min`),
        h('span', { class: 'stars', title: `${done.stars} of ${done.maxStars} stars` }, starString(done.maxStars ? Math.round((done.stars / done.maxStars) * 3) : 0)),
      ),
    );
  }

  function bar(done: number, total: number): HTMLElement {
    const pct = total ? Math.round((done / total) * 100) : 0;
    return h('span', { class: 'bar', role: 'img', 'aria-label': `${pct}% complete` }, h('span', { class: 'bar-fill', style: `width:${pct}%` }));
  }

  function continueCard(): HTMLElement {
    const next = continueTarget(store, last ?? null, entries);
    if (entries.length === 0) return h('div', { class: 'continue' }, h('strong', null, 'No games yet'), h('span', { class: 'muted' }, 'Games will appear here as they are added.'));
    if (!next) return h('div', { class: 'continue done' }, h('div', null, h('span', { class: 'eyebrow' }, 'All caught up'), h('strong', null, 'You have finished every game.'), h('span', { class: 'muted' }, 'More are on the way. Replay any level to improve your stars.')));
    const m = next.entry.manifest;
    const eyebrow = next.kind === 'continue' ? 'Continue where you left off' : next.kind === 'next' ? 'Up next' : 'Start here';
    return h(
      'div',
      { class: 'continue' },
      h('div', null, h('span', { class: 'eyebrow' }, eyebrow), h('strong', null, m.title), h('span', { class: 'muted' }, `Level ${next.level}: ${m.levels[next.level - 1].title}`)),
      h('a', { class: 'btn', href: `#/game/${m.id}?level=${next.level}` }, next.kind === 'continue' ? 'Continue' : 'Play'),
    );
  }

  function searchView(q: string): Node[] {
    const hits = searchEntries(entries, q);
    const count = h('p', { class: 'result-count', role: 'status', 'aria-live': 'polite' }, `${hits.length} game${hits.length === 1 ? '' : 's'} for “${q}”`);
    if (hits.length === 0) {
      return [
        count,
        h('div', { class: 'empty' }, h('p', null, 'No games match that search.'), h('p', { class: 'muted' }, 'Try a concept (“conservation”), a chapter, or a section number (“1.4”).'), h('button', { class: 'btn secondary', onclick: () => clearSearch() }, 'Clear search')),
      ];
    }
    return [count, h('div', { class: 'grid' }, ...hits.map((e) => gameCard(e, true)))];
  }

  function browseView(): Node[] {
    const course = resolveSelection();
    const nodes: Node[] = [continueCard()];

    // Subject tabs and the class selector appear only when there is more than one to choose from.
    if (subjects.length > 1) {
      nodes.push(
        h(
          'div',
          { class: 'tabs', role: 'group', 'aria-label': 'Subject' },
          ...subjects.map((s) => {
            const count = entries.filter((e) => e.manifest.subject === s).length;
            return h('button', { class: 'tab', 'aria-pressed': String(s === view.subject), onclick: () => select(s, null) }, subjectLabel(s), h('span', { class: 'tab-count' }, String(count)));
          }),
        ),
      );
    }
    const ofSubject = courses.filter((c) => c.subject === view.subject);
    if (ofSubject.length > 1) {
      nodes.push(
        h(
          'div',
          { class: 'seg', role: 'group', 'aria-label': 'Class' },
          ...ofSubject.map((c) => h('button', { class: 'seg-btn', 'aria-pressed': String(c.classLevel === view.classLevel), onclick: () => select(view.subject, c.classLevel) }, `Class ${c.classLevel}`)),
        ),
      );
    }
    if (!course) return nodes;

    const games = course.chapters.flatMap((c) => c.games);
    const stats = statsFor(store, games);
    nodes.push(
      h(
        'div',
        { class: 'course-head' },
        h('h2', null, `${subjectLabel(course.subject)} · Class ${course.classLevel}`),
        h('span', { class: 'muted' }, `${stats.games} game${stats.games === 1 ? '' : 's'} · ${stats.levelsDone} of ${stats.levelsTotal} levels · ${stats.stars} of ${stats.maxStars} ★`),
        bar(stats.levelsDone, stats.levelsTotal),
      ),
    );

    const counts = (f: Filter) => games.filter((g) => matchesFilter(gameStatus(store, g.manifest), f)).length;
    nodes.push(
      h(
        'div',
        { class: 'filters', role: 'group', 'aria-label': 'Show' },
        ...FILTERS.map(([f, text]) => h('button', { class: 'filter', 'aria-pressed': String(view.filter === f), onclick: () => setFilter(f) }, `${text} (${counts(f)})`)),
      ),
    );

    // Chapters with games are open or closed sections; chapters without games are tucked away as "coming soon".
    const withGames = course.chapters.filter((c) => c.games.length > 0);
    const firstUnfinished = withGames.find((c) => c.games.some((g) => gameStatus(store, g.manifest) !== 'done'));
    const defaultOpen = (c: (typeof withGames)[number]) => withGames.length <= 4 || c === firstUnfinished || c.games.some((g) => g.manifest.id === last?.id);
    const keyOf = (n: number) => `${course.subject}|${course.classLevel}|${n}`;

    if (withGames.length > 4) {
      const allOpen = withGames.every((c) => openChapters.get(keyOf(c.number)) ?? defaultOpen(c));
      nodes.push(
        h('div', { class: 'row end' }, h('button', { class: 'btn secondary small', onclick: () => {
          withGames.forEach((c) => openChapters.set(keyOf(c.number), !allOpen));
          paint();
        } }, allOpen ? 'Collapse all chapters' : 'Expand all chapters')),
      );
    }

    let shown = 0;
    for (const ch of withGames) {
      const visible = ch.games.filter((g) => matchesFilter(gameStatus(store, g.manifest), view.filter));
      if (visible.length === 0) continue;
      shown++;
      const key = keyOf(ch.number);
      const open = openChapters.get(key) ?? defaultOpen(ch);
      const cs = statsFor(store, ch.games);
      const panelId = `chapter-${course.subject}-${course.classLevel}-${ch.number}`;
      nodes.push(
        h(
          'section',
          { class: 'chapter', id: `chapter-sec-${course.subject}-${course.classLevel}-${ch.number}` },
          h(
            'button',
            { class: 'chapter-head', 'aria-expanded': String(open), 'aria-controls': panelId, onclick: () => {
              openChapters.set(key, !open);
              paint();
            } },
            h('span', { class: 'chapter-title' }, h('span', { class: 'muted' }, `Chapter ${ch.number}`), h('strong', null, ch.name)),
            h('span', { class: 'chapter-meta' }, bar(cs.levelsDone, cs.levelsTotal), h('span', { class: 'muted' }, `${cs.gamesDone}/${cs.games} games`)),
            h('span', { class: 'chevron', 'aria-hidden': 'true' }, open ? '▾' : '▸'),
          ),
          h('div', { class: 'grid', id: panelId, hidden: !open }, ...visible.map((g) => gameCard(g))),
        ),
      );
    }
    if (shown === 0 && withGames.length > 0) {
      nodes.push(h('div', { class: 'empty' }, h('p', null, 'No games match this filter.'), h('button', { class: 'btn secondary', onclick: () => setFilter('all') }, 'Show all games')));
    }

    const planned = course.chapters.filter((c) => c.games.length === 0);
    if (planned.length > 0 && view.filter === 'all') {
      nodes.push(
        h(
          'details',
          { class: 'coming' },
          h('summary', null, `${planned.length} more chapter${planned.length === 1 ? '' : 's'} coming soon`),
          h('ul', null, ...planned.map((c) => h('li', null, `Chapter ${c.number}: ${c.name}`))),
          h('p', { class: 'muted' }, 'Want to build one? See CONTRIBUTING.md in the repository.'),
        ),
      );
    }
    return nodes;
  }

  /** Three numbers that make progress feel real: games finished, levels cleared, stars earned. */
  function heroStats(): HTMLElement {
    const s = statsFor(store, entries);
    const stat = (value: string, name: string) => h('div', { class: 'stat' }, h('strong', null, value), h('span', null, name));
    return h('div', { class: 'hero-stats', role: 'group', 'aria-label': 'Your progress' }, stat(`${s.gamesDone}/${s.games}`, 'games finished'), stat(`${s.levelsDone}/${s.levelsTotal}`, 'levels cleared'), stat(`${s.stars} ★`, 'stars earned'));
  }

  // ---- state changes ---------------------------------------------------------------------------
  const body = h('div', { class: 'home-body' });
  function paint() {
    const q = query.trim();
    body.replaceChildren(...(q ? searchView(q) : browseView()));
  }
  function select(subject: string | null, classLevel: number | null) {
    view.subject = subject;
    view.classLevel = classLevel;
    saveView(view);
    paint();
  }
  function setFilter(f: Filter) {
    view.filter = f;
    saveView(view);
    paint();
  }
  function clearSearch() {
    query = '';
    search.value = '';
    paint();
    search.focus();
  }

  const search = h('input', {
    class: 'search',
    type: 'search',
    placeholder: 'Search games, concepts or chapters…',
    'aria-label': 'Search games, concepts or chapters',
    value: query,
    autocomplete: 'off',
    oninput: () => {
      query = search.value;
      paint();
    },
    onkeydown: (e) => {
      if ((e as KeyboardEvent).key === 'Escape') clearSearch();
    },
  });

  const page = h(
      'main',
      { class: 'page home' },
      h(
        'header',
        { class: 'home-hero' },
        h('h1', null, 'Learn it by playing it'),
        h('p', { class: 'muted hero-sub' }, 'Real puzzles built from your NCERT chapters. Every game has levels that build on each other, so you can start easy and finish sharp.'),
        heroStats(),
      ),
      h('div', { class: 'search-row' }, search),
      body,
      h('footer', { class: 'muted' }, 'Want to add a game? See CONTRIBUTING.md in the repository.'),
  );
  app.replaceChildren(wrapInShell(page, { entries, curricula: opts.curricula ?? defaultCurricula, store, last }));
  paint();
}
