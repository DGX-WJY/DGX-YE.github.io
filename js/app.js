(() => {
    'use strict';

    const routes = {
        home: 'view/home.html',
        articles: 'view/articles.html',
        about: 'view/about.html',
        tools: 'view/tools.html'
    };
    const app = document.querySelector('#app');
    const links = [...document.querySelectorAll('[data-view-link]')];
    const toast = document.querySelector('.toast');
    const cache = new Map();
    let toastTimer;

    function currentView() {
        const name = window.location.hash.slice(1);
        return routes[name] ? name : 'home';
    }

    async function loadView(name) {
        if (!routes[name]) name = 'home';
        const markup = cache.get(name) || await fetch(routes[name]).then((response) => {
            if (!response.ok) throw new Error(`无法加载 ${routes[name]}`);
            return response.text();
        });
        cache.set(name, markup);
        app.innerHTML = markup;
        document.title = name === 'home' ? 'Yehack / Notes on making' : `${name[0].toUpperCase()}${name.slice(1)} / Yehack`;
        links.forEach((link) => link.classList.toggle('is-active', link.dataset.view === name));
        bindViewActions();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function showError() {
        app.innerHTML = '<section class="view error-view"><p class="eyebrow">404 / VIEW MISSING</p><h1 class="display-title">页面暂时离线。</h1><p class="lead">请返回首页，或稍后再试。</p></section>';
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
    }

    function bindViewActions() {
        document.querySelectorAll('[data-copy]').forEach((button) => {
            button.addEventListener('click', async () => {
                await navigator.clipboard.writeText(button.dataset.copy);
                showToast('已复制到剪贴板');
            });
        });
        document.querySelectorAll('[data-tool]').forEach((card) => {
            const input = card.querySelector('[data-tool-input]');
            const output = card.querySelector('[data-tool-output]');
            card.querySelectorAll('[data-tool-action]').forEach((button) => button.addEventListener('click', () => {
                const action = button.dataset.toolAction;
                try {
                    if (action === 'format' || action === 'minify') {
                        const value = JSON.parse(input.value);
                        output.textContent = JSON.stringify(value, null, action === 'format' ? 2 : 0);
                    } else if (action === 'encode') {
                        output.textContent = btoa(unescape(encodeURIComponent(input.value)));
                    } else if (action === 'decode') {
                        output.textContent = decodeURIComponent(escape(atob(input.value)));
                    }
                    showToast('处理完成');
                } catch {
                    output.textContent = '输入格式不正确，请检查后重试。';
                }
            }));
        });
    }

    links.forEach((link) => link.addEventListener('click', (event) => {
        event.preventDefault();
        const name = link.dataset.view || 'home';
        if (currentView() === name) return;
        window.location.hash = name;
    }));

    window.addEventListener('hashchange', () => loadView(currentView()).catch(showError));
    loadView(currentView()).catch(showError);
})();
