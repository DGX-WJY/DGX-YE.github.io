(function () {
  'use strict';

  const page = document.body.dataset.page;
  const activeNav = page === 'article' ? 'articles' : page;
  const currentLink = document.querySelector(`[data-nav="${activeNav}"]`);
  if (currentLink) currentLink.setAttribute('aria-current', 'page');

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
  if (savedTheme === 'light') document.documentElement.dataset.theme = 'light';
  if (themeButton) {
    themeButton.setAttribute('aria-label', savedTheme === 'light' ? '切换深色主题' : '切换浅色主题');
    themeButton.addEventListener('click', () => {
      const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      if (nextTheme === 'light') document.documentElement.dataset.theme = 'light';
      else delete document.documentElement.dataset.theme;
      themeButton.setAttribute('aria-label', nextTheme === 'light' ? '切换深色主题' : '切换浅色主题');
      try {
        localStorage.setItem('yehack-theme', nextTheme);
      } catch (error) {
        console.warn('[Theme] Could not save the theme preference.', error);
      }
    });
  }
})();
