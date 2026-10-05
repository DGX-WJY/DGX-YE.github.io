(function () {
    'use strict';

    const FEED_URL = 'data/articles.json';
    const REFRESH_INTERVAL_MS = 60_000;
    const list = document.querySelector('[data-articles-list]');
    const status = document.querySelector('[data-articles-status]');
    const search = document.getElementById('article-search');
    const categoryFilter = document.getElementById('article-category');
    const dialog = document.getElementById('article-modal');
    const articlesBySlug = new Map();
    let articles = [];
    let updatedAt = '';
    let isLoading = false;

    function isValidArticle(article) {
        return article
            && typeof article.slug === 'string'
            && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)
            && typeof article.title === 'string'
            && typeof article.date === 'string'
            && !Number.isNaN(Date.parse(article.date))
            && typeof article.category === 'string'
            && typeof article.summary === 'string'
            && Array.isArray(article.tags)
            && article.tags.every((tag) => typeof tag === 'string')
            && Array.isArray(article.content)
            && article.content.every((paragraph) => typeof paragraph === 'string');
    }

    function setStatus(message, isError) {
        status.textContent = message;
        status.classList.toggle('is-error', isError);
    }

    function createTag(label) {
        const tag = document.createElement('span');
        tag.className = 'article-tag';
        tag.textContent = label;
        return tag;
    }

    function render() {
        const query = search.value.trim().toLocaleLowerCase();
        const category = categoryFilter.value;
        const visibleArticles = articles.filter((article) => {
            const matchesCategory = !category || article.category === category;
            const searchable = [article.title, article.summary, article.category, ...article.tags]
                .join(' ')
                .toLocaleLowerCase();
            return matchesCategory && searchable.includes(query);
        });

        list.replaceChildren();
        visibleArticles.forEach((article) => {
            const card = document.createElement('article');
            card.className = 'article-card';

            const button = document.createElement('button');
            button.className = 'article-card-button';
            button.type = 'button';
            button.dataset.articleSlug = article.slug;
            button.setAttribute('aria-label', `阅读：${article.title}`);

            const metadata = document.createElement('div');
            metadata.className = 'article-card-meta';

            const date = document.createElement('time');
            date.dateTime = article.date;
            date.textContent = article.date;

            const categoryLabel = document.createElement('span');
            categoryLabel.className = 'article-card-category';
            categoryLabel.textContent = article.category;
            metadata.append(date, categoryLabel);

            const title = document.createElement('h3');
            title.textContent = article.title;

            const summary = document.createElement('p');
            summary.className = 'article-card-summary';
            summary.textContent = article.summary;

            const tags = document.createElement('div');
            tags.className = 'article-card-tags';
            article.tags.forEach((tag) => tags.append(createTag(tag)));

            button.append(metadata, title, summary, tags);
            card.append(button);
            list.append(card);
        });

        if (!visibleArticles.length) {
            setStatus(articles.length ? '没有匹配的文章。' : '暂时还没有文章，更新 data/articles.json 即可发布。', false);
        } else {
            setStatus(`显示 ${visibleArticles.length} 篇文章 · 目录更新于 ${updatedAt || '未知'} · 每分钟检查更新`, false);
        }
    }

    function renderCategories() {
        const currentCategory = categoryFilter.value;
        const categories = [...new Set(articles.map((article) => article.category))]
            .sort((a, b) => a.localeCompare(b, 'zh-CN'));
        categoryFilter.replaceChildren(new Option('全部分类', ''));
        categories.forEach((category) => categoryFilter.add(new Option(category, category)));
        categoryFilter.value = categories.includes(currentCategory) ? currentCategory : '';
    }

    function openArticle(slug) {
        const article = articlesBySlug.get(slug);
        if (!article) return;

        dialog.querySelector('[data-article-category]').textContent = article.category;
        dialog.querySelector('[data-article-title]').textContent = article.title;

        const metadata = dialog.querySelector('[data-article-meta]');
        metadata.replaceChildren();
        const date = document.createElement('time');
        date.dateTime = article.date;
        date.textContent = article.date;
        metadata.append(date, ...article.tags.map(createTag));

        const body = dialog.querySelector('[data-article-body]');
        body.replaceChildren();
        article.content.forEach((paragraph) => {
            const text = document.createElement('p');
            text.textContent = paragraph;
            body.append(text);
        });

        dialog.showModal();
    }

    async function refreshArticles() {
        if (isLoading) return;
        isLoading = true;

        try {
            const response = await fetch(`${FEED_URL}?_=${Date.now()}`, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const feed = await response.json();
            if (!feed || !Array.isArray(feed.articles) || !feed.articles.every(isValidArticle)) {
                throw new Error('文章目录格式无效，请检查 data/articles.json');
            }

            const nextArticles = [...feed.articles].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
            const nextArticlesBySlug = new Map(nextArticles.map((article) => [article.slug, article]));
            if (nextArticlesBySlug.size !== nextArticles.length) {
                throw new Error('文章目录包含重复的 slug');
            }

            articles = nextArticles;
            articlesBySlug.clear();
            nextArticlesBySlug.forEach((article, slug) => articlesBySlug.set(slug, article));
            updatedAt = typeof feed.updatedAt === 'string' ? feed.updatedAt : '';
            renderCategories();
            render();
        } catch (error) {
            console.error('[Articles] 加载文章失败:', error);
            const lastUpdated = updatedAt ? `；当前显示的是上次成功同步的版本（${updatedAt}）` : '';
            setStatus(`文章同步失败：${error.message}${lastUpdated}`, true);
        } finally {
            isLoading = false;
        }
    }

    search.addEventListener('input', render);
    categoryFilter.addEventListener('change', render);
    list.addEventListener('click', (event) => {
        const button = event.target.closest('[data-article-slug]');
        if (button) openArticle(button.dataset.articleSlug);
    });

    refreshArticles();
    window.setInterval(() => {
        if (document.visibilityState === 'visible') refreshArticles();
    }, REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') refreshArticles();
    });
})();
