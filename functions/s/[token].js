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
