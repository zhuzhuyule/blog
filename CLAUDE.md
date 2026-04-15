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
