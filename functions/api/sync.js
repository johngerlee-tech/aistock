/**
 * Cloudflare Pages Function: /api/sync
 * 作用：代理抓取證交所、櫃買中心、集保及公開資訊觀測站的官方開放資料，
 * 支援邊緣快取 1 小時，避免頻繁請求官方 API 被限流。
 */

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const target = url.searchParams.get('type') || 'twse_all';

  const ENDPOINT_MAP = {
    twse_all: 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL',
    tpex_all: 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes',
    mops_rev: 'https://openapi.twse.com.tw/v1/opendata/t187ap05_L',
    tdcc_holders: 'https://openapi.tdcc.com.tw/v1/opendata/1-4'
  };

  const targetUrl = ENDPOINT_MAP[target];
  if (!targetUrl) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid type parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600' // 快取 1 小時
  };

  try {
    const resp = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (AI-Investment-Station/Cloudflare-Worker)'
      }
    });

    if (!resp.ok) {
      throw new Error(`Upstream returned ${resp.status}`);
    }

    const json = await resp.json();
    return new Response(JSON.stringify({
      success: true,
      type: target,
      count: Array.isArray(json) ? json.length : 1,
      data: json
    }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), { status: 502, headers });
  }
}
