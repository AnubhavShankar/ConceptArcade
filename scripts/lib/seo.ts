// Build-time SEO: the head tags, structured data, prerendered fallback content, one HTML page per game, the sitemap
// and robots.txt. Everything here is pure (strings in, strings out) so it is unit-tested, and the Vite plugin only
// reads and writes files around it.
import { compareGames } from '../../src/core/browse';
import { subjectLabel } from '../../src/core/curriculum';
import type { GameManifest } from '../../src/core/manifest';
import { gameMeta, gamePath, gameUrl, homeMeta, homeUrl, SITE_NAME, SITE_URL, type PageMeta } from '../../src/core/seo';

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
/** JSON for a script tag: `<` is escaped so a title can never close the tag. */
export const jsonLd = (data: unknown) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

const OG_IMAGE = `${SITE_URL}/og-image.png`;
const OG_ALT = `${SITE_NAME}: interactive games that teach NCERT concepts`;

export const sortGames = (games: GameManifest[]) => [...games].sort(compareGames);

// ---- structured data -------------------------------------------------------------------------------

export function homeSchema(games: GameManifest[]) {
  const list = sortGames(games);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${homeUrl()}#website`, url: homeUrl(), name: SITE_NAME, description: homeMeta().description, inLanguage: 'en' },
      {
        '@type': 'ItemList',
        name: `${SITE_NAME} games`,
        numberOfItems: list.length,
        itemListElement: list.map((m, i) => ({ '@type': 'ListItem', position: i + 1, url: gameUrl(m.id), name: m.title })),
      },
    ],
  };
}

export function gameSchema(m: GameManifest) {
  const meta = gameMeta(m);
  const course = `${subjectLabel(m.subject)} Class ${m.classLevel}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LearningResource',
        '@id': `${meta.url}#game`,
        name: m.title,
        description: meta.description,
        url: meta.url,
        inLanguage: 'en',
        isAccessibleForFree: true,
        learningResourceType: 'interactive game',
        interactivityType: 'active',
        educationalLevel: `Class ${m.classLevel}`,
        teaches: m.concepts,
        about: { '@type': 'Thing', name: `${course}: ${m.chapter.name}` },
        timeRequired: `PT${m.estimatedMinutes}M`,
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: homeUrl() },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: homeUrl() },
          { '@type': 'ListItem', position: 2, name: `${course}, Chapter ${m.chapter.number}: ${m.chapter.name}` },
          { '@type': 'ListItem', position: 3, name: m.title, item: meta.url },
        ],
      },
    ],
  };
}

// ---- head ----------------------------------------------------------------------------------------------

/** Every tag a search engine or a link preview looks at. `prefix` reaches the site root from the page ('' or '../../'). */
export function headTags(meta: PageMeta, prefix = '', indexable = true): string {
  const t = [
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<meta name="color-scheme" content="light dark" />',
    '<meta name="theme-color" content="#4338ca" />',
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<meta name="robots" content="${indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow'}" />`,
    `<link rel="canonical" href="${esc(meta.url)}" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:type" content="${meta.type ?? 'website'}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${esc(meta.url)}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${esc(OG_ALT)}" />`,
    '<meta property="og:locale" content="en" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    `<link rel="icon" href="${prefix}favicon.svg" type="image/svg+xml" />`,
    `<link rel="apple-touch-icon" href="${prefix}apple-touch-icon.png" />`,
    `<link rel="manifest" href="${prefix}manifest.webmanifest" />`,
  ];
  return t.join('\n    ');
}

// ---- prerendered content (what a crawler, or a visitor without JavaScript, sees) ---------------------------------

/** The home page's fallback: a heading and plain links to every game page, which is how crawlers discover them. */
export function homeFallback(games: GameManifest[], prefix = ''): string {
  const items = sortGames(games)
    .map((m) => `<li><a href="${prefix}${gamePath(m.id)}">${esc(m.title)}</a>: ${esc(m.summary)}</li>`)
    .join('\n          ');
  return `<main class="page">
        <h1>${esc(SITE_NAME)}: learn NCERT concepts by playing</h1>
        <p class="muted">${esc(homeMeta().description)}</p>
        <h2>Games</h2>
        <ul>
          ${items}
        </ul>
        <noscript><p>These games need JavaScript. Please turn it on to play.</p></noscript>
      </main>`;
}

