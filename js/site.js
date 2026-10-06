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
  let backgroundRequest = 0;
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
    let chosen;
    if (forceNext) {
      let deck = [];
      try {
        const savedDeck = JSON.parse(safeStorageGet('yehack-background-deck') || '[]');
        if (Array.isArray(savedDeck)) deck = savedDeck.filter((image) => backgrounds.includes(image) && image !== previous);
      } catch (error) {
        console.warn('[Appearance] Could not read the background rotation deck.', error);
      }
      if (!deck.length) {
        deck = backgrounds.filter((image) => image !== previous);
        for (let index = deck.length - 1; index > 0; index -= 1) {
          const swapIndex = Math.floor(Math.random() * (index + 1));
          [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
        }
      }
      chosen = deck.shift();
      safeStorageSet('yehack-background-deck', JSON.stringify(deck));
    } else {
      const candidates = backgrounds.filter((image) => image !== previous);
      chosen = candidates[Math.floor(Math.random() * candidates.length)];
    }
    const request = ++backgroundRequest;
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (request !== backgroundRequest) return;
      root.style.setProperty('--ambient-image', `url("/assets/backgrounds/${chosen}")`);
      safeStorageSet('yehack-background', chosen);
      if (backgroundButton) {
        const label = chosen.replace(/\.(svg|png|webp)$/i, '').replaceAll('-', ' ');
        const cardStyle = cardStyles.find((style) => style.id === root.dataset.cardStyle) || cardStyles[0];
        backgroundButton.title = `当前背景：${label}；卡片：${cardStyle.label} · 点击同时更换`;
        backgroundButton.setAttribute('aria-label', `当前背景：${label}，当前卡片样式：${cardStyle.label}，点击同时更换`);
      }
    };
    image.onerror = () => console.error(`[Appearance] Could not load background image: ${chosen}`);
    image.src = `/assets/backgrounds/${chosen}`;
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

  const pet = document.querySelector('[data-pixel-pet]');
  if (pet) {
    const petSessionKey = 'yehack-pixel-pet-session';
    const petMemoryKey = 'yehack-pixel-pet-memory';
    let savedState = {};
    let petMemory = { phase: 'doubling', explosions: 0, meowLength: 1, fontSize: 2, cooldownUntil: 0 };
    try {
      savedState = JSON.parse(sessionStorage.getItem(petSessionKey) || '{}');
      const storedMemory = JSON.parse(localStorage.getItem(petMemoryKey) || '{}');
      if (storedMemory && typeof storedMemory === 'object') petMemory = { ...petMemory, ...storedMemory };
    } catch (error) {
      console.warn('[Pixel pet] Could not restore pet state.', error);
      savedState = {};
      petMemory = { phase: 'doubling', explosions: 0, meowLength: 1, fontSize: 2, cooldownUntil: 0 };
    }
    if (!savedState || typeof savedState !== 'object') savedState = {};
    if (!['doubling', 'sizing', 'cooldown'].includes(petMemory.phase)) {
      petMemory.phase = petMemory.meowLength > 128 ? 'sizing' : 'doubling';
    }
    if (!Number.isSafeInteger(petMemory.explosions) || petMemory.explosions < 0) petMemory.explosions = 0;
    if (!Number.isSafeInteger(petMemory.meowLength) || petMemory.meowLength < 1) petMemory.meowLength = 1;
    petMemory.meowLength = Math.min(petMemory.meowLength, 128);
    if (!Number.isFinite(petMemory.fontSize)) petMemory.fontSize = 2;
    petMemory.fontSize = Math.min(64, Math.max(2, petMemory.fontSize));
    if (!Number.isFinite(petMemory.cooldownUntil)) petMemory.cooldownUntil = 0;
    if (petMemory.phase === 'cooldown' && petMemory.cooldownUntil <= Date.now()) {
      petMemory = { phase: 'doubling', explosions: 0, meowLength: 1, fontSize: 2, cooldownUntil: 0 };
    } else if (petMemory.phase === 'sizing' || petMemory.phase === 'cooldown') {
      petMemory.fontSize = Math.max(2, petMemory.fontSize);
    }

    const counter = document.createElement('span');
    counter.className = 'pixel-pet-counter';
    counter.setAttribute('aria-hidden', 'true');
    counter.textContent = String(Number.isSafeInteger(savedState.collisionCount) && savedState.collisionCount > 0
      ? savedState.collisionCount : 0);
    const meowBubble = document.createElement('span');
    meowBubble.className = 'pixel-pet-meow';
    meowBubble.setAttribute('aria-hidden', 'true');
    const meowTrack = document.createElement('span');
    meowTrack.className = 'pixel-pet-meow-track';
    const meowText = document.createElement('span');
    meowText.className = 'pixel-pet-meow-text';
    const meowTextRepeat = document.createElement('span');
    meowTextRepeat.className = 'pixel-pet-meow-text';
    meowTextRepeat.setAttribute('aria-hidden', 'true');
    meowTrack.append(meowText, meowTextRepeat);
    meowBubble.append(meowTrack);
    const explosionImage = document.createElement('img');
    explosionImage.className = 'pixel-pet-explosion-image';
    explosionImage.src = 'https://s1.aigei.com/src/img/gif/28/284fb21615a447ebadbd831b290e419b.gif?e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:NKrhO6nMHfI9wfAYt2vB0VPZH-I=';
    explosionImage.alt = '';
    explosionImage.setAttribute('aria-hidden', 'true');
    explosionImage.referrerPolicy = 'no-referrer';
    explosionImage.addEventListener('error', () => {
      console.warn('[Pixel pet] Could not load the explosion effect image.');
    });
    pet.append(meowBubble);
    pet.append(explosionImage);
    pet.append(counter);
    pet.setAttribute('aria-label', `像素小宠物；鼠标碰撞 ${counter.textContent} 次；点击让它弹飞`);

    const impact = document.createElement('span');
    impact.className = 'pixel-pet-impact';
    impact.setAttribute('aria-hidden', 'true');
    document.body.append(impact);

    const petBounds = pet.getBoundingClientRect();
    let petWidth = petBounds.width;
    let petHeight = petBounds.height;
    const maxX = Math.max(0, window.innerWidth - petWidth);
    const maxY = Math.max(0, window.innerHeight - petHeight);
    const state = {
      x: Number.isFinite(savedState.x) ? Math.min(maxX, Math.max(0, savedState.x)) : 12,
      y: Number.isFinite(savedState.y) ? Math.min(maxY, Math.max(0, savedState.y))
        : (window.innerWidth <= 700 ? 108 : 34),
      vx: Number.isFinite(savedState.vx) ? savedState.vx : 1.4,
      vy: Number.isFinite(savedState.vy) ? savedState.vy : 0,
      lastFrame: 0,
      grounded: Boolean(savedState.grounded),
      cornerAnchor: ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(savedState.cornerAnchor)
        ? savedState.cornerAnchor : null,
    };
    let pointer = null;
    let pointerCollisionArmed = true;
    let collisionCount = Number(counter.textContent);
    let squeezeCount = Number.isSafeInteger(savedState.squeezeCount) && savedState.squeezeCount > 0
      ? savedState.squeezeCount : 0;
    let edgeSince = Number.isFinite(savedState.edgeSince) ? savedState.edgeSince : null;
    let meowUntil = Number.isFinite(savedState.meowUntil) ? savedState.meowUntil : 0;
    let explosionUntil = Number.isFinite(savedState.explosionUntil) ? savedState.explosionUntil : 0;
    let isExploding = explosionUntil > Date.now();
    let lastEdgeImpact = 0;
    let lastFlickerTarget = null;
    let flickerTimer = 0;
    let impactTimer = 0;
    let milestoneTimer = 0;
    let meowTimer = 0;
    let framePending = false;

    function scheduleFrame() {
      if (framePending) return;
      framePending = true;
      requestAnimationFrame((now) => {
        framePending = false;
        frame(now);
      });
    }

    function persistPetState() {
      try {
        sessionStorage.setItem(petSessionKey, JSON.stringify({
          x: state.x,
          y: state.y,
          vx: state.vx,
          vy: state.vy,
          grounded: state.grounded,
          cornerAnchor: state.cornerAnchor,
          collisionCount,
          squeezeCount,
          edgeSince,
          meowUntil,
          explosionUntil,
        }));
      } catch (error) {
        console.warn('[Pixel pet] Could not save pet session state.', error);
      }
    }

    function renderMeow() {
      const text = petMemory.phase === 'doubling'
        ? '喵'.repeat(petMemory.meowLength) : '魂归来兮';
      meowText.textContent = text;
      meowTextRepeat.textContent = text;
      const fontSize = petMemory.phase === 'sizing' || petMemory.phase === 'cooldown'
        ? petMemory.fontSize : 14;
      meowBubble.style.setProperty('--meow-font-size', `${fontSize}px`);
      meowBubble.classList.toggle('is-overflowing', meowBubble.scrollWidth > meowBubble.clientWidth);
      meowBubble.classList.remove('is-visible');
      void meowBubble.offsetWidth;
      meowBubble.classList.add('is-visible');
      window.clearTimeout(meowTimer);
      const remaining = Math.max(0, meowUntil - Date.now());
      meowTimer = window.setTimeout(() => meowBubble.classList.remove('is-visible'), remaining);
    }

    function finishExplosion() {
      state.x = Math.max(0, (window.innerWidth - petWidth) / 2);
      state.y = Math.max(0, (window.innerHeight - petHeight) / 2);
      state.vx = Math.random() < .5 ? -2.4 : 2.4;
      state.vy = -5.5;
      state.grounded = false;
      state.cornerAnchor = null;
      explosionUntil = 0;
      pet.classList.remove('is-exploding');
      explosionImage.style.opacity = '';
      explosionImage.style.transform = '';
      pet.classList.add('is-respawning');
      isExploding = false;
      persistPetState();
      window.setTimeout(() => pet.classList.remove('is-respawning'), 460);
    }

    if (meowUntil > Date.now()) renderMeow();
    if (isExploding) {
      pet.classList.add('is-exploding');
      explosionImage.style.opacity = '1';
      explosionImage.style.transform = 'translate(-50%, -50%) scale(1)';
      window.setTimeout(finishExplosion, explosionUntil - Date.now());
    }

    function flashTextNearPointer() {
      if (!pointer) return;
      const selector = 'p,h1,h2,h3,h4,a,button,label,li,span,strong,time';
      const directTarget = document.elementsFromPoint(pointer.x, pointer.y)
        .map((element) => element.closest(selector))
        .find((element) => element && !element.closest('.pixel-pet') &&
          element.getClientRects().length && element.textContent.trim());
      let target = directTarget;
      if (!target) {
        let nearestDistance = 140;
        for (const element of document.querySelectorAll(selector)) {
          if (element.closest('.pixel-pet') || !element.textContent.trim() || !element.getClientRects().length) continue;
          const rect = element.getBoundingClientRect();
          const dx = Math.max(rect.left - pointer.x, 0, pointer.x - rect.right);
          const dy = Math.max(rect.top - pointer.y, 0, pointer.y - rect.bottom);
          const distance = Math.hypot(dx, dy);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            target = element;
          }
        }
      }
      if (!target) return;
      if (lastFlickerTarget) lastFlickerTarget.classList.remove('pixel-text-flicker');
      window.clearTimeout(flickerTimer);
      lastFlickerTarget = target;
      target.classList.remove('pixel-text-flicker');
      void target.offsetWidth;
      target.classList.add('pixel-text-flicker');
      flickerTimer = window.setTimeout(() => {
        target.classList.remove('pixel-text-flicker');
        if (lastFlickerTarget === target) lastFlickerTarget = null;
      }, 900);
    }

    function launchCursorMarker(originX, originY) {
      if (!pointer) return;
      const dx = pointer.x - originX;
      const dy = pointer.y - originY;
      const length = Math.hypot(dx, dy) || 1;
      impact.style.left = `${pointer.x}px`;
      impact.style.top = `${pointer.y}px`;
      impact.style.setProperty('--pet-kick-x', `${(dx / length) * 34}px`);
      impact.style.setProperty('--pet-kick-y', `${(dy / length) * 34}px`);
      impact.classList.remove('is-active');
      void impact.offsetWidth;
      impact.classList.add('is-active');
      window.clearTimeout(impactTimer);
      impactTimer = window.setTimeout(() => impact.classList.remove('is-active'), 550);
    }

    function handleEdgeImpact(originX, originY) {
      const now = performance.now();
      if (now - lastEdgeImpact < 260) return;
      lastEdgeImpact = now;
      launchCursorMarker(originX, originY);
    }

    function updateCollisionCounter(nextCount) {
      if (nextCount === collisionCount) return;
      collisionCount = nextCount;
      counter.textContent = String(collisionCount);
      pet.setAttribute('aria-label', `像素小宠物；鼠标碰撞 ${collisionCount} 次；点击让它弹飞`);
      counter.classList.remove('is-pop');
      void counter.offsetWidth;
      counter.classList.add('is-pop');
      if (collisionCount === 0) {
        window.clearTimeout(milestoneTimer);
        counter.classList.remove('is-milestone', 'color-one', 'color-two', 'color-three');
        return;
      }
      if (collisionCount % 10 === 0) {
        const colors = ['color-one', 'color-two', 'color-three'];
        window.clearTimeout(milestoneTimer);
        counter.classList.remove('is-milestone', ...colors);
        counter.classList.add(colors[(collisionCount / 10 - 1) % colors.length], 'is-milestone');
        void counter.offsetWidth;
        milestoneTimer = window.setTimeout(() => counter.classList.remove('is-milestone'), 760);
      }
    }

    function advanceMeowCycle(now) {
      if (petMemory.phase === 'cooldown') {
        if (now < petMemory.cooldownUntil) return;
        petMemory = { phase: 'doubling', explosions: 0, meowLength: 1, fontSize: 2, cooldownUntil: 0 };
      }

      petMemory.explosions += 1;
      if (petMemory.phase === 'doubling') {
        const nextLength = petMemory.meowLength * 2;
        if (nextLength > 128) {
          petMemory.phase = 'sizing';
          petMemory.explosions = 0;
          petMemory.meowLength = 1;
          petMemory.fontSize = 2;
          return;
        }
        petMemory.meowLength = nextLength;
        return;
      }

      petMemory.fontSize = Math.min(64, petMemory.fontSize + 2);
      if (petMemory.fontSize === 64) {
        petMemory.phase = 'cooldown';
        petMemory.explosions = 0;
        petMemory.cooldownUntil = now + 5000;
      }
    }

    function explodePet() {
      if (isExploding) return;
      isExploding = true;
      state.grounded = false;
      squeezeCount = 0;
      state.cornerAnchor = null;
      edgeSince = null;
      const now = Date.now();
      advanceMeowCycle(now);
      meowUntil = now + 4000;
      explosionUntil = now + 900;
      pet.classList.add('is-exploding');
      explosionImage.style.opacity = '1';
      explosionImage.style.transform = 'translate(-50%, -50%) scale(1)';
      updateCollisionCounter(0);
      renderMeow();
      try {
        localStorage.setItem(petMemoryKey, JSON.stringify(petMemory));
      } catch (error) {
        console.warn('[Pixel pet] Could not save explosion progress.', error);
      }
      persistPetState();

      window.setTimeout(finishExplosion, explosionUntil - Date.now());
    }

    function launchPet(directionX, directionY, strength) {
      const length = Math.hypot(directionX, directionY) || 1;
      state.vx = (directionX / length) * strength;
      state.vy = (directionY / length) * strength - 2;
      state.grounded = false;
      state.cornerAnchor = null;
      squeezeCount = 0;
      edgeSince = null;
    }

    function frame(now) {
      if (isExploding) {
        scheduleFrame();
        return;
      }
      const scale = state.lastFrame ? Math.min(2, (now - state.lastFrame) / 16.67) : 1;
      state.lastFrame = now;
      const maxX = Math.max(0, window.innerWidth - petWidth);
      const maxY = Math.max(0, window.innerHeight - petHeight);
      const cornerDistance = Math.max(petWidth, petHeight) * 1.25;
      let touchedEdge = false;
      const edgeCollisions = [];
      let inCorner = false;
      if (state.cornerAnchor) {
        const isRight = state.cornerAnchor.endsWith('right');
        const isBottom = state.cornerAnchor.startsWith('bottom');
        const minX = isRight ? Math.max(0, maxX - cornerDistance) : 0;
        const maxCornerX = isRight ? maxX : Math.min(maxX, cornerDistance);
        const minY = isBottom ? Math.max(0, maxY - cornerDistance) : 0;
        const maxCornerY = isBottom ? maxY : Math.min(maxY, cornerDistance);
        state.grounded = false;
        state.vy += .32 * scale;
        state.x += state.vx * scale;
        state.y += state.vy * scale;

        if (state.x < minX) {
          state.x = minX;
          state.vx = Math.max(Math.abs(state.vx) * .78, 4.5);
          touchedEdge = true;
        } else if (state.x > maxCornerX) {
          state.x = maxCornerX;
          state.vx = -Math.max(Math.abs(state.vx) * .78, 4.5);
          touchedEdge = true;
        }
        if (state.y < minY) {
          state.y = minY;
          state.vy = Math.max(Math.abs(state.vy) * .72, 4.5);
          touchedEdge = true;
        } else if (state.y > maxCornerY) {
          state.y = maxCornerY;
          state.vy = -Math.max(Math.abs(state.vy) * .68, 4.5);
          touchedEdge = true;
        }
        if (touchedEdge) {
          squeezeCount += 1;
          handleEdgeImpact(state.x + petWidth / 2, state.y + petHeight / 2);
          if (squeezeCount >= 30) explodePet();
        }
        inCorner = true;
      } else {
        if (!state.grounded) state.vy += .32 * scale;
        state.x += state.vx * scale;
        if (!state.grounded) state.y += state.vy * scale;

        if (state.x < 0) {
          touchedEdge = true;
          edgeCollisions.push('left');
          state.x = 0;
          const atCorner = state.y <= cornerDistance || state.y >= maxY - cornerDistance;
          state.vx = Math.max(Math.abs(state.vx) * .78, atCorner ? 6 : 0);
          handleEdgeImpact(state.x + petWidth / 2, state.y + petHeight / 2);
        } else if (state.x > maxX) {
          touchedEdge = true;
          edgeCollisions.push('right');
          state.x = maxX;
          const atCorner = state.y <= cornerDistance || state.y >= maxY - cornerDistance;
          state.vx = -Math.max(Math.abs(state.vx) * .78, atCorner ? 6 : 0);
          handleEdgeImpact(state.x + petWidth / 2, state.y + petHeight / 2);
        }
        if (state.y < 0) {
          touchedEdge = true;
          edgeCollisions.push('top');
          state.y = 0;
          state.vy = Math.abs(state.vy) * .72;
          state.grounded = false;
          handleEdgeImpact(state.x + petWidth / 2, state.y + petHeight / 2);
        } else if (state.y > maxY) {
          touchedEdge = true;
          edgeCollisions.push('bottom');
          state.y = maxY;
          const pressedAgainstSide = state.x <= cornerDistance || state.x >= maxX - cornerDistance;
          if (pressedAgainstSide) {
            state.vy = -Math.max(Math.abs(state.vy) * .68, 3.2);
            state.grounded = false;
          } else if (Math.abs(state.vy) > 1.2) {
            state.vy = -Math.abs(state.vy) * .68;
            state.grounded = false;
          } else {
            state.vy = 0;
            state.grounded = true;
            state.vx *= .94;
          }
          handleEdgeImpact(state.x + petWidth / 2, state.y + petHeight / 2);
        }

        const withinCornerZone = (state.x <= cornerDistance || state.x >= maxX - cornerDistance) &&
          (state.y <= cornerDistance || state.y >= maxY - cornerDistance);
        for (const edge of edgeCollisions) {
          const nearHorizontalCorner = state.y <= cornerDistance || state.y >= maxY - cornerDistance;
          const nearVerticalCorner = state.x <= cornerDistance || state.x >= maxX - cornerDistance;
          const collisionAtCorner = edge === 'left' || edge === 'right'
            ? nearHorizontalCorner : nearVerticalCorner;
          if (collisionAtCorner) {
            inCorner = true;
            squeezeCount += 1;
            const isRight = state.x >= maxX / 2;
            const isBottom = state.y >= maxY / 2;
            state.cornerAnchor = `${isBottom ? 'bottom' : 'top'}-${isRight ? 'right' : 'left'}`;
            state.grounded = false;
            edgeSince = null;
            if (squeezeCount >= 30) {
              explodePet();
              break;
            }
          }
        }
        const isAtEdge = state.x <= 1 || state.x >= maxX - 1 || state.y <= 1 || state.y >= maxY - 1;
        if (isAtEdge) {
          if (edgeSince === null) edgeSince = Date.now();
          if (Date.now() - edgeSince >= 10000) {
            const inwardX = maxX / 2 - state.x;
            const inwardY = maxY / 2 - state.y;
            launchPet(inwardX, inwardY || -1, 7);
            edgeSince = null;
          }
        } else {
          edgeSince = null;
        }
        if (!withinCornerZone && !state.grounded) squeezeCount = 0;
      }

      state.vx *= Math.pow(.992, scale);
      pet.style.left = `${state.x}px`;
      pet.style.top = `${state.y}px`;
      const meowOnSide = state.y < 30;
      const meowAbove = !meowOnSide && state.y > maxY - 72;
      counter.classList.toggle('is-below', meowOnSide);
      counter.classList.toggle('is-side-left', meowAbove && state.x > window.innerWidth / 2);
      counter.classList.toggle('is-side-right', meowAbove && state.x <= window.innerWidth / 2);
      pet.classList.toggle('is-counter-below', meowOnSide);
      pet.classList.toggle('is-meow-side', meowOnSide);
      pet.classList.toggle('is-meow-side-left', meowOnSide && state.x > window.innerWidth / 2);
      pet.classList.toggle('is-meow-side-right', meowOnSide && state.x <= window.innerWidth / 2);
      pet.classList.toggle('is-meow-left', state.x > window.innerWidth / 2);
      pet.classList.toggle('is-meow-above', meowAbove);
      if (touchedEdge) updateCollisionCounter(0);
      if (isExploding) {
        scheduleFrame();
        return;
      }
      if (pointer) {
        const withinHitbox = pointer.x >= state.x && pointer.x <= state.x + petWidth &&
          pointer.y >= state.y && pointer.y <= state.y + petHeight;
        if (withinHitbox && pointerCollisionArmed) {
          pointerCollisionArmed = false;
          const centerX = state.x + petWidth / 2;
          const centerY = state.y + petHeight / 2;
          const awayX = centerX - pointer.x || (state.vx < 0 ? 1 : -1);
          const awayY = centerY - pointer.y || -1;
          launchPet(awayX, awayY, 7);
          launchCursorMarker(centerX, centerY);
          flashTextNearPointer();
          if (!touchedEdge) updateCollisionCounter(collisionCount + 1);
        } else if (!withinHitbox) {
          pointerCollisionArmed = true;
        }
      }
      if (touchedEdge || inCorner) persistPetState();
      scheduleFrame();
    }

    document.addEventListener('pointermove', (event) => {
      pointer = { x: event.clientX, y: event.clientY };
    }, { passive: true });
    pet.addEventListener('click', () => launchPet((Math.random() - .5) * 8, -1, 9));
    window.addEventListener('pagehide', persistPetState);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        persistPetState();
      } else {
        state.lastFrame = 0;
        scheduleFrame();
      }
    });
    window.addEventListener('resize', () => {
      const bounds = pet.getBoundingClientRect();
      petWidth = bounds.width;
      petHeight = bounds.height;
      state.x = Math.min(state.x, Math.max(0, window.innerWidth - petWidth));
      const maxY = Math.max(0, window.innerHeight - petHeight);
      state.y = Math.min(state.y, maxY);
      if (state.grounded && state.y < maxY - 1) state.grounded = false;
      if (state.y >= maxY - 1 && state.vy >= 0) {
        state.y = maxY;
        state.vy = 0;
        state.grounded = true;
      }
      persistPetState();
    });
    scheduleFrame();
  }
})();
