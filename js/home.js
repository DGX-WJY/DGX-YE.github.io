(function () {
  'use strict';

  const target = document.querySelector('[data-home-articles]');
  const dateFormatter = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });

  function element(name, className, text) {
    const node = document.createElement(name);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  async function loadRecentArticles() {
    try {
      const response = await fetch('/data/articles.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const feed = await response.json();
      if (!feed || !Array.isArray(feed.articles)) throw new Error('Invalid article feed');

      target.replaceChildren();
      feed.articles
        .slice()
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
        .slice(0, 4)
        .forEach((article) => {
          const link = element('a', 'home-article');
          link.href = `/article.html?slug=${encodeURIComponent(article.slug)}`;
          const date = element('time');
          date.dateTime = article.date;
          date.textContent = dateFormatter.format(new Date(`${article.date}T00:00:00`)).replace(/\//g, '.');
          const copy = element('div');
          copy.append(element('h3', '', article.title), element('p', 'home-article-summary', article.summary));
          link.append(date, copy, element('span', 'home-article-category', article.category), element('span', 'home-article-arrow', '↗'));
          target.append(link);
        });
      if (!feed.articles.length) target.append(element('p', 'empty-state', '还没有发布文章，稍后再来看看。'));
    } catch (error) {
      console.error('[Home] Could not load recent articles.', error);
      if (!target.querySelector('.home-article')) {
        target.replaceChildren(element('p', 'empty-state', '文章列表暂时无法加载，请前往文章归档重试。'));
      }
    }
  }

  loadRecentArticles();
  window.setInterval(() => {
    if (document.visibilityState === 'visible') loadRecentArticles();
  }, 60_000);
})();
