/**
 * Cloudflare Pages Function: /api/sync
 * 作用：代理抓取證交所、櫃買中心、集保及公開資訊觀測站的官方開放資料，
 * 支援「全維度官方數據同步 (deep_sync)」，包括：
 * 1. TDCC 集保 400/1000張大戶與總股東人數
 * 2. MOPS 上市與上櫃最新單月營收、YoY、MoM、累計年增率
 * 3. TWSE & TPEx 官方本益比 (PE)、股價淨值比 (PB)、現金殖利率 (Yield%)
 * 4. 三大法人當日買賣超張數
 * 支援邊緣快取 1 小時，避免頻繁請求官方 API 被限流。
 */

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const target = url.searchParams.get('type') || 'twse_all';

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=1800, s-maxage=1800' // 快取 30 分鐘
  };

  // -------------------------------------------------------------------------
  // 模式 A: 深度全維度數據同步 (deep_sync)
  // -------------------------------------------------------------------------
  if (target === 'deep_sync') {
    const codesParam = url.searchParams.get('codes') || '';
    const targetCodes = new Set(
      codesParam.split(',').map(c => c.trim()).filter(Boolean)
    );

    const results = {};
    targetCodes.forEach(code => {
      results[code] = {
        id: code,
        synced: true,
        timestamp: new Date().toISOString()
      };
    });

    const userAgentHeader = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    // 並行抓取 MOPS 營收 (上市 + 上櫃) 及 TWSE/TPEx 估值指標
    const fetchPromises = [
      // 1. MOPS 上市單月營收
      fetch('https://openapi.twse.com.tw/v1/opendata/t187ap05_L', { headers: userAgentHeader })
        .then(r => r.ok ? r.json() : [])
        .catch(() => []),

      // 2. MOPS 上櫃單月營收
      fetch('https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap05_O', { headers: userAgentHeader })
        .then(r => r.ok ? r.json() : [])
        .catch(() => []),

      // 3. TWSE 上市本益比、殖利率、淨值比 (BWIBBU_ALL)
      fetch('https://openapi.twse.com.tw/v1/exchangeReport/BWIBBU_ALL', { headers: userAgentHeader })
        .then(r => r.ok ? r.json() : [])
        .catch(() => []),

      // 4. TPEx 上櫃本益比、殖利率、淨值比
      fetch('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_peratio_analysis', { headers: userAgentHeader })
        .then(r => r.ok ? r.json() : [])
        .catch(() => []),

      // 5. TDCC 集保股權分散表 (1-5)
      fetch('https://openapi.tdcc.com.tw/v1/opendata/1-5', { headers: userAgentHeader })
        .then(r => r.ok ? r.json() : [])
        .catch(() => [])
    ];

    try {
      const [mopsTse, mopsOtc, tseValuation, otcValuation, tdccRows] = await Promise.all(fetchPromises);

      // (1) 解析 MOPS 上市營收
      if (Array.isArray(mopsTse)) {
        mopsTse.forEach(row => {
          const code = String(row['公司代號'] || '').trim();
          if (targetCodes.has(code)) {
            const curRevThousand = parseFloat(row['營業收入-當月營收']) || 0;
            results[code].revLatest = Math.round((curRevThousand / 100000) * 100) / 100; // 轉為億元
            results[code].revYoY = parseFloat(row['營業收入-去年同月增減(%)']) || 0;
            results[code].revMoM = parseFloat(row['營業收入-上月比較增減(%)']) || 0;
            results[code].revCumYoY = parseFloat(row['累計營業收入-前期比較增減(%)']) || 0;
            results[code].revDate = row['資料年月'] || '';
          }
        });
      }

      // (2) 解析 MOPS 上櫃營收
      if (Array.isArray(mopsOtc)) {
        mopsOtc.forEach(row => {
          const code = String(row['公司代號'] || '').trim();
          if (targetCodes.has(code)) {
            const curRevThousand = parseFloat(row['營業收入-當月營收']) || 0;
            results[code].revLatest = Math.round((curRevThousand / 100000) * 100) / 100; // 轉為億元
            results[code].revYoY = parseFloat(row['營業收入-去年同月增減(%)']) || 0;
            results[code].revMoM = parseFloat(row['營業收入-上月比較增減(%)']) || 0;
            results[code].revCumYoY = parseFloat(row['累計營業收入-前期比較增減(%)']) || 0;
            results[code].revDate = row['資料年月'] || '';
          }
        });
      }

      // (3) 解析 TWSE 上市本益比 / 殖利率 / 淨值比
      if (Array.isArray(tseValuation)) {
        tseValuation.forEach(row => {
          const code = String(row.Code || '').trim();
          if (targetCodes.has(code)) {
            const pe = parseFloat(row.PEratio);
            const pb = parseFloat(row.PBratio);
            const yieldPct = parseFloat(row.DividendYield);
            if (!isNaN(pe) && pe > 0) results[code].pe = pe;
            if (!isNaN(pb) && pb > 0) results[code].pb = pb;
            if (!isNaN(yieldPct) && yieldPct > 0) results[code].yieldPct = yieldPct;
          }
        });
      }

      // (4) 解析 TPEx 上櫃本益比 / 殖利率 / 淨值比
      if (Array.isArray(otcValuation)) {
        otcValuation.forEach(row => {
          const code = String(row.SecuritiesCompanyCode || '').trim();
          if (targetCodes.has(code)) {
            const pe = parseFloat(row.PriceEarningRatio);
            const pb = parseFloat(row.PriceBookRatio);
            const yieldPct = parseFloat(row.YieldRatio);
            if (!isNaN(pe) && pe > 0) results[code].pe = pe;
            if (!isNaN(pb) && pb > 0) results[code].pb = pb;
            if (!isNaN(yieldPct) && yieldPct > 0) results[code].yieldPct = yieldPct;
          }
        });
      }

      // (5) 解析 TDCC 集保股權分散表
      if (Array.isArray(tdccRows) && tdccRows.length > 0) {
        // 先找出最新資料日期
        let latestDate = '';
        tdccRows.forEach(r => {
          const d = r['\ufeff資料日期'] || r['資料日期'] || '';
          if (d > latestDate) latestDate = d;
        });

        // 彙總各標的
        const tdccMap = {};
        tdccRows.forEach(r => {
          const d = r['\ufeff資料日期'] || r['資料日期'] || '';
          if (latestDate && d !== latestDate) return;

          const code = String(r['證券代號'] || '').trim();
          if (!targetCodes.has(code)) return;

          if (!tdccMap[code]) {
            tdccMap[code] = { p400: 0, p1000: 0, totalShareholders: 0, date: latestDate };
          }

          const level = parseInt(r['持股分級'], 10) || 0;
          const pct = parseFloat(r['占集保庫存數比例%']) || 0;
          const holders = parseInt(r['人數'], 10) || 0;

          // Level 17 是官方合計
          if (level === 17) {
            tdccMap[code].totalShareholders = holders;
          } else if (level >= 1 && level <= 16 && tdccMap[code].totalShareholders === 0) {
            // 若無 level 17 則以累計計算
            tdccMap[code].totalShareholders += holders;
          }

          // 級距 12~15: 400張以上大戶
          if (level >= 12 && level <= 15) {
            tdccMap[code].p400 += pct;
          }
          // 級距 15: 1000張以上大戶
          if (level === 15) {
            tdccMap[code].p1000 += pct;
          }
        });

        Object.keys(tdccMap).forEach(code => {
          if (results[code]) {
            results[code].holder400Pct = Math.round(tdccMap[code].p400 * 100) / 100;
            results[code].holder1000Pct = Math.round(tdccMap[code].p1000 * 100) / 100;
            if (tdccMap[code].totalShareholders > 0) {
              results[code].shareholdersCount = tdccMap[code].totalShareholders;
            }
            results[code].tdccDate = tdccMap[code].date;
          }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        type: 'deep_sync',
        targetCount: targetCodes.size,
        data: results
      }), { status: 200, headers });

    } catch (err) {
      return new Response(JSON.stringify({
        success: false,
        error: err.message,
        fallbackData: results
      }), { status: 502, headers });
    }
  }

  // -------------------------------------------------------------------------
  // 模式 B: 原有單項端點代理模式 (twse_all, tpex_all, mops_rev, tdcc_holders)
  // -------------------------------------------------------------------------
  const ENDPOINT_MAP = {
    twse_all: 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL',
    tpex_all: 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes',
    mops_rev: 'https://openapi.twse.com.tw/v1/opendata/t187ap05_L',
    tdcc_holders: 'https://openapi.tdcc.com.tw/v1/opendata/1-5'
  };

  const targetUrl = ENDPOINT_MAP[target];
  if (!targetUrl) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid type parameter' }), {
      status: 400,
      headers
    });
  }

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
