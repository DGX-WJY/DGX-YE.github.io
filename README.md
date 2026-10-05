# DGX-YE.github.io
属个人仓库
## 1.YEhack-web
YE工作站网页|作为个人站点预览使用
>YE Workstation Webpage | For use as a personal site preview
## 2.YEslink-tools
YE工具间|作为跨域工具（蓝图/成品）预览使用
>YE Tool Room | Used as a cross-domain tool (blueprint/product) preview
# Updata
你可以直接访问下方域名进行浏览
如果你能浏览，还请在此留言，给予部分建议，感谢！
>You can directly visit the domain to browse.
>If you are able to browse, please leave a message here and give some suggestions. Thank you!
>
> www.yehack.com
------------------------
# 网站|Web
站点版本：0.1.1 | 当前更新状态：持续中
>Site Version：0.1.1 | Current update status: continuously updating

## 文章发布与同步

文章目录位于 `data/articles.json`。每篇文章包含唯一 `slug`、标题、日期、分类、摘要、标签和正文段落；正文以字符串数组编写，每个字符串显示为一个段落。复制现有条目并修改内容即可添加文章，`slug` 仅使用小写英文字母、数字和连字符，且不能重复；同时把顶层 `updatedAt` 更新为本次目录更新日期。

提交并推送文章目录后，等待 GitHub Pages 发布完成。已经打开的页面会每分钟检查一次更新；重新打开页面则会立即加载最新目录。筛选、阅读弹窗都由同一份 JSON 数据驱动，文章文本按纯文本安全显示，不支持 HTML。

## Git 同步注意事项

如果 `git pull` 报告本地与远端分支已分叉，需要先检查两边各自的提交，再决定合并或变基；不要使用强制推送覆盖远端。当前工作区曾检测到本地 `main` 与 `origin/main` 各有独立提交，且两边的页面版本差异较大，因此应先在 GitHub 上确认要保留哪一版，再整合分支。