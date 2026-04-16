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

function buildSiteQuery(env, dateGe, dateLe) {
  var filters = [
    '{ siteTag: "' + env.CF_SITE_TAG + '" }',
    '{ date_geq: "' + dateGe + '" }',
  ];
  if (dateLe) filters.push('{ date_leq: "' + dateLe + '" }');

  return 'query { viewer { accounts(filter: { accountTag: "' + env.CF_ACCOUNT_ID + '" }) { data: rumPageloadEventsAdaptiveGroups(filter: { AND: [' + filters.join(',') + '] }, limit: 1) { count } } } }';
}

function extractCount(data) {
  return data?.data?.viewer?.accounts?.[0]?.data?.[0]?.count || 0;
}

export async function onRequestGet(context) {
  var { env } = context;

  if (!env.CF_API_KEY || !env.CF_ACCOUNT_ID || !env.CF_SITE_TAG) {
    return Response.json({ error: 'Missing config' }, { status: 500 });
  }

  var KV = env.STATS_KV;
  var kvKey = 'pv:__site__';
  var todayStr = today();
  var cutoff = daysAgo(30);

  try {
    var stored = null;
    if (KV) {
      var raw = await KV.get(kvKey);
      if (raw) stored = JSON.parse(raw);
    }
    if (!stored) stored = { total: 0, cutoffDate: cutoff };

    // 累加 cutoffDate ~ 30天前 的历史数据
    if (stored.cutoffDate < cutoff && KV) {
      var query = buildSiteQuery(env, stored.cutoffDate, daysAgo(31));
      var data = await cfQuery(env, query);
      stored.total += extractCount(data);
      stored.cutoffDate = cutoff;
      await KV.put(kvKey, JSON.stringify(stored));
    }

    // 查最近 30 天实时数据
    var recentQuery = buildSiteQuery(env, cutoff, null);
    var recentData = await cfQuery(env, recentQuery);
    var recentCount = extractCount(recentData);

    return Response.json({
      total_pageviews: stored.total + recentCount,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
