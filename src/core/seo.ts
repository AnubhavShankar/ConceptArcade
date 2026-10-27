// Search and sharing metadata. The text-building functions are pure so the build (which prerenders one HTML page per
// game) and the running app produce exactly the same titles and descriptions.
import { subjectLabel } from './curriculum';
import type { GameManifest } from './manifest';

export const SITE_URL = 'https://anubhavshankar.github.io/ConceptArcade'; // no trailing slash; change if the site moves to its own domain
export const SITE_NAME = 'Concept Arcade';

/** Cut at a word boundary and add an ellipsis. */
export function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.replace(/\s+\S*$/, '') || cut}…`;
}

export const homeUrl = () => `${SITE_URL}/`;
export const gameUrl = (id: string) => `${SITE_URL}/game/${id}/`;
export const gamePath = (id: string) => `game/${id}/`;

export const homeTitle = () => `${SITE_NAME} – NCERT Class 12 Physics games and puzzles`;
export const homeDescription = () => 'Free interactive games that teach NCERT concepts by playing. Start with Class 12 Physics: electric charges, Coulomb’s law and fields. Works on phones.';

/** A title of at most 65 characters that keeps the game's own name whole. */
export function gameTitle(m: GameManifest): string {
  const course = `Class ${m.classLevel} ${subjectLabel(m.subject)}`;
  const candidates = [`${m.title} – ${course} game | ${SITE_NAME}`, `${m.title} – ${course} | ${SITE_NAME}`, `${m.title} | ${SITE_NAME}`, m.title];
  return candidates.find((c) => c.length <= 65) ?? truncate(m.title, 65);
}

/** A description of at most 158 characters: the game's summary, plus where it sits in the syllabus when there is room. */
export function gameDescription(m: GameManifest): string {
  const where = ` NCERT Class ${m.classLevel} ${subjectLabel(m.subject)}, Chapter ${m.chapter.number}.`;
  const full = `${m.summary.trim()}${where}`;
  return full.length <= 158 ? full : truncate(m.summary, 158);
}

export interface PageMeta {
  title: string;
  description: string;
  url: string;
  type?: 'website' | 'article';
}
export const homeMeta = (): PageMeta => ({ title: homeTitle(), description: homeDescription(), url: homeUrl(), type: 'website' });
export const gameMeta = (m: GameManifest): PageMeta => ({ title: gameTitle(m), description: gameDescription(m), url: gameUrl(m.id), type: 'article' });

/** Keep the tab title, description, canonical link and social tags in step with the page being shown. */
export function applyMeta(meta: PageMeta): void {
  document.title = meta.title;
  const set = (selector: string, make: () => HTMLElement, attr: string, value: string) => {
    let el = document.head.querySelector<HTMLElement>(selector);
    if (!el) {
      el = make();
      document.head.append(el);
    }
    el.setAttribute(attr, value);
  };
  const metaTag = (key: 'name' | 'property', name: string) => () => {
    const el = document.createElement('meta');
    el.setAttribute(key, name);
    return el;
  };
  set('meta[name="description"]', metaTag('name', 'description'), 'content', meta.description);
  set('meta[property="og:title"]', metaTag('property', 'og:title'), 'content', meta.title);
  set('meta[property="og:description"]', metaTag('property', 'og:description'), 'content', meta.description);
  set('meta[property="og:url"]', metaTag('property', 'og:url'), 'content', meta.url);
  set('meta[property="og:type"]', metaTag('property', 'og:type'), 'content', meta.type ?? 'website');
  set('meta[name="twitter:title"]', metaTag('name', 'twitter:title'), 'content', meta.title);
  set('meta[name="twitter:description"]', metaTag('name', 'twitter:description'), 'content', meta.description);
  set('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), 'href', meta.url);
}
