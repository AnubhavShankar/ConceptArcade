import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadManifests } from '../scripts/lib/seo-plugin';
import { esc, gameFallback, gameSchema, headTags, homeFallback, homeInjection, homeSchema, jsonLd, render404, renderGamePage, renderRobots, renderSitemap, shellAssets, sortGames } from '../scripts/lib/seo';
import { gameDescription, gameMeta, gameTitle, gameUrl, homeDescription, homeMeta, homeTitle, homeUrl, SITE_URL, truncate } from '../src/core/seo';
import { manifest } from './fixtures';

const root = path.resolve(__dirname, '..');
const games = loadManifests(root);
const BUILT = `<!doctype html><html><head><script type="module" crossorigin src="./assets/index-ABC.js"></script><link rel="stylesheet" crossorigin href="./assets/index-XYZ.css"></head><body><div id="app"></div></body></html>`;
const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;

describe('the real games have search-friendly titles and descriptions', () => {
  it('finds every game folder', () => {
    expect(games.length).toBeGreaterThanOrEqual(9);
  });
  it('titles are at most 65 characters, unique, and carry the game name whole', () => {
    const titles = games.map(gameTitle);
    for (const [i, t] of titles.entries()) {
      expect(t.length).toBeLessThanOrEqual(65);
      expect(t).toContain(games[i].title);
    }
    expect(new Set(titles).size).toBe(games.length);
  });
  it('descriptions are between 60 and 158 characters and unique (a search snippet is about 155)', () => {
    const d = games.map(gameDescription);
    for (const text of d) {
      expect(text.length).toBeGreaterThanOrEqual(60);
      expect(text.length).toBeLessThanOrEqual(158);
    }
    expect(new Set(d).size).toBe(games.length);
  });
  it('the home page has its own title and description', () => {
    expect(homeTitle().length).toBeLessThanOrEqual(65);
    expect(homeDescription().length).toBeGreaterThanOrEqual(70);
    expect(homeDescription().length).toBeLessThanOrEqual(158);
    expect(games.map(gameTitle)).not.toContain(homeTitle());
  });
  it('every game names its class, subject and chapter somewhere a crawler can read it', () => {
    for (const m of games) {
      const page = gameFallback(m);
      expect(page).toContain(`Class ${m.classLevel}`);
      expect(page).toContain(m.chapter.name);
      expect(page).toContain(m.learningOutcome.slice(0, 40));
    }
  });
});

