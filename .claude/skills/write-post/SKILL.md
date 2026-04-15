---
name: write-post
description: 撰写或优化博客文章，遵循博客的写作规范和文件结构
user_invocable: true
---

# 写文章 Skill

当用户要求撰写、修改或优化博客文章时，遵循以下规范。

## 环境准备

首次执行时检查项目根目录是否存在 `.env.blog` 文件。如果不存在，自动创建并填入默认变量（值为空）：

```env
# 主 API 配置
IMAGE_API_PROVIDER=        # openai / gemini / custom
IMAGE_API_KEY=             # API Key
IMAGE_API_BASE_URL=        # Base URL（不带 /v1，脚本自动拼接路径）
IMAGE_API_MODEL=           # 模型名

# 备用 API（主 API 失败时自动切换）
IMAGE_FALLBACK_PROVIDER=
IMAGE_FALLBACK_KEY=
IMAGE_FALLBACK_BASE_URL=
IMAGE_FALLBACK_MODEL=

# 通用设置
IMAGE_DEFAULT_STYLE=       # 默认风格：tech-dark / minimal / illustration
IMAGE_DEFAULT_SIZE=        # 默认尺寸：1792x1024（OpenAI）/ 16:9（Gemini）
```

#### 配置示例

**Google Gemini（直连或代理）：**
```env
IMAGE_API_PROVIDER=gemini
IMAGE_API_KEY=your-api-key
IMAGE_API_BASE_URL=https://generativelanguage.googleapis.com
IMAGE_API_MODEL=models/gemini-2.0-flash-exp
```
调用方式：`POST {BASE_URL}/v1beta/{MODEL}:generateContent?key={KEY}`
请求体使用 Gemini `generateContent` 格式，返回 base64 图片。

**Google Gemini（代理服务器）：**
```env
IMAGE_API_PROVIDER=gemini
IMAGE_API_KEY=your-api-key
IMAGE_API_BASE_URL=http://your-proxy:3001/proxy/gemini
IMAGE_API_MODEL=models/gemini-2.0-flash-exp
```
代理模式下 Base URL 替换为代理地址，路径拼接方式不变。

**OpenAI DALL-E：**
```env
IMAGE_API_PROVIDER=openai
IMAGE_API_KEY=sk-xxxxx
IMAGE_API_BASE_URL=https://api.openai.com
IMAGE_API_MODEL=dall-e-3
```
调用方式：`POST {BASE_URL}/v1/images/generations`，Header 带 `Authorization: Bearer {KEY}`。

**自定义（兼容 OpenAI 格式的第三方）：**
```env
IMAGE_API_PROVIDER=custom
IMAGE_API_KEY=your-key
IMAGE_API_BASE_URL=https://your-service.com
IMAGE_API_MODEL=your-model
```
使用与 OpenAI 相同的请求格式。

同时确认 `.gitignore` 中包含 `.env.blog`。

## 文件结构

每篇文章使用 Hugo 的 **Page Bundle** 模式：

```
content/posts/{slug}/
├── index.md          # 文章正文（必须）
├── cover.png         # 封面图（可选，首页列表自动展示）
└── *.png/jpg/svg     # 文章内配图
```

- `{slug}` 使用英文短横线命名，如 `go-concurrency-patterns`
- 所有配图放在文章同目录下，**不要**放在 `static/` 或使用外部 URL
- Hugo 构建时自动压缩图片（限宽 1200px，质量 85%，生成 srcset）

## Frontmatter 规范

```yaml
---
title: "文章标题"
date: 2026-04-15
description: "一句话摘要（50-100字，用于搜索索引和 SEO）"
categories: ["分类名"]
tags: ["标签1", "标签2", "标签3"]
math: true          # 可选，需要数学公式时开启
draft: true         # 可选，草稿不会发布
---
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `title` | 是 | 中文标题，简洁有力 |
| `date` | 是 | 发布日期，格式 `YYYY-MM-DD` |
| `description` | 推荐 | 搜索索引和 SEO 用的摘要 |
| `categories` | 推荐 | 只选 **1 个**主分类 |
| `tags` | 推荐 | 2-5 个标签 |

## 正文写作规范

### 开头段落（重要）

开头部分建议写 **2-3 段总结性内容**（约 150-300 字），概述文章要解决的问题、核心观点和关键结论。这很重要因为：

- 首页列表最多展示 4 行摘要，充实的开头 = 更好的首页展示效果
- Hugo 的 Summary 默认取正文前段内容
- 不要用"大家好"之类的寒暄，直接进入主题

### 结构

- 使用 `##` 和 `###` 组织章节（Hugo 自动生成 TOC，h2-h4）
- 代码块标注语言类型
- 相关技术/工具首次出现时附上官方链接
- 结尾总结要点

