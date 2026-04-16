# Draft Sharing System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a password-protected drafts section (`/drafts/`) with token-based sharing (`/s/<token>`), using Cloudflare Access for authentication and Pages Functions for the sharing proxy.

**Architecture:** Hugo generates drafts as a normal content section at `/drafts/`. Cloudflare Access protects `/drafts/*` with email OTP. A Pages Function at `/s/[token]` validates tokens stored in KV and proxies draft content with a "shared via link" banner. Token CRUD is handled by `/api/draft-share` (also behind Access). The frontend uses JS to query share status and provide create/reset/revoke UI.

**Tech Stack:** Hugo (content/templates), Cloudflare Pages Functions (token API + share proxy), Cloudflare KV (token storage), Cloudflare Access (authentication), Tailwind CSS (styling)

---

## File Structure

```
# Hugo content & templates
content/drafts/_index.md                          # Drafts section index
layouts/drafts/list.html                          # Draft list template (with share status badges)
layouts/drafts/single.html                        # Draft article template (with share UI)

# Cloudflare Pages Functions
functions/api/draft-share.js                      # Token CRUD API (GET/POST/DELETE)
functions/s/[token].js                            # Share proxy (validates token, serves content)

# KV storage (reuses existing STATS_KV)
# share:<token> → { "slug": "<slug>", "createdAt": "<ISO date>" }
# draft:<slug>  → { "token": "<token>" }
```

---

### Task 1: Hugo Drafts Content Section

**Files:**
- Create: `content/drafts/_index.md`

- [ ] **Step 1: Create the drafts section index**

Create `content/drafts/_index.md`:

```markdown
---
title: "草稿"
---
```

- [ ] **Step 2: Create a test draft post**

Create `content/drafts/test-draft/index.md`:

```markdown
---
title: "测试草稿文章"
date: 2026-04-16
description: "这是一篇用于测试草稿系统的文章"
categories: ["未分类"]
tags: ["测试"]
---

这是一篇草稿文章，用于验证草稿系统功能。

## 测试内容

一些测试内容，确保文章渲染正常。
```

- [ ] **Step 3: Verify Hugo builds the drafts section**

Run: `cd /Users/zac/code/github/blog/my-blog && hugo --minify 2>&1 | head -20`
Then: `ls public/drafts/`
Expected: `index.html` and `test-draft/index.html` exist in `public/drafts/`

- [ ] **Step 4: Commit**

```bash
git add content/drafts/
git commit -m "feat: add drafts content section with test post"
```

---

### Task 2: Draft List Template

**Files:**
- Create: `layouts/drafts/list.html`

The list template reuses the homepage post-list pattern from `themes/lowkey/layouts/index.html`, but adds a share status badge (populated by JS after page load).

- [ ] **Step 1: Create the draft list template**

Create `layouts/drafts/list.html`:

```html
{{ define "main" }}

<div class="flex flex-col gap-4 mb-8">
  <h1 class="text-2xl font-extrabold">{{ .Title }}</h1>
  <p class="text-sm text-gray-500 dark:text-gray-400">这些文章尚未正式发布，仅登录用户可见。</p>
</div>

{{ $pages := .Pages }}
{{ if $pages }}
<section class="post-list">
  {{ range $index, $page := $pages }}
  <article class="post-item post-animate" style="animation-delay: {{ mul $index 40 }}ms" data-draft-slug="{{ $page.File.ContentBaseName }}">
    <div class="flex items-center gap-2">
      <a href="{{ $page.RelPermalink }}" class="post-title">{{ $page.Title }}</a>
      <span class="draft-share-badge hidden text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">已分享</span>
    </div>
    <div class="post-meta">
      <time datetime="{{ $page.Date.Format "2006-01-02" }}">{{ $page.Date.Format "2006年1月2日" }}</time>
      <span>&middot;</span>
      <span>{{ $page.ReadingTime }} 分钟阅读</span>
      {{ with ($page.GetTerms "categories") }}
      {{ range . }}
      <span>&middot;</span>
      <a href="{{ .RelPermalink }}" class="post-tag">{{ .LinkTitle }}</a>
      {{ end }}
      {{ end }}
    </div>
    {{ if $page.Params.description }}
    <p class="post-summary">{{ $page.Params.description }}</p>
    {{ end }}
  </article>
  {{ end }}
</section>
{{ else }}
<p class="text-gray-500 dark:text-gray-400">暂无草稿。</p>
{{ end }}

<script>
(function() {
  var articles = document.querySelectorAll('[data-draft-slug]');
  if (!articles.length) return;
  var slugs = [];
  articles.forEach(function(el) { slugs.push(el.getAttribute('data-draft-slug')); });

  fetch('/api/draft-share?slugs=' + encodeURIComponent(slugs.join(',')))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      articles.forEach(function(el) {
        var slug = el.getAttribute('data-draft-slug');
        if (data[slug] && data[slug].shared) {
          el.querySelector('.draft-share-badge').classList.remove('hidden');
        }
      });
    })
    .catch(function() {});
})();
</script>

{{ end }}
```

