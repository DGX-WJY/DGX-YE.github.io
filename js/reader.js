(function () {
  'use strict';

  const progress = document.querySelector('[data-progress]');

  function updateProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const percent = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    progress.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  }

  document.querySelector('[data-copy-link]').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    try {
      await navigator.clipboard.writeText(window.location.href);
      button.textContent = '链接已复制';
    } catch (error) {
      console.error('[Article] Could not copy the article link.', error);
      button.textContent = '复制失败，请手动复制地址';
    }
  });
  document.querySelector('[data-print]').addEventListener('click', () => window.print());
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
})();
