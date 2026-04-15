function today() {
  return new Date().toISOString().slice(0, 10);
}

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function cfQuery(env, query) {
  const resp = await fetch('https://api.cloudflare.com/client/v4/graphql', {
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

// 查某路径某天区间的 PV
function buildQuery(env, path, dateGe, dateLe) {
  const filters = [
    `{ siteTag: "${env.CF_SITE_TAG}" }`,
    `{ date_geq: "${dateGe}" }`,
  ];
  if (dateLe) filters.push(`{ date_leq: "${dateLe}" }`);
  if (path) filters.push(`{ requestPath: "${path}" }`);

  return `query { viewer { accounts(filter: { accountTag: "${env.CF_ACCOUNT_ID}" }) {
    data: rumPageloadEventsAdaptiveGroups(filter: { AND: [${filters.join(',')}] }, limit: 1) { count }
  } } }`;
}

// 获取某路径的累计 PV（KV + 今天实时）
async function getStats(env, path) {
  const KV = env.STATS_KV;
  const kvKey = 'pv:' + (path || '__site__');
  const todayStr = today();

  // 读 KV
  let stored = null;
  if (KV) {
    const raw = await KV.get(kvKey);
    if (raw) stored = JSON.parse(raw);
  }

  if (!stored) stored = { total: 0, lastDate: todayStr };

  // 如果 lastDate < today，把 lastDate ~ yesterday 的数据累加进 total
  if (stored.lastDate < todayStr && KV) {
    const query = buildQuery(env, path, stored.lastDate, yesterday());
    const data = await cfQuery(env, query);
    const count = data?.data?.viewer?.accounts?.[0]?.data?.[0]?.count || 0;
    stored.total += count;
    stored.lastDate = todayStr;
    await KV.put(kvKey, JSON.stringify(stored));
  }

  // 查今天的实时数据
  const todayQuery = buildQuery(env, path, todayStr, null);
  const todayData = await cfQuery(env, todayQuery);
  const todayCount = todayData?.data?.viewer?.accounts?.[0]?.data?.[0]?.count || 0;

  return stored.total + todayCount;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const paths = url.searchParams.get('paths');
  const path = url.searchParams.get('path');

  if (!env.CF_API_KEY || !env.CF_ACCOUNT_ID || !env.CF_SITE_TAG) {
    return Response.json({ error: 'Missing config' }, { status: 500 });
  }

  const headers = {
    'Cache-Control': 'public, max-age=300',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    // 批量模式
    if (paths) {
      const pathList = paths.split(',').filter(Boolean).slice(0, 50);
      const results = {};
      await Promise.all(pathList.map(async (p) => {
        results[p] = { pageviews: await getStats(env, p) };
      }));
      return Response.json(results, { headers });
    }

    // 单页模式
    const pv = await getStats(env, path || '/');
    return Response.json({ path: path || '/', pageviews: pv }, { headers });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