- [ ] **Step 2: Verify the list template renders**

Run: `cd /Users/zac/code/github/blog/my-blog && hugo --minify 2>&1 | head -5`
Then: `grep -l "draft-share-badge" public/drafts/index.html`
Expected: File found with the badge markup

- [ ] **Step 3: Commit**

```bash
git add layouts/drafts/list.html
git commit -m "feat: add draft list template with share status badges"
```

---

### Task 3: Draft Single Template

**Files:**
- Create: `layouts/drafts/single.html`

Extends the existing single template from `themes/lowkey/layouts/_default/single.html`, adding a share action bar between the header and content. Removes comments (Giscus) and copyright section since drafts don't need them.

- [ ] **Step 1: Create the draft single template**

Create `layouts/drafts/single.html`:

```html
{{ define "main" }}

<div class="article-layout">
  <article class="article-content flex flex-col gap-4 sm:gap-8">
    <header class="flex flex-col gap-2">
      <h2 class="title-large">{{ .Title }}</h2>

      <div class="post-meta">
        <time datetime="{{ .PublishDate }}">{{ .PublishDate.Format "2006年1月2日" }}</time>
        <span>&middot;</span>
        <span>{{ .ReadingTime }} 分钟阅读</span>
        {{ with (.GetTerms "categories") }}
        {{ range . }}
        <span>&middot;</span>
        <a href="{{ .RelPermalink }}" class="post-tag">{{ .LinkTitle }}</a>
        {{ end }}
        {{ end }}
        <span class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 ml-1">草稿</span>
      </div>
    </header>

    {{/* 分享操作区 */}}
    <div id="draft-share-bar" class="hidden p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" data-slug="{{ .File.ContentBaseName }}">
      {{/* 未分享状态 */}}
      <div id="share-not-shared" class="hidden flex items-center justify-between">
        <span class="text-sm text-gray-500 dark:text-gray-400">此草稿尚未分享</span>
        <button onclick="createShareLink()" class="text-sm px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors">
          创建分享链接
        </button>
      </div>
      {{/* 已分享状态 */}}
      <div id="share-shared" class="hidden flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-blue-600 dark:text-blue-400 font-medium">已分享</span>
          <div class="flex gap-2">
            <button onclick="resetShareLink()" class="text-sm px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              重置链接
            </button>
            <button onclick="revokeShareLink()" class="text-sm px-3 py-1.5 rounded border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
              取消分享
            </button>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <input id="share-url" type="text" readonly class="flex-1 text-sm px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300" />
          <button onclick="copyShareLink()" id="copy-share-btn" class="text-sm px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
            复制
          </button>
        </div>
      </div>
    </div>

    <section>{{ .Content | emojify }}</section>

    {{/* 上一篇 / 下一篇 */}}
    {{ if or .PrevInSection .NextInSection }}
    <nav class="post-nav">
      {{ with .PrevInSection }}
      <a href="{{ .RelPermalink }}" class="post-nav-item post-nav-prev">
        <span class="post-nav-label">上一篇</span>
        <span class="post-nav-title">{{ .Title }}</span>
      </a>
      {{ end }}
      {{ with .NextInSection }}
      <a href="{{ .RelPermalink }}" class="post-nav-item post-nav-next">
        <span class="post-nav-label">下一篇</span>
        <span class="post-nav-title">{{ .Title }}</span>
      </a>
      {{ end }}
    </nav>
    {{ end }}

    <footer>
      {{ with (.GetTerms "tags") }}
        <div class="pb-14 taxonomy-list tags-list">
        {{ range . }}
          <a href="{{ .RelPermalink }}" alt="{{ .LinkTitle }}">
            {{ .LinkTitle }}
          </a>
        {{ end }}
        </div>
      {{ end }}
    </footer>
  </article>

  {{ if .TableOfContents }}
  <aside class="toc-sidebar">
    <nav class="toc-nav" id="toc-nav">
      <h3 class="toc-heading">目录</h3>
      {{ .TableOfContents }}
    </nav>
  </aside>
  <div id="mobile-toc-source" class="hidden">{{ .TableOfContents }}</div>
  {{ end }}
</div>

<script>
(function() {
  var bar = document.getElementById('draft-share-bar');
  var slug = bar.getAttribute('data-slug');
  var notShared = document.getElementById('share-not-shared');
  var shared = document.getElementById('share-shared');
  var shareUrl = document.getElementById('share-url');

  function showState(isShared, token) {
    bar.classList.remove('hidden');
    if (isShared) {
      notShared.classList.add('hidden');
      shared.classList.remove('hidden');
      shareUrl.value = location.origin + '/s/' + token;
    } else {
      notShared.classList.remove('hidden');
      shared.classList.add('hidden');
    }
  }

  // 查询当前分享状态
  fetch('/api/draft-share?slug=' + encodeURIComponent(slug))
    .then(function(r) { return r.json(); })
    .then(function(d) { showState(d.shared, d.token); })
    .catch(function() { showState(false); });

  // 创建分享链接
  window.createShareLink = function() {
    fetch('/api/draft-share?slug=' + encodeURIComponent(slug), { method: 'POST' })
      .then(function(r) { return r.json(); })
      .then(function(d) { showState(true, d.token); });
  };

  // 重置分享链接
  window.resetShareLink = function() {
    if (!confirm('重置后旧链接将失效，确定？')) return;
    fetch('/api/draft-share?slug=' + encodeURIComponent(slug) + '&reset=1', { method: 'POST' })
      .then(function(r) { return r.json(); })
      .then(function(d) { showState(true, d.token); });
  };

  // 取消分享
  window.revokeShareLink = function() {
    if (!confirm('取消分享后链接将失效，确定？')) return;
    fetch('/api/draft-share?slug=' + encodeURIComponent(slug), { method: 'DELETE' })
      .then(function(r) { return r.json(); })
      .then(function() { showState(false); });
  };

  // 复制链接
  window.copyShareLink = function() {
    var url = shareUrl.value;
    navigator.clipboard.writeText(url).then(function() {
      var btn = document.getElementById('copy-share-btn');
      btn.textContent = '已复制';
      setTimeout(function() { btn.textContent = '复制'; }, 1500);
    });
  };
})();
</script>

{{ end }}
```

