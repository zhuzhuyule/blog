# Zac's Blog

代码 · 科技 · 折腾

## 技术栈

- **框架**：Hugo v0.160.1 + Lowkey 主题（深度定制）
- **样式**：Tailwind CSS（开发用 CDN，生产用 PostCSS）
- **部署**：Cloudflare Pages（自动构建）
- **评论**：Giscus（基于 GitHub Discussions）
- **统计**：Cloudflare Web Analytics + KV 持久化
- **域名**：https://blog.ause.cc

## 项目结构

```
├── content/posts/{slug}/     # 文章（Page Bundle 模式）
│   ├── index.md              #   正文 + frontmatter
│   └── *.jpg|png|svg         #   配图（同目录引用）
├── config/_default/          # Hugo 配置
│   ├── hugo.toml             #   站点基础配置
│   ├── params.toml           #   主题参数、社交链接、Giscus、CF Analytics
│   └── menus.toml            #   导航菜单
├── themes/lowkey/            # 定制主题
│   ├── assets/css/           #   Tailwind 样式
│   ├── layouts/              #   Hugo 模板
│   └── config/               #   Tailwind 配置
├── functions/api/            # CF Pages Functions
│   ├── stats.js              #   文章/批量 PV 查询（KV 累计 + 当天实时）
│   └── site-stats.js         #   站点总 PV 查询
├── static/                   # 全局静态资源（头像、favicon）
├── .claude/skills/           # Claude Code Skills
│   ├── write-post.md         #   /write-post 写文章规范
│   └── publish.md            #   /publish 一键发布
└── wrangler.toml             # CF Workers 配置
```

## 写文章

### 快速开始

```bash
# 1. 创建文章目录
mkdir content/posts/my-new-post

# 2. 创建 index.md，写入内容
# 3. 配图放同目录，用 ![alt](filename.png) 引用
# 4. 本地预览
./dev.sh     # http://localhost:1313

# 5. 发布
git add content/posts/my-new-post/
git commit -m "post: 文章标题"
git push origin master
```

### 文章 Frontmatter

```yaml
---
title: "文章标题"
date: 2026-04-15
description: "一句话摘要（50-100字，用于搜索和 SEO）"
categories: ["Go"]           # 只选 1 个主分类
tags: ["并发", "Goroutine"]  # 2-5 个标签
math: true                   # 可选，需要数学公式时开启
---
```

### 配图规范

- 所有图片放在文章同目录下（`content/posts/{slug}/`）
- 首页列表自动提取**第一张图片**作为封面
- 封面图建议：宽度 ≥ 1000px，比例 16:9 或 2:1
- 文件名有意义：`architecture.png` 而非 `1.png`

### 分类体系

| 分类 | 内容 |
|------|------|
| Go | Go 语言 |
| Rust | Rust 语言 |
| 前端 | JS/TS/CSS/框架 |
| Python | Python |
| DevOps | CI/CD、容器、部署 |
| 工具 | 开发/效率工具 |
| 折腾 | 个人项目、硬件 |
| 思考 | 方法论、职业 |

## 开发

```bash
# 开发模式（Tailwind CDN 热重载）
./dev.sh

# 生产构建预览（含 CF Functions）
hugo --minify && npx wrangler pages dev public --port 8788

# 仅构建
hugo --minify
```

## 功能列表

- 响应式布局（移动端汉堡菜单 + 侧边栏）
- 三态主题切换（日间 / 夜间 / 跟随系统）
- 三档宽度切换（800 / 1000 / 1200px）
- 全文搜索（JSON 索引 + Cmd+K）
- 侧边栏 TOC 目录（桌面端，sticky 吸顶 + 滚动高亮）
- 文章访问量统计（CF Analytics + KV 持久化 + 前端缓存）
- Giscus 评论（跟随主题切换）
- 代码块复制按钮
- 回到顶部按钮
- 入场动画（页面级 + 列表项错开）
- FOUC 防闪烁

## 使用 Claude Code Skills

```bash
/write-post    # 撰写或优化文章（遵循写作规范）
/publish       # 一键发布到线上
```

## 环境变量

### CF Pages（线上自动配置）
- `CF_API_EMAIL` / `CF_API_KEY` / `CF_ACCOUNT_ID` / `CF_SITE_TAG`
- `HUGO_VERSION` / `NODE_VERSION`
- `STATS_KV`（KV binding）

### 本地开发
- `.dev.vars` 文件（不提交到 git）
