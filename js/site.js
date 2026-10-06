(function () {
  'use strict';

  const page = document.body.dataset.page;
  const activeNav = page === 'article' ? 'articles' : page;
  const currentLink = document.querySelector(`[data-nav="${activeNav}"]`);
  if (currentLink) currentLink.setAttribute('aria-current', 'page');

  const styles = [
    { id: 'default', label: '青柠夜色 · 无衬线' },
    { id: 'sakura', label: '樱花物语 · 柔和衬线' },
    { id: 'paper', label: '暖纸书房 · 复古衬线' },
    { id: 'arcade', label: '像素街机 · 等宽字体' },
    { id: 'ocean', label: '深海薄荷 · 海风衬线' }
  ];
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
  const cardStyles = [
    { id: 'default', label: '简约卡片' },
    { id: 'rounded', label: '柔和圆角' },
    { id: 'framed', label: '强调边框' }
  ];
  const root = document.documentElement;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const announcement = document.querySelector('[data-style-announcement]');
  const styleButton = document.querySelector('.style-toggle');
  const backgroundButton = document.querySelector('.background-toggle');
  const savedCardStyle = safeStorageGet('yehack-card-style');
  root.dataset.cardStyle = cardStyles.some((style) => style.id === savedCardStyle) ? savedCardStyle : 'default';

  function safeStorageGet(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.warn(`[Appearance] Could not read ${key} from session storage.`, error);
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      console.warn(`[Appearance] Could not save ${key} in session storage.`, error);
    }
  }

  const selectedStyle = (() => {
    try {
      return localStorage.getItem('yehack-style') || 'default';
    } catch (error) {
      console.warn('[Appearance] Could not read the saved style.', error);
      return 'default';
    }
  })();
  root.dataset.style = styles.some((style) => style.id === selectedStyle) ? selectedStyle : 'default';

  function applyStyleAnnouncement() {
    const style = styles.find((item) => item.id === root.dataset.style) || styles[0];
    if (styleButton) {
      styleButton.title = `当前：${style.label} · 点击切换`;
      styleButton.setAttribute('aria-label', `当前风格：${style.label}，点击切换风格`);
    }
    if (announcement) announcement.textContent = `已切换到${style.label}风格`;
    if (themeColor) themeColor.content = getComputedStyle(root).getPropertyValue('--bg').trim();
  }

  function changeStyle() {
    const currentIndex = styles.findIndex((style) => style.id === root.dataset.style);
    const next = styles[(currentIndex + 1) % styles.length];
    root.dataset.style = next.id;
    applyStyleAnnouncement();
    try {
      localStorage.setItem('yehack-style', next.id);
    } catch (error) {
      console.warn('[Appearance] Could not save the selected style.', error);
    }
  }

  function chooseBackground(forceNext) {
    const previous = safeStorageGet('yehack-background');
    let candidates = backgrounds.filter((image) => image !== previous);
    if (!candidates.length) candidates = backgrounds;
    const chosen = forceNext ? candidates[0] : candidates[Math.floor(Math.random() * candidates.length)];
    root.style.setProperty('--ambient-image', `url("/assets/backgrounds/${chosen}")`);
    safeStorageSet('yehack-background', chosen);
    if (backgroundButton) {
      const label = chosen.replace(/\.(svg|png|webp)$/i, '').replaceAll('-', ' ');
      const cardStyle = cardStyles.find((style) => style.id === root.dataset.cardStyle) || cardStyles[0];
      backgroundButton.title = `当前背景：${label}；卡片：${cardStyle.label} · 点击同时更换`;
      backgroundButton.setAttribute('aria-label', `当前背景：${label}，当前卡片样式：${cardStyle.label}，点击同时更换`);
    }
  }

  function changeCardStyle() {
    const currentIndex = cardStyles.findIndex((style) => style.id === root.dataset.cardStyle);
    const next = cardStyles[(currentIndex + 1) % cardStyles.length];
    root.dataset.cardStyle = next.id;
    safeStorageSet('yehack-card-style', next.id);
  }

  applyStyleAnnouncement();
  chooseBackground(false);
  if (styleButton) styleButton.addEventListener('click', changeStyle);
  if (backgroundButton) backgroundButton.addEventListener('click', () => {
    changeCardStyle();
    chooseBackground(true);
  });

  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('.primary-nav');
  if (menuButton && navigation) {
    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isOpen));
      navigation.classList.toggle('is-open', !isOpen);
    });
    navigation.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        menuButton.setAttribute('aria-expanded', 'false');
        navigation.classList.remove('is-open');
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        menuButton.setAttribute('aria-expanded', 'false');
        navigation.classList.remove('is-open');
        menuButton.focus();
      }
    });
  }

  const themeButton = document.querySelector('.theme-toggle');
  let savedTheme = '';
  try {
    savedTheme = localStorage.getItem('yehack-theme') || '';
  } catch (error) {
    console.warn('[Theme] Could not read the saved theme preference.', error);
  }
  if (savedTheme === 'light') root.dataset.theme = 'light';
  if (themeButton) {
    themeButton.setAttribute('aria-label', savedTheme === 'light' ? '切换深色主题' : '切换浅色主题');
    themeButton.addEventListener('click', () => {
      const nextTheme = root.dataset.theme === 'light' ? 'dark' : 'light';
      if (nextTheme === 'light') root.dataset.theme = 'light';
      else delete root.dataset.theme;
      if (themeColor) themeColor.content = getComputedStyle(root).getPropertyValue('--bg').trim();
      themeButton.setAttribute('aria-label', nextTheme === 'light' ? '切换深色主题' : '切换浅色主题');
      try {
        localStorage.setItem('yehack-theme', nextTheme);
      } catch (error) {
        console.warn('[Theme] Could not save the theme preference.', error);
      }
    });
  }
})();
