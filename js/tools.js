/* =========================================
   动态文本识别与翻译工具 (Dynamic Translator)
   - Unicode CJK 检测中文
   - html[data-lang] 驱动字体（zh-CN ↔ OBT）
   - MyMemory 免费 API 真实翻译
   - 原文存在 node._original，切回 zh 时直接恢复
   - translateAllIn(container) 返回 Promise，供路由等待
   ========================================= */

(function (global) {
    'use strict';

    const CJK_RANGES = [
        /[\u4e00-\u9fa5]/,
        /[\u3400-\u4dbf]/,
        /[\u20000-\u2a6df]/,
        /[\uf900-\ufaff]/,
        /[\u3000-\u303f]/,
        /[\uff00-\uffef]/
    ];

    function hasChinese(text) {
        if (!text || typeof text !== 'string') return false;
        for (const r of CJK_RANGES) if (r.test(text)) return true;
        return false;
    }

    function detectLanguage(text) {
        if (!text || typeof text !== 'string') return 'en';
        let cn = 0, total = 0;
        for (const c of text) {
            if (/\s/.test(c)) continue;
            total++;
            if (hasChinese(c)) cn++;
        }
        if (total === 0) return 'en';
        return (cn / total) > 0.1 ? 'zh' : 'en';
    }

    function getCurrentLang() {
        const lang = document.documentElement.getAttribute('data-lang') || 'zh';
        return lang.startsWith('zh') ? 'zh' : 'en';
    }

    /* ==================== 翻译 API ==================== */

    const _translateCache = new Map();

    // 请求节流：队列化，避免并发触发 429
    const _pendingRequests = [];
    let _activeRequests = 0;
    const MAX_CONCURRENT = 2;        // 并发降为 2，减少 API 压力
    const REQUEST_INTERVAL_MS = 150; // 每次请求间隔 150ms

    function enqueueRequest(fn) {
        _pendingRequests.push(fn);
        dequeueRequests();
    }

    function dequeueRequests() {
        if (_activeRequests >= MAX_CONCURRENT) return;
        if (_pendingRequests.length === 0) return;
        _activeRequests++;
        const fn = _pendingRequests.shift();
        fn().finally(function () {
            _activeRequests--;
            setTimeout(dequeueRequests, REQUEST_INTERVAL_MS);
        });
    }

    /** HTML 实体解码 */
    function decodeEntities(str) {
        const ta = document.createElement('textarea');
        ta.innerHTML = str;
        return ta.value;
    }

    /** 过滤 MyMemory 的警告/错误返回 */
    function sanitizeTranslation(raw, fallback) {
        if (!raw) return fallback;
        if (/MYMEMORY\s+WARNING/i.test(raw) || /YOU\s+HAVE\s+USED/i.test(raw)) {
            console.warn('[Translator] 配额用尽');
            return null; // 返回 null 表示需要重试/失败
        }
        if (/INVALID|ERROR|SERVER\s+ERROR/i.test(raw) && raw.length < 80) {
            console.warn('[Translator] API 异常:', raw);
            return null;
        }
        let decoded = raw.trim();
        try { decoded = decodeEntities(decoded); } catch (e) { /* ignore */ }
        return decoded || null;
    }

    /** 显示 toast 提示（轻量内联，不依赖外部库） */
    let _toastTimer = null;
    function showToast(msg) {
        let el = document.getElementById('translatorToast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'translatorToast';
            Object.assign(el.style, {
                position: 'fixed', bottom: '20px', right: '20px', zIndex: '9999',
                background: 'rgba(239, 68, 68, 0.95)', color: '#fff',
                padding: '10px 18px', borderRadius: '10px', fontSize: '14px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                transition: 'opacity 0.3s, transform 0.3s',
                opacity: '0', transform: 'translateY(10px)', pointerEvents: 'none'
            });
            document.body.appendChild(el);
        }
        el.textContent = msg;
        requestAnimationFrame(function () { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
        clearTimeout(_toastTimer);
        _toastTimer = setTimeout(function () {
            el.style.opacity = '0'; el.style.transform = 'translateY(10px)';
        }, 3000);
    }

    /** 连续失败计数 → 控制是否显示 toast */
    let _consecutiveFailures = 0;
    const MAX_FAILURES_BEFORE_TOAST = 5;
    let _toastShownThisCycle = false;

    /**
     * 翻译 API 端点列表（按优先级排列，失败自动切下一个）
     * Chrome 内置 Translator 排第一（零配额、本地运行、不走网络）
     */
    const API_ENDPOINTS = [
        {
            name: 'Chrome-Translator',
            native: true, // 标记为浏览器内置 API，不走 fetch
            supported: function () { return typeof Translator !== 'undefined'; },
            create: async function (from, to) {
                const src = from === 'zh' ? 'zh' : 'en';
                const tgt = to === 'zh' ? 'zh' : 'en';
                return await Translator.create({ sourceLanguage: src, targetLanguage: tgt });
            },
            translate: function (instance, text) {
                return instance.translate(text); // 返回 Promise<string>
            },
            close: function (instance) {
                if (instance && typeof instance.destroy === 'function') instance.destroy();
            }
        },
        {
            name: 'Google-GTX',
            native: false,
            build: function (text, from, to) {
                const sl = from === 'zh' ? 'zh-CN' : 'en';
                const tl = to === 'zh' ? 'zh-CN' : 'en';
                return {
                    url: 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' +
                        sl + '&tl=' + tl + '&dt=t&q=' + encodeURIComponent(text),
                    method: 'GET'
                };
            },
            parse: function (data) {
                // Google 返回数组结构：[[["translated text", null, null, null, null]], null, "auto", null, null]
                if (!data || !Array.isArray(data)) return null;
                const arr = data[0];
                if (!Array.isArray(arr)) return null;
                let out = '';
                for (let i = 0; i < arr.length; i++) {
                    if (Array.isArray(arr[i]) && typeof arr[i][0] === 'string') {
                        out += arr[i][0];
                    }
                }
                return out || null;
            },
            checkError: function (data, status) { return null; }
        },
        {
            name: 'MyMemory',
            native: false,
            build: function (text, from, to) {
                const langPair = (from === 'zh' ? 'zh-CN' : 'en') + '|' + (to === 'zh' ? 'zh-CN' : 'en');
                return {
                    url: 'https://api.mymemory.translated.net/get?q=' +
                        encodeURIComponent(text) + '&langpair=' + langPair,
                    method: 'GET'
                };
            },
            parse: function (data) {
                return data && data.responseData && data.responseData.translatedText;
            },
            checkError: function (data, status) {
                if (data && typeof data.responseDetails === 'string' &&
                    /YOU USED ALL|quota/i.test(data.responseDetails)) return 'QUOTA_EXHAUSTED';
                return null;
            }
        }
    ];

    /** 给 Promise 加超时保护，超时自动 reject */
    function withTimeout(promise, ms, label) {
        return Promise.race([
            promise,
            new Promise(function (_, reject) {
                setTimeout(function () { reject(new Error('Timeout (' + ms + 'ms)')); }, ms);
            })
        ]).catch(function (err) {
            console.warn('[Translator] ' + (label || '') + ' 超时/失败:', err.message);
            throw err;
        });
    }

    // Chrome Translator 实例缓存（避免每次都 create）
    const _translatorCache = new Map();
    const NATIVE_TRANSLATOR_TIMEOUT = 5000;  // Chrome 内置 API 超时 5s
    const FETCH_TIMEOUT = 8000;               // fetch API 超时 8s

    function getNativeTranslator(from, to) {
        const key = from + '|' + to;
        if (_translatorCache.has(key)) return Promise.resolve(_translatorCache.get(key));
        const ep = API_ENDPOINTS[0];
        return withTimeout(
            ep.create(from, to),
            NATIVE_TRANSLATOR_TIMEOUT,
            'Chrome-Translator.create'
        ).then(function (instance) {
            _translatorCache.set(key, instance);
            return instance;
        });
    }

    function translateText(text, from, to) {
        if (!text || !text.trim() || from === to) return Promise.resolve(text);

        const cacheKey = text + '|' + from + '->' + to;
        if (_translateCache.has(cacheKey)) return Promise.resolve(_translateCache.get(cacheKey));

        function tryEndpoint(idx) {
            if (idx >= API_ENDPOINTS.length) {
                _consecutiveFailures++;
                if (_consecutiveFailures >= MAX_FAILURES_BEFORE_TOAST && !_toastShownThisCycle) {
                    _toastShownThisCycle = true;
                    showToast('翻译服务暂时不可用，请稍后重试');
                }
                console.warn('[Translator] 所有 API 端点都失败，原文返回:', text.substring(0, 30));
                return Promise.resolve(text);
            }

            const ep = API_ENDPOINTS[idx];

            // 端点不支持 → 跳过
            if (ep.native && !ep.supported()) {
                return tryEndpoint(idx + 1);
            }

            let translatePromise;

            if (ep.native) {
                translatePromise = getNativeTranslator(from, to).then(function (instance) {
                    return withTimeout(
                        ep.translate(instance, text),
                        NATIVE_TRANSLATOR_TIMEOUT,
                        ep.name + '.translate'
                    );
                });
            } else {
                // fetch API
                const req = ep.build(text, from, to);
                translatePromise = withTimeout(
                    fetch(req.url, {
                        method: req.method || 'GET',
                        headers: req.headers,
                        body: req.body,
                        referrerPolicy: req.referrerPolicy || 'strict-origin-when-cross-origin'
                    }),
                    FETCH_TIMEOUT,
                    ep.name + '.fetch'
                ).then(function (res) {
                    if (res.status === 429 || res.status === 503) {
                        throw new Error('HTTP ' + res.status);
                    }
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.json();
                }).then(function (data) {
                    const err = ep.checkError(data, 200);
                    if (err) throw new Error(err);
                    const raw = ep.parse(data);
                    const t = sanitizeTranslation(raw, text);
                    if (t === null) throw new Error('Invalid result');
                    return t;
                });
            }

            return translatePromise.then(function (t) {
                _translateCache.set(cacheKey, t);
                _consecutiveFailures = 0;
                _toastShownThisCycle = false;
                console.log('[Translator] ✅', ep.name, '→', t.substring(0, 30));
                return t;
            }).catch(function (err) {
                console.warn('[Translator] ❌', ep.name, '失败:', err.message,
                    '→ 尝试下一个端点 (' + (idx + 1) + '/' + API_ENDPOINTS.length + ')');
                return tryEndpoint(idx + 1);
            });
        }

        return new Promise(function (resolve) {
            enqueueRequest(function () {
                return tryEndpoint(0).then(resolve);
            });
        });
    }


    /* ==================== DOM 文本收集 ==================== */

    /** 默认翻译整个 body（覆盖导航、页脚、app 内所有可见文本） */
    function getDefaultContainer() {
        return document.body;
    }

    function collectTextNodes(container) {
        if (!container) return [];
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
                if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;

                // 跳过显式标记为不翻译的元素（向上查 3 层）
                let p = parent;
                for (let i = 0; i < 3 && p; i++) {
                    if (p.dataset && p.dataset.noTranslate !== undefined) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    p = p.parentElement;
                }

                const tag = parent.tagName ? parent.tagName.toLowerCase() : '';
                // 跳过脚本/样式/输入/图标 SVG 内部等
                if (['script', 'style', 'noscript', 'code', 'pre', 'textarea', 'input',
                     'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
                     'filter', 'mask', 'clipPath', 'pattern', 'defs', 'radialGradient',
                     'linearGradient', 'stop', 'use'].includes(tag)) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        const nodes = [];
        let n;
        while ((n = walker.nextNode())) nodes.push(n);
        return nodes;
    }

    /* ==================== 核心：翻译容器 ==================== */

    /** 收集容器内所有 input/textarea 的 placeholder 为翻译 jobs */
    function collectPlaceholderJobs(container, fromLang, toLang) {
        const jobs = [];
        if (!container) return jobs;
        const inputs = container.querySelectorAll('input[placeholder], textarea[placeholder]');
        inputs.forEach(function (el) {
            if (el.dataset && el.dataset.noTranslate !== undefined) return;
            const ph = el.getAttribute('placeholder') || '';
            if (!ph.trim()) return;
            if (typeof el._originalPlaceholder === 'undefined') el._originalPlaceholder = ph;
            if (detectLanguage(ph) !== fromLang) return;
            jobs.push({ text: ph, from: fromLang, to: toLang, placeholderFor: el });
        });
        return jobs;
    }

    /** 恢复所有 placeholder 为原文 */
    function restorePlaceholders(container) {
        if (!container) return;
        container.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(function (el) {
            if (typeof el._originalPlaceholder !== 'undefined') {
                el.setAttribute('placeholder', el._originalPlaceholder);
            }
        });
    }

    /**
     * 翻译容器内所有中文文本（文本节点 + placeholder）为英文
     * 所有并发控制都在 translateText 的节流队列里做
     */
    function translateContainer(container) {
        // 收集文本节点 jobs
        const textJobs = [];
        const nodes = collectTextNodes(container);
        nodes.forEach(function (node) {
            const text = node.nodeValue || '';
            if (detectLanguage(text) !== 'zh') return;
            if (typeof node._original === 'undefined') node._original = text;
            textJobs.push({ text: text, from: 'zh', to: 'en', node: node });
        });

        // 收集 placeholder jobs
        const phJobs = collectPlaceholderJobs(container, 'zh', 'en');

        const allJobs = textJobs.concat(phJobs);
        console.log('[Translator] translateContainer: 文本节点 ' + textJobs.length + ' 个，placeholder ' + phJobs.length + ' 个');

        if (allJobs.length === 0) return Promise.resolve();

        // 所有 translateText 调用自动走节流队列
        return Promise.all(allJobs.map(function (job) {
            return translateText(job.text, job.from, job.to).then(function (translated) {
                if (job.node && job.node.nodeType === Node.TEXT_NODE) {
                    job.node.nodeValue = translated;
                } else if (job.placeholderFor) {
                    job.placeholderFor.setAttribute('placeholder', translated);
                }
            }).catch(function (err) {
                console.warn('[Translator] 单个翻译失败:', err.message);
            });
        }));
    }

    /** 恢复容器为中文原文 */
    function restoreContainer(container) {
        if (!container) return Promise.resolve();
        collectTextNodes(container).forEach(function (node) {
            if (typeof node._original !== 'undefined') node.nodeValue = node._original;
        });
        restorePlaceholders(container);
        console.log('[Translator] restoreContainer: 已恢复原文');
        return Promise.resolve();
    }

    /* ==================== 语言切换 API ==================== */

    function setLangLoading(on) {
        const btn = document.getElementById('langToggle');
        if (!btn) return;
        if (on) { btn.classList.add('loading'); btn.disabled = true; }
        else { btn.classList.remove('loading'); btn.disabled = false; }
    }

    function setPageLang(lang) {
        document.documentElement.setAttribute('data-lang', lang);
        document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');

        const label = document.querySelector('.lang-label');
        if (label) label.textContent = lang === 'zh' ? 'EN' : '中';

        try { localStorage.setItem('blog-lang', lang); } catch (e) { /* ignore */ }

        // 翻译整个 body（导航、页脚、app 全部）
        setLangLoading(true);
        if (lang === 'en') {
            translateContainer(getDefaultContainer()).finally(function () { setLangLoading(false); });
        } else {
            restoreContainer(getDefaultContainer()).finally(function () { setLangLoading(false); });
        }
    }

    function toggleLang() {
        const cur = getCurrentLang();
        setPageLang(cur === 'zh' ? 'en' : 'zh');
    }

    function initLang() {
        let saved = null;
        try { saved = localStorage.getItem('blog-lang'); } catch (e) { /* ignore */ }
        if (saved === 'zh') {
            setPageLang('zh');
        } else if (saved === 'en') {
            setPageLang('en');
        } else {
            // 默认中文（原文）
            document.documentElement.setAttribute('data-lang', 'zh');
            document.documentElement.setAttribute('lang', 'zh-CN');
        }
    }

    /* ==================== 公开 API ==================== */

    const DynamicTranslator = {
        hasChinese: hasChinese,
        detectLanguage: detectLanguage,
        getLang: getCurrentLang,
        setLang: setPageLang,
        toggleLang: toggleLang,

        init: function () {
            initLang();
            const btn = document.getElementById('langToggle');
            if (btn) btn.addEventListener('click', function () { toggleLang(); });
        },

        /**
         * 确保容器内的中文内容已翻译为英文
         * 返回 Promise — 路由层会等待这个 Promise 再揭开遮罩
         */
        translateAllIn: function (container) {
            const lang = getCurrentLang();
            if (lang === 'en') {
                setLangLoading(true);
                return translateContainer(container).finally(function () { setLangLoading(false); });
            }
            // zh 模式：恢复原文
            restoreContainer(container);
            return Promise.resolve();
        },

        /** 旧接口兼容 */
        refresh: function (container) {
            return this.translateAllIn(container);
        }
    };

    global.DynamicTranslator = DynamicTranslator;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', DynamicTranslator.init);
    } else {
        DynamicTranslator.init();
    }

})(window);