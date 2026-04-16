# Zac's Blog - 开发指南

基于 Hugo + Lowkey 主题 + Tailwind CSS 的个人博客，部署在 Cloudflare Pages。

## 项目结构

```
content/posts/{slug}/index.md   # 文章（Page Bundle 模式）
content/posts/{slug}/*.jpg|png  # 文章配图（同目录）
config/_default/                # Hugo 配置
themes/lowkey/                  # 主题模板和样式
functions/api/                  # CF Pages Functions（访问统计）
static/                         # 全局静态资源
```

## 常用命令

- 开发：`./dev.sh`（hugo server + Tailwind CDN 热重载）
- 生产预览：`hugo --minify && npx wrangler pages dev public --port 8788`
- 部署：`git push origin master`（CF Pages 自动构建）

## 写文章规范

详见 `/write-post` 和 `/publish` 命令（`.claude/commands/` 目录）。

## 草稿系统

- 草稿放在 `content/d/{slug}/index.md`，受 Cloudflare Access 保护（路径 `/d`）
- 分享链接通过 `/s/<token>` 访问，token 存储在 KV（`share:` 和 `draft:` 前缀）
- 发布：将目录从 `content/d/` 移到 `content/posts/`
- 管理分享：在草稿文章页面内操作（创建/重置/取消分享）
