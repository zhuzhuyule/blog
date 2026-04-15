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

function buildSiteQuery(env, dateGe, dateLe) {
  const filters = [
    `{ siteTag: "${env.CF_SITE_TAG}" }`,
    `{ date_geq: "${dateGe}" }`,
  ];
  if (dateLe) filters.push(`{ date_leq: "${dateLe}" }`);

  return `query { viewer { accounts(filter: { accountTag: "${env.CF_ACCOUNT_ID}" }) {
    data: rumPageloadEventsAdaptiveGroups(filter: { AND: [${filters.join(',')}] }, limit: 1) { count }
  } } }`;
}

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.CF_API_KEY || !env.CF_ACCOUNT_ID || !env.CF_SITE_TAG) {
    return Response.json({ error: 'Missing config' }, { status: 500 });
  }

  const KV = env.STATS_KV;
  const kvKey = 'pv:__site__';
  const todayStr = today();

  try {
    let stored = null;
    if (KV) {
      const raw = await KV.get(kvKey);
      if (raw) stored = JSON.parse(raw);
    }
    if (!stored) stored = { total: 0, lastDate: todayStr };

    // 累加历史数据到 KV
    if (stored.lastDate < todayStr && KV) {
      const query = buildSiteQuery(env, stored.lastDate, yesterday());
      const data = await cfQuery(env, query);
      const count = data?.data?.viewer?.accounts?.[0]?.data?.[0]?.count || 0;
      stored.total += count;
      stored.lastDate = todayStr;
      await KV.put(kvKey, JSON.stringify(stored));
    }

    // 今天实时
    const todayQuery = buildSiteQuery(env, todayStr, null);
    const todayData = await cfQuery(env, todayQuery);
    const todayCount = todayData?.data?.viewer?.accounts?.[0]?.data?.[0]?.count || 0;

    return Response.json({
      total_pageviews: stored.total + todayCount,
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
