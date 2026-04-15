---
name: write-post
description: 撰写或优化博客文章，遵循博客的写作规范和文件结构
user_invocable: true
---

# 写文章 Skill

当用户要求撰写、修改或优化博客文章时，遵循以下规范。

## 文件结构

每篇文章使用 Hugo 的 **Page Bundle** 模式：

```
content/posts/{slug}/
├── index.md          # 文章正文（必须）
├── cover.jpg         # 封面图（可选，会在首页列表展示）
├── screenshot.png    # 文章内配图
└── diagram.svg       # 其他资源
```

- `{slug}` 使用英文短横线命名，如 `go-concurrency-patterns`
- 所有配图放在文章同目录下，**不要**放在 `static/` 或外部 URL

## Frontmatter 规范

```yaml
---
title: "文章标题"
date: 2026-04-15
description: "一句话摘要，用于 SEO 和搜索索引（50-100字）"
categories: ["分类名"]
tags: ["标签1", "标签2", "标签3"]
math: true          # 可选，需要数学公式时开启
draft: true         # 可选，草稿不会发布
---
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `title` | 是 | 中文标题，简洁有力 |
| `date` | 是 | 发布日期，格式 `YYYY-MM-DD` |
| `description` | 推荐 | 搜索索引和 SEO 用的摘要 |
| `categories` | 推荐 | 只选 **1 个**主分类，如 `Go`、`前端`、`工具`、`折腾` |
| `tags` | 推荐 | 2-5 个标签，细粒度分类 |
| `math` | 否 | 启用 MathJax 渲染 |
| `draft` | 否 | 设为 true 则不发布 |

## 正文写作规范

### 结构

1. **开头段落**：直接说明本文解决什么问题或介绍什么内容（不要用"大家好"之类的寒暄）
2. **正文**：使用 `##` 和 `###` 组织章节，Hugo 会自动生成 TOC 目录
3. **代码块**：标注语言类型，如 ```go、```python
4. **结尾**：总结要点或给出进一步学习的方向

### 图片引用

文章配图放在同目录下，Markdown 中直接引用文件名：

```markdown
![架构图](architecture.png)
```

- 首页列表会自动提取文章中的**第一张图片**作为封面
- 封面图建议尺寸：宽度 ≥ 1000px，宽高比约 16:9 或 2:1
- 图片自然高度不足屏幕一半时不会在列表页展示
- 使用有意义的文件名（不要用 `1.png`、`image.jpg`）

### 风格

- 语言：中文为主，技术术语保留英文原文
- 段落：短段落，每段聚焦一个观点
- 语气：专业但不刻板，像跟同事讲解技术方案
- 不要使用 emoji 作为装饰
- Hugo 的 Summary 默认取正文前 70 个词，首页列表最多展示 4 行摘要

### 代码示例

- 代码要可运行、有意义，不要写 `// TODO` 或伪代码
- 长代码块添加关键注释
- 适当使用行内代码 \`funcName\` 引用函数名、变量名

### 数学公式

需要在 frontmatter 设置 `math: true`，然后使用：
- 行内公式：`$E = mc^2$`
- 块级公式：`$$\sum_{i=1}^{n} x_i$$`

## 分类和标签体系

### 分类（categories）— 每篇文章只选 1 个

| 分类 | 适用内容 |
|------|----------|
| Go | Go 语言相关 |
| Rust | Rust 语言相关 |
| 前端 | JavaScript/TypeScript/CSS/框架 |
| Python | Python 相关 |
| DevOps | CI/CD、Docker、K8s、部署 |
| 工具 | 开发工具、效率工具推荐 |
| 折腾 | 个人项目、博客搭建、硬件折腾 |
| 思考 | 技术思考、职业发展、方法论 |

可根据需要新增分类，但保持精简。

### 标签（tags）— 细粒度关键词

如 `并发`、`Goroutine`、`性能优化`、`Docker`、`Tailwind CSS` 等。

## 操作步骤

1. 创建目录：`content/posts/{slug}/`
2. 创建 `index.md`，填写 frontmatter 和正文
3. 如有配图，放入同目录
4. 本地预览：`./dev.sh` 然后访问 http://localhost:1313
5. 确认无误后使用 `/publish` 发布
