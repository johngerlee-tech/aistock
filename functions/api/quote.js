/**
 * Cloudflare Pages Function: /api/quote
 * 作用：作為 Cloudflare 邊緣伺服器 (Edge Worker) 端的反向代理與快取層，
 * 徹底解決瀏覽器端 CORS 限制，提供毫秒級台股上市 (TWSE) 與上櫃 (TPEx) 盤中即時報價。
 */

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const codesParam = url.searchParams.get('codes') || '2383,3017,2330,3324,6285';
  const codes = codesParam.split(',').map(c => c.trim()).filter(Boolean);

  // 構造 TWSE MIS 查詢通道 (同時嘗試 tse_上市 與 otc_上櫃 以確保 100% 命中)
  const channelParts = [];
  codes.forEach(code => {
    // 依台灣股號慣例，3, 5, 6, 8 開頭高機率為上櫃，其餘上市；為保險雙向登記
    if (/^[3568]/.test(code)) {
      channelParts.push(`otc_${code}.tw`);
      channelParts.push(`tse_${code}.tw`);
    } else {
      channelParts.push(`tse_${code}.tw`);
      channelParts.push(`otc_${code}.tw`);
    }
  });

  const nowTs = Date.now();
  const misUrl = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${channelParts.join('|')}&json=1&delay=0&_=${nowTs}`;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=10, s-maxage=10' // 邊緣快取 10 秒，防止過度頻繁請求被證交所封鎖
  };

  try {
    const resp = await fetch(misUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://mis.twse.com.tw/stock/fibest.jsp'
      }
    });

    if (!resp.ok) {
      throw new Error(`MIS response status ${resp.status}`);
    }

    const data = await resp.json();
    const results = {};

    if (data && Array.isArray(data.msgArray)) {
      data.msgArray.forEach(item => {
        const sid = item.c;
        if (!sid || results[sid]) return; // 若已取得則跳過

        const yestClose = parseFloat(item.y) || 0;
        let curPrice = parseFloat(item.z);

        // 盤前或暫無撮合成交時，取五檔委買賣最佳參考價
        if (isNaN(curPrice) || curPrice === 0) {
          const buy1 = parseFloat((item.b || '').split('_')[0]) || 0;
          const sell1 = parseFloat((item.a || '').split('_')[0]) || 0;
          curPrice = buy1 > 0 ? buy1 : (sell1 > 0 ? sell1 : yestClose);
        }

        const change = curPrice > 0 && yestClose > 0 ? Math.round((curPrice - yestClose) * 100) / 100 : 0;
        const changePct = yestClose > 0 ? Math.round((change / yestClose) * 10000) / 100 : 0;

        results[sid] = {
          id: sid,
          name: item.n || sid,
          market: item.ch && item.ch.startsWith('otc') ? '上櫃' : '上市',
          price: curPrice,
          yestClose: yestClose,
          change: change,
          changePct: changePct,
          high: parseFloat(item.h) || curPrice,
          low: parseFloat(item.l) || curPrice,
          volume: parseInt(item.v, 10) || 0,
          time: item.t || new Date().toLocaleTimeString('zh-TW', { hour12: false })
        };
      });
    }

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      source: 'Cloudflare_Edge_MIS_Proxy',
      data: results
    }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
      fallback: true
    }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
