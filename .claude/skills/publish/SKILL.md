---
name: publish
description: 一键发布博客文章到线上（提交 + 推送，CF Pages 自动部署）
user_invocable: true
---

# 发布文章 Skill

快速将本地文章发布到线上。

## 执行步骤

### 1. 检查待发布的文章

- 运行 `git status` 查看变更文件
- 确认 `content/posts/` 下有新增或修改的文章
- 检查文章的 frontmatter 是否完整（title、date、categories）
- 确认没有 `draft: true`（草稿不会发布）

### 2. 验证文章质量

- 检查文章 `index.md` 的 frontmatter 格式是否正确
- 确认配图文件存在且被正确引用
- 确认分类和标签符合博客的分类体系（参考 `/write-post` skill）

### 3. 本地构建验证

```bash
hugo --minify
```

确认构建无报错。

### 4. 提交并推送

- 将文章相关文件（`content/posts/{slug}/` 目录）加入 git staging
- 提交信息格式：
  - 新文章：`post: {文章标题}`
  - 修改文章：`update: {文章标题}`
  - 多篇文章：`posts: 添加/更新 N 篇文章`
- 推送到 master 分支：`git push origin master`

### 5. 确认部署

推送后 Cloudflare Pages 自动构建部署，通常 1-2 分钟完成。

线上地址：https://blog.ause.cc

## 注意事项

- **不要**提交 `.dev.vars`（包含 API 密钥）
- **不要**提交 `.wrangler/` 目录
- 推送前确认 `draft` 不为 true
- 如果只是修改主题/模板，提交信息使用常规格式而非 `post:` 前缀
