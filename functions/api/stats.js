function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n) {
  var d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function cfQuery(env, query) {
  var resp = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'X-Auth-Email': env.CF_API_EMAIL,
      'X-Auth-Key': env.CF_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  return resp.json();
}

function buildQuery(env, path, dateGe, dateLe) {
  var filters = [
    '{ siteTag: "' + env.CF_SITE_TAG + '" }',
    '{ date_geq: "' + dateGe + '" }',
  ];
  if (dateLe) filters.push('{ date_leq: "' + dateLe + '" }');
  if (path) filters.push('{ requestPath: "' + path + '" }');

  return 'query { viewer { accounts(filter: { accountTag: "' + env.CF_ACCOUNT_ID + '" }) { data: rumPageloadEventsAdaptiveGroups(filter: { AND: [' + filters.join(',') + '] }, limit: 1) { count } } } }';
}

function extractCount(data) {
  return data?.data?.viewer?.accounts?.[0]?.data?.[0]?.count || 0;
}

// KV 存储格式：{ total: number, cutoffDate: "YYYY-MM-DD" }
// total = cutoffDate 之前的所有 PV（已固化）
// 每次请求：实时查最近 30 天数据，返回 total + last30days
async function getStats(env, path) {
  var KV = env.STATS_KV;
  var kvKey = 'pv:' + (path || '__site__');
  var todayStr = today();
  var cutoff = daysAgo(30); // 30 天前

  // 读 KV
  var stored = null;
  if (KV) {
    var raw = await KV.get(kvKey);
    if (raw) stored = JSON.parse(raw);
  }
  if (!stored) stored = { total: 0, cutoffDate: cutoff };

  // 如果 cutoffDate 比 30 天前还早，把中间的数据累加到 total
  if (stored.cutoffDate < cutoff && KV) {
    var query = buildQuery(env, path, stored.cutoffDate, daysAgo(31));
    var data = await cfQuery(env, query);
    stored.total += extractCount(data);
    stored.cutoffDate = cutoff;
    await KV.put(kvKey, JSON.stringify(stored));
  }

  // 查最近 30 天的实时数据（这部分始终从 API 拿，不固化）
  var recentQuery = buildQuery(env, path, cutoff, null);
  var recentData = await cfQuery(env, recentQuery);
  var recentCount = extractCount(recentData);

  return stored.total + recentCount;
}

export async function onRequestGet(context) {
  var { request, env } = context;
  var url = new URL(request.url);
  var paths = url.searchParams.get('paths');
  var path = url.searchParams.get('path');

  if (!env.CF_API_KEY || !env.CF_ACCOUNT_ID || !env.CF_SITE_TAG) {
    return Response.json({ error: 'Missing config' }, { status: 500 });
  }

  var headers = {
    'Cache-Control': 'public, max-age=300',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    // 批量模式
    if (paths) {
      var pathList = paths.split(',').filter(Boolean).slice(0, 50);
      var results = {};
      await Promise.all(pathList.map(async function(p) {
        results[p] = { pageviews: await getStats(env, p) };
      }));
      return Response.json(results, { headers: headers });
    }

    // 单页模式
    var pv = await getStats(env, path || '/');
    return Response.json({ path: path || '/', pageviews: pv }, { headers: headers });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
