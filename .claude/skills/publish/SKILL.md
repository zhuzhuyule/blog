---
name: publish
description: 一键发布博客文章到线上（检查、构建、提交、推送，CF Pages 自动部署）
user_invocable: true
---

# 发布文章 Skill

快速将本地文章发布到线上。

## 执行步骤

### 1. 环境检查

- 确认 `.env.blog` 存在（不存在则创建，参考 `/write-post`）
- 确认 `.gitignore` 包含 `.env.blog`、`.dev.vars`、`.wrangler/`

### 2. 检查待发布的文章

- `git status` 查看变更
- 确认 `content/posts/` 下有新增或修改的文章
- 检查 frontmatter 完整性（title、date、categories）
- 确认没有 `draft: true`

### 3. 封面图检查

对每篇待发布的文章：

- 检查文章目录下是否已有封面图（cover.png/jpg 或文章中的第一张图）
- 如果没有封面图，**询问用户**是否需要生成：
  - **需要** → 根据文章内容生成 prompt，按 `/write-post` 的图片层级策略处理
  - **不需要** → 跳过，首页仅展示文字
- 确认所有 Markdown 中引用的图片文件都存在

### 4. 本地构建验证

```bash
hugo --minify
```

确认构建无报错。

### 5. 提交并推送

- 将文章相关文件加入 staging：`content/posts/{slug}/` 整个目录
- 提交信息格式：
  - 新文章：`post: {文章标题}`
  - 修改文章：`update: {文章标题}`
  - 多篇文章：`posts: 添加/更新 N 篇文章`
- 推送：`git push origin master`

### 6. 部署确认

推送后 Cloudflare Pages 自动构建部署，通常 1-2 分钟。

线上地址：https://blog.ause.cc

## 禁止提交的文件

- `.env.blog`（图片 API 密钥）
- `.dev.vars`（CF API 密钥）
- `.wrangler/`（本地运行时数据）
- `public/`（构建产物）

## 注意事项

- 推送前确认 `draft` 不为 true
- 如果只是修改主题/模板，提交信息使用常规格式而非 `post:` 前缀
- 图片会在 Hugo 构建时自动压缩，无需手动处理
