export async function onRequest(context) {
  var { params, env } = context;
  var token = params.token;
  var KV = env.STATS_KV;

  // 验证 token
  var raw = await KV.get('share:' + token);
  if (!raw) {
    var page404 = await env.ASSETS.fetch(new URL('/404.html', context.request.url).toString());
    var html404 = await page404.text();
    var notice = '<div style="text-align:center;padding:12px 16px;font-size:14px;color:#9ca3af;">此分享链接已失效或不存在</div>';
    html404 = html404.replace('</main>', notice + '</main>');
    return new Response(html404, {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  var data = JSON.parse(raw);
  var slug = data.slug;

  // 获取草稿页面静态内容
  var draftUrl = new URL('/d/' + slug + '/', context.request.url);
  var resp = await env.ASSETS.fetch(draftUrl.toString());

  if (!resp.ok) {
    var page404 = await env.ASSETS.fetch(new URL('/404.html', context.request.url).toString());
    var html404 = await page404.text();
    var notice = '<div style="text-align:center;padding:12px 16px;font-size:14px;color:#9ca3af;">此草稿已被删除或移动</div>';
    html404 = html404.replace('</main>', notice + '</main>');
    return new Response(html404, {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  var html = await resp.text();

  // 注入分享横幅 + 隐藏分享操作区
  var banner = '<style>body[data-shared]{padding-top:40px;}</style><div style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#3b82f6;color:white;text-align:center;padding:8px 16px;font-size:14px;height:40px;box-sizing:border-box;">你正在通过分享链接查看这篇草稿</div>';

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
