/* =========================================
   SPA 路由系统 (SPA Router)
   - fetch 与遮罩同时启动 → 都完成后再注入 + 翻译 + 揭开遮罩
   - 揭开时浏览器已渲染好完整页面（requestAnimationFrame 保证绘制）
   - hash 路由支持浏览器前进后退
   ========================================= */

(function () {
    'use strict';

    const ROUTES = {
        home: 'view/home.html',
        about: 'view/about.html',
        articles: 'view/articles.html',
        tools: 'view/tools.html'
    };

    const viewCache = {};
    let currentPage = null;
    let isTransitioning = false;

    const $app = document.getElementById('app');
    const $overlay = document.getElementById('transitionOverlay');
    const $navLinks = document.querySelectorAll('.nav-link');

    if (!$app) { console.error('[Router] #app 未找到'); return; }

    /** overlay 淡入动画时长（需与 CSS 保持一致） */
    const OVERLAY_FADE_MS = 350;
    /** overlay 最短停留时间（从 showOverlay 算起） */
    const OVERLAY_MIN_HOLD_MS = 500;
    /** 翻译总超时时间（防止 API 卡死） */
    const TRANSLATE_TIMEOUT_MS = 6000;

    /** 等待 overlay 完全遮罩住屏幕 */
    function overlayFadeInPromise() {
        return new Promise(function (resolve) {
            setTimeout(resolve, OVERLAY_FADE_MS);
        });
    }

    /** 等待剩余时间（overlay 已显示了多少，补足到 OVERLAY_MIN_HOLD_MS） */
    function overlayRemainPromise(startTime) {
        const elapsed = Date.now() - startTime;
        const remain = Math.max(0, OVERLAY_MIN_HOLD_MS - elapsed);
        return new Promise(function (resolve) { setTimeout(resolve, remain); });
    }

    /** double requestAnimationFrame — 保证复杂布局已绘制 */
    function doubleRAF() {
        return new Promise(function (resolve) {
            requestAnimationFrame(function () {
                requestAnimationFrame(resolve);
            });
        });
    }

    /** 给 Promise 加超时保护 */
    function withTimeout(promise, ms, fallback) {
        return new Promise(function (resolve) {
            var timer = setTimeout(function () { resolve(fallback); }, ms);
            promise.then(
                function (v) { clearTimeout(timer); resolve(v); },
                function (e) { clearTimeout(timer); resolve(fallback); }
            );
        });
    }

    /** fetch 视图（含缓存） */
    function fetchView(pageName) {
        if (viewCache[pageName]) {
            return Promise.resolve(viewCache[pageName]);
        }
        return fetch(ROUTES[pageName])
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.text();
            })
            .then(function (html) {
                viewCache[pageName] = html;
                return html;
            })
            .catch(function (err) {
                console.error('[Router] 加载失败:', err);
                return '<section class="page error-page active">' +
                    '<div class="page-header">' +
                    '<h2>加载失败</h2><p>无法加载页面，请刷新重试</p>' +
                    '</div></section>';
            });
    }

    /** 导航入口 */
    function navigate(pageName) {
        if (!ROUTES.hasOwnProperty(pageName)) return;
        if (isTransitioning || pageName === currentPage) return;
        window.location.hash = pageName === 'home' ? '' : pageName;
    }

    /** 统一路由处理（hashchange 或初始加载触发） */
    function handleRoute(pageName, isInitial) {
        if (!ROUTES.hasOwnProperty(pageName)) return;
        if (!isInitial && (isTransitioning || pageName === currentPage)) return;

        isTransitioning = true;
        updateNavActive(pageName);

        if (isInitial) {
            // 首次加载：无转场，直接 fetch + 翻译 + 展示
            fetchView(pageName).then(function (html) {
                injectContent(html, pageName);
                return doubleRAF();
            }).then(function () {
                return withTimeout(ensurePageTranslated(pageName), TRANSLATE_TIMEOUT_MS);
            }).then(function () {
                bindNavButtons();
                finishTransitionSilent();
            });
            return;
        }

        // 非首次：遮罩 + fetch 并行
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const startTime = Date.now();
        showOverlay();

        // 同时启动：[遮罩完全盖住] + [拿到内容]
        Promise.all([
            overlayFadeInPromise(),
            fetchView(pageName)
        ]).then(function (results) {
            const html = results[1];

            // 注入 HTML
            injectContent(html, pageName);

            // 等浏览器把新 DOM 画出来（双 RAF 保证复杂布局也画完）
            return doubleRAF();
        }).then(function () {
            // 翻译（带超时保护）
            return withTimeout(ensurePageTranslated(pageName), TRANSLATE_TIMEOUT_MS);
        }).then(function () {
            // 保证遮罩至少停留 OVERLAY_MIN_HOLD_MS（从 showOverlay 算起）
            return overlayRemainPromise(startTime);
        }).then(function () {
            // 揭开遮罩 —— 此时内容已完整渲染 + 翻译完毕
            hideOverlay();
            bindNavButtons();
            isTransitioning = false;
        });
    }

    /**
     * 根据当前语言状态，确保整个 body（导航+页脚+新页面）都已翻译
     * 返回 Promise，resolve 时翻译（或跳过翻译）已完成
     */
    function ensurePageTranslated(pageName) {
        const lang = document.documentElement.getAttribute('data-lang') || 'zh';
        if (lang === 'en' && window.DynamicTranslator) {
            // 翻译整个 body，确保导航/页脚/新页面都覆盖
            return window.DynamicTranslator.translateAllIn(document.body);
        }
        return Promise.resolve();
    }

    function injectContent(html, pageName) {
        $app.innerHTML = html;
        currentPage = pageName;
        var ps = $app.querySelector('.page');
        if (ps && !ps.classList.contains('active')) ps.classList.add('active');
    }

    function finishTransitionSilent() {
        hideOverlay();
        isTransitioning = false;
    }

    function showOverlay() { if ($overlay) $overlay.classList.add('active'); }
    function hideOverlay() { if ($overlay) $overlay.classList.remove('active'); }

    function updateNavActive(pageName) {
        $navLinks.forEach(function (link) {
            if (link.getAttribute('data-page') === pageName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /** 绑定页面内 data-nav 按钮 */
    function bindNavButtons() {
        $app.querySelectorAll('[data-nav]').forEach(function (btn) {
            if (btn.dataset.navBound) return;
            btn.dataset.navBound = '1';
            btn.addEventListener('click', function () {
                var p = btn.getAttribute('data-nav');
                if (p) navigate(p);
            });
        });
    }

    function bindNavLinks() {
        $navLinks.forEach(function (link) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                var p = link.getAttribute('data-page');
                if (p) navigate(p);
            });
        });
    }

    function bindHashRoute() {
        window.addEventListener('hashchange', function () {
            var hash = (window.location.hash || '').replace('#/', '').replace('#', '');
            var p = hash || 'home';
            if (ROUTES.hasOwnProperty(p)) handleRoute(p);
        });
    }

    function init() {
        bindNavLinks();
        bindHashRoute();

        var hash = (window.location.hash || '').replace('#/', '').replace('#', '');
        var initial = ROUTES.hasOwnProperty(hash) ? hash : 'home';
        handleRoute(initial, true);

        console.log('[Router] 已初始化');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.SPARouter = {
        navigate: navigate,
        currentPage: function () { return currentPage; }
    };

})();