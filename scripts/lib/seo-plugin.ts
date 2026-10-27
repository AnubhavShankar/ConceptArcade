// Vite plugin: fills in index.html's SEO tags (in dev and in the build) and, after the build, writes one prerendered
// page per game, sitemap.xml, robots.txt and 404.html next to it. The strings come from ./seo.ts, which is tested.
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { parseManifest, type GameManifest } from '../../src/core/manifest';
import { homeInjection, render404, renderGamePage, renderRobots, renderSitemap } from './seo';

export function loadManifests(root: string): GameManifest[] {
  const out: GameManifest[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'game.json') {
        const r = parseManifest(JSON.parse(fs.readFileSync(p, 'utf8')));
        if (r.ok) out.push(r.manifest);
      }
    }
  };
  walk(path.join(root, 'src', 'games'));
  return out;
}

export function seoPlugin(): Plugin {
  let root = process.cwd();
  let outDir = '';
  return {
    name: 'concept-arcade-seo',
    configResolved(config) {
      root = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
    },
    transformIndexHtml(html) {
      const { head, fallback } = homeInjection(loadManifests(root));
      return html.replace('<!--seo-head-->', head).replace('<!--seo-fallback-->', fallback);
    },
    closeBundle() {
      const indexPath = path.join(outDir, 'index.html');
      if (!outDir || !fs.existsSync(indexPath)) return; // not a real build (for example under the test runner)
      const indexHtml = fs.readFileSync(indexPath, 'utf8');
      const games = loadManifests(root);
      for (const m of games) {
        const dir = path.join(outDir, 'game', m.id);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.html'), renderGamePage(m, indexHtml));
      }
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), renderSitemap(games, new Date().toISOString().slice(0, 10)));
      fs.writeFileSync(path.join(outDir, 'robots.txt'), renderRobots());
      fs.writeFileSync(path.join(outDir, '404.html'), render404(indexHtml));
    },
  };
}
