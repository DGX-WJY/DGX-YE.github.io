(function () {
  'use strict';

  const articleRoot = document.querySelector('[data-article]');
  const neighbors = document.querySelector('[data-neighbors]');
  const progress = document.querySelector('[data-progress]');
  const slug = new URLSearchParams(window.location.search).get('slug');

  function element(name, className, text) {
    const node = document.createElement(name);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function setMeta(article) {
    document.title = `${article.title} — Yehack`;
    document.querySelector('meta[name="description"]').content = article.summary;
    const canonical = element('link');
    canonical.rel = 'canonical';
    canonical.href = `${window.location.origin}/article.html?slug=${encodeURIComponent(article.slug)}`;
    document.head.append(canonical);
  }

  function updateProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const percent = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    progress.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  }

  function renderNeighbors(sorted, index) {
    neighbors.replaceChildren();
    const previous = sorted[index + 1];
    const next = sorted[index - 1];
    [[previous, '上一篇', 'neighbor-previous'], [next, '下一篇', 'neighbor-next']].forEach(([article, label, className]) => {
      if (!article) return;
      const link = element('a', `neighbor-link ${className}`);
      link.href = `/article.html?slug=${encodeURIComponent(article.slug)}`;
      link.append(element('span', '', label), element('strong', '', article.title));
      neighbors.append(link);
    });
  }

  function appendJsonLd(article) {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: article.title,
      description: article.summary,
      datePublished: article.date,
      author: { '@type': 'Person', name: 'Yehack' },
      mainEntityOfPage: window.location.href
    };
    const script = element('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.append(script);
  }

  function renderArticle(article, sorted) {
    const index = sorted.findIndex((entry) => entry.slug === article.slug);
    setMeta(article);
    const header = element('header');
    header.append(element('p', 'eyebrow', article.category), element('h1', '', article.title), element('p', 'article-summary', article.summary));
    const metadata = element('div', 'article-meta');
    const date = element('time');
    date.dateTime = article.date;
    date.textContent = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(new Date(`${article.date}T00:00:00`));
    const readTime = Math.max(1, Math.ceil(article.content.join(' ').length / 400));
    metadata.append(date, element('span', '', `${readTime} 分钟阅读`), ...article.tags.map((tag) => element('span', '', `#${tag}`)));
    header.append(metadata);

    const body = element('div', 'article-reader-body');
    article.content.forEach((paragraph) => body.append(element('p', '', paragraph)));
    const end = element('div', 'article-end');
    const share = element('button', '', '复制文章链接');
    share.type = 'button';
    const print = element('button', '', '打印 / 保存 PDF');
    print.type = 'button';
    print.addEventListener('click', () => window.print());
    share.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        share.textContent = '链接已复制';
      } catch (error) {
        console.error('[Article] Could not copy the article link.', error);
        share.textContent = '复制失败，请手动复制地址';
      }
    });
    end.append(share, print);
    articleRoot.replaceChildren(header, body, end);
    renderNeighbors(sorted, index);
    appendJsonLd(article);
    updateProgress();
  }

  if (!slug) {
    articleRoot.className = 'invalid-article';
    articleRoot.replaceChildren(element('h1', '', '没有指定文章'), element('p', '', '请从文章归档选择一篇文章开始阅读。'));
  } else {
    fetch('/data/articles.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((feed) => {
        if (!feed || !Array.isArray(feed.articles)) throw new Error('文章目录格式无效');
        const sorted = feed.articles.slice().sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
        const article = sorted.find((entry) => entry.slug === slug);
        if (!article) {
          articleRoot.className = 'invalid-article';
          articleRoot.replaceChildren(
            element('h1', '', '没有找到这篇文章'),
            element('p', '', '文章可能已移动或删除。'),
            Object.assign(element('a', 'text-link', '返回文章归档 ↗'), { href: '/articles/' })
          );
          return;
        }
        renderArticle(article, sorted);
      })
      .catch((error) => {
        console.error('[Article] Could not load the requested article.', error);
        articleRoot.className = 'invalid-article';
        articleRoot.replaceChildren(element('h1', '', '文章加载失败'), element('p', '', error.message));
      });
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
})();
