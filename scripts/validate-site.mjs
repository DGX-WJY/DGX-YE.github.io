import { readFile, access, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const articlesFeed = await readJson('data/articles.json');
const games = await readJson('data/games.json');
const tools = await readJson('data/tools.json');
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function validateSlugs(items, label) {
  const slugs = items.map((item) => item.slug);
  assert(new Set(slugs).size === slugs.length, `${label}: slug values must be unique`);
  slugs.forEach((slug) => assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug), `${label}: invalid slug "${slug}"`));
}

assert(articlesFeed && Array.isArray(articlesFeed.articles), 'data/articles.json must contain an articles array');
assert(typeof articlesFeed.updatedAt === 'string', 'data/articles.json must contain updatedAt');
validateSlugs(articlesFeed.articles, 'articles');
articlesFeed.articles.forEach((article) => {
  assert(typeof article.title === 'string' && article.title.length > 0, `article ${article.slug}: title is required`);
  assert(!Number.isNaN(Date.parse(article.date)), `article ${article.slug}: date must be valid`);
  assert(typeof article.category === 'string' && article.category.trim().length > 0, `article ${article.slug}: category is required`);
  assert(typeof article.summary === 'string', `article ${article.slug}: summary is required`);
  assert(Array.isArray(article.tags) && article.tags.every((tag) => typeof tag === 'string'), `article ${article.slug}: tags must be strings`);
  assert(Array.isArray(article.content) && article.content.every((paragraph) => typeof paragraph === 'string'), `article ${article.slug}: content must be paragraphs`);
});
assert(Array.isArray(games) && games.length > 0, 'data/games.json must contain game records');
games.forEach((game) => assert(/^https:\/\//.test(game.url), `game ${game.title}: an HTTPS product link is required`));
assert(Array.isArray(tools) && tools.length > 0, 'data/tools.json must contain tool records');

const rss = await readFile(resolve(root, 'feed.xml'), 'utf8');
const sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
const archive = await readFile(resolve(root, 'articles/index.html'), 'utf8');
const articleScript = await readFile(resolve(root, 'js/articles.js'), 'utf8');
const compactIndex = await readJson('data/articles-index.json');
assert(!/article\.content\.(?:join|map)\(/.test(articleScript), 'js/articles.js must not read article bodies from the compact archive index');
assert(archive.includes('src="/js/articles.js?v='), 'articles/index.html must version the article script URL to invalidate stale browser caches');
assert(compactIndex.articles.length === articlesFeed.articles.length, 'data/articles-index.json must be generated from every article');
assert(compactIndex.articles.every((article) => !('content' in article)), 'the archive index must not contain full article bodies');
for (const article of articlesFeed.articles) {
  const indexedArticle = compactIndex.articles.find((item) => item.slug === article.slug);
  const expectedReadingTime = Math.max(1, Math.ceil(article.content.join(' ').trim().length / 400));
  assert(indexedArticle, `data/articles-index.json is missing ${article.slug}`);
  if (indexedArticle) {
    assert(indexedArticle.category === article.category, `data/articles-index.json has a stale category for ${article.slug}`);
    assert(indexedArticle.readingTimeMinutes === expectedReadingTime, `data/articles-index.json has an invalid reading time for ${article.slug}; run node scripts/build-articles.mjs`);
  }
}
for (const article of articlesFeed.articles) {
  const articleUrl = `https://www.yehack.com/articles/${article.slug}/`;
  assert(rss.includes(`<guid>${articleUrl}</guid>`), `feed.xml is missing ${article.slug}`);
  assert(sitemap.includes(articleUrl), `sitemap.xml is missing ${article.slug}`);
  assert(archive.includes(`href="/articles/${article.slug}/"`), `articles/index.html is missing ${article.slug}`);
  try {
    await access(resolve(root, `articles/${article.slug}/index.html`));
  } catch {
    errors.push(`Missing generated article page: articles/${article.slug}/index.html; run node scripts/build-articles.mjs`);
  }
}

const htmlPaths = [];
const styleIds = ['default', 'sakura', 'paper', 'arcade', 'ocean'];
const backgrounds = [
  'night-train.webp',
  'Village-Galaxy.webp',
  'Earth-Temple.webp',
  'beautiful-1.webp',
  'beautiful-2.webp',
  'beautiful-3.webp',
  'beautiful-4.webp',
  'beautiful-5.webp',
  'beautiful-6.webp',
  'cyberpunk-1.webp'
];
async function collectHtml(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await collectHtml(path);
    else if (entry.name.endsWith('.html')) htmlPaths.push(path);
  }
}
await collectHtml(root);
for (const htmlPath of htmlPaths) {
  const html = await readFile(htmlPath, 'utf8');
  for (const [, rawPath] of html.matchAll(/(?:href|src)="(\/[^"#?]+)(?:[?#][^"]*)?"/g)) {
    const path = rawPath.endsWith('/') ? `${rawPath}index.html` : rawPath;
    try {
      await access(resolve(root, `.${path}`));
    } catch {
      errors.push(`${htmlPath.slice(root.length + 1)} references missing ${path}`);
    }
  }
  assert(!html.includes('js/index.js') && !html.includes('view/'), `${htmlPath.slice(root.length + 1)} still references the old SPA`);
  if (!htmlPath.endsWith('article.html')) {
    assert(html.includes('class="ambient-background"'), `${htmlPath.slice(root.length + 1)} is missing its illustration background`);
    assert(html.includes('class="style-toggle"'), `${htmlPath.slice(root.length + 1)} is missing the style switch`);
    assert(html.includes('class="background-toggle"'), `${htmlPath.slice(root.length + 1)} is missing the background switch`);
  }
}

const siteStyles = await readFile(resolve(root, 'css/site.css'), 'utf8');
styleIds.forEach((style) => assert(siteStyles.includes(`data-style="${style}"`), `css/site.css is missing the ${style} preset`));
for (const background of backgrounds) {
  try {
    await access(resolve(root, `assets/backgrounds/${background}`));
  } catch {
    errors.push(`Missing illustration asset: assets/backgrounds/${background}`);
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${htmlPaths.length} HTML pages, ${articlesFeed.articles.length} articles, ${games.length} game records, and ${tools.length} tools.`);
}
