(function () {
  'use strict';

  const PAGE_SIZE = 5;
  const list = document.querySelector('[data-article-list]');
  const status = document.querySelector('[data-status]');
  const search = document.querySelector('[data-search]');
  const category = document.querySelector('[data-category]');
  const topics = document.querySelector('[data-topics]');
  const pagination = document.querySelector('[data-pagination]');
  const dateFormatter = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  let articles = [];
  let activeTopic = '';
  let currentPage = 1;
  let updatedAt = '';

  function node(name, className, text) {
    const element = document.createElement(name);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function makeCard(article) {
    const card = node('article', 'article-card');
    const top = node('div', 'article-card-top');
    const date = node('time');
    date.dateTime = article.date;
    date.textContent = dateFormatter.format(new Date(`${article.date}T00:00:00`));
    top.append(node('span', 'article-card-category', article.category), date);
    const title = node('h2', '', article.title);
    const summary = node('p', 'article-card-summary', article.summary);
    const bottom = node('div', 'article-card-bottom');
    const tags = node('div', 'tag-list');
    article.tags.forEach((tag) => tags.append(node('span', 'tag', tag)));
    const readTime = Math.max(1, Math.ceil(article.content.join(' ').trim().length / 400));
    bottom.append(tags, node('span', 'read-time', `${readTime} 分钟`));
    const link = node('a', 'article-card-link');
    link.href = `/article.html?slug=${encodeURIComponent(article.slug)}`;
    link.setAttribute('aria-label', `阅读文章：${article.title}`);
    link.append(top, title, summary, bottom);
    card.append(link);
    return card;
  }

  function filteredArticles() {
    const query = search.value.trim().toLocaleLowerCase();
    return articles.filter((article) => {
      const matchesCategory = !category.value || article.category === category.value;
      const matchesTopic = !activeTopic || article.tags.includes(activeTopic);
      const searchable = [article.title, article.summary, article.category, ...article.tags]
        .join(' ')
        .toLocaleLowerCase();
      return matchesCategory && matchesTopic && searchable.includes(query);
    });
  }

  function renderPagination(pageCount) {
    pagination.replaceChildren();
    if (pageCount < 2) return;
    for (let page = 1; page <= pageCount; page += 1) {
      const button = node('button', '', String(page));
      button.type = 'button';
      button.setAttribute('aria-label', `第 ${page} 页`);
      if (page === currentPage) button.setAttribute('aria-current', 'page');
      button.addEventListener('click', () => {
        currentPage = page;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      pagination.append(button);
    }
  }

  function render() {
    const filtered = filteredArticles();
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, pageCount);
    const start = (currentPage - 1) * PAGE_SIZE;
    list.replaceChildren(...filtered.slice(start, start + PAGE_SIZE).map(makeCard));
    status.textContent = `${filtered.length} 篇文章${activeTopic ? ` · 标签：${activeTopic}` : ''} · 目录更新于 ${updatedAt || '未知'} · 每分钟同步`;
    if (!filtered.length) list.append(node('p', 'empty-state', articles.length ? '没有找到符合条件的文章。' : '文章目录还是空的。'));
    renderPagination(pageCount);
  }

  function renderTopics() {
    const counts = new Map();
    articles.forEach((article) => article.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)));
    topics.replaceChildren();
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))
      .slice(0, 8)
      .forEach(([label]) => {
        const button = node('button', 'topic-chip', `# ${label}`);
        button.type = 'button';
        button.setAttribute('aria-pressed', String(label === activeTopic));
        button.addEventListener('click', () => {
          activeTopic = activeTopic === label ? '' : label;
          currentPage = 1;
          renderTopics();
          render();
        });
        topics.append(button);
      });
  }

  search.addEventListener('input', () => { currentPage = 1; render(); });
  category.addEventListener('change', () => { currentPage = 1; render(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      search.focus();
    }
  });

  function loadFeed() {
    return fetch(`/data/articles.json?_=${Date.now()}`, { cache: 'no-store' })
      .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    });
  }

  function applyFeed(feed) {
    if (!feed || !Array.isArray(feed.articles)) throw new Error('文章目录格式无效');
    articles = feed.articles.slice().sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    updatedAt = typeof feed.updatedAt === 'string' ? feed.updatedAt : '未知';
    const selectedCategory = category.value;
    category.replaceChildren(new Option('所有分类', ''));
    [...new Set(articles.map((article) => article.category))]
      .sort((a, b) => a.localeCompare(b, 'zh-CN'))
      .forEach((name) => category.add(new Option(name, name)));
    category.value = articles.some((article) => article.category === selectedCategory) ? selectedCategory : '';
    renderTopics();
    render();
  }

  function syncArticles() {
    loadFeed()
      .then(applyFeed)
      .catch((error) => {
        console.error('[Articles] Could not synchronize the article index.', error);
        status.textContent = `文章同步失败：${error.message}${articles.length ? '；保留上次成功加载的文章' : ''}`;
        if (!articles.length) list.replaceChildren(node('p', 'empty-state', '请检查网络连接后刷新页面。'));
      });
  }

  syncArticles();
  window.setInterval(() => {
    if (document.visibilityState === 'visible') syncArticles();
  }, 60_000);
})();
