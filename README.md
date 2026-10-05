# Yehack · Play / Make / Write

基于原生 HTML、CSS 和 JavaScript 的多页面个人博客，部署目标为 GitHub Pages。无需 Node、打包器或后端服务。

## 项目结构

```text
.
├── index.html               # 首页
├── articles/index.html      # 文章归档、搜索、标签、分类和分页
├── article.html             # 独立文章阅读页（?slug=文章标识）
├── games/index.html         # 游戏档案与推荐
├── tools/index.html         # 工具目录和本地交互工具
├── about/index.html         # 关于页
├── 404.html                 # GitHub Pages 404 页面
├── assets/brand/            # 品牌图片
├── css/                     # 全站与逐页样式
├── data/                    # 文章、游戏、工具 JSON 数据
├── js/                      # 全站与逐页交互
├── feed.xml                 # RSS 订阅
└── sitemap.xml              # 搜索引擎站点地图
```

每个目录页都是真正独立的 HTML 页面，点击导航会进行常规页面跳转，不使用整页替换式 SPA。`css/site.css` 与 `js/site.js` 仅负责共享主题、导航等外壳；每个页面有独立的页面脚本和样式。

## 发布文章

编辑 `data/articles.json` 的 `articles` 数组并更新 `updatedAt`：

```json
{
  "slug": "my-new-note",
  "title": "文章标题",
  "date": "2026-10-05",
  "category": "开发",
  "summary": "文章摘要",
  "tags": ["Web", "随笔"],
  "content": ["正文第一段。", "正文第二段。"]
}
```

`slug` 使用唯一的小写英文字母、数字和连字符。正文数组中的每项会作为纯文本段落展示，不解释 HTML。首页最新文章、文章归档、独立阅读页和上一篇/下一篇导航都使用同一份文章数据。同步更新 `feed.xml` 和 `sitemap.xml` 后提交、推送；GitHub Pages 完成部署后，访客重新加载页面即可看到更新。

## 编辑游戏和工具目录

- `data/games.json`：游戏名称、平台、简介、标签和商店链接。
- `data/tools.json`：工具名称、分类、简介和标签。已有 JSON 整理器、UTF-8 Base64 编解码和 HEX/RGB/HSL 颜色转换工具。
- 修改条目即可更新对应列表。游戏条目的外链会在新标签页打开；工具数据留在浏览器内处理。

## 页面能力

- 响应式首页、文章归档、文章详情、游戏档案、工具箱、个人介绍和 404 页面。
- 文章标题/摘要/标签搜索、分类筛选、热门标签和分页；`/` 可聚焦搜索框。
- 阅读进度指示、上一篇/下一篇、复制链接、打印/保存 PDF、结构化文章元数据和 GitHub Discussions 讨论入口。
- 全站明暗主题切换、移动端导航、RSS 订阅和站点地图。

## 本地预览与部署

直接双击 HTML 无法读取 JSON 数据。可使用 Python 标准库启动静态 HTTP 服务：

```bash
python3 -m http.server 8000
```

访问 `http://localhost:8000/`。编辑文章后也要同步维护 `feed.xml` 与 `sitemap.xml`。提交到 `main` 后由 GitHub Pages 发布，仓库域名配置保留在 `CNAME`。
