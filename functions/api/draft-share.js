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