- [ ] **Step 2: Verify the single template renders**

Run: `cd /Users/zac/code/github/blog/my-blog && hugo --minify 2>&1 | head -5`
Then: `grep -l "draft-share-bar" public/drafts/test-draft/index.html`
Expected: File found with share bar markup

- [ ] **Step 3: Commit**

```bash
git add layouts/drafts/single.html
git commit -m "feat: add draft single template with share action bar"
```

---

### Task 4: Token CRUD API

**Files:**
- Create: `functions/api/draft-share.js`

Handles token management. All endpoints are behind Cloudflare Access (configured later). Uses existing `STATS_KV` binding with `share:` and `draft:` prefixes.

Token format: 12-char random alphanumeric string generated via `crypto.getRandomValues()`.

- [ ] **Step 1: Create the draft-share API function**

Create `functions/api/draft-share.js`:

```javascript
function generateToken() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, function(b) { return chars[b % chars.length]; }).join('');
}

// GET /api/draft-share?slug=xxx        → 查询单篇分享状态
// GET /api/draft-share?slugs=a,b,c     → 批量查询分享状态
// POST /api/draft-share?slug=xxx       → 创建分享 token（已有则返回现有的）
// POST /api/draft-share?slug=xxx&reset=1 → 重置 token
// DELETE /api/draft-share?slug=xxx     → 撤销分享

export async function onRequest(context) {
  var { request, env } = context;
  var url = new URL(request.url);
  var KV = env.STATS_KV;
  var method = request.method;

  var headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  // 批量查询
  if (method === 'GET' && url.searchParams.has('slugs')) {
    var slugs = url.searchParams.get('slugs').split(',').filter(Boolean).slice(0, 50);
    var results = {};
    await Promise.all(slugs.map(async function(slug) {
      var raw = await KV.get('draft:' + slug);
      if (raw) {
        var data = JSON.parse(raw);
        results[slug] = { shared: true, token: data.token };
      } else {
        results[slug] = { shared: false };
      }
    }));
    return new Response(JSON.stringify(results), { headers: headers });
  }

  var slug = url.searchParams.get('slug');
  if (!slug) {
    return new Response(JSON.stringify({ error: 'Missing slug' }), { status: 400, headers: headers });
  }

  // 单篇查询
  if (method === 'GET') {
    var raw = await KV.get('draft:' + slug);
    if (raw) {
      var data = JSON.parse(raw);
      return new Response(JSON.stringify({ shared: true, token: data.token }), { headers: headers });
    }
    return new Response(JSON.stringify({ shared: false }), { headers: headers });
  }

  // 创建 / 重置
  if (method === 'POST') {
    var reset = url.searchParams.get('reset') === '1';
    var existing = await KV.get('draft:' + slug);

    if (existing && !reset) {
      var data = JSON.parse(existing);
      return new Response(JSON.stringify({ token: data.token }), { headers: headers });
    }

    // 删除旧 token
    if (existing) {
      var oldData = JSON.parse(existing);
      await KV.delete('share:' + oldData.token);
    }

    // 创建新 token
    var token = generateToken();
    await KV.put('share:' + token, JSON.stringify({ slug: slug, createdAt: new Date().toISOString().slice(0, 10) }));
    await KV.put('draft:' + slug, JSON.stringify({ token: token }));

    return new Response(JSON.stringify({ token: token }), { headers: headers });
  }

  // 撤销分享
  if (method === 'DELETE') {
    var raw = await KV.get('draft:' + slug);
    if (raw) {
      var data = JSON.parse(raw);
      await KV.delete('share:' + data.token);
      await KV.delete('draft:' + slug);
    }
    return new Response(JSON.stringify({ ok: true }), { headers: headers });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: headers });
}
```