### 风格

- 语言：中文为主，技术术语保留英文
- 段落：短段落，每段聚焦一个观点
- 语气：专业但不刻板
- 不要使用 emoji 作为装饰

### 代码示例

- 代码要可运行、有意义
- 长代码块添加关键注释
- 适当使用行内代码引用函数名、变量名

### 数学公式

frontmatter 设置 `math: true`，行内 `$E = mc^2$`，块级 `$$\sum_{i=1}^{n} x_i$$`。

## 封面图与配图

### 图片层级策略（按优先级）

| 优先级 | 方式 | 说明 |
|--------|------|------|
| 1 | 用户提供 | 用户直接给出图片文件 |
| 2 | 用户描述 | 用户描述风格，生成 prompt 供用户生成 |
| 3 | 自动总结 | 根据文章内容自动生成封面图 prompt，用户确认后生成 |
| 4 | 不使用 | 首页仅展示文字，完全可以 |

写完文章后，**主动询问用户**是否需要封面图，并说明当前处于哪个层级。

### 封面图 prompt 模板

当需要生成 prompt 时：

```
主题：{文章核心概念的视觉化表达}
风格：{IMAGE_DEFAULT_STYLE 或根据内容推断}
元素：{2-3 个核心图标或符号}
比例：16:9，宽度 ≥ 1200px
要求：不含真实人物，不含文字（避免 AI 生成乱码文字）
```

### API 自动生成

如果 `.env.blog` 中 `IMAGE_API_KEY` 已配置：

1. 读取 `.env.blog` 配置
2. 根据 `IMAGE_API_PROVIDER` + `IMAGE_API_BASE_URL` + `IMAGE_API_MODEL` 调用 API
3. **如果主 API 失败**（网络错误、配额不足、模型不可用等）：
   - 立即提示用户失败原因
   - 如果 `IMAGE_FALLBACK_KEY` 已配置，询问用户是否使用备用 API 重试
   - 用户同意则用备用配置重试
4. **如果备用也失败或未配置**：
   - 输出 prompt 文案，提示用户手动生成（可复制到任意图片生成工具）
   - 不要静默失败，必须告知用户
5. 成功后保存到文章目录 `cover.png`，插入到文章开头

#### API 调用方式

| Provider | 请求路径 | 认证方式 | 请求格式 |
|----------|---------|---------|---------|
| gemini | `{BASE_URL}/v1beta/{MODEL}:generateContent?key={KEY}` | URL 参数 | Gemini generateContent |
| openai | `{BASE_URL}/v1/images/generations` | Header `Bearer {KEY}` | OpenAI Images API |
| custom | `{BASE_URL}/v1/images/generations` | Header `Bearer {KEY}` | 同 OpenAI |

**注意**：Base URL 不要带 `/v1` 后缀，脚本会根据 provider 自动拼接正确路径。

如果未配置任何 API，直接输出 prompt 文案供用户手动生成。

### 配图规范

- Markdown 引用：`![描述](filename.png "可选标题")`
- 带标题的图片渲染为 `<figure>` + `<figcaption>`
- 封面图建议：宽度 ≥ 1200px，比例 16:9
- 文件名有意义：`architecture.png` 而非 `1.png`
- 首页自动提取文章**第一张图**作为封面

## 分类体系

### 分类（categories）— 每篇只选 1 个

| 分类 | 适用内容 |
|------|----------|
| Go | Go 语言 |
| Rust | Rust 语言 |
| 前端 | JS/TS/CSS/框架 |
| Python | Python |
| DevOps | CI/CD、容器、部署 |
| 工具 | 开发/效率工具 |
| 折腾 | 个人项目、硬件 |
| 思考 | 方法论、职业 |

### 标签（tags）— 细粒度关键词

如 `并发`、`Goroutine`、`性能优化`、`Docker`、`Tailwind CSS` 等。

## 操作步骤

1. **环境检查**：确认 `.env.blog` 存在，不存在则创建
2. **创建文章**：`content/posts/{slug}/index.md`
3. **写正文**：遵循开头段落 + 结构 + 风格规范
4. **封面图**：询问用户需求，按层级策略处理
5. **配图**：放入同目录，Markdown 引用
6. **预览**：`./dev.sh` → http://localhost:1313
7. **发布**：使用 `/publish`
