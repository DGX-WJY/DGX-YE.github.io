import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const feedPath = resolve(root, 'data/articles.json');
const feed = JSON.parse(await readFile(feedPath, 'utf8'));

if (!feed || !Array.isArray(feed.articles)) {
  throw new Error('data/articles.json must contain an articles array');
}

const seenSlugs = new Set();
for (const article of feed.articles) {
  if (!article || typeof article.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) {
    throw new Error(`Invalid article slug: ${article?.slug}`);
  }
  if (seenSlugs.has(article.slug)) throw new Error(`Duplicate article slug: ${article.slug}`);
  seenSlugs.add(article.slug);
  if (!article.title || !article.summary || !Array.isArray(article.content) || !Array.isArray(article.tags)) {
    throw new Error(`Article ${article.slug} is missing required content`);
  }
}

const articles = feed.articles.slice().sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
const siteUrl = 'https://www.yehack.com';
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[character]);
const escapeXml = (value) => escapeHtml(value);
const articlePath = (slug) => `/articles/${encodeURIComponent(slug)}/`;
const dateText = (date) => new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
const rfcDate = (date) => new Date(`${date}T00:00:00Z`).toUTCString();
const header = `<header class="site-header">
  <a class="brand" href="/" aria-label="Yehack 首页"><img src="/assets/brand/yehack.png" alt=""><span>YEHACK<small>PLAY · MAKE · WRITE</small></span></a>
  <nav class="primary-nav" id="primary-nav" aria-label="主导航"><a href="/" data-nav="home">首页</a><a href="/articles/" data-nav="articles" aria-current="page">文章</a><a href="/games/" data-nav="games">游戏</a><a href="/tools/" data-nav="tools">工具</a><a href="/about/" data-nav="about">关于</a></nav>
  <div class="header-actions"><button class="background-toggle" type="button" aria-label="更换背景插画" title="更换背景插画"><span aria-hidden="true">▧</span></button><button class="style-toggle" type="button" aria-label="切换页面风格" title="切换页面风格"><span aria-hidden="true">Aa</span></button><button class="theme-toggle" type="button" aria-label="切换浅色主题" title="切换明暗主题"><span aria-hidden="true">◐</span></button><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-nav">菜单</button></div>
</header>`;
const footer = `<footer class="site-footer wrap"><a class="footer-brand" href="/">YEHACK / JOURNAL</a><span>BUILD SLOWLY · SHARE OPENLY</span><div><a href="/feed.xml">RSS</a><a href="https://github.com/DGX-WJY/DGX-YE.github.io" rel="noopener noreferrer">GitHub ↗</a></div></footer>`;

const index = {
  updatedAt: feed.updatedAt || '',
  articles: articles.map(({ content, ...metadata }) => ({
    ...metadata,
    readingTimeMinutes: Math.max(1, Math.ceil(content.join(' ').trim().length / 400))
  }))
};
await writeFile(resolve(root, 'data/articles-index.json'), `${JSON.stringify(index, null, 2)}\n`);

const archivePath = resolve(root, 'articles/index.html');
const archiveHtml = await readFile(archivePath, 'utf8');
const archiveCards = articles.map((article) => {
  const date = dateText(article.date);
  const minutes = Math.max(1, Math.ceil(article.content.join(' ').trim().length / 400));
  const tags = article.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  return `      <article class="article-card"><a class="article-card-link" href="${articlePath(article.slug)}" aria-label="阅读文章：${escapeHtml(article.title)}">
        <div class="article-card-top"><span class="article-card-category">${escapeHtml(article.category)}</span><time datetime="${escapeHtml(article.date)}">${date}</time></div>
        <h2>${escapeHtml(article.title)}</h2><p class="article-card-summary">${escapeHtml(article.summary)}</p>
        <div class="article-card-bottom"><div class="tag-list">${tags}</div><span class="read-time">${minutes} 分钟</span></div>
      </a></article>`;
}).join('\n');
const marker = /<!-- ARTICLE_CARDS_START -->[\s\S]*?<!-- ARTICLE_CARDS_END -->/;
if (!marker.test(archiveHtml)) throw new Error('Article archive is missing its generated-card markers');
await writeFile(archivePath, archiveHtml.replace(marker, `<!-- ARTICLE_CARDS_START -->\n${archiveCards}\n      <!-- ARTICLE_CARDS_END -->`));

