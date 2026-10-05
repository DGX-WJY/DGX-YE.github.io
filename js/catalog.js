(function () {
  'use strict';

  const type = document.body.dataset.page;
  const endpoint = type === 'games' ? '/data/games.json' : '/data/tools.json';
  const catalog = document.querySelector('[data-catalog]');
  const search = document.querySelector('[data-search]');
  const filter = document.querySelector('[data-filter]');
  const status = document.querySelector('[data-status]');
  let entries = [];

  function element(name, className, text) {
    const node = document.createElement(name);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    const selected = filter.value;
    const visible = entries.filter((entry) => {
      const matchesFilter = !selected || entry[filter.dataset.filter] === selected;
      return matchesFilter && [entry.title, entry.description, entry.category, entry.platform, ...entry.tags].join(' ').toLocaleLowerCase().includes(query);
    });
    catalog.replaceChildren();
    visible.forEach((entry, index) => {
      const card = element('article', 'catalog-card');
      const top = element('div', 'catalog-card-top');
      top.append(element('span', 'catalog-card-index', String(index + 1).padStart(2, '0')), element('span', '', type === 'games' ? entry.platform : entry.category));
      card.append(top, element('h2', '', entry.title), element('p', '', entry.description));
      const tags = element('div', 'tag-list');
      entry.tags.forEach((tag) => tags.append(element('span', 'tag', tag)));
      card.append(tags);
      if (entry.url) {
        const link = element('a', 'catalog-link', '查看作品 ↗');
        link.href = entry.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        card.append(link);
      } else if (type === 'tools') {
        const link = element('a', 'catalog-link', '打开工具 ↓');
        link.href = `#tool-${entry.slug}`;
        card.append(link);
      }
      catalog.append(card);
    });
    status.textContent = `${visible.length} / ${entries.length} ${type === 'games' ? '款游戏' : '项工具'}`;
    if (!visible.length) catalog.append(element('p', 'empty-state', entries.length ? '没有找到匹配项。' : '目录还没有内容。'));
  }

  search.addEventListener('input', render);
  filter.addEventListener('change', render);
  fetch(endpoint, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data)) throw new Error('目录格式无效');
      entries = data;
      const filterValues = [...new Set(entries.map((entry) => entry[filter.dataset.filter]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
      filterValues.forEach((value) => filter.add(new Option(value, value)));
      render();
    })
    .catch((error) => {
      console.error(`[Catalog] Could not load ${type} catalog.`, error);
      status.textContent = `目录加载失败：${error.message}`;
      catalog.replaceChildren(element('p', 'empty-state', '请检查网络连接或数据文件后重试。'));
    });
})();
