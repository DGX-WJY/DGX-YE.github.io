const posts = [
  {
    title: "当雨落下时，我在想些什么",
    tag: "随笔",
    date: "2026-08-21",
    desc: "雨声是一种白噪音，把世界的棱角都泡软了。在这样一个下午，我决定开始写这个博客。",
    link: "view/articles.html"
  },
  {
    title: "用 CSS 做出玻璃上的雨珠",
    tag: "前端",
    date: "2026-08-15",
    desc: "从 backdrop-filter 到 radial-gradient 动画，一步步实现毛玻璃上水滴滑落的视觉效果。",
    link: "view/articles.html"
  },
  {
    title: "把 GitHub Pages 绑定到自己的域名",
    tag: "部署",
    date: "2026-07-30",
    desc: "从仓库命名、DNS 解析到 HTTPS 证书，一份不踩坑的完整记录。",
    link: "view/articles.html"
  },
  {
    title: "深夜重构：让代码也优雅一点",
    tag: "前端",
    date: "2026-07-12",
    desc: "可读性、命名与结构。写代码和写文章一样，都需要一点克制与呼吸感。",
    link: "view/articles.html"
  },
  {
    title: "关于慢生活的几个小练习",
    tag: "生活",
    date: "2026-06-28",
    desc: "泡一杯茶，看一会儿窗外的雨。慢下来，才有余力感受细节。",
    link: "view/articles.html"
  },
  {
    title: "设计中的留白哲学",
    tag: "设计",
    date: "2026-06-10",
    desc: "留白不是空，而是一种克制的温柔。谈谈我对界面呼吸感的理解。",
    link: "view/articles.html"
  }
];

/* ---------- 2. 渲染文章卡片 ---------- */
function renderPosts(gridId, data) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = data.map(p => `
    <article class="post-card glass-card">
      <span class="tag">${p.tag}</span>
      <h3>${p.title}</h3>
      <p>${p.desc}</p>
      <span class="date">${p.date}</span>
      <div class="read-more"><a href="${p.link}">阅读全文 →</a></div>
    </article>
  `).join("");
}

/* ---------- 3. 雨幕粒子生成 ---------- */
function createRain() {
  const layer = document.getElementById("rainLayer");
  if (!layer) return;
  const COUNT = window.innerWidth < 640 ? 60 : 140; // 移动端少一些
  for (let i = 0; i < COUNT; i++) {
    const drop = document.createElement("div");
    drop.className = "raindrop";
    // 随机水平位置、动画时长、延迟、长度
    drop.style.left = Math.random() * 100 + "%";
    drop.style.animationDuration = 0.6 + Math.random() * 0.8 + "s";
    drop.style.animationDelay = Math.random() * 2 + "s";
    drop.style.height = 12 + Math.random() * 18 + "px";
    drop.style.opacity = 0.3 + Math.random() * 0.5;
    layer.appendChild(drop);
  }
}

/* ---------- 4. 毛玻璃上的雨珠滑落 ----------
   在 .glass-card 上动态生成小水珠元素，缓慢向下移动 + 随机左右摇摆，
   到达底部后重置，模拟水滴沿玻璃滑落的真实感。 */
function createDrops() {
  const cards = document.querySelectorAll(".glass-card");
  cards.forEach(card => {
    const COUNT = 5; // 每张卡片雨珠数
    for (let i = 0; i < COUNT; i++) {
      const drop = document.createElement("div");
      drop.className = "drop";
      // 初始随机位置
      drop.style.left = Math.random() * 90 + "%";
      drop.style.top = Math.random() * 60 + "%";
      // 随机大小、时长
      const size = 4 + Math.random() * 6;
      drop.style.width = size + "px";
      drop.style.height = size * 1.1 + "px";
      drop.style.animationDuration = 6 + Math.random() * 6 + "s";
      drop.style.animationDelay = Math.random() * 5 + "s";
      card.appendChild(drop);
    }
  });
}

/* 动态注入雨珠样式（通过 JS 避免写死过多 CSS） */
function injectDropStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .glass-card { position: relative; overflow: hidden; }
    .drop {
      position: absolute; z-index: 0;
      background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95), rgba(180,210,240,0.55) 60%, rgba(140,180,220,0.25));
      border-radius: 50% 50% 48% 48%;
      box-shadow: inset 0 -1px 2px rgba(255,255,255,0.6), 0 1px 3px rgba(0,0,0,0.2);
      opacity: 0.85;
      animation: slideDrop linear infinite;
      pointer-events: none;
    }
    .glass-card > * { position: relative; z-index: 1; }
    @keyframes slideDrop {
      0%   { transform: translate(0, 0) scale(1); opacity: 0; }
      10%  { opacity: 0.9; }
      50%  { transform: translate(3px, 50%) scale(1.05); }
      90%  { opacity: 0.9; }
      100% { transform: translate(-2px, 130%) scale(0.6); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

/* ---------- 5. 移动端菜单 ---------- */
function setupMobileMenu() {
  // 小屏时 nav 已通过 CSS flex 换行；此处预留交互扩展
  const nav = document.querySelector("nav");
  if (nav && window.innerWidth <= 640) {
    nav.setAttribute("aria-expanded", "true");
  }
}

/* ---------- 6. 表单提交 ---------- */
function onSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  const old = btn.textContent;
  btn.textContent = "✓ 已寄出，谢谢";
  btn.style.background = "linear-gradient(135deg, #8ff0a0, #6ddc8a)";
  setTimeout(() => {
    btn.textContent = old;
    btn.style.background = "";
    e.target.reset();
  }, 2600);
}
// 挂载到全局供 inline onsubmit 调用
window.onSubmit = onSubmit;

/* ---------- 初始化 ---------- */
document.addEventListener("DOMContentLoaded", () => {
  injectDropStyles();
  createRain();
  createDrops();
  setupMobileMenu();

  // 主页文章（取前3篇）
  renderPosts("postGrid", posts.slice(0, 3));
  // 文章列表页（全部）
  renderPosts("postGridFull", posts);
});