- [ ] **Step 2: Verify the function file is valid JS**

Run: `node -c /Users/zac/code/github/blog/my-blog/functions/api/draft-share.js`
Expected: No syntax errors

- [ ] **Step 3: Commit**

```bash
git add functions/api/draft-share.js
git commit -m "feat: add draft-share token CRUD API"
```

---

### Task 5: Share Proxy Function

**Files:**
- Create: `functions/s/[token].js`

Validates the token from KV, fetches the corresponding draft page via `env.ASSETS.fetch()`, injects a "shared via link" banner before `</body>`, and returns the modified HTML.

- [ ] **Step 1: Create the share proxy function**

Create `functions/s/[token].js`:

```javascript
export async function onRequest(context) {
  var { params, env } = context;
  var token = params.token;
  var KV = env.STATS_KV;

  // 验证 token
  var raw = await KV.get('share:' + token);
  if (!raw) {
    return new Response('链接无效或已过期', {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  var data = JSON.parse(raw);
  var slug = data.slug;

  // 获取草稿页面静态内容
  var draftUrl = new URL('/drafts/' + slug + '/', context.request.url);
  var resp = await env.ASSETS.fetch(draftUrl.toString());

  if (!resp.ok) {
    return new Response('草稿不存在', {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  var html = await resp.text();

  // 注入分享横幅 + 隐藏分享操作区
  var banner = '<div style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#3b82f6;color:white;text-align:center;padding:8px 16px;font-size:14px;">你正在通过分享链接查看这篇草稿</div><div style="height:40px;"></div>';

  var hideShareBar = '<style>#draft-share-bar{display:none!important;}</style>';

  html = html.replace('<body', '<body' + ' data-shared="true"');
  html = html.replace('</body>', hideShareBar + banner + '</body>');

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
```