export function gameFallback(m: GameManifest, prefix = '../../'): string {
  const course = `${subjectLabel(m.subject)} Class ${m.classLevel}`;
  const levels = m.levels.map((l) => `<li><strong>${esc(l.title)}</strong>: ${esc(l.adds)}</li>`).join('\n          ');
  const concepts = m.concepts.map((c) => `<li>${esc(c)}</li>`).join('');
  return `<main class="page">
        <p><a class="back" href="${prefix}">← All games</a></p>
        <h1>${esc(m.title)}</h1>
        <p class="muted">${esc(course)}, Chapter ${m.chapter.number}: ${esc(m.chapter.name)} · ${esc(m.ncertRef)} · about ${m.estimatedMinutes} minutes</p>
        <p>${esc(m.summary)}</p>
        <h2>What you will learn</h2>
        <p>${esc(m.learningOutcome)}</p>
        <ul>${concepts}</ul>
        <h2>Levels</h2>
        <ol>
          ${levels}
        </ol>
        <p><a class="btn" href="${prefix}#/game/${m.id}">Play ${esc(m.title)}</a></p>
        <noscript><p>This game needs JavaScript. Please turn it on to play.</p></noscript>
      </main>`;
}

// ---- pages ---------------------------------------------------------------------------------------------------------

/** The built index.html's script and style tags, re-pointed so a page two folders down can load them. */
export function shellAssets(indexHtml: string, prefix: string): string {
  const tags = indexHtml.match(/<(?:script|link)\b[^>]*(?:src|href)="\.\/assets\/[^"]+"[^>]*>(?:<\/script>)?/g) ?? [];
  return tags.map((t) => t.replace(/\.\/assets\//g, `${prefix}assets/`)).join('\n    ');
}

/** One static page per game. The app boots on top of it and shows the game; crawlers read the content below. */
export function renderGamePage(m: GameManifest, indexHtml: string): string {
  const prefix = '../../';
  const meta = gameMeta(m);
  return `<!doctype html>
<html lang="en">
  <head>
    ${headTags(meta, prefix)}
    ${jsonLd(gameSchema(m))}
    <script>if(!location.hash)history.replaceState(null,'',location.pathname+location.search+'#/game/${m.id}');</script>
    ${shellAssets(indexHtml, prefix)}
  </head>
  <body>
    <div id="app">${gameFallback(m, prefix)}</div>
  </body>
</html>
`;
}

/** GitHub Pages serves this at any unknown address, so every URL in it is absolute. */
export function render404(indexHtml: string): string {
  const meta: PageMeta = { title: `Page not found | ${SITE_NAME}`, description: 'That page does not exist. Browse all Concept Arcade games from the home page.', url: homeUrl() };
  return `<!doctype html>
<html lang="en">
  <head>
    ${headTags(meta, `${SITE_URL}/`, false)}
    ${shellAssets(indexHtml, `${SITE_URL}/`).replace(/<script[^>]*><\/script>/g, '')}
  </head>
  <body>
    <main class="page">
      <h1>Page not found</h1>
      <p>That page does not exist. <a href="${SITE_URL}/">Browse all games</a>.</p>
    </main>
  </body>
</html>
`;
}

/** The home page's head tags, data and fallback, to drop into index.html. */
export function homeInjection(games: GameManifest[]): { head: string; fallback: string } {
  return { head: `${headTags(homeMeta())}\n    ${jsonLd(homeSchema(games))}`, fallback: homeFallback(games) };
}

export function renderSitemap(games: GameManifest[], today: string): string {
  const urls = [homeUrl(), ...sortGames(games).map((m) => gameUrl(m.id))];
  const body = urls.map((u) => `  <url><loc>${esc(u)}</loc><lastmod>${today}</lastmod></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export const renderRobots = () => `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