for (const [position, article] of articles.entries()) {
  const previous = articles[position + 1];
  const next = articles[position - 1];
  const canonical = `${siteUrl}${articlePath(article.slug)}`;
  const readMinutes = Math.max(1, Math.ceil(article.content.join(' ').length / 400));
  const tags = article.tags.map((tag) => `<span>#${escapeHtml(tag)}</span>`).join('');
  const paragraphs = article.content.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n      ');
  const neighbors = [
    previous && `<a class="neighbor-link neighbor-previous" href="${articlePath(previous.slug)}"><span>上一篇</span><strong>${escapeHtml(previous.title)}</strong></a>`,
    next && `<a class="neighbor-link neighbor-next" href="${articlePath(next.slug)}"><span>下一篇</span><strong>${escapeHtml(next.title)}</strong></a>`
  ].filter(Boolean).join('\n      ');
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.summary,
    datePublished: article.date,
    author: { '@type': 'Person', name: 'Yehack' },
    mainEntityOfPage: canonical
  };
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#10120f">
  <meta name="description" content="${escapeHtml(article.summary)}">
  <link rel="canonical" href="${canonical}"><link rel="icon" href="/assets/brand/yehack.png"><link rel="alternate" type="application/rss+xml" title="Yehack Journal" href="/feed.xml">
  <link rel="stylesheet" href="/css/site.css"><link rel="stylesheet" href="/css/article.css">
  <title>${escapeHtml(article.title)} — Yehack</title>
  <script type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, '\\u003c')}</script>
  <script src="/js/site.js" defer></script><script src="/js/reader.js" defer></script>
</head>
<body data-page="articles" class="reader-page">
  <div class="ambient-background" aria-hidden="true"></div><span class="style-announcement" aria-live="polite" data-style-announcement></span>
  <div class="reading-progress" data-progress></div><a class="skip-link" href="#main">跳到正文</a>
  ${header}
  <main id="main" class="reader-wrap">
    <a class="back-link" href="/articles/">← 返回文章归档</a>
    <article class="article-reader">
      <header><p class="eyebrow">${escapeHtml(article.category)}</p><h1>${escapeHtml(article.title)}</h1><p class="article-summary">${escapeHtml(article.summary)}</p>
        <div class="article-meta"><time datetime="${escapeHtml(article.date)}">${dateText(article.date)}</time><span>${readMinutes} 分钟阅读</span>${tags}</div>
      </header>
      <div class="article-reader-body">
      ${paragraphs}
      </div>
      <div class="article-end"><button type="button" data-copy-link>复制文章链接</button><button type="button" data-print>打印 / 保存 PDF</button></div>
    </article>
    <nav class="article-neighbors" aria-label="上一篇和下一篇">${neighbors}</nav>
    <section class="discussion-box"><p class="eyebrow">DISCUSSION</p><h2>想继续聊聊？</h2><p>欢迎到 GitHub Discussions 留下补充、问题或不同看法。</p><a class="text-link" href="https://github.com/DGX-WJY/DGX-YE.github.io/discussions" target="_blank" rel="noopener noreferrer">前往讨论区 <span aria-hidden="true">↗</span></a></section>
  </main>
  ${footer}
</body>
</html>
`;
  const outputPath = resolve(root, `articles/${article.slug}/index.html`);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html);
}

const feedItems = articles.map((article) => {
  const url = `${siteUrl}${articlePath(article.slug)}`;
  return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${rfcDate(article.date)}</pubDate>
      <description>${escapeXml(article.summary)}</description>
    </item>`;
}).join('\n');
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Yehack / Play · Make · Write</title>
    <link>${siteUrl}/articles/</link>
    <description>游戏、工具与构建记录。</description>
    <language>zh-CN</language>
    <lastBuildDate>${rfcDate(feed.updatedAt || articles[0]?.date || '2026-01-01')}</lastBuildDate>
${feedItems}
  </channel>
</rss>
`;
await writeFile(resolve(root, 'feed.xml'), rss);

const fixedPaths = ['/', '/articles/', '/games/', '/tools/', '/about/'];
const sitemapUrls = [
  ...fixedPaths.map((path) => `${siteUrl}${path}`),
  ...articles.map((article) => `${siteUrl}${articlePath(article.slug)}`)
].map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n');
await writeFile(resolve(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls}
</urlset>
`);

console.log(`Generated ${articles.length} static article pages, an archive index, RSS, and sitemap.`);