describe('text helpers', () => {
  it('truncate cuts at a word boundary with an ellipsis, and leaves short text alone', () => {
    expect(truncate('short', 20)).toBe('short');
    const t = truncate('the quick brown fox jumps over the lazy dog', 20);
    expect(t.length).toBeLessThanOrEqual(20);
    expect(t.endsWith('…')).toBe(true);
    expect(t).not.toMatch(/\s…$/);
  });
  it('a very long title falls back to a shorter form that keeps the name', () => {
    const m = manifest('long-one', { title: 'A Very Long Game Title That Goes On And On Forever' });
    expect(gameTitle(m).length).toBeLessThanOrEqual(65);
    expect(gameTitle(m)).toContain('A Very Long Game Title');
  });
  it('urls end with a slash and live on the site', () => {
    expect(homeUrl()).toBe(`${SITE_URL}/`);
    expect(gameUrl('abc')).toBe(`${SITE_URL}/game/abc/`);
    expect(SITE_URL.startsWith('https://')).toBe(true);
    expect(SITE_URL.endsWith('/')).toBe(false);
  });
  it('esc and jsonLd keep hostile text from breaking out of the page', () => {
    expect(esc(`<a href="x">'&`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
    expect(jsonLd({ name: '</script><script>alert(1)</script>' })).not.toContain('</script><script>');
  });
});

describe('head tags', () => {
  const head = headTags(gameMeta(games[0]), '../../');
  it('has exactly one title, description and canonical link', () => {
    expect(count(head, /<title>/g)).toBe(1);
    expect(count(head, /name="description"/g)).toBe(1);
    expect(count(head, /rel="canonical"/g)).toBe(1);
  });
  it('the canonical link is the absolute clean URL of the page', () => {
    expect(head).toContain(`<link rel="canonical" href="${gameUrl(games[0].id)}" />`);
  });
  it('has Open Graph and Twitter tags with an absolute image', () => {
    for (const p of ['og:title', 'og:description', 'og:url', 'og:image', 'og:type', 'og:site_name']) expect(head).toContain(`property="${p}"`);
    expect(head).toContain('name="twitter:card" content="summary_large_image"');
    expect(head).toContain(`content="${SITE_URL}/og-image.png"`);
    expect(head).toContain('og:image:alt');
  });
  it('is indexable by default, and the 404 page is not', () => {
    expect(head).toContain('index, follow');
    expect(headTags(homeMeta(), '', false)).toContain('noindex');
  });
  it('local assets use the prefix that reaches the site root', () => {
    expect(head).toContain('href="../../favicon.svg"');
    expect(head).toContain('href="../../manifest.webmanifest"');
    expect(headTags(homeMeta())).toContain('href="favicon.svg"');
  });
  it('escapes a title with quotes and angle brackets', () => {
    const m = manifest('weird', { title: 'Tom & "Jerry" <b>' });
    const h = headTags(gameMeta(m));
    expect(h).toContain('Tom &amp; &quot;Jerry&quot; &lt;b&gt;');
    expect(h).not.toContain('<b>');
  });
});

describe('structured data', () => {
  it('game data parses, teaches the concepts, and has a three-step breadcrumb', () => {
    const m = games[0];
    const data = JSON.parse(JSON.stringify(gameSchema(m)));
    const lr = data['@graph'][0];
    expect(lr['@type']).toBe('LearningResource');
    expect(lr.teaches).toEqual(m.concepts);
    expect(lr.educationalLevel).toBe(`Class ${m.classLevel}`);
    expect(lr.isAccessibleForFree).toBe(true);
    expect(lr.timeRequired).toMatch(/^PT\d+M$/);
    expect(lr.url).toBe(gameUrl(m.id));
    const crumbs = data['@graph'][1].itemListElement;
    expect(crumbs.map((c: { position: number }) => c.position)).toEqual([1, 2, 3]);
    expect(crumbs[2].item).toBe(gameUrl(m.id));
  });
  it('home data lists every game, in textbook order, with its page URL', () => {
    const list = JSON.parse(JSON.stringify(homeSchema(games)))['@graph'][1];
    expect(list.numberOfItems).toBe(games.length);
    expect(list.itemListElement.map((i: { url: string }) => i.url)).toEqual(sortGames(games).map((m) => gameUrl(m.id)));
  });
});

describe('prerendered game pages', () => {
  const m = games.find((g) => g.id === 'net-force-workshop') ?? games[0];
  const page = renderGamePage(m, BUILT);
  it('is a complete HTML document with one h1 holding the game name', () => {
    expect(page.startsWith('<!doctype html>')).toBe(true);
    expect(page).toContain('<html lang="en">');
    expect(count(page, /<h1>/g)).toBe(1);
    expect(page).toContain(`<h1>${esc(m.title)}</h1>`);
  });
  it('lists every level and every concept as plain text', () => {
    for (const l of m.levels) expect(page).toContain(esc(l.title));
    for (const c of m.concepts) expect(page).toContain(esc(c));
  });
  it('loads the app from two folders up, never from a path that would break', () => {
    expect(page).toContain('src="../../assets/index-ABC.js"');
    expect(page).toContain('href="../../assets/index-XYZ.css"');
    expect(page).not.toContain('"./assets/');
  });
  it('opens the game in the app by setting the route, without a redirect', () => {
    expect(page).toContain(`history.replaceState(null,'',location.pathname+location.search+'#/game/${m.id}')`);
    expect(page).not.toMatch(/http-equiv="refresh"/i);
    expect(page).toContain(`href="../../#/game/${m.id}"`);
  });
  it('has valid JSON-LD', () => {
    const body = page.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)![1];
    expect(() => JSON.parse(body)).not.toThrow();
  });
  it('a hostile title cannot inject markup into the page', () => {
    const evil = manifest('evil', { title: '<script>alert(1)</script>', summary: 'x'.repeat(70) });
    const html = renderGamePage(evil, BUILT);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
  it('shellAssets picks up scripts and styles and nothing else', () => {
    const tags = shellAssets(`${BUILT}<link rel="icon" href="./favicon.svg">`, '../../');
    expect(count(tags, /<script/g)).toBe(1);
    expect(count(tags, /<link/g)).toBe(1);
    expect(tags).not.toContain('favicon');
  });
});

describe('home page, sitemap, robots and 404', () => {
  it('the home fallback links to every game page with crawlable anchors', () => {
    const html = homeFallback(games);
    for (const g of games) expect(html).toContain(`href="game/${g.id}/"`);
    expect(count(html, /<h1>/g)).toBe(1);
  });
  it('the injected home head has the canonical link and JSON-LD', () => {
    const { head } = homeInjection(games);
    expect(head).toContain(`<link rel="canonical" href="${homeUrl()}" />`);
    expect(head).toContain('application/ld+json');
  });
  it('the sitemap lists the home page and every game once, with a lastmod date', () => {
    const xml = renderSitemap(games, '2026-10-27');
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((x) => x[1]);
    expect(locs).toEqual([homeUrl(), ...sortGames(games).map((m) => gameUrl(m.id))]);
    expect(new Set(locs).size).toBe(locs.length);
    expect(xml).toContain('<lastmod>2026-10-27</lastmod>');
    expect(xml.startsWith('<?xml')).toBe(true);
  });
  it('robots.txt allows crawling and points at the sitemap', () => {
    const r = renderRobots();
    expect(r).toContain('Allow: /');
    expect(r).not.toMatch(/Disallow: \/\s*$/m);
    expect(r).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });
  it('the 404 page is noindex and its assets are absolute, because it is served at any depth', () => {
    const html = render404(BUILT);
    expect(html).toContain('noindex');
    expect(html).toContain(`href="${SITE_URL}/assets/index-XYZ.css"`);
    expect(html).not.toContain('<script type="module"');
    expect(html).not.toContain('"./');
  });
});

describe('the source files that make it work', () => {
  it('index.html has the two markers the plugin fills, and no hard-coded title', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    expect(html).toContain('<!--seo-head-->');
    expect(html).toContain('<!--seo-fallback-->');
    expect(html).not.toMatch(/<title>/);
  });
  it('the web app manifest is valid and every icon it names exists', () => {
    const m = JSON.parse(fs.readFileSync(path.join(root, 'public/manifest.webmanifest'), 'utf8'));
    expect(m.name).toBeTruthy();
    expect(m.theme_color).toMatch(/^#/);
    for (const i of m.icons) expect(fs.existsSync(path.join(root, 'public', i.src))).toBe(true);
  });
  it('the share image and icons exist and are real PNGs of the right size', () => {
    const size = (f: string) => {
      const b = fs.readFileSync(path.join(root, 'public', f));
      expect(b.subarray(1, 4).toString()).toBe('PNG');
      return [b.readUInt32BE(16), b.readUInt32BE(20)];
    };
    expect(size('og-image.png')).toEqual([1200, 630]);
    expect(size('icon-192.png')).toEqual([192, 192]);
    expect(size('icon-512.png')).toEqual([512, 512]);
    expect(size('apple-touch-icon.png')).toEqual([180, 180]);
  });
});