- [ ] **Step 2: Verify the function file is valid JS**

Run: `node -c /Users/zac/code/github/blog/my-blog/functions/s/\\[token\\].js`
Expected: No syntax errors

- [ ] **Step 3: Commit**

```bash
git add "functions/s/[token].js"
git commit -m "feat: add share proxy function for token-based draft access"
```

---

### Task 6: Local Integration Test

**Files:** None (testing only)

- [ ] **Step 1: Build and start local preview**

Run:
```bash
cd /Users/zac/code/github/blog/my-blog && hugo --minify && npx wrangler pages dev public --port 8788
```

Expected: Server starts on port 8788

- [ ] **Step 2: Verify draft list page**

Open `http://localhost:8788/drafts/` in browser.
Expected: Shows "草稿" heading, lists "测试草稿文章" with metadata.

- [ ] **Step 3: Verify draft single page**

Open `http://localhost:8788/drafts/test-draft/` in browser.
Expected: Shows the draft article with "草稿" badge and share action bar (initially showing "此草稿尚未分享" + "创建分享链接" button).

- [ ] **Step 4: Test token creation**

Click "创建分享链接" button.
Expected: Share bar updates to show the share URL, copy button, reset and revoke buttons.

- [ ] **Step 5: Test share proxy**

Copy the generated share URL (e.g., `http://localhost:8788/s/V1StGXR8_Z5j`) and open in a new incognito window.
Expected: Draft content displays with a blue banner "你正在通过分享链接查看这篇草稿". No share action bar visible.

- [ ] **Step 6: Test token revocation**

Go back to the draft page, click "取消分享", confirm.
Then reload the share URL in incognito.
Expected: Share URL now returns "链接无效或已过期".

- [ ] **Step 7: Verify draft list share badge**

Go to `/drafts/` list page. Create a share link for the test draft again.
Reload `/drafts/`.
Expected: "已分享" badge appears next to the test draft title.

- [ ] **Step 8: Commit (clean up test draft if desired)**

```bash
git add -A
git commit -m "test: verify draft sharing system integration"
```

---

### Task 7: Cloudflare Access Configuration

**Files:** None (Cloudflare Dashboard configuration)

This task requires manual configuration in the Cloudflare Dashboard. It cannot be automated via code.

- [ ] **Step 1: Configure Cloudflare Access**

In Cloudflare Dashboard → Zero Trust → Access → Applications:

1. Create a new **Self-hosted** application:
   - Application name: `Blog Drafts`
   - Session duration: `24 hours`
   - Application domain: `blog.ause.cc`
   - Path: `/drafts`

2. Add a policy:
   - Policy name: `Allow Owner`
   - Action: `Allow`
   - Include: Emails — add your email address

3. Save the application.

- [ ] **Step 2: Verify Access protection**

Open `https://blog.ause.cc/drafts/` in an incognito browser.
Expected: Redirected to Cloudflare Access login page, asks for email.

Verify `https://blog.ause.cc/s/<token>` is NOT blocked (it's outside the `/drafts` path).

- [ ] **Step 3: Document the setup**

Update `CLAUDE.md` to mention the drafts system:

Add after the "写文章规范" line:

```markdown
## 草稿系统

- 草稿放在 `content/drafts/{slug}/index.md`，受 Cloudflare Access 保护
- 分享链接通过 `/s/<token>` 访问，token 存储在 KV
- 发布：将目录从 `content/drafts/` 移到 `content/posts/`
- 管理分享：在草稿文章页面内操作（创建/重置/取消分享）
```

```bash
git add CLAUDE.md
git commit -m "docs: add drafts system documentation to CLAUDE.md"
```

---

### Task 8: Delete Test Draft (Optional Cleanup)

**Files:**
- Delete: `content/drafts/test-draft/`

- [ ] **Step 1: Remove the test draft**

```bash
rm -rf /Users/zac/code/github/blog/my-blog/content/drafts/test-draft/
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove test draft post"
```
