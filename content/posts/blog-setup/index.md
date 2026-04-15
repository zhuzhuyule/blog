---
title: "从零搭建 Hugo 博客：主题定制、评论、统计全攻略"
date: 2026-04-15
description: "基于 Hugo + Lowkey 主题 + Tailwind CSS 搭建个人博客，涵盖主题深度定制、Cloudflare Pages 部署、Giscus 评论、访问统计等完整方案"
categories: ["折腾"]
tags: ["Hugo", "Cloudflare", "Tailwind CSS", "博客"]
---

![Hugo + Cloudflare 博客技术栈](cover.png "Hugo + Cloudflare Pages 驱动的技术博客")

搭建个人博客是程序员的经典折腾项目。这次我选择了 [Hugo](https://gohugo.io/) 作为静态站点生成器，配合 [Lowkey](https://github.com/nixentric/Lowkey-Hugo-Theme) 主题进行深度定制，部署在 [Cloudflare Pages](https://pages.cloudflare.com/) 上，最终打造出一个功能完整、体验流畅的技术博客。本文记录整个搭建过程和关键决策。

## 技术选型

[Hugo](https://gohugo.io/) 是目前最快的静态站点生成器，单次构建通常在 1 秒内完成。相比 [Hexo](https://hexo.io/)（Node.js）和 [Jekyll](https://jekyllrb.com/)（Ruby），Hugo 是 Go 编写的单一二进制文件，无需依赖管理，部署简单。

最终的技术栈：

| 组件 | 选型 | 说明 |
|------|------|------|
| 框架 | [Hugo](https://gohugo.io/) v0.160.1 | Go 编写，构建极快 |
| 主题 | [Lowkey](https://github.com/nixentric/Lowkey-Hugo-Theme) | 简洁风格，深度定制 |
| 样式 | [Tailwind CSS](https://tailwindcss.com/) | 原子化 CSS，开发高效 |
| 部署 | [Cloudflare Pages](https://pages.cloudflare.com/) | 自动构建 + 全球 CDN |
| 评论 | [Giscus](https://giscus.app/) | 基于 GitHub Discussions |
| 统计 | [CF Web Analytics](https://www.cloudflare.com/web-analytics/) + KV | 免费 + 持久化累计 |

## 主题定制

[Lowkey](https://github.com/nixentric/Lowkey-Hugo-Theme) 是一个简洁的 Hugo 主题，但原版功能比较基础。我在此基础上做了大量定制，保留了其简洁的设计语言，同时增加了实用功能。

### 响应式 Header

桌面端采用左右布局：左侧头像 + 名字 + 简介，右侧导航链接 + 工具按钮。移动端改为居中头像，右上角汉堡菜单按钮，点击后滑出侧边栏。

侧边栏包含导航链接、搜索入口和主题切换按钮，点击遮罩层或链接自动关闭。

### 三态主题切换

主题支持三种模式循环切换：**日间 → 夜间 → 跟随系统**。状态存储在 `sessionStorage` 中，通过 `<html>` 标签的 `class="dark"` 和 `data-theme-mode` 属性控制。

为了防止页面加载时的主题闪烁（FOUC），在 `<head>` 中内联了一段脚本，在 DOM 渲染前就设置好主题状态：

```html
<script>
  (function() {
    var mode = sessionStorage.getItem('theme') || 'auto';
    var resolved = mode === 'auto'
      ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;
    if (resolved === 'dark') document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme-mode', mode);
  })();
</script>
```

这段内联脚本会在浏览器解析 CSS 之前执行，确保首屏渲染时主题就已经是正确的状态。

### 宽度切换

内容区域支持 800px / 1000px / 1200px 三档宽度切换，通过 CSS 变量 `--site-width` 实现，配合 `sessionStorage` 持久化偏好设置。

### Tailwind CSS 双模式

开发时使用 [Tailwind Play CDN](https://tailwindcss.com/docs/installation/play-cdn) 在浏览器端实时编译，避免了 Hugo 的 PostCSS 缓存问题——Hugo 的 `postCSS` pipe 会缓存结果，当 HTML 模板变化时不会自动失效，导致新增的 Tailwind class 不生效。

生产环境则使用标准的 [PostCSS](https://postcss.org/) 流程：Tailwind 编译 → [Autoprefixer](https://github.com/postcss/autoprefixer) → [cssnano](https://cssnano.github.io/cssnano/) 压缩 → 指纹命名。

```go
{{- if eq hugo.Environment "development" -}}
  <script src="https://cdn.tailwindcss.com/3.4.17"></script>
  <style type="text/tailwindcss">{{ $custom.Content | safeCSS }}</style>
{{- else -}}
  {{- $styles := resources.Get "css/tailwind.css" | postCSS | minify | fingerprint -}}
  <link rel="stylesheet" href="{{ $styles.RelPermalink }}" />
{{- end -}}
```

## 首页文章列表

首页的文章列表经过精心设计，每篇文章展示标题、日期、阅读时长、分类标签、封面图和摘要。

**封面图**自动从文章正文中提取第一张图片，不需要在 frontmatter 中手动指定。Hugo 模板通过正则匹配实现：

```go
{{ $firstImage := index (findRE "<img[^>]+src=\"([^\"]+)\"" .Content) 0 }}
```

为了避免小图拉伸导致视觉效果不佳，还加入了图片高度检测——自然高度不足屏幕一半的图片不会在列表页展示。摘要限制最多 4 行，超出部分自然截断。

列表项有入场动画，使用 CSS `@keyframes` 实现淡入上浮效果，每项错开 40ms，配合 `cubic-bezier(0.16, 1, 0.3, 1)` 缓动曲线让动画更自然。所有动画都尊重 [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) 媒体查询。

## 文章详情页

### 侧边栏 TOC 目录

桌面端（≥1280px）文章右侧显示浮动目录索引，方便在长文中快速跳转。

实现上采用 flex 布局 + `position: sticky`：TOC 作为 flex 子元素，通过负 margin 溢出到内容区右侧，不占用正文宽度。滚动时吸附在距顶部 24px 处。用 `overflow-x: clip`（而非 `hidden`）防止横向滚动条，同时不破坏 sticky 定位。

当前章节通过 `getBoundingClientRect()` 实时检测标题位置，进入视口顶部 20% 区域时高亮。高亮样式为左侧 emerald 色竖条，配合灰色指示线提供视觉引导：

```css
.toc-nav #TableOfContents a.toc-active {
  color: theme('colors.emerald.600');
  border-left-color: theme('colors.emerald.500');
}
```

### 全文搜索

搜索功能基于 Hugo 的 [JSON 输出格式](https://gohugo.io/templates/output-formats/)。构建时生成 `/index.json` 搜索索引，包含每篇文章的标题、URL、日期和摘要。前端通过 `fetch` 懒加载索引数据，在本地进行关键词过滤匹配。

支持 `Cmd+K`（Mac）/ `Ctrl+K` 快捷键打开搜索浮层，`ESC` 关闭。

### 代码块复制

所有 `<pre>` 代码块自动注入复制按钮，点击后图标变为对勾反馈，1.5 秒后恢复。基于 [`navigator.clipboard`](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) API 实现。

## 部署：Cloudflare Pages

选择 [Cloudflare Pages](https://pages.cloudflare.com/) 而非 [GitHub Pages](https://pages.github.com/) 的原因：

- 全球 CDN 节点更多，国内访问速度更优
- 构建速度快
- 原生支持 Functions（Serverless），可以跑统计 API
- 自动 HTTPS + 自定义域名

部署配置非常简单，连接 GitHub 仓库后设置：

| 配置项 | 值 |
|--------|-----|
| 构建命令 | `npm install && hugo --minify` |
| 输出目录 | `public` |
| HUGO_VERSION | `0.160.1` |
| NODE_VERSION | `20` |

每次 `git push` 到 master 分支，CF Pages 自动触发构建部署，通常 1-2 分钟完成。

## 评论系统：Giscus

[Giscus](https://giscus.app/) 基于 [GitHub Discussions](https://docs.github.com/en/discussions)，评论数据存储在博客仓库的 Discussions 中。相比 [Disqus](https://disqus.com/)，Giscus 没有广告、加载快、支持 Markdown、数据完全在自己的 GitHub 仓库里。

配置只需要在 `params.toml` 中填入仓库信息和 Discussion Category ID，模板会自动渲染评论组件。主题切换时通过 `postMessage` 同步 Giscus 的亮暗模式：

```javascript
giscusFrame.contentWindow.postMessage(
  { giscus: { setConfig: { theme: isDark ? 'dark' : 'light' } } },
  'https://giscus.app'
);
```

## 访问统计：CF Analytics + KV

[Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/) 提供免费的隐私友好型访问统计（无 Cookie），但其 GraphQL API 最多查询 90 天的历史数据。为了实现永久累计，我用 [Cloudflare KV](https://developers.cloudflare.com/kv/) 做了持久化方案。

### 架构设计

![访问统计架构](stats-architecture.png "Pages Function + CF Analytics API + KV Storage")

KV 中存储每个路径的累计数据：

```json
{ "total": 1234, "lastDate": "2026-04-15" }
```

**每天首次请求**时，Function 会查询 `lastDate` 到昨天的历史增量，累加到 `total` 后更新 KV。后续请求只查当天实时数据，返回 `KV total + 今天实时`。这样既保证数据不丢失，又最小化了 API 调用量。

### 前端缓存策略

前端使用 `sessionStorage` 缓存统计数据，有效期 5 分钟：

- **首页**：一次批量 API 请求获取当前页所有文章的 PV，写入缓存
- **详情页**：优先从缓存读取（首页已经预热过），过期才发请求
- **分页切换**：自动检测未缓存的路径，只请求缺失数据

这套策略确保了同一会话内浏览多篇文章几乎不产生额外请求。

## 总结

这套方案的核心优势：

- **零成本**：Hugo、CF Pages、Giscus、CF Analytics 全部免费
- **零运维**：纯静态 + Serverless，没有服务器需要维护
- **写作体验**：一个 Markdown 文件就是一篇文章，`git push` 就是发布
- **性能**：静态页面 + 全球 CDN，加载速度极快

博客的完整源码在 [GitHub](https://github.com/zhuzhuyule/blog) 上开源。如果你也在考虑搭建技术博客，Hugo + Cloudflare Pages 是一个非常值得尝试的组合。
